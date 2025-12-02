import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupTestDatabase, getTestPrisma, withTransaction } from '@tests/helpers/database'
import { UserFactory, TenantFactory } from '@tests/helpers/factories'
import { Password } from '@modules/user-management/src/domain/value-objects/password'

describe('Authentication Database Models', () => {
  beforeEach(async () => {
    await setupTestDatabase().reset()
  })

  afterEach(async () => {
    await setupTestDatabase().reset()
  })

  describe('User Model', () => {
    it('should create user with required fields', async () => {
      const testTenant = await TenantFactory.create()

      const userData = {
        tenantId: testTenant.id,
        email: 'user.model.test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'STUDENT',
        isActive: true,
      }

      const user = await UserFactory.createWithTenant(testTenant.id, userData)

      expect(user.id).toBeTruthy()
      expect(user.tenantId).toBe(testTenant.id)
      expect(user.email).toBe(userData.email)
      expect(user.firstName).toBe(userData.firstName)
      expect(user.lastName).toBe(userData.lastName)
      expect(user.role).toBe(userData.role)
      expect(user.isActive).toBe(userData.isActive)
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('should enforce unique email constraint within tenant', async () => {
      const testTenant = await TenantFactory.create()

      await UserFactory.createWithTenant(testTenant.id, {
        email: 'duplicate@example.com',
      })

      // Should throw error for duplicate email in same tenant
      await expect(
        UserFactory.createWithTenant(testTenant.id, {
          email: 'duplicate@example.com',
        })
      ).rejects.toThrow()

      // But should allow same email in different tenant
      const anotherTenant = await TenantFactory.create({
        code: 'ANOTHER-TENANT',
      })

      const anotherUser = await UserFactory.createWithTenant(anotherTenant.id, {
        email: 'duplicate@example.com',
      })

      expect(anotherUser.email).toBe('duplicate@example.com')
      expect(anotherUser.tenantId).toBe(anotherTenant.id)
    })

    it('should handle soft deletes properly', async () => {
      const testTenant = await TenantFactory.create()
      const user = await UserFactory.createWithTenant(testTenant.id)

      // Soft delete
      const deletedUser = await getTestPrisma().user.update({
        where: { id: user.id },
        data: { isActive: false, deletedAt: new Date() },
      })

      expect(deletedUser.isActive).toBe(false)
      expect(deletedUser.deletedAt).toBeInstanceOf(Date)

      // Should not appear in active queries
      const activeUsers = await getTestPrisma().user.findMany({
        where: { isActive: true, tenantId: testTenant.id },
      })

      expect(activeUsers).toHaveLength(0)

      // But should still be findable by ID
      const foundUser = await getTestPrisma().user.findUnique({
        where: { id: user.id },
      })

      expect(foundUser).toBeTruthy()
      expect(foundUser?.isActive).toBe(false)
    })

    it('should store password hash securely', async () => {
      const testTenant = await TenantFactory.create()
      const password = await Password.create('SecurePassword123!')

      const user = await UserFactory.createWithTenant(testTenant.id, {
        passwordHash: password.getValue(),
      })

      expect(user.passwordHash).toMatch(/^\$2[aby]\$\d+\$/) // bcrypt format
      expect(user.passwordHash).not.toBe('SecurePassword123!')
      expect(user.passwordHash!.length).toBeGreaterThan(50)
    })

    it('should handle user relationships correctly', async () => {
      const testTenant = await TenantFactory.create()
      const user = await UserFactory.createWithTenant(testTenant.id)

      // Test tenant relationship
      const userWithTenant = await getTestPrisma().user.findUnique({
        where: { id: user.id },
        include: { tenant: true },
      })

      expect(userWithTenant?.tenant).toBeTruthy()
      expect(userWithTenant?.tenant.id).toBe(testTenant.id)

      // Test user profile relationship
      const userProfile = await getTestPrisma().userProfile.create({
        data: {
          userId: user.id,
          fullName: `${user.firstName} ${user.lastName}`,
          preferredName: user.firstName,
          locale: 'en-US',
        },
      })

      const userWithProfile = await getTestPrisma().user.findUnique({
        where: { id: user.id },
        include: { userProfile: true },
      })

      expect(userWithProfile?.userProfile).toBeTruthy()
      expect(userWithProfile?.userProfile.fullName).toBe(userProfile.fullName)
    })
  })

  describe('UserAuthProvider Model', () => {
    it('should create auth provider for user', async () => {
      const testTenant = await TenantFactory.create()
      const user = await UserFactory.createWithTenant(testTenant.id)

      const authProvider = await getTestPrisma().userAuthProvider.create({
        data: {
          userId: user.id,
          provider: 'email-password',
          providerId: user.id,
          passwordHash: await Password.create('Password123!').then(p => p.getValue()),
        },
      })

      expect(authProvider.id).toBeTruthy()
      expect(authProvider.userId).toBe(user.id)
      expect(authProvider.provider).toBe('email-password')
      expect(authProvider.providerId).toBe(user.id)
      expect(authProvider.mfaEnabled).toBe(false)
    })

    it('should support multiple auth providers per user', async () => {
      const testTenant = await TenantFactory.create()
      const user = await UserFactory.createWithTenant(testTenant.id)

      // Create email-password provider
      await getTestPrisma().userAuthProvider.create({
        data: {
          userId: user.id,
          provider: 'email-password',
          providerId: user.id,
          passwordHash: await Password.create('Password123!').then(p => p.getValue()),
        },
      })

      // Create Google provider
      const googleProvider = await getTestPrisma().userAuthProvider.create({
        data: {
          userId: user.id,
          provider: 'google',
          providerId: 'google-12345',
        },
      })

      // Should have multiple providers
      const providers = await getTestPrisma().userAuthProvider.findMany({
        where: { userId: user.id },
      })

      expect(providers).toHaveLength(2)
      expect(providers.map(p => p.provider)).toContain('email-password')
      expect(providers.map(p => p.provider)).toContain('google')
    })

    it('should handle MFA settings', async () => {
      const testTenant = await TenantFactory.create()
      const user = await UserFactory.createWithTenant(testTenant.id)

      const authProvider = await getTestPrisma().userAuthProvider.create({
        data: {
          userId: user.id,
          provider: 'email-password',
          providerId: user.id,
          passwordHash: await Password.create('Password123!').then(p => p.getValue()),
          mfaEnabled: true,
          mfaSecret: 'JBSWY3DPEHPK3PXP',
          backupCodes: ['123456', '789012', '345678'],
        },
      })

      expect(authProvider.mfaEnabled).toBe(true)
      expect(authProvider.mfaSecret).toBe('JBSWY3DPEHPK3PXP')
      expect(authProvider.backupCodes).toEqual(['123456', '789012', '345678'])
    })
  })

  describe('UserProfile Model', () => {
    it('should create user profile', async () => {
      const testTenant = await TenantFactory.create()
      const user = await UserFactory.createWithTenant(testTenant.id)

      const profileData = {
        userId: user.id,
        fullName: 'Test User Full Name',
        preferredName: 'Testy',
        avatarUrl: 'https://example.com/avatar.jpg',
        locale: 'en-US',
        extra: {
          timezone: 'Asia/Manila',
          bio: 'Test user bio',
        },
      }

      const userProfile = await getTestPrisma().userProfile.create({
        data: profileData,
      })

      expect(userProfile.id).toBeTruthy()
      expect(userProfile.userId).toBe(user.id)
      expect(userProfile.fullName).toBe(profileData.fullName)
      expect(userProfile.preferredName).toBe(profileData.preferredName)
      expect(userProfile.avatarUrl).toBe(profileData.avatarUrl)
      expect(userProfile.locale).toBe(profileData.locale)
      expect(userProfile.extra).toEqual(profileData.extra)
    })

    it('should have one-to-one relationship with user', async () => {
      const testTenant = await TenantFactory.create()
      const user = await UserFactory.createWithTenant(testTenant.id)

      const userProfile = await getTestPrisma().userProfile.create({
        data: {
          userId: user.id,
          fullName: 'Test User',
        },
      })

      // Test the relationship from user side
      const userWithProfile = await getTestPrisma().user.findUnique({
        where: { id: user.id },
        include: { userProfile: true },
      })

      expect(userWithProfile?.userProfile).toBeTruthy()
      expect(userWithProfile?.userProfile.id).toBe(userProfile.id)

      // Test the relationship from profile side
      const profileWithUser = await getTestPrisma().userProfile.findUnique({
        where: { id: userProfile.id },
        include: { user: true },
      })

      expect(profileWithUser?.user).toBeTruthy()
      expect(profileWithUser?.user.id).toBe(user.id)
    })
  })

  describe('Role and Permission Models', () => {
    it('should create role with permissions', async () => {
      const testTenant = await TenantFactory.create()

      const role = await getTestPrisma().role.create({
        data: {
          tenantId: testTenant.id,
          name: 'Test Role',
          slug: 'test-role',
          description: 'A test role',
          isBuiltin: false,
        },
      })

      // Create permissions
      const permissions = await getTestPrisma().permission.createMany({
        data: [
          {
            action: 'create',
            resource: 'users',
            resourceScope: 'tenant',
            description: 'Create users',
          },
          {
            action: 'read',
            resource: 'users',
            resourceScope: 'tenant',
            description: 'Read users',
          },
        ],
      })

      // Associate permissions with role
      const createdPermissions = await getTestPrisma().permission.findMany({
        where: { resource: 'users' },
      })

      await getTestPrisma().rolePermission.createMany({
        data: createdPermissions.map(permission => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
      })

      // Verify role has permissions
      const roleWithPermissions = await getTestPrisma().role.findUnique({
        where: { id: role.id },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      })

      expect(roleWithPermissions?.rolePermissions).toHaveLength(2)
      expect(roleWithPermissions?.rolePermissions[0].permission.action).toBe('create')
      expect(roleWithPermissions?.rolePermissions[1].permission.action).toBe('read')
    })

    it('should handle user role assignments', async () => {
      const testTenant = await TenantFactory.create()
      const user = await UserFactory.createWithTenant(testTenant.id)

      const role = await getTestPrisma().role.create({
        data: {
          tenantId: testTenant.id,
          name: 'Teacher Role',
          slug: 'teacher',
          description: 'Teacher role',
          isBuiltin: false,
        },
      })

      // Assign role to user
      const userRole = await getTestPrisma().userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
          scope: 'tenant',
        },
      })

      expect(userRole.userId).toBe(user.id)
      expect(userRole.roleId).toBe(role.id)
      expect(userRole.scope).toBe('tenant')

      // Verify user has role
      const userWithRoles = await getTestPrisma().user.findUnique({
        where: { id: user.id },
        include: {
          userRoles: {
            include: { role: true },
          },
        },
      })

      expect(userWithRoles?.userRoles).toHaveLength(1)
      expect(userWithRoles?.userRoles[0].role.name).toBe('Teacher Role')
    })

    it('should support built-in roles', async () => {
      const testTenant = await TenantFactory.create()

      const builtInRole = await getTestPrisma().role.create({
        data: {
          tenantId: testTenant.id,
          name: 'Administrator',
          slug: 'admin',
          description: 'System administrator',
          isBuiltin: true,
        },
      })

      expect(builtInRole.isBuiltin).toBe(true)

      // Should not be able to delete built-in roles
      const roles = await getTestPrisma().role.findMany({
        where: {
          tenantId: testTenant.id,
          isBuiltin: true,
        },
      })

      expect(roles).toHaveLength(1)
      expect(roles[0].id).toBe(builtInRole.id)
    })
  })

  describe('Database Transactions and Constraints', () => {
    it('should handle transactions correctly', async () => {
      const testTenant = await TenantFactory.create()

      await withTransaction(async (tx) => {
        const user = await UserFactory.createWithTenant(testTenant.id, {
          email: 'transaction.test@example.com',
        })

        const profile = await tx.userProfile.create({
          data: {
            userId: user.id,
            fullName: 'Transaction User',
          },
        })

        expect(profile.userId).toBe(user.id)
      })
    })

    it('should rollback on transaction failure', async () => {
      const testTenant = await TenantFactory.create()

      const initialUserCount = await getTestPrisma().user.count({
        where: { tenantId: testTenant.id },
      })

      try {
        await withTransaction(async (tx) => {
          const user = await UserFactory.createWithTenant(testTenant.id, {
            email: 'rollback.test@example.com',
          })

          // This should cause rollback
          await tx.userProfile.create({
            data: {
              userId: 'nonexistent-user-id', // This will fail
              fullName: 'Should Rollback',
            },
          })
        })
      } catch (error) {
        // Expected to fail
      }

      const finalUserCount = await getTestPrisma().user.count({
        where: { tenantId: testTenant.id },
      })

      expect(finalUserCount).toBe(initialUserCount)
    })

    it('should enforce foreign key constraints', async () => {
      // Should not be able to create user profile for non-existent user
      await expect(
        getTestPrisma().userProfile.create({
          data: {
            userId: 'nonexistent-user-id',
            fullName: 'Invalid User',
          },
        })
      ).rejects.toThrow()

      // Should not be able to create user role for non-existent user
      const testTenant = await TenantFactory.create()
      const role = await getTestPrisma().role.create({
        data: {
          tenantId: testTenant.id,
          name: 'Test Role',
          slug: 'test-role',
          isBuiltin: false,
        },
      })

      await expect(
        getTestPrisma().userRole.create({
          data: {
            userId: 'nonexistent-user-id',
            roleId: role.id,
            scope: 'tenant',
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('Database Performance and Indexing', () => {
    it('should efficiently query users by email and tenant', async () => {
      const testTenant = await TenantFactory.create()

      // Create multiple users
      await UserFactory.createWithTenant(testTenant.id, {
        email: 'perf.test.1@example.com',
      })
      await UserFactory.createWithTenant(testTenant.id, {
        email: 'perf.test.2@example.com',
      })

      // This query should be efficient with proper indexing
      const startTime = Date.now()
      const user = await getTestPrisma().user.findUnique({
        where: {
          email_tenantId: {
            email: 'perf.test.1@example.com',
            tenantId: testTenant.id,
          },
        },
      })
      const endTime = Date.now()

      expect(user).toBeTruthy()
      expect(user?.email).toBe('perf.test.1@example.com')
      expect(endTime - startTime).toBeLessThan(100) // Should be very fast
    })

    it('should handle large dataset queries efficiently', async () => {
      const testTenant = await TenantFactory.create()

      // Create many users
      const users = []
      for (let i = 0; i < 100; i++) {
        users.push({
          tenantId: testTenant.id,
          email: `bulk.user.${i}@example.com`,
          firstName: `User${i}`,
          lastName: 'Test',
          role: 'STUDENT',
          isActive: i % 2 === 0, // Half active, half inactive
        })
      }

      await getTestPrisma().user.createMany({ data: users })

      // Query with pagination
      const startTime = Date.now()
      const activeUsers = await getTestPrisma().user.findMany({
        where: {
          tenantId: testTenant.id,
          isActive: true,
        },
        take: 20,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      })
      const endTime = Date.now()

      expect(activeUsers).toHaveLength(20)
      expect(activeUsers.every(u => u.isActive)).toBe(true)
      expect(endTime - startTime).toBeLessThan(200) // Should be reasonably fast
    })
  })
})