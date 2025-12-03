/**
 * Rate Limiting Middleware
 *
 * Redis-based rate limiting for API protection
 * Supports IP-based and user-based limiting with configurable limits
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Context, Next } from 'hono'

// Redis client (will be initialized lazily)
let redisClient: any = null

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  max: number // Max requests per window
  message?: string // Custom error message
  keyGenerator?: (c: Context) => string // Custom key generation
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export interface RateLimitInfo {
  remaining: number
  reset: Date
  total: number
}

export interface RateLimitResult {
  success: boolean
  limit?: RateLimitInfo
  error?: {
    message: string
    code: string
    retryAfter?: number
  }
}

// Default configurations for different route types
export const DEFAULT_RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 requests per 15 minutes
  general: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
  upload: { windowMs: 60 * 1000, max: 10 }, // 10 requests per minute
  sensitive: { windowMs: 15 * 60 * 1000, max: 3 }, // 3 requests per 15 minutes
} as const

/**
 * Get Redis client (lazy initialization)
 */
function getRedisClient() {
  if (!redisClient) {
    try {
      // Dynamic import to avoid requiring Redis when not needed
      const Redis = require('ioredis')
      redisClient = new Redis(
        process.env.REDIS_URL ?? 'redis://localhost:6379',
        {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        },
      )
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to initialize Redis client:', error)
      redisClient = null
    }
  }
  return redisClient
}

/**
 * Generate rate limit key for request
 */
function generateRateLimitKey(c: Context, config: RateLimitConfig): string {
  if (config.keyGenerator) {
    return config.keyGenerator(c)
  }

  // Try to get user ID from auth context
  const authContext = c.get('auth')
  if (authContext?.isAuthenticated && authContext.user) {
    return `rate-limit:user:${authContext.user.id}`
  }

  // Fall back to IP-based limiting
  const clientIP =
    c.req.header('x-forwarded-for') ??
    c.req.header('x-real-ip') ??
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-client-ip') ??
    c.req.header('x-forwarded') ??
    c.req.header('forwarded') ??
    '127.0.0.1'

  return `rate-limit:ip:${clientIP}`
}

/**
 * Check if request should be rate limited
 */
function shouldSkipRateLimit(c: Context, _config: RateLimitConfig): boolean {
  // Skip health checks and static assets
  const staticAssetPatterns = [
    '/health',
    '/api/health',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
  ]

  return staticAssetPatterns.some((pattern) => c.req.path.startsWith(pattern))
}

/**
 * Get current request count for key
 */
async function getCurrentRequestCount(
  redis: any,
  key: string,
  windowMs: number,
): Promise<{ count: number; ttl: number }> {
  try {
    const current = await redis.get(key)
    const count = current ? parseInt(current) : 0

    // Get TTL to know when window resets
    const ttl = await redis.ttl(key)

    return { count, ttl: ttl ?? windowMs }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting current request count:', error)
    return { count: 0, ttl: windowMs }
  }
}

/**
 * Rate limiting middleware factory
 */
export const rateLimitMiddleware = (config: RateLimitConfig) => {
  const {
    windowMs = DEFAULT_RATE_LIMITS.general.windowMs,
    max = DEFAULT_RATE_LIMITS.general.max,
    message = `Too many requests. Try again later.`,
    // keyGenerator, // Not used in current implementation
    // skipSuccessfulRequests, // Not used in current implementation
    // skipFailedRequests // Not used in current implementation
  } = config
  void message // Mark as used

  return async (c: Context, next: Next): Promise<Response | void> => {
    // Skip rate limiting for certain requests
    if (shouldSkipRateLimit(c, config)) {
      await next()
      return
    }

    const redis = getRedisClient()
    if (!redis) {
      // Redis not available, skip rate limiting
      // eslint-disable-next-line no-console
      console.warn('Redis not available, skipping rate limiting')
      await next()
      return
    }

    try {
      const key = generateRateLimitKey(c, config)
      const { count, ttl } = await getCurrentRequestCount(redis, key, windowMs)

      const remaining = Math.max(0, max - count)
      const reset = new Date(Date.now() + ttl * 1000)

      // Set rate limit headers
      c.header('X-RateLimit-Limit', max.toString())
      c.header('X-RateLimit-Remaining', remaining.toString())
      c.header(
        'X-RateLimit-Reset',
        Math.ceil(reset.getTime() / 1000).toString(),
      )

      if (count >= max) {
        const errorResult: RateLimitResult = {
          success: false,
          error: {
            message: config.message ?? 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: ttl,
          },
          limit: {
            remaining: 0,
            reset,
            total: max,
          },
        }

        c.header('Retry-After', ttl.toString())
        return c.json(errorResult, 429)
      }

      // Request allowed, continue
      const limitInfo: RateLimitInfo = {
        remaining,
        reset,
        total: max,
      }

      c.set('rateLimit', limitInfo)
      await next()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Rate limiting middleware error:', error)

      const errorResult: RateLimitResult = {
        success: false,
        error: {
          message: 'Rate limiting service unavailable',
          code: 'RATE_LIMIT_ERROR',
        },
      }

      return c.json(errorResult, 500)
    }
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const createAuthRateLimiter = () =>
  rateLimitMiddleware(DEFAULT_RATE_LIMITS.auth)
export const createGeneralRateLimiter = () =>
  rateLimitMiddleware(DEFAULT_RATE_LIMITS.general)
export const createUploadRateLimiter = () =>
  rateLimitMiddleware(DEFAULT_RATE_LIMITS.upload)
export const createSensitiveRateLimiter = () =>
  rateLimitMiddleware(DEFAULT_RATE_LIMITS.sensitive)

/**
 * Custom rate limiter with specific configuration
 */
export const createCustomRateLimiter = (config: Partial<RateLimitConfig>) => {
  return rateLimitMiddleware({
    ...DEFAULT_RATE_LIMITS.general,
    ...config,
  })
}

/**
 * Helper function to get rate limit info from context
 */
export function getRateLimitInfo(c: Context): RateLimitInfo | null {
  return c.get('rateLimit') ?? null
}

/**
 * Helper function to check if request is rate limited
 */
export function isRateLimited(c: Context): boolean {
  const info = getRateLimitInfo(c)
  return info ? info.remaining <= 0 : false
}

/**
 * Close Redis connections (for graceful shutdown)
 */
export async function closeRateLimitConnections(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit()
      redisClient = null
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error closing Redis connections:', error)
    }
  }
}
