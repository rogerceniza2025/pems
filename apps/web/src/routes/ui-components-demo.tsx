import type { Component } from 'solid-js'
import { createSignal, For, Show, splitProps } from 'solid-js'

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
  Form,
  FormField,
  FormLabel,
  FormControl,
  FormError,
  FormDescription,
  FormSubmit,
  FormActions,
  createForm,
  userFormSchema,
  type UserFormData,
} from '@pems/ui'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@pems/ui'
import {
  Checkbox,
  CheckboxGroup,
  CheckboxCard,
} from '@pems/ui'
import {
  RadioGroup,
  RadioGroupItem,
  RadioCard,
  RadioField,
} from '@pems/ui'
import {
  Select,
  MultiSelect,
} from '@pems/ui'
import {
  Textarea,
  RichTextarea,
} from '@pems/ui'
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableCheckbox,
  TableSort,
  TablePagination,
  TableSearch,
} from '@pems/ui'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuGroup,
} from '@pems/ui'
import {
  Navbar,
  NavbarItem,
  MobileNav,
  Breadcrumb,
} from '@pems/ui'
import {
  Sidebar,
  SidebarItem,
  SidebarGroup,
  SidebarProfile,
} from '@pems/ui'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  ModalCloseButton,
  AlertDialog,
  ConfirmDialog,
  Dialog,
} from '@pems/ui'

// Form Example Components
const BasicFormExample: Component = () => {
  const [isSubmitting, setIsSubmitting] = createSignal(false)

  const form = createForm({
    schema: userFormSchema,
    defaultValues: {
      firstName: '',
      email: '',
      password: '',
      confirmPassword: '',
      newsletter: false,
    } as UserFormData,
  })

  const handleSubmit = async (data: UserFormData) => {
    setIsSubmitting(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('Form submitted:', data)
    setIsSubmitting(false)
    alert('Form submitted successfully!')
  }

  return (
    <Form form={form} onSubmit={handleSubmit} spacing="compact">
      <div class="grid gap-4 md:grid-cols-2">
        <FormField<UserFormData> name="firstName">
          <FormLabel>First Name</FormLabel>
          <FormControl>
            <Input
              placeholder="Enter your first name"
              value={form.field('firstName').state.value}
              onValueChange={(value) => form.field('firstName').setValue(value)}
            />
          </FormControl>
          <FormError />
        </FormField>

        <FormField<UserFormData> name="email">
          <FormLabel>Email Address</FormLabel>
          <FormControl>
            <Input
              type="email"
              placeholder="Enter your email"
              value={form.field('email').state.value}
              onValueChange={(value) => form.field('email').setValue(value)}
            />
          </FormControl>
          <FormError />
        </FormField>
      </div>

      <FormField<UserFormData> name="password">
        <FormLabel>Password</FormLabel>
        <FormControl>
          <Input
            type="password"
            placeholder="Enter your password"
            value={form.field('password').state.value}
            onValueChange={(value) => form.field('password').setValue(value)}
          />
        </FormControl>
        <FormDescription>Must be at least 8 characters with uppercase, lowercase, and number</FormDescription>
        <FormError />
      </FormField>

      <FormField<UserFormData> name="confirmPassword">
        <FormLabel>Confirm Password</FormLabel>
        <FormControl>
          <Input
            type="password"
            placeholder="Confirm your password"
            value={form.field('confirmPassword').state.value}
            onValueChange={(value) => form.field('confirmPassword').setValue(value)}
          />
        </FormControl>
        <FormError />
      </FormField>

      <FormField<UserFormData> name="newsletter">
        <div class="flex items-center space-x-2">
          <input
            type="checkbox"
            id="newsletter"
            checked={form.field('newsletter').state.value}
            onChange={(e) => form.field('newsletter').setValue(e.target.checked)}
            class="rounded border-gray-300"
          />
          <Label for="newsletter">Subscribe to newsletter</Label>
        </div>
      </FormField>

      <FormActions>
        <FormSubmit loading={isSubmitting()}>
          {isSubmitting() ? 'Creating Account...' : 'Create Account'}
        </FormSubmit>
      </FormActions>
    </Form>
  )
}

const FormLayoutExample: Component = () => {
  const [layout, setLayout] = createSignal<'vertical' | 'horizontal' | 'grid'>('vertical')

  const form = createForm({
    schema: userFormSchema.pick({ firstName: true, email: true }),
    defaultValues: {
      firstName: '',
      email: '',
    },
  })

  const handleSubmit = (data: any) => {
    console.log('Form submitted:', data)
    alert(`Form submitted with layout: ${layout()}`)
  }

  return (
    <div class="space-y-6">
      {/* Layout Controls */}
      <div class="flex gap-2">
        <Button
          variant={layout() === 'vertical' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLayout('vertical')}
        >
          Vertical
        </Button>
        <Button
          variant={layout() === 'horizontal' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLayout('horizontal')}
        >
          Horizontal
        </Button>
        <Button
          variant={layout() === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLayout('grid')}
        >
          Grid
        </Button>
      </div>

      <Form form={form} onSubmit={handleSubmit} layout={layout()}>
        <FormField name="firstName">
          <FormLabel>First Name</FormLabel>
          <FormControl>
            <Input
              placeholder="Enter your first name"
              value={form.field('firstName').state.value}
              onValueChange={(value) => form.field('firstName').setValue(value)}
            />
          </FormControl>
          <FormDescription>Your first name as it appears on your ID</FormDescription>
          <FormError />
        </FormField>

        <FormField name="email">
          <FormLabel>Email Address</FormLabel>
          <FormControl>
            <Input
              type="email"
              placeholder="Enter your email"
              value={form.field('email').state.value}
              onValueChange={(value) => form.field('email').setValue(value)}
            />
          </FormControl>
          <FormDescription>We'll never share your email with anyone else</FormDescription>
          <FormError />
        </FormField>

        <FormActions>
          <FormSubmit>Submit Form</FormSubmit>
        </FormActions>
      </Form>
    </div>
  )
}

const AdvancedFormExample: Component = () => {
  const [submitCount, setSubmitCount] = createSignal(0)
  const [formData, setFormData] = createSignal<any>(null)

  const form = createForm({
    schema: userFormSchema,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      age: undefined,
      phone: '',
      bio: '',
      newsletter: false,
      terms: false,
    } as UserFormData,
  })

  const handleSubmit = async (data: UserFormData) => {
    console.log('Advanced form submitted:', data)
    setSubmitCount(prev => prev + 1)
    setFormData(data)
    alert(`Form submitted successfully! Submit count: ${submitCount() + 1}`)
  }

  const handleValidationError = (errors: any[]) => {
    console.error('Validation errors:', errors)
  }

  return (
    <div class="space-y-6">
      {/* Form Stats */}
      <div class="p-4 bg-muted rounded-lg">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span class="font-medium">Submits:</span> {submitCount()}
          </div>
          <div>
            <span class="font-medium">Valid:</span> {Object.keys(form.state.errors).length === 0 ? 'Yes' : 'No'}
          </div>
          <div>
            <span class="font-medium">Dirty:</span> {Object.keys(form.state.dirtyFields).length > 0 ? 'Yes' : 'No'}
          </div>
          <div>
            <span class="font-medium">Fields:</span> {Object.keys(form.state.values).length}
          </div>
        </div>
      </div>

      <Form
        form={form}
        onSubmit={handleSubmit}
        onValidationError={handleValidationError}
        layout="vertical"
        spacing="normal"
      >
        {/* Personal Information Section */}
        <div class="space-y-4 p-4 border rounded-lg bg-background">
          <h3 class="text-lg font-semibold">Personal Information</h3>

          <div class="grid gap-4 md:grid-cols-2">
            <FormField name="firstName">
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your first name"
                  value={form.field('firstName').state.value}
                  onValueChange={(value) => form.field('firstName').setValue(value)}
                />
              </FormControl>
              <FormError />
            </FormField>

            <FormField name="lastName">
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your last name"
                  value={form.field('lastName').state.value}
                  onValueChange={(value) => form.field('lastName').setValue(value)}
                />
              </FormControl>
              <FormError />
            </FormField>
          </div>

          <FormField name="email">
            <FormLabel>Email Address</FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="Enter your email"
                value={form.field('email').state.value}
                onValueChange={(value) => form.field('email').setValue(value)}
              />
            </FormControl>
            <FormDescription>Must be a valid email address</FormDescription>
            <FormError />
          </FormField>
        </div>

        {/* Additional Information Section */}
        <div class="space-y-4 p-4 border rounded-lg bg-background">
          <h3 class="text-lg font-semibold">Additional Information</h3>

          <FormField name="age">
            <FormLabel>Age</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Enter your age"
                value={form.field('age').state.value || ''}
                onValueChange={(value) => form.field('age').setValue(value ? parseInt(value) : undefined)}
              />
            </FormControl>
            <FormDescription>Must be between 18 and 120 years</FormDescription>
            <FormError />
          </FormField>

          <FormField name="phone">
            <FormLabel>Phone Number</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter your phone number"
                value={form.field('phone').state.value || ''}
                onValueChange={(value) => form.field('phone').setValue(value)}
              />
            </FormControl>
            <FormDescription>Optional - Format: +1 (555) 123-4567</FormDescription>
            <FormError />
          </FormField>

          <FormField name="bio">
            <FormLabel>Bio</FormLabel>
            <FormControl>
              <Input
                placeholder="Tell us about yourself..."
                value={form.field('bio').state.value || ''}
                onValueChange={(value) => form.field('bio').setValue(value)}
              />
            </FormControl>
            <FormDescription>Maximum 500 characters</FormDescription>
            <FormError />
          </FormField>
        </div>

        {/* Security Section */}
        <div class="space-y-4 p-4 border rounded-lg bg-background">
          <h3 class="text-lg font-semibold">Security</h3>

          <div class="grid gap-4 md:grid-cols-2">
            <FormField name="password">
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={form.field('password').state.value}
                  onValueChange={(value) => form.field('password').setValue(value)}
                />
              </FormControl>
              <FormError />
            </FormField>

            <FormField name="confirmPassword">
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  value={form.field('confirmPassword').state.value}
                  onValueChange={(value) => form.field('confirmPassword').setValue(value)}
                />
              </FormControl>
              <FormError />
            </FormField>
          </div>
        </div>

        {/* Preferences Section */}
        <div class="space-y-4 p-4 border rounded-lg bg-background">
          <h3 class="text-lg font-semibold">Preferences</h3>

          <div class="space-y-3">
            <FormField name="newsletter">
              <div class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="newsletter-advanced"
                  checked={form.field('newsletter').state.value}
                  onChange={(e) => form.field('newsletter').setValue(e.target.checked)}
                  class="rounded border-gray-300"
                />
                <Label for="newsletter-advanced">Subscribe to newsletter and updates</Label>
              </div>
            </FormField>

            <FormField name="terms">
              <div class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="terms-advanced"
                  checked={form.field('terms').state.value}
                  onChange={(e) => form.field('terms').setValue(e.target.checked)}
                  class="rounded border-gray-300"
                />
                <Label for="terms-advanced">I agree to the terms and conditions</Label>
              </div>
              <FormError field="terms" />
            </FormField>
          </div>
        </div>

        {/* Form Actions */}
        <FormActions>
          <Button
            variant="outline"
            type="button"
            onClick={() => form.reset()}
          >
            Reset Form
          </Button>
          <FormSubmit>
            Create Account
          </FormSubmit>
        </FormActions>
      </Form>

      {/* Form Data Display */}
      {formData() && (
        <div class="p-4 bg-muted rounded-lg">
          <h3 class="text-lg font-semibold mb-2">Last Submitted Data:</h3>
          <pre class="text-xs overflow-x-auto">
            {JSON.stringify(formData(), null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

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
      // eslint-disable-next-line no-console
      console.error('Failed to copy code:', err)
    }
  }

  const components = [
    { id: 'button', label: 'Button', icon: '🔘' },
    { id: 'card', label: 'Card', icon: '📋' },
    { id: 'input', label: 'Input', icon: '📝' },
    { id: 'label', label: 'Label', icon: '🏷️' },
    { id: 'form', label: 'Form', icon: '📋' },
    { id: 'accordion', label: 'Accordion', icon: '📁' },
    { id: 'checkbox', label: 'Checkbox', icon: '☑️' },
    { id: 'radio', label: 'Radio', icon: '⚪' },
    { id: 'select', label: 'Select', icon: '📋' },
    { id: 'textarea', label: 'Textarea', icon: '📄' },
    { id: 'table', label: 'Table', icon: '📊' },
    { id: 'dropdown', label: 'Dropdown', icon: '📂' },
    { id: 'navbar', label: 'Navbar', icon: '🧭' },
    { id: 'sidebar', label: 'Sidebar', icon: '📱' },
    { id: 'breadcrumb', label: 'Breadcrumb', icon: '🧭' },
    { id: 'modal', label: 'Modal', icon: '🪟' },
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
                  activeComponent() === component.id ? 'text-primary' : 'text-muted-foreground'
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
    <CardDescription>Card description goes here</CardDescription>
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
    <CardDescription>Card description goes here</CardDescription>
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
    <CardDescription>Card description goes here</CardDescription>
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

        {/* Form Component */}
        <section id="form" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>📋</span> Form Validation System
            </h2>
            <p class="text-muted-foreground">
              Comprehensive form validation with TanStack Form and Zod schema validation.
            </p>
          </div>

          {/* Basic Form Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Basic Form with Validation</h3>
            <Card>
              <CardContent class="pt-6">
                <BasicFormExample />
              </CardContent>
            </Card>
          </div>

          {/* Form Layout Variants */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Form Layout Variants</h3>
            <Card>
              <CardContent class="pt-6">
                <FormLayoutExample />
              </CardContent>
            </Card>
          </div>

          {/* Advanced Form */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Advanced Form with Complex Validation</h3>
            <Card>
              <CardContent class="pt-6">
                <AdvancedFormExample />
              </CardContent>
            </Card>
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Usage Example</h3>
            <Card>
              <CardContent class="pt-6">
                <div class="relative">
                  <pre class="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{`import { Form, FormField, FormLabel, FormControl, FormError, FormDescription, FormSubmit, createForm, zodValidator } from '@pems/ui';
import { z } from 'zod';

// Define schema
const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Create form with validation
const form = createForm({
  schema: userSchema,
  defaultValues: {
    name: '',
    email: '',
    password: '',
  },
});

const MyForm = () => {
  const handleSubmit = async (data) => {
    console.log('Form submitted:', data);
  };

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <FormField name="name">
        <FormLabel>Name</FormLabel>
        <FormControl>
          <Input placeholder="Enter your name" />
        </FormControl>
        <FormError />
        <FormDescription>Enter your full name</FormDescription>
      </FormField>

      <FormField name="email">
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input type="email" placeholder="Enter your email" />
        </FormControl>
        <FormError />
      </FormField>

      <FormField name="password">
        <FormLabel>Password</FormLabel>
        <FormControl>
          <Input type="password" placeholder="Enter your password" />
        </FormControl>
        <FormError />
        <FormDescription>Must be at least 8 characters</FormDescription>
      </FormField>

      <FormActions>
        <FormSubmit loading={form.state.isSubmitting}>
          {form.state.isSubmitting ? 'Submitting...' : 'Submit'}
        </FormSubmit>
      </FormActions>
    </Form>
  );
};`}</code>
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    class="absolute top-2 right-2"
                    onClick={() =>
                      copyToClipboard(`import { Form, FormField, FormLabel, FormControl, FormError, FormDescription, FormSubmit, createForm, zodValidator } from '@pems/ui';
import { z } from 'zod';

// Define schema
const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Create form with validation
const form = createForm({
  schema: userSchema,
  defaultValues: {
    name: '',
    email: '',
    password: '',
  },
});

const MyForm = () => {
  const handleSubmit = async (data) => {
    console.log('Form submitted:', data);
  };

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <FormField name="name">
        <FormLabel>Name</FormLabel>
        <FormControl>
          <Input placeholder="Enter your name" />
        </FormControl>
        <FormError />
        <FormDescription>Enter your full name</FormDescription>
      </FormField>

      <FormField name="email">
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input type="email" placeholder="Enter your email" />
        </FormControl>
        <FormError />
      </FormField>

      <FormField name="password">
        <FormLabel>Password</FormLabel>
        <FormControl>
          <Input type="password" placeholder="Enter your password" />
        </FormControl>
        <FormError />
        <FormDescription>Must be at least 8 characters</FormDescription>
      </FormField>

      <FormActions>
        <FormSubmit loading={form.state.isSubmitting}>
          {form.state.isSubmitting ? 'Submitting...' : 'Submit'}
        </FormSubmit>
      </FormActions>
    </Form>
  );
};`)
                    }
                  >
                    {copiedCode() ===
                    `import { Form, FormField, FormLabel, FormControl, FormError, FormDescription, FormSubmit, createForm, zodValidator } from '@pems/ui';
import { z } from 'zod';

// Define schema
const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Create form with validation
const form = createForm({
  schema: userSchema,
  defaultValues: {
    name: '',
    email: '',
    password: '',
  },
});

const MyForm = () => {
  const handleSubmit = async (data) => {
    console.log('Form submitted:', data);
  };

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <FormField name="name">
        <FormLabel>Name</FormLabel>
        <FormControl>
          <Input placeholder="Enter your name" />
        </FormControl>
        <FormError />
        <FormDescription>Enter your full name</FormDescription>
      </FormField>

      <FormField name="email">
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input type="email" placeholder="Enter your email" />
        </FormControl>
        <FormError />
      </FormField>

      <FormField name="password">
        <FormLabel>Password</FormLabel>
        <FormControl>
          <Input type="password" placeholder="Enter your password" />
        </FormControl>
        <FormError />
        <FormDescription>Must be at least 8 characters</FormDescription>
      </FormField>

      <FormActions>
        <FormSubmit loading={form.state.isSubmitting}>
          {form.state.isSubmitting ? 'Submitting...' : 'Submit'}
        </FormSubmit>
      </FormActions>
    </Form>
  );
};`
                      ? '✅'
                      : '📋'}
                  </Button>
                </div>
              </CardContent>
            </Card>
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

          {/* Accordion Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Accordion Example</h3>
            <Accordion>
              <AccordionItem value="item-1">
                <AccordionTrigger>Section 1</AccordionTrigger>
                <AccordionContent>
                  <div class="pb-4">
                    <p>
                      This is the content for section 1. You can put any
                      content here including text, images, or other components.
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

        {/* Checkbox Component */}
        <section id="checkbox" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>☑️</span> Checkbox Component
            </h2>
            <p class="text-muted-foreground">
              Accessible checkbox with multiple variants and states
            </p>
          </div>

          {/* Checkbox Examples */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Basic Checkboxes</h3>
            <div class="space-y-4">
              <div class="space-y-2">
                <Label for="basic-checkbox">Basic Checkbox</Label>
                <Checkbox id="basic-checkbox" />
              </div>
              <div class="space-y-2">
                <Label for="checked-checkbox">Checked Checkbox</Label>
                <Checkbox id="checked-checkbox" checked />
              </div>
              <div class="space-y-2">
                <Label for="disabled-checkbox">Disabled Checkbox</Label>
                <Checkbox id="disabled-checkbox" disabled />
              </div>
            </div>

            <h3 class="text-xl font-semibold">Checkbox Group</h3>
            <CheckboxGroup
              label="Select Options"
              options={[
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' },
                { value: 'option3', label: 'Option 3' },
              ]}
            />

            <h3 class="text-xl font-semibold">Checkbox Cards</h3>
            <div class="grid gap-4 md:grid-cols-2">
              <CheckboxCard
                value="card1"
                checked
                label="Premium Plan"
              >
                <div class="space-y-1">
                  <div class="font-medium">Premium Plan</div>
                  <div class="text-sm text-muted-foreground">$29/month</div>
                </div>
              </CheckboxCard>
              <CheckboxCard
                value="card2"
                label="Basic Plan"
              >
                <div class="space-y-1">
                  <div class="font-medium">Basic Plan</div>
                  <div class="text-sm text-muted-foreground">$9/month</div>
                </div>
              </CheckboxCard>
            </div>
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Code Example</h3>
            <div class="relative">
              <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                <code class="text-sm">{`import { Checkbox, CheckboxGroup } from '@pems/ui';

<Checkbox id="terms" label="I agree to the terms and conditions" />
<CheckboxGroup
  label="Preferences"
  options={[
    { value: 'email', label: 'Email notifications' },
    { value: 'sms', label: 'SMS notifications' },
    { value: 'push', label: 'Push notifications' },
  ]}
/>`}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                class="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(`import { Checkbox, CheckboxGroup } from '@pems/ui';

<Checkbox id="terms" label="I agree to the terms and conditions" />
<CheckboxGroup
  label="Preferences"
  options={[
    { value: 'email', label: 'Email notifications' },
    { value: 'sms', label: 'SMS notifications' },
    { value: 'push', label: 'Push notifications' },
  ]}
/>`)
                }
              >
                {copiedCode() ===
                `import { Checkbox, CheckboxGroup } from '@pems/ui';

<Checkbox id="terms" label="I agree to the terms and conditions" />
<CheckboxGroup
  label="Preferences"
  options={[
    { value: 'email', label: 'Email notifications' },
    { value: 'sms', label: 'SMS notifications' },
    { value: 'push', label: 'Push notifications' },
  ]}
/>`
                  ? '✅'
                  : '📋'}
              </Button>
            </div>
          </div>
        </section>

        {/* Radio Component */}
        <section id="radio" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>⚪</span> Radio Component
            </h2>
            <p class="text-muted-foreground">
              Accessible radio buttons with custom styling
            </p>
          </div>

          {/* Radio Examples */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Radio Group</h3>
            <RadioField
              label="Select Plan"
              options={[
                { value: 'free', label: 'Free Plan', description: 'Basic features' },
                { value: 'pro', label: 'Pro Plan', description: 'All features' },
                { value: 'enterprise', label: 'Enterprise Plan', description: 'Custom features' },
              ]}
            />

            <h3 class="text-xl font-semibold">Radio Cards</h3>
            <div class="grid gap-4 md:grid-cols-2">
              <RadioCard
                value="card1"
                checked
                label="Monthly Billing"
              >
                <div class="space-y-1">
                  <div class="font-medium">Monthly</div>
                  <div class="text-sm text-muted-foreground">Billed monthly</div>
                </div>
              </RadioCard>
              <RadioCard
                value="card2"
                checked
                label="Yearly Billing"
              >
                <div class="space-y-1">
                  <div class="font-medium">Yearly</div>
                  <div class="text-sm text-muted-foreground">Save 20%</div>
                </div>
              </RadioCard>
            </div>
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Code Example</h3>
            <div class="relative">
              <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                <code class="text-sm">{`import { RadioGroup, RadioField, RadioCard } from '@pems/ui';

<RadioField
  label="Select Plan"
  options={[
    { value: 'free', label: 'Free Plan', description: 'Basic features' },
    { value: 'pro', label: 'Pro Plan', description: 'All features' },
  ]}
/>`}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                class="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(`import { RadioGroup, RadioField, RadioCard } from '@pems/ui';

<RadioField
  label="Select Plan"
  options={[
    { value: 'free', label: 'Free Plan', description: 'Basic features' },
    { value: 'pro', label: 'Pro Plan', description: 'All features' },
  ]}
/>`)
                }
              >
                {copiedCode() ===
                `import { RadioGroup, RadioField, RadioCard } from '@pems/ui';

<RadioField
  label="Select Plan"
  options={[
    { value: 'free', label: 'Free Plan', description: 'Basic features' },
    { value: 'pro', label: 'Pro Plan', description: 'All features' },
  ]}
/>`
                  ? '✅'
                  : '📋'}
              </Button>
            </div>
          </div>
        </section>

        {/* Select Component */}
        <section id="select" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>📋</span> Select Component
            </h2>
            <p class="text-muted-foreground">
              Customizable select dropdown with search and multi-select
            </p>
          </div>

          {/* Select Examples */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Basic Select</h3>
            <div class="space-y-2">
              <Label for="basic-select">Choose an option</Label>
              <Select
                id="basic-select"
                placeholder="Select an option..."
                options={[
                  { value: 'option1', label: 'Option 1' },
                  { value: 'option2', label: 'Option 2' },
                  { value: 'option3', label: 'Option 3' },
                ]}
              />
            </div>

            <h3 class="text-xl font-semibold">Multi-Select</h3>
            <div class="space-y-2">
              <MultiSelect
                placeholder="Select multiple options..."
                options={[
                  { value: 'react', label: 'React' },
                  { value: 'vue', label: 'Vue' },
                  { value: 'angular', label: 'Angular' },
                  { value: 'svelte', label: 'Svelte' },
                  { value: 'solid', label: 'SolidJS' },
                ]}
                maxVisible={3}
              />
            </div>
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Code Example</h3>
            <div class="relative">
              <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                <code class="text-sm">{`import { Select, MultiSelect } from '@pems/ui';

<Select
  placeholder="Select an option..."
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ]}
/>

<MultiSelect
  placeholder="Select multiple..."
  options={[
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'angular', label: 'Angular' },
  ]}
/>`}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                class="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(`import { Select, MultiSelect } from '@pems/ui';

<Select
  placeholder="Select an option..."
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ]}
/>

<MultiSelect
  placeholder="Select multiple..."
  options={[
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'angular', label: 'Angular' },
  ]}
/>`)
                }
              >
                {copiedCode() ===
                `import { Select, MultiSelect } from '@pems/ui';

<Select
  placeholder="Select an option..."
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ]}
/>

<MultiSelect
  placeholder="Select multiple..."
  options={[
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'angular', label: 'Angular' },
  ]}
  maxVisible={3}
/>`
                  ? '✅'
                  : '📋'}
              </Button>
            </div>
          </div>
        </section>

        {/* Textarea Component */}
        <section id="textarea" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>📄</span> Textarea Component
            </h2>
            <p class="text-muted-foreground">
              Rich textarea with formatting options and character count
            </p>
          </div>

          {/* Textarea Examples */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Basic Textarea</h3>
            <div class="space-y-2">
              <Label for="basic-textarea">Message</Label>
              <Textarea
                id="basic-textarea"
                placeholder="Type your message here..."
                rows={4}
                maxLength={200}
                showCharCount
              />
            </div>

            <h3 class="text-xl font-semibold">Rich Textarea</h3>
            <RichTextarea
              label="Rich Content"
              placeholder="Write your rich text here..."
              rows={6}
              toolbar
              maxLength={500}
              showCharCount
            />
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Code Example</h3>
            <div class="relative">
              <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                <code class="text-sm">{`import { Textarea, RichTextarea } from '@pems/ui';

<Textarea
  placeholder="Type your message..."
  rows={4}
  maxLength={200}
  showCharCount
/>

<RichTextarea
  label="Rich Content"
  toolbar
  maxLength={500}
  showCharCount
/>`}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                class="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(`import { Textarea, RichTextarea } from '@pems/ui';

<Textarea
  placeholder="Type your message..."
  rows={4}
  maxLength={200}
  showCharCount
/>

<RichTextarea
  label="Rich Content"
  toolbar
  maxLength={500}
  showCharCount
/>`)
                }
              >
                {copiedCode() ===
                `import { Textarea, RichTextarea } from '@pems/ui';

<Textarea
  placeholder="Type your message..."
  rows={4}
  maxLength={200}
  showCharCount
/>

<RichTextarea
  label="Rich Content"
  toolbar
  maxLength={500}
  showCharCount
/>`
                  ? '✅'
                  : '📋'}
              </Button>
            </div>
          </div>
        </section>

        {/* Table Component */}
        <section id="table" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>📊</span> Table Component
            </h2>
            <p class="text-muted-foreground">
              Data table with sorting, pagination, and search
            </p>
          </div>

          {/* Table Examples */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Basic Table</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <TableSort
                      column="name"
                      direction={null}
                      onSort={(column, direction) => console.log(column, direction)}
                    >
                      Name
                    </TableSort>
                  </TableHead>
                  <TableHead>
                    <TableSort
                      column="email"
                      direction={null}
                      onSort={(column, direction) => console.log(column, direction)}
                    >
                      Email
                    </TableSort>
                  </TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>John Doe</TableCell>
                  <TableCell>john@example.com</TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell>
                    <span class="inline-flex items-center rounded-full bg-green-100 text-green-800 px-2 py-1 text-xs">
                      Active
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Jane Smith</TableCell>
                  <TableCell>jane@example.com</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>
                    <span class="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-1 text-xs">
                      Active
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Bob Johnson</TableCell>
                  <TableCell>bob@example.com</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>
                    <span class="inline-flex items-center rounded-full bg-gray-100 text-gray-800 px-2 py-1 text-xs">
                      Inactive
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <h3 class="text-xl font-semibold">Table with Search and Pagination</h3>
            <div class="space-y-4">
              <TableSearch placeholder="Search users..." />
              <Table variant="striped">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <TableCheckbox />
                    </TableCell>
                    <TableCell>John Doe</TableCell>
                    <TableCell>john@example.com</TableCell>
                    <TableCell>Admin</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <TableCheckbox />
                    </TableCell>
                    <TableCell>Jane Smith</TableCell>
                    <TableCell>jane@example.com</TableCell>
                    <TableCell>User</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <TablePagination
                currentPage={1}
                totalPages={5}
                totalItems={50}
                pageSize={10}
                onPageChange={(page) => console.log('Page:', page)}
              />
            </div>
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Code Example</h3>
            <div class="relative">
              <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                <code class="text-sm">{`import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TablePagination,
  TableSearch,
  TableCheckbox,
  TableSort,
} from '@pems/ui';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Role</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
      <TableCell>Admin</TableCell>
    </TableRow>
  </TableBody>
</Table>`}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                class="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(`import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TablePagination,
  TableSearch,
  TableCheckbox,
  TableSort,
} from '@pems/ui';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Role</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
      <TableCell>Admin</TableCell>
    </TableRow>
  </TableBody>
</Table>`)
                }
              >
                {copiedCode() ===
                `import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TablePagination,
  TableSearch,
  TableCheckbox,
  TableSort,
} from '@pems/ui';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Role</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
      <TableCell>Admin</TableCell>
    </TableRow>
  </TableBody>
</Table>`
                  ? '✅'
                  : '📋'}
              </Button>
            </div>
          </div>
        </section>

        {/* Dropdown Component */}
        <section id="dropdown" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>📂</span> Dropdown Component
            </h2>
            <p class="text-muted-foreground">
              Accessible dropdown menu with keyboard navigation
            </p>
          </div>

          {/* Dropdown Examples */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Basic Dropdown</h3>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline">Options</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <h3 class="text-xl font-semibold">Dropdown with Submenu</h3>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline">File</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>New File</DropdownMenuItem>
                <DropdownMenuItem>Open File</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Recent Files</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>document1.txt</DropdownMenuItem>
                    <DropdownMenuItem>document2.txt</DropdownMenuItem>
                    <DropdownMenuItem>document3.txt</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>

            <h3 class="text-xl font-semibold">Checkbox and Radio Items</h3>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline">Actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Selection</DropdownMenuLabel>
                <DropdownMenuCheckboxItem value="show-hidden">Show hidden files</DropdownMenuCheckboxItem>
                <DropdownMenuRadioItem value="sort-name">Sort by name</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="sort-date">Sort by date</DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Refresh</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Code Example</h3>
            <div class="relative">
              <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                <code class="text-sm">{`import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
} from '@pems/ui';

<DropdownMenu>
  <DropdownMenuTrigger>
    <Button>Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                class="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(`import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
} from '@pems/ui';

<DropdownMenu>
  <DropdownMenuTrigger>
    <Button>Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`)
                }
              >
                {copiedCode() ===
                `import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
} from '@pems/ui';

<DropdownMenu>
  <DropdownMenuTrigger>
    <Button>Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`
                  ? '✅'
                  : '📋'}
              </Button>
            </div>
          </div>
        </section>

        {/* Navbar Component */}
        <section id="navbar" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>🧭</span> Navbar Component
            </h2>
            <p class="text-muted-foreground">
              Responsive navigation with mobile menu support
            </p>
          </div>

          {/* Navbar Examples */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Basic Navbar</h3>
            <Navbar
              brand={<span class="text-xl">🚀 MyApp</span>}
              items={[
                { label: 'Home', href: '/', active: true },
                { label: 'About', href: '/about' },
                { label: 'Contact', href: '/contact' },
              ]}
            />

            <h3 class="text-xl font-semibold">Navbar with Actions</h3>
            <Navbar
              brand={<span class="text-xl">🚀 MyApp</span>}
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Settings', href: '/settings' },
              ]}
              actions={
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              }
            />

            <h3 class="text-xl font-semibold">Collapsible Navbar</h3>
            <Navbar
              brand={<span class="text-xl">🚀 MyApp</span>}
              items={[
                { label: 'Home', href: '/', icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9,22 9,12 15,12" />
                  </svg>
                ) },
                { label: 'Products', href: '/products' },
              ]}
              collapsible
              collapsed={false}
            />
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Code Example</h3>
            <div class="relative">
              <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                <code class="text-sm">{`import { Navbar, NavbarItem } from '@pems/ui';

<Navbar
  brand="MyApp"
  items={[
    { label: 'Home', href: '/', active: true },
    { label: 'About', href: '/about' },
  ]}
/>`}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                class="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(`import { Navbar, NavbarItem } from '@pems/ui';

<Navbar
  brand="MyApp"
  items={[
    { label: 'Home', href: '/', active: true },
    { label: 'About', href: '/about' },
  ]}
/>`)
                }
              >
                {copiedCode() ===
                `import { Navbar, NavbarItem } from '@pems/ui';

<Navbar
  brand="MyApp"
  items={[
    { label: 'Home', href: '/', active: true },
    { label: 'About', href: '/about' },
  ]}
/>`
                  ? '✅'
                  : '📋'}
              </Button>
            </div>
          </div>
        </section>

        {/* Breadcrumb Component */}
        <section id="breadcrumb" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>🧭</span> Breadcrumb Component
            </h2>
            <p class="text-muted-foreground">
              Navigation breadcrumbs with home link
            </p>
          </div>

          {/* Breadcrumb Examples */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Basic Breadcrumb</h3>
            <Breadcrumb
              items={[
                { label: 'Home', href: '/' },
                { label: 'Products', href: '/products' },
                { label: 'Electronics', href: '/products/electronics', active: true },
              ]}
            />

            <h3 class="text-xl font-semibold">Breadcrumb with Home</h3>
            <Breadcrumb
              home={{ label: 'Home', href: '/' }}
              items={[
                { label: 'Products', href: '/products' },
                { label: 'Electronics', href: '/products/electronics', active: true },
              ]}
            />
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Code Example</h3>
            <div class="relative">
              <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                <code class="text-sm">{`import { Breadcrumb } from '@pems/ui';

<Breadcrumb
  items={[
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'Electronics', href: '/products/electronics', active: true },
  ]}
/>`}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                class="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(`import { Breadcrumb } from '@pems/ui';

<Breadcrumb
  items={[
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'Electronics', href: '/products/electronics', active: true },
  ]}
/>`)
                }
              >
                {copiedCode() ===
                `import { Breadcrumb } from '@pems/ui';

<Breadcrumb
  items={[
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'Electronics', href: '/products/electronics', active: true },
  ]}
/>`
                  ? '✅'
                  : '📋'}
              </Button>
            </div>
          </div>
        </section>

        {/* Sidebar Component */}
        <section id="sidebar" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>📱</span> Sidebar Component
            </h2>
            <p class="text-muted-foreground">
              Collapsible sidebar with navigation and profile
            </p>
          </div>

          {/* Sidebar Examples */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Basic Sidebar</h3>
            <div class="flex gap-8">
              <Sidebar
                items={[
                  { label: 'Dashboard', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <path d="M21 10v6a2 2 0 0 0-2-2H5a2 2 0 0 0-2-2v2" />
                    </svg>
                  ), active: true },
                  { label: 'Users', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4-4v2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m9 9 6 6-6" />
                    </svg>
                  ) },
                  { label: 'Settings', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v6m0 6l-6-6" />
                    </svg>
                  ) },
                ]}
              />
              </div>
            </div>

            <h3 class="text-xl font-semibold">Sidebar with Groups</h3>
            <Sidebar
              items={[
                { label: 'Analytics', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 3v18h18" />
                      <path d="M7 12h10m-7-7v14" />
                    </svg>
                ), active: true },
              ]}
            />

            <div>
              <h3 class="text-xl font-semibold">Sidebar with Profile</h3>
              <Sidebar
              items={[
                { label: 'Dashboard', active: true },
                { label: 'Projects' },
                { label: 'Team' },
              ]}
            >
              <SidebarProfile
                name="John Doe"
                email="john@example.com"
                avatar="https://images.unsplash.com/photo-1472099645785-5ab8deeac3d2?w=150&h=150&fit=crop&crop=faces"
                status="online"
                onSignOut={() => console.log('Sign out')}
              />
            </Sidebar>
          </div>

          {/* Code Example */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Code Example</h3>
            <div class="relative">
              <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                <code class="text-sm">{`import { Sidebar, SidebarItem, SidebarGroup, SidebarProfile } from '@pems/ui';

<Sidebar
  items={[
    { label: 'Dashboard', active: true },
    { label: 'Projects' },
    { label: 'Settings' },
  ]}
>
  <SidebarProfile
    name="John Doe"
    email="john@example.com"
    status="online"
    onSignOut={() => console.log('Sign out')}
  />
</Sidebar>`}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                class="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(`import { Sidebar, SidebarItem, SidebarGroup, SidebarProfile } from '@pems/ui';

<Sidebar
  items={[
    { label: 'Dashboard', active: true },
    { label: 'Projects' },
    { label: 'Settings' },
  ]}
>
  <SidebarProfile
    name="John Doe"
    email="john@example.com"
    status="online"
    onSignOut={() => console.log('Sign out')}
  />
</Sidebar>`)
                }
              >
                {copiedCode() ===
                `import { Sidebar, SidebarItem, SidebarGroup, SidebarProfile } from '@pems/ui';

<Sidebar
  items={[
    { label: 'Dashboard', active: true },
    { label: 'Projects' },
    { label: 'Settings' },
  ]}
>
  <SidebarProfile
    name="John Doe"
    email="john@example.com"
    status="online"
    onSignOut={() => console.log('Sign out')}
  />
</Sidebar>`
                  ? '✅'
                  : '📋'}
              </Button>
            </div>
          </div>
        </section>

        {/* Modal Component */}
        <section id="modal" class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold flex items-center gap-2">
              <span>🪟</span> Modal Component
            </h2>
            <p class="text-muted-foreground">
              Accessible modal dialogs with multiple variants
            </p>
          </div>

          {/* Modal Examples */}
          <div class="space-y-4">
            <h3 class="text-xl font-semibold">Modal Buttons</h3>
            <div class="flex gap-4">
              <Button onClick={() => alert('Basic Modal')}>Open Basic Modal</Button>
              <Button onClick={() => alert('Alert Dialog')}>Open Alert Dialog</Button>
              <Button onClick={() => alert('Confirm Dialog')}>Open Confirm Dialog</Button>
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
