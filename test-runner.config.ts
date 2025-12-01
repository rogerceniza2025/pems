import type { TestRunnerConfig } from '@storybook/test-runner';

const config: TestRunnerConfig = {
  // The directory of story files relative to the config file
  storiesGlob: '**/*.stories.@(js|jsx|ts|tsx|mdx)',

  // The number of concurrent browser instances to run tests
  maxConcurrency: 4,

  // Directory to store visual regression screenshots
  storybookUrl: 'http://localhost:6006',

  // Options for the test runner
  options: {
    // Skip stories with these tags
    skipTags: ['skip-test'],

    // Only run stories with these tags
    includeTags: ['test'],

    // Run in headless mode (default is true in CI, false in development)
    getSkipOption: () => {
      const isCI = process.env.CI;
      return !isCI;
    },

    // Browser options
    browserNewContextOptions: {
      // Emulate different devices
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,

      // Color scheme
      colorScheme: 'light',

      // Locale
      locale: 'en-US',

      // Timezone
      timezoneId: 'America/New_York',

      // User agent
      userAgent: 'Storybook Test Runner',

      // Permissions
      permissions: [],

      // Ignore HTTPS errors
      ignoreHTTPSErrors: true,
    },
  },

  // Post-process screenshots before comparison
  postProcessScreenshot: (screenshot) => {
    // You can add custom post-processing here
    // For example: cropping, masking, etc.
    return screenshot;
  },

  // Customize the test runner hook
  prepareStories: async (stories) => {
    // Custom story preparation logic
    return stories;
  },

  // Hook that runs before all tests
  preVisit: async (page) => {
    // Wait for fonts to load
    await page.evaluate(() => {
      return document.fonts.ready;
    });

    // Wait for images to load
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.every((img) => img.complete);
    });

    // Wait for any pending animations
    await page.waitForTimeout(100);
  },

  // Hook that runs after each test
  postVisit: async (page, context) => {
    // You can add custom post-visit logic here
    // For example: checking for console errors, etc.
  },

  // Hook for watching files during development
  watchignore: (filePath) => {
    return filePath.includes('.snap');
  },

  // Configuration for different environments
  getStoryContext: async (context, storyId, title, name) => {
    // Return context for testing
    return context;
  },
};

export default config;