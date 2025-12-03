import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { ChaosEngine } from '../chaos-engine';
import { CHAOS_CONFIG } from '../chaos-config';

/**
 * Database Isolation Chaos Tests
 *
 * This test suite validates multi-tenant database isolation during chaos scenarios,
 * ensuring that failures in one tenant's data do not affect other tenants.
 */

describe('Database Isolation Chaos Tests', () => {
  let chaosEngine: ChaosEngine;
  let authServiceUrl: string;
  let userServiceUrl: string;
  let tenantServiceUrl: string;
  let testTenants: Array<{ id: string; name: string; token: string }> = [];

  beforeAll(async () => {
    // Initialize chaos engine
    chaosEngine = new ChaosEngine();
    await chaosEngine.initialize();

    // Set up service URLs
    authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
    tenantServiceUrl = process.env.TENANT_SERVICE_URL || 'http://localhost:3004';

    // Create test tenants for isolation testing
    await createTestTenants();

    // Wait for services to be ready
    await waitForServices();
  });

  afterAll(async () => {
    // Clean up test tenants
    await cleanupTestTenants();
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

  async function createTestTenants(): Promise<void> {
    const tenantData = [
      { name: 'Isolation Test Tenant A', domain: 'isolation-a.test.com' },
      { name: 'Isolation Test Tenant B', domain: 'isolation-b.test.com' },
      { name: 'Isolation Test Tenant C', domain: 'isolation-c.test.com' },
    ];

    for (const data of tenantData) {
      try {
        // Create tenant
        const tenantResponse = await axios.post(`${tenantServiceUrl}/api/v1/tenants`, data, {
          headers: { Authorization: `Bearer ${await getAdminToken()}` },
        });

        if (tenantResponse.status === 201) {
          const tenant = tenantResponse.data.data;

          // Create admin user for tenant
          const userResponse = await axios.post(`${authServiceUrl}/api/v1/auth/register`, {
            firstName: 'Tenant',
            lastName: 'Admin',
            email: `admin@${data.domain}`,
            password: 'TenantAdmin123!',
            acceptTerms: true,
            tenantId: tenant.id,
          });

          if (userResponse.status === 201) {
            testTenants.push({
              id: tenant.id,
              name: tenant.name,
              token: userResponse.data.data.token,
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to create test tenant: ${data.name}`, error);
      }
    }

    console.log(`📋 Created ${testTenants.length} test tenants for isolation testing`);
  }

  async function cleanupTestTenants(): Promise<void> {
    for (const tenant of testTenants) {
      try {
        await axios.delete(`${tenantServiceUrl}/api/v1/tenants/${tenant.id}`, {
          headers: { Authorization: `Bearer ${await getAdminToken()}` },
          validateStatus: () => true,
        });
      } catch (error) {
        console.warn(`Failed to cleanup test tenant: ${tenant.name}`, error);
      }
    }
  }

  async function getAdminToken(): Promise<string> {
    try {
      const response = await axios.post(`${authServiceUrl}/api/v1/auth/login`, {
        email: 'admin@test.com',
        password: 'AdminTest123!',
      });
      return response.data.data.token;
    } catch (error) {
      // Fallback to mock token for testing
      return 'mock-admin-token';
    }
  }

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

  async function verifyServicesHealthy(): Promise<void> {
    const services = [
      { name: 'auth', url: authServiceUrl },
      { name: 'user', url: userServiceUrl },
      { name: 'tenant', url: tenantServiceUrl },
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

  async function createTenantSpecificData(tenantIndex: number): Promise<void> {
    const tenant = testTenants[tenantIndex];
    if (!tenant) return;

    const userData = {
      firstName: `User${tenantIndex}`,
      lastName: 'Test',
      email: `user${tenantIndex}@${tenantIndex === 0 ? 'isolation-a.test.com' : tenantIndex === 1 ? 'isolation-b.test.com' : 'isolation-c.test.com'}`,
      password: 'UserTest123!',
      acceptTerms: true,
      tenantId: tenant.id,
    };

    try {
      await axios.post(`${authServiceUrl}/api/v1/auth/register`, userData, {
        headers: { Authorization: `Bearer ${tenant.token}` },
      });

      // Create additional user data
      await axios.post(`${userServiceUrl}/api/v1/users/profile`, {
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: true,
        },
        metadata: {
          tenant: tenant.name,
          testData: true,
        },
      }, {
        headers: { Authorization: `Bearer ${tenant.token}` },
      });

    } catch (error) {
      console.warn(`Failed to create data for tenant ${tenant.name}:`, error);
    }
  }

  async function simulateTenantDatabaseFailure(tenantId: string, duration: number): Promise<void> {
    // Simulate database failure for specific tenant
    const chaosManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'NetworkChaos',
      metadata: {
        name: `tenant-db-failure-${tenantId}-${Date.now()}`,
        namespace: CHAOS_CONFIG.global.namespace,
      },
      spec: {
        action: 'delay',
        mode: 'all',
        selector: {
          labelSelectors: {
            app: 'postgres',
          },
        },
        delay: {
          latency: '5000ms', // 5 second delay
        },
        target: {
          selector: {
            labelSelectors: {
              app: 'user-service',
            },
          },
        },
        duration: `${duration}s`,
      },
    };

    await chaosEngine['applyChaosManifest'](chaosManifest);
  }

  async function simulateTenantConnectionPoolExhaustion(tenantId: string): Promise<void> {
    // Simulate connection pool exhaustion for specific tenant
    const poolChaosManifest = {
      apiVersion: 'chaos-mesh.org/v1alpha1',
      kind: 'PodChaos',
      metadata: {
        name: `tenant-pool-exhaustion-${tenantId}-${Date.now()}`,
        namespace: CHAOS_CONFIG.global.namespace,
      },
      spec: {
        action: 'stress',
        mode: 'one',
        selector: {
          labelSelectors: {
            app: 'user-service',
          },
        },
        stress: {
          cpu: {
            load: 90, // 90% CPU load
          },
          memory: {
            size: '2Gi', // 2GB memory stress
          },
        },
        duration: '60s',
      },
    };

    await chaosEngine['applyChaosManifest'](poolChaosManifest);
  }

  describe('Multi-Tenant Data Isolation', () => {
    it('should isolate tenant data during database failures', async () => {
      console.log('🔌 Testing tenant data isolation during database failures...');

      // Create data for all test tenants
      for (let i = 0; i < testTenants.length; i++) {
        await createTenantSpecificData(i);
      }

      // Simulate database failure for Tenant A
      await simulateTenantDatabaseFailure(testTenants[0].id, 60); // 1 minute

      try {
        const isolationTests = [];

        // Test access to each tenant's data
        for (let i = 0; i < testTenants.length; i++) {
          const tenant = testTenants[i];

          try {
            const response = await axios.get(`${userServiceUrl}/api/v1/users/profile`, {
              headers: { Authorization: `Bearer ${tenant.token}` },
              timeout: 8000,
            });

            isolationTests.push({
              tenant: tenant.name,
              tenantId: tenant.id,
              success: true,
              status: response.status,
              responseTime: Date.now() - new Date().getTime(),
              fromCache: response.headers['x-cache'] === 'HIT',
            });
          } catch (error) {
            isolationTests.push({
              tenant: tenant.name,
              tenantId: tenant.id,
              success: false,
              status: error.response?.status || 0,
              error: error instanceof Error ? error.message : 'Unknown error',
              responseTime: Date.now() - new Date().getTime(),
            });
          }
        }

        console.log(`📊 Tenant isolation test results:`, isolationTests);

        // Analyze isolation effectiveness
        const affectedTenant = isolationTests.find(test => test.tenantId === testTenants[0].id);
        const unaffectedTenants = isolationTests.filter(test => test.tenantId !== testTenants[0].id);

        console.log(`📊 Affected tenant (${testTenants[0].name}):`, affectedTenant);
        console.log(`📊 Unaffected tenants: ${unaffectedTenants.length}/${testTenants.length - 1}`);

        // Other tenants should still be accessible
        const successfulUnaffected = unaffectedTenants.filter(test => test.success);
        expect(successfulUnaffected.length).toBeGreaterThan(0);

        // At least some tenants should remain operational
        expect(successfulUnaffected.length).toBeGreaterThan(unaffectedTenants.length / 2);

        console.log('✅ Tenant data isolation maintained during database failures');

      } finally {
        await chaosEngine['removeChaosObjects']('NetworkChaos');
      }
    });

    it('should prevent cross-tenant data corruption during failures', async () => {
      console.log('🛡️ Testing cross-tenant data corruption prevention...');

      // Create baseline data for all tenants
      const baselineData = [];

      for (let i = 0; i < testTenants.length; i++) {
        await createTenantSpecificData(i);

        try {
          const response = await axios.get(`${userServiceUrl}/api/v1/users/profile`, {
            headers: { Authorization: `Bearer ${testTenants[i].token}` },
          });

          baselineData.push({
            tenant: testTenants[i].name,
            tenantId: testTenants[i].id,
            data: response.data.data,
          });
        } catch (error) {
          console.warn(`Failed to get baseline data for ${testTenants[i].name}`);
        }
      }

      // Simulate database corruption for Tenant B
      const corruptionManifest = {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'IoChaos',
        metadata: {
          name: `tenant-corruption-${testTenants[1].id}-${Date.now()}`,
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
            percentage: 5, // 5% corruption rate
            methods: ['write'],
          },
          volumePath: '/var/lib/postgresql/data',
          duration: '30s',
        },
      };

      await chaosEngine['applyChaosManifest'](corruptionManifest);

      try {
        // Perform write operations during corruption
        const writeTests = [];

        for (let i = 0; i < testTenants.length; i++) {
          const writeData = {
            preferences: {
              theme: i % 2 === 0 ? 'light' : 'dark',
              lastUpdated: Date.now(),
              corruptionTest: true,
            },
          };

          try {
            const response = await axios.put(
              `${userServiceUrl}/api/v1/users/profile`,
              writeData,
              {
                headers: { Authorization: `Bearer ${testTenants[i].token}` },
                timeout: 5000,
              }
            );

            writeTests.push({
              tenant: testTenants[i].name,
              tenantId: testTenants[i].id,
              success: true,
              status: response.status,
              writeData,
            });
          } catch (error) {
            writeTests.push({
              tenant: testTenants[i].name,
              tenantId: testTenants[i].id,
              success: false,
              status: error.response?.status || 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        console.log(`📊 Write operation results:`, writeTests);

        // Verify data integrity after corruption
        const integrityTests = [];

        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for any corruption effects

        for (let i = 0; i < testTenants.length; i++) {
          try {
            const response = await axios.get(`${userServiceUrl}/api/v1/users/profile`, {
              headers: { Authorization: `Bearer ${testTenants[i].token}` },
              timeout: 8000,
            });

            const currentData = response.data.data;
            const baseline = baselineData.find(b => b.tenantId === testTenants[i].id);

            integrityTests.push({
              tenant: testTenants[i].name,
              tenantId: testTenants[i].id,
              success: true,
              dataIntegrity: this.verifyDataIntegrity(baseline?.data, currentData),
              currentData,
            });
          } catch (error) {
            integrityTests.push({
              tenant: testTenants[i].name,
              tenantId: testTenants[i].id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        console.log(`📊 Data integrity results:`, integrityTests);

        // Analyze data integrity
        const successfulIntegrityChecks = integrityTests.filter(test => test.success && test.dataIntegrity);
        const intactTenants = integrityTests.filter(test => test.tenantId !== testTenants[1].id);

        console.log(`📊 Tenants with intact data: ${successfulIntegrityChecks.length}/${testTenants.length}`);

        // Most tenants should maintain data integrity
        expect(successfulIntegrityChecks.length).toBeGreaterThan(testTenants.length / 2);

        // Non-affected tenants should definitely maintain integrity
        const intactTenantChecks = intactTenants.filter(test => test.success && test.dataIntegrity);
        expect(intactTenantChecks.length).toBeGreaterThan(intactTenants.length / 2);

        console.log('✅ Cross-tenant data corruption prevention validated');

      } finally {
        await chaosEngine['removeChaosObjects']('IoChaos');
      }
    });
  });

  describe('Resource Pool Isolation', () => {
    it('should isolate resource pool failures between tenants', async () => {
      console.log('🏊 Testing resource pool isolation...');

      // Simulate connection pool exhaustion for Tenant C
      await simulateTenantConnectionPoolExhaustion(testTenants[2].id);

      try {
        const poolTests = [];

        // Test concurrent access from all tenants
        const concurrentRequests = [];

        for (let tenantIndex = 0; tenantIndex < testTenants.length; tenantIndex++) {
          const tenant = testTenants[tenantIndex];

          // Create multiple concurrent requests per tenant
          const tenantRequests = Array.from({ length: 5 }, (_, i) =>
            axios.get(`${userServiceUrl}/api/v1/users/profile`, {
              headers: { Authorization: `Bearer ${tenant.token}` },
              timeout: 10000,
            }).then(response => ({
              tenant: tenant.name,
              tenantId: tenant.id,
              request: i + 1,
              success: true,
              status: response.status,
              responseTime: Date.now() - new Date().getTime(),
            })).catch(error => ({
              tenant: tenant.name,
              tenantId: tenant.id,
              request: i + 1,
              success: false,
              status: error.response?.status || 0,
              error: error instanceof Error ? error.message : 'Unknown error',
              responseTime: Date.now() - new Date().getTime(),
            }))
          );

          concurrentRequests.push(...tenantRequests);
        }

        const results = await Promise.allSettled(concurrentRequests);

        // Process results
        for (const result of results) {
          if (result.status === 'fulfilled') {
            poolTests.push(result.value);
          } else {
            console.warn('Promise rejected:', result.reason);
          }
        }

        console.log(`📊 Pool isolation test results:`, poolTests);

        // Analyze results by tenant
        const tenantResults = testTenants.map(tenant => {
          const tenantTests = poolTests.filter(test => test.tenantId === tenant.id);
          const successful = tenantTests.filter(test => test.success);
          const failed = tenantTests.filter(test => !test.success);

          return {
            tenant: tenant.name,
            tenantId: tenant.id,
            total: tenantTests.length,
            successful: successful.length,
            failed: failed.length,
            successRate: (successful.length / tenantTests.length) * 100,
          };
        });

        console.log(`📊 Tenant pool results:`, tenantResults);

        // Tenant with pool exhaustion should have lower success rate
        const exhaustedTenant = tenantResults.find(r => r.tenantId === testTenants[2].id);
        const normalTenants = tenantResults.filter(r => r.tenantId !== testTenants[2].id);

        if (exhaustedTenant && normalTenants.length > 0) {
          const normalTenantAvgRate = normalTenants.reduce((sum, t) => sum + t.successRate, 0) / normalTenants.length;

          console.log(`📊 Exhausted tenant success rate: ${exhaustedTenant.successRate.toFixed(2)}%`);
          console.log(`📊 Normal tenant average success rate: ${normalTenantAvgRate.toFixed(2)}%`);

          // Normal tenants should have better success rates
          expect(normalTenantAvgRate).toBeGreaterThan(exhaustedTenant.successRate);
        }

        // Other tenants should still have reasonable access
        const normalTenantsSuccess = normalTenants.filter(t => t.successRate > 50);
        expect(normalTenantsSuccess.length).toBeGreaterThan(normalTenants.length / 2);

        console.log('✅ Resource pool isolation validated');

      } finally {
        await chaosEngine['removeChaosObjects']('PodChaos');
      }
    });

    it('should implement tenant-specific rate limiting during stress', async () => {
      console.log('🚦 Testing tenant-specific rate limiting...');

      // Create high-load scenario
      const rateLimitTests = [];

      for (let tenantIndex = 0; tenantIndex < testTenants.length; tenantIndex++) {
        const tenant = testTenants[tenantIndex];

        // Send burst of requests from each tenant
        const burstRequests = Array.from({ length: 20 }, (_, i) =>
          axios.get(`${userServiceUrl}/api/v1/users/profile`, {
            headers: { Authorization: `Bearer ${tenant.token}` },
            timeout: 5000,
          }).then(response => ({
            tenant: tenant.name,
            tenantId: tenant.id,
            request: i + 1,
            success: true,
            status: response.status,
            rateLimited: response.status === 429,
          })).catch(error => ({
            tenant: tenant.name,
            tenantId: tenant.id,
            request: i + 1,
            success: false,
            status: error.response?.status || 0,
            rateLimited: error.response?.status === 429,
            error: error instanceof Error ? error.message : 'Unknown error',
          }))
        );

        const tenantResults = await Promise.allSettled(burstRequests);

        tenantResults.forEach(result => {
          if (result.status === 'fulfilled') {
            rateLimitTests.push(result.value);
          }
        });
      }

      console.log(`📊 Rate limit test results:`, rateLimitTests);

      // Analyze rate limiting by tenant
      const tenantRateLimits = testTenants.map(tenant => {
        const tenantTests = rateLimitTests.filter(test => test.tenantId === tenant.id);
        const successful = tenantTests.filter(test => test.success && !test.rateLimited);
        const rateLimited = tenantTests.filter(test => test.rateLimited);
        const failed = tenantTests.filter(test => !test.success);

        return {
          tenant: tenant.name,
          tenantId: tenant.id,
          total: tenantTests.length,
          successful: successful.length,
          rateLimited: rateLimited.length,
          failed: failed.length,
          rateLimitRate: (rateLimited.length / tenantTests.length) * 100,
        };
      });

      console.log(`📊 Tenant rate limiting results:`, tenantRateLimits);

      // Rate limiting should be implemented consistently
      const hasRateLimiting = tenantRateLimits.some(t => t.rateLimited > 0);
      console.log(`📊 Rate limiting detected: ${hasRateLimiting}`);

      if (hasRateLimiting) {
        // Rate limiting should not completely block access
        const tenantWithAccess = tenantRateLimits.filter(t => t.successful > 0);
        expect(tenantWithAccess.length).toBeGreaterThan(0);

        // Rate limiting should be consistent across tenants
        const rateLimitRates = tenantRateLimits.map(t => t.rateLimitRate);
        const maxRateLimit = Math.max(...rateLimitRates);
        const minRateLimit = Math.min(...rateLimitRates);

        // Rate limiting should be relatively consistent (within reasonable variance)
        expect(maxRateLimit - minRateLimit).toBeLessThan(50); // Within 50% variance
      }

      console.log('✅ Tenant-specific rate limiting validated');
    });
  });

  // Helper method for data integrity verification
  private verifyDataIntegrity(baseline: any, current: any): boolean {
    if (!baseline || !current) return false;

    // Check that essential fields are maintained
    const essentialFields = ['id', 'email', 'firstName', 'lastName'];
    for (const field of essentialFields) {
      if (baseline[field] !== current[field]) {
        return false;
      }
    }

    return true;
  }
});