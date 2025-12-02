import type { JSX } from 'solid-js'
import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  Show,
  splitProps,
} from 'solid-js'
import { Portal } from 'solid-js/web'

import { useReducedMotion } from '../../lib/animations'
import { cn } from '../../lib/utils'
import { Button } from './button'

// Toast types and variants
export type ToastType = 'success' | 'error' | 'warning' | 'info'
export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center'
export type ToastAction = {
  label: string
  onClick: () => void
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
}

export interface Toast {
  id: string
  title?: string
  description?: string
  type?: ToastType
  duration?: number
  action?: ToastAction
  icon?: JSX.Element
  dismissible?: boolean
  onDismiss?: () => void
}

// Toast context for managing toasts
interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearAll: () => void
}

const ToastContext = createSignal<ToastContextValue | null>(null)

// Toast provider hook
export const useToast = () => {
  const context = ToastContext[0]
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Toast variants
const toastVariants = {
  base: 'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
  variants: {
    success:
      'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
    error:
      'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
    warning:
      'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
    info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
  },
  positions: {
    'top-right':
      'fixed top-0 right-0 z-[100] flex-col max-w-sm w-full p-4 md:max-w-md',
    'top-left':
      'fixed top-0 left-0 z-[100] flex-col max-w-sm w-full p-4 md:max-w-md',
    'top-center':
      'fixed top-0 left-1/2 transform -translate-x-1/2 z-[100] flex-col max-w-sm w-full p-4 md:max-w-md',
    'bottom-right':
      'fixed bottom-0 right-0 z-[100] flex-col max-w-sm w-full p-4 md:max-w-md',
    'bottom-left':
      'fixed bottom-0 left-0 z-[100] flex-col max-w-sm w-full p-4 md:max-w-md',
    'bottom-center':
      'fixed bottom-0 left-1/2 transform -translate-x-1/2 z-[100] flex-col max-w-sm w-full p-4 md:max-w-md',
  },
}

// Default icons for different toast types
const DefaultIcons = {
  success: (
    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  error: (
    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  warning: (
    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
  ),
  info: (
    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
}

// Individual Toast component
type ToastComponentProps = {
  toast: Toast
  position: ToastPosition
  onRemove: (id: string) => void
}

const ToastComponent = (props: ToastComponentProps) => {
  const [local, others] = splitProps(props, ['toast', 'position', 'onRemove'])
  const [isVisible, setIsVisible] = createSignal(true)
  const prefersReducedMotion = useReducedMotion()

  // Auto-dismiss timer
  createEffect(() => {
    const duration = local.toast.duration ?? 5000
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, duration)

      onCleanup(() => clearTimeout(timer))
    }
  })

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => {
      local.onRemove(local.toast.id)
      local.toast.onDismiss?.()
    }, 300) // Wait for exit animation
  }

  const handleAction = () => {
    local.toast.action?.onClick()
    handleDismiss()
  }

  const getToastClasses = () => {
    return cn(
      toastVariants.base,
      toastVariants.variants[local.toast.type ?? 'info'],
      !prefersReducedMotion() &&
        'animate-in slide-in-from-right-full duration-300',
      isVisible() && 'animate-in slide-in-from-right-full',
      !isVisible() && 'animate-out slide-out-to-right-full',
    )
  }

  return (
    <div
      class={getToastClasses()}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      {...others}
    >
      {/* Icon */}
      <div class="shrink-0">
        {local.toast.icon ?? DefaultIcons[local.toast.type ?? 'info']}
      </div>

      {/* Content */}
      <div class="flex-1 space-y-1">
        <Show when={local.toast.title}>
          <div class="text-sm font-medium">{local.toast.title}</div>
        </Show>
        <Show when={local.toast.description}>
          <div class="text-sm opacity-90">{local.toast.description}</div>
        </Show>
      </div>

      {/* Action button */}
      <Show when={local.toast.action}>
        <Button
          variant="outline"
          size="sm"
          class="ml-auto"
          onClick={handleAction}
        >
          {local.toast.action?.label}
        </Button>
      </Show>

      {/* Close button */}
      <Show when={local.toast.dismissible !== false}>
        <Button
          variant="ghost"
          size="icon"
          class="absolute right-2 top-2 h-6 w-6 rounded-md p-0 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
          onClick={handleDismiss}
          aria-label="Close toast"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M18 6L6 18M6 6l12 12"
            />
          </svg>
        </Button>
      </Show>
    </div>
  )
}

// Toast Provider component
type ToastProviderProps = {
  children?: JSX.Element
  position?: ToastPosition
  maxToasts?: number
}

const ToastProvider = (props: ToastProviderProps) => {
  const [local] = splitProps(props, ['children', 'position', 'maxToasts'])
  const [toasts, setToasts] = createSignal<Toast[]>([])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString()
    const newToast: Toast = { ...toast, id }

    setToasts((prev) => {
      const maxToasts = local.maxToasts ?? 5
      const updated = [...prev, newToast]
      return updated.slice(-maxToasts) // Keep only the most recent toasts
    })

    return id
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const clearAll = () => {
    setToasts([])
  }

  // Set context value
  createEffect(() => {
    ToastContext[1]({
      toasts: toasts(),
      addToast,
      removeToast,
      clearAll,
    })
  })

  onCleanup(() => {
    ToastContext[1](null)
  })

  return (
    <>
      {local.children}

      {/* Toast container */}
      <Portal>
        <div class={toastVariants.positions[local.position ?? 'top-right']}>
          <For each={toasts()}>
            {(toast) => (
              <ToastComponent
                toast={toast}
                position={local.position ?? 'top-right'}
                onRemove={removeToast}
              />
            )}
          </For>
        </div>
      </Portal>
    </>
  )
}

// Toast hook for convenience
export const createToast = () => {
  const context = ToastContext[0]

  if (!context) {
    throw new Error('createToast must be used within a ToastProvider')
  }

  const contextValue = context()

  if (!contextValue) {
    throw new Error('Toast context is not available')
  }

  return {
    success: (options: Omit<Toast, 'type'>) =>
      contextValue.addToast({ ...options, type: 'success' }),
    error: (options: Omit<Toast, 'type'>) =>
      contextValue.addToast({ ...options, type: 'error' }),
    warning: (options: Omit<Toast, 'type'>) =>
      contextValue.addToast({ ...options, type: 'warning' }),
    info: (options: Omit<Toast, 'type'>) =>
      contextValue.addToast({ ...options, type: 'info' }),
    dismiss: (id: string) => contextValue.removeToast(id),
    dismissAll: () => contextValue.clearAll(),
  }
}

export { ToastContext, ToastProvider }
export type { ToastComponentProps, ToastProviderProps }
