import type { JSX } from 'solid-js'
import { Show, splitProps } from 'solid-js'

import { cn } from '../../../lib/utils'
import { useField } from './form-context'
import type { FormFieldProps } from './form.types'
import { FormDescription } from './form-description'
import { FormError } from './form-error'
import { FormLabel } from './form-label'

/**
 * Enhanced FormField component that integrates with TanStack Form
 */
export const FormField = <T extends Record<string, any>>(props: FormFieldProps<T>) => {
  const [local, others] = splitProps(props, [
    'class',
    'name',
    'label',
    'description',
    'required',
    'disabled',
    'validationState',
    'error',
    'helpText',
    'tooltip',
    'icon',
    'layout',
    'children',
  ])

  const field = useField<T>(local.name)

  // Get field-specific props for children
  const fieldProps = {
    id: field.props.id,
    name: field.props.name,
    value: field.value(),
    onValueChange: field.setValue,
    validationState: local.validationState || field.validationState(),
    error: local.error || field.error(),
    required: local.required,
    disabled: local.disabled,
    'aria-invalid': field.error() ? 'true' : 'false',
    'aria-describedby': field.props['aria-describedby'],
  }

  const isHorizontal = local.layout === 'horizontal'
  const hasError = fieldProps.error || local.error
  const isValid = fieldProps.validationState === 'success'
  const hasIcon = !!local.icon

  return (
    <div
      class={cn(
        'space-y-2',
        isHorizontal && 'grid grid-cols-1 md:grid-cols-3 gap-4 items-start',
        local.class,
      )}
      {...others}
    >
      {/* Label Section */}
      <Show when={local.label}>
        <div class={cn(isHorizontal && 'md:col-span-1')}>
          <FormLabel
            for={fieldProps.id}
            required={local.required}
            validationState={hasError ? 'error' : isValid ? 'success' : 'none'}
            tooltip={local.tooltip}
            icon={local.icon}
          >
            {local.label}
          </FormLabel>
        </div>
      </Show>

      {/* Input/Control Section */}
      <div class={cn(
        'relative',
        isHorizontal && 'md:col-span-2',
        hasIcon && !isHorizontal && 'pl-8'
      )}>
        {/* Icon (left side) */}
        <Show when={hasIcon && !isHorizontal}>
          <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {local.icon}
          </div>
        </Show>

        {/* Render children with field props */}
        {typeof local.children === 'function'
          ? local.children({ ...field, props: fieldProps })
          : local.children
        }
      </div>

      {/* Description Section */}
      <Show when={local.description}>
        <div class={cn(
          isHorizontal && 'md:col-span-1',
          !isHorizontal && 'text-sm text-muted-foreground'
        )}>
          <FormDescription>{local.description}</FormDescription>
        </div>
      </Show>

      {/* Error Message Section */}
      <Show when={hasError}>
        <div class={cn(
          isHorizontal && 'md:col-span-2',
          !isHorizontal && 'mt-1'
        )}>
          <FormError error={fieldProps.error} />
        </div>
      </Show>

      {/* Help Text Section */}
      <Show when={local.helpText && !hasError}>
        <div class={cn(
          'text-sm text-muted-foreground',
          isHorizontal && 'md:col-span-2'
        )}>
          {local.helpText}
        </div>
      </Show>
    </div>
  )
}

/**
 * Simple FormField that doesn't use TanStack Form integration
 * Useful for forms that don't need the full form context
 */
export const SimpleFormField = (props: {
  class?: string
  name: string
  label?: JSX.Element
  description?: JSX.Element
  error?: string
  required?: boolean
  disabled?: boolean
  layout?: 'vertical' | 'horizontal'
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'name',
    'label',
    'description',
    'error',
    'required',
    'disabled',
    'layout',
    'children',
  ])

  const isHorizontal = local.layout === 'horizontal'
  const hasError = !!local.error

  return (
    <div
      class={cn(
        'space-y-2',
        isHorizontal && 'grid grid-cols-1 md:grid-cols-3 gap-4 items-start',
        local.class,
      )}
      {...others}
    >
      {/* Label Section */}
      <Show when={local.label}>
        <div class={cn(isHorizontal && 'md:col-span-1')}>
          <FormLabel
            for={local.name}
            required={local.required}
            validationState={hasError ? 'error' : 'none'}
          >
            {local.label}
          </FormLabel>
        </div>
      </Show>

      {/* Input/Control Section */}
      <div class={cn(isHorizontal && 'md:col-span-2')}>
        {local.children}
      </div>

      {/* Description Section */}
      <Show when={local.description}>
        <div class={cn(
          'text-sm text-muted-foreground',
          isHorizontal && 'md:col-span-1'
        )}>
          {local.description}
        </div>
      </Show>

      {/* Error Message Section */}
      <Show when={hasError}>
        <div class={cn(
          isHorizontal && 'md:col-span-2',
          !isHorizontal && 'mt-1'
        )}>
          <FormError error={local.error} />
        </div>
      </Show>
    </div>
  )
}

/**
 * FormFieldGroup for grouping related fields
 */
export const FormFieldGroup = (props: {
  class?: string
  title?: JSX.Element
  description?: JSX.Element
  required?: boolean
  children: JSX.Element
}) => {
  return (
    <div class={cn('space-y-4 p-4 border rounded-lg bg-background', props.class)}>
      <Show when={props.title || props.description}>
        <div class="space-y-1">
          <Show when={props.title}>
            <h3 class="text-base font-medium leading-none">
              {props.title}
              {props.required && (
                <span class="text-destructive ml-1" aria-label="required">
                  *
                </span>
              )}
            </h3>
          </Show>
          <Show when={props.description}>
            <p class="text-sm text-muted-foreground">{props.description}</p>
          </Show>
        </div>
      </Show>
      <div class="space-y-4">
        {props.children}
      </div>
    </div>
  )
}

/**
 * FormFieldInline for inline field layouts
 */
export const FormFieldInline = <T extends Record<string, any>>(props: {
  class?: string
  name: keyof T
  label?: JSX.Element
  description?: JSX.Element
  error?: string
  required?: boolean
  disabled?: boolean
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'name',
    'label',
    'description',
    'error',
    'required',
    'disabled',
    'children',
  ])

  const field = useField<T>(local.name)
  const hasError = local.error || field.error()

  return (
    <div class={cn('flex items-start gap-4', local.class)} {...others}>
      {/* Label Section */}
      <Show when={local.label}>
        <div class="flex-shrink-0 pt-2">
          <FormLabel
            for={field.props.id}
            required={local.required}
            validationState={hasError ? 'error' : field.validationState()}
          >
            {local.label}
          </FormLabel>
        </div>
      </Show>

      {/* Input/Control and Description Section */}
      <div class="flex-1 space-y-1">
        {/* Render children with field props */}
        {typeof local.children === 'function'
          ? local.children({
              ...field,
              props: {
                id: field.props.id,
                name: field.props.name,
                value: field.value(),
                onValueChange: field.setValue,
                validationState: field.validationState(),
                error: field.error(),
                required: local.required,
                disabled: local.disabled,
                'aria-invalid': field.error() ? 'true' : 'false',
                'aria-describedby': field.props['aria-describedby'],
              }
            })
          : local.children
        }

        {/* Description */}
        <Show when={local.description}>
          <div class="text-sm text-muted-foreground">
            {local.description}
          </div>
        </Show>

        {/* Error Message */}
        <Show when={hasError}>
          <FormError error={hasError ? (local.error || field.error()) : undefined} />
        </Show>
      </div>
    </div>
  )
}

/**
 * FormFieldCompact for minimal space usage
 */
export const FormFieldCompact = <T extends Record<string, any>>(props: {
  class?: string
  name: keyof T
  label?: JSX.Element
  error?: string
  required?: boolean
  disabled?: boolean
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'name',
    'label',
    'error',
    'required',
    'disabled',
    'children',
  ])

  const field = useField<T>(local.name)
  const hasError = local.error || field.error()

  return (
    <div class={cn('space-y-1', local.class)} {...others}>
      {/* Label */}
      <Show when={local.label}>
        <FormLabel
          for={field.props.id}
          required={local.required}
          validationState={hasError ? 'error' : field.validationState()}
          class="text-sm font-medium"
        >
          {local.label}
        </FormLabel>
      </Show>

      {/* Input/Control */}
      {typeof local.children === 'function'
        ? local.children({
            ...field,
            props: {
              id: field.props.id,
              name: field.props.name,
              value: field.value(),
              onValueChange: field.setValue,
              validationState: field.validationState(),
              error: field.error(),
              required: local.required,
              disabled: local.disabled,
              'aria-invalid': field.error() ? 'true' : 'false',
            }
          })
        : local.children
      }

      {/* Error Message */}
      <Show when={hasError}>
        <FormError error={hasError ? (local.error || field.error()) : undefined} />
      </Show>
    </div>
  )
}