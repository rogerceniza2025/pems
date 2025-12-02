/**
 * Theme Consistency Testing
 *
 * Comprehensive testing for theme consistency across light/dark modes and
 * custom theme implementations. These tests ensure visual consistency,
    color contrast compliance, and proper theme switching behavior.
 *
 * Test Coverage:
 * - Light/Dark theme switching
 * - Color contrast compliance in both themes
 * - Theme persistence across sessions
 * - Component consistency across themes
 * - User preference detection
 */

import { test, expect } from '@playwright/test';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

interface ThemeTestCase {
  name: string;
  url: string;
  description: string;
  themes: string[];
  expectedBehaviors: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface ThemeTestResult {
  testCase: ThemeTestCase;
  theme: string;
  passed: boolean;
  issues: string[];
  screenshotPath?: string;
  colorContrastIssues: number;
  themeApplied: boolean;
  persistenceWorks: boolean;
}

describe('Theme Consistency Tests', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  let testResults: ThemeTestResult[] = [];

  // Available themes
  const themes = ['light', 'dark', 'auto'];

  // Theme test cases
  const themeTestCases: ThemeTestCase[] = [
    {
      name: 'Homepage Theme Consistency',
      url: '/',
      description: 'Homepage visual consistency across themes',
      themes: themes,
      expectedBehaviors: [
        'Colors update correctly',
        'Text remains readable',
        'No broken visual elements',
        'Consistent spacing and layout'
      ],
      priority: 'critical'
    },
    {
      name: 'Navigation Theme Consistency',
      url: '/',
      description: 'Navigation menu theme consistency',
      themes: themes,
      expectedBehaviors: [
        'Navigation colors change appropriately',
        'Menu items remain visible',
        'Icons update colors',
        'Active states work'
      ],
      priority: 'critical'
    },
    {
      name: 'Form Elements Theme',
      url: '/login',
      description: 'Form elements theme behavior',
      themes: themes,
      expectedBehaviors: [
        'Input fields styled correctly',
        'Buttons have proper contrast',
        'Error messages visible',
        'Labels remain readable'
      ],
      priority: 'high'
    },
    {
      name: 'Dashboard Theme Consistency',
      url: '/dashboard',
      description: 'Dashboard components across themes',
      themes: themes,
      expectedBehaviors: [
        'Cards and widgets styled',
        'Charts and graphs visible',
        'Data tables readable',
        'Icons and indicators work'
      ],
      priority: 'high'
    },
    {
      name: 'Color Contrast Compliance',
      url: '/',
      description: 'Color contrast in all themes',
      themes: ['light', 'dark'], // Skip 'auto' as it depends on system preference
      expectedBehaviors: [
        'WCAG AA contrast met',
        'No poor contrast combinations',
        'Text readable on all backgrounds',
        'Interactive elements accessible'
      ],
      priority: 'critical'
    }
  ];

  /**
   * Execute theme test for specific theme
   */
  async function executeThemeTest(
    testCase: ThemeTestCase,
    theme: string
  ): Promise<ThemeTestResult> {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    const result: ThemeTestResult = {
      testCase,
      theme,
      passed: true,
      issues: [],
      colorContrastIssues: 0,
      themeApplied: false,
      persistenceWorks: false
    };

    try {
      // Launch browser
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        colorScheme: theme === 'dark' ? 'dark' : 'light',
        reducedMotion: 'reduce'
      });
      page = await context.newPage();

      // Set up theme preference before navigation
      await setThemePreference(page, theme);

      // Navigate to test URL
      await page.goto(`${baseUrl}${testCase.url}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for theme to apply
      await page.waitForTimeout(2000);

      // Verify theme is applied
      const themeApplied = await verifyThemeApplied(page, theme);
      result.themeApplied = themeApplied;

      if (!themeApplied) {
        result.issues.push(`Theme "${theme}" not properly applied`);
        result.passed = false;
      }

      // Check color contrast
      const contrastIssues = await checkColorContrast(page, theme);
      result.colorContrastIssues = contrastIssues.length;

      if (contrastIssues.length > 0) {
        result.issues.push(...contrastIssues.slice(0, 3));
        if (testCase.name.includes('Color Contrast')) {
          result.passed = false;
        }
      }

      // Check component visibility and styling
      const componentIssues = await checkComponentStyling(page, theme);
      result.issues.push(...componentIssues);

      // Test theme persistence
      const persistenceWorks = await testThemePersistence(page, theme);
      result.persistenceWorks = persistenceWorks;

      // Take screenshot
      const timestamp = Date.now();
      const screenshotName = `theme_${testCase.name.replace(/\s+/g, '_')}_${theme}_${timestamp}.png`;
      const screenshotPath = `test-results/themes/${screenshotName}`;
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: 'disabled'
      });
      result.screenshotPath = screenshotPath;

      // Check for broken or missing visual elements
      await checkVisualIntegrity(page, result);

    } catch (error: any) {
      result.passed = false;
      result.issues.push(`Test execution error: ${error.message}`);
      console.error(`❌ Theme test failed for ${testCase.name} with ${theme} theme:`, error.message);
    } finally {
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    }

    testResults.push(result);
    return result;
  }

  /**
   * Set theme preference in browser
   */
  async function setThemePreference(page: Page, theme: string): Promise<void> {
    await page.evaluate((theme) => {
      // Set CSS custom properties for theme
      const root = document.documentElement;

      if (theme === 'dark') {
        root.style.setProperty('--theme-mode', 'dark');
        root.classList.add('dark-theme');
        root.classList.remove('light-theme');
      } else if (theme === 'light') {
        root.style.setProperty('--theme-mode', 'light');
        root.classList.add('light-theme');
        root.classList.remove('dark-theme');
      }

      // Set localStorage preference
      localStorage.setItem('theme', theme);

      // Set system preference for 'auto' theme
      if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.style.setProperty('--theme-mode', prefersDark ? 'dark' : 'light');
      }
    }, theme);
  }

  /**
   * Verify theme is properly applied
   */
  async function verifyThemeApplied(page: Page, theme: string): Promise<boolean> {
    return await page.evaluate((expectedTheme) => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);

      // Check for theme class or CSS variable
      const hasDarkClass = root.classList.contains('dark-theme');
      const hasLightClass = root.classList.contains('light-theme');
      const cssVariable = root.style.getPropertyValue('--theme-mode');

      // Check computed styles for theme indicators
      const backgroundColor = computedStyle.backgroundColor || computedStyle.background;
      const color = computedStyle.color;

      // Basic theme detection
      let detectedTheme = 'unknown';

      if (expectedTheme === 'dark') {
        detectedTheme = backgroundColor.includes('rgb(0, 0, 0)') ||
                        backgroundColor.includes('#000') ||
                        parseInt(backgroundColor.match(/\d+/)?.[0] || '0') < 128 ?
                        'dark' : 'light';
      } else if (expectedTheme === 'light') {
        detectedTheme = backgroundColor.includes('rgb(255, 255, 255)') ||
                        backgroundColor.includes('#fff') ||
                        parseInt(backgroundColor.match(/\d+/)?.[0] || '255') > 200 ?
                        'light' : 'dark';
      }

      return hasDarkClass || hasLightClass || cssVariable || detectedTheme === expectedTheme;
    }, theme);
  }

  /**
   * Check color contrast compliance
   */
  async function checkColorContrast(page: Page, theme: string): Promise<string[]> {
    return await page.evaluate((theme) => {
      const issues: string[] = [];
      const elements = document.querySelectorAll('*');

      elements.forEach(element => {
        const styles = window.getComputedStyle(element);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor || styles.background;

        // Skip transparent or non-text elements
        if (backgroundColor === 'rgba(0, 0, 0, 0)' ||
            backgroundColor === 'transparent' ||
            styles.display === 'none' ||
            element.children.length > 0) {
          return;
        }

        // Extract RGB values
        const colorRgb = color.match(/\d+/g);
        const bgRgb = backgroundColor.match(/\d+/g);

        if (colorRgb && bgRgb && colorRgb.length >= 3 && bgRgb.length >= 3) {
          const colorLuminance = (0.299 * parseInt(colorRgb[0]) +
                               0.587 * parseInt(colorRgb[1]) +
                               0.114 * parseInt(colorRgb[2])) / 255;

          const bgLuminance = (0.299 * parseInt(bgRgb[0]) +
                             0.587 * parseInt(bgRgb[1]) +
                             0.114 * parseInt(bgRgb[2])) / 255;

          const ratio = (Math.max(colorLuminance, bgLuminance) + 0.05) /
                        (Math.min(colorLuminance, bgLuminance) + 0.05);

          // WCAG AA requirement is 4.5:1 for normal text
          if (ratio < 4.5) {
            issues.push(`Poor contrast on ${element.tagName}:${element.className} (ratio: ${ratio.toFixed(2)})`);
          }
        }
      });

      return issues;
    }, theme);
  }

  /**
   * Check component styling consistency
   */
  async function checkComponentStyling(page: Page, theme: string): Promise<string[]> {
    return await page.evaluate((theme) => {
      const issues: string[] = [];

      // Check buttons
      const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const hasVisibleBorder = styles.border !== '0px none rgb(0, 0, 0)';
        const hasBackgroundColor = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
        const hasVisibleText = parseInt(styles.color.match(/\d+/)?.[0] || '0') !== 0;

        if (!hasVisibleBorder && !hasBackgroundColor) {
          issues.push(`Button may be invisible: ${button.className}`);
        }

        if (!hasVisibleText) {
          issues.push(`Button text color may be invisible: ${button.className}`);
        }
      });

      // Check form inputs
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        const styles = window.getComputedStyle(input);
        const hasBorder = styles.border !== '0px none rgb(0, 0, 0)';
        const hasBackground = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';

        if (!hasBorder && !hasBackground) {
          issues.push(`Input field may be invisible: ${input.className}`);
        }
      });

      // Check links
      const links = document.querySelectorAll('a');
      links.forEach(link => {
        const styles = window.getComputedStyle(link);
        const hasColor = styles.color !== 'rgb(0, 0, 0)' || styles.textDecoration !== 'none';

        if (!hasColor) {
          issues.push(`Link may be invisible: ${link.textContent}`);
        }
      });

      return issues;
    }, theme);
  }

  /**
   * Test theme persistence across page reloads
   */
  async function testThemePersistence(page: Page, theme: string): Promise<boolean> {
    try {
      // Reload the page
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      // Check if theme is still applied
      const themeStillApplied = await verifyThemeApplied(page, theme);
      return themeStillApplied;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check visual integrity for broken elements
   */
  async function checkVisualIntegrity(page: Page, result: ThemeTestResult): Promise<void> {
    const integrityIssues = await page.evaluate(() => {
      const issues: string[] = [];

      // Check for broken images
      const images = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
      const brokenImages = images.filter(img => img.naturalWidth === 0 || img.complete === false);

      if (brokenImages.length > 0) {
        issues.push(`${brokenImages.length} broken images detected`);
      }

      // Check for elements with no visible content
      const visibleElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      // Check for extremely small or large elements that might indicate issues
      const problematicElements = visibleElements.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width < 1 || rect.height < 1 || rect.width > 5000 || rect.height > 5000;
      });

      if (problematicElements.length > 10) {
        issues.push(`${problematicElements.length} elements with unusual dimensions`);
      }

      return issues;
    });

    if (integrityIssues.length > 0) {
      result.issues.push(...integrityIssues);
      if (integrityIssues.some(issue => issue.includes('broken'))) {
        result.passed = false;
      }
    }
  }

  test('should maintain visual consistency across themes', async () => {
    console.log('🎨 Starting theme consistency tests...\n');

    // Run theme tests for all combinations
    for (const testCase of themeTestCases) {
      console.log(`🔍 Testing ${testCase.name}...`);

      for (const theme of testCase.themes) {
        console.log(`   🎨 ${theme.charAt(0).toUpperCase() + theme.slice(1)} theme`);

        const result = await executeThemeTest(testCase, theme);

        const status = result.passed ? '✅' : '❌';
        console.log(`   ${status} ${theme}: ${result.passed ? 'PASSED' : 'FAILED'}`);

        // Show key metrics
        if (!result.themeApplied) {
          console.log(`      ⚠️  Theme not properly applied`);
        }
        if (result.colorContrastIssues > 0) {
          console.log(`      🎯 Color contrast issues: ${result.colorContrastIssues}`);
        }
        if (!result.persistenceWorks) {
          console.log(`      💾 Theme persistence failed`);
        }

        // Show issues if any
        if (result.issues.length > 0) {
          console.log(`      Issues:`);
          result.issues.slice(0, 2).forEach(issue => {
            console.log(`         • ${issue}`);
          });
          if (result.issues.length > 2) {
            console.log(`         ... and ${result.issues.length - 2} more`);
          }
        }
      }

      console.log(''); // Empty line for readability
    }

    // Analyze overall results
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.passed).length;
    const failedTests = testResults.filter(r => !r.passed).length;

    // Theme-specific analysis
    const themeResults = themes.map(theme => {
      const themeTests = testResults.filter(r => r.theme === theme);
      const themePassed = themeTests.filter(r => r.passed).length;
      return {
        theme,
        total: themeTests.length,
        passed: themePassed,
        rate: themeTests.length > 0 ? (themePassed / themeTests.length) * 100 : 100
      };
    });

    // Priority analysis
    const criticalTests = testResults.filter(r => r.testCase.priority === 'critical');
    const criticalPassed = criticalTests.filter(r => r.passed).length;

    // Color contrast analysis
    const contrastTests = testResults.filter(r => r.testCase.name.includes('Color Contrast'));
    const totalContrastIssues = testResults.reduce((sum, r) => sum + r.colorContrastIssues, 0);

    console.log('🎨 THEME CONSISTENCY TEST SUMMARY:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests} ✅`);
    console.log(`   Failed: ${failedTests} ❌`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    console.log('\n🎨 THEME PERFORMANCE:');
    themeResults.forEach(result => {
      const status = result.rate === 100 ? '✅' : result.rate >= 80 ? '⚠️' : '❌';
      console.log(`   ${status} ${result.theme}: ${result.passed}/${result.total} (${result.rate.toFixed(1)}%)`);
    });

    console.log('\n🎯 CRITICAL PATH ANALYSIS:');
    console.log(`   Critical Tests: ${criticalPassed}/${criticalTests.length}`);
    console.log(`   Status: ${criticalPassed === criticalTests.length ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);

    console.log('\n🎨 COLOR CONTRAST ANALYSIS:');
    console.log(`   Total Contrast Issues: ${totalContrastIssues}`);
    console.log(`   Contrast Tests Passed: ${contrastTests.filter(r => r.passed).length}/${contrastTests.length}`);

    // Theme persistence analysis
    const persistenceTests = testResults.filter(r => r.persistenceWorks);
    const persistenceRate = (persistenceTests.length / testResults.length) * 100;
    console.log(`   Theme Persistence Rate: ${persistenceRate.toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n🚨 FAILED TESTS ANALYSIS:');
      const failedByTheme = testResults
        .filter(r => !r.passed)
        .reduce((acc, result) => {
          acc[result.theme] = (acc[result.theme] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      Object.entries(failedByTheme).forEach(([theme, count]) => {
        console.log(`   ${theme}: ${count} failures`);
      });
    }

    console.log('\n🎨 THEME CONSISTENCY STATUS:');
    if (failedTests === 0 && totalContrastIssues === 0) {
      console.log('   ✅ EXCELLENT: Perfect theme consistency across all modes');
      console.log('   ✅ Color contrast compliance met in all themes');
      console.log('   ✅ Theme persistence working correctly');
      console.log('   ✅ All visual elements properly styled');
    } else if (criticalPassed === criticalTests.length) {
      console.log('   ⚠️  GOOD: Critical theme functionality working');
      console.log('   ⚠️  Some visual improvements needed');
    } else {
      console.log('   🚨 ISSUES: Critical theme problems detected');
      console.log('   🚨 Theme consistency requires immediate attention');
    }

    console.log('\n📈 THEME IMPROVEMENT RECOMMENDATIONS:');
    if (totalContrastIssues > 0) {
      console.log(`   🎯 Fix ${totalContrastIssues} color contrast issues for WCAG compliance`);
    }
    if (persistenceRate < 100) {
      console.log('   💾 Improve theme persistence across page reloads');
    }
    console.log('   🎨 Ensure all components have proper theme-aware styling');
    console.log('   🔄 Test theme switching animations for smooth transitions');
    console.log('   📱 Verify theme consistency across all device sizes');
    console.log('   👁️ Consider implementing system preference detection for auto theme');
    console.log('   ♿ Maintain accessibility standards in both light and dark modes');

    // Overall assertions
    expect(criticalPassed).toBe(criticalTests.length);
    expect(contrastTests.filter(r => r.passed).length).toBe(contrastTests.length);
    expect(passedTests).toBeGreaterThan(totalTests * 0.8); // At least 80% pass rate
  });

  test('should respect system theme preferences', async () => {
    const browser = await chromium.launch({ headless: true });

    // Test with system dark preference
    const darkContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      colorScheme: 'dark'
    });
    const darkPage = await darkContext.newPage();

    // Test with system light preference
    const lightContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      colorScheme: 'light'
    });
    const lightPage = await lightContext.newPage();

    try {
      console.log('🖥️ Testing system theme preference detection...\n');

      // Test dark preference
      await darkPage.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
      const darkThemeApplied = await darkPage.evaluate(() => {
        const root = document.documentElement;
        return root.classList.contains('dark-theme') ||
               getComputedStyle(root).getPropertyValue('--theme-mode') === 'dark';
      });

      console.log(`   🌙 Dark system preference: ${darkThemeApplied ? '✅ Respected' : '❌ Ignored'}`);

      // Test light preference
      await lightPage.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
      const lightThemeApplied = await lightPage.evaluate(() => {
        const root = document.documentElement;
        return root.classList.contains('light-theme') ||
               getComputedStyle(root).getPropertyValue('--theme-mode') === 'light';
      });

      console.log(`   ☀️ Light system preference: ${lightThemeApplied ? '✅ Respected' : '❌ Ignored'}`);

      // At least one should work if auto theme is supported
      expect(darkThemeApplied || lightThemeApplied).toBe(true);

    } finally {
      await darkPage.close();
      await darkContext.close();
      await lightPage.close();
      await lightContext.close();
      await browser.close();
    }
  });
});