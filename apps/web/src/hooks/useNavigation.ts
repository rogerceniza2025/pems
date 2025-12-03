import {
  createSignal,
  createEffect,
  createMemo,
  onCleanup,
  batch
} from 'solid-js'
import { useLocation, useNavigate } from '@tanstack/solid-router'
import { useEnhancedPermissionContext } from '../contexts/PermissionContextEnhanced'
import {
  NavigationService,
  NavigationRepository,
  MenuBuilderFactory,
  type NavigationItem,
  type NavigationMenu,
  type PermissionChangeEvent,
  type TenantChangeEvent
} from '@pems/navigation-management'
import { DomainEventBus } from '@pems/infrastructure-events'

/**
 * Navigation Hook Return Type
 */
export interface UseNavigationReturn {
  // Navigation data
  items: NavigationItem[]
  loading: boolean
  error: string | undefined

  // Navigation state
  activePath: string
  activeItem: NavigationItem | undefined
  breadcrumbs: Array<{ label: string; path: string }>

  // User context
  userPermissions: string[]
  canViewNavigation: boolean

  // Actions
  refreshNavigation: () => Promise<void>
  navigateToItem: (item: NavigationItem) => void
  isItemActive: (item: NavigationItem) => boolean
  isItemVisible: (item: NavigationItem) => boolean

  // Analytics
  trackNavigationAccess: (item: NavigationItem) => void
  getNavigationStats: () => {
    totalItems: number
    visibleItems: number
    lastLoadTime: Date | undefined
  }
}

/**
 * useNavigation Hook
 *
 * Provides a complete navigation solution with:
 * - Permission-based filtering
 * - Active state tracking
 * - Breadcrumb generation
 * - Analytics tracking
 * - Real-time updates
 */
export function useNavigation(options: {
  menuId?: string
  enableAnalytics?: boolean
  enableRealTimeUpdates?: boolean
  customItems?: NavigationItem[]
} = {}): UseNavigationReturn {
  const {
    menuId,
    enableAnalytics = true,
    enableRealTimeUpdates = true,
    customItems
  } = options

  // Router hooks
  const location = useLocation()
  const navigate = useNavigate()

  // Permission context
  const {
    user,
    tenantId,
    permissions,
    hasPermission,
    hasAnyPermission,
    subscribeToPermissionChanges,
    subscribeToTenantChanges
  } = useEnhancedPermissionContext()

  // Navigation services
  const [navigationService] = createSignal(() => new NavigationService({
    enableCaching: true,
    enableAnalytics: enableAnalytics,
    enableSecurityAuditing: true
  }))

  const [navigationRepository] = createSignal(() => {
    const eventBus = enableRealTimeUpdates ? new DomainEventBus() : null
    return new NavigationRepository(eventBus || new DomainEventBus())
  })

  // State
  const [items, setItems] = createSignal<NavigationItem[]>([])
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string>()
  const [lastLoadTime, setLastLoadTime] = createSignal<Date>()
  const [navigationStats, setNavigationStats] = createSignal({
    totalItems: 0,
    visibleItems: 0,
    lastLoadTime: undefined as Date | undefined
  })

  // Memoized values
  const activePath = createMemo(() => location.pathname)
  const userPermissions = createMemo(() => permissions())

  const activeItem = createMemo(() => {
    const currentItems = items()
    return currentItems.find(item => isItemActive(item))
  })

  const breadcrumbs = createMemo(() => {
    const currentItems = items()
    const pathSegments = activePath().split('/').filter(Boolean)
    const crumbs: Array<{ label: string; path: string }> = []

    // Build breadcrumb trail
    let currentPath = ''
    for (const segment of pathSegments) {
      currentPath += `/${segment}`
      const item = currentItems.find(navItem => navItem.path === currentPath)
      if (item) {
        crumbs.push({
          label: item.label,
          path: currentPath
        })
      }
    }

    return crumbs
  })

  const canViewNavigation = createMemo(() => {
    return hasAnyPermission([
      'users:read', 'transactions:read', 'reports:read',
      'tenants:read', 'system:config'
    ]) || user()?.isSystemAdmin
  })

  // Load navigation items
  const loadNavigation = async () => {
    if (!canViewNavigation()) {
      setItems([])
      return
    }

    try {
      setLoading(true)
      setError()

      const currentUser = user()
      const currentTenantId = tenantId()
      const currentPermissions = permissions()

      if (!currentUser) {
        setItems([])
        return
      }

      let navigationItems: NavigationItem[] = []

      // Use custom items if provided
      if (customItems) {
        navigationItems = customItems
      } else {
        // Get navigation from service or create default
        if (menuId) {
          navigationItems = await navigationService().getNavigationForUser(
            currentUser.id || '',
            currentPermissions,
            userRoles()[0],
            currentTenantId,
            menuId
          )
        } else {
          // Create default navigation for user
          const defaultMenu = MenuBuilderFactory.createGlobalMenu()
          const filteredItems = await navigationService().getNavigationForUser(
            currentUser.id || '',
            currentPermissions,
            userRoles()[0],
            currentTenantId
          )

          // If no items, create minimal navigation
          if (filteredItems.length === 0) {
            const minimalMenu = MenuBuilderFactory.createMinimalMenu(
              currentUser.id || '',
              currentPermissions
            )
            navigationItems = minimalMenu.allItems
          } else {
            navigationItems = filteredItems
          }
        }
      }

      setItems(navigationItems)
      setLastLoadTime(new Date())
      setNavigationStats({
        totalItems: navigationItems.length,
        visibleItems: navigationItems.length,
        lastLoadTime: new Date()
      })

    } catch (err) {
      setError('Failed to load navigation')
      console.error('Error loading navigation:', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get user roles
  const userRoles = () => {
    const currentUser = user()
    return currentUser?.roles?.map(r => r.role) || []
  }

  // Check if item is active
  const isItemActive = (item: NavigationItem): boolean => {
    const currentPath = activePath()

    // Direct match
    if (item.path === currentPath) {
      return true
    }

    // Check if current path starts with item path
    if (item.path && currentPath.startsWith(item.path)) {
      return true
    }

    // Check children
    if (item.children) {
      return item.children.some(child => isItemActive(child))
    }

    return false
  }

  // Check if item is visible based on permissions
  const isItemVisible = (item: NavigationItem): boolean => {
    const currentTenantId = tenantId()

    // Check system-only items
    if (item.systemOnly && !user()?.isSystemAdmin) {
      return false
    }

    // Check tenant-only items
    if (item.tenantOnly && !currentTenantId) {
      return false
    }

    // Check disabled items
    if (item.disabled) {
      return false
    }

    // Check explicit visibility
    if (item.visible === false) {
      return false
    }

    // Check permissions
    if (item.permission) {
      return hasPermission(item.permission, currentTenantId)
    }

    if (item.permissions && item.permissions.length > 0) {
      if (item.requireAll) {
        return item.permissions.every(permission => hasPermission(permission, currentTenantId))
      } else {
        return item.permissions.some(permission => hasPermission(permission, currentTenantId))
      }
    }

    return true
  }

  // Navigate to item
  const navigateToItem = (item: NavigationItem) => {
    if (item.external && item.path) {
      window.open(item.path, item.target || '_blank')
    } else if (item.path) {
      navigate({ to: item.path })
    }

    // Track analytics
    if (enableAnalytics) {
      trackNavigationAccess(item)
    }
  }

  // Track navigation access for analytics
  const trackNavigationAccess = (item: NavigationItem) => {
    if (!enableAnalytics) return

    const currentUser = user()
    if (!currentUser) return

    // Update item analytics
    if (!item.analytics) {
      item.analytics = {}
    }
    item.analytics.clickCount = (item.analytics.clickCount || 0) + 1
    item.analytics.lastAccessed = new Date()

    // Publish event for analytics tracking
    try {
      const eventBus = new DomainEventBus()
      eventBus.publish('NavigationAccessed', {
        userId: currentUser.id,
        tenantId: tenantId(),
        itemId: item.id || item.path,
        itemPath: item.path,
        itemLabel: item.label,
        accessTime: new Date(),
        sessionId: getSessionId()
      })
    } catch (error) {
      console.warn('Failed to track navigation access:', error)
    }
  }

  // Get navigation statistics
  const getNavigationStats = () => {
    return {
      totalItems: items().length,
      visibleItems: items().filter(item => isItemVisible(item)).length,
      lastLoadTime: lastLoadTime()
    }
  }

  // Helper to get session ID
  const getSessionId = (): string => {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('navigation-session-id')
      if (!sessionId) {
        sessionId = Math.random().toString(36).substr(2, 9)
        sessionStorage.setItem('navigation-session-id', sessionId)
      }
      return sessionId
    }
    return 'unknown'
  }

  // Refresh navigation
  const refreshNavigation = async () => {
    await loadNavigation()
  }

  // Effects
  // Load navigation on mount and when dependencies change
  createEffect(() => {
    loadNavigation()
  })

  // Listen for permission changes
  createEffect(() => {
    if (!enableRealTimeUpdates) return

    const unsubscribe = subscribeToPermissionChanges((event: PermissionChangeEvent) => {
      if (event.userId === user()?.id) {
        console.log('Permission changes detected, refreshing navigation')
        loadNavigation()
      }
    })

    onCleanup(() => {
      unsubscribe()
    })
  })

  // Listen for tenant changes
  createEffect(() => {
    if (!enableRealTimeUpdates) return

    const unsubscribe = subscribeToTenantChanges((event: TenantChangeEvent) => {
      if (event.userId === user()?.id) {
        console.log('Tenant change detected, refreshing navigation')
        loadNavigation()
      }
    })

    onCleanup(() => {
      unsubscribe()
    })
  })

  return {
    items: items(),
    loading: loading(),
    error: error(),
    activePath: activePath(),
    activeItem: activeItem(),
    breadcrumbs: breadcrumbs(),
    userPermissions: userPermissions(),
    canViewNavigation: canViewNavigation(),
    refreshNavigation,
    navigateToItem,
    isItemActive,
    isItemVisible,
    trackNavigationAccess,
    getNavigationStats
  }
}

/**
 * useNavigationItem Hook
 *
 * Provides utilities for working with individual navigation items
 */
export function useNavigationItem(item: NavigationItem) {
  const { hasPermission, tenantId } = useEnhancedPermissionContext()

  const isVisible = createMemo(() => {
    // System admin bypass
    if (item.systemOnly && !hasPermission('system:*')) {
      return false
    }

    // Tenant-only items
    if (item.tenantOnly && !tenantId()) {
      return false
    }

    // Disabled items
    if (item.disabled) {
      return false
    }

    // Explicit visibility
    if (item.visible === false) {
      return false
    }

    // Permissions
    if (item.permission) {
      return hasPermission(item.permission, tenantId())
    }

    if (item.permissions && item.permissions.length > 0) {
      if (item.requireAll) {
        return item.permissions.every(permission => hasPermission(permission, tenantId()))
      } else {
        return item.permissions.some(permission => hasPermission(permission, tenantId()))
      }
    }

    return true
  })

  const hasAccess = createMemo(() => {
    if (!isVisible()) return false

    // Check if external link is accessible
    if (item.external) {
      return true
    }

    return true
  })

  const getTarget = () => {
    return item.target || (item.external ? '_blank' : '_self')
  }

  const getIcon = () => {
    return item.icon || (item.children ? '📁' : '📄')
  }

  const getBadge = () => {
    return item.badge
  }

  return {
    isVisible: isVisible(),
    hasAccess: hasAccess(),
    getTarget,
    getIcon,
    getBadge,
    item
  }
}

/**
 * useNavigationBreadcrumbs Hook
 *
 * Provides breadcrumb generation and management
 */
export function useNavigationBreadcrumbs(items: NavigationItem[], maxDepth: number = 3) {
  const location = useLocation()

  const breadcrumbs = createMemo(() => {
    const currentPath = location.pathname
    const pathSegments = currentPath.split('/').filter(Boolean)
    const crumbs: Array<{ label: string; path: string; isLast: boolean }> = []

    let currentPathBuilder = ''

    for (let i = 0; i < Math.min(pathSegments.length, maxDepth); i++) {
      const segment = pathSegments[i]
      currentPathBuilder += `/${segment}`

      // Find matching navigation item
      const matchingItem = items.find(item =>
        item.path === currentPathBuilder ||
        (item.children && item.children.some(child => child.path === currentPathBuilder))
      )

      if (matchingItem) {
        crumbs.push({
          label: matchingItem.label,
          path: currentPathBuilder,
          isLast: i === pathSegments.length - 1
        })
      }
    }

    return crumbs
  })

  return {
    breadcrumbs: breadcrumbs(),
    hasBreadcrumbs: breadcrumbs().length > 0,
    breadcrumbCount: breadcrumbs().length
  }
}

/**
 * useNavigationSearch Hook
 *
 * Provides search functionality for navigation items
 */
export function useNavigationSearch(items: NavigationItem[], options: {
  fuzzy?: boolean
  caseSensitive?: boolean
  includeDescriptions?: boolean
  maxResults?: number
} = {}) {
  const [searchQuery, setSearchQuery] = createSignal('')
  const [searchResults, setSearchResults] = createSignal<NavigationItem[]>([])

  const {
    fuzzy = false,
    caseSensitive = false,
    includeDescriptions = false,
    maxResults = 50
  } = options

  // Search functionality
  const search = createMemo(() => {
    const query = searchQuery().trim()
    if (!query) {
      return []
    }

    const normalizedQuery = caseSensitive ? query : query.toLowerCase()
    const results: NavigationItem[] = []

    const searchInItem = (item: NavigationItem): boolean => {
      const searchText = `${item.label} ${includeDescriptions && item.description ? item.description : ''} ${item.path || ''}`
      const normalizedSearchText = caseSensitive ? searchText : searchText.toLowerCase()

      if (fuzzy) {
        // Simple fuzzy search
        const queryChars = normalizedQuery.split('')
        let searchIndex = 0
        for (const char of normalizedSearchText) {
          if (char === queryChars[searchIndex]) {
            searchIndex++
          }
          if (searchIndex === queryChars.length) {
            return true
          }
        }
        return false
      } else {
        return normalizedSearchText.includes(normalizedQuery)
      }
    }

    // Search in items
    const searchRecursive = (items: NavigationItem[]): void => {
      for (const item of items) {
        if (searchInItem(item)) {
          results.push(item)
          if (results.length >= maxResults) return
        }

        // Search in children
        if (item.children && results.length < maxResults) {
          searchRecursive(item.children)
        }
      }
    }

    searchRecursive(items)

    return results
  })

  createEffect(() => {
    setSearchResults(search())
  })

  const clearSearch = () => {
    setSearchQuery('')
  }

  return {
    searchQuery: searchQuery(),
    setSearchQuery,
    searchResults: searchResults(),
    hasResults: searchResults().length > 0,
    resultCount: searchResults().length,
    clearSearch
  }
}

/**
 * useNavigationAnalytics Hook
 *
 * Provides analytics tracking for navigation usage
 */
export function useNavigationAnalytics() {
  const { user, tenantId } = useEnhancedPermissionContext()

  const [analytics, setAnalytics] = createSignal({
    totalClicks: 0,
    itemClicks: new Map<string, number>(),
    sessionStart: new Date(),
    lastActivity: new Date()
  })

  const trackClick = (item: NavigationItem) => {
    const current = analytics()
    const itemId = item.id || item.path

    setAnalytics({
      ...current,
      totalClicks: current.totalClicks + 1,
      itemClicks: new Map(current.itemClicks).set(itemId, (current.itemClicks.get(itemId) || 0) + 1),
      lastActivity: new Date()
    })

    // Publish analytics event
    try {
      const eventBus = new DomainEventBus()
      eventBus.publish('NavigationAccessed', {
        userId: user()?.id,
        tenantId: tenantId(),
        itemId: itemId,
        itemPath: item.path,
        itemLabel: item.label,
        accessTime: new Date(),
        sessionId: getSessionId()
      })
    } catch (error) {
      console.warn('Failed to publish navigation analytics:', error)
    }
  }

  const getSessionId = (): string => {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('navigation-analytics-session')
      if (!sessionId) {
        sessionId = Math.random().toString(36).substr(2, 9)
        sessionStorage.setItem('navigation-analytics-session', sessionId)
      }
      return sessionId
    }
    return 'unknown'
  }

  const getTopItems = (limit: number = 5) => {
    const current = analytics()
    const sorted = Array.from(current.itemClicks.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([itemId, clicks]) => ({ itemId, clicks }))

    return sorted
  }

  const getSessionDuration = () => {
    const current = analytics()
    return Date.now() - current.sessionStart.getTime()
  }

  return {
    trackClick,
    getTopItems,
    getSessionDuration,
    totalClicks: () => analytics().totalClicks,
    sessionStart: () => analytics().sessionStart,
    lastActivity: () => analytics().lastActivity
  }
}