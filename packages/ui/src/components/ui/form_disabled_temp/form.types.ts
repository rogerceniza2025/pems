import type { JSX } from 'solid-js'
import { z } from 'zod'

import type { ValidationState } from '../input'

/**
 * Form field values type
 */
export type FieldValues = Record<string, any>

/**
 * Form validation error type
 */
export interface FormValidationError {
  field: string
  message: string
  code?: string
}

/**
 * Form submission state
 */
export type FormSubmissionState = 'idle' | 'submitting' | 'success' | 'error'

/**
 * Form layout options
 */
export type FormLayout = 'vertical' | 'horizontal' | 'grid'

/**
 * Form spacing options
 */
export type FormSpacing = 'compact' | 'normal' | 'relaxed'

/**
 * Form validation trigger options
 */
export type FormValidationTrigger =
  | 'onChange'
  | 'onBlur'
  | 'onSubmit'
  | 'manual'

/**
 * Form validation mode
 */
export type FormValidationMode = 'sync' | 'async'

/**
 * Message types for form feedback
 */
export type FormMessageType = 'error' | 'warning' | 'success' | 'info'

/**
 * Base form field props
 */
export interface BaseFormFieldProps {
  name: string
  label?: JSX.Element
  description?: JSX.Element
  required?: boolean
  disabled?: boolean
  placeholder?: string
  autocomplete?: string
}

/**
 * Form field component props
 */
export interface FormFieldProps extends BaseFormFieldProps {
  class?: string
  layout?: 'vertical' | 'horizontal'
  validationState?: ValidationState
  error?: string
  helpText?: string
  tooltip?: JSX.Element
  icon?: JSX.Element
  children: JSX.Element | ((field: any) => JSX.Element)
}

/**
 * Form label component props
 */
export interface FormLabelProps {
  for?: string
  required?: boolean
  optional?: boolean
  validationState?: ValidationState
  tooltip?: JSX.Element
  icon?: JSX.Element
  class?: string
  children: JSX.Element
}

/**
 * Form error component props
 */
export interface FormErrorProps {
  field?: string
  errors?: string[]
  error?: string
  class?: string
  icon?: JSX.Element
  showInline?: boolean
}

/**
 * Form message component props
 */
export interface FormMessageProps {
  type?: FormMessageType
  class?: string
  icon?: JSX.Element
  children: JSX.Element
}

/**
 * Form control component props
 */
export interface FormControlProps {
  validationState?: ValidationState
  class?: string
  children: JSX.Element
}

/**
 * Form description component props
 */
export interface FormDescriptionProps {
  class?: string
  id?: string
  children: JSX.Element
}

/**
 * Form submit button props
 */
export interface FormSubmitProps {
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | null
  size?: 'default' | 'sm' | 'lg' | 'icon' | null
  confirmMode?: boolean
  confirmText?: string
  confirmDelay?: number
  onConfirm?: () => void
  class?: string
  children: JSX.Element
}

/**
 * Form section component props
 */
export interface FormSectionProps {
  title?: JSX.Element
  description?: JSX.Element
  class?: string
  children: JSX.Element
}

/**
 * Main form component props
 */
export interface FormProps<T extends FieldValues = FieldValues> {
  form: any // TanStack Form instance
  onSubmit?: (data: T) => void | Promise<void>
  onValidationError?: (errors: FormValidationError[]) => void
  onSubmitSuccess?: (data: T) => void
  onSubmitError?: (error: Error) => void

  // Layout and styling
  class?: string
  layout?: FormLayout
  spacing?: FormSpacing

  // Validation behavior
  validateOnChange?: boolean
  validateOnBlur?: boolean
  validateOnSubmit?: boolean
  validationMode?: FormValidationMode

  // Form behavior
  resetOnSubmit?: boolean
  disabled?: boolean
  noValidate?: boolean

  // Accessibility
  ariaLabel?: string
  ariaDescription?: string

  children: JSX.Element
}

/**
 * Form context value type
 */
export interface FormContextValue<T extends FieldValues = FieldValues> {
  form: any // TanStack Form instance
  validationState: () => FormSubmissionState
  isSubmitting: () => boolean
  isValid: () => boolean
  isDirty: () => boolean
  errors: () => Record<string, string[]>
  values: () => T
  setFieldValue: (name: string, value: any) => void
  setFieldError: (name: string, error: string) => void
  clearFieldError: (name: string) => void
  validateField: (name: string) => Promise<boolean>
  validateForm: () => Promise<boolean>
  resetForm: () => void
  submitForm: () => Promise<void>
}

/**
 * Zod schema type helper
 */
export type ZodSchema<T extends FieldValues> = z.ZodSchema<T>

/**
 * Form field configuration type
 */
export interface FormFieldConfig<T extends FieldValues = FieldValues> {
  name: keyof T
  label?: string
  placeholder?: string
  description?: string
  required?: boolean
  disabled?: boolean
  validation?: z.ZodTypeAny
  defaultValue?: any
  autoComplete?: string
}

/**
 * Form configuration type
 */
export interface FormConfig<T extends FieldValues = FieldValues> {
  schema?: ZodSchema<T>
  defaultValues?: Partial<T>
  validateOnChange?: boolean
  validateOnBlur?: boolean
  validateOnSubmit?: boolean
  resetOnSubmit?: boolean
  onSubmit?: (data: T) => void | Promise<void>
  onValidationError?: (errors: Record<string, string[]>) => void
}

/**
 * Form field render props
 */
export interface FormFieldRenderProps<T extends FieldValues = FieldValues> {
  name: keyof T
  value: () => any
  error: () => string | undefined
  validationState: () => ValidationState
  isDirty: () => boolean
  isTouched: () => boolean
  isValidating: () => boolean
  setValue: (value: any) => void
  setError: (error: string) => void
  clearError: () => void
  validate: () => Promise<boolean>
  props: Record<string, any>
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  email: () => z.string().email('Please enter a valid email address'),
  password: () =>
    z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
  requiredString: () => z.string().min(1, 'This field is required'),
  phone: () =>
    z.string().regex(/^[+]?[\d\s\-()]+$/, 'Please enter a valid phone number'),
  url: () => z.string().url('Please enter a valid URL'),
  positiveNumber: () => z.number().positive('Must be a positive number'),
  nonNegativeNumber: () =>
    z.number().nonnegative('Must be a non-negative number'),
} as const

/**
 * User form schema example
 */
export const userFormSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name must be less than 50 characters'),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be less than 50 characters'),
    email: commonSchemas.email(),
    password: commonSchemas.password(),
    confirmPassword: z.string(),
    age: z
      .number()
      .min(18, 'Must be at least 18 years old')
      .max(120, 'Must be less than 120 years old'),
    phone: commonSchemas.phone().optional(),
    website: commonSchemas.url().optional(),
    bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
    newsletter: z.boolean().default(false),
    terms: z
      .boolean()
      .refine(
        (val: boolean) => val === true,
        'You must accept the terms and conditions',
      ),
  })
  .refine((data: any) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

/**
 * User form type
 */
export type UserFormData = z.infer<typeof userFormSchema>

/**
 * Contact form schema example
 */
export const contactFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  email: commonSchemas.email(),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be less than 200 characters'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be less than 2000 characters'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  copyToSender: z.boolean().default(false),
})

/**
 * Contact form type
 */
export type ContactFormData = z.infer<typeof contactFormSchema>
