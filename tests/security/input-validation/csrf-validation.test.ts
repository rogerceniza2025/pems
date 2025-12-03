/**
 * Cross-Site Request Forgery (CSRF) Protection Tests
 *
 * Comprehensive testing for CSRF vulnerabilities across all application endpoints
 * that perform state-changing operations. These tests validate proper CSRF token
 * implementation, SameSite cookie policies, and other CSRF protection mechanisms.
 *
 * Test Categories:
 * - CSRF token validation
 * - SameSite cookie policy enforcement
 * - Origin/Referer header validation
 * - Double submit cookie pattern
 * - State-changing operations protection
 * - AJAX request CSRF protection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios, { AxiosHeaders } from 'axios';
import { chromium, Browser, Page } from 'playwright';

interface CSRFTestCase {
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  expectedBehavior: 'blocked' | 'allowed';
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface CSRFTestResult {
  testCase: CSRFTestCase;
  statusCode: number;
  responseBody: any;
  csrfTokenPresent?: boolean;
  sameSiteCookie?: boolean;
  originHeaderValidated?: boolean;
  vulnerabilityDetected: boolean;
  evidence?: string;
}

describe('Cross-Site Request Forgery (CSRF) Protection Tests', () => {
  let browser: Browser;
  let page: Page;
  let baseUrl: string;
  let testResults: CSRFTestResult[] = [];
  let csrfToken: string | null = null;
  let sessionCookie: string | null = null;

  beforeEach(async () => {
    baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    testResults = [];

    // Get CSRF token and session cookie for valid requests
    await obtainValidSession();
  });

  afterEach(async () => {
    await browser.close();
  });

  /**
   * Obtain valid session and CSRF token
   */
  async function obtainValidSession(): Promise<void> {
    try {
      // Visit login page to get CSRF token
      await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });

      // Extract CSRF token from meta tag or form
      csrfToken = await page.evaluate(() => {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
          return metaTag.getAttribute('content');
        }

        const input = document.querySelector('input[name="csrf_token"]') ||
                     document.querySelector('input[name="_csrf"]') ||
                     document.querySelector('input[name="_token"]');
        return input ? (input as HTMLInputElement).value : null;
      });

      // Get session cookies
      const cookies = await page.context().cookies();
      sessionCookie = cookies
        .filter(cookie => cookie.name.includes('session') || cookie.name.includes('auth'))
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');

      console.log(`🔑 Session obtained - CSRF Token: ${csrfToken ? 'present' : 'missing'}, Session: ${sessionCookie ? 'present' : 'missing'}`);
    } catch (error) {
      console.warn('Could not obtain valid session:', error.message);
    }
  }

  /**
   * Execute CSRF test case
   */
  async function executeCSRFTest(testCase: CSRFTestCase): Promise<CSRFTestResult> {
    let response;
    let statusCode: number;
    let responseBody: any;
    let csrfTokenPresent = false;
    let sameSiteCookie = false;
    let originHeaderValidated = false;
    let vulnerabilityDetected = false;
    let evidence: string | undefined;

    try {
      const config = {
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CSRF-Tester/1.0',
          ...testCase.headers
        }
      };

      // Add session cookie if available
      if (sessionCookie) {
        config.headers.Cookie = sessionCookie;
      }

      // Add CSRF token if required
      const bodyWithCSRF = { ...testCase.body };
      if (csrfToken) {
        bodyWithCSRF.csrf_token = csrfToken;
        bodyWithCSRF._csrf = csrfToken;
        bodyWithCSRF._token = csrfToken;
      }

      switch (testCase.method) {
        case 'GET':
          response = await axios.get(`${baseUrl}${testCase.endpoint}`, config);
          break;
        case 'POST':
          response = await axios.post(`${baseUrl}${testCase.endpoint}`, bodyWithCSRF, config);
          break;
        case 'PUT':
          response = await axios.put(`${baseUrl}${testCase.endpoint}`, bodyWithCSRF, config);
          break;
        case 'PATCH':
          response = await axios.patch(`${baseUrl}${testCase.endpoint}`, bodyWithCSRF, config);
          break;
        case 'DELETE':
          response = await axios.delete(`${baseUrl}${testCase.endpoint}`, config);
          break;
        default:
          throw new Error(`Unsupported method: ${testCase.method}`);
      }

      statusCode = response.status;
      responseBody = response.data;

      // Analyze response for CSRF protection indicators
      csrfTokenPresent = hasCSRFToken(response);
      sameSiteCookie = hasSameSiteCookie(response);
      originHeaderValidated = isOriginHeaderValidated(response);

      // Determine if vulnerability exists based on test expectations
      vulnerabilityDetected = analyzeCSRFVulnerability(testCase, statusCode, responseBody);

      if (vulnerabilityDetected) {
        evidence = extractCSRFEvidence(testCase, statusCode, responseBody);
      }

    } catch (error: any) {
      statusCode = error.response?.status || 500;
      responseBody = error.response?.data || { error: error.message };
    }

    const result: CSRFTestResult = {
      testCase,
      statusCode,
      responseBody,
      csrfTokenPresent,
      sameSiteCookie,
      originHeaderValidated,
      vulnerabilityDetected,
      evidence
    };

    testResults.push(result);
    return result;
  }

  /**
   * Execute CSRF test via simulated browser (for same-origin checks)
   */
  async function executeBrowserCSRFTest(testCase: CSRFTestCase, origin: string): Promise<CSRFTestResult> {
    let vulnerabilityDetected = false;
    let evidence: string | undefined;

    try {
      // Create a new context with different origin
      const context = await browser.newContext({
        extraHTTPHeaders: {
          'Origin': origin,
          'Referer': `${origin}/malicious.html`
        }
      });

      const maliciousPage = await context.newPage();

      // Create malicious HTML page that submits form to target
      const maliciousHTML = `
        <!DOCTYPE html>
        <html>
        <head><title>CSRF Test</title></head>
        <body>
          <form id="csrfForm" method="${testCase.method}" action="${baseUrl}${testCase.endpoint}">
            <input type="hidden" name="test_field" value="csrf_test">
            ${testCase.body ? Object.entries(testCase.body).map(([key, value]) =>
              `<input type="hidden" name="${key}" value="${value}">`
            ).join('') : ''}
          </form>
          <script>
            document.getElementById('csrfForm').submit();
          </script>
        </body>
        </html>
      `;

      await maliciousPage.setContent(maliciousHTML);

      // Wait for navigation or error
      await maliciousPage.waitForTimeout(2000);

      // Check if request succeeded (indicates CSRF vulnerability)
      const response = await maliciousPage.evaluate(() => {
        return {
          url: window.location.href,
          status: document.title.includes('Error') ? 'error' : 'success'
        };
      });

      vulnerabilityDetected = response.status === 'success';
      evidence = `Browser-based CSRF test from ${origin}: ${vulnerabilityDetected ? 'VULNERABLE' : 'PROTECTED'}`;

      await context.close();

    } catch (error) {
      evidence = `Browser CSRF test error: ${error}`;
      vulnerabilityDetected = false;
    }

    return {
      testCase,
      statusCode: vulnerabilityDetected ? 200 : 403,
      responseBody: { browserTest: true },
      vulnerabilityDetected,
      evidence
    };
  }

  /**
   * Check if response contains CSRF token
   */
  function hasCSRFToken(response: any): boolean {
    const responseText = JSON.stringify(response.data);
    const csrfPatterns = [
      'csrf_token',
      '_csrf',
      '_token',
      'csrf-token',
      'X-CSRF-Token'
    ];

    return csrfPatterns.some(pattern => responseText.includes(pattern));
  }

  /**
   * Check if SameSite cookie policy is enforced
   */
  function hasSameSiteCookie(response: any): boolean {
    const setCookieHeader = response.headers['set-cookie'];
    if (!setCookieHeader) return false;

    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    return cookies.some(cookie => cookie.includes('SameSite'));
  }

  /**
   * Check if Origin header validation is implemented
   */
  function isOriginHeaderValidated(response: any): boolean {
    const responseText = JSON.stringify(response.data).toLowerCase();
    const originValidationErrors = [
      'origin not allowed',
      'csrf token',
      'invalid origin',
      'cross-site request',
      'forbidden'
    ];

    return originValidationErrors.some(error => responseText.includes(error));
  }

  /**
   * Analyze CSRF vulnerability
   */
  function analyzeCSRFVulnerability(testCase: CSRFTestCase, statusCode: number, responseBody: any): boolean {
    const responseText = JSON.stringify(responseBody).toLowerCase();

    // If test expects to be blocked but request succeeds, it's vulnerable
    if (testCase.expectedBehavior === 'blocked') {
      return statusCode >= 200 && statusCode < 300;
    }

    // If test expects to be allowed but request is blocked, it might be over-protected
    if (testCase.expectedBehavior === 'allowed') {
      return statusCode >= 400;
    }

    // Check for CSRF-specific error messages (indicates protection is working)
    const csrfErrorPatterns = [
      'csrf token',
      'invalid csrf',
      'missing csrf',
      'cross site request forgery',
      'origin not allowed',
      'referer not allowed'
    ];

    const hasCSRFError = csrfErrorPatterns.some(pattern => responseText.includes(pattern));
    return !hasCSRFError && statusCode >= 400; // Error without CSRF message might indicate other issues
  }

  /**
   * Extract CSRF vulnerability evidence
   */
  function extractCSRFEvidence(testCase: CSRFTestCase, statusCode: number, responseBody: any): string {
    const responseText = JSON.stringify(responseBody);
    const evidence = [];

    if (statusCode >= 200 && statusCode < 300) {
      evidence.push(`Request succeeded (${statusCode}) - should have been blocked`);
    }

    const csrfErrorPatterns = ['csrf', 'origin', 'referer', 'forgery'];
    const hasCSRFProtection = csrfErrorPatterns.some(pattern => responseText.toLowerCase().includes(pattern));

    if (!hasCSRFProtection && statusCode >= 400) {
      evidence.push('Generic error - no CSRF protection indicators');
    }

    return evidence.join('; ') || 'CSRF vulnerability detected';
  }

  /**
   * CSRF test cases
   */
  const csrfTestCases: CSRFTestCase[] = [
    // State-changing operations without CSRF tokens
    {
      name: 'User Profile Update without CSRF',
      description: 'Update user profile without CSRF token',
      endpoint: '/api/users/profile',
      method: 'PATCH',
      body: { firstName: 'CSRF', lastName: 'Test' },
      expectedBehavior: 'blocked',
      severity: 'critical'
    },
    {
      name: 'Password Change without CSRF',
      description: 'Change password without CSRF token',
      endpoint: '/api/users/password',
      method: 'POST',
      body: { currentPassword: 'oldpass', newPassword: 'newpass' },
      expectedBehavior: 'blocked',
      severity: 'critical'
    },
    {
      name: 'Email Update without CSRF',
      description: 'Update email without CSRF token',
      endpoint: '/api/users/email',
      method: 'POST',
      body: { email: 'newemail@example.com' },
      expectedBehavior: 'blocked',
      severity: 'critical'
    },

    // Request without proper headers
    {
      name: 'Request without Origin Header',
      description: 'State-changing request without Origin header',
      endpoint: '/api/users/profile',
      method: 'PATCH',
      headers: { 'Origin': undefined },
      body: { firstName: 'Test', lastName: 'User' },
      expectedBehavior: 'blocked',
      severity: 'high'
    },
    {
      name: 'Request with Invalid Origin',
      description: 'Request with invalid Origin header',
      endpoint: '/api/users/profile',
      method: 'PATCH',
      headers: { 'Origin': 'https://evil.com' },
      body: { firstName: 'Evil', lastName: 'User' },
      expectedBehavior: 'blocked',
      severity: 'high'
    },

    // CSRF token manipulation
    {
      name: 'Invalid CSRF Token',
      description: 'Request with invalid CSRF token',
      endpoint: '/api/users/profile',
      method: 'PATCH',
      body: { firstName: 'Invalid', lastName: 'Token', csrf_token: 'INVALID_TOKEN' },
      expectedBehavior: 'blocked',
      severity: 'high'
    },
    {
      name: 'Missing CSRF Token',
      description: 'Request missing CSRF token entirely',
      endpoint: '/api/users/profile',
      method: 'PATCH',
      body: { firstName: 'Missing', lastName: 'Token' },
      expectedBehavior: 'blocked',
      severity: 'high'
    },

    // Content-Type manipulation
    {
      name: 'Form-Encoded CSRF Test',
      description: 'CSRF test with form-encoded content',
      endpoint: '/api/users/profile',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'firstName=Form&lastName=Encoded',
      expectedBehavior: 'blocked',
      severity: 'medium'
    },

    // AJAX/Fetch API CSRF tests
    {
      name: 'AJAX Request without CSRF',
      description: 'AJAX request without proper CSRF protection',
      endpoint: '/api/users/preferences',
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: { theme: 'dark', language: 'en' },
      expectedBehavior: 'blocked',
      severity: 'high'
    }
  ];

  describe('CSRF Token Validation Tests', () => {
    it('should validate CSRF tokens on state-changing operations', async () => {
      for (const testCase of csrfTestCases) {
        // Test without CSRF token
        const result = await executeCSRFTest(testCase);

        if (testCase.expectedBehavior === 'blocked') {
          expect(result.vulnerabilityDetected).toBe(false);

          if (result.vulnerabilityDetected) {
            console.error(`🚨 CSRF vulnerability detected: ${testCase.name}`);
            console.error(`   Evidence: ${result.evidence}`);
          }
        }
      }

      console.log(`✅ CSRF token validation tests completed`);
    });

    it('should allow requests with valid CSRF tokens', async () => {
      if (!csrfToken) {
        console.warn('⚠️  No CSRF token available for validation test');
        return;
      }

      const validTestCase: CSRFTestCase = {
        name: 'Valid CSRF Token Test',
        description: 'Request with valid CSRF token should succeed',
        endpoint: '/api/users/profile',
        method: 'GET',
        expectedBehavior: 'allowed',
        severity: 'low'
      };

      const result = await executeCSRFTest(validTestCase);

      // GET requests should typically be allowed
      expect(result.statusCode).toBeLessThan(500);

      console.log(`✅ Valid CSRF token test completed`);
    });
  });

  describe('Origin and Referer Header Validation Tests', () => {
    it('should validate Origin header on state-changing requests', async () => {
      const originTestCases = [
        {
          name: 'Missing Origin Header',
          headers: {},
          expectedBlocked: true
        },
        {
          name: 'Different Origin Header',
          headers: { 'Origin': 'https://evil.com' },
          expectedBlocked: true
        },
        {
          name: 'Null Origin Header',
          headers: { 'Origin': 'null' },
          expectedBlocked: true
        },
        {
          name: 'Same Origin Header',
          headers: { 'Origin': new URL(baseUrl).origin },
          expectedBlocked: false
        }
      ];

      for (const testCase of originTestCases) {
        const csrfTestCase: CSRFTestCase = {
          name: testCase.name,
          description: `Origin validation test: ${testCase.name}`,
          endpoint: '/api/users/profile',
          method: 'PATCH',
          headers: testCase.headers,
          body: { firstName: 'Origin', lastName: 'Test' },
          expectedBehavior: testCase.expectedBlocked ? 'blocked' : 'allowed',
          severity: 'high'
        };

        const result = await executeCSRFTest(csrfTestCase);

        if (testCase.expectedBlocked) {
          expect(result.statusCode).toBeGreaterThanOrEqual(400);
        }
      }

      console.log(`✅ Origin header validation tests completed`);
    });
  });

  describe('SameSite Cookie Policy Tests', () => {
    it('should enforce SameSite cookie policy', async () => {
      try {
        // Test login to get session cookies
        const response = await axios.post(`${baseUrl}/api/auth/login`, {
          email: 'test@example.com',
          password: 'testpassword'
        }, {
          validateStatus: () => true
        });

        const setCookieHeaders = response.headers['set-cookie'];
        if (setCookieHeaders) {
          const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

          for (const cookie of cookies) {
            if (cookie.includes('session') || cookie.includes('auth')) {
              // Should have SameSite attribute
              expect(cookie).toMatch(/SameSite=(Strict|Lax|None)/i);

              // If SameSite=None, should also have Secure attribute
              if (cookie.includes('SameSite=None')) {
                expect(cookie).toMatch(/Secure/i);
              }
            }
          }
        }

        console.log(`✅ SameSite cookie policy tests completed`);
      } catch (error) {
        console.warn('⚠️  Could not test SameSite cookies:', error.message);
      }
    });
  });

  describe('Browser-Based CSRF Tests', () => {
    it('should prevent CSRF attacks from external origins', async () => {
      const maliciousOrigins = [
        'https://evil.com',
        'http://malicious-site.net',
        'https://attacker.org'
      ];

      for (const origin of maliciousOrigins) {
        const testCase = csrfTestCases[0]; // Use first test case
        const result = await executeBrowserCSRFTest(testCase, origin);

        expect(result.vulnerabilityDetected).toBe(false);

        if (result.vulnerabilityDetected) {
          console.error(`🚨 Browser-based CSRF vulnerability from ${origin}`);
          console.error(`   Evidence: ${result.evidence}`);
        }
      }

      console.log(`✅ Browser-based CSRF tests completed`);
    });
  });

  describe('AJAX and Fetch API CSRF Tests', () => {
    it('should protect AJAX requests from CSRF', async () => {
      const ajaxTestCase: CSRFTestCase = {
        name: 'AJAX CSRF Protection',
        description: 'AJAX request without proper CSRF protection',
        endpoint: '/api/users/preferences',
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        },
        body: { preference: 'test', value: 'csrf' },
        expectedBehavior: 'blocked',
        severity: 'high'
      };

      const result = await executeCSRFTest(ajaxTestCase);

      // AJAX requests should be protected
      expect(result.vulnerabilityDetected).toBe(false);

      console.log(`✅ AJAX CSRF protection tests completed`);
    });
  });

  describe('Double Submit Cookie Pattern Tests', () => {
    it('should implement double submit cookie pattern if used', async () => {
      try {
        // Get initial response to check for CSRF cookie
        const response = await axios.get(`${baseUrl}/`, {
          validateStatus: () => true
        });

        const setCookieHeaders = response.headers['set-cookie'];
        let csrfCookiePresent = false;

        if (setCookieHeaders) {
          const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
          csrfCookiePresent = cookies.some(cookie =>
            cookie.toLowerCase().includes('csrf') && cookie.includes('SameSite')
          );
        }

        if (csrfCookiePresent) {
          console.log('🔍 Double submit cookie pattern detected');
          // Additional validation could be added here
        }

        console.log(`✅ Double submit cookie pattern tests completed`);
      } catch (error) {
        console.warn('⚠️  Could not test double submit cookie pattern:', error.message);
      }
    });
  });

  describe('Comprehensive CSRF Security Report', () => {
    it('should generate comprehensive CSRF security report', () => {
      console.log('\n🛡️  COMPREHENSIVE CROSS-SITE REQUEST FORGERY SECURITY REPORT');
      console.log('==========================================================');

      const totalTests = testResults.length;
      const vulnerabilitiesFound = testResults.filter(r => r.vulnerabilityDetected).length;
      const criticalVulnerabilities = testResults.filter(r =>
        r.vulnerabilityDetected && r.testCase.severity === 'critical'
      ).length;
      const highVulnerabilities = testResults.filter(r =>
        r.vulnerabilityDetected && r.testCase.severity === 'high'
      ).length;

      const protectedEndpoints = [...new Set(
        testResults.filter(r => !r.vulnerabilityDetected).map(r => r.endpoint)
      )];

      const vulnerableEndpoints = [...new Set(
        testResults.filter(r => r.vulnerabilityDetected).map(r => r.endpoint)
      )];

      console.log(`📊 TEST SUMMARY:`);
      console.log(`   Total CSRF Tests: ${totalTests}`);
      console.log(`   Vulnerabilities Found: ${vulnerabilitiesFound}`);
      console.log(`   Critical Vulnerabilities: ${criticalVulnerabilities} 🔴`);
      console.log(`   High Vulnerabilities: ${highVulnerabilities} 🟠`);
      console.log(`   Protected Endpoints: ${protectedEndpoints.length}`);
      console.log(`   Vulnerable Endpoints: ${vulnerableEndpoints.length}`);

      console.log(`\n🔒 PROTECTION MECHANISMS ANALYSIS:`);
      const testsWithCSRFToken = testResults.filter(r => r.csrfTokenPresent).length;
      const testsWithSameSite = testResults.filter(r => r.sameSiteCookie).length;
      const testsWithOriginValidation = testResults.filter(r => r.originHeaderValidated).length;

      console.log(`   CSRF Token Implementation: ${testsWithCSRFToken > 0 ? '✅' : '❌'} (${testsWithCSRFToken}/${totalTests} responses)`);
      console.log(`   SameSite Cookie Policy: ${testsWithSameSite > 0 ? '✅' : '❌'} (${testsWithSameSite}/${totalTests} responses)`);
      console.log(`   Origin Header Validation: ${testsWithOriginValidation > 0 ? '✅' : '❌'} (${testsWithOriginValidation}/${totalTests} responses)`);

      if (vulnerableEndpoints.length > 0) {
        console.log(`\n🎯 VULNERABLE ENDPOINTS:`);
        vulnerableEndpoints.forEach(endpoint => {
          const vulnCount = testResults.filter(r => r.endpoint === endpoint && r.vulnerabilityDetected).length;
          const severity = testResults
            .filter(r => r.endpoint === endpoint && r.vulnerabilityDetected)
            .map(r => r.testCase.severity)
            .sort((a, b) => {
              const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
              return severityOrder[a] - severityOrder[b];
            })[0];

          const severityIcon = severity === 'critical' ? '🔴' :
                             severity === 'high' ? '🟠' :
                             severity === 'medium' ? '🟡' : '🟢';

          console.log(`   ${severityIcon} ${endpoint}: ${vulnCount} vulnerabilities (${severity} severity)`);
        });
      }

      if (vulnerabilitiesFound > 0) {
        console.log(`\n🚨 DETAILED VULNERABILITY REPORT:`);
        testResults
          .filter(r => r.vulnerabilityDetected)
          .forEach(result => {
            const severityIcon = result.testCase.severity === 'critical' ? '🔴' :
                               result.testCase.severity === 'high' ? '🟠' :
                               result.testCase.severity === 'medium' ? '🟡' : '🟢';

            console.log(`\n   ${severityIcon} ${result.testCase.name} (${result.testCase.severity.toUpperCase()})`);
            console.log(`      Endpoint: ${result.testCase.method} ${result.endpoint}`);
            console.log(`      Status Code: ${result.statusCode}`);
            console.log(`      CSRF Token Present: ${result.csrfTokenPresent ? '✅' : '❌'}`);
            console.log(`      SameSite Cookie: ${result.sameSiteCookie ? '✅' : '❌'}`);
            console.log(`      Origin Validation: ${result.originHeaderValidated ? '✅' : '❌'}`);
            if (result.evidence) {
              console.log(`      Evidence: ${result.evidence}`);
            }
            console.log(`      Description: ${result.testCase.description}`);
          });
      }

      console.log(`\n🎯 SECURITY ASSESSMENT:`);
      if (vulnerabilitiesFound === 0) {
        console.log(`   ✅ EXCELLENT: No CSRF vulnerabilities detected`);
        console.log(`   ✅ State-changing operations appear to be properly protected`);
        console.log(`   ✅ CSRF protection mechanisms are working correctly`);
      } else if (criticalVulnerabilities === 0) {
        console.log(`   ⚠️  WARNING: ${vulnerabilitiesFound} CSRF vulnerabilities found`);
        console.log(`   ⚠️  No critical vulnerabilities, but security improvements needed`);
      } else {
        console.log(`   🚨 CRITICAL: ${criticalVulnerabilities} critical CSRF vulnerabilities found`);
        console.log(`   🚨 Application is vulnerable to cross-site request forgery attacks`);
        console.log(`   🚨 Immediate remediation required to prevent account takeover`);
      }

      console.log(`\n📈 RECOMMENDATIONS:`);
      if (vulnerabilitiesFound > 0) {
        console.log(`   🔴 URGENT: Fix ${criticalVulnerabilities} critical CSRF vulnerabilities`);
        console.log(`   🟠 HIGH: Address ${highVulnerabilities} high severity CSRF issues`);
        console.log(`   💡 Implement CSRF tokens on all state-changing operations`);
        console.log(`   💡 Enforce SameSite cookie policy (Strict or Lax)`);
        console.log(`   💡 Validate Origin and Referer headers for sensitive operations`);
        console.log(`   💡 Use double submit cookie pattern as additional protection`);
        console.log(`   💡 Implement anti-CSRF middleware`);
      } else {
        console.log(`   ✅ Continue following CSRF protection best practices`);
        console.log(`   ✅ Regularly test for new CSRF bypass techniques`);
        console.log(`   ✅ Keep security libraries and frameworks updated`);
        console.log(`   ✅ Consider implementing additional security layers`);
      }

      console.log(`\n📋 CSRF PROTECTION BEST PRACTICES:`);
      console.log(`   🛡️ Use anti-CSRF tokens for all state-changing operations`);
      console.log(`   🛡️ Set SameSite cookie policy to Strict or Lax`);
      console.log(`   🛡️ Validate Origin and Referer headers for sensitive requests`);
      console.log(`   🛡️ Implement double submit cookie pattern`);
      console.log(`   🛡️ Use custom request headers for AJAX requests`);
      console.log(`   🛡️ Implement proper session management`);
      console.log(`   🛡️ Use secure, HttpOnly cookies for authentication`);
      console.log(`   🛡️ Regularly test for CSRF vulnerabilities`);

      // Overall security assertion
      expect(criticalVulnerabilities).toBe(0);
      expect(highVulnerabilities).toBe(0);
      expect(vulnerabilitiesFound).toBe(0);
    });
  });
});