import type { JSX } from 'solid-js'
import { Show, splitProps } from 'solid-js'

import { cn } from '../../../lib/utils'
import type { FormErrorProps } from './form.types'

/**
 * Default error icon
 */
const ErrorIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="flex-shrink-0"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

/**
 * FormError component for displaying validation error messages
 */
export const FormError = (props: FormErrorProps) => {
  const [local, others] = splitProps(props, [
    'field',
    'errors',
    'error',
    'class',
    'icon',
    'showInline',
  ])

  // Determine which error message to display
  const errorMessage = () => {
    if (local.error) return local.error
    if (local.errors && local.errors.length > 0) {
      return local.errors[0]
    }
    return null
  }

  const hasError = () => !!errorMessage()

  // Only render if there's an error
  if (!hasError()) {
    return null
  }

  return (
    <div
      class={cn(
        'text-sm text-destructive flex items-start gap-2',
        !local.showInline && 'mt-1',
        local.class,
      )}
      role="alert"
      aria-live="polite"
      {...others}
    >
      {/* Error Icon */}
      <Show when={local.icon !== false}>
        {local.icon || <ErrorIcon />}
      </Show>

      {/* Error Message */}
      <span class="break-words">
        {errorMessage()}
      </span>
    </div>
  )
}

/**
 * FormErrorList for displaying multiple error messages
 */
export const FormErrorList = (props: {
  errors?: string[]
  class?: string
  title?: string
  maxItems?: number
}) => {
  const [local, others] = splitProps(props, [
    'errors',
    'class',
    'title',
    'maxItems',
  ])

  if (!local.errors || local.errors.length === 0) {
    return null
  }

  const displayErrors = () => {
    const errors = local.errors!
    if (local.maxItems && errors.length > local.maxItems) {
      return errors.slice(0, local.maxItems)
    }
    return errors
  }

  const hasMoreErrors = () => {
    return local.maxItems && local.errors && local.errors.length > local.maxItems
  }

  const remainingCount = () => {
    if (!local.errors || !local.maxItems) return 0
    return Math.max(0, local.errors.length - local.maxItems)
  }

  return (
    <div
      class={cn('space-y-1', local.class)}
      role="alert"
      aria-live="polite"
      {...others}
    >
      <Show when={local.title}>
        <h4 class="text-sm font-medium text-destructive">{local.title}</h4>
      </Show>

      <ul class="text-sm text-destructive space-y-1">
        {displayErrors().map((error, index) => (
          <li key={index} class="flex items-start gap-2">
            <ErrorIcon />
            <span class="break-words">{error}</span>
          </li>
        ))}
      </ul>

      <Show when={hasMoreErrors()}>
        <p class="text-xs text-destructive/70">
          ... and {remainingCount()} more error{remainingCount() !== 1 ? 's' : ''}
        </p>
      </Show>
    </div>
  )
}

/**
 * FormErrorSummary for displaying a summary of all form errors
 */
export const FormErrorSummary = (props: {
  errors?: Record<string, string[] | string>
  class?: string
  title?: string
  showFieldNames?: boolean
}) => {
  const [local, others] = splitProps(props, [
    'errors',
    'class',
    'title',
    'showFieldNames',
  ])

  const errorEntries = () => {
    if (!local.errors) return []
    return Object.entries(local.errors).map(([field, messages]) => ({
      field,
      message: Array.isArray(messages) ? messages[0] : messages,
    }))
  }

  const hasErrors = () => errorEntries().length > 0

  if (!hasErrors()) {
    return null
  }

  return (
    <div
      class={cn(
        'p-4 border border-destructive/20 rounded-lg bg-destructive/5 space-y-2',
        local.class,
      )}
      role="alert"
      aria-live="polite"
      {...others}
    >
      <h3 class="text-sm font-medium text-destructive">
        {local.title || 'Please fix the following errors:'}
      </h3>

      <ul class="text-sm text-destructive space-y-1">
        {errorEntries().map(({ field, message }) => (
          <li key={field}>
            {local.showFieldNames && (
              <strong>{field}: </strong>
            )}
            {message}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * InlineFormError for inline error display
 */
export const InlineFormError = (props: {
  error?: string
  class?: string
  icon?: JSX.Element
}) => {
  const [local, others] = splitProps(props, ['error', 'class', 'icon'])

  if (!local.error) {
    return null
  }

  return (
    <span
      class={cn(
        'inline-flex items-center gap-1 text-xs text-destructive',
        local.class,
      )}
      role="alert"
      {...others}
    >
      <Show when={local.icon !== false}>
        {local.icon || <ErrorIcon />}
      </Show>
      {local.error}
    </span>
  )
}

/**
 * FormErrorToast for toast-style error notifications
 */
export const FormErrorToast = (props: {
  error?: string
  title?: string
  dismissible?: boolean
  onDismiss?: () => void
  class?: string
}) => {
  const [local, others] = splitProps(props, [
    'error',
    'title',
    'dismissible',
    'onDismiss',
    'class',
  ])

  if (!local.error) {
    return null
  }

  return (
    <div
      class={cn(
        'p-3 bg-destructive text-destructive-foreground rounded-lg shadow-lg space-y-2',
        local.class,
      )}
      role="alert"
      {...others}
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-2 flex-1">
          <ErrorIcon />
          <div class="space-y-1">
            {local.title && (
              <h4 class="font-medium">{local.title}</h4>
            )}
            <p class="text-sm">{local.error}</p>
          </div>
        </div>

        {local.dismissible && local.onDismiss && (
          <button
            type="button"
            onClick={local.onDismiss}
            class="text-destructive-foreground/70 hover:text-destructive-foreground"
            aria-label="Dismiss error"
          >
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
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}