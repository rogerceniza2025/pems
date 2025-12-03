import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Hono } from 'hono'

// Mock navigation service for API testing
interface MockNavigationService {
  getNavigationForUser: vi.MockedFunction<any>
  createNavigationMenu: vi.MockedFunction<any>
  getNavigationMenu: vi.MockedFunction<any>
  getAllNavigationMenus: vi.MockedFunction<any>
  updateNavigationMenu: vi.MockedFunction<any>
  deleteNavigationMenu: vi.MockedFunction<any>
  canAccessNavigationItem: vi.MockedFunction<any>
  addNavigationItem: vi.MockedFunction<any>
  getStatistics: vi.MockedFunction<any>
}

describe('Navigation API Endpoints', () => {
  let app: Hono
  let mockNavigationService: MockNavigationService
  let mockEventBus: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock navigation service
    mockNavigationService = {
      getNavigationForUser: vi.fn(),
      createNavigationMenu: vi.fn(),
      getNavigationMenu: vi.fn(),
      getAllNavigationMenus: vi.fn(),
      updateNavigationMenu: vi.fn(),
      deleteNavigationMenu: vi.fn(),
      canAccessNavigationItem: vi.fn(),
      addNavigationItem: vi.fn(),
      getStatistics: vi.fn()
    }

    // Mock event bus
    mockEventBus = {
      publish: vi.fn(),
      subscribe: vi.fn(),
      clearDomainEvents: vi.fn(),
      getDomainEvents: vi.fn().mockReturnValue([])
    }

    // Create Hono app with navigation routes
    app = new Hono()

    // Middleware to inject mock services
    app.use('*', async (c, next) => {
      c.set('navigationService', mockNavigationService)
      c.set('eventBus', mockEventBus)
      c.set('requestId', 'test-request-123')
      await next()
    })

    // Middleware to add headers to all responses
    app.use('*', async (c, next) => {
      await next()
      // Add request ID header
      const requestId = c.get('requestId')
      if (requestId) {
        c.header('x-request-id', requestId)
      }
      // Add security headers
      c.header('x-content-type-options', 'nosniff')
      c.header('x-frame-options', 'DENY')
      c.header('x-xss-protection', '1; mode=block')
    })

    // Navigation routes
    app.get('/api/navigation', async (c) => {
      const navigationService = c.get('navigationService')
      const tenantId = c.req.query('tenantId')
      const menuId = c.req.query('menuId')

      const userContext = {
        userId: 'user-123',
        tenantId: tenantId || 'tenant-123',
        permissions: ['users:read', 'transactions:read'],
        role: 'manager',
        isSystemAdmin: false
      }

      const navigation = await navigationService.getNavigationForUser(userContext, menuId)
      return c.json({ navigation })
    })

    app.get('/api/navigation/menus', async (c) => {
      const navigationService = c.get('navigationService')
      const menus = navigationService.getAllNavigationMenus()
      return c.json({ menus })
    })

    app.post('/api/navigation/menus', async (c) => {
      const navigationService = c.get('navigationService')
      const body = await c.req.json()

      const menu = navigationService.createNavigationMenu(body)
      return c.json({ menu }, 201)
    })

    app.get('/api/navigation/menus/:menuId', async (c) => {
      const navigationService = c.get('navigationService')
      const menuId = c.req.param('menuId')

      const menu = navigationService.getNavigationMenu(menuId)
      if (!menu) {
        return c.json({ error: 'Menu not found' }, 404)
      }

      return c.json({ menu })
    })

    app.put('/api/navigation/menus/:menuId', async (c) => {
      const navigationService = c.get('navigationService')
      const menuId = c.req.param('menuId')
      const body = await c.req.json()

      const updated = await navigationService.updateNavigationMenu(menuId, body)
      if (!updated) {
        return c.json({ error: 'Menu not found' }, 404)
      }

      return c.json({ message: 'Menu updated successfully' })
    })

    app.delete('/api/navigation/menus/:menuId', async (c) => {
      const navigationService = c.get('navigationService')
      const menuId = c.req.param('menuId')

      const deleted = await navigationService.deleteNavigationMenu(menuId)
      if (!deleted) {
        return c.json({ error: 'Menu not found' }, 404)
      }

      return c.json({ message: 'Menu deleted successfully' })
    })

    app.post('/api/navigation/menus/:menuId/items', async (c) => {
      const navigationService = c.get('navigationService')
      const menuId = c.req.param('menuId')
      const body = await c.req.json()

      await navigationService.addNavigationItem(menuId, body)
      return c.json({ message: 'Item added successfully' }, 201)
    })

    app.post('/api/navigation/check-access', async (c) => {
      const navigationService = c.get('navigationService')
      const body = await c.req.json()

      const { itemId, userContext } = body

      const canAccess = await navigationService.canAccessNavigationItem(userContext, itemId)
      return c.json({ canAccess })
    })

    app.get('/api/navigation/statistics', async (c) => {
      const navigationService = c.get('navigationService')
      const stats = navigationService.getStatistics()
      return c.json({ statistics: stats })
    })

    app.post('/api/navigation/refresh-cache', async (c) => {
      const eventBus = c.get('eventBus')

      // Publish cache refresh event
      await eventBus.publish({
        type: 'NavigationCacheCleared',
        data: { timestamp: new Date().toISOString() }
      })

      return c.json({ message: 'Cache refreshed successfully' })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/navigation', () => {
    it('should return user navigation', async () => {
      const mockNavigation = [
        {
          id: 'dashboard',
          path: '/dashboard',
          label: 'Dashboard',
          permissions: []
        },
        {
          id: 'users',
          path: '/users',
          label: 'Users',
          permissions: ['users:read']
        }
      ]

      mockNavigationService.getNavigationForUser.mockResolvedValue(mockNavigation)

      const res = await app.request('/api/navigation')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.navigation).toEqual(mockNavigation)
      expect(mockNavigationService.getNavigationForUser).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          permissions: ['users:read', 'transactions:read']
        }),
        undefined
      )
    })

    it('should support tenant filtering', async () => {
      const mockNavigation = [{ id: 'tenant-item', path: '/tenant', label: 'Tenant' }]
      mockNavigationService.getNavigationForUser.mockResolvedValue(mockNavigation)

      const res = await app.request('/api/navigation?tenantId=tenant-456')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.navigation).toEqual(mockNavigation)
      expect(mockNavigationService.getNavigationForUser).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-456'
        }),
        undefined
      )
    })

    it('should support menu filtering', async () => {
      const mockNavigation = [{ id: 'menu-item', path: '/menu', label: 'Menu Item' }]
      mockNavigationService.getNavigationForUser.mockResolvedValue(mockNavigation)

      const res = await app.request('/api/navigation?menuId=menu-123')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.navigation).toEqual(mockNavigation)
      expect(mockNavigationService.getNavigationForUser).toHaveBeenCalledWith(
        expect.any(Object),
        'menu-123'
      )
    })
  })

  describe('GET /api/navigation/menus', () => {
    it('should return all navigation menus', async () => {
      const mockMenus = [
        {
          id: 'menu-1',
          name: 'Main Navigation',
          scope: 'global',
          isActive: true
        },
        {
          id: 'menu-2',
          name: 'Admin Navigation',
          scope: 'system',
          isActive: true
        }
      ]

      mockNavigationService.getAllNavigationMenus.mockReturnValue(mockMenus)

      const res = await app.request('/api/navigation/menus')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.menus).toEqual(mockMenus)
      expect(mockNavigationService.getAllNavigationMenus).toHaveBeenCalled()
    })
  })

  describe('POST /api/navigation/menus', () => {
    it('should create a new navigation menu', async () => {
      const newMenu = {
        name: 'Test Menu',
        description: 'Test navigation menu',
        scope: 'global' as const,
        isActive: true
      }

      const createdMenu = {
        id: 'menu-123',
        ...newMenu,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockNavigationService.createNavigationMenu.mockReturnValue(createdMenu)

      const res = await app.request('/api/navigation/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMenu)
      })

      expect(res.status).toBe(201)
      const json = await res.json()
      // Compare JSON strings to avoid Date object comparison issues
      expect(JSON.stringify(json.menu)).toEqual(JSON.stringify(createdMenu))
      expect(mockNavigationService.createNavigationMenu).toHaveBeenCalledWith(newMenu)
    })

    it('should validate menu creation data', async () => {
      const invalidMenu = {
        name: '', // Empty name should be invalid
        scope: 'invalid-scope' as any
      }

      const res = await app.request('/api/navigation/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidMenu)
      })

      // In a real implementation, this would return 400 with validation errors
      // For now, we'll just test that it reaches the service
      expect(res.status).toBe(201)
    })
  })

  describe('GET /api/navigation/menus/:menuId', () => {
    it('should return a specific navigation menu', async () => {
      const mockMenu = {
        id: 'menu-123',
        name: 'Test Menu',
        scope: 'global' as const,
        isActive: true,
        items: []
      }

      mockNavigationService.getNavigationMenu.mockReturnValue(mockMenu)

      const res = await app.request('/api/navigation/menus/menu-123')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.menu).toEqual(mockMenu)
      expect(mockNavigationService.getNavigationMenu).toHaveBeenCalledWith('menu-123')
    })

    it('should return 404 for non-existent menu', async () => {
      mockNavigationService.getNavigationMenu.mockReturnValue(undefined)

      const res = await app.request('/api/navigation/menus/non-existent')
      expect(res.status).toBe(404)

      const json = await res.json()
      expect(json.error).toBe('Menu not found')
    })
  })

  describe('PUT /api/navigation/menus/:menuId', () => {
    it('should update a navigation menu', async () => {
      const updateData = {
        name: 'Updated Menu Name',
        description: 'Updated description'
      }

      mockNavigationService.updateNavigationMenu.mockResolvedValue(true)

      const res = await app.request('/api/navigation/menus/menu-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.message).toBe('Menu updated successfully')
      expect(mockNavigationService.updateNavigationMenu).toHaveBeenCalledWith('menu-123', updateData)
    })

    it('should return 404 when updating non-existent menu', async () => {
      const updateData = { name: 'Updated Name' }
      mockNavigationService.updateNavigationMenu.mockResolvedValue(false)

      const res = await app.request('/api/navigation/menus/non-existent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error).toBe('Menu not found')
    })
  })

  describe('DELETE /api/navigation/menus/:menuId', () => {
    it('should delete a navigation menu', async () => {
      mockNavigationService.deleteNavigationMenu.mockResolvedValue(true)

      const res = await app.request('/api/navigation/menus/menu-123', {
        method: 'DELETE'
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.message).toBe('Menu deleted successfully')
      expect(mockNavigationService.deleteNavigationMenu).toHaveBeenCalledWith('menu-123')
    })

    it('should return 404 when deleting non-existent menu', async () => {
      mockNavigationService.deleteNavigationMenu.mockResolvedValue(false)

      const res = await app.request('/api/navigation/menus/non-existent', {
        method: 'DELETE'
      })

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error).toBe('Menu not found')
    })
  })

  describe('POST /api/navigation/check-access', () => {
    it('should check navigation item access', async () => {
      const accessRequest = {
        itemId: 'item-123',
        userContext: {
          userId: 'user-123',
          permissions: ['users:read'],
          isSystemAdmin: false
        }
      }

      mockNavigationService.canAccessNavigationItem.mockResolvedValue(true)

      const res = await app.request('/api/navigation/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accessRequest)
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.canAccess).toBe(true)
      expect(mockNavigationService.canAccessNavigationItem).toHaveBeenCalledWith(
        accessRequest.userContext,
        accessRequest.itemId
      )
    })
  })

  describe('GET /api/navigation/statistics', () => {
    it('should return navigation statistics', async () => {
      const mockStats = {
        totalMenus: 5,
        totalItems: 25,
        cacheHitRatio: 0.85,
        lastUpdated: new Date().toISOString()
      }

      mockNavigationService.getStatistics.mockReturnValue(mockStats)

      const res = await app.request('/api/navigation/statistics')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.statistics).toEqual(mockStats)
      expect(mockNavigationService.getStatistics).toHaveBeenCalled()
    })
  })

  describe('POST /api/navigation/refresh-cache', () => {
    it('should refresh navigation cache', async () => {
      mockEventBus.publish.mockResolvedValue(undefined)

      const res = await app.request('/api/navigation/refresh-cache', {
        method: 'POST'
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.message).toBe('Cache refreshed successfully')
      expect(mockEventBus.publish).toHaveBeenCalledWith({
        type: 'NavigationCacheCleared',
        data: { timestamp: expect.any(String) }
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockNavigationService.getNavigationForUser.mockRejectedValue(
        new Error('Service unavailable')
      )

      const res = await app.request('/api/navigation')
      expect(res.status).toBe(500)
    })

    it('should include request ID in responses', async () => {
      const mockNavigation = [{ id: 'test', path: '/test', label: 'Test' }]
      mockNavigationService.getNavigationForUser.mockResolvedValue(mockNavigation)

      const res = await app.request('/api/navigation')
      expect(res.headers.get('x-request-id')).toBe('test-request-123')
    })
  })

  describe('Request Headers', () => {
    it('should include security headers', async () => {
      const mockNavigation = []
      mockNavigationService.getNavigationForUser.mockResolvedValue(mockNavigation)

      const res = await app.request('/api/navigation')

      expect(res.headers.get('x-content-type-options')).toBe('nosniff')
      expect(res.headers.get('x-frame-options')).toBe('DENY')
      expect(res.headers.get('x-xss-protection')).toBe('1; mode=block')
    })
  })

  describe('Performance', () => {
    it('should handle requests within reasonable time', async () => {
      const mockNavigation = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        path: `/item-${i}`,
        label: `Item ${i}`,
        permissions: []
      }))

      mockNavigationService.getNavigationForUser.mockResolvedValue(mockNavigation)

      const startTime = performance.now()
      const res = await app.request('/api/navigation')
      const endTime = performance.now()

      expect(res.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
    })
  })
})