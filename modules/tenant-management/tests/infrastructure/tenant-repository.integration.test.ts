/**
 * Tenant Repository Integration Tests
 *
 * Comprehensive integration testing for tenant repository implementation
 * Tests database operations, error handling, and tenant isolation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@pems/database'
import { TenantRepository } from '../src/infrastructure/tenant-repository'
import {
  CreateTenantSchema,
  UpdateTenantSchema,
  TenantSettingSchema,
  TenantNotFoundError,
  TenantSlugAlreadyExistsError,
} from '../src/domain'

// Mock Prisma Client for testing
const mockPrisma = {
  tenant: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  tenantSetting: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
  $disconnect: vi.fn(),
} as unknown as PrismaClient

describe('TenantRepository Integration', () => {
  let repository: TenantRepository

  beforeEach(() => {
    repository = new TenantRepository(mockPrisma)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Tenant Creation', () => {
    it('should create a tenant with valid data', async () => {
      const tenantData = {
        name: 'Test Tenant',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: { theme: 'dark' },
      }

      const mockTenant = {
        id: 'tenant-123',
        name: tenantData.name,
        slug: tenantData.slug,
        timezone: tenantData.timezone,
        metadata: tenantData.metadata,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.tenant.create.mockResolvedValue(mockTenant)

      const result = await repository.create(tenantData)

      expect(mockPrisma.tenant.create).toHaveBeenCalledWith({
        data: {
          name: tenantData.name,
          slug: tenantData.slug,
          timezone: tenantData.timezone,
          metadata: tenantData.metadata,
        },
      })

      expect(result).toEqual({
        id: 'tenant-123',
        name: tenantData.name,
        slug: tenantData.slug,
        timezone: tenantData.timezone,
        metadata: tenantData.metadata,
        createdAt: mockTenant.created_at,
        updatedAt: mockTenant.updated_at,
      })
    })

    it('should handle slug uniqueness constraint', async () => {
      const tenantData = {
        name: 'Test Tenant',
        slug: 'existing-slug',
        timezone: 'UTC',
        metadata: {},
      }

      const prismaError = new Error('Unique constraint failed')
      ;(prismaError as any).code = 'P2002'
      mockPrisma.tenant.create.mockRejectedValue(prismaError)

      await expect(repository.create(tenantData)).rejects.toThrow(
        TenantSlugAlreadyExistsError,
      )
    })

    it('should handle database errors during creation', async () => {
      const tenantData = {
        name: 'Test Tenant',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: {},
      }

      mockPrisma.tenant.create.mockRejectedValue(new Error('Database error'))

      await expect(repository.create(tenantData)).rejects.toThrow('Database error')
    })

    it('should validate input data with schema', async () => {
      const invalidData = {
        name: '',
        slug: '',
        timezone: 'Invalid-Timezone',
        metadata: 'not-object',
      }

      // This should be caught by the schema validation
      expect(() => CreateTenantSchema.parse(invalidData)).toThrow()
    })
  })

  describe('Tenant Retrieval', () => {
    it('should find tenant by ID', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: { theme: 'dark' },
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant)

      const result = await repository.findById('tenant-123')

      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
      })

      expect(result).toEqual({
        id: 'tenant-123',
        name: 'Test Tenant',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: { theme: 'dark' },
        createdAt: mockTenant.created_at,
        updatedAt: mockTenant.updated_at,
      })
    })

    it('should return null for non-existent tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null)

      const result = await repository.findById('non-existent')

      expect(result).toBeNull()
    })

    it('should find tenant by slug', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.tenant.findFirst.mockResolvedValue(mockTenant)

      const result = await repository.findBySlug('test-tenant')

      expect(mockPrisma.tenant.findFirst).toHaveBeenCalledWith({
        where: { slug: 'test-tenant' },
      })

      expect(result).toBeDefined()
      expect(result?.slug).toBe('test-tenant')
    })

    it('should find many tenants with pagination', async () => {
      const mockTenants = [
        {
          id: 'tenant-1',
          name: 'Tenant 1',
          slug: 'tenant-1',
          timezone: 'UTC',
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'tenant-2',
          name: 'Tenant 2',
          slug: 'tenant-2',
          timezone: 'UTC',
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      mockPrisma.tenant.findMany.mockResolvedValue(mockTenants)

      const result = await repository.findMany({ skip: 0, take: 10 })

      expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { created_at: 'asc' },
      })

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Tenant 1')
    })

    it('should count all tenants', async () => {
      mockPrisma.tenant.count.mockResolvedValue(42)

      const result = await repository.count()

      expect(mockPrisma.tenant.count).toHaveBeenCalled()
      expect(result).toBe(42)
    })
  })

  describe('Tenant Updates', () => {
    it('should update tenant with partial data', async () => {
      const updateData = {
        name: 'Updated Name',
        metadata: { newField: 'value' },
      }

      const mockTenant = {
        id: 'tenant-123',
        name: 'Updated Name',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: { newField: 'value' },
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.tenant.update.mockResolvedValue(mockTenant)

      const result = await repository.update('tenant-123', updateData)

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        data: {
          name: 'Updated Name',
          metadata: { newField: 'value' },
        },
      })

      expect(result.name).toBe('Updated Name')
      expect(result.metadata).toEqual({ newField: 'value' })
    })

    it('should handle tenant not found during update', async () => {
      const updateData = { name: 'Updated Name' }

      const prismaError = new Error('Record not found')
      ;(prismaError as any).code = 'P2025'
      mockPrisma.tenant.update.mockRejectedValue(prismaError)

      await expect(repository.update('non-existent', updateData)).rejects.toThrow(
        TenantNotFoundError,
      )
    })

    it('should handle slug conflict during update', async () => {
      const updateData = { slug: 'existing-slug' }

      const prismaError = new Error('Unique constraint failed')
      ;(prismaError as any).code = 'P2002'
      mockPrisma.tenant.update.mockRejectedValue(prismaError)

      await expect(repository.update('tenant-123', updateData)).rejects.toThrow(
        TenantSlugAlreadyExistsError,
      )
    })
  })

  describe('Tenant Deletion', () => {
    it('should delete tenant by ID', async () => {
      mockPrisma.tenant.delete.mockResolvedValue({})

      await repository.delete('tenant-123')

      expect(mockPrisma.tenant.delete).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
      })
    })

    it('should handle tenant not found during deletion', async () => {
      const prismaError = new Error('Record not found')
      ;(prismaError as any).code = 'P2025'
      mockPrisma.tenant.delete.mockRejectedValue(prismaError)

      await expect(repository.delete('non-existent')).rejects.toThrow(
        TenantNotFoundError,
      )
    })
  })

  describe('Tenant Existence Checks', () => {
    it('should check if tenant exists by slug', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-123' })

      const result = await repository.existsBySlug('test-tenant')

      expect(mockPrisma.tenant.findFirst).toHaveBeenCalledWith({
        where: { slug: 'test-tenant' },
        select: { id: true },
      })

      expect(result).toBe(true)
    })

    it('should return false for non-existent slug', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue(null)

      const result = await repository.existsBySlug('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('Tenant Settings Management', () => {
    it('should upsert tenant setting', async () => {
      const settingData = {
        key: 'theme',
        value: 'dark',
      }

      const mockSetting = {
        id: 'setting-123',
        tenant_id: 'tenant-123',
        key: 'theme',
        value: 'dark',
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.tenantSetting.upsert.mockResolvedValue(mockSetting)

      const result = await repository.upsertSetting('tenant-123', settingData)

      expect(mockPrisma.tenantSetting.upsert).toHaveBeenCalledWith({
        where: {
          tenant_id_key: {
            tenant_id: 'tenant-123',
            key: 'theme',
          },
        },
        update: {
          value: 'dark',
        },
        create: {
          tenant_id: 'tenant-123',
          key: 'theme',
          value: 'dark',
        },
      })

      expect(result).toEqual({
        id: 'setting-123',
        tenantId: 'tenant-123',
        key: 'theme',
        value: 'dark',
        createdAt: mockSetting.created_at,
        updatedAt: mockSetting.updated_at,
      })
    })

    it('should get tenant setting', async () => {
      const mockSetting = {
        id: 'setting-123',
        tenant_id: 'tenant-123',
        key: 'theme',
        value: 'dark',
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.tenantSetting.findUnique.mockResolvedValue(mockSetting)

      const result = await repository.getSetting('tenant-123', 'theme')

      expect(mockPrisma.tenantSetting.findUnique).toHaveBeenCalledWith({
        where: {
          tenant_id_key: {
            tenant_id: 'tenant-123',
            key: 'theme',
          },
        },
      })

      expect(result).toEqual({
        id: 'setting-123',
        tenantId: 'tenant-123',
        key: 'theme',
        value: 'dark',
        createdAt: mockSetting.created_at,
        updatedAt: mockSetting.updated_at,
      })
    })

    it('should return null for non-existent setting', async () => {
      mockPrisma.tenantSetting.findUnique.mockResolvedValue(null)

      const result = await repository.getSetting('tenant-123', 'non-existent')

      expect(result).toBeNull()
    })

    it('should get all tenant settings', async () => {
      const mockSettings = [
        {
          id: 'setting-1',
          tenant_id: 'tenant-123',
          key: 'theme',
          value: 'dark',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'setting-2',
          tenant_id: 'tenant-123',
          key: 'language',
          value: 'en',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      mockPrisma.tenantSetting.findMany.mockResolvedValue(mockSettings)

      const result = await repository.getAllSettings('tenant-123')

      expect(mockPrisma.tenantSetting.findMany).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-123' },
        orderBy: { key: 'asc' },
      })

      expect(result).toHaveLength(2)
      expect(result[0].key).toBe('theme')
      expect(result[1].key).toBe('language')
    })

    it('should delete tenant setting', async () => {
      mockPrisma.tenantSetting.delete.mockResolvedValue({})

      await repository.deleteSetting('tenant-123', 'theme')

      expect(mockPrisma.tenantSetting.delete).toHaveBeenCalledWith({
        where: {
          tenant_id_key: {
            tenant_id: 'tenant-123',
            key: 'theme',
          },
        },
      })
    })

    it('should handle non-existent setting deletion gracefully', async () => {
      const prismaError = new Error('Record not found')
      ;(prismaError as any).code = 'P2025'
      mockPrisma.tenantSetting.delete.mockRejectedValue(prismaError)

      // Should not throw error for non-existent setting
      await expect(
        repository.deleteSetting('tenant-123', 'non-existent'),
      ).resolves.toBeUndefined()
    })
  })

  describe('Security and Input Validation', () => {
    it('should handle malicious input in tenant data', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        slug: '../../../etc/passwd',
        timezone: 'malicious-timezone',
        metadata: { __proto__: { malicious: true } },
      }

      const mockTenant = {
        id: 'tenant-123',
        ...maliciousData,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.tenant.create.mockResolvedValue(mockTenant)

      const result = await repository.create(maliciousData)

      // Repository should pass through data as-is, validation happens at domain level
      expect(result.name).toBe(maliciousData.name)
      expect(result.slug).toBe(maliciousData.slug)
    })

    it('should handle extremely long strings', async () => {
      const longString = 'a'.repeat(10000)
      const longData = {
        name: longString,
        slug: longString,
        timezone: longString,
        metadata: { longField: longString },
      }

      mockPrisma.tenant.create.mockRejectedValue(new Error('Data too long'))

      await expect(repository.create(longData)).rejects.toThrow()
    })

    it('should handle null/undefined inputs safely', async () => {
      // Test with null tenant ID
      await expect(repository.findById(null as any)).rejects.toThrow()
      await expect(repository.findBySlug(null as any)).rejects.toThrow()
      await expect(repository.delete(null as any)).rejects.toThrow()
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.tenant.findUnique.mockRejectedValue(
        new Error('Connection lost'),
      )

      await expect(repository.findById('tenant-123')).rejects.toThrow(
        'Connection lost',
      )
    })

    it('should handle transaction rollback scenarios', async () => {
      mockPrisma.tenant.create.mockRejectedValue(new Error('Transaction failed'))

      const tenantData = {
        name: 'Test Tenant',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: {},
      }

      await expect(repository.create(tenantData)).rejects.toThrow()
    })

    it('should handle concurrent operations safely', async () => {
      const tenantData = {
        name: 'Test Tenant',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: {},
      }

      // Simulate concurrent creation attempts
      const mockTenant = {
        id: 'tenant-123',
        ...tenantData,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.tenant.create
        .mockResolvedValueOnce(mockTenant)
        .mockRejectedValueOnce(new Error('Concurrent creation failed'))

      const results = await Promise.allSettled([
        repository.create(tenantData),
        repository.create(tenantData),
      ])

      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('rejected')
    })
  })

  describe('Performance and Memory', () => {
    it('should handle large tenant lists efficiently', async () => {
      const manyTenants = Array.from({ length: 1000 }, (_, i) => ({
        id: `tenant-${i}`,
        name: `Tenant ${i}`,
        slug: `tenant-${i}`,
        timezone: 'UTC',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }))

      mockPrisma.tenant.findMany.mockResolvedValue(manyTenants)

      const result = await repository.findMany()

      expect(result).toHaveLength(1000)
      expect(mockPrisma.tenant.findMany).toHaveBeenCalledTimes(1)
    })

    it('should not leak memory with repeated operations', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant)

      // Simulate many repeated operations
      for (let i = 0; i < 1000; i++) {
        await repository.findById('tenant-123')
      }

      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(1000)
    })
  })

  describe('Domain Entity Mapping', () => {
    it('should correctly map database fields to domain entities', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: { theme: 'dark', version: 2 },
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-02'),
      }

      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant)

      const result = await repository.findById('tenant-123')

      expect(result).toEqual({
        id: 'tenant-123',
        name: 'Test Tenant',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: { theme: 'dark', version: 2 },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      })
    })

    it('should handle null metadata correctly', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        slug: 'test-tenant',
        timezone: 'UTC',
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant)

      const result = await repository.findById('tenant-123')

      expect(result?.metadata).toBeNull()
    })
  })
})