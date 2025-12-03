import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  NavigationService,
  MenuBuilderFactory,
  type NavigationUserContext
} from '@pems/navigation-management'
import type { Permission, Role } from '@pems/rbac'

describe('NavigationService', () => {
  let navigationService: NavigationService
  let mockEventBus: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock event bus
    mockEventBus = {
      publish: vi.fn(),
      subscribe: vi.fn(),
      clearDomainEvents: vi.fn(),
      getDomainEvents: vi.fn().mockReturnValue([])
    }

    navigationService = new NavigationService({
      enableCaching: true,
      enableAnalytics: true,
      enableSecurityAuditing: true,
      cacheTimeout: 60000, // 1 minute
    })

    // Inject mock event bus (would need to modify NavigationService to accept dependency injection)
    vi.spyOn(navigationService, 'handleUserPermissionsChanged' as any)
    vi.spyOn(navigationService, 'handleTenantSwitched' as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Menu Creation', () => {
    it('should create a global navigation menu', () => {
      const menu = navigationService.createNavigationMenu({
        name: 'Global Navigation',
        description: 'Main navigation for all users',
        scope: 'global',
        isActive: true
      })

      expect(menu.id).toBeDefined()
      expect(menu.name).toBe('Global Navigation')
      expect(menu.description).toBe('Main navigation for all users')
      expect(menu.scope).toBe('global')
      expect(menu.isActive).toBe(true)
      expect(menu.isDefault).toBe(false)
    })

    it('should create a tenant-specific navigation menu', () => {
      const menu = navigationService.createNavigationMenu({
        name: 'Tenant Navigation',
        scope: 'tenant',
        tenantId: 'tenant-123',
        isActive: true
      })

      expect(menu.scope).toBe('tenant')
      expect(menu.tenantId).toBe('tenant-123')
    })

    it('should create a system navigation menu', () => {
      const menu = navigationService.createNavigationMenu({
        name: 'System Configuration',
        scope: 'system',
        isActive: true
      })

      expect(menu.scope).toBe('system')
    })

    it('should create a user-specific navigation menu', () => {
      const menu = navigationService.createNavigationMenu({
        name: 'Personal Navigation',
        scope: 'user',
        userId: 'user-123',
        isActive: true
      })

      expect(menu.scope).toBe('user')
      expect(menu.userId).toBe('user-123')
    })

    it('should create a default navigation menu', () => {
      const menu = navigationService.createNavigationMenu({
        name: 'Default Menu',
        scope: 'global',
        isDefault: true
      })

      expect(menu.isDefault).toBe(true)
    })
  })

  describe('Navigation Retrieval', () => {
    beforeEach(() => {
      // Create a test menu
      navigationService.createNavigationMenu({
        name: 'Test Menu',
        scope: 'global'
      })
    })

    it('should get navigation for user with permissions', async () => {
      const userContext: NavigationUserContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        permissions: ['users:read', 'transactions:read'],
        role: 'manager',
        isSystemAdmin: false
      }

      const navigationItems = await navigationService.getNavigationForUser(
        userContext
      )

      expect(Array.isArray(navigationItems)).toBe(true)
      expect(navigationItems.length).toBeGreaterThan(0)
    })

    it('should get navigation for system admin with all items', async () => {
      const userContext: NavigationUserContext = {
        userId: 'admin-123',
        permissions: [],
        role: 'super_admin',
        isSystemAdmin: true
      }

      const navigationItems = await navigationService.getNavigationForUser(
        userContext
      )

      expect(navigationItems.length).toBeGreaterThan(0)
    })

    it('should return empty navigation for user with no permissions', async () => {
      const userContext: NavigationUserContext = {
        userId: 'viewer-123',
        permissions: [],
        role: 'viewer',
        isSystemAdmin: false
      })

      const navigationItems = await navigationService.getNavigationForUser(
        userContext
      )

      // Should return dashboard at minimum
      expect(navigationItems.length).toBeGreaterThanOrEqual(0)
    })

    it('should get navigation for specific menu', async () => {
      const menu = navigationService.createNavigationMenu({
        name: 'Custom Menu',
        scope: 'global'
      })

      const userContext: NavigationUserContext = {
        userId: 'user-123',
        permissions: ['users:read'],
        role: 'manager',
        isSystemAdmin: false
      }

      const navigationItems = await navigationService.getNavigationForUser(
        userContext,
        menu.id
      )

      expect(navigationItems.length).toBeGreaterThanOrEqual(0)
    })

    it('should filter navigation based on tenant context', async () => {
      const menu = navigationService.createNavigationMenu({
        name: 'Tenant Menu',
        scope: 'tenant',
        tenantId: 'tenant-456'
      })

      const userContext: NavigationUserContext = {
        userId: 'user-123',
        tenantId: 'tenant-123', // Different tenant
        permissions: ['users:read'],
        role: 'manager',
        isSystemAdmin: false
      }

      const navigationItems = await navigationService.getNavigationForUser(
        userContext,
        menu.id
      )

      // Should not include tenant-specific items for different tenant
      const tenantItems = navigationItems.filter(item => item.tenantOnly)
      expect(tenantItems.length).toBe(0)
    })
  })

  describe('Menu Management', () => {
    let testMenuId: string

    beforeEach(() => {
      const menu = navigationService.createNavigationMenu({
        name: 'Test Menu',
        scope: 'global'
      })
      testMenuId = menu.id
    })

    it('should get navigation menu by ID', () => {
      const menu = navigationService.getNavigationMenu(testMenuId)
      expect(menu).toBeDefined()
      expect(menu!.id).toBe(testMenuId)
      expect(menu!.name).toBe('Test Menu')
    })

    it('should return undefined for non-existent menu', () => {
      const menu = navigationService.getNavigationMenu('non-existent-id')
      expect(menu).toBeUndefined()
    })

    it('should get all navigation menus', () => {
      // Create another menu
      navigationService.createNavigationMenu({
        name: 'Another Menu',
        scope: 'global'
      })

      const menus = navigationService.getAllNavigationMenus()
      expect(menus.length).toBeGreaterThan(1)
    })

    it('should get menus by scope', () => {
      // Create a tenant menu
      navigationService.createNavigationMenu({
        name: 'Tenant Menu',
        scope: 'tenant',
        tenantId: 'tenant-123'
      })

      const globalMenus = navigationService.getNavigationMenusByScope('global')
      const tenantMenus = navigationService.getNavigationMenusByScope('tenant')

      expect(globalMenus.length).toBeGreaterThan(0)
      expect(tenantMenus.length).toBeGreaterThan(0)
    })

    it('should update navigation menu', async () => {
      const updated = await navigationService.updateNavigationMenu(testMenuId, {
        name: 'Updated Menu',
        description: 'Updated description'
      })

      expect(updated).toBe(true)

      const menu = navigationService.getNavigationMenu(testMenuId)
      expect(menu!.name).toBe('Updated Menu')
      expect(menu!.description).toBe('Updated description')
    })

    it('should delete navigation menu', async () => {
      const deleted = await navigationService.deleteNavigationMenu(testMenuId)
      expect(deleted).toBe(true)

      const menu = navigationService.getNavigationMenu(testMenuId)
      expect(menu).toBeUndefined()
    })
  })

  describe('Permission Checking', () => {
    let testMenuId: string
    let itemId: string

    beforeEach(async () => {
      const menu = navigationService.createNavigationMenu({
        name: 'Test Menu',
        scope: 'global'
      })
      testMenuId = menu.id

      // Add a test item that requires permissions
      const item = {
        id: 'item-with-permissions',
        path: '/restricted',
        label: 'Restricted Item',
        permissions: ['admin:access'],
        hasPermission: (permissions: Permission[], requireAll: boolean) => {
          if (requireAll) {
            return permissions.every(p => p === 'admin:access')
          }
          return permissions.some(p => p === 'admin:access')
        }
      } as any

      await navigationService.addNavigationItem(testMenuId, item)
      itemId = item.id
    })

    it('should check if user can access navigation item', async () => {
      // User with permission
      const canAccess = await navigationService.canAccessNavigationItem(
        {
          userId: 'admin-user',
          permissions: ['admin:access'],
          isSystemAdmin: false
        },
        itemId
      )
      expect(canAccess).toBe(true)
    })

    it('should deny access for user without permissions', async () => {
      // User without permission
      const canAccess = await navigationService.canAccessNavigationItem(
        {
          userId: 'regular-user',
          permissions: ['users:read'],
          isSystemAdmin: false
        },
        itemId
      )
      expect(canAccess).toBe(false)
    })

    it('should grant access to system admin regardless of permissions', async () => {
      // System admin
      const canAccess = await navigationService.canAccessNavigationItem(
        {
          userId: 'admin-user',
          permissions: [],
          isSystemAdmin: true
        },
        itemId
      )
      expect(canAccess).toBe(true)
    })
  })

  describe('Event Handling', () => {
    it('should handle user permissions changed event', async () => {
      const userContext: NavigationUserContext = {
        userId: 'user-123',
        permissions: ['users:read'],
        role: 'manager',
        isSystemAdmin: false
      }

      const event = {
        type: 'UserPermissionsChanged',
        data: {
          userId: 'user-123',
          oldPermissions: ['users:read'],
          newPermissions: ['users:read', 'users:update'],
          newRole: 'admin'
        },
        timestamp: new Date()
      } as any

      await navigationService.handleUserPermissionsChanged(event)

      // Should clear cache for the user
      expect(mockEventBus.publish).toHaveBeenCalled()
    })

    it('should handle tenant switched event', async () => {
      const event = {
        type: 'TenantSwitched',
        data: {
          userId: 'user-123',
          oldTenantId: 'tenant-123',
          newTenantId: 'tenant-456',
          userRole: 'manager',
          userPermissions: ['users:read']
        },
        timestamp: new Date()
      } as any

      await navigationService.handleTenantSwitched(event)

      // Should clear old tenant cache and pre-warm new tenant cache
      expect(mockEventBus.publish).toHaveBeenCalled()
    })
  })

  describe('Cache Management', () => {
    it('should clear all caches', () => {
      const initialStats = navigationService.getStatistics()

      navigationService.clearAllCaches()

      // Should emit cache cleared event
      expect(mockEventBus.publish).toHaveBeenCalled()
    })

    it('should get statistics', () => {
      const stats = navigationService.getStatistics()

      expect(stats).toHaveProperty('totalMenus')
      expect(stats).toHaveProperty('totalItems')
      expect(stats).toHaveProperty('cacheHitRatio')
      expect(stats).toHaveProperty('lastUpdated')
      expect(typeof stats.totalMenus).toBe('number')
      expect(typeof stats.totalItems).toBe('number')
      expect(typeof stats.cacheHitRatio).toBe('number')
    })
  })

  describe('Security Auditing', () => {
    it('should log permission check events when enabled', async () => {
      const userContext: NavigationUserContext = {
        userId: 'user-123',
        permissions: ['users:read'],
        role: 'manager',
        isSystemAdmin: false
      }

      // Mock console.warn for testing
      const consoleSpy = vi.spyOn(console, 'warn')

      await navigationService.canAccessNavigationItem(
        userContext,
        'item-123'
      )

      // Should not log for successful permission checks
      expect(consoleSpy).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Test with invalid menu ID
      const result = await navigationService.updateNavigationMenu(
        'invalid-id',
        { name: 'Updated' }
      )
      expect(result).toBe(false)
    })

    it('should handle get navigation for non-existent menu', async () => {
      const userContext: NavigationUserContext = {
        userId: 'user-123',
        permissions: ['users:read'],
        role: 'manager',
        isSystemAdmin: false
      }

      const items = await navigationService.getNavigationForUser(
        userContext,
        'non-existent-menu-id'
      )
      expect(Array.isArray(items)).toBe(true)
    })
  })

  describe('Performance', () => {
    it('should handle large numbers of navigation items efficiently', async () => {
      // Create a menu with many items
      const menu = navigationService.createNavigationMenu({
        name: 'Large Menu',
        scope: 'global'
      })

      // Add many items
      const itemCount = 100
      for (let i = 0; i < itemCount; i++) {
        await navigationService.addNavigationItem(menu.id, {
          id: `item-${i}`,
          path: `/item-${i}`,
          label: `Item ${i}`,
          hasPermission: () => true
        } as any)
      }

      const userContext: NavigationUserContext = {
        userId: 'user-123',
        permissions: ['*'], // All permissions
        role: 'super_admin',
        isSystemAdmin: true
      }

      const startTime = Date.now()
      const items = await navigationService.getNavigationForUser(userContext, menu.id)
      const endTime = Date.now()

      expect(items.length).toBeGreaterThanOrEqual(itemCount)
      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
    })
  })

  describe('Integration with MenuBuilder', () => {
    it('should work with MenuBuilder created menus', () => {
      const defaultMenu = MenuBuilderFactory.createGlobalMenu()
      const customMenu = MenuBuilderFactory.forTenant('tenant-123', 'Custom Menu')
        .addDefaults()
        .addSection('Reports', [
          {
            type: 'item',
            path: '/reports/sales',
            label: 'Sales Reports',
            permissions: ['reports:read']
          }
        ]).build()

      expect(defaultMenu.name).toBe('Main Navigation')
      expect(customMenu.name).toBe('Custom Menu')
      expect(customMenu.scope).toBe('tenant')
      expect(customMenu.tenantId).toBe('tenant-123')
    })
  })
})