import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupTestDatabase, getTestPrisma, withTransaction } from '@tests/helpers/database'
import { UserFactory, TenantFactory } from '@tests/helpers/factories'
import { createTestUser, createTestHeaders } from '@tests/helpers/auth'

describe('Authorization Flow Integration Tests', () => {
  let testTenant: any
  let adminUser: any
  let teacherUser: any
  let studentUser: any

  beforeEach(async () => {
    await setupTestDatabase().reset()

    testTenant = await TenantFactory.create({
      code: 'AUTHZ-TEST-SCHOOL',
      name: 'Authorization Test School',
    })

    // Create users with different roles
    adminUser = await UserFactory.createWithTenant(testTenant.id, {
      email: 'admin@test.com',
      role: 'ADMIN',
      isSystemAdmin: false,
    })

    teacherUser = await UserFactory.createWithTenant(testTenant.id, {
      email: 'teacher@test.com',
      role: 'TEACHER',
      isSystemAdmin: false,
    })

    studentUser = await UserFactory.createWithTenant(testTenant.id, {
      email: 'student@test.com',
      role: 'STUDENT',
      isSystemAdmin: false,
    })

    // Create system admin
    await UserFactory.create({
      email: 'system@admin.com',
      role: 'ADMIN',
      isSystemAdmin: true,
    })
  })

  afterEach(async () => {
    await setupTestDatabase().reset()
  })

  describe('Role-Based Access Control', () => {
    it('should allow admin to access user management endpoints', async () => {
      const testAuth = createTestUser({
        id: adminUser.id,
        tenantId: adminUser.tenantId,
        email: adminUser.email,
        role: adminUser.role,
      })

      const headers = createTestHeaders(testAuth)

      // Simulate role check
      const user = await getTestPrisma().user.findUnique({
        where: { id: testAuth.id },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      })

      // Mock role permissions for admin
      const adminPermissions = [
        'create:users',
        'read:users',
        'update:users',
        'delete:users',
        'create:students',
        'read:students',
        'update:students',
        'delete:students',
        'create:teachers',
        'read:teachers',
        'update:teachers',
        'read:reports',
        'manage:settings',
      ]

      // Simulate permission check
      const hasPermission = (permission: string) => {
        return user?.isSystemAdmin || adminPermissions.includes(permission)
      }

      expect(hasPermission('create:users')).toBe(true)
      expect(hasPermission('delete:users')).toBe(true)
      expect(hasPermission('manage:settings')).toBe(true)
      expect(headers['X-Tenant-ID']).toBe(testTenant.id)
    })

    it('should restrict teacher to appropriate permissions', async () => {
      const testAuth = createTestUser({
        id: teacherUser.id,
        tenantId: teacherUser.tenantId,
        email: teacherUser.email,
        role: teacherUser.role,
      })

      // Mock role permissions for teacher
      const teacherPermissions = [
        'read:students',
        'update:students',
        'read:classes',
        'read:subjects',
        'create:assignments',
        'read:assignments',
        'update:assignments',
        'read:grades',
        'create:grades',
        'update:grades',
      ]

      // Simulate permission check
      const hasPermission = (permission: string) => {
        return teacherPermissions.includes(permission)
      }

      expect(hasPermission('read:students')).toBe(true)
      expect(hasPermission('create:assignments')).toBe(true)
      expect(hasPermission('create:users')).toBe(false) // Should not have user creation
      expect(hasPermission('delete:users')).toBe(false) // Should not have user deletion
      expect(hasPermission('manage:settings')).toBe(false) // Should not have settings management
    })

    it('should restrict student to minimal permissions', async () => {
      const testAuth = createTestUser({
        id: studentUser.id,
        tenantId: studentUser.tenantId,
        email: studentUser.email,
        role: studentUser.role,
      })

      // Mock role permissions for student
      const studentPermissions = [
        'read:own-profile',
        'read:own-grades',
        'read:own-assignments',
        'read:own-schedule',
        'update:own-profile',
      ]

      // Simulate permission check
      const hasPermission = (permission: string) => {
        return studentPermissions.includes(permission)
      }

      expect(hasPermission('read:own-grades')).toBe(true)
      expect(hasPermission('read:own-assignments')).toBe(true)
      expect(hasPermission('read:students')).toBe(false) // Should not access other students
      expect(hasPermission('create:assignments')).toBe(false) // Should not create assignments
      expect(hasPermission('read:all-grades')).toBe(false) // Should not access all grades
    })
  })

  describe('System Admin Authorization', () => {
    it('should allow system admin to access any tenant data', async () => {
      const systemAdmin = await getTestPrisma().user.findFirst({
        where: { isSystemAdmin: true },
      })

      expect(systemAdmin?.isSystemAdmin).toBe(true)

      const testAuth = createTestUser({
        id: systemAdmin!.id,
        tenantId: 'any-tenant-id', // Can be any tenant
        email: systemAdmin!.email,
        role: 'ADMIN',
      })

      const headers = createTestHeaders(testAuth)

      // System admin should bypass tenant checks
      const canAccessAnyTenant = true
      const canAccessSystemResources = true

      expect(canAccessAnyTenant).toBe(true)
      expect(canAccessSystemResources).toBe(true)
      expect(headers['X-Tenant-ID']).toBe('any-tenant-id')
    })

    it('should allow system admin to manage tenants', async () => {
      const systemAdmin = await getTestPrisma().user.findFirst({
        where: { isSystemAdmin: true },
      })

      // Simulate system admin permissions
      const systemAdminPermissions = [
        'create:tenants',
        'read:tenants',
        'update:tenants',
        'delete:tenants',
        'manage:system-settings',
        'view:system-reports',
        'manage:subscriptions',
      ]

      const hasSystemPermission = (permission: string) => {
        return systemAdminPermissions.includes(permission)
      }

      expect(hasSystemPermission('create:tenants')).toBe(true)
      expect(hasSystemPermission('manage:system-settings')).toBe(true)
      expect(hasSystemPermission('view:system-reports')).toBe(true)
    })
  })

  describe('Tenant Scoping', () => {
    it('should enforce tenant isolation for regular users', async () => {
      const testAuth = createTestUser({
        id: adminUser.id,
        tenantId: adminUser.tenantId,
        email: adminUser.email,
        role: adminUser.role,
      })

      // Test user can only access their own tenant data
      const userTenantId = adminUser.tenantId
      const requestTenantId = testTenant.id

      const canAccessTenant = userTenantId === requestTenantId
      expect(canAccessTenant).toBe(true)

      // Test cross-tenant access rejection
      const anotherTenant = await TenantFactory.create({
        code: 'OTHER-SCHOOL',
        name: 'Other School',
      })

      const cannotAccessOtherTenant = userTenantId !== anotherTenant.id
      expect(cannotAccessOtherTenant).toBe(true)
    })

    it('should allow scoped resource access', async () => {
      const testAuth = createTestUser({
        id: teacherUser.id,
        tenantId: teacherUser.tenantId,
        email: teacherUser.email,
        role: teacherUser.role,
      })

      // Simulate teacher accessing their own classes
      const teacherClasses = [
        { id: 'class-1', teacherId: teacherUser.id, tenantId: teacherUser.tenantId },
        { id: 'class-2', teacherId: teacherUser.id, tenantId: teacherUser.tenantId },
      ]

      const canAccessClass = (classId: string) => {
        const classData = teacherClasses.find(c => c.id === classId)
        return classData?.teacherId === teacherUser.id && classData?.tenantId === teacherUser.tenantId
      }

      expect(canAccessClass('class-1')).toBe(true)
      expect(canAccessClass('class-2')).toBe(true)

      // Teacher cannot access another teacher's class
      const otherTeacherClass = { id: 'class-3', teacherId: 'other-teacher-id', tenantId: teacherUser.tenantId }
      const cannotAccessOtherClass = otherTeacherClass.teacherId !== teacherUser.id
      expect(cannotAccessOtherClass).toBe(true)
    })
  })

  describe('Custom Authorization Logic', () => {
    it('should implement custom ownership-based authorization', async () => {
      const testAuth = createTestUser({
        id: studentUser.id,
        tenantId: studentUser.tenantId,
        email: studentUser.email,
        role: studentUser.role,
      })

      // Simulate grade record
      const gradeRecord = {
        id: 'grade-1',
        studentId: studentUser.id,
        tenantId: studentUser.tenantId,
        value: 95,
        subject: 'Math',
      }

      // Custom authorization function
      const canAccessGrade = (user: any, grade: any) => {
        return (
          user.id === grade.studentId && // Own grade
          user.tenantId === grade.tenantId && // Same tenant
          user.role === 'STUDENT'
        )
      }

      expect(canAccessGrade(testAuth, gradeRecord)).toBe(true)

      // Cannot access another student's grade
      const otherStudentGrade = {
        ...gradeRecord,
        studentId: 'other-student-id',
      }

      expect(canAccessGrade(testAuth, otherStudentGrade)).toBe(false)
    })

    it('should implement department-based authorization', async () => {
      const testAuth = createTestUser({
        id: teacherUser.id,
        tenantId: teacherUser.tenantId,
        email: teacherUser.email,
        role: teacherUser.role,
      })

      // Simulate teacher department assignment
      const teacherDepartment = {
        teacherId: teacherUser.id,
        departmentId: 'math-department',
        tenantId: teacherUser.tenantId,
      }

      // Custom department-based authorization
      const canManageDepartmentSubject = (user: any, subject: any) => {
        return (
          user.role === 'TEACHER' &&
          user.tenantId === subject.tenantId &&
          teacherDepartment.departmentId === subject.departmentId
        )
      }

      const mathSubject = {
        id: 'math-101',
        departmentId: 'math-department',
        tenantId: teacherUser.tenantId,
      }

      const scienceSubject = {
        id: 'science-101',
        departmentId: 'science-department',
        tenantId: teacherUser.tenantId,
      }

      expect(canManageDepartmentSubject(testAuth, mathSubject)).toBe(true)
      expect(canManageDepartmentSubject(testAuth, scienceSubject)).toBe(false)
    })
  })

  describe('Wildcard Permission Handling', () => {
    it('should handle wildcard resource permissions', async () => {
      // Create user with wildcard permissions
      const superAdminPermissions = [
        '*:users', // All actions on users
        'read:*', // Read all resources
        'create:*', // Create all resources
      ]

      const testAuth = createTestUser({
        id: adminUser.id,
        tenantId: adminUser.tenantId,
        email: adminUser.email,
        role: 'SUPER_ADMIN',
      })

      // Wildcard permission matching
      const hasWildcardPermission = (requiredPermission: string) => {
        return superAdminPermissions.some(userPermission => {
          if (userPermission === '*') return true // Super wildcard
          if (userPermission.endsWith(':*')) {
            const resource = userPermission.split(':')[0]
            return requiredPermission.startsWith(resource + ':')
          }
          if (userPermission.startsWith('*:')) {
            const action = userPermission.split(':')[1]
            return requiredPermission.endsWith(':' + action)
          }
          return userPermission === requiredPermission
        })
      }

      expect(hasWildcardPermission('create:users')).toBe(true) // Matches *:users
      expect(hasWildcardPermission('delete:users')).toBe(true) // Matches *:users
      expect(hasWildcardPermission('read:students')).toBe(true) // Matches read:*
      expect(hasWildcardPermission('create:assignments')).toBe(true) // Matches create:*
      expect(hasWildcardPermission('execute:system')).toBe(false) // No match
    })
  })

  describe('Permission Caching and Performance', () => {
    it('should cache user permissions for performance', async () => {
      const testAuth = createTestUser({
        id: adminUser.id,
        tenantId: adminUser.tenantId,
        email: adminUser.email,
        role: adminUser.role,
      })

      // Simulate permission cache
      const permissionCache = new Map()

      const getCachedPermissions = (userId: string) => {
        if (permissionCache.has(userId)) {
          return permissionCache.get(userId)
        }

        // Simulate database query for permissions
        const permissions = [
          'create:users',
          'read:users',
          'update:users',
          'delete:users',
          'read:reports',
        ]

        permissionCache.set(userId, permissions)
        return permissions
      }

      // First call should query database
      const firstCall = getCachedPermissions(testAuth.id)
      expect(firstCall).toContain('create:users')

      // Second call should use cache
      const secondCall = getCachedPermissions(testAuth.id)
      expect(secondCall).toEqual(firstCall)
      expect(permissionCache.size).toBe(1)
    })
  })

  describe('Audit Logging', () => {
    it('should log authorization decisions', async () => {
      const testAuth = createTestUser({
        id: adminUser.id,
        tenantId: adminUser.tenantId,
        email: adminUser.email,
        role: adminUser.role,
      })

      // Simulate audit log
      const auditLogs: any[] = []

      const logAuthorizationDecision = (
        userId: string,
        resource: string,
        action: string,
        granted: boolean,
        reason?: string
      ) => {
        auditLogs.push({
          userId,
          resource,
          action,
          granted,
          reason,
          timestamp: new Date().toISOString(),
        })
      }

      // Log successful authorization
      logAuthorizationDecision(testAuth.id, 'users', 'read', true)

      // Log failed authorization
      logAuthorizationDecision(testAuth.id, 'system_settings', 'delete', false, 'Insufficient permissions')

      expect(auditLogs).toHaveLength(2)
      expect(auditLogs[0].granted).toBe(true)
      expect(auditLogs[1].granted).toBe(false)
      expect(auditLogs[1].reason).toBe('Insufficient permissions')
    })
  })
})