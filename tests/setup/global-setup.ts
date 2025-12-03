import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Global test configuration
global.console = {
  ...console,
  // Uncomment to ignore specific console logs during tests
  // log: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
}

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.TZ = 'Asia/Manila'

// Mock fetch if needed
global.fetch = vi.fn()

// Mock Web APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Setup global test utilities
// Commented out for basic unit tests to avoid database dependencies
// import { setupTestDatabase } from '@tests/helpers/database'
// import { createTestFactories } from '@tests/helpers/factories'

// beforeAll(async () => {
//   await setupTestDatabase()
//   createTestFactories()
// })

// afterAll(async () => {
//   // Cleanup test database
//   await setupTestDatabase().cleanup()
// })

// Global test timeout
vi.setConfig({ testTimeout: 10000 })
