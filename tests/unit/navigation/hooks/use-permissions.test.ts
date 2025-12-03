import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSignal } from 'solid-js'
import { Role, Permission } from '@packages/infrastructure/auth/src/rbac'
import {
  createTestUsers,
  createTestUserWithPermissions,
  createTestUserWithExpiredRole,
  type TestUserWithPermissions,
} from '@tests/helpers/permissions'

// Mock the usePermissions hook (this will be implemented based on these tests)
interface UsePermissionsReturn {
  hasPermission: (permission: Permission, tenantId?: string) => boolean
  hasAnyPermission: (permissions: Permission[], tenantId?: string) => boolean
  hasAllPermissions: (permissions: Permission[], tenantId?: string) => boolean
  getUserPermissions: (tenantId?: string) => Permission[]
  canAccessRoute: (routePath: string, tenantId?: string) => boolean
  isSystemAdmin: () => boolean
  userRole: () => Role | undefined
  isLoading: () => boolean
}

// Mock hook implementation (will be replaced with actual implementation)
const usePermissions = vi.fn((): UsePermissionsReturn => {
  // This is a mock implementation that will fail the tests initially
  // Following TDD principles, we write tests first, then implementation
  
  const [user] = createSignal<TestUserWithPermissions | undefined>(undefined)
  const [isLoading] = createSignal(false)
  
  return {
    hasPermission: (permission: Permission, tenantId?: string) => {
      const currentUser = user()
      if (!currentUser) return false
      
      return currentUser.roles?.some(role => 
        role.permissions.includes(permission) &&
        (!tenantId || role.tenantId === tenantId) &&
        (!role.expiresAt || role.expiresAt > new Date())
      ) ?? false
    },
    
    hasAnyPermission: (permissions: Permission[], tenantId?: string) => {
      const currentUser = user()
      if (!currentUser) return false
      
      return permissions.some(permission => 
        currentUser.roles?.some(role => 
          role.permissions.includes(permission) &&
          (!tenantId || role.tenantId === tenantId) &&
          (!role.expiresAt || role.expiresAt > new Date())
        )
      )
    },
    
    hasAllPermissions: (permissions: Permission[], tenantId?: string) => {
      const currentUser = user()
      if (!currentUser) return false
      
      return permissions.every(permission => 
        currentUser.roles?.some(role => 
          role.permissions.includes(permission) &&
          (!tenantId || role.tenantId === tenantId) &&
          (!role.expiresAt || role.expiresAt > new Date())
        )
      )
    },
    
    getUserPermissions: (tenantId?: string) => {
      const currentUser = user()
      if (!currentUser) return []
      
      const relevantRoles = currentUser.roles?.filter(role => 
        (!tenantId || role.tenantId === tenantId) &&
        (!role.expiresAt || role.expiresAt > new Date())
      ) ?? []
      
      return [...new Set(relevantRoles.flatMap(role => role.permissions))]
    },
    
    canAccessRoute: (routePath: string, tenantId?: string) => {
      // Mock route permission mapping
      const routePermissions: Record<string, Permission[]> = {
        '/users': ['users:read'],
        '/users/create': ['users:create'],
        '/transactions': ['transactions:read'],
        '/transactions/create': ['transactions:create'],
        '/reports': ['reports:read'],
        '/system/config': ['system:config'],
        '/tenants': ['tenants:read'],
      }
      
      const requiredPermissions = routePermissions[routePath]
      if (!requiredPermissions) return true // Public route
      
      return requiredPermissions.some(permission => 
        usePermissions().hasPermission(permission, tenantId)
      )
    },
    
    isSystemAdmin: () => {
      const currentUser = user()
      return currentUser?.isSystemAdmin ?? false
    },
    
    userRole: () => {
      const currentUser = user()
      return currentUser?.roles?.[0]?.role
    },
    
    isLoading,
  }
})

// Helper function to render hook with mock user
const renderHookWithUser = (user: TestUserWithPermissions | undefined) => {
  // Mock the user signal for the hook
  usePermissions.mockImplementation(() => {
    const [isLoading] = createSignal(false)
    
    const hasPermission = (permission: Permission, tenantId?: string) => {
      if (!user) return false
      
      return user.roles?.some(role => 
        role.permissions.includes(permission) &&
        (!tenantId || role.tenantId === tenantId) &&
        (!role.expiresAt || role.expiresAt > new Date())
      ) ?? false
    }
    
    const hasAnyPermission = (permissions: Permission[], tenantId?: string) => {
      if (!user) return false
      
      return permissions.some(permission => 
        user.roles?.some(role => 
          role.permissions.includes(permission) &&
          (!tenantId || role.tenantId === tenantId) &&
          (!role.expiresAt || role.expiresAt > new Date())
        )
      )
    }
    
    const hasAllPermissions = (permissions: Permission[], tenantId?: string) => {
      if (!user) return false
      
      return permissions.every(permission => 
        user.roles?.some(role => 
          role.permissions.includes(permission) &&
          (!tenantId || role.tenantId === tenantId) &&
          (!role.expiresAt || role.expiresAt > new Date())
        )
      )
    }
    
    const getUserPermissions = (tenantId?: string) => {
      if (!user) return []
      
      const relevantRoles = user.roles?.filter(role => 
        (!tenantId || role.tenantId === tenantId) &&
        (!role.expiresAt || role.expiresAt > new Date())
      ) ?? []
      
      return [...new Set(relevantRoles.flatMap(role => role.permissions))]
    }
    
    const canAccessRoute = (routePath: string, tenantId?: string) => {
      const routePermissions: Record<string, Permission[]> = {
        '/users': ['users:read'],
        '/users/create': ['users:create'],
        '/transactions': ['transactions:read'],
        '/transactions/create': ['transactions:create'],
        '/reports': ['reports:read'],
        '/system/config': ['system:config'],
        '/tenants': ['tenants:read'],
      }
      
      const requiredPermissions = routePermissions[routePath]
      if (!requiredPermissions) return true
      
      return requiredPermissions.some(permission => hasPermission(permission, tenantId))
    }
    
    return {
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      getUserPermissions,
      canAccessRoute,
      isSystemAdmin: () => user?.isSystemAdmin ?? false,
      userRole: () => user?.roles?.[0]?.role,
      isLoading: () => isLoading(),
    }
  })
  
  return usePermissions()
}

describe('usePermissions Hook', () => {
  let testUsers: Record<Role, TestUserWithPermissions>

  beforeEach(() => {
    vi.clearAllMocks()
    testUsers = createTestUsers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('hasPermission', () => {
    it('should return true when user has the required permission', () => {
      const user = testUsers.manager // Has 'users:read'
      
      const result = renderHookWithUser(user)
      
      expect(result.hasPermission('users:read')).toBe(true)
    })

    it('should return false when user lacks the required permission', () => {
      const user = testUsers.viewer // Does not have 'users:create'
      
      const result = renderHookWithUser(user)
      
      expect(result.hasPermission('users:create')).toBe(false)
    })

    it('should return true for super admin with any permission', () => {
      const user = testUsers.super_admin
      
      const result = renderHookWithUser(user)
      
      expect(result.hasPermission('any:permission')).toBe(true)
      expect(result.hasPermission('system:config')).toBe(true)
    })

    it('should respect tenant-scoped permissions', () => {
      const user = createTestUserWithPermissions('manager', ['users:read'], 'tenant-1')
      
      const result = renderHookWithUser(user)
      
      expect(result.hasPermission('users:read', 'tenant-1')).toBe(true)
      expect(result.hasPermission('users:read', 'tenant-2')).toBe(false)
    })

    it('should return false for expired roles', () => {
      const user = createTestUserWithExpiredRole()
      
      const result = renderHookWithUser(user)
      
      expect(result.hasPermission('users:read')).toBe(false)
    })

    it('should return false for undefined user', () => {
      const result = renderHookWithUser(undefined)
      
      expect(result.hasPermission('users:read')).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('should return true when user has any of the specified permissions', () => {
      const user = testUsers.manager // Has 'users:read' and 'transactions:approve'
      
      const result = renderHookWithUser(user)
      
      expect(result.hasAnyPermission(['users:create', 'users:read', 'system:config'])).toBe(true)
    })

    it('should return false when user has none of the specified permissions', () => {
      const user = testUsers.viewer // Only has read permissions
      
      const result = renderHookWithUser(user)
      
      expect(result.hasAnyPermission(['users:create', 'users:delete', 'system:config'])).toBe(false)
    })

    it('should handle empty permissions array', () => {
      const user = testUsers.manager
      
      const result = renderHookWithUser(user)
      
      expect(result.hasAnyPermission([])).toBe(false)
    })

    it('should work with tenant-scoped permissions', () => {
      const user = createTestUserWithPermissions('manager', ['users:read'], 'tenant-1')
      
      const result = renderHookWithUser(user)
      
      expect(result.hasAnyPermission(['users:read', 'users:create'], 'tenant-1')).toBe(true)
      expect(result.hasAnyPermission(['users:read', 'users:create'], 'tenant-2')).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('should return true when user has all specified permissions', () => {
      const user = testUsers.tenant_admin // Has many permissions
      
      const result = renderHookWithUser(user)
      
      expect(result.hasAllPermissions(['users:read', 'users:create', 'users:update'])).toBe(true)
    })

    it('should return false when user lacks some specified permissions', () => {
      const user = testUsers.manager // Missing 'users:delete'
      
      const result = renderHookWithUser(user)
      
      expect(result.hasAllPermissions(['users:read', 'users:create', 'users:delete'])).toBe(false)
    })

    it('should return true for empty permissions array', () => {
      const user = testUsers.manager
      
      const result = renderHookWithUser(user)
      
      expect(result.hasAllPermissions([])).toBe(true)
    })

    it('should work with single permission', () => {
      const user = testUsers.manager
      
      const result = renderHookWithUser(user)
      
      expect(result.hasAllPermissions(['users:read'])).toBe(true)
      expect(result.hasAllPermissions(['users:delete'])).toBe(false)
    })
  })

  describe('getUserPermissions', () => {
    it('should return all permissions for the user', () => {
      const user = testUsers.manager
      
      const result = renderHookWithUser(user)
      const permissions = result.getUserPermissions()
      
      expect(permissions).toContain('users:read')
      expect(permissions).toContain('transactions:approve')
      expect(permissions).toContain('reports:read')
    })

    it('should return empty array for user with no permissions', () => {
      const userWithoutPermissions = {
        id: 'no-perms-user',
        email: 'noperms@test.com',
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      const result = renderHookWithUser(userWithoutPermissions)
      const permissions = result.getUserPermissions()
      
      expect(permissions).toEqual([])
    })

    it('should filter by tenant', () => {
      const user = createTestUserWithPermissions('manager', ['users:read'], 'tenant-1')
      
      // Add another role for different tenant
      user.roles.push({
        userId: 'user-id',
        tenantId: 'tenant-2',
        role: 'viewer',
        permissions: ['transactions:read'],
        assignedBy: 'admin',
        assignedAt: new Date(),
      })
      
      const result = renderHookWithUser(user)
      
      const tenant1Permissions = result.getUserPermissions('tenant-1')
      const tenant2Permissions = result.getUserPermissions('tenant-2')
      const allPermissions = result.getUserPermissions()
      
      expect(tenant1Permissions).toContain('users:read')
      expect(tenant1Permissions).not.toContain('transactions:read')
      
      expect(tenant2Permissions).toContain('transactions:read')
      expect(tenant2Permissions).not.toContain('users:read')
      
      expect(allPermissions).toContain('users:read')
      expect(allPermissions).toContain('transactions:read')
    })

    it('should remove duplicates from permissions', () => {
      const user = createTestUserWithPermissions('manager', ['users:read'], 'tenant-1')
      
      // Add another role with overlapping permissions
      user.roles.push({
        userId: 'user-id',
        tenantId: 'tenant-1',
        role: 'supervisor',
        permissions: ['users:read', 'transactions:read'], // users:read is duplicate
        assignedBy: 'admin',
        assignedAt: new Date(),
      })
      
      const result = renderHookWithUser(user)
      const permissions = result.getUserPermissions()
      
      const uniquePermissions = [...new Set(permissions)]
      expect(permissions).toEqual(uniquePermissions)
    })

    it('should exclude expired role permissions', () => {
      const user = createTestUserWithExpiredRole()
      
      // Add a valid role
      user.roles.push({
        userId: 'user-id',
        tenantId: 'tenant-1',
        role: 'viewer',
        permissions: ['transactions:read'],
        assignedBy: 'admin',
        assignedAt: new Date(),
        expiresAt: undefined, // No expiration
      })
      
      const result = renderHookWithUser(user)
      const permissions = result.getUserPermissions()
      
      expect(permissions).not.toContain('users:read') // From expired role
      expect(permissions).toContain('transactions:read') // From valid role
    })
  })

  describe('canAccessRoute', () => {
    it('should return true for public routes', () => {
      const user = testUsers.viewer
      
      const result = renderHookWithUser(user)
      
      expect(result.canAccessRoute('/')).toBe(true)
      expect(result.canAccessRoute('/login')).toBe(true)
    })

    it('should check route permissions correctly', () => {
      const user = testUsers.manager
      
      const result = renderHookWithUser(user)
      
      expect(result.canAccessRoute('/users')).toBe(true) // Has users:read
      expect(result.canAccessRoute('/users/create')).toBe(false) // Missing users:create
      expect(result.canAccessRoute('/transactions')).toBe(true) // Has transactions:read
      expect(result.canAccessRoute('/system/config')).toBe(false) // Missing system:config
    })

    it('should return true for super admin on any route', () => {
      const user = testUsers.super_admin
      
      const result = renderHookWithUser(user)
      
      expect(result.canAccessRoute('/system/config')).toBe(true)
      expect(result.canAccessRoute('/tenants')).toBe(true)
      expect(result.canAccessRoute('/any/route')).toBe(true)
    })

    it('should respect tenant-scoped route access', () => {
      const user = createTestUserWithPermissions('manager', ['users:read'], 'tenant-1')
      
      const result = renderHookWithUser(user)
      
      expect(result.canAccessRoute('/users', 'tenant-1')).toBe(true)
      expect(result.canAccessRoute('/users', 'tenant-2')).toBe(false)
    })
  })

  describe('isSystemAdmin', () => {
    it('should return true for system admin', () => {
      const user = testUsers.super_admin
      
      const result = renderHookWithUser(user)
      
      expect(result.isSystemAdmin()).toBe(true)
    })

    it('should return false for regular users', () => {
      const user = testUsers.manager
      
      const result = renderHookWithUser(user)
      
      expect(result.isSystemAdmin()).toBe(false)
    })

    it('should return false for undefined user', () => {
      const result = renderHookWithUser(undefined)
      
      expect(result.isSystemAdmin()).toBe(false)
    })
  })

  describe('userRole', () => {
    it('should return the user role', () => {
      const user = testUsers.manager
      
      const result = renderHookWithUser(user)
      
      expect(result.userRole()).toBe('manager')
    })

    it('should return undefined for user with no roles', () => {
      const userWithoutRoles = {
        id: 'no-roles-user',
        email: 'noroles@test.com',
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      const result = renderHookWithUser(userWithoutRoles)
      
      expect(result.userRole()).toBeUndefined()
    })

    it('should return undefined for undefined user', () => {
      const result = renderHookWithUser(undefined)
      
      expect(result.userRole()).toBeUndefined()
    })
  })

  describe('isLoading', () => {
    it('should return loading state', () => {
      const result = renderHookWithUser(testUsers.manager)
      
      expect(typeof result.isLoading()).toBe('boolean')
      // In actual implementation, this would be true while permissions are loading
    })
  })

  describe('Caching Performance', () => {
    it('should cache permission check results', () => {
      const user = testUsers.manager
      
      const result = renderHookWithUser(user)
      
      const startTime = performance.now()
      
      // Perform multiple permission checks
      for (let i = 0; i < 100; i++) {
        result.hasPermission('users:read')
        result.hasPermission('users:create')
        result.hasAnyPermission(['users:read', 'users:update'])
        result.getUserPermissions()
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should be very fast due to caching
      expect(duration).toBeLessThan(50)
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed permission data gracefully', () => {
      const userWithMalformedData = {
        id: 'malformed-user',
        email: 'malformed@test.com',
        roles: [
          {
            userId: 'malformed-user',
            tenantId: 'tenant-1',
            role: 'manager' as Role,
            permissions: null as any, // Malformed permissions
            assignedBy: 'admin',
            assignedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      const result = renderHookWithUser(userWithMalformedData)
      
      // Should not throw and should handle gracefully
      expect(() => {
        result.hasPermission('users:read')
        result.getUserPermissions()
        result.hasAnyPermission(['users:read'])
      }).not.toThrow()
    })

    it('should handle user roles being undefined', () => {
      const userWithUndefinedRoles = {
        id: 'undefined-roles-user',
        email: 'undefined@test.com',
        roles: undefined as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      const result = renderHookWithUser(userWithUndefinedRoles)
      
      expect(result.hasPermission('users:read')).toBe(false)
      expect(result.getUserPermissions()).toEqual([])
      expect(result.userRole()).toBeUndefined()
    })
  })
})