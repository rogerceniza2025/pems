/**
 * Design Tokens Tests
 * Tests the CSS design tokens system for consistency and compliance
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DesignTokenTestUtils } from './utils/css-test-utils';

describe('Design Tokens System', () => {
  let rootElement: HTMLElement;

  beforeEach(() => {
    // Setup a test element to check applied styles
    rootElement = document.documentElement;

    // Create a test div to apply tokens to
    const testDiv = document.createElement('div');
    testDiv.id = 'test-element';
    document.body.appendChild(testDiv);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Token Naming Convention', () => {
    it('should follow kebab-case naming convention for color tokens', () => {
      const colorTokens = [
        '--background',
        '--foreground',
        '--primary',
        '--primary-foreground',
        '--secondary',
        '--secondary-foreground',
        '--muted',
        '--muted-foreground',
        '--accent',
        '--accent-foreground',
        '--destructive',
        '--destructive-foreground',
        '--border',
        '--input',
        '--ring',
      ];

      colorTokens.forEach(token => {
        DesignTokenTestUtils.expectTokenName(token);
      });
    });

    it('should follow kebab-case naming convention for spacing tokens', () => {
      const spacingTokens = [
        '--spacing-xs',
        '--spacing-sm',
        '--spacing-md',
        '--spacing-lg',
        '--spacing-xl',
        '--spacing-2xl',
      ];

      spacingTokens.forEach(token => {
        DesignTokenTestUtils.expectTokenName(token);
      });
    });

    it('should follow kebab-case naming convention for radius tokens', () => {
      const radiusTokens = [
        '--radius-sm',
        '--radius-md',
        '--radius-lg',
        '--radius-xl',
        '--radius-2xl',
        '--radius-full',
      ];

      radiusTokens.forEach(token => {
        DesignTokenTestUtils.expectTokenName(token);
      });
    });

    it('should follow kebab-case naming convention for shadow tokens', () => {
      const shadowTokens = [
        '--shadow-sm',
        '--shadow-md',
        '--shadow-lg',
        '--shadow-xl',
      ];

      shadowTokens.forEach(token => {
        DesignTokenTestUtils.expectTokenName(token);
      });
    });

    it('should follow kebab-case naming convention for z-index tokens', () => {
      const zIndexTokens = [
        '--z-dropdown',
        '--z-sticky',
        '--z-fixed',
        '--z-modal-backdrop',
        '--z-modal',
        '--z-popover',
        '--z-tooltip',
      ];

      zIndexTokens.forEach(token => {
        DesignTokenTestUtils.expectTokenName(token);
      });
    });
  });

  describe('Color Tokens', () => {
    it('should have consistent light theme colors', () => {
      const lightColors = {
        '--background': '0 0% 100%',
        '--foreground': '222.2 84% 4.9%',
        '--primary': '222.2 47.4% 11.2%',
        '--secondary': '210 40% 96%',
        '--muted': '210 40% 96%',
        '--accent': '210 40% 96%',
      };

      Object.entries(lightColors).forEach(([token, expectedValue]) => {
        const computedStyle = getComputedStyle(rootElement);
        const actualValue = computedStyle.getPropertyValue(token).trim();
        expect(actualValue).toBe(expectedValue);
      });
    });

    it('should have proper dark theme color overrides', () => {
      // Add dark class to test dark theme
      rootElement.classList.add('dark');

      const darkColors = {
        '--background': '222.2 84% 4.9%',
        '--foreground': '210 40% 98%',
        '--primary': '210 40% 98%',
        '--secondary': '217.2 32.6% 17.5%',
        '--muted': '217.2 32.6% 17.5%',
        '--accent': '217.2 32.6% 17.5%',
      };

      Object.entries(darkColors).forEach(([token, expectedValue]) => {
        const computedStyle = getComputedStyle(rootElement);
        const actualValue = computedStyle.getPropertyValue(token).trim();
        expect(actualValue).toBe(expectedValue);
      });

      // Clean up
      rootElement.classList.remove('dark');
    });

    it('should have semantic color pairs for consistency', () => {
      const semanticPairs = [
        ['primary', 'primary-foreground'],
        ['secondary', 'secondary-foreground'],
        ['muted', 'muted-foreground'],
        ['accent', 'accent-foreground'],
        ['destructive', 'destructive-foreground'],
      ];

      semanticPairs.forEach(([bg, fg]) => {
        const computedStyle = getComputedStyle(rootElement);
        const bgValue = computedStyle.getPropertyValue(`--${bg}`).trim();
        const fgValue = computedStyle.getPropertyValue(`--${fg}`).trim();

        expect(bgValue).toBeTruthy();
        expect(fgValue).toBeTruthy();
      });
    });

    it('should include chart colors for data visualization', () => {
      const chartColors = [
        '--chart-1',
        '--chart-2',
        '--chart-3',
        '--chart-4',
        '--chart-5',
      ];

      chartColors.forEach(token => {
        DesignTokenTestUtils.expectTokenName(token);

        const computedStyle = getComputedStyle(rootElement);
        const value = computedStyle.getPropertyValue(token).trim();
        expect(value).toBeTruthy();
      });
    });
  });

  describe('Typography Tokens', () => {
    it('should have font family tokens defined', () => {
      const computedStyle = getComputedStyle(rootElement);

      const sansFont = computedStyle.getPropertyValue('--font-family-sans').trim();
      const monoFont = computedStyle.getPropertyValue('--font-family-mono').trim();

      expect(sansFont).toBeTruthy();
      expect(monoFont).toBeTruthy();

      DesignTokenTestUtils.expectFontFamilyToken(sansFont);
      DesignTokenTestUtils.expectFontFamilyToken(monoFont);
    });

    it('should have fallback font families', () => {
      const computedStyle = getComputedStyle(rootElement);
      const sansFont = computedStyle.getPropertyValue('--font-family-sans').trim();

      expect(sansFont).toContain('Inter');
      expect(sansFont).toContain('system-ui');
      expect(sansFont).toContain('sans-serif');
    });
  });

  describe('Spacing Tokens', () => {
    it('should have consistent spacing scale', () => {
      const computedStyle = getComputedStyle(rootElement);

      const spacingTokens = [
        '--spacing-xs',
        '--spacing-sm',
        '--spacing-md',
        '--spacing-lg',
        '--spacing-xl',
        '--spacing-2xl',
      ];

      const spacingValues = spacingTokens.map(token => {
        const value = computedStyle.getPropertyValue(token).trim();
        expect(value).toBeTruthy();
        DesignTokenTestUtils.expectSpacingToken(value);
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
      }) as number[];

      // Should be in ascending order
      for (let i = 1; i < spacingValues.length; i++) {
        const current = spacingValues[i];
        const previous = spacingValues[i - 1];
        if (current !== undefined && previous !== undefined) {
          expect(current).toBeGreaterThan(previous);
        }
      }
    });

    it('should follow standard spacing ratios', () => {
      const computedStyle = getComputedStyle(rootElement);

      const baseSpacing = parseFloat(computedStyle.getPropertyValue('--spacing-md').trim());
      const smSpacing = parseFloat(computedStyle.getPropertyValue('--spacing-sm').trim());
      const lgSpacing = parseFloat(computedStyle.getPropertyValue('--spacing-lg').trim());

      // Should follow approximately 2x ratio
      expect(lgSpacing / baseSpacing).toBeCloseTo(1.5, 1);
      expect(baseSpacing / smSpacing).toBeCloseTo(2, 1);
    });
  });

  describe('Border Radius Tokens', () => {
    it('should have comprehensive radius scale', () => {
      const computedStyle = getComputedStyle(rootElement);

      const radiusTokens = [
        '--radius-sm',
        '--radius-md',
        '--radius-lg',
        '--radius-xl',
        '--radius-2xl',
        '--radius-full',
      ];

      radiusTokens.forEach(token => {
        const value = computedStyle.getPropertyValue(token).trim();
        expect(value).toBeTruthy();
        DesignTokenTestUtils.expectSpacingToken(value);
      });
    });

    it('should have a default radius token', () => {
      const computedStyle = getComputedStyle(rootElement);
      const defaultRadius = computedStyle.getPropertyValue('--radius').trim();

      expect(defaultRadius).toBeTruthy();
      expect(defaultRadius).toBe('var(--radius-lg)');
    });

    it('should have full radius for circular elements', () => {
      const computedStyle = getComputedStyle(rootElement);
      const fullRadius = computedStyle.getPropertyValue('--radius-full').trim();

      expect(fullRadius).toBe('9999px');
    });
  });

  describe('Shadow Tokens', () => {
    it('should have progressive shadow scale', () => {
      const computedStyle = getComputedStyle(rootElement);

      const shadowTokens = [
        '--shadow-sm',
        '--shadow-md',
        '--shadow-lg',
        '--shadow-xl',
      ];

      shadowTokens.forEach(token => {
        const value = computedStyle.getPropertyValue(token).trim();
        expect(value).toBeTruthy();
        expect(value).toContain('rgb(0 0 0');
      });
    });

    it('should have increasing shadow intensities', () => {
      const computedStyle = getComputedStyle(rootElement);

      const shadowSm = computedStyle.getPropertyValue('--shadow-sm').trim();
      const shadowMd = computedStyle.getPropertyValue('--shadow-md').trim();
      const shadowLg = computedStyle.getPropertyValue('--shadow-lg').trim();
      const shadowXl = computedStyle.getPropertyValue('--shadow-xl').trim();

      // Each shadow should have more blur/offset than the previous
      expect(shadowMd.length).toBeGreaterThan(shadowSm.length);
      expect(shadowLg.length).toBeGreaterThan(shadowMd.length);
      expect(shadowXl.length).toBeGreaterThan(shadowLg.length);
    });
  });

  describe('Z-Index Tokens', () => {
    it('should have logical z-index scale', () => {
      const computedStyle = getComputedStyle(rootElement);

      const zIndexTokens = [
        '--z-dropdown',
        '--z-sticky',
        '--z-fixed',
        '--z-modal-backdrop',
        '--z-modal',
        '--z-popover',
        '--z-tooltip',
      ];

      const zIndexValues = zIndexTokens.map(token => {
        const value = computedStyle.getPropertyValue(token).trim();
        expect(value).toBeTruthy();
        const parsed = parseInt(value);
        return isNaN(parsed) ? 0 : parsed;
      }) as number[];

      // Should be in ascending order of stacking context
      for (let i = 1; i < zIndexValues.length; i++) {
        const current = zIndexValues[i];
        const previous = zIndexValues[i - 1];
        if (current !== undefined && previous !== undefined) {
          expect(current).toBeGreaterThan(previous);
        }
      }
    });
  });

  describe('Sidebar Tokens', () => {
    it('should have comprehensive sidebar color system', () => {
      const sidebarTokens = [
        '--sidebar',
        '--sidebar-foreground',
        '--sidebar-primary',
        '--sidebar-primary-foreground',
        '--sidebar-accent',
        '--sidebar-accent-foreground',
        '--sidebar-border',
        '--sidebar-ring',
      ];

      sidebarTokens.forEach(token => {
        DesignTokenTestUtils.expectTokenName(token);

        const computedStyle = getComputedStyle(rootElement);
        const value = computedStyle.getPropertyValue(token).trim();
        expect(value).toBeTruthy();
      });
    });
  });

  describe('Token Application', () => {
    it('should apply tokens correctly to elements', () => {
      const testElement = document.getElementById('test-element');
      if (!testElement) throw new Error('Test element not found');

      // Apply some styles that use tokens
      testElement.style.backgroundColor = 'hsl(var(--background))';
      testElement.style.color = 'hsl(var(--foreground))';
      testElement.style.borderRadius = 'var(--radius)';
      testElement.style.boxShadow = 'var(--shadow-md)';

      const computedStyle = getComputedStyle(testElement);

      expect(computedStyle.backgroundColor).toBeTruthy();
      expect(computedStyle.color).toBeTruthy();
      expect(computedStyle.borderRadius).toBeTruthy();
      expect(computedStyle.boxShadow).toBeTruthy();
    });

    it('should support token fallbacks', () => {
      const testElement = document.getElementById('test-element');
      if (!testElement) throw new Error('Test element not found');

      // Test fallback mechanism
      testElement.style.color = 'hsl(var(--non-existent-token, 0 0% 50%))';
      const computedStyle = getComputedStyle(testElement);

      // Should fall back to the provided value
      expect(computedStyle.color).toContain('128, 128, 128');
    });
  });

  describe('Token Performance', () => {
    it('should not cause style recalculation when unchanged', () => {
      const testElement = document.getElementById('test-element');
      if (!testElement) throw new Error('Test element not found');

      // Apply token-based styles
      testElement.style.backgroundColor = 'hsl(var(--background))';

      const initialStyle = getComputedStyle(testElement).backgroundColor;

      // Re-apply the same style
      testElement.style.backgroundColor = 'hsl(var(--background))';

      const finalStyle = getComputedStyle(testElement).backgroundColor;

      expect(initialStyle).toBe(finalStyle);
    });
  });
});