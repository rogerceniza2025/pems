/**
 * Infrastructure Middleware Package
 *
 * Provides middleware for authentication, authorization, tenant isolation,
 * and other cross-cutting concerns for the PEMS application.
 */

export {
  getTenantContext,
  getUserContext,
  optionalTenantContext,
  TENANT_CONTEXT_KEY,
  tenantContextMiddleware,
  USER_CONTEXT_KEY,
  type TenantContext,
} from './tenant-context'

export {
  AUTH_CONTEXT_KEY,
  authMiddleware,
  getAuthContext,
  getCurrentSession,
  getCurrentUser,
  isAuthenticated,
  optionalAuth,
  publicRoute,
  requireAuth,
  SESSION_CONTEXT_KEY,
  type AuthContext,
  type AuthMiddlewareOptions,
} from './auth-middleware'

export {
  closeRateLimitConnections,
  createAuthRateLimiter,
  createCustomRateLimiter,
  createGeneralRateLimiter,
  createSensitiveRateLimiter,
  createUploadRateLimiter,
  getRateLimitInfo,
  isRateLimited,
  rateLimitMiddleware,
  DEFAULT_RATE_LIMITS,
  type RateLimitConfig,
  type RateLimitInfo,
  type RateLimitResult,
} from './rate-limit-middleware'

export {
  apiSecurityHeaders,
  developmentSecurityHeaders,
  productionSecurityHeaders,
  securityHeadersMiddleware,
  type SecurityHeadersConfig,
} from './security-headers-middleware'

export {
  authorizationMiddleware,
  getAuthorizationContext,
  hasPermissionInContext,
  hasRoleInContext,
  requireAllPermissions,
  requireAnyPermission,
  requireAnyRole,
  requirePermission,
  requireRole,
  requireSystemAdmin,
  type AuthorizationContext,
  type AuthorizationOptions,
  type Permission,
  type Role,
} from './authorization-middleware'

export {
  apiErrorHandling,
  createAuthError,
  createAuthzError,
  createConflictError,
  createError,
  createNotFoundError,
  createValidationError,
  developmentErrorHandling,
  errorHandlingMiddleware,
  productionErrorHandling,
  type ErrorContext,
  type ErrorHandlingOptions,
  type ErrorResponse,
} from './error-handling-middleware'

export {
  apiRequestLogging,
  createCustomLogger,
  createJsonLogger,
  developmentRequestLogging,
  getRequestId,
  productionRequestLogging,
  requestLoggingMiddleware,
  type LogEntry,
  type RequestContext,
  type RequestLoggingOptions,
  type ResponseContext,
} from './request-logging-middleware'

export {
  commonSchemas,
  createCrudValidation,
  getValidatedBody,
  getValidatedData,
  getValidatedHeaders,
  getValidatedParams,
  getValidatedQuery,
  validateBody,
  validateHeaders,
  validateParams,
  validateQuery,
  validateResponse,
  validationMiddleware,
  type ValidationOptions,
  type ValidationSchema,
} from './validation-middleware'

// Future middleware exports:
// export { rbacMiddleware } from './rbac'
// export { requestLoggerMiddleware } from './request-logger'
