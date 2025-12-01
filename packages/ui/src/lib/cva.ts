/**
 * Class Variance Authority (CVA) Utility
 * Type-safe utility for creating component variants with Tailwind CSS 4
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Type definitions for variant configurations - more flexible to support nested structures
export type VariantProps<T> = {
  [K in keyof T]?: T[K] extends Record<string, infer U> ? U : T[K];
} & {
  className?: string;
  class?: string;
};

export interface VariantConfig<T = Record<string, Record<string, string>>> {
  variants: T;
  defaultVariants?: VariantProps<T>;
  compoundVariants?: CompoundVariant[];
  className?: string | ((props: unknown) => string);
  base?: string | ((props: unknown) => string);
}

export interface CompoundVariant {
  [key: string]: unknown;
  className?: string;
}

export type CVAConfig<T = Record<string, Record<string, string>>> = Omit<
  VariantConfig<T>,
  'variants' | 'defaultVariants'
> & {
  variants: T;
  defaultVariants?: Partial<VariantProps<T>>;
};

/**
 * Main CVA function for creating variant-based component classes
 */
export function cva<T = Record<string, Record<string, string>>>(
  config: CVAConfig<T>
) {
  return (props: {
    [key: string]: unknown;
    class?: string;
    className?: string;
    style?: Record<string, unknown>;
  } = {}) => {
    const variants = config.variants ?? {};
    const defaultVariants = config.defaultVariants ?? {};
    const compoundVariants = config.compoundVariants ?? [];
    const customBase = config.base;
    const configClassName = config.className;

    // Merge base classes
    const baseClasses = typeof customBase === 'function' ? customBase(props) : (customBase ?? '');
    const resolvedConfigClassName = typeof configClassName === 'function' ? configClassName(props) : configClassName;

    // Generate variant classes
    const variantClasses = Object.entries(variants).map(([variantName, variantOptions]) => {
      const variantValue = (props as any)[variantName];
      const defaultValue = (defaultVariants as any)?.[variantName];
      const selectedValue = variantValue ?? defaultValue;

      if (selectedValue && variantOptions && typeof variantOptions === 'object' && selectedValue in variantOptions) {
        return (variantOptions as Record<string, string>)[selectedValue];
      }
      return '';
    });

    // Generate compound variant classes
    const compoundVariantClasses = compoundVariants
      .filter((compoundVariant) =>
        Object.entries(compoundVariant).every(([key, value]) => {
          if (value === undefined) return true;
          return props[key] === value;
        })
      )
      .map((compoundVariant) => compoundVariant.className ?? '');

    // Merge all classes using clsx and tailwind-merge
    const allClasses = clsx(
      baseClasses,
      resolvedConfigClassName,
      ...variantClasses,
      ...compoundVariantClasses,
      props.className,
      props.class
    );

    // Use tailwind-merge for proper Tailwind CSS class merging
    return twMerge(allClasses);
  };
}

/**
 * Helper function for creating responsive variant configurations
 */
export function createResponsiveVariant<T>(variants: T): T {
  return variants;
}

/**
 * Helper function for creating size variants
 */
export const createSizeVariants = <T>(sizes: T) =>
  createResponsiveVariant(sizes);

/**
 * Helper function for creating color variants
 */
export const createColorVariants = <T>(colors: T) =>
  createResponsiveVariant(colors);

/**
 * Helper function for creating state variants
 */
export const createStateVariants = <T>(states: T) =>
  createResponsiveVariant(states);

/**
 * Helper function for creating style variants
 */
export const createStyleVariants = <T>(styles: T) =>
  createResponsiveVariant(styles);

/**
 * Pre-built variant configurations for common patterns
 */
export const buttonVariants = {
  variants: {
    variant: {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    },
    size: {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-10 px-8 text-base',
      xl: 'h-11 px-10 text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
};

export const cardVariants = {
  variants: {
    variant: {
      default: 'bg-card text-card-foreground border',
      outlined: 'bg-background text-foreground border-2',
      elevated: 'bg-card text-card-foreground border shadow-md',
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
} as const;

export const inputVariants = {
  variants: {
    variant: {
      default: 'border border-input bg-background text-foreground',
      filled: 'bg-muted text-foreground border-0',
      outlined: 'border-2 border-input bg-transparent text-foreground',
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4',
      lg: 'h-12 px-6 text-base',
    },
    state: {
      default: '',
      error: 'border-destructive focus:border-destructive',
      success: 'border-green-500 focus:border-green-500',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
    state: 'default',
  },
} as const;

export const badgeVariants = {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
      destructive: 'bg-destructive text-destructive-foreground',
      outline: 'text-foreground border',
    },
    size: {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-2 text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
} as const;

export const alertVariants = {
  variants: {
    variant: {
      default: 'bg-background text-foreground border',
      destructive: 'bg-destructive text-destructive-foreground border-destructive',
      success: 'bg-green-500 text-white',
      warning: 'bg-yellow-500 text-white',
      info: 'bg-blue-500 text-white',
    },
    size: {
      sm: 'p-3 text-sm',
      md: 'p-4',
      lg: 'p-6 text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
  compoundVariants: [
    {
      variant: 'default',
      size: 'lg',
      className: 'text-lg',
    },
  ],
} as const;

/**
 * Type utility for extracting variant keys from a config
 */
export type VariantKeys<T extends Record<string, Record<string, string>>> = keyof T;

/**
 * Type utility for extracting variant values from a config
 */
export type VariantValues<T extends Record<string, Record<string, string>>, K extends keyof T> = T[K][keyof T[K]];

/**
 * Higher-order component utility that applies CVA classes
 */
export function withVariants<T extends Record<string, Record<string, string>>>(
  config: CVAConfig<T>
) {
  return (Component: any) => {
    const StyledComponent = (props: any) => {
      const cvaClasses = cva(config)(props);
      return Component({ ...props, className: cvaClasses });
    };

    StyledComponent.displayName = Component.displayName ?? 'StyledComponent';
    return StyledComponent;
  };
}

/**
 * Utility for creating compound variant configurations
 */
export function createCompoundVariants(
  variants: CompoundVariant[]
): CompoundVariant[] {
  return variants;
}

/**
 * Utility for merging multiple CVA configurations
 */
export function mergeCVAConfigs<T extends Record<string, Record<string, string>>>(
  baseConfig: CVAConfig<T>,
  ...configs: Partial<CVAConfig<T>>[]
): CVAConfig<T> {
  const merged = { ...baseConfig };

  configs.forEach((config) => {
    if (config.variants) {
      merged.variants = { ...merged.variants, ...config.variants };
    }
    if (config.defaultVariants) {
      merged.defaultVariants = { ...merged.defaultVariants, ...config.defaultVariants };
    }
    if (config.compoundVariants) {
      merged.compoundVariants = [
        ...(merged.compoundVariants ?? []),
        ...config.compoundVariants,
      ];
    }
    Object.assign(merged, config);
  });

  return merged as CVAConfig<T>;
}

/**
 * Utility for conditional variant classes
 */
export function conditionalVariant<T extends Record<string, Record<string, string>>>(
  condition: boolean,
  variants: Partial<T>
) {
  return condition ? variants : {};
}

/**
 * Utility for responsive variant configurations
 */
export function responsiveVariant<T extends Record<string, Record<string, string>>>(
  breakpoint: string,
  variants: T
): { [key: string]: T } {
  const screens = {
    xs: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  } as const;

  return {
    [screens[breakpoint as keyof typeof screens]]: variants,
  };
}

/**
 * Type guards for variant validation
 */
export function isValidVariant<T extends Record<string, Record<string, string>>>(
  config: CVAConfig<T>,
  variantName: string,
  variantValue: string
): boolean {
  return (
    config.variants[variantName] &&
    Object.keys(config.variants[variantName]).includes(variantValue)
  );
}

/**
 * Debug utility for logging variant configurations
 */
export function debugVariants<T extends Record<string, Record<string, string>>>(
  config: CVAConfig<T>,
  props: Record<string, any>
): void {
  if (process.env.NODE_ENV === 'development') {
    // console.group('CVA Debug');
    // console.log('Config:', config);
    // console.log('Props:', props);
    // console.log('Active Variants:');

    Object.entries(config.variants).forEach(([variantName, variantOptions]) => {
      const propValue = props[variantName];
      const defaultValue = config.defaultVariants?.[variantName as keyof T];
      const selectedValue = propValue ?? defaultValue;

      if (selectedValue && variantOptions[selectedValue]) {
        // console.log(`  ${variantName}: ${selectedValue}`);
      }
    });

    // console.log('Compound Variants:');
    config.compoundVariants?.forEach((compoundVariant) => {
      const matches = Object.entries(compoundVariant).every(([key, value]) => {
        if (value === undefined) return true;
        return props[key] === value;
      });

      if (matches && compoundVariant.className) {
        // console.log(`  Compound: ${compoundVariant.className}`);
      }
    });

    // console.groupEnd();
  }
}

export default cva;