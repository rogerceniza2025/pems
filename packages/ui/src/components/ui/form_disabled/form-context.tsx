import { createContext, useContext } from 'solid-js'
import type { Accessor, JSX } from 'solid-js'

import type { ValidationState } from '../input'
import type { FieldValues, FormContextValue, FormSubmissionState } from './form.types'
import {
  createFieldErrorSignal,
  createFieldValidationSignal,
  createFormStateSignals,
  getErrorMessage,
  getFormData,
  hasValidationErrors,
  resetForm,
  setFieldValueWithValidation,
  validateField,
  validateForm,
} from './form.utils'

/**
 * Form context definition
 */
export const FormContext = createContext<FormContextValue>()

/**
 * Hook to access form context
 */
export function useForm<T extends FieldValues = FieldValues>(): FormContextValue<T> {
  const context = useContext(FormContext)
  if (!context) {
    throw new Error('useForm must be used within a FormProvider')
  }
  return context as FormContextValue<T>
}

/**
 * Provider component for form context
 */
export function FormProvider<T extends FieldValues = FieldValues>(
  props: {
    form: any // TanStack Form instance
    children: JSX.Element
  }
) {
  const { form } = props

  // Create reactive form state signals
  const formState = createFormStateSignals(form)

  // Create context value
  const contextValue: FormContextValue<T> = {
    form,
    validationState: (): FormSubmissionState => {
      if (formState.isSubmitting()) return 'submitting'
      if (formState.isValid()) return 'success'
      if (hasValidationErrors(form.state)) return 'error'
      return 'idle'
    },
    isSubmitting: formState.isSubmitting,
    isValid: formState.isValid,
    isDirty: formState.isDirty,
    errors: formState.errors,
    values: (): T => getFormData(form),
    setFieldValue: (name: string, value: any) => {
      setFieldValueWithValidation(form, name as keyof T, value, true)
    },
    setFieldError: (name: string, error: string) => {
      form.setFieldError(name as keyof T, [error])
    },
    clearFieldError: (name: string) => {
      form.clearFieldError(name as keyof T)
    },
    validateField: async (name: string): Promise<boolean> => {
      const field = form.getFieldInfo(name)
      return validateField(field as any)
    },
    validateForm: async (): Promise<boolean> => {
      return validateForm(form)
    },
    resetForm: (): void => {
      resetForm(form)
    },
    submitForm: async (): Promise<void> => {
      await form.handleSubmit()
    },
  }

  return (
    <FormContext.Provider value={contextValue as any}>
      {props.children}
    </FormContext.Provider>
  )
}

/**
 * Hook to get field state
 */
export function useField<T extends FieldValues = FieldValues>(
  name: keyof T
): {
  value: Accessor<T[keyof T]>
  error: Accessor<string | undefined>
  validationState: Accessor<ValidationState>
  isDirty: Accessor<boolean>
  isTouched: Accessor<boolean>
  isValidating: Accessor<boolean>
  setValue: (value: T[keyof T]) => void
  setError: (error: string) => void
  clearError: () => void
  validate: () => Promise<boolean>
  props: Record<string, any>
} {
  const { form } = useForm<T>()

  // Get field info
  const field = form.getFieldInfo(name as string)

  // Create signals
  const value = () => form.state.values[name]
  const error = () => getErrorMessage(form.state.errors[name as string])
  const [getError, clearError] = createFieldErrorSignal(form, name)
  const [getValidationState] = createFieldValidationSignal(form, name)

  const isDirty = () => form.state.dirtyFields[name as string] || false
  const isTouched = () => field.state.meta.isTouched || false
  const isValidating = () => field.state.meta.isValidating || false

  const setValue = (newValue: T[keyof T]) => {
    setFieldValueWithValidation(form, name, newValue, true)
  }

  const setError = (errorMessage: string) => {
    form.setFieldError(name as keyof T, [errorMessage])
  }

  const validate = async (): Promise<boolean> => {
    return validateField(field as any)
  }

  // Generate accessibility props
  const props = {
    id: `field-${String(name)}`,
    name: String(name),
    'aria-describedby': `${String(name)}-description ${String(name)}-error`,
    'aria-invalid': error() ? 'true' : 'false',
    'aria-required': field.state.meta.isRequired || false,
  }

  return {
    value,
    error: getError,
    validationState: getValidationState,
    isDirty,
    isTouched,
    isValidating,
    setValue,
    setError,
    clearError,
    validate,
    props,
  }
}

/**
 * Hook to get form submission state
 */
export function useFormSubmission(): {
  isSubmitting: Accessor<boolean>
  isValid: Accessor<boolean>
  isDirty: Accessor<boolean>
  errors: Accessor<Record<string, string[]>>
  values: Accessor<T>
  submit: () => Promise<void>
  reset: () => void
} {
  const context = useForm()

  return {
    isSubmitting: context.isSubmitting,
    isValid: context.isValid,
    isDirty: context.isDirty,
    errors: context.errors,
    values: context.values,
    submit: context.submitForm,
    reset: context.resetForm,
  }
}

/**
 * Hook to get form validation state
 */
export function useFormValidation(): {
  hasErrors: Accessor<boolean>
  errorCount: Accessor<number>
  validateForm: () => Promise<boolean>
  clearErrors: () => void
} {
  const { errors, validateForm } = useForm()

  const hasErrors = () => {
    const currentErrors = errors()
    return Object.keys(currentErrors).length > 0
  }

  const errorCount = () => {
    const currentErrors = errors()
    return Object.values(currentErrors).reduce(
      (count, errorArray) => count + (Array.isArray(errorArray) ? errorArray.length : 1),
      0
    )
  }

  const clearErrors = () => {
    Object.keys(errors()).forEach((field) => {
      // This will be implemented when we have access to the form instance
      // form.clearFieldError(field as keyof T)
    })
  }

  return {
    hasErrors,
    errorCount,
    validateForm,
    clearErrors,
  }
}

/**
 * Hook to create form field props that work with existing input components
 */
export function useFormFieldProps<T extends FieldValues = FieldValues>(
  name: keyof T,
  baseProps: Record<string, any> = {}
): Record<string, any> {
  const field = useField<T>(name)

  return {
    id: field.props.id,
    name: field.props.name,
    value: field.value(),
    onValueChange: field.setValue,
    validationState: field.validationState(),
    error: field.error(),
    required: field.props['aria-required'],
    'aria-invalid': field.props['aria-invalid'],
    'aria-describedby': field.props['aria-describedby'],
    ...baseProps,
  }
}

/**
 * Hook to create form label props
 */
export function useFormLabelProps<T extends FieldValues = FieldValues>(
  name: keyof T,
  baseProps: Record<string, any> = {}
): Record<string, any> {
  const field = useField<T>(name)

  return {
    for: field.props.id,
    required: field.props['aria-required'],
    validationState: field.validationState(),
    ...baseProps,
  }
}

/**
 * Hook to create form error props
 */
export function useFormErrorProps<T extends FieldValues = FieldValues>(
  name: keyof T,
  baseProps: Record<string, any> = {}
): Record<string, any> {
  const field = useField<T>(name)
  const error = field.error()

  return {
    id: `${String(name)}-error`,
    error,
    showInline: !!error,
    ...baseProps,
  }
}

/**
 * Hook to create form description props
 */
export function useFormDescriptionProps<T extends FieldValues = FieldValues>(
  name: keyof T,
  baseProps: Record<string, any> = {}
): Record<string, any> {
  const field = useField<T>(name)

  return {
    id: `${String(name)}-description`,
    ...baseProps,
  }
}

/**
 * Context provider for field-level form state
 */
export const FieldContext = createContext<{
  name: string
  required: boolean
  disabled: boolean
  validationState: ValidationState
  error?: string
  description?: string
}>()

/**
 * Hook to access field context
 */
export function useFieldContext() {
  const context = useContext(FieldContext)
  if (!context) {
    throw new Error('useFieldContext must be used within a FieldProvider')
  }
  return context
}

/**
 * Provider component for field-level context
 */
export function FieldProvider(props: {
  name: string
  required?: boolean
  disabled?: boolean
  validationState?: ValidationState
  error?: string
  description?: string
  children: JSX.Element
}) {
  const contextValue = {
    name: props.name,
    required: props.required || false,
    disabled: props.disabled || false,
    validationState: props.validationState || 'none',
    error: props.error,
    description: props.description,
  }

  return (
    <FieldContext.Provider value={contextValue}>
      {props.children}
    </FieldContext.Provider>
  )
}