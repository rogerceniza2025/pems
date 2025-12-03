/**
 * Metrics Calculator for Test Analytics
 *
 * This utility provides calculations for trend analysis, regression detection,
 * performance analysis, and quality metrics processing.
 */

import {
  TestMetrics,
  CoverageMetrics,
  PerformanceMetrics,
  QualityMetrics,
  TrendMetrics,
  TrendAnalysis,
  RegressionReport,
  InsightReport,
  PredictiveReport,
  AnalyticsConfig
} from '../storage/AnalyticsSchema';

export class MetricsCalculator {
  private config: AnalyticsConfig;

  constructor(config: AnalyticsConfig) {
    this.config = config;
  }

  /**
   * Calculate coverage trends from historical metrics
   */
  calculateCoverageTrends(historicalMetrics: TestMetrics[]): TrendAnalysis[] {
    if (historicalMetrics.length < 2) {
      return [];
    }

    const trends: TrendAnalysis[] = [];
    const coverageTypes = [
      { name: 'Lines', key: 'lines', weight: 1.0 },
      { name: 'Functions', key: 'functions', weight: 0.9 },
      { name: 'Branches', key: 'branches', weight: 0.8 },
      { name: 'Statements', key: 'statements', weight: 0.7 }
    ];

    coverageTypes.forEach(({ name, key, weight }) => {
      const latest = historicalMetrics[historicalMetrics.length - 1].coverage.total[key as keyof CoverageMetrics['total']];
      const previous = historicalMetrics[historicalMetrics.length - 2].coverage.total[key as keyof CoverageMetrics['total']];

      if (latest && previous) {
        const currentValue = latest.pct;
        const previousValue = previous.pct;
        const change = currentValue - previousValue;
        const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

        const trend = this.determineTrend(changePercent);
        const significance = this.determineSignificance(Math.abs(changePercent), weight);

        trends.push({
          metric: `Coverage ${name}`,
          currentValue,
          previousValue,
          change,
          changePercent,
          trend,
          significance,
          prediction: this.predictNextValue(historicalMetrics.map(m => m.coverage.total[key as keyof CoverageMetrics['total']]?.pct || 0))
        });
      }
    });

    return trends;
  }

  /**
   * Calculate performance trends from historical metrics
   */
  calculatePerformanceTrends(historicalMetrics: TestMetrics[]): TrendAnalysis[] {
    if (historicalMetrics.length < 2) {
      return [];
    }

    const trends: TrendAnalysis[] = [];

    // Bundle size trends
    const bundleSizes = historicalMetrics.map(m => {
      const bundles = m.performance.bundles || [];
      return bundles.reduce((total, bundle) => total + bundle.gzippedSize, 0);
    });

    if (bundleSizes.length >= 2) {
      const current = bundleSizes[bundleSizes.length - 1];
      const previous = bundleSizes[bundleSizes.length - 2];
      const change = current - previous;
      const changePercent = previous > 0 ? (change / previous) * 100 : 0;

      trends.push({
        metric: 'Total Bundle Size',
        currentValue: current,
        previousValue: previous,
        change,
        changePercent,
        trend: changePercent > 0 ? 'declining' : 'improving', // For bundle size, less is better
        significance: this.determineSignificance(Math.abs(changePercent), 0.8),
        prediction: this.predictNextValue(bundleSizes)
      });
    }

    // API response time trends
    const apiMetrics = historicalMetrics.flatMap(m => m.performance.api || []);
    const avgResponseTimes = historicalMetrics.map(m => {
      const apiTimes = m.performance.api || [];
      return apiTimes.length > 0 ? apiTimes.reduce((sum, api) => sum + api.responseTime, 0) / apiTimes.length : 0;
    });

    if (avgResponseTimes.length >= 2 && avgResponseTimes[avgResponseTimes.length - 1] > 0) {
      const current = avgResponseTimes[avgResponseTimes.length - 1];
      const previous = avgResponseTimes[avgResponseTimes.length - 2];
      const change = current - previous;
      const changePercent = previous > 0 ? (change / previous) * 100 : 0;

      trends.push({
        metric: 'Average API Response Time',
        currentValue: current,
        previousValue: previous,
        change,
        changePercent,
        trend: changePercent > 0 ? 'declining' : 'improving',
        significance: this.determineSignificance(Math.abs(changePercent), 0.9),
        prediction: this.predictNextValue(avgResponseTimes)
      });
    }

    return trends;
  }

  /**
   * Calculate quality trends from historical metrics
   */
  calculateQualityTrends(historicalMetrics: TestMetrics[]): TrendAnalysis[] {
    if (historicalMetrics.length < 2) {
      return [];
    }

    const trends: TrendAnalysis[] = [];

    // Test success rate trends
    const testSuccessRates = historicalMetrics.map(m => {
      const tests = m.quality.tests;
      if (!tests) return 0;

      const totalTests = Object.values(tests).reduce((sum, testType) => sum + testType.total, 0);
      const passedTests = Object.values(tests).reduce((sum, testType) => sum + testType.passed, 0);
      return totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    });

    if (testSuccessRates.length >= 2) {
      const current = testSuccessRates[testSuccessRates.length - 1];
      const previous = testSuccessRates[testSuccessRates.length - 2];
      const change = current - previous;

      trends.push({
        metric: 'Test Success Rate',
        currentValue: current,
        previousValue: previous,
        change,
        changePercent: previous > 0 ? (change / previous) * 100 : 0,
        trend: this.determineTrend(change),
        significance: this.determineSignificance(Math.abs(change), 1.0),
        prediction: this.predictNextValue(testSuccessRates)
      });
    }

    // TDD compliance trends
    const tddComplianceRates = historicalMetrics.map(m => {
      const tdd = m.quality.tddCompliance;
      return tdd ? (tdd.passed ? 100 : 0) : 0;
    });

    if (tddComplianceRates.length >= 2) {
      const current = tddComplianceRates[tddComplianceRates.length - 1];
      const previous = tddComplianceRates[tddComplianceRates.length - 2];
      const change = current - previous;

      trends.push({
        metric: 'TDD Compliance Rate',
        currentValue: current,
        previousValue: previous,
        change,
        changePercent: previous > 0 ? (change / previous) * 100 : 0,
        trend: this.determineTrend(change),
        significance: this.determineSignificance(Math.abs(change), 0.7),
        prediction: this.predictNextValue(tddComplianceRates)
      });
    }

    return trends;
  }

  /**
   * Detect performance regressions
   */
  detectPerformanceRegressions(currentMetrics: TestMetrics, historicalMetrics: TestMetrics[]): RegressionReport[] {
    const regressions: RegressionReport[] = [];

    if (historicalMetrics.length < 3) {
      return regressions; // Need at least 3 data points for regression detection
    }

    // Bundle size regressions
    if (currentMetrics.performance.bundles) {
      const historicalBundles = historicalMetrics
        .slice(-10) // Last 10 measurements
        .flatMap(m => m.performance.bundles || [])
        .filter(b => b.name === 'main.js');

      if (historicalBundles.length >= 3) {
        const baselineSize = this.calculateBaseline(historicalBundles.map(b => b.gzippedSize));
        const currentSize = currentMetrics.performance.bundles.find(b => b.name === 'main.js')?.gzippedSize || 0;

        if (currentSize > baselineSize * 1.1) { // 10% growth threshold
          regressions.push({
            type: 'performance',
            severity: currentSize > baselineSize * 1.2 ? 'high' : 'medium',
            description: `Bundle size has grown ${((currentSize / baselineSize - 1) * 100).toFixed(1)}% from baseline`,
            affectedMetrics: ['bundle_size'],
            baselineValue: baselineSize,
            currentValue: currentSize,
            deviation: ((currentSize / baselineSize - 1) * 100),
            confidence: this.calculateConfidence(historicalBundles.length, 10),
            recommendations: [
              'Analyze bundle size impact and consider code splitting',
              'Review new dependencies and unused imports',
              'Consider lazy loading for non-critical components'
            ],
            detectedAt: new Date().toISOString()
          });
        }
      }
    }

    // API performance regressions
    if (currentMetrics.performance.api) {
      currentMetrics.performance.api.forEach(apiMetric => {
        const historicalApiMetrics = historicalMetrics
          .slice(-10)
          .flatMap(m => m.performance.api || [])
          .filter(api => api.endpoint === apiMetric.endpoint);

        if (historicalApiMetrics.length >= 3) {
          const baselineTime = this.calculateBaseline(historicalApiMetrics.map(api => api.responseTime));

          if (apiMetric.responseTime > baselineTime * 1.2) { // 20% slowdown threshold
            regressions.push({
              type: 'performance',
              severity: apiMetric.responseTime > baselineTime * 1.5 ? 'high' : 'medium',
              description: `API endpoint ${apiMetric.endpoint} has slowed down by ${((apiMetric.responseTime / baselineTime - 1) * 100).toFixed(1)}%`,
              affectedMetrics: [`api_response_time_${apiMetric.endpoint}`],
              baselineValue: baselineTime,
              currentValue: apiMetric.responseTime,
              deviation: ((apiMetric.responseTime / baselineTime - 1) * 100),
              confidence: this.calculateConfidence(historicalApiMetrics.length, 10),
              recommendations: [
                'Profile the API endpoint for performance bottlenecks',
                'Check database query performance',
                'Review recent changes to the endpoint implementation'
              ],
              detectedAt: new Date().toISOString()
            });
          }
        }
      });
    }

    return regressions;
  }

  /**
   * Detect coverage regressions
   */
  detectCoverageRegressions(currentMetrics: TestMetrics, historicalMetrics: TestMetrics[]): RegressionReport[] {
    const regressions: RegressionReport[] = [];

    if (historicalMetrics.length < 3) {
      return regressions;
    }

    const coverageTypes = [
      { name: 'Lines', key: 'lines', threshold: 5 }, // 5% drop threshold
      { name: 'Functions', key: 'functions', threshold: 3 },
      { name: 'Branches', key: 'branches', threshold: 5 },
      { name: 'Statements', key: 'statements', threshold: 3 }
    ];

    coverageTypes.forEach(({ name, key, threshold }) => {
      const historicalValues = historicalMetrics
        .slice(-10)
        .map(m => m.coverage.total[key as keyof CoverageMetrics['total']]?.pct || 0);

      if (historicalValues.length >= 3) {
        const baseline = this.calculateBaseline(historicalValues);
        const current = currentMetrics.coverage.total[key as keyof CoverageMetrics['total']]?.pct || 0;

        if (current < baseline - threshold) {
          regressions.push({
            type: 'coverage',
            severity: current < baseline - (threshold * 2) ? 'high' : 'medium',
            description: `Coverage ${name.toLowerCase()} has dropped by ${((baseline - current)).toFixed(1)}% from baseline`,
            affectedMetrics: [`coverage_${key.toLowerCase()}`],
            baselineValue: baseline,
            currentValue: current,
            deviation: baseline - current,
            confidence: this.calculateConfidence(historicalValues.length, 10),
            recommendations: [
              `Add unit tests for uncovered ${name.toLowerCase()}`,
              'Review recent code changes for missing test coverage',
              'Consider running coverage analysis in CI/CD pipeline'
            ],
            detectedAt: new Date().toISOString()
          });
        }
      }
    });

    return regressions;
  }

  /**
   * Generate insights from metrics data
   */
  generateInsights(historicalMetrics: TestMetrics[]): InsightReport[] {
    const insights: InsightReport[] = [];

    if (historicalMetrics.length < 5) {
      return insights;
    }

    // Coverage growth insight
    const coverageGrowth = this.analyzeCoverageGrowth(historicalMetrics);
    if (coverageGrowth.significant) {
      insights.push({
        type: 'trend',
        title: 'Coverage Growth Trend',
        description: `Test coverage has been ${coverageGrowth.direction} at a rate of ${coverageGrowth.rate.toFixed(1)}% per week`,
        impact: coverageGrowth.impact,
        actionable: true,
        recommendations: coverageGrowth.recommendations,
        data: { growthRate: coverageGrowth.rate, trend: coverageGrowth.direction },
        generatedAt: new Date().toISOString()
      });
    }

    // Performance stability insight
    const performanceStability = this.analyzePerformanceStability(historicalMetrics);
    if (!performanceStability.stable) {
      insights.push({
        type: 'anomaly',
        title: 'Performance Instability Detected',
        description: `Performance metrics show ${performanceStability.variability}% variability, indicating potential instability`,
        impact: 'medium',
        actionable: true,
        recommendations: [
          'Investigate performance variability causes',
          'Consider adding performance regression tests',
          'Monitor resource utilization patterns'
        ],
        data: { variability: performanceStability.variability, affectedMetrics: performanceStability.affectedMetrics },
        generatedAt: new Date().toISOString()
      });
    }

    // Quality gate insight
    const qualityTrend = this.analyzeQualityTrend(historicalMetrics);
    if (qualityTrend.significant) {
      insights.push({
        type: qualityTrend.positive ? 'opportunity' : 'risk',
        title: `Quality ${qualityTrend.positive ? 'Improvement' : 'Degradation'} Trend`,
        description: qualityTrend.description,
        impact: qualityTrend.impact,
        actionable: true,
        recommendations: qualityTrend.recommendations,
        data: qualityTrend.data,
        generatedAt: new Date().toISOString()
      });
    }

    return insights;
  }

  /**
   * Calculate overall quality score
   */
  calculateQualityScore(metrics: TestMetrics): number {
    let score = 0;
    let weights = 0;

    // Coverage score (40% weight)
    const coverageScore = this.calculateCoverageScore(metrics.coverage);
    score += coverageScore * 0.4;
    weights += 0.4;

    // Performance score (30% weight)
    const performanceScore = this.calculatePerformanceScore(metrics.performance);
    score += performanceScore * 0.3;
    weights += 0.3;

    // Quality score (20% weight)
    const qualityScore = this.calculateInternalQualityScore(metrics.quality);
    score += qualityScore * 0.2;
    weights += 0.2;

    // Trends score (10% weight)
    const trendsScore = this.calculateTrendsScore(metrics.trends);
    score += trendsScore * 0.1;
    weights += 0.1;

    return weights > 0 ? score / weights : 0;
  }

  /**
   * Calculate comprehensive metrics summary
   */
  calculateMetricsSummary(metrics: TestMetrics): {
    overallScore: number;
    status: 'passing' | 'warning' | 'failing';
    criticalIssues: string[];
    recommendations: string[];
  } {
    const overallScore = this.calculateQualityScore(metrics);

    let status: 'passing' | 'warning' | 'failing' = 'passing';
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    // Determine status and collect issues
    if (overallScore >= 85) {
      status = 'passing';
    } else if (overallScore >= 70) {
      status = 'warning';
      recommendations.push('Focus on improving test coverage and performance metrics');
    } else {
      status = 'failing';
      criticalIssues.push('Overall quality score below minimum threshold');
    }

    // Check coverage thresholds
    const coverageThresholds = this.config.thresholds.coverage;
    const coverage = metrics.coverage.total;

    if (coverage.lines.pct < coverageThresholds.global.lines) {
      criticalIssues.push(`Lines coverage (${coverage.lines.pct}%) below threshold (${coverageThresholds.global.lines}%)`);
      recommendations.push('Add unit tests to improve lines coverage');
    }

    if (coverage.functions.pct < coverageThresholds.global.functions) {
      criticalIssues.push(`Functions coverage (${coverage.functions.pct}%) below threshold (${coverageThresholds.global.functions}%)`);
      recommendations.push('Add function-level tests');
    }

    // Check performance issues
    if (metrics.performance.bundles) {
      const largeBundles = metrics.performance.bundles.filter(b => !b.passed);
      if (largeBundles.length > 0) {
        criticalIssues.push(`${largeBundles.length} bundles exceed size limits`);
        recommendations.push('Optimize bundle sizes through code splitting and tree shaking');
      }
    }

    // Check quality issues
    if (metrics.quality.tddCompliance && !metrics.quality.tddCompliance.passed) {
      criticalIssues.push('TDD compliance violations detected');
      recommendations.push('Write tests before implementing code');
    }

    return {
      overallScore,
      status,
      criticalIssues,
      recommendations
    };
  }

  // Private helper methods

  private determineTrend(change: number): 'improving' | 'declining' | 'stable' {
    const threshold = 2; // 2% threshold for stability
    if (Math.abs(change) < threshold) return 'stable';
    return change > 0 ? 'improving' : 'declining';
  }

  private determineSignificance(changePercent: number, weight: number): 'high' | 'medium' | 'low' {
    const weightedChange = changePercent * weight;
    if (weightedChange > 10) return 'high';
    if (weightedChange > 5) return 'medium';
    return 'low';
  }

  private predictNextValue(values: number[]): { nextValue: number; confidence: number; timeframe: string } | undefined {
    if (values.length < 3) return undefined;

    // Simple linear regression for prediction
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const nextValue = slope * n + intercept;
    const confidence = Math.min(0.9, n / 20); // Confidence based on data points

    return {
      nextValue: Math.max(0, nextValue), // Ensure non-negative for percentages and sizes
      confidence,
      timeframe: '1 week'
    };
  }

  private calculateBaseline(values: number[]): number {
    // Use median to reduce impact of outliers
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private calculateConfidence(dataPoints: number, targetPoints: number): number {
    return Math.min(0.95, dataPoints / targetPoints);
  }

  private analyzeCoverageGrowth(historicalMetrics: TestMetrics[]): {
    significant: boolean;
    direction: 'increasing' | 'decreasing' | 'stable';
    rate: number;
    impact: 'high' | 'medium' | 'low';
    recommendations: string[];
  } {
    const coverageValues = historicalMetrics.map(m => m.coverage.total.lines.pct);
    if (coverageValues.length < 5) {
      return { significant: false, direction: 'stable', rate: 0, impact: 'low', recommendations: [] };
    }

    const firstHalf = coverageValues.slice(0, Math.floor(coverageValues.length / 2));
    const secondHalf = coverageValues.slice(Math.floor(coverageValues.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    const rate = change / (coverageValues.length / 2); // Rate per data point

    const significant = Math.abs(change) > 2; // 2% threshold
    const direction = change > 0.5 ? 'increasing' : change < -0.5 ? 'decreasing' : 'stable';
    const impact = Math.abs(change) > 5 ? 'high' : Math.abs(change) > 2 ? 'medium' : 'low';

    const recommendations = direction === 'increasing'
      ? ['Maintain current testing practices', 'Consider increasing coverage targets']
      : direction === 'decreasing'
      ? ['Investigate coverage loss causes', 'Implement coverage gates in CI/CD']
      : ['Focus on maintaining current coverage levels'];

    return { significant, direction, rate, impact, recommendations };
  }

  private analyzePerformanceStability(historicalMetrics: TestMetrics[]): {
    stable: boolean;
    variability: number;
    affectedMetrics: string[];
  } {
    const bundleSizes = historicalMetrics
      .slice(-10)
      .flatMap(m => m.performance.bundles || [])
      .filter(b => b.name === 'main.js')
      .map(b => b.gzippedSize);

    if (bundleSizes.length < 5) {
      return { stable: true, variability: 0, affectedMetrics: [] };
    }

    const mean = bundleSizes.reduce((a, b) => a + b, 0) / bundleSizes.length;
    const variance = bundleSizes.reduce((sum, size) => sum + Math.pow(size - mean, 2), 0) / bundleSizes.length;
    const stdDev = Math.sqrt(variance);
    const variability = (stdDev / mean) * 100;

    return {
      stable: variability < 5, // Less than 5% variability is considered stable
      variability,
      affectedMetrics: variability >= 5 ? ['bundle_size'] : []
    };
  }

  private analyzeQualityTrend(historicalMetrics: TestMetrics[]): {
    significant: boolean;
    positive: boolean;
    description: string;
    impact: 'high' | 'medium' | 'low';
    recommendations: string[];
    data: any;
  } {
    const qualityScores = historicalMetrics.map(m => this.calculateQualityScore(m));

    if (qualityScores.length < 5) {
      return {
        significant: false,
        positive: true,
        description: 'Insufficient data for quality trend analysis',
        impact: 'low',
        recommendations: ['Continue collecting metrics data'],
        data: {}
      };
    }

    const recentScores = qualityScores.slice(-3);
    const olderScores = qualityScores.slice(-8, -3);

    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.length > 0 ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length : recentAvg;

    const change = recentAvg - olderAvg;
    const significant = Math.abs(change) > 3; // 3 point threshold
    const positive = change > 0;

    return {
      significant,
      positive,
      description: `Quality score has ${positive ? 'improved' : 'declined'} by ${Math.abs(change).toFixed(1)} points`,
      impact: Math.abs(change) > 7 ? 'high' : Math.abs(change) > 3 ? 'medium' : 'low',
      recommendations: positive
        ? ['Maintain current quality practices', 'Set higher quality targets']
        : ['Investigate quality degradation causes', 'Implement quality gates'],
      data: { recentAvg, olderAvg, change }
    };
  }

  private calculateCoverageScore(coverage: CoverageMetrics): number {
    const total = coverage.total;
    return (total.lines.pct + total.functions.pct + total.branches.pct + total.statements.pct) / 4;
  }

  private calculatePerformanceScore(performance: PerformanceMetrics): number {
    let score = 100;

    // Bundle size penalties
    if (performance.bundles) {
      const failedBundles = performance.bundles.filter(b => !b.passed).length;
      score -= (failedBundles / performance.bundles.length) * 30;
    }

    // API performance penalties
    if (performance.api) {
      const failedApis = performance.api.filter(api => !api.passed).length;
      score -= (failedApis / performance.api.length) * 25;
    }

    // Lighthouse score bonuses/penalties
    if (performance.lighthouse) {
      const lighthouseScore = Object.values(performance.lighthouse)
        .filter(score => score !== undefined)
        .reduce((sum, score) => sum + score.score, 0) /
        Object.values(performance.lighthouse).filter(score => score !== undefined).length;

      score = (score + lighthouseScore) / 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateInternalQualityScore(quality: QualityMetrics): number {
    let score = 100;

    // TDD compliance
    if (quality.tddCompliance && !quality.tddCompliance.passed) {
      score -= 20;
    }

    // Security score
    if (quality.security) {
      score = (score + quality.security.score) / 2;
    }

    // Test success rate
    if (quality.tests) {
      const totalTests = Object.values(quality.tests).reduce((sum, testType) => sum + testType.total, 0);
      const passedTests = Object.values(quality.tests).reduce((sum, testType) => sum + testType.passed, 0);
      const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
      score = (score + successRate) / 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateTrendsScore(trends: TrendMetrics): number {
    // Simple trend scoring - could be made more sophisticated
    let score = 50; // Base score

    // Coverage trends bonus
    if (trends.coverageTrend) {
      const avgCoverageTrend = trends.coverageTrend.reduce((sum, trend) => sum + trend, 0) / trends.coverageTrend.length;
      score += Math.max(-20, Math.min(20, avgCoverageTrend));
    }

    return Math.max(0, Math.min(100, score));
  }
}