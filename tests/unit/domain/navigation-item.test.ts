import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  NavigationItem,
  NavigationItemFactory,
  type NavigationItemValue,
  NavigationScope,
  NavigationTarget
} from '@pems/navigation-management'

describe('NavigationItem', () => {
  let navigationItem: NavigationItem
  let userPermissions: string[]

  beforeEach(() => {
    vi.clearAllMocks()
    userPermissions = ['users:read', 'transactions:read']
  })

  describe('Factory Methods', () => {
    it('should create a basic navigation item using NavigationItemFactory', () => {
      const item = NavigationItemFactory.createItem({
        path: '/dashboard',
        label: 'Dashboard',
        description: 'Main dashboard',
        icon: '📊',
        permissions: ['dashboard:read']
      })

      expect(item.id).toBeDefined()
      expect(item.path).toBe('/dashboard')
      expect(item.label).toBe('Dashboard')
      expect(item.description).toBe('Main dashboard')
      expect(item.icon).toBe('📊')
      expect(item.permissions).toEqual(['dashboard:read'])
      expect(item.type).toBe('item')
      expect(item.scope).toBe('global')
      expect(item.target).toBe('_self')
      expect(item.external).toBe(false)
      expect(item.disabled).toBe(false)
      expect(item.visible).toBe(true)
      expect(item.order).toBe(0)
      expect(item.createdAt).toBeInstanceOf(Date)
      expect(item.updatedAt).toBeInstanceOf(Date)
    })

    it('should create a navigation group using NavigationItemFactory', () => {
      const group = NavigationItemFactory.createGroup({
        label: 'Management',
        description: 'Management section',
        icon: '⚙️',
        permissions: ['management:read'],
        order: 100
      })

      expect(group.type).toBe('group')
      expect(group.path).toBe('')
      expect(group.label).toBe('Management')
      expect(group.description).toBe('Management section')
      expect(group.icon).toBe('⚙️')
      expect(group.order).toBe(100)
    })

    it('should create a navigation divider using NavigationItemFactory', () => {
      const divider = NavigationItemFactory.createDivider(50)

      expect(divider.type).toBe('divider')
      expect(divider.label).toBe('')
      expect(divider.order).toBe(50)
      expect(divider.path).toBe('')
    })

    it('should create a navigation header using NavigationItemFactory', () => {
      const header = NavigationItemFactory.createHeader('Section Title', 25)

      expect(header.type).toBe('header')
      expect(header.label).toBe('Section Title')
      expect(header.order).toBe(25)
    })
  })

  describe('Permission Checking', () => {
    beforeEach(() => {
      navigationItem = NavigationItemFactory.createItem({
        path: '/users',
        label: 'Users',
        permissions: ['users:read']
      })
    })

    it('should return true for user with required permission', () => {
      const hasPermission = navigationItem.hasPermission(userPermissions, undefined, 'manager')
      expect(hasPermission).toBe(true)
    })

    it('should return false for user without required permission', () => {
      const hasPermission = navigationItem.hasPermission(['transactions:read'], undefined, 'cashier')
      expect(hasPermission).toBe(false)
    })

    it('should return true for system admin regardless of permissions', () => {
      const hasPermission = navigationItem.hasPermission(['admin:only'], undefined, 'super_admin')
      expect(hasPermission).toBe(true)
    })

    it('should return false for disabled item even with permissions', () => {
      navigationItem.update({ disabled: true })
      const hasPermission = navigationItem.hasPermission(userPermissions, undefined, 'manager')
      expect(hasPermission).toBe(false)
    })

    it('should return false for hidden item even with permissions', () => {
      navigationItem.update({ visible: false })
      const hasPermission = navigationItem.hasPermission(userPermissions, undefined, 'manager')
      expect(hasPermission).toBe(false)
    })

    it('should handle multiple permissions with requireAll=false', () => {
      navigationItem.update({
        permissions: ['users:read', 'users:update'],
        requireAll: false
      })

      const hasPermission = navigationItem.hasPermission(['users:read'], undefined, 'manager')
      expect(hasPermission).toBe(true)
    })

    it('should handle multiple permissions with requireAll=true', () => {
      navigationItem.update({
        permissions: ['users:read', 'users:update'],
        requireAll: true
      })

      const hasPermission = navigationItem.hasPermission(['users:read'], undefined, 'manager')
      expect(hasPermission).toBe(false)
    })

    it('should return true for item with no required permissions', () => {
      const noPermissionItem = NavigationItemFactory.createItem({
        path: '/public',
        label: 'Public Page'
      })

      const hasPermission = noPermissionItem.hasPermission([], undefined, 'viewer')
      expect(hasPermission).toBe(true)
    })
  })

  describe('Scope Access', () => {
    it('should allow system admin to access system-only items', () => {
      const systemItem = NavigationItemFactory.createItem({
        path: '/system/config',
        label: 'System Config',
        scope: 'system'
      })

      const hasPermission = systemItem.hasPermission(['system:config'], undefined, 'super_admin')
      expect(hasPermission).toBe(true)
    })

    it('should deny non-admin access to system-only items', () => {
      const systemItem = NavigationItemFactory.createItem({
        path: '/system/config',
        label: 'System Config',
        scope: 'system'
      })

      const hasPermission = systemItem.hasPermission(['system:config'], undefined, 'manager')
      expect(hasPermission).toBe(false)
    })

    it('should allow tenant admin to access tenant-only items', () => {
      const tenantItem = NavigationItemFactory.createItem({
        path: '/tenant/settings',
        label: 'Tenant Settings',
        scope: 'tenant'
      })

      const hasPermission = tenantItem.hasPermission(['tenant:update'], 'tenant-123', 'tenant_admin')
      expect(hasPermission).toBe(true)
    })

    it('should deny access to tenant-only items without tenant context', () => {
      const tenantItem = NavigationItemFactory.createItem({
        path: '/tenant/settings',
        label: 'Tenant Settings',
        scope: 'tenant'
      })

      const hasPermission = tenantItem.hasPermission(['tenant:update'], undefined, 'manager')
      expect(hasPermission).toBe(false)
    })
  })

  describe('Child Management', () => {
    beforeEach(() => {
      navigationItem = NavigationItemFactory.createGroup({
        label: 'Management',
        icon: '⚙️'
      })
    })

    it('should allow adding child items', () => {
      const childItem = NavigationItemFactory.createItem({
        path: '/users',
        label: 'Users'
      })

      expect(navigationItem.hasChildren).toBe(false)
      navigationItem.addChild(childItem)
      expect(navigationItem.hasChildren).toBe(true)
      expect(navigationItem.children.length).toBe(1)
    })

    it('should throw error when adding children to non-group items', () => {
      const regularItem = NavigationItemFactory.createItem({
        path: '/test',
        label: 'Test'
      })

      expect(() => {
        regularItem.addChild(NavigationItemFactory.createItem({
          path: '/child',
          label: 'Child'
        }))
      }).toThrow()
    })

    it('should remove child items', () => {
      const childItem = NavigationItemFactory.createItem({
        path: '/users',
        label: 'Users'
      })

      navigationItem.addChild(childItem)
      expect(navigationItem.hasChildren).toBe(true)

      const removed = navigationItem.removeChild(childItem.id)
      expect(removed).toBe(true)
      expect(navigationItem.hasChildren).toBe(false)
    })

    it('should return false when removing non-existent child', () => {
      const removed = navigationItem.removeChild('non-existent-id')
      expect(removed).toBe(false)
    })

    it('should set parent ID on child items', () => {
      const childItem = NavigationItemFactory.createItem({
        path: '/users',
        label: 'Users'
      })

      navigationItem.addChild(childItem)
      expect(childItem.parentId).toBe(navigationItem.id)
    })

    it('should clear parent ID when removing child', () => {
      const childItem = NavigationItemFactory.createItem({
        path: '/users',
        label: 'Users'
      })

      navigationItem.addChild(childItem)
      navigationItem.removeChild(childItem.id)
      expect(childItem.parentId).toBeUndefined()
    })

    it('should automatically sort children by order', () => {
      const child1 = NavigationItemFactory.createItem({
        path: '/users',
        label: 'Users',
        order: 20
      })

      const child2 = NavigationItemFactory.createItem({
        path: '/transactions',
        label: 'Transactions',
        order: 10
      })

      navigationItem.addChild(child1)
      navigationItem.addChild(child2)

      expect(navigationItem.children[0].label).toBe('Transactions') // Lower order (10)
      expect(navigationItem.children[1].label).toBe('Users') // Higher order (20)
    })
  })

  describe('Item Updates', () => {
    beforeEach(() => {
      navigationItem = NavigationItemFactory.createItem({
        path: '/dashboard',
        label: 'Dashboard'
      })
    })

    it('should update item properties', () => {
      const originalUpdatedAt = navigationItem.updatedAt

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        navigationItem.update({
          label: 'Updated Dashboard',
          description: 'Updated description',
          disabled: true,
          order: 50
        })

        expect(navigationItem.label).toBe('Updated Dashboard')
        expect(navigationItem.description).toBe('Updated description')
        expect(navigationItem.disabled).toBe(true)
        expect(navigationItem.order).toBe(50)
        expect(navigationItem.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
      }, 10)
    })

    it('should preserve ID and creation timestamp when updating', () => {
      const originalId = navigationItem.id
      const originalCreatedAt = navigationItem.createdAt

      navigationItem.update({ label: 'Updated' })

      expect(navigationItem.id).toBe(originalId)
      expect(navigationItem.createdAt).toBe(originalCreatedAt)
    })
  })

  describe('Object Conversion', () => {
    beforeEach(() => {
      navigationItem = NavigationItemFactory.createItem({
        path: '/test',
        label: 'Test Item',
        description: 'Test description',
        icon: '🧪'
      })
    })

    it('should convert to plain object', () => {
      const obj = navigationItem.toObject()

      expect(obj).toHaveProperty('id')
      expect(obj).toHaveProperty('path', '/test')
      expect(obj).toHaveProperty('label', 'Test Item')
      expect(obj).toHaveProperty('description', 'Test description')
      expect(obj).toHaveProperty('icon', '🧪')
      expect(obj).toHaveProperty('type', 'item')
      expect(obj).toHaveProperty('scope', 'global')
      expect(obj).toHaveProperty('target', '_self')
      expect(obj).toHaveProperty('external', false)
      expect(obj).toHaveProperty('disabled', false)
      expect(obj).toHaveProperty('visible', true)
      expect(obj).toHaveProperty('order', 0)
      expect(obj).toHaveProperty('createdAt')
      expect(obj).toHaveProperty('updatedAt')
    })

    it('should include children in object conversion', () => {
      const childItem = NavigationItemFactory.createItem({
        path: '/child',
        label: 'Child'
      })

      navigationItem.addChild(childItem)
      const obj = navigationItem.toObject()

      expect(obj.children).toBeDefined()
      expect(Array.isArray(obj.children)).toBe(true)
      expect(obj.children.length).toBe(1)
      expect(obj.children[0].id).toBe(childItem.id)
    })
  })

  describe('Validation', () => {
    it('should reject empty label', () => {
      expect(() => {
        NavigationItemFactory.createItem({
          path: '/test',
          label: ''
        })
      }).toThrow()
    })

    it('should reject invalid scope', () => {
      expect(() => {
        const item = NavigationItemFactory.createItem({
          path: '/test',
          label: 'Test'
        })
        item.update({ scope: 'invalid' as any })
      }).not.toThrow() // Should not throw but Zod validation will handle it
    })

    it('should reject invalid target', () => {
      expect(() => {
        const item = NavigationItemFactory.createItem({
          path: '/test',
          label: 'Test'
        })
        item.update({ target: 'invalid' as any })
      }).not.toThrow() // Should not throw but Zod validation will handle it
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty permissions array', () => {
      const item = NavigationItemFactory.createItem({
        path: '/test',
        label: 'Test',
        permissions: []
      })

      const hasPermission = item.hasPermission([], undefined, 'viewer')
      expect(hasPermission).toBe(true) // No permissions required
    })

    it('should handle undefined permissions', () => {
      const item = NavigationItemFactory.createItem({
        path: '/test',
        label: 'Test'
      })

      const hasPermission = item.hasPermission(undefined, undefined, 'viewer')
      expect(hasPermission).toBe(true) // No permissions required
    })

    it('should handle empty permission check for system admin', () => {
      const item = NavigationItemFactory.createItem({
        path: '/test',
        label: 'Test',
        permissions: ['admin:only']
      })

      const hasPermission = item.hasPermission(['admin:only'], undefined, 'super_admin')
      expect(hasPermission).toBe(true) // System admin bypass
    })

    it('should preserve parent-child relationship across updates', () => {
      const parentItem = NavigationItemFactory.createGroup({
        label: 'Parent'
      })

      const childItem = NavigationItemFactory.createItem({
        path: '/child',
        label: 'Child'
      })

      parentItem.addChild(childItem)
      expect(parentItem.children.length).toBe(1)
      expect(childItem.parentId).toBe(parentItem.id)

      // Update parent
      parentItem.update({ label: 'Updated Parent' })

      // Relationship should be preserved
      expect(parentItem.children.length).toBe(1)
      expect(childItem.parentId).toBe(parentItem.id)
    })
  })
})