// Main Form Components
export { Form, FormField, FormSection, FormProgress, FormErrorSummary, FormConditional } from './form'
export type { FormProps } from './form'

// Form Field Components
export {
  FormField as EnhancedFormField,
  SimpleFormField,
  FormFieldGroup,
  FormFieldInline,
  FormFieldCompact,
} from './form-field'
export type { FormFieldProps } from './form-field'

// Form Label Components
export {
  FormLabel,
  FormSectionTitle,
  FormSubLabel,
  FormLabelGroup,
  FormLabelWithActions,
  FormLabelWithHint,
  CompactFormLabel,
} from './form-label'
export type { FormLabelProps } from './form-label'

// Form Error Components
export {
  FormError,
  FormErrorList,
  FormErrorSummary as FormErrorSummaryComponent,
  InlineFormError,
  FormErrorToast,
} from './form-error'
export type { FormErrorProps } from './form-error'

// Form Message Components
export {
  FormMessage,
  FormSuccessMessage,
  FormWarningMessage,
  FormInfoMessage,
  FormMessageCard,
  FormMessageBanner,
  FormProgressMessage,
} from './form-message'
export type { FormMessageProps } from './form-message'

// Form Control Components
export {
  FormControl,
  FormControlGroup,
  FormControlWithAddon,
  FormControlWithIcon,
  FormControlWithValidation,
  FormControlLoading,
  FormControlHelper,
} from './form-control'
export type { FormControlProps } from './form-control'

// Form Submit Components
export {
  FormSubmit,
  FormReset,
  FormCancelButton,
  FormActions,
  PrimaryFormSubmit,
  SecondaryFormSubmit,
  DestructiveFormSubmit,
  FormSaveButton,
  FormNextButton,
  FormPreviousButton,
  FormCompleteButton,
  FormContinueButton,
} from './form-submit'
export type { FormSubmitProps } from './form-submit'

// Form Description Components
export {
  FormDescription,
  FormHint,
  FormExample,
  FormLink,
  FormRichDescription,
  FormDescriptionWithIcon,
  FormDescriptionGroup,
  FormCharacterCount,
  FormPasswordStrength,
} from './form-description'
export type { FormDescriptionProps } from './form-description'

// Form Context and Hooks
export {
  FormContext,
  FormProvider,
  useForm,
  useField,
  useFormSubmission,
  useFormValidation,
  useFormFieldProps,
  useFormLabelProps,
  useFormErrorProps,
  useFormDescriptionProps,
  FieldContext,
  useFieldContext,
  FieldProvider,
} from './form-context'
export type { FormContextValue } from './form-context'

// Form Types
export {
  type FieldValues,
  type FormValidationError,
  type FormSubmissionState,
  type FormLayout,
  type FormSpacing,
  type FormValidationTrigger,
  type FormValidationMode,
  type FormMessageType,
  type BaseFormFieldProps,
  type FormFieldConfig,
  type FormConfig,
  type ZodSchema,
  type FormFieldRenderProps,
} from './form.types'

// Form Utilities
export {
  zodValidator,
  createForm,
  mapValidationState,
  getErrorMessage,
  convertFormErrors,
  validateField,
  debounce,
  createDebouncedValidator,
  hasValidationErrors,
  isFormDirty,
  getFormData,
  resetForm,
  setFormValues,
  clearFormErrors,
  validateForm,
  createFieldSignal,
  createFieldErrorSignal,
  createFieldValidationSignal,
  generateFieldId,
  generateErrorFieldId,
  generateDescriptionFieldId,
  isFieldRequired,
  isFieldDisabled,
  getFieldValue,
  setFieldValueWithValidation,
  createFormStateSignals,
} from './form.utils'

// Common Schemas
export {
  commonSchemas,
  userFormSchema,
  contactFormSchema,
} from './form.types'

export type { UserFormData, ContactFormData } from './form.types'

// Re-export for convenience
export type { ValidationState } from '../input'