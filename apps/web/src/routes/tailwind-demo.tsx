import type { Component } from 'solid-js'
import { createSignal, For, Show } from 'solid-js'
import { Button } from '@pems/ui'

const TailwindDemo: Component = () => {
  const [theme, setTheme] = createSignal<'light' | 'dark'>('light')
  const [activeSection, setActiveSection] = createSignal('colors')

  const toggleTheme = () => {
    const newTheme = theme() === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const sections = [
    { id: 'colors', label: 'Colors & Theming', icon: '🎨' },
    { id: 'typography', label: 'Typography', icon: '📝' },
    { id: 'components', label: 'Components', icon: '🧩' },
    { id: 'layout', label: 'Layout & Grid', icon: '📐' },
    { id: 'animations', label: 'Animations', icon: '✨' },
    { id: 'utilities', label: 'Utilities', icon: '🛠️' },
    { id: 'container-queries', label: 'Container Queries', icon: '📦' },
  ]

  return (
    <div class={`min-h-screen bg-background text-foreground ${theme()}`}>
      {/* Header */}
      <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div class="container flex h-14 items-center">
          <div class="mr-4 flex">
            <a class="mr-6 flex items-center space-x-2" href="/">
              <span class="hidden font-bold sm:inline-block">
                Tailwind CSS 4 Demo
              </span>
            </a>
            <nav class="flex items-center space-x-6 text-sm font-medium">
              <For each={sections}>
                {(section) => (
                  <button
                    class={`transition-colors hover:text-foreground/80 ${
                      activeSection() === section.id
                        ? 'text-foreground'
                        : 'text-foreground/60'
                    }`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    {section.icon} {section.label}
                  </button>
                )}
              </For>
            </nav>
          </div>
          <div class="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              {theme() === 'light' ? '🌙' : '☀️'} Toggle Theme
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="container py-8">
        {/* Colors & Theming Section */}
        <Show when={activeSection() === 'colors'}>
          <section class="space-y-8">
            <div>
              <h1 class="text-3xl font-bold">Colors & Theming</h1>
              <p class="text-muted-foreground">
                Demonstrating Tailwind CSS 4 color system and theming
                capabilities
              </p>
            </div>

            {/* Color Palette */}
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div class="space-y-4">
                <h3 class="text-lg font-semibold">Primary Colors</h3>
                <div class="grid grid-cols-2 gap-2">
                  <div class="bg-primary text-primary-foreground p-4 rounded">
                    Primary
                  </div>
                  <div class="bg-primary/80 text-primary-foreground p-4 rounded">
                    Primary/80
                  </div>
                  <div class="bg-secondary text-secondary-foreground p-4 rounded">
                    Secondary
                  </div>
                  <div class="bg-accent text-accent-foreground p-4 rounded">
                    Accent
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <h3 class="text-lg font-semibold">Semantic Colors</h3>
                <div class="grid grid-cols-2 gap-2">
                  <div class="bg-muted text-muted-foreground p-4 rounded">
                    Muted
                  </div>
                  <div class="bg-destructive text-destructive-foreground p-4 rounded">
                    Destructive
                  </div>
                  <div class="bg-card text-card-foreground p-4 rounded border">
                    Card
                  </div>
                  <div class="bg-popover text-popover-foreground p-4 rounded border">
                    Popover
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <h3 class="text-lg font-semibold">Border & Input</h3>
                <div class="grid grid-cols-2 gap-2">
                  <div class="border border-border p-4 rounded">Border</div>
                  <div class="border-2 border-border p-4 rounded">Border-2</div>
                  <div class="bg-input text-foreground p-4 rounded">Input</div>
                  <div class="ring-2 ring-ring p-4 rounded">Ring</div>
                </div>
              </div>
            </div>

            {/* Gradient Examples */}
            <div class="space-y-4">
              <h3 class="text-xl font-semibold">Gradients</h3>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="h-24 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600" />
                <div class="h-24 rounded-lg bg-gradient-to-br from-green-400 via-blue-500 to-purple-600" />
                <div class="h-24 rounded-lg bg-gradient-to-t from-orange-400 to-red-600" />
              </div>
            </div>
          </section>
        </Show>

        {/* Typography Section */}
        <Show when={activeSection() === 'typography'}>
          <section class="space-y-8">
            <div>
              <h1 class="text-3xl font-bold">Typography</h1>
              <p class="text-muted-foreground">
                Demonstrating Tailwind CSS 4 typography features
              </p>
            </div>

            <div class="space-y-6">
              <div>
                <h3 class="text-lg font-semibold mb-4">Font Sizes</h3>
                <div class="space-y-2">
                  <p class="text-xs">Extra Small text (text-xs)</p>
                  <p class="text-sm">Small text (text-sm)</p>
                  <p class="text-base">Base text (text-base)</p>
                  <p class="text-lg">Large text (text-lg)</p>
                  <p class="text-xl">Extra Large text (text-xl)</p>
                  <p class="text-2xl">2XL text (text-2xl)</p>
                  <p class="text-3xl">3XL text (text-3xl)</p>
                  <p class="text-4xl">4XL text (text-4xl)</p>
                </div>
              </div>

              <div>
                <h3 class="text-lg font-semibold mb-4">Font Weights</h3>
                <div class="space-y-2">
                  <p class="font-thin">Thin weight</p>
                  <p class="font-light">Light weight</p>
                  <p class="font-normal">Normal weight</p>
                  <p class="font-medium">Medium weight</p>
                  <p class="font-semibold">Semibold weight</p>
                  <p class="font-bold">Bold weight</p>
                  <p class="font-extrabold">Extra bold weight</p>
                </div>
              </div>

              <div>
                <h3 class="text-lg font-semibold mb-4">Text Utilities</h3>
                <div class="space-y-2">
                  <p class="text-center">Centered text</p>
                  <p class="text-right">Right aligned text</p>
                  <p class="text-justify">
                    Justified text that spans multiple lines to demonstrate the
                    justify utility. This text should be evenly distributed
                    across the line.
                  </p>
                  <p class="underline">Underlined text</p>
                  <p class="line-through">Line-through text</p>
                  <p class="uppercase">Uppercase text</p>
                  <p class="capitalize">Capitalized text</p>
                  <p class="italic">Italic text</p>
                </div>
              </div>
            </div>
          </section>
        </Show>

        {/* Components Section */}
        <Show when={activeSection() === 'components'}>
          <section class="space-y-8">
            <div>
              <h1 class="text-3xl font-bold">Components</h1>
              <p class="text-muted-foreground">
                Demonstrating Tailwind CSS 4 component utilities
              </p>
            </div>

            <div class="grid gap-8 md:grid-cols-2">
              <div class="space-y-4">
                <h3 class="text-xl font-semibold">Buttons</h3>
                <div class="flex flex-wrap gap-2">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                <div class="flex flex-wrap gap-2">
                  <Button size="sm">Small</Button>
                  <Button>Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>

              <div class="space-y-4">
                <h3 class="text-xl font-semibold">Cards</h3>
                <div class="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
                  <h4 class="font-semibold mb-2">Card Title</h4>
                  <p class="text-sm text-muted-foreground">
                    This is a card component using the centralized Tailwind CSS
                    4 configuration.
                  </p>
                </div>
              </div>

              <div class="space-y-4">
                <h3 class="text-xl font-semibold">Form Elements</h3>
                <div class="space-y-2">
                  <input type="text" placeholder="Text input" class="input" />
                  <input type="email" placeholder="Email input" class="input" />
                  <textarea
                    placeholder="Textarea"
                    class="input min-h-[100px] resize-none"
                  />
                </div>
              </div>

              <div class="space-y-4">
                <h3 class="text-xl font-semibold">Badges</h3>
                <div class="flex flex-wrap gap-2">
                  <span class="badge-default">Default</span>
                  <span class="badge-secondary">Secondary</span>
                  <span class="badge-destructive">Destructive</span>
                  <span class="badge-outline">Outline</span>
                </div>
              </div>
            </div>
          </section>
        </Show>

        {/* Layout & Grid Section */}
        <Show when={activeSection() === 'layout'}>
          <section class="space-y-8">
            <div>
              <h1 class="text-3xl font-bold">Layout & Grid</h1>
              <p class="text-muted-foreground">
                Demonstrating Tailwind CSS 4 layout utilities
              </p>
            </div>

            <div class="space-y-8">
              <div>
                <h3 class="text-xl font-semibold mb-4">Flexbox</h3>
                <div class="space-y-4">
                  <div class="flex gap-4">
                    <div class="bg-primary text-primary-foreground p-4 rounded">
                      Flex 1
                    </div>
                    <div class="bg-secondary text-secondary-foreground p-4 rounded">
                      Flex 2
                    </div>
                    <div class="bg-accent text-accent-foreground p-4 rounded">
                      Flex 3
                    </div>
                  </div>
                  <div class="flex justify-between">
                    <div class="bg-primary text-primary-foreground p-4 rounded">
                      Start
                    </div>
                    <div class="bg-secondary text-secondary-foreground p-4 rounded">
                      Center
                    </div>
                    <div class="bg-accent text-accent-foreground p-4 rounded">
                      End
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-xl font-semibold mb-4">Grid</h3>
                <div class="space-y-4">
                  <div class="grid grid-cols-3 gap-4">
                    <div class="bg-primary text-primary-foreground p-4 rounded text-center">
                      1
                    </div>
                    <div class="bg-secondary text-secondary-foreground p-4 rounded text-center">
                      2
                    </div>
                    <div class="bg-accent text-accent-foreground p-4 rounded text-center">
                      3
                    </div>
                    <div class="bg-muted text-muted-foreground p-4 rounded text-center col-span-2">
                      Span 2
                    </div>
                    <div class="bg-destructive text-destructive-foreground p-4 rounded text-center">
                      5
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-xl font-semibold mb-4">Responsive Design</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div class="bg-primary text-primary-foreground p-4 rounded">
                    1 column on mobile, 2 on tablet, 3 on desktop
                  </div>
                  <div class="bg-secondary text-secondary-foreground p-4 rounded">
                    1 column on mobile, 2 on tablet, 3 on desktop
                  </div>
                  <div class="bg-accent text-accent-foreground p-4 rounded">
                    1 column on mobile, 2 on tablet, 3 on desktop
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Show>

        {/* Animations Section */}
        <Show when={activeSection() === 'animations'}>
          <section class="space-y-8">
            <div>
              <h1 class="text-3xl font-bold">Animations</h1>
              <p class="text-muted-foreground">
                Demonstrating Tailwind CSS 4 animation features
              </p>
            </div>

            <div class="space-y-8">
              <div>
                <h3 class="text-xl font-semibold mb-4">Hover Effects</h3>
                <div class="flex flex-wrap gap-4">
                  <div class="bg-primary text-primary-foreground p-4 rounded hover-lift">
                    Hover Lift
                  </div>
                  <div class="bg-secondary text-secondary-foreground p-4 rounded hover-scale">
                    Hover Scale
                  </div>
                  <div class="bg-accent text-accent-foreground p-4 rounded hover-glow">
                    Hover Glow
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-xl font-semibold mb-4">Loading Animations</h3>
                <div class="flex flex-wrap gap-4">
                  <div class="bg-primary text-primary-foreground p-4 rounded animate-pulse">
                    Pulse
                  </div>
                  <div class="bg-secondary text-secondary-foreground p-4 rounded animate-bounce">
                    Bounce
                  </div>
                  <div class="bg-accent text-accent-foreground p-4 rounded animate-spin">
                    Spin
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-xl font-semibold mb-4">Custom Animations</h3>
                <div class="flex flex-wrap gap-4">
                  <div class="bg-primary text-primary-foreground p-4 rounded animate-fade-in">
                    Fade In
                  </div>
                  <div class="bg-secondary text-secondary-foreground p-4 rounded animate-slide-in-from-top">
                    Slide From Top
                  </div>
                  <div class="bg-accent text-accent-foreground p-4 rounded animate-slide-in-from-left">
                    Slide From Left
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Show>

        {/* Utilities Section */}
        <Show when={activeSection() === 'utilities'}>
          <section class="space-y-8">
            <div>
              <h1 class="text-3xl font-bold">Utilities</h1>
              <p class="text-muted-foreground">
                Demonstrating Tailwind CSS 4 utility classes
              </p>
            </div>

            <div class="space-y-8">
              <div>
                <h3 class="text-xl font-semibold mb-4">Spacing</h3>
                <div class="space-y-2">
                  <div class="bg-primary text-primary-foreground p-1 rounded">
                    p-1
                  </div>
                  <div class="bg-secondary text-secondary-foreground p-2 rounded">
                    p-2
                  </div>
                  <div class="bg-accent text-accent-foreground p-4 rounded">
                    p-4
                  </div>
                  <div class="bg-muted text-muted-foreground p-6 rounded">
                    p-6
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-xl font-semibold mb-4">Borders & Shadows</h3>
                <div class="grid grid-cols-2 gap-4">
                  <div class="border border-border p-4 rounded">Border</div>
                  <div class="border-2 border-border p-4 rounded">Border-2</div>
                  <div class="shadow-sm p-4 rounded">Shadow-sm</div>
                  <div class="shadow-lg p-4 rounded">Shadow-lg</div>
                </div>
              </div>

              <div>
                <h3 class="text-xl font-semibold mb-4">Glassmorphism</h3>
                <div class="grid grid-cols-2 gap-4">
                  <div class="glass p-4 rounded text-foreground">
                    Glass Effect
                  </div>
                  <div class="glass-dark p-4 rounded text-foreground">
                    Glass Dark
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Show>

        {/* Container Queries Section */}
        <Show when={activeSection() === 'container-queries'}>
          <section class="space-y-8">
            <div>
              <h1 class="text-3xl font-bold">Container Queries</h1>
              <p class="text-muted-foreground">
                Demonstrating Tailwind CSS 4 container query capabilities
              </p>
            </div>

            <div class="space-y-8">
              <div>
                <h3 class="text-xl font-semibold mb-4">Responsive Container</h3>
                <div
                  class="@container border border-border rounded-lg p-4"
                  style={{ 'container-type': 'inline-size' }}
                >
                  <div class="space-y-4">
                    <div class="bg-primary text-primary-foreground p-4 rounded">
                      <p class="text-xs container-xs:text-sm container-sm:text-base container-md:text-lg container-lg:text-xl container-xl:text-2xl">
                        This text responds to the container size, not the
                        viewport!
                      </p>
                    </div>
                    <div class="bg-secondary text-secondary-foreground p-4 rounded">
                      <p class="text-xs">
                        Resize the parent container to see the text size change.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-xl font-semibold mb-4">
                  Container Size Variations
                </h3>
                <div class="grid gap-4 md:grid-cols-2">
                  <div
                    class="@container border border-border rounded-lg p-4"
                    style={{ 'container-type': 'inline-size', width: '300px' }}
                  >
                    <div class="bg-accent text-accent-foreground p-4 rounded">
                      <p class="text-lg font-semibold mb-2">
                        Small Container (300px)
                      </p>
                      <p class="text-xs container-xs:text-sm container-sm:text-base">
                        Adaptive text based on container
                      </p>
                    </div>
                  </div>
                  <div
                    class="@container border border-border rounded-lg p-4"
                    style={{ 'container-type': 'inline-size', width: '500px' }}
                  >
                    <div class="bg-muted text-muted-foreground p-4 rounded">
                      <p class="text-lg font-semibold mb-2">
                        Large Container (500px)
                      </p>
                      <p class="text-xs container-xs:text-sm container-sm:text-base container-md:text-lg container-lg:text-xl">
                        Adaptive text based on container
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Show>
      </main>

      {/* Footer */}
      <footer class="border-t py-8">
        <div class="container text-center text-sm text-muted-foreground">
          <p>
            Tailwind CSS 4 Demo - Built with SolidJS and centralized
            configuration
          </p>
          <p class="mt-2">
            Features: @theme directive, enhanced @apply, container queries, and
            more!
          </p>
        </div>
      </footer>
    </div>
  )
}

export default TailwindDemo
