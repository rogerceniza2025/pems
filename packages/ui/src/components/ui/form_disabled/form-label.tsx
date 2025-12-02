import type { JSX, ValidComponent } from 'solid-js'
import { Show, splitProps } from 'solid-js'

import * as LabelPrimitive from '@kobalte/core/label'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

import { cn } from '../../../lib/utils'
import type { ValidationState } from '../input'
import type { FormLabelProps } from './form.types'

/**
 * Form label variants using Class Variance Authority
 */
const formLabelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  {
    variants: {
      validationState: {
        none: 'text-foreground',
        success: 'text-green-700',
        warning: 'text-yellow-700',
        error: 'text-destructive',
      },
      size: {
        sm: 'text-xs',
        default: 'text-sm',
        lg: 'text-base',
      },
      weight: {
        normal: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
      },
    },
    defaultVariants: {
      validationState: 'none',
      size: 'default',
      weight: 'medium',
    },
  },
)

/**
 * Enhanced FormLabel component that extends the base Label component
 * with form-specific features like validation states and tooltips
 */
const FormLabel = <T extends ValidComponent = 'label'>(
  props: PolymorphicProps<T, FormLabelProps<T>>
) => {
  const [local, others] = splitProps(props as FormLabelProps, [
    'for',
    'required',
    'optional',
    'validationState',
    'tooltip',
    'icon',
    'class',
    'children',
  ])

  return (
    <div class="flex items-center gap-2">
      <LabelPrimitive.Root
        class={cn(
          formLabelVariants({
            validationState: local.validationState,
            size: 'default',
            weight: 'medium',
          }),
          local.class,
        )}
        for={local.for}
        {...others}
      >
        {local.icon && (
          <span class="mr-1 inline-flex items-center">
            {local.icon}
          </span>
        )}

        {local.children}

        {/* Required indicator */}
        {local.required && (
          <span
            class="text-destructive ml-1"
            aria-label="required field"
            title="This field is required"
          >
            *
          </span>
        )}

        {/* Optional indicator */}
        {local.optional && (
          <span
            class="text-muted-foreground ml-1 text-xs font-normal"
            aria-label="optional field"
            title="This field is optional"
          >
            (optional)
          </span>
        )}
      </LabelPrimitive.Root>

      {/* Tooltip */}
      <Show when={local.tooltip}>
        <div
          class="group relative inline-block"
          role="tooltip"
          aria-label="field help"
        >
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
            class="text-muted-foreground cursor-help"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            {local.tooltip}
            <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-t-4 border-t-gray-900 border-r-4 border-r-transparent" />
          </div>
        </div>
      </Show>
    </div>
  )
}

/**
 * FormSectionTitle for section headings in forms
 */
export const FormSectionTitle = (props: {
  class?: string
  size?: 'sm' | 'default' | 'lg'
  children: JSX.Element
  required?: boolean
}) => {
  return (
    <h3
      class={cn(
        'font-semibold text-foreground',
        props.size === 'sm' && 'text-sm',
        props.size === 'default' && 'text-base',
        props.size === 'lg' && 'text-lg',
        props.class,
      )}
    >
      {props.children}
      {props.required && (
        <span class="text-destructive ml-1" aria-label="required section">
          *
        </span>
      )}
    </h3>
  )
}

/**
 * FormSubLabel for additional label text
 */
export const FormSubLabel = (props: {
  class?: string
  children: JSX.Element
}) => {
  return (
    <span class={cn('text-xs text-muted-foreground ml-2', props.class)}>
      {props.children}
    </span>
  )
}

/**
 * FormLabelGroup for grouping related labels
 */
export const FormLabelGroup = (props: {
  class?: string
  children: JSX.Element
}) => {
  return (
    <div class={cn('flex flex-col space-y-1', props.class)}>
      {props.children}
    </div>
  )
}

/**
 * FormLabelWithActions for labels with action buttons
 */
export const FormLabelWithActions = (props: {
  class?: string
  for?: string
  children: JSX.Element
  actions?: JSX.Element
  required?: boolean
  optional?: boolean
  validationState?: ValidationState
}) => {
  return (
    <div class={cn('flex items-center justify-between gap-2', props.class)}>
      <FormLabel
        for={props.for}
        required={props.required}
        optional={props.optional}
        validationState={props.validationState}
      >
        {props.children}
      </FormLabel>
      {props.actions && (
        <div class="flex items-center gap-2">
          {props.actions}
        </div>
      )}
    </div>
  )
}

/**
 * FormLabelWithHint for labels with hint text
 */
export const FormLabelWithHint = (props: {
  class?: string
  for?: string
  children: JSX.Element
  hint?: JSX.Element
  required?: boolean
  optional?: boolean
  validationState?: ValidationState
}) => {
  return (
    <div class={cn('space-y-1', props.class)}>
      <FormLabel
        for={props.for}
        required={props.required}
        optional={props.optional}
        validationState={props.validationState}
      >
        {props.children}
      </FormLabel>
      {props.hint && (
        <div class="text-xs text-muted-foreground">
          {props.hint}
        </div>
      )}
    </div>
  )
}

/**
 * Compact form label for minimal space usage
 */
export const CompactFormLabel = <T extends ValidComponent = 'label'>(
  props: PolymorphicProps<T, Omit<FormLabelProps<T>, 'size' | 'weight'>>
) => {
  const [local, others] = splitProps(props as FormLabelProps, [
    'for',
    'required',
    'optional',
    'validationState',
    'tooltip',
    'icon',
    'class',
    'children',
  ])

  return (
    <div class="flex items-center gap-1">
      <LabelPrimitive.Root
        class={cn(
          'text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          formLabelVariants({
            validationState: local.validationState,
            size: 'sm',
            weight: 'medium',
          }),
          local.class,
        )}
        for={local.for}
        {...others}
      >
        {local.icon && (
          <span class="mr-0.5 inline-flex items-center">
            {local.icon}
          </span>
        )}

        {local.children}

        {local.required && (
          <span class="text-destructive ml-0.5">*</span>
        )}

        {local.optional && (
          <span class="text-muted-foreground ml-0.5 text-xs font-normal">
            (optional)
          </span>
        )}
      </LabelPrimitive.Root>

      <Show when={local.tooltip}>
        <div class="group relative inline-block">
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
            class="text-muted-foreground cursor-help"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
      </Show>
    </div>
  )
}

export { FormLabel }
export type { FormLabelProps }