import type { JSX, ValidComponent } from 'solid-js'
import { splitProps } from 'solid-js'

import type { PolymorphicProps } from '@kobalte/core/polymorphic'

import { cn } from '../../../lib/utils'

export type ModalContentProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  padding?: 'none' | 'sm' | 'md' | 'lg'
  scrollable?: boolean
}>

const ModalContent = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, ModalContentProps<T>>,
) => {
  const [local, others] = splitProps(props as ModalContentProps, [
    'class',
    'children',
    'padding',
    'scrollable',
  ])

  const getContentClasses = () => {
    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }

    return cn(
      'flex-1',
      paddingClasses[local.padding ?? 'md'],
      local.scrollable && 'overflow-y-auto',
      local.class,
    )
  }

  return (
    <div class={getContentClasses()} {...others}>
      {local.children}
    </div>
  )
}

export { ModalContent }

