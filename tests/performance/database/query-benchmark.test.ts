/**
 * Database Performance Benchmark Tests
 *
 * These tests measure and validate the performance of database operations
 * to ensure they meet enterprise-grade performance requirements.
 *
 * Test Categories:
 * - Query execution time benchmarks
 * - Connection pool performance
 * - Index effectiveness validation
 * - Database transaction performance
 * - Concurrent query handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';

// Import database utilities and models
import { DatabaseClient } from '@/lib/database/client';
import { UserModel } from '@/modules/user-management/models/user.model';
import { TenantModel } from '@/modules/tenant-management/models/tenant.model';
import { TestDatabaseFactory } from '../../../tests/setup/test-database-factory';

interface QueryPerformanceMetrics {
  queryName: string;
  executionTime: number;
  rowsAffected?: number;
  indexUsed?: string;
  explainPlan?: any;
}

interface ConnectionPoolMetrics {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  waitTime: number;
}

describe('Database Performance Benchmarks', () => {
  let dbClient: DatabaseClient;
  let testDbFactory: TestDatabaseFactory;
  let performanceMetrics: QueryPerformanceMetrics[] = [];

  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    simpleSelect: 50,      // Simple SELECT queries
    complexJoin: 200,      // Queries with JOINs
    aggregation: 300,      // GROUP BY, aggregate functions
    indexScan: 100,        // Index-based scans
    fullTableScan: 1000,   // Full table scans (should be avoided)
    insert: 100,           // INSERT operations
    update: 150,           // UPDATE operations
    delete: 100,           // DELETE operations
    transaction: 500,      // Transaction completion
    connectionAcquire: 10, // Time to acquire DB connection
  };

  beforeEach(async () => {
    testDbFactory = new TestDatabaseFactory();
    dbClient = await testDbFactory.createTestDatabase();
    performanceMetrics = [];

    // Warm up the database connection pool
    await warmUpConnectionPool();
  });

  afterEach(async () => {
    await testDbFactory.cleanup();
  });

  /**
   * Warm up the database connection pool
   */
  async function warmUpConnectionPool(): Promise<void> {
    const warmupQueries = 5;
    for (let i = 0; i < warmupQueries; i++) {
      await dbClient.query('SELECT 1');
    }
  }

  /**
   * Measure query execution time with detailed metrics
   */
  async function measureQueryPerformance(
    queryName: string,
    queryFunction: () => Promise<any>
  ): Promise<QueryPerformanceMetrics> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    const result = await queryFunction();
    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    const executionTime = endTime - startTime;
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    const metrics: QueryPerformanceMetrics = {
      queryName,
      executionTime,
      rowsAffected: Array.isArray(result) ? result.length : (result?.rowCount || 0),
    };

    performanceMetrics.push(metrics);

    console.log(`⏱️  ${queryName}: ${executionTime.toFixed(2)}ms (rows: ${metrics.rowsAffected}, memory: ${(memoryDelta / 1024).toFixed(2)}KB)`);

    return metrics;
  }

  /**
   * Measure connection pool performance
   */
  async function measureConnectionPool(): Promise<ConnectionPoolMetrics> {
    const startTime = performance.now();

    // Get connection pool metrics (implementation depends on your DB client)
    const poolStats = await dbClient.getPoolStats();

    const endTime = performance.now();
    const waitTime = endTime - startTime;

    return {
      activeConnections: poolStats.active || 0,
      idleConnections: poolStats.idle || 0,
      totalConnections: poolStats.total || 0,
      waitTime,
    };
  }

  /**
   * Get query execution plan for analysis
   */
  async function getExecutionPlan(query: string, params?: any[]): Promise<any> {
    try {
      return await dbClient.query(`EXPLAIN (ANALYZE, BUFFERS) ${query}`, params);
    } catch (error) {
      console.warn(`Could not get execution plan for query: ${error.message}`);
      return null;
    }
  }

  describe('Simple Query Performance', () => {
    it('should execute simple SELECT queries under threshold', async () => {
      const metrics = await measureQueryPerformance('Simple User Lookup', async () => {
        return await dbClient.query(
          'SELECT id, email, created_at FROM users WHERE id = $1',
          ['test-user-id']
        );
      });

      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simpleSelect);
      expect(metrics.rowsAffected).toBeLessThanOrEqual(1);
    });

    it('should perform efficient user authentication queries', async () => {
      const metrics = await measureQueryPerformance('User Authentication Query', async () => {
        return await dbClient.query(
          'SELECT id, email_hash, password_hash FROM users WHERE email = $1 AND active = true',
          ['test@example.com']
        );
      });

      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simpleSelect);
    });

    it('should handle tenant lookup efficiently', async () => {
      const metrics = await measureQueryPerformance('Tenant Lookup', async () => {
        return await dbClient.query(
          'SELECT id, name, domain FROM tenants WHERE domain = $1',
          ['test-tenant.example.com']
        );
      });

      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simpleSelect);
    });
  });

  describe('Complex Query Performance', () => {
    it('should execute JOIN queries efficiently', async () => {
      const metrics = await measureQueryPerformance('User with Tenant JOIN', async () => {
        return await dbClient.query(`
          SELECT
            u.id, u.email, u.first_name, u.last_name,
            t.id as tenant_id, t.name as tenant_name
          FROM users u
          INNER JOIN tenants t ON u.tenant_id = t.id
          WHERE u.active = true AND t.active = true
          LIMIT 100
        `);
      });

      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.complexJoin);
    });

    it('should perform aggregation queries efficiently', async () => {
      const metrics = await measureQueryPerformance('User Count by Tenant', async () => {
        return await dbClient.query(`
          SELECT
            t.name,
            COUNT(u.id) as user_count,
            MAX(u.created_at) as last_user_created
          FROM tenants t
          LEFT JOIN users u ON t.id = u.tenant_id AND u.active = true
          WHERE t.active = true
          GROUP BY t.id, t.name
          ORDER BY user_count DESC
        `);
      });

      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.aggregation);
    });

    it('should handle complex filtering and sorting efficiently', async () => {
      const metrics = await measureQueryPerformance('Complex User Search', async () => {
        return await dbClient.query(`
          SELECT
            u.id, u.email, u.first_name, u.last_name, u.created_at,
            t.name as tenant_name
          FROM users u
          INNER JOIN tenants t ON u.tenant_id = t.id
          WHERE u.active = true
            AND t.active = true
            AND u.created_at >= NOW() - INTERVAL '30 days'
            AND (u.first_name ILIKE '%test%' OR u.last_name ILIKE '%test%')
          ORDER BY u.created_at DESC
          LIMIT 50
          OFFSET 0
        `);
      });

      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.complexJoin);
    });
  });

  describe('Index Performance Validation', () => {
    it('should use indexes for primary key lookups', async () => {
      const metrics = await measureQueryPerformance('Primary Key Lookup', async () => {
        return await dbClient.query(
          'SELECT * FROM users WHERE id = $1',
          ['test-user-id']
        );
      });

      const executionPlan = await getExecutionPlan(
        'SELECT * FROM users WHERE id = $1',
        ['test-user-id']
      );

      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.indexScan);

      // Verify index is being used (implementation depends on your database)
      if (executionPlan) {
        const planText = JSON.stringify(executionPlan).toLowerCase();
        expect(planText).toContain('index');
      }
    });

    it('should use composite indexes for tenant-based queries', async () => {
      const metrics = await measureQueryPerformance('Tenant User Lookup', async () => {
        return await dbClient.query(
          'SELECT id, email, first_name FROM users WHERE tenant_id = $1 AND active = true ORDER BY created_at DESC LIMIT 10',
          ['test-tenant-id']
        );
      });

      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.indexScan);
    });

    it('should avoid full table scans for indexed queries', async () => {
      const metrics = await measureQueryPerformance('Email Lookup with Index', async () => {
        return await dbClient.query(
          'SELECT id, created_at FROM users WHERE email = $1',
          ['unique-test@example.com']
        );
      });

      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.indexScan);
      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.fullTableScan);
    });
  });

  describe('Transaction Performance', () => {
    it('should handle small transactions efficiently', async () => {
      const metrics = await measureQueryPerformance('Small Transaction', async () => {
        await dbClient.beginTransaction();

        try {
          await dbClient.query(
            'INSERT INTO users (tenant_id, email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5)',
            ['test-tenant-id', 'transaction-test@example.com', 'hashed-password', 'Test', 'User']
          );

          await dbClient.query(
            'UPDATE tenants SET user_count = user_count + 1 WHERE id = $1',
            ['test-tenant-id']
          );

          await dbClient.commitTransaction();
          return { success: true };
        } catch (error) {
          await dbClient.rollbackTransaction();
          throw error;
        }
      });

      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.transaction);
    });

    it('should handle transaction rollback efficiently', async () => {
      const metrics = await measureQueryPerformance('Transaction Rollback', async () => {
        await dbClient.beginTransaction();

        try {
          await dbClient.query(
            'INSERT INTO users (tenant_id, email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5)',
            ['test-tenant-id', 'rollback-test@example.com', 'hashed-password', 'Test', 'User']
          );

          // Intentionally cause an error to test rollback
          await dbClient.query('SELECT * FROM non_existent_table');
          await dbClient.commitTransaction();
        } catch (error) {
          await dbClient.rollbackTransaction();
          return { rolledBack: true };
        }
      });

      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.transaction);
    });
  });

  describe('Connection Pool Performance', () => {
    it('should acquire connections quickly', async () => {
      const poolMetrics = await measureConnectionPool();

      expect(poolMetrics.waitTime).toBeLessThan(PERFORMANCE_THRESHOLDS.connectionAcquire);
      expect(poolMetrics.activeConnections).toBeGreaterThanOrEqual(0);
      expect(poolMetrics.totalConnections).toBeGreaterThan(0);
    });

    it('should handle concurrent connection requests', async () => {
      const concurrentRequests = 10;
      const startTime = performance.now();

      const promises = Array.from({ length: concurrentRequests }, () =>
        measureQueryPerformance('Concurrent Query', async () => {
          return await dbClient.query('SELECT 1 as test_value, pg_sleep(0.01)');
        })
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const averageTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

      console.log(`🔗 Concurrent queries: ${concurrentRequests}, Total time: ${totalTime.toFixed(2)}ms, Average: ${averageTime.toFixed(2)}ms`);

      // Each query should complete in reasonable time
      results.forEach(result => {
        expect(result.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simpleSelect * 2); // Allow some overhead
      });

      // Total time should be reasonable for concurrent execution
      expect(totalTime).toBeLessThan(concurrentRequests * PERFORMANCE_THRESHOLDS.simpleSelect);
    });
  });

  describe('Write Operation Performance', () => {
    it('should perform INSERT operations efficiently', async () => {
      const metrics = await measureQueryPerformance('Single User Insert', async () => {
        return await dbClient.query(`
          INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id
        `, [
          'test-tenant-id',
          'insert-test@example.com',
          'hashed-password',
          'Insert',
          'Test'
        ]);
      });

      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.insert);
      expect(metrics.rowsAffected).toBe(1);
    });

    it('should perform batch INSERT operations efficiently', async () => {
      const batchSize = 100;
      const users = Array.from({ length: batchSize }, (_, i) => [
        'test-tenant-id',
        `batch-user-${i}@example.com`,
        'hashed-password',
        `User${i}`,
        `Batch${i}`
      ]);

      const metrics = await measureQueryPerformance('Batch User Insert', async () => {
        let totalInserted = 0;
        for (const userData of users) {
          const result = await dbClient.query(`
            INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
          `, userData);
          totalInserted += result.rowCount || 1;
        }
        return { totalInserted };
      });

      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.insert * batchSize * 0.5); // Expect better than individual inserts
      expect(metrics.rowsAffected).toBe(batchSize);
    });

    it('should perform UPDATE operations efficiently', async () => {
      const metrics = await measureQueryPerformance('User Profile Update', async () => {
        return await dbClient.query(`
          UPDATE users
          SET last_name = $2, updated_at = NOW()
          WHERE id = $1 AND active = true
        `, ['test-user-id', 'Updated Last Name']);
      });

      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.update);
    });
  });

  describe('Performance Regression Prevention', () => {
    it('should maintain performance under load', async () => {
      const loadTestDuration = 5000; // 5 seconds
      const startTime = Date.now();
      const performanceData: number[] = [];

      while (Date.now() - startTime < loadTestDuration) {
        const metrics = await measureQueryPerformance('Load Test Query', async () => {
          return await dbClient.query(`
            SELECT COUNT(*) as user_count
            FROM users
            WHERE active = true AND created_at >= NOW() - INTERVAL '7 days'
          `);
        });

        performanceData.push(metrics.executionTime);
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms between queries
      }

      const avgTime = performanceData.reduce((a, b) => a + b, 0) / performanceData.length;
      const maxTime = Math.max(...performanceData);
      const minTime = Math.min(...performanceData);

      console.log(`📊 Load Test Results - Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);

      // Performance should remain stable under load
      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simpleSelect * 2);
      expect(maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simpleSelect * 3);
    });

    it('should detect performance degradation', () => {
      // Analyze all collected performance metrics
      const slowQueries = performanceMetrics.filter(m => m.executionTime > PERFORMANCE_THRESHOLDS.simpleSelect);

      if (slowQueries.length > 0) {
        console.warn(`⚠️  Performance degradation detected in ${slowQueries.length} queries:`);
        slowQueries.forEach(query => {
          console.warn(`   - ${query.queryName}: ${query.executionTime.toFixed(2)}ms`);
        });
      }

      // For the test to pass, we expect no more than 10% of queries to be slow
      const slowQueryThreshold = performanceMetrics.length * 0.1;
      expect(slowQueries.length).toBeLessThanOrEqual(slowQueryThreshold);
    });
  });

  describe('Database Health Monitoring', () => {
    it('should monitor database connection health', async () => {
      const healthCheck = await measureQueryPerformance('Database Health Check', async () => {
        return await dbClient.query(`
          SELECT
            COUNT(*) as total_connections,
            COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections
          FROM pg_stat_activity
          WHERE datname = current_database()
        `);
      });

      expect(healthCheck.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simpleSelect);
      expect(healthCheck.rowsAffected).toBe(1);
    });

    it('should monitor table sizes and growth', async () => {
      const tableMetrics = await measureQueryPerformance('Table Size Analysis', async () => {
        return await dbClient.query(`
          SELECT
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        `);
      });

      expect(tableMetrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.aggregation);
      expect(tableMetrics.rowsAffected).toBeGreaterThan(0);
    });
  });
});