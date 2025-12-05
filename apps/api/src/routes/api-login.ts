/**
 * Simple Login API Endpoint (Template Compatibility)
 * 
 * This route provides compatibility with the template structure.
 * For comprehensive authentication features, use /auth/sign-in instead.
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { auth } from '@pems/infrastructure-auth'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const loginRouter = new Hono()

// Simple validation schema (matching template expectations)
const simpleLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

// POST /api/login - Simple login endpoint
loginRouter.post('/', zValidator('json', simpleLoginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json')

    // For template compatibility, attempt sign-in with minimal requirements
    const result = await auth.api.signIn({
      body: {
        email,
        password,
        callbackURL: `${process.env.FRONTEND_URL}/auth/callback`,
      },
    })

    if (!result.user) {
      throw new HTTPException(401, { message: 'Invalid credentials' })
    }

    return c.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      session: result.session,
    })
  } catch (error) {
    console.error('Simple login error:', error)

    if (error instanceof HTTPException) {
      throw error
    }

    if (error instanceof Error && error.message.includes('Invalid credentials')) {
      throw new HTTPException(401, { message: 'Invalid email or password' })
    }

    throw new HTTPException(500, { message: 'Authentication service unavailable' })
  }
})

export default loginRouter