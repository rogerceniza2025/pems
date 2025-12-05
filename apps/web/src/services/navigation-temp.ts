// Temporary navigation service for testing purposes
// This will be replaced once the navigation-management module is fixed

import { createSignal } from 'solid-js'
import type { Permission, Role, UserRole } from '../../../../packages/infrastructure/auth/src/rbac'
import type { User } from 'better-auth/types'

/**
 * Temporary Navigation Item
 */
export interface TempNavigationItem {
  id: string
  label: string
  path: string
  icon?: string
  description?: string
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  order: number
  visible: boolean
  disabled: boolean
  external?: boolean
  target?: '_self' | '_blank'
  children?: TempNavigationItem[]
}

/**
 * Default navigation items
 */
export const defaultNavigationItems: TempNavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: '📊',
    order: 1,
    visible: true,
    disabled: false
  },
  {
    id: 'users',
    label: 'Users',
    path: '/users',
    icon: '👥',
    permissions: ['users:read'],
    order: 2,
    visible: true,
    disabled: false
  },
  {
    id: 'transactions',
    label: 'Transactions',
    path: '/transactions',
    icon: '💳',
    permissions: ['transactions:read'],
    order: 3,
    visible: true,
    disabled: false
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: '📈',
    permissions: ['reports:read'],
    order: 4,
    visible: true,
    disabled: false
  },
  {
    id: 'tenant-management',
    label: 'Tenant Management',
    path: '/admin/tenants',
    icon: '🏢',
    permissions: ['tenants:read'],
    order: 5,
    visible: true,
    disabled: false
  },
  {
    id: 'system',
    label: 'System',
    path: '/admin/system',
    icon: '⚙️',
    permissions: ['system:config'],
    order: 6,
    visible: true,
    disabled: false
  }
]

/**
 * Temporary Navigation Service
 */
export class TempNavigationService {
  private static instance: TempNavigationService
  private [items] = createSignal<TempNavigationItem[]>([])
  private [loading] = createSignal(false)
  private [error] = createSignal<string>()

  static getInstance(): TempNavigationService {
    if (!TempNavigationService.instance) {
      TempNavigationService.instance = new TempNavigationService()
    }
    return TempNavigationService.instance
  }

  async getNavigationForUser(
    user: User & { roles?: UserRole[]; isSystemAdmin?: boolean }
  ): Promise<TempNavigationItem[]> {
    try {
      this[loading](true)
      this[error]()

      if (!user) {
        return []
      }

      // Get user permissions
      const userPermissions = user.roles?.flatMap(role => role.permissions) || []

      // Filter navigation items based on permissions
      const filteredItems = defaultNavigationItems.filter(item => {
        // Check if item should be visible
        if (!item.visible) return false

        // Check permissions
        if (item.permission) {
          return userPermissions.includes(item.permission)
        }

        if (item.permissions && item.permissions.length > 0) {
          if (item.requireAll) {
            return item.permissions.every(permission => userPermissions.includes(permission))
          } else {
            return item.permissions.some(permission => userPermissions.includes(permission))
          }
        }

        // System admin bypass
        if (user.isSystemAdmin) {
          return true
        }

        return true // No specific permission required
      })

      this[items](filteredItems)
      return filteredItems

    } catch (error) {
      console.error('Error getting navigation:', error)
      this[error]('Failed to load navigation')
      return []
    } finally {
      this[loading](false)
    }
  }

  getState() {
    return {
      items: this[items](),
      loading: this[loading](),
      error: this[error]()
    }
  }
}

/**
 * Get temporary navigation service instance
 */
export function getTempNavigationService(): TempNavigationService {
  return TempNavigationService.getInstance()
}