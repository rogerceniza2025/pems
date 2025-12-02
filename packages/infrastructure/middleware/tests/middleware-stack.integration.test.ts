/**
 * Middleware Stack Integration Tests
 *
 * Comprehensive testing of the complete middleware stack
 * Tests authentication, authorization, rate limiting, and error handling
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Hono } from 'hono'
import { z } from 'zod'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  authMiddleware,
  authorizationMiddleware,
  errorHandlingMiddleware,
  rateLimitMiddleware,
  requestLoggingMiddleware,
  securityHeadersMiddleware,
  tenantContextMiddleware,
  validationMiddleware,
  DEFAULT_RATE_LIMITS,
} from '../src'

// Import HTTPException from error-handling middleware
// Note: This is a local implementation since hono/http-exceptions is not available
class HTTPException extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'HTTPException'
  }
}

// Mock PrismaClient
const mockPrisma = {
  tenant: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $executeRaw: vi.fn(),
} as any

describe('Middleware Stack Integration', () => {
  let app: Hono
  let consoleSpy: any

  beforeEach(() => {
    app = new Hono()
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    }

    // Setup mock tenant
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: 'test-tenant-id',
      name: 'Test Tenant',
      slug: 'test-tenant',
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    consoleSpy.log.mockRestore()
    consoleSpy.warn.mockRestore()
    consoleSpy.error.mockRestore()
    consoleSpy.info.mockRestore()
    consoleSpy.debug.mockRestore()
  })

  describe('Security Headers Middleware', () => {
    it('should add security headers to responses', async () => {
      app.use('*', securityHeadersMiddleware())
      app.get('/test', (c) => c.json({ message: 'test' }))

      const response = await app.request('/test')

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('Referrer-Policy')).toBe(
        'strict-origin-when-cross-origin',
      )
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })

    it('should include CSP header in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      app.use('*', securityHeadersMiddleware())
      app.get('/test', (c) => c.json({ message: 'test' }))

      const response = await app.request('/test')

      expect(response.headers.get('Content-Security-Policy')).toContain(
        "default-src 'self'",
      )

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Request Logging Middleware', () => {
    it('should log requests with correlation ID', async () => {
      app.use('*', requestLoggingMiddleware())
      app.get('/test', (c) => c.json({ message: 'test' }))

      await app.request('/test')

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.any(String),
          method: 'GET',
          path: '/test',
          statusCode: 200,
        }),
      )
    })

    it('should set request ID in context', async () => {
      app.use('*', requestLoggingMiddleware())
      app.get('/test', (c) => {
        const requestId = (c as any).get('requestId') as string | undefined
        return c.json({ requestId })
      })

      const response = await app.request('/test')
      const data = await response.json()

      expect(data.requestId).toMatch(/^[a-zA-Z0-9_-]+$/)
    })
  })

  describe('Rate Limiting Middleware', () => {
    it('should allow requests within limit', async () => {
      app.use('*', rateLimitMiddleware(DEFAULT_RATE_LIMITS.general))
      app.get('/test', (c) => c.json({ message: 'test' }))

      const response = await app.request('/test')

      expect(response.status).toBe(200)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('99')
    })

    it('should rate limit excessive requests', async () => {
      const rateLimiter = rateLimitMiddleware({
        windowMs: 1000, // 1 second
        max: 2, // 2 requests
      })

      app.use('*', rateLimiter)
      app.get('/test', (c) => c.json({ message: 'test' }))

      // First two requests should succeed
      await app.request('/test')
      await app.request('/test')

      // Third request should be rate limited
      const response = await app.request('/test')

      expect(response.status).toBe(429)
      expect(response.headers.get('Retry-After')).toBeTruthy()
    })

    it('should skip rate limiting for health checks', async () => {
      app.use('*', rateLimitMiddleware(DEFAULT_RATE_LIMITS.general))
      app.get('/health', (c) => c.json({ status: 'ok' }))

      const response = await app.request('/health')

      expect(response.status).toBe(200)
      expect(response.headers.get('X-RateLimit-Limit')).toBeNull()
    })
  })

  describe('Authentication Middleware', () => {
    it('should reject requests without authentication', async () => {
      app.use('*', authMiddleware({ required: true }))
      app.get('/protected', (c) => c.json({ message: 'protected' }))

      const response = await app.request('/protected')

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.code).toBe('NO_SESSION_TOKEN')
    })

    it('should allow requests with valid authentication', async () => {
      app.use('*', authMiddleware({ required: true }))
      app.get('/protected', (c) => {
        const user = (c as any).get('user') as any
        return c.json({ user })
      })

      const response = await app.request('/protected', {
        headers: {
          Authorization: 'Bearer valid-session-token',
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.user).toBeTruthy()
    })

    it('should handle optional authentication', async () => {
      app.use('*', authMiddleware({ required: false }))
      app.get('/optional', (c) => {
        const authContext = (c as any).get('auth') as any
        return c.json({ authenticated: authContext.isAuthenticated })
      })

      const response = await app.request('/optional')

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.authenticated).toBe(false)
    })
  })

  describe('Tenant Context Middleware', () => {
    it('should set tenant context for authenticated users', async () => {
      // Mock auth middleware to set authenticated user
      app.use('*', async (c, next) => {
        ;(c as any).set('auth', {
          isAuthenticated: true,
          user: {
            id: 'user-id',
            email: 'user@example.com',
            tenantId: 'test-tenant-id',
          },
        })
        await next()
      })

      app.use('*', tenantContextMiddleware(mockPrisma))
      app.get('/test', (c) => {
        const tenant = (c as any).get('tenant') as any
        return c.json({ tenant })
      })

      const response = await app.request('/test')

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.tenant.tenantId).toBe('test-tenant-id')
    })

    it('should reject requests without tenant context', async () => {
      app.use('*', async (c, next) => {
        ;(c as any).set('auth', {
          isAuthenticated: true,
          user: {
            id: 'user-id',
            email: 'user@example.com',
            tenantId: null,
          },
        })
        await next()
      })

      app.use('*', tenantContextMiddleware(mockPrisma))
      app.get('/test', (c) => c.json({ message: 'test' }))

      const response = await app.request('/test')

      expect(response.status).toBe(401)
    })
  })

  describe('Authorization Middleware', () => {
    beforeEach(() => {
      // Mock auth and tenant context
      app.use('*', async (c, next) => {
        ;(c as any)
          .set('auth', {
            isAuthenticated: true,
            user: {
              id: 'user-id',
              email: 'user@example.com',
              tenantId: 'test-tenant-id',
            },
          })(c as any)
          .set('tenant', {
            tenantId: 'test-tenant-id',
          })
        await next()
      })
    })

    it('should allow access with correct permissions', async () => {
      app.use(
        '*',
        authorizationMiddleware({
          permissions: ['users:read'],
        }),
      )
      app.get('/users', (c) => c.json({ users: [] }))

      const response = await app.request('/users')

      expect(response.status).toBe(200)
    })

    it('should deny access without required permissions', async () => {
      app.use(
        '*',
        authorizationMiddleware({
          permissions: ['users:delete'],
        }),
      )
      app.get('/users', (c) => c.json({ users: [] }))

      const response = await app.request('/users')

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.code).toBe('INSUFFICIENT_PERMISSIONS')
    })

    it('should handle multiple permission requirements', async () => {
      app.use(
        '*',
        authorizationMiddleware({
          permissions: ['users:read', 'tenants:read'],
          permissionMode: 'all',
        }),
      )
      app.get('/users', (c) => c.json({ users: [] }))

      const response = await app.request('/users')

      expect(response.status).toBe(403)
    })
  })

  describe('Validation Middleware', () => {
    it('should validate request body', async () => {
      app.use(
        '*',
        validationMiddleware({
          body: z.object({
            name: z.string().min(1),
            email: z.string().email(),
          }),
        }),
      )
      app.post('/users', (c) => c.json({ success: true }))

      const response = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
        }),
      })

      expect(response.status).toBe(200)
    })

    it('should reject invalid request body', async () => {
      app.use(
        '*',
        validationMiddleware({
          body: z.object({
            name: z.string().min(1),
            email: z.string().email(),
          }),
        }),
      )
      app.post('/users', (c) => c.json({ success: true }))

      const response = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          email: 'invalid-email',
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Error Handling Middleware', () => {
    it('should handle HTTP exceptions', async () => {
      app.use('*', errorHandlingMiddleware())
      app.get('/error', () => {
        throw new Error('Bad request')
      })

      const response = await app.request('/error')

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.message).toBe('Bad request')
    })

    it('should handle validation errors', async () => {
      app.use('*', errorHandlingMiddleware())
      app.get('/error', () => {
        const { ZodError } = z
        throw new ZodError([
          {
            code: z.ZodIssueCode.too_small,
            path: ['name'],
            message: 'Name is required',
            minimum: 1,
            type: 'string',
            inclusive: true,
            origin: 'validate',
          } as z.ZodIssue,
        ])
      })

      const response = await app.request('/error')

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should include request ID in error responses', async () => {
      app.use('*', requestLoggingMiddleware())
      app.use('*', errorHandlingMiddleware())
      app.get('/error', () => {
        throw new HTTPException(500, 'Server error')
      })

      const response = await app.request('/error')

      expect(response.headers.get('X-Request-ID')).toBeTruthy()
      expect(response.headers.get('X-Error-Code')).toBeTruthy()
    })
  })

  describe('Complete Middleware Stack', () => {
    it('should process request through all middleware', async () => {
      // Apply complete middleware stack
      app.use('*', securityHeadersMiddleware())
      app.use('*', requestLoggingMiddleware())
      app.use('*', rateLimitMiddleware(DEFAULT_RATE_LIMITS.general))
      app.use('*', errorHandlingMiddleware())

      // Mock authentication
      app.use('*', async (c, next) => {
        ;(c as any).set('auth', {
          isAuthenticated: true,
          user: {
            id: 'user-id',
            email: 'user@example.com',
            tenantId: 'test-tenant-id',
          },
        })
        await next()
      })

      app.use('*', tenantContextMiddleware(mockPrisma))
      app.use(
        '*',
        authorizationMiddleware({
          permissions: ['users:read'],
        }),
      )

      app.get('/protected-endpoint', (c) => {
        return c.json({
          message: 'success',
          user: (c as any).get('user'),
          tenant: (c as any).get('tenant'),
          requestId: (c as any).get('requestId'),
        })
      })

      const response = await app.request('/protected-endpoint', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      })

      expect(response.status).toBe(200)

      // Check security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')

      // Check rate limiting headers
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100')

      // Check request ID
      expect(response.headers.get('X-Request-ID')).toBeTruthy()

      const data = await response.json()
      expect(data.message).toBe('success')
      expect(data.user).toBeTruthy()
      expect(data.tenant).toBeTruthy()
      expect(data.requestId).toBeTruthy()
    })
  })
})
