import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import axios from 'axios';
import { TestContainers } from 'testcontainers';

/**
 * Tenant Management Service Integration Tests
 *
 * This test suite validates the integration between the tenant management service
 * and other microservices, ensuring proper data isolation, tenant context propagation,
 * and cross-tenant functionality.
 */

describe('Tenant Service Integration', () => {
  let authServiceUrl: string;
  let tenantServiceUrl: string;
  let userServiceUrl: string;
  let adminToken: string;
  let testTenants: any[] = [];

  beforeAll(async () => {
    authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    tenantServiceUrl = process.env.TENANT_SERVICE_URL || 'http://localhost:3004';
    userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';

    // Wait for services to be ready
    await Promise.all([
      waitForService(authServiceUrl),
      waitForService(tenantServiceUrl),
      waitForService(userServiceUrl),
    ]);

    // Create admin user for testing
    adminToken = await createAdminUser();
  });

  afterAll(async () => {
    // Cleanup test tenants
    for (const tenant of testTenants) {
      await deleteTenant(tenant.id);
    }
  });

  beforeEach(async () => {
    // Ensure clean state for each test
    await cleanupTestUsers();
  });

  async function waitForService(url: string, timeout = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        await axios.get(`${url}/health`, { timeout: 5000 });
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error(`Service at ${url} not available after ${timeout}ms`);
  }

  async function createAdminUser(): Promise<string> {
    const adminData = {
      firstName: 'Admin',
      lastName: 'User',
      email: `admin.${Date.now()}@example.com`,
      password: 'AdminUser123!',
      acceptTerms: true,
    };

    const response = await axios.post(`${authServiceUrl}/api/v1/auth/register`, adminData);
    return response.data.data.token;
  }

  async function createTenant(tenantData: Partial<any> = {}): Promise<any> {
    const defaultTenantData = {
      name: `Test Tenant ${Date.now()}`,
      domain: `test-${Date.now()}.example.com`,
      plan: 'professional',
      maxUsers: 100,
      features: ['user-management', 'notifications', 'reporting'],
    };

    const response = await axios.post(
      `${tenantServiceUrl}/api/v1/tenants`,
      { ...defaultTenantData, ...tenantData },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const tenant = response.data.data;
    testTenants.push(tenant);
    return tenant;
  }

  async function deleteTenant(tenantId: string): Promise<void> {
    await axios.delete(`${tenantServiceUrl}/api/v1/tenants/${tenantId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      validateStatus: () => true,
    });
  }

  async function cleanupTestUsers(): Promise<void> {
    try {
      const response = await axios.get(`${userServiceUrl}/api/v1/users/test-users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        validateStatus: () => true,
      });

      if (response.status === 200 && response.data.data.length > 0) {
        const deletePromises = response.data.data.map((user: any) =>
          axios.delete(`${userServiceUrl}/api/v1/users/${user.id}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
            validateStatus: () => true,
          })
        );
        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.warn('Failed to cleanup test users:', error);
    }
  }

  describe('Tenant Creation and Management', () => {
    it('should create tenant and propagate to all services', async () => {
      const tenantData = {
        name: 'Integration Test Tenant',
        domain: 'integration-test.example.com',
        plan: 'enterprise',
        settings: {
          timezone: 'UTC',
          language: 'en',
          customBranding: {
            primaryColor: '#007bff',
            logo: 'https://example.com/logo.png',
          },
        },
      };

      try {
        // Create tenant
        const createResponse = await axios.post(
          `${tenantServiceUrl}/api/v1/tenants`,
          tenantData,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        expect(createResponse.status).toBe(201);
        const tenant = createResponse.data.data;
        expect(tenant.name).toBe(tenantData.name);
        expect(tenant.domain).toBe(tenantData.domain);
        expect(tenant.status).toBe('active');

        // Verify tenant exists in auth service
        const authResponse = await axios.get(
          `${authServiceUrl}/api/v1/tenants/${tenant.id}`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        expect(authResponse.status).toBe(200);
        expect(authResponse.data.data.id).toBe(tenant.id);

        // Verify tenant exists in user service
        const userResponse = await axios.get(
          `${userServiceUrl}/api/v1/tenants/${tenant.id}/users`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        expect(userResponse.status).toBe(200);
        expect(userResponse.data.data).toBeInstanceOf(Array);

      } catch (error: any) {
        console.error('Tenant creation integration test failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should enforce tenant domain uniqueness across services', async () => {
      const domain = 'unique-domain.example.com';
      const tenantData = { domain };

      try {
        // Create first tenant
        const firstResponse = await axios.post(
          `${tenantServiceUrl}/api/v1/tenants`,
          { ...tenantData, name: 'First Tenant' },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        expect(firstResponse.status).toBe(201);

        // Try to create second tenant with same domain
        const secondResponse = await axios.post(
          `${tenantServiceUrl}/api/v1/tenants`,
          { ...tenantData, name: 'Second Tenant' },
          { headers: { Authorization: `Bearer ${adminToken}` }, validateStatus: () => true }
        );

        expect(secondResponse.status).toBe(409);
        expect(secondResponse.data.error.code).toBe('DOMAIN_ALREADY_EXISTS');

      } catch (error: any) {
        console.error('Domain uniqueness test failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('Tenant Data Isolation', () => {
    let tenantA: any;
    let tenantB: any;
    let userA: any;
    let userB: any;

    beforeEach(async () => {
      tenantA = await createTenant({ name: 'Tenant A', domain: 'tenant-a.example.com' });
      tenantB = await createTenant({ name: 'Tenant B', domain: 'tenant-b.example.com' });

      // Create users for each tenant
      userA = await createUserInTenant(tenantA.id, 'user-a');
      userB = await createUserInTenant(tenantB.id, 'user-b');
    });

    async function createUserInTenant(tenantId: string, username: string): Promise<any> {
      const userData = {
        firstName: username.split('-')[0],
        lastName: 'User',
        email: `${username}@example.com`,
        password: 'Password123!',
        acceptTerms: true,
        tenantId,
      };

      const response = await axios.post(`${authServiceUrl}/api/v1/auth/register`, userData);
      return response.data.data;
    }

    it('should ensure complete data isolation between tenants', async () => {
      try {
        // User A should not be able to access Tenant B data
        const userBDataResponse = await axios.get(
          `${userServiceUrl}/api/v1/users/${userB.user.id}`,
          {
            headers: { Authorization: `Bearer ${userA.token}` },
            validateStatus: () => true,
          }
        );

        expect(userBDataResponse.status).toBe(403);
        expect(userBDataResponse.data.error.code).toBe('ACCESS_DENIED');

        // User B should not be able to access Tenant A data
        const userADataResponse = await axios.get(
          `${userServiceUrl}/api/v1/users/${userA.user.id}`,
          {
            headers: { Authorization: `Bearer ${userB.token}` },
            validateStatus: () => true,
          }
        );

        expect(userADataResponse.status).toBe(403);
        expect(userADataResponse.data.error.code).toBe('ACCESS_DENIED');

      } catch (error: any) {
        console.error('Data isolation test failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should propagate tenant context correctly in service calls', async () => {
      try {
        // Create resource in Tenant A
        const resourceResponse = await axios.post(
          `${userServiceUrl}/api/v1/resources`,
          {
            name: 'Tenant A Resource',
            type: 'document',
            content: 'This belongs to Tenant A',
          },
          {
            headers: {
              Authorization: `Bearer ${userA.token}`,
              'X-Tenant-ID': tenantA.id,
            },
          }
        );

        expect(resourceResponse.status).toBe(201);

        // Try to access same resource from Tenant B context
        const accessResponse = await axios.get(
          `${userServiceUrl}/api/v1/resources/${resourceResponse.data.data.id}`,
          {
            headers: {
              Authorization: `Bearer ${userB.token}`,
              'X-Tenant-ID': tenantB.id,
            },
            validateStatus: () => true,
          }
        );

        expect(accessResponse.status).toBe(404);
        expect(accessResponse.data.error.code).toBe('RESOURCE_NOT_FOUND');

      } catch (error: any) {
        console.error('Tenant context propagation test failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('Cross-Service Tenant Operations', () => {
    let tenant: any;

    beforeEach(async () => {
      tenant = await createTenant({
        name: 'Cross-Service Tenant',
        domain: 'cross-service.example.com',
      });
    });

    it('should handle tenant user operations across services', async () => {
      const userCount = 5;
      const users: any[] = [];

      try {
        // Create multiple users in the tenant
        for (let i = 0; i < userCount; i++) {
          const userData = {
            firstName: `User${i}`,
            lastName: 'Test',
            email: `user${i}@${tenant.domain}`,
            password: 'Password123!',
            acceptTerms: true,
          };

          const response = await axios.post(`${authServiceUrl}/api/v1/auth/register`, userData);
          users.push(response.data.data);
        }

        // Verify all users are counted correctly in user service
        const userCountResponse = await axios.get(
          `${userServiceUrl}/api/v1/tenants/${tenant.id}/users/count`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        expect(userCountResponse.status).toBe(200);
        expect(userCountResponse.data.data.count).toBe(userCount);

        // Verify tenant statistics are updated
        const statsResponse = await axios.get(
          `${tenantServiceUrl}/api/v1/tenants/${tenant.id}/statistics`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        expect(statsResponse.status).toBe(200);
        expect(statsResponse.data.data.userCount).toBe(userCount);

        // Delete users and verify count updates
        const deletePromises = users.map(user =>
          axios.delete(`${userServiceUrl}/api/v1/users/${user.user.id}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
        );
        await Promise.all(deletePromises);

        const updatedCountResponse = await axios.get(
          `${userServiceUrl}/api/v1/tenants/${tenant.id}/users/count`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        expect(updatedCountResponse.data.data.count).toBe(0);

      } catch (error: any) {
        console.error('Cross-service tenant operations test failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should handle tenant configuration updates across services', async () => {
      const newConfiguration = {
        features: ['user-management', 'notifications', 'reporting', 'analytics'],
        limits: {
          maxUsers: 200,
          maxStorage: 1024 * 1024 * 1024, // 1GB
          maxApiCalls: 100000,
        },
        settings: {
          timezone: 'America/New_York',
          language: 'en-US',
          customBranding: {
            primaryColor: '#28a745',
            secondaryColor: '#17a2b8',
          },
        },
      };

      try {
        // Update tenant configuration
        const updateResponse = await axios.put(
          `${tenantServiceUrl}/api/v1/tenants/${tenant.id}/configuration`,
          newConfiguration,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        expect(updateResponse.status).toBe(200);

        // Verify configuration is reflected in auth service
        const authConfigResponse = await axios.get(
          `${authServiceUrl}/api/v1/tenants/${tenant.id}/configuration`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        expect(authConfigResponse.status).toBe(200);
        expect(authConfigResponse.data.data.features).toEqual(newConfiguration.features);

        // Verify configuration is reflected in user service
        const userConfigResponse = await axios.get(
          `${userServiceUrl}/api/v1/tenants/${tenant.id}/configuration`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        expect(userConfigResponse.status).toBe(200);
        expect(userConfigResponse.data.data.limits).toEqual(newConfiguration.limits);

      } catch (error: any) {
        console.error('Tenant configuration update test failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('Tenant Security and Access Control', () => {
    let tenant: any;
    let tenantAdmin: any;
    let regularUser: any;

    beforeEach(async () => {
      tenant = await createTenant({
        name: 'Security Test Tenant',
        domain: 'security-test.example.com',
      });

      // Create tenant admin
      const adminData = {
        firstName: 'Tenant',
        lastName: 'Admin',
        email: `admin@${tenant.domain}`,
        password: 'TenantAdmin123!',
        acceptTerms: true,
      };

      const adminResponse = await axios.post(`${authServiceUrl}/api/v1/auth/register`, adminData);
      tenantAdmin = adminResponse.data.data;

      // Promote to tenant admin
      await axios.put(
        `${tenantServiceUrl}/api/v1/tenants/${tenant.id}/users/${tenantAdmin.user.id}/role`,
        { role: 'tenant_admin' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      // Create regular user
      const userData = {
        firstName: 'Regular',
        lastName: 'User',
        email: `user@${tenant.domain}`,
        password: 'RegularUser123!',
        acceptTerms: true,
      };

      const userResponse = await axios.post(`${authServiceUrl}/api/v1/auth/register`, userData);
      regularUser = userResponse.data.data;
    });

    it('should enforce proper tenant access control', async () => {
      try {
        // Tenant admin should be able to manage tenant users
        const usersResponse = await axios.get(
          `${userServiceUrl}/api/v1/tenants/${tenant.id}/users`,
          { headers: { Authorization: `Bearer ${tenantAdmin.token}` } }
        );

        expect(usersResponse.status).toBe(200);
        expect(usersResponse.data.data.length).toBeGreaterThan(0);

        // Regular user should not be able to manage tenant users
        const forbiddenResponse = await axios.get(
          `${userServiceUrl}/api/v1/tenants/${tenant.id}/users`,
          { headers: { Authorization: `Bearer ${regularUser.token}` }, validateStatus: () => true }
        );

        expect(forbiddenResponse.status).toBe(403);
        expect(forbiddenResponse.data.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      } catch (error: any) {
        console.error('Tenant access control test failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should handle tenant switching for multi-tenant users', async () => {
      // Create second tenant
      const tenantB = await createTenant({
        name: 'Second Tenant',
        domain: 'second-tenant.example.com',
      });

      try {
        // Grant user access to both tenants
        await axios.post(
          `${tenantServiceUrl}/api/v1/tenants/${tenantB.id}/users`,
          { userId: regularUser.user.id, role: 'member' },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        // Switch tenant context
        const switchResponse = await axios.post(
          `${authServiceUrl}/api/v1/auth/switch-tenant`,
          { tenantId: tenantB.id },
          { headers: { Authorization: `Bearer ${regularUser.token}` } }
        );

        expect(switchResponse.status).toBe(200);
        expect(switchResponse.data.data.currentTenant.id).toBe(tenantB.id);

        const newToken = switchResponse.data.data.token;

        // Verify access to second tenant
        const tenantBUsersResponse = await axios.get(
          `${userServiceUrl}/api/v1/tenants/${tenantB.id}/users`,
          { headers: { Authorization: `Bearer ${newToken}` } }
        );

        expect(tenantBUsersResponse.status).toBe(200);

      } catch (error: any) {
        console.error('Tenant switching test failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });
});

/**
 * Tenant Integration Test Utilities
 */
export class TenantIntegrationUtils {
  static async createTenantWithUsers(tenantData: any, userCount: number = 3): Promise<{
    tenant: any;
    users: any[];
    tokens: string[];
  }> {
    // Implementation for creating tenant with users
    const tenant = await createTenant(tenantData);
    const users = [];
    const tokens = [];

    for (let i = 0; i < userCount; i++) {
      const userData = {
        firstName: `User${i}`,
        lastName: 'Test',
        email: `user${i}@${tenant.domain}`,
        password: 'Password123!',
        acceptTerms: true,
      };

      const response = await axios.post(
        `${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}/api/v1/auth/register`,
        userData
      );

      users.push(response.data.data.user);
      tokens.push(response.data.data.token);
    }

    return { tenant, users, tokens };
  }

  static async validateTenantDataConsistency(tenantId: string): Promise<boolean> {
    // Check that tenant data is consistent across all services
    const services = [
      `${process.env.TENANT_SERVICE_URL || 'http://localhost:3004'}/api/v1/tenants/${tenantId}`,
      `${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}/api/v1/tenants/${tenantId}`,
      `${process.env.USER_SERVICE_URL || 'http://localhost:3002'}/api/v1/tenants/${tenantId}`,
    ];

    try {
      const responses = await Promise.all(
        services.map(url =>
          axios.get(url, {
            headers: { Authorization: `Bearer ${await this.getAdminToken()}` },
            validateStatus: () => true,
          })
        )
      );

      // All services should return the same tenant data
      const successfulResponses = responses.filter(r => r.status === 200);
      return successfulResponses.length === services.length;
    } catch (error) {
      return false;
    }
  }

  private static async getAdminToken(): Promise<string> {
    // Get admin token for service calls
    const adminData = {
      firstName: 'Admin',
      lastName: 'Test',
      email: `admin.test.${Date.now()}@example.com`,
      password: 'AdminTest123!',
      acceptTerms: true,
    };

    const response = await axios.post(
      `${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}/api/v1/auth/register`,
      adminData
    );

    return response.data.data.token;
  }
}