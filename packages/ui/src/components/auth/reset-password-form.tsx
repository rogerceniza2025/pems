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
import { Alert } from '../ui/alert'

export interface ResetPasswordFormProps {
  token?: string
  email?: string
  onSubmit?: (data: {
    token: string
    newPassword: string
    confirmPassword: string
  }) => Promise<void>
  onSignIn?: () => void
  loading?: boolean
  error?: string
}

export const ResetPasswordForm = (props: ResetPasswordFormProps) => {
  const [newPassword, setNewPassword] = createSignal('')
  const [confirmPassword, setConfirmPassword] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(false)
  const [error, setError] = createSignal('')
  const [showPassword, setShowPassword] = createSignal(false)

  const validateForm = () => {
    if (!newPassword() || !confirmPassword()) {
      setError('Please fill in all fields')
      return false
    }

    if (newPassword().length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }

    // Enhanced password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(newPassword())) {
      setError('Password must contain at least one lowercase letter, one uppercase letter, and one number')
      return false
    }

    if (newPassword() !== confirmPassword()) {
      setError('Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!props.token) {
      setError('Invalid or missing reset token')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await props.onSubmit?.({
        token: props.token,
        newPassword: newPassword(),
        confirmPassword: confirmPassword(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card class="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>
          Enter your new password below
        </CardDescription>
        <Show when={props.email}>
          <p class="text-sm text-muted-foreground">
            For: {props.email}
          </p>
        </Show>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} class="space-y-4">
          <div class="space-y-2">
            <Label for="newPassword">New Password</Label>
            <div class="relative">
              <Input
                id="newPassword"
                type={showPassword() ? 'text' : 'password'}
                placeholder="Enter your new password"
                value={newPassword()}
                onInput={(e) => setNewPassword(e.currentTarget.value)}
                required
                disabled={isLoading() || props.loading}
                autocomplete="new-password"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword())}
                disabled={isLoading() || props.loading}
              >
                {showPassword() ? (
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                    />
                  </svg>
                ) : (
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            <div class="text-xs text-muted-foreground">
              Password must be at least 8 characters with uppercase, lowercase, and numbers
            </div>
          </div>

          <div class="space-y-2">
            <Label for="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your new password"
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
            {isLoading() || props.loading ? 'Resetting password...' : 'Reset Password'}
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
      </CardContent>
    </Card>
  )
}