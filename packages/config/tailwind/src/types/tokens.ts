/**
 * Semantic Design Token Type System
 * Provides TypeScript definitions for design tokens with validation and documentation
 */

// Base token types
export type ColorToken = string; // OKLCH color string
export type SpacingToken = string; // CSS length value
export type BorderRadiusToken = string; // CSS border-radius value
export type ShadowToken = string; // CSS box-shadow value
export type FontFamilyToken = string; // CSS font-family value
export type ZIndexToken = string | number; // CSS z-index value

// Semantic token categories
export interface ColorTokens {
  // Core semantic colors
  background: ColorToken;
  foreground: ColorToken;

  // Surface colors
  card: ColorToken;
  cardForeground: ColorToken;
  popover: ColorToken;
  popoverForeground: ColorToken;

  // Interactive colors
  primary: ColorToken;
  primaryForeground: ColorToken;
  secondary: ColorToken;
  secondaryForeground: ColorToken;

  // State colors
  muted: ColorToken;
  mutedForeground: ColorToken;
  accent: ColorToken;
  accentForeground: ColorToken;
  destructive: ColorToken;
  destructiveForeground: ColorToken;

  // Border and input colors
  border: ColorToken;
  input: ColorToken;
  ring: ColorToken;

  // Status colors (semantic)
  success: ColorToken;
  successForeground: ColorToken;
  warning: ColorToken;
  warningForeground: ColorToken;
  info: ColorToken;
  infoForeground: ColorToken;

  // Data visualization colors
  chart1: ColorToken;
  chart2: ColorToken;
  chart3: ColorToken;
  chart4: ColorToken;
  chart5: ColorToken;

  // Sidebar specific colors
  sidebar: ColorToken;
  sidebarForeground: ColorToken;
  sidebarPrimary: ColorToken;
  sidebarPrimaryForeground: ColorToken;
  sidebarAccent: ColorToken;
  sidebarAccentForeground: ColorToken;
  sidebarBorder: ColorToken;
  sidebarRing: ColorToken;
}

export interface SpacingTokens {
  // Semantic spacing
  xs: SpacingToken; // 0.25rem - Extra small
  sm: SpacingToken; // 0.5rem  - Small
  md: SpacingToken; // 1rem    - Medium (base)
  lg: SpacingToken; // 1.5rem  - Large
  xl: SpacingToken; // 2rem    - Extra large
  '2xl': SpacingToken; // 3rem   - 2X large

  // Component-specific spacing
  section: SpacingToken;
  component: SpacingToken;
  element: SpacingToken;
  container: SpacingToken;
  gap: SpacingToken;
}

export interface BorderRadiusTokens {
  // Semantic radius values
  none: BorderRadiusToken;
  sm: BorderRadiusToken;   // 0.125rem - Small
  md: BorderRadiusToken;   // 0.375rem - Medium
  lg: BorderRadiusToken;   // 0.5rem   - Large (default)
  xl: BorderRadiusToken;   // 0.75rem  - Extra large
  '2xl': BorderRadiusToken; // 1rem     - 2X large
  '3xl': BorderRadiusToken; // 1.5rem   - 3X large
  full: BorderRadiusToken; // 9999px   - Full circle

  // Default radius for components
  default: BorderRadiusToken;
  button: BorderRadiusToken;
  card: BorderRadiusToken;
  input: BorderRadiusToken;
  modal: BorderRadiusToken;
}

export interface ShadowTokens {
  // Semantic shadow values
  none: ShadowToken;
  sm: ShadowToken;  // Subtle elevation
  md: ShadowToken;  // Standard elevation
  lg: ShadowToken;  // Significant elevation
  xl: ShadowToken;  // Maximum elevation

  // Context-specific shadows
  button: ShadowToken;
  card: ShadowToken;
  modal: ShadowToken;
  dropdown: ShadowToken;
  tooltip: ShadowToken;
}

export interface TypographyTokens {
  // Font families
  sans: FontFamilyToken;
  serif: FontFamilyToken;
  mono: FontFamilyToken;
  display: FontFamilyToken;
  body: FontFamilyToken;

  // Font weights
  thin: string;
  light: string;
  normal: string;
  medium: string;
  semibold: string;
  bold: string;
  extrabold: string;

  // Font sizes (using clamp for responsive typography)
  xs: string;    // 0.75rem
  sm: string;    // 0.875rem
  base: string;  // 1rem
  lg: string;    // 1.125rem
  xl: string;    // 1.25rem
  '2xl': string; // 1.5rem
  '3xl': string; // 1.875rem
  '4xl': string; // 2.25rem
  '5xl': string; // 3rem
  '6xl': string; // 3.75rem

  // Line heights
  tight: string;
  snug: string;
  lineHeightNormal: string;
  relaxed: string;
  loose: string;
}

export interface ZIndexTokens {
  // Semantic z-index scale
  hide: ZIndexToken;      // -1 or similar
  auto: ZIndexToken;      // auto
  base: ZIndexToken;      // 0
  docked: ZIndexToken;    // 10
  dropdown: ZIndexToken;  // 1000
  sticky: ZIndexToken;    // 1020
  banner: ZIndexToken;    // 1030
  overlay: ZIndexToken;   // 1040
  modal: ZIndexToken;     // 1050
  popover: ZIndexToken;   // 1060
  skipLink: ZIndexToken;  // 1070
  toast: ZIndexToken;     // 1080
  tooltip: ZIndexToken;   // 1090
}

export interface AnimationTokens {
  // Durations
  fast: string;      // 150ms
  normal: string;   // 300ms
  slow: string;      // 500ms

  // Easing functions
  easeIn: string;
  easeOut: string;
  easeInOut: string;

  // Transitions
  colors: string;
  opacity: string;
  shadow: string;
  transform: string;
}

// Complete design token system
export interface DesignTokenSystem {
  colors: ColorTokens;
  spacing: SpacingTokens;
  borderRadius: BorderRadiusTokens;
  shadows: ShadowTokens;
  typography: TypographyTokens;
  zIndex: ZIndexTokens;
  animation: AnimationTokens;
}

// Theme variants
export type ThemeVariant = 'light' | 'dark' | 'auto';

// Token validation rules
export interface TokenValidationRules {
  color: {
    pattern: RegExp;
    description: string;
  };
  spacing: {
    pattern: RegExp;
    description: string;
  };
  borderRadius: {
    pattern: RegExp;
    description: string;
  };
  zIndex: {
    pattern: RegExp;
    description: string;
  };
}

// Default validation rules implementation
export const tokenValidationRules: TokenValidationRules = {
  color: {
    pattern: /^oklch\(\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\)$/,
    description: 'Colors must be in OKLCH format: oklch(lightness% chroma hue)',
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

// Token metadata for documentation and validation
export interface TokenMetadata {
  description: string;
  category: string;
  usage: string[];
  accessibility?: {
    contrast?: number;
    wcagLevel?: 'AA' | 'AAA';
  };
  responsive?: boolean;
  theme?: ThemeVariant[];
}

// Token registry with metadata
export interface TokenRegistry {
  [tokenName: string]: {
    value: string;
    metadata: TokenMetadata;
    validation?: TokenValidationRules[keyof TokenValidationRules];
  };
}

// Theme configuration interface
export interface ThemeConfiguration {
  name: string;
  variant: ThemeVariant;
  tokens: Partial<DesignTokenSystem>;
  extends?: string[]; // Theme inheritance
  overrides?: {
    [category: string]: {
      [tokenName: string]: string;
    };
  };
}

// Utility type for extracting token values
export type TokenValue<T extends keyof DesignTokenSystem, K extends keyof DesignTokenSystem[T]> =
  DesignTokenSystem[T][K];

// Utility type for CSS custom property names
export type CSSCustomProperty<T extends string> = `--${T}`;

// Helper types for creating token-based CSS
export type TokenCSSProperties = {
  [K in keyof ColorTokens as `--${K}`]: ColorTokens[K];
} & {
  [K in keyof SpacingTokens as `--spacing-${K}`]: SpacingTokens[K];
} & {
  [K in keyof BorderRadiusTokens as `--radius-${K}`]: BorderRadiusTokens[K];
} & {
  [K in keyof ShadowTokens as `--shadow-${K}`]: ShadowTokens[K];
} & {
  [K in keyof ZIndexTokens as `--z-${K}`]: ZIndexTokens[K];
};

// Runtime token validation
export class TokenValidator {
  private static rules: TokenValidationRules = {
    color: {
      pattern: /^oklch\(\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\)$/,
      description: 'Colors must be in OKLCH format: oklch(lightness% chroma hue)',
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

  static validateToken(category: keyof TokenValidationRules, value: string): boolean {
    const rule = this.rules[category];
    return rule.pattern.test(value);
  }

  static validateTokenWithMessage(category: keyof TokenValidationRules, value: string): {
    valid: boolean;
    message?: string;
  } {
    const rule = this.rules[category];
    const valid = rule.pattern.test(value);

    return {
      valid,
      message: valid ? undefined : rule.description,
    };
  }

  static validateColorToken(value: string): boolean {
    return this.validateToken('color', value);
  }

  static validateSpacingToken(value: string): boolean {
    return this.validateToken('spacing', value);
  }

  static validateBorderRadiusToken(value: string): boolean {
    return this.validateToken('borderRadius', value);
  }

  static validateZIndexToken(value: string): boolean {
    return this.validateToken('zIndex', value);
  }
}

// Token transformation utilities
export class TokenTransformer {
  /**
   * Creates an OKLCH color string
   * @param lightness - Lightness percentage (0-100%)
   * @param chroma - Chroma value (0-0.4+ for practical gamut)
   * @param hue - Hue angle (0-360 degrees)
   */
  static toOKLCH(lightness: number, chroma: number, hue: number): ColorToken {
    return `oklch(${lightness}% ${chroma} ${hue})`;
  }

  /**
   * Adjusts the lightness of an OKLCH color
   * @param color - OKLCH color string
   * @param amount - Amount to adjust lightness by (-100 to +100)
   */
  static adjustLightness(color: ColorToken, amount: number): ColorToken {
    const match = color.match(/oklch\((\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\)/);
    if (!match) return color;

    const [, l, c, h] = match.map(Number);
    if (l === undefined || c === undefined || h === undefined) return color;

    const newLightness = Math.max(0, Math.min(100, l + amount));

    return this.toOKLCH(newLightness, c, h);
  }

  /**
   * Adjusts the chroma (color intensity) of an OKLCH color
   * @param color - OKLCH color string
   * @param amount - Amount to adjust chroma by (can be positive or negative)
   */
  static adjustChroma(color: ColorToken, amount: number): ColorToken {
    const match = color.match(/oklch\((\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\)/);
    if (!match) return color;

    const [, l, c, h] = match.map(Number);
    if (l === undefined || c === undefined || h === undefined) return color;

    const newChroma = Math.max(0, c + amount); // OKLCH chroma has no theoretical upper limit

    return this.toOKLCH(l, newChroma, h);
  }

  /**
   * Rotates the hue of an OKLCH color
   * @param color - OKLCH color string
   * @param degrees - Degrees to rotate hue (-360 to +360)
   */
  static rotateHue(color: ColorToken, degrees: number): ColorToken {
    const match = color.match(/oklch\((\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\)/);
    if (!match) return color;

    const [, l, c, h] = match.map(Number);
    if (l === undefined || c === undefined || h === undefined) return color;

    const newHue = (h + degrees) % 360;

    return this.toOKLCH(l, c, newHue);
  }

  static toRem(pixels: number): SpacingToken {
    return `${pixels / 16}rem`;
  }

  static toPX(rem: number): SpacingToken {
    return `${rem * 16}px`;
  }

  // Legacy HSL method for backward compatibility
  static toHSL(hue: number, saturation: number, lightness: number): ColorToken {
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
}