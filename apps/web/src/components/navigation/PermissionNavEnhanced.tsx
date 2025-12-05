import {
  createSignal,
  For,
  Show,
  ParentComponent,
  onMount,
  onCleanup,
  createMemo,
  createEffect,
  batch
} from 'solid-js'
import { Link } from '@tanstack/solid-router'
import { usePermissionContext } from '../../contexts/PermissionContext'
import type { Permission } from '../../../../packages/infrastructure/auth/src/rbac'

// Try to import the real NavigationItem, fall back to temporary type
let NavigationItem: any = null
try {
  const navModule = require('@pems/navigation-management')
  NavigationItem = navModule.NavigationItem
} catch (error) {
  // Fall back to temporary navigation item type
  console.warn('NavigationItem not available, using temporary type')
}

// Import temporary navigation item type for fallback
import type { TempNavigationItem } from '../../services/navigation-temp'

// Create a unified navigation item type for compatibility
export type UnifiedNavigationItem = NavigationItem | TempNavigationItem

/**
 * Performance Metrics
 */
interface PerformanceMetrics {
  renderTime: number
  itemCount: number
  visibleItemCount: number
  cacheHitCount: number
  cacheMissCount: number
}

/**
 * Enhanced PermissionNav Props
 */
interface PermissionNavEnhancedProps {
  items: UnifiedNavigationItem[]
  mobile?: boolean
  horizontal?: boolean
  showIcons?: boolean
  showDescriptions?: boolean
  showBadges?: boolean
  enableVirtualScroll?: boolean
  enableSearch?: boolean
  searchPlaceholder?: string
  maxVisibleItems?: number
  enableAnimations?: boolean
  enableAnalytics?: boolean
  enableKeyboardNavigation?: boolean
  debounceMs?: number
  cacheKey?: string
  className?: string
  onItemClick?: (item: UnifiedNavigationItem, event: MouseEvent) => void
  onSearch?: (query: string) => void
  onPerformanceMetrics?: (metrics: PerformanceMetrics) => void
}

/**
 * Permission Cache Entry
 */
interface PermissionCacheEntry {
  visible: boolean
  filteredChildren?: UnifiedNavigationItem[]
  lastChecked: number
  hash: string
}

/**
 * Virtual Scroll Item
 */
interface VirtualScrollItem {
  index: number
  item: UnifiedNavigationItem
  top: number
  height: number
}

/**
 * Enhanced PermissionNav Component
 *
 * A high-performance navigation component with advanced features:
 * - Permission-based filtering with caching
 * - Virtual scrolling for large navigation trees
 * - Search functionality with debouncing
 * - Analytics tracking
 * - Keyboard navigation
 * - Performance monitoring
 */
export const PermissionNavEnhanced: ParentComponent<PermissionNavEnhancedProps> = (props) => {
  const {
    items,
    mobile = false,
    horizontal = false,
    showIcons = true,
    showDescriptions = false,
    showBadges = true,
    enableVirtualScroll = false,
    enableSearch = false,
    searchPlaceholder = 'Search navigation...',
    maxVisibleItems = 100,
    enableAnimations = true,
    enableAnalytics = false,
    enableKeyboardNavigation = true,
    debounceMs = 300,
    cacheKey = 'default',
    className = '',
    onItemClick,
    onSearch,
    onPerformanceMetrics
  } = props

  const { hasPermission, hasAnyPermission, hasAllPermissions, isSystemAdmin, user, tenantId } = usePermissionContext()

  // Reactive state
  const [activePath, setActivePath] = createSignal<string>('')
  const [expandedItems, setExpandedItems] = createSignal<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = createSignal<string>('')
  const [scrollTop, setScrollTop] = createSignal<number>(0)
  const [containerHeight, setContainerHeight] = createSignal<number>(0)
  const [isSearching, setIsSearching] = createSignal<boolean>(false)
  const [performanceMetrics, setPerformanceMetrics] = createSignal<PerformanceMetrics>({
    renderTime: 0,
    itemCount: 0,
    visibleItemCount: 0,
    cacheHitCount: 0,
    cacheMissCount: 0
  })

  // Performance tracking
  const startTime = performance.now()
  let renderTimeoutId: number | undefined

  // Permission cache
  const permissionCache = new Map<string, PermissionCacheEntry>()
  const searchCache = new Map<string, UnifiedNavigationItem[]>()

  // Debounced search
  let searchTimeoutId: number | undefined

  // Virtual scrolling
  const itemHeight = horizontal ? 40 : 48
  const [virtualItems, setVirtualItems] = createSignal<VirtualScrollItem[]>([])

  // Set active path based on current location
  onMount(() => {
    if (typeof window !== 'undefined') {
      setActivePath(window.location.pathname)

      // Listen for route changes
      const handleRouteChange = () => {
        setActivePath(window.location.pathname)
      }

      window.addEventListener('popstate', handleRouteChange)

      onCleanup(() => {
        window.removeEventListener('popstate', handleRouteChange)
        if (searchTimeoutId) clearTimeout(searchTimeoutId)
        if (renderTimeoutId) clearTimeout(renderTimeoutId)
      })
    }
  })

  // Generate cache key for permission checks
  const generatePermissionCacheKey = createMemo(() => {
    const userId = user?.id || 'anonymous'
    const currentTenantId = tenantId || 'global'
    const userPermissions = user?.permissions || []
    const permissionHash = userPermissions.sort().join(',')
    return `${cacheKey}:${userId}:${currentTenantId}:${permissionHash}`
  })

  // Clear permission cache when user context changes
  createEffect(() => {
    const newCacheKey = generatePermissionCacheKey()
    permissionCache.clear()
    searchCache.clear()
  })

  // Debounced search handler
  const handleSearch = (query: string) => {
    if (searchTimeoutId) {
      clearTimeout(searchTimeoutId)
    }

    setIsSearching(true)

    searchTimeoutId = setTimeout(() => {
      setSearchQuery(query)
      setIsSearching(false)
      onSearch?.(query)
    }, debounceMs)
  }

  // Generate hash for item comparison
  const generateItemHash = (item: UnifiedNavigationItem): string => {
    const relevantProps = [
      item.permissions?.join(','),
      item.requireAll,
      item.scope,
      item.disabled,
      item.visible,
      tenantId
    ]
    return relevantProps.join('|')
  }

  // Check if item should be visible with caching
  const isItemVisible = (item: UnifiedNavigationItem): boolean => {
    const cacheKey = `${item.id}:${generateItemHash(item)}`
    const cached = permissionCache.get(cacheKey)
    const now = Date.now()

    // Check cache (valid for 5 seconds)
    if (cached && (now - cached.lastChecked) < 5000) {
      const metrics = performanceMetrics()
      setPerformanceMetrics({
        ...metrics,
        cacheHitCount: metrics.cacheHitCount + 1
      })
      return cached.visible
    }

    // Cache miss - compute visibility
    let visible = true
    const currentTenantId = tenantId

    // Check explicit visibility
    if (visible && !item.visible) {
      visible = false
    }

    // Check disabled items (still visible but not clickable)
    if (visible && item.disabled) {
      // Keep visible but will be styled as disabled
    }

    // Check permissions using NavigationItem's built-in method
    if (visible) {
      try {
        const currentUser = user
        const userPermissions = currentUser?.permissions || []
        const userRole = currentUser?.roles?.[0]?.role

        visible = item.hasPermission(
          userPermissions,
          userRole,
          currentUser?.isSystemAdmin,
          currentTenantId
        )
      } catch (error) {
        // Fallback to manual permission checking if the method fails
        console.warn('Permission checking failed, using fallback:', error)
        if (item.permission) {
          visible = hasPermission(item.permission, currentTenantId)
        } else if (item.permissions && item.permissions.length > 0) {
          if (item.requireAll) {
            visible = hasAllPermissions(item.permissions, currentTenantId)
          } else {
            visible = hasAnyPermission(item.permissions, currentTenantId)
          }
        }
      }
    }

    // Cache result
    permissionCache.set(cacheKey, {
      visible,
      lastChecked: now,
      hash: generateItemHash(item)
    })

    const metrics = performanceMetrics()
    setPerformanceMetrics({
      ...metrics,
      cacheMissCount: metrics.cacheMissCount + 1
    })

    return visible
  }

  // Filter items with search
  const searchItems = (items: UnifiedNavigationItem[], query: string): UnifiedNavigationItem[] => {
    if (!query.trim()) {
      return items
    }

    const cacheKey = `search:${query.toLowerCase()}`
    const cached = searchCache.get(cacheKey)
    if (cached) {
      return cached
    }

    const searchResults: UnifiedNavigationItem[] = []
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0)

    for (const item of items) {
      const itemText = `${item.label} ${item.description || ''} ${item.path}`.toLowerCase()
      const matchesAllTerms = searchTerms.every(term => itemText.includes(term))

      if (matchesAllTerms) {
        const itemCopy = { ...item }

        // Recursively search children
        if (item.children && item.children.length > 0) {
          const matchedChildren = searchItems(item.children, query)
          if (matchedChildren.length > 0) {
            itemCopy.children = matchedChildren
          }
        }

        searchResults.push(itemCopy)
      }
    }

    // Cache search results
    if (searchCache.size > 100) {
      // Clear oldest 50 entries to prevent memory leaks
      const keysToClear = Array.from(searchCache.keys()).slice(0, 50)
      keysToClear.forEach(key => searchCache.delete(key))
    }
    searchCache.set(cacheKey, searchResults)

    return searchResults
  }

  // Filter and process navigation items
  const processedItems = createMemo(() => {
    const renderStart = performance.now()

    let filteredItems = items
    const query = searchQuery()

    // Apply search filter
    if (query) {
      filteredItems = searchItems(filteredItems, query)
    }

    // Apply permission filter
    const finalItems = filteredItems.filter(item => {
      if (!isItemVisible(item)) {
        return false
      }

      // Filter children
      if (item.children && item.children.length > 0) {
        const visibleChildren = item.children.filter(child => isItemVisible(child))
        if (visibleChildren.length === 0) {
          return false // Hide parent if no visible children
        }
        // Update children with filtered results (create new object to avoid mutation)
        return { ...item, children: visibleChildren }
      }

      return true
    })

    const renderEnd = performance.now()
    const renderTime = renderEnd - renderStart

    const metrics = {
      renderTime,
      itemCount: items.length,
      visibleItemCount: finalItems.length,
      cacheHitCount: performanceMetrics().cacheHitCount,
      cacheMissCount: performanceMetrics().cacheMissCount
    }

    setPerformanceMetrics(metrics)
    onPerformanceMetrics?.(metrics)

    // Apply virtual scrolling if enabled and needed
    if (enableVirtualScroll && finalItems.length > maxVisibleItems) {
      return finalItems.slice(0, maxVisibleItems)
    }

    return finalItems
  })

  // Virtual scrolling calculations
  const visibleItems = createMemo(() => {
    if (!enableVirtualScroll) {
      return processedItems()
    }

    const items = processedItems()
    const startIndex = Math.floor(scrollTop() / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight() / itemHeight) + 1,
      items.length
    )

    const virtualItems: VirtualScrollItem[] = []
    for (let i = startIndex; i < endIndex; i++) {
      virtualItems.push({
        index: i,
        item: items[i],
        top: i * itemHeight,
        height: itemHeight
      })
    }

    return virtualItems
  })

  // Toggle expanded state for nested items
  const toggleExpanded = (itemPath: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemPath)) {
        newSet.delete(itemPath)
      } else {
        newSet.add(itemPath)
      }
      return newSet
    })

    // Analytics
    if (enableAnalytics) {
      // Track expansion/collapse
      console.log('Navigation item toggled:', itemPath)
    }
  }

  // Check if item is active
  const isItemActive = (item: UnifiedNavigationItem): boolean => {
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

  // Check if item is expanded
  const isItemExpanded = (item: UnifiedNavigationItem): boolean => {
    return expandedItems().has(item.path) || isItemActive(item) // Auto-expand active items
  }

  // Handle item click with analytics
  const handleItemClick = (item: UnifiedNavigationItem, event: MouseEvent) => {
    event.preventDefault()

    // Analytics (handled externally since NavigationItem is immutable)
    if (enableAnalytics) {
      console.log('Navigation item clicked:', item.path, 'Label:', item.label)

      // Note: Analytics should be handled by the navigation service bridge
      // since NavigationItem objects are immutable value objects
    }

    // Handle nested navigation
    if (item.children && item.children.length > 0) {
      toggleExpanded(item.path)
      return
    }

    // Call custom handler
    if (onItemClick) {
      onItemClick(item, event)
    }

    // Navigate if it's a regular link
    if (!item.external && item.path) {
      if (typeof window !== 'undefined') {
        window.location.href = item.path
      }
    } else if (item.external && item.path) {
      window.open(item.path, item.target || '_blank')
    }
  }

  // Keyboard navigation
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!enableKeyboardNavigation) return

    const items = processedItems()
    const currentIndex = items.findIndex(item => isItemActive(item))

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        if (currentIndex < items.length - 1) {
          const nextItem = items[currentIndex + 1]
          if (nextItem) {
            setActivePath(nextItem.path)
          }
        }
        break

      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        if (currentIndex > 0) {
          const prevItem = items[currentIndex - 1]
          if (prevItem) {
            setActivePath(prevItem.path)
          }
        }
        break

      case 'Enter':
      case ' ':
        event.preventDefault()
        if (currentIndex >= 0 && currentIndex < items.length) {
          const currentItem = items[currentIndex]
          handleItemClick(currentItem, new MouseEvent('click'))
        }
        break

      case 'Escape':
        if (enableSearch && searchQuery()) {
          setSearchQuery('')
        }
        break
    }
  }

  // Set up keyboard navigation
  onMount(() => {
    if (enableKeyboardNavigation && typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown)
      onCleanup(() => {
        window.removeEventListener('keydown', handleKeyDown)
      })
    }
  })

  // Report final render time
  onMount(() => {
    const totalTime = performance.now() - startTime

    // Debounce the performance reporting to avoid excessive updates
    if (renderTimeoutId) clearTimeout(renderTimeoutId)
    renderTimeoutId = setTimeout(() => {
      const finalMetrics = {
        ...performanceMetrics(),
        renderTime: totalTime
      }
      setPerformanceMetrics(finalMetrics)
      onPerformanceMetrics?.(finalMetrics)
    }, 100)

    onCleanup(() => {
      if (renderTimeoutId) clearTimeout(renderTimeoutId)
    })
  })

  // Navigation base classes
  const navClasses = () => {
    const base = 'navigation navigation--enhanced'
    const variants = [
      mobile && 'navigation--mobile',
      horizontal && 'navigation--horizontal',
      !horizontal && !mobile && 'navigation--vertical',
      enableAnimations && 'navigation--animated',
      enableVirtualScroll && 'navigation--virtual'
    ].filter(Boolean)

    return [base, ...variants, className].filter(Boolean).join(' ')
  }

  return (
    <nav
      class={navClasses()}
      data-testid="permission-nav-enhanced"
      role="menubar"
      aria-label="Main navigation"
    >
      {/* Search functionality */}
      <Show when={enableSearch}>
        <div class="navigation__search">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery()}
            onInput={(e) => handleSearch(e.target.value)}
            class="navigation__search-input"
            data-testid="nav-search"
            aria-label="Search navigation"
            disabled={isSearching()}
          />
          <Show when={isSearching()}>
            <div class="navigation__search-loading" aria-hidden="true">
              Searching...
            </div>
          </Show>
        </div>
      </Show>

      {/* Performance metrics (development only) */}
      <Show when={process.env.NODE_ENV === 'development' && onPerformanceMetrics}>
        <div class="navigation__metrics" data-testid="nav-metrics">
          <small>
            Items: {performanceMetrics().visibleItemCount}/{performanceMetrics().itemCount} |
            Render: {performanceMetrics().renderTime.toFixed(2)}ms |
            Cache: {performanceMetrics().cacheHitCount}/{performanceMetrics().cacheHitCount + performanceMetrics().cacheMissCount}
          </small>
        </div>
      </Show>

      {/* Navigation list */}
      <div
        class="navigation__container"
        style={{
          height: enableVirtualScroll ? `${containerHeight()}px` : 'auto',
          overflow: enableVirtualScroll ? 'auto' : 'visible'
        }}
        onScroll={(e) => setScrollTop((e.target as HTMLElement).scrollTop)}
      >
        <ul
          class="navigation__list"
          role="menubar"
          data-testid="nav-list"
          style={{
            height: enableVirtualScroll ? `${processedItems().length * itemHeight}px` : 'auto'
          }}
        >
          <For each={visibleItems()}>
            {(virtualItem) => {
              const item = virtualItem.item || virtualItem as any
              const isActive = () => isItemActive(item)
              const isExpanded = () => isItemExpanded(item)
              const hasChildren = () => item.children && item.children.length > 0

              return (
                <li
                  class={`navigation__item ${isActive() ? 'navigation__item--active' : ''}`}
                  style={{
                    top: enableVirtualScroll ? `${virtualItem.top}px` : 'auto',
                    position: enableVirtualScroll ? 'absolute' : 'relative'
                  }}
                  role="none"
                >
                  <Link
                    to={item.path}
                    class={`navigation__link ${isActive() ? 'navigation__link--active' : ''} ${item.disabled ? 'navigation__link--disabled' : ''}`}
                    onClick={(e) => handleItemClick(item, e)}
                    disabled={item.disabled}
                    role="menuitem"
                    aria-current={isActive() ? 'page' : undefined}
                    aria-expanded={hasChildren() ? isExpanded() : undefined}
                    aria-label={item.label}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {showIcons && item.icon && (
                      <span class="navigation__icon" aria-hidden="true">
                        <span class={`navigation__icon--${item.iconType || 'emoji'}`}>
                          {item.icon}
                        </span>
                      </span>
                    )}

                    <span class="navigation__label">
                      {item.label}

                      {showBadges && item.badge && (
                        <span
                          class={`navigation__badge navigation__badge--${item.badgeType || 'notification'}`}
                          aria-label={`${item.badge} notifications`}
                          style={{
                            'background-color': item.badgeColor
                          }}
                        >
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
                  </Link>

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
                              <Link
                                to={child.path}
                                class={`navigation__link navigation__link--child ${isChildActive() ? 'navigation__link--active' : ''} ${child.disabled ? 'navigation__link--disabled' : ''}`}
                                onClick={(e) => handleItemClick(child, e)}
                                disabled={child.disabled}
                                role="menuitem"
                                aria-current={isChildActive() ? 'page' : undefined}
                                aria-label={child.label}
                                data-testid={`nav-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                {showIcons && child.icon && (
                                  <span class="navigation__icon navigation__icon--child" aria-hidden="true">
                                    <span class={`navigation__icon--${child.iconType || 'emoji'}`}>
                                      {child.icon}
                                    </span>
                                  </span>
                                )}

                                <span class="navigation__label">
                                  {child.label}
                                  {showBadges && child.badge && (
                                    <span
                                      class={`navigation__badge navigation__badge--child navigation__badge--${child.badgeType || 'notification'}`}
                                      aria-label={`${child.badge} notifications`}
                                    >
                                      {child.badge}
                                    </span>
                                  )}
                                </span>

                                {showDescriptions && child.description && (
                                  <span class="navigation__description navigation__description--child">
                                    {child.description}
                                  </span>
                                )}
                              </Link>
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
      </div>
    </nav>
  )
}