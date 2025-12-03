import type { Permission, Role } from '@pems/auth'
import {
  NavigationItem,
  NavigationItemFactory,
  NavigationMenu,
  type NavigationItemValue,
  type NavigationScope
} from '../domain'

/**
 * Menu Builder Configuration
 */
export interface MenuBuilderConfig {
  scope: NavigationScope
  tenantId?: string
  userId?: string
  name: string
  description?: string
  isDefault?: boolean
}

/**
 * Navigation Item Definition
 */
export interface NavigationItemDefinition {
  path: string
  label: string
  description?: string
  icon?: string
  iconType?: 'emoji' | 'svg' | 'font' | 'image'
  permissions?: Permission[]
  requireAll?: boolean
  scope?: NavigationScope
  target?: '_self' | '_blank' | '_parent' | '_top'
  external?: boolean
  disabled?: boolean
  visible?: boolean
  badge?: string | number
  badgeType?: 'notification' | 'count' | 'status' | 'label'
  badgeColor?: string
  order?: number
  metadata?: Record<string, any>
  children?: NavigationItemDefinition[]
}

/**
 * Menu Section Definition
 */
export interface MenuSectionDefinition {
  type: 'section'
  label: string
  description?: string
  icon?: string
  permissions?: Permission[]
  scope?: NavigationScope
  order?: number
  children?: NavigationItemDefinition[]
}

/**
 * Menu Divider Definition
 */
export interface MenuDividerDefinition {
  type: 'divider'
  order?: number
}

/**
 * Menu Header Definition
 */
export interface MenuHeaderDefinition {
  type: 'header'
  label: string
  order?: number
}

/**
 * Unified Menu Definition
 */
export type MenuDefinition = (
  | MenuSectionDefinition
  | MenuDividerDefinition
  | MenuHeaderDefinition
  | NavigationItemDefinition
)

/**
 * Default navigation definitions based on PEMS RBAC
 */
export const DEFAULT_NAVIGATION_DEFINITIONS: MenuDefinition[] = [
  {
    type: 'item',
    path: '/',
    label: 'Dashboard',
    description: 'Overview and statistics',
    icon: '📊',
    iconType: 'emoji',
    order: 0
  },
  {
    type: 'section',
    label: 'User Management',
    description: 'Manage users and roles',
    icon: '👥',
    permissions: ['users:read'],
    order: 100,
    children: [
      {
        type: 'item',
        path: '/users',
        label: 'User List',
        description: 'View all users',
        permissions: ['users:read'],
        order: 110
      },
      {
        type: 'item',
        path: '/users/create',
        label: 'Add User',
        description: 'Create new user',
        permissions: ['users:create'],
        order: 120
      },
      {
        type: 'item',
        path: '/users/import',
        label: 'Import Users',
        description: 'Bulk import users',
        permissions: ['users:manage_roles'],
        order: 130
      },
      {
        type: 'divider',
        order: 140
      },
      {
        type: 'item',
        path: '/users/roles',
        label: 'Role Management',
        description: 'Manage user roles',
        permissions: ['users:manage_roles'],
        order: 150
      }
    ]
  },
  {
    type: 'section',
    label: 'Transactions',
    description: 'Manage financial transactions',
    icon: '💳',
    permissions: ['transactions:read'],
    order: 200,
    children: [
      {
        type: 'item',
        path: '/transactions',
        label: 'Transaction List',
        description: 'View all transactions',
        permissions: ['transactions:read'],
        order: 210
      },
      {
        type: 'item',
        path: '/transactions/create',
        label: 'New Transaction',
        description: 'Create transaction',
        permissions: ['transactions:create'],
        order: 220
      },
      {
        type: 'divider',
        order: 230
      },
      {
        type: 'item',
        path: '/transactions/approve',
        label: 'Approve Transactions',
        description: 'Approve pending transactions',
        permissions: ['transactions:approve'],
        badge: 'pending',
        badgeType: 'notification',
        badgeColor: 'orange',
        order: 240
      },
      {
        type: 'item',
        path: '/transactions/cancel',
        label: 'Cancel Transactions',
        description: 'Cancel transactions',
        permissions: ['transactions:cancel'],
        order: 250
      }
    ]
  },
  {
    type: 'section',
    label: 'Reports',
    description: 'View reports and analytics',
    icon: '📈',
    permissions: ['reports:read'],
    order: 300,
    children: [
      {
        type: 'item',
        path: '/reports',
        label: 'View Reports',
        description: 'Browse reports',
        permissions: ['reports:read'],
        order: 310
      },
      {
        type: 'item',
        path: '/reports/export',
        label: 'Export Reports',
        description: 'Export data',
        permissions: ['reports:export'],
        order: 320
      },
      {
        type: 'item',
        path: '/reports/audit',
        label: 'Audit Reports',
        description: 'Audit logs and reports',
        permissions: ['reports:audit'],
        order: 330
      }
    ]
  },
  {
    type: 'section',
    label: 'Tenant Management',
    description: 'Manage multi-tenant configuration',
    icon: '🏢',
    permissions: ['tenants:read'],
    scope: 'tenant',
    order: 400,
    children: [
      {
        type: 'item',
        path: '/tenants',
        label: 'Tenant List',
        description: 'View all tenants',
        permissions: ['tenants:read'],
        order: 410
      },
      {
        type: 'item',
        path: '/tenants/create',
        label: 'Create Tenant',
        description: 'Create new tenant',
        permissions: ['tenants:create'],
        scope: 'system',
        order: 420
      },
      {
        type: 'item',
        path: '/tenants/update',
        label: 'Update Tenant',
        description: 'Update tenant settings',
        permissions: ['tenants:update'],
        scope: 'system',
        order: 430
      }
    ]
  },
  {
    type: 'divider',
    order: 500
  },
  {
    type: 'section',
    label: 'System Administration',
    description: 'System configuration and maintenance',
    icon: '⚙️',
    scope: 'system',
    order: 600,
    children: [
      {
        type: 'item',
        path: '/system/config',
        label: 'System Configuration',
        description: 'System settings',
        permissions: ['system:config'],
        order: 610
      },
      {
        type: 'item',
        path: '/system/audit',
        label: 'System Audit',
        description: 'System audit logs',
        permissions: ['system:audit'],
        order: 620
      },
      {
        type: 'item',
        path: '/system/backup',
        label: 'Backup & Restore',
        description: 'Data backup and restore',
        permissions: ['system:backup'],
        order: 630
      }
    ]
  }
]

/**
 * Menu Builder
 *
 * This service provides a fluent interface for building navigation menus
 * from definitions and configurations.
 */
export class MenuBuilder {
  private _config: MenuBuilderConfig
  private _definitions: MenuDefinition[] = []

  constructor(config: MenuBuilderConfig) {
    this._config = {
      isDefault: false,
      ...config
    }
  }

  /**
   * Add navigation definitions
   */
  addDefinitions(definitions: MenuDefinition[]): MenuBuilder {
    this._definitions.push(...definitions)
    return this
  }

  /**
   * Add default navigation definitions
   */
  addDefaults(): MenuBuilder {
    this._definitions.push(...DEFAULT_NAVIGATION_DEFINITIONS)
    return this
  }

  /**
   * Add custom section
   */
  addSection(
    label: string,
    items: NavigationItemDefinition[],
    options: {
      description?: string
      icon?: string
      permissions?: Permission[]
      scope?: NavigationScope
      order?: number
    } = {}
  ): MenuBuilder {
    this._definitions.push({
      type: 'section',
      label,
      description: options.description,
      icon: options.icon,
      permissions: options.permissions,
      scope: options.scope,
      order: options.order || 0,
      children: items
    })
    return this
  }

  /**
   * Add navigation item
   */
  addItem(definition: NavigationItemDefinition): MenuBuilder {
    this._definitions.push(definition)
    return this
  }

  /**
   * Add divider
   */
  addDivider(order?: number): MenuBuilder {
    this._definitions.push({
      type: 'divider',
      order
    })
    return this
  }

  /**
   * Add header
   */
  addHeader(label: string, order?: number): MenuBuilder {
    this._definitions.push({
      type: 'header',
      label,
      order
    })
    return this
  }

  /**
   * Build navigation menu
   */
  build(): NavigationMenu {
    const menu = new NavigationMenu({
      name: this._config.name,
      description: this._config.description,
      scope: this._config.scope,
      tenantId: this._config.tenantId,
      userId: this._config.userId,
      isDefault: this._config.isDefault,
      isActive: true
    })

    // Sort definitions by order
    const sortedDefinitions = this._definitions.sort((a, b) =>
      (a.order || 0) - (b.order || 0)
    )

    // Build navigation items
    const items = this.buildNavigationItems(sortedDefinitions)

    // Add items to menu
    items.forEach(item => menu.addItem(item))

    return menu
  }

  /**
   * Build navigation items from definitions
   */
  private buildNavigationItems(
    definitions: MenuDefinition[],
    parentId?: string
  ): NavigationItem[] {
    const items: NavigationItem[] = []

    for (const definition of definitions) {
      let item: NavigationItem | null = null

      switch (definition.type) {
        case 'item':
          item = this.buildItem(definition, parentId)
          break

        case 'section':
          item = this.buildSection(definition, parentId)
          break

        case 'divider':
          item = NavigationItemFactory.createDivider(definition.order)
          break

        case 'header':
          item = NavigationItemFactory.createHeader(definition.label, definition.order)
          break
      }

      if (item) {
        items.push(item)
      }
    }

    return items
  }

  /**
   * Build navigation item from item definition
   */
  private buildItem(
    definition: NavigationItemDefinition,
    parentId?: string
  ): NavigationItem {
    return NavigationItemFactory.createItem({
      path: definition.path,
      label: definition.label,
      description: definition.description,
      icon: definition.icon,
      permissions: definition.permissions,
      scope: definition.scope || this._config.scope,
      order: definition.order || 0
    })
  }

  /**
   * Build navigation section from section definition
   */
  private buildSection(
    definition: MenuSectionDefinition,
    parentId?: string
  ): NavigationItem {
    const section = NavigationItemFactory.createGroup({
      label: definition.label,
      description: definition.description,
      icon: definition.icon,
      permissions: definition.permissions,
      scope: definition.scope || this._config.scope,
      order: definition.order || 0
    })

    // Add children if any
    if (definition.children && definition.children.length > 0) {
      const childItems = this.buildNavigationItems(definition.children, section.id)
      childItems.forEach(child => section.addChild(child))
    }

    return section
  }

  /**
   * Create menu builder for global scope
   */
  static forGlobal(name: string, description?: string): MenuBuilder {
    return new MenuBuilder({
      scope: 'global',
      name,
      description
    })
  }

  /**
   * Create menu builder for tenant scope
   */
  static forTenant(
    tenantId: string,
    name: string,
    description?: string
  ): MenuBuilder {
    return new MenuBuilder({
      scope: 'tenant',
      tenantId,
      name,
      description
    })
  }

  /**
   * Create menu builder for user scope
   */
  static forUser(
    userId: string,
    name: string,
    description?: string
  ): MenuBuilder {
    return new MenuBuilder({
      scope: 'user',
      userId,
      name,
      description
    })
  }

  /**
   * Create menu builder for system scope
   */
  static forSystem(name: string, description?: string): MenuBuilder {
    return new MenuBuilder({
      scope: 'system',
      name,
      description
    })
  }
}

/**
 * Menu Builder Factory
 *
 * Provides convenience methods for creating common navigation menus.
 */
export class MenuBuilderFactory {
  /**
   * Create default global navigation menu
   */
  static createGlobalMenu(name: string = 'Main Navigation'): NavigationMenu {
    return MenuBuilder
      .forGlobal(name, 'Main application navigation')
      .addDefaults()
      .build()
  }

  /**
   * Create tenant navigation menu
   */
  static createTenantMenu(
    tenantId: string,
    name: string = 'Tenant Navigation'
  ): NavigationMenu {
    return MenuBuilder
      .forTenant(tenantId, name, 'Tenant-specific navigation')
      .addDefaults()
      .build()
  }

  /**
   * Create system admin navigation menu
   */
  static createSystemMenu(name: string = 'System Admin'): NavigationMenu {
    return MenuBuilder
      .forSystem(name, 'System administration navigation')
      .addDefaults()
      .build()
  }

  /**
   * Create minimal user navigation menu
   */
  static createMinimalMenu(
    userId: string,
    permissions: Permission[],
    name: string = 'User Navigation'
  ): NavigationMenu {
    const builder = MenuBuilder.forUser(userId, name, 'Personalized user navigation')

    // Add dashboard
    builder.addItem({
      type: 'item',
      path: '/',
      label: 'Dashboard',
      description: 'Your personal dashboard',
      icon: '📊',
      order: 0
    })

    // Add profile if they have user permissions
    if (permissions.some(p => p.startsWith('users:'))) {
      builder.addSection('My Account', [
        {
          type: 'item',
          path: '/profile',
          label: 'My Profile',
          description: 'Manage your profile',
          order: 10
        },
        {
          type: 'item',
          path: '/settings',
          label: 'Settings',
          description: 'Application settings',
          order: 20
        }
      ], { order: 100 })
    }

    return builder.build()
  }

  /**
   * Create custom menu from configuration
   */
  static createFromConfig(
    config: MenuBuilderConfig,
    definitions: MenuDefinition[]
  ): NavigationMenu {
    return new MenuBuilder(config)
      .addDefinitions(definitions)
      .build()
  }
}