# Testing Implementation Guide

## Overview

This document provides comprehensive testing strategy for the authentication system implementation in the PEMS system.

## 1. Testing Structure

### Directory Structure

```
tests/
├── unit/
│   ├── domain/
│   │   ├── user.test.ts
│   │   ├── email.test.ts
│   │   └── password.test.ts
│   ├── infrastructure/
│   │   ├── repositories/
│   │   │   ├── user-repository.test.ts
│   │   │   ├── user-profile-repository.test.ts
│   │   │   ├── user-auth-provider-repository.test.ts
│   │   │   └── user-role-repository.test.ts
│   │   └── services/
│   │       ├── mfa-service.test.ts
│   │       ├── password-reset-service.test.ts
│   │       ├── magic-link-service.test.ts
│   │       └── email-service.test.ts
│   ├── application/
│   │   ├── user-service.test.ts
│   │   └── auth-service.test.ts
│   └── api/
│       ├── auth-routes.test.ts
│       └── user-routes.test.ts
├── integration/
│   ├── auth-flow.test.ts
│   ├── mfa-flow.test.ts
│   └── password-reset-flow.test.ts
├── e2e/
│   ├── login.spec.ts
│   ├── registration.spec.ts
│   ├── mfa-setup.spec.ts
│   └── password-reset.spec.ts
└── fixtures/
    ├── users.json
    ├── tenants.json
    └── auth-data.json
```

## 2. Unit Testing Examples

### Domain Tests

#### File: `tests/unit/domain/email.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { Email, InvalidEmailError } from '@pems/user-management'

describe('Email Value Object', () => {
  describe('constructor', () => {
    it('should create email with valid address', () => {
      const email = new Email('test@example.com')
      expect(email.getValue()).toBe('test@example.com')
    })

    it('should normalize email to lowercase', () => {
      const email = new Email('Test@EXAMPLE.COM')
      expect(email.getValue()).toBe('test@example.com')
    })

    it('should throw error for invalid email', () => {
      expect(() => new Email('invalid-email')).toThrow(InvalidEmailError)
    })

    it('should throw error for empty email', () => {
      expect(() => new Email('')).toThrow(InvalidEmailError)
    })

    it('should throw error for null email', () => {
      expect(() => new Email(null as any)).toThrow(InvalidEmailError)
    })
  })

  describe('equals', () => {
    it('should return true for equal emails', () => {
      const email1 = new Email('test@example.com')
      const email2 = new Email('test@example.com')
      expect(email1.equals(email2)).toBe(true)
    })

    it('should return false for different emails', () => {
      const email1 = new Email('test1@example.com')
      const email2 = new Email('test2@example.com')
      expect(email1.equals(email2)).toBe(false)
    })
  })

  describe('toString', () => {
    it('should return string representation', () => {
      const email = new Email('test@example.com')
      expect(email.toString()).toBe('test@example.com')
    })
  })
})
```

#### File: `tests/unit/domain/password.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { Password, InvalidPasswordError } from '@pems/user-management'

describe('Password Value Object', () => {
  describe('constructor', () => {
    it('should create password with valid strong password', () => {
      const password = new Password('StrongPass123!')
      expect(password.getValue()).toBe('StrongPass123!')
    })

    it('should throw error for short password', () => {
      expect(() => new Password('short')).toThrow(InvalidPasswordError)
    })

    it('should throw error for password without uppercase', () => {
      expect(() => new Password('lowercase123!')).toThrow(InvalidPasswordError)
    })

    it('should throw error for password without lowercase', () => {
      expect(() => new Password('UPPERCASE123!')).toThrow(InvalidPasswordError)
    })

    it('should throw error for password without numbers', () => {
      expect(() => new Password('NoNumbers!')).toThrow(InvalidPasswordError)
    })

    it('should throw error for password without special chars', () => {
      expect(() => new Password('NoSpecialChars123')).toThrow(
        InvalidPasswordError,
      )
    })
  })

  describe('hash', () => {
    it('should hash password successfully', async () => {
      const password = new Password('TestPass123!')
      const hash = await password.hash()
      expect(hash).toBeDefined()
      expect(hash).not.toBe('TestPass123!')
      expect(hash.length).toBeGreaterThan(50) // bcrypt hashes are long
    })
  })

  describe('verify', () => {
    it('should verify correct password', async () => {
      const password = new Password('TestPass123!')
      const hash = await password.hash()
      const isValid = await Password.verify('TestPass123!', hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = new Password('TestPass123!')
      const hash = await password.hash()
      const isValid = await Password.verify('WrongPass123!', hash)
      expect(isValid).toBe(false)
    })
  })

  describe('getStrength', () => {
    it('should return weak for simple password', () => {
      const password = new Password('simple')
      const strength = password.getStrength()
      expect(strength.strength).toBe('weak')
      expect(strength.score).toBeLessThan(3)
    })

    it('should return strong for complex password', () => {
      const password = new Password('ComplexPass123!@#')
      const strength = password.getStrength()
      expect(strength.strength).toBe('strong')
      expect(strength.score).toBeGreaterThan(4)
    })
  })
})
```

### Repository Tests

#### File: `tests/unit/infrastructure/repositories/user-repository.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaUserRepository } from '@pems/user-management'
import { PrismaClient } from '@pems/database'

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      user: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      $queryRaw: vi.fn(),
    }
    repository = new PrismaUserRepository(mockPrisma)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        tenantId: 'tenant-123',
        phone: '+1234567890',
      }

      const expectedUser = {
        id: 'user-123',
        tenant_id: userData.tenantId,
        email: userData.email.toLowerCase(),
        phone: userData.phone,
        is_active: true,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockPrisma.user.create.mockResolvedValue(expectedUser)

      const result = await repository.create(userData)

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant_id: userData.tenantId,
          email: userData.email.toLowerCase(),
          phone: userData.phone,
          is_active: true,
          is_system_admin: false,
          metadata: {},
        }),
      })
      expect(result).toEqual({
        id: expectedUser.id,
        tenantId: expectedUser.tenant_id,
        email: expectedUser.email,
        phone: expectedUser.phone,
        isActive: expectedUser.is_active,
        isSystemAdmin: expectedUser.is_system_admin,
        metadata: expectedUser.metadata,
        createdAt: expectedUser.created_at,
        updatedAt: expectedUser.updated_at,
      })
    })
  })

  describe('findByEmail', () => {
    it('should find user by email and tenant', async () => {
      const email = 'test@example.com'
      const tenantId = 'tenant-123'
      const expectedUser = {
        id: 'user-123',
        tenant_id: tenantId,
        email: email,
      }

      mockPrisma.user.findUnique.mockResolvedValue(expectedUser)

      const result = await repository.findByEmail(email, tenantId)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          tenant_id_email: {
            tenant_id: tenantId,
            email: email.toLowerCase(),
          },
        },
      })
      expect(result).toEqual({
        id: expectedUser.id,
        tenantId: expectedUser.tenant_id,
        email: expectedUser.email,
        // ... other mapped fields
      })
    })

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await repository.findByEmail(
        'nonexistent@example.com',
        'tenant-123',
      )

      expect(result).toBeNull()
    })
  })

  describe('existsByEmail', () => {
    it('should return true when user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' })

      const result = await repository.existsByEmail(
        'test@example.com',
        'tenant-123',
      )

      expect(result).toBe(true)
    })

    it('should return false when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await repository.existsByEmail(
        'nonexistent@example.com',
        'tenant-123',
      )

      expect(result).toBe(false)
    })
  })
})
```

### Service Tests

#### File: `tests/unit/infrastructure/services/mfa-service.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MfaService } from '@pems/auth'

describe('MfaService', () => {
  let mfaService: MfaService

  beforeEach(() => {
    mfaService = new MfaService()
  })

  describe('generateSecret', () => {
    it('should generate a secret', () => {
      const secret = mfaService.generateSecret()

      expect(secret).toBeDefined()
      expect(secret).toMatch(/^[A-Z2-7]+$/) // Base32 format
      expect(secret.length).toBeGreaterThan(16)
    })

    it('should generate unique secrets', () => {
      const secret1 = mfaService.generateSecret()
      const secret2 = mfaService.generateSecret()

      expect(secret1).not.toBe(secret2)
    })
  })

  describe('verifyToken', () => {
    it('should verify correct token', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      const token = '123456'

      // Mock authenticator.verify to return true
      vi.mock('otplib', () => ({
        authenticator: {
          verify: vi.fn().mockReturnValue(true),
        },
      }))

      const result = mfaService.verifyToken(secret, token)

      expect(result).toBe(true)
    })

    it('should reject incorrect token', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      const token = '654321'

      vi.mock('otplib', () => ({
        authenticator: {
          verify: vi.fn().mockReturnValue(false),
        },
      }))

      const result = mfaService.verifyToken(secret, token)

      expect(result).toBe(false)
    })
  })

  describe('generateBackupCodes', () => {
    it('should generate correct number of backup codes', () => {
      const codes = mfaService.generateBackupCodes()

      expect(codes).toHaveLength(10) // Default backup code count
    })

    it('should generate unique codes', () => {
      const codes = mfaService.generateBackupCodes()
      const uniqueCodes = new Set(codes)

      expect(uniqueCodes.size).toBe(codes.length)
    })

    it('should generate codes with correct format', () => {
      const codes = mfaService.generateBackupCodes()

      codes.forEach((code) => {
        expect(code).toMatch(/^[A-F0-9]+$/) // Alphanumeric uppercase
        expect(code.length).toBe(8) // Default backup code length
      })
    })
  })
})
```

## 3. Integration Testing

### File: `tests/integration/auth-flow.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupTestServer, cleanupTestServer } from '../helpers/test-server'
import { createTestClient } from '../helpers/test-client'

describe('Authentication Flow Integration Tests', () => {
  let server: any
  let client: any

  beforeEach(async () => {
    server = await setupTestServer()
    client = createTestClient(server.url)
  })

  afterEach(async () => {
    await cleanupTestServer(server)
  })

  describe('Registration Flow', () => {
    it('should register user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 'test-tenant',
      }

      const response = await client.post('/api/auth/register', userData)

      expect(response.status).toBe(201)
      expect(response.data.success).toBe(true)
      expect(response.data.data.user.email).toBe(userData.email)
    })

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'StrongPass123!',
        tenantId: 'test-tenant',
      }

      // First registration succeeds
      await client.post('/api/auth/register', userData)

      // Second registration fails
      const response = await client.post('/api/auth/register', userData)

      expect(response.status).toBe(400)
      expect(response.data.success).toBe(false)
      expect(response.data.error).toContain('already exists')
    })
  })

  describe('Login Flow', () => {
    it('should login with valid credentials', async () => {
      // First register a user
      const userData = {
        email: 'loginuser@example.com',
        password: 'StrongPass123!',
        tenantId: 'test-tenant',
      }
      await client.post('/api/auth/register', userData)

      // Then login
      const loginData = {
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
      }
      const response = await client.post('/api/auth/login', loginData)

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.user.email).toBe(userData.email)
      expect(response.headers['set-cookie']).toContain('session=')
    })

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'loginuser@example.com',
        password: 'wrongpassword',
        tenantId: 'test-tenant',
      }

      const response = await client.post('/api/auth/login', loginData)

      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      expect(response.data.error).toContain('Invalid email or password')
    })
  })

  describe('MFA Flow', () => {
    it('should setup MFA successfully', async () => {
      // Register and login user first
      const userData = {
        email: 'mfauser@example.com',
        password: 'StrongPass123!',
        tenantId: 'test-tenant',
      }
      await client.post('/api/auth/register', userData)

      const loginResponse = await client.post('/api/auth/login', {
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
      })

      // Setup MFA
      const setupResponse = await client.post(
        '/api/auth/mfa/setup',
        {
          userId: loginResponse.data.data.user.id,
        },
        {
          headers: {
            Authorization: `Bearer ${loginResponse.data.data.session}`,
          },
        },
      )

      expect(setupResponse.status).toBe(200)
      expect(setupResponse.data.success).toBe(true)
      expect(setupResponse.data.data.secret).toBeDefined()
      expect(setupResponse.data.data.qrCode).toBeDefined()
      expect(setupResponse.data.data.backupCodes).toHaveLength(10)
    })
  })
})
```

## 4. E2E Testing with Playwright

### File: `tests/e2e/login.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { setupTestApp } from '../helpers/test-app'

test.describe('Authentication E2E Tests', () => {
  let page: any

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    await setupTestApp(page)
  })

  test('should login successfully', async () => {
    await page.goto('/login')

    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'TestPass123!')
    await page.fill('[data-testid="tenant-input"]', 'test-tenant')

    // Submit form
    await page.click('[data-testid="login-button"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')

    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
  })

  test('should show error for invalid credentials', async () => {
    await page.goto('/login')

    // Fill login form with wrong password
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'WrongPassword!')
    await page.fill('[data-testid="tenant-input"]', 'test-tenant')

    // Submit form
    await page.click('[data-testid="login-button"]')

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Invalid email or password',
    )

    // Should stay on login page
    await expect(page).toHaveURL('/login')
  })

  test('should handle MFA verification', async () => {
    // Setup user with MFA enabled
    await page.goto('/login')

    // Fill login form
    await page.fill('[data-testid="email-input"]', 'mfauser@example.com')
    await page.fill('[data-testid="password-input"]', 'TestPass123!')
    await page.fill('[data-testid="tenant-input"]', 'test-tenant')

    // Submit form
    await page.click('[data-testid="login-button"]')

    // Should show MFA verification form
    await expect(page.locator('[data-testid="mfa-verification"]')).toBeVisible()
    await expect(page.locator('[data-testid="mfa-code-input"]')).toBeVisible()

    // Fill MFA code
    await page.fill('[data-testid="mfa-code-input"]', '123456')

    // Submit MFA
    await page.click('[data-testid="mfa-verify-button"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
  })

  test('should handle password reset flow', async () => {
    await page.goto('/login')

    // Click forgot password
    await page.click('[data-testid="forgot-password-link"]')

    // Should show forgot password form
    await expect(page).toHaveURL('/forgot-password')
    await expect(
      page.locator('[data-testid="forgot-password-form"]'),
    ).toBeVisible()

    // Fill form
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="tenant-input"]', 'test-tenant')

    // Submit form
    await page.click('[data-testid="send-reset-link-button"]')

    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'reset link has been sent',
    )
  })
})
```

## 5. Test Configuration

### File: `vitest.unit.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup/unit-setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../..'),
    },
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    exclude: ['node_modules/', 'tests/', '**/*.d.ts', '**/*.config.*'],
    thresholds: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
})
```

### File: `vitest.integration.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup/integration-setup.ts'],
    timeout: 30000, // Longer timeout for integration tests
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../..'),
    },
  },
})
```

### File: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
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
  ],
  webServer: {
    command: 'npm run test:server',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
  },
})
```

## 6. Test Data and Fixtures

### File: `tests/fixtures/users.json`

```json
[
  {
    "id": "user-1",
    "email": "john.doe@example.com",
    "password": "StrongPass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "tenantId": "tenant-1",
    "isActive": true,
    "isSystemAdmin": false,
    "metadata": {},
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  },
  {
    "id": "user-2",
    "email": "jane.smith@example.com",
    "password": "AnotherStrong456!",
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+0987654321",
    "tenantId": "tenant-2",
    "isActive": true,
    "isSystemAdmin": false,
    "metadata": {},
    "createdAt": "2023-01-02T00:00:00Z",
    "updatedAt": "2023-01-02T00:00:00Z"
  }
]
```

### File: `tests/setup/integration-setup.ts`

```typescript
import { beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@pems/database'
import { execSync } from 'child_process'

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://test:test@localhost:5432/pems_test'

export const setupTestDatabase = async () => {
  // Create test database
  execSync(`createdb ${testDatabaseUrl}`, { stdio: 'inherit' })

  // Run migrations
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  })
}

export const cleanupTestDatabase = async () => {
  // Drop test database
  execSync(`dropdb ${testDatabaseUrl}`, { stdio: 'inherit' })
}

beforeAll(async () => {
  await setupTestDatabase()
})

afterAll(async () => {
  await cleanupTestDatabase()
})

// Export test client
export const testPrisma = new PrismaClient({
  datasources: {
    db: { url: testDatabaseUrl },
  },
})
```

## 7. Package.json Scripts

### File: `package.json` (Test Scripts)

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --config vitest.unit.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:server": "node tests/helpers/test-server.js",
    "test:cleanup": "node tests/helpers/cleanup-test-dbs.js"
  }
}
```

## 8. CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Tests
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_USER: test
          POSTGRES_DB: pems_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/pems_test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## 9. Testing Best Practices

### 1. Test Organization

- **Arrange, Act, Assert** pattern
- **Descriptive test names**
- **Independent tests** (no dependencies between tests)
- **Test one thing per test**

### 2. Mock Strategy

- **Mock external dependencies** (database, email, etc.)
- **Use consistent mock data**
- **Reset mocks between tests**
- **Verify mock calls**

### 3. Coverage Requirements

- **Domain layer**: 95% coverage
- **Infrastructure layer**: 90% coverage
- **Application layer**: 90% coverage
- **API layer**: 85% coverage

### 4. Performance Testing

- **Response time tests** for API endpoints
- **Load testing** for authentication flows
- **Database query optimization**
- **Memory usage monitoring**

### 5. Security Testing

- **Input validation** tests
- **SQL injection** tests
- **XSS prevention** tests
- **Rate limiting** tests
- **Authentication bypass** tests

## 10. Continuous Testing

### 1. Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm run test:unit --changed",
      "pre-push": "npm run test:coverage"
    }
  }
}
```

### 2. Test Monitoring

- **Test results dashboard**
- **Coverage tracking over time**
- **Flaky test identification**
- **Performance regression detection**

## Next Steps

1. Implement all tests following patterns above
2. Set up CI/CD pipeline
3. Configure test reporting and monitoring
4. Add performance and security testing
5. Document testing procedures
6. Train team on testing best practices
