import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.integration.setup.ts'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/*.stories.*',
        'dist/',
        'coverage/',
        '**/*.d.ts',
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
    },

    include: ['tests/integration/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules/', 'dist/', 'tests/unit/', 'tests/e2e/'],

    testTimeout: 45000,
    hookTimeout: 20000,
    isolate: true,
    maxConcurrency: 3,
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 3,
        minThreads: 1,
      },
    },

    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/integration.json',
    },

    // Global test environment
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ||
        'postgresql://test:test@localhost:5432/pems_test',
      REDIS_URL: process.env.TEST_REDIS_URL || 'redis://localhost:6379',
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
      '@pems/*': resolve(__dirname, './*'),
    },
  },
})
