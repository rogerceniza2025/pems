/**
 * User Management Authorization Integration Tests
 *
 * Comprehensive testing for user management authorization scenarios:
 * - Role-Based Access Control (RBAC) enforcement
 * - Permission validation across all operations
 * - Authorization bypass prevention
 * - Privilege escalation attacks prevention
 * - Multi-tenant authorization scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/test-database'
import { createTestTenant } from '../helpers/test-tenant'
import { createTestUser } from '../helpers/test-user'
import { PrismaClient } from '@prisma/client'
import { RBACService } from '../../packages/infrastructure/auth/src/rbac'
import { PrismaUserRepository } from '../../modules/user-management/src/infrastructure/prisma-user-repository'
import { UserController } from '../../modules/user-management/src/presentation/user-controller'
import { AuthorizationMiddleware } from '../../packages/infrastructure/middleware/src/authorization-middleware'

describe('User Management Authorization Integration', () => {
  let testDatabase: PrismaClient
  let rbacService: RBACService
  let userRepository: PrismaUserRepository
  let userController: UserController
  let authMiddleware: AuthorizationMiddleware

  let testTenant: any
  let superAdmin: any
  let tenantAdmin: any
  let userManager: any
  let regularUser: any
  let guestUser: any

  beforeAll(async () => {
    testDatabase = await setupTestDatabase()
    rbacService = new RBACService(testDatabase)
    userRepository = new PrismaUserRepository(testDatabase)
    userController = new UserController(userRepository, rbacService)
    authMiddleware = new AuthorizationMiddleware(rbacService)
  })

  afterAll(async () => {
    await cleanupTestDatabase(testDatabase)
  })

  beforeEach(async () => {
    vi.clearAllMocks()

    testTenant = await createTestTenant(testDatabase, {
      name: 'Authorization Test Tenant',
      domain: 'auth.example.com'
    })

    // Create users with different roles
    superAdmin = await createTestUser(testDatabase, {
      tenantId: testTenant.id,
      email: 'superadmin@example.com',
      role: 'SUPER_ADMIN',
      isActive: true
    })

    tenantAdmin = await createTestUser(testDatabase, {
      tenantId: testTenant.id,
      email: 'admin@example.com',
      role: 'ADMIN',
      isActive: true
    })

    userManager = await createTestUser(testDatabase, {
      tenantId: testTenant.id,
      email: 'manager@example.com',
      role: 'MANAGER',
      isActive: true
    })

    regularUser = await createTestUser(testDatabase, {
      tenantId: testTenant.id,
      email: 'user@example.com',
      role: 'USER',
      isActive: true
    })

    guestUser = await createTestUser(testDatabase, {
      tenantId: testTenant.id,
      email: 'guest@example.com',
      role: 'GUEST',
      isActive: true
    })
  })

  afterEach(async () => {
    await testDatabase.user.deleteMany({
      where: {
        email: {
          in: [
            'superadmin@example.com',
            'admin@example.com',
            'manager@example.com',
            'user@example.com',
            'guest@example.com'
          ]
        }
      }
    })
  })

  describe('Role-Based Access Control Enforcement', () => {
    it('should enforce user creation permissions by role', async () => {
      const newUserData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        role: 'USER'
      }

      // Super Admin should be able to create any user
      const superAdminRequest = {
        user: { id: superAdmin.id, role: 'SUPER_ADMIN', tenantId: testTenant.id },
        body: newUserData,
        headers: { 'x-tenant-id': testTenant.id }
      }

      const superAdminResult = await userController.createUser(superAdminRequest as any)
      expect(superAdminResult.status).toBe(201)

      // Tenant Admin should be able to create users in their tenant
      const adminRequest = {
        user: { id: tenantAdmin.id, role: 'ADMIN', tenantId: testTenant.id },
        body: { ...newUserData, email: 'adminuser@example.com' },
        headers: { 'x-tenant-id': testTenant.id }
      }

      const adminResult = await userController.createUser(adminRequest as any)
      expect(adminResult.status).toBe(201)

      // Manager should be able to create users
      const managerRequest = {
        user: { id: userManager.id, role: 'MANAGER', tenantId: testTenant.id },
        body: { ...newUserData, email: 'manageruser@example.com' },
        headers: { 'x-tenant-id': testTenant.id }
      }

      const managerResult = await userController.createUser(managerRequest as any)
      expect(managerResult.status).toBe(201)

      // Regular User should NOT be able to create users
      const userRequest = {
        user: { id: regularUser.id, role: 'USER', tenantId: testTenant.id },
        body: { ...newUserData, email: 'regularuser@example.com' },
        headers: { 'x-tenant-id': testTenant.id }
      }

      await expect(userController.createUser(userRequest as any)).rejects.toThrow('Insufficient permissions')
    })

    it('should enforce role modification restrictions', async () => {
      const targetUser = await createTestUser(testDatabase, {
        tenantId: testTenant.id,
        email: 'target@example.com',
        role: 'USER',
        isActive: true
      })

      // Super Admin can modify any role
      const superAdminRequest = {
        user: { id: superAdmin.id, role: 'SUPER_ADMIN', tenantId: testTenant.id },
        params: { id: targetUser.id },
        body: { role: 'ADMIN' },
        headers: { 'x-tenant-id': testTenant.id }
      }

      const superAdminResult = await userController.updateUserRole(superAdminRequest as any)
      expect(superAdminResult.status).toBe(200)

      // Tenant Admin can modify roles below ADMIN level
      const adminRequest = {
        user: { id: tenantAdmin.id, role: 'ADMIN', tenantId: testTenant.id },
        params: { id: targetUser.id },
        body: { role: 'MANAGER' },
        headers: { 'x-tenant-id': testTenant.id }
      }

      const adminResult = await userController.updateUserRole(adminRequest as any)
      expect(adminResult.status).toBe(200)

      // Manager should NOT be able to assign ADMIN roles
      const managerRequest = {
        user: { id: userManager.id, role: 'MANAGER', tenantId: testTenant.id },
        params: { id: targetUser.id },
        body: { role: 'ADMIN' },
        headers: { 'x-tenant-id': testTenant.id }
      }

      await expect(userController.updateUserRole(managerRequest as any)).rejects.toThrow('Insufficient permissions')

      // Regular User should NOT be able to modify any roles
      const userRequest = {
        user: { id: regularUser.id, role: 'USER', tenantId: testTenant.id },
        params: { id: targetUser.id },
        body: { role: 'GUEST' },
        headers: { 'x-tenant-id': testTenant.id }
      }

      await expect(userController.updateUserRole(userRequest as any)).rejects.toThrow('Insufficient permissions')
    })

    it('should enforce user deletion permissions', async () => {
      const targetUser = await createTestUser(testDatabase, {
        tenantId: testTenant.id,
        email: 'deletable@example.com',
        role: 'USER',
        isActive: true
      })

      // Super Admin can delete any user
      const superAdminRequest = {
        user: { id: superAdmin.id, role: 'SUPER_ADMIN', tenantId: testTenant.id },
        params: { id: targetUser.id },
        headers: { 'x-tenant-id': testTenant.id }
      }

      const superAdminResult = await userController.deleteUser(superAdminRequest as any)
      expect(superAdminResult.status).toBe(200)

      // Create another target for testing other roles
      const anotherTarget = await createTestUser(testDatabase, {
        tenantId: testTenant.id,
        email: 'another@example.com',
        role: 'USER',
        isActive: true
      })

      // Tenant Admin can delete users in their tenant
      const adminRequest = {
        user: { id: tenantAdmin.id, role: 'ADMIN', tenantId: testTenant.id },
        params: { id: anotherTarget.id },
        headers: { 'x-tenant-id': testTenant.id }
      }

      const adminResult = await userController.deleteUser(adminRequest as any)
      expect(adminResult.status).toBe(200)

      // Manager should be able to delete users
      const managerTarget = await createTestUser(testDatabase, {
        tenantId: testTenant.id,
        email: 'managerdeletable@example.com',
        role: 'USER',
        isActive: true
      })

      const managerRequest = {
        user: { id: userManager.id, role: 'MANAGER', tenantId: testTenant.id },
        params: { id: managerTarget.id },
        headers: { 'x-tenant-id': testTenant.id }
      }

      const managerResult = await userController.deleteUser(managerRequest as any)
      expect(managerResult.status).toBe(200)

      // Regular User should NOT be able to delete users
      const userTarget = await createTestUser(testDatabase, {
        tenantId: testTenant.id,
        email: 'userdeletable@example.com',
        role: 'USER',
        isActive: true
      })

      const userRequest = {
        user: { id: regularUser.id, role: 'USER', tenantId: testTenant.id },
        params: { id: userTarget.id },
        headers: { 'x-tenant-id': testTenant.id }
      }

      await expect(userController.deleteUser(userRequest as any)).rejects.toThrow('Insufficient permissions')
    })
  })

  describe('Permission-Based Access Control', () => {
    it('should validate specific permissions for user operations', async () => {
      const operations = [
        { operation: 'read:users', requiredPermissions: ['users:read'] },
        { operation: 'create:users', requiredPermissions: ['users:create'] },
        { operation: 'update:users', requiredPermissions: ['users:update'] },
        { operation: 'delete:users', requiredPermissions: ['users:delete'] },
        { operation: 'manage:roles', requiredPermissions: ['users:manage_roles'] },
        { operation: 'view:analytics', requiredPermissions: ['analytics:view'] }
      ]

      for (const operation of operations) {
        // Test SUPER_ADMIN - should have all permissions
        const superAdminHasPermission = await rbacService.hasPermission(
          superAdmin.id,
          operation.requiredPermissions[0],
          testTenant.id
        )
        expect(superAdminHasPermission).toBe(true)

        // Test ADMIN - should have most permissions
        const adminHasPermission = await rbacService.hasPermission(
          tenantAdmin.id,
          operation.requiredPermissions[0],
          testTenant.id
        )
        if (operation.operation === 'manage:roles') {
          expect(adminHasPermission).toBe(true)
        } else if (operation.operation === 'view:analytics') {
          expect(adminHasPermission).toBe(true)
        } else {
          expect(adminHasPermission).toBe(true)
        }

        // Test USER - should have minimal permissions
        const userHasPermission = await rbacService.hasPermission(
          regularUser.id,
          operation.requiredPermissions[0],
          testTenant.id
        )
        if (operation.operation === 'read:users') {
          expect(userHasPermission).toBe(false) // Can't read all users
        } else {
          expect(userHasPermission).toBe(false)
        }
      }
    })

    it('should enforce resource-level permissions', async () => {
      const targetUser = await createTestUser(testDatabase, {
        tenantId: testTenant.id,
        email: 'target@example.com',
        role: 'USER',
        isActive: true
      })

      // Users can only update their own profile
      const selfUpdateRequest = {
        user: { id: regularUser.id, role: 'USER', tenantId: testTenant.id },
        params: { id: regularUser.id },
        body: { email: 'newemail@example.com' },
        headers: { 'x-tenant-id': testTenant.id }
      }

      const selfUpdateResult = await userController.updateUser(selfUpdateRequest as any)
      expect(selfUpdateResult.status).toBe(200)

      // Users cannot update other users' profiles
      const otherUpdateRequest = {
        user: { id: regularUser.id, role: 'USER', tenantId: testTenant.id },
        params: { id: targetUser.id },
        body: { email: 'hacked@example.com' },
        headers: { 'x-tenant-id': testTenant.id }
      }

      await expect(userController.updateUser(otherUpdateRequest as any)).rejects.toThrow('Access denied')
    })

    it('should handle permission inheritance and role hierarchy', async () => {
      // Test that higher roles inherit lower role permissions
      const permissionTests = [
        { role: 'SUPER_ADMIN', shouldInherit: true },
        { role: 'ADMIN', shouldInherit: true },
        { role: 'MANAGER', shouldInherit: true },
        { role: 'USER', shouldInherit: false },
        { role: 'GUEST', shouldInherit: false }
      ]

      for (const test of permissionTests) {
        const hasBasicPermission = await rbacService.hasPermission(
          test.role === 'SUPER_ADMIN' ? superAdmin.id :
          test.role === 'ADMIN' ? tenantAdmin.id :
          test.role === 'MANAGER' ? userManager.id :
          test.role === 'USER' ? regularUser.id : guestUser.id,
          'users:read_own',
          testTenant.id
        )

        if (test.shouldInherit || test.role === 'USER') {
          expect(hasBasicPermission).toBe(true)
        } else {
          expect(hasBasicPermission).toBe(false)
        }
      }
    })
  })

  describe('Authorization Bypass Prevention', () => {
    it('should prevent direct parameter manipulation', async () => {
      const maliciousRequests = [
        {
          description: 'Role parameter injection',
          request: {
            user: { id: regularUser.id, role: 'USER', tenantId: testTenant.id },
            body: { email: 'test@example.com', role: 'ADMIN' },
            headers: { 'x-tenant-id': testTenant.id }
          },
          shouldFail: true
        },
        {
          description: 'Tenant ID parameter injection',
          request: {
            user: { id: regularUser.id, role: 'USER', tenantId: 'different-tenant-id' },
            body: { email: 'test@example.com' },
            headers: { 'x-tenant-id': 'different-tenant-id' }
          },
          shouldFail: true
        },
        {
          description: 'Permission array manipulation',
          request: {
            user: {
              id: regularUser.id,
              role: 'USER',
              tenantId: testTenant.id,
              permissions: ['users:create', 'users:delete', 'roles:manage'] // Fake permissions
            },
            body: { email: 'test@example.com' },
            headers: { 'x-tenant-id': testTenant.id }
          },
          shouldFail: true
        },
        {
          description: 'Admin status manipulation',
          request: {
            user: {
              id: regularUser.id,
              role: 'USER',
              tenantId: testTenant.id,
              isAdmin: true // Fake admin flag
            },
            body: { email: 'test@example.com' },
            headers: { 'x-tenant-id': testTenant.id }
          },
          shouldFail: true
        }
      ]

      for (const test of maliciousRequests) {
        await expect(
          userController.createUser(test.request as any)
        ).rejects.toThrow()

        // Verify authorization check was performed
        expect(await rbacService.hasPermission(
          test.request.user.id,
          'users:create',
          testTenant.id
        )).toBe(false)
      }
    })

    it('should prevent header-based authorization bypass', async () => {
      const maliciousHeaders = [
        { 'x-user-role': 'ADMIN' },
        { 'x-user-permissions': 'users:create,users:delete' },
        { 'x-is-super-admin': 'true' },
        { 'x-tenant-admin': 'true' },
        { 'authorization': 'Bearer fake-admin-token' },
        { 'x-api-key': 'admin-access-key' }
      ]

      for (const headers of maliciousHeaders) {
        const request = {
          user: { id: regularUser.id, role: 'USER', tenantId: testTenant.id },
          body: { email: 'test@example.com' },
          headers: { ...headers, 'x-tenant-id': testTenant.id }
        }

        await expect(
          userController.createUser(request as any)
        ).rejects.toThrow('Insufficient permissions')
      }
    })

    it('should prevent SQL injection in authorization queries', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM tenants --",
        "admin'; UPDATE users SET role='ADMIN' WHERE email LIKE '%",
        "'; INSERT INTO users (email, role) VALUES ('hacker@evil.com', 'SUPER_ADMIN'); --"
      ]

      for (const maliciousInput of maliciousInputs) {
        const request = {
          user: { id: maliciousInput, role: 'ADMIN', tenantId: testTenant.id },
          body: { email: 'test@example.com' },
          headers: { 'x-tenant-id': testTenant.id }
        }

        // Should not cause SQL injection or unauthorized access
        await expect(
          userController.createUser(request as any)
        ).rejects.toThrow()

        // Verify database integrity
        const users = await testDatabase.user.findMany({
          where: { email: { contains: 'hacker@evil.com' } }
        })
        expect(users).toHaveLength(0)
      }
    })

    it('should prevent concurrent authorization bypass attempts', async () => {
      const concurrentRequests = Array.from({ length: 100 }, (_, i) => ({
        user: { id: regularUser.id, role: 'ADMIN', tenantId: testTenant.id }, // Fake role
        body: { email: `bypass${i}@example.com` },
        headers: { 'x-tenant-id': testTenant.id }
      }))

      const results = await Promise.allSettled(
        concurrentRequests.map(req => userController.createUser(req as any))
      )

      // All requests should fail
      results.forEach(result => {
        expect(result.status).toBe('rejected')
      })

      // Verify no users were created
      const createdUsers = await testDatabase.user.findMany({
        where: { email: { startsWith: 'bypass' } }
      })
      expect(createdUsers).toHaveLength(0)
    })
  })

  describe('Privilege Escalation Prevention', () => {
    it('should prevent self-role escalation', async () => {
      const escalationAttempts = [
        { targetRole: 'ADMIN' },
        { targetRole: 'SUPER_ADMIN' },
        { targetRole: 'MANAGER' }
      ]

      for (const target of escalationAttempts) {
        const request = {
          user: { id: regularUser.id, role: 'USER', tenantId: testTenant.id },
          params: { id: regularUser.id },
          body: { role: target.targetRole },
          headers: { 'x-tenant-id': testTenant.id }
        }

        await expect(
          userController.updateUserRole(request as any)
        ).rejects.toThrow('Insufficient permissions')

        // Verify user role hasn't changed
        const unchangedUser = await testDatabase.user.findUnique({
          where: { id: regularUser.id }
        })
        expect(unchangedUser?.role).toBe('USER')
      }
    })

    it('should prevent permission self-assignment', async () => {
      const maliciousPermissions = [
        ['users:create', 'users:delete', 'roles:manage'],
        ['system:admin', 'tenant:manage', 'user:impersonate'],
        ['all:permissions', 'system:root', 'database:access']
      ]

      for (const permissions of maliciousPermissions) {
        const request = {
          user: { id: regularUser.id, role: 'USER', tenantId: testTenant.id },
          params: { id: regularUser.id },
          body: { permissions },
          headers: { 'x-tenant-id': testTenant.id }
        }

        await expect(
          userController.updateUserPermissions(request as any)
        ).rejects.toThrow('Insufficient permissions')
      }
    })

    it('should prevent privilege escalation through user creation', async () => {
      const privilegedUsers = [
        { email: 'fakeadmin@example.com', role: 'ADMIN' },
        { email: 'fakesuper@example.com', role: 'SUPER_ADMIN' },
        { email: 'fakemanager@example.com', role: 'MANAGER' }
      ]

      for (const user of privilegedUsers) {
        const request = {
          user: { id: regularUser.id, role: 'USER', tenantId: testTenant.id },
          body: user,
          headers: { 'x-tenant-id': testTenant.id }
        }

        await expect(
          userController.createUser(request as any)
        ).rejects.toThrow('Insufficient permissions')
      }
    })

    it('should prevent cross-tenant privilege escalation', async () => {
      const anotherTenant = await createTestTenant(testDatabase, {
        name: 'Another Tenant',
        domain: 'another.example.com'
      })

      // Create admin in another tenant
      const anotherTenantAdmin = await createTestUser(testDatabase, {
        tenantId: anotherTenant.id,
        email: 'admin@another.com',
        role: 'ADMIN',
        isActive: true
      })

      // Try to use another tenant admin to escalate privileges in original tenant
      const request = {
        user: { id: anotherTenantAdmin.id, role: 'ADMIN', tenantId: anotherTenant.id },
        params: { id: regularUser.id },
        body: { role: 'ADMIN' },
        headers: { 'x-tenant-id': testTenant.id } // Different tenant in headers
      }

      await expect(
        userController.updateUserRole(request as any)
      ).rejects.toThrow('Tenant mismatch')
    })
  })

  describe('Multi-Tenant Authorization Scenarios', () => {
    it('should enforce tenant-scoped authorization', async () => {
      const anotherTenant = await createTestTenant(testDatabase, {
        name: 'Another Tenant',
        domain: 'another.example.com'
      })

      const anotherTenantUser = await createTestUser(testDatabase, {
        tenantId: anotherTenant.id,
        email: 'user@another.com',
        role: 'USER',
        isActive: true
      })

      // Try to access user from different tenant
      const request = {
        user: { id: tenantAdmin.id, role: 'ADMIN', tenantId: testTenant.id },
        params: { id: anotherTenantUser.id },
        headers: { 'x-tenant-id': testTenant.id }
      }

      await expect(
        userController.getUserById(request as any)
      ).rejects.toThrow('User not found or access denied')
    })

    it('should handle tenant-specific role permissions', async () => {
      // Admin in Tenant A should not have admin privileges in Tenant B
      const anotherTenant = await createTestTenant(testDatabase, {
        name: 'Another Tenant',
        domain: 'another.example.com'
      })

      const targetUserInAnotherTenant = await createTestUser(testDatabase, {
        tenantId: anotherTenant.id,
        email: 'target@another.com',
        role: 'USER',
        isActive: true
      })

      // Tenant A admin trying to delete user in Tenant B
      const request = {
        user: { id: tenantAdmin.id, role: 'ADMIN', tenantId: testTenant.id },
        params: { id: targetUserInAnotherTenant.id },
        headers: { 'x-tenant-id': anotherTenant.id }
      }

      await expect(
        userController.deleteUser(request as any)
      ).rejects.toThrow('Tenant mismatch')
    })

    it('should prevent cross-tenant permission inheritance', async () => {
      const anotherTenant = await createTestTenant(testDatabase, {
        name: 'Another Tenant',
        domain: 'another.example.com'
      })

      // Check that permissions are tenant-scoped
      const hasPermissionInTenantA = await rbacService.hasPermission(
        tenantAdmin.id,
        'users:create',
        testTenant.id
      )
      expect(hasPermissionInTenantA).toBe(true)

      const hasPermissionInTenantB = await rbacService.hasPermission(
        tenantAdmin.id,
        'users:create',
        anotherTenant.id
      )
      expect(hasPermissionInTenantB).toBe(false) // Should not have permission in other tenant
    })
  })

  describe('Advanced Security Scenarios', () => {
    it('should handle authorization caching correctly', async () => {
      // First authorization check
      const startTime1 = Date.now()
      const hasPermission1 = await rbacService.hasPermission(
        tenantAdmin.id,
        'users:read',
        testTenant.id
      )
      const duration1 = Date.now() - startTime1

      // Second authorization check (should be cached)
      const startTime2 = Date.now()
      const hasPermission2 = await rbacService.hasPermission(
        tenantAdmin.id,
        'users:read',
        testTenant.id
      )
      const duration2 = Date.now() - startTime2

      expect(hasPermission1).toBe(true)
      expect(hasPermission2).toBe(true)

      // Second check should be faster (cached)
      expect(duration2).toBeLessThanOrEqual(duration1)
    })

    it('should handle authorization audit logging', async () => {
      const auditSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const request = {
        user: { id: regularUser.id, role: 'USER', tenantId: testTenant.id },
        body: { email: 'test@example.com' },
        headers: { 'x-tenant-id': testTenant.id }
      }

      await expect(
        userController.createUser(request as any)
      ).rejects.toThrow()

      // Verify audit log was created
      expect(auditSpy).toHaveBeenCalledWith(
        expect.stringContaining('Authorization denied'),
        expect.objectContaining({
          userId: regularUser.id,
          action: 'users:create',
          tenantId: testTenant.id
        })
      )

      auditSpy.mockRestore()
    })

    it('should handle rate limiting for authorization checks', async () => {
      const rapidRequests = Array.from({ length: 1000 }, () =>
        rbacService.hasPermission(regularUser.id, 'users:read', testTenant.id)
      )

      const results = await Promise.allSettled(rapidRequests)

      // Most requests should succeed or fail gracefully without rate limiting errors
      const failures = results.filter(r => r.status === 'rejected').length
      expect(failures).toBeLessThan(100) // Allow some failures but not all

      // Verify no unauthorized permissions granted
      const successes = results.filter(r => r.status === 'fulfilled')
      successes.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value).toBe(false) // Regular user should not have permission
        }
      })
    })

    it('should handle role revocation and permission updates', async () => {
      // User starts with MANAGER role
      const managerUser = await createTestUser(testDatabase, {
        tenantId: testTenant.id,
        email: 'tobedemoted@example.com',
        role: 'MANAGER',
        isActive: true
      })

      // Initially should have manager permissions
      const hasPermissionInitially = await rbacService.hasPermission(
        managerUser.id,
        'users:create',
        testTenant.id
      )
      expect(hasPermissionInitially).toBe(true)

      // Demote user to regular USER
      await testDatabase.user.update({
        where: { id: managerUser.id },
        data: { role: 'USER' }
      })

      // Clear any cached permissions
      await rbacService.clearUserPermissions(managerUser.id, testTenant.id)

      // Should no longer have manager permissions
      const hasPermissionAfterDemotion = await rbacService.hasPermission(
        managerUser.id,
        'users:create',
        testTenant.id
      )
      expect(hasPermissionAfterDemotion).toBe(false)
    })
  })
})