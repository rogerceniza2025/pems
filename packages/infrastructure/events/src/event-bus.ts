import { z } from 'zod'
import { nanoid } from 'nanoid'

/**
 * Base Domain Event Schema
 */
export const BaseDomainEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  data: z.any(),
  metadata: z.object({
    correlationId: z.string().uuid().optional(),
    causationId: z.string().uuid().optional(),
    userId: z.string().optional(),
    tenantId: z.string().optional(),
    sessionId: z.string().optional(),
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    version: z.string().default('1.0.0')
  }).optional(),
  timestamp: z.date(),
  aggregateId: z.string().optional(),
  aggregateType: z.string().optional()
})

export type BaseDomainEvent = z.infer<typeof BaseDomainEventSchema>

/**
 * Event Handler Interface
 */
export interface EventHandler<T = any> {
  (event: T): Promise<void> | void
}

/**
 * Event Handler Registration
 */
export interface EventRegistration {
  eventType: string
  handler: EventHandler
  id: string
  priority: number
  once: boolean
  metadata?: Record<string, any>
}

/**
 * Event Bus Configuration
 */
export interface EventBusConfig {
  enableMetrics: boolean
  enablePersistence: boolean
  maxRetries: number
  retryDelay: number
  maxConcurrentHandlers: number
  handlerTimeout: number
  enableEventOrdering: boolean
  enableDeadLetterQueue: boolean
  deadLetterQueueSize: number
  batchSize: number
  batchTimeout: number
}

/**
 * Event Publishing Options
 */
export interface PublishOptions {
  correlationId?: string
  causationId?: string
  userId?: string
  tenantId?: string
  sessionId?: string
  userAgent?: string
  ipAddress?: string
  aggregateId?: string
  aggregateType?: string
  version?: string
  priority?: 'low' | 'normal' | 'high' | 'critical'
  retryable?: boolean
  timeout?: number
}

/**
 * Event Subscription Options
 */
export interface SubscriptionOptions {
  priority?: number
  once?: boolean
  filter?: (event: any) => boolean
  transform?: (event: any) => any
  timeout?: number
  retryAttempts?: number
  metadata?: Record<string, any>
}

/**
 * Event Metrics
 */
export interface EventMetrics {
  totalEventsPublished: number
  totalEventsHandled: number
  totalHandlingErrors: number
  averageHandlingTime: number
  eventsByType: Record<string, number>
  handlerRegistrations: number
  activeHandlers: number
  deadLetterQueueSize: number
  lastEventTimestamp?: Date
  uptime: number
}

/**
 * Dead Letter Event
 */
export interface DeadLetterEvent {
  event: BaseDomainEvent
  error: Error
  retryCount: number
  firstFailedAt: Date
  lastFailedAt: Date
  nextRetryAt?: Date
}

/**
 * Event Batch
 */
export interface EventBatch {
  id: string
  events: BaseDomainEvent[]
  createdAt: Date
  processedAt?: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

/**
 * Domain Event Bus
 *
 * This is a comprehensive event bus implementation following ADR-014 guidelines.
 * It provides in-memory pub/sub with optional persistence, retries, and comprehensive monitoring.
 */
export class DomainEventBus {
  private readonly _config: EventBusConfig
  private readonly _handlers: Map<string, EventRegistration[]>
  private readonly _deadLetterQueue: DeadLetterEvent[]
  private readonly _metrics: EventMetrics
  private readonly _eventHistory: BaseDomainEvent[]
  private readonly _batches: Map<string, EventBatch>
  private _isProcessing: boolean
  private _startTime: Date
  private _batchTimer?: NodeJS.Timeout

  constructor(config: Partial<EventBusConfig> = {}) {
    this._config = this.mergeConfig(config)
    this._handlers = new Map()
    this._deadLetterQueue = []
    this._eventHistory = []
    this._batches = new Map()
    this._isProcessing = false
    this._startTime = new Date()

    this._metrics = this.initializeMetrics()
    this.startBatchProcessor()
  }

  /**
   * Publish a domain event
   */
  async publish<T extends BaseDomainEvent>(
    eventType: string,
    data: T['data'],
    options: PublishOptions = {}
  ): Promise<string> {
    try {
      const event: BaseDomainEvent = {
        id: nanoid(),
        type: eventType,
        data,
        metadata: {
          correlationId: options.correlationId || nanoid(),
          causationId: options.causationId,
          userId: options.userId,
          tenantId: options.tenantId,
          sessionId: options.sessionId,
          userAgent: options.userAgent,
          ipAddress: options.ipAddress,
          version: options.version || '1.0.0'
        },
        timestamp: new Date(),
        aggregateId: options.aggregateId,
        aggregateType: options.aggregateType
      }

      // Validate event
      const validationResult = BaseDomainEventSchema.safeParse(event)
      if (!validationResult.success) {
        throw new Error(`Invalid event: ${validationResult.error.message}`)
      }

      // Add to history
      this._eventHistory.push(event)
      if (this._eventHistory.length > 10000) {
        this._eventHistory.splice(0, 1000) // Keep last 9000 events
      }

      // Update metrics
      this.updateMetrics(event.type, 'published')

      // Process handlers
      await this.processEvent(event)

      return event.id

    } catch (error) {
      console.error('Error publishing event:', error)
      throw error
    }
  }

  /**
   * Subscribe to events
   */
  subscribe<T = any>(
    eventType: string,
    handler: EventHandler<T>,
    options: SubscriptionOptions = {}
  ): string {
    const registration: EventRegistration = {
      eventType,
      handler,
      id: nanoid(),
      priority: options.priority || 0,
      once: options.once || false,
      metadata: options.metadata
    }

    if (!this._handlers.has(eventType)) {
      this._handlers.set(eventType, [])
    }

    const handlers = this._handlers.get(eventType)!
    handlers.push(registration)

    // Sort by priority (higher priority first)
    handlers.sort((a, b) => b.priority - a.priority)

    this._metrics.handlerRegistrations++
    this._metrics.activeHandlers++

    return registration.id
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, handlers] of this._handlers) {
      const index = handlers.findIndex(reg => reg.id === subscriptionId)
      if (index >= 0) {
        handlers.splice(index, 1)
        this._metrics.activeHandlers--

        // Clean up empty handler arrays
        if (handlers.length === 0) {
          this._handlers.delete(eventType)
        }

        return true
      }
    }
    return false
  }

  /**
   * Unsubscribe all handlers for an event type
   */
  unsubscribeAll(eventType: string): number {
    const handlers = this._handlers.get(eventType)
    if (handlers) {
      const count = handlers.length
      this._handlers.delete(eventType)
      this._metrics.activeHandlers -= count
      return count
    }
    return 0
  }

  /**
   * Get registered handlers for an event type
   */
  getHandlers(eventType: string): EventRegistration[] {
    return this._handlers.get(eventType) || []
  }

  /**
   * Get all registered event types
   */
  getEventTypes(): string[] {
    return Array.from(this._handlers.keys())
  }

  /**
   * Check if event type has handlers
   */
  hasHandlers(eventType: string): boolean {
    const handlers = this._handlers.get(eventType)
    return handlers && handlers.length > 0
  }

  /**
   * Get event metrics
   */
  getMetrics(): EventMetrics {
    return {
      ...this._metrics,
      uptime: Date.now() - this._startTime.getTime(),
      deadLetterQueueSize: this._deadLetterQueue.length,
      lastEventTimestamp: this._eventHistory.length > 0
        ? this._eventHistory[this._eventHistory.length - 1].timestamp
        : undefined
    }
  }

  /**
   * Get event history
   */
  getEventHistory(limit?: number, eventType?: string): BaseDomainEvent[] {
    let events = this._eventHistory

    if (eventType) {
      events = events.filter(event => event.type === eventType)
    }

    if (limit) {
      events = events.slice(-limit)
    }

    return [...events].reverse() // Most recent first
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue(): DeadLetterEvent[] {
    return [...this._deadLetterQueue]
  }

  /**
   * Retry dead letter events
   */
  async retryDeadLetterEvents(): Promise<number> {
    let retriedCount = 0
    const now = new Date()

    for (let i = this._deadLetterQueue.length - 1; i >= 0; i--) {
      const deadLetter = this._deadLetterQueue[i]

      if (!deadLetter.nextRetryAt || deadLetter.nextRetryAt <= now) {
        try {
          await this.processEvent(deadLetter.event)
          this._deadLetterQueue.splice(i, 1)
          retriedCount++
        } catch (error) {
          deadLetter.retryCount++
          deadLetter.lastFailedAt = now

          if (deadLetter.retryCount >= this._config.maxRetries) {
            // Remove from queue after max retries
            this._deadLetterQueue.splice(i, 1)
          } else {
            // Schedule next retry with exponential backoff
            const delay = this._config.retryDelay * Math.pow(2, deadLetter.retryCount)
            deadLetter.nextRetryAt = new Date(now.getTime() + delay)
          }
        }
      }
    }

    return retriedCount
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): number {
    const count = this._deadLetterQueue.length
    this._deadLetterQueue.length = 0
    return count
  }

  /**
   * Clear all handlers and history
   */
  clear(): void {
    this._handlers.clear()
    this._eventHistory.length = 0
    this._deadLetterQueue.length = 0
    this._metrics.activeHandlers = 0
    console.log('Event bus cleared')
  }

  /**
   * Destroy event bus
   */
  async destroy(): Promise<void> {
    if (this._batchTimer) {
      clearInterval(this._batchTimer)
      this._batchTimer = undefined
    }

    // Process any remaining events
    await this.processBatchEvents()

    this.clear()
    console.log('Event bus destroyed')
  }

  // Private Methods

  private mergeConfig(config: Partial<EventBusConfig>): EventBusConfig {
    return {
      enableMetrics: config.enableMetrics ?? true,
      enablePersistence: config.enablePersistence ?? false,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      maxConcurrentHandlers: config.maxConcurrentHandlers ?? 10,
      handlerTimeout: config.handlerTimeout ?? 30000,
      enableEventOrdering: config.enableEventOrdering ?? false,
      enableDeadLetterQueue: config.enableDeadLetterQueue ?? true,
      deadLetterQueueSize: config.deadLetterQueueSize ?? 1000,
      batchSize: config.batchSize ?? 100,
      batchTimeout: config.batchTimeout ?? 1000
    }
  }

  private initializeMetrics(): EventMetrics {
    return {
      totalEventsPublished: 0,
      totalEventsHandled: 0,
      totalHandlingErrors: 0,
      averageHandlingTime: 0,
      eventsByType: {},
      handlerRegistrations: 0,
      activeHandlers: 0,
      deadLetterQueueSize: 0,
      uptime: 0
    }
  }

  private async processEvent(event: BaseDomainEvent): Promise<void> {
    const handlers = this._handlers.get(event.type)
    if (!handlers || handlers.length === 0) {
      return
    }

    const startTime = performance.now()

    try {
      // Process handlers concurrently with limited concurrency
      const semaphore = new Semaphore(this._config.maxConcurrentHandlers)
      const promises = handlers.map(async (registration) => {
        return semaphore.acquire(async () => {
          await this.executeHandler(event, registration)
        })
      })

      await Promise.all(promises)

      const handlingTime = performance.now() - startTime
      this.updateMetrics(event.type, 'handled', handlingTime)

    } catch (error) {
      const handlingTime = performance.now() - startTime
      this.updateMetrics(event.type, 'error', handlingTime)
      throw error
    }
  }

  private async executeHandler(
    event: BaseDomainEvent,
    registration: EventRegistration
  ): Promise<void> {
    try {
      // Apply filter if present
      if (registration.metadata?.filter && !registration.metadata.filter(event)) {
        return
      }

      // Apply transform if present
      let processedEvent = event
      if (registration.metadata?.transform) {
        processedEvent = registration.metadata.transform(event)
      }

      // Execute handler with timeout
      const timeout = registration.metadata?.timeout || this._config.handlerTimeout
      await Promise.race([
        registration.handler(processedEvent),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Handler timeout')), timeout)
        )
      ])

      // Remove once-only handlers
      if (registration.once) {
        this.unsubscribe(registration.id)
      }

    } catch (error) {
      console.error(`Error in event handler for ${event.type}:`, error)

      // Add to dead letter queue if enabled
      if (this._config.enableDeadLetterQueue) {
        this.addToDeadLetterQueue(event, error as Error)
      }

      throw error
    }
  }

  private addToDeadLetterQueue(event: BaseDomainEvent, error: Error): void {
    if (this._deadLetterQueue.length >= this._config.deadLetterQueueSize) {
      // Remove oldest event if queue is full
      this._deadLetterQueue.shift()
    }

    const deadLetter: DeadLetterEvent = {
      event,
      error,
      retryCount: 0,
      firstFailedAt: new Date(),
      lastFailedAt: new Date(),
      nextRetryAt: new Date(Date.now() + this._config.retryDelay)
    }

    this._deadLetterQueue.push(deadLetter)
  }

  private updateMetrics(
    eventType: string,
    action: 'published' | 'handled' | 'error',
    handlingTime?: number
  ): void {
    if (!this._config.enableMetrics) return

    switch (action) {
      case 'published':
        this._metrics.totalEventsPublished++
        this._metrics.eventsByType[eventType] =
          (this._metrics.eventsByType[eventType] || 0) + 1
        break

      case 'handled':
        this._metrics.totalEventsHandled++
        if (handlingTime !== undefined) {
          this._metrics.averageHandlingTime =
            (this._metrics.averageHandlingTime + handlingTime) / 2
        }
        break

      case 'error':
        this._metrics.totalHandlingErrors++
        break
    }
  }

  private startBatchProcessor(): void {
    if (this._config.batchSize > 1) {
      this._batchTimer = setInterval(() => {
        this.processBatchEvents()
      }, this._config.batchTimeout)
    }
  }

  private async processBatchEvents(): Promise<void> {
    if (this._isProcessing || this._eventHistory.length === 0) {
      return
    }

    this._isProcessing = true

    try {
      const batchSize = Math.min(this._config.batchSize, this._eventHistory.length)
      const events = this._eventHistory.slice(-batchSize)

      if (events.length > 0) {
        const batch: EventBatch = {
          id: nanoid(),
          events,
          createdAt: new Date(),
          status: 'pending'
        }

        this._batches.set(batch.id, batch)

        // Process batch events
        for (const event of events) {
          await this.processEvent(event)
        }

        batch.status = 'completed'
        batch.processedAt = new Date()
      }

    } catch (error) {
      console.error('Error processing batch events:', error)
    } finally {
      this._isProcessing = false
    }
  }
}

/**
 * Semaphore for controlling concurrent operations
 */
class Semaphore {
  private _count: number
  private _queue: (() => void)[] = []

  constructor(count: number) {
    this._count = count
  }

  async acquire<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        try {
          const result = await task()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          this.release()
        }
      }

      if (this._count > 0) {
        this._count--
        execute()
      } else {
        this._queue.push(execute)
      }
    })
  }

  private release(): void {
    this._count++
    if (this._queue.length > 0) {
      const next = this._queue.shift()
      this._count--
      next!()
    }
  }
}