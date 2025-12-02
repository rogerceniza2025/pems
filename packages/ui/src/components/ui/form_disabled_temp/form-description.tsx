import type { JSX } from 'solid-js'
import { Show, splitProps } from 'solid-js'

import { cn } from '../../../lib/utils'
import type { FormDescriptionProps } from './form.types'

/**
 * FormDescription component for displaying field help text
 */
export const FormDescription = (props: FormDescriptionProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <p
      class={cn('text-sm text-muted-foreground', local.class)}
      id={`${others.id ?? 'field'}-description`}
      {...others}
    >
      {local.children}
    </p>
  )
}

/**
 * FormHint for additional hint information
 */
export const FormHint = (props: {
  class?: string
  type?: 'info' | 'warning' | 'success'
  icon?: JSX.Element
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'type',
    'icon',
    'children',
  ])

  const typeClasses = {
    info: 'text-blue-600',
    warning: 'text-yellow-600',
    success: 'text-green-600',
  }

  const defaultIcons = {
    info: () => (
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
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    warning: () => (
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
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    success: () => (
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
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  }

  const iconType = local.type ?? 'info'
  const defaultIcon = defaultIcons[iconType]

  return (
    <div
      class={cn(
        'text-xs flex items-start gap-1.5',
        typeClasses[iconType],
        local.class,
      )}
      {...others}
    >
      <Show when={local.icon !== false}>
        <span class="flex-shrink-0 mt-0.5">{local.icon ?? defaultIcon()}</span>
      </Show>
      <span class="break-words">{local.children}</span>
    </div>
  )
}

/**
 * FormExample for showing example input formats
 */
export const FormExample = (props: {
  class?: string
  title?: string
  code?: boolean
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'title',
    'code',
    'children',
  ])

  return (
    <div
      class={cn(
        'text-xs text-muted-foreground border-l-2 border-muted pl-3 py-1 bg-muted/30 rounded-r',
        local.class,
      )}
      {...others}
    >
      {local.title && (
        <span class="font-medium block mb-1">{local.title}:</span>
      )}
      <code
        class={cn(
          'bg-background px-1 py-0.5 rounded',
          local.code && 'font-mono',
        )}
      >
        {local.children}
      </code>
    </div>
  )
}

/**
 * FormLink for providing additional links in form descriptions
 */
export const FormLink = (props: {
  class?: string
  href?: string
  onClick?: () => void
  children: JSX.Element
  external?: boolean
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'href',
    'onClick',
    'children',
    'external',
  ])

  const baseClasses =
    'text-xs text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors'

  return (
    <Show
      when={local.href}
      fallback={
        <button
          type="button"
          class={cn(baseClasses, local.class)}
          onClick={local.onClick}
          {...others}
        >
          {local.children}
        </button>
      }
    >
      <a
        href={local.href!}
        class={cn(baseClasses, local.class)}
        target={local.external ? '_blank' : undefined}
        rel={local.external ? 'noopener noreferrer' : undefined}
        {...others}
      >
        {local.children}
        {local.external && (
          <span class="ml-1 inline-block">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15,3 21,3 21,9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </span>
        )}
      </a>
    </Show>
  )
}

/**
 * FormRichDescription for rich text descriptions with formatting
 */
export const FormRichDescription = (props: {
  class?: string
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <div
      class={cn('text-sm text-muted-foreground space-y-1', local.class)}
      {...others}
    >
      {local.children}
    </div>
  )
}

/**
 * FormDescriptionWithIcon for descriptions with icons
 */
export const FormDescriptionWithIcon = (props: {
  class?: string
  icon?: JSX.Element
  iconPosition?: 'left' | 'right'
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'icon',
    'iconPosition',
    'children',
  ])

  const iconPosition = local.iconPosition ?? 'left'

  return (
    <div
      class={cn(
        'text-sm text-muted-foreground flex items-start gap-2',
        iconPosition === 'right' && 'flex-row-reverse',
        local.class,
      )}
      {...others}
    >
      <Show when={local.icon}>
        <span class="flex-shrink-0 mt-0.5 text-muted-foreground/70">
          {local.icon}
        </span>
      </Show>
      <span class="break-words">{local.children}</span>
    </div>
  )
}

/**
 * FormDescriptionGroup for grouping multiple descriptions
 */
export const FormDescriptionGroup = (props: {
  class?: string
  spacing?: 'compact' | 'normal' | 'relaxed'
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, ['class', 'spacing', 'children'])

  const spacingClasses = {
    compact: 'space-y-1',
    normal: 'space-y-2',
    relaxed: 'space-y-3',
  }

  return (
    <div
      class={cn(
        'space-y-2',
        spacingClasses[local.spacing ?? 'normal'],
        local.class,
      )}
      {...others}
    >
      {local.children}
    </div>
  )
}

/**
 * FormCharacterCount for displaying character count information
 */
export const FormCharacterCount = (props: {
  current: number
  max?: number
  min?: number
  class?: string
  showProgress?: boolean
}) => {
  const [local, others] = splitProps(props, [
    'current',
    'max',
    'min',
    'class',
    'showProgress',
  ])

  const percentage = () => {
    if (!local.max) return 0
    return Math.min((local.current / local.max) * 100, 100)
  }

  const isNearLimit = () => local.max && local.current >= local.max * 0.9
  const isOverLimit = () => local.max && local.current > local.max
  const isBelowMin = () => local.min && local.current < local.min

  const getStatusColor = () => {
    if (isOverLimit() || isBelowMin()) return 'text-destructive'
    if (isNearLimit()) return 'text-yellow-600'
    return 'text-muted-foreground'
  }

  const getProgressColor = () => {
    if (isOverLimit() || isBelowMin()) return 'bg-destructive'
    if (isNearLimit()) return 'bg-yellow-600'
    return 'bg-green-600'
  }

  return (
    <div class={cn('space-y-1', local.class)} {...others}>
      {/* Character Count Text */}
      <div class={cn('text-xs', getStatusColor())}>
        {local.current}
        {local.max && ` / ${local.max}`}
        {local.min && ` (min: ${local.min})`}
        {local.max && <span class="ml-1">({Math.round(percentage())}%)</span>}
      </div>

      {/* Progress Bar */}
      {local.showProgress && local.max && (
        <div class="w-full bg-muted rounded-full h-1">
          <div
            class={cn(
              'h-1 rounded-full transition-all duration-200 ease-in-out',
              getProgressColor(),
            )}
            style={{ width: `${percentage()}%` }}
            role="progressbar"
            aria-valuenow={local.current}
            aria-valuemin={local.min ?? 0}
            aria-valuemax={local.max}
          />
        </div>
      )}
    </div>
  )
}

/**
 * FormPasswordStrength for displaying password strength information
 */
export const FormPasswordStrength = (props: {
  strength: 'weak' | 'fair' | 'good' | 'strong'
  class?: string
  showLabel?: boolean
}) => {
  const [local, others] = splitProps(props, ['strength', 'class', 'showLabel'])

  const strengthConfig = {
    weak: { color: 'bg-red-500', width: 'w-1/4', text: 'Weak' },
    fair: { color: 'bg-yellow-500', width: 'w-2/4', text: 'Fair' },
    good: { color: 'bg-blue-500', width: 'w-3/4', text: 'Good' },
    strong: { color: 'bg-green-500', width: 'w-full', text: 'Strong' },
  }

  const config = strengthConfig[local.strength]

  return (
    <div class={cn('space-y-1', local.class)} {...others}>
      {/* Strength Bar */}
      <div class="flex space-x-1">
        <div class="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            class={cn(
              'h-full transition-all duration-300',
              config.color,
              config.width,
            )}
          />
        </div>
      </div>

      {/* Strength Label */}
      {local.showLabel && (
        <div
          class={cn(
            'text-xs',
            local.strength === 'weak' && 'text-red-500',
            local.strength === 'fair' && 'text-yellow-600',
            local.strength === 'good' && 'text-blue-600',
            local.strength === 'strong' && 'text-green-600',
          )}
        >
          Password strength: {config.text}
        </div>
      )}
    </div>
  )
}
