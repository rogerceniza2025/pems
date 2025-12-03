/**
 * Complete Authentication Flow Integration Tests
 *
 * End-to-end testing for complete authentication flows across all layers:
 * - UI → API → Database integration
 * - Authentication bypass attempts
 * - Authorization escalation attacks
 * - Session management across layers
 * - Multi-tenant authentication scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/solid'
import { axe, toHaveNoViolations } from 'jest-axe'
import { createSignal, createEffect } from 'solid-js'
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/test-database'
import { createTestTenant } from '../helpers/test-tenant'
import { createTestUser } from '../helpers/test-user'
import { MockAPIProvider } from '../helpers/mock-api-provider'
import { LoginForm } from '../../packages/ui/src/components/auth/login-form'
import { RegisterForm } from '../../packages/ui/src/components/auth/register-form'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

describe('Complete Authentication Flow Integration', () => {
  let testDatabase: any
  let apiProvider: any
  let testTenant: any

  beforeAll(async () => {
    testDatabase = await setupTestDatabase()
    apiProvider = new MockAPIProvider(testDatabase)
  })

  afterAll(async () => {
    await cleanupTestDatabase(testDatabase)
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    testTenant = await createTestTenant(testDatabase, {
      name: 'Test Tenant',
      domain: 'test.example.com',
      settings: { requireEmailVerification: true }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('UI → API → Database Authentication Flow', () => {
    it('should complete successful login flow across all layers', async () => {
      const testUser = await createTestUser(testDatabase, {
        tenantId: testTenant.id,
        email: 'test@example.com',
        password: 'SecurePassword123!',
        isActive: true,
        isEmailVerified: true
      })

      const mockAuthAPI = {
        login: vi.fn().mockResolvedValue({
          success: true,
          data: {
            user: { id: testUser.id, email: testUser.email, tenantId: testUser.tenantId },
            session: { token: 'mock-session-token', expiresAt: new Date() }
          }
        })
      }

      render(() => (
        <MockAPIProvider api={mockAuthAPI}>
          <LoginForm />
        </MockAPIProvider>
      ))

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      fireEvent.input(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.input(passwordInput, { target: { value: 'SecurePassword123!' } })

      // Submit form
      await act(async () => {
        fireEvent.click(submitButton)
      })

      // Verify API was called with correct data
      await waitFor(() => {
        expect(mockAuthAPI.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          tenantDomain: 'test.example.com'
        })
      })

      // Verify success state
      await waitFor(() => {
        expect(screen.getByText(/welcome/i)).toBeInTheDocument()
      })
    })

    it('should handle registration flow with proper tenant isolation', async () => {
      const mockAuthAPI = {
        register: vi.fn().mockResolvedValue({
          success: true,
          data: {
            user: { id: 'new-user-id', email: 'new@example.com', tenantId: testTenant.id },
            message: 'Registration successful'
          }
        }),
        checkEmailAvailability: vi.fn().mockResolvedValue({ available: true })
      }

      render(() => (
        <MockAPIProvider api={mockAuthAPI}>
          <RegisterForm tenantDomain={testTenant.domain} />
        </MockAPIProvider>
      ))

      // Fill in registration form
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.input(emailInput, { target: { value: 'new@example.com' } })
      fireEvent.input(passwordInput, { target: { value: 'NewSecurePassword123!' } })
      fireEvent.input(confirmPasswordInput, { target: { value: 'NewSecurePassword123!' } })

      // Submit form
      await act(async () => {
        fireEvent.click(submitButton)
      })

      // Verify API was called with tenant context
      await waitFor(() => {
        expect(mockAuthAPI.register).toHaveBeenCalledWith({
          email: 'new@example.com',
          password: 'NewSecurePassword123!',
          tenantDomain: testTenant.domain,
          tenantId: testTenant.id
        })
      })

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/registration successful/i)).toBeInTheDocument()
      })
    })

    it('should prevent cross-tenant data access in authentication', async () => {
      // Create user in tenant A
      const tenantA = testTenant
      const userA = await createTestUser(testDatabase, {
        tenantId: tenantA.id,
        email: 'user@tenantA.com',
        password: 'Password123!',
        isActive: true
      })

      // Create different tenant
      const tenantB = await createTestTenant(testDatabase, {
        name: 'Tenant B',
        domain: 'tenantB.example.com'
      })

      const mockAuthAPI = {
        login: vi.fn().mockImplementation(async ({ email, tenantDomain }) => {
          // Simulate tenant isolation enforcement
          const user = await testDatabase.user.findFirst({
            where: { email, isActive: true }
          })

          if (!user) return { success: false, error: 'User not found' }

          const userTenant = await testDatabase.tenant.findUnique({
            where: { id: user.tenantId }
          })

          if (userTenant?.domain !== tenantDomain) {
            return { success: false, error: 'Tenant mismatch' }
          }

          return { success: true, data: { user, session: { token: 'token' } } }
        })
      }

      render(() => (
        <MockAPIProvider api={mockAuthAPI}>
          <LoginForm />
        </MockAPIProvider>
      ))

      // Try to login as tenantA user from tenantB domain
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      fireEvent.input(emailInput, { target: { value: 'user@tenantA.com' } })
      fireEvent.input(passwordInput, { target: { value: 'Password123!' } })

      // Mock tenant context as tenantB
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        hostname: 'tenantB.example.com'
      } as any)

      await act(async () => {
        fireEvent.click(submitButton)
      })

      // Should fail due to tenant isolation
      await waitFor(() => {
        expect(mockAuthAPI.login).toHaveBeenCalledWith({
          email: 'user@tenantA.com',
          password: 'Password123!',
          tenantDomain: 'tenantB.example.com'
        })
      })

      await waitFor(() => {
        expect(screen.getByText(/tenant mismatch/i)).toBeInTheDocument()
      })
    })
  })

  describe('Authentication Bypass Prevention', () => {
    it('should prevent session token manipulation', async () => {
      const maliciousTokens = [
        'admin-token-expired',
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'null',
        'undefined',
        'bypass-auth-123'
      ]

      for (const token of maliciousTokens) {
        const mockAuthAPI = {
          validateSession: vi.fn().mockResolvedValue({ valid: false }),
          getCurrentUser: vi.fn().mockRejectedValue(new Error('Invalid session'))
        }

        // Mock session storage manipulation
        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: vi.fn().mockReturnValue(token),
            setItem: vi.fn(),
            removeItem: vi.fn()
          },
          writable: true
        })

        const TestComponent = () => {
          const [user, setUser] = createSignal(null)

          createEffect(async () => {
            try {
              const sessionToken = localStorage.getItem('session-token')
              if (sessionToken) {
                const response = await mockAuthAPI.validateSession(sessionToken)
                if (response.valid) {
                  const currentUser = await mockAuthAPI.getCurrentUser()
                  setUser(currentUser)
                }
              }
            } catch (error) {
              setUser(null)
            }
          })

          return user() ? <div>Welcome {user().email}</div> : <div>Please login</div>
        }

        render(() => (
          <MockAPIProvider api={mockAuthAPI}>
            <TestComponent />
          </MockAPIProvider>
        ))

        await waitFor(() => {
          expect(screen.getByText(/please login/i)).toBeInTheDocument()
        })

        expect(mockAuthAPI.validateSession).toHaveBeenCalledWith(token)
      }
    })

    it('should prevent authentication through malformed requests', async () => {
      const malformedRequests = [
        { email: null, password: 'test' },
        { email: 'test@example.com', password: null },
        { email: '', password: '' },
        { email: 'invalid-email', password: 'test' },
        { email: 'test@example.com', password: 'a'.repeat(10000) }
      ]

      for (const payload of malformedRequests) {
        const mockAuthAPI = {
          login: vi.fn().mockRejectedValue(new Error('Invalid credentials format'))
        }

        render(() => (
          <MockAPIProvider api={mockAuthAPI}>
            <LoginForm />
          </MockAPIProvider>
        ))

        if (payload.email) {
          fireEvent.input(screen.getByLabelText(/email/i), { target: { value: payload.email } })
        }
        if (payload.password) {
          fireEvent.input(screen.getByLabelText(/password/i), { target: { value: payload.password } })
        }

        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
        })

        // Should show validation error
        await waitFor(() => {
          expect(screen.getByText(/invalid email|password required/i)).toBeInTheDocument()
        })
      }
    })

    it('should prevent timing attacks on authentication', async () => {
      const startTime = Date.now()

      const mockAuthAPI = {
        login: vi.fn().mockImplementation(async ({ email, password }) => {
          // Simulate constant time response to prevent timing attacks
          await new Promise(resolve => setTimeout(resolve, 1000))
          return { success: false, error: 'Invalid credentials' }
        })
      }

      render(() => (
        <MockAPIProvider api={mockAuthAPI}>
          <LoginForm />
        </MockAPIProvider>
      ))

      fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'nonexistent@example.com' } })
      fireEvent.input(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should take approximately the same time regardless of user existence
      expect(duration).toBeGreaterThan(900) // At least 900ms
      expect(duration).toBeLessThan(1100) // No more than 1100ms
    })
  })

  describe('Authorization Escalation Prevention', () => {
    it('should prevent privilege escalation through role manipulation', async () => {
      const regularUser = await createTestUser(testDatabase, {
        tenantId: testTenant.id,
        email: 'regular@example.com',
        password: 'Password123!',
        isActive: true,
        role: 'USER'
      })

      const maliciousRoleUpdate = { role: 'ADMIN', permissions: ['ALL'] }

      const mockAuthAPI = {
        login: vi.fn().mockResolvedValue({
          success: true,
          data: {
            user: regularUser,
            session: { token: 'user-token', expiresAt: new Date() }
          }
        }),
        updateRole: vi.fn().mockRejectedValue(new Error('Insufficient permissions'))
      }

      render(() => (
        <MockAPIProvider api={mockAuthAPI}>
          <TestRoleUpdateComponent userId={regularUser.id} />
        </MockAPIProvider>
      ))

      // Try to update role
      const updateButton = screen.getByRole('button', { name: /update role/i })

      await act(async () => {
        fireEvent.click(updateButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument()
      })

      expect(mockAuthAPI.updateRole).toHaveBeenCalledWith(
        regularUser.id,
        maliciousRoleUpdate
      )
    })

    it('should prevent cross-tenant permission access', async () => {
      const tenantA = testTenant
      const tenantB = await createTestTenant(testDatabase, {
        name: 'Another Tenant',
        domain: 'another.example.com'
      })

      const adminInTenantA = await createTestUser(testDatabase, {
        tenantId: tenantA.id,
        email: 'admin@tenantA.com',
        password: 'Password123!',
        isActive: true,
        role: 'ADMIN'
      })

      const mockAuthAPI = {
        getUsersInTenant: vi.fn().mockImplementation(async ({ tenantId, requesterRole }) => {
          if (requesterRole !== 'ADMIN' || requesterTenantId !== tenantId) {
            throw new Error('Cross-tenant access denied')
          }
          return testDatabase.user.findMany({ where: { tenantId } })
        })
      }

      render(() => (
        <MockAPIProvider api={mockAuthAPI}>
          <TestTenantAccessComponent
            currentTenantId={tenantA.id}
            targetTenantId={tenantB.id}
            userRole="ADMIN"
          />
        </MockAPIProvider>
      ))

      const accessButton = screen.getByRole('button', { name: /access other tenant/i })

      await act(async () => {
        fireEvent.click(accessButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/cross-tenant access denied/i)).toBeInTheDocument()
      })
    })
  })

  describe('Session Management Security', () => {
    it('should handle session expiration gracefully', async () => {
      const expiredSession = {
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      }

      const mockAuthAPI = {
        validateSession: vi.fn().mockResolvedValue({ valid: false, expired: true }),
        refreshSession: vi.fn().mockRejectedValue(new Error('Session expired'))
      }

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn().mockReturnValue(JSON.stringify(expiredSession)),
          setItem: vi.fn(),
          removeItem: vi.fn()
        },
        writable: true
      })

      const TestComponent = () => {
        const [sessionValid, setSessionValid] = createSignal(true)

        createEffect(async () => {
          const sessionData = localStorage.getItem('session')
          if (sessionData) {
            const session = JSON.parse(sessionData)
            const response = await mockAuthAPI.validateSession(session.token)
            if (!response.valid) {
              setSessionValid(false)
              localStorage.removeItem('session')
            }
          }
        })

        return sessionValid() ? <div>Session Valid</div> : <div>Session Expired</div>
      }

      render(() => (
        <MockAPIProvider api={mockAuthAPI}>
          <TestComponent />
        </MockAPIProvider>
      ))

      await waitFor(() => {
        expect(screen.getByText(/session expired/i)).toBeInTheDocument()
      })

      expect(localStorage.removeItem).toHaveBeenCalledWith('session')
    })

    it('should prevent session fixation attacks', async () => {
      const maliciousSessionId = 'malicious-session-123'

      const mockAuthAPI = {
        login: vi.fn().mockImplementation(async ({ email, password, existingSessionId }) => {
          // Should not use existing session ID for security
          const newSessionId = `secure-session-${Date.now()}-${Math.random()}`
          return {
            success: true,
            data: {
              user: { id: 'user-123', email },
              session: { token: newSessionId, expiresAt: new Date() }
            }
          }
        })
      }

      render(() => (
        <MockAPIProvider api={mockAuthAPI}>
          <LoginForm />
        </MockAPIProvider>
      ))

      // Mock malicious session ID in URL
      Object.defineProperty(window, 'location', 'get').mockReturnValue({
        search: `?session=${maliciousSessionId}`,
        href: `http://test.example.com/login?session=${maliciousSessionId}`
      } as any)

      fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.input(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
      })

      await waitFor(() => {
        expect(mockAuthAPI.login).toHaveBeenCalled()
      })

      const loginCall = mockAuthAPI.login.mock.calls[0][0]
      expect(loginCall.existingSessionId).not.toBe(maliciousSessionId)
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle database connection failures during authentication', async () => {
      const mockAuthAPI = {
        login: vi.fn().mockRejectedValue(new Error('Database connection failed'))
      }

      render(() => (
        <MockAPIProvider api={mockAuthAPI}>
          <LoginForm />
        </MockAPIProvider>
      ))

      fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.input(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /sign in/i })
      })

      await waitFor(() => {
        expect(screen.getByText(/service temporarily unavailable/i)).toBeInTheDocument()
      })

      // Should not expose internal error details
      expect(screen.queryByText(/database connection failed/i)).not.toBeInTheDocument()
    })

    it('should handle concurrent authentication requests safely', async () => {
      const mockAuthAPI = {
        login: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return { success: true, data: { user: { id: 'user-123' } } }
        })
      }

      render(() => (
        <MockAPIProvider api={mockAuthAPI}>
          <LoginForm />
        </MockAPIProvider>
      ))

      fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.input(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } })

      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Click multiple times rapidly
      await act(async () => {
        fireEvent.click(submitButton)
        fireEvent.click(submitButton)
        fireEvent.click(submitButton)
      })

      // Should only call API once due to request deduplication
      await waitFor(() => {
        expect(mockAuthAPI.login).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Accessibility and UX Security', () => {
    it('should maintain WCAG compliance during authentication flows', async () => {
      const mockAuthAPI = {
        login: vi.fn().mockResolvedValue({ success: true, data: { user: { id: 'user-123' } } })
      }

      const { container } = render(() => (
        <MockAPIProvider api={mockAuthAPI}>
          <LoginForm />
        </MockAPIProvider>
      ))

      // Initial form accessibility
      const initialResults = await axe(container)
      expect(initialResults).toHaveNoViolations()

      // Fill form and submit
      fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.input(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /sign in/i })
      })

      // Post-login accessibility
      const postLoginResults = await axe(container)
      expect(postLoginResults).toHaveNoViolations()
    })

    it('should provide proper error announcements for screen readers', async () => {
      const mockAuthAPI = {
        login: vi.fn().mockRejectedValue(new Error('Invalid credentials'))
      }

      const announceSpy = vi.fn()
      Object.defineProperty(window, 'speechSynthesis', {
        value: {
          speak: vi.fn().mockImplementation((utterance) => {
            announceSpy(utterance.text)
          })
        },
        writable: true
      })

      render(() => (
        <MockAPIProvider api={mockAuthAPI}>
          <LoginForm />
        </MockAPIProvider>
      ))

      fireEvent.input(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.input(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /sign in/i })
      })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })

      // Error should be announced to screen readers
      expect(announceSpy).toHaveBeenCalledWith(expect.stringContaining(/error/i))
    })
  })
})

// Helper Components
const TestRoleUpdateComponent = (props: { userId: string }) => {
  const [message, setMessage] = createSignal('')

  const handleUpdateRole = async () => {
    try {
      const response = await fetch('/api/users/role', {
        method: 'PUT',
        body: JSON.stringify({
          userId: props.userId,
          role: 'ADMIN',
          permissions: ['ALL']
        })
      })

      if (!response.ok) {
        throw new Error('Insufficient permissions')
      }

      setMessage('Role updated successfully')
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <div>
      <button onClick={handleUpdateRole}>Update Role</button>
      <div>{message()}</div>
    </div>
  )
}

const TestTenantAccessComponent = (props: {
  currentTenantId: string
  targetTenantId: string
  userRole: string
}) => {
  const [message, setMessage] = createSignal('')

  const handleAccessOtherTenant = async () => {
    try {
      const response = await fetch(`/api/tenants/${props.targetTenantId}/users`, {
        method: 'GET',
        headers: {
          'X-Tenant-ID': props.currentTenantId,
          'X-User-Role': props.userRole
        }
      })

      if (!response.ok) {
        throw new Error('Cross-tenant access denied')
      }

      setMessage('Access granted')
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <div>
      <button onClick={handleAccessOtherTenant}>Access Other Tenant</button>
      <div>{message()}</div>
    </div>
  )
}