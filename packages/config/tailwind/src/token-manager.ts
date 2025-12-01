/**
 * Semantic Design Token Manager
 * Runtime management and manipulation of design tokens with type safety
 */

import type {
  ColorTokens,
  DesignTokenSystem,
  SpacingTokens,
  ThemeVariant,
  TokenMetadata,
  TokenRegistry,
  TokenValidationRules,
} from './types/tokens';

export class DesignTokenManager {
  private static instance: DesignTokenManager;
  private tokens: DesignTokenSystem;
  private registry: TokenRegistry;
  private currentTheme: ThemeVariant = 'light';
  private tokenVersion: string = '1.0.0';

  private constructor() {
    this.initializeDefaultTokens();
    this.initializeRegistry();
  }

  public static getInstance(): DesignTokenManager {
    if (!DesignTokenManager.instance) {
      DesignTokenManager.instance = new DesignTokenManager();
    }
    return DesignTokenManager.instance;
  }

  private initializeDefaultTokens(): void {
    this.tokens = {
      colors: {
        // Core semantic colors
        background: '0 0% 100%',
        foreground: '222.2 84% 4.9%',

        // Surface colors
        card: '0 0% 100%',
        cardForeground: '222.2 84% 4.9%',
        popover: '0 0% 100%',
        popoverForeground: '222.2 84% 4.9%',

        // Interactive colors
        primary: '222.2 47.4% 11.2%',
        primaryForeground: '210 40% 98%',
        secondary: '210 40% 96%',
        secondaryForeground: '222.2 47.4% 11.2%',

        // State colors
        muted: '210 40% 96%',
        mutedForeground: '215.4 16.3% 46.9%',
        accent: '210 40% 96%',
        accentForeground: '222.2 47.4% 11.2%',
        destructive: '0 84.2% 60.2%',
        destructiveForeground: '210 40% 98%',

        // Border and input colors
        border: '214.3 31.8% 91.4%',
        input: '214.3 31.8% 91.4%',
        ring: '222.2 84% 4.9%',

        // Status colors
        success: '142 76% 36%',
        successForeground: '355.7 100% 97.3%',
        warning: '38 92% 50%',
        warningForeground: '48 96% 89%',
        info: '221 83% 53%',
        infoForeground: '210 40% 98%',

        // Data visualization colors
        chart1: '12 76% 61%',
        chart2: '173 58% 39%',
        chart3: '197 37% 24%',
        chart4: '43 74% 66%',
        chart5: '27 87% 67%',

        // Sidebar colors
        sidebar: '0 0% 98%',
        sidebarForeground: '240 5.3% 26.1%',
        sidebarPrimary: '240 5.9% 10%',
        sidebarPrimaryForeground: '0 0% 98%',
        sidebarAccent: '240 4.8% 95.9%',
        sidebarAccentForeground: '240 5.9% 10%',
        sidebarBorder: '220 13% 91%',
        sidebarRing: '217.2 91.2% 59.8%',
      },

      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        section: '4rem',
        component: '1.5rem',
        element: '1rem',
        container: '2rem',
        gap: '1rem',
      },

      borderRadius: {
        none: '0',
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
        default: '0.5rem',
        button: '0.375rem',
        card: '0.5rem',
        input: '0.375rem',
        modal: '0.75rem',
      },

      shadows: {
        none: 'none',
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        button: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        card: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        modal: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        dropdown: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        tooltip: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },

      typography: {
        sans: "'Inter', system-ui, sans-serif",
        serif: "'Georgia', serif",
        mono: "'JetBrains Mono', 'Fira Code', monospace",
        display: "'Inter', system-ui, sans-serif",
        body: "'Inter', system-ui, sans-serif",

        thin: '100',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',

        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',

        tight: '1.25',
        snug: '1.375',
        lineHeightNormal: '1.5',
        relaxed: '1.625',
        loose: '2',
      },

      zIndex: {
        hide: '-1',
        auto: 'auto',
        base: '0',
        docked: '10',
        dropdown: '1000',
        sticky: '1020',
        banner: '1030',
        overlay: '1040',
        modal: '1050',
        popover: '1060',
        skipLink: '1070',
        toast: '1080',
        tooltip: '1090',
      },

      animation: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',

        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

        colors: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        shadow: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        transform: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    };
  }

  private initializeRegistry(): void {
    this.registry = {
      // Color tokens with metadata
      '--background': {
        value: this.tokens.colors.background,
        metadata: {
          description: 'Main background color for the application',
          category: 'colors',
          usage: ['body', 'layout', 'cards'],
          theme: ['light', 'dark'],
        },
      },
      '--foreground': {
        value: this.tokens.colors.foreground,
        metadata: {
          description: 'Main text color for the application',
          category: 'colors',
          usage: ['text', 'headings', 'labels'],
          accessibility: { contrast: 21, wcagLevel: 'AAA' },
          theme: ['light', 'dark'],
        },
      },
      // Add more token registrations as needed...
    };
  }

  // Public API methods

  public getToken(category: keyof DesignTokenSystem, tokenName: string): string {
    const categoryTokens = this.tokens[category] as unknown as Record<string, string>;
    return categoryTokens[tokenName] ?? '';
  }

  public setToken(category: keyof DesignTokenSystem, tokenName: string, value: string): void {
    const categoryTokens = this.tokens[category] as unknown as Record<string, string>;
    categoryTokens[tokenName] = value;
    this.updateCSSToken(category, tokenName, value);
  }

  public getTheme(): ThemeVariant {
    return this.currentTheme;
  }

  public setTheme(theme: ThemeVariant): void {
    this.currentTheme = theme;
    this.applyTheme(theme);
  }

  public getTokens(): DesignTokenSystem {
    return { ...this.tokens };
  }

  public getRegistry(): TokenRegistry {
    return { ...this.registry };
  }

  public registerToken(name: string, value: string, metadata: TokenMetadata): void {
    this.registry[name] = {
      value,
      metadata,
    };
  }

  // Dark theme management
  private applyTheme(theme: ThemeVariant): void {
    if (theme === 'dark') {
      this.applyDarkTheme();
    } else if (theme === 'light') {
      this.applyLightTheme();
    }
  }

  private applyDarkTheme(): void {
    const darkOverrides: Partial<ColorTokens> = {
      background: '222.2 84% 4.9%',
      foreground: '210 40% 98%',
      card: '222.2 84% 4.9%',
      cardForeground: '210 40% 98%',
      popover: '222.2 84% 4.9%',
      popoverForeground: '210 40% 98%',
      primary: '210 40% 98%',
      primaryForeground: '222.2 47.4% 11.2%',
      secondary: '217.2 32.6% 17.5%',
      secondaryForeground: '210 40% 98%',
      muted: '217.2 32.6% 17.5%',
      mutedForeground: '215 20.2% 65.1%',
      accent: '217.2 32.6% 17.5%',
      accentForeground: '210 40% 98%',
      destructive: '0 62.8% 30.6%',
      destructiveForeground: '210 40% 98%',
      border: '217.2 32.6% 17.5%',
      input: '217.2 32.6% 17.5%',
      ring: '212.7 26.8% 83.9%',
    };

    Object.entries(darkOverrides).forEach(([key, value]) => {
      this.setToken('colors', key, value);
    });

    // Apply dark class to document
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
    }
  }

  private applyLightTheme(): void {
    // Reset to default light theme values
    this.initializeDefaultTokens();
    this.updateAllCSSTokens();

    // Remove dark class from document
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
  }

  // CSS token management
  private updateCSSToken(category: keyof DesignTokenSystem, tokenName: string, value: string): void {
    if (typeof document === 'undefined') return;

    const cssVarName = this.getCSSVariableName(category, tokenName);
    document.documentElement.style.setProperty(cssVarName, value);
  }

  private updateAllCSSTokens(): void {
    if (typeof document === 'undefined') return;

    // Update all CSS custom properties
    Object.entries(this.tokens.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });

    Object.entries(this.tokens.spacing).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--spacing-${key}`, value);
    });

    Object.entries(this.tokens.borderRadius).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--radius-${key}`, value);
    });

    Object.entries(this.tokens.shadows).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--shadow-${key}`, value);
    });

    Object.entries(this.tokens.zIndex).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--z-${key}`, String(value));
    });

    // Set default radius
    document.documentElement.style.setProperty('--radius', this.tokens.borderRadius.default);
  }

  private getCSSVariableName(category: keyof DesignTokenSystem, tokenName: string): string {
    const categoryMap: Record<keyof DesignTokenSystem, string> = {
      colors: '--',
      spacing: '--spacing-',
      borderRadius: '--radius-',
      shadows: '--shadow-',
      typography: '--font-',
      zIndex: '--z-',
      animation: '--animation-',
    };

    return (categoryMap[category] || '--') + tokenName;
  }

  // Token validation
  public validateToken(category: keyof TokenValidationRules, value: string): {
    valid: boolean;
    message?: string;
  } {
    const patterns: TokenValidationRules = {
      color: {
        pattern: /^hsl\(\d+,\s*\d+%,\s*\d+%\)$/,
        description: 'Colors must be in HSL format: hsl(hue, saturation%, lightness%)',
      },
      spacing: {
        pattern: /^[\d.]+(rem|px|em|%)$/,
        description: 'Spacing must be a valid CSS length value with rem, px, em, or % units',
      },
      borderRadius: {
        pattern: /^[\d.]+(rem|px|em|%|9999px)$/,
        description: 'Border radius must be a valid CSS length value or 9999px for full circle',
      },
      zIndex: {
        pattern: /^(auto|-?\d+)$/,
        description: 'Z-index must be "auto" or an integer value',
      },
    };

    const rule = patterns[category];
    const valid = rule.pattern.test(value);

    return {
      valid,
      message: valid ? undefined : rule.description,
    };
  }

  // Token transformation utilities
  public createColorPalette(baseHue: number): Partial<ColorTokens> {
    return {
      primary: `hsl(${baseHue}, 47.4%, 11.2%)`,
      primaryForeground: `hsl(${baseHue}, 40%, 98%)`,
      accent: `hsl(${baseHue}, 40%, 96%)`,
      accentForeground: `hsl(${baseHue}, 47.4%, 11.2%)`,
    };
  }

  public createSpacingScale(baseUnit: number): Partial<SpacingTokens> {
    return {
      xs: `${baseUnit * 0.25}rem`,
      sm: `${baseUnit * 0.5}rem`,
      md: `${baseUnit}rem`,
      lg: `${baseUnit * 1.5}rem`,
      xl: `${baseUnit * 2}rem`,
      '2xl': `${baseUnit * 3}rem`,
    };
  }

  // Export utilities for external consumption
  public exportTokens(): string {
    return JSON.stringify(this.tokens, null, 2);
  }

  public importTokens(tokenJson: string): void {
    try {
      const importedTokens = JSON.parse(tokenJson) as DesignTokenSystem;
      this.tokens = { ...this.tokens, ...importedTokens };
      this.updateAllCSSTokens();
    } catch {
      // console.error('Failed to import tokens:', error);
    }
  }

  // Version management
  public getVersion(): string {
    return this.tokenVersion;
  }

  public setVersion(version: string): void {
    this.tokenVersion = version;
  }

  // Theme inheritance and composition
  public extendTheme(baseTheme: Partial<DesignTokenSystem>, overrides: Partial<DesignTokenSystem>): DesignTokenSystem {
    return {
      ...this.tokens,
      ...baseTheme,
      ...overrides,
    };
  }

  public createThemeVariant(_name: string, _baseTheme: Partial<DesignTokenSystem>): void {
    // Store theme variant for later use
    // This could be expanded to support named theme variants
    // console.log(`Created theme variant: ${name}`);
  }

  // Responsive token utilities
  public getResponsiveToken(baseToken: string, breakpoints: Record<string, string>): string {
    // Create responsive token using clamp()
    const values = Object.values(breakpoints);
    return `clamp(${values[0]}, 2.5vw, ${values[values.length - 1]})`;
  }
}

// Export singleton instance
export const tokenManager = DesignTokenManager.getInstance();

// Export convenience functions
export const getToken = (category: keyof DesignTokenSystem, tokenName: string): string =>
  tokenManager.getToken(category, tokenName);

export const setToken = (category: keyof DesignTokenSystem, tokenName: string, value: string): void =>
  tokenManager.setToken(category, tokenName, value);

export const setTheme = (theme: ThemeVariant): void => tokenManager.setTheme(theme);

export const getTheme = (): ThemeVariant => tokenManager.getTheme();