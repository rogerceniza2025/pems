import type { Component } from 'solid-js'
import { createSignal, Show } from 'solid-js'
import { Button } from '@pems/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@pems/ui'
import { LoginForm } from '@pems/ui'
import { RegisterForm } from '@pems/ui'
import { ThemeProvider, useTheme } from '@pems/ui'

const CustomComponentsDemo: Component = () => {
  const [activeTab, setActiveTab] = createSignal<
    'auth' | 'theme' | 'ui-demo' | 'tailwind-demo'
  >('auth')
  const [authMode, setAuthMode] = createSignal<'login' | 'register'>('login')

  // Theme wrapper component
  const ThemeWrapper: Component = () => {
    const { theme, setTheme } = useTheme()

    return (
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Current Theme: {theme()}</h3>
          <div class="flex gap-2">
            <Button
              variant={theme() === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('light')}
            >
              ☀️ Light
            </Button>
            <Button
              variant={theme() === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('dark')}
            >
              🌙 Dark
            </Button>
            <Button
              variant={theme() === 'system' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('system')}
            >
              💻 System
            </Button>
          </div>
        </div>

        <div class="p-4 border rounded-lg bg-muted/50">
          <p class="text-sm text-muted-foreground">
            The ThemeProvider component manages theme state with localStorage
            persistence and automatic system theme detection. The theme changes
            are reflected throughout the entire application.
          </p>
        </div>
      </div>
    )
  }

  // Form handlers for demo purposes
  const handleLogin = async (email: string, password: string) => {
    // eslint-disable-next-line no-console
    console.log('Login attempted:', { email, password })
    alert(`Login attempt with email: ${email}`)
  }

  const handleRegister = async (data: {
    email: string
    password: string
    [key: string]: string
  }) => {
    // eslint-disable-next-line no-console
    console.log('Register attempted:', data)
    alert(`Registration attempt with email: ${data.email}`)
  }

  const handleForgotPassword = () => {
    alert('Forgot password clicked!')
  }

  const handleSignUp = () => {
    setAuthMode('register')
  }

  const handleSignIn = () => {
    setAuthMode('login')
  }

  return (
    <ThemeProvider>
      <div class="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div class="container flex h-14 items-center">
            <h1 class="text-xl font-bold">🎨 5 Custom UI Components Demo</h1>
            <span class="ml-4 text-sm text-muted-foreground">
              SolidJS + Tailwind CSS 4
            </span>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav class="sticky top-14 z-40 w-full border-b bg-background">
          <div class="container flex h-12 items-center space-x-6">
            <button
              class={`text-sm font-medium transition-colors hover:text-primary ${
                activeTab() === 'auth'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setActiveTab('auth')}
            >
              🔐 Auth Forms
            </button>
            <button
              class={`text-sm font-medium transition-colors hover:text-primary ${
                activeTab() === 'theme'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setActiveTab('theme')}
            >
              🎨 Theme Provider
            </button>
            <button
              class={`text-sm font-medium transition-colors hover:text-primary ${
                activeTab() === 'ui-demo'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setActiveTab('ui-demo')}
            >
              🧩 UI Components Demo
            </button>
            <button
              class={`text-sm font-medium transition-colors hover:text-primary ${
                activeTab() === 'tailwind-demo'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setActiveTab('tailwind-demo')}
            >
              🎯 Tailwind CSS Demo
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main class="container py-8">
          {/* Auth Forms Tab */}
          <Show when={activeTab() === 'auth'}>
            <div class="space-y-8">
              <div>
                <h2 class="text-3xl font-bold">Authentication Components</h2>
                <p class="text-muted-foreground">
                  Complete login and register forms with validation
                </p>
              </div>

              <div class="flex gap-4 mb-8">
                <Button
                  variant={authMode() === 'login' ? 'default' : 'outline'}
                  onClick={() => setAuthMode('login')}
                >
                  Login Form
                </Button>
                <Button
                  variant={authMode() === 'register' ? 'default' : 'outline'}
                  onClick={() => setAuthMode('register')}
                >
                  Register Form
                </Button>
              </div>

              <div class="flex justify-center">
                <div class="w-full max-w-md">
                  <Show when={authMode() === 'login'}>
                    <LoginForm
                      onSubmit={handleLogin}
                      onForgotPassword={handleForgotPassword}
                      onSignUp={handleSignUp}
                    />
                  </Show>

                  <Show when={authMode() === 'register'}>
                    <RegisterForm
                      onSubmit={handleRegister}
                      onSignIn={handleSignIn}
                    />
                  </Show>
                </div>
              </div>

              <div class="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>🔐 LoginForm Component</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul class="text-sm space-y-2">
                      <li>✅ Email and password validation</li>
                      <li>✅ Loading states with disabled inputs</li>
                      <li>✅ Error handling and display</li>
                      <li>✅ Forgot password and sign-up links</li>
                      <li>✅ Full keyboard accessibility</li>
                      <li>✅ Responsive design with Tailwind CSS</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>📝 RegisterForm Component</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul class="text-sm space-y-2">
                      <li>✅ First name and last name fields</li>
                      <li>✅ Email validation with regex</li>
                      <li>✅ Password strength requirements</li>
                      <li>✅ Password confirmation matching</li>
                      <li>✅ Real-time form validation</li>
                      <li>✅ Loading and error states</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Show>

          {/* Theme Provider Tab */}
          <Show when={activeTab() === 'theme'}>
            <div class="space-y-8">
              <div>
                <h2 class="text-3xl font-bold">Theme Provider Component</h2>
                <p class="text-muted-foreground">
                  Advanced theme management with system detection
                </p>
              </div>

              <ThemeWrapper />

              <div class="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul class="text-sm space-y-2">
                      <li>🌞 Light theme support</li>
                      <li>🌙 Dark theme support</li>
                      <li>💻 System theme detection</li>
                      <li>💾 localStorage persistence</li>
                      <li>🔄 Automatic theme application</li>
                      <li>🎯 Context-based state management</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre class="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {`// Wrap your app with ThemeProvider
<ThemeProvider defaultTheme="system">
  <App />
</ThemeProvider>

// Use the hook in components
const { theme, setTheme } = useTheme();`}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Show>

          {/* UI Components Demo Tab */}
          <Show when={activeTab() === 'ui-demo'}>
            <div class="space-y-8">
              <div>
                <h2 class="text-3xl font-bold">UI Components Demo Component</h2>
                <p class="text-muted-foreground">
                  Comprehensive showcase with navigation and code examples
                </p>
              </div>

              <div class="space-y-4">
                <h3 class="text-xl font-semibold">Key Features</h3>
                <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle class="text-lg">
                        🗺️ Navigation System
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p class="text-sm">
                        Sticky navigation with smooth scrolling to component
                        sections
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle class="text-lg">📋 Code Examples</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p class="text-sm">
                        Copy-to-clipboard functionality with syntax highlighting
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle class="text-lg">🎨 Theme Toggle</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p class="text-sm">
                        Real-time theme switching with visual feedback
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle class="text-lg">
                        📱 Responsive Design
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p class="text-sm">
                        Mobile-first approach with breakpoint layouts
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle class="text-lg">♿ Accessibility</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p class="text-sm">
                        Full keyboard navigation and screen reader support
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle class="text-lg">
                        🎯 Component Variants
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p class="text-sm">
                        Shows all variants, sizes, and states of each component
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </Show>

          {/* Tailwind Demo Tab */}
          <Show when={activeTab() === 'tailwind-demo'}>
            <div class="space-y-8">
              <div>
                <h2 class="text-3xl font-bold">Tailwind CSS Demo Component</h2>
                <p class="text-muted-foreground">
                  Interactive Tailwind CSS 4 feature demonstrations
                </p>
              </div>

              <div class="space-y-4">
                <h3 class="text-xl font-semibold">Demonstration Sections</h3>
                <div class="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>🎨 Colors & Theming</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul class="text-sm space-y-1">
                        <li>• Semantic color palette</li>
                        <li>• CSS custom properties</li>
                        <li>• Gradient examples</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>📝 Typography</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul class="text-sm space-y-1">
                        <li>• Font sizes and weights</li>
                        <li>• Text utilities</li>
                        <li>• Alignment options</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>🧩 Components</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul class="text-sm space-y-1">
                        <li>• Button variants</li>
                        <li>• Card layouts</li>
                        <li>• Form elements</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>📐 Layout & Grid</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul class="text-sm space-y-1">
                        <li>• Flexbox utilities</li>
                        <li>• Grid systems</li>
                        <li>• Responsive design</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>✨ Animations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul class="text-sm space-y-1">
                        <li>• Hover effects</li>
                        <li>• Loading states</li>
                        <li>• Custom animations</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>📦 Container Queries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul class="text-sm space-y-1">
                        <li>• @container support</li>
                        <li>• Responsive typography</li>
                        <li>• Component-based media queries</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </Show>
        </main>

        {/* Footer */}
        <footer class="border-t py-8 mt-16">
          <div class="container text-center text-sm text-muted-foreground">
            <p>
              🎨 5 Custom UI Components - Built with SolidJS, Kobalte, and
              Tailwind CSS 4
            </p>
            <p class="mt-2">
              Components: LoginForm, RegisterForm, ThemeProvider,
              UIComponentsDemo, TailwindDemo
            </p>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  )
}

export default CustomComponentsDemo
