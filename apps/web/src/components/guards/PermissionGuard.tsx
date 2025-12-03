import { createSignal, createEffect, onCleanup, ParentComponent, Show } from 'solid-js'
import { useNavigate } from '@tanstack/solid-router'
import type { User } from 'better-auth/types'
import type { Permission } from '../../../../../packages/infrastructure/auth/src/rbac'
import type { UserRole } from '../../../../../packages/infrastructure/auth/src/rbac'

interface PermissionGuardProps {
  children: any
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  user?: User & { roles?: UserRole[]; isSystemAdmin?: boolean }
  tenantId?: string
  fallback?: any
  redirectTo?: string
}

/**
 * PermissionGuard Component
 * 
 * A guard component that conditionally renders its children based on user permissions.
 * Supports single permission checks, multiple permission checks (AND/OR logic), and tenant-scoped permissions.
 */
export const PermissionGuard: ParentComponent<PermissionGuardProps> = (props) => {
  const {
    children,
    permission,
    permissions = [],
    requireAll = false,
    user,
    tenantId,
    fallback,
    redirectTo,
  } = props
  
  const navigate = useNavigate()
  const [hasAccess, setHasAccess] = createSignal<boolean>(false)
  const [isLoading, setIsLoading] = createSignal<boolean>(true)

  // Check if user has required permission
  const hasPermission = (user: User & { roles?: UserRole[]; isSystemAdmin?: boolean }, permission: Permission, targetTenantId?: string): boolean => {
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      return false
    }

    // System admin bypasses all permission checks
    if (user.isSystemAdmin) {
      return true
    }

    return user.roles.some((role) => {
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

  // Check if user has any of the required permissions (OR logic)
  const hasAnyPermission = (
    user: User & { roles?: UserRole[]; isSystemAdmin?: boolean },
    requiredPermissions: Permission[],
    targetTenantId?: string
  ): boolean => {
    if (requiredPermissions.length === 0) {
      return true // No permissions required
    }

    return requiredPermissions.some(perm => hasPermission(user, perm, targetTenantId))
  }

  // Check if user has all required permissions (AND logic)
  const hasAllPermissions = (
    user: User & { roles?: UserRole[]; isSystemAdmin?: boolean },
    requiredPermissions: Permission[],
    targetTenantId?: string
  ): boolean => {
    if (requiredPermissions.length === 0) {
      return true // No permissions required
    }

    return requiredPermissions.every(perm => hasPermission(user, perm, targetTenantId))
  }

  // Evaluate access permissions
  createEffect(() => {
    if (!user) {
      setHasAccess(false)
      setIsLoading(false)
      return
    }

    let access = false

    if (permission) {
      access = hasPermission(user, permission, tenantId)
    } else if (permissions.length > 0) {
      if (requireAll) {
        access = hasAllPermissions(user, permissions, tenantId)
      } else {
        access = hasAnyPermission(user, permissions, tenantId)
      }
    } else {
      // No permissions required
      access = true
    }

    setHasAccess(access)
    setIsLoading(false)

    // Handle redirect if access is denied and redirect path is provided
    if (!access && redirectTo) {
      navigate({ to: redirectTo, replace: true })
    }
  })

  // Cleanup on unmount
  onCleanup(() => {
    setIsLoading(false)
  })

  return (
    <>
      <Show when={isLoading()}>
        <div data-testid="permission-loading" class="animate-pulse">
          <div class="h-4 w-20 bg-muted rounded" />
        </div>
      </Show>
      
      <Show when={!isLoading() && hasAccess()}>
        {children}
      </Show>
      
      <Show when={!isLoading() && !hasAccess()}>
        {fallback || (
          <div data-testid="unauthorized" class="text-center p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
            <div class="text-destructive font-medium">Access Denied</div>
            <div class="text-muted-foreground text-sm mt-1">
              You don't have permission to access this resource.
            </div>
          </div>
        )}
      </Show>
    </>
  )
}

// Higher-order component for easier usage
export const withPermissionGuard = (
  component: () => any,
  guardProps: Omit<PermissionGuardProps, 'children'>
) => {
  return () => (
    <PermissionGuard {...guardProps}>
      {component()}
    </PermissionGuard>
  )
}