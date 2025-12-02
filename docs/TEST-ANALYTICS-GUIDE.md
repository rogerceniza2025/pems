# Test Analytics System Guide

## Overview

The Test Analytics System provides comprehensive process automation for test analytics, quality gates, and optimization. It extends the existing sophisticated testing infrastructure with advanced analytics, historical trend analysis, and performance regression detection.

## Features

### 🔍 Advanced Test Analytics Dashboard
- Real-time metrics aggregation across all test types
- Historical trend analysis with predictions
- Unified view of coverage, performance, and quality metrics
- Interactive visualizations and insights

### 📈 Historical Trend Analysis
- Coverage growth tracking over time
- Performance trend monitoring
- Quality metrics evolution
- Predictive analytics for future trends

### 🚦 Performance Regression Gates
- Automated baseline management
- Bundle size regression detection
- API performance monitoring
- Core Web Vitals tracking
- Lighthouse score validation

## Architecture

```
scripts/analytics/
├── collectors/
│   ├── CoverageCollector.ts      # Enhanced coverage data collection
│   └── PerformanceCollector.ts   # Performance metrics aggregation
├── storage/
│   └── DatabaseStorage.ts        # Historical data persistence
├── utils/
│   └── MetricsCalculator.ts      # Trend analysis and calculations
├── dashboard/                    # Web dashboard (future)
└── api/                         # REST API (future)
```

## Quick Start

### 1. Manual Data Collection

```bash
# Collect coverage analytics
node scripts/coverage-validation.js

# Run performance regression gate
node scripts/performance-regression-gate.js --report

# Generate performance report
node scripts/performance-budget.js --report
```

### 2. CI/CD Integration

The system automatically collects analytics data through the `.github/workflows/test-analytics.yml` workflow.

### 3. Enhanced Scripts

The existing scripts have been enhanced with analytics integration:

- `scripts/coverage-validation.js` - Now collects detailed analytics
- `scripts/performance-budget.js` - Integrates with regression detection
- `scripts/performance-regression-gate.js` - New comprehensive regression detection

## Configuration

### Analytics Configuration

The system uses a comprehensive configuration structure:

```javascript
const analyticsConfig = {
  thresholds: {
    coverage: {
      global: { lines: 80, functions: 80, branches: 75, statements: 80 },
      domain: { lines: 90, functions: 90, branches: 85, statements: 90 },
      newCode: { lines: 85, functions: 85, branches: 80, statements: 85 }
    },
    performance: {
      bundleSizeGrowth: 10,      // 10% growth threshold
      apiResponseTimeIncrease: 20, // 20% slowdown threshold
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
    channels: ['email', 'slack', 'github'],
    thresholds: {
      critical: 5,
      warning: 2
    }
  }
};
```

### Performance Regression Gate Configuration

```bash
# Run with custom thresholds
node scripts/performance-regression-gate.js \
  --enforce \
  --bundle-threshold=15 \
  --api-threshold=25 \
  --report-path=./custom-report.json
```

## Usage Examples

### 1. Collecting Coverage Analytics

```bash
# Standard coverage validation with analytics
node scripts/coverage-validation.js

# Output includes analytics collection
✅ Coverage validation passed!
ℹ️  Collecting coverage analytics data...
✅ Coverage analytics data collected successfully
```

### 2. Performance Regression Detection

```bash
# Run performance regression gate
node scripts/performance-regression-gate.js --enforce --report

# Example output:
🚀 Starting Performance Regression Gate
==================================================
📊 Performance Regression Analysis
==================================================
🚨 2 Regression(s) Detected:

1. BUNDLE_SIZE - HIGH
   Metric: main.js
   Description: Bundle main.js has grown by 12.5% from baseline
   Baseline: 450000
   Current: 506250
   Change: 12.5%
   Recommendations:
     • Analyze bundle composition for unnecessary dependencies
     • Implement code splitting for non-critical components
```

### 3. Generate Comprehensive Report

```bash
# Generate detailed performance budget report
node scripts/performance-budget.js --report

# Creates performance-budget-report.json with:
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "passed": false,
  "summary": {
    "bundles": { "total": 4, "passed": 3 },
    "api": { "total": 5, "passed": 5 },
    "lighthouse": { "total": 4, "passed": 4 }
  },
  "details": {
    "bundles": [...],
    "coreWebVitals": {...},
    "api": [...],
    "lighthouse": {...}
  }
}
```

## Data Storage

### SQLite Database (Primary)

The system uses SQLite for structured data storage:

```sql
-- Main metrics table
CREATE TABLE analytics_metrics (
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
);

-- Coverage history
CREATE TABLE coverage_history (
  id TEXT PRIMARY KEY,
  metrics_id TEXT,
  module_name TEXT,
  metric_type TEXT,
  lines_covered INTEGER,
  lines_total INTEGER,
  lines_pct REAL,
  ...
);
```

### JSON Storage (Fallback)

If SQLite is not available, the system falls back to JSON storage:

```bash
# Location: .analytics/test-metrics.json
{
  "metrics": [
    {
      "id": "coverage-1642234567890-abc123",
      "timestamp": "2025-01-15T10:30:00.000Z",
      "coverage": {...},
      "performance": {...},
      "quality": {...}
    }
  ]
}
```

## CI/CD Integration

### Workflow Triggers

The `test-analytics.yml` workflow runs on:

- **Push** to main, develop, and feature branches
- **Pull Requests** to main and develop
- **Schedule** - Daily at 2 AM UTC
- **Manual** - Via workflow_dispatch

### Jobs

1. **collect-coverage-analytics**: Collects coverage data with trend analysis
2. **collect-performance-analytics**: Gathers performance metrics and detects regressions
3. **run-analytics-dashboard**: Generates dashboard data (scheduled runs)
4. **generate-quality-report**: Creates comprehensive quality reports
5. **notify-on-issues**: Sends notifications for failures

### Example Workflow Output

```yaml
# PR Comments with quality report
## 📊 Quality Report

**Overall Score:** `78/100` (GOOD)

### Coverage
- Lines: `82%`
- Functions: `85%`
- Branches: `75%`
- Statements: `83%`

### Performance
- Bundles: `3/4` passed
- APIs: `5/5` passed
- Lighthouse: `4/4` passed

### Regressions
🚨 1 regression(s) detected
- bundle_size: Bundle main.js has grown by 12.5% from baseline
```

## API Reference

### CoverageCollector

```typescript
class CoverageCollector {
  constructor(storage: DatabaseStorage, config: AnalyticsConfig)

  // Main collection method
  async collectCoverageData(gitInfo?: GitInfo): Promise<CoverageMetrics | null>

  // Git information
  async getGitInfo(): Promise<GitInfo | null>
}
```

### PerformanceCollector

```typescript
class PerformanceCollector {
  constructor(storage: DatabaseStorage, config: AnalyticsConfig)

  // Main collection method
  async collectPerformanceData(gitInfo?: GitInfo): Promise<PerformanceMetrics | null>
}
```

### DatabaseStorage

```typescript
class DatabaseStorage {
  constructor(config: AnalyticsConfig, dbPath?: string)

  // Store metrics
  async storeMetrics(metrics: TestMetrics): Promise<boolean>

  // Retrieve metrics
  async getMetrics(limit?: number, offset?: number): Promise<MetricsResponse>

  // Historical data
  async getMetricsByDateRange(startDate: string, endDate: string): Promise<TestMetrics[]>

  // Data management
  async exportData(exportPath: string): Promise<boolean>
  async importData(importPath: string): Promise<boolean>
  async cleanupOldData(): Promise<void>
}
```

### MetricsCalculator

```typescript
class MetricsCalculator {
  constructor(config: AnalyticsConfig)

  // Trend analysis
  calculateCoverageTrends(historicalMetrics: TestMetrics[]): TrendAnalysis[]
  calculatePerformanceTrends(historicalMetrics: TestMetrics[]): TrendAnalysis[]
  calculateQualityTrends(historicalMetrics: TestMetrics[]): TrendAnalysis[]

  // Regression detection
  detectPerformanceRegressions(currentMetrics: TestMetrics, historicalMetrics: TestMetrics[]): RegressionReport[]
  detectCoverageRegressions(currentMetrics: TestMetrics, historicalMetrics: TestMetrics[]): RegressionReport[]

  // Insights
  generateInsights(historicalMetrics: TestMetrics[]): InsightReport[]

  // Quality scoring
  calculateQualityScore(metrics: TestMetrics): number
  calculateMetricsSummary(metrics: TestMetrics): MetricsSummary
}
```

## Performance Regression Gate

### CLI Options

```bash
node scripts/performance-regression-gate.js [options]

Options:
  --enforce                          Fail build on regressions
  --report                          Generate detailed report
  --report-path=<path>             Custom report location
  --baseline-path=<path>           Custom baseline location
  --bundle-threshold=<percent>     Bundle size growth threshold (default: 10)
  --api-threshold=<percent>        API slowdown threshold (default: 20)
```

### Exit Codes

- `0`: Success (no regressions or only warnings)
- `1`: Failure (critical regressions detected when --enforce used)

## Troubleshooting

### Common Issues

1. **Analytics components not available**
   ```
   ⚠️ Analytics components not available, running in legacy mode
   ```
   - Solution: Install required dependencies or run `pnpm install`

2. **SQLite not available**
   ```
   Warning: SQLite not available, using JSON-based storage
   ```
   - Solution: Install SQLite3: `npm install sqlite3`

3. **Build directory not found**
   ```
   ⚠️ Build directory not found, skipping bundle size check
   ```
   - Solution: Run `pnpm build` before performance analysis

4. **Git information not available**
   ```
   Warning: Could not get git information
   ```
   - Solution: Ensure you're in a git repository with commits

### Debug Mode

Enable verbose logging:

```bash
DEBUG=test-analytics node scripts/coverage-validation.js
```

### Log Files

Analytics logs are stored in:
- `.analytics/logs/` - Detailed logs
- `logs/analytics.log` - General analytics log

## Best Practices

### 1. Regular Collection

- Run analytics collection on every commit to main/develop
- Schedule daily comprehensive analysis
- Use manual collection for specific investigations

### 2. Baseline Management

- Establish performance baselines during stable periods
- Update baselines after major optimizations
- Keep baseline history for trend analysis

### 3. Threshold Configuration

- Set realistic thresholds based on project requirements
- Adjust thresholds as project matures
- Use different thresholds for different environments

### 4. Monitoring and Alerts

- Configure appropriate alert channels
- Set meaningful alert thresholds
- Regularly review and adjust alert configurations

### 5. Data Retention

- Configure appropriate retention periods
- Regularly cleanup old data
- Export important data for long-term storage

## Integration with Existing Tools

### Vitest Integration

The system integrates with Vitest through custom reporters:

```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov'],
      // Enhanced coverage collection
      provider: 'v8'
    }
  }
});
```

### Playwright Integration

E2E test results are automatically collected and integrated:

```javascript
// Test results are collected from Playwright reports
// and added to quality metrics
```

### Codecov Integration

Coverage data is automatically sent to Codecov:

```yaml
# Automatically integrated in CI/CD workflow
- name: Upload coverage reports
  uses: codecov/codecov-action@v3
```

## Future Enhancements

### Planned Features

1. **Web Dashboard** - Interactive analytics dashboard
2. **REST API** - Programmatic access to analytics data
3. **Machine Learning** - Advanced predictive analytics
4. **Team Metrics** - Per-team performance tracking
5. **Integration Marketplace** - Third-party tool integrations

### Dashboard Preview

The upcoming web dashboard will include:

- Real-time metrics monitoring
- Interactive trend charts
- Customizable dashboards
- Team performance analytics
- Alert management
- Export capabilities

## Support

### Documentation

- This guide: `docs/TEST-ANALYTICS-GUIDE.md`
- API documentation: Inline TypeScript comments
- Examples: `examples/analytics/`

### Getting Help

1. Check this guide for common issues
2. Review GitHub issues for known problems
3. Create new issues with detailed information
4. Join discussions for feature requests

### Contributing

1. Fork the repository
2. Create feature branches
3. Add tests for new functionality
4. Update documentation
5. Submit pull requests

---

**Note**: This Test Analytics System is designed to enhance, not replace, your existing testing infrastructure. It seamlessly integrates with current tools while providing powerful new analytics capabilities.