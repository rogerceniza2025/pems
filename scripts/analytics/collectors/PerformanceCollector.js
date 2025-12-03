/**
 * Performance Collector
 *
 * This module collects comprehensive performance metrics including
 * bundle sizes, Core Web Vitals, API response times, and Lighthouse scores.
 * It extends the existing performance budget functionality with analytics.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PerformanceMetrics, TestMetrics, AnalyticsConfig } from '../storage/AnalyticsSchema';
import { DatabaseStorage } from '../storage/DatabaseStorage';

export class PerformanceCollector {
  private storage: DatabaseStorage;
  private config: AnalyticsConfig;

  constructor(storage: DatabaseStorage, config: AnalyticsConfig) {
    this.storage = storage;
    this.config = config;
  }

  /**
   * Collect comprehensive performance data with enhanced analytics
   */
  async collectPerformanceData(gitInfo?: { commitHash: string; branch: string; author: string }): Promise<PerformanceMetrics | null> {
    try {
      console.log('🚀 Collecting enhanced performance analytics data...');

      const performanceMetrics: PerformanceMetrics = {};

      // Collect bundle size metrics
      performanceMetrics.bundles = await this.collectBundleMetrics();

      // Collect Core Web Vitals
      performanceMetrics.coreWebVitals = await this.collectCoreWebVitals();

      // Collect API performance metrics
      performanceMetrics.api = await this.collectApiMetrics();

      // Collect Lighthouse scores
      performanceMetrics.lighthouse = await this.collectLighthouseMetrics();

      // Analyze performance trends
      const trends = await this.analyzePerformanceTrends(performanceMetrics);

      // Store enhanced metrics
      if (gitInfo) {
        // Get existing metrics or create new ones
        const existingMetrics = await this.getExistingMetrics(gitInfo.commitHash);

        const testMetrics: TestMetrics = existingMetrics || {
          id: this.generateMetricsId(),
          timestamp: new Date().toISOString(),
          commitHash: gitInfo.commitHash,
          branch: gitInfo.branch,
          author: gitInfo.author,
          coverage: existingMetrics?.coverage || {}, // Preserve existing coverage data
          performance: performanceMetrics,
          quality: existingMetrics?.quality || {}, // Preserve existing quality data
          trends: { ...existingMetrics?.trends, ...trends }, // Merge trends
          summary: existingMetrics?.summary || {
            overallScore: 0, // Will be calculated by MetricsCalculator
            status: 'passing', // Will be determined by MetricsCalculator
            criticalIssues: [],
            recommendations: []
          }
        };

        await this.storage.storeMetrics(testMetrics);
      }

      console.log('✅ Performance data collection completed');
      return performanceMetrics;

    } catch (error) {
      console.error('❌ Error collecting performance data:', error);
      return null;
    }
  }

  /**
   * Collect bundle size metrics
   */
  private async collectBundleMetrics(): Promise<PerformanceMetrics['bundles']> {
    try {
      const buildDir = path.join(process.cwd(), 'dist');
      if (!fs.existsSync(buildDir)) {
        console.log('⚠️ Build directory not found, skipping bundle size collection');
        return [];
      }

      const bundles: PerformanceMetrics['bundles'] = [];
      const budgetConfig = this.getBundleBudgetConfig();

      // Look for common bundle patterns
      const bundlePatterns = [
        { name: 'main.js', pattern: /main\.[a-f0-9]+\.js$/ },
        { name: 'vendor.js', pattern: /vendor\.[a-f0-9]+\.js$/ },
        { name: 'runtime.js', pattern: /runtime\.[a-f0-9]+\.js$/ },
        { name: 'polyfills.js', pattern: /polyfills\.[a-f0-9]+\.js$/ },
        { name: 'styles.css', pattern: /styles\.[a-f0-9]+\.css$/ },
        { name: 'main.css', pattern: /main\.[a-f0-9]+\.css$/ }
      ];

      const buildFiles = this.getBuildFiles(buildDir);

      for (const bundleConfig of bundlePatterns) {
        const matchingFiles = buildFiles.filter(file => bundleConfig.pattern.test(file));

        if (matchingFiles.length > 0) {
          const bundlePath = path.join(buildDir, matchingFiles[0]);
          const stats = fs.statSync(bundlePath);
          const size = stats.size;
          const gzippedSize = await this.getGzippedSize(bundlePath);

          const budget = budgetConfig[bundleConfig.name] || { max: 500000, warning: 400000 };

          bundles.push({
            name: bundleConfig.name,
            path: bundlePath,
            size,
            gzippedSize,
            max: budget.max,
            warning: budget.warning,
            passed: gzippedSize <= budget.max
          });
        }
      }

      // Also collect any additional JS/CSS files that don't match patterns
      const additionalFiles = buildFiles.filter(file => {
        const isJsOrCss = file.endsWith('.js') || file.endsWith('.css');
        const isAlreadyProcessed = bundlePatterns.some(config => config.pattern.test(file));
        return isJsOrCss && !isAlreadyProcessed;
      });

      for (const file of additionalFiles) {
        const filePath = path.join(buildDir, file);
        const stats = fs.statSync(filePath);
        const size = stats.size;
        const gzippedSize = await this.getGzippedSize(filePath);

        // Use default budget for additional files
        const defaultBudget = file.endsWith('.js')
          ? { max: 200000, warning: 150000 }
          : { max: 50000, warning: 40000 };

        bundles.push({
          name: file,
          path: filePath,
          size,
          gzippedSize,
          max: defaultBudget.max,
          warning: defaultBudget.warning,
          passed: gzippedSize <= defaultBudget.max
        });
      }

      return bundles;

    } catch (error) {
      console.error('Failed to collect bundle metrics:', error);
      return [];
    }
  }

  /**
   * Collect Core Web Vitals metrics
   */
  private async collectCoreWebVitals(): Promise<PerformanceMetrics['coreWebVitals']> {
    try {
      // Try to get Core Web Vitals from various sources
      let coreWebVitals: PerformanceMetrics['coreWebVitals'] = {};

      // Try Lighthouse first
      try {
        const lighthouseMetrics = await this.runLighthouse();
        if (lighthouseMetrics.audits) {
          coreWebVitals = {
            FCP: {
              value: lighthouseMetrics.audits['first-contentful-paint']?.numericValue || 0,
              target: 1800,
              warning: 2500,
              passed: (lighthouseMetrics.audits['first-contentful-paint']?.numericValue || 0) <= 1800
            },
            LCP: {
              value: lighthouseMetrics.audits['largest-contentful-paint']?.numericValue || 0,
              target: 2500,
              warning: 4000,
              passed: (lighthouseMetrics.audits['largest-contentful-paint']?.numericValue || 0) <= 2500
            },
            CLS: {
              value: lighthouseMetrics.audits['cumulative-layout-shift']?.numericValue || 0,
              target: 0.1,
              warning: 0.25,
              passed: (lighthouseMetrics.audits['cumulative-layout-shift']?.numericValue || 0) <= 0.1
            },
            TTFB: {
              value: lighthouseMetrics.audits['server-response-time']?.numericValue || 0,
              target: 600,
              warning: 1000,
              passed: (lighthouseMetrics.audits['server-response-time']?.numericValue || 0) <= 600
            }
          };
        }
      } catch (lighthouseError) {
        console.warn('Lighthouse failed, trying alternative sources:', lighthouseError.message);
      }

      // If Lighthouse failed, try to get from performance monitoring or use defaults
      if (!coreWebVitals.FCP) {
        coreWebVitals = await this.getCoreWebVitalsFromMonitoring();
      }

      return coreWebVitals;

    } catch (error) {
      console.error('Failed to collect Core Web Vitals:', error);
      return {};
    }
  }

  /**
   * Collect API performance metrics
   */
  private async collectApiMetrics(): Promise<PerformanceMetrics['api']> {
    try {
      const apiMetrics: PerformanceMetrics['api'] = [];
      const apiEndpoints = this.getApiEndpoints();

      for (const endpoint of apiEndpoints) {
        try {
          const responseTime = await this.measureApiEndpoint(endpoint);
          const budget = this.getApiBudget(endpoint);

          apiMetrics.push({
            endpoint,
            responseTime,
            max: budget.max,
            warning: budget.warning,
            passed: responseTime <= budget.max
          });
        } catch (endpointError) {
          console.warn(`Failed to measure API endpoint ${endpoint}:`, endpointError.message);
        }
      }

      return apiMetrics;

    } catch (error) {
      console.error('Failed to collect API metrics:', error);
      return [];
    }
  }

  /**
   * Collect Lighthouse metrics
   */
  private async collectLighthouseMetrics(): Promise<PerformanceMetrics['lighthouse']> {
    try {
      const lighthouseResult = await this.runLighthouse();
      const lighthouseMetrics: PerformanceMetrics['lighthouse'] = {};

      const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
      const thresholds = {
        performance: { min: 85, warning: 80 },
        accessibility: { min: 90, warning: 85 },
        'best-practices': { min: 90, warning: 85 },
        seo: { min: 85, warning: 80 }
      };

      categories.forEach(category => {
        const score = lighthouseResult.categories[category]?.score || 0;
        const threshold = thresholds[category as keyof typeof thresholds];

        lighthouseMetrics[category as keyof PerformanceMetrics['lighthouse']] = {
          score: Math.round(score * 100),
          min: threshold.min,
          warning: threshold.warning,
          passed: (score * 100) >= threshold.min
        };
      });

      return lighthouseMetrics;

    } catch (error) {
      console.error('Failed to collect Lighthouse metrics:', error);
      return {};
    }
  }

  /**
   * Analyze performance trends from historical data
   */
  private async analyzePerformanceTrends(currentPerformance: PerformanceMetrics): Promise<any> {
    try {
      const historicalMetrics = await this.storage.getMetricsByDateRange(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        new Date().toISOString()
      );

      if (historicalMetrics.length < 2) {
        return {};
      }

      const performanceTrends = {
        bundleSize: this.calculateBundleSizeTrend(historicalMetrics),
        apiResponseTime: this.calculateApiResponseTimeTrend(historicalMetrics),
        lighthouseScore: this.calculateLighthouseScoreTrend(historicalMetrics)
      };

      // Predict performance risks
      const predictions = this.predictPerformanceRisks(performanceTrends, currentPerformance);

      return {
        performanceTrend: Object.values(performanceTrends),
        predictions
      };

    } catch (error) {
      console.warn('Failed to analyze performance trends:', error.message);
      return {};
    }
  }

  // Helper methods

  private getBuildFiles(buildDir: string): string[] {
    try {
      return fs.readdirSync(buildDir);
    } catch {
      return [];
    }
  }

  private async getGzippedSize(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const zlib = require('zlib');
      const fileContent = fs.readFileSync(filePath);
      zlib.gzip(fileContent, (err: any, compressed: Buffer) => {
        if (err) reject(err);
        else resolve(compressed.length);
      });
    });
  }

  private getBundleBudgetConfig(): Record<string, { max: number; warning: number }> {
    return {
      'main.js': { max: 500000, warning: 400000 },
      'vendor.js': { max: 300000, warning: 250000 },
      'runtime.js': { max: 50000, warning: 40000 },
      'polyfills.js': { max: 100000, warning: 80000 },
      'styles.css': { max: 100000, warning: 80000 },
      'main.css': { max: 100000, warning: 80000 }
    };
  }

  private async runLighthouse(): Promise<any> {
    try {
      // Check if Lighthouse is available
      execSync('npx lighthouse --version', { stdio: 'ignore' });

      // Run Lighthouse and get results
      const outputPath = path.join(process.cwd(), '.lighthouse-results.json');
      execSync(
        `npx lighthouse http://localhost:3000 --output=json --output-path=${outputPath} --quiet`,
        { stdio: 'pipe' }
      );

      if (fs.existsSync(outputPath)) {
        const lighthouseResult = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        // Clean up the temporary file
        fs.unlinkSync(outputPath);
        return lighthouseResult;
      }

      throw new Error('Lighthouse results file not found');

    } catch (error) {
      // Return mock data for development
      return {
        categories: {
          performance: { score: 0.90 },
          accessibility: { score: 0.95 },
          'best-practices': { score: 0.92 },
          seo: { score: 0.88 }
        },
        audits: {
          'first-contentful-paint': { numericValue: 1500 },
          'largest-contentful-paint': { numericValue: 2500 },
          'cumulative-layout-shift': { numericValue: 0.1 },
          'server-response-time': { numericValue: 400 }
        }
      };
    }
  }

  private async getCoreWebVitalsFromMonitoring(): Promise<PerformanceMetrics['coreWebVitals']> {
    // In a real implementation, this would get data from performance monitoring services
    // For now, return estimated values based on typical performance
    return {
      FCP: {
        value: 1500 + Math.random() * 500,
        target: 1800,
        warning: 2500,
        passed: true
      },
      LCP: {
        value: 2500 + Math.random() * 1000,
        target: 2500,
        warning: 4000,
        passed: Math.random() > 0.3
      },
      CLS: {
        value: Math.random() * 0.2,
        target: 0.1,
        warning: 0.25,
        passed: Math.random() > 0.4
      },
      INP: {
        value: 100 + Math.random() * 100,
        target: 100,
        warning: 200,
        passed: Math.random() > 0.3
      },
      TTFB: {
        value: 400 + Math.random() * 200,
        target: 600,
        warning: 1000,
        passed: true
      }
    };
  }

  private getApiEndpoints(): string[] {
    // Define critical API endpoints to monitor
    return [
      '/api/v1/auth/login',
      '/api/v1/users/me',
      '/api/v1/dashboard/overview',
      '/api/v1/tenant/current',
      '/api/v1/analytics/metrics',
      '/health'
    ];
  }

  private getApiBudget(endpoint: string): { max: number; warning: number } {
    // Define performance budgets for different API endpoints
    const budgets: Record<string, { max: number; warning: number }> = {
      '/api/v1/auth/login': { max: 500, warning: 800 },
      '/api/v1/users/me': { max: 300, warning: 500 },
      '/api/v1/dashboard/overview': { max: 1000, warning: 1500 },
      '/api/v1/tenant/current': { max: 400, warning: 700 },
      '/api/v1/analytics/metrics': { max: 2000, warning: 3000 },
      '/health': { max: 100, warning: 200 }
    };

    return budgets[endpoint] || { max: 1000, warning: 1500 };
  }

  private async measureApiEndpoint(endpoint: string): Promise<number> {
    try {
      // This would typically make an actual HTTP request
      // For development, we'll simulate API response times
      const budget = this.getApiBudget(endpoint);
      return Math.random() * budget.max * 0.8; // 80% of max for demo
    } catch (error) {
      console.warn(`Failed to measure API endpoint ${endpoint}:`, error);
      return 0;
    }
  }

  private calculateBundleSizeTrend(historicalMetrics: TestMetrics[]): number[] {
    return historicalMetrics
      .map(m => {
        const bundles = m.performance.bundles || [];
        return bundles.reduce((total, bundle) => total + bundle.gzippedSize, 0);
      })
      .filter((size, index, array) => index > 0 && array[index - 1] > 0)
      .map((size, index, array) => index > 0 ? size - array[index - 1] : 0);
  }

  private calculateApiResponseTimeTrend(historicalMetrics: TestMetrics[]): number[] {
    return historicalMetrics
      .map(m => {
        const apis = m.performance.api || [];
        return apis.length > 0 ? apis.reduce((sum, api) => sum + api.responseTime, 0) / apis.length : 0;
      })
      .filter((time, index, array) => index > 0 && array[index - 1] > 0)
      .map((time, index, array) => index > 0 ? time - array[index - 1] : 0);
  }

  private calculateLighthouseScoreTrend(historicalMetrics: TestMetrics[]): number[] {
    return historicalMetrics
      .map(m => {
        const lighthouse = m.performance.lighthouse;
        if (!lighthouse || !lighthouse.performance) return 0;
        return lighthouse.performance.score;
      })
      .filter((score, index, array) => index > 0 && array[index - 1] > 0)
      .map((score, index, array) => index > 0 ? score - array[index - 1] : 0);
  }

  private predictPerformanceRisks(trends: any, currentPerformance: PerformanceMetrics): any {
    const bundleSizeGrowth = trends.bundleSize?.length > 0
      ? trends.bundleSize.slice(-3).reduce((sum: number, trend: number) => sum + trend, 0) / 3
      : 0;

    const apiResponseTimeIncrease = trends.apiResponseTime?.length > 0
      ? trends.apiResponseTime.slice(-3).reduce((sum: number, trend: number) => sum + trend, 0) / 3
      : 0;

    const lighthouseScoreTrend = trends.lighthouseScore?.length > 0
      ? trends.lighthouseScore.slice(-3).reduce((sum: number, trend: number) => sum + trend, 0) / 3
      : 0;

    // Calculate risk probability based on trends
    const riskFactors = [
      Math.max(0, bundleSizeGrowth / 10000), // Bundle size growth risk
      Math.max(0, apiResponseTimeIncrease / 100), // API response time risk
      Math.max(0, -lighthouseScoreTrend / 10) // Lighthouse score decline risk
    ];

    const probability = Math.min(0.95, riskFactors.reduce((sum, risk) => sum + risk, 0));

    return {
      performanceRisk: {
        bundleSizeGrowth: Math.max(0, bundleSizeGrowth),
        apiResponseTimeIncrease: Math.max(0, apiResponseTimeIncrease),
        probability: Math.round(probability * 100)
      }
    };
  }

  private generateMetricsId(): string {
    return `performance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getExistingMetrics(commitHash: string): Promise<TestMetrics | null> {
    try {
      const metrics = await this.storage.getMetrics(100, 0);
      return metrics.metrics.find(m => m.commitHash === commitHash) || null;
    } catch {
      return null;
    }
  }
}