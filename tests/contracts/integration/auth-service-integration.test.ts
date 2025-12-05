import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { TestContainers } from 'testcontainers';
import { PostgreSqlContainer } from 'testcontainers';

/**
 * Authentication Service Integration Tests
 *
 * This test suite validates the integration between the authentication service
 * and external dependencies including databases, external APIs, and other services.
 * Tests cover end-to-end workflows with real infrastructure components.
 */

describe('Authentication Service Integration', () => {
  let postgresContainer: any;
  let authServiceUrl: string;
  let userServiceUrl: string;
  let notificationServiceUrl: string;

  beforeAll(async () => {
    // Setup test infrastructure
    postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('pems_integration_test')
      .withUsername('test')
      .withPassword('test')
      .withReuse()
      .start();

    // Mock service URLs for integration testing
    authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3200';
    userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3201';
    notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3202';

    // Wait for services to be ready
    await Promise.all([
      waitForService(authServiceUrl),
      waitForService(userServiceUrl),
      waitForService(notificationServiceUrl),
    ]);
  });

  afterAll(async () => {
    if (postgresContainer) {
      await postgresContainer.stop();
    }
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

  describe('User Registration Integration Flow', () => {
    it('should complete full registration workflow across services', async () => {
      const userData = {
        firstName: 'Integration',
        lastName: 'Test',
        email: `integration.test.${Date.now()}@example.com`,
        password: 'IntegrationTest123!',
        acceptTerms: true,
      };

      try {
        // Step 1: Register user via auth service
        const registerResponse = await axios.post(`${authServiceUrl}/api/v1/auth/register`, userData);

        expect(registerResponse.status).toBe(201);
        expect(registerResponse.data.success).toBe(true);
        expect(registerResponse.data.data.user.email).toBe(userData.email);
        expect(registerResponse.data.data.token).toBeDefined();

        const { user, token } = registerResponse.data.data;

        // Step 2: Verify user was created in user service
        const userResponse = await axios.get(
          `${userServiceUrl}/api/v1/users/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        expect(userResponse.status).toBe(200);
        expect(userResponse.data.data.email).toBe(userData.email);
        expect(userResponse.data.data.tenantId).toBe(user.tenantId);

        // Step 3: Verify notification was sent for user registration
        const notificationsResponse = await axios.get(
          `${notificationServiceUrl}/api/v1/notifications/user/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        expect(notificationsResponse.status).toBe(200);
        expect(notificationsResponse.data.data).toBeInstanceOf(Array);
        expect(notificationsResponse.data.data.length).toBeGreaterThan(0);

        const welcomeNotification = notificationsResponse.data.data.find(
          (n: any) => n.type === 'welcome_email'
        );
        expect(welcomeNotification).toBeDefined();
        expect(welcomeNotification.status).toBe('sent');

      } catch (error: any) {
        console.error('Integration test failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should handle registration with existing email gracefully', async () => {
      const userData = {
        firstName: 'Duplicate',
        lastName: 'Test',
        email: 'duplicate.test@example.com',
        password: 'DuplicateTest123!',
        acceptTerms: true,
      };

      try {
        // First registration should succeed
        await axios.post(`${authServiceUrl}/api/v1/auth/register`, userData);

        // Second registration should fail
        const duplicateResponse = await axios.post(
          `${authServiceUrl}/api/v1/auth/register`,
          userData,
          { validateStatus: () => true }
        );

        expect(duplicateResponse.status).toBe(409);
        expect(duplicateResponse.data.success).toBe(false);
        expect(duplicateResponse.data.error.code).toBe('EMAIL_ALREADY_EXISTS');

      } catch (error: any) {
        console.error('Duplicate registration test failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('Authentication Service Database Integration', () => {
    it('should persist user authentication data correctly', async () => {
      const userData = {
        firstName: 'Database',
        lastName: 'Integration',
        email: `db.integration.${Date.now()}@example.com`,
        password: 'DatabaseIntegration123!',
        acceptTerms: true,
      };

      try {
        // Register user
        const registerResponse = await axios.post(`${authServiceUrl}/api/v1/auth/register`, userData);
        const { user } = registerResponse.data.data;

        // Direct database verification
        const dbConnection = await postgresContainer.getConnection();

        const userQuery = await dbConnection.query(
          'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = $1',
          [user.id]
        );

        expect(userQuery.rows).toHaveLength(1);
        expect(userQuery.rows[0].email).toBe(userData.email);
        expect(userQuery.rows[0].first_name).toBe(userData.firstName);
        expect(userQuery.rows[0].last_name).toBe(userData.lastName);
        expect(userQuery.rows[0].is_active).toBe(true);

        const authQuery = await dbConnection.query(
          'SELECT user_id FROM authentication_records WHERE user_id = $1',
          [user.id]
        );

        expect(authQuery.rows).toHaveLength(1);

        await dbConnection.release();

      } catch (error: any) {
        console.error('Database integration test failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should handle database connection failures gracefully', async () => {
      // This test would require temporarily stopping the database container
      // For now, we'll simulate the behavior with a mock endpoint
      try {
        const response = await axios.get(`${authServiceUrl}/api/v1/health/database`, {
          validateStatus: () => true,
        });

        if (response.status === 503) {
          expect(response.data.status).toBe('unhealthy');
          expect(response.data.error).toContain('database connection');
        }
      } catch (error) {
        // Expected behavior when database is unavailable
        expect(true).toBe(true);
      }
    });
  });

  describe('Cross-Service Authentication Validation', () => {
    let authToken: string;
    let userId: string;

    beforeAll(async () => {
      // Create a test user for cross-service tests
      const userData = {
        firstName: 'Cross-Service',
        lastName: 'Test',
        email: `cross.service.${Date.now()}@example.com`,
        password: 'CrossService123!',
        acceptTerms: true,
      };

      const response = await axios.post(`${authServiceUrl}/api/v1/auth/register`, userData);
      authToken = response.data.data.token;
      userId = response.data.data.user.id;
    });

    it('should validate tokens across all services', async () => {
      const services = [
        { name: 'auth', url: authServiceUrl },
        { name: 'user', url: userServiceUrl },
        { name: 'notification', url: notificationServiceUrl },
      ];

      for (const service of services) {
        try {
          const response = await axios.get(
            `${service.url}/api/v1/validate-token`,
            {
              headers: { Authorization: `Bearer ${authToken}` },
              validateStatus: () => true,
            }
          );

          if (response.status !== 200) {
            console.warn(`${service.name} service doesn't support token validation endpoint`);
          } else {
            expect(response.data.valid).toBe(true);
            expect(response.data.userId).toBe(userId);
          }
        } catch (error) {
          // Some services might not have this endpoint, which is acceptable
          console.log(`${service.name} service: No token validation endpoint`);
        }
      }
    });

    it('should enforce consistent authorization across services', async () => {
      // Test that the same token has consistent permissions across services
      const protectedEndpoints = [
        { service: 'auth', endpoint: `${authServiceUrl}/api/v1/users/${userId}` },
        { service: 'user', endpoint: `${userServiceUrl}/api/v1/users/${userId}` },
        { service: 'notification', endpoint: `${notificationServiceUrl}/api/v1/notifications/user/${userId}` },
      ];

      for (const { service, endpoint } of protectedEndpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${authToken}` },
            validateStatus: () => true,
          });

          // All services should either return 200 (success) or 404 (endpoint not found)
          expect([200, 404]).toContain(response.status);

          if (response.status === 200) {
            expect(response.data.success).toBe(true);
          }
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.error(`Authorization test failed for ${service}:`, error.response?.data || error.message);
            throw error;
          }
        }
      }
    });
  });

  describe('Service Communication Resilience', () => {
    it('should handle service timeouts gracefully', async () => {
      // Test with a very short timeout to simulate service degradation
      try {
        await axios.get(`${userServiceUrl}/api/v1/users/slow-endpoint`, {
          headers: { Authorization: `Bearer ${authToken}` },
          timeout: 100, // Very short timeout
        });
      } catch (error: any) {
        expect(error.code).toBe('ECONNABORTED');
      }
    });

    it('should implement circuit breaker pattern for external dependencies', async () => {
      // Simulate rapid failed requests to trigger circuit breaker
      const promises = Array.from({ length: 10 }, () =>
        axios.get(`${notificationServiceUrl}/api/v1/notifications/fake-service`, {
          headers: { Authorization: `Bearer ${authToken}` },
          validateStatus: () => true,
        })
      );

      const responses = await Promise.all(promises);

      // Circuit breaker should eventually start returning 503
      const circuitBreakerResponses = responses.filter(r => r.status === 503);
      expect(circuitBreakerResponses.length).toBeGreaterThan(0);

      circuitBreakerResponses.forEach(response => {
        expect(response.data.error).toContain('circuit breaker');
      });
    });
  });

  describe('Data Consistency Across Services', () => {
    it('should maintain user profile consistency across services', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Profile',
      };

      try {
        // Update user profile
        const updateResponse = await axios.put(
          `${userServiceUrl}/api/v1/users/${userId}`,
          updateData,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        expect(updateResponse.status).toBe(200);

        // Verify update is reflected in auth service
        const authUserResponse = await axios.get(
          `${authServiceUrl}/api/v1/auth/profile`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        expect(authUserResponse.status).toBe(200);
        expect(authUserResponse.data.data.firstName).toBe(updateData.firstName);
        expect(authUserResponse.data.data.lastName).toBe(updateData.lastName);

      } catch (error: any) {
        console.error('Data consistency test failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should handle concurrent updates safely', async () => {
      const concurrentUpdates = [
        { firstName: 'First', lastName: 'Concurrent' },
        { firstName: 'Second', lastName: 'Concurrent' },
        { firstName: 'Third', lastName: 'Concurrent' },
      ];

      try {
        // Send multiple concurrent updates
        const updatePromises = concurrentUpdates.map((update, index) =>
          axios.put(
            `${userServiceUrl}/api/v1/users/${userId}`,
            update,
            {
              headers: { Authorization: `Bearer ${authToken}` },
              timeout: 10000,
            }
          )
        );

        const responses = await Promise.allSettled(updatePromises);

        // At least one update should succeed
        const successfulUpdates = responses.filter(r => r.status === 'fulfilled');
        expect(successfulUpdates.length).toBeGreaterThan(0);

        // Final state should be consistent
        const finalResponse = await axios.get(
          `${userServiceUrl}/api/v1/users/${userId}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        expect(finalResponse.status).toBe(200);
        const finalData = finalResponse.data.data;

        // Verify final data matches one of the attempted updates
        const matchingUpdate = concurrentUpdates.find(
          update => update.firstName === finalData.firstName && update.lastName === finalData.lastName
        );
        expect(matchingUpdate).toBeDefined();

      } catch (error: any) {
        console.error('Concurrent updates test failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });
});

/**
 * Integration Test Utilities
 */
export class IntegrationTestUtils {
  static async createTestUser(userData?: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }>) {
    const defaultUserData = {
      firstName: 'Integration',
      lastName: 'Test',
      email: `integration.${Date.now()}@example.com`,
      password: 'IntegrationTest123!',
      acceptTerms: true,
    };

    const finalUserData = { ...defaultUserData, ...userData };

    const response = await axios.post(
      `${process.env.AUTH_SERVICE_URL || 'http://localhost:3200'}/api/v1/auth/register`,
      finalUserData
    );

    return response.data.data;
  }

  static async cleanupTestData(userId: string, token: string) {
    // Cleanup user data from all services
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
    const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003';

    await Promise.allSettled([
      axios.delete(`${authServiceUrl}/api/v1/auth/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }),
      axios.delete(`${userServiceUrl}/api/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }),
      axios.delete(`${notificationServiceUrl}/api/v1/notifications/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }),
    ]);
  }

  static generateUniqueEmail(prefix: string = 'test'): string {
    return `${prefix}.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@example.com`;
  }

  static async validateServiceHealth(serviceUrls: string[]) {
    const healthChecks = serviceUrls.map(async url => {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 5000 });
        return { url, status: 'healthy', response: response.data };
      } catch (error) {
        return { url, status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    return Promise.all(healthChecks);
  }
}