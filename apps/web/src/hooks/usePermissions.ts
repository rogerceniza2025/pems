import { createSignal, createEffect, onCleanup } from 'solid-js'
import { useNavigate } from '@tanstack/solid-router'
import type { User } from 'better-auth/types'
import type { Permission, Role, UserRole } from '../../../../packages/infrastructure/auth/src/rbac'

/**
 * Permission checking return type
 */
export interface UsePermissionsReturn {
  hasPermission: (permission: Permission, tenantId?: string) => boolean
  hasAnyPermission: (permissions: Permission[], tenantId?: string) => boolean
  hasAllPermissions: (permissions: Permission[], tenantId?: string) => boolean
  getUserPermissions: (tenantId?: string) => Permission[]
  canAccessRoute: (routePath: string, tenantId?: string) => boolean
  isSystemAdmin: () => boolean
  userRole: () => Role | undefined
  isLoading: () => boolean
  refreshPermissions: () => Promise<void>
}

/**
 * Route permission mapping
 */
const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/users': ['users:read'],
  '/users/create': ['users:create'],
  '/users/edit': ['users:update'],
  '/users/delete': ['users:delete'],
  '/transactions': ['transactions:read'],
  '/transactions/create': ['transactions:create'],
  '/transactions/approve': ['transactions:approve'],
  '/transactions/cancel': ['transactions:cancel'],
  '/reports': ['reports:read'],
  '/reports/export': ['reports:export'],
  '/reports/audit': ['reports:audit'],
  '/tenants': ['tenants:read'],
  '/tenants/create': ['tenants:create'],
  '/tenants/update': ['tenants:update'],
  '/tenants/delete': ['tenants:delete'],
  '/system/config': ['system:config'],
  '/system/audit': ['system:audit'],
  '/system/backup': ['system:backup'],
}

/**
 * Permission cache for performance optimization
 */
const permissionCache = new Map<string, boolean>()

/**
 * usePermissions Hook
 * 
 * A custom hook that provides permission checking utilities and state management.
 * Supports caching, tenant-scoped permissions, and route-based permission checking.
 */
export const usePermissions = (user?: User & { roles?: UserRole[]; isSystemAdmin?: boolean }): UsePermissionsReturn => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = createSignal<boolean>(false)
  
  // Check if user has specific permission
  const hasPermission = (permission: Permission, targetTenantId?: string): boolean => {
    if (!user) return false

    // Check cache first
    const cacheKey = `${user.id}:${permission}:${targetTenantId || 'global'}`
    if (permissionCache.has(cacheKey)) {
      return permissionCache.get(cacheKey)!
    }

    let result = false

    // System admin bypasses all permission checks
    if (user.isSystemAdmin) {
      result = true
    } else if (user.roles && Array.isArray(user.roles)) {
      result = user.roles.some((role) => {
        // Check if role is expired
        if (role.expiresAt && role.expiresAt <= new Date()) {
          return false
        }

        // Check tenant scope
        if (targetTenantId && role.tenantId !== targetTenantId) {
          return false
        }

        // Check permission
        return role.permissions.includes(permission)
      })
    }

    // Cache the result
    permissionCache.set(cacheKey, result)
    
    return result
  }

  // Check if user has any of the specified permissions (OR logic)
  const hasAnyPermission = (permissions: Permission[], targetTenantId?: string): boolean => {
    if (!user || permissions.length === 0) return false

    return permissions.some(permission => hasPermission(permission, targetTenantId))
  }

  // Check if user has all specified permissions (AND logic)
  const hasAllPermissions = (permissions: Permission[], targetTenantId?: string): boolean => {
    if (!user || permissions.length === 0) return true

    return permissions.every(permission => hasPermission(permission, targetTenantId))
  }

  // Get all permissions for the user (optionally filtered by tenant)
  const getUserPermissions = (targetTenantId?: string): Permission[] => {
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      return []
    }

    const relevantRoles = user.roles.filter((role) => {
      // Check if role is expired
      if (role.expiresAt && role.expiresAt <= new Date()) {
        return false
      }

      // Check tenant scope
      if (targetTenantId && role.tenantId !== targetTenantId) {
        return false
      }

      return true
    })

    const allPermissions = relevantRoles.flatMap(role => role.permissions)
    return [...new Set(allPermissions)] // Remove duplicates
  }

  // Check if user can access a specific route
  const canAccessRoute = (routePath: string, targetTenantId?: string): boolean => {
    const requiredPermissions = ROUTE_PERMISSIONS[routePath]
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true // Public route
    }

    return hasAnyPermission(requiredPermissions, targetTenantId)
  }

  // Check if user is system admin
  const isSystemAdmin = (): boolean => {
    return user?.isSystemAdmin ?? false
  }

  // Get user's primary role
  const userRole = (): Role | undefined => {
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      return undefined
    }

    // Return the first role (could be enhanced to return multiple roles)
    return user.roles[0]?.role
  }

  // Refresh permissions (clear cache and re-evaluate)
  const refreshPermissions = async (): Promise<void> => {
    setIsLoading(true)
    
    try {
      // Clear cache for this user
      if (user) {
        const keysToDelete: string[] = []
        permissionCache.forEach((_, key) => {
          if (key.startsWith(`${user.id}:`)) {
            keysToDelete.push(key)
          }
        })
        keysToDelete.forEach(key => permissionCache.delete(key))
      }

      // In a real implementation, this would re-fetch user data from the API
      // For now, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error('Failed to refresh permissions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Cleanup cache when user changes or component unmounts
  createEffect(() => {
    if (!user) {
      // Clear all cache when user is undefined
      permissionCache.clear()
    }
  })

  onCleanup(() => {
    // Clear cache for this user when component unmounts
    if (user) {
      const keysToDelete: string[] = []
      permissionCache.forEach((_, key) => {
        if (key.startsWith(`${user.id}:`)) {
          keysToDelete.push(key)
        }
      })
      keysToDelete.forEach(key => permissionCache.delete(key))
    }
  })

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserPermissions,
    canAccessRoute,
    isSystemAdmin,
    userRole,
    isLoading: () => isLoading(),
    refreshPermissions,
  }
}

/**
 * Higher-order hook for easier permission checking
 */
export const createPermissionChecker = (user?: User & { roles?: UserRole[]; isSystemAdmin?: boolean }) => {
  const permissions = usePermissions(user)
  
  return {
    canReadUsers: () => permissions.hasPermission('users:read'),
    canCreateUsers: () => permissions.hasPermission('users:create'),
    canUpdateUsers: () => permissions.hasPermission('users:update'),
    canDeleteUsers: () => permissions.hasPermission('users:delete'),
    canManageRoles: () => permissions.hasPermission('users:manage_roles'),
    
    canReadTransactions: () => permissions.hasPermission('transactions:read'),
    canCreateTransactions: () => permissions.hasPermission('transactions:create'),
    canUpdateTransactions: () => permissions.hasPermission('transactions:update'),
    canDeleteTransactions: () => permissions.hasPermission('transactions:delete'),
    canApproveTransactions: () => permissions.hasPermission('transactions:approve'),
    canCancelTransactions: () => permissions.hasPermission('transactions:cancel'),
    
    canReadReports: () => permissions.hasPermission('reports:read'),
    canExportReports: () => permissions.hasPermission('reports:export'),
    canAuditReports: () => permissions.hasPermission('reports:audit'),
    
    canReadTenants: () => permissions.hasPermission('tenants:read'),
    canCreateTenants: () => permissions.hasPermission('tenants:create'),
    canUpdateTenants: () => permissions.hasPermission('tenants:update'),
    canDeleteTenants: () => permissions.hasPermission('tenants:delete'),
    
    canConfigureSystem: () => permissions.hasPermission('system:config'),
    canAuditSystem: () => permissions.hasPermission('system:audit'),
    canBackupSystem: () => permissions.hasPermission('system:backup'),
    
    isSystemAdmin: permissions.isSystemAdmin,
    isTenantAdmin: () => permissions.userRole() === 'tenant_admin',
    isManager: () => permissions.userRole() === 'manager',
    isViewer: () => permissions.userRole() === 'viewer',
  }
}