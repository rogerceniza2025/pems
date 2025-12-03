import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { NavigationService, NavigationRepository } from '@pems/navigation-management'
import type { Permission, Role } from '../../../packages/infrastructure/auth/src/rbac'

/**
 * Navigation API Routes
 *
 * Provides comprehensive REST API endpoints for navigation management:
 * - Navigation CRUD operations
 * - Permission-based filtering
 * - Analytics and metrics
 * - Cache management
 * - Real-time updates via events
 */

const navigation = new Hono()

// Validation schemas
const CreateNavigationMenuSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  scope: z.enum(['global', 'tenant', 'system', 'user']),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional()
})

const UpdateNavigationMenuSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
})

const CreateNavigationItemSchema = z.object({
  label: z.string().min(1).max(100),
  path: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  iconType: z.enum(['emoji', 'svg', 'font', 'image']).optional(),
  permissions: z.array(z.string()).optional(),
  requireAll: z.boolean().default(false),
  scope: z.enum(['global', 'tenant', 'system', 'user']).default('global'),
  target: z.enum(['_self', '_blank', '_parent', '_top']).default('_self'),
  external: z.boolean().default(false),
  disabled: z.boolean().default(false),
  visible: z.boolean().default(true),
  badge: z.union([z.string(), z.number()]).optional(),
  badgeType: z.enum(['notification', 'count', 'status', 'label']).optional(),
  badgeColor: z.string().optional(),
  order: z.number().default(0),
  parentId: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

const UpdateNavigationItemSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  path: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  iconType: z.enum(['emoji', 'svg', 'font', 'image']).optional(),
  permissions: z.array(z.string()).optional(),
  requireAll: z.boolean().optional(),
  scope: z.enum(['global', 'tenant', 'system', 'user']).optional(),
  target: z.enum(['_self', '_blank', '_parent', '_top']).optional(),
  external: z.boolean().optional(),
  disabled: z.boolean().optional(),
  visible: z.boolean().optional(),
  badge: z.union([z.string(), z.number()]).optional(),
  badgeType: z.enum(['notification', 'count', 'status', 'label']).optional(),
  badgeColor: z.string().optional(),
  order: z.number().optional(),
  metadata: z.record(z.any()).optional()
})

const GetNavigationQuerySchema = z.object({
  menuId: z.string().optional(),
  userId: z.string().optional(),
  tenantId: z.string().optional(),
  role: z.string().optional(),
  scope: z.string().optional(),
  includeDisabled: z.boolean().default(false),
  includeHidden: z.boolean().default(false),
  maxDepth: z.number().default(10),
  limit: z.number().optional(),
  offset: z.number().optional()
})

const SearchNavigationQuerySchema = z.object({
  query: z.string().min(1),
  menuId: z.string().optional(),
  userId: z.string().optional(),
  tenantId: z.string().optional(),
  fuzzy: z.boolean().default(false),
  caseSensitive: z.boolean().default(false),
  includeDescriptions: z.boolean().default(false),
  maxResults: z.number().default(50),
  minScore: z.number().default(0.5)
})

// Middleware to check navigation permissions
const checkNavigationPermission = (permission: string) => {
  return async (c: any, next: any) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const hasPermission = user.isSystemAdmin ||
      user.roles?.some((role: any) => role.permissions.includes(permission))

    if (!hasPermission) {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    await next()
  }
}

// Middleware to get services from context
const getServices = (c: any) => {
  return {
    navigationService: c.get('navigationService') as NavigationService,
    navigationRepository: c.get('navigationRepository') as NavigationRepository
  }
}

/**
 * Get user navigation with permission filtering
 */
navigation.get('/user', zValidator('query', GetNavigationQuerySchema), async (c) => {
  try {
    const { menuId, userId, tenantId, role, scope, includeDisabled, includeHidden, maxDepth } = c.req.valid('query')
    const user = c.get('user')
    const { navigationService } = getServices(c)

    if (!user) {
      return c.json({ error: 'User not authenticated' }, 401)
    }

    // Use provided user context or current user
    const targetUserId = userId || user.id
    const targetTenantId = tenantId || user.tenantId
    const userPermissions = user.permissions || []
    const userRole = role || user.roles?.[0]?.role

    // Get navigation for user
    const navigationItems = await navigationService.getNavigationForUser({
      userId: targetUserId,
      permissions: userPermissions,
      role: userRole as Role,
      tenantId: targetTenantId,
      isSystemAdmin: user.isSystemAdmin
    }, menuId)

    return c.json({
      items: navigationItems,
      userId: targetUserId,
      tenantId: targetTenantId,
      role: userRole,
      permissions: userPermissions,
      isSystemAdmin: user.isSystemAdmin,
      count: navigationItems.length
    })

  } catch (error) {
    console.error('Error getting user navigation:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * Search navigation items
 */
navigation.get('/search', zValidator('query', SearchNavigationQuerySchema), async (c) => {
  try {
    const { query, menuId, userId, tenantId, fuzzy, caseSensitive, includeDescriptions, maxResults, minScore } = c.req.valid('query')
    const { navigationRepository } = getServices(c)

    // Get all menus or specific menu
    let menus
    if (menuId) {
      const menu = await navigationRepository.getNavigationMenu(menuId)
      menus = menu ? [menu] : []
    } else {
      menus = await navigationRepository.getNavigationMenus({
        scope: tenantId ? 'tenant' : undefined,
        tenantId,
        isActive: true
      })
    }

    // Search in all menu items
    const searchResults: any[] = []
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0)

    for (const menu of menus) {
      const searchInItems = (items: any[], parentPath = '') => {
        for (const item of items) {
          const itemText = `${item.label} ${includeDescriptions && item.description ? item.description : ''} ${item.path || ''}`
          const normalizedText = caseSensitive ? itemText : itemText.toLowerCase()

          let score = 0
          let matches = 0

          for (const term of searchTerms) {
            if (caseSensitive ? itemText.includes(term) : normalizedText.includes(term)) {
              matches++
              score += term.length / itemText.length
            }
          }

          if (matches > 0 && score >= minScore) {
            searchResults.push({
              ...item,
              menuId: menu.id,
              menuName: menu.name,
              score,
              matches,
              parentPath
            })
          }

          // Search children recursively
          if (item.children && item.children.length > 0) {
            searchInItems(item.children, parentPath + (item.path || ''))
          }
        }
      }

      searchInItems(menu.allItems)
    }

    // Sort by score and limit results
    const sortedResults = searchResults
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)

    return c.json({
      query,
      results: sortedResults,
      total: searchResults.length,
      returned: sortedResults.length,
      searchOptions: {
        fuzzy,
        caseSensitive,
        includeDescriptions,
        minScore
      }
    })

  } catch (error) {
    console.error('Error searching navigation:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * Get navigation analytics
 */
navigation.get('/analytics', checkNavigationPermission('navigation:analytics'), async (c) => {
  try {
    const { navigationService } = getServices(c)

    const stats = navigationService.getStatistics()
    const cacheStats = navigationService.getStatistics()

    return c.json({
      navigation: stats,
      cache: {
        hitRatio: cacheStats.cacheHitRatio,
        averageQueryTime: cacheStats.averageQueryTime,
        totalMenus: stats.totalMenus,
        totalItems: stats.totalItems
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting navigation analytics:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * Track navigation access for analytics
 */
navigation.post('/track', async (c) => {
  try {
    const { userId, itemId, itemPath, itemLabel, accessTime, userAgent, sessionId } = await c.req.json()

    // Validate required fields
    if (!userId || !itemId || !itemPath) {
      return c.json({ error: 'Missing required fields: userId, itemId, itemPath' }, 400)
    }

    // In a real implementation, this would store analytics data
    console.log('Navigation access tracked:', {
      userId,
      itemId,
      itemPath,
      itemLabel,
      accessTime,
      userAgent,
      sessionId
    })

    return c.json({ success: true, message: 'Navigation access tracked' })

  } catch (error) {
    console.error('Error tracking navigation access:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * Get navigation cache statistics
 */
navigation.get('/cache/stats', checkNavigationPermission('navigation:analytics'), async (c) => {
  try {
    const { navigationRepository } = getServices(c)
    const stats = navigationRepository.getStatistics()

    return c.json({
      cacheStats: stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting cache stats:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * Clear navigation cache
 */
navigation.delete('/cache', checkNavigationPermission('navigation:manage'), async (c) => {
  try {
    const { userId, tenantId } = await c.req.json()
    const { navigationRepository } = getServices(c)

    let cleared = 0

    if (userId) {
      await navigationRepository.invalidateUserCache(userId, tenantId)
      cleared = 1 // Simplified count
    } else {
      await navigationRepository.clearCache()
      cleared = 999 // Indicates full clear
    }

    return c.json({
      success: true,
      cleared,
      message: `Cache cleared for ${userId ? `user ${userId}` : 'all users'}`
    })

  } catch (error) {
    console.error('Error clearing cache:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * Get all navigation menus
 */
navigation.get('/menus', checkNavigationPermission('navigation:read'), async (c) => {
  try {
    const { scope, tenantId, isActive, limit, offset } = c.req.query()
    const { navigationRepository } = getServices(c)

    const menus = await navigationRepository.getNavigationMenus({
      scope: scope as any,
      tenantId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })

    return c.json({
      menus: menus.map(menu => ({
        id: menu.id,
        name: menu.name,
        description: menu.description,
        scope: menu.scope,
        tenantId: menu.tenantId,
        userId: menu.userId,
        isDefault: menu.isDefault,
        isActive: menu.isActive,
        itemCount: menu.allItems.length,
        rootItemCount: menu.rootItems.length,
        createdAt: menu.createdAt,
        updatedAt: menu.updatedAt
      })),
      total: menus.length
    })

  } catch (error) {
    console.error('Error getting navigation menus:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * Create navigation menu
 */
navigation.post('/menus',
  checkNavigationPermission('navigation:manage'),
  zValidator('json', CreateNavigationMenuSchema),
  async (c) => {
    try {
      const menuData = c.req.valid('json')
      const { navigationService } = getServices(c)

      const menu = await navigationService.createNavigationMenu({
        ...menuData,
        createdBy: c.get('user')?.id
      })

      return c.json({
        success: true,
        menu: {
          id: menu.id,
          name: menu.name,
          description: menu.description,
          scope: menu.scope,
          tenantId: menu.tenantId,
          userId: menu.userId,
          isDefault: menu.isDefault,
          isActive: menu.isActive,
          createdAt: menu.createdAt
        }
      }, 201)

    } catch (error) {
      console.error('Error creating navigation menu:', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

/**
 * Get specific navigation menu
 */
navigation.get('/menus/:id', checkNavigationPermission('navigation:read'), async (c) => {
  try {
    const menuId = c.req.param('id')
    const { navigationRepository } = getServices(c)

    const menu = await navigationRepository.getNavigationMenu(menuId)
    if (!menu) {
      return c.json({ error: 'Navigation menu not found' }, 404)
    }

    return c.json({
      menu: {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        scope: menu.scope,
        tenantId: menu.tenantId,
        userId: menu.userId,
        isDefault: menu.isDefault,
        isActive: menu.isActive,
        items: menu.allItems,
        rootItems: menu.rootItems,
        itemCount: menu.allItems.length,
        rootItemCount: menu.rootItems.length,
        createdAt: menu.createdAt,
        updatedAt: menu.updatedAt
      }
    })

  } catch (error) {
    console.error('Error getting navigation menu:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * Update navigation menu
 */
navigation.put('/menus/:id',
  checkNavigationPermission('navigation:manage'),
  zValidator('json', UpdateNavigationMenuSchema),
  async (c) => {
    try {
      const menuId = c.req.param('id')
      const updates = c.req.valid('json')
      const { navigationRepository } = getServices(c)

      const success = await navigationRepository.updateNavigationMenu(menuId, {
        ...updates,
        updatedBy: c.get('user')?.id
      })

      if (!success) {
        return c.json({ error: 'Navigation menu not found or update failed' }, 404)
      }

      const updatedMenu = await navigationRepository.getNavigationMenu(menuId)

      return c.json({
        success: true,
        menu: updatedMenu ? {
          id: updatedMenu.id,
          name: updatedMenu.name,
          description: updatedMenu.description,
          scope: updatedMenu.scope,
          tenantId: updatedMenu.tenantId,
          userId: updatedMenu.userId,
          isDefault: updatedMenu.isDefault,
          isActive: updatedMenu.isActive,
          updatedAt: updatedMenu.updatedAt
        } : null
      })

    } catch (error) {
      console.error('Error updating navigation menu:', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

/**
 * Delete navigation menu
 */
navigation.delete('/menus/:id', checkNavigationPermission('navigation:manage'), async (c) => {
  try {
    const menuId = c.req.param('id')
    const { navigationRepository } = getServices(c)

    const success = await navigationRepository.deleteNavigationMenu(menuId)

    if (!success) {
      return c.json({ error: 'Navigation menu not found' }, 404)
    }

    return c.json({
      success: true,
      message: 'Navigation menu deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting navigation menu:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * Add navigation item to menu
 */
navigation.post('/menus/:id/items',
  checkNavigationPermission('navigation:manage'),
  zValidator('json', CreateNavigationItemSchema),
  async (c) => {
    try {
      const menuId = c.req.param('id')
      const itemData = c.req.valid('json')
      const { navigationRepository } = getServices(c)

      // Create navigation item (simplified - in real implementation would use NavigationItemFactory)
      const newItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...itemData,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const success = await navigationRepository.addNavigationItem(menuId, newItem as any)

      if (!success) {
        return c.json({ error: 'Failed to add navigation item' }, 400)
      }

      return c.json({
        success: true,
        item: newItem
      }, 201)

    } catch (error) {
      console.error('Error adding navigation item:', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

/**
 * Update navigation item
 */
navigation.put('/menus/:menuId/items/:itemId',
  checkNavigationPermission('navigation:manage'),
  zValidator('json', UpdateNavigationItemSchema),
  async (c) => {
    try {
      const { menuId, itemId } = c.req.params
      const updates = c.req.valid('json')
      const { navigationRepository } = getServices(c)

      // In a real implementation, this would update the specific item
      const success = await navigationRepository.updateNavigationItem(itemId, {
        ...updates,
        updatedAt: new Date()
      })

      if (!success) {
        return c.json({ error: 'Failed to update navigation item' }, 400)
      }

      return c.json({
        success: true,
        message: 'Navigation item updated successfully'
      })

    } catch (error) {
      console.error('Error updating navigation item:', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

/**
 * Remove navigation item from menu
 */
navigation.delete('/menus/:menuId/items/:itemId', checkNavigationPermission('navigation:manage'), async (c) => {
  try {
    const { menuId, itemId } = c.req.params
    const { navigationRepository } = getServices(c)

    const success = await navigationRepository.removeNavigationItem(menuId, itemId)

    if (!success) {
      return c.json({ error: 'Failed to remove navigation item' }, 400)
    }

    return c.json({
      success: true,
      message: 'Navigation item removed successfully'
    })

  } catch (error) {
    console.error('Error removing navigation item:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * Get navigation configuration for UI
 */
navigation.get('/config', checkNavigationPermission('navigation:read'), async (c) => {
  try {
    const { navigationService } = getServices(c)

    // Get available permissions from RBAC system
    const availablePermissions = [
      'users:read', 'users:create', 'users:update', 'users:delete', 'users:manage_roles',
      'transactions:read', 'transactions:create', 'transactions:update', 'transactions:delete',
      'transactions:approve', 'transactions:cancel',
      'reports:read', 'reports:export', 'reports:audit',
      'tenants:read', 'tenants:create', 'tenants:update', 'tenants:delete',
      'system:config', 'system:audit', 'system:backup',
      'navigation:read', 'navigation:manage', 'navigation:analytics'
    ]

    const availableRoles = [
      'super_admin', 'tenant_admin', 'manager', 'supervisor',
      'cashier', 'clerk', 'auditor', 'viewer'
    ]

    const availableScopes = [
      { value: 'global', label: 'Global - Available to all users' },
      { value: 'tenant', label: 'Tenant - Specific to current tenant' },
      { value: 'system', label: 'System - System administrators only' },
      { value: 'user', label: 'User - User-specific navigation' }
    ]

    return c.json({
      permissions: availablePermissions,
      roles: availableRoles,
      scopes: availableScopes,
      iconTypes: [
        { value: 'emoji', label: 'Emoji' },
        { value: 'svg', label: 'SVG Icon' },
        { value: 'font', label: 'Font Icon' },
        { value: 'image', label: 'Image' }
      ],
      badgeTypes: [
        { value: 'notification', label: 'Notification' },
        { value: 'count', label: 'Count' },
        { value: 'status', label: 'Status' },
        { value: 'label', label: 'Label' }
      ],
      targets: [
        { value: '_self', label: 'Same Window' },
        { value: '_blank', label: 'New Window' },
        { value: '_parent', label: 'Parent Frame' },
        { value: '_top', label: 'Top Frame' }
      ]
    })

  } catch (error) {
    console.error('Error getting navigation config:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default navigation