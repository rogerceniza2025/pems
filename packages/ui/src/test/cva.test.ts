/**
 * Class Variance Authority Utility Tests
 *
 * Tests for the CVA utility that provides type-safe variant systems
 */

import { describe, it, expect } from 'vitest'

describe('CVA Utility', () => {
  it('should export CVA functionality', () => {
    // This test verifies that the CVA system is available
    // Since we're using class-variance-authority as an external dependency,
    // we test that it's properly integrated

    expect(() => {
      const { cva } = require('class-variance-authority')
      expect(typeof cva).toBe('function')
    }).not.toThrow()
  })

  it('should handle variant creation patterns', () => {
    const { cva } = require('class-variance-authority')

    const buttonVariants = cva('inline-flex items-center justify-center', {
      variants: {
        variant: {
          default: 'bg-primary text-primary-foreground',
          destructive: 'bg-destructive text-destructive-foreground',
        },
        size: {
          default: 'h-10 px-4 py-2',
          sm: 'h-9 rounded-md px-3',
        },
      },
      defaultVariants: {
        variant: 'default',
        size: 'default',
      },
    })

    expect(buttonVariants()).toContain('bg-primary')
    expect(buttonVariants({ variant: 'destructive' })).toContain(
      'bg-destructive',
    )
    expect(buttonVariants({ size: 'sm' })).toContain('h-9')
  })

  it('should handle compound variants', () => {
    const { cva } = require('class-variance-authority')

    const complexVariants = cva('base-class', {
      variants: {
        variant: {
          primary: 'text-blue-500',
          secondary: 'text-gray-500',
        },
        size: {
          sm: 'text-sm',
          lg: 'text-lg',
        },
      },
      compoundVariants: [
        {
          variant: 'primary',
          size: 'lg',
          class: 'font-bold',
        },
      ],
    })

    const result = complexVariants({ variant: 'primary', size: 'lg' })
    expect(result).toContain('font-bold')
    expect(result).toContain('text-blue-500')
    expect(result).toContain('text-lg')
  })

  it('should handle responsive design utilities', () => {
    const { cva } = require('class-variance-authority')

    const responsiveVariants = cva('container', {
      variants: {
        responsive: {
          mobile: 'w-full',
          tablet: 'w-3/4',
          desktop: 'w-1/2',
        },
      },
    })

    const mobileClass = responsiveVariants({ responsive: 'mobile' })
    const desktopClass = responsiveVariants({ responsive: 'desktop' })

    expect(mobileClass).toContain('w-full')
    expect(desktopClass).toContain('w-1/2')
  })

  it('should handle empty variants gracefully', () => {
    const { cva } = require('class-variance-authority')

    const simpleVariants = cva('base-class', {
      variants: {
        variant: {
          primary: 'text-primary',
        },
      },
    })

    expect(simpleVariants()).toBe('base-class')
    expect(simpleVariants({ variant: 'primary' })).toContain('text-primary')
  })

  it('should handle invalid variant values', () => {
    const { cva } = require('class-variance-authority')

    const variants = cva('base', {
      variants: {
        variant: {
          primary: 'text-primary',
        },
      },
    })

    // Invalid variants should be ignored
    expect(variants({ variant: 'invalid' as any })).toBe('base')
  })
})
