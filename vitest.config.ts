import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/global-setup.ts'],

    // Test execution settings to prevent hanging
    testTimeout: 30000,
    hookTimeout: 15000,
    isolate: false,
    maxConcurrency: 8,
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 2,
      },
    },

    // Test file patterns
    include: [
      'tests/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'packages/*/src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'apps/*/src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'modules/*/src/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
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
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
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

    // Reporting
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/vitest.json',
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
