import type { User } from 'better-auth/types'
import { Role, Permission, UserRole, hasPermission } from '@packages/infrastructure/auth/src/rbac'
import { createTestUser } from './auth'

export interface NavigationItem {
  path: string
  permission?: Permission
  permissions?: Permission[] // For multiple permissions (AND/OR logic)
  requireAll?: boolean // If true, requires all permissions, otherwise any
  label: string
  icon?: string
  children?: NavigationItem[]
  systemOnly?: boolean
  tenantOnly?: boolean
}

export interface NavigationItemOptions {
  icon?: string
  children?: NavigationItem[]
  systemOnly?: boolean
  tenantOnly?: boolean
  requireAll?: boolean
}

export interface TestUserWithPermissions extends User {
  roles: UserRole[]
  tenantId?: string
  isSystemAdmin?: boolean
}

/**
 * Create a test user with specific permissions and roles
 */
export function createTestUserWithPermissions(
  role: Role,
  permissions: Permission[] = [],
  tenantId: string = 'test-tenant-id',
  overrides: Partial<TestUserWithPermissions> = {}
): TestUserWithPermissions {
  const userRole: UserRole = {
    userId: 'test-user-id',
    tenantId,
    role,
    permissions,
    assignedBy: 'system',
    assignedAt: new Date(),
    expiresAt: undefined,
  }

  return {
    id: 'test-user-id',
    email: `${role.toLowerCase()}@test.com`,
    roles: [userRole],
    tenantId,
    isSystemAdmin: role === 'super_admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * Create a navigation item with permission requirements
 */
export function createNavigationItem(
  path: string,
  permission: Permission | Permission[] | undefined,
  label: string,
  options: NavigationItemOptions = {}
): NavigationItem {
  const { icon, children, systemOnly, tenantOnly, requireAll } = options

  return {
    path,
    permission: Array.isArray(permission) ? undefined : permission,
    permissions: Array.isArray(permission) ? permission : permission ? [permission] : undefined,
    requireAll,
    label,
    icon,
    children,
    systemOnly,
    tenantOnly,
  }
}

/**
 * Create a complete navigation structure for testing
 */
export function createTestNavigationStructure(): NavigationItem[] {
  return [
    // Dashboard (no permissions required)
    createNavigationItem('/', undefined, 'Dashboard'),
    
    // User Management
    createNavigationItem('/users', 'users:read', 'Users', {
      children: [
        createNavigationItem('/users', 'users:read', 'User List'),
        createNavigationItem('/users/create', 'users:create', 'Add User'),
        createNavigationItem('/users/import', 'users:manage_roles', 'Import Users'),
      ],
    }),
    
    // Transaction Management
    createNavigationItem('/transactions', 'transactions:read', 'Transactions', {
      children: [
        createNavigationItem('/transactions', 'transactions:read', 'Transaction List'),
        createNavigationItem('/transactions/create', 'transactions:create', 'New Transaction'),
        createNavigationItem('/transactions/approve', 'transactions:approve', 'Approve Transactions'),
        createNavigationItem('/transactions/cancel', 'transactions:cancel', 'Cancel Transactions'),
      ],
    }),
    
    // Reports
    createNavigationItem('/reports', 'reports:read', 'Reports', {
      children: [
        createNavigationItem('/reports/view', 'reports:read', 'View Reports'),
        createNavigationItem('/reports/export', 'reports:export', 'Export Reports'),
        createNavigationItem('/reports/audit', 'reports:audit', 'Audit Reports'),
      ],
    }),
    
    // Tenant Management (system only)
    createNavigationItem('/tenants', 'tenants:read', 'Tenant Management', {
      systemOnly: true,
      children: [
        createNavigationItem('/tenants', 'tenants:read', 'Tenant List'),
        createNavigationItem('/tenants/create', 'tenants:create', 'Create Tenant'),
        createNavigationItem('/tenants/update', 'tenants:update', 'Update Tenant'),
        createNavigationItem('/tenants/delete', 'tenants:delete', 'Delete Tenant'),
      ],
    }),
    
    // System Configuration (system only)
    createNavigationItem('/system/config', 'system:config', 'System Configuration', {
      systemOnly: true,
    }),
    
    // System Audit (system only)
    createNavigationItem('/system/audit', 'system:audit', 'System Audit', {
      systemOnly: true,
    }),
  ]
}

/**
 * Create test users for each role with appropriate permissions
 */
export function createTestUsers(): Record<Role, TestUserWithPermissions> {
  return {
    super_admin: createTestUserWithPermissions('super_admin', ['*'], 'system-tenant', {
      isSystemAdmin: true,
    }),
    
    tenant_admin: createTestUserWithPermissions('tenant_admin', [
      'users:create',
      'users:read',
      'users:update',
      'users:delete',
      'users:manage_roles',
      'tenants:read',
      'transactions:create',
      'transactions:read',
      'transactions:update',
      'transactions:delete',
      'transactions:approve',
      'transactions:cancel',
      'reports:read',
      'reports:export',
      'reports:audit',
    ]),
    
    manager: createTestUserWithPermissions('manager', [
      'users:read',
      'users:update',
      'transactions:create',
      'transactions:read',
      'transactions:update',
      'transactions:approve',
      'transactions:cancel',
      'reports:read',
      'reports:export',
    ]),
    
    supervisor: createTestUserWithPermissions('supervisor', [
      'users:read',
      'transactions:create',
      'transactions:read',
      'transactions:update',
      'transactions:approve',
      'reports:read',
      'reports:export',
    ]),
    
    cashier: createTestUserWithPermissions('cashier', [
      'transactions:create',
      'transactions:read',
      'transactions:update',
      'reports:read',
    ]),
    
    clerk: createTestUserWithPermissions('clerk', [
      'transactions:read',
      'reports:read',
    ]),
    
    auditor: createTestUserWithPermissions('auditor', [
      'transactions:read',
      'reports:read',
      'reports:audit',
      'reports:export',
    ]),
    
    viewer: createTestUserWithPermissions('viewer', [
      'transactions:read',
      'reports:read',
    ]),
  }
}

/**
 * Filter navigation items based on user permissions
 */
export function filterNavigationByPermissions(
  user: TestUserWithPermissions,
  items: NavigationItem[],
  tenantId?: string
): NavigationItem[] {
  return items.filter(item => {
    // Check system-only items
    if (item.systemOnly && !user.isSystemAdmin) {
      return false
    }

    // Check tenant-only items
    if (item.tenantOnly && (!user.tenantId || (tenantId && user.tenantId !== tenantId))) {
      return false
    }

    // Check permissions
    if (item.permission) {
      return hasPermission(user, item.permission, tenantId || user.tenantId)
    }

    if (item.permissions && item.permissions.length > 0) {
      if (item.requireAll) {
        return item.permissions.every(permission => 
          hasPermission(user, permission, tenantId || user.tenantId)
        )
      } else {
        return item.permissions.some(permission => 
          hasPermission(user, permission, tenantId || user.tenantId)
        )
      }
    }

    // Recursively filter children
    if (item.children) {
      const filteredChildren = filterNavigationByPermissions(user, item.children, tenantId)
      if (filteredChildren.length === 0) {
        return false // Hide parent if no children are visible
      }
      item.children = filteredChildren
    }

    return true
  })
}

/**
 * Test helper to verify navigation filtering
 */
export function expectNavigationToBeFiltered(
  user: TestUserWithPermissions,
  items: NavigationItem[],
  expectedVisiblePaths: string[],
  tenantId?: string
): void {
  const filteredItems = filterNavigationByPermissions(user, items, tenantId)
  const visiblePaths = extractPathsFromNavigation(filteredItems)
  
  expect(visiblePaths.sort()).toEqual(expectedVisiblePaths.sort())
}

/**
 * Extract all paths from navigation structure (including nested children)
 */
export function extractPathsFromNavigation(items: NavigationItem[]): string[] {
  const paths: string[] = []
  
  for (const item of items) {
    paths.push(item.path)
    if (item.children) {
      paths.push(...extractPathsFromNavigation(item.children))
    }
  }
  
  return paths
}

/**
 * Create test scenarios for different permission combinations
 */
export function createPermissionTestScenarios(): Array<{
  name: string
  user: TestUserWithPermissions
  expectedPaths: string[]
  deniedPaths: string[]
}> {
  const users = createTestUsers()
  const allNavigation = createTestNavigationStructure()

  return [
    {
      name: 'Super Admin',
      user: users.super_admin,
      expectedPaths: extractPathsFromNavigation(allNavigation), // Should see everything
      deniedPaths: [],
    },
    {
      name: 'Tenant Admin',
      user: users.tenant_admin,
      expectedPaths: [
        '/',
        '/users',
        '/users/create',
        '/users/import',
        '/transactions',
        '/transactions/create',
        '/transactions/approve',
        '/transactions/cancel',
        '/reports',
        '/reports/export',
        '/reports/audit',
        '/tenants', // Can read tenants
      ],
      deniedPaths: ['/tenants/create', '/tenants/update', '/tenants/delete', '/system/config', '/system/audit'],
    },
    {
      name: 'Manager',
      user: users.manager,
      expectedPaths: [
        '/',
        '/users',
        '/transactions',
        '/transactions/create',
        '/transactions/approve',
        '/transactions/cancel',
        '/reports',
        '/reports/export',
      ],
      deniedPaths: [
        '/users/create',
        '/users/import',
        '/tenants',
        '/system/config',
        '/system/audit',
        '/reports/audit',
      ],
    },
    {
      name: 'Viewer',
      user: users.viewer,
      expectedPaths: [
        '/',
        '/transactions',
        '/reports',
      ],
      deniedPaths: [
        '/users',
        '/users/create',
        '/users/import',
        '/transactions/create',
        '/transactions/approve',
        '/transactions/cancel',
        '/reports/export',
        '/reports/audit',
        '/tenants',
        '/system/config',
        '/system/audit',
      ],
    },
  ]
}

/**
 * Mock permission cache for testing performance scenarios
 */
export function createMockPermissionCache(): Map<string, boolean> {
  return new Map([
    ['user-1:users:read:tenant-1', true],
    ['user-1:users:create:tenant-1', false],
    ['user-2:transactions:read:tenant-1', true],
    ['user-2:transactions:approve:tenant-1', false],
    ['system-admin:system:config:system-tenant', true],
    ['system-admin:tenants:create:system-tenant', true],
  ])
}

/**
 * Create a user with expired role for testing expiration scenarios
 */
export function createTestUserWithExpiredRole(): TestUserWithPermissions {
  const expiredRole: UserRole = {
    userId: 'expired-user-id',
    tenantId: 'test-tenant-id',
    role: 'manager',
    permissions: ['users:read', 'transactions:create'],
    assignedBy: 'admin',
    assignedAt: new Date('2023-01-01'),
    expiresAt: new Date('2023-12-31'), // Expired
  }

  return {
    id: 'expired-user-id',
    email: 'expired@test.com',
    roles: [expiredRole],
    tenantId: 'test-tenant-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}