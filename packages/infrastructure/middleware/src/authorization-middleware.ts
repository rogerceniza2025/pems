/**
 * Authorization Middleware (RBAC)
 *
 * Implements Role-Based Access Control using the existing permission system
 * Supports tenant-aware authorization with multiple roles and permissions
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Context, Next } from 'hono'
import { getAuthContext, getCurrentUser } from './auth-middleware'
import { getTenantContext } from './tenant-context'

// Custom HTTPException implementation since hono/http-exceptions is not available
class HTTPException extends Error {
  constructor(
    public status: number,
    public options: { message: string; code?: string; cause?: any },
  ) {
    super(options.message)
    this.name = 'HTTPException'
    this.cause = options.cause
  }
}

// Permission format: "resource:action"
// Examples: "users:read", "users:create", "tenants:manage", "system:config"

export interface Permission {
  resource: string
  action: string
  scope?: 'tenant' | 'system' // Default: tenant
}

export interface Role {
  id: string
  name: string
  permissions: string[]
  isSystemRole?: boolean
}

export interface AuthorizationContext {
  user: {
    id: string
    email: string
    tenantId?: string
    isSystemAdmin: boolean
  }
  tenant: {
    id: string
    name?: string
  }
  roles: Role[]
  permissions: string[]
}

export interface AuthorizationOptions {
  /**
   * Required permissions
   */
  permissions?: string[]

  /**
   * Require all permissions (AND) or any permission (OR)
   * @default 'any'
   */
  permissionMode?: 'all' | 'any'

  /**
   * Required roles
   */
  roles?: string[]

  /**
   * Require system admin access
   * @default false
   */
  requireSystemAdmin?: boolean

  /**
   * Custom permission checker function
   */
  customChecker?: (context: AuthorizationContext) => boolean | Promise<boolean>

  /**
   * Skip authorization for specific paths
   */
  skipPaths?: string[]

  /**
   * Custom error message
   */
  errorMessage?: string
}

/**
 * Parse permission string into Permission object
 */
function parsePermission(permission: string): Permission {
  const [resource, action, scope] = permission.split(':')

  return {
    resource: resource ?? '',
    action: action ?? '',
    scope: (scope as 'tenant' | 'system') ?? 'tenant',
  }
}

/**
 * Check if user has specific permission
 */
function hasPermission(
  userPermissions: string[],
  requiredPermission: string,
): boolean {
  // Direct permission match
  if (userPermissions.includes(requiredPermission)) {
    return true
  }

  // Wildcard permissions
  const parsedRequired = parsePermission(requiredPermission)

  return userPermissions.some((permission) => {
    const parsedUser = parsePermission(permission)

    // Check resource match (or wildcard)
    if (
      parsedUser.resource !== '*' &&
      parsedUser.resource !== parsedRequired.resource
    ) {
      return false
    }

    // Check action match (or wildcard)
    if (
      parsedUser.action !== '*' &&
      parsedUser.action !== parsedRequired.action
    ) {
      return false
    }

    // Check scope match (system permissions work everywhere)
    if (parsedUser.scope === 'system' || parsedRequired.scope === 'system') {
      return true
    }

    // Tenant scope must match
    return parsedUser.scope === parsedRequired.scope
  })
}

/**
 * Check if user has any of the specified permissions
 */
function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.some((permission) =>
    hasPermission(userPermissions, permission),
  )
}

/**
 * Check if user has all of the specified permissions
 */
function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.every((permission) =>
    hasPermission(userPermissions, permission),
  )
}

/**
 * Check if user has any of the specified roles
 */
function hasAnyRole(userRoles: Role[], requiredRoles: string[]): boolean {
  return requiredRoles.some((requiredRole) =>
    userRoles.some((userRole) => userRole.name === requiredRole),
  )
}

/**
 * Get user permissions and roles from database
 * This is a mock implementation that should be replaced with actual database queries
 */
async function getUserAuthorizationData(
  _userId: string,
  _tenantId: string,
): Promise<{ permissions: string[]; roles: Role[] }> {
  try {
    // TODO: Replace with actual database queries
    // This should fetch user roles and permissions from the database

    // Mock data for demonstration
    const mockRoles: Role[] = [
      {
        id: 'role-1',
        name: 'admin',
        permissions: ['users:*', 'tenants:read', 'system:config'],
        isSystemRole: false,
      },
    ]

    const mockPermissions = [
      'users:read',
      'users:create',
      'users:update',
      'tenants:read',
    ]

    return {
      permissions: mockPermissions,
      roles: mockRoles,
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching user authorization data:', error)
    return {
      permissions: [],
      roles: [],
    }
  }
}

/**
 * Authorization middleware factory
 */
export const authorizationMiddleware = (options: AuthorizationOptions = {}) => {
  const {
    permissions = [],
    permissionMode = 'any',
    roles = [],
    requireSystemAdmin = false,
    customChecker,
    skipPaths = [],
    errorMessage = 'Insufficient permissions',
  } = options

  return async (c: Context, next: Next) => {
    try {
      // Check if current path should be skipped
      const currentPath = c.req.path
      if (skipPaths.some((path) => currentPath.startsWith(path))) {
        await next()
        return
      }

      // Get authentication context
      const authContext = getAuthContext(c)
      if (!authContext.isAuthenticated) {
        throw new HTTPException(401, {
          message: 'Authentication required for authorization',
          code: 'AUTH_REQUIRED',
        })
      }

      const user = getCurrentUser(c)
      const tenantContext = getTenantContext(c)

      // Get user authorization data
      const { permissions: userPermissions, roles: userRoles } =
        await getUserAuthorizationData(user.id, tenantContext.tenantId)

      // Create authorization context
      const authzContext: AuthorizationContext = {
        user: {
          id: user.id,
          email: user.email,
          tenantId: user.tenantId,
          isSystemAdmin: user.isSystemAdmin ?? false,
        },
        tenant: {
          id: tenantContext.tenantId,
          name: tenantContext.tenantName,
        },
        roles: userRoles,
        permissions: userPermissions,
      }

      // Set authorization context for downstream middleware
      c.set('authorization', authzContext)

      // Check system admin requirement
      if (requireSystemAdmin && !user.isSystemAdmin) {
        throw new HTTPException(403, {
          message: 'System admin access required',
          code: 'SYSTEM_ADMIN_REQUIRED',
        })
      }

      // Check role requirements
      if (roles.length > 0 && !hasAnyRole(userRoles, roles)) {
        throw new HTTPException(403, {
          message: `Required roles: ${roles.join(', ')}`,
          code: 'INSUFFICIENT_ROLES',
        })
      }

      // Check permission requirements
      if (permissions.length > 0) {
        const hasRequiredPermissions =
          permissionMode === 'all'
            ? hasAllPermissions(userPermissions, permissions)
            : hasAnyPermission(userPermissions, permissions)

        if (!hasRequiredPermissions) {
          throw new HTTPException(403, {
            message: `${errorMessage}. Required: ${permissions.join(', ')}`,
            code: 'INSUFFICIENT_PERMISSIONS',
          })
        }
      }

      // Check custom authorization logic
      if (customChecker) {
        const isAuthorized = await customChecker(authzContext)
        if (!isAuthorized) {
          throw new HTTPException(403, {
            message: errorMessage,
            code: 'CUSTOM_AUTHORIZATION_FAILED',
          })
        }
      }

      await next()
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }

      // eslint-disable-next-line no-console
      console.error('Authorization middleware error:', error)
      throw new HTTPException(500, {
        message: 'Authorization service unavailable',
        code: 'AUTHORIZATION_ERROR',
      })
    }
  }
}

/**
 * Helper functions for common authorization patterns
 */

/**
 * Require specific permission
 */
export const requirePermission = (permission: string) =>
  authorizationMiddleware({ permissions: [permission] })

/**
 * Require any of multiple permissions
 */
export const requireAnyPermission = (permissions: string[]) =>
  authorizationMiddleware({ permissions, permissionMode: 'any' })

/**
 * Require all of multiple permissions
 */
export const requireAllPermissions = (permissions: string[]) =>
  authorizationMiddleware({ permissions, permissionMode: 'all' })

/**
 * Require specific role
 */
export const requireRole = (role: string) =>
  authorizationMiddleware({ roles: [role] })

/**
 * Require any of multiple roles
 */
export const requireAnyRole = (roles: string[]) =>
  authorizationMiddleware({ roles })

/**
 * Require system admin access
 */
export const requireSystemAdmin = () =>
  authorizationMiddleware({ requireSystemAdmin: true })

/**
 * Helper function to get authorization context from request
 */
export function getAuthorizationContext(c: Context): AuthorizationContext {
  const authzContext = c.get('authorization')
  if (!authzContext) {
    throw new HTTPException(500, {
      message:
        'Authorization context not found - ensure authorizationMiddleware is applied',
      code: 'NO_AUTHORIZATION_CONTEXT',
    })
  }
  return authzContext
}

/**
 * Helper function to check if current user has specific permission
 */
export function hasPermissionInContext(
  c: Context,
  permission: string,
): boolean {
  try {
    const authzContext = getAuthorizationContext(c)
    return hasPermission(authzContext.permissions, permission)
  } catch {
    return false
  }
}

/**
 * Helper function to check if current user has specific role
 */
export function hasRoleInContext(c: Context, role: string): boolean {
  try {
    const authzContext = getAuthorizationContext(c)
    return hasAnyRole(authzContext.roles, [role])
  } catch {
    return false
  }
}
