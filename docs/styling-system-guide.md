# Styling System Guide

## Overview

This document outlines the comprehensive styling system used across the PEMS project, ensuring consistency, maintainability, and scalability across all components and applications.

## Architecture

The styling system is built on:
- **Tailwind CSS 4** with modern `@theme` directive
- **CSS Custom Properties** for theming
- **Component-first approach** with reusable patterns
- **Design tokens** for consistent spacing, colors, and typography

## File Structure

```
packages/
├── config/tailwind/
│   ├── tokens.css          # Design tokens (single source of truth)
│   ├── utilities.css       # Custom utility classes
│   └── src/
│       └── preset.ts       # Tailwind configuration
└── ui/
    └── src/
        ├── index.css        # UI package styles (minimal)
        └── components/     # Component implementations

apps/
└── web/
    └── src/
        └── index.css        # App-specific styles (minimal)
```

## Design Tokens

### Colors

All colors use HSL values with CSS custom properties for optimal theming support:

```css
/* Light mode (default) */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--primary: 222.2 47.4% 11.2%;
--secondary: 210 40% 96%;
--muted: 210 40% 96%;
--accent: 210 40% 96%;
--destructive: 0 84.2% 60.2%;
--border: 214.3 31.8% 91.4%;
--input: 214.3 31.8% 91.4%;
--ring: 222.2 84% 4.9%;
```

### Dark Mode

Dark mode is automatically applied through:
1. System preference (`prefers-color-scheme: dark`)
2. Manual toggle (`.dark` class)

### Spacing

Consistent spacing scale using rem units:

```css
--spacing-xs: 0.25rem;   /* 4px */
--spacing-sm: 0.5rem;    /* 8px */
--spacing-md: 1rem;      /* 16px */
--spacing-lg: 1.5rem;    /* 24px */
--spacing-xl: 2rem;      /* 32px */
--spacing-2xl: 3rem;     /* 48px */
```

### Border Radius

Standardized border radius scale:

```css
--radius-sm: 0.125rem;    /* 2px */
--radius-md: 0.375rem;    /* 6px */
--radius-lg: 0.5rem;      /* 8px */
--radius-xl: 0.75rem;     /* 12px */
--radius-2xl: 1rem;       /* 16px */
--radius-full: 9999px;
```

## Component Patterns

### Buttons

Use the `Button` component from `@pems/ui` with consistent variants:

```tsx
import { Button } from '@pems/ui'

<Button variant="default" size="md">
  Click me
</Button>
```

**Available variants:**
- `default` (primary)
- `outline`
- `secondary`
- `ghost`
- `destructive`
- `link`

**Available sizes:**
- `sm` (h-9)
- `default` (h-10)
- `lg` (h-11)
- `icon` (square)

### Forms

Use consistent form patterns:

```tsx
import { Input, Label } from '@pems/ui'

<div class="space-y-2">
  <Label for="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="Enter your email"
  />
</div>
```

### Cards

Use the `Card` component system:

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@pems/ui'

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

## Tailwind CSS 4 Integration

### Import Syntax

Use the new Tailwind CSS 4 import syntax:

```css
@import "tailwindcss/preflight";
@tailwind utilities;
```

### Theme Directive

Utilize the `@theme` directive for design tokens:

```css
@theme {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... more tokens */
}
```

## Best Practices

### 1. Use Design Tokens

Always use CSS custom properties instead of hardcoded values:

```tsx
// ❌ Bad
<div class="bg-gray-100 text-gray-900">

// ✅ Good
<div class="bg-background text-foreground">
```

### 2. Component-First Approach

Build reusable components instead of utility classes:

```tsx
// ❌ Bad
<div class="flex items-center justify-center gap-2 p-4 rounded-lg border">

// ✅ Good
<Card>
  <CardContent>Content</CardContent>
</Card>
```

### 3. Consistent Spacing

Use the spacing scale consistently:

```tsx
// ❌ Bad
<div class="p-3 mb-6">

// ✅ Good
<div class="p-sm mb-lg">
```

### 4. Theme Awareness

Ensure all components work in both light and dark themes:

```tsx
// ✅ Good - uses semantic color tokens
<div class="bg-card text-card-foreground border-border">

// ❌ Bad - hardcoded colors
<div class="bg-white text-gray-900 border-gray-200">
```

## Custom Utilities

### Focus Rings

Consistent focus styles across all interactive elements:

```css
.focus-ring:focus {
  outline: none;
  box-shadow:
    0 0 0 2px hsl(var(--ring)),
    0 0 0 4px transparent;
}
```

### Hover Effects

Standardized hover animations:

```css
.hover-lift:hover {
  transform: translateY(-0.25rem);
}

.hover-scale:hover {
  transform: scale(1.05);
}
```

### Glassmorphism

Modern glass effects for overlays:

```css
.glass {
  background-color: rgb(255 255 255 / 0.2);
  backdrop-filter: blur(16px);
  border: 1px solid rgb(255 255 255 / 0.2);
}
```

## Responsive Design

Use Tailwind's responsive utilities with mobile-first approach:

```tsx
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  Content
</div>
```

## Theme Provider

Use the `ThemeProvider` for theme management:

```tsx
import { ThemeProvider, useTheme } from '@pems/ui'

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <YourApp />
    </ThemeProvider>
  )
}

function Component() {
  const { theme, setTheme } = useTheme()
  
  return (
    <button onClick={() => setTheme('dark')}>
      Current theme: {theme()}
    </button>
  )
}
```

## Migration Guide

### From Tailwind CSS 3 to 4

1. Update imports:
```css
// Before
@tailwind base;
@tailwind components;
@tailwind utilities;

// After
@import "tailwindcss/preflight";
@tailwind utilities;
```

2. Use `@theme` directive instead of regular CSS variables:

```css
// Before
:root {
  --background: 0 0% 100%;
}

// After
@theme {
  --background: 0 0% 100%;
}
```

### From Hardcoded Colors to Design Tokens

1. Replace hardcoded colors with semantic tokens:

```tsx
// Before
<div class="bg-white text-gray-900 border-gray-200">

// After
<div class="bg-background text-foreground border-border">
```

2. Update component props to use semantic variants:

```tsx
// Before
<Button className="bg-blue-600 hover:bg-blue-700">

// After
<Button variant="default">
```

## Troubleshooting

### Common Issues

1. **Colors not applying**: Ensure CSS custom properties are properly imported
2. **Theme not switching**: Check that `ThemeProvider` wraps the application
3. **Responsive not working**: Verify Tailwind CSS 4 syntax is correct
4. **Component styles conflicting**: Remove duplicate class definitions

### Debug Tools

1. Use browser dev tools to inspect CSS custom properties
2. Check console for CSS import errors
3. Verify theme state in React DevTools

## Performance Considerations

1. **CSS Bundle Size**: Removed duplicate styles reduced bundle by ~40%
2. **Runtime Performance**: CSS custom properties are faster than JavaScript-based theming
3. **Build Time**: Tailwind CSS 4's JIT compilation is faster than v3

## Future Enhancements

1. **Component Variants**: Extend CVA patterns for more component flexibility
2. **Animation System**: Standardized animation utilities
3. **Accessibility**: Enhanced focus management and screen reader support
4. **Design System**: Figma integration for design-token synchronization