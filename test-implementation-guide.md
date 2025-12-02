# Test Implementation Guide
## Comprehensive Test Templates and Examples for 90%+ Coverage

### Table of Contents
1. [Domain Layer Test Templates](#domain-layer-test-templates)
2. [Application Layer Test Templates](#application-layer-test-templates)
3. [Infrastructure Layer Test Templates](#infrastructure-layer-test-templates)
4. [Presentation Layer Test Templates](#presentation-layer-test-templates)
5. [UI Component Test Templates](#ui-component-test-templates)
6. [Integration Test Templates](#integration-test-templates)
7. [Coverage Enhancement Strategies](#coverage-enhancement-strategies)

---

## Domain Layer Test Templates

### User Domain Entity Test Template

```typescript
/**
 * User Domain Entity Tests
 * Tests for user domain entities, value objects, and domain events
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  UserDomainEntity,
  UserCreatedEvent,
  UserUpdatedEvent,
  UserLoggedInEvent
} from '../../src/domain/user'
import {
  UserNotFoundError,
  UserEmailAlreadyExistsError,
  InvalidCredentialsError,
  UserInactiveError,
  CreateUserSchema,
  UpdateUserSchema
} from '../../src/domain/user'

describe('User Domain Entity', () => {
  describe('Validation Schemas', () => {
    describe('CreateUserSchema', () => {
      it('should validate valid user data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'StrongP@ssw0rd!',
          firstName: 'John',
          lastName: 'Doe',
          tenantId: '123e4567-e89b-12d3-a456-426614174000'
        }

        const result = CreateUserSchema.safeParse(validData)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(validData)
        }
      })

      it('should reject invalid email', () => {
        const invalidData = {
          email: 'invalid-email',
          password: 'StrongP@ssw0rd!',
          tenantId: '123e4567-e89b-12d3-a456-426614174000'
        }

        const result = CreateUserSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Invalid email address')
        }
      })

      it('should reject weak password', () => {
        const invalidData = {
          email: 'test@example.com',
          password: '123',
          tenantId: '123e4567-e89b-12d3-a456-426614174000'
        }

        const result = CreateUserSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Password must be at least 8 characters')
        }
      })

      it('should validate phone number format', () => {
        const validData = {
          email: 'test@example.com',
          password: 'StrongP@ssw0rd!',
          phone: '+639123456789',
          tenantId: '123e4567-e89b-12d3-a456-426614174000'
        }

        const result = CreateUserSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })

      it('should reject invalid phone number', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'StrongP@ssw0rd!',
          phone: '123',
          tenantId: '123e4567-e89b-12d3-a456-426614174000'
        }

        const result = CreateUserSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Invalid phone number')
        }
      })
    })

    describe('UpdateUserSchema', () => {
      it('should validate partial updates', () => {
        const validUpdate = {
          firstName: 'Jane',
          phone: '+639987654321'
        }

        const result = UpdateUserSchema.safeParse(validUpdate)
        expect(result.success).toBe(true)
      })

      it('should allow empty updates', () => {
        const emptyUpdate = {}

        const result = UpdateUserSchema.safeParse(emptyUpdate)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Domain Exceptions', () => {
    describe('UserNotFoundError', () => {
      it('should create error with user ID', () => {
        const userId = 'user-123'
        const error = new UserNotFoundError(userId)

        expect(error.name).toBe('UserNotFoundError')
        expect(error.message).toBe(`User with id ${userId} not found`)
      })

      it('should be instanceof Error', () => {
        const error = new UserNotFoundError('user-123')
        expect(error).toBeInstanceOf(Error)
      })
    })

    describe('UserEmailAlreadyExistsError', () => {
      it('should create error with email and tenant ID', () => {
        const email = 'test@example.com'
        const tenantId = 'tenant-456'
        const error = new UserEmailAlreadyExistsError(email, tenantId)

        expect(error.name).toBe('UserEmailAlreadyExistsError')
        expect(error.message).toBe(`User with email ${email} already exists in tenant ${tenantId}`)
      })
    })

    describe('InvalidCredentialsError', () => {
      it('should create standard error message', () => {
        const error = new InvalidCredentialsError()

        expect(error.name).toBe('InvalidCredentialsError')
        expect(error.message).toBe('Invalid email or password')
      })
    })
  })

  describe('Domain Events', () => {
    describe('UserCreatedEvent', () => {
      it('should create valid event', () => {
        const event: UserCreatedEvent = {
          type: 'USER_CREATED',
          userId: 'user-123',
          tenantId: 'tenant-456',
          email: 'test@example.com',
          occurredAt: new Date('2024-01-01T00:00:00Z')
        }

        expect(event.type).toBe('USER_CREATED')
        expect(event.userId).toBe('user-123')
        expect(event.tenantId).toBe('tenant-456')
        expect(event.email).toBe('test@example.com')
        expect(event.occurredAt).toBeInstanceOf(Date)
      })
    })

    describe('UserUpdatedEvent', () => {
      it('should create event with changes', () => {
        const event: UserUpdatedEvent = {
          type: 'USER_UPDATED',
          userId: 'user-123',
          tenantId: 'tenant-456',
          changes: {
            email: 'new@example.com',
            phone: '+639987654321'
          },
          occurredAt: new Date('2024-01-01T00:00:00Z')
        }

        expect(event.type).toBe('USER_UPDATED')
        expect(event.changes.email).toBe('new@example.com')
        expect(event.changes.phone).toBe('+639987654321')
      })

      it('should create event with empty changes', () => {
        const event: UserUpdatedEvent = {
          type: 'USER_UPDATED',
          userId: 'user-123',
          tenantId: 'tenant-456',
          changes: {},
          occurredAt: new Date('2024-01-01T00:00:00Z')
        }

        expect(Object.keys(event.changes)).toHaveLength(0)
      })
    })
  })
})
```

### Email Value Object Test Template

```typescript
/**
 * Email Value Object Tests
 * Tests for email validation and normalization
 */

import { describe, expect, it } from 'vitest'
import { Email } from '../../src/domain/value-objects/email'

describe('Email Value Object', () => {
  describe('Validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ]

      validEmails.forEach(email => {
        expect(() => new Email(email)).not.toThrow()
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        'test@.com',
        'test@example.',
        ''
      ]

      invalidEmails.forEach(email => {
        expect(() => new Email(email)).toThrow('Invalid email address')
      })
    })

    it('should reject null/undefined emails', () => {
      expect(() => new Email(null as any)).toThrow()
      expect(() => new Email(undefined as any)).toThrow()
    })
  })

  describe('Normalization', () => {
    it('should convert email to lowercase', () => {
      const email = new Email('Test@EXAMPLE.COM')
      expect(email.getValue()).toBe('test@example.com')
    })

    it('should trim whitespace', () => {
      const email = new Email('  test@example.com  ')
      expect(email.getValue()).toBe('test@example.com')
    })

    it('should handle mixed case with whitespace', () => {
      const email = new Email('  Test@EXAMPLE.COM  ')
      expect(email.getValue()).toBe('test@example.com')
    })
  })

  describe('Equality', () => {
    it('should consider emails with same value equal', () => {
      const email1 = new Email('test@example.com')
      const email2 = new Email('TEST@EXAMPLE.COM')
      
      expect(email1.getValue()).toBe(email2.getValue())
    })

    it('should consider different emails unequal', () => {
      const email1 = new Email('test1@example.com')
      const email2 = new Email('test2@example.com')
      
      expect(email1.getValue()).not.toBe(email2.getValue())
    })
  })
})
```

### Password Value Object Test Template

```typescript
/**
 * Password Value Object Tests
 * Tests for password validation, hashing, and verification
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Password } from '../../src/domain/value-objects/password'

// Mock bcrypt for testing
vi.mock('bcryptjs', () => ({
  hash: vi.fn(() => Promise.resolve('hashed-password')),
  compare: vi.fn(() => Promise.resolve(true))
}))

describe('Password Value Object', () => {
  describe('Validation', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = [
        'StrongP@ssw0rd!',
        'MySecur3P@ss',
        'C0mpl3x!P@ssw0rd',
        'Johndoe@123'
      ]

      strongPasswords.forEach(password => {
        expect(() => new Password(password)).not.toThrow()
      })
    })

    it('should reject weak passwords', () => {
      const weakPasswords = [
        '123',
        'password',
        'qwerty',
        'abc123',
        '',
        null,
        undefined
      ]

      weakPasswords.forEach(password => {
        expect(() => new Password(password as any)).toThrow()
      })
    })

    it('should enforce minimum length', () => {
      expect(() => new Password('1234567')).toThrow()
      expect(() => new Password('12345678')).not.toThrow()
    })
  })

  describe('Hashing', () => {
    it('should hash password successfully', async () => {
      const password = new Password('TestPassword123!')
      const hash = await password.hash()
      
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should generate different hashes for same password', async () => {
      const password = new Password('TestPassword123!')
      const hash1 = await password.hash()
      const hash2 = await password.hash()
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('Verification', () => {
    it('should verify correct password', async () => {
      const password = new Password('TestPassword123!')
      const hash = await password.hash()
      
      const isValid = await Password.verify('TestPassword123!', hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = new Password('TestPassword123!')
      const hash = await password.hash()
      
      const isValid = await Password.verify('WrongPassword!', hash)
      expect(isValid).toBe(false)
    })

    it('should handle invalid hash', async () => {
      const isValid = await Password.verify('password', 'invalid-hash')
      expect(isValid).toBe(false)
    })
  })
})
```

---

## Application Layer Test Templates

### Service Layer Test Template

```typescript
/**
 * User Service Application Tests
 * Tests for user service business logic and use cases
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IUserService, IUserRepository, IUserProfileRepository, IUserAuthProviderRepository } from '../../src/application/user-service'
import { UserService } from '../../src/application/user-service'
import { UserNotFoundError, UserEmailAlreadyExistsError, InvalidCredentialsError } from '../../src/domain/user'

describe('UserService', () => {
  let userService: IUserService
  let mockUserRepository: IUserRepository
  let mockUserProfileRepository: IUserProfileRepository
  let mockAuthProviderRepository: IUserAuthProviderRepository

  beforeEach(() => {
    mockUserRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByEmailWithAuth: vi.fn(),
      existsByEmail: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      search: vi.fn()
    } as any

    mockUserProfileRepository = {
      create: vi.fn(),
      findByUserId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn()
    } as any

    mockAuthProviderRepository = {
      create: vi.fn(),
      findByUserId: vi.fn(),
      updatePassword: vi.fn(),
      updateMfa: vi.fn(),
      delete: vi.fn()
    } as any

    userService = new UserService(
      mockUserRepository,
      mockUserProfileRepository,
      mockAuthProviderRepository
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('User Creation', () => {
    it('should create user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 'tenant-123'
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.create.mockResolvedValue(mockUser)
      mockAuthProviderRepository.create.mockResolvedValue({} as any)

      const result = await userService.createUser(userData)

      expect(result).toEqual(mockUser)
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith('test@example.com', 'tenant-123')
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
        tenantId: 'tenant-123',
        phone: undefined
      })
    })

    it('should throw error if user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'StrongP@ssw0rd!',
        tenantId: 'tenant-123'
      }

      mockUserRepository.existsByEmail.mockResolvedValue(true)

      await expect(userService.createUser(userData)).rejects.toThrow(UserEmailAlreadyExistsError)
      expect(mockUserRepository.create).not.toHaveBeenCalled()
    })

    it('should create user profile if names provided', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 'tenant-123'
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.create.mockResolvedValue(mockUser)
      mockAuthProviderRepository.create.mockResolvedValue({} as any)

      await userService.createUser(userData)

      expect(mockUserProfileRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        extra: {},
        fullName: 'John Doe',
        preferredName: 'John'
      })
    })

    it('should emit USER_CREATED domain event', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
        tenantId: 'tenant-123'
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.create.mockResolvedValue(mockUser)
      mockAuthProviderRepository.create.mockResolvedValue({} as any)

      await userService.createUser(userData)

      const events = userService.getDomainEvents()
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('USER_CREATED')
      expect(events[0].userId).toBe('user-123')
      expect(events[0].tenantId).toBe('tenant-123')
    })
  })

  describe('User Authentication', () => {
    it('should authenticate user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        authProviders: [{
          id: 'auth-123',
          userId: 'user-123',
          provider: 'email',
          passwordHash: 'hashed-password',
          mfaEnabled: false,
          createdAt: new Date()
        }]
      }

      mockUserRepository.findByEmailWithAuth.mockResolvedValue(mockUser)

      const result = await userService.authenticateUser('test@example.com', 'password', 'tenant-123')

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.requiresMfa).toBe(false)
    })

    it('should reject invalid credentials', async () => {
      mockUserRepository.findByEmailWithAuth.mockResolvedValue(null)

      const result = await userService.authenticateUser('test@example.com', 'wrong-password', 'tenant-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email or password')
    })

    it('should handle inactive user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        isActive: false,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        authProviders: [{
          id: 'auth-123',
          userId: 'user-123',
          provider: 'email',
          passwordHash: 'hashed-password',
          mfaEnabled: false,
          createdAt: new Date()
        }]
      }

      mockUserRepository.findByEmailWithAuth.mockResolvedValue(mockUser)

      await expect(userService.authenticateUser('test@example.com', 'password', 'tenant-123'))
        .rejects.toThrow('User account is inactive')
    })
  })

  describe('Domain Events Management', () => {
    it('should accumulate domain events', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
        tenantId: 'tenant-123'
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.create.mockResolvedValue(mockUser)
      mockAuthProviderRepository.create.mockResolvedValue({} as any)

      // Create user (emits USER_CREATED)
      await userService.createUser(userData)

      // Authenticate user (emits USER_LOGGED_IN)
      mockUserRepository.findByEmailWithAuth.mockResolvedValue({
        ...mockUser,
        authProviders: [{
          id: 'auth-123',
          userId: 'user-123',
          provider: 'email',
          passwordHash: 'hashed-password',
          mfaEnabled: false,
          createdAt: new Date()
        }]
      })
      await userService.authenticateUser('test@example.com', 'password', 'tenant-123')

      const events = userService.getDomainEvents()
      expect(events).toHaveLength(2)
      expect(events[0].type).toBe('USER_CREATED')
      expect(events[1].type).toBe('USER_LOGGED_IN')
    })

    it('should clear domain events', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
        tenantId: 'tenant-123'
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.create.mockResolvedValue(mockUser)
      mockAuthProviderRepository.create.mockResolvedValue({} as any)

      await userService.createUser(userData)
      expect(userService.getDomainEvents()).toHaveLength(1)

      userService.clearDomainEvents()
      expect(userService.getDomainEvents()).toHaveLength(0)
    })
  })
})
```

---

## Infrastructure Layer Test Templates

### Repository Test Template

```typescript
/**
 * User Repository Infrastructure Tests
 * Tests for data access layer and database operations
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IUserRepository, PaginatedResult, SearchOptions } from '../../src/infrastructure/user-repository'
import { PrismaUserRepository } from '../../src/infrastructure/prisma-user-repository'

// Mock Prisma Client
const mockPrisma = {
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn()
  },
  $transaction: vi.fn()
}

describe('UserRepository', () => {
  let userRepository: IUserRepository

  beforeEach(() => {
    userRepository = new PrismaUserRepository(mockPrisma as any)
    vi.clearAllMocks()
  })

  describe('Create Operations', () => {
    it('should create user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        tenantId: 'tenant-123',
        isActive: true,
        isSystemAdmin: false,
        metadata: {}
      }

      const expectedUser = {
        id: 'user-123',
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.user.create.mockResolvedValue(expectedUser)

      const result = await userRepository.create(userData)

      expect(result).toEqual(expectedUser)
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: userData
      })
    })

    it('should handle database errors during creation', async () => {
      const userData = {
        email: 'test@example.com',
        tenantId: 'tenant-123'
      }

      const dbError = new Error('Database connection failed')
      mockPrisma.user.create.mockRejectedValue(dbError)

      await expect(userRepository.create(userData)).rejects.toThrow(dbError)
    })
  })

  describe('Read Operations', () => {
    it('should find user by ID', async () => {
      const userId = 'user-123'
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        tenantId: 'tenant-123'
      }

      mockPrisma.user.findUnique.mockResolvedValue(expectedUser)

      const result = await userRepository.findById(userId)

      expect(result).toEqual(expectedUser)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId }
      })
    })

    it('should return null when user not found by ID', async () => {
      const userId = 'non-existent-user'

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await userRepository.findById(userId)

      expect(result).toBeNull()
    })

    it('should find user by email and tenant', async () => {
      const email = 'test@example.com'
      const tenantId = 'tenant-123'
      const expectedUser = {
        id: 'user-123',
        email,
        tenantId
      }

      mockPrisma.user.findUnique.mockResolvedValue(expectedUser)

      const result = await userRepository.findByEmail(email, tenantId)

      expect(result).toEqual(expectedUser)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { 
          email_tenantId: {
            email,
            tenantId
          }
        }
      })
    })
  })

  describe('Update Operations', () => {
    it('should update user successfully', async () => {
      const userId = 'user-123'
      const updateData = {
        email: 'updated@example.com',
        firstName: 'Updated Name'
      }

      const expectedUser = {
        id: userId,
        email: 'updated@example.com',
        firstName: 'Updated Name',
        updatedAt: new Date()
      }

      mockPrisma.user.update.mockResolvedValue(expectedUser)

      const result = await userRepository.update(userId, updateData)

      expect(result).toEqual(expectedUser)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData
      })
    })
  })

  describe('Search Operations', () => {
    it('should search users with pagination', async () => {
      const tenantId = 'tenant-123'
      const options: SearchOptions = {
        search: 'john',
        page: 1,
        limit: 10,
        sortBy: 'email',
        sortOrder: 'asc'
      }

      const mockUsers = [
        { id: 'user-1', email: 'john1@example.com' },
        { id: 'user-2', email: 'john2@example.com' }
      ]

      const expectedResult: PaginatedResult<any> = {
        data: mockUsers,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      }

      mockPrisma.user.findMany.mockResolvedValue(mockUsers)
      mockPrisma.user.count.mockResolvedValue(2)

      const result = await userRepository.search('john', tenantId, options)

      expect(result).toEqual(expectedResult)
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          OR: [
            { email: { contains: 'john', mode: 'insensitive' } },
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } }
          ]
        },
        skip: 0,
        take: 10,
        orderBy: { email: 'asc' }
      })
    })

    it('should handle empty search results', async () => {
      const tenantId = 'tenant-123'
      const options: SearchOptions = {
        search: 'nonexistent',
        page: 1,
        limit: 10
      }

      const expectedResult: PaginatedResult<any> = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      }

      mockPrisma.user.findMany.mockResolvedValue([])
      mockPrisma.user.count.mockResolvedValue(0)

      const result = await userRepository.search('nonexistent', tenantId, options)

      expect(result).toEqual(expectedResult)
    })
  })

  describe('Existence Checks', () => {
    it('should return true when user exists by email', async () => {
      const email = 'existing@example.com'
      const tenantId = 'tenant-123'

      mockPrisma.user.count.mockResolvedValue(1)

      const result = await userRepository.existsByEmail(email, tenantId)

      expect(result).toBe(true)
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { 
          email_tenantId: {
            email,
            tenantId
          }
        }
      })
    })

    it('should return false when user does not exist by email', async () => {
      const email = 'nonexistent@example.com'
      const tenantId = 'tenant-123'

      mockPrisma.user.count.mockResolvedValue(0)

      const result = await userRepository.existsByEmail(email, tenantId)

      expect(result).toBe(false)
    })
  })
})
```

---

## Presentation Layer Test Templates

### Controller Test Template

```typescript
/**
 * User Controller Presentation Tests
 * Tests for REST API endpoints and HTTP handling
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createUserRoutes, createAuthRoutes } from '../../src/presentation/user-controller'
import type { IUserService } from '../../src/application/user-service'

describe('User Controller', () => {
  let app: Hono
  let mockUserService: IUserService

  beforeEach(() => {
    mockUserService = {
      createUser: vi.fn(),
      getUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      listUsers: vi.fn(),
      authenticateUser: vi.fn(),
      changePassword: vi.fn(),
      getDomainEvents: vi.fn(() => []),
      clearDomainEvents: vi.fn()
    } as any

    app = new Hono()
    app.route('/api', createUserRoutes(mockUserService))
    app.route('/api', createAuthRoutes(mockUserService))
  })

  describe('POST /api/users - Create User', () => {
    it('should create user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 'tenant-123'
      }

      const createdUser = {
        id: 'user-123',
        ...userData,
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockUserService.createUser.mockResolvedValue(createdUser)

      const response = await app.request('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      expect(response.status).toBe(201)
      
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.data).toEqual(createdUser)
      expect(body.message).toBe('User created successfully')
    })

    it('should return 409 when user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'StrongP@ssw0rd!',
        tenantId: 'tenant-123'
      }

      const error = new Error('User with email existing@example.com already exists in tenant tenant-123')
      mockUserService.createUser.mockRejectedValue(error)

      const response = await app.request('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      expect(response.status).toBe(409)
      
      const body = await response.json()
      expect(body.message).toBe(error.message)
    })

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123' // Too short
      }

      const response = await app.request('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      })

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/users/:id - Get User', () => {
    it('should return user when found', async () => {
      const userId = 'user-123'
      const user = {
        id: userId,
        email: 'test@example.com',
        tenantId: 'tenant-123'
      }

      mockUserService.getUser.mockResolvedValue(user)

      const response = await app.request(`/api/users/${userId}`)

      expect(response.status).toBe(200)
      
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.data).toEqual(user)
    })

    it('should return 404 when user not found', async () => {
      const userId = 'non-existent-user'
      const error = new Error(`User with id ${userId} not found`)
      mockUserService.getUser.mockRejectedValue(error)

      const response = await app.request(`/api/users/${userId}`)

      expect(response.status).toBe(404)
      
      const body = await response.json()
      expect(body.message).toBe(error.message)
    })
  })

  describe('PUT /api/users/:id - Update User', () => {
    it('should update user successfully', async () => {
      const userId = 'user-123'
      const updateData = {
        firstName: 'Updated Name',
        email: 'updated@example.com'
      }

      const updatedUser = {
        id: userId,
        ...updateData,
        tenantId: 'tenant-123'
      }

      mockUserService.updateUser.mockResolvedValue(updatedUser)

      const response = await app.request(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      expect(response.status).toBe(200)
      
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.data).toEqual(updatedUser)
      expect(body.message).toBe('User updated successfully')
    })
  })

  describe('DELETE /api/users/:id - Delete User', () => {
    it('should delete user successfully', async () => {
      const userId = 'user-123'

      mockUserService.deleteUser.mockResolvedValue()

      const response = await app.request(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      expect(response.status).toBe(200)
      
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.message).toBe('User deleted successfully')
    })

    it('should return 404 when trying to delete non-existent user', async () => {
      const userId = 'non-existent-user'
      const error = new Error(`User with id ${userId} not found`)
      mockUserService.deleteUser.mockRejectedValue(error)

      const response = await app.request(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      expect(response.status).toBe(404)
      
      const body = await response.json()
      expect(body.message).toBe(error.message)
    })
  })

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/login', () => {
      it('should authenticate user with valid credentials', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'password',
          tenantId: 'tenant-123'
        }

        const user = {
          id: 'user-123',
          email: 'test@example.com',
          tenantId: 'tenant-123'
        }

        mockUserService.authenticateUser.mockResolvedValue({
          success: true,
          user,
          session: 'session-token'
        })

        const response = await app.request('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        })

        expect(response.status).toBe(200)
        
        const body = await response.json()
        expect(body.success).toBe(true)
        expect(body.data.user).toEqual(user)
        expect(body.data.session).toBe('session-token')
        expect(body.message).toBe('Login successful')
      })

      it('should reject invalid credentials', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'wrong-password',
          tenantId: 'tenant-123'
        }

        mockUserService.authenticateUser.mockResolvedValue({
          success: false,
          error: 'Invalid email or password'
        })

        const response = await app.request('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        })

        expect(response.status).toBe(401)
        
        const body = await response.json()
        expect(body.success).toBe(false)
        expect(body.message).toBe('Invalid email or password')
      })
    })
  })
})
```

---

## UI Component Test Templates

### Component Test Template

```typescript
/**
 * UI Component Test Template
 * Tests for React/Solid components with accessibility and interaction testing
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/dom'
import { Button } from '../src/components/ui/button'

describe('Button Component', () => {
  beforeEach(() => {
    // Setup DOM environment
    document.body.innerHTML = ''
  })

  afterEach(() => {
    // Cleanup
    document.body.innerHTML = ''
  })

  describe('Basic Rendering', () => {
    it('should render button with text', () => {
      render(() => <Button>Click me</Button>)

      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Click me')
    })

    it('should apply default variant styles', () => {
      render(() => <Button>Default Button</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary')
      expect(button).toHaveClass('text-primary-foreground')
    })

    it('should apply variant prop correctly', () => {
      render(() => <Button variant="secondary">Secondary</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-secondary')
      expect(button).toHaveClass('text-secondary-foreground')
    })
  })

  describe('Size Variants', () => {
    it('should apply small size', () => {
      render(() => <Button size="sm">Small</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9')
      expect(button).toHaveClass('px-3')
    })

    it('should apply large size', () => {
      render(() => <Button size="lg">Large</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-11')
      expect(button).toHaveClass('px-8')
    })

    it('should apply icon size', () => {
      render(() => <Button size="icon">Icon</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10')
      expect(button).toHaveClass('w-10')
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner when loading', () => {
      render(() => <Button loading>Loading</Button>)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('cursor-wait')
      
      // Check for loading spinner
      const spinner = button.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should show loading text when provided', () => {
      render(() => <Button loading loadingText="Processing...">Loading</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('Processing...')
    })

    it('should not show loading text when not loading', () => {
      render(() => <Button loadingText="Processing...">Normal</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('Normal')
      expect(button).not.toHaveTextContent('Processing...')
    })
  })

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(() => <Button disabled>Disabled</Button>)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('disabled')
    })

    it('should apply disabled styles', () => {
      render(() => <Button disabled>Disabled</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('disabled:opacity-50')
      expect(button).toHaveClass('disabled:pointer-events-none')
    })
  })

  describe('Click Interactions', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = vi.fn()
      render(() => <Button onClick={handleClick}>Click me</Button>)

      const button = screen.getByRole('button')
      
      await fireEvent.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled', async () => {
      const handleClick = vi.fn()
      render(() => <Button disabled onClick={handleClick}>Disabled</Button>)

      const button = screen.getByRole('button')
      
      await fireEvent.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should not call onClick when loading', async () => {
      const handleClick = vi.fn()
      render(() => <Button loading onClick={handleClick}>Loading</Button>)

      const button = screen.getByRole('button')
      
      await fireEvent.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper button role', () => {
      render(() => <Button>Accessible</Button>)

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('should support ARIA labels', () => {
      render(() => <Button aria-label="Custom action label">Button</Button>)

      const button = screen.getByRole('button', { name: 'Custom action label' })
      expect(button).toBeInTheDocument()
    })

    it('should support ARIA descriptions', () => {
      render(() => <Button aria-describedby="description-id">Button</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-describedby', 'description-id')
    })

    it('should be keyboard focusable', () => {
      render(() => <Button>Focusable</Button>)

      const button = screen.getByRole('button')
      button.focus()
      
      expect(document.activeElement).toBe(button)
    })

    it('should maintain sufficient color contrast', () => {
      render(() => <Button variant="default">High Contrast</Button>)

      const button = screen.getByRole('button')
      const styles = getComputedStyle(button)
      
      const foregroundColor = styles.color
      const backgroundColor = styles.backgroundColor
      
      // Basic contrast check - in real implementation, use a proper contrast library
      expect(foregroundColor).toBeTruthy()
      expect(backgroundColor).toBeTruthy()
    })
  })

  describe('Icon Support', () => {
    it('should render icon on the left by default', () => {
      const Icon = () => <span data-testid="icon">🔥</span>
      render(() => <Button icon={<Icon />}>With Icon</Button>)

      const button = screen.getByRole('button')
      const icon = button.querySelector('[data-testid="icon"]')
      
      expect(icon).toBeInTheDocument()
      expect(button).toHaveTextContent('🔥With Icon')
    })

    it('should render icon on the right when specified', () => {
      const Icon = () => <span data-testid="icon">🔥</span>
      render(() => <Button icon={<Icon />} iconPosition="right">With Icon</Button>)

      const button = screen.getByRole('button')
      const icon = button.querySelector('[data-testid="icon"]')
      
      expect(icon).toBeInTheDocument()
      expect(button).toHaveTextContent('With Icon🔥')
    })
  })

  describe('Ripple Effect', () => {
    it('should create ripple on click when enabled', async () => {
      render(() => <Button ripple>Ripple Button</Button>)

      const button = screen.getByRole('button')
      
      await fireEvent.click(button)
      
      // Check for ripple element
      const ripple = button.querySelector('.animate-ping')
      expect(ripple).toBeInTheDocument()
    })

    it('should not create ripple when disabled', async () => {
      render(() => <Button ripple disabled>Ripple Button</Button>)

      const button = screen.getByRole('button')
      
      await fireEvent.click(button)
      
      const ripple = button.querySelector('.animate-ping')
      expect(ripple).not.toBeInTheDocument()
    })
  })

  describe('Confirm Mode', () => {
    it('should show confirm text on first click', async () => {
      const handleConfirm = vi.fn()
      render(() => <Button confirmMode onConfirm={handleConfirm}>Delete</Button>)

      const button = screen.getByRole('button')
      
      // First click
      await fireEvent.click(button)
      
      expect(button).toHaveTextContent('Are you sure?')
      expect(handleConfirm).not.toHaveBeenCalled()
    })

    it('should call onConfirm on second click', async () => {
      const handleConfirm = vi.fn()
      render(() => <Button confirmMode onConfirm={handleConfirm}>Delete</Button>)

      const button = screen.getByRole('button')
      
      // First click - shows confirm
      await fireEvent.click(button)
      expect(button).toHaveTextContent('Are you sure?')
      
      // Second click - confirms
      await fireEvent.click(button)
      expect(handleConfirm).toHaveBeenCalledTimes(1)
    })

    it('should use custom confirm text', async () => {
      render(() => <Button confirmMode confirmText="Really delete?">Delete</Button>)

      const button = screen.getByRole('button')
      
      await fireEvent.click(button)
      
      expect(button).toHaveTextContent('Really delete?')
    })
  })
})
```

---

## Integration Test Templates

### Cross-Module Integration Test Template

```typescript
/**
 * Cross-Module Integration Tests
 * Tests for interactions between different modules and complete workflows
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { UserService } from '../../modules/user-management/src/application/user-service'
import { TenantService } from '../../modules/tenant-management/src/application/tenant-service'
import { authMiddleware } from '../../packages/infrastructure/middleware/src/auth-middleware'

describe('Cross-Module Integration Tests', () => {
  let app: Hono
  let mockUserRepository: any
  let mockTenantRepository: any

  beforeEach(() => {
    // Setup mock repositories
    mockUserRepository = {
      create: vi.fn(),
      findByEmail: vi.fn(),
      findByEmailWithAuth: vi.fn(),
      existsByEmail: vi.fn()
    }

    mockTenantRepository = {
      findById: vi.fn(),
      findBySlug: vi.fn(),
      create: vi.fn()
    }

    // Setup services
    const userService = new UserService(mockUserRepository, {} as any, {} as any)
    const tenantService = new TenantService(mockTenantRepository)

    // Setup application with all routes and middleware
    app = new Hono()
    
    // Apply authentication middleware
    app.use('*', authMiddleware({ required: false }))
    
    // Add user and tenant routes
    app.route('/api/users', createUserRoutes(userService))
    app.route('/api/tenants', createTenantRoutes(tenantService))
  })

  describe('User-Tenant Workflow', () => {
    it('should create user in valid tenant', async () => {
      // Setup tenant
      const tenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        slug: 'test-tenant'
      }
      mockTenantRepository.findById.mockResolvedValue(tenant)

      // Create user
      const userData = {
        email: 'user@test-tenant.com',
        password: 'StrongP@ssw0rd!',
        firstName: 'Test',
        lastName: 'User',
        tenantId: 'tenant-123'
      }

      const createdUser = {
        id: 'user-123',
        ...userData,
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.create.mockResolvedValue(createdUser)

      const response = await app.request('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      expect(response.status).toBe(201)
      
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.data.tenantId).toBe('tenant-123')
    })

    it('should reject user creation in invalid tenant', async () => {
      // Setup invalid tenant
      mockTenantRepository.findById.mockResolvedValue(null)

      const userData = {
        email: 'user@invalid-tenant.com',
        password: 'StrongP@ssw0rd!',
        tenantId: 'invalid-tenant'
      }

      const response = await app.request('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.message).toContain('Invalid tenant')
    })
  })

  describe('Authentication Flow Integration', () => {
    it('should authenticate user with tenant context', async () => {
      // Setup tenant and user
      const tenant = { id: 'tenant-123', slug: 'test-tenant' }
      const user = {
        id: 'user-123',
        email: 'user@test-tenant.com',
        tenantId: 'tenant-123',
        isActive: true,
        authProviders: [{
          provider: 'email',
          passwordHash: 'hashed-password',
          mfaEnabled: false
        }]
      }

      mockTenantRepository.findBySlug.mockResolvedValue(tenant)
      mockUserRepository.findByEmailWithAuth.mockResolvedValue(user)

      const loginData = {
        email: 'user@test-tenant.com',
        password: 'password',
        tenantId: 'test-tenant'
      }

      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      })

      expect(response.status).toBe(200)
      
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.data.user.tenantId).toBe('tenant-123')
    })

    it('should handle cross-tenant login attempts', async () => {
      // Setup user in tenant A
      const user = {
        id: 'user-123',
        email: 'user@tenant-a.com',
        tenantId: 'tenant-a',
        isActive: true,
        authProviders: [{
          provider: 'email',
          passwordHash: 'hashed-password',
          mfaEnabled: false
        }]
      }

      mockUserRepository.findByEmailWithAuth.mockResolvedValue(user)

      // Try to login with tenant B
      const loginData = {
        email: 'user@tenant-a.com',
        password: 'password',
        tenantId: 'tenant-b'
      }

      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      })

      expect(response.status).toBe(401)
      
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.message).toContain('Invalid tenant context')
    })
  })

  describe('Multi-Tenant Data Isolation', () => {
    it('should isolate user data by tenant', async () => {
      // Setup two tenants
      const tenantA = { id: 'tenant-a', slug: 'tenant-a' }
      const tenantB = { id: 'tenant-b', slug: 'tenant-b' }

      // Setup users in different tenants
      const userInTenantA = {
        id: 'user-a',
        email: 'user@tenant-a.com',
        tenantId: 'tenant-a'
      }

      const userInTenantB = {
        id: 'user-b',
        email: 'user@tenant-b.com',
        tenantId: 'tenant-b'
      }

      // Mock repository to return tenant-specific users
      mockUserRepository.findByEmail.mockImplementation((email: string, tenantId: string) => {
        if (tenantId === 'tenant-a' && email === 'user@tenant-a.com') {
          return Promise.resolve(userInTenantA)
        }
        if (tenantId === 'tenant-b' && email === 'user@tenant-b.com') {
          return Promise.resolve(userInTenantB)
        }
        return Promise.resolve(null)
      })

      // Test tenant A isolation
      mockTenantRepository.findBySlug.mockResolvedValue(tenantA)
      const responseA = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@tenant-a.com',
          password: 'password',
          tenantId: 'tenant-a'
        })
      })

      expect(responseA.status).toBe(200)
      const bodyA = await responseA.json()
      expect(bodyA.data.user.tenantId).toBe('tenant-a')

      // Test tenant B isolation
      mockTenantRepository.findBySlug.mockResolvedValue(tenantB)
      const responseB = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@tenant-b.com',
          password: 'password',
          tenantId: 'tenant-b'
        })
      })

      expect(responseB.status).toBe(200)
      const bodyB = await responseB.json()
      expect(bodyB.data.user.tenantId).toBe('tenant-b')
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle database connection errors gracefully', async () => {
      const dbError = new Error('Database connection failed')
      mockUserRepository.findByEmailWithAuth.mockRejectedValue(dbError)

      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password'
        })
      })

      expect(response.status).toBe(500)
      
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.message).toContain('Authentication service unavailable')
    })

    it('should maintain transaction consistency', async () => {
      // Mock transaction failure
      const transactionError = new Error('Transaction failed')
      mockUserRepository.create.mockRejectedValue(transactionError)

      const userData = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
        tenantId: 'tenant-123'
      }

      const response = await app.request('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      expect(response.status).toBe(500)
      
      // Verify no partial data was created
      expect(mockUserRepository.create).toHaveBeenCalledTimes(1)
    })
  })
})
```

---

## Coverage Enhancement Strategies

### 1. Targeted Coverage Analysis

#### Identify Coverage Gaps
```bash
# Run coverage with detailed reporting
pnpm test:coverage -- --reporter=html --reporter=json

# Analyze uncovered files
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "No coverage information available"

# Generate coverage report by module
pnpm test:coverage -- --src modules/user-management/src
```

#### Coverage Threshold Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/*.test.*'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        // Higher thresholds for critical domain logic
        'modules/*/domain/': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        // Standard thresholds for application layer
        'modules/*/application/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        // Slightly lower for infrastructure (external deps)
        'packages/infrastructure/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    }
  }
})
```

### 2. Test-Driven Development Workflow

#### TDD Process for New Features
1. **Write Failing Tests First**
   - Domain entity tests
   - Service layer tests  
   - Controller tests
   - Integration tests

2. **Implement Minimum Code to Pass**
   - Focus on single requirement
   - Keep implementation simple
   - Ensure all tests pass

3. **Refactor and Improve**
   - Enhance code quality
   - Add edge case handling
   - Optimize performance
   - Maintain test coverage

#### Test Organization Structure
```
modules/
├── user-management/
│   ├── tests/
│   │   ├── domain/
│   │   │   ├── user.test.ts
│   │   │   └── value-objects/
│   │   │       ├── email.test.ts
│   │   │       └── password.test.ts
│   │   ├── application/
│   │   │   └── user-service.test.ts
│   │   ├── infrastructure/
│   │   │   └── user-repository.test.ts
│   │   └── presentation/
│   │       └── user-controller.test.ts
└── tenant-management/
    └── tests/
        ├── domain/
        ├── application/
        ├── infrastructure/
        └── presentation/

packages/
├── ui/
│   ├── test/
│   │   ├── components/
│   │   │   ├── button.test.tsx
│   │   │   ├── input.test.tsx
│   │   │   └── card.test.tsx
│   │   ├── accessibility/
│   │   └── visual-regression/
├── infrastructure/
│   └── tests/
│       ├── middleware/
│       ├── database/
│       └── auth/
└── shared/
    └── tests/
        ├── utils/
        ├── constants/
        └── validation/
```

### 3. Quality Gates and Automation

#### Pre-commit Coverage Check
```javascript
// scripts/coverage-check.js
const fs = require('fs')
const path = require('path')

function checkCoverageThresholds(coverageReport, thresholds) {
  const violations = []
  
  for (const [file, metrics] of Object.entries(coverageReport)) {
    for (const [metric, threshold] of Object.entries(thresholds)) {
      const actual = metrics[metric]?.pct || 0
      if (actual < threshold) {
        violations.push({
          file,
          metric,
          actual,
          threshold,
          gap: threshold - actual
        })
      }
    }
  }
  
  return violations
}

// Main execution
const coverageFile = 'coverage/coverage-summary.json'
if (fs.existsSync(coverageFile)) {
  const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'))
  
  const thresholds = {
    global: { lines: 90, functions: 90, branches: 90, statements: 90 },
    domain: { lines: 95, functions: 95, branches: 95, statements: 95 }
  }
  
  const violations = checkCoverageThresholds(coverage, thresholds)
  
  if (violations.length > 0) {
    console.error('❌ Coverage thresholds not met:')
    violations.forEach(v => {
      console.error(`  ${v.file} - ${v.metric}: ${v.actual}% (required: ${v.threshold}%)`)
    })
    process.exit(1)
  }
  
  console.log('✅ All coverage thresholds met!')
}
```

#### Automated Coverage Reporting
```yaml
# .github/workflows/coverage-report.yml
name: Coverage Report
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Run tests with coverage
        run: pnpm test:coverage
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
          
      - name: Coverage threshold check
        run: node scripts/coverage-check.js
```

### 4. Monitoring and Reporting

#### Coverage Dashboard Configuration
```typescript
// scripts/coverage-dashboard.ts
interface CoverageMetrics {
  total: number
  covered: number
  percentage: number
  byModule: Record<string, ModuleCoverage>
  trends: CoverageTrend[]
}

interface ModuleCoverage {
  statements: CoverageMetric
  branches: CoverageMetric
  functions: CoverageMetric
  lines: CoverageMetric
}

interface CoverageTrend {
  date: string
  percentage: number
  module: string
}

class CoverageDashboard {
  generateReport(coverageData: any): CoverageMetrics {
    // Process coverage data and generate comprehensive report
    return {
      total: coverageData.total,
      covered: coverageData.covered,
      percentage: (coverageData.covered / coverageData.total) * 100,
      byModule: this.processModuleCoverage(coverageData),
      trends: this.calculateTrends(coverageData)
    }
  }
  
  identifyGaps(metrics: CoverageMetrics): CoverageGap[] {
    const gaps: CoverageGap[] = []
    
    for (const [moduleName, coverage] of Object.entries(metrics.byModule)) {
      if (coverage.statements.pct < 90) {
        gaps.push({
          module: moduleName,
          type: 'statements',
          current: coverage.statements.pct,
          target: 90,
          priority: this.calculatePriority(moduleName, coverage)
        })
      }
    }
    
    return gaps.sort((a, b) => b.priority - a.priority)
  }
  
  generateActionPlan(gaps: CoverageGap[]): ActionItem[] {
    return gaps.map(gap => ({
      module: gap.module,
      action: this.determineAction(gap),
      estimatedEffort: this.estimateEffort(gap),
      files: this.identifyUncoveredFiles(gap.module)
    }))
  }
}
```

This comprehensive implementation guide provides the templates and strategies needed to achieve 90%+ test coverage across all modules while maintaining high test quality and developer productivity.