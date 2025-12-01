# UI Components Demo Page Design

## Overview

A dedicated page to showcase the 5 custom UI components built with SolidJS, Kobalte, and Tailwind CSS 4. The page will feature both interactive demonstrations and code examples for each component.

## Technology Stack

- **SolidJS** - Reactive UI framework
- **Kobalte** - Accessible component primitives (already used in Button, Input, Accordion)
- **Tailwind CSS 4** - Utility-first CSS framework with @theme directive
- **TypeScript** - Type safety and better developer experience

## Page Structure

### Header Section

- Title: "UI Components Library"
- Description: "Interactive showcase of our custom UI components built with SolidJS and Tailwind CSS 4"
- Theme toggle button (light/dark mode)

### Navigation

- Component navigation menu (sticky sidebar or top navigation)
- Quick links to each component section

### Component Sections

#### 1. Button Component

**Interactive Examples:**

- All variants: default, destructive, outline, secondary, ghost, link
- All sizes: sm, default, lg, icon
- States: normal, hover, active, disabled, loading
- With icons
- Button groups

**Code Examples:**

- Basic usage
- Variant examples
- Size examples
- With event handlers
- Custom styling

#### 2. Card Component

**Interactive Examples:**

- Basic card with header, content, footer
- Card with different header styles
- Interactive cards with hover effects
- Card grids (1-4 columns)
- Cards with actions

**Code Examples:**

- Basic card structure
- Card with all sub-components
- Custom card styling
- Responsive card layouts

#### 3. Input Component

**Interactive Examples:**

- Text input with placeholder
- Input with label
- Input with error state
- Disabled input
- Input with different types (email, password, etc.)
- Input with icons

**Code Examples:**

- Basic input usage
- Input with validation
- Input with event handlers
- Custom styling

#### 4. Label Component

**Interactive Examples:**

- Standard labels
- Labels with required indicators
- Labels with help text
- Labels for different form elements
- Accessible label examples

**Code Examples:**

- Basic label usage
- Label with form controls
- Custom styling
- Accessibility features

#### 5. Accordion Component

**Interactive Examples:**

- Single accordion item
- Multiple accordion items
- Accordion with different content types
- Accordion with icons
- Controlled accordion state

**Code Examples:**

- Basic accordion usage
- Accordion with custom content
- Event handling
- Custom styling

## Design Patterns

### Component Showcase Layout

Each component section will follow this pattern:

1. **Component Name & Description** - Brief overview of the component
2. **Interactive Demo** - Live, interactive examples
3. **Props/API Documentation** - Table of available props
4. **Code Examples** - Copyable code snippets
5. **Usage Guidelines** - Best practices and tips

### Interactive Features

- Theme toggle (light/dark mode)
- Copy code to clipboard functionality
- Live component state changes
- Responsive design testing
- Component state inspector

### Visual Design

- Clean, modern interface
- Consistent spacing and typography
- Clear visual hierarchy
- Smooth transitions and micro-interactions
- Accessible color contrasts

## Technical Implementation

### File Structure

```
apps/web/src/routes/ui-components-demo.tsx
apps/web/src/components/ui-demo/
  ├── ComponentShowcase.tsx
  ├── CodeBlock.tsx
  ├── PropsTable.tsx
  └── InteractiveDemo.tsx
```

### Dependencies

- Existing UI components from @pems/ui
- Prism.js or similar for code highlighting
- Copy to clipboard functionality
- Theme provider integration

### Responsive Design

- Mobile-first approach
- Adaptive layouts for different screen sizes
- Touch-friendly interactions on mobile

## Navigation Integration

### App Navigation Updates

- Add "UI Components" link to main navigation
- Update router configuration
- Ensure proper breadcrumb navigation

### Component Navigation

- Sticky sidebar with component links
- Smooth scrolling to sections
- Active section highlighting

## Accessibility Features

- Proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- High contrast mode support

## Performance Considerations

- Lazy loading of code examples
- Optimized component rendering
- Minimal bundle impact
- Efficient state management

## Future Enhancements

- Component testing playground
- Theme customization
- Component export functionality
- Integration with design system documentation
- Component versioning and changelog
