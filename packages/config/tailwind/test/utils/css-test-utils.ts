/**
 * CSS Testing Utilities for Vitest
 * Provides helper functions for testing CSS styles, classes, and design tokens
 */

import { render } from 'solid-js/web'

// Make SolidJS JSX available globally
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var h: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var Fragment: any
}

// Use Vitest's expect functions (available globally when globals: true)

/**
 * Test utility for CSS class names
 */
export function expectClasses(element: HTMLElement, expectedClasses: string[]) {
  const elementClasses = Array.from(element.classList)

  expectedClasses.forEach((className) => {
    expect(elementClasses).toContain(className)
  })
}

/**
 * Test utility for checking if element has specific CSS classes
 */
export function hasClasses(
  element: HTMLElement,
  classNames: string[],
): boolean {
  const elementClasses = Array.from(element.classList)
  return classNames.every((className) => elementClasses.includes(className))
}

/**
 * Test utility for CSS custom properties
 */
export function expectCSSVariable(
  element: HTMLElement,
  property: string,
  expectedValue: string,
) {
  const computedStyle = getComputedStyle(element)
  const actualValue = computedStyle.getPropertyValue(property).trim()
  expect(actualValue).toBe(expectedValue)
}

/**
 * Test utility for checking CSS custom property exists
 */
export function hasCSSVariable(
  element: HTMLElement,
  property: string,
): boolean {
  const computedStyle = getComputedStyle(element)
  const value = computedStyle.getPropertyValue(property).trim()
  return value.length > 0
}

/**
 * Test utility for computed CSS properties
 */
export function expectComputedStyle(
  element: HTMLElement,
  property: string,
  expectedValue: string,
) {
  const computedStyle = getComputedStyle(element)
  const actualValue = computedStyle.getPropertyValue(property).trim()
  expect(actualValue).toBe(expectedValue)
}

/**
 * Test utility for responsive design
 */
export function expectResponsiveClasses(
  element: HTMLElement,
  _breakpoint: string,
  classes: string[],
) {
  // This would need to be implemented based on your responsive strategy
  // For now, we'll just check if the classes are present
  expectClasses(element, classes)
}

/**
 * Test utility for theme consistency
 */
export function expectThemeConsistency(
  elements: HTMLElement[],
  property: string,
) {
  if (elements.length === 0) {
    throw new Error('elements array cannot be empty')
  }
  const firstElement = elements[0]
  if (!firstElement) {
    throw new Error('First element is undefined')
  }
  const firstValue = getComputedStyle(firstElement)
    .getPropertyValue(property)
    .trim()

  elements.forEach((element, index) => {
    if (index > 0) {
      const currentValue = getComputedStyle(element)
        .getPropertyValue(property)
        .trim()
      expect(currentValue).toBe(firstValue)
    }
  })
}

/**
 * Test utility for accessibility color contrast
 */
export function expectColorContrast(
  foreground: string,
  background: string,
  minimumRatio: number = 4.5,
) {
  // This is a simplified contrast ratio calculation
  // In a real implementation, you'd want to use a proper color contrast library

  function getRelativeLuminance(color: string): number {
    // Simplified luminance calculation
    // In practice, you'd parse the HSL values properly
    if (color.includes('hsl')) {
      const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
      if (match) {
        const [, , , l] = match.map(Number)
        // Convert HSL to RGB then calculate luminance
        // This is a placeholder - use a proper color library in production
        return (l ?? 0) / 100
      }
    }
    return 1 // Default for white
  }

  const fgLuminance = getRelativeLuminance(foreground)
  const bgLuminance = getRelativeLuminance(background)

  const lighter = Math.max(fgLuminance, bgLuminance)
  const darker = Math.min(fgLuminance, bgLuminance)

  const contrastRatio = (lighter + 0.05) / (darker + 0.05)
  expect(contrastRatio).toBeGreaterThanOrEqual(minimumRatio)
}

/**
 * Test utility for focus management
 */
export function expectFocusable(element: HTMLElement) {
  expect(element.tabIndex).toBeGreaterThanOrEqual(0)
}

/**
 * Test utility for ARIA attributes
 */
export function expectAriaAttribute(
  element: HTMLElement,
  attribute: string,
  value: string,
) {
  expect(element.getAttribute(attribute)).toBe(value)
}

/**
 * Test utility for screen reader visibility
 */
export function expectScreenReaderVisible(element: HTMLElement) {
  const computedStyle = getComputedStyle(element)
  expect(computedStyle.position).toBe('absolute')
  expect(computedStyle.width).toBe('1px')
  expect(computedStyle.height).toBe('1px')
  expect(computedStyle.overflow).toBe('hidden')
}

/**
 * Test utility for reduced motion support
 */
export function expectReducedMotionSupport(element: HTMLElement) {
  const computedStyle = getComputedStyle(element)
  const transitionDuration = computedStyle.getPropertyValue(
    'transition-duration',
  )
  const animationDuration = computedStyle.getPropertyValue('animation-duration')

  // With prefers-reduced-motion, durations should be very short
  expect(transitionDuration).toBe('0.01ms')
  expect(animationDuration).toBe('0.01ms')
}

/**
 * Helper to render a component for testing
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderComponent(component: any): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)

  // Use hydrate instead of render to avoid server-side rendering issues
  render(() => component, container)

  return container.firstChild as HTMLElement
}

/**
 * Helper to clean up after tests
 */
export function cleanup() {
  document.body.innerHTML = ''
}

/**
 * Design token testing utilities
 */
export const DesignTokenTestUtils = {
  /**
   * Test if a design token follows the naming convention
   */
  expectTokenName(
    token: string,
    pattern: RegExp = /^--[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
  ) {
    expect(token).toMatch(pattern)
  },

  /**
   * Test if a color token is a valid HSL value
   */
  expectColorToken(token: string) {
    const hslPattern = /^hsl\(\d+,\s*\d+%,\s*\d+%\)$/
    expect(token).toMatch(hslPattern)
  },

  /**
   * Test if a spacing token is a valid CSS length
   */
  expectSpacingToken(token: string) {
    const lengthPattern = /^[\d.]+(rem|px|em|%)$/
    expect(token).toMatch(lengthPattern)
  },

  /**
   * Test if a font family token is valid
   */
  expectFontFamilyToken(token: string) {
    expect(token).toMatch(/^'[^']+'(,\s*[^,]+)*$/)
  },
}

/**
 * Performance testing utilities
 */
export const PerformanceTestUtils = {
  /**
   * Test if CSS is loaded efficiently
   */
  expectCSSEfficiency(_element: HTMLElement, maxStyleSheets: number = 3) {
    const styleSheets = document.styleSheets
    expect(styleSheets.length).toBeLessThanOrEqual(maxStyleSheets)
  },

  /**
   * Test if component renders without layout shift
   */
  expectNoLayoutShift(renderFn: () => HTMLElement) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const layoutShifts = entries.filter(
        (entry) => entry.entryType === 'layout-shift',
      )
      expect(layoutShifts.length).toBe(0)
    })

    observer.observe({ entryTypes: ['layout-shift'] })

    const element = renderFn()

    // Wait a bit for any layout shifts to be detected
    setTimeout(() => {
      observer.disconnect()
    }, 100)

    return element
  },
}
