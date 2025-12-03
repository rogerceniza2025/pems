import type { Permission, Role } from '@pems/auth'
import type { NavigationItemValue } from './navigation-item'

/**
 * Base Domain Event Interface
 */
export interface DomainEvent<T = any> {
  readonly type: string
  readonly data: T
  readonly timestamp: Date
  readonly version: string
  readonly correlationId?: string
  readonly causationId?: string
}

/**
 * Navigation Item Added Event
 */
export interface NavigationItemAddedEventData {
  menuId: string
  itemId: string
  item: NavigationItemValue
  parentId?: string
}

export interface NavigationItemAddedEvent extends DomainEvent<NavigationItemAddedEventData> {
  readonly type: 'NavigationItemAdded'
}

/**
 * Navigation Item Removed Event
 */
export interface NavigationItemRemovedEventData {
  menuId: string
  itemId: string
  parentId?: string
}

export interface NavigationItemRemovedEvent extends DomainEvent<NavigationItemRemovedEventData> {
  readonly type: 'NavigationItemRemoved'
}

/**
 * Navigation Item Updated Event
 */
export interface NavigationItemUpdatedEventData {
  menuId: string
  itemId: string
  oldItem: Partial<NavigationItemValue>
  newItem: Partial<NavigationItemValue>
}

export interface NavigationItemUpdatedEvent extends DomainEvent<NavigationItemUpdatedEventData> {
  readonly type: 'NavigationItemUpdated'
}

/**
 * Navigation Menu Created Event
 */
export interface NavigationMenuCreatedEventData {
  menuId: string
  name: string
  scope: string
  tenantId?: string
  userId?: string
  createdBy: string
}

export interface NavigationMenuCreatedEvent extends DomainEvent<NavigationMenuCreatedEventData> {
  readonly type: 'NavigationMenuCreated'
}

/**
 * Navigation Menu Updated Event
 */
export interface NavigationMenuUpdatedEventData {
  menuId: string
  updates: Record<string, any>
  updatedBy?: string
}

export interface NavigationMenuUpdatedEvent extends DomainEvent<NavigationMenuUpdatedEventData> {
  readonly type: 'NavigationMenuUpdated'
}

/**
 * Navigation Menu Deleted Event
 */
export interface NavigationMenuDeletedEventData {
  menuId: string
  name: string
  deletedBy?: string
}

export interface NavigationMenuDeletedEvent extends DomainEvent<NavigationMenuDeletedEventData> {
  readonly type: 'NavigationMenuDeleted'
}

/**
 * Navigation Cache Cleared Event
 */
export interface NavigationCacheClearedEventData {
  menuId: string
  scope: string
  tenantId?: string
  clearedBy?: string
}

export interface NavigationCacheClearedEvent extends DomainEvent<NavigationCacheClearedEventData> {
  readonly type: 'NavigationCacheCleared'
}

/**
 * Navigation Cache Invalidated Event
 */
export interface NavigationCacheInvalidatedEventData {
  menuId: string
  userId?: string
  tenantId?: string
  roleId?: string
  reason?: 'user_permissions_changed' | 'tenant_changed' | 'role_changed' | 'manual'
  keysInvalidated?: number
  invalidatedBy?: string
}

export interface NavigationCacheInvalidatedEvent extends DomainEvent<NavigationCacheInvalidatedEventData> {
  readonly type: 'NavigationCacheInvalidated'
}

/**
 * User Permissions Changed Event
 * This event is published when a user's permissions are modified
 */
export interface UserPermissionsChangedEventData {
  userId: string
  tenantId?: string
  oldPermissions: Permission[]
  newPermissions: Permission[]
  oldRole?: Role
  newRole?: Role
  changedBy?: string
}

export interface UserPermissionsChangedEvent extends DomainEvent<UserPermissionsChangedEventData> {
  readonly type: 'UserPermissionsChanged'
}

/**
 * Tenant Switched Event
 * This event is published when a user switches to a different tenant
 */
export interface TenantSwitchedEventData {
  userId: string
  oldTenantId?: string
  newTenantId?: string
  userRole?: Role
  userPermissions: Permission[]
}

export interface TenantSwitchedEvent extends DomainEvent<TenantSwitchedEventData> {
  readonly type: 'TenantSwitched'
}

/**
 * Role Changed Event
 * This event is published when a user's role is modified
 */
export interface RoleChangedEventData {
  userId: string
  tenantId?: string
  oldRole?: Role
  newRole?: Role
  oldPermissions: Permission[]
  newPermissions: Permission[]
  changedBy?: string
}

export interface RoleChangedEvent extends DomainEvent<RoleChangedEventData> {
  readonly type: 'RoleChanged'
}

/**
 * Navigation Configuration Updated Event
 * This event is published when navigation configuration is changed
 */
export interface NavigationConfigurationUpdatedEventData {
  scope: 'global' | 'tenant' | 'system'
  tenantId?: string
  configuration: Record<string, any>
  updatedBy?: string
}

export interface NavigationConfigurationUpdatedEvent extends DomainEvent<NavigationConfigurationUpdatedEventData> {
  readonly type: 'NavigationConfigurationUpdated'
}

/**
 * Navigation Accessed Event
 * This event is published for analytics and usage tracking
 */
export interface NavigationAccessedEventData {
  userId: string
  tenantId?: string
  itemId: string
  itemPath: string
  itemLabel: string
  accessTime: Date
  userAgent?: string
  sessionId?: string
}

export interface NavigationAccessedEvent extends DomainEvent<NavigationAccessedEventData> {
  readonly type: 'NavigationAccessed'
}

/**
 * Navigation Permission Check Event
 * This event is published for security auditing
 */
export interface NavigationPermissionCheckEventData {
  userId: string
  tenantId?: string
  itemId: string
  itemPath: string
  permissions: Permission[]
  granted: boolean
  checkTime: Date
  reason?: 'permission_granted' | 'permission_denied' | 'system_admin_bypass' | 'scope_mismatch'
}

export interface NavigationPermissionCheckEvent extends DomainEvent<NavigationPermissionCheckEventData> {
  readonly type: 'NavigationPermissionCheck'
}

/**
 * Union type for all navigation domain events
 */
export type NavigationDomainEvent =
  | NavigationItemAddedEvent
  | NavigationItemRemovedEvent
  | NavigationItemUpdatedEvent
  | NavigationMenuCreatedEvent
  | NavigationMenuUpdatedEvent
  | NavigationMenuDeletedEvent
  | NavigationCacheClearedEvent
  | NavigationCacheInvalidatedEvent
  | UserPermissionsChangedEvent
  | TenantSwitchedEvent
  | RoleChangedEvent
  | NavigationConfigurationUpdatedEvent
  | NavigationAccessedEvent
  | NavigationPermissionCheckEvent

/**
 * Event Factory for creating navigation domain events
 */
export class NavigationEventFactory {
  static createNavigationItemAddedEvent(
    menuId: string,
    itemId: string,
    item: NavigationItemValue,
    version: string,
    parentId?: string,
    correlationId?: string
  ): NavigationItemAddedEvent {
    return {
      type: 'NavigationItemAdded',
      data: {
        menuId,
        itemId,
        item,
        parentId
      },
      timestamp: new Date(),
      version,
      correlationId
    }
  }

  static createNavigationItemRemovedEvent(
    menuId: string,
    itemId: string,
    version: string,
    parentId?: string,
    correlationId?: string
  ): NavigationItemRemovedEvent {
    return {
      type: 'NavigationItemRemoved',
      data: {
        menuId,
        itemId,
        parentId
      },
      timestamp: new Date(),
      version,
      correlationId
    }
  }

  static createNavigationItemUpdatedEvent(
    menuId: string,
    itemId: string,
    oldItem: Partial<NavigationItemValue>,
    newItem: Partial<NavigationItemValue>,
    version: string,
    correlationId?: string
  ): NavigationItemUpdatedEvent {
    return {
      type: 'NavigationItemUpdated',
      data: {
        menuId,
        itemId,
        oldItem,
        newItem
      },
      timestamp: new Date(),
      version,
      correlationId
    }
  }

  static createUserPermissionsChangedEvent(
    userId: string,
    oldPermissions: Permission[],
    newPermissions: Permission[],
    version: string,
    tenantId?: string,
    oldRole?: Role,
    newRole?: Role,
    changedBy?: string,
    correlationId?: string
  ): UserPermissionsChangedEvent {
    return {
      type: 'UserPermissionsChanged',
      data: {
        userId,
        tenantId,
        oldPermissions,
        newPermissions,
        oldRole,
        newRole,
        changedBy
      },
      timestamp: new Date(),
      version,
      correlationId
    }
  }

  static createTenantSwitchedEvent(
    userId: string,
    oldTenantId: string | undefined,
    newTenantId: string | undefined,
    userRole: Role | undefined,
    userPermissions: Permission[],
    version: string,
    correlationId?: string
  ): TenantSwitchedEvent {
    return {
      type: 'TenantSwitched',
      data: {
        userId,
        oldTenantId,
        newTenantId,
        userRole,
        userPermissions
      },
      timestamp: new Date(),
      version,
      correlationId
    }
  }

  static createNavigationCacheInvalidatedEvent(
    menuId: string,
    reason: 'user_permissions_changed' | 'tenant_changed' | 'role_changed' | 'manual',
    version: string,
    userId?: string,
    tenantId?: string,
    roleId?: string,
    keysInvalidated?: number,
    invalidatedBy?: string,
    correlationId?: string
  ): NavigationCacheInvalidatedEvent {
    return {
      type: 'NavigationCacheInvalidated',
      data: {
        menuId,
        userId,
        tenantId,
        roleId,
        reason,
        keysInvalidated,
        invalidatedBy
      },
      timestamp: new Date(),
      version,
      correlationId
    }
  }

  static createNavigationAccessedEvent(
    userId: string,
    itemId: string,
    itemPath: string,
    itemLabel: string,
    version: string,
    tenantId?: string,
    userAgent?: string,
    sessionId?: string,
    correlationId?: string
  ): NavigationAccessedEvent {
    return {
      type: 'NavigationAccessed',
      data: {
        userId,
        tenantId,
        itemId,
        itemPath,
        itemLabel,
        accessTime: new Date(),
        userAgent,
        sessionId
      },
      timestamp: new Date(),
      version,
      correlationId
    }
  }

  static createNavigationPermissionCheckEvent(
    userId: string,
    itemId: string,
    itemPath: string,
    permissions: Permission[],
    granted: boolean,
    version: string,
    tenantId?: string,
    reason?: 'permission_granted' | 'permission_denied' | 'system_admin_bypass' | 'scope_mismatch',
    correlationId?: string
  ): NavigationPermissionCheckEvent {
    return {
      type: 'NavigationPermissionCheck',
      data: {
        userId,
        tenantId,
        itemId,
        itemPath,
        permissions,
        granted,
        checkTime: new Date(),
        reason
      },
      timestamp: new Date(),
      version,
      correlationId
    }
  }
}