import type { JSX } from 'solid-js'
import { Show, splitProps } from 'solid-js'

import { cn } from '../../../lib/utils'
import type { FormMessageProps, FormMessageType } from './form.types'

/**
 * Message type icons
 */
const MessageIcons = {
  error: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
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
  ),
  warning: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="flex-shrink-0"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  success: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="flex-shrink-0"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  info: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="flex-shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
}

/**
 * Message type color classes
 */
const messageColorClasses = {
  error: 'text-destructive',
  warning: 'text-yellow-600',
  success: 'text-green-600',
  info: 'text-blue-600',
}

/**
 * FormMessage component for displaying various types of form messages
 */
export const FormMessage = (props: FormMessageProps) => {
  const [local, others] = splitProps(props, [
    'type',
    'class',
    'icon',
    'children',
  ])

  const defaultMessageIcon = () => {
    if (local.icon) return local.icon
    if (local.type && MessageIcons[local.type]) {
      const IconComponent = MessageIcons[local.type]
      return <IconComponent />
    }
    return null
  }

  const textColorClass = () => {
    return local.type ? messageColorClasses[local.type] : 'text-muted-foreground'
  }

  return (
    <div
      class={cn(
        'text-sm flex items-start gap-2',
        textColorClass(),
        local.class,
      )}
      role={local.type === 'error' ? 'alert' : 'status'}
      aria-live={local.type === 'error' ? 'polite' : 'polite'}
      {...others}
    >
      <Show when={defaultMessageIcon()}>
        {defaultMessageIcon()}
      </Show>

      <span class="break-words">
        {local.children}
      </span>
    </div>
  )
}

/**
 * FormSuccessMessage for success messages
 */
export const FormSuccessMessage = (props: {
  class?: string
  icon?: JSX.Element
  children: JSX.Element
}) => {
  return (
    <FormMessage
      type="success"
      class={props.class}
      icon={props.icon}
    >
      {props.children}
    </FormMessage>
  )
}

/**
 * FormWarningMessage for warning messages
 */
export const FormWarningMessage = (props: {
  class?: string
  icon?: JSX.Element
  children: JSX.Element
}) => {
  return (
    <FormMessage
      type="warning"
      class={props.class}
      icon={props.icon}
    >
      {props.children}
    </FormMessage>
  )
}

/**
 * FormInfoMessage for informational messages
 */
export const FormInfoMessage = (props: {
  class?: string
  icon?: JSX.Element
  children: JSX.Element
}) => {
  return (
    <FormMessage
      type="info"
      class={props.class}
      icon={props.icon}
    >
      {props.children}
    </FormMessage>
  )
}

/**
 * FormMessageCard for card-style messages
 */
export const FormMessageCard = (props: {
  type?: FormMessageType
  title?: string
  class?: string
  icon?: JSX.Element
  children: JSX.Element
  dismissible?: boolean
  onDismiss?: () => void
}) => {
  const [local, others] = splitProps(props, [
    'type',
    'title',
    'class',
    'icon',
    'children',
    'dismissible',
    'onDismiss',
  ])

  const messageType = local.type || 'info'
  const defaultIcon = MessageIcons[messageType]

  const cardColorClasses = {
    error: 'border-destructive/20 bg-destructive/5 text-destructive',
    warning: 'border-yellow-600/20 bg-yellow-50 text-yellow-800',
    success: 'border-green-600/20 bg-green-50 text-green-800',
    info: 'border-blue-600/20 bg-blue-50 text-blue-800',
  }

  return (
    <div
      class={cn(
        'p-4 rounded-lg border space-y-2',
        cardColorClasses[messageType],
        local.class,
      )}
      role={messageType === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      {...others}
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3 flex-1">
          <div class="flex-shrink-0 mt-0.5">
            {local.icon || defaultIcon()}
          </div>
          <div class="space-y-1">
            {local.title && (
              <h4 class="font-medium">{local.title}</h4>
            )}
            <div class="text-sm">
              {local.children}
            </div>
          </div>
        </div>

        {local.dismissible && local.onDismiss && (
          <button
            type="button"
            onClick={local.onDismiss}
            class="text-current/70 hover:text-current transition-colors"
            aria-label="Dismiss message"
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

/**
 * FormMessageBanner for banner-style messages
 */
export const FormMessageBanner = (props: {
  type?: FormMessageType
  class?: string
  icon?: JSX.Element
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, ['type', 'class', 'icon', 'children'])

  const messageType = local.type || 'info'
  const defaultIcon = MessageIcons[messageType]

  const bannerColorClasses = {
    error: 'bg-destructive text-destructive-foreground',
    warning: 'bg-yellow-600 text-white',
    success: 'bg-green-600 text-white',
    info: 'bg-blue-600 text-white',
  }

  return (
    <div
      class={cn(
        'p-3 rounded-md flex items-center gap-3',
        bannerColorClasses[messageType],
        local.class,
      )}
      role={messageType === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      {...others}
    >
      <div class="flex-shrink-0">
        {local.icon || defaultIcon()}
      </div>
      <div class="text-sm flex-1">
        {local.children}
      </div>
    </div>
  )
}

/**
 * FormProgressMessage for progress/status messages
 */
export const FormProgressMessage = (props: {
  progress: number
  total: number
  message?: string
  class?: string
}) => {
  const [local, others] = splitProps(props, ['progress', 'total', 'message', 'class'])

  const percentage = () => Math.round((local.progress / local.total) * 100)
  const isComplete = () => local.progress >= local.total

  return (
    <div
      class={cn(
        'space-y-2',
        local.class,
      )}
      role="status"
      aria-live="polite"
      {...others}
    >
      <div class="flex items-center justify-between text-sm">
        <span>{local.message || 'Processing...'}</span>
        <span class="text-muted-foreground">
          {local.progress} / {local.total} ({percentage()}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div class="w-full bg-secondary rounded-full h-2">
        <div
          class={cn(
            'h-2 rounded-full transition-all duration-300 ease-in-out',
            isComplete() ? 'bg-green-600' : 'bg-primary'
          )}
          style={{ width: `${percentage()}%` }}
          role="progressbar"
          aria-valuenow={local.progress}
          aria-valuemin={0}
          aria-valuemax={local.total}
        />
      </div>

      {isComplete() && (
        <div class="flex items-center gap-2 text-sm text-green-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Complete
        </div>
      )}
    </div>
  )
}