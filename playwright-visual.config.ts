import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Visual Testing Configuration
 *
 * This configuration extends the base Playwright setup with specific
 * configurations for visual regression testing with Percy integration.
 */

export default defineConfig({
  testDir: './tests/visual',

  // Global settings for visual tests
  use: {
    // Base URL for tests
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',

    // Viewport configuration
    viewport: { width: 1280, height: 800 },

    // Ignore HTTPS errors for testing
    ignoreHTTPSErrors: true,

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Trace configuration
    trace: 'retain-on-failure',

    // Wait for network idle
    waitUntil: 'networkidle',

    // Test timeout (longer for visual tests)
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  // Test files to include
  testMatch: [
    '**/*.visual.test.ts',
    '**/*.visual.spec.ts',
    'tests/visual/**/*.test.ts',
  ],

  // Files to exclude
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
  ],

  // Reporter configuration for visual testing
  reporter: [
    ['html', { outputFolder: 'playwright-report/visual' }],
    ['json', { outputFile: 'test-results/visual-results.json' }],
    ['junit', { outputFile: 'test-results/visual-junit.xml' }],
    ['line'], // Console output
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./tests/visual/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/visual/setup/global-teardown.ts'),

  // Test project configurations
  projects: [
    {
      name: 'visual-chrome',
      use: {
        ...devices['Desktop Chrome'],
        // Visual testing specific settings
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write'],
        },
        // Custom headers for visual testing
        extraHTTPHeaders: {
          'X-Visual-Testing': 'true',
          'X-Test-Environment': 'playwright-visual',
        },
      },
      testMatch: [
        'tests/visual/percy/**/*.test.ts',
        'tests/visual/responsive/**/*.test.ts',
      ],
      dependencies: ['setup-auth'], // Run auth setup first
    },

    {
      name: 'visual-firefox',
      use: {
        ...devices['Desktop Firefox'],
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write'],
        },
        extraHTTPHeaders: {
          'X-Visual-Testing': 'true',
          'X-Test-Environment': 'playwright-visual-firefox',
        },
      },
      testMatch: [
        'tests/visual/percy/cross-browser.test.ts',
        'tests/visual/themes/theme-consistency.test.ts',
      ],
      dependencies: ['setup-auth'],
    },

    {
      name: 'visual-webkit',
      use: {
        ...devices['Desktop Safari'],
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write'],
        },
        extraHTTPHeaders: {
          'X-Visual-Testing': 'true',
          'X-Test-Environment': 'playwright-visual-webkit',
        },
      },
      testMatch: [
        'tests/visual/percy/cross-browser.test.ts',
      ],
      dependencies: ['setup-auth'],
    },

    {
      name: 'visual-mobile',
      use: {
        ...devices['iPhone 12'],
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write'],
          // Mobile-specific settings
          isMobile: true,
          hasTouch: true,
        },
        extraHTTPHeaders: {
          'X-Visual-Testing': 'true',
          'X-Test-Environment': 'playwright-visual-mobile',
        },
      },
      testMatch: [
        'tests/visual/responsive/responsive-design.test.ts',
        'tests/visual/percy/critical-journeys.test.ts',
      ],
      dependencies: ['setup-auth'],
    },

    {
      name: 'visual-tablet',
      use: {
        ...devices['iPad Pro'],
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write'],
          isMobile: true,
          hasTouch: true,
        },
        extraHTTPHeaders: {
          'X-Visual-Testing': 'true',
          'X-Test-Environment': 'playwright-visual-tablet',
        },
      },
      testMatch: [
        'tests/visual/responsive/responsive-design.test.ts',
        'tests/visual/themes/theme-consistency.test.ts',
      ],
      dependencies: ['setup-auth'],
    },

    {
      name: 'storybook-visual',
      use: {
        ...devices['Desktop Chrome'],
        // Storybook specific settings
        baseURL: process.env.STORYBOOK_URL || 'http://localhost:3106',
        extraHTTPHeaders: {
          'X-Visual-Testing': 'true',
          'X-Test-Environment': 'playwright-storybook',
        },
      },
      testMatch: [
        'tests/visual/storybook/**/*.test.ts',
      ],
      // Don't depend on auth setup for Storybook tests
    },

    {
      name: 'setup-auth',
      testMatch: '**/*auth*.setup.ts',
    },
  ],

  // Web server configuration (if needed)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Output directory
  outputDir: 'test-results/visual',

  // Timeout configurations
  timeout: 120000, // 2 minutes
  expect: {
    // More lenient timeouts for visual tests
    timeout: 15000,
  },

  // Retry configuration (lower for visual tests to avoid false positives)
  retries: process.env.CI ? 1 : 0,

  // Parallel execution
  fullyParallel: false, // Visual tests often need specific order
  workers: process.env.CI ? 2 : 1,

  // Environment variables
  env: {
    // Percy configuration
    PERCY_TOKEN: process.env.PERCY_TOKEN,
    PERCY_BRANCH: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || 'main',
    PERCY_TARGET_BRANCH: process.env.GITHUB_BASE_REF || 'main',
    PERCY_PULL_REQUEST: process.env.GITHUB_PULL_REQUEST || '',

    // Test environment
    NODE_ENV: 'test',
    VISUAL_TESTING: 'true',

    // Feature flags for visual testing
    DISABLE_ANIMATIONS: 'true',
    FORCE_COLORS: 'true',
    STABILIZE_IMAGES: 'true',
  },

  // Metadata for test organization
  metadata: {
    'test-type': 'visual-regression',
    'purpose': 'ui-consistency',
    'automation': 'percy',
    'environments': ['chrome', 'firefox', 'webkit', 'mobile', 'tablet'],
  },
});