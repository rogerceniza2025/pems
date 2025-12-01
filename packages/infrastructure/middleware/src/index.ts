/**
 * Infrastructure Middleware Package
 *
 * Provides middleware for authentication, authorization, tenant isolation,
 * and other cross-cutting concerns for the PEMS application.
 */

export {
  tenantContextMiddleware,
  optionalTenantContext,
  getTenantContext,
  getUserContext,
  type TenantContext,
  TENANT_CONTEXT_KEY,
  USER_CONTEXT_KEY,
} from './tenant-context'

// Future middleware exports:
// export { authMiddleware } from './auth'
// export { rbacMiddleware } from './rbac'
// export { rateLimitMiddleware } from './rate-limit'
// export { requestLoggerMiddleware } from './request-logger'