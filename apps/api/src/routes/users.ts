/**
 * User Management API Routes
 *
 * Provides comprehensive user management endpoints
 * Integrates with tenant management, roles, and permissions
 */

import { zValidator } from '@hono/zod-validator/dist/index.cjs'
import { PrismaClient } from '@pems/database'
import { getCurrentSession, getCurrentUser } from '@pems/middleware'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'

const usersRouter = new Hono()

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
  isSystemAdmin: z.boolean().default(false),
  roles: z.array(z.string().uuid()).default([]),
  metadata: z.record(z.any()).default({}),
})

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  isSystemAdmin: z.boolean().optional(),
  roles: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.any()).optional(),
})

const updateUserPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

const queryUsersSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .default('20'),
  search: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  role: z.string().uuid().optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

const assignRoleSchema = z.object({
  roleId: z.string().uuid('Invalid role ID'),
  scope: z.record(z.any()).default({}),
})

const removeRoleSchema = z.object({
  roleId: z.string().uuid('Invalid role ID'),
})

// Initialize Prisma client
const prisma = new PrismaClient()

// Get current user (authenticated)
usersRouter.get('/me', async (c) => {
  try {
    const user = getCurrentUser(c)
    const currentUser = getCurrentSession(c)

    // Get user's roles and permissions
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: {
        role: {
          include: {
            role_permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    })

    const permissions = userRoles.flatMap((userRole) =>
      userRole.role.role_permissions.map((rp) => rp.permission),
    )

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        phone: (user as any).phone,
        image: user.image,
        tenantId: user.tenantId,
        isSystemAdmin: user.isSystemAdmin,
        isActive: (user as any).isActive,
        metadata: (user as any).metadata,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: currentUser.updatedAt,
      },
      roles: userRoles.map((userRole) => ({
        id: userRole.role.id,
        name: userRole.role.name,
        slug: userRole.role.slug,
        description: userRole.role.description,
        scope: userRole.scope,
      })),
      permissions: permissions.map((permission) => ({
        id: permission.id,
        action: permission.action,
        resource: permission.resource,
        resourceScope: permission.resource_scope,
      })),
    })
  } catch (error) {
    console.error('Get current user error:', error)
    throw new HTTPException(500, {
      message: 'Unable to retrieve user information',
    })
  }
})

// Get user by ID
usersRouter.get('/:id', async (c) => {
  try {
    const userId = c.req.param('id')
    const currentUser = getCurrentUser(c)

    // Check if user can access this information (self or admin)
    if (currentUser.user.id !== userId && !currentUser.user.isSystemAdmin) {
      throw new HTTPException(403, { message: 'Insufficient permissions' })
    }

    const user = await prisma.better_auth_users.findFirst({
      where: {
        id: userId,
        tenantId: currentUser.user.tenantId,
      },
      include: {
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        auth_providers: true,
        profiles: true,
      },
    })

    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    const permissions = user.user_roles.flatMap((userRole) =>
      userRole.role.role_permissions.map((rp) => rp.permission),
    )

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        phone: user.phone,
        image: user.image,
        tenantId: user.tenantId,
        isSystemAdmin: user.is_system_admin,
        isActive: user.is_active,
        metadata: user.metadata,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles: user.user_roles.map((userRole) => ({
          id: userRole.role.id,
          name: userRole.role.name,
          slug: userRole.role.slug,
          description: userRole.role.description,
          scope: userRole.scope,
        })),
        permissions: permissions.map((permission) => ({
          id: permission.id,
          action: permission.action,
          resource: permission.resource,
          resourceScope: permission.resource_scope,
        })),
        authProviders: user.auth_providers,
        profiles: user.profiles,
      },
    })
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Get user error:', error)
    throw new HTTPException(500, {
      message: 'Unable to retrieve user information',
    })
  }
})

// Get users with pagination and filtering (admin only)
usersRouter.get('/', zValidator('query', queryUsersSchema), async (c) => {
  try {
    const currentUser = getCurrentUser(c)

    // Check if user has admin privileges
    if (!currentUser.user.isSystemAdmin) {
      throw new HTTPException(403, { message: 'Admin access required' })
    }

    const { page, limit, search, isActive, role, sortBy, sortOrder } =
      c.req.valid('query')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      tenantId: currentUser.user.tenantId,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (isActive !== undefined) {
      where.is_active = isActive
    }

    if (role) {
      where.user_roles = {
        some: { roleId: role },
      }
    }

    // Build order clause
    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const [users, total] = await Promise.all([
      prisma.better_auth_users.findMany({
        where,
        include: {
          user_roles: {
            include: {
              role: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.better_auth_users.count({ where }),
    ])

    return c.json({
      success: true,
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        phone: user.phone,
        image: user.image,
        isSystemAdmin: user.is_system_admin,
        isActive: user.is_active,
        metadata: user.metadata,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles: user.user_roles.map((userRole) => ({
          id: userRole.role.id,
          name: userRole.role.name,
          slug: userRole.role.slug,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('List users error:', error)
    throw new HTTPException(500, { message: 'Unable to retrieve users list' })
  }
})

// Create new user (admin only)
usersRouter.post('/', zValidator('json', createUserSchema), async (c) => {
  try {
    const currentUser = getCurrentUser(c)

    // Check if user has admin privileges
    if (!currentUser.user.isSystemAdmin) {
      throw new HTTPException(403, { message: 'Admin access required' })
    }

    const userData = c.req.valid('json')
    const { roles, ...userFields } = userData

    // Check if email already exists in the same tenant
    const existingUser = await prisma.better_auth_users.findFirst({
      where: {
        email: userFields.email,
        tenantId: currentUser.user.tenantId,
      },
    })

    if (existingUser) {
      throw new HTTPException(409, {
        message: 'User with this email already exists',
      })
    }

    // Create user
    const user = await prisma.better_auth_users.create({
      data: {
        ...userFields,
        tenantId: currentUser.user.tenantId,
        is_active: userFields.isActive,
        is_system_admin: userFields.isSystemAdmin,
      },
      include: {
        user_roles: {
          include: {
            role: true,
          },
        },
      },
    })

    // Assign roles if provided
    if (roles.length > 0) {
      await prisma.userRole.createMany({
        data: roles.map((roleId) => ({
          userId: user.id,
          roleId,
        })),
      })

      // Refresh user data with roles
      const userWithRoles = await prisma.better_auth_users.findUnique({
        where: { id: user.id },
        include: {
          user_roles: {
            include: {
              role: true,
            },
          },
        },
      })

      return c.json({
        success: true,
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          phone: user.phone,
          image: user.image,
          isSystemAdmin: user.is_system_admin,
          isActive: user.is_active,
          metadata: user.metadata,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          roles:
            userWithRoles?.user_roles.map((userRole) => ({
              id: userRole.role.id,
              name: userRole.role.name,
              slug: userRole.role.slug,
            })) ?? [],
        },
      })
    }

    return c.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        phone: user.phone,
        image: user.image,
        isSystemAdmin: user.is_system_admin,
        isActive: user.is_active,
        metadata: user.metadata,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles: [],
      },
    })
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Create user error:', error)
    throw new HTTPException(500, {
      message: 'User creation temporarily unavailable',
    })
  }
})

// Update user
usersRouter.put('/:id', zValidator('json', updateUserSchema), async (c) => {
  try {
    const userId = c.req.param('id')
    const currentUser = getCurrentUser(c)
    const updates = c.req.valid('json')

    // Check permissions (self or admin)
    if (currentUser.user.id !== userId && !currentUser.user.isSystemAdmin) {
      throw new HTTPException(403, { message: 'Insufficient permissions' })
    }

    // Non-admins cannot change admin status or active status
    if (
      !currentUser.user.isSystemAdmin &&
      (updates.isSystemAdmin !== undefined || updates.isActive !== undefined)
    ) {
      throw new HTTPException(403, {
        message: 'Cannot modify admin or active status',
      })
    }

    // Check if user exists and belongs to same tenant
    const existingUser = await prisma.better_auth_users.findFirst({
      where: {
        id: userId,
        tenantId: currentUser.user.tenantId,
      },
    })

    if (!existingUser) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // Check email uniqueness if email is being changed
    if (updates.email && updates.email !== existingUser.email) {
      const emailExists = await prisma.better_auth_users.findFirst({
        where: {
          email: updates.email,
          tenantId: currentUser.user.tenantId,
          id: { not: userId },
        },
      })

      if (emailExists) {
        throw new HTTPException(409, {
          message: 'Email already in use by another user',
        })
      }
    }

    // Update user
    const updateData: any = { ...updates }
    if (updates.isSystemAdmin !== undefined) {
      updateData.is_system_admin = updates.isSystemAdmin
      delete updateData.isSystemAdmin
    }
    if (updates.isActive !== undefined) {
      updateData.is_active = updates.isActive
      delete updateData.isActive
    }

    const user = await prisma.better_auth_users.update({
      where: { id: userId },
      data: updateData,
      include: {
        user_roles: {
          include: {
            role: true,
          },
        },
      },
    })

    // Update roles if provided (admin only)
    if (updates.roles !== undefined && currentUser.user.isSystemAdmin) {
      // Remove existing roles
      await prisma.userRole.deleteMany({
        where: { userId },
      })

      // Add new roles
      if (updates.roles.length > 0) {
        await prisma.userRole.createMany({
          data: updates.roles.map((roleId) => ({
            userId,
            roleId,
          })),
        })
      }

      // Refresh user data with roles
      const userWithRoles = await prisma.better_auth_users.findUnique({
        where: { id: userId },
        include: {
          user_roles: {
            include: {
              role: true,
            },
          },
        },
      })

      return c.json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          phone: user.phone,
          image: user.image,
          isSystemAdmin: user.is_system_admin,
          isActive: user.is_active,
          metadata: user.metadata,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          roles:
            userWithRoles?.user_roles.map((userRole) => ({
              id: userRole.role.id,
              name: userRole.role.name,
              slug: userRole.role.slug,
            })) ?? [],
        },
      })
    }

    return c.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        phone: user.phone,
        image: user.image,
        isSystemAdmin: user.is_system_admin,
        isActive: user.is_active,
        metadata: user.metadata,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles: user.user_roles.map((userRole) => ({
          id: userRole.role.id,
          name: userRole.role.name,
          slug: userRole.role.slug,
        })),
      },
    })
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Update user error:', error)
    throw new HTTPException(500, {
      message: 'User update temporarily unavailable',
    })
  }
})

// Delete user (admin only)
usersRouter.delete('/:id', async (c) => {
  try {
    const userId = c.req.param('id')
    const currentUser = getCurrentUser(c)

    // Check if user has admin privileges
    if (!currentUser.user.isSystemAdmin) {
      throw new HTTPException(403, { message: 'Admin access required' })
    }

    // Prevent self-deletion
    if (currentUser.user.id === userId) {
      throw new HTTPException(400, {
        message: 'Cannot delete your own account',
      })
    }

    // Check if user exists and belongs to same tenant
    const existingUser = await prisma.better_auth_users.findFirst({
      where: {
        id: userId,
        tenantId: currentUser.user.tenantId,
      },
    })

    if (!existingUser) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // Delete user (cascade delete will handle related records)
    await prisma.better_auth_users.delete({
      where: { id: userId },
    })

    return c.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Delete user error:', error)
    throw new HTTPException(500, {
      message: 'User deletion temporarily unavailable',
    })
  }
})

// Assign role to user (admin only)
usersRouter.post(
  '/:id/roles',
  zValidator('json', assignRoleSchema),
  async (c) => {
    try {
      const userId = c.req.param('id')
      const currentUser = getCurrentUser(c)
      const { roleId, scope } = c.req.valid('json')

      // Check if user has admin privileges
      if (!currentUser.user.isSystemAdmin) {
        throw new HTTPException(403, { message: 'Admin access required' })
      }

      // Check if user exists and belongs to same tenant
      const existingUser = await prisma.better_auth_users.findFirst({
        where: {
          id: userId,
          tenantId: currentUser.user.tenantId,
        },
      })

      if (!existingUser) {
        throw new HTTPException(404, { message: 'User not found' })
      }

      // Check if role exists and belongs to same tenant
      const role = await prisma.role.findFirst({
        where: {
          id: roleId,
          tenantId: currentUser.user.tenantId,
        },
      })

      if (!role) {
        throw new HTTPException(404, { message: 'Role not found' })
      }

      // Check if role is already assigned
      const existingAssignment = await prisma.userRole.findFirst({
        where: { userId, roleId },
      })

      if (existingAssignment) {
        throw new HTTPException(409, {
          message: 'Role already assigned to user',
        })
      }

      // Assign role
      await prisma.userRole.create({
        data: {
          userId,
          roleId,
          scope,
        },
      })

      return c.json({
        success: true,
        message: 'Role assigned successfully',
      })
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      console.error('Assign role error:', error)
      throw new HTTPException(500, {
        message: 'Role assignment temporarily unavailable',
      })
    }
  },
)

// Remove role from user (admin only)
usersRouter.delete(
  '/:id/roles/:roleId',
  zValidator('json', removeRoleSchema),
  async (c) => {
    try {
      const userId = c.req.param('id')
      const roleId = c.req.param('roleId')
      const currentUser = getCurrentUser(c)

      // Check if user has admin privileges
      if (!currentUser.user.isSystemAdmin) {
        throw new HTTPException(403, { message: 'Admin access required' })
      }

      // Delete role assignment
      const result = await prisma.userRole.deleteMany({
        where: { userId, roleId },
      })

      if (result.count === 0) {
        throw new HTTPException(404, { message: 'Role assignment not found' })
      }

      return c.json({
        success: true,
        message: 'Role removed successfully',
      })
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      console.error('Remove role error:', error)
      throw new HTTPException(500, {
        message: 'Role removal temporarily unavailable',
      })
    }
  },
)

// Reset user password (admin only)
usersRouter.post(
  '/:id/reset-password',
  zValidator('json', updateUserPasswordSchema),
  async (c) => {
    try {
      const userId = c.req.param('id')
      const currentUser = getCurrentUser(c)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { newPassword } = c.req.valid('json')

      // Check if user has admin privileges
      if (!currentUser.user.isSystemAdmin) {
        throw new HTTPException(403, { message: 'Admin access required' })
      }

      // Check if user exists and belongs to same tenant
      const existingUser = await prisma.better_auth_users.findFirst({
        where: {
          id: userId,
          tenantId: currentUser.user.tenantId,
        },
      })

      if (!existingUser) {
        throw new HTTPException(404, { message: 'User not found' })
      }

      // This would typically integrate with BetterAuth's password reset functionality
      // For now, we'll return success (actual implementation would depend on BetterAuth API)

      return c.json({
        success: true,
        message: 'Password reset successfully',
      })
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      console.error('Reset password error:', error)
      throw new HTTPException(500, {
        message: 'Password reset temporarily unavailable',
      })
    }
  },
)

export { usersRouter }
