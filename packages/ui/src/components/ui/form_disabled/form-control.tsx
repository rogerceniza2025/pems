import type { JSX } from 'solid-js'
import { Show, splitProps } from 'solid-js'

import { cn } from '../../../lib/utils'
import type { ValidationState } from '../input'
import type { FormControlProps } from './form.types'

/**
 * FormControl component that wraps form inputs with validation styling
 */
export const FormControl = (props: FormControlProps) => {
  const [local, others] = splitProps(props, [
    'validationState',
    'class',
    'children',
  ])

  const getValidationClasses = () => {
    switch (local.validationState) {
      case 'error':
        return 'border-destructive focus-visible:ring-destructive'
      case 'warning':
        return 'border-yellow-500 focus-visible:ring-yellow-500'
      case 'success':
        return 'border-green-500 focus-visible:ring-green-500'
      case 'none':
      default:
        return 'border-input'
    }
  }

  return (
    <div
      class={cn(
        'relative w-full',
        getValidationClasses(),
        local.class,
      )}
      data-validation-state={local.validationState || 'none'}
      {...others}
    >
      {local.children}
    </div>
  )
}

/**
 * FormControlGroup for grouping multiple form controls
 */
export const FormControlGroup = (props: {
  class?: string
  orientation?: 'horizontal' | 'vertical'
  spacing?: 'compact' | 'normal' | 'relaxed'
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'orientation',
    'spacing',
    'children',
  ])

  const orientationClasses = {
    horizontal: 'flex flex-row items-center gap-4',
    vertical: 'flex flex-col space-y-4',
  }

  const spacingClasses = {
    compact: 'gap-2',
    normal: 'gap-4',
    relaxed: 'gap-6',
  }

  return (
    <div
      class={cn(
        orientationClasses[local.orientation || 'vertical'],
        local.orientation === 'horizontal' && spacingClasses[local.spacing || 'normal'],
        local.class,
      )}
      {...others}
    >
      {local.children}
    </div>
  )
}

/**
 * FormControlWithAddon for controls with left or right addons
 */
export const FormControlWithAddon = (props: {
  class?: string
  leftAddon?: JSX.Element
  rightAddon?: JSX.Element
  validationState?: ValidationState
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'leftAddon',
    'rightAddon',
    'validationState',
    'children',
  ])

  const hasLeftAddon = !!local.leftAddon
  const hasRightAddon = !!local.rightAddon
  const hasBothAddons = hasLeftAddon && hasRightAddon

  const getValidationClasses = () => {
    switch (local.validationState) {
      case 'error':
        return 'border-destructive focus-visible:ring-destructive'
      case 'warning':
        return 'border-yellow-500 focus-visible:ring-yellow-500'
      case 'success':
        return 'border-green-500 focus-visible:ring-green-500'
      case 'none':
      default:
        return 'border-input'
    }
  }

  const getInputPaddingClasses = () => {
    if (hasBothAddons) return 'px-10'
    if (hasLeftAddon) return 'pl-10'
    if (hasRightAddon) return 'pr-10'
    return ''
  }

  return (
    <div class={cn('relative w-full', local.class)} {...others}>
      {/* Left Addon */}
      <Show when={local.leftAddon}>
        <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground z-10">
          {local.leftAddon}
        </div>
      </Show>

      {/* Form Control */}
      <FormControl validationState={local.validationState}>
        <div class={cn(
          getValidationClasses(),
          getInputPaddingClasses(),
          'relative w-full'
        )}>
          {local.children}
        </div>
      </FormControl>

      {/* Right Addon */}
      <Show when={local.rightAddon}>
        <div class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground z-10">
          {local.rightAddon}
        </div>
      </Show>
    </div>
  )
}

/**
 * FormControlWithIcon for controls with icons
 */
export const FormControlWithIcon = (props: {
  class?: string
  icon?: JSX.Element
  iconPosition?: 'left' | 'right'
  validationState?: ValidationState
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'icon',
    'iconPosition',
    'validationState',
    'children',
  ])

  const iconPosition = local.iconPosition || 'left'
  const hasIcon = !!local.icon

  const getValidationClasses = () => {
    switch (local.validationState) {
      case 'error':
        return 'border-destructive focus-visible:ring-destructive'
      case 'warning':
        return 'border-yellow-500 focus-visible:ring-yellow-500'
      case 'success':
        return 'border-green-500 focus-visible:ring-green-500'
      case 'none':
      default:
        return 'border-input'
    }
  }

  const getInputPaddingClasses = () => {
    if (!hasIcon) return ''
    return iconPosition === 'left' ? 'pl-10' : 'pr-10'
  }

  return (
    <div class={cn('relative w-full', local.class)} {...others}>
      {/* Icon */}
      <Show when={local.icon}>
        <div
          class={cn(
            'absolute top-1/2 transform -translate-y-1/2 text-muted-foreground z-10',
            iconPosition === 'left' ? 'left-3' : 'right-3'
          )}
        >
          {local.icon}
        </div>
      </Show>

      {/* Form Control */}
      <FormControl validationState={local.validationState}>
        <div class={cn(
          getValidationClasses(),
          getInputPaddingClasses(),
          'relative w-full'
        )}>
          {local.children}
        </div>
      </FormControl>
    </div>
  )
}

/**
 * FormControlWithValidation for controls with built-in validation indicators
 */
export const FormControlWithValidation = (props: {
  class?: string
  validationState?: ValidationState
  validationMessage?: string
  showValidationIcon?: boolean
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'validationState',
    'validationMessage',
    'showValidationIcon',
    'children',
  ])

  const getValidationClasses = () => {
    switch (local.validationState) {
      case 'error':
        return 'border-destructive focus-visible:ring-destructive'
      case 'warning':
        return 'border-yellow-500 focus-visible:ring-yellow-500'
      case 'success':
        return 'border-green-500 focus-visible:ring-green-500'
      case 'none':
      default:
        return 'border-input'
    }
  }

  const getValidationIcon = () => {
    if (!local.showValidationIcon) return null

    switch (local.validationState) {
      case 'success':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-green-600"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )
      case 'error':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-destructive"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )
      case 'warning':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-yellow-600"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )
      default:
        return null
    }
  }

  const shouldShowValidation = local.validationState &&
    local.validationState !== 'none' &&
    (local.validationMessage || local.showValidationIcon)

  return (
    <div class={cn('relative w-full', local.class)} {...others}>
      {/* Form Control */}
      <FormControl validationState={local.validationState}>
        <div class={cn(
          getValidationClasses(),
          shouldShowValidation ? 'pr-10' : '',
          'relative w-full'
        )}>
          {local.children}
        </div>
      </FormControl>

      {/* Validation Indicator */}
      {shouldShowValidation && (
        <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
          {getValidationIcon()}
        </div>
      )}
    </div>
  )
}

/**
 * FormControlLoading for controls with loading states
 */
export const FormControlLoading = (props: {
  class?: string
  loading?: boolean
  loadingText?: string
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'loading',
    'loadingText',
    'children',
  ])

  return (
    <div class={cn('relative w-full', local.class)} {...others}>
      {/* Loading Overlay */}
      <Show when={local.loading}>
        <div class="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="animate-spin"
            >
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            {local.loadingText || 'Loading...'}
          </div>
        </div>
      </Show>

      {/* Form Control */}
      <FormControl>
        <div class={cn(
          'relative w-full',
          local.loading && 'opacity-50 pointer-events-none'
        )}>
          {local.children}
        </div>
      </FormControl>
    </div>
  )
}

/**
 * FormControlHelper for wrapping controls with helper functionality
 */
export const FormControlHelper = (props: {
  class?: string
  helper?: JSX.Element
  action?: JSX.Element
  validationState?: ValidationState
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'helper',
    'action',
    'validationState',
    'children',
  ])

  return (
    <div class={cn('space-y-2', local.class)} {...others}>
      {/* Form Control */}
      <FormControl validationState={local.validationState}>
        {local.children}
      </FormControl>

      {/* Helper and Action */}
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm text-muted-foreground">
          {local.helper}
        </div>
        <div class="flex-shrink-0">
          {local.action}
        </div>
      </div>
    </div>
  )
}