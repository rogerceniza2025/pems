import { z } from 'zod'
import { nanoid } from 'nanoid'

/**
 * Cache Level Enum
 */
export const CacheLevelSchema = z.enum(['L1', 'L2'])
export type CacheLevel = z.infer<typeof CacheLevelSchema>

/**
 * Cache Entry Status
 */
export const CacheEntryStatusSchema = z.enum([
  'fresh',
  'stale',
  'expired',
  'updating'
])
export type CacheEntryStatus = z.infer<typeof CacheEntryStatusSchema>

/**
 * Base Cache Entry Interface
 */
export interface BaseCacheEntry<T = any> {
  key: string
  value: T
  level: CacheLevel
  status: CacheEntryStatus
  createdAt: Date
  lastAccessed: Date
  expiresAt: Date
  accessCount: number
  size: number
  version: string
  tags: string[]
  metadata?: Record<string, any>
}

/**
 * L1 Cache Entry (Memory)
 */
export interface L1CacheEntry<T = any> extends BaseCacheEntry<T> {
  level: 'L1'
  compressionRatio?: number
  memoryUsage?: number
}

/**
 * L2 Cache Entry (Persistent)
 */
export interface L2CacheEntry<T = any> extends BaseCacheEntry<T> {
  level: 'L2'
  storageLocation: 'localStorage' | 'indexedDB' | 'file'
  syncStatus: 'synced' | 'pending' | 'conflict'
  lastSynced?: Date
}

/**
 * Cache Configuration
 */
export interface NavigationCacheConfig {
  // L1 Cache (Memory) Configuration
  l1Config: {
    maxEntries: number
    maxSize: number // bytes
    maxAge: number // milliseconds
    enableCompression: boolean
    strategy: 'lru' | 'lfu' | 'fifo'
  }

  // L2 Cache (Persistent) Configuration
  l2Config: {
    enable: boolean
    storage: 'localStorage' | 'indexedDB' | 'both'
    maxEntries: number
    maxSize: number // bytes
    maxAge: number // milliseconds
    compressionLevel: number // 0-9
    syncInterval: number // milliseconds
  }

  // Cache Sync Configuration
  syncConfig: {
    enableSync: boolean
    syncOnWrite: boolean
    syncOnRead: boolean
    conflictResolution: 'l1_wins' | 'l2_wins' | 'merge'
    retryAttempts: number
    retryDelay: number
  }

  // Cache Validation Configuration
  validationConfig: {
    enableChecksum: boolean
    enableSignature: boolean
    schemaValidation: boolean
  }

  // Performance Configuration
  performanceConfig: {
    enableMetrics: boolean
    enableProfiling: boolean
    batchSize: number
    prefetchEnabled: boolean
    prefetchThreshold: number
  }
}

/**
 * Cache Statistics
 */
export interface CacheStatistics {
  totalEntries: number
  l1Entries: number
  l2Entries: number
  totalSize: number
  l1Size: number
  l2Size: number

  // Performance Metrics
  hitCount: number
  missCount: number
  l1HitCount: number
  l2HitCount: number
  hitRatio: number
  l1HitRatio: number
  l2HitRatio: number

  // Latency Metrics
  averageL1HitTime: number // microseconds
  averageL2HitTime: number // microseconds
  averageMissTime: number // microseconds

  // Eviction Metrics
  evictionCount: number
  l1EvictionCount: number
  l2EvictionCount: number

  // Sync Metrics
  syncCount: number
  syncConflicts: number
  syncErrors: number

  // Storage Metrics
  compressionRatio: number
  storageEfficiency: number

  lastUpdated: Date
}

/**
 * Cache Event Types
 */
export interface CacheEvent<T = any> {
  type: 'hit' | 'miss' | 'set' | 'delete' | 'evict' | 'sync' | 'error'
  level: CacheLevel
  key: string
  timestamp: Date
  data?: T
  metadata?: Record<string, any>
  error?: Error
}

/**
 * Multi-Layer Navigation Cache
 *
 * This class implements a sophisticated two-level caching system with:
 * - L1: Fast in-memory cache
 * - L2: Persistent cache (localStorage/IndexedDB)
 * - Intelligent cache promotion/demotion
 * - Automatic synchronization
 * - Comprehensive metrics and monitoring
 */
export class NavigationCache<T = any> {
  private readonly _config: NavigationCacheConfig
  private readonly _l1Cache: Map<string, L1CacheEntry<T>>
  private readonly _l2Cache: Map<string, L2CacheEntry<T>>
  private readonly _tagIndex: Map<string, Set<string>>
  private readonly _statistics: CacheStatistics
  private readonly _events: CacheEvent<T>[]
  private _syncTimer?: NodeJS.Timeout
  private _metricsEnabled: boolean

  constructor(config: Partial<NavigationCacheConfig> = {}) {
    this._config = this.mergeConfig(config)
    this._l1Cache = new Map()
    this._l2Cache = new Map()
    this._tagIndex = new Map()
    this._events = []
    this._metricsEnabled = this._config.performanceConfig.enableMetrics

    this._statistics = this.initializeStatistics()
    this.initializeSyncTimer()
  }

  /**
   * Get value from cache (searches L1 then L2)
   */
  async get(key: string): Promise<T | undefined> {
    const startTime = performance.now()

    try {
      // Try L1 cache first
      const l1Entry = this._l1Cache.get(key)
      if (l1Entry && !this.isExpired(l1Entry)) {
        await this.updateAccess(l1Entry)
        this.recordHit('L1', key, l1Entry.value, performance.now() - startTime)
        return l1Entry.value
      }

      // Try L2 cache
      if (this._config.l2Config.enable) {
        const l2Entry = await this.getFromL2(key)
        if (l2Entry && !this.isExpired(l2Entry)) {
          // Promote to L1 if eligible
          if (this.shouldPromoteToL1(l2Entry)) {
            await this.promoteToL1(l2Entry)
          }

          await this.updateAccess(l2Entry)
          this.recordHit('L2', key, l2Entry.value, performance.now() - startTime)
          return l2Entry.value
        }
      }

      this.recordMiss(key, performance.now() - startTime)
      return undefined

    } catch (error) {
      this.recordError('get', key, error as Error)
      return undefined
    }
  }

  /**
   * Set value in cache (writes to both L1 and L2)
   */
  async set(
    key: string,
    value: T,
    options: {
      ttl?: number
      tags?: string[]
      metadata?: Record<string, any>
      l2Only?: boolean
    } = {}
  ): Promise<void> {
    const startTime = performance.now()

    try {
      const {
        ttl = this._config.l1Config.maxAge,
        tags = [],
        metadata = {},
        l2Only = false
      } = options

      const expiresAt = new Date(Date.now() + ttl)
      const size = this.calculateSize(value)

      // Create L2 entry first (if enabled)
      let l2Entry: L2CacheEntry<T> | undefined
      if (this._config.l2Config.enable) {
        l2Entry = await this.createL2Entry(key, value, expiresAt, tags, metadata)
        this._l2Cache.set(key, l2Entry)
        this.updateTagIndex(key, tags)
      }

      // Create L1 entry (unless L2 only)
      if (!l2Only) {
        const l1Entry = await this.createL1Entry(key, value, expiresAt, tags, metadata)
        this._l1Cache.set(key, l1Entry)

        // Ensure L1 capacity
        await this.ensureL1Capacity()
      }

      // Sync to persistent storage
      if (this._config.syncConfig.syncOnWrite) {
        await this.syncToStorage(l2Entry)
      }

      this.recordSet(key, value, performance.now() - startTime)

    } catch (error) {
      this.recordError('set', key, error as Error)
      throw error
    }
  }

  /**
   * Delete value from cache (removes from both L1 and L2)
   */
  async delete(key: string): Promise<boolean> {
    const startTime = performance.now()

    try {
      const l1Deleted = this._l1Cache.delete(key)
      const l2Deleted = this._l2Cache.delete(key)

      // Remove from tag index
      this.removeFromTagIndex(key)

      const deleted = l1Deleted || l2Deleted
      if (deleted) {
        this.recordDelete(key, performance.now() - startTime)
      }

      return deleted

    } catch (error) {
      this.recordError('delete', key, error as Error)
      return false
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const l1Exists = this._l1Cache.has(key)
    if (l1Exists) {
      const l1Entry = this._l1Cache.get(key)
      return l1Entry ? !this.isExpired(l1Entry) : false
    }

    if (this._config.l2Config.enable) {
      const l2Entry = await this.getFromL2(key)
      return l2Entry ? !this.isExpired(l2Entry) : false
    }

    return false
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this._l1Cache.clear()
    this._l2Cache.clear()
    this._tagIndex.clear()
    this._events.length = 0
    this._statistics.lastUpdated = new Date()

    // Clear persistent storage
    if (this._config.l2Config.enable) {
      await this.clearStorage()
    }

    console.log('Navigation cache cleared')
  }

  /**
   * Invalidate cache entries by tag pattern
   */
  async invalidateByTag(tag: string): Promise<number> {
    const keys = this._tagIndex.get(tag)
    if (!keys) {
      return 0
    }

    const keysToDelete = Array.from(keys)
    await Promise.all(keysToDelete.map(key => this.delete(key)))

    return keysToDelete.length
  }

  /**
   * Invalidate cache entries by key pattern
   */
  async invalidateByPattern(pattern: RegExp): Promise<number> {
    const allKeys = [
      ...Array.from(this._l1Cache.keys()),
      ...Array.from(this._l2Cache.keys())
    ]
    const uniqueKeys = [...new Set(allKeys)]

    const matchingKeys = uniqueKeys.filter(key => pattern.test(key))
    await Promise.all(matchingKeys.map(key => this.delete(key)))

    return matchingKeys.length
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    this.updateStatistics()
    return { ...this._statistics }
  }

  /**
   * Get recent events
   */
  getEvents(limit: number = 100): CacheEvent<T>[] {
    return this._events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Perform cache maintenance
   */
  async maintenance(): Promise<void> {
    console.log('Starting cache maintenance...')

    // Remove expired entries
    await this.removeExpiredEntries()

    // Sync L1 to L2 if needed
    if (this._config.syncConfig.enableSync) {
      await this.syncL1ToL2()
    }

    // Optimize tag index
    this.optimizeTagIndex()

    // Update statistics
    this.updateStatistics()

    console.log('Cache maintenance completed')
  }

  /**
   * Destroy cache instance
   */
  async destroy(): Promise<void> {
    if (this._syncTimer) {
      clearInterval(this._syncTimer)
      this._syncTimer = undefined
    }

    await this.clear()
    console.log('Navigation cache destroyed')
  }

  // Private Methods

  private mergeConfig(config: Partial<NavigationCacheConfig>): NavigationCacheConfig {
    return {
      l1Config: {
        maxEntries: 1000,
        maxSize: 10 * 1024 * 1024, // 10MB
        maxAge: 15 * 60 * 1000, // 15 minutes
        enableCompression: true,
        strategy: 'lru',
        ...config.l1Config
      },

      l2Config: {
        enable: true,
        storage: 'localStorage',
        maxEntries: 10000,
        maxSize: 100 * 1024 * 1024, // 100MB
        maxAge: 60 * 60 * 1000, // 1 hour
        compressionLevel: 6,
        syncInterval: 30 * 1000, // 30 seconds
        ...config.l2Config
      },

      syncConfig: {
        enableSync: true,
        syncOnWrite: true,
        syncOnRead: false,
        conflictResolution: 'l1_wins',
        retryAttempts: 3,
        retryDelay: 1000,
        ...config.syncConfig
      },

      validationConfig: {
        enableChecksum: false,
        enableSignature: false,
        schemaValidation: false,
        ...config.validationConfig
      },

      performanceConfig: {
        enableMetrics: true,
        enableProfiling: false,
        batchSize: 100,
        prefetchEnabled: false,
        prefetchThreshold: 0.8,
        ...config.performanceConfig
      }
    }
  }

  private initializeStatistics(): CacheStatistics {
    return {
      totalEntries: 0,
      l1Entries: 0,
      l2Entries: 0,
      totalSize: 0,
      l1Size: 0,
      l2Size: 0,
      hitCount: 0,
      missCount: 0,
      l1HitCount: 0,
      l2HitCount: 0,
      hitRatio: 0,
      l1HitRatio: 0,
      l2HitRatio: 0,
      averageL1HitTime: 0,
      averageL2HitTime: 0,
      averageMissTime: 0,
      evictionCount: 0,
      l1EvictionCount: 0,
      l2EvictionCount: 0,
      syncCount: 0,
      syncConflicts: 0,
      syncErrors: 0,
      compressionRatio: 1,
      storageEfficiency: 1,
      lastUpdated: new Date()
    }
  }

  private initializeSyncTimer(): void {
    if (this._config.syncConfig.enableSync && this._config.l2Config.syncInterval > 0) {
      this._syncTimer = setInterval(async () => {
        await this.syncToStorage()
      }, this._config.l2Config.syncInterval)
    }
  }

  private async createL1Entry(
    key: string,
    value: T,
    expiresAt: Date,
    tags: string[],
    metadata: Record<string, any>
  ): Promise<L1CacheEntry<T>> {
    const compressedValue = this._config.l1Config.enableCompression
      ? await this.compressValue(value)
      : value

    return {
      key,
      value: compressedValue,
      level: 'L1',
      status: 'fresh',
      createdAt: new Date(),
      lastAccessed: new Date(),
      expiresAt,
      accessCount: 1,
      size: this.calculateSize(compressedValue),
      version: nanoid(),
      tags,
      metadata,
      compressionRatio: this._config.l1Config.enableCompression
        ? this.calculateCompressionRatio(value, compressedValue)
        : undefined,
      memoryUsage: this.estimateMemoryUsage(compressedValue)
    }
  }

  private async createL2Entry(
    key: string,
    value: T,
    expiresAt: Date,
    tags: string[],
    metadata: Record<string, any>
  ): Promise<L2CacheEntry<T>> {
    return {
      key,
      value,
      level: 'L2',
      status: 'fresh',
      createdAt: new Date(),
      lastAccessed: new Date(),
      expiresAt,
      accessCount: 1,
      size: this.calculateSize(value),
      version: nanoid(),
      tags,
      metadata,
      storageLocation: this._config.l2Config.storage === 'indexedDB' ? 'indexedDB' : 'localStorage',
      syncStatus: 'pending'
    }
  }

  private async getFromL2(key: string): Promise<L2CacheEntry<T> | undefined> {
    const entry = this._l2Cache.get(key)
    if (entry) {
      return entry
    }

    // Try to load from persistent storage
    if (this._config.l2Config.storage !== 'indexedDB') {
      return this.loadFromStorage(key)
    }

    return undefined
  }

  private async promoteToL1(l2Entry: L2CacheEntry<T>): Promise<void> {
    if (this._l1Cache.size >= this._config.l1Config.maxEntries) {
      await this.evictFromL1()
    }

    const l1Entry: L1CacheEntry<T> = {
      ...l2Entry,
      level: 'L1',
      compressionRatio: undefined,
      memoryUsage: this.estimateMemoryUsage(l2Entry.value)
    }

    this._l1Cache.set(l2Entry.key, l1Entry)
  }

  private shouldPromoteToL1(l2Entry: L2CacheEntry<T>): boolean {
    // Promote if accessed frequently or recently
    const accessFrequency = l2Entry.accessCount
    const timeSinceAccess = Date.now() - l2Entry.lastAccessed.getTime()
    const isRecentlyAccessed = timeSinceAccess < 5 * 60 * 1000 // 5 minutes

    return accessFrequency >= 3 || isRecentlyAccessed
  }

  private async updateAccess(entry: L1CacheEntry<T> | L2CacheEntry<T>): Promise<void> {
    entry.lastAccessed = new Date()
    entry.accessCount++
    entry.status = 'fresh'

    // Update in appropriate cache
    if (entry.level === 'L1') {
      this._l1Cache.set(entry.key, entry as L1CacheEntry<T>)
    } else {
      this._l2Cache.set(entry.key, entry as L2CacheEntry<T>)
    }
  }

  private async ensureL1Capacity(): Promise<void> {
    while (
      this._l1Cache.size >= this._config.l1Config.maxEntries ||
      this.getL1TotalSize() > this._config.l1Config.maxSize
    ) {
      await this.evictFromL1()
    }
  }

  private async evictFromL1(): Promise<string | undefined> {
    let keyToEvict: string | undefined

    switch (this._config.l1Config.strategy) {
      case 'lru':
        keyToEvict = this.findLRUInL1()
        break
      case 'lfu':
        keyToEvict = this.findLFUInL1()
        break
      case 'fifo':
        keyToEvict = this.findFIFOInL1()
        break
    }

    if (keyToEvict) {
      const entry = this._l1Cache.get(keyToEvict)
      if (entry) {
        // Demote to L2 if enabled and worth keeping
        if (this._config.l2Config.enable && entry.accessCount > 1) {
          await this.demoteToL2(entry)
        }

        this._l1Cache.delete(keyToEvict)
        this._statistics.l1EvictionCount++
        this._statistics.evictionCount++
      }
    }

    return keyToEvict
  }

  private findLRUInL1(): string | undefined {
    let oldestKey: string | undefined
    let oldestTime = new Date()

    for (const [key, entry] of this._l1Cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    return oldestKey
  }

  private findLFUInL1(): string | undefined {
    let leastUsedKey: string | undefined
    let minAccessCount = Infinity

    for (const [key, entry] of this._l1Cache) {
      if (entry.accessCount < minAccessCount) {
        minAccessCount = entry.accessCount
        leastUsedKey = key
      }
    }

    return leastUsedKey
  }

  private findFIFOInL1(): string | undefined {
    let oldestKey: string | undefined
    let oldestTime = new Date()

    for (const [key, entry] of this._l1Cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt
        oldestKey = key
      }
    }

    return oldestKey
  }

  private async demoteToL1(l1Entry: L1CacheEntry<T>): Promise<void> {
    const l2Entry: L2CacheEntry<T> = {
      ...l1Entry,
      level: 'L2',
      storageLocation: this._config.l2Config.storage === 'indexedDB' ? 'indexedDB' : 'localStorage',
      syncStatus: 'pending'
    }

    this._l2Cache.set(l1Entry.key, l2Entry)
  }

  private async demoteToL2(l1Entry: L1CacheEntry<T>): Promise<void> {
    const l2Entry: L2CacheEntry<T> = {
      ...l1Entry,
      level: 'L2',
      storageLocation: this._config.l2Config.storage === 'indexedDB' ? 'indexedDB' : 'localStorage',
      syncStatus: 'pending'
    }

    this._l2Cache.set(l1Entry.key, l2Entry)
  }

  private async removeExpiredEntries(): Promise<void> {
    const now = new Date()
    const expiredKeys: string[] = []

    // Check L1 cache
    for (const [key, entry] of this._l1Cache) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key)
      }
    }

    // Check L2 cache
    for (const [key, entry] of this._l2Cache) {
      if (now > entry.expiresAt) {
        if (!expiredKeys.includes(key)) {
          expiredKeys.push(key)
        }
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      await this.delete(key)
    }

    if (expiredKeys.length > 0) {
      console.log(`Removed ${expiredKeys.length} expired cache entries`)
    }
  }

  private async syncL1ToL2(): Promise<void> {
    for (const [key, l1Entry] of this._l1Cache) {
      const l2Entry = this._l2Cache.get(key)

      if (!l2Entry || l1Entry.version !== l2Entry.version) {
        await this.demoteToL2(l1Entry)
      }
    }
  }

  private async syncToStorage(entry?: L2CacheEntry<T>): Promise<void> {
    // Implementation would depend on storage type
    // This is a placeholder for storage synchronization
    this._statistics.syncCount++
  }

  private async loadFromStorage(key: string): Promise<L2CacheEntry<T> | undefined> {
    // Implementation would depend on storage type
    // This is a placeholder for storage loading
    return undefined
  }

  private async clearStorage(): Promise<void> {
    // Implementation would depend on storage type
    // This is a placeholder for storage clearing
  }

  private updateTagIndex(key: string, tags: string[]): void {
    // Remove existing tag associations
    this.removeFromTagIndex(key)

    // Add new tag associations
    for (const tag of tags) {
      if (!this._tagIndex.has(tag)) {
        this._tagIndex.set(tag, new Set())
      }
      this._tagIndex.get(tag)!.add(key)
    }
  }

  private removeFromTagIndex(key: string): void {
    for (const [tag, keys] of this._tagIndex) {
      keys.delete(key)
      if (keys.size === 0) {
        this._tagIndex.delete(tag)
      }
    }
  }

  private optimizeTagIndex(): void {
    // Remove empty tag sets
    for (const [tag, keys] of this._tagIndex) {
      if (keys.size === 0) {
        this._tagIndex.delete(tag)
      }
    }
  }

  private isExpired(entry: BaseCacheEntry<T>): boolean {
    return new Date() > entry.expiresAt
  }

  private calculateSize(value: T): number {
    return JSON.stringify(value).length * 2 // Rough estimate
  }

  private estimateMemoryUsage(value: T): number {
    return this.calculateSize(value) + 100 // Add overhead
  }

  private calculateCompressionRatio(original: T, compressed: T): number {
    const originalSize = this.calculateSize(original)
    const compressedSize = this.calculateSize(compressed)
    return compressedSize / originalSize
  }

  private async compressValue(value: T): Promise<T> {
    // Placeholder for compression implementation
    return value
  }

  private getL1TotalSize(): number {
    let totalSize = 0
    for (const entry of this._l1Cache.values()) {
      totalSize += entry.size
    }
    return totalSize
  }

  private updateStatistics(): void {
    this._statistics.totalEntries = this._l1Cache.size + this._l2Cache.size
    this._statistics.l1Entries = this._l1Cache.size
    this._statistics.l2Entries = this._l2Cache.size

    this._statistics.l1Size = this.getL1TotalSize()
    this._statistics.l2Size = Array.from(this._l2Cache.values())
      .reduce((total, entry) => total + entry.size, 0)
    this._statistics.totalSize = this._statistics.l1Size + this._statistics.l2Size

    const totalRequests = this._statistics.hitCount + this._statistics.missCount
    this._statistics.hitRatio = totalRequests > 0
      ? this._statistics.hitCount / totalRequests
      : 0

    this._statistics.l1HitRatio = this._statistics.hitCount > 0
      ? this._statistics.l1HitCount / this._statistics.hitCount
      : 0

    this._statistics.l2HitRatio = this._statistics.hitCount > 0
      ? this._statistics.l2HitCount / this._statistics.hitCount
      : 0

    this._statistics.lastUpdated = new Date()
  }

  private recordHit(level: CacheLevel, key: string, value: T, duration: number): void {
    if (!this._metricsEnabled) return

    this._statistics.hitCount++

    if (level === 'L1') {
      this._statistics.l1HitCount++
      this._statistics.averageL1HitTime =
        (this._statistics.averageL1HitTime + duration) / 2
    } else {
      this._statistics.l2HitCount++
      this._statistics.averageL2HitTime =
        (this._statistics.averageL2HitTime + duration) / 2
    }

    this._events.push({
      type: 'hit',
      level,
      key,
      timestamp: new Date(),
      data: value
    })
  }

  private recordMiss(key: string, duration: number): void {
    if (!this._metricsEnabled) return

    this._statistics.missCount++
    this._statistics.averageMissTime =
      (this._statistics.averageMissTime + duration) / 2

    this._events.push({
      type: 'miss',
      level: 'L1', // Miss recorded at L1 level
      key,
      timestamp: new Date()
    })
  }

  private recordSet(key: string, value: T, duration: number): void {
    if (!this._metricsEnabled) return

    this._events.push({
      type: 'set',
      level: 'L1',
      key,
      timestamp: new Date(),
      data: value,
      metadata: { duration }
    })
  }

  private recordDelete(key: string, duration: number): void {
    if (!this._metricsEnabled) return

    this._events.push({
      type: 'delete',
      level: 'L1',
      key,
      timestamp: new Date(),
      metadata: { duration }
    })
  }

  private recordError(operation: string, key: string, error: Error): void {
    this._events.push({
      type: 'error',
      level: 'L1',
      key,
      timestamp: new Date(),
      error,
      metadata: { operation }
    })

    console.error(`Cache ${operation} error for key ${key}:`, error)
  }
}