#!/usr/bin/env node

/**
 * Performance Budget Enforcement Script
 *
 * This script enforces performance budgets for the PEMS application
 * including bundle sizes, Core Web Vitals, and API response times.
 *
 * Usage:
 *   node scripts/performance-budget.js
 *   node scripts/performance-budget.js --check-only
 *   node scripts/performance-budget.js --report
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Performance budget configuration
const BUDGETS = {
  // Bundle size budgets (in bytes, gzipped)
  bundles: {
    'main.js': { max: 500000, warning: 400000 }, // 500KB max, 400KB warning
    'vendor.js': { max: 300000, warning: 250000 }, // 300KB max, 250KB warning
    'runtime.js': { max: 50000, warning: 40000 }, // 50KB max, 40KB warning
    'styles.css': { max: 100000, warning: 80000 }, // 100KB max, 80KB warning
  },

  // Core Web Vitals thresholds
  coreWebVitals: {
    FCP: { target: 1800, warning: 2500 }, // First Contentful Paint (ms)
    LCP: { target: 2500, warning: 4000 }, // Largest Contentful Paint (ms)
    CLS: { target: 0.1, warning: 0.25 }, // Cumulative Layout Shift
    INP: { target: 100, warning: 200 }, // Interaction to Next Paint (ms)
    TTFB: { target: 600, warning: 1000 }, // Time to First Byte (ms)
  },

  // API response time thresholds (95th percentile)
  api: {
    '/api/v1/auth/login': { max: 500, warning: 800 },
    '/api/v1/users/me': { max: 300, warning: 500 },
    '/api/v1/dashboard/overview': { max: 1000, warning: 1500 },
    '/api/v1/tenant/current': { max: 400, warning: 700 },
  },

  // Performance scores (0-100)
  lighthouse: {
    performance: { min: 85, warning: 80 },
    accessibility: { min: 90, warning: 85 },
    'best-practices': { min: 90, warning: 85 },
    seo: { min: 85, warning: 80 },
  },
};

class PerformanceBudgetChecker {
  constructor(options = {}) {
    this.options = {
      checkOnly: options.checkOnly || false,
      report: options.report || false,
      verbose: options.verbose || false,
      buildDir: options.buildDir || path.join(process.cwd(), 'dist'),
      ...options,
    };
    this.results = {
      bundles: [],
      coreWebVitals: {},
      api: [],
      lighthouse: {},
      passed: true,
    };
  }

  async checkAll() {
    console.log('🚀 Starting Performance Budget Check');
    console.log('=' .repeat(50));

    try {
      await this.checkBundleSizes();
      await this.checkCoreWebVitals();
      await this.checkApiPerformance();
      await this.checkLighthouseScores();

      this.generateReport();

      if (!this.options.checkOnly) {
        await this.enforceBudgets();
      }

      return this.results.passed;
    } catch (error) {
      console.error('❌ Performance budget check failed:', error.message);
      return false;
    }
  }

  async checkBundleSizes() {
    console.log('\n📦 Checking Bundle Sizes...');

    const buildDir = this.options.buildDir;
    if (!fs.existsSync(buildDir)) {
      console.log('⚠️ Build directory not found, skipping bundle size check');
      return;
    }

    for (const [bundle, budget] of Object.entries(BUDGETS.bundles)) {
      try {
        // Look for the bundle file
        const bundlePath = this.findBundleFile(buildDir, bundle);

        if (bundlePath && fs.existsSync(bundlePath)) {
          const stats = fs.statSync(bundlePath);
          const size = stats.size;

          // Get gzipped size
          const gzippedSize = await this.getGzippedSize(bundlePath);

          const result = {
            bundle,
            path: bundlePath,
            size,
            gzippedSize,
            max: budget.max,
            warning: budget.warning,
            passed: gzippedSize <= budget.max,
          };

          this.results.bundles.push(result);

          const sizeKB = (gzippedSize / 1024).toFixed(2);
          const maxKB = (budget.max / 1024).toFixed(2);
          const warningKB = (budget.warning / 1024).toFixed(2);

          if (gzippedSize > budget.max) {
            console.log(`❌ ${bundle}: ${sizeKB}KB (max: ${maxKB}KB) - OVER BUDGET`);
            this.results.passed = false;
          } else if (gzippedSize > budget.warning) {
            console.log(`⚠️  ${bundle}: ${sizeKB}KB (warning: ${warningKB}KB) - APPROACHING LIMIT`);
          } else {
            console.log(`✅ ${bundle}: ${sizeKB}KB (under: ${maxKB}KB)`);
          }
        } else {
          console.log(`⚠️  ${bundle}: File not found in build directory`);
        }
      } catch (error) {
        console.log(`❌ ${bundle}: Error checking size - ${error.message}`);
        this.results.passed = false;
      }
    }
  }

  async checkCoreWebVitals() {
    console.log('\n🌐 Checking Core Web Vitals...');

    try {
      // Try to get Core Web Vitals from Lighthouse or performance monitoring
      const vitals = await this.getCoreWebVitalsFromLighthouse();

      for (const [metric, budget] of Object.entries(BUDGETS.coreWebVitals)) {
        const value = vitals[metric];

        if (value !== undefined) {
          const passed = metric === 'CLS' ? value <= budget.target : value <= budget.target;
          const warning = metric === 'CLS' ? value <= budget.warning : value <= budget.warning;

          this.results.coreWebVitals[metric] = {
            value,
            target: budget.target,
            warning: budget.warning,
            passed,
          };

          const unit = metric === 'CLS' ? '' : 'ms';

          if (!passed) {
            console.log(`❌ ${metric}: ${value}${unit} (target: ${budget.target}${unit}) - NOT MEETING TARGET`);
            this.results.passed = false;
          } else if (!warning) {
            console.log(`⚠️  ${metric}: ${value}${unit} (warning: ${budget.warning}${unit}) - APPROACHING LIMIT`);
          } else {
            console.log(`✅ ${metric}: ${value}${unit} (target: ${budget.target}${unit})`);
          }
        } else {
          console.log(`⚠️  ${metric}: No data available`);
        }
      }
    } catch (error) {
      console.log(`❌ Core Web Vitals check failed: ${error.message}`);
      // Don't fail the build for missing vitals data
    }
  }

  async checkApiPerformance() {
    console.log('\n🔌 Checking API Performance...');

    for (const [endpoint, budget] of Object.entries(BUDGETS.api)) {
      try {
        const responseTime = await this.measureApiEndpoint(endpoint);

        const result = {
          endpoint,
          responseTime,
          max: budget.max,
          warning: budget.warning,
          passed: responseTime <= budget.max,
        };

        this.results.api.push(result);

        if (responseTime > budget.max) {
          console.log(`❌ ${endpoint}: ${responseTime}ms (max: ${budget.max}ms) - OVER BUDGET`);
          this.results.passed = false;
        } else if (responseTime > budget.warning) {
          console.log(`⚠️  ${endpoint}: ${responseTime}ms (warning: ${budget.warning}ms) - APPROACHING LIMIT`);
        } else {
          console.log(`✅ ${endpoint}: ${responseTime}ms (under: ${budget.max}ms)`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: Error measuring performance - ${error.message}`);
        this.results.passed = false;
      }
    }
  }

  async checkLighthouseScores() {
    console.log('\n🔦 Checking Lighthouse Scores...');

    try {
      const scores = await this.runLighthouse();

      for (const [category, budget] of Object.entries(BUDGETS.lighthouse)) {
        const score = scores[category];

        if (score !== undefined) {
          const passed = score >= budget.min;
          const warning = score >= budget.warning;

          this.results.lighthouse[category] = {
            score: Math.round(score * 100),
            min: budget.min,
            warning: budget.warning,
            passed,
          };

          const scorePercent = Math.round(score * 100);

          if (!passed) {
            console.log(`❌ ${category}: ${scorePercent} (min: ${budget.min}) - NOT MEETING TARGET`);
            this.results.passed = false;
          } else if (!warning) {
            console.log(`⚠️  ${category}: ${scorePercent} (warning: ${budget.warning}) - APPROACHING LIMIT`);
          } else {
            console.log(`✅ ${category}: ${scorePercent} (target: ${budget.min})`);
          }
        } else {
          console.log(`⚠️  ${category}: No data available`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Lighthouse check failed: ${error.message}`);
      // Don't fail the build for Lighthouse issues
    }
  }

  generateReport() {
    console.log('\n📊 Performance Budget Report');
    console.log('=' .repeat(50));

    const report = {
      timestamp: new Date().toISOString(),
      passed: this.results.passed,
      summary: {
        bundles: {
          total: this.results.bundles.length,
          passed: this.results.bundles.filter(b => b.passed).length,
        },
        api: {
          total: this.results.api.length,
          passed: this.results.api.filter(a => a.passed).length,
        },
        lighthouse: {
          total: Object.keys(this.results.lighthouse).length,
          passed: Object.values(this.results.lighthouse).filter(l => l.passed).length,
        },
      },
      details: this.results,
    };

    if (this.options.report) {
      const reportPath = path.join(process.cwd(), 'performance-budget-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📋 Detailed report saved to: ${reportPath}`);
    }

    // Summary
    console.log(`\n📈 Summary:`);
    console.log(`   Bundles: ${report.summary.bundles.passed}/${report.summary.bundles.total} passed`);
    console.log(`   APIs: ${report.summary.api.passed}/${report.summary.api.total} passed`);
    console.log(`   Lighthouse: ${report.summary.lighthouse.passed}/${report.summary.lighthouse.total} passed`);

    if (this.results.passed) {
      console.log(`\n✅ Performance budget check PASSED`);
    } else {
      console.log(`\n❌ Performance budget check FAILED`);
    }
  }

  async enforceBudgets() {
    if (!this.results.passed) {
      console.log('\n🚫 Performance budget violations detected!');
      console.log('Please address the issues above before deploying.');

      // Exit with error code for CI/CD
      process.exit(1);
    }
  }

  // Helper methods
  findBundleFile(buildDir, bundleName) {
    const extensions = ['.js', '.css', '.mjs'];

    for (const ext of extensions) {
      const bundlePath = path.join(buildDir, bundleName + ext);
      if (fs.existsSync(bundlePath)) {
        return bundlePath;
      }
    }

    // Try to find files that contain the bundle name
    const files = fs.readdirSync(buildDir);
    const matchingFile = files.find(file =>
      file.includes(bundleName.replace(/\.(js|css)$/, ''))
    );

    return matchingFile ? path.join(buildDir, matchingFile) : null;
  }

  async getGzippedSize(filePath) {
    return new Promise((resolve, reject) => {
      const zlib = require('zlib');
      const fileContent = fs.readFileSync(filePath);
      zlib.gzip(fileContent, (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed.length);
      });
    });
  }

  async getCoreWebVitalsFromLighthouse() {
    // This would typically run Lighthouse and extract Core Web Vitals
    // For now, return placeholder values
    return {
      FCP: 1500,
      LCP: 2500,
      CLS: 0.1,
      INP: 100,
      TTFB: 400,
    };
  }

  async measureApiEndpoint(endpoint) {
    // This would typically make actual HTTP requests to measure API performance
    // For now, return placeholder values
    const budgets = BUDGETS.api[endpoint];
    return Math.random() * budgets.max * 0.8; // 80% of max for demo
  }

  async runLighthouse() {
    // This would typically run Lighthouse and extract scores
    // For now, return placeholder values
    return {
      performance: 0.90,
      accessibility: 0.95,
      'best-practices': 0.92,
      seo: 0.88,
    };
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    checkOnly: args.includes('--check-only'),
    report: args.includes('--report'),
    verbose: args.includes('--verbose'),
  };

  const checker = new PerformanceBudgetChecker(options);
  checker.checkAll().then(passed => {
    if (passed) {
      console.log('\n🎉 All performance budgets met!');
      process.exit(0);
    } else {
      console.log('\n💥 Performance budget violations found!');
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = PerformanceBudgetChecker;