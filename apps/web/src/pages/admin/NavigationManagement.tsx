import {
  createSignal,
  For,
  Show,
  createEffect,
  createMemo,
  onMount
} from 'solid-js'
import { A } from '@tanstack/solid-router'
import { usePermissionContext } from '../../contexts/PermissionContext'
import type { Permission, Role } from '../../../../../packages/infrastructure/auth/src/rbac'
import {
  NavigationService,
  NavigationRepository,
  MenuBuilderFactory,
  type NavigationMenu,
  type NavigationItem,
  type NavigationMenuConfig
} from '@pems/navigation-management'
import { DomainEventBus } from '@pems/infrastructure-events'

/**
 * Navigation Management Admin Interface
 *
 * This is the main admin interface for managing navigation configuration.
 * It allows administrators to:
 * - Create and edit navigation menus
 * - Add, edit, and remove navigation items
 * - Configure permissions and roles
 * - Manage tenant-specific navigation
 * - Preview navigation changes
 * - View analytics and usage statistics
 */

export default function NavigationManagement() {
  const { hasPermission, user, tenantId } = usePermissionContext()

  // Check admin permissions
  const canManageNavigation = () => hasPermission('navigation:manage') || hasPermission('system:config')
  const canViewAnalytics = () => hasPermission('navigation:analytics') || hasPermission('system:audit')

  // Services
  const [eventBus] = createSignal(() => new DomainEventBus())
  const [navigationService] = createSignal(() => {
    const bus = eventBus()
    return new NavigationService({
      enableCaching: true,
      enableAnalytics: true,
      enableSecurityAuditing: true
    })
  })
  const [navigationRepository] = createSignal(() => {
    const bus = eventBus()
    return new NavigationRepository(bus)
  })

  // UI State
  const [activeTab, setActiveTab] = createSignal<'menus' | 'items' | 'analytics' | 'settings'>('menus')
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<string>()
  const [successMessage, setSuccessMessage] = createSignal<string>()

  // Data State
  const [menus, setMenus] = createSignal<NavigationMenu[]>([])
  const [selectedMenu, setSelectedMenu] = createSignal<NavigationMenu>()
  const [editingItem, setEditingItem] = createSignal<NavigationItem | null>(null)
  const [isCreatingMenu, setIsCreatingMenu] = createSignal(false)

  // Form State
  const [menuFormData, setMenuFormData] = createSignal<Partial<NavigationMenuConfig>>({
    name: '',
    description: '',
    scope: 'global',
    isDefault: false,
    isActive: true
  })

  const [itemFormData, setItemFormData] = createSignal({
    label: '',
    path: '',
    description: '',
    icon: '',
    permissions: [] as Permission[],
    requireAll: false,
    scope: 'global' as const,
    order: 0,
    visible: true,
    disabled: false,
    external: false,
    target: '_self' as const
  })

  // Available permissions and roles
  const [availablePermissions] = createSignal<Permission[]>([
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:manage_roles',
    'transactions:read', 'transactions:create', 'transactions:update', 'transactions:delete',
    'transactions:approve', 'transactions:cancel',
    'reports:read', 'reports:export', 'reports:audit',
    'tenants:read', 'tenants:create', 'tenants:update', 'tenants:delete',
    'system:config', 'system:audit', 'system:backup'
  ])

  const [availableRoles] = createSignal<Role[]>([
    'super_admin', 'tenant_admin', 'manager', 'supervisor',
    'cashier', 'clerk', 'auditor', 'viewer'
  ])

  // Initialize data
  createEffect(async () => {
    if (!canManageNavigation()) {
      setError('You do not have permission to access navigation management')
      setLoading(false)
      return
    }

    await loadMenus()
  })

  // Load navigation menus
  const loadMenus = async () => {
    try {
      setLoading(true)
      setError()

      const repo = navigationRepository()
      const menuList = await repo.getNavigationMenus({
        isActive: true
      })

      setMenus(menuList)

      if (menuList.length > 0 && !selectedMenu()) {
        setSelectedMenu(menuList[0])
      }

    } catch (err) {
      setError('Failed to load navigation menus')
      console.error('Error loading menus:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create new menu
  const createMenu = async () => {
    try {
      const formData = menuFormData()
      if (!formData.name) {
        setError('Menu name is required')
        return
      }

      const repo = navigationRepository()
      const newMenu = await repo.createNavigationMenu({
        name: formData.name,
        description: formData.description,
        scope: formData.scope || 'global',
        tenantId: formData.scope === 'tenant' ? tenantId() : undefined,
        isDefault: formData.isDefault,
        isActive: formData.isActive ?? true
      })

      // Add default items for new menu
      const defaultItems = MenuBuilderFactory.createGlobalMenu().allItems
      for (const item of defaultItems.slice(0, 5)) { // Add first 5 default items
        await repo.addNavigationItem(newMenu.id, item)
      }

      setSuccessMessage(`Menu "${newMenu.name}" created successfully`)
      setIsCreatingMenu(false)
      setMenuFormData({ name: '', description: '', scope: 'global', isDefault: false, isActive: true })
      await loadMenus()

    } catch (err) {
      setError('Failed to create menu')
      console.error('Error creating menu:', err)
    }
  }

  // Update menu
  const updateMenu = async (menuId: string, updates: Partial<NavigationMenuConfig>) => {
    try {
      const repo = navigationRepository()
      const success = await repo.updateNavigationMenu(menuId, updates)

      if (success) {
        setSuccessMessage('Menu updated successfully')
        await loadMenus()
      } else {
        setError('Failed to update menu')
      }

    } catch (err) {
      setError('Failed to update menu')
      console.error('Error updating menu:', err)
    }
  }

  // Delete menu
  const deleteMenu = async (menuId: string) => {
    if (!confirm('Are you sure you want to delete this menu? This action cannot be undone.')) {
      return
    }

    try {
      const repo = navigationRepository()
      const success = await repo.deleteNavigationMenu(menuId)

      if (success) {
        setSuccessMessage('Menu deleted successfully')
        setSelectedMenu(undefined)
        await loadMenus()
      } else {
        setError('Failed to delete menu')
      }

    } catch (err) {
      setError('Failed to delete menu')
      console.error('Error deleting menu:', err)
    }
  }

  // Add navigation item
  const addNavigationItem = async (parentId?: string) => {
    try {
      const selected = selectedMenu()
      if (!selected) return

      const formData = itemFormData()
      if (!formData.label) {
        setError('Item label is required')
        return
      }

      // Create navigation item
      const newItem = {
        label: formData.label,
        path: formData.path || `#${formData.label.toLowerCase().replace(/\s+/g, '-')}`,
        description: formData.description,
        icon: formData.icon,
        permissions: formData.permissions.length > 0 ? formData.permissions : undefined,
        requireAll: formData.requireAll,
        scope: formData.scope,
        order: formData.order,
        visible: formData.visible,
        disabled: formData.disabled,
        external: formData.external,
        target: formData.target
      }

      // Add to repository
      const repo = navigationRepository()
      const success = await repo.addNavigationItem(selected.id, newItem as any)

      if (success) {
        setSuccessMessage('Navigation item added successfully')
        setEditingItem(null)
        setItemFormData({
          label: '',
          path: '',
          description: '',
          icon: '',
          permissions: [],
          requireAll: false,
          scope: 'global',
          order: 0,
          visible: true,
          disabled: false,
          external: false,
          target: '_self'
        })
        await loadMenus()
      } else {
        setError('Failed to add navigation item')
      }

    } catch (err) {
      setError('Failed to add navigation item')
      console.error('Error adding navigation item:', err)
    }
  }

  // Update navigation item
  const updateNavigationItem = async (itemId: string, updates: Partial<any>) => {
    try {
      const selected = selectedMenu()
      if (!selected) return

      // Find and update the item
      const updateItemRecursive = (items: any[]): boolean => {
        for (const item of items) {
          if (item.id === itemId) {
            Object.assign(item, updates)
            return true
          }
          if (item.children && updateItemRecursive(item.children)) {
            return true
          }
        }
        return false
      }

      const menuItems = selected.allItems
      const updated = updateItemRecursive(menuItems)

      if (updated) {
        setSuccessMessage('Navigation item updated successfully')
        setEditingItem(null)
        // Note: In a real implementation, you'd update the item in the repository
        await loadMenus()
      } else {
        setError('Navigation item not found')
      }

    } catch (err) {
      setError('Failed to update navigation item')
      console.error('Error updating navigation item:', err)
    }
  }

  // Delete navigation item
  const deleteNavigationItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this navigation item? This action cannot be undone.')) {
      return
    }

    try {
      const selected = selectedMenu()
      if (!selected) return

      const repo = navigationRepository()
      const success = await repo.removeNavigationItem(selected.id, itemId)

      if (success) {
        setSuccessMessage('Navigation item deleted successfully')
        await loadMenus()
      } else {
        setError('Failed to delete navigation item')
      }

    } catch (err) {
      setError('Failed to delete navigation item')
      console.error('Error deleting navigation item:', err)
    }
  }

  // Clear messages
  createEffect(() => {
    if (successMessage()) {
      const timer = setTimeout(() => setSuccessMessage(), 3000)
      return () => clearTimeout(timer)
    }
    if (error()) {
      const timer = setTimeout(() => setError(), 5000)
      return () => clearTimeout(timer)
    }
  })

  return (
    <div class="navigation-management">
      <div class="admin-header">
        <div class="admin-header__content">
          <h1>Navigation Management</h1>
          <p>Configure navigation menus, permissions, and structure</p>
        </div>
        <div class="admin-header__actions">
          <A href="/admin" class="btn btn-secondary">
            Back to Admin
          </A>
        </div>
      </div>

      {/* Permission Check */}
      <Show when={!canManageNavigation()}>
        <div class="error-message">
          <h2>Access Denied</h2>
          <p>You do not have permission to access navigation management.</p>
          <p>Required permissions: navigation:manage or system:config</p>
        </div>
        return
      </Show>

      {/* Loading State */}
      <Show when={loading()}>
        <div class="loading">Loading navigation data...</div>
        return
      </Show>

      {/* Error State */}
      <Show when={error()}>
        <div class="error-message">
          <h2>Error</h2>
          <p>{error()}</p>
        </div>
      </Show>

      {/* Success Message */}
      <Show when={successMessage()}>
        <div class="success-message">
          <p>{successMessage()}</p>
        </div>
      </Show>

      {/* Main Content */}
      <div class="navigation-management__content">
        {/* Tabs */}
        <div class="tabs">
          <button
            class={`tab ${activeTab() === 'menus' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('menus')}
          >
            Menus
          </button>
          <button
            class={`tab ${activeTab() === 'items' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            Items
          </button>
          <Show when={canViewAnalytics()}>
            <button
              class={`tab ${activeTab() === 'analytics' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
          </Show>
          <button
            class={`tab ${activeTab() === 'settings' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {/* Menus Tab */}
        <Show when={activeTab() === 'menus'}>
          <div class="tab-content">
            <div class="tab-content__header">
              <h2>Navigation Menus</h2>
              <button
                class="btn btn-primary"
                onClick={() => setIsCreatingMenu(true)}
              >
                Create Menu
              </button>
            </div>

            {/* Create Menu Form */}
            <Show when={isCreatingMenu()}>
              <div class="card">
                <div class="card__header">
                  <h3>Create New Menu</h3>
                  <button
                    class="btn btn-secondary"
                    onClick={() => setIsCreatingMenu(false)}
                  >
                    Cancel
                  </button>
                </div>
                <div class="card__content">
                  <div class="form-grid">
                    <div class="form-group">
                      <label for="menu-name">Menu Name *</label>
                      <input
                        id="menu-name"
                        type="text"
                        value={menuFormData().name}
                        onInput={(e) => setMenuFormData({
                          ...menuFormData(),
                          name: e.currentTarget.value
                        })}
                        placeholder="e.g., Main Navigation"
                      />
                    </div>

                    <div class="form-group">
                      <label for="menu-scope">Scope</label>
                      <select
                        id="menu-scope"
                        value={menuFormData().scope}
                        onChange={(e) => setMenuFormData({
                          ...menuFormData(),
                          scope: e.currentTarget.value as any
                        })}
                      >
                        <option value="global">Global</option>
                        <option value="tenant">Tenant</option>
                        <option value="system">System</option>
                        <option value="user">User</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label for="menu-description">Description</label>
                      <textarea
                        id="menu-description"
                        value={menuFormData().description || ''}
                        onInput={(e) => setMenuFormData({
                          ...menuFormData(),
                          description: e.currentTarget.value
                        })}
                        placeholder="Optional description"
                      />
                    </div>

                    <div class="form-group">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          checked={menuFormData().isDefault}
                          onChange={(e) => setMenuFormData({
                            ...menuFormData(),
                            isDefault: e.currentTarget.checked
                          })}
                        />
                        Default Menu
                      </label>
                    </div>

                    <div class="form-group">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          checked={menuFormData().isActive}
                          onChange={(e) => setMenuFormData({
                            ...menuFormData(),
                            isActive: e.currentTarget.checked
                          })}
                        />
                        Active
                      </label>
                    </div>
                  </div>

                  <div class="form-actions">
                    <button
                      class="btn btn-primary"
                      onClick={createMenu}
                    >
                      Create Menu
                    </button>
                    <button
                      class="btn btn-secondary"
                      onClick={() => setIsCreatingMenu(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </Show>

            {/* Menu List */}
            <div class="menu-list">
              <For each={menus()}>
                {(menu) => (
                  <div class={`menu-item ${selectedMenu()?.id === menu.id ? 'menu-item--selected' : ''}`}>
                    <div class="menu-item__header" onClick={() => setSelectedMenu(menu)}>
                      <div class="menu-item__info">
                        <h3>{menu.name}</h3>
                        <p>{menu.description}</p>
                        <div class="menu-item__meta">
                          <span class="badge badge--scope">{menu.scope}</span>
                          <span class="badge badge--count">{menu.allItems.length} items</span>
                          <Show when={menu.isActive}>
                            <span class="badge badge--success">Active</span>
                          </Show>
                          <Show when={menu.isDefault}>
                            <span class="badge badge--primary">Default</span>
                          </Show>
                        </div>
                      </div>
                      <div class="menu-item__actions">
                        <button
                          class="btn btn-sm btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Edit menu functionality
                          }}
                        >
                          Edit
                        </button>
                        <button
                          class="btn btn-sm btn-danger"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMenu(menu.id)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Menu Items Preview */}
                    <Show when={selectedMenu()?.id === menu.id}>
                      <div class="menu-items-preview">
                        <div class="menu-items-preview__header">
                          <h4>Navigation Items</h4>
                          <button
                            class="btn btn-sm btn-primary"
                            onClick={() => setEditingItem({} as any)} // New item
                          >
                            Add Item
                          </button>
                        </div>

                        <div class="menu-tree">
                          <MenuTree
                            items={menu.rootItems}
                            onEdit={setEditingItem}
                            onDelete={deleteNavigationItem}
                          />
                        </div>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Items Tab */}
        <Show when={activeTab() === 'items'}>
          <div class="tab-content">
            <div class="tab-content__header">
              <h2>Navigation Items</h2>
              <button
                class="btn btn-primary"
                onClick={() => setEditingItem({} as any)}
              >
                Add Item
              </button>
            </div>

            {/* Item Editor */}
            <Show when={editingItem()}>
              <NavigationItemEditor
                item={editingItem()}
                availablePermissions={availablePermissions()}
                availableRoles={availableRoles()}
                onSave={addNavigationItem}
                onUpdate={updateNavigationItem}
                onCancel={() => setEditingItem(null)}
              />
            </Show>

            {/* Items List */}
            <div class="items-list">
              {/* Render all items from all menus */}
            </div>
          </div>
        </Show>

        {/* Analytics Tab */}
        <Show when={activeTab() === 'analytics' && canViewAnalytics()}>
          <div class="tab-content">
            <div class="tab-content__header">
              <h2>Navigation Analytics</h2>
            </div>

            <NavigationAnalytics
              navigationService={navigationService()}
              navigationRepository={navigationRepository()}
            />
          </div>
        </Show>

        {/* Settings Tab */}
        <Show when={activeTab() === 'settings'}>
          <div class="tab-content">
            <div class="tab-content__header">
              <h2>Navigation Settings</h2>
            </div>

            <NavigationSettings />
          </div>
        </Show>
      </div>
    </div>
  )
}

// Helper Components

interface MenuTreeProps {
  items: any[]
  onEdit: (item: any) => void
  onDelete: (itemId: string) => void
  level?: number
}

function MenuTree(props: MenuTreeProps) {
  const level = () => props.level || 0

  return (
    <For each={props.items}>
      {(item) => (
        <div class="menu-tree-item" style={`margin-left: ${level() * 20}px`}>
          <div class="menu-tree-item__content">
            <div class="menu-tree-item__info">
              <Show when={item.icon}>
                <span class="menu-tree-item__icon">{item.icon}</span>
              </Show>
              <span class="menu-tree-item__label">{item.label}</span>
              <Show when={item.path}>
                <span class="menu-tree-item__path">{item.path}</span>
              </Show>
              <Show when={item.permissions && item.permissions.length > 0}>
                <span class="menu-tree-item__permissions">
                  {item.permissions.join(', ')}
                </span>
              </Show>
            </div>
            <div class="menu-tree-item__actions">
              <button
                class="btn btn-xs btn-secondary"
                onClick={() => props.onEdit(item)}
              >
                Edit
              </button>
              <button
                class="btn btn-xs btn-danger"
                onClick={() => props.onDelete(item.id)}
              >
                Delete
              </button>
            </div>
          </div>

          {/* Children */}
          <Show when={item.children && item.children.length > 0}>
            <MenuTree
              items={item.children}
              onEdit={props.onEdit}
              onDelete={props.onDelete}
              level={level() + 1}
            />
          </Show>
        </div>
      )}
    </For>
  )
}

interface NavigationItemEditorProps {
  item: any
  availablePermissions: Permission[]
  availableRoles: Role[]
  onSave: (parentId?: string) => void
  onUpdate: (itemId: string, updates: any) => void
  onCancel: () => void
}

function NavigationItemEditor(props: NavigationItemEditorProps) {
  const [formData, setFormData] = createSignal({
    label: props.item?.label || '',
    path: props.item?.path || '',
    description: props.item?.description || '',
    icon: props.item?.icon || '',
    permissions: props.item?.permissions || [],
    requireAll: props.item?.requireAll || false,
    scope: props.item?.scope || 'global',
    order: props.item?.order || 0,
    visible: props.item?.visible !== false,
    disabled: props.item?.disabled || false,
    external: props.item?.external || false,
    target: props.item?.target || '_self'
  })

  const handleSave = () => {
    if (props.item?.id) {
      // Update existing item
      props.onUpdate(props.item.id, formData())
    } else {
      // Create new item
      props.onSave()
    }
  }

  const togglePermission = (permission: Permission) => {
    const currentPermissions = formData().permissions
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission]

    setFormData({ ...formData(), permissions: newPermissions })
  }

  return (
    <div class="card">
      <div class="card__header">
        <h3>{props.item?.id ? 'Edit Navigation Item' : 'Add Navigation Item'}</h3>
        <button class="btn btn-secondary" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
      <div class="card__content">
        <div class="form-grid">
          <div class="form-group">
            <label for="item-label">Label *</label>
            <input
              id="item-label"
              type="text"
              value={formData().label}
              onInput={(e) => setFormData({ ...formData(), label: e.currentTarget.value })}
              placeholder="e.g., Dashboard"
            />
          </div>

          <div class="form-group">
            <label for="item-path">Path</label>
            <input
              id="item-path"
              type="text"
              value={formData().path}
              onInput={(e) => setFormData({ ...formData(), path: e.currentTarget.value })}
              placeholder="/dashboard or https://external.com"
            />
          </div>

          <div class="form-group">
            <label for="item-description">Description</label>
            <textarea
              id="item-description"
              value={formData().description}
              onInput={(e) => setFormData({ ...formData(), description: e.currentTarget.value })}
              placeholder="Optional description"
            />
          </div>

          <div class="form-group">
            <label for="item-icon">Icon</label>
            <input
              id="item-icon"
              type="text"
              value={formData().icon}
              onInput={(e) => setFormData({ ...formData(), icon: e.currentTarget.value })}
              placeholder="📊 or dashboard-icon"
            />
          </div>

          <div class="form-group">
            <label for="item-scope">Scope</label>
            <select
              id="item-scope"
              value={formData().scope}
              onChange={(e) => setFormData({ ...formData(), scope: e.currentTarget.value as any })}
            >
              <option value="global">Global</option>
              <option value="tenant">Tenant</option>
              <option value="system">System</option>
              <option value="user">User</option>
            </select>
          </div>

          <div class="form-group">
            <label for="item-target">Target</label>
            <select
              id="item-target"
              value={formData().target}
              onChange={(e) => setFormData({ ...formData(), target: e.currentTarget.value as any })}
            >
              <option value="_self">Same Window</option>
              <option value="_blank">New Window</option>
              <option value="_parent">Parent Frame</option>
              <option value="_top">Top Frame</option>
            </select>
          </div>

          <div class="form-group">
            <label for="item-order">Order</label>
            <input
              id="item-order"
              type="number"
              value={formData().order}
              onInput={(e) => setFormData({ ...formData(), order: parseInt(e.currentTarget.value) || 0 })}
            />
          </div>

          <div class="form-group">
            <label>Permissions</label>
            <div class="permissions-grid">
              <For each={props.availablePermissions}>
                {(permission) => (
                  <label class="permission-checkbox">
                    <input
                      type="checkbox"
                      checked={formData().permissions.includes(permission)}
                      onChange={() => togglePermission(permission)}
                    />
                    {permission}
                  </label>
                )}
              </For>
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                checked={formData().requireAll}
                onChange={(e) => setFormData({ ...formData(), requireAll: e.currentTarget.checked })}
              />
              Require all permissions (AND logic)
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                checked={formData().visible}
                onChange={(e) => setFormData({ ...formData(), visible: e.currentTarget.checked })}
              />
              Visible
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                checked={formData().disabled}
                onChange={(e) => setFormData({ ...formData(), disabled: e.currentTarget.checked })}
              />
              Disabled
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                checked={formData().external}
                onChange={(e) => setFormData({ ...formData(), external: e.currentTarget.checked })}
              />
              External Link
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" onClick={handleSave}>
            {props.item?.id ? 'Update' : 'Add'} Item
          </button>
          <button class="btn btn-secondary" onClick={props.onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Placeholder components for analytics and settings
function NavigationAnalytics(props: { navigationService: any; navigationRepository: any }) {
  return (
    <div class="analytics-dashboard">
      <div class="analytics-grid">
        <div class="analytics-card">
          <h3>Total Menus</h3>
          <div class="analytics-value">0</div>
        </div>
        <div class="analytics-card">
          <h3>Total Items</h3>
          <div class="analytics-value">0</div>
        </div>
        <div class="analytics-card">
          <h3>Cache Hit Ratio</h3>
          <div class="analytics-value">0%</div>
        </div>
        <div class="analytics-card">
          <h3>Average Load Time</h3>
          <div class="analytics-value">0ms</div>
        </div>
      </div>
    </div>
  )
}

function NavigationSettings() {
  return (
    <div class="settings-dashboard">
      <div class="settings-section">
        <h3>Cache Settings</h3>
        <div class="setting-item">
          <label>Cache Timeout (minutes)</label>
          <input type="number" value="15" />
        </div>
        <div class="setting-item">
          <label>Enable Cache</label>
          <input type="checkbox" checked />
        </div>
      </div>
    </div>
  )
}