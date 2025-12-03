import type { Component } from 'solid-js'
import { createSignal, onMount, Show } from 'solid-js'
import { Outlet } from '@tanstack/solid-router'
import { PermissionProvider } from './contexts/PermissionContext'
import { Navbar } from './components'

// Mock authentication check - in real implementation, this would check session/cookies
const checkAuth = async () => {
  // Simulate API call to check authentication
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Mock user data - in real implementation, this would come from auth API
  const mockUsers = {
    authenticated: {
      id: 'user-123',
      email: 'admin@test.com',
      isSystemAdmin: true,
      roles: [{
        userId: 'user-123',
        tenantId: 'tenant-1',
        role: 'super_admin',
        permissions: ['*'], // All permissions
        assignedBy: 'system',
        assignedAt: new Date(),
        expiresAt: undefined,
      }],
    },
    regular: {
      id: 'user-456',
      email: 'manager@test.com',
      isSystemAdmin: false,
      roles: [{
        userId: 'user-456',
        tenantId: 'tenant-1',
        role: 'manager',
        permissions: ['users:read', 'transactions:read', 'transactions:create', 'reports:read'],
        assignedBy: 'admin',
        assignedAt: new Date(),
        expiresAt: undefined,
      }],
    },
    viewer: {
      id: 'user-789',
      email: 'viewer@test.com',
      isSystemAdmin: false,
      roles: [{
        userId: 'user-789',
        tenantId: 'tenant-1',
        role: 'viewer',
        permissions: ['transactions:read', 'reports:read'],
        assignedBy: 'admin',
        assignedAt: new Date(),
        expiresAt: undefined,
      }],
    },
  }

  // Return different user types based on URL param or storage
  const urlParams = new URLSearchParams(window.location.search)
  const userType = urlParams.get('user') || 'authenticated'
  
  return mockUsers[userType as keyof typeof mockUsers] || null
}

const AppProtected: Component = () => {
  const [user, setUser] = createSignal<any>(null)
  const [isLoading, setIsLoading] = createSignal(true)
  const [tenantId, setTenantId] = createSignal('tenant-1')

  onMount(async () => {
    try {
      const currentUser = await checkAuth()
      setUser(currentUser)
      
      // Set tenant ID from user or default
      if (currentUser?.roles?.[0]?.tenantId) {
        setTenantId(currentUser.roles[0].tenantId)
      }
    } catch (error) {
      console.error('Authentication check failed:', error)
    } finally {
      setIsLoading(false)
    }
  })

  return (
    <PermissionProvider initialUser={user()} initialTenantId={tenantId()}>
      <div class="min-h-screen bg-background text-foreground">
        {/* Show loading state */}
        <Show when={isLoading()}>
          <div class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div class="text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p class="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </Show>

        {/* Show app when loaded */}
        <Show when={!isLoading()}>
          <div class="flex flex-col min-h-screen">
            {/* Navigation Header */}
            <Navbar />

            {/* Main Content */}
            <main class="flex-1">
              <div class="container mx-auto px-4 py-6">
                {/* Demo user switcher for testing */}
                <div class="mb-4 p-4 border rounded-lg bg-card">
                  <h3 class="text-lg font-semibold mb-2">Demo User Switcher</h3>
                  <p class="text-sm text-muted-foreground mb-3">
                    Test different user roles to see permission-based navigation in action:
                  </p>
                  <div class="flex gap-2 flex-wrap">
                    <button
                      class="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                      onClick={() => {
                        window.location.search = 'user=authenticated'
                      }}
                    >
                      Super Admin
                    </button>
                    <button
                      class="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors"
                      onClick={() => {
                        window.location.search = 'user=regular'
                      }}
                    >
                      Manager
                    </button>
                    <button
                      class="px-3 py-1 text-sm bg-muted text-muted-foreground rounded hover:bg-muted/90 transition-colors"
                      onClick={() => {
                        window.location.search = 'user=viewer'
                      }}
                    >
                      Viewer
                    </button>
                  </div>
                  <p class="text-xs text-muted-foreground mt-2">
                    Current: {user()?.email} ({user()?.roles?.[0]?.role})
                  </p>
                </div>

                {/* Route Content */}
                <Outlet />
              </div>
            </main>

            {/* Footer */}
            <footer class="border-t bg-card mt-auto">
              <div class="container mx-auto px-4 py-4">
                <div class="text-center text-sm text-muted-foreground">
                  <div class="mb-2">
                    © 2024 PEMS - Public Employment Management System
                  </div>
                  <div class="text-xs">
                    Permission-Based Navigation Demo - {user()?.email} ({user()?.roles?.[0]?.role})
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Show>
      </div>
    </PermissionProvider>
  )
}

export default AppProtected