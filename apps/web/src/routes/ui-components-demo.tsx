import type { Component } from 'solid-js'
import { createSignal, For } from 'solid-js'
import { Button } from '@pems/ui'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@pems/ui'
import { Input } from '@pems/ui'
import { Label } from '@pems/ui'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@pems/ui'

const UIComponentsDemo: Component = () => {
  const [theme, setTheme] = createSignal<'light' | 'dark'>('light')
  const [activeComponent, setActiveComponent] = createSignal('button')
  const [copiedCode, setCopiedCode] = createSignal<string>('')

  const toggleTheme = () => {
    const newTheme = theme() === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(''), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const components = [
    { id: 'button', label: 'Button', icon: '🔘' },
    { id: 'card', label: 'Card', icon: '📋' },
    { id: 'input', label: 'Input', icon: '📝' },
    { id: 'label', label: 'Label', icon: '🏷️' },
    { id: 'accordion', label: 'Accordion', icon: '📁' },
  ]

  const scrollToComponent = (componentId: string) => {
    setActiveComponent(componentId)
    const element = document.getElementById(componentId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div class={`min-h-screen bg-background text-foreground ${theme()}`}>
      {/* Header */}
      <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div class="container flex h-14 items-center justify-between">
          <div class="flex items-center space-x-4">
            <h1 class="text-xl font-bold">UI Components Library</h1>
            <span class="text-sm text-muted-foreground">
              Kobalte + Tailwind CSS 4
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={toggleTheme}>
            {theme() === 'light' ? '🌙' : '☀️'} Theme
          </Button>
        </div>
      </header>

      {/* Navigation */}
      <nav class="sticky top-14 z-40 w-full border-b bg-background">
        <div class="container flex h-12 items-center space-x-6 overflow-x-auto">
          <For each={components}>
            {(component) => (
              <button
                class={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
                  activeComponent() === component.id
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
                onClick={() => scrollToComponent(component.id)}
              >
                <span>{component.icon}</span>
                <span>{component.label}</span>
              </button>
            )}
          </For>
        </div>
      </nav>

      {/* Main Content */}
      <main class="container py-8 space-y-16">
        {/* Button Component */}
        <section id="button" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>🔘</span> Button Component
            </h2>
            <p class="text-muted-foreground">
              Accessible button built with Kobalte primitives
            </p>
          </div>

          {/* Button Variants */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Variants</h3>
            <div class="flex flex-wrap gap-2">
              <Button variant="default">Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>

          {/* Button Sizes */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Sizes</h3>
            <div class="flex flex-wrap items-center gap-2">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">🔥</Button>
            </div>
          </div>

          {/* Button States */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">States</h3>
            <div class="flex flex-wrap gap-2">
              <Button>Normal</Button>
              <Button disabled>Disabled</Button>
              <Button class="opacity-75 cursor-not-allowed">Loading...</Button>
            </div>
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Code Example</h3>
            <div class="relative">
              <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                <code class="text-sm">{`import { Button } from '@pems/ui';

<Button variant="primary" size="lg">
  Click me
</Button>`}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                class="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(`import { Button } from '@pems/ui';

<Button variant="primary" size="lg">
  Click me
</Button>`)
                }
              >
                {copiedCode() ===
                `import { Button } from '@pems/ui';

<Button variant="primary" size="lg">
  Click me
</Button>`
                  ? '✅'
                  : '📋'}
              </Button>
            </div>
          </div>
        </section>

        {/* Card Component */}
        <section id="card" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>📋</span> Card Component
            </h2>
            <p class="text-muted-foreground">
              Flexible container with semantic structure
            </p>
          </div>

          {/* Card Examples */}
          <div class="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here</CardDescription>
              </CardHeader>
              <CardContent>
                <p class="text-sm text-muted-foreground">
                  This is the main content area of the card. You can put any
                  content here.
                </p>
              </CardContent>
              <CardFooter>
                <Button class="w-full">Card Action</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Different Layout</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <p class="text-sm">Card with different content structure</p>
                  <div class="flex gap-2">
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                    <Button size="sm">Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Code Example</h3>
            <div class="relative">
              <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                <code class="text-sm">{`import { Card, CardHeader, CardTitle, 
         CardDescription, CardContent, CardFooter } from '@pems/ui';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>`}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                class="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(`import { Card, CardHeader, CardTitle, 
         CardDescription, CardContent, CardFooter } from '@pems/ui';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>`)
                }
              >
                {copiedCode() ===
                `import { Card, CardHeader, CardTitle, 
         CardDescription, CardContent, CardFooter } from '@pems/ui';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>`
                  ? '✅'
                  : '📋'}
              </Button>
            </div>
          </div>
        </section>

        {/* Input Component */}
        <section id="input" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>📝</span> Input Component
            </h2>
            <p class="text-muted-foreground">
              Accessible form input with Kobalte TextField
            </p>
          </div>

          {/* Input Examples */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Input Variants</h3>
            <div class="space-y-4">
              <div class="space-y-2">
                <Label for="text-input">Text Input</Label>
                <Input id="text-input" placeholder="Enter text here..." />
              </div>
              <div class="space-y-2">
                <Label for="email-input">Email Input</Label>
                <Input
                  id="email-input"
                  type="email"
                  placeholder="email@example.com"
                />
              </div>
              <div class="space-y-2">
                <Label for="password-input">Password Input</Label>
                <Input
                  id="password-input"
                  type="password"
                  placeholder="Enter password..."
                />
              </div>
              <div class="space-y-2">
                <Label for="disabled-input">Disabled Input</Label>
                <Input
                  id="disabled-input"
                  disabled
                  placeholder="This is disabled..."
                />
              </div>
            </div>
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Code Example</h3>
            <div class="relative">
              <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                <code class="text-sm">{`import { Input, Label } from '@pems/ui';

<Label for="email">Email</Label>
<Input id="email" type="email" placeholder="email@example.com" />`}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                class="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(`import { Input, Label } from '@pems/ui';

<Label for="email">Email</Label>
<Input id="email" type="email" placeholder="email@example.com" />`)
                }
              >
                {copiedCode() ===
                `import { Input, Label } from '@pems/ui';

<Label for="email">Email</Label>
<Input id="email" type="email" placeholder="email@example.com" />`
                  ? '✅'
                  : '📋'}
              </Button>
            </div>
          </div>
        </section>

        {/* Label Component */}
        <section id="label" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>🏷️</span> Label Component
            </h2>
            <p class="text-muted-foreground">
              Accessible label for form controls
            </p>
          </div>

          {/* Label Examples */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Label Variants</h3>
            <div class="space-y-4">
              <div class="space-y-2">
                <Label for="standard-input">Standard Label</Label>
                <Input id="standard-input" placeholder="Standard input..." />
              </div>
              <div class="space-y-2">
                <Label for="required-input">Required Label *</Label>
                <Input id="required-input" placeholder="Required field..." />
              </div>
              <div class="space-y-2">
                <Label for="help-input">Label with Help</Label>
                <Input id="help-input" placeholder="Input with help text..." />
                <p class="text-sm text-muted-foreground">
                  ℹ️ This field requires a valid email address
                </p>
              </div>
            </div>
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Code Example</h3>
            <div class="relative">
              <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                <code class="text-sm">{`import { Label } from '@pems/ui';

<Label for="field">Field Name *</Label>
<Input id="field" placeholder="Enter value..." />`}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                class="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(`import { Label } from '@pems/ui';

<Label for="field">Field Name *</Label>
<Input id="field" placeholder="Enter value..." />`)
                }
              >
                {copiedCode() ===
                `import { Label } from '@pems/ui';

<Label for="field">Field Name *</Label>
<Input id="field" placeholder="Enter value..." />`
                  ? '✅'
                  : '📋'}
              </Button>
            </div>
          </div>
        </section>

        {/* Accordion Component */}
        <section id="accordion" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>📁</span> Accordion Component
            </h2>
            <p class="text-muted-foreground">
              Collapsible sections with Kobalte primitives
            </p>
          </div>

          {/* Accordion Examples */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Accordion Example</h3>
            <Accordion>
              <AccordionItem value="item-1">
                <AccordionTrigger>Section 1</AccordionTrigger>
                <AccordionContent>
                  <div class="pb-4">
                    <p>
                      This is the content for section 1. You can put any content
                      here including text, images, or other components.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Section 2</AccordionTrigger>
                <AccordionContent>
                  <div class="pb-4">
                    <p>
                      This is the content for section 2. Accordion components
                      are great for FAQ sections or organizing large amounts of
                      content.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Section 3</AccordionTrigger>
                <AccordionContent>
                  <div class="pb-4">
                    <p>
                      This is the content for section 3. The accordion uses
                      Kobalte primitives for full keyboard accessibility and
                      screen reader support.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Code Example</h3>
            <div class="relative">
              <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                <code class="text-sm">{`import { Accordion, AccordionItem, 
         AccordionTrigger, AccordionContent } from '@pems/ui';

<Accordion>
  <AccordionItem value="item-1">
    <AccordionTrigger>Section 1</AccordionTrigger>
    <AccordionContent>
      <p>Content for section 1</p>
    </AccordionContent>
  </AccordionItem>
</Accordion>`}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                class="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(`import { Accordion, AccordionItem, 
         AccordionTrigger, AccordionContent } from '@pems/ui';

<Accordion>
  <AccordionItem value="item-1">
    <AccordionTrigger>Section 1</AccordionTrigger>
    <AccordionContent>
      <p>Content for section 1</p>
    </AccordionContent>
  </AccordionItem>
</Accordion>`)
                }
              >
                {copiedCode() ===
                `import { Accordion, AccordionItem, 
         AccordionTrigger, AccordionContent } from '@pems/ui';

<Accordion>
  <AccordionItem value="item-1">
    <AccordionTrigger>Section 1</AccordionTrigger>
    <AccordionContent>
      <p>Content for section 1</p>
    </AccordionContent>
  </AccordionItem>
</Accordion>`
                  ? '✅'
                  : '📋'}
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer class="border-t py-8 mt-16">
        <div class="container text-center text-sm text-muted-foreground">
          <p>
            UI Components Library - Built with SolidJS, Kobalte, and Tailwind
            CSS 4
          </p>
          <p class="mt-2">
            Features: Full accessibility, keyboard navigation, and responsive
            design
          </p>
        </div>
      </footer>
    </div>
  )
}

export default UIComponentsDemo
