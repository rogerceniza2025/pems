/**
 * Component Factory Utility
 * Factory functions for creating components with consistent CVA patterns
 */

import {
  cva,
  type CompoundVariant,
  type CVAConfig,
  type VariantConfig,
} from './cva'

/**
 * Creates a component factory function with predefined CVA configuration
 */
export function createComponentFactory<
  T = Record<string, Record<string, string>>,
>(baseConfig: CVAConfig<T>) {
  return (overrides: Partial<CVAConfig<T>> = {}) => {
    const mergedConfig = {
      ...baseConfig,
      ...overrides,
      variants: {
        ...baseConfig.variants,
        ...(overrides.variants ?? {}),
      },
      defaultVariants: {
        ...baseConfig.defaultVariants,
        ...(overrides.defaultVariants ?? {}),
      },
      compoundVariants: [
        ...(baseConfig.compoundVariants ?? []),
        ...(overrides.compoundVariants ?? []),
      ],
    }

    return cva(mergedConfig as CVAConfig<T>)
  }
}

/**
 * Pre-defined variant configurations for common component patterns
 */
export const createButtonVariant = <
  T extends Record<string, Record<string, string>>,
>(
  variants: T,
) => {
  const baseConfig: VariantConfig<T> = {
    variants,
    defaultVariants: {},
  }

  return createComponentFactory({
    ...baseConfig,
    className: 'inline-flex items-center justify-center',
  })
}

export const createCardVariant = <
  T extends Record<string, Record<string, string>>,
>(
  variants: T,
) => {
  const baseConfig: VariantConfig<T> = {
    variants,
    defaultVariants: {},
  }

  return createComponentFactory({
    ...baseConfig,
    base: 'rounded-lg border bg-card text-card-foreground shadow-sm',
  })
}

export const createInputVariant = <
  T extends Record<string, Record<string, string>>,
>(
  variants: T,
) => {
  const baseConfig: VariantConfig<T> = {
    variants,
    defaultVariants: {},
  }

  return createComponentFactory({
    ...baseConfig,
    base: 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  })
}

export const createAlertVariant = <
  T extends Record<string, Record<string, string>>,
>(
  variants: T,
) => {
  const baseConfig: VariantConfig<T> = {
    variants,
    defaultVariants: {},
  }

  return createComponentFactory({
    ...baseConfig,
    base: 'relative w-full rounded-lg border p-4',
    className: '[&>svg+div]:translate-y-1 [&>svg+div]:absolute',
  })
}

/**
 * Compound variant utilities
 */
export function createCompoundVariants(
  variants: CompoundVariant[],
): CompoundVariant[] {
  return variants
}

/**
 * Common compound variant patterns
 */
export const sizeBasedCompoundVariants = (sizeMap: Record<string, string>) => {
  return Object.entries(sizeMap).map(([size, sizeClass]) => ({
    size: size,
    class: sizeClass,
  }))
}

export const stateBasedCompoundVariants = (
  stateMap: Record<string, string>,
) => {
  return Object.entries(stateMap).map(([state, stateClass]) => ({
    state: state,
    class: stateClass,
  }))
}

/**
 * Size variant helpers
 */
export const createSizeVariants = <T extends Record<string, string>>(
  sizeMap: T,
) => {
  return {
    size: sizeMap,
  }
}

export const createResponsiveSizeVariants = <T extends Record<string, string>>(
  sizeMap: T,
) => {
  return {
    size: sizeMap,
    responsive: true,
  }
}

/**
 * Color variant helpers
 */
export const createColorVariants = (colorMap: Record<string, string>) => {
  return {
    variant: colorMap,
  }
}

/**
 * State variant helpers
 */
export const createStateVariants = (stateMap: Record<string, string>) => {
  return {
    state: stateMap,
  }
}

/**
 * Style variant helpers
 */
export const createStyleVariants = (styleMap: Record<string, string>) => {
  return {
    style: styleMap,
  }
}

/**
 * Common variant configurations
 */
export const commonSizes = {
  xs: 'h-6 px-2 text-xs',
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
  xl: 'h-14 px-8 text-xl',
} as const

export const commonColors: Record<string, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  accent: 'bg-accent text-accent-foreground hover:bg-accent/80',
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  muted: 'bg-muted text-muted-foreground',
  success: 'bg-green-500 text-white hover:bg-green-600',
  warning: 'bg-yellow-500 text-white hover:bg-yellow-600',
  info: 'bg-blue-500 text-white hover:bg-blue-600',
}

export const commonStates: Record<string, string> = {
  default: '',
  hover: 'hover:shadow-md',
  active: 'active:scale-95',
  focus: 'focus:ring-2 focus:ring-primary focus:ring-offset-2',
  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
  loading: 'opacity-70 cursor-not-allowed',
}

export const commonStyles: Record<string, string> = {
  rounded: 'rounded-md',
  roundedLg: 'rounded-lg',
  roundedSm: 'rounded-sm',
  roundedXl: 'rounded-xl',
  full: 'rounded-full',
  shadow: 'shadow-sm',
  shadowLg: 'shadow-lg',
  shadowXl: 'shadow-xl',
}

/**
 * Pre-configured variant sets
 */
export const buttonVariantSet = {
  size: commonSizes,
  variant: commonColors,
  state: commonStates,
  style: {
    rounded: 'rounded-md',
    shadow: 'shadow-sm',
  },
}

export const cardVariantSet = {
  state: commonStates,
  style: {
    rounded: 'rounded-lg',
    shadow: 'shadow-sm',
    elevated: 'shadow-md',
    outlined: 'border-2',
  },
}

export const inputVariantSet = {
  size: {
    xs: 'h-8 px-2 text-xs',
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-6 text-lg',
  },
  state: {
    error: 'border-destructive focus:border-destructive',
    success: 'border-green-500 focus:border-green-500',
  },
  style: {
    rounded: 'rounded-md',
    filled: 'bg-muted border-0',
    outlined: 'border-2',
  },
}

/**
 * Higher-order component utilities
 */
export function withVariants<T extends Record<string, Record<string, string>>>(
  config: CVAConfig<T>,
) {
  return <P extends Record<string, unknown>>(
    Component: (props: P) => unknown,
  ) => {
    const cvaFunction = cva(config)
    const WrappedComponent = (props: P & { class?: string }) => {
      const classes = cvaFunction(props)
      return Component({ ...props, class: classes } as P)
    }
    WrappedComponent.displayName =
      (Component as { displayName?: string }).displayName ?? 'WithVariants'
    return WrappedComponent
  }
}

/**
 * Utility for creating responsive component configurations
 */
export function createResponsiveConfig(
  breakpoints: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> {
  const responsiveConfig: Record<string, Record<string, string>> = {}

  Object.entries(breakpoints).forEach(([breakpoint, variantMap]) => {
    responsiveConfig[breakpoint] = variantMap
  })

  return responsiveConfig
}

/**
 * Utility for merging variant configurations
 */
export function mergeVariantConfigs(
  baseConfig: Record<string, Record<string, string>>,
  ...configs: Partial<Record<string, Record<string, string>>>[]
) {
  return configs.reduce(
    (merged, config) => ({
      ...merged,
      ...config,
    }),
    baseConfig,
  )
}

/**
 * Utility for creating theme-aware components
 */
export function createThemedComponent(
  lightConfig: Record<string, Record<string, string>>,
  darkConfig: Record<string, Record<string, string>>,
) {
  return (theme: 'light' | 'dark' = 'light') => {
    const config = theme === 'dark' ? darkConfig : lightConfig
    return createComponentFactory({ variants: config })
  }
}

/**
 * Type utilities for variant configuration
 */
export type ComponentVariant<T extends Record<string, Record<string, string>>> =
  {
    [K in keyof T]: T[K][keyof T[K]]
  }

export type ComponentConfig<T extends Record<string, Record<string, string>>> =
  {
    base?: string
    variants?: T
    defaultVariants?: ComponentVariant<T>
    compoundVariants?: CompoundVariant[]
    className?: string | ((props: unknown) => string)
  }

/**
 * Re-export CVA utilities for convenience
 */
export {
  alertVariants,
  badgeVariants,
  buttonVariants,
  cardVariants,
  cva,
  inputVariants,
  type CompoundVariant,
  type VariantConfig,
  type VariantProps,
} from './cva'
