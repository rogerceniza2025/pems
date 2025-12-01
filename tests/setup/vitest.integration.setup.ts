import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import Redis from 'ioredis'

// Setup test database
const testDbUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://test:test@localhost:5432/pems_test'
const prisma = new PrismaClient({
  datasources: {
    db: { url: testDbUrl },
  },
  log: process.env.CI ? [] : ['query', 'info', 'warn', 'error'],
})

// Setup test Redis
const testRedisUrl = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379'
const redis = new Redis(testRedisUrl)

beforeAll(async () => {
  // Reset database
  try {
    execSync('npx prisma migrate reset --force --skip-seed', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe',
    })

    // Run migrations
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe',
    })
  } catch (error) {
    console.error('Database setup failed:', error)
    throw error
  }

  // Clear Redis
  await redis.flushall()
})

afterAll(async () => {
  await prisma.$disconnect()
  await redis.disconnect()
})

beforeEach(async () => {
  // Clean up test data between tests
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()
  await prisma.student.deleteMany()
  await redis.flushall()
})

// Export for use in tests
export { prisma, redis }
