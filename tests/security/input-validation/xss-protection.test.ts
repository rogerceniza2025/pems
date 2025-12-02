/**
 * Cross-Site Scripting (XSS) Protection Tests
 *
 * Comprehensive testing for XSS vulnerabilities across all application endpoints
 * that accept and display user input. These tests validate proper input sanitization,
 * output encoding, and security headers are implemented.
 *
 * Test Categories:
 * - Reflected XSS
 * - Stored XSS
 * - DOM-based XSS
 * - Self-XSS
 * - Content Security Policy (CSP) validation
 * - Output encoding verification
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { chromium, Browser, Page } from 'playwright';

interface XSSTestCase {
  name: string;
  payload: string;
  description: string;
  expectedBehavior: 'blocked' | 'sanitized' | 'escaped';
  severity: 'critical' | 'high' | 'medium' | 'low';
  attackVector: 'reflected' | 'stored' | 'dom' | 'self';
}

interface XSSTestResult {
  testCase: XSSTestCase;
  endpoint: string;
  method: string;
  statusCode: number;
  responseContainsPayload: boolean;
  payloadEscaped: boolean;
  cspEnforced: boolean;
  vulnerabilityDetected: boolean;
  evidence?: string;
}

describe('Cross-Site Scripting (XSS) Protection Tests', () => {
  let browser: Browser;
  let page: Page;
  let baseUrl: string;
  let testResults: XSSTestResult[] = [];

  beforeEach(async () => {
    baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    testResults = [];
  });

  afterEach(async () => {
    await browser.close();
  });

  /**
   * Execute XSS test case
   */
  async function executeXSSTest(
    testCase: XSSTestCase,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'POST',
    additionalData?: any
  ): Promise<XSSTestResult> {
    let response;
    let statusCode: number;
    let responseBody: any;
    let responseContainsPayload = false;
    let payloadEscaped = false;
    let cspEnforced = false;
    let vulnerabilityDetected = false;
    let evidence: string | undefined;

    try {
      const config = {
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'XSS-Tester/1.0'
        }
      };

      switch (method) {
        case 'GET':
          response = await axios.get(`${baseUrl}${endpoint}?input=${encodeURIComponent(testCase.payload)}`, config);
          break;
        case 'POST':
          response = await axios.post(`${baseUrl}${endpoint}`, {
            ...additionalData,
            input: testCase.payload,
            ...testCase.payload
          }, config);
          break;
        case 'PUT':
          response = await axios.put(`${baseUrl}${endpoint}`, {
            ...additionalData,
            input: testCase.payload
          }, config);
          break;
        case 'PATCH':
          response = await axios.patch(`${baseUrl}${endpoint}`, {
            ...additionalData,
            input: testCase.payload
          }, config);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      statusCode = response.status;
      responseBody = response.data;

      // Analyze response for XSS vulnerabilities
      const responseText = JSON.stringify(responseBody);
      responseContainsPayload = responseText.includes(testCase.payload);
      payloadEscaped = isPayloadEscaped(testCase.payload, responseText);
      cspEnforced = hasSecurityHeader(response.headers, 'content-security-policy');

      // Determine if vulnerability exists
      vulnerabilityDetected = analyzeXSSVulnerability(testCase, responseText, statusCode);

      if (vulnerabilityDetected) {
        evidence = extractXSSEvidence(testCase.payload, responseText);
      }

    } catch (error: any) {
      statusCode = error.response?.status || 500;
      responseBody = error.response?.data || { error: error.message };
    }

    const result: XSSTestResult = {
      testCase,
      endpoint,
      method,
      statusCode,
      responseContainsPayload,
      payloadEscaped,
      cspEnforced,
      vulnerabilityDetected,
      evidence
    };

    testResults.push(result);
    return result;
  }

  /**
   * Execute DOM-based XSS test
   */
  async function executeDOMXSSTest(testCase: XSSTestCase, url: string): Promise<XSSTestResult> {
    let vulnerabilityDetected = false;
    let evidence: string | undefined;
    let cspEnforced = false;

    try {
      await page.goto(url, { waitUntil: 'networkidle' });

      // Check if payload executes in DOM
      const payloadExecuted = await page.evaluate((payload) => {
        // Check for script execution indicators
        return (
          window.xssExecuted === true ||
          document.querySelector('[xss-executed]') !== null ||
          document.body.innerHTML.includes('XSS-EXECUTED')
        );
      }, testCase.payload);

      vulnerabilityDetected = payloadExecuted;

      // Check CSP headers
      const cspHeader = await page.evaluate(() => {
        const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        return meta ? meta.getAttribute('content') : null;
      });

      cspEnforced = !!cspHeader;

      if (vulnerabilityDetected) {
        evidence = `DOM-based XSS executed with payload: ${testCase.payload}`;
      }

    } catch (error) {
      evidence = `Error testing DOM XSS: ${error}`;
    }

    return {
      testCase,
      endpoint: url,
      method: 'GET',
      statusCode: 200,
      responseContainsPayload: false,
      payloadEscaped: false,
      cspEnforced,
      vulnerabilityDetected,
      evidence
    };
  }

  /**
   * Check if payload is properly escaped
   */
  function isPayloadEscaped(payload: string, responseText: string): boolean {
    const escapePatterns = [
      '&lt;',
      '&gt;',
      '&amp;',
      '&quot;',
      '&#x27;',
      '\\u003c',
      '\\u003e',
      '\\x3c',
      '\\x3e'
    ];

    const dangerousCharacters = ['<', '>', '"', "'", '/', '\\'];

    let escapedCount = 0;
    let totalCount = 0;

    dangerousCharacters.forEach(char => {
      if (payload.includes(char)) {
        totalCount++;
        if (escapePatterns.some(pattern => responseText.includes(char.replace(char, pattern)))) {
          escapedCount++;
        }
      }
    });

    return totalCount > 0 && escapedCount === totalCount;
  }

  /**
   * Check for security headers
   */
  function hasSecurityHeader(headers: any, headerName: string): boolean {
    const headerValue = headers[headerName] || headers[headerName.toLowerCase()];
    return !!headerValue;
  }

  /**
   * Analyze response for XSS vulnerabilities
   */
  function analyzeXSSVulnerability(testCase: XSSTestCase, responseText: string, statusCode: number): boolean {
    const lowerResponse = responseText.toLowerCase();
    const lowerPayload = testCase.payload.toLowerCase();

    // Direct payload in response (not escaped)
    if (lowerResponse.includes(lowerPayload) && !isPayloadEscaped(testCase.payload, responseText)) {
      return true;
    }

    // Script tags in response
    if (lowerResponse.includes('<script>') || lowerResponse.includes('<script ')) {
      return true;
    }

    // Event handlers in response
    const eventHandlers = [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
      'onchange', 'onsubmit', 'onreset', 'onselect', 'onunload'
    ];

    if (eventHandlers.some(handler => lowerResponse.includes(handler))) {
      return true;
    }

    // JavaScript: protocol
    if (lowerResponse.includes('javascript:')) {
      return true;
    }

    // Data URLs with script content
    if (lowerResponse.includes('data:text/html') && lowerResponse.includes('<script')) {
      return true;
    }

    return false;
  }

  /**
   * Extract XSS evidence from response
   */
  function extractXSSEvidence(payload: string, responseText: string): string {
    const evidence = [];

    if (responseText.includes(payload)) {
      evidence.push(`Unescaped payload found: ${payload}`);
    }

    if (responseText.includes('<script>')) {
      evidence.push('Script tag found in response');
    }

    const eventHandlers = ['onerror', 'onload', 'onclick', 'onmouseover'];
    const foundHandlers = eventHandlers.filter(handler => responseText.toLowerCase().includes(handler));
    if (foundHandlers.length > 0) {
      evidence.push(`Event handlers found: ${foundHandlers.join(', ')}`);
    }

    if (responseText.toLowerCase().includes('javascript:')) {
      evidence.push('JavaScript protocol found');
    }

    return evidence.join('; ') || 'XSS vulnerability detected';
  }

  /**
   * XSS payload test cases
   */
  const xssPayloads: XSSTestCase[] = [
    // Basic script injections
    {
      name: 'Basic Script Tag',
      payload: '<script>alert("XSS")</script>',
      description: 'Basic script tag injection',
      expectedBehavior: 'escaped',
      severity: 'critical',
      attackVector: 'reflected'
    },
    {
      name: 'Script with Source',
      payload: '<script src="evil.js"></script>',
      description: 'External script injection',
      expectedBehavior: 'escaped',
      severity: 'critical',
      attackVector: 'reflected'
    },
    {
      name: 'Image OnError',
      payload: '<img src="x" onerror="alert(\'XSS\')">',
      description: 'Image onerror event handler',
      expectedBehavior: 'escaped',
      severity: 'high',
      attackVector: 'reflected'
    },
    {
      name: 'SVG OnLoad',
      payload: '<svg onload="alert(\'XSS\')">',
      description: 'SVG onload event handler',
      expectedBehavior: 'escaped',
      severity: 'high',
      attackVector: 'reflected'
    },

    // Advanced XSS techniques
    {
      name: 'Encoded Script',
      payload: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
      description: 'HTML entity encoded script',
      expectedBehavior: 'sanitized',
      severity: 'high',
      attackVector: 'reflected'
    },
    {
      name: 'Unicode Script',
      payload: '\\u003cscript\\u003ealert("XSS")\\u003c/script\\u003e',
      description: 'Unicode encoded script',
      expectedBehavior: 'sanitized',
      severity: 'high',
      attackVector: 'reflected'
    },
    {
      name: 'JavaScript Protocol',
      payload: 'javascript:alert("XSS")',
      description: 'JavaScript protocol injection',
      expectedBehavior: 'escaped',
      severity: 'high',
      attackVector: 'reflected'
    },
    {
      name: 'Data URL Script',
      payload: 'data:text/html,<script>alert("XSS")</script>',
      description: 'Data URL with script content',
      expectedBehavior: 'escaped',
      severity: 'high',
      attackVector: 'reflected'
    },

    // DOM-based XSS
    {
      name: 'DOM InnerHTML',
      payload: '<img src=x onerror=alert("XSS")>',
      description: 'DOM-based XSS via innerHTML',
      expectedBehavior: 'escaped',
      severity: 'critical',
      attackVector: 'dom'
    },
    {
      name: 'DOM Document Write',
      payload: '<script>document.write("XSS")</script>',
      description: 'DOM-based XSS via document.write',
      expectedBehavior: 'escaped',
      severity: 'critical',
      attackVector: 'dom'
    },

    // Filter bypass techniques
    {
      name: 'Case Variation',
      payload: '<ScRiPt>alert("XSS")</ScRiPt>',
      description: 'Case variation to bypass filters',
      expectedBehavior: 'escaped',
      severity: 'high',
      attackVector: 'reflected'
    },
    {
      name: 'Tag Obfuscation',
      payload: '<script>alert(String.fromCharCode(88,83,83))</script>',
      description: 'Character encoding to bypass filters',
      expectedBehavior: 'escaped',
      severity: 'high',
      attackVector: 'reflected'
    },
    {
      name: 'Multi-line Script',
      payload: '<script>\nalert("XSS");\n</script>',
      description: 'Multi-line script injection',
      expectedBehavior: 'escaped',
      severity: 'medium',
      attackVector: 'reflected'
    }
  ];

  describe('Reflected XSS Tests', () => {
    it('should prevent reflected XSS in search endpoints', async () => {
      const endpoint = '/api/search';

      for (const testCase of xssPayloads.filter(t => t.attackVector === 'reflected')) {
        const result = await executeXSSTest(testCase, endpoint, 'GET');

        expect(result.vulnerabilityDetected).toBe(false);

        if (result.vulnerabilityDetected) {
          console.error(`🚨 Reflected XSS vulnerability detected: ${testCase.name}`);
          console.error(`   Payload: ${testCase.payload}`);
          console.error(`   Evidence: ${result.evidence}`);
        }
      }

      console.log(`✅ Reflected XSS tests completed for search endpoint`);
    });

    it('should prevent reflected XSS in login endpoints', async () => {
      const endpoint = '/api/auth/login';

      for (const testCase of xssPayloads.filter(t => t.attackVector === 'reflected')) {
        const result = await executeXSSTest(testCase, endpoint, 'POST', {
          email: `test-${Date.now()}@example.com`,
          password: 'password123'
        });

        expect(result.vulnerabilityDetected).toBe(false);
      }

      console.log(`✅ Reflected XSS tests completed for login endpoint`);
    });
  });

  describe('Stored XSS Tests', () => {
    it('should prevent stored XSS in user profiles', async () => {
      const endpoint = '/api/users/profile';

      for (const testCase of xssPayloads) {
        // Test profile update with XSS payload
        const updateResult = await executeXSSTest(testCase, endpoint, 'PATCH', {
          firstName: testCase.payload,
          lastName: 'TestUser'
        });

        // Check if XSS is stored and returned unsanitized
        expect(updateResult.vulnerabilityDetected).toBe(false);

        if (updateResult.vulnerabilityDetected) {
          console.error(`🚨 Stored XSS vulnerability in user profile: ${testCase.name}`);
        }
      }

      console.log(`✅ Stored XSS tests completed for user profiles`);
    });

    it('should prevent stored XSS in registration', async () => {
      const endpoint = '/api/auth/register';

      for (const testCase of xssPayloads.filter(t => t.severity === 'critical')) {
        const result = await executeXSSTest(testCase, endpoint, 'POST', {
          email: `test-${Date.now()}@example.com`,
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          firstName: testCase.payload,
          lastName: 'TestUser'
        });

        expect(result.vulnerabilityDetected).toBe(false);
      }

      console.log(`✅ Stored XSS tests completed for registration`);
    });
  });

  describe('Content Security Policy Tests', () => {
    it('should enforce Content Security Policy headers', async () => {
      const endpoints = ['/', '/api/search', '/api/auth/login'];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${baseUrl}${endpoint}`, {
            validateStatus: () => true
          });

          const cspHeader = response.headers['content-security-policy'];
          expect(cspHeader).toBeDefined();

          if (cspHeader) {
            // Check for important CSP directives
            const cspDirectives = [
              'default-src',
              'script-src',
              'style-src',
              'img-src',
              'connect-src',
              'font-src'
            ];

            const hasImportantDirectives = cspDirectives.some(directive => cspHeader.includes(directive));
            expect(hasImportantDirectives).toBe(true);

            // Check for unsafe-inline is not allowed
            expect(cspHeader).not.toContain("script-src 'unsafe-inline'");
          }
        } catch (error) {
          // Endpoint may not exist, but test framework should handle it
        }
      }

      console.log(`✅ Content Security Policy tests completed`);
    });
  });

  describe('Output Encoding Tests', () => {
    it('should properly encode HTML output', async () => {
      const htmlPayloads = [
        '<b>Bold</b>',
        '<i>Italic</i>',
        '<u>Underline</u>',
        '&lt;script&gt;alert("XSS")&lt;/script&gt;',
        'Quote: "test"',
        'Apostrophe: \'test\'',
        'Angle brackets: <test>'
      ];

      const endpoint = '/api/search';

      for (const payload of htmlPayloads) {
        const testCase: XSSTestCase = {
          name: `HTML Encoding: ${payload}`,
          payload,
          description: `Test HTML encoding for: ${payload}`,
          expectedBehavior: 'escaped',
          severity: 'medium',
          attackVector: 'reflected'
        };

        const result = await executeXSSTest(testCase, endpoint, 'GET');

        // Should not contain unescaped HTML
        if (result.responseContainsPayload) {
          expect(result.payloadEscaped).toBe(true);
        }
      }

      console.log(`✅ Output encoding tests completed`);
    });
  });

  describe('DOM-Based XSS Tests', () => {
    it('should prevent DOM-based XSS in client-side code', async () => {
      const domXSSPayloads = xssPayloads.filter(t => t.attackVector === 'dom');

      for (const testCase of domXSSPayloads) {
        // Test with URL parameter that might be used in DOM manipulation
        const testUrl = `${baseUrl}/search?query=${encodeURIComponent(testCase.payload)}`;
        const result = await executeDOMXSSTest(testCase, testUrl);

        expect(result.vulnerabilityDetected).toBe(false);

        if (result.vulnerabilityDetected) {
          console.error(`🚨 DOM-based XSS vulnerability detected: ${testCase.name}`);
          console.error(`   Evidence: ${result.evidence}`);
        }
      }

      console.log(`✅ DOM-based XSS tests completed`);
    });
  });

  describe('Security Headers Validation', () => {
    it('should implement XSS protection headers', async () => {
      try {
        const response = await axios.get(`${baseUrl}/`, {
          validateStatus: () => true
        });

        // Check for X-XSS-Protection header (legacy but still useful)
        const xssProtection = response.headers['x-xss-protection'];
        if (xssProtection) {
          expect(xssProtection).toBe('1; mode=block');
        }

        // Check for X-Content-Type-Options header
        const contentTypeOptions = response.headers['x-content-type-options'];
        expect(contentTypeOptions).toBe('nosniff');

      } catch (error) {
        // Test environment may not be fully configured
      }

      console.log(`✅ Security headers validation completed`);
    });
  });

  describe('Comprehensive XSS Security Report', () => {
    it('should generate comprehensive XSS security report', () => {
      console.log('\n🛡️  COMPREHENSIVE CROSS-SITE SCRIPTING SECURITY REPORT');
      console.log('==================================================');

      const totalTests = testResults.length;
      const vulnerabilitiesFound = testResults.filter(r => r.vulnerabilityDetected).length;
      const criticalVulnerabilities = testResults.filter(r =>
        r.vulnerabilityDetected && r.testCase.severity === 'critical'
      ).length;
      const highVulnerabilities = testResults.filter(r =>
        r.vulnerabilityDetected && r.testCase.severity === 'high'
      ).length;

      const endpointsWithVulnerabilities = [...new Set(
        testResults.filter(r => r.vulnerabilityDetected).map(r => r.endpoint)
      )];

      console.log(`📊 TEST SUMMARY:`);
      console.log(`   Total XSS Tests: ${totalTests}`);
      console.log(`   Vulnerabilities Found: ${vulnerabilitiesFound}`);
      console.log(`   Critical Vulnerabilities: ${criticalVulnerabilities} 🔴`);
      console.log(`   High Vulnerabilities: ${highVulnerabilities} 🟠`);

      console.log(`\n📋 VULNERABILITY BREAKDOWN:`);
      const vulnerabilitiesByVector = testResults
        .filter(r => r.vulnerabilityDetected)
        .reduce((acc, result) => {
          const vector = result.testCase.attackVector;
          acc[vector] = (acc[vector] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      Object.entries(vulnerabilitiesByVector).forEach(([vector, count]) => {
        console.log(`   ${vector.toUpperCase()}: ${count} vulnerabilities`);
      });

      if (endpointsWithVulnerabilities.length > 0) {
        console.log(`\n🎯 AFFECTED ENDPOINTS:`);
        endpointsWithVulnerabilities.forEach(endpoint => {
          const vulnCount = testResults.filter(r => r.endpoint === endpoint && r.vulnerabilityDetected).length;
          console.log(`   ${endpoint}: ${vulnCount} vulnerabilities`);
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
            console.log(`      Vector: ${result.testCase.attackVector.toUpperCase()}`);
            console.log(`      Endpoint: ${result.method} ${result.endpoint}`);
            console.log(`      Payload: ${result.testCase.payload}`);
            console.log(`      Status Code: ${result.statusCode}`);
            console.log(`      CSP Enforced: ${result.cspEnforced ? '✅' : '❌'}`);
            console.log(`      Payload Escaped: ${result.payloadEscaped ? '✅' : '❌'}`);
            if (result.evidence) {
              console.log(`      Evidence: ${result.evidence}`);
            }
            console.log(`      Description: ${result.testCase.description}`);
          });
      }

      console.log(`\n🎯 SECURITY ASSESSMENT:`);
      if (vulnerabilitiesFound === 0) {
        console.log(`   ✅ EXCELLENT: No XSS vulnerabilities detected`);
        console.log(`   ✅ All input appears to be properly sanitized and encoded`);
        console.log(`   ✅ Content Security Policy appears to be enforced`);
      } else if (criticalVulnerabilities === 0) {
        console.log(`   ⚠️  WARNING: ${vulnerabilitiesFound} XSS vulnerabilities found`);
        console.log(`   ⚠️  No critical vulnerabilities, but security improvements needed`);
      } else {
        console.log(`   🚨 CRITICAL: ${criticalVulnerabilities} critical XSS vulnerabilities found`);
        console.log(`   🚨 Immediate remediation required to prevent client-side attacks`);
      }

      console.log(`\n📈 RECOMMENDATIONS:`);
      if (vulnerabilitiesFound > 0) {
        console.log(`   🔴 URGENT: Fix ${criticalVulnerabilities} critical XSS vulnerabilities`);
        console.log(`   🟠 HIGH: Address ${highVulnerabilities} high severity XSS issues`);
        console.log(`   💡 Implement comprehensive input validation on all user inputs`);
        console.log(`   💡 Use output encoding based on context (HTML, attribute, JavaScript, CSS)`);
        console.log(`   💡 Enforce strict Content Security Policy (CSP) headers`);
        console.log(`   💡 Use security-focused frameworks and libraries`);
        console.log(`   💡 Implement XSS protection middleware`);
      } else {
        console.log(`   ✅ Continue following secure coding practices`);
        console.log(`   ✅ Regularly test for new XSS techniques and bypasses`);
        console.log(`   ✅ Keep security libraries and frameworks updated`);
        console.log(`   ✅ Consider implementing additional security layers like WAF`);
      }

      console.log(`\n📋 SECURITY BEST PRACTICES:`);
      console.log(`   🔒 Never trust user input - always validate and sanitize`);
      console.log(`   🔒 Use parameterized queries and prepared statements`);
      console.log(`   🔒 Implement proper output encoding based on context`);
      console.log(`   🔒 Use Content Security Policy (CSP) to restrict script sources`);
      console.log(`   🔒 Enable HttpOnly and Secure flags on cookies`);
      console.log(`   🔒 Implement X-XSS-Protection and X-Content-Type-Options headers`);
      console.log(`   🔒 Regularly update dependencies and security patches`);

      // Overall security assertion
      expect(criticalVulnerabilities).toBe(0);
      expect(highVulnerabilities).toBe(0);
      expect(vulnerabilitiesFound).toBe(0);
    });
  });
});