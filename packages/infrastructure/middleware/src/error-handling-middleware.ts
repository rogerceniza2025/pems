/**
 * Error Handling Middleware
 *
 * Structured error responses and comprehensive logging
 * Provides consistent error format across the API
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Context, Next } from 'hono'
import { ZodError } from 'zod'

// Custom HTTPException implementation since hono/http-exceptions is not available
class HTTPException extends Error {
  constructor(
    public status: number,
    public options: { message: string; code?: string; cause?: any },
  ) {
    super(options.message)
    this.name = 'HTTPException'
    this.cause = options.cause
  }
}

export interface ErrorContext {
  requestId?: string
  userId?: string
  tenantId?: string
  path?: string
  method?: string
  userAgent?: string
  ipAddress?: string
  timestamp: Date
}

export interface ErrorResponse {
  success: false
  message: string
  code?: string
  details?: any
  requestId?: string
  timestamp: string
  path?: string
}

export interface ErrorHandlingOptions {
  /**
   * Whether to include detailed error information
   * @default false in production, true in development
   */
  detailedErrors?: boolean

  /**
   * Whether to log errors
   * @default true
   */
  logErrors?: boolean

  /**
   * Custom error formatter function
   */
  errorFormatter?: (error: Error, context: ErrorContext) => ErrorResponse

  /**
   * Custom error logger function
   */
  errorLogger?: (
    error: Error,
    context: ErrorContext,
    response: ErrorResponse,
  ) => void

  /**
   * Skip error handling for specific paths
   */
  skipPaths?: string[]

  /**
   * Map specific error types to HTTP status codes
   */
  statusCodeMap?: Record<string, number>
}

/**
 * Default status code mappings
 */
const DEFAULT_STATUS_CODE_MAP: Record<string, number> = {
  VALIDATION_ERROR: 400,
  AUTH_FAILED: 401,
  NO_SESSION_TOKEN: 401,
  INVALID_SESSION: 401,
  SESSION_EXPIRED: 401,
  USER_NOT_AUTHENTICATED: 401,
  INSUFFICIENT_PERMISSIONS: 403,
  INSUFFICIENT_ROLES: 403,
  SYSTEM_ADMIN_REQUIRED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
}

/**
 * Default error formatter
 */
function defaultErrorFormatter(
  error: Error,
  context: ErrorContext,
  detailed: boolean = false,
): ErrorResponse {
  const baseResponse: ErrorResponse = {
    success: false,
    message: error.message || 'An unexpected error occurred',
    timestamp: context.timestamp.toISOString(),
    requestId: context.requestId,
    path: context.path,
  }

  // Handle HTTPException
  if (error instanceof HTTPException) {
    const statusCode = (error as any).status
    const errorCode = (error.cause as any)?.code ?? 'HTTP_ERROR'
    void statusCode // Mark as used

    return {
      ...baseResponse,
      message: error.message,
      code: errorCode,
      ...(detailed && { details: error.cause }),
    }
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return {
      ...baseResponse,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      ...(detailed && {
        details: error.issues.reduce(
          (acc: Record<string, string>, err: any) => {
            const path = err.path.join('.')
            acc[path] = err.message
            return acc
          },
          {} as Record<string, string>,
        ),
      }),
    }
  }

  // Handle database errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any

    switch (prismaError.code) {
      case 'P2002':
        return {
          ...baseResponse,
          message: 'Resource already exists',
          code: 'CONFLICT',
          ...(detailed && { details: { field: prismaError.meta?.target } }),
        }
      case 'P2025':
        return {
          ...baseResponse,
          message: 'Resource not found',
          code: 'NOT_FOUND',
        }
      default:
        return {
          ...baseResponse,
          message: 'Database operation failed',
          code: 'DATABASE_ERROR',
          ...(detailed && { details: { code: prismaError.code } }),
        }
    }
  }

  // Handle network/Redis errors
  if (error.name === 'ReplyError' || error.message.includes('Redis')) {
    return {
      ...baseResponse,
      message: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
    }
  }

  // Generic error
  return {
    ...baseResponse,
    code: 'INTERNAL_ERROR',
    ...(detailed && {
      details: {
        name: error.name,
        stack: error.stack,
      },
    }),
  }
}

/**
 * Default error logger
 */
function defaultErrorLogger(
  error: Error,
  context: ErrorContext,
  response: ErrorResponse,
): void {
  const logLevel = getLogLevel(error)
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof ZodError && { validationErrors: error.issues }),
    },
    context,
    response: {
      message: response.message,
      code: response.code,
      details: response.details,
    },
  }

  switch (logLevel) {
    case 'error':
      // eslint-disable-next-line no-console
      console.error('API Error:', logData)
      break
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn('API Warning:', logData)
      break
    case 'info':
      // eslint-disable-next-line no-console
      console.info('API Info:', logData)
      break
    default:
      // eslint-disable-next-line no-console
      console.log('API Log:', logData)
  }
}

/**
 * Get appropriate log level for error
 */
function getLogLevel(error: Error): 'error' | 'warn' | 'info' {
  if (error instanceof HTTPException) {
    const statusCode = (error as any).status
    if (statusCode >= 500) return 'error'
    if (statusCode >= 400) return 'warn'
    return 'info'
  }

  if (error instanceof ZodError) return 'warn'

  return 'error'
}

/**
 * Extract error context from request
 */
function extractErrorContext(c: Context): ErrorContext {
  return {
    requestId: c.get('requestId'),
    userId: c.get('userId') ?? c.get('user')?.id,
    tenantId: c.get('tenant')?.tenantId,
    path: c.req.path,
    method: c.req.method,
    userAgent: c.req.header('User-Agent'),
    ipAddress:
      c.req.header('x-forwarded-for') ??
      c.req.header('x-real-ip') ??
      c.req.header('cf-connecting-ip') ??
      'unknown',
    timestamp: new Date(),
  }
}

/**
 * Get HTTP status code for error
 */
function getStatusCode(
  error: Error,
  statusCodeMap: Record<string, number>,
): number {
  if (error instanceof HTTPException) {
    return (error as any).status
  }

  if (error instanceof ZodError) {
    return 400
  }

  // Try to get status code from error message or name
  const errorCode = (error as any).code ?? error.name
  return statusCodeMap[errorCode] ?? 500
}

/**
 * Error handling middleware factory
 */
export const errorHandlingMiddleware = (options: ErrorHandlingOptions = {}) => {
  const {
    detailedErrors = process.env.NODE_ENV === 'development',
    logErrors = true,
    errorFormatter,
    errorLogger,
    skipPaths = [],
    statusCodeMap = DEFAULT_STATUS_CODE_MAP,
  } = options

  return async (c: Context, next: Next): Promise<Response | void> => {
    try {
      await next()
    } catch (error) {
      // Check if current path should be skipped
      const currentPath = c.req.path
      if (skipPaths.some((path) => currentPath.startsWith(path))) {
        throw error
      }

      const errorContext = extractErrorContext(c)
      const formatter =
        errorFormatter ??
        ((err, ctx) => defaultErrorFormatter(err, ctx, detailedErrors))

      const errorResponse = formatter(error as Error, errorContext)
      const statusCode = getStatusCode(error as Error, statusCodeMap)

      // Log error if enabled
      if (logErrors) {
        const logger = errorLogger ?? defaultErrorLogger
        logger(error as Error, errorContext, errorResponse)
      }

      // Set error headers
      c.header('X-Error-Code', errorResponse.code ?? 'UNKNOWN')
      if (errorResponse.requestId) {
        c.header('X-Request-ID', errorResponse.requestId)
      }

      return c.json(errorResponse, statusCode as any)
    }
  }
}

/**
 * Pre-configured error handling middleware for different environments
 */

/**
 * Production error handling (minimal details)
 */
export const productionErrorHandling = () =>
  errorHandlingMiddleware({
    detailedErrors: false,
    logErrors: true,
  })

/**
 * Development error handling (full details)
 */
export const developmentErrorHandling = () =>
  errorHandlingMiddleware({
    detailedErrors: true,
    logErrors: true,
  })

/**
 * API-specific error handling
 */
export const apiErrorHandling = () =>
  errorHandlingMiddleware({
    detailedErrors: process.env.NODE_ENV === 'development',
    logErrors: true,
    statusCodeMap: {
      ...DEFAULT_STATUS_CODE_MAP,
      VALIDATION_ERROR: 422,
      AUTH_SERVICE_ERROR: 503,
      AUTHORIZATION_ERROR: 503,
      RATE_LIMIT_ERROR: 503,
      SECURITY_HEADERS_ERROR: 500,
    },
  })

/**
 * Helper function to create custom error with context
 */
export function createError(
  message: string,
  code: string = 'CUSTOM_ERROR',
  statusCode: number = 500,
  details?: any,
): HTTPException {
  const error = new HTTPException(statusCode, {
    message,
    code,
  })

  if (details) {
    error.cause = { ...details, code }
  }

  return error
}

/**
 * Helper function to create validation error
 */
export function createValidationError(
  message: string = 'Validation failed',
  details?: any,
): HTTPException {
  return createError(message, 'VALIDATION_ERROR', 400, details)
}

/**
 * Helper function to create authentication error
 */
export function createAuthError(
  message: string = 'Authentication required',
  details?: any,
): HTTPException {
  return createError(message, 'AUTH_FAILED', 401, details)
}

/**
 * Helper function to create authorization error
 */
export function createAuthzError(
  message: string = 'Insufficient permissions',
  details?: any,
): HTTPException {
  return createError(message, 'INSUFFICIENT_PERMISSIONS', 403, details)
}

/**
 * Helper function to create not found error
 */
export function createNotFoundError(
  message: string = 'Resource not found',
  details?: any,
): HTTPException {
  return createError(message, 'NOT_FOUND', 404, details)
}

/**
 * Helper function to create conflict error
 */
export function createConflictError(
  message: string = 'Resource already exists',
  details?: any,
): HTTPException {
  return createError(message, 'CONFLICT', 409, details)
}
