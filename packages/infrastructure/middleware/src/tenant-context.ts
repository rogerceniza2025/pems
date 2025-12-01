/**
 * Tenant Context Middleware
 *
 * This middleware extracts tenant information from authentication tokens
 * and injects tenant context into the request and database session.
 * Implements tenant isolation as per ADR-004.
 */

import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { PrismaClient } from '@prisma/client'

export interface TenantContext {
  tenantId: string
  tenantName?: string
  isSystemAdmin?: boolean
  userId?: string
}

export const TENANT_CONTEXT_KEY = 'tenant'
export const USER_CONTEXT_KEY = 'user'

/**
 * Middleware to extract and validate tenant context from authentication token
 */
export const tenantContextMiddleware = (prisma: PrismaClient) => {
  return async (c: Context, next: Next) => {
    // Extract tenant information from authentication token/session
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HTTPException(401, {
        message: 'Missing or invalid authorization header'
      })
    }

    try {
      // In a real implementation, this would validate JWT token
      // For now, we'll extract from BetterAuth session or similar
      const token = authHeader.substring(7)
      const authPayload = await extractAuthPayload(token, prisma)

      if (!authPayload.tenantId) {
        throw new HTTPException(401, {
          message: 'Tenant context required'
        })
      }

      // Verify tenant exists and is active
      const tenant = await prisma.tenant.findUnique({
        where: { id: authPayload.tenantId },
        select: { id: true, name: true, slug: true }
      })

      if (!tenant) {
        throw new HTTPException(401, {
          message: 'Invalid tenant'
        })
      }

      const tenantContext: TenantContext = {
        tenantId: tenant.id,
        tenantName: tenant.name,
        isSystemAdmin: authPayload.isSystemAdmin || false,
        userId: authPayload.userId
      }

      // Set tenant context in request
      c.set(TENANT_CONTEXT_KEY, tenantContext)
      c.set(USER_CONTEXT_KEY, authPayload)

      // Configure database session with tenant context for RLS
      await configureDatabaseSession(prisma, tenantContext)

      await next()
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }

      console.error('Tenant context middleware error:', error)
      throw new HTTPException(401, {
        message: 'Authentication failed'
      })
    }
  }
}

/**
 * Configure PostgreSQL session variables for Row-Level Security
 */
async function configureDatabaseSession(
  prisma: PrismaClient,
  tenantContext: TenantContext
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
 * Extract authentication payload from token
 * This should integrate with BetterAuth in the actual implementation
 */
async function extractAuthPayload(token: string, prisma: PrismaClient): Promise<{
  tenantId: string
  userId?: string
  isSystemAdmin?: boolean
}> {
  // TODO: Integrate with BetterAuth for proper JWT validation
  // For now, this is a placeholder that would need to be replaced
  // with actual BetterAuth session validation

  // Example of what the BetterAuth integration might look like:
  // const session = await betterAuth.validateSession(token)
  // if (!session || !session.user) {
  //   throw new Error('Invalid session')
  // }

  // For development/testing purposes, we'll use a mock implementation
  // In production, this should be replaced with proper BetterAuth integration

  if (token === 'mock-super-admin-token') {
    // Mock super admin access - should be removed in production
    return {
      tenantId: '00000000-0000-0000-0000-000000000000',
      userId: 'mock-admin-user-id',
      isSystemAdmin: true
    }
  }

  // For development, create a mock tenant if it doesn't exist
  // This should be replaced with proper authentication
  const mockTenantId = '12345678-1234-1234-1234-123456789012'

  try {
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: mockTenantId }
    })

    if (!existingTenant) {
      // Create a mock tenant for development
      await prisma.tenant.create({
        data: {
          id: mockTenantId,
          name: 'Mock Development Tenant',
          slug: 'mock-tenant'
        }
      })
    }
  } catch (error) {
    console.warn('Could not create mock tenant:', error)
  }

  return {
    tenantId: mockTenantId,
    userId: 'mock-user-id',
    isSystemAdmin: false
  }
}

/**
 * Helper function to get tenant context from request
 */
export function getTenantContext(c: Context): TenantContext {
  const tenantContext = c.get(TENANT_CONTEXT_KEY)
  if (!tenantContext) {
    throw new HTTPException(500, {
      message: 'Tenant context not found'
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
      message: 'User context not found'
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
        const token = authHeader.substring(7)
        const authPayload = await extractAuthPayload(token, prisma)

        if (authPayload.tenantId) {
          const tenant = await prisma.tenant.findUnique({
            where: { id: authPayload.tenantId },
            select: { id: true, name: true }
          })

          if (tenant) {
            const tenantContext: TenantContext = {
              tenantId: tenant.id,
              tenantName: tenant.name,
              isSystemAdmin: authPayload.isSystemAdmin || false,
              userId: authPayload.userId
            }

            c.set(TENANT_CONTEXT_KEY, tenantContext)
            await configureDatabaseSession(prisma, tenantContext)
          }
        }
      } catch (error) {
        // Silently fail for optional context
        console.warn('Optional tenant context failed:', error)
      }
    }

    await next()
  }
}