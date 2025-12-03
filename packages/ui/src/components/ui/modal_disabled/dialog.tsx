import type { JSX } from 'solid-js'
import { Show, splitProps } from 'solid-js'

import { Button } from '../button'
import { Modal } from './modal'
import { ModalContent, ModalFooter, ModalHeader, ModalTitle } from './modal-header'

export type DialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  trigger?: JSX.Element
  children?: JSX.Element
  footer?: JSX.Element
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const Dialog = (props: DialogProps) => {
  const [local, others] = splitProps(props, [
    'open',
    'onOpenChange',
    'title',
    'description',
    'trigger',
    'children',
    'footer',
    'size',
  ])

  const handleOpen = () => {
    local.onOpenChange?.(true)
  }

  const handleClose = () => {
    local.onOpenChange?.(false)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      local.onOpenChange?.(false)
    }
  }

  return (
    <>
      <Show when={local.trigger}>
        <Button onClick={handleOpen}>
          {local.trigger}
        </Button>
      </Show>

      <Modal
        open={local.open}
        onOpenChange={local.onOpenChange}
        size={local.size ?? 'md'}
        onKeyDown={handleKeyDown}
        {...others}
      >
        <Show when={local.title ?? local.description}>
          <ModalHeader>
            <ModalTitle>{local.title}</ModalTitle>
            <Show when={local.description}>
              <p class="text-sm text-muted-foreground mt-1">
                {local.description}
              </p>
            </Show>
          </ModalHeader>
        </Show>

        <ModalContent>
          {local.children}
        </ModalContent>

        <Show when={local.footer}>
          <ModalFooter>
            {local.footer}
          </ModalFooter>
        </Show>
      </Modal>
    </>
  )
}

export { Dialog }

