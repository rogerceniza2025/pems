# Testing Infrastructure Setup Guide

## Overview

This document provides the complete setup instructions for the testing infrastructure required for the PEMS project, including all necessary dependencies, configurations, and file structures.

## Package.json Updates

### Required Dependencies

Add the following dependencies to `package.json`:

```json
{
  "name": "pems",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev --port 3000",
    "build": "vite build",
    "serve": "vite preview",
    "test": "vitest run",
    "test:unit": "vitest run --config vitest.unit.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:debug": "vitest --inspect-brk",
    "lint": "eslint",
    "format": "prettier",
    "check": "prettier --write . && eslint --fix",
    "start": "node .output/server/index.mjs"
  },
  "dependencies": {
    "@fontsource/inter": "^5.1.1",
    "@kobalte/core": "^0.13.11",
    "@tailwindcss/vite": "^4.0.6",
    "@tanstack/router-plugin": "^1.133.21",
    "@tanstack/solid-router": "^1.133.20",
    "@tanstack/solid-router-devtools": "^1.133.20",
    "@tanstack/solid-start": "^1.132.25",
    "axios": "^1.13.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "dotenv": "^17.2.3",
    "lucide-solid": "^0.544.0",
    "nitro": "latest",
    "solid-js": "^1.9.9",
    "tailwind-merge": "^3.0.2",
    "tailwindcss": "^4.0.6",
    "tailwindcss-animate": "^1.0.7",
    "vite": "^7.1.7",
    "vite-tsconfig-paths": "^5.1.4"
  },
  "devDependencies": {
    "@tanstack/devtools-vite": "^0.3.11",
    "@tanstack/eslint-config": "^0.3.2",
    "@playwright/test": "^1.40.0",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/solid": "^0.8.0",
    "@types/node": "^20.10.0",
    "@types/supertest": "^2.0.16",
    "@vitest/coverage-v8": "^1.0.4",
    "@vitest/ui": "^1.0.4",
    "eslint": "^8.55.0",
    "jsdom": "^23.0.1",
    "prettier": "^3.5.3",
    "supertest": "^6.3.3",
    "typescript": "^5.7.2",
    "vite": "^7.1.7",
    "vite-plugin-solid": "^2.11.10",
    "vitest": "^1.0.4"
  }
}
```

## Configuration Files

### Vitest Configuration (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
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
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/integration/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: ['node_modules/', 'dist/', 'tests/e2e/'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
})
```

### Vitest Unit Test Configuration (vitest.unit.config.ts)

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.unit.setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules/', 'dist/', 'tests/integration/', 'tests/e2e/'],
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
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
})
```

### Vitest Integration Test Configuration (vitest.integration.config.ts)

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.integration.setup.ts'],
    include: ['tests/integration/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules/', 'dist/', 'tests/unit/', 'tests/e2e/'],
    testTimeout: 30000,
    hookTimeout: 30000,
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
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
})
```

### Playwright Configuration (playwright.config.ts)

```typescript
import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'path'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
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
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

## Test Setup Files

### Vitest Setup (tests/setup/vitest.setup.ts)

```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Global test setup
global.console = {
  ...console,
  // Uncomment to ignore specific console logs during tests
  // log: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
}

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/pems_test'

// Mock fetch if needed
global.fetch = vi.fn()

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
```

### Vitest Unit Setup (tests/setup/vitest.unit.setup.ts)

```typescript
import { vi } from 'vitest'

// Mock all external dependencies for unit tests
vi.mock('axios')
vi.mock('@prisma/client')
vi.mock('better-auth')

// Mock file system operations
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
}))

// Mock environment
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.ENCRYPTION_KEY = 'test-encryption-key'
```

### Vitest Integration Setup (tests/setup/vitest.integration.setup.ts)

```typescript
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

// Setup test database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.TEST_DATABASE_URL ||
        'postgresql://test:test@localhost:5432/pems_test',
    },
  },
})

beforeAll(async () => {
  // Reset database
  execSync('npx prisma migrate reset --force --skip-seed', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
  })

  // Run migrations
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(async () => {
  // Clean up test data between tests
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()
  await prisma.student.deleteMany()
})

export { prisma }
```

## Test Directory Structure

Create the following directory structure:

```
tests/
├── unit/
│   ├── domain/
│   │   ├── tenant/
│   │   │   ├── Tenant.entity.test.ts
│   │   │   └── TenantService.test.ts
│   │   ├── user/
│   │   │   ├── User.entity.test.ts
│   │   │   └── UserService.test.ts
│   │   ├── student/
│   │   ├── cashiering/
│   │   ├── enrollment/
│   │   ├── attendance/
│   │   ├── grading/
│   │   └── reporting/
│   ├── application/
│   │   ├── auth/
│   │   ├── navigation/
│   │   └── services/
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── api/
│   │   └── external/
│   └── shared/
│       ├── utils/
│       └── types/
├── integration/
│   ├── api/
│   │   ├── auth/
│   │   ├── tenant/
│   │   ├── student/
│   │   └── cashiering/
│   ├── database/
│   │   ├── repositories/
│   │   └── migrations/
│   └── external/
│       ├── payment-gateways/
│       └── email/
├── e2e/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   ├── registration.spec.ts
│   │   └── password-reset.spec.ts
│   ├── tenant/
│   │   ├── creation.spec.ts
│   │   └── switching.spec.ts
│   ├── student/
│   │   ├── registration.spec.ts
│   │   ├── profile.spec.ts
│   │   └── guardians.spec.ts
│   ├── cashiering/
│   │   ├── payment.spec.ts
│   │   ├── receipts.spec.ts
│   │   └── sessions.spec.ts
│   ├── enrollment/
│   │   ├── courses.spec.ts
│   │   ├── enrollment.spec.ts
│   │   └── reports.spec.ts
│   ├── attendance/
│   │   ├── manual.spec.ts
│   │   ├── rfid.spec.ts
│   │   └── reports.spec.ts
│   ├── grading/
│   │   ├── components.spec.ts
│   │   ├── recording.spec.ts
│   │   └── report-cards.spec.ts
│   └── reporting/
│       ├── dashboard.spec.ts
│       ├── cross-module.spec.ts
│       └── compliance.spec.ts
├── fixtures/
│   ├── users.json
│   ├── tenants.json
│   ├── students.json
│   ├── courses.json
│   └── test-data.sql
├── helpers/
│   ├── database.ts
│   ├── auth.ts
│   ├── factories.ts
│   ├── mocks.ts
│   └── utils.ts
└── setup/
    ├── vitest.setup.ts
    ├── vitest.unit.setup.ts
    ├── vitest.integration.setup.ts
    └── playwright.setup.ts
```

## Test Helpers and Utilities

### Database Helper (tests/helpers/database.ts)

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
```

### Test Factories (tests/helpers/factories.ts)

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
        ...overrides,
      },
    })
  },
}
```

### Auth Helper (tests/helpers/auth.ts)

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
```

## GitHub Actions Workflow

### Test Workflow (.github/workflows/test.yml)

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:18
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

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup test database
        run: |
          npx prisma migrate deploy
          npx prisma db seed
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/pems_test

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests

    services:
      postgres:
        image: postgres:18
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

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup test database
        run: |
          npx prisma migrate deploy
          npx prisma db seed
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/pems_test

      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Installation Steps

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Setup test database**:

   ```bash
   createdb pems_test
   npx prisma migrate deploy
   npx prisma db seed
   ```

3. **Run tests**:

   ```bash
   # Unit tests
   npm run test:unit

   # Integration tests
   npm run test:integration

   # E2E tests
   npm run test:e2e

   # All tests
   npm test

   # Watch mode
   npm run test:watch

   # Coverage
   npm run test:coverage
   ```

## Environment Variables

Create a `.env.test` file:

```env
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/pems_test
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/pems_test
JWT_SECRET=test-jwt-secret
ENCRYPTION_KEY=test-encryption-key
```

## Next Steps

Once this infrastructure is set up:

1. Implement the Jira backlog script tests
2. Create test templates for each sprint story
3. Set up continuous integration
4. Configure test reporting and coverage monitoring
5. Establish test data management practices

This comprehensive testing infrastructure provides a solid foundation for implementing TDD practices across all modules of the PEMS system.
