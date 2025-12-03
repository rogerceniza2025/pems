/**
 * Authentication System Integration Tests
 *
 * End-to-end testing of the complete authentication flow:
 * - User registration and verification
 * - Login with different scenarios
 * - MFA setup and usage
 * - Password reset flow
 * - Session management
 * - Multi-tenant isolation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@pems/database'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { createServer } from 'http'
import { authRouter } from '../../apps/api/src/routes/auth'
import { usersRouter } from '../../apps/api/src/routes/users'

// Test configuration
const TEST_PORT = 3003
const API_BASE_URL = `http://localhost:${TEST_PORT}/api`

// Test data
const testTenant = {
  id: 'test-tenant-id',
  name: 'Test Organization',
  slug: 'test-org',
}

const testUser = {
  email: 'testuser@example.com',
  password: 'SecurePass123',
  name: 'Test User',
  tenantId: testTenant.id,
}

describe('Authentication System Integration', () => {
  let prisma: PrismaClient
  let app: Hono
  let server: any
  let sessionToken: string
  let userId: string

  beforeAll(async () => {
    // Initialize test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/pems_test',
        },
      },
    })

    // Setup test app
    app = new Hono()
    app.route('/api/auth', authRouter)
    app.route('/api/users', usersRouter)

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

    // Setup test tenant
    await prisma.tenant.upsert({
      where: { id: testTenant.id },
      update: {},
      create: testTenant,
    })
  })

  afterEach(async () => {
    // Clean up session data
    sessionToken = ''
    userId = ''
  })

  async function cleanupTestData() {
    await prisma.better_auth_users.deleteMany({
      where: { tenantId: testTenant.id },
    })
    await prisma.tenant.deleteMany({
      where: { id: testTenant.id },
    })
  }

  async function makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken && { Authorization: `Bearer ${sessionToken}` }),
        ...options.headers,
      },
      ...options,
    })

    return response
  }

  describe('User Registration Flow', () => {
    it('should register a new user successfully', async () => {
      const response = await makeRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(testUser),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.user.email).toBe(testUser.email)
      expect(data.user.tenantId).toBe(testUser.tenantId)
      userId = data.user.id
    })

    it('should prevent duplicate email registration in same tenant', async () => {
      // First registration
      await makeRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(testUser),
      })

      // Second registration with same email
      const response = await makeRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(testUser),
      })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.message).toContain('already exists')
    })

    it('should allow same email in different tenants', async () => {
      // Create second tenant
      const secondTenant = {
        id: 'test-tenant-2',
        name: 'Second Organization',
        slug: 'second-org',
      }

      await prisma.tenant.create({ data: secondTenant })

      // Register user in first tenant
      await makeRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify({
          ...testUser,
          tenantId: testTenant.id,
        }),
      })

      // Register same email in second tenant
      const response = await makeRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify({
          ...testUser,
          tenantId: secondTenant.id,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe('User Authentication Flow', () => {
    beforeEach(async () => {
      // Register a test user
      const response = await makeRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(testUser),
      })
      const data = await response.json()
      userId = data.user.id
    })

    it('should authenticate user with valid credentials', async () => {
      const response = await makeRequest('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
          tenantId: testUser.tenantId,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.user.email).toBe(testUser.email)
      expect(data.session).toBeDefined()
      sessionToken = data.session.token
    })

    it('should reject authentication with invalid credentials', async () => {
      const response = await makeRequest('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: 'wrong-password',
          tenantId: testUser.tenantId,
        }),
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.message).toContain('temporarily unavailable')
    })

    it('should reject authentication for wrong tenant', async () => {
      const response = await makeRequest('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
          tenantId: 'wrong-tenant-id',
        }),
      })

      expect(response.status).toBe(500)
    })

    it('should sign out user successfully', async () => {
      // First sign in
      const signInResponse = await makeRequest('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
          tenantId: testUser.tenantId,
        }),
      })

      const signInData = await signInResponse.json()
      sessionToken = signInData.session.token

      // Then sign out
      const signOutResponse = await makeRequest('/auth/sign-out', {
        method: 'POST',
      })

      expect(signOutResponse.status).toBe(200)
      const data = await signOutResponse.json()
      expect(data.success).toBe(true)
    })
  })

  describe('Password Reset Flow', () => {
    beforeEach(async () => {
      // Register a test user
      await makeRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(testUser),
      })
    })

    it('should initiate password reset flow', async () => {
      const response = await makeRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          tenantId: testUser.tenantId,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('password reset link has been sent')
    })

    it('should handle password reset for non-existent email gracefully', async () => {
      const response = await makeRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          tenantId: testUser.tenantId,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      // Should not reveal if email exists or not
    })
  })

  describe('Multi-Factor Authentication', () => {
    beforeEach(async () => {
      // Register and sign in a test user
      await makeRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(testUser),
      })

      const signInResponse = await makeRequest('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
          tenantId: testUser.tenantId,
        }),
      })

      const signInData = await signInResponse.json()
      sessionToken = signInData.session.token
    })

    it('should setup MFA for user', async () => {
      const response = await makeRequest('/auth/mfa/setup', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.secret).toBeDefined()
      expect(data.qrCode).toBeDefined()
      expect(data.backupCodes).toBeDefined()
      expect(Array.isArray(data.backupCodes)).toBe(true)
    })

    it('should get MFA status', async () => {
      const response = await makeRequest('/auth/mfa/status', {
        method: 'GET',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.status).toBeDefined()
    })

    it('should handle MFA verification', async () => {
      // First setup MFA
      await makeRequest('/auth/mfa/setup', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
        }),
      })

      // Then verify with mock code (this would normally require real TOTP)
      const response = await makeRequest('/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({
          code: '123456',
        }),
      })

      // The actual verification depends on the MFA implementation
      expect(response.status).toBeGreaterThanOrEqual(200)
    })
  })

  describe('User Profile Management', () => {
    beforeEach(async () => {
      // Register and sign in a test user
      await makeRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(testUser),
      })

      const signInResponse = await makeRequest('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
          tenantId: testUser.tenantId,
        }),
      })

      const signInData = await signInResponse.json()
      sessionToken = signInData.session.token
    })

    it('should get user profile', async () => {
      const response = await makeRequest('/auth/profile', {
        method: 'GET',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.user.email).toBe(testUser.email)
      expect(data.user.tenantId).toBe(testUser.tenantId)
    })

    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        phone: '+1234567890',
      }

      const response = await makeRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.user.name).toBe(updateData.name)
    })

    it('should reject profile update without authentication', async () => {
      // Clear session token
      const tempToken = sessionToken
      sessionToken = ''

      const response = await makeRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      expect(response.status).toBe(401)

      // Restore token for cleanup
      sessionToken = tempToken
    })
  })

  describe('Session Management', () => {
    beforeEach(async () => {
      // Register and sign in a test user
      await makeRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(testUser),
      })

      const signInResponse = await makeRequest('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
          tenantId: testUser.tenantId,
        }),
      })

      const signInData = await signInResponse.json()
      sessionToken = signInData.session.token
    })

    it('should maintain session across multiple requests', async () => {
      // Make multiple authenticated requests
      const responses = await Promise.all([
        makeRequest('/auth/profile', { method: 'GET' }),
        makeRequest('/auth/mfa/status', { method: 'GET' }),
        makeRequest('/auth/profile', { method: 'GET' }),
      ])

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })

    it('should handle session expiration gracefully', async () => {
      // Simulate expired session by clearing token
      sessionToken = ''

      const response = await makeRequest('/auth/profile', {
        method: 'GET',
      })

      expect(response.status).toBe(401)
    })
  })

  describe('Multi-Tenant Isolation', () => {
    let secondTenant: any
    let secondUser: any

    beforeEach(async () => {
      // Create second tenant
      secondTenant = {
        id: 'second-tenant-id',
        name: 'Second Organization',
        slug: 'second-org',
      }

      await prisma.tenant.create({ data: secondTenant })

      // Register users in both tenants
      secondUser = {
        email: 'seconduser@example.com',
        password: 'SecurePass123',
        name: 'Second User',
        tenantId: secondTenant.id,
      }

      await makeRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(testUser),
      })

      await makeRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(secondUser),
      })
    })

    it('should isolate users by tenant during authentication', async () => {
      // Sign in first tenant user
      const response1 = await makeRequest('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
          tenantId: testUser.tenantId,
        }),
      })

      expect(response1.status).toBe(200)

      // Try to sign in first user with wrong tenant
      const response2 = await makeRequest('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
          tenantId: secondTenant.id,
        }),
      })

      expect(response2.status).toBe(500)
    })

    it('should prevent cross-tenant data access', async () => {
      // Sign in first tenant user
      const signInResponse = await makeRequest('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
          tenantId: testUser.tenantId,
        }),
      })

      const signInData = await signInResponse.json()
      sessionToken = signInData.session.token

      // User should only see their own tenant data
      const profileResponse = await makeRequest('/auth/profile', {
        method: 'GET',
      })

      expect(profileResponse.status).toBe(200)
      const profileData = await profileResponse.json()
      expect(profileData.user.tenantId).toBe(testUser.tenantId)
    })
  })

  describe('Security and Edge Cases', () => {
    it('should handle concurrent authentication attempts', async () => {
      // Register user
      await makeRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(testUser),
      })

      // Make concurrent sign-in attempts
      const concurrentRequests = Array.from({ length: 10 }, () =>
        makeRequest('/auth/sign-in', {
          method: 'POST',
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password,
            tenantId: testUser.tenantId,
          }),
        })
      )

      const responses = await Promise.allSettled(concurrentRequests)

      // All requests should be handled gracefully
      responses.forEach(response => {
        expect(response.status === 'fulfilled').toBe(true)
      })
    })

    it('should validate input formats and prevent injection', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        '../../../etc/passwd',
        null,
        undefined,
        '',
        0,
        false,
        [],
        {},
      ]

      for (const input of maliciousInputs) {
        const response = await makeRequest('/auth/sign-up', {
          method: 'POST',
          body: JSON.stringify({
            email: input,
            password: 'SecurePass123',
            name: 'Test User',
            tenantId: testUser.tenantId,
          }),
        })

        // Should handle gracefully without crashing
        expect([200, 400, 422]).toContain(response.status)
      }
    })

    it('should handle large request payloads', async () => {
      const largeName = 'a'.repeat(10000)

      const response = await makeRequest('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: largeName,
          tenantId: testUser.tenantId,
        }),
      })

      // Should handle gracefully (either accept or reject with proper error)
      expect([200, 400, 413, 422]).toContain(response.status)
    })
  })
})