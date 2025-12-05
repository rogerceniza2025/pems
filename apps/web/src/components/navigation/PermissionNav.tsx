import { Link, useLocation } from '@tanstack/solid-router'
import { clsx, type ClassValue } from 'clsx'
import { ChevronDown, Circle } from 'lucide-solid'
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  mergeProps,
  Show,
  splitProps,
  Switch,
  Match,
} from 'solid-js'
import { twMerge } from 'tailwind-merge'
import type { Permission } from '../../../../packages/infrastructure/auth/src/rbac'
import { usePermissionContext } from '../../contexts/PermissionContext'

// --- Types ---

export interface NavigationItem {
  path: string
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  label: string
  // Changed to allow Lucide components or strings
  icon?: Component<{ class?: string }> | string
  description?: string
  children?: NavigationItem[]
  systemOnly?: boolean
  tenantOnly?: boolean
  badge?: string | number
  external?: boolean
  disabled?: boolean
}

interface PermissionNavProps {
  items: NavigationItem[]
  mobile?: boolean
  horizontal?: boolean
  showIcons?: boolean
  showDescriptions?: boolean
  className?: string
  onItemClick?: (item: NavigationItem) => void
}

// --- Utilities ---

function classNames(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Recursive Nav Item Component ---

interface NavItemProps {
  item: NavigationItem
  depth: number
  activePath: string
  expandedItems: Set<string>
  toggleExpanded: (path: string) => void
  onItemClick?: (item: NavigationItem) => void
  showIcons: boolean
  showDescriptions: boolean
  horizontal: boolean
}

const NavItem: Component<NavItemProps> = (props) => {
  const hasChildren = () =>
    props.item.children && props.item.children.length > 0
  const isExpanded = () => props.expandedItems.has(props.item.path)

  // Check active state: Exact match for leaf, partial match for parents
  const isActive = () => {
    if (props.item.path === '/' && props.activePath === '/') return true
    if (props.item.path !== '/' && props.activePath.startsWith(props.item.path))
      return true
    return false
  }

  // Exact match specifically for styling the link itself differently than parents
  const isExactActive = () => props.activePath === props.item.path

  const handleClick = (e: MouseEvent) => {
    if (props.item.disabled) {
      e.preventDefault()
      return
    }

    if (hasChildren()) {
      e.preventDefault()
      props.toggleExpanded(props.item.path)
    }

    if (props.onItemClick) {
      props.onItemClick(props.item)
    }

    if (props.item.external) {
      e.preventDefault()
      window.open(props.item.path, '_blank')
    }
  }

  return (
    <li class="w-full" role="none">
      <Link
        href={props.item.path} // Tanstack Router uses href or to
        class={classNames(
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50',
          // Active State Logic
          isExactActive()
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
            : isActive() && hasChildren()
              ? 'text-slate-800 bg-slate-100/50 dark:text-slate-200 dark:bg-slate-800/50' // Parent of active child
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
          props.item.disabled && 'pointer-events-none opacity-50',
          props.horizontal && 'py-2',
        )}
        style={{
          'padding-left': props.horizontal
            ? undefined
            : `${props.depth * 12 + 12}px`,
        }} // Indentation for depth
        onClick={handleClick}
        role="menuitem"
        aria-current={isExactActive() ? 'page' : undefined}
        aria-expanded={hasChildren() ? isExpanded() : undefined}
      >
        {props.showIcons && (
          <span
            class={classNames(
              'flex size-5 shrink-0 items-center justify-center transition-colors',
              isActive()
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300',
            )}
            aria-hidden="true"
          >
            <Show
              when={props.item.icon}
              fallback={<Circle class="size-2 fill-current opacity-50" />}
            >
              {/* Support for string icons (emojis) */}
              <Show when={typeof props.item.icon === 'string'}>
                <span class="text-lg leading-none">{props.item.icon as string}</span>
              </Show>

              {/* Support for Lucide components - simplified approach */}
              <Show when={typeof props.item.icon === 'function'}>
                {/* @ts-ignore - Dynamic component rendering simplified */}
                <props.item.icon class="size-5" />
              </Show>
            </Show>
          </span>
        )}

        <div class="flex flex-1 flex-col overflow-hidden text-left">
          <span class="truncate leading-none">{props.item.label}</span>
          {props.showDescriptions && props.item.description && (
            <span class="mt-0.5 truncate text-xs font-normal opacity-70">
              {props.item.description}
            </span>
          )}
        </div>

        {props.item.badge && (
          <span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
            {props.item.badge}
          </span>
        )}

        {hasChildren() && (
          <span
            class={classNames(
              'ml-auto pl-2 text-slate-400 transition-transform duration-200',
              isExpanded() && 'rotate-180',
            )}
          >
            <ChevronDown class="size-4" />
          </span>
        )}
      </Link>

      {/* Smooth Expand/Collapse Animation using Grid Template Rows */}
      <Show when={hasChildren()}>
        <div
          class={classNames(
            'grid transition-[grid-template-rows] duration-200 ease-out',
            isExpanded() ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <ul class="overflow-hidden">
            <For each={props.item.children}>
              {(child) => (
                <NavItem
                  item={child}
                  depth={props.depth + 1}
                  activePath={props.activePath}
                  expandedItems={props.expandedItems}
                  toggleExpanded={props.toggleExpanded}
                  onItemClick={props.onItemClick}
                  showIcons={props.showIcons}
                  showDescriptions={props.showDescriptions}
                  horizontal={props.horizontal}
                />
              )}
            </For>
          </ul>
        </div>
      </Show>
    </li>
  )
}

// --- Main Component ---

export const PermissionNav: Component<PermissionNavProps> = (props) => {
  // Merge default props
  const merged = mergeProps(
    {
      mobile: false,
      horizontal: false,
      showIcons: true,
      showDescriptions: false,
      className: '',
    },
    props,
  )

  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSystemAdmin,
    tenantId,
  } = usePermissionContext()

  const location = useLocation()
  const [expandedItems, setExpandedItems] = createSignal<Set<string>>(new Set())

  // Logic: Recursively check if item is visible
  const isItemVisible = (item: NavigationItem): boolean => {
    if (item.systemOnly && !isSystemAdmin()) return false
    if (item.tenantOnly && !tenantId) return false

    if (item.permission && !hasPermission(item.permission, tenantId))
      return false

    if (item.permissions && item.permissions.length > 0) {
      if (item.requireAll && !hasAllPermissions(item.permissions, tenantId))
        return false
      if (!item.requireAll && !hasAnyPermission(item.permissions, tenantId))
        return false
    }

    return true
  }

  // Logic: Recursively filter the tree
  const filterTree = (items: NavigationItem[]): NavigationItem[] => {
    return items.reduce<NavigationItem[]>((acc, item) => {
      // 1. Check strict visibility of this specific item
      if (!isItemVisible(item)) return acc

      // 2. Process children
      let filteredChildren: NavigationItem[] | undefined = undefined
      if (item.children) {
        filteredChildren = filterTree(item.children)
        // If it has children defined but filter returns 0, and it has no link itself, hide it?
        // (Optional rule: Hide parent if all children are hidden)
        // if (filteredChildren.length === 0 && !item.path) return acc
      }

      // 3. Construct new item
      acc.push({
        ...item,
        children: filteredChildren,
      })

      return acc
    }, [])
  }

  // Memoize the filtered list so it doesn't run on every render/click
  const visibleItems = createMemo(() => filterTree(merged.items))

  // Auto-expand parents when URL changes or on mount
  createEffect(() => {
    const currentPath = location.pathname
    const newExpanded = new Set(expandedItems())
    let hasChanges = false

    const checkExpand = (items: NavigationItem[]) => {
      for (const item of items) {
        // If this item is a parent of the current path
        if (
          item.children &&
          currentPath.startsWith(item.path) &&
          item.path !== '/'
        ) {
          if (!newExpanded.has(item.path)) {
            newExpanded.add(item.path)
            hasChanges = true
          }
          checkExpand(item.children)
        }
      }
    }

    checkExpand(visibleItems())

    if (hasChanges) {
      setExpandedItems(newExpanded)
    }
  })

  const toggleExpanded = (itemPath: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemPath)) next.delete(itemPath)
      else next.add(itemPath)
      return next
    })
  }

  return (
    <nav
      class={classNames(
        'flex flex-col w-full h-full py-4',
        merged.horizontal ? 'flex-row items-center h-auto py-2' : 'space-y-1',
        merged.className,
      )}
      data-testid="permission-nav"
    >
      <ul
        class={classNames(
          'flex w-full gap-1',
          merged.horizontal ? 'flex-row items-center' : 'flex-col',
        )}
        role="menubar"
      >
        <For each={visibleItems()}>
          {(item) => (
            <NavItem
              item={item}
              depth={0}
              activePath={location.pathname}
              expandedItems={expandedItems()}
              toggleExpanded={toggleExpanded}
              onItemClick={merged.onItemClick}
              showIcons={merged.showIcons}
              showDescriptions={merged.showDescriptions}
              horizontal={merged.horizontal}
            />
          )}
        </For>
      </ul>
    </nav>
  )
}

/**
 * Default navigation items for the application
 */
export const defaultNavigationItems: NavigationItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: '📊',
    description: 'Overview and statistics',
  },
  {
    path: '/users',
    permission: 'users:read',
    label: 'Users',
    icon: '👥',
    description: 'User management',
    children: [
      {
        path: '/users',
        permission: 'users:read',
        label: 'User List',
        description: 'View all users',
      },
      {
        path: '/users/create',
        permission: 'users:create',
        label: 'Add User',
        description: 'Create new user',
      },
      {
        path: '/users/import',
        permission: 'users:manage_roles',
        label: 'Import Users',
        description: 'Bulk import users',
      },
    ],
  },
  {
    path: '/transactions',
    permission: 'transactions:read',
    label: 'Transactions',
    icon: '💳',
    description: 'Transaction management',
    children: [
      {
        path: '/transactions',
        permission: 'transactions:read',
        label: 'Transaction List',
        description: 'View all transactions',
      },
      {
        path: '/transactions/create',
        permission: 'transactions:create',
        label: 'New Transaction',
        description: 'Create transaction',
      },
      {
        path: '/transactions/approve',
        permission: 'transactions:approve',
        label: 'Approve Transactions',
        description: 'Approve pending transactions',
      },
      {
        path: '/transactions/cancel',
        permission: 'transactions:cancel',
        label: 'Cancel Transactions',
        description: 'Cancel transactions',
      },
    ],
  },
  {
    path: '/reports',
    permission: 'reports:read',
    label: 'Reports',
    icon: '📈',
    description: 'Reports and analytics',
    children: [
      {
        path: '/reports',
        permission: 'reports:read',
        label: 'View Reports',
        description: 'Browse reports',
      },
      {
        path: '/reports/export',
        permission: 'reports:export',
        label: 'Export Reports',
        description: 'Export data',
      },
      {
        path: '/reports/audit',
        permission: 'reports:audit',
        label: 'Audit Reports',
        description: 'Audit logs and reports',
      },
    ],
  },
  {
    path: '/tenants',
    permission: 'tenants:read',
    systemOnly: false, // Tenant admins can read tenants
    label: 'Tenant Management',
    icon: '🏢',
    description: 'Multi-tenant management',
    children: [
      {
        path: '/tenants',
        permission: 'tenants:read',
        label: 'Tenant List',
        description: 'View all tenants',
      },
      {
        path: '/tenants/create',
        permission: 'tenants:create',
        systemOnly: true,
        label: 'Create Tenant',
        description: 'Create new tenant',
      },
      {
        path: '/tenants/update',
        permission: 'tenants:update',
        systemOnly: true,
        label: 'Update Tenant',
        description: 'Update tenant settings',
      },
    ],
  },
  {
    path: '/system/config',
    permission: 'system:config',
    systemOnly: true,
    label: 'System Configuration',
    icon: '⚙️',
    description: 'System settings',
  },
  {
    path: '/system/audit',
    permission: 'system:audit',
    systemOnly: true,
    label: 'System Audit',
    icon: '🔍',
    description: 'System audit logs',
  },
]

// import { Link } from '@tanstack/solid-router'
// import { clsx, type ClassValue } from 'clsx'
// import { ChevronDown, ChevronRight, Circle } from 'lucide-solid'
// import { createSignal, For, onMount, ParentComponent, Show } from 'solid-js'
// import { twMerge } from 'tailwind-merge'
// import type { Permission } from '../../../../packages/infrastructure/auth/src/rbac'
// import { usePermissionContext } from '../../contexts/PermissionContext'

// // Utility for class merging
// function cn(...inputs: ClassValue[]) {
//   return twMerge(clsx(inputs))
// }

// /**
//  * Navigation Item Interface
//  */
// export interface NavigationItem {
//   path: string
//   permission?: Permission
//   permissions?: Permission[]
//   requireAll?: boolean
//   label: string
//   icon?: string
//   description?: string
//   children?: NavigationItem[]
//   systemOnly?: boolean
//   tenantOnly?: boolean
//   badge?: string | number
//   external?: boolean
//   disabled?: boolean
// }

// /**
//  * PermissionNav Props
//  */
// interface PermissionNavProps {
//   items: NavigationItem[]
//   mobile?: boolean
//   horizontal?: boolean
//   showIcons?: boolean
//   showDescriptions?: boolean
//   className?: string
//   onItemClick?: (item: NavigationItem) => void
// }

// /**
//  * PermissionNav Component
//  *
//  * A navigation component that automatically filters navigation items based on user permissions.
//  * Supports nested navigation, mobile responsiveness, and various display modes.
//  */
// export const PermissionNav: ParentComponent<PermissionNavProps> = (props) => {
//   const {
//     items,
//     mobile = false,
//     horizontal = false,
//     showIcons = true,
//     showDescriptions = false,
//     className = '',
//     onItemClick,
//   } = props

//   const {
//     hasPermission,
//     hasAnyPermission,
//     hasAllPermissions,
//     isSystemAdmin,
//     tenantId,
//   } = usePermissionContext()
//   const [activePath, setActivePath] = createSignal<string>('')
//   const [expandedItems, setExpandedItems] = createSignal<Set<string>>(new Set())

//   // Set active path based on current location
//   onMount(() => {
//     if (typeof window !== 'undefined') {
//       setActivePath(window.location.pathname)
//     }
//   })

//   // Check if item should be visible based on permissions
//   const isItemVisible = (item: NavigationItem): boolean => {
//     // Check system-only items
//     if (item.systemOnly && !isSystemAdmin()) {
//       return false
//     }

//     // Check tenant-only items
//     if (item.tenantOnly && !tenantId) {
//       return false
//     }

//     // Check permissions
//     if (item.permission) {
//       return hasPermission(item.permission, tenantId)
//     }

//     if (item.permissions && item.permissions.length > 0) {
//       if (item.requireAll) {
//         return hasAllPermissions(item.permissions, tenantId)
//       } else {
//         return hasAnyPermission(item.permissions, tenantId)
//       }
//     }

//     // No permissions required
//     return true
//   }

//   // Filter navigation items based on permissions
//   const filterItems = (items: NavigationItem[]): NavigationItem[] => {
//     return items.filter((item) => {
//       // Check if parent item is visible
//       if (!isItemVisible(item)) {
//         return false
//       }

//       // Check children
//       if (item.children && item.children.length > 0) {
//         const visibleChildren = filterItems(item.children)
//         if (visibleChildren.length === 0) {
//           return false // Hide parent if no visible children
//         }
//         // Update children with filtered results
//         item.children = visibleChildren
//       }

//       return true
//     })
//   }

//   // Toggle expanded state for nested items
//   const toggleExpanded = (itemPath: string) => {
//     const current = new Set(expandedItems())
//     if (current.has(itemPath)) {
//       current.delete(itemPath)
//     } else {
//       current.add(itemPath)
//     }
//     setExpandedItems(current)
//   }

//   // Check if item is active
//   const isItemActive = (item: NavigationItem): boolean => {
//     const currentPath = activePath()
//     if (currentPath === item.path) {
//       return true
//     }

//     // Check if any child is active
//     if (item.children) {
//       return item.children.some((child) => isItemActive(child))
//     }

//     return false
//   }

//   // Handle item click
//   const handleItemClick = (item: NavigationItem, event: MouseEvent) => {
//     // If it has children, we might want to toggle expand AND navigate, or just toggle.
//     // Usually sidebar parents toggle.
//     if (item.children && item.children.length > 0) {
//       event.preventDefault()
//       toggleExpanded(item.path)
//       return
//     }

//     // Call custom handler
//     if (onItemClick) {
//       onItemClick(item)
//     }

//     // Navigate if it's a regular link
//     if (!item.external && item.path) {
//       if (typeof window !== 'undefined') {
//         // Update active path immediately for better UX
//         setActivePath(item.path)
//       }
//     } else if (item.external && item.path) {
//       event.preventDefault()
//       window.open(item.path, '_blank')
//     }
//   }

//   // Get filtered items
//   const visibleItems = () => filterItems(items)

//   return (
//     <nav
//       class={classNames(
//         'flex flex-col w-full h-full py-4',
//         horizontal ? 'flex-row items-center h-auto py-2' : 'space-y-1',
//         className,
//       )}
//       data-testid="permission-nav"
//     >
//       <ul
//         class={classNames(
//           'flex w-full gap-1',
//           horizontal ? 'flex-row items-center' : 'flex-col',
//         )}
//         role="menubar"
//         data-testid="nav-list"
//       >
//         <For each={visibleItems()}>
//           {(item) => {
//             const isActive = () => isItemActive(item)
//             const isExpanded = () => expandedItems().has(item.path)
//             const hasChildren = () => item.children && item.children.length > 0

//             return (
//               <li class="w-full" role="none">
//                 <Link
//                   to={item.path}
//                   class={classNames(
//                     'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
//                     isActive()
//                       ? 'bg-primary/10 text-primary hover:bg-primary/15'
//                       : 'text-muted-foreground hover:bg-accent hover:text-foreground',
//                     item.disabled && 'pointer-events-none opacity-50',
//                     horizontal && 'py-2',
//                   )}
//                   onClick={(e) => handleItemClick(item, e)}
//                   disabled={item.disabled}
//                   role="menuitem"
//                   aria-current={isActive() ? 'page' : undefined}
//                   aria-expanded={hasChildren() ? isExpanded() : undefined}
//                   data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
//                 >
//                   {showIcons && (
//                     <span
//                       class={classNames(
//                         'flex size-5 shrink-0 items-center justify-center transition-colors',
//                         isActive()
//                           ? 'text-primary'
//                           : 'text-muted-foreground group-hover:text-foreground',
//                       )}
//                       aria-hidden="true"
//                     >
//                       {item.icon ? (
//                         <span class="text-lg leading-none">{item.icon}</span>
//                       ) : (
//                         <Circle class="size-2 fill-current opacity-50" />
//                       )}
//                     </span>
//                   )}

//                   <div class="flex flex-1 flex-col overflow-hidden">
//                     <span class="truncate leading-none">{item.label}</span>
//                     {showDescriptions && item.description && (
//                       <span class="mt-0.5 truncate text-xs font-normal text-muted-foreground/70 group-hover:text-muted-foreground">
//                         {item.description}
//                       </span>
//                     )}
//                   </div>

//                   {item.badge && (
//                     <span
//                       class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-sm"
//                       aria-label={`${item.badge} notifications`}
//                     >
//                       {item.badge}
//                     </span>
//                   )}

//                   {hasChildren() && (
//                     <span class="ml-auto pl-2 text-muted-foreground/50 transition-transform duration-200 group-hover:text-foreground">
//                       {isExpanded() ? (
//                         <ChevronDown class="size-4" />
//                       ) : (
//                         <ChevronRight class="size-4" />
//                       )}
//                     </span>
//                   )}
//                 </Link>

//                 {/* Nested navigation */}
//                 <Show when={hasChildren() && isExpanded()}>
//                   <div class="relative ml-3 mt-1 pl-3 border-l border-border/50">
//                     <ul
//                       class="flex flex-col gap-0.5"
//                       role="menu"
//                       data-testid="nav-children"
//                     >
//                       <For each={item.children}>
//                         {(child) => {
//                           const isChildActive = () => isItemActive(child)

//                           return (
//                             <li role="none">
//                               <Link
//                                 to={child.path}
//                                 class={classNames(
//                                   'group/child flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
//                                   isChildActive()
//                                     ? 'bg-accent/50 text-foreground font-medium'
//                                     : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
//                                   child.disabled &&
//                                     'pointer-events-none opacity-50',
//                                 )}
//                                 onClick={(e) => handleItemClick(child, e)}
//                                 disabled={child.disabled}
//                                 role="menuitem"
//                                 aria-current={
//                                   isChildActive() ? 'page' : undefined
//                                 }
//                                 data-testid={`nav-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
//                               >
//                                 {showIcons && child.icon && (
//                                   <span
//                                     class="flex size-4 shrink-0 items-center justify-center"
//                                     aria-hidden="true"
//                                   >
//                                     <span class="text-base leading-none">
//                                       {child.icon}
//                                     </span>
//                                   </span>
//                                 )}

//                                 <span class="truncate">{child.label}</span>

//                                 {child.badge && (
//                                   <span
//                                     class="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium text-muted-foreground"
//                                     aria-label={`${child.badge} notifications`}
//                                   >
//                                     {child.badge}
//                                   </span>
//                                 )}
//                               </Link>
//                             </li>
//                           )
//                         }}
//                       </For>
//                     </ul>
//                   </div>
//                 </Show>
//               </li>
//             )
//           }}
//         </For>
//       </ul>
//     </nav>
//   )
// }

// /**
//  * Default navigation items for the application
//  */
// export const defaultNavigationItems: NavigationItem[] = [
//   {
//     path: '/',
//     label: 'Dashboard',
//     icon: '📊',
//     description: 'Overview and statistics',
//   },
//   {
//     path: '/users',
//     permission: 'users:read',
//     label: 'Users',
//     icon: '👥',
//     description: 'User management',
//     children: [
//       {
//         path: '/users',
//         permission: 'users:read',
//         label: 'User List',
//         description: 'View all users',
//       },
//       {
//         path: '/users/create',
//         permission: 'users:create',
//         label: 'Add User',
//         description: 'Create new user',
//       },
//       {
//         path: '/users/import',
//         permission: 'users:manage_roles',
//         label: 'Import Users',
//         description: 'Bulk import users',
//       },
//     ],
//   },
//   {
//     path: '/transactions',
//     permission: 'transactions:read',
//     label: 'Transactions',
//     icon: '💳',
//     description: 'Transaction management',
//     children: [
//       {
//         path: '/transactions',
//         permission: 'transactions:read',
//         label: 'Transaction List',
//         description: 'View all transactions',
//       },
//       {
//         path: '/transactions/create',
//         permission: 'transactions:create',
//         label: 'New Transaction',
//         description: 'Create transaction',
//       },
//       {
//         path: '/transactions/approve',
//         permission: 'transactions:approve',
//         label: 'Approve Transactions',
//         description: 'Approve pending transactions',
//       },
//       {
//         path: '/transactions/cancel',
//         permission: 'transactions:cancel',
//         label: 'Cancel Transactions',
//         description: 'Cancel transactions',
//       },
//     ],
//   },
//   {
//     path: '/reports',
//     permission: 'reports:read',
//     label: 'Reports',
//     icon: '📈',
//     description: 'Reports and analytics',
//     children: [
//       {
//         path: '/reports',
//         permission: 'reports:read',
//         label: 'View Reports',
//         description: 'Browse reports',
//       },
//       {
//         path: '/reports/export',
//         permission: 'reports:export',
//         label: 'Export Reports',
//         description: 'Export data',
//       },
//       {
//         path: '/reports/audit',
//         permission: 'reports:audit',
//         label: 'Audit Reports',
//         description: 'Audit logs and reports',
//       },
//     ],
//   },
//   {
//     path: '/tenants',
//     permission: 'tenants:read',
//     systemOnly: false, // Tenant admins can read tenants
//     label: 'Tenant Management',
//     icon: '🏢',
//     description: 'Multi-tenant management',
//     children: [
//       {
//         path: '/tenants',
//         permission: 'tenants:read',
//         label: 'Tenant List',
//         description: 'View all tenants',
//       },
//       {
//         path: '/tenants/create',
//         permission: 'tenants:create',
//         systemOnly: true,
//         label: 'Create Tenant',
//         description: 'Create new tenant',
//       },
//       {
//         path: '/tenants/update',
//         permission: 'tenants:update',
//         systemOnly: true,
//         label: 'Update Tenant',
//         description: 'Update tenant settings',
//       },
//     ],
//   },
//   {
//     path: '/system/config',
//     permission: 'system:config',
//     systemOnly: true,
//     label: 'System Configuration',
//     icon: '⚙️',
//     description: 'System settings',
//   },
//   {
//     path: '/system/audit',
//     permission: 'system:audit',
//     systemOnly: true,
//     label: 'System Audit',
//     icon: '🔍',
//     description: 'System audit logs',
//   },
// ]
