import { serve } from '@hono/node-server'
import { PrismaClient } from '@pems/database'
import {
  apiErrorHandling,
  apiRequestLogging,
  apiSecurityHeaders,
  authMiddleware,
  authorizationMiddleware,
  createAuthRateLimiter,
  createGeneralRateLimiter,
  tenantContextMiddleware,
} from '@pems/middleware'
import {
  createTenantRoutes,
  TenantRepository,
  TenantService,
} from '@pems/tenant-management'
import { authRouter } from './routes/auth'
import { usersRouter } from './routes/users'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Initialize database connection
const prisma = new PrismaClient()

// Initialize application services
const tenantRepository = new TenantRepository(prisma)
const tenantService = new TenantService(tenantRepository)

const app = new Hono()

// Enhanced middleware stack (execution order matters)

// 1. Security headers (first)
app.use('*', apiSecurityHeaders())

// 2. CORS configuration
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'X-Request-ID',
    ],
  }),
)

// 3. Request logging and correlation ID
app.use('*', apiRequestLogging())

// 4. Rate limiting (before auth to prevent abuse)
app.use('*', createGeneralRateLimiter())

// 5. Enhanced error handling
app.use('*', apiErrorHandling())

// 6. Authentication middleware for protected routes
app.use(
  '/api/*',
  authMiddleware({
    required: true,
    skipPaths: [
      '/api/health',
      '/api/auth/sign-in',
      '/api/auth/sign-up',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
    ],
  }),
)

// 7. Tenant context middleware for authenticated API routes
app.use('/api/*', tenantContextMiddleware(prisma))

// 8. Authorization middleware for protected routes
app.use(
  '/api/*',
  authorizationMiddleware({
    skipPaths: [
      '/api/health',
      '/api/auth/sign-in',
      '/api/auth/sign-up',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
    ],
  }),
)

// 9. Auth-specific rate limiting
app.use('/api/auth/*', createAuthRateLimiter())

// Basic routes
app.get('/', (c) => {
  return c.json({
    message: 'PEMS API is running',
    version: '1.0.0',
    features: {
      multiTenancy: true,
      rowLevelSecurity: true,
      uuidv7: true,
    },
  })
})

// Health check with database status
app.get('/health', async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    })
  } catch (error) {
    return c.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      503,
    )
  }
})

// API Routes
app.route('/api', createTenantRoutes(tenantService))

// Authentication routes
app.route('/api/auth', authRouter)

// User management routes
app.route('/api/users', usersRouter)

// Note: Error handling and 404 are now handled by the enhanced error handling middleware

const port = 3002

// Graceful shutdown
process.on('SIGINT', async () => {
  // eslint-disable-next-line no-console
  console.log('Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  // eslint-disable-next-line no-console
  console.log('Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

// eslint-disable-next-line no-console
console.log(`🚀 PEMS API Server starting on port ${port}`)
// eslint-disable-next-line no-console
console.log(`📊 Health check: http://localhost:${port}/health`)
// eslint-disable-next-line no-console
console.log(`🔐 Multi-tenant architecture with RLS enabled`)

serve({
  fetch: app.fetch,
  port,
})
