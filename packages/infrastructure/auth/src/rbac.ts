import type { User } from 'better-auth/types'
import { z } from 'zod'

// Role-based access control definitions
export const RoleSchema = z.enum([
  'super_admin',
  'tenant_admin',
  'manager',
  'supervisor',
  'cashier',
  'clerk',
  'auditor',
  'viewer',
])

export const PermissionSchema = z.enum([
  // User management
  'users:create',
  'users:read',
  'users:update',
  'users:delete',
  'users:manage_roles',

  // Tenant management
  'tenants:create',
  'tenants:read',
  'tenants:update',
  'tenants:delete',

  // Cashiering operations
  'transactions:create',
  'transactions:read',
  'transactions:update',
  'transactions:delete',
  'transactions:approve',
  'transactions:cancel',

  // Reports
  'reports:read',
  'reports:export',
  'reports:audit',

  // System
  'system:config',
  'system:audit',
  'system:backup',
])

export type Role = z.infer<typeof RoleSchema>
export type Permission = z.infer<typeof PermissionSchema>

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: Object.values(PermissionSchema.enum), // All permissions

  tenant_admin: [
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
  ],

  manager: [
    'users:read',
    'users:update',
    'transactions:create',
    'transactions:read',
    'transactions:update',
    'transactions:approve',
    'transactions:cancel',
    'reports:read',
    'reports:export',
  ],

  supervisor: [
    'users:read',
    'transactions:create',
    'transactions:read',
    'transactions:update',
    'transactions:approve',
    'reports:read',
    'reports:export',
  ],

  cashier: [
    'transactions:create',
    'transactions:read',
    'transactions:update',
    'reports:read',
  ],

  clerk: ['transactions:read', 'reports:read'],

  auditor: [
    'transactions:read',
    'reports:read',
    'reports:audit',
    'reports:export',
  ],

  viewer: ['transactions:read', 'reports:read'],
}

// User role assignment type
export interface UserRole {
  userId: string
  tenantId: string
  role: Role
  permissions: Permission[]
  assignedBy: string
  assignedAt: Date
  expiresAt?: Date
}

// Check if user has permission
export function hasPermission(
  user: User & { roles: UserRole[] },
  permission: Permission,
  tenantId?: string,
): boolean {
  if (!user.roles || user.roles.length === 0) {
    return false
  }

  // Check roles for specific tenant or all roles if no tenant specified
  const relevantRoles = tenantId
    ? user.roles.filter((role) => role.tenantId === tenantId)
    : user.roles

  return relevantRoles.some(
    (role) =>
      role.permissions.includes(permission) &&
      (!role.expiresAt || role.expiresAt > new Date()),
  )
}

// Check if user has any of the specified permissions
export function hasAnyPermission(
  user: User & { roles: UserRole[] },
  permissions: Permission[],
  tenantId?: string,
): boolean {
  return permissions.some((permission) =>
    hasPermission(user, permission, tenantId),
  )
}

// Check if user has all specified permissions
export function hasAllPermissions(
  user: User & { roles: UserRole[] },
  permissions: Permission[],
  tenantId?: string,
): boolean {
  return permissions.every((permission) =>
    hasPermission(user, permission, tenantId),
  )
}

// Get user permissions for a specific tenant
export function getUserPermissions(
  user: User & { roles: UserRole[] },
  tenantId?: string,
): Permission[] {
  if (!user.roles || user.roles.length === 0) {
    return []
  }

  const relevantRoles = tenantId
    ? user.roles.filter((role) => role.tenantId === tenantId)
    : user.roles

  const allPermissions = relevantRoles
    .filter((role) => !role.expiresAt || role.expiresAt > new Date())
    .flatMap((role) => role.permissions)

  return [...new Set(allPermissions)] // Remove duplicates
}

// Get user roles for a specific tenant
export function getUserRoles(
  user: User & { roles: UserRole[] },
  tenantId?: string,
): UserRole[] {
  if (!user.roles || user.roles.length === 0) {
    return []
  }

  return tenantId
    ? user.roles.filter(
        (role) =>
          role.tenantId === tenantId &&
          (!role.expiresAt || role.expiresAt > new Date()),
      )
    : user.roles.filter(
        (role) => !role.expiresAt || role.expiresAt > new Date(),
      )
}

// Check if user has specific role
export function hasRole(
  user: User & { roles: UserRole[] },
  role: Role,
  tenantId?: string,
): boolean {
  const userRoles = getUserRoles(user, tenantId)
  return userRoles.some((userRole) => userRole.role === role)
}

// Check if user has any of the specified roles
export function hasAnyRole(
  user: User & { roles: UserRole[] },
  roles: Role[],
  tenantId?: string,
): boolean {
  return roles.some((role) => hasRole(user, role, tenantId))
}
