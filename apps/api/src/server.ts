import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

// Middleware
app.use('*', cors())
app.use('*', logger())

// Basic route
app.get('/', (c) => {
  return c.json({ message: 'PEMS API is running' })
})

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const port = 3002

serve({
  fetch: app.fetch,
  port,
})
