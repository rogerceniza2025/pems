import { createSignal, Show, createEffect } from 'solid-js'
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

export interface ForgotPasswordFormProps {
  onSubmit?: (data: { email: string; tenantId: string }) => Promise<void>
  onSignIn?: () => void
  loading?: boolean
  error?: string
  success?: boolean
  tenants?: Tenant[]
  selectedTenant?: string
}

export const ForgotPasswordForm = (props: ForgotPasswordFormProps) => {
  const [email, setEmail] = createSignal('')
  const [tenantId, setTenantId] = createSignal(props.selectedTenant ?? '')

  // Track selectedTenant prop changes
  createEffect(() => {
    if (props.selectedTenant !== undefined) {
      setTenantId(props.selectedTenant)
    }
  })
  const [isLoading, setIsLoading] = createSignal(false)
  const [error, setError] = createSignal('')

  const validateForm = () => {
    if (!email() || !tenantId()) {
      setError('Please fill in all fields')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email())) {
      setError('Please enter a valid email address')
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
        tenantId: tenantId(),
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to send reset email',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card class="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your
          password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Show when={!props.success}>
          <form onSubmit={handleSubmit} class="space-y-4">
            <div class="space-y-2">
              <Label for="tenant">Organization</Label>
              <Select
                id="tenant"
                placeholder="Select your organization"
                value={tenantId()}
                onChange={setTenantId}
                disabled={isLoading() || props.loading}
                options={
                  props.tenants?.map((tenant) => ({
                    value: tenant.id,
                    label: tenant.name,
                  })) ?? []
                }
              />
            </div>

            <div class="space-y-2">
              <Label for="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                required
                disabled={isLoading() || props.loading}
                autocomplete="email"
              />
            </div>

            <Show when={error() ?? props.error}>
              <Alert variant="destructive">{error() ?? props.error}</Alert>
            </Show>

            <Button
              type="submit"
              class="w-full"
              disabled={isLoading() || props.loading}
            >
              {isLoading() || props.loading
                ? 'Sending reset link...'
                : 'Send Reset Link'}
            </Button>

            <div class="text-center">
              <button
                type="button"
                class="text-primary hover:underline text-sm"
                onClick={() => props.onSignIn?.()}
                disabled={isLoading() || props.loading}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        </Show>

        <Show when={props.success}>
          <div class="text-center space-y-4">
            <div class="text-green-600">
              <svg
                class="w-16 h-16 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 class="text-lg font-medium">Check Your Email</h3>
            </div>

            <p class="text-muted-foreground">
              We've sent a password reset link to {email()}. Please check your
              email and follow the instructions to reset your password.
            </p>

            <Button
              variant="outline"
              class="w-full"
              onClick={() => props.onSignIn?.()}
            >
              Back to Sign In
            </Button>
          </div>
        </Show>
      </CardContent>
    </Card>
  )
}
