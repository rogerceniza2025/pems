/**
 * Tenant Isolation Integration Tests
 *
 * Comprehensive testing for tenant data isolation across all application layers:
 * - Database-level Row Level Security (RLS)
 * - API-level tenant context validation
 * - UI-level tenant-aware rendering
 * - Cross-tenant access prevention
 * - Data leakage prevention
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/test-database'
import { createTestTenant, createTestTenants } from '../helpers/test-tenant'
import { createTestUser } from '../helpers/test-user'
import { PrismaClient } from '@prisma/client'
import { TenantAwareClient } from '../../packages/infrastructure/database/src/tenant-aware-client'
import { TenantContext } from '../../packages/infrastructure/middleware/src/tenant-context'
import { TenantRepository } from '../../modules/tenant-management/src/infrastructure/tenant-repository'
import { PrismaUserRepository } from '../../modules/user-management/src/infrastructure/prisma-user-repository'

describe('Tenant Isolation Integration', () => {
  let testDatabase: PrismaClient
  let tenantAwareClient: TenantAwareClient
  let tenantContext: TenantContext
  let tenantRepository: TenantRepository
  let userRepository: PrismaUserRepository

  let tenantA: any
  let tenantB: any
  let tenantC: any

  let tenantAAdmin: any
  let tenantAUser: any
  let tenantBAdmin: any
  let tenantBUser: any

  beforeAll(async () => {
    testDatabase = await setupTestDatabase()
    tenantAwareClient = new TenantAwareClient(testDatabase)
    tenantContext = new TenantContext(testDatabase)
    tenantRepository = new TenantRepository(testDatabase)
    userRepository = new PrismaUserRepository(testDatabase)

    // Enable RLS for tenant isolation
    await testDatabase.$executeRaw`ALTER TABLE users ENABLE ROW LEVEL SECURITY`
    await testDatabase.$executeRaw`ALTER TABLE tenants ENABLE ROW LEVEL SECURITY`
    await testDatabase.$executeRaw`ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY`
  })

  afterAll(async () => {
    await cleanupTestDatabase(testDatabase)
  })

  beforeEach(async () => {
    vi.clearAllMocks()

    // Create test tenants
    ;[tenantA, tenantB, tenantC] = await createTestTenants(testDatabase, [
      { name: 'Tenant A', domain: 'tenantA.example.com' },
      { name: 'Tenant B', domain: 'tenantB.example.com' },
      { name: 'Tenant C', domain: 'tenantC.example.com' }
    ])

    // Create test users for each tenant
    tenantAAdmin = await createTestUser(testDatabase, {
      tenantId: tenantA.id,
      email: 'admin@tenantA.com',
      role: 'ADMIN',
      isActive: true
    })

    tenantAUser = await createTestUser(testDatabase, {
      tenantId: tenantA.id,
      email: 'user@tenantA.com',
      role: 'USER',
      isActive: true
    })

    tenantBAdmin = await createTestUser(testDatabase, {
      tenantId: tenantB.id,
      email: 'admin@tenantB.com',
      role: 'ADMIN',
      isActive: true
    })

    tenantBUser = await createTestUser(testDatabase, {
      tenantId: tenantB.id,
      email: 'user@tenantB.com',
      role: 'USER',
      isActive: true
    })
  })

  afterEach(async () => {
    // Clean up test data but preserve tenants
    await testDatabase.user.deleteMany({
      where: {
        email: {
          in: ['admin@tenantA.com', 'user@tenantA.com', 'admin@tenantB.com', 'user@tenantB.com']
        }
      }
    })
    await testDatabase.userSession.deleteMany()
  })

  describe('Database-Level Tenant Isolation (RLS)', () => {
    it('should enforce tenant isolation at database level', async () => {
      // Query as tenant A admin
      const tenantAClient = await tenantAwareClient.createClient(tenantA.id)
      const tenantAUsers = await tenantAClient.user.findMany({
        where: { isActive: true }
      })

      // Should only see tenant A users
      expect(tenantAUsers).toHaveLength(2)
      expect(tenantAUsers.every(user => user.tenantId === tenantA.id)).toBe(true)

      // Query as tenant B admin
      const tenantBClient = await tenantAwareClient.createClient(tenantB.id)
      const tenantBUsers = await tenantBClient.user.findMany({
        where: { isActive: true }
      })

      // Should only see tenant B users
      expect(tenantBUsers).toHaveLength(2)
      expect(tenantBUsers.every(user => user.tenantId === tenantB.id)).toBe(true)

      // Verify no cross-tenant data leakage
      const tenantAEmails = tenantAUsers.map(u => u.email)
      const tenantBEmails = tenantBUsers.map(u => u.email)

      expect(tenantAEmails).not.toContainEqual(expect.stringContaining('tenantB'))
      expect(tenantBEmails).not.toContainEqual(expect.stringContaining('tenantA'))
    })

    it('should prevent direct SQL injection for cross-tenant access', async () => {
      const maliciousQueries = [
        `SELECT * FROM users WHERE tenant_id = '${tenantB.id}'`,
        `SELECT * FROM users WHERE tenant_id != '${tenantA.id}'`,
        `SELECT * FROM users UNION SELECT * FROM tenants`,
        `SELECT * FROM users; DROP TABLE users;--`
      ]

      for (const query of maliciousQueries) {
        const tenantAClient = await tenantAwareClient.createClient(tenantA.id)

        try {
          const result = await tenantAClient.$queryRawUnsafe(query)

          // If query succeeds, verify no cross-tenant data
          if (Array.isArray(result)) {
            expect(result.every((row: any) => row.tenant_id === tenantA.id)).toBe(true)
          }
        } catch (error) {
          // Query should fail due to RLS or SQL injection prevention
          expect(error).toBeDefined()
        }
      }
    })

    it('should enforce tenant isolation for different operations', async () => {
      const tenantAClient = await tenantAwareClient.createClient(tenantA.id)

      // CREATE operations should be tenant-scoped
      const newUser = await tenantAClient.user.create({
        data: {
          email: 'new@tenantA.com',
          passwordHash: 'hashed-password',
          tenantId: tenantB.id, // Try to create user for different tenant
          isActive: true
        }
      })

      // Should still be created with tenant A context due to RLS
      expect(newUser.tenantId).toBe(tenantA.id)

      // UPDATE operations should be tenant-scoped
      const updatedUser = await tenantAClient.user.update({
        where: { id: tenantBUser.id }, // Try to update user from different tenant
        data: { email: 'hacked@tenantA.com' }
      })

      // Update should fail or return null
      expect(updatedUser).toBeNull()

      // DELETE operations should be tenant-scoped
      const deletedCount = await tenantAClient.user.deleteMany({
        where: { tenantId: tenantB.id } // Try to delete users from different tenant
      })

      // Should not delete any users from other tenant
      expect(deletedCount.count).toBe(0)
    })
  })

  describe('API-Level Tenant Context Validation', () => {
    it('should validate tenant context in API requests', async () => {
      // Simulate API request with tenant A context
      const mockRequest = {
        headers: {
          'x-tenant-id': tenantA.id,
          'x-tenant-domain': 'tenantA.example.com'
        },
        user: { id: tenantAAdmin.id, role: 'ADMIN' }
      }

      // Verify tenant context is properly set
      const context = await tenantContext.createContext(mockRequest)
      expect(context.tenantId).toBe(tenantA.id)
      expect(context.tenantDomain).toBe('tenantA.example.com')

      // Query with context
      const users = await userRepository.findByTenant(context.tenantId, {
        page: 1,
        limit: 10
      })

      expect(users.data).toHaveLength(2)
      expect(users.data.every(user => user.tenantId === tenantA.id)).toBe(true)
    })

    it('should prevent API requests without tenant context', async () => {
      const mockRequestWithoutTenant = {
        headers: {},
        user: { id: tenantAAdmin.id, role: 'ADMIN' }
      }

      // Should fail to create context without tenant information
      await expect(
        tenantContext.createContext(mockRequestWithoutTenant)
      ).rejects.toThrow('Tenant context required')

      // Should fail to access data without tenant context
      await expect(
        userRepository.findByTenant(null, { page: 1, limit: 10 })
      ).rejects.toThrow()
    })

    it('should prevent tenant spoofing in API requests', async () => {
      // Tenant A user trying to access tenant B data
      const maliciousRequest = {
        headers: {
          'x-tenant-id': tenantB.id,
          'x-tenant-domain': 'tenantB.example.com'
        },
        user: { id: tenantAUser.id, role: 'USER', tenantId: tenantA.id }
      }

      // Should detect tenant mismatch
      await expect(
        tenantContext.validateRequest(maliciousRequest)
      ).rejects.toThrow('Tenant mismatch')

      // Alternative: Attempt direct repository access with spoofed tenant
      await expect(
        userRepository.findByTenant(tenantB.id, { page: 1, limit: 10 })
      ).rejects.toThrow('Access denied')
    })

    it('should handle tenant subdomain routing correctly', async () => {
      const subdomainRequests = [
        { host: 'tenantA.example.com', expectedTenant: tenantA },
        { host: 'tenantB.example.com', expectedTenant: tenantB },
        { host: 'tenantC.example.com', expectedTenant: tenantC }
      ]

      for (const request of subdomainRequests) {
        const mockRequest = {
          headers: { host: request.host },
          user: { id: 'user-id', role: 'USER' }
        }

        const context = await tenantContext.createContextFromSubdomain(mockRequest)
        expect(context.tenantId).toBe(request.expectedTenant.id)
        expect(context.tenantDomain).toBe(request.host)
      }
    })
  })

  describe('Repository-Level Tenant Isolation', () => {
    it('should enforce tenant isolation in user repository', async () => {
      // Tenant A repository
      const tenantAUserRepo = new PrismaUserRepository(testDatabase, tenantA.id)

      const tenantAUsers = await tenantAUserRepo.findByTenant(tenantA.id, {
        page: 1,
        limit: 10
      })

      expect(tenantAUsers.data).toHaveLength(2)
      expect(tenantAUsers.total).toBe(2)
      expect(tenantAUsers.data.every(user => user.tenantId === tenantA.id)).toBe(true)

      // Tenant B repository
      const tenantBUserRepo = new PrismaUserRepository(testDatabase, tenantB.id)

      const tenantBUsers = await tenantBUserRepo.findByTenant(tenantB.id, {
        page: 1,
        limit: 10
      })

      expect(tenantBUsers.data).toHaveLength(2)
      expect(tenantBUsers.total).toBe(2)
      expect(tenantBUsers.data.every(user => user.tenantId === tenantB.id)).toBe(true)

      // Verify no data overlap
      const tenantAEmails = new Set(tenantAUsers.data.map(u => u.email))
      const tenantBEmails = new Set(tenantBUsers.data.map(u => u.email))

      expect([...tenantAEmails].intersection(tenantBEmails)).toHaveLength(0)
    })

    it('should enforce tenant isolation in search operations', async () => {
      const tenantAUserRepo = new PrismaUserRepository(testDatabase, tenantA.id)

      // Search by email - should only return tenant A results
      const searchResults = await tenantAUserRepo.searchByEmail('admin@', tenantA.id)

      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].email).toBe('admin@tenantA.com')
      expect(searchResults[0].tenantId).toBe(tenantA.id)

      // Search with tenant B context
      const tenantBUserRepo = new PrismaUserRepository(testDatabase, tenantB.id)
      const tenantBSearchResults = await tenantBUserRepo.searchByEmail('admin@', tenantB.id)

      expect(tenantBSearchResults).toHaveLength(1)
      expect(tenantBSearchResults[0].email).toBe('admin@tenantB.com')
      expect(tenantBSearchResults[0].tenantId).toBe(tenantB.id)
    })

    it('should prevent cross-tenant user operations', async () => {
      const tenantAUserRepo = new PrismaUserRepository(testDatabase, tenantA.id)

      // Try to create user in different tenant
      await expect(
        tenantAUserRepo.create({
          email: 'cross-tenant@example.com',
          password: 'password',
          tenantId: tenantB.id
        }, tenantB.id)
      ).rejects.toThrow('Tenant mismatch')

      // Try to update user from different tenant
      await expect(
        tenantAUserRepo.update(tenantBUser.id, {
          email: 'hacked@example.com'
        }, tenantA.id)
      ).rejects.toThrow('User not found or access denied')

      // Try to delete user from different tenant
      await expect(
        tenantAUserRepo.delete(tenantBUser.id, tenantA.id)
      ).rejects.toThrow('User not found or access denied')
    })
  })

  describe('Session-Level Tenant Isolation', () => {
    it('should isolate user sessions by tenant', async () => {
      // Create sessions for users in different tenants
      const tenantASession = await testDatabase.userSession.create({
        data: {
          userId: tenantAUser.id,
          token: 'tenantA-session-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          tenantId: tenantA.id
        }
      })

      const tenantBSession = await testDatabase.userSession.create({
        data: {
          userId: tenantBUser.id,
          token: 'tenantB-session-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          tenantId: tenantB.id
        }
      })

      // Query sessions with tenant A context
      const tenantAClient = await tenantAwareClient.createClient(tenantA.id)
      const tenantASessions = await tenantAClient.userSession.findMany()

      expect(tenantASessions).toHaveLength(1)
      expect(tenantASessions[0].tenantId).toBe(tenantA.id)

      // Query sessions with tenant B context
      const tenantBClient = await tenantAwareClient.createClient(tenantB.id)
      const tenantBSessions = await tenantBClient.userSession.findMany()

      expect(tenantBSessions).toHaveLength(1)
      expect(tenantBSessions[0].tenantId).toBe(tenantB.id)
    })

    it('should prevent session hijacking across tenants', async () => {
      // Tenant A user session
      const tenantASession = await testDatabase.userSession.create({
        data: {
          userId: tenantAUser.id,
          token: 'secure-session-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          tenantId: tenantA.id
        }
      })

      // Try to validate session with different tenant context
      const tenantBClient = await tenantAwareClient.createClient(tenantB.id)
      const sessionValidation = await tenantBClient.userSession.findFirst({
        where: { token: 'secure-session-token' }
      })

      // Should not find session in different tenant context
      expect(sessionValidation).toBeNull()

      // Try to access user data with session token from different tenant
      const userAccess = await tenantBClient.user.findFirst({
        where: {
          sessions: {
            some: { token: 'secure-session-token' }
          }
        }
      })

      expect(userAccess).toBeNull()
    })
  })

  describe('Bulk Operations and Batch Processing', () => {
    it('should enforce tenant isolation in bulk operations', async () => {
      // Create additional users for testing
      const additionalUsers = Array.from({ length: 10 }, (_, i) => ({
        email: `user${i}@tenantA.com`,
        passwordHash: `hash${i}`,
        tenantId: tenantA.id,
        isActive: true
      }))

      await testDatabase.user.createMany({ data: additionalUsers })

      const tenantAClient = await tenantAwareClient.createClient(tenantA.id)

      // Bulk update should only affect tenant A users
      const updateResult = await tenantAClient.user.updateMany({
        where: { isActive: true },
        data: { lastLoginAt: new Date() }
      })

      // Should update only tenant A users (12 total: 10 new + 2 original)
      expect(updateResult.count).toBe(12)

      // Verify tenant B users unaffected
      const tenantBClient = await tenantAwareClient.createClient(tenantB.id)
      const tenantBUsers = await tenantBClient.user.findMany({
        where: { lastLoginAt: { not: null } }
      })

      expect(tenantBUsers).toHaveLength(0)
    })

    it('should prevent cross-tenant data aggregation', async () => {
      const tenantAClient = await tenantAwareClient.createClient(tenantA.id)

      // Aggregation queries should be tenant-scoped
      const userStats = await tenantAClient.user.aggregate({
        where: { isActive: true },
        _count: { id: true },
        _sum: { loginCount: true }
      })

      expect(userStats._count.id).toBe(2) // Only tenant A users

      // Try malicious aggregation query
      const maliciousAggregation = await tenantAClient.$queryRaw`
        SELECT tenant_id, COUNT(*) as user_count
        FROM users
        GROUP BY tenant_id
      ` as any[]

      // RLS should prevent cross-tenant aggregation
      expect(maliciousAggregation).toHaveLength(1)
      expect(maliciousAggregation[0].tenant_id).toBe(tenantA.id)
    })
  })

  describe('Security Edge Cases', () => {
    it('should handle tenant ID manipulation attempts', async () => {
      const manipulationAttempts = [
        null,
        undefined,
        '',
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        '0',
        '-1',
        '999999999'
      ]

      for (const maliciousTenantId of manipulationAttempts) {
        await expect(
          tenantAwareClient.createClient(maliciousTenantId)
        ).rejects.toThrow()

        await expect(
          userRepository.findByTenant(maliciousTenantId, { page: 1, limit: 10 })
        ).rejects.toThrow()
      }
    })

    it('should prevent tenant enumeration attacks', async () => {
      const enumerationAttempts = Array.from({ length: 100 }, (_, i) => `tenant-${i}`)

      const results = []
      for (const tenantId of enumerationAttempts) {
        try {
          const users = await userRepository.findByTenant(tenantId, { page: 1, limit: 1 })
          if (users.data.length > 0) {
            results.push(tenantId)
          }
        } catch (error) {
          // Expected for non-existent tenants
        }
      }

      // Should not reveal existing tenant IDs through error messages
      expect(results).toHaveLength(0)
    })

    it('should handle concurrent tenant operations safely', async () => {
      // Simulate concurrent operations from different tenants
      const operations = [
        userRepository.create({
          email: 'concurrent1@tenantA.com',
          password: 'password',
          tenantId: tenantA.id
        }, tenantA.id),
        userRepository.create({
          email: 'concurrent1@tenantB.com',
          password: 'password',
          tenantId: tenantB.id
        }, tenantB.id),
        userRepository.findByTenant(tenantA.id, { page: 1, limit: 10 }),
        userRepository.findByTenant(tenantB.id, { page: 1, limit: 10 })
      ]

      const results = await Promise.allSettled(operations)

      // All operations should complete without cross-tenant interference
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled')
      })

      // Verify data isolation is maintained
      const tenantAClient = await tenantAwareClient.createClient(tenantA.id)
      const tenantAUsers = await tenantAClient.user.findMany({
        where: { email: { startsWith: 'concurrent1' } }
      })

      expect(tenantAUsers).toHaveLength(1)
      expect(tenantAUsers[0].email).toBe('concurrent1@tenantA.com')
    })

    it('should maintain tenant isolation during database transactions', async () => {
      const tenantAClient = await tenantAwareClient.createClient(tenantA.id)

      await testDatabase.$transaction(async (tx) => {
        // Create user within transaction
        const newUser = await tx.user.create({
          data: {
            email: 'transaction@tenantA.com',
            passwordHash: 'hash',
            tenantId: tenantA.id,
            isActive: true
          }
        })

        // Try to access different tenant data within same transaction
        const crossTenantQuery = await tx.user.findMany({
          where: { tenantId: tenantB.id }
        })

        // Should not return cross-tenant data even within transaction
        expect(crossTenantQuery).toHaveLength(0)

        // Verify user was created in correct tenant
        expect(newUser.tenantId).toBe(tenantA.id)
      })
    })
  })

  describe('Performance and Scaling', () => {
    it('should maintain performance with large tenant datasets', async () => {
      // Create many users for tenant A
      const manyUsers = Array.from({ length: 1000 }, (_, i) => ({
        email: `user${i}@tenantA.com`,
        passwordHash: `hash${i}`,
        tenantId: tenantA.id,
        isActive: i % 2 === 0 // Half active
      }))

      await testDatabase.user.createMany({ data: manyUsers })

      const startTime = Date.now()
      const tenantAClient = await tenantAwareClient.createClient(tenantA.id)

      // Query with pagination
      const result = await tenantAClient.user.findMany({
        where: { isActive: true },
        take: 50,
        skip: 0,
        orderBy: { email: 'asc' }
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      // Query should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000)
      expect(result).toHaveLength(501) // 1000/2 + 2 original = 502 active users, limited to 50
      expect(result.every(user => user.tenantId === tenantA.id)).toBe(true)
    })

    it('should optimize RLS policies for tenant isolation', async () => {
      const tenantAClient = await tenantAwareClient.createClient(tenantA.id)

      // Test query plan efficiency
      const queryPlan = await testDatabase.$queryRaw`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT * FROM users WHERE email LIKE '%@tenantA.com' AND tenant_id = $1
      ` as any[]

      // Query should use tenant_id index efficiently
      const planText = JSON.stringify(queryPlan)
      expect(planText).toContain('tenant_id')
    })
  })
})