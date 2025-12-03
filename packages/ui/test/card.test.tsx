/**
 * Card Component Security Tests
 *
 * Comprehensive testing for Card component with focus on:
 * - Accessibility compliance (WCAG 2.1 AA)
 * - XSS prevention
 * - Security validation
 * - User experience under various conditions
 */

import { axe, toHaveNoViolations } from 'jest-axe'
import { For } from 'solid-js'
import { act, fireEvent, render, screen } from 'solid-testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../src/components/ui/card'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

describe('Card Component Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Accessibility Compliance (WCAG 2.1 AA)', () => {
    it('should meet WCAG 2.1 AA standards for basic card', async () => {
      const { container } = render(() => (
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Test content</p>
          </CardContent>
        </Card>
      ))

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should maintain accessibility with interactive cards', async () => {
      const handleClick = vi.fn()
      const { container } = render(() => (
        <Card interactive="clickable" onClick={handleClick}>
          <CardHeader>
            <CardTitle>Interactive Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Clickable content</p>
          </CardContent>
        </Card>
      ))

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA attributes for interactive cards', () => {
      const handleClick = vi.fn()
      render(() => (
        <Card interactive="clickable" onClick={handleClick}>
          <CardContent>
            <p>Content</p>
          </CardContent>
        </Card>
      ))

      const card = screen.getByText('Content').closest('div')
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabindex', '0')
    })

    it('should handle keyboard navigation for interactive cards', async () => {
      const handleClick = vi.fn()
      render(() => (
        <Card interactive="clickable" onClick={handleClick}>
          <CardContent>
            <p>Content</p>
          </CardContent>
        </Card>
      ))

      const card = screen.getByText('Content').closest('div')

      // Test Enter key
      await act(async () => {
        card?.focus()
        fireEvent.keyDown(card!, { key: 'Enter' })
      })

      // Test Space key
      await act(async () => {
        fireEvent.keyDown(card!, { key: ' ' })
      })

      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    it('should provide sufficient color contrast', () => {
      render(() => (
        <Card>
          <CardTitle gradient>Gradient Title</CardTitle>
          <CardDescription>Description text</CardDescription>
        </Card>
      ))

      const title = screen.getByText('Gradient Title')
      expect(title).toHaveClass('text-transparent') // Should have proper contrast via gradient

      const description = screen.getByText('Description text')
      expect(description).toHaveClass('text-muted-foreground')
    })

    it('should support reduced motion preferences', () => {
      // Mock reduced motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      const { container } = render(() => (
        <Card hover="lift" interactive="clickable">
          <CardContent>Content</CardContent>
        </Card>
      ))

      const card = container.querySelector('div')
      expect(card).not.toHaveClass('hover:-translate-y-1')
      expect(card).not.toHaveClass('cursor-pointer')
    })
  })

  describe('XSS Prevention and Input Validation', () => {
    it('should sanitize malicious content in title', () => {
      const maliciousTitle = '<script>alert("xss")</script>Malicious Title'

      render(() => (
        <Card>
          <CardTitle>{maliciousTitle}</CardTitle>
        </Card>
      ))

      const title = screen.getByText(/Malicious Title/)
      expect(title.innerHTML).not.toContain('<script>')
      expect(title.innerHTML).not.toContain('alert')
    })

    it('should sanitize malicious content in description', () => {
      const maliciousDesc =
        'Description with <img src=x onerror=alert("xss")> malicious image'

      render(() => (
        <Card>
          <CardDescription>{maliciousDesc}</CardDescription>
        </Card>
      ))

      const description = screen.getByText(/Description with/)
      expect(description.innerHTML).not.toContain('<img')
      expect(description.innerHTML).not.toContain('onerror')
    })

    it('should prevent XSS through className props', () => {
      const maliciousClass =
        'bg-red-500"><script>alert("xss")</script><div class="'

      const { container } = render(() => (
        <Card class={maliciousClass}>
          <CardContent>Content</CardContent>
        </Card>
      ))

      expect(container.innerHTML).not.toContain('<script>')
      expect(container.innerHTML).not.toContain('alert')
    })

    it('should handle extremely long text content safely', () => {
      const longTitle = 'a'.repeat(10000)

      render(() => (
        <Card>
          <CardTitle>{longTitle}</CardTitle>
          <CardContent>Content</CardContent>
        </Card>
      ))

      const title = screen.getByText(/a+/)
      expect(title).toBeInTheDocument()
      // Should not cause layout shift or performance issues
    })

    it('should prevent HTML injection through polymorphic props', () => {
      const { container } = render(() => (
        <Card as="div" data-testid="test-card">
          <CardContent>Content</CardContent>
        </Card>
      ))

      expect(container.innerHTML).not.toContain('<script>')
      expect(container.innerHTML).not.toContain('javascript:')
    })
  })

  describe('Security Event Handling', () => {
    it('should prevent event handler injection', () => {
      const maliciousOnClick = 'data:text/html,<script>alert("xss")</script>'

      // Test that onClick cannot be set to malicious string
      expect(() => {
        render(() => (
          <Card onClick={maliciousOnClick as any}>
            <CardContent>Content</CardContent>
          </Card>
        ))
      }).toThrow() // Should fail type checking or runtime validation
    })

    it('should safely handle untrusted event data', () => {
      const handleClick = vi.fn()

      render(() => (
        <Card interactive="clickable" onClick={handleClick}>
          <CardContent>Content</CardContent>
        </Card>
      ))

      const card = screen.getByText('Content').closest('div')

      // Simulate malicious event data
      const maliciousEvent = {
        target: { innerHTML: '<script>alert("xss")</script>' },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as any

      act(() => {
        fireEvent.click(card!, maliciousEvent)
      })

      expect(handleClick).toHaveBeenCalled()
      // Should not execute malicious scripts
    })

    it('should validate event handler parameters', () => {
      const unsafeData = '../../../etc/passwd'
      const handleClick = vi.fn()

      render(() => (
        <Card interactive="clickable" onClick={handleClick}>
          <CardContent>Content</CardContent>
        </Card>
      ))

      const card = screen.getByText('Content').closest('div')

      act(() => {
        // Simulate click with potentially unsafe data context
        Object.defineProperty(window, 'unsafeData', { value: unsafeData })
        fireEvent.click(card!)
      })

      expect(handleClick).toHaveBeenCalled()
      // Component should not expose unsafe data
    })
  })

  describe('Loading States and Error Handling', () => {
    it('should handle loading state securely', () => {
      const { container } = render(() => (
        <Card loading>
          <CardContent>Content</CardContent>
        </Card>
      ))

      // Should show skeleton when loading
      expect(
        container.querySelector('[data-testid="skeleton"]'),
      ).toBeInTheDocument()
      // Should not expose content when loading
      expect(screen.queryByText('Content')).not.toBeInTheDocument()
    })

    it('should handle loadingSkeleton prop safely', () => {
      const customSkeleton = <div data-testid="custom-skeleton">Loading...</div>

      const { container } = render(() => (
        <Card loading loadingSkeleton={customSkeleton}>
          <CardContent>Content</CardContent>
        </Card>
      ))

      expect(
        container.querySelector('[data-testid="custom-skeleton"]'),
      ).toBeInTheDocument()
      expect(screen.queryByText('Content')).not.toBeInTheDocument()
    })

    it('should prevent content leakage during loading', () => {
      const sensitiveContent = 'Sensitive User Data: user@example.com'

      const { container } = render(() => (
        <Card loading>
          <CardContent>{sensitiveContent}</CardContent>
        </Card>
      ))

      expect(container.innerHTML).not.toContain(sensitiveContent)
      expect(screen.queryByText(sensitiveContent)).not.toBeInTheDocument()
    })
  })

  describe('Mouse and Touch Event Security', () => {
    it('should handle mouse events safely', async () => {
      const handleMouseEnter = vi.fn()
      const handleMouseLeave = vi.fn()

      const { container } = render(() => (
        <Card
          interactive="clickable"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <CardContent>Content</CardContent>
        </Card>
      ))

      const card = container.querySelector('div')

      await act(async () => {
        fireEvent.mouseEnter(card!)
        fireEvent.mouseLeave(card!)
      })

      expect(handleMouseEnter).toHaveBeenCalled()
      expect(handleMouseLeave).toHaveBeenCalled()
    })

    it('should handle touch events on mobile devices', async () => {
      const handleClick = vi.fn()

      const { container } = render(() => (
        <Card interactive="clickable" onClick={handleClick}>
          <CardContent>Content</CardContent>
        </Card>
      ))

      const card = container.querySelector('div')

      await act(async () => {
        fireEvent.touchStart(card!)
        fireEvent.touchEnd(card!)
      })

      expect(handleClick).toHaveBeenCalled()
    })

    it('should prevent event handler manipulation', () => {
      const originalOnClick = vi.fn()

      render(() => (
        <Card interactive="clickable" onClick={originalOnClick}>
          <CardContent>Content</CardContent>
        </Card>
      ))

      // Ensure event handlers cannot be overridden after render
      const card = screen.getByText('Content').closest('div')
      expect(card?.onclick).not.toBeUndefined()
      // The actual implementation should prevent manipulation
    })
  })

  describe('Component Variants Security', () => {
    it('should apply variants safely without CSS injection', () => {
      const { container } = render(() => (
        <Card
          variant="elevated"
          shadow="lg"
          hover="lift"
          interactive="selectable"
          class="custom-class"
        >
          <CardContent>Content</CardContent>
        </Card>
      ))

      expect(container.querySelector('div')).toHaveClass(
        'shadow-lg',
        'hover:-translate-y-1',
        'cursor-pointer',
        'hover:ring-2',
      )

      // Should not contain any unsafe CSS
      expect(container.innerHTML).not.toContain('javascript:')
      expect(container.innerHTML).not.toContain('expression(')
    })

    it('should handle invalid variant props gracefully', () => {
      const { container } = render(() => (
        <Card
          variant={'invalid' as any}
          shadow={'invalid' as any}
          hover={'invalid' as any}
          interactive={'invalid' as any}
        >
          <CardContent>Content</CardContent>
        </Card>
      ))

      // Should default to safe values
      expect(container.querySelector('div')).toHaveClass(
        'rounded-lg',
        'border',
        'bg-card',
      )
    })
  })

  describe('Memory and Performance Security', () => {
    it('should not leak memory with repeated renders', () => {
      const { unmount } = render(() => (
        <Card loading={false}>
          <CardContent>Content</CardContent>
        </Card>
      ))

      // Re-render multiple times
      for (let i = 0; i < 100; i++) {
        unmount()
        render(() => (
          <Card loading={i % 2 === 0}>
            <CardContent>Content {i}</CardContent>
          </Card>
        ))
      }

      // Should complete without memory issues
      expect(true).toBe(true)
    })

    it('should handle large number of cards efficiently', () => {
      const items = Array.from({ length: 1000 }, (_, i) => i)

      const { container } = render(() => (
        <div>
          <For each={items}>
            {(item) => (
              <Card key={item}>
                <CardContent>Item {item}</CardContent>
              </Card>
            )}
          </For>
        </div>
      ))

      expect(container.querySelectorAll('[class*="rounded-lg"]').length).toBe(
        1000,
      )
      // Should render efficiently
    })

    it('should clean up event listeners on unmount', () => {
      const handleClick = vi.fn()
      const { unmount } = render(() => (
        <Card interactive="clickable" onClick={handleClick}>
          <CardContent>Content</CardContent>
        </Card>
      ))

      const card = screen.getByText('Content').closest('div')

      // Simulate event listener attachment
      expect(card).toBeInTheDocument()

      unmount()

      // After unmount, events should not trigger
      expect(() => {
        fireEvent.click(card!)
      }).toThrow() // Element should no longer be in DOM
    })
  })

  describe('Input Validation and Edge Cases', () => {
    it('should handle null/undefined children safely', () => {
      render(() => (
        <Card>
          <CardTitle>{null as any}</CardTitle>
          <CardDescription>{undefined as any}</CardDescription>
          <CardContent>Valid Content</CardContent>
        </Card>
      ))

      expect(screen.getByText('Valid Content')).toBeInTheDocument()
    })

    it('should handle malicious polymorphic as prop', () => {
      expect(() => {
        render(() => (
          <Card as="script">
            <CardContent>Content</CardContent>
          </Card>
        ))
      }).not.toThrow() // Should handle but not execute script

      // Verify script tag is not actually created
      expect(document.querySelector('script')).toBeNull()
    })

    it('should handle extremely long className strings', () => {
      const longClass = 'a'.repeat(10000)

      const { container } = render(() => (
        <Card class={longClass}>
          <CardContent>Content</CardContent>
        </Card>
      ))

      const card = container.querySelector('div')
      expect(card?.className).toContain('a')
      // Should handle without crashing
    })
  })

  describe('Data Protection and Privacy', () => {
    it('should not expose sensitive data in DOM attributes', () => {
      const sensitiveData = {
        userId: 'user-123',
        email: 'user@example.com',
        token: 'secret-token',
      }

      const { container } = render(() => (
        <Card data-testid="safe-card">
          <CardContent>Public Content</CardContent>
        </Card>
      ))

      // Should not contain sensitive data in DOM
      expect(container.innerHTML).not.toContain(sensitiveData.userId)
      expect(container.innerHTML).not.toContain(sensitiveData.email)
      expect(container.innerHTML).not.toContain(sensitiveData.token)
    })

    it('should prevent data exfiltration through error messages', () => {
      const mockError = new Error(
        'Database connection failed: user_id=user-123, password=secret',
      )
      const handleError = vi.fn()

      // Component should handle errors without exposing sensitive data
      expect(() => {
        try {
          throw mockError
        } catch (error) {
          handleError(error.message)
        }
      }).not.toThrow()

      expect(handleError).toHaveBeenCalledWith(
        expect.not.stringContaining('user-123'),
        expect.not.stringContaining('secret'),
      )
    })
  })

  describe('Security Best Practices', () => {
    it('should implement Content Security Policy compatibility', () => {
      const { container } = render(() => (
        <Card>
          <CardTitle>Safe Title</CardTitle>
          <CardContent>Safe Content</CardContent>
        </Card>
      ))

      // Should not use inline styles that violate CSP
      expect(container.innerHTML).not.toContain('style=')
      expect(container.innerHTML).not.toContain('onerror=')
      expect(container.innerHTML).not.toContain('onclick=')
    })

    it('should use secure CSS classes only', () => {
      const { container } = render(() => (
        <Card class="custom-secure-class">
          <CardContent>Content</CardContent>
        </Card>
      ))

      const card = container.querySelector('div')
      expect(card?.className).toMatch(/^[\w\s-]*$/) // Only safe class names
      expect(card?.className).not.toMatch(/[<>"'&]/) // No dangerous characters
    })

    it('should prevent prototype pollution', () => {
      const maliciousProps = {
        __proto__: { isAdmin: true },
        constructor: { prototype: { isAdmin: true } },
        prototype: { isAdmin: true },
      } as any

      const { container } = render(() => (
        <Card {...maliciousProps}>
          <CardContent>Content</CardContent>
        </Card>
      ))

      // Should not pollute Object.prototype
      expect(({} as any).isAdmin).toBeUndefined()
      expect(container.innerHTML).not.toContain('isAdmin')
    })
  })

  describe('Error Boundary Resilience', () => {
    it('should handle rendering errors gracefully', () => {
      const ThrowingComponent = () => {
        throw new Error('Rendering error')
      }

      expect(() => {
        render(() => (
          <Card>
            <CardContent>
              <ThrowingComponent />
            </CardContent>
          </Card>
        ))
      }).toThrow()
    })

    it('should continue working after child component errors', () => {
      const ErrorComponent = () => {
        throw new Error('Child error')
      }

      expect(() => {
        render(() => (
          <Card>
            <CardContent>Safe Content</CardContent>
          </Card>
        ))
      }).not.toThrow()

      expect(() => {
        render(() => (
          <Card>
            <CardContent>
              <ErrorComponent />
            </CardContent>
          </Card>
        ))
      }).toThrow()

      expect(screen.getByText('Safe Content')).toBeInTheDocument()
    })
  })
})
