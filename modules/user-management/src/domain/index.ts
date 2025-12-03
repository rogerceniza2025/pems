/**
 * Domain Module Index
 *
 * Exports all domain entities, value objects, events, and exceptions
 */

// Entity types
export type {
  UserAuthProviderDomainEntity,
  UserDomainEntity,
  UserProfileDomainEntity,
  UserRoleDomainEntity,
} from './user'

// Validation schemas
export type {
  CreateUserAuthProviderInput,
  CreateUserInput,
  CreateUserProfileInput,
  LoginUserInput,
  UpdateUserInput,
  UpdateUserProfileInput,
} from './user'

// Domain events
export type {
  EmailVerifiedEvent,
  MfaDisabledEvent,
  MfaEnabledEvent,
  PasswordChangedEvent,
  PasswordResetRequestedEvent,
  UserCreatedEvent,
  UserDomainEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
  UserUpdatedEvent,
} from './user'

// Validation schemas
export {
  CreateUserAuthProviderSchema,
  CreateUserProfileSchema,
  CreateUserSchema,
  LoginUserSchema,
  UpdateUserProfileSchema,
  UpdateUserSchema,
} from './user'

// Domain exceptions
export {
  InvalidCredentialsError,
  InvalidMfaTokenError,
  InvalidPasswordResetTokenError,
  MfaAlreadyEnabledError,
  MfaNotEnabledError,
  MfaRequiredError,
  UserEmailAlreadyExistsError,
  UserInactiveError,
  UserNotFoundError,
} from './user'

// Repository interfaces
export type {
  PaginatedResult,
  PaginationOptions,
  SearchOptions,
} from '../infrastructure/user-repository'

// Value objects
export { Email, InvalidEmailError } from './value-objects/email'

export type { PasswordStrength } from './value-objects/password'

export { InvalidPasswordError, Password } from './value-objects/password'
