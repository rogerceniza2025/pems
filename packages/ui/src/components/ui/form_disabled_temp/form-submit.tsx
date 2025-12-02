import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'

import { cn } from '../../../lib/utils'
import { Button, type ButtonProps } from '../button'
import type { FormSubmitProps } from './form.types'

/**
 * FormSubmit component for form submission buttons with loading states
 */
export const FormSubmit = (props: FormSubmitProps) => {
  const [local, others] = splitProps(props, [
    'loading',
    'loadingText',
    'disabled',
    'variant',
    'size',
    'confirmMode',
    'confirmText',
    'confirmDelay',
    'onConfirm',
    'class',
    'children',
  ])

  const isDisabled = () => local.disabled ?? local.loading

  return (
    <Button
      type="submit"
      disabled={isDisabled()}
      loading={local.loading}
      loadingText={local.loadingText}
      class={local.class}
      {...others}
    >
      {local.children}
    </Button>
  )
}

/**
 * FormReset component for form reset buttons
 */
export const FormReset = (props: {
  onClick?: () => void
  disabled?: boolean
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  class?: string
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'onClick',
    'disabled',
    'variant',
    'size',
    'class',
    'children',
  ])

  return (
    <Button
      type="reset"
      variant={local.variant ?? 'outline'}
      size={local.size}
      disabled={local.disabled}
      onClick={local.onClick}
      class={local.class}
      {...others}
    >
      {local.children}
    </Button>
  )
}

/**
 * FormCancelButton for canceling form actions
 */
export const FormCancelButton = (props: {
  onClick?: () => void
  disabled?: boolean
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  class?: string
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'onClick',
    'disabled',
    'variant',
    'size',
    'class',
    'children',
  ])

  return (
    <Button
      type="button"
      variant={local.variant ?? 'ghost'}
      size={local.size}
      disabled={local.disabled}
      onClick={local.onClick}
      class={local.class}
      {...others}
    >
      {local.children}
    </Button>
  )
}

/**
 * FormActions for grouping form action buttons
 */
export const FormActions = (props: {
  class?: string
  align?: 'left' | 'center' | 'right' | 'space-between'
  spacing?: 'compact' | 'normal' | 'relaxed'
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'class',
    'align',
    'spacing',
    'children',
  ])

  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    'space-between': 'justify-between',
  }

  const spacingClasses = {
    compact: 'gap-2',
    normal: 'gap-3',
    relaxed: 'gap-4',
  }

  return (
    <div
      class={cn(
        'flex items-center',
        alignmentClasses[local.align ?? 'right'],
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
 * PrimaryFormSubmit with default styling for primary submission
 */
export const PrimaryFormSubmit = (props: {
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  class?: string
  children: JSX.Element
}) => {
  return (
    <FormSubmit
      variant="default"
      size="default"
      loading={props.loading}
      loadingText={props.loadingText}
      disabled={props.disabled}
      class={props.class}
    >
      {props.children}
    </FormSubmit>
  )
}

/**
 * SecondaryFormSubmit with default styling for secondary submission
 */
export const SecondaryFormSubmit = (props: {
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  class?: string
  children: JSX.Element
}) => {
  return (
    <FormSubmit
      variant="secondary"
      size="default"
      loading={props.loading}
      loadingText={props.loadingText}
      disabled={props.disabled}
      class={props.class}
    >
      {props.children}
    </FormSubmit>
  )
}

/**
 * DestructiveFormSubmit for destructive actions (delete, etc.)
 */
export const DestructiveFormSubmit = (props: {
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  confirmMode?: boolean
  confirmText?: string
  confirmDelay?: number
  onConfirm?: () => void
  class?: string
  children: JSX.Element
}) => {
  const [local, others] = splitProps(props, [
    'loading',
    'loadingText',
    'disabled',
    'confirmMode',
    'confirmText',
    'confirmDelay',
    'onConfirm',
    'class',
    'children',
  ])

  return (
    <FormSubmit
      variant="destructive"
      size="default"
      loading={local.loading}
      loadingText={local.loadingText}
      disabled={local.disabled}
      confirmMode={local.confirmMode}
      confirmText={local.confirmText}
      confirmDelay={local.confirmDelay}
      onConfirm={local.onConfirm}
      class={local.class}
      {...others}
    >
      {local.children}
    </FormSubmit>
  )
}

/**
 * FormSaveButton for save actions
 */
export const FormSaveButton = (props: {
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  showIcon?: boolean
  class?: string
  children?: JSX.Element
}) => {
  const defaultChildren = (
    <>
      {props.showIcon !== false && (
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
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      )}
      Save
    </>
  )

  return (
    <PrimaryFormSubmit
      loading={props.loading}
      loadingText={props.loadingText ?? 'Saving...'}
      disabled={props.disabled}
      class={props.class}
    >
      {props.children ?? defaultChildren}
    </PrimaryFormSubmit>
  )
}

/**
 * FormNextButton for next step actions (multi-step forms)
 */
export const FormNextButton = (props: {
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  showIcon?: boolean
  class?: string
  children?: JSX.Element
}) => {
  const defaultChildren = (
    <>
      {props.children ?? 'Next'}
      {props.showIcon !== false && (
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
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </>
  )

  return (
    <PrimaryFormSubmit
      loading={props.loading}
      loadingText={props.loadingText ?? 'Next...'}
      disabled={props.disabled}
      class={props.class}
    >
      {defaultChildren}
    </PrimaryFormSubmit>
  )
}

/**
 * FormPreviousButton for previous step actions (multi-step forms)
 */
export const FormPreviousButton = (props: {
  onClick?: () => void
  disabled?: boolean
  showIcon?: boolean
  class?: string
  children?: JSX.Element
}) => {
  const defaultChildren = (
    <>
      {props.showIcon !== false && (
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
          <polyline points="15 18 9 12 15 6" />
        </svg>
      )}
      {props.children ?? 'Previous'}
    </>
  )

  return (
    <FormCancelButton
      variant="outline"
      onClick={props.onClick}
      disabled={props.disabled}
      class={props.class}
    >
      {defaultChildren}
    </FormCancelButton>
  )
}

/**
 * FormCompleteButton for completing multi-step forms
 */
export const FormCompleteButton = (props: {
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  showIcon?: boolean
  class?: string
  children?: JSX.Element
}) => {
  const defaultChildren = (
    <>
      {props.showIcon !== false && (
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
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {props.children ?? 'Complete'}
    </>
  )

  return (
    <PrimaryFormSubmit
      loading={props.loading}
      loadingText={props.loadingText ?? 'Completing...'}
      disabled={props.disabled}
      class={props.class}
    >
      {defaultChildren}
    </PrimaryFormSubmit>
  )
}

/**
 * FormContinueButton for continuing processes
 */
export const FormContinueButton = (props: {
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  showIcon?: boolean
  class?: string
  children?: JSX.Element
}) => {
  const defaultChildren = (
    <>
      {props.children ?? 'Continue'}
      {props.showIcon !== false && (
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
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      )}
    </>
  )

  return (
    <PrimaryFormSubmit
      loading={props.loading}
      loadingText={props.loadingText ?? 'Continuing...'}
      disabled={props.disabled}
      class={props.class}
    >
      {defaultChildren}
    </PrimaryFormSubmit>
  )
}
