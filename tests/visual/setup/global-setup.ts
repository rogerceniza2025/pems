import { chromium, FullConfig } from '@playwright/test';

/**
 * Global Setup for Visual Testing
 *
 * This setup function runs before all visual tests and prepares
 * the testing environment for visual regression testing.
 */

async function globalSetup(config: FullConfig) {
  console.log('🎨 Setting up visual testing environment...');

  // Verify required environment variables
  const requiredEnvVars = [
    'TEST_BASE_URL',
    'STORYBOOK_URL',
  ];

  const optionalEnvVars = [
    'PERCY_TOKEN',
    'CI',
    'GITHUB_ACTIONS',
  ];

  // Check required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`⚠️ Required environment variable ${envVar} is not set`);
    }
  }

  // Check optional environment variables
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ Environment variable ${envVar} is set`);
    }
  }

  // Start required services if not in CI
  if (!process.env.CI) {
    console.log('🚀 Starting local services for visual testing...');

    try {
      // Check if the application is running
      const browser = await chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();

      const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
      const storybookUrl = process.env.STORYBOOK_URL || 'http://localhost:3106';

      // Check if main application is running
      try {
        await page.goto(baseUrl, { timeout: 10000 });
        console.log(`✅ Main application is running at ${baseUrl}`);
      } catch (error) {
        console.error(`❌ Main application is not available at ${baseUrl}`);
        console.error('Please start the development server with: npm run dev');
        process.exit(1);
      }

      // Check if Storybook is running
      try {
        await page.goto(storybookUrl, { timeout: 10000 });
        console.log(`✅ Storybook is running at ${storybookUrl}`);
      } catch (error) {
        console.warn(`⚠️ Storybook is not available at ${storybookUrl}`);
        console.warn('Storybook tests will be skipped. Start Storybook with: npm run storybook');
      }

      await browser.close();
    } catch (error) {
      console.error('❌ Failed to start or verify services:', error);
      process.exit(1);
    }
  }

  // Create necessary directories for visual testing
  const fs = require('fs');
  const path = require('path');

  const directories = [
    'test-results/visual',
    'test-results/screenshots',
    'test-results/traces',
    'test-results/videos',
    'playwright-report/visual',
    'percy-snapshots',
  ];

  for (const dir of directories) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }

  // Verify Percy token if available
  if (process.env.PERCY_TOKEN) {
    console.log('🔍 Percy token found - visual snapshots will be uploaded');
  } else {
    console.log('⚠️ Percy token not found - visual snapshots will only be captured locally');
  }

  // Set up global test data for visual testing
  await setupVisualTestData();

  console.log('✅ Visual testing environment setup complete');
}

/**
 * Set up test data specifically for visual testing
 */
async function setupVisualTestData() {
  console.log('📋 Setting up visual test data...');

  // Create test user data for consistent visual testing
  const testUsers = [
    {
      id: 'visual-test-user-1',
      email: 'visual-test@example.com',
      firstName: 'Visual',
      lastName: 'Tester',
      avatar: 'https://ui-avatars.com/api/?name=Visual+Tester&background=3182ce&color=fff&size=128',
    },
    {
      id: 'visual-test-user-2',
      email: 'demo@pems.com',
      firstName: 'Demo',
      lastName: 'User',
      avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=38a169&color=fff&size=128',
    },
  ];

  // Store test data in environment variables or a temporary file
  process.env.VISUAL_TEST_USERS = JSON.stringify(testUsers);

  console.log(`✅ Set up ${testUsers.length} test users for visual testing`);

  // Set up consistent timestamps for visual testing
  const fixedTimestamp = '2024-01-15T10:30:00.000Z';
  process.env.VISUAL_TEST_TIMESTAMP = fixedTimestamp;

  // Set up consistent dates
  const fixedDate = '2024-01-15';
  process.env.VISUAL_TEST_DATE = fixedDate;

  console.log('✅ Fixed timestamps and dates configured for visual consistency');
}

export default globalSetup;