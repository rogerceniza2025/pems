import type { JSX } from 'solid-js'
import { For, Show, splitProps } from 'solid-js'

import { cn } from '../../lib/utils'

export type NavItem = {
  label: string
  href?: string
  icon?: JSX.Element
  active?: boolean
  disabled?: boolean
  badge?: string | number
  onClick?: () => void
  children?: JSX.Element
}

export type NavbarProps = {
  class?: string
  brand?: JSX.Element
  brandHref?: string
  items?: NavItem[]
  actions?: JSX.Element
  variant?: 'default' | 'sticky' | 'floating'
  size?: 'sm' | 'default' | 'lg'
  position?: 'static' | 'fixed' | 'sticky'
  collapsible?: boolean
  collapsed?: boolean
  onToggle?: (collapsed: boolean) => void
}

export const Navbar = (props: NavbarProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'brand',
    'brandHref',
    'items',
    'actions',
    'variant',
    'size',
    'position',
    'collapsible',
    'collapsed',
    'onToggle',
  ])

  const handleToggle = () => {
    local.onToggle?.(!local.collapsed)
  }

  return (
    <nav
      class={cn(
        'flex items-center justify-between border-b bg-background px-4 py-3',
        local.position === 'fixed' && 'fixed top-0 left-0 right-0 z-50',
        local.position === 'sticky' && 'sticky top-0 z-40',
        local.variant === 'floating' && 'rounded-lg border shadow-lg',
        local.size === 'sm' && 'py-2',
        local.size === 'lg' && 'py-4',
        local.class,
      )}
      {...others}
    >
      {/* Brand/Logo */}
      <Show when={local.brand}>
        <a
          href={local.brandHref}
          class="flex items-center space-x-2 text-lg font-semibold hover:text-primary"
        >
          {local.brand}
        </a>
      </Show>

      {/* Navigation Items */}
      <Show when={local.items && local.items.length > 0}>
        <div
          class={cn(
            'flex items-center space-x-6',
            local.collapsible && local.collapsed && 'hidden md:flex',
          )}
        >
          <For each={local.items}>
            {(item) => (
              <NavbarItem {...item} />
            )}
          </For>
        </div>
      </Show>

      {/* Actions */}
      <div class="flex items-center space-x-4">
        <Show when={local.actions}>
          {local.actions}
        </Show>
        
        {/* Collapse Toggle */}
        <Show when={local.collapsible}>
          <button
            type="button"
            onClick={handleToggle}
            class="md:hidden p-2 rounded-md hover:bg-accent"
            aria-label="Toggle navigation"
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
              <Show when={!local.collapsed} fallback={<path d="M6 18L18 6M6 6l12 12" />}>
                <path d="M4 6h16M4 12h16M4 18h16" />
              </Show>
            </svg>
          </button>
        </Show>
      </div>
    </nav>
  )
}

export type NavbarItemProps = NavItem & {
  class?: string
  variant?: 'default' | 'ghost' | 'underline'
}

export const NavbarItem = (props: NavbarItemProps) => {
  const [local, others] = splitProps(props, [
    'label',
    'href',
    'icon',
    'active',
    'disabled',
    'badge',
    'onClick',
    'children',
    'class',
    'variant',
  ])

  const baseClasses = cn(
    'flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary',
    local.active && 'text-primary',
    local.disabled && 'opacity-50 cursor-not-allowed',
    local.variant === 'ghost' && 'hover:bg-accent',
    local.variant === 'underline' && 'border-b-2 border-primary',
    local.class,
  )

  const content = (
    <>
      <Show when={local.icon}>
        <span class="h-4 w-4">{local.icon}</span>
      </Show>
      <Show when={local.children} fallback={local.label}>
        {local.children}
      </Show>
      <Show when={local.badge}>
        <span class="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-xs font-medium">
          {local.badge}
        </span>
      </Show>
    </>
  )

  return (
    <Show
      when={local.href}
      fallback={
        <button
          type="button"
          class={baseClasses}
          onClick={local.onClick}
          disabled={local.disabled}
          {...others}
        >
          {content}
        </button>
      }
    >
      <a
        href={local.href}
        class={baseClasses}
        onClick={local.onClick}
        {...others}
      >
        {content}
      </a>
    </Show>
  )
}

// Mobile Navigation (for collapsed navbar)
export type MobileNavProps = {
  class?: string
  items?: NavItem[]
  isOpen?: boolean
  onClose?: () => void
}

export const MobileNav = (props: MobileNavProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'items',
    'isOpen',
    'onClose',
  ])

  return (
    <Show when={local.isOpen}>
      <div class="fixed inset-0 z-50 md:hidden">
        <div
          class="fixed inset-0 bg-black/50"
          onClick={local.onClose}
        />
        <div
          class={cn(
            'fixed left-0 top-0 h-full w-64 bg-background p-4 shadow-lg',
            local.class,
          )}
          {...others}
        >
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold">Menu</h2>
            <button
              type="button"
              onClick={local.onClose}
              class="p-2 rounded-md hover:bg-accent"
              aria-label="Close navigation"
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
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div class="space-y-4">
            <For each={local.items}>
              {(item) => (
                <NavbarItem
                  {...item}
                  variant="ghost"
                  class="w-full justify-start py-3"
                  onClick={() => {
                    item.onClick?.()
                    local.onClose?.()
                  }}
                />
              )}
            </For>
          </div>
        </div>
      </div>
    </Show>
  )
}

// Breadcrumb Navigation
export type BreadcrumbItem = {
  label: string
  href?: string
  icon?: JSX.Element
  active?: boolean
}

export type BreadcrumbProps = {
  class?: string
  items: BreadcrumbItem[]
  separator?: JSX.Element
  home?: BreadcrumbItem
}

export const Breadcrumb = (props: BreadcrumbProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'items',
    'separator',
    'home',
  ])

  const defaultSeparator = (
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
      class="text-muted-foreground"
    >
      <path d="m9 18 6-6-6" />
    </svg>
  )

  return (
    <nav
      class={cn('flex items-center space-x-2 text-sm', local.class)}
      aria-label="Breadcrumb"
      {...others}
    >
      <Show when={local.home}>
        <Show when={local.home}>
          <Show when={local.home}>
            <a
              href={local.home?.href ?? '#'}
              class="flex items-center space-x-2 hover:text-primary"
            >
              <Show when={local.home?.icon} fallback={
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
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9,22 9,12 15,12" />
                </svg>
              }>
                {local.home?.icon}
              </Show>
              <span class="sr-only">Home</span>
            </a>
          </Show>
        </Show>
      </Show>

      <For each={local.items}>
        {(item, index) => (
          <>
            <Show when={index() > 0 || local.home}>
              <span class="text-muted-foreground">
                {local.separator ?? defaultSeparator}
              </span>
            </Show>
            
            <Show
              when={item.href}
              fallback={
                <span class={cn('font-medium', item.active && 'text-primary')}>
                  {item.label}
                </span>
              }
            >
              <a
                href={item.href}
                class={cn(
                  'flex items-center space-x-2 hover:text-primary',
                  item.active && 'text-primary font-medium',
                )}
              >
                <Show when={item.icon}>
                  <span class="h-4 w-4">{item.icon}</span>
                </Show>
                {item.label}
              </a>
            </Show>
          </>
        )}
      </For>
    </nav>
  )
}