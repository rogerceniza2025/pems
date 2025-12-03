import {
  createSignal,
  createEffect,
  onCleanup,
  createMemo
} from 'solid-js'
import { useEnhancedPermissionContext } from '../contexts/PermissionContextEnhanced'
import { NavigationCache } from '@pems/infrastructure-cache'
import type { NavigationItem } from '@pems/navigation-management'

/**
 * Navigation Cache Hook Configuration
 */
export interface UseNavigationCacheConfig {
  enablePersistence?: boolean
  cacheTimeout?: number // milliseconds
  maxCacheSize?: number
  enableCompression?: boolean
  enableMetrics?: boolean
  keyPrefix?: string
}

/**
 * Navigation Cache Statistics
 */
export interface NavigationCacheStats {
  size: number
  hitCount: number
  missCount: number
  hitRatio: number
  totalSize: number // bytes
  lastCleared?: Date
  averageAccessTime: number
  oldestEntry?: Date
  newestEntry?: Date
}

/**
 * Cache Entry Metadata
 */
interface CacheEntryMetadata {
  createdAt: Date
  lastAccessed: Date
  accessCount: number
  size: number
  userId: string
  tenantId?: string
  permissions: string[]
  tags: string[]
}

/**
 * Enhanced Navigation Cache Entry
 */
interface NavigationCacheEntry<T = any> {
  data: T
  metadata: CacheEntryMetadata
  checksum?: string
}

/**
 * useNavigationCache Hook
 *
 * Provides intelligent caching for navigation data with:
 * - L1/L2 cache levels
 * - Permission-aware invalidation
 * - Compression support
 * - Analytics and metrics
 * - Persistent storage
 */
export function useNavigationCache(config: UseNavigationCacheConfig = {}) {
  const {
    enablePersistence = true,
    cacheTimeout = 15 * 60 * 1000, // 15 minutes
    maxCacheSize = 100,
    enableCompression = false,
    enableMetrics = true,
    keyPrefix = 'navigation-cache'
  } = config

  // Permission context
  const { user, tenantId, permissions, subscribeToPermissionChanges, subscribeToTenantChanges } = useEnhancedPermissionContext()

  // Cache instances
  const [l1Cache] = createSignal(() => new NavigationCache<T>({
    enableMetrics: enableMetrics,
    l1Config: {
      maxEntries: maxCacheSize,
      maxSize: 10 * 1024 * 1024, // 10MB
      maxAge: cacheTimeout,
      enableCompression: enableCompression,
      strategy: 'lru'
    },
    l2Config: {
      enable: enablePersistence,
      storage: 'localStorage',
      maxEntries: maxCacheSize * 2,
      maxSize: 50 * 1024 * 1024, // 50MB
      maxAge: cacheTimeout * 2,
      compressionLevel: enableCompression ? 6 : 0,
      syncInterval: 30 * 1000 // 30 seconds
    }
  }))

  // Cache statistics
  const [cacheStats, setCacheStats] = createSignal<NavigationCacheStats>({
    size: 0,
    hitCount: 0,
    missCount: 0,
    hitRatio: 0,
    totalSize: 0,
    averageAccessTime: 0
  })

  // Generate cache key
  const generateCacheKey = createMemo(() => {
    const currentUser = user()
    const currentTenantId = tenantId()
    const userPermissions = permissions()

    return (key: string, suffix?: string) => {
      if (!currentUser) return null

      const userId = currentUser.id || 'anonymous'
      const tenant = currentTenantId || 'global'
      const permissionHash = userPermissions.slice().sort().join(',')
      const userRole = currentUser.roles?.[0]?.role || 'no-role'

      return `${keyPrefix}:${userId}:${tenant}:${userRole}:${permissionHash}:${key}${suffix ? `:${suffix}` : ''}`
    }
  })

  // Get cache value
  const get = async <T>(key: string, defaultValue?: T): Promise<T | undefined> => {
    const startTime = performance.now()
    const cacheKey = generateCacheKey()(key)

    if (!cacheKey) {
      return defaultValue
    }

    try {
      const cached = await l1Cache().get(cacheKey)
      const endTime = performance.now()

      updateStats(cached !== undefined, endTime - startTime)

      return cached !== undefined ? (cached as T) : defaultValue
    } catch (error) {
      console.error('Cache get error:', error)
      return defaultValue
    }
  }

  // Set cache value
  const set = async <T>(key: string, value: T, options: {
    ttl?: number
    tags?: string[]
    userId?: string
    tenantId?: string
    permissions?: string[]
  } = {}): Promise<void> => {
    const cacheKey = generateCacheKey()(key)
    if (!cacheKey) return

    try {
      const currentUser = user()
      const currentTenantId = tenantId()
      const userPermissions = permissions()

      const metadata: CacheEntryMetadata = {
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 1,
        size: calculateSize(value),
        userId: options.userId || currentUser?.id || 'anonymous',
        tenantId: options.tenantId || currentTenantId,
        permissions: options.permissions || userPermissions,
        tags: options.tags || []
      }

      await l1Cache().set(cacheKey, value, {
        ttl: options.ttl || cacheTimeout,
        tags: ['navigation', metadata.userId, metadata.tenantId || 'global', ...metadata.tags]
      })
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  // Remove cache entry
  const remove = async (key: string): Promise<boolean> => {
    const cacheKey = generateCacheKey()(key)
    if (!cacheKey) return false

    try {
      return await l1Cache().delete(cacheKey)
    } catch (error) {
      console.error('Cache remove error:', error)
      return false
    }
  }

  // Clear cache
  const clear = async (options: {
    userId?: string
    tenantId?: string
    pattern?: RegExp
    tags?: string[]
  } = {}): Promise<number> => {
    try {
      const { userId: targetUserId, tenantId: targetTenantId, pattern, tags } = options
      let cleared = 0

      // Clear by user
      if (targetUserId) {
        const userPattern = new RegExp(`^${keyPrefix}:${targetUserId}:`)
        cleared += await clearByPattern(userPattern)
      }

      // Clear by tenant
      if (targetTenantId) {
        const tenantPattern = new RegExp(`^${keyPrefix}:.*:${targetTenantId}:`)
        cleared += await clearByPattern(tenantPattern)
      }

      // Clear by pattern
      if (pattern) {
        cleared += await clearByPattern(pattern)
      }

      // Clear by tags
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          cleared += await l1Cache().invalidateByTag(tag)
        }
      }

      // Clear all if no specific criteria
      if (!targetUserId && !targetTenantId && !pattern && (!tags || tags.length === 0)) {
        await l1Cache().clear()
        cleared = 999 // Indicate full clear
      }

      return cleared
    } catch (error) {
      console.error('Cache clear error:', error)
      return 0
    }
  }

  // Helper to clear by pattern
  const clearByPattern = async (pattern: RegExp): Promise<number> => {
    // This would need to be implemented in the NavigationCache class
    // For now, we'll use the invalidateByPattern method
    try {
      const stats = l1Cache().getStatistics()
      const beforeSize = stats.l1Entries
      await l1Cache().invalidateByPattern(pattern)
      const afterSize = l1Cache().getStatistics().l1Entries
      return beforeSize - afterSize
    } catch (error) {
      console.error('Pattern clear error:', error)
      return 0
    }
  }

  // Get cache statistics
  const getStats = (): NavigationCacheStats => {
    const stats = l1Cache().getStatistics()

    return {
      size: stats.l1Entries + stats.l2Entries,
      hitCount: stats.hitCount,
      missCount: stats.missCount,
      hitRatio: stats.hitRatio,
      totalSize: stats.l1Size + stats.l2Size,
      lastCleared: stats.lastUpdated, // Approximation
      averageAccessTime: stats.averageL1HitTime || 0,
      oldestEntry: undefined, // Would need to be implemented in cache
      newestEntry: undefined   // Would need to be implemented in cache
    }
  }

  // Cache warming
  const warmCache = async (entries: Array<{
    key: string
    value: any
    tags?: string[]
  }>): Promise<void> => {
    console.log(`Warming navigation cache with ${entries.length} entries`)

    for (const entry of entries) {
      await set(entry.key, entry.value, {
        tags: entry.tags
      })
    }

    console.log('Navigation cache warming completed')
  }

  // Export cache data
  const exportCache = async (): Promise<Record<string, any>> => {
    try {
      const stats = l1Cache().export()
      return {
        ...stats,
        exportedAt: new Date().toISOString(),
        config: {
          enablePersistence,
          cacheTimeout,
          maxCacheSize,
          enableCompression,
          enableMetrics,
          keyPrefix
        }
      }
    } catch (error) {
      console.error('Cache export error:', error)
      return {}
    }
  }

  // Import cache data
  const importCache = async (data: Record<string, any>): Promise<void> => {
    try {
      if (data.entries && typeof data.entries === 'object') {
        const cache = l1Cache()
        await cache.import(data)
      }
      console.log('Navigation cache import completed')
    } catch (error) {
      console.error('Cache import error:', error)
    }
  }

  // Maintenance operations
  const maintenance = async (): Promise<void> => {
    try {
      await l1Cache().maintenance()
      console.log('Navigation cache maintenance completed')
    } catch (error) {
      console.error('Cache maintenance error:', error)
    }
  }

  // Update statistics
  const updateStats = (hit: boolean, accessTime: number) => {
    if (!enableMetrics) return

    setCacheStats(prev => {
      const newStats = { ...prev }

      if (hit) {
        newStats.hitCount++
      } else {
        newStats.missCount++
      }

      const total = newStats.hitCount + newStats.missCount
      newStats.hitRatio = total > 0 ? newStats.hitCount / total : 0
      newStats.averageAccessTime = (prev.averageAccessTime + accessTime) / 2

      return newStats
    })
  }

  // Calculate data size
  const calculateSize = (data: any): number => {
    return JSON.stringify(data).length * 2 // Rough estimation
  }

  // Auto-invalidation on permission changes
  createEffect(() => {
    const unsubscribe = subscribeToPermissionChanges((event) => {
      console.log('Permission changes detected, invalidating cache')
      clear({
        userId: event.userId,
        tenantId: event.tenantId
      })
    })

    onCleanup(() => {
      unsubscribe()
    })
  })

  // Auto-invalidation on tenant changes
  createEffect(() => {
    const unsubscribe = subscribeToTenantChanges((event) => {
      console.log('Tenant changes detected, invalidating cache')
      clear({
        userId: event.userId,
        tenantId: event.oldTenantId || event.newTenantId
      })
    })

    onCleanup(() => {
      unsubscribe()
    })
  })

  // Cleanup on unmount
  onCleanup(() => {
    l1Cache().destroy()
  })

  return {
    // Cache operations
    get,
    set,
    remove,
    clear,

    // Utilities
    getStats,
    warmCache,
    exportCache,
    importCache,
    maintenance,

    // Reactive values
    stats: cacheStats()
  }
}

/**
 * useNavigationCacheItem Hook
 *
 * Provides caching for individual navigation items
 */
export function useNavigationCacheItem(item: NavigationItem, config: UseNavigationCacheConfig = {}) {
  const navigationCache = useNavigationCache(config)

  const itemCacheKey = `item:${item.id || item.path}`

  const getCachedItem = async () => {
    return await navigationCache.get(itemCacheKey, item)
  }

  const setCachedItem = async (options: {
    ttl?: number
    tags?: string[]
  } = {}) => {
    return await navigationCache.set(itemCacheKey, item, {
      ...options,
      tags: ['navigation-item', item.label.toLowerCase().replace(/\s+/g, '-'), ...(options.tags || [])]
    })
  }

  const invalidateItem = async () => {
    return await navigationCache.remove(itemCacheKey)
  }

  return {
    getCachedItem,
    setCachedItem,
    invalidateItem,
    cacheKey: itemCacheKey
  }
}

/**
 * useNavigationCacheBulk Hook
 *
 * Provides bulk caching operations for navigation items
 */
export function useNavigationCacheBulk(items: NavigationItem[], config: UseNavigationCacheConfig = {}) {
  const navigationCache = useNavigationCache(config)

  const getBulkCachedItems = async (): Promise<NavigationItem[]> => {
    const results: NavigationItem[] = []

    for (const item of items) {
      const cached = await navigationCache.get(`item:${item.id || item.path}`, item)
      results.push(cached)
    }

    return results
  }

  const setBulkCachedItems = async (options: {
    ttl?: number
    tags?: string[]
  } = {}) => {
    for (const item of items) {
      await navigationCache.set(`item:${item.id || item.path}`, item, {
        ...options,
        tags: ['navigation-item', item.label.toLowerCase().replace(/\s+/g, '-'), ...(options.tags || [])]
      })
    }
  }

  const clearBulkCache = async (): Promise<number> => {
    let cleared = 0
    for (const item of items) {
      const result = await navigationCache.remove(`item:${item.id || item.path}`)
      if (result) cleared++
    }
    return cleared
  }

  return {
    getBulkCachedItems,
    setBulkCachedItems,
    clearBulkCache,
    itemCount: items.length
  }
}

/**
 * useNavigationCacheMetrics Hook
 *
 * Provides detailed cache metrics and analytics
 */
export function useNavigationCacheMetrics() {
  const navigationCache = useNavigationCache({ enableMetrics: true })

  const getDetailedMetrics = () => {
    const stats = navigationCache.getStats()

    return {
      ...stats,
      efficiency: stats.hitRatio > 0.8 ? 'excellent' : stats.hitRatio > 0.6 ? 'good' : 'poor',
      health: stats.size > stats.totalSize * 0.8 ? 'warning' : 'healthy',
      recommendations: generateRecommendations(stats)
    }
  }

  const generateRecommendations = (stats: NavigationCacheStats): string[] => {
    const recommendations: string[] = []

    if (stats.hitRatio < 0.5) {
      recommendations.push('Consider increasing cache timeout - low hit ratio detected')
    }

    if (stats.size > stats.totalSize * 0.9) {
      recommendations.push('Cache approaching size limit - consider cleanup or eviction')
    }

    if (stats.averageAccessTime > 100) {
      recommendations.push('High access time detected - consider cache optimization')
    }

    if (stats.hitCount + stats.missCount < 100) {
      recommendations.push('Low cache usage - caching may not be beneficial for current workload')
    }

    return recommendations
  }

  return {
    getDetailedMetrics,
    getRecommendations: () => generateRecommendations(navigationCache.getStats())
  }
}