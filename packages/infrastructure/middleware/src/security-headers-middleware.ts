/**
 * Security Headers Middleware
 *
 * Implements OWASP-recommended security headers for enhanced API security
 * Configurable for different environments with sensible defaults
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Context, Next } from 'hono'

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

export interface SecurityHeadersConfig {
  /**
   * Content Security Policy configuration
   * @default "default-src 'self'"
   */
  contentSecurityPolicy?: string | boolean

  /**
   * HTTP Strict Transport Security
   * @default "max-age=31536000; includeSubDomains"
   */
  hsts?: string | boolean

  /**
   * X-Frame-Options header
   * @default "DENY"
   */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM' | boolean

  /**
   * X-Content-Type-Options header
   * @default "nosniff"
   */
  contentTypeOptions?: 'nosniff' | boolean

  /**
   * Referrer-Policy header
   * @default "strict-origin-when-cross-origin"
   */
  referrerPolicy?: string | boolean

  /**
   * Permissions-Policy header
   * @default "geolocation=(), microphone=(), camera=()"
   */
  permissionsPolicy?: string | boolean

  /**
   * X-XSS-Protection header (legacy but still useful)
   * @default "1; mode=block"
   */
  xssProtection?: string | boolean

  /**
   * X-Permitted-Cross-Domain-Policies header
   * @default "none"
   */
  permittedCrossDomainPolicies?:
    | 'none'
    | 'master-only'
    | 'by-content-type'
    | 'all'
    | boolean

  /**
   * Cross-Origin Embedder Policy
   * @default false
   */
  crossOriginEmbedderPolicy?: boolean

  /**
   * Cross-Origin Opener Policy
   * @default false
   */
  crossOriginOpenerPolicy?: boolean

  /**
   * Cross-Origin Resource Policy
   * @default false
   */
  crossOriginResourcePolicy?: boolean

  /**
   * Whether to remove the X-Powered-By header
   * @default true
   */
  removePoweredBy?: boolean

  /**
   * Custom headers to add
   */
  customHeaders?: Record<string, string>
}

/**
 * Default security configuration for production
 */
const DEFAULT_SECURITY_CONFIG: SecurityHeadersConfig = {
  contentSecurityPolicy:
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  hsts: 'max-age=31536000; includeSubDomains; preload',
  frameOptions: 'DENY',
  contentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy:
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
  xssProtection: '1; mode=block',
  permittedCrossDomainPolicies: 'none',
  removePoweredBy: true,
}

/**
 * Development security configuration (more relaxed)
 */
const DEVELOPMENT_SECURITY_CONFIG: SecurityHeadersConfig = {
  contentSecurityPolicy: false, // Disabled for development
  hsts: false, // Disabled for HTTP in development
  frameOptions: 'SAMEORIGIN',
  contentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: false, // Disabled for development
  xssProtection: '1; mode=block',
  permittedCrossDomainPolicies: 'none',
  removePoweredBy: true,
}

/**
 * Get security configuration based on environment
 */
function getSecurityConfig(
  config?: Partial<SecurityHeadersConfig>,
): SecurityHeadersConfig {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const baseConfig = isDevelopment
    ? DEVELOPMENT_SECURITY_CONFIG
    : DEFAULT_SECURITY_CONFIG

  return {
    ...baseConfig,
    ...config,
  }
}

/**
 * Security headers middleware factory
 */
export const securityHeadersMiddleware = (
  config?: Partial<SecurityHeadersConfig>,
) => {
  const securityConfig = getSecurityConfig(config)

  return async (c: Context, next: Next) => {
    try {
      // Content Security Policy
      if (securityConfig.contentSecurityPolicy) {
        c.header(
          'Content-Security-Policy',
          securityConfig.contentSecurityPolicy as string,
        )
      }

      // HTTP Strict Transport Security
      if (securityConfig.hsts) {
        c.header('Strict-Transport-Security', securityConfig.hsts as string)
      }

      // X-Frame-Options
      if (securityConfig.frameOptions) {
        c.header('X-Frame-Options', securityConfig.frameOptions as string)
      }

      // X-Content-Type-Options
      if (securityConfig.contentTypeOptions) {
        c.header(
          'X-Content-Type-Options',
          securityConfig.contentTypeOptions as string,
        )
      }

      // Referrer-Policy
      if (securityConfig.referrerPolicy) {
        c.header('Referrer-Policy', securityConfig.referrerPolicy as string)
      }

      // Permissions-Policy
      if (securityConfig.permissionsPolicy) {
        c.header(
          'Permissions-Policy',
          securityConfig.permissionsPolicy as string,
        )
      }

      // X-XSS-Protection
      if (securityConfig.xssProtection) {
        c.header('X-XSS-Protection', securityConfig.xssProtection as string)
      }

      // X-Permitted-Cross-Domain-Policies
      if (securityConfig.permittedCrossDomainPolicies) {
        c.header(
          'X-Permitted-Cross-Domain-Policies',
          securityConfig.permittedCrossDomainPolicies as string,
        )
      }

      // Cross-Origin Embedder Policy
      if (securityConfig.crossOriginEmbedderPolicy) {
        c.header('Cross-Origin-Embedder-Policy', 'require-corp')
      }

      // Cross-Origin Opener Policy
      if (securityConfig.crossOriginOpenerPolicy) {
        c.header('Cross-Origin-Opener-Policy', 'same-origin')
      }

      // Cross-Origin Resource Policy
      if (securityConfig.crossOriginResourcePolicy) {
        c.header('Cross-Origin-Resource-Policy', 'same-origin')
      }

      // Remove X-Powered-By header
      if (securityConfig.removePoweredBy) {
        c.header('X-Powered-By', '')
      }

      // Custom headers
      if (securityConfig.customHeaders) {
        Object.entries(securityConfig.customHeaders).forEach(([key, value]) => {
          c.header(key, value)
        })
      }

      await next()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Security headers middleware error:', error)
      throw new HTTPException(500, {
        message: 'Security headers setup failed',
        code: 'SECURITY_HEADERS_ERROR',
      })
    }
  }
}

/**
 * Pre-configured security middleware for production
 */
export const productionSecurityHeaders = () =>
  securityHeadersMiddleware(DEFAULT_SECURITY_CONFIG)

/**
 * Pre-configured security middleware for development
 */
export const developmentSecurityHeaders = () =>
  securityHeadersMiddleware(DEVELOPMENT_SECURITY_CONFIG)

/**
 * API-specific security headers (for JSON APIs)
 */
export const apiSecurityHeaders = () =>
  securityHeadersMiddleware({
    contentSecurityPolicy: false, // Not needed for APIs
    hsts:
      process.env.NODE_ENV !== 'development'
        ? 'max-age=31536000; includeSubDomains'
        : false,
    frameOptions: 'DENY',
    contentTypeOptions: 'nosniff',
    referrerPolicy: 'no-referrer',
    permissionsPolicy: false, // Not needed for APIs
    xssProtection: '1; mode=block',
    permittedCrossDomainPolicies: 'none',
    removePoweredBy: true,
    customHeaders: {
      'X-Content-Type-Options': 'nosniff',
      'X-API-Version': '1.0.0',
    },
  })
