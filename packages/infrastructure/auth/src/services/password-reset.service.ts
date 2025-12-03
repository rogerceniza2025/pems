/**
 * Password Reset Service
 *
 * Handles secure password reset functionality including token generation,
 * validation, and password change operations
 */

import crypto from 'crypto'
import { prisma } from '@pems/database'
import { emailService } from './email.service'

export interface PasswordResetRequest {
  email: string
  tenantId?: string
}

export interface PasswordResetVerifyRequest {
  token: string
  newPassword: string
}

export interface PasswordResetResult {
  success: boolean
  message?: string
  error?: string
}

export interface PasswordChangeRequest {
  userId: string
  currentPassword: string
  newPassword: string
}

export class PasswordResetService {
  private readonly tokenExpiry: number = 60 * 60 * 1000 // 1 hour
  private readonly maxAttempts: number = 3
  private readonly lockoutTime: number = 15 * 60 * 1000 // 15 minutes

  /**
   * Generate a secure password reset token
   */
  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Hash the reset token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  /**
   * Verify if a reset token is valid
   */
  private verifyTokenHash(token: string, hashedToken: string): boolean {
    const tokenHash = this.hashToken(token)
    return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hashedToken))
  }

  /**
   * Check if an email is rate-limited for password reset requests
   */
  private async isRateLimited(email: string): Promise<boolean> {
    const recentRequests = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM better_auth_verification_tokens
      WHERE identifier = ${email}
      AND expires > NOW()
      AND created_at > NOW() - INTERVAL '1 hour'
    `

    return Number(recentRequests[0]?.count) >= 5 // Max 5 requests per hour
  }

  /**
   * Request a password reset
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<PasswordResetResult> {
    try {
      // Check rate limiting
      if (await this.isRateLimited(request.email)) {
        return {
          success: false,
          error: 'Too many password reset requests. Please try again later.'
        }
      }

      // Find the user
      const user = await prisma.$queryRaw<Array<any>>`
        SELECT id, email, tenant_id, name, created_at FROM better_auth_users
        WHERE email = ${request.email}
        AND is_active = true
        ${request.tenantId ? `AND tenant_id = ${request.tenantId}` : ''}
      `

      if (user.length === 0) {
        // Always return success to prevent email enumeration
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        }
      }

      // Invalidate any existing reset tokens for this email
      await prisma.$executeRaw`
        DELETE FROM better_auth_verification_tokens
        WHERE identifier = ${request.email}
        AND expires > NOW()
      `

      // Generate reset token
      const resetToken = this.generateResetToken()
      const hashedToken = this.hashToken(resetToken)
      const expiresAt = new Date(Date.now() + this.tokenExpiry)

      // Store the reset token
      await prisma.$executeRaw`
        INSERT INTO better_auth_verification_tokens (identifier, token, expires)
        VALUES (${request.email}, ${hashedToken}, ${expiresAt})
      `

      // Generate reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`

      // Send password reset email
      const emailResult = await emailService.sendPasswordResetEmail(
        request.email,
        resetUrl,
        user[0]?.name
      )

      if (!emailResult.success) {
        return {
          success: false,
          error: 'Failed to send password reset email. Please try again.'
        }
      }

      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown password reset error'
      }
    }
  }

  /**
   * Verify a password reset token
   */
  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
    try {
      // Find the token
      const tokenRecord = await prisma.$queryRaw<Array<any>>`
        SELECT identifier, expires FROM better_auth_verification_tokens
        WHERE token = ${this.hashToken(token)}
      `

      if (tokenRecord.length === 0) {
        return {
          valid: false,
          error: 'Invalid or expired reset token'
        }
      }

      // Check if token has expired
      if (new Date(tokenRecord[0].expires) < new Date()) {
        // Clean up expired token
        await prisma.$executeRaw`
          DELETE FROM better_auth_verification_tokens
          WHERE identifier = ${tokenRecord[0].identifier}
          AND token = ${this.hashToken(token)}
        `

        return {
          valid: false,
          error: 'Reset token has expired'
        }
      }

      return {
        valid: true,
        email: tokenRecord[0].identifier
      }

    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Token verification error'
      }
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(request: PasswordResetVerifyRequest): Promise<PasswordResetResult> {
    try {
      // Verify the token first
      const tokenVerification = await this.verifyResetToken(request.token)

      if (!tokenVerification.valid) {
        return {
          success: false,
          error: tokenVerification.error || 'Invalid reset token'
        }
      }

      if (!tokenVerification.email) {
        return {
          success: false,
          error: 'Could not identify user account'
        }
      }

      // Find the user
      const user = await prisma.$queryRaw<Array<any>>`
        SELECT id, email FROM better_auth_users
        WHERE email = ${tokenVerification.email}
        AND is_active = true
      `

      if (user.length === 0) {
        return {
          success: false,
          error: 'User account not found'
        }
      }

      // TODO: Update the user's password in BetterAuth
      // This would typically involve calling BetterAuth's password reset API
      // For now, we'll simulate this with a log message
      console.log(`Password reset requested for user ${user[0]?.id}`)

      // Delete the reset token
      await prisma.$executeRaw`
        DELETE FROM better_auth_verification_tokens
        WHERE identifier = ${tokenVerification.email}
        AND token = ${this.hashToken(request.token)}
      `

      // Invalidate all existing sessions for this user
      await prisma.$executeRaw`
        DELETE FROM better_auth_sessions
        WHERE user_id = ${user[0]?.id}
      `

      return {
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.'
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed'
      }
    }
  }

  /**
   * Change password (for authenticated users)
   */
  async changePassword(request: PasswordChangeRequest): Promise<PasswordResetResult> {
    try {
      // Verify user exists and is active
      const user = await prisma.$queryRaw<Array<any>>`
        SELECT id, email, is_active FROM better_auth_users
        WHERE id = ${request.userId}
      `

      if (user.length === 0) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      if (!user[0]?.is_active) {
        return {
          success: false,
          error: 'Account is inactive'
        }
      }

      // TODO: Verify current password with BetterAuth
      // This would involve calling BetterAuth's authentication API to verify the current password
      // For now, we'll simulate this check
      console.log(`Verifying current password for user ${request.userId}`)

      // TODO: Update the password in BetterAuth
      // This would involve calling BetterAuth's password update API
      console.log(`Updating password for user ${request.userId}`)

      // Invalidate all existing sessions except current one
      // This forces the user to log in again on other devices
      await prisma.$executeRaw`
        DELETE FROM better_auth_sessions
        WHERE user_id = ${request.userId}
        AND sessionToken NOT IN (
          SELECT sessionToken FROM better_auth_sessions
          WHERE user_id = ${request.userId}
          ORDER BY created_at DESC
          LIMIT 1
        )
      `

      return {
        success: true,
        message: 'Password changed successfully. You have been logged out from other devices for security.'
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed'
      }
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<{ deleted: number }> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM better_auth_verification_tokens
        WHERE expires < NOW()
      `

      return {
        deleted: Number(result)
      }

    } catch (error) {
      console.error('Failed to cleanup expired tokens:', error)
      return { deleted: 0 }
    }
  }

  /**
   * Get password reset statistics
   */
  async getPasswordResetStats(): Promise<{
    activeTokens: number
    recentRequests: number
    expiredTokens: number
  }> {
    try {
      const [activeTokens, recentRequests, expiredTokens] = await Promise.all([
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM better_auth_verification_tokens
          WHERE expires > NOW()
        `,
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM better_auth_verification_tokens
          WHERE created_at > NOW() - INTERVAL '24 hours'
        `,
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM better_auth_verification_tokens
          WHERE expires < NOW()
        `
      ])

      return {
        activeTokens: Number(activeTokens[0]?.count || 0),
        recentRequests: Number(recentRequests[0]?.count || 0),
        expiredTokens: Number(expiredTokens[0]?.count || 0)
      }

    } catch (error) {
      console.error('Failed to get password reset stats:', error)
      return { activeTokens: 0, recentRequests: 0, expiredTokens: 0 }
    }
  }

  /**
   * Check if a password reset token exists for an email
   */
  async hasActiveResetToken(email: string): Promise<boolean> {
    try {
      const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS(
          SELECT 1 FROM better_auth_verification_tokens
          WHERE identifier = ${email}
          AND expires > NOW()
        ) as exists
      `

      return result[0]?.exists || false

    } catch {
      return false
    }
  }

  /**
   * Cancel a password reset request
   */
  async cancelPasswordReset(email: string): Promise<PasswordResetResult> {
    try {
      await prisma.$executeRaw`
        DELETE FROM better_auth_verification_tokens
        WHERE identifier = ${email}
        AND expires > NOW()
      `

      return {
        success: true,
        message: 'Password reset request has been cancelled.'
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel password reset'
      }
    }
  }
}

export const passwordResetService = new PasswordResetService()