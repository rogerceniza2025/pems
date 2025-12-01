# Tailwind CSS 4 Design System

> A comprehensive design system built with Tailwind CSS 4, featuring semantic tokens, modern CSS features, and type-safe component architecture.

## 🚀 Features

- **Tailwind CSS 4.1.17** with latest CSS-atomics and modern CSS features
- **Semantic Design Token System** with TypeScript type safety
- **Class Variance Authority (CVA)** for consistent component architecture
- **Dark Mode Support** with automatic theme switching
- **Container Queries** for responsive components
- **Cascade Layers** for better CSS organization
- **Visual Regression Testing** with Storybook
- **Component Testing** with Vitest
- **Performance Optimizations** including critical CSS and bundle analysis

## 📦 Package Structure

```
packages/config/tailwind/
├── tokens.css                 # Central design tokens with @theme
├── src/
│   ├── preset.ts             # Main Tailwind configuration
│   ├── types/
│   │   └── tokens.ts         # TypeScript type definitions
│   ├── token-manager.ts      # Runtime token management
│   ├── design-system.ts      # Design system documentation
│   ├── utilities.css         # Custom utility classes
│   └── modern-features.css   # CSS container queries & cascade layers
└── package.json

packages/ui/src/
├── lib/
│   ├── cva.ts               # Class Variance Authority utilities
│   └── component-factory.tsx # Component factory patterns
├── Button.tsx               # Enhanced button component
└── index.ts                 # Component exports
```

## 🎨 Design Tokens

### Color System

Our color system uses HSL values for optimal manipulation and accessibility:

```css
@theme {
  --color-background: 0 0% 100%;
  --color-foreground: 222.2 84% 4.9%;
  --color-primary: 222.2 47.4% 11.2%;
  --color-primary-foreground: 210 40% 98%;
  /* ... more tokens */
}
```

#### Token Categories

- **Semantic Colors**: `primary`, `secondary`, `accent`, `destructive`
- **Surface Colors**: `background`, `foreground`, `card`, `popover`
- **Border Colors**: `border`, `input`, `ring`
- **Status Colors**: `success`, `warning`, `info`, `muted`

### Spacing Scale

Consistent spacing based on mathematical ratios:

```css
@theme {
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-2xl: 3rem;     /* 48px */
}
```

### Typography System

```css
@theme {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --font-size-xs: 0.75rem;   /* 12px */
  --font-size-sm: 0.875rem;  /* 14px */
  --font-size-base: 1rem;    /* 16px */
  --font-size-lg: 1.125rem;  /* 18px */
}
```

## 🧩 Component Architecture

### Class Variance Authority (CVA)

We use CVA for type-safe component variants:

```typescript
import { cva, type VariantProps } from './lib/cva';

const buttonVariants = cva({
  base: 'inline-flex items-center justify-center rounded-md text-sm font-medium',
  variants: {
    variant: {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
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
```

### Component Factory Pattern

Create consistent components with factory functions:

```typescript
import { createButtonVariant } from './lib/component-factory';

const CustomButton = createButtonVariant({
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
});
```

## 🌙 Dark Mode

Automatic dark mode support with CSS custom properties:

```css
@media (prefers-color-scheme: dark) {
  @theme {
    --color-background: 222.2 84% 4.9%;
    --color-foreground: 210 40% 98%;
    /* Dark theme overrides */
  }
}
```

### Programmatic Theme Switching

```typescript
import { setTheme, getTheme } from '@pems/config/tailwind';

// Set theme
setTheme('dark');

// Get current theme
const currentTheme = getTheme();
```

## 📱 Responsive Design

### Container Queries

Build responsive components that adapt to their container:

```css
@container (min-width: 768px) {
  .responsive-component {
    grid-template-columns: repeat(2, 1fr);
  }
}

@container (min-width: 1024px) {
  .responsive-component {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Responsive Typography

Fluid typography with `clamp()`:

```css
.text-fluid {
  font-size: clamp(1rem, 2.5vw, 1.25rem);
}
```

## 🎭 Cascade Layers

Better CSS organization with cascade layers:

```css
@layer base {
  /* Base styles and resets */
}

@layer components {
  /* Component-specific styles */
}

@layer utilities {
  /* Utility classes */
}
```

## ⚡ Performance Optimizations

### Critical CSS

Automatic critical CSS generation and inlining:

```typescript
// scripts/generate-critical-css.js
await generateCriticalCSS({
  pages: ['index.html', 'dashboard.html'],
  output: 'dist/critical.css',
});
```

### Bundle Analysis

```bash
# Analyze CSS bundle size
pnpm analyze:css

# Full bundle analysis
pnpm analyze
```

### Performance Monitoring

```css
/* Performance optimizations */
img {
  content-visibility: auto;
  contain-intrinsic-size: 800px 600px;
}

.will-change-transform {
  will-change: transform;
}
```

## 🧪 Testing

### Visual Regression Testing

Storybook integration for visual testing:

```typescript
// Button.stories.tsx
export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'destructive'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
};
```

### Component Testing

Vitest integration for component styling tests:

```typescript
// Button.test.tsx
describe('Button', () => {
  it('applies primary variant styles', () => {
    render(<Button variant="primary">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary');
  });

  it('applies size variants correctly', () => {
    render(<Button size="lg">Large Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-10');
  });
});
```

## 🛠️ Development Workflow

### Code Quality Tools

- **ESLint**: JavaScript/TypeScript linting
- **Stylelint**: CSS linting with Tailwind CSS 4 support
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks

### VS Code Integration

Enhanced IntelliSense support:

```json
{
  "tailwindCSS.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "([^)]*)\""],
    ["createButtonVariant\\(([^)]*)\\)", "[\"'`]([^\"'`]*)[\"'`]"]
  ]
}
```

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

### Basic Usage

```tsx
import { Button } from '@pems/ui';

export default function App() {
  return (
    <div className="p-6 space-y-4">
      <Button variant="primary" size="md">
        Primary Button
      </Button>
      <Button variant="secondary" size="lg">
        Secondary Button
      </Button>
    </div>
  );
}
```

### Custom Components

```tsx
import { cva } from '@pems/ui/lib/cva';

const cardVariants = cva({
  base: 'rounded-lg border bg-card text-card-foreground shadow-sm',
  variants: {
    variant: {
      default: 'bg-card text-card-foreground border',
      outlined: 'bg-background text-foreground border-2',
    },
    padding: {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
});
```

## 📚 Advanced Usage

### Token Management

```typescript
import { tokenManager } from '@pems/config/tailwind';

// Get a token value
const primaryColor = tokenManager.getToken('colors', 'primary');

// Set a token value
tokenManager.setToken('colors', 'primary', '220 90% 56%');

// Create custom color palette
const palette = tokenManager.createColorPalette(200);
```

### Theme Variants

```typescript
// Create custom theme variant
tokenManager.createThemeVariant('brand', {
  colors: {
    primary: '210 100% 50%',
    secondary: '210 20% 90%',
  },
});
```

### Responsive Tokens

```typescript
const fluidSpacing = tokenManager.getResponsiveToken('1rem', {
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
});
```

## 🎯 Best Practices

### 1. Use Semantic Tokens

Prefer semantic tokens over arbitrary values:

```css
/* ✅ Good */
.btn-primary {
  background-color: hsl(var(--color-primary));
}

/* ❌ Avoid */
.btn-primary {
  background-color: #3b82f6;
}
```

### 2. Leverage CVA for Components

Use CVA for consistent component variants:

```typescript
// ✅ Good
const buttonVariants = cva({
  base: 'inline-flex items-center justify-center',
  variants: {
    variant: { primary: 'bg-primary', secondary: 'bg-secondary' },
    size: { sm: 'h-8', md: 'h-9', lg: 'h-10' },
  },
});

// ❌ Avoid
function Button({ variant, size }) {
  const classes = `inline-flex items-center justify-center ${
    variant === 'primary' ? 'bg-primary' : 'bg-secondary'
  } ${size === 'sm' ? 'h-8' : 'h-9'}`;
}
```

### 3. Container Queries for Components

Use container queries for component-level responsiveness:

```css
@container card (min-width: 300px) {
  .card-content {
    grid-template-columns: 1fr 1fr;
  }
}
```

### 4. Test Components Visually

Always create Storybook stories for components:

```typescript
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};
```

## 🔧 Configuration

### Tailwind Config

The main configuration is in `packages/config/tailwind/src/preset.ts`:

```typescript
export default {
  content: [
    './apps/**/*.{js,ts,jsx,tsx,html}',
    './packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Custom extensions are handled by CSS @theme
    },
  },
  plugins: [
    // Modern CSS features
    require('@tailwindcss/container-queries'),
  ],
};
```

### Token Configuration

Design tokens are defined in `packages/config/tailwind/tokens.css` using the `@theme` directive.

## 🤝 Contributing

1. Follow the established patterns for components
2. Add tests for new components
3. Update documentation
4. Use semantic tokens
5. Test accessibility

## 📄 License

MIT License - see LICENSE file for details.