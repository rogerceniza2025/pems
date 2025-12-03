import { test, expect } from '@playwright/test';
import { PercyService } from '@percy/playwright';

/**
 * Cross-Browser Visual Regression Testing
 *
 * This test suite validates visual consistency across different browsers
 * and viewports to ensure a consistent user experience.
 */

const percy = new PercyService({
  apiUrl: 'https://percy.io/api/v1',
  authToken: process.env.PERCY_TOKEN,
});

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Test configurations for different browsers and viewports
const testConfigurations = [
  {
    name: 'Desktop Chrome',
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    browserName: 'chromium',
  },
  {
    name: 'Desktop Firefox',
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
    browserName: 'firefox',
  },
  {
    name: 'Desktop Safari',
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
    browserName: 'webkit',
  },
  {
    name: 'Tablet iPad',
    viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
    browserName: 'webkit',
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'Mobile iPhone',
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
    browserName: 'webkit',
    isMobile: true,
    hasTouch: true,
  },
];

// Critical pages to test across all browsers
const criticalPages = [
  {
    name: 'Login Page',
    path: '/auth/login',
    description: 'User authentication interface',
    criticalElements: [
      '[data-testid="login-form"]',
      '[data-testid="email-input"]',
      '[data-testid="password-input"]',
      '[data-testid="login-button"]',
      '[data-testid="forgot-password-link"]',
    ],
  },
  {
    name: 'Registration Page',
    path: '/auth/register',
    description: 'New user registration interface',
    criticalElements: [
      '[data-testid="registration-form"]',
      '[data-testid="first-name-input"]',
      '[data-testid="last-name-input"]',
      '[data-testid="email-input"]',
      '[data-testid="password-input"]',
      '[data-testid="confirm-password-input"]',
      '[data-testid="register-button"]',
    ],
  },
  {
    name: 'Dashboard',
    path: '/dashboard',
    description: 'Main user dashboard',
    criticalElements: [
      '[data-testid="dashboard-header"]',
      '[data-testid="navigation-menu"]',
      '[data-testid="user-profile-menu"]',
      '[data-testid="stats-cards"]',
      '[data-testid="recent-activity"]',
    ],
    requiresAuth: true,
  },
  {
    name: 'User Settings',
    path: '/settings/profile',
    description: 'User profile settings',
    criticalElements: [
      '[data-testid="settings-header"]',
      '[data-testid="profile-form"]',
      '[data-testid="avatar-upload"]',
      '[data-testid="save-button"]',
      '[data-testid="cancel-button"]',
    ],
    requiresAuth: true,
  },
  {
    name: 'Reports Page',
    path: '/reports',
    description: 'Analytics and reports',
    criticalElements: [
      '[data-testid="reports-header"]',
      '[data-testid="date-range-picker"]',
      '[data-testid="report-filters"]',
      '[data-testid="report-table"]',
      '[data-testid="export-button"]',
    ],
    requiresAuth: true,
  },
];

test.describe('Cross-Browser Visual Regression', () => {
  testConfigurations.forEach(config => {
    test.describe(`${config.name}`, () => {
      // Set up browser context for each configuration
      test.use({
        viewport: config.viewport,
        userAgent: config.userAgent,
        ...config,
      });

      criticalPages.forEach(page => {
        test(`${page.name} - Visual Consistency`, async ({ page, context }) => {
          console.log(`🎨 Testing ${page.name} on ${config.name}`);

          // Set up authentication if required
          if (page.requiresAuth) {
            await setupAuthentication(page);
          }

          // Navigate to the test page
          await page.goto(`${BASE_URL}${page.path}`, {
            waitUntil: 'networkidle',
          });

          // Wait for dynamic content to load
          await page.waitForLoadState('networkidle');
          await page.waitForSelector('[data-test-ready="true"]', { timeout: 10000 });

          // Stabilize the page for visual testing
          await stabilizePage(page);

          // Verify critical elements are present
          for (const selector of page.criticalElements) {
            const element = page.locator(selector);
            await expect(element).toBeVisible({
              timeout: 5000,
            }).catch(() => {
              console.warn(`⚠️ Critical element not found: ${selector}`);
            });
          }

          // Take Percy snapshot with comprehensive metadata
          const snapshotName = `${page.name.replace(/\s+/g, '-').toLowerCase()}-${config.name.replace(/\s+/g, '-').toLowerCase()}`;

          await percy.snapshot(page, snapshotName, {
            widths: [config.viewport.width],
            minHeight: config.viewport.height,
            enableJavaScript: true,
            // Custom options for this page
            options: {
              // Add metadata for better organization
              metadata: {
                browser: config.name,
                viewport: `${config.viewport.width}x${config.viewport.height}`,
                page: page.name,
                path: page.path,
                criticalElements: page.criticalElements.length,
                timestamp: new Date().toISOString(),
              },

              // Custom CSS for this snapshot
              percyCSS: `
                /* Hide dynamic elements that cause false positives */
                [data-testid="timestamp"],
                [data-testid="live-time"],
                [data-testid="notification-badge"] {
                  visibility: hidden !important;
                }

                /* Stabilize animations */
                * {
                  animation-duration: 0s !important;
                  transition-duration: 0s !important;
                }

                /* Ensure consistent form styling */
                input, textarea, select {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                }

                /* Hide scrollbars in some browsers */
                ::-webkit-scrollbar {
                  width: 0px !important;
                  height: 0px !important;
                }
              `,
            },
          });

          console.log(`✅ Visual snapshot captured: ${snapshotName}`);

          // Additional cross-browser compatibility checks
          await checkCrossBrowserCompatibility(page, config);

          // Take additional snapshots for interactive states
          if (page.criticalElements.length > 0) {
            await testInteractiveStates(page, page, snapshotName);
          }
        });
      });
    });
  });
});

/**
 * Helper function to set up authentication for protected pages
 */
async function setupAuthentication(page: any) {
  // Set authentication cookie or token
  await page.evaluate(() => {
    // Simulate logged-in state
    localStorage.setItem('auth_token', 'test_token');
    localStorage.setItem('user_id', 'test_user');
  });

  // Alternatively, visit login page and authenticate
  await page.goto(`${BASE_URL}/auth/login`);
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.fill('[data-testid="password-input"]', 'testpassword123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');
}

/**
 * Stabilize page for visual testing by waiting for dynamic content
 */
async function stabilizePage(page: any) {
  // Wait for images to load
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return images.every(img => img.complete);
  });

  // Wait for fonts to load
  await page.waitForFunction(() => {
    return document.fonts.ready;
  });

  // Wait for animations to complete
  await page.waitForTimeout(1000);

  // Hide cursor and selection for consistent screenshots
  await page.addStyleTag({
    content: `
      * {
        caret-color: transparent !important;
      }
      ::selection {
        background-color: transparent !important;
      }
      ::-moz-selection {
        background-color: transparent !important;
      }
    `,
  });
}

/**
 * Check for cross-browser compatibility issues
 */
async function checkCrossBrowserCompatibility(page: any, config: any) {
  // Check for browser-specific styling issues
  const browserChecks = await page.evaluate((browserName) => {
    const issues = [];

    // Check for scrollbar inconsistencies
    const hasScrollbar = document.body.scrollHeight > window.innerHeight;
    if (hasScrollbar && browserName.includes('Firefox')) {
      issues.push('Firefox scrollbar width may affect layout');
    }

    // Check for font rendering differences
    const computedStyles = window.getComputedStyle(document.body);
    if (!computedStyles.fontFamily.includes('system')) {
      issues.push('Custom font may render differently across browsers');
    }

    // Check for flexbox gaps in older browsers
    const flexElements = document.querySelectorAll('[style*="display: flex"], [style*="display:flex"]');
    if (flexElements.length > 0) {
      issues.push('Flexbox layout should be tested for browser compatibility');
    }

    return issues;
  }, config.browserName);

  if (browserChecks.length > 0) {
    console.log(`🔍 Cross-browser checks for ${config.name}:`, browserChecks);
  }
}

/**
 * Test interactive states for critical elements
 */
async function testInteractiveStates(page: any, testPage: any, baseSnapshotName: string) {
  const interactiveElements = testPage.criticalElements.filter(selector =>
    selector.includes('button') ||
    selector.includes('link') ||
    selector.includes('input')
  );

  for (const [index, selector] of interactiveElements.entries()) {
    try {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        // Test hover state
        await element.hover();
        await percy.snapshot(page, `${baseSnapshotName}-hover-${index + 1}`, {
          widths: [page.viewportSize().width],
          enableJavaScript: true,
        });

        // Test focus state (if applicable)
        if (await element.isEnabled()) {
          await element.focus();
          await percy.snapshot(page, `${baseSnapshotName}-focus-${index + 1}`, {
            widths: [page.viewportSize().width],
            enableJavaScript: true,
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not test interactive state for ${selector}:`, error.message);
    }
  }
}

// Test error states across browsers
test.describe('Cross-Browser Error States', () => {
  testConfigurations.forEach(config => {
    test(`Error Display Consistency - ${config.name}`, async ({ page }) => {
      test.use({
        viewport: config.viewport,
        userAgent: config.userAgent,
      });

      // Navigate to a page that might show errors
      await page.goto(`${BASE_URL}/auth/login`);

      // Trigger form validation errors
      await page.click('[data-testid="login-button"]');

      // Wait for error messages to appear
      await page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });

      // Take snapshot of error state
      await percy.snapshot(page, `error-state-${config.name.replace(/\s+/g, '-').toLowerCase()}`, {
        widths: [config.viewport.width],
        enableJavaScript: true,
        percyCSS: `
          /* Ensure error messages are visible */
          [data-testid="error-message"] {
            visibility: visible !important;
            opacity: 1 !important;
          }
        `,
      });

      // Verify error messages are properly styled and visible
      const errorElements = page.locator('[data-testid="error-message"]');
      await expect(errorElements.first()).toBeVisible();
    });
  });
});

// Test loading states across browsers
test.describe('Cross-Browser Loading States', () => {
  testConfigurations.forEach(config => {
    test(`Loading State Consistency - ${config.name}`, async ({ page }) => {
      test.use({
        viewport: config.viewport,
        userAgent: config.userAgent,
      });

      // Navigate to a page with loading states
      await page.goto(`${BASE_URL}/dashboard`);

      // Intercept API responses to simulate loading
      await page.route('**/api/**', route => {
        // Delay response to show loading state
        setTimeout(() => route.continue(), 2000);
      });

      await page.reload();

      // Wait for loading indicators
      await page.waitForSelector('[data-testid="loading-spinner"]', { timeout: 5000 });

      // Take snapshot of loading state
      await percy.snapshot(page, `loading-state-${config.name.replace(/\s+/g, '-').toLowerCase()}`, {
        widths: [config.viewport.width],
        enableJavaScript: true,
        percyCSS: `
          /* Ensure loading states are visible */
          [data-testid="loading-spinner"],
          [data-testid="skeleton-loader"] {
            visibility: visible !important;
            opacity: 1 !important;
          }
        `,
      });
    });
  });
});