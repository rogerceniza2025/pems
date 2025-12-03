/**
 * Analytics Schema and Data Models for Test Process Automation
 *
 * This file defines the data structures used for collecting, storing,
 * and analyzing test metrics, coverage data, and performance trends.
 */

export interface TimestampedMetrics {
  timestamp: string;
  commitHash?: string;
  branch?: string;
  author?: string;
}

export interface CoverageMetrics {
  total: {
    lines: {
      covered: number;
      total: number;
      pct: number;
    };
    functions: {
      covered: number;
      total: number;
      pct: number;
    };
    branches: {
      covered: number;
      total: number;
      pct: number;
    };
    statements: {
      covered: number;
      total: number;
      pct: number;
    };
  };
  domain?: {
    lines: { covered: number; total: number; pct: number };
    functions: { covered: number; total: number; pct: number };
    branches: { covered: number; total: number; pct: number };
    statements: { covered: number; total: number; pct: number };
  };
  modules?: Record<string, {
    lines: { covered: number; total: number; pct: number };
    functions: { covered: number; total: number; pct: number };
    branches: { covered: number; total: number; pct: number };
    statements: { covered: number; total: number; pct: number };
  }>;
  newCode?: {
    lines: { covered: number; total: number; pct: number };
    functions: { covered: number; total: number; pct: number };
    branches: { covered: number; total: number; pct: number };
    statements: { covered: number; total: number; pct: number };
  };
}

export interface PerformanceMetrics {
  bundles?: Array<{
    name: string;
    path: string;
    size: number;
    gzippedSize: number;
    max: number;
    warning: number;
    passed: boolean;
  }>;
  coreWebVitals?: {
    FCP?: { value: number; target: number; warning: number; passed: boolean };
    LCP?: { value: number; target: number; warning: number; passed: boolean };
    CLS?: { value: number; target: number; warning: number; passed: boolean };
    INP?: { value: number; target: number; warning: number; passed: boolean };
    TTFB?: { value: number; target: number; warning: number; passed: boolean };
  };
  api?: Array<{
    endpoint: string;
    responseTime: number;
    max: number;
    warning: number;
    passed: boolean;
  }>;
  lighthouse?: {
    performance?: { score: number; min: number; warning: number; passed: boolean };
    accessibility?: { score: number; min: number; warning: number; passed: boolean };
    'best-practices'?: { score: number; min: number; warning: number; passed: boolean };
    seo?: { score: number; min: number; warning: number; passed: boolean };
  };
}

export interface QualityMetrics {
  tddCompliance?: {
    violations: number;
    warnings: number;
    totalFiles: number;
    passed: boolean;
  };
  security?: {
    vulnerabilities: number;
    criticalIssues: number;
    highIssues: number;
    score: number;
    passed: boolean;
  };
  tests?: {
    unit: {
      total: number;
      passed: number;
      failed: number;
      duration: number;
    };
    integration: {
      total: number;
      passed: number;
      failed: number;
      duration: number;
    };
    e2e: {
      total: number;
      passed: number;
      failed: number;
      duration: number;
    };
    contract: {
      total: number;
      passed: number;
      failed: number;
      duration: number;
    };
  };
  flakyTests?: Array<{
    testFile: string;
    testName: string;
    failureRate: number;
    lastFailures: string[];
  }>;
}

export interface TrendMetrics {
  coverageTrend?: {
    lines: number[]; // percentage change over time
    functions: number[];
    branches: number[];
    statements: number[];
  };
  performanceTrend?: {
    bundleSize: number[];
    apiResponseTime: number[];
    lighthouseScore: number[];
  };
  qualityTrend?: {
    testSuccessRate: number[];
    tddComplianceRate: number[];
    securityScore: number[];
  };
  predictions?: {
    coverageProjection: {
      lines: number;
      functions: number;
      branches: number;
      statements: number;
      timeframe: string; // e.g., "2 weeks"
    };
    performanceRisk: {
      bundleSizeGrowth: number;
      apiResponseTimeIncrease: number;
      probability: number;
    };
    qualityRisk: {
      testFailureRate: number;
      regressionProbability: number;
      confidence: number;
    };
  };
}

export interface TestMetrics extends TimestampedMetrics {
  id: string;
  coverage: CoverageMetrics;
  performance: PerformanceMetrics;
  quality: QualityMetrics;
  trends: TrendMetrics;
  summary: {
    overallScore: number;
    status: 'passing' | 'warning' | 'failing';
    criticalIssues: string[];
    recommendations: string[];
  };
}

export interface AnalyticsConfig {
  thresholds: {
    coverage: {
      global: { lines: number; functions: number; branches: number; statements: number };
      domain: { lines: number; functions: number; branches: number; statements: number };
      newCode: { lines: number; functions: number; branches: number; statements: number };
    };
    performance: {
      bundleSizeGrowth: number; // percentage
      apiResponseTimeIncrease: number; // percentage
      lighthouseScoreMin: number;
    };
    quality: {
      minTestSuccessRate: number;
      minTddComplianceRate: number;
      maxFlakyTestRate: number;
    };
  };
  retention: {
    detailedDataMonths: number;
    aggregatedDataMonths: number;
    compressionEnabled: boolean;
  };
  alerts: {
    enabled: boolean;
    channels: ('email' | 'slack' | 'github')[];
    thresholds: {
      critical: number;
      warning: number;
    };
  };
}

export interface TrendAnalysis {
  metric: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'improving' | 'declining' | 'stable';
  significance: 'high' | 'medium' | 'low';
  prediction?: {
    nextValue: number;
    confidence: number;
    timeframe: string;
  };
}

export interface RegressionReport {
  type: 'performance' | 'coverage' | 'quality';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedMetrics: string[];
  baselineValue: number;
  currentValue: number;
  deviation: number;
  confidence: number;
  recommendations: string[];
  detectedAt: string;
}

export interface InsightReport {
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendations: string[];
  data: Record<string, any>;
  generatedAt: string;
}

export interface PredictiveReport {
  timeframe: string;
  probability: number;
  confidence: number;
  factors: Array<{
    name: string;
    weight: number;
    value: number;
  }>;
  recommendations: string[];
  mitigations: string[];
}

// Database schema definitions
export interface AnalyticsTableRow {
  id: string;
  timestamp: string;
  commit_hash?: string;
  branch?: string;
  author?: string;
  coverage_data: string; // JSON string
  performance_data: string; // JSON string
  quality_data: string; // JSON string
  trends_data: string; // JSON string
  summary_data: string; // JSON string
  created_at: string;
}

export interface CoverageHistoryRow {
  id: string;
  metrics_id: string;
  module_name?: string;
  metric_type: 'total' | 'domain' | 'module' | 'new_code';
  lines_covered: number;
  lines_total: number;
  lines_pct: number;
  functions_covered: number;
  functions_total: number;
  functions_pct: number;
  branches_covered: number;
  branches_total: number;
  branches_pct: number;
  statements_covered: number;
  statements_total: number;
  statements_pct: number;
  created_at: string;
}

export interface PerformanceHistoryRow {
  id: string;
  metrics_id: string;
  metric_type: 'bundle' | 'core_web_vital' | 'api' | 'lighthouse';
  metric_name: string;
  value: number;
  baseline?: number;
  threshold?: number;
  passed: boolean;
  created_at: string;
}

export interface QualityHistoryRow {
  id: string;
  metrics_id: string;
  metric_type: 'tdd' | 'security' | 'tests' | 'flaky_tests';
  metric_name: string;
  value: number;
  threshold?: number;
  passed: boolean;
  created_at: string;
}

// API Response Types
export interface AnalyticsApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface MetricsResponse {
  metrics: TestMetrics[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface TrendResponse {
  trends: TrendAnalysis[];
  timeframe: string;
  metrics: string[];
}

export interface DashboardData {
  overview: {
    currentMetrics: TestMetrics | null;
    recentTrends: TrendAnalysis[];
    criticalIssues: RegressionReport[];
    insights: InsightReport[];
  };
  charts: {
    coverageHistory: Array<{ timestamp: string; lines: number; functions: number; branches: number; statements: number }>;
    performanceHistory: Array<{ timestamp: string; bundleSize: number; apiResponseTime: number; lighthouseScore: number }>;
    qualityHistory: Array<{ timestamp: string; testSuccessRate: number; tddCompliance: number; securityScore: number }>;
  };
  alerts: Array<{
    type: 'regression' | 'threshold' | 'prediction';
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    timestamp: string;
  }>;
}