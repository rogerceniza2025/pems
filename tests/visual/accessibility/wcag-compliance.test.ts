/**
 * WCAG 2.1 AA Accessibility Compliance Tests
 *
 * Comprehensive accessibility testing using axe-core to validate compliance
 * with WCAG 2.1 AA guidelines. These tests ensure the application is
 * accessible to users with disabilities and follows accessibility best practices.
 *
 * WCAG Principles Covered:
 * - Perceivable: Information and UI components must be presentable in ways users can perceive
 * - Operable: UI components and navigation must be operable
 * - Understandable: Information and UI operation must be understandable
 * - Robust: Content must be robust enough for various assistive technologies
 */

import { test, expect, devices } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

interface AccessibilityTestCase {
  name: string;
  url: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  wcagLevel: 'A' | 'AA' | 'AAA';
  tags: string[];
  customChecks?: string[];
}

interface AccessibilityTestResult {
  testCase: AccessibilityTestCase;
  passed: boolean;
  violations: any[];
  passes: any[];
  incomplete: any[];
  inapplicable: any[];
  screenshot?: string;
  error?: string;
  wcagCompliance: {
    level: string;
    score: number;
    criticalIssues: number;
    seriousIssues: number;
    moderateIssues: number;
    minorIssues: number;
  };
}

describe('WCAG 2.1 AA Accessibility Compliance Tests', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  let testResults: AccessibilityTestResult[] = [];

  // Accessibility test cases covering different user flows
  const accessibilityTestCases: AccessibilityTestCase[] = [
    {
      name: 'Homepage Accessibility',
      url: '/',
      description: 'Homepage accessibility compliance',
      priority: 'critical',
      wcagLevel: 'AA',
      tags: ['navigation', 'content', 'images']
    },
    {
      name: 'Login Form Accessibility',
      url: '/login',
      description: 'Login form accessibility',
      priority: 'critical',
      wcagLevel: 'AA',
      tags: ['forms', 'authentication', 'labels'],
      customChecks: ['form-field-labels', 'error-messages', 'keyboard-navigation']
    },
    {
      name: 'Registration Form Accessibility',
      url: '/register',
      description: 'Registration form accessibility',
      priority: 'critical',
      wcagLevel: 'AA',
      tags: ['forms', 'validation', 'instructions'],
      customChecks: ['field-instructions', 'password-strength', 'consent-checkboxes']
    },
    {
      name: 'Dashboard Accessibility',
      url: '/dashboard',
      description: 'Dashboard accessibility',
      priority: 'high',
      wcagLevel: 'AA',
      tags: ['data-tables', 'navigation', 'interactive-elements'],
      customChecks: ['data-table-headers', 'dashboard-widgets', 'color-contrast']
    },
    {
      name: 'Student Profile Accessibility',
      url: '/students/profile',
      description: 'Student profile page accessibility',
      priority: 'high',
      wcagLevel: 'AA',
      tags: ['forms', 'data-entry', 'personal-information'],
      customChecks: ['required-fields', 'edit-modes', 'save-buttons']
    },
    {
      name: 'Settings Page Accessibility',
      url: '/settings',
      description: 'Settings page accessibility',
      priority: 'medium',
      wcagLevel: 'AA',
      tags: ['preferences', 'toggles', 'dropdowns'],
      customChecks: ['toggle-labels', 'dropdown-accessibility', 'change-detection']
    },
    {
      name: 'Search Results Accessibility',
      url: '/search?q=test',
      description: 'Search results accessibility',
      priority: 'medium',
      wcagLevel: 'AA',
      tags: ['search', 'results-list', 'filtering'],
      customChecks: ['result-landmarks', 'filter-controls', 'pagination']
    },
    {
      name: 'Error Page Accessibility',
      url: '/404',
      description: 'Error page accessibility',
      priority: 'high',
      wcagLevel: 'AA',
      tags: ['error-handling', 'navigation', 'help'],
      customChecks: ['error-messages', 'alternative-navigation', 'help-content']
    }
  ];

  /**
   * Execute accessibility test for a specific page
   */
  async function executeAccessibilityTest(
    testCase: AccessibilityTestCase,
    viewport: { width: number; height: number } = { width: 1920, height: 1080 }
  ): Promise<AccessibilityTestResult> {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    const result: AccessibilityTestResult = {
      testCase,
      passed: false,
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: [],
      wcagCompliance: {
        level: testCase.wcagLevel,
        score: 0,
        criticalIssues: 0,
        seriousIssues: 0,
        moderateIssues: 0,
        minorIssues: 0
      }
    };

    try {
      // Launch browser
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext({
        viewport,
        // Simulate accessibility preferences
        reducedMotion: 'reduce',
        forcedColors: 'none'
      });
      page = await context.newPage();

      // Inject axe-core
      await injectAxe(page);

      // Navigate to test URL
      const response = await page.goto(`${baseUrl}${testCase.url}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      if (!response || !response.ok()) {
        throw new Error(`Failed to load page: ${response?.status()}`);
      }

      // Wait for page to fully load
      await page.waitForTimeout(2000);

      // Check for color contrast issues specifically (common WCAG AA failure)
      await checkColorContrast(page, result);

      // Check for keyboard navigation
      await checkKeyboardNavigation(page, result);

      // Check for screen reader landmarks
      await checkScreenReaderLandmarks(page, result);

      // Run axe accessibility checks with WCAG 2.1 AA rules
      await checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: { html: true },
        rules: {
          // Enable WCAG 2.1 AA level rules
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-order-semantics': { enabled: true },
          'label-title-only': { enabled: true },
          'landmark-one-main': { enabled: true },
          'page-has-heading-one': { enabled: true },
          'region': { enabled: true },
          'skip-link': { enabled: true },

          // Critical accessibility rules
          'image-alt': { enabled: true },
          'input-button-name': { enabled: true },
          'label': { enabled: true },
          'link-name': { enabled: true },
          'list': { enabled: true },
          'listitem': { enabled: true },
          'object-alt': { enabled: true },
          'tabindex': { enabled: true },

          // Additional important rules
          'aria-required-attr': { enabled: true },
          'aria-roles': { enabled: true },
          'aria-valid-attr-value': { enabled: true },
          'button-has-visible-text': { enabled: true },
          'definition-list': { enabled: true },
          'dlitem': { enabled: true },
          'document-title': { enabled: true },
          'form-field-multiple-labels': { enabled: true },
          'header-present': { enabled: true },
          'heading-order': { enabled: true },
          'html-has-lang': { enabled: true },
          'img-redundant-alt': { enabled: true },
          'layout-table': { enabled: true },
          'link-in-text-block': { enabled: true },
          'meta-viewport': { enabled: true },
          'meta-viewport-large': { enabled: true },
          'no-autoplay-audio': { enabled: true },
          'role-img-alt': { enabled: true },
          'scope-attr-valid': { enabled: true },
          'select-name': { enabled: true },
          'skip-link': { enabled: true },
          'table-headers': { enabled: true },
          'td-headers-attr': { enabled: true },
          'th-has-data-cells': { enabled: true },
          'valid-lang': { enabled: true },
          'video-caption': { enabled: true }
        }
      });

      // Get detailed axe results
      const axeResults = await getViolations(page);

      // Process axe results
      result.violations = axeResults.violations || [];
      result.passes = axeResults.passes || [];
      result.incomplete = axeResults.incomplete || [];
      result.inapplicable = axeResults.inapplicable || [];

      // Calculate WCAG compliance score
      calculateComplianceScore(result);

      // Run custom accessibility checks
      if (testCase.customChecks) {
        await runCustomAccessibilityChecks(page, testCase.customChecks, result);
      }

      // Take screenshot for visual reference
      const timestamp = Date.now();
      const screenshotName = `accessibility_${testCase.name.replace(/\s+/g, '_')}_${timestamp}.png`;
      result.screenshot = screenshotName;
      await page.screenshot({
        path: `test-results/accessibility/${screenshotName}`,
        fullPage: true
      });

      // Overall pass/fail determination
      result.passed = result.wcagCompliance.criticalIssues === 0 &&
                      result.wcagCompliance.seriousIssues === 0 &&
                      result.wcagCompliance.score >= 80;

    } catch (error: any) {
      result.passed = false;
      result.error = error.message;
      console.error(`❌ Accessibility test failed for ${testCase.name}:`, error.message);
    } finally {
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    }

    testResults.push(result);
    return result;
  }

  /**
   * Check color contrast issues
   */
  async function checkColorContrast(page: Page, result: AccessibilityTestResult): Promise<void> {
    try {
      const contrastIssues = await page.evaluate(() => {
        const issues: any[] = [];
        const elements = document.querySelectorAll('*');

        elements.forEach(element => {
          const styles = window.getComputedStyle(element);
          const color = styles.color;
          const backgroundColor = styles.backgroundColor;

          // Simple check for low contrast (real implementation would use proper contrast calculation)
          if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
            // This is a simplified check - real implementation would calculate WCAG contrast ratios
            const rgbColor = color.match(/\d+/g);
            const rgbBg = backgroundColor.match(/\d+/g);

            if (rgbColor && rgbBg) {
              const luminance1 = (0.299 * parseInt(rgbColor[0]) + 0.587 * parseInt(rgbColor[1]) + 0.114 * parseInt(rgbColor[2])) / 255;
              const luminance2 = (0.299 * parseInt(rgbBg[0]) + 0.587 * parseInt(rgbBg[1]) + 0.114 * parseInt(rgbBg[2])) / 255;

              const ratio = (Math.max(luminance1, luminance2) + 0.05) / (Math.min(luminance1, luminance2) + 0.05);

              if (ratio < 3) { // Below WCAG AA requirement
                issues.push({
                  element: element.tagName,
                  id: element.id,
                  className: element.className,
                  color,
                  backgroundColor,
                  ratio: ratio.toFixed(2),
                  issue: 'Low color contrast ratio'
                });
              }
            }
          }
        });

        return issues;
      });

      if (contrastIssues.length > 0) {
        result.wcagCompliance.criticalIssues += contrastIssues.length;
        console.warn(`⚠️  Color contrast issues found: ${contrastIssues.length}`);
      }
    } catch (error) {
      console.warn('Color contrast check failed:', error);
    }
  }

  /**
   * Check keyboard navigation
   */
  async function checkKeyboardNavigation(page: Page, result: AccessibilityTestResult): Promise<void> {
    try {
      await page.keyboard.press('Tab'); // Press tab to start keyboard navigation
      await page.waitForTimeout(100);

      const keyboardIssues = await page.evaluate(() => {
        const issues: any[] = [];
        const focusableElements = Array.from(document.querySelectorAll(
          'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ));

        // Check if there are focusable elements
        if (focusableElements.length === 0) {
          issues.push({
            issue: 'No keyboard focusable elements found',
            severity: 'serious'
          });
        }

        // Check for proper focus indicators
        focusableElements.forEach(element => {
          const styles = window.getComputedStyle(element, ':focus');
          if (!styles.outline && !styles.boxShadow && !styles.border) {
            issues.push({
              element: element.tagName,
              id: element.id,
              issue: 'No visible focus indicator',
              severity: 'moderate'
            });
          }
        });

        return issues;
      });

      if (keyboardIssues.length > 0) {
        result.wcagCompliance.seriousIssues += keyboardIssues.filter((i: any) => i.severity === 'serious').length;
        result.wcagCompliance.moderateIssues += keyboardIssues.filter((i: any) => i.severity === 'moderate').length;
      }
    } catch (error) {
      console.warn('Keyboard navigation check failed:', error);
    }
  }

  /**
   * Check screen reader landmarks
   */
  async function checkScreenReaderLandmarks(page: Page, result: AccessibilityTestResult): Promise<void> {
    try {
      const landmarkIssues = await page.evaluate(() => {
        const issues: any[] = [];

        // Check for main landmark
        const mainElements = document.querySelectorAll('main, [role="main"]');
        if (mainElements.length === 0) {
          issues.push({
            issue: 'No main landmark found',
            severity: 'critical'
          });
        } else if (mainElements.length > 1) {
          issues.push({
            issue: 'Multiple main landmarks found',
            severity: 'serious'
          });
        }

        // Check for navigation landmarks
        const navElements = document.querySelectorAll('nav, [role="navigation"]');
        if (navElements.length === 0) {
          issues.push({
            issue: 'No navigation landmark found',
            severity: 'moderate'
          });
        }

        // Check for proper heading structure
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        if (headings.length === 0) {
          issues.push({
            issue: 'No headings found',
            severity: 'serious'
          });
        } else {
          // Check for proper heading order
          let previousLevel = 0;
          for (const heading of headings) {
            const level = parseInt(heading.tagName.substring(1));
            if (level > previousLevel + 1) {
              issues.push({
                element: heading.tagName,
                text: heading.textContent,
                issue: 'Heading level skip detected',
                severity: 'moderate'
              });
            }
            previousLevel = level;
          }
        }

        // Check for page language
        const htmlLang = document.documentElement.getAttribute('lang');
        if (!htmlLang) {
          issues.push({
            issue: 'No page language specified',
            severity: 'serious'
          });
        }

        return issues;
      });

      if (landmarkIssues.length > 0) {
        result.wcagCompliance.criticalIssues += landmarkIssues.filter((i: any) => i.severity === 'critical').length;
        result.wcagCompliance.seriousIssues += landmarkIssues.filter((i: any) => i.severity === 'serious').length;
        result.wcagCompliance.moderateIssues += landmarkIssues.filter((i: any) => i.severity === 'moderate').length;
      }
    } catch (error) {
      console.warn('Screen reader landmarks check failed:', error);
    }
  }

  /**
   * Run custom accessibility checks
   */
  async function runCustomAccessibilityChecks(
    page: Page,
    customChecks: string[],
    result: AccessibilityTestResult
  ): Promise<void> {
    for (const check of customChecks) {
      try {
        switch (check) {
          case 'form-field-labels':
            await checkFormFieldLabels(page, result);
            break;
          case 'error-messages':
            await checkErrorMessages(page, result);
            break;
          case 'data-table-headers':
            await checkDataTableHeaders(page, result);
            break;
          case 'color-contrast':
            await checkColorContrast(page, result);
            break;
          case 'required-fields':
            await checkRequiredFields(page, result);
            break;
          case 'toggle-labels':
            await checkToggleLabels(page, result);
            break;
        }
      } catch (error) {
        console.warn(`Custom accessibility check '${check}' failed:`, error);
      }
    }
  }

  /**
   * Check form field labels
   */
  async function checkFormFieldLabels(page: Page, result: AccessibilityTestResult): Promise<void> {
    const labelIssues = await page.evaluate(() => {
      const issues: any[] = [];
      const inputs = document.querySelectorAll('input, select, textarea');

      inputs.forEach(input => {
        const hasLabel = document.querySelector(`label[for="${input.id}"]`) ||
                        input.getAttribute('aria-label') ||
                        input.getAttribute('aria-labelledby') ||
                        input.closest('label');

        if (!hasLabel && input.type !== 'hidden') {
          issues.push({
            element: input.tagName,
            type: input.type,
            id: input.id,
            name: input.name,
            issue: 'Form field missing label'
          });
        }
      });

      return issues;
    });

    if (labelIssues.length > 0) {
      result.wcagCompliance.criticalIssues += labelIssues.length;
    }
  }

  /**
   * Check error messages accessibility
   */
  async function checkErrorMessages(page: Page, result: AccessibilityTestResult): Promise<void> {
    const errorIssues = await page.evaluate(() => {
      const issues: any[] = [];
      const errorElements = document.querySelectorAll('[class*="error"], [class*="alert"], [role="alert"]');

      errorElements.forEach(element => {
        if (!element.getAttribute('aria-live') && !element.getAttribute('role')) {
          issues.push({
            element: element.tagName,
            className: element.className,
            issue: 'Error message not properly announced to screen readers'
          });
        }
      });

      return issues;
    });

    if (errorIssues.length > 0) {
      result.wcagCompliance.seriousIssues += errorIssues.length;
    }
  }

  /**
   * Check data table headers
   */
  async function checkDataTableHeaders(page: Page, result: AccessibilityTestResult): Promise<void> {
    const tableIssues = await page.evaluate(() => {
      const issues: any[] = [];
      const tables = document.querySelectorAll('table');

      tables.forEach(table => {
        const hasHeaders = table.querySelectorAll('th').length > 0;
        if (!hasHeaders && table.rows.length > 1) {
          issues.push({
            element: 'table',
            issue: 'Data table missing headers'
          });
        }

        // Check for scope attributes on headers
        const headers = table.querySelectorAll('th');
        headers.forEach(header => {
          if (!header.getAttribute('scope')) {
            issues.push({
              element: 'th',
              text: header.textContent,
              issue: 'Table header missing scope attribute'
            });
          }
        });
      });

      return issues;
    });

    if (tableIssues.length > 0) {
      result.wcagCompliance.seriousIssues += tableIssues.length;
    }
  }

  /**
   * Check required fields
   */
  async function checkRequiredFields(page: Page, result: AccessibilityTestResult): Promise<void> {
    const requiredIssues = await page.evaluate(() => {
      const issues: any[] = [];
      const requiredFields = document.querySelectorAll('[required], [aria-required="true"]');

      requiredFields.forEach(field => {
        const label = document.querySelector(`label[for="${field.id}"]`) ||
                      field.closest('label') ||
                      document.querySelector(`[aria-labelledby="${field.id}"]`);

        if (label && !label.textContent?.includes('*') && !label.getAttribute('aria-required')) {
          issues.push({
            element: field.tagName,
            id: field.id,
            issue: 'Required field not properly indicated in label'
          });
        }
      });

      return issues;
    });

    if (requiredIssues.length > 0) {
      result.wcagCompliance.moderateIssues += requiredIssues.length;
    }
  }

  /**
   * Check toggle labels
   */
  async function checkToggleLabels(page: Page, result: AccessibilityTestResult): Promise<void> {
    const toggleIssues = await page.evaluate(() => {
      const issues: any[] = [];
      const toggles = document.querySelectorAll('input[type="checkbox"], input[type="radio"]');

      toggles.forEach(toggle => {
        const hasLabel = document.querySelector(`label[for="${toggle.id}"]`) ||
                        toggle.closest('label') ||
                        toggle.getAttribute('aria-label') ||
                        toggle.getAttribute('aria-labelledby');

        if (!hasLabel) {
          issues.push({
            element: toggle.tagName,
            type: toggle.type,
            id: toggle.id,
            issue: 'Toggle missing accessible label'
          });
        }
      });

      return issues;
    });

    if (toggleIssues.length > 0) {
      result.wcagCompliance.seriousIssues += toggleIssues.length;
    }
  }

  /**
   * Calculate WCAG compliance score
   */
  function calculateComplianceScore(result: AccessibilityTestResult): void {
    const totalChecks = result.violations.length + result.passes.length + result.incomplete.length;

    if (totalChecks === 0) {
      result.wcagCompliance.score = 100;
      return;
    }

    // Categorize violations by impact
    result.violations.forEach(violation => {
      switch (violation.impact) {
        case 'critical':
          result.wcagCompliance.criticalIssues++;
          break;
        case 'serious':
          result.wcagCompliance.seriousIssues++;
          break;
        case 'moderate':
          result.wcagCompliance.moderateIssues++;
          break;
        case 'minor':
          result.wcagCompliance.minorIssues++;
          break;
      }
    });

    // Calculate score (weighted by severity)
    const weightCritical = 50;
    const weightSerious = 20;
    const weightModerate = 10;
    const weightMinor = 5;

    const penalty = (result.wcagCompliance.criticalIssues * weightCritical) +
                   (result.wcagCompliance.seriousIssues * weightSerious) +
                   (result.wcagCompliance.moderateIssues * weightModerate) +
                   (result.wcagCompliance.minorIssues * weightMinor);

    const maxPenalty = 1000; // Arbitrary large number
    result.wcagCompliance.score = Math.max(0, 100 - (penalty / maxPenalty * 100));
  }

  test('should meet WCAG 2.1 AA accessibility standards', async () => {
    console.log('♿ Starting WCAG 2.1 AA accessibility compliance tests...\n');

    // Run accessibility tests for all test cases
    for (const testCase of accessibilityTestCases) {
      console.log(`🔍 Testing ${testCase.name} (${testCase.wcagLevel} level)...`);

      const result = await executeAccessibilityTest(testCase);

      const status = result.passed ? '✅' : '❌';
      const score = result.wcagCompliance.score.toFixed(1);
      console.log(`   ${status} ${testCase.name}: Score ${score}%`);

      if (result.wcagCompliance.criticalIssues > 0) {
        console.log(`      🔴 Critical Issues: ${result.wcagCompliance.criticalIssues}`);
      }
      if (result.wcagCompliance.seriousIssues > 0) {
        console.log(`      🟠 Serious Issues: ${result.wcagCompliance.seriousIssues}`);
      }
      if (result.wcagCompliance.moderateIssues > 0) {
        console.log(`      🟡 Moderate Issues: ${result.wcagCompliance.moderateIssues}`);
      }
      if (result.wcagCompliance.minorIssues > 0) {
        console.log(`      🟢 Minor Issues: ${result.wcagCompliance.minorIssues}`);
      }

      // Show specific violations if any
      if (result.violations.length > 0) {
        console.log(`      📋 Violations:`);
        result.violations.slice(0, 3).forEach(violation => {
          console.log(`         • ${violation.help} (${violation.impact})`);
        });
        if (result.violations.length > 3) {
          console.log(`         ... and ${result.violations.length - 3} more`);
        }
      }
    }

    // Analyze overall results
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.passed).length;
    const failedTests = testResults.filter(r => !r.passed).length;

    // Aggregate WCAG compliance metrics
    const avgScore = testResults.reduce((sum, r) => sum + r.wcagCompliance.score, 0) / totalTests;
    const totalCritical = testResults.reduce((sum, r) => sum + r.wcagCompliance.criticalIssues, 0);
    const totalSerious = testResults.reduce((sum, r) => sum + r.wcagCompliance.seriousIssues, 0);
    const totalModerate = testResults.reduce((sum, r) => sum + r.wcagCompliance.moderateIssues, 0);
    const totalMinor = testResults.reduce((sum, r) => sum + r.wcagCompliance.minorIssues, 0);

    console.log(`\n📊 WCAG 2.1 AA ACCESSIBILITY SUMMARY:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests} ✅`);
    console.log(`   Failed: ${failedTests} ❌`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`   Average WCAG Score: ${avgScore.toFixed(1)}%`);

    console.log(`\n⚠️  ISSUES BREAKDOWN:`);
    console.log(`   Critical: ${totalCritical} 🔴`);
    console.log(`   Serious: ${totalSerious} 🟠`);
    console.log(`   Moderate: ${totalModerate} 🟡`);
    console.log(`   Minor: ${totalMinor} 🟢`);

    // Priority-based analysis
    const criticalTests = testResults.filter(r => r.testCase.priority === 'critical');
    const criticalPassed = criticalTests.filter(r => r.passed).length;

    console.log(`\n🎯 CRITICAL PATH ANALYSIS:`);
    console.log(`   Critical Pages: ${criticalPassed}/${criticalTests.length}`);
    console.log(`   Status: ${criticalPassed === criticalTests.length ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);

    // WCAG principle analysis
    console.log(`\n📚 WCAG PRINCIPLES STATUS:`);
    analyzeWCAGPrinciples();

    if (failedTests > 0) {
      console.log(`\n🚨 FAILED TESTS ANALYSIS:`);
      testResults
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`\n   ❌ ${result.testCase.name}`);
          console.log(`      Score: ${result.wcagCompliance.score.toFixed(1)}%`);
          console.log(`      Critical: ${result.wcagCompliance.criticalIssues}, Serious: ${result.wcagCompliance.seriousIssues}`);

          if (result.violations.length > 0) {
            console.log(`      Top Violations:`);
            result.violations.slice(0, 2).forEach(violation => {
              console.log(`         • ${violation.help}`);
            });
          }
        });
    }

    console.log(`\n♿ ACCESSIBILITY COMPLIANCE STATUS:`);
    if (totalCritical === 0 && totalSerious === 0 && avgScore >= 80) {
      console.log(`   ✅ EXCELLENT: WCAG 2.1 AA compliance achieved`);
      console.log(`   ✅ Application is highly accessible to users with disabilities`);
      console.log(`   ✅ Critical accessibility issues resolved`);
    } else if (totalCritical === 0) {
      console.log(`   ⚠️  GOOD: No critical accessibility violations`);
      console.log(`   ⚠️  Some improvements needed for full WCAG AA compliance`);
    } else {
      console.log(`   🚨 CRITICAL: ${totalCritical} critical accessibility violations found`);
      console.log(`   🚨 Immediate action required for compliance`);
    }

    console.log(`\n📈 ACCESSIBILITY IMPROVEMENT RECOMMENDATIONS:`);
    if (totalCritical > 0) {
      console.log(`   🔴 URGENT: Fix ${totalCritical} critical accessibility issues`);
    }
    if (totalSerious > 0) {
      console.log(`   🟠 HIGH: Address ${totalSerious} serious accessibility issues`);
    }
    if (totalModerate > 0) {
      console.log(`   🟡 MEDIUM: Improve ${totalModerate} moderate accessibility issues`);
    }
    if (totalMinor > 0) {
      console.log(`   🟢 LOW: Consider ${totalMinor} minor accessibility improvements`);
    }

    console.log(`\n🎯 NEXT STEPS:`);
    console.log(`   🔧 Review and fix color contrast issues`);
    console.log(`   🔧 Ensure all form fields have proper labels`);
    console.log(`   🔧 Add proper ARIA landmarks and roles`);
    console.log(`   🔧 Implement keyboard navigation for all interactive elements`);
    console.log(`   🔧 Add skip links for keyboard users`);
    console.log(`   🔧 Test with actual assistive technologies`);
    console.log(`   🔧 Conduct accessibility testing with real users`);

    // Overall accessibility assertions
    expect(criticalPassed).toBe(criticalTests.length);
    expect(totalCritical).toBe(0);
    expect(avgScore).toBeGreaterThan(80);
  });

  /**
   * Analyze WCAG principles compliance
   */
  function analyzeWCAGPrinciples(): void {
    const principleCounts = {
      perceivable: { total: 0, violations: 0 },
      operable: { total: 0, violations: 0 },
      understandable: { total: 0, violations: 0 },
      robust: { total: 0, violations: 0 }
    };

    testResults.forEach(result => {
      result.violations.forEach(violation => {
        const tags = violation.tags || [];
        tags.forEach(tag => {
          if (tag.includes('wcag2a') || tag.includes('color-contrast')) {
            principleCounts.perceivable.violations++;
          } else if (tag.includes('keyboard') || tag.includes('focus')) {
            principleCounts.operable.violations++;
          } else if (tag.includes('label') || tag.includes('title')) {
            principleCounts.understandable.violations++;
          } else if (tag.includes('aria') || tag.includes('role')) {
            principleCounts.robust.violations++;
          }
        });
      });
    });

    console.log(`   Perceivable: ${principleCounts.perceivable.violations === 0 ? '✅' : '❌'}`);
    console.log(`   Operable: ${principleCounts.operable.violations === 0 ? '✅' : '❌'}`);
    console.log(`   Understandable: ${principleCounts.understandable.violations === 0 ? '✅' : '❌'}`);
    console.log(`   Robust: ${principleCounts.robust.violations === 0 ? '✅' : '❌'}`);
  }
});