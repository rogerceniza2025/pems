// Temporary stub types for missing dependencies
// This file should be removed once proper dependencies are installed

declare module '@tanstack/solid-form' {
  export interface FormStore<T = any> {
    state: {
      values: T
      errors: Record<string, string[]>
      isSubmitting: boolean
      isValid: boolean
      isDirty: boolean
    }
  }

  export interface FormOptions<T = any> {
    defaultValues?: T
    onSubmit?: (values: T) => void | Promise<void>
  }

  export interface FieldApi<T = any, N = any> {
    state: {
      value: any
      error: string | undefined
    }
  }

  export function createForm<T = any>(options: FormOptions<T>): FormStore<T>
  export function createField<T = any, N = any>(options: any): FieldApi<T, N>
  export const FieldApi: any
}

declare module 'zod' {
  export interface ZodSchema<T = any> {}

  export const z: {
    string(): ZodSchema<string>
    number(): ZodSchema<number>
    boolean(): ZodSchema<boolean>
    object<T extends Record<string, any>>(shape: T): ZodSchema<any>
    array<T extends ZodSchema>(schema: T): ZodSchema<any>
    optional<T extends ZodSchema>(schema: T): ZodSchema<any>
    nullable<T extends ZodSchema>(schema: T): ZodSchema<any>
  }
}
