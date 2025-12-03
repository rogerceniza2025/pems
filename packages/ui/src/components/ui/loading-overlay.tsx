import type { JSX } from 'solid-js'
import { Show, splitProps } from 'solid-js'
import { Portal } from 'solid-js/web'

import { useReducedMotion } from '../../lib/animations'
import { cn } from '../../lib/utils'
import { Skeleton } from './skeleton'
// Loading spinner component defined locally since it's not exported from button
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
      class={cn('animate-spin', sizeClasses[props.size ?? 'md'], props.class)}
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

export type LoadingVariant =
  | 'spinner'
  | 'dots'
  | 'pulse'
  | 'skeleton'
  | 'progress'
  | 'shimmer'
export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl'
export type LoadingPosition = 'center' | 'top' | 'bottom'

interface LoadingOverlayProps {
  class?: string
  loading?: boolean
  variant?: LoadingVariant
  size?: LoadingSize
  position?: LoadingPosition
  text?: string
  progress?: number
  blur?: boolean
  opacity?: number
  children?: JSX.Element
  backdrop?: boolean
  spinnerColor?: string
}

const LoadingOverlay = (props: LoadingOverlayProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'loading',
    'variant',
    'size',
    'position',
    'text',
    'progress',
    'blur',
    'opacity',
    'children',
    'backdrop',
    'spinnerColor',
  ])

  const prefersReducedMotion = useReducedMotion()

  const getPositionClasses = () => {
    switch (local.position) {
      case 'top':
        return 'items-start justify-center pt-8'
      case 'bottom':
        return 'items-end justify-center pb-8'
      case 'center':
      default:
        return 'items-center justify-center'
    }
  }

  const getSizeClasses = () => {
    switch (local.size) {
      case 'sm':
        return 'h-16 w-16'
      case 'md':
        return 'h-20 w-20'
      case 'lg':
        return 'h-24 w-24'
      case 'xl':
        return 'h-32 w-32'
      default:
        return 'h-20 w-20'
    }
  }

  const getVariantContent = () => {
    switch (local.variant) {
      case 'dots':
        return (
          <div class="flex space-x-1">
            <div
              class="w-2 h-2 bg-current rounded-full animate-bounce"
              style={{ 'animation-delay': '0ms' }}
            />
            <div
              class="w-2 h-2 bg-current rounded-full animate-bounce"
              style={{ 'animation-delay': '150ms' }}
            />
            <div
              class="w-2 h-2 bg-current rounded-full animate-bounce"
              style={{ 'animation-delay': '300ms' }}
            />
          </div>
        )
      case 'pulse':
        return <div class="w-8 h-8 bg-current rounded-full animate-pulse" />
      case 'skeleton':
        return (
          <div class="space-y-2">
            <Skeleton class="h-4 w-32" />
            <Skeleton class="h-4 w-24" />
            <Skeleton class="h-4 w-28" />
          </div>
        )
      case 'progress':
        return (
          <div class="w-full max-w-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium">{local.progress ?? 0}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${local.progress ?? 0}%` }}
              />
            </div>
          </div>
        )
      case 'shimmer':
        return (
          <div class="space-y-3">
            <div class="h-4 bg-gray-200 rounded animate-pulse" />
            <div class="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div class="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
          </div>
        )
      case 'spinner':
      default:
        return (
          <LoadingSpinner
            size={
              local.size === 'sm'
                ? 'sm'
                : local.size === 'lg' || local.size === 'xl'
                  ? 'lg'
                  : 'md'
            }
            class={local.spinnerColor ? `text-${local.spinnerColor}` : ''}
          />
        )
    }
  }

  return (
    <Portal>
      <Show when={local.loading}>
        <div
          class={cn(
            'fixed inset-0 z-50 flex',
            getPositionClasses(),
            local.backdrop && 'bg-black/20',
            local.blur && 'backdrop-blur-sm',
            !prefersReducedMotion() && 'transition-all duration-200',
            local.class,
          )}
          style={{
            opacity: local.opacity ?? 0.8,
            'backdrop-filter': local.blur ? 'blur(4px)' : undefined,
          }}
          {...others}
        >
          <div
            class={cn(
              'bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6',
              getSizeClasses(),
            )}
          >
            {getVariantContent()}

            {/* Loading text */}
            <Show when={local.text}>
              <p class="mt-4 text-sm text-gray-600 dark:text-gray-300 text-center">
                {local.text}
              </p>
            </Show>
          </div>
        </div>
      </Show>

      {/* Show children when not loading */}
      <Show when={!local.loading}>{local.children}</Show>
    </Portal>
  )
}

// Loading states for different component types
const ComponentLoadingStates = {
  // Button loading states
  button: {
    spinner: <LoadingSpinner size="sm" />,
    dots: (
      <div class="flex space-x-1">
        <div class="w-1 h-1 bg-current rounded-full animate-bounce" />
        <div
          class="w-1 h-1 bg-current rounded-full animate-bounce"
          style={{ 'animation-delay': '100ms' }}
        />
        <div
          class="w-1 h-1 bg-current rounded-full animate-bounce"
          style={{ 'animation-delay': '200ms' }}
        />
      </div>
    ),
    pulse: <div class="w-4 h-4 bg-current rounded-full animate-pulse" />,
    skeleton: (
      <div class="w-4 h-4 bg-current opacity-20 animate-pulse rounded" />
    ),
  },

  // Input loading states
  input: {
    spinner: <LoadingSpinner size="sm" class="text-gray-400" />,
    dots: (
      <div class="flex space-x-1">
        <div class="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
        <div
          class="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
          style={{ 'animation-delay': '100ms' }}
        />
        <div
          class="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
          style={{ 'animation-delay': '200ms' }}
        />
      </div>
    ),
    pulse: <div class="w-3 h-3 bg-gray-400 rounded-full animate-pulse" />,
    skeleton: <Skeleton class="h-4 w-4" />,
  },

  // Card loading states
  card: {
    header: (
      <div class="space-y-2">
        <Skeleton class="h-6 w-24" />
        <Skeleton class="h-4 w-32" />
      </div>
    ),
    content: (
      <div class="space-y-3">
        <Skeleton class="h-4 w-full" />
        <Skeleton class="h-4 w-3/4" />
        <Skeleton class="h-4 w-5/6" />
        <Skeleton class="h-4 w-full" />
      </div>
    ),
    footer: (
      <div class="flex space-x-2">
        <Skeleton class="h-8 w-16" />
        <Skeleton class="h-8 w-20" />
      </div>
    ),
  },

  // Table loading states
  table: {
    row: (
      <tr>
        <td class="p-2">
          <Skeleton class="h-4 w-full" />
        </td>
        <td class="p-2">
          <Skeleton class="h-4 w-full" />
        </td>
        <td class="p-2">
          <Skeleton class="h-4 w-full" />
        </td>
      </tr>
    ),
    header: (
      <tr>
        <th class="p-2">
          <Skeleton class="h-6 w-20" />
        </th>
        <th class="p-2">
          <Skeleton class="h-6 w-24" />
        </th>
        <th class="p-2">
          <Skeleton class="h-6 w-16" />
        </th>
      </tr>
    ),
  },

  // List loading states
  list: {
    item: (
      <div class="flex items-center space-x-3 p-3">
        <Skeleton class="h-8 w-8 rounded-full" />
        <div class="flex-1 space-y-2">
          <Skeleton class="h-4 w-3/4" />
          <Skeleton class="h-3 w-1/2" />
        </div>
      </div>
    ),
  },
}

// Loading provider for global loading state management
interface LoadingProviderProps {
  children?: JSX.Element
  globalLoading?: boolean
  loadingText?: string
}

const LoadingProvider = (props: LoadingProviderProps) => {
  const [local] = splitProps(props, [
    'children',
    'globalLoading',
    'loadingText',
  ])

  return (
    <>
      {local.children}
      <Show when={local.globalLoading}>
        <LoadingOverlay
          loading={true}
          variant="spinner"
          size="lg"
          text={local.loadingText}
          backdrop={true}
          blur={true}
        />
      </Show>
    </>
  )
}

export { ComponentLoadingStates, LoadingOverlay, LoadingProvider }
export type { LoadingOverlayProps, LoadingProviderProps }
