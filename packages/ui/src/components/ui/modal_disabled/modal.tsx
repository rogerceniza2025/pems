import type { JSX, ValidComponent } from 'solid-js'
import { createEffect, createSignal, onCleanup, splitProps } from 'solid-js'

import * as DialogPrimitive from '@kobalte/core/dialog'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'

import { useReducedMotion } from '../../../lib/animations'
import { cn } from '../../../lib/utils'

// Modal variants using class-variance-authority
const modalVariants = {
  overlay: {
    base: 'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    animated: 'transition-all duration-200 ease-in-out',
  },
  content: {
    base: 'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
    animated: 'transition-all duration-200 ease-in-out',
    sizes: {
      sm: 'max-w-sm',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-screen h-screen m-0 rounded-none',
    },
    variants: {
      default: 'border-border',
      destructive: 'border-destructive',
      warning: 'border-warning',
      info: 'border-info',
    },
  },
}

export type ModalProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
  preventClose?: boolean
  closeOnEscape?: boolean
  closeOnOutsideClick?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  variant?: 'default' | 'destructive' | 'warning' | 'info'
  centered?: boolean
  scrollable?: boolean
  animated?: boolean
  animationDuration?: number
  class?: string
  children?: JSX.Element
}>

const Modal = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, ModalProps<T>>,
) => {
  const [local, others] = splitProps(props as ModalProps, [
    'open',
    'onOpenChange',
    'modal',
    'preventClose',
    'closeOnEscape',
    'closeOnOutsideClick',
    'size',
    'variant',
    'centered',
    'scrollable',
    'animated',
    'animationDuration',
    'class',
    'children',
  ])

  const prefersReducedMotion = useReducedMotion()
  const [, setHasInteractedOutside] = createSignal(false)

  // Handle escape key
  createEffect(() => {
    if (!local.open || !local.closeOnEscape || local.preventClose) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        local.onOpenChange?.(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    onCleanup(() => document.removeEventListener('keydown', handleEscape))
  })

  // Handle outside click
  createEffect(() => {
    if (!local.open || !local.closeOnOutsideClick || local.preventClose) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      const modalElement = document.querySelector('[data-state="open"]')
      
      if (modalElement && !modalElement.contains(target)) {
        setHasInteractedOutside(true)
        setTimeout(() => {
          local.onOpenChange?.(false)
          setHasInteractedOutside(false)
        }, 0)
      }
    }

    // Add delay to prevent immediate closing on mount
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    onCleanup(() => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    })
  })

  // Prevent body scroll when modal is open
  createEffect(() => {
    if (local.open && local.modal !== false) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    onCleanup(() => {
      document.body.style.overflow = ''
    })
  })

  const getOverlayClasses = () => {
    return cn(
      modalVariants.overlay.base,
      local.animated && !prefersReducedMotion() && modalVariants.overlay.animated,
    )
  }

  const getContentClasses = () => {
    return cn(
      modalVariants.content.base,
      modalVariants.content.sizes[local.size ?? 'md'],
      modalVariants.content.variants[local.variant ?? 'default'],
      local.animated && !prefersReducedMotion() && modalVariants.content.animated,
      local.centered && 'items-center',
      local.scrollable && 'max-h-[90vh] overflow-y-auto',
      local.class,
    )
  }

  const getAnimationDuration = () => {
    if (prefersReducedMotion()) return 0
    return local.animationDuration ?? 200
  }

  return (
    <DialogPrimitive.Root
      open={local.open}
      onOpenChange={local.onOpenChange}
      modal={local.modal}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay class={getOverlayClasses()} />
        <DialogPrimitive.Content
          class={getContentClasses()}
          style={{
            'animation-duration': `${getAnimationDuration()}ms`,
          }}
          {...others}
        >
          {local.children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export { Modal }

