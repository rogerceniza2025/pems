import type { JSX, ValidComponent } from 'solid-js'
import { createEffect, createSignal, Show, splitProps } from 'solid-js'

import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import * as TextFieldPrimitive from '@kobalte/core/text-field'

import { cn } from '../../lib/utils'
import { Button } from './button'

// Validation state types
export type ValidationState = 'success' | 'warning' | 'error' | 'none'

// Password strength levels
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong'

// Input variants
const inputVariants = {
  base: 'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
  validation: {
    none: 'border-input',
    success: 'border-green-500 focus-visible:ring-green-500',
    warning: 'border-yellow-500 focus-visible:ring-yellow-500',
    error: 'border-red-500 focus-visible:ring-red-500',
  },
  withLeftAddon: 'pl-10',
  withRightAddon: 'pr-10',
  withBothAddons: 'px-10',
}

// Password strength indicator component
const PasswordStrengthIndicator = (props: {
  strength: PasswordStrength
  class?: string
}) => {
  const strengthConfig = {
    weak: { color: 'bg-red-500', width: 'w-1/4', text: 'Weak' },
    fair: { color: 'bg-yellow-500', width: 'w-2/4', text: 'Fair' },
    good: { color: 'bg-blue-500', width: 'w-3/4', text: 'Good' },
    strong: { color: 'bg-green-500', width: 'w-full', text: 'Strong' },
  }

  const config = () => strengthConfig[props.strength]

  const cfg = config()
  return (
    <div class={cn('mt-2 space-y-1', props.class)}>
      <div class="flex space-x-1">
        <div class="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            class={cn(
              'h-full transition-all duration-300',
              cfg.color,
              cfg.width,
            )}
          />
        </div>
      </div>
      <span class="text-xs text-muted-foreground">{cfg.text}</span>
    </div>
  )
}

// Character count component
const CharacterCount = (props: {
  current: number
  max?: number
  class?: string
}) => {
  const isNearLimit = () => props.max && props.current >= props.max * 0.9
  const isOverLimit = () => props.max && props.current > props.max

  return (
    <div
      class={cn('text-xs text-muted-foreground mt-1 text-right', props.class)}
    >
      <span
        class={cn(
          isOverLimit() && 'text-red-500',
          isNearLimit() && !isOverLimit() && 'text-yellow-500',
        )}
      >
        {props.current}
        {props.max && `/${props.max}`}
      </span>
    </div>
  )
}

// Helper function to check password strength
const checkPasswordStrength = (password: string): PasswordStrength => {
  if (!password) return 'weak'

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z\d]/.test(password)) score++

  if (score <= 2) return 'weak'
  if (score === 3) return 'fair'
  if (score === 4) return 'good'
  return 'strong'
}

type TextFieldRootProps<T extends ValidComponent = 'div'> =
  TextFieldPrimitive.TextFieldRootProps<T> & {
    class?: string | undefined
  }

type TextFieldInputProps<T extends ValidComponent = 'input'> =
  TextFieldPrimitive.TextFieldInputProps<T> & {
    class?: string | undefined
    validationState?: ValidationState
    leftAddon?: JSX.Element
    rightAddon?: JSX.Element
    clearable?: boolean
    showPasswordToggle?: boolean
    showCharacterCount?: boolean
    maxLength?: number
    showPasswordStrength?: boolean
    copyable?: boolean
    onCopy?: () => void
    onClear?: () => void
    onValidationChange?: (state: ValidationState, message?: string) => void
    validator?: (value: string) => {
      valid: boolean
      message?: string
      state: ValidationState
    }
  }

const Input = <T extends ValidComponent = 'input'>(
  props: PolymorphicProps<T, TextFieldInputProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldInputProps, [
    'class',
    'validationState',
    'leftAddon',
    'rightAddon',
    'clearable',
    'showPasswordToggle',
    'showCharacterCount',
    'maxLength',
    'showPasswordStrength',
    'copyable',
    'onCopy',
    'onClear',
    'onValidationChange',
    'validator',
  ])

  // Extract remaining props that we need to access directly
  const remainingProps = props as Record<string, unknown>

  const [showPassword, setShowPassword] = createSignal(false)
  const [characterCount, setCharacterCount] = createSignal(0)
  const [passwordStrength, setPasswordStrength] =
    createSignal<PasswordStrength>('weak')
  const [currentValidationState, setCurrentValidationState] =
    createSignal<ValidationState>(local.validationState ?? 'none')
  const [validationMessage, setValidationMessage] = createSignal<string>()

  // Calculate character count and password strength
  createEffect(() => {
    const currentValue =
      remainingProps.value ?? remainingProps.defaultValue ?? ''
    setCharacterCount(currentValue?.toString().length ?? 0)

    if (remainingProps.type === 'password' && currentValue) {
      setPasswordStrength(checkPasswordStrength(currentValue.toString()))
    }
  })

  // Handle validation
  createEffect(() => {
    if (local.validator && remainingProps.value) {
      const result = local.validator(remainingProps.value.toString())
      setCurrentValidationState(result.state)
      setValidationMessage(result.message)
      local.onValidationChange?.(result.state, result.message)
    } else {
      setCurrentValidationState(local.validationState ?? 'none')
      setValidationMessage(undefined)
    }
  })

  // Handle clear action
  const handleClear = () => {
    local.onClear?.()
  }

  // Handle copy action
  const handleCopy = async () => {
    if (remainingProps.value) {
      try {
        await navigator.clipboard.writeText(remainingProps.value.toString())
        local.onCopy?.()
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to copy text: ', err)
      }
    }
  }

  // Toggle password visibility
  const togglePassword = () => {
    setShowPassword((prev) => !prev)
  }

  // Determine input type
  const getInputType = () => {
    if (remainingProps.type === 'password' && local.showPasswordToggle) {
      return showPassword() ? 'text' : 'password'
    }
    return remainingProps.type
  }

  // Calculate input classes
  const getInputClasses = () => {
    const hasLeftAddon = !!local.leftAddon
    const hasRightAddon =
      Boolean(local.rightAddon) ||
      Boolean(local.clearable) ||
      Boolean(local.showPasswordToggle) ||
      Boolean(local.copyable)
    const hasBothAddons = hasLeftAddon && hasRightAddon

    return cn(
      inputVariants.base,
      inputVariants.validation[currentValidationState()],
      hasLeftAddon && !hasBothAddons && inputVariants.withLeftAddon,
      hasRightAddon && !hasBothAddons && inputVariants.withRightAddon,
      hasBothAddons && inputVariants.withBothAddons,
      local.class,
    )
  }

  const hasValue =
    remainingProps.value && remainingProps.value.toString().length > 0

  return (
    <TextFieldPrimitive.Root class="w-full">
      <div class="relative">
        {/* Left Addon */}
        <Show when={local.leftAddon}>
          <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {local.leftAddon}
          </div>
        </Show>

        {/* Input Field */}
        <TextFieldPrimitive.Input
          type={getInputType()}
          maxLength={local.maxLength}
          class={getInputClasses()}
          {...others}
        />

        {/* Right Side Addons */}
        <div class="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {/* Clear Button */}
          <Show when={local.clearable && hasValue}>
            <Button
              variant="ghost"
              size="icon"
              class="h-4 w-4 hover:bg-transparent"
              onClick={handleClear}
              type="button"
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
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </Button>
          </Show>

          {/* Password Toggle */}
          <Show
            when={
              remainingProps.type === 'password' && local.showPasswordToggle
            }
          >
            <Button
              variant="ghost"
              size="icon"
              class="h-4 w-4 hover:bg-transparent"
              onClick={togglePassword}
              type="button"
            >
              <Show when={showPassword()}>
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
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </Show>
              <Show when={!showPassword()}>
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
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Show>
            </Button>
          </Show>

          {/* Copy Button */}
          <Show when={local.copyable && hasValue}>
            <Button
              variant="ghost"
              size="icon"
              class="h-4 w-4 hover:bg-transparent"
              onClick={handleCopy}
              type="button"
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
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </Button>
          </Show>

          {/* Custom Right Addon */}
          <Show when={local.rightAddon}>{local.rightAddon}</Show>
        </div>
      </div>

      {/* Validation Message */}
      <Show when={validationMessage()}>
        <div
          class={cn(
            'text-xs mt-1',
            currentValidationState() === 'error' && 'text-red-500',
            currentValidationState() === 'warning' && 'text-yellow-500',
            currentValidationState() === 'success' && 'text-green-500',
          )}
        >
          {validationMessage()}
        </div>
      </Show>

      {/* Password Strength Indicator */}
      <Show
        when={
          remainingProps.type === 'password' &&
          local.showPasswordStrength &&
          hasValue
        }
      >
        <PasswordStrengthIndicator strength={passwordStrength()} />
      </Show>

      {/* Character Count */}
      <Show when={local.showCharacterCount}>
        <CharacterCount current={characterCount()} max={local.maxLength} />
      </Show>
    </TextFieldPrimitive.Root>
  )
}

export { Input }
export type { TextFieldInputProps, TextFieldRootProps }
