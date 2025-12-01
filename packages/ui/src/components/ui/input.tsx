import type { ValidComponent } from 'solid-js'
import { splitProps } from 'solid-js'

import * as TextFieldPrimitive from '@kobalte/core/text-field'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'

import { cn } from '../../lib/utils'

type TextFieldRootProps<T extends ValidComponent = 'div'> =
  TextFieldPrimitive.TextFieldRootProps<T> & {
    class?: string | undefined
  }

type TextFieldInputProps<T extends ValidComponent = 'input'> =
  TextFieldPrimitive.TextFieldInputProps<T> & {
    class?: string | undefined
  }

const Input = <T extends ValidComponent = 'input'>(
  props: PolymorphicProps<T, TextFieldInputProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldInputProps, ['class'])
  return (
    <TextFieldPrimitive.Root>
      <TextFieldPrimitive.Input
        class={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          local.class,
        )}
        {...others}
      />
    </TextFieldPrimitive.Root>
  )
}

export { Input }
export type { TextFieldRootProps, TextFieldInputProps }
