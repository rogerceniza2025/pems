// Domain Entities
export {
  NavigationItem,
  NavigationItemFactory,
  type NavigationItemValue,
  type NavigationItemType,
  type NavigationScope,
  type NavigationTarget
} from './navigation-item'

export {
  NavigationMenu,
  type NavigationMenuConfig,
  type NavigationCacheEntry
} from './navigation-menu'

// Domain Events
export {
  NavigationEventFactory,
  type NavigationDomainEvent,
  type DomainEvent,
  type NavigationItemAddedEvent,
  type NavigationItemRemovedEvent,
  type NavigationItemUpdatedEvent,
  type NavigationMenuCreatedEvent,
  type NavigationMenuUpdatedEvent,
  type NavigationMenuDeletedEvent,
  type NavigationCacheClearedEvent,
  type NavigationCacheInvalidatedEvent,
  type UserPermissionsChangedEvent,
  type TenantSwitchedEvent,
  type RoleChangedEvent,
  type NavigationConfigurationUpdatedEvent,
  type NavigationAccessedEvent,
  type NavigationPermissionCheckEvent
} from './navigation-events'

// Re-export types for convenience
export type {
  Permission,
  Role
} from '@pems/auth'