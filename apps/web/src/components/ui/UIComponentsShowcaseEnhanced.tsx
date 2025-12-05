import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Textarea,
  Skeleton,
} from '@pems/ui'
import {
  Download,
  Eye,
  EyeOff,
  Lock,
  Settings,
  Star,
  User,
  Moon,
  Sun,
  Copy,
  Check,
  Palette,
  Sparkles,
  Code,
  Zap,
  Heart,
  Shield,
  Rocket,
  Loader2,
  AlertCircle,
} from 'lucide-solid'
import { createSignal, For, Show, onMount } from 'solid-js'

export function UIComponentsShowcaseEnhanced() {
  const [showPassword, setShowPassword] = createSignal(false)
  const [checkboxValue, setCheckboxValue] = createSignal(false)
  const [inputValue, setInputValue] = createSignal('')
  const [textareaValue, setTextareaValue] = createSignal('')
  const [isDarkMode, setIsDarkMode] = createSignal(false)
  const [copiedCode, setCopiedCode] = createSignal<string | null>(null)
  const [activeColorTab, setActiveColorTab] = createSignal('primary')
  const [isLoading, setIsLoading] = createSignal(false)

  // Theme toggle handler
  const toggleTheme = () => {
    const newTheme = !isDarkMode()
    setIsDarkMode(newTheme)
    if (newTheme) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Copy code handler
  const copyCode = async (code: string, componentName: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(componentName)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  // Simulate loading state
  const simulateLoading = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000)
  }

  // Initialize theme on mount
  onMount(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setIsDarkMode(isDark)
  })

  // Color palette data
  const colorPalettes = {
    primary: [
      { name: 'Primary', class: 'bg-primary', hex: 'oklch(var(--color-primary))' },
      { name: 'Primary Foreground', class: 'bg-primary-foreground', hex: 'oklch(var(--color-primary-foreground))' },
    ],
    secondary: [
      { name: 'Secondary', class: 'bg-secondary', hex: 'oklch(var(--color-secondary))' },
      { name: 'Secondary Foreground', class: 'bg-secondary-foreground', hex: 'oklch(var(--color-secondary-foreground))' },
    ],
    accent: [
      { name: 'Accent', class: 'bg-accent', hex: 'oklch(var(--color-accent))' },
      { name: 'Accent Foreground', class: 'bg-accent-foreground', hex: 'oklch(var(--color-accent-foreground))' },
    ],
    destructive: [
      { name: 'Destructive', class: 'bg-destructive', hex: 'oklch(var(--color-destructive))' },
      { name: 'Destructive Foreground', class: 'bg-destructive-foreground', hex: 'oklch(var(--color-destructive-foreground))' },
    ],
    muted: [
      { name: 'Muted', class: 'bg-muted', hex: 'oklch(var(--color-muted))' },
      { name: 'Muted Foreground', class: 'text-muted-foreground bg-background', hex: 'oklch(var(--color-muted-foreground))' },
    ],
  }

  const enhancedComponents = [
    {
      title: 'Enhanced Buttons',
      description: 'Interactive buttons with loading states and animations',
      component: () => (
        <div class="flex flex-wrap gap-4">
          <Button
            variant="default"
            class="group relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div class="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span class="relative flex items-center">
              <Rocket class="w-4 h-4 mr-2" />
              Default Button
            </span>
          </Button>

          <Button
            variant="destructive"
            loading={isLoading()}
            loadingText="Processing..."
            onClick={simulateLoading}
            class="shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <Show when={!isLoading()} fallback={<Loader2 class="w-4 h-4 animate-spin" />}>
              <AlertCircle class="w-4 h-4 mr-2" />
              Destructive
            </Show>
          </Button>

          <Button
            variant="outline"
            class="border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <Shield class="w-4 h-4 mr-2" />
            Outline Style
          </Button>

          <Button
            variant="secondary"
            class="shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Settings class="w-4 h-4 mr-2" />
            Secondary
          </Button>
        </div>
      ),
      code: `<Button variant="default" class="shadow-lg hover:shadow-xl transform hover:-translate-y-1">
  <Rocket class="w-4 h-4 mr-2" />
  Default Button
</Button>`,
    },
    {
      title: 'Modern Form Controls',
      description: 'Enhanced input fields with focus states and animations',
      component: () => (
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <Label for="enhanced-text" class="text-sm font-medium text-foreground flex items-center">
              <User class="w-4 h-4 mr-2 text-primary" />
              Enhanced Text Input
            </Label>
            <Input
              id="enhanced-text"
              placeholder="Type something with style..."
              value={inputValue()}
              onInput={(e) => setInputValue(e.currentTarget.value)}
              class="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm focus:shadow-md"
            />
          </div>

          <div class="space-y-2">
            <Label for="enhanced-password" class="text-sm font-medium text-foreground flex items-center">
              <Lock class="w-4 h-4 mr-2 text-primary" />
              Secure Password Field
            </Label>
            <div class="relative">
              <Input
                id="enhanced-password"
                type={showPassword() ? 'text' : 'password'}
                placeholder="Enter secure password"
                class="pr-10 border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
              />
              <Button
                variant="ghost"
                size="icon"
                class="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-primary/10 transition-colors"
                onClick={() => setShowPassword(!showPassword())}
              >
                <Show when={showPassword()} fallback={<EyeOff class="w-4 h-4" />}>
                  <Eye class="w-4 h-4" />
                </Show>
              </Button>
            </div>
          </div>
        </div>
      ),
      code: `<Input
  class="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
  placeholder="Enhanced input field"
/>`,
    },
    {
      title: 'Interactive Checkboxes',
      description: 'Styled checkboxes with smooth transitions',
      component: () => (
        <div class="space-y-4">
          <div class="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-all duration-300 bg-card shadow-sm hover:shadow-md">
            <Checkbox
              checked={checkboxValue()}
              onChange={setCheckboxValue}
              class="w-5 h-5 text-primary border-2 border-border focus:ring-2 focus:ring-primary/20"
            />
            <div class="flex-1">
              <Label class="font-medium text-foreground cursor-pointer">Accept terms and conditions</Label>
              <p class="text-sm text-muted-foreground mt-1">By checking this box, you agree to our terms of service and privacy policy.</p>
            </div>
          </div>

          <div class="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-all duration-300 bg-card shadow-sm hover:shadow-md">
            <Checkbox defaultChecked class="w-5 h-5 text-primary border-2 border-border" />
            <div class="flex-1">
              <Label class="font-medium text-foreground cursor-pointer">Enable notifications</Label>
              <p class="text-sm text-muted-foreground mt-1">Receive updates about new features and announcements.</p>
            </div>
          </div>
        </div>
      ),
      code: `<div class="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-all duration-300">
  <Checkbox class="w-5 h-5 text-primary" />
  <Label class="font-medium text-foreground">Checkbox option</Label>
</div>`,
    },
    {
      title: 'Enhanced Textarea',
      description: 'Rich text input with character count and resize handling',
      component: () => (
        <div class="space-y-2">
          <Label for="enhanced-textarea" class="text-sm font-medium text-foreground">
            Message or Feedback
          </Label>
          <Textarea
            id="enhanced-textarea"
            placeholder="Share your thoughts with us..."
            value={textareaValue()}
            onInput={(e) => setTextareaValue(e.currentTarget.value)}
            rows={4}
            class="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 resize-y shadow-sm focus:shadow-md"
          />
          <div class="flex justify-between items-center text-sm text-muted-foreground">
            <span>Supports Markdown formatting</span>
            <span>{textareaValue().length} characters</span>
          </div>
        </div>
      ),
      code: `<Textarea
  class="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 resize-y"
  placeholder="Enhanced textarea"
  rows={4}
/>`,
    },
    {
      title: 'Loading States Showcase',
      description: 'Various skeleton loading patterns',
      component: () => (
        <div class="space-y-6">
          {/* Text skeletons */}
          <div class="space-y-3">
            <h4 class="font-medium text-foreground">Text Loading</h4>
            <div class="space-y-2">
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-3/4" />
              <Skeleton class="h-4 w-1/2" />
            </div>
          </div>

          {/* Card skeleton */}
          <div class="space-y-3">
            <h4 class="font-medium text-foreground">Card Loading</h4>
            <div class="p-4 border border-border rounded-lg bg-card">
              <div class="flex items-center space-x-4">
                <Skeleton class="h-12 w-12 rounded-full" />
                <div class="space-y-2 flex-1">
                  <Skeleton class="h-4 w-32" />
                  <Skeleton class="h-3 w-24" />
                </div>
                <Skeleton class="h-8 w-20 rounded" />
              </div>
              <div class="mt-4 space-y-2">
                <Skeleton class="h-3 w-full" />
                <Skeleton class="h-3 w-2/3" />
              </div>
            </div>
          </div>
        </div>
      ),
      code: `<Skeleton class="h-4 w-full" />
<Skeleton class="h-4 w-3/4" />
<Skeleton class="h-4 w-1/2" />`,
    },
  ]

  return (
    <div class="min-h-screen bg-background text-foreground">
      {/* Enhanced Header with Theme Toggle */}
      <header class="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-lg">
                <Sparkles class="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 class="text-2xl font-bold text-foreground">UI Components</h1>
                <p class="text-sm text-muted-foreground">Enhanced Design System</p>
              </div>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              class="relative overflow-hidden group shadow-md hover:shadow-lg transition-all duration-300"
            >
              <div class="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Show when={isDarkMode()} fallback={<Moon class="w-4 h-4" />}>
                <Sun class="w-4 h-4" />
              </Show>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section class="relative py-20 px-4">
        <div class="absolute inset-0 hero-gradient opacity-10" />
        <div class="relative container mx-auto text-center space-y-6">
          <div class="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium shadow-md">
            <Zap class="w-4 h-4" />
            <span>Tailwind CSS v4 + Solid.js</span>
          </div>
          <h2 class="text-5xl md:text-6xl font-bold text-foreground">
            Enhanced UI Components
            <span class="block text-gradient">For Modern Apps</span>
          </h2>
          <p class="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Explore our enhanced collection of accessible, customizable components with
            improved animations, better visual feedback, and exceptional user experiences.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button size="lg" class="group relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
              <div class="absolute inset-0 bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <Download class="w-5 h-5 mr-2" />
              Get Started
            </Button>
            <Button variant="outline" size="lg" class="group shadow-lg hover:shadow-xl transition-all duration-300">
              <Code class="w-5 h-5 mr-2" />
              View Documentation
              <div class="ml-2 transform group-hover:translate-x-1 transition-transform">→</div>
            </Button>
          </div>
        </div>
      </section>

      {/* Color Palette Section */}
      <section class="py-16 px-4 bg-muted/30">
        <div class="container mx-auto space-y-8">
          <div class="text-center space-y-4">
            <div class="inline-flex items-center space-x-2 text-primary">
              <Palette class="w-5 h-5" />
              <span class="font-medium">Color System</span>
            </div>
            <h3 class="text-3xl font-bold text-foreground">Design Tokens</h3>
            <p class="text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive color palette built with OKLCH color space for better consistency and accessibility.
            </p>
          </div>

          {/* Color Tabs */}
          <div class="flex flex-wrap justify-center gap-2 mb-8">
            <For each={Object.keys(colorPalettes)}>
              {(palette) => (
                <Button
                  variant={activeColorTab() === palette ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveColorTab(palette)}
                  class="capitalize"
                >
                  {palette}
                </Button>
              )}
            </For>
          </div>

          {/* Color Display */}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <For each={colorPalettes[activeColorTab() as keyof typeof colorPalettes]}>
              {(color) => (
                <div class="bg-card rounded-lg border border-border overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                  <div class={`h-24 ${color.class} relative group`}>
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <Copy class="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                    </div>
                  </div>
                  <div class="p-4 space-y-2">
                    <h4 class="font-medium text-foreground">{color.name}</h4>
                    <p class="text-sm text-muted-foreground font-mono">{color.hex}</p>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </section>

      {/* Enhanced Components Section */}
      <section class="py-16 px-4">
        <div class="container mx-auto space-y-12">
          <div class="text-center space-y-4">
            <h3 class="text-3xl font-bold text-foreground">Enhanced Components</h3>
            <p class="text-muted-foreground max-w-2xl mx-auto">
              Interactive components with improved styling, animations, and user feedback.
            </p>
          </div>

          <For each={enhancedComponents}>
            {(item) => (
              <div class="bg-card rounded-xl border border-border overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
                <div class="p-6 space-y-4">
                  <div class="flex items-start justify-between">
                    <div class="space-y-2">
                      <h3 class="text-xl font-semibold text-foreground">{item.title}</h3>
                      <p class="text-muted-foreground">{item.description}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyCode(item.code, item.title)}
                      class="relative group"
                    >
                      <Show
                        when={copiedCode() === item.title}
                        fallback={<Copy class="w-4 h-4" />}
                      >
                        <Check class="w-4 h-4 text-green-600" />
                      </Show>
                      <span class="ml-2 text-sm">
                        {copiedCode() === item.title ? 'Copied!' : 'Copy Code'}
                      </span>
                    </Button>
                  </div>

                  <div class="py-6 bg-background/50 rounded-lg border border-border">
                    <div class="container mx-auto px-4">
                      <item.component />
                    </div>
                  </div>

                  {/* Code Preview */}
                  <div class="bg-muted/50 rounded-lg p-4 overflow-x-auto">
                    <pre class="text-sm text-muted-foreground">
                      <code>{item.code}</code>
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* Call to Action */}
      <section class="py-20 px-4">
        <div class="container mx-auto">
          <div class="relative rounded-3xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 p-16 shadow-2xl overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
            <div class="relative z-10 text-center space-y-6">
              <div class="inline-flex items-center space-x-2 bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <Heart class="w-4 h-4" />
                <span>Built with care</span>
              </div>
              <h3 class="text-4xl font-bold text-foreground">
                Ready to Get Started?
              </h3>
              <p class="text-xl text-muted-foreground max-w-2xl mx-auto">
                These enhanced components are production-ready and come with full customization support,
                accessibility features, and comprehensive documentation.
              </p>
              <div class="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <Button size="lg" class="shadow-xl hover:shadow-2xl transition-all duration-300">
                  <Download class="w-5 h-5 mr-2" />
                  Download Components
                </Button>
                <Button variant="outline" size="lg" class="shadow-lg hover:shadow-xl transition-all duration-300">
                  <Settings class="w-5 h-5 mr-2" />
                  Customize Theme
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer class="border-t border-border bg-muted/30 py-12 px-4">
        <div class="container mx-auto text-center space-y-4">
          <div class="flex items-center justify-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
              <Sparkles class="w-4 h-4 text-primary-foreground" />
            </div>
            <span class="text-lg font-semibold text-foreground">PEMS UI</span>
          </div>
          <p class="text-muted-foreground">
            Enhanced UI components built with Tailwind CSS v4 and Solid.js
          </p>
          <div class="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
            <span>Version 2.0</span>
            <span>•</span>
            <span>MIT License</span>
            <span>•</span>
            <span> Fully Accessible</span>
          </div>
        </div>
      </footer>
    </div>
  )
}