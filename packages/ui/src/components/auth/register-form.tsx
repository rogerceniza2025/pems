import { createSignal, Show } from 'solid-js'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card'
import { Select } from '../ui/select'
import { Alert } from '../ui/alert'

export interface Tenant {
  id: string
  name: string
  slug: string
}

export interface RegisterFormProps {
  onSubmit?: (data: {
    email: string
    password: string
    confirmPassword: string
    name: string
    tenantId: string
    phone?: string
  }) => Promise<void>
  onSignIn?: () => void
  loading?: boolean
  error?: string
  tenants?: Tenant[]
  selectedTenant?: string
}

export const RegisterForm = (props: RegisterFormProps) => {
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [confirmPassword, setConfirmPassword] = createSignal('')
  const [name, setName] = createSignal('')
  const [tenantId, setTenantId] = createSignal(props.selectedTenant || '')
  const [phone, setPhone] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(false)
  const [error, setError] = createSignal('')

  const validateForm = () => {
    if (!email() || !password() || !confirmPassword() || !name() || !tenantId()) {
      setError('Please fill in all required fields')
      return false
    }

    if (password().length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }

    // Enhanced password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(password())) {
      setError('Password must contain at least one lowercase letter, one uppercase letter, and one number')
      return false
    }

    if (password() !== confirmPassword()) {
      setError('Passwords do not match')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email())) {
      setError('Please enter a valid email address')
      return false
    }

    if (name().length < 2) {
      setError('Name must be at least 2 characters long')
      return false
    }

    return true
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await props.onSubmit?.({
        email: email(),
        password: password(),
        confirmPassword: confirmPassword(),
        name: name(),
        tenantId: tenantId(),
        phone: phone() || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card class="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>
          Enter your information to create a new account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} class="space-y-4">
          <div class="space-y-2">
            <Label for="tenant">Organization</Label>
            <Select
              id="tenant"
              placeholder="Select your organization"
              value={tenantId()}
              onChange={setTenantId}
              disabled={isLoading() || props.loading}
              options={props.tenants?.map(tenant => ({
                value: tenant.id,
                label: tenant.name
              })) || []}
            />
          </div>

          <div class="space-y-2">
            <Label for="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              required
              disabled={isLoading() || props.loading}
              autocomplete="name"
            />
          </div>

          <div class="space-y-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@example.com"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              required
              disabled={isLoading() || props.loading}
              autocomplete="email"
            />
          </div>

          <div class="space-y-2">
            <Label for="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone()}
              onInput={(e) => setPhone(e.currentTarget.value)}
              disabled={isLoading() || props.loading}
              autocomplete="tel"
            />
          </div>

          <div class="space-y-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              required
              disabled={isLoading() || props.loading}
              autocomplete="new-password"
            />
            <div class="text-xs text-muted-foreground">
              Password must be at least 8 characters with uppercase, lowercase, and numbers
            </div>
          </div>

          <div class="space-y-2">
            <Label for="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword()}
              onInput={(e) => setConfirmPassword(e.currentTarget.value)}
              required
              disabled={isLoading() || props.loading}
              autocomplete="new-password"
            />
          </div>

          <Show when={error() || props.error}>
            <Alert variant="destructive">
              {error() || props.error}
            </Alert>
          </Show>

          <Button
            type="submit"
            class="w-full"
            disabled={isLoading() || props.loading}
          >
            {isLoading() || props.loading
              ? 'Creating account...'
              : 'Create Account'}
          </Button>

          <div class="text-sm text-center">
            <button
              type="button"
              class="text-primary hover:underline"
              onClick={() => props.onSignIn?.()}
              disabled={isLoading() || props.loading}
            >
              Already have an account? Sign in
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
