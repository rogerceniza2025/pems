import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { authorizationMiddleware } from '@packages/infrastructure/middleware/src/authorization-middleware'
import { PrismaClient } from '@prisma/client'

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    permission: {
      findMany: vi.fn(),
    },
    rolePermission: {
      findMany: vi.fn(),
    },
    userRole: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  })),
}))

describe('Authorization Middleware', () => {
  let mockRequest: Partial<NextRequest>
  let mockNext: ReturnType<typeof vi.fn>
  let mockPrisma: PrismaClient

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      headers: new Headers(),
      url: 'http://localhost:3000/api/admin/users',
    }

    mockNext = vi.fn()
    mockPrisma = new PrismaClient()
  })

  describe('System Admin Authorization', () => {
    it('should allow system admin to access any resource', async () => {
      mockRequest.headers!.set('X-User-ID', 'system-admin-123')
      mockRequest.headers!.set('X-Tenant-ID', 'tenant-123')

      const mockSystemAdmin = {
        id: 'system-admin-123',
        isSystemAdmin: true,
        email: 'admin@system.com',
      }

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockSystemAdmin)

      await authorizationMiddleware(mockRequest as NextRequest, mockNext, {
        requiredPermissions: ['admin:users:create'],
      })

      expect(mockNext).toHaveBeenCalledWith()
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'system-admin-123' },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    })

    it('should bypass tenant checks for system admin', async () => {
      mockRequest.headers!.set('X-User-ID', 'system-admin-123')
      mockRequest.headers!.set('X-Tenant-ID', 'different-tenant')

      const mockSystemAdmin = {
        id: 'system-admin-123',
        isSystemAdmin: true,
        email: 'admin@system.com',
      }

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockSystemAdmin)

      await authorizationMiddleware(mockRequest as NextRequest, mockNext, {
        requiredPermissions: ['admin:users:delete'],
        tenantRequired: true,
      })

      expect(mockNext).toHaveBeenCalledWith()
    })
  })

  describe('Role-Based Authorization', () => {
    it('should allow user with sufficient permissions', async () => {
      mockRequest.headers!.set('X-User-ID', 'user-123')
      mockRequest.headers!.set('X-Tenant-ID', 'tenant-123')

      const mockUser = {
        id: 'user-123',
        isSystemAdmin: false,
        userRoles: [
          {
            role: {
              name: 'School Admin',
              slug: 'school-admin',
              rolePermissions: [
                {
                  permission: {
                    action: 'create',
                    resource: 'users',
                    resourceScope: 'tenant',
                  },
                },
              ],
            },
          },
        ],
      }

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser)

      await authorizationMiddleware(mockRequest as NextRequest, mockNext, {
        requiredPermissions: ['create:users'],
        tenantRequired: true,
      })

      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should reject user without required permissions', async () => {
      mockRequest.headers!.set('X-User-ID', 'user-123')
      mockRequest.headers!.set('X-Tenant-ID', 'tenant-123')

      const mockUser = {
        id: 'user-123',
        isSystemAdmin: false,
        userRoles: [
          {
            role: {
              name: 'Teacher',
              slug: 'teacher',
              rolePermissions: [
                {
                  permission: {
                    action: 'read',
                    resource: 'students',
                    resourceScope: 'tenant',
                  },
                },
              ],
            },
          },
        ],
      }

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser)

      await authorizationMiddleware(mockRequest as NextRequest, mockNext, {
        requiredPermissions: ['create:users'],
        tenantRequired: true,
      })

      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Tenant-Based Authorization', () => {
    it('should allow tenant-scoped access for correct tenant', async () => {
      mockRequest.headers!.set('X-User-ID', 'user-123')
      mockRequest.headers!.set('X-Tenant-ID', 'tenant-123')

      const mockUser = {
        id: 'user-123',
        isSystemAdmin: false,
        tenantId: 'tenant-123',
        userRoles: [
          {
            role: {
              name: 'School Admin',
              slug: 'school-admin',
              rolePermissions: [
                {
                  permission: {
                    action: 'read',
                    resource: 'students',
                    resourceScope: 'tenant',
                  },
                },
              ],
            },
          },
        ],
      }

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser)

      await authorizationMiddleware(mockRequest as NextRequest, mockNext, {
        requiredPermissions: ['read:students'],
        tenantRequired: true,
      })

      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should reject tenant-scoped access for wrong tenant', async () => {
      mockRequest.headers!.set('X-User-ID', 'user-123')
      mockRequest.headers!.set('X-Tenant-ID', 'different-tenant')

      const mockUser = {
        id: 'user-123',
        isSystemAdmin: false,
        tenantId: 'tenant-123', // Different from header
        userRoles: [
          {
            role: {
              name: 'School Admin',
              slug: 'school-admin',
              rolePermissions: [
                {
                  permission: {
                    action: 'read',
                    resource: 'students',
                    resourceScope: 'tenant',
                  },
                },
              ],
            },
          },
        ],
      }

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser)

      await authorizationMiddleware(mockRequest as NextRequest, mockNext, {
        requiredPermissions: ['read:students'],
        tenantRequired: true,
      })

      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Wildcard Permission Matching', () => {
    it('should match wildcard permissions correctly', async () => {
      mockRequest.headers!.set('X-User-ID', 'user-123')
      mockRequest.headers!.set('X-Tenant-ID', 'tenant-123')

      const mockUser = {
        id: 'user-123',
        isSystemAdmin: false,
        userRoles: [
          {
            role: {
              name: 'Super Admin',
              slug: 'super-admin',
              rolePermissions: [
                {
                  permission: {
                    action: '*',
                    resource: '*',
                    resourceScope: 'tenant',
                  },
                },
              ],
            },
          },
        ],
      }

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser)

      await authorizationMiddleware(mockRequest as NextRequest, mockNext, {
        requiredPermissions: ['delete:users'],
        tenantRequired: true,
      })

      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should match resource-specific wildcard', async () => {
      mockRequest.headers!.set('X-User-ID', 'user-123')
      mockRequest.headers!.set('X-Tenant-ID', 'tenant-123')

      const mockUser = {
        id: 'user-123',
        isSystemAdmin: false,
        userRoles: [
          {
            role: {
              name: 'User Manager',
              slug: 'user-manager',
              rolePermissions: [
                {
                  permission: {
                    action: '*',
                    resource: 'users',
                    resourceScope: 'tenant',
                  },
                },
              ],
            },
          },
        ],
      }

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser)

      await authorizationMiddleware(mockRequest as NextRequest, mockNext, {
        requiredPermissions: ['create:users'],
        tenantRequired: true,
      })

      expect(mockNext).toHaveBeenCalledWith()
    })
  })

  describe('Custom Authorization Logic', () => {
    it('should execute custom authorization function', async () => {
      mockRequest.headers!.set('X-User-ID', 'user-123')
      mockRequest.headers!.set('X-Tenant-ID', 'tenant-123')

      const mockUser = {
        id: 'user-123',
        isSystemAdmin: false,
        email: 'teacher@school.edu',
      }

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser)

      const customAuth = vi.fn().mockResolvedValue(true)

      await authorizationMiddleware(mockRequest as NextRequest, mockNext, {
        customAuth,
        tenantRequired: false,
      })

      expect(customAuth).toHaveBeenCalledWith(mockUser, mockRequest)
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should reject when custom authorization fails', async () => {
      mockRequest.headers!.set('X-User-ID', 'user-123')
      mockRequest.headers!.set('X-Tenant-ID', 'tenant-123')

      const mockUser = {
        id: 'user-123',
        isSystemAdmin: false,
        email: 'student@school.edu',
      }

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser)

      const customAuth = vi.fn().mockResolvedValue(false)

      await authorizationMiddleware(mockRequest as NextRequest, mockNext, {
        customAuth,
        tenantRequired: false,
      })

      expect(customAuth).toHaveBeenCalledWith(mockUser, mockRequest)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle user not found', async () => {
      mockRequest.headers!.set('X-User-ID', 'nonexistent-user')
      mockRequest.headers!.set('X-Tenant-ID', 'tenant-123')

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null)

      await authorizationMiddleware(mockRequest as NextRequest, mockNext, {
        requiredPermissions: ['read:users'],
        tenantRequired: true,
      })

      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      mockRequest.headers!.set('X-User-ID', 'user-123')
      mockRequest.headers!.set('X-Tenant-ID', 'tenant-123')

      vi.mocked(mockPrisma.user.findUnique).mockRejectedValue(
        new Error('Database connection failed')
      )

      await authorizationMiddleware(mockRequest as NextRequest, mockNext, {
        requiredPermissions: ['read:users'],
        tenantRequired: true,
      })

      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle missing user context', async () => {
      // No user headers set
      await authorizationMiddleware(mockRequest as NextRequest, mockNext, {
        requiredPermissions: ['read:users'],
        tenantRequired: true,
      })

      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})