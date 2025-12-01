// Core utilities
export { cn } from './lib/utils'

// CSS imports for Tailwind CSS 4
import './index.css'

// UI Components
export { Button, buttonVariants } from './components/ui/button'
export { Input } from './components/ui/input'
export { Label } from './components/ui/label'
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/ui/card'
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './components/ui/accordion'

// Theme provider
export { ThemeProvider, useTheme } from './components/theme-provider'

// Auth components
export { LoginForm } from './components/auth/login-form'
export { RegisterForm } from './components/auth/register-form'

// Types
export type { ButtonProps } from './components/ui/button'
export type {
  TextFieldInputProps as InputProps,
  TextFieldRootProps,
} from './components/ui/input'
export type { LabelProps } from './components/ui/label'
export type {
  CardProps,
  CardHeaderProps,
  CardFooterProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
} from './components/ui/card'
export type {
  AccordionItemProps,
  AccordionTriggerProps,
  AccordionContentProps,
} from './components/ui/accordion'
export type { LoginFormProps } from './components/auth/login-form'
export type { RegisterFormProps } from './components/auth/register-form'
