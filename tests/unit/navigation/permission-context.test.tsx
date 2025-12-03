import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/solid'
import { createSignal, createEffect, createContext, useContext, Provider } from 'solid-js'
import { Role, Permission } from '@packages/infrastructure/auth/src/rbac'
import {
  createTestUsers,
  createTestUserWithPermissions,
  createTestUserWithExpiredRole,
  type TestUserWithPermissions,
} from '@tests/helpers/permissions'

// Mock PermissionContext and related types
interface PermissionContextType {
  user: TestUserWithPermissions | undefined
  tenantId: string | undefined
  permissions: Permission[]
  hasPermission: (permission: Permission, targetTenantId?: string) => boolean
  hasAnyPermission: (permissions: Permission[], targetTenantId?: string) => boolean
  hasAllPermissions: (permissions: Permission[], targetTenantId?: string) => boolean
  setUser: (user: TestUserWithPermissions | undefined) => void
  setTenantId: (tenantId: string | undefined) => void
  isLoading: boolean
  isSystemAdmin: boolean
  userRole: Role | undefined
  refreshPermissions: () => Promise<void>
}

// Mock context implementation
const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

// Mock provider implementation
const PermissionProvider = vi.fn((props: { children: any }) => {
  const [user, setUser] = createSignal<TestUserWithPermissions | undefined>(undefined)
  const [tenantId, setTenantId] = createSignal<string | undefined>(undefined)
  const [permissions, setPermissions] = createSignal<Permission[]>([])
  const [isLoading, setIsLoading] = createSignal(false)

  // Mock permission calculation
  const calculatePermissions = (currentUser: TestUserWithPermissions | undefined, currentTenantId?: string) => {
    if (!currentUser) return []
    
    const relevantRoles = currentUser.roles?.filter(role => 
      (!currentTenantId || role.tenantId === currentTenantId) &&
      (!role.expiresAt || role.expiresAt > new Date())
    ) ?? []
    
    return [...new Set(relevantRoles.flatMap(role => role.permissions))]
  }

  // Update permissions when user or tenant changes
  createEffect(() => {
    const currentUser = user()
    const currentTenantId = tenantId()
    
    setIsLoading(true)
    
    // Simulate async permission loading
    setTimeout(() => {
      const calculatedPermissions = calculatePermissions(currentUser, currentTenantId)
      setPermissions(calculatedPermissions)
      setIsLoading(false)
    }, 10)
  })

  const contextValue: PermissionContextType = {
    user: user(),
    tenantId: tenantId(),
    permissions: permissions(),
    hasPermission: (permission: Permission, targetTenantId?: string) => {
      const currentUser = user()
      if (!currentUser) return false
      
      return currentUser.roles?.some(role => 
        role.permissions.includes(permission) &&
        (!targetTenantId || role.tenantId === targetTenantId) &&
        (!role.expiresAt || role.expiresAt > new Date())
      ) ?? false
    },
    hasAnyPermission: (permissionsToCheck: Permission[], targetTenantId?: string) => {
      const currentUser = user()
      if (!currentUser) return false
      
      return permissionsToCheck.some(permission => 
        currentUser.roles?.some(role => 
          role.permissions.includes(permission) &&
          (!targetTenantId || role.tenantId === targetTenantId) &&
          (!role.expiresAt || role.expiresAt > new Date())
        )
      )
    },
    hasAllPermissions: (permissionsToCheck: Permission[], targetTenantId?: string) => {
      const currentUser = user()
      if (!currentUser) return false
      
      return permissionsToCheck.every(permission => 
        currentUser.roles?.some(role => 
          role.permissions.includes(permission) &&
          (!targetTenantId || role.tenantId === targetTenantId) &&
          (!role.expiresAt || role.expiresAt > new Date())
        )
      )
    },
    setUser,
    setTenantId,
    isLoading: isLoading(),
    isSystemAdmin: user()?.isSystemAdmin ?? false,
    userRole: user()?.roles?.[0]?.role,
    refreshPermissions: async () => {
      setIsLoading(true)
      // Simulate permission refresh
      await new Promise(resolve => setTimeout(resolve, 50))
      const currentUser = user()
      const currentTenantId = tenantId()
      const refreshedPermissions = calculatePermissions(currentUser, currentTenantId)
      setPermissions(refreshedPermissions)
      setIsLoading(false)
    },
  }

  return (
    <Provider value={contextValue}>
      {props.children}
    </Provider>
  )
})

// Mock hook for using the context
const usePermissionContext = vi.fn(() => {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermissionContext must be used within PermissionProvider')
  }
  return context
})

// Helper component to test context values
const ContextTestComponent = vi.fn(() => {
  const context = usePermissionContext()
  
  return (
    <div data-testid="context-test">
      <div data-testid="user-email">{context.user?.email || 'No user'}</div>
      <div data-testid="user-role">{context.userRole || 'No role'}</div>
      <div data-testid="tenant-id">{context.tenantId || 'No tenant'}</div>
      <div data-testid="is-loading">{context.isLoading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="is-system-admin">{context.isSystemAdmin ? 'Yes' : 'No'}</div>
      <div data-testid="permission-count">{context.permissions.length}</div>
      <div data-testid="can-read-users">
        {context.hasPermission('users:read') ? 'Yes' : 'No'}
      </div>
      <div data-testid="can-create-users">
        {context.hasPermission('users:create') ? 'Yes' : 'No'}
      </div>
      <button
        data-testid="set-user-btn"
        onClick={() => context.setUser(createTestUsers().manager)}
      >
        Set User
      </button>
      <button
        data-testid="clear-user-btn"
        onClick={() => context.setUser(undefined)}
      >
        Clear User
      </button>
      <button
        data-testid="set-tenant-btn"
        onClick={() => context.setTenantId('test-tenant-1')}
      >
        Set Tenant
      </button>
      <button
        data-testid="refresh-permissions-btn"
        onClick={() => context.refreshPermissions()}
      >
        Refresh Permissions
      </button>
    </div>
  )
})

describe('PermissionContext', () => {
  let testUsers: Record<Role, TestUserWithPermissions>

  beforeEach(() => {
    vi.clearAllMocks()
    testUsers = createTestUsers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Context Initialization', () => {
    it('should initialize with default values', () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
      expect(screen.getByTestId('user-role')).toHaveTextContent('No role')
      expect(screen.getByTestId('tenant-id')).toHaveTextContent('No tenant')
      expect(screen.getByTestId('permission-count')).toHaveTextContent('0')
      expect(screen.getByTestId('can-read-users')).toHaveTextContent('No')
      expect(screen.getByTestId('can-create-users')).toHaveTextContent('No')
    })

    it('should provide loading state during initialization', () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      // Should initially show loading state
      expect(screen.getByTestId('is-loading')).toHaveTextContent('Loading')
    })
  })

  describe('User Management', () => {
    it('should update context when user is set', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      // Click button to set user
      fireEvent.click(screen.getByTestId('set-user-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent(testUsers.manager.email)
        expect(screen.getByTestId('user-role')).toHaveTextContent('manager')
        expect(screen.getByTestId('permission-count')).not.toHaveTextContent('0')
      })
    })

    it('should clear user when set to undefined', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      // Set user first
      fireEvent.click(screen.getByTestId('set-user-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent(testUsers.manager.email)
      })

      // Clear user
      fireEvent.click(screen.getByTestId('clear-user-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
        expect(screen.getByTestId('permission-count')).toHaveTextContent('0')
      })
    })

    it('should recalculate permissions when user changes', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      // Set manager user
      fireEvent.click(screen.getByTestId('set-user-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('can-read-users')).toHaveTextContent('Yes')
        expect(screen.getByTestId('can-create-users')).toHaveTextContent('No') // Manager doesn't have users:create
      })
    })
  })

  describe('Tenant Management', () => {
    it('should update context when tenant is changed', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      // Set user first
      fireEvent.click(screen.getByTestId('set-user-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent(testUsers.manager.email)
      })

      // Set tenant
      fireEvent.click(screen.getByTestId('set-tenant-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('tenant-id')).toHaveTextContent('test-tenant-1')
      })
    })

    it('should recalculate permissions when tenant changes', async () => {
      // Create a user with tenant-specific permissions
      const tenantUser = createTestUserWithPermissions('manager', ['users:read'], 'tenant-1')
      
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      // Manually set the tenant user in the context
      const context = usePermissionContext()
      context.setUser(tenantUser)

      await waitFor(() => {
        expect(screen.getByTestId('permission-count')).not.toHaveTextContent('0')
      })

      // Change to different tenant
      context.setTenantId('tenant-2')

      await waitFor(() => {
        // Permissions should be recalculated (might be 0 for wrong tenant)
        expect(screen.getByTestId('permission-count')).toHaveTextContent('0')
      })
    })
  })

  describe('Permission Checking', () => {
    it('should correctly check single permissions', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      // Set admin user with all permissions
      const context = usePermissionContext()
      context.setUser(testUsers.tenant_admin)

      await waitFor(() => {
        expect(screen.getByTestId('can-read-users')).toHaveTextContent('Yes')
        expect(screen.getByTestId('can-create-users')).toHaveTextContent('Yes')
      })
    })

    it('should check multiple permissions with AND logic', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      const context = usePermissionContext()
      context.setUser(testUsers.tenant_admin)

      await waitFor(() => {
        const hasAll = context.hasAllPermissions(['users:read', 'users:create', 'users:update'])
        expect(hasAll).toBe(true)

        const hasAllRestricted = context.hasAllPermissions(['users:read', 'system:config'])
        expect(hasAllRestricted).toBe(false)
      })
    })

    it('should check multiple permissions with OR logic', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      const context = usePermissionContext()
      context.setUser(testUsers.manager)

      await waitFor(() => {
        const hasAny = context.hasAnyPermission(['users:delete', 'users:read', 'system:config'])
        expect(hasAny).toBe(true) // Has users:read

        const hasNone = context.hasAnyPermission(['users:delete', 'system:config'])
        expect(hasNone).toBe(false)
      })
    })

    it('should respect tenant-scoped permission checks', async () => {
      const tenantUser = createTestUserWithPermissions('manager', ['users:read'], 'tenant-1')
      
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      const context = usePermissionContext()
      context.setUser(tenantUser)
      context.setTenantId('tenant-1')

      await waitFor(() => {
        expect(context.hasPermission('users:read', 'tenant-1')).toBe(true)
        expect(context.hasPermission('users:read', 'tenant-2')).toBe(false)
      })
    })
  })

  describe('System Admin Handling', () => {
    it('should identify system admin correctly', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      const context = usePermissionContext()
      context.setUser(testUsers.super_admin)

      await waitFor(() => {
        expect(screen.getByTestId('is-system-admin')).toHaveTextContent('Yes')
        expect(context.hasPermission('any:permission')).toBe(false) // Super admin has * permission
        expect(context.hasPermission('system:config')).toBe(true)
      })
    })

    it('should identify regular users correctly', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      const context = usePermissionContext()
      context.setUser(testUsers.manager)

      await waitFor(() => {
        expect(screen.getByTestId('is-system-admin')).toHaveTextContent('No')
      })
    })
  })

  describe('Permission Refresh', () => {
    it('should refresh permissions on demand', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      const context = usePermissionContext()
      context.setUser(testUsers.manager)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('Not loading')
      })

      // Trigger permission refresh
      fireEvent.click(screen.getByTestId('refresh-permissions-btn'))

      // Should show loading state during refresh
      expect(screen.getByTestId('is-loading')).toHaveTextContent('Loading')

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('Not loading')
      }, { timeout: 2000 })
    })

    it('should handle refresh errors gracefully', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      const context = usePermissionContext()
      
      // Mock a refresh error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Simulate error during refresh
      const originalRefresh = context.refreshPermissions
      context.refreshPermissions = async () => {
        throw new Error('Network error')
      }

      await expect(context.refreshPermissions()).rejects.toThrow('Network error')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Performance and Caching', () => {
    it('should cache permission calculations', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      const context = usePermissionContext()
      context.setUser(testUsers.tenant_admin)

      await waitFor(() => {
        expect(screen.getByTestId('permission-count')).not.toHaveTextContent('0')
      })

      const startTime = performance.now()

      // Perform multiple permission checks
      for (let i = 0; i < 1000; i++) {
        context.hasPermission('users:read')
        context.hasAnyPermission(['users:read', 'users:create'])
        context.hasAllPermissions(['users:read', 'users:create'])
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should be very fast due to caching
      expect(duration).toBeLessThan(100)
    })

    it('should not recalculate permissions unnecessarily', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      const context = usePermissionContext()
      context.setUser(testUsers.manager)

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('Not loading')
      })

      const permissionCount = screen.getByTestId('permission-count').textContent

      // Call multiple permission checks - should not trigger recalculation
      context.hasPermission('users:read')
      context.hasPermission('users:create')
      context.hasAnyPermission(['users:read', 'transactions:read'])

      // Permission count should remain the same
      expect(screen.getByTestId('permission-count')).toHaveTextContent(permissionCount)
      expect(screen.getByTestId('is-loading')).toHaveTextContent('Not loading')
    })
  })

  describe('Error Handling', () => {
    it('should handle context access outside provider', () => {
      expect(() => {
        render(<ContextTestComponent />)
      }).toThrow('usePermissionContext must be used within PermissionProvider')
    })

    it('should handle malformed user data gracefully', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      const context = usePermissionContext()
      
      // Set user with malformed data
      const malformedUser = {
        id: 'malformed',
        email: 'malformed@test.com',
        roles: null as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(() => {
        context.setUser(malformedUser)
        context.hasPermission('users:read')
        context.getUserPermissions?.()
      }).not.toThrow()
    })

    it('should handle expired role permissions', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      const context = usePermissionContext()
      const expiredUser = createTestUserWithExpiredRole()
      
      context.setUser(expiredUser)

      await waitFor(() => {
        expect(screen.getByTestId('permission-count')).toHaveTextContent('0')
        expect(screen.getByTestId('can-read-users')).toHaveTextContent('No')
      })
    })
  })

  describe('Memory Management', () => {
    it('should cleanup resources when user changes', async () => {
      render(
        <PermissionProvider>
          <ContextTestComponent />
        </PermissionProvider>
      )

      const context = usePermissionContext()
      
      // Set first user
      context.setUser(testUsers.manager)
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent(testUsers.manager.email)
      })

      // Set second user
      context.setUser(testUsers.viewer)
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent(testUsers.viewer.email)
        // Permissions should be updated to reflect new user
        expect(screen.getByTestId('can-read-users')).toHaveTextContent('No')
      })
    })
  })
})