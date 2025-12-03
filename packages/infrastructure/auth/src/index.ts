import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@pems/database'

// Simplified BetterAuth configuration
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Enhanced email/password authentication
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  // Social providers with enhanced configuration
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      enabled: !!process.env.GITHUB_CLIENT_ID,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      enabled: !!process.env.MICROSOFT_CLIENT_ID,
    },
  },

  // Account linking and management
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github', 'microsoft'],
      allowDifferentEmails: false,
    },
  },

  // Email service configuration
  email: {
    sendVerificationEmail: async ({ user, url }: { user: any; url: string }) => {
      console.log(`Verification email for ${user.email}: ${url}`)
      // TODO: Integrate with actual email service
    },
    sendPasswordResetEmail: async ({ user, url }: { user: any; url: string }) => {
      console.log(`Password reset email for ${user.email}: ${url}`)
      // TODO: Integrate with actual email service
    },
    sendChangeEmailVerification: async ({ user, url }: { user: any; url: string }) => {
      console.log(`Email change verification for ${user.email}: ${url}`)
      // TODO: Integrate with actual email service
    },
  },

  // Advanced features and security - simplified
  // TODO: Re-enable advanced features when BetterAuth version supports them

  // Two-factor authentication
  twoFactor: {
    issuer: 'Your App',
    // Email-based 2FA
    emailOTP: {
      enabled: !!process.env.SMTP_HOST,
      expiresIn: 10 * 60, // 10 minutes
      sendTo: async ({ user, code }: { user: any; code: string }) => {
        // This would integrate with your email service
        console.log(`Email OTP for ${user.email}: ${code}`)
        // TODO: Integrate with actual email service
      },
    },
  },

  // CORS and security configuration
  trustedOrigins: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
  ],
})

export type Auth = typeof auth

// Export authentication utilities
export const authHandler = auth.handler

// Export types
export type { User, Account, Session, Verification } from 'better-auth/types'

// Export auth services - Temporarily disabled due to missing dependencies
// export { mfaService } from './services/mfa.service'
// export { emailService } from './services/email.service'
// export { passwordResetService } from './services/password-reset.service'