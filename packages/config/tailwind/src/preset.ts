import type { Config } from 'tailwindcss'
import '../modern-features.css'
import './tokens.css'
import './utilities.css'

const config: Config = {
  content: [
    // Core config package files
    './src/**/*.{js,ts,jsx,tsx}',
    // UI package components
    './packages/ui/src/**/*.{js,ts,jsx,tsx}',
    // Web application files
    './apps/web/src/**/*.{js,ts,jsx,tsx}',
    // Admin application files
    './apps/admin/src/**/*.{js,ts,jsx,tsx}',
    // Include any future packages that might use Tailwind
    './packages/*/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Use OKLCH CSS variables for better theming support
      colors: {
        background: 'oklch(var(--color-background))',
        foreground: 'oklch(var(--color-foreground))',
        card: 'oklch(var(--color-card))',
        'card-foreground': 'oklch(var(--color-card-foreground))',
        popover: 'oklch(var(--color-popover))',
        'popover-foreground': 'oklch(var(--color-popover-foreground))',
        primary: {
          DEFAULT: 'oklch(var(--color-primary))',
          foreground: 'oklch(var(--color-primary-foreground))',
        },
        secondary: {
          DEFAULT: 'oklch(var(--color-secondary))',
          foreground: 'oklch(var(--color-secondary-foreground))',
        },
        muted: {
          DEFAULT: 'oklch(var(--color-muted))',
          foreground: 'oklch(var(--color-muted-foreground))',
        },
        accent: {
          DEFAULT: 'oklch(var(--color-accent))',
          foreground: 'oklch(var(--color-accent-foreground))',
        },
        destructive: {
          DEFAULT: 'oklch(var(--color-destructive))',
          foreground: 'oklch(var(--color-destructive-foreground))',
        },
        border: 'oklch(var(--color-border))',
        input: 'oklch(var(--color-input))',
        ring: 'oklch(var(--color-ring))',
        // Semantic colors
        success: 'oklch(var(--color-success))',
        warning: 'oklch(var(--color-warning))',
        error: 'oklch(var(--color-error))',
        info: 'oklch(var(--color-info))',
        // Chart colors
        'chart-1': 'oklch(var(--color-chart-1))',
        'chart-2': 'oklch(var(--color-chart-2))',
        'chart-3': 'oklch(var(--color-chart-3))',
        'chart-4': 'oklch(var(--color-chart-4))',
        'chart-5': 'oklch(var(--color-chart-5))',
        // Sidebar colors
        sidebar: 'oklch(var(--color-sidebar))',
        'sidebar-foreground': 'oklch(var(--color-sidebar-foreground))',
        'sidebar-primary': 'oklch(var(--color-sidebar-primary))',
        'sidebar-primary-foreground': 'oklch(var(--color-sidebar-primary-foreground))',
        'sidebar-accent': 'oklch(var(--color-sidebar-accent))',
        'sidebar-accent-foreground': 'oklch(var(--color-sidebar-accent-foreground))',
        'sidebar-border': 'oklch(var(--color-sidebar-border))',
        'sidebar-ring': 'oklch(var(--color-sidebar-ring))',
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        base: 'var(--radius-base)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        full: 'var(--radius-full)',
      },
      fontFamily: {
        sans: 'var(--font-family-sans)',
        serif: 'var(--font-family-serif)',
        mono: 'var(--font-family-mono)',
      },
      spacing: {
        '0': 'var(--spacing-0)',
        'px': 'var(--spacing-px)',
        '0.5': 'var(--spacing-0_5)',
        '1': 'var(--spacing-1)',
        '1.5': 'var(--spacing-1_5)',
        '2': 'var(--spacing-2)',
        '2.5': 'var(--spacing-2_5)',
        '3': 'var(--spacing-3)',
        '3.5': 'var(--spacing-3_5)',
        '4': 'var(--spacing-4)',
        '5': 'var(--spacing-5)',
        '6': 'var(--spacing-6)',
        '7': 'var(--spacing-7)',
        '8': 'var(--spacing-8)',
        '9': 'var(--spacing-9)',
        '10': 'var(--spacing-10)',
        '11': 'var(--spacing-11)',
        '12': 'var(--spacing-12)',
        '14': 'var(--spacing-14)',
        '16': 'var(--spacing-16)',
        '20': 'var(--spacing-20)',
        '24': 'var(--spacing-24)',
        '28': 'var(--spacing-28)',
        '32': 'var(--spacing-32)',
        '36': 'var(--spacing-36)',
        '40': 'var(--spacing-40)',
        '44': 'var(--spacing-44)',
        '48': 'var(--spacing-48)',
        '52': 'var(--spacing-52)',
        '56': 'var(--spacing-56)',
        '60': 'var(--spacing-60)',
        '64': 'var(--spacing-64)',
        '72': 'var(--spacing-72)',
        '80': 'var(--spacing-80)',
        '96': 'var(--spacing-96)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'base': 'var(--shadow-base)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'inner': 'var(--shadow-inner)',
      },
      zIndex: {
        '0': 'var(--z-0)',
        '10': 'var(--z-10)',
        '20': 'var(--z-20)',
        '30': 'var(--z-30)',
        '40': 'var(--z-40)',
        '50': 'var(--z-50)',
        'auto': 'var(--z-auto)',
        'dropdown': 'var(--z-dropdown)',
        'sticky': 'var(--z-sticky)',
        'fixed': 'var(--z-fixed)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        'modal': 'var(--z-modal)',
        'popover': 'var(--z-popover)',
        'tooltip': 'var(--z-tooltip)',
      },
      animationDuration: {
        '75': 'var(--duration-75)',
        '100': 'var(--duration-100)',
        '150': 'var(--duration-150)',
        '200': 'var(--duration-200)',
        '300': 'var(--duration-300)',
        '500': 'var(--duration-500)',
        '700': 'var(--duration-700)',
        '1000': 'var(--duration-1000)',
      },
      transitionTimingFunction: {
        'linear': 'var(--ease-linear)',
        'in': 'var(--ease-in)',
        'out': 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
        'fluid': 'var(--ease-fluid)',
        'snappy': 'var(--ease-snappy)',
        'bounce': 'var(--ease-bounce)',
      },
      fontSize: {
        'xs': 'var(--text-xs)',
        'sm': 'var(--text-sm)',
        'base': 'var(--text-base)',
        'lg': 'var(--text-lg)',
        'xl': 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
        '4xl': 'var(--text-4xl)',
        '5xl': 'var(--text-5xl)',
        '6xl': 'var(--text-6xl)',
        '7xl': 'var(--text-7xl)',
        '8xl': 'var(--text-8xl)',
        '9xl': 'var(--text-9xl)',
      },
      fontWeight: {
        'thin': 'var(--font-weight-thin)',
        'extralight': 'var(--font-weight-extralight)',
        'light': 'var(--font-weight-light)',
        'normal': 'var(--font-weight-normal)',
        'medium': 'var(--font-weight-medium)',
        'semibold': 'var(--font-weight-semibold)',
        'bold': 'var(--font-weight-bold)',
        'extrabold': 'var(--font-weight-extrabold)',
        'black': 'var(--font-weight-black)',
      },
      lineHeight: {
        'none': 'var(--leading-none)',
        'tight': 'var(--leading-tight)',
        'snug': 'var(--leading-snug)',
        'normal': 'var(--leading-normal)',
        'relaxed': 'var(--leading-relaxed)',
        'loose': 'var(--leading-loose)',
      },
      letterSpacing: {
        'tighter': 'var(--tracking-tighter)',
        'tight': 'var(--tracking-tight)',
        'normal': 'var(--tracking-normal)',
        'wide': 'var(--tracking-wide)',
        'wider': 'var(--tracking-wider)',
        'widest': 'var(--tracking-widest)',
      },
      backdropBlur: {
        'none': 'var(--blur-none)',
        'sm': 'var(--blur-sm)',
        'base': 'var(--blur-base)',
        'md': 'var(--blur-md)',
        'lg': 'var(--blur-lg)',
        'xl': 'var(--blur-xl)',
        '2xl': 'var(--blur-2xl)',
        '3xl': 'var(--blur-3xl)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-from-bottom': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-from-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-from-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-in-out',
        'fade-out': 'fade-out 0.5s ease-in-out',
        'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
        'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
      },
    },
  },
  plugins: [
    // Advanced CSS-atomics and performance support
    function({ addUtilities }: { addUtilities: (utilities: Record<string, Record<string, string>>) => void }) {
      addUtilities({
        // CSS-atomics for optimal performance
        '.atomic-will-change': {
          'will-change': 'transform, opacity',
        },
        '.atomic-gpu': {
          'transform': 'translateZ(0)',
          'backface-visibility': 'hidden',
        },
        '.atomic-composite': {
          'isolation': 'isolate',
        },
        // Performance utilities
        '.content-visibility-auto': {
          'content-visibility': 'auto',
          'contain-intrinsic-size': '0 500px',
        },
        '.content-visibility-hidden': {
          'content-visibility': 'hidden',
          'contain-intrinsic-size': '0 500px',
        },
        '.contain-strict': {
          'contain': 'strict',
        },
        '.contain-layout': {
          'contain': 'layout',
        },
        '.contain-style': {
          'contain': 'style',
        },
        '.contain-paint': {
          'contain': 'paint',
        },
        // Modern field sizing
        '.field-sizing-content': {
          'field-sizing': 'content',
        },
        '.field-sizing-fixed': {
          'field-sizing': 'fixed',
        },
      });
    },
  ],
}

export default config
