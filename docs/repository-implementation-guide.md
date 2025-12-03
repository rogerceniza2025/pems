# Repository Implementation Guide

## Overview

This document provides detailed implementation guidance for the missing repository implementations in the user-management module.

## Repository Implementation Pattern

All repositories should follow these patterns:

- Use Prisma client for database operations
- Implement proper error handling
- Follow tenant-aware patterns
- Map database entities to domain entities
- Use transaction support where needed

## 1. User Profile Repository Implementation

### File: `modules/user-management/src/infrastructure/prisma-user-profile-repository.ts`

```typescript
import { PrismaClient } from '@pems/database'
import type {
  CreateUserProfileInput,
  UpdateUserProfileInput,
  UserProfileDomainEntity,
} from '../domain'
import type { IUserProfileRepository } from './user-repository'

export class PrismaUserProfileRepository implements IUserProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateUserProfileInput): Promise<UserProfileDomainEntity> {
    const profile = await this.prisma.userProfile.create({
      data: {
        user_id: data.userId,
        full_name: data.fullName,
        avatar_url: data.avatarUrl,
        preferred_name: data.preferredName,
        locale: data.locale,
        extra: data.extra ?? {},
        created_at: new Date(),
      },
    })

    return this.mapToDomainEntity(profile)
  }

  async findByUserId(userId: string): Promise<UserProfileDomainEntity | null> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { user_id: userId },
    })

    return profile ? this.mapToDomainEntity(profile) : null
  }

  async update(
    userId: string,
    data: UpdateUserProfileInput,
  ): Promise<UserProfileDomainEntity> {
    const profile = await this.prisma.userProfile.update({
      where: { user_id: userId },
      data: {
        ...(data.fullName !== undefined && { full_name: data.fullName }),
        ...(data.avatarUrl !== undefined && { avatar_url: data.avatarUrl }),
        ...(data.preferredName !== undefined && {
          preferred_name: data.preferredName,
        }),
        ...(data.locale !== undefined && { locale: data.locale }),
        ...(data.extra !== undefined && { extra: data.extra }),
      },
    })

    return this.mapToDomainEntity(profile)
  }

  async delete(userId: string): Promise<void> {
    await this.prisma.userProfile.delete({
      where: { user_id: userId },
    })
  }

  async upsert(
    userId: string,
    data: CreateUserProfileInput,
  ): Promise<UserProfileDomainEntity> {
    const profile = await this.prisma.userProfile.upsert({
      where: { user_id: userId },
      update: {
        ...(data.fullName !== undefined && { full_name: data.fullName }),
        ...(data.avatarUrl !== undefined && { avatar_url: data.avatarUrl }),
        ...(data.preferredName !== undefined && {
          preferred_name: data.preferredName,
        }),
        ...(data.locale !== undefined && { locale: data.locale }),
        ...(data.extra !== undefined && { extra: data.extra }),
      },
      create: {
        user_id: userId,
        full_name: data.fullName,
        avatar_url: data.avatarUrl,
        preferred_name: data.preferredName,
        locale: data.locale,
        extra: data.extra ?? {},
        created_at: new Date(),
      },
    })

    return this.mapToDomainEntity(profile)
  }

  private mapToDomainEntity(profile: any): UserProfileDomainEntity {
    return {
      id: profile.id,
      userId: profile.user_id,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      preferredName: profile.preferred_name,
      locale: profile.locale,
      extra: (profile.extra as Record<string, unknown>) ?? {},
      createdAt: profile.created_at,
    }
  }
}
```

## 2. User Auth Provider Repository Implementation

### File: `modules/user-management/src/infrastructure/prisma-user-auth-provider-repository.ts`

```typescript
import { PrismaClient } from '@pems/database'
import bcrypt from 'bcryptjs'
import type {
  CreateUserAuthProviderInput,
  UserAuthProviderDomainEntity,
} from '../domain'
import type { IUserAuthProviderRepository } from './user-repository'

export class PrismaUserAuthProviderRepository implements IUserAuthProviderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: CreateUserAuthProviderInput,
  ): Promise<UserAuthProviderDomainEntity> {
    const authProvider = await this.prisma.userAuthProvider.create({
      data: {
        user_id: data.userId,
        provider: data.provider,
        provider_id: data.providerId,
        password_hash: data.passwordHash,
        mfa_enabled: data.mfaEnabled,
        mfa_secret: data.mfaSecret,
        backup_codes: data.backupCodes,
        created_at: new Date(),
      },
    })

    return this.mapToDomainEntity(authProvider)
  }

  async findByUserId(userId: string): Promise<UserAuthProviderDomainEntity[]> {
    const authProviders = await this.prisma.userAuthProvider.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
    })

    return authProviders.map(this.mapToDomainEntity)
  }

  async findByProvider(
    provider: string,
    providerId: string,
  ): Promise<UserAuthProviderDomainEntity | null> {
    const authProvider = await this.prisma.userAuthProvider.findFirst({
      where: {
        provider,
        provider_id: providerId,
      },
    })

    return authProvider ? this.mapToDomainEntity(authProvider) : null
  }

  async findByUserIdAndProvider(
    userId: string,
    provider: string,
  ): Promise<UserAuthProviderDomainEntity | null> {
    const authProvider = await this.prisma.userAuthProvider.findFirst({
      where: {
        user_id: userId,
        provider,
      },
    })

    return authProvider ? this.mapToDomainEntity(authProvider) : null
  }

  async updateMfa(
    userId: string,
    provider: string,
    mfaData: {
      enabled: boolean
      secret?: string
      backupCodes?: string[]
    },
  ): Promise<void> {
    await this.prisma.userAuthProvider.updateMany({
      where: {
        user_id: userId,
        provider,
      },
      data: {
        mfa_enabled: mfaData.enabled,
        ...(mfaData.secret && { mfa_secret: mfaData.secret }),
        ...(mfaData.backupCodes && { backup_codes: mfaData.backupCodes }),
        updated_at: new Date(),
      },
    })
  }

  async updatePassword(
    userId: string,
    provider: string,
    passwordHash: string,
  ): Promise<void> {
    await this.prisma.userAuthProvider.updateMany({
      where: {
        user_id: userId,
        provider,
      },
      data: {
        password_hash: passwordHash,
        updated_at: new Date(),
      },
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.userAuthProvider.delete({
      where: { id },
    })
  }

  async findMfaSecret(
    userId: string,
    provider: string,
  ): Promise<string | null> {
    const authProvider = await this.prisma.userAuthProvider.findFirst({
      where: {
        user_id: userId,
        provider,
        mfa_enabled: true,
      },
      select: { mfa_secret: true },
    })

    return authProvider?.mfa_secret ?? null
  }

  async findBackupCodes(
    userId: string,
    provider: string,
  ): Promise<string[] | null> {
    const authProvider = await this.prisma.userAuthProvider.findFirst({
      where: {
        user_id: userId,
        provider,
        mfa_enabled: true,
      },
      select: { backup_codes: true },
    })

    return (authProvider?.backup_codes as string[]) ?? null
  }

  async consumeBackupCode(
    userId: string,
    provider: string,
    code: string,
  ): Promise<boolean> {
    // Find user with backup codes
    const authProvider = await this.prisma.userAuthProvider.findFirst({
      where: {
        user_id: userId,
        provider,
        mfa_enabled: true,
      },
    })

    if (!authProvider?.backup_codes) {
      return false
    }

    const backupCodes = authProvider.backup_codes as string[]
    const codeIndex = backupCodes.findIndex((c) => c === code.toUpperCase())

    if (codeIndex === -1) {
      return false
    }

    // Remove the used backup code
    backupCodes.splice(codeIndex, 1)

    // Update the database with remaining codes
    await this.prisma.userAuthProvider.update({
      where: { id: authProvider.id },
      data: {
        backup_codes: backupCodes,
        updated_at: new Date(),
      },
    })

    return true
  }

  private mapToDomainEntity(authProvider: any): UserAuthProviderDomainEntity {
    return {
      id: authProvider.id,
      userId: authProvider.user_id,
      provider: authProvider.provider,
      providerId: authProvider.provider_id,
      passwordHash: authProvider.password_hash,
      mfaEnabled: authProvider.mfa_enabled,
      mfaSecret: authProvider.mfa_secret,
      backupCodes: authProvider.backup_codes as string[] | undefined,
      createdAt: authProvider.created_at,
    }
  }
}
```

## 3. User Role Repository Implementation

### File: `modules/user-management/src/infrastructure/prisma-user-role-repository.ts`

```typescript
import { PrismaClient } from '@pems/database'
import type { Role, UserRoleDomainEntity } from '../domain'
import type { IUserRoleRepository } from './user-repository'

export class PrismaUserRoleRepository implements IUserRoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    userId: string
    roleId: string
    scope?: Record<string, unknown>
  }): Promise<UserRoleDomainEntity> {
    const userRole = await this.prisma.userRole.create({
      data: {
        user_id: data.userId,
        role_id: data.roleId,
        scope: data.scope ?? {},
        created_at: new Date(),
      },
    })

    return this.mapToDomainEntity(userRole)
  }

  async findByUserId(userId: string): Promise<UserRoleDomainEntity[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: {
        role: true,
      },
      orderBy: { created_at: 'asc' },
    })

    return userRoles.map(this.mapToDomainEntity)
  }

  async findByUserIdAndRole(
    userId: string,
    roleId: string,
  ): Promise<UserRoleDomainEntity | null> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        user_id: userId,
        role_id: roleId,
      },
      include: {
        role: true,
      },
    })

    return userRole ? this.mapToDomainEntity(userRole) : null
  }

  async delete(id: string): Promise<void> {
    await this.prisma.userRole.delete({
      where: { id },
    })
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.userRole.deleteMany({
      where: { user_id: userId },
    })
  }

  async deleteByUserIdAndRole(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.deleteMany({
      where: {
        user_id: userId,
        role_id: roleId,
      },
    })
  }

  async findByTenant(tenantId: string): Promise<
    (UserRoleDomainEntity & {
      user: { id: string; email: string }
      role: { id: string; name: string; slug: string }
    })[]
  > {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        user: {
          tenant_id: tenantId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    return userRoles.map((ur) => ({
      ...this.mapToDomainEntity(ur),
      user: ur.user as any,
      role: ur.role as any,
    }))
  }

  private mapToDomainEntity(userRole: any): UserRoleDomainEntity {
    return {
      id: userRole.id,
      userId: userRole.user_id,
      roleId: userRole.role_id,
      scope: (userRole.scope as Record<string, unknown>) ?? {},
      createdAt: userRole.created_at,
    }
  }
}
```

## 4. Token Repositories (for Password Reset and Magic Links)

### File: `modules/user-management/src/infrastructure/prisma-password-reset-token-repository.ts`

```typescript
import { PrismaClient } from '@pems/database'
import crypto from 'crypto'

export interface IPasswordResetTokenRepository {
  create(userId: string): Promise<string>
  validate(token: string): Promise<{ userId: string; valid: boolean }>
  consume(token: string): Promise<void>
  cleanupExpired(): Promise<void>
}

export class PrismaPasswordResetTokenRepository implements IPasswordResetTokenRepository {
  private readonly TOKEN_EXPIRY_HOURS = 24 // 24 hours

  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS)

    await this.prisma.passwordResetToken.create({
      data: {
        user_id: userId,
        token,
        expires_at: expiresAt,
        created_at: new Date(),
      },
    })

    return token
  }

  async validate(token: string): Promise<{ userId: string; valid: boolean }> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: { id: true, is_active: true },
        },
      },
    })

    if (!resetToken) {
      return { userId: '', valid: false }
    }

    if (resetToken.used_at) {
      return { userId: '', valid: false }
    }

    if (new Date() > resetToken.expires_at) {
      return { userId: '', valid: false }
    }

    if (!resetToken.user?.is_active) {
      return { userId: '', valid: false }
    }

    return { userId: resetToken.user_id, valid: true }
  }

  async consume(token: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { token },
      data: {
        used_at: new Date(),
      },
    })
  }

  async cleanupExpired(): Promise<void> {
    await this.prisma.passwordResetToken.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    })
  }
}
```

### File: `modules/user-management/src/infrastructure/prisma-magic-link-token-repository.ts`

```typescript
import { PrismaClient } from '@pems/database'
import crypto from 'crypto'

export interface IMagicLinkTokenRepository {
  create(userId: string): Promise<string>
  validate(token: string): Promise<{ userId: string; valid: boolean }>
  consume(token: string): Promise<void>
  cleanupExpired(): Promise<void>
}

export class PrismaMagicLinkTokenRepository implements IMagicLinkTokenRepository {
  private readonly TOKEN_EXPIRY_MINUTES = 60 // 1 hour

  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + this.TOKEN_EXPIRY_MINUTES)

    await this.prisma.magicLinkToken.create({
      data: {
        user_id: userId,
        token,
        expires_at: expiresAt,
        created_at: new Date(),
      },
    })

    return token
  }

  async validate(token: string): Promise<{ userId: string; valid: boolean }> {
    const magicLinkToken = await this.prisma.magicLinkToken.findUnique({
      where: { token },
      include: {
        user: {
          select: { id: true, is_active: true },
        },
      },
    })

    if (!magicLinkToken) {
      return { userId: '', valid: false }
    }

    if (magicLinkToken.used_at) {
      return { userId: '', valid: false }
    }

    if (new Date() > magicLinkToken.expires_at) {
      return { userId: '', valid: false }
    }

    if (!magicLinkToken.user?.is_active) {
      return { userId: '', valid: false }
    }

    return { userId: magicLinkToken.user_id, valid: true }
  }

  async consume(token: string): Promise<void> {
    await this.prisma.magicLinkToken.update({
      where: { token },
      data: {
        used_at: new Date(),
      },
    })
  }

  async cleanupExpired(): Promise<void> {
    await this.prisma.magicLinkToken.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    })
  }
}
```

## 5. User Session Repository

### File: `modules/user-management/src/infrastructure/prisma-user-session-repository.ts`

```typescript
import { PrismaClient } from '@pems/database'
import crypto from 'crypto'

export interface IUserSessionRepository {
  create(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string>
  validate(token: string): Promise<{ userId: string; valid: boolean }>
  updateLastUsed(token: string): Promise<void>
  invalidate(token: string): Promise<void>
  invalidateAllForUser(userId: string): Promise<void>
  cleanupExpired(): Promise<void>
}

export class PrismaUserSessionRepository implements IUserSessionRepository {
  private readonly SESSION_EXPIRY_DAYS = 7 // 7 days

  constructor(private readonly prisma: PrismaClient) {}

  async create(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + this.SESSION_EXPIRY_DAYS)

    await this.prisma.userSession.create({
      data: {
        user_id: userId,
        token,
        expires_at: expiresAt,
        created_at: new Date(),
        last_used_at: new Date(),
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    })

    return token
  }

  async validate(token: string): Promise<{ userId: string; valid: boolean }> {
    const session = await this.prisma.userSession.findUnique({
      where: { token },
      include: {
        user: {
          select: { id: true, is_active: true },
        },
      },
    })

    if (!session) {
      return { userId: '', valid: false }
    }

    if (new Date() > session.expires_at) {
      return { userId: '', valid: false }
    }

    if (!session.user?.is_active) {
      return { userId: '', valid: false }
    }

    return { userId: session.user_id, valid: true }
  }

  async updateLastUsed(token: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { token },
      data: {
        last_used_at: new Date(),
      },
    })
  }

  async invalidate(token: string): Promise<void> {
    await this.prisma.userSession.delete({
      where: { token },
    })
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: { user_id: userId },
    })
  }

  async cleanupExpired(): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    })
  }
}
```

## 6. Update Infrastructure Index

### File: `modules/user-management/src/infrastructure/index.ts`

```typescript
export * from './user-repository'
export * from './prisma-user-repository'
export * from './prisma-user-profile-repository'
export * from './prisma-user-auth-provider-repository'
export * from './prisma-user-role-repository'
export * from './prisma-password-reset-token-repository'
export * from './prisma-magic-link-token-repository'
export * from './prisma-user-session-repository'
```

## 7. Update Application Service

### File: `modules/user-management/src/application/user-service.ts`

Update the UserService to use the new repositories and implement proper MFA, password reset, and magic link functionality.

## Testing Strategy

Each repository should have:

1. Unit tests for all methods
2. Integration tests with real database
3. Error handling tests
4. Transaction rollback tests
5. Performance tests for large datasets

## Next Steps

1. Implement all repository classes following the patterns above
2. Add comprehensive error handling
3. Update the application service to use new repositories
4. Write tests for all repository implementations
5. Update dependency injection configuration
