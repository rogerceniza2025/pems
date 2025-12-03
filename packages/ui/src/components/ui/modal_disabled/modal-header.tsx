import type { JSX, ValidComponent } from 'solid-js'
import { Show, splitProps } from 'solid-js'

import type { PolymorphicProps } from '@kobalte/core/polymorphic'

import { cn } from '../../../lib/utils'
import { ModalCloseButton } from './modal-close-button'

export type ModalHeaderProps<T extends ValidComponent = 'div'> = PolymorphicProps<T, {
  class?: string
  children?: JSX.Element
  showCloseButton?: boolean
  onClose?: () => void
  bordered?: boolean
}>

const ModalHeader = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, ModalHeaderProps<T>>,
) => {
  const [local, others] = splitProps(props as ModalHeaderProps, [
    'class',
    'children',
    'showCloseButton',
    'onClose',
    'bordered',
  ])

  const getHeaderClasses = () => {
    return cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      local.bordered && 'border-b pb-4',
      local.class,
    )
  }

  return (
    <div class={getHeaderClasses()} {...others}>
      <div class="flex items-center justify-between">
        <div class="flex-1">
          {local.children}
        </div>
        <Show when={local.showCloseButton}>
          <ModalCloseButton onClose={local.onClose} />
        </Show>
      </div>
    </div>
  )
}

export { ModalHeader }

