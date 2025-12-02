import type { JSX } from 'solid-js'
import { For, splitProps } from 'solid-js'

import * as RadioGroupPrimitive from '@kobalte/core/radio-group'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const radioVariants = cva(
  'aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: '',
        destructive:
          'border-destructive text-destructive focus-visible:ring-destructive',
        success:
          'border-green-600 text-green-600 focus-visible:ring-green-600',
        warning:
          'border-yellow-600 text-yellow-600 focus-visible:ring-yellow-600',
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

export type RadioGroupProps = RadioGroupPrimitive.RadioGroupRootProps & {
  class?: string
  label?: string
  description?: string
  error?: string
  required?: boolean
  variant?: VariantProps<typeof radioVariants>['variant']
  size?: VariantProps<typeof radioVariants>['size']
  orientation?: 'horizontal' | 'vertical'
}

export const RadioGroup = (props: RadioGroupProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'label',
    'description',
    'error',
    'required',
    'variant',
    'size',
    'orientation',
  ])

  return (
    <div class={cn('space-y-3', local.class)}>
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
      
      <RadioGroupPrimitive.Root
        class={cn(
          local.orientation === 'horizontal' && 'flex flex-wrap gap-4 space-y-0',
        )}
        {...others}
      >
        <RadioGroupPrimitive.Label class="sr-only">
          {local.label}
        </RadioGroupPrimitive.Label>
      </RadioGroupPrimitive.Root>
      
      {local.error && (
        <p class="text-xs text-destructive mt-1">{local.error}</p>
      )}
    </div>
  )
}

export type RadioGroupItemProps = RadioGroupPrimitive.RadioGroupItemProps & {
  class?: string
  label?: string
  description?: string
  disabled?: boolean
  variant?: VariantProps<typeof radioVariants>['variant']
  size?: VariantProps<typeof radioVariants>['size']
}

export const RadioGroupItem = (props: RadioGroupItemProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'label',
    'description',
    'disabled',
    'variant',
    'size',
  ])

  return (
    <div class="flex items-start space-x-2">
      <RadioGroupPrimitive.Item
        class={cn(
          radioVariants({ variant: local.variant, size: local.size }),
          local.class,
        )}
        disabled={local.disabled}
        {...others}
      >
        <RadioGroupPrimitive.ItemInput />
        <RadioGroupPrimitive.ItemControl>
          <RadioGroupPrimitive.ItemIndicator>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="h-2.5 w-2.5"
            >
              <circle cx="12" cy="12" r="8" />
            </svg>
          </RadioGroupPrimitive.ItemIndicator>
        </RadioGroupPrimitive.ItemControl>
      </RadioGroupPrimitive.Item>
      
      {(local.label ?? local.description) && (
        <div class="grid gap-1.5 leading-none">
          <RadioGroupPrimitive.ItemLabel class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {local.label}
          </RadioGroupPrimitive.ItemLabel>
          {local.description && (
            <p class="text-xs text-muted-foreground">{local.description}</p>
          )}
        </div>
      )}
    </div>
  )
}

export type RadioCardProps = {
  value: string
  checked?: boolean
  onChange?: (value: string) => void
  disabled?: boolean
  children?: JSX.Element
  class?: string
  variant?: VariantProps<typeof radioVariants>['variant']
  size?: VariantProps<typeof radioVariants>['size']
}

export const RadioCard = (props: RadioCardProps) => {
  const [local, others] = splitProps(props, [
    'value',
    'checked',
    'onChange',
    'disabled',
    'children',
    'class',
    'variant',
    'size',
  ])

  return (
    <div
      class={cn(
        'relative rounded-lg border p-4 cursor-pointer transition-colors hover:bg-muted/50',
        local.checked
          ? 'border-primary bg-primary/5'
          : 'border-border',
        local.disabled && 'cursor-not-allowed opacity-50',
        local.class,
      )}
      onClick={() => !local.disabled && local.onChange?.(local.value)}
      {...others}
    >
      <div class="flex items-start space-x-3">
        <RadioGroupPrimitive.Item
          class={radioVariants({ variant: local.variant, size: local.size })}
          value={local.value}
          disabled={local.disabled}
        >
          <RadioGroupPrimitive.ItemInput />
          <RadioGroupPrimitive.ItemControl>
            <RadioGroupPrimitive.ItemIndicator>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="h-2.5 w-2.5"
              >
                <circle cx="12" cy="12" r="8" />
              </svg>
            </RadioGroupPrimitive.ItemIndicator>
          </RadioGroupPrimitive.ItemControl>
        </RadioGroupPrimitive.Item>
        
        <div class="flex-1">{local.children}</div>
      </div>
    </div>
  )
}

export type RadioOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export type RadioFieldProps = {
  class?: string
  label?: string
  description?: string
  error?: string
  required?: boolean
  options: RadioOption[]
  value?: string
  onChange?: (value: string) => void
  variant?: VariantProps<typeof radioVariants>['variant']
  size?: VariantProps<typeof radioVariants>['size']
  orientation?: 'horizontal' | 'vertical'
  layout?: 'default' | 'card'
}

export const RadioField = (props: RadioFieldProps) => {
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
    'layout',
  ])

  return (
    <div class={cn('space-y-3', local.class)} {...others}>
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
        class={cn(
          local.layout === 'card' && 'grid gap-3',
          local.layout === 'card' && local.orientation === 'horizontal' && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        )}
      >
        <RadioGroupPrimitive.Root
          value={local.value}
          onChange={local.onChange}
          orientation={local.orientation}
          class={cn(
            local.layout !== 'card' && 'space-y-3',
            local.orientation === 'horizontal' && 'flex flex-wrap gap-4 space-y-0',
          )}
        >
          <RadioGroupPrimitive.Label class="sr-only">
            {local.label}
          </RadioGroupPrimitive.Label>
          
          <For each={local.options}>
            {(option) =>
              local.layout === 'card' ? (
                <RadioCard
                  value={option.value}
                  checked={local.value === option.value}
                  onChange={local.onChange}
                  disabled={option.disabled}
                  variant={local.variant}
                  size={local.size}
                >
                  <div class="space-y-1">
                    <div class="text-sm font-medium">{option.label}</div>
                    {option.description && (
                      <div class="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    )}
                  </div>
                </RadioCard>
              ) : (
                <RadioGroupItem
                  value={option.value}
                  label={option.label}
                  description={option.description}
                  disabled={option.disabled}
                  variant={local.variant}
                  size={local.size}
                />
              )
            }
          </For>
        </RadioGroupPrimitive.Root>
      </div>
      
      {local.error && (
        <p class="text-xs text-destructive mt-1">{local.error}</p>
      )}
    </div>
  )
}