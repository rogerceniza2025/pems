/**
 * Authentication Performance Tests
 *
 * Performance testing for authentication endpoints:
 * - Load testing for concurrent users
 * - Response time benchmarks
 * - Memory usage monitoring
 * - Database query optimization
 * - Session management performance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@pems/database'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { authRouter } from '../../apps/api/src/routes/auth'
import { performance } from 'perf_hooks'

// Test configuration
const TEST_PORT = 3004
const API_BASE_URL = `http://localhost:${TEST_PORT}/api`

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  SIGN_IN_MAX_TIME: 2000, // 2 seconds
  SIGN_UP_MAX_TIME: 3000, // 3 seconds
  PROFILE_MAX_TIME: 1000, // 1 second
  CONCURRENT_USERS: 50,
  RAMP_UP_TIME: 5000, // 5 seconds
}

describe('Authentication Performance Tests', () => {
  let prisma: PrismaClient
  let app: Hono
  let server: any

  beforeAll(async () => {
    // Initialize test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/pems_perf_test',
        },
      },
    })

    // Setup test app
    app = new Hono()
    app.route('/api/auth', authRouter)

    // Start test server
    server = serve({
      fetch: app.fetch,
      port: TEST_PORT,
    })

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterAll(async () => {
    if (server) {
      server.close()
    }
    if (prisma) {
      await prisma.$disconnect()
    }
  })

  beforeEach(async () => {
    // Clean up test data
    await cleanupTestData()
  })

  async function cleanupTestData() {
    await prisma.better_auth_users.deleteMany()
    await prisma.tenant.deleteMany()
  }

  async function measureRequest(endpoint: string, options: RequestInit = {}): Promise<{
    response: Response
    duration: number
  }> {
    const startTime = performance.now()

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    const endTime = performance.now()
    const duration = endTime - startTime

    return { response, duration }
  }

  async function createTestTenant() {
    return await prisma.tenant.create({
      data: {
        id: `perf-tenant-${Date.now()}`,
        name: 'Performance Test Organization',
        slug: `perf-org-${Date.now()}`,
      },
    })
  }

  describe('Single Request Performance', () => {
    it('should handle sign-in within performance threshold', async () => {
      const tenant = await createTestTenant()

      // First create a user
      const userData = {
        email: `perf-user-${Date.now()}@example.com`,
        password: 'SecurePass123',
        name: 'Performance User',
        tenantId: tenant.id,
      }

      await fetch(`${API_BASE_URL}/auth/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      // Measure sign-in performance
      const { response, duration } = await measureRequest('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          tenantId: tenant.id,
        }),
      })

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SIGN_IN_MAX_TIME)

      console.log(`Sign-in duration: ${duration.toFixed(2)}ms`)
    })

    it('should handle sign-up within performance threshold', async () => {
      const tenant = await createTestTenant()

      const userData = {
        email: `perf-signup-${Date.now()}@example.com`,
        password: 'SecurePass123',
        name: 'Performance Signup User',
        tenantId: tenant.id,
      }

      const { response, duration } = await measureRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(userData),
      })

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SIGN_UP_MAX_TIME)

      console.log(`Sign-up duration: ${duration.toFixed(2)}ms`)
    })

    it('should handle profile fetch within performance threshold', async () => {
      const tenant = await createTestTenant()

      // Create and sign in user
      const userData = {
        email: `perf-profile-${Date.now()}@example.com`,
        password: 'SecurePass123',
        name: 'Performance Profile User',
        tenantId: tenant.id,
      }

      await fetch(`${API_BASE_URL}/auth/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      const signInResponse = await fetch(`${API_BASE_URL}/auth/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          tenantId: tenant.id,
        }),
      })

      const signInData = await signInResponse.json()
      const sessionToken = signInData.session.token

      // Measure profile fetch performance
      const { response, duration } = await measureRequest('/auth/profile', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.PROFILE_MAX_TIME)

      console.log(`Profile fetch duration: ${duration.toFixed(2)}ms`)
    })
  })

  describe('Concurrent Request Performance', () => {
    it('should handle concurrent sign-in requests', async () => {
      const tenant = await createTestTenant()

      // Create multiple users
      const users = Array.from({ length: PERFORMANCE_THRESHOLDS.CONCURRENT_USERS }, (_, i) => ({
        email: `perf-concurrent-${i}-${Date.now()}@example.com`,
        password: 'SecurePass123',
        name: `Concurrent User ${i}`,
        tenantId: tenant.id,
      }))

      // Sign up all users first
      await Promise.all(
        users.map(user =>
          fetch(`${API_BASE_URL}/auth/sign-up`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
          })
        )
      )

      // Measure concurrent sign-in performance
      const startTime = performance.now()

      const signInPromises = users.map(user =>
        fetch(`${API_BASE_URL}/auth/sign-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            password: user.password,
            tenantId: user.tenantId,
          }),
        })
      )

      const responses = await Promise.all(signInPromises)

      const endTime = performance.now()
      const totalDuration = endTime - startTime
      const averageDuration = totalDuration / responses.length

      const successCount = responses.filter(response => response.ok).length

      expect(successCount).toBeGreaterThan(PERFORMANCE_THRESHOLDS.CONCURRENT_USERS * 0.9) // At least 90% success
      expect(averageDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.SIGN_IN_MAX_TIME)

      console.log(`Concurrent sign-ins: ${successCount}/${responses.length} successful`)
      console.log(`Average duration: ${averageDuration.toFixed(2)}ms`)
      console.log(`Total duration: ${totalDuration.toFixed(2)}ms`)
    })

    it('should handle concurrent user creation', async () => {
      const tenant = await createTestTenant()

      const startTime = performance.now()

      const users = Array.from({ length: PERFORMANCE_THRESHOLDS.CONCURRENT_USERS }, (_, i) => ({
        email: `perf-create-${i}-${Date.now()}@example.com`,
        password: 'SecurePass123',
        name: `Create User ${i}`,
        tenantId: tenant.id,
      }))

      const createPromises = users.map(user =>
        fetch(`${API_BASE_URL}/auth/sign-up`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        })
      )

      const responses = await Promise.all(createPromises)

      const endTime = performance.now()
      const totalDuration = endTime - startTime
      const averageDuration = totalDuration / responses.length

      const successCount = responses.filter(response => response.ok).length

      expect(successCount).toBeGreaterThan(PERFORMANCE_THRESHOLDS.CONCURRENT_USERS * 0.9)
      expect(averageDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.SIGN_UP_MAX_TIME)

      console.log(`Concurrent sign-ups: ${successCount}/${responses.length} successful`)
      console.log(`Average duration: ${averageDuration.toFixed(2)}ms`)
    })
  })

  describe('Memory and Resource Usage', () => {
    it('should handle large numbers of requests without memory leaks', async () => {
      const tenant = await createTestTenant()

      const initialMemory = process.memoryUsage()

      // Create many requests in batches
      const batchSize = 10
      const totalBatches = 20

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchUsers = Array.from({ length: batchSize }, (_, i) => ({
          email: `perf-memory-b${batch}u${i}-${Date.now()}@example.com`,
          password: 'SecurePass123',
          name: `Memory User B${batch}U${i}`,
          tenantId: tenant.id,
        }))

        await Promise.all(
          batchUsers.map(user =>
            fetch(`${API_BASE_URL}/auth/sign-up`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(user),
            })
          )
        )

        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }

      const finalMemory = process.memoryUsage()

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024)

      // Memory increase should be reasonable (< 50MB for 200 requests)
      expect(memoryIncreaseMB).toBeLessThan(50)

      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`)
    })

    it('should maintain response times under sustained load', async () => {
      const tenant = await createTestTenant()

      // Create a test user
      const userData = {
        email: `perf-sustained-${Date.now()}@example.com`,
        password: 'SecurePass123',
        name: 'Sustained Load User',
        tenantId: tenant.id,
      }

      await fetch(`${API_BASE_URL}/auth/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      const signInResponse = await fetch(`${API_BASE_URL}/auth/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          tenantId: tenant.id,
        }),
      })

      const signInData = await signInResponse.json()
      const sessionToken = signInData.session.token

      // Make sustained requests
      const requestCount = 100
      const responseTimes: number[] = []

      for (let i = 0; i < requestCount; i++) {
        const { duration } = await measureRequest('/auth/profile', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        })

        responseTimes.push(duration)
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      const maxResponseTime = Math.max(...responseTimes)
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]

      expect(averageResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROFILE_MAX_TIME)
      expect(maxResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROFILE_MAX_TIME * 2)
      expect(p95ResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROFILE_MAX_TIME * 1.5)

      console.log(`Sustained load stats:`)
      console.log(`  Average: ${averageResponseTime.toFixed(2)}ms`)
      console.log(`  Max: ${maxResponseTime.toFixed(2)}ms`)
      console.log(`  P95: ${p95ResponseTime.toFixed(2)}ms`)
    })
  })

  describe('Database Performance', () => {
    it('should handle database query efficiency', async () => {
      const tenant = await createTestTenant()

      // Create multiple users
      const userCount = 50
      const users = Array.from({ length: userCount }, (_, i) => ({
        email: `perf-db-${i}-${Date.now()}@example.com`,
        password: 'SecurePass123',
        name: `DB User ${i}`,
        tenantId: tenant.id,
      }))

      // Measure database performance during bulk creation
      const startTime = performance.now()

      await Promise.all(
        users.map(user =>
          fetch(`${API_BASE_URL}/auth/sign-up`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
          })
        )
      )

      const endTime = performance.now()
      const duration = endTime - startTime
      const avgTimePerUser = duration / userCount

      // Should handle bulk creation efficiently
      expect(avgTimePerUser).toBeLessThan(1000) // Less than 1 second per user

      console.log(`DB performance - ${userCount} users in ${duration.toFixed(2)}ms`)
      console.log(`Average per user: ${avgTimePerUser.toFixed(2)}ms`)

      // Test query performance for user lookups
      const lookupStart = performance.now()

      const lookupPromises = users.slice(0, 10).map(user =>
        fetch(`${API_BASE_URL}/auth/sign-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            password: user.password,
            tenantId: user.tenantId,
          }),
        })
      )

      await Promise.all(lookupPromises)

      const lookupEnd = performance.now()
      const lookupDuration = lookupEnd - lookupStart
      const avgLookupTime = lookupDuration / 10

      expect(avgLookupTime).toBeLessThan(500) // Less than 500ms per lookup

      console.log(`DB lookup performance - 10 lookups in ${lookupDuration.toFixed(2)}ms`)
      console.log(`Average lookup: ${avgLookupTime.toFixed(2)}ms`)
    })
  })

  describe('Error Handling Performance', () => {
    it('should handle errors efficiently without performance degradation', async () => {
      const tenant = await createTestTenant()

      // Mix of valid and invalid requests
      const requests = Array.from({ length: 50 }, (_, i) => {
        if (i % 3 === 0) {
          // Invalid request
          return {
            email: 'invalid-email',
            password: 'short',
            tenantId: tenant.id,
          }
        } else {
          // Valid request
          return {
            email: `perf-error-${i}-${Date.now()}@example.com`,
            password: 'SecurePass123',
            tenantId: tenant.id,
          }
        }
      })

      const startTime = performance.now()

      const promises = requests.map(requestData =>
        fetch(`${API_BASE_URL}/auth/sign-up`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        }).catch(error => ({ error: error.message, status: 0 }))
      )

      const responses = await Promise.all(promises)

      const endTime = performance.now()
      const duration = endTime - startTime

      const errorCount = responses.filter(response =>
        response.status === 0 || response.status >= 400
      ).length

      // Should handle errors quickly
      expect(duration).toBeLessThan(10000) // Less than 10 seconds for 50 mixed requests
      expect(errorCount).toBeGreaterThan(0) // Should have some errors

      console.log(`Error handling performance: ${responses.length} requests in ${duration.toFixed(2)}ms`)
      console.log(`Error count: ${errorCount}`)
    })
  })
})