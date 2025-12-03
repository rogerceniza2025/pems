import type { Permission, Role } from '@pems/auth'
import type { NavigationItem, NavigationScope, NavigationTarget } from '../domain'

/**
 * Enhanced Navigation Item for Presentation Layer
 */
export interface NavigationItemPresentation extends NavigationItem {
  // Presentation-specific properties
  isVisible: boolean
  isExpanded: boolean
  isActive: boolean
  isLoading: boolean
  badgeColor?: string
  animationDelay?: number
  groupKey?: string

  // Accessibility properties
  ariaLabel?: string
  ariaDescription?: string
  role?: string
  tabIndex?: number

  // Analytics properties
  clickCount?: number
  lastClicked?: Date
  impressionCount?: number
  lastSeen?: Date
}

/**
 * Navigation Item Component Props
 */
export interface NavigationItemProps {
  item: NavigationItemPresentation
  onClick?: (item: NavigationItemPresentation) => void
  onHover?: (item: NavigationItemPresentation) => void
  onFocus?: (item: NavigationItemPresentation) => void
  level?: number
  showIcons?: boolean
  showDescriptions?: boolean
  showBadges?: boolean
  compactMode?: boolean
  disabled?: boolean
  className?: string
  testId?: string
}

/**
 * Navigation Menu Component Props
 */
export interface NavigationMenuProps {
  items: NavigationItemPresentation[]
  orientation?: 'horizontal' | 'vertical'
  variant?: 'default' | 'compact' | 'expanded' | 'minimal'
  theme?: 'light' | 'dark' | 'auto'
  showIcons?: boolean
  showDescriptions?: boolean
  showBadges?: boolean
  enableSearch?: boolean
  searchPlaceholder?: string
  enableVirtualScroll?: boolean
  maxVisibleItems?: number
  enableKeyboardNavigation?: boolean
  enableAnimation?: boolean
  enableAnalytics?: boolean
  loading?: boolean
  error?: string
  emptyState?: React.ReactNode
  className?: string
  onItemClick?: (item: NavigationItemPresentation) => void
  onSearch?: (query: string) => void
  onExpand?: (item: NavigationItemPresentation) => void
  onCollapse?: (item: NavigationItemPresentation) => void
}

/**
 * Navigation Context Interface
 */
export interface NavigationContextInterface {
  // Navigation data
  items: NavigationItemPresentation[]
  loading: boolean
  error: string | undefined

  // User context
  user: {
    id: string
    permissions: Permission[]
    role?: Role
    tenantId?: string
    isSystemAdmin?: boolean
  }

  // Navigation state
  activePath: string
  expandedItems: Set<string>
  searchQuery: string

  // Actions
  setActivePath: (path: string) => void
  toggleExpanded: (itemId: string) => void
  expandAll: () => void
  collapseAll: () => void
  setSearchQuery: (query: string) => void
  refreshNavigation: () => Promise<void>
  clearCache: () => Promise<void>

  // Configuration
  config: {
    enableCache: boolean
    enableAnalytics: boolean
    enableAnimations: boolean
    theme: 'light' | 'dark' | 'auto'
    variant: 'default' | 'compact' | 'expanded' | 'minimal'
  }
}

/**
 * Navigation Analytics Data
 */
export interface NavigationAnalytics {
  userId: string
  tenantId?: string
  sessionId: string

  // Usage metrics
  totalClicks: number
  totalImpressions: number
  uniqueItemsAccessed: number

  // Item-specific metrics
  itemMetrics: Array<{
    itemId: string
    itemPath: string
    itemLabel: string
    clickCount: number
    impressionCount: number
    averageTimeToClick: number
    lastAccessed: Date
  }>

  // Performance metrics
  averageLoadTime: number
  averageRenderTime: number
  cacheHitRatio: number

  // User behavior
  searchQueries: Array<{
    query: string
    timestamp: Date
    resultCount: number
    selectedItemId?: string
  }>

  // Session information
  sessionDuration: number
  pageViews: number
  navigationDepth: number

  // Timestamps
  sessionStart: Date
  lastActivity: Date
}

/**
 * Navigation Performance Metrics
 */
export interface NavigationPerformanceMetrics {
  // Rendering metrics
  renderTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number

  // Interaction metrics
  timeToInteractive: number
  clickLatency: number
  searchLatency: number

  // Cache metrics
  cacheHitRatio: number
  cacheSize: number
  cacheEvictions: number

  // Memory metrics
  memoryUsage: number
  heapSize: number
  domNodes: number

  // Network metrics
  apiRequestCount: number
  apiResponseTime: number
  errorRate: number

  // User experience metrics
  cumulativeLayoutShift: number
  firstInputDelay: number
  interactionToNextPaint: number
}

/**
 * Navigation Search Result
 */
export interface NavigationSearchResult {
  item: NavigationItemPresentation
  score: number
  matches: Array<{
    field: 'label' | 'description' | 'path' | 'keywords'
    value: string
    indices: Array<[number, number]>
  }>
  highlights: {
    label?: string
    description?: string
  }
}

/**
 * Navigation Search Options
 */
export interface NavigationSearchOptions {
  query: string
  fuzzy?: boolean
  caseSensitive?: boolean
  includeDescriptions?: boolean
  includePaths?: boolean
  maxResults?: number
  minScore?: number
  boostFields?: Array<{
    field: string
    boost: number
  }>
  filter?: {
    permissions?: Permission[]
    scope?: NavigationScope[]
    types?: string[]
  }
}

/**
 * Navigation Theme Configuration
 */
export interface NavigationTheme {
  name: string
  colors: {
    background: string
    foreground: string
    accent: string
    hover: string
    active: string
    disabled: string
    border: string
    shadow: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  typography: {
    fontFamily: string
    fontSize: {
      xs: string
      sm: string
      md: string
      lg: string
      xl: string
    }
    fontWeight: {
      normal: number
      medium: number
      semibold: number
      bold: number
    }
    lineHeight: {
      tight: number
      normal: number
      relaxed: number
    }
  }
  animations: {
    duration: {
      fast: string
      normal: string
      slow: string
    }
    easing: {
      ease: string
      easeIn: string
      easeOut: string
      easeInOut: string
    }
  }
  breakpoints: {
    mobile: string
    tablet: string
    desktop: string
    wide: string
  }
}

/**
 * Navigation Keyboard Shortcuts
 */
export interface NavigationKeyboardShortcuts {
  focusSearch: string[]
  nextItem: string[]
  previousItem: string[]
  expandItem: string[]
  collapseItem: string[]
  activateItem: string[]
  escape: string[]
}

/**
 * Navigation Accessibility Configuration
 */
export interface NavigationAccessibilityConfig {
  announceChanges: boolean
  enableScreenReaderSupport: boolean
  enableHighContrastMode: boolean
  enableReducedMotion: boolean
  keyboardNavigation: boolean
  focusManagement: boolean
  ariaLabels: {
    navigation: string
    menubar: string
    menuitem: string
    submenu: string
    search: string
    expand: string
    collapse: string
    loading: string
    error: string
    empty: string
  }
}

/**
 * Responsive Breakpoint Configuration
 */
export interface NavigationResponsiveConfig {
  mobile: {
    maxItems: number
    showIcons: boolean
    showDescriptions: boolean
    orientation: 'vertical' | 'horizontal'
    variant: 'compact' | 'minimal'
  }
  tablet: {
    maxItems: number
    showIcons: boolean
    showDescriptions: boolean
    orientation: 'vertical' | 'horizontal'
    variant: 'default' | 'compact'
  }
  desktop: {
    maxItems?: number
    showIcons: boolean
    showDescriptions: boolean
    orientation: 'vertical' | 'horizontal'
    variant: 'default' | 'expanded'
  }
}

/**
 * Navigation Event Types for Analytics
 */
export type NavigationAnalyticsEvent =
  | { type: 'navigation_item_clicked'; data: { itemId: string; itemPath: string; position: number } }
  | { type: 'navigation_item_viewed'; data: { itemId: string; itemPath: string; visible: boolean } }
  | { type: 'navigation_search_performed'; data: { query: string; resultCount: number; latency: number } }
  | { type: 'navigation_expanded'; data: { itemId: string; itemPath: string; level: number } }
  | { type: 'navigation_collapsed'; data: { itemId: string; itemPath: string; level: number } }
  | { type: 'navigation_loaded'; data: { itemCount: number; loadTime: number; fromCache: boolean } }
  | { type: 'navigation_error'; data: { error: string; context: string } }

/**
 * Navigation Error Types
 */
export type NavigationError =
  | { type: 'load_error'; message: string; retryable: boolean }
  | { type: 'permission_error'; message: string; requiredPermissions?: Permission[] }
  | { type: 'network_error'; message: string; statusCode?: number }
  | { type: 'validation_error'; message: string; field?: string }
  | { type: 'cache_error'; message: string; operation?: string }
  | { type: 'unknown_error'; message: string; details?: any }