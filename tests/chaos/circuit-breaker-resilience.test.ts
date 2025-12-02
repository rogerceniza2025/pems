import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { ChaosEngine } from '../chaos-engine';
import { CHAOS_CONFIG } from '../chaos-config';

/**
 * Circuit Breaker Resilience Chaos Tests
 *
 * This test suite validates the resilience of circuit breaker implementations
 * under various chaos scenarios, testing edge cases and recovery patterns.
 */

describe('Circuit Breaker Resilience Chaos Tests', () => {
  let chaosEngine: ChaosEngine;
  let authServiceUrl: string;
  let userServiceUrl: string;
  let tenantServiceUrl: string;
  let circuitBreakerMetrics: any = {};

  beforeAll(async () => {
    chaosEngine = new ChaosEngine();
    await chaosEngine.initialize();

    authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
    tenantServiceUrl = process.env.TENANT_SERVICE_URL || 'http://localhost:3004';

    await waitForServices();
    await initializeCircuitBreakerMetrics();
  });

  afterAll(async () => {
    await chaosEngine.shutdown();
  });

  beforeEach(async () => {
    circuitBreakerMetrics = {};
    await resetCircuitBreakerStates();
  });

  afterEach(async () => {
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
      while (attempts < 20) {
        try {
          await axios.get(`${service.url}/health`, { timeout: 3000 });
          break;
        } catch (error) {
          attempts++;
          if (attempts >= 20) break;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  async function initializeCircuitBreakerMetrics(): Promise<void> {
    console.log('📊 Initializing circuit breaker metrics collection...');
  }

  async function resetCircuitBreakerStates(): Promise<void> {
    try {
      await axios.post(`${authServiceUrl}/api/v1/circuit-breaker/reset-all`, {
        timeout: 5000,
      });
    } catch (error) {
      console.warn('Failed to reset circuit breakers:', error);
    }
  }

  async function createFlakyServiceBehavior(serviceName: string, failurePattern: {
    initialFailureCount: number;
    intermittentFailureRate: number;
    recoveryDelay: number;
  }): Promise<void> {
    // Create complex failure pattern to test circuit breaker resilience
    const flakyManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'HTTPChaos',
      metadata: {
        name: `flaky-service-${serviceName}-${Date.now()}`,
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
          percentage: failurePattern.intermittentFailureRate * 100,
        },
        port: 80,
        path: '*',
        duration: `${failurePattern.recoveryDelay}s`,
      },
    };

    await chaosEngine['applyChaosManifest'](flakyManifest);
  }

  async function simulateNetworkFluctuation(serviceName: string, pattern: {
    minLatency: number;
    maxLatency: number;
    fluctuationPeriod: number;
    duration: number;
  }): Promise<void> {
    const fluctuationManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'NetworkChaos',
      metadata: {
        name: `network-fluctuation-${serviceName}-${Date.now()}`,
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
          latency: `${(pattern.minLatency + pattern.maxLatency) / 2}ms`,
          jitter: `${(pattern.maxLatency - pattern.minLatency) / 2}ms`,
        },
        duration: `${pattern.duration}s`,
      },
    };

    await chaosEngine['applyChircuitManifest'](fluctuationManifest);
  }

  interface ResilienceTest {
    timestamp: number;
    attempt: number;
    success: boolean;
    responseTime: number;
    circuitState?: string;
    failureType?: 'timeout' | 'connection' | 'server_error' | 'circuit_open';
    recovered?: boolean;
  }

  async function runResilienceTest(
    serviceUrl: string,
    serviceName: string,
    iterations: number,
    interval: number = 1000
  ): Promise<ResilienceTest[]> {
    const tests: ResilienceTest[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      let failureType: ResilienceTest['failureType'];

      try {
        const response = await axios.get(`${serviceUrl}/api/v1/health`, { timeout: 5000 });

        tests.push({
          timestamp: Date.now(),
          attempt: i + 1,
          success: true,
          responseTime: Date.now() - startTime,
        });
      } catch (error: any) {
        const responseTime = Date.now() - startTime;

        // Determine failure type
        if (error.code === 'ECONNABORTED') {
          failureType = 'timeout';
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          failureType = 'connection';
        } else if (error.response?.status >= 500) {
          failureType = 'server_error';
        } else if (responseTime < 1000) {
          failureType = 'circuit_open';
        }

        tests.push({
          timestamp: Date.now(),
          attempt: i + 1,
          success: false,
          responseTime,
          failureType,
        });
      }

      // Try to get circuit breaker state
      try {
        const stateResponse = await axios.get(`${serviceUrl}/api/v1/circuit-breaker/state`, {
          timeout: 1000,
        });
        tests[i].circuitState = stateResponse.data.state;
      } catch (error) {
        // State monitoring might not be available
      }

      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    return tests;
  }

  describe('Circuit Breaker Edge Cases', () => {
    it('should handle intermittent failures gracefully', async () => {
      console.log('🔄 Testing circuit breaker with intermittent failures...');

      // Create flaky service behavior
      await createFlakyServiceBehavior('auth-service', {
        initialFailureCount: 3,
        intermittentFailureRate: 0.3, // 30% failure rate
        recoveryDelay: 90, // 90 seconds
      });

      try {
        const resilienceTests = await runResilienceTest(
          authServiceUrl,
          'auth-service',
          20,
          800
        );

        console.log(`📊 Intermittent failure tests:`, resilienceTests);

        // Analyze circuit breaker behavior with intermittent failures
        const failureSequences = this.identifyFailureSequences(resilienceTests);
        const recoveryPatterns = this.identifyRecoveryPatterns(resilienceTests);
        const circuitStateTransitions = this.analyzeStateTransitions(resilienceTests);

        console.log(`📊 Intermittent failure analysis:`);
        console.log(`   Failure sequences: ${failureSequences.length}`);
        console.log(`   Recovery patterns: ${recoveryPatterns.length}`);
        console.log(`   State transitions:`, circuitStateTransitions);

        // Should handle intermittent failures without permanent circuit opening
        const totalFailures = resilienceTests.filter(test => !test.success).length;
        const totalSuccesses = resilienceTests.filter(test => test.success).length;
        const successRate = totalSuccesses / resilienceTests.length;

        console.log(`📊 Success rate: ${(successRate * 100).toFixed(2)}%`);
        expect(successRate).toBeGreaterThan(0.4); // At least 40% success rate

        // Should show appropriate circuit breaker behavior
        if (circuitStateTransitions.OPEN > 0) {
          expect(circuitStateTransitions.HALF_OPEN).toBeGreaterThan(0);
          expect(circuitStateTransitions.CLOSED).toBeGreaterThan(0);
        }

        console.log('✅ Intermittent failures handled gracefully');

      } finally {
        await chaosEngine['removeChaosObjects']('HTTPChaos');
      }
    });

    it('should recover from sustained failures appropriately', async () => {
      console.log('🔧 Testing circuit breaker recovery from sustained failures...');

      // Create sustained failure pattern
      await createFlakyServiceBehavior('user-service', {
        initialFailureCount: 10,
        intermittentFailureRate: 0.9, // 90% failure rate
        recoveryDelay: 60, // 60 seconds
      });

      try {
        // Test during failure period
        const failureTests = await runResilienceTest(
          userServiceUrl,
          'user-service',
          15,
          500
        );

        console.log(`📊 Sustained failure period:`, failureTests);

        // Wait for recovery simulation
        await new Promise(resolve => setTimeout(resolve, 65000));

        // Test during recovery period
        const recoveryTests = await runResilienceTest(
          userServiceUrl,
          'user-service',
          15,
          1000
        );

        console.log(`📊 Recovery period tests:`, recoveryTests);

        // Analyze recovery behavior
        const failurePeriodSuccess = failureTests.filter(test => test.success).length;
        const recoveryPeriodSuccess = recoveryTests.filter(test => test.success).length;

        const failurePeriodRate = failurePeriodSuccess / failureTests.length;
        const recoveryPeriodRate = recoveryPeriodSuccess / recoveryTests.length;

        console.log(`📊 Recovery analysis:`);
        console.log(`   Failure period success rate: ${(failurePeriodRate * 100).toFixed(2)}%`);
        console.log(`   Recovery period success rate: ${(recoveryPeriodRate * 100).toFixed(2)}%`);

        // Should show improvement in recovery period
        expect(recoveryPeriodRate).toBeGreaterThan(failurePeriodRate);

        // Recovery period should have reasonable success rate
        expect(recoveryPeriodRate).toBeGreaterThan(0.3); // At least 30% success rate

        // Should see circuit breaker state transitions
        const stateChanges = this.analyzeStateTransitions([...failureTests, ...recoveryTests]);
        expect(Object.keys(stateChanges).length).toBeGreaterThan(1);

        console.log('✅ Sustained failure recovery validated');

      } finally {
        await chaosEngine['removeChaosObjects']('HTTPChaos');
      }
    });

    it('should handle network latency fluctuations', async () => {
      console.log('⏱️ Testing circuit breaker with network latency fluctuations...');

      // Create network fluctuation pattern
      await simulateNetworkFluctuation('tenant-service', {
        minLatency: 100,
        maxLatency: 3000,
        fluctuationPeriod: 10,
        duration: 90,
      });

      try {
        const fluctuationTests = await runResilienceTest(
          tenantServiceUrl,
          'tenant-service',
          25,
          600
        );

        console.log(`📊 Network fluctuation tests:`, fluctuationTests);

        // Analyze response time patterns
        const responseTimes = fluctuationTests.map(test => test.responseTime);
        const slowResponses = fluctuationTests.filter(test => test.responseTime > 2000);
        const timeoutFailures = fluctuationTests.filter(test => test.failureType === 'timeout');

        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);
        const minResponseTime = Math.min(...responseTimes);

        console.log(`📊 Response time analysis:`);
        console.log(`   Average: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`   Min: ${minResponseTime}ms`);
        console.log(`   Max: ${maxResponseTime}ms`);
        console.log(`   Slow responses: ${slowResponses.length}`);
        console.log(`   Timeout failures: ${timeoutFailures.length}`);

        // Should handle latency fluctuations appropriately
        const successRate = fluctuationTests.filter(test => test.success).length / fluctuationTests.length;
        expect(successRate).toBeGreaterThan(0.6); // At least 60% success rate

        // Should not have excessive timeouts
        expect(timeoutFailures.length).toBeLessThan(fluctuationTests.length / 4);

        // Response times should show variation
        expect(maxResponseTime - minResponseTime).toBeGreaterThan(1000); // At least 1 second variation

        console.log('✅ Network latency fluctuations handled appropriately');

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });
  });

  describe('Circuit Breaker Stress Testing', () => {
    it('should handle high-frequency requests under stress', async () => {
      console.log('⚡ Testing circuit breaker under high-frequency requests...');

      // Create high-stress conditions
      const stressManifest = {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'PodChaos',
        metadata: {
          name: `circuit-breaker-stress-${Date.now()}`,
          namespace: CHAOS_CONFIG.global.namespace,
        },
        spec: {
          action: 'stress',
          mode: 'all',
          selector: {
            labelSelectors: {
              app: 'auth',
            },
          },
          stress: {
            cpu: {
              load: 70, // 70% CPU load
            },
            memory: {
              size: '512Mi',
            },
          },
          duration: '60s',
        },
      };

      await chaosEngine['applyChaosManifest'](stressManifest);

      try {
        const stressTests = await runResilienceTest(
          authServiceUrl,
          'auth-service',
          30,
          100 // High frequency (100ms interval)
        );

        console.log(`📊 High-frequency stress tests:`, stressTests);

        // Analyze performance under stress
        const successfulRequests = stressTests.filter(test => test.success);
        const circuitOpenFailures = stressTests.filter(test => test.failureType === 'circuit_open');
        const avgResponseTime = stressTests.reduce((sum, test) => sum + test.responseTime, 0) / stressTests.length;

        console.log(`📊 Stress analysis:`);
        console.log(`   Successful requests: ${successfulRequests.length}/${stressTests.length}`);
        console.log(`   Circuit open failures: ${circuitOpenFailures.length}`);
        console.log(`   Average response time: ${avgResponseTime.toFixed(2)}ms`);

        // Should maintain reasonable performance under stress
        const successRate = successfulRequests.length / stressTests.length;
        expect(successRate).toBeGreaterThan(0.3); // At least 30% success rate

        // Should provide fast failures when circuit is open
        if (circuitOpenFailures.length > 0) {
          const avgCircuitOpenTime = circuitOpenFailures.reduce((sum, test) => sum + test.responseTime, 0) / circuitOpenFailures.length;
          expect(avgCircuitOpenTime).toBeLessThan(1500); // Fast failures
        }

        console.log('✅ High-frequency stress test passed');

      } finally {
        await chaosEngine['removeChaosObjects']('PodChaos');
      }
    });

    it('should maintain stability during concurrent circuit breaker operations', async () => {
      console.log('🔀 Testing concurrent circuit breaker operations...');

      const concurrentTests = [];

      // Create multiple concurrent test scenarios
      const testScenarios = [
        { serviceUrl: authServiceUrl, serviceName: 'auth-service', iterations: 10 },
        { serviceUrl: userServiceUrl, serviceName: 'user-service', iterations: 10 },
        { serviceUrl: tenantServiceUrl, serviceName: 'tenant-service', iterations: 10 },
      ];

      // Apply different chaos patterns to each service
      await Promise.all([
        createFlakyServiceBehavior('auth-service', {
          initialFailureCount: 2,
          intermittentFailureRate: 0.2,
          recoveryDelay: 45,
        }),
        simulateNetworkFluctuation('user-service', {
          minLatency: 200,
          maxLatency: 1500,
          fluctuationPeriod: 5,
          duration: 45,
        }),
        createFlakyServiceBehavior('tenant-service', {
          initialFailureCount: 1,
          intermittentFailureRate: 0.15,
          recoveryDelay: 45,
        }),
      ]);

      try {
        // Run tests concurrently
        const concurrentPromises = testScenarios.map(scenario =>
          runResilienceTest(
            scenario.serviceUrl,
            scenario.serviceName,
            scenario.iterations,
            300
          ).then(results => ({
            serviceName: scenario.serviceName,
            results,
          }))
        );

        const concurrentResults = await Promise.all(concurrentPromises);

        console.log(`📊 Concurrent test results:`, concurrentResults);

        // Analyze concurrent behavior
        for (const result of concurrentResults) {
          const successRate = result.results.filter(test => test.success).length / result.results.length;
          const avgResponseTime = result.results.reduce((sum, test) => sum + test.responseTime, 0) / result.results.length;

          console.log(`📊 ${result.serviceName}:`);
          console.log(`   Success rate: ${(successRate * 100).toFixed(2)}%`);
          console.log(`   Avg response time: ${avgResponseTime.toFixed(2)}ms`);

          // Each service should maintain reasonable performance
          expect(successRate).toBeGreaterThan(0.4); // At least 40% success rate
          expect(avgResponseTime).toBeLessThan(3000); // Under 3 seconds
        }

        console.log('✅ Concurrent circuit breaker operations handled successfully');

      } finally {
        await Promise.all([
          chaosEngine['removeChaosObjects']('HTTPChaos'),
          chaosEngine['removeChaosObjects']('NetworkChaos'),
        ]);
      }
    });
  });

  // Helper methods
  private identifyFailureSequences(tests: ResilienceTest[]): Array<{ start: number; length: number; end: number }> {
    const sequences = [];
    let currentSequence = null;

    for (let i = 0; i < tests.length; i++) {
      if (!tests[i].success) {
        if (!currentSequence) {
          currentSequence = { start: i, length: 1, end: i };
        } else {
          currentSequence.length++;
          currentSequence.end = i;
        }
      } else {
        if (currentSequence) {
          sequences.push(currentSequence);
          currentSequence = null;
        }
      }
    }

    if (currentSequence) {
      sequences.push(currentSequence);
    }

    return sequences;
  }

  private identifyRecoveryPatterns(tests: ResilienceTest[]): Array<{ failureIndex: number; recoveryIndex: number; recoveryTime: number }> {
    const patterns = [];

    for (let i = 0; i < tests.length - 1; i++) {
      if (!tests[i].success && tests[i + 1].success) {
        patterns.push({
          failureIndex: i,
          recoveryIndex: i + 1,
          recoveryTime: tests[i + 1].timestamp - tests[i].timestamp,
        });
      }
    }

    return patterns;
  }

  private analyzeStateTransitions(tests: ResilienceTest[]): Record<string, number> {
    const transitions: Record<string, number> = {
      CLOSED: 0,
      OPEN: 0,
      HALF_OPEN: 0,
    };

    for (const test of tests) {
      if (test.circuitState && transitions.hasOwnProperty(test.circuitState)) {
        transitions[test.circuitState]++;
      }
    }

    return transitions;
  }
});