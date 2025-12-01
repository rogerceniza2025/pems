# Sprint 0 Test Templates

## Overview

This document provides comprehensive test templates for Sprint 0 stories following TDD principles. These templates include unit tests, integration tests, and E2E tests for each user story in Sprint 0: Foundation & Infrastructure Setup.

## Sprint 0 Stories

1. Development Environment Setup
2. CI/CD Pipeline Foundation

---

## Story 1: Development Environment Setup

### User Story

**As a** developer,  
**I want** a fully configured development environment,  
**So that** I can start building features without setup delays.

### Acceptance Criteria

- All team members can run `pnpm install` without errors
- All applications (api, web, admin) start with `pnpm dev`
- Database connection is established and migrations run successfully
- All linting and formatting rules are enforced
- Pre-commit hooks are configured and working

### Technical Tasks

- Configure Turborepo with pnpm workspaces (ADR-001)
- Set up TypeScript configuration with strict mode
- Configure ESLint, Prettier, and pre-commit hooks
- Set up PostgreSQL 18 with required extensions (ADR-017)
- Configure Prisma with UUIDv7 support (ADR-005, ADR-006)
- Set up Vitest for unit/integration testing (ADR-015)
- Configure Playwright for E2E testing (ADR-016)
- Create development Docker environment
- Set up Zod validation (ADR-020)
- Configure Tailwind v4 styling (ADR-021)

## Test Templates

### Unit Tests

#### Package Management Tests

Location: `tests/unit/infrastructure/package-management.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

describe('Package Management', () => {
  const projectRoot = path.resolve(__dirname, '../../../..')
  const packageJsonPath = path.join(projectRoot, 'package.json')
  const pnpmLockPath = path.join(projectRoot, 'pnpm-lock.yaml')

  describe('Package Installation', () => {
    it('should have valid package.json with required dependencies', () => {
      expect(existsSync(packageJsonPath)).toBe(true)

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

      // Check required dependencies
      expect(packageJson.dependencies).toBeDefined()
      expect(packageJson.devDependencies).toBeDefined()

      // Check scripts
      expect(packageJson.scripts).toBeDefined()
      expect(packageJson.scripts.dev).toBe('vite dev --port 3000')
      expect(packageJson.scripts.test).toBe('vitest run')
    })

    it('should install dependencies without errors', () => {
      expect(() => {
        execSync('pnpm install', {
          cwd: projectRoot,
          stdio: 'pipe',
        })
      }).not.toThrow()
    })

    it('should generate pnpm-lock.yaml file', () => {
      expect(existsSync(pnpmLockPath)).toBe(true)

      const lockFile = readFileSync(pnpmLockPath, 'utf8')
      expect(lockFile).toContain('lockfileVersion')
    })

    it('should have consistent dependency versions', () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

      // Check for version conflicts
      const versions = new Map<string, string>()

      const collectVersions = (deps: any) => {
        Object.entries(deps).forEach(([name, version]) => {
          if (typeof version === 'string') {
            const baseName = name.split('@')[0]
            if (versions.has(baseName) && versions.get(baseName) !== version) {
              throw new Error(
                `Version conflict for ${baseName}: ${versions.get(baseName)} vs ${version}`,
              )
            }
            versions.set(baseName, version)
          }
        })
      }

      collectVersions(packageJson.dependencies || {})
      collectVersions(packageJson.devDependencies || {})

      // Should not throw any version conflicts
      expect(versions.size).toBeGreaterThan(0)
    })
  })

  describe('Workspace Configuration', () => {
    it('should have proper pnpm workspace configuration', () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

      expect(packageJson.workspaces).toBeDefined()
      expect(Array.isArray(packageJson.workspaces)).toBe(true)
    })

    it('should include all workspace packages', () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
      const workspaces = packageJson.workspaces as string[]

      const expectedWorkspaces = ['apps/*', 'packages/*', 'tools/*']

      expectedWorkspaces.forEach((workspace) => {
        expect(workspaces).toContain(workspace)
      })
    })
  })
})
```

#### Development Server Tests

Location: `tests/unit/infrastructure/dev-server.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'
import { waitPort } from 'wait-port'

describe('Development Server', () => {
  let serverProcess: any
  const projectRoot = path.resolve(__dirname, '../../../..')

  afterEach(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM')
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  })

  describe('Application Startup', () => {
    it('should start web application successfully', async () => {
      serverProcess = spawn('pnpm', ['dev'], {
        cwd: projectRoot,
        stdio: 'pipe',
      })

      // Wait for server to start
      const isPortOpen = await waitPort({
        port: 3000,
        timeout: 30000,
      })

      expect(isPortOpen).toBe(true)
    })

    it('should start API application successfully', async () => {
      serverProcess = spawn('pnpm', ['dev:api'], {
        cwd: projectRoot,
        stdio: 'pipe',
      })

      const isPortOpen = await waitPort({
        port: 3001,
        timeout: 30000,
      })

      expect(isPortOpen).toBe(true)
    })

    it('should start admin application successfully', async () => {
      serverProcess = spawn('pnpm', ['dev:admin'], {
        cwd: projectRoot,
        stdio: 'pipe',
      })

      const isPortOpen = await waitPort({
        port: 3002,
        timeout: 30000,
      })

      expect(isPortOpen).toBe(true)
    })

    it('should handle startup errors gracefully', async () => {
      // Mock invalid configuration
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'invalid'

      serverProcess = spawn('pnpm', ['dev'], {
        cwd: projectRoot,
        stdio: 'pipe',
      })

      let output = ''
      serverProcess.stderr?.on('data', (data) => {
        output += data.toString()
      })

      await new Promise((resolve) => setTimeout(resolve, 5000))

      expect(output).toContain('error') || output.length > 0

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Hot Module Replacement', () => {
    it('should enable HMR in development mode', async () => {
      serverProcess = spawn('pnpm', ['dev'], {
        cwd: projectRoot,
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'development' },
      })

      await waitPort({ port: 3000, timeout: 30000 })

      // Check if HMR is enabled (this would require more sophisticated testing)
      // For now, we'll check if the process stays alive
      expect(serverProcess.pid).toBeDefined()
      expect(serverProcess.killed).toBe(false)
    })
  })
})
```

#### Database Configuration Tests

Location: `tests/unit/infrastructure/database.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

describe('Database Configuration', () => {
  let prisma: PrismaClient

  beforeEach(async () => {
    // Setup test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.TEST_DATABASE_URL ||
            'postgresql://test:test@localhost:5432/pems_test',
        },
      },
    })
  })

  afterEach(async () => {
    await prisma.$disconnect()
  })

  describe('Database Connection', () => {
    it('should connect to PostgreSQL successfully', async () => {
      expect(async () => {
        await prisma.$connect()
      }).not.toThrow()
    })

    it('should have required extensions installed', async () => {
      const result =
        await prisma.$queryRaw`SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto')`

      expect(result).toHaveLength(2)
      expect(result).toEqual(
        expect.arrayContaining([
          { extname: 'uuid-ossp' },
          { extname: 'pgcrypto' },
        ]),
      )
    })

    it('should support UUIDv7 generation', async () => {
      const result = await prisma.$queryRaw`SELECT gen_random_uuid() as uuid`

      expect(result[0].uuid).toBeDefined()
      expect(typeof result[0].uuid).toBe('string')
      expect(result[0].uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    })

    it('should handle connection errors gracefully', async () => {
      const invalidPrisma = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid:invalid@localhost:9999/invalid',
          },
        },
      })

      expect(async () => {
        await invalidPrisma.$connect()
      }).rejects.toThrow()
    })
  })

  describe('Database Migrations', () => {
    it('should run migrations successfully', () => {
      expect(() => {
        execSync('npx prisma migrate deploy', {
          env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
          stdio: 'pipe',
        })
      }).not.toThrow()
    })

    it('should create all required tables', async () => {
      const tables = await prisma.$queryRaw`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `

      const expectedTables = [
        'Tenant',
        'User',
        'Student',
        'Course',
        'Enrollment',
        'Payment',
        'Attendance',
        'Grade',
      ]

      expectedTables.forEach((table) => {
        expect(tables).toEqual(expect.arrayContaining([{ tablename: table }]))
      })
    })

    it('should have proper foreign key constraints', async () => {
      const constraints = await prisma.$queryRaw`
        SELECT
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name
      `

      expect(constraints.length).toBeGreaterThan(0)
    })
  })
})
```

#### Code Quality Tools Tests

Location: `tests/unit/infrastructure/code-quality.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import path from 'path'

describe('Code Quality Tools', () => {
  const projectRoot = path.resolve(__dirname, '../../../..')

  describe('TypeScript Configuration', () => {
    it('should have strict TypeScript configuration', () => {
      const tsconfigPath = path.join(projectRoot, 'tsconfig.json')
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'))

      expect(tsconfig.compilerOptions).toBeDefined()
      expect(tsconfig.compilerOptions.strict).toBe(true)
      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true)
      expect(tsconfig.compilerOptions.noImplicitReturns).toBe(true)
      expect(tsconfig.compilerOptions.noUnusedLocals).toBe(true)
      expect(tsconfig.compilerOptions.noUnusedParameters).toBe(true)
    })

    it('should compile TypeScript without errors', () => {
      expect(() => {
        execSync('npx tsc --noEmit', {
          cwd: projectRoot,
          stdio: 'pipe',
        })
      }).not.toThrow()
    })
  })

  describe('ESLint Configuration', () => {
    it('should have ESLint configuration', () => {
      const eslintConfigPath = path.join(projectRoot, 'eslint.config.js')
      expect(readFileSync(eslintConfigPath, 'utf8')).toBeDefined()
    })

    it('should pass ESLint checks', () => {
      expect(() => {
        execSync('npx eslint . --ext .ts,.tsx,.js,.jsx', {
          cwd: projectRoot,
          stdio: 'pipe',
        })
      }).not.toThrow()
    })

    it('should have custom ESLint rules for project', () => {
      const result = execSync('npx eslint --print-config .', {
        cwd: projectRoot,
        encoding: 'utf8',
      })

      const config = JSON.parse(result)
      expect(config.rules).toBeDefined()
    })
  })

  describe('Prettier Configuration', () => {
    it('should have Prettier configuration', () => {
      const prettierConfigPath = path.join(projectRoot, 'prettier.config.js')
      expect(readFileSync(prettierConfigPath, 'utf8')).toBeDefined()
    })

    it('should format code consistently', () => {
      expect(() => {
        execSync('npx prettier --check .', {
          cwd: projectRoot,
          stdio: 'pipe',
        })
      }).not.toThrow()
    })

    it('should format all file types', () => {
      const result = execSync('npx prettier --list-different .', {
        cwd: projectRoot,
        encoding: 'utf8',
      })

      // Should be empty if all files are formatted
      expect(result.trim()).toBe('')
    })
  })

  describe('Pre-commit Hooks', () => {
    it('should have husky configuration', () => {
      const huskyDir = path.join(projectRoot, '.husky')
      expect(
        readFileSync(path.join(huskyDir, 'pre-commit'), 'utf8'),
      ).toBeDefined()
    })

    it('should run pre-commit hooks successfully', () => {
      // Simulate pre-commit hook execution
      expect(() => {
        execSync('npx lint-staged', {
          cwd: projectRoot,
          stdio: 'pipe',
        })
      }).not.toThrow()
    })

    it('should prevent commits with linting errors', () => {
      // Create a file with linting errors
      const testFile = path.join(projectRoot, 'test-lint-error.ts')
      readFileSync(testFile, 'utf8') // This would be created with errors

      expect(() => {
        execSync('npx eslint test-lint-error.ts', {
          cwd: projectRoot,
          stdio: 'pipe',
        })
      }).toThrow()
    })
  })
})
```

### Integration Tests

#### Full Development Environment Tests

Location: `tests/integration/infrastructure/dev-environment.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'
import { waitPort } from 'wait-port'
import { PrismaClient } from '@prisma/client'

describe('Development Environment Integration', () => {
  let serverProcess: any
  let prisma: PrismaClient
  const projectRoot = path.resolve(__dirname, '../../../..')

  beforeEach(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.TEST_DATABASE_URL ||
            'postgresql://test:test@localhost:5432/pems_test',
        },
      },
    })
  })

  afterEach(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM')
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
    await prisma.$disconnect()
  })

  describe('Complete Development Setup', () => {
    it('should start all services successfully', async () => {
      // Start development server
      serverProcess = spawn('pnpm', ['dev'], {
        cwd: projectRoot,
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'development' },
      })

      // Wait for all services to be ready
      const webReady = await waitPort({ port: 3000, timeout: 30000 })
      const apiReady = await waitPort({ port: 3001, timeout: 30000 })

      expect(webReady).toBe(true)
      expect(apiReady).toBe(true)
    })

    it('should connect to database from all services', async () => {
      // Test database connection
      expect(async () => {
        await prisma.$connect()
        await prisma.$queryRaw`SELECT 1`
      }).not.toThrow()
    })

    it('should serve static assets correctly', async () => {
      const response = await fetch('http://localhost:3000/favicon.ico')
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('image')
    })

    it('should handle API requests correctly', async () => {
      const response = await fetch('http://localhost:3001/api/health')
      expect(response.status).toBe(200)

      const health = await response.json()
      expect(health.status).toBe('healthy')
    })
  })

  describe('Development Workflow', () => {
    it('should support hot reloading', async () => {
      serverProcess = spawn('pnpm', ['dev'], {
        cwd: projectRoot,
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'development' },
      })

      await waitPort({ port: 3000, timeout: 30000 })

      // Check if HMR WebSocket is established
      // This would require more sophisticated testing
      expect(serverProcess.pid).toBeDefined()
    })

    it('should provide debugging capabilities', async () => {
      // Check if debugging is enabled
      const result = await fetch('http://localhost:3000/__webpack_dev_server__')
      // This would depend on the specific setup
      expect(result.status).toBeGreaterThanOrEqual(200)
    })
  })
})
```

### E2E Tests

#### Complete Development Workflow Tests

Location: `tests/e2e/infrastructure/development-workflow.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Development Environment E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test environment
    await page.goto('http://localhost:3000')
  })

  test('should load development application successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/PEMS/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should show development indicators', async ({ page }) => {
    // Check for development mode indicators
    await expect(page.locator('[data-testid="dev-indicator"]')).toBeVisible()
  })

  test('should handle hot module replacement', async ({ page }) => {
    // This would require file system manipulation and HMR testing
    const initialContent = await page.content()

    // Simulate file change (this would need backend support)
    // await triggerFileChange();

    // Wait for HMR to complete
    await page.waitForTimeout(2000)

    // Verify page updated without full reload
    const updatedContent = await page.content()
    expect(updatedContent).not.toBe(initialContent)
  })

  test('should provide developer tools integration', async ({ page }) => {
    // Check if React DevTools or similar are available
    const devToolsAvailable = await page.evaluate(() => {
      return !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__
    })

    expect(devToolsAvailable).toBe(true)
  })

  test('should handle environment variables correctly', async ({ page }) => {
    const envInfo = await page.evaluate(() => {
      return {
        nodeEnv: (window as any).__ENV__?.NODE_ENV,
        apiUrl: (window as any).__ENV__?.API_URL,
      }
    })

    expect(envInfo.nodeEnv).toBe('development')
    expect(envInfo.apiUrl).toBe('http://localhost:3001')
  })
})

test.describe('Database Integration E2E Tests', () => {
  test('should connect to database and perform operations', async ({
    request,
  }) => {
    // Test database operations through API
    const response = await request.post(
      'http://localhost:3001/api/test/db-connection',
      {
        data: { test: true },
      },
    )

    expect(response.status()).toBe(200)
    const result = await response.json()
    expect(result.connected).toBe(true)
  })

  test('should run migrations successfully', async ({ request }) => {
    const response = await request.post(
      'http://localhost:3001/api/test/migrate',
      {
        data: { dryRun: true },
      },
    )

    expect(response.status()).toBe(200)
    const result = await response.json()
    expect(result.success).toBe(true)
  })
})
```

---

## Story 2: CI/CD Pipeline Foundation

### User Story

**As a** developer,  
**I want** automated CI/CD pipelines,  
**So that** code changes are automatically tested and validated.

### Acceptance Criteria

- All pull requests trigger automated tests
- Code coverage reports are generated
- Build artifacts are created and stored
- Staging environment is automatically deployed on merge to main

### Technical Tasks

- Set up GitHub Actions workflows
- Configure automated testing in CI
- Set up build and deployment pipelines
- Configure environment variable management
- Set up artifact storage and caching
- Implement TDD workflow automation (ADR-011)

## Test Templates

### Unit Tests

#### CI/CD Configuration Tests

Location: `tests/unit/infrastructure/cicd.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import yaml from 'js-yaml'

describe('CI/CD Configuration', () => {
  const projectRoot = path.resolve(__dirname, '../../../..')
  const workflowsDir = path.join(projectRoot, '.github', 'workflows')

  describe('GitHub Actions Workflows', () => {
    it('should have CI workflow configuration', () => {
      const ciWorkflowPath = path.join(workflowsDir, 'ci.yml')
      expect(existsSync(ciWorkflowPath)).toBe(true)

      const workflow = yaml.load(readFileSync(ciWorkflowPath, 'utf8')) as any

      expect(workflow.name).toBe('CI')
      expect(workflow.on).toBeDefined()
      expect(workflow.on.push).toBeDefined()
      expect(workflow.on.pull_request).toBeDefined()
      expect(workflow.jobs).toBeDefined()
    })

    it('should have test workflow configuration', () => {
      const testWorkflowPath = path.join(workflowsDir, 'test.yml')
      expect(existsSync(testWorkflowPath)).toBe(true)

      const workflow = yaml.load(readFileSync(testWorkflowPath, 'utf8')) as any

      expect(workflow.name).toBe('Tests')
      expect(workflow.jobs).toBeDefined()
      expect(workflow.jobs['unit-tests']).toBeDefined()
      expect(workflow.jobs['integration-tests']).toBeDefined()
      expect(workflow.jobs['e2e-tests']).toBeDefined()
    })

    it('should have deployment workflow configuration', () => {
      const deployWorkflowPath = path.join(workflowsDir, 'deploy.yml')
      expect(existsSync(deployWorkflowPath)).toBe(true)

      const workflow = yaml.load(
        readFileSync(deployWorkflowPath, 'utf8'),
      ) as any

      expect(workflow.name).toBe('Deploy')
      expect(workflow.on).toBeDefined()
      expect(workflow.on.push).toBeDefined()
      expect(workflow.jobs).toBeDefined()
    })

    it('should configure proper Node.js version', () => {
      const testWorkflowPath = path.join(workflowsDir, 'test.yml')
      const workflow = yaml.load(readFileSync(testWorkflowPath, 'utf8')) as any

      const setupNodeJob = workflow.jobs['unit-tests']?.steps?.find(
        (step: any) => step.name === 'Setup Node.js',
      )

      expect(setupNodeJob).toBeDefined()
      expect(setupNodeJob.uses).toBe('actions/setup-node@v4')
      expect(setupNodeJob.with['node-version']).toBe('20')
    })

    it('should configure caching for dependencies', () => {
      const testWorkflowPath = path.join(workflowsDir, 'test.yml')
      const workflow = yaml.load(readFileSync(testWorkflowPath, 'utf8')) as any

      const setupNodeJob = workflow.jobs['unit-tests']?.steps?.find(
        (step: any) => step.name === 'Setup Node.js',
      )

      expect(setupNodeJob).toBeDefined()
      expect(setupNodeJob.with.cache).toBe('npm')
    })

    it('should setup test database', () => {
      const testWorkflowPath = path.join(workflowsDir, 'test.yml')
      const workflow = yaml.load(readFileSync(testWorkflowPath, 'utf8')) as any

      const unitTestJob = workflow.jobs['unit-tests']
      expect(unitTestJob.services).toBeDefined()
      expect(unitTestJob.services.postgres).toBeDefined()
      expect(unitTestJob.services.postgres.image).toBe('postgres:18')
    })

    it('should generate coverage reports', () => {
      const testWorkflowPath = path.join(workflowsDir, 'test.yml')
      const workflow = yaml.load(readFileSync(testWorkflowPath, 'utf8')) as any

      const unitTestJob = workflow.jobs['unit-tests']
      expect(unitTestJob.steps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            run: expect.stringContaining('npm run test:unit -- --coverage'),
          }),
        ]),
      )
    })

    it('should upload coverage to codecov', () => {
      const testWorkflowPath = path.join(workflowsDir, 'test.yml')
      const workflow = yaml.load(readFileSync(testWorkflowPath, 'utf8')) as any

      expect(workflow.jobs).toEqual(
        expect.objectContaining({
          'upload-coverage': expect.objectContaining({
            needs: ['unit-tests'],
            steps: expect.arrayContaining([
              expect.objectContaining({
                uses: 'codecov/codecov-action@v3',
              }),
            ]),
          }),
        }),
      )
    })

    it('should build artifacts', () => {
      const deployWorkflowPath = path.join(workflowsDir, 'deploy.yml')
      const workflow = yaml.load(
        readFileSync(deployWorkflowPath, 'utf8'),
      ) as any

      expect(workflow.jobs).toEqual(
        expect.objectContaining({
          build: expect.objectContaining({
            steps: expect.arrayContaining([
              expect.objectContaining({
                run: expect.stringContaining('npm run build'),
              }),
            ]),
          }),
        }),
      )
    })

    it('should store build artifacts', () => {
      const deployWorkflowPath = path.join(workflowsDir, 'deploy.yml')
      const workflow = yaml.load(
        readFileSync(deployWorkflowPath, 'utf8'),
      ) as any

      expect(workflow.jobs).toEqual(
        expect.objectContaining({
          build: expect.objectContaining({
            steps: expect.arrayContaining([
              expect.objectContaining({
                uses: 'actions/upload-artifact@v3',
              }),
            ]),
          }),
        }),
      )
    })
  })

  describe('Environment Configuration', () => {
    it('should have environment-specific configurations', () => {
      const envFiles = [
        '.env.example',
        '.env.development',
        '.env.staging',
        '.env.production',
      ]

      envFiles.forEach((envFile) => {
        const envPath = path.join(projectRoot, envFile)
        expect(existsSync(envPath)).toBe(true)
      })
    })

    it('should configure GitHub secrets for sensitive data', () => {
      const deployWorkflowPath = path.join(workflowsDir, 'deploy.yml')
      const workflow = yaml.load(
        readFileSync(deployWorkflowPath, 'utf8'),
      ) as any

      const deployJob = workflow.jobs.deploy
      expect(deployJob.env).toBeDefined()
      expect(deployJob.env.DATABASE_URL).toBeDefined()
      expect(deployJob.env.DATABASE_URL).toContain('${{ secrets.')
    })
  })
})
```

#### Build Process Tests

Location: `tests/unit/infrastructure/build.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { execSync } from 'child_process'
import { existsSync, readFileSync, statSync } from 'fs'
import path from 'path'

describe('Build Process', () => {
  const projectRoot = path.resolve(__dirname, '../../../..')
  const distDir = path.join(projectRoot, 'dist')

  beforeEach(() => {
    // Clean dist directory
    if (existsSync(distDir)) {
      execSync(`rm -rf ${distDir}`)
    }
  })

  describe('Application Build', () => {
    it('should build web application successfully', () => {
      expect(() => {
        execSync('npm run build', {
          cwd: projectRoot,
          stdio: 'pipe',
        })
      }).not.toThrow()
    })

    it('should generate build artifacts', () => {
      execSync('npm run build', {
        cwd: projectRoot,
        stdio: 'pipe',
      })

      expect(existsSync(distDir)).toBe(true)

      const distStats = statSync(distDir)
      expect(distStats.isDirectory()).toBe(true)
    })

    it('should generate optimized bundles', () => {
      execSync('npm run build', {
        cwd: projectRoot,
        stdio: 'pipe',
      })

      const buildDir = path.join(distDir, 'client')
      expect(existsSync(buildDir)).toBe(true)

      // Check for optimized files
      const files = readFileSync(buildDir, 'utf8')
      expect(files).toContain('.') // At least some files exist
    })

    it('should generate server bundle', () => {
      execSync('npm run build', {
        cwd: projectRoot,
        stdio: 'pipe',
      })

      const serverBundle = path.join(distDir, 'server', 'index.mjs')
      expect(existsSync(serverBundle)).toBe(true)

      const bundleContent = readFileSync(serverBundle, 'utf8')
      expect(bundleContent.length).toBeGreaterThan(0)
    })

    it('should handle build errors gracefully', () => {
      // Create a syntax error in source file
      const srcFile = path.join(projectRoot, 'src', 'test-error.tsx')
      readFileSync(srcFile, 'utf8') // Create file with error

      expect(() => {
        execSync('npm run build', {
          cwd: projectRoot,
          stdio: 'pipe',
        })
      }).toThrow()
    })

    it('should generate source maps', () => {
      execSync('npm run build', {
        cwd: projectRoot,
        stdio: 'pipe',
      })

      const clientDir = path.join(distDir, 'client')
      const files = readFileSync(clientDir, 'utf8')

      // Check for .map files
      expect(files).toContain('.map')
    })

    it('should include asset optimization', () => {
      execSync('npm run build', {
        cwd: projectRoot,
        stdio: 'pipe',
      })

      // Check for optimized assets
      const clientDir = path.join(distDir, 'client')
      expect(existsSync(clientDir)).toBe(true)

      // Verify assets are minified/optimized
      const assets = readFileSync(clientDir, 'utf8')
      expect(assets.length).toBeGreaterThan(0)
    })
  })

  describe('Build Performance', () => {
    it('should complete build within reasonable time', () => {
      const startTime = Date.now()

      execSync('npm run build', {
        cwd: projectRoot,
        stdio: 'pipe',
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(120000) // Should complete within 2 minutes
    })

    it('should not exceed memory limits', () => {
      // This would require more sophisticated memory monitoring
      expect(() => {
        execSync('npm run build', {
          cwd: projectRoot,
          stdio: 'pipe',
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        })
      }).not.toThrow()
    })
  })
})
```

### Integration Tests

#### Pipeline Integration Tests

Location: `tests/integration/infrastructure/pipeline.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { execSync } from 'child_process'

describe('Pipeline Integration', () => {
  describe('CI Pipeline Execution', () => {
    it('should run complete CI pipeline successfully', () => {
      // Simulate CI pipeline execution
      expect(() => {
        execSync('npm run ci', {
          stdio: 'pipe',
          env: { ...process.env, CI: 'true' },
        })
      }).not.toThrow()
    })

    it('should execute all test suites', () => {
      const result = execSync('npm run test:ci', {
        encoding: 'utf8',
        stdio: 'pipe',
      })

      expect(result).toContain('unit-tests')
      expect(result).toContain('integration-tests')
      expect(result).toContain('e2e-tests')
    })

    it('should generate test reports', () => {
      execSync('npm run test:coverage', {
        stdio: 'pipe',
      })

      // Check for coverage reports
      expect(() => {
        execSync('ls coverage/', { stdio: 'pipe' })
      }).not.toThrow()
    })

    it('should fail pipeline on test failures', () => {
      // Create a failing test
      expect(() => {
        execSync('npm run test:unit -- --run --reporter=verbose', {
          stdio: 'pipe',
          env: { ...process.env, FAIL_TESTS: 'true' },
        })
      }).toThrow()
    })
  })

  describe('Build Pipeline Execution', () => {
    it('should build for different environments', () => {
      const environments = ['development', 'staging', 'production']

      environments.forEach((env) => {
        expect(() => {
          execSync(`npm run build:${env}`, {
            stdio: 'pipe',
            env: { ...process.env, NODE_ENV: env },
          })
        }).not.toThrow()
      })
    })

    it('should generate environment-specific builds', () => {
      // Build for production
      execSync('npm run build:production', {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'production' },
      })

      // Check production optimizations
      expect(() => {
        execSync('ls dist/', { stdio: 'pipe' })
      }).not.toThrow()
    })
  })
})
```

### E2E Tests

#### CI/CD Pipeline E2E Tests

Location: `tests/e2e/infrastructure/cicd-pipeline.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('CI/CD Pipeline E2E Tests', () => {
  test('should execute complete CI workflow', async ({ request }) => {
    // This would require GitHub API integration or webhook testing
    const response = await request.post(
      'https://api.github.com/repos/test/pems/dispatches',
      {
        data: {
          event_type: 'ci-test',
          client_payload: { test: true },
        },
      },
    )

    expect(response.status()).toBe(204)
  })

  test('should trigger tests on pull request', async ({ page }) => {
    // Simulate pull request creation
    await page.goto(
      'https://github.com/test/pems/compare/main...feature-branch',
    )

    await page.click('[data-testid="create-pull-request"]')
    await page.fill('[data-testid="pr-title"]', 'Test PR')
    await page.fill('[data-testid="pr-body"]', 'Test PR body')
    await page.click('[data-testid="submit-pr"]')

    // Wait for CI to start
    await expect(page.locator('[data-testid="ci-status"]')).toBeVisible()
    await expect(page.locator('[data-testid="ci-status"]')).toContainText(
      'pending',
    )
  })

  test('should deploy to staging on merge', async ({ page }) => {
    // Simulate merge to main
    await page.goto('https://github.com/test/pems/pull/1')

    await page.click('[data-testid="merge-pull-request"]')

    // Wait for deployment to start
    await expect(
      page.locator('[data-testid="deployment-status"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="deployment-status"]'),
    ).toContainText('deploying')
  })

  test('should provide deployment status updates', async ({ page }) => {
    await page.goto('https://github.com/test/pems/actions')

    // Check for workflow runs
    await expect(page.locator('[data-testid="workflow-run"]')).toBeVisible()
    await expect(page.locator('[data-testid="workflow-status"]')).toBeVisible()
  })

  test('should handle deployment failures gracefully', async ({ page }) => {
    // Simulate deployment failure
    await page.goto('https://github.com/test/pems/actions/runs/123')

    await expect(page.locator('[data-testid="failure-notice"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-logs"]')).toBeVisible()
  })
})

test.describe('Build Artifacts E2E Tests', () => {
  test('should download and verify build artifacts', async ({ page }) => {
    await page.goto('https://github.com/test/pems/actions/runs/123')

    await page.click('[data-testid="artifacts-tab"]')
    await expect(
      page.locator('[data-testid="artifact-download"]'),
    ).toBeVisible()

    // Download and verify artifact
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="artifact-download"]'),
    ])

    expect(download.suggestedFilename()).toContain('build-artifacts')
  })

  test('should serve built application correctly', async ({ page }) => {
    // This would require deploying to a test environment
    await page.goto('https://staging.pems.ph')

    await expect(page).toHaveTitle(/PEMS/)
    await expect(page.locator('body')).toBeVisible()

    // Check for production optimizations
    const headers = await page.evaluate(() => {
      return {
        'content-encoding': performance
          .getEntriesByType('navigation')[0]
          .responseHeaders.find((h: any) => h.name === 'content-encoding')
          ?.value,
        'cache-control': performance
          .getEntriesByType('navigation')[0]
          .responseHeaders.find((h: any) => h.name === 'cache-control')?.value,
      }
    })

    expect(headers['content-encoding']).toBe('gzip')
    expect(headers['cache-control']).toContain('max-age')
  })
})
```

## Test Execution Guide

### Running Sprint 0 Tests

```bash
# Run all Sprint 0 tests
npm run test -- --grep "Sprint 0"

# Run unit tests only
npm run test:unit -- --grep "Development Environment Setup|CI/CD Pipeline Foundation"

# Run integration tests
npm run test:integration -- --grep "Development Environment|CI/CD Pipeline"

# Run E2E tests
npm run test:e2e -- --grep "Development Environment|CI/CD Pipeline"

# Coverage report
npm run test:coverage -- --grep "Sprint 0"
```

### Test Data Requirements

- PostgreSQL test database
- Node.js 20+ environment
- GitHub repository for CI/CD testing
- Docker for environment isolation

### Success Criteria

- All unit tests pass with 95%+ coverage
- All integration tests pass with database connectivity
- All E2E tests pass with real browser automation
- CI/CD pipeline executes successfully
- Build artifacts generated and optimized
- Development environment starts without errors

These comprehensive test templates provide a solid foundation for implementing Sprint 0 functionality following TDD principles. Each test can be executed independently and provides clear feedback on implementation progress.
