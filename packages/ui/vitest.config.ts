import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    environmentOptions: {
      jsdom: {
        url: "http://localhost:3000",
        resources: "usable",
        runScripts: "dangerously",
      },
    },
    
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
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'test/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'tests/integration/',
      'tests/e2e/',
    ],
    
    testTimeout: 10000,
    hookTimeout: 10000,
    isolate: true,
    maxConcurrency: 4,
    
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/ui.json',
    },
  },
  
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
  optimizeDeps: {
    exclude: ['solid-js'],
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
      '@pems/*': resolve(__dirname, './*'),
    },
  },
})