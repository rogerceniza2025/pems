import { test, expect } from '@playwright/test';
import { PercyService } from '@percy/playwright';

/**
 * Storybook Component Visual Testing
 *
 * This test suite validates the visual appearance of Storybook components
 * across different themes and states to ensure UI consistency.
 */

const percy = new PercyService({
  apiUrl: 'https://percy.io/api/v1',
  authToken: process.env.PERCY_TOKEN,
});

const STORYBOOK_URL = process.env.STORYBOOK_URL || 'http://localhost:6006';

// Component categories to test
const componentCategories = [
  {
    name: 'Buttons',
    stories: [
      'button--default',
      'button--primary',
      'button--secondary',
      'button--disabled',
      'button--loading',
      'button--with-icon',
      'button--large',
      'button--small',
    ],
    states: ['default', 'hover', 'focus', 'active', 'disabled'],
  },
  {
    name: 'Forms',
    stories: [
      'input--default',
      'input--with-error',
      'input--disabled',
      'input--with-placeholder',
      'textarea--default',
      'textarea--with-error',
      'select--default',
      'select--with-error',
      'checkbox--default',
      'checkbox--checked',
      'radio--default',
      'radio--checked',
    ],
    states: ['default', 'focus', 'error'],
  },
  {
    name: 'Cards',
    stories: [
      'card--default',
      'card--with-image',
      'card--with-actions',
      'card--loading',
      'card--elevated',
      'card--outlined',
    ],
    states: ['default', 'hover'],
  },
  {
    name: 'Navigation',
    stories: [
      'navbar--default',
      'navbar--with-user-menu',
      'sidebar--default',
      'sidebar--collapsed',
      'breadcrumb--default',
      'tabs--default',
      'tabs--with-content',
    ],
    states: ['default', 'hover'],
  },
  {
    name: 'Feedback',
    stories: [
      'alert--info',
      'alert--success',
      'alert--warning',
      'alert--error',
      'modal--default',
      'modal--with-form',
      'tooltip--default',
      'toast--success',
      'toast--error',
    ],
    states: ['default'],
  },
  {
    name: 'Data Display',
    stories: [
      'table--default',
      'table--with-pagination',
      'table--sortable',
      'list--default',
      'list--divided',
      'avatar--default',
      'avatar--with-initials',
      'badge--default',
      'badge--with-count',
    ],
    states: ['default'],
  },
];

// Theme configurations
const themes = [
  { name: 'Light', param: 'theme=light', class: 'light-theme' },
  { name: 'Dark', param: 'theme=dark', class: 'dark-theme' },
  { name: 'High Contrast', param: 'theme=high-contrast', class: 'high-contrast-theme' },
];

// Viewport configurations for responsive testing
const viewports = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1280, height: 800 },
];

test.describe('Storybook Component Visual Testing', () => {
  // Check if Storybook is available
  test.beforeAll(async ({ request }) => {
    try {
      const response = await request.get(STORYBOOK_URL);
      expect(response.status()).toBe(200);
    } catch (error) {
      console.error('❌ Storybook is not available at', STORYBOOK_URL);
      throw new Error('Storybook must be running to execute visual tests');
    }
  });

  themes.forEach(theme => {
    test.describe(`${theme.name} Theme`, () => {
      componentCategories.forEach(category => {
        test.describe(`${category.name} Components`, () => {
          category.stories.forEach(storyId => {
            viewports.forEach(viewport => {
              test(`${storyId} - ${viewport.name}`, async ({ page }) => {
                console.log(`🎨 Testing ${storyId} in ${theme.name} theme on ${viewport.name}`);

                // Set viewport
                await page.setViewportSize({ width: viewport.width, height: viewport.height });

                // Navigate to the Storybook story with theme
                const storyUrl = `${STORYBOOK_URL}/iframe.html?id=${storyId}&${theme.param}&viewMode=story`;
                await page.goto(storyUrl);

                // Wait for the story to load
                await page.waitForLoadState('networkidle');
                await page.waitForSelector('#root', { timeout: 10000 });

                // Wait for any dynamic content to load
                await page.waitForTimeout(1000);

                // Apply theme-specific CSS for consistency
                await page.addStyleTag({
                  content: `
                    /* Stabilize animations */
                    * {
                      animation-duration: 0s !important;
                      transition-duration: 0s !important;
                    }

                    /* Hide cursor and selection */
                    * {
                      caret-color: transparent !important;
                    }
                    ::selection {
                      background-color: transparent !important;
                    }

                    /* Ensure theme is properly applied */
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                    }

                    /* Hide dynamic content that causes false positives */
                    [data-testid="live-time"],
                    [data-testid="dynamic-content"],
                    .skeleton-loader {
                      visibility: hidden !important;
                    }

                    /* Ensure consistent form elements */
                    input, textarea, select {
                      font-family: inherit !important;
                      font-size: 14px !important;
                    }

                    /* Button consistency */
                    button {
                      font-family: inherit !important;
                      font-weight: 500 !important;
                      text-transform: none !important;
                      letter-spacing: normal !important;
                    }

                    /* Hide scrollbars for consistency */
                    ::-webkit-scrollbar {
                      width: 0px !important;
                      height: 0px !important;
                    }
                  `,
                });

                // Verify the component is visible
                const component = page.locator('#root');
                await expect(component).toBeVisible();

                // Create snapshot name
                const snapshotName = `${storyId.replace(/\//g, '-')}-${theme.name.toLowerCase()}-${viewport.name.toLowerCase()}`;

                // Take Percy snapshot
                await percy.snapshot(page, snapshotName, {
                  widths: [viewport.width],
                  minHeight: 400,
                  enableJavaScript: true,
                  options: {
                    metadata: {
                      component: category.name,
                      story: storyId,
                      theme: theme.name,
                      viewport: viewport.name,
                      width: viewport.width,
                      height: viewport.height,
                      timestamp: new Date().toISOString(),
                    },
                    // Additional CSS for theme-specific stabilization
                    percyCSS: `
                      /* Theme-specific stabilization */
                      body.${theme.class} {
                        /* Ensure theme colors are applied consistently */
                        color-scheme: ${theme.name === 'Dark' ? 'dark' : 'light'};
                      }

                      /* Ensure contrast ratios are maintained */
                      ${theme.name === 'High Contrast' ? `
                        button, input, textarea, select {
                          border: 2px solid currentColor !important;
                        }
                      ` : ''}

                      /* Form element consistency */
                      input, textarea {
                        background-color: ${theme.name === 'Dark' ? '#2d3748' : '#ffffff'} !important;
                        border: 1px solid ${theme.name === 'Dark' ? '#4a5568' : '#e2e8f0'} !important;
                        color: ${theme.name === 'Dark' ? '#ffffff' : '#1a202c'} !important;
                      }

                      /* Button state consistency */
                      button:hover {
                        opacity: 0.8 !important;
                      }

                      button:focus {
                        outline: 2px solid currentColor !important;
                        outline-offset: 2px !important;
                      }

                      /* Disabled state consistency */
                      button:disabled,
                      input:disabled,
                      textarea:disabled {
                        opacity: 0.5 !important;
                        cursor: not-allowed !important;
                      }
                    `,
                  },
                });

                console.log(`✅ Visual snapshot captured: ${snapshotName}`);

                // Test interactive states if supported
                if (category.states.length > 1) {
                  await testInteractiveStates(page, storyId, category.states, snapshotName);
                }

                // Test responsive behavior
                await testComponentResponsiveness(page, viewport, category.name);
              });
            });
          });
        });
      });
    });
  });
});

/**
 * Test interactive states for components
 */
async function testInteractiveStates(
  page: any,
  storyId: string,
  states: string[],
  baseSnapshotName: string
) {
  for (const state of states) {
    if (state === 'default') continue; // Already tested

    try {
      console.log(`🎨 Testing ${storyId} - ${state} state`);

      let stateApplied = false;

      switch (state) {
        case 'hover':
          await page.hover('button, input, a, [role="button"]');
          stateApplied = true;
          break;

        case 'focus':
          await page.focus('button, input, textarea, select, a');
          stateApplied = true;
          break;

        case 'active':
          await page.hover('button, [role="button"]');
          await page.mouse.down();
          await page.waitForTimeout(100);
          await page.mouse.up();
          stateApplied = true;
          break;

        case 'error':
          // Try to trigger error state by adding error attributes
          await page.addStyleTag({
            content: `
              input, textarea, select {
                border-color: #ef4444 !important;
                box-shadow: 0 0 0 1px #ef4444 !important;
              }
              [data-testid="error-message"] {
                display: block !important;
                visibility: visible !important;
              }
            `,
          });
          stateApplied = true;
          break;

        case 'disabled':
          await page.addStyleTag({
            content: `
              button, input, textarea, select {
                opacity: 0.5 !important;
                cursor: not-allowed !important;
                pointer-events: none !important;
              }
            `,
          });
          stateApplied = true;
          break;
      }

      if (stateApplied) {
        // Wait for state to apply
        await page.waitForTimeout(500);

        // Take snapshot of the state
        const stateSnapshotName = `${baseSnapshotName}-${state}`;
        await percy.snapshot(page, stateSnapshotName, {
          widths: [page.viewportSize().width],
          enableJavaScript: true,
        });

        console.log(`✅ Visual snapshot captured: ${stateSnapshotName}`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not test ${state} state for ${storyId}:`, error.message);
    }
  }
}

/**
 * Test component responsiveness
 */
async function testComponentResponsiveness(page: any, viewport: any, category: string) {
  const responsivenessIssues = await page.evaluate((currentViewport, componentCategory) => {
    const issues = [];

    // Check for horizontal scrolling
    if (document.body.scrollWidth > window.innerWidth) {
      issues.push('Horizontal scrolling detected');
    }

    // Check for text overflow
    const overflowingElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const style = window.getComputedStyle(el);
      return (
        (style.overflow === 'hidden' || style.overflow === 'scroll') &&
        (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight)
      );
    });

    if (overflowingElements.length > 0) {
      issues.push(`${overflowingElements.length} elements with overflow`);
    }

    // Check for touch target sizes on mobile
    if (currentViewport.width <= 768) {
      const touchTargets = document.querySelectorAll('button, a, input, [role="button"]');
      const smallTouchTargets = Array.from(touchTargets).filter(target => {
        const rect = target.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      });

      if (smallTouchTargets.length > 0) {
        issues.push(`${smallTouchTargets.length} touch targets smaller than 44px`);
      }
    }

    // Check for font size readability
    const textElements = document.querySelectorAll('p, span, div, button, a');
    const smallText = Array.from(textElements).filter(el => {
      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      return fontSize < 14 && el.textContent && el.textContent.trim().length > 0;
    });

    if (smallText.length > 0 && currentViewport.width <= 768) {
      issues.push(`${smallText.length} elements with small text (<14px) on mobile`);
    }

    // Category-specific checks
    switch (componentCategory) {
      case 'Buttons':
        const buttons = document.querySelectorAll('button');
        const inconsistentButtons = Array.from(buttons).filter(button => {
          const style = window.getComputedStyle(button);
          const height = parseFloat(style.height);
          return height < 32; // Minimum button height
        });

        if (inconsistentButtons.length > 0) {
          issues.push(`${inconsistentButtons.length} buttons smaller than 32px height`);
        }
        break;

      case 'Forms':
        const formElements = document.querySelectorAll('input, textarea, select');
        const inconsistentForms = Array.from(formElements).filter(element => {
          const style = window.getComputedStyle(element);
          const height = parseFloat(style.height);
          return height < 40; // Minimum form element height
        });

        if (inconsistentForms.length > 0) {
          issues.push(`${inconsistentForms.length} form elements smaller than 40px height`);
        }
        break;
    }

    return issues;
  }, viewport, category);

  if (responsivenessIssues.length > 0) {
    console.log(`🔍 Responsiveness issues for ${category} on ${viewport.name}:`, responsivenessIssues);
  }
}

// Test accessibility in components
test.describe('Component Accessibility Testing', () => {
  test('Critical Components Accessibility', async ({ page }) => {
    // Test a few critical components for accessibility
    const accessibilityStories = [
      'button--default',
      'input--default',
      'card--default',
      'modal--default',
    ];

    for (const storyId of accessibilityStories) {
      console.log(`♿ Testing accessibility for ${storyId}`);

      await page.goto(`${STORYBOOK_URL}/iframe.html?id=${storyId}&viewMode=story`);
      await page.waitForLoadState('networkidle');

      // Check for accessibility attributes
      const accessibilityIssues = await page.evaluate(() => {
        const issues = [];

        // Check for alt text on images
        const images = document.querySelectorAll('img');
        const imagesWithoutAlt = Array.from(images).filter(img => !img.alt && img.src);
        if (imagesWithoutAlt.length > 0) {
          issues.push(`${imagesWithoutAlt.length} images without alt text`);
        }

        // Check for proper button labeling
        const buttons = document.querySelectorAll('button');
        const unlabeledButtons = Array.from(buttons).filter(button => {
          return !button.textContent.trim() && !button.getAttribute('aria-label') && !button.getAttribute('aria-labelledby');
        });

        if (unlabeledButtons.length > 0) {
          issues.push(`${unlabeledButtons.length} buttons without accessible labels`);
        }

        // Check for form labels
        const inputs = document.querySelectorAll('input, textarea, select');
        const inputsWithoutLabels = Array.from(inputs).filter(input => {
          const id = input.id;
          const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : false;
          const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
          const hasPlaceholder = input.getAttribute('placeholder');

          return !hasLabel && !hasAriaLabel && !hasPlaceholder;
        });

        if (inputsWithoutLabels.length > 0) {
          issues.push(`${inputsWithoutLabels.length} form inputs without labels`);
        }

        // Check for heading hierarchy
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        for (let i = 1; i < headings.length; i++) {
          const currentLevel = parseInt(headings[i].tagName.charAt(1));
          const previousLevel = parseInt(headings[i - 1].tagName.charAt(1));

          if (currentLevel > previousLevel + 1) {
            issues.push(`Heading level skipped: h${previousLevel} to h${currentLevel}`);
            break;
          }
        }

        return issues;
      });

      if (accessibilityIssues.length > 0) {
        console.warn(`⚠️ Accessibility issues in ${storyId}:`, accessibilityIssues);
      } else {
        console.log(`✅ No accessibility issues found in ${storyId}`);
      }

      // Take accessibility snapshot
      await percy.snapshot(page, `${storyId.replace(/\//g, '-')}-accessibility`, {
        widths: [1280],
        enableJavaScript: true,
        options: {
          metadata: {
            accessibility: true,
            component: storyId,
            issues: accessibilityIssues.length,
          },
        },
      });
    }
  });
});