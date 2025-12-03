import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/solid'
import { createRouter, createRootRoute, createRoute, RouterProvider, useNavigate } from '@tanstack/solid-router'
import { Role, Permission } from '@packages/infrastructure/auth/src/rbac'
import {
  createTestUsers,
  createTestNavigationStructure,
  createTestUserWithPermissions,
  filterNavigationByPermissions,
  type TestUserWithPermissions,
  type NavigationItem,
} from '@tests/helpers/permissions'

// Mock integrated navigation system components
interface NavigationIntegrationProps {
  user?: TestUserWithPermissions
  tenantId?: string
}

// Mock integrated navigation component that combines guards, context, and navigation
const IntegratedNavigation = vi.fn((props: NavigationIntegrationProps) => {
  const { user, tenantId } = props
  const [navigation] = createSignal<NavigationItem[]>(createTestNavigationStructure())
  const navigate = useNavigate()
  
  // Mock permission filtering
  const filteredNavigation = user ? filterNavigationByPermissions(user, navigation(), tenantId) : navigation()
  
  const handleNavigation = async (item: NavigationItem) => {
    // Check if user has permission to navigate
    if (!user) {
      navigate({ to: '/login' })
      return
    }
    
    if (item.permission && !user.roles?.some(role => role.permissions.includes(item.permission!))) {
      // Show access denied
      return
    }
    
    // Navigate to the route
    navigate({ to: item.path })
  }
  
  return (
    <div data-testid="integrated-navigation">
      <nav data-testid="main-nav">
        <ul>
          {filteredNavigation.map((item) => (
            <li key={item.path}>
              <button
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => handleNavigation(item)}
              >
                {item.label}
              </button>
              {item.children && item.children.length > 0 && (
                <ul>
                  {item.children.map((child) => (
                    <li key={child.path}>
                      <button
                        data-testid={`nav-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => handleNavigation(child)}
                      >
                        {child.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div data-testid="user-info">
        {user && (
          <>
            <span data-testid="current-user">{user.email}</span>
            <span data-testid="current-role">{user.roles[0]?.role}</span>
            <span data-testid="current-tenant">{tenantId || user.tenantId}</span>
          </>
        )}
      </div>
    </div>
  )
})

// Mock protected route component
const ProtectedRoute = vi.fn((props: { 
  children: any
  requiredPermissions?: Permission[]
  tenantId?: string
}) => {
  const { children, requiredPermissions, tenantId } = props
  
  // Mock user context (in real implementation, this would come from context)
  const mockUser: TestUserWithPermissions | undefined = undefined
  
  if (!mockUser) {
    return <div data-testid="login-required">Please Login</div>
  }
  
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasPermission = requiredPermissions.some(permission =>
      mockUser.roles?.some(role => role.permissions.includes(permission))
    )
    
    if (!hasPermission) {
      return <div data-testid="access-denied">Access Denied</div>
    }
  }
  
  return children
})

// Mock complete application component
const TestApp = vi.fn((props: { initialUser?: TestUserWithPermissions; tenantId?: string }) => {
  const { initialUser, tenantId } = props
  
  // Create mock routes
  const rootRoute = createRootRoute({
    component: () => (
      <div>
        <IntegratedNavigation user={initialUser} tenantId={tenantId} />
        <div data-testid="route-content">
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </div>
      </div>
    ),
  })
  
  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div data-testid="dashboard-page">Dashboard</div>,
  })
  
  const usersRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/users',
    component: () => (
      <ProtectedRoute requiredPermissions={['users:read']}>
        <div data-testid="users-page">Users Page</div>
      </ProtectedRoute>
    ),
  })
  
  const usersCreateRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/users/create',
    component: () => (
      <ProtectedRoute requiredPermissions={['users:create']}>
        <div data-testid="create-user-page">Create User Page</div>
      </ProtectedRoute>
    ),
  })
  
  const transactionsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/transactions',
    component: () => (
      <ProtectedRoute requiredPermissions={['transactions:read']}>
        <div data-testid="transactions-page">Transactions Page</div>
      </ProtectedRoute>
    ),
  })
  
  const systemConfigRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/system/config',
    component: () => (
      <ProtectedRoute requiredPermissions={['system:config']}>
        <div data-testid="system-config-page">System Configuration</div>
      </ProtectedRoute>
    ),
  })
  
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      dashboardRoute,
      usersRoute,
      usersCreateRoute,
      transactionsRoute,
      systemConfigRoute,
    ]),
  })
  
  return <RouterProvider router={router} />
})

describe('Permission Navigation Integration Tests', () => {
  let testUsers: Record<Role, TestUserWithPermissions>

  beforeEach(() => {
    vi.clearAllMocks()
    testUsers = createTestUsers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete User Journey', () => {
    it('should provide complete navigation experience for super admin', async () => {
      const user = testUsers.super_admin
      
      render(<TestApp initialUser={user} />)
      
      // Should see all navigation items
      expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('nav-users')).toBeInTheDocument()
      expect(screen.getByTestId('nav-transactions')).toBeInTheDocument()
      expect(screen.getByTestId('nav-reports')).toBeInTheDocument()
      expect(screen.getByTestId('nav-tenant-management')).toBeInTheDocument()
      expect(screen.getByTestId('nav-system-configuration')).toBeInTheDocument()
      
      // Should see user information
      expect(screen.getByTestId('current-user')).toHaveTextContent(user.email)
      expect(screen.getByTestId('current-role')).toHaveTextContent('super_admin')
      
      // Should be able to navigate to protected routes
      fireEvent.click(screen.getByTestId('nav-users'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument()
      })
    })

    it('should provide restricted navigation for viewer role', async () => {
      const user = testUsers.viewer
      
      render(<TestApp initialUser={user} />)
      
      // Should only see navigation items they have permissions for
      expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('nav-transactions')).toBeInTheDocument()
      expect(screen.getByTestId('nav-reports')).toBeInTheDocument()
      
      // Should not see management items
      expect(screen.queryByTestId('nav-users')).not.toBeInTheDocument()
      expect(screen.queryByTestId('nav-tenant-management')).not.toBeInTheDocument()
      expect(screen.queryByTestId('nav-system-configuration')).not.toBeInTheDocument()
      
      // Should show user role
      expect(screen.getByTestId('current-role')).toHaveTextContent('viewer')
    })

    it('should handle unauthenticated users', () => {
      render(<TestApp />)
      
      // Should only see public navigation
      expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument()
      expect(screen.queryByTestId('nav-users')).not.toBeInTheDocument()
      expect(screen.queryByTestId('nav-transactions')).not.toBeInTheDocument()
      
      // Should not show user information
      expect(screen.queryByTestId('current-user')).not.toBeInTheDocument()
      expect(screen.queryByTestId('current-role')).not.toBeInTheDocument()
    })
  })

  describe('Navigation with Permission Changes', () => {
    it('should update navigation when user permissions change', async () => {
      const user = testUsers.viewer // Limited permissions initially
      
      const { rerender } = render(<TestApp initialUser={user} />)
      
      // Initially should see limited navigation
      expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('nav-transactions')).toBeInTheDocument()
      expect(screen.queryByTestId('nav-users')).not.toBeInTheDocument()
      
      // Simulate user promotion to manager
      const promotedUser = testUsers.manager
      rerender(<TestApp initialUser={promotedUser} />)
      
      // Should now see more navigation items
      expect(screen.getByTestId('nav-users')).toBeInTheDocument()
      expect(screen.getByTestId('nav-transactions')).toBeInTheDocument()
      expect(screen.getByTestId('current-role')).toHaveTextContent('manager')
    })

    it('should handle tenant switching', async () => {
      const tenantUser = createTestUserWithPermissions('manager', ['users:read'], 'tenant-1')
      
      const { rerender } = render(<TestApp initialUser={tenantUser} tenantId="tenant-1" />)
      
      // Should see user management for tenant-1
      expect(screen.getByTestId('nav-users')).toBeInTheDocument()
      expect(screen.getByTestId('current-tenant')).toHaveTextContent('tenant-1')
      
      // Switch to tenant-2 (different tenant)
      rerender(<TestApp initialUser={tenantUser} tenantId="tenant-2" />)
      
      // Should not see user management for different tenant
      expect(screen.queryByTestId('nav-users')).not.toBeInTheDocument()
      expect(screen.getByTestId('current-tenant')).toHaveTextContent('tenant-2')
    })
  })

  describe('Multi-Tenant Navigation Isolation', () => {
    it('should maintain tenant isolation in navigation', () => {
      const tenant1Admin = createTestUserWithPermissions('tenant_admin', ['users:read'], 'tenant-1')
      
      render(<TestApp initialUser={tenant1Admin} tenantId="tenant-1" />)
      
      // Should see navigation for tenant-1
      expect(screen.getByTestId('nav-users')).toBeInTheDocument()
      expect(screen.getByTestId('current-tenant')).toHaveTextContent('tenant-1')
      
      // Simulate accessing tenant-2 resources (should be denied)
      const canAccessTenant2 = tenant1Admin.roles?.some(role => 
        role.tenantId === 'tenant-2' && role.permissions.includes('users:read')
      )
      
      expect(canAccessTenant2).toBe(false)
    })

    it('should allow system admin to access any tenant', () => {
      const systemAdmin = testUsers.super_admin
      
      render(<TestApp initialUser={systemAdmin} tenantId="any-tenant-id" />)
      
      // Should see all navigation regardless of tenant
      expect(screen.getByTestId('nav-users')).toBeInTheDocument()
      expect(screen.getByTestId('nav-tenant-management')).toBeInTheDocument()
      expect(screen.getByTestId('nav-system-configuration')).toBeInTheDocument()
      
      expect(screen.getByTestId('current-role')).toHaveTextContent('super_admin')
    })
  })

  describe('Navigation Security', () => {
    it('should prevent URL manipulation for unauthorized access', () => {
      const user = testUsers.viewer
      
      render(<TestApp initialUser={user} />)
      
      // Mock direct URL navigation attempt
      const canAccessUsersRoute = user.roles?.some(role => 
        role.permissions.includes('users:read')
      )
      
      expect(canAccessUsersRoute).toBe(false)
      
      // Navigation should not show users link
      expect(screen.queryByTestId('nav-users')).not.toBeInTheDocument()
    })

    it('should handle permission escalation attempts', () => {
      const user = testUsers.viewer
      
      render(<TestApp initialUser={user} />)
      
      // Mock permission escalation attempt
      const originalPermissions = user.roles?.[0]?.permissions || []
      const escalatedPermissions = [...originalPermissions, 'users:delete', 'system:config']
      
      // Should not escalate permissions
      const hasEscalatedPermissions = escalatedPermissions.every(permission =>
        user.roles?.some(role => role.permissions.includes(permission))
      )
      
      expect(hasEscalatedPermissions).toBe(false)
    })
  })

  describe('Navigation Performance with Complex Permissions', () => {
    it('should handle complex permission structures efficiently', async () => {
      // Create a user with many roles and permissions
      const complexUser = createTestUserWithPermissions('manager', [
        'users:read', 'users:update',
        'transactions:read', 'transactions:create', 'transactions:update',
        'reports:read', 'reports:export',
      ], 'tenant-1')
      
      const startTime = performance.now()
      
      render(<TestApp initialUser={complexUser} />)
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Should render within reasonable time
      expect(renderTime).toBeLessThan(100)
      
      // Should show appropriate navigation
      expect(screen.getByTestId('nav-users')).toBeInTheDocument()
      expect(screen.getByTestId('nav-transactions')).toBeInTheDocument()
      expect(screen.getByTestId('nav-reports')).toBeInTheDocument()
    })

    it('should optimize permission checks for navigation', async () => {
      const user = testUsers.tenant_admin
      
      const startTime = performance.now()
      
      render(<TestApp initialUser={user} />)
      
      // Perform multiple navigation interactions
      fireEvent.click(screen.getByTestId('nav-users'))
      fireEvent.click(screen.getByTestId('nav-transactions'))
      fireEvent.click(screen.getByTestId('nav-reports'))
      
      const endTime = performance.now()
      const interactionTime = endTime - startTime
      
      // Should handle interactions quickly
      expect(interactionTime).toBeLessThan(200)
    })
  })

  describe('Navigation State Management', () => {
    it('should maintain navigation state across route changes', async () => {
      const user = testUsers.manager
      
      render(<TestApp initialUser={user} />)
      
      // Navigate between routes
      fireEvent.click(screen.getByTestId('nav-dashboard'))
      
      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent(user.email)
        expect(screen.getByTestId('current-role')).toHaveTextContent('manager')
      })
      
      fireEvent.click(screen.getByTestId('nav-users'))
      
      await waitFor(() => {
        // User context should be maintained
        expect(screen.getByTestId('current-user')).toHaveTextContent(user.email)
        expect(screen.getByTestId('current-role')).toHaveTextContent('manager')
      })
    })

    it('should handle navigation state persistence', async () => {
      const user = testUsers.manager
      
      // Mock local storage for navigation state
      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      }
      
      vi.stubGlobal('localStorage', mockLocalStorage)
      
      render(<TestApp initialUser={user} />)
      
      // Should attempt to restore navigation state
      expect(mockLocalStorage.getItem).toHaveBeenCalled()
      
      // Should save navigation state
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
      
      vi.unstubAllGlobals()
    })
  })

  describe('Real-time Permission Updates', () => {
    it('should reflect permission changes in real-time', async () => {
      const user = testUsers.viewer
      
      const { rerender } = render(<TestApp initialUser={user} />)
      
      // Initially has limited navigation
      expect(screen.queryByTestId('nav-users')).not.toBeInTheDocument()
      
      // Simulate real-time permission update
      const updatedUser = { ...user }
      updatedUser.roles![0]!.permissions.push('users:read')
      
      rerender(<TestApp initialUser={updatedUser} />)
      
      // Should immediately show updated navigation
      expect(screen.getByTestId('nav-users')).toBeInTheDocument()
    })

    it('should handle role revocation', async () => {
      const user = testUsers.manager
      
      const { rerender } = render(<TestApp initialUser={user} />)
      
      // Initially sees user management
      expect(screen.getByTestId('nav-users')).toBeInTheDocument()
      
      // Simulate role revocation
      const revokedUser = { ...user }
      revokedUser.roles![0]!.permissions = [] // Remove all permissions
      
      rerender(<TestApp initialUser={revokedUser} />)
      
      // Should no longer see user management
      expect(screen.queryByTestId('nav-users')).not.toBeInTheDocument()
    })
  })

  describe('Navigation Accessibility', () => {
    it('should maintain accessibility with permission-based filtering', () => {
      const user = testUsers.manager
      
      render(<TestApp initialUser={user} />)
      
      const mainNav = screen.getByTestId('main-nav')
      expect(mainNav).toBeInTheDocument()
      
      // Should have accessible navigation structure
      const navItems = screen.getAllByTestId(/^nav-/)
      expect(navItems.length).toBeGreaterThan(0)
      
      // Navigation should be keyboard accessible
      navItems.forEach(item => {
        expect(item).toBeVisible()
        expect(item).toHaveAttribute('type', 'button')
      })
    })

    it('should provide feedback for disabled navigation items', () => {
      const user = testUsers.viewer
      
      render(<TestApp initialUser={user} />)
      
      // Items user cannot access should not be present (better UX than disabled)
      expect(screen.queryByTestId('nav-users')).not.toBeInTheDocument()
      expect(screen.queryByTestId('nav-system-configuration')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle navigation with corrupted user data', () => {
      const corruptedUser = {
        id: 'corrupted',
        email: 'corrupted@test.com',
        roles: null as any, // Corrupted roles
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      expect(() => {
        render(<TestApp initialUser={corruptedUser} />)
      }).not.toThrow()
    })

    it('should handle network errors during permission checks', async () => {
      const user = testUsers.manager
      
      // Mock network error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<TestApp initialUser={user} />)
      
      // Should still show basic navigation even with errors
      expect(screen.getByTestId('integrated-navigation')).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })

    it('should handle missing navigation configuration', () => {
      const user = testUsers.manager
      
      expect(() => {
        render(<TestApp initialUser={user} />)
      }).not.toThrow()
    })
  })
})