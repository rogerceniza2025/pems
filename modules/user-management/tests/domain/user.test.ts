/**
 * User Domain Entity Tests
 * Tests for user domain entities, validation schemas, domain events, and exceptions
 */

import { describe, expect, it } from 'vitest'
import type {
  CreateUserAuthProviderInput,
  CreateUserInput,
  CreateUserProfileInput,
  LoginUserInput,
  MfaEnabledEvent,
  PasswordResetRequestedEvent,
  UpdateUserInput,
  UserAuthProviderDomainEntity,
  UserCreatedEvent,
  UserDomainEntity,
  UserDomainEvent,
  UserLoggedInEvent,
  UserProfileDomainEntity,
  UserRoleDomainEntity,
  UserUpdatedEvent
} from '../../src/domain/user'
import {
  CreateUserAuthProviderSchema,
  CreateUserProfileSchema,
  CreateUserSchema,
  InvalidCredentialsError,
  InvalidMfaTokenError,
  InvalidPasswordResetTokenError,
  LoginUserSchema,
  MfaAlreadyEnabledError,
  MfaNotEnabledError,
  MfaRequiredError,
  UpdateUserSchema,
  UserEmailAlreadyExistsError,
  UserInactiveError,
  UserNotFoundError
} from '../../src/domain/user'

describe('User Domain Entity', () => {
  describe('UserDomainEntity Interface', () => {
    it('should have required properties', () => {
      const user: UserDomainEntity = {
        id: 'user-123',
        tenantId: 'tenant-456',
        email: 'test@example.com',
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(user.id).toBe('user-123')
      expect(user.tenantId).toBe('tenant-456')
      expect(user.email).toBe('test@example.com')
      expect(user.isActive).toBe(true)
      expect(user.isSystemAdmin).toBe(false)
      expect(user.metadata).toEqual({})
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('should allow optional phone property', () => {
      const userWithPhone: UserDomainEntity = {
        id: 'user-123',
        tenantId: 'tenant-456',
        email: 'test@example.com',
        phone: '+639123456789',
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(userWithPhone.phone).toBe('+639123456789')
    })

    it('should handle metadata correctly', () => {
      const userWithMetadata: UserDomainEntity = {
        id: 'user-123',
        tenantId: 'tenant-456',
        email: 'test@example.com',
        isActive: true,
        isSystemAdmin: false,
        metadata: {
          department: 'IT',
          role: 'developer',
          preferences: {
            theme: 'dark',
            notifications: true
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(userWithMetadata.metadata.department).toBe('IT')
      expect(userWithMetadata.metadata.role).toBe('developer')
      expect((userWithMetadata.metadata as any).preferences.theme).toBe('dark')
    })
  })

  describe('UserProfileDomainEntity Interface', () => {
    it('should have required properties', () => {
      const profile: UserProfileDomainEntity = {
        id: 'profile-123',
        userId: 'user-456',
        extra: {},
        createdAt: new Date()
      }

      expect(profile.id).toBe('profile-123')
      expect(profile.userId).toBe('user-456')
      expect(profile.createdAt).toBeInstanceOf(Date)
    })

    it('should allow optional profile properties', () => {
      const profile: UserProfileDomainEntity = {
        id: 'profile-123',
        userId: 'user-456',
        fullName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        preferredName: 'John',
        locale: 'en-US',
        extra: {
          bio: 'Software developer',
          skills: ['JavaScript', 'TypeScript']
        },
        createdAt: new Date()
      }

      expect(profile.fullName).toBe('John Doe')
      expect(profile.avatarUrl).toBe('https://example.com/avatar.jpg')
      expect(profile.preferredName).toBe('John')
      expect(profile.locale).toBe('en-US')
      expect(profile.extra.bio).toBe('Software developer')
      expect(profile.extra.skills).toEqual(['JavaScript', 'TypeScript'])
    })
  })

  describe('UserAuthProviderDomainEntity Interface', () => {
    it('should have required properties', () => {
      const authProvider: UserAuthProviderDomainEntity = {
        id: 'auth-123',
        userId: 'user-456',
        provider: 'email',
        mfaEnabled: false,
        createdAt: new Date()
      }

      expect(authProvider.id).toBe('auth-123')
      expect(authProvider.userId).toBe('user-456')
      expect(authProvider.provider).toBe('email')
      expect(authProvider.mfaEnabled).toBe(false)
      expect(authProvider.createdAt).toBeInstanceOf(Date)
    })

    it('should allow optional auth properties', () => {
      const authProvider: UserAuthProviderDomainEntity = {
        id: 'auth-123',
        userId: 'user-456',
        provider: 'google',
        providerId: 'google-123',
        passwordHash: 'hashed-password',
        mfaEnabled: true,
        mfaSecret: 'mfa-secret',
        backupCodes: ['code1', 'code2', 'code3'],
        createdAt: new Date()
      }

      expect(authProvider.providerId).toBe('google-123')
      expect(authProvider.passwordHash).toBe('hashed-password')
      expect(authProvider.mfaEnabled).toBe(true)
      expect(authProvider.mfaSecret).toBe('mfa-secret')
      expect(authProvider.backupCodes).toEqual(['code1', 'code2', 'code3'])
    })
  })

  describe('UserRoleDomainEntity Interface', () => {
    it('should have required properties', () => {
      const userRole: UserRoleDomainEntity = {
        id: 'role-123',
        userId: 'user-456',
        roleId: 'role-789',
        scope: {},
        createdAt: new Date()
      }

      expect(userRole.id).toBe('role-123')
      expect(userRole.userId).toBe('user-456')
      expect(userRole.roleId).toBe('role-789')
      expect(userRole.scope).toEqual({})
      expect(userRole.createdAt).toBeInstanceOf(Date)
    })

    it('should handle scope with permissions', () => {
      const userRole: UserRoleDomainEntity = {
        id: 'role-123',
        userId: 'user-456',
        roleId: 'role-789',
        scope: {
          permissions: ['read', 'write'],
          department: 'IT',
          level: 'admin'
        },
        createdAt: new Date()
      }

      expect(userRole.scope.permissions).toEqual(['read', 'write'])
      expect(userRole.scope.department).toBe('IT')
      expect(userRole.scope.level).toBe('admin')
    })
  })
})

describe('Validation Schemas', () => {
  describe('CreateUserSchema', () => {
    it('should validate valid user creation input', () => {
      const validInput: CreateUserInput = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+639123456789',
        tenantId: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = CreateUserSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should validate user creation with minimal required fields', () => {
      const minimalInput: CreateUserInput = {
        email: 'test@example.com',
        password: 'Password123!',
        tenantId: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = CreateUserSchema.safeParse(minimalInput)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidInput = {
        email: 'invalid-email',
        password: 'Password123!',
        tenantId: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = CreateUserSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address')
      }
    })

    it('should reject short password', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'short',
        tenantId: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = CreateUserSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters')
      }
    })

    it('should reject invalid phone number', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'Password123!',
        phone: '123',
        tenantId: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = CreateUserSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid phone number')
      }
    })

    it('should reject invalid tenant ID', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'Password123!',
        tenantId: 'invalid-uuid'
      }

      const result = CreateUserSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid tenant ID')
      }
    })
  })

  describe('UpdateUserSchema', () => {
    it('should validate valid user update input', () => {
      const validInput: UpdateUserInput = {
        email: 'updated@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+639987654321',
        isActive: false,
        metadata: { department: 'HR' }
      }

      const result = UpdateUserSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should validate partial update input', () => {
      const partialInput: UpdateUserInput = {
        firstName: 'Updated Name'
      }

      const result = UpdateUserSchema.safeParse(partialInput)
      expect(result.success).toBe(true)
    })

    it('should reject empty update input', () => {
      const emptyInput = {}

      const result = UpdateUserSchema.safeParse(emptyInput)
      expect(result.success).toBe(true) // Empty should be valid for partial updates
    })
  })

  describe('LoginUserSchema', () => {
    it('should validate valid login input', () => {
      const validInput: LoginUserInput = {
        email: 'test@example.com',
        password: 'Password123!',
        tenantId: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = LoginUserSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should validate login input without tenant ID', () => {
      const inputWithoutTenant: LoginUserInput = {
        email: 'test@example.com',
        password: 'Password123!'
      }

      const result = LoginUserSchema.safeParse(inputWithoutTenant)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidInput = {
        email: 'invalid-email',
        password: 'Password123!'
      }

      const result = LoginUserSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should reject empty password', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: ''
      }

      const result = LoginUserSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })

  describe('CreateUserProfileSchema', () => {
    it('should validate valid profile creation input', () => {
      const validInput: CreateUserProfileInput = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        fullName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        preferredName: 'John',
        locale: 'en-US',
        extra: { bio: 'Software developer' }
      }

      const result = CreateUserProfileSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should validate minimal profile creation input', () => {
      const minimalInput: CreateUserProfileInput = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        extra: {}
      }

      const result = CreateUserProfileSchema.safeParse(minimalInput)
      expect(result.success).toBe(true)
    })

    it('should reject invalid user ID', () => {
      const invalidInput = {
        userId: 'invalid-uuid'
      }

      const result = CreateUserProfileSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should reject invalid avatar URL', () => {
      const invalidInput = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        avatarUrl: 'invalid-url'
      }

      const result = CreateUserProfileSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })

  describe('CreateUserAuthProviderSchema', () => {
    it('should validate valid auth provider creation input', () => {
      const validInput: CreateUserAuthProviderInput = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        provider: 'google',
        providerId: 'google-123',
        passwordHash: 'hashed-password',
        mfaEnabled: true,
        mfaSecret: 'mfa-secret',
        backupCodes: ['code1', 'code2']
      }

      const result = CreateUserAuthProviderSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should validate minimal auth provider creation input', () => {
      const minimalInput: CreateUserAuthProviderInput = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        provider: 'email',
        mfaEnabled: false
      }

      const result = CreateUserAuthProviderSchema.safeParse(minimalInput)
      expect(result.success).toBe(true)
    })

    it('should reject invalid user ID', () => {
      const invalidInput = {
        userId: 'invalid-uuid',
        provider: 'email'
      }

      const result = CreateUserAuthProviderSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should reject empty provider', () => {
      const invalidInput = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        provider: ''
      }

      const result = CreateUserAuthProviderSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })
})

describe('Domain Events', () => {
  describe('UserCreatedEvent', () => {
    it('should create valid user created event', () => {
      const event: UserCreatedEvent = {
        type: 'USER_CREATED',
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'test@example.com',
        occurredAt: new Date()
      }

      expect(event.type).toBe('USER_CREATED')
      expect(event.userId).toBe('user-123')
      expect(event.tenantId).toBe('tenant-456')
      expect(event.email).toBe('test@example.com')
      expect(event.occurredAt).toBeInstanceOf(Date)
    })
  })

  describe('UserUpdatedEvent', () => {
    it('should create valid user updated event', () => {
      const event: UserUpdatedEvent = {
        type: 'USER_UPDATED',
        userId: 'user-123',
        tenantId: 'tenant-456',
        changes: {
          email: 'updated@example.com',
          isActive: false
        },
        occurredAt: new Date()
      }

      expect(event.type).toBe('USER_UPDATED')
      expect(event.userId).toBe('user-123')
      expect(event.tenantId).toBe('tenant-456')
      expect(event.changes.email).toBe('updated@example.com')
      expect(event.changes.isActive).toBe(false)
      expect(event.occurredAt).toBeInstanceOf(Date)
    })
  })

  describe('UserLoggedInEvent', () => {
    it('should create valid user logged in event', () => {
      const event: UserLoggedInEvent = {
        type: 'USER_LOGGED_IN',
        userId: 'user-123',
        tenantId: 'tenant-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        occurredAt: new Date()
      }

      expect(event.type).toBe('USER_LOGGED_IN')
      expect(event.userId).toBe('user-123')
      expect(event.tenantId).toBe('tenant-456')
      expect(event.ipAddress).toBe('192.168.1.1')
      expect(event.userAgent).toBe('Mozilla/5.0...')
      expect(event.occurredAt).toBeInstanceOf(Date)
    })

    it('should create event without optional fields', () => {
      const event: UserLoggedInEvent = {
        type: 'USER_LOGGED_IN',
        userId: 'user-123',
        tenantId: 'tenant-456',
        occurredAt: new Date()
      }

      expect(event.ipAddress).toBeUndefined()
      expect(event.userAgent).toBeUndefined()
    })
  })

  describe('MfaEnabledEvent', () => {
    it('should create valid MFA enabled event', () => {
      const event: MfaEnabledEvent = {
        type: 'MFA_ENABLED',
        userId: 'user-123',
        tenantId: 'tenant-456',
        method: 'TOTP',
        occurredAt: new Date()
      }

      expect(event.type).toBe('MFA_ENABLED')
      expect(event.userId).toBe('user-123')
      expect(event.tenantId).toBe('tenant-456')
      expect(event.method).toBe('TOTP')
      expect(event.occurredAt).toBeInstanceOf(Date)
    })
  })

  describe('PasswordResetRequestedEvent', () => {
    it('should create valid password reset requested event', () => {
      const event: PasswordResetRequestedEvent = {
        type: 'PASSWORD_RESET_REQUESTED',
        userId: 'user-123',
        tenantId: 'tenant-456',
        resetToken: 'reset-token-123',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        occurredAt: new Date()
      }

      expect(event.type).toBe('PASSWORD_RESET_REQUESTED')
      expect(event.userId).toBe('user-123')
      expect(event.tenantId).toBe('tenant-456')
      expect(event.resetToken).toBe('reset-token-123')
      expect(event.expiresAt).toBeInstanceOf(Date)
      expect(event.occurredAt).toBeInstanceOf(Date)
    })
  })

  describe('UserDomainEvent Union Type', () => {
    it('should accept all user domain event types', () => {
      const events: UserDomainEvent[] = [
        {
          type: 'USER_CREATED',
          userId: 'user-123',
          tenantId: 'tenant-456',
          email: 'test@example.com',
          occurredAt: new Date()
        },
        {
          type: 'USER_UPDATED',
          userId: 'user-123',
          tenantId: 'tenant-456',
          changes: { email: 'updated@example.com' },
          occurredAt: new Date()
        },
        {
          type: 'USER_LOGGED_IN',
          userId: 'user-123',
          tenantId: 'tenant-456',
          occurredAt: new Date()
        },
        {
          type: 'USER_LOGGED_OUT',
          userId: 'user-123',
          tenantId: 'tenant-456',
          occurredAt: new Date()
        },
        {
          type: 'MFA_ENABLED',
          userId: 'user-123',
          tenantId: 'tenant-456',
          method: 'TOTP',
          occurredAt: new Date()
        },
        {
          type: 'MFA_DISABLED',
          userId: 'user-123',
          tenantId: 'tenant-456',
          occurredAt: new Date()
        },
        {
          type: 'PASSWORD_RESET_REQUESTED',
          userId: 'user-123',
          tenantId: 'tenant-456',
          resetToken: 'token',
          expiresAt: new Date(),
          occurredAt: new Date()
        },
        {
          type: 'PASSWORD_CHANGED',
          userId: 'user-123',
          tenantId: 'tenant-456',
          occurredAt: new Date()
        },
        {
          type: 'EMAIL_VERIFIED',
          userId: 'user-123',
          tenantId: 'tenant-456',
          occurredAt: new Date()
        }
      ]

      expect(events).toHaveLength(9)
      events.forEach(event => {
        expect(event.occurredAt).toBeInstanceOf(Date)
        expect(event.userId).toBe('user-123')
        expect(event.tenantId).toBe('tenant-456')
      })
    })
  })
})

describe('Domain Exceptions', () => {
  describe('UserNotFoundError', () => {
    it('should create error with correct message and name', () => {
      const error = new UserNotFoundError('user-123')

      expect(error.message).toBe('User with id user-123 not found')
      expect(error.name).toBe('UserNotFoundError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('UserEmailAlreadyExistsError', () => {
    it('should create error with correct message and name', () => {
      const error = new UserEmailAlreadyExistsError('test@example.com', 'tenant-456')

      expect(error.message).toBe('User with email test@example.com already exists in tenant tenant-456')
      expect(error.name).toBe('UserEmailAlreadyExistsError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('InvalidCredentialsError', () => {
    it('should create error with correct message and name', () => {
      const error = new InvalidCredentialsError()

      expect(error.message).toBe('Invalid email or password')
      expect(error.name).toBe('InvalidCredentialsError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('UserInactiveError', () => {
    it('should create error with correct message and name', () => {
      const error = new UserInactiveError()

      expect(error.message).toBe('User account is inactive')
      expect(error.name).toBe('UserInactiveError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('MfaRequiredError', () => {
    it('should create error with correct message and name', () => {
      const error = new MfaRequiredError()

      expect(error.message).toBe('Multi-factor authentication is required')
      expect(error.name).toBe('MfaRequiredError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('InvalidMfaTokenError', () => {
    it('should create error with correct message and name', () => {
      const error = new InvalidMfaTokenError()

      expect(error.message).toBe('Invalid MFA token')
      expect(error.name).toBe('InvalidMfaTokenError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('MfaAlreadyEnabledError', () => {
    it('should create error with correct message and name', () => {
      const error = new MfaAlreadyEnabledError()

      expect(error.message).toBe('Multi-factor authentication is already enabled')
      expect(error.name).toBe('MfaAlreadyEnabledError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('MfaNotEnabledError', () => {
    it('should create error with correct message and name', () => {
      const error = new MfaNotEnabledError()

      expect(error.message).toBe('Multi-factor authentication is not enabled')
      expect(error.name).toBe('MfaNotEnabledError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('InvalidPasswordResetTokenError', () => {
    it('should create error with correct message and name', () => {
      const error = new InvalidPasswordResetTokenError()

      expect(error.message).toBe('Invalid or expired password reset token')
      expect(error.name).toBe('InvalidPasswordResetTokenError')
      expect(error).toBeInstanceOf(Error)
    })
  })
})

describe('Type Inference', () => {
  it('should correctly infer types from schemas', () => {
    // Test CreateUserInput type inference
    const createUserInput: CreateUserInput = {
      email: 'test@example.com',
      password: 'Password123!',
      tenantId: '123e4567-e89b-12d3-a456-426614174000'
    }
    expect(createUserInput.email).toBe('test@example.com')

    // Test UpdateUserInput type inference
    const updateUserInput: UpdateUserInput = {
      firstName: 'John'
    }
    expect(updateUserInput.firstName).toBe('John')

    // Test LoginUserInput type inference
    const loginUserInput: LoginUserInput = {
      email: 'test@example.com',
      password: 'Password123!'
    }
    expect(loginUserInput.email).toBe('test@example.com')

    // Test CreateUserProfileInput type inference
    const createProfileInput: CreateUserProfileInput = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      extra: {}
    }
    expect(createProfileInput.userId).toBe('123e4567-e89b-12d3-a456-426614174000')

    // Test CreateUserAuthProviderInput type inference
    const createAuthProviderInput: CreateUserAuthProviderInput = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      provider: 'email',
      mfaEnabled: false
    }
    expect(createAuthProviderInput.provider).toBe('email')
  })
})

describe('Integration and Edge Cases', () => {
  it('should handle complex validation scenarios', () => {
    // Test complex user creation with all fields
    const complexUser: CreateUserInput = {
      email: 'john.doe@company.com',
      password: 'VerySecurePassword123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+639123456789',
      tenantId: '123e4567-e89b-12d3-a456-426614174000'
    }

    const result = CreateUserSchema.safeParse(complexUser)
    expect(result.success).toBe(true)
  })

  it('should handle domain event serialization', () => {
    const event: UserCreatedEvent = {
      type: 'USER_CREATED',
      userId: 'user-123',
      tenantId: 'tenant-456',
      email: 'test@example.com',
      occurredAt: new Date('2023-01-01T00:00:00Z')
    }

    const serialized = JSON.stringify(event)
    const parsed = JSON.parse(serialized)

    expect(parsed.type).toBe('USER_CREATED')
    expect(parsed.userId).toBe('user-123')
    expect(parsed.tenantId).toBe('tenant-456')
    expect(parsed.email).toBe('test@example.com')
    expect(parsed.occurredAt).toBe('2023-01-01T00:00:00.000Z')
  })

  it('should handle error inheritance correctly', () => {
    const error = new UserNotFoundError('user-123')

    expect(error instanceof Error).toBe(true)
    expect(error instanceof UserNotFoundError).toBe(true)
    expect(error.name).toBe('UserNotFoundError')
  })

  it('should handle optional fields in domain entities', () => {
    const user: UserDomainEntity = {
      id: 'user-123',
      tenantId: 'tenant-456',
      email: 'test@example.com',
      isActive: true,
      isSystemAdmin: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
      // phone is optional and not provided
    }

    expect(user.phone).toBeUndefined()
  })
})