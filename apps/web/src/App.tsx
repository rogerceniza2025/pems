import type { Component } from 'solid-js'
import { Link, Outlet } from '@tanstack/solid-router'

const App: Component = () => {
  return (
    <div class="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header class="border-b bg-card">
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <h1 class="text-2xl font-bold">PEMS</h1>
              <span class="text-muted-foreground">
                Public Employment Management System
              </span>
            </div>
            <nav class="flex items-center space-x-4">
              <Link
                to="/"
                class="text-sm font-medium transition-colors hover:text-primary"
              >
                Home
              </Link>
              <Link
                to="/tailwind-demo"
                class="text-sm font-medium transition-colors hover:text-primary"
              >
                Tailwind Demo
              </Link>
              <Link
                to="/ui-components-demo"
                class="text-sm font-medium transition-colors hover:text-primary"
              >
                UI Components
              </Link>
              <Link
                to="/custom-components-demo"
                class="text-sm font-medium transition-colors hover:text-primary"
              >
                🎨 Custom Components
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default App
