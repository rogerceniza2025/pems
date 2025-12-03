/**
 * Request Logging Middleware
 *
 * Comprehensive logging with request correlation IDs
 * Provides structured logging for monitoring and debugging
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Context, Next } from 'hono'
import { nanoid } from 'nanoid'

export interface RequestContext {
  requestId: string
  userId?: string
  tenantId?: string
  method: string
  path: string
  query: Record<string, string>
  headers: Record<string, string>
  userAgent?: string
  ipAddress?: string
  startTime: number
  timestamp: Date
}

export interface ResponseContext {
  statusCode: number
  responseTime: number
  responseSize?: number
  headers: Record<string, string>
}

export interface LogEntry {
  request: RequestContext
  response?: ResponseContext
  error?: Error
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  metadata?: Record<string, any>
}

export interface RequestLoggingOptions {
  /**
   * Log level for successful requests
   * @default 'info'
   */
  successLogLevel?: 'info' | 'warn' | 'error' | 'debug'

  /**
   * Log level for failed requests
   * @default 'error'
   */
  errorLogLevel?: 'info' | 'warn' | 'error' | 'debug'

  /**
   * Whether to log request body
   * @default false (for security)
   */
  logBody?: boolean

  /**
   * Whether to log response body
   * @default false (for security and performance)
   */
  logResponseBody?: boolean

  /**
   * Maximum body size to log (in bytes)
   * @default 1024
   */
  maxBodySize?: number

  /**
   * Whether to log headers
   * @default true
   */
  logHeaders?: boolean

  /**
   * Headers to exclude from logging (for security)
   */
  excludeHeaders?: string[]

  /**
   * Paths to skip logging
   */
  skipPaths?: string[]

  /**
   * Custom request ID generator
   */
  requestIdGenerator?: () => string

  /**
   * Custom log function
   */
  logger?: (entry: LogEntry) => void

  /**
   * Whether to log slow requests
   * @default true
   */
  logSlowRequests?: boolean

  /**
   * Threshold for slow requests (in milliseconds)
   * @default 1000
   */
  slowRequestThreshold?: number

  /**
   * Whether to include request metadata
   * @default true
   */
  includeMetadata?: boolean
}

/**
 * Default excluded headers (sensitive information)
 */
const DEFAULT_EXCLUDE_HEADERS = [
  'authorization',
  'cookie',
  'x-api-key',
  'x-auth-token',
  'x-session-token',
  'password',
  'secret',
  'token',
]

/**
 * Default request ID generator
 */
function defaultRequestIdGenerator(): string {
  return nanoid()
}

/**
 * Default logger function
 */
function defaultLogger(entry: LogEntry): void {
  const logData = {
    requestId: entry.request.requestId,
    method: entry.request.method,
    path: entry.request.path,
    statusCode: entry.response?.statusCode,
    responseTime: entry.response?.responseTime,
    userId: entry.request.userId,
    tenantId: entry.request.tenantId,
    userAgent: entry.request.userAgent,
    ipAddress: entry.request.ipAddress,
    timestamp: entry.request.timestamp.toISOString(),
    level: entry.level,
    message: entry.message,
    ...(entry.metadata && { metadata: entry.metadata }),
    ...(entry.error && {
      error: {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      },
    }),
  }

  switch (entry.level) {
    case 'error':
      // eslint-disable-next-line no-console
      console.error('Request Error:', logData)
      break
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn('Request Warning:', logData)
      break
    case 'debug':
      // eslint-disable-next-line no-console
      console.debug('Request Debug:', logData)
      break
    default:
      // eslint-disable-next-line no-console
      console.info('Request Info:', logData)
  }
}

/**
 * Extract request information
 */
function extractRequestContext(
  c: Context,
  options: RequestLoggingOptions,
): RequestContext {
  const requestId = options.requestIdGenerator
    ? options.requestIdGenerator()
    : defaultRequestIdGenerator()

  const headers: Record<string, string> = {}
  if (options.logHeaders !== false) {
    Object.entries(c.req.header()).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase()
      const shouldExclude = options.excludeHeaders?.some((exclude) =>
        lowerKey.includes(exclude.toLowerCase()),
      )

      if (!shouldExclude && value) {
        headers[key] = value
      }
    })
  }

  // Extract IP address from various headers
  const ipAddress =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-client-ip') ??
    'unknown'

  return {
    requestId,
    userId: c.get('userId') ?? c.get('user')?.id,
    tenantId: c.get('tenant')?.tenantId,
    method: c.req.method,
    path: c.req.path,
    query: Object.fromEntries(
      Object.entries(c.req.queries())
        .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
        .filter(([, value]) => value !== undefined),
    ),
    headers,
    userAgent: c.req.header('User-Agent'),
    ipAddress,
    startTime: Date.now(),
    timestamp: new Date(),
  }
}

/**
 * Extract response information
 */
function extractResponseContext(
  c: Context,
  startTime: number,
): ResponseContext {
  const response = c.res
  const responseTime = Date.now() - startTime

  const headers: Record<string, string> = {}
  if (response.headers) {
    Object.entries(response.headers).forEach(([key, value]) => {
      headers[key] = Array.isArray(value) ? value.join(', ') : String(value)
    })
  }

  return {
    statusCode: response.status || 200,
    responseTime,
    responseSize: headers['content-length']
      ? parseInt(headers['content-length'])
      : undefined,
    headers,
  }
}

/**
 * Determine log level based on status code
 */
function determineLogLevel(
  statusCode: number,
  options: RequestLoggingOptions,
): 'info' | 'warn' | 'error' | 'debug' {
  if (statusCode >= 500) return options.errorLogLevel ?? 'error'
  if (statusCode >= 400) return options.errorLogLevel ?? 'warn'
  return options.successLogLevel ?? 'info'
}

/**
 * Create log entry
 */
function createLogEntry(
  requestContext: RequestContext,
  responseContext: ResponseContext | undefined,
  error: Error | undefined,
  options: RequestLoggingOptions,
): LogEntry {
  const statusCode = responseContext?.statusCode ?? 500
  const level = determineLogLevel(statusCode, options)

  let message = `${requestContext.method} ${requestContext.path}`

  if (responseContext) {
    message += ` ${responseContext.statusCode}`

    // Add slow request warning
    if (
      options.logSlowRequests !== false &&
      responseContext.responseTime > (options.slowRequestThreshold ?? 1000)
    ) {
      message += ` (slow: ${responseContext.responseTime}ms)`
    }
  }

  if (error) {
    message += ` - ${error.message}`
  }

  const metadata =
    options.includeMetadata !== false
      ? {
          query: requestContext.query,
          ...(options.logBody && { body: 'body_logged' }), // Placeholder for actual body
          responseSize: responseContext?.responseSize,
        }
      : undefined

  return {
    request: requestContext,
    response: responseContext,
    error,
    level,
    message,
    metadata,
  }
}

/**
 * Request logging middleware factory
 */
export const requestLoggingMiddleware = (
  options: RequestLoggingOptions = {},
) => {
  const {
    successLogLevel = 'info',
    errorLogLevel = 'error',
    // logBody = false, // Not used in current implementation
    // logResponseBody = false, // Not used in current implementation
    // maxBodySize = 1024, // Not used in current implementation
    logHeaders = true,
    excludeHeaders = DEFAULT_EXCLUDE_HEADERS,
    skipPaths = [],
    requestIdGenerator,
    logger,
    logSlowRequests = true,
    slowRequestThreshold = 1000,
    includeMetadata = true,
  } = options

  return async (c: Context, next: Next) => {
    // Check if current path should be skipped
    const currentPath = c.req.path
    if (skipPaths.some((path) => currentPath.startsWith(path))) {
      await next()
      return
    }

    // Extract request context
    const requestContext = extractRequestContext(c, {
      logHeaders,
      excludeHeaders,
      requestIdGenerator,
    })

    // Set request ID in context for downstream middleware
    c.set('requestId', requestContext.requestId)

    try {
      await next()

      // Extract response context
      const responseContext = extractResponseContext(
        c,
        requestContext.startTime,
      )

      // Create and log entry
      const logEntry = createLogEntry(
        requestContext,
        responseContext,
        undefined,
        {
          successLogLevel,
          errorLogLevel,
          logSlowRequests,
          slowRequestThreshold,
          includeMetadata,
        },
      )

      // Log using custom or default logger
      const logFunction = logger ?? defaultLogger
      logFunction(logEntry)
    } catch (error) {
      // Extract response context for error
      const responseContext = extractResponseContext(
        c,
        requestContext.startTime,
      )

      // Create and log error entry
      const logEntry = createLogEntry(
        requestContext,
        responseContext,
        error as Error,
        {
          successLogLevel,
          errorLogLevel,
          logSlowRequests,
          slowRequestThreshold,
          includeMetadata,
        },
      )

      // Log using custom or default logger
      const logFunction = logger ?? defaultLogger
      logFunction(logEntry)

      // Re-throw the error
      throw error
    }
  }
}

/**
 * Pre-configured logging middleware for different environments
 */

/**
 * Production logging (minimal, structured)
 */
export const productionRequestLogging = () =>
  requestLoggingMiddleware({
    successLogLevel: 'info',
    errorLogLevel: 'error',
    logBody: false,
    logResponseBody: false,
    logHeaders: true,
    excludeHeaders: DEFAULT_EXCLUDE_HEADERS,
    logSlowRequests: true,
    slowRequestThreshold: 1000,
    includeMetadata: false,
  })

/**
 * Development logging (detailed)
 */
export const developmentRequestLogging = () =>
  requestLoggingMiddleware({
    successLogLevel: 'debug',
    errorLogLevel: 'error',
    logBody: true,
    logResponseBody: true,
    logHeaders: true,
    excludeHeaders: [], // Include all headers in development
    logSlowRequests: true,
    slowRequestThreshold: 500, // Lower threshold for development
    includeMetadata: true,
  })

/**
 * API-specific logging
 */
export const apiRequestLogging = () =>
  requestLoggingMiddleware({
    successLogLevel: 'info',
    errorLogLevel: 'error',
    logBody: false, // Don't log API bodies for security
    logResponseBody: false,
    logHeaders: true,
    excludeHeaders: DEFAULT_EXCLUDE_HEADERS,
    skipPaths: ['/health', '/api/health'], // Skip health checks
    logSlowRequests: true,
    slowRequestThreshold: 2000, // Higher threshold for APIs
    includeMetadata: true,
  })

/**
 * Helper function to get request ID from context
 */
export function getRequestId(c: Context): string {
  const requestId = c.get('requestId')
  if (!requestId) {
    throw new Error(
      'Request ID not found - ensure requestLoggingMiddleware is applied',
    )
  }
  return requestId
}

/**
 * Helper function to create custom logger
 */
export function createCustomLogger(
  formatter: (entry: LogEntry) => string,
  writer: (message: string, level: string) => void,
) {
  return (entry: LogEntry) => {
    const message = formatter(entry)
    writer(message, entry.level)
  }
}

/**
 * Helper function to create JSON logger
 */
export function createJsonLogger(writer: (json: string) => void) {
  return createCustomLogger(
    (entry) => JSON.stringify(entry),
    (message) => writer(message),
  )
}
