import type { JSX } from 'solid-js'
import { For, splitProps } from 'solid-js'

import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const tableVariants = cva(
  'w-full caption-bottom text-sm',
  {
    variants: {
      variant: {
        default: '',
        striped: '[&_.table-row:nth-child(even)_.table-cell]:bg-muted/50',
        bordered: 'border',
      },
      size: {
        default: '',
        compact: '[&_.table-cell]:py-1 [&_.table-head]:py-2',
        relaxed: '[&_.table-cell]:py-4 [&_.table-head]:py-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

const cellVariants = cva(
  'p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
  {
    variants: {
      variant: {
        default: '',
        header: 'font-medium text-muted-foreground h-12 px-4 text-left',
        footer: 'font-medium text-muted-foreground mt-4',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type TableProps = {
  class?: string
  children?: JSX.Element
  variant?: VariantProps<typeof tableVariants>['variant']
  size?: VariantProps<typeof tableVariants>['size']
}

export const Table = (props: TableProps) => {
  const [local, others] = splitProps(props, ['class', 'children', 'variant', 'size'])

  return (
    <div class="relative w-full overflow-auto">
      <table
        class={cn(tableVariants({ variant: local.variant, size: local.size }), local.class)}
        {...others}
      >
        {local.children}
      </table>
    </div>
  )
}

export type TableHeaderProps = {
  class?: string
  children?: JSX.Element
}

export const TableHeader = (props: TableHeaderProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <thead class={cn('[&_tr]:border-b', local.class)} {...others}>
      {local.children}
    </thead>
  )
}

export type TableBodyProps = {
  class?: string
  children?: JSX.Element
}

export const TableBody = (props: TableBodyProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <tbody
      class={cn('[&_tr:last-child]:border-0', local.class)}
      {...others}
    >
      {local.children}
    </tbody>
  )
}

export type TableFooterProps = {
  class?: string
  children?: JSX.Element
}

export const TableFooter = (props: TableFooterProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <tfoot
      class={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', local.class)}
      {...others}
    >
      {local.children}
    </tfoot>
  )
}

export type TableRowProps = {
  class?: string
  children?: JSX.Element
  selected?: boolean
}

export const TableRow = (props: TableRowProps) => {
  const [local, others] = splitProps(props, ['class', 'children', 'selected'])

  return (
    <tr
      class={cn(
        'border-b transition-colors hover:bg-muted/50',
        local.selected && 'bg-muted',
        local.class,
      )}
      {...others}
    >
      {local.children}
    </tr>
  )
}

export type TableHeadProps = {
  class?: string
  children?: JSX.Element
}

export const TableHead = (props: TableHeadProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <th
      class={cn(cellVariants({ variant: 'header' }), local.class)}
      {...others}
    >
      {local.children}
    </th>
  )
}

export type TableCellProps = {
  class?: string
  children?: JSX.Element
}

export const TableCell = (props: TableCellProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <td class={cn(cellVariants(), local.class)} {...others}>
      {local.children}
    </td>
  )
}

export type TableCaptionProps = {
  class?: string
  children?: JSX.Element
}

export const TableCaption = (props: TableCaptionProps) => {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <caption
      class={cn('mt-4 text-sm text-muted-foreground', local.class)}
      {...others}
    >
      {local.children}
    </caption>
  )
}

// Enhanced table components with additional features

export type TableCheckboxProps = {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  class?: string
}

export const TableCheckbox = (props: TableCheckboxProps) => {
  const [local, others] = splitProps(props, ['checked', 'onChange', 'disabled', 'class'])

  return (
    <div class={cn('flex items-center space-x-2', local.class)}>
      <input
        type="checkbox"
        checked={local.checked}
        onChange={(e) => local.onChange?.(e.target.checked)}
        disabled={local.disabled}
        class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
        {...others}
      />
    </div>
  )
}

export type TableSortProps = {
  column: string
  direction?: 'asc' | 'desc' | null
  onSort?: (column: string, direction: 'asc' | 'desc' | null) => void
  children?: JSX.Element
  class?: string
}

export const TableSort = (props: TableSortProps) => {
  const [local, others] = splitProps(props, ['column', 'direction', 'onSort', 'children', 'class'])

  const handleSort = () => {
    if (!local.onSort) return

    let newDirection: 'asc' | 'desc' | null = 'asc'
    if (local.direction === 'asc') {
      newDirection = 'desc'
    } else if (local.direction === 'desc') {
      newDirection = null
    }

    local.onSort(local.column, newDirection)
  }

  return (
    <button
      type="button"
      onClick={handleSort}
      class={cn(
        'flex items-center space-x-1 font-medium hover:text-primary transition-colors',
        local.class,
      )}
      {...others}
    >
      {local.children}
      <div class="flex flex-col">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class={cn(
            'transition-colors',
            local.direction === 'asc' ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class={cn(
            '-mt-1 transition-colors',
            local.direction === 'desc' ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </button>
  )
}

export type TablePaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange?: (page: number) => void
  pageSize?: number
  totalItems?: number
  class?: string
}

export const TablePagination = (props: TablePaginationProps) => {
  const [local, others] = splitProps(props, [
    'currentPage',
    'totalPages',
    'onPageChange',
    'pageSize',
    'totalItems',
    'class',
  ])

  const showPages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (
      let i = Math.max(2, local.currentPage - delta);
      i <= Math.min(local.totalPages - 1, local.currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    if (local.currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (local.currentPage + delta < local.totalPages - 1) {
      rangeWithDots.push('...', local.totalPages)
    } else if (local.totalPages > 1) {
      rangeWithDots.push(local.totalPages)
    }

    return rangeWithDots
  }

  return (
    <div
      class={cn(
        'flex items-center justify-between px-2 py-4 space-x-2',
        local.class,
      )}
      {...others}
    >
      <div class="text-sm text-muted-foreground">
        {local.totalItems && local.pageSize && (
          <span>
            Showing {((local.currentPage - 1) * local.pageSize) + 1} to{' '}
            {Math.min(local.currentPage * local.pageSize, local.totalItems)} of{' '}
            {local.totalItems} results
          </span>
        )}
      </div>
      
      <div class="flex items-center space-x-2">
        <button
          onClick={() => local.onPageChange?.(local.currentPage - 1)}
          disabled={local.currentPage <= 1}
          class="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        <div class="flex items-center space-x-1">
          <For each={showPages()}>
            {(page) => (
              <button
                onClick={() => typeof page === 'number' && local.onPageChange?.(page)}
                disabled={typeof page !== 'number'}
                class={cn(
                  'px-3 py-1 text-sm border rounded-md',
                  page === local.currentPage
                    ? 'bg-primary text-primary-foreground'
                    : typeof page === 'number'
                    ? 'hover:bg-muted'
                    : 'cursor-default opacity-50',
                )}
              >
                {page}
              </button>
            )}
          </For>
        </div>
        
        <button
          onClick={() => local.onPageChange?.(local.currentPage + 1)}
          disabled={local.currentPage >= local.totalPages}
          class="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export type TableSearchProps = {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  class?: string
}

export const TableSearch = (props: TableSearchProps) => {
  const [local, others] = splitProps(props, ['value', 'onChange', 'placeholder', 'class'])

  return (
    <div class={cn('relative', local.class)} {...others}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={local.value}
        onInput={(e) => local.onChange?.(e.target.value)}
        placeholder={local.placeholder ?? 'Search...'}
        class="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
    </div>
  )
}