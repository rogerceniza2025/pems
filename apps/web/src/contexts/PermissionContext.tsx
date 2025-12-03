import { createContext, createSignal, useContext, ParentComponent, onCleanup } from 'solid-js'
import type { User } from 'better-auth/types'
import type { Permission, Role, UserRole } from '../../../../packages/infrastructure/auth/src/rbac'

/**
 * Permission Context Type
 */
export interface PermissionContextType {
  // User state
  user: User & { roles?: UserRole[]; isSystemAdmin?: boolean } | undefined
  tenantId: string | undefined
  
  // Permissions state
  permissions: Permission[]
  
  // Permission checking methods
  hasPermission: (permission: Permission, targetTenantId?: string) => boolean
  hasAnyPermission: (permissions: Permission[], targetTenantId?: string) => boolean
  hasAllPermissions: (permissions: Permission[], targetTenantId?: string) => boolean
  getUserPermissions: (targetTenantId?: string) => Permission[]
  canAccessRoute: (routePath: string, targetTenantId?: string) => boolean
  
  // User info methods
  isSystemAdmin: () => boolean
  userRole: () => Role | undefined
  
  // State management
  setUser: (user: User & { roles?: UserRole[]; isSystemAdmin?: boolean } | undefined) => void
  setTenantId: (tenantId: string | undefined) => void
  
  // Loading state
  isLoading: () => boolean
  
  // Permission refresh
  refreshPermissions: () => Promise<void>
}

/**
 * Default context value
 */
const defaultContextValue: PermissionContextType = {
  user: undefined,
  tenantId: undefined,
  permissions: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  getUserPermissions: () => [],
  canAccessRoute: () => false,
  isSystemAdmin: () => false,
  userRole: () => undefined,
  setUser: () => {},
  setTenantId: () => {},
  isLoading: () => false,
  refreshPermissions: async () => {},
}

/**
 * Permission Context
 */
export const PermissionContext = createContext<PermissionContextType>(defaultContextValue)

/**
 * Permission Provider Props
 */
interface PermissionProviderProps {
  initialUser?: User & { roles?: UserRole[]; isSystemAdmin?: boolean }
  initialTenantId?: string
  children: any
}

/**
 * Route permission mapping
 */
const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/users': ['users:read'],
  '/users/create': ['users:create'],
  '/transactions': ['transactions:read'],
  '/transactions/create': ['transactions:create'],
  '/reports': ['reports:read'],
  '/system/config': ['system:config'],
  '/tenants': ['tenants:read'],
}

/**
 * Permission Cache
 */
const permissionCache = new Map<string, boolean>()

/**
 * Permission Provider Component
 * 
 * Provides global permission state and permission checking utilities to all child components.
 */
export const PermissionProvider: ParentComponent<PermissionProviderProps> = (props) => {
  const { initialUser, initialTenantId, children } = props
  
  // State
  const [user, setUser] = createSignal<User & { roles?: UserRole[]; isSystemAdmin?: boolean } | undefined>(initialUser)
  const [tenantId, setTenantId] = createSignal<string | undefined>(initialTenantId)
  const [permissions, setPermissions] = createSignal<Permission[]>([])
  const [isLoading, setIsLoading] = createSignal<boolean>(false)

  // Calculate permissions from user roles
  const calculatePermissions = (currentUser: any, currentTenantId: string | undefined): Permission[] => {
    if (!currentUser || !currentUser.roles || !Array.isArray(currentUser.roles)) {
      return []
    }

    const relevantRoles = currentUser.roles.filter((role: UserRole) => {
      // Check if role is expired
      if (role.expiresAt && role.expiresAt <= new Date()) {
        return false
      }

      // Check tenant scope
      if (currentTenantId && role.tenantId !== currentTenantId) {
        return false
      }

      return true
    })

    const allPermissions = relevantRoles.flatMap((role: UserRole) => role.permissions)
    return [...new Set(allPermissions)] // Remove duplicates
  }

  // Permission checking methods
  const hasPermission = (permission: Permission, targetTenantId: string | undefined): boolean => {
    const currentUser = user()
    if (!currentUser) return false

    // Check cache first
    const cacheKey = `${currentUser.id}:${permission}:${targetTenantId || 'global'}`
    if (permissionCache.has(cacheKey)) {
      return permissionCache.get(cacheKey)!
    }

    let result = false

    // System admin bypasses all permission checks
    if (currentUser.isSystemAdmin) {
      result = true
    } else {
      result = currentUser.roles?.some((role: UserRole) => {
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
      }) ?? false
    }

    // Cache the result
    permissionCache.set(cacheKey, result)
    return result
  }

  const hasAnyPermission = (permissionsToCheck: Permission[], targetTenantId: string | undefined): boolean => {
    if (permissionsToCheck.length === 0) return false
    
    return permissionsToCheck.some(permission => hasPermission(permission, targetTenantId))
  }

  const hasAllPermissions = (permissionsToCheck: Permission[], targetTenantId: string | undefined): boolean => {
    if (permissionsToCheck.length === 0) return true
    
    return permissionsToCheck.every(permission => hasPermission(permission, targetTenantId))
  }

  const getUserPermissions = (targetTenantId: string | undefined): Permission[] => {
    const currentUser = user()
    return calculatePermissions(currentUser, targetTenantId)
  }

  const canAccessRoute = (routePath: string, targetTenantId: string | undefined): boolean => {
    const requiredPermissions = ROUTE_PERMISSIONS[routePath]
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true // Public route
    }

    return hasAnyPermission(requiredPermissions, targetTenantId)
  }

  const isSystemAdmin = (): boolean => {
    return user()?.isSystemAdmin ?? false
  }

  const userRole = (): Role | undefined => {
    const currentUser = user()
    return currentUser?.roles?.[0]?.role
  }

  // Permission refresh method
  const refreshPermissions = async (): Promise<void> => {
    setIsLoading(true)
    
    try {
      // Clear cache for current user
      const currentUser = user()
      if (currentUser) {
        const keysToDelete: string[] = []
        permissionCache.forEach((_, key) => {
          if (key.startsWith(`${currentUser.id}:`)) {
            keysToDelete.push(key)
          }
        })
        keysToDelete.forEach(key => permissionCache.delete(key))
      }

      // In a real implementation, this would re-fetch user data from the API
      // For now, we'll just recalculate permissions
      const currentUser = user()
      const currentTenantId = tenantId()
      const calculatedPermissions = calculatePermissions(currentUser, currentTenantId)
      setPermissions(calculatedPermissions)

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error('Failed to refresh permissions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Update permissions when user or tenant changes
  const updatePermissions = () => {
    setIsLoading(true)
    
    // Use setTimeout to make this async and avoid blocking
    setTimeout(() => {
      const currentUser = user()
      const currentTenantId = tenantId()
      const calculatedPermissions = calculatePermissions(currentUser, currentTenantId)
      setPermissions(calculatedPermissions)
      setIsLoading(false)
    }, 0)
  }

  // Effects to update permissions when dependencies change
  createEffect(() => {
    updatePermissions()
  })

  createEffect(() => {
    updatePermissions()
  })

  // Cleanup cache when context unmounts
  onCleanup(() => {
    const currentUser = user()
    if (currentUser) {
      const keysToDelete: string[] = []
      permissionCache.forEach((_, key) => {
        if (key.startsWith(`${currentUser.id}:`)) {
          keysToDelete.push(key)
        }
      })
      keysToDelete.forEach(key => permissionCache.delete(key))
    }
  })

  // Context value
  const contextValue: PermissionContextType = {
    user: user(),
    tenantId: tenantId(),
    permissions: permissions(),
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserPermissions,
    canAccessRoute,
    isSystemAdmin,
    userRole,
    setUser: (newUser) => {
      setUser(newUser)
      // Clear cache when user changes
      if (newUser) {
        const keysToDelete: string[] = []
        permissionCache.forEach((_, key) => {
          if (key.startsWith(`${newUser.id}:`)) {
            keysToDelete.push(key)
          }
        })
        keysToDelete.forEach(key => permissionCache.delete(key))
      }
    },
    setTenantId,
    isLoading: () => isLoading(),
    refreshPermissions,
  }

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  )
}

/**
 * Hook to use the Permission Context
 */
export const usePermissionContext = (): PermissionContextType => {
  const context = useContext(PermissionContext)
  
  if (!context) {
    throw new Error('usePermissionContext must be used within a PermissionProvider')
  }
  
  return context
}

/**
 * Hook to get permission checking utilities
 */
export const usePermissions = () => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserPermissions,
    canAccessRoute,
    isSystemAdmin,
    userRole,
    isLoading,
    refreshPermissions,
  } = usePermissionContext()

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserPermissions,
    canAccessRoute,
    isSystemAdmin,
    userRole,
    isLoading,
    refreshPermissions,
  }
}

/**
 * Hook to get current user information
 */
export const useCurrentUser = () => {
  const { user, tenantId, setUser, setTenantId } = usePermissionContext()
  
  return {
    user: user(),
    tenantId: tenantId(),
    setUser,
    setTenantId,
  }
}

/**
 * Hook to get permission-based helpers
 */
export const usePermissionHelpers = () => {
  const { hasPermission, isSystemAdmin, userRole } = usePermissionContext()
  
  return {
    // User management helpers
    canReadUsers: () => hasPermission('users:read'),
    canCreateUsers: () => hasPermission('users:create'),
    canUpdateUsers: () => hasPermission('users:update'),
    canDeleteUsers: () => hasPermission('users:delete'),
    canManageRoles: () => hasPermission('users:manage_roles'),
    
    // Transaction helpers
    canReadTransactions: () => hasPermission('transactions:read'),
    canCreateTransactions: () => hasPermission('transactions:create'),
    canUpdateTransactions: () => hasPermission('transactions:update'),
    canDeleteTransactions: () => hasPermission('transactions:delete'),
    canApproveTransactions: () => hasPermission('transactions:approve'),
    canCancelTransactions: () => hasPermission('transactions:cancel'),
    
    // Report helpers
    canReadReports: () => hasPermission('reports:read'),
    canExportReports: () => hasPermission('reports:export'),
    canAuditReports: () => hasPermission('reports:audit'),
    
    // Tenant helpers
    canReadTenants: () => hasPermission('tenants:read'),
    canCreateTenants: () => hasPermission('tenants:create'),
    canUpdateTenants: () => hasPermission('tenants:update'),
    canDeleteTenants: () => hasPermission('tenants:delete'),
    
    // System helpers
    canConfigureSystem: () => hasPermission('system:config'),
    canAuditSystem: () => hasPermission('system:audit'),
    canBackupSystem: () => hasPermission('system:backup'),
    
    // Role helpers
    isSystemAdmin,
    isTenantAdmin: () => userRole() === 'tenant_admin',
    isManager: () => userRole() === 'manager',
    isSupervisor: () => userRole() === 'supervisor',
    isCashier: () => userRole() === 'cashier',
    isClerk: () => userRole() === 'clerk',
    isAuditor: () => userRole() === 'auditor',
    isViewer: () => userRole() === 'viewer',
  }
}