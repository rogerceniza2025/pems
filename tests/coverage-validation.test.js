import fs from 'fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoverageValidator from '../scripts/coverage-validation.js';

describe('Coverage Validation Script', () => {
  let validator;
  let mockCoverage;

  beforeEach(() => {
    validator = new CoverageValidator();
    mockCoverage = {
      total: {
        lines: { pct: 85 },
        functions: { pct: 90 },
        branches: { pct: 80 },
        statements: { pct: 85 }
      }
    };
  });

  describe('Threshold Validation', () => {
    it('should pass when all thresholds are met', () => {
      const violations = validator.validateThresholds(
        mockCoverage.total,
        'Global',
        validator.thresholds.global
      );
      
      expect(violations).toHaveLength(0);
    });

    it('should fail when coverage is below threshold', () => {
      const lowCoverage = {
        lines: { pct: 70 },
        functions: { pct: 75 },
        branches: { pct: 65 },
        statements: { pct: 70 }
      };
      
      const violations = validator.validateThresholds(
        lowCoverage,
        'Global',
        validator.thresholds.global
      );
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].metric).toBe('lines');
      expect(violations[0].actual).toBe(70);
      expect(violations[0].threshold).toBe(80);
    });
  });

  describe('Coverage Report Parsing', () => {
    it('should parse coverage report correctly', () => {
      const mockReport = {
        total: mockCoverage.total
      };
      
      // Mock fs.existsSync and fs.readFileSync
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockReport));
      
      const result = validator.getCoverageReport();
      
      expect(result).toEqual(mockReport);
      
      fs.existsSync.mockRestore();
      fs.readFileSync.mockRestore();
    });

    it('should handle missing coverage report', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      
      const result = validator.getCoverageReport();
      
      expect(result).toBeNull();
      
      fs.existsSync.mockRestore();
    });
  });
});