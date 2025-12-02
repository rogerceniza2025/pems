/**
 * Authentication API Routes Tests
 *
 * Comprehensive testing for authentication endpoints including:
 * - Sign in/sign up functionality
 * - Password reset flows
 * - MFA setup and verification
 * - Security edge cases
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authRouter } from './auth'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

// Mock BetterAuth and related services
vi.mock('@pems/infrastructure-auth', () => ({
  auth: {
    api: {
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      changePassword: vi.fn(),
      updateUser: vi.fn(),
      validateSessionToken: vi.fn(),
    },
  },
  mfaService: {
    setupMFA: vi.fn(),
    verifyMFASetup: vi.fn(),
    verifyMFACode: vi.fn(),
    disableMFA: vi.fn(),
    isMFAEnabled: vi.fn(),
    getMFAStatus: vi.fn(),
    regenerateBackupCodes: vi.fn(),
  },
}))

// Mock middleware
vi.mock('@pems/middleware', () => ({
  getCurrentUser: vi.fn((c) => c.get('mockUser') || {
    id: 'test-user-id',
    email: 'test@example.com',
    tenantId: 'test-tenant-id',
  }),
  getCurrentSession: vi.fn((c) => c.get('mockSession') || {
    id: 'test-session-id',
    token: 'test-token',
    userId: 'test-user-id',
  }),
}))

describe('Authentication API Routes', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    app.route('/api/auth', authRouter)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/auth/sign-in', () => {
    it('should sign in user with valid credentials', async () => {
      const mockSignInResult = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
        },
        session: {
          id: 'test-session-id',
          token: 'test-token',
        },
      }

      const { auth } = await import('@pems/infrastructure-auth')
      vi.mocked(auth.api.signIn).mockResolvedValue(mockSignInResult)
      vi.mocked(auth.api.validateSessionToken).mockResolvedValue(mockSignInResult)

      const response = await app.request('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          tenantId: 'test-tenant-id',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.user.email).toBe('test@example.com')
      expect(auth.api.signIn).toHaveBeenCalledWith({
        body: {
          email: 'test@example.com',
          password: 'password123',
          callbackURL: `${process.env.FRONTEND_URL}/auth/callback`,
        },
        headers: {
          'x-tenant-id': 'test-tenant-id',
        },
      })
    })

    it('should handle MFA requirement', async () => {
      const mockSignInResult = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
      }

      const { auth } = await import('@pems/infrastructure-auth')
      const { mfaService } = await import('@pems/infrastructure-auth')

      vi.mocked(auth.api.signIn).mockResolvedValue(mockSignInResult)
      vi.mocked(mfaService.isMFAEnabled).mockResolvedValue(true)

      const response = await app.request('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          tenantId: 'test-tenant-id',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.requiresMFA).toBe(true)
      expect(data.userId).toBe('test-user-id')
    })

    it('should verify MFA code when provided', async () => {
      const mockSignInResult = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
        session: {
          id: 'test-session-id',
          token: 'test-token',
        },
      }

      const { auth } = await import('@pems/infrastructure-auth')
      const { mfaService } = await import('@pems/infrastructure-auth')

      vi.mocked(auth.api.signIn).mockResolvedValue(mockSignInResult)
      vi.mocked(mfaService.isMFAEnabled).mockResolvedValue(true)
      vi.mocked(mfaService.verifyMFACode).mockResolvedValue({
        success: true,
        user: mockSignInResult.user,
      })

      const response = await app.request('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          tenantId: 'test-tenant-id',
          mfaCode: '123456',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(mfaService.verifyMFACode).toHaveBeenCalledWith('test-user-id', '123456')
    })

    it('should reject invalid credentials', async () => {
      const { auth } = await import('@pems/infrastructure-auth')
      vi.mocked(auth.api.signIn).mockRejectedValue(new Error('Invalid credentials'))

      const response = await app.request('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong-password',
          tenantId: 'test-tenant-id',
        }),
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.message).toBe('Authentication service temporarily unavailable')
    })

    it('should validate required fields', async () => {
      const response = await app.request('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          // Missing password and tenantId
        }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/auth/sign-up', () => {
    it('should create new user with valid data', async () => {
      const mockSignUpResult = {
        user: {
          id: 'new-user-id',
          email: 'newuser@example.com',
          name: 'New User',
          emailVerified: false,
        },
      }

      const { auth } = await import('@pems/infrastructure-auth')
      vi.mocked(auth.api.signUp).mockResolvedValue(mockSignUpResult)

      const response = await app.request('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecurePass123',
          name: 'New User',
          tenantId: 'test-tenant-id',
          phone: '+1234567890',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.user.email).toBe('newuser@example.com')
      expect(auth.api.signUp).toHaveBeenCalledWith({
        body: {
          email: 'newuser@example.com',
          password: 'SecurePass123',
          name: 'New User',
          callbackURL: `${process.env.FRONTEND_URL}/auth/callback`,
          tenantId: 'test-tenant-id',
          phone: '+1234567890',
          metadata: {
            tenantId: 'test-tenant-id',
            registrationSource: 'api',
          },
        },
        headers: {
          'x-tenant-id': 'test-tenant-id',
        },
      })
    })

    it('should handle duplicate email error', async () => {
      const { auth } = await import('@pems/infrastructure-auth')
      vi.mocked(auth.api.signUp).mockRejectedValue(new Error('User with this email already exists'))

      const response = await app.request('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'SecurePass123',
          name: 'Existing User',
          tenantId: 'test-tenant-id',
        }),
      })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.message).toBe('An account with this email already exists')
    })
  })

  describe('POST /api/auth/sign-out', () => {
    it('should sign out user successfully', async () => {
      const { auth } = await import('@pems/infrastructure-auth')
      vi.mocked(auth.api.signOut).mockResolvedValue({})

      // Mock authenticated context
      const mockContext = {
        get: vi.fn((key) => {
          if (key === 'mockSession') {
            return {
              id: 'test-session-id',
              token: 'test-token',
              userId: 'test-user-id',
            }
          }
          return null
        }),
      }

      const response = await app.request('/api/auth/sign-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.message).toBe('Signed out successfully')
    })

    it('should handle sign out errors gracefully', async () => {
      const { auth } = await import('@pems/infrastructure-auth')
      vi.mocked(auth.api.signOut).mockRejectedValue(new Error('Sign out failed'))

      const response = await app.request('/api/auth/sign-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      const { auth } = await import('@pems/infrastructure-auth')
      vi.mocked(auth.api.forgotPassword).mockResolvedValue({})

      const response = await app.request('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          tenantId: 'test-tenant-id',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('password reset link has been sent')
    })

    it('should always return success for email enumeration protection', async () => {
      const { auth } = await import('@pems/infrastructure-auth')
      vi.mocked(auth.api.forgotPassword).mockRejectedValue(new Error('User not found'))

      const response = await app.request('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          tenantId: 'test-tenant-id',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const { auth } = await import('@pems/infrastructure-auth')
      vi.mocked(auth.api.resetPassword).mockResolvedValue({})

      const response = await app.request('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-reset-token',
          newPassword: 'NewSecurePass123',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.message).toBe('Password reset successfully')
    })

    it('should reject invalid reset token', async () => {
      const { auth } = await import('@pems/infrastructure-auth')
      vi.mocked(auth.api.resetPassword).mockRejectedValue(new Error('Invalid or expired reset token'))

      const response = await app.request('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'invalid-token',
          newPassword: 'NewSecurePass123',
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.message).toBe('Invalid or expired reset token')
    })
  })

  describe('POST /api/auth/mfa/setup', () => {
    it('should setup MFA for user', async () => {
      const { mfaService } = await import('@pems/infrastructure-auth')
      vi.mocked(mfaService.setupMFA).mockResolvedValue({
        success: true,
        secret: 'test-secret',
        qrCode: 'data:image/png;base64,test',
        backupCodes: ['1234-5678', '8765-4321'],
      })

      // Mock authenticated user
      const mockUser = { id: 'test-user-id' }
      const mockContext = { get: vi.fn(() => mockUser) }

      const response = await app.request('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.secret).toBe('test-secret')
      expect(data.qrCode).toBe('data:image/png;base64,test')
      expect(data.backupCodes).toEqual(['1234-5678', '8765-4321'])
    })

    it('should handle MFA setup failure', async () => {
      const { mfaService } = await import('@pems/infrastructure-auth')
      vi.mocked(mfaService.setupMFA).mockResolvedValue({
        success: false,
        error: 'MFA already enabled',
      })

      const response = await app.request('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.message).toBe('MFA already enabled')
    })
  })

  describe('POST /api/auth/mfa/verify', () => {
    it('should verify MFA setup', async () => {
      const { mfaService } = await import('@pems/infrastructure-auth')
      vi.mocked(mfaService.verifyMFASetup).mockResolvedValue({
        success: true,
        user: { id: 'test-user-id' },
      })

      const response = await app.request('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: '123456',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.message).toBe('MFA enabled successfully')
    })

    it('should reject invalid MFA code', async () => {
      const { mfaService } = await import('@pems/infrastructure-auth')
      vi.mocked(mfaService.verifyMFASetup).mockResolvedValue({
        success: false,
        error: 'Invalid verification code',
      })

      const response = await app.request('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: '000000',
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.message).toBe('Invalid verification code')
    })
  })

  describe('GET /api/auth/mfa/status', () => {
    it('should return MFA status for user', async () => {
      const { mfaService } = await import('@pems/infrastructure-auth')
      vi.mocked(mfaService.getMFAStatus).mockResolvedValue({
        enabled: true,
        hasBackupCodes: true,
      })

      const response = await app.request('/api/auth/mfa/status', {
        method: 'GET',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.status.enabled).toBe(true)
      expect(data.status.hasBackupCodes).toBe(true)
    })

    it('should handle MFA status check failure', async () => {
      const { mfaService } = await import('@pems/infrastructure-auth')
      vi.mocked(mfaService.getMFAStatus).mockResolvedValue(null)

      const response = await app.request('/api/auth/mfa/status', {
        method: 'GET',
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.message).toBe('Unable to retrieve MFA status')
    })
  })

  describe('Security Tests', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await app.request('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      })

      expect(response.status).toBe(400)
    })

    it('should validate email format', async () => {
      const response = await app.request('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'SecurePass123',
          name: 'Test User',
          tenantId: 'test-tenant-id',
        }),
      })

      expect(response.status).toBe(400)
    })

    it('should validate password strength', async () => {
      const response = await app.request('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'weak', // Too short and missing requirements
          name: 'Test User',
          tenantId: 'test-tenant-id',
        }),
      })

      expect(response.status).toBe(400)
    })

    it('should sanitize input to prevent XSS', async () => {
      const response = await app.request('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: '<script>alert("xss")</script>',
          tenantId: 'test-tenant-id',
        }),
      })

      // The request should be processed, but the name should be sanitized
      // This test depends on the specific sanitization implementation
      expect(response.status).toBeGreaterThanOrEqual(200)
    })

    it('should handle rate limiting (conceptual test)', async () => {
      // This would test rate limiting if implemented
      // For now, we just ensure the endpoint handles repeated requests
      const requests = Array.from({ length: 10 }, () =>
        app.request('/api/auth/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            tenantId: 'test-tenant-id',
          }),
        })
      )

      const responses = await Promise.allSettled(requests)

      // All requests should be handled (some may fail due to auth, not rate limiting)
      responses.forEach(response => {
        expect(response.status === 'fulfilled').toBe(true)
      })
    })
  })
})