import { splitProps } from 'solid-js'
import { classNames } from '../../lib/utils'

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  class?: string
  animation?: 'pulse' | 'wave' | 'shimmer'
  speed?: 'slow' | 'normal' | 'fast'
}

export const Skeleton = (props: SkeletonProps) => {
  const [local, others] = splitProps(props, [
    'variant',
    'width',
    'height',
    'class',
    'animation',
    'speed',
  ])

  const animationClass = () => {
    switch (local.animation) {
      case 'wave':
        return 'animate-wave'
      case 'shimmer':
        return 'animate-shimmer'
      case 'pulse':
      default:
        return 'animate-pulse'
    }
  }

  const speedClass = () => {
    switch (local.speed) {
      case 'slow':
        return 'animation-duration-slow'
      case 'fast':
        return 'animation-duration-fast'
      case 'normal':
      default:
        return 'animation-duration-normal'
    }
  }

  const variantClass = () => {
    switch (local.variant) {
      case 'circular':
        return 'rounded-full'
      case 'rounded':
        return 'rounded-lg'
      case 'rectangular':
      default:
        return 'rounded'
    }
  }

  return (
    <div
      class={classNames(
        'bg-muted',
        animationClass(),
        speedClass(),
        variantClass(),
        local.class,
      )}
      style={{
        width:
          typeof local.width === 'number' ? `${local.width}px` : local.width,
        height:
          typeof local.height === 'number' ? `${local.height}px` : local.height,
      }}
      {...others}
    />
  )
}
