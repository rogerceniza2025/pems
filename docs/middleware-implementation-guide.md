# Middleware Implementation Guide

## Overview

This document provides detailed implementation guidance for authentication middleware in the PEMS API using Hono framework.

## 1. Authentication Middleware

### File: `apps/api/src/middleware/auth-middleware.ts`

```typescript
import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { IAuthService } from '@pems/user-management'

export interface AuthContext {
  user: {
    id: string
    email: string
    tenantId: string
    isActive: boolean
    isSystemAdmin: boolean
  }
  tenantId: string
  permissions: string[]
}

export const authMiddleware = (authService: IAuthService) => {
  return async (c: Context, next: Next) => {
    // Skip auth for health check and public routes
    if (c.req.path === '/health' || c.req.path === '/') {
      await next()
      return
    }

    // Extract session token from cookie or authorization header
    const sessionToken = getSessionToken(c)

    if (!sessionToken) {
      throw new HTTPException(401, {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
    }

    // Validate session
    const validation = await authService.validateSession(sessionToken)
    if (!validation.valid) {
      throw new HTTPException(401, {
        message: 'Invalid or expired session',
        code: 'INVALID_SESSION',
      })
    }

    // Get user details
    const user = await authService.getUser(validation.userId!)
    if (!user.isActive) {
      throw new HTTPException(401, {
        message: 'User account is inactive',
        code: 'ACCOUNT_INACTIVE',
      })
    }

    // Set auth context
    const authContext: AuthContext = {
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        isActive: user.isActive,
        isSystemAdmin: user.isSystemAdmin,
      },
      tenantId: user.tenantId,
      permissions: [], // Will be populated by RBAC middleware
    }

    c.set('auth', authContext)
    c.set('tenantId', user.tenantId)

    await next()
  }
}

function getSessionToken(c: Context): string | null {
  // Try Authorization header first
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Try cookie
  const cookieHeader = c.req.header('Cookie')
  if (cookieHeader) {
    const sessionMatch = cookieHeader.match(/session=([^;]+)/)
    if (sessionMatch) {
      return sessionMatch[1]
    }
  }

  return null
}
```

## 2. Permission Middleware

### File: `apps/api/src/middleware/permission-middleware.ts`

```typescript
import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { hasPermission } from '@pems/auth'
import type { Permission } from '@pems/auth'

export const requirePermission = (permission: Permission) => {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as any

    if (!auth) {
      throw new HTTPException(401, {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
    }

    // Check if user has the required permission
    const hasRequiredPermission = hasPermission(
      {
        id: auth.user.id,
        roles: auth.user.roles || [],
      },
      permission,
      auth.tenantId,
    )

    if (!hasRequiredPermission) {
      throw new HTTPException(403, {
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permission,
      })
    }

    await next()
  }
}

export const requireAnyPermission = (permissions: Permission[]) => {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as any

    if (!auth) {
      throw new HTTPException(401, {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
    }

    // Check if user has any of the required permissions
    const hasAnyPermission = permissions.some((permission) =>
      hasPermission(
        {
          id: auth.user.id,
          roles: auth.user.roles || [],
        },
        permission,
        auth.tenantId,
      ),
    )

    if (!hasAnyPermission) {
      throw new HTTPException(403, {
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions,
      })
    }

    await next()
  }
}

export const requireRole = (role: string) => {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as any

    if (!auth) {
      throw new HTTPException(401, {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
    }

    // Check if user has the required role
    const hasRequiredRole = auth.user.roles?.some(
      (userRole: any) => userRole.role.name === role,
    )

    if (!hasRequiredRole) {
      throw new HTTPException(403, {
        message: 'Insufficient role',
        code: 'INSUFFICIENT_ROLE',
        required: role,
      })
    }

    await next()
  }
}
```

## 3. Rate Limiting Middleware

### File: `apps/api/src/middleware/rate-limit-middleware.ts`

```typescript
import { Context, Next } from 'hono'
import Redis from 'ioredis'

export interface RateLimitOptions {
  windowMs: number
  maxRequests: number
  keyGenerator?: (c: Context) => string
  errorMessage?: string
}

export const rateLimitMiddleware = (
  redis: Redis,
  options: RateLimitOptions,
) => {
  return async (c: Context, next: Next) => {
    const key = options.keyGenerator?.(c) || generateDefaultKey(c)
    const current = await redis.incr(key)

    if (current === 1) {
      await redis.expire(key, Math.ceil(options.windowMs / 1000))
    }

    if (current > options.maxRequests) {
      const resetTime = await redis.ttl(key)

      return c.json(
        {
          success: false,
          error: options.errorMessage || 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime,
          limit: options.maxRequests,
          windowMs: options.windowMs,
        },
        429,
      )
    }

    // Add rate limit headers
    c.res.headers.set('X-RateLimit-Limit', options.maxRequests.toString())
    c.res.headers.set(
      'X-RateLimit-Remaining',
      Math.max(0, options.maxRequests - current).toString(),
    )
    c.res.headers.set(
      'X-RateLimit-Reset',
      new Date(Date.now() + options.windowMs).toISOString(),
    )

    await next()
  }
}

function generateDefaultKey(c: Context): string {
  const ip =
    c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'

  const userAgent = c.req.header('user-agent') || 'unknown'
  const path = c.req.path

  return `rate-limit:${ip}:${path}:${userAgent}`
}

// Specialized rate limiters for different endpoints
export const createAuthRateLimiter = (redis: Redis) =>
  rateLimitMiddleware(redis, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 requests per 15 minutes
    keyGenerator: (c) => {
      const ip = c.req.header('x-forwarded-for') || 'unknown'
      const email = c.req.header('x-email') || 'anonymous'
      return `auth-rate-limit:${ip}:${email}`
    },
    errorMessage: 'Too many authentication attempts. Please try again later.',
  })

export const createPasswordResetRateLimiter = (redis: Redis) =>
  rateLimitMiddleware(redis, {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 requests per hour
    keyGenerator: (c) => {
      const ip = c.req.header('x-forwarded-for') || 'unknown'
      const email = c.req.header('x-email') || 'anonymous'
      return `password-reset-rate-limit:${ip}:${email}`
    },
    errorMessage: 'Too many password reset attempts. Please try again later.',
  })

export const createMfaRateLimiter = (redis: Redis) =>
  rateLimitMiddleware(redis, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 MFA attempts per 15 minutes
    keyGenerator: (c) => {
      const ip = c.req.header('x-forwarded-for') || 'unknown'
      const userId = c.get('auth')?.user?.id || 'anonymous'
      return `mfa-rate-limit:${ip}:${userId}`
    },
    errorMessage: 'Too many MFA attempts. Please try again later.',
  })
```

## 4. Tenant Context Middleware

### File: `apps/api/src/middleware/tenant-context-middleware.ts`

```typescript
import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { PrismaClient } from '@pems/database'

export const tenantContextMiddleware = (prisma: PrismaClient) => {
  return async (c: Context, next: Next) => {
    // Skip tenant context for health check and public routes
    if (c.req.path === '/health' || c.req.path === '/') {
      await next()
      return
    }

    // Extract tenant ID from various sources
    let tenantId: string | null = null

    // 1. From Authorization header (JWT claim)
    const authHeader = c.req.header('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      // This would be decoded from JWT in a real implementation
      // For now, we'll extract it from other sources
    }

    // 2. From X-Tenant-ID header
    const tenantHeader = c.req.header('X-Tenant-ID')
    if (tenantHeader) {
      tenantId = tenantHeader
    }

    // 3. From subdomain (e.g., tenant1.pems.com)
    const host = c.req.header('host')
    if (host && host.includes('.')) {
      const subdomain = host.split('.')[0]
      if (subdomain !== 'www' && subdomain !== 'api') {
        // Look up tenant by subdomain
        const tenant = await prisma.tenant.findUnique({
          where: { slug: subdomain },
          select: { id: true },
        })

        if (tenant) {
          tenantId = tenant.id
        }
      }
    }

    // 4. From request body (for registration/login)
    if (!tenantId && c.req.method === 'POST') {
      try {
        const body = await c.req.json()
        if (body.tenantId) {
          tenantId = body.tenantId
        }
      } catch {
        // Body parsing failed, continue
      }
    }

    if (!tenantId) {
      throw new HTTPException(400, {
        message: 'Tenant ID is required',
        code: 'TENANT_REQUIRED',
      })
    }

    // Validate tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    })

    if (!tenant) {
      throw new HTTPException(404, {
        message: 'Tenant not found',
        code: 'TENANT_NOT_FOUND',
      })
    }

    // Set tenant context
    c.set('tenantId', tenantId)
    c.set('tenant', tenant)

    // Set Row Level Security policy in PostgreSQL
    await prisma.$executeRaw`SET app.current_tenant_id = ${tenantId}`

    await next()
  }
}
```

## 5. Validation Middleware

### File: `apps/api/src/middleware/validation-middleware.ts`

```typescript
import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodSchema } from 'zod'

export interface ValidationOptions {
  target: 'json' | 'query' | 'param' | 'header'
  schema: ZodSchema
  errorMessage?: string
}

export const validateMiddleware = (options: ValidationOptions) => {
  return async (c: Context, next: Next) => {
    try {
      let data: any

      switch (options.target) {
        case 'json':
          data = await c.req.json()
          break
        case 'query':
          data = c.req.query()
          break
        case 'param':
          data = c.req.param()
          break
        case 'header':
          data = c.req.header()
          break
        default:
          throw new Error('Invalid validation target')
      }

      const result = options.schema.safeParse(data)

      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }))

        return c.json(
          {
            success: false,
            error: options.errorMessage || 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors,
          },
          400,
        )
      }

      // Set validated data in context
      c.set('validated', result.data)

      await next()
    } catch (error) {
      if (error instanceof SyntaxError) {
        return c.json(
          {
            success: false,
            error: 'Invalid JSON format',
            code: 'INVALID_JSON',
          },
          400,
        )
      }

      throw error
    }
  }
}

// Helper to validate specific fields
export const validateField = (fieldName: string, schema: ZodSchema) => {
  return validateMiddleware({
    target: 'json',
    schema: schema,
    errorMessage: `Invalid ${fieldName}`,
  })
}
```

## 6. Error Handling Middleware

### File: `apps/api/src/middleware/error-middleware.ts`

```typescript
import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

export interface ErrorResponse {
  success: false
  error: string
  code: string
  details?: any
  timestamp: string
  path?: string
  requestId?: string
}

export const errorHandler = (err: Error, c: Context) => {
  const requestId = c.get('requestId') || generateRequestId()

  // Log error
  console.error(`[${requestId}] Error:`, {
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('x-forwarded-for'),
    userId: c.get('auth')?.user?.id,
    tenantId: c.get('tenantId'),
  })

  let response: ErrorResponse

  if (err instanceof HTTPException) {
    response = {
      success: false,
      error: err.message,
      code: (err as any).code || 'HTTP_ERROR',
      details: (err as any).details,
      timestamp: new Date().toISOString(),
      path: c.req.path,
      requestId,
    }

    return c.json(response, err.status)
  }

  // Handle domain-specific errors
  if (err.name?.endsWith('Error')) {
    const errorCode = err.name.toUpperCase().replace('ERROR', '_ERROR')

    response = {
      success: false,
      error: err.message,
      code: errorCode,
      timestamp: new Date().toISOString(),
      path: c.req.path,
      requestId,
    }

    const statusCode = getStatusCodeFromError(err.name)
    return c.json(response, statusCode)
  }

  // Default error response
  response = {
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    path: c.req.path,
    requestId,
  }

  return c.json(response, 500)
}

function getStatusCodeFromError(errorName: string): number {
  const errorMap: Record<string, number> = {
    UserNotFoundError: 404,
    UserEmailAlreadyExistsError: 409,
    InvalidCredentialsError: 401,
    UserInactiveError: 403,
    MfaRequiredError: 428,
    InvalidMfaTokenError: 401,
    MfaAlreadyEnabledError: 409,
    MfaNotEnabledError: 400,
    InvalidPasswordResetTokenError: 401,
    InvalidEmailError: 400,
    InvalidPasswordError: 400,
  }

  return errorMap[errorName] || 500
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15)
}
```

## 7. Request ID Middleware

### File: `apps/api/src/middleware/request-id-middleware.ts`

```typescript
import { Context, Next } from 'hono'

export const requestIdMiddleware = async (c: Context, next: Next) => {
  const requestId = c.req.header('X-Request-ID') || generateRequestId()

  c.set('requestId', requestId)
  c.res.headers.set('X-Request-ID', requestId)

  await next()
}

function generateRequestId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}
```

## 8. CORS Middleware Configuration

### File: `apps/api/src/middleware/cors-middleware.ts`

```typescript
import { cors } from 'hono/cors'

export const corsMiddleware = cors({
  origin: (origin, c) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://pems.com',
      'https://admin.pems.com',
      // Add production domains here
    ]

    // Allow origin if it's in the allowed list or if it's a subdomain
    if (
      allowedOrigins.includes(origin) ||
      (origin && origin.endsWith('.pems.com'))
    ) {
      return origin
    }

    return allowedOrigins[0] // Default to first allowed origin
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Tenant-ID',
    'X-Request-ID',
    'X-Email',
  ],
  exposeHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
})
```

## 9. Security Headers Middleware

### File: `apps/api/src/middleware/security-middleware.ts`

```typescript
import { Context, Next } from 'hono'

export const securityHeadersMiddleware = async (c: Context, next: Next) => {
  await next()

  // Set security headers
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'DENY')
  c.res.headers.set('X-XSS-Protection', '1; mode=block')
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.res.headers.set('Permissions-Policy', "default-src 'self'")
  c.res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
  )

  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    c.res.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    )
  }
}
```

## 10. Logging Middleware

### File: `apps/api/src/middleware/logging-middleware.ts`

```typescript
import { Context, Next } from 'hono'

export const loggingMiddleware = async (c: Context, next: Next) => {
  const start = Date.now()
  const requestId = c.get('requestId')

  // Log request
  console.log(`[${requestId}] ${c.req.method} ${c.req.path}`, {
    method: c.req.method,
    path: c.req.path,
    query: c.req.query(),
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('x-forwarded-for'),
    tenantId: c.get('tenantId'),
    userId: c.get('auth')?.user?.id,
    contentType: c.req.header('content-type'),
    contentLength: c.req.header('content-length'),
  })

  await next()

  // Log response
  const duration = Date.now() - start
  const statusCode = c.res.status

  console.log(
    `[${requestId}] ${c.req.method} ${c.req.path} ${statusCode} (${duration}ms)`,
    {
      method: c.req.method,
      path: c.req.path,
      statusCode,
      duration,
      responseSize: c.res.headers.get('content-length'),
      requestId,
    },
  )
}
```

## 11. Middleware Index

### File: `apps/api/src/middleware/index.ts`

```typescript
export * from './auth-middleware'
export * from './permission-middleware'
export * from './rate-limit-middleware'
export * from './tenant-context-middleware'
export * from './validation-middleware'
export * from './error-middleware'
export * from './request-id-middleware'
export * from './cors-middleware'
export * from './security-middleware'
export * from './logging-middleware'
```

## 12. Usage in Server

### File: `apps/api/src/server.ts` (Updated middleware section)

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import Redis from 'ioredis'
import {
  requestIdMiddleware,
  loggingMiddleware,
  corsMiddleware,
  securityHeadersMiddleware,
  errorHandler,
  tenantContextMiddleware,
  authMiddleware,
  permissionMiddleware,
  rateLimitMiddleware,
  createAuthRateLimiter,
  createPasswordResetRateLimiter,
  createMfaRateLimiter,
} from './middleware'

// Initialize Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

const app = new Hono()

// Global middleware (order matters)
app.use('*', requestIdMiddleware)
app.use('*', loggingMiddleware)
app.use('*', corsMiddleware)
app.use('*', securityHeadersMiddleware)

// Tenant context for API routes
app.use('/api/*', tenantContextMiddleware(prisma))

// Error handler (should be last)
app.onError(errorHandler)

// Apply specialized rate limiters to specific routes
app.use('/api/auth/*', createAuthRateLimiter(redis))
app.use('/api/auth/password/*', createPasswordResetRateLimiter(redis))
app.use('/api/auth/mfa/*', createMfaRateLimiter(redis))

// Apply authentication to protected routes
app.use('/api/users/*', authMiddleware(authService))
app.use('/api/admin/*', authMiddleware(authService))

// Apply permission middleware to specific routes
app.use('/api/users', permissionMiddleware('users:read'))
app.use('/api/admin', requireRole('admin'))

// ... rest of the server setup
```

## 13. Testing Strategy

1. **Unit Tests**: Test each middleware in isolation
2. **Integration Tests**: Test middleware chains
3. **Security Tests**: Test security headers, rate limiting, etc.
4. **Performance Tests**: Test middleware overhead

## 14. Best Practices

1. **Order Matters**: Middleware order is crucial for proper functionality
2. **Error Handling**: Always handle errors gracefully
3. **Security**: Never expose sensitive information in error messages
4. **Logging**: Log enough information for debugging but not PII
5. **Rate Limiting**: Protect sensitive endpoints with stricter limits
6. **CORS**: Configure properly for your domains

## 15. Environment Variables

```env
# Redis for rate limiting
REDIS_URL=redis://localhost:6379

# Security
NODE_ENV=production
ALLOWED_ORIGINS=https://pems.com,https://admin.pems.com

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Next Steps

1. Implement all middleware following patterns above
2. Add comprehensive error handling
3. Write tests for all middleware implementations
4. Configure proper environment variables
5. Set up monitoring and alerting
6. Document middleware behavior and configuration
