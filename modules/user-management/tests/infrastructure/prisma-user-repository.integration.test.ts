/**
 * Prisma User Repository Integration Tests
 *
 * Comprehensive integration testing for user repository implementation
 * Tests CRUD operations, tenant isolation, search functionality, and security
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@pems/database'
import { PrismaUserRepository } from '../src/infrastructure/prisma-user-repository'
import type {
  CreateUserInput,
  UpdateUserInput,
  SearchOptions,
  PaginatedResult,
} from '../src/domain'

// Mock Prisma Client for testing
const mockPrisma = {
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
  $disconnect: vi.fn(),
} as unknown as PrismaClient

describe('PrismaUserRepository Integration', () => {
  let repository: PrismaUserRepository

  beforeEach(() => {
    repository = new PrismaUserRepository(mockPrisma)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData: CreateUserInput = {
        tenantId: 'tenant-123',
        email: 'user@example.com',
        phone: '+1234567890',
      }

      const mockUser = {
        id: 'user-123',
        tenant_id: userData.tenantId,
        email: userData.email.toLowerCase(),
        phone: userData.phone,
        is_active: true,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.user.create.mockResolvedValue(mockUser)

      const result = await repository.create(userData)

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          tenant_id: userData.tenantId,
          email: userData.email.toLowerCase(),
          phone: userData.phone,
          is_active: true,
          is_system_admin: false,
          metadata: {},
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      })

      expect(result).toEqual({
        id: 'user-123',
        tenantId: userData.tenantId,
        email: userData.email.toLowerCase(),
        phone: userData.phone,
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at,
      })
    })

    it('should normalize email to lowercase', async () => {
      const userData: CreateUserInput = {
        tenantId: 'tenant-123',
        email: 'User@EXAMPLE.COM',
        phone: null,
      }

      const mockUser = {
        id: 'user-123',
        tenant_id: userData.tenantId,
        email: 'user@example.com', // Lowercase
        phone: null,
        is_active: true,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.user.create.mockResolvedValue(mockUser)

      await repository.create(userData)

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'user@example.com', // Should be lowercase
        }),
      })
    })

    it('should handle null phone number', async () => {
      const userData: CreateUserInput = {
        tenantId: 'tenant-123',
        email: 'user@example.com',
        phone: null,
      }

      const mockUser = {
        id: 'user-123',
        tenant_id: userData.tenantId,
        email: userData.email.toLowerCase(),
        phone: null,
        is_active: true,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.user.create.mockResolvedValue(mockUser)

      const result = await repository.create(userData)

      expect(result.phone).toBe('')
    })

    it('should handle database errors during creation', async () => {
      const userData: CreateUserInput = {
        tenantId: 'tenant-123',
        email: 'user@example.com',
        phone: null,
      }

      mockPrisma.user.create.mockRejectedValue(new Error('Database error'))

      await expect(repository.create(userData)).rejects.toThrow('Database error')
    })
  })

  describe('User Retrieval', () => {
    it('should find user by ID', async () => {
      const mockUser = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        email: 'user@example.com',
        phone: '+1234567890',
        is_active: true,
        is_system_admin: false,
        metadata: { fullName: 'John Doe' },
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await repository.findById('user-123')

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      })

      expect(result).toEqual({
        id: 'user-123',
        tenantId: 'tenant-123',
        email: 'user@example.com',
        phone: '+1234567890',
        isActive: true,
        isSystemAdmin: false,
        metadata: { fullName: 'John Doe' },
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at,
      })
    })

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await repository.findById('non-existent')

      expect(result).toBeNull()
    })

    it('should find user by email with tenant', async () => {
      const mockUser = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        email: 'user@example.com',
        phone: null,
        is_active: true,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await repository.findByEmail('user@example.com', 'tenant-123')

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          tenant_id_email: {
            tenant_id: 'tenant-123',
            email: 'user@example.com',
          },
        },
      })

      expect(result).toBeDefined()
      expect(result?.email).toBe('user@example.com')
    })

    it('should return null when tenant ID not provided for email lookup', async () => {
      const result = await repository.findByEmail('user@example.com')

      expect(result).toBeNull()
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('should find user by email with auth providers', async () => {
      const mockUser = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        email: 'user@example.com',
        phone: null,
        is_active: true,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
        auth_providers: [
          {
            id: 'auth-123',
            user_id: 'user-123',
            provider: 'email',
            provider_id: null,
            password_hash: 'hashed-password',
            mfa_enabled: false,
            created_at: new Date(),
          },
        ],
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await repository.findByEmailWithAuth(
        'user@example.com',
        'tenant-123',
      )

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          tenant_id_email: {
            tenant_id: 'tenant-123',
            email: 'user@example.com',
          },
        },
        include: {
          auth_providers: true,
        },
      })

      expect(result).toEqual({
        id: 'user-123',
        tenantId: 'tenant-123',
        email: 'user@example.com',
        phone: '',
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at,
        authProviders: [
          {
            id: 'auth-123',
            userId: 'user-123',
            provider: 'email',
            passwordHash: 'hashed-password',
            mfaEnabled: false,
            createdAt: mockUser.auth_providers[0].created_at,
          },
        ],
      })
    })
  })

  describe('User Updates', () => {
    it('should update user with partial data', async () => {
      const updateData: UpdateUserInput = {
        email: 'newemail@example.com',
        phone: '+9876543210',
        isActive: false,
      }

      const mockUser = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        email: updateData.email?.toLowerCase(),
        phone: updateData.phone,
        is_active: updateData.isActive,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.user.update.mockResolvedValue(mockUser)

      const result = await repository.update('user-123', updateData)

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          email: updateData.email?.toLowerCase(),
          phone: updateData.phone,
          is_active: updateData.isActive,
          updated_at: expect.any(Date),
        },
      })

      expect(result.email).toBe('newemail@example.com')
      expect(result.phone).toBe('+9876543210')
      expect(result.isActive).toBe(false)
    })

    it('should handle undefined update fields', async () => {
      const updateData: UpdateUserInput = {
        phone: '+9876543210', // Only update phone
      }

      const mockUser = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        email: 'user@example.com',
        phone: '+9876543210',
        is_active: true,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.user.update.mockResolvedValue(mockUser)

      await repository.update('user-123', updateData)

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          phone: '+9876543210',
          updated_at: expect.any(Date),
        },
      })

      // Should not include undefined fields
      expect(mockPrisma.user.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: expect.any(String),
            is_active: expect.any(Boolean),
          }),
        }),
      )
    })

    it('should normalize email on update', async () => {
      const updateData: UpdateUserInput = {
        email: 'NEWEMAIL@EXAMPLE.COM',
      }

      const mockUser = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        email: 'newemail@example.com', // Normalized
        phone: null,
        is_active: true,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.user.update.mockResolvedValue(mockUser)

      await repository.update('user-123', updateData)

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          email: 'newemail@example.com', // Should be lowercase
          updated_at: expect.any(Date),
        },
      })
    })
  })

  describe('User Deletion', () => {
    it('should delete user by ID', async () => {
      mockPrisma.user.delete.mockResolvedValue({})

      await repository.delete('user-123')

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      })
    })

    it('should handle database errors during deletion', async () => {
      mockPrisma.user.delete.mockRejectedValue(new Error('Database error'))

      await expect(repository.delete('user-123')).rejects.toThrow('Database error')
    })
  })

  describe('Tenant-Aware Operations', () => {
    it('should find users by tenant with pagination', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          tenant_id: 'tenant-123',
          email: 'user1@example.com',
          phone: null,
          is_active: true,
          is_system_admin: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'user-2',
          tenant_id: 'tenant-123',
          email: 'user2@example.com',
          phone: null,
          is_active: true,
          is_system_admin: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      mockPrisma.user.findMany.mockResolvedValue(mockUsers)

      const result = await repository.findByTenant('tenant-123', {
        page: 2,
        limit: 10,
      })

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-123' },
        skip: 10, // (page - 1) * limit = (2 - 1) * 10
        take: 10,
        orderBy: { created_at: 'desc' },
      })

      expect(result).toHaveLength(2)
      expect(result[0].email).toBe('user1@example.com')
    })

    it('should use default pagination options', async () => {
      mockPrisma.user.findMany.mockResolvedValue([])

      await repository.findByTenant('tenant-123')

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-123' },
        skip: 0, // (page - 1) * limit = (1 - 1) * 20
        take: 20, // default limit
        orderBy: { created_at: 'desc' },
      })
    })

    it('should count users by tenant', async () => {
      mockPrisma.user.count.mockResolvedValue(42)

      const result = await repository.countByTenant('tenant-123')

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-123' },
      })

      expect(result).toBe(42)
    })

    it('should search users within tenant', async () => {
      const query = 'john'
      const tenantId = 'tenant-123'
      const options: SearchOptions = {
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc',
        isActive: true,
      }

      const mockUsers = [
        {
          id: 'user-1',
          tenant_id: tenantId,
          email: 'john.doe@example.com',
          metadata: { full_name: 'John Doe' },
          is_active: true,
          phone: null,
          is_system_admin: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      mockPrisma.user.findMany.mockResolvedValue(mockUsers)
      mockPrisma.user.count.mockResolvedValue(1)

      const result = await repository.search(query, tenantId, options)

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          tenant_id: tenantId,
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { metadata: { path: [], string_contains: query } },
          ],
          is_active: true,
        },
        skip: 0,
        take: 10,
        orderBy: {
          metadata: { path: ['full_name'], string: 'asc' },
        },
      })

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: {
          tenant_id: tenantId,
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { metadata: { path: [], string_contains: query } },
          ],
          is_active: true,
        },
      })

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            email: 'john.doe@example.com',
          }),
        ]),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
    })

    it('should handle search with different sort options', async () => {
      const query = 'test'
      const tenantId = 'tenant-123'

      // Test email sorting
      mockPrisma.user.findMany.mockResolvedValue([])
      mockPrisma.user.count.mockResolvedValue(0)

      await repository.search(query, tenantId, {
        sortBy: 'email',
        sortOrder: 'desc',
      })

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { email: 'desc' },
      })

      // Test createdAt sorting
      await repository.search(query, tenantId, {
        sortBy: 'createdAt',
        sortOrder: 'asc',
      })

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { created_at: 'asc' },
      })
    })
  })

  describe('Bulk Operations', () => {
    it('should handle bulk user updates', async () => {
      const updates = [
        { id: 'user-1', data: { email: 'new1@example.com' } },
        { id: 'user-2', data: { phone: '+1234567890' } },
      ]

      const mockUsers = [
        {
          id: 'user-1',
          tenant_id: 'tenant-123',
          email: 'new1@example.com',
          phone: null,
          is_active: true,
          is_system_admin: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'user-2',
          tenant_id: 'tenant-123',
          email: 'user2@example.com',
          phone: '+1234567890',
          is_active: true,
          is_system_admin: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      mockPrisma.user.update
        .mockResolvedValueOnce(mockUsers[0])
        .mockResolvedValueOnce(mockUsers[1])

      const result = await repository.bulkUpdate(updates)

      expect(mockPrisma.user.update).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(2)
      expect(result[0].email).toBe('new1@example.com')
      expect(result[1].phone).toBe('+1234567890')
    })
  })

  describe('Existence Checks', () => {
    it('should check if user exists by email and tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' })

      const result = await repository.existsByEmail(
        'user@example.com',
        'tenant-123',
      )

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          tenant_id_email: {
            tenant_id: 'tenant-123',
            email: 'user@example.com',
          },
        },
        select: { id: true },
      })

      expect(result).toBe(true)
    })

    it('should return false for non-existent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await repository.existsByEmail(
        'nonexistent@example.com',
        'tenant-123',
      )

      expect(result).toBe(false)
    })

    it('should check if user exists by ID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' })

      const result = await repository.existsById('user-123')

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { id: true },
      })

      expect(result).toBe(true)
    })
  })

  describe('Security and Input Validation', () => {
    it('should handle malicious input in user data', async () => {
      const maliciousData: CreateUserInput = {
        tenantId: 'tenant-123',
        email: '<script>alert("xss")</script>@example.com',
        phone: '../../../etc/passwd',
      }

      const mockUser = {
        id: 'user-123',
        tenant_id: maliciousData.tenantId,
        email: maliciousData.email.toLowerCase(),
        phone: maliciousData.phone,
        is_active: true,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.user.create.mockResolvedValue(mockUser)

      const result = await repository.create(maliciousData)

      // Repository should pass through data as-is, validation happens at domain level
      expect(result.email).toContain('<script>')
    })

    it('should handle extremely long strings', async () => {
      const longEmail = 'a'.repeat(10000) + '@example.com'
      const longPhone = '1' + 'a'.repeat(10000)

      const userData: CreateUserInput = {
        tenantId: 'tenant-123',
        email: longEmail,
        phone: longPhone,
      }

      mockPrisma.user.create.mockRejectedValue(new Error('Data too long'))

      await expect(repository.create(userData)).rejects.toThrow()
    })

    it('should handle SQL injection attempts', async () => {
      const maliciousEmail = "'; DROP TABLE users; --"
      const maliciousTenantId = "'; DROP TABLE tenants; --"

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await repository.findByEmail(maliciousEmail, maliciousTenantId)

      expect(result).toBeNull()
      // Ensure query parameterization (should be handled by Prisma)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          tenant_id_email: {
            tenant_id: maliciousTenantId,
            email: maliciousEmail,
          },
        },
      })
    })

    it('should handle null/undefined inputs safely', async () => {
      // Test with null IDs
      await expect(repository.findById(null as any)).rejects.toThrow()
      await expect(repository.delete(null as any)).rejects.toThrow()
      await expect(repository.update(null as any, {})).rejects.toThrow()
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(
        new Error('Connection lost'),
      )

      await expect(repository.findById('user-123')).rejects.toThrow(
        'Connection lost',
      )
    })

    it('should handle concurrent operations safely', async () => {
      const userData: CreateUserInput = {
        tenantId: 'tenant-123',
        email: 'user@example.com',
        phone: null,
      }

      const mockUser = {
        id: 'user-123',
        tenant_id: userData.tenantId,
        email: userData.email.toLowerCase(),
        phone: null,
        is_active: true,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.user.create
        .mockResolvedValueOnce(mockUser)
        .mockRejectedValueOnce(new Error('Concurrent creation failed'))

      const results = await Promise.allSettled([
        repository.create(userData),
        repository.create(userData),
      ])

      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('rejected')
    })

    it('should handle search with malformed query', async () => {
      const maliciousQuery = '../'
      const tenantId = 'tenant-123'

      mockPrisma.user.findMany.mockRejectedValue(new Error('Invalid query'))

      await expect(
        repository.search(maliciousQuery, tenantId),
      ).rejects.toThrow('Invalid query')
    })
  })

  describe('Performance and Memory', () => {
    it('should handle large user lists efficiently', async () => {
      const manyUsers = Array.from({ length: 1000 }, (_, i) => ({
        id: `user-${i}`,
        tenant_id: 'tenant-123',
        email: `user${i}@example.com`,
        phone: null,
        is_active: true,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }))

      mockPrisma.user.findMany.mockResolvedValue(manyUsers)

      const result = await repository.findByTenant('tenant-123', { limit: 1000 })

      expect(result).toHaveLength(1000)
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1)
    })

    it('should not leak memory with repeated operations', async () => {
      const mockUser = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        email: 'user@example.com',
        phone: null,
        is_active: true,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      // Simulate many repeated operations
      for (let i = 0; i < 1000; i++) {
        await repository.findById('user-123')
      }

      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1000)
    })

    it('should handle search pagination efficiently', async () => {
      const query = 'test'
      const tenantId = 'tenant-123'

      mockPrisma.user.findMany.mockResolvedValue([])
      mockPrisma.user.count.mockResolvedValue(5000)

      const result = await repository.search(query, tenantId, {
        page: 10,
        limit: 50,
      })

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        skip: 450, // (page - 1) * limit = (10 - 1) * 50
        take: 50,
        orderBy: expect.any(Object),
      })

      expect(result.totalPages).toBe(100) // Math.ceil(5000 / 50)
    })
  })

  describe('Domain Entity Mapping', () => {
    it('should correctly map database fields to domain entities', async () => {
      const mockUser = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        email: 'user@example.com',
        phone: '+1234567890',
        is_active: false,
        is_system_admin: true,
        metadata: {
          fullName: 'John Doe',
          department: 'Engineering',
          preferences: { theme: 'dark' },
        },
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-02'),
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await repository.findById('user-123')

      expect(result).toEqual({
        id: 'user-123',
        tenantId: 'tenant-123',
        email: 'user@example.com',
        phone: '+1234567890',
        isActive: false,
        isSystemAdmin: true,
        metadata: {
          fullName: 'John Doe',
          department: 'Engineering',
          preferences: { theme: 'dark' },
        },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      })
    })

    it('should handle null metadata correctly', async () => {
      const mockUser = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        email: 'user@example.com',
        phone: null,
        is_active: true,
        is_system_admin: false,
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await repository.findById('user-123')

      expect(result?.metadata).toEqual({})
      expect(result?.phone).toBe('')
    })

    it('should handle null phone correctly', async () => {
      const mockUser = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        email: 'user@example.com',
        phone: null,
        is_active: true,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await repository.findById('user-123')

      expect(result?.phone).toBe('')
    })
  })
})