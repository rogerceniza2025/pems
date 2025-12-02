# BetterAuth Integration Guide

## Overview

This document provides detailed implementation guidance for integrating BetterAuth 1.4.3 with tenant awareness and MFA support in the PEMS system.

## 1. Enhanced BetterAuth Configuration

### File: `packages/infrastructure/auth/src/tenant-aware-adapter.ts`

```typescript
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@pems/database'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

export interface TenantAuthOptions extends BetterAuthOptions {
  tenantId?: string
}

export function createTenantAwareAuth(options: TenantAuthOptions = {}) {
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        enabled: !!process.env.GOOGLE_CLIENT_ID,
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID ?? '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
        enabled: !!process.env.GITHUB_CLIENT_ID,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
      cookieName: 'pems-session',
      cookieAttributes: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: true,
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
        before: [
          {
            matcher(context) {
              return context.path === '/sign-up' || context.path === '/sign-in'
            },
            handler: async (ctx) => {
              const { tenantId } = options
              if (tenantId && ctx.body && typeof ctx.body === 'object') {
                ;(ctx.body as any).tenant_id = tenantId
              }
              return ctx
            },
          },
        ],
        after: [
          {
            matcher(context) {
              return context.path === '/sign-up' || context.path === '/sign-in'
            },
            handler: async (ctx) => {
              const { tenantId } = options
              if (tenantId && ctx.user) {
                // Update user with tenant context after creation/login
                await prisma.user.update({
                  where: { id: ctx.user.id },
                  data: { tenant_id: tenantId },
                })
              }
              return ctx
            },
          },
        ],
      },
    },
    // Custom MFA configuration
    twoFactor: {
      issuer: 'PEMS',
      otpOptions: {
        digits: 6,
        period: 30,
        algorithm: 'SHA1' as const,
      },
    },
  })
}

// Create default auth instance
export const auth = createTenantAwareAuth()

// Helper function to create tenant-specific auth
export function createTenantSpecificAuth(tenantId: string) {
  return createTenantAwareAuth({ tenantId })
}
```

## 2. MFA Service Implementation

### File: `packages/infrastructure/auth/src/mfa-service.ts`

```typescript
import { authenticator } from 'otplib'
import crypto from 'crypto'
import QRCode from 'qrcode'
import type { IUserAuthProviderRepository } from '@pems/user-management'

export interface IMfaService {
  generateSecret(): string
  generateQRCode(secret: string, email: string): Promise<string>
  verifyToken(secret: string, token: string): boolean
  generateBackupCodes(): string[]
  verifyBackupCode(backupCodes: string[], code: string): boolean
  generateTOTPURI(secret: string, email: string): string
}

export class MfaService implements IMfaService {
  private readonly issuer = 'PEMS'
  private readonly backupCodeCount = 10
  private readonly backupCodeLength = 8

  generateSecret(): string {
    return authenticator.generateSecret({
      name: this.issuer,
      issuer: this.issuer,
    })
  }

  generateTOTPURI(secret: string, email: string): string {
    return authenticator.keyuri(email, this.issuer, secret)
  }

  async generateQRCode(secret: string, email: string): Promise<string> {
    const otpauth = this.generateTOTPURI(secret, email)

    try {
      const qrCodeDataURL = await QRCode.toDataURL(otpauth, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })

      return qrCodeDataURL
    } catch (error) {
      throw new Error(
        `Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  verifyToken(secret: string, token: string): boolean {
    try {
      // Remove any spaces from the token
      const cleanToken = token.replace(/\s/g, '')

      // Verify the token
      return authenticator.verify({
        token: cleanToken,
        secret,
        window: 1, // Allow 1 time step window (30 seconds before/after)
      })
    } catch (error) {
      return false
    }
  }

  generateBackupCodes(): string[] {
    const codes: string[] = []
    const usedCodes = new Set<string>()

    while (codes.length < this.backupCodeCount) {
      const code = crypto
        .randomBytes(this.backupCodeLength / 2)
        .toString('hex')
        .toUpperCase()

      // Ensure uniqueness
      if (!usedCodes.has(code)) {
        codes.push(code)
        usedCodes.add(code)
      }
    }

    return codes
  }

  verifyBackupCode(backupCodes: string[], code: string): boolean {
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    return backupCodes.includes(normalizedCode)
  }

  // Helper method to hash backup codes for storage
  async hashBackupCodes(codes: string[]): Promise<string[]> {
    const bcrypt = await import('bcryptjs')
    const hashedCodes: string[] = []

    for (const code of codes) {
      const hash = await bcrypt.hash(code, 12)
      hashedCodes.push(hash)
    }

    return hashedCodes
  }

  // Helper method to verify backup code against hash
  async verifyBackupCodeHash(
    hashedCodes: string[],
    code: string,
  ): Promise<boolean> {
    const bcrypt = await import('bcryptjs')

    for (const hash of hashedCodes) {
      const isValid = await bcrypt.compare(code.toUpperCase(), hash)
      if (isValid) {
        return true
      }
    }

    return false
  }
}
```

## 3. Password Reset Service

### File: `packages/infrastructure/auth/src/password-reset-service.ts`

```typescript
import type {
  IUserRepository,
  IPasswordResetTokenRepository,
} from '@pems/user-management'
import type { IEmailService } from './email-service'

export interface IPasswordResetService {
  requestPasswordReset(email: string, tenantId: string): Promise<void>
  resetPassword(token: string, newPassword: string): Promise<void>
  validateToken(token: string): Promise<{ valid: boolean; userId?: string }>
}

export class PasswordResetService implements IPasswordResetService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenRepository: IPasswordResetTokenRepository,
    private readonly emailService: IEmailService,
  ) {}

  async requestPasswordReset(email: string, tenantId: string): Promise<void> {
    // Find user by email and tenant
    const user = await this.userRepository.findByEmail(email, tenantId)
    if (!user) {
      // Don't reveal that user doesn't exist
      return
    }

    // Create reset token
    const token = await this.tokenRepository.create(user.id)

    // Send reset email
    await this.emailService.sendPasswordResetEmail(email, token, user.tenantId)
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate token
    const validation = await this.tokenRepository.validate(token)
    if (!validation.valid) {
      throw new Error('Invalid or expired reset token')
    }

    // Update user password
    const { Password } = await import('@pems/user-management')
    const passwordObj = new Password(newPassword)
    const passwordHash = await passwordObj.hash()

    // This would need to be implemented in the user service
    // await this.userRepository.updatePassword(validation.userId, passwordHash)

    // Consume the token
    await this.tokenRepository.consume(token)
  }

  async validateToken(
    token: string,
  ): Promise<{ valid: boolean; userId?: string }> {
    const validation = await this.tokenRepository.validate(token)
    return {
      valid: validation.valid,
      userId: validation.valid ? validation.userId : undefined,
    }
  }
}
```

## 4. Magic Link Service

### File: `packages/infrastructure/auth/src/magic-link-service.ts`

```typescript
import type {
  IUserRepository,
  IMagicLinkTokenRepository,
} from '@pems/user-management'
import type { IEmailService } from './email-service'

export interface IMagicLinkService {
  generateMagicLink(email: string, tenantId: string): Promise<string>
  validateMagicLink(token: string): Promise<{ valid: boolean; userId?: string }>
  consumeMagicLink(token: string): Promise<void>
}

export class MagicLinkService implements IMagicLinkService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenRepository: IMagicLinkTokenRepository,
    private readonly emailService: IEmailService,
  ) {}

  async generateMagicLink(email: string, tenantId: string): Promise<string> {
    // Find user by email and tenant
    const user = await this.userRepository.findByEmail(email, tenantId)
    if (!user) {
      // Don't reveal that user doesn't exist
      return ''
    }

    // Create magic link token
    const token = await this.tokenRepository.create(user.id)

    // Generate magic link URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const magicLink = `${baseUrl}/auth/magic-link?token=${token}`

    // Send magic link email
    await this.emailService.sendMagicLinkEmail(email, magicLink, user.tenantId)

    return magicLink
  }

  async validateMagicLink(
    token: string,
  ): Promise<{ valid: boolean; userId?: string }> {
    const validation = await this.tokenRepository.validate(token)
    return {
      valid: validation.valid,
      userId: validation.valid ? validation.userId : undefined,
    }
  }

  async consumeMagicLink(token: string): Promise<void> {
    const validation = await this.tokenRepository.validate(token)
    if (!validation.valid) {
      throw new Error('Invalid or expired magic link')
    }

    // Consume the token
    await this.tokenRepository.consume(token)

    // Create session for the user
    // This would integrate with the session service
    // await this.sessionService.create(validation.userId)
  }
}
```

## 5. Email Service

### File: `packages/infrastructure/auth/src/email-service.ts`

```typescript
import nodemailer from 'nodemailer'

export interface IEmailService {
  sendPasswordResetEmail(
    email: string,
    token: string,
    tenantId: string,
  ): Promise<void>
  sendMagicLinkEmail(
    email: string,
    magicLink: string,
    tenantId: string,
  ): Promise<void>
  sendEmailVerificationEmail(
    email: string,
    token: string,
    tenantId: string,
  ): Promise<void>
  sendMfaSetupEmail(email: string, tenantId: string): Promise<void>
}

export class EmailService implements IEmailService {
  private readonly transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    tenantId: string,
  ): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@pems.com',
      to: email,
      subject: 'Reset your PEMS password',
      html: this.getPasswordResetTemplate(resetUrl),
    })
  }

  async sendMagicLinkEmail(
    email: string,
    magicLink: string,
    tenantId: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@pems.com',
      to: email,
      subject: 'Sign in to PEMS',
      html: this.getMagicLinkTemplate(magicLink),
    })
  }

  async sendEmailVerificationEmail(
    email: string,
    token: string,
    tenantId: string,
  ): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@pems.com',
      to: email,
      subject: 'Verify your PEMS email',
      html: this.getEmailVerificationTemplate(verifyUrl),
    })
  }

  async sendMfaSetupEmail(email: string, tenantId: string): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@pems.com',
      to: email,
      subject: 'MFA enabled on your PEMS account',
      html: this.getMfaSetupTemplate(),
    })
  }

  private getPasswordResetTemplate(resetUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>Hi there,</p>
        <p>We received a request to reset your password for your PEMS account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">Reset Password</a>
        <p>If you didn't request this password reset, you can safely ignore this email.</p>
        <p>This link will expire in 24 hours.</p>
        <p>Thanks,<br>The PEMS Team</p>
      </div>
    `
  }

  private getMagicLinkTemplate(magicLink: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Sign In to PEMS</h2>
        <p>Hi there,</p>
        <p>Click the link below to sign in to your PEMS account:</p>
        <a href="${magicLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">Sign In</a>
        <p>This link will expire in 1 hour.</p>
        <p>Thanks,<br>The PEMS Team</p>
      </div>
    `
  }

  private getEmailVerificationTemplate(verifyUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email</h2>
        <p>Hi there,</p>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verifyUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">Verify Email</a>
        <p>Thanks,<br>The PEMS Team</p>
      </div>
    `
  }

  private getMfaSetupTemplate(): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">MFA Enabled</h2>
        <p>Hi there,</p>
        <p>Multi-factor authentication has been enabled on your PEMS account.</p>
        <p>If you didn't enable MFA, please secure your account immediately.</p>
        <p>Thanks,<br>The PEMS Team</p>
      </div>
    `
  }
}
```

## 6. Session Service

### File: `packages/infrastructure/auth/src/session-service.ts`

```typescript
import type { IUserSessionRepository } from '@pems/user-management'

export interface ISessionService {
  createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string>
  validateSession(token: string): Promise<{ valid: boolean; userId?: string }>
  refreshSession(token: string): Promise<string | null>
  invalidateSession(token: string): Promise<void>
  invalidateAllSessions(userId: string): Promise<void>
  updateLastActivity(token: string): Promise<void>
}

export class SessionService implements ISessionService {
  constructor(private readonly sessionRepository: IUserSessionRepository) {}

  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    return await this.sessionRepository.create(userId, ipAddress, userAgent)
  }

  async validateSession(
    token: string,
  ): Promise<{ valid: boolean; userId?: string }> {
    const validation = await this.sessionRepository.validate(token)

    if (validation.valid) {
      // Update last used time
      await this.sessionRepository.updateLastUsed(token)
    }

    return validation
  }

  async refreshSession(token: string): Promise<string | null> {
    const validation = await this.sessionRepository.validate(token)
    if (!validation.valid) {
      return null
    }

    // Invalidate old session and create new one
    await this.sessionRepository.invalidate(token)
    return await this.sessionRepository.create(validation.userId)
  }

  async invalidateSession(token: string): Promise<void> {
    await this.sessionRepository.invalidate(token)
  }

  async invalidateAllSessions(userId: string): Promise<void> {
    await this.sessionRepository.invalidateAllForUser(userId)
  }

  async updateLastActivity(token: string): Promise<void> {
    await this.sessionRepository.updateLastUsed(token)
  }
}
```

## 7. Integration with User Service

### File: `modules/user-management/src/application/auth-service.ts`

```typescript
import type {
  IUserRepository,
  IUserAuthProviderRepository,
  IPasswordResetTokenRepository,
  IMagicLinkTokenRepository,
  IUserSessionRepository,
} from '../infrastructure'
import type {
  UserDomainEntity,
  CreateUserInput,
  LoginUserInput,
  AuthenticationResult,
  MfaSetupResult,
} from '../domain'
import { Email } from '../domain/value-objects/email'
import { Password } from '../domain/value-objects/password'
import type {
  IMfaService,
  IPasswordResetService,
  IMagicLinkService,
  ISessionService,
  IEmailService,
} from '@pems/auth'

export interface IAuthService {
  register(data: CreateUserInput): Promise<AuthenticationResult>
  login(data: LoginUserInput): Promise<AuthenticationResult>
  logout(sessionToken: string): Promise<void>
  refreshToken(
    refreshToken: string,
  ): Promise<{ success: boolean; session?: string }>
  forgotPassword(email: string, tenantId: string): Promise<void>
  resetPassword(token: string, newPassword: string): Promise<void>
  generateMagicLink(email: string, tenantId: string): Promise<string>
  verifyMagicLink(token: string): Promise<AuthenticationResult>
  setupMfa(userId: string): Promise<MfaSetupResult>
  verifyMfaSetup(userId: string, secret: string, code: string): Promise<void>
  verifyMfaLogin(userId: string, code: string): Promise<boolean>
  disableMfa(userId: string, password: string): Promise<void>
}

export class AuthService implements IAuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authProviderRepository: IUserAuthProviderRepository,
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
    private readonly magicLinkTokenRepository: IMagicLinkTokenRepository,
    private readonly sessionRepository: IUserSessionRepository,
    private readonly mfaService: IMfaService,
    private readonly passwordResetService: IPasswordResetService,
    private readonly magicLinkService: IMagicLinkService,
    private readonly sessionService: ISessionService,
  ) {}

  async register(data: CreateUserInput): Promise<AuthenticationResult> {
    // Check if user already exists
    const existingUser = await this.userRepository.existsByEmail(
      data.email,
      data.tenantId,
    )
    if (existingUser) {
      return {
        success: false,
        error: 'User with this email already exists',
      }
    }

    // Validate email and password
    const email = new Email(data.email)
    const password = new Password(data.password)

    // Create user
    const user = await this.userRepository.create({
      email: email.getValue(),
      tenantId: data.tenantId,
      phone: data.phone,
    })

    // Create auth provider
    const passwordHash = await password.hash()
    await this.authProviderRepository.create({
      userId: user.id,
      provider: 'email',
      passwordHash,
    })

    // Create profile if names provided
    if (data.firstName || data.lastName) {
      // This would need to be implemented
      // await this.userProfileRepository.create({
      //   userId: user.id,
      //   fullName: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
      //   preferredName: data.firstName,
      // })
    }

    return {
      success: true,
      user,
    }
  }

  async login(data: LoginUserInput): Promise<AuthenticationResult> {
    // Find user with auth providers
    const userWithAuth = await this.userRepository.findByEmailWithAuth(
      data.email,
      data.tenantId,
    )
    if (!userWithAuth) {
      return {
        success: false,
        error: 'Invalid email or password',
      }
    }

    // Check if user is active
    if (!userWithAuth.isActive) {
      return {
        success: false,
        error: 'Account is inactive',
      }
    }

    // Verify password
    const emailAuthProvider = userWithAuth.authProviders.find(
      (p) => p.provider === 'email',
    )
    if (!emailAuthProvider?.passwordHash) {
      return {
        success: false,
        error: 'No password authentication method configured',
      }
    }

    const isPasswordValid = await Password.verify(
      data.password,
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

    // Create session
    const sessionToken = await this.sessionService.createSession(
      userWithAuth.id,
    )

    return {
      success: true,
      user: userWithAuth,
      session: sessionToken,
    }
  }

  async logout(sessionToken: string): Promise<void> {
    await this.sessionService.invalidateSession(sessionToken)
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ success: boolean; session?: string }> {
    const newSession = await this.sessionService.refreshSession(refreshToken)
    if (newSession) {
      return {
        success: true,
        session: newSession,
      }
    }

    return {
      success: false,
    }
  }

  async forgotPassword(email: string, tenantId: string): Promise<void> {
    await this.passwordResetService.requestPasswordReset(email, tenantId)
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.passwordResetService.resetPassword(token, newPassword)
  }

  async generateMagicLink(email: string, tenantId: string): Promise<string> {
    return await this.magicLinkService.generateMagicLink(email, tenantId)
  }

  async verifyMagicLink(token: string): Promise<AuthenticationResult> {
    const validation = await this.magicLinkService.validateMagicLink(token)
    if (!validation.valid) {
      return {
        success: false,
        error: 'Invalid or expired magic link',
      }
    }

    // Get user details
    const user = await this.userRepository.findById(validation.userId!)
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      }
    }

    // Create session
    const sessionToken = await this.sessionService.createSession(user.id)

    // Consume the magic link
    await this.magicLinkService.consumeMagicLink(token)

    return {
      success: true,
      user,
      session: sessionToken,
    }
  }

  async setupMfa(userId: string): Promise<MfaSetupResult> {
    const secret = this.mfaService.generateSecret()
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const qrCode = await this.mfaService.generateQRCode(secret, user.email)
    const backupCodes = this.mfaService.generateBackupCodes()

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
    const isValid = this.mfaService.verifyToken(secret, code)
    if (!isValid) {
      throw new Error('Invalid MFA code')
    }

    // Get user for backup codes
    const authProviders = await this.authProviderRepository.findByUserId(userId)
    const emailAuthProvider = authProviders.find((p) => p.provider === 'email')

    if (!emailAuthProvider) {
      throw new Error('Email auth provider not found')
    }

    // Generate backup codes
    const backupCodes = this.mfaService.generateBackupCodes()
    const hashedBackupCodes = await this.mfaService.hashBackupCodes(backupCodes)

    // Update auth provider with MFA enabled
    await this.authProviderRepository.updateMfa(userId, 'email', {
      enabled: true,
      secret,
      backupCodes: hashedBackupCodes,
    })
  }

  async verifyMfaLogin(userId: string, code: string): Promise<boolean> {
    const authProviders = await this.authProviderRepository.findByUserId(userId)
    const emailAuthProvider = authProviders.find((p) => p.provider === 'email')

    if (!emailAuthProvider?.mfaSecret) {
      return false
    }

    // First try TOTP verification
    if (this.mfaService.verifyToken(emailAuthProvider.mfaSecret, code)) {
      return true
    }

    // Then try backup codes
    if (emailAuthProvider.backupCodes) {
      return await this.mfaService.verifyBackupCodeHash(
        emailAuthProvider.backupCodes as string[],
        code,
      )
    }

    return false
  }

  async disableMfa(userId: string, password: string): Promise<void> {
    // Verify password first
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const authResult = await this.login({
      email: user.email,
      password,
      tenantId: user.tenantId,
    })

    if (!authResult.success) {
      throw new Error('Invalid password')
    }

    // Disable MFA
    await this.authProviderRepository.updateMfa(userId, 'email', {
      enabled: false,
    })
  }
}
```

## 8. Update Infrastructure Index

### File: `packages/infrastructure/auth/src/index.ts`

```typescript
export * from './tenant-aware-adapter'
export * from './mfa-service'
export * from './password-reset-service'
export * from './magic-link-service'
export * from './email-service'
export * from './session-service'
export * from './rbac'
```

## 9. Environment Variables

Add these to your `.env` file:

```env
# BetterAuth Configuration
BETTERAUTH_SECRET=your-super-secret-key-here
BETTERAUTH_URL=http://localhost:3002

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@pems.com

# Frontend URLs
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001

# TOTP Configuration
TOTP_ISSUER=PEMS
TOTP_DIGITS=6
TOTP_PERIOD=30

# Session Configuration
SESSION_SECRET=your-session-secret-here
SESSION_EXPIRY=604800 # 7 days in seconds
```

## 10. Package Dependencies

Add these dependencies to `packages/infrastructure/auth/package.json`:

```json
{
  "dependencies": {
    "better-auth": "^1.4.3",
    "otplib": "^12.0.1",
    "qrcode": "^1.5.3",
    "nodemailer": "^6.9.7",
    "@pems/database": "workspace:*",
    "@pems/user-management": "workspace:*"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.14",
    "@types/qrcode": "^1.5.5"
  }
}
```

## Testing Strategy

1. **Unit Tests**: Test each service in isolation
2. **Integration Tests**: Test service interactions
3. **E2E Tests**: Test complete authentication flows
4. **Security Tests**: Test token expiration, rate limiting, etc.

## Next Steps

1. Implement all services following the patterns above
2. Add comprehensive error handling
3. Write tests for all service implementations
4. Update the user service to use the new auth service
5. Create API routes that use these services
6. Add proper logging and monitoring
