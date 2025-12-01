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

export interface RegisterFormProps {
  onSubmit?: (data: {
    email: string
    password: string
    confirmPassword: string
    firstName: string
    lastName: string
  }) => Promise<void>
  onSignIn?: () => void
  loading?: boolean
  error?: string
}

export const RegisterForm = (props: RegisterFormProps) => {
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [confirmPassword, setConfirmPassword] = createSignal('')
  const [firstName, setFirstName] = createSignal('')
  const [lastName, setLastName] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(false)
  const [error, setError] = createSignal('')

  const validateForm = () => {
    if (
      !email() ||
      !password() ||
      !confirmPassword() ||
      !firstName() ||
      !lastName()
    ) {
      setError('Please fill in all fields')
      return false
    }

    if (password().length < 8) {
      setError('Password must be at least 8 characters long')
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
        firstName: firstName(),
        lastName: lastName(),
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
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                value={firstName()}
                onInput={(e) => setFirstName(e.currentTarget.value)}
                required
                disabled={isLoading() || props.loading}
              />
            </div>

            <div class="space-y-2">
              <Label for="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={lastName()}
                onInput={(e) => setLastName(e.currentTarget.value)}
                required
                disabled={isLoading() || props.loading}
              />
            </div>
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
            />
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
            />
          </div>

          <Show when={error() || props.error}>
            <div class="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error() || props.error}
            </div>
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
