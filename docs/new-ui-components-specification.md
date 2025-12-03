# New UI Components Specification

## Overview

This document outlines the comprehensive API design for new UI components to be added to the PEMS UI library, following existing patterns and extending functionality.

## 1. Modal Component System

### Core Components

#### Modal
```typescript
type ModalProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
  preventClose?: boolean
  closeOnEscape?: boolean
  closeOnOutsideClick?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  variant?: 'default' | 'danger' | 'warning' | 'info'
  centered?: boolean
  scrollable?: boolean
  animated?: boolean
  animationDuration?: number
  class?: string
  children?: JSX.Element
}>
```

#### ModalHeader
```typescript
type ModalHeaderProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  showCloseButton?: boolean
  onClose?: () => void
  bordered?: boolean
}>
```

#### ModalTitle
```typescript
type ModalTitleProps<T extends ValidComponent = 'h2'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}>
```

#### ModalContent
```typescript
type ModalContentProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  padding?: 'none' | 'sm' | 'md' | 'lg'
  scrollable?: boolean
}>
```

#### ModalFooter
```typescript
type ModalFooterProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  position?: 'left' | 'center' | 'right' | 'space-between'
  bordered?: boolean
}>
```

#### ModalCloseButton
```typescript
type ModalCloseButtonProps<T extends ValidComponent = 'button'> = PolymorphicProps<T, {
  class?: string
  variant?: 'ghost' | 'outline' | 'solid'
  size?: 'sm' | 'md' | 'lg'
  icon?: JSX.Element
  label?: string
}>
```

### Specialized Modals

#### AlertDialog
```typescript
type AlertDialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  cancelText?: string
  confirmText?: string
  variant?: 'default' | 'destructive'
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  loading?: boolean
}
```

#### ConfirmDialog
```typescript
type ConfirmDialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger' | 'warning'
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  loading?: boolean
}
```

#### Dialog
```typescript
type DialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  trigger?: JSX.Element
  children?: JSX.Element
  footer?: JSX.Element
  size?: 'sm' | 'md' | 'lg' | 'xl'
}
```

## 2. Dropdown/Menu Component System

### Core Components

#### DropdownMenu
```typescript
type DropdownMenuProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  modal?: boolean
  dir?: 'ltr' | 'rtl'
  open?: boolean
  onOpenChange?: (open: boolean) => void
}>
```

#### DropdownMenuTrigger
```typescript
type DropdownMenuTriggerProps<T extends ValidComponent = 'button'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  variant?: 'ghost' | 'outline' | 'solid'
  size?: 'sm' | 'md' | 'lg'
  icon?: JSX.Element
  iconPosition?: 'left' | 'right'
  chevron?: boolean
}>
```

#### DropdownMenuContent
```typescript
type DropdownMenuContentProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  alignOffset?: number
  avoidCollisions?: boolean
  collisionBoundary?: Element | Element[]
  collisionPadding?: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>
  arrowPadding?: number
  sticky?: 'partial' | 'always'
  hideWhenDetached?: boolean
  updatePositionStrategy?: 'always' | 'whenOverflow'
}>
```

#### DropdownMenuItem
```typescript
type DropdownMenuItemProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  disabled?: boolean
  textValue?: string
  icon?: JSX.Element
  iconPosition?: 'left' | 'right'
  shortcut?: string
  variant?: 'default' | 'destructive' | 'warning'
  onSelect?: () => void
}>
```

#### DropdownMenuGroup
```typescript
type DropdownMenuGroupProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  title?: string
}>
```

#### DropdownMenuLabel
```typescript
type DropdownMenuLabelProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  inset?: boolean
}>
```

#### DropdownMenuSeparator
```typescript
type DropdownMenuSeparatorProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
}>
```

#### DropdownMenuSub
```typescript
type DropdownMenuSubProps = {
  class?: string
  children?: JSX.Element
  open?: boolean
  onOpenChange?: (open: boolean) => void
}
```

#### DropdownMenuSubTrigger
```typescript
type DropdownMenuSubTriggerProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  disabled?: boolean
  textValue?: string
  icon?: JSX.Element
}>
```

#### DropdownMenuSubContent
```typescript
type DropdownMenuSubContentProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  sideOffset?: number
  avoidCollisions?: boolean
  collisionPadding?: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>
}>
```

#### DropdownMenuCheckboxItem
```typescript
type DropdownMenuCheckboxItemProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  checked?: boolean
  disabled?: boolean
  textValue?: string
  onCheckedChange?: (checked: boolean) => void
}>
```

#### DropdownMenuRadioGroup
```typescript
type DropdownMenuRadioGroupProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  value?: string
  onValueChange?: (value: string) => void
}>
```

#### DropdownMenuRadioItem
```typescript
type DropdownMenuRadioItemProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  value?: string
  disabled?: boolean
  textValue?: string
}>
```

### Specialized Dropdowns

#### Select
```typescript
type SelectProps<T = string> = {
  options?: SelectOption<T>[]
  value?: T
  onValueChange?: (value: T) => void
  placeholder?: string
  disabled?: boolean
  searchable?: boolean
  clearable?: boolean
  multiple?: boolean
  loading?: boolean
  error?: string
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outlined' | 'filled'
  position?: 'popper' | 'item-aligned'
  side?: 'bottom' | 'top'
  align?: 'start' | 'center' | 'end'
  class?: string
}

type SelectOption<T = string> = {
  value: T
  label: string
  disabled?: boolean
  group?: string
  icon?: JSX.Element
  description?: string
}
```

#### Combobox
```typescript
type ComboboxProps<T = string> = {
  options?: ComboboxOption<T>[]
  value?: T
  onValueChange?: (value: T) => void
  inputValue?: string
  onInputChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  error?: string
  helperText?: string
  filter?: (input: string, option: ComboboxOption<T>) => boolean
  onCreateOption?: (input: string) => T | void
  size?: 'sm' | 'md' | 'lg'
  class?: string
}

type ComboboxOption<T = string> = {
  value: T
  label: string
  disabled?: boolean
  group?: string
  icon?: JSX.Element
  description?: string
}
```

## 3. Table Component System

### Core Components

#### Table
```typescript
type TableProps<T extends ValidComponent = 'table'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  variant?: 'default' | 'bordered' | 'striped' | 'compact'
  size?: 'sm' | 'md' | 'lg'
  stickyHeader?: boolean
  stickyFooter?: boolean
  zebra?: boolean
  hoverable?: boolean
  selectable?: boolean
  loading?: boolean
  empty?: JSX.Element
  data?: any[]
  columns?: TableColumn[]
  onRowClick?: (row: any, index: number) => void
  onSelectionChange?: (selectedRows: any[]) => void
  sort?: TableSort
  onSort?: (sort: TableSort) => void
  pagination?: TablePagination
  onPaginationChange?: (pagination: TablePagination) => void
}>

type TableColumn = {
  id: string
  header?: string | JSX.Element
  accessor?: string | ((row: any) => any)
  width?: string | number
  minWidth?: string | number
  maxWidth?: string | number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  filterable?: boolean
  resizable?: boolean
  pinned?: 'left' | 'right'
  hidden?: boolean
  cell?: (row: any, index: number) => JSX.Element
  headerCell?: (column: TableColumn) => JSX.Element
  footerCell?: (column: TableColumn) => JSX.Element
}

type TableSort = {
  column: string
  direction: 'asc' | 'desc'
}

type TablePagination = {
  page: number
  pageSize: number
  total: number
}
```

#### TableHeader
```typescript
type TableHeaderProps<T extends ValidComponent = 'thead'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  sticky?: boolean
  zebra?: boolean
}>
```

#### TableBody
```typescript
type TableBodyProps<T extends ValidComponent = 'tbody'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  loading?: boolean
  empty?: JSX.Element
  zebra?: boolean
}>
```

#### TableFooter
```typescript
type TableFooterProps<T extends ValidComponent = 'tfoot'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  sticky?: boolean
}>
```

#### TableRow
```typescript
type TableRowProps<T extends ValidComponent = 'tr'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  selected?: boolean
  disabled?: boolean
  hoverable?: boolean
  onClick?: () => void
  data?: any
}>
```

#### TableCell
```typescript
type TableCellProps<T extends ValidComponent = 'td'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  colSpan?: number
  rowSpan?: number
  align?: 'left' | 'center' | 'right'
  valign?: 'top' | 'middle' | 'bottom'
  width?: string | number
  minWidth?: string | number
  maxWidth?: string | number
  pinned?: 'left' | 'right'
}>
```

#### TableHead
```typescript
type TableHeadProps<T extends ValidComponent = 'th'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  colSpan?: number
  rowSpan?: number
  align?: 'left' | 'center' | 'right'
  valign?: 'top' | 'middle' | 'bottom'
  width?: string | number
  minWidth?: string | number
  maxWidth?: string | number
  sortable?: boolean
  sortDirection?: 'asc' | 'desc' | null
  onSort?: () => void
  resizable?: boolean
  pinned?: 'left' | 'right'
}>
```

### Advanced Table Features

#### DataTable
```typescript
type DataTableProps<T = any> = {
  data: T[]
  columns: DataTableColumn<T>[]
  loading?: boolean
  error?: string
  empty?: JSX.Element
  selectable?: boolean
  multiSelect?: boolean
  onSelectionChange?: (selectedRows: T[]) => void
  sortable?: boolean
  onSort?: (sort: DataTableSort) => void
  filterable?: boolean
  onFilter?: (filters: DataTableFilters) => void
  searchable?: boolean
  onSearch?: (search: string) => void
  paginated?: boolean
  pagination?: DataTablePagination
  onPaginationChange?: (pagination: DataTablePagination) => void
  expandable?: boolean
  expandedRows?: string[]
  onExpandedRowsChange?: (expandedRows: string[]) => void
  rowActions?: (row: T) => DataTableAction[]
  bulkActions?: DataTableAction[]
  className?: string
}

type DataTableColumn<T = any> = {
  id: string
  header: string | JSX.Element
  accessor: keyof T | ((row: T) => any)
  width?: string | number
  minWidth?: string | number
  maxWidth?: string | number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  filterable?: boolean
  searchable?: boolean
  resizable?: boolean
  pinned?: 'left' | 'right'
  hidden?: boolean
  cell?: (row: T, index: number) => JSX.Element
  footer?: (rows: T[]) => JSX.Element
}

type DataTableSort = {
  column: string
  direction: 'asc' | 'desc'
}

type DataTableFilters = Record<string, any>

type DataTablePagination = {
  page: number
  pageSize: number
  total: number
  totalPages?: number
}

type DataTableAction = {
  label: string
  icon?: JSX.Element
  onClick: (row: any) => void
  disabled?: boolean
  variant?: 'default' | 'destructive' | 'warning'
}
```

## 4. Form Component System

### Core Components

#### Form
```typescript
type FormProps<T extends ValidComponent = 'form'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  onSubmit?: (data: any) => void | Promise<void>
  onReset?: () => void
  onChange?: (data: any, field: string) => void
  validation?: FormValidation
  schema?: any // Zod schema
  defaultValues?: Record<string, any>
  mode?: 'onSubmit' | 'onBlur' | 'onChange'
  reValidateMode?: 'onSubmit' | 'onBlur' | 'onChange'
  disabled?: boolean
  loading?: boolean
}>

type FormValidation = {
  mode?: 'onSubmit' | 'onBlur' | 'onChange'
  reValidateMode?: 'onSubmit' | 'onBlur' | 'onChange'
  resolver?: (values: any) => FormValidationResult
  errors?: Record<string, string>
  touched?: Record<string, boolean>
}

type FormValidationResult = {
  valid: boolean
  errors: Record<string, string>
}
```

#### FormField
```typescript
type FormFieldProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  name: string
  label?: string
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
  validation?: FieldValidation
}>
```

#### FormLabel
```typescript
type FormLabelProps<T extends ValidComponent = 'label'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  htmlFor?: string
  required?: boolean
  disabled?: boolean
  error?: boolean
}>
```

#### FormDescription
```typescript
type FormDescriptionProps<T extends ValidComponent = 'p'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  error?: boolean
}>
```

#### FormError
```typescript
type FormErrorProps<T extends ValidComponent = 'p'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
}>
```

#### FormMessage
```typescript
type FormMessageProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  variant?: 'error' | 'success' | 'warning' | 'info'
}>
```

### Advanced Form Components

#### FormInput
```typescript
type FormInputProps = Omit<InputProps, 'name' | 'value' | 'onChange'> & {
  name: string
  control?: Control<any>
  label?: string
  description?: string
  error?: string
  required?: boolean
}
```

#### FormSelect
```typescript
type FormSelectProps = Omit<SelectProps, 'name' | 'value' | 'onChange'> & {
  name: string
  control?: Control<any>
  label?: string
  description?: string
  error?: string
  required?: boolean
}
```

#### FormCheckbox
```typescript
type FormCheckboxProps = {
  name: string
  control?: Control<any>
  label?: string
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
  value?: boolean
  onChange?: (value: boolean) => void
  indeterminate?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'card'
  className?: string
}
```

#### FormRadioGroup
```typescript
type FormRadioGroupProps = {
  name: string
  control?: Control<any>
  label?: string
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
  value?: string
  onChange?: (value: string) => void
  options: RadioOption[]
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'card'
  className?: string
}

type RadioOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
}
```

#### FormSwitch
```typescript
type FormSwitchProps = {
  name: string
  control?: Control<any>
  label?: string
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
  value?: boolean
  onChange?: (value: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'card'
  className?: string
}
```

#### FormTextarea
```typescript
type FormTextareaProps = {
  name: string
  control?: Control<any>
  label?: string
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  showCharacterCount?: boolean
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  className?: string
}
```

#### FormDatePicker
```typescript
type FormDatePickerProps = {
  name: string
  control?: Control<any>
  label?: string
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
  value?: Date
  onChange?: (value: Date | null) => void
  placeholder?: string
  format?: string
  minDate?: Date
  maxDate?: Date
  disabledDates?: Date[]
  className?: string
}
```

#### FormFileUpload
```typescript
type FormFileUploadProps = {
  name: string
  control?: Control<any>
  label?: string
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
  value?: File[]
  onChange?: (files: File[]) => void
  accept?: string
  multiple?: boolean
  maxSize?: number
  maxFiles?: number
  dragAndDrop?: boolean
  preview?: boolean
  className?: string
}
```

## 5. Navigation Component System

### Core Components

#### Navigation
```typescript
type NavigationProps<T extends ValidComponent = 'nav'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  variant?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  sticky?: boolean
  collapsible?: boolean
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  ariaLabel?: string
}>
```

#### NavigationList
```typescript
type NavigationListProps<T extends ValidComponent = 'ul'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  orientation?: 'horizontal' | 'vertical'
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}>
```

#### NavigationItem
```typescript
type NavigationItemProps<T extends ValidComponent = 'li'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  active?: boolean
  disabled?: boolean
  icon?: JSX.Element
  iconPosition?: 'left' | 'right'
  badge?: string | number
  onClick?: () => void
}>
```

#### NavigationLink
```typescript
type NavigationLinkProps<T extends ValidComponent = 'a'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  href?: string
  active?: boolean
  disabled?: boolean
  icon?: JSX.Element
  iconPosition?: 'left' | 'right'
  badge?: string | number
  external?: boolean
  onClick?: () => void
}>
```

### Specialized Navigation Components

#### Navbar
```typescript
type NavbarProps = {
  class?: string
  children?: JSX.Element
  brand?: JSX.Element
  brandHref?: string
  sticky?: boolean
  transparent?: boolean
  bordered?: boolean
  size?: 'sm' | 'md' | 'lg'
  position?: 'static' | 'fixed' | 'sticky'
  collapse?: boolean
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}
```

#### Sidebar
```typescript
type SidebarProps = {
  class?: string
  children?: JSX.Element
  open?: boolean
  onOpenChange?: (open: boolean) => void
  position?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  overlay?: boolean
  closeOnOutsideClick?: boolean
  closeOnEscape?: boolean
  collapsible?: boolean
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  sticky?: boolean
}
```

#### Breadcrumb
```typescript
type BreadcrumbProps = {
  class?: string
  children?: JSX.Element
  separator?: JSX.Element
  maxItems?: number
  showCurrent?: boolean
  homeIcon?: JSX.Element
}
```

#### BreadcrumbItem
```typescript
type BreadcrumbItemProps = {
  class?: string
  children?: JSX.Element
  href?: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}
```

#### Tabs
```typescript
type TabsProps = {
  class?: string
  children?: JSX.Element
  value?: string
  onValueChange?: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'underline' | 'pills' | 'card'
  fullWidth?: boolean
  scrollable?: boolean
}
```

#### TabsList
```typescript
type TabsListProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  loop?: boolean
}>
```

#### TabsTrigger
```typescript
type TabsTriggerProps<T extends ValidComponent = 'button'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  value: string
  disabled?: boolean
  icon?: JSX.Element
  iconPosition?: 'left' | 'right'
  badge?: string | number
}>
```

#### TabsContent
```typescript
type TabsContentProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  value: string
  forceMount?: boolean
}>
```

#### Pagination
```typescript
type PaginationProps = {
  class?: string
  currentPage: number
  totalPages: number
  onPageChange?: (page: number) => void
  showFirstLast?: boolean
  showPrevNext?: boolean
  showPageNumbers?: boolean
  maxVisiblePages?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  disabled?: boolean
  loading?: boolean
}
```

#### Steps
```typescript
type StepsProps = {
  class?: string
  children?: JSX.Element
  currentStep: number
  onStepChange?: (step: number) => void
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'arrow' | 'dots'
  clickable?: boolean
  linear?: boolean
}
```

#### Step
```typescript
type StepProps = {
  class?: string
  children?: JSX.Element
  step: number
  title?: string
  description?: string
  icon?: JSX.Element
  status?: 'pending' | 'active' | 'completed' | 'error'
  disabled?: boolean
  onClick?: () => void
}
```

## Design Principles

### 1. Accessibility
- All components use Kobalte primitives for full keyboard navigation
- Proper ARIA labels and descriptions
- Screen reader compatibility
- Focus management
- Reduced motion support

### 2. Customization
- Class-variance-authority (cva) for consistent styling
- Polymorphic components for flexibility
- Extensive prop interfaces for customization
- Theme-aware styling

### 3. Performance
- Lazy loading where appropriate
- Efficient reactivity with SolidJS
- Optimized animations
- Tree-shakeable exports

### 4. Developer Experience
- Comprehensive TypeScript support
- Intuitive API design
- Consistent naming conventions
- Extensive documentation

### 5. Responsive Design
- Mobile-first approach
- Responsive utilities
- Touch-friendly interactions
- Adaptive layouts

This specification provides a comprehensive foundation for implementing all requested UI components while maintaining consistency with the existing codebase and following modern best practices.