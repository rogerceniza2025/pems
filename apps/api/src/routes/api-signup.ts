/**
 * Simple Signup API Endpoint (Template Compatibility)
 * 
 * This route provides compatibility with the template structure.
 * For comprehensive authentication features, use /auth/sign-up instead.
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { auth } from '@pems/infrastructure-auth'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const signupRouter = new Hono()

// Simple validation schema (matching template expectations)
const simpleSignupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

// POST /api/signup - Simple signup endpoint
signupRouter.post('/', zValidator('json', simpleSignupSchema), async (c) => {
  try {
    const { email, password, name } = c.req.valid('json')

    // For template compatibility, attempt sign-up with minimal requirements
    const result = await auth.api.signUp({
      body: {
        email,
        password,
        name,
        callbackURL: `${process.env.FRONTEND_URL}/auth/callback`,
      },
    })

    if (!result.user) {
      throw new HTTPException(400, { message: 'Failed to create account' })
    }

    return c.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        emailVerified: result.user.emailVerified,
      },
    })
  } catch (error) {
    console.error('Simple signup error:', error)

    if (error instanceof HTTPException) {
      throw error
    }

    if (error instanceof Error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        throw new HTTPException(409, { message: 'An account with this email already exists' })
      }
    }

    throw new HTTPException(500, { message: 'Account creation temporarily unavailable' })
  }
})

export default signupRouter