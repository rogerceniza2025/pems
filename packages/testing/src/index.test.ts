import { describe, expect, it, vi } from 'vitest'
import type { TestTenant, TestUser } from './index'
import {
  createMockEvent,
  createTestTenant,
  createTestUser,
  mockApiResponse
} from './index'

describe('Testing Utilities', () => {
  describe('createTestUser', () => {
    it('should create a test user with default values', () => {
      const user = createTestUser()
      
      expect(user.id).toBe('test-user-id')
      expect(user.email).toBe('test@example.com')
      expect(user.name).toBe('Test User')
      expect(user.tenantId).toBe('test-tenant-id')
    })

    it('should create a test user with overridden values', () => {
      const overrides = {
        id: 'custom-id',
        email: 'custom@example.com'
      }
      const user = createTestUser(overrides)
      
      expect(user.id).toBe('custom-id')
      expect(user.email).toBe('custom@example.com')
      expect(user.name).toBe('Test User') // Default value
      expect(user.tenantId).toBe('test-tenant-id') // Default value
    })

    it('should handle partial overrides correctly', () => {
      const user = createTestUser({ name: 'Custom Name' })
      
      expect(user.name).toBe('Custom Name')
      expect(user.email).toBe('test@example.com') // Default value
    })
  })

  describe('createTestTenant', () => {
    it('should create a test tenant with default values', () => {
      const tenant = createTestTenant()
      
      expect(tenant.id).toBe('test-tenant-id')
      expect(tenant.name).toBe('Test Tenant')
      expect(tenant.slug).toBe('test-tenant')
    })

    it('should create a test tenant with overridden values', () => {
      const overrides = {
        id: 'custom-tenant-id',
        name: 'Custom Tenant'
      }
      const tenant = createTestTenant(overrides)
      
      expect(tenant.id).toBe('custom-tenant-id')
      expect(tenant.name).toBe('Custom Tenant')
      expect(tenant.slug).toBe('test-tenant') // Default value
    })
  })

  describe('mockApiResponse', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should resolve with data immediately when no delay', async () => {
      const testData = { message: 'test' }
      const result = await mockApiResponse(testData)
      
      expect(result).toEqual(testData)
    })

    it('should resolve with data after delay', async () => {
      const testData = { message: 'test' }
      
      // Fast forward time
      vi.advanceTimersByTime(100)
      const result = await vi.runAllTimersAsync()
      
      expect(result).toEqual(testData)
    })
  })

  describe('createMockEvent', () => {
    it('should create a mock event with default values', () => {
      const event = createMockEvent()
      
      expect(event.type).toBe('click')
      expect(event.bubbles).toBe(true)
      expect(event.cancelable).toBe(true)
    })

    it('should create a mock event with overridden values', () => {
      const overrides = {
        type: 'mouseover',
        bubbles: false
      }
      const event = createMockEvent(overrides)
      
      expect(event.type).toBe('mouseover')
      expect(event.bubbles).toBe(false)
      expect(event.cancelable).toBe(true) // Default value
    })
  })

  describe('Type Definitions', () => {
    it('should have correct TestUser interface', () => {
      const user: TestUser = {
        id: 'test',
        email: 'test@example.com',
        name: 'Test',
        tenantId: 'tenant'
      }
      
      expect(user.id).toBe('test')
      expect(user.email).toBe('test@example.com')
      expect(user.name).toBe('Test')
      expect(user.tenantId).toBe('tenant')
    })

    it('should have correct TestTenant interface', () => {
      const tenant: TestTenant = {
        id: 'tenant-id',
        name: 'Tenant Name',
        slug: 'tenant-slug'
      }
      
      expect(tenant.id).toBe('tenant-id')
      expect(tenant.name).toBe('Tenant Name')
      expect(tenant.slug).toBe('tenant-slug')
    })
  })
})