/**
 * User Application Service
 *
 * Implements user management business logic following DDD principles
 */

import type {
  CreateUserInput,
  MfaDisabledEvent,
  MfaEnabledEvent,
  PasswordChangedEvent,
  UpdateUserInput,
  UserCreatedEvent,
  UserDomainEntity,
  UserDomainEvent,
  UserLoggedInEvent,
  UserUpdatedEvent,
} from '../domain'
import {
  InvalidCredentialsError,
  InvalidMfaTokenError,
  UserEmailAlreadyExistsError,
  UserInactiveError,
  UserNotFoundError,
} from '../domain'
import { Email } from '../domain/value-objects/email'
import { Password } from '../domain/value-objects/password'
import type {
  IUserAuthProviderRepository,
  IUserProfileRepository,
  IUserRepository,
  PaginatedResult,
  SearchOptions,
} from '../infrastructure'

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

export interface IUserService {
  // User management
  createUser(data: CreateUserInput): Promise<UserDomainEntity>
  getUser(id: string): Promise<UserDomainEntity>
  getUserByEmail(email: string, tenantId: string): Promise<UserDomainEntity>
  updateUser(id: string, data: UpdateUserInput): Promise<UserDomainEntity>
  deleteUser(id: string): Promise<void>
  listUsers(
    tenantId: string,
    options?: ListUsersOptions,
  ): Promise<PaginatedResult<UserDomainEntity>>

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
  getDomainEvents(): UserDomainEvent[]
  clearDomainEvents(): void
}

export class UserService implements IUserService {
  private domainEvents: UserDomainEvent[] = []

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userProfileRepository: IUserProfileRepository,
    private readonly authProviderRepository: IUserAuthProviderRepository,
  ) {}

  async createUser(data: CreateUserInput): Promise<UserDomainEntity> {
    // Check if user already exists
    const existingUser = await this.userRepository.existsByEmail(
      data.email,
      data.tenantId,
    )
    if (existingUser) {
      throw new UserEmailAlreadyExistsError(data.email, data.tenantId)
    }

    // Validate email and password
    const email = new Email(data.email)
    const password = new Password(data.password)

    // Create user
    const user = await this.userRepository.create({
      email: email.getValue(),
      password: password.getValue(), // Will be hashed in the repository
      tenantId: data.tenantId,
      phone: data.phone,
    })

    // Create user profile if names provided
    if (data.firstName || data.lastName) {
      await this.userProfileRepository.create({
        userId: user.id,
        extra: {},
        fullName: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
        preferredName: data.firstName,
      })
    }

    // Create auth provider for email/password
    const passwordHash = await password.hash()
    await this.authProviderRepository.create({
      userId: user.id,
      provider: 'email',
      mfaEnabled: false,
      passwordHash,
    })

    // Emit domain event
    this.addDomainEvent<UserCreatedEvent>({
      type: 'USER_CREATED',
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      occurredAt: new Date(),
    })

    return user
  }

  async getUser(id: string): Promise<UserDomainEntity> {
    const user = await this.userRepository.findById(id)
    if (!user) {
      throw new UserNotFoundError(id)
    }
    return user
  }

  async getUserByEmail(
    email: string,
    tenantId: string,
  ): Promise<UserDomainEntity> {
    const user = await this.userRepository.findByEmail(email, tenantId)
    if (!user) {
      throw new UserNotFoundError(`email: ${email}`)
    }
    return user
  }

  async updateUser(
    id: string,
    data: UpdateUserInput,
  ): Promise<UserDomainEntity> {
    // Validate user exists
    const existingUser = await this.getUser(id)

    // Check email uniqueness if being updated
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await this.userRepository.existsByEmail(
        data.email,
        existingUser.tenantId,
      )
      if (emailExists) {
        throw new UserEmailAlreadyExistsError(data.email, existingUser.tenantId)
      }
    }

    const updatedUser = await this.userRepository.update(id, data)

    // Emit domain event with changes
    const changes: Partial<{
      email: string
      phone: string
      isActive: boolean
      metadata: Record<string, unknown>
    }> = {}

    if (data.email && data.email !== existingUser.email) {
      changes.email = data.email
    }
    if (data.phone !== undefined && data.phone !== existingUser.phone) {
      changes.phone = data.phone
    }
    if (
      data.isActive !== undefined &&
      data.isActive !== existingUser.isActive
    ) {
      changes.isActive = data.isActive
    }
    if (
      data.metadata &&
      JSON.stringify(data.metadata) !== JSON.stringify(existingUser.metadata)
    ) {
      changes.metadata = data.metadata
    }

    if (Object.keys(changes).length > 0) {
      this.addDomainEvent<UserUpdatedEvent>({
        type: 'USER_UPDATED',
        userId: id,
        tenantId: existingUser.tenantId,
        changes,
        occurredAt: new Date(),
      })
    }

    return updatedUser
  }

  async deleteUser(id: string): Promise<void> {
    // Validate user exists
    await this.getUser(id)

    // Delete user (cascade delete should handle related records)
    await this.userRepository.delete(id)
  }

  async listUsers(
    tenantId: string,
    options?: ListUsersOptions,
  ): Promise<PaginatedResult<UserDomainEntity>> {
    const searchOptions: SearchOptions = {
      search: options?.search ?? '',
      sortBy:
        options?.sortBy === 'name' ? 'name' : (options?.sortBy ?? 'email'),
      sortOrder: options?.sortOrder ?? 'asc',
      ...(options?.page !== undefined && { page: options.page }),
      ...(options?.limit !== undefined && { limit: options.limit }),
      ...(options?.isActive !== undefined && { isActive: options.isActive }),
    }

    return this.userRepository.search('', tenantId, searchOptions)
  }

  async authenticateUser(
    email: string,
    password: string,
    tenantId: string,
  ): Promise<AuthenticationResult> {
    // Find user with auth providers
    const userWithAuth = await this.userRepository.findByEmailWithAuth(
      email,
      tenantId,
    )
    if (!userWithAuth) {
      return {
        success: false,
        error: 'Invalid email or password',
      }
    }

    // Check if user is active
    if (!userWithAuth.isActive) {
      throw new UserInactiveError()
    }

    // Verify password against each auth provider
    const emailAuthProvider = userWithAuth.authProviders.find(
      (p: { provider: string; passwordHash?: string }) =>
        p.provider === 'email',
    )
    if (!emailAuthProvider?.passwordHash) {
      return {
        success: false,
        error: 'No password authentication method configured',
      }
    }

    const isPasswordValid = await Password.verify(
      password,
      emailAuthProvider.passwordHash,
    )
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Invalid email or password',
      }
    }

    // Check if MFA is required
    if (emailAuthProvider.mfaEnabled) {
      return {
        success: true,
        user: userWithAuth,
        requiresMfa: true,
      }
    }

    // Emit login event
    this.addDomainEvent<UserLoggedInEvent>({
      type: 'USER_LOGGED_IN',
      userId: userWithAuth.id,
      tenantId: userWithAuth.tenantId,
      occurredAt: new Date(),
    })

    return {
      success: true,
      user: userWithAuth,
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Validate user exists
    const user = await this.getUser(userId)

    // Find email auth provider
    const authProviders = await this.authProviderRepository.findByUserId(userId)
    const emailAuthProvider = authProviders.find(
      (p: { provider: string; passwordHash?: string }) =>
        p.provider === 'email',
    )

    if (!emailAuthProvider?.passwordHash) {
      throw new Error('No password authentication method configured')
    }

    // Verify current password
    const isCurrentPasswordValid = await Password.verify(
      currentPassword,
      emailAuthProvider.passwordHash,
    )
    if (!isCurrentPasswordValid) {
      throw new InvalidCredentialsError()
    }

    // Hash and update new password
    const newPasswordObj = new Password(newPassword)
    const newPasswordHash = await newPasswordObj.hash()

    await this.authProviderRepository.updatePassword(
      userId,
      'email',
      newPasswordHash,
    )

    // Emit domain event
    this.addDomainEvent<PasswordChangedEvent>({
      type: 'PASSWORD_CHANGED',
      userId,
      tenantId: user.tenantId,
      occurredAt: new Date(),
    })
  }

  async setupMfa(userId: string): Promise<MfaSetupResult> {
    // This would integrate with the MFA service
    // For now, return a mock implementation
    const secret = 'JBSWY3DPEHPK3PXP' // Mock TOTP secret
    const qrCode = `otpauth://totp/PEMS:${userId}?secret=${secret}&issuer=PEMS`
    const backupCodes = ['ABCD-1234', 'EFGH-5678', 'IJKL-9012'] // Mock backup codes

    return {
      secret,
      qrCode,
      backupCodes,
    }
  }

  async verifyMfaSetup(
    userId: string,
    secret: string,
    code: string,
  ): Promise<void> {
    // This would integrate with the MFA service to verify the code
    // For now, accept any 6-digit code as valid
    if (!/^\d{6}$/.test(code)) {
      throw new InvalidMfaTokenError()
    }

    // Update auth provider with MFA enabled
    await this.authProviderRepository.updateMfa(userId, 'email', {
      enabled: true,
      secret,
      backupCodes: ['ABCD-1234', 'EFGH-5678', 'IJKL-9012'],
    })

    // Get user for event
    const user = await this.getUser(userId)

    // Emit domain event
    this.addDomainEvent<MfaEnabledEvent>({
      type: 'MFA_ENABLED',
      userId,
      tenantId: user.tenantId,
      method: 'TOTP',
      occurredAt: new Date(),
    })
  }

  async verifyMfaLogin(userId: string, code: string): Promise<boolean> {
    // This would integrate with the MFA service
    // For now, accept any 6-digit code as valid
    return /^\d{6}$/.test(code)
  }

  async disableMfa(userId: string, password: string): Promise<void> {
    // Validate user exists and password
    const authResult = await this.authenticateUser(
      (await this.getUser(userId)).email,
      password,
      (await this.getUser(userId)).tenantId,
    )

    if (!authResult.success) {
      throw new InvalidCredentialsError()
    }

    // Disable MFA
    await this.authProviderRepository.updateMfa(userId, 'email', {
      enabled: false,
    })

    // Get user for event
    const user = await this.getUser(userId)

    // Emit domain event
    this.addDomainEvent<MfaDisabledEvent>({
      type: 'MFA_DISABLED',
      userId,
      tenantId: user.tenantId,
      occurredAt: new Date(),
    })
  }

  getDomainEvents(): UserDomainEvent[] {
    return [...this.domainEvents]
  }

  clearDomainEvents(): void {
    this.domainEvents = []
  }

  private addDomainEvent<T extends UserDomainEvent>(event: T): void {
    this.domainEvents.push(event)
  }
}
