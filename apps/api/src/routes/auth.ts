/**
 * Authentication API Routes
 *
 * Provides comprehensive authentication endpoints using BetterAuth
 * Integrates with tenant management and security features
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { auth, mfaService } from '@pems/infrastructure-auth'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getCurrentUser, getCurrentSession } from '@pems/middleware'

const authRouter = new Hono()

// Validation schemas
const signInSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tenantId: z.string().uuid('Invalid tenant ID'),
  mfaCode: z.string().optional(),
})

const signUpSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  tenantId: z.string().uuid('Invalid tenant ID'),
  phone: z.string().optional(),
})

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
  tenantId: z.string().uuid('Invalid tenant ID'),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

const mfaSetupSchema = z.object({
  email: z.string().email('Invalid email format'),
})

const mfaVerifySchema = z.object({
  code: z.string().min(6, 'MFA code must be at least 6 characters'),
})

const mfaLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tenantId: z.string().uuid('Invalid tenant ID'),
  mfaCode: z.string().min(6, 'MFA code must be at least 6 characters'),
})

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  image: z.string().url('Invalid image URL').optional(),
})

// Sign in endpoint
authRouter.post('/sign-in', zValidator('json', signInSchema), async (c) => {
  try {
    const { email, password, tenantId, mfaCode } = c.req.valid('json')

    // First, attempt sign in
    const signInResult = await auth.api.signIn({
      body: {
        email,
        password,
        // Include tenant context in custom headers/meta
        callbackURL: `${process.env.FRONTEND_URL}/auth/callback`,
      },
      headers: {
        'x-tenant-id': tenantId,
      },
    })

    // Check if MFA is required for this user
    const user = signInResult.user
    if (!user) {
      throw new HTTPException(401, { message: 'Invalid credentials' })
    }

    const mfaEnabled = await mfaService.isMFAEnabled(user.id)

    if (mfaEnabled && !mfaCode) {
      return c.json({
        success: false,
        requiresMFA: true,
        message: 'MFA code required',
        userId: user.id,
      }, 200)
    }

    // If MFA code is provided, verify it
    if (mfaEnabled && mfaCode) {
      const mfaResult = await mfaService.verifyMFACode(user.id, mfaCode)

      if (!mfaResult.success) {
        throw new HTTPException(401, { message: mfaResult.error || 'Invalid MFA code' })
      }
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        tenantId: (user as any).tenantId,
        isSystemAdmin: (user as any).isSystemAdmin || false,
      },
      session: signInResult.session,
    })
  } catch (error) {
    console.error('Sign in error:', error)

    if (error instanceof HTTPException) {
      throw error
    }

    if (error instanceof Error && error.message.includes('Invalid credentials')) {
      throw new HTTPException(401, { message: 'Invalid email or password' })
    }

    throw new HTTPException(500, { message: 'Authentication service temporarily unavailable' })
  }
})

// Sign up endpoint
authRouter.post('/sign-up', zValidator('json', signUpSchema), async (c) => {
  try {
    const { email, password, name, tenantId, phone } = c.req.valid('json')

    const signUpResult = await auth.api.signUp({
      body: {
        email,
        password,
        name,
        callbackURL: `${process.env.FRONTEND_URL}/auth/callback`,
        // Custom fields for tenant awareness
        tenantId,
        phone,
        metadata: {
          tenantId,
          registrationSource: 'api',
        },
      },
      headers: {
        'x-tenant-id': tenantId,
      },
    })

    return c.json({
      success: true,
      message: 'Account created successfully. Please check your email for verification.',
      user: {
        id: signUpResult.user?.id,
        email: signUpResult.user?.email,
        name: signUpResult.user?.name,
        emailVerified: signUpResult.user?.emailVerified,
        tenantId,
      },
    })
  } catch (error) {
    console.error('Sign up error:', error)

    if (error instanceof HTTPException) {
      throw error
    }

    if (error instanceof Error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        throw new HTTPException(409, { message: 'An account with this email already exists' })
      }

      if (error.message.includes('password')) {
        throw new HTTPException(400, { message: error.message })
      }
    }

    throw new HTTPException(500, { message: 'Account creation temporarily unavailable' })
  }
})

// Sign out endpoint
authRouter.post('/sign-out', async (c) => {
  try {
    // Get current session from middleware context
    const session = getCurrentSession(c)

    await auth.api.signOut({
      headers: {
        authorization: `Bearer ${session.token}`,
      },
    })

    return c.json({
      success: true,
      message: 'Signed out successfully',
    })
  } catch (error) {
    console.error('Sign out error:', error)

    // Even if sign out fails, we want to return success to client
    // so they can clear their local session
    return c.json({
      success: true,
      message: 'Signed out successfully',
    })
  }
})

// Forgot password endpoint
authRouter.post('/forgot-password', zValidator('json', forgotPasswordSchema), async (c) => {
  try {
    const { email, tenantId } = c.req.valid('json')

    await auth.api.forgotPassword({
      body: {
        email,
        callbackURL: `${process.env.FRONTEND_URL}/reset-password`,
      },
      headers: {
        'x-tenant-id': tenantId,
      },
    })

    return c.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)

    // Always return success to prevent email enumeration
    return c.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.',
    })
  }
})

// Reset password endpoint
authRouter.post('/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
  try {
    const { token, newPassword } = c.req.valid('json')

    await auth.api.resetPassword({
      body: {
        token,
        newPassword,
      },
    })

    return c.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error) {
    console.error('Reset password error:', error)

    if (error instanceof HTTPException) {
      throw error
    }

    if (error instanceof Error && error.message.includes('invalid') && error.message.includes('token')) {
      throw new HTTPException(400, { message: 'Invalid or expired reset token' })
    }

    throw new HTTPException(500, { message: 'Password reset temporarily unavailable' })
  }
})

// Change password endpoint (authenticated)
authRouter.post('/change-password', zValidator('json', changePasswordSchema), async (c) => {
  try {
    const { currentPassword, newPassword } = c.req.valid('json')
    const user = getCurrentUser(c)

    await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
      },
      headers: {
        authorization: `Bearer ${await getSessionToken(c)}`,
      },
    })

    return c.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    console.error('Change password error:', error)

    if (error instanceof HTTPException) {
      throw error
    }

    if (error instanceof Error && error.message.includes('current password')) {
      throw new HTTPException(400, { message: 'Current password is incorrect' })
    }

    throw new HTTPException(500, { message: 'Password change temporarily unavailable' })
  }
})

// Get current user profile
authRouter.get('/profile', async (c) => {
  try {
    const user = getCurrentUser(c)

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        phone: (user as any).phone,
        image: user.image,
        tenantId: user.tenantId,
        isSystemAdmin: user.isSystemAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  } catch (error) {
    console.error('Get profile error:', error)
    throw new HTTPException(500, { message: 'Unable to retrieve user profile' })
  }
})

// Update user profile
authRouter.put('/profile', zValidator('json', updateProfileSchema), async (c) => {
  try {
    const updates = c.req.valid('json')
    const user = getCurrentUser(c)

    const updatedUser = await auth.api.updateUser({
      body: {
        id: user.id,
        ...updates,
      },
      headers: {
        authorization: `Bearer ${await getSessionToken(c)}`,
      },
    })

    return c.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.user?.id,
        email: updatedUser.user?.email,
        name: updatedUser.user?.name,
        emailVerified: updatedUser.user?.emailVerified,
        phone: (updatedUser.user as any).phone,
        image: updatedUser.user?.image,
        tenantId: (updatedUser.user as any).tenantId,
        isSystemAdmin: (updatedUser.user as any).isSystemAdmin,
        updatedAt: updatedUser.user?.updatedAt,
      },
    })
  } catch (error) {
    console.error('Update profile error:', error)

    if (error instanceof HTTPException) {
      throw error
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      throw new HTTPException(409, { message: 'Email already in use by another account' })
    }

    throw new HTTPException(500, { message: 'Profile update temporarily unavailable' })
  }
})

// MFA Setup endpoint
authRouter.post('/mfa/setup', zValidator('json', mfaSetupSchema), async (c) => {
  try {
    const { email } = c.req.valid('json')
    const user = getCurrentUser(c)

    const mfaResult = await mfaService.setupMFA(user.id, email)

    if (!mfaResult.success) {
      throw new HTTPException(400, { message: mfaResult.error || 'MFA setup failed' })
    }

    return c.json({
      success: true,
      message: 'MFA setup initiated. Please verify with your authenticator app.',
      secret: mfaResult.secret,
      qrCode: mfaResult.qrCode,
      backupCodes: mfaResult.backupCodes,
    })
  } catch (error) {
    console.error('MFA setup error:', error)

    if (error instanceof HTTPException) {
      throw error
    }

    throw new HTTPException(500, { message: 'MFA setup temporarily unavailable' })
  }
})

// MFA Verify endpoint
authRouter.post('/mfa/verify', zValidator('json', mfaVerifySchema), async (c) => {
  try {
    const { code } = c.req.valid('json')
    const user = getCurrentUser(c)

    const mfaResult = await mfaService.verifyMFASetup(user.id, code)

    if (!mfaResult.success) {
      throw new HTTPException(400, { message: mfaResult.error || 'Invalid MFA code' })
    }

    return c.json({
      success: true,
      message: 'MFA enabled successfully',
    })
  } catch (error) {
    console.error('MFA verify error:', error)

    if (error instanceof HTTPException) {
      throw error
    }

    throw new HTTPException(500, { message: 'MFA verification temporarily unavailable' })
  }
})

// MFA Disable endpoint
authRouter.post('/mfa/disable', async (c) => {
  try {
    const user = getCurrentUser(c)
    const { password } = await c.req.json()

    const result = await mfaService.disableMFA(user.id, password)

    if (!result.success) {
      throw new HTTPException(400, { message: result.error || 'Failed to disable MFA' })
    }

    return c.json({
      success: true,
      message: 'MFA disabled successfully',
    })
  } catch (error) {
    console.error('MFA disable error:', error)

    if (error instanceof HTTPException) {
      throw error
    }

    throw new HTTPException(500, { message: 'MFA disable temporarily unavailable' })
  }
})

// MFA Status endpoint
authRouter.get('/mfa/status', async (c) => {
  try {
    const user = getCurrentUser(c)

    const mfaStatus = await mfaService.getMFAStatus(user.id)

    return c.json({
      success: true,
      status: mfaStatus,
    })
  } catch (error) {
    console.error('MFA status error:', error)
    throw new HTTPException(500, { message: 'Unable to retrieve MFA status' })
  }
})

// Helper function to get session token from context
async function getSessionToken(c: any): Promise<string> {
  const session = getCurrentSession(c)
  return session.token
}

export { authRouter }