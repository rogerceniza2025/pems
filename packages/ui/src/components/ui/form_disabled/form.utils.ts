import {
  createForm as createTanStackForm,
  type FieldApi,
  type FormOptions,
  type FormStore,
} from '@tanstack/solid-form'
import { createEffect, createSignal } from 'solid-js'
import type { z } from 'zod'

import type { ValidationState } from '../input'
import type {
  FieldValues,
  FormConfig,
  FormValidationError,
  ZodSchema,
} from './form.types'

/**
 * Zod validator adapter for TanStack Form
 */
export function zodValidator<T extends FieldValues>(
  schema: ZodSchema<T>,
): {
  validate: (
    value: unknown,
  ) => Promise<{ data: T } | { errors: Record<string, string[]> }>
  validateField: (field: string, value: unknown) => Promise<string | undefined>
} {
  return {
    async validate(value: unknown) {
      const result = await schema.safeParseAsync(value)

      if (result.success) {
        return { data: result.data }
      } else {
        const errors: Record<string, string[]> = {}
        result.error.issues.forEach((issue) => {
          const path = issue.path.join('.')
          if (!errors[path]) {
            errors[path] = []
          }
          errors[path].push(issue.message)
        })
        return { errors }
      }
    },

    async validateField(field: string, value: unknown) {
      try {
        // Create a partial schema with just the field we're validating
        const fieldSchema = z.object({ [field]: z.any() })
        const result = await fieldSchema.safeParseAsync({ [field]: value })

        if (result.success) {
          // If the field-level validation passes, also validate against the full schema
          const fullResult = await schema.safeParseAsync({ [field]: value })
          if (fullResult.success) {
            return undefined
          } else {
            const fieldError = fullResult.error.issues.find(
              (issue) => issue.path.length === 1 && issue.path[0] === field,
            )
            return fieldError?.message
          }
        } else {
          return result.error.issues[0]?.message
        }
      } catch (error) {
        return 'Validation error'
      }
    },
  }
}

/**
 * Create a form store with Zod validation
 */
export function createForm<T extends FieldValues>(
  config: FormConfig<T>,
): FormStore<T> {
  const options: FormOptions<T> = {
    defaultValues: config.defaultValues as T,
    onSubmit: async ({ value }) => {
      if (config.onSubmit) {
        await config.onSubmit(value)
      }
    },
    onSubmitInvalid: ({ formApi }) => {
      const errors = Object.entries(formApi.state.errors).map(
        ([field, messages]) => ({
          field,
          message: Array.isArray(messages) ? messages[0] : messages,
        }),
      )
      if (config.onValidationError) {
        config.onValidationError(errors)
      }
    },
    validators: {
      onChange: config.schema
        ? zodValidator(config.schema).validate
        : undefined,
      onChangeAsync: config.schema
        ? zodValidator(config.schema).validate
        : undefined,
      onBlur: config.schema ? zodValidator(config.schema).validate : undefined,
      onBlurAsync: config.schema
        ? zodValidator(config.schema).validate
        : undefined,
      onSubmit: config.schema
        ? zodValidator(config.schema).validate
        : undefined,
      onSubmitAsync: config.schema
        ? zodValidator(config.schema).validate
        : undefined,
    },
  }

  return createTanStackForm(options)
}

/**
 * Map Zod validation state to our ValidationState type
 */
export function mapValidationState(
  isValid: boolean,
  isTouched: boolean,
  errors: string[],
): ValidationState {
  if (!isTouched) return 'none'
  if (errors.length > 0) return 'error'
  if (isValid) return 'success'
  return 'none'
}

/**
 * Get error message from field errors
 */
export function getErrorMessage(
  errors: string[] | string | undefined,
): string | undefined {
  if (!errors) return undefined
  if (typeof errors === 'string') return errors
  return errors[0]
}

/**
 * Convert form errors to array of FormValidationError
 */
export function convertFormErrors(
  errors: Record<string, string[] | string>,
): FormValidationError[] {
  return Object.entries(errors).map(([field, messages]) => ({
    field,
    message: Array.isArray(messages) ? messages[0] : messages,
  }))
}

/**
 * Validate a single field
 */
export async function validateField<T extends FieldValues>(
  fieldApi: FieldApi<T>,
  schema?: ZodSchema<T>,
): Promise<boolean> {
  if (!schema) return true

  const fieldValidator = zodValidator(schema)
  const error = await fieldValidator.validateField(
    String(fieldApi.name),
    fieldApi.state.value,
  )

  if (error) {
    fieldApi.setErrors([error])
    return false
  } else {
    fieldApi.setErrors([])
    return true
  }
}

/**
 * Debounce function for validation
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Create debounced validation function
 */
export function createDebouncedValidator<T extends FieldValues>(
  fieldApi: FieldApi<T>,
  schema?: ZodSchema<T>,
  delay: number = 300,
) {
  return debounce(async () => {
    if (schema && fieldApi.state.value) {
      await validateField(fieldApi, schema)
    }
  }, delay)
}

/**
 * Check if form has any validation errors
 */
export function hasValidationErrors<T extends FieldValues>(
  formState: FormStore<T>['state'],
): boolean {
  return Object.keys(formState.errors).length > 0
}

/**
 * Check if form is dirty (has unsaved changes)
 */
export function isFormDirty<T extends FieldValues>(
  formState: FormStore<T>['state'],
  initialValues?: Partial<T>,
): boolean {
  if (!initialValues) return Object.keys(formState.dirtyFields).length > 0

  const currentValues = formState.values
  return Object.entries(initialValues).some(([key, value]) => {
    return currentValues[key as keyof T] !== value
  })
}

/**
 * Get all form data as a plain object
 */
export function getFormData<T extends FieldValues>(form: FormStore<T>): T {
  return form.state.values
}

/**
 * Reset form to initial values or provided values
 */
export function resetForm<T extends FieldValues>(
  form: FormStore<T>,
  values?: Partial<T>,
): void {
  form.reset()
  if (values) {
    Object.entries(values).forEach(([key, value]) => {
      form.setFieldValue(key as keyof T, value)
    })
  }
}

/**
 * Set multiple field values at once
 */
export function setFormValues<T extends FieldValues>(
  form: FormStore<T>,
  values: Partial<T>,
): void {
  Object.entries(values).forEach(([key, value]) => {
    form.setFieldValue(key as keyof T, value)
  })
}

/**
 * Clear all form errors
 */
export function clearFormErrors<T extends FieldValues>(
  form: FormStore<T>,
): void {
  Object.keys(form.state.errors).forEach((field) => {
    form.clearFieldError(field as keyof T)
  })
}

/**
 * Validate form without submitting
 */
export async function validateForm<T extends FieldValues>(
  form: FormStore<T>,
): Promise<boolean> {
  try {
    await form.validateAllFields()
    return !hasValidationErrors(form.state)
  } catch (error) {
    return false
  }
}

/**
 * Create a reactive field value signal
 */
export function createFieldSignal<T extends FieldValues>(
  form: FormStore<T>,
  fieldName: keyof T,
): [() => T[keyof T], (value: T[keyof T]) => void] {
  const getValue = () => form.state.values[fieldName]
  const setValue = (value: T[keyof T]) => {
    form.setFieldValue(fieldName, value)
  }
  return [getValue, setValue]
}

/**
 * Create a reactive field error signal
 */
export function createFieldErrorSignal<T extends FieldValues>(
  form: FormStore<T>,
  fieldName: keyof T,
): [() => string | undefined, () => void] {
  const getError = () => {
    const errors = form.state.errors[fieldName as string]
    return getErrorMessage(errors)
  }
  const clearError = () => {
    form.clearFieldError(fieldName)
  }
  return [getError, clearError]
}

/**
 * Create a reactive field validation state signal
 */
export function createFieldValidationSignal<T extends FieldValues>(
  form: FormStore<T>,
  fieldName: keyof T,
): [() => ValidationState] {
  return [
    () => {
      const field = form.getFieldInfo(fieldName as string)
      const error = getErrorMessage(form.state.errors[fieldName as string])
      return mapValidationState(
        !error,
        field.state.meta.isTouched || false,
        error ? [error] : [],
      )
    },
  ]
}

/**
 * Utility to generate field IDs for accessibility
 */
export function generateFieldId(name: string, suffix?: string): string {
  const base = name.replace(/\./g, '-')
  return suffix ? `${base}-${suffix}` : base
}

/**
 * Utility to generate error field IDs
 */
export function generateErrorFieldId(name: string): string {
  return `${name}-error`
}

/**
 * Utility to generate description field IDs
 */
export function generateDescriptionFieldId(name: string): string {
  return `${name}-description`
}

/**
 * Utility to check if a field is required
 */
export function isFieldRequired<T extends FieldValues>(
  form: FormStore<T>,
  fieldName: keyof T,
): boolean {
  const field = form.getFieldInfo(fieldName as string)
  return field.state.meta.isRequired || false
}

/**
 * Utility to check if a field is disabled
 */
export function isFieldDisabled<T extends FieldValues>(
  form: FormStore<T>,
  fieldName: keyof T,
): boolean {
  const field = form.getFieldInfo(fieldName as string)
  return field.state.meta.isDisabled || false
}

/**
 * Utility to get field value with fallback
 */
export function getFieldValue<T extends FieldValues>(
  form: FormStore<T>,
  fieldName: keyof T,
  fallback?: T[keyof T],
): T[keyof T] | undefined {
  return form.state.values[fieldName] ?? fallback
}

/**
 * Utility to set field value with validation trigger
 */
export function setFieldValueWithValidation<T extends FieldValues>(
  form: FormStore<T>,
  fieldName: keyof T,
  value: T[keyof T],
  validateOnChange: boolean = false,
): void {
  form.setFieldValue(fieldName, value)
  if (validateOnChange) {
    form.validateField(fieldName as string)
  }
}

/**
 * Utility to create form state signals
 */
export function createFormStateSignals<T extends FieldValues>(
  form: FormStore<T>,
) {
  const [isSubmitting, setIsSubmitting] = createSignal(form.state.isSubmitting)
  const [isValid, setIsValid] = createSignal(!hasValidationErrors(form.state))
  const [isDirty, setIsDirty] = createSignal(
    Object.keys(form.state.dirtyFields).length > 0,
  )
  const [errors, setErrors] = createSignal(form.state.errors)

  // Subscribe to form state changes
  createEffect(() => {
    setIsSubmitting(form.state.isSubmitting)
    setIsValid(!hasValidationErrors(form.state))
    setIsDirty(Object.keys(form.state.dirtyFields).length > 0)
    setErrors(form.state.errors)
  })

  return {
    isSubmitting,
    isValid,
    isDirty,
    errors,
  }
}
