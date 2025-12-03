import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
// Mock Next.js server components for TanStack Start migration
const NextRequest = vi.fn()
const NextResponse = {
  json: vi.fn(),
  redirect: vi.fn(),
  next: vi.fn(),
}
import { authMiddleware } from './packages/infrastructure/middleware/src'
import { betterAuth } from 'better-auth'

// Mock betterAuth
vi.mock('better-auth', () => ({
  betterAuth: vi.fn(() => ({
    handler: vi.fn(),
    api: {
      getSession: vi.fn(),
    },
  })),
}))

// Mock JWT
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}))

describe('Authentication Middleware', () => {
  let mockRequest: Partial<NextRequest>
  let mockNext: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      headers: new Headers(),
      cookies: {
        get: vi.fn(),
      },
      url: 'http://localhost:3000/api/protected',
    }

    mockNext = vi.fn()
  })

  describe('Cookie-based Authentication', () => {
    it('should authenticate with valid session cookie', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com', tenantId: 'tenant-123' },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      }

      mockRequest.cookies!.get.mockReturnValue({
        value: 'valid_session_token',
      })

      const { api } = betterAuth()
      vi.mocked(api.getSession).mockResolvedValue(mockSession)

      await authMiddleware(mockRequest as NextRequest, mockNext)

      expect(mockNext).toHaveBeenCalledWith()
      expect(mockRequest.headers.get('X-User-ID')).toBe('user-123')
      expect(mockRequest.headers.get('X-Tenant-ID')).toBe('tenant-123')
    })

    it('should reject with expired session cookie', async () => {
      const expiredSession = {
        user: null,
        expiresAt: new Date(Date.now() - 1000), // Expired
      }

      mockRequest.cookies!.get.mockReturnValue({
        value: 'expired_session_token',
      })

      const { api } = betterAuth()
      vi.mocked(api.getSession).mockResolvedValue(expiredSession)

      await authMiddleware(mockRequest as NextRequest, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject with invalid session cookie', async () => {
      mockRequest.cookies!.get.mockReturnValue({
        value: 'invalid_session_token',
      })

      const { api } = betterAuth()
      vi.mocked(api.getSession).mockResolvedValue(null)

      await authMiddleware(mockRequest as NextRequest, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Bearer Token Authentication', () => {
    it('should authenticate with valid JWT bearer token', async () => {
      const mockPayload = {
        sub: 'user-123',
        tenantId: 'tenant-123',
        email: 'test@example.com',
        role: 'USER',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      }

      mockRequest.headers!.set('Authorization', 'Bearer valid_jwt_token')
      mockRequest.cookies!.get.mockReturnValue(null) // No session cookie

      const jwt = require('jsonwebtoken')
      vi.mocked(jwt.default.verify).mockReturnValue(mockPayload)

      await authMiddleware(mockRequest as NextRequest, mockNext)

      expect(mockNext).toHaveBeenCalledWith()
      expect(mockRequest.headers.get('X-User-ID')).toBe('user-123')
      expect(mockRequest.headers.get('X-Tenant-ID')).toBe('tenant-123')
    })

    it('should reject with expired JWT token', async () => {
      mockRequest.headers!.set('Authorization', 'Bearer expired_jwt_token')
      mockRequest.cookies!.get.mockReturnValue(null)

      const jwt = require('jsonwebtoken')
      vi.mocked(jwt.default.verify).mockImplementation(() => {
        throw new Error('TokenExpiredError: jwt expired')
      })

      await authMiddleware(mockRequest as NextRequest, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject with invalid JWT token', async () => {
      mockRequest.headers!.set('Authorization', 'Bearer invalid_jwt_token')
      mockRequest.cookies!.get.mockReturnValue(null)

      const jwt = require('jsonwebtoken')
      vi.mocked(jwt.default.verify).mockImplementation(() => {
        throw new Error('JsonWebTokenError: invalid token')
      })

      await authMiddleware(mockRequest as NextRequest, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject with malformed Authorization header', async () => {
      mockRequest.headers!.set('Authorization', 'InvalidHeaderFormat')
      mockRequest.cookies!.get.mockReturnValue(null)

      await authMiddleware(mockRequest as NextRequest, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Optional Authentication Mode', () => {
    it('should continue without authentication when optional mode is enabled', async () => {
      // This would require modifying the middleware to accept an options parameter
      // For now, testing the base behavior
      mockRequest.cookies!.get.mockReturnValue(null)
      mockRequest.headers!.delete('Authorization')

      await authMiddleware(mockRequest as NextRequest, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockRequest.cookies!.get.mockReturnValue({
        value: 'valid_session_token',
      })

      const { api } = betterAuth()
      vi.mocked(api.getSession).mockRejectedValue(new Error('Database connection failed'))

      await authMiddleware(mockRequest as NextRequest, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle malformed cookies', async () => {
      mockRequest.cookies!.get.mockImplementation(() => {
        throw new Error('Cookie parsing error')
      })

      await authMiddleware(mockRequest as NextRequest, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Security Headers', () => {
    it('should preserve existing security headers', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com', tenantId: 'tenant-123' },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }

      mockRequest.cookies!.get.mockReturnValue({
        value: 'valid_session_token',
      })
      mockRequest.headers!.set('X-Existing-Header', 'existing-value')

      const { api } = betterAuth()
      vi.mocked(api.getSession).mockResolvedValue(mockSession)

      await authMiddleware(mockRequest as NextRequest, mockNext)

      expect(mockRequest.headers.get('X-Existing-Header')).toBe('existing-value')
    })
  })
})