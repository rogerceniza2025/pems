/**
 * Request Validation Middleware
 *
 * Zod-based automatic request/response validation
 * Integrates with Hono's zValidator and provides enhanced error handling
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { zValidator } from '@hono/zod-validator'
import type { Context, Next } from 'hono'
import { z } from 'zod'

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

export interface ValidationSchema {
  body?: z.ZodSchema
  query?: z.ZodSchema
  params?: z.ZodSchema
  headers?: z.ZodSchema
  response?: z.ZodSchema
}

export interface ValidationOptions {
  /**
   * Custom error message for validation failures
   */
  errorMessage?: string

  /**
   * Whether to include detailed error information
   * @default false in production, true in development
   */
  detailedErrors?: boolean

  /**
   * Custom error formatter function
   */
  errorFormatter?: (errors: z.ZodIssue[]) => any

  /**
   * Skip validation for specific paths
   */
  skipPaths?: string[]

  /**
   * Strip unknown fields from input
   * @default true
   */
  stripUnknown?: boolean

  /**
   * Strict mode - fail on unknown fields
   * @default false
   */
  strict?: boolean
}

/**
 * Default error formatter
 */
function defaultErrorFormatter(
  errors: z.ZodIssue[],
  detailed: boolean = false,
) {
  if (!detailed) {
    return {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
    }
  }

  const formattedErrors = errors.reduce(
    (acc, error) => {
      const path = error.path.join('.')
      acc[path] = error.message
      return acc
    },
    {} as Record<string, string>,
  )

  return {
    message: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: formattedErrors,
  }
}

/**
 * Create validation middleware using Hono's zValidator with enhanced error handling
 */
export const validationMiddleware = (
  schema: ValidationSchema,
  options: ValidationOptions = {},
) => {
  const {
    detailedErrors = process.env.NODE_ENV === 'development',
    errorFormatter,
    skipPaths = [],
    // stripUnknown = true, // Not used in current implementation
    strict = false,
  } = options

  return async (c: Context, next: Next) => {
    try {
      // Check if current path should be skipped
      const currentPath = c.req.path
      if (skipPaths.some((path) => currentPath.startsWith(path))) {
        await next()
        return
      }

      // Apply validation for each schema type
      const validators = []

      if (schema.body) {
        const bodySchema = strict ? (schema.body as any).strict() : schema.body
        validators.push(zValidator('json', bodySchema))
      }

      if (schema.query) {
        const querySchema = strict
          ? (schema.query as any).strict()
          : schema.query
        validators.push(zValidator('query', querySchema))
      }

      if (schema.params) {
        const paramsSchema = strict
          ? (schema.params as any).strict()
          : schema.params
        validators.push(zValidator('param', paramsSchema))
      }

      if (schema.headers) {
        const headersSchema = strict
          ? (schema.headers as any).strict()
          : schema.headers
        validators.push(zValidator('header', headersSchema))
      }

      // Apply all validators
      for (const validator of validators) {
        await validator(c as any, () => Promise.resolve())
      }

      // Store validated data in context for response validation
      if (schema.response) {
        c.set('responseSchema', schema.response)
      }

      await next()

      // Validate response if schema provided
      if (schema.response) {
        const responseData = await c.res.clone().json()

        try {
          schema.response.parse(responseData)
        } catch (error) {
          if (error instanceof z.ZodError) {
            // eslint-disable-next-line no-console
            console.error('Response validation error:', (error as any).issues)

            // In development, log detailed response validation errors
            if (detailedErrors) {
              // eslint-disable-next-line no-console
              console.error('Response validation details:', {
                path: c.req.path,
                method: c.req.method,
                errors: (error as any).issues,
              })
            }

            // Don't fail the request for response validation errors in production
            // Just log them for monitoring
          }
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedError = errorFormatter
          ? errorFormatter((error as any).issues)
          : defaultErrorFormatter((error as any).issues, detailedErrors)

        throw new (HTTPException as any)(400, formattedError)
      }

      if (error instanceof (HTTPException as any)) {
        throw error
      }

      // eslint-disable-next-line no-console
      console.error('Validation middleware error:', error)
      throw new (HTTPException as any)(500, {
        message: 'Validation service unavailable',
        code: 'VALIDATION_SERVICE_ERROR',
      })
    }
  }
}

/**
 * Pre-configured validation middleware for common use cases
 */

/**
 * Validate request body only
 */
export const validateBody = <T extends z.ZodSchema>(
  schema: T,
  options?: Omit<ValidationOptions, 'detailedErrors'>,
) => validationMiddleware({ body: schema }, options)

/**
 * Validate query parameters only
 */
export const validateQuery = <T extends z.ZodSchema>(
  schema: T,
  options?: Omit<ValidationOptions, 'detailedErrors'>,
) => validationMiddleware({ query: schema }, options)

/**
 * Validate route parameters only
 */
export const validateParams = <T extends z.ZodSchema>(
  schema: T,
  options?: Omit<ValidationOptions, 'detailedErrors'>,
) => validationMiddleware({ params: schema }, options)

/**
 * Validate headers only
 */
export const validateHeaders = <T extends z.ZodSchema>(
  schema: T,
  options?: Omit<ValidationOptions, 'detailedErrors'>,
) => validationMiddleware({ headers: schema }, options)

/**
 * Validate response only
 */
export const validateResponse = <T extends z.ZodSchema>(
  schema: T,
  options?: Omit<ValidationOptions, 'detailedErrors'>,
) => validationMiddleware({ response: schema }, options)

/**
 * Common validation schemas
 */
export const commonSchemas = {
  /**
   * Pagination query parameters
   */
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  /**
   * Search query parameters
   */
  search: z.object({
    search: z.string().optional(),
    filters: z.record(z.string(), z.any()).optional(),
  }),

  /**
   * ID parameter
   */
  idParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  /**
   * Tenant ID parameter
   */
  tenantIdParam: z.object({
    tenantId: z.string().uuid('Invalid tenant ID format'),
  }),

  /**
   * Date range query parameters
   */
  dateRange: z
    .object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return data.startDate <= data.endDate
        }
        return true
      },
      {
        message: 'End date must be after start date',
        path: ['endDate'],
      },
    ),

  /**
   * Common API response schema
   */
  apiResponse: <T>(dataSchema: z.ZodSchema<T>) =>
    z.object({
      success: z.boolean(),
      data: dataSchema.optional(),
      message: z.string().optional(),
      errors: z.array(z.any()).optional(),
      pagination: z
        .object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
          totalPages: z.number(),
        })
        .optional(),
    }),

  /**
   * Error response schema
   */
  errorResponse: z.object({
    success: z.literal(false),
    message: z.string(),
    code: z.string().optional(),
    details: z.record(z.string(), z.any()).optional(),
  }),
}

/**
 * Helper function to create validation middleware for CRUD operations
 */
export const createCrudValidation = <T extends z.ZodSchema>(
  createSchema: T,
  updateSchema: T,
  options?: ValidationOptions,
) => ({
  create: validateBody(createSchema, options),
  update: validateBody((updateSchema as any).partial(), options),
  list: validateQuery(
    commonSchemas.pagination.merge(commonSchemas.search),
    options,
  ),
  get: validateParams(commonSchemas.idParam, options),
  delete: validateParams(commonSchemas.idParam, options),
})

/**
 * Helper function to get validated data from context
 */
export function getValidatedData<T = any>(
  c: Context,
  key: 'body' | 'query' | 'params' | 'headers',
): T {
  const data = c.get(`valid_${key}`)
  if (data === undefined) {
    throw new (HTTPException as any)(500, {
      message: `Validated ${key} data not found - ensure validationMiddleware is applied`,
      code: 'NO_VALIDATED_DATA',
    })
  }
  return data as T
}

/**
 * Helper function to get validated body
 */
export const getValidatedBody = <T = any>(c: Context) =>
  getValidatedData<T>(c, 'body')

/**
 * Helper function to get validated query
 */
export const getValidatedQuery = <T = any>(c: Context) =>
  getValidatedData<T>(c, 'query')

/**
 * Helper function to get validated params
 */
export const getValidatedParams = <T = any>(c: Context) =>
  getValidatedData<T>(c, 'params')

/**
 * Helper function to get validated headers
 */
export const getValidatedHeaders = <T = any>(c: Context) =>
  getValidatedData<T>(c, 'headers')
