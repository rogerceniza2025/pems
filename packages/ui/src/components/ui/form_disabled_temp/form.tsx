import type { JSX } from 'solid-js'
import { Show, splitProps, For } from 'solid-js'
import { cva } from 'class-variance-authority'

import { cn } from '../../../lib/utils'
import { FormProvider } from './form-context'
import type { FormProps } from './form.types'

/**
 * Form layout variants using Class Variance Authority
 */
const formVariants = cva('space-y-6', {
  variants: {
    layout: {
      vertical: 'flex flex-col space-y-6',
      horizontal: 'grid grid-cols-1 gap-6 md:grid-cols-2',
      grid: 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    },
    spacing: {
      compact: 'space-y-4',
      normal: 'space-y-6',
      relaxed: 'space-y-8',
    },
  },
  defaultVariants: {
    layout: 'vertical',
    spacing: 'normal',
  },
})

/**
 * Main Form component that wraps TanStack Form functionality
 */
const Form = <T extends Record<string, any>>(props: FormProps<T>) => {
  const [local, others] = splitProps(props, [
    'form',
    'onSubmit',
    'onValidationError',
    'onSubmitSuccess',
    'onSubmitError',
    'class',
    'layout',
    'spacing',
    'validateOnChange',
    'validateOnBlur',
    'validateOnSubmit',
    'validationMode',
    'resetOnSubmit',
    'disabled',
    'noValidate',
    'ariaLabel',
    'ariaDescription',
    'children',
  ])

  // Handle form submission
  const handleSubmit = async (event: Event) => {
    event.preventDefault()

    try {
      const result = await local.form.handleSubmit()

      if (local.onSubmitSuccess && result.data) {
        await local.onSubmitSuccess(result.data)
      }
    } catch (error) {
      if (local.onSubmitError && error instanceof Error) {
        await local.onSubmitError(error)
      } else if (local.onValidationError) {
        const errors = Object.entries(local.form.state.errors).map(
          ([field, messages]) => ({
            field,
            message: Array.isArray(messages) ? messages[0] : messages,
          }),
        )
        local.onValidationError(errors)
      }
    }
  }

  // Handle form submission through TanStack Form
  // const handleFormSubmit = async () => {
  //   if (local.onSubmit) {
  //     try {
  //       const formData = local.form.state.values
  //       await local.onSubmit(formData)
  //     } catch (error) {
  //       if (local.onSubmitError && error instanceof Error) {
  //         local.onSubmitError(error)
  //       }
  //     }
  //   }
  // }

  // Configure form validation behavior
  const configureForm = () => {
    // Update form options based on props
    if (local.validateOnChange !== undefined) {
      local.form.options.validateOnChange = local.validateOnChange
    }
    if (local.validateOnBlur !== undefined) {
      local.form.options.validateOnBlur = local.validateOnBlur
    }
    if (local.validateOnSubmit !== undefined) {
      local.form.options.validateOnSubmit = local.validateOnSubmit
    }
  }

  // Configure form when component mounts or props change
  configureForm()

  return (
    <FormProvider form={local.form}>
      <form
        class={cn(
          formVariants({
            layout: local.layout,
            spacing: local.spacing,
          }),
          local.class,
        )}
        onSubmit={handleSubmit}
        noValidate={local.noValidate}
        aria-label={local.ariaLabel}
        aria-describedby={local.ariaDescription}
        {...others}
      >
        {local.children}
      </form>
    </FormProvider>
  )
}

/**
 * FormField wrapper component for consistent field layout
 */
export const FormField = <T extends Record<string, any>>(props: {
  name: keyof T
  class?: string
  required?: boolean
  disabled?: boolean
  layout?: 'vertical' | 'horizontal'
  label?: JSX.Element
  description?: JSX.Element
  error?: string
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'name',
    'required',
    'disabled',
    'layout',
    'label',
    'description',
    'error',
    'children',
  ])

  const isHorizontal = local.layout === 'horizontal'

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
      {local.label && (
        <div class={cn(isHorizontal && 'md:col-span-1')}>
          {local.label}
          {local.required && (
            <span class="text-destructive ml-1" aria-label="required">
              *
            </span>
          )}
        </div>
      )}

      {/* Input Section */}
      <div class={cn(isHorizontal && 'md:col-span-2')}>{local.children}</div>

      {/* Description Section */}
      {local.description && (
        <div
          class={cn(
            'text-sm text-muted-foreground',
            isHorizontal && 'md:col-span-1',
          )}
        >
          {local.description}
        </div>
      )}

      {/* Error Section */}
      {local.error && (
        <div
          class={cn(
            'text-sm text-destructive flex items-center gap-2',
            isHorizontal && 'md:col-span-2',
          )}
        >
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
          {local.error}
        </div>
      )}
    </div>
  )
}

/**
 * FormSection component for grouping related fields
 */
export const FormSection = (props: {
  title?: JSX.Element
  description?: JSX.Element
  class?: string
  children: JSX.Element
}) => {
  return (
    <div
      class={cn('space-y-4 p-4 border rounded-lg bg-background', props.class)}
    >
      {props.title && (
        <div class="space-y-2">
          <h3 class="text-lg font-semibold">{props.title}</h3>
          {props.description && (
            <p class="text-sm text-muted-foreground">{props.description}</p>
          )}
        </div>
      )}
      <div class="space-y-4">{props.children}</div>
    </div>
  )
}

/**
 * FormActions component for form buttons (submit, reset, etc.)
 */
export const FormActions = (props: {
  class?: string
  align?: 'left' | 'center' | 'right' | 'space-between'
  children: JSX.Element
}) => {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    'space-between': 'justify-between',
  }

  return (
    <div
      class={cn(
        'flex gap-3 mt-8',
        alignmentClasses[props.align ?? 'right'],
        props.class,
      )}
    >
      {props.children}
    </div>
  )
}

/**
 * FormProgress component for multi-step forms
 */
export const FormProgress = (props: {
  current: number
  total: number
  class?: string
  showLabels?: boolean
  steps?: string[]
}) => {
  const progress = () => (props.current / props.total) * 100

  return (
    <div class={cn('space-y-2', props.class)}>
      {/* Progress Bar */}
      <div class="w-full bg-secondary rounded-full h-2">
        <div
          class="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress()}%` }}
        />
      </div>

      {/* Step Indicators */}
      {props.showLabels && props.steps && (
        <div class="flex justify-between text-xs text-muted-foreground">
          <For each={props.steps}>
            {(step, index) => (
              <div
                class={cn(
                  'flex items-center gap-2',
                  index() + 1 <= props.current && 'text-primary font-medium',
                )}
              >
                <div
                  class={cn(
                    'w-4 h-4 rounded-full border-2 border-current',
                    index() + 1 <= props.current && 'bg-current',
                  )}
                />
                <span>{step}</span>
              </div>
            )}
          </For>
        </div>
      )}

      {/* Simple Step Counter */}
      {!props.showLabels && (
        <div class="text-center text-sm text-muted-foreground">
          Step {props.current} of {props.total}
        </div>
      )}
    </div>
  )
}

/**
 * FormErrorSummary component for displaying all form errors
 */
export const FormErrorSummary = (props: {
  form: any // TanStack Form instance
  class?: string
  title?: string
}) => {
  const errors = () => {
    const formErrors = props.form.state.errors
    return Object.entries(formErrors).map(([field, messages]) => ({
      field,
      message: Array.isArray(messages) ? messages[0] : messages,
    }))
  }

  const hasErrors = () => errors().length > 0

  return (
    <Show when={hasErrors()}>
      <div
        class={cn(
          'p-4 border border-destructive/20 rounded-lg bg-destructive/5 space-y-2',
          props.class,
        )}
        role="alert"
        aria-live="polite"
      >
        <h3 class="text-sm font-medium text-destructive">
          {props.title ?? 'Please fix the following errors:'}
        </h3>
        <ul class="text-sm text-destructive space-y-1">
          <For each={errors()}>
            {({ field, message }) => (
              <li>
                <strong>{field}:</strong> {message}
              </li>
            )}
          </For>
        </ul>
      </div>
    </Show>
  )
}

/**
 * Helper component for conditional rendering based on form state
 */
export const FormConditional = (props: {
  form: any // TanStack Form instance
  condition: (state: any) => boolean
  children: JSX.Element
}) => {
  const shouldShow = () => props.condition(props.form.state)

  return <Show when={shouldShow()}>{props.children}</Show>
}

// Export the main Form component
export { Form }
export type { FormProps }
