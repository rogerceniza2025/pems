import type { JSX } from 'solid-js'
import { Show, splitProps } from 'solid-js'
import { Portal } from 'solid-js/web'

import * as DropdownMenuPrimitive from '@kobalte/core/dropdown-menu'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const dropdownMenuVariants = cva(
  'z-50 min-w-8rem overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
  {
    variants: {
      variant: {
        default: '',
        destructive: 'border-destructive/50 text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const dropdownItemVariants = cva(
  'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {
      variant: {
        default: '',
        destructive: 'text-destructive focus:bg-destructive/10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type DropdownMenuProps = DropdownMenuPrimitive.DropdownMenuRootProps & {
  class?: string
  children?: JSX.Element
}

export const DropdownMenu = (props: DropdownMenuProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])
  
  return (
    <DropdownMenuPrimitive.Root {...others}>
      {local.children}
    </DropdownMenuPrimitive.Root>
  )
}

export type DropdownMenuTriggerProps = DropdownMenuPrimitive.DropdownMenuTriggerProps & {
  class?: string
  children?: JSX.Element
}

export const DropdownMenuTrigger = (props: DropdownMenuTriggerProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <DropdownMenuPrimitive.Trigger
      class={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10 p-0',
        local.class,
      )}
      {...others}
    >
      {local.children}
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
        <path d="m6 9 6 6 6-6" />
      </svg>
    </DropdownMenuPrimitive.Trigger>
  )
}

export type DropdownMenuContentProps = DropdownMenuPrimitive.DropdownMenuContentProps & {
  class?: string
  children?: JSX.Element
  variant?: VariantProps<typeof dropdownMenuVariants>['variant']
}

export const DropdownMenuContent = (props: DropdownMenuContentProps) => {
  const [local, others] = splitProps(props, ['class', 'children', 'variant'])

  return (
    <Portal>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          class={cn(
            dropdownMenuVariants({ variant: local.variant }),
            local.class,
          )}
          {...others}
        >
          {local.children}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </Portal>
  )
}

export type DropdownMenuItemProps = DropdownMenuPrimitive.DropdownMenuItemProps & {
  class?: string
  children?: JSX.Element
  variant?: VariantProps<typeof dropdownItemVariants>['variant']
  shortcut?: string
  icon?: JSX.Element
}

export const DropdownMenuItem = (props: DropdownMenuItemProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'children',
    'variant',
    'shortcut',
    'icon',
  ])

  return (
    <DropdownMenuPrimitive.Item
      class={cn(dropdownItemVariants({ variant: local.variant }), local.class)}
      {...others}
    >
      <Show when={local.icon}>
        <span class="mr-2 h-4 w-4">{local.icon}</span>
      </Show>
      <span class="flex-1">{local.children}</span>
      <Show when={local.shortcut}>
        <span class="ml-auto text-xs tracking-widest opacity-60">
          {local.shortcut}
        </span>
      </Show>
    </DropdownMenuPrimitive.Item>
  )
}

export type DropdownMenuCheckboxItemProps = DropdownMenuPrimitive.DropdownMenuCheckboxItemProps & {
  class?: string
  children?: JSX.Element
}

export const DropdownMenuCheckboxItem = (props: DropdownMenuCheckboxItemProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <DropdownMenuPrimitive.CheckboxItem
      class={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        local.class,
      )}
      {...others}
    >
      <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
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
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {local.children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

export type DropdownMenuRadioItemProps = DropdownMenuPrimitive.DropdownMenuRadioItemProps & {
  class?: string
  children?: JSX.Element
}

export const DropdownMenuRadioItem = (props: DropdownMenuRadioItemProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <DropdownMenuPrimitive.RadioItem
      class={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        local.class,
      )}
      {...others}
    >
      <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
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
            <circle cx="12" cy="12" r="8" />
          </svg>
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {local.children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

export type DropdownMenuLabelProps = DropdownMenuPrimitive.DropdownMenuItemLabelProps & {
  class?: string
  children?: JSX.Element
}

export const DropdownMenuLabel = (props: DropdownMenuLabelProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <DropdownMenuPrimitive.ItemLabel
      class={cn('px-2 py-1.5 text-sm font-semibold', local.class)}
      {...others}
    >
      {local.children}
    </DropdownMenuPrimitive.ItemLabel>
  )
}

export type DropdownMenuSeparatorProps = DropdownMenuPrimitive.DropdownMenuSeparatorProps & {
  class?: string
}

export const DropdownMenuSeparator = (props: DropdownMenuSeparatorProps) => {
  const [local, others] = splitProps(props, ['class'])

  return (
    <DropdownMenuPrimitive.Separator
      class={cn('-mx-1 my-1 h-px bg-muted', local.class)}
      {...others}
    />
  )
}

export type DropdownMenuSubProps = DropdownMenuPrimitive.DropdownMenuSubProps & {
  class?: string
  children?: JSX.Element
}

export const DropdownMenuSub = (props: DropdownMenuSubProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])
  
  return (
    <DropdownMenuPrimitive.Sub {...others}>
      {local.children}
    </DropdownMenuPrimitive.Sub>
  )
}

export type DropdownMenuSubTriggerProps = DropdownMenuPrimitive.DropdownMenuSubTriggerProps & {
  class?: string
  children?: JSX.Element
}

export const DropdownMenuSubTrigger = (props: DropdownMenuSubTriggerProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <DropdownMenuPrimitive.SubTrigger
      class={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent',
        local.class,
      )}
      {...others}
    >
      {local.children}
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
        class="ml-auto h-4 w-4"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </DropdownMenuPrimitive.SubTrigger>
  )
}

export type DropdownMenuSubContentProps = DropdownMenuPrimitive.DropdownMenuSubContentProps & {
  class?: string
  children?: JSX.Element
}

export const DropdownMenuSubContent = (props: DropdownMenuSubContentProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <DropdownMenuPrimitive.SubContent
      class={cn(
        'z-50 min-w-8rem overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        local.class,
      )}
      {...others}
    >
      {local.children}
    </DropdownMenuPrimitive.SubContent>
  )
}

export type DropdownMenuGroupProps = DropdownMenuPrimitive.DropdownMenuGroupProps & {
  class?: string
  children?: JSX.Element
}

export const DropdownMenuGroup = (props: DropdownMenuGroupProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <DropdownMenuPrimitive.Group class={local.class} {...others}>
      {local.children}
    </DropdownMenuPrimitive.Group>
  )
}