import { createSignal, onMount, onCleanup } from 'solid-js'
import type { User } from 'better-auth/types'
import type { Permission, Role, UserRole } from '../../../../packages/infrastructure/auth/src/rbac'
import { getNavigationPersistenceService, type NavigationPersistenceOptions } from './navigation-persistence'
import { getTempNavigationService, type TempNavigationItem } from './navigation-temp'

// Try to import the real navigation service, fall back to temporary
let NavigationService: any = null
let NavigationItem: any = null
try {
  const navModule = require('@pems/navigation-management')
  NavigationService = navModule.NavigationService
  NavigationItem = navModule.NavigationItem
} catch (error) {
  console.warn('Navigation service not available, using temporary service:', error.message)
}

/**
 * Navigation Service Bridge Options
 */
export interface NavigationServiceBridgeOptions {
  enableCaching?: boolean
  enableAnalytics?: boolean
  enableRealTimeUpdates?: boolean
  cacheTimeout?: number
  fallbackToStatic?: boolean
  enablePersistence?: boolean
  persistenceOptions?: NavigationPersistenceOptions
}

/**
 * Navigation Service Bridge
 *
 * This bridge connects the NavigationService from the navigation-management module
 * to the Solid.js frontend components, providing proper error handling,
 * fallback mechanisms, and real-time updates.
 */
export class NavigationServiceBridge {
  private static instance: NavigationServiceBridge
  private navigationService: any = null
  private navigationRepository: any = null
  private eventBus: any = null
  private tempNavigationService = getTempNavigationService()
  private isInitialized = false
  private initializationPromise?: Promise<void>
  private options: Required<NavigationServiceBridgeOptions>
  private persistenceService = getNavigationPersistenceService()
  private usingTempService = false

  // State management
  private [items] = createSignal<any[]>([])
  private [loading] = createSignal(false)
  private [error] = createSignal<string>()
  private [lastLoadTime] = createSignal<Date>()
  private [isServiceAvailable] = createSignal(true)

  // Event listeners
  private permissionChangeListeners: Array<(permissions: Permission[]) => void> = []
  private tenantChangeListeners: Array<(tenantId: string | undefined) => void> = []

  private constructor(options: NavigationServiceBridgeOptions = {}) {
    this.options = {
      enableCaching: options.enableCaching ?? true,
      enableAnalytics: options.enableAnalytics ?? true,
      enableRealTimeUpdates: options.enableRealTimeUpdates ?? true,
      cacheTimeout: options.cacheTimeout ?? 15,
      fallbackToStatic: options.fallbackToStatic ?? true,
      enablePersistence: options.enablePersistence ?? true,
      persistenceOptions: options.persistenceOptions ?? {}
    }

    // Try to initialize the real navigation service
    if (NavigationService && NavigationItem) {
      try {
        this.navigationService = new NavigationService({
          enableCaching: this.options.enableCaching,
          enableAnalytics: this.options.enableAnalytics,
          enableSecurityAuditing: true,
          cacheTimeout: this.options.cacheTimeout
        })

        // Try to initialize other services
        const DomainEventBus = require('@pems/infrastructure-events').DomainEventBus
        const NavigationRepository = require('@pems/navigation-management').NavigationRepository

        this.eventBus = new DomainEventBus()
        this.navigationRepository = new NavigationRepository(this.eventBus)

        this.usingTempService = false
        console.log('Using real navigation service')
      } catch (error) {
        console.warn('Failed to initialize real navigation service, using temporary service:', error)
        this.usingTempService = true
      }
    } else {
      this.usingTempService = true
      console.log('Navigation service not available, using temporary service')
    }

    // Setup event listeners
    this.setupEventListeners()
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: NavigationServiceBridgeOptions): NavigationServiceBridge {
    if (!NavigationServiceBridge.instance) {
      NavigationServiceBridge.instance = new NavigationServiceBridge(options)
    }
    return NavigationServiceBridge.instance
  }

  /**
   * Initialize the navigation service bridge
   */
  async initialize(user?: User & { roles?: UserRole[]; isSystemAdmin?: boolean }): Promise<void> {
    if (this.isInitialized) return

    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this._initialize(user)
    return this.initializationPromise
  }

  private async _initialize(user?: User & { roles?: UserRole[]; isSystemAdmin?: boolean }): Promise<void> {
    try {
      console.log('Initializing Navigation Service Bridge...')

      // Check if navigation management module is available
      if (!this.isServiceAvailable()) {
        console.warn('Navigation service not available, using fallback')
        this[isServiceAvailable](false)
        return
      }

      // Create default navigation menu if none exists
      if (this.navigationService.getAllNavigationMenus().length === 0) {
        console.log('Creating default navigation menu...')
        const defaultMenu = MenuBuilderFactory.createGlobalMenu()
        this.navigationService.createNavigationMenu(defaultMenu.getMenuConfig())
      }

      // Initialize event subscriptions
      if (this.options.enableRealTimeUpdates) {
        this.setupEventSubscriptions()
      }

      // Initialize persistence service if enabled
      if (this.options.enablePersistence && user) {
        await this.persistenceService.initialize(user)
      }

      this.isInitialized = true
      console.log('Navigation Service Bridge initialized successfully')

    } catch (error) {
      console.error('Failed to initialize Navigation Service Bridge:', error)
      this[error]('Failed to initialize navigation service')
      this[isServiceAvailable](false)

      // If fallback is enabled, create static navigation
      if (this.options.fallbackToStatic) {
        console.log('Using fallback static navigation')
        this.createStaticNavigation()
      }
    }
  }

  /**
   * Get navigation for the current user
   */
  async getNavigationForUser(
    user: User & { roles?: UserRole[]; isSystemAdmin?: boolean },
    tenantId?: string
  ): Promise<any[]> {
    try {
      this[loading](true)
      this[error]()

      // Use temporary service if real service is not available
      if (this.usingTempService) {
        console.log('Using temporary navigation service')
        const items = await this.tempNavigationService.getNavigationForUser(user)
        this[items](items)
        this[lastLoadTime](new Date())
        return items
      }

      // Ensure bridge is initialized
      if (!this.isInitialized) {
        await this.initialize(user)
      }

      // If service is not available, return static navigation
      if (!this[isServiceAvailable]()) {
        return this.getStaticNavigation(user, tenantId)
      }

      // Try to use real navigation service
      try {
        // Build user context
        const userContext = this.buildUserContext(user, tenantId)

        // Get navigation from service
        let navigationItems = await this.navigationService.getNavigationForUser(userContext)

        // If no items returned, create minimal navigation
        if (navigationItems.length === 0) {
          console.log('No navigation items returned, creating minimal navigation')
          navigationItems = this.getStaticNavigation(user, tenantId)
        }

        this[items](navigationItems)
        this[lastLoadTime](new Date())

        return navigationItems

      } catch (serviceError) {
        console.warn('Navigation service failed, falling back to temporary service:', serviceError)
        this.usingTempService = true

        const items = await this.tempNavigationService.getNavigationForUser(user)
        this[items](items)
        this[lastLoadTime](new Date())
        return items
      }

    } catch (error) {
      console.error('Error getting navigation for user:', error)
      this[error]('Failed to load navigation')

      // Return static navigation as fallback
      const fallbackItems = this.getStaticNavigation(user, tenantId)
      this[items](fallbackItems)
      return fallbackItems

    } finally {
      this[loading](false)
    }
  }

  /**
   * Check if user can access a navigation item
   */
  async canAccessNavigationItem(
    user: User & { roles?: UserRole[]; isSystemAdmin?: boolean },
    itemId: string,
    tenantId?: string
  ): Promise<boolean> {
    if (!this[isServiceAvailable]()) {
      return this.checkStaticAccess(user, itemId, tenantId)
    }

    try {
      const userContext = this.buildUserContext(user, tenantId)
      return await this.navigationService.canAccessNavigationItem(userContext, itemId)
    } catch (error) {
      console.warn('Error checking navigation access, using static check:', error)
      return this.checkStaticAccess(user, itemId, tenantId)
    }
  }

  /**
   * Add navigation item
   */
  async addNavigationItem(menuId: string, item: NavigationItem): Promise<boolean> {
    if (!this[isServiceAvailable]()) {
      console.warn('Navigation service not available, cannot add item')
      return false
    }

    try {
      const success = this.navigationService.addNavigationItem(menuId, item)
      if (success) {
        // Trigger refresh
        await this.refreshNavigation()
      }
      return success
    } catch (error) {
      console.error('Error adding navigation item:', error)
      return false
    }
  }

  /**
   * Remove navigation item
   */
  async removeNavigationItem(menuId: string, itemId: string): Promise<boolean> {
    if (!this[isServiceAvailable]()) {
      console.warn('Navigation service not available, cannot remove item')
      return false
    }

    try {
      const success = this.navigationService.removeNavigationItem(menuId, itemId)
      if (success) {
        // Trigger refresh
        await this.refreshNavigation()
      }
      return success
    } catch (error) {
      console.error('Error removing navigation item:', error)
      return false
    }
  }

  /**
   * Get navigation statistics
   */
  getStatistics(menuId?: string) {
    if (!this[isServiceAvailable]()) {
      return {
        totalItems: this[items]().length,
        rootItems: this[items]().filter(item => !item.parentId).length,
        itemsWithPermissions: 0,
        cacheHitRatio: 0,
        lastUpdated: this[lastLoadTime]() || new Date()
      }
    }

    return this.navigationService.getStatistics(menuId)
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    if (this[isServiceAvailable]()) {
      this.navigationService.clearAllCaches()
    }
  }

  /**
   * Refresh navigation
   */
  async refreshNavigation(): Promise<void> {
    // This will be implemented by the calling component
    // by calling getNavigationForUser again
    console.log('Navigation refresh requested')
  }

  /**
   * Get current state
   */
  getState() {
    return {
      items: this[items](),
      loading: this[loading](),
      error: this[error](),
      lastLoadTime: this[lastLoadTime](),
      isServiceAvailable: this[isServiceAvailable](),
      isInitialized: this.isInitialized
    }
  }

  /**
   * Subscribe to permission changes
   */
  onPermissionChange(callback: (permissions: Permission[]) => void): () => void {
    this.permissionChangeListeners.push(callback)
    return () => {
      const index = this.permissionChangeListeners.indexOf(callback)
      if (index > -1) {
        this.permissionChangeListeners.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to tenant changes
   */
  onTenantChange(callback: (tenantId: string | undefined) => void): () => void {
    this.tenantChangeListeners.push(callback)
    return () => {
      const index = this.tenantChangeListeners.indexOf(callback)
      if (index > -1) {
        this.tenantChangeListeners.splice(index, 1)
      }
    }
  }

  /**
   * Get access to the persistence service for backup/restore operations
   */
  getPersistenceService() {
    return this.persistenceService
  }

  /**
   * Create backup of current navigation configuration
   */
  async createBackup(metadata?: {
    createdBy?: string
    description?: string
    environment?: string
  }): Promise<string> {
    if (!this.options.enablePersistence) {
      throw new Error('Persistence service is not enabled')
    }
    return await this.persistenceService.createBackup(metadata)
  }

  /**
   * Restore navigation from backup
   */
  async restoreBackup(backupId: string): Promise<void> {
    if (!this.options.enablePersistence) {
      throw new Error('Persistence service is not enabled')
    }
    await this.persistenceService.restoreBackup(backupId)
    await this.refreshNavigation()
  }

  /**
   * Export navigation configuration
   */
  async exportConfiguration(): Promise<string> {
    if (!this.options.enablePersistence) {
      throw new Error('Persistence service is not enabled')
    }
    return await this.persistenceService.exportConfiguration()
  }

  /**
   * Import navigation configuration
   */
  async importConfiguration(configurationJson: string): Promise<void> {
    if (!this.options.enablePersistence) {
      throw new Error('Persistence service is not enabled')
    }
    await this.persistenceService.importConfiguration(configurationJson)
    await this.refreshNavigation()
  }

  /**
   * Private methods
   */

  private isServiceAvailable(): boolean {
    try {
      // Check if NavigationService is properly imported and functional
      return typeof this.navigationService === 'object' &&
             this.navigationService !== null &&
             typeof this.navigationService.getNavigationForUser === 'function'
    } catch (error) {
      return false
    }
  }

  private buildUserContext(
    user: User & { roles?: UserRole[]; isSystemAdmin?: boolean },
    tenantId?: string
  ): NavigationUserContext {
    // Extract permissions from user roles
    const permissions: Permission[] = []

    if (user.roles) {
      for (const userRole of user.roles) {
        permissions.push(...userRole.permissions)
      }
    }

    // Get primary role
    const primaryRole = user.roles?.[0]?.role

    return {
      userId: user.id || '',
      tenantId,
      permissions,
      role: primaryRole,
      isSystemAdmin: user.isSystemAdmin || primaryRole === 'super_admin'
    }
  }

  private getStaticNavigation(
    user: User & { roles?: UserRole[]; isSystemAdmin?: boolean },
    tenantId?: string
  ): NavigationItem[] {
    // Return basic static navigation based on user roles
    const basicItems: NavigationItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: '📊',
        order: 1,
        visible: true,
        disabled: false,
        permission: 'dashboard:view' as Permission
      }
    ]

    // Add role-based items
    const permissions = user.roles?.flatMap(role => role.permissions) || []

    if (permissions.includes('users:read' as Permission)) {
      basicItems.push({
        id: 'users',
        label: 'Users',
        path: '/users',
        icon: '👥',
        order: 2,
        visible: true,
        disabled: false,
        permission: 'users:read' as Permission
      })
    }

    if (permissions.includes('transactions:read' as Permission)) {
      basicItems.push({
        id: 'transactions',
        label: 'Transactions',
        path: '/transactions',
        icon: '💳',
        order: 3,
        visible: true,
        disabled: false,
        permission: 'transactions:read' as Permission
      })
    }

    if (permissions.includes('reports:read' as Permission)) {
      basicItems.push({
        id: 'reports',
        label: 'Reports',
        path: '/reports',
        icon: '📈',
        order: 4,
        visible: true,
        disabled: false,
        permission: 'reports:read' as Permission
      })
    }

    // System admin only
    if (user.isSystemAdmin || permissions.includes('system:config' as Permission)) {
      basicItems.push({
        id: 'admin',
        label: 'Administration',
        path: '/admin',
        icon: '⚙️',
        order: 10,
        visible: true,
        disabled: false,
        systemOnly: true,
        permission: 'system:config' as Permission
      })
    }

    return basicItems
  }

  private checkStaticAccess(
    user: User & { roles?: UserRole[]; isSystemAdmin?: boolean },
    itemId: string,
    tenantId?: string
  ): boolean {
    const permissions = user.roles?.flatMap(role => role.permissions) || []

    // System admin bypass
    if (user.isSystemAdmin) {
      return true
    }

    // Check based on item ID
    const itemPermissions: Record<string, Permission[]> = {
      'dashboard': ['dashboard:view' as Permission],
      'users': ['users:read' as Permission],
      'transactions': ['transactions:read' as Permission],
      'reports': ['reports:read' as Permission],
      'admin': ['system:config' as Permission]
    }

    const requiredPermissions = itemPermissions[itemId]
    if (!requiredPermissions) {
      return true // No specific permission required
    }

    return requiredPermissions.some(permission => permissions.includes(permission))
  }

  private createStaticNavigation(): void {
    // Create basic static navigation as fallback
    this[items]([
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: '📊',
        order: 1,
        visible: true,
        disabled: false
      }
    ])
  }

  private setupEventListeners(): void {
    // Setup internal event listeners
    // This will be expanded based on specific event types
  }

  private setupEventSubscriptions(): void {
    // Setup subscriptions to domain events
    // This will be implemented based on the specific event types from the navigation module
  }
}

/**
 * Get the navigation service bridge instance
 */
export function getNavigationServiceBridge(options?: NavigationServiceBridgeOptions): NavigationServiceBridge {
  return NavigationServiceBridge.getInstance(options)
}