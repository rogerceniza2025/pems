import { createMotion } from './animations'

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
  slideUpScale: {
    initial: { transform: 'translateY(10px) scale(0.95)', opacity: 0 },
    animate: { transform: 'translateY(0) scale(1)', opacity: 1 },
    exit: { transform: 'translateY(-10px) scale(0.95)', opacity: 0 },
  },
  slideDownScale: {
    initial: { transform: 'translateY(-10px) scale(0.95)', opacity: 0 },
    animate: { transform: 'translateY(0) scale(1)', opacity: 1 },
    exit: { transform: 'translateY(10px) scale(0.95)', opacity: 0 },
  },
  collapseVertical: {
    initial: { height: '0px', opacity: 0 },
    animate: { height: 'auto', opacity: 1 },
    exit: { height: '0px', opacity: 0 },
  },
  expandHorizontal: {
    initial: { width: '0px', opacity: 0 },
    animate: { width: 'auto', opacity: 1 },
    exit: { width: '0px', opacity: 0 },
  },
}

export interface TransitionConfig {
  duration?: string
  easing?: string
  delay?: string
  fillMode?: 'forwards' | 'backwards' | 'both' | 'none'
}

export const createTransition = (
  element: Element,
  transition: keyof typeof TRANSITIONS,
  config: TransitionConfig = {},
) => {
  const transitionConfig = TRANSITIONS[transition]
  return createMotion(
    element,
    [transitionConfig.initial, transitionConfig.animate],
    config,
  )
}

export const createExitTransition = (
  element: Element,
  transition: keyof typeof TRANSITIONS,
  config: TransitionConfig = {},
) => {
  const transitionConfig = TRANSITIONS[transition]
  return createMotion(
    element,
    [transitionConfig.animate, transitionConfig.exit],
    config,
  )
}

// Preset transition combinations
export const TRANSITION_PRESETS = {
  // Gentle fade in/out
  gentleFade: {
    enterTransition: 'fadeIn',
    exitTransition: 'fadeIn',
    config: { duration: '200ms', easing: 'ease-out' },
  },

  // Snappy slide up/down
  snappySlide: {
    enterTransition: 'slideUp',
    exitTransition: 'slideDown',
    config: { duration: '150ms', easing: 'ease-in-out' },
  },

  // Bouncy scale
  bouncyScale: {
    enterTransition: 'scale',
    exitTransition: 'scale',
    config: {
      duration: '300ms',
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  // Smooth slide with scale
  smoothSlideScale: {
    enterTransition: 'slideUpScale',
    exitTransition: 'slideDownScale',
    config: { duration: '250ms', easing: 'ease-out' },
  },
}

// Helper function to apply preset transitions
export const applyPresetTransition = (
  element: Element,
  preset: keyof typeof TRANSITION_PRESETS,
  isEntering = true,
) => {
  const transitionConfig = TRANSITION_PRESETS[preset]
  const transition = isEntering
    ? transitionConfig.enterTransition
    : transitionConfig.exitTransition

  return createTransition(
    element,
    transition as keyof typeof TRANSITIONS,
    transitionConfig.config,
  )
}
