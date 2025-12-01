# Tailwind CSS 4 Implementation Guide

This guide provides comprehensive information about our Tailwind CSS 4 setup, including configuration, usage patterns, and best practices.

## 🏗️ Architecture Overview

Our Tailwind CSS 4 implementation follows a modular architecture:

```
packages/config/tailwind/     # Configuration and design system
├── tokens.css               # Central design tokens
├── src/
│   ├── preset.ts           # Main configuration
│   ├── types/tokens.ts     # TypeScript definitions
│   ├── token-manager.ts    # Runtime management
│   ├── utilities.css       # Custom utilities
│   └── modern-features.css # Advanced CSS features
└── README.md               # Detailed documentation

packages/ui/                 # Component library
├── lib/
│   ├── cva.ts             # Class Variance Authority
│   └── component-factory.tsx # Component patterns
├── Button.tsx              # Example component
├── Button.stories.tsx      # Storybook stories
└── index.ts                # Public exports
```

## ⚙️ Configuration

### Core Configuration (`packages/config/tailwind/src/preset.ts`)

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: [
    './apps/**/*.{js,ts,jsx,tsx,html}',
    './packages/ui/src/**/*.{js,ts,jsx,tsx}',
    './docs/**/*.{md,mdx}',
  ],
  theme: {
    extend: {}, // Extensions handled by CSS @theme
  },
  plugins: [
    require('@tailwindcss/container-queries'),
    require('@tailwindcss/typography'),
  ],
  experimental: {
    optimizeModernCSS: true,
    matchVariant: true,
  },
} satisfies Config;
```

### Design Tokens (`packages/config/tailwind/tokens.css`)

```css
@import "tailwindcss";

@theme {
  /* Colors */
  --color-background: 0 0% 100%;
  --color-foreground: 222.2 84% 4.9%;
  --color-primary: 222.2 47.4% 11.2%;
  --color-primary-foreground: 210 40% 98%;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Border Radius */
  --radius-sm: 0.125rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);

  /* Z-Index */
  --z-dropdown: 1000;
  --z-modal: 1050;
  --z-tooltip: 1090;
}
```

## 🧩 Component Development

### Class Variance Authority (CVA)

CVA provides type-safe component variants:

```typescript
import { cva, type VariantProps } from '@pems/ui/lib/cva';

const buttonVariants = cva({
  base: 'inline-flex items-center justify-center rounded-md text-sm font-medium',
  variants: {
    variant: {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
    },
    size: {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-10 px-8 text-base',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

type ButtonProps = VariantProps<typeof buttonVariants> & {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};
```

### Component Factory Pattern

Create consistent components with factory functions:

```typescript
import { createButtonVariant } from '@pems/ui/lib/component-factory';

const CustomButton = createButtonVariant({
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
});

// Usage
<CustomButton variant="primary" size="md">
  Custom Styled Button
</CustomButton>
```

### Component Structure Template

```typescript
import { cva, type VariantProps } from '../lib/cva';

const componentNameVariants = cva({
  base: '/* base classes */',
  variants: {
    variant: {
      default: '/* default variant classes */',
      secondary: '/* secondary variant classes */',
    },
    size: {
      sm: '/* small size classes */',
      md: '/* medium size classes */',
      lg: '/* large size classes */',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export interface ComponentNameProps extends VariantProps<typeof componentNameVariants> {
  children: React.ReactNode;
  // Additional props
}

export const ComponentName = ({ children, variant, size, ...props }: ComponentNameProps) => {
  const classes = componentNameVariants({ variant, size });

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};
```

## 🎨 Design System Usage

### Colors

Always use semantic color tokens:

```css
/* ✅ Good */
.button-primary {
  background-color: hsl(var(--color-primary));
  color: hsl(var(--color-primary-foreground));
}

/* ❌ Avoid */
.button-primary {
  background-color: #3b82f6;
  color: #ffffff;
}
```

Available color tokens:
- `background`, `foreground`
- `primary`, `primary-foreground`
- `secondary`, `secondary-foreground`
- `accent`, `accent-foreground`
- `destructive`, `destructive-foreground`
- `muted`, `muted-foreground`
- `border`, `input`, `ring`
- `success`, `warning`, `info`

### Spacing

Use the spacing scale consistently:

```css
.component {
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  gap: var(--spacing-sm);
}
```

### Typography

```css
.heading {
  font-family: var(--font-sans);
  font-size: var(--font-size-lg);
  line-height: var(--line-height-tight);
}

.code {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
}
```

## 🌙 Dark Mode

Dark mode is automatically supported. The theme switches based on:

1. System preference (`prefers-color-scheme: dark`)
2. Manual toggle via JavaScript

### Manual Theme Switching

```typescript
import { setTheme, getTheme } from '@pems/config/tailwind';

// Set theme
setTheme('dark');
setTheme('light');

// Get current theme
const currentTheme = getTheme();

// Toggle theme
const toggleTheme = () => {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
};
```

### Dark Mode CSS

Dark mode overrides are automatically applied:

```css
@media (prefers-color-scheme: dark) {
  @theme {
    --color-background: 222.2 84% 4.9%;
    --color-foreground: 210 40% 98%;
    /* ... other dark theme overrides */
  }
}
```

## 📱 Responsive Design

### Container Queries

Use container queries for component-level responsiveness:

```css
.card-container {
  container-type: inline-size;
}

@container (min-width: 300px) {
  .card-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }
}

@container (min-width: 500px) {
  .card-content {
    grid-template-columns: 1fr 2fr 1fr;
  }
}
```

### Responsive Typography

Use `clamp()` for fluid typography:

```css
.heading-fluid {
  font-size: clamp(1rem, 2.5vw, 1.5rem);
  line-height: clamp(1.25rem, 3vw, 1.75rem);
}
```

### Responsive Utilities

Tailwind's responsive utilities work as expected:

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Responsive grid -->
</div>
```

## ⚡ Performance

### CSS Optimization

1. **Critical CSS**: Automatic critical CSS generation
2. **PurgeCSS**: Unused CSS removal in production
3. **CSS Modules**: Component-scoped CSS when needed
4. **Lazy Loading**: Component-level CSS lazy loading

### Bundle Analysis

```bash
# Analyze CSS bundle size
pnpm analyze:css

# Full bundle analysis
pnpm analyze

# CSS bundle optimization
pnpm optimize:css
```

### Performance Best Practices

1. **Use semantic tokens** instead of arbitrary values
2. **Leverage CVA** for consistent component styling
3. **Container queries** for component responsiveness
4. **CSS containment** for performance optimization

```css
/* CSS containment for better performance */
.card {
  contain: layout style paint;
}

.lazy-component {
  content-visibility: auto;
  contain-intrinsic-size: 400px 200px;
}
```

## 🧪 Testing

### Visual Testing with Storybook

Each component should have comprehensive Storybook stories:

```typescript
// Component.stories.tsx
import type { Meta, StoryObj } from '@storybook/solidjs';
import { Component } from './Component';

const meta: Meta<typeof Component> = {
  title: 'Components/Component',
  component: Component,
  parameters: {
    layout: 'centered',
    docs: {
      toc: true,
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Component',
  },
};
```

### Component Testing

Test component styling with Vitest:

```typescript
import { render, screen } from '@testing-library/solid';
import { Button } from './Button';

describe('Button', () => {
  it('applies primary variant styles', () => {
    render(<Button variant="primary">Primary Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary');
  });

  it('applies size variants correctly', () => {
    render(<Button size="lg">Large Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-10');
  });

  it('handles disabled state', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });
});
```

### Accessibility Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

test('button should not have accessibility violations', async () => {
  const { container } = render(<Button>Accessible Button</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## 🔧 Development Workflow

### Code Quality

```bash
# Lint CSS
pnpm lint:css

# Lint TypeScript
pnpm lint:ts

# Format code
pnpm format

# Type check
pnpm type-check

# Run all checks
pnpm check
```

### Pre-commit Hooks

Husky automatically runs checks before commits:

- ESLint for TypeScript files
- Stylelint for CSS files
- Prettier formatting
- Type checking

### VS Code Integration

Enhanced IntelliSense support is configured:

```json
{
  "tailwindCSS.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "([^)]*)\""],
    ["createButtonVariant\\(([^)]*)\\)", "[\"'`]([^\"'`]*)[\"'`]"]
  ],
  "css.validate": true,
  "css.customData": [".vscode/css-custom-data.json"]
}
```

## 📚 Advanced Features

### Cascade Layers

Better CSS organization with cascade layers:

```css
@layer base {
  /* Base styles, resets */
}

@layer components {
  /* Component-specific styles */
}

@layer utilities {
  /* Utility classes */
}
```

### Modern CSS Features

```css
/* CSS Grid with subgrid */
.parent-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.child-grid {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: span 2;
}

/* CSS Nesting */
.card {
  background: hsl(var(--color-card));

  &:hover {
    box-shadow: var(--shadow-lg);
  }

  &__header {
    padding: var(--spacing-md);

    &--compact {
      padding: var(--spacing-sm);
    }
  }
}

/* Container Queries */
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .responsive-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
```

### Custom Utilities

```css
@layer utilities {
  .focus-ring {
    @apply focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2;
  }

  .visually-hidden {
    @apply sr-only;
  }

  .container-content {
    @apply container mx-auto px-4 max-w-7xl;
  }

  .text-balance {
    text-wrap: balance;
  }

  .text-pretty {
    text-wrap: pretty;
  }
}
```

## 🚀 Production Deployment

### Build Process

```bash
# Development build
pnpm build:dev

# Production build
pnpm build:prod

# Build with analysis
pnpm build:analyze
```

### Environment Variables

```bash
# .env.production
NODE_ENV=production
TAILWIND_MODE=build
TAILWIND_DISABLE_TOUCH=false
```

### Performance Monitoring

```typescript
// Performance monitoring
if (process.env.NODE_ENV === 'production') {
  // Monitor CSS bundle size
  const cssBundleSize = performance.getEntriesByType('resource')
    .filter(entry => entry.name.includes('.css'))
    .reduce((total, entry) => total + entry.transferSize, 0);

  // Send metrics to analytics
  analytics.track('css_bundle_size', cssBundleSize);
}
```

## 🔍 Debugging

### CSS Debugging

```css
/* Debug mode */
@media (debug) {
  * {
    outline: 1px solid red !important;
  }

  .debug-spacing::before {
    content: attr(data-debug);
    position: absolute;
    background: red;
    color: white;
    font-size: 10px;
    padding: 2px;
  }
}
```

### Token Debugging

```typescript
import { tokenManager } from '@pems/config/tailwind';

// Debug token values
console.log('All tokens:', tokenManager.getTokens());
console.log('Primary color:', tokenManager.getToken('colors', 'primary'));

// Validate tokens
const validation = tokenManager.validateToken('color', 'hsl(200, 50%, 50%)');
console.log('Token validation:', validation);
```

### CVA Debugging

```typescript
import { cva } from '@pems/ui/lib/cva';

const variants = cva({
  // ... configuration
});

// Debug CVA output
const debugProps = { variant: 'primary', size: 'lg' };
const classes = variants(debugProps);
console.log('CVA classes:', classes);
console.log('CVA props:', debugProps);
```

## 📖 Additional Resources

- [Tailwind CSS 4 Documentation](https://tailwindcss.com/docs)
- [Class Variance Authority](https://cva.style/docs)
- [Storybook Documentation](https://storybook.js.org/docs)
- [CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [CSS Cascade Layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)

## 🤝 Contributing

1. Follow the established patterns
2. Add comprehensive tests
3. Update documentation
4. Use semantic tokens
5. Test accessibility
6. Check bundle size impact

## 📄 License

This design system is licensed under the MIT License.