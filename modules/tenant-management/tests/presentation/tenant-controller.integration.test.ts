/**
 * Tenant Controller Integration Tests
 *
 * Comprehensive testing for tenant management API endpoints
 * Tests HTTP operations, validation, error handling, and security
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createTenantRoutes } from '../src/presentation/tenant-controller'
import type { ITenantService } from '../src/application'
import {
  CreateTenantSchema,
  UpdateTenantSchema,
  TenantSettingSchema,
  TenantNotFoundError,
  TenantSlugAlreadyExistsError,
} from '../src/domain'

// Mock Tenant Service for testing
const mockTenantService = {
  listTenants: vi.fn(),
  getTenant: vi.fn(),
  createTenant: vi.fn(),
  updateTenant: vi.fn(),
  deleteTenant: vi.fn(),
  getAllTenantSettings: vi.fn(),
  getTenantSetting: vi.fn(),
  upsertTenantSetting: vi.fn(),
  deleteTenantSetting: vi.fn(),
} as unknown as ITenantService

describe('TenantController Integration', () => {
  let app: Hono

  beforeEach(() => {
    app = createTenantRoutes(mockTenantService)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /tenants', () => {
    it('should list tenants with default pagination', async () => {
      const mockResult = {
        tenants: [
          {
            id: 'tenant-1',
            name: 'Tenant 1',
            slug: 'tenant-1',
            timezone: 'UTC',
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      }

      mockTenantService.listTenants.mockResolvedValue(mockResult)

      const response = await app.request('/tenants')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockResult.tenants,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      })

      expect(mockTenantService.listTenants).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      })
    })

    it('should list tenants with custom pagination', async () => {
      const mockResult = {
        tenants: [],
        page: 2,
        limit: 10,
        total: 0,
        totalPages: 0,
      }

      mockTenantService.listTenants.mockResolvedValue(mockResult)

      const response = await app.request('/tenants?page=2&limit=10')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(10)

      expect(mockTenantService.listTenants).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
      })
    })

    it('should handle invalid pagination parameters', async () => {
      const mockResult = {
        tenants: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      }

      mockTenantService.listTenants.mockResolvedValue(mockResult)

      const response = await app.request('/tenants?page=invalid&limit=invalid')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(1) // Default fallback
      expect(data.pagination.limit).toBe(20) // Default fallback
    })

    it('should handle service errors', async () => {
      mockTenantService.listTenants.mockRejectedValue(
        new Error('Service unavailable'),
      )

      const response = await app.request('/tenants')

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.message).toBe('Failed to list tenants')
    })

    it('should handle HTTP exceptions from service', async () => {
      const httpError = new HTTPException(403, { message: 'Access denied' })
      mockTenantService.listTenants.mockRejectedValue(httpError)

      const response = await app.request('/tenants')

      expect(response.status).toBe(403)
    })
  })

  describe('GET /tenants/:id', () => {
    it('should get tenant by ID', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: { theme: 'dark' },
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockTenantService.getTenant.mockResolvedValue(mockTenant)

      const response = await app.request('/tenants/tenant-123')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockTenant,
      })

      expect(mockTenantService.getTenant).toHaveBeenCalledWith('tenant-123')
    })

    it('should return 404 for non-existent tenant', async () => {
      const error = new TenantNotFoundError('tenant-123')
      mockTenantService.getTenant.mockRejectedValue(error)

      const response = await app.request('/tenants/non-existent')

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.message).toContain('not found')
    })

    it('should handle service errors', async () => {
      mockTenantService.getTenant.mockRejectedValue(
        new Error('Database error'),
      )

      const response = await app.request('/tenants/tenant-123')

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.message).toBe('Failed to get tenant')
    })

    it('should handle malicious tenant ID', async () => {
      const maliciousId = '../../../etc/passwd'

      mockTenantService.getTenant.mockRejectedValue(
        new Error('Invalid tenant ID'),
      )

      const response = await app.request(`/tenants/${maliciousId}`)

      expect(response.status).toBe(500)
    })
  })

  describe('POST /tenants', () => {
    it('should create a new tenant with valid data', async () => {
      const tenantData = {
        name: 'New Tenant',
        slug: 'new-tenant',
        timezone: 'UTC',
        metadata: { theme: 'light' },
      }

      const mockTenant = {
        id: 'tenant-123',
        ...tenantData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockTenantService.createTenant.mockResolvedValue(mockTenant)

      const response = await app.request('/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantData),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual({
        success: true,
        data: mockTenant,
        message: 'Tenant created successfully',
      })

      expect(mockTenantService.createTenant).toHaveBeenCalledWith(tenantData)
    })

    it('should validate tenant creation data', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        slug: '', // Invalid: empty slug
        timezone: 'Invalid-Timezone', // Invalid: wrong format
        metadata: 'not-object', // Invalid: should be object
      }

      const response = await app.request('/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('errors')
    })

    it('should handle slug conflict during creation', async () => {
      const tenantData = {
        name: 'Test Tenant',
        slug: 'existing-slug',
        timezone: 'UTC',
        metadata: {},
      }

      const error = new TenantSlugAlreadyExistsError('existing-slug')
      mockTenantService.createTenant.mockRejectedValue(error)

      const response = await app.request('/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantData),
      })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.message).toContain('already exists')
    })

    it('should handle malicious input during creation', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        slug: '../../../etc/passwd',
        timezone: 'malicious-timezone',
        metadata: { __proto__: { malicious: true } },
      }

      mockTenantService.createTenant.mockRejectedValue(
        new Error('Invalid input data'),
      )

      const response = await app.request('/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData),
      })

      expect(response.status).toBe(500)
    })

    it('should handle JSON parsing errors', async () => {
      const response = await app.request('/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{',
      })

      expect(response.status).toBe(400)
    })
  })

  describe('PUT /tenants/:id', () => {
    it('should update tenant with valid data', async () => {
      const updateData = {
        name: 'Updated Name',
        metadata: { theme: 'dark' },
      }

      const mockTenant = {
        id: 'tenant-123',
        name: 'Updated Name',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: { theme: 'dark' },
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockTenantService.updateTenant.mockResolvedValue(mockTenant)

      const response = await app.request('/tenants/tenant-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockTenant,
        message: 'Tenant updated successfully',
      })

      expect(mockTenantService.updateTenant).toHaveBeenCalledWith(
        'tenant-123',
        updateData,
      )
    })

    it('should validate tenant update data', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        slug: '', // Invalid: empty slug
        timezone: 'Invalid-Timezone',
        metadata: 'not-object',
      }

      const response = await app.request('/tenants/tenant-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('errors')
    })

    it('should handle tenant not found during update', async () => {
      const updateData = { name: 'Updated Name' }
      const error = new TenantNotFoundError('tenant-123')
      mockTenantService.updateTenant.mockRejectedValue(error)

      const response = await app.request('/tenants/non-existent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.message).toContain('not found')
    })

    it('should handle slug conflict during update', async () => {
      const updateData = { slug: 'existing-slug' }
      const error = new TenantSlugAlreadyExistsError('existing-slug')
      mockTenantService.updateTenant.mockRejectedValue(error)

      const response = await app.request('/tenants/tenant-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.message).toContain('already exists')
    })
  })

  describe('DELETE /tenants/:id', () => {
    it('should delete tenant successfully', async () => {
      mockTenantService.deleteTenant.mockResolvedValue(undefined)

      const response = await app.request('/tenants/tenant-123', {
        method: 'DELETE',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Tenant deleted successfully',
      })

      expect(mockTenantService.deleteTenant).toHaveBeenCalledWith('tenant-123')
    })

    it('should handle tenant not found during deletion', async () => {
      const error = new TenantNotFoundError('tenant-123')
      mockTenantService.deleteTenant.mockRejectedValue(error)

      const response = await app.request('/tenants/non-existent', {
        method: 'DELETE',
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.message).toContain('not found')
    })

    it('should handle malicious tenant ID in deletion', async () => {
      const maliciousId = '../..'

      mockTenantService.deleteTenant.mockRejectedValue(
        new Error('Invalid tenant ID'),
      )

      const response = await app.request(`/tenants/${maliciousId}`, {
        method: 'DELETE',
      })

      expect(response.status).toBe(500)
    })
  })

  describe('GET /tenants/:id/settings', () => {
    it('should get all tenant settings', async () => {
      const mockSettings = [
        {
          id: 'setting-1',
          tenantId: 'tenant-123',
          key: 'theme',
          value: 'dark',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'setting-2',
          tenantId: 'tenant-123',
          key: 'language',
          value: 'en',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockTenantService.getAllTenantSettings.mockResolvedValue(mockSettings)

      const response = await app.request('/tenants/tenant-123/settings')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockSettings,
      })

      expect(mockTenantService.getAllTenantSettings).toHaveBeenCalledWith(
        'tenant-123',
      )
    })

    it('should handle tenant not found when getting settings', async () => {
      const error = new TenantNotFoundError('tenant-123')
      mockTenantService.getAllTenantSettings.mockRejectedValue(error)

      const response = await app.request('/tenants/non-existent/settings')

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.message).toContain('not found')
    })
  })

  describe('GET /tenants/:id/settings/:key', () => {
    it('should get specific tenant setting', async () => {
      const mockSetting = {
        id: 'setting-1',
        tenantId: 'tenant-123',
        key: 'theme',
        value: 'dark',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockTenantService.getTenantSetting.mockResolvedValue(mockSetting)

      const response = await app.request('/tenants/tenant-123/settings/theme')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockSetting,
      })

      expect(mockTenantService.getTenantSetting).toHaveBeenCalledWith(
        'tenant-123',
        'theme',
      )
    })

    it('should return 404 for non-existent setting', async () => {
      mockTenantService.getTenantSetting.mockResolvedValue(null)

      const response = await app.request('/tenants/tenant-123/settings/non-existent')

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.message).toBe('Setting not found')
    })

    it('should handle tenant not found when getting setting', async () => {
      const error = new TenantNotFoundError('tenant-123')
      mockTenantService.getTenantSetting.mockRejectedValue(error)

      const response = await app.request('/tenants/non-existent/settings/theme')

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.message).toContain('not found')
    })
  })

  describe('PUT /tenants/:id/settings/:key', () => {
    it('should update tenant setting', async () => {
      const settingData = {
        value: 'light',
      }

      const mockSetting = {
        id: 'setting-1',
        tenantId: 'tenant-123',
        key: 'theme',
        value: 'light',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockTenantService.upsertTenantSetting.mockResolvedValue(mockSetting)

      const response = await app.request('/tenants/tenant-123/settings/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingData),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockSetting,
        message: 'Setting updated successfully',
      })

      expect(mockTenantService.upsertTenantSetting).toHaveBeenCalledWith(
        'tenant-123',
        { ...settingData, key: 'theme' },
      )
    })

    it('should validate setting data', async () => {
      const invalidData = {
        key: 'theme', // Should not be in body, comes from URL
        value: null, // Invalid: cannot be null
      }

      const response = await app.request('/tenants/tenant-123/settings/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('errors')
    })

    it('should handle tenant not found when updating setting', async () => {
      const settingData = { value: 'light' }
      const error = new TenantNotFoundError('tenant-123')
      mockTenantService.upsertTenantSetting.mockRejectedValue(error)

      const response = await app.request('/tenants/non-existent/settings/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingData),
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.message).toContain('not found')
    })

    it('should handle malicious setting data', async () => {
      const maliciousData = {
        value: '<script>alert("xss")</script>',
      }

      mockTenantService.upsertTenantSetting.mockRejectedValue(
        new Error('Invalid setting data'),
      )

      const response = await app.request('/tenants/tenant-123/settings/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData),
      })

      expect(response.status).toBe(500)
    })
  })

  describe('DELETE /tenants/:id/settings/:key', () => {
    it('should delete tenant setting', async () => {
      mockTenantService.deleteTenantSetting.mockResolvedValue(undefined)

      const response = await app.request('/tenants/tenant-123/settings/theme', {
        method: 'DELETE',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Setting deleted successfully',
      })

      expect(mockTenantService.deleteTenantSetting).toHaveBeenCalledWith(
        'tenant-123',
        'theme',
      )
    })

    it('should handle tenant not found when deleting setting', async () => {
      const error = new TenantNotFoundError('tenant-123')
      mockTenantService.deleteTenantSetting.mockRejectedValue(error)

      const response = await app.request('/tenants/non-existent/settings/theme', {
        method: 'DELETE',
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.message).toContain('not found')
    })

    it('should handle malicious tenant ID or setting key in deletion', async () => {
      const maliciousId = '../'
      const maliciousKey = '../../../etc/passwd'

      mockTenantService.deleteTenantSetting.mockRejectedValue(
        new Error('Invalid parameters'),
      )

      const response = await app.request(
        `/tenants/${maliciousId}/settings/${maliciousKey}`,
        {
          method: 'DELETE',
        },
      )

      expect(response.status).toBe(500)
    })
  })

  describe('Security and Input Validation', () => {
    it('should handle extremely long tenant names', async () => {
      const longName = 'a'.repeat(10000)
      const tenantData = {
        name: longName,
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: {},
      }

      const response = await app.request('/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantData),
      })

      // Should be rejected by validation
      expect(response.status).toBe(400)
    })

    it('should handle special characters in tenant slug', async () => {
      const tenantData = {
        name: 'Test Tenant',
        slug: 'tenant with spaces and symbols!@#$%',
        timezone: 'UTC',
        metadata: {},
      }

      const response = await app.request('/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantData),
      })

      // Should be rejected by validation
      expect(response.status).toBe(400)
    })

    it('should handle SQL injection attempts', async () => {
      const maliciousId = "'; DROP TABLE tenants; --"

      mockTenantService.getTenant.mockRejectedValue(
        new Error('Malicious input detected'),
      )

      const response = await app.request(`/tenants/${maliciousId}`)

      expect(response.status).toBe(500)
    })

    it('should handle XSS attempts in tenant data', async () => {
      const maliciousData = {
        name: '<script>window.location="http://evil.com"</script>',
        slug: 'xss-tenant',
        timezone: 'UTC',
        metadata: { payload: '<img src=x onerror=alert("xss")>' },
      }

      const response = await app.request('/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData),
      })

      // Should be handled by validation or service layer
      expect([400, 500]).toContain(response.status)
    })

    it('should handle malformed JSON requests', async () => {
      const response = await app.request('/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name": "test", invalid json}',
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle service timeouts', async () => {
      mockTenantService.listTenants.mockRejectedValue(
        new Error('Service timeout'),
      )

      const response = await app.request('/tenants')

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.message).toBe('Failed to list tenants')
    })

    it('should handle database connection errors', async () => {
      mockTenantService.getTenant.mockRejectedValue(
        new Error('Database connection lost'),
      )

      const response = await app.request('/tenants/tenant-123')

      expect(response.status).toBe(500)
    })

    it('should handle concurrent requests safely', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockTenantService.getTenant.mockResolvedValue(mockTenant)

      const requests = Array.from({ length: 100 }, () =>
        app.request('/tenants/tenant-123'),
      )

      const responses = await Promise.all(requests)

      expect(responses).toHaveLength(100)
      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('Response Format and Standards', () => {
    it('should return consistent response format for successful operations', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockTenantService.getTenant.mockResolvedValue(mockTenant)

      const response = await app.request('/tenants/tenant-123')
      const data = await response.json()

      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data).not.toHaveProperty('message') // Optional for GET operations
    })

    it('should return consistent response format for error operations', async () => {
      mockTenantService.getTenant.mockRejectedValue(
        new Error('Service error'),
      )

      const response = await app.request('/tenants/tenant-123')
      const data = await response.json()

      expect(data).toHaveProperty('success', false) // Implied by HTTP error status
      expect(data).toHaveProperty('message')
    })

    it('should include appropriate HTTP status codes', async () => {
      // Test 201 for creation
      mockTenantService.createTenant.mockResolvedValue({
        id: 'new-tenant',
        name: 'New Tenant',
      })

      const createResponse = await app.request('/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Tenant',
          slug: 'new-tenant',
          timezone: 'UTC',
          metadata: {},
        }),
      })

      expect(createResponse.status).toBe(201)

      // Test 404 for not found
      const notFoundError = new TenantNotFoundError('non-existent')
      mockTenantService.getTenant.mockRejectedValue(notFoundError)

      const getResponse = await app.request('/tenants/non-existent')
      expect(getResponse.status).toBe(404)
    })
  })
})