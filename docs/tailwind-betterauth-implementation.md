# Tailwind v4 + Solid-UI + BetterAuth Implementation Guide

This document outlines the implementation of Tailwind v4 with Solid-UI + Kobalte for styling and BetterAuth for authentication as per ADR-021 and ADR-018.

## Overview

### Technologies Implemented

1. **Tailwind v4** - Modern utility-first CSS framework with CSS variables support
2. **Solid-UI + Kobalte** - Accessible component library for SolidJS
3. **BetterAuth 1.4.3** - Secure, tenant-aware authentication
4. **RBAC Integration** - Role-based access control system

## Architecture

### UI Package Structure (`packages/ui/`)

```
packages/ui/src/
├── lib/
│   └── utils.ts          # Utility functions (cn helper)
├── components/
│   ├── ui/               # Core UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── card.tsx
│   │   └── accordion.tsx
│   ├── auth/              # Authentication components
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   └── theme-provider.tsx # Theme management
└── index.ts               # Main exports
```

### Auth Package Structure (`packages/infrastructure/auth/`)

```
packages/infrastructure/auth/src/
├── index.ts              # BetterAuth configuration
└── rbac.ts               # Role-based access control
```

## Key Features

### 1. Tailwind v4 Theming System

- **CSS Variables**: All colors use CSS variables for dynamic theming
- **Dark Mode Support**: Automatic dark/light theme switching
- **Consistent Design**: System-wide style consistency
- **Responsive**: Mobile-first responsive design

#### CSS Variables Structure

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96%;
  /* ... more variables */
}
```

### 2. Solid-UI Components

#### Button Component

- **Variants**: default, secondary, outline, ghost, destructive, link
- **Sizes**: sm, default, lg, icon
- **Accessibility**: Full keyboard navigation support
- **Theming**: Uses CSS variables for colors

#### Form Components

- **Input**: Text, email, password inputs with validation states
- **Label**: Accessible form labels with proper associations
- **Card**: Flexible container components with header/content/footer

#### Accordion Component

- **Smooth Animations**: CSS transitions for expand/collapse
- **Keyboard Navigation**: Full accessibility support
- **Customizable**: Multiple items and content types

### 3. Authentication System

#### BetterAuth Configuration

```typescript
export const auth = betterAuth({
  database: prismaAdapter(database, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      /* Google OAuth */
    },
    github: {
      /* GitHub OAuth */
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7 }, // 7 days
})
```

#### RBAC System

- **Roles**: super_admin, tenant_admin, manager, supervisor, cashier, clerk, auditor, viewer
- **Permissions**: Granular permissions for different operations
- **Tenant-Aware**: Multi-tenant permission management
- **Type Safety**: Full TypeScript support

### 4. Theme Provider

#### Dark Mode Support

```typescript
const ThemeProvider: ParentComponent<ThemeProviderProps> = (props) => {
  const [theme, setTheme] = createSignal<Theme>('system')

  const setValue = (value: Theme) => {
    localStorage.setItem('vite-ui-theme', value)
    setTheme(value)
    // Apply theme to document
    document.documentElement.classList.toggle('dark', value === 'dark')
  }

  return (
    <ThemeProviderContext.Provider value={{ theme: theme(), setTheme: setValue }}>
      {props.children}
    </ThemeProviderContext.Provider>
  )
}
```

## Usage Examples

### Basic UI Components

```typescript
import { Button, Card, CardContent, CardHeader, CardTitle } from '@pems/ui'

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default" onClick={() => console.log('clicked')}>
          Click me
        </Button>
      </CardContent>
    </Card>
  )
}
```

### Authentication Forms

```typescript
import { LoginForm, RegisterForm } from '@pems/ui'

function LoginPage() {
  const handleLogin = async (email: string, password: string) => {
    // Handle login logic
  }

  return (
    <LoginForm
      onSubmit={handleLogin}
      onForgotPassword={() => navigate('/forgot-password')}
      onSignUp={() => navigate('/register')}
    />
  )
}
```

### RBAC Usage

```typescript
import { hasPermission, hasRole } from '@pems/auth'

function ProtectedComponent(user: User) {
  // Check specific permission
  const canCreateUsers = hasPermission(user, 'users:create', 'tenant-123')

  // Check role
  const isAdmin = hasRole(user, 'tenant_admin', 'tenant-123')

  return (
    <Show when={canCreateUsers}>
      <Button>Create User</Button>
    </Show>
  )
}
```

### Theme Integration

```typescript
import { ThemeProvider, useTheme } from '@pems/ui'

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <MyAppContent />
    </ThemeProvider>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button onClick={() => setTheme(theme() === 'dark' ? 'light' : 'dark')}>
      {theme() === 'dark' ? '☀️' : '🌙'}
    </Button>
  )
}
```

## Configuration Files

### Tailwind Config (`packages/config/tailwind/preset.ts`)

- Uses CSS variables for all colors
- Configured for SolidJS compatibility
- Includes custom animations and spacing

### TypeScript Configuration

- **SolidJS**: `jsx: "preserve"` with `jsxImportSource: "solid-js"`
- **Node.js**: Proper Node.js types for auth package
- **Paths**: Workspace package aliases configured

## Benefits

### 1. Developer Experience

- **Type Safety**: Full TypeScript support
- **IntelliSense**: Rich autocomplete and documentation
- **Hot Reload**: Fast development iteration
- **Component Reusability**: Consistent, tested components

### 2. Performance

- **Tailwind v4**: Improved performance and bundle size
- **CSS Variables**: Efficient theme switching
- **Tree Shaking**: Only used styles included
- **SolidJS**: Fine-grained reactivity

### 3. Accessibility

- **Kobalte**: Built with accessibility in mind
- **ARIA Support**: Proper screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus handling

### 4. Security

- **BetterAuth**: Secure authentication patterns
- **RBAC**: Granular permission control
- **Tenant Isolation**: Multi-tenant security
- **Type Safety**: Compile-time security checks

## Migration Guide

### From Existing Components

1. Update imports to use `@pems/ui` package
2. Replace inline styles with Tailwind classes
3. Use theme provider for consistent styling
4. Implement proper accessibility patterns

### Authentication Migration

1. Install BetterAuth dependencies
2. Configure database adapter
3. Set up social providers
4. Implement RBAC permissions
5. Update auth components

## Testing

### Demo Page

Visit `/demo.tailwind` to see:

- All UI component variants
- Theme switching functionality
- Authentication forms
- Interactive examples
- Color palette demonstration

### Component Testing

Each component includes:

- TypeScript type checking
- Accessibility testing
- Theme compatibility
- Responsive design verification

## Next Steps

1. **Component Library**: Expand with more components (Select, Modal, etc.)
2. **Storybook**: Component documentation and testing
3. **Design System**: Formal design tokens and guidelines
4. **Performance**: Bundle optimization and loading strategies
5. **Testing**: Comprehensive test suite coverage

## Troubleshooting

### Common Issues

1. **Import Errors**: Check workspace paths and package exports
2. **Theme Issues**: Verify CSS variables are properly defined
3. **Auth Errors**: Ensure database connection and environment variables
4. **Type Errors**: Check TypeScript configuration and imports

### Debug Mode

Enable debug mode in development:

```typescript
const auth = betterAuth({
  // ...config
  advanced: {
    debug: process.env.NODE_ENV === 'development',
  },
})
```

This implementation provides a solid foundation for building accessible, themeable, and secure applications with modern web technologies.
