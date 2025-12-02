export const createDebounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
  immediate = false,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let lastCallTime = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()

    // If immediate is true and this is the first call, execute immediately
    if (immediate && !timeout) {
      timeout = setTimeout(() => {
        timeout = null
      }, wait)
      return func(...args)
    }

    // Clear existing timeout
    if (timeout) {
      clearTimeout(timeout)
    }

    // Set new timeout
    timeout = setTimeout(
      () => {
        timeout = null
        lastCallTime = now
        func(...args)
      },
      wait - (now - lastCallTime),
    )

    return
  }
}

// Debounce with leading edge execution
export const createDebounceLeading = <
  T extends (...args: unknown[]) => unknown,
>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    // Execute immediately if this is the first call
    if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null
      }, wait)
      return func(...args)
    }

    // Clear existing timeout
    if (timeout) {
      clearTimeout(timeout)
    }

    // Set new timeout
    timeout = setTimeout(() => {
      timeout = null
      func(...args)
    }, wait)

    return
  }
}

// Debounce with trailing edge execution
export const createDebounceTrailing = <
  T extends (...args: unknown[]) => unknown,
>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    // Clear existing timeout
    if (timeout) {
      clearTimeout(timeout)
    }

    // Set new timeout
    timeout = setTimeout(() => {
      timeout = null
      func(...args)
    }, wait)

    return
  }
}

// Throttle function for rate limiting
export const createThrottle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let lastCallTime = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()

    // If within wait period, ignore
    if (now - lastCallTime < wait) {
      return
    }

    lastCallTime = now

    // Execute function
    return func(...args)
  }
}

// Utility to cancel debounced function
export const cancelDebounce = (
  _debouncedFn: ReturnType<typeof createDebounce>,
) => {
  // This is a simplified version - in a real implementation,
  // you might want to return a cancel function from createDebounce
  // eslint-disable-next-line no-console
  console.warn(
    'cancelDebounce is a placeholder - implement proper cancel logic in createDebounce',
  )
}
