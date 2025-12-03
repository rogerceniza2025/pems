import type { Component } from 'solid-js'
import { Outlet } from '@tanstack/solid-router'
import { PermissionProvider } from './contexts/PermissionContext'
import { Navbar } from './components'
import type { User } from 'better-auth/types'

interface AppProps {
  user?: User
  tenantId?: string
}

const App: Component<AppProps> = (props) => {
  const { user, tenantId } = props

  return (
    <PermissionProvider initialUser={user} initialTenantId={tenantId}>
      <div class="min-h-screen bg-background text-foreground">
        {/* Navigation Header */}
        <Navbar 
          user={user}
          tenantId={tenantId}
        />

        {/* Main Content */}
        <main class="main-content">
          <div class="container mx-auto px-4 py-6">
            <Outlet />
          </div>
        </main>

        {/* Footer (optional) */}
        <footer class="border-t bg-card mt-auto">
          <div class="container mx-auto px-4 py-4">
            <div class="text-center text-sm text-muted-foreground">
              © 2024 PEMS - Public Employment Management System
            </div>
          </div>
        </footer>
      </div>
    </PermissionProvider>
  )
}

export default App