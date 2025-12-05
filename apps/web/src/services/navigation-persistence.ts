import {
  NavigationService,
  MenuBuilderFactory,
  NavigationRepository,
  type NavigationMenu,
  type NavigationMenuConfig,
  type NavigationItem
} from '@pems/navigation-management'
import { DomainEventBus } from '@pems/infrastructure-events'
import type { User } from 'better-auth/types'
import type { UserRole } from '../../../../packages/infrastructure/auth/src/rbac'

/**
 * Navigation Persistence Options
 */
export interface NavigationPersistenceOptions {
  enableAutoProvisioning?: boolean
  enableBackup?: boolean
  backupInterval?: number // in minutes
  maxBackupCount?: number
  storageKey?: string
}

/**
 * Navigation Backup Data
 */
export interface NavigationBackup {
  version: string
  timestamp: Date
  menus: Array<{
    config: NavigationMenuConfig
    items: any[]
  }>
  metadata: {
    createdBy?: string
    description?: string
    environment?: string
  }
}

/**
 * Navigation Persistence Service
 *
 * This service handles persistence and automatic provisioning of navigation
 * configurations. It provides:
 * - Automatic menu creation for new tenants/users
 * - Configuration backup and restore
 * - Migration support
 * - Environment-specific configurations
 */
export class NavigationPersistenceService {
  private static instance: NavigationPersistenceService
  private options: Required<NavigationPersistenceOptions>
  private navigationService: NavigationService
  private navigationRepository: NavigationRepository
  private eventBus: DomainEventBus
  private backupTimer?: number

  private constructor(options: NavigationPersistenceOptions = {}) {
    this.options = {
      enableAutoProvisioning: options.enableAutoProvisioning ?? true,
      enableBackup: options.enableBackup ?? true,
      backupInterval: options.backupInterval ?? 60, // 1 hour
      maxBackupCount: options.maxBackupCount ?? 10,
      storageKey: options.storageKey ?? 'navigation-backups'
    }

    this.eventBus = new DomainEventBus()
    this.navigationService = new NavigationService({
      enableCaching: true,
      enableAnalytics: false,
      enableSecurityAuditing: true
    })
    this.navigationRepository = new NavigationRepository(this.eventBus)

    // Setup periodic backups
    if (this.options.enableBackup) {
      this.setupPeriodicBackup()
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: NavigationPersistenceOptions): NavigationPersistenceService {
    if (!NavigationPersistenceService.instance) {
      NavigationPersistenceService.instance = new NavigationPersistenceService(options)
    }
    return NavigationPersistenceService.instance
  }

  /**
   * Initialize the persistence service
   */
  async initialize(user?: User & { roles?: UserRole[]; isSystemAdmin?: boolean }): Promise<void> {
    try {
      console.log('Initializing Navigation Persistence Service...')

      // Check if we need to create default menus
      if (this.options.enableAutoProvisioning && user) {
        await this.provisionDefaultMenus(user)
      }

      // Restore from backup if needed
      if (this.options.enableBackup) {
        await this.checkAndRestoreFromBackup()
      }

      console.log('Navigation Persistence Service initialized successfully')

    } catch (error) {
      console.error('Failed to initialize Navigation Persistence Service:', error)
      throw error
    }
  }

  /**
   * Provision default menus for a user/tenant
   */
  async provisionDefaultMenus(user: User & { roles?: UserRole[]; isSystemAdmin?: boolean }): Promise<void> {
    try {
      const tenantId = user.tenantId || 'default'
      const userRole = user.roles?.[0]?.role

      console.log(`Provisioning default menus for user ${user.id}, tenant ${tenantId}, role ${userRole}`)

      // Check if menus already exist for this tenant
      const existingMenus = await this.navigationRepository.getNavigationMenus({
        tenantId,
        isActive: true
      })

      if (existingMenus.length > 0) {
        console.log(`Found ${existingMenus.length} existing menus for tenant ${tenantId}`)
        return
      }

      // Create tenant-specific global menu
      const globalMenu = MenuBuilderFactory.createGlobalMenu()
      const tenantGlobalMenu = await this.navigationRepository.createNavigationMenu({
        name: `${tenantId} Global Navigation`,
        description: `Global navigation for tenant ${tenantId}`,
        scope: 'tenant',
        tenantId,
        isDefault: true,
        isActive: true
      })

      // Add items to the tenant menu
      for (const item of globalMenu.allItems.slice(0, 5)) { // Add first 5 items
        await this.navigationRepository.addNavigationItem(tenantGlobalMenu.id, item)
      }

      // Create role-specific menu if user has a specific role
      if (userRole && userRole !== 'viewer') {
        const roleMenu = MenuBuilderFactory.createRoleBasedMenu(userRole, tenantId)
        const tenantRoleMenu = await this.navigationRepository.createNavigationMenu({
          name: `${userRole} Navigation for ${tenantId}`,
          description: `Role-specific navigation for ${userRole} users in tenant ${tenantId}`,
          scope: 'tenant',
          tenantId,
          isDefault: false,
          isActive: true
        })

        // Add role-specific items
        for (const item of roleMenu.allItems) {
          await this.navigationRepository.addNavigationItem(tenantRoleMenu.id, item)
        }
      }

      // Create user-specific menu for system admins
      if (user.isSystemAdmin) {
        const systemMenu = MenuBuilderFactory.createSystemMenu()
        const userSystemMenu = await this.navigationRepository.createNavigationMenu({
          name: `${user.email} System Navigation`,
          description: `Personalized system navigation for ${user.email}`,
          scope: 'user',
          userId: user.id,
          isDefault: false,
          isActive: true
        })

        // Add system-specific items
        for (const item of systemMenu.allItems) {
          await this.navigationRepository.addNavigationItem(userSystemMenu.id, item)
        }
      }

      console.log(`Successfully provisioned menus for tenant ${tenantId}`)

    } catch (error) {
      console.error('Failed to provision default menus:', error)
      throw error
    }
  }

  /**
   * Create backup of current navigation configuration
   */
  async createBackup(
    metadata?: {
      createdBy?: string
      description?: string
      environment?: string
    }
  ): Promise<string> {
    try {
      console.log('Creating navigation backup...')

      const menus = await this.navigationRepository.getNavigationMenus()
      const backupData: NavigationBackup = {
        version: '1.0.0',
        timestamp: new Date(),
        menus: [],
        metadata: {
          ...metadata,
          environment: metadata?.environment || 'unknown'
        }
      }

      // Collect menu configurations and items
      for (const menu of menus) {
        const menuConfig = {
          id: menu.id,
          name: menu.name,
          description: menu.description,
          scope: menu.scope,
          tenantId: menu.tenantId,
          userId: menu.userId,
          isDefault: menu.isDefault,
          isActive: menu.isActive,
          version: menu.version
        }

        const menuItems = menu.allItems.map(item => item.toObject())

        backupData.menus.push({
          config: menuConfig,
          items: menuItems
        })
      }

      // Generate backup ID
      const backupId = `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Save to localStorage
      const backups = this.getBackups()
      backups[backupId] = backupData

      // Limit number of backups
      const backupEntries = Object.entries(backups)
      if (backupEntries.length > this.options.maxBackupCount) {
        // Sort by timestamp and remove oldest
        const sortedEntries = backupEntries.sort(([, a], [, b]) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )

        const entriesToRemove = sortedEntries.slice(0, sortedEntries.length - this.options.maxBackupCount)
        entriesToRemove.forEach(([key]) => delete backups[key])
      }

      localStorage.setItem(this.options.storageKey, JSON.stringify(backups))

      console.log(`Navigation backup created successfully: ${backupId}`)
      return backupId

    } catch (error) {
      console.error('Failed to create navigation backup:', error)
      throw error
    }
  }

  /**
   * Restore navigation from backup
   */
  async restoreBackup(backupId: string): Promise<void> {
    try {
      console.log(`Restoring navigation from backup: ${backupId}`)

      const backups = this.getBackups()
      const backup = backups[backupId]

      if (!backup) {
        throw new Error(`Backup ${backupId} not found`)
      }

      // Clear existing navigation (optional - could be made configurable)
      const existingMenus = await this.navigationRepository.getNavigationMenus()
      for (const menu of existingMenus) {
        await this.navigationRepository.deleteNavigationMenu(menu.id)
      }

      // Restore menus and items
      for (const menuData of backup.menus) {
        const restoredMenu = await this.navigationRepository.createNavigationMenu({
          name: menuData.config.name,
          description: menuData.config.description,
          scope: menuData.config.scope,
          tenantId: menuData.config.tenantId,
          userId: menuData.config.userId,
          isDefault: menuData.config.isDefault,
          isActive: menuData.config.isActive
        })

        // Restore items
        for (const itemData of menuData.items) {
          const restoredItem = NavigationItem.fromObject(itemData)
          await this.navigationRepository.addNavigationItem(restoredMenu.id, restoredItem)
        }
      }

      console.log(`Successfully restored navigation from backup: ${backupId}`)

    } catch (error) {
      console.error('Failed to restore navigation backup:', error)
      throw error
    }
  }

  /**
   * Get all available backups
   */
  getBackups(): Record<string, NavigationBackup> {
    try {
      const backupsData = localStorage.getItem(this.options.storageKey)
      return backupsData ? JSON.parse(backupsData) : {}
    } catch (error) {
      console.error('Failed to load backups:', error)
      return {}
    }
  }

  /**
   * Delete a backup
   */
  deleteBackup(backupId: string): boolean {
    try {
      const backups = this.getBackups()
      if (backups[backupId]) {
        delete backups[backupId]
        localStorage.setItem(this.options.storageKey, JSON.stringify(backups))
        console.log(`Backup ${backupId} deleted successfully`)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to delete backup:', error)
      return false
    }
  }

  /**
   * Export navigation configuration
   */
  async exportConfiguration(): Promise<string> {
    try {
      const backup = await this.createBackup({
        description: 'Manual export',
        environment: 'export'
      })

      return JSON.stringify({
        backupId: backup,
        data: this.getBackups()[backup],
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      }, null, 2)

    } catch (error) {
      console.error('Failed to export navigation configuration:', error)
      throw error
    }
  }

  /**
   * Import navigation configuration
   */
  async importConfiguration(configurationJson: string): Promise<void> {
    try {
      console.log('Importing navigation configuration...')

      const config = JSON.parse(configurationJson)

      if (!config.backupId || !config.data) {
        throw new Error('Invalid configuration format')
      }

      // Add backup to storage
      const backups = this.getBackups()
      backups[config.backupId] = config.data
      localStorage.setItem(this.options.storageKey, JSON.stringify(backups))

      // Restore from backup
      await this.restoreBackup(config.backupId)

      console.log('Navigation configuration imported successfully')

    } catch (error) {
      console.error('Failed to import navigation configuration:', error)
      throw error
    }
  }

  /**
   * Setup periodic backup
   */
  private setupPeriodicBackup(): void {
    const intervalMs = this.options.backupInterval * 60 * 1000

    this.backupTimer = window.setInterval(async () => {
      try {
        await this.createBackup({
          description: 'Automatic periodic backup',
          environment: 'auto-backup'
        })
      } catch (error) {
        console.error('Failed to create periodic backup:', error)
      }
    }, intervalMs)

    console.log(`Periodic backup setup: every ${this.options.backupInterval} minutes`)
  }

  /**
   * Check and restore from backup if needed
   */
  private async checkAndRestoreFromBackup(): Promise<void> {
    // This could implement logic like:
    // - Check if navigation is empty and restore from latest backup
    // - Version migration handling
    // - Corruption detection and recovery
    console.log('Checking for backup restoration requirements...')
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer)
      this.backupTimer = undefined
    }
  }
}

/**
 * Get the navigation persistence service instance
 */
export function getNavigationPersistenceService(options?: NavigationPersistenceOptions): NavigationPersistenceService {
  return NavigationPersistenceService.getInstance(options)
}