/**
 * Enhanced Tenant Context Middleware
 *
 * This middleware extracts tenant information from authenticated user sessions
 * and injects tenant context into the request and database session.
 * Integrates with BetterAuth authentication and implements tenant isolation as per ADR-004.
 */

import { PrismaClient } from '@pems/database'
import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getAuthContext, getCurrentUser } from './auth-middleware'

export interface TenantContext {
  tenantId: string
  tenantName?: string
  isSystemAdmin?: boolean
  userId?: string
}

export const TENANT_CONTEXT_KEY = 'tenant'
export const USER_CONTEXT_KEY = 'user'

/**
 * Middleware to extract and validate tenant context from authenticated user
 */
export const tenantContextMiddleware = (prisma: PrismaClient) => {
  return async (c: Context, next: Next) => {
    try {
      // Check if user is authenticated
      const authContext = getAuthContext(c)

      if (!authContext.isAuthenticated) {
        throw new HTTPException(401, {
          message: 'Authentication required for tenant context',
        })
      }

      const user = getCurrentUser(c)

      // Extract tenant information from authenticated user
      let tenantId: string | undefined

      // Handle system admin access (cross-tenant)
      if (user.isSystemAdmin) {
        // System admins can access any tenant
        // Try to get tenant from request header or query parameter
        tenantId =
          c.req.header('X-Tenant-ID') ??
          c.req.query('tenantId') ??
          user.tenantId
      } else {
        // Regular users can only access their own tenant
        tenantId = user.tenantId
      }

      if (!tenantId) {
        throw new HTTPException(401, {
          message: 'Tenant context required',
        })
      }

      // Verify tenant exists and is active
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, slug: true },
      })

      if (!tenant) {
        throw new HTTPException(401, {
          message: 'Invalid tenant',
        })
      }

      const tenantContext: TenantContext = {
        tenantId: tenant.id,
        tenantName: tenant.name,
        isSystemAdmin: user.isSystemAdmin ?? false,
        userId: user.id,
      }

      // Set tenant context in request
      c.set(TENANT_CONTEXT_KEY, tenantContext)
      // Note: USER_CONTEXT_KEY is already set by auth middleware

      // Configure database session with tenant context for RLS
      await configureDatabaseSession(prisma, tenantContext)

      await next()
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }

      // eslint-disable-next-line no-console
      console.error('Tenant context middleware error:', error)
      throw new HTTPException(401, {
        message: 'Tenant context setup failed',
      })
    }
  }
}

/**
 * Configure PostgreSQL session variables for Row-Level Security
 */
async function configureDatabaseSession(
  prisma: PrismaClient,
  tenantContext: TenantContext,
): Promise<void> {
  // Set session variables that RLS policies will use
  await prisma.$executeRaw`SET app.current_tenant_id = ${tenantContext.tenantId}`

  if (tenantContext.isSystemAdmin) {
    await prisma.$executeRaw`SET app.is_system_admin = true`
  } else {
    await prisma.$executeRaw`SET app.is_system_admin = false`
  }

  if (tenantContext.userId) {
    await prisma.$executeRaw`SET app.current_user_id = ${tenantContext.userId}`
  }
}

/**
 * Helper function to get tenant context from request
 */
export function getTenantContext(c: Context): TenantContext {
  const tenantContext = c.get(TENANT_CONTEXT_KEY)
  if (!tenantContext) {
    throw new HTTPException(500, {
      message: 'Tenant context not found',
    })
  }
  return tenantContext
}

/**
 * Helper function to get user context from request
 */
export function getUserContext(c: Context) {
  const userContext = c.get(USER_CONTEXT_KEY)
  if (!userContext) {
    throw new HTTPException(500, {
      message: 'User context not found',
    })
  }
  return userContext
}

/**
 * Middleware for optional tenant context (for public endpoints)
 */
export const optionalTenantContext = (prisma: PrismaClient) => {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const authContext = getAuthContext(c)

        if (authContext.isAuthenticated) {
          const user = getCurrentUser(c)

          // Extract tenant information from authenticated user
          let tenantId: string | undefined

          // Handle system admin access (cross-tenant)
          if (user.isSystemAdmin) {
            // System admins can access any tenant
            // Try to get tenant from request header or query parameter
            tenantId =
              c.req.header('X-Tenant-ID') ??
              c.req.query('tenantId') ??
              user.tenantId
          } else {
            // Regular users can only access their own tenant
            tenantId = user.tenantId
          }

          if (tenantId) {
            const tenant = await prisma.tenant.findUnique({
              where: { id: tenantId },
              select: { id: true, name: true },
            })

            if (tenant) {
              const tenantContext: TenantContext = {
                tenantId: tenant.id,
                tenantName: tenant.name,
                isSystemAdmin: user.isSystemAdmin ?? false,
                userId: user.id,
              }

              c.set(TENANT_CONTEXT_KEY, tenantContext)
              await configureDatabaseSession(prisma, tenantContext)
            }
          }
        }
      } catch (error) {
        // Silently fail for optional context
        // eslint-disable-next-line no-console
        console.warn('Optional tenant context failed:', error)
      }
    }

    await next()
  }
}
