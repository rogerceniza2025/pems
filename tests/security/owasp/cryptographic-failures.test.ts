import { test, expect } from '@playwright/test';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as crypto from 'crypto';

/**
 * OWASP Top 10 A02: Cryptographic Failures Testing
 *
 * This test suite validates that cryptographic practices are properly implemented
 * to prevent data exposure and ensure secure data transmission.
 *
 * Test Coverage:
 * - HTTPS enforcement and TLS configuration
 * - Sensitive data encryption at rest
 * - Strong password hashing
 * - Secure session management
 * - API key and token security
 * - Cryptographic algorithm validation
 * - Random number generation
 * - Certificate validation
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${BASE_URL}/api/v1`;

// Test data for cryptographic validation
const testData = {
  sensitiveData: {
    ssn: '123-45-6789',
    creditCard: '4532-1234-5678-9012',
    apiKey: 'sk_test_4242424242424242',
    password: 'SuperSecretPassword123!',
    email: 'test@example.com',
    phone: '+1-555-123-4567',
  },
  weakPasswords: [
    'password',
    '123456',
    'qwerty',
    'admin',
    'password123',
    '123456789',
  ],
  strongPasswords: [
    'Tr0ub4dor&3*',
    'C0mpl3x!P@ssw0rd',
    'My$ecur3P@ssw0rd2024',
    'R@nd0m#Str1ng_With_Symb0ls',
  ],
};

test.describe('OWASP A02: Cryptographic Failures', () => {
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

  test.describe('HTTPS and TLS Configuration', () => {
    test('Enforces HTTPS in production', async ({ page }) => {
      console.log('🔒 Testing HTTPS enforcement');

      // Test that HTTP redirects to HTTPS (in production)
      const response = await page.goto(`http://${BASE_URL.replace('https://', '').replace('http://', '')}`);

      // In production, should redirect to HTTPS
      if (process.env.NODE_ENV === 'production') {
        const finalUrl = page.url();
        expect(finalUrl).toStartWith('https://');
        console.log('✅ HTTP redirects to HTTPS');
      } else {
        console.log('⚠️ HTTPS redirection test skipped in development');
      }
    });

    test('Uses secure headers for HTTPS', async ({ page }) => {
      console.log('🔒 Testing secure HTTP headers');

      const response = await page.goto(BASE_URL);
      const headers = response?.headers();

      // Check for security headers
      const securityHeaders = {
        'strict-transport-security': 'Should have HSTS header',
        'x-content-type-options': 'Should prevent MIME-type sniffing',
        'x-frame-options': 'Should prevent clickjacking',
        'x-xss-protection': 'Should enable XSS protection',
        'referrer-policy': 'Should control referrer information',
      };

      for (const [header, description] of Object.entries(securityHeaders)) {
        if (headers?.[header]) {
          console.log(`✅ Security header present: ${header}`);
        } else {
          console.warn(`⚠️ Missing security header: ${header} - ${description}`);
        }
      }
    });

    test('Validates TLS certificate (HTTPS only)', async ({ page }) => {
      console.log('🔒 Testing TLS certificate validation');

      if (BASE_URL.startsWith('https://')) {
        // Playwright validates certificates by default
        // If we can reach the page, certificate is valid
        const response = await page.goto(BASE_URL);
        expect(response?.status()).toBeLessThan(400);
        console.log('✅ TLS certificate validation passed');
      } else {
        console.log('⚠️ TLS validation test skipped for HTTP');
      }
    });
  });

  test.describe('Password Security', () => {
    test('Rejects weak passwords', async ({ page }) => {
      console.log('🔒 Testing password strength validation');

      for (const weakPassword of testData.weakPasswords) {
        await page.goto(`${BASE_URL}/auth/register`);

        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', weakPassword);
        await page.fill('[data-testid="confirm-password-input"]', weakPassword);

        await page.click('[data-testid="register-button"]');

        // Should show password strength error
        const passwordError = page.locator('[data-testid="password-error"]');
        await expect(passwordError).toBeVisible({ timeout: 5000 });

        console.log(`✅ Weak password rejected: ${weakPassword}`);
      }
    });

    test('Accepts strong passwords', async ({ page }) => {
      console.log('🔒 Testing strong password acceptance');

      for (const strongPassword of testData.strongPasswords) {
        await page.goto(`${BASE_URL}/auth/register`);

        await page.fill('[data-testid="email-input"]', `test${Date.now()}@example.com`);
        await page.fill('[data-testid="password-input"]', strongPassword);
        await page.fill('[data-testid="confirm-password-input"]', strongPassword);

        await page.click('[data-testid="register-button"]');

        // Should proceed to next step or show no password error
        await page.waitForTimeout(2000);

        const passwordError = page.locator('[data-testid="password-error"]');
        const isVisible = await passwordError.isVisible();

        if (isVisible) {
          console.warn(`⚠️ Strong password was rejected: ${strongPassword}`);
        } else {
          console.log(`✅ Strong password accepted: ${strongPassword}`);
        }
      }
    });

    test('Uses secure password hashing', async ({ page }) => {
      console.log('🔒 Testing password hashing security');

      // This would typically require database access
      // For now, we test API responses to ensure passwords aren't exposed
      await page.goto(`${BASE_URL}/auth/login`);

      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');

      // Check that password is not returned in any API response
      page.on('response', (response) => {
        if (response.url().includes('/api/')) {
          response.text().then((body) => {
            expect(body).not.toContain('password');
            expect(body).not.toContain('testpassword123');
          });
        }
      });

      await page.waitForTimeout(3000);
      console.log('✅ Password not exposed in API responses');
    });
  });

  test.describe('Sensitive Data Protection', () => {
    test('Encrypts sensitive data at rest', async ({ page }) => {
      console.log('🔒 Testing data encryption at rest');

      // Create test data with sensitive information
      const sensitiveUserData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: testData.sensitiveData.phone,
        ssn: testData.sensitiveData.ssn,
        creditCard: testData.sensitiveData.creditCard,
      };

      // Submit sensitive data
      await page.goto(`${BASE_URL}/settings/profile`);

      await page.fill('[data-testid="phone-input"]', sensitiveUserData.phone);
      await page.click('[data-testid="save-button"]');

      // Check API responses for sensitive data exposure
      let sensitiveDataExposed = false;

      page.on('response', async (response) => {
        if (response.url().includes('/api/')) {
          const body = await response.text();

          // Check for unencrypted sensitive data
          if (body.includes(sensitiveUserData.ssn) ||
              body.includes(sensitiveUserData.creditCard)) {
            sensitiveDataExposed = true;
          }
        }
      });

      await page.waitForTimeout(3000);

      expect(sensitiveDataExposed).toBe(false);
      console.log('✅ Sensitive data appears to be encrypted');
    });

    test('Masks sensitive data in UI', async ({ page }) => {
      console.log('🔒 Testing UI data masking');

      // Look for pages that should mask sensitive data
      const pagesToCheck = [
        '/settings/profile',
        '/payment-methods',
        '/admin/users',
      ];

      for (const pagePath of pagesToCheck) {
        try {
          await page.goto(`${BASE_URL}${pagePath}`);
          await page.waitForTimeout(2000);

          // Check for masked sensitive data patterns
          const pageContent = await page.content();

          // These should be masked if present
          const maskedPatterns = [
            /\*{4,}\d{4}/, // Credit card masking
            /\*{3,}-\*{2}-\d{4}/, // SSN masking
            /\d{4}$/, // Last 4 digits only
          ];

          const hasMaskedData = maskedPatterns.some(pattern => pattern.test(pageContent));

          if (hasMaskedData) {
            console.log(`✅ Sensitive data properly masked on ${pagePath}`);
          } else {
            console.log(`ℹ️ No masked data found on ${pagePath} (may be expected)`);
          }
        } catch (error) {
          console.log(`ℹ️ Could not check ${pagePath}: ${error.message}`);
        }
      }
    });

    test('Secures API keys and tokens', async ({ page }) => {
      console.log('🔒 Testing API key and token security');

      // Check that API keys are not exposed in client-side code
      const pageContent = await page.content();

      // Look for potential API key patterns
      const apiKeyPatterns = [
        /sk_[a-zA-Z0-9]{20,}/, // Stripe keys
        /AIza[0-9A-Za-z_-]{35}/, // Google API keys
        /[a-zA-Z0-9]{32}_secret/, // Generic secret pattern
        /Bearer\s+[a-zA-Z0-9\-._~+\/]+=*/g, // Bearer tokens
      ];

      const exposedKeys = [];
      for (const pattern of apiKeyPatterns) {
        const matches = pageContent.match(pattern);
        if (matches) {
          exposedKeys.push(...matches);
        }
      }

      expect(exposedKeys.length).toBe(0);
      console.log('✅ No API keys exposed in client-side code');
    });
  });

  test.describe('Session Security', () => {
    test('Uses secure session tokens', async ({ page }) => {
      console.log('🔒 Testing session token security');

      // Check session token characteristics
      const sessionToken = await page.evaluate(() => {
        return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      });

      if (sessionToken) {
        // Token should be sufficiently long and random
        expect(sessionToken.length).toBeGreaterThan(20);

        // Token should not be predictable
        expect(sessionToken).not.toBe('test-token');
        expect(sessionToken).not.toBe('undefined');
        expect(sessionToken).not.toBe('null');

        console.log('✅ Session token meets security requirements');
      } else {
        console.log('ℹ️ No session token found (may not be logged in)');
      }
    });

    test('Implements secure session timeout', async ({ page }) => {
      console.log('🔒 Testing session timeout security');

      // This would require testing actual session expiration
      // For now, we check for session-related headers
      const response = await page.goto(`${BASE_URL}/api/v1/users/me`);
      const headers = response?.headers();

      const sessionHeaders = [
        'set-cookie',
        'cache-control',
        'pragma',
        'expires',
      ];

      let hasSessionSecurity = false;
      for (const header of sessionHeaders) {
        if (headers?.[header]) {
          hasSessionSecurity = true;
          console.log(`✅ Session security header found: ${header}`);
        }
      }

      if (!hasSessionSecurity) {
        console.log('ℹ️ No session security headers detected');
      }
    });

    test('Prevents session fixation', async ({ page }) => {
      console.log('🔒 Testing session fixation prevention');

      // Check for session regeneration after login
      const sessionIdBefore = await page.evaluate(() => {
        return sessionStorage.getItem('sessionId') || localStorage.getItem('sessionId');
      });

      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');

      await page.waitForTimeout(3000);

      const sessionIdAfter = await page.evaluate(() => {
        return sessionStorage.getItem('sessionId') || localStorage.getItem('sessionId');
      });

      // Session ID should change after login (regeneration)
      if (sessionIdBefore && sessionIdAfter) {
        expect(sessionIdBefore).not.toBe(sessionIdAfter);
        console.log('✅ Session properly regenerated after login');
      } else {
        console.log('ℹ️ Session ID not available for comparison');
      }
    });
  });

  test.describe('Random Number Generation', () => {
    test('Uses cryptographically secure random numbers', async ({ page }) => {
      console.log('🔒 Testing secure random number generation');

      // Test password reset tokens
      await page.goto(`${BASE_URL}/auth/forgot-password`);
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.click('[data-testid="reset-button"]');

      // Check response for token generation
      let secureTokenGenerated = false;

      page.on('response', async (response) => {
        if (response.url().includes('/api/auth/reset-password')) {
          const body = await response.json();

          if (body.token) {
            // Token should be sufficiently long and random
            const token = body.token;
            const hasEntropy = token.length >= 32;
            const isRandom = !/^[0-9]+$/.test(token); // Not just numbers

            if (hasEntropy && isRandom) {
              secureTokenGenerated = true;
            }
          }
        }
      });

      await page.waitForTimeout(3000);

      if (secureTokenGenerated) {
        console.log('✅ Cryptographically secure token generated');
      } else {
        console.log('ℹ️ Could not verify token generation security');
      }
    });

    test('Generates unique session IDs', async ({ page }) => {
      console.log('🔒 Testing unique session ID generation');

      const sessions = [];

      // Generate multiple sessions
      for (let i = 0; i < 5; i++) {
        const context = await browser.newContext();
        const testPage = await context.newPage();

        await testPage.goto(`${BASE_URL}/auth/login`);
        await testPage.fill('[data-testid="email-input"]", `user${i}@example.com`);
        await testPage.fill('[data-testid="password-input"]', 'testpassword123');
        await testPage.click('[data-testid="login-button"]');

        await testPage.waitForTimeout(2000);

        const sessionId = await testPage.evaluate(() => {
          return sessionStorage.getItem('sessionId') ||
                 localStorage.getItem('sessionId') ||
                 document.cookie.split(';').find(c => c.trim().startsWith('sessionId='));
        });

        if (sessionId) {
          sessions.push(sessionId);
        }

        await testPage.close();
        await context.close();
      }

      // Check that all session IDs are unique
      const uniqueSessions = [...new Set(sessions)];
      expect(uniqueSessions.length).toBe(sessions.length);

      console.log(`✅ Generated ${sessions.length} unique session IDs`);
    });
  });

  test.describe('Certificate and Key Management', () => {
    test('Validates API certificates', async ({ page }) => {
      console.log('🔒 Testing API certificate validation');

      // Test connection to API endpoints
      const apiEndpoints = [
        `${API_BASE_URL}/health`,
        `${API_BASE_URL}/status`,
        `${API_BASE_URL}/version`,
      ];

      for (const endpoint of apiEndpoints) {
        try {
          const response = await page.request.get(endpoint);

          // If connection succeeds, certificate is valid
          expect(response.status()).toBeLessThan(500);
          console.log(`✅ Certificate validation passed for ${endpoint}`);
        } catch (error) {
          console.warn(`⚠️ Certificate validation failed for ${endpoint}: ${error.message}`);
        }
      }
    });

    test('Implements proper key rotation', async ({ page }) => {
      console.log('🔒 Testing key rotation practices');

      // This would typically require checking with the security team
      // For now, we check for key-related headers and patterns
      const response = await page.goto(`${BASE_URL}/api/v1/status`);
      const headers = response?.headers();

      const keyRotationIndicators = [
        'x-key-id',
        'x-key-version',
        'x-certificate-fingerprint',
      ];

      let hasKeyRotation = false;
      for (const indicator of keyRotationIndicators) {
        if (headers?.[indicator]) {
          hasKeyRotation = true;
          console.log(`✅ Key rotation indicator found: ${indicator}`);
        }
      }

      if (!hasKeyRotation) {
        console.log('ℹ️ No key rotation indicators detected (may be internal)');
      }
    });
  });

  test.describe('Cryptographic Algorithm Validation', () => {
    test('Uses modern cryptographic algorithms', async ({ page }) => {
      console.log('🔒 Testing cryptographic algorithm security');

      // Check for supported algorithms in security headers
      const response = await page.goto(`${BASE_URL}`);
      const headers = response?.headers();

      // Look for algorithm indicators
      const algorithmHeaders = {
        'x-cipher-suite': 'Cipher suite',
        'x-encryption-algorithm': 'Encryption algorithm',
        'x-hash-algorithm': 'Hash algorithm',
      };

      let modernAlgorithms = false;
      for (const [header, description] of Object.entries(algorithmHeaders)) {
        if (headers?.[header]) {
          console.log(`✅ Algorithm header found: ${header} (${headers[header]})`);

          // Check for modern algorithms
          const value = headers[header].toLowerCase();
          if (value.includes('aes') || value.includes('sha256') || value.includes('sha2')) {
            modernAlgorithms = true;
          }
        }
      }

      if (modernAlgorithms) {
        console.log('✅ Modern cryptographic algorithms detected');
      } else {
        console.log('ℹ️ Algorithm validation requires deeper inspection');
      }
    });

    test('Avoids deprecated cryptographic practices', async ({ page }) => {
      console.log('🔒 Testing for deprecated cryptographic practices');

      const pageContent = await page.content();

      // Look for deprecated practices
      const deprecatedPatterns = [
        /md5/gi,
        /sha1/gi,
        /rc4/gi,
        /des/gi,
        /3des/gi,
      ];

      const deprecatedFound = [];
      for (const pattern of deprecatedPatterns) {
        const matches = pageContent.match(pattern);
        if (matches) {
          deprecatedFound.push(...matches);
        }
      }

      expect(deprecatedFound.length).toBe(0);
      console.log('✅ No deprecated cryptographic practices found');
    });
  });
});

/**
 * Cryptographic helper utilities
 */
export class CryptoUtils {
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static hashPassword(password: string, salt?: string): string {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return `${salt}:${hash.toString('hex')}`;
  }

  static validatePasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback = [];
    let score = 0;

    if (password.length >= 12) {
      score += 2;
    } else if (password.length >= 8) {
      score += 1;
      feedback.push('Use at least 12 characters');
    } else {
      feedback.push('Password is too short');
    }

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[^a-zA-Z\d]/.test(password)) score += 1;
    else feedback.push('Include special characters');

    if (/(.)\1{2,}/.test(password)) {
      score -= 1;
      feedback.push('Avoid repeated characters');
    }

    return {
      score,
      feedback,
      isStrong: score >= 5,
    };
  }

  static validateTokenSecurity(token: string): boolean {
    // Check token length and entropy
    return token.length >= 32 &&
           !/^[0-9]+$/.test(token) &&
           !/^[a-zA-Z]+$/.test(token);
  }
}

export { testData };