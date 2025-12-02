import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/global-setup.ts'],

    // Fast execution settings for development
    testTimeout: 15000,
    hookTimeout: 10000,
    isolate: false,
    maxConcurrency: 6,

    // Focus on critical test files only
    include: [
      'packages/*/src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'apps/*/src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/unit/**/*.test.ts',
    ],

    // Exclude expensive integration and performance tests
    exclude: [
      'node_modules/',
      'dist/',
      'coverage/',
      'test-results/',
      '**/*.config.*',
      '**/*.stories.*',
      '**/*.d.ts',
      'packages/**/node_modules/**',
      'apps/**/node_modules/**',
      'modules/**/node_modules/**',
      'tests/integration/**',
      'tests/chaos/**',
      'tests/performance/**',
      'tests/visual/**',
      'tests/contracts/**',
      'tests/security/**/*.test.ts',
      'tests/api/**/*.test.ts',
      'tests/database/**/*.test.ts',
    ],

    // Simplified coverage for faster runs
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/*.test.*',
        'dist/',
        'coverage/',
        '**/*.d.ts',
      ],
    },

    // Simplified reporting
    reporters: ['verbose'],
    outputFile: {
      json: './test-results/vitest-fast.json',
    },

    // Environment variables
    env: {
      NODE_ENV: 'test',
      TZ: 'Asia/Manila',
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
