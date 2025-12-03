import type { JSX, ValidComponent } from 'solid-js'
import { Show, splitProps } from 'solid-js'

import * as AccordionPrimitive from '@kobalte/core/accordion'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'

import { useReducedMotion } from '../../lib/animations'
import { cn } from '../../lib/utils'

// Enhanced accordion with better animations and keyboard navigation
const Accordion = AccordionPrimitive.Root

type AccordionItemProps<T extends ValidComponent = 'div'> =
  AccordionPrimitive.AccordionItemProps<T> & {
    class?: string | undefined
    animated?: boolean
    variant?: 'default' | 'bordered' | 'separated' | 'ghost'
  }

const AccordionItem = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, AccordionItemProps<T>>,
) => {
  const [local, others] = splitProps(props as AccordionItemProps, [
    'class',
    'animated',
    'variant',
  ])

  const prefersReducedMotion = useReducedMotion()

  const getItemClasses = () => {
    const variantClasses = {
      default: 'border-b',
      bordered: 'border rounded-lg mb-2',
      separated: 'border rounded-lg mb-4 shadow-sm',
      ghost: '',
    }

    return cn(
      variantClasses[local.variant ?? 'default'],
      local.animated &&
        !prefersReducedMotion() &&
        'transition-all duration-200 ease-in-out',
      local.class,
    )
  }

  return <AccordionPrimitive.Item class={getItemClasses()} {...others} />
}

type AccordionTriggerProps<T extends ValidComponent = 'button'> =
  AccordionPrimitive.AccordionTriggerProps<T> & {
    class?: string | undefined
    children?: JSX.Element
    icon?: JSX.Element
    iconPosition?: 'left' | 'right'
    showIndicator?: boolean
    indicatorVariant?: 'chevron' | 'plus' | 'arrow' | 'none'
    size?: 'sm' | 'md' | 'lg'
  }

const AccordionTrigger = <T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, AccordionTriggerProps<T>>,
) => {
  const [local, others] = splitProps(props as AccordionTriggerProps, [
    'class',
    'children',
    'icon',
    'iconPosition',
    'showIndicator',
    'indicatorVariant',
    'size',
  ])

  const prefersReducedMotion = useReducedMotion()

  const getSizeClasses = () => {
    const sizeClasses = {
      sm: 'py-2 text-sm',
      md: 'py-4 text-base',
      lg: 'py-6 text-lg',
    }

    return sizeClasses[local.size ?? 'md']
  }

  const getIndicator = () => {
    if (local.indicatorVariant === 'none' || local.showIndicator === false)
      return null

    switch (local.indicatorVariant) {
      case 'plus':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4 shrink-0 transition-transform duration-200"
          >
            <path d="M12 5v14M5 12h14" class="origin-center" />
          </svg>
        )
      case 'arrow':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4 shrink-0 transition-transform duration-200"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        )
      case 'chevron':
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4 shrink-0 transition-transform duration-200"
          >
            <path d="M6 9l6 6l6 -6" />
          </svg>
        )
    }
  }

  return (
    <AccordionPrimitive.Header class="flex">
      <AccordionPrimitive.Trigger
        class={cn(
          'flex flex-1 items-center justify-between font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'hover:bg-accent/50',
          'data-[expanded]:bg-accent',
          getSizeClasses(),
          !prefersReducedMotion() &&
            'hover:translate-x-1 data-[expanded]:translate-x-0',
          local.class,
        )}
        {...others}
      >
        {/* Left Icon */}
        <Show when={local.icon && local.iconPosition !== 'right'}>
          <span class="mr-2 shrink-0">{local.icon}</span>
        </Show>

        {/* Content */}
        <span class="flex-1 text-left">{local.children}</span>

        {/* Right Icon */}
        <Show when={local.icon && local.iconPosition === 'right'}>
          <span class="ml-2 shrink-0">{local.icon}</span>
        </Show>

        {/* Default Indicator */}
        <Show when={!local.icon}>{getIndicator()}</Show>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

type AccordionContentProps<T extends ValidComponent = 'div'> =
  AccordionPrimitive.AccordionContentProps<T> & {
    class?: string | undefined
    children?: JSX.Element
    animated?: boolean
    animationDuration?: number
    animationEasing?: string
  }

const AccordionContent = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, AccordionContentProps<T>>,
) => {
  const [local, others] = splitProps(props as AccordionContentProps, [
    'class',
    'children',
    'animated',
    'animationDuration',
    'animationEasing',
  ])

  const prefersReducedMotion = useReducedMotion()

  const getAnimationClasses = () => {
    if (!local.animated || prefersReducedMotion()) {
      return 'overflow-hidden text-sm'
    }

    return cn(
      'overflow-hidden text-sm',
      'transition-all',
      `duration-[${local.animationDuration ?? 300}ms]`,
      local.animationEasing && `ease-[${local.animationEasing}]`,
      'data-[expanded]:animate-in data-[expanded]:slide-in-from-top-2',
      'data-[closed]:animate-out data-[closed]:slide-out-to-top-2',
    )
  }

  return (
    <AccordionPrimitive.Content
      class={cn(getAnimationClasses(), local.class)}
      style={{
        'animation-duration': `${local.animationDuration ?? 300}ms`,
        'animation-timing-function': local.animationEasing ?? 'ease-in-out',
      }}
      {...others}
    >
      <div class="pb-4 pt-0">{local.children}</div>
    </AccordionPrimitive.Content>
  )
}

// Enhanced accordion with collapsible sections
type CollapsibleAccordionProps = {
  class?: string
  children?: JSX.Element
  allowMultiple?: boolean
  defaultOpen?: string[]
  onOpenChange?: (openItems: string[]) => void
  collapsible?: boolean
}

const CollapsibleAccordion = (props: CollapsibleAccordionProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'children',
    'allowMultiple',
    'defaultOpen',
    'onOpenChange',
    'collapsible',
  ])

  return (
    <Accordion
      class={local.class}
      multiple={local.allowMultiple}
      value={local.defaultOpen}
      onChange={local.onOpenChange}
      collapsible={local.collapsible ?? true}
      {...others}
    >
      {local.children}
    </Accordion>
  )
}

export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  CollapsibleAccordion,
}
export type {
  AccordionContentProps,
  AccordionItemProps,
  AccordionTriggerProps,
  CollapsibleAccordionProps,
}
