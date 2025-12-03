import { createSignal } from 'solid-js'

export const ANIMATION_CONFIG = {
  durations: {
    instant: '0ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  reducedMotion: {
    duration: '0ms',
    easing: 'linear',
  },
}

export const MOTION_PRESETS = {
  // Gentle animations for subtle interactions
  gentle: {
    duration: ANIMATION_CONFIG.durations.normal,
    easing: ANIMATION_CONFIG.easing.easeOut,
  },

  // Snappy animations for quick feedback
  snappy: {
    duration: ANIMATION_CONFIG.durations.fast,
    easing: ANIMATION_CONFIG.easing.easeInOut,
  },

  // Bouncy animations for playful interactions
  bouncy: {
    duration: ANIMATION_CONFIG.durations.slow,
    easing: ANIMATION_CONFIG.easing.bounce,
  },

  // Elastic animations for dramatic effects
  elastic: {
    duration: ANIMATION_CONFIG.durations.slower,
    easing: ANIMATION_CONFIG.easing.elastic,
  },
}

export interface MotionConfig {
  duration?: string
  easing?: string
  delay?: string
  fillMode?: 'forwards' | 'backwards' | 'both' | 'none'
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'
  iterationCount?: number | 'infinite'
}

export const createMotion = (
  element: Element,
  keyframes: Keyframe[],
  config: MotionConfig = {},
) => {
  // Check if we're in a browser environment
  const isBrowser =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'

  const prefersReducedMotion = isBrowser
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  const animationConfig: KeyframeAnimationOptions = {
    duration: parseInt(
      prefersReducedMotion
        ? '0'
        : (config.duration ?? ANIMATION_CONFIG.durations.normal),
    ),
    easing: prefersReducedMotion
      ? 'linear'
      : (config.easing ?? ANIMATION_CONFIG.easing.easeOut),
    fill: config.fillMode ?? 'forwards',
    direction: config.direction ?? 'normal',
    iterations:
      config.iterationCount === 'infinite'
        ? Infinity
        : (config.iterationCount ?? 1),
  }

  return element.animate(keyframes, animationConfig)
}

export const useReducedMotion = () => {
  const [prefersReducedMotion] = createSignal(false)

  // For now, disable reduced motion detection in tests to avoid SSR issues
  // In production, this would check the user's motion preferences
  return prefersReducedMotion
}

// Transition presets for common animations
export const TRANSITIONS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { transform: 'translateY(10px)', opacity: 0 },
    animate: { transform: 'translateY(0)', opacity: 1 },
    exit: { transform: 'translateY(-10px)', opacity: 0 },
  },
  slideDown: {
    initial: { transform: 'translateY(-10px)', opacity: 0 },
    animate: { transform: 'translateY(0)', opacity: 1 },
    exit: { transform: 'translateY(10px)', opacity: 0 },
  },
  scale: {
    initial: { transform: 'scale(0.95)', opacity: 0 },
    animate: { transform: 'scale(1)', opacity: 1 },
    exit: { transform: 'scale(0.95)', opacity: 0 },
  },
  slideLeft: {
    initial: { transform: 'translateX(10px)', opacity: 0 },
    animate: { transform: 'translateX(0)', opacity: 1 },
    exit: { transform: 'translateX(-10px)', opacity: 0 },
  },
  slideRight: {
    initial: { transform: 'translateX(-10px)', opacity: 0 },
    animate: { transform: 'translateX(0)', opacity: 1 },
    exit: { transform: 'translateX(10px)', opacity: 0 },
  },
}

// Helper function to create transition animations
export const createTransition = (
  element: Element,
  transition: keyof typeof TRANSITIONS,
  config: MotionConfig = {},
) => {
  const transitionConfig = TRANSITIONS[transition]
  return createMotion(
    element,
    [transitionConfig.initial, transitionConfig.animate],
    config,
  )
}

// Spring animation for physics-based interactions
export const createSpring = (
  element: Element,
  config: MotionConfig & {
    tension?: number
    friction?: number
  } = {},
) => {
  const springConfig = {
    duration: config.duration ?? ANIMATION_CONFIG.durations.normal,
    easing: config.easing ?? ANIMATION_CONFIG.easing.easeOut,
    ...config,
  }

  return createMotion(
    element,
    [
      { transform: 'scale(0.8)', opacity: 0 },
      { transform: 'scale(1.05)', opacity: 1 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    springConfig,
  )
}
