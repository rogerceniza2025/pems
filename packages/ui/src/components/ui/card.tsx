import type { JSX, ValidComponent } from 'solid-js'
import { splitProps } from 'solid-js'

import type { PolymorphicProps } from '@kobalte/core/polymorphic'

import { cn } from '../../lib/utils'

type CardProps<T extends ValidComponent = 'div'> = PolymorphicProps<
  T,
  {
    class?: string | undefined
    children?: JSX.Element
  }
>

const Card = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, CardProps<T>>,
) => {
  const [local, others] = splitProps(props as CardProps, ['class', 'children'])
  return (
    <div
      class={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        local.class,
      )}
      {...others}
    >
      {local.children}
    </div>
  )
}

type CardHeaderProps<T extends ValidComponent = 'div'> = PolymorphicProps<
  T,
  {
    class?: string | undefined
    children?: JSX.Element
  }
>

const CardHeader = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, CardHeaderProps<T>>,
) => {
  const [local, others] = splitProps(props as CardHeaderProps, [
    'class',
    'children',
  ])
  return (
    <div class={cn('flex flex-col space-y-1.5 p-6', local.class)} {...others}>
      {local.children}
    </div>
  )
}

type CardTitleProps<T extends ValidComponent = 'h3'> = PolymorphicProps<
  T,
  {
    class?: string | undefined
    children?: JSX.Element
  }
>

const CardTitle = <T extends ValidComponent = 'h3'>(
  props: PolymorphicProps<T, CardTitleProps<T>>,
) => {
  const [local, others] = splitProps(props as CardTitleProps, [
    'class',
    'children',
  ])
  return (
    <h3
      class={cn(
        'text-2xl font-semibold leading-none tracking-tight',
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
  }
>

const CardDescription = <T extends ValidComponent = 'p'>(
  props: PolymorphicProps<T, CardDescriptionProps<T>>,
) => {
  const [local, others] = splitProps(props as CardDescriptionProps, [
    'class',
    'children',
  ])
  return (
    <p class={cn('text-sm text-muted-foreground', local.class)} {...others}>
      {local.children}
    </p>
  )
}

type CardContentProps<T extends ValidComponent = 'div'> = PolymorphicProps<
  T,
  {
    class?: string | undefined
    children?: JSX.Element
  }
>

const CardContent = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, CardContentProps<T>>,
) => {
  const [local, others] = splitProps(props as CardContentProps, [
    'class',
    'children',
  ])
  return (
    <div class={cn('p-6 pt-0', local.class)} {...others}>
      {local.children}
    </div>
  )
}

type CardFooterProps<T extends ValidComponent = 'div'> = PolymorphicProps<
  T,
  {
    class?: string | undefined
    children?: JSX.Element
  }
>

const CardFooter = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, CardFooterProps<T>>,
) => {
  const [local, others] = splitProps(props as CardFooterProps, [
    'class',
    'children',
  ])
  return (
    <div class={cn('flex items-center p-6 pt-0', local.class)} {...others}>
      {local.children}
    </div>
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
export type {
  CardProps,
  CardHeaderProps,
  CardFooterProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
}
