/**
 * Test setup for UI package
 * Configures SolidJS testing environment and global test utilities
 */

// Test imports removed as they're causing unused variable errors
// import { render } from 'solid-testing-library'
// import { fireEvent, screen } from 'solid-testing-library'

// Vitest globals are available when globals: true is in config

// Import CSS test utilities to make them globally available
import '@pems/config-tailwind/test/utils/css-test-utils'

// Configure Solid.js for client-side testing
global.isServer = false

// Mock server-side rendering APIs to force client-side mode
Object.defineProperty(global, "window", {
  value: global.window,
  writable: true
})

// Setup global test environment
beforeEach(() => {
  // Mock window.location to avoid triggering browser-specific behavior
  Object.defineProperty(window, 'location', {
    writable: true,
    value: {
      hostname: 'test.example.com',
    },
  })

  // Mock window.matchMedia for responsive tests
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  })

  // Mock ResizeObserver
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  // Mock IntersectionObserver
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    root: Element | null = null
    rootMargin: string = ''
    thresholds: number[] = []
    scrollMargin: string = ''
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }

  // Mock requestAnimationFrame
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).requestAnimationFrame = (
    callback: FrameRequestCallback,
  ) => {
    return setTimeout(callback, 16)
  }

  // Mock cancelAnimationFrame
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).cancelAnimationFrame = (id: number) => {
    clearTimeout(id)
  }
})

// Clean up after each test
afterEach(() => {
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})
