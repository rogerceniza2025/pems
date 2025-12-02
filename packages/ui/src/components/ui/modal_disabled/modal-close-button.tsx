import type { JSX, ValidComponent } from 'solid-js'
import { Show, splitProps } from 'solid-js'

import * as DialogPrimitive from '@kobalte/core/dialog'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'

import { cn } from '../../../lib/utils'

export type ModalCloseButtonProps<T extends ValidComponent = 'button'> = PolymorphicProps<T, {
  class?: string
  variant?: 'ghost' | 'outline' | 'solid'
  size?: 'sm' | 'md' | 'lg'
  icon?: JSX.Element
  label?: string
}>

const ModalCloseButton = <T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, ModalCloseButtonProps<T>>,
) => {
  const [local, others] = splitProps(props as ModalCloseButtonProps, [
    'class',
    'variant',
    'size',
    'icon',
    'label',
  ])

  const getButtonClasses = () => {
    const baseClasses = 'rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none'
    
    const sizeClasses = {
      sm: 'h-6 w-6',
      md: 'h-8 w-8',
      lg: 'h-10 w-10',
    }

    const variantClasses = {
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
      solid: 'bg-primary text-primary-foreground hover:bg-primary/90',
    }

    return cn(
      baseClasses,
      sizeClasses[local.size ?? 'md'],
      variantClasses[local.variant ?? 'ghost'],
      'absolute right-4 top-4',
      local.class,
    )
  }

  return (
    <DialogPrimitive.CloseButton
      class={getButtonClasses()}
      aria-label={local.label ?? 'Close'}
      {...others}
    >
      <Show when={local.icon} fallback={
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      }>
        {local.icon}
      </Show>
    </DialogPrimitive.CloseButton>
  )
}

export { ModalCloseButton }

