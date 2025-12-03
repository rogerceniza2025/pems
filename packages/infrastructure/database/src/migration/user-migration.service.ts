/**
 * User Migration Service
 *
 * Service to migrate existing users from the old User table to BetterAuth format
 * This service handles the complete migration process with validation and rollback capabilities
 */

import { prisma } from '@pems/database'
import { hash } from 'bcryptjs'
import { randomBytes } from 'crypto'

export interface MigrationResult {
  success: boolean
  migratedUsers: number
  errors: string[]
  warnings: string[]
}

export interface UserMigrationData {
  id: string
  tenantId: string
  email: string
  phone?: string | null
  isActive: boolean
  isSystemAdmin: boolean
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  profile?: {
    fullName?: string | null
    preferredName?: string | null
    avatarUrl?: string | null
  }
  authProviders: {
    provider: string
    providerId?: string | null
    passwordHash?: string | null
    mfaEnabled: boolean
  }[]
}

export class UserMigrationService {
  private readonly SALT_ROUNDS = 12

  /**
   * Validate that the migration can be performed safely
   */
  async validateMigration(): Promise<{ canProceed: boolean; issues: string[] }> {
    const issues: string[] = []

    try {
      // Check if BetterAuth tables exist
      const betterAuthUsersTable = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables
        WHERE tablename = 'better_auth_users'
      `

      if (betterAuthUsersTable.length === 0) {
        issues.push('BetterAuth tables do not exist. Run the schema migration first.')
      }

      // Check if there are any existing users in BetterAuth tables
      if (betterAuthUsersTable.length > 0) {
        const existingBetterAuthUsers = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM better_auth_users
        `

        if (existingBetterAuthUsers[0] && Number(existingBetterAuthUsers[0].count) > 0) {
          issues.push('BetterAuth users table already contains data. Migration may cause data duplication.')
        }
      }

      // Check database connection
      await prisma.$queryRaw`SELECT 1`

    } catch (error) {
      issues.push(`Database validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      canProceed: issues.length === 0,
      issues
    }
  }

  /**
   * Get all existing users that need to be migrated
   */
  async getExistingUsers(): Promise<UserMigrationData[]> {
    const users = await prisma.$queryRaw<Array<any>>`
      SELECT
        u.*,
        p.full_name,
        p.preferred_name,
        p.avatar_url
      FROM "User" u
      LEFT JOIN "UserProfile" p ON u.id = p.user_id
      ORDER BY u.created_at ASC
    `

    // Get auth providers for each user
    const usersWithAuth = await Promise.all(
      users.map(async (user) => {
        const authProviders = await prisma.$queryRaw<Array<any>>`
          SELECT * FROM "UserAuthProvider"
          WHERE user_id = ${user.id}
        `

        return {
          id: user.id,
          tenantId: user.tenant_id,
          email: user.email,
          phone: user.phone,
          isActive: user.is_active,
          isSystemAdmin: user.is_system_admin,
          metadata: user.metadata,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          profile: user.full_name || user.preferred_name || user.avatar_url ? {
            fullName: user.full_name,
            preferredName: user.preferred_name,
            avatarUrl: user.avatar_url
          } : undefined,
          authProviders: authProviders.map((auth: any) => ({
            provider: auth.provider,
            providerId: auth.provider_id,
            passwordHash: auth.password_hash,
            mfaEnabled: auth.mfa_enabled
          }))
        }
      })
    )

    return usersWithAuth
  }

  /**
   * Migrate a single user to BetterAuth format
   */
  async migrateUser(userData: UserMigrationData): Promise<{ success: boolean; error?: string }> {
    try {
      // Start transaction
      await prisma.$transaction(async (tx) => {
        // Step 1: Create BetterAuth user
        await tx.$executeRaw`
          INSERT INTO "better_auth_users" (
            id, tenant_id, email, emailVerified, name, phone,
            is_active, is_system_admin, metadata, createdAt, updatedAt
          ) VALUES (
            ${userData.id},
            ${userData.tenantId},
            ${userData.email},
            ${userData.createdAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) ? userData.createdAt : null},
            ${userData.profile?.fullName || userData.profile?.preferredName || null},
            ${userData.phone || null},
            ${userData.isActive},
            ${userData.isSystemAdmin},
            ${JSON.stringify(userData.metadata)},
            ${userData.createdAt},
            ${userData.updatedAt}
          )
        `

        // Step 2: Create BetterAuth accounts for each auth provider
        for (const authProvider of userData.authProviders) {
          if (authProvider.provider === 'email' && authProvider.passwordHash) {
            // Email/password account
            await tx.$executeRaw`
              INSERT INTO "better_auth_accounts" (
                id, userId, type, provider, providerAccountId
              ) VALUES (
                gen_random_uuid(),
                ${userData.id},
                'email',
                'credential',
                ${userData.email}
              )
            `
          } else if (authProvider.providerId) {
            // OAuth account (Google, GitHub, etc.)
            await tx.$executeRaw`
              INSERT INTO "better_auth_accounts" (
                id, userId, type, provider, providerAccountId
              ) VALUES (
                gen_random_uuid(),
                ${userData.id},
                'oauth',
                ${authProvider.provider},
                ${authProvider.providerId}
              )
            `
          }
        }

        // Step 3: Create MFA setup if enabled
        const emailAuthProvider = userData.authProviders.find(p => p.provider === 'email')
        if (emailAuthProvider?.mfaEnabled) {
          const tempSecret = this.generateTempMFASecret(userData.id, userData.email)
          const tempBackupCodes = this.generateTempBackupCodes()

          await tx.$executeRaw`
            INSERT INTO "better_auth_two_factor" (
              id, userId, secret, backupCodes, enabled, createdAt
            ) VALUES (
              gen_random_uuid(),
              ${userData.id},
              ${tempSecret},
              ${tempBackupCodes},
              true,
              ${userData.createdAt}
            )
          `
        }

        // Step 4: Create email verification token if needed
        if (userData.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
          const verificationToken = this.generateVerificationToken(userData.id, userData.email)
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

          await tx.$executeRaw`
            INSERT INTO "better_auth_verification_tokens" (
              identifier, token, expires
            ) VALUES (
              ${userData.email},
              ${verificationToken},
              ${expiresAt}
            )
          `
        }
      })

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown migration error'
      }
    }
  }

  /**
   * Migrate all users to BetterAuth format
   */
  async migrateAllUsers(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedUsers: 0,
      errors: [],
      warnings: []
    }

    try {
      // Validate migration first
      const validation = await this.validateMigration()
      if (!validation.canProceed) {
        result.success = false
        result.errors.push(...validation.issues)
        return result
      }

      // Get existing users
      const existingUsers = await this.getExistingUsers()

      if (existingUsers.length === 0) {
        result.warnings.push('No users found to migrate')
        return result
      }

      console.log(`Starting migration of ${existingUsers.length} users...`)

      // Migrate users in batches to avoid memory issues
      const batchSize = 50
      for (let i = 0; i < existingUsers.length; i += batchSize) {
        const batch = existingUsers.slice(i, i + batchSize)

        for (const user of batch) {
          const migrationResult = await this.migrateUser(user)

          if (migrationResult.success) {
            result.migratedUsers++
          } else {
            result.errors.push(`Failed to migrate user ${user.email}: ${migrationResult.error}`)
            result.success = false
          }
        }

        // Add small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`Migration completed. Successfully migrated ${result.migratedUsers} users.`)

    } catch (error) {
      result.success = false
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Verify migration integrity
   */
  async verifyMigration(): Promise<{ success: boolean; issues: string[] }> {
    const issues: string[] = []

    try {
      // Compare user counts
      const [oldUserCount, newUserCount] = await Promise.all([
        prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "User"`,
        prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM better_auth_users`
      ])

      const oldCount = Number(oldUserCount[0]?.count ?? 0)
      const newCount = Number(newUserCount[0]?.count ?? 0)

      if (oldCount !== newCount) {
        issues.push(`User count mismatch: ${oldCount} old users vs ${newCount} new users`)
      }

      // Check for duplicate emails
      const duplicateEmails = await prisma.$queryRaw<Array<{ email: string, count: bigint }>>`
        SELECT email, COUNT(*) as count
        FROM better_auth_users
        GROUP BY email
        HAVING COUNT(*) > 1
      `

      if (duplicateEmails.length > 0) {
        issues.push(`Found ${duplicateEmails.length} duplicate email addresses in BetterAuth users`)
      }

      // Verify all BetterAuth users have accounts
      const usersWithoutAccounts = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM better_auth_users u
        LEFT JOIN better_auth_accounts a ON u.id = a.userId
        WHERE a.id IS NULL
      `

      if (usersWithoutAccounts[0] && Number(usersWithoutAccounts[0].count) > 0) {
        issues.push(`${Number(usersWithoutAccounts[0].count)} users without authentication accounts`)
      }

    } catch (error) {
      issues.push(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      success: issues.length === 0,
      issues
    }
  }

  /**
   * Generate temporary MFA secret for migrated users
   */
  private generateTempMFASecret(userId: string, email: string): string {
    return `TEMP_MFA_${Buffer.from(`${userId}:${email}`).toString('base64').substring(0, 16)}`
  }

  /**
   * Generate temporary backup codes
   */
  private generateTempBackupCodes(): string[] {
    return [
      'BACKUP-001',
      'BACKUP-002',
      'BACKUP-003',
      'BACKUP-004',
      'BACKUP-005'
    ]
  }

  /**
   * Generate email verification token
   */
  private generateVerificationToken(userId: string, email: string): string {
    return `VERIFY_${randomBytes(16).toString('hex')}`
  }
}

export const userMigrationService = new UserMigrationService()