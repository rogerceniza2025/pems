import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  DropdownMenu,
  Input,
  Label,
  RadioGroup,
  Select,
  Skeleton,
  SkeletonCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@pems/ui'
import {
  Bookmark,
  ChevronDown,
  Download,
  Heart,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
  Upload,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Info,
  Loader2
} from 'lucide-solid'
import { createSignal, For, Show } from 'solid-js'

export function UIComponentsShowcase() {
  const [showPassword, setShowPassword] = createSignal(false)
  const [inputValue, setInputValue] = createSignal('')
  const [textareaValue, setTextareaValue] = createSignal('')
  const [selectValue, setSelectValue] = createSignal('')
  const [switchValue, setSwitchValue] = createSignal(false)
  const [toggleValue, setToggleValue] = createSignal('left')
  const [checkboxValues, setCheckboxValues] = createSignal<string[]>([])
  const [radioValue, setRadioValue] = createSignal('option1')
  const [loading, setLoading] = createSignal(false)

  const sampleOptions = [
    { value: 'option1', label: 'Option 1', description: 'First option description' },
    { value: 'option2', label: 'Option 2', description: 'Second option description' },
    { value: 'option3', label: 'Option 3', description: 'Third option description' },
  ]

  const tableData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Editor', status: 'Active' },
  ]

  const dropdownItems = [
    { label: 'Profile', icon: User, onClick: () => console.log('Profile clicked') },
    { label: 'Settings', icon: Settings, onClick: () => console.log('Settings clicked') },
    { label: 'Download', icon: Download, onClick: () => console.log('Download clicked') },
    { type: 'separator' as const },
    { label: 'Delete', icon: Trash2, variant: 'destructive' as const, onClick: () => console.log('Delete clicked') },
  ]

  const handleCheckboxChange = (value: string, checked: boolean) => {
    setCheckboxValues(prev =>
      checked
        ? [...prev, value]
        : prev.filter(v => v !== value)
    )
  }

  const handleDemoAction = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div class="space-y-16">
      {/* Header */}
      <div class="text-center space-y-4">
        <h2 class="text-4xl font-bold text-foreground">UI Components Library</h2>
        <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
          Explore our comprehensive set of pre-built UI components designed for modern web applications.
          Each component is fully customizable, accessible, and built with Solid.js + Tailwind CSS.
        </p>
      </div>

      {/* Buttons Section */}
      <section class="space-y-6">
        <h3 class="text-2xl font-bold text-foreground flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <Plus class="w-4 h-4" />
          </div>
          Buttons
        </h3>

        <Card variant="outlined" class="p-6 space-y-6">
          <div class="space-y-4">
            <div>
              <h4 class="text-sm font-medium text-muted-foreground mb-3">Button Variants</h4>
              <div class="flex flex-wrap gap-3">
                <Button variant="default">Default</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>

            <div>
              <h4 class="text-sm font-medium text-muted-foreground mb-3">Button Sizes</h4>
              <div class="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">
                  <Star class="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <h4 class="text-sm font-medium text-muted-foreground mb-3">States</h4>
              <div class="flex flex-wrap gap-3">
                <Button loading={loading()} onClick={handleDemoAction}>
                  Loading
                </Button>
                <Button disabled>Disabled</Button>
                <Button icon={<Heart class="w-4 h-4" />}>
                  With Icon
                </Button>
                <Button
                  variant="outline"
                  iconPosition="right"
                  icon={<ChevronDown class="w-4 h-4" />}
                >
                  Dropdown
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Form Components Section */}
      <section class="space-y-6">
        <h3 class="text-2xl font-bold text-foreground flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <User class="w-4 h-4" />
          </div>
          Form Components
        </h3>

        <div class="grid md:grid-cols-2 gap-6">
          {/* Inputs */}
          <Card variant="outlined" class="p-6 space-y-4">
            <h4 class="text-lg font-semibold">Inputs & Fields</h4>

            <div class="space-y-3">
              <div>
                <Label for="basic-input">Basic Input</Label>
                <Input
                  id="basic-input"
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

              <div>
                <Label for="textarea">Textarea</Label>
                <Textarea
                  id="textarea"
                  placeholder="Enter multiple lines..."
                  value={textareaValue()}
                  onInput={(e) => setTextareaValue(e.currentTarget.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label for="select">Select Dropdown</Label>
                <Select
                  id="select"
                  placeholder="Choose an option..."
                  options={sampleOptions}
                  value={selectValue()}
                  onChange={setSelectValue}
                />
              </div>
            </div>
          </Card>

          {/* Selection Controls */}
          <Card variant="outlined" class="p-6 space-y-4">
            <h4 class="text-lg font-semibold">Selection Controls</h4>

            <div class="space-y-4">
              <div>
                <Label for="switch">Switch</Label>
                <Switch
                  id="switch"
                  checked={switchValue()}
                  onChange={setSwitchValue}
                  label="Enable notifications"
                />
              </div>

              <div>
                <Label>Toggle Group</Label>
                <ToggleGroup
                  value={toggleValue()}
                  onChange={setToggleValue}
                  options={[
                    { value: 'left', label: 'Left' },
                    { value: 'center', label: 'Center' },
                    { value: 'right', label: 'Right' },
                  ]}
                />
              </div>

              <div>
                <Label>Checkboxes</Label>
                <div class="space-y-2">
                  <For each={sampleOptions}>
                    {(option) => (
                      <Checkbox
                        value={checkboxValues().includes(option.value)}
                        onChange={(checked) => handleCheckboxChange(option.value, checked)}
                        label={option.label}
                      />
                    )}
                  </For>
                </div>
              </div>

              <div>
                <Label>Radio Buttons</Label>
                <RadioGroup
                  value={radioValue()}
                  onChange={setRadioValue}
                  options={sampleOptions}
                />
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Data Display Section */}
      <section class="space-y-6">
        <h3 class="text-2xl font-bold text-foreground flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <Info class="w-4 h-4" />
          </div>
          Data Display
        </h3>

        <div class="space-y-6">
          {/* Table */}
          <Card variant="outlined" class="p-6">
            <h4 class="text-lg font-semibold mb-4">Table</h4>
            <div class="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead class="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <For each={tableData}>
                    {(row) => (
                      <TableRow>
                        <TableCell class="font-medium">{row.name}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>
                          <Badge variant={row.role === 'Admin' ? 'default' : 'secondary'}>
                            {row.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'Active' ? 'default' : 'destructive'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell class="text-right">
                          <div class="flex gap-2 justify-end">
                            <Button variant="ghost" size="icon">
                              <Settings class="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 class="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </For>
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Alerts & Badges */}
          <div class="grid md:grid-cols-2 gap-6">
            <Card variant="outlined" class="p-6">
              <h4 class="text-lg font-semibold mb-4">Alerts</h4>
              <div class="space-y-3">
                <Alert variant="default" icon={<Info class="w-4 h-4" />}>
                  This is an informational alert message.
                </Alert>
                <Alert variant="warning" icon={<AlertTriangle class="w-4 h-4" />}>
                  This is a warning alert message.
                </Alert>
                <Alert variant="destructive" icon={<X class="w-4 h-4" />} dismissible>
                  This is a destructive alert message.
                </Alert>
              </div>
            </Card>

            <Card variant="outlined" class="p-6">
              <h4 class="text-lg font-semibold mb-4">Badges</h4>
              <div class="space-y-3">
                <div class="flex flex-wrap gap-2">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
                <div class="flex flex-wrap gap-2">
                  <Badge icon={<Check class="w-3 h-3" />}>Success</Badge>
                  <Badge icon={<AlertTriangle class="w-3 h-3" />}>Warning</Badge>
                  <Badge icon={<Info class="w-3 h-3" />}>Info</Badge>
                  <Badge icon={<X class="w-3 h-3" />}>Error</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Loading States Section */}
      <section class="space-y-6">
        <h3 class="text-2xl font-bold text-foreground flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <Loader2 class="w-4 h-4" />
          </div>
          Loading States
        </h3>

        <div class="grid md:grid-cols-2 gap-6">
          <Card variant="outlined" class="p-6">
            <h4 class="text-lg font-semibold mb-4">Skeleton Loaders</h4>
            <div class="space-y-4">
              <div class="space-y-2">
                <Skeleton variant="text" class="w-3/4" />
                <Skeleton variant="text" class="w-1/2" />
                <Skeleton variant="text" class="w-2/3" />
              </div>
              <div class="flex items-center gap-3">
                <Skeleton variant="circular" class="w-10 h-10" />
                <div class="flex-1 space-y-2">
                  <Skeleton variant="text" class="w-1/3" />
                  <Skeleton variant="text" class="w-2/3" />
                </div>
              </div>
            </div>
          </Card>

          <Card variant="outlined" class="p-6">
            <h4 class="text-lg font-semibold mb-4">Card Skeleton</h4>
            <SkeletonCard />
          </Card>
        </div>
      </section>

      {/* Navigation Components Section */}
      <section class="space-y-6">
        <h3 class="text-2xl font-bold text-foreground flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <Search class="w-4 h-4" />
          </div>
          Navigation
        </h3>

        <Card variant="outlined" class="p-6">
          <h4 class="text-lg font-semibold mb-4">Dropdown Menu</h4>
          <div class="flex gap-4">
            <Dropdown trigger={
              <Button variant="outline" icon={<ChevronDown class="w-4 h-4" />} iconPosition="right">
                Menu
              </Button>
            }>
              <For each={dropdownItems}>
                {(item) => (
                  <Show when={item.type === 'separator'} fallback={
                    <Dropdown.Item
                      {...item}
                      variant={item.variant}
                      icon={item.icon && <item.icon class="w-4 h-4" />}
                    />
                  }>
                    <Dropdown.Separator />
                  </Show>
                )}
              </For>
            </Dropdown>

            <Button variant="outline" icon={<Upload class="w-4 h-4" />}>
              Upload
            </Button>

            <Button variant="outline" icon={<Bookmark class="w-4 h-4" />}>
              Save
            </Button>
          </div>
        </Card>
      </section>

      {/* Card Variants Section */}
      <section class="space-y-6">
        <h3 class="text-2xl font-bold text-foreground flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <Star class="w-4 h-4" />
          </div>
          Card Components
        </h3>

        <div class="grid md:grid-cols-3 gap-6">
          <Card variant="default" hover="lift">
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-muted-foreground">
                This is a default card with hover lift effect. Perfect for general content display.
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" shadow="lg" hover="glow">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-muted-foreground">
                This is an elevated card with glow hover effect. Great for highlighting important content.
              </p>
            </CardContent>
          </Card>

          <Card variant="outlined" hover="scale">
            <CardHeader>
              <CardTitle>Outlined Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-muted-foreground">
                This is an outlined card with scale hover effect. Ideal for interactive elements.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Call to Action */}
      <section class="text-center space-y-6">
        <div class="relative rounded-3xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-12">
          <h3 class="text-3xl font-bold mb-4">Ready to Use These Components?</h3>
          <p class="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto">
            All these components are ready to use in your applications. They're built with accessibility,
            performance, and developer experience in mind.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" icon={<Star class="w-5 h-5" />}>
              View Documentation
            </Button>
            <Button variant="outline" size="lg" icon={<Download class="w-5 h-5" />}>
              Get Started
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}