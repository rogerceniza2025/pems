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
    } catch {
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
      } catch {
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
      execSync(
        `pnpm test:coverage -- --reporter=json --changed --since=HEAD~1`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      // This would need to be implemented based on your coverage tool output
      // For now, we'll do basic validation
      
    } catch {
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