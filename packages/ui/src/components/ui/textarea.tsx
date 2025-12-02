import { createSignal, onMount, splitProps } from 'solid-js'

import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const textareaVariants = cva(
  'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: '',
        destructive: 'border-destructive text-destructive focus-visible:ring-destructive',
        success: 'border-green-600 text-green-600 focus-visible:ring-green-600',
        warning: 'border-yellow-600 text-yellow-600 focus-visible:ring-yellow-600',
      },
      size: {
        sm: 'min-h-[60px] px-2 py-1.5 text-xs',
        default: 'min-h-[80px] px-3 py-2 text-sm',
        lg: 'min-h-[120px] px-4 py-3 text-base',
      },
      resize: {
        none: 'resize-none',
        vertical: 'resize-y',
        horizontal: 'resize-x',
        both: 'resize',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      resize: 'vertical',
    },
  },
)

export type TextareaProps = {
  class?: string
  label?: string
  description?: string
  error?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  value?: string
  onChange?: (value: string) => void
  onInput?: (value: string) => void
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
  variant?: VariantProps<typeof textareaVariants>['variant']
  size?: VariantProps<typeof textareaVariants>['size']
  resize?: VariantProps<typeof textareaVariants>['resize']
  rows?: number
  maxLength?: number
  showCharCount?: boolean
  autoResize?: boolean
  id?: string
}

export const Textarea = (props: TextareaProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'label',
    'description',
    'error',
    'required',
    'placeholder',
    'disabled',
    'readonly',
    'value',
    'onChange',
    'onInput',
    'onFocus',
    'onBlur',
    'variant',
    'size',
    'resize',
    'rows',
    'maxLength',
    'showCharCount',
    'autoResize',
    'id',
  ])

  const [textareaElement, setTextareaElement] = createSignal<HTMLTextAreaElement>()
  const [charCount, setCharCount] = createSignal(0)

  const handleInput = (e: Event & { target: HTMLTextAreaElement }) => {
    const value = e.target.value
    setCharCount(value.length)
    local.onInput?.(value)
    local.onChange?.(value)
    
    if (local.autoResize && textareaElement()) {
      autoResizeTextarea(textareaElement()!)
    }
  }

  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  onMount(() => {
    if (local.value) {
      setCharCount(local.value.length)
    }
    
    if (local.autoResize && textareaElement()) {
      autoResizeTextarea(textareaElement()!)
    }
  })

  return (
    <div class="space-y-2" {...others}>
      {(local.label ?? local.required) && (
        <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {local.label}
          {local.required && <span class="text-destructive ml-1">*</span>}
        </label>
      )}
      
      <div class="relative">
        <textarea
          ref={setTextareaElement}
          id={local.id}
          class={cn(
            textareaVariants({ 
              variant: local.variant, 
              size: local.size, 
              resize: local.autoResize ? 'none' : local.resize 
            }),
            local.class,
          )}
          placeholder={local.placeholder}
          disabled={local.disabled}
          readonly={local.readonly}
          value={local.value}
          rows={local.rows}
          maxLength={local.maxLength}
          onInput={handleInput}
          onFocus={local.onFocus}
          onBlur={local.onBlur}
        />
        
        {local.showCharCount && local.maxLength && (
          <div class="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {charCount()}/{local.maxLength}
          </div>
        )}
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

// Rich Textarea with formatting toolbar
export type RichTextareaProps = {
  class?: string
  label?: string
  description?: string
  error?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  value?: string
  onChange?: (value: string) => void
  variant?: VariantProps<typeof textareaVariants>['variant']
  size?: VariantProps<typeof textareaVariants>['size']
  rows?: number
  maxLength?: number
  showCharCount?: boolean
  toolbar?: boolean
}

export const RichTextarea = (props: RichTextareaProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'label',
    'description',
    'error',
    'required',
    'placeholder',
    'disabled',
    'value',
    'onChange',
    'variant',
    'size',
    'rows',
    'maxLength',
    'showCharCount',
    'toolbar',
  ])

  const [textareaElement] = createSignal<HTMLTextAreaElement>()
  const [isBold, setIsBold] = createSignal(false)
  const [isItalic, setIsItalic] = createSignal(false)
  const [isUnderline, setIsUnderline] = createSignal(false)

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaElement()
    if (!textarea) return

    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? 0
    const selectedText = textarea.value.substring(start, end)
    const newText = before + selectedText + after
    
    const newValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end)
    local.onChange?.(newValue)
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    }, 0)
  }

  const formatText = (command: string) => {
    switch (command) {
      case 'bold':
        insertText('**', '**')
        setIsBold(!isBold())
        break
      case 'italic':
        insertText('*', '*')
        setIsItalic(!isItalic())
        break
      case 'underline':
        insertText('<u>', '</u>')
        setIsUnderline(!isUnderline())
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
      
      {local.toolbar && (
        <div class="flex items-center gap-1 p-2 border rounded-t-md bg-muted">
          <button
            type="button"
            class={cn(
              'p-2 rounded hover:bg-accent',
              isBold() && 'bg-accent text-accent-foreground'
            )}
            onClick={() => formatText('bold')}
            disabled={local.disabled}
            title="Bold (Ctrl+B)"
          >
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
              <path d="M6 4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a4 4 0 0 1 4-4" />
              <path d="M14 12a4 4 0 0 1-4 4H6" />
            </svg>
          </button>
          
          <button
            type="button"
            class={cn(
              'p-2 rounded hover:bg-accent',
              isItalic() && 'bg-accent text-accent-foreground'
            )}
            onClick={() => formatText('italic')}
            disabled={local.disabled}
            title="Italic (Ctrl+I)"
          >
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
              <line x1="19" x2="10" y1="4" y2="4" />
              <path d="M14 20H10" />
              <line x1="14" x2="5" y1="20" y2="20" />
            </svg>
          </button>
          
          <button
            type="button"
            class={cn(
              'p-2 rounded hover:bg-accent',
              isUnderline() && 'bg-accent text-accent-foreground'
            )}
            onClick={() => formatText('underline')}
            disabled={local.disabled}
            title="Underline (Ctrl+U)"
          >
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
              <path d="M6 4v6a6 6 0 0 0 6 6v4" />
              <path d="M18 20v-6a6 6 0 0 0-6-6" />
            </svg>
          </button>
        </div>
      )}
      
      <Textarea
        class={cn(
          local.toolbar && 'rounded-t-none',
          local.class,
        )}
        placeholder={local.placeholder}
        disabled={local.disabled}
        value={local.value}
        onChange={local.onChange}
        variant={local.variant}
        size={local.size}
        rows={local.rows}
        maxLength={local.maxLength}
        showCharCount={local.showCharCount}
      />
      
      {local.description && (
        <p class="text-xs text-muted-foreground">{local.description}</p>
      )}
      
      {local.error && (
        <p class="text-xs text-destructive mt-1">{local.error}</p>
      )}
    </div>
  )
}