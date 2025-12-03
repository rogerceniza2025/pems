# PO-4: User Authentication System - Technical Specifications

## Overview

This document provides detailed technical specifications for implementing the User Authentication System, including code patterns, interfaces, and implementation details.

## Domain Layer Specifications

### User Entity Structure

```typescript
// modules/user-management/src/domain/user.ts

export interface UserDomainEntity {
  id: string
  tenantId: string
  email: string
  phone?: string
  isActive: boolean
  isSystemAdmin: boolean
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface UserProfileDomainEntity {
  id: string
  userId: string
  fullName?: string
  avatarUrl?: string
  preferredName?: string
  locale?: string
  extra: Record<string, unknown>
  createdAt: Date
}

export interface UserAuthProviderDomainEntity {
  id: string
  userId: string
  provider: string
  providerId?: string
  passwordHash?: string
  mfaEnabled: boolean
  mfaSecret?: string
  backupCodes?: string[]
  createdAt: Date
}

export interface UserRoleDomainEntity {
  id: string
  userId: string
  roleId: string
  scope: Record<string, unknown>
  createdAt: Date
}
```

### Value Objects

```typescript
// modules/user-management/src/domain/value-objects/email.ts

export class Email {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new InvalidEmailError(value)
    }
  }

  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  getValue(): string {
    return this.value.toLowerCase()
  }

  equals(other: Email): boolean {
    return this.getValue() === other.getValue()
  }
}

// modules/user-management/src/domain/value-objects/password.ts

export class Password {
  private readonly MIN_LENGTH = 8
  private readonly REQUIRE_UPPERCASE = true
  private readonly REQUIRE_LOWERCASE = true
  private readonly REQUIRE_NUMBERS = true
  private readonly REQUIRE_SPECIAL_CHARS = true

  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new InvalidPasswordError()
    }
  }

  private isValid(password: string): boolean {
    if (password.length < this.MIN_LENGTH) return false

    if (this.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) return false
    if (this.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) return false
    if (this.REQUIRE_NUMBERS && !/\d/.test(password)) return false
    if (this.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password))
      return false

    return true
  }

  getValue(): string {
    return this.value
  }

  async hash(): Promise<string> {
    // Use BetterAuth's password hashing
    return await this.hashPassword(this.value)
  }

  private async hashPassword(password: string): Promise<string> {
    // Implementation will use BetterAuth's hashing utilities
    return password // Placeholder
  }
}
```

### Domain Events

```typescript
// modules/user-management/src/domain/domain-events.ts

export interface UserCreatedEvent {
  type: 'USER_CREATED'
  userId: string
  tenantId: string
  email: string
  occurredAt: Date
}

export interface UserUpdatedEvent {
  type: 'USER_UPDATED'
  userId: string
  tenantId: string
  changes: Partial<{
    email: string
    phone: string
    isActive: boolean
    metadata: Record<string, unknown>
  }>
  occurredAt: Date
}

export interface UserLoggedInEvent {
  type: 'USER_LOGGED_IN'
  userId: string
  tenantId: string
  ipAddress?: string
  userAgent?: string
  occurredAt: Date
}

export interface MfaEnabledEvent {
  type: 'MFA_ENABLED'
  userId: string
  tenantId: string
  method: 'TOTP'
  occurredAt: Date
}

export interface PasswordResetRequestedEvent {
  type: 'PASSWORD_RESET_REQUESTED'
  userId: string
  tenantId: string
  resetToken: string
  expiresAt: Date
  occurredAt: Date
}
```

### Validation Schemas

```typescript
// modules/user-management/src/domain/validation-schemas.ts

import { z } from 'zod'

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  phone: z
    .string()
    .regex(/^(\+63|0)?[9]\d{10}$/, 'Invalid phone number')
    .optional(),
  tenantId: z.string().uuid('Invalid tenant ID'),
})

export const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  phone: z
    .string()
    .regex(/^(\+63|0)?[9]\d{10}$/, 'Invalid phone number')
    .optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const LoginUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  tenantId: z.string().uuid('Invalid tenant ID').optional(),
})

export const SetupMfaSchema = z.object({
  secret: z.string(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
})

export const VerifyMfaSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  backupCode: z.string().optional(),
})

export const ResetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})
```

## Infrastructure Layer Specifications

### Repository Interfaces

```typescript
// modules/user-management/src/infrastructure/user-repository.ts

export interface IUserRepository {
  // Basic CRUD operations
  create(data: CreateUserSchema): Promise<UserDomainEntity>
  findById(id: string): Promise<UserDomainEntity | null>
  findByEmail(
    email: string,
    tenantId?: string,
  ): Promise<UserDomainEntity | null>
  update(id: string, data: UpdateUserSchema): Promise<UserDomainEntity>
  delete(id: string): Promise<void>

  // Tenant-aware operations
  findByTenant(
    tenantId: string,
    options?: PaginationOptions,
  ): Promise<UserDomainEntity[]>
  countByTenant(tenantId: string): Promise<number>

  // Authentication-specific operations
  findByEmailWithAuth(
    email: string,
    tenantId: string,
  ): Promise<
    | (UserDomainEntity & {
        authProviders: UserAuthProviderDomainEntity[]
      })
    | null
  >

  // Search and filtering
  search(
    query: string,
    tenantId: string,
    options?: SearchOptions,
  ): Promise<UserDomainEntity[]>

  // Bulk operations
  bulkUpdate(
    updates: Array<{ id: string; data: UpdateUserSchema }>,
  ): Promise<UserDomainEntity[]>
}

export interface IUserProfileRepository {
  create(data: CreateUserProfileSchema): Promise<UserProfileDomainEntity>
  findByUserId(userId: string): Promise<UserProfileDomainEntity | null>
  update(
    userId: string,
    data: UpdateUserProfileSchema,
  ): Promise<UserProfileDomainEntity>
  delete(userId: string): Promise<void>
}

export interface IUserAuthProviderRepository {
  create(
    data: CreateUserAuthProviderSchema,
  ): Promise<UserAuthProviderDomainEntity>
  findByUserId(userId: string): Promise<UserAuthProviderDomainEntity[]>
  findByProvider(
    provider: string,
    providerId: string,
  ): Promise<UserAuthProviderDomainEntity | null>
  updateMfa(
    userId: string,
    mfaData: { enabled: boolean; secret?: string; backupCodes?: string[] },
  ): Promise<void>
  delete(id: string): Promise<void>
}
```

### BetterAuth Integration

```typescript
// packages/infrastructure/auth/src/tenant-aware-adapter.ts

import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@pems/database'

export function createTenantAwareAuth(tenantId?: string) {
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID ?? '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google', 'github'],
      },
    },
    advanced: {
      generateId: false, // Use UUIDv7 from the database
      crossSubDomainCookies: {
        enabled: true,
      },
      // Custom hooks for tenant awareness
      hooks: {
        after: [
          {
            matcher(context) {
              return context.path === '/sign-up' || context.path === '/sign-in'
            },
            handler: async (ctx) => {
              // Add tenant context to user creation
              if (tenantId && ctx.user) {
                await prisma.user.update({
                  where: { id: ctx.user.id },
                  data: { tenant_id: tenantId },
                })
              }
            },
          },
        ],
      },
    },
  })
}
```

### MFA Service Implementation

```typescript
// packages/infrastructure/auth/src/mfa-service.ts

import { authenticator } from 'otplib'
import crypto from 'crypto'

export interface IMfaService {
  generateSecret(): string
  generateQRCode(secret: string, email: string): string
  verifyToken(secret: string, token: string): boolean
  generateBackupCodes(): string[]
  verifyBackupCode(backupCodes: string[], code: string): boolean
}

export class MfaService implements IMfaService {
  private readonly issuer = 'PEMS'
  private readonly backupCodeCount = 10

  generateSecret(): string {
    return authenticator.generateSecret()
  }

  generateQRCode(secret: string, email: string): string {
    const otpauth = authenticator.keyuri(email, this.issuer, secret)
    // Use QR code library to generate QR code
    return otpauth // Return QR code data URL
  }

  verifyToken(secret: string, token: string): boolean {
    try {
      return authenticator.verify({ token, secret })
    } catch (error) {
      return false
    }
  }

  generateBackupCodes(): string[] {
    const codes: string[] = []
    for (let i = 0; i < this.backupCodeCount; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
    }
    return codes
  }

  verifyBackupCode(backupCodes: string[], code: string): boolean {
    return backupCodes.includes(code.toUpperCase())
  }
}
```

## Application Layer Specifications

### User Service

```typescript
// modules/user-management/src/application/user-service.ts

export interface IUserService {
  // User management
  createUser(data: CreateUserSchema): Promise<UserDomainEntity>
  getUser(id: string): Promise<UserDomainEntity>
  getUserByEmail(email: string, tenantId: string): Promise<UserDomainEntity>
  updateUser(id: string, data: UpdateUserSchema): Promise<UserDomainEntity>
  deleteUser(id: string): Promise<void>
  listUsers(
    tenantId: string,
    options?: ListUsersOptions,
  ): Promise<PaginatedResult<UserDomainEntity>>

  // Profile management
  getProfile(userId: string): Promise<UserProfileDomainEntity>
  updateProfile(
    userId: string,
    data: UpdateUserProfileSchema,
  ): Promise<UserProfileDomainEntity>

  // Authentication
  authenticateUser(
    email: string,
    password: string,
    tenantId: string,
  ): Promise<AuthenticationResult>
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void>

  // MFA
  setupMfa(userId: string): Promise<MfaSetupResult>
  verifyMfaSetup(userId: string, secret: string, code: string): Promise<void>
  verifyMfaLogin(userId: string, code: string): Promise<boolean>
  disableMfa(userId: string, password: string): Promise<void>

  // Domain events
  getDomainEvents(): DomainEvent[]
  clearDomainEvents(): void
}

export interface AuthenticationResult {
  success: boolean
  user?: UserDomainEntity
  requiresMfa?: boolean
  session?: string
  error?: string
}

export interface MfaSetupResult {
  secret: string
  qrCode: string
  backupCodes: string[]
}

export interface ListUsersOptions {
  page?: number
  limit?: number
  search?: string
  sortBy?: 'name' | 'email' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  isActive?: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
```

### Auth Service

```typescript
// modules/user-management/src/application/auth-service.ts

export interface IAuthService {
  // Registration and login
  register(data: RegisterUserSchema): Promise<RegisterResult>
  login(data: LoginUserSchema): Promise<LoginResult>
  logout(sessionToken: string): Promise<void>
  refreshToken(refreshToken: string): Promise<TokenRefreshResult>

  // Password management
  forgotPassword(email: string, tenantId: string): Promise<void>
  resetPassword(token: string, newPassword: string): Promise<void>
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void>

  // Magic links
  generateMagicLink(email: string, tenantId: string): Promise<string>
  verifyMagicLink(token: string): Promise<MagicLinkResult>

  // Session management
  validateSession(sessionToken: string): Promise<SessionValidationResult>
  invalidateAllSessions(userId: string): Promise<void>
  invalidateSession(sessionToken: string): Promise<void>

  // Email verification
  sendEmailVerification(email: string, tenantId: string): Promise<void>
  verifyEmail(token: string): Promise<void>
}

export interface RegisterResult {
  success: boolean
  user?: UserDomainEntity
  session?: string
  requiresEmailVerification?: boolean
  error?: string
}

export interface LoginResult {
  success: boolean
  user?: UserDomainEntity
  session?: string
  requiresMfa?: boolean
  mfaMethods?: string[]
  error?: string
}

export interface TokenRefreshResult {
  success: boolean
  session?: string
  refreshToken?: string
  error?: string
}

export interface MagicLinkResult {
  success: boolean
  user?: UserDomainEntity
  session?: string
  error?: string
}

export interface SessionValidationResult {
  valid: boolean
  user?: UserDomainEntity
  expiresAt?: Date
  error?: string
}
```

## API Layer Specifications

### Route Handlers

```typescript
// apps/api/src/routes/auth/auth-routes.ts

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { CreateUserSchema, LoginUserSchema } from '@pems/user-management'

export function createAuthRoutes(authService: IAuthService) {
  const app = new Hono()

  // Registration
  app.post('/register', zValidator('json', CreateUserSchema), async (c) => {
    const data = c.req.valid('json')
    const result = await authService.register(data)

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400)
    }

    return c.json({
      success: true,
      data: {
        user: result.user,
        requiresEmailVerification: result.requiresEmailVerification,
      },
    })
  })

  // Login
  app.post('/login', zValidator('json', LoginUserSchema), async (c) => {
    const data = c.req.valid('json')
    const result = await authService.login(data)

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 401)
    }

    // Set session cookie
    if (result.session) {
      c.res.headers.set(
        'Set-Cookie',
        `session=${result.session}; HttpOnly; Secure; Path=/; Max-Age=604800`,
      )
    }

    return c.json({
      success: true,
      data: {
        user: result.user,
        requiresMfa: result.requiresMfa,
        mfaMethods: result.mfaMethods,
      },
    })
  })

  // Logout
  app.post('/logout', async (c) => {
    const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1]
    if (sessionToken) {
      await authService.logout(sessionToken)
    }

    c.res.headers.set(
      'Set-Cookie',
      'session=; HttpOnly; Secure; Path=/; Max-Age=0',
    )
    return c.json({ success: true })
  })

  return app
}
```

### Middleware Implementation

```typescript
// apps/api/src/middleware/auth-middleware.ts

import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { IAuthService } from '@pems/user-management'

export interface AuthContext {
  user: UserDomainEntity
  tenantId: string
  permissions: Permission[]
}

export const authMiddleware = (authService: IAuthService) => {
  return async (c: Context, next: Next) => {
    const sessionToken =
      c.req.header('Authorization')?.replace('Bearer ', '') ||
      c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1]

    if (!sessionToken) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    const validation = await authService.validateSession(sessionToken)
    if (!validation.valid || !validation.user) {
      throw new HTTPException(401, { message: 'Invalid or expired session' })
    }

    // Set auth context
    c.set('auth', {
      user: validation.user,
      tenantId: validation.user.tenantId,
      permissions: [], // Will be populated by RBAC middleware
    } as AuthContext)

    await next()
  }
}

export const requirePermission = (permission: Permission) => {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AuthContext

    if (!auth.permissions.includes(permission)) {
      throw new HTTPException(403, { message: 'Insufficient permissions' })
    }

    await next()
  }
}
```

## UI Components Specifications

### Enhanced Login Form

```typescript
// packages/ui/src/components/auth/login-form.tsx

export interface LoginFormProps {
  onSubmit?: (data: LoginData) => Promise<LoginResult>
  onForgotPassword?: () => void
  onSignUp?: () => void
  onMfaRequired?: (user: User, methods: string[]) => void
  loading?: boolean
  error?: string
  tenantId?: string
}

export interface LoginData {
  email: string
  password: string
  tenantId?: string
  rememberMe?: boolean
}

export interface LoginResult {
  success: boolean
  user?: User
  requiresMfa?: boolean
  mfaMethods?: string[]
  error?: string
}
```

### MFA Setup Component

```typescript
// packages/ui/src/components/auth/mfa-setup-form.tsx

export interface MfaSetupFormProps {
  secret: string
  qrCode: string
  backupCodes: string[]
  onSubmit?: (code: string) => Promise<boolean>
  onCancel?: () => void
  loading?: boolean
  error?: string
}

export interface MfaVerifyFormProps {
  onSubmit?: (code: string, backupCode?: string) => Promise<boolean>
  onResendCode?: () => void
  loading?: boolean
  error?: string
  attempts?: number
  maxAttempts?: number
}
```

## Testing Specifications

### Unit Tests

```typescript
// modules/user-management/tests/user-service.unit.test.ts

describe('UserService', () => {
  let userService: IUserService
  let mockUserRepository: jest.Mocked<IUserRepository>
  let mockMfaService: jest.Mocked<IMfaService>

  beforeEach(() => {
    mockUserRepository = createMockUserRepository()
    mockMfaService = createMockMfaService()
    userService = new UserService(mockUserRepository, mockMfaService)
  })

  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 'tenant-123',
      }

      const result = await userService.createUser(userData)

      expect(result).toBeDefined()
      expect(result.email).toBe(userData.email)
      expect(result.tenantId).toBe(userData.tenantId)
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData)
    })

    it('should throw error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        tenantId: 'tenant-123',
      }

      await expect(userService.createUser(userData)).rejects.toThrow(
        InvalidEmailError,
      )
    })
  })
})
```

### Integration Tests

```typescript
// apps/api/tests/auth.integration.test.ts

describe('Authentication API', () => {
  let app: Hono
  let testDb: PrismaClient

  beforeAll(async () => {
    testDb = new PrismaClient({
      datasources: {
        db: { url: process.env.TEST_DATABASE_URL },
      },
    })
    app = createTestApp(testDb)
  })

  beforeEach(async () => {
    await testDb.user.deleteMany()
    await testDb.tenant.deleteMany()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 'tenant-123',
      }

      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.user.email).toBe(userData.email)
    })
  })
})
```

## Security Implementation Details

### Password Hashing

```typescript
// packages/infrastructure/auth/src/password-service.ts

import bcrypt from 'bcryptjs'

export class PasswordService {
  private readonly SALT_ROUNDS = 12

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS)
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  validatePasswordStrength(password: string): PasswordStrengthResult {
    const result: PasswordStrengthResult = {
      score: 0,
      feedback: [],
    }

    // Length check
    if (password.length >= 8) result.score += 1
    else result.feedback.push('Password must be at least 8 characters')

    // Complexity checks
    if (/[a-z]/.test(password)) result.score += 1
    else result.feedback.push('Include lowercase letters')

    if (/[A-Z]/.test(password)) result.score += 1
    else result.feedback.push('Include uppercase letters')

    if (/\d/.test(password)) result.score += 1
    else result.feedback.push('Include numbers')

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) result.score += 1
    else result.feedback.push('Include special characters')

    return result
  }
}

interface PasswordStrengthResult {
  score: number
  feedback: string[]
}
```

### Rate Limiting

```typescript
// apps/api/src/middleware/rate-limit-middleware.ts

import { Context, Next } from 'hono'
import { Redis } from 'ioredis'

export interface RateLimitOptions {
  windowMs: number
  maxRequests: number
  keyGenerator?: (c: Context) => string
}

export const rateLimitMiddleware = (
  redis: Redis,
  options: RateLimitOptions,
) => {
  return async (c: Context, next: Next) => {
    const key =
      options.keyGenerator?.(c) ||
      `rate-limit:${c.req.header('x-forwarded-for') || 'unknown'}`
    const current = await redis.incr(key)

    if (current === 1) {
      await redis.expire(key, Math.ceil(options.windowMs / 1000))
    }

    if (current > options.maxRequests) {
      return c.json(
        {
          success: false,
          error: 'Too many requests',
        },
        429,
      )
    }

    await next()
  }
}
```

This technical specification provides detailed implementation guidance for developers working on the authentication system, ensuring consistency and adherence to architectural patterns.
