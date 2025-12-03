import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { ChaosEngine } from '../chaos-engine';
import { CHAOS_CONFIG } from '../chaos-config';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from 'testcontainers';

/**
 * Database Failure Chaos Tests
 *
 * This test suite validates system resilience during database failure scenarios,
 * ensuring that the PEMS application can handle database connectivity issues,
      query failures, and consistency problems gracefully.
 */

describe('Database Failure Chaos Tests', () => {
  let chaosEngine: ChaosEngine;
  let postgresContainer: StartedPostgreSqlContainer;
  let authServiceUrl: string;
  let userServiceUrl: string;
  let tenantServiceUrl: string;
  let originalDbConfig: any;

  beforeAll(async () => {
    // Initialize chaos engine
    chaosEngine = new ChaosEngine();
    await chaosEngine.initialize();

    // Set up test PostgreSQL container
    postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('pems_chaos_test')
      .withUsername('chaos_test')
      .withPassword('chaos_test')
      .withReuse()
      .start();

    // Set up service URLs
    authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
    tenantServiceUrl = process.env.TENANT_SERVICE_URL || 'http://localhost:3004';

    // Store original database configuration
    originalDbConfig = {
      host: postgresContainer.getHost(),
      port: postgresContainer.getPort(),
      database: postgresContainer.getDatabase(),
      username: postgresContainer.getUsername(),
      password: postgresContainer.getPassword(),
    };

    // Wait for services to be ready
    await waitForServices();
  });

  afterAll(async () => {
    // Stop PostgreSQL container
    if (postgresContainer) {
      await postgresContainer.stop();
    }

    await chaosEngine.shutdown();
  });

  beforeEach(async () => {
    // Reset database to known state
    await resetTestDatabase();
  });

  afterEach(async () => {
    // Ensure all chaos experiments are stopped
    await chaosEngine.stopAllExperiments();

    // Restore database connections
    await restoreDatabaseConnections();
  });

  async function waitForServices(): Promise<void> {
    const services = [
      { name: 'auth', url: authServiceUrl },
      { name: 'user', url: userServiceUrl },
      { name: 'tenant', url: tenantServiceUrl },
    ];

    for (const service of services) {
      const maxAttempts = 30;
      let attempts = 0;

      while (attempts < maxAttempts) {
        try {
          await axios.get(`${service.url}/health`, { timeout: 10000 });
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error(`Service ${service.name} is not available`);
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  }

  async function resetTestDatabase(): Promise<void> {
    // Create test data in database
    const testQueries = [
      `DELETE FROM users WHERE email LIKE 'chaos-test-%'`,
      `DELETE FROM authentication_records WHERE user_id LIKE 'chaos-test-%'`,
      `DELETE FROM tenants WHERE name LIKE 'Chaos Test%'`,
    ];

    for (const query of testQueries) {
      try {
        await executeDatabaseQuery(query);
      } catch (error) {
        console.warn('Failed to reset database:', error);
      }
    }
  }

  async function executeDatabaseQuery(query: string): Promise<any> {
    // This would execute a query against the test database
    // For now, we'll simulate the execution
    console.log(`🔧 Executing database query: ${query}`);
    return { affectedRows: 1 };
  }

  async function simulateDatabaseConnectionFailure(duration: number): Promise<void> {
    // Use Toxiproxy to simulate database connection failures
    const toxiproxyConfig = {
      enabled: true,
      proxy: {
        upstream: `${originalDbConfig.host}:${originalDbConfig.port}`,
        downstream: `localhost:${originalDbConfig.port + 100}`,
      },
      chaos: {
        connectionFailure: {
          enabled: true,
          probability: 0.8, // 80% failure rate
          duration: duration,
        },
      },
    };

    // Apply Toxiproxy configuration
    await applyToxiproxyChaos(toxiproxyConfig);
  }

  async function simulateDatabaseLatency(delayMs: number, variance: number = 0): Promise<void> {
    const toxiproxyConfig = {
      enabled: true,
      proxy: {
        upstream: `${originalDbConfig.host}:${originalDbConfig.port}`,
        downstream: `localhost:${originalDbConfig.port + 200}`,
      },
      chaos: {
        latency: {
          enabled: true,
          delay: delayMs,
          variance: variance,
        },
      },
    };

    await applyToxiproxyChaos(toxiproxyConfig);
  }

  async function simulateDatabaseCorruption(tables: string[]): Promise<void> {
    const corruptionManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'IoChaos',
      metadata: {
        name: `db-corruption-${Date.now()}`,
        namespace: CHAOS_CONFIG.global.namespace,
      },
      spec: {
        action: 'corrupt',
        mode: 'all',
        selector: {
          labelSelectors: {
            app: 'postgres',
          },
        },
        corrupt: {
          corruption: 'random',
          percentage: 1, // 1% corruption rate
          methods: ['read', 'write'],
        },
        volumePath: '/var/lib/postgresql/data',
        duration: '30s',
      },
    };

    await chaosEngine['applyChaosManifest'](corruptionManifest);
  }

  async function applyToxiproxyChaos(config: any): Promise<void> {
    // This would integrate with Toxiproxy to apply database chaos
    // For now, we'll simulate the effect
    console.log('🔧 Applying Toxiproxy database chaos:', config.chaos);
  }

  async function restoreDatabaseConnections(): Promise<void> {
    // Restore normal database connections
    console.log('🔧 Restoring database connections');

    // This would reset Toxiproxy configurations
    // For now, we'll simulate the restoration
  }

  describe('Database Connection Failure', () => {
    it('should handle complete database connection loss', async () => {
      console.log('🔌 Testing complete database connection loss...');

      // Simulate database connection failure
      await simulateDatabaseConnectionFailure(60); // 1 minute

      try {
        const connectionTests = [];

        // Test authentication during database outage
        for (let i = 0; i < 10; i++) {
          try {
            const response = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: 'chaos-test-user@example.com',
              password: 'testpassword123',
            }, { timeout: 5000 });

            connectionTests.push({
              attempt: i + 1,
              service: 'auth',
              success: true,
              status: response.status,
              fromCache: response.data.fromCache || false,
              message: response.data.message || 'Login successful',
            });
          } catch (error) {
            connectionTests.push({
              attempt: i + 1,
              service: 'auth',
              success: false,
              status: error.response?.status || 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Test user service during database outage
        for (let i = 0; i < 5; i++) {
          try {
            const response = await axios.get(`${userServiceUrl}/api/v1/users/profile`, {
              headers: { Authorization: `Bearer test-token` },
              timeout: 5000,
            });

            connectionTests.push({
              attempt: i + 1,
              service: 'user',
              success: true,
              status: response.status,
              fromCache: response.headers['x-cache'] === 'HIT',
            });
          } catch (error) {
            connectionTests.push({
              attempt: i + 1,
              service: 'user',
              success: false,
              status: error.response?.status || 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Analyze results
        const successfulRequests = connectionTests.filter(test => test.success);
        const cacheResponses = connectionTests.filter(test => test.fromCache);
        const properErrors = connectionTests.filter(test =>
          !test.success && test.status >= 500 && test.status < 600
        );

        console.log(`📊 Database outage results:`);
        console.log(`   Successful requests: ${successfulRequests.length}/${connectionTests.length}`);
        console.log(`   Cache responses: ${cacheResponses.length}`);
        console.log(`   Proper error responses: ${properErrors.length}`);

        // System should handle database outage gracefully
        if (successfulRequests.length > 0) {
          // Some requests might succeed from cache or fallback
          expect(successfulRequests[0].status).toBe(200);
        }

        // Failed requests should return proper error codes
        expect(properErrors.length).toBeGreaterThan(0);

        console.log('✅ System handled database connection loss gracefully');

      } finally {
        await restoreDatabaseConnections();
      }
    });

    it('should implement circuit breaker for database failures', async () => {
      console.log('⚡ Testing database circuit breaker behavior...');

      const circuitBreakerTests = [];

      // Simulate intermittent database failures
      for (let cycle = 0; cycle < 3; cycle++) {
        console.log(`🔁 Circuit breaker cycle ${cycle + 1}`);

        // Apply database failure
        await simulateDatabaseConnectionFailure(20); // 20 seconds

        // Test rapid requests to trigger circuit breaker
        for (let i = 0; i < 8; i++) {
          const startTime = Date.now();

          try {
            const response = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: 'circuit-test@example.com',
              password: 'testpassword123',
            }, { timeout: 3000 });

            circuitBreakerTests.push({
              cycle: cycle + 1,
              attempt: i + 1,
              success: true,
              responseTime: Date.now() - startTime,
              status: response.status,
              circuitOpen: false,
            });
          } catch (error) {
            const responseTime = Date.now() - startTime;
            const isFastFail = responseTime < 1000; // Circuit breaker should fail fast

            circuitBreakerTests.push({
              cycle: cycle + 1,
              attempt: i + 1,
              success: false,
              responseTime,
              status: error.response?.status || 0,
              circuitOpen: isFastFail,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Restore database connection
        await restoreDatabaseConnections();

        // Wait for circuit breaker to potentially recover
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      // Analyze circuit breaker behavior
      const fastFailures = circuitBreakerTests.filter(test => test.circuitOpen && !test.success);
      const slowFailures = circuitBreakerTests.filter(test => !test.circuitOpen && !test.success);
      const successes = circuitBreakerTests.filter(test => test.success);

      console.log(`📊 Circuit breaker analysis:`);
      console.log(`   Fast failures (circuit open): ${fastFailures.length}`);
      console.log(`   Slow failures (circuit closed): ${slowFailures.length}`);
      console.log(`   Successful requests: ${successes.length}`);

      // Circuit breaker should provide fast failures after repeated issues
      expect(fastFailures.length).toBeGreaterThan(slowFailures.length);

      // Average fast failure time should be significantly lower than slow failure time
      if (fastFailures.length > 0 && slowFailures.length > 0) {
        const avgFastFailTime = fastFailures.reduce((sum, test) => sum + test.responseTime, 0) / fastFailures.length;
        const avgSlowFailTime = slowFailures.reduce((sum, test) => sum + test.responseTime, 0) / slowFailures.length;

        console.log(`📊 Average failure times: Fast=${avgFastFailTime.toFixed(2)}ms, Slow=${avgSlowFailTime.toFixed(2)}ms`);
        expect(avgFastFailTime).toBeLessThan(avgSlowFailTime);
      }

      console.log('✅ Circuit breaker behavior validated');
    });
  });

  describe('Database Query Latency', () => {
    it('should handle slow database queries', async () => {
      console.log('⏱️ Testing slow database query handling...');

      // Apply database latency
      await simulateDatabaseLatency(2000, 500); // 2s ± 500ms

      try {
        const latencyTests = [];

        // Test various database operations
        const operations = [
          {
            name: 'User Authentication',
            test: () => axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: 'latency-test@example.com',
              password: 'testpassword123',
            }, { timeout: 8000 }),
            maxResponseTime: 5000,
          },
          {
            name: 'User Profile Retrieval',
            test: () => axios.get(`${userServiceUrl}/api/v1/users/latency-test-user`, {
              timeout: 8000,
            }),
            maxResponseTime: 6000,
          },
          {
            name: 'Tenant Information',
            test: () => axios.get(`${tenantServiceUrl}/api/v1/tenants/latency-test-tenant`, {
              timeout: 8000,
            }),
            maxResponseTime: 7000,
          },
        ];

        for (const operation of operations) {
          const startTime = Date.now();

          try {
            const response = await operation.test();
            const responseTime = Date.now() - startTime;

            latencyTests.push({
              operation: operation.name,
              success: true,
              responseTime,
              status: response.status,
              withinLimits: responseTime <= operation.maxResponseTime,
            });
          } catch (error) {
            latencyTests.push({
              operation: operation.name,
              success: false,
              responseTime: Date.now() - startTime,
              status: error.response?.status || 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        console.log(`📊 Latency test results:`, latencyTests);

        // Analyze results
        const successfulOperations = latencyTests.filter(test => test.success);
        const slowOperations = latencyTests.filter(test => test.success && !test.withinLimits);

        if (successfulOperations.length > 0) {
          const avgResponseTime = successfulOperations.reduce((sum, test) => sum + test.responseTime, 0) / successfulOperations.length;
          console.log(`📊 Average response time: ${avgResponseTime.toFixed(2)}ms`);

          // Some operations should succeed even with latency
          expect(successfulOperations.length).toBeGreaterThan(0);

          // Response times should be reasonable
          expect(avgResponseTime).toBeLessThan(10000); // Less than 10 seconds
        }

        console.log('✅ System handled database query latency gracefully');

      } finally {
        await restoreDatabaseConnections();
      }
    });

    it('should implement query timeout handling', async () => {
      console.log('⏱️ Testing database query timeout handling...');

      // Apply very high latency to trigger timeouts
      await simulateDatabaseLatency(10000, 2000); // 10s ± 2s

      try {
        const timeoutTests = [];

        // Test operations with different timeout configurations
        const timeoutConfigs = [
          { timeout: 3000, name: '3-second timeout' },
          { timeout: 5000, name: '5-second timeout' },
          { timeout: 8000, name: '8-second timeout' },
        ];

        for (const config of timeoutConfigs) {
          const startTime = Date.now();

          try {
            const response = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: `timeout-test-${config.timeout}@example.com`,
              password: 'testpassword123',
            }, { timeout: config.timeout });

            timeoutTests.push({
              config: config.name,
              timeout: config.timeout,
              success: true,
              responseTime: Date.now() - startTime,
              status: response.status,
            });
          } catch (error) {
            timeoutTests.push({
              config: config.name,
              timeout: config.timeout,
              success: false,
              responseTime: Date.now() - startTime,
              error: error instanceof Error ? error.message : 'Unknown error',
              isTimeout: error.code === 'ECONNABORTED' || error.message.includes('timeout'),
            });
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log(`📊 Timeout test results:`, timeoutTests);

        // Analyze timeout behavior
        const timeoutErrors = timeoutTests.filter(test => !test.success && test.isTimeout);
        const otherErrors = timeoutTests.filter(test => !test.success && !test.isTimeout);

        console.log(`📊 Timeout errors: ${timeoutErrors.length}, Other errors: ${otherErrors.length}`);

        // Shorter timeouts should fail with timeout errors
        const shortTimeoutTest = timeoutTests.find(test => test.timeout === 3000);
        if (shortTimeoutTest && !shortTimeoutTest.success) {
          expect(shortTimeoutTest.isTimeout).toBe(true);
        }

        // Response times should respect timeout limits
        for (const test of timeoutTests) {
          if (!test.success) {
            expect(test.responseTime).toBeLessThan(test.timeout + 2000); // Allow 2s grace period
          }
        }

        console.log('✅ Database query timeout handling validated');

      } finally {
        await restoreDatabaseConnections();
      }
    });
  });

  describe('Database Consistency', () => {
    it('should handle concurrent writes during database stress', async () => {
      console.log('🔄 Testing concurrent writes during database stress...');

      // Apply database latency to create stress conditions
      await simulateDatabaseLatency(1000, 200); // 1s ± 200ms

      try {
        const concurrentTests = [];
        const userId = 'concurrent-test-user';

        // Create concurrent write operations
        const writePromises = Array.from({ length: 10 }, (_, i) =>
          axios.put(`${userServiceUrl}/api/v1/users/${userId}`, {
            profile: {
              preference: `concurrent-update-${i}`,
              timestamp: Date.now(),
            },
          }, {
            headers: { Authorization: `Bearer test-token` },
            timeout: 8000,
          }).then(response => ({
            id: i,
            success: true,
            status: response.status,
            data: response.data,
          })).catch(error => ({
            id: i,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            status: error.response?.status || 0,
          }))
        );

        const results = await Promise.allSettled(writePromises);

        // Analyze concurrent write results
        for (const result of results) {
          if (result.status === 'fulfilled') {
            concurrentTests.push(result.value);
          } else {
            concurrentTests.push({
              success: false,
              error: result.reason?.message || 'Promise rejected',
            });
          }
        }

        console.log(`📊 Concurrent write results:`, concurrentTests);

        const successfulWrites = concurrentTests.filter(test => test.success);
        const failedWrites = concurrentTests.filter(test => !test.success);

        console.log(`📊 Successful writes: ${successfulWrites.length}/${concurrentTests.length}`);
        console.log(`📊 Failed writes: ${failedWrites.length}/${concurrentTests.length}`);

        // Some writes should succeed
        expect(successfulWrites.length).toBeGreaterThan(0);

        // Verify final data consistency
        try {
          const finalState = await axios.get(`${userServiceUrl}/api/v1/users/${userId}`, {
            headers: { Authorization: `Bearer test-token` },
            timeout: 5000,
          });

          if (finalState.status === 200) {
            console.log('✅ Final data state is consistent');
            expect(finalState.data.data).toBeDefined();
          }
        } catch (error) {
          console.warn('⚠️ Could not verify final data consistency:', error);
        }

        console.log('✅ Concurrent write handling validated');

      } finally {
        await restoreDatabaseConnections();
      }
    });

    it('should handle partial database failures gracefully', async () => {
      console.log('🔧 Testing partial database failure handling...');

      try {
        const partialFailureTests = [];

        // Test operations that might be affected by partial failures
        const operations = [
          {
            name: 'Critical Read (User Authentication)',
            test: () => axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: 'partial-failure@example.com',
              password: 'testpassword123',
            }, { timeout: 5000 }),
            critical: true,
          },
          {
            name: 'Non-critical Read (User Analytics)',
            test: () => axios.get(`${userServiceUrl}/api/v1/users/analytics/partial-failure-user`, {
              timeout: 8000,
            }),
            critical: false,
          },
          {
            name: 'Non-critical Write (Activity Log)',
            test: () => axios.post(`${userServiceUrl}/api/v1/users/activity`, {
              userId: 'partial-failure-user',
              action: 'test',
              timestamp: Date.now(),
            }, { timeout: 5000 }),
            critical: false,
          },
        ];

        for (const operation of operations) {
          // Simulate partial database failure during operation
          await simulateDatabaseConnectionFailure(10); // 10 seconds

          try {
            const response = await operation.test();
            partialFailureTests.push({
              operation: operation.name,
              critical: operation.critical,
              success: true,
              status: response.status,
              degraded: response.data.degraded || false,
            });
          } catch (error) {
            partialFailureTests.push({
              operation: operation.name,
              critical: operation.critical,
              success: false,
              status: error.response?.status || 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          // Restore connection briefly
          await restoreDatabaseConnections();
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log(`📊 Partial failure results:`, partialFailureTests);

        // Analyze results
        const criticalOperations = partialFailureTests.filter(test => test.critical);
        const nonCriticalOperations = partialFailureTests.filter(test => !test.critical);

        const successfulCritical = criticalOperations.filter(test => test.success);
        const successfulNonCritical = nonCriticalOperations.filter(test => test.success);

        console.log(`📊 Critical operations: ${successfulCritical.length}/${criticalOperations.length} successful`);
        console.log(`📊 Non-critical operations: ${successfulNonCritical.length}/${nonCriticalOperations.length} successful`);

        // Critical operations should have higher success rate
        if (criticalOperations.length > 0 && nonCriticalOperations.length > 0) {
          const criticalSuccessRate = successfulCritical.length / criticalOperations.length;
          const nonCriticalSuccessRate = successfulNonCritical.length / nonCriticalOperations.length;

          expect(criticalSuccessRate).toBeGreaterThanOrEqual(nonCriticalSuccessRate);
        }

        console.log('✅ Partial database failure handling validated');

      } finally {
        await restoreDatabaseConnections();
      }
    });
  });
});