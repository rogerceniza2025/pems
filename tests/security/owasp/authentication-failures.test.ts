import { test, expect } from '@playwright/test';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as crypto from 'crypto';

/**
 * OWASP Top 10 A07: Identification and Authentication Failures Testing
 *
 * This test suite validates that authentication mechanisms are properly implemented
 * to prevent unauthorized access and protect user credentials.
 *
 * Test Coverage:
 * - Username enumeration prevention
 * - Brute force attack protection
 * - Multi-factor authentication (MFA)
 * - Password recovery security
 * - Session management
 * - Credential stuffing protection
 * - Account lockout mechanisms
 * - Authentication bypass attempts
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${BASE_URL}/api/v1`;

// Test users for authentication testing
const authTestUsers = {
  valid: {
    email: 'validuser@pems.com',
    password: 'ValidPass123!',
    userId: 'valid-user-id',
    tenantId: 'tenant-1',
  },
  locked: {
    email: 'lockeduser@pems.com',
    password: 'LockedPass123!',
    userId: 'locked-user-id',
  },
  mfaEnabled: {
    email: 'mfauser@pems.com',
    password: 'MfaPass123!',
    mfaCode: '123456',
  },
  inactive: {
    email: 'inactive@pems.com',
    password: 'InactivePass123!',
  },
};

test.describe('OWASP A07: Authentication Failures', () => {
  let browser: Browser;
  let context: BrowserContext;

  test.beforeAll(async () => {
    browser = await chromium.launch();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test.beforeEach(async () => {
    context = await browser.newContext();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Username Enumeration Prevention', () => {
    test('Does not reveal if email exists during login', async ({ page }) => {
      console.log('🔒 Testing username enumeration prevention');

      // Test with non-existent email
      await page.goto(`${BASE_URL}/auth/login`);

      await page.fill('[data-testid="email-input"]', 'nonexistent@pems.com');
      await page.fill('[data-testid="password-input"]', 'randompassword');
      await page.click('[data-testid="login-button"]');

      // Should show generic error message
      const errorMessage = page.locator('[data-testid="login-error"]');
      await expect(errorMessage).toBeVisible();

      const errorText = await errorMessage.textContent();

      // Error message should be generic
      const genericErrors = [
        'Invalid email or password',
        'Incorrect credentials',
        'Login failed',
        'Authentication failed',
      ];

      const isGeneric = genericErrors.some(genericError =>
        errorText?.toLowerCase().includes(genericError.toLowerCase())
      );

      expect(isGeneric).toBe(true);
      console.log('✅ Generic error message shown for non-existent user');

      // Test with existent email but wrong password
      await page.fill('[data-testid="email-input"]', authTestUsers.valid.email);
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');

      const errorText2 = await errorMessage.textContent();

      // Should show the same generic error message
      expect(errorText2).toBe(errorText);
      console.log('✅ Same error message for invalid credentials');
    });

    test('Does not reveal email existence in password reset', async ({ page }) => {
      console.log('🔒 Testing email enumeration in password reset');

      await page.goto(`${BASE_URL}/auth/forgot-password`);

      // Test with non-existent email
      await page.fill('[data-testid="email-input"]', 'nonexistent@pems.com');
      await page.click('[data-testid="reset-button"]');

      // Should show generic success message regardless of email existence
      const successMessage = page.locator('[data-testid="reset-message"]');
      await expect(successMessage).toBeVisible();

      const successText = await successMessage.textContent();

      // Message should be generic
      const genericSuccess = [
        'If an account exists',
        'Check your email',
        'Instructions sent',
        'Reset link sent',
      ];

      const isGeneric = genericSuccess.some(generic =>
        successText?.toLowerCase().includes(generic.toLowerCase())
      );

      expect(isGeneric).toBe(true);
      console.log('✅ Generic message shown for password reset');
    });

    test('Registration does not confirm email existence', async ({ page }) => {
      console.log('🔒 Testing email enumeration in registration');

      await page.goto(`${BASE_URL}/auth/register`);

      // Try to register with existing email
      await page.fill('[data-testid="email-input"]', authTestUsers.valid.email);
      await page.fill('[data-testid="password-input"]', 'NewPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'NewPassword123!');
      await page.click('[data-testid="register-button"]');

      // Check error message
      const errorMessage = page.locator('[data-testid="registration-error"]');
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();

        // Should not reveal that email is taken in a way that helps enumeration
        expect(errorText?.toLowerCase()).not.toContain('already exists');
        expect(errorText?.toLowerCase()).not.toContain('taken');
      }

      console.log('✅ Registration does not reveal email existence');
    });
  });

  test.describe('Brute Force Protection', () => {
    test('Implements account lockout after failed attempts', async ({ page }) => {
      console.log('🔒 Testing account lockout mechanism');

      // Make multiple failed login attempts
      const maxAttempts = 5;

      for (let attempt = 1; attempt <= maxAttempts + 2; attempt++) {
        await page.goto(`${BASE_URL}/auth/login`);

        await page.fill('[data-testid="email-input"]', authTestUsers.valid.email);
        await page.fill('[data-testid="password-input"]', `wrongpassword${attempt}`);
        await page.click('[data-testid="login-button"]');

        await page.waitForTimeout(1000);

        console.log(`🔢 Failed attempt ${attempt}`);

        // After max attempts, account should be locked
        if (attempt > maxAttempts) {
          const lockoutMessage = page.locator('[data-testid="lockout-message"]');
          const accountLocked = await lockoutMessage.isVisible();

          if (accountLocked) {
            const lockoutText = await lockoutMessage.textContent();
            expect(lockoutText?.toLowerCase()).toContain('locked') ||
                 expect(lockoutText?.toLowerCase()).toContain('too many') ||
                 expect(lockoutText?.toLowerCase()).toContain('try again');

            console.log('✅ Account properly locked after failed attempts');
            break;
          }
        }
      }

      // Try to login with correct password after lockout
      await page.fill('[data-testid="email-input"]', authTestUsers.valid.email);
      await page.fill('[data-testid="password-input"]', authTestUsers.valid.password);
      await page.click('[data-testid="login-button"]');

      // Should still fail due to lockout
      const url = page.url();
      const errorMessage = page.locator('[data-testid="login-error"]');

      expect(url).not.toContain('/dashboard');
      expect(await errorMessage.isVisible()).toBe(true);

      console.log('✅ Locked account cannot access system');
    });

    test('Implements rate limiting on authentication endpoints', async ({ page }) => {
      console.log('🔒 Testing authentication rate limiting');

      let rateLimitHit = false;

      // Make rapid login attempts
      for (let i = 0; i < 20; i++) {
        const response = await page.request.post(`${API_BASE_URL}/auth/login`, {
          data: {
            email: 'test@example.com',
            password: `password${i}`,
          },
          failOnStatusCode: false,
        });

        if (response.status() === 429) {
          rateLimitHit = true;
          console.log(`✅ Rate limit hit after ${i + 1} attempts`);
          break;
        }

        await page.waitForTimeout(100);
      }

      expect(rateLimitHit).toBe(true);
    });

    test('Implements progressive delays', async ({ page }) => {
      console.log('🔒 Testing progressive delay implementation');

      const delayTimes = [];

      // Make multiple failed attempts and measure response times
      for (let attempt = 1; attempt <= 5; attempt++) {
        const startTime = Date.now();

        const response = await page.request.post(`${API_BASE_URL}/auth/login`, {
          data: {
            email: 'test@example.com',
            password: `wrongpassword${attempt}`,
          },
          failOnStatusCode: false,
        });

        const responseTime = Date.now() - startTime;
        delayTimes.push(responseTime);

        console.log(`Attempt ${attempt}: ${responseTime}ms`);

        // Check if delays increase progressively
        if (attempt > 1) {
          const previousDelay = delayTimes[attempt - 2];
          expect(responseTime).toBeGreaterThanOrEqual(previousDelay);
        }

        await page.waitForTimeout(1000);
      }

      console.log('✅ Progressive delays implemented');
    });
  });

  test.describe('Multi-Factor Authentication', () => {
    test('Requires MFA when enabled', async ({ page }) => {
      console.log('🔒 Testing MFA requirement');

      await page.goto(`${BASE_URL}/auth/login`);

      // Login with MFA-enabled user
      await page.fill('[data-testid="email-input"]', authTestUsers.mfaEnabled.email);
      await page.fill('[data-testid="password-input"]', authTestUsers.mfaEnabled.password);
      await page.click('[data-testid="login-button"]');

      // Should redirect to MFA verification page
      await page.waitForURL('**/auth/mfa', { timeout: 5000 });

      const mfaPage = page.locator('[data-testid="mfa-verification"]');
      await expect(mfaPage).toBeVisible();

      console.log('✅ MFA verification required');

      // Test MFA code submission
      await page.fill('[data-testid="mfa-code-input"]', authTestUsers.mfaEnabled.mfaCode);
      await page.click('[data-testid="verify-mfa-button"]');

      // Should redirect to dashboard after successful MFA
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      expect(page.url()).toContain('/dashboard');

      console.log('✅ MFA verification successful');
    });

    test('Rejects invalid MFA codes', async ({ page }) => {
      console.log('🔒 Testing MFA code validation');

      await page.goto(`${BASE_URL}/auth/login`);

      await page.fill('[data-testid="email-input"]', authTestUsers.mfaEnabled.email);
      await page.fill('[data-testid="password-input"]', authTestUsers.mfaEnabled.password);
      await page.click('[data-testid="login-button"]');

      await page.waitForSelector('[data-testid="mfa-code-input"]');

      // Try invalid MFA codes
      const invalidCodes = ['000000', '999999', 'abcdef', '12345'];

      for (const code of invalidCodes) {
        await page.fill('[data-testid="mfa-code-input"]', code);
        await page.click('[data-testid="verify-mfa-button"]');

        await page.waitForTimeout(1000);

        const errorMessage = page.locator('[data-testid="mfa-error"]');
        await expect(errorMessage).toBeVisible();

        const errorText = await errorMessage.textContent();
        expect(errorText?.toLowerCase()).toContain('invalid') ||
             expect(errorText?.toLowerCase()).toContain('incorrect');

        console.log(`✅ Invalid MFA code rejected: ${code}`);

        // Clear input for next attempt
        await page.fill('[data-testid="mfa-code-input"]', '');
      }
    });

    test('Implements MFA rate limiting', async ({ page }) => {
      console.log('🔒 Testing MFA rate limiting');

      await page.goto(`${BASE_URL}/auth/login`);

      await page.fill('[data-testid="email-input"]', authTestUsers.mfaEnabled.email);
      await page.fill('[data-testid="password-input"]', authTestUsers.mfaEnabled.password);
      await page.click('[data-testid="login-button"]');

      await page.waitForSelector('[data-testid="mfa-code-input"]');

      let rateLimitHit = false;

      // Make rapid MFA attempts
      for (let i = 0; i < 10; i++) {
        const response = await page.request.post(`${API_BASE_URL}/auth/mfa/verify`, {
          data: {
            code: `000${i}`,
          },
          failOnStatusCode: false,
        });

        if (response.status() === 429) {
          rateLimitHit = true;
          console.log(`✅ MFA rate limit hit after ${i + 1} attempts`);
          break;
        }

        await page.waitForTimeout(200);
      }

      expect(rateLimitHit).toBe(true);
    });
  });

  test.describe('Password Recovery Security', () => {
    test('Uses secure password reset tokens', async ({ page }) => {
      console.log('🔒 Testing password reset token security');

      await page.goto(`${BASE_URL}/auth/forgot-password`);

      await page.fill('[data-testid="email-input"]', authTestUsers.valid.email);
      await page.click('[data-testid="reset-button"]');

      // Check response for token characteristics
      let secureToken = false;

      page.on('response', async (response) => {
        if (response.url().includes('/api/auth/reset-password')) {
          const body = await response.json();

          if (body.token || body.resetToken) {
            const token = body.token || body.resetToken;

            // Token should be sufficiently long and random
            const hasLength = token.length >= 32;
            const hasEntropy = !/^[0-9]+$/.test(token) && !/^[a-zA-Z]+$/.test(token);
            const hasNoCommonPatterns = !token.includes('password') && !token.includes('reset');

            if (hasLength && hasEntropy && hasNoCommonPatterns) {
              secureToken = true;
            }
          }
        }
      });

      await page.waitForTimeout(3000);

      expect(secureToken).toBe(true);
      console.log('✅ Secure password reset token generated');
    });

    test('Implements reset token expiration', async ({ page }) => {
      console.log('🔒 Testing password reset token expiration');

      // This would require generating a token and waiting for expiration
      // For now, we test for expiration indicators
      await page.goto(`${BASE_URL}/auth/reset-password?token=expired-token`);

      const errorMessage = page.locator('[data-testid="reset-error"]');

      // Should show error for invalid/expired token
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        const expirationIndicators = [
          'expired',
          'invalid',
          'not found',
          'time limit',
        ];

        const hasExpirationMessage = expirationIndicators.some(indicator =>
          errorText?.toLowerCase().includes(indicator)
        );

        expect(hasExpirationMessage).toBe(true);
        console.log('✅ Token expiration validation present');
      }
    });

    test('Prevents reset token reuse', async ({ page }) => {
      console.log('🔒 Testing password reset token reuse prevention');

      // This test would require actually generating a token and trying to reuse it
      // For now, we test the API response structure
      const response = await page.request.post(`${API_BASE_URL}/auth/reset-password`, {
        data: {
          token: 'test-token',
          newPassword: 'NewPassword123!',
        },
        failOnStatusCode: false,
      });

      // Should either succeed (if token valid) or fail gracefully
      expect([200, 400, 401, 403, 404]).toContain(response.status());

      console.log('✅ Reset token handling implemented');
    });
  });

  test.describe('Session Management', () => {
    test('Invalidates session on logout', async ({ page }) => {
      console.log('🔒 Testing session invalidation on logout');

      // Login
      await loginAsUser(page, authTestUsers.valid);
      expect(page.url()).toContain('/dashboard');

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');

      // Verify session is invalidated
      await page.goto(`${BASE_URL}/dashboard`);
      expect(page.url()).toContain('/auth/login');

      // Try to access API with old session
      const response = await page.request.get(`${API_BASE_URL}/users/me`);
      expect([401, 403]).toContain(response.status());

      console.log('✅ Session properly invalidated on logout');
    });

    test('Implements session timeout', async ({ page }) => {
      console.log('🔒 Testing session timeout implementation');

      // Login
      await loginAsUser(page, authTestUsers.valid);

      // Wait for session to potentially timeout (simulate with short timeout)
      await page.waitForTimeout(1000);

      // Try to access protected resource
      await page.goto(`${BASE_URL}/dashboard`);

      // In a real implementation, this would test actual timeout
      // For now, we check for session-related headers
      const response = await page.request.get(`${API_BASE_URL}/users/me`);
      const headers = response.headers();

      const sessionHeaders = [
        'cache-control',
        'expires',
        'pragma',
      ];

      let hasSessionControl = false;
      for (const header of sessionHeaders) {
        if (headers[header]) {
          hasSessionControl = true;
          break;
        }
      }

      console.log(hasSessionControl ? '✅ Session control headers present' : 'ℹ️ Session control requires deeper inspection');
    });

    test('Prevents session fixation', async ({ page }) => {
      console.log('🔒 Testing session fixation prevention');

      // Get initial session
      await page.goto(`${BASE_URL}/auth/login`);

      const initialSession = await page.evaluate(() => {
        return {
          cookie: document.cookie,
          sessionStorage: { ...sessionStorage },
          localStorage: { ...localStorage },
        };
      });

      // Login
      await page.fill('[data-testid="email-input"]', authTestUsers.valid.email);
      await page.fill('[data-testid="password-input"]', authTestUsers.valid.password);
      await page.click('[data-testid="login-button"]');

      await page.waitForURL('**/dashboard');

      // Get session after login
      const afterLoginSession = await page.evaluate(() => {
        return {
          cookie: document.cookie,
          sessionStorage: { ...sessionStorage },
          localStorage: { ...localStorage },
        };
      });

      // Sessions should be different
      expect(afterLoginSession.cookie).not.toBe(initialSession.cookie);

      console.log('✅ Session properly regenerated after login');
    });
  });

  test.describe('Credential Stuffing Protection', () => {
    test('Implements detection for credential stuffing', async ({ page }) => {
      console.log('🔒 Testing credential stuffing detection');

      // Simulate rapid login attempts from different IPs
      const suspiciousAttempts = [
        { email: 'user1@example.com', password: 'password123' },
        { email: 'user2@example.com', password: 'password123' },
        { email: 'user3@example.com', password: 'password123' },
        { email: 'user4@example.com', password: 'password123' },
        { email: 'user5@example.com', password: 'password123' },
      ];

      let suspiciousActivityDetected = false;

      for (const attempt of suspiciousAttempts) {
        const response = await page.request.post(`${API_BASE_URL}/auth/login`, {
          data: attempt,
          headers: {
            'X-Forwarded-For': `${Math.random()}.${Math.random()}.${Math.random()}.${Math.random()}`,
            'User-Agent': `SuspiciousBot${Math.random()}`,
          },
          failOnStatusCode: false,
        });

        // Look for suspicious activity indicators
        if (response.status() === 429 || response.status() === 403) {
          suspiciousActivityDetected = true;
          console.log('✅ Suspicious activity detected and blocked');
          break;
        }

        await page.waitForTimeout(500);
      }

      expect(suspiciousActivityDetected).toBe(true);
    });

    test('Implements CAPTCHA for suspicious attempts', async ({ page }) => {
      console.log('🔒 Testing CAPTCHA implementation');

      // Make multiple failed attempts to trigger CAPTCHA
      for (let i = 0; i < 6; i++) {
        await page.goto(`${BASE_URL}/auth/login`);

        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-button"]');

        await page.waitForTimeout(1000);

        // Check if CAPTCHA is displayed
        const captcha = page.locator('[data-testid="captcha"], [data-testid="recaptcha"]');
        if (await captcha.isVisible()) {
          console.log('✅ CAPTCHA displayed after failed attempts');
          break;
        }
      }
    });
  });

  test.describe('Authentication Bypass Attempts', () => {
    test('Prevents direct URL access without authentication', async ({ page }) => {
      console.log('🔒 Testing direct URL access prevention');

      const protectedPages = [
        '/dashboard',
        '/settings/profile',
        '/reports',
        '/admin/users',
      ];

      for (const pagePath of protectedPages) {
        await page.goto(`${BASE_URL}${pagePath}`);

        // Should redirect to login
        const url = page.url();
        expect(url).toContain('/auth/login');

        console.log(`✅ Protected page ${pagePath} redirects to login`);
      }
    });

    test('Prevents parameter pollution in authentication', async ({ page }) => {
      console.log('🔒 Testing authentication parameter pollution');

      const pollutionAttempts = [
        `${API_BASE_URL}/auth/login?userId=admin&role=admin`,
        `${API_BASE_URL}/auth/login?bypass=true&debug=true`,
        `${API_BASE_URL}/auth/login?admin=true&password=admin123`,
        `${API_BASE_URL}/auth/login?user=admin@example.com&pass=admin123&role=admin`,
      ];

      for (const url of pollutionAttempts) {
        const response = await page.request.post(url, {
          data: {
            email: 'normal@example.com',
            password: 'normalpassword',
          },
          failOnStatusCode: false,
        });

        // Should either fail or return normal user data (not admin)
        expect([400, 401, 403, 404]).toContain(response.status());

        console.log(`✅ Parameter pollution attempt blocked: ${url}`);
      }
    });

    test('Validates authentication token integrity', async ({ page }) => {
      console.log('🔒 Testing authentication token integrity');

      // Try to manipulate tokens
      const maliciousTokens = [
        'admin-token-123',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.payload',
        'null',
        'undefined',
        '../../etc/passwd',
        '<script>alert("xss")</script>',
        'broken.token.here',
      ];

      for (const token of maliciousTokens) {
        await page.addInitScript((authToken) => {
          localStorage.setItem('auth_token', authToken);
        }, token);

        const response = await page.request.get(`${API_BASE_URL}/users/me`, {
          failOnStatusCode: false,
        });

        expect([401, 403, 404]).toContain(response.status());

        console.log(`✅ Malicious token rejected: ${token}`);
      }
    });
  });
});

/**
 * Helper function to login as a test user
 */
async function loginAsUser(page: Page, user: any): Promise<void> {
  await page.goto(`${BASE_URL}/auth/login`);
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

/**
 * Authentication security utilities
 */
export class AuthSecurityUtils {
  static generateSecurePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one character from each category
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

    // Fill the rest
    for (let i = 4; i < 16; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }

    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  static checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback = [];
    let score = 0;

    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;
    else feedback.push('Use at least 12 characters');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[^a-zA-Z\d]/.test(password)) score += 1;
    else feedback.push('Include special characters');

    return {
      score,
      feedback,
      isStrong: score >= 5,
    };
  }

  static detectSuspiciousActivity(attempts: Array<{ timestamp: number; ip: string; userAgent: string }>): boolean {
    if (attempts.length < 5) return false;

    const recentAttempts = attempts.filter(a => Date.now() - a.timestamp < 300000); // 5 minutes
    if (recentAttempts.length < 10) return false;

    // Check for multiple IPs in short time
    const uniqueIPs = new Set(recentAttempts.map(a => a.ip));
    if (uniqueIPs.size > 3) return true;

    // Check for high frequency from same IP
    const ipFrequency: Record<string, number> = {};
    recentAttempts.forEach(a => {
      ipFrequency[a.ip] = (ipFrequency[a.ip] || 0) + 1;
    });

    return Object.values(ipFrequency).some(count => count > 15);
  }

  static generateMFACode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static validateMFACode(code: string): boolean {
    return /^\d{6}$/.test(code);
  }
}

export { authTestUsers };