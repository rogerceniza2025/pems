import { execSync } from 'child_process';
import fs from 'fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('TDD Integration Tests', () => {
  let tempRepo;

  beforeEach(() => {
    // Set up a complete test repository
    tempRepo = fs.mkdtempSync('tdd-integration-');
    process.chdir(tempRepo);
    
    // Initialize git repository
    execSync('git init');
    execSync('git config user.name "Test User"');
    execSync('git config user.email "test@example.com"');
    
    // Create package.json
    fs.writeFileSync('package.json', JSON.stringify({
      name: 'test-repo',
      type: 'module',
      scripts: {
        test: 'vitest',
        'test:coverage': 'vitest run --coverage',
        'test:enforce': 'node scripts/tdd-enforcement.js'
      }
    }));
    
    // Create scripts directory and copy TDD scripts
    fs.mkdirSync('scripts');
    fs.copyFileSync('../scripts/tdd-enforcement.js', 'scripts/tdd-enforcement.js');
    fs.copyFileSync('../scripts/coverage-validation.js', 'scripts/coverage-validation.js');
  });

  afterEach(() => {
    process.chdir('../');
    fs.rmSync(tempRepo, { recursive: true, force: true });
  });

  it('should enforce TDD in complete workflow', () => {
    // Try to commit without tests - should fail
    fs.writeFileSync('src/component.js', 'export const component = {};');
    execSync('git add src/component.js');
    
    expect(() => {
      execSync('node scripts/tdd-enforcement.js', { stdio: 'pipe' });
    }).toThrow();
    
    // Add test file - should pass
    fs.writeFileSync('src/component.test.js', `
      import { describe, it, expect } from 'vitest';
      import { component } from './component.js';
      
      describe('component', () => {
        it('should work', () => {
          expect(component).toBeDefined();
        });
      });
    `);
    
    execSync('git add src/component.test.js');
    
    expect(() => {
      execSync('node scripts/tdd-enforcement.js', { stdio: 'pipe' });
    }).not.toThrow();
  });

  it('should validate coverage thresholds', () => {
    // Create files with low coverage
    fs.writeFileSync('src/utils.js', `
      export function add(a, b) { return a + b; }
      export function subtract(a, b) { return a - b; }
      export function multiply(a, b) { return a * b; }
    `);
    
    fs.writeFileSync('src/utils.test.js', `
      import { describe, it, expect } from 'vitest';
      import { add } from './utils.js';
      
      describe('utils', () => {
        it('should add numbers', () => {
          expect(add(1, 2)).toBe(3);
        });
      });
    `);
    
    execSync('git add src/utils.js src/utils.test.js');
    
    // Coverage validation should fail due to low coverage
    expect(() => {
      execSync('node scripts/coverage-validation.js', { stdio: 'pipe' });
    }).toThrow();
  });
});