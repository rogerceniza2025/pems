# Package.json Testing Dependencies

## Overview

This document provides the complete package.json updates required to implement the comprehensive testing framework for the PEMS project.

## Updated package.json

### Complete Dependencies

```json
{
  "name": "pems",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev --port 3000",
    "dev:api": "vite dev --port 3001",
    "dev:admin": "vite dev --port 3002",
    "build": "vite build",
    "build:production": "vite build --mode production",
    "build:staging": "vite build --mode staging",
    "serve": "vite preview",
    "test": "vitest run",
    "test:unit": "vitest run --config vitest.unit.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:debug": "vitest --inspect-brk",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage --reporter=junit",
    "test:component": "vitest run --config vitest.component.config.ts",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check": "prettier --write . && eslint --fix",
    "type-check": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate deploy",
    "db:migrate:test": "prisma migrate deploy --schema=prisma/test-schema.prisma",
    "db:reset": "prisma migrate reset --force",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "db:push": "prisma db push",
    "start": "node .output/server/index.mjs",
    "prepare": "husky install",
    "precommit": "lint-staged",
    "postinstall": "prisma generate"
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
    "better-auth": "^1.0.1",
    "eslint": "^8.55.0",
    "husky": "^8.0.3",
    "jsdom": "^23.0.1",
    "lint-staged": "^15.2.0",
    "prettier": "^3.5.3",
    "supertest": "^6.3.3",
    "typescript": "^5.7.2",
    "vite": "^7.1.7",
    "vite-plugin-solid": "^2.11.10",
    "vitest": "^1.0.4"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.0.0"
}
```

## New Dependencies Added

### Testing Framework Dependencies

```json
{
  "@playwright/test": "^1.40.0",
  "@testing-library/jest-dom": "^6.1.5", 
  "@testing-library/solid": "^0.8.0",
  "@types/node": "^20.10.0",
  "@types/supertest": "^2.0.16",
  "@vitest/coverage-v8": "^1.0.4",
  "@vitest/ui": "^1.0.4",
  "better-auth": "^1.0.1",
  "jsdom": "^23.0.1",
  "supertest": "^6.3.3",
  "vitest": "^1.0.4"
}
```

### Development Tools Dependencies

```json
{
  "husky": "^8.0.3",
  "lint-staged": "^15.2.0",
  "prettier": "^3.5.3",
  "eslint": "^8.55.0"
}
```

## New Scripts Added

### Testing Scripts

```json
{
  "test:unit": "vitest run --config vitest.unit.config.ts",
  "test:integration": "vitest run --config vitest.integration.config.ts", 
  "test:e2e": "playwright test",
  "test:watch": "vitest --watch",
  "test:ui": "vitest --ui",
  "test:debug": "vitest --inspect-brk",
  "test:coverage": "vitest run --coverage",
  "test:ci": "vitest run --coverage --reporter=junit",
  "test:component": "vitest run --config vitest.component.config.ts"
}
```

### Database Scripts

```json
{
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate deploy",
  "db:migrate:test": "prisma migrate deploy --schema=prisma/test-schema.prisma",
  "db:reset": "prisma migrate reset --force",
  "db:seed": "prisma db seed",
  "db:studio": "prisma studio",
  "db:push": "prisma db push"
}
```

### Development Scripts

```json
{
  "dev:api": "vite dev --port 3001",
  "dev:admin": "vite dev --port 3002",
  "build:production": "vite build --mode production",
  "build:staging": "vite build --mode staging",
  "prepare": "husky install",
  "precommit": "lint-staged",
  "postinstall": "prisma generate"
}
```

## Configuration Files

### Environment Files

Create `.env.test` for test environment:

```env
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/pems_test
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/pems_test
JWT_SECRET=test-jwt-secret-for-testing-only
ENCRYPTION_KEY=test-encryption-key-for-testing-only
BETTER_AUTH_SECRET=test-better-auth-secret
BETTER_AUTH_URL=http://localhost:3001/api/auth
```

### Vitest Configuration Files

1. **vitest.config.ts** - Main configuration
2. **vitest.unit.config.ts** - Unit test specific configuration
3. **vitest.integration.config.ts** - Integration test specific configuration
4. **vitest.component.config.ts** - Component test specific configuration

### Playwright Configuration

**playwright.config.ts** - Multi-browser E2E test configuration

## Installation Instructions

### 1. Install Dependencies

```bash
# Install all dependencies
pnpm install

# Install only testing dependencies
pnpm add -D @playwright/test @testing-library/jest-dom @testing-library/solid @vitest/coverage-v8 @vitest/ui jsdom supertest
```

### 2. Setup Testing Environment

```bash
# Install Playwright browsers
npx playwright install

# Setup test database
createdb pems_test
pnpm db:migrate:test
pnpm db:seed

# Setup pre-commit hooks
pnpm prepare
```

### 3. Run Tests

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# Run with coverage
pnpm test:coverage

# Run in watch mode for TDD
pnpm test:watch

# Run with UI
pnpm test:ui
```

## Integration with Existing Tools

### Husky Integration

```json
// package.json husky configuration
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "pnpm test:unit"
    }
  }
}
```

### Lint-Staged Configuration

```json
// .lintstagedrc.js
export default {
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    'vitest related --run'
  ],
  '*.{json,md,yml}': [
    'prettier --write'
  ]
}
```

## Migration Steps

### From Current Setup

1. **Backup Current package.json**
2. **Update package.json** with new dependencies and scripts
3. **Install new dependencies**: `pnpm install`
4. **Create configuration files**: Vitest and Playwright configs
5. **Setup environment files**: `.env.test` and others
6. **Initialize Git hooks**: `pnpm prepare`
7. **Run initial tests**: `pnpm test` to verify setup

### Verification Steps

1. **Unit Tests**: `pnpm test:unit` should pass
2. **Integration Tests**: `pnpm test:integration` should pass
3. **E2E Tests**: `pnpm test:e2e` should pass
4. **Coverage**: `pnpm test:coverage` should meet thresholds
5. **CI/CD**: GitHub Actions should run successfully

## Benefits of Updated Dependencies

### 1. Comprehensive Testing

- **Unit Testing**: Vitest provides fast, TypeScript-native testing
- **Integration Testing**: Supertest for API testing, jsdom for DOM testing
- **E2E Testing**: Playwright for reliable cross-browser testing
- **Component Testing**: Testing Library for SolidJS components

### 2. Developer Experience

- **Watch Mode**: Real-time test feedback during development
- **UI Interface**: Visual test runner and coverage reports
- **Debug Support**: Easy debugging of failing tests
- **Hot Reloading**: Tests auto-run on file changes

### 3. Quality Assurance

- **Coverage Reports**: Detailed coverage analysis with thresholds
- **Performance Testing**: Built-in performance monitoring
- **Security Testing**: Security validation in test suite
- **Accessibility Testing**: Accessibility compliance checking

### 4. CI/CD Integration

- **Automated Testing**: Tests run automatically on commits
- **Parallel Execution**: Multiple test suites run in parallel
- **Artifact Storage**: Test results and coverage reports stored
- **Quality Gates**: Tests must pass before deployment

## Cost Analysis

### Additional Dependencies Cost

The new testing dependencies add approximately 15-20MB to node_modules and provide comprehensive testing capabilities:

- **@playwright/test**: Browser automation (5MB)
- **@vitest/coverage-v8**: Coverage reporting (2MB)
- **@testing-library/*****: Component testing (3MB)
- **jsdom**: DOM testing (1MB)
- **supertest**: API testing (1MB)
- **better-auth**: Authentication testing (2MB)

### ROI Justification

1. **Bug Prevention**: Comprehensive testing catches issues early
2. **Development Speed**: TDD workflow reduces debugging time
3. **Code Quality**: Tests enforce high code standards
4. **Team Productivity**: Better tools improve developer experience
5. **Maintenance**: Automated tests reduce manual testing overhead

## Next Steps

### Immediate Actions

1. **Update package.json** with the complete dependency list
2. **Create configuration files** for Vitest and Playwright
3. **Setup test environment** with proper database and variables
4. **Initialize Git hooks** for automated quality checks
5. **Run test suite** to verify everything works
6. **Update CI/CD pipeline** with new testing workflows

### Training Requirements

1. **Vitest Training**: Team education on Vitest features and best practices
2. **Playwright Training**: E2E testing workshop and tool familiarization
3. **TDD Workshop**: RED-GREEN-REFACTOR cycle training
4. **Testing Guidelines Review**: Review of comprehensive testing standards

This package.json update provides the foundation for implementing a world-class testing framework that supports the PEMS project's quality and reliability requirements.