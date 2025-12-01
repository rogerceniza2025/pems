# Testing Configuration and TDD Workflow Automation

This document contains comprehensive testing configuration and TDD workflow automation for PEMS project, implementing ADR-011 and meeting PO-2 acceptance criteria.

## Testing Infrastructure Overview

### Current Testing Stack
- **Unit Tests**: Vitest with jsdom environment
- **Integration Tests**: Vitest with node environment
- **E2E Tests**: Playwright with multiple browsers
- **Visual Tests**: Storybook with test-runner
- **Coverage**: Vitest coverage with v8 provider

### Testing Pyramid Strategy

```
    E2E Tests (Playwright)
        ↓ (Critical user journeys)
   Integration Tests (Vitest)
        ↓ (API & Database integration)
     Unit Tests (Vitest)
        ↓ (Business logic & utilities)
```

## Enhanced Vitest Configuration

### 1. Main Vitest Configuration

### File: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/global-setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/*.stories.*',
        'dist/',
        'coverage/',
        '**/*.d.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Per-module thresholds
        './modules/*/domain/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        './packages/infrastructure/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
      all: true,
      include: ['src/**/*.{js,ts,jsx,tsx}'],
    },
    
    // Test patterns
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/integration/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'tests/e2e/',
      '**/*.stories.*',
    ],
    
    // Test execution
    testTimeout: 10000,
    hookTimeout: 10000,
    isolate: true,
    threads: true,
    maxConcurrency: 4,
    
    // Reporting
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/unit.json',
      html: './test-results/unit.html',
    },
    
    // Watch mode
    watchExclude: ['node_modules/', 'dist/'],
    
    // Global configuration
    globals: true,
    passWithNoTests: false,
    logHeapUsage: true,
    isolate: true,
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
      '@pems/*': resolve(__dirname, './*'),
    },
  },
  
  // Define global constants
  define: {
    __TEST__: 'true',
    __VERSION__: JSON.stringify(process.env.npm_package_version),
  },
})
```

### 2. Unit Test Configuration

### File: `vitest.unit.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.unit.setup.ts'],
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/*.stories.*',
        'dist/',
        'coverage/',
        '**/*.d.ts',
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    
    include: [
      'tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'tests/integration/',
      'tests/e2e/',
    ],
    
    testTimeout: 5000,
    hookTimeout: 5000,
    isolate: true,
    threads: true,
    maxConcurrency: 6,
    
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results/unit.json',
    },
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
      '@pems/*': resolve(__dirname, './*'),
    },
  },
})
```

### 3. Integration Test Configuration

### File: `vitest.integration.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.integration.setup.ts'],
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/*.stories.*',
        'dist/',
        'coverage/',
        '**/*.d.ts',
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
    },
    
    include: [
      'tests/integration/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'tests/unit/',
      'tests/e2e/',
    ],
    
    testTimeout: 30000,
    hookTimeout: 30000,
    isolate: false,
    threads: false,
    maxConcurrency: 2,
    
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results/integration.json',
    },
    
    // Global test environment
    globals: true,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/pems_test',
      REDIS_URL: process.env.TEST_REDIS_URL || 'redis://localhost:6379',
    },
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
      '@pems/*': resolve(__dirname, './*'),
    },
  },
})
```

## Enhanced Playwright Configuration

### File: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'path'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporting configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['junit', { outputFile: 'playwright-results.xml' }],
    ['line'], // For GitHub Actions integration
    process.env.CI ? ['github'] : ['list'],
  ],
  
  // Global test configuration
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: process.env.CI ? 'only-on-failure' : 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    
    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Browser configuration
    ignoreHTTPSErrors: true,
    bypassCSP: true,
    
    // Viewport
    viewport: { width: 1280, height: 720 },
    
    // User agent
    userAgent: 'PEMS-E2E-Test',
    
    // Locale and timezone
    locale: 'en-PH', // Philippines locale
    timezoneId: 'Asia/Manila',
    
    // Color scheme
    colorScheme: 'light',
    
    // Permissions
    permissions: ['geolocation', 'notifications'],
  },
  
  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    // Tablet testing
    {
      name: 'iPad Safari',
      use: { ...devices['iPad Pro'] },
    },
  ],
  
  // Web server for local testing
  webServer: process.env.CI ? undefined : {
    command: 'pnpm run dev -- --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  
  // Global setup and teardown
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  
  // Output directory
  outputDir: './test-results/e2e',
  
  // Test metadata
  metadata: {
    'Test Environment': process.env.NODE_ENV || 'test',
    'Browser Version': 'latest',
    'Test Suite': 'E2E',
  },
})
```

## Test Setup Files

### 1. Global Test Setup

### File: `tests/setup/global-setup.ts`

```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Global test configuration
global.console = {
  ...console,
  // Uncomment to ignore specific console logs during tests
  // log: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
}

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.TZ = 'Asia/Manila'

// Mock fetch if needed
global.fetch = vi.fn()

// Mock Web APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Setup global test utilities
import { setupTestDatabase } from '@tests/helpers/database'
import { createTestFactories } from '@tests/helpers/factories'

beforeAll(async () => {
  await setupTestDatabase()
  createTestFactories()
})

afterAll(async () => {
  // Cleanup test database
  await setupTestDatabase().cleanup()
})

// Global test timeout
vi.setConfig({ testTimeout: 10000 })
```

### 2. Unit Test Setup

### File: `tests/setup/vitest.unit.setup.ts`

```typescript
import { vi } from 'vitest'

// Mock all external dependencies for unit tests
vi.mock('axios')
vi.mock('@prisma/client')
vi.mock('better-auth')
vi.mock('redis')

// Mock file system operations
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
}))

// Mock environment
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.ENCRYPTION_KEY = 'test-encryption-key'

// Mock date for consistent testing
const mockDate = new Date('2024-01-01T00:00:00.000Z')
vi.spyOn(Date, 'now').mockReturnValue(mockDate.getTime())
vi.spyOn(global, 'Date').mockImplementation(() => mockDate)

// Mock UUID generation
vi.mock('uuid', () => ({
  v7: () => 'test-uuid-v7',
  v4: () => 'test-uuid-v4',
}))

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Global test utilities
global.createMockUser = () => ({
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
  isActive: true,
})

global.createMockTenant = () => ({
  id: 'test-tenant-id',
  name: 'Test School',
  code: 'TEST-SCHOOL',
  type: 'ELEMENTARY',
})
```

### 3. Integration Test Setup

### File: `tests/setup/vitest.integration.setup.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import Redis from 'ioredis'

// Setup test database
const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/pems_test'
const prisma = new PrismaClient({
  datasources: {
    db: { url: testDbUrl },
  },
})

// Setup test Redis
const testRedisUrl = process.env.TEST_REDIS_URL || 'redis://localhost:6379'
const redis = new Redis(testRedisUrl)

beforeAll(async () => {
  // Reset database
  try {
    execSync('npx prisma migrate reset --force --skip-seed', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe',
    })

    // Run migrations
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe',
    })
  } catch (error) {
    console.error('Database setup failed:', error)
    throw error
  }

  // Clear Redis
  await redis.flushall()
})

afterAll(async () => {
  await prisma.$disconnect()
  await redis.disconnect()
})

beforeEach(async () => {
  // Clean up test data between tests
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()
  await prisma.student.deleteMany()
  await redis.flushall()
})

// Export for use in tests
export { prisma, redis }
```

## TDD Workflow Automation (ADR-011)

### 1. Pre-commit Hooks

### File: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Run TDD validation
echo "📝 Running unit tests for changed files..."
pnpm test:unit -- --changed --since=main --run

echo "🔧 Running linting..."
pnpm lint

echo "🎯 Running type checking..."
pnpm type-check

echo "🎨 Running style linting..."
pnpm lint:styles

echo "✅ Pre-commit checks passed!"
```

### File: `.husky/pre-push`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🚀 Running pre-push checks..."

# Run full test suite
echo "🧪 Running full test suite..."
pnpm test

echo "🏗️ Running build validation..."
pnpm build

echo "✅ Pre-push checks passed!"
```

### 2. TDD Watch Scripts

### File: `scripts/tdd-watch.sh`

```bash
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[TDD]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[TDD]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[TDD]${NC} $1"
}

print_error() {
    echo -e "${RED}[TDD]${NC} $1"
}

# Check if we're in a TDD cycle
TDD_MODE=${1:-"watch"}

print_status "Starting TDD workflow in $TDD_MODE mode..."

case $TDD_MODE in
    "watch")
        print_status "Starting TDD watch mode..."
        pnpm test:unit -- --watch --coverage
        ;;
    "domain")
        print_status "Running domain layer tests..."
        pnpm test:unit tests/unit/domain/** -- --watch
        ;;
    "integration")
        print_status "Running integration tests..."
        pnpm test:integration -- --watch
        ;;
    "e2e")
        print_status "Running E2E tests..."
        pnpm test:e2e
        ;;
    "coverage")
        print_status "Running tests with coverage..."
        pnpm test:coverage
        ;;
    "changed")
        print_status "Running tests for changed files..."
        pnpm test:unit -- --changed --since=main
        ;;
    *)
        print_error "Unknown TDD mode: $TDD_MODE"
        echo "Available modes: watch, domain, integration, e2e, coverage, changed"
        exit 1
        ;;
esac
```

### 3. TDD Validation Script

### File: `scripts/tdd-validate.sh`

```bash
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[TDD-VALIDATE]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[TDD-VALIDATE]${NC} $1"
}

print_error() {
    echo -e "${RED}[TDD-VALIDATE]${NC} $1"
}

# Validate TDD workflow
print_status "Validating TDD workflow..."

# Check if tests exist
if [ ! -d "tests" ]; then
    print_error "Tests directory not found!"
    exit 1
fi

# Check test coverage
print_status "Checking test coverage..."
pnpm test:coverage -- --reporter=json > coverage-report.json

# Extract coverage percentage
COVERAGE=$(cat coverage-report.json | jq '.total.lines.pct' 2>/dev/null || echo "0")

if [ "${COVERAGE%.*}" -lt 80 ]; then
    print_warning "Coverage is below 80%: ${COVERAGE}%"
    print_warning "Consider adding more tests before committing"
else
    print_status "Coverage is good: ${COVERAGE}%"
fi

# Check for failing tests
print_status "Running tests to check for failures..."
if ! pnpm test -- --run; then
    print_error "Tests are failing! Fix failing tests before continuing."
    exit 1
fi

print_status "✅ TDD validation passed!"
```

## Test Helpers and Utilities

### 1. Database Helper

### File: `tests/helpers/database.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

let prisma: PrismaClient

export async function setupTestDatabase() {
  const testDbUrl =
    process.env.TEST_DATABASE_URL ||
    'postgresql://test:test@localhost:5432/pems_test'

  prisma = new PrismaClient({
    datasources: {
      db: { url: testDbUrl },
    },
    log: process.env.CI ? [] : ['query', 'info', 'warn', 'error'],
  })

  // Reset database
  try {
    execSync('npx prisma migrate reset --force --skip-seed', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe',
    })

    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe',
    })
  } catch (error) {
    console.error('Database setup failed:', error)
    throw error
  }

  return {
    prisma,
    cleanup: async () => {
      await prisma.$disconnect()
    },
    reset: async () => {
      // Clean all tables
      const tablenames = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`
      
      for (const { tablename } of tablenames) {
        if (tablename !== '_prisma_migrations') {
          try {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`)
          } catch (error) {
            console.log(`Note: ${tablename} doesn't exist, skipping`)
          }
        }
      }
    },
  }
}

export function getTestPrisma() {
  if (!prisma) {
    throw new Error(
      'Test database not initialized. Call setupTestDatabase() first.',
    )
  }
  return prisma
}

// Transaction helper for test isolation
export async function withTransaction<T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  const tx = getTestPrisma()
  
  return await tx.$transaction(async (transaction) => {
    return await callback(transaction as PrismaClient)
  })
}
```

### 2. Test Factories

### File: `tests/helpers/factories.ts`

```typescript
import { PrismaClient, Tenant, User, Student } from '@prisma/client'
import { v7 as uuidv7 } from 'uuid'

let prisma: PrismaClient

export function createTestFactories(prismaClient?: PrismaClient) {
  prisma = prismaClient || require('./database').getTestPrisma()
}

export const TenantFactory = {
  create: async (overrides: Partial<Tenant> = {}) => {
    return prisma.tenant.create({
      data: {
        id: uuidv7(),
        name: 'Test School',
        code: 'TEST-SCHOOL',
        type: 'ELEMENTARY',
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test@school.edu.ph',
        isActive: true,
        ...overrides,
      },
    })
  },

  createMany: async (count: number, overrides: Partial<Tenant> = {}) => {
    const tenants = []
    for (let i = 0; i < count; i++) {
      tenants.push({
        id: uuidv7(),
        name: `Test School ${i}`,
        code: `TEST-SCHOOL-${i}`,
        type: 'ELEMENTARY',
        address: `${i} Test Street`,
        phone: `+63912345678${i}`,
        email: `test${i}@school.edu.ph`,
        isActive: true,
        ...overrides,
      })
    }
    return prisma.tenant.createMany({ data: tenants })
  },
}

export const UserFactory = {
  create: async (overrides: Partial<User> = {}) => {
    const tenant = await TenantFactory.create()

    return prisma.user.create({
      data: {
        id: uuidv7(),
        tenantId: tenant.id,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
        passwordHash: 'hashed-password',
        ...overrides,
      },
    })
  },

  createWithTenant: async (tenantId: string, overrides: Partial<User> = {}) => {
    return prisma.user.create({
      data: {
        id: uuidv7(),
        tenantId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
        passwordHash: 'hashed-password',
        ...overrides,
      },
    })
  },
}

export const StudentFactory = {
  create: async (overrides: Partial<Student> = {}) => {
    const tenant = await TenantFactory.create()

    return prisma.student.create({
      data: {
        id: uuidv7(),
        tenantId: tenant.id,
        studentNumber: '2024-0001',
        firstName: 'Test',
        lastName: 'Student',
        birthDate: new Date('2000-01-01'),
        gender: 'MALE',
        isActive: true,
        ...overrides,
      },
    })
  },
}
```

### 3. Auth Helper

### File: `tests/helpers/auth.ts`

```typescript
import jwt from 'jsonwebtoken'
import { User } from '@prisma/client'

export interface TestUser {
  id: string
  tenantId: string
  email: string
  role: string
}

export function createTestToken(user: TestUser): string {
  return jwt.sign(
    {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' },
  )
}

export function createTestHeaders(user: TestUser) {
  const token = createTestToken(user)
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': user.tenantId,
  }
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: 'test-user-id',
    tenantId: 'test-tenant-id',
    email: 'test@example.com',
    role: 'ADMIN',
    ...overrides,
  }
}

export function createAdminUser(): TestUser {
  return createTestUser({ role: 'ADMIN' })
}

export function createTeacherUser(): TestUser {
  return createTestUser({ role: 'TEACHER' })
}

export function createStudentUser(): TestUser {
  return createTestUser({ role: 'STUDENT' })
}
```

## Package.json Test Scripts

### Updated Test Scripts for `package.json`

```json
{
  "scripts": {
    "test": "pnpm run --recursive test",
    "test:unit": "vitest run --config vitest.unit.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:visual": "test-storybook",
    "test:visual:ci": "test-storybook --ci",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:debug": "vitest --inspect-brk",
    "test:changed": "vitest run --changed --since=main",
    "test:domain": "vitest run tests/unit/domain/** -- --coverage",
    "test:tdd": "./scripts/tdd-watch.sh",
    "test:validate": "./scripts/tdd-validate.sh",
    "test:report": "vitest -- --reporter=verbose --reporter=json",
    "test:clean": "rm -rf coverage test-results playwright-report",
    
    "pre-commit": "lint-staged",
    "pre-push": "./scripts/tdd-validate.sh",
    
    "coverage:upload": "codecov",
    "coverage:serve": "npx serve coverage",
    "coverage:compare": "npx nyc compare --coverage-dir coverage"
  }
}
```

## TDD Workflow Integration

### 1. VS Code Tasks

### File: `.vscode/tasks.json`

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "TDD: Watch Mode",
      "type": "shell",
      "command": "pnpm",
      "args": ["test:tdd", "watch"],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      }
    },
    {
      "label": "TDD: Domain Tests",
      "type": "shell",
      "command": "pnpm",
      "args": ["test:tdd", "domain"],
      "group": "test"
    },
    {
      "label": "TDD: Integration Tests",
      "type": "shell",
      "command": "pnpm",
      "args": ["test:tdd", "integration"],
      "group": "test"
    },
    {
      "label": "TDD: Validate",
      "type": "shell",
      "command": "pnpm",
      "args": ["test:validate"],
      "group": "test"
    },
    {
      "label": "TDD: Coverage",
      "type": "shell",
      "command": "pnpm",
      "args": ["test:tdd", "coverage"],
      "group": "test"
    }
  ]
}
```

### 2. VS Code Launch Configuration

### File: `.vscode/launch.json`

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Unit Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/vitest",
      "args": ["run", "--config", "vitest.unit.config.ts", "--inspect-brk"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug Integration Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/vitest",
      "args": ["run", "--config", "vitest.integration.config.ts", "--inspect-brk"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

This comprehensive testing configuration provides a solid foundation for implementing TDD workflow automation (ADR-011) while meeting all testing requirements for PO-2 acceptance criteria.