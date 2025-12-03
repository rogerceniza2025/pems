/**
 * Responsive Design Testing
 *
 * Comprehensive testing for responsive design across different screen sizes,
 * devices, and orientations. These tests ensure the application adapts correctly
 * to various viewport sizes and maintains usability across all devices.
 *
 * Test Coverage:
 * - Mobile-first responsive design
 * - Tablet and desktop layouts
 * - Landscape and portrait orientations
 * - Breakpoint behavior validation
 * - Touch-friendly interface elements
 * - Readability and spacing optimization
 */

import { test, expect, devices } from '@playwright/test';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

interface ResponsiveTestCase {
  name: string;
  url: string;
  description: string;
  breakpoints: { name: string; width: number; height: number }[];
  expectedBehaviors: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface ResponsiveTestResult {
  testCase: ResponsiveTestCase;
  breakpoint: string;
  viewport: { width: number; height: number };
  passed: boolean;
  issues: string[];
  screenshotPath?: string;
  metrics: {
    horizontalScroll: boolean;
    elementsOverflow: number;
    textReadability: number;
    touchTargetSize: number;
    layoutShifts: number;
  };
}

describe('Responsive Design Tests', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  let testResults: ResponsiveTestResult[] = [];

  // Device breakpoints for testing
  const breakpoints = [
    { name: 'Mobile Small', width: 320, height: 568 },   // iPhone SE
    { name: 'Mobile Large', width: 414, height: 896 },   // iPhone Pro
    { name: 'Tablet', width: 768, height: 1024 },       // iPad
    { name: 'Tablet Landscape', width: 1024, height: 768 }, // iPad Landscape
    { name: 'Desktop Small', width: 1280, height: 720 }, // Small desktop
    { name: 'Desktop Large', width: 1920, height: 1080 }, // Large desktop
    { name: 'Ultra Wide', width: 2560, height: 1440 }     // Ultra-wide monitors
  ];

  // Responsive test cases
  const responsiveTestCases: ResponsiveTestCase[] = [
    {
      name: 'Homepage Responsive Layout',
      url: '/',
      description: 'Homepage layout across all breakpoints',
      breakpoints: breakpoints,
      expectedBehaviors: [
        'No horizontal scroll',
        'Navigation adapts to screen size',
        'Content remains readable',
        'Images scale appropriately'
      ],
      priority: 'critical'
    },
    {
      name: 'Navigation Responsive Behavior',
      url: '/',
      description: 'Navigation menu responsive behavior',
      breakpoints: breakpoints.slice(0, 5), // Test up to desktop small
      expectedBehaviors: [
        'Mobile uses hamburger menu',
        'Tablet shows expanded navigation',
        'Desktop shows full navigation',
        'All menu items accessible'
      ],
      priority: 'critical'
    },
    {
      name: 'Login Form Responsive',
      url: '/login',
      description: 'Login form responsive layout',
      breakpoints: breakpoints.slice(0, 4), // Test up to tablet landscape
      expectedBehaviors: [
        'Form fields remain usable',
        'Buttons have adequate touch targets',
        'Error messages are visible',
        'Form stays centered'
      ],
      priority: 'high'
    },
    {
      name: 'Dashboard Responsive Grid',
      url: '/dashboard',
      description: 'Dashboard grid layout responsiveness',
      breakpoints: breakpoints.slice(1, 6), // Test mobile large to desktop large
      expectedBehaviors: [
        'Grid adapts column count',
        'Cards remain readable',
        'Charts scale properly',
        'Data tables handle overflow'
      ],
      priority: 'high'
    },
    {
      name: 'Student Profile Responsive',
      url: '/students/profile',
      description: 'Student profile page responsiveness',
      breakpoints: breakpoints.slice(0, 5),
      expectedBehaviors: [
        'Form fields adapt to width',
        'Profile picture scales',
        'Tabs/sections work on mobile',
        'Save buttons remain accessible'
      ],
      priority: 'medium'
    },
    {
      name: 'Search Results Responsive',
      url: '/search?q=test',
      description: 'Search results responsive layout',
      breakpoints: breakpoints,
      expectedBehaviors: [
        'Results list adapts',
        'Filters work on all sizes',
        'Pagination accessible',
        'No content overlap'
      ],
      priority: 'medium'
    }
  ];

  /**
   * Execute responsive test for specific breakpoint
   */
  async function executeResponsiveTest(
    testCase: ResponsiveTestCase,
    breakpoint: { name: string; width: number; height: number }
  ): Promise<ResponsiveTestResult> {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    const result: ResponsiveTestResult = {
      testCase,
      breakpoint: breakpoint.name,
      viewport: { width: breakpoint.width, height: breakpoint.height },
      passed: true,
      issues: [],
      metrics: {
        horizontalScroll: false,
        elementsOverflow: 0,
        textReadability: 100,
        touchTargetSize: 44, // iOS minimum
        layoutShifts: 0
      }
    };

    try {
      // Launch browser with mobile emulation if needed
      browser = await chromium.launch({ headless: true });

      // Configure context for responsive testing
      const isMobile = breakpoint.width < 768;
      context = await browser.newContext({
        viewport: { width: breakpoint.width, height: breakpoint.height },
        userAgent: isMobile ?
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' :
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // Mobile device features
        hasTouch: isMobile,
        // Reduced motion for consistent testing
        reducedMotion: 'reduce'
      });

      page = await context.newPage();

      // Monitor layout shifts
      const layoutShifts = await monitorLayoutShifts(page);

      // Navigate to test URL
      await page.goto(`${baseUrl}${testCase.url}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for dynamic content
      await page.waitForTimeout(2000);

      // Take initial screenshot
      const timestamp = Date.now();
      const screenshotName = `responsive_${testCase.name.replace(/\s+/g, '_')}_${breakpoint.name}_${timestamp}.png`;
      const screenshotPath = `test-results/responsive/${screenshotName}`;
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: 'disabled'
      });
      result.screenshotPath = screenshotPath;

      // Perform responsive checks
      await checkHorizontalScroll(page, result);
      await checkElementOverflow(page, result);
      await checkTextReadability(page, result);
      await checkTouchTargetSizes(page, result);
      await checkNavigationBehavior(page, result, isMobile);
      await checkImageResponsiveness(page, result);
      await checkFormUsability(page, result, isMobile);

      // Get layout shift count
      result.metrics.layoutShifts = layoutShifts;

      // Evaluate overall pass/fail
      result.passed = result.issues.length === 0 && result.metrics.horizontalScroll === false;

    } catch (error: any) {
      result.passed = false;
      result.issues.push(`Test execution error: ${error.message}`);
      console.error(`❌ Responsive test failed for ${testCase.name} at ${breakpoint.name}:`, error.message);
    } finally {
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    }

    testResults.push(result);
    return result;
  }

  /**
   * Monitor layout shifts during page load
   */
  async function monitorLayoutShifts(page: Page): Promise<number> {
    let layoutShiftCount = 0;

    await page.evaluateOnNewDocument(() => {
      // Performance Observer for layout shifts
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              (window as any).__layoutShifts = ((window as any).__layoutShifts || 0) + 1;
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      }
    });

    // Return layout shift count after page load
    await page.waitForTimeout(3000);
    const shifts = await page.evaluate(() => (window as any).__layoutShifts || 0);
    return shifts;
  }

  /**
   * Check for horizontal scroll
   */
  async function checkHorizontalScroll(page: Page, result: ResponsiveTestResult): Promise<void> {
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });

    result.metrics.horizontalScroll = hasHorizontalScroll;

    if (hasHorizontalScroll) {
      result.issues.push('Horizontal scroll detected - content exceeds viewport width');
    }
  }

  /**
   * Check for elements that overflow viewport
   */
  async function checkElementOverflow(page: Page, result: ResponsiveTestResult): Promise<void> {
    const overflowCount = await page.evaluate((viewportWidth) => {
      let overflowElements = 0;
      const elements = document.querySelectorAll('*');

      elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        if (rect.right > viewportWidth && rect.left >= 0) {
          overflowElements++;
        }
      });

      return overflowElements;
    }, result.viewport.width);

    result.metrics.elementsOverflow = overflowCount;

    if (overflowCount > 5) { // Allow some overflow for shadows/absolute positioning
      result.issues.push(`${overflowCount} elements overflow viewport width`);
    }
  }

  /**
   * Check text readability
   */
  async function checkTextReadability(page: Page, result: ResponsiveTestResult): Promise<void> {
    const readabilityScore = await page.evaluate(() => {
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, span, a, button, label');
      let totalElements = 0;
      let readableElements = 0;

      textElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        const fontSize = parseFloat(styles.fontSize);
        const lineHeight = parseFloat(styles.lineHeight);
        const letterSpacing = parseFloat(styles.letterSpacing);

        totalElements++;

        // Check if text is readable based on viewport size
        const isReadable = fontSize >= 14 && // Minimum font size
                          lineHeight >= 1.2 && // Minimum line height
                          letterSpacing >= -0.5; // Not too compressed

        if (isReadable) {
          readableElements++;
        }
      });

      return totalElements > 0 ? (readableElements / totalElements) * 100 : 100;
    });

    result.metrics.textReadability = Math.round(readabilityScore);

    if (readabilityScore < 80) {
      result.issues.push(`Text readability score: ${readabilityScore.toFixed(1)}% (below 80%)`);
    }
  }

  /**
   * Check touch target sizes for mobile
   */
  async function checkTouchTargetSizes(page: Page, result: ResponsiveTestResult): Promise<void> {
    const touchTargetIssues = await page.evaluate((viewportWidth) => {
      const issues: string[] = [];
      const touchElements = document.querySelectorAll('a, button, input[type="submit"], input[type="button"], input[type="checkbox"], input[type="radio"], [role="button"], [tabindex]:not([tabindex="-1"])');

      touchElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const minSize = viewportWidth < 768 ? 44 : 32; // iOS vs desktop minimum

        if (rect.width < minSize || rect.height < minSize) {
          issues.push(`${element.tagName.toLowerCase()} element too small: ${rect.width}x${rect.height}px (minimum ${minSize}px)`);
        }
      });

      return issues;
    }, result.viewport.width);

    if (touchTargetIssues.length > 0 && result.viewport.width < 768) {
      result.issues.push(...touchTargetIssues.slice(0, 3)); // Limit to top 3 issues
    }
  }

  /**
   * Check navigation behavior for mobile vs desktop
   */
  async function checkNavigationBehavior(page: Page, result: ResponsiveTestResult, isMobile: boolean): Promise<void> {
    const navIssues = await page.evaluate((isMobile) => {
      const issues: string[] = [];
      const navElement = document.querySelector('nav, [role="navigation"]');

      if (!navElement) {
        issues.push('No navigation element found');
        return issues;
      }

      // Check for hamburger menu on mobile
      if (isMobile) {
        const hamburgerButton = navElement.querySelector('.hamburger, .menu-toggle, [aria-label*="menu"], [aria-label*="navigation"]');
        if (!hamburgerButton) {
          issues.push('Mobile navigation missing hamburger menu or toggle button');
        }

        // Check if main navigation is hidden by default on mobile
        const navLinks = navElement.querySelectorAll('ul li a, .nav-link');
        const visibleLinks = Array.from(navLinks).filter(link => {
          const rect = (link as Element).getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });

        if (visibleLinks.length > 3) { // Too many visible links on mobile
          issues.push('Too many navigation links visible on mobile');
        }
      } else {
        // Desktop navigation should be fully visible
        const navLinks = navElement.querySelectorAll('ul li a, .nav-link');
        const hamburgerButton = navElement.querySelector('.hamburger, .menu-toggle');

        if (hamburgerButton && navLinks.length > 0) {
          issues.push('Desktop navigation shows hamburger menu instead of full menu');
        }
      }

      return issues;
    }, isMobile);

    if (navIssues.length > 0) {
      result.issues.push(...navIssues);
    }
  }

  /**
   * Check image responsiveness
   */
  async function checkImageResponsiveness(page: Page, result: ResponsiveTestResult): Promise<void> {
    const imageIssues = await page.evaluate((viewportWidth) => {
      const issues: string[] = [];
      const images = document.querySelectorAll('img');

      images.forEach(img => {
        const rect = img.getBoundingClientRect();

        // Check if images exceed viewport width
        if (rect.width > viewportWidth) {
          issues.push(`Image exceeds viewport width: ${rect.width}px`);
        }

        // Check for missing alt text
        if (!img.alt && img.alt !== '') {
          issues.push(`Image missing alt text: ${img.src}`);
        }

        // Check for stretched images
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        if (naturalWidth > 0 && naturalHeight > 0) {
          const aspectRatio = naturalWidth / naturalHeight;
          const displayedAspectRatio = rect.width / rect.height;
          const ratioDifference = Math.abs(aspectRatio - displayedAspectRatio) / aspectRatio;

          if (ratioDifference > 0.2) { // 20% difference
            issues.push(`Image aspect ratio distorted: ${img.src}`);
          }
        }
      });

      return issues;
    }, result.viewport.width);

    if (imageIssues.length > 0) {
      result.issues.push(...imageIssues.slice(0, 3)); // Limit to top 3 issues
    }
  }

  /**
   * Check form usability on different screen sizes
   */
  async function checkFormUsability(page: Page, result: ResponsiveTestResult, isMobile: boolean): Promise<void> {
    const formIssues = await page.evaluate((isMobile) => {
      const issues: string[] = [];
      const forms = document.querySelectorAll('form');

      forms.forEach(form => {
        const formFields = form.querySelectorAll('input, select, textarea');

        formFields.forEach(field => {
          const rect = (field as Element).getBoundingClientRect();

          // Check if form fields are too small for touch
          if (isMobile && (rect.width < 280 || rect.height < 44)) {
            issues.push(`Form field too small for touch on mobile: ${rect.width}x${rect.height}px`);
          }

          // Check for proper labels
          const label = document.querySelector(`label[for="${(field as HTMLInputElement).id}"]`) ||
                      (field as Element).closest('label');
          if (!label) {
            issues.push(`Form field missing label: ${(field as HTMLInputElement).name || (field as HTMLInputElement).type}`);
          }
        });

        // Check form layout
        const formRect = form.getBoundingClientRect();
        if (formRect.width > (isMobile ? 340 : 600)) { // Reasonable max widths
          issues.push('Form too wide for comfortable reading');
        }
      });

      return issues;
    }, isMobile);

    if (formIssues.length > 0) {
      result.issues.push(...formIssues.slice(0, 3));
    }
  }

  test('should adapt layout correctly across all breakpoints', async () => {
    console.log('📱 Starting responsive design tests across breakpoints...\n');

    // Run tests for all responsive test cases
    for (const testCase of responsiveTestCases) {
      console.log(`🔍 Testing ${testCase.name}...`);

      for (const breakpoint of testCase.breakpoints) {
        console.log(`   📐 ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`);

        const result = await executeResponsiveTest(testCase, breakpoint);

        const status = result.passed ? '✅' : '❌';
        console.log(`   ${status} ${breakpoint.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);

        // Show key metrics
        if (result.metrics.horizontalScroll) {
          console.log(`      ⚠️  Horizontal scroll detected`);
        }
        if (result.metrics.textReadability < 80) {
          console.log(`      📖 Text readability: ${result.metrics.textReadability}%`);
        }
        if (result.metrics.layoutShifts > 0) {
          console.log(`      🔄 Layout shifts: ${result.metrics.layoutShifts}`);
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

    // Breakpoint-specific analysis
    const breakpointResults = breakpoints.map(bp => {
      const bpTests = testResults.filter(r => r.breakpoint === bp.name);
      const bpPassed = bpTests.filter(r => r.passed).length;
      return {
        breakpoint: bp.name,
        total: bpTests.length,
        passed: bpPassed,
        rate: bpTests.length > 0 ? (bpPassed / bpTests.length) * 100 : 100
      };
    });

    // Priority analysis
    const criticalTests = testResults.filter(r => r.testCase.priority === 'critical');
    const criticalPassed = criticalTests.filter(r => r.passed).length;

    // Device category analysis
    const mobileTests = testResults.filter(r => r.viewport.width < 768);
    const tabletTests = testResults.filter(r => r.viewport.width >= 768 && r.viewport.width < 1024);
    const desktopTests = testResults.filter(r => r.viewport.width >= 1024);

    console.log('📊 RESPONSIVE DESIGN TEST SUMMARY:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests} ✅`);
    console.log(`   Failed: ${failedTests} ❌`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    console.log('\n📱 DEVICE CATEGORY ANALYSIS:');
    console.log(`   Mobile (<768px): ${mobileTests.filter(r => r.passed).length}/${mobileTests.length} ✅`);
    console.log(`   Tablet (768-1024px): ${tabletTests.filter(r => r.passed).length}/${tabletTests.length} ✅`);
    console.log(`   Desktop (>1024px): ${desktopTests.filter(r => r.passed).length}/${desktopTests.length} ✅`);

    console.log('\n📐 BREAKPOINT PERFORMANCE:');
    breakpointResults.forEach(result => {
      const status = result.rate === 100 ? '✅' : result.rate >= 80 ? '⚠️' : '❌';
      console.log(`   ${status} ${result.breakpoint}: ${result.passed}/${result.total} (${result.rate.toFixed(1)}%)`);
    });

    console.log('\n🎯 CRITICAL PATH ANALYSIS:');
    console.log(`   Critical Tests: ${criticalPassed}/${criticalTests.length}`);
    console.log(`   Status: ${criticalPassed === criticalTests.length ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);

    // Common issues analysis
    const allIssues = testResults.flatMap(r => r.issues);
    const commonIssues = allIssues.reduce((acc, issue) => {
      const key = issue.split(':')[0]; // Group by issue type
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (Object.keys(commonIssues).length > 0) {
      console.log('\n🔍 COMMON RESPONSIVE ISSUES:');
      Object.entries(commonIssues)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([issue, count]) => {
          console.log(`   ${count}x ${issue}`);
        });
    }

    if (failedTests > 0) {
      console.log('\n🚨 FAILED TESTS ANALYSIS:');
      const failedResults = testResults.filter(r => !r.passed);
      const failuresByBreakpoint = failedResults.reduce((acc, result) => {
        acc[result.breakpoint] = (acc[result.breakpoint] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(failuresByBreakpoint).forEach(([breakpoint, count]) => {
        console.log(`   ${breakpoint}: ${count} failures`);
      });
    }

    console.log('\n📱 RESPONSIVE DESIGN STATUS:');
    if (failedTests === 0) {
      console.log('   ✅ EXCELLENT: Fully responsive across all breakpoints');
      console.log('   ✅ No horizontal scroll issues detected');
      console.log('   ✅ Touch targets meet minimum size requirements');
      console.log('   ✅ Text readability maintained across all sizes');
    } else if (failedTests < totalTests * 0.1) {
      console.log('   ⚠️  GOOD: Minor responsive issues found');
      console.log('   ⚠️  Most breakpoints working correctly');
    } else {
      console.log('   🚨 ISSUES: Significant responsive problems detected');
      console.log('   🚨 Multiple breakpoints require attention');
    }

    console.log('\n📈 RESPONSIVE DESIGN IMPROVEMENTS:');
    console.log('   📏 Review and fix horizontal scroll issues');
    console.log('   👆 Ensure touch targets meet minimum size (44px on mobile)');
    console.log('   📖 Optimize font sizes for readability');
    console.log('   🔄 Minimize layout shifts during page load');
    console.log('   📱 Implement proper mobile-first navigation');
    console.log('   🖼️ Optimize images for responsive display');
    console.log('   📋 Ensure form usability on all devices');

    // Overall assertions
    expect(criticalPassed).toBe(criticalTests.length);
    expect(passedTests).toBeGreaterThan(totalTests * 0.8); // At least 80% pass rate
    expect(mobileTests.filter(r => r.passed).length).toBeGreaterThan(mobileTests.length * 0.7); // 70% mobile pass rate
  });

  test('should handle orientation changes gracefully', async () => {
    // Test orientation change behavior
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await context.newPage();

    try {
      console.log('📱 Testing orientation changes...\n');

      // Load a page in portrait mode
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Take screenshot in portrait
      const portraitScreenshot = await page.screenshot({ fullPage: true });

      // Switch to landscape mode
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(2000);

      // Take screenshot in landscape
      const landscapeScreenshot = await page.screenshot({ fullPage: true });

      // Check for layout issues in landscape mode
      const landscapeIssues = await page.evaluate(() => {
        const issues: string[] = [];

        // Check for horizontal scroll
        if (document.body.scrollWidth > document.body.clientWidth) {
          issues.push('Horizontal scroll in landscape mode');
        }

        // Check for overly stretched content
        const wideElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > window.innerWidth * 0.95;
        });

        if (wideElements.length > 0) {
          issues.push(`${wideElements.length} elements too wide for landscape`);
        }

        return issues;
      });

      // Switch back to portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);

      // Check if layout returns to normal
      const portraitRecovery = await page.evaluate(() => {
        return document.body.scrollWidth <= document.body.clientWidth;
      });

      console.log(`📐 Portrait to Landscape: ${landscapeIssues.length === 0 ? '✅' : '❌'}`);
      console.log(`📐 Landscape to Portrait: ${portraitRecovery ? '✅' : '❌'}`);

      if (landscapeIssues.length > 0) {
        console.log('   Landscape issues:');
        landscapeIssues.forEach(issue => {
          console.log(`     • ${issue}`);
        });
      }

      expect(landscapeIssues.length).toBe(0);
      expect(portraitRecovery).toBe(true);

    } finally {
      await page.close();
      await context.close();
      await browser.close();
    }
  });
});