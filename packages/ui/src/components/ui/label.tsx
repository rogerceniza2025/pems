import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'

import { classNames } from '../../lib/utils'

type LabelProps = {
  class?: string | undefined
  children?: JSX.Element
  for?: string
} & JSX.LabelHTMLAttributes<HTMLLabelElement>

const Label = (props: LabelProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])
  return (
    <label
      class={classNames(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        local.class,
      )}
      {...others}
    >
      {local.children}
    </label>
  )
}

export { Label }
export type { LabelProps }
