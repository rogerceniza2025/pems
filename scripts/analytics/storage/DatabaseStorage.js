/**
 * Analytics Database Storage Layer (Simplified Working Version)
 *
 * This module provides a persistent storage solution for test analytics data,
 * using JSON for simplicity and reliability.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Import types from our schema
import {
  TestMetrics,
  AnalyticsConfig,
  AnalyticsTableRow,
  CoverageHistoryRow,
  PerformanceHistoryRow,
  QualityHistoryRow,
  MetricsResponse,
  TrendAnalysis,
  RegressionReport
} from './AnalyticsSchema';

export class DatabaseStorage {
  private dbPath: string;
  private backupPath: string;
  private config: AnalyticsConfig;

  constructor(config: AnalyticsConfig, dbPath?: string) {
    this.config = config;
    this.dbPath = dbPath || path.join(process.cwd(), '.analytics', 'test-metrics.db');
    this.backupPath = path.join(process.cwd(), '.analytics', 'backups');
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Create analytics directory if it doesn't exist
    const analyticsDir = path.dirname(this.dbPath);
    if (!fs.existsSync(analyticsDir)) {
      fs.mkdirSync(analyticsDir, { recursive: true });
    }

    // Create backup directory
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }

    // Initialize SQLite database
    this.createTables();
  }

  private createTables(): void {
    try {
      // Check if sqlite3 is available
      execSync('npm list sqlite3', { stdio: 'ignore' });
      this.createSQLiteTables();
    } catch {
      // Fallback to JSON-based storage if sqlite3 is not available
      console.warn('SQLite not available, using JSON-based storage');
      this.initializeJSONStorage();
    }
  }

  private createSQLiteTables(): void {
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(this.dbPath);

    // Main metrics table
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS analytics_metrics (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          commit_hash TEXT,
          branch TEXT,
          author TEXT,
          coverage_data TEXT,
          performance_data TEXT,
          quality_data TEXT,
          trends_data TEXT,
          summary_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Coverage history table
      db.run(`
        CREATE TABLE IF NOT EXISTS coverage_history (
          id TEXT PRIMARY KEY,
          metrics_id TEXT,
          module_name TEXT,
          metric_type TEXT,
          lines_covered INTEGER,
          lines_total INTEGER,
          lines_pct REAL,
          functions_covered INTEGER,
          functions_total INTEGER,
          functions_pct REAL,
          branches_covered INTEGER,
          branches_total INTEGER,
          branches_pct REAL,
          statements_covered INTEGER,
          statements_total INTEGER,
          statements_pct REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (metrics_id) REFERENCES analytics_metrics (id)
        )
      `);

      // Performance history table
      db.run(`
        CREATE TABLE IF NOT EXISTS performance_history (
          id TEXT PRIMARY KEY,
          metrics_id TEXT,
          metric_type TEXT,
          metric_name TEXT,
          value REAL,
          baseline REAL,
          threshold REAL,
          passed BOOLEAN,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (metrics_id) REFERENCES analytics_metrics (id)
        )
      `);

      // Quality history table
      db.run(`
        CREATE TABLE IF NOT EXISTS quality_history (
          id TEXT PRIMARY KEY,
          metrics_id TEXT,
          metric_type TEXT,
          metric_name TEXT,
          value REAL,
          threshold REAL,
          passed BOOLEAN,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (metrics_id) REFERENCES analytics_metrics (id)
        )
      `);

      // Create indexes for better query performance
      db.run('CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON analytics_metrics (timestamp)');
      db.run('CREATE INDEX IF NOT EXISTS idx_metrics_commit ON analytics_metrics (commit_hash)');
      db.run('CREATE INDEX IF NOT EXISTS idx_coverage_metrics_id ON coverage_history (metrics_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_performance_metrics_id ON performance_history (metrics_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_quality_metrics_id ON quality_history (metrics_id)');
    });

    db.close();
  }

  private initializeJSONStorage(): void {
    const jsonPath = this.dbPath.replace('.db', '.json');
    if (!fs.existsSync(jsonPath)) {
      fs.writeFileSync(jsonPath, JSON.stringify({ metrics: [] }, null, 2));
    }
  }

  async storeMetrics(metrics: TestMetrics): Promise<boolean> {
    try {
      if (this.dbPath.endsWith('.db')) {
        return this.storeMetricsSQLite(metrics);
      } else {
        return this.storeMetricsJSON(metrics);
      }
    } catch (error) {
      console.error('Failed to store metrics:', error);
      return false;
    }
  }

  private async storeMetricsSQLite(metrics: TestMetrics): Promise<boolean> {
    return new Promise((resolve) => {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(this.dbPath);

      db.serialize(() => {
        // Insert main metrics
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO analytics_metrics
          (id, timestamp, commit_hash, branch, author, coverage_data, performance_data, quality_data, trends_data, summary_data)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run([
          metrics.id,
          metrics.timestamp,
          metrics.commitHash,
          metrics.branch,
          metrics.author,
          JSON.stringify(metrics.coverage),
          JSON.stringify(metrics.performance),
          JSON.stringify(metrics.quality),
          JSON.stringify(metrics.trends),
          JSON.stringify(metrics.summary)
        ]);

        stmt.finalize();

        // Store detailed history data
        this.storeCoverageHistory(db, metrics);
        this.storePerformanceHistory(db, metrics);
        this.storeQualityHistory(db, metrics);
      });

      db.close((err) => {
        if (err) {
          console.error('Database error:', err);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  private storeCoverageHistory(db: any, metrics: TestMetrics): void {
    const coverage = metrics.coverage;

    // Store total coverage
    this.insertCoverageRow(db, {
      id: `${metrics.id}-total`,
      metrics_id: metrics.id,
      metric_type: 'total',
      lines_covered: coverage.total.lines.covered,
      lines_total: coverage.total.lines.total,
      lines_pct: coverage.total.lines.pct,
      functions_covered: coverage.total.functions.covered,
      functions_total: coverage.total.functions.total,
      functions_pct: coverage.total.functions.pct,
      branches_covered: coverage.total.branches.covered,
      branches_total: coverage.total.branches.total,
      branches_pct: coverage.total.branches.pct,
      statements_covered: coverage.total.statements.covered,
      statements_total: coverage.total.statements.total,
      statements_pct: coverage.total.statements.pct
    });

    // Store domain coverage if available
    if (coverage.domain) {
      this.insertCoverageRow(db, {
        id: `${metrics.id}-domain`,
        metrics_id: metrics.id,
        metric_type: 'domain',
        lines_covered: coverage.domain.lines.covered,
        lines_total: coverage.domain.lines.total,
        lines_pct: coverage.domain.lines.pct,
        functions_covered: coverage.domain.functions.covered,
        functions_total: coverage.domain.functions.total,
        functions_pct: coverage.domain.functions.pct,
        branches_covered: coverage.domain.branches.covered,
        branches_total: coverage.domain.branches.total,
        branches_pct: coverage.domain.branches.pct,
        statements_covered: coverage.domain.statements.covered,
        statements_total: coverage.domain.statements.total,
        statements_pct: coverage.domain.statements.pct
      });
    }

    // Store module coverage if available
    if (coverage.modules) {
      Object.entries(coverage.modules).forEach(([moduleName, moduleCoverage]) => {
        this.insertCoverageRow(db, {
          id: `${metrics.id}-${moduleName}`,
          metrics_id: metrics.id,
          module_name: moduleName,
          metric_type: 'module',
          lines_covered: moduleCoverage.lines.covered,
          lines_total: moduleCoverage.lines.total,
          lines_pct: moduleCoverage.lines.pct,
          functions_covered: moduleCoverage.functions.covered,
          functions_total: moduleCoverage.functions.total,
          functions_pct: moduleCoverage.functions.pct,
          branches_covered: moduleCoverage.branches.covered,
          branches_total: moduleCoverage.branches.total,
          branches_pct: moduleCoverage.branches.pct,
          statements_covered: moduleCoverage.statements.covered,
          statements_total: moduleCoverage.statements.total,
          statements_pct: moduleCoverage.statements.pct
        });
      });
    }
  }

  private insertCoverageRow(db: any, row: Partial<CoverageHistoryRow>): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO coverage_history
      (id, metrics_id, module_name, metric_type, lines_covered, lines_total, lines_pct,
       functions_covered, functions_total, functions_pct, branches_covered, branches_total,
       branches_pct, statements_covered, statements_total, statements_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      row.id,
      row.metrics_id,
      row.module_name,
      row.metric_type,
      row.lines_covered,
      row.lines_total,
      row.lines_pct,
      row.functions_covered,
      row.functions_total,
      row.functions_pct,
      row.branches_covered,
      row.branches_total,
      row.branches_pct,
      row.statements_covered,
      row.statements_total,
      row.statements_pct
    ]);

    stmt.finalize();
  }

  private storePerformanceHistory(db: any, metrics: TestMetrics): void {
    const performance = metrics.performance;

    // Store bundle sizes
    if (performance.bundles) {
      performance.bundles.forEach(bundle => {
        this.insertPerformanceRow(db, {
          id: `${metrics.id}-bundle-${bundle.name}`,
          metrics_id: metrics.id,
          metric_type: 'bundle',
          metric_name: bundle.name,
          value: bundle.gzippedSize,
          threshold: bundle.max,
          passed: bundle.passed
        });
      });
    }

    // Store Core Web Vitals
    if (performance.coreWebVitals) {
      Object.entries(performance.coreWebVitals).forEach(([metric, data]) => {
        if (data) {
          this.insertPerformanceRow(db, {
            id: `${metrics.id}-cwv-${metric}`,
            metrics_id: metrics.id,
            metric_type: 'core_web_vital',
            metric_name: metric,
            value: data.value,
            threshold: data.target,
            passed: data.passed
          });
        }
      });
    }

    // Store API performance
    if (performance.api) {
      performance.api.forEach(apiMetric => {
        this.insertPerformanceRow(db, {
          id: `${metrics.id}-api-${apiMetric.endpoint}`,
          metrics_id: metrics.id,
          metric_type: 'api',
          metric_name: apiMetric.endpoint,
          value: apiMetric.responseTime,
          threshold: apiMetric.max,
          passed: apiMetric.passed
        });
      });
    }

    // Store Lighthouse scores
    if (performance.lighthouse) {
      Object.entries(performance.lighthouse).forEach(([category, data]) => {
        if (data) {
          this.insertPerformanceRow(db, {
            id: `${metrics.id}-lighthouse-${category}`,
            metrics_id: metrics.id,
            metric_type: 'lighthouse',
            metric_name: category,
            value: data.score,
            threshold: data.min,
            passed: data.passed
          });
        }
      });
    }
  }

  private insertPerformanceRow(db: any, row: Partial<PerformanceHistoryRow>): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO performance_history
      (id, metrics_id, metric_type, metric_name, value, threshold, passed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      row.id,
      row.metrics_id,
      row.metric_type,
      row.metric_name,
      row.value,
      row.threshold,
      row.passed
    ]);

    stmt.finalize();
  }

  private storeQualityHistory(db: any, metrics: TestMetrics): void {
    const quality = metrics.quality;

    // Store TDD compliance
    if (quality.tddCompliance) {
      this.insertQualityRow(db, {
        id: `${metrics.id}-tdd`,
        metrics_id: metrics.id,
        metric_type: 'tdd',
        metric_name: 'compliance_rate',
        value: quality.tddCompliance.passed ? 100 : 0,
        passed: quality.tddCompliance.passed
      });
    }

    // Store security metrics
    if (quality.security) {
      this.insertQualityRow(db, {
        id: `${metrics.id}-security`,
        metrics_id: metrics.id,
        metric_type: 'security',
        metric_name: 'score',
        value: quality.security.score,
        passed: quality.security.passed
      });
    }

    // Store test results
    if (quality.tests) {
      ['unit', 'integration', 'e2e', 'contract'].forEach(testType => {
        const testData = quality.tests[testType as keyof typeof quality.tests];
        if (testData) {
          const successRate = testData.total > 0 ? (testData.passed / testData.total) * 100 : 0;
          this.insertQualityRow(db, {
            id: `${metrics.id}-tests-${testType}`,
            metrics_id: metrics.id,
            metric_type: 'tests',
            metric_name: testType,
            value: successRate,
            passed: successRate >= 80 // 80% success rate threshold
          });
        }
      });
    }
  }

  private insertQualityRow(db: any, row: Partial<QualityHistoryRow>): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO quality_history
      (id, metrics_id, metric_type, metric_name, value, passed)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      row.id,
      row.metrics_id,
      row.metric_type,
      row.metric_name,
      row.value,
      row.passed
    ]);

    stmt.finalize();
  }

  private async storeMetricsJSON(metrics: TestMetrics): Promise<boolean> {
    try {
      const jsonPath = this.dbPath.replace('.db', '.json');
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      data.metrics.push(metrics);

      // Keep only the last 1000 entries to prevent file from growing too large
      if (data.metrics.length > 1000) {
        data.metrics = data.metrics.slice(-1000);
      }

      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to store metrics to JSON:', error);
      return false;
    }
  }

  async getMetrics(limit = 100, offset = 0): Promise<MetricsResponse> {
    try {
      if (this.dbPath.endsWith('.db')) {
        return this.getMetricsSQLite(limit, offset);
      } else {
        return this.getMetricsJSON(limit, offset);
      }
    } catch (error) {
      console.error('Failed to retrieve metrics:', error);
      return { metrics: [], pagination: { page: 0, limit, total: 0, hasMore: false } };
    }
  }

  private async getMetricsSQLite(limit: number, offset: number): Promise<MetricsResponse> {
    return new Promise((resolve) => {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(this.dbPath);

      // Get total count
      db.get('SELECT COUNT(*) as total FROM analytics_metrics', (err, row: any) => {
        if (err) {
          resolve({ metrics: [], pagination: { page: Math.floor(offset / limit), limit, total: 0, hasMore: false } });
          return;
        }

        const total = row.total;
        const hasMore = offset + limit < total;

        // Get paginated metrics
        const query = `
          SELECT * FROM analytics_metrics
          ORDER BY timestamp DESC
          LIMIT ? OFFSET ?
        `;

        db.all(query, [limit, offset], (err, rows: AnalyticsTableRow[]) => {
          db.close();

          if (err) {
            resolve({ metrics: [], pagination: { page: Math.floor(offset / limit), limit, total: 0, hasMore: false } });
            return;
          }

          const metrics = rows.map(row => this.parseAnalyticsTableRow(row));
          resolve({
            metrics,
            pagination: { page: Math.floor(offset / limit), limit, total, hasMore }
          });
        });
      });
    });
  }

  private async getMetricsJSON(limit: number, offset: number): Promise<MetricsResponse> {
    try {
      const jsonPath = this.dbPath.replace('.db', '.json');
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const allMetrics = data.metrics || [];

      const total = allMetrics.length;
      const hasMore = offset + limit < total;
      const metrics = allMetrics.slice(offset, offset + limit);

      return {
        metrics,
        pagination: { page: Math.floor(offset / limit), limit, total, hasMore }
      };
    } catch (error) {
      console.error('Failed to retrieve metrics from JSON:', error);
      return { metrics: [], pagination: { page: 0, limit, total: 0, hasMore: false } };
    }
  }

  private parseAnalyticsTableRow(row: AnalyticsTableRow): TestMetrics {
    return {
      id: row.id,
      timestamp: row.timestamp,
      commitHash: row.commit_hash,
      branch: row.branch,
      author: row.author,
      coverage: JSON.parse(row.coverage_data),
      performance: JSON.parse(row.performance_data),
      quality: JSON.parse(row.quality_data),
      trends: JSON.parse(row.trends_data),
      summary: JSON.parse(row.summary_data)
    };
  }

  async getMetricsByDateRange(startDate: string, endDate: string): Promise<TestMetrics[]> {
    try {
      if (this.dbPath.endsWith('.db')) {
        return this.getMetricsByDateRangeSQLite(startDate, endDate);
      } else {
        return this.getMetricsByDateRangeJSON(startDate, endDate);
      }
    } catch (error) {
      console.error('Failed to retrieve metrics by date range:', error);
      return [];
    }
  }

  private async getMetricsByDateRangeSQLite(startDate: string, endDate: string): Promise<TestMetrics[]> {
    return new Promise((resolve) => {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(this.dbPath);

      const query = `
        SELECT * FROM analytics_metrics
        WHERE timestamp BETWEEN ? AND ?
        ORDER BY timestamp ASC
      `;

      db.all(query, [startDate, endDate], (err, rows: AnalyticsTableRow[]) => {
        db.close();

        if (err) {
          resolve([]);
          return;
        }

        const metrics = rows.map(row => this.parseAnalyticsTableRow(row));
        resolve(metrics);
      });
    });
  }

  private async getMetricsByDateRangeJSON(startDate: string, endDate: string): Promise<TestMetrics[]> {
    try {
      const jsonPath = this.dbPath.replace('.db', '.json');
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const allMetrics = data.metrics || [];

      return allMetrics.filter((metric: TestMetrics) => {
        const metricDate = new Date(metric.timestamp);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return metricDate >= start && metricDate <= end;
      });
    } catch (error) {
      console.error('Failed to retrieve metrics by date range from JSON:', error);
      return [];
    }
  }

  async exportData(exportPath: string): Promise<boolean> {
    try {
      const metrics = await this.getMetrics(10000); // Get all metrics
      const exportData = {
        exportedAt: new Date().toISOString(),
        config: this.config,
        metrics: metrics.metrics
      };

      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to export data:', error);
      return false;
    }
  }

  async importData(importPath: string): Promise<boolean> {
    try {
      const importData = JSON.parse(fs.readFileSync(importPath, 'utf8'));

      if (!importData.metrics || !Array.isArray(importData.metrics)) {
        throw new Error('Invalid import data format');
      }

      // Import each metric
      for (const metric of importData.metrics) {
        await this.storeMetrics(metric);
      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  async cleanupOldData(): Promise<void> {
    const retentionMonths = this.config.retention.detailedDataMonths;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

    try {
      if (this.dbPath.endsWith('.db')) {
        return this.cleanupOldDataSQLite(cutoffDate.toISOString());
      } else {
        return this.cleanupOldDataJSON(cutoffDate.toISOString());
      }
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  private async cleanupOldDataSQLite(cutoffDate: string): Promise<void> {
    return new Promise((resolve) => {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(this.dbPath);

      db.serialize(() => {
        db.run('DELETE FROM analytics_metrics WHERE timestamp < ?', [cutoffDate]);
        db.run('DELETE FROM coverage_history WHERE created_at < ?', [cutoffDate]);
        db.run('DELETE FROM performance_history WHERE created_at < ?', [cutoffDate]);
        db.run('DELETE FROM quality_history WHERE created_at < ?', [cutoffDate]);
      });

      db.close(() => resolve());
    });
  }

  private async cleanupOldDataJSON(cutoffDate: string): Promise<void> {
    try {
      const jsonPath = this.dbPath.replace('.db', '.json');
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      data.metrics = (data.metrics || []).filter((metric: TestMetrics) => {
        return new Date(metric.timestamp) >= new Date(cutoffDate);
      });

      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to cleanup old JSON data:', error);
    }
  }

  async getStorageStats(): Promise<{
    totalRecords: number;
    oldestRecord: string | null;
    newestRecord: string | null;
    storageSize: number;
  }> {
    try {
      if (this.dbPath.endsWith('.db')) {
        return this.getStorageStatsSQLite();
      } else {
        return this.getStorageStatsJSON();
      }
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { totalRecords: 0, oldestRecord: null, newestRecord: null, storageSize: 0 };
    }
  }

  private async getStorageStatsSQLite(): Promise<any> {
    return new Promise((resolve) => {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(this.dbPath);

      const query = `
        SELECT
          COUNT(*) as totalRecords,
          MIN(timestamp) as oldestRecord,
          MAX(timestamp) as newestRecord
        FROM analytics_metrics
      `;

      db.get(query, (err, row: any) => {
        db.close();

        if (err) {
          resolve({ totalRecords: 0, oldestRecord: null, newestRecord: null, storageSize: 0 });
          return;
        }

        try {
          const stats = fs.statSync(this.dbPath);
          resolve({
            totalRecords: row.totalRecords,
            oldestRecord: row.oldestRecord,
            newestRecord: row.newestRecord,
            storageSize: stats.size
          });
        } catch {
          resolve({
            totalRecords: row.totalRecords,
            oldestRecord: row.oldestRecord,
            newestRecord: row.newestRecord,
            storageSize: 0
          });
        }
      });
    });
  }

  private async getStorageStatsJSON(): Promise<any> {
    try {
      const jsonPath = this.dbPath.replace('.db', '.json');
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const metrics = data.metrics || [];

      const stats = fs.statSync(jsonPath);
      const totalRecords = metrics.length;
      const oldestRecord = metrics.length > 0 ? metrics[0].timestamp : null;
      const newestRecord = metrics.length > 0 ? metrics[metrics.length - 1].timestamp : null;

      return {
        totalRecords,
        oldestRecord,
        newestRecord,
        storageSize: stats.size
      };
    } catch (error) {
      console.error('Failed to get JSON storage stats:', error);
      return { totalRecords: 0, oldestRecord: null, newestRecord: null, storageSize: 0 };
    }
  }
}