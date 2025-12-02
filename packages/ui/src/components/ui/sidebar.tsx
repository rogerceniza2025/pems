import type { JSX } from 'solid-js'
import { For, Show, splitProps } from 'solid-js'

import { cn } from '../../lib/utils'

export type SidebarItem = {
  label: string
  icon?: JSX.Element
  active?: boolean
  disabled?: boolean
  badge?: string | number
  children?: JSX.Element
  onClick?: () => void
  items?: SidebarItem[]
}

export type SidebarProps = {
  class?: string
  items?: SidebarItem[]
  collapsed?: boolean
  collapsible?: boolean
  onToggle?: (collapsed: boolean) => void
  variant?: 'default' | 'floating' | 'glass'
  size?: 'sm' | 'default' | 'lg'
  position?: 'left' | 'right'
}

export const Sidebar = (props: SidebarProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'items',
    'collapsed',
    'collapsible',
    'onToggle',
    'variant',
    'size',
    'position',
  ])

  const handleToggle = () => {
    local.onToggle?.(!local.collapsed)
  }

  return (
    <aside
      class={cn(
        'flex flex-col border-r bg-background',
        local.position === 'right' && 'border-r-0 border-l',
        local.variant === 'floating' && 'rounded-lg border shadow-lg',
        local.variant === 'glass' && 'bg-background/80 backdrop-blur-sm',
        local.size === 'sm' && 'w-48',
        local.size === 'lg' && 'w-80',
        local.collapsed && 'w-16',
        local.class,
      )}
      {...others}
    >
      {/* Header */}
      <Show when={local.collapsible}>
        <div class="flex items-center justify-between p-4 border-b">
          <Show when={!local.collapsed}>
            <h2 class="text-lg font-semibold">Menu</h2>
          </Show>
          <button
            type="button"
            onClick={handleToggle}
            class="p-2 rounded-md hover:bg-accent"
            aria-label="Toggle sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <Show when={local.collapsed} fallback={<path d="M6 18L18 6M6 6l12 12" />}>
                <path d="M4 4h16M4 12h16M4 20h16" />
              </Show>
            </svg>
          </button>
        </div>
      </Show>

      {/* Navigation Items */}
      <div class="flex-1 overflow-y-auto p-4">
        <Show when={local.items && local.items.length > 0}>
          <For each={local.items}>
            {(item) => (
              <SidebarItem
                {...item}
                collapsed={local.collapsed}
                variant={local.variant === 'floating' || local.variant === 'glass' ? 'default' : local.variant}
              />
            )}
          </For>
        </Show>
      </div>

      {/* Footer */}
      <div class="mt-auto p-4 border-t">
        <Show when={!local.collapsed}>
          <div class="text-xs text-muted-foreground">
            Version 1.0.0
          </div>
        </Show>
      </div>
    </aside>
  )
}

export type SidebarItemProps = SidebarItem & {
  class?: string
  variant?: 'default' | 'ghost' | 'underline'
  collapsed?: boolean
  level?: number
}

export const SidebarItem = (props: SidebarItemProps) => {
  const [local, others] = splitProps(props, [
    'label',
    'icon',
    'active',
    'disabled',
    'badge',
    'children',
    'onClick',
    'items',
    'class',
    'variant',
    'collapsed',
    'level',
  ])

  const hasChildren = local.items && local.items.length > 0
  const level = local.level ?? 0

  const baseClasses = cn(
    'flex items-center space-x-3 text-sm font-medium transition-colors rounded-md px-3 py-2',
    local.active && 'bg-primary text-primary-foreground',
    !local.active && 'hover:bg-accent hover:text-accent-foreground',
    local.disabled && 'opacity-50 cursor-not-allowed',
    local.variant === 'ghost' && 'hover:bg-accent',
    local.variant === 'underline' && 'border-b-2 border-primary',
    local.collapsed && 'justify-center',
    local.class,
  )

  const content = (
    <>
      <Show when={local.icon && !local.collapsed}>
        <span class="h-4 w-4">{local.icon}</span>
      </Show>
      <Show when={!local.collapsed} fallback={local.icon && (
        <span class="h-4 w-4">{local.icon}</span>
      )}>
        <span class={cn('truncate', local.collapsed && 'sr-only')}>
          {local.label}
        </span>
      </Show>
      <Show when={local.badge && !local.collapsed}>
        <span class="ml-auto rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-xs font-medium">
          {local.badge}
        </span>
      </Show>
    </>
  )

  return (
    <div>
      <button
        type="button"
        class={baseClasses}
        onClick={local.onClick}
        disabled={local.disabled}
        title={local.collapsed ? local.label : undefined}
        {...others}
      >
        {content}
      </button>
      
      {/* Sub-items */}
      <Show when={hasChildren && !local.collapsed}>
        <div class={cn('ml-4 mt-1 space-y-1', level > 0 && 'ml-8')}>
          <For each={local.items}>
            {(subItem) => (
              <SidebarItem
                {...subItem}
                collapsed={local.collapsed}
                variant={local.variant}
                level={level + 1}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

// Sidebar Group
export type SidebarGroupProps = {
  class?: string
  title?: string
  children?: JSX.Element
  collapsible?: boolean
  collapsed?: boolean
  onToggle?: (collapsed: boolean) => void
}

export const SidebarGroup = (props: SidebarGroupProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'title',
    'children',
    'collapsible',
    'collapsed',
    'onToggle',
  ])

  const handleToggle = () => {
    local.onToggle?.(!local.collapsed)
  }

  return (
    <div class={cn('space-y-2', local.class)} {...others}>
      <Show when={local.title}>
        <div class="flex items-center justify-between px-3 py-2">
          <h3 class="text-sm font-semibold text-muted-foreground">
            {local.title}
          </h3>
          <Show when={local.collapsible}>
            <button
              type="button"
              onClick={handleToggle}
              class="p-1 rounded hover:bg-accent"
              aria-label="Toggle group"
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
                class={cn(
                  'transition-transform',
                  !local.collapsed && 'rotate-90',
                )}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </Show>
        </div>
      </Show>
      
      <Show when={!local.collapsed || !local.collapsible}>
        {local.children}
      </Show>
    </div>
  )
}

// Sidebar User Profile
export type SidebarProfileProps = {
  class?: string
  name?: string
  email?: string
  avatar?: string
  status?: 'online' | 'offline' | 'away' | 'busy'
  onSignOut?: () => void
}

export const SidebarProfile = (props: SidebarProfileProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'name',
    'email',
    'avatar',
    'status',
    'onSignOut',
  ])

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  }

  return (
    <div class={cn('p-4 border-b', local.class)} {...others}>
      <div class="flex items-center space-x-3">
        <div class="relative">
          <img
            src={local.avatar ?? 'https://via.placeholder.com/150'}
            alt={local.name}
            class="h-10 w-10 rounded-full object-cover"
          />
          <div
            class={cn(
              'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
              statusColors[local.status ?? 'offline'],
            )}
          />
        </div>
        
        <div class="flex-1 min-w-0">
          <div class="truncate font-medium">{local.name}</div>
          <div class="truncate text-sm text-muted-foreground">{local.email}</div>
        </div>
      </div>
      
      <Show when={local.onSignOut}>
        <button
          type="button"
          onClick={local.onSignOut}
          class="mt-3 w-full rounded-md bg-destructive text-destructive-foreground px-3 py-2 text-sm hover:bg-destructive/90"
        >
          Sign Out
        </button>
      </Show>
    </div>
  )
}