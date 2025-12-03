/**
 * Tenant API Controller
 *
 * REST API endpoints for tenant management operations.
 * Integrates with Hono framework and uses tenant context middleware.
 */

/* eslint-disable no-console */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import type { ITenantService } from '../application'
import {
  CreateTenantSchema,
  UpdateTenantSchema,
  TenantSettingSchema,
} from '../domain'

export function createTenantRoutes(tenantService: ITenantService): Hono {
  const app = new Hono()

  // GET /tenants - List all tenants (system admin only)
  app.get('/tenants', async (c) => {
    try {
      const page = parseInt(c.req.query('page') ?? '1')
      const limit = parseInt(c.req.query('limit') ?? '20')

      const result = await tenantService.listTenants({ page, limit })

      return c.json({
        success: true,
        data: result.tenants,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      })
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      console.error('List tenants error:', error)
      throw new HTTPException(500, { message: 'Failed to list tenants' })
    }
  })

  // GET /tenants/:id - Get tenant by ID
  app.get('/tenants/:id', async (c) => {
    try {
      const id = c.req.param('id')
      const tenant = await tenantService.getTenant(id)

      return c.json({
        success: true,
        data: tenant,
      })
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      console.error('Get tenant error:', error)
      throw new HTTPException(500, { message: 'Failed to get tenant' })
    }
  })

  // POST /tenants - Create new tenant (system admin only)
  app.post('/tenants', zValidator('json', CreateTenantSchema), async (c) => {
    try {
      const data = c.req.valid('json')
      const tenant = await tenantService.createTenant(data)

      return c.json(
        {
          success: true,
          data: tenant,
          message: 'Tenant created successfully',
        },
        201,
      )
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new HTTPException(409, { message: error.message })
      }
      console.error('Create tenant error:', error)
      throw new HTTPException(500, { message: 'Failed to create tenant' })
    }
  })

  // PUT /tenants/:id - Update tenant
  app.put('/tenants/:id', zValidator('json', UpdateTenantSchema), async (c) => {
    try {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const tenant = await tenantService.updateTenant(id, data)

      return c.json({
        success: true,
        data: tenant,
        message: 'Tenant updated successfully',
      })
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new HTTPException(409, { message: error.message })
      }
      console.error('Update tenant error:', error)
      throw new HTTPException(500, { message: 'Failed to update tenant' })
    }
  })

  // DELETE /tenants/:id - Delete tenant (system admin only)
  app.delete('/tenants/:id', async (c) => {
    try {
      const id = c.req.param('id')
      await tenantService.deleteTenant(id)

      return c.json({
        success: true,
        message: 'Tenant deleted successfully',
      })
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      console.error('Delete tenant error:', error)
      throw new HTTPException(500, { message: 'Failed to delete tenant' })
    }
  })

  // Tenant Settings Routes

  // GET /tenants/:id/settings - Get all tenant settings
  app.get('/tenants/:id/settings', async (c) => {
    try {
      const tenantId = c.req.param('id')
      const settings = await tenantService.getAllTenantSettings(tenantId)

      return c.json({
        success: true,
        data: settings,
      })
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      console.error('Get tenant settings error:', error)
      throw new HTTPException(500, { message: 'Failed to get tenant settings' })
    }
  })

  // GET /tenants/:id/settings/:key - Get specific tenant setting
  app.get('/tenants/:id/settings/:key', async (c) => {
    try {
      const tenantId = c.req.param('id')
      const key = c.req.param('key')
      const setting = await tenantService.getTenantSetting(tenantId, key)

      if (!setting) {
        throw new HTTPException(404, { message: 'Setting not found' })
      }

      return c.json({
        success: true,
        data: setting,
      })
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      console.error('Get tenant setting error:', error)
      throw new HTTPException(500, { message: 'Failed to get tenant setting' })
    }
  })

  // PUT /tenants/:id/settings/:key - Update tenant setting
  app.put(
    '/tenants/:id/settings/:key',
    zValidator('json', TenantSettingSchema),
    async (c) => {
      try {
        const tenantId = c.req.param('id')
        const key = c.req.param('key')
        const data = c.req.valid('json')

        // Ensure the key in URL matches the key in body
        const settingData = { ...data, key }
        const setting = await tenantService.upsertTenantSetting(
          tenantId,
          settingData,
        )

        return c.json({
          success: true,
          data: setting,
          message: 'Setting updated successfully',
        })
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error
        }
        if (error instanceof Error && error.message.includes('not found')) {
          throw new HTTPException(404, { message: error.message })
        }
        console.error('Update tenant setting error:', error)
        throw new HTTPException(500, {
          message: 'Failed to update tenant setting',
        })
      }
    },
  )

  // DELETE /tenants/:id/settings/:key - Delete tenant setting
  app.delete('/tenants/:id/settings/:key', async (c) => {
    try {
      const tenantId = c.req.param('id')
      const key = c.req.param('key')
      await tenantService.deleteTenantSetting(tenantId, key)

      return c.json({
        success: true,
        message: 'Setting deleted successfully',
      })
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      console.error('Delete tenant setting error:', error)
      throw new HTTPException(500, {
        message: 'Failed to delete tenant setting',
      })
    }
  })

  return app
}
