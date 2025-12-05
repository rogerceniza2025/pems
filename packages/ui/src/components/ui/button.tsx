import type { JSX, ValidComponent } from 'solid-js'
import { createSignal, For, Show, splitProps } from 'solid-js'
import { Portal } from 'solid-js/web'

import * as ButtonPrimitive from '@kobalte/core/button'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

import { useReducedMotion } from '../../lib/animations'
import { classNames } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]',
        ghost:
          'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        link: 'text-primary underline-offset-4 hover:underline active:scale-[0.98]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
      loading: {
        true: 'cursor-wait',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      loading: false,
    },
  },
)

// Loading spinner component
const LoadingSpinner = (props: {
  class?: string
  size?: 'sm' | 'md' | 'lg'
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <svg
      class={classNames('animate-spin', sizeClasses[props.size ?? 'md'], props.class)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// Loading dots component
const LoadingDots = (props: { class?: string }) => {
  return (
    <div class={classNames('flex space-x-1', props.class)}>
      <div
        class="w-1 h-1 bg-current rounded-full animate-bounce"
        style={{ 'animation-delay': '0ms' }}
      />
      <div
        class="w-1 h-1 bg-current rounded-full animate-bounce"
        style={{ 'animation-delay': '150ms' }}
      />
      <div
        class="w-1 h-1 bg-current rounded-full animate-bounce"
        style={{ 'animation-delay': '300ms' }}
      />
    </div>
  )
}

// Loading pulse component
const LoadingPulse = (props: { class?: string }) => {
  return (
    <div
      class={classNames('w-4 h-4 bg-current rounded-full animate-pulse', props.class)}
    />
  )
}

// Loading skeleton component
const LoadingSkeleton = (props: {
  class?: string
  width?: string
  height?: string
}) => {
  return (
    <div
      class={classNames('bg-current opacity-20 animate-pulse rounded', props.class)}
      style={{
        width: props.width ?? '1rem',
        height: props.height ?? '1rem',
      }}
    />
  )
}

export type LoadingType = 'spinner' | 'dots' | 'pulse' | 'skeleton'

type ButtonProps<T extends ValidComponent = 'button'> =
  ButtonPrimitive.ButtonRootProps<T> &
    VariantProps<typeof buttonVariants> & {
      class?: string | undefined
      children?: JSX.Element
      loading?: boolean
      loadingType?: LoadingType
      loadingText?: string
      confirmMode?: boolean
      confirmText?: string
      confirmDelay?: number
      icon?: JSX.Element
      iconPosition?: 'left' | 'right'
      ripple?: boolean
      rippleColor?: string
      onConfirm?: () => void | Promise<void>
    }

const Button = <T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, ButtonProps<T>>,
) => {
  const [local, others] = splitProps(props as ButtonProps, [
    'variant',
    'size',
    'class',
    'loading',
    'loadingType',
    'loadingText',
    'confirmMode',
    'confirmText',
    'confirmDelay',
    'icon',
    'iconPosition',
    'ripple',
    'rippleColor',
    'onConfirm',
    'children',
    'disabled',
  ])

  const [isConfirming, setIsConfirming] = createSignal(false)
  const [ripples, setRipples] = createSignal<
    Array<{ id: number; x: number; y: number; size: number }>
  >([])
  const [buttonElement, setButtonElement] = createSignal<HTMLButtonElement>()
  const prefersReducedMotion = useReducedMotion()

  // Handle confirm mode
  const handleClick = async (_event: MouseEvent) => {
    if (local.loading || local.disabled) return

    if (local.confirmMode && !isConfirming()) {
      setIsConfirming(true)
      setTimeout(() => {
        setIsConfirming(false)
      }, local.confirmDelay ?? 3000)
      return
    }

    if (isConfirming() && local.onConfirm) {
      await local.onConfirm()
      setIsConfirming(false)
    }
  }

  // Handle ripple effect
  const handleRipple = (event: MouseEvent) => {
    if (
      !local.ripple ||
      prefersReducedMotion() ||
      local.loading ||
      local.disabled
    )
      return

    const button = buttonElement()
    if (!button) return

    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    const newRipple = {
      id: Date.now(),
      x,
      y,
      size,
    }

    setRipples((prev) => [...prev, newRipple])

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
    }, 600)
  }

  // Get loading component based on type
  const getLoadingComponent = () => {
    const size = local.size === 'sm' ? 'sm' : local.size === 'lg' ? 'lg' : 'md'

    switch (local.loadingType) {
      case 'dots':
        return <LoadingDots class="text-current" />
      case 'pulse':
        return <LoadingPulse class="text-current" />
      case 'skeleton':
        return <LoadingSkeleton width="1rem" height="1rem" />
      case 'spinner':
      default:
        return <LoadingSpinner size={size} class="text-current" />
    }
  }

  // Get button content based on state
  const buttonContent = () => {
    if (local.loading) {
      return (
        <>
          {getLoadingComponent()}
          {local.loadingText && <span>{local.loadingText}</span>}
        </>
      )
    }

    if (isConfirming()) {
      return <span>{local.confirmText ?? 'Are you sure?'}</span>
    }

    return (
      <>
        {local.icon && local.iconPosition !== 'right' && local.icon}
        {local.children}
        {local.icon && local.iconPosition === 'right' && local.icon}
      </>
    )
  }

  return (
    <ButtonPrimitive.Root
      ref={setButtonElement}
      class={classNames(
        buttonVariants({
          variant: local.variant,
          size: local.size,
          loading: local.loading ?? isConfirming(),
        }),
        local.class,
      )}
      disabled={local.disabled ?? local.loading ?? isConfirming()}
      onClick={handleClick}
      onMouseDown={handleRipple}
      {...others}
    >
      {buttonContent()}

      {/* Ripple effects */}
      <Show when={local.ripple && !prefersReducedMotion()}>
        <Show when={typeof window !== 'undefined'}>
          <Portal>
            <For each={ripples()}>
              {(ripple) => (
                <span
                  class="absolute pointer-events-none rounded-full bg-current opacity-30 animate-ping"
                  style={{
                    left: `${ripple.x}px`,
                    top: `${ripple.y}px`,
                    width: `${ripple.size}px`,
                    height: `${ripple.size}px`,
                    'background-color': local.rippleColor ?? 'currentColor',
                  }}
                />
              )}
            </For>
          </Portal>
        </Show>
      </Show>
    </ButtonPrimitive.Root>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
