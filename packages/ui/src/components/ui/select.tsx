import type { JSX } from 'solid-js'
import { For, Show, createSignal, splitProps } from 'solid-js'
import { Portal } from 'solid-js/web'

import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const selectVariants = cva(
  'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: '',
        destructive: 'border-destructive text-destructive',
        success: 'border-green-600 text-green-600',
        warning: 'border-yellow-600 text-yellow-600',
      },
      size: {
        sm: 'h-9 px-2 text-xs',
        default: 'h-10 px-3 text-sm',
        lg: 'h-11 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
  description?: string
  icon?: JSX.Element
}

export type SelectProps = {
  id?: string
  class?: string
  label?: string
  description?: string
  error?: string
  required?: boolean
  placeholder?: string
  variant?: VariantProps<typeof selectVariants>['variant']
  size?: VariantProps<typeof selectVariants>['size']
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
}

export const Select = (props: SelectProps) => {
  const [local, others] = splitProps(props, [
    'id',
    'class',
    'label',
    'description',
    'error',
    'required',
    'placeholder',
    'variant',
    'size',
    'options',
    'value',
    'onChange',
    'disabled',
  ])

  const [isOpen, setIsOpen] = createSignal(false)
  const [highlightedIndex, setHighlightedIndex] = createSignal(-1)

  const selectedOption = () => {
    if (!local.value) return null
    return local.options.find(option => option.value === local.value)
  }

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return
    local.onChange?.(option.value)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen()) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const next = prev + 1
          return next >= local.options.length ? 0 : next
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const next = prev - 1
          return next < 0 ? local.options.length - 1 : next
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex() >= 0) {
          const option = local.options[highlightedIndex()]
          if (option) {
            handleSelect(option)
          }
        }
        break
    }
  }

  return (
    <div class="space-y-2" {...others}>
      {(local.label ?? local.required) && (
        <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {local.label}
          {local.required && <span class="text-destructive ml-1">*</span>}
        </label>
      )}
      
      <div class="relative">
        <button
          type="button"
          class={cn(
            selectVariants({ variant: local.variant, size: local.size }),
            local.class,
          )}
          onClick={() => setIsOpen(!isOpen())}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen()}
          aria-haspopup="listbox"
        >
          <span class={cn(!selectedOption() && 'text-muted-foreground')}>
            {selectedOption()?.label ?? local.placeholder ?? 'Select an option...'}
          </span>
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
            class={cn('h-4 w-4 transition-transform', isOpen() && 'rotate-180')}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        
        <Show when={isOpen()}>
          <Portal>
            <div class="fixed inset-0 z-50" onClick={() => setIsOpen(false)}>
              <div
                class="relative z-50 min-w-32 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                onClick={(e) => e.stopPropagation()}
                style={{
                  top: '100%',
                  'margin-top': '0.25rem',
                }}
              >
                <div class="p-1">
                  <For each={local.options}>
                    {(option, index) => (
                      <div
                        class={cn(
                          'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground',
                          option.disabled && 'pointer-events-none opacity-50',
                          highlightedIndex() === index() && 'bg-accent',
                          local.value === option.value && 'bg-accent/50',
                        )}
                        onClick={() => handleSelect(option)}
                        onMouseEnter={() => setHighlightedIndex(index())}
                        role="option"
                        aria-selected={local.value === option.value}
                      >
                        <Show when={local.value === option.value}>
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
                            class="absolute left-2 h-4 w-4"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </Show>
                        
                        <div class="flex items-center gap-2">
                          <Show when={option.icon}>
                            <span class="h-4 w-4">{option.icon}</span>
                          </Show>
                          <div class="flex-1">
                            <div class="font-medium">{option.label}</div>
                            <Show when={option.description}>
                              <div class="text-xs text-muted-foreground">
                                {option.description}
                              </div>
                            </Show>
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </Portal>
        </Show>
      </div>
      
      {local.description && (
        <p class="text-xs text-muted-foreground">{local.description}</p>
      )}
      
      {local.error && (
        <p class="text-xs text-destructive mt-1">{local.error}</p>
      )}
    </div>
  )
}

// Multi-select component
export type MultiSelectProps = {
  class?: string
  label?: string
  description?: string
  error?: string
  required?: boolean
  placeholder?: string
  variant?: VariantProps<typeof selectVariants>['variant']
  size?: VariantProps<typeof selectVariants>['size']
  options: SelectOption[]
  value?: string[]
  onChange?: (value: string[]) => void
  maxVisible?: number
}

export const MultiSelect = (props: MultiSelectProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'label',
    'description',
    'error',
    'required',
    'placeholder',
    'variant',
    'size',
    'options',
    'value',
    'onChange',
    'maxVisible',
  ])

  const selectedOptions = () => {
    if (!local.value) return []
    return local.options.filter(option => local.value?.includes(option.value))
  }

  const remainingOptions = () => {
    if (!local.value) return local.options
    return local.options.filter(option => !local.value?.includes(option.value))
  }

  const handleRemove = (value: string) => {
    if (!local.onChange || !local.value) return
    local.onChange(local.value.filter(v => v !== value))
  }

  const handleAdd = (value: string) => {
    if (!local.onChange) return
    const current = local.value ?? []
    local.onChange([...current, value])
  }

  return (
    <div class="space-y-2" {...others}>
      {(local.label ?? local.required) && (
        <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {local.label}
          {local.required && <span class="text-destructive ml-1">*</span>}
        </label>
      )}
      
      <div class="flex flex-wrap gap-2 p-2 border rounded-md min-h-10">
        <For each={selectedOptions().slice(0, local.maxVisible ?? 5)}>
          {(option) => (
            <div class="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-2 py-1 text-sm">
              <Show when={option.icon}>
                <span class="h-3 w-3">{option.icon}</span>
              </Show>
              {option.label}
              <button
                type="button"
                onClick={() => handleRemove(option.value)}
                class="ml-1 hover:bg-primary/80 rounded-full p-0.5"
              >
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
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          )}
        </For>
        
        <Show when={selectedOptions().length > (local.maxVisible ?? 5)}>
          <div class="inline-flex items-center rounded-md bg-muted text-muted-foreground px-2 py-1 text-sm">
            +{selectedOptions().length - (local.maxVisible ?? 5)} more
          </div>
        </Show>
        
        <Select
          placeholder={local.placeholder}
          options={remainingOptions()}
          onChange={handleAdd}
          variant={local.variant}
          size={local.size}
          class="flex-1 min-w-0"
        />
      </div>
      
      {local.description && (
        <p class="text-xs text-muted-foreground">{local.description}</p>
      )}
      
      {local.error && (
        <p class="text-xs text-destructive mt-1">{local.error}</p>
      )}
    </div>
  )
}