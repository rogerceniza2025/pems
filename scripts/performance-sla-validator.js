#!/usr/bin/env node

/**
 * Performance SLA Validator
 *
 * This script validates performance metrics against predefined SLAs and provides
 * comprehensive reporting on system performance under load testing conditions.
 *
 * Features:
 * - Real-time performance monitoring
 * - SLA threshold validation
 * - Performance trend analysis
 * - Automated alerting for SLA violations
 * - Comprehensive reporting and analytics
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

class PerformanceSLAValidator {
  constructor() {
    // SLA Configuration
    this.slaThresholds = {
      // API Response Times (in milliseconds)
      apiResponseTime: {
        p50: 200,  // 50th percentile
        p90: 400,  // 90th percentile
        p95: 500,  // 95th percentile
        p99: 1000, // 99th percentile
      },

      // Frontend Performance Metrics (in milliseconds)
      frontendPerformance: {
        firstContentfulPaint: 1500,
        largestContentfulPaint: 2500,
        timeToInteractive: 3500,
        cumulativeLayoutShift: 0.1,
        firstInputDelay: 100,
      },

      // Database Performance (in milliseconds)
      databasePerformance: {
        queryTime: {
          p95: 100,
          p99: 200,
        },
        connectionPool: {
          maxConnections: 100,
          waitTime: 50,
        },
      },

      // Error Rates (as percentage)
      errorRates: {
        httpErrors: 1.0,      // 1% max
        databaseErrors: 0.5,  // 0.5% max
        systemErrors: 0.1,    // 0.1% max
      },

      // Throughput Requirements
      throughput: {
        requestsPerSecond: 1000,
        concurrentUsers: 10000,
      },

      // Resource Utilization (as percentage)
      resourceUtilization: {
        cpu: 80,      // 80% max
        memory: 85,   // 85% max
        disk: 90,     // 90% max
        network: 70,  // 70% max
      },
    };

    // Performance data storage
    this.performanceData = {
      timestamps: [],
      apiResponseTimes: [],
      frontendMetrics: {},
      databaseMetrics: {},
      errorCounts: {
        http: 0,
        database: 0,
        system: 0,
      },
      throughput: {
        requests: 0,
        users: 0,
      },
      resourceMetrics: {},
    };

    // Alert configuration
    this.alertThresholds = {
      critical: 0.9,   // 90% of SLA threshold
      warning: 0.8,    // 80% of SLA threshold
      info: 0.7,       // 70% of SLA threshold
    };

    this.alerts = [];
    this.testStartTime = null;
    this.testDuration = null;
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    this.testStartTime = Date.now();
    console.log('🚀 Performance SLA Validator Started');
    console.log(`📅 Test started at: ${new Date(this.testStartTime).toISOString()}`);
    console.log('⏱️  Monitoring performance metrics...');
    console.log('');

    this.setupMonitoringInterval();
  }

  /**
   * Setup monitoring interval
   */
  setupMonitoringInterval() {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.validateSLAs();
    }, 5000); // Collect metrics every 5 seconds
  }

  /**
   * Collect performance metrics
   */
  collectMetrics() {
    const timestamp = Date.now();
    this.performanceData.timestamps.push(timestamp);

    // Simulate collecting metrics from various sources
    // In a real implementation, these would come from monitoring systems

    // API Response Times (simulated)
    const apiResponseTime = this.simulateApiResponseTime();
    this.performanceData.apiResponseTimes.push(apiResponseTime);

    // Frontend Metrics (simulated)
    this.collectFrontendMetrics();

    // Database Metrics (simulated)
    this.collectDatabaseMetrics();

    // Error Counts (simulated)
    this.collectErrorMetrics();

    // Throughput Metrics (simulated)
    this.collectThroughputMetrics();

    // Resource Utilization (simulated)
    this.collectResourceMetrics();

    console.log(`📊 Metrics collected at ${new Date(timestamp).toISOString()}`);
  }

  /**
   * Simulate API response time collection
   */
  simulateApiResponseTime() {
    // Simulate realistic response times with some variance
    const baseTime = 300;
    const variance = Math.random() * 200 - 100;
    return Math.max(50, baseTime + variance);
  }

  /**
   * Collect frontend performance metrics
   */
  collectFrontendMetrics() {
    this.performanceData.frontendMetrics = {
      firstContentfulPaint: 1200 + Math.random() * 600,
      largestContentfulPaint: 2000 + Math.random() * 1000,
      timeToInteractive: 2800 + Math.random() * 1400,
      cumulativeLayoutShift: Math.random() * 0.15,
      firstInputDelay: 50 + Math.random() * 100,
    };
  }

  /**
   * Collect database performance metrics
   */
  collectDatabaseMetrics() {
    this.performanceData.databaseMetrics = {
      queryTime: 80 + Math.random() * 120,
      connectionPoolUtilization: Math.random() * 0.8,
      activeConnections: Math.floor(Math.random() * 50),
    };
  }

  /**
   * Collect error metrics
   */
  collectErrorMetrics() {
    // Simulate occasional errors
    if (Math.random() < 0.05) { // 5% chance of error
      this.performanceData.errorCounts.http++;
    }
    if (Math.random() < 0.02) { // 2% chance of database error
      this.performanceData.errorCounts.database++;
    }
    if (Math.random() < 0.01) { // 1% chance of system error
      this.performanceData.errorCounts.system++;
    }
  }

  /**
   * Collect throughput metrics
   */
  collectThroughputMetrics() {
    const currentRequests = this.performanceData.throughput.requests;
    this.performanceData.throughput.requests = currentRequests + Math.floor(Math.random() * 100);
    this.performanceData.throughput.users = Math.floor(Math.random() * 1500);
  }

  /**
   * Collect resource utilization metrics
   */
  collectResourceMetrics() {
    this.performanceData.resourceMetrics = {
      cpu: 40 + Math.random() * 40,  // 40-80%
      memory: 50 + Math.random() * 35, // 50-85%
      disk: 30 + Math.random() * 50,  // 30-80%
      network: 20 + Math.random() * 50, // 20-70%
    };
  }

  /**
   * Validate SLA thresholds and generate alerts
   */
  validateSLAs() {
    this.alerts = [];

    // Validate API Response Times
    this.validateApiResponseTimes();

    // Validate Frontend Performance
    this.validateFrontendPerformance();

    // Validate Database Performance
    this.validateDatabasePerformance();

    // Validate Error Rates
    this.validateErrorRates();

    // Validate Throughput
    this.validateThroughput();

    // Validate Resource Utilization
    this.validateResourceUtilization();

    // Display alerts if any
    if (this.alerts.length > 0) {
      this.displayAlerts();
    }
  }

  /**
   * Validate API response time SLAs
   */
  validateApiResponseTimes() {
    const responseTimes = this.performanceData.apiResponseTimes;
    if (responseTimes.length === 0) return;

    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const p95 = this.getPercentile(sortedTimes, 95);
    const p99 = this.getPercentile(sortedTimes, 99);

    const thresholds = this.slaThresholds.apiResponseTime;

    if (p95 > thresholds.p95) {
      this.alerts.push({
        level: 'critical',
        metric: 'API Response Time (P95)',
        value: p95,
        threshold: thresholds.p95,
        unit: 'ms',
      });
    }

    if (p99 > thresholds.p99) {
      this.alerts.push({
        level: 'critical',
        metric: 'API Response Time (P99)',
        value: p99,
        threshold: thresholds.p99,
        unit: 'ms',
      });
    }
  }

  /**
   * Validate frontend performance SLAs
   */
  validateFrontendPerformance() {
    const metrics = this.performanceData.frontendMetrics;
    const thresholds = this.slaThresholds.frontendPerformance;

    if (metrics.firstContentfulPaint > thresholds.firstContentfulPaint) {
      this.alerts.push({
        level: 'warning',
        metric: 'First Contentful Paint',
        value: metrics.firstContentfulPaint,
        threshold: thresholds.firstContentfulPaint,
        unit: 'ms',
      });
    }

    if (metrics.largestContentfulPaint > thresholds.largestContentfulPaint) {
      this.alerts.push({
        level: 'warning',
        metric: 'Largest Contentful Paint',
        value: metrics.largestContentfulPaint,
        threshold: thresholds.largestContentfulPaint,
        unit: 'ms',
      });
    }

    if (metrics.cumulativeLayoutShift > thresholds.cumulativeLayoutShift) {
      this.alerts.push({
        level: 'info',
        metric: 'Cumulative Layout Shift',
        value: metrics.cumulativeLayoutShift,
        threshold: thresholds.cumulativeLayoutShift,
        unit: '',
      });
    }
  }

  /**
   * Validate database performance SLAs
   */
  validateDatabasePerformance() {
    const metrics = this.performanceData.databaseMetrics;
    const thresholds = this.slaThresholds.databasePerformance;

    if (metrics.queryTime > thresholds.queryTime.p95) {
      this.alerts.push({
        level: 'warning',
        metric: 'Database Query Time (P95)',
        value: metrics.queryTime,
        threshold: thresholds.queryTime.p95,
        unit: 'ms',
      });
    }

    if (metrics.connectionPoolUtilization > 0.9) {
      this.alerts.push({
        level: 'critical',
        metric: 'Database Connection Pool Utilization',
        value: metrics.connectionPoolUtilization * 100,
        threshold: 90,
        unit: '%',
      });
    }
  }

  /**
   * Validate error rate SLAs
   */
  validateErrorRates() {
    const errors = this.performanceData.errorCounts;
    const totalRequests = this.performanceData.throughput.requests;
    const thresholds = this.slaThresholds.errorRates;

    if (totalRequests === 0) return;

    const httpErrorRate = (errors.http / totalRequests) * 100;
    const databaseErrorRate = (errors.database / totalRequests) * 100;
    const systemErrorRate = (errors.system / totalRequests) * 100;

    if (httpErrorRate > thresholds.httpErrors) {
      this.alerts.push({
        level: 'critical',
        metric: 'HTTP Error Rate',
        value: httpErrorRate,
        threshold: thresholds.httpErrors,
        unit: '%',
      });
    }

    if (databaseErrorRate > thresholds.databaseErrors) {
      this.alerts.push({
        level: 'warning',
        metric: 'Database Error Rate',
        value: databaseErrorRate,
        threshold: thresholds.databaseErrors,
        unit: '%',
      });
    }

    if (systemErrorRate > thresholds.systemErrors) {
      this.alerts.push({
        level: 'critical',
        metric: 'System Error Rate',
        value: systemErrorRate,
        threshold: thresholds.systemErrors,
        unit: '%',
      });
    }
  }

  /**
   * Validate throughput SLAs
   */
  validateThroughput() {
    const metrics = this.performanceData.throughput;
    const thresholds = this.slaThresholds.throughput;

    if (metrics.users < thresholds.concurrentUsers * 0.8) {
      this.alerts.push({
        level: 'warning',
        metric: 'Concurrent Users',
        value: metrics.users,
        threshold: thresholds.concurrentUsers,
        unit: 'users',
      });
    }
  }

  /**
   * Validate resource utilization SLAs
   */
  validateResourceUtilization() {
    const metrics = this.performanceData.resourceMetrics;
    const thresholds = this.slaThresholds.resourceUtilization;

    if (metrics.cpu > thresholds.cpu) {
      this.alerts.push({
        level: 'critical',
        metric: 'CPU Utilization',
        value: metrics.cpu,
        threshold: thresholds.cpu,
        unit: '%',
      });
    }

    if (metrics.memory > thresholds.memory) {
      this.alerts.push({
        level: 'warning',
        metric: 'Memory Utilization',
        value: metrics.memory,
        threshold: thresholds.memory,
        unit: '%',
      });
    }

    if (metrics.disk > thresholds.disk) {
      this.alerts.push({
        level: 'critical',
        metric: 'Disk Utilization',
        value: metrics.disk,
        threshold: thresholds.disk,
        unit: '%',
      });
    }
  }

  /**
   * Display alerts to console
   */
  displayAlerts() {
    console.log('\n🚨 PERFORMANCE ALERTS:');
    console.log('=======================');

    this.alerts.forEach((alert, index) => {
      const levelEmoji = alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '🟡' : '🟢';
      console.log(`${levelEmoji} [${alert.level.toUpperCase()}] ${alert.metric}: ${alert.value.toFixed(2)}${alert.unit} (threshold: ${alert.threshold}${alert.unit})`);
    });
    console.log('');
  }

  /**
   * Calculate percentile from sorted array
   */
  getPercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Stop monitoring and generate report
   */
  async stopMonitoring() {
    this.testDuration = Date.now() - this.testStartTime;
    clearInterval(this.monitoringInterval);

    console.log('🏁 Performance monitoring stopped');
    console.log(`⏱️  Test duration: ${this.testDuration}ms`);
    console.log('');

    // Generate comprehensive report
    await this.generateReport();

    // Validate SLAs one final time
    this.validateSLAs();

    // Generate summary
    this.generateSummary();
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport() {
    const reportData = {
      testMetadata: {
        startTime: this.testStartTime,
        endTime: Date.now(),
        duration: this.testDuration,
        timestamp: new Date().toISOString(),
      },
      slaThresholds: this.slaThresholds,
      performanceData: this.performanceData,
      alerts: this.alerts,
      analysis: this.analyzeTrends(),
    };

    const reportPath = path.join(process.cwd(), 'performance-sla-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    console.log(`📄 Performance report generated: ${reportPath}`);
  }

  /**
   * Analyze performance trends
   */
  analyzeTrends() {
    const analysis = {
      apiResponseTimeTrend: this.calculateTrend(this.performanceData.apiResponseTimes),
      errorRateTrend: this.calculateErrorTrend(),
      resourceUtilizationTrend: this.calculateResourceTrend(),
      overallHealth: this.calculateOverallHealth(),
    };

    return analysis;
  }

  /**
   * Calculate trend for numeric metrics
   */
  calculateTrend(data) {
    if (data.length < 2) return 'insufficient_data';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'degrading' : 'improving';
  }

  /**
   * Calculate error rate trend
   */
  calculateErrorTrend() {
    // Simplified trend calculation for errors
    const totalErrors = Object.values(this.performanceData.errorCounts)
      .reduce((sum, count) => sum + count, 0);
    const totalRequests = this.performanceData.throughput.requests;

    if (totalRequests === 0) return 'stable';

    const errorRate = (totalErrors / totalRequests) * 100;

    if (errorRate < 1) return 'excellent';
    if (errorRate < 3) return 'good';
    if (errorRate < 5) return 'acceptable';
    return 'concerning';
  }

  /**
   * Calculate resource utilization trend
   */
  calculateResourceTrend() {
    const metrics = this.performanceData.resourceMetrics;
    const thresholds = this.slaThresholds.resourceUtilization;

    const utilizationScores = [
      metrics.cpu / thresholds.cpu,
      metrics.memory / thresholds.memory,
      metrics.disk / thresholds.disk,
      metrics.network / thresholds.network,
    ];

    const avgUtilization = utilizationScores.reduce((a, b) => a + b, 0) / utilizationScores.length;

    if (avgUtilization < 0.5) return 'optimal';
    if (avgUtilization < 0.7) return 'healthy';
    if (avgUtilization < 0.9) return 'strained';
    return 'critical';
  }

  /**
   * Calculate overall system health score
   */
  calculateOverallHealth() {
    const criticalAlerts = this.alerts.filter(alert => alert.level === 'critical').length;
    const warningAlerts = this.alerts.filter(alert => alert.level === 'warning').length;

    let healthScore = 100;

    // Deduct points for alerts
    healthScore -= criticalAlerts * 20;
    healthScore -= warningAlerts * 10;

    return {
      score: Math.max(0, healthScore),
      status: healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good' : healthScore >= 40 ? 'fair' : 'poor',
      criticalAlerts,
      warningAlerts,
    };
  }

  /**
   * Generate performance summary
   */
  generateSummary() {
    console.log('📊 PERFORMANCE SLA SUMMARY');
    console.log('===========================');
    console.log('');

    // Test duration
    console.log(`⏱️  Test Duration: ${this.testDuration}ms (${(this.testDuration / 1000).toFixed(2)}s)`);
    console.log('');

    // API Performance
    if (this.performanceData.apiResponseTimes.length > 0) {
      const sortedTimes = [...this.performanceData.apiResponseTimes].sort((a, b) => a - b);
      const p95 = this.getPercentile(sortedTimes, 95);
      const p99 = this.getPercentile(sortedTimes, 99);

      console.log('🌐 API Performance:');
      console.log(`   P95 Response Time: ${p95.toFixed(2)}ms (SLA: ${this.slaThresholds.apiResponseTime.p95}ms)`);
      console.log(`   P99 Response Time: ${p99.toFixed(2)}ms (SLA: ${this.slaThresholds.apiResponseTime.p99}ms)`);
      console.log(`   Status: ${p95 <= this.slaThresholds.apiResponseTime.p95 && p99 <= this.slaThresholds.apiResponseTime.p99 ? '✅ PASSED' : '❌ FAILED'}`);
      console.log('');
    }

    // Error Rates
    const totalRequests = this.performanceData.throughput.requests;
    if (totalRequests > 0) {
      const totalErrors = Object.values(this.performanceData.errorCounts)
        .reduce((sum, count) => sum + count, 0);
      const errorRate = (totalErrors / totalRequests) * 100;

      console.log('❌ Error Rates:');
      console.log(`   Total Requests: ${totalRequests}`);
      console.log(`   Total Errors: ${totalErrors}`);
      console.log(`   Error Rate: ${errorRate.toFixed(2)}% (SLA: <${this.slaThresholds.errorRates.httpErrors}%)`);
      console.log(`   Status: ${errorRate < this.slaThresholds.errorRates.httpErrors ? '✅ PASSED' : '❌ FAILED'}`);
      console.log('');
    }

    // Throughput
    console.log('📈 Throughput:');
    console.log(`   Max Concurrent Users: ${this.performanceData.throughput.users}`);
    console.log(`   Total Requests Processed: ${this.performanceData.throughput.requests}`);
    console.log('');

    // Resource Utilization
    const metrics = this.performanceData.resourceMetrics;
    console.log('💾 Resource Utilization:');
    console.log(`   CPU: ${metrics.cpu.toFixed(1)}% (SLA: <${this.slaThresholds.resourceUtilization.cpu}%)`);
    console.log(`   Memory: ${metrics.memory.toFixed(1)}% (SLA: <${this.slaThresholds.resourceUtilization.memory}%)`);
    console.log(`   Disk: ${metrics.disk.toFixed(1)}% (SLA: <${this.slaThresholds.resourceUtilization.disk}%)`);
    console.log('');

    // Overall Health
    const health = this.calculateOverallHealth();
    console.log('🏥 Overall System Health:');
    console.log(`   Health Score: ${health.score}/100`);
    console.log(`   Status: ${health.status.toUpperCase()}`);
    console.log(`   Critical Alerts: ${health.criticalAlerts}`);
    console.log(`   Warning Alerts: ${health.warningAlerts}`);
    console.log('');

    // Final Status
    const allSLAsPassed = this.alerts.filter(alert => alert.level === 'critical').length === 0;
    console.log('🎯 FINAL SLA STATUS:');
    console.log(`   Overall Status: ${allSLAsPassed ? '✅ ALL SLAS PASSED' : '❌ SOME SLAS FAILED'}`);
    console.log('');

    if (!allSLAsPassed) {
      console.log('⚠️  ACTION REQUIRED:');
      console.log('   - Review performance alerts above');
      console.log('   - Analyze performance report for trends');
      console.log('   - Consider system optimization');
      console.log('   - Re-run performance tests after fixes');
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Performance SLA Validator');
  console.log('=====================================');
  console.log('');

  const validator = new PerformanceSLAValidator();

  // Start monitoring
  validator.startMonitoring();

  // Run for a specified duration (e.g., 2 minutes for demo)
  const testDuration = 120000; // 2 minutes
  console.log(`⏱️  Running performance validation for ${testDuration / 1000} seconds...`);

  await new Promise(resolve => setTimeout(resolve, testDuration));

  // Stop monitoring and generate report
  await validator.stopMonitoring();

  console.log('✅ Performance SLA validation completed');
}

// Handle command line execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error during performance validation:', error);
    process.exit(1);
  });
}

export default PerformanceSLAValidator;