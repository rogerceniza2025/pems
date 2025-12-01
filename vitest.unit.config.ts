import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.unit.setup.ts'],
    
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
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    
    include: [
      'tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'tests/integration/',
      'tests/e2e/',
    ],
    
    testTimeout: 5000,
    hookTimeout: 5000,
    isolate: true,
    maxConcurrency: 6,
    
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/unit.json',
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