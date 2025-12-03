import { PrismaClient } from '@pems/database'
import { Hono } from 'hono'
import Redis from 'ioredis'

interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  services: {
    database: ServiceStatus
    redis: ServiceStatus
    memory: ServiceStatus
    disk: ServiceStatus
  }
  metrics: {
    activeConnections: number
    requestsPerMinute: number
    averageResponseTime: number
  }
}

interface ServiceStatus {
  status: 'ok' | 'error'
  responseTime?: number
  error?: string
  lastCheck: string
}

export function setupHealthRoutes(app: Hono) {
  const prisma = new PrismaClient()
  const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL)
    : new Redis()
  const startTime = Date.now()

  // Basic health check
  app.get('/api/health', async (c) => {
    const health = await performHealthCheck(prisma, redis, startTime)
    const statusCode =
      health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503

    return c.json(health, statusCode)
  })

  // Detailed health check
  app.get('/api/health/detailed', async (c) => {
    const health = await performDetailedHealthCheck(prisma, redis, startTime)
    return c.json(health)
  })

  // Readiness probe
  app.get('/api/health/ready', async (c) => {
    const isReady = await checkReadiness(prisma, redis)
    return c.json({ ready: isReady }, isReady ? 200 : 503)
  })

  // Liveness probe
  app.get('/api/health/live', async (c) => {
    return c.json({ alive: true })
  })
}

async function performHealthCheck(
  prisma: PrismaClient,
  redis: Redis,
  startTime: number,
): Promise<HealthCheckResponse> {
  const checks = await Promise.allSettled([
    checkDatabase(prisma),
    checkRedis(redis),
    checkMemory(),
    checkDisk(),
  ])

  const results = checks.map(
    (result): ServiceStatus =>
      result.status === 'fulfilled'
        ? result.value
        : {
            status: 'error',
            error: 'Check failed',
            lastCheck: new Date().toISOString(),
          },
  )

  const [dbStatus, redisStatus, memoryStatus, diskStatus] = results as [
    ServiceStatus,
    ServiceStatus,
    ServiceStatus,
    ServiceStatus,
  ]

  const overallStatus = determineOverallStatus([
    dbStatus,
    redisStatus,
    memoryStatus,
    diskStatus,
  ])

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? 'unknown',
    uptime: Date.now() - startTime,
    services: {
      database: dbStatus,
      redis: redisStatus,
      memory: memoryStatus,
      disk: diskStatus,
    },
    metrics: {
      activeConnections: await getActiveConnections(),
      requestsPerMinute: await getRequestsPerMinute(),
      averageResponseTime: await getAverageResponseTime(),
    },
  }
}

async function performDetailedHealthCheck(
  prisma: PrismaClient,
  redis: Redis,
  startTime: number,
): Promise<HealthCheckResponse> {
  const basicHealth = await performHealthCheck(prisma, redis, startTime)

  // Add additional detailed checks

  const detailedChecks = await Promise.allSettled([
    checkDatabaseConnections(prisma),
    checkRedisMemory(redis),
    checkSystemLoad(),
  ])
  // Log detailed checks for debugging (remove this line if not needed)
  // eslint-disable-next-line no-console
  console.debug('Detailed health checks completed:', detailedChecks)

  return {
    ...basicHealth,
    // Add more detailed metrics as needed
  }
}

async function checkDatabase(prisma: PrismaClient): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      status: 'ok',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    }
  }
}

async function checkRedis(redis: Redis): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const result = await redis.ping()
    return {
      status: result === 'PONG' ? 'ok' : 'error',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    }
  }
}

async function checkMemory(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const memUsage = process.memoryUsage()
    // Calculate memory usage percentage for monitoring
    const memoryUsagePercentStr = (
      (memUsage.heapUsed / memUsage.heapTotal) *
      100
    ).toFixed(2)
    // eslint-disable-next-line no-console
    console.debug(`Memory usage: ${memoryUsagePercentStr}%`)
    const totalMem = require('os').totalmem()
    const freeMem = require('os').freemem()
    const usedMem = totalMem - freeMem
    const memoryUsagePercentCalc = (usedMem / totalMem) * 100

    return {
      status: memoryUsagePercentCalc < 85 ? 'ok' : 'error',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    }
  }
}

async function checkDisk(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const fs = require('fs')

    const stats = fs.statSync('.')
    // Use stats for disk space checking in future implementation
    // eslint-disable-next-line no-console
    console.debug('Current directory stats:', stats)

    return {
      status: 'ok',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    }
  }
}

function determineOverallStatus(
  services: ServiceStatus[],
): 'ok' | 'degraded' | 'unhealthy' {
  const errorCount = services.filter((s) => s.status === 'error').length

  if (errorCount === 0) return 'ok'
  if (errorCount <= services.length / 2) return 'degraded'
  return 'unhealthy'
}

async function checkReadiness(
  prisma: PrismaClient,
  redis: Redis,
): Promise<boolean> {
  try {
    const [dbOk, redisOk] = await Promise.all([
      checkDatabase(prisma),
      checkRedis(redis),
    ])

    return dbOk.status === 'ok' && redisOk.status === 'ok'
  } catch {
    return false
  }
}

// Additional detailed checks
async function checkDatabaseConnections(
  prisma: PrismaClient,
): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    // Check connection pool status

    const result =
      await prisma.$queryRaw`SELECT count(*) FROM pg_stat_activity WHERE state = 'active'`
    // Log active connections for monitoring
    // eslint-disable-next-line no-console
    console.debug('Active database connections:', result)

    return {
      status: 'ok',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    }
  }
}

async function checkRedisMemory(redis: Redis): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const info = await redis.info()
    const memoryUsage = info
      .split('\r\n')
      .find((line: string) => line.includes('used_memory:'))

    return {
      status: memoryUsage ? 'ok' : 'error',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    }
  }
}

async function checkSystemLoad(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const loadAverage = require('os').loadavg()
    const cpuCount = require('os').cpus().length

    return {
      status: loadAverage[0] < cpuCount * 2 ? 'ok' : 'error',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    }
  }
}

// Metrics collection functions
async function getActiveConnections(): Promise<number> {
  // Implementation depends on your connection tracking
  return 0
}

async function getRequestsPerMinute(): Promise<number> {
  // Implementation depends on your metrics collection
  return 0
}

async function getAverageResponseTime(): Promise<number> {
  // Implementation depends on your metrics collection
  return 0
}
