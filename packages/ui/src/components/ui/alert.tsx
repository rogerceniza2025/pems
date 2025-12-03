import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'
import { cn } from '../../lib/utils'

export interface AlertProps {
  variant?: 'default' | 'destructive' | 'warning'
  class?: string
  children: JSX.Element
}

export const Alert = (props: AlertProps) => {
  const [local, others] = splitProps(props, ['variant', 'class', 'children'])

  const variantClasses = () => {
    switch (local.variant) {
      case 'destructive':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'warning':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200'
      default:
        return 'bg-primary/10 text-primary border-primary/20'
    }
  }

  return (
    <div
      class={cn(
        'relative w-full rounded-lg border p-3 text-sm',
        variantClasses(),
        local.class
      )}
      role="alert"
      {...others}
    >
      {local.children}
    </div>
  )
}