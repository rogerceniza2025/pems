import {
  createContext,
  createSignal,
  useContext,
  ParentComponent,
  onCleanup,
  createEffect,
  createMemo
} from 'solid-js'
import type { User } from 'better-auth/types'
import type { Permission, Role, UserRole } from '../../../../packages/infrastructure/auth/src/rbac'
import { NavigationCache } from '@pems/infrastructure-cache'
import { DomainEventBus } from '@pems/infrastructure-events'

/**
 * Enhanced Permission Context Type
 */
export interface EnhancedPermissionContextType {
  // User state
  user: User & { roles?: UserRole[]; isSystemAdmin?: boolean } | undefined
  tenantId: string | undefined

  // Permissions state
  permissions: Permission[]
  effectivePermissions: Permission[]
  lastPermissionUpdate: Date | undefined

  // Permission checking methods (enhanced)
  hasPermission: (permission: Permission, targetTenantId?: string) => boolean
  hasAnyPermission: (permissions: Permission[], targetTenantId?: string) => boolean
  hasAllPermissions: (permissions: Permission[], targetTenantId?: string) => boolean
  hasPermissionLevel: (level: 'read' | 'write' | 'admin' | 'owner', resource: string, targetTenantId?: string) => boolean
  getUserPermissions: (targetTenantId?: string) => Permission[]
  canAccessRoute: (routePath: string, targetTenantId?: string) => boolean

  // User info methods
  isSystemAdmin: () => boolean
  userRole: () => Role | undefined
  userRoles: () => Role[]

  // State management (enhanced)
  setUser: (user: User & { roles?: UserRole[]; isSystemAdmin?: boolean } | undefined) => void
  setTenantId: (tenantId: string | undefined) => void
  updateUser: (updates: Partial<User & { roles?: UserRole[]; isSystemAdmin?: boolean }>) => void

  // Loading state
  isLoading: () => boolean
  hasPermissionError: () => string | undefined

  // Permission refresh (enhanced)
  refreshPermissions: () => Promise<void>
  invalidateCache: (userId?: string, tenantId?: string) => void
  getPermissionCacheStats: () => { size: number; hitRate: number; lastCleared?: Date }

  // Event subscriptions
  subscribeToPermissionChanges: (callback: (event: PermissionChangeEvent) => void) => () => void
  subscribeToTenantChanges: (callback: (event: TenantChangeEvent) => void) => () => void

  // Analytics
  getPermissionUsageStats: () => { totalChecks: number; cacheHits: number; averageCheckTime: number }
}

/**
 * Permission Change Event
 */
export interface PermissionChangeEvent {
  userId: string
  tenantId?: string
  oldPermissions: Permission[]
  newPermissions: Permission[]
  oldRole?: Role
  newRole?: Role
  timestamp: Date
  source: 'refresh' | 'user_update' | 'tenant_change' | 'cache_invalidation'
}

/**
 * Tenant Change Event
 */
export interface TenantChangeEvent {
  userId: string
  oldTenantId?: string
  newTenantId?: string
  userRole?: Role
  userPermissions: Permission[]
  timestamp: Date
}

/**
 * Permission Cache Entry (Enhanced)
 */
interface PermissionCacheEntry {
  hasPermission: boolean
  timestamp: Date
  ttl: number
  checkCount: number
  lastChecked: Date
}

/**
 * Permission Cache Configuration
 */
interface PermissionCacheConfig {
  maxSize: number
  defaultTtl: number // milliseconds
  enableStats: boolean
  enablePersistence: boolean
  cleanupInterval: number // milliseconds
}

/**
 * Enhanced Permission Provider Props
 */
interface EnhancedPermissionProviderProps {
  initialUser?: User & { roles?: UserRole[]; isSystemAdmin?: boolean }
  initialTenantId?: string
  cacheConfig?: Partial<PermissionCacheConfig>
  enableEventIntegration?: boolean
  enablePermissionAnalytics?: boolean
  children: any
}

/**
 * Enhanced Permission Cache
 */
class EnhancedPermissionCache {
  private cache: Map<string, PermissionCacheEntry> = new Map()
  private config: PermissionCacheConfig
  private stats: {
    totalRequests: number
    cacheHits: number
    totalCheckTime: number
    lastCleared?: Date
    evictions: number
  }
  private cleanupTimer?: number

  constructor(config: Partial<PermissionCacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      enableStats: true,
      enablePersistence: false,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config
    }

    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      totalCheckTime: 0,
      evictions: 0
    }

    this.startCleanupTimer()
  }

  get(key: string): boolean | undefined {
    const startTime = performance.now()
    const entry = this.cache.get(key)

    if (this.config.enableStats) {
      this.stats.totalRequests++
      this.stats.totalCheckTime += performance.now() - startTime
    }

    if (!entry) {
      return undefined
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return undefined
    }

    // Update access stats
    entry.checkCount++
    entry.lastChecked = new Date()

    if (this.config.enableStats) {
      this.stats.cacheHits++
    }

    return entry.hasPermission
  }

  set(key: string, value: boolean, ttl?: number): void {
    // Ensure cache doesn't exceed max size
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed()
    }

    const entry: PermissionCacheEntry = {
      hasPermission: value,
      timestamp: new Date(),
      ttl: ttl || this.config.defaultTtl,
      checkCount: 1,
      lastChecked: new Date()
    }

    this.cache.set(key, entry)
  }

  invalidate(userId?: string, tenantId?: string): number {
    let invalidated = 0
    const pattern = userId ? `${userId}:` : ''

    for (const [key] of this.cache) {
      if (key.startsWith(pattern) && (!tenantId || key.includes(`:${tenantId}:`))) {
        this.cache.delete(key)
        invalidated++
      }
    }

    if (invalidated > 0 && this.config.enableStats) {
      this.stats.lastCleared = new Date()
    }

    return invalidated
  }

  clear(): void {
    this.cache.clear()
    if (this.config.enableStats) {
      this.stats.lastCleared = new Date()
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      hitRate: this.stats.totalRequests > 0 ? this.stats.cacheHits / this.stats.totalRequests : 0,
      lastCleared: this.stats.lastCleared,
      evictions: this.stats.evictions,
      totalRequests: this.stats.totalRequests,
      cacheHits: this.stats.cacheHits,
      averageCheckTime: this.stats.totalRequests > 0 ? this.stats.totalCheckTime / this.stats.totalRequests : 0
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.clear()
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | undefined
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache) {
      if (entry.lastChecked.getTime() < oldestTime) {
        oldestTime = entry.lastChecked.getTime()
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      if (this.config.enableStats) {
        this.stats.evictions++
      }
    }
  }

  private startCleanupTimer(): void {
    if (this.config.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        const now = Date.now()
        let cleaned = 0

        for (const [key, entry] of this.cache) {
          if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key)
            cleaned++
          }
        }

        if (cleaned > 0 && this.config.enableStats) {
          console.log(`Cleaned up ${cleaned} expired permission cache entries`)
        }
      }, this.config.cleanupInterval)
    }
  }
}

/**
 * Enhanced Permission Context
 */
export const EnhancedPermissionContext = createContext<EnhancedPermissionContextType | undefined>(undefined)

/**
 * Enhanced Permission Provider Component
 *
 * Provides enhanced permission state with:
 * - Advanced caching with TTL and stats
 * - Event-driven updates
 * - Permission analytics
 * - Batch permission checking
 * - Permission level checking
 */
export const EnhancedPermissionProvider: ParentComponent<EnhancedPermissionProviderProps> = (props) => {
  const {
    initialUser,
    initialTenantId,
    cacheConfig,
    enableEventIntegration = true,
    enablePermissionAnalytics = true,
    children
  } = props

  // Enhanced services
  const [permissionCache] = createSignal(() => new EnhancedPermissionCache(cacheConfig))
  const [eventBus] = createSignal(() => enableEventIntegration ? new DomainEventBus() : null)
  const [permissionChangeCallbacks] = createSignal<Array<(event: PermissionChangeEvent) => void>>([])
  const [tenantChangeCallbacks] = createSignal<Array<(event: TenantChangeEvent) => void>>([])

  // State
  const [user, setUser] = createSignal<User & { roles?: UserRole[]; isSystemAdmin?: boolean } | undefined>(initialUser)
  const [tenantId, setTenantId] = createSignal<string | undefined>(initialTenantId)
  const [permissions, setPermissions] = createSignal<Permission[]>([])
  const [effectivePermissions, setEffectivePermissions] = createSignal<Permission[]>([])
  const [lastPermissionUpdate, setLastPermissionUpdate] = createSignal<Date>()
  const [isLoading, setIsLoading] = createSignal<boolean>(false)
  const [permissionError, setPermissionError] = createSignal<string>()

  // Analytics state
  const [permissionUsageStats] = createSignal({
    totalChecks: 0,
    cacheHits: 0,
    averageCheckTime: 0
  })

  // Generate cache key
  const generateCacheKey = createMemo(() => {
    const currentUser = user()
    return (permission: Permission, targetTenantId?: string) => {
      if (!currentUser) return null
      return `${currentUser.id}:${permission}:${targetTenantId || 'global'}:${currentUser.roles?.map(r => r.role).join(',') || ''}`
    }
  })

  // Calculate permissions from user roles (enhanced)
  const calculatePermissions = createMemo(() => {
    return (currentUser: any, currentTenantId: string | undefined): Permission[] => {
      if (!currentUser || !currentUser.roles || !Array.isArray(currentUser.roles)) {
        return []
      }

      const relevantRoles = currentUser.roles.filter((role: UserRole) => {
        // Check if role is expired
        if (role.expiresAt && role.expiresAt <= new Date()) {
          return false
        }

        // Check tenant scope
        if (currentTenantId && role.tenantId && role.tenantId !== currentTenantId) {
          return false
        }

        return true
      })

      const allPermissions = relevantRoles.flatMap((role: UserRole) => role.permissions)
      const uniquePermissions = [...new Set(allPermissions)]

      // Sort permissions for consistency
      return uniquePermissions.sort()
    }
  })

  // Update effective permissions (including system admin)
  const updateEffectivePermissions = createMemo(() => {
    return () => {
      const currentUser = user()
      if (currentUser?.isSystemAdmin) {
        // System admins have all permissions
        return ['*'] as Permission[]
      }
      return permissions()
    }
  })

  // Enhanced permission checking with caching
  const hasPermission = (permission: Permission, targetTenantId?: string): boolean => {
    const startTime = performance.now()
    const stats = permissionUsageStats()

    try {
      const currentUser = user()
      if (!currentUser) return false

      // Check cache first
      const cache = permissionCache()
      const cacheKey = generateCacheKey()(permission, targetTenantId)

      if (cacheKey) {
        const cached = cache.get(cacheKey)
        if (cached !== undefined) {
          // Update analytics
          stats.totalChecks++
          stats.cacheHits++
          stats.averageCheckTime = (stats.averageCheckTime + (performance.now() - startTime)) / 2
          return cached
        }
      }

      // Perform permission check
      let result = false

      // System admin bypass
      if (currentUser.isSystemAdmin) {
        result = true
      } else {
        result = currentUser.roles?.some((role: UserRole) => {
          // Check if role is expired
          if (role.expiresAt && role.expiresAt <= new Date()) {
            return false
          }

          // Check tenant scope
          if (targetTenantId && role.tenantId && role.tenantId !== targetTenantId) {
            return false
          }

          // Check permission
          return role.permissions.includes(permission)
        }) ?? false
      }

      // Cache result
      if (cacheKey) {
        cache.set(cacheKey, result)
      }

      // Update analytics
      stats.totalChecks++
      stats.averageCheckTime = (stats.averageCheckTime + (performance.now() - startTime)) / 2

      return result

    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  // Batch permission checking
  const hasAnyPermission = (permissionsToCheck: Permission[], targetTenantId?: string): boolean => {
    if (permissionsToCheck.length === 0) return false

    // Check if user has wildcard permission
    if (effectivePermissions().includes('*')) {
      return true
    }

    return permissionsToCheck.some(permission => hasPermission(permission, targetTenantId))
  }

  const hasAllPermissions = (permissionsToCheck: Permission[], targetTenantId?: string): boolean => {
    if (permissionsToCheck.length === 0) return true

    // Check if user has wildcard permission
    if (effectivePermissions().includes('*')) {
      return true
    }

    return permissionsToCheck.every(permission => hasPermission(permission, targetTenantId))
  }

  // Permission level checking
  const hasPermissionLevel = (
    level: 'read' | 'write' | 'admin' | 'owner',
    resource: string,
    targetTenantId?: string
  ): boolean => {
    const permissions = effectivePermissions()

    // Check for wildcard permission
    if (permissions.includes('*')) {
      return true
    }

    // Check resource-specific permissions
    const readPermission = `${resource}:read` as Permission
    const writePermission = `${resource}:write` as Permission
    const adminPermission = `${resource}:admin` as Permission
    const ownerPermission = `${resource}:owner` as Permission

    switch (level) {
      case 'read':
        return hasAnyPermission([readPermission, writePermission, adminPermission, ownerPermission], targetTenantId)
      case 'write':
        return hasAnyPermission([writePermission, adminPermission, ownerPermission], targetTenantId)
      case 'admin':
        return hasAnyPermission([adminPermission, ownerPermission], targetTenantId)
      case 'owner':
        return hasPermission(ownerPermission, targetTenantId)
      default:
        return false
    }
  }

  const getUserPermissions = (targetTenantId?: string): Permission[] => {
    const currentUser = user()
    return calculatePermissions()(currentUser, targetTenantId)
  }

  const canAccessRoute = (routePath: string, targetTenantId?: string): boolean => {
    const requiredPermissions: Permission[] = []

    // Enhanced route permission mapping
    if (routePath.startsWith('/users')) {
      if (routePath.includes('/create')) requiredPermissions.push('users:create')
      else if (routePath.includes('/import')) requiredPermissions.push('users:manage_roles')
      else requiredPermissions.push('users:read')
    } else if (routePath.startsWith('/transactions')) {
      if (routePath.includes('/create')) requiredPermissions.push('transactions:create')
      else if (routePath.includes('/approve')) requiredPermissions.push('transactions:approve')
      else if (routePath.includes('/cancel')) requiredPermissions.push('transactions:cancel')
      else requiredPermissions.push('transactions:read')
    } else if (routePath.startsWith('/reports')) {
      if (routePath.includes('/export')) requiredPermissions.push('reports:export')
      else if (routePath.includes('/audit')) requiredPermissions.push('reports:audit')
      else requiredPermissions.push('reports:read')
    } else if (routePath.startsWith('/tenants')) {
      if (routePath.includes('/create')) requiredPermissions.push('tenants:create')
      else if (routePath.includes('/update')) requiredPermissions.push('tenants:update')
      else requiredPermissions.push('tenants:read')
    } else if (routePath.startsWith('/system')) {
      if (routePath.includes('/config')) requiredPermissions.push('system:config')
      else if (routePath.includes('/audit')) requiredPermissions.push('system:audit')
      else if (routePath.includes('/backup')) requiredPermissions.push('system:backup')
      requiredPermissions.push('system:config')
    }

    if (requiredPermissions.length === 0) {
      return true // Public route
    }

    return hasAnyPermission(requiredPermissions, targetTenantId)
  }

  const isSystemAdmin = (): boolean => {
    return user()?.isSystemAdmin ?? false
  }

  const userRole = (): Role | undefined => {
    const currentUser = user()
    return currentUser?.roles?.[0]?.role
  }

  const userRoles = (): Role[] => {
    const currentUser = user()
    return currentUser?.roles?.map(r => r.role) || []
  }

  // Enhanced state management
  const updateUser = (updates: Partial<User & { roles?: UserRole[]; isSystemAdmin?: boolean }>) => {
    const currentUser = user()
    if (currentUser) {
      const oldPermissions = permissions()
      const updatedUser = { ...currentUser, ...updates }
      setUser(updatedUser)

      // Fire permission change event
      const newPermissions = calculatePermissions()(updatedUser, tenantId())
      firePermissionChangeEvent({
        userId: updatedUser.id || '',
        oldPermissions,
        newPermissions,
        oldRole: userRole(),
        newRole: updatedUser.roles?.[0]?.role,
        timestamp: new Date(),
        source: 'user_update'
      })
    }
  }

  // Enhanced permission refresh
  const refreshPermissions = async (): Promise<void> => {
    setIsLoading(true)
    setPermissionError()

    try {
      const currentUser = user()
      const currentTenantId = tenantId()

      if (currentUser) {
        const oldPermissions = permissions()

        // Clear cache for current user
        invalidateCache(currentUser.id, currentTenantId)

        // Recalculate permissions
        const calculatedPermissions = calculatePermissions()(currentUser, currentTenantId)
        setPermissions(calculatedPermissions)
        setLastPermissionUpdate(new Date())

        // Fire permission change event
        firePermissionChangeEvent({
          userId: currentUser.id || '',
          oldPermissions,
          newPermissions: calculatedPermissions,
          oldRole: userRole(),
          newRole: userRole(),
          timestamp: new Date(),
          source: 'refresh'
        })
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      setPermissionError('Failed to refresh permissions')
      console.error('Failed to refresh permissions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const invalidateCache = (userId?: string, tenantId?: string): void => {
    const cache = permissionCache()
    const invalidated = cache.invalidate(userId, tenantId)
    if (invalidated > 0) {
      console.log(`Invalidated ${invalidated} permission cache entries`)
    }
  }

  const getPermissionCacheStats = () => {
    const cache = permissionCache()
    return {
      size: cache.getStats().size,
      hitRate: cache.getStats().hitRate,
      lastCleared: cache.getStats().lastCleared
    }
  }

  // Event handling
  const firePermissionChangeEvent = (event: PermissionChangeEvent) => {
    const callbacks = permissionChangeCallbacks()
    callbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in permission change callback:', error)
      }
    })

    // Publish to event bus if enabled
    const bus = eventBus()
    if (bus) {
      bus.publish('UserPermissionsChanged', event.data)
    }
  }

  const fireTenantChangeEvent = (event: TenantChangeEvent) => {
    const callbacks = tenantChangeCallbacks()
    callbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in tenant change callback:', error)
      }
    })

    // Publish to event bus if enabled
    const bus = eventBus()
    if (bus) {
      bus.publish('TenantSwitched', event.data)
    }
  }

  const subscribeToPermissionChanges = (callback: (event: PermissionChangeEvent) => void) => {
    const callbacks = permissionChangeCallbacks()
    callbacks.push(callback)

    // Return unsubscribe function
    return () => {
      const index = callbacks.indexOf(callback)
      if (index >= 0) {
        callbacks.splice(index, 1)
      }
    }
  }

  const subscribeToTenantChanges = (callback: (event: TenantChangeEvent) => void) => {
    const callbacks = tenantChangeCallbacks()
    callbacks.push(callback)

    // Return unsubscribe function
    return () => {
      const index = callbacks.indexOf(callback)
      if (index >= 0) {
        callbacks.splice(index, 1)
      }
    }
  }

  // Effects to update permissions when dependencies change
  createEffect(() => {
    const currentUser = user()
    const currentTenantId = tenantId()
    const calculatedPermissions = calculatePermissions()(currentUser, currentTenantId)
    setPermissions(calculatedPermissions)
  })

  createEffect(() => {
    setEffectivePermissions(updateEffectivePermissions()())
  })

  // Event subscription for domain events
  createEffect(() => {
    const bus = eventBus()
    if (!bus) return

    // Subscribe to navigation permission check events
    const unsubscribe = bus.subscribe('NavigationPermissionCheck', (event) => {
      // Update analytics if enabled
      if (enablePermissionAnalytics) {
        // Track permission check patterns
        console.log('Permission check tracked:', event.data)
      }
    })

    onCleanup(() => {
      unsubscribe()
    })
  })

  // Cleanup
  onCleanup(() => {
    const cache = permissionCache()
    cache.destroy()

    const bus = eventBus()
    if (bus) {
      bus.destroy()
    }
  })

  // Context value
  const contextValue: EnhancedPermissionContextType = {
    user: user(),
    tenantId: tenantId(),
    permissions: permissions(),
    effectivePermissions: effectivePermissions(),
    lastPermissionUpdate: lastPermissionUpdate(),
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasPermissionLevel,
    getUserPermissions,
    canAccessRoute,
    isSystemAdmin,
    userRole,
    userRoles,
    setUser: (newUser) => {
      const oldUser = user()
      setUser(newUser)

      if (oldUser?.id !== newUser?.id) {
        invalidateCache(oldUser?.id)
        invalidateCache(newUser?.id)
      }
    },
    setTenantId: (newTenantId) => {
      const oldTenantId = tenantId()
      setTenantId(newTenantId)

      if (oldTenantId !== newTenantId) {
        invalidateCache(user()?.id, oldTenantId)
        invalidateCache(user()?.id, newTenantId)

        // Fire tenant change event
        const currentUser = user()
        if (currentUser) {
          fireTenantChangeEvent({
            userId: currentUser.id || '',
            oldTenantId,
            newTenantId,
            userRole: userRole(),
            userPermissions: permissions(),
            timestamp: new Date()
          })
        }
      }
    },
    updateUser,
    isLoading: () => isLoading(),
    hasPermissionError: () => permissionError(),
    refreshPermissions,
    invalidateCache,
    getPermissionCacheStats,
    subscribeToPermissionChanges,
    subscribeToTenantChanges,
    getPermissionUsageStats: () => permissionUsageStats()
  }

  return (
    <EnhancedPermissionContext.Provider value={contextValue}>
      {children}
    </EnhancedPermissionContext.Provider>
  )
}

/**
 * Hook to use the Enhanced Permission Context
 */
export const useEnhancedPermissionContext = (): EnhancedPermissionContextType => {
  const context = useContext(EnhancedPermissionContext)

  if (!context) {
    throw new Error('useEnhancedPermissionContext must be used within an EnhancedPermissionProvider')
  }

  return context
}

/**
 * Hook to get enhanced permission checking utilities
 */
export const useEnhancedPermissions = () => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasPermissionLevel,
    getUserPermissions,
    canAccessRoute,
    isSystemAdmin,
    userRole,
    userRoles,
    isLoading,
    hasPermissionError,
    refreshPermissions,
    subscribeToPermissionChanges,
    getPermissionUsageStats
  } = useEnhancedPermissionContext()

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasPermissionLevel,
    getUserPermissions,
    canAccessRoute,
    isSystemAdmin,
    userRole,
    userRoles,
    isLoading,
    hasPermissionError,
    refreshPermissions,
    subscribeToPermissionChanges,
    getUsageStats: getPermissionUsageStats
  }
}

/**
 * Hook to get current user information with enhanced features
 */
export const useEnhancedCurrentUser = () => {
  const {
    user,
    tenantId,
    setUser,
    setTenantId,
    updateUser,
    effectivePermissions,
    lastPermissionUpdate,
    subscribeToTenantChanges
  } = useEnhancedPermissionContext()

  return {
    user: user(),
    tenantId: tenantId(),
    effectivePermissions: effectivePermissions(),
    lastPermissionUpdate: lastPermissionUpdate(),
    setUser,
    setTenantId,
    updateUser,
    subscribeToTenantChanges
  }
}