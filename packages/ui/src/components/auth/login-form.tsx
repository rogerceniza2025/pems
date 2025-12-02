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

export interface LoginFormProps {
  onSubmit?: (data: {
    email: string
    password: string
    tenantId: string
    mfaCode?: string
  }) => Promise<void>
  onForgotPassword?: () => void
  onSignUp?: () => void
  loading?: boolean
  error?: string
  tenants?: Tenant[]
  selectedTenant?: string
  requiresMFA?: boolean
  onMFARequired?: (userId: string) => void
}

export const LoginForm = (props: LoginFormProps) => {
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [tenantId, setTenantId] = createSignal(props.selectedTenant || '')
  const [mfaCode, setMfaCode] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(false)
  const [error, setError] = createSignal('')

  const validateForm = () => {
    if (!email() || !password() || !tenantId()) {
      setError('Please fill in all fields')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email())) {
      setError('Please enter a valid email address')
      return false
    }

    if (props.requiresMFA && !mfaCode()) {
      setError('Please enter your MFA code')
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
        tenantId: tenantId(),
        mfaCode: props.requiresMFA ? mfaCode() : undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card class="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {props.requiresMFA ? 'Verify MFA Code' : 'Sign In'}
        </CardTitle>
        <CardDescription>
          {props.requiresMFA
            ? 'Enter your multi-factor authentication code to continue'
            : 'Enter your credentials to access your account'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} class="space-y-4">
          <Show when={!props.requiresMFA}>
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
                autocomplete="current-password"
              />
            </div>
          </Show>

          <Show when={props.requiresMFA}>
            <div class="space-y-2">
              <Label for="mfaCode">MFA Code</Label>
              <Input
                id="mfaCode"
                type="text"
                placeholder="Enter 6-digit code"
                value={mfaCode()}
                onInput={(e) => {
                  const value = e.currentTarget.value.replace(/\D/g, '').slice(0, 6)
                  setMfaCode(value)
                }}
                maxLength={6}
                pattern="[0-9]{6}"
                required
                disabled={isLoading() || props.loading}
                autocomplete="one-time-code"
              />
            </div>
          </Show>

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
              ? (props.requiresMFA ? 'Verifying...' : 'Signing in...')
              : (props.requiresMFA ? 'Verify Code' : 'Sign In')
            }
          </Button>

          <Show when={!props.requiresMFA}>
            <div class="flex flex-col space-y-2 text-sm">
              <button
                type="button"
                class="text-primary hover:underline"
                onClick={() => props.onForgotPassword?.()}
                disabled={isLoading() || props.loading}
              >
                Forgot your password?
              </button>

              <button
                type="button"
                class="text-primary hover:underline"
                onClick={() => props.onSignUp?.()}
                disabled={isLoading() || props.loading}
              >
                Don't have an account? Sign up
              </button>
            </div>
          </Show>
        </form>
      </CardContent>
    </Card>
  )
}
