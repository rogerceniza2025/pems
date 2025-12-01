import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { PrismaClient } from '@pems/database'
import { tenantContextMiddleware } from '@pems/middleware'
import { TenantRepository, TenantService, createTenantRoutes } from '@pems/tenant-management'

// Initialize database connection
const prisma = new PrismaClient()

// Initialize application services
const tenantRepository = new TenantRepository(prisma)
const tenantService = new TenantService(tenantRepository)

const app = new Hono()

// Global middleware
app.use('*', cors())
app.use('*', logger())

// Tenant context middleware for all API routes
app.use('/api/*', tenantContextMiddleware(prisma))

// Basic routes
app.get('/', (c) => {
  return c.json({
    message: 'PEMS API is running',
    version: '1.0.0',
    features: {
      multiTenancy: true,
      rowLevelSecurity: true,
      uuidv7: true
    }
  })
})

// Health check with database status
app.get('/health', async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected'
    })
  } catch (error) {
    return c.json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 503)
  }
})

// API Routes
app.route('/api', createTenantRoutes(tenantService))

// Error handling middleware
app.onError((err, c) => {
  console.error('API Error:', err)

  if (err.name === 'HTTPException') {
    return c.json({
      success: false,
      error: {
        message: err.message,
        status: err.status
      }
    }, err.status)
  }

  return c.json({
    success: false,
    error: {
      message: 'Internal server error',
      status: 500
    }
  }, 500)
})

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      message: 'Endpoint not found',
      status: 404
    }
  }, 404)
})

const port = 3002

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

console.log(`🚀 PEMS API Server starting on port ${port}`)
console.log(`📊 Health check: http://localhost:${port}/health`)
console.log(`🔐 Multi-tenant architecture with RLS enabled`)

serve({
  fetch: app.fetch,
  port,
})
