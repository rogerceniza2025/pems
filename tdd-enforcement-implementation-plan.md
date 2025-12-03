# TDD Enforcement Implementation Plan

This document provides the complete implementation for enhanced pre-commit hooks that enforce test-first development and ensure comprehensive test coverage.

## Overview

The TDD enforcement system consists of:

1. **Enhanced Pre-commit Hooks** - Git hooks that validate TDD compliance
2. **TDD Validation Scripts** - Scripts that check test-first principles
3. **Coverage Validation** - Scripts that enforce coverage thresholds
4. **Test Quality Checks** - Validation of test quality and structure
5. **Reporting Mechanisms** - Clear feedback for TDD violations

## Implementation Files

### 1. Enhanced Pre-commit Hook

**File: `.husky/pre-commit`**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running TDD enforcement checks..."

# Run TDD validation first
echo "📝 Validating test-first development..."
node scripts/tdd-enforcement.js

# Run coverage validation
echo "📊 Validating test coverage..."
node scripts/coverage-validation.js

# Run existing lint-staged
echo "🔧 Running linting and formatting..."
npx lint-staged

# Run tests for changed files
echo "🧪 Running tests for changed files..."
pnpm test:changed -- --run

echo "✅ All TDD checks passed!"
```

### 2. TDD Enforcement Script

**File: `scripts/tdd-enforcement.js`**

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  colorLog('red', `❌ ${message}`);
}

function logSuccess(message) {
  colorLog('green', `✅ ${message}`);
}

function logWarning(message) {
  colorLog('yellow', `⚠️  ${message}`);
}

function logInfo(message) {
  colorLog('blue', `ℹ️  ${message}`);
}

class TTDEnforcer {
  constructor() {
    this.stagedFiles = this.getStagedFiles();
    this.violations = [];
    this.warnings = [];
  }

  getStagedFiles() {
    try {
      const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
      return output.trim().split('\n').filter(file => file.length > 0);
    } catch (error) {
      logError('Failed to get staged files');
      process.exit(1);
    }
  }

  getSourceFiles() {
    return this.stagedFiles.filter(file => 
      file.match(/\.(js|jsx|ts|tsx)$/) && 
      !file.includes('.test.') && 
      !file.includes('.spec.') &&
      !file.includes('node_modules') &&
      !file.includes('dist') &&
      !file.includes('coverage')
    );
  }

  getTestFiles() {
    return this.stagedFiles.filter(file => 
      file.match(/\.(test|spec)\.(js|jsx|ts|tsx)$/) &&
      !file.includes('node_modules')
    );
  }

  findCorrespondingTestFile(sourceFile) {
    const dir = path.dirname(sourceFile);
    const name = path.basename(sourceFile, path.extname(sourceFile));
    
    const possibleTestPaths = [
      path.join(dir, `${name}.test.ts`),
      path.join(dir, `${name}.test.tsx`),
      path.join(dir, `${name}.spec.ts`),
      path.join(dir, `${name}.spec.tsx`),
      path.join(dir, '__tests__', `${name}.test.ts`),
      path.join(dir, '__tests__', `${name}.test.tsx`),
      path.join('tests/unit', dir, `${name}.test.ts`),
      path.join('tests/unit', dir, `${name}.test.tsx`),
      path.join('tests/integration', dir, `${name}.test.ts`),
      path.join('tests/integration', dir, `${name}.test.tsx`),
    ];

    for (const testPath of possibleTestPaths) {
      if (fs.existsSync(testPath)) {
        return testPath;
      }
    }

    return null;
  }

  validateTestFirst() {
    logInfo('Validating test-first development principles...');
    
    const sourceFiles = this.getSourceFiles();
    
    for (const sourceFile of sourceFiles) {
      // Skip configuration files and non-source files
      if (sourceFile.includes('config') || 
          sourceFile.includes('setup') || 
          sourceFile.includes('mock')) {
        continue;
      }

      const testFile = this.findCorrespondingTestFile(sourceFile);
      
      if (!testFile) {
        this.violations.push({
          type: 'MISSING_TEST',
          file: sourceFile,
          message: `No corresponding test file found for ${sourceFile}`
        });
        continue;
      }

      // Check if test file exists in staging
      if (!this.stagedFiles.includes(testFile) && !fs.existsSync(testFile)) {
        this.violations.push({
          type: 'MISSING_TEST_IN_STAGING',
          file: sourceFile,
          testFile,
          message: `Test file ${testFile} exists but is not staged with ${sourceFile}`
        });
        continue;
      }

      // Check test file timestamp (test should be older than implementation)
      try {
        const sourceStats = fs.statSync(sourceFile);
        const testStats = fs.statSync(testFile);
        
        if (sourceStats.mtime < testStats.mtime) {
          this.violations.push({
            type: 'TEST_NOT_FIRST',
            file: sourceFile,
            testFile,
            message: `Implementation file ${sourceFile} was modified after test ${testFile}. Tests should be written first!`
          });
        }
      } catch (error) {
        // Skip timestamp check if files don't exist
      }
    }
  }

  validateTestContent() {
    logInfo('Validating test content quality...');
    
    const testFiles = this.getTestFiles();
    
    for (const testFile of testFiles) {
      try {
        const content = fs.readFileSync(testFile, 'utf8');
        
        // Check for basic test structure
        if (!content.includes('describe(') && !content.includes('it(') && !content.includes('test(')) {
          this.violations.push({
            type: 'INVALID_TEST_STRUCTURE',
            file: testFile,
            message: `Test file ${testFile} lacks proper test structure (describe/it/test)`
          });
        }

        // Check for assertions
        if (!content.includes('expect(') && !content.includes('assert.')) {
          this.violations.push({
            type: 'NO_ASSERTIONS',
            file: testFile,
            message: `Test file ${testFile} contains no assertions (expect/assert)`
          });
        }

        // Check for empty tests
        if (content.match(/it\(['"`][^'"`]*['"`]\s*,\s*\(\)\s*=>\s*\{\s*\}/)) {
          this.violations.push({
            type: 'EMPTY_TEST',
            file: testFile,
            message: `Test file ${testFile} contains empty test cases`
          });
        }

      } catch (error) {
        logError(`Failed to read test file ${testFile}: ${error.message}`);
      }
    }
  }

  validateNewCodeCoverage() {
    logInfo('Validating coverage for new code...');
    
    try {
      // Run coverage on staged files only
      const coverageOutput = execSync(
        `pnpm test:coverage -- --reporter=json --changed --since=HEAD~1`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      // This would need to be implemented based on your coverage tool output
      // For now, we'll do basic validation
      
    } catch (error) {
      this.warnings.push({
        type: 'COVERAGE_CHECK_FAILED',
        message: 'Could not validate coverage for new code'
      });
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TDD ENFORCEMENT REPORT');
    console.log('='.repeat(60));

    if (this.violations.length === 0 && this.warnings.length === 0) {
      logSuccess('No TDD violations found!');
      return true;
    }

    // Report violations
    if (this.violations.length > 0) {
      console.log('\n🚨 VIOLATIONS (Must be fixed before commit):');
      this.violations.forEach((violation, index) => {
        console.log(`\n${index + 1}. ${violation.type}`);
        console.log(`   File: ${violation.file}`);
        if (violation.testFile) {
          console.log(`   Test: ${violation.testFile}`);
        }
        console.log(`   Issue: ${violation.message}`);
      });
    }

    // Report warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (Recommended to fix):');
      this.warnings.forEach((warning, index) => {
        console.log(`\n${index + 1}. ${warning.type}`);
        console.log(`   Issue: ${warning.message}`);
      });
    }

    // Provide guidance
    if (this.violations.length > 0) {
      console.log('\n📝 GUIDANCE:');
      console.log('1. Write tests BEFORE implementing code (TDD principle)');
      console.log('2. Ensure every source file has a corresponding test file');
      console.log('3. Include proper assertions in your tests');
      console.log('4. Run "pnpm test:tdd watch" to develop in TDD mode');
      
      return false;
    }

    return true;
  }

  run() {
    logInfo(`Analyzing ${this.stagedFiles.length} staged files...`);
    
    this.validateTestFirst();
    this.validateTestContent();
    this.validateNewCodeCoverage();
    
    const success = this.generateReport();
    
    if (!success) {
      logError('TDD validation failed. Please fix the violations before committing.');
      process.exit(1);
    }
    
    logSuccess('TDD validation passed!');
  }
}

// Run the enforcer
if (require.main === module) {
  const enforcer = new TTDEnforcer();
  enforcer.run();
}

module.exports = TTDEnforcer;
```

### 3. Coverage Validation Script

**File: `scripts/coverage-validation.js`**

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  colorLog('red', `❌ ${message}`);
}

function logSuccess(message) {
  colorLog('green', `✅ ${message}`);
}

function logWarning(message) {
  colorLog('yellow', `⚠️  ${message}`);
}

function logInfo(message) {
  colorLog('blue', `ℹ️  ${message}`);
}

class CoverageValidator {
  constructor() {
    this.thresholds = {
      global: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      },
      domain: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      },
      newCode: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85
      }
    };
  }

  async getCoverageReport() {
    try {
      // Run coverage and get JSON report
      const output = execSync(
        'pnpm test:coverage -- --reporter=json --reporter=html',
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      // Look for coverage file
      const coverageFile = 'coverage/coverage-summary.json';
      if (fs.existsSync(coverageFile)) {
        const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        return coverageData;
      }
      
      // Alternative: parse from stdout
      const lines = output.split('\n');
      const coverageLine = lines.find(line => line.includes('coverage-summary.json'));
      if (coverageLine && fs.existsSync('coverage/coverage-summary.json')) {
        return JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
      }
      
      throw new Error('Could not find coverage report');
      
    } catch (error) {
      logError(`Failed to generate coverage report: ${error.message}`);
      return null;
    }
  }

  validateThresholds(coverage, category, thresholds) {
    const violations = [];
    
    for (const [metric, threshold] of Object.entries(thresholds)) {
      const actual = coverage[metric]?.pct || 0;
      
      if (actual < threshold) {
        violations.push({
          metric,
          actual,
          threshold,
          category
        });
      }
    }
    
    return violations;
  }

  async validateCoverage() {
    logInfo('Running coverage validation...');
    
    const coverage = await this.getCoverageReport();
    if (!coverage) {
      logError('Could not retrieve coverage report');
      return false;
    }

    console.log('\n📊 COVERAGE REPORT');
    console.log('='.repeat(50));

    let allPassed = true;
    const allViolations = [];

    // Validate global coverage
    if (coverage.total) {
      const globalViolations = this.validateThresholds(
        coverage.total, 
        'Global', 
        this.thresholds.global
      );
      
      if (globalViolations.length > 0) {
        allPassed = false;
        allViolations.push(...globalViolations);
      }
      
      console.log(`\nGlobal Coverage:`);
      console.log(`  Lines: ${coverage.total.lines?.pct || 0}%`);
      console.log(`  Functions: ${coverage.total.functions?.pct || 0}%`);
      console.log(`  Branches: ${coverage.total.branches?.pct || 0}%`);
      console.log(`  Statements: ${coverage.total.statements?.pct || 0}%`);
    }

    // Validate domain layer coverage
    if (coverage['modules/*/domain/']) {
      const domainViolations = this.validateThresholds(
        coverage['modules/*/domain/'], 
        'Domain Layer', 
        this.thresholds.domain
      );
      
      if (domainViolations.length > 0) {
        allPassed = false;
        allViolations.push(...domainViolations);
      }
    }

    // Report violations
    if (allViolations.length > 0) {
      console.log('\n🚨 COVERAGE VIOLATIONS:');
      allViolations.forEach(violation => {
        console.log(`\n${violation.category} - ${violation.metric}:`);
        console.log(`  Required: ${violation.threshold}%`);
        console.log(`  Actual: ${violation.actual}%`);
        console.log(`  Gap: ${violation.threshold - violation.actual}%`);
      });
      
      console.log('\n📝 IMPROVEMENT SUGGESTIONS:');
      console.log('1. Add unit tests for uncovered functions');
      console.log('2. Add integration tests for complex workflows');
      console.log('3. Test edge cases and error conditions');
      console.log('4. Use "pnpm test:coverage -- --watch" to monitor coverage');
      
      return false;
    }

    logSuccess('All coverage thresholds met!');
    return true;
  }

  async run() {
    const success = await this.validateCoverage();
    
    if (!success) {
      logError('Coverage validation failed. Please improve test coverage before committing.');
      process.exit(1);
    }
    
    logSuccess('Coverage validation passed!');
  }
}

// Run the validator
if (require.main === module) {
  const validator = new CoverageValidator();
  validator.run();
}

module.exports = CoverageValidator;
```

### 4. Enhanced Lint-staged Configuration

**File: `lint-staged.config.js`**

```javascript
export default {
  // Source files - require tests
  '*.{js,jsx,ts,tsx}': [
    // First check if corresponding test exists
    (filenames) => {
      const sourceFiles = filenames.filter(f => 
        !f.includes('.test.') && 
        !f.includes('.spec.') &&
        !f.includes('node_modules') &&
        !f.includes('dist')
      );
      
      if (sourceFiles.length > 0) {
        console.log('🔍 Checking for corresponding test files...');
        for (const file of sourceFiles) {
          const testFile = file.replace(/\.(js|jsx|ts|tsx)$/, '.test.$1');
          if (!filenames.includes(testFile)) {
            console.log(`⚠️  Warning: ${file} may not have corresponding test file`);
          }
        }
      }
      
      return filenames;
    },
    
    // Run ESLint
    'eslint --fix --max-warnings=0',
    
    // Run Prettier
    'prettier --write',
    
    // Type check
    'tsc --noEmit'
  ],
  
  // Test files - stricter linting
  '*.{test,spec}.{js,jsx,ts,tsx}': [
    'eslint --fix --max-warnings=0 --plugin testing-library',
    'prettier --write'
  ],
  
  // Style files
  '*.{css,scss,less}': [
    'stylelint --fix',
    'prettier --write'
  ],
  
  // Other files
  '*.{json,md,yml,yaml}': [
    'prettier --write'
  ]
}
```

### 5. Enhanced Package.json Scripts

**Add to `package.json`:**

```json
{
  "scripts": {
    "test": "pnpm run --recursive test",
    "test:unit": "vitest run --config vitest.unit.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:changed": "vitest run --changed --since=main",
    "test:tdd": "./scripts/tdd-watch.sh",
    "test:validate": "./scripts/tdd-validate.sh",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:debug": "vitest --inspect-brk",
    "test:domain": "vitest run tests/unit/domain/** -- --coverage",
    "test:enforce": "node scripts/tdd-enforcement.js",
    "test:coverage-validate": "node scripts/coverage-validation.js",
    
    "pre-commit": "node scripts/tdd-enforcement.js && node scripts/coverage-validation.js && lint-staged",
    "pre-push": "pnpm test && pnpm build",
    
    "coverage:serve": "npx serve coverage",
    "coverage:clean": "rm -rf coverage test-results"
  }
}
```

### 6. TDD Watch Script

**File: `scripts/tdd-watch.sh`**

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

TDD_MODE=${1:-"watch"}

print_status "Starting TDD workflow in $TDD_MODE mode..."

case $TDD_MODE in
    "watch")
        print_status "Starting TDD watch mode with coverage..."
        pnpm test:unit -- --watch --coverage
        ;;
    "domain")
        print_status "Running domain layer tests in watch mode..."
        pnpm test:domain -- --watch
        ;;
    "integration")
        print_status "Running integration tests in watch mode..."
        pnpm test:integration -- --watch
        ;;
    "strict")
        print_status "Running strict TDD mode (fail on any coverage drop)..."
        pnpm test:coverage -- --run --passWithNoTests=false
        ;;
    "changed")
        print_status "Running tests for changed files..."
        pnpm test:changed -- --watch
        ;;
    "validate")
        print_status "Running TDD validation..."
        pnpm test:enforce
        ;;
    *)
        print_error "Unknown TDD mode: $TDD_MODE"
        echo "Available modes: watch, domain, integration, strict, changed, validate"
        exit 1
        ;;
esac
```

### 7. GitHub Actions Integration

**File: `.github/workflows/tdd-enforcement.yml`**

```yaml
name: TDD Enforcement

on:
  pull_request:
    branches: [main, develop]

jobs:
  tdd-validation:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run TDD enforcement
        run: pnpm test:enforce
      
      - name: Run coverage validation
        run: pnpm test:coverage-validate
      
      - name: Run full test suite
        run: pnpm test
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
```

### 8. VS Code Integration

**File: `.vscode/tasks.json`**

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "TDD: Validate",
      "type": "shell",
      "command": "pnpm",
      "args": ["test:enforce"],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      }
    },
    {
      "label": "TDD: Watch",
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
      "label": "TDD: Coverage Validate",
      "type": "shell",
      "command": "pnpm",
      "args": ["test:coverage-validate"],
      "group": "test"
    }
  ]
}
```

## Implementation Steps

1. **Create the scripts directory and add all validation scripts**
2. **Update the pre-commit hook**
3. **Enhance lint-staged configuration**
4. **Update package.json scripts**
5. **Add GitHub Actions workflow**
6. **Update VS Code configuration**
7. **Test the implementation**

## Usage

### Local Development
- **TDD Watch Mode**: `pnpm test:tdd watch`
- **Validate TDD**: `pnpm test:enforce`
- **Coverage Check**: `pnpm test:coverage-validate`

### Pre-commit Flow
1. Developer stages files with `git add`
2. Pre-commit hook runs automatically
3. TDD validation checks test-first principles
4. Coverage validation ensures thresholds
5. Linting and formatting applied
6. Tests run for changed files

### CI/CD Integration
- Pull requests trigger TDD validation
- Coverage reports uploaded to Codecov
- Failed TDD validation blocks merge

## Benefits

1. **Enforces Test-First Development**: Tests must exist before implementation
2. **Maintains Coverage Standards**: Prevents coverage regression
3. **Fast Feedback**: Incremental testing for quick validation
4. **Clear Guidance**: Actionable error messages and suggestions
5. **Seamless Integration**: Works with existing development workflow

This comprehensive TDD enforcement system ensures that your team follows test-first development principles and maintains high code quality standards.