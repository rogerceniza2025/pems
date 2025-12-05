import { DomainEventBus } from '@pems/infrastructure-events'
import type {
  NavigationRepository,
  NavigationService,
} from '@pems/navigation-management'
import type { Context, Next } from 'hono'

/**
 * Navigation middleware for API routes
 *
 * Provides:
 * - Navigation services injection
 * - Authentication and authorization
 * - Event bus setup
 * - Error handling
 */

export interface NavigationServices {
  navigationService: NavigationService
  navigationRepository: NavigationRepository
  eventBus: DomainEventBus
}

/**
 * Inject navigation services into context
 */
export const injectNavigationServices = async (c: Context, next: Next) => {
  try {
    // Initialize event bus
    const eventBus = new DomainEventBus({
      enableMetrics: true,
      enablePersistence: false,
      maxRetries: 3,
      retryDelay: 1000,
      maxConcurrentHandlers: 10,
      handlerTimeout: 30000,
      enableEventOrdering: false,
      enableDeadLetterQueue: true,
      deadLetterQueueSize: 100,
    })

    // Initialize navigation repository
    const navigationRepository = new NavigationRepository(eventBus, {
      enableCache: true,
      cacheTimeout: 15 * 60 * 1000, // 15 minutes
      enableEventPublishing: true,
      enablePersistence: false,
      batchSize: 100,
      enableMetrics: true,
    })

    // Initialize navigation service
    const navigationService = new NavigationService({
      enableCaching: true,
      enableAnalytics: true,
      enableSecurityAuditing: true,
    })

    // Set up event subscriptions for navigation repository
    eventBus.subscribe('UserPermissionsChanged', async (event) => {
      const { userId, tenantId } = event.data
      await navigationRepository.invalidateUserCache(userId, tenantId)
    })

    eventBus.subscribe('TenantSwitched', async (event) => {
      const { userId, newTenantId } = event.data
      if (newTenantId) {
        await navigationRepository.invalidateUserCache(userId, newTenantId)
      }
    })

    eventBus.subscribe('RoleChanged', async (event) => {
      const { userId, tenantId } = event.data
      await navigationRepository.invalidateUserCache(userId, tenantId)
    })

    // Inject services into context
    c.set('navigationService', navigationService)
    c.set('navigationRepository', navigationRepository)
    c.set('eventBus', eventBus)

    // Store for cleanup
    c.set('navigationServicesCleanup', () => {
      navigationService.destroy()
      navigationRepository.destroy()
      eventBus.destroy()
    })

    await next()
  } catch (error) {
    console.error('Error initializing navigation services:', error)
    return c.json({ error: 'Failed to initialize navigation services' }, 500)
  }
}

/**
 * Cleanup navigation services
 */
export const cleanupNavigationServices = async (c: Context, next: Next) => {
  await next()

  // Cleanup services after response
  const cleanup = c.get('navigationServicesCleanup')
  if (cleanup) {
    try {
      cleanup()
    } catch (error) {
      console.error('Error cleaning up navigation services:', error)
    }
  }
}

/**
 * Enhanced navigation error handler
 */
export const navigationErrorHandler = async (c: Context, next: Next) => {
  try {
    await next()
  } catch (error) {
    console.error('Navigation API error:', error)

    // Handle specific error types
    if (error instanceof Error) {
      switch (error.name) {
        case 'ValidationError':
          return c.json(
            {
              error: 'Validation error',
              message: error.message,
              details: error.stack,
            },
            400,
          )

        case 'PermissionError':
          return c.json(
            {
              error: 'Permission denied',
              message: error.message,
            },
            403,
          )

        case 'NotFoundError':
          return c.json(
            {
              error: 'Resource not found',
              message: error.message,
            },
            404,
          )

        case 'ConflictError':
          return c.json(
            {
              error: 'Resource conflict',
              message: error.message,
            },
            409,
          )

        default:
          return c.json(
            {
              error: 'Internal server error',
              message: 'An unexpected error occurred',
              requestId: c.get('requestId'),
            },
            500,
          )
      }
    } else {
      return c.json(
        {
          error: 'Internal server error',
          message: 'An unexpected error occurred',
          requestId: c.get('requestId'),
        },
        500,
      )
    }
  }
}

/**
 * Request ID middleware for tracking
 */
export const requestId = async (c: Context, next: Next) => {
  const requestId =
    c.req.header('x-request-id') ||
    crypto.randomUUID() ||
    Math.random().toString(36).substr(2, 9)

  c.set('requestId', requestId)
  c.header('x-request-id', requestId)

  await next()
}

/**
 * Rate limiting middleware for navigation endpoints
 */
export const rateLimit = (
  options: {
    requests: number
    window: number // in milliseconds
    identifier?: (c: Context) => string
  } = { requests: 100, window: 60 * 1000 },
) => {
  const store = new Map<string, { count: number; resetTime: number }>()

  return async (c: Context, next: Next) => {
    const identifier =
      options.identifier?.(c) ||
      c.req.header('x-forwarded-for') ||
      c.req.header('x-real-ip') ||
      c.req.ip ||
      'unknown'

    const now = Date.now()
    const windowStart = now - options.window

    let record = store.get(identifier)
    if (!record || record.resetTime <= now) {
      record = { count: 0, resetTime: now + options.window }
      store.set(identifier, record)
    }

    record.count++

    if (record.count > options.requests) {
      return c.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${Math.ceil((record.resetTime - now) / 1000)} seconds.`,
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
        429,
      )
    }

    // Set rate limit headers
    c.header('X-RateLimit-Limit', options.requests.toString())
    c.header(
      'X-RateLimit-Remaining',
      Math.max(0, options.requests - record.count).toString(),
    )
    c.header('X-RateLimit-Reset', new Date(record.resetTime).toISOString())

    await next()
  }
}

/**
 * CORS middleware for navigation API
 */
export const cors = (
  options: {
    origin?: string | string[]
    methods?: string[]
    headers?: string[]
    credentials?: boolean
  } = {},
) => {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials = true,
  } = options

  return async (c: Context, next: Next) => {
    // Handle preflight requests
    if (c.req.method === 'OPTIONS') {
      c.header('Access-Control-Allow-Origin', origin)
      c.header('Access-Control-Allow-Methods', methods.join(', '))
      c.header('Access-Control-Allow-Headers', headers.join(', '))
      c.header('Access-Control-Allow-Credentials', credentials.toString())
      return c.text('', 204)
    }

    await next()

    // Add CORS headers to actual responses
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Access-Control-Allow-Methods', methods.join(', '))
    c.header('Access-Control-Allow-Headers', headers.join(', '))
    c.header('Access-Control-Allow-Credentials', credentials.toString())
  }
}

/**
 * Request logging middleware
 */
export const requestLogger = () => {
  return async (c: Context, next: Next) => {
    const start = Date.now()
    const requestId = c.get('requestId')
    const method = c.req.method
    const path = c.req.path
    const userAgent = c.req.header('user-agent')
    const ip = c.req.ip

    console.log(
      `[${new Date().toISOString()}] ${method} ${path} - Request ${requestId} from ${ip} (${userAgent})`,
    )

    await next()

    const duration = Date.now() - start
    const status = c.res.status

    console.log(
      `[${new Date().toISOString()}] ${method} ${path} - Response ${requestId} - ${status} (${duration}ms)`,
    )

    // Log slow requests
    if (duration > 1000) {
      console.warn(
        `Slow request detected: ${method} ${path} took ${duration}ms`,
      )
    }
  }
}

/**
 * Security headers middleware
 */
export const securityHeaders = async (c: Context, next: Next) => {
  // Security headers
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Content-Security-Policy', "default-src 'self'")

  // Remove server information
  c.header('Server', '')

  await next()
}

/**
 * Navigation API composition
 */
export const navigationMiddleware = [
  requestId,
  requestLogger(),
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:3000'],
    credentials: true,
  }),
  securityHeaders,
  rateLimit({ requests: 200, window: 60 * 1000 }), // 200 requests per minute
  navigationErrorHandler,
  injectNavigationServices,
  cleanupNavigationServices,
]
