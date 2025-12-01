# GitHub Actions Workflows Configuration

This document contains all the GitHub Actions workflow configurations needed for the PEMS CI/CD pipeline implementation.

## 1. Pull Request Validation Workflow

### File: `.github/workflows/pr-validation.yml`

```yaml
name: Pull Request Validation

on:
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '8'

jobs:
  # Code quality checks
  lint:
    name: Code Quality
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run linting
        run: pnpm lint

      - name: Run style linting
        run: pnpm lint:styles

      - name: Type checking
        run: pnpm type-check

  # Unit tests
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

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

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run unit tests with coverage
        run: pnpm test:unit -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

  # Integration tests
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:18-alpine
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_USER: test
          POSTGRES_DB: pems_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

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

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup test database
        run: |
          pnpm db:generate
          pnpm db:migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/pems_test
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/pems_test
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test

  # Build validation
  build-validation:
    name: Build Validation
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

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

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build all packages and apps
        run: pnpm build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: |
            apps/*/dist
            packages/*/dist
          retention-days: 7

  # Visual tests
  visual-tests:
    name: Visual Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build Storybook
        run: pnpm build-storybook

      - name: Run visual tests
        run: pnpm test:visual:ci

      - name: Upload visual test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: visual-test-results
          path: |
            .storybook/coverage
            __screenshots__
          retention-days: 7
```

## 2. Main Branch Deployment Workflow

### File: `.github/workflows/deploy-staging.yml`

```yaml
name: Deploy to Staging

on:
  push:
    branches: [main]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '8'
  RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
  RAILWAY_PROJECT_ID: ${{ secrets.RAILWAY_PROJECT_ID }}

jobs:
  # Full test suite
  full-test-suite:
    name: Full Test Suite
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:18-alpine
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_USER: test
          POSTGRES_DB: pems_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

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

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup test database
        run: |
          pnpm db:generate
          pnpm db:migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/pems_test
          REDIS_URL: redis://localhost:6379

      - name: Run all tests
        run: pnpm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/pems_test
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload E2E test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: e2e-test-results
          path: |
            playwright-report
            test-results
          retention-days: 7

      - name: Generate coverage report
        run: pnpm test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: alltests
          name: codecov-umbrella

  # Build and deploy
  deploy-staging:
    name: Deploy to Staging
    needs: full-test-suite
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

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

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Build applications
        run: pnpm build

      - name: Deploy to Railway
        run: |
          railway login --token ${{ env.RAILWAY_TOKEN }}
          railway up --service api
          railway up --service web
          railway up --service admin
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
          REDIS_URL: ${{ secrets.STAGING_REDIS_URL }}
          JWT_SECRET: ${{ secrets.STAGING_JWT_SECRET }}
          BETTER_AUTH_SECRET: ${{ secrets.STAGING_BETTER_AUTH_SECRET }}

      - name: Wait for deployment
        run: sleep 60

      - name: Run health checks
        run: |
          # Check API health
          if ! curl -f ${{ secrets.STAGING_API_URL }}/api/health; then
            echo "API health check failed"
            exit 1
          fi
          
          # Check web app
          if ! curl -f ${{ secrets.STAGING_WEB_URL }}; then
            echo "Web app health check failed"
            exit 1
          fi
          
          # Check admin panel
          if ! curl -f ${{ secrets.STAGING_ADMIN_URL }}; then
            echo "Admin panel health check failed"
            exit 1
          fi

      - name: Notify deployment status
        uses: 8398a7/action-slack@v3
        if: always()
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

  # Rollback on failure
  rollback-on-failure:
    name: Rollback on Failure
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: failure()
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.before }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Rollback deployment
        run: |
          railway login --token ${{ env.RAILWAY_TOKEN }}
          railway rollback
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
          REDIS_URL: ${{ secrets.STAGING_REDIS_URL }}

      - name: Notify rollback
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          text: "🚨 Deployment rolled back due to health check failure"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## 3. Scheduled Maintenance Workflow

### File: `.github/workflows/maintenance.yml`

```yaml
name: Scheduled Maintenance

on:
  schedule:
    - cron: '0 2 * * 0'  # Every Sunday at 2 AM UTC
  workflow_dispatch:

jobs:
  cleanup:
    name: Cleanup and Maintenance
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: '8'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Clean up old artifacts
        run: |
          # Clean up old build artifacts
          find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
          find . -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null || true
          find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

      - name: Update dependencies
        run: |
          pnpm outdated
          echo "Consider updating outdated dependencies"

      - name: Security audit
        run: pnpm audit --audit-level moderate

      - name: Database maintenance
        run: |
          # This would connect to staging database for maintenance
          echo "Database maintenance tasks would run here"
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}

  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: '8'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build applications
        run: pnpm build

      - name: Run performance tests
        run: |
          echo "Performance tests would run here"
          # This would include Lighthouse CI, load testing, etc.
```

## 4. Security Scanning Workflow

### File: `.github/workflows/security.yml`

```yaml
name: Security Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM UTC

jobs:
  dependency-scan:
    name: Dependency Security Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: '8'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run security audit
        run: pnpm audit --audit-level moderate

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  code-scan:
    name: Code Security Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          languages: javascript, typescript

  container-scan:
    name: Container Security Scan
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -t pems-temp .
          
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'pems-temp'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

## 5. Environment Configuration

### File: `.github/workflows/environment-setup.yml`

```yaml
name: Environment Setup

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      deploy-url:
        required: false
        type: string

jobs:
  setup-environment:
    name: Setup ${{ inputs.environment }} Environment
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: '8'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate environment file
        run: |
          cat > .env.${{ inputs.environment }} << EOF
          NODE_ENV=${{ inputs.environment }}
          DATABASE_URL=${{ secrets[inputs.environment.toUpperCase() + '_DATABASE_URL'] }}
          REDIS_URL=${{ secrets[inputs.environment.toUpperCase() + '_REDIS_URL'] }}
          JWT_SECRET=${{ secrets[inputs.environment.toUpperCase() + '_JWT_SECRET'] }}
          BETTER_AUTH_SECRET=${{ secrets[inputs.environment.toUpperCase() + '_BETTER_AUTH_SECRET'] }}
          EOF

      - name: Upload environment file
        uses: actions/upload-artifact@v3
        with:
          name: env-${{ inputs.environment }}
          path: .env.${{ inputs.environment }}
          retention-days: 1
```

## Required GitHub Secrets

The following secrets need to be configured in the GitHub repository settings:

### Railway Integration
- `RAILWAY_TOKEN`: Railway API token
- `RAILWAY_PROJECT_ID`: Railway project ID

### Staging Environment
- `STAGING_DATABASE_URL`: PostgreSQL connection string
- `STAGING_REDIS_URL`: Redis connection string
- `STAGING_JWT_SECRET`: JWT signing secret
- `STAGING_BETTER_AUTH_SECRET`: BetterAuth secret
- `STAGING_API_URL`: Deployed API URL
- `STAGING_WEB_URL`: Deployed web app URL
- `STAGING_ADMIN_URL`: Deployed admin panel URL

### Production Environment (for future use)
- `PRODUCTION_DATABASE_URL`: PostgreSQL connection string
- `PRODUCTION_REDIS_URL`: Redis connection string
- `PRODUCTION_JWT_SECRET`: JWT signing secret
- `PRODUCTION_BETTER_AUTH_SECRET`: BetterAuth secret

### Monitoring and Notifications
- `SLACK_WEBHOOK`: Slack webhook URL for notifications
- `SENTRY_DSN`: Sentry error tracking DSN
- `CODECOV_TOKEN`: Codecov token for coverage reports

### Security
- `SNYK_TOKEN`: Snyk security scanning token

## Workflow Usage Guidelines

### Pull Request Validation
- Triggers on PR to main/develop branches
- Runs code quality, unit tests, integration tests, and build validation
- Blocks merge if any checks fail
- Provides fast feedback to developers

### Staging Deployment
- Triggers on push to main branch
- Runs full test suite including E2E tests
- Deploys to Railway staging environment
- Performs health checks
- Automatic rollback on failure

### Security Scanning
- Runs on all pushes and PRs
- Daily scheduled scans
- Dependency vulnerability scanning
- Code security analysis
- Container security scanning

### Maintenance
- Weekly scheduled maintenance
- Cleanup old artifacts
- Update dependency checks
- Performance monitoring

These workflows provide a comprehensive CI/CD pipeline that meets all the acceptance criteria for PO-2 while maintaining flexibility for future growth and hybrid deployment strategy migration.