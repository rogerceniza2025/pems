# API Routes Implementation Guide

## Overview

This document provides detailed implementation guidance for authentication API routes using Hono framework with proper middleware integration.

## 1. Authentication Routes Structure

### Directory Structure

```
apps/api/src/routes/
├── auth/
│   ├── index.ts
│   ├── auth-routes.ts
│   ├── mfa-routes.ts
│   ├── password-routes.ts
│   └── magic-link-routes.ts
└── users/
    ├── index.ts
    └── user-routes.ts
```

## 2. Main Authentication Routes

### File: `apps/api/src/routes/auth/auth-routes.ts`

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import type { IAuthService } from '@pems/user-management'
import { CreateUserSchema, LoginUserSchema } from '@pems/user-management'
import { authMiddleware } from '../../middleware/auth-middleware'
import { rateLimitMiddleware } from '../../middleware/rate-limit-middleware'

export function createAuthRoutes(authService: IAuthService) {
  const app = new Hono()

  // Apply rate limiting to all auth routes
  app.use(
    '*',
    rateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 requests per 15 minutes
    }),
  )

  // Registration endpoint
  app.post('/register', zValidator('json', CreateUserSchema), async (c) => {
    try {
      const data = c.req.valid('json')
      const result = await authService.register(data)

      if (!result.success) {
        return c.json(
          {
            success: false,
            error: result.error,
            code: 'REGISTRATION_FAILED',
          },
          400,
        )
      }

      return c.json(
        {
          success: true,
          data: {
            user: {
              id: result.user!.id,
              email: result.user!.email,
              tenantId: result.user!.tenantId,
            },
            message:
              'Registration successful. Please check your email to verify your account.',
          },
        },
        201,
      )
    } catch (error) {
      console.error('Registration error:', error)
      return c.json(
        {
          success: false,
          error: 'Registration failed',
          code: 'INTERNAL_ERROR',
        },
        500,
      )
    }
  })

  // Login endpoint
  app.post('/login', zValidator('json', LoginUserSchema), async (c) => {
    try {
      const data = c.req.valid('json')
      const result = await authService.login(data)

      if (!result.success) {
        return c.json(
          {
            success: false,
            error: result.error,
            code: 'LOGIN_FAILED',
          },
          401,
        )
      }

      // Set session cookie if login successful and no MFA required
      if (result.session && !result.requiresMfa) {
        c.res.headers.set(
          'Set-Cookie',
          `session=${result.session}; HttpOnly; Secure; Path=/; Max-Age=604800; SameSite=Lax`,
        )
      }

      return c.json({
        success: true,
        data: {
          user: {
            id: result.user!.id,
            email: result.user!.email,
            tenantId: result.user!.tenantId,
          },
          requiresMfa: result.requiresMfa,
          mfaMethods: result.requiresMfa ? ['totp', 'backup'] : undefined,
        },
      })
    } catch (error) {
      console.error('Login error:', error)
      return c.json(
        {
          success: false,
          error: 'Login failed',
          code: 'INTERNAL_ERROR',
        },
        500,
      )
    }
  })

  // Logout endpoint
  app.post('/logout', authMiddleware(authService), async (c) => {
    try {
      const sessionToken =
        c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1] ||
        c.req.header('Authorization')?.replace('Bearer ', '')

      if (sessionToken) {
        await authService.logout(sessionToken)
      }

      c.res.headers.set(
        'Set-Cookie',
        'session=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Lax',
      )

      return c.json({
        success: true,
        message: 'Logged out successfully',
      })
    } catch (error) {
      console.error('Logout error:', error)
      return c.json(
        {
          success: false,
          error: 'Logout failed',
          code: 'INTERNAL_ERROR',
        },
        500,
      )
    }
  })

  // Refresh session endpoint
  app.post('/refresh', async (c) => {
    try {
      const refreshToken =
        c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1] ||
        c.req.header('Authorization')?.replace('Bearer ', '')

      if (!refreshToken) {
        return c.json(
          {
            success: false,
            error: 'Refresh token required',
            code: 'TOKEN_REQUIRED',
          },
          401,
        )
      }

      const result = await authService.refreshToken(refreshToken)

      if (!result.success) {
        return c.json(
          {
            success: false,
            error: 'Invalid refresh token',
            code: 'INVALID_TOKEN',
          },
          401,
        )
      }

      // Set new session cookie
      c.res.headers.set(
        'Set-Cookie',
        `session=${result.session}; HttpOnly; Secure; Path=/; Max-Age=604800; SameSite=Lax`,
      )

      return c.json({
        success: true,
        message: 'Session refreshed successfully',
      })
    } catch (error) {
      console.error('Refresh error:', error)
      return c.json(
        {
          success: false,
          error: 'Session refresh failed',
          code: 'INTERNAL_ERROR',
        },
        500,
      )
    }
  })

  return app
}
```

## 3. MFA Routes

### File: `apps/api/src/routes/auth/mfa-routes.ts`

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { IAuthService } from '@pems/user-management'
import { authMiddleware } from '../../middleware/auth-middleware'
import { rateLimitMiddleware } from '../../middleware/rate-limit-middleware'

const SetupMfaSchema = z.object({
  userId: z.string().uuid(),
})

const VerifyMfaSetupSchema = z.object({
  userId: z.string().uuid(),
  secret: z.string(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
})

const VerifyMfaLoginSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  backupCode: z.string().optional(),
})

const DisableMfaSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(1, 'Password is required'),
})

export function createMfaRoutes(authService: IAuthService) {
  const app = new Hono()

  // Apply stricter rate limiting for MFA routes
  app.use(
    '*',
    rateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 3, // 3 requests per 15 minutes
    }),
  )

  // Setup MFA
  app.post(
    '/setup',
    authMiddleware(authService),
    zValidator('json', SetupMfaSchema),
    async (c) => {
      try {
        const { userId } = c.req.valid('json')
        const auth = c.get('auth')

        // Users can only setup MFA for themselves
        if (auth.user.id !== userId) {
          return c.json(
            {
              success: false,
              error: 'Unauthorized',
              code: 'UNAUTHORIZED',
            },
            403,
          )
        }

        const result = await authService.setupMfa(userId)

        return c.json({
          success: true,
          data: {
            secret: result.secret,
            qrCode: result.qrCode,
            backupCodes: result.backupCodes,
            instructions: {
              step1: 'Scan the QR code with your authenticator app',
              step2: 'Enter the 6-digit code to verify setup',
              step3: 'Save the backup codes in a secure location',
            },
          },
        })
      } catch (error) {
        console.error('MFA setup error:', error)
        return c.json(
          {
            success: false,
            error: 'MFA setup failed',
            code: 'INTERNAL_ERROR',
          },
          500,
        )
      }
    },
  )

  // Verify MFA setup
  app.post(
    '/setup/verify',
    authMiddleware(authService),
    zValidator('json', VerifyMfaSetupSchema),
    async (c) => {
      try {
        const { userId, secret, code } = c.req.valid('json')
        const auth = c.get('auth')

        // Users can only verify MFA for themselves
        if (auth.user.id !== userId) {
          return c.json(
            {
              success: false,
              error: 'Unauthorized',
              code: 'UNAUTHORIZED',
            },
            403,
          )
        }

        await authService.verifyMfaSetup(userId, secret, code)

        return c.json({
          success: true,
          message: 'MFA enabled successfully',
        })
      } catch (error) {
        console.error('MFA verification error:', error)
        return c.json(
          {
            success: false,
            error: 'Invalid MFA code',
            code: 'INVALID_CODE',
          },
          400,
        )
      }
    },
  )

  // Verify MFA for login
  app.post('/verify', zValidator('json', VerifyMfaLoginSchema), async (c) => {
    try {
      const { userId, code, backupCode } = c.req.valid('json')

      const isValid = await authService.verifyMfaLogin(userId, code)

      if (!isValid && !backupCode) {
        return c.json(
          {
            success: false,
            error: 'Invalid MFA code',
            code: 'INVALID_CODE',
          },
          401,
        )
      }

      if (!isValid && backupCode) {
        // Try backup code verification
        const backupValid = await authService.verifyMfaLogin(userId, backupCode)
        if (!backupValid) {
          return c.json(
            {
              success: false,
              error: 'Invalid backup code',
              code: 'INVALID_BACKUP_CODE',
            },
            401,
          )
        }
      }

      // Create session after successful MFA verification
      const loginResult = await authService.login({
        email: '', // We'll need to get this from context
        password: '', // We'll need to handle this differently
        tenantId: '', // We'll need to get this from context
      })

      if (loginResult.success && loginResult.session) {
        c.res.headers.set(
          'Set-Cookie',
          `session=${loginResult.session}; HttpOnly; Secure; Path=/; Max-Age=604800; SameSite=Lax`,
        )
      }

      return c.json({
        success: true,
        message: 'MFA verification successful',
        data: loginResult.success
          ? {
              user: loginResult.user,
              session: loginResult.session,
            }
          : undefined,
      })
    } catch (error) {
      console.error('MFA verification error:', error)
      return c.json(
        {
          success: false,
          error: 'MFA verification failed',
          code: 'INTERNAL_ERROR',
        },
        500,
      )
    }
  })

  // Disable MFA
  app.post(
    '/disable',
    authMiddleware(authService),
    zValidator('json', DisableMfaSchema),
    async (c) => {
      try {
        const { userId, password } = c.req.valid('json')
        const auth = c.get('auth')

        // Users can only disable MFA for themselves
        if (auth.user.id !== userId) {
          return c.json(
            {
              success: false,
              error: 'Unauthorized',
              code: 'UNAUTHORIZED',
            },
            403,
          )
        }

        await authService.disableMfa(userId, password)

        return c.json({
          success: true,
          message: 'MFA disabled successfully',
        })
      } catch (error) {
        console.error('MFA disable error:', error)
        return c.json(
          {
            success: false,
            error: 'Failed to disable MFA',
            code: 'INTERNAL_ERROR',
          },
          500,
        )
      }
    },
  )

  return app
}
```

## 4. Password Reset Routes

### File: `apps/api/src/routes/auth/password-routes.ts`

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { IAuthService } from '@pems/user-management'
import { rateLimitMiddleware } from '../../middleware/rate-limit-middleware'

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  tenantId: z.string().uuid('Invalid tenant ID'),
})

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export function createPasswordRoutes(authService: IAuthService) {
  const app = new Hono()

  // Apply rate limiting to password reset routes
  app.use(
    '*',
    rateLimitMiddleware({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 requests per hour
    }),
  )

  // Request password reset
  app.post('/forgot', zValidator('json', ForgotPasswordSchema), async (c) => {
    try {
      const { email, tenantId } = c.req.valid('json')

      await authService.forgotPassword(email, tenantId)

      // Always return success to prevent email enumeration
      return c.json({
        success: true,
        message:
          'If an account with this email exists, a password reset link has been sent.',
      })
    } catch (error) {
      console.error('Password reset request error:', error)
      return c.json({
        success: true,
        message:
          'If an account with this email exists, a password reset link has been sent.',
      })
    }
  })

  // Reset password
  app.post('/reset', zValidator('json', ResetPasswordSchema), async (c) => {
    try {
      const { token, newPassword } = c.req.valid('json')

      await authService.resetPassword(token, newPassword)

      return c.json({
        success: true,
        message: 'Password reset successfully',
      })
    } catch (error) {
      console.error('Password reset error:', error)
      return c.json(
        {
          success: false,
          error: 'Password reset failed',
          code: 'RESET_FAILED',
        },
        400,
      )
    }
  })

  return app
}
```

## 5. Magic Link Routes

### File: `apps/api/src/routes/auth/magic-link-routes.ts`

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { IAuthService } from '@pems/user-management'
import { rateLimitMiddleware } from '../../middleware/rate-limit-middleware'

const RequestMagicLinkSchema = z.object({
  email: z.string().email('Invalid email address'),
  tenantId: z.string().uuid('Invalid tenant ID'),
})

const VerifyMagicLinkSchema = z.object({
  token: z.string().min(1, 'Magic link token is required'),
})

export function createMagicLinkRoutes(authService: IAuthService) {
  const app = new Hono()

  // Apply rate limiting to magic link routes
  app.use(
    '*',
    rateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 3, // 3 requests per 15 minutes
    }),
  )

  // Request magic link
  app.post(
    '/request',
    zValidator('json', RequestMagicLinkSchema),
    async (c) => {
      try {
        const { email, tenantId } = c.req.valid('json')

        const magicLink = await authService.generateMagicLink(email, tenantId)

        if (magicLink) {
          return c.json({
            success: true,
            message: 'Magic link sent to your email',
          })
        } else {
          // Always return success to prevent email enumeration
          return c.json({
            success: true,
            message:
              'If an account with this email exists, a magic link has been sent.',
          })
        }
      } catch (error) {
        console.error('Magic link request error:', error)
        return c.json({
          success: true,
          message:
            'If an account with this email exists, a magic link has been sent.',
        })
      }
    },
  )

  // Verify magic link
  app.post('/verify', zValidator('json', VerifyMagicLinkSchema), async (c) => {
    try {
      const { token } = c.req.valid('json')

      const result = await authService.verifyMagicLink(token)

      if (!result.success) {
        return c.json(
          {
            success: false,
            error: result.error,
            code: 'INVALID_LINK',
          },
          401,
        )
      }

      // Set session cookie
      if (result.session) {
        c.res.headers.set(
          'Set-Cookie',
          `session=${result.session}; HttpOnly; Secure; Path=/; Max-Age=604800; SameSite=Lax`,
        )
      }

      return c.json({
        success: true,
        message: 'Magic link verified successfully',
        data: {
          user: result.user,
          session: result.session,
        },
      })
    } catch (error) {
      console.error('Magic link verification error:', error)
      return c.json(
        {
          success: false,
          error: 'Magic link verification failed',
          code: 'INTERNAL_ERROR',
        },
        500,
      )
    }
  })

  return app
}
```

## 6. User Management Routes

### File: `apps/api/src/routes/users/user-routes.ts`

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { IUserService } from '@pems/user-management'
import { authMiddleware } from '../../middleware/auth-middleware'
import { requirePermission } from '../../middleware/permission-middleware'
import { rateLimitMiddleware } from '../../middleware/rate-limit-middleware'

const UpdateProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
  preferredName: z.string().optional(),
  locale: z.string().optional(),
})

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export function createUserRoutes(userService: IUserService) {
  const app = new Hono()

  // Apply authentication to all user routes
  app.use('*', authMiddleware(userService))

  // Get user profile
  app.get('/profile', async (c) => {
    try {
      const auth = c.get('auth')
      const profile = await userService.getProfile(auth.user.id)

      return c.json({
        success: true,
        data: profile,
      })
    } catch (error) {
      console.error('Get profile error:', error)
      return c.json(
        {
          success: false,
          error: 'Failed to get profile',
          code: 'INTERNAL_ERROR',
        },
        500,
      )
    }
  })

  // Update user profile
  app.put('/profile', zValidator('json', UpdateProfileSchema), async (c) => {
    try {
      const data = c.req.valid('json')
      const auth = c.get('auth')

      const profile = await userService.updateProfile(auth.user.id, data)

      return c.json({
        success: true,
        data: profile,
        message: 'Profile updated successfully',
      })
    } catch (error) {
      console.error('Update profile error:', error)
      return c.json(
        {
          success: false,
          error: 'Failed to update profile',
          code: 'INTERNAL_ERROR',
        },
        500,
      )
    }
  })

  // Change password
  app.post(
    '/change-password',
    zValidator('json', ChangePasswordSchema),
    async (c) => {
      try {
        const { currentPassword, newPassword } = c.req.valid('json')
        const auth = c.get('auth')

        await userService.changePassword(
          auth.user.id,
          currentPassword,
          newPassword,
        )

        return c.json({
          success: true,
          message: 'Password changed successfully',
        })
      } catch (error) {
        console.error('Change password error:', error)
        return c.json(
          {
            success: false,
            error: 'Failed to change password',
            code: 'INTERNAL_ERROR',
          },
          500,
        )
      }
    },
  )

  // List users (admin only)
  app.get('/', requirePermission('users:read'), async (c) => {
    try {
      const tenantId = c.get('tenantId')
      const page = parseInt(c.req.query('page') || '1')
      const limit = parseInt(c.req.query('limit') || '20')
      const search = c.req.query('search') || ''
      const sortBy = (c.req.query('sortBy') as any) || 'createdAt'
      const sortOrder = (c.req.query('sortOrder') as any) || 'desc'
      const isActive =
        c.req.query('isActive') === 'true'
          ? true
          : c.req.query('isActive') === 'false'
            ? false
            : undefined

      const result = await userService.listUsers(tenantId, {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        isActive,
      })

      return c.json({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error('List users error:', error)
      return c.json(
        {
          success: false,
          error: 'Failed to list users',
          code: 'INTERNAL_ERROR',
        },
        500,
      )
    }
  })

  return app
}
```

## 7. Route Index Files

### File: `apps/api/src/routes/auth/index.ts`

```typescript
import { Hono } from 'hono'
import type { IAuthService } from '@pems/user-management'
import { createAuthRoutes } from './auth-routes'
import { createMfaRoutes } from './mfa-routes'
import { createPasswordRoutes } from './password-routes'
import { createMagicLinkRoutes } from './magic-link-routes'

export function createAuthRoutes(authService: IAuthService) {
  const app = new Hono()

  // Main auth routes
  app.route('/', createAuthRoutes(authService))

  // MFA routes
  app.route('/mfa', createMfaRoutes(authService))

  // Password routes
  app.route('/password', createPasswordRoutes(authService))

  // Magic link routes
  app.route('/magic-link', createMagicLinkRoutes(authService))

  return app
}
```

### File: `apps/api/src/routes/users/index.ts`

```typescript
import { Hono } from 'hono'
import type { IUserService } from '@pems/user-management'
import { createUserRoutes } from './user-routes'

export function createUserRoutes(userService: IUserService) {
  return createUserRoutes(userService)
}
```

## 8. Update Main Server

### File: `apps/api/src/server.ts`

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { PrismaClient } from '@pems/database'
import { tenantContextMiddleware } from '@pems/middleware'
import {
  TenantRepository,
  TenantService,
  createTenantRoutes,
} from '@pems/tenant-management'
import {
  UserRepository,
  UserProfileRepository,
  UserAuthProviderRepository,
  UserRoleRepository,
  UserService,
  createAuthRoutes as createUserAuthRoutes,
  createAuthRoutes as createUserRoutes,
} from '@pems/user-management'
import {
  PasswordResetTokenRepository,
  MagicLinkTokenRepository,
  UserSessionRepository,
  MfaService,
  PasswordResetService,
  MagicLinkService,
  EmailService,
  SessionService,
  createAuthRoutes as createInfrastructureAuthRoutes,
} from '@pems/auth'

// Initialize database connection
const prisma = new PrismaClient()

// Initialize repositories
const tenantRepository = new TenantRepository(prisma)
const userRepository = new UserRepository(prisma)
const userProfileRepository = new UserProfileRepository(prisma)
const authProviderRepository = new UserAuthProviderRepository(prisma)
const roleRepository = new UserRoleRepository(prisma)
const passwordResetTokenRepository = new PasswordResetTokenRepository(prisma)
const magicLinkTokenRepository = new MagicLinkTokenRepository(prisma)
const sessionRepository = new UserSessionRepository(prisma)

// Initialize services
const tenantService = new TenantService(tenantRepository)
const emailService = new EmailService()
const mfaService = new MfaService()
const passwordResetService = new PasswordResetService(
  userRepository,
  passwordResetTokenRepository,
  emailService,
)
const magicLinkService = new MagicLinkService(
  userRepository,
  magicLinkTokenRepository,
  emailService,
)
const sessionService = new SessionService(sessionRepository)
const userService = new UserService(
  userRepository,
  userProfileRepository,
  authProviderRepository,
)

// Initialize auth service
const authService = new AuthService(
  userRepository,
  authProviderRepository,
  passwordResetTokenRepository,
  magicLinkTokenRepository,
  sessionRepository,
  mfaService,
  passwordResetService,
  magicLinkService,
  sessionService,
)

const app = new Hono()

// Global middleware
app.use('*', cors())
app.use('*', logger())

// Tenant context middleware for all API routes
app.use('/api/*', tenantContextMiddleware(prisma))

// Basic routes
app.get('/', (c) => {
  return c.json({
    message: 'PEMS API is running',
    version: '1.0.0',
    features: {
      multiTenancy: true,
      rowLevelSecurity: true,
      uuidv7: true,
      authentication: true,
      mfa: true,
      passwordReset: true,
      magicLinks: true,
    },
  })
})

// Health check with database status
app.get('/health', async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    })
  } catch (error) {
    return c.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      503,
    )
  }
})

// API Routes
app.route('/api', createTenantRoutes(tenantService))
app.route('/api/auth', createInfrastructureAuthRoutes(authService))
app.route('/api/users', createUserRoutes(userService))

// Error handling middleware
app.onError((err, c) => {
  console.error('API Error:', err)

  if (err.name === 'HTTPException') {
    return c.json(
      {
        success: false,
        error: {
          message: err.message,
          code: err.status,
          status: err.status,
        },
      },
      err.status,
    )
  }

  return c.json(
    {
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        status: 500,
      },
    },
    500,
  )
})

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        message: 'Endpoint not found',
        code: 'NOT_FOUND',
        status: 404,
      },
    },
    404,
  )
})

const port = 3002

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

console.log(`🚀 PEMS API Server starting on port ${port}`)
console.log(`📊 Health check: http://localhost:${port}/health`)
console.log(`🔐 Authentication endpoints: http://localhost:${port}/api/auth`)
console.log(`👥 User management: http://localhost:${port}/api/users`)
console.log(`🏢 Multi-tenant architecture with RLS enabled`)

serve({
  fetch: app.fetch,
  port,
})
```

## 9. API Documentation

### Authentication Endpoints

```
POST   /api/auth/register          - User registration
POST   /api/auth/login             - User login
POST   /api/auth/logout            - User logout
POST   /api/auth/refresh           - Refresh session
POST   /api/auth/password/forgot    - Request password reset
POST   /api/auth/password/reset     - Reset password
POST   /api/auth/magic-link/request - Request magic link
POST   /api/auth/magic-link/verify  - Verify magic link
POST   /api/auth/mfa/setup         - Setup MFA
POST   /api/auth/mfa/setup/verify  - Verify MFA setup
POST   /api/auth/mfa/verify        - Verify MFA for login
POST   /api/auth/mfa/disable       - Disable MFA
```

### User Management Endpoints

```
GET    /api/users/profile          - Get user profile
PUT    /api/users/profile          - Update user profile
POST   /api/users/change-password  - Change password
GET    /api/users                 - List users (admin)
```

## 10. Testing Strategy

1. **Unit Tests**: Test each route handler in isolation
2. **Integration Tests**: Test route with real services
3. **E2E Tests**: Test complete authentication flows
4. **Security Tests**: Test rate limiting, input validation, etc.

## Next Steps

1. Implement middleware (auth, rate limiting, permissions)
2. Create all route files following patterns above
3. Add comprehensive error handling
4. Write tests for all route implementations
5. Add API documentation (OpenAPI/Swagger)
6. Add monitoring and logging
