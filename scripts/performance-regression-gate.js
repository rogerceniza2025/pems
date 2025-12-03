#!/usr/bin/env node

/**
 * Performance Regression Gate
 *
 * This script implements automated performance regression detection and enforcement.
 * It establishes baselines, detects regressions, and can enforce quality gates
 * in CI/CD pipelines.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import analytics components (if available)
let analyticsComponents = null;
try {
  const { PerformanceCollector } = require('./analytics/collectors/PerformanceCollector.js');
  const { DatabaseStorage } = require('./analytics/storage/DatabaseStorage.js');
  const { MetricsCalculator } = require('./analytics/utils/MetricsCalculator.js');
  analyticsComponents = { PerformanceCollector, DatabaseStorage, MetricsCalculator };
} catch (error) {
  console.warn('⚠️  Analytics components not available, running in standalone mode');
}

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  colorLog('red', `❌ ${message}`);
}

function logSuccess(message) {
  colorLog('green', `✅ ${message}`);
}

function logWarning(message) {
  colorLog('yellow', `⚠️  ${message}`);
}

function logInfo(message) {
  colorLog('blue', `ℹ️  ${message}`);
}

class PerformanceRegressionGate {
  constructor(options = {}) {
    this.options = {
      enforceGates: options.enforceGates || false,
      generateReport: options.generateReport || false,
      reportPath: options.reportPath || 'performance-regression-report.json',
      baselinePath: options.baselinePath || '.performance-baselines.json',
      thresholds: {
        bundleSizeGrowth: options.bundleSizeGrowth || 10, // 10% growth threshold
        apiResponseTimeIncrease: options.apiResponseTimeIncrease || 20, // 20% slowdown threshold
        lighthouseScoreDecrease: options.lighthouseScoreDecrease || 5, // 5 point decrease threshold
        coreWebVitalsRegression: options.coreWebVitalsRegression || 15, // 15% regression threshold
        ...options.thresholds
      },
      ...options
    };

    this.regressions = [];
    this.baselines = this.loadBaselines();
  }

  /**
   * Main execution method
   */
  async run() {
    logInfo('🚀 Starting Performance Regression Gate');
    console.log('='.repeat(50));

    try {
      // Collect current performance metrics
      const currentMetrics = await this.collectCurrentMetrics();
      if (!currentMetrics) {
        logError('Failed to collect current performance metrics');
        return this.handleFailure();
      }

      // Detect regressions
      await this.detectRegressions(currentMetrics);

      // Generate report
      if (this.options.generateReport) {
        await this.generateReport(currentMetrics);
      }

      // Update baselines if no regressions
      if (this.regressions.length === 0) {
        await this.updateBaselines(currentMetrics);
      }

      // Enforce gates if enabled
      if (this.options.enforceGates) {
        return this.enforceGates();
      }

      return this.regressions.length === 0;

    } catch (error) {
      logError(`Performance regression gate failed: ${error.message}`);
      return this.handleFailure();
    }
  }

  /**
   * Load performance baselines from file
   */
  loadBaselines() {
    try {
      if (fs.existsSync(this.options.baselinePath)) {
        const baselineData = JSON.parse(fs.readFileSync(this.options.baselinePath, 'utf8'));
        logInfo(`Loaded baselines from ${this.options.baselinePath}`);
        return baselineData;
      }
    } catch (error) {
      logWarning(`Could not load baselines: ${error.message}`);
    }
    return {};
  }

  /**
   * Collect current performance metrics
   */
  async collectCurrentMetrics() {
    try {
      if (analyticsComponents) {
        // Use analytics components if available
        const analyticsConfig = this.getAnalyticsConfig();
        const storage = new analyticsComponents.DatabaseStorage(analyticsConfig);
        const collector = new analyticsComponents.PerformanceCollector(storage, analyticsConfig);

        const gitInfo = await this.getGitInfo();
        const metrics = await collector.collectPerformanceData(gitInfo);
        return metrics;
      } else {
        // Fallback to basic performance collection
        return await this.collectBasicMetrics();
      }
    } catch (error) {
      logError(`Failed to collect performance metrics: ${error.message}`);
      return null;
    }
  }

  /**
   * Collect basic performance metrics (fallback)
   */
  async collectBasicMetrics() {
    const metrics = {
      bundles: await this.collectBundleMetrics(),
      api: await this.collectApiMetrics(),
      coreWebVitals: await this.collectCoreWebVitals(),
      lighthouse: await this.collectLighthouseMetrics()
    };

    return metrics;
  }

  /**
   * Detect performance regressions
   */
  async detectRegressions(currentMetrics) {
    logInfo('🔍 Analyzing performance for regressions...');

    this.regressions = [];

    // Check bundle size regressions
    this.detectBundleSizeRegressions(currentMetrics);

    // Check API performance regressions
    this.detectApiRegressions(currentMetrics);

    // Check Core Web Vitals regressions
    this.detectCoreWebVitalsRegressions(currentMetrics);

    // Check Lighthouse score regressions
    this.detectLighthouseRegressions(currentMetrics);

    // Use analytics components for advanced regression detection if available
    if (analyticsComponents && this.baselines.historicalMetrics) {
      await this.detectAdvancedRegressions(currentMetrics);
    }

    this.reportRegressions();
  }

  /**
   * Detect bundle size regressions
   */
  detectBundleSizeRegressions(currentMetrics) {
    if (!currentMetrics.bundles || currentMetrics.bundles.length === 0) return;

    currentMetrics.bundles.forEach(bundle => {
      const baseline = this.baselines.bundles?.[bundle.name];
      if (!baseline) return;

      const growthPercent = ((bundle.gzippedSize - baseline.gzippedSize) / baseline.gzippedSize) * 100;

      if (growthPercent > this.options.thresholds.bundleSizeGrowth) {
        this.regressions.push({
          type: 'bundle_size',
          severity: growthPercent > 20 ? 'critical' : 'high',
          metric: bundle.name,
          baseline: baseline.gzippedSize,
          current: bundle.gzippedSize,
          growth: growthPercent,
          description: `Bundle ${bundle.name} has grown by ${growthPercent.toFixed(1)}% from baseline`,
          recommendations: [
            'Analyze bundle composition for unnecessary dependencies',
            'Implement code splitting for non-critical components',
            'Review recent changes that may have increased bundle size'
          ]
        });
      }
    });
  }

  /**
   * Detect API performance regressions
   */
  detectApiRegressions(currentMetrics) {
    if (!currentMetrics.api || currentMetrics.api.length === 0) return;

    currentMetrics.api.forEach(api => {
      const baseline = this.baselines.api?.find(b => b.endpoint === api.endpoint);
      if (!baseline) return;

      const slowdownPercent = ((api.responseTime - baseline.responseTime) / baseline.responseTime) * 100;

      if (slowdownPercent > this.options.thresholds.apiResponseTimeIncrease) {
        this.regressions.push({
          type: 'api_performance',
          severity: slowdownPercent > 50 ? 'critical' : 'high',
          metric: api.endpoint,
          baseline: baseline.responseTime,
          current: api.responseTime,
          growth: slowdownPercent,
          description: `API ${api.endpoint} has slowed down by ${slowdownPercent.toFixed(1)}% from baseline`,
          recommendations: [
            'Profile database queries for performance bottlenecks',
            'Check for N+1 query problems',
            'Review recent algorithm changes'
          ]
        });
      }
    });
  }

  /**
   * Detect Core Web Vitals regressions
   */
  detectCoreWebVitalsRegressions(currentMetrics) {
    if (!currentMetrics.coreWebVitals) return;

    const vitalsMetrics = ['FCP', 'LCP', 'CLS', 'INP', 'TTFB'];

    vitalsMetrics.forEach(vital => {
      const baseline = this.baselines.coreWebVitals?.[vital];
      const current = currentMetrics.coreWebVitals[vital];

      if (!baseline || !current) return;

      const regressionPercent = ((current.value - baseline.value) / baseline.value) * 100;

      if (regressionPercent > this.options.thresholds.coreWebVitalsRegression) {
        this.regressions.push({
          type: 'core_web_vitals',
          severity: regressionPercent > 30 ? 'critical' : 'high',
          metric: vital,
          baseline: baseline.value,
          current: current.value,
          growth: regressionPercent,
          description: `Core Web Vital ${vital} has regressed by ${regressionPercent.toFixed(1)}% from baseline`,
          recommendations: this.getCoreWebVitalsRecommendations(vital)
        });
      }
    });
  }

  /**
   * Detect Lighthouse score regressions
   */
  detectLighthouseRegressions(currentMetrics) {
    if (!currentMetrics.lighthouse) return;

    const categories = ['performance', 'accessibility', 'best-practices', 'seo'];

    categories.forEach(category => {
      const baseline = this.baselines.lighthouse?.[category];
      const current = currentMetrics.lighthouse[category];

      if (!baseline || !current) return;

      const scoreDecrease = baseline.score - current.score;

      if (scoreDecrease > this.options.thresholds.lighthouseScoreDecrease) {
        this.regressions.push({
          type: 'lighthouse_score',
          severity: scoreDecrease > 15 ? 'high' : 'medium',
          metric: category,
          baseline: baseline.score,
          current: current.score,
          growth: scoreDecrease,
          description: `Lighthouse ${category} score has decreased by ${scoreDecrease} points from baseline`,
          recommendations: this.getLighthouseRecommendations(category)
        });
      }
    });
  }

  /**
   * Advanced regression detection using analytics
   */
  async detectAdvancedRegressions(currentMetrics) {
    try {
      const storage = new analyticsComponents.DatabaseStorage(this.getAnalyticsConfig());
      const calculator = new analyticsComponents.MetricsCalculator(this.getAnalyticsConfig());

      // Get historical metrics
      const historicalMetrics = await storage.getMetricsByDateRange(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        new Date().toISOString()
      );

      if (historicalMetrics.length < 3) return;

      // Create temporary TestMetrics object for current data
      const currentTestMetrics = {
        id: `current-${Date.now()}`,
        timestamp: new Date().toISOString(),
        performance: currentMetrics,
        coverage: {},
        quality: {},
        trends: {},
        summary: { overallScore: 0, status: 'passing', criticalIssues: [], recommendations: [] }
      };

      // Detect performance regressions using analytics
      const performanceRegressions = calculator.detectPerformanceRegressions(
        currentTestMetrics,
        historicalMetrics
      );

      performanceRegressions.forEach(regression => {
        this.regressions.push({
          type: 'advanced_performance',
          severity: regression.severity,
          metric: regression.affectedMetrics.join(', '),
          baseline: regression.baselineValue,
          current: regression.currentValue,
          growth: regression.deviation,
          description: regression.description,
          recommendations: regression.recommendations
        });
      });

    } catch (error) {
      logWarning(`Advanced regression detection failed: ${error.message}`);
    }
  }

  /**
   * Report detected regressions
   */
  reportRegressions() {
    console.log('\n📊 Performance Regression Analysis');
    console.log('='.repeat(50));

    if (this.regressions.length === 0) {
      logSuccess('No performance regressions detected');
      return;
    }

    console.log(`\n🚨 ${this.regressions.length} Regression(s) Detected:`);

    this.regressions.forEach((regression, index) => {
      console.log(`\n${index + 1}. ${regression.type.toUpperCase()} - ${regression.severity.toUpperCase()}`);
      console.log(`   Metric: ${regression.metric}`);
      console.log(`   Description: ${regression.description}`);
      console.log(`   Baseline: ${regression.baseline}`);
      console.log(`   Current: ${regression.current}`);
      if (regression.growth !== undefined) {
        console.log(`   Change: ${regression.growth.toFixed(1)}%`);
      }
      console.log(`   Recommendations:`);
      regression.recommendations.forEach(rec => {
        console.log(`     • ${rec}`);
      });
    });
  }

  /**
   * Update baselines with current metrics
   */
  async updateBaselines(currentMetrics) {
    try {
      const updatedBaselines = {
        timestamp: new Date().toISOString(),
        bundles: currentMetrics.bundles?.reduce((acc, bundle) => {
          acc[bundle.name] = {
            gzippedSize: bundle.gzippedSize,
            size: bundle.size,
            path: bundle.path
          };
          return acc;
        }, {}) || {},
        api: currentMetrics.api || [],
        coreWebVitals: currentMetrics.coreWebVitals || {},
        lighthouse: currentMetrics.lighthouse || {}
      };

      fs.writeFileSync(this.options.baselinePath, JSON.stringify(updatedBaselines, null, 2));
      logInfo(`Updated performance baselines: ${this.options.baselinePath}`);

    } catch (error) {
      logError(`Failed to update baselines: ${error.message}`);
    }
  }

  /**
   * Generate detailed report
   */
  async generateReport(currentMetrics) {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          regressionsCount: this.regressions.length,
          criticalRegressions: this.regressions.filter(r => r.severity === 'critical').length,
          highRegressions: this.regressions.filter(r => r.severity === 'high').length,
          mediumRegressions: this.regressions.filter(r => r.severity === 'medium').length,
          passed: this.regressions.length === 0
        },
        thresholds: this.options.thresholds,
        currentMetrics,
        baselines: this.baselines,
        regressions: this.regressions,
        recommendations: this.generateOverallRecommendations()
      };

      fs.writeFileSync(this.options.reportPath, JSON.stringify(report, null, 2));
      logInfo(`Performance regression report generated: ${this.options.reportPath}`);

    } catch (error) {
      logError(`Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Enforce quality gates
   */
  enforceGates() {
    if (this.regressions.length === 0) {
      logSuccess('Performance regression gate passed');
      return true;
    }

    const criticalRegressions = this.regressions.filter(r => r.severity === 'critical');

    if (criticalRegressions.length > 0) {
      logError(`Performance regression gate failed - ${criticalRegressions.length} critical regressions detected`);
      process.exit(1);
    }

    logWarning('Performance regression gate passed with warnings');
    return true;
  }

  /**
   * Handle failure scenarios
   */
  handleFailure() {
    if (this.options.enforceGates) {
      logError('Performance regression gate failed');
      process.exit(1);
    }
    return false;
  }

  // Helper methods

  getAnalyticsConfig() {
    return {
      thresholds: {
        coverage: { global: { lines: 80, functions: 80, branches: 75, statements: 80 } },
        performance: {
          bundleSizeGrowth: this.options.thresholds.bundleSizeGrowth,
          apiResponseTimeIncrease: this.options.thresholds.apiResponseTimeIncrease,
          lighthouseScoreMin: 85
        },
        quality: {
          minTestSuccessRate: 80,
          minTddComplianceRate: 90,
          maxFlakyTestRate: 5
        }
      },
      retention: {
        detailedDataMonths: 13,
        aggregatedDataMonths: 36,
        compressionEnabled: true
      },
      alerts: {
        enabled: true,
        channels: ['email', 'slack'],
        thresholds: { critical: 5, warning: 2 }
      }
    };
  }

  async getGitInfo() {
    try {
      const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      const author = execSync('git config user.name', { encoding: 'utf8' }).trim();

      return { commitHash, branch, author };
    } catch (error) {
      return null;
    }
  }

  async collectBundleMetrics() {
    // This would use the performance budget script logic
    try {
      const PerformanceBudgetChecker = require('./performance-budget');
      const checker = new PerformanceBudgetChecker({ checkOnly: true });
      await checker.checkAll();
      return checker.results.bundles;
    } catch {
      return [];
    }
  }

  async collectApiMetrics() {
    // Placeholder implementation
    return this.getApiEndpoints().map(endpoint => ({
      endpoint,
      responseTime: Math.random() * 500 + 100,
      max: 1000,
      warning: 800,
      passed: true
    }));
  }

  async collectCoreWebVitals() {
    // Placeholder implementation
    return {
      FCP: { value: 1500, target: 1800, warning: 2500, passed: true },
      LCP: { value: 2500, target: 2500, warning: 4000, passed: true },
      CLS: { value: 0.1, target: 0.1, warning: 0.25, passed: true },
      INP: { value: 100, target: 100, warning: 200, passed: true },
      TTFB: { value: 400, target: 600, warning: 1000, passed: true }
    };
  }

  async collectLighthouseMetrics() {
    // Placeholder implementation
    return {
      performance: { score: 90, min: 85, warning: 80, passed: true },
      accessibility: { score: 95, min: 90, warning: 85, passed: true },
      'best-practices': { score: 92, min: 90, warning: 85, passed: true },
      seo: { score: 88, min: 85, warning: 80, passed: true }
    };
  }

  getApiEndpoints() {
    return [
      '/api/v1/auth/login',
      '/api/v1/users/me',
      '/api/v1/dashboard/overview',
      '/api/v1/tenant/current'
    ];
  }

  getCoreWebVitalsRecommendations(vital) {
    const recommendations = {
      FCP: [
        'Optimize server response time',
        'Reduce render-blocking resources',
        'Eliminate unused CSS/JavaScript'
      ],
      LCP: [
        'Optimize images and videos',
        'Preload important resources',
        'Remove third-party scripts that block rendering'
      ],
      CLS: [
        'Include size attributes for images and videos',
        'Reserve space for ad containers and iframes',
        'Avoid inserting content above existing content'
      ],
      INP: [
        'Reduce JavaScript execution time',
        'Break up long tasks',
        'Optimize event handlers'
      ],
      TTFB: [
        'Improve server response time',
        'Use CDN for static assets',
        'Optimize database queries'
      ]
    };

    return recommendations[vital] || ['Investigate specific performance bottlenecks'];
  }

  getLighthouseRecommendations(category) {
    const recommendations = {
      performance: [
        'Optimize images and reduce unused JavaScript',
        'Improve server response time and enable compression',
        'Reduce initial server response time'
      ],
      accessibility: [
        'Improve color contrast and text alternatives',
        'Add proper ARIA labels and landmarks',
        'Ensure keyboard navigation works properly'
      ],
      'best-practices': [
        'Update dependencies and security headers',
        'Implement proper error handling',
        'Use modern web standards and APIs'
      ],
      seo: [
        'Improve meta tags and structured data',
        'Add proper headings and semantic HTML',
        'Ensure mobile-friendly design'
      ]
    };

    return recommendations[category] || ['Follow Lighthouse recommendations for improvement'];
  }

  generateOverallRecommendations() {
    const recommendations = [];

    if (this.regressions.some(r => r.type === 'bundle_size')) {
      recommendations.push('Implement bundle analysis and optimization in CI/CD pipeline');
    }

    if (this.regressions.some(r => r.type === 'api_performance')) {
      recommendations.push('Set up API performance monitoring and alerting');
    }

    if (this.regressions.some(r => r.type === 'core_web_vitals')) {
      recommendations.push('Monitor Core Web Vitals in production');
    }

    if (this.regressions.length > 3) {
      recommendations.push('Consider implementing performance budgets more strictly');
    }

    return recommendations;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    enforceGates: args.includes('--enforce'),
    generateReport: args.includes('--report'),
    reportPath: args.find(arg => arg.startsWith('--report-path='))?.split('=')[1],
    baselinePath: args.find(arg => arg.startsWith('--baseline-path='))?.split('=')[1],
    bundleSizeGrowth: args.find(arg => arg.startsWith('--bundle-threshold='))?.split('=')[1] ?
      parseFloat(args.find(arg => arg.startsWith('--bundle-threshold='))?.split('=')[1]) : undefined,
    apiResponseTimeIncrease: args.find(arg => arg.startsWith('--api-threshold='))?.split('=')[1] ?
      parseFloat(args.find(arg => arg.startsWith('--api-threshold='))?.split('=')[1]) : undefined
  };

  const gate = new PerformanceRegressionGate(options);
  gate.run().then(passed => {
    if (passed) {
      console.log('\n🎉 Performance regression gate completed successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Performance regressions detected!');
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = PerformanceRegressionGate;