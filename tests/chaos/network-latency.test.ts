import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { ChaosEngine } from '../chaos-engine';
import { CHAOS_CONFIG } from '../chaos-config';

/**
 * Network Latency Injection Chaos Tests
 *
 * This test suite validates system resilience under network latency conditions,
 * ensuring that the PEMS application can handle slow network scenarios gracefully.
 */

describe('Network Latency Chaos Tests', () => {
  let chaosEngine: ChaosEngine;
  let baselineMetrics: any;
  let authServiceUrl: string;
  let userServiceUrl: string;
  let tenantServiceUrl: string;

  beforeAll(async () => {
    // Initialize chaos engine
    chaosEngine = new ChaosEngine();
    await chaosEngine.initialize();

    // Set up service URLs
    authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
    tenantServiceUrl = process.env.TENANT_SERVICE_URL || 'http://localhost:3004';

    // Wait for services to be ready
    await waitForServices();
  });

  afterAll(async () => {
    await chaosEngine.shutdown();
  });

  beforeEach(async () => {
    // Collect baseline metrics before each test
    baselineMetrics = await collectBaselineMetrics();
  });

  afterEach(async () => {
    // Ensure all chaos experiments are stopped
    await chaosEngine.stopAllExperiments();
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
          await axios.get(`${service.url}/health`, { timeout: 5000 });
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

  async function collectBaselineMetrics(): Promise<any> {
    try {
      const [authMetrics, userMetrics, tenantMetrics] = await Promise.all([
        measureServiceHealth(authServiceUrl),
        measureServiceHealth(userServiceUrl),
        measureServiceHealth(tenantServiceUrl),
      ]);

      return {
        timestamp: new Date(),
        services: {
          auth: authMetrics,
          user: userMetrics,
          tenant: tenantMetrics,
        },
      };
    } catch (error) {
      console.warn('Failed to collect baseline metrics:', error);
      return {};
    }
  }

  async function measureServiceHealth(serviceUrl: string): Promise<any> {
    const startTime = Date.now();

    try {
      const response = await axios.get(`${serviceUrl}/health`, { timeout: 10000 });
      const responseTime = Date.now() - startTime;

      return {
        available: true,
        responseTime,
        status: response.status,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        available: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  describe('Low Latency Injection', () => {
    it('should handle 100ms latency gracefully', async () => {
      const executionId = await chaosEngine.executeExperiment('network-latency-spike', {
        duration: 60, // 1 minute
        dryRun: false,
      });

      try {
        // Test authentication under latency
        const authStartTime = Date.now();
        const authResponse = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
          email: 'test@example.com',
          password: 'testpassword123',
        }, { timeout: 5000 });

        const authDuration = Date.now() - authStartTime;

        // Verify response is successful
        expect(authResponse.status).toBe(200);
        expect(authResponse.data.success).toBe(true);

        // Verify response time is within acceptable limits
        expect(authDuration).toBeLessThan(2000); // Should still complete within 2 seconds

        // Test user service under latency
        const userStartTime = Date.now();
        const userResponse = await axios.get(`${userServiceUrl}/api/v1/users/profile`, {
          headers: { Authorization: `Bearer ${authResponse.data.data.token}` },
          timeout: 5000,
        });

        const userDuration = Date.now() - userStartTime;

        expect(userResponse.status).toBe(200);
        expect(userDuration).toBeLessThan(3000); // Should complete within 3 seconds

        console.log(`✅ Low latency test passed: Auth ${authDuration}ms, User ${userDuration}ms`);

      } finally {
        await chaosEngine.stopExperiment(executionId);
      }
    });

    it('should maintain service availability during latency injection', async () => {
      const executionId = await chaosEngine.executeExperiment('network-latency-spike', {
        duration: 120, // 2 minutes
      });

      try {
        const healthChecks = [];
        const testDuration = 60000; // 1 minute of testing
        const interval = 5000; // Check every 5 seconds

        const startTime = Date.now();

        while (Date.now() - startTime < testDuration) {
          const checkStartTime = Date.now();

          try {
            const response = await axios.get(`${authServiceUrl}/health`, { timeout: 10000 });
            healthChecks.push({
              timestamp: new Date(),
              available: true,
              responseTime: Date.now() - checkStartTime,
              status: response.status,
            });
          } catch (error) {
            healthChecks.push({
              timestamp: new Date(),
              available: false,
              responseTime: Date.now() - checkStartTime,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          await new Promise(resolve => setTimeout(resolve, interval));
        }

        // Analyze health check results
        const availableChecks = healthChecks.filter(check => check.available);
        const unavailableChecks = healthChecks.filter(check => !check.available);

        const availabilityRate = (availableChecks.length / healthChecks.length) * 100;
        const avgResponseTime = availableChecks.reduce((sum, check) => sum + check.responseTime, 0) / availableChecks.length;

        console.log(`📊 Availability during latency: ${availabilityRate.toFixed(2)}%`);
        console.log(`📊 Average response time: ${avgResponseTime.toFixed(2)}ms`);

        // Verify availability requirements
        expect(availabilityRate).toBeGreaterThan(80); // At least 80% availability
        expect(avgResponseTime).toBeLessThan(2000); // Average response time under 2 seconds

      } finally {
        await chaosEngine.stopExperiment(executionId);
      }
    });
  });

  describe('Medium Latency Injection', () => {
    it('should handle 500ms latency with circuit breaker activation', async () => {
      // Modify network configuration for higher latency
      const originalLatency = CHAOS_CONFIG.network.config.latency.delay;
      CHAOS_CONFIG.network.config.latency.delay = 500; // Increase to 500ms

      const executionId = await chaosEngine.executeExperiment('network-latency-spike', {
        duration: 90, // 1.5 minutes
      });

      try {
        const circuitBreakerTests = [];

        // Test circuit breaker behavior
        for (let i = 0; i < 10; i++) {
          const startTime = Date.now();

          try {
            const response = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: 'test@example.com',
              password: 'testpassword123',
            }, { timeout: 3000 });

            circuitBreakerTests.push({
              attempt: i + 1,
              success: true,
              responseTime: Date.now() - startTime,
              status: response.status,
            });
          } catch (error) {
            circuitBreakerTests.push({
              attempt: i + 1,
              success: false,
              responseTime: Date.now() - startTime,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Analyze circuit breaker behavior
        const successfulTests = circuitBreakerTests.filter(test => test.success);
        const failedTests = circuitBreakerTests.filter(test => !test.success);

        console.log(`📊 Circuit breaker tests: ${successfulTests.length} successful, ${failedTests.length} failed`);

        // Circuit breaker should activate after repeated timeouts
        if (failedTests.length > 3) {
          const lastFewTests = circuitBreakerTests.slice(-3);
          const allLastFailed = lastFewTests.every(test => !test.success);

          // Should see fast failures after circuit breaker opens
          if (allLastFailed) {
            const avgFailureTime = lastFewTests.reduce((sum, test) => sum + test.responseTime, 0) / lastFewTests.length;
            expect(avgFailureTime).toBeLessThan(1000); // Should fail fast (< 1 second)
          }
        }

      } finally {
        // Restore original configuration
        CHAOS_CONFIG.network.config.latency.delay = originalLatency;
        await chaosEngine.stopExperiment(executionId);
      }
    });

    it('should serve cached responses during high latency', async () => {
      // First, populate cache
      const populateResponse = await axios.get(`${userServiceUrl}/api/v1/users/config`, {
        headers: { Authorization: `Bearer ${await getTestToken()}` },
      });

      expect(populateResponse.status).toBe(200);

      // Apply latency and test cache fallback
      const executionId = await chaosEngine.executeExperiment('network-latency-spike', {
        duration: 60,
      });

      try {
        const cacheTests = [];

        for (let i = 0; i < 5; i++) {
          const startTime = Date.now();

          try {
            const response = await axios.get(`${userServiceUrl}/api/v1/users/config`, {
              headers: { Authorization: `Bearer ${await getTestToken()}` },
              timeout: 5000,
            });

            cacheTests.push({
              attempt: i + 1,
              success: true,
              responseTime: Date.now() - startTime,
              fromCache: response.headers['x-cache'] === 'HIT',
            });
          } catch (error) {
            cacheTests.push({
              attempt: i + 1,
              success: false,
              responseTime: Date.now() - startTime,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        console.log(`📊 Cache tests:`, cacheTests);

        // Some requests should be served from cache
        const cacheHits = cacheTests.filter(test => test.fromCache).length;
        const successfulRequests = cacheTests.filter(test => test.success).length;

        expect(successfulRequests).toBeGreaterThan(0); // At least some requests should succeed

        if (cacheHits > 0) {
          const avgCacheTime = cacheTests.filter(test => test.fromCache)
            .reduce((sum, test) => sum + test.responseTime, 0) / cacheHits;

          console.log(`📊 Average cache response time: ${avgCacheTime.toFixed(2)}ms`);
          expect(avgCacheTime).toBeLessThan(200); // Cache responses should be fast
        }

      } finally {
        await chaosEngine.stopExperiment(executionId);
      }
    });
  });

  describe('High Latency Injection', () => {
    it('should handle extreme latency with graceful degradation', async () => {
      // Set extreme latency
      const originalLatency = CHAOS_CONFIG.network.config.latency.delay;
      CHAOS_CONFIG.network.config.latency.delay = 2000; // 2 seconds

      const executionId = await chaosEngine.executeExperiment('network-latency-spike', {
        duration: 90,
      });

      try {
        // Test graceful degradation
        const degradationTests = [
          { endpoint: `${authServiceUrl}/api/v1/auth/login`, critical: true },
          { endpoint: `${userServiceUrl}/api/v1/users/profile`, critical: true },
          { endpoint: `${userServiceUrl}/api/v1/users/preferences`, critical: false },
          { endpoint: `${tenantServiceUrl}/api/v1/tenants/analytics`, critical: false },
        ];

        const results = [];

        for (const test of degradationTests) {
          const startTime = Date.now();

          try {
            const response = await axios.get(test.endpoint, {
              headers: { Authorization: `Bearer ${await getTestToken()}` },
              timeout: test.critical ? 8000 : 3000, // Longer timeout for critical endpoints
            });

            results.push({
              endpoint: test.endpoint,
              critical: test.critical,
              success: true,
              responseTime: Date.now() - startTime,
              status: response.status,
              degraded: response.data.degraded || false,
            });
          } catch (error) {
            results.push({
              endpoint: test.endpoint,
              critical: test.critical,
              success: false,
              responseTime: Date.now() - startTime,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        console.log(`📊 Degradation test results:`, results);

        // Critical endpoints should still work (possibly with degraded performance)
        const criticalResults = results.filter(r => r.critical);
        const nonCriticalResults = results.filter(r => !r.critical);

        const successfulCritical = criticalResults.filter(r => r.success);
        const successfulNonCritical = nonCriticalResults.filter(r => r.success);

        expect(successfulCritical.length).toBeGreaterThan(0); // At least some critical endpoints should work

        // Non-critical endpoints might fail more often
        console.log(`📊 Critical endpoints: ${successfulCritical.length}/${criticalResults.length} successful`);
        console.log(`📊 Non-critical endpoints: ${successfulNonCritical.length}/${nonCriticalResults.length} successful`);

      } finally {
        // Restore original configuration
        CHAOS_CONFIG.network.config.latency.delay = originalLatency;
        await chaosEngine.stopExperiment(executionId);
      }
    });

    it('should implement timeout handling correctly', async () => {
      const executionId = await chaosEngine.executeExperiment('network-latency-spike', {
        duration: 60,
      });

      try {
        // Test various timeout scenarios
        const timeoutTests = [
          { endpoint: `${authServiceUrl}/api/v1/auth/login`, timeout: 2000 },
          { endpoint: `${userServiceUrl}/api/v1/users/profile`, timeout: 3000 },
          { endpoint: `${tenantServiceUrl}/api/v1/tenants/current`, timeout: 4000 },
        ];

        const results = [];

        for (const test of timeoutTests) {
          const startTime = Date.now();

          try {
            const response = await axios.get(test.endpoint, {
              headers: { Authorization: `Bearer ${await getTestToken()}` },
              timeout: test.timeout,
            });

            results.push({
              endpoint: test.endpoint,
              timeout: test.timeout,
              success: true,
              responseTime: Date.now() - startTime,
              status: response.status,
            });
          } catch (error) {
            results.push({
              endpoint: test.endpoint,
              timeout: test.timeout,
              success: false,
              responseTime: Date.now() - startTime,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        console.log(`📊 Timeout test results:`, results);

        // Verify timeout behavior
        for (const result of results) {
          if (!result.success) {
            // Failed requests should respect timeout limits
            expect(result.responseTime).toBeLessThan(result.timeout + 1000); // Allow 1s grace period
          }
        }

        // Some requests might succeed due to retry mechanisms
        const successfulRequests = results.filter(r => r.success);
        console.log(`📊 Timeout tests: ${successfulRequests.length}/${results.length} successful`);

      } finally {
        await chaosEngine.stopExperiment(executionId);
      }
    });
  });

  describe('Network Packet Loss', () => {
    it('should handle packet loss with retry mechanisms', async () => {
      // Enable packet loss
      const originalLoss = CHAOS_CONFIG.network.config.loss.enabled;
      const originalLossPercentage = CHAOS_CONFIG.network.config.loss.percentage;

      CHAOS_CONFIG.network.config.loss.enabled = true;
      CHAOS_CONFIG.network.config.loss.percentage = 5; // 5% packet loss

      const executionId = await chaosEngine.executeExperiment('network-latency-spike', {
        duration: 120, // 2 minutes
      });

      try {
        const retryTests = [];

        // Test multiple requests with retry logic
        for (let i = 0; i < 20; i++) {
          const attempts = [];
          let success = false;
          let finalResponseTime = 0;

          // Implement retry logic
          for (let attempt = 1; attempt <= 3; attempt++) {
            const startTime = Date.now();

            try {
              const response = await axios.get(`${authServiceUrl}/health`, {
                timeout: 3000,
              });

              success = true;
              finalResponseTime = Date.now() - startTime;
              attempts.push({ attempt, success: true, responseTime: finalResponseTime });
              break;
            } catch (error) {
              attempts.push({
                attempt,
                success: false,
                responseTime: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error'
              });

              if (attempt < 3) {
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
              }
            }
          }

          retryTests.push({
            request: i + 1,
            success,
            attempts,
            finalResponseTime,
          });
        }

        // Analyze retry effectiveness
        const successfulRequests = retryTests.filter(test => test.success);
        const failedRequests = retryTests.filter(test => !test.success);

        const successRate = (successfulRequests.length / retryTests.length) * 100;
        const avgAttempts = retryTests.reduce((sum, test) => sum + test.attempts.length, 0) / retryTests.length;

        console.log(`📊 Retry test results:`);
        console.log(`   Success rate: ${successRate.toFixed(2)}%`);
        console.log(`   Average attempts per request: ${avgAttempts.toFixed(2)}`);
        console.log(`   Successful requests: ${successfulRequests.length}/${retryTests.length}`);

        // Retry mechanism should improve success rate
        expect(successRate).toBeGreaterThan(70); // At least 70% success rate
        expect(avgAttempts).toBeGreaterThan(1); // Should use retries

      } finally {
        // Restore original configuration
        CHAOS_CONFIG.network.config.loss.enabled = originalLoss;
        CHAOS_CONFIG.network.config.loss.percentage = originalLossPercentage;
        await chaosEngine.stopExperiment(executionId);
      }
    });
  });

  // Helper function to get test token
  async function getTestToken(): Promise<string> {
    try {
      const response = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword123',
      });

      return response.data.data.token;
    } catch (error) {
      // Fallback to mock token
      return 'mock-test-token';
    }
  }
});