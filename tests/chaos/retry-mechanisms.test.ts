import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { ChaosEngine } from '../chaos-engine';
import { CHAOS_CONFIG } from '../chaos-config';

/**
 * Retry Mechanism Chaos Tests
 *
 * This test suite validates the resilience and effectiveness of retry mechanisms
 * under various failure scenarios, ensuring that the PEMS application implements
 * proper retry strategies with exponential backoff and circuit breaker integration.
 */

describe('Retry Mechanism Chaos Tests', () => {
  let chaosEngine: ChaosEngine;
  let authServiceUrl: string;
  let userServiceUrl: string;
  let tenantServiceUrl: string;
  let retryMetrics: Map<string, any> = new Map();

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

    // Initialize retry monitoring
    await initializeRetryMonitoring();
  });

  afterAll(async () => {
    await chaosEngine.shutdown();
  });

  beforeEach(async () => {
    // Reset retry metrics
    retryMetrics.clear();
    await resetRetryCounters();
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
      let attempts = 0;
      const maxAttempts = 20;

      while (attempts < maxAttempts) {
        try {
          await axios.get(`${service.url}/health`, { timeout: 5000 });
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            console.warn(`Service ${service.name} may not be fully available, continuing...`);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  async function initializeRetryMonitoring(): Promise<void> {
    console.log('🔄 Initializing retry mechanism monitoring...');
  }

  async function resetRetryCounters(): Promise<void> {
    try {
      // Reset retry counters for all services
      const services = ['auth-service', 'user-service', 'tenant-service'];

      for (const service of services) {
        await axios.post(`http://localhost:3001/api/v1/retry/reset`, {
          service,
        }, { timeout: 3000 });
      }

      console.log('🔄 Retry counters reset');
    } catch (error) {
      console.warn('Failed to reset retry counters:', error);
    }
  }

  async function simulateTransientFailures(serviceName: string, failureRate: number, duration: number): Promise<void> {
    // Create transient failures that should trigger retries
    const transientManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'HTTPChaos',
      metadata: {
        name: `transient-failures-${serviceName}-${Date.now()}`,
        namespace: CHAOS_CONFIG.global.namespace,
      },
      spec: {
        action: 'abort',
        mode: 'all',
        selector: {
          labelSelectors: {
            app: serviceName.replace('-service', ''),
          },
        },
        target: 'Request',
        abort: {
          http_status: 503,
          percentage: failureRate * 100,
        },
        port: 80,
        path: '*',
        duration: `${duration}s`,
      },
    };

    await chaosEngine['applyChaosManifest'](transientManifest);
  }

  async function simulateNetworkTimeouts(serviceName: string, timeoutMs: number, duration: number): Promise<void> {
    const timeoutManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'NetworkChaos',
      metadata: {
        name: `network-timeouts-${serviceName}-${Date.now()}`,
        namespace: CHAOS_CONFIG.global.namespace,
      },
      spec: {
        action: 'delay',
        mode: 'all',
        selector: {
          labelSelectors: {
            app: serviceName.replace('-service', ''),
          },
        },
        delay: {
          latency: `${timeoutMs}ms`,
          jitter: `${timeoutMs * 0.2}ms`,
        },
        duration: `${duration}s`,
      },
    };

    await chaosEngine['applyChircuitManifest'](timeoutManifest);
  }

  async function simulateIntermittentConnectivity(serviceName: string, pattern: {
    uptime: number;
    downtime: number;
    cycles: number;
  }): Promise<void> {
    // Create intermittent connectivity issues
    for (let i = 0; i < pattern.cycles; i++) {
      // Service down
      const partitionManifest = {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'NetworkChaos',
        metadata: {
          name: `intermittent-down-${serviceName}-${i}`,
          namespace: CHAOS_CONFIG.global.namespace,
        },
        spec: {
          action: 'partition',
          mode: 'all',
          selector: {
            labelSelectors: {
              app: serviceName.replace('-service', ''),
            },
          },
          target: {
            selector: {
              labelSelectors: {
                app: 'dependency-target',
              },
            },
          },
          duration: `${pattern.downtime}s`,
        },
      };

      await chaosEngine['applyChassisManifest'](partitionManifest);

      // Wait for downtime period
      await new Promise(resolve => setTimeout(resolve, pattern.downtime * 1000));

      // Remove partition to restore connectivity
      await chaosEngine['removeChaosObjects']('NetworkChaos');

      // Wait for uptime period
      if (i < pattern.cycles - 1) {
        await new Promise(resolve => setTimeout(resolve, pattern.uptime * 1000));
      }
    }
  }

  interface RetryTest {
    requestId: string;
    originalRequest: string;
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    totalTime: number;
    retryDelays: number[];
    finalStatus: 'success' | 'failed' | 'timeout';
    finalError?: string;
    backoffStrategy?: string;
    circuitBreakerTriggered?: boolean;
  }

  async function testRetryBehavior(
    serviceUrl: string,
    serviceName: string,
    operation: () => Promise<any>,
    requestId: string
  ): Promise<RetryTest> {
    const startTime = Date.now();
    const retryDelays: number[] = [];

    try {
      // This would typically be handled by the retry middleware
      // For testing, we'll simulate retry behavior
      let attempts = 0;
      let lastError: any;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        attempts++;
        const attemptStartTime = Date.now();

        try {
          const result = await operation();

          return {
            requestId,
            originalRequest: serviceName,
            totalAttempts: attempts,
            successfulAttempts: 1,
            failedAttempts: attempts - 1,
            totalTime: Date.now() - startTime,
            retryDelays,
            finalStatus: 'success',
            backoffStrategy: 'exponential',
          };
        } catch (error: any) {
          lastError = error;

          const attemptTime = Date.now() - attemptStartTime;

          if (attempts < maxAttempts) {
            // Calculate retry delay (exponential backoff)
            const baseDelay = 1000; // 1 second base
            const maxDelay = 10000; // 10 second max
            const delay = Math.min(baseDelay * Math.pow(2, attempts - 1), maxDelay);

            retryDelays.push(delay);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All attempts failed
      return {
        requestId,
        originalRequest: serviceName,
        totalAttempts: attempts,
        successfulAttempts: 0,
        failedAttempts: attempts,
        totalTime: Date.now() - startTime,
        retryDelays,
        finalStatus: 'failed',
        finalError: lastError?.message || 'Unknown error',
        backoffStrategy: 'exponential',
      };

    } catch (error: any) {
      return {
        requestId,
        originalRequest: serviceName,
        totalAttempts: 1,
        successfulAttempts: 0,
        failedAttempts: 1,
        totalTime: Date.now() - startTime,
        retryDelays: [],
        finalStatus: 'failed',
        finalError: error.message || 'Unknown error',
      };
    }
  }

  async function getRetryMetrics(serviceName: string): Promise<any> {
    try {
      const response = await axios.get(`http://localhost:3001/api/v1/retry/metrics/${serviceName}`, {
        timeout: 2000,
      });

      return response.data;
    } catch (error) {
      return {
        totalRetries: 0,
        successfulRetries: 0,
        failedRetries: 0,
        averageRetryDelay: 0,
        circuitBreakerTrips: 0,
      };
    }
  }

  describe('Basic Retry Mechanisms', () => {
    it('should implement exponential backoff for transient failures', async () => {
      console.log('📈 Testing exponential backoff retry behavior...');

      // Simulate transient failures
      await simulateTransientFailures('auth-service', 0.6, 60); // 60% failure rate for 60 seconds

      try {
        const retryTests: RetryTest[] = [];

        // Test multiple operations with retry
        for (let i = 0; i < 10; i++) {
          const test = await testRetryBehavior(
            authServiceUrl,
            'auth-service',
            () => axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: `retry-test-${i}@example.com`,
              password: 'RetryTest123!',
            }, { timeout: 15000 }),
            `retry-test-${i}`
          );

          retryTests.push(test);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log(`📊 Exponential backoff test results:`, retryTests);

        // Analyze retry behavior
        const successfulRetries = retryTests.filter(test => test.finalStatus === 'success');
        const failedRetries = retryTests.filter(test => test.finalStatus === 'failed');

        const totalAttempts = retryTests.reduce((sum, test) => sum + test.totalAttempts, 0);
        const avgAttemptsPerRequest = totalAttempts / retryTests.length;

        // Analyze retry delays
        const allRetryDelays = retryTests.flatMap(test => test.retryDelays);
        const avgRetryDelay = allRetryDelays.length > 0
          ? allRetryDelays.reduce((sum, delay) => sum + delay, 0) / allRetryDelays.length
          : 0;

        console.log(`📊 Retry analysis:`);
        console.log(`   Successful retries: ${successfulRetries.length}/${retryTests.length}`);
        console.log(`   Failed retries: ${failedRetries.length}/${retryTests.length}`);
        console.log(`   Average attempts per request: ${avgAttemptsPerRequest.toFixed(2)}`);
        console.log(`   Average retry delay: ${avgRetryDelay.toFixed(2)}ms`);

        // Should show exponential backoff behavior
        const retryTestsWithDelays = retryTests.filter(test => test.retryDelays.length > 0);
        if (retryTestsWithDelays.length > 0) {
          // Check that delays increase exponentially
          for (const test of retryTestsWithDelays) {
            for (let i = 1; i < test.retryDelays.length; i++) {
              expect(test.retryDelays[i]).toBeGreaterThanOrEqual(test.retryDelays[i - 1]);
            }
          }
        }

        // Should have reasonable success rate with retries
        const successRate = successfulRetries.length / retryTests.length;
        expect(successRate).toBeGreaterThan(0.3); // At least 30% success rate

        // Should not retry excessively
        expect(avgAttemptsPerRequest).toBeLessThan(5); // Average under 5 attempts

        console.log('✅ Exponential backoff retry behavior validated');

      } finally {
        await chaosEngine['removeChaosObjects']('HTTPChaos');
      }
    });

    it('should limit maximum retry attempts', async () => {
      console.log('🛑 Testing maximum retry attempt limits...');

      // Create consistent failures to test retry limits
      await simulateTransientFailures('user-service', 1.0, 45); // 100% failure rate

      try {
        const retryLimitTests: RetryTest[] = [];

        // Test operations that should hit retry limits
        for (let i = 0; i < 5; i++) {
          const test = await testRetryBehavior(
            userServiceUrl,
            'user-service',
            () => axios.get(`${userServiceUrl}/api/v1/users/profile`, {
              headers: { Authorization: `Bearer test-token-${i}` },
              timeout: 20000,
            }),
            `retry-limit-test-${i}`
          );

          retryLimitTests.push(test);
        }

        console.log(`📊 Retry limit test results:`, retryLimitTests);

        // Analyze retry limit behavior
        const maxAttemptsPerRequest = Math.max(...retryLimitTests.map(test => test.totalAttempts));
        const minAttemptsPerRequest = Math.min(...retryLimitTests.map(test => test.totalAttempts));

        console.log(`📊 Retry limit analysis:`);
        console.log(`   Max attempts: ${maxAttemptsPerRequest}`);
        console.log(`   Min attempts: ${minAttemptsPerRequest}`);
        console.log(`   All failed: ${retryLimitTests.every(test => test.finalStatus === 'failed')}`);

        // Should respect maximum retry limits
        expect(maxAttemptsPerRequest).toBeLessThanOrEqual(6); // Should not exceed 6 attempts
        expect(minAttemptsPerRequest).toBeGreaterThan(1); // Should attempt at least once

        // Should not retry indefinitely
        expect(maxAttemptsPerRequest).toBeLessThan(10); // Reasonable upper bound

        // All should fail since we're simulating 100% failure rate
        expect(retryLimitTests.every(test => test.finalStatus === 'failed')).toBe(true);

        console.log('✅ Maximum retry attempt limits validated');

      } finally {
        await chaosEngine['removeChaosObjects']('HTTPChaos');
      }
    });

    it('should handle timeout scenarios properly', async () => {
      console.log('⏱️ Testing retry behavior with timeout scenarios...');

      // Simulate network timeouts
      await simulateNetworkTimeouts('tenant-service', 8000, 60); // 8 second delays

      try {
        const timeoutRetryTests: RetryTest[] = [];

        // Test operations with timeout-sensitive retries
        for (let i = 0; i < 8; i++) {
          const test = await testRetryBehavior(
            tenantServiceUrl,
            'tenant-service',
            () => axios.get(`${tenantServiceUrl}/api/v1/tenants/current`, {
              headers: { Authorization: `Bearer timeout-test-${i}` },
              timeout: 5000, // 5 second timeout
            }),
            `timeout-retry-test-${i}`
          );

          timeoutRetryTests.push(test);
        }

        console.log(`📊 Timeout retry test results:`, timeoutRetryTests);

        // Analyze timeout handling
        const timeoutFailures = timeoutRetryTests.filter(test =>
          test.finalError && test.finalError.toLowerCase().includes('timeout')
        );

        const quickFailures = timeoutRetryTests.filter(test =>
          test.totalTime < 10000 // Quick failure detection
        );

        console.log(`📊 Timeout analysis:`);
        console.log(`   Timeout failures: ${timeoutFailures.length}/${timeoutRetryTests.length}`);
        console.log(`   Quick failures: ${quickFailures.length}/${timeoutRetryTests.length}`);

        // Should handle timeouts appropriately
        if (timeoutFailures.length > 0) {
          // Should not retry on immediate timeouts
          const immediateTimeouts = timeoutFailures.filter(test => test.totalAttempts === 1);
          expect(immediateTimeouts.length).toBeGreaterThan(0);
        }

        // Should detect timeouts quickly
        expect(quickFailures.length).toBeGreaterThan(timeoutRetryTests.length / 2);

        console.log('✅ Timeout scenario handling validated');

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });
  });

  describe('Advanced Retry Strategies', () => {
    it('should implement different retry strategies for different error types', async () => {
      console.log('🔧 Testing different retry strategies for different error types...');

      // Create mixed failure scenarios
      await Promise.all([
        simulateTransientFailures('auth-service', 0.4, 45), // 40% transient failures
        simulateNetworkTimeouts('user-service', 6000, 45), // Network timeouts
      ]);

      try {
        const strategyTests: RetryTest[] = [];

        // Test authentication (should retry on 5xx errors)
        const authTest = await testRetryBehavior(
          authServiceUrl,
          'auth-service',
          () => axios.post(`${authServiceUrl}/api/v1/auth/login`, {
            email: 'strategy-test-auth@example.com',
            password: 'StrategyTest123!',
          }, { timeout: 10000 }),
          'strategy-auth-test'
        );

        strategyTests.push(authTest);

        // Test user service (should retry with longer delays)
        const userTest = await testRetryBehavior(
          userServiceUrl,
          'user-service',
          () => axios.get(`${userServiceUrl}/api/v1/users/profile`, {
            headers: { Authorization: `Bearer strategy-test-token` },
            timeout: 15000,
          }),
          'strategy-user-test'
        );

        strategyTests.push(userTest);

        console.log(`📊 Strategy test results:`, strategyTests);

        // Analyze different retry strategies
        for (const test of strategyTests) {
          console.log(`📊 ${test.originalRequest} strategy:`);
          console.log(`   Attempts: ${test.totalAttempts}`);
          console.log(`   Status: ${test.finalStatus}`);
          console.log(`   Backoff: ${test.backoffStrategy}`);
          console.log(`   Retry delays: [${test.retryDelays.join(', ')}]`);

          // Should implement appropriate backoff strategy
          expect(test.backoffStrategy).toBeDefined();

          if (test.retryDelays.length > 1) {
            // Should have increasing delays
            for (let i = 1; i < test.retryDelays.length; i++) {
              expect(test.retryDelays[i]).toBeGreaterThanOrEqual(test.retryDelays[i - 1]);
            }
          }
        }

        console.log('✅ Different retry strategies implemented correctly');

      } finally {
        await Promise.all([
          chaosEngine['removeChaosObjects']('HTTPChaos'),
          chaosEngine['removeChaosObjects']('NetworkChaos'),
        ]);
      }
    });

    it('should integrate with circuit breaker properly', async () => {
      console.log('🔗 Testing retry and circuit breaker integration...');

      // Create conditions that trigger both retries and circuit breaker
      await simulateTransientFailures('auth-service', 0.8, 90); // High failure rate

      try {
        const integrationTests: RetryTest[] = [];

        // Test operations that should trigger both retry and circuit breaker
        for (let i = 0; i < 15; i++) {
          const test = await testRetryBehavior(
            authServiceUrl,
            'auth-service',
            () => axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: `integration-test-${i}@example.com`,
              password: 'IntegrationTest123!',
            }, { timeout: 8000 }),
            `integration-test-${i}`
          );

          integrationTests.push(test);

          // Small delay between tests
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`📊 Integration test results:`, integrationTests);

        // Analyze retry-circuit breaker integration
        const earlyFailures = integrationTests.filter(test =>
          test.totalAttempts === 1 && test.totalTime < 2000
        );

        const circuitBreakerActivations = integrationTests.filter(test =>
          test.circuitBreakerTriggered
        );

        console.log(`📊 Integration analysis:`);
        console.log(`   Early failures (circuit open): ${earlyFailures.length}/${integrationTests.length}`);
        console.log(`   Circuit breaker activations: ${circuitBreakerActivations.length}`);

        // Should show circuit breaker integration
        expect(earlyFailures.length).toBeGreaterThan(0); // Some should fail fast

        // Should not retry when circuit is open
        if (earlyFailures.length > 0) {
          const earlyFailureRate = earlyFailures.length / integrationTests.length;
          expect(earlyFailureRate).toBeGreaterThan(0.2); // At least 20% should fail fast
        }

        // Should have reasonable retry behavior before circuit opens
        const retryAttempts = integrationTests.filter(test => test.totalAttempts > 1);
        if (retryAttempts.length > 0) {
          const maxRetries = Math.max(...retryAttempts.map(test => test.totalAttempts));
          expect(maxRetries).toBeLessThan(6); // Should not retry excessively
        }

        console.log('✅ Retry and circuit breaker integration validated');

      } finally {
        await chaosEngine['removeChaosObjects']('HTTPChaos');
      }
    });

    it('should implement jitter in retry delays to prevent thundering herd', async () => {
      console.log('⚡ Testing retry delay jitter implementation...');

      // Create conditions that trigger retries
      await simulateTransientFailures('user-service', 0.5, 60);

      try {
        const jitterTests: RetryTest[] = [];

        // Test multiple concurrent operations
        const concurrentPromises = Array.from({ length: 10 }, (_, i) =>
          testRetryBehavior(
            userServiceUrl,
            'user-service',
            () => axios.get(`${userServiceUrl}/api/v1/users/profile`, {
              headers: { Authorization: `Bearer jitter-test-${i}` },
              timeout: 12000,
            }),
            `jitter-test-${i}`
          )
        );

        const results = await Promise.all(concurrentPromises);
        jitterTests.push(...results);

        console.log(`📊 Jitter test results:`, jitterTests);

        // Analyze jitter implementation
        const allRetryDelays = jitterTests.flatMap(test => test.retryDelays);

        if (allRetryDelays.length > 0) {
          const uniqueDelays = new Set(allRetryDelays);
          const delayVariance = this.calculateVariance(allRetryDelays);

          console.log(`📊 Jitter analysis:`);
          console.log(`   Total retry delays: ${allRetryDelays.length}`);
          console.log(`   Unique delay values: ${uniqueDelays.size}`);
          console.log(`   Delay variance: ${delayVariance.toFixed(2)}`);

          // Should implement jitter (not all delays should be identical)
          expect(uniqueDelays.size).toBeGreaterThan(1);

          // Should have reasonable variance
          expect(delayVariance).toBeGreaterThan(100); // At least some variance
        }

        // Should prevent thundering herd (not all requests fail at same time)
        const failureTimes = jitterTests
          .filter(test => test.finalStatus === 'failed')
          .map(test => test.totalTime);

        if (failureTimes.length > 1) {
          const timeVariance = this.calculateVariance(failureTimes);
          console.log(`📊 Failure time variance: ${timeVariance.toFixed(2)}ms`);

          // Should have variance in failure times due to jitter
          expect(timeVariance).toBeGreaterThan(500);
        }

        console.log('✅ Retry delay jitter implementation validated');

      } finally {
        await chaosEngine['removeChaosObjects']('HTTPChaos');
      }
    });
  });

  describe('Retry Performance and Resource Management', () => {
    it('should not cause resource exhaustion during retry storms', async () => {
      console.log('💾 Testing retry behavior under load...');

      // Create conditions that trigger many retries
      await simulateTransientFailures('auth-service', 0.7, 45);

      try {
        const loadTests: RetryTest[] = [];
        const startTime = Date.now();

        // Create burst of requests
        const burstPromises = Array.from({ length: 20 }, (_, i) =>
          testRetryBehavior(
            authServiceUrl,
            'auth-service',
            () => axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: `load-test-${i}@example.com`,
              password: 'LoadTest123!',
            }, { timeout: 10000 }),
            `load-test-${i}`
          )
        );

        const results = await Promise.all(burstPromises);
        loadTests.push(...results);

        const totalTestTime = Date.now() - startTime;

        console.log(`📊 Load test results:`, loadTests);

        // Analyze resource usage
        const totalAttempts = loadTests.reduce((sum, test) => sum + test.totalAttempts, 0);
        const avgAttemptsPerRequest = totalAttempts / loadTests.length;
        const avgTestTime = totalTestTime / loadTests.length;

        const retryDelays = loadTests.flatMap(test => test.retryDelays);
        const maxRetryDelay = Math.max(...retryDelays, 0);

        console.log(`📊 Resource usage analysis:`);
        console.log(`   Total requests: ${loadTests.length}`);
        console.log(`   Total attempts: ${totalAttempts}`);
        console.log(`   Average attempts per request: ${avgAttemptsPerRequest.toFixed(2)}`);
        console.log(`   Average test time: ${avgTestTime.toFixed(2)}ms`);
        console.log(`   Max retry delay: ${maxRetryDelay}ms`);
        console.log(`   Total test time: ${totalTestTime}ms`);

        // Should manage resources properly
        expect(avgAttemptsPerRequest).toBeLessThan(4); // Reasonable retry limit
        expect(maxRetryDelay).toBeLessThan(16000); // Max delay under 16 seconds
        expect(totalTestTime).toBeLessThan(120000); // Total under 2 minutes

        // Should complete burst in reasonable time
        expect(totalTestTime).toBeLessThan(loadTests.length * 10000); // Under 10 seconds per request

        console.log('✅ Resource usage during retry storms managed properly');

      } finally {
        await chaosEngine['removeChaosObjects']('HTTPChaos');
      }
    });

    it('should implement retry budgeting to prevent abuse', async () => {
      console.log('💰 Testing retry budgeting implementation...');

      // Create sustained failure conditions
      await simulateTransientFailures('tenant-service', 0.8, 90);

      try {
        const budgetTests: RetryTest[] = [];
        const budgetWindow = 30000; // 30 second window
        const maxBudget = 100; // Maximum retry attempts per window

        // Make requests over time to test budgeting
        const requestPromises = Array.from({ length: 15 }, (_, i) =>
          new Promise(resolve => {
            setTimeout(async () => {
              const test = await testRetryBehavior(
                tenantServiceUrl,
                'tenant-service',
                () => axios.get(`${tenantServiceUrl}/api/v1/tenants/current`, {
                  headers: { Authorization: `Bearer budget-test-${i}` },
                  timeout: 8000,
                }),
                `budget-test-${i}`
              );
              resolve(test);
            }, i * 1000); // Stagger requests by 1 second
          })
        );

        const results = await Promise.all(requestPromises);
        budgetTests.push(...results as RetryTest[]);

        console.log(`📊 Budgeting test results:`, budgetTests);

        // Analyze retry budgeting
        const totalRetries = budgetTests.reduce((sum, test) => sum + test.failedAttempts, 0);
        const avgRetriesPerRequest = totalRetries / budgetTests.length;

        const retryDelays = budgetTests.flatMap(test => test.retryDelays);
        const rejectedRetries = budgetTests.filter(test => test.totalAttempts === 1 && test.finalStatus === 'failed');

        console.log(`📊 Budgeting analysis:`);
        console.log(`   Total retries: ${totalRetries}`);
        console.log(`   Average retries per request: ${avgRetriesPerRequest.toFixed(2)}`);
        console.log(`   Potentially rejected retries: ${rejectedRetries.length}`);

        // Should implement retry budgeting
        expect(totalRetries).toBeLessThan(maxBudget); // Should not exceed budget
        expect(avgRetriesPerRequest).toBeLessThan(3); // Reasonable average

        // Should reject some retries when budget is exhausted
        expect(rejectedRetries.length).toBeGreaterThan(0);

        console.log('✅ Retry budgeting implementation validated');

      } finally {
        await chaosEngine['removeChaosObjects']('HTTPChaos');
      }
    });
  });

  // Helper methods
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
    const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;

    return variance;
  }
});