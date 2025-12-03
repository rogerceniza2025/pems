export interface RippleEvent {
  id: string
  x: number
  y: number
  size: number
  timestamp: number
}

export const createRipple = (
  event: MouseEvent,
  container: HTMLElement,
  _color = 'rgba(255, 255, 255, 0.3)',
): RippleEvent => {
  const rect = container.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // Calculate ripple size (diagonal of container with some padding)
  const size = Math.max(rect.width, rect.height) * 2

  return {
    id: `ripple-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    x,
    y,
    size,
    timestamp: Date.now(),
  }
}

export const createRippleElement = (
  ripple: RippleEvent,
  color: string,
): HTMLElement => {
  const rippleElement = document.createElement('div')
  rippleElement.className =
    'absolute rounded-full pointer-events-none animate-ping'
  rippleElement.style.cssText = `
    left: ${ripple.x}px;
    top: ${ripple.y}px;
    width: ${ripple.size}px;
    height: ${ripple.size}px;
    transform: translate(-50%, -50%);
    background-color: ${color};
    opacity: 0.3;
  `

  return rippleElement
}

export const addRippleToContainer = (
  container: HTMLElement,
  event: MouseEvent,
  color = 'rgba(255, 255, 255, 0.3)',
): RippleEvent => {
  const ripple = createRipple(event, container, color)
  const rippleElement = createRippleElement(ripple, color)

  // Position container relatively if not already
  if (
    container.style.position !== 'relative' &&
    container.style.position !== 'absolute'
  ) {
    container.style.position = 'relative'
  }

  // Add overflow hidden to contain ripples
  if (container.style.overflow !== 'hidden') {
    container.style.overflow = 'hidden'
  }

  container.appendChild(rippleElement)

  // Remove ripple after animation completes
  setTimeout(() => {
    if (rippleElement.parentNode) {
      rippleElement.parentNode.removeChild(rippleElement)
    }
  }, 600) // Match the animation duration

  return ripple
}

// Utility to create multiple ripples for rapid clicks
export const createRippleHandler = (color = 'rgba(255, 255, 255, 0.3)') => {
  return (event: MouseEvent, container: HTMLElement): RippleEvent => {
    return addRippleToContainer(container, event, color)
  }
}

// Ripple animation variants
export const RIPPLE_VARIANTS = {
  // Default white ripple
  default: 'rgba(255, 255, 255, 0.3)',

  // Primary color ripple
  primary: 'rgba(59, 130, 246, 0.3)',

  // Destructive color ripple
  destructive: 'rgba(220, 38, 38, 0.3)',

  // Success color ripple
  success: 'rgba(34, 197, 94, 0.3)',

  // Warning color ripple
  warning: 'rgba(245, 158, 11, 0.3)',

  // Info color ripple
  info: 'rgba(14, 165, 233, 0.3)',
}

// Get ripple color based on button variant
export const getRippleColorForVariant = (variant: string): string => {
  switch (variant) {
    case 'primary':
      return RIPPLE_VARIANTS.primary
    case 'destructive':
      return RIPPLE_VARIANTS.destructive
    case 'success':
      return RIPPLE_VARIANTS.success
    case 'warning':
      return RIPPLE_VARIANTS.warning
    case 'info':
      return RIPPLE_VARIANTS.info
    default:
      return RIPPLE_VARIANTS.default
  }
}
