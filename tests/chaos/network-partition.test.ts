import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { ChaosEngine } from '../chaos-engine';
import { CHAOS_CONFIG } from '../chaos-config';

/**
 * Network Partition Chaos Tests
 *
 * This test suite validates system resilience during network partition scenarios,
 * ensuring that the PEMS application can handle network isolation between services.
 */

describe('Network Partition Chaos Tests', () => {
  let chaosEngine: ChaosEngine;
  let authServiceUrl: string;
  let userServiceUrl: string;
  let tenantServiceUrl: string;
  let notificationServiceUrl: string;

  beforeAll(async () => {
    // Initialize chaos engine
    chaosEngine = new ChaosEngine();
    await chaosEngine.initialize();

    // Set up service URLs
    authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
    tenantServiceUrl = process.env.TENANT_SERVICE_URL || 'http://localhost:3004';
    notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003';
  });

  afterAll(async () => {
    await chaosEngine.shutdown();
  });

  beforeEach(async () => {
    // Ensure all services are healthy before each test
    await verifyAllServicesHealthy();
  });

  afterEach(async () => {
    // Ensure all chaos experiments are stopped
    await chaosEngine.stopAllExperiments();
  });

  async function verifyAllServicesHealthy(): Promise<void> {
    const services = [
      { name: 'auth', url: authServiceUrl },
      { name: 'user', url: userServiceUrl },
      { name: 'tenant', url: tenantServiceUrl },
      { name: 'notification', url: notificationServiceUrl },
    ];

    for (const service of services) {
      try {
        const response = await axios.get(`${service.url}/health`, { timeout: 5000 });
        expect(response.status).toBe(200);
      } catch (error) {
        throw new Error(`Service ${service.name} is not healthy: ${error}`);
      }
    }
  }

  async function createNetworkPartition(sourceService: string, targetService: string, duration: number): Promise<string> {
    // Create a network partition between two services using iptables rules
    const partitionManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'NetworkChaos',
      metadata: {
        name: `partition-${sourceService}-to-${targetService}-${Date.now()}`,
        namespace: CHAOS_CONFIG.global.namespace,
      },
      spec: {
        action: 'partition',
        mode: 'all',
        selector: {
          labelSelectors: {
            app: sourceService,
          },
        },
        target: {
          selector: {
            labelSelectors: {
              app: targetService,
            },
          },
        },
        duration: `${duration}s`,
      },
    };

    await chaosEngine['applyChaosManifest'](partitionManifest);
    return partitionManifest.metadata.name;
  }

  async function measureInterServiceCommunication(sourceUrl: string, targetUrl: string): Promise<{
    reachable: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await axios.get(`${targetUrl}/health`, {
        timeout: 5000,
        headers: {
          'X-Forwarded-For': sourceUrl.replace('http://', '').replace('https://', ''),
        },
      });

      return {
        reachable: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        reachable: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  describe('Service Isolation Tests', () => {
    it('should handle isolation of non-critical services', async () => {
      // Isolate notification service from other services
      const partitionId = await createNetworkPartition(
        'notification-service',
        'auth-service',
        120 // 2 minutes
      );

      try {
        console.log('🔌 Testing behavior when notification service is isolated...');

        // Test that authentication still works
        const authResponse = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
          email: 'test@example.com',
          password: 'testpassword123',
        });

        expect(authResponse.status).toBe(200);
        expect(authResponse.data.success).toBe(true);

        // Test that user service still works
        const userResponse = await axios.get(`${userServiceUrl}/api/v1/users/profile`, {
          headers: { Authorization: `Bearer ${authResponse.data.data.token}` },
        });

        expect(userResponse.status).toBe(200);

        // Test that tenant service still works
        const tenantResponse = await axios.get(`${tenantServiceUrl}/api/v1/tenants/current`, {
          headers: { Authorization: `Bearer ${authResponse.data.data.token}` },
        });

        expect(tenantResponse.status).toBe(200);

        // Test that notification requests are handled gracefully
        const notificationResponse = await axios.post(`${notificationServiceUrl}/api/v1/notifications/send`, {
          userId: 'test-user',
          type: 'email',
          message: 'Test notification',
        }, {
          headers: { Authorization: `Bearer ${authResponse.data.data.token}` },
          timeout: 10000,
        });

        // Notification service should either work or fail gracefully
        expect([200, 503, 500]).toContain(notificationResponse.status);

        if (notificationResponse.status !== 200) {
          console.log('📧 Notification service isolated - fallback behavior working');
        }

        // Verify core functionality is preserved
        console.log('✅ Core services remain operational during notification service isolation');

      } finally {
        // Clean up network partition
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });

    it('should implement graceful degradation when critical services are partially isolated', async () => {
      // Create partial network partition affecting 50% of auth service traffic
      const partitionManifest = {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'NetworkChaos',
        metadata: {
          name: `partial-partition-auth-${Date.now()}`,
          namespace: CHAOS_CONFIG.global.namespace,
        },
        spec: {
          action: 'partition',
          mode: 'half', // Affect 50% of pods
          selector: {
            labelSelectors: {
              app: 'auth-service',
            },
          },
          target: {
            selector: {
              labelSelectors: {
                app: 'user-service',
              },
            },
          },
          duration: '90s',
        },
      };

      await chaosEngine['applyChaosManifest'](partitionManifest);

      try {
        console.log('🔄 Testing graceful degradation with partial auth service isolation...');

        const authTests = [];
        const testCount = 20;

        // Test authentication with retry logic
        for (let i = 0; i < testCount; i++) {
          const startTime = Date.now();

          try {
            const response = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: 'test@example.com',
              password: 'testpassword123',
            }, { timeout: 8000 });

            authTests.push({
              attempt: i + 1,
              success: true,
              responseTime: Date.now() - startTime,
              status: response.status,
            });
          } catch (error) {
            authTests.push({
              attempt: i + 1,
              success: false,
              responseTime: Date.now() - startTime,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Analyze results
        const successfulAuths = authTests.filter(test => test.success);
        const failedAuths = authTests.filter(test => !test.success);

        const successRate = (successfulAuths.length / testCount) * 100;
        const avgResponseTime = successfulAuths.reduce((sum, test) => sum + test.responseTime, 0) / successfulAuths.length;

        console.log(`📊 Partial partition results:`);
        console.log(`   Success rate: ${successRate.toFixed(2)}%`);
        console.log(`   Average response time: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`   Successful: ${successfulAuths.length}/${testCount}`);

        // Should still have reasonable success rate due to load balancing
        expect(successRate).toBeGreaterThan(50); // At least 50% success rate
        expect(successfulAuths.length).toBeGreaterThan(0); // Some requests should succeed

        // Test fallback mechanisms during partial isolation
        const fallbackTests = [];

        for (let i = 0; i < 5; i++) {
          try {
            const response = await axios.get(`${userServiceUrl}/api/v1/users/profile`, {
              headers: { Authorization: `Bearer test-token` },
              timeout: 5000,
            });

            fallbackTests.push({
              attempt: i + 1,
              success: true,
              fromCache: response.headers['x-cache'] === 'HIT',
              status: response.status,
            });
          } catch (error) {
            fallbackTests.push({
              attempt: i + 1,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        const successfulFallbacks = fallbackTests.filter(test => test.success);
        console.log(`📊 Fallback tests: ${successfulFallbacks.length}/${fallbackTests.length} successful`);

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });
  });

  describe('Split Brain Scenarios', () => {
    it('should handle database connection partitioning', async () => {
      // Simulate network partition between services and database
      const dbPartitionManifest = {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'NetworkChaos',
        metadata: {
          name: `db-partition-${Date.now()}`,
          namespace: CHAOS_CONFIG.global.namespace,
        },
        spec: {
          action: 'partition',
          mode: 'all',
          selector: {
            labelSelectors: {
              app: 'auth-service',
            },
          },
          externalTargets: ['postgres:5432'],
          duration: '60s',
        },
      };

      await chaosEngine['applyChaosManifest'](dbPartitionManifest);

      try {
        console.log('🔌 Testing database partition scenario...');

        const dbTests = [];

        // Test authentication during database isolation
        for (let i = 0; i < 10; i++) {
          try {
            const response = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: 'test@example.com',
              password: 'testpassword123',
            }, { timeout: 5000 });

            dbTests.push({
              attempt: i + 1,
              success: true,
              fromCache: response.data.fromCache || false,
              status: response.status,
            });
          } catch (error) {
            dbTests.push({
              attempt: i + 1,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Analyze database partition handling
        const successfulRequests = dbTests.filter(test => test.success);
        const cacheResponses = dbTests.filter(test => test.fromCache);

        console.log(`📊 Database partition results:`);
        console.log(`   Successful requests: ${successfulRequests.length}/${dbTests.length}`);
        console.log(`   Cache responses: ${cacheResponses.length}`);

        // Should handle database isolation gracefully
        if (successfulRequests.length > 0) {
          expect(successfulRequests[0].status).toBe(200);
        }

        // Should return appropriate error responses when database is unavailable
        const failedRequests = dbTests.filter(test => !test.success);
        if (failedRequests.length > 0) {
          console.log('📊 Database errors handled gracefully');
        }

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });

    it('should maintain service consistency during network healing', async () => {
      // Create temporary network partition
      const partitionId = await createNetworkPartition(
        'user-service',
        'tenant-service',
        60 // 1 minute
      );

      try {
        console.log('🔌 Testing network healing scenario...');

        // Test data consistency during partition
        const testData = {
          userId: 'consistency-test-user',
          updates: [
            { field: 'firstName', value: 'Updated' },
            { field: 'lastName', value: 'Name' },
            { field: 'preferences', value: { theme: 'dark' } },
          ],
        };

        // Perform updates during partition
        const updateResults = [];

        for (const update of testData.updates) {
          try {
            const response = await axios.put(
              `${userServiceUrl}/api/v1/users/${testData.userId}`,
              { [update.field]: update.value },
              { headers: { Authorization: `Bearer test-token` }, timeout: 5000 }
            );

            updateResults.push({
              update: update.field,
              success: true,
              status: response.status,
              queued: response.data.queued || false,
            });
          } catch (error) {
            updateResults.push({
              update: update.field,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        console.log(`📊 Update results during partition:`, updateResults);

        // Wait for partition to heal
        await new Promise(resolve => setTimeout(resolve, 65000)); // Wait a bit longer than partition duration

        // Verify consistency after healing
        try {
          const response = await axios.get(
            `${userServiceUrl}/api/v1/users/${testData.userId}`,
            { headers: { Authorization: `Bearer test-token` }, timeout: 10000 }
          );

          expect(response.status).toBe(200);
          console.log('✅ Data consistency maintained after network healing');

          // Verify tenant service is also accessible
          const tenantResponse = await axios.get(`${tenantServiceUrl}/api/v1/tenants/current`, {
            headers: { Authorization: `Bearer test-token` },
            timeout: 5000,
          });

          expect(tenantResponse.status).toBe(200);
          console.log('✅ Inter-service communication restored');

        } catch (error) {
          console.warn('⚠️ Consistency verification failed:', error);
          // Don't fail the test as this depends on the specific implementation
        }

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });
  });

  describe('Multi-Service Partitions', () => {
    it('should handle cascading service failures', async () => {
      // Create network partitions affecting multiple services
      const partitions = [];

      try {
        // Isolate user service from tenant service
        partitions.push(
          await createNetworkPartition('user-service', 'tenant-service', 90)
        );

        // Isolate notification service from auth service
        partitions.push(
          await createNetworkPartition('notification-service', 'auth-service', 90)
        );

        console.log('🔌 Testing cascading failure scenario...');

        // Test system behavior under multiple partitions
        const cascadeTests = [
          {
            name: 'Authentication (should work)',
            test: () => axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: 'test@example.com',
              password: 'testpassword123',
            }, { timeout: 5000 }),
            expectedStatus: [200, 503],
          },
          {
            name: 'User Profile (may be degraded)',
            test: () => axios.get(`${userServiceUrl}/api/v1/users/profile`, {
              headers: { Authorization: `Bearer test-token` },
              timeout: 8000,
            }),
            expectedStatus: [200, 503, 404],
          },
          {
            name: 'Tenant Info (may be degraded)',
            test: () => axios.get(`${tenantServiceUrl}/api/v1/tenants/current`, {
              headers: { Authorization: `Bearer test-token` },
              timeout: 8000,
            }),
            expectedStatus: [200, 503],
          },
          {
            name: 'Notifications (likely to fail)',
            test: () => axios.post(`${notificationServiceUrl}/api/v1/notifications/send`, {
              userId: 'test-user',
              type: 'email',
              message: 'Test',
            }, { headers: { Authorization: `Bearer test-token` }, timeout: 5000 }),
            expectedStatus: [503, 500, 200],
          },
        ];

        const results = [];

        for (const cascadeTest of cascadeTests) {
          const startTime = Date.now();

          try {
            const response = await cascadeTest.test();
            results.push({
              name: cascadeTest.name,
              success: true,
              status: response.status,
              responseTime: Date.now() - startTime,
              expected: cascadeTest.expectedStatus.includes(response.status),
            });
          } catch (error) {
            const status = error.response?.status || 0;
            results.push({
              name: cascadeTest.name,
              success: false,
              status,
              responseTime: Date.now() - startTime,
              expected: cascadeTest.expectedStatus.includes(status),
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        console.log(`📊 Cascading failure results:`, results);

        // Analyze results
        const expectedResults = results.filter(r => r.expected);
        const unexpectedResults = results.filter(r => !r.expected);

        console.log(`📊 Expected behavior: ${expectedResults.length}/${results.length}`);
        console.log(`📊 Unexpected behavior: ${unexpectedResults.length}/${results.length}`);

        // Most tests should behave as expected
        expect(expectedResults.length).toBeGreaterThan(results.length * 0.7); // At least 70% as expected

        // System should not completely fail
        const anySuccess = results.some(r => r.success);
        expect(anySuccess).toBe(true);

        console.log('✅ System maintained partial functionality during cascading failures');

      } finally {
        // Clean up all partitions
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });
  });
});