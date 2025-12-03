/**
 * User Domain Entity
 *
 * Core domain entity for user management following DDD principles (ADR-002)
 * and UUIDv7 implementation (ADR-005)
 */

import { z } from 'zod'

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

// Validation schemas using Zod (ADR-020)
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

export const CreateUserProfileSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  fullName: z.string().min(1, 'Full name is required').optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
  preferredName: z.string().optional(),
  locale: z.string().optional(),
  extra: z.record(z.unknown()).optional().default({}),
})

export const UpdateUserProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
  preferredName: z.string().optional(),
  locale: z.string().optional(),
  extra: z.record(z.unknown()).optional(),
})

export const CreateUserAuthProviderSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  provider: z.string().min(1, 'Provider is required'),
  providerId: z.string().optional(),
  passwordHash: z.string().optional(),
  mfaEnabled: z.boolean().default(false),
  mfaSecret: z.string().optional(),
  backupCodes: z.array(z.string()).optional(),
})

// Domain Events (ADR-014)
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

export interface UserLoggedOutEvent {
  type: 'USER_LOGGED_OUT'
  userId: string
  tenantId: string
  occurredAt: Date
}

export interface MfaEnabledEvent {
  type: 'MFA_ENABLED'
  userId: string
  tenantId: string
  method: 'TOTP'
  occurredAt: Date
}

export interface MfaDisabledEvent {
  type: 'MFA_DISABLED'
  userId: string
  tenantId: string
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

export interface PasswordChangedEvent {
  type: 'PASSWORD_CHANGED'
  userId: string
  tenantId: string
  occurredAt: Date
}

export interface EmailVerifiedEvent {
  type: 'EMAIL_VERIFIED'
  userId: string
  tenantId: string
  occurredAt: Date
}

// Domain Exceptions
export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User with id ${userId} not found`)
    this.name = 'UserNotFoundError'
  }
}

export class UserEmailAlreadyExistsError extends Error {
  constructor(email: string, tenantId: string) {
    super(`User with email ${email} already exists in tenant ${tenantId}`)
    this.name = 'UserEmailAlreadyExistsError'
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password')
    this.name = 'InvalidCredentialsError'
  }
}

export class UserInactiveError extends Error {
  constructor() {
    super('User account is inactive')
    this.name = 'UserInactiveError'
  }
}

export class MfaRequiredError extends Error {
  constructor() {
    super('Multi-factor authentication is required')
    this.name = 'MfaRequiredError'
  }
}

export class InvalidMfaTokenError extends Error {
  constructor() {
    super('Invalid MFA token')
    this.name = 'InvalidMfaTokenError'
  }
}

export class MfaAlreadyEnabledError extends Error {
  constructor() {
    super('Multi-factor authentication is already enabled')
    this.name = 'MfaAlreadyEnabledError'
  }
}

export class MfaNotEnabledError extends Error {
  constructor() {
    super('Multi-factor authentication is not enabled')
    this.name = 'MfaNotEnabledError'
  }
}

export class InvalidPasswordResetTokenError extends Error {
  constructor() {
    super('Invalid or expired password reset token')
    this.name = 'InvalidPasswordResetTokenError'
  }
}

// Export types
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type LoginUserInput = z.infer<typeof LoginUserSchema>
export type CreateUserProfileInput = z.infer<typeof CreateUserProfileSchema>
export type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileSchema>
export type CreateUserAuthProviderInput = z.infer<
  typeof CreateUserAuthProviderSchema
>

// Domain Event Types
export type UserDomainEvent =
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserLoggedInEvent
  | UserLoggedOutEvent
  | MfaEnabledEvent
  | MfaDisabledEvent
  | PasswordResetRequestedEvent
  | PasswordChangedEvent
  | EmailVerifiedEvent
