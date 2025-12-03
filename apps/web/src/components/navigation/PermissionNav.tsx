import { createSignal, For, Show, ParentComponent, onMount } from 'solid-js'
import { A } from '@tanstack/solid-router'
import { usePermissionContext } from '../../contexts/PermissionContext'
import type { Permission } from '../../../../packages/infrastructure/auth/src/rbac'

/**
 * Navigation Item Interface
 */
export interface NavigationItem {
  path: string
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  label: string
  icon?: string
  description?: string
  children?: NavigationItem[]
  systemOnly?: boolean
  tenantOnly?: boolean
  badge?: string | number
  external?: boolean
  disabled?: boolean
}

/**
 * PermissionNav Props
 */
interface PermissionNavProps {
  items: NavigationItem[]
  mobile?: boolean
  horizontal?: boolean
  showIcons?: boolean
  showDescriptions?: boolean
  className?: string
  onItemClick?: (item: NavigationItem) => void
}

/**
 * PermissionNav Component
 * 
 * A navigation component that automatically filters navigation items based on user permissions.
 * Supports nested navigation, mobile responsiveness, and various display modes.
 */
export const PermissionNav: ParentComponent<PermissionNavProps> = (props) => {
  const {
    items,
    mobile = false,
    horizontal = false,
    showIcons = true,
    showDescriptions = false,
    className = '',
    onItemClick,
  } = props
  
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSystemAdmin, user, tenantId } = usePermissionContext()
  const [activePath, setActivePath] = createSignal<string>('')
  const [expandedItems, setExpandedItems] = createSignal<Set<string>>(new Set())

  // Set active path based on current location
  onMount(() => {
    if (typeof window !== 'undefined') {
      setActivePath(window.location.pathname)
    }
  })

  // Check if item should be visible based on permissions
  const isItemVisible = (item: NavigationItem): boolean => {
    // Check system-only items
    if (item.systemOnly && !isSystemAdmin()) {
      return false
    }

    // Check tenant-only items
    if (item.tenantOnly && !tenantId()) {
      return false
    }

    // Check permissions
    if (item.permission) {
      return hasPermission(item.permission, tenantId())
    }

    if (item.permissions && item.permissions.length > 0) {
      if (item.requireAll) {
        return hasAllPermissions(item.permissions, tenantId())
      } else {
        return hasAnyPermission(item.permissions, tenantId())
      }
    }

    // No permissions required
    return true
  }

  // Filter navigation items based on permissions
  const filterItems = (items: NavigationItem[]): NavigationItem[] => {
    return items.filter(item => {
      // Check if parent item is visible
      if (!isItemVisible(item)) {
        return false
      }

      // Check children
      if (item.children && item.children.length > 0) {
        const visibleChildren = filterItems(item.children)
        if (visibleChildren.length === 0) {
          return false // Hide parent if no visible children
        }
        // Update children with filtered results
        item.children = visibleChildren
      }

      return true
    })
  }

  // Toggle expanded state for nested items
  const toggleExpanded = (itemPath: string) => {
    const current = new Set(expandedItems())
    if (current.has(itemPath)) {
      current.delete(itemPath)
    } else {
      current.add(itemPath)
    }
    setExpandedItems(current)
  }

  // Check if item is active
  const isItemActive = (item: NavigationItem): boolean => {
    const currentPath = activePath()
    if (currentPath === item.path) {
      return true
    }

    // Check if any child is active
    if (item.children) {
      return item.children.some(child => isItemActive(child))
    }

    return false
  }

  // Handle item click
  const handleItemClick = (item: NavigationItem, event: MouseEvent) => {
    event.preventDefault()
    
    // Handle nested navigation
    if (item.children && item.children.length > 0) {
      toggleExpanded(item.path)
      return
    }

    // Call custom handler
    if (onItemClick) {
      onItemClick(item)
    }

    // Navigate if it's a regular link
    if (!item.external && item.path) {
      if (typeof window !== 'undefined') {
        window.location.href = item.path
      }
    } else if (item.external && item.path) {
      window.open(item.path, '_blank')
    }
  }

  // Get filtered items
  const visibleItems = () => filterItems(items)

  // Navigation base classes
  const navClasses = () => {
    const base = 'navigation'
    const variant = mobile ? 'navigation--mobile' : horizontal ? 'navigation--horizontal' : 'navigation--vertical'
    return `${base} ${variant} ${className}`.trim()
  }

  return (
    <nav class={navClasses()} data-testid="permission-nav">
      <ul class="navigation__list" role="menubar" data-testid="nav-list">
        <For each={visibleItems()}>
          {(item) => {
            const isActive = () => isItemActive(item)
            const isExpanded = () => expandedItems().has(item.path)
            const hasChildren = () => item.children && item.children.length > 0

            return (
              <li 
                class={`navigation__item ${isActive() ? 'navigation__item--active' : ''}`}
                role="none"
              >
                <A
                  href={item.path}
                  class={`navigation__link ${isActive() ? 'navigation__link--active' : ''} ${item.disabled ? 'navigation__link--disabled' : ''}`}
                  onClick={(e) => handleItemClick(item, e)}
                  disabled={item.disabled}
                  role="menuitem"
                  aria-current={isActive() ? 'page' : undefined}
                  aria-expanded={hasChildren() ? isExpanded() : undefined}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {showIcons && item.icon && (
                    <span class="navigation__icon" aria-hidden="true">
                      {/* Icon would go here - could use lucide-react or similar */}
                      <span class="inline-block w-4 h-4 mr-2">{item.icon}</span>
                    </span>
                  )}
                  
                  <span class="navigation__label">
                    {item.label}
                    {item.badge && (
                      <span class="navigation__badge" aria-label={`${item.badge} notifications`}>
                        {item.badge}
                      </span>
                    )}
                  </span>

                  {showDescriptions && item.description && (
                    <span class="navigation__description">
                      {item.description}
                    </span>
                  )}

                  {hasChildren() && (
                    <span class="navigation__chevron" aria-hidden="true">
                      <span class={`inline-block ml-auto transition-transform ${isExpanded() ? 'rotate-90' : ''}`}>
                        ▶
                      </span>
                    </span>
                  )}
                </A>

                {/* Nested navigation */}
                <Show when={hasChildren() && isExpanded()}>
                  <ul class="navigation__submenu" role="menu" data-testid="nav-children">
                    <For each={item.children}>
                      {(child) => {
                        const isChildActive = () => isItemActive(child)
                        
                        return (
                          <li 
                            class="navigation__item navigation__item--child"
                            role="none"
                          >
                            <A
                              href={child.path}
                              class={`navigation__link navigation__link--child ${isChildActive() ? 'navigation__link--active' : ''} ${child.disabled ? 'navigation__link--disabled' : ''}`}
                              onClick={(e) => handleItemClick(child, e)}
                              disabled={child.disabled}
                              role="menuitem"
                              aria-current={isChildActive() ? 'page' : undefined}
                              data-testid={`nav-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              {showIcons && child.icon && (
                                <span class="navigation__icon navigation__icon--child" aria-hidden="true">
                                  <span class="inline-block w-4 h-4 mr-2">{child.icon}</span>
                                </span>
                              )}
                              
                              <span class="navigation__label">
                                {child.label}
                                {child.badge && (
                                  <span class="navigation__badge navigation__badge--child" aria-label={`${child.badge} notifications`}>
                                    {child.badge}
                                  </span>
                                )}
                              </span>

                              {showDescriptions && child.description && (
                                <span class="navigation__description navigation__description--child">
                                  {child.description}
                                </span>
                              )}
                            </A>
                          </li>
                        )
                      }}
                    </For>
                  </ul>
                </Show>
              </li>
            )
          }}
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