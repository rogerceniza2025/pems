import { z } from 'zod'
import { nanoid } from 'nanoid'
import type { Permission, Role } from '@pems/auth'
import { NavigationItem, NavigationScope, type NavigationItemValue } from './navigation-item'
import type { DomainEvent } from './navigation-events'

/**
 * Navigation Menu Configuration Schema
 */
export const NavigationMenuConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  scope: z.enum(['global', 'tenant', 'system', 'user']),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional()
})

export type NavigationMenuConfig = z.infer<typeof NavigationMenuConfigSchema>

/**
 * Navigation Cache Entry Schema
 */
export const NavigationCacheEntrySchema = z.object({
  userId: z.string(),
  tenantId: z.string().optional(),
  roleId: z.string().optional(),
  navigationItems: z.array(z.any()),
  permissions: z.array(z.string()),
  cachedAt: z.date(),
  expiresAt: z.date(),
  version: z.string()
})

export type NavigationCacheEntry = z.infer<typeof NavigationCacheEntrySchema>

/**
 * Navigation Menu Aggregate Root
 *
 * This is the main aggregate that manages navigation menus,
 * including items, caching, and permission-based filtering.
 */
export class NavigationMenu {
  private readonly _id: string
  private readonly _config: NavigationMenuConfig
  private readonly _rootItems: Map<string, NavigationItem>
  private readonly _allItems: Map<string, NavigationItem>
  private _domainEvents: DomainEvent[] = []
  private _cache: Map<string, NavigationCacheEntry> = new Map()
  private _version: string = nanoid()

  constructor(config: NavigationMenuConfig) {
    this._id = nanoid()
    this._config = NavigationMenuConfigSchema.parse(config)
    this._rootItems = new Map()
    this._allItems = new Map()
  }

  get id(): string {
    return this._id
  }

  get name(): string {
    return this._config.name
  }

  get description(): string | undefined {
    return this._config.description
  }

  get scope(): string {
    return this._config.scope
  }

  get tenantId(): string | undefined {
    return this._config.tenantId
  }

  get userId(): string | undefined {
    return this._config.userId
  }

  get isDefault(): boolean {
    return this._config.isDefault
  }

  get isActive(): boolean {
    return this._config.isActive
  }

  get metadata(): Record<string, any> | undefined {
    return this._config.metadata
  }

  get version(): string {
    return this._version
  }

  get rootItems(): NavigationItem[] {
    return Array.from(this._rootItems.values())
  }

  get allItems(): NavigationItem[] {
    return Array.from(this._allItems.values())
  }

  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents]
  }

  /**
   * Add root navigation item
   */
  addItem(item: NavigationItem): void {
    if (this._allItems.has(item.id)) {
      throw new Error(`Navigation item with id '${item.id}' already exists`)
    }

    // Add to all items map
    this._allItems.set(item.id, item)

    // Add to root items if no parent
    if (!item.parentId) {
      this._rootItems.set(item.id, item)
    }

    this.incrementVersion()
    this.addDomainEvent({
      type: 'NavigationItemAdded',
      data: {
        menuId: this.id,
        itemId: item.id,
        item: item.toObject()
      },
      timestamp: new Date(),
      version: this._version
    })
  }

  /**
   * Remove navigation item
   */
  removeItem(itemId: string): boolean {
    const item = this._allItems.get(itemId)
    if (!item) {
      return false
    }

    // Remove from all items map
    this._allItems.delete(itemId)

    // Remove from root items if applicable
    this._rootItems.delete(itemId)

    // Remove from parent's children if applicable
    if (item.parentId) {
      const parent = this._allItems.get(item.parentId)
      if (parent) {
        parent.removeChild(itemId)
      }
    }

    // Remove all children recursively
    this.removeChildItemsRecursively(item)

    this.incrementVersion()
    this.addDomainEvent({
      type: 'NavigationItemRemoved',
      data: {
        menuId: this.id,
        itemId: itemId,
        parentId: item.parentId
      },
      timestamp: new Date(),
      version: this._version
    })

    return true
  }

  /**
   * Get navigation items for a specific user with permission filtering
   */
  getNavigationForUser(
    userId: string,
    userPermissions: Permission[],
    userRole?: Role,
    tenantId?: string,
    options: {
      includeDisabled?: boolean
      includeHidden?: boolean
      maxDepth?: number
    } = {}
  ): NavigationItem[] {
    const {
      includeDisabled = false,
      includeHidden = false,
      maxDepth = 10
    } = options

    // Check cache first
    const cacheKey = this.generateCacheKey(userId, tenantId, userRole, userPermissions)
    const cached = this.getFromCache(cacheKey)
    if (cached && !this.isCacheExpired(cached)) {
      return cached.navigationItems.map((item: any) => NavigationItem.recreate(item))
    }

    // Filter navigation items based on permissions
    const filteredItems = this.filterItemsByPermissions(
      this.rootItems,
      userPermissions,
      userRole,
      tenantId,
      includeDisabled,
      includeHidden,
      maxDepth
    )

    // Cache the result
    this.addToCache(cacheKey, {
      userId,
      tenantId,
      roleId: userRole,
      navigationItems: filteredItems.map(item => item.toObject()),
      permissions: userPermissions,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      version: this._version
    })

    return filteredItems
  }

  /**
   * Filter items by permissions recursively
   */
  private filterItemsByPermissions(
    items: NavigationItem[],
    userPermissions: Permission[],
    userRole?: Role,
    tenantId?: string,
    includeDisabled = false,
    includeHidden = false,
    currentDepth = 0,
    maxDepth = 10
  ): NavigationItem[] {
    if (currentDepth >= maxDepth) {
      return []
    }

    return items
      .filter(item => {
        // Check visibility
        if (!includeHidden && !item.visible) {
          return false
        }

        // Check if disabled
        if (!includeDisabled && item.disabled) {
          return false
        }

        // Check permissions
        return item.hasPermission(userPermissions, userRole, userRole === 'super_admin', tenantId)
      })
      .map(item => {
        // Create a copy of the item with filtered children
        const filteredItem = NavigationItem.recreate(item.toObject())

        if (item.hasChildren) {
          const filteredChildren = this.filterItemsByPermissions(
            item.children,
            userPermissions,
            userRole,
            tenantId,
            includeDisabled,
            includeHidden,
            currentDepth + 1,
            maxDepth
          )

          // Only include parent if it has visible children or is a leaf node
          if (filteredChildren.length > 0 || !item.hasChildren) {
            filteredChildren.forEach(child => filteredItem.addChild(child))
          }
        }

        return filteredItem
      })
      .filter(item => item.type === 'divider' || item.type === 'header' ||
                     !item.hasChildren || item.children.length > 0)
  }

  /**
   * Get navigation items by type
   */
  getItemsByType(type: NavigationItem['type']): NavigationItem[] {
    return Array.from(this._allItems.values()).filter(item => item.type === type)
  }

  /**
   * Get navigation items by scope
   */
  getItemsByScope(scope: NavigationScope): NavigationItem[] {
    return Array.from(this._allItems.values()).filter(item => item.scope === scope)
  }

  /**
   * Find navigation item by path
   */
  findByPath(path: string): NavigationItem | undefined {
    return Array.from(this._allItems.values()).find(item => item.path === path)
  }

  /**
   * Find navigation item by ID
   */
  findById(id: string): NavigationItem | undefined {
    return this._allItems.get(id)
  }

  /**
   * Update navigation menu configuration
   */
  updateConfig(updates: Partial<NavigationMenuConfig>): void {
    Object.assign(this._config, updates)
    this.incrementVersion()
    this.addDomainEvent({
      type: 'NavigationMenuUpdated',
      data: {
        menuId: this.id,
        updates
      },
      timestamp: new Date(),
      version: this._version
    })
  }

  /**
   * Clear navigation cache
   */
  clearCache(): void {
    this._cache.clear()
    this.addDomainEvent({
      type: 'NavigationCacheCleared',
      data: {
        menuId: this.id,
        scope: this._config.scope,
        tenantId: this._config.tenantId
      },
      timestamp: new Date(),
      version: this._version
    })
  }

  /**
   * Invalidate cache for specific user
   */
  invalidateUserCache(userId: string, tenantId?: string): void {
    const keysToDelete: string[] = []

    for (const [key] of this._cache) {
      if (key.includes(userId) && (!tenantId || key.includes(tenantId))) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this._cache.delete(key))

    this.addDomainEvent({
      type: 'NavigationCacheInvalidated',
      data: {
        menuId: this.id,
        userId,
        tenantId,
        keysInvalidated: keysToDelete.length
      },
      timestamp: new Date(),
      version: this._version
    })
  }

  /**
   * Clear domain events
   */
  clearDomainEvents(): void {
    this._domainEvents = []
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(
    userId: string,
    tenantId: string | undefined,
    userRole: string | undefined,
    permissions: Permission[]
  ): string {
    const permissionHash = permissions.sort().join(',')
    return `${userId}:${tenantId || 'global'}:${userRole || 'none'}:${permissionHash}`
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): NavigationCacheEntry | undefined {
    return this._cache.get(key)
  }

  /**
   * Add to cache
   */
  private addToCache(key: string, entry: NavigationCacheEntry): void {
    this._cache.set(key, entry)
  }

  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(entry: NavigationCacheEntry): boolean {
    return new Date() > entry.expiresAt
  }

  /**
   * Remove child items recursively
   */
  private removeChildItemsRecursively(item: NavigationItem): void {
    item.children.forEach(child => {
      this._allItems.delete(child.id)
      this.removeChildItemsRecursively(child)
    })
  }

  /**
   * Increment version
   */
  private incrementVersion(): void {
    this._version = nanoid()
  }

  /**
   * Add domain event
   */
  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  /**
   * Convert to plain object
   */
  toObject() {
    return {
      id: this.id,
      config: this._config,
      version: this._version,
      rootItems: this.rootItems.map(item => item.toObject()),
      allItems: this.allItems.map(item => item.toObject())
    }
  }
}