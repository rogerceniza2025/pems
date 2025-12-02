# UI Components Implementation Guide

## Overview

This document provides detailed implementation guidance for authentication UI components using SolidJS and Tailwind CSS in the PEMS system.

## 1. Component Structure

### Directory Structure

```
packages/ui/src/components/
├── auth/
│   ├── login-form.tsx
│   ├── register-form.tsx
│   ├── mfa-setup-form.tsx
│   ├── mfa-verify-form.tsx
│   ├── forgot-password-form.tsx
│   ├── reset-password-form.tsx
│   ├── magic-link-form.tsx
│   ├── change-password-form.tsx
│   └── profile-form.tsx
└── shared/
    ├── ui/
    │   ├── button.tsx
    │   ├── input.tsx
    │   ├── label.tsx
    │   ├── alert.tsx
    │   └── loading-spinner.tsx
    └── hooks/
        ├── use-auth.ts
        ├── use-form-validation.ts
        └── use-rate-limit.ts
```

## 2. Login Form Component

### File: `packages/ui/src/components/auth/login-form.tsx`

```typescript
import { createSignal, createEffect, onMount } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { z } from 'zod'
import { Button } from '../shared/ui/button'
import { Input } from '../shared/ui/input'
import { Label } from '../shared/ui/label'
import { Alert } from '../shared/ui/alert'
import { LoadingSpinner } from '../shared/ui/loading-spinner'
import { useFormValidation } from '../shared/hooks/use-form-validation'
import { useRateLimit } from '../shared/hooks/use-rate-limit'

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  tenantId: z.string().uuid('Invalid tenant ID').optional(),
  rememberMe: z.boolean().default(false),
})

export interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => Promise<LoginResult>
  onForgotPassword?: () => void
  onSignUp?: () => void
  onMfaRequired?: (user: any, methods: string[]) => void
  loading?: boolean
  error?: string
  tenantId?: string
}

export interface LoginFormData {
  email: string
  password: string
  tenantId?: string
  rememberMe?: boolean
}

export interface LoginResult {
  success: boolean
  user?: any
  session?: string
  requiresMfa?: boolean
  mfaMethods?: string[]
  error?: string
}

export const LoginForm = (props: LoginFormProps) => {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = createSignal(false)
  const [rateLimit, setRateLimit] = createSignal<{ attempts: number; resetTime?: number }>({ attempts: 0 })

  const {
    values,
    errors,
    touched,
    isValid,
    handleSubmit,
    setFieldValue,
    setTouched
  } = useFormValidation(LoginSchema, {
    initialValues: {
      email: '',
      password: '',
      tenantId: props.tenantId || '',
      rememberMe: false,
    },
    onSubmit: async (data) => {
      if (!props.onSubmit) return false

      const result = await props.onSubmit(data)

      if (result.requiresMfa && props.onMfaRequired) {
        props.onMfaRequired(result.user!, result.mfaMethods || [])
        return false
      }

      if (result.success) {
        navigate('/dashboard')
        return true
      }

      return false
    }
  })

  // Rate limiting hook
  const { isRateLimited, timeRemaining } = useRateLimit('login', {
    maxAttempts: 5,
    windowMinutes: 15,
    onRateLimitExceeded: (info) => {
      setRateLimit(info)
    }
  })

  return (
    <div class="w-full max-w-md mx-auto">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-center mb-6">Sign In</h2>

        {/* Rate Limit Alert */}
        {isRateLimited() && (
          <Alert variant="error" class="mb-4">
            <div class="font-semibold">Too Many Attempts</div>
            <div class="text-sm mt-1">
              Please try again in {Math.ceil(timeRemaining() / 60)} minutes.
            </div>
          </Alert>
        )}

        {/* General Error */}
        {props.error && !isRateLimited() && (
          <Alert variant="error" class="mb-4">
            {props.error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} class="space-y-4">
          {/* Email Field */}
          <div class="space-y-2">
            <Label for="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={values().email}
              error={touched().email ? errors().email : undefined}
              onInput={(e) => setFieldValue('email', e.currentTarget.value)}
              onBlur={() => setTouched('email', true)}
              disabled={props.loading || isRateLimited()}
              autocomplete="email"
              required
            />
          </div>

          {/* Password Field */}
          <div class="space-y-2">
            <Label for="password">Password</Label>
            <div class="relative">
              <Input
                id="password"
                type={showPassword() ? 'text' : 'password'}
                placeholder="Enter your password"
                value={values().password}
                error={touched().password ? errors().password : undefined}
                onInput={(e) => setFieldValue('password', e.currentTarget.value)}
                onBlur={() => setTouched('password', true)}
                disabled={props.loading || isRateLimited()}
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword())}
                disabled={props.loading || isRateLimited()}
              >
                {showPassword() ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Tenant ID Field (if not pre-filled) */}
          {!props.tenantId && (
            <div class="space-y-2">
              <Label for="tenantId">Tenant ID (Optional)</Label>
              <Input
                id="tenantId"
                type="text"
                placeholder="Enter your tenant ID"
                value={values().tenantId || ''}
                error={touched().tenantId ? errors().tenantId : undefined}
                onInput={(e) => setFieldValue('tenantId', e.currentTarget.value)}
                onBlur={() => setTouched('tenantId', true)}
                disabled={props.loading || isRateLimited()}
              />
            </div>
          )}

          {/* Remember Me */}
          <div class="flex items-center">
            <input
              id="rememberMe"
              type="checkbox"
              checked={values().rememberMe}
              onChange={(e) => setFieldValue('rememberMe', e.currentTarget.checked)}
              disabled={props.loading || isRateLimited()}
              class="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <Label for="rememberMe" class="ml-2 text-sm text-gray-700">
              Remember me
            </Label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isValid() || props.loading || isRateLimited()}
            loading={props.loading}
            class="w-full"
          >
            {props.loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        {/* Footer Links */}
        <div class="mt-6 text-center space-y-2">
          {props.onForgotPassword && (
            <button
              type="button"
              onClick={props.onForgotPassword}
              class="text-sm text-blue-600 hover:text-blue-500"
              disabled={props.loading || isRateLimited()}
            >
              Forgot your password?
            </button>
          )}

          {props.onSignUp && (
            <button
              type="button"
              onClick={props.onSignUp}
              class="text-sm text-blue-600 hover:text-blue-500"
              disabled={props.loading || isRateLimited()}
            >
              Don't have an account? Sign up
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

## 3. MFA Setup Form Component

### File: `packages/ui/src/components/auth/mfa-setup-form.tsx`

```typescript
import { createSignal, createEffect, onMount } from 'solid-js'
import { Button } from '../shared/ui/button'
import { Input } from '../shared/ui/input'
import { Label } from '../shared/ui/label'
import { Alert } from '../shared/ui/alert'
import { LoadingSpinner } from '../shared/ui/loading-spinner'

export interface MfaSetupFormProps {
  secret: string
  qrCode: string
  backupCodes: string[]
  onSubmit?: (code: string) => Promise<boolean>
  onCancel?: () => void
  loading?: boolean
  error?: string
}

export const MfaSetupForm = (props: MfaSetupFormProps) => {
  const [code, setCode] = createSignal('')
  const [showBackupCodes, setShowBackupCodes] = createSignal(false)
  const [copiedSecret, setCopiedSecret] = createSignal(false)
  const [copiedCodes, setCopiedCodes] = createSignal(false)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    if (!props.onSubmit) return

    const success = await props.onSubmit(code())

    if (success) {
      // Navigate or show success message
    }
  }

  const copyToClipboard = async (text: string, successCallback: () => void) => {
    try {
      await navigator.clipboard.writeText(text)
      successCallback()
      setTimeout(() => successCallback(), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  return (
    <div class="w-full max-w-md mx-auto">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-center mb-6">Set Up Multi-Factor Authentication</h2>

        {/* Error */}
        {props.error && (
          <Alert variant="error" class="mb-4">
            {props.error}
          </Alert>
        )}

        <div class="space-y-6">
          {/* Step 1: Scan QR Code */}
          <div class="text-center">
            <h3 class="text-lg font-semibold mb-3">Step 1: Scan QR Code</h3>
            <p class="text-gray-600 mb-4">
              Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
            </p>

            <div class="flex justify-center mb-4">
              <img
                src={props.qrCode}
                alt="MFA QR Code"
                class="border-2 border-gray-200 rounded-lg"
              />
            </div>

            <p class="text-sm text-gray-500">
              Can't scan? Enter this code manually:
            </p>
          </div>

          {/* Step 2: Manual Entry */}
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-lg font-semibold">Manual Entry Code</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(props.secret, () => setCopiedSecret(true))}
                class="flex items-center gap-2"
              >
                {copiedSecret() ? 'Copied!' : 'Copy'}
              </Button>
            </div>

            <div class="font-mono text-lg bg-white p-3 rounded border break-all">
              {props.secret}
            </div>
          </div>

          {/* Step 3: Verify Setup */}
          <div>
            <h3 class="text-lg font-semibold mb-3">Step 3: Verify Setup</h3>
            <p class="text-gray-600 mb-4">
              Enter the 6-digit code from your authenticator app:
            </p>

            <form onSubmit={handleSubmit} class="space-y-4">
              <div class="space-y-2">
                <Label for="code">Authentication Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={code()}
                  onInput={(e) => setCode(e.currentTarget.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  pattern="[0-9]*"
                  disabled={props.loading}
                  autocomplete="one-time-code"
                  required
                  class="text-center text-lg tracking-widest"
                />
              </div>

              <div class="flex gap-3">
                <Button
                  type="submit"
                  disabled={code().length !== 6 || props.loading}
                  loading={props.loading}
                  class="flex-1"
                >
                  {props.loading ? 'Verifying...' : 'Verify and Enable'}
                </Button>

                {props.onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={props.onCancel}
                    disabled={props.loading}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Step 4: Backup Codes */}
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-lg font-semibold">Step 4: Save Backup Codes</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBackupCodes(!showBackupCodes())}
                class="flex items-center gap-2"
              >
                {showBackupCodes() ? 'Hide' : 'Show'} Codes
              </Button>
            </div>

            <p class="text-yellow-800 text-sm mb-3">
              Save these backup codes in a secure location. You can use them if you lose access to your authenticator app.
            </p>

            {showBackupCodes() && (
              <div class="grid grid-cols-2 gap-2 mb-3">
                {props.backupCodes.map((backupCode, index) => (
                  <div
                    key={index}
                    class="font-mono bg-white p-2 rounded border text-center"
                  >
                    {backupCode}
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(
                props.backupCodes.join('\n'),
                () => setCopiedCodes(true)
              )}
              class="w-full"
            >
              {copiedCodes() ? 'Copied!' : 'Copy All Codes'}
            </Button>
          </div>
        </div>

        {/* Important Notice */}
        <Alert variant="warning" class="mt-6">
          <div class="font-semibold mb-2">Important:</div>
          <ul class="text-sm space-y-1 list-disc list-inside">
            <li>Save your backup codes in a secure, offline location</li>
            <li>Each backup code can only be used once</li>
            <li>Keep your backup codes confidential</li>
            <li>Test your backup codes before you need them</li>
          </ul>
        </Alert>
      </div>
    </div>
  )
}
```

## 4. Password Reset Form Component

### File: `packages/ui/src/components/auth/forgot-password-form.tsx`

```typescript
import { createSignal, createEffect } from 'solid-js'
import { z } from 'zod'
import { Button } from '../shared/ui/button'
import { Input } from '../shared/ui/input'
import { Label } from '../shared/ui/label'
import { Alert } from '../shared/ui/alert'
import { useFormValidation } from '../shared/hooks/use-form-validation'

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  tenantId: z.string().uuid('Invalid tenant ID'),
})

export interface ForgotPasswordFormProps {
  onSubmit?: (data: ForgotPasswordData) => Promise<void>
  onBackToLogin?: () => void
  loading?: boolean
  error?: string
  success?: string
  tenantId?: string
}

export interface ForgotPasswordData {
  email: string
  tenantId: string
}

export const ForgotPasswordForm = (props: ForgotPasswordFormProps) => {
  const {
    values,
    errors,
    touched,
    isValid,
    handleSubmit,
    setFieldValue,
    setTouched
  } = useFormValidation(ForgotPasswordSchema, {
    initialValues: {
      email: '',
      tenantId: props.tenantId || '',
    },
    onSubmit: async (data) => {
      if (!props.onSubmit) return
      await props.onSubmit(data)
      return true
    }
  })

  return (
    <div class="w-full max-w-md mx-auto">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-center mb-6">Reset Password</h2>

        {/* Success Message */}
        {props.success && (
          <Alert variant="success" class="mb-4">
            {props.success}
          </Alert>
        )}

        {/* Error */}
        {props.error && !props.success && (
          <Alert variant="error" class="mb-4">
            {props.error}
          </Alert>
        )}

        {!props.success ? (
          <form onSubmit={handleSubmit} class="space-y-4">
            <p class="text-gray-600 mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {/* Email Field */}
            <div class="space-y-2">
              <Label for="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={values().email}
                error={touched().email ? errors().email : undefined}
                onInput={(e) => setFieldValue('email', e.currentTarget.value)}
                onBlur={() => setTouched('email', true)}
                disabled={props.loading}
                autocomplete="email"
                required
              />
            </div>

            {/* Tenant ID Field */}
            {!props.tenantId && (
              <div class="space-y-2">
                <Label for="tenantId">Tenant ID</Label>
                <Input
                  id="tenantId"
                  type="text"
                  placeholder="Enter your tenant ID"
                  value={values().tenantId || ''}
                  error={touched().tenantId ? errors().tenantId : undefined}
                  onInput={(e) => setFieldValue('tenantId', e.currentTarget.value)}
                  onBlur={() => setTouched('tenantId', true)}
                  disabled={props.loading}
                />
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!isValid() || props.loading}
              loading={props.loading}
              class="w-full"
            >
              {props.loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        ) : (
          <div class="text-center">
            <p class="text-gray-600 mb-4">
              If an account with that email exists, a password reset link has been sent.
            </p>

            <Button
              onClick={props.onBackToLogin}
              variant="outline"
              class="w-full"
            >
              Back to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
```

## 5. Shared UI Components

### File: `packages/ui/src/components/shared/ui/input.tsx`

```typescript
import { splitProps } from '@solid-js/react'
import { children, createSignal, onMount, For } from 'solid-js'

export interface InputProps {
  id?: string
  type?: string
  placeholder?: string
  value?: string
  error?: string
  disabled?: boolean
  required?: boolean
  autocomplete?: string
  maxLength?: number
  pattern?: string
  class?: string
  onInput?: (e: Event) => void
  onBlur?: (e: Event) => void
  onFocus?: (e: Event) => void
}

export const Input = (props: InputProps) => {
  const [focused, setFocused] = createSignal(false)
  const [localValue, setLocalValue] = createSignal(props.value || '')

  // Handle external value changes
  createEffect(() => {
    if (props.value !== localValue()) {
      setLocalValue(props.value || '')
    }
  })

  const inputClasses = () => {
    const base = [
      'w-full px-3 py-2 border rounded-md shadow-sm',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
      'disabled:bg-gray-100 disabled:cursor-not-allowed',
      props.class
    ].filter(Boolean).join(' ')

    if (props.error) {
      return `${base} border-red-300 text-red-900 placeholder-red-300`
    }

    return `${base} border-gray-300 text-gray-900 placeholder-gray-400`
  }

  return (
    <div class="w-full">
      <input
        {...splitProps(props, ['class', 'error', 'onInput', 'onBlur', 'onFocus'])}
        id={props.id}
        type={props.type || 'text'}
        placeholder={props.placeholder}
        value={localValue()}
        class={inputClasses()}
        disabled={props.disabled}
        required={props.required}
        autocomplete={props.autocomplete}
        maxLength={props.maxLength}
        pattern={props.pattern}
        onInput={(e) => {
          setLocalValue(e.currentTarget.value)
          props.onInput?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          props.onBlur?.(e)
        }}
        onFocus={(e) => {
          setFocused(true)
          props.onFocus?.(e)
        }}
      />

      {/* Error Message */}
      {props.error && (
        <p class="mt-1 text-sm text-red-600">
          {props.error}
        </p>
      )}
    </div>
  )
}
```

### File: `packages/ui/src/components/shared/ui/button.tsx`

```typescript
import { splitProps } from '@solid-js/react'
import { children, createSignal, Show } from 'solid-js'

export interface ButtonProps {
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  class?: string
  onClick?: (e: Event) => void
}

export const Button = (props: ButtonProps) => {
  const buttonClasses = () => {
    const base = [
      'inline-flex items-center justify-center font-medium rounded-md',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'transition-colors duration-200',
      props.disabled ? 'opacity-50 cursor-not-allowed' : ''
    ].filter(Boolean).join(' ')

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    }

    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
      outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
    }

    return [
      base,
      sizeClasses[props.size || 'md'],
      variantClasses[props.variant || 'primary'],
      props.class
    ].filter(Boolean).join(' ')
  }

  return (
    <button
      {...splitProps(props, ['class', 'variant', 'size', 'loading', 'onClick'])}
      type={props.type || 'button'}
      disabled={props.disabled || props.loading}
      class={buttonClasses()}
      onClick={props.onClick}
    >
      <Show
        when={props.loading}
        fallback={props.children}
      >
        <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8 8 0 01-8 8 0 008-8 8 0 018-8 8 0 00-8-8z"></path>
        </svg>
        {props.children}
      </Show>
    </button>
  )
}
```

### File: `packages/ui/src/components/shared/ui/alert.tsx`

```typescript
import { splitProps } from '@solid-js/react'
import { children, createSignal, Show } from 'solid-js'

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  class?: string
}

export const Alert = (props: AlertProps) => {
  const alertClasses = () => {
    const base = [
      'p-4 rounded-md border',
      props.class
    ].filter(Boolean).join(' ')

    const variantClasses = {
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      error: 'bg-red-50 border-red-200 text-red-800'
    }

    return [base, variantClasses[props.variant || 'info']].join(' ')
  }

  const icon = () => {
    const icons = {
      info: (
        <svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 001-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 001 1zm1-1H8a1 1 0 00-1 1v3a1 1 0 001 1h2a1 1 0 001-1v-3a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
      ),
      success: (
        <svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0016 0zm3.707-9.293a1 1 0 00-1.414-1.414l-7-7a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414l7 7a1 1 0 001.414 0z" clip-rule="evenodd"></path>
        </svg>
      ),
      warning: (
        <svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486a1 1 0 01.948-.684l1.498 4.493a1 1 0 01.502 1.21l-2.257-5.681a1 1 0 00-1.242.479l-3.732-.047a1 1 0 00-.778.332l-3.74 3.113a1 1 0 001.06.972l3.188-3.819a1 1 0 00-.905-.57l-3.347 2.236a1 1 0 00-.628.619l2.842 5.294c.361.823 1.303 1.303 1.303 0 001.303-.58l2.842-5.294a1 1 0 00-.628-.619l-3.347-2.236a1 1 0 00-.905-.57l-3.188 3.819a1 1 0 001.06.972l3.188-3.819z" clip-rule="evenodd"></path>
        </svg>
      ),
      error: (
        <svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0016 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 7H7a1 1 0 01-1 1v3a1 1 0 001 1h1.586l1.707 1.707a1 1 0 001.414 0l4-4a1 1 0 001.414-1.414l-1.707-1.707A1 1 0 009 12H7a1 1 0 01-1-1V8a1 1 0 011-1h1.586l1.707-1.707a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
        </svg>
      )
    }

    return icons[props.variant || 'info']
  }

  return (
    <div class={alertClasses()}>
      <div class="flex">
        <div class="flex-shrink-0">
          {icon()}
        </div>
        <div class="ml-3">
          {children}
        </div>
      </div>
    </div>
  )
}
```

## 6. Custom Hooks

### File: `packages/ui/src/components/shared/hooks/use-form-validation.ts`

```typescript
import { createSignal, createEffect } from 'solid-js'
import { z } from 'zod'

export interface UseFormValidationOptions<T> {
  initialValues: Partial<T>
  onSubmit: (values: T) => Promise<boolean>
}

export function useFormValidation<T extends z.ZodType<any>>(
  schema: z.ZodSchema<T>,
  options: UseFormValidationOptions<T>,
) {
  const [values, setValues] = createSignal<Partial<T>>(options.initialValues)
  const [errors, setErrors] = createSignal<Record<string, string>>({})
  const [touched, setTouched] = createSignal<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = createSignal(false)

  const validateField = (name: string, value: any) => {
    const fieldSchema = schema.shape[name as keyof T]
    if (!fieldSchema) return ''

    const result = fieldSchema.safeParse(value)
    return result.success
      ? ''
      : result.error.errors[0]?.message || 'Invalid value'
  }

  const validateForm = (formData: Partial<T>) => {
    const result = schema.safeParse(formData)
    if (result.success) {
      setErrors({})
      return true
    }

    const newErrors: Record<string, string> = {}
    result.error.errors.forEach((err) => {
      const field = err.path.join('.')
      newErrors[field] = err.message
    })

    setErrors(newErrors)
    return false
  }

  const setFieldValue = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }))

    // Clear error when field is modified
    if (errors()[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    if (isSubmitting()) return

    // Validate all fields
    if (!validateForm(values())) {
      return
    }

    setIsSubmitting(true)

    try {
      const success = await options.onSubmit(values() as T)

      if (!success) {
        // Validation failed from server
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('Form submission error:', error)
      setIsSubmitting(false)
    }
  }

  const isValid = () => {
    const hasErrors = Object.keys(errors()).length > 0
    const hasEmptyFields = Object.entries(values()).some(([key, value]) => {
      const fieldSchema = schema.shape[key as keyof T]
      return fieldSchema && !value
    })

    return !hasErrors && !hasEmptyFields
  }

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    handleSubmit,
    setFieldValue,
    setTouched: (name: string) =>
      setTouched((prev) => ({ ...prev, [name]: true })),
  }
}
```

### File: `packages/ui/src/components/shared/hooks/use-rate-limit.ts`

```typescript
import { createSignal, createEffect, onCleanup } from 'solid-js'

export interface UseRateLimitOptions {
  maxAttempts: number
  windowMinutes: number
  onRateLimitExceeded?: (info: { attempts: number; resetTime: number }) => void
}

export function useRateLimit(key: string, options: UseRateLimitOptions) {
  const [attempts, setAttempts] = createSignal(0)
  const [resetTime, setResetTime] = createSignal<number | undefined>(undefined)
  const [isRateLimited, setIsRateLimited] = createSignal(false)

  const storageKey = `rate-limit-${key}`

  // Load from localStorage on mount
  onMount(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        setAttempts(data.attempts || 0)
        setResetTime(data.resetTime)

        if (data.resetTime && Date.now() < data.resetTime) {
          setIsRateLimited(true)
        }
      }
    } catch (error) {
      console.error('Failed to load rate limit data:', error)
    }
  })

  // Save to localStorage when attempts change
  createEffect(() => {
    try {
      const data = {
        attempts: attempts(),
        resetTime: resetTime(),
      }
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save rate limit data:', error)
    }
  })

  const incrementAttempts = () => {
    const newAttempts = attempts() + 1
    setAttempts(newAttempts)

    if (newAttempts >= options.maxAttempts) {
      const windowMs = options.windowMinutes * 60 * 1000
      const newResetTime = Date.now() + windowMs
      setResetTime(newResetTime)
      setIsRateLimited(true)

      options.onRateLimitExceeded?.({
        attempts: newAttempts,
        resetTime: newResetTime,
      })
    }
  }

  const resetAttempts = () => {
    setAttempts(0)
    setResetTime(undefined)
    setIsRateLimited(false)
  }

  const timeRemaining = () => {
    if (!resetTime()) return 0
    return Math.max(0, Math.ceil((resetTime()! - Date.now()) / 1000))
  }

  // Auto-reset when time expires
  const interval = setInterval(() => {
    if (resetTime() && Date.now() >= resetTime()!) {
      resetAttempts()
    }
  }, 1000)

  onCleanup(() => {
    clearInterval(interval)
  })

  return {
    attempts,
    isRateLimited,
    timeRemaining,
    incrementAttempts,
    resetAttempts,
  }
}
```

## 7. Component Index

### File: `packages/ui/src/components/auth/index.ts`

```typescript
export { LoginForm } from './login-form'
export { RegisterForm } from './register-form'
export { MfaSetupForm } from './mfa-setup-form'
export { MfaVerifyForm } from './mfa-verify-form'
export { ForgotPasswordForm } from './forgot-password-form'
export { ResetPasswordForm } from './reset-password-form'
export { MagicLinkForm } from './magic-link-form'
export { ChangePasswordForm } from './change-password-form'
export { ProfileForm } from './profile-form'

export type {
  LoginFormProps,
  LoginFormData,
  LoginResult,
  MfaSetupFormProps,
  ForgotPasswordFormProps,
  ForgotPasswordData,
} from './types'
```

## 8. Testing Strategy

1. **Component Tests**: Test each component in isolation
2. **Integration Tests**: Test component interactions
3. **Accessibility Tests**: Test keyboard navigation, screen readers
4. **Visual Tests**: Test responsive design
5. **User Flow Tests**: Test complete authentication flows

## 9. Accessibility Considerations

1. **Keyboard Navigation**: All interactive elements accessible via keyboard
2. **Screen Readers**: Proper ARIA labels and descriptions
3. **Color Contrast**: Meet WCAG AA standards
4. **Focus Management**: Logical tab order and focus indicators
5. **Error Announcements**: Screen reader announcements for errors

## 10. Responsive Design

1. **Mobile First**: Design for mobile screens first
2. **Breakpoints**: Use Tailwind's responsive utilities
3. **Touch Targets**: Minimum 44px touch targets
4. **Readable Text**: Appropriate font sizes for mobile

## Next Steps

1. Implement all components following patterns above
2. Add comprehensive error handling
3. Write tests for all component implementations
4. Add Storybook documentation
5. Implement proper accessibility features
6. Add internationalization support
