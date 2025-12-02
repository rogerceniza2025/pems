/**
 * User Repository Interface
 *
 * Abstract interface for user data access following DDD repository pattern
 */

import type {
  CreateUserAuthProviderInput,
  CreateUserInput,
  CreateUserProfileInput,
  UpdateUserInput,
  UpdateUserProfileInput,
  UserAuthProviderDomainEntity,
  UserDomainEntity,
  UserProfileDomainEntity,
  UserRoleDomainEntity,
} from '../domain'

export interface PaginationOptions {
  page?: number
  limit?: number
  offset?: number
}

export interface SearchOptions extends PaginationOptions {
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

export interface IUserRepository {
  // Basic CRUD operations
  create(data: CreateUserInput): Promise<UserDomainEntity>
  findById(id: string): Promise<UserDomainEntity | null>
  findByEmail(
    email: string,
    tenantId?: string,
  ): Promise<UserDomainEntity | null>
  update(id: string, data: UpdateUserInput): Promise<UserDomainEntity>
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
  ): Promise<PaginatedResult<UserDomainEntity>>

  // Bulk operations
  bulkUpdate(
    updates: Array<{ id: string; data: UpdateUserInput }>,
  ): Promise<UserDomainEntity[]>

  // Existence checks
  existsByEmail(email: string, tenantId: string): Promise<boolean>
  existsById(id: string): Promise<boolean>
}

export interface IUserProfileRepository {
  create(data: CreateUserProfileInput): Promise<UserProfileDomainEntity>
  findByUserId(userId: string): Promise<UserProfileDomainEntity | null>
  update(
    userId: string,
    data: UpdateUserProfileInput,
  ): Promise<UserProfileDomainEntity>
  delete(userId: string): Promise<void>
  upsert(
    userId: string,
    data: CreateUserProfileInput,
  ): Promise<UserProfileDomainEntity>
}

export interface IUserAuthProviderRepository {
  create(
    data: CreateUserAuthProviderInput,
  ): Promise<UserAuthProviderDomainEntity>
  findByUserId(userId: string): Promise<UserAuthProviderDomainEntity[]>
  findByProvider(
    provider: string,
    providerId: string,
  ): Promise<UserAuthProviderDomainEntity | null>
  findByUserIdAndProvider(
    userId: string,
    provider: string,
  ): Promise<UserAuthProviderDomainEntity | null>
  updateMfa(
    userId: string,
    provider: string,
    mfaData: {
      enabled: boolean
      secret?: string
      backupCodes?: string[]
    },
  ): Promise<void>
  updatePassword(
    userId: string,
    provider: string,
    passwordHash: string,
  ): Promise<void>
  delete(id: string): Promise<void>

  // MFA specific operations
  findMfaSecret(userId: string, provider: string): Promise<string | null>
  findBackupCodes(userId: string, provider: string): Promise<string[] | null>
  consumeBackupCode(
    userId: string,
    provider: string,
    code: string,
  ): Promise<boolean>
}

export interface IUserRoleRepository {
  create(data: {
    userId: string
    roleId: string
    scope?: Record<string, unknown>
  }): Promise<UserRoleDomainEntity>
  findByUserId(userId: string): Promise<UserRoleDomainEntity[]>
  findByUserIdAndRole(
    userId: string,
    roleId: string,
  ): Promise<UserRoleDomainEntity | null>
  delete(id: string): Promise<void>
  deleteByUserId(userId: string): Promise<void>
  deleteByUserIdAndRole(userId: string, roleId: string): Promise<void>

  // Tenant-aware operations
  findByTenant(tenantId: string): Promise<
    (UserRoleDomainEntity & {
      user: { id: string; email: string }
      role: { id: string; name: string; slug: string }
    })[]
  >
}
