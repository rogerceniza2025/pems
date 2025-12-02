// Core utilities
export { cn } from './lib/utils'

// CSS imports for Tailwind CSS 4
import './index.css'

// UI Components
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './components/ui/accordion'
export { Button, buttonVariants } from './components/ui/button'
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/ui/card'
export { Input } from './components/ui/input'
export { Label } from './components/ui/label'
export { Skeleton } from './components/ui/skeleton'
export { SkeletonCard } from './components/ui/skeleton-card'
export { createToast, ToastProvider } from './components/ui/toast'

// Animation utilities
export {
  ANIMATION_CONFIG,
  createMotion,
  MOTION_PRESETS,
  useReducedMotion,
} from './lib/animations'
export {
  cancelDebounce,
  createDebounce,
  createDebounceLeading,
  createDebounceTrailing,
  createThrottle,
} from './lib/debounce'
export { createRipple } from './lib/ripple'
export {
  applyPresetTransition,
  createExitTransition,
  createTransition,
  TRANSITION_PRESETS,
  TRANSITIONS,
} from './lib/transitions'

// Theme provider
export { ThemeProvider, useTheme } from './components/theme-provider'

// Auth components
export { LoginForm } from './components/auth/login-form'
export { RegisterForm } from './components/auth/register-form'

// Types
export type { LoginFormProps } from './components/auth/login-form'
export type { RegisterFormProps } from './components/auth/register-form'
export type {
  AccordionContentProps,
  AccordionItemProps,
  AccordionTriggerProps,
  CollapsibleAccordionProps,
} from './components/ui/accordion'
export type { ButtonProps, LoadingType } from './components/ui/button'
export type {
  CardContentProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardProps,
  CardTitleProps,
} from './components/ui/card'
export type {
  TextFieldInputProps as InputProps,
  PasswordStrength,
  TextFieldRootProps,
  ValidationState,
} from './components/ui/input'
export type { LabelProps } from './components/ui/label'
export type {
  LoadingOverlayProps,
  LoadingPosition,
  LoadingProviderProps,
  LoadingSize,
  LoadingVariant,
} from './components/ui/loading-overlay'
export type { SkeletonProps } from './components/ui/skeleton'
export type { SkeletonCardProps } from './components/ui/skeleton-card'
export type {
  Toast,
  ToastAction,
  ToastPosition,
  ToastProviderProps,
  ToastType,
} from './components/ui/toast'
