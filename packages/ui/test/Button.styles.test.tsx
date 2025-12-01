/**
 * Button Component Styling Tests
 * Tests the styling, theme application, and accessibility of the Button component
 */

import { Button } from '../src/Button';
import {
  renderComponent,
  cleanup,
  expectClasses,
  expectCSSVariable,
  expectColorContrast,
  expectFocusable,
  expectAriaAttribute,
  PerformanceTestUtils,
} from '@pems/config-tailwind/test/utils/css-test-utils';

describe('Button Component Styling', () => {
  beforeEach(() => {
    // Setup DOM environment
    document.body.innerHTML = '';
    // Import design tokens CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/src/tokens.css';
    document.head.appendChild(link);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Basic Styling', () => {
    it('should render with default classes', () => {
      const button = renderComponent(<Button>Click me</Button>);

      expectClasses(button, [
        'inline-flex',
        'items-center',
        'justify-content',
        'focus-ring'
      ]);

      expect(button.tagName).toBe('BUTTON');
    });

    it('should apply primary variant styles correctly', () => {
      const button = renderComponent(<Button variant="primary">Primary</Button>);

      expectClasses(button, ['bg-primary', 'text-primary-foreground']);
      expectCSSVariable(button, '--background', '0 0% 100%');
      expectCSSVariable(button, '--primary', '222.2 47.4% 11.2%');
    });

    it('should apply secondary variant styles correctly', () => {
      const button = renderComponent(<Button variant="secondary">Secondary</Button>);

      expectClasses(button, ['bg-secondary', 'text-secondary-foreground']);
    });

    it('should apply destructive variant styles correctly', () => {
      const button = renderComponent(<Button variant="destructive">Delete</Button>);

      expectClasses(button, ['bg-destructive', 'text-destructive-foreground']);
    });

    it('should apply outline variant styles correctly', () => {
      const button = renderComponent(<Button variant="outline">Outline</Button>);

      expectClasses(button, ['border', 'bg-background']);
    });

    it('should apply ghost variant styles correctly', () => {
      const button = renderComponent(<Button variant="ghost">Ghost</Button>);

      expectClasses(button, ['hover:bg-accent']);
    });
  });

  describe('Size Variants', () => {
    it('should apply small size styles', () => {
      const button = renderComponent(<Button size="sm">Small</Button>);

      expectClasses(button, ['h-8', 'px-3', 'text-xs']);
    });

    it('should apply medium size styles', () => {
      const button = renderComponent(<Button size="md">Medium</Button>);

      expectClasses(button, ['h-9', 'px-4', 'py-2']);
    });

    it('should apply large size styles', () => {
      const button = renderComponent(<Button size="lg">Large</Button>);

      expectClasses(button, ['h-10', 'px-8']);
    });

    it('should apply extra large size styles', () => {
      const button = renderComponent(<Button size="xl">Extra Large</Button>);

      expectClasses(button, ['h-11', 'px-10']);
    });
  });

  describe('Theme Application', () => {
    it('should use design tokens for colors', () => {
      const button = renderComponent(<Button variant="primary">Themed</Button>);

      // Check if CSS custom properties are applied
      const computedStyle = getComputedStyle(button);
      expect(computedStyle.getPropertyValue('--primary')).toBeTruthy();
      expect(computedStyle.getPropertyValue('--primary-foreground')).toBeTruthy();
    });

    it('should switch themes correctly', () => {
      const button = renderComponent(<Button variant="primary">Theme Test</Button>);

      // Test light theme
      document.documentElement.classList.remove('dark');
      const lightBg = getComputedStyle(button).backgroundColor;

      // Test dark theme
      document.documentElement.classList.add('dark');
      const darkBg = getComputedStyle(button).backgroundColor;

      // Colors should be different between themes
      expect(lightBg).not.toBe(darkBg);
    });

    it('should maintain consistent spacing across variants', () => {
      const buttons = [
        renderComponent(<Button variant="primary">Primary</Button>),
        renderComponent(<Button variant="secondary">Secondary</Button>),
        renderComponent(<Button variant="destructive">Destructive</Button>),
      ];

      const paddings = buttons.map(btn =>
        getComputedStyle(btn).padding
      );

      // All buttons should have consistent padding
      paddings.forEach(padding => {
        expect(padding).toBe(paddings[0]);
      });
    });
  });

  describe('Accessibility', () => {
    it('should be focusable by default', () => {
      const button = renderComponent(<Button>Focusable</Button>);

      expectFocusable(button);
    });

    it('should have proper ARIA attributes when disabled', () => {
      const button = renderComponent(<Button disabled>Disabled</Button>);

      expect(button.hasAttribute('disabled')).toBe(true);
      expect(button.getAttribute('aria-disabled')).toBe('true');
    });

    it('should have proper button type', () => {
      const button = renderComponent(<Button type="submit">Submit</Button>);

      expect(button.getAttribute('type')).toBe('submit');
    });

    it('should maintain sufficient color contrast', () => {
      const button = renderComponent(<Button variant="primary">High Contrast</Button>);

      const computedStyle = getComputedStyle(button);
      const foregroundColor = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;

      // Test color contrast (simplified - use a proper library in production)
      expectColorContrast(foregroundColor, backgroundColor, 4.5);
    });

    it('should show focus ring when focused', () => {
      const button = renderComponent(<Button>Focus Test</Button>);

      // Simulate focus
      button.focus();

      const computedStyle = getComputedStyle(button);
      expect(computedStyle.outline).toBeTruthy();
    });

    it('should support ARIA labels', () => {
      const button = renderComponent(
        <Button aria-label="Close dialog">×</Button>
      );

      expectAriaAttribute(button, 'aria-label', 'Close dialog');
    });

    it('should support ARIA descriptions', () => {
      const button = renderComponent(
        <Button aria-describedby="help-text">Help</Button>
      );

      expectAriaAttribute(button, 'aria-describedby', 'help-text');
    });
  });

  describe('State Management', () => {
    it('should apply disabled styles correctly', () => {
      const button = renderComponent(<Button disabled>Disabled</Button>);

      expectClasses(button, ['disabled:opacity-50', 'disabled:pointer-events-none']);
      expect(button.hasAttribute('disabled')).toBe(true);
    });

    it('should show loading state correctly', () => {
      const button = renderComponent(<Button loading>Loading</Button>);

      expectClasses(button, ['cursor-wait']);
      expect(button.getAttribute('aria-busy')).toBe('true');
    });

    it('should handle hover states', () => {
      const button = renderComponent(<Button variant="primary">Hover</Button>);

      // Simulate hover
      button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      const computedStyle = getComputedStyle(button);
      // Check for hover-specific styles
      expect(computedStyle.backgroundColor).toBeTruthy();
    });

    it('should handle active states', () => {
      const button = renderComponent(<Button variant="secondary">Active</Button>);

      // Simulate active state
      button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      const computedStyle = getComputedStyle(button);
      expect(computedStyle.transform).toBeTruthy();
    });
  });

  describe('Responsive Design', () => {
    it('should maintain proper sizing across viewports', () => {
      const button = renderComponent(<Button size="lg">Responsive</Button>);

      // Test different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const mobileStyle = getComputedStyle(button);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const desktopStyle = getComputedStyle(button);

      // Button should maintain consistent sizing strategy
      expect(mobileStyle.minHeight).toBe(desktopStyle.minHeight);
    });
  });

  describe('Performance', () => {
    it('should render efficiently without layout shift', () => {
      const element = PerformanceTestUtils.expectNoLayoutShift(() =>
        renderComponent(<Button>Performance Test</Button>)
      );

      expect(element).toBeTruthy();
    });

    it('should use CSS efficiently', () => {
      const button = renderComponent(<Button>Efficient</Button>);

      PerformanceTestUtils.expectCSSEfficiency(button, 3);
    });
  });

  describe('Design Token Compliance', () => {
    it('should use standardized border radius tokens', () => {
      const button = renderComponent(<Button>Token Test</Button>);

      const computedStyle = getComputedStyle(button);
      const borderRadius = computedStyle.borderRadius;

      // Should use design token value
      expect(borderRadius).toBeTruthy();
      expect(borderRadius).not.toBe('0px');
    });

    it('should follow consistent spacing scale', () => {
      const buttons = [
        renderComponent(<Button size="sm">Small</Button>),
        renderComponent(<Button size="md">Medium</Button>),
        renderComponent(<Button size="lg">Large</Button>),
      ];

      const heights = buttons.map(btn =>
        parseInt(getComputedStyle(btn).height)
      );

      // Heights should follow a consistent scale
      expect(heights[1]).toBeGreaterThan(heights[0]);
      expect(heights[2]).toBeGreaterThan(heights[1]);
    });
  });

  describe('CSS Custom Properties Integration', () => {
    it('should properly consume CSS custom properties', () => {
      const button = renderComponent(<Button variant="primary">CSS Vars</Button>);

      // Test if CSS variables are being used
      const computedStyle = getComputedStyle(button);
      const bgColor = computedStyle.backgroundColor;

      // Should be using HSL custom property format
      expect(bgColor).toMatch(/rgb\(\d+,\s*\d+,\s*\d+\)/);
    });

    it('should respond to CSS custom property changes', () => {
      const button = renderComponent(<Button variant="secondary">Dynamic</Button>);

      // Change a CSS custom property
      document.documentElement.style.setProperty('--secondary', '220 38% 11%');

      const computedStyle = getComputedStyle(button);
      const newBgColor = computedStyle.backgroundColor;

      expect(newBgColor).toBeTruthy();
    });
  });
});