import type { JSX, ValidComponent } from 'solid-js'
import { splitProps } from 'solid-js'

import type { PolymorphicProps } from '@kobalte/core/polymorphic'

import { cn } from '../../../lib/utils'

export type ModalTitleProps<T extends ValidComponent = 'h2'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}>

const ModalTitle = <T extends ValidComponent = 'h2'>(
  props: PolymorphicProps<T, ModalTitleProps<T>>,
) => {
  const [local, others] = splitProps(props as ModalTitleProps, [
    'class',
    'children',
    'level',
  ])

  const getTitleClasses = () => {
    return cn(
      'text-lg font-semibold leading-none tracking-tight',
      local.class,
    )
  }

  const HeadingTag = local.level ?? 'h2'

  return (
    <HeadingTag class={getTitleClasses()} {...others}>
      {local.children}
    </HeadingTag>
  )
}

export { ModalTitle }

