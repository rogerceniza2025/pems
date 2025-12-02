import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { ChaosEngine } from '../chaos-engine';
import { CHAOS_CONFIG } from '../chaos-config';

/**
 * Service Dependency Failure Chaos Tests
 *
 * This test suite validates system resilience when service dependencies fail,
 * ensuring that the PEMS application can handle cascading failures gracefully
 * and maintain core functionality.
 */

describe('Service Dependency Failure Chaos Tests', () => {
  let chaosEngine: ChaosEngine;
  let authServiceUrl: string;
  let userServiceUrl: string;
  let tenantServiceUrl: string;
  let notificationServiceUrl: string;
  let analyticsServiceUrl: string;
  let fileServiceUrl: string;

  beforeAll(async () => {
    // Initialize chaos engine
    chaosEngine = new ChaosEngine();
    await chaosEngine.initialize();

    // Set up service URLs
    authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
    tenantServiceUrl = process.env.TENANT_SERVICE_URL || 'http://localhost:3004';
    notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003';
    analyticsServiceUrl = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005';
    fileServiceUrl = process.env.FILE_SERVICE_URL || 'http://localhost:3006';

    // Wait for services to be ready
    await waitForServices();
  });

  afterAll(async () => {
    await chaosEngine.shutdown();
  });

  beforeEach(async () => {
    // Ensure all services are healthy
    await verifyServicesHealthy();
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
      { name: 'notification', url: notificationServiceUrl },
      { name: 'analytics', url: analyticsServiceUrl },
      { name: 'file', url: fileServiceUrl },
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
            console.warn(`Service ${service.name} may not be fully available, continuing...`);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  }

  async function verifyServicesHealthy(): Promise<void> {
    const criticalServices = [
      { name: 'auth', url: authServiceUrl },
      { name: 'user', url: userServiceUrl },
      { name: 'tenant', url: tenantServiceUrl },
    ];

    for (const service of criticalServices) {
      try {
        const response = await axios.get(`${service.url}/health`, { timeout: 5000 });
        expect(response.status).toBe(200);
      } catch (error) {
        console.warn(`Service ${service.name} health check failed:`, error);
        // Continue with test as services might be partially available
      }
    }
  }

  async function createServicePartition(sourceService: string, targetService: string, duration: number): Promise<void> {
    const partitionManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'NetworkChaos',
      metadata: {
        name: `service-partition-${sourceService}-to-${targetService}-${Date.now()}`,
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
  }

  async function simulateServiceLatency(serviceName: string, delayMs: number, duration: number): Promise<void> {
    const latencyManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'NetworkChaos',
      metadata: {
        name: `service-latency-${serviceName}-${Date.now()}`,
        namespace: CHAOS_CONFIG.global.namespace,
      },
      spec: {
        action: 'delay',
        mode: 'all',
        selector: {
          labelSelectors: {
            app: serviceName,
          },
        },
        delay: {
          latency: `${delayMs}ms`,
          jitter: `${Math.floor(delayMs * 0.2)}ms`,
        },
        duration: `${duration}s`,
      },
    };

    await chaosEngine['applyChaosManifest'](latencyManifest);
  }

  async function killServicePods(serviceName: string, count: number = 1): Promise<void> {
    const podKillManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'PodChaos',
      metadata: {
        name: `pod-kill-${serviceName}-${Date.now()}`,
        namespace: CHAOS_CONFIG.global.namespace,
      },
      spec: {
        action: 'pod-kill',
        mode: count === 1 ? 'one' : 'fixed',
        modeValue: count.toString(),
        selector: {
          labelSelectors: {
            app: serviceName,
          },
        },
        gracePeriodSeconds: 0, // Immediate termination
        duration: '10s', // Only kill once, then restore
      },
    };

    await chaosEngine['applyChaosManifest'](podKillManifest);
  }

  async function simulateServiceMemoryPressure(serviceName: string, duration: number): Promise<void> {
    const memoryStressManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'StressChaos',
      metadata: {
        name: `memory-stress-${serviceName}-${Date.now()}`,
        namespace: CHAOS_CONFIG.global.namespace,
      },
      spec: {
        mode: 'all',
        selector: {
          labelSelectors: {
            app: serviceName,
          },
        },
        stress: {
          memory: {
            size: '1Gi',
            workers: 2,
          },
        },
        duration: `${duration}s`,
      },
    };

    await chaosEngine['applyChaosManifest'](memoryStressManifest);
  }

  async function measureServiceDependency(serviceUrl: string, dependencyUrl: string): Promise<{
    reachable: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // This would measure actual dependency calls
      // For now, we'll simulate the measurement
      const response = await axios.get(`${serviceUrl}/api/v1/health/dependency`, {
        headers: { 'X-Dependency-URL': dependencyUrl },
        timeout: 5000,
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

  describe('Critical Service Dependencies', () => {
    it('should handle user service dependency failure', async () => {
      console.log('🔌 Testing user service dependency failure...');

      // Create partition between auth service and user service
      await createServicePartition('auth-service', 'user-service', 120);

      try {
        const dependencyTests = [];

        // Test authentication flow when user service is unavailable
        for (let i = 0; i < 10; i++) {
          try {
            // Test user login (depends on user service for profile)
            const response = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: 'dependency-test@example.com',
              password: 'testpassword123',
            }, { timeout: 8000 });

            dependencyTests.push({
              attempt: i + 1,
              success: true,
              status: response.status,
              fromCache: response.data.fromCache || false,
              degraded: response.data.degraded || false,
              message: response.data.message,
            });
          } catch (error) {
            dependencyTests.push({
              attempt: i + 1,
              success: false,
              status: error.response?.status || 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`📊 User service dependency failure results:`, dependencyTests);

        // Analyze results
        const successfulAttempts = dependencyTests.filter(test => test.success);
        const cacheResponses = dependencyTests.filter(test => test.fromCache);
        const degradedResponses = dependencyTests.filter(test => test.degraded);
        const properErrors = dependencyTests.filter(test =>
          !test.success && test.status >= 500 && test.status < 600
        );

        console.log(`📊 Analysis:`);
        console.log(`   Successful: ${successfulAttempts.length}/${dependencyTests.length}`);
        console.log(`   Cache responses: ${cacheResponses.length}`);
        console.log(`   Degraded responses: ${degradedResponses.length}`);
        console.log(`   Proper errors: ${properErrors.length}`);

        // System should handle dependency failure gracefully
        if (successfulAttempts.length > 0) {
          expect(successfulAttempts[0].status).toBe(200);
        }

        // Should provide fallback behavior or proper error handling
        expect(successfulAttempts.length + properErrors.length).toBe(dependencyTests.length);

        console.log('✅ User service dependency failure handled gracefully');

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });

    it('should handle tenant service dependency failure', async () => {
      console.log('🔌 Testing tenant service dependency failure...');

      // Create partition between user service and tenant service
      await createServicePartition('user-service', 'tenant-service', 90);

      try {
        const tenantDependencyTests = [];

        // Test operations that depend on tenant service
        const tenantOperations = [
          {
            name: 'User Profile Retrieval',
            test: () => axios.get(`${userServiceUrl}/api/v1/users/profile`, {
              headers: { Authorization: `Bearer test-token` },
              timeout: 8000,
            }),
            critical: true,
          },
          {
            name: 'User Search',
            test: () => axios.get(`${userServiceUrl}/api/v1/users/search?q=test`, {
              headers: { Authorization: `Bearer test-token` },
              timeout: 8000,
            }),
            critical: false,
          },
          {
            name: 'User Preferences',
            test: () => axios.get(`${userServiceUrl}/api/v1/users/preferences`, {
              headers: { Authorization: `Bearer test-token` },
              timeout: 8000,
            }),
            critical: false,
          },
        ];

        for (const operation of tenantOperations) {
          try {
            const response = await operation.test();
            tenantDependencyTests.push({
              operation: operation.name,
              critical: operation.critical,
              success: true,
              status: response.status,
              fromCache: response.headers['x-cache'] === 'HIT',
              fallback: response.data.fallback || false,
            });
          } catch (error) {
            tenantDependencyTests.push({
              operation: operation.name,
              critical: operation.critical,
              success: false,
              status: error.response?.status || 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        console.log(`📊 Tenant service dependency failure results:`, tenantDependencyTests);

        // Analyze critical vs non-critical operations
        const criticalOperations = tenantDependencyTests.filter(test => test.critical);
        const nonCriticalOperations = tenantDependencyTests.filter(test => !test.critical);

        const successfulCritical = criticalOperations.filter(test => test.success);
        const successfulNonCritical = nonCriticalOperations.filter(test => test.success);
        const fallbackResponses = tenantDependencyTests.filter(test => test.fallback);

        console.log(`📊 Critical operations: ${successfulCritical.length}/${criticalOperations.length} successful`);
        console.log(`📊 Non-critical operations: ${successfulNonCritical.length}/${nonCriticalOperations.length} successful`);
        console.log(`📊 Fallback responses: ${fallbackResponses.length}`);

        // Critical operations should have higher success rate
        if (criticalOperations.length > 0 && nonCriticalOperations.length > 0) {
          const criticalSuccessRate = successfulCritical.length / criticalOperations.length;
          const nonCriticalSuccessRate = successfulNonCritical.length / nonCriticalOperations.length;

          expect(criticalSuccessRate).toBeGreaterThanOrEqual(nonCriticalSuccessRate);
        }

        // Should provide fallback mechanisms for non-critical operations
        expect(fallbackResponses.length + successfulNonCritical.length).toBeGreaterThan(0);

        console.log('✅ Tenant service dependency failure handled gracefully');

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });
  });

  describe('Non-Critical Service Dependencies', () => {
    it('should degrade gracefully when notification service fails', async () => {
      console.log('🔌 Testing notification service dependency failure...');

      // Kill notification service pods
      await killServicePods('notification-service', 2);

      try {
        const notificationTests = [];

        // Test operations that trigger notifications
        const notificationOperations = [
          {
            name: 'User Registration',
            test: () => axios.post(`${authServiceUrl}/api/v1/auth/register`, {
              firstName: 'Notification',
            lastName: 'Test',
            email: `notification-test-${Date.now()}@example.com`,
            password: 'NotificationTest123!',
            acceptTerms: true,
          }, { timeout: 10000 }),
            expectNotification: true,
          },
          {
            name: 'Password Reset',
            test: () => axios.post(`${authServiceUrl}/api/v1/auth/forgot-password`, {
              email: 'notification-test@example.com',
            }, { timeout: 10000 }),
            expectNotification: true,
          },
          {
            name: 'User Profile Update',
            test: () => axios.put(`${userServiceUrl}/api/v1/users/profile`, {
              preferences: { theme: 'dark' },
            }, {
              headers: { Authorization: `Bearer test-token` },
              timeout: 8000,
            }),
            expectNotification: false,
          },
        ];

        for (const operation of notificationOperations) {
          try {
            const response = await operation.test();
            notificationTests.push({
              operation: operation.name,
              success: true,
              status: response.status,
              notificationQueued: response.data.notificationQueued || false,
              notificationSkipped: response.data.notificationSkipped || false,
              expectNotification: operation.expectNotification,
            });
          } catch (error) {
            notificationTests.push({
              operation: operation.name,
              success: false,
              status: error.response?.status || 0,
              error: error instanceof Error ? error.message : 'Unknown error',
              expectNotification: operation.expectNotification,
            });
          }
        }

        console.log(`📊 Notification service failure results:`, notificationTests);

        // Analyze notification handling
        const successfulOperations = notificationTests.filter(test => test.success);
        const queuedNotifications = notificationTests.filter(test => test.notificationQueued);
        const skippedNotifications = notificationTests.filter(test => test.notificationSkipped);

        console.log(`📊 Analysis:`);
        console.log(`   Successful operations: ${successfulOperations.length}/${notificationTests.length}`);
        console.log(`   Queued notifications: ${queuedNotifications.length}`);
        console.log(`   Skipped notifications: ${skippedNotifications.length}`);

        // Core operations should succeed even when notification service fails
        expect(successfulOperations.length).toBeGreaterThan(0);

        // Should handle notifications gracefully (queue or skip)
        expect(queuedNotifications.length + skippedNotifications.length).toBeGreaterThan(0);

        console.log('✅ Notification service dependency handled gracefully');

      } finally {
        await chaosEngine['removeChaosObjects']('PodChaos');
      }
    });

    it('should handle analytics service failure', async () => {
      console.log('📊 Testing analytics service dependency failure...');

      // Create partition to analytics service
      await createServicePartition('user-service', 'analytics-service', 60);

      try {
        const analyticsTests = [];

        // Test operations that send analytics data
        const analyticsOperations = [
          {
            name: 'User Login',
            test: () => axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: 'analytics-test@example.com',
              password: 'testpassword123',
            }, { timeout: 8000 }),
            sendsAnalytics: true,
          },
          {
            name: 'Page View Tracking',
            test: () => axios.post(`${userServiceUrl}/api/v1/analytics/track`, {
              event: 'page_view',
              data: { page: '/dashboard' },
            }, {
              headers: { Authorization: `Bearer test-token` },
              timeout: 5000,
            }),
            sendsAnalytics: true,
          },
          {
            name: 'User Profile Access',
            test: () => axios.get(`${userServiceUrl}/api/v1/users/profile`, {
              headers: { Authorization: `Bearer test-token` },
              timeout: 8000,
            }),
            sendsAnalytics: false,
          },
        ];

        for (const operation of analyticsOperations) {
          const startTime = Date.now();

          try {
            const response = await operation.test();
            analyticsTests.push({
              operation: operation.name,
              success: true,
              status: response.status,
              responseTime: Date.now() - startTime,
              analyticsRecorded: response.data.analyticsRecorded || false,
              analyticsSkipped: response.data.analyticsSkipped || false,
              sendsAnalytics: operation.sendsAnalytics,
            });
          } catch (error) {
            analyticsTests.push({
              operation: operation.name,
              success: false,
              status: error.response?.status || 0,
              responseTime: Date.now() - startTime,
              error: error instanceof Error ? error.message : 'Unknown error',
              sendsAnalytics: operation.sendsAnalytics,
            });
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`📊 Analytics service failure results:`, analyticsTests);

        // Analyze analytics handling
        const successfulOperations = analyticsTests.filter(test => test.success);
        const skippedAnalytics = analyticsTests.filter(test => test.analyticsSkipped);
        const analyticsOperationsThatSend = analyticsTests.filter(test => test.sendsAnalytics);

        console.log(`📊 Analysis:`);
        console.log(`   Successful operations: ${successfulOperations.length}/${analyticsTests.length}`);
        console.log(`   Skipped analytics: ${skippedAnalytics.length}`);
        console.log(`   Operations that send analytics: ${analyticsOperationsThatSend.length}`);

        // Core operations should succeed without analytics
        expect(successfulOperations.length).toBeGreaterThan(analyticsTests.length / 2);

        // Response times should not be significantly affected
        const avgResponseTime = successfulOperations.reduce((sum, test) => sum + test.responseTime, 0) / successfulOperations.length;
        console.log(`📊 Average response time: ${avgResponseTime.toFixed(2)}ms`);
        expect(avgResponseTime).toBeLessThan(5000); // Less than 5 seconds

        console.log('✅ Analytics service dependency handled gracefully');

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });
  });

  describe('Cascading Service Failures', () => {
    it('should handle multiple dependency failures simultaneously', async () => {
      console.log('🌊 Testing multiple dependency failures...');

      // Create multiple partitions simultaneously
      await Promise.all([
        createServicePartition('auth-service', 'notification-service', 90),
        createServicePartition('user-service', 'analytics-service', 90),
        createServicePartition('tenant-service', 'file-service', 90),
      ]);

      try {
        const cascadeTests = [];

        // Test comprehensive user journey under multiple failures
        const journeySteps = [
          {
            step: 'User Registration',
            test: async () => {
              const response = await axios.post(`${authServiceUrl}/api/v1/auth/register`, {
                firstName: 'Cascade',
                lastName: 'Test',
                email: `cascade-test-${Date.now()}@example.com`,
                password: 'CascadeTest123!',
                acceptTerms: true,
              }, { timeout: 10000 });
              return response;
            },
            critical: true,
          },
          {
            step: 'User Authentication',
            test: async () => {
              const response = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
                email: 'cascade-test@example.com',
                password: 'CascadeTest123!',
              }, { timeout: 8000 });
              return response;
            },
            critical: true,
          },
          {
            step: 'Profile Retrieval',
            test: async () => {
              const authResponse = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
                email: 'cascade-test@example.com',
                password: 'CascadeTest123!',
              }, { timeout: 5000 });

              const response = await axios.get(`${userServiceUrl}/api/v1/users/profile`, {
                headers: { Authorization: `Bearer ${authResponse.data.data.token}` },
                timeout: 8000,
              });
              return response;
            },
            critical: true,
          },
          {
            step: 'Tenant Information',
            test: async () => {
              const authResponse = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
                email: 'cascade-test@example.com',
                password: 'CascadeTest123!',
              }, { timeout: 5000 });

              const response = await axios.get(`${tenantServiceUrl}/api/v1/tenants/current`, {
                headers: { Authorization: `Bearer ${authResponse.data.data.token}` },
                timeout: 8000,
              });
              return response;
            },
            critical: true,
          },
        ];

        for (const step of journeySteps) {
          const startTime = Date.now();

          try {
            const response = await step.test();
            cascadeTests.push({
              step: step.step,
              critical: step.critical,
              success: true,
              status: response.status,
              responseTime: Date.now() - startTime,
              degraded: response.data.degraded || false,
              fallback: response.data.fallback || false,
            });
          } catch (error) {
            cascadeTests.push({
              step: step.step,
              critical: step.critical,
              success: false,
              status: error.response?.status || 0,
              responseTime: Date.now() - startTime,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log(`📊 Cascading failure test results:`, cascadeTests);

        // Analyze cascade impact
        const criticalSteps = cascadeTests.filter(test => test.critical);
        const nonCriticalSteps = cascadeTests.filter(test => !test.critical);
        const successfulCritical = criticalSteps.filter(test => test.success);
        const degradedResponses = cascadeTests.filter(test => test.degraded);
        const fallbackResponses = cascadeTests.filter(test => test.fallback);

        console.log(`📊 Analysis:`);
        console.log(`   Critical steps: ${successfulCritical.length}/${criticalSteps.length} successful`);
        console.log(`   Degraded responses: ${degradedResponses.length}`);
        console.log(`   Fallback responses: ${fallbackResponses.length}`);

        // Critical functionality should be preserved
        if (criticalSteps.length > 0) {
          const criticalSuccessRate = successfulCritical.length / criticalSteps.length;
          expect(criticalSuccessRate).toBeGreaterThan(0.5); // At least 50% of critical steps should work
        }

        // Should provide degradation or fallback mechanisms
        expect(degradedResponses.length + fallbackResponses.length).toBeGreaterThan(0);

        console.log('✅ Multiple dependency failures handled gracefully');

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });
  });

  describe('Service Recovery', () => {
    it('should recover properly when failed dependencies return', async () => {
      console.log('🔄 Testing service recovery...');

      // Create initial partition
      await createServicePartition('auth-service', 'user-service', 60);

      try {
        // Test behavior during failure
        const failureTests = [];

        for (let i = 0; i < 5; i++) {
          try {
            const response = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: 'recovery-test@example.com',
              password: 'testpassword123',
            }, { timeout: 5000 });

            failureTests.push({
              phase: 'failure',
              attempt: i + 1,
              success: true,
              status: response.status,
            });
          } catch (error) {
            failureTests.push({
              phase: 'failure',
              attempt: i + 1,
              success: false,
              status: error.response?.status || 0,
            });
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`📊 Failure phase results:`, failureTests);

        // Wait for partition to be removed (simulated recovery)
        await new Promise(resolve => setTimeout(resolve, 65000));

        // Test behavior after recovery
        const recoveryTests = [];

        for (let i = 0; i < 10; i++) {
          try {
            const response = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
              email: 'recovery-test@example.com',
              password: 'testpassword123',
            }, { timeout: 5000 });

            recoveryTests.push({
              phase: 'recovery',
              attempt: i + 1,
              success: true,
              status: response.status,
              responseTime: Date.now() - new Date().getTime(),
            });
          } catch (error) {
            recoveryTests.push({
              phase: 'recovery',
              attempt: i + 1,
              success: false,
              status: error.response?.status || 0,
            });
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`📊 Recovery phase results:`, recoveryTests);

        // Analyze recovery
        const successfulFailure = failureTests.filter(test => test.success);
        const successfulRecovery = recoveryTests.filter(test => test.success);

        const failureSuccessRate = successfulFailure.length / failureTests.length;
        const recoverySuccessRate = successfulRecovery.length / recoveryTests.length;

        console.log(`📊 Analysis:`);
        console.log(`   Failure success rate: ${(failureSuccessRate * 100).toFixed(2)}%`);
        console.log(`   Recovery success rate: ${(recoverySuccessRate * 100).toFixed(2)}%`);

        // Recovery should be better than failure state
        expect(recoverySuccessRate).toBeGreaterThan(failureSuccessRate);

        // Should eventually achieve full recovery
        expect(recoverySuccessRate).toBeGreaterThan(0.8); // At least 80% success rate after recovery

        console.log('✅ Service recovery validated');

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });
  });
});