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
} from 'lucide-solid'
import { createSignal, For, Show } from 'solid-js'

export function UIComponentsShowcaseSimple() {
  const [showPassword, setShowPassword] = createSignal(false)
  // const [switchValue, setSwitchValue] = createSignal(false)
  const [checkboxValue, setCheckboxValue] = createSignal(false)
  const [inputValue, setInputValue] = createSignal('')
  const [textareaValue, setTextareaValue] = createSignal('')

  const basicComponents = [
    {
      title: 'Button Variants',
      component: () => (
        <div class="flex flex-wrap gap-3">
          <Button variant="default">Default</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      )
    },
    {
      title: 'Button Sizes',
      component: () => (
        <div class="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">
            <Star class="w-4 h-4" />
          </Button>
        </div>
      )
    },
    {
      title: 'Form Inputs',
      component: () => (
        <div class="space-y-4">
          <div>
            <Label for="text-input">Text Input</Label>
            <Input
              id="text-input"
              placeholder="Type something..."
              value={inputValue()}
              onInput={(e) => setInputValue(e.currentTarget.value)}
            />
          </div>
          <div>
            <Label for="password-input">Password Input</Label>
            <div class="relative">
              <Input
                id="password-input"
                type={showPassword() ? 'text' : 'password'}
                placeholder="Enter password"
                icon={<Lock class="w-4 h-4" />}
              />
              <Button
                variant="ghost"
                size="icon"
                class="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword())}
              >
                <Show when={showPassword()} fallback={<EyeOff class="w-4 h-4" />}>
                  <Eye class="w-4 h-4" />
                </Show>
              </Button>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Selection Controls',
      component: () => (
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <Checkbox
              checked={checkboxValue()}
              onChange={setCheckboxValue}
              label="Enable notifications"
            />
          </div>
          <div>
            <Checkbox
              checked={checkboxValue()}
              onChange={setCheckboxValue}
              label="Accept terms and conditions"
            />
          </div>
        </div>
      )
    },
    {
      title: 'Text Area',
      component: () => (
        <div>
          <Label for="textarea">Message</Label>
          <Textarea
            id="textarea"
            placeholder="Enter your message..."
            value={textareaValue()}
            onInput={(e) => setTextareaValue(e.currentTarget.value)}
            rows={3}
          />
        </div>
      )
    },
    {
      title: 'Skeleton Loading',
      component: () => (
        <div class="space-y-4">
          <div class="space-y-2">
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-3/4" />
            <Skeleton class="h-4 w-1/2" />
          </div>
          <div class="flex items-center space-x-4">
            <Skeleton class="h-12 w-12 rounded-full" />
            <div class="space-y-2">
              <Skeleton class="h-4 w-24" />
              <Skeleton class="h-3 w-16" />
            </div>
          </div>
        </div>
      )
    },
  ]

  return (
    <div class="space-y-16">
      {/* Header */}
      <div class="text-center space-y-4">
        <h2 class="text-4xl font-bold text-foreground">UI Components Library</h2>
        <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
          Explore our essential UI components designed for modern web applications.
          Each component is fully accessible and built with Solid.js + Tailwind CSS.
        </p>
      </div>

      {/* Components Grid */}
      <section class="space-y-12">
        <For each={basicComponents}>
          {(component) => (
            <Card variant="outlined" class="p-6">
              <h3 class="text-xl font-semibold mb-4">{component.title}</h3>
              <div class="py-4">
                <component.component />
              </div>
            </Card>
          )}
        </For>
      </section>

      {/* Action Buttons */}
      <section class="text-center space-y-6">
        <div class="relative rounded-3xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-12">
          <div class="relative z-10">
            <h3 class="text-3xl font-bold mb-4 text-foreground">
              Ready to Build?
            </h3>
            <p class="text-muted-foreground mb-6 max-w-2xl mx-auto">
              These components are ready to use in your applications with full customization support.
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" icon={<Download class="w-5 h-5" />}>
                Get Started
              </Button>
              <Button variant="outline" size="lg" icon={<Settings class="w-5 h-5" />}>
                Documentation
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}