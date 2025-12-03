import { test, expect } from '@playwright/test';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

/**
 * API Security Testing Suite
 *
 * This test suite validates API security including OpenAPI specification compliance,
  input validation, rate limiting, and secure communication practices.
 *
 * Test Coverage:
 * - OpenAPI specification validation
 * - Input sanitization and validation
 * - SQL injection prevention
 * - XSS prevention
 * - CSRF protection
 * - Rate limiting and throttling
 * - API versioning security
 * - Content Security Policy (CSP)
 * - CORS configuration
 * - API key security
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${BASE_URL}/api/v1`;
const API_DOCS_URL = `${API_BASE_URL}/docs`;

test.describe('API Security Testing', () => {
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

  test.describe('OpenAPI Specification Validation', () => {
    test('OpenAPI documentation is accessible and valid', async ({ page }) => {
      console.log('🔒 Testing OpenAPI documentation accessibility');

      // Test Swagger UI availability
      const response = await page.goto(API_DOCS_URL);
      expect(response?.status()).toBe(200);

      // Check for Swagger UI elements
      await expect(page.locator('title')).toContain('Swagger');
      await expect(page.locator('#swagger-ui')).toBeVisible();

      console.log('✅ OpenAPI documentation accessible');

      // Test raw OpenAPI JSON
      const specResponse = await page.request.get(`${API_BASE_URL}/openapi.json`);
      expect(specResponse.status()).toBe(200);

      const specData = await specResponse.json();
      expect(specData.openapi).toBeDefined();
      expect(specData.info).toBeDefined();
      expect(specData.paths).toBeDefined();

      console.log('✅ OpenAPI specification is valid');
    });

    test('API endpoints follow RESTful conventions', async ({ page }) => {
      console.log('🔒 Testing RESTful API conventions');

      const specResponse = await page.request.get(`${API_BASE_URL}/openapi.json`);
      const specData = await specResponse.json();

      const paths = specData.paths;

      // Check for proper HTTP methods
      const httpMethods = ['get', 'post', 'put', 'delete', 'patch'];
      let restfulCompliance = 0;
      let totalEndpoints = 0;

      for (const [path, methods] of Object.entries(paths)) {
        for (const method of httpMethods) {
          if (methods[method as keyof typeof methods]) {
            totalEndpoints++;

            // Check naming conventions
            if (path.startsWith('/')) {
              restfulCompliance++;
            }

            // Check for resource naming
            if (path.includes('{') && path.includes('}')) {
              // Has path parameters - good
              restfulCompliance += 0.1;
            }
          }
        }
      }

      const complianceRate = (restfulCompliance / totalEndpoints) * 100;
      expect(complianceRate).toBeGreaterThan(80);

      console.log(`✅ RESTful compliance: ${complianceRate.toFixed(1)}%`);
    });

    test('API specification includes security definitions', async ({ page }) => {
      console.log('🔒 Testing API security definitions');

      const specResponse = await page.request.get(`${API_BASE_URL}/openapi.json`);
      const specData = await specResponse.json();

      // Check for security schemes
      const hasSecuritySchemes = specData.components?.securitySchemes;
      expect(hasSecuritySchemes).toBeDefined();

      // Check for authentication methods
      const securitySchemes = hasSecuritySchemes || {};
      const authMethods = Object.keys(securitySchemes);

      // Should have at least one authentication method
      expect(authMethods.length).toBeGreaterThan(0);

      const validAuthTypes = ['apiKey', 'bearer', 'oauth2', 'openIdConnect'];
      const hasValidAuth = authMethods.some(method => {
        const scheme = securitySchemes[method];
        return validAuthTypes.includes(scheme?.type);
      });

      expect(hasValidAuth).toBe(true);

      console.log(`✅ Security schemes defined: ${authMethods.join(', ')}`);
    });
  });

  test.describe('Input Validation and Sanitization', () => {
    test('Validates required fields', async ({ page }) => {
      console.log('🔒 Testing required field validation');

      // Test user creation endpoint
      const response = await page.request.post(`${API_BASE_URL}/users`, {
        data: {}, // Empty body
        failOnStatusCode: false,
      });

      expect(response.status()).toBe(400);

      const errorBody = await response.json();
      expect(errorBody.errors).toBeDefined();
      expect(Array.isArray(errorBody.errors)).toBe(true);

      console.log('✅ Required field validation working');
    });

    test('Validates data types and formats', async ({ page }) => {
      console.log('🔒 Testing data type validation');

      const invalidUserData = {
        email: 'invalid-email', // Invalid email format
        age: 'not-a-number', // Invalid number
        birthDate: 'invalid-date', // Invalid date format
        phone: '123', // Invalid phone format
      };

      const response = await page.request.post(`${API_BASE_URL}/users`, {
        data: invalidUserData,
        failOnStatusCode: false,
      });

      expect(response.status()).toBe(400);

      const errorBody = await response.json();
      expect(errorBody.errors).toBeDefined();

      console.log('✅ Data type validation working');
    });

    test('Sanitizes HTML and script content', async ({ page }) => {
      console.log('🔒 Testing HTML sanitization');

      const maliciousContent = {
        name: '<script>alert("xss")</script>',
        bio: '<img src=x onerror=alert("xss")>',
        description: '"><script>alert("xss")</script>',
        comment: '<div onclick="alert("xss")">Click me</div>',
      };

      const response = await page.request.post(`${API_BASE_URL}/users/profile`, {
        data: maliciousContent,
        failOnStatusCode: false,
      });

      // Should either accept and sanitize, or reject
      expect([200, 400, 422]).toContain(response.status());

      if (response.status() === 200) {
        const body = await response.json();

        // Check that malicious content is sanitized
        const fieldsToCheck = ['name', 'bio', 'description', 'comment'];
        for (const field of fieldsToCheck) {
          if (body[field]) {
            expect(body[field]).not.toContain('<script>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         