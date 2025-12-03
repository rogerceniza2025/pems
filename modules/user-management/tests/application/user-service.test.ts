/**
 * User Service Application Layer Unit Tests
 *
 * Comprehensive unit tests for UserService class including:
 * - User CRUD operations
 * - Authentication flows
 * - MFA functionality
 * - Domain events
 * - Error handling
 * - Business logic validation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  UserService,
  type IUserService,
  type ListUsersOptions,
  type MfaSetupResult
} from '../../src/application/user-service'
import {
  InvalidCredentialsError,
  InvalidMfaTokenError,
  UserEmailAlreadyExistsError,
  UserInactiveError,
  UserNotFoundError,
} from '../../src/domain/user'
import type {
  PaginatedResult
} from '../../src/infrastructure'

// Mock value objects
vi.mock('../../src/domain/value-objects/email', () => ({
  Email: class {
    constructor(private email: string) {}
    getValue() { return this.email.toLowerCase() }
  },
}))

vi.mock('../../src/domain/value-objects/password', () => ({
  Password: class {
    constructor(private password: string) {}
    getValue() { return this.password }
    async hash() { return 'hashed-password' }
    static async verify(password: string, hash: string) {
      return mockPasswordVerify(password, hash)
    }
  },
}))

const mockPasswordVerify = vi.fn()

// Mock repositories with proper vi.fn() structure
const mockUserRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findByEmailWithAuth: vi.fn(),
  existsByEmail: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  search: vi.fn(),
} as any

const mockUserProfileRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByUserId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as any

const mockAuthProviderRepository = {
  create: vi.fn(),
  findByUserId: vi.fn(),
  updatePassword: vi.fn(),
  updateMfa: vi.fn(),
  delete: vi.fn(),
} as any

describe('UserService', () => {
  let userService: IUserService

  beforeEach(() => {
    vi.clearAllMocks()
    userService = new UserService(
      mockUserRepository,
      mockUserProfileRepository,
      mockAuthProviderRepository
    )

    // Setup default password verification mock
    mockPasswordVerify.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createMockUser = (overrides = {}) => ({
    id: 'user-123',
    tenantId: 'tenant-456',
    email: 'test@example.com',
    isActive: true,
    isSystemAdmin: false,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  const createMockAuthProviders = (overrides = {}) => [
    {
      id: 'auth-123',
      userId: 'user-123',
      provider: 'email',
      passwordHash: 'hashed-password',
      mfaEnabled: false,
      ...overrides,
    },
  ]

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 'tenant-456',
      }

      const mockUser = createMockUser({ email: 'test@example.com' })
      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.create.mockResolvedValue(mockUser)
      mockAuthProviderRepository.create.mockResolvedValue({} as any)

      const result = await userService.createUser(userData)

      expect(result).toEqual(mockUser)
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith(
        userData.email,
        userData.tenantId
      )
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: userData.password,
        tenantId: userData.tenantId,
        phone: undefined,
      })
      expect(mockUserProfileRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        extra: {},
        fullName: 'John Doe',
        preferredName: 'John',
      })
      expect(mockAuthProviderRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        provider: 'email',
        mfaEnabled: false,
        passwordHash: 'hashed-password',
      })
    })

    it('should throw error if user already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
        tenantId: 'tenant-456',
      }

      mockUserRepository.existsByEmail.mockResolvedValue(true)

      await expect(userService.createUser(userData)).rejects.toThrow(
        UserEmailAlreadyExistsError
      )
    })

    it('should create user without profile if no names provided', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
        tenantId: 'tenant-456',
      }

      const mockUser = createMockUser()
      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.create.mockResolvedValue(mockUser)
      mockAuthProviderRepository.create.mockResolvedValue({} as any)

      await userService.createUser(userData)

      expect(mockUserProfileRepository.create).not.toHaveBeenCalled()
    })

    it('should emit USER_CREATED domain event', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
        tenantId: 'tenant-456',
      }

      const mockUser = createMockUser({ email: 'test@example.com' })
      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.create.mockResolvedValue(mockUser)
      mockAuthProviderRepository.create.mockResolvedValue({} as any)

      await userService.createUser(userData)

      const events = userService.getDomainEvents()
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('USER_CREATED')
      expect(events[0].userId).toBe(mockUser.id)
      expect(events[0].tenantId).toBe(mockUser.tenantId)
    })
  })

  describe('getUser', () => {
    it('should return user when found', async () => {
      const mockUser = createMockUser()
      mockUserRepository.findById.mockResolvedValue(mockUser)

      const result = await userService.getUser('user-123')

      expect(result).toEqual(mockUser)
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123')
    })

    it('should throw UserNotFoundError when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null)

      await expect(userService.getUser('user-123')).rejects.toThrow(
        UserNotFoundError
      )
    })
  })

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = createMockUser()
      mockUserRepository.findByEmail.mockResolvedValue(mockUser)

      const result = await userService.getUserByEmail('test@example.com', 'tenant-456')

      expect(result).toEqual(mockUser)
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com', 'tenant-456')
    })

    it('should throw UserNotFoundError when user not found by email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null)

      await expect(
        userService.getUserByEmail('test@example.com', 'tenant-456')
      ).rejects.toThrow(UserNotFoundError)
    })
  })

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const existingUser = createMockUser({ email: 'old@example.com' })
      const updatedUser = createMockUser({ email: 'new@example.com' })

      mockUserRepository.findById.mockResolvedValue(existingUser)
      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.update.mockResolvedValue(updatedUser)

      const updateData = { email: 'new@example.com' }
      const result = await userService.updateUser('user-123', updateData)

      expect(result).toEqual(updatedUser)
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-123', updateData)
    })

    it('should throw error if updating to existing email', async () => {
      const existingUser = createMockUser({ email: 'old@example.com' })
      mockUserRepository.findById.mockResolvedValue(existingUser)
      mockUserRepository.existsByEmail.mockResolvedValue(true)

      const updateData = { email: 'existing@example.com' }

      await expect(userService.updateUser('user-123', updateData)).rejects.toThrow(
        UserEmailAlreadyExistsError
      )
    })

    it('should emit USER_UPDATED event with actual changes', async () => {
      const existingUser = createMockUser({ email: 'old@example.com' })
      const updatedUser = createMockUser({ email: 'new@example.com' })

      mockUserRepository.findById.mockResolvedValue(existingUser)
      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.update.mockResolvedValue(updatedUser)

      await userService.updateUser('user-123', { email: 'new@example.com' })

      const events = userService.getDomainEvents()
      const updateEvent = events.find(e => e.type === 'USER_UPDATED')
      expect(updateEvent).toBeDefined()
      if (updateEvent) {
        expect(updateEvent.userId).toBe('user-123')
        expect(updateEvent.changes.email).toBe('new@example.com')
      }
    })

    it('should not emit event if no actual changes', async () => {
      const existingUser = createMockUser()
      mockUserRepository.findById.mockResolvedValue(existingUser)
      mockUserRepository.update.mockResolvedValue(existingUser)

      await userService.updateUser('user-123', {})

      const events = userService.getDomainEvents()
      const updateEvents = events.filter(e => e.type === 'USER_UPDATED')
      expect(updateEvents).toHaveLength(0)
    })
  })

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const mockUser = createMockUser()
      mockUserRepository.findById.mockResolvedValue(mockUser)
      mockUserRepository.delete.mockResolvedValue()

      await userService.deleteUser('user-123')

      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-123')
    })

    it('should throw error if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null)

      await expect(userService.deleteUser('user-123')).rejects.toThrow(
        UserNotFoundError
      )
    })
  })

  describe('listUsers', () => {
    it('should return paginated users with default options', async () => {
      const mockResult: PaginatedResult<any> = {
        data: [createMockUser()],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      }

      mockUserRepository.search.mockResolvedValue(mockResult)

      const result = await userService.listUsers('tenant-456')

      expect(result).toEqual(mockResult)
      expect(mockUserRepository.search).toHaveBeenCalledWith('', 'tenant-456', {
        search: '',
        sortBy: 'email',
        sortOrder: 'asc',
      })
    })

    it('should return paginated users with custom options', async () => {
      const options: ListUsersOptions = {
        page: 2,
        limit: 20,
        search: 'john',
        sortBy: 'name',
        sortOrder: 'desc',
        isActive: true,
      }

      const mockResult: PaginatedResult<any> = {
        data: [],
        total: 0,
        page: 2,
        limit: 20,
        totalPages: 0,
      }

      mockUserRepository.search.mockResolvedValue(mockResult)

      await userService.listUsers('tenant-456', options)

      expect(mockUserRepository.search).toHaveBeenCalledWith('', 'tenant-456', {
        search: 'john',
        sortBy: 'name',
        sortOrder: 'desc',
        page: 2,
        limit: 20,
        isActive: true,
      })
    })
  })

  describe('authenticateUser', () => {
    it('should authenticate user successfully', async () => {
      const mockUser = createMockUser()
      const mockAuthProviders = createMockAuthProviders()
      const userWithAuth = { ...mockUser, authProviders: mockAuthProviders }

      mockUserRepository.findByEmailWithAuth.mockResolvedValue(userWithAuth)
      mockPasswordVerify.mockResolvedValue(true)

      const result = await userService.authenticateUser(
        'test@example.com',
        'password',
        'tenant-456'
      )

      expect(result).toEqual({
        success: true,
        user: userWithAuth,
      })
      expect(mockPasswordVerify).toHaveBeenCalledWith('password', 'hashed-password')
    })

    it('should return error for invalid credentials', async () => {
      mockUserRepository.findByEmailWithAuth.mockResolvedValue(null)

      const result = await userService.authenticateUser(
        'test@example.com',
        'wrong-password',
        'tenant-456'
      )

      expect(result).toEqual({
        success: false,
        error: 'Invalid email or password',
      })
    })

    it('should throw UserInactiveError for inactive user', async () => {
      const mockUser = createMockUser({ isActive: false })
      const mockAuthProviders = createMockAuthProviders()
      const userWithAuth = { ...mockUser, authProviders: mockAuthProviders }

      mockUserRepository.findByEmailWithAuth.mockResolvedValue(userWithAuth)

      await expect(
        userService.authenticateUser('test@example.com', 'password', 'tenant-456')
      ).rejects.toThrow(UserInactiveError)
    })

    it('should return MFA required for user with MFA enabled', async () => {
      const mockUser = createMockUser()
      const mockAuthProviders = createMockAuthProviders({ mfaEnabled: true })
      const userWithAuth = { ...mockUser, authProviders: mockAuthProviders }

      mockUserRepository.findByEmailWithAuth.mockResolvedValue(userWithAuth)
      mockPasswordVerify.mockResolvedValue(true)

      const result = await userService.authenticateUser(
        'test@example.com',
        'password',
        'tenant-456'
      )

      expect(result).toEqual({
        success: true,
        user: userWithAuth,
        requiresMfa: true,
      })
    })

    it('should return error for user without password auth', async () => {
      const mockUser = createMockUser()
      const mockAuthProviders = createMockAuthProviders({ passwordHash: undefined })
      const userWithAuth = { ...mockUser, authProviders: mockAuthProviders }

      mockUserRepository.findByEmailWithAuth.mockResolvedValue(userWithAuth)

      const result = await userService.authenticateUser(
        'test@example.com',
        'password',
        'tenant-456'
      )

      expect(result).toEqual({
        success: false,
        error: 'No password authentication method configured',
      })
    })

    it('should emit USER_LOGGED_IN event on successful authentication', async () => {
      const mockUser = createMockUser()
      const mockAuthProviders = createMockAuthProviders()
      const userWithAuth = { ...mockUser, authProviders: mockAuthProviders }

      mockUserRepository.findByEmailWithAuth.mockResolvedValue(userWithAuth)
      mockPasswordVerify.mockResolvedValue(true)

      await userService.authenticateUser('test@example.com', 'password', 'tenant-456')

      const events = userService.getDomainEvents()
      const loginEvent = events.find(e => e.type === 'USER_LOGGED_IN')
      expect(loginEvent).toBeDefined()
      if (loginEvent) {
        expect(loginEvent.userId).toBe(mockUser.id)
        expect(loginEvent.tenantId).toBe(mockUser.tenantId)
      }
    })
  })

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = createMockUser()
      const mockAuthProviders = createMockAuthProviders()

      mockUserRepository.findById.mockResolvedValue(mockUser)
      mockAuthProviderRepository.findByUserId.mockResolvedValue(mockAuthProviders)
      mockPasswordVerify.mockResolvedValueOnce(true).mockResolvedValueOnce(false)

      await userService.changePassword('user-123', 'old-password', 'new-password')

      expect(mockPasswordVerify).toHaveBeenCalledWith('old-password', 'hashed-password')
      expect(mockAuthProviderRepository.updatePassword).toHaveBeenCalledWith(
        'user-123',
        'email',
        'hashed-password'
      )
    })

    it('should throw InvalidCredentialsError for wrong current password', async () => {
      const mockUser = createMockUser()
      const mockAuthProviders = createMockAuthProviders()

      mockUserRepository.findById.mockResolvedValue(mockUser)
      mockAuthProviderRepository.findByUserId.mockResolvedValue(mockAuthProviders)
      mockPasswordVerify.mockResolvedValue(false)

      await expect(
        userService.changePassword('user-123', 'wrong-password', 'new-password')
      ).rejects.toThrow(InvalidCredentialsError)
    })

    it('should emit PASSWORD_CHANGED event', async () => {
      const mockUser = createMockUser()
      const mockAuthProviders = createMockAuthProviders()

      mockUserRepository.findById.mockResolvedValue(mockUser)
      mockAuthProviderRepository.findByUserId.mockResolvedValue(mockAuthProviders)
      mockPasswordVerify.mockResolvedValue(true)

      await userService.changePassword('user-123', 'old-password', 'new-password')

      const events = userService.getDomainEvents()
      const passwordChangeEvent = events.find(e => e.type === 'PASSWORD_CHANGED')
      expect(passwordChangeEvent).toBeDefined()
      if (passwordChangeEvent) {
        expect(passwordChangeEvent.userId).toBe('user-123')
        expect(passwordChangeEvent.tenantId).toBe(mockUser.tenantId)
      }
    })
  })

  describe('MFA functionality', () => {
    describe('setupMfa', () => {
      it('should return MFA setup result', async () => {
        const result: MfaSetupResult = await userService.setupMfa('user-123')

        expect(result).toEqual({
          secret: 'JBSWY3DPEHPK3PXP',
          qrCode: 'otpauth://totp/PEMS:user-123?secret=JBSWY3DPEHPK3PXP&issuer=PEMS',
          backupCodes: ['ABCD-1234', 'EFGH-5678', 'IJKL-9012'],
        })
      })
    })

    describe('verifyMfaSetup', () => {
      it('should verify MFA setup with valid code', async () => {
        const mockUser = createMockUser()
        mockUserRepository.findById.mockResolvedValue(mockUser)
        mockAuthProviderRepository.updateMfa.mockResolvedValue()

        await userService.verifyMfaSetup('user-123', 'JBSWY3DPEHPK3PXP', '123456')

        expect(mockAuthProviderRepository.updateMfa).toHaveBeenCalledWith('user-123', 'email', {
          enabled: true,
          secret: 'JBSWY3DPEHPK3PXP',
          backupCodes: ['ABCD-1234', 'EFGH-5678', 'IJKL-9012'],
        })
      })

      it('should throw InvalidMfaTokenError for invalid code format', async () => {
        await expect(
          userService.verifyMfaSetup('user-123', 'JBSWY3DPEHPK3PXP', 'invalid')
        ).rejects.toThrow(InvalidMfaTokenError)
      })

      it('should emit MFA_ENABLED event', async () => {
        const mockUser = createMockUser()
        mockUserRepository.findById.mockResolvedValue(mockUser)
        mockAuthProviderRepository.updateMfa.mockResolvedValue()

        await userService.verifyMfaSetup('user-123', 'JBSWY3DPEHPK3PXP', '123456')

        const events = userService.getDomainEvents()
        const mfaEnabledEvent = events.find(e => e.type === 'MFA_ENABLED')
        expect(mfaEnabledEvent).toBeDefined()
        if (mfaEnabledEvent) {
          expect(mfaEnabledEvent.userId).toBe('user-123')
          expect(mfaEnabledEvent.tenantId).toBe(mockUser.tenantId)
          expect(mfaEnabledEvent.method).toBe('TOTP')
        }
      })
    })

    describe('verifyMfaLogin', () => {
      it('should verify valid MFA code', async () => {
        const result = await userService.verifyMfaLogin('user-123', '123456')
        expect(result).toBe(true)
      })

      it('should reject invalid MFA code format', async () => {
        const result = await userService.verifyMfaLogin('user-123', 'invalid')
        expect(result).toBe(false)
      })
    })

    describe('disableMfa', () => {
      it('should disable MFA with valid credentials', async () => {
        const mockUser = createMockUser()
        const mockAuthProviders = createMockAuthProviders()
        const userWithAuth = { ...mockUser, authProviders: mockAuthProviders }

        mockUserRepository.findById.mockResolvedValue(mockUser)
        mockUserRepository.findByEmailWithAuth.mockResolvedValue(userWithAuth)
        mockPasswordVerify.mockResolvedValue(true)
        mockAuthProviderRepository.updateMfa.mockResolvedValue()

        await userService.disableMfa('user-123', 'correct-password')

        expect(mockAuthProviderRepository.updateMfa).toHaveBeenCalledWith('user-123', 'email', {
          enabled: false,
        })
      })

      it('should throw InvalidCredentialsError for wrong password', async () => {
        const mockUser = createMockUser()
        mockUserRepository.findById.mockResolvedValue(mockUser)
        mockUserRepository.findByEmailWithAuth.mockResolvedValue(null) // Auth fails

        await expect(
          userService.disableMfa('user-123', 'wrong-password')
        ).rejects.toThrow(InvalidCredentialsError)
      })

      it('should emit MFA_DISABLED event', async () => {
        const mockUser = createMockUser()
        const mockAuthProviders = createMockAuthProviders()
        const userWithAuth = { ...mockUser, authProviders: mockAuthProviders }

        mockUserRepository.findById
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(mockUser)
        mockUserRepository.findByEmailWithAuth.mockResolvedValue(userWithAuth)
        mockPasswordVerify.mockResolvedValue(true)
        mockAuthProviderRepository.updateMfa.mockResolvedValue()

        await userService.disableMfa('user-123', 'correct-password')

        const events = userService.getDomainEvents()
        const mfaDisabledEvent = events.find(e => e.type === 'MFA_DISABLED')
        expect(mfaDisabledEvent).toBeDefined()
        if (mfaDisabledEvent) {
          expect(mfaDisabledEvent.userId).toBe('user-123')
          expect(mfaDisabledEvent.tenantId).toBe(mockUser.tenantId)
        }
      })
    })
  })

  describe('Domain Events Management', () => {
    it('should return empty events initially', () => {
      const events = userService.getDomainEvents()
      expect(events).toEqual([])
    })

    it('should clear domain events', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
        tenantId: 'tenant-456',
      }

      const mockUser = createMockUser()
      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.create.mockResolvedValue(mockUser)
      mockAuthProviderRepository.create.mockResolvedValue({} as any)

      await userService.createUser(userData)
      expect(userService.getDomainEvents()).toHaveLength(1)

      userService.clearDomainEvents()
      expect(userService.getDomainEvents()).toHaveLength(0)
    })

    it('should accumulate multiple events', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
        tenantId: 'tenant-456',
      }

      const mockUser = createMockUser()
      const mockAuthProviders = createMockAuthProviders()
      const userWithAuth = { ...mockUser, authProviders: mockAuthProviders }

      // Setup mocks for user creation
      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.create.mockResolvedValue(mockUser)
      mockAuthProviderRepository.create.mockResolvedValue({} as any)

      // Setup mocks for authentication
      mockUserRepository.findByEmailWithAuth.mockResolvedValue(userWithAuth)
      mockPasswordVerify.mockResolvedValue(true)

      // Create user and authenticate
      await userService.createUser(userData)
      await userService.authenticateUser('test@example.com', 'password', 'tenant-456')

      const events = userService.getDomainEvents()
      expect(events).toHaveLength(2)
      expect(events[0].type).toBe('USER_CREATED')
      expect(events[1].type).toBe('USER_LOGGED_IN')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle repository errors gracefully', async () => {
      mockUserRepository.findById.mockRejectedValue(new Error('Database error'))

      await expect(userService.getUser('user-123')).rejects.toThrow('Database error')
    })

    it('should handle missing password auth provider', async () => {
      const mockUser = createMockUser()
      mockUserRepository.findById.mockResolvedValue(mockUser)
      mockAuthProviderRepository.findByUserId.mockResolvedValue([]) // No auth providers

      await expect(
        userService.changePassword('user-123', 'old-password', 'new-password')
      ).rejects.toThrow('No password authentication method configured')
    })

    it('should handle partial update data', async () => {
      const existingUser = createMockUser({
        email: 'test@example.com',
        phone: '+1234567890',
        isActive: true,
        metadata: { role: 'user' },
      })

      const updatedUser = createMockUser({
        ...existingUser,
        phone: '+0987654321',
      })

      mockUserRepository.findById.mockResolvedValue(existingUser)
      mockUserRepository.update.mockResolvedValue(updatedUser)

      const updateData = { phone: '+0987654321' }
      await userService.updateUser('user-123', updateData)

      const events = userService.getDomainEvents()
      const updateEvent = events.find(e => e.type === 'USER_UPDATED')
      expect(updateEvent).toBeDefined()
      if (updateEvent) {
        expect(updateEvent.changes.phone).toBe('+0987654321')
      }
    })
  })
})