import { test, expect } from '@playwright/test';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

/**
 * OWASP Top 10 A01: Broken Access Control Testing
 *
 * This test suite validates that access controls are properly implemented
 * to prevent unauthorized access to protected resources and functionality.
 *
 * Test Coverage:
 * - Authorization bypass attempts
 * - Role-based access control (RBAC)
 * - Resource ownership validation
 * - API endpoint protection
 * - Multi-tenant data isolation
 * - Admin function protection
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${BASE_URL}/api/v1`;

// Test users with different roles
const testUsers = {
  admin: {
    id: 'admin-user-id',
    email: 'admin@pems.com',
    password: 'AdminPass123!',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'manage_users'],
    tenantId: 'tenant-1',
  },
  user: {
    id: 'regular-user-id',
    email: 'user@pems.com',
    password: 'UserPass123!',
    role: 'user',
    permissions: ['read', 'write'],
    tenantId: 'tenant-1',
  },
  viewer: {
    id: 'viewer-user-id',
    email: 'viewer@pems.com',
    password: 'ViewerPass123!',
    role: 'viewer',
    permissions: ['read'],
    tenantId: 'tenant-1',
  },
  unauthorizedUser: {
    id: 'unauthorized-user-id',
    email: 'unauthorized@other-tenant.com',
    password: 'Unauthorized123!',
    role: 'user',
    permissions: ['read', 'write'],
    tenantId: 'tenant-2', // Different tenant
  },
  anonymous: {
    // No authentication
  },
};

test.describe('OWASP A01: Broken Access Control', () => {
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

  test.describe('Authentication Bypass Attempts', () => {
    test('Prevents access without authentication', async ({ page }) => {
      console.log('🔒 Testing unauthenticated access to protected resources');

      // Test protected endpoints without authentication
      const protectedEndpoints = [
        '/dashboard',
        '/settings/profile',
        '/reports',
        '/admin/users',
        '/api/v1/users/me',
        '/api/v1/tenant/current',
        '/api/v1/admin/stats',
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await page.goto(`${BASE_URL}${endpoint}`);

        // Should redirect to login or return 401/403
        const status = response?.status();
        const url = page.url();

        if (endpoint.startsWith('/api/')) {
          // API endpoints should return 401
          expect([401, 403]).toContain(status || 0);
        } else {
          // Page endpoints should redirect to login
          expect(url).toContain('/auth/login') || expect([401, 403]).toContain(status || 0);
        }

        console.log(`✅ Protected endpoint ${endpoint} properly secured`);
      }
    });

    test('Prevents session token manipulation', async ({ page }) => {
      console.log('🔒 Testing session token manipulation attempts');

      // Test with manipulated session tokens
      const maliciousTokens = [
        'fake-jwt-token',
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'admin-token-123',
        'null',
        'undefined',
      ];

      for (const token of maliciousTokens) {
        await page.addInitScript((authToken) => {
          localStorage.setItem('auth_token', authToken);
        }, token);

        const response = await page.goto(`${BASE_URL}/dashboard`);
        const url = page.url();

        // Should redirect to login or return error
        expect(url).toContain('/auth/login') || expect([401, 403]).toContain(response?.status() || 0);

        console.log(`✅ Malicious token "${token}" properly rejected`);
      }
    });

    test('Prevents privilege escalation through role manipulation', async ({ page }) => {
      console.log('🔒 Testing role manipulation attempts');

      // Set up authenticated session as regular user
      await authenticateUser(page, testUsers.user);

      // Try to manipulate role in localStorage
      await page.addInitScript(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.role = 'admin';
        user.permissions = ['read', 'write', 'delete', 'manage_users'];
        localStorage.setItem('user', JSON.stringify(user));
      });

      // Try to access admin functions
      const adminEndpoints = [
        '/admin/users',
        '/admin/settings',
        '/admin/logs',
        '/api/v1/admin/users',
        '/api/v1/admin/tenants',
      ];

      for (const endpoint of adminEndpoints) {
        const response = await page.goto(`${BASE_URL}${endpoint}`);
        const status = response?.status();

        // Should be denied access
        expect([401, 403, 404]).toContain(status || 0);

        console.log(`✅ Admin endpoint ${endpoint} properly protected from privilege escalation`);
      }
    });
  });

  test.describe('Role-Based Access Control (RBAC)', () => {
    test('Viewer role has read-only access', async ({ page }) => {
      console.log('🔒 Testing viewer role access control');

      await authenticateUser(page, testUsers.viewer);

      // Should be able to access read-only resources
      const readOnlyEndpoints = [
        '/dashboard',
        '/reports',
        '/api/v1/users/me',
        '/api/v1/reports',
      ];

      for (const endpoint of readOnlyEndpoints) {
        const response = await page.goto(`${BASE_URL}${endpoint}`);
        expect([200, 302]).toContain(response?.status() || 0);
        console.log(`✅ Viewer can access read-only endpoint: ${endpoint}`);
      }

      // Should NOT be able to access write operations
      const writeEndpoints = [
        '/settings/profile',
        '/api/v1/users/me', // PUT/POST
        '/api/v1/reports/create',
        '/api/v1/data/create',
      ];

      for (const endpoint of writeEndpoints) {
        // Try POST request to write endpoint
        const response = await page.request.post(`${API_BASE_URL}${endpoint}`, {
          data: { test: 'data' },
        });

        expect([401, 403, 405]).toContain(response.status());
        console.log(`✅ Write endpoint ${endpoint} properly blocked for viewer`);
      }
    });

    test('User role has appropriate access level', async ({ page }) => {
      console.log('🔒 Testing user role access control');

      await authenticateUser(page, testUsers.user);

      // Should be able to access user-level resources
      const userEndpoints = [
        '/dashboard',
        '/settings/profile',
        '/reports',
        '/api/v1/users/me',
        '/api/v1/user-data',
      ];

      for (const endpoint of userEndpoints) {
        const response = await page.goto(`${BASE_URL}${endpoint}`);
        expect([200, 302]).toContain(response?.status() || 0);
        console.log(`✅ User can access: ${endpoint}`);
      }

      // Should NOT be able to access admin functions
      const adminEndpoints = [
        '/admin/users',
        '/admin/settings',
        '/api/v1/admin/users',
        '/api/v1/admin/tenants',
      ];

      for (const endpoint of adminEndpoints) {
        const response = await page.goto(`${BASE_URL}${endpoint}`);
        expect([401, 403, 404]).toContain(response?.status() || 0);
        console.log(`✅ Admin endpoint ${endpoint} properly blocked for user`);
      }
    });

    test('Admin role has full access', async ({ page }) => {
      console.log('🔒 Testing admin role access control');

      await authenticateUser(page, testUsers.admin);

      // Should be able to access all resources
      const adminEndpoints = [
        '/dashboard',
        '/settings/profile',
        '/admin/users',
        '/admin/settings',
        '/api/v1/admin/users',
        '/api/v1/admin/tenants',
        '/api/v1/admin/stats',
      ];

      for (const endpoint of adminEndpoints) {
        const response = await page.goto(`${BASE_URL}${endpoint}`);
        // Admin should have access (200 or redirect to login page if session expired)
        expect([200, 302]).toContain(response?.status() || 0);
        console.log(`✅ Admin can access: ${endpoint}`);
      }
    });
  });

  test.describe('Resource Ownership Validation', () => {
    test('Users cannot access other users\' resources', async ({ page }) => {
      console.log('🔒 Testing resource ownership validation');

      await authenticateUser(page, testUsers.user);

      // Try to access another user's resources
      const otherUserId = 'other-user-id';
      const userResources = [
        `/api/v1/users/${otherUserId}`,
        `/api/v1/users/${otherUserId}/profile`,
        `/api/v1/users/${otherUserId}/settings`,
        `/api/v1/users/${otherUserId}/data`,
      ];

      for (const resource of userResources) {
        const response = await page.request.get(`${BASE_URL}${resource}`);
        expect([401, 403, 404]).toContain(response.status());
        console.log(`✅ User resource ${resource} properly protected`);
      }
    });

    test('Users can only access their own tenant data', async ({ page }) => {
      console.log('🔒 Testing multi-tenant data isolation');

      // Authenticate as user from tenant-1
      await authenticateUser(page, testUsers.user);

      // Try to access data from different tenant
      const otherTenantData = [
        '/api/v1/tenant/tenant-2/users',
        '/api/v1/tenant/tenant-2/reports',
        '/api/v1/tenant/tenant-2/settings',
        '/api/v1/data?tenant=tenant-2',
      ];

      for (const data of otherTenantData) {
        const response = await page.request.get(`${BASE_URL}${data}`);
        expect([401, 403, 404]).toContain(response.status());
        console.log(`✅ Tenant data ${data} properly isolated`);
      }
    });

    test('API endpoints validate resource ownership', async ({ page }) => {
      console.log('🔒 Testing API resource ownership validation');

      await authenticateUser(page, testUsers.user);

      // Try to modify other users' resources
      const maliciousRequests = [
        {
          method: 'PUT',
          url: `${API_BASE_URL}/users/other-user-id/profile`,
          data: { email: 'hacked@example.com' },
        },
        {
          method: 'DELETE',
          url: `${API_BASE_URL}/data/other-user-data-id`,
        },
        {
          method: 'POST',
          url: `${API_BASE_URL}/admin/users/ban`,
          data: { userId: 'other-user-id' },
        },
      ];

      for (const request of maliciousRequests) {
        let response;

        if (request.method === 'PUT') {
          response = await page.request.put(request.url, { data: request.data });
        } else if (request.method === 'DELETE') {
          response = await page.request.delete(request.url);
        } else {
          response = await page.request.post(request.url, { data: request.data });
        }

        expect([401, 403, 404, 405]).toContain(response.status());
        console.log(`✅ Malicious API request properly blocked: ${request.method} ${request.url}`);
      }
    });
  });

  test.describe('API Endpoint Security', () => {
    test('API endpoints require proper authentication headers', async ({ page }) => {
      console.log('🔒 Testing API authentication requirements');

      const apiEndpoints = [
        '/api/v1/users/me',
        '/api/v1/tenant/current',
        '/api/v1/reports',
        '/api/v1/dashboard/stats',
      ];

      for (const endpoint of apiEndpoints) {
        // Request without authentication
        const response = await page.request.get(`${BASE_URL}${endpoint}`);
        expect([401, 403]).toContain(response.status());

        // Request with invalid token
        const invalidAuthResponse = await page.request.get(`${BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': 'Bearer invalid-token',
          },
        });
        expect([401, 403]).toContain(invalidAuthResponse.status());

        console.log(`✅ API endpoint ${endpoint} requires proper authentication`);
      }
    });

    test('API endpoints validate user permissions', async ({ page }) => {
      console.log('🔒 Testing API permission validation');

      // Test as viewer (read-only)
      await authenticateUser(page, testUsers.viewer);

      const writeOperations = [
        { method: 'POST', url: `${API_BASE_URL}/reports`, data: { title: 'Test' } },
        { method: 'PUT', url: `${API_BASE_URL}/users/me/profile`, data: { name: 'Test' } },
        { method: 'DELETE', url: `${API_BASE_URL}/data/123`, data: {} },
      ];

      for (const operation of writeOperations) {
        let response;

        if (operation.method === 'POST') {
          response = await page.request.post(operation.url, { data: operation.data });
        } else if (operation.method === 'PUT') {
          response = await page.request.put(operation.url, { data: operation.data });
        } else if (operation.method === 'DELETE') {
          response = await page.request.delete(operation.url);
        }

        expect([401, 403, 405]).toContain(response.status());
        console.log(`✅ Write operation ${operation.method} ${operation.url} properly blocked for viewer`);
      }
    });

    test('API endpoints prevent parameter pollution', async ({ page }) => {
      console.log('🔒 Testing API parameter pollution prevention');

      await authenticateUser(page, testUsers.user);

      // Try parameter pollution attacks
      const pollutedRequests = [
        `${API_BASE_URL}/users/me?userId=other-user-id`,
        `${API_BASE_URL}/reports?tenantId=other-tenant`,
        `${API_BASE_URL}/data?userId=other-user&userId=my-user`,
        `${API_BASE_URL}/admin/users?role=admin`,
      ];

      for (const url of pollutedRequests) {
        const response = await page.request.get(url);

        // Should return the user's own data or deny access
        if (response.status() === 200) {
          const data = await response.json();
          // Ensure returned data belongs to authenticated user
          if (data.userId) {
            expect(data.userId).toBe(testUsers.user.id);
          }
        } else {
          expect([401, 403, 404]).toContain(response.status());
        }

        console.log(`✅ Parameter pollution attempt blocked: ${url}`);
      }
    });
  });

  test.describe('Indirect Access Control Bypasses', () => {
    test('Prevents direct object reference bypasses', async ({ page }) => {
      console.log('🔒 Testing direct object reference prevention');

      await authenticateUser(page, testUsers.user);

      // Try to access resources by incrementing IDs
      const baseUrls = [
        `${API_BASE_URL}/data/`,
        `${API_BASE_URL}/reports/`,
        `${API_BASE_URL}/documents/`,
      ];

      for (const baseUrl of baseUrls) {
        // Try sequential IDs
        for (let id = 1; id <= 10; id++) {
          const response = await page.request.get(`${baseUrl}${id}`);

          // If successful, verify ownership or deny access
          if (response.status() === 200) {
            const data = await response.json();
            if (data.userId) {
              expect(data.userId).toBe(testUsers.user.id);
            }
          } else {
            expect([401, 403, 404]).toContain(response.status());
          }
        }

        console.log(`✅ Direct object reference attacks blocked for ${baseUrl}`);
      }
    });

    test('Prevents path traversal attacks', async ({ page }) => {
      console.log('🔒 Testing path traversal attack prevention');

      await authenticateUser(page, testUsers.user);

      const pathTraversalAttempts = [
        '/api/v1/users/../../../etc/passwd',
        '/api/v1/admin/..%2f..%2f..%2fetc%2fpasswd',
        '/api/v1/data/..\\..\\..\\windows\\system32\\config\\sam',
        '/api/v1/users/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '/api/v1/data/....//....//....//etc/passwd',
      ];

      for (const path of pathTraversalAttempts) {
        const response = await page.request.get(`${BASE_URL}${path}`);
        expect([400, 401, 403, 404]).toContain(response.status());
        console.log(`✅ Path traversal attempt blocked: ${path}`);
      }
    });

    test('Prevents HTTP method bypasses', async ({ page }) => {
      console.log('🔒 Testing HTTP method bypass prevention');

      await authenticateUser(page, testUsers.user);

      // Try different HTTP methods on endpoints that should be restricted
      const methodBypassAttempts = [
        { method: 'PATCH', url: `${API_BASE_URL}/admin/users` },
        { method: 'OPTIONS', url: `${API_BASE_URL}/admin/users` },
        { method: 'HEAD', url: `${API_BASE_URL}/admin/users` },
        { method: 'TRACE', url: `${API_BASE_URL}/admin/users` },
      ];

      for (const attempt of methodBypassAttempts) {
        let response;

        if (attempt.method === 'PATCH') {
          response = await page.request.patch(attempt.url, { data: {} });
        } else if (attempt.method === 'OPTIONS') {
          response = await page.request.fetch(attempt.url, { method: 'OPTIONS' });
        } else if (attempt.method === 'HEAD') {
          response = await page.request.fetch(attempt.url, { method: 'HEAD' });
        } else {
          response = await page.request.fetch(attempt.url, { method: attempt.method });
        }

        expect([401, 403, 404, 405]).toContain(response.status());
        console.log(`✅ HTTP method bypass blocked: ${attempt.method} ${attempt.url}`);
      }
    });
  });
});

/**
 * Helper function to authenticate a user
 */
async function authenticateUser(page: Page, user: any) {
  // Simulate authentication by setting up session
  await page.addInitScript((userData) => {
    localStorage.setItem('auth_token', 'test-token-' + userData.id);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('user_id', userData.id);
    localStorage.setItem('user_role', userData.role);
    localStorage.setItem('tenant_id', userData.tenantId);
  }, user);

  // Alternatively, go through login flow
  await page.goto(`${BASE_URL}/auth/login`);
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');

  // Wait for login to complete
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

export { testUsers };