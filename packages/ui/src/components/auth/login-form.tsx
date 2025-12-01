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

export interface LoginFormProps {
  onSubmit?: (email: string, password: string) => Promise<void>
  onForgotPassword?: () => void
  onSignUp?: () => void
  loading?: boolean
  error?: string
}

export const LoginForm = (props: LoginFormProps) => {
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(false)
  const [error, setError] = createSignal('')

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    if (!email() || !password()) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await props.onSubmit?.(email(), password())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card class="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} class="space-y-4">
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
            {isLoading() || props.loading ? 'Signing in...' : 'Sign In'}
          </Button>

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
        </form>
      </CardContent>
    </Card>
  )
}
