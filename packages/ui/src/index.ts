// Core utilities
export { classNames } from './lib/utils'

// CSS imports for Tailwind CSS 4
// Note: CSS is now handled by the web app with Tailwind v4 configuration
// import './index.css'

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
export { Checkbox, CheckboxCard, CheckboxGroup } from './components/ui/checkbox'
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './components/ui/dropdown'
export { Input } from './components/ui/input'
export { Label } from './components/ui/label'
export {
  Breadcrumb,
  MobileNav,
  Navbar,
  NavbarItem,
} from './components/ui/navbar'
export {
  RadioCard,
  RadioField,
  RadioGroup,
  RadioGroupItem,
} from './components/ui/radio'
export { MultiSelect, Select } from './components/ui/select'
export {
  Sidebar,
  SidebarGroup,
  SidebarItem,
  SidebarProfile,
} from './components/ui/sidebar'
export { Skeleton } from './components/ui/skeleton'
export { SkeletonCard } from './components/ui/skeleton-card'
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableCheckbox,
  TableFooter,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableSearch,
  TableSort,
} from './components/ui/table'
export { RichTextarea, Textarea } from './components/ui/textarea'
export { ToastProvider, createToast } from './components/ui/toast'

// Modal components - Temporarily disabled
// export {
//   AlertDialog,
//   ConfirmDialog,
//   Dialog, Modal, ModalCloseButton, ModalContent,
//   ModalFooter, ModalHeader,
//   ModalTitle
// } from './components/ui/modal'

// Animation utilities
export {
  ANIMATION_CONFIG,
  MOTION_PRESETS,
  createMotion,
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
  TRANSITIONS,
  TRANSITION_PRESETS,
  applyPresetTransition,
  createExitTransition,
  createTransition,
} from './lib/transitions'

// Theme provider
export {
  ThemeProvider,
  getThemeScript,
  useTheme,
  type ResolvedTheme,
  type Theme,
  type ThemeContextValue,
  type ThemeProviderProps,
} from './components/theme-provider'

// Form components - Temporarily disabled due to missing dependencies
// export * from './components/ui/form'

// Auth components
export { ForgotPasswordForm } from './components/auth/forgot-password-form'
export { LoginForm } from './components/auth/login-form'
export { MFASetupForm } from './components/auth/mfa-setup-form'
export { RegisterForm } from './components/auth/register-form'
export { ResetPasswordForm } from './components/auth/reset-password-form'

// Types
export type {
  ForgotPasswordFormProps,
  Tenant as ForgotPasswordTenant,
} from './components/auth/forgot-password-form'
export type {
  LoginFormProps,
  Tenant as LoginTenant,
} from './components/auth/login-form'
export type {
  MFAResponse,
  MFASetupFormProps,
} from './components/auth/mfa-setup-form'
export type {
  RegisterFormProps,
  Tenant as RegisterTenant,
} from './components/auth/register-form'
export type { ResetPasswordFormProps } from './components/auth/reset-password-form'
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

// Modal types - Temporarily disabled
// export type {
//   AlertDialogProps,
//   ConfirmDialogProps,
//   DialogProps, ModalCloseButtonProps, ModalContentProps,
//   ModalFooterProps, ModalHeaderProps, ModalProps, ModalTitleProps
// } from './components/ui/modal'

// Dropdown types
export type {
  DropdownMenuCheckboxItemProps,
  DropdownMenuContentProps,
  DropdownMenuGroupProps,
  DropdownMenuItemProps,
  DropdownMenuLabelProps,
  DropdownMenuProps,
  DropdownMenuRadioItemProps,
  DropdownMenuSeparatorProps,
  DropdownMenuSubContentProps,
  DropdownMenuSubProps,
  DropdownMenuSubTriggerProps,
  DropdownMenuTriggerProps,
} from './components/ui/dropdown'

// Table types
export type {
  TableBodyProps,
  TableCaptionProps,
  TableCellProps,
  TableCheckboxProps,
  TableFooterProps,
  TableHeadProps,
  TableHeaderProps,
  TablePaginationProps,
  TableProps,
  TableRowProps,
  TableSearchProps,
  TableSortProps,
} from './components/ui/table'

// Form types
export type {
  CheckboxCardProps,
  CheckboxGroupProps,
  CheckboxProps,
} from './components/ui/checkbox'

export type {
  RadioCardProps,
  RadioFieldProps,
  RadioGroupItemProps,
  RadioGroupProps,
} from './components/ui/radio'

export type { MultiSelectProps, SelectProps } from './components/ui/select'

export type { RichTextareaProps, TextareaProps } from './components/ui/textarea'

// Navigation types
export type {
  BreadcrumbProps,
  MobileNavProps,
  NavbarItemProps,
  NavbarProps,
} from './components/ui/navbar'

export type {
  SidebarGroupProps,
  SidebarItemProps,
  SidebarProfileProps,
  SidebarProps,
} from './components/ui/sidebar'
