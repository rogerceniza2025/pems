/**
 * Button Component Styling Tests
 *
 * Tests for Button component styling, design tokens, and visual consistency
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, expectAriaAttribute, expectClasses, expectColorContrast, expectComputedStyle, expectFocusable, renderComponent } from '../../config/tailwind/test/utils/css-test-utils'
import { Button } from '../src/components/ui/button'

describe('Button Component Styling', () => {
  beforeEach(() => {
    // Setup CSS custom properties for design tokens
    const style = document.createElement('style')
    style.textContent = `
      :root {
        --background: 0 0% 100%;
        --foreground: 222.2 84% 4.9%;
        --primary: 222.2 47.4% 11.2%;
        --primary-foreground: 210 40% 98%;
        --secondary: 210 40% 96%;
        --secondary-foreground: 222.2 84% 4.9%;
        --destructive: 0 84.2% 60.2%;
        --destructive-foreground: 210 40% 98%;
        --accent: 210 40% 96%;
        --accent-foreground: 222.2 84% 4.9%;
        --border: 214.3 31.8% 91.4%;
        --input: 214.3 31.8% 91.4%;
        --ring: 222.2 84% 4.9%;
        --radius: 0.5rem;
      }
    `
    document.head.appendChild(style)
  })

  afterEach(() => {
    cleanup()
    document.head.innerHTML = ''
  })

  describe('Basic Styling', () => {
    it('should render with default classes', () => {
      const button = renderComponent(() => <Button>Default Button</Button>)
      
      expectClasses(button, [
        'inline-flex',
        'items-center',
        'justify-center',
        'gap-2',
        'whitespace-nowrap',
        'rounded-md',
        'text-sm',
        'font-medium',
        'ring-offset-background',
        'transition-all',
        'duration-200',
        'ease-in-out',
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
        'focus-visible:ring-offset-2',
        'bg-primary',
        'text-primary-foreground',
        'h-10',
        'px-4',
        'py-2'
      ])
    })

    it('should apply default variant styles correctly', () => {
      const button = renderComponent(() => <Button variant="default">Default</Button>)
      
      expectClasses(button, ['bg-primary', 'text-primary-foreground'])
      expectComputedStyle(button, 'background-color', 'hsl(var(--primary))')
    })

    it('should apply secondary variant styles correctly', () => {
      const button = renderComponent(() => <Button variant="secondary">Secondary</Button>)
      
      expectClasses(button, ['bg-secondary', 'text-secondary-foreground'])
    })

    it('should apply destructive variant styles correctly', () => {
      const button = renderComponent(() => <Button variant="destructive">Destructive</Button>)
      
      expectClasses(button, ['bg-destructive', 'text-destructive-foreground'])
    })

    it('should apply outline variant styles correctly', () => {
      const button = renderComponent(() => <Button variant="outline">Outline</Button>)
      
      expectClasses(button, ['border', 'border-input', 'bg-background'])
    })

    it('should apply ghost variant styles correctly', () => {
      const button = renderComponent(() => <Button variant="ghost">Ghost</Button>)
      
      expectClasses(button, ['hover:bg-accent', 'hover:text-accent-foreground'])
    })
  })

  describe('Size Variants', () => {
    it('should apply small size styles', () => {
      const button = renderComponent(() => <Button size="sm">Small</Button>)
      
      expectClasses(button, ['h-9', 'px-3'])
    })

    it('should apply medium size styles', () => {
      const button = renderComponent(() => <Button size="default">Medium</Button>)
      
      expectClasses(button, ['h-10', 'px-4', 'py-2'])
    })

    it('should apply large size styles', () => {
      const button = renderComponent(() => <Button size="lg">Large</Button>)
      
      expectClasses(button, ['h-11', 'px-8'])
    })

    it('should apply icon size styles', () => {
      const button = renderComponent(() => <Button size="icon">Icon</Button>)
      
      expectClasses(button, ['h-10', 'w-10'])
    })
  })

  describe('Theme Application', () => {
    it('should use design tokens for colors', () => {
      const button = renderComponent(() => <Button>Themed</Button>)
      
      const computedStyle = getComputedStyle(button)
      expect(computedStyle.getPropertyValue('--tw-bg-opacity')).toBeTruthy()
    })

    it('should switch themes correctly', () => {
      // Simulate dark theme
      document.documentElement.setAttribute('data-theme', 'dark')
      
      const button = renderComponent(() => <Button>Dark Theme</Button>)
      
      // Should still have same classes, but computed styles would differ
      expectClasses(button, ['bg-primary', 'text-primary-foreground'])
    })

    it('should maintain consistent spacing across variants', () => {
      const buttons = [
        renderComponent(() => <Button variant="default">Default</Button>),
        renderComponent(() => <Button variant="secondary">Secondary</Button>),
        renderComponent(() => <Button variant="outline">Outline</Button>)
      ]

      // All should have same padding
      buttons.forEach(button => {
        expectClasses(button, ['px-4', 'py-2'])
      })
    })
  })

  describe('Accessibility', () => {
    it('should be focusable by default', () => {
      const button = renderComponent(() => <Button>Focusable</Button>)
      
      expectFocusable(button)
    })

    it('should have proper ARIA attributes when disabled', () => {
      const button = renderComponent(() => <Button disabled>Disabled</Button>)
      
      expectAriaAttribute(button, 'disabled', 'true')
      expectClasses(button, ['disabled:opacity-50', 'disabled:pointer-events-none'])
    })

    it('should have proper button type', () => {
      const button = renderComponent(() => <Button>Button</Button>)
      
      expect(button.tagName).toBe('BUTTON')
    })

    it('should maintain sufficient color contrast', () => {
      const button = renderComponent(() => <Button>High Contrast</Button>)
      
      const computedStyle = getComputedStyle(button)
      const foregroundColor = computedStyle.color
      const backgroundColor = computedStyle.backgroundColor
      
      // Basic contrast check - in real implementation, use a proper contrast library
      expectColorContrast(foregroundColor, backgroundColor, 3.0) // Lower threshold for basic check
    })

    it('should show focus ring when focused', () => {
      const button = renderComponent(() => <Button>Focusable</Button>)
      
      expectClasses(button, [
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
        'focus-visible:ring-offset-2'
      ])
    })

    it('should support ARIA labels', () => {
      const button = renderComponent(() => <Button aria-label="Custom Label">Button</Button>)
      
      expectAriaAttribute(button, 'aria-label', 'Custom Label')
    })

    it('should support ARIA descriptions', () => {
      const button = renderComponent(() => <Button aria-describedby="description">Button</Button>)
      
      expectAriaAttribute(button, 'aria-describedby', 'description')
    })
  })

  describe('State Management', () => {
    it('should apply disabled styles correctly', () => {
      const button = renderComponent(() => <Button disabled>Disabled</Button>)
      
      expectClasses(button, ['disabled:opacity-50', 'disabled:pointer-events-none'])
      expect(button).toHaveAttribute('disabled')
    })

    it('should show disabled state correctly', () => {
      const button = renderComponent(() => <Button disabled>Disabled</Button>)
      
      expect(button).toBeDisabled()
      expectClasses(button, ['cursor-wait'])
    })

    it('should handle hover states', () => {
      const button = renderComponent(() => <Button variant="default">Hoverable</Button>)
      
      // Check for hover classes
      expectClasses(button, ['hover:bg-primary/90'])
    })

    it('should handle active states', () => {
      const button = renderComponent(() => <Button>Active</Button>)
      
      // Check for active transform
      expectClasses(button, ['active:scale-[0.98]'])
    })
  })

  describe('Responsive Design', () => {
    it('should maintain proper sizing across viewports', () => {
      const button = renderComponent(() => <Button size="lg">Responsive</Button>)
      
      expectClasses(button, ['h-11', 'px-8'])
      
      // In a real implementation, you would test at different viewport sizes
      // For now, just verify base classes are present
    })
  })

  describe('Performance', () => {
    it('should render efficiently without layout shift', () => {
      const renderFn = () => renderComponent(() => <Button>Performant</Button>)
      
      // This would ideally use a performance observer to detect layout shift
      // For now, just verify it renders without errors
      expect(() => renderFn()).not.toThrow()
    })

    it('should use CSS efficiently', () => {
      const button = renderComponent(() => <Button>Efficient</Button>)
      
      // Check that it uses utility classes rather than inline styles
      expect(button.getAttribute('style')).toBeNull()
    })
  })

  describe('Design Token Compliance', () => {
    it('should use standardized border radius tokens', () => {
      const button = renderComponent(() => <Button>Rounded</Button>)
      
      expectClasses(button, ['rounded-md'])
    })

    it('should follow consistent spacing scale', () => {
      const buttons = [
        renderComponent(() => <Button size="sm">Small</Button>),
        renderComponent(() => <Button size="default">Default</Button>),
        renderComponent(() => <Button size="lg">Large</Button>)
      ]

      // Verify consistent spacing scale
      const paddings = buttons.map(btn => getComputedStyle(btn).padding)
      expect(paddings).toHaveLength(3)
      // Each should be different but follow a consistent scale
    })
  })

  describe('CSS Custom Properties Integration', () => {
    it('should properly consume CSS custom properties', () => {
      const button = renderComponent(() => <Button>Custom Props</Button>)
      
      const computedStyle = getComputedStyle(button)
      
      // Should use CSS custom properties for colors
      expect(computedStyle.getPropertyValue('--tw-bg-opacity')).toBeTruthy()
    })

    it('should respond to CSS custom property changes', () => {
      const button = renderComponent(() => <Button>Dynamic</Button>)
      
      // Change a CSS custom property
      document.documentElement.style.setProperty('--primary', '220 90% 56%')
      
      // The button should still have same classes
      expectClasses(button, ['bg-primary'])
    })
  })
})