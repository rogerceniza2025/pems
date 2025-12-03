# TDD Enforcement System - User Guide

## Overview

The TDD (Test-Driven Development) Enforcement System ensures that your team follows test-first development principles and maintains high code quality standards throughout the development process.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Workflow](#development-workflow)
3. [TDD Principles](#tdd-principles)
4. [Available Commands](#available-commands)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

## Quick Start

### Installation

The TDD enforcement system is automatically installed when you set up the project. No additional installation is required.

### Initial Setup

1. **Ensure Git Hooks are Active**
   ```bash
   # Verify pre-commit hook is installed
   ls .git/hooks/pre-commit
   
   # If missing, reinstall husky
   pnpm prepare
   ```

2. **Verify Scripts are Available**
   ```bash
   # Check available TDD scripts
   pnpm run --help | grep tdd
   ```

## Development Workflow

### 1. Standard TDD Workflow

Follow this Red-Green-Refactor cycle:

```bash
# 1. Start TDD watch mode
pnpm test:tdd watch

# 2. Write failing test first
# Create your test file (e.g., src/utils.test.ts)

# 3. Run tests (they should fail)
# Tests will automatically run and show failures

# 4. Write minimal code to pass
# Implement just enough to make tests pass

# 5. Refactor while keeping tests green
# Improve code structure, tests should still pass

# 6. Commit changes
git add .
git commit -m "Implement feature with TDD"
```

### 2. Domain Layer Development

For domain logic, use stricter TDD mode:

```bash
# Focus on domain layer tests
pnpm test:tdd domain

# Or run domain tests with coverage
pnpm test:domain
```

### 3. Integration Testing

For testing component interactions:

```bash
# Run integration tests in watch mode
pnpm test:tdd integration

# Or run all integration tests
pnpm test:integration
```

## TDD Principles

### 1. Test-First Development

**Always write tests before implementation code:**

✅ **Correct Approach:**
```typescript
// 1. Write test first
describe('UserService', () => {
  it('should create user with valid data', () => {
    const userData = { name: 'John', email: 'john@example.com' };
    const user = UserService.create(userData);
    
    expect(user.id).toBeDefined();
    expect(user.name).toBe(userData.name);
    expect(user.email).toBe(userData.email);
  });
});

// 2. Then implement
export class UserService {
  static create(userData: CreateUserRequest): User {
    // Implementation here
  }
}
```

❌ **Incorrect Approach:**
```typescript
// Writing implementation first violates TDD principles
export class UserService {
  static create(userData: CreateUserRequest): User {
    // Implementation without tests
  }
}

// Then writing tests later
```

### 2. Red-Green-Refactor Cycle

1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while tests pass

### 3. Test Coverage Requirements

- **Global Coverage**: ≥ 80%
- **Domain Layer**: ≥ 90%
- **New Code**: ≥ 85%

## Available Commands

### Development Commands

```bash
# Start TDD watch mode with coverage
pnpm test:tdd watch

# Domain layer focused testing
pnpm test:tdd domain

# Integration testing
pnpm test:tdd integration

# Strict TDD mode (fails on coverage drop)
pnpm test:tdd strict

# Test only changed files
pnpm test:tdd changed

# Validate TDD compliance
pnpm test:tdd validate
```

### Testing Commands

```bash
# Run all unit tests
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Generate coverage report
pnpm test:coverage

# Run tests with UI
pnpm test:ui

# Debug tests
pnpm test:debug
```

### Validation Commands

```bash
# Enforce TDD rules
pnpm test:enforce

# Validate coverage thresholds
pnpm test:coverage-validate

# Run all validations
pnpm test:validate
```

## Troubleshooting

### Common Issues

#### 1. Pre-commit Hook Fails

**Problem**: Commit is blocked by TDD validation

**Solution**:
```bash
# Check what failed
pnpm test:enforce

# Fix missing tests
# Add test files for source files

# Fix test content
# Add proper assertions and structure

# Retry commit
git add .
git commit -m "Fix TDD violations"
```

#### 2. Coverage Validation Fails

**Problem**: Coverage thresholds not met

**Solution**:
```bash
# Generate detailed coverage report
pnpm test:coverage

# View coverage report
open coverage/lcov-report/index.html

# Add tests for uncovered code
# Focus on functions, branches, and statements

# Retry validation
pnpm test:coverage-validate
```

#### 3. Test Files Not Found

**Problem**: System can't find corresponding test files

**Solution**:
```bash
# Check test file naming conventions
# Tests should be: *.test.ts, *.test.tsx, *.spec.ts, *.spec.tsx

# Verify test file locations
# Tests can be in:
# - Same directory as source
# - __tests__ subdirectory
# - tests/unit directory
# - tests/integration directory
```

### Error Messages and Solutions

| Error Message | Cause | Solution |
|---------------|--------|----------|
| `No corresponding test file found` | Source file without test | Create test file first |
| `Test written after implementation` | Test timestamp newer | Write test before implementation |
| `No assertions found` | Test lacks expect/assert | Add proper assertions |
| `Empty test cases` | Test blocks are empty | Add test logic |

## Best Practices

### 1. Test Organization

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx
├── services/
│   ├── UserService.ts
│   └── UserService.test.ts
└── utils/
    ├── helpers.ts
    └── helpers.test.ts

tests/
├── unit/
│   ├── components/
│   └── services/
└── integration/
    └── workflows/
```

### 2. Test Naming Conventions

```typescript
// Use descriptive test names
describe('UserService', () => {
  describe('create', () => {
    it('should create user with valid data', () => {
      // Test implementation
    });

    it('should throw error for invalid email', () => {
      // Test implementation
    });
  });
});
```

### 3. Test Structure (AAA Pattern)

```typescript
it('should calculate total price with tax', () => {
  // Arrange
  const price = 100;
  const taxRate = 0.1;
  const expected = 110;

  // Act
  const result = PriceCalculator.calculateTotal(price, taxRate);

  // Assert
  expect(result).toBe(expected);
});
```

### 4. Mocking and Stubbing

```typescript
import { vi } from 'vitest';

// Mock external dependencies
vi.mock('../api/EmailService');

// Create test data
const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com'
};

// Use in tests
it('should send welcome email', async () => {
  const emailService = await import('../api/EmailService');
  
  await UserService.sendWelcomeEmail(mockUser);
  
  expect(emailService.default.sendEmail).toHaveBeenCalledWith(
    mockUser.email,
    'Welcome!',
    expect.stringContaining('Test User')
  );
});
```

### 5. Integration with IDE

#### VS Code Setup

1. **Install Recommended Extensions**
   - Vitest
   - ESLint
   - Prettier
   - Jest Runner (for test navigation)

2. **Configure Tasks**
   ```json
   // .vscode/tasks.json
   {
     "version": "2.0.0",
     "tasks": [
       {
         "label": "TDD: Validate",
         "type": "shell",
         "command": "pnpm",
         "args": ["test:enforce"],
         "group": "test"
       }
     ]
   }
   ```

3. **Keyboard Shortcuts**
   ```json
   // .vscode/keybindings.json
   [
     {
       "key": "ctrl+shift+t",
       "command": "workbench.action.tasks.runTask",
       "args": "TDD: Validate"
     }
   ]
   ```

## Performance Tips

### 1. Fast Feedback Loops

```bash
# Use watch mode for continuous feedback
pnpm test:tdd watch

# Focus on specific test files
pnpm test -- src/components/Button.test.ts

# Use selective coverage
pnpm test:coverage -- src/services/
```

### 2. Optimize Test Performance

```typescript
// Use test isolation
beforeEach(() => {
  vi.clearAllMocks();
});

// Use test factories
const createTestUser = (overrides = {}) => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
});

// Use test transactions
beforeEach(async () => {
  await database.transaction(async (tx) => {
    // Setup test data
  });
});
```

## Migration Guide

### From Existing Codebase

1. **Add Tests for Existing Code**
   ```bash
   # Identify untested files
   pnpm test:coverage
   
   # Prioritize critical files
   # - Domain logic
   # - API endpoints
   # - Core utilities
   ```

2. **Gradual Adoption**
   ```bash
   # Start with new features
   # Apply TDD to new code first
   
   # Gradually add tests to existing code
   # Focus on high-impact areas
   ```

3. **Team Training**
   - Conduct TDD workshop
   - Pair programming sessions
   - Code review focus on TDD compliance

## Support

### Getting Help

1. **Check Documentation**
   - [TDD Implementation Plan](./tdd-enforcement-implementation-plan.md)
   - [Testing Strategy](./testing-strategy.md)

2. **Team Channels**
   - Slack: #tdd-help
   - GitHub Discussions: TDD tag

3. **Escalation**
   - Tech Lead: Review persistent issues
   - Architecture Team: Process improvements

---

This guide provides comprehensive information for using the TDD enforcement system effectively. Follow these practices to ensure high-quality, maintainable code.