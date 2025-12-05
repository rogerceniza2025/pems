import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { navigationMiddleware } from './middleware/navigation'
import apiLoginRouter from './routes/api-login'
import apiSignupRouter from './routes/api-signup'
import auth from './routes/auth'
import { default as navigationRoutes } from './routes/navigation'

/**
 * Navigation API Application
 *
 * Sets up the Hono application with:
 * - Navigation routes
 * - Authentication middleware
 * - Security middleware
 * - Error handling
 * - CORS support
 */

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use('*', prettyJSON())

// CORS configuration
app.use(
  '*',
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : [
            'http://localhost:3000',
            'http://localhost:3000',
            'http://localhost:1420',
          ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
  }),
)

// Authentication routes
app.route('/auth', auth)

// Template compatibility routes
app.route('/api/login', apiLoginRouter)
app.route('/api/signup', apiSignupRouter)

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    service: 'navigation-api',
  })
})

// API info endpoint
app.get('/api/info', (c) => {
  return c.json({
    name: 'PEMS Navigation API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Navigation management API for PEMS',
    endpoints: {
      auth: '/auth',
      navigation: '/api/navigation',
      'api-login': '/api/login',
      'api-signup': '/api/signup',
      health: '/health',
      docs: '/docs',
    },
    features: [
      'Permission-based navigation',
      'Multi-tenant support',
      'Real-time updates',
      'Analytics tracking',
      'Caching',
      'Role-based access control',
    ],
  })
})

// Navigation API routes with middleware
app.use('/api/navigation/*', ...navigationMiddleware)
app.route('/api/navigation', navigationRoutes)

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Route not found',
      message: 'The requested route does not exist',
      availableEndpoints: [
        '/health',
        '/api/info',
        '/auth/*',
        '/api/navigation/*',
        '/api/login',
        '/api/signup',
      ],
    },
    404,
  )
})

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json(
    {
      error: 'Internal server error',
      message: 'An unexpected error occurred',
      requestId: c.get('requestId'),
    },
    500,
  )
})

export default app

/**
 * Development server setup
 */
if (import.meta.env.DEV) {
  const port = parseInt(process.env.PORT || '3001', 10)

  console.log(`🚀 Navigation API server starting on port ${port}`)
  console.log(`📍 Health check: http://localhost:${port}/health`)
  console.log(`📚 API info: http://localhost:${port}/api/info`)
  console.log(`🔐 Auth endpoints: http://localhost:${port}/auth/*`)
  console.log(
    `🧭 Navigation endpoints: http://localhost:${port}/api/navigation/*`,
  )
  console.log(
    `📝 Template API: http://localhost:${port}/api/login, http://localhost:${port}/api/signup`,
  )
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)

  // Start the server
  import { serve } from '@hono/node-server'

  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(`✅ Server is running on http://localhost:${info.port}`)
    },
  )
}
