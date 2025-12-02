/**
 * Tenant Isolation Integration Tests
 *
 * Comprehensive tests for tenant isolation features including:
 * - RLS policies enforcement
 * - Tenant context middleware
 * - Data leakage prevention
 * - Cross-tenant access prevention
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@pems/database'
import { TenantRepository, TenantService } from '../src'

describe('Tenant Isolation Integration Tests', () => {
  let prisma: PrismaClient
  let tenantRepository: TenantRepository
  let tenantService: TenantService

  // Test data
  const tenantAId = '12345678-1234-1234-1234-123456789001'
  const tenantBId = '12345678-1234-1234-1234-123456789002'
  const systemAdminId = '87654321-4321-4321-4321-210987654321'

  beforeAll(async () => {
    // Initialize test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ??
            'postgresql://postgres:postgres@localhost:5432/pems_test',
        },
      },
    })

    tenantRepository = new TenantRepository(prisma)
    tenantService = new TenantService(tenantRepository)

    // Clean up test data
    await cleanupTestData()
  })

  afterAll(async () => {
    await cleanupTestData()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Reset database state before each test
    await cleanupTestData()
    await setupTestTenants()
  })

  async function cleanupTestData() {
    // Clean up in reverse order of dependencies
    await prisma.userRole.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.permission.deleteMany()
    await prisma.userAuthProvider.deleteMany()
    await prisma.userProfile.deleteMany()
    await prisma.user.deleteMany()
    await prisma.tenantSetting.deleteMany()
    await prisma.tenant.deleteMany()
  }

  async function setupTestTenants() {
    // Create test tenants
    await prisma.tenant.createMany({
      data: [
        {
          id: tenantAId,
          name: 'Tenant A - Test School',
          slug: 'tenant-a-test',
          timezone: 'Asia/Manila',
        },
        {
          id: tenantBId,
          name: 'Tenant B - Test School',
          slug: 'tenant-b-test',
          timezone: 'Asia/Manila',
        },
      ],
    })

    // Create test users for each tenant
    await prisma.user.createMany({
      data: [
        {
          id: 'user-a-001',
          tenant_id: tenantAId,
          email: 'admin@tenant-a.com',
          is_active: true,
        },
        {
          id: 'user-b-001',
          tenant_id: tenantBId,
          email: 'admin@tenant-b.com',
          is_active: true,
        },
        {
          id: systemAdminId,
          tenant_id: tenantAId, // System admin belongs to a tenant but has global access
          email: 'system@admin.com',
          is_active: true,
          is_system_admin: true,
        },
      ],
    })

    // Create test data for each tenant
    await prisma.student.createMany({
      data: [
        {
          id: 'student-a-001',
          tenant_id: tenantAId,
          student_no: 'STU-A-001',
          first_name: 'John',
          last_name: 'Doe',
        },
        {
          id: 'student-b-001',
          tenant_id: tenantBId,
          student_no: 'STU-B-001',
          first_name: 'Jane',
          last_name: 'Smith',
        },
      ],
    })

    await prisma.account.createMany({
      data: [
        {
          id: 'account-a-001',
          tenant_id: tenantAId,
          code: 'ACC-A-001',
          name: 'Student Account A',
          type: 'student',
          balance: 1000.0,
        },
        {
          id: 'account-b-001',
          tenant_id: tenantBId,
          code: 'ACC-B-001',
          name: 'Student Account B',
          type: 'student',
          balance: 2000.0,
        },
      ],
    })
  }

  describe('Tenant Repository Isolation', () => {
    test('should only return tenant-specific data when tenant context is set', async () => {
      // Configure tenant context for Tenant A
      await prisma.$executeRaw`SET app.current_tenant_id = ${tenantAId}`
      await prisma.$executeRaw`SET app.is_system_admin = false`

      // Should only see Tenant A's students
      const students = await prisma.student.findMany()
      expect(students).toHaveLength(1)
      expect(students[0].tenant_id).toBe(tenantAId)
      expect(students[0].first_name).toBe('John')

      // Should only see Tenant A's accounts
      const accounts = await prisma.account.findMany()
      expect(accounts).toHaveLength(1)
      expect(accounts[0].tenant_id).toBe(tenantAId)
      expect(accounts[0].code).toBe('ACC-A-001')
    })

    test('should prevent cross-tenant data access', async () => {
      // Configure tenant context for Tenant A
      await prisma.$executeRaw`SET app.current_tenant_id = ${tenantAId}`
      await prisma.$executeRaw`SET app.is_system_admin = false`

      // Should not be able to access Tenant B's data directly
      const tenantBStudent = await prisma.student.findFirst({
        where: { tenant_id: tenantBId },
      })
      expect(tenantBStudent).toBeNull()

      // Should not be able to create data for another tenant
      await expect(
        prisma.student.create({
          data: {
            id: 'unauthorized-student',
            tenant_id: tenantBId, // Trying to create for different tenant
            student_no: 'UNAUTH-001',
            first_name: 'Unauthorized',
            last_name: 'User',
          },
        }),
      ).rejects.toThrow()
    })

    test('should allow system admins to access all tenant data', async () => {
      // Configure system admin context
      await prisma.$executeRaw`SET app.current_tenant_id = ${tenantAId}`
      await prisma.$executeRaw`SET app.is_system_admin = true`

      // System admin should see all students
      const allStudents = await prisma.student.findMany()
      expect(allStudents).toHaveLength(2)
      expect(allStudents.map((s) => s.first_name)).toEqual(['John', 'Jane'])

      // System admin should see all accounts
      const allAccounts = await prisma.account.findMany()
      expect(allAccounts).toHaveLength(2)
    })
  })

  describe('Tenant Service Isolation', () => {
    test('should create tenant with proper isolation', async () => {
      const newTenantData = {
        name: 'New Test Tenant',
        slug: 'new-test-tenant',
        timezone: 'Asia/Manila',
      }

      // Create tenant without tenant context (system operation)
      const newTenant = await tenantService.createTenant(newTenantData)
      expect(newTenant.slug).toBe('new-test-tenant')

      // Verify tenant was created successfully
      const foundTenant = await tenantService.getTenant(newTenant.id)
      expect(foundTenant.name).toBe('New Test Tenant')
    })

    test('should enforce tenant slug uniqueness', async () => {
      const duplicateTenantData = {
        name: 'Duplicate Tenant',
        slug: 'tenant-a-test', // Same as existing tenant
        timezone: 'Asia/Manila',
      }

      await expect(
        tenantService.createTenant(duplicateTenantData),
      ).rejects.toThrow('already exists')
    })
  })

  describe('Row-Level Security Policies', () => {
    test('should enforce RLS on all tenant-aware tables', async () => {
      // Test each tenant-aware table to ensure RLS is enabled
      const tables = [
        'User',
        'UserProfile',
        'Student',
        'Account',
        'TenantSetting',
        'Transaction',
        'Receipt',
      ]

      for (const table of tables) {
        const result = (await prisma.$queryRaw`
          SELECT relrowsecurity as rls_enabled
          FROM pg_class
          WHERE relname = ${table.toLowerCase()}
        `) as Array<{ rls_enabled: boolean }>

        expect(result).toHaveLength(1)
        expect(result[0].rls_enabled).toBe(true)
      }
    })

    test('should prevent direct SQL bypass of tenant filters', async () => {
      // Configure tenant context for Tenant A
      await prisma.$executeRaw`SET app.current_tenant_id = ${tenantAId}`
      await prisma.$executeRaw`SET app.is_system_admin = false`

      // Try to bypass tenant filtering with raw SQL
      const directAccess = (await prisma.$queryRawUnsafe(
        `
        SELECT * FROM "Student" WHERE tenant_id = $1
      `,
        tenantBId,
      )) as Array<any>

      // Should return empty due to RLS
      expect(directAccess).toHaveLength(0)
    })
  })

  describe('Data Leakage Prevention', () => {
    test('should prevent tenant enumeration attacks', async () => {
      // Configure tenant context for Tenant A
      await prisma.$executeRaw`SET app.current_tenant_id = ${tenantAId}`
      await prisma.$executeRaw`SET app.is_system_admin = false`

      // Try to enumerate other tenants by querying with different tenant_ids
      const enumerationAttempt = (await prisma.$queryRaw`
        SELECT DISTINCT tenant_id FROM "Student"
      `) as Array<{ tenant_id: string }>

      // Should only return the current tenant's ID
      expect(enumerationAttempt).toHaveLength(1)
      expect(enumerationAttempt[0].tenant_id).toBe(tenantAId)
    })

    test('should prevent foreign key exposure from other tenants', async () => {
      // Configure tenant context for Tenant A
      await prisma.$executeRaw`SET app.current_tenant_id = ${tenantAId}`
      await prisma.$executeRaw`SET app.is_system_admin = false`

      // Create transaction for Tenant A's account
      await prisma.transaction.create({
        data: {
          id: 'transaction-a-001',
          tenant_id: tenantAId,
          account_id: 'account-a-001',
          amount: 100.0,
          direction: 'credit',
        },
      })

      // Should only see transactions for current tenant
      const transactions = await prisma.transaction.findMany({
        include: { account: true },
      })

      expect(transactions).toHaveLength(1)
      expect(transactions[0].account?.tenant_id).toBe(tenantAId)
    })
  })

  describe('Context Injection and Cleanup', () => {
    test('should properly configure database session variables', async () => {
      // Set tenant context
      await prisma.$executeRaw`SET app.current_tenant_id = ${tenantAId}`
      await prisma.$executeRaw`SET app.is_system_admin = false`
      await prisma.$executeRaw`SET app.current_user_id = ${'user-a-001'}`

      // Verify session variables are set
      const tenantIdResult = (await prisma.$queryRaw`
        SELECT current_setting('app.current_tenant_id', true) as tenant_id
      `) as Array<{ tenant_id: string }>

      const isAdminResult = (await prisma.$queryRaw`
        SELECT current_setting('app.is_system_admin', true) as is_admin
      `) as Array<{ is_admin: string }>

      expect(tenantIdResult[0].tenant_id).toBe(tenantAId)
      expect(isAdminResult[0].is_admin).toBe('false')
    })

    test('should reset context properly', async () => {
      // Set tenant context
      await prisma.$executeRaw`SET app.current_tenant_id = ${tenantAId}`
      await prisma.$executeRaw`SET app.is_system_admin = false`

      // Reset context
      await prisma.$executeRaw`RESET app.current_tenant_id`
      await prisma.$executeRaw`RESET app.is_system_admin`

      // Verify context is reset
      const tenantIdResult = (await prisma.$queryRaw`
        SELECT current_setting('app.current_tenant_id', true) as tenant_id
      `) as Array<{ tenant_id: string }>

      expect(tenantIdResult[0].tenant_id).toBe('')
    })
  })

  describe('Performance Considerations', () => {
    test('should maintain query performance with RLS policies', async () => {
      const startTime = Date.now()

      // Configure tenant context
      await prisma.$executeRaw`SET app.current_tenant_id = ${tenantAId}`
      await prisma.$executeRaw`SET app.is_system_admin = false`

      // Execute multiple queries
      for (let i = 0; i < 10; i++) {
        await prisma.student.findMany()
        await prisma.account.findMany()
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000) // 5 seconds
    })
  })
})
