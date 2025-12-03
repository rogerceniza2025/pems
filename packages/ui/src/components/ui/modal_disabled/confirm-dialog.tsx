import { createSignal, Show, splitProps } from 'solid-js'

import { Button } from '../button'
import { Modal } from './modal'
import { ModalContent, ModalFooter, ModalHeader, ModalTitle } from './modal-header'

export type ConfirmDialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger' | 'warning'
  onConfirm?: () => void
  onCancel?: () => void
  loading?: boolean
}

const ConfirmDialog = (props: ConfirmDialogProps) => {
  const [local, others] = splitProps(props, [
    'open',
    'onOpenChange',
    'title',
    'message',
    'confirmText',
    'cancelText',
    'variant',
    'onConfirm',
    'onCancel',
    'loading',
  ])

  const [isConfirming, setIsConfirming] = createSignal(false)

  const handleConfirm = async () => {
    if (local.onConfirm) {
      setIsConfirming(true)
      try {
        await local.onConfirm()
        local.onOpenChange?.(false)
      } finally {
        setIsConfirming(false)
      }
    } else {
      local.onOpenChange?.(false)
    }
  }

  const handleCancel = () => {
    local.onCancel?.()
    local.onOpenChange?.(false)
  }

  const getVariantClasses = () => {
    const variants = {
      default: {
        icon: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700 text-white',
      },
      danger: {
        icon: 'text-red-600',
        button: 'bg-red-600 hover:bg-red-700 text-white',
      },
      warning: {
        icon: 'text-yellow-600',
        button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      },
    }

    return variants[local.variant ?? 'default']
  }

  const variantClasses = getVariantClasses()

  return (
    <Modal
      open={local.open}
      onOpenChange={local.onOpenChange}
      size="md"
      preventClose={local.loading ?? isConfirming()}
      {...others}
    >
      <ModalHeader>
        <div class="flex items-center gap-3">
          <div class={`flex-shrink-0 w-10 h-10 rounded-full bg-${local.variant === 'danger' ? 'red' : local.variant === 'warning' ? 'yellow' : 'blue'}-100 flex items-center justify-center`}>
            <svg
              class={`w-6 h-6 ${variantClasses.icon}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <Show
                when={local.variant === 'danger'}
                fallback={
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                }
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0z"
                />
              </Show>
            </svg>
          </div>
          <div class="flex-1">
            <ModalTitle>{local.title ?? 'Confirm Action'}</ModalTitle>
          </div>
        </div>
      </ModalHeader>
      
      <ModalContent>
        <p class="text-sm">
          {local.message ?? 'Are you sure you want to proceed? This action cannot be undone.'}
        </p>
      </ModalContent>
      
      <ModalFooter position="right">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={local.loading ?? isConfirming()}
        >
          {local.cancelText ?? 'Cancel'}
        </Button>
        <Button
          variant={local.variant === 'danger' ? 'destructive' : local.variant === 'warning' ? 'default' : 'default'}
          onClick={handleConfirm}
          loading={local.loading ?? isConfirming()}
          class="ml-2"
        >
          {local.confirmText ?? 'Confirm'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export { ConfirmDialog }

