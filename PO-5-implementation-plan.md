# PO-5: Permission-Based Navigation Implementation Plan

## Overview

This plan enhances the existing PEMS navigation system with sophisticated programmatic improvements, focusing on performance, caching, domain events, and a proper navigation management module following DDD patterns.

## Current State Analysis

### Existing Infrastructure ✅
- **PermissionNav Component**: Fully functional with permission filtering, nested navigation, mobile responsiveness
- **PermissionContext**: Comprehensive permission state management with basic caching
- **RBAC System**: Complete role-based access control with granular permissions
- **Protected Routes**: Router-level permission guards implemented
- **Tenant Support**: Multi-tenant awareness throughout the system

### Enhancement Opportunities
- Basic permission caching (Map-based, memory only)
- No domain events for real-time updates
- No dedicated navigation management module
- No performance optimization for large navigation trees
- No navigation caching strategies
- ADR-019 and ADR-014 need implementation

## Implementation Strategy

### Phase 1: Navigation Management Module (DDD Pattern)

#### 1.1 Create Navigation Domain Module
**Path**: `modules/navigation-management/`

**Domain Layer** (`src/domain/`):
```typescript
// navigation.ts
interface NavigationItemEntity {
  id: string
  path: string
  label: string
  permissions: Permission[]
  requireAll: boolean
  systemOnly: boolean
  tenantOnly: boolean
  parentId?: string
  sortOrder: number
  metadata: Record<string, any>
}

interface NavigationMenuEntity {
  id: string
  name: string
  tenantId?: string
  items: NavigationItemEntity[]
  isActive: boolean
  version: number
}

// Domain Events
interface NavigationItemAddedEvent {
  type: 'NavigationItemAdded'
  data: NavigationItemEntity
  timestamp: Date
  userId: string
  tenantId?: string
}

interface NavigationItemRemovedEvent {
  type: 'NavigationItemRemoved'
  data: { id: string; parentId?: string }
  timestamp: Date
  userId: string
  tenantId?: string
}

interface NavigationCacheInvalidatedEvent {
  type: 'NavigationCacheInvalidated'
  data: { userId: string; tenantId?: string; reason: string }
  timestamp: Date
}
```

**Application Layer** (`src/application/`):
```typescript
// navigation-service.ts
class NavigationService {
  async getNavigationMenu(tenantId?: string, userId?: string): Promise<NavigationMenuEntity>
  async addNavigationItem(item: NavigationItemEntity): Promise<void>
  async updateNavigationItem(item: NavigationItemEntity): Promise<void>
  async removeNavigationItem(id: string): Promise<void>
  async reorderNavigationItems(items: { id: string; sortOrder: number }[]): Promise<void>
  async filterNavigationByPermissions(items: NavigationItemEntity[], permissions: Permission[]): Promise<NavigationItemEntity[]>
}
```

#### 1.2 Infrastructure Layer for Navigation
**Path**: `modules/navigation-management/src/infrastructure/`

```typescript
// navigation-repository.ts
interface NavigationRepository {
  findByTenantId(tenantId?: string): Promise<NavigationMenuEntity[]>
  save(menu: NavigationMenuEntity): Promise<void>
  delete(id: string): Promise<void>
}

// cache-navigation-repository.ts
class CachedNavigationRepository implements NavigationRepository {
  constructor(
    private repository: NavigationRepository,
    private cache: NavigationCache
  ) {}
  
  async findByTenantId(tenantId?: string): Promise<NavigationMenuEntity[]> {
    const cacheKey = `nav-menu:${tenantId || 'global'}`
    const cached = await this.cache.get(cacheKey)
    if (cached) return cached
    
    const items = await this.repository.findByTenantId(tenantId)
    await this.cache.set(cacheKey, items, { ttl: 3600 })
    return items
  }
}
```

### Phase 2: Enhanced Caching Infrastructure

#### 2.1 Create Navigation Cache Package
**Path**: `packages/infrastructure/cache/src/navigation-cache.ts`

```typescript
// Multi-layer caching strategy
interface NavigationCacheOptions {
  ttl?: number
  tags?: string[]
  invalidateOn?: string[]
}

class NavigationCache {
  private memoryCache = new Map<string, CacheEntry>()
  private persistentCache?: PersistentCache
  
  // L1: Memory cache for immediate responses
  async get(key: string): Promise<NavigationMenuEntity[] | null>
  
  // L2: Persistent cache for session persistence
  async set(key: string, value: NavigationMenuEntity[], options: NavigationCacheOptions): Promise<void>
  
  // Smart invalidation based on events
  async invalidateByPattern(pattern: string): Promise<void>
  async invalidateByTenant(tenantId: string): Promise<void>
  async invalidateByUser(userId: string): Promise<void>
  
  // Cache warming strategies
  async warmCacheForUser(userId: string, tenantId?: string): Promise<void>
}
```

#### 2.2 Permission Cache Enhancement
**Path**: `apps/web/src/contexts/PermissionContext.tsx`

```typescript
// Enhanced permission cache with invalidation
class EnhancedPermissionCache {
  private cache = new Map<string, { value: boolean; expiresAt: number }>()
  private eventBus: EventBus
  
  constructor(eventBus: EventBus) {
    this.setupEventListeners()
  }
  
  private setupEventListeners() {
    this.eventBus.subscribe('UserRoleChanged', (event) => {
      this.invalidateUserCache(event.userId)
    })
    
    this.eventBus.subscribe('TenantChanged', (event) => {
      this.invalidateTenantCache(event.tenantId)
    })
  }
  
  get(key: string): boolean | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    
    return entry.value
  }
  
  set(key: string, value: boolean, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    })
  }
}
```

### Phase 3: Domain Events Implementation (ADR-014)

#### 3.1 Create Event Bus Infrastructure
**Path**: `packages/infrastructure/events/src/`

```typescript
// event-bus.ts
interface DomainEvent {
  type: string
  data: any
  timestamp: Date
  userId?: string
  tenantId?: string
}

class EventBus {
  private subscribers = new Map<string, Set<EventHandler>>()
  
  subscribe(eventType: string, handler: EventHandler): () => void
  publish(event: DomainEvent): Promise<void>
  unsubscribe(eventType: string, handler: EventHandler): void
  
  // Event replay capabilities
  async replayEvents(fromDate: Date): Promise<void>
}

// event-store.ts
interface EventStore {
  save(event: DomainEvent): Promise<void>
  getEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>
  getEventsByType(eventType: string, fromDate?: Date): Promise<DomainEvent[]>
}
```

#### 3.2 Navigation Event Handlers
**Path**: `modules/navigation-management/src/application/event-handlers/`

```typescript
// navigation-event-handlers.ts
class NavigationEventHandlers {
  constructor(
    private navigationService: NavigationService,
    private navigationCache: NavigationCache
  ) {}
  
  async handleUserRoleChanged(event: UserRoleChangedEvent): Promise<void> {
    // Invalidate user's navigation cache
    await this.navigationCache.invalidateByUser(event.userId)
    
    // Warm cache with new navigation
    await this.navigationCache.warmCacheForUser(event.userId, event.tenantId)
    
    // Publish navigation cache invalidated event
    await this.eventBus.publish({
      type: 'NavigationCacheInvalidated',
      data: { userId: event.userId, tenantId: event.tenantId, reason: 'UserRoleChanged' },
      timestamp: new Date(),
      userId: event.userId,
      tenantId: event.tenantId
    })
  }
  
  async handleTenantConfigurationChanged(event: TenantConfigurationChangedEvent): Promise<void> {
    // Invalidate all navigation caches for this tenant
    await this.navigationCache.invalidateByTenant(event.tenantId)
    
    // Rebuild navigation menu for tenant
    await this.navigationService.rebuildTenantNavigation(event.tenantId)
  }
  
  async handleNavigationItemUpdated(event: NavigationItemUpdatedEvent): Promise<void> {
    // Smart cache invalidation - only affected menus
    if (event.item.tenantOnly) {
      await this.navigationCache.invalidateByTenant(event.item.tenantId)
    } else {
      await this.navigationCache.invalidateByPattern('nav-menu:*')
    }
  }
}
```

### Phase 4: Enhanced PermissionNav Component

#### 4.1 Performance-Optimized PermissionNav
**Path**: `apps/web/src/components/navigation/PermissionNav.tsx`

```typescript
// Enhanced with caching and virtualization
export const PermissionNav: ParentComponent<PermissionNavProps> = (props) => {
  const { items, mobile = false, ...rest } = props
  const { hasPermission, user, tenantId } = usePermissionContext()
  const navigationService = useNavigationService()
  
  // Memoized filtered items with caching
  const [filteredItems, setFilteredItems] = createSignal<NavigationItem[]>([])
  const [isFiltering, setIsFiltering] = createSignal(false)
  
  // Performance optimization: batch permission checks
  const checkPermissionsBatch = createMemo(() => {
    const allPermissions = extractAllPermissions(items)
    return batchPermissionCheck(allPermissions, user(), tenantId())
  })
  
  // Smart filtering with caching
  createEffect(async () => {
    setIsFiltering(true)
    try {
      const cacheKey = generateNavigationCacheKey(items, user()?.id, tenantId())
      const cached = await navigationService.getCachedFilteredItems(cacheKey)
      
      if (cached) {
        setFilteredItems(cached)
        return
      }
      
      const filtered = await filterItemsWithCache(items, checkPermissionsBatch())
      setFilteredItems(filtered)
      
      await navigationService.cacheFilteredItems(cacheKey, filtered)
    } finally {
      setIsFiltering(false)
    }
  })
  
  // Virtual scrolling for large navigation trees
  const virtualizedItems = () => {
    if (filteredItems().length > 100) {
      return virtualizeNavigation(filteredItems(), { itemHeight: 40 })
    }
    return filteredItems()
  }
}
```

#### 4.2 Navigation Hooks for Better DX
**Path**: `apps/web/src/hooks/`

```typescript
// useNavigation.ts
export const useNavigation = () => {
  const [navigationItems, setNavigationItems] = createSignal<NavigationItem[]>([])
  const [loading, setLoading] = createSignal(true)
  const navigationService = useNavigationService()
  
  const refreshNavigation = async (tenantId?: string) => {
    setLoading(true)
    try {
      const items = await navigationService.getNavigationMenu(tenantId)
      setNavigationItems(items)
    } finally {
      setLoading(false)
    }
  }
  
  return {
    navigationItems,
    loading,
    refreshNavigation
  }
}

// useNavigationCache.ts
export const useNavigationCache = () => {
  const cache = useNavigationCacheService()
  
  const preloadNavigation = async (tenantIds: string[]) => {
    await Promise.all(
      tenantIds.map(tenantId => cache.warmCacheForTenant(tenantId))
    )
  }
  
  const invalidateCache = async (scope: 'user' | 'tenant' | 'global', id?: string) => {
    switch (scope) {
      case 'user':
        await cache.invalidateByUser(id!)
        break
      case 'tenant':
        await cache.invalidateByTenant(id!)
        break
      case 'global':
        await cache.invalidateAll()
        break
    }
  }
  
  return { preloadNavigation, invalidateCache }
}
```

### Phase 5: Advanced Features

#### 5.1 Smart Navigation Personalization
**Path**: `modules/navigation-management/src/application/personalization/`

```typescript
// navigation-personalizer.ts
class NavigationPersonalizer {
  async personalizeNavigation(
    baseItems: NavigationItemEntity[],
    userId: string,
    tenantId?: string
  ): Promise<NavigationItemEntity[]> {
    const userProfile = await this.getUserProfile(userId)
    const userActivity = await this.getUserActivity(userId)
    
    // Sort based on user's frequently used items
    return this.sortByUsage(baseItems, userActivity)
  }
  
  async getQuickActions(
    userId: string, 
    tenantId?: string
  ): Promise<NavigationItemEntity[]> {
    // Return user's most frequently accessed items
    const activity = await this.getUserActivity(userId)
    const frequentItems = activity.mostFrequent(5)
    
    return this.findNavigationItems(frequentItems)
  }
}
```

#### 5.2 Navigation Analytics
**Path**: `modules/navigation-management/src/application/analytics/`

```typescript
// navigation-analytics.ts
class NavigationAnalytics {
  async trackNavigationUsage(userId: string, itemId: string, context: any): Promise<void> {
    await this.repository.recordUsage({
      userId,
      itemId,
      timestamp: new Date(),
      context,
      sessionId: this.getCurrentSession()
    })
  }
  
  async getNavigationInsights(tenantId?: string): Promise<NavigationInsights> {
    return {
      mostPopularItems: await this.getMostPopularItems(tenantId),
      leastUsedItems: await this.getLeastUsedItems(tenantId),
      userSegmentUsage: await this.getUserSegmentUsage(tenantId),
      performanceMetrics: await this.getPerformanceMetrics()
    }
  }
}
```

### Phase 6: Admin UI Preparation

#### 6.1 Navigation Management API
**Path**: `modules/navigation-management/src/presentation/`

```typescript
// navigation-controller.ts
@Controller('/api/navigation')
export class NavigationController {
  @Get('/menu')
  async getNavigationMenu(@Query('tenantId') tenantId?: string): Promise<NavigationMenuResponse> {
    return this.navigationService.getNavigationMenu(tenantId)
  }
  
  @Post('/items')
  @RequirePermission('navigation:manage')
  async addNavigationItem(@Body() item: CreateNavigationItemRequest): Promise<void> {
    await this.navigationService.addNavigationItem(item)
  }
  
  @Put('/items/:id')
  @RequirePermission('navigation:manage')
  async updateNavigationItem(
    @Param('id') id: string,
    @Body() item: UpdateNavigationItemRequest
  ): Promise<void> {
    await this.navigationService.updateNavigationItem({ ...item, id })
  }
  
  @Delete('/items/:id')
  @RequirePermission('navigation:manage')
  async removeNavigationItem(@Param('id') id: string): Promise<void> {
    await this.navigationService.removeNavigationItem(id)
  }
  
  @Get('/analytics')
  @RequirePermission('navigation:analytics')
  async getNavigationAnalytics(
    @Query('tenantId') tenantId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ): Promise<NavigationAnalyticsResponse> {
    return this.analyticsService.getNavigationAnalytics({
      tenantId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined
    })
  }
}
```

## Implementation Steps

### Step 1: Foundation (Week 1)
1. ✅ Create navigation domain module structure
2. ✅ Implement core navigation entities and events
3. ✅ Set up event bus infrastructure
4. ✅ Create navigation cache package

### Step 2: Integration (Week 2)
1. ✅ Implement navigation repository with caching
2. ✅ Enhance PermissionContext with advanced caching
3. ✅ Update PermissionNav component with performance optimizations
4. ✅ Add navigation hooks and utilities

### Step 3: Domain Events (Week 3)
1. ✅ Implement domain event handlers
2. ✅ Set up cache invalidation strategies
3. ✅ Add navigation personalization features
4. ✅ Implement navigation analytics

### Step 4: API and Testing (Week 4)
1. ✅ Create navigation management API endpoints
2. ✅ Add comprehensive test coverage
3. ✅ Performance testing and optimization
4. ✅ Documentation and deployment preparation

## Performance Optimizations

### Caching Strategy
- **L1 Cache**: In-memory for instant access (Map-based)
- **L2 Cache**: Persistent storage for session recovery
- **Smart Invalidation**: Event-driven cache busting
- **Cache Warming**: Proactive cache population

### Rendering Optimizations
- **Virtual Scrolling**: For navigation trees with 100+ items
- **Batch Permission Checks**: Reduce individual permission lookups
- **Memoized Filtering**: Cache filtered navigation results
- **Lazy Loading**: Load nested navigation on demand

## Security Considerations

### Permission Validation
- Server-side permission validation on all API endpoints
- Route-level protection with guard components
- Tenant isolation enforcement at all levels
- Audit logging for navigation access patterns

### Cache Security
- User-specific cache isolation
- Automatic cache expiration on permission changes
- Secure cache key generation with user context

## Testing Strategy

### Unit Tests
- Navigation service methods
- Permission checking logic
- Cache operations
- Event handlers

### Integration Tests
- End-to-end navigation filtering
- Cache invalidation flows
- Permission-based route protection
- Domain event propagation

### Performance Tests
- Large navigation tree rendering
- Cache hit/miss ratios
- Concurrent user scenarios
- Memory usage optimization

## Migration Strategy

### Phase 1: Parallel Implementation
- Implement new navigation module alongside existing system
- Add feature flags for gradual rollout
- Ensure backward compatibility

### Phase 2: Gradual Migration
- Migrate navigation data to new format
- Update components to use new navigation service
- Monitor performance and stability

### Phase 3: Cleanup
- Remove legacy navigation code
- Consolidate navigation management
- Update documentation

## Critical Files for Implementation

### Core Module Files
- `modules/navigation-management/src/domain/navigation.ts` - Domain entities and events
- `modules/navigation-management/src/application/navigation-service.ts` - Business logic
- `modules/navigation-management/src/infrastructure/navigation-repository.ts` - Data access

### Infrastructure Files
- `packages/infrastructure/cache/src/navigation-cache.ts` - Navigation caching
- `packages/infrastructure/events/src/event-bus.ts` - Domain events
- `apps/web/src/contexts/PermissionContext.tsx` - Enhanced permission management

### Component Files
- `apps/web/src/components/navigation/PermissionNav.tsx` - Enhanced navigation component
- `apps/web/src/hooks/useNavigation.ts` - Navigation hooks
- `apps/web/src/hooks/useNavigationCache.ts` - Cache management hooks

This implementation plan provides a comprehensive enhancement to the existing PEMS navigation system while maintaining backward compatibility and following established architectural patterns.