import type { JSX } from 'solid-js'
import { For, splitProps } from 'solid-js'

import * as CheckboxPrimitive from '@kobalte/core/checkbox'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

import { classNames } from '../../lib/utils'

const checkboxVariants = cva(
  'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
  {
    variants: {
      variant: {
        default: '',
        destructive:
          'border-destructive data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground',
        success:
          'border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white',
        warning:
          'border-yellow-600 data-[state=checked]:bg-yellow-600 data-[state=checked]:text-white',
      },
      size: {
        sm: 'h-3 w-3',
        default: 'h-4 w-4',
        lg: 'h-5 w-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type CheckboxProps = CheckboxPrimitive.CheckboxRootProps & {
  class?: string
  variant?: VariantProps<typeof checkboxVariants>['variant']
  size?: VariantProps<typeof checkboxVariants>['size']
  label?: string
  description?: string
  error?: string
  required?: boolean
}

export const Checkbox = (props: CheckboxProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'variant',
    'size',
    'label',
    'description',
    'error',
    'required',
  ])

  return (
    <div class="space-y-2">
      <div class="flex items-start space-x-2">
        <CheckboxPrimitive.Root
          class={classNames(
            checkboxVariants({ variant: local.variant, size: local.size }),
            local.class,
          )}
          {...others}
        >
          <CheckboxPrimitive.Input />
          <CheckboxPrimitive.Control>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </CheckboxPrimitive.Control>
        </CheckboxPrimitive.Root>
        
        {(local.label ?? local.required) && (
          <div class="grid gap-1.5 leading-none">
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {local.label}
              {local.required && <span class="text-destructive ml-1">*</span>}
            </label>
            {local.description && (
              <p class="text-xs text-muted-foreground">{local.description}</p>
            )}
          </div>
        )}
      </div>
      
      {local.error && (
        <p class="text-xs text-destructive mt-1">{local.error}</p>
      )}
    </div>
  )
}

export type CheckboxGroupProps = {
  class?: string
  label?: string
  description?: string
  error?: string
  required?: boolean
  options: Array<{
    value: string
    label: string
    description?: string
    disabled?: boolean
  }>
  value?: string[]
  onChange?: (value: string[]) => void
  variant?: VariantProps<typeof checkboxVariants>['variant']
  size?: VariantProps<typeof checkboxVariants>['size']
  orientation?: 'horizontal' | 'vertical'
}

export const CheckboxGroup = (props: CheckboxGroupProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'label',
    'description',
    'error',
    'required',
    'options',
    'value',
    'onChange',
    'variant',
    'size',
    'orientation',
  ])

  const handleChange = (optionValue: string, checked: boolean) => {
    if (!local.onChange) return

    const currentValue = local.value ?? []
    let newValue: string[]

    if (checked) {
      newValue = [...currentValue, optionValue]
    } else {
      newValue = currentValue.filter((v) => v !== optionValue)
    }

    local.onChange(newValue)
  }

  return (
    <div class={classNames('space-y-3', local.class)} {...others}>
      {(local.label ?? local.required) && (
        <div class="space-y-1">
          <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {local.label}
            {local.required && <span class="text-destructive ml-1">*</span>}
          </label>
          {local.description && (
            <p class="text-xs text-muted-foreground">{local.description}</p>
          )}
        </div>
      )}
      
      <div
        class={classNames(
          'space-y-2',
          local.orientation === 'horizontal' && 'flex flex-wrap gap-4 space-y-0',
        )}
      >
        <For each={local.options}>
          {(option) => (
            <Checkbox
              value={option.value}
              checked={local.value?.includes(option.value)}
              onChange={(checked) => handleChange(option.value, checked)}
              disabled={option.disabled}
              label={option.label}
              description={option.description}
              variant={local.variant}
              size={local.size}
            />
          )}
        </For>
      </div>
      
      {local.error && (
        <p class="text-xs text-destructive mt-1">{local.error}</p>
      )}
    </div>
  )
}

export type CheckboxCardProps = {
  value: string
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  children?: JSX.Element
  class?: string
}

export const CheckboxCard = (props: CheckboxCardProps) => {
  const [local, others] = splitProps(props, [
    'value',
    'checked',
    'onChange',
    'disabled',
    'children',
    'class',
  ])

  return (
    <div
      class={classNames(
        'relative rounded-lg border p-4 cursor-pointer transition-colors hover:bg-muted/50',
        local.checked
          ? 'border-primary bg-primary/5'
          : 'border-border',
        local.disabled && 'cursor-not-allowed opacity-50',
        local.class,
      )}
      onClick={() => !local.disabled && local.onChange?.(!local.checked)}
      {...others}
    >
      <div class="flex items-start space-x-3">
        <CheckboxPrimitive.Root
          class={checkboxVariants()}
          checked={local.checked}
          onChange={local.onChange}
          disabled={local.disabled}
          value={local.value}
        >
          <CheckboxPrimitive.Input />
          <CheckboxPrimitive.Control>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </CheckboxPrimitive.Control>
        </CheckboxPrimitive.Root>
        
        <div class="flex-1">{local.children}</div>
      </div>
    </div>
  )
}