#!/usr/bin/env node

/* eslint-disable no-console */
import fs from 'fs'
import { execSync } from 'child_process'

// Import analytics components (if available)
let analyticsCollector = null
try {
  const { CoverageCollector } =
    await import('./analytics/collectors/CoverageCollector.js')
  const { DatabaseStorage } =
    await import('./analytics/storage/DatabaseStorage.js')
  analyticsCollector = { CoverageCollector, DatabaseStorage }
} catch {
  // Analytics components not available, proceed without them
  console.warn('⚠️  Analytics components not available, running in legacy mode')
}

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logError(message) {
  colorLog('red', `❌ ${message}`)
}

function logSuccess(message) {
  colorLog('green', `✅ ${message}`)
}

function logInfo(message) {
  colorLog('blue', `ℹ️  ${message}`)
}

class CoverageValidator {
  constructor() {
    this.thresholds = {
      global: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      domain: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
      newCode: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    }
  }

  async getCoverageReport() {
    try {
      // Run coverage and get JSON report
      execSync('pnpm test:coverage -- --reporter=json --reporter=html', {
        encoding: 'utf8',
        stdio: 'pipe',
      })

      // Look for coverage file
      const coverageFile = 'coverage/coverage-summary.json'
      if (fs.existsSync(coverageFile)) {
        const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'))
        return coverageData
      }

      // Alternative: parse from stdout
      const lines = execSync('pnpm test:coverage -- --reporter=json', {
        encoding: 'utf8',
      }).split('\n')
      const coverageLine = lines.find((line) =>
        line.includes('coverage-summary.json'),
      )
      if (coverageLine && fs.existsSync('coverage/coverage-summary.json')) {
        return JSON.parse(
          fs.readFileSync('coverage/coverage-summary.json', 'utf8'),
        )
      }

      throw new Error('Could not find coverage report')
    } catch (error) {
      logError(`Failed to generate coverage report: ${error.message}`)
      return null
    }
  }

  validateThresholds(coverage, category, thresholds) {
    const violations = []

    for (const [metric, threshold] of Object.entries(thresholds)) {
      const actual = coverage[metric]?.pct || 0

      if (actual < threshold) {
        violations.push({
          metric,
          actual,
          threshold,
          category,
        })
      }
    }

    return violations
  }

  async validateCoverage() {
    logInfo('Running coverage validation...')

    const coverage = await this.getCoverageReport()
    if (!coverage) {
      logError('Could not retrieve coverage report')
      return false
    }

    console.log('\n📊 COVERAGE REPORT')
    console.log('='.repeat(50))

    const allViolations = []

    // Validate global coverage
    if (coverage.total) {
      const globalViolations = this.validateThresholds(
        coverage.total,
        'Global',
        this.thresholds.global,
      )

      if (globalViolations.length > 0) {
        allViolations.push(...globalViolations)
      }

      console.log(`\nGlobal Coverage:`)
      console.log(`  Lines: ${coverage.total.lines?.pct || 0}%`)
      console.log(`  Functions: ${coverage.total.functions?.pct || 0}%`)
      console.log(`  Branches: ${coverage.total.branches?.pct || 0}%`)
      console.log(`  Statements: ${coverage.total.statements?.pct || 0}%`)
    }

    // Validate domain layer coverage
    if (coverage['modules/*/domain/']) {
      const domainViolations = this.validateThresholds(
        coverage['modules/*/domain/'],
        'Domain Layer',
        this.thresholds.domain,
      )

      if (domainViolations.length > 0) {
        allViolations.push(...domainViolations)
      }
    }

    // Report violations
    if (allViolations.length > 0) {
      console.log('\n🚨 COVERAGE VIOLATIONS:')
      allViolations.forEach((violation) => {
        console.log(`\n${violation.category} - ${violation.metric}:`)
        console.log(`  Required: ${violation.threshold}%`)
        console.log(`  Actual: ${violation.actual}%`)
        console.log(`  Gap: ${violation.threshold - violation.actual}%`)
      })

      console.log('\n📝 IMPROVEMENT SUGGESTIONS:')
      console.log('1. Add unit tests for uncovered functions')
      console.log('2. Add integration tests for complex workflows')
      console.log('3. Test edge cases and error conditions')
      console.log('4. Use "pnpm test:coverage -- --watch" to monitor coverage')

      return false
    }

    logSuccess('All coverage thresholds met!')
    return true
  }

  async run() {
    const success = await this.validateCoverage()

    // Collect analytics data if available
    if (success && analyticsCollector) {
      await this.collectAnalyticsData()
    }

    if (!success) {
      logError(
        'Coverage validation failed. Please improve test coverage before committing.',
      )
      process.exit(1)
    }

    logSuccess('Coverage validation passed!')
  }

  async collectAnalyticsData() {
    try {
      if (!analyticsCollector) return

      logInfo('Collecting coverage analytics data...')

      // Initialize analytics components
      const analyticsConfig = this.getAnalyticsConfig()
      const storage = new analyticsCollector.DatabaseStorage(analyticsConfig)
      const collector = new analyticsCollector.CoverageCollector(
        storage,
        analyticsConfig,
      )

      // Get git information
      const gitInfo = await this.getGitInfo()

      // Collect enhanced coverage data
      const coverageData = await collector.collectCoverageData(gitInfo)

      if (coverageData) {
        logSuccess('Coverage analytics data collected successfully')
      }
    } catch (error) {
      logError(`Failed to collect analytics data: ${error.message}`)
      // Don't fail the validation for analytics errors
    }
  }

  getAnalyticsConfig() {
    return {
      thresholds: this.thresholds,
      retention: {
        detailedDataMonths: 13,
        aggregatedDataMonths: 36,
        compressionEnabled: true,
      },
      alerts: {
        enabled: true,
        channels: ['email', 'slack'],
        thresholds: {
          critical: 5,
          warning: 2,
        },
      },
    }
  }

  async getGitInfo() {
    try {
      const commitHash = execSync('git rev-parse HEAD', {
        encoding: 'utf8',
      }).trim()
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf8',
      }).trim()
      const author = execSync('git config user.name', {
        encoding: 'utf8',
      }).trim()

      return { commitHash, branch, author }
    } catch {
      return null
    }
  }
}

// Run the validator
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new CoverageValidator()
  validator.run()
}

export default CoverageValidator
