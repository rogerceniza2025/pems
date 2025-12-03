import {
  createSignal,
  For,
  Show,
  createMemo
} from 'solid-js'
import { PermissionNavEnhanced } from '../navigation/PermissionNavEnhanced'
import type { Permission, Role } from '../../../../../packages/infrastructure/auth/src/rbac'
import type { NavigationItemEnhanced } from '../navigation/PermissionNavEnhanced'

/**
 * Navigation Preview Component
 *
 * This component allows administrators to preview how navigation
 * will appear for different user roles and permission levels.
 */
interface NavigationPreviewProps {
  items: NavigationItemEnhanced[]
  onPreviewRoleChange?: (role: Role) => void
  onPreviewTenantChange?: (tenantId: string) => void
}

export function NavigationPreview(props: NavigationPreviewProps) {
  // Preview configuration
  const [selectedRole, setSelectedRole] = createSignal<Role>('viewer')
  const [selectedTenant, setSelectedTenant] = createSignal<string>('demo-tenant')
  const [previewMode, setPreviewMode] = createSignal<'desktop' | 'mobile'>('desktop')

  // Available roles for preview
  const availableRoles: Array<{ role: Role; label: string; permissions: Permission[] }> = [
    {
      role: 'viewer',
      label: 'Viewer',
      permissions: ['users:read', 'transactions:read', 'reports:read']
    },
    {
      role: 'clerk',
      label: 'Clerk',
      permissions: ['users:read', 'transactions:read', 'transactions:create', 'reports:read']
    },
    {
      role: 'cashier',
      label: 'Cashier',
      permissions: [
        'users:read',
        'transactions:read',
        'transactions:create',
        'transactions:cancel',
        'reports:read'
      ]
    },
    {
      role: 'manager',
      label: 'Manager',
      permissions: [
        'users:read',
        'users:update',
        'transactions:*',
        'reports:*',
        'tenants:read'
      ]
    },
    {
      role: 'auditor',
      label: 'Auditor',
      permissions: [
        'users:read',
        'transactions:read',
        'reports:read',
        'reports:audit',
        'tenants:read'
      ]
    },
    {
      role: 'tenant_admin',
      label: 'Tenant Admin',
      permissions: [
        'users:*',
        'transactions:*',
        'reports:*',
        'tenants:read'
      ]
    },
    {
      role: 'super_admin',
      label: 'Super Admin',
      permissions: ['*'] // All permissions
    }
  ]

  // Available tenants for preview
  const availableTenants = [
    { id: 'demo-tenant', name: 'Demo Tenant' },
    { id: 'acme-corp', name: 'Acme Corporation' },
    { id: 'tech-startup', name: 'Tech Startup' },
    { id: 'global-org', name: 'Global Organization' }
  ]

  // Get current preview configuration
  const currentConfig = createMemo(() => {
    const roleConfig = availableRoles.find(r => r.role === selectedRole())
    const tenantConfig = availableTenants.find(t => t.id === selectedTenant())

    return {
      role: roleConfig,
      tenant: tenantConfig,
      permissions: roleConfig?.permissions || [],
      isSystemAdmin: selectedRole() === 'super_admin'
    }
  })

  // Simulate navigation filtering based on role and permissions
  const filteredNavigationItems = createMemo(() => {
    const config = currentConfig()
    if (!config.permissions.length) return []

    return props.items.filter(item => {
      // Skip items that require system admin if user is not system admin
      if (item.systemOnly && !config.isSystemAdmin) {
        return false
      }

      // Skip tenant-only items if no tenant is selected
      if (item.tenantOnly && !selectedTenant()) {
        return false
      }

      // Skip disabled items
      if (item.disabled) {
        return false
      }

      // Skip hidden items
      if (item.visible === false) {
        return false
      }

      // Check permissions
      if (item.permissions && item.permissions.length > 0) {
        const hasPermission = item.requireAll
          ? item.permissions.every(p => config.permissions.includes(p))
          : item.permissions.some(p => config.permissions.includes(p))

        return hasPermission
      }

      // Check single permission
      if (item.permission) {
        return config.permissions.includes(item.permission)
      }

      // No permissions required
      return true
    })
  })

  // Handle role change
  const handleRoleChange = (role: Role) => {
    setSelectedRole(role)
    props.onPreviewRoleChange?.(role)
  }

  // Handle tenant change
  const handleTenantChange = (tenantId: string) => {
    setSelectedTenant(tenantId)
    props.onPreviewTenantChange?.(tenantId)
  }

  // Get role color for visual indication
  const getRoleColor = (role: Role): string => {
    const colors = {
      viewer: 'text-gray-600',
      clerk: 'text-blue-600',
      cashier: 'text-green-600',
      manager: 'text-purple-600',
      auditor: 'text-orange-600',
      tenant_admin: 'text-indigo-600',
      super_admin: 'text-red-600'
    }
    return colors[role] || 'text-gray-600'
  }

  // Get permission count
  const getPermissionCount = (permissions: Permission[]): number => {
    return permissions.includes('*') ? 999 : permissions.length
  }

  return (
    <div class="navigation-preview">
      <div class="preview-controls">
        <div class="control-section">
          <h3>Preview Configuration</h3>
          <div class="control-group">
            <label>User Role</label>
            <select
              value={selectedRole()}
              onChange={(e) => handleRoleChange(e.currentTarget.value as Role)}
              class="role-select"
            >
              <For each={availableRoles}>
                {(roleConfig) => (
                  <option value={roleConfig.role}>
                    {roleConfig.label} ({roleConfig.permissions.includes('*') ? 'All' : roleConfig.permissions.length} permissions)
                  </option>
                )}
              </For>
            </select>
          </div>

          <div class="control-group">
            <label>Tenant Context</label>
            <select
              value={selectedTenant()}
              onChange={(e) => handleTenantChange(e.currentTarget.value)}
              class="tenant-select"
            >
              <For each={availableTenants}>
                {(tenant) => (
                  <option value={tenant.id}>{tenant.name}</option>
                )}
              </For>
            </select>
          </div>

          <div class="control-group">
            <label>Preview Mode</label>
            <div class="mode-toggle">
              <button
                class={`mode-btn ${previewMode() === 'desktop' ? 'mode-btn--active' : ''}`}
                onClick={() => setPreviewMode('desktop')}
              >
                🖥️ Desktop
              </button>
              <button
                class={`mode-btn ${previewMode() === 'mobile' ? 'mode-btn--active' : ''}`}
                onClick={() => setPreviewMode('mobile')}
              >
                📱 Mobile
              </button>
            </div>
          </div>
        </div>

        <div class="role-info">
          <div class="role-details">
            <h4>
              Current Role: <span class={`role-name ${getRoleColor(selectedRole())}`}>
                {availableRoles.find(r => r.role === selectedRole())?.label}
              </span>
            </h4>
            <p class="permissions-count">
              Permissions: {getPermissionCount(currentConfig().permissions)}
            </p>
            <div class="permissions-list">
              <Show
                when={currentConfig().permissions.includes('*')}
                fallback={
                  <div class="permission-tags">
                    <For each={currentConfig().permissions.slice(0, 10)}>
                      {(permission) => (
                        <span class="permission-tag">{permission}</span>
                      )}
                    </For>
                    <Show when={currentConfig().permissions.length > 10}>
                      <span class="permission-tag permission-tag--more">
                        +{currentConfig().permissions.length - 10} more
                      </span>
                    </Show>
                  </div>
                }
              >
                <span class="permission-tag permission-tag--all">All Permissions</span>
              </Show>
            </div>
          </div>

          <div class="tenant-details">
            <h4>Tenant Context</h4>
            <p class="tenant-name">
              {currentConfig().tenant?.name || 'No Tenant'}
            </p>
          </div>
        </div>
      </div>

      <div class="preview-container">
        <div class="preview-header">
          <h4>Navigation Preview</h4>
          <p class="preview-description">
            This is how the navigation will appear for a {currentConfig().role?.label.toLowerCase()}
            {selectedTenant() ? ` in ${currentConfig().tenant?.name}` : ''}.
          </p>
        </div>

        <div class={`preview-viewport preview-viewport--${previewMode()}`}>
          <div class="preview-frame">
            <PermissionNavEnhanced
              items={filteredNavigationItems()}
              mobile={previewMode() === 'mobile'}
              horizontal={false}
              showIcons={true}
              showDescriptions={false}
              showBadges={true}
              enableSearch={true}
              enableVirtualScroll={false}
              enableAnimations={true}
              enableAnalytics={true}
              enableKeyboardNavigation={true}
              className="preview-navigation"
              onItemClick={(item) => {
                console.log('Preview navigation item clicked:', item.path)
              }}
              onSearch={(query) => {
                console.log('Preview search:', query)
              }}
              onPerformanceMetrics={(metrics) => {
                console.log('Preview performance metrics:', metrics)
              }}
            />
          </div>
        </div>

        <div class="preview-stats">
          <div class="stat-item">
            <span class="stat-label">Total Items</span>
            <span class="stat-value">{props.items.length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Visible Items</span>
            <span class="stat-value">{filteredNavigationItems().length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Filtered Out</span>
            <span class="stat-value">{props.items.length - filteredNavigationItems().length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Access Rate</span>
            <span class="stat-value">
              {props.items.length > 0
                ? Math.round((filteredNavigationItems().length / props.items.length) * 100)
                : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Styles for NavigationPreview component
export const navigationPreviewStyles = `
.navigation-preview {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.preview-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.control-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 1rem 0;
}

.control-group {
  margin-bottom: 1rem;
}

.control-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
}

.role-select,
.tenant-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background-primary);
}

.mode-toggle {
  display: flex;
  gap: 0.5rem;
}

.mode-btn {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  background: var(--color-background-secondary);
}

.mode-btn--active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.role-info,
.tenant-details {
  background: var(--color-background-secondary);
  padding: 1rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
}

.role-info h4,
.tenant-details h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
}

.role-name {
  font-weight: 600;
}

.permissions-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin: 0 0 0.5rem 0;
}

.permission-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.permission-tag {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--border-radius-sm);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.permission-tag--all {
  background: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.permission-tag--more {
  background: var(--color-info);
  color: white;
  border-color: var(--color-info);
}

.tenant-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.preview-container {
  background: var(--color-background-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
}

.preview-header {
  padding: 1rem 1.5rem;
  background: var(--color-background-secondary);
  border-bottom: 1px solid var(--color-border);
}

.preview-header h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
}

.preview-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.preview-viewport {
  min-height: 400px;
  padding: 1rem;
  background: var(--color-background-primary);
}

.preview-viewport--mobile {
  max-width: 375px;
  margin: 0 auto;
  border: 2px solid var(--color-border);
  border-radius: var(--border-radius);
}

.preview-frame {
  height: 100%;
  min-height: 350px;
}

.preview-navigation {
  background: transparent;
}

.preview-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--color-border);
}

.stat-item {
  background: var(--color-background-secondary);
  padding: 1rem;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
}

@media (max-width: 768px) {
  .preview-controls {
    grid-template-columns: 1fr;
  }

  .preview-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .preview-viewport--mobile {
    max-width: 100%;
    border: none;
  }
}
`