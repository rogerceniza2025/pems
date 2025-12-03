import type { Permission, Role } from '@pems/auth'
import {
  NavigationMenu,
  NavigationItem,
  NavigationEventFactory,
  type NavigationMenuConfig,
  type NavigationItemValue,
  type NavigationCacheEntry,
  type NavigationDomainEvent
} from '../domain'
import { NavigationCache } from '@pems/infrastructure-cache'
import { DomainEventBus } from '@pems/infrastructure-events'

/**
 * Repository Query Options
 */
export interface NavigationRepositoryQuery {
  userId?: string
  tenantId?: string
  role?: Role
  permissions?: Permission[]
  scope?: string
  isActive?: boolean
  limit?: number
  offset?: number
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'order'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Navigation Repository Configuration
 */
export interface NavigationRepositoryConfig {
  enableCache: boolean
  cacheTimeout: number // milliseconds
  enableEventPublishing: boolean
  enablePersistence: boolean
  batchSize: number
  enableMetrics: boolean
}

/**
 * Navigation Repository Statistics
 */
export interface NavigationRepositoryStats {
  totalMenus: number
  totalItems: number
  cacheHitRatio: number
  averageQueryTime: number
  eventPublishingEnabled: boolean
  lastSyncAt?: Date
  lastCacheClearAt?: Date
}

/**
 * Navigation Repository
 *
 * This repository provides data access for navigation entities with caching,
 * event publishing, and comprehensive query capabilities.
 */
export class NavigationRepository {
  private readonly _config: NavigationRepositoryConfig
  private readonly _cache: NavigationCache<NavigationMenu>
  private readonly _eventBus: DomainEventBus
  private readonly _menus: Map<string, NavigationMenu>
  private readonly _statistics: NavigationRepositoryStats

  constructor(
    eventBus: DomainEventBus,
    config: Partial<NavigationRepositoryConfig> = {}
  ) {
    this._eventBus = eventBus
    this._config = this.mergeConfig(config)
    this._menus = new Map()
    this._statistics = this.initializeStatistics()

    // Initialize cache
    this._cache = new NavigationCache({
      enableMetrics: this._config.enableMetrics
    })

    // Subscribe to domain events
    this.setupEventSubscriptions()
  }

  /**
   * Create navigation menu
   */
  async createNavigationMenu(config: NavigationMenuConfig): Promise<NavigationMenu> {
    const startTime = performance.now()

    try {
      const menu = new NavigationMenu(config)
      this._menus.set(menu.id, menu)

      // Publish domain events
      if (this._config.enableEventPublishing) {
        await this.publishDomainEvents(menu.domainEvents)
        menu.clearDomainEvents()
      }

      // Cache the menu
      if (this._config.enableCache) {
        const cacheKey = this.generateCacheKey('menu', menu.id)
        await this._cache.set(cacheKey, menu, {
          ttl: this._config.cacheTimeout,
          tags: ['menu', menu.scope, menu.tenantId || 'global']
        })
      }

      this.updateStatistics(startTime)
      console.log(`Created navigation menu: ${menu.name} (${menu.id})`)

      return menu

    } catch (error) {
      console.error('Error creating navigation menu:', error)
      throw error
    }
  }

  /**
   * Get navigation menu by ID
   */
  async getNavigationMenu(menuId: string): Promise<NavigationMenu | undefined> {
    const startTime = performance.now()

    try {
      // Try cache first
      if (this._config.enableCache) {
        const cacheKey = this.generateCacheKey('menu', menuId)
        const cached = await this._cache.get(cacheKey)
        if (cached) {
          this.updateStatistics(startTime, true)
          return cached
        }
      }

      // Get from memory
      const menu = this._menus.get(menuId)
      if (menu) {
        // Cache for future requests
        if (this._config.enableCache) {
          const cacheKey = this.generateCacheKey('menu', menuId)
          await this._cache.set(cacheKey, menu, {
            ttl: this._config.cacheTimeout,
            tags: ['menu', menu.scope, menu.tenantId || 'global']
          })
        }

        this.updateStatistics(startTime, true)
        return menu
      }

      this.updateStatistics(startTime, false)
      return undefined

    } catch (error) {
      console.error(`Error getting navigation menu ${menuId}:`, error)
      return undefined
    }
  }

  /**
   * Get navigation menus by query
   */
  async getNavigationMenus(query: NavigationRepositoryQuery = {}): Promise<NavigationMenu[]> {
    const startTime = performance.now()

    try {
      const results = Array.from(this._menus.values()).filter(menu => {
        // Apply filters
        if (query.userId && menu.userId !== query.userId) return false
        if (query.tenantId && menu.tenantId !== query.tenantId) return false
        if (query.scope && menu.scope !== query.scope) return false
        if (query.isActive !== undefined && menu.isActive !== query.isActive) return false

        return true
      })

      // Apply sorting
      if (query.sortBy) {
        results.sort((a, b) => {
          let aValue: any
          let bValue: any

          switch (query.sortBy) {
            case 'name':
              aValue = a.name.toLowerCase()
              bValue = b.name.toLowerCase()
              break
            case 'createdAt':
              aValue = a.toObject().config.created_at || new Date(0)
              bValue = b.toObject().config.created_at || new Date(0)
              break
            case 'updatedAt':
              aValue = a.toObject().config.updated_at || new Date(0)
              bValue = b.toObject().config.updated_at || new Date(0)
              break
            case 'order':
              aValue = 0 // NavigationMenu doesn't have order, use 0 as default
              bValue = 0
              break
            default:
              return 0
          }

          if (aValue < bValue) return query.sortOrder === 'desc' ? 1 : -1
          if (aValue > bValue) return query.sortOrder === 'desc' ? -1 : 1
          return 0
        })
      }

      // Apply pagination
      const offset = query.offset || 0
      const limit = query.limit || results.length
      const paginatedResults = results.slice(offset, offset + limit)

      this.updateStatistics(startTime, true)
      return paginatedResults

    } catch (error) {
      console.error('Error getting navigation menus:', error)
      return []
    }
  }

  /**
   * Update navigation menu
   */
  async updateNavigationMenu(
    menuId: string,
    updates: Partial<NavigationMenuConfig>
  ): Promise<boolean> {
    const startTime = performance.now()

    try {
      const menu = this._menus.get(menuId)
      if (!menu) {
        return false
      }

      menu.updateConfig(updates)

      // Publish domain events
      if (this._config.enableEventPublishing) {
        await this.publishDomainEvents(menu.domainEvents)
        menu.clearDomainEvents()
      }

      // Update cache
      if (this._config.enableCache) {
        const cacheKey = this.generateCacheKey('menu', menuId)
        await this._cache.set(cacheKey, menu, {
          ttl: this._config.cacheTimeout,
          tags: ['menu', menu.scope, menu.tenantId || 'global']
        })
      }

      this.updateStatistics(startTime)
      console.log(`Updated navigation menu: ${menu.name} (${menuId})`)

      return true

    } catch (error) {
      console.error(`Error updating navigation menu ${menuId}:`, error)
      return false
    }
  }

  /**
   * Delete navigation menu
   */
  async deleteNavigationMenu(menuId: string): Promise<boolean> {
    const startTime = performance.now()

    try {
      const menu = this._menus.get(menuId)
      if (!menu) {
        return false
      }

      // Remove from memory
      this._menus.delete(menuId)

      // Remove from cache
      if (this._config.enableCache) {
        const cacheKey = this.generateCacheKey('menu', menuId)
        await this._cache.delete(cacheKey)

        // Invalidate related cache entries
        await this._cache.invalidateByTag(`menu:${menu.scope}`)
        if (menu.tenantId) {
          await this._cache.invalidateByTag(`tenant:${menu.tenantId}`)
        }
      }

      // Publish domain events
      if (this._config.enableEventPublishing) {
        const event = NavigationEventFactory.createNavigationMenuUpdatedEvent(
          menuId,
          { deleted: true },
          menu.version,
          undefined,
          'system'
        )

        await this._eventBus.publish('NavigationMenuDeleted', event.data, {
          aggregateId: menuId,
          aggregateType: 'NavigationMenu'
        })
      }

      this.updateStatistics(startTime)
      console.log(`Deleted navigation menu: ${menu.name} (${menuId})`)

      return true

    } catch (error) {
      console.error(`Error deleting navigation menu ${menuId}:`, error)
      return false
    }
  }

  /**
   * Add navigation item to menu
   */
  async addNavigationItem(
    menuId: string,
    item: NavigationItem
  ): Promise<boolean> {
    const startTime = performance.now()

    try {
      const menu = this._menus.get(menuId)
      if (!menu) {
        return false
      }

      menu.addItem(item)

      // Publish domain events
      if (this._config.enableEventPublishing) {
        await this.publishDomainEvents(menu.domainEvents)
        menu.clearDomainEvents()
      }

      // Invalidate cache
      if (this._config.enableCache) {
        await this.invalidateMenuCache(menuId)
      }

      this.updateStatistics(startTime)
      return true

    } catch (error) {
      console.error(`Error adding navigation item to menu ${menuId}:`, error)
      return false
    }
  }

  /**
   * Remove navigation item from menu
   */
  async removeNavigationItem(menuId: string, itemId: string): Promise<boolean> {
    const startTime = performance.now()

    try {
      const menu = this._menus.get(menuId)
      if (!menu) {
        return false
      }

      const removed = menu.removeItem(itemId)

      if (removed) {
        // Publish domain events
        if (this._config.enableEventPublishing) {
          await this.publishDomainEvents(menu.domainEvents)
          menu.clearDomainEvents()
        }

        // Invalidate cache
        if (this._config.enableCache) {
          await this.invalidateMenuCache(menuId)
        }
      }

      this.updateStatistics(startTime)
      return removed

    } catch (error) {
      console.error(`Error removing navigation item from menu ${menuId}:`, error)
      return false
    }
  }

  /**
   * Get user navigation with permission filtering
   */
  async getUserNavigation(
    userId: string,
    userPermissions: Permission[],
    userRole?: Role,
    tenantId?: string,
    menuId?: string
  ): Promise<NavigationItem[]> {
    const startTime = performance.now()

    try {
      // Generate cache key for user navigation
      const cacheKey = this.generateUserNavigationCacheKey(
        userId,
        tenantId,
        userRole,
        userPermissions,
        menuId
      )

      // Try cache first
      if (this._config.enableCache) {
        const cached = await this._cache.get(cacheKey)
        if (cached) {
          this.updateStatistics(startTime, true)
          return cached
        }
      }

      // Find appropriate menu
      let targetMenu: NavigationMenu | undefined
      if (menuId) {
        targetMenu = this._menus.get(menuId)
      } else {
        // Auto-select best menu for user
        targetMenu = this.findBestMenuForUser(userId, tenantId, userRole)
      }

      if (!targetMenu) {
        return []
      }

      // Get filtered navigation
      const navigationItems = targetMenu.getNavigationForUser(
        userId,
        userPermissions,
        userRole,
        tenantId
      )

      // Cache the result
      if (this._config.enableCache) {
        const tags = ['user-navigation', `user:${userId}`]
        if (tenantId) tags.push(`tenant:${tenantId}`)
        if (userRole) tags.push(`role:${userRole}`)

        await this._cache.set(cacheKey, navigationItems, {
          ttl: this._config.cacheTimeout,
          tags
        })
      }

      this.updateStatistics(startTime, true)
      return navigationItems

    } catch (error) {
      console.error(`Error getting user navigation for ${userId}:`, error)
      return []
    }
  }

  /**
   * Invalidate cache for user
   */
  async invalidateUserCache(userId: string, tenantId?: string): Promise<void> {
    if (!this._config.enableCache) return

    try {
      // Invalidate user navigation cache
      const pattern = tenantId
        ? `user-nav:${userId}:${tenantId}:*`
        : `user-nav:${userId}:*`

      await this._cache.invalidateByPattern(new RegExp(pattern))

      // Invalidate menu caches for user
      await this._cache.invalidateByTag(`user:${userId}`)

      this._statistics.lastCacheClearAt = new Date()
      console.log(`Invalidated cache for user ${userId}${tenantId ? ` in tenant ${tenantId}` : ''}`)

    } catch (error) {
      console.error(`Error invalidating cache for user ${userId}:`, error)
    }
  }

  /**
   * Invalidate cache for tenant
   */
  async invalidateTenantCache(tenantId: string): Promise<void> {
    if (!this._config.enableCache) return

    try {
      await this._cache.invalidateByTag(`tenant:${tenantId}`)
      this._statistics.lastCacheClearAt = new Date()
      console.log(`Invalidated cache for tenant ${tenantId}`)

    } catch (error) {
      console.error(`Error invalidating cache for tenant ${tenantId}:`, error)
    }
  }

  /**
   * Get repository statistics
   */
  getStatistics(): NavigationRepositoryStats {
    const cacheStats = this._cache.getStatistics()

    return {
      ...this._statistics,
      totalMenus: this._menus.size,
      totalItems: Array.from(this._menus.values())
        .reduce((total, menu) => total + menu.allItems.length, 0),
      cacheHitRatio: cacheStats.hitRatio,
      averageQueryTime: this._statistics.averageQueryTime
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    if (this._config.enableCache) {
      await this._cache.clear()
      this._statistics.lastCacheClearAt = new Date()
      console.log('Cleared all navigation caches')
    }
  }

  /**
   * Destroy repository
   */
  async destroy(): Promise<void> {
    await this._cache.destroy()
    this._menus.clear()
    console.log('Navigation repository destroyed')
  }

  // Private Methods

  private mergeConfig(config: Partial<NavigationRepositoryConfig>): NavigationRepositoryConfig {
    return {
      enableCache: config.enableCache ?? true,
      cacheTimeout: config.cacheTimeout ?? 15 * 60 * 1000, // 15 minutes
      enableEventPublishing: config.enableEventPublishing ?? true,
      enablePersistence: config.enablePersistence ?? false,
      batchSize: config.batchSize ?? 100,
      enableMetrics: config.enableMetrics ?? true
    }
  }

  private initializeStatistics(): NavigationRepositoryStats {
    return {
      totalMenus: 0,
      totalItems: 0,
      cacheHitRatio: 0,
      averageQueryTime: 0,
      eventPublishingEnabled: this._config.enableEventPublishing
    }
  }

  private setupEventSubscriptions(): void {
    if (!this._config.enableEventPublishing) return

    // Subscribe to user permission changes
    this._eventBus.subscribe('UserPermissionsChanged', async (event) => {
      const { userId, tenantId } = event.data
      await this.invalidateUserCache(userId, tenantId)
    })

    // Subscribe to tenant switches
    this._eventBus.subscribe('TenantSwitched', async (event) => {
      const { userId, newTenantId } = event.data
      if (newTenantId) {
        await this.invalidateUserCache(userId, newTenantId)
      }
    })

    // Subscribe to role changes
    this._eventBus.subscribe('RoleChanged', async (event) => {
      const { userId, tenantId } = event.data
      await this.invalidateUserCache(userId, tenantId)
    })
  }

  private async publishDomainEvents(events: NavigationDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this._eventBus.publish(event.type, event.data, {
        correlationId: event.correlationId,
        aggregateId: event.data.menuId,
        aggregateType: 'NavigationMenu'
      })
    }
  }

  private generateCacheKey(type: string, id: string): string {
    return `${type}:${id}`
  }

  private generateUserNavigationCacheKey(
    userId: string,
    tenantId: string | undefined,
    role: string | undefined,
    permissions: Permission[],
    menuId?: string
  ): string {
    const permissionHash = permissions.sort().join(',')
    const tenantPart = tenantId || 'global'
    const rolePart = role || 'none'
    const menuPart = menuId || 'auto'

    return `user-nav:${userId}:${tenantPart}:${rolePart}:${permissionHash}:${menuPart}`
  }

  private findBestMenuForUser(
    userId: string,
    tenantId: string | undefined,
    userRole?: Role
  ): NavigationMenu | undefined {
    const isSystemAdmin = userRole === 'super_admin'

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

  private async invalidateMenuCache(menuId: string): Promise<void> {
    if (!this._config.enableCache) return

    const cacheKey = this.generateCacheKey('menu', menuId)
    await this._cache.delete(cacheKey)
  }

  private updateStatistics(startTime: number, cacheHit: boolean = false): void {
    if (!this._config.enableMetrics) return

    const queryTime = performance.now() - startTime
    this._statistics.averageQueryTime =
      (this._statistics.averageQueryTime + queryTime) / 2

    if (cacheHit) {
      // Update cache hit ratio through cache statistics
      const cacheStats = this._cache.getStatistics()
      this._statistics.cacheHitRatio = cacheStats.hitRatio
    }
  }
}