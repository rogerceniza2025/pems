import type { JSX, ValidComponent } from 'solid-js'
import { createSignal, Show, splitProps } from 'solid-js'

import type { PolymorphicProps } from '@kobalte/core/polymorphic'

import { useReducedMotion } from '../../lib/animations'
import { classNames } from '../../lib/utils'
import { SkeletonCard } from './skeleton-card'

// Card variants for different styles
const cardVariants = {
  base: 'rounded-lg border bg-card text-card-foreground transition-all duration-300 ease-in-out',
  shadow: {
    none: '',
    sm: 'shadow-sm hover:shadow-md',
    md: 'shadow-md hover:shadow-lg',
    lg: 'shadow-lg hover:shadow-xl',
    xl: 'shadow-xl hover:shadow-2xl',
  },
  hover: {
    none: '',
    lift: 'hover:-translate-y-1',
    scale: 'hover:scale-[1.02]',
    glow: 'hover:shadow-lg hover:shadow-primary/20',
    border: 'hover:border-primary',
  },
  interactive: {
    none: '',
    clickable: 'cursor-pointer active:scale-[0.98]',
    selectable:
      'cursor-pointer hover:ring-2 hover:ring-ring hover:ring-offset-2',
  },
}

type CardProps<T extends ValidComponent = 'div'> = PolymorphicProps<
  T,
  {
    class?: string | undefined
    children?: JSX.Element
    variant?: 'default' | 'outlined' | 'elevated' | 'filled'
    shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
    hover?: 'none' | 'lift' | 'scale' | 'glow' | 'border'
    interactive?: 'none' | 'clickable' | 'selectable'
    loading?: boolean
    loadingSkeleton?: JSX.Element
    onClick?: () => void
    onMouseEnter?: () => void
    onMouseLeave?: () => void
  }
>

const Card = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, CardProps<T>>,
) => {
  const [local, others] = splitProps(props as CardProps, [
    'class',
    'children',
    'variant',
    'shadow',
    'hover',
    'interactive',
    'loading',
    'loadingSkeleton',
    'onClick',
    'onMouseEnter',
    'onMouseLeave',
  ])

  const [isPressed, setIsPressed] = createSignal(false)
  const prefersReducedMotion = useReducedMotion()

  // Handle mouse events
  const handleMouseEnter = () => {
    local.onMouseEnter?.()
  }

  const handleMouseLeave = () => {
    local.onMouseLeave?.()
  }

  const handleMouseDown = () => {
    setIsPressed(true)
  }

  const handleMouseUp = () => {
    setIsPressed(false)
  }

  // Get card classes based on props
  const getCardClasses = () => {
    const variantClasses = {
      default: '',
      outlined: 'border-2',
      elevated: 'shadow-lg border-0',
      filled: 'border-0 bg-muted',
    }

    return classNames(
      cardVariants.base,
      variantClasses[local.variant ?? 'default'],
      cardVariants.shadow[local.shadow ?? 'sm'],
      !prefersReducedMotion() && cardVariants.hover[local.hover ?? 'none'],
      !prefersReducedMotion() &&
        cardVariants.interactive[local.interactive ?? 'none'],
      isPressed() && 'scale-[0.98]',
      local.class,
    )
  }

  return (
    <Show
      when={!local.loading}
      fallback={local.loadingSkeleton ?? <SkeletonCard />}
    >
      <div
        class={getCardClasses()}
        onClick={() => local.onClick?.()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        {...others}
      >
        {local.children}
      </div>
    </Show>
  )
}

type CardHeaderProps<T extends ValidComponent = 'div'> = PolymorphicProps<
  T,
  {
    class?: string | undefined
    children?: JSX.Element
    animated?: boolean
  }
>

const CardHeader = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, CardHeaderProps<T>>,
) => {
  const [local, others] = splitProps(props as CardHeaderProps, [
    'class',
    'children',
    'animated',
  ])

  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      class={classNames(
        'flex flex-col space-y-1.5 p-6',
        local.animated &&
          !prefersReducedMotion() &&
          'animate-in fade-in slide-in-from-top-2 duration-300',
        local.class,
      )}
      {...others}
    >
      {local.children}
    </div>
  )
}

type CardTitleProps<T extends ValidComponent = 'h3'> = PolymorphicProps<
  T,
  {
    class?: string | undefined
    children?: JSX.Element
    animated?: boolean
    gradient?: boolean
  }
>

const CardTitle = <T extends ValidComponent = 'h3'>(
  props: PolymorphicProps<T, CardTitleProps<T>>,
) => {
  const [local, others] = splitProps(props as CardTitleProps, [
    'class',
    'children',
    'animated',
    'gradient',
  ])

  const prefersReducedMotion = useReducedMotion()

  return (
    <h3
      class={classNames(
        'text-2xl font-semibold leading-none tracking-tight',
        local.gradient &&
          'bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent',
        local.animated &&
          !prefersReducedMotion() &&
          'animate-in fade-in slide-in-from-left-2 duration-300',
        local.class,
      )}
      {...others}
    >
      {local.children}
    </h3>
  )
}

type CardDescriptionProps<T extends ValidComponent = 'p'> = PolymorphicProps<
  T,
  {
    class?: string | undefined
    children?: JSX.Element
    animated?: boolean
  }
>

const CardDescription = <T extends ValidComponent = 'p'>(
  props: PolymorphicProps<T, CardDescriptionProps<T>>,
) => {
  const [local, others] = splitProps(props as CardDescriptionProps, [
    'class',
    'children',
    'animated',
  ])

  const prefersReducedMotion = useReducedMotion()

  return (
    <p
      class={classNames(
        'text-sm text-muted-foreground',
        local.animated &&
          !prefersReducedMotion() &&
          'animate-in fade-in slide-in-from-left-2 duration-300 delay-100',
        local.class,
      )}
      {...others}
    >
      {local.children}
    </p>
  )
}

type CardContentProps<T extends ValidComponent = 'div'> = PolymorphicProps<
  T,
  {
    class?: string | undefined
    children?: JSX.Element
    animated?: boolean
  }
>

const CardContent = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, CardContentProps<T>>,
) => {
  const [local, others] = splitProps(props as CardContentProps, [
    'class',
    'children',
    'animated',
  ])

  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      class={classNames(
        'p-6 pt-0',
        local.animated &&
          !prefersReducedMotion() &&
          'animate-in fade-in duration-300 delay-150',
        local.class,
      )}
      {...others}
    >
      {local.children}
    </div>
  )
}

type CardFooterProps<T extends ValidComponent = 'div'> = PolymorphicProps<
  T,
  {
    class?: string | undefined
    children?: JSX.Element
    animated?: boolean
    position?: 'left' | 'center' | 'right' | 'space-between'
  }
>

const CardFooter = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, CardFooterProps<T>>,
) => {
  const [local, others] = splitProps(props as CardFooterProps, [
    'class',
    'children',
    'animated',
    'position',
  ])

  const prefersReducedMotion = useReducedMotion()

  const getPositionClasses = () => {
    switch (local.position) {
      case 'left':
        return 'justify-start'
      case 'center':
        return 'justify-center'
      case 'right':
        return 'justify-end'
      case 'space-between':
        return 'justify-between'
      default:
        return 'items-center'
    }
  }

  return (
    <div
      class={classNames(
        'flex p-6 pt-0',
        getPositionClasses(),
        local.animated &&
          !prefersReducedMotion() &&
          'animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200',
        local.class,
      )}
      {...others}
    >
      {local.children}
    </div>
  )
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
export type {
  CardContentProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardProps,
  CardTitleProps,
}
