# Week 4 Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing enhanced UI components with advanced features, animations, and improved accessibility for Week 4.

## Prerequisites

### Environment Setup

```bash
# Install new dependencies
npm install framer-motion @solid-primitives/keyboard @solid-primitives/media @solid-primitives/timer zod

# Update existing dependencies
npm update @kobalte/core tailwindcss solid-js

# Ensure TypeScript is configured
npm install --save-dev @types/framer-motion
```

### Configuration Updates

#### Tailwind CSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-out': 'fadeOut 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'slide-down': 'slideDown 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
        'scale-out': 'scaleOut 150ms ease-out',
        ripple: 'ripple 600ms ease-out',
        shimmer: 'shimmer 2s infinite',
        wave: 'wave 1.5s infinite',
        'bounce-gentle': 'bounceGentle 600ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        wave: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        bounceGentle: {
          '0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
          '40%, 43%': { transform: 'translate3d(0, -30px, 0)' },
          '70%': { transform: 'translate3d(0, -15px, 0)' },
          '90%': { transform: 'translate3d(0, -4px, 0)' },
        },
      },
    },
  },
  plugins: [],
}
```

## Phase 1: Foundation Implementation

### Step 1: Create Animation Utilities

#### File: `packages/ui/src/lib/animations.ts`

```typescript
import { createSignal, onMount, onCleanup } from 'solid-js'

export const ANIMATION_CONFIG = {
  durations: {
    instant: '0ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  reducedMotion: {
    duration: '0ms',
    easing: 'linear',
  },
}

export const MOTION_PRESETS = {
  gentle: {
    duration: ANIMATION_CONFIG.durations.normal,
    easing: ANIMATION_CONFIG.easing.easeOut,
  },
  snappy: {
    duration: ANIMATION_CONFIG.durations.fast,
    easing: ANIMATION_CONFIG.easing.easeInOut,
  },
  bouncy: {
    duration: ANIMATION_CONFIG.durations.slow,
    easing: ANIMATION_CONFIG.easing.bounce,
  },
  elastic: {
    duration: ANIMATION_CONFIG.durations.slower,
    easing: ANIMATION_CONFIG.easing.elastic,
  },
}

export interface MotionConfig {
  duration?: string
  easing?: string
  delay?: string
  fillMode?: 'forwards' | 'backwards' | 'both' | 'none'
}

export const createMotion = (
  element: Element,
  keyframes: Keyframe[],
  config: MotionConfig = {},
) => {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

  const animationConfig: KeyframeAnimationOptions = {
    duration: parseInt(
      prefersReducedMotion
        ? '0'
        : config.duration || ANIMATION_CONFIG.durations.normal,
    ),
    easing: prefersReducedMotion
      ? 'linear'
      : config.easing || ANIMATION_CONFIG.easing.easeOut,
    fill: config.fillMode || 'forwards',
  }

  return element.animate(keyframes, animationConfig)
}

export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = createSignal(false)

  onMount(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)

    onCleanup(() => {
      mediaQuery.removeEventListener('change', handleChange)
    })
  })

  return prefersReducedMotion
}
```

#### File: `packages/ui/src/lib/transitions.ts`

```typescript
import { createMotion } from './animations'

export const TRANSITIONS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { transform: 'translateY(10px)', opacity: 0 },
    animate: { transform: 'translateY(0)', opacity: 1 },
    exit: { transform: 'translateY(-10px)', opacity: 0 },
  },
  slideDown: {
    initial: { transform: 'translateY(-10px)', opacity: 0 },
    animate: { transform: 'translateY(0)', opacity: 1 },
    exit: { transform: 'translateY(10px)', opacity: 0 },
  },
  scale: {
    initial: { transform: 'scale(0.95)', opacity: 0 },
    animate: { transform: 'scale(1)', opacity: 1 },
    exit: { transform: 'scale(0.95)', opacity: 0 },
  },
  slideLeft: {
    initial: { transform: 'translateX(10px)', opacity: 0 },
    animate: { transform: 'translateX(0)', opacity: 1 },
    exit: { transform: 'translateX(-10px)', opacity: 0 },
  },
  slideRight: {
    initial: { transform: 'translateX(-10px)', opacity: 0 },
    animate: { transform: 'translateX(0)', opacity: 1 },
    exit: { transform: 'translateX(10px)', opacity: 0 },
  },
}

export const createTransition = (
  element: Element,
  transition: keyof typeof TRANSITIONS,
  config = {},
) => {
  const transitionConfig = TRANSITIONS[transition]
  return createMotion(
    element,
    [transitionConfig.initial, transitionConfig.animate],
    config,
  )
}
```

#### File: `packages/ui/src/lib/ripple.ts`

```typescript
export interface RippleEvent {
  id: string
  x: number
  y: number
  size: number
}

export const createRipple = (
  event: MouseEvent,
  container: HTMLElement,
  color = 'rgba(255, 255, 255, 0.3)',
): RippleEvent => {
  const rect = container.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // Calculate ripple size (diagonal of container)
  const size = Math.max(rect.width, rect.height) * 2

  return {
    id: `ripple-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    x,
    y,
    size,
  }
}
```

#### File: `packages/ui/src/lib/debounce.ts`

```typescript
export const createDebounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>

  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
```

### Step 2: Create Skeleton Components

#### File: `packages/ui/src/components/ui/skeleton.tsx`

```typescript
import { splitProps } from 'solid-js'
import { cn } from '../../lib/utils'

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  class?: string
  animation?: 'pulse' | 'wave' | 'shimmer'
  speed?: 'slow' | 'normal' | 'fast'
}

export const Skeleton = (props: SkeletonProps) => {
  const [local, others] = splitProps(props, [
    'variant',
    'width',
    'height',
    'class',
    'animation',
    'speed'
  ])

  const animationClass = () => {
    switch (local.animation) {
      case 'wave':
        return 'animate-wave'
      case 'shimmer':
        return 'animate-shimmer'
      case 'pulse':
      default:
        return 'animate-pulse'
    }
  }

  const speedClass = () => {
    switch (local.speed) {
      case 'slow':
        return 'animation-duration-slow'
      case 'fast':
        return 'animation-duration-fast'
      case 'normal':
      default:
        return 'animation-duration-normal'
    }
  }

  const variantClass = () => {
    switch (local.variant) {
      case 'circular':
        return 'rounded-full'
      case 'rounded':
        return 'rounded-lg'
      case 'rectangular':
      default:
        return 'rounded'
    }
  }

  return (
    <div
      class={cn(
        'bg-muted',
        animationClass(),
        speedClass(),
        variantClass(),
        local.class
      )}
      style={{
        width: typeof local.width === 'number' ? `${local.width}px` : local.width,
        height: typeof local.height === 'number' ? `${local.height}px` : local.height
      }}
      {...others}
    />
  )
}
```

#### File: `packages/ui/src/components/ui/skeleton-card.tsx`

```typescript
import { Skeleton } from './skeleton'

export interface SkeletonCardProps {
  class?: string
  showAvatar?: boolean
  showTitle?: boolean
  showDescription?: boolean
  showFooter?: boolean
  lines?: number
}

export const SkeletonCard = (props: SkeletonCardProps) => {
  return (
    <div class={`rounded-lg border bg-card p-6 ${props.class || ''}`}>
      {/* Avatar */}
      {props.showAvatar && (
        <div class="flex items-center space-x-4 mb-4">
          <Skeleton variant="circular" width={40} height={40} />
          <div class="space-y-2 flex-1">
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={14} />
          </div>
        </div>
      )}

      {/* Title */}
      {props.showTitle && (
        <Skeleton
          width={props.showAvatar ? '80%' : '60%'}
          height={24}
          class="mb-4"
        />
      )}

      {/* Description lines */}
      {props.lines && props.lines > 0 && (
        <div class="space-y-2 mb-4">
          {Array.from({ length: props.lines }).map((_, index) => (
            <Skeleton
              key={index}
              width={index === props.lines! - 1 ? '80%' : '100%'}
              height={16}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {props.showFooter && (
        <div class="flex justify-end space-x-2">
          <Skeleton width={80} height={32} variant="rounded" />
          <Skeleton width={100} height={32} variant="rounded" />
        </div>
      )}
    </div>
  )
}
```

## Phase 2: Enhanced Core Components

### Step 3: Enhanced Button Component

#### File: `packages/ui/src/components/ui/enhanced-button.tsx`

```typescript
import { createSignal, createEffect, onMount, onCleanup, Show, For } from 'solid-js'
import { splitProps } from 'solid-js'
import * as ButtonPrimitive from '@kobalte/core/button'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import { createRipple } from '../../lib/ripple'
import { createDebounce } from '../../lib/debounce'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-105',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-105',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-105',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-105',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-105',
        link: 'text-primary underline-offset-4 hover:underline active:scale-105'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface EnhancedButtonProps<T extends ValidComponent = 'button'> =
  ButtonPrimitive.ButtonRootProps<T> & {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
    loading?: boolean
    loadingText?: string
    loadingPosition?: 'start' | 'end' | 'center'
    loadingVariant?: 'spinner' | 'dots' | 'pulse' | 'skeleton'
    icon?: JSX.Element
    iconPosition?: 'start' | 'end'
    iconSize?: 'sm' | 'md' | 'lg'
    ripple?: boolean
    rippleColor?: string
    scaleOnHover?: boolean
    scaleOnPress?: boolean
    confirmMode?: boolean
    confirmText?: string
    confirmTimeout?: number
    debounce?: number
    onLoadingStart?: () => void
    onLoadingEnd?: () => void
    onRipple?: (event: any) => void
    onConfirm?: () => void
    class?: string
    children?: JSX.Element
  }

export const EnhancedButton = <T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, EnhancedButtonProps<T>>
) => {
  const [local, others] = splitProps(props as EnhancedButtonProps, [
    'variant',
    'size',
    'loading',
    'loadingText',
    'loadingPosition',
    'loadingVariant',
    'icon',
    'iconPosition',
    'iconSize',
    'ripple',
    'rippleColor',
    'scaleOnHover',
    'scaleOnPress',
    'confirmMode',
    'confirmText',
    'confirmTimeout',
    'debounce',
    'onLoadingStart',
    'onLoadingEnd',
    'onRipple',
    'onConfirm',
    'class',
    'children'
  ])

  const [isPressed, setIsPressed] = createSignal(false)
  const [showConfirm, setShowConfirm] = createSignal(false)
  const [ripples, setRipples] = createSignal<any[]>([])

  let buttonRef: HTMLButtonElement | undefined
  let confirmTimeout: number | undefined

  // Ripple effect implementation
  const createRippleEffect = (event: MouseEvent) => {
    if (!local.ripple || !buttonRef) return

    const ripple = createRipple(event, buttonRef, local.rippleColor)
    setRipples(prev => [...prev, ripple])

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== ripple.id))
    }, 600)

    local.onRipple?.(ripple)
  }

  // Debounced click handler
  const debouncedClick = createDebounce((event: MouseEvent) => {
    if (local.confirmMode && !showConfirm()) {
      setShowConfirm(true)
      confirmTimeout = setTimeout(() => setShowConfirm(false), local.confirmTimeout || 3000)
      return
    }

    if (showConfirm()) {
      local.onConfirm?.()
    }
  }, local.debounce || 0)

  // Handle loading states
  createEffect(() => {
    if (local.loading) {
      local.onLoadingStart?.()
    } else {
      local.onLoadingEnd?.()
    }
  })

  // Cleanup
  onCleanup(() => {
    if (confirmTimeout) clearTimeout(confirmTimeout)
  })

  const buttonClasses = () => cn(
    buttonVariants({
      variant: local.variant,
      size: local.size
    }),
    'relative overflow-hidden',
    local.scaleOnHover && 'hover:scale-105',
    local.scaleOnPress && 'active:scale-95',
    local.ripple && 'overflow-visible',
    local.class
  )

  return (
    <ButtonPrimitive.Root
      ref={buttonRef}
      class={buttonClasses()}
      disabled={local.loading || local.disabled}
      aria-busy={local.loading}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onClick={(e) => {
        createRippleEffect(e)
        debouncedClick(e)
      }}
      {...(others as any)}
    >
      {/* Ripple effects */}
      {local.ripple && (
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <For each={ripples()}>
            {(ripple) => (
              <div
                class="absolute rounded-full bg-white/30 animate-ping"
                style={{
                  left: `${ripple.x}px`,
                  top: `${ripple.y}px`,
                  width: `${ripple.size}px`,
                  height: `${ripple.size}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            )}
          </For>
        </div>
      )}

      {/* Loading state */}
      <Show when={local.loading}>
        <div class="absolute inset-0 flex items-center justify-center bg-inherit">
          <Show
            when={local.loadingVariant === 'spinner'}
            fallback={
              <Show
                when={local.loadingVariant === 'dots'}
                fallback={
                  <Show
                    when={local.loadingVariant === 'pulse'}
                    fallback={
                      <div class="w-full h-full bg-current/20 animate-pulse" />
                    }
                  >
                    <div class="w-4 h-4 bg-current rounded-full animate-pulse" />
                  </Show>
                }
              >
                <div class="flex space-x-1">
                  <div class="w-1 h-1 bg-current rounded-full animate-bounce" style="animation-delay: '0ms'" />
                  <div class="w-1 h-1 bg-current rounded-full animate-bounce" style="animation-delay: '150ms'" />
                  <div class="w-1 h-1 bg-current rounded-full animate-bounce" style="animation-delay: '300ms'" />
                </div>
              </Show>
            }
          >
            <div class="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          </Show>
        </div>
      </Show>

      {/* Button content */}
      <div class={cn(
        'flex items-center justify-center gap-2 transition-opacity duration-200',
        local.loading && 'opacity-0'
      )}>
        {/* Icon at start */}
        {local.icon && local.iconPosition === 'start' && (
          <span class={cn(
            'flex-shrink-0',
            local.iconSize === 'sm' && 'w-3 h-3',
            local.iconSize === 'md' && 'w-4 h-4',
            local.iconSize === 'lg' && 'w-5 h-5'
          )}>
            {local.icon}
          </span>
        )}

        {/* Confirm mode */}
        <Show when={local.confirmMode && showConfirm()}>
          <span class="text-destructive">{local.confirmText || 'Confirm?'}</span>
        </Show>

        {/* Normal text */}
        <Show when={!local.confirmMode || !showConfirm()}>
          <span>{local.loading ? local.loadingText : local.children}</span>
        </Show>

        {/* Icon at end */}
        {local.icon && local.iconPosition === 'end' && (
          <span class={cn(
            'flex-shrink-0',
            local.iconSize === 'sm' && 'w-3 h-3',
            local.iconSize === 'md' && 'w-4 h-4',
            local.iconSize === 'lg' && 'w-5 h-5'
          )}>
            {local.icon}
          </span>
        )}
      </div>
    </ButtonPrimitive.Root>
  )
}
```

### Step 4: Enhanced Input Component

#### File: `packages/ui/src/components/ui/enhanced-input.tsx`

```typescript
import { createSignal, createEffect, createMemo, onMount, Show } from 'solid-js'
import { splitProps } from 'solid-js'
import * as TextFieldPrimitive from '@kobalte/core/text-field'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import { cn } from '../../lib/utils'
import { createDebounce } from '../../lib/debounce'

export interface ValidationState {
  isValid: boolean
  isInvalid: boolean
  isWarning: boolean
  message?: string
  strength?: 'weak' | 'medium' | 'strong'
}

export interface ValidationResult {
  isValid: boolean
  message?: string
  strength?: 'weak' | 'medium' | 'strong'
}

export interface EnhancedInputProps<T extends ValidComponent = 'input'> =
  TextFieldPrimitive.TextFieldInputProps<T> & {
    validation?: ValidationState
    validator?: (value: string) => ValidationResult
    validateOnBlur?: boolean
    validateOnChange?: boolean
    validateDebounce?: number
    clearable?: boolean
    showPasswordToggle?: boolean
    prefix?: JSX.Element
    suffix?: JSX.Element
    helperText?: string
    errorText?: string
    maxLength?: number
    showCharacterCount?: boolean
    characterCountPosition?: 'start' | 'end'
    autoResize?: boolean
    highlightOnFocus?: boolean
    selectAllOnFocus?: boolean
    copyButton?: boolean
    pasteButton?: boolean
    ariaLabel?: string
    ariaDescribedBy?: string
    ariaInvalid?: boolean
    ariaErrorMessage?: string
    onValidationChange?: (state: ValidationState) => void
    onClear?: () => void
    onCopy?: () => void
    onPaste?: () => void
    onCharacterCountChange?: (count: number, maxLength: number) => void
    class?: string
  }

export const EnhancedInput = <T extends ValidComponent = 'input'>(
  props: PolymorphicProps<T, EnhancedInputProps<T>>
) => {
  const [local, others] = splitProps(props as EnhancedInputProps, [
    'validation',
    'validator',
    'validateOnBlur',
    'validateOnChange',
    'validateDebounce',
    'clearable',
    'showPasswordToggle',
    'prefix',
    'suffix',
    'helperText',
    'errorText',
    'maxLength',
    'showCharacterCount',
    'characterCountPosition',
    'autoResize',
    'highlightOnFocus',
    'selectAllOnFocus',
    'copyButton',
    'pasteButton',
    'ariaLabel',
    'ariaDescribedBy',
    'ariaInvalid',
    'ariaErrorMessage',
    'onValidationChange',
    'onClear',
    'onCopy',
    'onPaste',
    'onCharacterCountChange',
    'class'
  ])

  const [isFocused, setIsFocused] = createSignal(false)
  const [showPassword, setShowPassword] = createSignal(false)
  const [characterCount, setCharacterCount] = createSignal(0)
  const [validationState, setValidationState] = createSignal<ValidationState>({
    isValid: false,
    isInvalid: false,
    isWarning: false
  })

  let inputRef: HTMLInputElement | undefined

  // Debounced validation
  const debouncedValidation = createDebounce((value: string) => {
    if (local.validator) {
      const result = local.validator(value)
      setValidationState({
        isValid: result.isValid,
        isInvalid: !result.isValid,
        isWarning: false,
        message: result.message,
        strength: result.strength
      })
      local.onValidationChange?.(validationState())
    }
  }, local.validateDebounce || 300)

  // Handle input changes
  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    const value = target.value

    // Update character count
    setCharacterCount(value.length)
    local.onCharacterCountChange?.(value.length, local.maxLength || 0)

    // Trigger validation if enabled
    if (local.validateOnChange) {
      debouncedValidation(value)
    }

    local.onInput?.(event)
  }

  // Handle focus events
  const handleFocus = (event: FocusEvent) => {
    setIsFocused(true)

    const target = event.target as HTMLInputElement

    // Highlight text if enabled
    if (local.highlightOnFocus) {
      target.select()
    }

    // Select all if enabled
    if (local.selectAllOnFocus) {
      target.setSelectionRange(0, target.value.length)
    }

    local.onFocus?.(event)
  }

  const handleBlur = (event: FocusEvent) => {
    setIsFocused(false)

    // Trigger validation if enabled
    if (local.validateOnBlur && local.validator) {
      const target = event.target as HTMLInputElement
      const result = local.validator(target.value)
      setValidationState({
        isValid: result.isValid,
        isInvalid: !result.isValid,
        isWarning: false,
        message: result.message,
        strength: result.strength
      })
      local.onValidationChange?.(validationState())
    }

    local.onBlur?.(event)
  }

  // Clear input
  const handleClear = () => {
    if (inputRef) {
      inputRef.value = ''
      setCharacterCount(0)
      setValidationState({ isValid: false, isInvalid: false, isWarning: false })
      local.onClear?.()
    }
  }

  // Copy to clipboard
  const handleCopy = async () => {
    if (inputRef) {
      try {
        await navigator.clipboard.writeText(inputRef.value)
        local.onCopy?.()
      } catch (err) {
        console.error('Failed to copy to clipboard:', err)
      }
    }
  }

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (inputRef) {
        inputRef.value = text
        setCharacterCount(text.length)
        local.onPaste?.()
      }
    } catch (err) {
      console.error('Failed to paste from clipboard:', err)
    }
  }

  // Memoized input type
  const inputType = createMemo(() => {
    if (local.type === 'password' && local.showPasswordToggle) {
      return showPassword() ? 'text' : 'password'
    }
    return local.type || 'text'
  })

  // Memoized show clear button
  const showClearButton = createMemo(() => {
    return local.clearable && characterCount() > 0 && !local.disabled
  })

  const inputClasses = () => cn(
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    local.prefix && 'pl-10',
    (local.suffix || local.clearable || local.showPasswordToggle || local.copyButton || local.pasteButton) && 'pr-10',
    validationState().isInvalid && 'border-destructive focus-visible:ring-destructive',
    validationState().isWarning && 'border-yellow-500 focus-visible:ring-yellow-500',
    validationState().isValid && 'border-green-500 focus-visible:ring-green-500',
    isFocused() && 'shadow-lg',
    local.class
  )

  return (
    <div class={cn('relative w-full', local.class)}>
      <TextFieldPrimitive.Root class="relative">
        {/* Prefix */}
        {local.prefix && (
          <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {local.prefix}
          </div>
        )}

        {/* Input field */}
        <TextFieldPrimitive.Input
          ref={inputRef}
          type={inputType()}
          class={inputClasses()}
          maxLength={local.maxLength}
          aria-label={local.ariaLabel}
          aria-describedby={local.ariaDescribedBy}
          aria-invalid={local.ariaInvalid || validationState().isInvalid}
          aria-errormessage={local.ariaErrorMessage}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...(others as any)}
        />

        {/* Suffix and action buttons */}
        <div class="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {/* Clear button */}
          <Show when={showClearButton()}>
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleClear}
              aria-label="Clear input"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Show>

          {/* Password toggle */}
          <Show when={local.type === 'password' && local.showPasswordToggle}>
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword(!showPassword())}
              aria-label={showPassword() ? 'Hide password' : 'Show password'}
            >
              <Show when={showPassword()}>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </Show>
              <Show when={!showPassword()}>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </Show>
            </button>
          </Show>

          {/* Copy button */}
          <Show when={local.copyButton}>
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleCopy}
              aria-label="Copy to clipboard"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </Show>

          {/* Paste button */}
          <Show when={local.pasteButton}>
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground transition-colors"
              onClick={handlePaste}
              aria-label="Paste from clipboard"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012 2h2a2 2 0 012-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
          </Show>

          {/* Custom suffix */}
          {local.suffix}
        </div>
      </TextFieldPrimitive.Root>

      {/* Helper text and validation messages */}
      <Show when={local.helperText || validationState().message || local.showCharacterCount}>
        <div class="mt-1 space-y-1">
          {/* Helper text */}
          <Show when={local.helperText && !validationState().message}>
            <p class="text-sm text-muted-foreground">{local.helperText}</p>
          </Show>

          {/* Validation message */}
          <Show when={validationState().message}>
            <p class={cn(
              'text-sm',
              validationState().isInvalid && 'text-destructive',
              validationState().isWarning && 'text-yellow-600',
              validationState().isValid && 'text-green-600'
            )}>
              {validationState().message}
            </p>
          </Show>

          {/* Character count */}
          <Show when={local.showCharacterCount && local.maxLength}>
            <div class={cn(
              'text-sm text-right',
              characterCount() > local.maxLength * 0.9 && 'text-yellow-600',
              characterCount() >= local.maxLength && 'text-destructive'
            )}>
              {characterCount()}/{local.maxLength}
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}
```

## Phase 3: Testing Implementation

### Step 5: Update Test Configuration

#### File: `packages/ui/vitest.enhanced.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import solid from 'solid-start/vite'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/', '**/*.d.ts', '**/*.stories.tsx'],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    exclude: ['src/**/*.stories.tsx', 'src/**/*.spec.ts'],
  },
  plugins: [solid()],
})
```

#### File: `packages/ui/test/enhanced-setup.ts`

```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
})
```

## Phase 4: Documentation Updates

### Step 6: Update Component Stories

#### File: `packages/ui/src/EnhancedButton.stories.tsx`

```typescript
import type { Meta, StoryObj } from 'storybook-solidjs'
import { EnhancedButton } from './components/ui/enhanced-button'

const meta: Meta<typeof EnhancedButton> = {
  title: 'UI/Enhanced Button',
  component: EnhancedButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Enhanced Button component with loading states, ripple effects, and micro-interactions.'
      }
    }
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link']
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon']
    },
    loading: {
      control: 'boolean'
    },
    ripple: {
      control: 'boolean'
    },
    confirmMode: {
      control: 'boolean'
    },
    loadingVariant: {
      control: 'select',
      options: ['spinner', 'dots', 'pulse', 'skeleton']
    }
  }
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Click me'
  }
}

export const WithLoading: Story = {
  args: {
    children: 'Loading Button',
    loading: true,
    loadingText: 'Processing...'
  }
}

export const WithRipple: Story = {
  args: {
    children: 'Ripple Button',
    ripple: true
  }
}

export const WithConfirm: Story = {
  args: {
    children: 'Delete',
    variant: 'destructive',
    confirmMode: true,
    confirmText: 'Are you sure?',
    confirmTimeout: 3000
  }
}

export const WithIcon: Story = {
  args: {
    children: 'With Icon',
    icon: <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>,
    iconPosition: 'start'
  }
}

export const AllVariants: Story = {
  render: () => (
    <div class="flex gap-2">
      <EnhButton variant="default">Default</EnhButton>
      <EnhButton variant="destructive">Destructive</EnhButton>
      <EnhButton variant="outline">Outline</EnhButton>
      <EnhButton variant="secondary">Secondary</EnhButton>
      <EnhButton variant="ghost">Ghost</EnhButton>
      <EnhButton variant="link">Link</EnhButton>
    </div>
  )
}

export const AllSizes: Story = {
  render: () => (
    <div class="flex items-center gap-2">
      <EnhButton size="sm">Small</EnhButton>
      <EnhButton size="default">Default</EnhButton>
      <EnhButton size="lg">Large</EnhButton>
      <EnhButton size="icon">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </EnhButton>
    </div>
  )
}
```

## Phase 5: Demo Updates

### Step 7: Update UI Components Demo

#### File: `apps/web/src/routes/enhanced-ui-components-demo.tsx`

```typescript
import type { Component } from 'solid-js'
import { createSignal, For, Show } from 'solid-js'
import { EnhancedButton } from '@pems/ui'
import { EnhancedInput } from '@pems/ui'
import { Skeleton, SkeletonCard } from '@pems/ui'

const EnhancedUIComponentsDemo: Component = () => {
  const [theme, setTheme] = createSignal<'light' | 'dark'>('light')
  const [activeComponent, setActiveComponent] = createSignal('button')
  const [buttonLoading, setButtonLoading] = createSignal(false)
  const [inputValue, setInputValue] = createSignal('')
  const [showConfirm, setShowConfirm] = createSignal(false)

  const toggleTheme = () => {
    const newTheme = theme() === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const handleButtonClick = async () => {
    setButtonLoading(true)
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 2000))
    setButtonLoading(false)
  }

  const handleInputValidation = (value: string) => {
    if (value.length < 3) {
      return { isValid: false, message: 'Must be at least 3 characters' }
    }
    if (!/^[a-zA-Z0-9]+$/.test(value)) {
      return { isValid: false, message: 'Only alphanumeric characters allowed' }
    }
    return { isValid: true }
  }

  const components = [
    { id: 'button', label: 'Enhanced Button', icon: '🔘' },
    { id: 'input', label: 'Enhanced Input', icon: '📝' },
    { id: 'skeleton', label: 'Skeleton Components', icon: '💀' },
  ]

  return (
    <div class={`min-h-screen bg-background text-foreground ${theme()}`}>
      {/* Header */}
      <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div class="container flex h-14 items-center justify-between">
          <div class="flex items-center space-x-4">
            <h1 class="text-xl font-bold">Enhanced UI Components</h1>
            <span class="text-sm text-muted-foreground">
              Advanced interactions and animations
            </span>
          </div>
          <EnhancedButton variant="outline" size="sm" onClick={toggleTheme}>
            {theme() === 'light' ? '🌙' : '☀️'} Theme
          </EnhancedButton>
        </div>
      </header>

      {/* Navigation */}
      <nav class="sticky top-14 z-40 w-full border-b bg-background">
        <div class="container flex h-12 items-center space-x-6 overflow-x-auto">
          <For each={components}>
            {(component) => (
              <button
                class={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
                  activeComponent() === component.id
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
                onClick={() => setActiveComponent(component.id)}
              >
                <span>{component.icon}</span>
                <span>{component.label}</span>
              </button>
            )}
          </For>
        </div>
      </nav>

      {/* Main Content */}
      <main class="container py-8 space-y-16">
        {/* Enhanced Button Component */}
        <Show when={activeComponent() === 'button'}>
          <section class="space-y-8">
            <div>
              <h2 class="text-3xl font-bold flex items-center gap-2">
                <span>🔘</span> Enhanced Button Component
              </h2>
              <p class="text-muted-foreground">
                Button with loading states, ripple effects, and micro-interactions
              </p>
            </div>

            {/* Button Variants */}
            <div class="space-y-4">
              <h3 class="text-xl font-semibold">Variants</h3>
              <div class="flex flex-wrap gap-2">
                <EnhancedButton variant="default">Default</EnhancedButton>
                <EnhancedButton variant="destructive">Destructive</EnhancedButton>
                <EnhancedButton variant="outline">Outline</EnhancedButton>
                <EnhancedButton variant="secondary">Secondary</EnhancedButton>
                <EnhancedButton variant="ghost">Ghost</EnhancedButton>
                <EnhancedButton variant="link">Link</EnhancedButton>
              </div>
            </div>

            {/* Button with Loading */}
            <div class="space-y-4">
              <h3 class="text-xl font-semibold">Loading States</h3>
              <div class="flex flex-wrap gap-2">
                <EnhancedButton
                  loading
                  loadingVariant="spinner"
                  loadingText="Loading..."
                >
                  Spinner
                </EnhancedButton>
                <EnhancedButton
                  loading
                  loadingVariant="dots"
                  loadingText="Loading..."
                >
                  Dots
                </EnhancedButton>
                <EnhancedButton
                  loading
                  loadingVariant="pulse"
                  loadingText="Loading..."
                >
                  Pulse
                </EnhancedButton>
              </div>
            </div>

            {/* Button with Ripple */}
            <div class="space-y-4">
              <h3 class="text-xl font-semibold">Ripple Effects</h3>
              <div class="flex flex-wrap gap-2">
                <EnhancedButton ripple>Ripple Effect</EnhancedButton>
                <EnhancedButton ripple rippleColor="rgba(59, 130, 246, 0.3)">
                  Blue Ripple
                </EnhancedButton>
              </div>
            </div>

            {/* Button with Confirm */}
            <div class="space-y-4">
              <h3 class="text-xl font-semibold">Confirm Mode</h3>
              <div class="flex flex-wrap gap-2">
                <EnhancedButton
                  confirmMode
                  confirmText="Delete this item?"
                  onClick={() => setShowConfirm(!showConfirm())}
                >
                  {showConfirm() ? 'Confirmed!' : 'Delete Item'}
                </EnhancedButton>
              </div>
            </div>

            {/* Interactive Demo */}
            <div class="space-y-4">
              <h3 class="text-xl font-semibold">Interactive Demo</h3>
              <div class="flex flex-wrap gap-2">
                <EnhancedButton
                  loading={buttonLoading()}
                  onClick={handleButtonClick}
                  ripple
                  scaleOnHover
                >
                  {buttonLoading() ? 'Processing...' : 'Click to Load'}
                </EnhancedButton>
              </div>
            </div>
          </section>
        </Show>

        {/* Enhanced Input Component */}
        <Show when={activeComponent() === 'input'}>
          <section class="space-y-8">
            <div>
              <h2 class="text-3xl font-bold flex items-center gap-2">
                <span>📝</span> Enhanced Input Component
              </h2>
              <p class="text-muted-foreground">
                Input with validation, character counting, and utility features
              </p>
            </div>

            {/* Input with Validation */}
            <div class="space-y-4">
              <h3 class="text-xl font-semibold">Validation</h3>
              <div class="space-y-4 max-w-md">
                <EnhancedInput
                  placeholder="Enter at least 3 characters"
                  validator={handleInputValidation}
                  validateOnChange
                  validateDebounce={300}
                  helperText="Only alphanumeric characters are allowed"
                />
              </div>
            </div>

            {/* Input with Features */}
            <div class="space-y-4">
              <h3 class="text-xl font-semibold">Utility Features</h3>
              <div class="space-y-4 max-w-md">
                <EnhancedInput
                  type="password"
                  placeholder="Password with toggle"
                  showPasswordToggle
                  clearable
                  maxLength={20}
                  showCharacterCount
                  helperText="Password must be at least 8 characters"
                />

                <EnhancedInput
                  placeholder="Text with copy/paste"
                  clearable
                  copyButton
                  pasteButton
                  helperText="You can copy or paste text"
                />
              </div>
            </div>
          </section>
        </Show>

        {/* Skeleton Components */}
        <Show when={activeComponent() === 'skeleton'}>
          <section class="space-y-8">
            <div>
              <h2 class="text-3xl font-bold flex items-center gap-2">
                <span>💀</span> Skeleton Components
              </h2>
              <p class="text-muted-foreground">
                Loading placeholders for better perceived performance
              </p>
            </div>

            {/* Skeleton Variants */}
            <div class="space-y-4">
              <h3 class="text-xl font-semibold">Skeleton Variants</h3>
              <div class="space-y-4">
                <div class="flex items-center gap-4">
                  <Skeleton variant="text" width={200} height={16} />
                  <Skeleton variant="circular" width={40} height={40} />
                  <Skeleton variant="rectangular" width={100} height={40} />
                  <Skeleton variant="rounded" width={120} height={40} />
                </div>
              </div>
            </div>

            {/* Skeleton Card */}
            <div class="space-y-4">
              <h3 class="text-xl font-semibold">Skeleton Card</h3>
              <div class="grid gap-6 md:grid-cols-2">
                <SkeletonCard
                  showAvatar
                  showTitle
                  showDescription
                  showFooter
                  lines={3}
                />
                <SkeletonCard
                  showTitle
                  showDescription
                  lines={2}
                />
              </div>
            </div>
          </section>
        </Show>
      </main>
    </div>
  )
}

export default EnhancedUIComponentsDemo
```

## Implementation Checklist

### Phase 1: Foundation ✅

- [ ] Create animation utilities
- [ ] Create transition system
- [ ] Create ripple effect utility
- [ ] Create debounce utility
- [ ] Create skeleton components

### Phase 2: Core Components ✅

- [ ] Implement enhanced Button component
- [ ] Implement enhanced Input component
- [ ] Add loading states
- [ ] Add micro-interactions
- [ ] Add accessibility improvements

### Phase 3: Testing ✅

- [ ] Update test configuration
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write accessibility tests
- [ ] Set up CI/CD pipeline

### Phase 4: Documentation ✅

- [ ] Update component stories
- [ ] Create enhanced demo page
- [ ] Update API documentation
- [ ] Add usage examples

### Phase 5: Polish ✅

- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Mobile responsiveness
- [ ] Final documentation review

This implementation guide provides a comprehensive roadmap for enhancing UI components with advanced features while maintaining code quality and accessibility standards.
