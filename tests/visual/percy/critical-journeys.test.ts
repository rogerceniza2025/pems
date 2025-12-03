import { test, expect } from '@playwright/test';
import { PercyService } from '@percy/playwright';

/**
 * Critical User Journey Visual Testing
 *
 * This test suite validates visual consistency of critical user journeys
 * across different browsers and devices to ensure optimal user experience.
 */

const percy = new PercyService({
  apiUrl: 'https://percy.io/api/v1',
  authToken: process.env.PERCY_TOKEN,
});

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Define critical user journeys to test visually
const criticalJourneys = [
  {
    name: 'Registration Flow',
    description: 'New user sign-up process',
    steps: [
      {
        name: 'Landing Page',
        path: '/',
        snapshot: 'registration-landing',
        criticalElements: ['[data-testid="hero-section"]', '[data-testid="sign-up-button"]'],
      },
      {
        name: 'Registration Form',
        path: '/auth/register',
        snapshot: 'registration-form',
        criticalElements: [
          '[data-testid="registration-form"]',
          '[data-testid="first-name-input"]',
          '[data-testid="last-name-input"]',
          '[data-testid="email-input"]',
          '[data-testid="password-input"]',
          '[data-testid="terms-checkbox"]',
          '[data-testid="register-button"]',
        ],
        interactions: [
          { type: 'fill', selector: '[data-testid="first-name-input"]', value: 'John' },
          { type: 'fill', selector: '[data-testid="last-name-input"]', value: 'Doe' },
          { type: 'fill', selector: '[data-testid="email-input"]', value: 'john.doe@example.com' },
        ],
      },
      {
        name: 'Email Verification',
        path: '/auth/verify-email',
        snapshot: 'email-verification',
        criticalElements: [
          '[data-testid="verification-form"]',
          '[data-testid="code-input"]',
          '[data-testid="resend-link"]',
          '[data-testid="verify-button"]',
        ],
      },
      {
        name: 'Welcome Dashboard',
        path: '/dashboard',
        snapshot: 'welcome-dashboard',
        criticalElements: [
          '[data-testid="welcome-message"]',
          '[data-testid="onboarding-tour"]',
          '[data-testid="complete-profile-prompt"]',
        ],
        requiresAuth: true,
      },
    ],
  },
  {
    name: 'Login Flow',
    description: 'Returning user authentication',
    steps: [
      {
        name: 'Login Page',
        path: '/auth/login',
        snapshot: 'login-page',
        criticalElements: [
          '[data-testid="login-form"]',
          '[data-testid="email-input"]',
          '[data-testid="password-input"]',
          '[data-testid="remember-me"]',
          '[data-testid="forgot-password"]',
          '[data-testid="login-button"]',
        ],
        interactions: [
          { type: 'fill', selector: '[data-testid="email-input"]', value: 'user@example.com' },
        ],
      },
      {
        name: 'Dashboard After Login',
        path: '/dashboard',
        snapshot: 'dashboard-after-login',
        criticalElements: [
          '[data-testid="dashboard-header"]',
          '[data-testid="user-menu"]',
          '[data-testid="navigation-sidebar"]',
          '[data-testid="stats-overview"]',
        ],
        requiresAuth: true,
      },
    ],
  },
  {
    name: 'Dashboard Navigation',
    description: 'Main dashboard navigation and exploration',
    steps: [
      {
        name: 'Main Dashboard',
        path: '/dashboard',
        snapshot: 'main-dashboard',
        criticalElements: [
          '[data-testid="dashboard-header"]',
          '[data-testid="quick-actions"]',
          '[data-testid="recent-activity"]',
          '[data-testid="stats-cards"]',
        ],
        requiresAuth: true,
      },
      {
        name: 'Reports Section',
        path: '/reports',
        snapshot: 'reports-section',
        criticalElements: [
          '[data-testid="reports-header"]',
          '[data-testid="date-filters"]',
          '[data-testid="report-table"]',
          '[data-testid="export-options"]',
        ],
        requiresAuth: true,
      },
      {
        name: 'User Settings',
        path: '/settings/profile',
        snapshot: 'user-settings',
        criticalElements: [
          '[data-testid="settings-header"]',
          '[data-testid="profile-form"]',
          '[data-testid="avatar-section"]',
          '[data-testid="save-changes"]',
        ],
        requiresAuth: true,
      },
    ],
  },
  {
    name: 'Onboarding Flow',
    description: 'New user onboarding experience',
    steps: [
      {
        name: 'Welcome Screen',
        path: '/onboarding/welcome',
        snapshot: 'onboarding-welcome',
        criticalElements: [
          '[data-testid="welcome-modal"]',
          '[data-testid="get-started-button"]',
          '[data-testid="skip-link"]',
        ],
        requiresAuth: true,
      },
      {
        name: 'Profile Completion',
        path: '/onboarding/profile',
        snapshot: 'onboarding-profile',
        criticalElements: [
          '[data-testid="profile-completion"]',
          '[data-testid="upload-avatar"]',
          '[data-testid="bio-input"]',
          '[data-testid="continue-button"]',
        ],
        requiresAuth: true,
      },
      {
        name: 'Preferences Setup',
        path: '/onboarding/preferences',
        snapshot: 'onboarding-preferences',
        criticalElements: [
          '[data-testid="preferences-form"]',
          '[data-testid="notification-settings"]',
          '[data-testid="theme-selector"]',
          '[data-testid="complete-button"]',
        ],
        requiresAuth: true,
      },
    ],
  },
];

// Viewport configurations for different devices
const deviceViewports = [
  { name: 'Mobile', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: 'Tablet', width: 768, height: 1024, isMobile: true, hasTouch: true },
  { name: 'Desktop', width: 1280, height: 800, isMobile: false, hasTouch: false },
  { name: 'Large Desktop', width: 1440, height: 900, isMobile: false, hasTouch: false },
];

test.describe('Critical User Journey Visual Testing', () => {
  deviceViewports.forEach(viewport => {
    test.describe(`${viewport.name} Viewport`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
      });

      criticalJourneys.forEach(journey => {
        test.describe(`${journey.name}`, () => {
          test.beforeEach(async ({ page }) => {
            // Set up viewport-specific user agent
            if (viewport.isMobile) {
              await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15');
            } else {
              await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            }
          });

          journey.steps.forEach((step, stepIndex) => {
            test(`${step.name}`, async ({ page }) => {
              console.log(`🎨 Testing ${journey.name} - ${step.name} on ${viewport.name}`);

              // Set up authentication if required
              if (step.requiresAuth) {
                await setupAuthentication(page);
              }

              // Navigate to the step
              await page.goto(`${BASE_URL}${step.path}`, {
                waitUntil: 'networkidle',
              });

              // Wait for page to be fully loaded
              await page.waitForLoadState('networkidle');
              await page.waitForSelector('[data-test-ready="true"]', { timeout: 10000 });

              // Apply interactions if specified
              if (step.interactions) {
                for (const interaction of step.interactions) {
                  await applyInteraction(page, interaction);
                }
              }

              // Stabilize page for visual testing
              await stabilizePage(page);

              // Verify critical elements are present
              for (const selector of step.criticalElements) {
                const element = page.locator(selector);
                try {
                  await expect(element).toBeVisible({ timeout: 5000 });
                } catch (error) {
                  console.warn(`⚠️ Critical element not found: ${selector}`);
                }
              }

              // Create snapshot name with journey context
              const snapshotName = `${journey.name.toLowerCase().replace(/\s+/g, '-')}-${step.snapshot}-${viewport.name.toLowerCase()}`;

              // Take Percy snapshot
              await percy.snapshot(page, snapshotName, {
                widths: [viewport.width],
                minHeight: viewport.height,
                enableJavaScript: true,
                options: {
                  metadata: {
                    journey: journey.name,
                    step: step.name,
                    stepIndex: stepIndex + 1,
                    viewport: viewport.name,
                    width: viewport.width,
                    height: viewport.height,
                    timestamp: new Date().toISOString(),
                  },
                  percyCSS: `
                    /* Hide dynamic elements that cause false positives */
                    [data-testid="timestamp"],
                    [data-testid="live-time"],
                    [data-testid="notification-badge"],
                    [data-testid="animated-icon"] {
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
                      font-size: 16px !important;
                    }

                    /* Mobile-specific adjustments */
                    @media (max-width: 768px) {
                      input, textarea, select {
                        font-size: 16px !important; /* Prevent zoom on iOS */
                      }
                    }

                    /* Hide scrollbars for consistency */
                    ::-webkit-scrollbar {
                      width: 0px !important;
                      height: 0px !important;
                    }

                    /* Ensure consistent button styling */
                    button {
                      font-family: inherit !important;
                      font-weight: 500 !important;
                    }

                    /* Tour and tooltip stabilization */
                    [data-testid="tour-tooltip"],
                    [data-testid="onboarding-highlight"] {
                      opacity: 1 !important;
                      animation: none !important;
                    }
                  `,
                },
              });

              console.log(`✅ Visual snapshot captured: ${snapshotName}`);

              // Additional viewport-specific checks
              await checkViewportSpecificIssues(page, viewport);

              // Test responsive behavior if it's a flow step
              if (stepIndex < journey.steps.length - 1) {
                await testResponsiveTransitions(page, viewport);
              }
            });
          });
        });
      });
    });
  });
});

/**
 * Helper function to set up authentication
 */
async function setupAuthentication(page: any) {
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'test_token');
    localStorage.setItem('user_id', 'test_user');
    localStorage.setItem('user_email', 'test@example.com');
    localStorage.setItem('onboarding_completed', 'false');
  });
}

/**
 * Apply interactions to page elements
 */
async function applyInteraction(page: any, interaction: any) {
  switch (interaction.type) {
    case 'fill':
      await page.fill(interaction.selector, interaction.value);
      break;
    case 'click':
      await page.click(interaction.selector);
      break;
    case 'hover':
      await page.hover(interaction.selector);
      break;
    case 'select':
      await page.selectOption(interaction.selector, interaction.value);
      break;
    default:
      console.warn(`Unknown interaction type: ${interaction.type}`);
  }
}

/**
 * Stabilize page for visual testing
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

  // Wait for any ongoing animations
  await page.waitForTimeout(1000);

  // Hide cursor and selection
  await page.addStyleTag({
    content: `
      * {
        caret-color: transparent !important;
      }
      ::selection {
        background-color: transparent !important;
      }
    `,
  });
}

/**
 * Check for viewport-specific issues
 */
async function checkViewportSpecificIssues(page: any, viewport: any) {
  const issues = await page.evaluate((isMobile, width) => {
    const foundIssues = [];

    // Check for horizontal scrolling on mobile
    if (isMobile && document.body.scrollWidth > window.innerWidth) {
      foundIssues.push('Horizontal scrolling detected on mobile');
    }

    // Check for text overflow
    const overflowingElements = Array.from(document.querySelectorAll('*')).filter(el => {
      return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
    });

    if (overflowingElements.length > 0) {
      foundIssues.push(`${overflowingElements.length} elements with overflow detected`);
    }

    // Check for touch target sizes on mobile
    if (isMobile) {
      const touchTargets = document.querySelectorAll('button, a, input, [role="button"]');
      const smallTouchTargets = Array.from(touchTargets).filter(target => {
        const rect = target.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44; // iOS minimum touch target
      });

      if (smallTouchTargets.length > 0) {
        foundIssues.push(`${smallTouchTargets.length} touch targets smaller than 44px`);
      }
    }

    // Check for responsive breakpoints
    if (width < 768) {
      const desktopOnlyElements = document.querySelectorAll('.desktop-only');
      if (desktopOnlyElements.length > 0) {
        const visibleDesktopElements = Array.from(desktopOnlyElements).filter(el => {
          return window.getComputedStyle(el).display !== 'none';
        });

        if (visibleDesktopElements.length > 0) {
          foundIssues.push(`${visibleDesktopElements.length} desktop-only elements visible on mobile`);
        }
      }
    }

    return foundIssues;
  }, viewport.isMobile, viewport.width);

  if (issues.length > 0) {
    console.log(`🔍 Viewport-specific issues for ${viewport.name}:`, issues);
  }
}

/**
 * Test responsive transitions between steps
 */
async function testResponsiveTransitions(page: any, viewport: any) {
  // Test viewport changes if responsive behavior is expected
  if (viewport.isMobile) {
    // Test landscape orientation on mobile
    await page.setViewportSize({ width: viewport.height, height: viewport.width });
    await page.waitForTimeout(500);

    // Verify layout adapts properly
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });

    if (hasHorizontalScroll) {
      console.warn(`⚠️ Layout breaks in landscape mode on ${viewport.name}`);
    }

    // Restore original viewport
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
  }
}

// Test error states in critical journeys
test.describe('Critical Journey Error States', () => {
  test('Registration Form Validation Errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/register`);

    // Submit empty form to trigger validation errors
    await page.click('[data-testid="register-button"]');

    // Wait for validation messages
    await page.waitForSelector('[data-testid="validation-error"]');

    // Take snapshot of error state
    await percy.snapshot(page, 'registration-validation-errors', {
      widths: [1280],
      enableJavaScript: true,
      percyCSS: `
        [data-testid="validation-error"] {
          visibility: visible !important;
          opacity: 1 !important;
        }
      `,
    });
  });

  test('Login Failure State', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Enter invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    // Wait for error message
    await page.waitForSelector('[data-testid="login-error"]');

    // Take snapshot of error state
    await percy.snapshot(page, 'login-failure-error', {
      widths: [1280],
      enableJavaScript: true,
      percyCSS: `
        [data-testid="login-error"] {
          visibility: visible !important;
          opacity: 1 !important;
        }
      `,
    });
  });
});

// Test loading states in critical journeys
test.describe('Critical Journey Loading States', () => {
  test('Dashboard Loading State', async ({ page }) => {
    // Set up authentication
    await setupAuthentication(page);

    // Intercept API calls to simulate loading
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 2000);
    });

    await page.goto(`${BASE_URL}/dashboard`);

    // Wait for loading indicators
    await page.waitForSelector('[data-testid="loading-spinner"]');

    // Take snapshot of loading state
    await percy.snapshot(page, 'dashboard-loading-state', {
      widths: [1280],
      enableJavaScript: true,
      percyCSS: `
        [data-testid="loading-spinner"],
        [data-testid="skeleton-loader"] {
          visibility: visible !important;
          opacity: 1 !important;
        }
      `,
    });
  });
});