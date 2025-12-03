import type { JSX, ValidComponent } from 'solid-js'
import { splitProps } from 'solid-js'

import type { PolymorphicProps } from '@kobalte/core/polymorphic'

import { cn } from '../../../lib/utils'

export type ModalFooterProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  position?: 'left' | 'center' | 'right' | 'space-between'
  bordered?: boolean
}>

const ModalFooter = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, ModalFooterProps<T>>,
) => {
  const [local, others] = splitProps(props as ModalFooterProps, [
    'class',
    'children',
    'position',
    'bordered',
  ])

  const getFooterClasses = () => {
    const positionClasses = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
      'space-between': 'justify-between',
    }

    return cn(
      'flex flex-col-reverse sm:flex-row items-center gap-3 pt-6',
      local.bordered && 'border-t',
      positionClasses[local.position ?? 'center'],
      local.class,
    )
  }

  return (
    <div class={getFooterClasses()} {...others}>
      {local.children}
    </div>
  )
}

export { ModalFooter }

