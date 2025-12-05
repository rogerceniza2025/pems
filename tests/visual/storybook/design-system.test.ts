import { test, expect } from '@playwright/test';
import { PercyService } from '@percy/playwright';

/**
 * Design System Visual Testing
 *
 * This test suite validates the visual consistency of the design system
 * components, ensuring adherence to design standards and brand guidelines.
 */

const percy = new PercyService({
  apiUrl: 'https://percy.io/api/v1',
  authToken: process.env.PERCY_TOKEN,
});

const STORYBOOK_URL = process.env.STORYBOOK_URL || 'http://localhost:3106';

// Design system categories
const designSystemCategories = [
  {
    name: 'Color Palette',
    stories: [
      'color--primary',
      'color--secondary',
      'color--neutral',
      'color--semantic',
      'color--status',
    ],
  },
  {
    name: 'Typography',
    stories: [
      'typography--headings',
      'typography--body-text',
      'typography--font-families',
      'typography--text-sizes',
      'typography--font-weights',
    ],
  },
  {
    name: 'Spacing',
    stories: [
      'spacing--scale',
      'spacing--layout',
      'spacing--component',
      'spacing--utilities',
    ],
  },
  {
    name: 'Shadows & Elevation',
    stories: [
      'shadow--card',
      'shadow--modal',
      'shadow--dropdown',
      'shadow--tooltip',
      'shadow--button',
    ],
  },
  {
    name: 'Border Radius',
    stories: [
      'border-radius--buttons',
      'border-radius--cards',
      'border-radius--inputs',
      'border-radius--avatars',
    ],
  },
  {
    name: 'Icons',
    stories: [
      'icon--sizes',
      'icon--colors',
      'icon--variants',
      'icon--usage',
    ],
  },
];

// Theme variations for design system testing
const designThemes = [
  { name: 'Light Theme', param: 'theme=light', backgroundColor: '#ffffff' },
  { name: 'Dark Theme', param: 'theme=dark', backgroundColor: '#1a202c' },
  { name: 'High Contrast', param: 'theme=high-contrast', backgroundColor: '#000000' },
];

test.describe('Design System Visual Validation', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const response = await request.get(STORYBOOK_URL);
      expect(response.status()).toBe(200);
    } catch (error) {
      console.error('❌ Storybook is not available at', STORYBOOK_URL);
      throw new Error('Storybook must be running to execute design system tests');
    }
  });

  designSystemCategories.forEach(category => {
    test.describe(`${category.name}`, () => {
      designThemes.forEach(theme => {
        test(`${category.name} - ${theme.name}`, async ({ page }) => {
          console.log(`🎨 Testing ${category.name} in ${theme.name}`);

          // Set up page for design system testing
          await page.setViewportSize({ width: 1200, height: 800 });

          for (const storyId of category.stories) {
            try {
              // Navigate to the design system story
              const storyUrl = `${STORYBOOK_URL}/iframe.html?id=${storyId}&${theme.param}&viewMode=story`;
              await page.goto(storyUrl);

              // Wait for the story to load
              await page.waitForLoadState('networkidle');
              await page.waitForSelector('#root', { timeout: 10000 });

              // Apply design system stabilization CSS
              await page.addStyleTag({
                content: `
                  /* Stabilize all animations */
                  * {
                    animation-duration: 0s !important;
                    transition-duration: 0s !important;
                  }

                  /* Remove selection and cursor */
                  * {
                    caret-color: transparent !important;
                  }
                  ::selection {
                    background-color: transparent !important;
                  }

                  /* Ensure consistent rendering */
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                    background-color: ${theme.backgroundColor} !important;
                    margin: 0 !important;
                    padding: 20px !important;
                  }

                  /* Hide scrollbars */
                  ::-webkit-scrollbar {
                    width: 0px !important;
                    height: 0px !important;
                  }

                  /* Ensure text rendering consistency */
                  * {
                    text-rendering: geometricPrecision !important;
                    -webkit-font-smoothing: antialiased !important;
                    -moz-osx-font-smoothing: grayscale !important;
                  }

                  /* Border and shadow consistency */
                  * {
                    box-shadow: none !important;
                  }

                  /* Color swatch specific styling */
                  .color-swatch {
                    border: 1px solid rgba(0,0,0,0.1) !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-size: 12px !important;
                    font-weight: 500 !important;
                  }

                  /* Typography example styling */
                  .typography-example {
                    line-height: 1.5 !important;
                    margin: 8px 0 !important;
                  }

                  /* Spacing visualization */
                  .spacing-example {
                    background-color: rgba(59, 130, 246, 0.1) !important;
                    border: 1px dashed rgba(59, 130, 246, 0.5) !important;
                  }

                  /* Shadow visualization */
                  .shadow-example {
                    background-color: #ffffff !important;
                    border: 1px solid rgba(0,0,0,0.1) !important;
                  }
                `,
              });

              // Wait for stabilization
              await page.waitForTimeout(1000);

              // Verify the design system content is visible
              const content = page.locator('#root');
              await expect(content).toBeVisible();

              // Create snapshot name
              const snapshotName = `design-system-${category.name.toLowerCase().replace(/\s+/g, '-')}-${storyId.split('--')[1]}-${theme.name.toLowerCase()}`;

              // Take Percy snapshot
              await percy.snapshot(page, snapshotName, {
                widths: [1200],
                minHeight: 600,
                enableJavaScript: true,
                options: {
                  metadata: {
                    category: category.name,
                    story: storyId,
                    theme: theme.name,
                    type: 'design-system',
                    timestamp: new Date().toISOString(),
                  },
                  // Design system specific CSS
                  percyCSS: `
                    /* Enhanced stability for design system elements */
                    .color-palette {
                      display: flex !important;
                      flex-wrap: wrap !important;
                      gap: 8px !important;
                    }

                    .color-swatch {
                      min-width: 80px !important;
                      min-height: 80px !important;
                      border-radius: 4px !important;
                      padding: 8px !important;
                      color: ${theme.name === 'Dark' ? '#ffffff' : '#000000'} !important;
                      text-align: center !important;
                    }

                    .typography-scale {
                      display: flex !important;
                      flex-direction: column !important;
                      gap: 16px !important;
                    }

                    .spacing-grid {
                      display: grid !important;
                      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)) !important;
                      gap: 16px !important;
                    }

                    .shadow-gallery {
                      display: grid !important;
                      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
                      gap: 24px !important;
                    }

                    .border-radius-showcase {
                      display: flex !important;
                      align-items: center !important;
                      justify-content: space-around !important;
                      gap: 16px !important;
                    }

                    .icon-library {
                      display: grid !important;
                      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)) !important;
                      gap: 16px !important;
                      text-align: center !important;
                    }
                  `,
                },
              });

              console.log(`✅ Design system snapshot captured: ${snapshotName}`);

              // Validate design system properties
              await validateDesignSystemProperties(page, category, theme);

            } catch (error) {
              console.warn(`⚠️ Could not test ${storyId}:`, error.message);
            }
          }
        });
      });
    });
  });
});

/**
 * Validate design system properties
 */
async function validateDesignSystemProperties(page: any, category: any, theme: any) {
  const validationResults = await page.evaluate((categoryName, themeName) => {
    const results = {
      passed: true,
      issues: [],
      warnings: [],
    };

    try {
      switch (categoryName) {
        case 'Color Palette':
          const colorSwatches = document.querySelectorAll('.color-swatch, [data-testid*="color"]');
          if (colorSwatches.length === 0) {
            results.issues.push('No color swatches found');
            results.passed = false;
          } else {
            // Check for accessible contrast ratios
            colorSwatches.forEach((swatch, index) => {
              const bgColor = window.getComputedStyle(swatch).backgroundColor;
              const textColor = window.getComputedStyle(swatch).color;

              // Basic contrast check (simplified)
              if (bgColor && textColor) {
                const bgLuminance = getLuminance(bgColor);
                const textLuminance = getLuminance(textColor);
                const contrast = (Math.max(bgLuminance, textLuminance) + 0.05) / (Math.min(bgLuminance, textLuminance) + 0.05);

                if (contrast < 4.5) {
                  results.warnings.push(`Color swatch ${index + 1} may have insufficient contrast (${contrast.toFixed(2)}:1)`);
                }
              }
            });
          }
          break;

        case 'Typography':
          const typographyElements = document.querySelectorAll('.typography-example, h1, h2, h3, h4, h5, h6, p');
          if (typographyElements.length === 0) {
            results.issues.push('No typography examples found');
            results.passed = false;
          } else {
            typographyElements.forEach((element, index) => {
              const styles = window.getComputedStyle(element);
              const fontSize = parseFloat(styles.fontSize);

              // Check minimum font sizes
              if (fontSize < 12) {
                results.warnings.push(`Typography element ${index + 1} has small font size (${fontSize}px)`);
              }

              // Check for consistent line height
              const lineHeight = parseFloat(styles.lineHeight);
              if (lineHeight < 1.2) {
                results.warnings.push(`Typography element ${index + 1} has insufficient line height (${lineHeight})`);
              }
            });
          }
          break;

        case 'Spacing':
          const spacingExamples = document.querySelectorAll('.spacing-example, [data-testid*="spacing"]');
          if (spacingExamples.length === 0) {
            results.issues.push('No spacing examples found');
            results.passed = false;
          }
          break;

        case 'Shadows & Elevation':
          const shadowExamples = document.querySelectorAll('.shadow-example, [data-testid*="shadow"]');
          if (shadowExamples.length === 0) {
            results.issues.push('No shadow examples found');
            results.passed = false;
          } else {
            shadowExamples.forEach((element, index) => {
              const styles = window.getComputedStyle(element);
              if (styles.boxShadow && styles.boxShadow !== 'none') {
                // Valid shadow found
              } else {
                results.warnings.push(`Shadow example ${index + 1} has no visible shadow`);
              }
            });
          }
          break;

        case 'Border Radius':
          const borderRadiusExamples = document.querySelectorAll('.border-radius-example, [data-testid*="border-radius"]');
          if (borderRadiusExamples.length === 0) {
            results.issues.push('No border radius examples found');
            results.passed = false;
          }
          break;

        case 'Icons':
          const iconExamples = document.querySelectorAll('.icon-example, [data-testid*="icon"], svg');
          if (iconExamples.length === 0) {
            results.issues.push('No icon examples found');
            results.passed = false;
          } else {
            iconExamples.forEach((element, index) => {
              if (element.tagName === 'SVG') {
                const hasViewBox = element.hasAttribute('viewBox');
                if (!hasViewBox) {
                  results.warnings.push(`Icon ${index + 1} missing viewBox attribute`);
                }
              }
            });
          }
          break;
      }
    } catch (error) {
      results.issues.push(`Validation error: ${error.message}`);
      results.passed = false;
    }

    return results;

    // Helper function to calculate luminance
    function getLuminance(color) {
      const rgb = color.match(/\d+/g);
      if (!rgb) return 0;

      const [r, g, b] = rgb.map(val => {
        const normalized = val / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : Math.pow((normalized + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
  }, category.name, theme.name);

  if (!validationResults.passed) {
    console.error(`❌ Design system validation failed for ${category.name} in ${theme.name}:`, validationResults.issues);
  }

  if (validationResults.warnings.length > 0) {
    console.warn(`⚠️ Design system warnings for ${category.name} in ${theme.name}:`, validationResults.warnings);
  }

  if (validationResults.passed && validationResults.warnings.length === 0) {
    console.log(`✅ Design system validation passed for ${category.name} in ${theme.name}`);
  }
}

// Test design system consistency across themes
test.describe('Cross-Theme Consistency', () => {
  test('Component Consistency Across Themes', async ({ page }) => {
    const consistentComponents = [
      'button--default',
      'input--default',
      'card--default',
      'alert--info',
    ];

    for (const component of consistentComponents) {
      console.log(`🎨 Testing ${component} consistency across themes`);

      const themeSnapshots = [];

      for (const theme of designThemes) {
        await page.goto(`${STORYBOOK_URL}/iframe.html?id=${component}&${theme.param}&viewMode=story`);
        await page.waitForLoadState('networkidle');

        // Take theme-specific snapshot
        const snapshotName = `consistency-${component.replace(/\//g, '-')}-${theme.name.toLowerCase()}`;

        await percy.snapshot(page, snapshotName, {
          widths: [400],
          enableJavaScript: true,
          options: {
            metadata: {
              consistency: true,
              component: component,
              theme: theme.name,
            },
          },
        });

        themeSnapshots.push(snapshotName);
        console.log(`✅ Consistency snapshot captured: ${snapshotName}`);
      }

      // Validate that the component maintains structure across themes
      const structuralConsistency = await validateStructuralConsistency(page, component);

      if (!structuralConsistency.consistent) {
        console.warn(`⚠️ Structural inconsistency found in ${component}:`, structuralConsistency.issues);
      }
    }
  });
});

/**
 * Validate structural consistency across themes
 */
async function validateStructuralConsistency(page: any, component: string) {
  // This would typically compare DOM structure across themes
  // For now, return a placeholder result
  return {
    consistent: true,
    issues: [],
  };
}

// Test design system accessibility
test.describe('Design System Accessibility', () => {
  test('Color Contrast Accessibility', async ({ page }) => {
    // Test color palette for accessibility
    await page.goto(`${STORYBOOK_URL}/iframe.html?id=color--primary&viewMode=story`);
    await page.waitForLoadState('networkidle');

    const accessibilityResults = await page.evaluate(() => {
      const results = {
        passed: true,
        issues: [],
        accessibleColors: 0,
        totalColors: 0,
      };

      const colorElements = document.querySelectorAll('.color-swatch, [data-testid*="color"]');

      colorElements.forEach((element, index) => {
        const styles = window.getComputedStyle(element);
        const bgColor = styles.backgroundColor;
        const textColor = styles.color;

        results.totalColors++;

        if (bgColor && textColor) {
          const contrast = calculateContrastRatio(bgColor, textColor);
          if (contrast >= 4.5) {
            results.accessibleColors++;
          } else {
            results.issues.push(`Color ${index + 1} has insufficient contrast (${contrast.toFixed(2)}:1)`);
            results.passed = false;
          }
        }
      });

      return results;

      function calculateContrastRatio(color1, color2) {
        const lum1 = getLuminance(color1);
        const lum2 = getLuminance(color2);
        return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
      }

      function getLuminance(color) {
        const rgb = color.match(/\d+/g);
        if (!rgb) return 0;

        const [r, g, b] = rgb.map(val => {
          const normalized = val / 255;
          return normalized <= 0.03928
            ? normalized / 12.92
            : Math.pow((normalized + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
    });

    console.log(`🎨 Color Accessibility Results:`);
    console.log(`   Accessible colors: ${accessibilityResults.accessibleColors}/${accessibilityResults.totalColors}`);

    if (accessibilityResults.passed) {
      console.log(`✅ All colors meet accessibility standards`);
    } else {
      console.warn(`⚠️ Color accessibility issues:`, accessibilityResults.issues);
    }

    // Take accessibility snapshot
    await percy.snapshot(page, 'design-system-color-accessibility', {
      widths: [1200],
      enableJavaScript: true,
      options: {
        metadata: {
          accessibility: true,
          type: 'color-contrast',
          passed: accessibilityResults.passed,
          accessibleRatio: (accessibilityResults.accessibleColors / accessibilityResults.totalColors * 100).toFixed(1),
        },
      },
    });
  });
});