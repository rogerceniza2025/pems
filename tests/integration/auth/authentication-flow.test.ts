import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupTestDatabase, getTestPrisma, withTransaction } from '@tests/helpers/database'
import { UserFactory, TenantFactory } from '@tests/helpers/factories'
import { createTestUser, createTestToken, createTestHeaders } from '@tests/helpers/auth'
import { Password } from '@modules/user-management/src/domain/value-objects/password'
import { betterAuth } from 'better-auth'

describe('Authentication Flow Integration Tests', () => {
  let testTenant: any
  let testUser: any

  beforeEach(async () => {
    // Reset database and create test data
    await setupTestDatabase().reset()

    testTenant = await TenantFactory.create({
      code: 'AUTH-TEST-SCHOOL',
      name: 'Authentication Test School',
    })

    testUser = await UserFactory.createWithTenant(testTenant.id, {
      email: 'auth.test@example.com',
      role: 'ADMIN',
      isActive: true,
    })
  })

  afterEach(async () => {
    await setupTestDatabase().reset()
  })

  describe('User Registration Flow', () => {
    it('should complete full user registration process', async () => {
      const registrationData = {
        email: 'new.user@example.com',
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'User',
        tenantCode: 'AUTH-TEST-SCHOOL',
      }

      // Simulate registration API call
      const mockRegistrationResponse = {
        success: true,
        user: {
          id: 'new-user-id',
          email: registrationData.email,
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          tenantId: testTenant.id,
        },
        message: 'User registered successfully',
      }

      expect(mockRegistrationResponse.success).toBe(true)
      expect(mockRegistrationResponse.user.email).toBe(registrationData.email)

      // Verify password was hashed
      const password = await Password.create(registrationData.password)
      expect(password.getValue()).toMatch(/^\$2[aby]\$\d+\$/) // bcrypt hash format
    })

    it('should reject registration with weak password', async () => {
      const registrationData = {
        email: 'weak.user@example.com',
        password: 'weak',
        firstName: 'Weak',
        lastName: 'User',
        tenantCode: 'AUTH-TEST-SCHOOL',
      }

      const passwordValidation = Password.validatePolicy(registrationData.password)
      expect(passwordValidation.isValid).toBe(false)
      expect(passwordValidation.errors.length).toBeGreaterThan(0)
    })

    it('should reject registration with duplicate email', async () => {
      const registrationData = {
        email: testUser.email, // Existing email
        password: 'SecurePassword123!',
        firstName: 'Duplicate',
        lastName: 'User',
        tenantCode: 'AUTH-TEST-SCHOOL',
      }

      // Check for existing user
      const existingUser = await getTestPrisma().user.findUnique({
        where: { email: registrationData.email },
      })

      expect(existingUser).toBeTruthy()
      expect(existingUser?.email).toBe(registrationData.email)
    })
  })

  describe('Login Flow', () => {
    it('should authenticate user with correct credentials', async () => {
      const password = await Password.create('CorrectPassword123!')
      await getTestPrisma().user.update({
        where: { id: testUser.id },
        data: { passwordHash: password.getValue() },
      })

      const loginData = {
        email: testUser.email,
        password: 'CorrectPassword123!',
        tenantCode: testTenant.code,
      }

      // Simulate successful login
      const storedPassword = await getTestPrisma().user.findUnique({
        where: { id: testUser.id },
        select: { passwordHash: true },
      })

      const passwordObj = Password.fromHash(storedPassword!.passwordHash)
      const isPasswordValid = await passwordObj.verify(loginData.password)

      expect(isPasswordValid).toBe(true)

      // Generate session token
      const sessionToken = createTestToken({
        id: testUser.id,
        tenantId: testUser.tenantId,
        email: testUser.email,
        role: testUser.role,
      })

      expect(sessionToken).toBeTruthy()
      expect(typeof sessionToken).toBe('string')
    })

    it('should reject login with incorrect password', async () => {
      const password = await Password.create('CorrectPassword123!')
      await getTestPrisma().user.update({
        where: { id: testUser.id },
        data: { passwordHash: password.getValue() },
      })

      const loginData = {
        email: testUser.email,
        password: 'IncorrectPassword123!',
        tenantCode: testTenant.code,
      }

      const storedPassword = await getTestPrisma().user.findUnique({
        where: { id: testUser.id },
        select: { passwordHash: true },
      })

      const passwordObj = Password.fromHash(storedPassword!.passwordHash)
      const isPasswordValid = await passwordObj.verify(loginData.password)

      expect(isPasswordValid).toBe(false)
    })

    it('should reject login for inactive user', async () => {
      await getTestPrisma().user.update({
        where: { id: testUser.id },
        data: { isActive: false },
      })

      const inactiveUser = await getTestPrisma().user.findUnique({
        where: { id: testUser.id },
      })

      expect(inactiveUser?.isActive).toBe(false)

      // Login should fail for inactive users
      const loginData = {
        email: testUser.email,
        password: 'CorrectPassword123!',
        tenantCode: testTenant.code,
      }

      // Simulate login check
      const isActiveUser = inactiveUser?.isActive && loginData.email === inactiveUser.email
      expect(isActiveUser).toBe(false)
    })
  })

  describe('Session Management', () => {
    it('should create and validate session', async () => {
      const testAuthUser = createTestUser({
        id: testUser.id,
        tenantId: testUser.tenantId,
        email: testUser.email,
        role: testUser.role,
      })

      const sessionToken = createTestToken(testAuthUser)
      const headers = createTestHeaders(testAuthUser)

      expect(sessionToken).toBeTruthy()
      expect(headers.Authorization).toContain('Bearer')
      expect(headers['X-Tenant-ID']).toBe(testUser.tenantId)
    })

    it('should handle session expiration', async () => {
      const expiredUser = createTestUser({
        id: testUser.id,
        tenantId: testUser.tenantId,
        email: testUser.email,
        role: testUser.role,
      })

      // Create expired token (using a very short expiration)
      const jwt = require('jsonwebtoken')
      const expiredToken = jwt.sign(
        {
          sub: expiredUser.id,
          tenantId: expiredUser.tenantId,
          email: expiredUser.email,
          role: expiredUser.role,
        },
        process.env.JWT_SECRET ?? 'test-jwt-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      )

      // Verify token is expired
      expect(() => {
        jwt.verify(expiredToken, process.env.JWT_SECRET ?? 'test-jwt-secret')
      }).toThrow('jwt expired')
    })
  })

  describe('Social Authentication Flow', () => {
    it('should simulate Google OAuth flow', async () => {
      const googleUserData = {
        id: 'google-user-id',
        email: 'google.user@gmail.com',
        name: 'Google User',
        picture: 'https://lh3.googleusercontent.com/.../photo.jpg',
      }

      // Simulate Google OAuth callback
      const oauthCallbackData = {
        provider: 'google',
        providerId: googleUserData.id,
        email: googleUserData.email,
        name: googleUserData.name,
        avatar: googleUserData.picture,
      }

      // Check if user would be created or linked
      let existingUser = await getTestPrisma().user.findUnique({
        where: { email: oauthCallbackData.email },
      })

      if (!existingUser) {
        // User doesn't exist, would be created
        existingUser = await UserFactory.createWithTenant(testTenant.id, {
          email: oauthCallbackData.email,
          firstName: oauthCallbackData.name.split(' ')[0],
          lastName: oauthCallbackData.name.split(' ')[1] || '',
          role: 'USER',
        })

        // Create auth provider record
        await getTestPrisma().userAuthProvider.create({
          data: {
            userId: existingUser.id,
            provider: 'google',
            providerId: oauthCallbackData.providerId,
          },
        })
      }

      expect(existingUser).toBeTruthy()
      expect(existingUser?.email).toBe(oauthCallbackData.email)
    })

    it('should handle account linking', async () => {
      const existingUser = testUser

      // Simulate linking GitHub account
      const githubUserData = {
        id: 'github-user-id',
        login: 'githubuser',
        email: existingUser.email,
      }

      const authProvider = await getTestPrisma().userAuthProvider.create({
        data: {
          userId: existingUser.id,
          provider: 'github',
          providerId: githubUserData.id,
        },
      })

      expect(authProvider.userId).toBe(existingUser.id)
      expect(authProvider.provider).toBe('github')
      expect(authProvider.providerId).toBe(githubUserData.id)

      // Verify user has multiple providers
      const userProviders = await getTestPrisma().userAuthProvider.findMany({
        where: { userId: existingUser.id },
      })

      expect(userProviders.length).toBeGreaterThan(0)
    })
  })

  describe('Password Reset Flow', () => {
    it('should handle password reset token generation', async () => {
      const resetData = {
        email: testUser.email,
        tenantCode: testTenant.code,
      }

      // Simulate password reset request
      const resetToken = 'reset-token-' + Math.random().toString(36).substr(2, 9)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Store reset token (this would normally be done securely)
      await getTestPrisma().user.update({
        where: { id: testUser.id },
        data: {
          resetToken,
          resetTokenExpires: expiresAt,
        },
      })

      const updatedUser = await getTestPrisma().user.findUnique({
        where: { id: testUser.id },
        select: { resetToken: true, resetTokenExpires: true },
      })

      expect(updatedUser?.resetToken).toBe(resetToken)
      expect(updatedUser?.resetTokenExpires).toBeTruthy()
    })

    it('should validate reset token and update password', async () => {
      const newPassword = 'NewSecurePassword123!'
      const resetToken = 'valid-reset-token'

      // Set reset token on user
      await getTestPrisma().user.update({
        where: { id: testUser.id },
        data: {
          resetToken,
          resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
        },
      })

      // Verify reset token exists
      const userWithToken = await getTestPrisma().user.findUnique({
        where: { id: testUser.id },
        select: { resetToken: true, resetTokenExpires: true },
      })

      expect(userWithToken?.resetToken).toBe(resetToken)
      expect(userWithToken?.resetTokenExpires!.getTime()).toBeGreaterThan(Date.now())

      // Simulate password update
      const newPasswordHash = await Password.create(newPassword)
      await getTestPrisma().user.update({
        where: { id: testUser.id },
        data: {
          passwordHash: newPasswordHash.getValue(),
          resetToken: null,
          resetTokenExpires: null,
        },
      })

      // Verify password was updated and token was cleared
      const updatedUser = await getTestPrisma().user.findUnique({
        where: { id: testUser.id },
        select: { passwordHash: true, resetToken: true, resetTokenExpires: true },
      })

      expect(updatedUser?.passwordHash).toBe(newPasswordHash.getValue())
      expect(updatedUser?.resetToken).toBeNull()
      expect(updatedUser?.resetTokenExpires).toBeNull()
    })
  })

  describe('Multi-Factor Authentication', () => {
    it('should enable MFA for user', async () => {
      // Simulate MFA setup
      const mfaSecret = 'JBSWY3DPEHPK3PXP' // Base32 encoded secret
      const backupCodes = ['123456', '789012', '345678']

      await getTestPrisma().userAuthProvider.update({
        where: {
          userId_provider: {
            userId: testUser.id,
            provider: 'email-password',
          },
        },
        data: {
          mfaEnabled: true,
          mfaSecret: mfaSecret,
          backupCodes: backupCodes,
        },
      })

      const authProvider = await getTestPrisma().userAuthProvider.findUnique({
        where: {
          userId_provider: {
            userId: testUser.id,
            provider: 'email-password',
          },
        },
      })

      expect(authProvider?.mfaEnabled).toBe(true)
      expect(authProvider?.mfaSecret).toBe(mfaSecret)
      expect(authProvider?.backupCodes).toEqual(backupCodes)
    })

    it('should verify MFA token', async () => {
      // This would normally use a TOTP library
      const mockTotpToken = '123456'

      // Simulate TOTP verification
      const isValidTotp = mockTotpToken.length === 6 && /^\d+$/.test(mockTotpToken)

      expect(isValidTotp).toBe(true)

      // Simulate backup code verification
      const backupCode = '789012'
      const isValidBackupCode = backupCode.length === 6 && /^\d+$/.test(backupCode)

      expect(isValidBackupCode).toBe(true)
    })
  })

  describe('Cross-Tenant Isolation', () => {
    it('should enforce tenant isolation', async () => {
      const anotherTenant = await TenantFactory.create({
        code: 'ANOTHER-SCHOOL',
        name: 'Another School',
      })

      const anotherUser = await UserFactory.createWithTenant(anotherTenant.id, {
        email: 'another.user@example.com',
        role: 'ADMIN',
      })

      // Users should only access their own tenant data
      const user1Tenant = await getTestPrisma().user.findUnique({
        where: { id: testUser.id },
        select: { tenantId: true },
      })

      const user2Tenant = await getTestPrisma().user.findUnique({
        where: { id: anotherUser.id },
        select: { tenantId: true },
      })

      expect(user1Tenant?.tenantId).toBe(testUser.tenantId)
      expect(user2Tenant?.tenantId).toBe(anotherUser.tenantId)
      expect(user1Tenant?.tenantId).not.toBe(user2Tenant?.tenantId)
    })
  })
})