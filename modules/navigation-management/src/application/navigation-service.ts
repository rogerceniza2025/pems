import type { Permission, Role } from '@pems/auth'
import {
  NavigationMenu,
  NavigationItemFactory,
  NavigationEventFactory,
  type NavigationMenuConfig,
  type NavigationItem,
  type NavigationDomainEvent,
  type UserPermissionsChangedEvent,
  type TenantSwitchedEvent,
  type NavigationPermissionCheckEvent
} from '../domain'

/**
 * Navigation User Context
 */
export interface NavigationUserContext {
  userId: string
  tenantId?: string
  permissions: Permission[]
  role?: Role
  isSystemAdmin?: boolean
}

/**
 * Navigation Service Options
 */
export interface NavigationServiceOptions {
  enableCaching?: boolean
  enableAnalytics?: boolean
  enableSecurityAuditing?: boolean
  cacheTimeout?: number // in minutes
  maxDepth?: number
}

/**
 * Navigation Statistics
 */
export interface NavigationStatistics {
  totalItems: number
  rootItems: number
  itemsWithPermissions: number
  cacheHitRatio: number
  lastUpdated: Date
  averageAccessTime?: number
}

/**
 * Navigation Service
 *
 * This service provides the main business logic for navigation management,
 * including menu generation, permission filtering, caching, and analytics.
 */
export class NavigationService {
  private readonly _options: Required<NavigationServiceOptions>
  private readonly _menus: Map<string, NavigationMenu> = new Map()
  private readonly _statistics: Map<string, NavigationStatistics> = new Map()
  private _domainEvents: NavigationDomainEvent[] = []

  constructor(options: NavigationServiceOptions = {}) {
    this._options = {
      enableCaching: options.enableCaching ?? true,
      enableAnalytics: options.enableAnalytics ?? true,
      enableSecurityAuditing: options.enableSecurityAuditing ?? true,
      cacheTimeout: options.cacheTimeout ?? 15, // 15 minutes
      maxDepth: options.maxDepth ?? 10
    }
  }

  /**
   * Create a new navigation menu
   */
  createNavigationMenu(config: NavigationMenuConfig): NavigationMenu {
    const menu = new NavigationMenu(config)
    this._menus.set(menu.id, menu)

    // Initialize statistics
    this._statistics.set(menu.id, {
      totalItems: 0,
      rootItems: 0,
      itemsWithPermissions: 0,
      cacheHitRatio: 0,
      lastUpdated: new Date()
    })

    this.addDomainEvent({
      type: 'NavigationMenuCreated',
      data: {
        menuId: menu.id,
        name: menu.name,
        scope: menu.scope,
        tenantId: menu.tenantId,
        userId: menu.userId,
        createdBy: 'system' // TODO: Get actual user from context
      },
      timestamp: new Date(),
      version: menu.version
    })

    return menu
  }

  /**
   * Get navigation menu by ID
   */
  getNavigationMenu(menuId: string): NavigationMenu | undefined {
    return this._menus.get(menuId)
  }

  /**
   * Get all navigation menus
   */
  getAllNavigationMenus(): NavigationMenu[] {
    return Array.from(this._menus.values())
  }

  /**
   * Get navigation menus by scope
   */
  getNavigationMenusByScope(scope: string): NavigationMenu[] {
    return Array.from(this._menus.values()).filter(menu => menu.scope === scope)
  }

  /**
   * Get navigation for user
   */
  async getNavigationForUser(
    userContext: NavigationUserContext,
    menuId?: string
  ): Promise<NavigationItem[]> {
    const startTime = Date.now()

    try {
      // Find the appropriate menu
      let targetMenu: NavigationMenu | undefined

      if (menuId) {
        targetMenu = this._menus.get(menuId)
      } else {
        // Auto-select menu based on user context
        targetMenu = this.findBestMenuForUser(userContext)
      }

      if (!targetMenu) {
        throw new Error(`No navigation menu found for user ${userContext.userId}`)
      }

      // Get navigation items with permission filtering
      const items = targetMenu.getNavigationForUser(
        userContext.userId,
        userContext.permissions,
        userContext.role,
        userContext.tenantId,
        {
          includeDisabled: false,
          includeHidden: false,
          maxDepth: this._options.maxDepth
        }
      )

      // Update statistics
      this.updateAccessStatistics(targetMenu.id, Date.now() - startTime)

      // Log analytics event
      if (this._options.enableAnalytics) {
        this.logNavigationAccess(userContext, targetMenu.id, items)
      }

      return items
    } catch (error) {
      console.error(`Error getting navigation for user ${userContext.userId}:`, error)
      throw error
    }
  }

  /**
   * Handle user permissions changed event
   */
  async handleUserPermissionsChanged(event: UserPermissionsChangedEvent): Promise<void> {
    const { userId, tenantId, oldPermissions, newPermissions } = event.data

    // Invalidate cache for affected user across all relevant menus
    for (const menu of this._menus.values()) {
      if (this.isMenuRelevantForUser(menu, userId, tenantId)) {
        menu.invalidateUserCache(userId, tenantId)

        this.addDomainEvent(NavigationEventFactory.createNavigationCacheInvalidatedEvent(
          menu.id,
          'user_permissions_changed',
          menu.version,
          userId,
          tenantId
        ))
      }
    }

    console.log(`Invalidated navigation cache for user ${userId} due to permissions change`)
  }

  /**
   * Handle tenant switched event
   */
  async handleTenantSwitched(event: TenantSwitchedEvent): Promise<void> {
    const { userId, oldTenantId, newTenantId, userRole, userPermissions } = event.data

    // Invalidate old tenant cache
    if (oldTenantId) {
      for (const menu of this._menus.values()) {
        menu.invalidateUserCache(userId, oldTenantId)
      }
    }

    // Pre-warm cache for new tenant
    if (newTenantId) {
      for (const menu of this._menus.values()) {
        if (this.isMenuRelevantForUser(menu, userId, newTenantId)) {
          try {
            await this.getNavigationForUser({
              userId,
              tenantId: newTenantId,
              permissions: userPermissions,
              role: userRole,
              isSystemAdmin: userRole === 'super_admin'
            }, menu.id)
          } catch (error) {
            console.warn(`Failed to pre-warm navigation cache for user ${userId}:`, error)
          }
        }
      }
    }

    console.log(`Handled tenant switch for user ${userId}: ${oldTenantId} → ${newTenantId}`)
  }

  /**
   * Check if user can access navigation item
   */
  async canAccessNavigationItem(
    userContext: NavigationUserContext,
    itemId: string,
    menuId?: string
  ): Promise<boolean> {
    const startTime = Date.now()

    try {
      // Find the navigation item across all menus or specific menu
      let targetItem: NavigationItem | undefined

      if (menuId) {
        const menu = this._menus.get(menuId)
        targetItem = menu?.findById(itemId)
      } else {
        // Search across all menus
        for (const menu of this._menus.values()) {
          const item = menu.findById(itemId)
          if (item) {
            targetItem = item
            break
          }
        }
      }

      if (!targetItem) {
        return false
      }

      const hasPermission = targetItem.hasPermission(
        userContext.permissions,
        userContext.role,
        userContext.isSystemAdmin,
        userContext.tenantId
      )

      // Log security audit event
      if (this._options.enableSecurityAuditing) {
        this.logPermissionCheck(userContext, targetItem, hasPermission, Date.now() - startTime)
      }

      return hasPermission
    } catch (error) {
      console.error(`Error checking navigation access for user ${userContext.userId}:`, error)
      return false
    }
  }

  /**
   * Add navigation item to menu
   */
  addNavigationItem(menuId: string, item: NavigationItem): boolean {
    const menu = this._menus.get(menuId)
    if (!menu) {
      return false
    }

    try {
      menu.addItem(item)
      this.updateMenuStatistics(menuId)

      // Collect and add domain events from menu
      menu.domainEvents.forEach(event => this.addDomainEvent(event))
      menu.clearDomainEvents()

      return true
    } catch (error) {
      console.error(`Error adding navigation item to menu ${menuId}:`, error)
      return false
    }
  }

  /**
   * Remove navigation item from menu
   */
  removeNavigationItem(menuId: string, itemId: string): boolean {
    const menu = this._menus.get(menuId)
    if (!menu) {
      return false
    }

    try {
      const removed = menu.removeItem(itemId)
      if (removed) {
        this.updateMenuStatistics(menuId)

        // Collect and add domain events from menu
        menu.domainEvents.forEach(event => this.addDomainEvent(event))
        menu.clearDomainEvents()
      }

      return removed
    } catch (error) {
      console.error(`Error removing navigation item from menu ${menuId}:`, error)
      return false
    }
  }

  /**
   * Clear all navigation caches
   */
  clearAllCaches(): void {
    for (const menu of this._menus.values()) {
      menu.clearCache()
    }
    console.log('Cleared all navigation caches')
  }

  /**
   * Get navigation statistics
   */
  getStatistics(menuId?: string): NavigationStatistics | Map<string, NavigationStatistics> {
    if (menuId) {
      return this._statistics.get(menuId) || {
        totalItems: 0,
        rootItems: 0,
        itemsWithPermissions: 0,
        cacheHitRatio: 0,
        lastUpdated: new Date()
      }
    }
    return this._statistics
  }

  /**
   * Get pending domain events
   */
  getDomainEvents(): NavigationDomainEvent[] {
    return [...this._domainEvents]
  }

  /**
   * Clear domain events
   */
  clearDomainEvents(): void {
    this._domainEvents = []
  }

  /**
   * Find the best menu for a user based on their context
   */
  private findBestMenuForUser(userContext: NavigationUserContext): NavigationMenu | undefined {
    const { userId, tenantId, isSystemAdmin } = userContext

    // Priority order: user-specific > tenant-specific > global > system
    const searchOrder = [
      { scope: 'user', userId },
      { scope: 'tenant', tenantId },
      { scope: 'global' },
      { scope: 'system' }
    ]

    for (const { scope, userId: scopeUserId, tenantId: scopeTenantId } of searchOrder) {
      for (const menu of this._menus.values()) {
        if (!menu.isActive) continue

        if (menu.scope === scope) {
          if (scope === 'user' && menu.userId === scopeUserId) {
            return menu
          }
          if (scope === 'tenant' && menu.tenantId === scopeTenantId) {
            return menu
          }
          if (scope === 'global' || (scope === 'system' && isSystemAdmin)) {
            return menu
          }
        }
      }
    }

    return undefined
  }

  /**
   * Check if menu is relevant for user
   */
  private isMenuRelevantForUser(menu: NavigationMenu, userId: string, tenantId?: string): boolean {
    if (!menu.isActive) return false

    switch (menu.scope) {
      case 'user':
        return menu.userId === userId
      case 'tenant':
        return menu.tenantId === tenantId
      case 'global':
        return true
      case 'system':
        return true // System menus are relevant for all users (access controlled by permissions)
      default:
        return false
    }
  }

  /**
   * Update menu statistics
   */
  private updateMenuStatistics(menuId: string): void {
    const menu = this._menus.get(menuId)
    if (!menu) return

    const allItems = menu.allItems
    const itemsWithPermissions = allItems.filter(item =>
      item.permissions && item.permissions.length > 0
    )

    this._statistics.set(menuId, {
      totalItems: allItems.length,
      rootItems: menu.rootItems.length,
      itemsWithPermissions: itemsWithPermissions.length,
      cacheHitRatio: this._statistics.get(menuId)?.cacheHitRatio || 0,
      lastUpdated: new Date()
    })
  }

  /**
   * Update access statistics
   */
  private updateAccessStatistics(menuId: string, accessTime: number): void {
    const stats = this._statistics.get(menuId)
    if (!stats) return

    // Update cache hit ratio (simplified calculation)
    const currentRatio = stats.cacheHitRatio
    const newRatio = (currentRatio * 0.9) + (accessTime < 50 ? 0.1 : 0) // Fast access = cache hit

    this._statistics.set(menuId, {
      ...stats,
      cacheHitRatio: newRatio,
      averageAccessTime: stats.averageAccessTime
        ? (stats.averageAccessTime * 0.9) + (accessTime * 0.1)
        : accessTime
    })
  }

  /**
   * Log navigation access for analytics
   */
  private logNavigationAccess(
    userContext: NavigationUserContext,
    menuId: string,
    items: NavigationItem[]
  ): void {
    // Log access event for each accessible item
    items.forEach(item => {
      this.addDomainEvent(NavigationEventFactory.createNavigationAccessedEvent(
        userContext.userId,
        item.id,
        item.path,
        item.label,
        'current-version', // TODO: Get actual version
        userContext.tenantId
      ))
    })
  }

  /**
   * Log permission check for security auditing
   */
  private logPermissionCheck(
    userContext: NavigationUserContext,
    item: NavigationItem,
    granted: boolean,
    checkTime: number
  ): void {
    const reason = granted
      ? (userContext.isSystemAdmin ? 'system_admin_bypass' : 'permission_granted')
      : 'permission_denied'

    this.addDomainEvent(NavigationEventFactory.createNavigationPermissionCheckEvent(
      userContext.userId,
      item.id,
      item.path,
      userContext.permissions,
      granted,
      'current-version', // TODO: Get actual version
      userContext.tenantId,
      reason
    ))
  }

  /**
   * Add domain event
   */
  private addDomainEvent(event: NavigationDomainEvent): void {
    this._domainEvents.push(event)
  }
}