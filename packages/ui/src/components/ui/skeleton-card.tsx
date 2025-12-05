import { For, Show, splitProps } from 'solid-js'
import { classNames } from '../../lib/utils'
import { Skeleton } from './skeleton'

export interface SkeletonCardProps {
  class?: string
  showAvatar?: boolean
  showTitle?: boolean
  showDescription?: boolean
  showFooter?: boolean
  lines?: number
  avatarSize?: 'sm' | 'md' | 'lg'
  titleWidth?: string | number
  descriptionLines?: number
  footerButtons?: number
}

export const SkeletonCard = (props: SkeletonCardProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'showAvatar',
    'showTitle',
    'showDescription',
    'showFooter',
    'lines',
    'avatarSize',
    'titleWidth',
    'descriptionLines',
    'footerButtons',
  ])

  const avatarSizeClass = () => {
    switch (local.avatarSize) {
      case 'sm':
        return 'w-8 h-8'
      case 'lg':
        return 'w-12 h-12'
      case 'md':
      default:
        return 'w-10 h-10'
    }
  }

  const getWidthPercentage = (index: number, total: number) => {
    return index === total - 1 ? '80%' : '100%'
  }

  return (
    <div class={classNames('rounded-lg border bg-card p-6', local.class)} {...others}>
      {/* Avatar and Title Section */}
      <Show when={(local.showAvatar ?? false) || (local.showTitle ?? false)}>
        <div class="flex items-center space-x-4 mb-4">
          {/* Avatar */}
          <Show when={local.showAvatar ?? false}>
            <Skeleton
              variant="circular"
              class={avatarSizeClass()}
              animation="shimmer"
            />
          </Show>

          {/* Title */}
          <Show when={local.showTitle ?? false}>
            <div class="space-y-2 flex-1">
              <Skeleton
                width={local.titleWidth ?? '60%'}
                height={24}
                variant="rounded"
                animation="shimmer"
              />
              <Skeleton width="40%" height={14} animation="shimmer" />
            </div>
          </Show>
        </div>
      </Show>

      {/* Description Lines */}
      <Show when={local.showDescription ?? false}>
        <div class="space-y-2 mb-4">
          <For
            each={Array.from({
              length: local.descriptionLines ?? local.lines ?? 3,
            })}
          >
            {(_, index) => (
              <Skeleton
                width={
                  index() ===
                  Number(local.descriptionLines ?? local.lines ?? 3) - 1
                    ? '80%'
                    : '100%'
                }
                height={16}
                animation="shimmer"
              />
            )}
          </For>
        </div>
      </Show>

      {/* Footer Buttons */}
      <Show when={local.showFooter ?? false}>
        <div class="flex justify-end space-x-2">
          <For each={Array.from({ length: local.footerButtons ?? 2 })}>
            {(_, index) => (
              <Skeleton
                width={getWidthPercentage(index(), local.footerButtons ?? 2)}
                height={32}
                variant="rounded"
                animation="shimmer"
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
