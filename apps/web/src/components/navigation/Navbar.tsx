import { createSignal, Show, For, onMount, ParentComponent } from 'solid-js'
import { Link } from '@tanstack/solid-router'
import { usePermissionContext, useCurrentUser } from '../../contexts/PermissionContext'
import { PermissionNav, defaultNavigationItems, type NavigationItem } from './PermissionNav'

/**
 * Navbar Props
 */
interface NavbarProps {
  user?: any
  tenantId?: string
  mobile?: boolean
  showBrand?: boolean
  showUserMenu?: boolean
  className?: string
}

/**
 * Navbar Component
 * 
 * Main application navigation bar with permission-based menu items,
 * user information display, and responsive design.
 */
export const Navbar: ParentComponent<NavbarProps> = (props) => {
  const {
    user: userProp,
    tenantId: tenantIdProp,
    mobile = false,
    showBrand = true,
    showUserMenu = true,
    className = '',
  } = props

  const { user: contextUser, tenantId: contextTenantId, setUser, setTenantId } = usePermissionContext()

  // Use props if provided, otherwise use context
  const user = () => userProp || contextUser
  const tenantId = () => tenantIdProp || contextTenantId

  const [isMobileMenuOpen, setIsMobileMenuOpen] = createSignal(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = createSignal(false)

  // Close menus when clicking outside
  onMount(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      
      // Close mobile menu if clicking outside
      if (!target.closest('.navbar') && !target.closest('.mobile-menu')) {
        setIsMobileMenuOpen(false)
      }
      
      // Close user menu if clicking outside
      if (!target.closest('.user-menu') && !target.closest('.user-menu-trigger')) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  })

  // Handle navigation item click
  const handleNavItemClick = (item: NavigationItem) => {
    // Close mobile menu after navigation
    if (mobile) {
      setIsMobileMenuOpen(false)
    }
  }

  // Handle user logout
  const handleLogout = async () => {
    try {
      // In a real implementation, this would call the logout API
      // await authAPI.logout()
      
      // Clear user context
      setUser(undefined)
      
      // Redirect to login
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Handle tenant switching
  const handleTenantSwitch = (newTenantId: string) => {
    setTenantId(newTenantId)
    setIsUserMenuOpen(false)
    
    // In a real implementation, this might reload the page or update the UI
    window.location.reload()
  }

  // Navigation base classes
  const navbarClasses = () => {
    const base = 'navbar'
    const variant = mobile ? 'navbar--mobile' : 'navbar--desktop'
    return `${base} ${variant} ${className}`.trim()
  }

  return (
    <nav class={navbarClasses()} data-testid="navbar">
      <div class="navbar__container">
        {/* Brand/Logo */}
        <Show when={showBrand}>
          <div class="navbar__brand">
            <Link to="/" class="navbar__brand-link">
              <span class="navbar__brand-icon" aria-hidden="true">
                🏫
              </span>
              <span class="navbar__brand-text" data-testid="navbar-brand">
                PEMS
              </span>
            </Link>
          </div>
        </Show>

        {/* Mobile Menu Button */}
        <Show when={mobile}>
          <button
            class="navbar__mobile-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen())}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen()}
            data-testid="mobile-menu-button"
          >
            <span class="sr-only">Toggle menu</span>
            <span class={`navbar__hamburger ${isMobileMenuOpen() ? 'navbar__hamburger--active' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </Show>

        {/* Main Navigation */}
        <div class={`navbar__navigation ${mobile && !isMobileMenuOpen() ? 'navbar__navigation--hidden' : ''}`}>
          <PermissionNav
            items={defaultNavigationItems}
            mobile={mobile}
            horizontal={!mobile}
            onItemClick={handleNavItemClick}
          />
        </div>

        {/* User Menu */}
        <Show when={showUserMenu && user()}>
          <div class="navbar__user">
            <div class="user-menu">
              {/* Tenant Selector (for multi-tenant users) */}
              <Show when={!mobile && tenantId()}>
                <div class="user-menu__tenant">
                  <span class="text-sm text-muted-foreground">Tenant:</span>
                  <select
                    class="user-menu__tenant-select"
                    value={tenantId()}
                    onChange={(e) => handleTenantSwitch(e.target.value)}
                    data-testid="tenant-selector"
                  >
                    <option value={tenantId()}>
                      {tenantId()}
                    </option>
                    {/* In a real implementation, this would list available tenants */}
                  </select>
                </div>
              </Show>

              {/* User Menu Trigger */}
              <button
                class="user-menu-trigger"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen())}
                aria-label="User menu"
                aria-expanded={isUserMenuOpen()}
                data-testid="user-menu-button"
              >
                <div class="user-menu__avatar">
                  {user()?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div class="user-menu__info">
                  <div class="user-menu__email" data-testid="current-user">
                    {user()?.email}
                  </div>
                  <div class="user-menu__role" data-testid="current-role">
                    {user()?.roles?.[0]?.role || 'User'}
                  </div>
                </div>
                <span class="user-menu__chevron" aria-hidden="true">
                  ▼
                </span>
              </button>

              {/* User Menu Dropdown */}
              <Show when={isUserMenuOpen()}>
                <div class="user-menu__dropdown" data-testid="user-dropdown">
                  <div class="user-menu__header">
                    <div class="user-menu__dropdown-avatar">
                      {user()?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div class="user-menu__dropdown-info">
                      <div class="font-medium">{user()?.email}</div>
                      <div class="text-sm text-muted-foreground">
                        {user()?.roles?.[0]?.role || 'User'}
                      </div>
                      <Show when={tenantId()}>
                        <div class="text-xs text-muted-foreground" data-testid="current-tenant">
                          Tenant: {tenantId()}
                        </div>
                      </Show>
                    </div>
                  </div>

                  <div class="user-menu__divider" />

                  <div class="user-menu__section">
                    <Link to="/profile" class="user-menu__item">
                      <span class="user-menu__item-icon">👤</span>
                      Profile
                    </Link>
                    <Link to="/settings" class="user-menu__item">
                      <span class="user-menu__item-icon">⚙️</span>
                      Settings
                    </Link>
                  </div>

                  <Show when={user()?.roles?.[0]?.role === 'super_admin'}>
                    <div class="user-menu__divider" />
                    <div class="user-menu__section">
                      <Link to="/admin" class="user-menu__item">
                        <span class="user-menu__item-icon">🔧</span>
                        Admin Panel
                      </Link>
                      <Link to="/system" class="user-menu__item">
                        <span class="user-menu__item-icon">⚡</span>
                        System
                      </Link>
                    </div>
                  </Show>

                  <div class="user-menu__divider" />

                  <div class="user-menu__section">
                    <button class="user-menu__item user-menu__item--logout" onClick={handleLogout}>
                      <span class="user-menu__item-icon">🚪</span>
                      Logout
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Login Button (when not authenticated) */}
        <Show when={showUserMenu && !user()}>
          <div class="navbar__auth">
            <Link to="/login" class="btn btn-primary">
              Login
            </Link>
          </div>
        </Show>
      </div>

      {/* Mobile Navigation Menu (Overlay) */}
      <Show when={mobile && isMobileMenuOpen()}>
        <div class="mobile-menu__overlay" onClick={() => setIsMobileMenuOpen(false)} />
        <div class="mobile-menu">
          <div class="mobile-menu__header">
            <div class="mobile-menu__brand">
              <span class="mobile-menu__brand-icon">🏫</span>
              <span class="mobile-menu__brand-text">PEMS</span>
            </div>
            <button
              class="mobile-menu__close"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <div class="mobile-menu__navigation">
            <PermissionNav
              items={defaultNavigationItems}
              mobile={true}
              horizontal={false}
              showIcons={true}
              showDescriptions={true}
              onItemClick={handleNavItemClick}
            />
          </div>

          <Show when={user()}>
            <div class="mobile-menu__user">
              <div class="mobile-menu__user-info">
                <div class="mobile-menu__user-avatar">
                  {user()?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div class="font-medium">{user()?.email}</div>
                  <div class="text-sm text-muted-foreground">
                    {user()?.roles?.[0]?.role || 'User'}
                  </div>
                </div>
              </div>
              <div class="mobile-menu__user-actions">
                <Link to="/profile" class="mobile-menu__action">
                  Profile
                </Link>
                <button class="mobile-menu__action mobile-menu__action--logout" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          </Show>

          <Show when={!user()}>
            <div class="mobile-menu__auth">
              <Link to="/login" class="btn btn-primary w-full">
                Login
              </Link>
            </div>
          </Show>
        </div>
      </Show>
    </nav>
  )
}

/**
 * Breadcrumb Component for Navigation
 */
export interface BreadcrumbItem {
  label: string
  path?: string
  permission?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: string
  className?: string
}

export const Breadcrumb: ParentComponent<BreadcrumbProps> = (props) => {
  const { items, separator = '/', className = '' } = props
  const { hasPermission } = usePermissionContext()

  // Filter items based on permissions
  const visibleItems = () => items.filter(item =>
    !item.permission || hasPermission(item.permission as any)
  )

  return (
    <nav class={`breadcrumb ${className}`} aria-label="Breadcrumb">
      <ol class="breadcrumb__list">
        <For each={visibleItems()}>
          {(item, index) => (
            <li class="breadcrumb__item">
              <Show when={item.path}>
                <Link to={item.path} class="breadcrumb__link">
                  {item.label}
                </Link>
              </Show>
              <Show when={!item.path}>
                <span class="breadcrumb__current" aria-current="page">
                  {item.label}
                </span>
              </Show>
              
              <Show when={index() < visibleItems().length - 1}>
                <span class="breadcrumb__separator" aria-hidden="true">
                  {separator}
                </span>
              </Show>
            </li>
          )}
        </For>
      </ol>
    </nav>
  )
}