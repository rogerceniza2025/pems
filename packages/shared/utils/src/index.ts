// Utils package - to be populated with shared utility functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: Date): string {
  try {
    return date.toISOString().split('T')[0] ?? ''
  } catch {
    return ''
  }
}
