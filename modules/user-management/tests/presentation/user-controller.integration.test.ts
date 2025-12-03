/**
 * User Controller Integration Tests
 *
 * Comprehensive testing for user management API endpoints
 * Tests HTTP operations, authentication flows, validation, and security
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createUserRoutes, createAuthRoutes } from '../src/presentation/user-controller'
import type { IUserService } from '../src/application'
import type {
  CreateUserInput,
  UpdateUserInput,
  UserDomainEntity,
} from '../src/domain'

// Mock User Service for testing
const mockUserService = {
  createUser: vi.fn(),
  listUsers: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  authenticateUser: vi.fn(),
  changePassword: vi.fn(),
} as unknown as IUserService

// Mock context helper functions
vi.mock('../src/presentation/user-controller', async () => {
  const actual = await vi.importActual('../src/presentation/user-controller')
  return {
    ...actual,
    getTenantContext: vi.fn(() => ({ tenantId: 'test-tenant' })),
    getCurrentUser: vi.fn(() => ({ id: 'user-123' })),
  }
})

describe('UserController Integration', () => {
  let userApp: Hono
  let authApp: Hono

  beforeEach(() => {
    userApp = createUserRoutes(mockUserService)
    authApp = createAuthRoutes(mockUserService)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /users', () => {
    it('should create a new user with valid data', async () => {
      const userData: CreateUserInput = {
        tenantId: 'test-tenant',
        email: 'newuser@example.com',
        phone: '+1234567890',
      }

      const mockUser: UserDomainEntity = {
        id: 'user-123',
        tenantId: userData.tenantId,
        email: userData.email,
        phone: userData.phone || '',
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockUserService.createUser.mockResolvedValue(mockUser)

      const response = await userApp.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual({
        success: true,
        data: mockUser,
        message: 'User created successfully',
      })

      expect(mockUserService.createUser).toHaveBeenCalledWith(userData)
    })

    it('should validate user creation data', async () => {
      const invalidData = {
        tenantId: '', // Invalid: empty tenant ID
        email: 'invalid-email', // Invalid: not a valid email
        phone: 'invalid-phone',
      }

      const response = await userApp.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('errors')
    })

    it('should handle email conflict during creation', async () => {
      const userData: CreateUserInput = {
        tenantId: 'test-tenant',
        email: 'existing@example.com',
        phone: null,
      }

      const error = new Error('User with this email already exists')
      mockUserService.createUser.mockRejectedValue(error)

      const response = await userApp.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.message).toContain('already exists')
    })

    it('should handle malicious input during creation', async () => {
      const maliciousData = {
        tenantId: '../../../etc/passwd',
        email: '<script>alert("xss")</script>@example.com',
        phone: "'; DROP TABLE users; --",
      }

      mockUserService.createUser.mockRejectedValue(
        new Error('Invalid input data'),
      )

      const response = await userApp.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData),
      })

      expect(response.status).toBe(500)
    })
  })

  describe('GET /users', () => {
    it('should list users with default parameters', async () => {
      const mockResult = {
        data: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            phone: '+1234567890',
            isActive: true,
            isSystemAdmin: false,
            tenantId: 'test-tenant',
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      }

      mockUserService.listUsers.mockResolvedValue(mockResult)

      const response = await userApp.request('/users')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockResult.data,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      })

      expect(mockUserService.listUsers).toHaveBeenCalledWith('test-tenant', {
        page: 1,
        limit: 20,
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        isActive: false,
      })
    })

    it('should list users with custom parameters', async () => {
      const mockResult = {
        data: [],
        page: 2,
        limit: 10,
        total: 0,
        totalPages: 0,
      }

      mockUserService.listUsers.mockResolvedValue(mockResult)

      const response = await userApp.request(
        '/users?page=2&limit=10&search=john&sortBy=email&sortOrder=asc&isActive=true',
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(10)

      expect(mockUserService.listUsers).toHaveBeenCalledWith('test-tenant', {
        page: 2,
        limit: 10,
        search: 'john',
        sortBy: 'email',
        sortOrder: 'asc',
        isActive: true,
      })
    })

    it('should handle invalid query parameters gracefully', async () => {
      const mockResult = {
        data: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      }

      mockUserService.listUsers.mockResolvedValue(mockResult)

      const response = await userApp.request(
        '/users?page=invalid&limit=invalid&sortBy=invalid&sortOrder=invalid&isActive=invalid',
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(1) // Should use defaults
      expect(data.pagination.limit).toBe(20)
    })

    it('should handle service errors during listing', async () => {
      mockUserService.listUsers.mockRejectedValue(
        new Error('Database connection failed'),
      )

      const response = await userApp.request('/users')

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.message).toBe('Failed to list users')
    })
  })

  describe('GET /users/:id', () => {
    it('should get user by ID', async () => {
      const mockUser: UserDomainEntity = {
        id: 'user-123',
        tenantId: 'test-tenant',
        email: 'user@example.com',
        phone: '+1234567890',
        isActive: true,
        isSystemAdmin: false,
        metadata: { fullName: 'John Doe' },
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockUserService.getUser.mockResolvedValue(mockUser)

      const response = await userApp.request('/users/user-123')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockUser,
      })

      expect(mockUserService.getUser).toHaveBeenCalledWith('user-123')
    })

    it('should return 404 for non-existent user', async () => {
      const error = new Error('User not found')
      mockUserService.getUser.mockRejectedValue(error)

      const response = await userApp.request('/users/non-existent')

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.message).toContain('not found')
    })

    it('should handle malicious user ID', async () => {
      const maliciousId = '../../../etc/passwd'

      mockUserService.getUser.mockRejectedValue(
        new Error('Invalid user ID format'),
      )

      const response = await userApp.request(`/users/${maliciousId}`)

      expect(response.status).toBe(500)
    })
  })

  describe('PUT /users/:id', () => {
    it('should update user with valid data', async () => {
      const updateData: UpdateUserInput = {
        email: 'updated@example.com',
        phone: '+9876543210',
        isActive: false,
      }

      const mockUser: UserDomainEntity = {
        id: 'user-123',
        tenantId: 'test-tenant',
        email: updateData.email || 'original@example.com',
        phone: updateData.phone || '',
        isActive: updateData.isActive || true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockUserService.updateUser.mockResolvedValue(mockUser)

      const response = await userApp.request('/users/user-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockUser,
        message: 'User updated successfully',
      })

      expect(mockUserService.updateUser).toHaveBeenCalledWith('user-123', updateData)
    })

    it('should validate user update data', async () => {
      const invalidData = {
        email: 'invalid-email-format',
        phone: 'not-a-phone-number',
        isActive: 'not-boolean',
      }

      const response = await userApp.request('/users/user-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('errors')
    })

    it('should handle user not found during update', async () => {
      const updateData: UpdateUserInput = { email: 'updated@example.com' }
      const error = new Error('User not found')
      mockUserService.updateUser.mockRejectedValue(error)

      const response = await userApp.request('/users/non-existent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.message).toContain('not found')
    })

    it('should handle email conflict during update', async () => {
      const updateData: UpdateUserInput = { email: 'existing@example.com' }
      const error = new Error('User with this email already exists')
      mockUserService.updateUser.mockRejectedValue(error)

      const response = await userApp.request('/users/user-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.message).toContain('already exists')
    })
  })

  describe('DELETE /users/:id', () => {
    it('should delete user successfully', async () => {
      mockUserService.deleteUser.mockResolvedValue(undefined)

      const response = await userApp.request('/users/user-123', {
        method: 'DELETE',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'User deleted successfully',
      })

      expect(mockUserService.deleteUser).toHaveBeenCalledWith('user-123')
    })

    it('should handle user not found during deletion', async () => {
      const error = new Error('User not found')
      mockUserService.deleteUser.mockRejectedValue(error)

      const response = await userApp.request('/users/non-existent', {
        method: 'DELETE',
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.message).toContain('not found')
    })

    it('should handle malicious user ID in deletion', async () => {
      const maliciousId = '../..'

      mockUserService.deleteUser.mockRejectedValue(
        new Error('Invalid user ID format'),
      )

      const response = await userApp.request(`/users/${maliciousId}`, {
        method: 'DELETE',
      })

      expect(response.status).toBe(500)
    })
  })

  describe('GET /users/profile', () => {
    it('should get current user profile', async () => {
      const mockUser: UserDomainEntity = {
        id: 'user-123',
        tenantId: 'test-tenant',
        email: 'user@example.com',
        phone: '+1234567890',
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockUserService.getUser.mockResolvedValue(mockUser)

      const response = await userApp.request('/users/profile')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockUser,
      })

      expect(mockUserService.getUser).toHaveBeenCalledWith('user-123')
    })

    it('should handle profile not found', async () => {
      const error = new Error('User not found')
      mockUserService.getUser.mockRejectedValue(error)

      const response = await userApp.request('/users/profile')

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.message).toContain('not found')
    })
  })

  describe('PUT /users/profile', () => {
    it('should update current user profile', async () => {
      const updateData: UpdateUserInput = {
        phone: '+9876543210',
        isActive: true,
      }

      const mockUser: UserDomainEntity = {
        id: 'user-123',
        tenantId: 'test-tenant',
        email: 'user@example.com',
        phone: updateData.phone || '',
        isActive: updateData.isActive || true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockUserService.updateUser.mockResolvedValue(mockUser)

      const response = await userApp.request('/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockUser,
        message: 'Profile updated successfully',
      })

      expect(mockUserService.updateUser).toHaveBeenCalledWith('user-123', updateData)
    })

    it('should validate profile update data', async () => {
      const invalidData = {
        email: 'invalid-email',
        phone: 'not-a-phone',
        isActive: 'not-boolean',
      }

      const response = await userApp.request('/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('errors')
    })
  })

  describe('POST /users/change-password', () => {
    it('should change password with valid data', async () => {
      const passwordData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword456',
      }

      mockUserService.changePassword.mockResolvedValue(undefined)

      const response = await userApp.request('/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Password changed successfully',
      })

      expect(mockUserService.changePassword).toHaveBeenCalledWith(
        'user-123',
        passwordData.currentPassword,
        passwordData.newPassword,
      )
    })

    it('should validate password change data', async () => {
      const invalidData = {
        currentPassword: '', // Invalid: empty
        newPassword: '123', // Invalid: too short
      }

      const response = await userApp.request('/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('errors')
    })

    it('should handle invalid current password', async () => {
      const passwordData = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword456',
      }

      const error = new Error('Invalid current password')
      mockUserService.changePassword.mockRejectedValue(error)

      const response = await userApp.request('/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.message).toBe('Invalid current password')
    })

    it('should handle service errors during password change', async () => {
      const passwordData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword456',
      }

      mockUserService.changePassword.mockRejectedValue(
        new Error('Service unavailable'),
      )

      const response = await userApp.request('/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.message).toBe('Failed to change password')
    })
  })
})

describe('AuthController Integration', () => {
  let authApp: Hono

  beforeEach(() => {
    authApp = createAuthRoutes(mockUserService)
    vi.clearAllMocks()
  })

  describe('POST /auth/login', () => {
    it('should authenticate user with valid credentials', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
        tenantId: 'test-tenant',
      }

      const mockResult = {
        success: true,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          tenantId: 'test-tenant',
        },
        session: {
          token: 'session-token-123',
          expiresAt: new Date(),
        },
        requiresMfa: false,
      }

      mockUserService.authenticateUser.mockResolvedValue(mockResult)

      const response = await authApp.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: {
          user: mockResult.user,
          session: mockResult.session,
        },
        message: 'Login successful',
      })

      expect(mockUserService.authenticateUser).toHaveBeenCalledWith(
        loginData.email,
        loginData.password,
        loginData.tenantId,
      )
    })

    it('should handle MFA requirement', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
        tenantId: 'test-tenant',
      }

      const mockResult = {
        success: true,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          tenantId: 'test-tenant',
        },
        requiresMfa: true,
      }

      mockUserService.authenticateUser.mockResolvedValue(mockResult)

      const response = await authApp.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        requiresMfa: true,
        message: 'MFA verification required',
      })
    })

    it('should handle authentication failure', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'wrongPassword',
        tenantId: 'test-tenant',
      }

      const mockResult = {
        success: false,
        error: 'Invalid credentials',
      }

      mockUserService.authenticateUser.mockResolvedValue(mockResult)

      const response = await authApp.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.message).toBe('Invalid credentials')
    })

    it('should validate login data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '', // Invalid: empty password
        tenantId: '', // Invalid: empty tenant ID
      }

      const response = await authApp.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('errors')
    })

    it('should handle service errors during authentication', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
        tenantId: 'test-tenant',
      }

      mockUserService.authenticateUser.mockRejectedValue(
        new Error('Authentication service down'),
      )

      const response = await authApp.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.message).toBe('Authentication service unavailable')
    })
  })

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await authApp.request('/auth/logout', {
        method: 'POST',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Logout successful',
      })
    })

    it('should handle logout errors', async () => {
      // This endpoint currently doesn't have error handling
      // In a real implementation, it would handle session invalidation
      const response = await authApp.request('/auth/logout', {
        method: 'POST',
      })

      expect(response.status).toBe(200)
    })
  })

  describe('POST /auth/register', () => {
    it('should register new user with valid data', async () => {
      const registrationData = {
        tenantId: 'test-tenant',
        email: 'newuser@example.com',
        phone: '+1234567890',
      }

      const mockUser: UserDomainEntity = {
        id: 'user-123',
        tenantId: registrationData.tenantId,
        email: registrationData.email,
        phone: registrationData.phone || '',
        isActive: true,
        isSystemAdmin: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockUserService.createUser.mockResolvedValue(mockUser)

      const response = await authApp.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual({
        success: true,
        data: mockUser,
        message: 'Registration successful',
      })

      expect(mockUserService.createUser).toHaveBeenCalledWith(registrationData)
    })

    it('should validate registration data', async () => {
      const invalidData = {
        tenantId: '', // Invalid: empty
        email: 'invalid-email', // Invalid: not a valid email
        phone: 'invalid-phone',
      }

      const response = await authApp.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('errors')
    })

    it('should handle email conflict during registration', async () => {
      const registrationData = {
        tenantId: 'test-tenant',
        email: 'existing@example.com',
        phone: null,
      }

      const error = new Error('User with this email already exists')
      mockUserService.createUser.mockRejectedValue(error)

      const response = await authApp.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.message).toContain('already exists')
    })
  })

  describe('POST /auth/forgot-password', () => {
    it('should handle forgot password request', async () => {
      const forgotPasswordData = {
        email: 'user@example.com',
      }

      const response = await authApp.request('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forgotPasswordData),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Password reset email sent',
      })
    })

    it('should validate forgot password data', async () => {
      const invalidData = {
        email: 'invalid-email-format',
      }

      const response = await authApp.request('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('errors')
    })
  })

  describe('POST /auth/reset-password', () => {
    it('should handle password reset request', async () => {
      const resetPasswordData = {
        token: 'reset-token-123',
        newPassword: 'newPassword456',
      }

      const response = await authApp.request('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetPasswordData),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Password reset successful',
      })
    })

    it('should validate reset password data', async () => {
      const invalidData = {
        token: '', // Invalid: empty token
        newPassword: '123', // Invalid: too short
      }

      const response = await authApp.request('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('errors')
    })
  })

  describe('Security and Input Validation', () => {
    it('should handle XSS attempts in user data', async () => {
      const maliciousData = {
        tenantId: 'test-tenant',
        email: 'user@example.com',
        phone: '<script>alert("xss")</script>',
      }

      mockUserService.createUser.mockRejectedValue(
        new Error('Invalid input detected'),
      )

      const response = await authApp.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData),
      })

      expect(response.status).toBe(500)
    })

    it('should handle SQL injection attempts', async () => {
      const maliciousData = {
        email: "'; DROP TABLE users; --",
        password: 'password',
        tenantId: "'; DROP TABLE tenants; --",
      }

      mockUserService.authenticateUser.mockRejectedValue(
        new Error('Malicious input detected'),
      )

      const response = await authApp.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData),
      })

      expect(response.status).toBe(500)
    })

    it('should handle extremely long inputs', async () => {
      const longString = 'a'.repeat(10000)
      const longData = {
        tenantId: longString,
        email: `${longString}@example.com`,
        phone: longString,
      }

      mockUserService.createUser.mockRejectedValue(
        new Error('Input too long'),
      )

      const response = await authApp.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(longData),
      })

      expect(response.status).toBe(500)
    })

    it('should handle malformed JSON requests', async () => {
      const response = await authApp.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{',
      })

      expect(response.status).toBe(400)
    })
  })
})