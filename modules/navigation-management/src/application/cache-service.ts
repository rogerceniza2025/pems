import type { Permission } from '@pems/auth'
import type { NavigationCacheEntry } from '../domain'

/**
 * Cache Entry with additional metadata
 */
export interface ExtendedCacheEntry extends NavigationCacheEntry {
  lastAccessed: Date
  accessCount: number
  size: number // approximate size in bytes
  tags: string[]
}

/**
 * Cache Statistics
 */
export interface CacheStatistics {
  totalEntries: number
  totalSize: number // in bytes
  hitCount: number
  missCount: number
  hitRatio: number
  oldestEntry?: Date
  newestEntry?: Date
  averageEntryAge: number // in milliseconds
  topAccessedEntries: Array<{
    key: string
    accessCount: number
    lastAccessed: Date
  }>
}

/**
 * Cache Configuration
 */
export interface CacheConfiguration {
  maxEntries: number
  maxSize: number // in bytes
  maxAge: number // in milliseconds
  cleanupInterval: number // in milliseconds
  enableCompression: boolean
  enableMetrics: boolean
  strategy: 'lru' | 'lfu' | 'ttl' | 'hybrid'
}

/**
 * Cache Invalidation Event
 */
export interface CacheInvalidationEvent {
  type: 'user' | 'tenant' | 'role' | 'permission' | 'global' | 'manual'
  pattern: string // cache key pattern to match
  reason: string
  timestamp: Date
  affectedKeys: string[]
}

/**
 * Navigation Cache Service
 *
 * Provides intelligent caching for navigation data with multiple eviction strategies,
  * compression, and comprehensive metrics.
 */
export class NavigationCacheService {
  private readonly _config: CacheConfiguration
  private readonly _cache: Map<string, ExtendedCacheEntry> = new Map()
  private readonly _accessOrder: string[] = [] // For LRU
  private readonly _tags: Map<string, Set<string>> = new Map() // tag -> keys mapping
  private _statistics: CacheStatistics
  private _cleanupTimer?: NodeJS.Timeout
  private _invalidationEvents: CacheInvalidationEvent[] = []

  constructor(config: Partial<CacheConfiguration> = {}) {
    this._config = {
      maxEntries: config.maxEntries || 1000,
      maxSize: config.maxSize || 50 * 1024 * 1024, // 50MB
      maxAge: config.maxAge || 15 * 60 * 1000, // 15 minutes
      cleanupInterval: config.cleanupInterval || 5 * 60 * 1000, // 5 minutes
      enableCompression: config.enableCompression || false,
      enableMetrics: config.enableMetrics || true,
      strategy: config.strategy || 'hybrid'
    }

    this._statistics = this.initializeStatistics()
    this.startCleanupTimer()
  }

  /**
   * Get cache entry
   */
  get(key: string): NavigationCacheEntry | undefined {
    const entry = this._cache.get(key)

    if (!entry) {
      this.recordMiss()
      return undefined
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key)
      this.recordMiss()
      return undefined
    }

    // Update access information
    entry.lastAccessed = new Date()
    entry.accessCount++
    this.updateAccessOrder(key)

    this.recordHit()
    return this.sanitizeEntry(entry)
  }

  /**
   * Set cache entry
   */
  set(key: string, entry: NavigationCacheEntry, tags: string[] = []): void {
    const size = this.calculateSize(entry)

    // Check size limits
    if (size > this._config.maxSize) {
      console.warn(`Cache entry too large: ${size} bytes (max: ${this._config.maxSize})`)
      return
    }

    // Ensure capacity
    this.ensureCapacity()

    const extendedEntry: ExtendedCacheEntry = {
      ...entry,
      lastAccessed: new Date(),
      accessCount: 1,
      size,
      tags
    }

    this._cache.set(key, extendedEntry)
    this.updateAccessOrder(key)

    // Update tag mappings
    tags.forEach(tag => {
      if (!this._tags.has(tag)) {
        this._tags.set(tag, new Set())
      }
      this._tags.get(tag)!.add(key)
    })

    this.updateStatistics()
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    const entry = this._cache.get(key)
    if (!entry) {
      return false
    }

    // Remove from tag mappings
    entry.tags.forEach(tag => {
      const tagKeys = this._tags.get(tag)
      if (tagKeys) {
        tagKeys.delete(key)
        if (tagKeys.size === 0) {
          this._tags.delete(tag)
        }
      }
    })

    // Remove from access order
    const index = this._accessOrder.indexOf(key)
    if (index > -1) {
      this._accessOrder.splice(index, 1)
    }

    this._cache.delete(key)
    this.updateStatistics()

    return true
  }

  /**
   * Clear cache
   */
  clear(): void {
    this._cache.clear()
    this._accessOrder.length = 0
    this._tags.clear()
    this._statistics = this.initializeStatistics()
    console.log('Navigation cache cleared')
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidate(pattern: string, reason: string = 'manual'): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    const keysToDelete: string[] = []

    for (const [key] of this._cache) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.delete(key))

    this.recordInvalidation('manual', pattern, reason, keysToDelete)

    console.log(`Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`)
    return keysToDelete.length
  }

  /**
   * Invalidate cache entries by tag
   */
  invalidateByTag(tag: string, reason: string = 'manual'): number {
    const keys = this._tags.get(tag)
    if (!keys) {
      return 0
    }

    const keysToDelete = Array.from(keys)
    keysToDelete.forEach(key => this.delete(key))

    this.recordInvalidation('manual', `tag:${tag}`, reason, keysToDelete)

    console.log(`Invalidated ${keysToDelete.length} cache entries with tag: ${tag}`)
    return keysToDelete.length
  }

  /**
   * Invalidate cache entries for user
   */
  invalidateUser(userId: string, tenantId?: string): number {
    const pattern = tenantId
      ? `${userId}:${tenantId}:*`
      : `${userId}:*`

    return this.invalidate(pattern, 'user_permissions_changed')
  }

  /**
   * Invalidate cache entries for tenant
   */
  invalidateTenant(tenantId: string): number {
    return this.invalidate(`*:${tenantId}:*`, 'tenant_changed')
  }

  /**
   * Invalidate cache entries for role
   */
  invalidateRole(role: string): number {
    return this.invalidate(`*:*:${role}:*`, 'role_changed')
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    this.updateStatistics()
    return { ...this._statistics }
  }

  /**
   * Get invalidation events
   */
  getInvalidationEvents(limit: number = 100): CacheInvalidationEvent[] {
    return this._invalidationEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Warm up cache with common entries
   */
  async warmUp(
    entries: Array<{
      key: string
      entry: NavigationCacheEntry
      tags?: string[]
    }>
  ): Promise<void> {
    console.log(`Warming up cache with ${entries.length} entries`)

    for (const { key, entry, tags = [] } of entries) {
      if (!this._cache.has(key)) {
        this.set(key, entry, tags)
      }
    }

    console.log('Cache warm-up completed')
  }

  /**
   * Export cache data
   */
  export(): Record<string, any> {
    const entries: Record<string, any> = {}

    for (const [key, entry] of this._cache) {
      entries[key] = this.sanitizeEntry(entry)
    }

    return {
      entries,
      statistics: this._statistics,
      config: this._config,
      exportedAt: new Date().toISOString()
    }
  }

  /**
   * Import cache data
   */
  import(data: Record<string, any>): void {
    if (data.entries) {
      for (const [key, entry] of Object.entries(data.entries)) {
        try {
          this.set(key, entry as NavigationCacheEntry)
        } catch (error) {
          console.warn(`Failed to import cache entry ${key}:`, error)
        }
      }
    }

    console.log('Cache import completed')
  }

  /**
   * Destroy cache service
   */
  destroy(): void {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer)
      this._cleanupTimer = undefined
    }
    this.clear()
    console.log('Navigation cache service destroyed')
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: ExtendedCacheEntry): boolean {
    return new Date() > entry.expiresAt
  }

  /**
   * Calculate entry size
   */
  private calculateSize(entry: NavigationCacheEntry): number {
    // Rough estimation of JSON serialized size
    return JSON.stringify(entry).length * 2 // 2 bytes per character (UTF-16)
  }

  /**
   * Ensure cache capacity
   */
  private ensureCapacity(): void {
    // Remove expired entries first
    this.removeExpiredEntries()

    // Check if we still need to make space
    while (this._cache.size >= this._config.maxEntries ||
           this.getTotalSize() > this._config.maxSize) {
      this.evictEntry()
    }
  }

  /**
   * Remove expired entries
   */
  private removeExpiredEntries(): void {
    const expiredKeys: string[] = []

    for (const [key, entry] of this._cache) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.delete(key))

    if (expiredKeys.length > 0) {
      console.log(`Removed ${expiredKeys.length} expired cache entries`)
    }
  }

  /**
   * Evict entry based on strategy
   */
  private evictEntry(): void {
    if (this._cache.size === 0) {
      return
    }

    let keyToEvict: string | undefined

    switch (this._config.strategy) {
      case 'lru':
        keyToEvict = this._accessOrder[0]
        break

      case 'lfu':
        keyToEvict = this.findLeastFrequentlyUsed()
        break

      case 'ttl':
        keyToEvict = this.findOldestEntry()
        break

      case 'hybrid':
        // Hybrid: Prefer LRU but consider access frequency
        keyToEvict = this.findHybridEvictionCandidate()
        break
    }

    if (keyToEvict) {
      this.delete(keyToEvict)
    }
  }

  /**
   * Find least frequently used entry
   */
  private findLeastFrequentlyUsed(): string | undefined {
    let leastFrequentKey: string | undefined
    let minAccessCount = Infinity

    for (const [key, entry] of this._cache) {
      if (entry.accessCount < minAccessCount) {
        minAccessCount = entry.accessCount
        leastFrequentKey = key
      }
    }

    return leastFrequentKey
  }

  /**
   * Find oldest entry
   */
  private findOldestEntry(): string | undefined {
    let oldestKey: string | undefined
    let oldestTime = new Date()

    for (const [key, entry] of this._cache) {
      if (entry.cachedAt < oldestTime) {
        oldestTime = entry.cachedAt
        oldestKey = key
      }
    }

    return oldestKey
  }

  /**
   * Find hybrid eviction candidate
   */
  private findHybridEvictionCandidate(): string | undefined {
    // Score based on recency and frequency
    let bestKey: string | undefined
    let bestScore = Infinity

    const now = new Date()

    for (const [key, entry] of this._cache) {
      const ageHours = (now.getTime() - entry.cachedAt.getTime()) / (1000 * 60 * 60)
      const accessFrequency = entry.accessCount / Math.max(ageHours, 1)

      // Lower score = better eviction candidate
      const score = ageHours / accessFrequency

      if (score < bestScore) {
        bestScore = score
        bestKey = key
      }
    }

    return bestKey
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    const index = this._accessOrder.indexOf(key)
    if (index > -1) {
      this._accessOrder.splice(index, 1)
    }
    this._accessOrder.push(key)
  }

  /**
   * Get total cache size
   */
  private getTotalSize(): number {
    let totalSize = 0
    for (const entry of this._cache.values()) {
      totalSize += entry.size
    }
    return totalSize
  }

  /**
   * Initialize statistics
   */
  private initializeStatistics(): CacheStatistics {
    return {
      totalEntries: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      hitRatio: 0,
      averageEntryAge: 0,
      topAccessedEntries: []
    }
  }

  /**
   * Update statistics
   */
  private updateStatistics(): void {
    const entries = Array.from(this._cache.values())
    const now = new Date()

    this._statistics.totalEntries = entries.length
    this._statistics.totalSize = this.getTotalSize()

    if (entries.length > 0) {
      this._statistics.oldestEntry = new Date(Math.min(...entries.map(e => e.cachedAt.getTime())))
      this._statistics.newestEntry = new Date(Math.max(...entries.map(e => e.cachedAt.getTime())))

      const totalAge = entries.reduce((sum, entry) =>
        sum + (now.getTime() - entry.cachedAt.getTime()), 0
      )
      this._statistics.averageEntryAge = totalAge / entries.length

      // Top accessed entries
      this._statistics.topAccessedEntries = entries
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 10)
        .map(entry => ({
          key: '', // Would need to track this differently
          accessCount: entry.accessCount,
          lastAccessed: entry.lastAccessed
        }))
    }
  }

  /**
   * Record cache hit
   */
  private recordHit(): void {
    if (this._config.enableMetrics) {
      this._statistics.hitCount++
      const total = this._statistics.hitCount + this._statistics.missCount
      this._statistics.hitRatio = total > 0 ? this._statistics.hitCount / total : 0
    }
  }

  /**
   * Record cache miss
   */
  private recordMiss(): void {
    if (this._config.enableMetrics) {
      this._statistics.missCount++
      const total = this._statistics.hitCount + this._statistics.missCount
      this._statistics.hitRatio = total > 0 ? this._statistics.hitCount / total : 0
    }
  }

  /**
   * Record invalidation event
   */
  private recordInvalidation(
    type: CacheInvalidationEvent['type'],
    pattern: string,
    reason: string,
    affectedKeys: string[]
  ): void {
    this._invalidationEvents.push({
      type,
      pattern,
      reason,
      timestamp: new Date(),
      affectedKeys
    })

    // Keep only recent events (last 1000)
    if (this._invalidationEvents.length > 1000) {
      this._invalidationEvents = this._invalidationEvents.slice(-1000)
    }
  }

  /**
   * Sanitize entry for external consumption
   */
  private sanitizeEntry(entry: ExtendedCacheEntry): NavigationCacheEntry {
    return {
      userId: entry.userId,
      tenantId: entry.tenantId,
      roleId: entry.roleId,
      navigationItems: entry.navigationItems,
      permissions: entry.permissions,
      cachedAt: entry.cachedAt,
      expiresAt: entry.expiresAt,
      version: entry.version
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this._cleanupTimer = setInterval(() => {
      this.removeExpiredEntries()
    }, this._config.cleanupInterval)
  }
}