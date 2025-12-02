import { createSignal, Show, For } from 'solid-js'
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

export interface MFAResponse {
  success: boolean
  secret?: string
  qrCode?: string
  backupCodes?: string[]
  error?: string
}

export interface MFASetupFormProps {
  email: string
  onSubmit?: (code: string) => Promise<void>
  onSetup?: () => Promise<MFAResponse>
  onDisable?: () => Promise<void>
  onBack?: () => void
  loading?: boolean
  error?: string
  isEnabled?: boolean
}

export const MFASetupForm = (props: MFASetupFormProps) => {
  const [code, setCode] = createSignal('')
  const [mfaData, setMfaData] = createSignal<MFAResponse | null>(null)
  const [isSetup, setIsSetup] = createSignal(false)
  const [isLoading, setIsLoading] = createSignal(false)
  const [error, setError] = createSignal('')

  const handleSetup = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await props.onSetup?.()
      if (response) {
        setMfaData(response)
        if (response.success) {
          setIsSetup(true)
        } else {
          setError(response.error || 'Failed to setup MFA')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA setup failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!code()) {
      setError('Please enter the verification code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await props.onSubmit?.(code())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication?')) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await props.onDisable?.()
      setIsSetup(false)
      setMfaData(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable MFA')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeInput = (e: Event) => {
    const value = (e.currentTarget as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
  }

  return (
    <Card class="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {props.isEnabled ? 'Two-Factor Authentication' : 'Setup 2FA'}
        </CardTitle>
        <CardDescription>
          {props.isEnabled
            ? 'Manage your two-factor authentication settings'
            : isSetup()
            ? 'Scan the QR code with your authenticator app'
            : 'Enhance your account security with two-factor authentication'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Show when={props.isEnabled && !isSetup()}>
          <div class="space-y-4">
            <Alert>
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <span class="ml-2">Two-factor authentication is currently enabled</span>
            </Alert>

            <div class="text-sm text-muted-foreground">
              Your account is protected by two-factor authentication. You can disable it below, but this will make your account less secure.
            </div>

            <Button
              variant="destructive"
              class="w-full"
              onClick={handleDisable}
              disabled={isLoading() || props.loading}
            >
              {isLoading() ? 'Disabling...' : 'Disable 2FA'}
            </Button>

            <Button
              variant="outline"
              class="w-full"
              onClick={props.onBack}
            >
              Back
            </Button>
          </div>
        </Show>

        <Show when={!props.isEnabled && !isSetup()}>
          <div class="space-y-4">
            <div class="text-sm text-muted-foreground">
              Two-factor authentication adds an extra layer of security to your account by requiring a verification code in addition to your password.
            </div>

            <Show when={error() || props.error}>
              <Alert variant="destructive">
                {error() || props.error}
              </Alert>
            </Show>

            <Button
              class="w-full"
              onClick={handleSetup}
              disabled={isLoading() || props.loading}
            >
              {isLoading() ? 'Setting up...' : 'Setup 2FA'}
            </Button>

            <Button
              variant="outline"
              class="w-full"
              onClick={props.onBack}
            >
              Back
            </Button>
          </div>
        </Show>

        <Show when={isSetup() && mfaData()}>
          <div class="space-y-4">
            <Show when={mfaData()?.qrCode}>
              <div class="text-center">
                <div class="mb-4">
                  <img
                    src={mfaData()?.qrCode}
                    alt="QR Code"
                    class="mx-auto"
                  />
                </div>
                <p class="text-sm text-muted-foreground mb-2">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <Show when={mfaData()?.secret}>
                  <details class="text-left">
                    <summary class="cursor-pointer text-sm font-medium">Can't scan? Enter manually</summary>
                    <code class="block mt-2 p-2 bg-muted rounded text-xs break-all">
                      {mfaData()?.secret}
                    </code>
                  </details>
                </Show>
              </div>
            </Show>

            <Show when={mfaData()?.backupCodes}>
              <div class="bg-yellow-50 p-4 rounded-md">
                <h4 class="font-medium text-sm mb-2">Backup Codes</h4>
                <p class="text-xs text-muted-foreground mb-2">
                  Save these backup codes in a safe place. You can use them to access your account if you lose access to your authenticator device.
                </p>
                <div class="grid grid-cols-2 gap-1 text-xs font-mono">
                  <For each={mfaData()?.backupCodes || []}>
                    {(code) => (
                      <div class="p-1 bg-white rounded border">
                        {code}
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <div class="space-y-2">
              <Label for="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                type="text"
                placeholder="Enter 6-digit code"
                value={code()}
                onInput={handleCodeInput}
                maxLength={6}
                pattern="[0-9]{6}"
                required
                disabled={isLoading() || props.loading}
                autocomplete="one-time-code"
              />
            </div>

            <Show when={error() || props.error}>
              <Alert variant="destructive">
                {error() || props.error}
              </Alert>
            </Show>

            <Button
              class="w-full"
              onClick={handleVerify}
              disabled={isLoading() || props.loading || !code()}
            >
              {isLoading() ? 'Verifying...' : 'Verify and Enable 2FA'}
            </Button>

            <Button
              variant="outline"
              class="w-full"
              onClick={props.onBack}
            >
              Cancel
            </Button>
          </div>
        </Show>
      </CardContent>
    </Card>
  )
}