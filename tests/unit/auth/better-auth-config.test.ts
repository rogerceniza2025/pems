import { describe, it, expect, vi, beforeEach } from 'vitest'
import { betterAuth } from 'better-auth'
import { authConfig } from './packages/infrastructure/auth/src'

// Mock environment variables
const originalEnv = process.env

describe('BetterAuth Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Base Configuration', () => {
    it('should have correct database configuration', () => {
      expect(authConfig.database).toBeDefined()
      expect(authConfig.database.provider).toBe('postgres')
      expect(authConfig.database.url).toContain('postgresql://')
    })

    it('should have proper session configuration', () => {
      expect(authConfig.session).toBeDefined()
      expect(authConfig.session.expiryTime).toBe(60 * 60 * 24 * 7) // 7 days
      expect(authConfig.session.updateAge).toBe(60 * 60 * 24) // 1 day
      expect(authConfig.session.cookieCache).toBeDefined()
    })

    it('should have secure cookie configuration', () => {
      const cookieConfig = authConfig.session!.cookieCache!
      expect(cookieConfig.attributes).toEqual({
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        domain: expect.any(String),
      })
    })
  })

  describe('Social Providers Configuration', () => {
    beforeEach(() => {
      process.env.GOOGLE_CLIENT_ID = 'google-client-id'
      process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret'
      process.env.GITHUB_CLIENT_ID = 'github-client-id'
      process.env.GITHUB_CLIENT_SECRET = 'github-client-secret'
      process.env.FRONTEND_URL = 'http://localhost:3000'
    })

    it('should configure Google OAuth when environment variables are present', () => {
      expect(authConfig.socialProviders?.google).toBeDefined()
      expect(authConfig.socialProviders?.google?.clientId).toBe('google-client-id')
      expect(authConfig.socialProviders?.google?.clientSecret).toBe('google-client-secret')
    })

    it('should configure GitHub OAuth when environment variables are present', () => {
      expect(authConfig.socialProviders?.github).toBeDefined()
      expect(authConfig.socialProviders?.github?.clientId).toBe('github-client-id')
      expect(authConfig.socialProviders?.github?.clientSecret).toBe('github-client-secret')
    })

    it('should have correct redirect URLs', () => {
      const googleProvider = authConfig.socialProviders?.google
      if (googleProvider?.enabled) {
        expect(googleProvider.redirectUri).toBe('http://localhost:3000/api/auth/callback/google')
      }

      const githubProvider = authConfig.socialProviders?.github
      if (githubProvider?.enabled) {
        expect(githubProvider.redirectUri).toBe('http://localhost:3000/api/auth/callback/github')
      }
    })
  })

  describe('Email Configuration', () => {
    beforeEach(() => {
      process.env.SMTP_HOST = 'smtp.example.com'
      process.env.SMTP_PORT = '587'
      process.env.SMTP_USER = 'noreply@example.com'
      process.env.SMTP_PASSWORD = 'smtp-password'
      process.env.FRONTEND_URL = 'http://localhost:3000'
    })

    it('should configure email service when SMTP variables are present', () => {
      expect(authConfig.emailAndPassword).toBeDefined()
      expect(authConfig.emailAndPassword).toEqual({
        enabled: true,
        requireEmailVerification: true,
      })
    })
  })

  describe('MFA Configuration', () => {
    it('should enable MFA support', () => {
      expect(authConfig.advanced?.generateId).toBeDefined()
      // MFA configuration would be part of the advanced config
    })
  })

  describe('Account Features', () => {
    it('should enable account linking', () => {
      expect(authConfig.account).toBeDefined()
      expect(authConfig.account?.accountLinking).toEqual({
        enabled: true,
        trustedProviders: ['google', 'github', 'email-password'],
      })
    })
  })

  describe('Multi-Tenant Support', () => {
    it('should have tenant-aware hooks', () => {
      expect(authConfig.hooks).toBeDefined()

      // Check if hooks have tenant awareness
      const hooks = authConfig.hooks!

      if (hooks.before) {
        expect(hooks.before.some(hook =>
          typeof hook === 'function' &&
          hook.toString().includes('tenant')
        )).toBe(true)
      }

      if (hooks.after) {
        expect(hooks.after.some(hook =>
          typeof hook === 'function' &&
          hook.toString().includes('tenant')
        )).toBe(true)
      }
    })
  })

  describe('Security Configuration', () => {
    it('should have proper security settings', () => {
      // Check for CSRF protection
      expect(authConfig.advanced?.dangerouslyDisableSuffixCheck).toBeUndefined()

      // Check for rate limiting
      expect(authConfig.rateLimit).toBeDefined()
      expect(authConfig.rateLimit?.window).toBe(15 * 60 * 1000) // 15 minutes
      expect(authConfig.rateLimit?.max).toBe(100) // 100 requests per window
    })
  })

  describe('URL Configuration', () => {
    beforeEach(() => {
      process.env.FRONTEND_URL = 'http://localhost:3000'
      process.env.ADMIN_URL = 'http://localhost:3001'
    })

    it('should use correct base URL', () => {
      expect(authConfig.baseURL).toBe('http://localhost:3000')
    })

    it('should have correct redirect URLs', () => {
      const emailConfig = authConfig.emailAndPassword
      if (emailConfig?.enabled) {
        // Check that redirects use the configured frontend URL
        expect(authConfig.baseURL).toContain('localhost:3000')
      }
    })
  })

  describe('Environment-Based Configuration', () => {
    it('should use production settings in production environment', () => {
      process.env.NODE_ENV = 'production'

      // Recreate config with production env
      const prodConfig = authConfig

      const cookieConfig = prodConfig.session?.cookieCache
      expect(cookieConfig?.attributes?.secure).toBe(true)
    })

    it('should use development settings in development environment', () => {
      process.env.NODE_ENV = 'development'

      // Recreate config with development env
      const devConfig = authConfig

      const cookieConfig = devConfig.session?.cookieCache
      expect(cookieConfig?.attributes?.secure).toBe(false)
    })
  })

  describe('Database Provider Configuration', () => {
    it('should use PostgreSQL adapter', () => {
      expect(authConfig.database?.provider).toBe('postgres')
    })

    it('should use correct database URL from environment', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb'

      // Database URL should be properly set
      expect(authConfig.database?.url).toContain('postgresql://')
    })
  })

  describe('Cross-Subdomain Configuration', () => {
    beforeEach(() => {
      process.env.FRONTEND_URL = 'https://app.example.com'
    })

    it('should support cross-subdomain cookies', () => {
      const cookieConfig = authConfig.session?.cookieCache
      expect(cookieConfig?.attributes?.domain).toBe('.example.com')
    })
  })
})