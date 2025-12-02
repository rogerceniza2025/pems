/**
 * Multi-Factor Authentication (MFA) Service
 *
 * Provides TOTP (Time-based One-Time Password) functionality
 * for BetterAuth integration with tenant awareness
 */

import { authenticator } from '../../types/otplib'
import { toDataURL } from '../../types/qrcode'
import crypto from 'crypto'
import { prisma } from '@pems/database'

export interface MFASetupResult {
  success: boolean
  secret?: string
  qrCode?: string
  backupCodes?: string[]
  error?: string
}

export interface MFAVerifyResult {
  success: boolean
  error?: string
  user?: any
}

interface MFARecord {
  secret: string
  enabled: boolean
  backup_codes?: string[]
}

interface MFASimpleRecord {
  enabled: boolean
}

export class MFAService {
  private readonly issuer: string
  private readonly digits: number
  private readonly period: number
  private readonly window: number

  constructor() {
    this.issuer = process.env.TOTP_ISSUER || 'PEMS'
    this.digits = Number(process.env.TOTP_DIGITS) || 6
    this.period = Number(process.env.TOTP_PERIOD) || 30
    this.window = 1 // Allow 1 period before and after for clock drift
  }

  /**
   * Generate a new TOTP secret for a user
   */
  private generateSecret(): string {
    return authenticator.generateSecret()
  }

  /**
   * Generate backup codes for MFA
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(3).toString('hex').toUpperCase()
      codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`)
    }
    return codes
  }

  /**
   * Generate QR code URL for TOTP setup
   */
  private async generateQRCode(secret: string, userEmail: string): Promise<string> {
    const otpUrl = authenticator.keyuri(userEmail, this.issuer, secret)

    try {
      const qrDataUrl = await toDataURL(otpUrl)
      return qrDataUrl
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Setup MFA for a user
   */
  async setupMFA(userId: string, userEmail: string): Promise<MFASetupResult> {
    try {
      // Check if user already has MFA enabled
      const existingMFA = await prisma.$queryRaw<MFASimpleRecord[]>`
        SELECT enabled FROM better_auth_two_factor
        WHERE user_id = ${userId}
      `

      if (existingMFA.length > 0 && existingMFA[0]?.enabled) {
        return {
          success: false,
          error: 'MFA is already enabled for this user'
        }
      }

      // Generate new secret and backup codes
      const secret = this.generateSecret()
      const backupCodes = this.generateBackupCodes()

      // Generate QR code
      const qrCode = await this.generateQRCode(secret, userEmail)

      // Store MFA setup temporarily (not enabled yet)
      if (existingMFA.length > 0) {
        await prisma.$executeRaw`
          UPDATE better_auth_two_factor
          SET secret = ${secret}, backup_codes = ${backupCodes}, enabled = false
          WHERE user_id = ${userId}
        `
      } else {
        await prisma.$executeRaw`
          INSERT INTO better_auth_two_factor (id, user_id, secret, backup_codes, enabled, createdAt)
          VALUES (gen_random_uuid(), ${userId}, ${secret}, ${backupCodes}, false, NOW())
        `
      }

      return {
        success: true,
        secret,
        qrCode,
        backupCodes
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown MFA setup error'
      }
    }
  }

  /**
   * Verify MFA setup by validating the user's TOTP code
   */
  async verifyMFASetup(userId: string, code: string): Promise<MFAVerifyResult> {
    try {
      // Get user's MFA secret
      const mfaRecord = await prisma.$queryRaw<MFARecord[]>`
        SELECT secret, enabled FROM better_auth_two_factor
        WHERE user_id = ${userId}
      `

      if (mfaRecord.length === 0) {
        return {
          success: false,
          error: 'MFA setup not found for this user'
        }
      }

      const { secret } = mfaRecord[0]!

      // Verify the TOTP code
      const isValid = authenticator.verify({
        token: code,
        secret,
        window: this.window,
        encoding: 'base32'
      })

      if (!isValid) {
        return {
          success: false,
          error: 'Invalid verification code'
        }
      }

      // Enable MFA for the user
      await prisma.$executeRaw`
        UPDATE better_auth_two_factor
        SET enabled = true
        WHERE user_id = ${userId}
      `

      // Get user information
      const user = await prisma.$queryRaw<Array<any>>`
        SELECT id, email, tenant_id FROM better_auth_users
        WHERE id = ${userId}
      `

      return {
        success: true,
        user: user[0]
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown MFA verification error'
      }
    }
  }

  /**
   * Verify TOTP code for authentication
   */
  async verifyMFACode(userId: string, code: string): Promise<MFAVerifyResult> {
    try {
      // Get user's MFA settings
      const mfaRecord = await prisma.$queryRaw<MFARecord[]>`
        SELECT secret, enabled, backup_codes FROM better_auth_two_factor
        WHERE user_id = ${userId}
      `

      if (mfaRecord.length === 0 || !mfaRecord[0]?.enabled) {
        return {
          success: false,
          error: 'MFA is not enabled for this user'
        }
      }

      const { secret, backup_codes: backupCodes = [] } = mfaRecord[0]!

      // Check if it's a backup code
      const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
      const isBackupCode = backupCodes.some((backup: string) =>
        backup.replace(/[^A-Z0-9]/g, '') === normalizedCode
      )

      if (isBackupCode) {
        // Remove used backup code
        const updatedBackupCodes = backupCodes.filter((backup: string) =>
          backup.replace(/[^A-Z0-9]/g, '') !== normalizedCode
        )

        await prisma.$executeRaw`
          UPDATE better_auth_two_factor
          SET backup_codes = ${updatedBackupCodes}
          WHERE user_id = ${userId}
        `

        // Get user information
        const user = await prisma.$queryRaw<Array<any>>`
          SELECT id, email, tenant_id FROM better_auth_users
          WHERE id = ${userId}
        `

        return {
          success: true,
          user: user[0]
        }
      }

      // Verify TOTP code
      const isValid = authenticator.verify({
        token: code,
        secret,
        window: this.window,
        encoding: 'base32'
      })

      if (!isValid) {
        return {
          success: false,
          error: 'Invalid verification code'
        }
      }

      // Get user information
      const user = await prisma.$queryRaw<Array<any>>`
        SELECT id, email, tenant_id FROM better_auth_users
        WHERE id = ${userId}
      `

      return {
        success: true,
        user: user[0]
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown MFA verification error'
      }
    }
  }

  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string, password?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // If password is provided, verify it (optional security measure)
      if (password) {
        // This would integrate with BetterAuth's password verification
        // For now, we'll skip this since BetterAuth handles authentication
      }

      // Disable MFA
      await prisma.$executeRaw`
        UPDATE better_auth_two_factor
        SET enabled = false
        WHERE user_id = ${userId}
      `

      return { success: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown MFA disable error'
      }
    }
  }

  /**
   * Generate new backup codes for a user
   */
  async regenerateBackupCodes(userId: string): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
    try {
      // Verify MFA is enabled
      const mfaRecord = await prisma.$queryRaw<MFASimpleRecord[]>`
        SELECT enabled FROM better_auth_two_factor
        WHERE user_id = ${userId}
      `

      if (mfaRecord.length === 0 || !mfaRecord[0]?.enabled) {
        return {
          success: false,
          error: 'MFA is not enabled for this user'
        }
      }

      // Generate new backup codes
      const newBackupCodes = this.generateBackupCodes()

      // Update backup codes
      await prisma.$executeRaw`
        UPDATE better_auth_two_factor
        SET backup_codes = ${newBackupCodes}
        WHERE user_id = ${userId}
      `

      return {
        success: true,
        backupCodes: newBackupCodes
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown backup code regeneration error'
      }
    }
  }

  /**
   * Check if MFA is enabled for a user
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    try {
      const result = await prisma.$queryRaw<MFASimpleRecord[]>`
        SELECT enabled FROM better_auth_two_factor
        WHERE user_id = ${userId}
      `

      return result.length > 0 && (result[0]?.enabled === true)

    } catch {
      return false
    }
  }

  /**
   * Get MFA status for a user
   */
  async getMFAStatus(userId: string): Promise<{ enabled: boolean; hasBackupCodes: boolean } | null> {
    try {
      const result = await prisma.$queryRaw<MFARecord[]>`
        SELECT enabled, backup_codes FROM better_auth_two_factor
        WHERE user_id = ${userId}
      `

      if (result.length === 0) {
        return null
      }

      const { enabled, backup_codes: backupCodes = [] } = result[0]!

      return {
        enabled,
        hasBackupCodes: backupCodes.length > 0
      }

    } catch {
      return null
    }
  }
}

export const mfaService = new MFAService()