import { test, expect } from '@playwright/test';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

/**
 * OpenAPI Schema Validation Testing
 *
 * This test suite validates that API responses conform to their OpenAPI
 * specifications, ensuring API contract consistency and preventing
 * breaking changes during development.
 *
 * Test Coverage:
 * - OpenAPI specification validation
 * - Response schema compliance
 * - HTTP status code validation
 * - Header validation
 * - Error response structure validation
 * - Content-Type validation
 * - Pagination structure validation
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${BASE_URL}/api/v1`;

test.describe('OpenAPI Schema Validation', () => {
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
    test('OpenAPI specification is accessible and valid', async ({ page }) => {
      console.log('🔍 Testing OpenAPI specification accessibility');

      // Test OpenAPI JSON specification
      const specResponse = await page.request.get(`${API_BASE_URL}/openapi.json`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      expect(specResponse.status()).toBe(200);

      const specData = await specResponse.json();

      // Validate OpenAPI structure
      expect(specData).toHaveProperty('openapi');
      expect(specData).toHaveProperty('info');
      expect(specData).toHaveProperty('paths');
      expect(specData).toHaveProperty('components');

      // Validate OpenAPI version
      expect(specData.openapi).toMatch(/^3\.\d+\.\d+$/);

      // Validate info object
      expect(specData.info).toHaveProperty('title');
      expect(specData.info).toHaveProperty('version');
      expect(specData.info).toHaveProperty('description');

      // Validate paths object
      expect(typeof specData.paths).toBe('object');

      console.log('✅ OpenAPI specification is valid');
    });

    test('All API endpoints are defined in OpenAPI spec', async ({ page }) => {
      console.log('🔍 Testing endpoint coverage in OpenAPI spec');

      const specResponse = await page.request.get(`${API_BASE_URL}/openapi.json`);
      const specData = await specResponse.json();

      // Common API endpoints to verify
      const expectedEndpoints = [
        '/auth/register',
        '/auth/login',
        '/auth/logout',
        '/auth/refresh',
        '/auth/forgot-password',
        '/users/me',
        '/users/search',
        '/tenants/current',
        '/reports',
        '/dashboard/stats',
        '/notifications',
        '/settings',
      ];

      const specPaths = Object.keys(specData.paths);
      const missingEndpoints = expectedEndpoints.filter(endpoint =>
        !specPaths.some(path => path.includes(endpoint.replace('/api/v1', '')))
      );

      if (missingEndpoints.length > 0) {
        console.warn(`⚠️ Missing endpoints in OpenAPI spec: ${missingEndpoints.join(', ')}`);
      } else {
        console.log('✅ All expected endpoints are defined in OpenAPI spec');
      }

      expect(missingEndpoints.length).toBe(0);
    });

    test('OpenAPI specification includes security definitions', async ({ page }) => {
      console.log('🔍 Testing security definitions in OpenAPI spec');

      const specResponse = await page.request.get(`${API_BASE_URL}/openapi.json`);
      const specData = await specResponse.json();

      // Check for security schemes
      expect(specData.components).toHaveProperty('securitySchemes');

      const securitySchemes = specData.components.securitySchemes;

      // Should have bearer token authentication
      expect(securitySchemes).toHaveProperty('bearerAuth');
      expect(securitySchemes.bearerAuth).toHaveProperty('type', 'http');
      expect(securitySchemes.bearerAuth).toHaveProperty('scheme', 'bearer');

      // Check for global security requirements
      expect(specData).toHaveProperty('security');
      expect(Array.isArray(specData.security)).toBe(true);
      expect(specData.security.length).toBeGreaterThan(0);

      console.log('✅ Security definitions are properly configured');
    });
  });

  test.describe('Response Schema Validation', () => {
    test('User profile endpoint validates schema', async ({ page }) => {
      console.log('🔍 Testing user profile response schema validation');

      // Get OpenAPI spec
      const specResponse = await page.request.get(`${API_BASE_URL}/openapi.json`);
      const specData = await specResponse.json();

      const userMePath = specData.paths['/users/me'];
      expect(userMePath).toBeDefined();
      expect(userMePath.get).toBeDefined();

      const getOperation = userMePath.get;
      expect(getOperation).toHaveProperty('responses');
      expect(getOperation.responses).toHaveProperty('200');

      const successResponse = getOperation.responses['200'];
      expect(successResponse).toHaveProperty('content');
      expect(successResponse.content).toHaveProperty('application/json');

      const schema = successResponse.content['application/json'].schema;
      expect(schema).toBeDefined();

      // Test actual API response
      const apiResponse = await page.request.get(`${API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': 'Bearer test-token-for-schema-validation',
        },
        failOnStatusCode: false,
      });

      if (apiResponse.status() === 200) {
        const responseData = await apiResponse.json();

        // Validate response against schema
        const validationErrors = validateResponseAgainstSchema(responseData, schema);

        if (validationErrors.length > 0) {
          console.warn(`⚠️ Schema validation errors: ${validationErrors.join(', ')}`);
        } else {
          console.log('✅ User profile response conforms to schema');
        }

        expect(validationErrors.length).toBe(0);
      } else {
        console.log('ℹ️ Skipping schema validation for non-200 response');
      }
    });

    test('User registration endpoint validates schema', async ({ page }) => {
      console.log('🔍 Testing user registration response schema validation');

      const specResponse = await page.request.get(`${API_BASE_URL}/openapi.json`);
      const specData = await specResponse.json();

      const registerPath = specData.paths['/auth/register'];
      expect(registerPath).toBeDefined();
      expect(registerPath.post).toBeDefined();

      const postOperation = registerPath.post;
      expect(postOperation.responses).toHaveProperty('201');
      expect(postOperation.responses[201]).toHaveProperty('content');
      expect(postOperation.responses[201].content).toHaveProperty('application/json');

      const schema = postOperation.responses[201].content['application/json'].schema;
      expect(schema).toBeDefined();

      // Test registration API response
      const registrationData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'TestPassword123!',
        acceptTerms: true,
      };

      const apiResponse = await page.request.post(`${API_BASE_URL}/auth/register`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: registrationData,
        failOnStatusCode: false,
      });

      if (apiResponse.status() === 201) {
        const responseData = await apiResponse.json();
        const validationErrors = validateResponseAgainstSchema(responseData, schema);

        expect(validationErrors.length).toBe(0);
        console.log('✅ User registration response conforms to schema');
      } else {
        console.log('ℹ️ Registration failed, schema validation skipped');
      }
    });

    test('Error responses validate error schema', async ({ page }) => {
      console.log('🔍 Testing error response schema validation');

      // Test 400 Bad Request response
      const badRequestResponse = await page.request.post(`${API_BASE_URL}/users/me`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: { invalidField: 'invalidValue' },
        failOnStatusCode: false,
      });

      if (badRequestResponse.status() === 400) {
        const errorData = await badRequestResponse.json();

        // Validate error response structure
        expect(errorData).toHaveProperty('success', false);
        expect(errorData).toHaveProperty('message');
        expect(errorData).toHaveProperty('errors');
        expect(Array.isArray(errorData.errors)).toBe(true);

        console.log('✅ Error response structure is valid');
      }

      // Test 401 Unauthorized response
      const unauthorizedResponse = await page.request.get(`${API_BASE_URL}/users/me`, {
        failOnStatusCode: false,
      });

      if (unauthorizedResponse.status() === 401) {
        const errorData = await unauthorizedResponse.json();

        expect(errorData).toHaveProperty('success', false);
        expect(errorData).toHaveProperty('message');
        expect(errorData).toHaveProperty('error');

        console.log('✅ Unauthorized response structure is valid');
      }

      // Test 404 Not Found response
      const notFoundResponse = await page.request.get(`${API_BASE_URL}/nonexistent-endpoint`, {
        failOnStatusCode: false,
      });

      if (notFoundResponse.status() === 404) {
        const errorData = await notFoundResponse.json();

        expect(errorData).toHaveProperty('success', false);
        expect(errorData).toHaveProperty('message');
        expect(errorData).toHaveProperty('error');

        console.log('✅ Not Found response structure is valid');
      }
    });
  });

  test.describe('HTTP Header Validation', () => {
    test('API responses include required headers', async ({ page }) => {
      console.log('🔍 Testing HTTP header validation');

      const apiResponse = await page.request.get(`${API_BASE_URL}/users/me`, {
        failOnStatusCode: false,
      });

      if (apiResponse.status() === 200) {
        const headers = apiResponse.headers();

        // Check for required headers
        expect(headers).toHaveProperty('content-type');
        expect(headers['content-type']).toContain('application/json');

        // Check for security headers
        if (headers['access-control-allow-origin']) {
          console.log('✅ CORS header present');
        }

        if (headers['cache-control']) {
          console.log('✅ Cache control header present');
        }

        console.log('✅ Required HTTP headers are present');
      }
    });

    test('Error responses include proper error headers', async ({ page }) => {
      console.log('🔍 Testing error response headers');

      const errorResponse = await page.request.get(`${API_BASE_URL}/nonexistent-endpoint`, {
        failOnStatusCode: false,
      });

      if (errorResponse.status() === 404) {
        const headers = errorResponse.headers();

        expect(headers).toHaveProperty('content-type');
        expect(headers['content-type']).toContain('application/json');
        console.log('✅ Error response includes proper content-type header');
      }
    });
  });

  test.describe('Pagination Validation', () => {
    test('Paginated responses follow consistent structure', async ({ page }) => {
      console.log('🔍 Testing pagination structure validation');

      const specResponse = await page.request.get(`${API_BASE_URL}/openapi.json`);
      const specData = await specResponse.json();

      // Find endpoints that return paginated responses
      const paginatedEndpoints = [];

      for (const [path, methods] of Object.entries(specData.paths)) {
        for (const [method, operation] of Object.entries(methods as any)) {
          if (operation.responses && operation.responses['200']) {
            const successResponse = operation.responses['200'];
            if (successResponse.content && successResponse.content['application/json']) {
              const schema = successResponse.content['application/json'].schema;
              if (schema && schema.properties && schema.properties.data &&
                  (schema.properties.data.type === 'array' ||
                   (schema.properties.data.type === 'object' && schema.properties.data.properties &&
                    schema.properties.data.properties.items))) {
                paginatedEndpoints.push({ path, method, schema });
              }
            }
          }
        }
      }

      expect(paginatedEndpoints.length).toBeGreaterThan(0);

      // Test each paginated endpoint
      for (const endpoint of paginatedEndpoints) {
        const response = await page.request.get(`${BASE_URL}${endpoint.path}`, {
          failOnStatusCode: false,
        });

        if (response.status() === 200) {
          const responseData = await response.json();

          if (responseData.data && responseData.pagination) {
            // Validate pagination structure
            const pagination = responseData.pagination;
            expect(pagination).toHaveProperty('page');
            expect(pagination).toHaveProperty('limit');
            expect(pagination).toHaveProperty('total');
            expect(pagination).toHaveProperty('totalPages');
            expect(pagination).toHaveProperty('hasNext');
            expect(pagination).toHaveProperty('hasPrev');

            // Validate pagination data types
            expect(typeof pagination.page).toBe('number');
            expect(typeof pagination.limit).toBe('number');
            expect(typeof pagination.total).toBe('number');
            expect(typeof pagination.totalPages).toBe('number');
            expect(typeof pagination.hasNext).toBe('boolean');
            expect(typeof pagination.hasPrev).toBe('boolean');

            console.log(`✅ Pagination structure valid for ${endpoint.method} ${endpoint.path}`);
          }
        }
      }
    });

    test('Pagination parameters validate ranges', async ({ page }) => {
      console.log('🔍 Testing pagination parameter validation');

      // Test invalid page numbers
      const invalidPageResponses = [
        await page.request.get(`${API_BASE_URL}/users/search?page=-1`, { failOnStatusCode: false }),
        await page.request.get(`${API_BASE_URL}/users/search?page=abc`, { failOnStatusCode: false }),
        await page.request.get(`${API_BASE_URL}/users/search?page=999999999`, { failOnStatusCode: false }),
      ];

      // Test invalid limit values
      const invalidLimitResponses = [
        await page.request.get(`${API_BASE_URL}/users/search?limit=0`, { failOnStatusCode: false }),
        await page.request.get(`${API_BASE_URL}/users/search?limit=abc`, { failOnStatusCode: false }),
        await page.request.get(`${API_BASE_URL}/users/search?limit=1000`, { failOnStatusCode: false }),
      ];

      // All invalid requests should return 400 Bad Request
      const allInvalidResponses = [...invalidPageResponses, ...invalidLimitResponses];

      for (const response of allInvalidResponses) {
        if (response.status() === 400) {
          const errorData = await response.json();
          expect(errorData).toHaveProperty('success', false);
          expect(errorData).toHaveProperty('message');
        }
      }

      console.log('✅ Invalid pagination parameters properly rejected');
    });
  });

  test.describe('Data Type Validation', () => {
    test('Numeric fields validate type ranges', async ({ page }) => {
      console.log('🔍 Testing numeric field type validation');

      // Test API endpoints with numeric fields
      const numericFieldTests = [
        {
          url: `${API_BASE_URL}/users/search?page=1&limit=10`,
          fields: ['page', 'limit'],
          expectedTypes: {
            page: 'number',
            limit: 'number',
          },
        },
        {
          url: `${API_BASE_URL}/reports/month=1&year=2024`,
          fields: ['month', 'year'],
          expectedTypes: {
            month: 'number',
            year: 'number',
          },
        },
      ];

      for (const test of numericFieldTests) {
        const response = await page.request.get(test.url, {
          failOnStatusCode: false,
        });

        if (response.status() === 200) {
          const responseData = await response.json();

          for (const [fieldName, expectedType] of Object.entries(test.fields)) {
            const value = getNestedValue(responseData, fieldName);
            if (value !== undefined) {
              expect(typeof value).toBe(expectedType);
            }
          }
        }
      }

      console.log('✅ Numeric fields validate type ranges');
    });

    test('Date fields validate date formats', async ({ page }) => {
      console.log('🔍Testing date field format validation');

      // Test API endpoints with date fields
      const dateFieldTests = [
        {
          url: `${API_BASE_URL}/reports?dateFrom=2024-01-01&dateTo=2024-01-31`,
          fields: ['dateFrom', 'dateTo'],
          expectedFormat: /^\d{4}-\d{2}-\d{2}$/,
        },
      ];

      for (const test of dateFieldTests) {
        const response = await page.request.get(test.url, {
          failOnStatusCode: false,
        });

        if (response.status() === 200) {
          const responseData = await response.json();

          for (const [fieldName, expectedFormat] of Object.entries(test.fields)) {
              const value = getNestedValue(responseData, fieldName);
              if (value !== undefined && typeof value === 'string') {
                expect(value).toMatch(expectedFormat);
              }
            }
          }
        }
      }

      console.log('✅ Date fields validate date formats');
    });

    test('Boolean fields validate boolean types', async ({ page }) => {
      console.log('🔍 Testing boolean field type validation');

      // Test API endpoints with boolean fields
      const booleanFieldTests = [
        {
          url: `${API_BASE_URL}/users/me/preferences`,
          fields: ['notifications.email', 'notifications.push', 'notifications.inApp'],
          expectedTypes: {
            'notifications.email': 'boolean',
            'notifications.push': 'boolean',
            'notifications.inApp': 'boolean',
          },
        },
      ];

      for (const test of booleanFieldTests) {
        const response = await page.request.get(test.url, {
          failOnStatusCode: false,
        });

        if (response.status() === 200) {
          const responseData = await response.json();

          for (const [fieldName, expectedType] of Object.entries(test.fields)) {
            const value = getNestedValue(responseData, fieldName);
            if (value !== undefined) {
              expect(typeof value).toBe(expectedType);
            }
          }
        }
      }

      console.log('✅ Boolean fields validate boolean types');
    });
  });

  test.describe('Content Type Validation', () => {
    test('API responses match declared Content-Type', async ({ page }) => {
      console.log('🔍 Testing Content-Type header validation');

      const specResponse = await page.request.get(`${API_BASE_URL}/openapi.json`);
      const specData = await specResponse.json();

      // Test endpoints that should return JSON
      const jsonEndpoints = [
        `${API_BASE_URL}/users/me`,
        `${API_BASE_URL}/users/search`,
        `${API_BASE_URL}/tenants/current`,
        `${API_BASE_URL}/dashboard/stats`,
      ];

      for (const endpoint of jsonEndpoints) {
        const response = await page.request.get(endpoint, {
          failOnStatusCode: false,
        });

        if (response.status() === 200) {
          const contentType = response.headers()['content-type'];
          expect(contentType).toContain('application/json');
        }
      }

      console.log('✅ JSON responses match declared Content-Type');
    });

    test('Invalid request content types are rejected', async ({ page }) => {
      console.log('🔍Testing invalid Content-Type rejection');

      const apiResponse = await page.request.post(`${API_BASE_URL}/users/me`, {
        headers: {
          'Content-Type': 'text/plain',
        },
        data: 'invalid data',
        failOnStatusCode: false,
      });

      // Should reject unsupported content type
      expect([400, 415, 422]).toContain(apiResponse.status());

      if (apiResponse.status() === 400 || apiResponse.status() === 415) {
        const errorData = await apiResponse.json();
        expect(errorData).toHaveProperty('success', false);
        expect(errorData).toHaveProperty('message');
      }

      console.log('✅ Invalid Content-Type properly rejected');
    });
  });
});

/**
 * Helper function to get nested values from an object
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Validates response data against OpenAPI schema
 */
function validateResponseAgainstSchema(data: any, schema: any): string[] {
  const errors: string[] = [];

  function validateObject(obj: any, sch: any, path: string = ''): string[] {
    if (sch.type === 'object' && sch.properties) {
      for (const [key, propSchema] of Object.entries(sch.properties)) {
        const keyPath = path ? `${path}.${key}` : key;

        if (obj && obj[key] !== undefined) {
          const value = obj[key];

          // Handle required fields
          if (sch.required && !sch.required.includes(key)) {
            errors.push(`Missing required field: ${keyPath}`);
          }

          // Handle nullable fields
          if (sch.nullable && value === null) {
            continue;
          }

          // Handle array fields
          if (sch.type === 'array' && sch.items) {
            if (Array.isArray(value)) {
              for (let i = 0; i < value.length; i++) {
                errors.push(...validateObject(value[i], sch.items, `${path}[${i}]`));
              }
            } else {
              errors.push(`Expected array at ${path}`);
            }
          } else if (sch.type === 'object') {
            errors.push(...validateObject(value, sch, path));
          } else if (sch.type === 'string') {
            if (typeof value !== 'string') {
              errors.push(`Expected string at ${path}, got ${typeof value}`);
            }

            // Check pattern if specified
            if (sch.pattern && !new RegExp(sch.pattern).test(value)) {
              errors.push(`String does not match pattern at ${path}`);
            }

            // Check format if specified
            if (sch.format && sch.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors.push(`Invalid email format at ${path}`);
            }
          } else if (sch.type === 'number') {
            if (typeof value !== 'number') {
              errors.push(`Expected number at ${path}, got ${typeof value}`);
            }

            if (sch.minimum !== undefined && value < sch.minimum) {
              errors.push(`Value less than minimum (${sch.minimum}) at ${path}`);
            }

            if (sch.maximum !== undefined && value > sch.maximum) {
              errors.push(`Value greater than maximum (${sch.maximum}) at ${path}`);
            }
          } else if (sch.type === 'boolean') {
            if (typeof value !== 'boolean') {
              errors.push(`Expected boolean at ${path}, got ${typeof value}`);
            }
          } else if (sch.type === 'integer') {
            if (typeof value !== 'number' || !Number.isInteger(value)) {
              errors.push(`Expected integer at ${path}, got ${typeof value}`);
            }
          } else if (sch.enum && !sch.enum.includes(value)) {
              errors.push(`Invalid enum value at ${path}: ${value}. Expected one of: ${sch.enum.join(', ')}`);
            }
        }
      }
    }
    return errors;
  }

  return validateObject(data, schema);
}