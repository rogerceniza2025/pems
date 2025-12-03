const { execSync } = require('child_process');
const fs = require('fs');
const TTDEnforcer = require('../scripts/tdd-enforcement');

describe('TDD Enforcement Script', () => {
  let tempDir;
  let enforcer;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync('tdd-test-');
    process.chdir(tempDir);
    
    // Initialize git repo
    execSync('git init');
    execSync('git config user.name "Test User"');
    execSync('git config user.email "test@example.com"');
    
    enforcer = new TTDEnforcer();
  });

  afterEach(() => {
    process.chdir('../');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Test-First Validation', () => {
    it('should pass when test file exists before source file', () => {
      // Create test file first
      const testFile = 'src/utils.test.js';
      fs.writeFileSync(testFile, `
        describe('utils', () => {
          it('should work', () => {
            expect(true).toBe(true);
          });
        });
      `);
      
      // Create source file later
      const sourceFile = 'src/utils.js';
      fs.writeFileSync(sourceFile, 'export const utils = {};');
      
      // Stage files
      execSync(`git add ${testFile} ${sourceFile}`);
      
      enforcer.stagedFiles = [testFile, sourceFile];
      enforcer.validateTestFirst();
      
      expect(enforcer.violations).toHaveLength(0);
    });

    it('should fail when source file exists without test file', () => {
      const sourceFile = 'src/utils.js';
      fs.writeFileSync(sourceFile, 'export const utils = {};');
      
      execSync(`git add ${sourceFile}`);
      
      enforcer.stagedFiles = [sourceFile];
      enforcer.validateTestFirst();
      
      expect(enforcer.violations).toHaveLength(1);
      expect(enforcer.violations[0].type).toBe('MISSING_TEST');
    });

    it('should fail when source file is newer than test file', () => {
      const testFile = 'src/utils.test.js';
      const sourceFile = 'src/utils.js';
      
      // Create test file
      fs.writeFileSync(testFile, 'describe test');
      
      // Wait a bit to ensure different timestamps
      setTimeout(() => {
        // Create source file later
        fs.writeFileSync(sourceFile, 'export const utils = {};');
        
        execSync(`git add ${testFile} ${sourceFile}`);
        
        enforcer.stagedFiles = [testFile, sourceFile];
        enforcer.validateTestFirst();
        
        expect(enforcer.violations).toHaveLength(1);
        expect(enforcer.violations[0].type).toBe('TEST_NOT_FIRST');
      }, 100);
    });
  });

  describe('Test Content Validation', () => {
    it('should pass for valid test structure', () => {
      const testFile = 'src/utils.test.js';
      fs.writeFileSync(testFile, `
        describe('utils', () => {
          it('should return correct value', () => {
            const result = someFunction();
            expect(result).toBe(expected);
          });
        });
      `);
      
      enforcer.stagedFiles = [testFile];
      enforcer.validateTestContent();
      
      expect(enforcer.violations).toHaveLength(0);
    });

    it('should fail for test without assertions', () => {
      const testFile = 'src/utils.test.js';
      fs.writeFileSync(testFile, `
        describe('utils', () => {
          it('should do something', () => {
            const result = someFunction();
            // No assertion
          });
        });
      `);
      
      enforcer.stagedFiles = [testFile];
      enforcer.validateTestContent();
      
      expect(enforcer.violations).toHaveLength(1);
      expect(enforcer.violations[0].type).toBe('NO_ASSERTIONS');
    });

    it('should fail for empty test cases', () => {
      const testFile = 'src/utils.test.js';
      fs.writeFileSync(testFile, `
        describe('utils', () => {
          it('should do something', () => {});
        });
      `);
      
      enforcer.stagedFiles = [testFile];
      enforcer.validateTestContent();
      
      expect(enforcer.violations).toHaveLength(1);
      expect(enforcer.violations[0].type).toBe('EMPTY_TEST');
    });
  });

  describe('Report Generation', () => {
    it('should generate success report when no violations', () => {
      enforcer.violations = [];
      enforcer.warnings = [];
      
      const result = enforcer.generateReport();
      
      expect(result).toBe(true);
    });

    it('should generate failure report when violations exist', () => {
      enforcer.violations = [
        { type: 'MISSING_TEST', file: 'test.js', message: 'Test missing' }
      ];
      
      const result = enforcer.generateReport();
      
      expect(result).toBe(false);
    });
  });
});