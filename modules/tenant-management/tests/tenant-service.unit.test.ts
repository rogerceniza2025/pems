/**
 * Tenant Service Unit Tests
 *
 * Tests for tenant service business logic, domain events,
 * and error handling following DDD principles.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest'
import { z } from 'zod'
import { TenantService } from '../src/application'
import type {
  TenantDomainEntity,
  TenantSettingDomainEntity
} from '../src/domain'
import {
  CreateTenantSchema,
  TenantSettingSchema,
  UpdateTenantSchema
} from '../src/domain'
import type { ITenantRepository } from '../src/infrastructure'

describe('TenantService', () => {
  let tenantService: TenantService
  let mockRepository: ITenantRepository

  const mockTenant: TenantDomainEntity = {
    id: 'tenant-001',
    name: 'Test School',
    slug: 'test-school',
    timezone: 'Asia/Manila',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    mockRepository = {
      create: vi.fn().mockResolvedValue(mockTenant),
      findById: vi.fn().mockResolvedValue(mockTenant),
      findBySlug: vi.fn().mockResolvedValue(mockTenant),
      findMany: vi.fn().mockResolvedValue([mockTenant]),
      update: vi.fn().mockResolvedValue(mockTenant),
      delete: vi.fn().mockResolvedValue(undefined),
      existsBySlug: vi.fn().mockResolvedValue(false),
      count: vi.fn().mockResolvedValue(1),
      upsertSetting: vi.fn().mockResolvedValue({
        id: 'setting-001',
        tenantId: 'tenant-001',
        key: 'test',
        value: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      getSetting: vi.fn().mockResolvedValue(null),
      getAllSettings: vi.fn().mockResolvedValue([]),
      deleteSetting: vi.fn().mockResolvedValue(undefined)
    } as any

    tenantService = new TenantService(mockRepository)
  })

  describe('createTenant', () => {
    test('should create tenant successfully', async () => {
      const createData: z.infer<typeof CreateTenantSchema> = {
        name: 'New School',
        slug: 'new-school',
        timezone: 'Asia/Manila',
        metadata: {}
      }

      ;(mockRepository.findBySlug as any).mockResolvedValue(null)
      ;(mockRepository.create as any).mockResolvedValue({
        ...mockTenant,
        id: 'new-tenant-001',
        ...createData
      })

      const result = await tenantService.createTenant(createData)

      expect(mockRepository.findBySlug).toHaveBeenCalledWith('new-school')
      expect(mockRepository.create).toHaveBeenCalledWith(createData)
      expect(result.name).toBe('New School')
      expect(result.slug).toBe('new-school')

      // Should emit domain event
      const events = tenantService.getDomainEvents()
      expect(events).toHaveLength(1)
      expect(events[0]?.type).toBe('TENANT_CREATED')
      expect(events[0]?.tenantId).toBe('new-tenant-001')
    })

    test('should throw error if tenant slug already exists', async () => {
      const createData: z.infer<typeof CreateTenantSchema> = {
        name: 'Duplicate School',
        slug: 'existing-school',
        timezone: 'Asia/Manila',
        metadata: {}
      }

      ;(mockRepository.findBySlug as any).mockResolvedValue(mockTenant)

      await expect(tenantService.createTenant(createData)).rejects.toThrow('already exists')
      expect(mockRepository.create).not.toHaveBeenCalled()
    })
  })

  describe('updateTenant', () => {
    test('should update tenant successfully', async () => {
      const updateData: z.infer<typeof UpdateTenantSchema> = {
        name: 'Updated School Name',
        timezone: 'UTC'
      }

      ;(mockRepository.findById as any).mockResolvedValue(mockTenant)
      ;(mockRepository.existsBySlug as any).mockResolvedValue(false)
      ;(mockRepository.update as any).mockResolvedValue({
        ...mockTenant,
        ...updateData
      })

      const result = await tenantService.updateTenant('tenant-001', updateData)

      expect(mockRepository.findById).toHaveBeenCalledWith('tenant-001')
      expect(mockRepository.update).toHaveBeenCalledWith('tenant-001', updateData)
      expect(result.name).toBe('Updated School Name')
      expect(result.timezone).toBe('UTC')

      // Should emit domain event
      const events = tenantService.getDomainEvents()
      expect(events).toHaveLength(1)
      expect(events[0]?.type).toBe('TENANT_UPDATED')
      if (events[0]?.type === 'TENANT_UPDATED') {
        expect(events[0].changes.name).toBe('Updated School Name')
      }
    })

    test('should not emit domain event if no actual changes', async () => {
      const updateData: z.infer<typeof UpdateTenantSchema> = {
        name: 'Test School' // Same as existing
      }

      ;(mockRepository.findById as any).mockResolvedValue(mockTenant)
      ;(mockRepository.existsBySlug as any).mockResolvedValue(false)
      ;(mockRepository.update as any).mockResolvedValue(mockTenant)

      await tenantService.updateTenant('tenant-001', updateData)

      // Should not emit domain event for no changes
      const events = tenantService.getDomainEvents()
      expect(events).toHaveLength(0)
    })

    test('should validate slug uniqueness when updating slug', async () => {
      const updateData: z.infer<typeof UpdateTenantSchema> = {
        slug: 'different-school'
      }

      ;(mockRepository.findById as any).mockResolvedValue(mockTenant)
      ;(mockRepository.existsBySlug as any).mockResolvedValue(true) // Slug already exists

      await expect(tenantService.updateTenant('tenant-001', updateData))
        .rejects.toThrow('already exists')
      expect(mockRepository.update).not.toHaveBeenCalled()
    })
  })

  describe('listTenants', () => {
    test('should return paginated tenant list', async () => {
      const mockTenants = [mockTenant, { ...mockTenant, id: 'tenant-002', name: 'School 2' }]

      ;(mockRepository.findMany as any).mockResolvedValue(mockTenants)
      ;(mockRepository.count as any).mockResolvedValue(2)

      const result = await tenantService.listTenants({ page: 1, limit: 10 })

      expect(result.tenants).toHaveLength(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
      expect(result.total).toBe(2)
      expect(result.totalPages).toBe(1)

      expect(mockRepository.findMany).toHaveBeenCalledWith({ skip: 0, take: 10 })
      expect(mockRepository.count).toHaveBeenCalled()
    })

    test('should use default pagination values', async () => {
      ;(mockRepository.findMany as any).mockResolvedValue([])
      ;(mockRepository.count as any).mockResolvedValue(0)

      const result = await tenantService.listTenants()

      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(mockRepository.findMany).toHaveBeenCalledWith({ skip: 0, take: 20 })
    })
  })

  describe('tenant settings', () => {
    test('should upsert tenant setting', async () => {
      const settingData: z.infer<typeof TenantSettingSchema> = {
        key: 'school.theme',
        value: 'dark'
      }

      const mockSetting: TenantSettingDomainEntity = {
        id: 'setting-001',
        tenantId: 'tenant-001',
        key: 'school.theme',
        value: 'dark',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      ;(mockRepository.findById as any).mockResolvedValue(mockTenant)
      ;(mockRepository.upsertSetting as any).mockResolvedValue(mockSetting)

      const result = await tenantService.upsertTenantSetting('tenant-001', settingData)

      expect(mockRepository.findById).toHaveBeenCalledWith('tenant-001')
      expect(mockRepository.upsertSetting).toHaveBeenCalledWith('tenant-001', settingData)
      expect(result.key).toBe('school.theme')
      expect(result.value).toBe('dark')

      // Should emit domain event
      const events = tenantService.getDomainEvents()
      expect(events).toHaveLength(1)
      expect(events[0]?.type).toBe('TENANT_SETTING_UPDATED')
    })

    test('should get all tenant settings', async () => {
      const mockSettings: TenantSettingDomainEntity[] = [
        {
          id: 'setting-001',
          tenantId: 'tenant-001',
          key: 'school.theme',
          value: 'dark',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'setting-002',
          tenantId: 'tenant-001',
          key: 'school.timezone',
          value: 'Asia/Manila',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      ;(mockRepository.findById as any).mockResolvedValue(mockTenant)
      ;(mockRepository.getAllSettings as any).mockResolvedValue(mockSettings)

      const result = await tenantService.getAllTenantSettings('tenant-001')

      expect(mockRepository.findById).toHaveBeenCalledWith('tenant-001')
      expect(mockRepository.getAllSettings).toHaveBeenCalledWith('tenant-001')
      expect(result).toHaveLength(2)
      expect(result[0]?.key).toBe('school.theme')
    })
  })

  describe('domain events', () => {
    test('should track multiple domain events', async () => {
      // Create tenant
      ;(mockRepository.findBySlug as any).mockResolvedValue(null)
      ;(mockRepository.create as any).mockResolvedValue(mockTenant)
      await tenantService.createTenant({
        name: 'Event Test School',
        slug: 'event-test',
        timezone: 'Asia/Manila',
        metadata: {}
      })

      // Update tenant
      ;(mockRepository.findById as any).mockResolvedValue(mockTenant)
      ;(mockRepository.existsBySlug as any).mockResolvedValue(false)
      ;(mockRepository.update as any).mockResolvedValue({
        ...mockTenant,
        name: 'Updated School'
      })
      await tenantService.updateTenant('tenant-001', { name: 'Updated School' })

      const events = tenantService.getDomainEvents()
      expect(events).toHaveLength(2)
      expect(events[0]?.type).toBe('TENANT_CREATED')
      expect(events[1]?.type).toBe('TENANT_UPDATED')
    })

    test('should clear domain events', async () => {
      ;(mockRepository.findBySlug as any).mockResolvedValue(null)
      ;(mockRepository.create as any).mockResolvedValue(mockTenant)
      await tenantService.createTenant({ name: 'Test', slug: 'test', timezone: 'Asia/Manila', metadata: {} })

      expect(tenantService.getDomainEvents()).toHaveLength(1)

      tenantService.clearDomainEvents()
      expect(tenantService.getDomainEvents()).toHaveLength(0)
    })
  })

  describe('error handling', () => {
    test('should throw tenant not found error', async () => {
      ;(mockRepository.findById as any).mockResolvedValue(null)

      await expect(tenantService.getTenant('non-existent-id'))
        .rejects.toThrow('not found')
    })

    test('should throw tenant not found when getting by slug', async () => {
      ;(mockRepository.findBySlug as any).mockResolvedValue(null)

      await expect(tenantService.getTenantBySlug('non-existent-slug'))
        .rejects.toThrow('not found')
    })

    test('should handle tenant not found on delete', async () => {
      ;(mockRepository.findById as any).mockResolvedValue(null)

      await expect(tenantService.deleteTenant('non-existent-id'))
        .rejects.toThrow('not found')
    })
  })
})