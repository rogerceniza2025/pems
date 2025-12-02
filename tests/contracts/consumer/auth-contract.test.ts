import { Pact } from '@pact-foundation/pact';
import { describe, it, expect } from '@jest/globals';

/**
 * Consumer-Driven Contract Testing - Authentication Service
 *
 * This test suite defines contracts between the PEMS frontend application
 * and the authentication service, ensuring API compatibility and
 * preventing breaking changes during development.
 *
 * Contract Definition:
 * - Consumer: PEMS Frontend Application
 * - Provider: Authentication Service
 * - Purpose: Define expected API behavior and data structures
 */

const provider = new Pact({
  consumer: 'pems-frontend',
  provider: 'pems-auth-service',
  port: 1234,
  log: process.env.NODE_ENV === 'development',
  logLevel: process.env.NODE_ENV === 'development' ? 'DEBUG' : 'WARN',
});

describe('Authentication Service Contract', () => {
  beforeAll(async () => {
    await provider.setup();
  });

  afterAll(async () => {
    await provider.finalize();
  });

  describe('User Registration API', () => {
    it('should register a new user successfully', async () => {
      await provider
        .given('a valid registration request')
        .uponReceiving('a POST request to /api/v1/auth/register')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/register',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            firstName: expect.stringMatching(/^[A-Za-z]{2,}$/),
            lastName: expect.stringMatching(/^[A-Za-z]{2,}$/),
            email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
            password: expect.stringMatching(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/),
            acceptTerms: expect.boolean(),
          },
        })
        .willRespondWith({
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Location': expect.stringMatching(/\/api\/v1\/users\/[a-zA-Z0-9-]+/),
          },
          body: {
            success: true,
            message: 'User registered successfully',
            data: {
              user: {
                id: expect.stringMatching(/^[a-zA-Z0-9-]+$/),
                email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
                firstName: expect.stringMatching(/^[A-Za-z]{2,}$/),
                lastName: expect.stringMatching(/^[A-Za-z]{2,}$/),
                role: 'user',
                tenantId: expect.stringMatching(/^[a-zA-Z0-9-]+$/),
                createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
                updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
              },
              token: expect.stringMatching(/^ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
              refreshToken: expect.stringMatching(/^ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
              expiresIn: expect.numberMatching(/^[0-9]+$/),
            },
          },
        });

      // Verify contract by making the request
      const response = await fetch(`${provider.mockService.baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          password: 'SecurePass123!',
          acceptTerms: true,
        }),
      });

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.user.email).toBe('john.doe@example.com');
      expect(responseBody.data.token).toBeDefined();
    });

    it('should handle registration validation errors', async () => {
      await provider
        .given('invalid registration data')
        .uponReceiving('a POST request to /api/v1/auth/register with validation errors')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/register',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.anything(),
        })
        .willRespondWith({
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: false,
            message: expect.stringMatching(/Validation failed/),
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: expect.stringMatching(/email|password|firstName|lastName/),
                message: expect.stringMatching(/required|invalid/),
              }),
            ]),
          },
        });

      // Test validation error
      const response = await fetch(`${provider.mockService.baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: '',
          lastName: '',
          email: 'invalid-email',
          password: 'weak',
          acceptTerms: false,
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(false);
      expect(responseBody.errors).toBeDefined();
    });
  });

  describe('User Login API', () => {
    it('should authenticate user with valid credentials', async () => {
      await provider
        .given('a registered user with valid credentials')
        .uponReceiving('a POST request to /api/v1/auth/login')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/login',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
            password: expect.stringMatching(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            message: 'Login successful',
            data: {
              user: {
                id: expect.stringMatching(/^[a-zA-Z0-9-]+$/),
                email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
                firstName: expect.stringMatching(/^[A-Za-z]{2,}$/),
                lastName: expect.stringMatching(/^[A-Za-z]{2,}$/),
                role: expect.oneOf(['user', 'admin', 'viewer']),
                tenantId: expect.stringMatching(/^[a-zA-Z0-9-]+$/),
                isActive: expect.boolean(),
                lastLoginAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
              },
              token: expect.stringMatching(/^ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
              refreshToken: expect.stringMatching(/^ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
              expiresIn: expect.numberMatching(/^[0-9]+$/),
            },
          },
        });

      // Verify login success
      const response = await fetch(`${provider.mockService.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'john.doe@example.com',
          password: 'SecurePass123!',
        }),
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.token).toBeDefined();
      expect(responseBody.data.user.email).toBe('john.doe@example.com');
    });

    it('should reject invalid credentials', async () => {
      await provider
        .given('invalid user credentials')
        .uponReceiving('a POST request to /api/v1/auth/login with invalid credentials')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/login',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
            password: expect.stringMatching(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/),
          },
        })
        .willRespondWith({
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: false,
            message: expect.stringMatching(/Invalid credentials|Authentication failed/),
            error: {
              code: expect.stringMatching(/INVALID_CREDENTIALS/),
              message: expect.string(),
              timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
            },
          },
        });

      // Test invalid credentials
      const response = await fetch(`${provider.mockService.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'wrong@example.com',
          password: 'WrongPassword123!',
        }),
      });

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBeDefined();
    });
  });

  describe('Token Refresh API', () => {
    it('should refresh access token with valid refresh token', async () => {
      await provider
        .given('a valid refresh token')
        .uponReceiving('a POST request to /api/v1/auth/refresh')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/refresh',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            refreshToken: expect.stringMatching(/^ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            message: 'Token refreshed successfully',
            data: {
              token: expect.stringMatching(/^ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
              refreshToken: expect.stringMatching(/^ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.([A-Za-z0-9-_=]+)$/),
              expiresIn: expect.numberMatching(/^[0-9]+$/),
            },
          },
        });

      // Test token refresh
      const response = await fetch(`${provider.mockService.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        }),
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.token).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      await provider
        .given('an invalid or expired refresh token')
        .uponReceiving('a POST request to /api/v1/auth/refresh with invalid token')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/refresh',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            refreshToken: expect.anything(),
          },
        })
        .willRespondWith({
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: false,
            message: expect.stringMatching(/Invalid refresh token|Token expired/),
            error: {
              code: expect.stringMatching(/INVALID_REFRESH_TOKEN/),
              message: expect.string(),
            },
          },
        });

      // Test invalid refresh token
      const response = await fetch(`${provider.mockService.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: 'invalid.refresh.token',
        }),
      });

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(false);
    });
  });

  describe('Password Reset API', () => {
    it('should initiate password reset for valid email', async () => {
      await provider
        .given('a valid user email')
        .uponReceiving('a POST request to /api/v1/auth/forgot-password')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/forgot-password',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            message: expect.stringMatching(/Password reset instructions sent/),
            data: {
              resetToken: expect.stringMatching(/^[a-zA-Z0-9-]{32}$/),
              expiresIn: expect.numberMatching(/^[0-9]+$/),
            },
          },
        });

      // Test password reset initiation
      const response = await fetch(`${provider.mockService.baseUrl}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'john.doe@example.com',
        }),
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.resetToken).toBeDefined();
    });

    it('should handle password reset with valid token', async () => {
      await provider
        .given('a valid password reset token')
        .uponReceiving('a POST request to /api/v1/auth/reset-password')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/reset-password',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            token: expect.stringMatching(/^[a-zA-Z0-9-]{32}$/),
            newPassword: expect.stringMatching(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            message: expect.stringMatching(/Password reset successfully/),
            data: {
              user: {
                id: expect.stringMatching(/^[a-zA-Z0-9-]+$/),
                email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
              },
            },
          },
        });

      // Test password reset
      const response = await fetch(`${provider.mockService.baseUrl}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'valid-reset-token-123456789',
          newPassword: 'NewSecurePass123!',
        }),
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.user).toBeDefined();
    });
  });

  describe('Account Lockout Protection', () => {
    it('should handle account lockout after failed attempts', async () => {
      await provider
        .given('multiple failed login attempts')
        .uponReceiving('a POST request to /api/v1/auth/login after account lockout')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/login',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
            password: expect.stringMatching(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/),
          },
        })
        .willRespondWith({
          status: 423,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: false,
            message: expect.stringMatching(/Account locked|Too many failed attempts/),
            error: {
              code: expect.stringMatching(/ACCOUNT_LOCKED/),
              message: expect.string(),
              unlockTime: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
            },
          },
        });

      // Test account lockout
      const response = await fetch(`${provider.mockService.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'locked@example.com',
          password: 'WrongPassword123!',
        }),
      });

      expect(response.status).toBe(423);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('ACCOUNT_LOCKED');
    });
  });
});

/**
 * Contract Testing Utilities
 */
export class AuthContractUtils {
  static generateValidUserData() {
    return {
      firstName: 'Test',
      lastName: 'User',
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!',
      acceptTerms: true,
    };
  }

  static generateInvalidUserData() {
    return {
      firstName: '',
      lastName: '',
      email: 'invalid-email',
      password: 'weak',
      acceptTerms: false,
    };
  }

  static generateLoginCredentials() {
    return {
      email: 'test@example.com',
      password: 'TestPassword123!',
    };
  }

  static generateInvalidLoginCredentials() {
    return {
      email: 'wrong@example.com',
      password: 'WrongPassword123!',
    };
  }

  static validateTokenStructure(token: string): boolean {
    // Basic JWT structure validation
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    try {
      // Check if parts are valid base64
      atob(parts[1]);
      atob(parts[2]);
      return true;
    } catch {
      return false;
    }
  }

  static validatePasswordStrength(password: string): {
    isValid: boolean;
    strength: 'weak' | 'medium' | 'strong';
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 0;

    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;
    else issues.push('Password must be at least 8 characters');

    if (/[a-z]/.test(password)) score += 1;
    else issues.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else issues.push('Include uppercase letters');

    if (/\d/.test(password)) score += 1;
    else issues.push('Include numbers');

    if (/[^a-zA-Z\d]/.test(password)) score += 1;
    else issues.push('Include special characters');

    if (score >= 4) {
      return { isValid: true, strength: 'strong', issues };
    } else if (score >= 2) {
      return { isValid: true, strength: 'medium', issues };
    } else {
      return { isValid: false, strength: 'weak', issues };
    }
  }

  static validateEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}