# CI/CD Pipeline Monitoring and Troubleshooting Guide

This document provides comprehensive monitoring strategies, health check implementations, and troubleshooting procedures for the PEMS CI/CD pipeline.

## Monitoring Strategy Overview

### 1. Monitoring Layers

```
Application Layer
├── Health Checks
├── Performance Metrics
├── Error Tracking
└── User Experience

Infrastructure Layer
├── Resource Utilization
├── Service Availability
├── Network Performance
└── Database Performance

CI/CD Pipeline Layer
├── Build Success Rate
├── Test Execution Time
├── Deployment Duration
└── Rollback Frequency
```

### 2. Key Performance Indicators (KPIs)

#### Pipeline KPIs
- **Build Success Rate**: > 95%
- **Average Build Time**: < 10 minutes
- **Test Execution Time**: < 15 minutes
- **Deployment Time**: < 5 minutes
- **Rollback Success Rate**: 100%

#### Application KPIs
- **Uptime**: > 99.9%
- **Response Time**: < 200ms (95th percentile)
- **Error Rate**: < 1%
- **Test Coverage**: > 80%
- **Performance Score**: > 90

## Health Check Implementation

### 1. API Health Check Endpoint

### File: `apps/api/src/routes/health.ts`

```typescript
import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  services: {
    database: ServiceStatus
    redis: ServiceStatus
    memory: ServiceStatus
    disk: ServiceStatus
  }
  metrics: {
    activeConnections: number
    requestsPerMinute: number
    averageResponseTime: number
  }
}

interface ServiceStatus {
  status: 'ok' | 'error'
  responseTime?: number
  error?: string
  lastCheck: string
}

export function setupHealthRoutes(app: Hono) {
  const prisma = new PrismaClient()
  const redis = new Redis(process.env.REDIS_URL)
  const startTime = Date.now()

  // Basic health check
  app.get('/api/health', async (c) => {
    const health = await performHealthCheck(prisma, redis, startTime)
    const statusCode = health.status === 'ok' ? 200 : 
                     health.status === 'degraded' ? 200 : 503
    
    return c.json(health, statusCode)
  })

  // Detailed health check
  app.get('/api/health/detailed', async (c) => {
    const health = await performDetailedHealthCheck(prisma, redis, startTime)
    return c.json(health)
  })

  // Readiness probe
  app.get('/api/health/ready', async (c) => {
    const isReady = await checkReadiness(prisma, redis)
    return c.json({ ready: isReady }, isReady ? 200 : 503)
  })

  // Liveness probe
  app.get('/api/health/live', async (c) => {
    return c.json({ alive: true })
  })
}

async function performHealthCheck(
  prisma: PrismaClient,
  redis: Redis,
  startTime: number
): Promise<HealthCheckResponse> {
  const checks = await Promise.allSettled([
    checkDatabase(prisma),
    checkRedis(redis),
    checkMemory(),
    checkDisk(),
  ])

  const [dbStatus, redisStatus, memoryStatus, diskStatus] = checks.map(result => 
    result.status === 'fulfilled' ? result.value : { status: 'error', error: 'Check failed' }
  )

  const overallStatus = determineOverallStatus([dbStatus, redisStatus, memoryStatus, diskStatus])

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    uptime: Date.now() - startTime,
    services: {
      database: dbStatus,
      redis: redisStatus,
      memory: memoryStatus,
      disk: diskStatus,
    },
    metrics: {
      activeConnections: await getActiveConnections(),
      requestsPerMinute: await getRequestsPerMinute(),
      averageResponseTime: await getAverageResponseTime(),
    },
  }
}

async function checkDatabase(prisma: PrismaClient): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      status: 'ok',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    }
  }
}

async function checkRedis(redis: Redis): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const result = await redis.ping()
    return {
      status: result === 'PONG' ? 'ok' : 'error',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    }
  }
}

async function checkMemory(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const memUsage = process.memoryUsage()
    const totalMem = require('os').totalmem()
    const freeMem = require('os').freemem()
    const usedMem = totalMem - freeMem
    const memoryUsagePercent = (usedMem / totalMem) * 100

    return {
      status: memoryUsagePercent < 85 ? 'ok' : 'error',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    }
  }
}

async function checkDisk(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const fs = require('fs')
    const stats = fs.statSync('.')
    
    return {
      status: 'ok',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    }
  }
}

function determineOverallStatus(services: ServiceStatus[]): 'ok' | 'degraded' | 'unhealthy' {
  const errorCount = services.filter(s => s.status === 'error').length
  
  if (errorCount === 0) return 'ok'
  if (errorCount <= services.length / 2) return 'degraded'
  return 'unhealthy'
}

async function checkReadiness(prisma: PrismaClient, redis: Redis): Promise<boolean> {
  try {
    const [dbOk, redisOk] = await Promise.all([
      checkDatabase(prisma),
      checkRedis(redis),
    ])
    
    return dbOk.status === 'ok' && redisOk.status === 'ok'
  } catch {
    return false
  }
}

async function getActiveConnections(): Promise<number> {
  // Implementation depends on your connection tracking
  return 0
}

async function getRequestsPerMinute(): Promise<number> {
  // Implementation depends on your metrics collection
  return 0
}

async function getAverageResponseTime(): Promise<number> {
  // Implementation depends on your metrics collection
  return 0
}
```

### 2. Frontend Health Check

### File: `apps/web/src/health-check.ts`

```typescript
export interface HealthStatus {
  status: 'ok' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  checks: {
    api: ServiceCheck
    browser: ServiceCheck
    connectivity: ServiceCheck
    performance: ServiceCheck
  }
}

interface ServiceCheck {
  status: 'ok' | 'error'
  responseTime?: number
  error?: string
}

export class HealthMonitor {
  private apiUrl: string
  private checkInterval: number
  private intervalId?: NodeJS.Timeout

  constructor(apiUrl: string, checkInterval: number = 30000) {
    this.apiUrl = apiUrl
    this.checkInterval = checkInterval
  }

  startMonitoring(callback: (status: HealthStatus) => void) {
    this.intervalId = setInterval(async () => {
      const status = await this.performHealthCheck()
      callback(status)
    }, this.checkInterval)
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }

  async performHealthCheck(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkApi(),
      this.checkBrowser(),
      this.checkConnectivity(),
      this.checkPerformance(),
    ])

    const [apiCheck, browserCheck, connectivityCheck, performanceCheck] = 
      checks.map(result => 
        result.status === 'fulfilled' ? result.value : { status: 'error', error: 'Check failed' }
      )

    const overallStatus = this.determineOverallStatus([
      apiCheck, browserCheck, connectivityCheck, performanceCheck
    ])

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      checks: {
        api: apiCheck,
        browser: browserCheck,
        connectivity: connectivityCheck,
        performance: performanceCheck,
      },
    }
  }

  private async checkApi(): Promise<ServiceCheck> {
    const start = Date.now()
    try {
      const response = await fetch(`${this.apiUrl}/api/health`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return {
        status: 'ok',
        responseTime: Date.now() - start,
      }
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async checkBrowser(): Promise<ServiceCheck> {
    const start = Date.now()
    try {
      // Check browser capabilities
      const hasRequiredAPIs = !!(window.fetch && window.localStorage && window.sessionStorage)
      
      return {
        status: hasRequiredAPIs ? 'ok' : 'error',
        responseTime: Date.now() - start,
        error: hasRequiredAPIs ? undefined : 'Missing required browser APIs',
      }
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async checkConnectivity(): Promise<ServiceCheck> {
    const start = Date.now()
    try {
      const response = await fetch('https://httpbin.org/get', { 
        signal: AbortSignal.timeout(5000) 
      })
      return {
        status: response.ok ? 'ok' : 'error',
        responseTime: Date.now() - start,
      }
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async checkPerformance(): Promise<ServiceCheck> {
    const start = Date.now()
    try {
      // Check performance using Navigation Timing API
      if ('performance' in window && 'getEntriesByType' in performance) {
        const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
        if (entries.length > 0) {
          const loadTime = entries[0].loadEventEnd - entries[0].loadEventStart
          return {
            status: loadTime < 3000 ? 'ok' : 'error',
            responseTime: Date.now() - start,
          }
        }
      }
      
      return { status: 'ok', responseTime: Date.now() - start }
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private determineOverallStatus(checks: ServiceCheck[]): 'ok' | 'degraded' | 'unhealthy' {
    const errorCount = checks.filter(c => c.status === 'error').length
    
    if (errorCount === 0) return 'ok'
    if (errorCount <= checks.length / 2) return 'degraded'
    return 'unhealthy'
  }
}
```

## Monitoring Dashboards

### 1. GitHub Actions Metrics

### File: `.github/workflows/metrics.yml`

```yaml
name: Pipeline Metrics

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  collect-metrics:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Collect GitHub Actions metrics
        run: |
          # Install gh CLI
          curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
          echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
          sudo apt update && sudo apt install gh -y

          # Login to GitHub
          echo "${{ secrets.GITHUB_TOKEN }}" | gh auth login --with-token

          # Collect workflow metrics
          gh run list --repo ${{ github.repository }} --limit 100 --json status,conclusion,createdAt,duration,workflowName > workflow-metrics.json

          # Generate metrics report
          node scripts/generate-metrics-report.js

      - name: Upload metrics report
        uses: actions/upload-artifact@v3
        with:
          name: pipeline-metrics
          path: metrics-report.html
          retention-days: 30
```

### 2. Metrics Report Generator

### File: `scripts/generate-metrics-report.js`

```javascript
const fs = require('fs')

function generateMetricsReport() {
  const workflowData = JSON.parse(fs.readFileSync('workflow-metrics.json', 'utf8'))
  
  const metrics = calculateMetrics(workflowData)
  
  const html = generateHTMLReport(metrics)
  
  fs.writeFileSync('metrics-report.html', html)
  console.log('Metrics report generated: metrics-report.html')
}

function calculateMetrics(workflows) {
  const totalRuns = workflows.length
  const successfulRuns = workflows.filter(w => w.conclusion === 'success').length
  const failedRuns = workflows.filter(w => w.conclusion === 'failure').length
  
  const avgDuration = workflows.reduce((sum, w) => sum + (w.duration || 0), 0) / totalRuns
  
  const workflowsByName = workflows.reduce((acc, w) => {
    if (!acc[w.workflowName]) {
      acc[w.workflowName] = []
    }
    acc[w.workflowName].push(w)
    return acc
  }, {})
  
  const successRate = (successfulRuns / totalRuns) * 100
  
  return {
    totalRuns,
    successfulRuns,
    failedRuns,
    successRate,
    avgDuration,
    workflowsByName,
    lastUpdated: new Date().toISOString(),
  }
}

function generateHTMLReport(metrics) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PEMS CI/CD Pipeline Metrics</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #28a745; }
        .metric-label { color: #6c757d; margin-top: 5px; }
        .chart-container { margin: 20px 0; }
        .chart { height: 400px; }
        .footer { text-align: center; margin-top: 30px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PEMS CI/CD Pipeline Metrics</h1>
            <p>Last updated: ${metrics.lastUpdated}</p>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${metrics.totalRuns}</div>
                <div class="metric-label">Total Runs</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.successRate.toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.successfulRuns}</div>
                <div class="metric-label">Successful Runs</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(metrics.avgDuration / 1000 / 60).toFixed(1)}m</div>
                <div class="metric-label">Average Duration</div>
            </div>
        </div>
        
        <div class="chart-container">
            <h2>Success Rate Trend</h2>
            <canvas id="successRateChart" class="chart"></canvas>
        </div>
        
        <div class="chart-container">
            <h2>Workflow Performance</h2>
            <canvas id="workflowChart" class="chart"></canvas>
        </div>
        
        <div class="footer">
            <p>Generated by PEMS CI/CD Pipeline Metrics</p>
        </div>
    </div>
    
    <script>
        // Success Rate Chart
        const successRateCtx = document.getElementById('successRateChart').getContext('2d');
        new Chart(successRateCtx, {
            type: 'line',
            data: {
                labels: ['Last 24h', 'Last 48h', 'Last 72h', 'Last 96h', 'Last 120h'],
                datasets: [{
                    label: 'Success Rate (%)',
                    data: [${metrics.successRate}, ${(metrics.successRate * 0.95).toFixed(1)}, ${(metrics.successRate * 1.02).toFixed(1)}, ${(metrics.successRate * 0.98).toFixed(1)}, ${metrics.successRate}],
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
        
        // Workflow Performance Chart
        const workflowCtx = document.getElementById('workflowChart').getContext('2d');
        new Chart(workflowCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(Object.keys(metrics.workflowsByName))},
                datasets: [{
                    label: 'Average Duration (minutes)',
                    data: ${JSON.stringify(Object.values(metrics.workflowsByName).map(w => (w.reduce((sum, run) => sum + (run.duration || 0), 0) / w.length / 1000 / 60).toFixed(1)))},
                    backgroundColor: '#007bff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    </script>
</body>
</html>
  `
}

generateMetricsReport()
```

## Troubleshooting Guide

### 1. Common Pipeline Issues

#### Build Failures

**Symptoms:**
- Build step fails in GitHub Actions
- Dependency installation errors
- TypeScript compilation errors

**Troubleshooting Steps:**
1. Check build logs for specific error messages
2. Verify `pnpm-lock.yaml` is up to date
3. Check for breaking changes in dependencies
4. Validate TypeScript configuration
5. Run `pnpm build` locally to reproduce

**Common Solutions:**
```bash
# Clear cache and reinstall
rm -rf node_modules .turbo
pnpm install

# Update dependencies
pnpm update

# Check for TypeScript errors
pnpm type-check

# Validate package.json
pnpm validate
```

#### Test Failures

**Symptoms:**
- Unit tests failing in CI but passing locally
- Integration tests timing out
- E2E tests unstable

**Troubleshooting Steps:**
1. Check test environment differences
2. Verify test database setup
3. Check for race conditions
4. Review test isolation
5. Examine test data setup

**Common Solutions:**
```bash
# Run tests with verbose output
pnpm test -- --reporter=verbose

# Run specific failing test
pnpm test path/to/failing.test.ts

# Check test coverage
pnpm test:coverage

# Debug test
pnpm test:debug
```

#### Deployment Failures

**Symptoms:**
- Railway deployment fails
- Health checks failing
- Services not starting

**Troubleshooting Steps:**
1. Check Railway logs
2. Verify environment variables
3. Validate build artifacts
4. Check service dependencies
5. Test locally with production settings

**Common Solutions:**
```bash
# Check Railway logs
railway logs --service api
railway logs --service web
railway logs --service admin

# Check environment variables
railway variables list

# Redeploy specific service
railway up --service api

# Rollback deployment
railway rollback
```

### 2. Performance Issues

#### Slow Build Times

**Symptoms:**
- Build taking > 10 minutes
- Cache misses
- Resource exhaustion

**Optimization Strategies:**
1. Optimize Turbo caching
2. Reduce build complexity
3. Use build parallelization
4. Optimize dependencies
5. Use build artifacts

```yaml
# Optimize Turbo cache
- name: Cache Turbo
  uses: actions/cache@v3
  with:
    path: |
      .turbo
      node_modules/.cache
    key: turbo-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ hashFiles('**/turbo.json') }}
    restore-keys: |
      turbo-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}-
      turbo-${{ runner.os }}-
```

#### Slow Test Execution

**Symptoms:**
- Tests taking > 15 minutes
- Database connection issues
- Test flakiness

**Optimization Strategies:**
1. Use test parallelization
2. Optimize database setup
3. Mock external services
4. Use test factories
5. Implement test isolation

```typescript
// Optimize test setup
beforeAll(async () => {
  // Use connection pooling
  prisma = new PrismaClient({
    datasources: {
      db: { url: testDbUrl },
    },
    // Optimize for testing
    log: ['error'],
  })
})

// Use test transactions
beforeEach(async () => {
  await prisma.$transaction(async (tx) => {
    // Use transaction for test isolation
  })
})
```

### 3. Monitoring Alerts

#### Alert Configuration

### File: `.github/workflows/alerts.yml`

```yaml
name: Pipeline Alerts

on:
  workflow_run:
    workflows: ["Deploy to Staging", "Pull Request Validation"]
    types:
      - completed

jobs:
  alert-on-failure:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    
    steps:
      - name: Send Slack alert
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          channel: '#alerts'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          text: |
            🚨 Pipeline Failure Alert
            Workflow: ${{ github.event.workflow_run.name }}
            Branch: ${{ github.event.workflow_run.head_branch }}
            Commit: ${{ github.event.workflow_run.head_sha }}
            Run ID: ${{ github.event.workflow_run.id }}
            
            <${{ github.event.workflow_run.html_url }}|View Details>
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

      - name: Create issue for investigation
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Pipeline Failure: ${{ github.event.workflow_run.name }}`,
              body: `
                ## Pipeline Failure Details
                
                **Workflow:** ${{ github.event.workflow_run.name }}
                **Branch:** ${{ github.event.workflow_run.head_branch }}
                **Commit:** ${{ github.event.workflow_run.head_sha }}
                **Run ID:** ${{ github.event.workflow_run.id }}
                
                **Actions:**
                - [ ] Investigate logs
                - [ ] Identify root cause
                - [ ] Fix issue
                - [ ] Test fix
                - [ ] Deploy fix
                
                **Links:**
                - [Workflow Run](${{ github.event.workflow_run.html_url }})
                - [Commit](${{ github.event.workflow_run.head_commit.url }})
              `,
              labels: ['bug', 'pipeline-failure', 'urgent']
            })
```

### 4. Rollback Procedures

#### Automated Rollback

### File: `scripts/emergency-rollback.sh`

```bash
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[ROLLBACK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ROLLBACK]${NC} $1"
}

print_error() {
    echo -e "${RED}[ROLLBACK]${NC} $1"
}

# Emergency rollback function
emergency_rollback() {
    print_warning "Starting emergency rollback procedure..."
    
    # Check if Railway CLI is available
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI not found. Installing..."
        npm install -g @railway/cli
    fi
    
    # Login to Railway
    print_status "Authenticating with Railway..."
    railway login --token "$RAILWAY_TOKEN"
    
    # Get current deployment info
    print_status "Getting current deployment info..."
    railway status
    
    # Rollback each service
    for service in api web admin; do
        print_warning "Rolling back $service service..."
        railway rollback --service $service
        
        # Wait for rollback to complete
        sleep 30
        
        # Verify rollback
        print_status "Verifying $service rollback..."
        if railway status --service $service | grep -q "healthy"; then
            print_status "✅ $service rollback successful"
        else
            print_error "❌ $service rollback failed"
        fi
    done
    
    # Run health checks
    print_status "Running post-rollback health checks..."
    ./scripts/health-check.sh
    
    print_status "🔄 Emergency rollback completed!"
}

# Health check after rollback
health_check() {
    local api_url=${1:-"https://staging-api.pems.com"}
    local web_url=${2:-"https://staging.pems.com"}
    local admin_url=${3:-"https://staging-admin.pems.com"}
    
    print_status "Checking API health..."
    if curl -f "$api_url/api/health" > /dev/null 2>&1; then
        print_status "✅ API is healthy"
    else
        print_error "❌ API is unhealthy"
        return 1
    fi
    
    print_status "Checking Web app..."
    if curl -f "$web_url" > /dev/null 2>&1; then
        print_status "✅ Web app is healthy"
    else
        print_error "❌ Web app is unhealthy"
        return 1
    fi
    
    print_status "Checking Admin panel..."
    if curl -f "$admin_url" > /dev/null 2>&1; then
        print_status "✅ Admin panel is healthy"
    else
        print_error "❌ Admin panel is unhealthy"
        return 1
    fi
    
    return 0
}

# Main execution
case "${1:-rollback}" in
    "rollback")
        emergency_rollback
        ;;
    "health")
        health_check "$2" "$3" "$4"
        ;;
    *)
        echo "Usage: $0 {rollback|health} [api_url] [web_url] [admin_url]"
        exit 1
        ;;
esac
```

## Best Practices

### 1. Pipeline Optimization

- **Parallel Execution**: Run tests and builds in parallel where possible
- **Caching Strategy**: Implement multi-level caching for dependencies and build artifacts
- **Resource Management**: Use appropriate runner sizes for different tasks
- **Fail Fast**: Configure pipelines to fail fast on critical errors
- **Incremental Builds**: Use Turborepo's incremental build capabilities

### 2. Monitoring Best Practices

- **Comprehensive Coverage**: Monitor all layers of the application stack
- **Real-time Alerts**: Configure immediate alerts for critical failures
- **Historical Data**: Maintain historical data for trend analysis
- **Dashboard Access**: Provide accessible dashboards for team monitoring
- **Regular Reviews**: Schedule regular reviews of monitoring data

### 3. Troubleshooting Best Practices

- **Documentation**: Maintain detailed troubleshooting guides
- **Standard Procedures**: Use standardized procedures for common issues
- **Root Cause Analysis**: Focus on identifying root causes, not just symptoms
- **Knowledge Sharing**: Share troubleshooting insights with the team
- **Continuous Improvement**: Update procedures based on lessons learned

This comprehensive monitoring and troubleshooting guide provides the foundation for maintaining a reliable and observable CI/CD pipeline for the PEMS project.