import { z } from 'zod'
import type { Permission, Role } from '@pems/auth'
import { nanoid } from 'nanoid'

/**
 * Navigation Item Type Schema
 */
export const NavigationItemTypeSchema = z.enum([
  'item',
  'group',
  'divider',
  'header',
  'action'
])

export type NavigationItemType = z.infer<typeof NavigationItemTypeSchema>

/**
 * Navigation Scope Schema
 */
export const NavigationScopeSchema = z.enum([
  'global',
  'tenant',
  'system',
  'user'
])

export type NavigationScope = z.infer<typeof NavigationScopeSchema>

/**
 * Navigation Target Schema
 */
export const NavigationTargetSchema = z.enum([
  '_self',
  '_blank',
  '_parent',
  '_top'
])

export type NavigationTarget = z.infer<typeof NavigationTargetSchema>

/**
 * Enhanced Navigation Item Value Object
 */
export interface NavigationItemValue {
  readonly id: string
  readonly path: string
  readonly label: string
  readonly description?: string
  readonly icon?: string
  readonly iconType?: 'emoji' | 'svg' | 'font' | 'image'
  readonly type: NavigationItemType
  readonly permissions?: Permission[]
  readonly requireAll?: boolean
  readonly scope: NavigationScope
  readonly target: NavigationTarget
  readonly external: boolean
  readonly disabled: boolean
  readonly visible: boolean
  readonly badge?: string | number
  readonly badgeType?: 'notification' | 'count' | 'status' | 'label'
  readonly badgeColor?: string
  readonly parentId?: string
  readonly order: number
  readonly metadata?: Record<string, any>
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Navigation Item Entity
 */
export class NavigationItem {
  private readonly _value: NavigationItemValue
  private _children: NavigationItem[] = []

  constructor(value: Omit<NavigationItemValue, 'id' | 'createdAt' | 'updatedAt'>) {
    this._value = {
      ...value,
      id: nanoid(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  get id(): string {
    return this._value.id
  }

  get path(): string {
    return this._value.path
  }

  get label(): string {
    return this._value.label
  }

  get description(): string | undefined {
    return this._value.description
  }

  get icon(): string | undefined {
    return this._value.icon
  }

  get iconType(): 'emoji' | 'svg' | 'font' | 'image' | undefined {
    return this._value.iconType
  }

  get type(): NavigationItemType {
    return this._value.type
  }

  get permissions(): Permission[] | undefined {
    return this._value.permissions
  }

  get requireAll(): boolean | undefined {
    return this._value.requireAll
  }

  get scope(): NavigationScope {
    return this._value.scope
  }

  get target(): NavigationTarget {
    return this._value.target
  }

  get external(): boolean {
    return this._value.external
  }

  get disabled(): boolean {
    return this._value.disabled
  }

  get visible(): boolean {
    return this._value.visible
  }

  get badge(): string | number | undefined {
    return this._value.badge
  }

  get badgeType(): 'notification' | 'count' | 'status' | 'label' | undefined {
    return this._value.badgeType
  }

  get badgeColor(): string | undefined {
    return this._value.badgeColor
  }

  get parentId(): string | undefined {
    return this._value.parentId
  }

  get order(): number {
    return this._value.order
  }

  get metadata(): Record<string, any> | undefined {
    return this._value.metadata
  }

  get createdAt(): Date {
    return this._value.createdAt
  }

  get updatedAt(): Date {
    return this._value.updatedAt
  }

  get children(): NavigationItem[] {
    return [...this._children]
  }

  get hasChildren(): boolean {
    return this._children.length > 0
  }

  /**
   * Add child navigation item
   */
  addChild(child: NavigationItem): void {
    if (this.type !== 'group' && this.type !== 'item') {
      throw new Error(`Cannot add children to navigation item of type '${this.type}'`)
    }

    if (child.parentId && child.parentId !== this.id) {
      throw new Error('Child item already has a different parent')
    }

    child.setParent(this.id)
    this._children.push(child)
    this.sortChildren()
  }

  /**
   * Remove child navigation item
   */
  removeChild(childId: string): boolean {
    const index = this._children.findIndex(child => child.id === childId)
    if (index >= 0) {
      const child = this._children[index]
      child.clearParent()
      this._children.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Check if user has permission to access this item
   */
  hasPermission(
    userPermissions: Permission[],
    userRole?: Role,
    isSystemAdmin?: boolean,
    tenantId?: string
  ): boolean {
    // System admin bypass
    if (isSystemAdmin) {
      return true
    }

    // Check visibility first
    if (!this.visible) {
      return false
    }

    // Check if disabled
    if (this.disabled) {
      return false
    }

    // Check scope-based access
    if (!this.checkScopeAccess(userRole, tenantId)) {
      return false
    }

    // Check permissions
    if (this.permissions && this.permissions.length > 0) {
      if (this.requireAll) {
        return this.permissions.every(permission =>
          userPermissions.includes(permission)
        )
      } else {
        return this.permissions.some(permission =>
          userPermissions.includes(permission)
        )
      }
    }

    // No permissions required
    return true
  }

  /**
   * Check scope-based access
   */
  private checkScopeAccess(userRole?: Role, tenantId?: string): boolean {
    switch (this.scope) {
      case 'system':
        return userRole === 'super_admin'
      case 'tenant':
        return !!tenantId && ['super_admin', 'tenant_admin'].includes(userRole as Role)
      case 'global':
        return true
      case 'user':
        return true // User scope items are handled by user-specific logic
      default:
        return false
    }
  }

  /**
   * Update navigation item
   */
  update(updates: Partial<Omit<NavigationItemValue, 'id' | 'createdAt'>>): void {
    Object.assign(this._value, updates, {
      updatedAt: new Date()
    })
  }

  /**
   * Sort children by order
   */
  private sortChildren(): void {
    this._children.sort((a, b) => a.order - b.order)
  }

  /**
   * Set parent ID
   */
  private setParent(parentId: string): void {
    ;(this._value as any).parentId = parentId
    this._value.updatedAt = new Date()
  }

  /**
   * Clear parent ID
   */
  private clearParent(): void {
    delete (this._value as any).parentId
    this._value.updatedAt = new Date()
  }

  /**
   * Convert to plain object
   */
  toObject(): Omit<NavigationItemValue, 'id'> & { id: string } {
    return {
      ...this._value,
      children: this._children.map(child => child.toObject())
    }
  }

  /**
   * Create navigation item from data
   */
  static fromData(data: Omit<NavigationItemValue, 'id' | 'createdAt' | 'updatedAt'>): NavigationItem {
    return new NavigationItem(data)
  }

  /**
   * Recreate navigation item from persisted data
   */
  static recreate(data: NavigationItemValue): NavigationItem {
    const item = new NavigationItem({
      ...data,
      id: data.id // Preserve existing ID
    })
    item._value.createdAt = data.createdAt
    item._value.updatedAt = data.updatedAt
    return item
  }
}

/**
 * Navigation Item Factory
 */
export class NavigationItemFactory {
  static createItem(params: {
    path: string
    label: string
    description?: string
    icon?: string
    permissions?: Permission[]
    scope?: NavigationScope
    order?: number
  }): NavigationItem {
    return new NavigationItem({
      type: 'item',
      path: params.path,
      label: params.label,
      description: params.description,
      icon: params.icon,
      permissions: params.permissions,
      scope: params.scope || 'global',
      target: '_self',
      external: false,
      disabled: false,
      visible: true,
      order: params.order || 0
    })
  }

  static createGroup(params: {
    label: string
    description?: string
    icon?: string
    permissions?: Permission[]
    scope?: NavigationScope
    order?: number
  }): NavigationItem {
    return new NavigationItem({
      type: 'group',
      path: '', // Groups don't have paths
      label: params.label,
      description: params.description,
      icon: params.icon,
      permissions: params.permissions,
      scope: params.scope || 'global',
      target: '_self',
      external: false,
      disabled: false,
      visible: true,
      order: params.order || 0
    })
  }

  static createDivider(order?: number): NavigationItem {
    return new NavigationItem({
      type: 'divider',
      path: '',
      label: '',
      scope: 'global',
      target: '_self',
      external: false,
      disabled: false,
      visible: true,
      order: order || 0
    })
  }

  static createHeader(label: string, order?: number): NavigationItem {
    return new NavigationItem({
      type: 'header',
      path: '',
      label,
      scope: 'global',
      target: '_self',
      external: false,
      disabled: false,
      visible: true,
      order: order || 0
    })
  }
}