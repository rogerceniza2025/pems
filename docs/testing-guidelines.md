# PEMS Testing Guidelines

## Overview

This document provides comprehensive testing guidelines and best practices for the Philippine Educational Management System (PEMS) project, following TDD principles and ensuring high-quality test coverage across all modules.

## Testing Philosophy

### TDD-First Development

Following ADR-011, we implement a strict Test-Driven Development workflow:

1. **RED Phase**: Write failing tests that define the desired behavior
2. **GREEN Phase**: Implement minimal code to make tests pass
3. **REFACTOR Phase**: Optimize code while maintaining test coverage

#### TDD Workflow

```mermaid
graph LR
    A[Write Failing Test] --> B[Run Test - RED]
    B --> C[Implement Minimal Code]
    C --> D[Run Test - GREEN]
    D --> E[Refactor Code]
    E --> F[Run Test - GREEN]
    F --> G[Add More Tests]
    G --> A
```

### Testing Pyramid

We follow a structured testing pyramid approach:

```
    E2E Tests (10%)
        ↓ Critical User Journeys
   Integration Tests (20%)
        ↓ Module Interactions
    Unit Tests (70%)
        ↓ Individual Components/Functions
```

## Test Organization Standards

### Directory Structure

```
tests/
├── unit/                    # Unit tests for individual components/functions
│   ├── domain/              # Domain layer tests
│   │   ├── tenant/
│   │   ├── user/
│   │   ├── student/
│   │   ├── cashiering/
│   │   ├── enrollment/
│   │   ├── attendance/
│   │   ├── grading/
│   │   └── reporting/
│   ├── application/          # Application service tests
│   │   ├── auth/
│   │   ├── navigation/
│   │   └── services/
│   ├── infrastructure/       # Infrastructure tests
│   │   ├── database/
│   │   ├── api/
│   │   └── external/
│   └── shared/             # Shared utility tests
│       ├── utils/
│       └── types/
├── integration/             # Integration tests for module interactions
│   ├── api/                # API endpoint tests
│   ├── database/            # Database integration tests
│   └── external/           # External service integration tests
├── e2e/                   # End-to-end tests for user workflows
│   ├── auth/               # Authentication workflows
│   ├── tenant/             # Tenant management workflows
│   ├── student/            # Student management workflows
│   ├── cashiering/         # Cashiering workflows
│   ├── enrollment/         # Enrollment workflows
│   ├── attendance/         # Attendance workflows
│   ├── grading/            # Grading workflows
│   └── reporting/         # Reporting workflows
├── fixtures/              # Test data and fixtures
│   ├── users.json
│   ├── tenants.json
│   ├── students.json
│   └── test-data.sql
└── helpers/               # Test utilities and helpers
    ├── database.ts
    ├── auth.ts
    ├── factories.ts
    ├── mocks.ts
    └── utils.ts
```

### File Naming Conventions

- **Unit Tests**: `*.test.ts` or `*.test.tsx`
- **Integration Tests**: `*.integration.test.ts`
- **E2E Tests**: `*.spec.ts`
- **Test Files**: Should be co-located with source files when possible
- **Test Helpers**: `*.helper.ts` or `*.utils.ts`

## Test Writing Standards

### Test Structure

#### Unit Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Component } from '@/path/to/component';

describe('Component', () => {
  let component: Component;

  beforeEach(() => {
    // Setup before each test
    component = new Component();
    // Mock dependencies
    vi.mock('@/dependency', () => ({
      // Mock implementation
    }));
  });

  afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks();
  });

  describe('Specific Feature', () => {
    it('should do X when Y', () => {
      // Arrange
      const input = 'test input';
      
      // Act
      const result = component.doSomething(input);
      
      // Assert
      expect(result).toBe('expected output');
    });

    it('should handle edge case Z', () => {
      // Test edge cases
      const edgeInput = 'edge case input';
      
      expect(() => {
        component.doSomething(edgeInput);
      }).toThrow('Expected error message');
    });
  });
});
```

#### Integration Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Service } from '@/path/to/service';
import { Repository } from '@/infrastructure/database/Repository';

describe('Service Integration', () => {
  let service: Service;
  let repository: Repository;

  beforeEach(async () => {
    // Setup test database
    repository = new Repository(testDatabase);
    service = new Service(repository);
    
    // Clean up test data
    await repository.clear();
  });

  afterEach(async () => {
    // Cleanup test data
    await repository.clear();
    await repository.disconnect();
  });

  it('should integrate with database correctly', async () => {
    // Create test data
    const testData = await repository.create({
      name: 'Test Data',
      value: 'test value'
    });

    // Test service integration
    const result = await service.processData(testData.id);

    expect(result).toBeDefined();
    expect(result.processedValue).toBe('expected value');
    
    // Verify database state
    const dbData = await repository.findById(testData.id);
    expect(dbData.processed).toBe(true);
  });
});
```

#### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('http://localhost:3000/login');
  });

  test('should complete user journey successfully', async ({ page }) => {
    // Login
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate through workflow
    await page.click('[data-testid="menu-item"]');
    await page.fill('[data-testid="form-field"]', 'test value');
    await page.click('[data-testid="submit-button"]');
    
    // Verify results
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="result-value"]')).toContainText('expected result');
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Trigger error condition
    await page.fill('[data-testid="email"]', 'invalid@example.com');
    await page.fill('[data-testid="password"]', 'wrong-password');
    await page.click('[data-testid="login-button"]');
    
    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
  });
});
```

## Test Data Management

### Factory Pattern

Use factory pattern for creating test data:

```typescript
// tests/helpers/factories.ts
import { v7 as uuidv7 } from 'uuid';
import { User, Tenant, Student } from '@prisma/client';

export class UserFactory {
  static create(overrides: Partial<User> = {}): User {
    return {
      id: uuidv7(),
      tenantId: 'test-tenant-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'STUDENT',
      isActive: true,
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, (_, index) => 
      UserFactory.create({
        ...overrides,
        email: `test${index}@example.com`,
        firstName: `Test${index}`
      })
    );
  }

  static withRole(role: string): UserFactory {
    return {
      create: (overrides: Partial<User> = {}) => 
        UserFactory.create({ ...overrides, role })
    };
  }
}
```

### Test Fixtures

Use fixtures for consistent test data:

```typescript
// tests/fixtures/users.json
{
  "admin": {
    "email": "admin@example.com",
    "password": "AdminPassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN"
  },
  "teacher": {
    "email": "teacher@example.com",
    "password": "TeacherPassword123!",
    "firstName": "Teacher",
    "lastName": "User",
    "role": "TEACHER"
  },
  "student": {
    "email": "student@example.com",
    "password": "StudentPassword123!",
    "firstName": "Student",
    "lastName": "User",
    "role": "STUDENT"
  }
}
```

## Mocking Standards

### Mocking Strategy

1. **Mock External Dependencies**: Always mock external APIs, databases, and services in unit tests
2. **Use Real Implementations**: Use real implementations in integration tests
3. **Mock Behavior, Not Data**: Mock behavior and responses, not just return static data
4. **Verify Mocks**: Always verify that mocks were called with correct parameters

### Mock Examples

```typescript
// Mocking API calls
vi.mock('@/infrastructure/api/Client', () => ({
  getUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn()
}));

// Mocking with implementation
vi.mock('@/infrastructure/database/Repository', () => ({
  findById: vi.fn((id: string) => 
    Promise.resolve({ id, name: `User ${id}` })
  ),
  save: vi.fn((user: User) => 
    Promise.resolve({ ...user, id: user.id || 'new-id' })
  )
}));

// Mocking with return values
const mockApi = vi.mocked('@/infrastructure/api/Client');
mockApi.getUser.mockResolvedValue({ id: '123', name: 'Test User' });
```

## Assertion Standards

### Expectation Patterns

```typescript
// Basic assertions
expect(result).toBeDefined();
expect(result).toBeNull();
expect(result).toBeTruthy();
expect(result).toBeFalsy();

// Value assertions
expect(result).toBe(expectedValue);
expect(result).toEqual(expectedObject);
expect(result).toMatchObject(expectedStructure);
expect(result).toMatch(expectedPattern);

// Array assertions
expect(array).toHaveLength(expectedLength);
expect(array).toContain(expectedItem);
expect(array).toEqual(expect.arrayContaining([expectedItem]));

// String assertions
expect(string).toContain(expectedSubstring);
expect(string).toMatch(expectedRegex);
expect(string).toStartWith(expectedPrefix);

// Error assertions
expect(() => riskyOperation()).toThrow();
expect(() => riskyOperation()).toThrow('Expected error message');
expect(() => riskyOperation()).toThrow(Error);
```

### Custom Matchers

```typescript
// tests/helpers/custom-matchers.ts
import { expect } from 'vitest';

expect.extend({
  toBeValidEmail(received: string) {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(received);
    return {
      message: () => `expected ${received} to be a valid email`,
      pass: isValid
    };
  },

  toBeValidUUID(received: string) {
    const isValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(received);
    return {
      message: () => `expected ${received} to be a valid UUID`,
      pass: isValid
    };
  },

  toBeWithinRange(received: number, min: number, max: number) {
    const isInRange = received >= min && received <= max;
    return {
      message: () => `expected ${received} to be within range ${min}-${max}`,
      pass: isInRange
    };
  }
});

// Usage in tests
expect(user.email).toBeValidEmail();
expect(user.id).toBeValidUUID();
expect(user.age).toBeWithinRange(18, 65);
```

## Test Coverage Requirements

### Coverage Targets

- **Unit Tests**: 95%+ line coverage for business logic
- **Integration Tests**: 90%+ coverage for API endpoints
- **E2E Tests**: 100% coverage for critical user journeys
- **Overall Coverage**: 85%+ combined coverage

### Coverage Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/*.stories.*',
        'dist/',
        'coverage/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Per-module thresholds
        './src/domain/tenant/**': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        './src/domain/user/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    }
  }
});
```

## Performance Testing Standards

### Response Time Expectations

- **API Endpoints**: < 200ms for simple operations, < 500ms for complex operations
- **Database Queries**: < 100ms for indexed queries, < 500ms for complex joins
- **Page Load**: < 2s for initial load, < 1s for navigation
- **Component Rendering**: < 100ms for simple components, < 500ms for complex components

### Performance Test Examples

```typescript
describe('Performance Tests', () => {
  it('should complete operation within time limit', async () => {
    const startTime = performance.now();
    
    await service.complexOperation();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(500); // Should complete within 500ms
  });

  it('should handle large datasets efficiently', async () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random()
    }));

    const startTime = performance.now();
    const result = await service.processLargeDataset(largeDataset);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2s
    expect(result).toHaveLength(10000);
  });
});
```

## Security Testing Standards

### Security Test Categories

1. **Input Validation**: Test for malicious inputs
2. **Authentication**: Test for unauthorized access
3. **Authorization**: Test for permission bypasses
4. **Data Exposure**: Test for information leakage
5. **Injection**: Test for SQL/NoSQL injection vulnerabilities

### Security Test Examples

```typescript
describe('Security Tests', () => {
  describe('Input Validation', () => {
    it('should reject SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      await expect(service.processInput(maliciousInput)).rejects.toThrow();
    });

    it('should sanitize HTML inputs', async () => {
      const xssInput = '<script>alert("xss")</script>';
      
      const result = await service.processInput(xssInput);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<script>');
    });
  });

  describe('Authentication Security', () => {
    it('should prevent brute force attacks', async () => {
      const user = await userService.findByEmail('user@example.com');
      
      // Simulate multiple failed attempts
      for (let i = 0; i < 10; i++) {
        await authService.login('user@example.com', `wrong${i}`);
      }
      
      // Verify account is locked
      const lockedUser = await userService.findByEmail('user@example.com');
      expect(lockedUser.isLocked).toBe(true);
    });

    it('should prevent session hijacking', async () => {
      const token = authService.generateToken(user);
      
      // Verify token has proper claims and expiration
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.exp).toBeLessThanOrEqual(Date.now() / 1000 + 3600); // 1 hour
      expect(decoded.iat).toBeGreaterThan(Date.now() / 1000 - 300); // Issued within last 5 minutes
    });
  });
});
```

## Accessibility Testing Standards

### WCAG 2.1 AA Compliance

1. **Keyboard Navigation**: All functionality accessible via keyboard
2. **Screen Reader Support**: Proper ARIA labels and semantic HTML
3. **Color Contrast**: Minimum 4.5:1 contrast ratio
4. **Focus Management**: Visible focus indicators and logical tab order
5. **Responsive Design**: Functional across all screen sizes

### Accessibility Test Examples

```typescript
test.describe('Accessibility Tests', () => {
  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test Enter key activation
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="active-element"]')).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    // Check for proper labels
    await expect(page.locator('[data-testid="email"]')).toHaveAttribute('aria-label', 'Email address');
    await expect(page.locator('[data-testid="password"]')).toHaveAttribute('aria-label', 'Password');
    await expect(page.locator('[data-testid="login-button"]')).toHaveAttribute('aria-label', 'Sign in to your account');
  });

  test('should maintain focus management', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // Check initial focus
    await expect(page.locator('body')).toBeFocused();
    
    // Test focus trap in modals
    await page.click('[data-testid="open-modal"]');
    await expect(page.locator('[data-testid="modal-input"]')).toBeFocused();
    
    // Test focus restoration
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="modal-trigger"]')).toBeFocused();
  });
});
```

## Test Data Privacy

### PII Protection

1. **No Real User Data**: Never use real personal information in tests
2. **Synthetic Data**: Use generated or anonymized test data
3. **Data Classification**: Mark test data as non-sensitive
4. **Cleanup**: Ensure test data is properly cleaned up

### Data Privacy Examples

```typescript
// Good: Using generated data
const testUser = UserFactory.create({
  email: 'test123@example.com',
  firstName: 'Test',
  lastName: 'User'
});

// Bad: Using real data
const realUser = {
  email: 'john.doe@realschool.edu.ph',
  firstName: 'John',
  lastName: 'Doe'
};
```

## Continuous Integration Testing

### CI Test Pipeline

1. **Unit Tests**: Run on every commit
2. **Integration Tests**: Run on pull requests
3. **E2E Tests**: Run on main branch updates
4. **Coverage Reports**: Generate and upload to coverage service
5. **Performance Tests**: Run on performance-critical changes

### CI Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

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
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
      - name: Install dependencies
        run: npm ci
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/pems_test

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
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
```

## Test Documentation Standards

### Test Documentation Requirements

1. **README Files**: Each test directory should have a README.md
2. **Test Descriptions**: Complex tests should have comments explaining purpose
3. **Setup Instructions**: Clear instructions for running tests locally
4. **Troubleshooting**: Common issues and solutions

### Test Documentation Template

```markdown
# Module Tests

## Overview
This directory contains tests for [module name] module.

## Running Tests

```bash
# Run all tests
npm run test -- --grep "[module name]"

# Run unit tests only
npm run test:unit -- --grep "[module name]"

# Run integration tests
npm run test:integration -- --grep "[module name]"

# Run E2E tests
npm run test:e2e -- --grep "[module name]"

# Run with coverage
npm run test:coverage -- --grep "[module name]"
```

## Test Structure

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test module interactions with real dependencies
- **E2E Tests**: Test complete user workflows in browser

## Test Data

Tests use factory-generated data to ensure consistency and avoid using real user information.

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure test database is running and accessible
2. **Port Conflicts**: Check if required ports are available
3. **Timeout Issues**: Increase test timeout for slow operations
4. **Mock Issues**: Verify mocks are properly configured

### Getting Help

- Check test logs for detailed error messages
- Run tests with `--verbose` flag for additional output
- Review test documentation for specific module requirements
```

## Code Review Standards

### Test Code Review Checklist

- [ ] Tests follow naming conventions
- [ ] Tests have clear descriptions
- [ ] Tests are independent and isolated
- [ ] Mocks are properly configured
- [ ] Assertions are specific and meaningful
- [ ] Edge cases are covered
- [ ] Error conditions are tested
- [ ] Performance considerations are included
- [ ] Security implications are tested
- [ ] Accessibility requirements are met

## Quality Gates

### Definition of Done for Tests

A feature is considered complete when:

1. **All Tests Pass**: Unit, integration, and E2E tests
2. **Coverage Met**: Minimum coverage thresholds achieved
3. **Performance Standards**: Response times within acceptable limits
4. **Security Verified**: No security vulnerabilities in tests
5. **Accessibility Compliant**: WCAG 2.1 AA standards met
6. **Documentation Updated**: Test documentation is current

### Release Criteria

- No critical test failures
- Coverage targets achieved
- Performance benchmarks met
- Security scan passed
- Accessibility audit passed
- Documentation complete

## Tools and Resources

### Recommended Tools

- **IDE Extensions**: Vitest, Playwright, ESLint, Prettier
- **Browser Tools**: Playwright Inspector, Chrome DevTools
- **Performance Tools**: Lighthouse, WebPageTest
- **Accessibility Tools**: axe DevTools, WAVE, screen readers

### Learning Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Conclusion

Following these testing guidelines ensures that the PEMS system maintains high quality standards, provides comprehensive coverage, and delivers a reliable educational management system that meets the needs of Philippine educational institutions.

Regular reviews and updates to these guidelines will help the team maintain consistency and improve testing practices over time.