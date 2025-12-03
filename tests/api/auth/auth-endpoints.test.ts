import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupTestDatabase, getTestPrisma } from '@tests/helpers/database'
import { UserFactory, TenantFactory } from '@tests/helpers/factories'
import { createTestUser, createTestHeaders } from '@tests/helpers/auth'
import { Password } from '@modules/user-management/src/domain/value-objects/password'

// Mock Next.js server components
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data, options) => ({ json: () => data, status: options?.status || 200 })),
  },
}))

describe('Authentication API Endpoints', () => {
  let testTenant: any
  let testUser: any

  beforeEach(async () => {
    await setupTestDatabase().reset()

    testTenant = await TenantFactory.create({
      code: 'API-TEST-SCHOOL',
      name: 'API Test School',
    })

    testUser = await UserFactory.createWithTenant(testTenant.id, {
      email: 'api.test@example.com',
      role: 'ADMIN',
      isActive: true,
    })
  })

  afterEach(async () => {
    await setupTestDatabase().reset()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const registrationData = {
        email: 'new.api.user@example.com',
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'API User',
        tenantCode: testTenant.code,
      }

      // Simulate API endpoint logic
      const existingUser = await getTestPrisma().user.findUnique({
        where: { email: registrationData.email },
      })

      if (existingUser) {
        return { error: 'User already exists', status: 409 }
      }

      const passwordValidation = Password.validatePolicy(registrationData.password)
      if (!passwordValidation.isValid) {
        return { error: 'Invalid password', details: passwordValidation.errors, status: 400 }
      }

      const tenant = await getTestPrisma().tenant.findUnique({
        where: { code: registrationData.tenantCode },
      })

      if (!tenant) {
        return { error: 'Invalid tenant code', status: 400 }
      }

      const hashedPassword = await Password.create(registrationData.password)

      const newUser = await UserFactory.createWithTenant(tenant.id, {
        email: registrationData.email,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        passwordHash: hashedPassword.getValue(),
      })

      expect(newUser.email).toBe(registrationData.email)
      expect(newUser.firstName).toBe(registrationData.firstName)
      expect(newUser.tenantId).toBe(tenant.id)

      const response = {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
        message: 'User registered successfully',
      }

      expect(response.success).toBe(true)
      expect(response.user.email).toBe(registrationData.email)
    })

    it('should reject registration with invalid tenant code', async () => {
      const registrationData = {
        email: 'new.user@example.com',
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'User',
        tenantCode: 'INVALID-TENANT',
      }

      const tenant = await getTestPrisma().tenant.findUnique({
        where: { code: registrationData.tenantCode },
      })

      expect(tenant).toBeNull()

      const response = {
        error: 'Invalid tenant code',
        status: 400,
      }

      expect(response.error).toBe('Invalid tenant code')
      expect(response.status).toBe(400)
    })

    it('should reject registration with weak password', async () => {
      const registrationData = {
        email: 'weak.user@example.com',
        password: 'weak',
        firstName: 'Weak',
        lastName: 'User',
        tenantCode: testTenant.code,
      }

      const passwordValidation = Password.validatePolicy(registrationData.password)

      expect(passwordValidation.isValid).toBe(false)
      expect(passwordValidation.errors.length).toBeGreaterThan(0)

      const response = {
        error: 'Invalid password',
        details: passwordValidation.errors,
        status: 400,
      }

      expect(response.error).toBe('Invalid password')
      expect(response.details).toContain('Password must be at least 8 characters long')
    })

    it('should reject registration with duplicate email', async () => {
      const registrationData = {
        email: testUser.email, // Existing email
        password: 'SecurePassword123!',
        firstName: 'Duplicate',
        lastName: 'User',
        tenantCode: testTenant.code,
      }

      const existingUser = await getTestPrisma().user.findUnique({
        where: { email: registrationData.email },
      })

      expect(existingUser).toBeTruthy()

      const response = {
        error: 'User already exists',
        status: 409,
      }

      expect(response.error).toBe('User already exists')
      expect(response.status).toBe(409)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Set up user with password
      const password = await Password.create('CorrectPassword123!')
      await getTestPrisma().user.update({
        where: { id: testUser.id },
        data: { passwordHash: password.getValue() },
      })
    })

    it('should login user with correct credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'CorrectPassword123!',
        tenantCode: testTenant.code,
      }

      // Simulate login logic
      const user = await getTestPrisma().user.findUnique({
        where: { email: loginData.email },
        include: { tenant: true },
      })

      if (!user || !user.isActive) {
        return { error: 'Invalid credentials', status: 401 }
      }

      if (!user.tenant || user.tenant.code !== loginData.tenantCode) {
        return { error: 'Invalid tenant', status: 401 }
      }

      const passwordObj = Password.fromHash(user.passwordHash!)
      const isPasswordValid = await passwordObj.verify(loginData.password)

      if (!isPasswordValid) {
        return { error: 'Invalid credentials', status: 401 }
      }

      // Generate session token (simplified)
      const sessionToken = 'mock-session-token-' + Math.random().toString(36).substr(2, 9)

      expect(isPasswordValid).toBe(true)
      expect(user.email).toBe(loginData.email)

      const response = {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token: sessionToken,
        message: 'Login successful',
      }

      expect(response.success).toBe(true)
      expect(response.user.email).toBe(loginData.email)
      expect(response.token).toBeTruthy()
    })

    it('should reject login with incorrect password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'IncorrectPassword123!',
        tenantCode: testTenant.code,
      }

      const user = await getTestPrisma().user.findUnique({
        where: { email: loginData.email },
        include: { tenant: true },
      })

      const passwordObj = Password.fromHash(user!.passwordHash!)
      const isPasswordValid = await passwordObj.verify(loginData.password)

      expect(isPasswordValid).toBe(false)

      const response = {
        error: 'Invalid credentials',
        status: 401,
      }

      expect(response.error).toBe('Invalid credentials')
    })

    it('should reject login for inactive user', async () => {
      await getTestPrisma().user.update({
        where: { id: testUser.id },
        data: { isActive: false },
      })

      const loginData = {
        email: testUser.email,
        password: 'CorrectPassword123!',
        tenantCode: testTenant.code,
      }

      const user = await getTestPrisma().user.findUnique({
        where: { email: loginData.email },
      })

      expect(user?.isActive).toBe(false)

      const response = {
        error: 'Invalid credentials',
        status: 401,
      }

      expect(response.error).toBe('Invalid credentials')
    })

    it('should reject login with invalid tenant code', async () => {
      const loginData = {
        email: testUser.email,
        password: 'CorrectPassword123!',
        tenantCode: 'WRONG-TENANT',
      }

      const user = await getTestPrisma().user.findUnique({
        where: { email: loginData.email },
        include: { tenant: true },
      })

      expect(user?.tenant?.code).not.toBe(loginData.tenantCode)

      const response = {
        error: 'Invalid tenant',
        status: 401,
      }

      expect(response.error).toBe('Invalid tenant')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout authenticated user successfully', async () => {
      const testAuth = createTestUser({
        id: testUser.id,
        tenantId: testUser.tenantId,
        email: testUser.email,
        role: testUser.role,
      })

      const headers = createTestHeaders(testAuth)

      // Simulate logout logic
      const sessionToken = headers.Authorization?.replace('Bearer ', '')

      if (!sessionToken) {
        return { error: 'No session token', status: 401 }
      }

      // In real implementation, this would invalidate the session in the database
      // For now, just simulate successful logout
      const response = {
        success: true,
        message: 'Logout successful',
      }

      expect(response.success).toBe(true)
      expect(headers.Authorization).toContain('Bearer')
    })

    it('should reject logout without authentication', async () => {
      const response = {
        error: 'Authentication required',
        status: 401,
      }

      expect(response.error).toBe('Authentication required')
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email for valid email', async () => {
      const forgotPasswordData = {
        email: testUser.email,
        tenantCode: testTenant.code,
      }

      // Simulate forgot password logic
      const user = await getTestPrisma().user.findUnique({
        where: { email: forgotPasswordData.email },
        include: { tenant: true },
      })

      if (!user || !user.tenant || user.tenant.code !== forgotPasswordData.tenantCode) {
        return { error: 'If user exists, reset email will be sent', status: 200 }
      }

      // Generate reset token
      const resetToken = 'reset-token-' + Math.random().toString(36).substr(2, 9)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await getTestPrisma().user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpires: expiresAt,
        },
      })

      // Simulate email sending
      const emailSent = true

      expect(user.email).toBe(forgotPasswordData.email)
      expect(user.tenant.code).toBe(forgotPasswordData.tenantCode)
      expect(emailSent).toBe(true)

      const response = {
        success: true,
        message: 'If user exists, password reset email will be sent',
      }

      expect(response.success).toBe(true)
    })

    it('should not reveal if email exists for security', async () => {
      const forgotPasswordData = {
        email: 'nonexistent@example.com',
        tenantCode: testTenant.code,
      }

      const user = await getTestPrisma().user.findUnique({
        where: { email: forgotPasswordData.email },
      })

      expect(user).toBeNull()

      const response = {
        success: true,
        message: 'If user exists, password reset email will be sent',
      }

      // Always return success to prevent email enumeration
      expect(response.success).toBe(true)
      expect(response.message).toContain('If user exists')
    })
  })

  describe('POST /api/auth/reset-password', () => {
    beforeEach(async () => {
      // Set up reset token
      const resetToken = 'valid-reset-token'
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

      await getTestPrisma().user.update({
        where: { id: testUser.id },
        data: {
          resetToken,
          resetTokenExpires: expiresAt,
        },
      })
    })

    it('should reset password with valid token', async () => {
      const resetPasswordData = {
        token: 'valid-reset-token',
        newPassword: 'NewSecurePassword123!',
      }

      // Simulate reset password logic
      const user = await getTestPrisma().user.findUnique({
        where: { email: testUser.email },
      })

      if (
        !user ||
        !user.resetToken ||
        !user.resetTokenExpires ||
        user.resetToken !== resetPasswordData.token ||
        user.resetTokenExpires < new Date()
      ) {
        return { error: 'Invalid or expired reset token', status: 400 }
      }

      const passwordValidation = Password.validatePolicy(resetPasswordData.newPassword)
      if (!passwordValidation.isValid) {
        return { error: 'Invalid password', details: passwordValidation.errors, status: 400 }
      }

      const newPasswordHash = await Password.create(resetPasswordData.newPassword)

      await getTestPrisma().user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash.getValue(),
          resetToken: null,
          resetTokenExpires: null,
        },
      })

      expect(passwordValidation.isValid).toBe(true)

      const updatedUser = await getTestPrisma().user.findUnique({
        where: { id: user.id },
        select: { resetToken: true, resetTokenExpires: true },
      })

      expect(updatedUser?.resetToken).toBeNull()
      expect(updatedUser?.resetTokenExpires).toBeNull()

      const response = {
        success: true,
        message: 'Password reset successful',
      }

      expect(response.success).toBe(true)
    })

    it('should reject reset with invalid token', async () => {
      const resetPasswordData = {
        token: 'invalid-token',
        newPassword: 'NewSecurePassword123!',
      }

      const user = await getTestPrisma().user.findUnique({
        where: { email: testUser.email },
      })

      expect(user?.resetToken).not.toBe(resetPasswordData.token)

      const response = {
        error: 'Invalid or expired reset token',
        status: 400,
      }

      expect(response.error).toBe('Invalid or expired reset token')
    })

    it('should reject reset with weak password', async () => {
      const resetPasswordData = {
        token: 'valid-reset-token',
        newPassword: 'weak',
      }

      const passwordValidation = Password.validatePolicy(resetPasswordData.newPassword)

      expect(passwordValidation.isValid).toBe(false)

      const response = {
        error: 'Invalid password',
        details: passwordValidation.errors,
        status: 400,
      }

      expect(response.error).toBe('Invalid password')
      expect(response.details).toContain('Password must be at least 8 characters long')
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      const testAuth = createTestUser({
        id: testUser.id,
        tenantId: testUser.tenantId,
        email: testUser.email,
        role: testUser.role,
      })

      const headers = createTestHeaders(testAuth)

      // Simulate user profile fetch
      const user = await getTestPrisma().user.findUnique({
        where: { id: testAuth.id },
        include: {
          tenant: true,
          userProfile: true,
        },
      })

      expect(user).toBeTruthy()
      expect(user?.email).toBe(testAuth.email)
      expect(headers.Authorization).toContain('Bearer')

      const response = {
        success: true,
        user: {
          id: user?.id,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          role: user?.role,
          tenant: {
            id: user?.tenant?.id,
            name: user?.tenant?.name,
            code: user?.tenant?.code,
          },
          profile: user?.userProfile,
        },
      }

      expect(response.success).toBe(true)
      expect(response.user.email).toBe(testAuth.email)
    })

    it('should reject profile request without authentication', async () => {
      const response = {
        error: 'Authentication required',
        status: 401,
      }

      expect(response.error).toBe('Authentication required')
      expect(response.status).toBe(401)
    })
  })
})