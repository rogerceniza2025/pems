/**
 * Test setup for UI package
 * Configures SolidJS testing environment and global test utilities
 */

// Vitest globals are available when globals: true is in config

// Import CSS test utilities to make them globally available
import '@pems/config-tailwind/test/utils/css-test-utils';

// Setup global test environment
beforeEach(() => {
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
  });

  // Mock ResizeObserver
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Mock IntersectionObserver
  (globalThis as any).IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    root: Element | null = null;
    rootMargin: string = '';
    thresholds: number[] = [];
    scrollMargin: string = '';
    takeRecords(): IntersectionObserverEntry[] { return []; }
  };
});

// Clean up after each test
afterEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});