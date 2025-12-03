/**
 * Database Connection Pool Performance Tests
 *
 * These tests specifically focus on the performance and behavior of the
 * database connection pool under various load conditions.
 *
 * Test Categories:
 * - Connection acquisition and release
 * - Pool size management
 * - Connection leak detection
 * - Pool exhaustion handling
 * - Connection reuse efficiency
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';

import { DatabaseClient } from '@/lib/database/client';
import { TestDatabaseFactory } from '../../../tests/setup/test-database-factory';

interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  maxConnections: number;
}

interface ConnectionPerformanceMetric {
  operation: string;
  timestamp: number;
  duration: number;
  success: boolean;
  connectionId?: string;
}

describe('Database Connection Pool Performance', () => {
  let dbClient: DatabaseClient;
  let testDbFactory: TestDatabaseFactory;
  let performanceMetrics: ConnectionPerformanceMetric[] = [];

  // Pool performance thresholds (in milliseconds)
  const POOL_THRESHOLDS = {
    connectionAcquire: 10,     // Time to acquire a connection
    connectionRelease: 5,      // Time to release a connection
    poolExhaustionRecovery: 1000, // Time to recover from pool exhaustion
    connectionReuse: 2,        // Time to reuse an existing connection
    poolWarmup: 100,           // Time to warm up the pool
  };

  beforeEach(async () => {
    testDbFactory = new TestDatabaseFactory();
    dbClient = await testDbFactory.createTestDatabase();
    performanceMetrics = [];

    // Warm up the connection pool
    await warmupConnectionPool();
  });

  afterEach(async () => {
    await testDbFactory.cleanup();
  });

  /**
   * Warm up the connection pool to ensure optimal performance
   */
  async function warmupConnectionPool(): Promise<void> {
    const warmupStart = performance.now();
    const warmupConnections = 5;

    const promises = Array.from({ length: warmupConnections }, () =>
      executeWithMetrics('Warmup Connection', () => dbClient.query('SELECT 1'))
    );

    await Promise.all(promises);
    const warmupTime = performance.now() - warmupStart;

    console.log(`🔥 Connection pool warmup completed in ${warmupTime.toFixed(2)}ms`);
    expect(warmupTime).toBeLessThan(POOL_THRESHOLDS.poolWarmup);
  }

  /**
   * Execute database operation with performance tracking
   */
  async function executeWithMetrics(
    operation: string,
    dbOperation: () => Promise<any>
  ): Promise<any> {
    const startTime = performance.now();
    let success = false;
    let result = null;

    try {
      result = await dbOperation();
      success = true;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - startTime;

      const metric: ConnectionPerformanceMetric = {
        operation,
        timestamp: Date.now(),
        duration,
        success,
      };

      performanceMetrics.push(metric);

      if (duration > POOL_THRESHOLDS.connectionAcquire * 2) {
        console.warn(`⚠️  Slow ${operation}: ${duration.toFixed(2)}ms`);
      }
    }

    return result;
  }

  /**
   * Get current connection pool statistics
   */
  async function getPoolStats(): Promise<ConnectionPoolStats> {
    const stats = await dbClient.getPoolStats();
    return {
      totalConnections: stats.total || 0,
      activeConnections: stats.active || 0,
      idleConnections: stats.idle || 0,
      waitingClients: stats.waiting || 0,
      maxConnections: stats.max || 20,
    };
  }

  /**
   * Execute multiple concurrent operations to test pool behavior
   */
  async function executeConcurrentOperations(
    operationName: string,
    concurrency: number,
    operation: () => Promise<any>
  ): Promise<{ results: any[]; totalTime: number; averageTime: number }> {
    const startTime = performance.now();

    const promises = Array.from({ length: concurrency }, (_, index) =>
      executeWithMetrics(`${operationName} ${index + 1}`, operation)
    );

    const results = await Promise.allSettled(promises);
    const totalTime = performance.now() - startTime;

    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);

    const averageTime = performanceMetrics
      .filter(m => m.operation.includes(operationName))
      .reduce((sum, m) => sum + m.duration, 0) / concurrency;

    return {
      results: successfulResults,
      totalTime,
      averageTime,
    };
  }

  describe('Connection Acquisition Performance', () => {
    it('should acquire connections quickly under normal load', async () => {
      const operation = () => dbClient.query('SELECT 1 as test_value');
      const result = await executeWithMetrics('Single Connection Acquire', operation);

      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();

      const lastMetric = performanceMetrics[performanceMetrics.length - 1];
      expect(lastMetric.duration).toBeLessThan(POOL_THRESHOLDS.connectionAcquire);
      expect(lastMetric.success).toBe(true);
    });

    it('should handle sequential connection requests efficiently', async () => {
      const sequentialRequests = 20;
      const operation = () => dbClient.query('SELECT pg_sleep(0.01), 1 as test_value');

      const sequentialTimes: number[] = [];

      for (let i = 0; i < sequentialRequests; i++) {
        const result = await executeWithMetrics(`Sequential Request ${i + 1}`, operation);
        sequentialTimes.push(performanceMetrics[performanceMetrics.length - 1].duration);
      }

      const averageTime = sequentialTimes.reduce((a, b) => a + b, 0) / sequentialTimes.length;
      const maxTime = Math.max(...sequentialTimes);

      console.log(`📊 Sequential requests - Average: ${averageTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);

      expect(averageTime).toBeLessThan(POOL_THRESHOLDS.connectionAcquire * 2);
      expect(maxTime).toBeLessThan(POOL_THRESHOLDS.connectionAcquire * 3);
    });

    it('should reuse connections efficiently', async () => {
      const reuseTestCount = 10;
      const operation = () => dbClient.query('SELECT 1 as test_value');

      // First, warm up with initial connections
      await executeWithMetrics('Warmup Reuse Test', operation);

      // Then test connection reuse
      const reuseTimes: number[] = [];

      for (let i = 0; i < reuseTestCount; i++) {
        await executeWithMetrics(`Connection Reuse ${i + 1}`, operation);
        reuseTimes.push(performanceMetrics[performanceMetrics.length - 1].duration);
      }

      const averageReuseTime = reuseTimes.reduce((a, b) => a + b, 0) / reuseTimes.length;

      console.log(`♻️  Connection reuse average time: ${averageReuseTime.toFixed(2)}ms`);

      // Connection reuse should be faster than new connection acquisition
      expect(averageReuseTime).toBeLessThan(POOL_THRESHOLDS.connectionReuse);
    });
  });

  describe('Concurrent Connection Handling', () => {
    it('should handle moderate concurrent load efficiently', async () => {
      const concurrency = 10;
      const operation = () => dbClient.query('SELECT 1 as test_value, pg_sleep(0.01)');

      const { totalTime, averageTime } = await executeConcurrentOperations(
        'Moderate Concurrent Load',
        concurrency,
        operation
      );

      console.log(`🔀 Concurrent load - Total: ${totalTime.toFixed(2)}ms, Average per operation: ${averageTime.toFixed(2)}ms`);

      // Average time should remain reasonable under concurrency
      expect(averageTime).toBeLessThan(POOL_THRESHOLDS.connectionAcquire * 3);

      // Total time should be less than sequential execution (indicating proper concurrency)
      const sequentialTime = concurrency * 50; // Estimated sequential time
      expect(totalTime).toBeLessThan(sequentialTime);
    });

    it('should handle high concurrent load without excessive queuing', async () => {
      const highConcurrency = 25;
      const operation = () => dbClient.query('SELECT 1 as test_value');

      const initialStats = await getPoolStats();

      const { totalTime, averageTime, results } = await executeConcurrentOperations(
        'High Concurrent Load',
        highConcurrency,
        operation
      );

      const finalStats = await getPoolStats();

      console.log(`🚀 High concurrent load - Operations: ${highConcurrency}, Success: ${results.length}, Average time: ${averageTime.toFixed(2)}ms`);
      console.log(`📊 Pool stats - Initial: ${initialStats.activeConnections} active, Final: ${finalStats.activeConnections} active`);

      // Most operations should succeed even under high load
      expect(results.length).toBeGreaterThan(highConcurrency * 0.9);

      // Performance should remain acceptable
      expect(averageTime).toBeLessThan(POOL_THRESHOLDS.connectionAcquire * 5);

      // Pool should handle the load without excessive waiting
      expect(finalStats.waitingClients).toBeLessThan(5);
    });

    it('should maintain pool stability under sustained concurrent load', async () => {
      const sustainedConcurrency = 15;
      const iterations = 3;
      const operation = () => dbClient.query('SELECT 1 as test_value, pg_sleep(0.02)');

      const iterationResults: { totalTime: number; averageTime: number; successRate: number }[] = [];

      for (let i = 0; i < iterations; i++) {
        const { totalTime, averageTime, results } = await executeConcurrentOperations(
          `Sustained Load Iteration ${i + 1}`,
          sustainedConcurrency,
          operation
        );

        const successRate = results.length / sustainedConcurrency;
        iterationResults.push({ totalTime, averageTime, successRate });

        // Brief pause between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`📈 Sustained load results:`);
      iterationResults.forEach((result, index) => {
        console.log(`   Iteration ${index + 1}: Avg ${result.averageTime.toFixed(2)}ms, Success rate ${(result.successRate * 100).toFixed(1)}%`);
      });

      // Performance should remain stable across iterations
      const firstIterationAverage = iterationResults[0].averageTime;
      const lastIterationAverage = iterationResults[iterationResults.length - 1].averageTime;
      const performanceDegradation = (lastIterationAverage - firstIterationAverage) / firstIterationAverage;

      expect(performanceDegradation).toBeLessThan(0.5); // Less than 50% degradation

      // Success rate should remain high
      iterationResults.forEach(result => {
        expect(result.successRate).toBeGreaterThan(0.9);
      });
    });
  });

  describe('Pool Size and Resource Management', () => {
    it('should maintain appropriate pool size', async () => {
      const initialStats = await getPoolStats();
      console.log(`🏊 Initial pool stats: ${initialStats.totalConnections} total, ${initialStats.activeConnections} active`);

      // Execute some operations to populate the pool
      const concurrency = 8;
      await executeConcurrentOperations(
        'Pool Population Test',
        concurrency,
        () => dbClient.query('SELECT 1')
      );

      // Wait for connections to return to pool
      await new Promise(resolve => setTimeout(resolve, 100));

      const afterStats = await getPoolStats();
      console.log(`🏊 After operations pool stats: ${afterStats.totalConnections} total, ${afterStats.activeConnections} active, ${afterStats.idleConnections} idle`);

      // Pool should have reasonable number of connections
      expect(afterStats.totalConnections).toBeGreaterThan(0);
      expect(afterStats.totalConnections).toBeLessThanOrEqual(afterStats.maxConnections);

      // Most connections should be idle after operations complete
      expect(afterStats.idleConnections).toBeGreaterThanOrEqual(afterStats.activeConnections);
    });

    it('should not leak connections under normal operation', async () => {
      const initialStats = await getPoolStats();
      const operationCount = 20;

      // Execute operations and ensure proper connection cleanup
      for (let i = 0; i < operationCount; i++) {
        await executeWithMetrics(`Leak Test Operation ${i + 1}`, () =>
          dbClient.query('SELECT 1 as test_value')
        );
      }

      // Wait for all connections to return to pool
      await new Promise(resolve => setTimeout(resolve, 200));

      const finalStats = await getPoolStats();

      console.log(`🔍 Connection leak test - Initial: ${initialStats.totalConnections}, Final: ${finalStats.totalConnections}`);

      // Pool size should not have grown significantly
      const poolGrowth = finalStats.totalConnections - initialStats.totalConnections;
      expect(poolGrowth).toBeLessThan(5); // Allow some growth for connection reuse

      // Active connections should be minimal after operations complete
      expect(finalStats.activeConnections).toBeLessThan(2);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle connection errors gracefully', async () => {
      const invalidQuery = () => dbClient.query('SELECT * FROM definitely_non_existent_table');

      const metric = await executeWithMetrics('Invalid Query Test', invalidQuery);

      expect(metric).toBeUndefined(); // Should have thrown
      expect(performanceMetrics[performanceMetrics.length - 1].success).toBe(false);
    });

    it('should recover from temporary connection issues', async () => {
      // Simulate connection recovery by testing rapid successive operations
      const recoveryTestCount = 10;
      const successCount: number[] = [];

      for (let i = 0; i < recoveryTestCount; i++) {
        try {
          await executeWithMetrics(`Recovery Test ${i + 1}`, () =>
            dbClient.query('SELECT 1 as recovery_test')
          );
          successCount.push(1);
        } catch (error) {
          successCount.push(0);
          console.warn(`Recovery test ${i + 1} failed:`, error.message);
        }
      }

      const successRate = successCount.reduce((a, b) => a + b, 0) / recoveryTestCount;

      console.log(`🔄 Connection recovery test: ${successCount.filter(s => s === 1).length}/${recoveryTestCount} successful`);

      // Should recover and maintain high success rate
      expect(successRate).toBeGreaterThan(0.9);
    });
  });

  describe('Performance Monitoring and Analytics', () => {
    it('should provide detailed performance analytics', () => {
      const operationCounts = performanceMetrics.reduce((acc, metric) => {
        const operationType = metric.operation.split(' ')[0];
        acc[operationType] = (acc[operationType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const averageTimes = performanceMetrics.reduce((acc, metric) => {
        const operationType = metric.operation.split(' ')[0];
        if (!acc[operationType]) {
          acc[operationType] = { total: 0, count: 0, min: Infinity, max: -Infinity };
        }
        acc[operationType].total += metric.duration;
        acc[operationType].count += 1;
        acc[operationType].min = Math.min(acc[operationType].min, metric.duration);
        acc[operationType].max = Math.max(acc[operationType].max, metric.duration);
        return acc;
      }, {} as Record<string, { total: number; count: number; min: number; max: number }>);

      console.log('📊 Performance Analytics Summary:');
      console.log(`   Total operations: ${performanceMetrics.length}`);
      console.log('   Operation types:', operationCounts);

      Object.entries(averageTimes).forEach(([operation, stats]) => {
        const average = stats.total / stats.count;
        console.log(`   ${operation}: Avg ${average.toFixed(2)}ms, Min ${stats.min.toFixed(2)}ms, Max ${stats.max.toFixed(2)}ms (${stats.count} operations)`);
      });

      // Validate we have sufficient data for analysis
      expect(performanceMetrics.length).toBeGreaterThan(10);
    });

    it('should detect performance anomalies', () => {
      const allDurations = performanceMetrics.map(m => m.duration);
      const averageDuration = allDurations.reduce((a, b) => a + b, 0) / allDurations.length;
      const maxDuration = Math.max(...allDurations);
      const minDuration = Math.min(...allDurations);

      // Calculate standard deviation
      const variance = allDurations.reduce((sum, duration) => sum + Math.pow(duration - averageDuration, 2), 0) / allDurations.length;
      const standardDeviation = Math.sqrt(variance);

      console.log(`📈 Performance Anomaly Detection:`);
      console.log(`   Average: ${averageDuration.toFixed(2)}ms`);
      console.log(`   Range: ${minDuration.toFixed(2)}ms - ${maxDuration.toFixed(2)}ms`);
      console.log(`   Standard deviation: ${standardDeviation.toFixed(2)}ms`);

      // Check for outliers (more than 2 standard deviations from mean)
      const outliers = allDurations.filter(duration => Math.abs(duration - averageDuration) > 2 * standardDeviation);

      if (outliers.length > 0) {
        console.warn(`⚠️  Performance outliers detected: ${outliers.length} operations`);
        console.warn(`   Outlier range: ${Math.min(...outliers).toFixed(2)}ms - ${Math.max(...outliers).toFixed(2)}ms`);
      }

      // Outlier rate should be reasonable (less than 5%)
      const outlierRate = outliers.length / allDurations.length;
      expect(outlierRate).toBeLessThan(0.05);
    });
  });
});