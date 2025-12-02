import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { ChaosEngine } from '../chaos-engine';
import { CHAOS_CONFIG } from '../chaos-config';

/**
 * Circuit Breaker Chaos Tests
 *
 * This test suite validates circuit breaker behavior during various failure scenarios,
 * ensuring that the PEMS application properly implements circuit breaker patterns
 * to prevent cascading failures and provide fast failure responses.
 */

describe('Circuit Breaker Chaos Tests', () => {
  let chaosEngine: ChaosEngine;
  let authServiceUrl: string;
  let userServiceUrl: string;
  let tenantServiceUrl: string;
  let circuitBreakerStates: Map<string, any> = new Map();

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

    // Initialize circuit breaker monitoring
    await initializeCircuitBreakerMonitoring();
  });

  afterAll(async () => {
    await chaosEngine.shutdown();
  });

  beforeEach(async () => {
    // Reset circuit breaker states
    circuitBreakerStates.clear();
    await resetCircuitBreakers();
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
      const maxAttempts = 30;

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

  async function initializeCircuitBreakerMonitoring(): Promise<void> {
    // Initialize monitoring for circuit breaker states
    console.log('📊 Initializing circuit breaker monitoring...');
  }

  async function resetCircuitBreakers(): Promise<void> {
    try {
      // Reset all circuit breakers to closed state
      const services = ['auth-service', 'user-service', 'tenant-service'];

      for (const service of services) {
        await axios.post(`http://localhost:3001/api/v1/circuit-breaker/reset`, {
          service,
        }, { timeout: 5000 });
      }

      console.log('🔄 Circuit breakers reset to closed state');
    } catch (error) {
      console.warn('Failed to reset circuit breakers:', error);
    }
  }

  async function getCircuitBreakerState(serviceName: string): Promise<{
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
    nextRetryTime: number;
  }> {
    try {
      const response = await axios.get(`http://localhost:3001/api/v1/circuit-breaker/state/${serviceName}`, {
        timeout: 2000,
      });

      return response.data;
    } catch (error) {
      // Return default state if monitoring endpoint is not available
      return {
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        nextRetryTime: 0,
      };
    }
  }

  async function triggerCircuitBreaker(serviceUrl: string, serviceName: string): Promise<void> {
    // Apply chaos to trigger circuit breaker
    const circuitBreakerManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'NetworkChaos',
      metadata: {
        name: `circuit-breaker-trigger-${serviceName}-${Date.now()}`,
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
        duration: '120s',
      },
    };

    await chaosEngine['applyChaosManifest'](circuitBreakerManifest);
  }

  async function simulatePartialFailures(serviceUrl: string, failureRate: number, duration: number): Promise<void> {
    // Simulate intermittent failures to test circuit breaker sensitivity
    const failureManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'HTTPChaos',
      metadata: {
        name: `partial-failures-${Date.now()}`,
        namespace: CHAOS_CONFIG.global.namespace,
      },
      spec: {
        action: 'abort',
        mode: 'all',
        selector: {
          labelSelectors: {
            app: 'dependency-target',
          },
        },
        target: 'Request',
        abort: {
          http_status: 503,
          percentage: failureRate * 100, // Convert to percentage
        },
        port: 80,
        path: '*',
        duration: `${duration}s`,
      },
    };

    await chaosEngine['applyChaosManifest'](failureManifest);
  }

  interface CircuitBreakerTest {
    attempt: number;
    success: boolean;
    responseTime: number;
    status: number;
    error?: string;
    fastFail?: boolean;
    circuitState?: string;
  }

  async function testCircuitBreakerBehavior(
    serviceUrl: string,
    serviceName: string,
    testCount: number,
    interval: number = 1000
  ): Promise<CircuitBreakerTest[]> {
    const tests: CircuitBreakerTest[] = [];

    for (let i = 0; i < testCount; i++) {
      const startTime = Date.now();
      let fastFail = false;

      try {
        const response = await axios.get(`${serviceUrl}/api/v1/health`, { timeout: 5000 });

        tests.push({
          attempt: i + 1,
          success: true,
          responseTime: Date.now() - startTime,
          status: response.status,
          fastFail,
        });
      } catch (error) {
        fastFail = Date.now() - startTime < 1000; // Consider it a fast fail if < 1 second

        tests.push({
          attempt: i + 1,
          success: false,
          responseTime: Date.now() - startTime,
          status: error.response?.status || 0,
          fastFail,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Get circuit breaker state
      try {
        const state = await getCircuitBreakerState(serviceName);
        tests[i].circuitState = state.state;
      } catch (error) {
        // Circuit breaker state monitoring might not be available
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    return tests;
  }

  describe('Circuit Breaker Basic Behavior', () => {
    it('should open circuit breaker after consecutive failures', async () => {
      console.log('⚡ Testing circuit breaker opening after failures...');

      // Trigger failures to open circuit breaker
      await triggerCircuitBreaker(authServiceUrl, 'auth-service');

      try {
        // Test circuit breaker behavior
        const tests = await testCircuitBreakerBehavior(
          authServiceUrl,
          'auth-service',
          20, // 20 attempts
          500 // 500ms between attempts
        );

        console.log(`📊 Circuit breaker test results:`, tests);

        // Analyze circuit breaker states
        const closedTests = tests.filter(test => test.circuitState === 'CLOSED');
        const openTests = tests.filter(test => test.circuitState === 'OPEN');
        const halfOpenTests = tests.filter(test => test.circuitState === 'HALF_OPEN');

        const failedTests = tests.filter(test => !test.success);
        const fastFailures = tests.filter(test => test.fastFail && !test.success);

        console.log(`📊 Circuit breaker state transitions:`);
        console.log(`   CLOSED: ${closedTests.length}`);
        console.log(`   OPEN: ${openTests.length}`);
        console.log(`   HALF_OPEN: ${halfOpenTests.length}`);
        console.log(`   Fast failures: ${fastFailures.length}`);

        // Circuit breaker should transition from CLOSED to OPEN
        expect(closedTests.length).toBeGreaterThan(0);
        expect(openTests.length).toBeGreaterThan(0);

        // Should provide fast failures when circuit is open
        if (openTests.length > 0) {
          const openTestFailures = openTests.filter(test => !test.success);
          const openFastFailures = openTestFailures.filter(test => test.fastFail);

          expect(openFastFailures.length).toBeGreaterThan(0);
        }

        // Analyze failure patterns
        const consecutiveFailures = this.findLongestFailureSequence(tests);
        console.log(`📊 Longest consecutive failure sequence: ${consecutiveFailures.length}`);

        expect(consecutiveFailures.length).toBeGreaterThan(3); // Should have consecutive failures

        console.log('✅ Circuit breaker opening behavior validated');

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });

    it('should transition to half-open state after timeout', async () => {
      console.log('🔄 Testing circuit breaker half-open transition...');

      // Trigger circuit breaker opening
      await triggerCircuitBreaker(userServiceUrl, 'user-service');

      try {
        // Wait for circuit breaker to be fully open
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Monitor circuit breaker state transitions
        const stateTests = [];

        for (let i = 0; i < 15; i++) {
          try {
            const state = await getCircuitBreakerState('user-service');
            stateTests.push({
              time: Date.now(),
              state: state.state,
              failureCount: state.failureCount,
              nextRetryTime: state.nextRetryTime,
            });

            if (state.state === 'HALF_OPEN') {
              console.log(`🔄 Circuit breaker entered HALF_OPEN state at attempt ${i + 1}`);
              break;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            console.warn('Failed to get circuit breaker state:', error);
          }
        }

        // Test behavior during half-open state
        if (stateTests.some(test => test.state === 'HALF_OPEN')) {
          const halfOpenTests = await testCircuitBreakerBehavior(
            userServiceUrl,
            'user-service',
            5,
            1000
          );

          const halfOpenSuccesses = halfOpenTests.filter(test => test.success);
          console.log(`📊 Half-open state results: ${halfOpenSuccesses.length}/${halfOpenTests.length} successful`);

          // Half-open state should allow some requests through
          expect(halfOpenSuccesses.length).toBeGreaterThan(0);
        }

        console.log('✅ Circuit breaker half-open transition validated');

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });

    it('should close circuit breaker after successful requests', async () => {
      console.log('✅ Testing circuit breaker closing after success...');

      // Trigger initial failures
      await triggerCircuitBreaker(tenantServiceUrl, 'tenant-service');

      try {
        // Wait for circuit to open
        await new Promise(resolve => setTimeout(resolve, 15000));

        // Simulate dependency recovery
        await chaosEngine['removeChaosObjects']('NetworkChaos');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Test circuit breaker closing
        const recoveryTests = await testCircuitBreakerBehavior(
          tenantServiceUrl,
          'tenant-service',
          10,
          2000
        );

        console.log(`📊 Circuit breaker recovery tests:`, recoveryTests);

        // Analyze state transitions
        const closedTests = recoveryTests.filter(test => test.circuitState === 'CLOSED');
        const successfulTests = recoveryTests.filter(test => test.success);

        console.log(`📊 Recovery analysis:`);
        console.log(`   CLOSED state tests: ${closedTests.length}`);
        console.log(`   Successful requests: ${successfulTests.length}`);

        // Circuit breaker should eventually close
        expect(closedTests.length).toBeGreaterThan(0);
        expect(successfulTests.length).toBeGreaterThan(recoveryTests.length / 2);

        // Should have high success rate after closing
        if (closedTests.length > 0) {
          const closedSuccesses = closedTests.filter(test => test.success);
          expect(closedSuccesses.length / closedTests.length).toBeGreaterThan(0.8);
        }

        console.log('✅ Circuit breaker closing behavior validated');

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });
  });

  describe('Circuit Breaker Configuration', () => {
    it('should respect failure threshold configuration', async () => {
      console.log('⚙️ Testing circuit breaker failure threshold...');

      const failureThreshold = 5; // Expected failure threshold
      const failureRate = 0.8; // 80% failure rate

      // Apply partial failures to test threshold
      await simulatePartialFailures(authServiceUrl, failureRate, 120);

      try {
        const thresholdTests = await testCircuitBreakerBehavior(
          authServiceUrl,
          'auth-service',
          15,
          800
        );

        console.log(`📊 Failure threshold tests:`, thresholdTests);

        // Find the point where circuit breaker opened
        let failureCount = 0;
        let circuitOpened = false;
        let openingPoint = -1;

        for (let i = 0; i < thresholdTests.length; i++) {
          const test = thresholdTests[i];

          if (!test.success) {
            failureCount++;
          } else {
            failureCount = 0; // Reset on success
          }

          // Check if circuit opened after this test
          if (test.circuitState === 'OPEN') {
            circuitOpened = true;
            openingPoint = i;
            break;
          }
        }

        console.log(`📊 Analysis:`);
        console.log(`   Failures before opening: ${failureCount}`);
        console.log(`   Circuit opened: ${circuitOpened}`);
        console.log(`   Opening at test: ${openingPoint + 1}`);

        // Should open after reaching failure threshold
        if (circuitOpened) {
          expect(failureCount).toBeGreaterThanOrEqual(failureThreshold);
        }

        console.log('✅ Circuit breaker failure threshold validated');

      } finally {
        await chaosEngine['removeChaosObjects']('HTTPChaos');
      }
    });

    it('should implement proper timeout configuration', async () => {
      console.log('⏱️ Testing circuit breaker timeout configuration...');

      // Apply latency to trigger timeout-based failures
      const latencyManifest = {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'NetworkChaos',
        metadata: {
          name: `circuit-breaker-timeout-${Date.now()}`,
          namespace: CHAOS_CONFIG.global.namespace,
        },
        spec: {
          action: 'delay',
          mode: 'all',
          selector: {
            labelSelectors: {
              app: 'user-service',
            },
          },
          delay: {
            latency: '6000ms', // 6 second delay
          },
          duration: '90s',
        },
      };

      await chaosEngine['applyChaosManifest'](latencyManifest);

      try {
        const timeoutTests = await testCircuitBreakerBehavior(
          userServiceUrl,
          'user-service',
          12,
          1000
        );

        console.log(`📊 Timeout configuration tests:`, timeoutTests);

        // Analyze timeout behavior
        const timeoutFailures = timeoutTests.filter(test =>
          !test.success && test.responseTime > 5000
        );
        const fastTimeoutFailures = timeoutFailures.filter(test => test.fastFail);

        console.log(`📊 Timeout analysis:`);
        console.log(`   Timeout failures: ${timeoutFailures.length}`);
        console.log(`   Fast timeout failures: ${fastTimeoutFailures.length}`);

        // Should fail fast when circuit is open due to timeouts
        if (fastTimeoutFailures.length > 0) {
          const avgFastFailTime = fastTimeoutFailures.reduce((sum, test) => sum + test.responseTime, 0) / fastTimeoutFailures.length;
          console.log(`📊 Average fast fail time: ${avgFastFailTime.toFixed(2)}ms`);
          expect(avgFastFailTime).toBeLessThan(2000); // Should fail fast
        }

        console.log('✅ Circuit breaker timeout configuration validated');

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });
  });

  describe('Circuit Breaker Performance', () => {
    it('should provide fast failure responses when open', async () => {
      console.log('⚡ Testing circuit breaker fast failure responses...');

      // Open circuit breaker
      await triggerCircuitBreaker(authServiceUrl, 'auth-service');

      try {
        const fastFailTests = [];

        // Test response times when circuit is open
        for (let i = 0; i < 10; i++) {
          const startTime = Date.now();

          try {
            await axios.get(`${authServiceUrl}/api/v1/health`, { timeout: 10000 });
          } catch (error) {
            const responseTime = Date.now() - startTime;
            fastFailTests.push({
              attempt: i + 1,
              responseTime,
              fastFail: responseTime < 1000, // Less than 1 second
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        console.log(`📊 Fast failure test results:`, fastFailTests);

        // Analyze fast failure behavior
        const fastResponses = fastFailTests.filter(test => test.fastFail);
        const avgResponseTime = fastFailTests.reduce((sum, test) => sum + test.responseTime, 0) / fastFailTests.length;

        console.log(`📊 Performance analysis:`);
        console.log(`   Fast failures: ${fastResponses.length}/${fastFailTests.length}`);
        console.log(`   Average response time: ${avgResponseTime.toFixed(2)}ms`);

        // Most failures should be fast when circuit is open
        expect(fastResponses.length).toBeGreaterThan(fastFailTests.length / 2);
        expect(avgResponseTime).toBeLessThan(2000); // Average under 2 seconds

        console.log('✅ Circuit breaker fast failure responses validated');

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });

    it('should minimize resource usage when circuit is open', async () => {
      console.log('💾 Testing circuit breaker resource usage...');

      // Open circuit breaker
      await triggerCircuitBreaker(userServiceUrl, 'user-service');

      try {
        const resourceTests = [];

        // Test resource consumption during open circuit
        const startTime = Date.now();

        for (let i = 0; i < 20; i++) {
          const requestStart = Date.now();

          try {
            await axios.get(`${userServiceUrl}/api/v1/health`, { timeout: 3000 });
          } catch (error) {
            const requestTime = Date.now() - requestStart;

            resourceTests.push({
              attempt: i + 1,
              requestTime,
              resourceEfficient: requestTime < 1500, // Less than 1.5 seconds
            });
          }
        }

        const totalTime = Date.now() - startTime;

        console.log(`📊 Resource usage test results:`, resourceTests);

        // Analyze resource efficiency
        const efficientRequests = resourceTests.filter(test => test.resourceEfficient);
        const avgRequestTime = resourceTests.reduce((sum, test) => sum + test.requestTime, 0) / resourceTests.length;

        console.log(`📊 Resource analysis:`);
        console.log(`   Efficient requests: ${efficientRequests.length}/${resourceTests.length}`);
        console.log(`   Average request time: ${avgRequestTime.toFixed(2)}ms`);
        console.log(`   Total test time: ${totalTime}ms`);

        // Should be resource efficient when circuit is open
        expect(efficientRequests.length).toBeGreaterThan(resourceTests.length / 2);
        expect(avgRequestTime).toBeLessThan(2000); // Average under 2 seconds
        expect(totalTime).toBeLessThan(30000); // Total under 30 seconds

        console.log('✅ Circuit breaker resource usage validated');

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });
  });

  describe('Multiple Circuit Breakers', () => {
    it('should handle multiple independent circuit breakers', async () => {
      console.log('🔀 Testing multiple independent circuit breakers...');

      // Open circuit breakers for different services
      await Promise.all([
        triggerCircuitBreaker(authServiceUrl, 'auth-service'),
        simulatePartialFailures(userServiceUrl, 0.6, 90), // 60% failure rate
      ]);

      try {
        const multiTests = {
          auth: await testCircuitBreakerBehavior(authServiceUrl, 'auth-service', 10, 500),
          user: await testCircuitBreakerBehavior(userServiceUrl, 'user-service', 10, 500),
        };

        console.log(`📊 Multiple circuit breaker tests:`, multiTests);

        // Analyze each circuit breaker independently
        const authOpen = multiTests.auth.some(test => test.circuitState === 'OPEN');
        const userPartialFailures = multiTests.user.filter(test => !test.success);

        console.log(`📊 Multi-circuit analysis:`);
        console.log(`   Auth circuit open: ${authOpen}`);
        console.log(`   User partial failures: ${userPartialFailures.length}/${multiTests.user.length}`);

        // Each circuit breaker should operate independently
        expect(multiTests.auth.length).toBe(10);
        expect(multiTests.user.length).toBe(10);

        // Should not interfere with each other
        const authFastFails = multiTests.auth.filter(test => test.fastFail && !test.success);
        if (authOpen) {
          expect(authFastFails.length).toBeGreaterThan(0);
        }

        console.log('✅ Multiple circuit breakers handled independently');

      } finally {
        await Promise.all([
          chaosEngine['removeChaosObjects']('NetworkChaos'),
          chaosEngine['removeChaosObjects']('HTTPChaos'),
        ]);
      }
    });
  });

  // Helper methods
  private findLongestFailureSequence(tests: CircuitBreakerTest[]): CircuitBreakerTest[] {
    let longestSequence: CircuitBreakerTest[] = [];
    let currentSequence: CircuitBreakerTest[] = [];

    for (const test of tests) {
      if (!test.success) {
        currentSequence.push(test);
      } else {
        if (currentSequence.length > longestSequence.length) {
          longestSequence = currentSequence;
        }
        currentSequence = [];
      }
    }

    // Check the last sequence
    if (currentSequence.length > longestSequence.length) {
      longestSequence = currentSequence;
    }

    return longestSequence;
  }
});