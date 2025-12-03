import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate } from './index'

describe('Shared Utils', () => {
  describe('formatCurrency', () => {
    it('should format currency correctly for positive numbers', () => {
      expect(formatCurrency(123.45)).toBe('$123.45')
    })

    it('should format currency correctly for whole numbers', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00')
    })

    it('should format currency correctly for zero', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should format currency correctly for negative numbers', () => {
      expect(formatCurrency(-50.25)).toBe('-$50.25')
    })

    it('should handle decimal places correctly', () => {
      expect(formatCurrency(0.5)).toBe('$0.50')
      expect(formatCurrency(0.99)).toBe('$0.99')
    })
  })

  describe('formatDate', () => {
    it('should format date to ISO string', () => {
      const date = new Date('2023-12-25T10:30:00.000Z')
      expect(formatDate(date)).toBe('2023-12-25')
    })

    it('should handle date with time components', () => {
      const date = new Date('2023-01-01T15:45:30.123Z')
      expect(formatDate(date)).toBe('2023-01-01')
    })

    it('should handle edge case dates', () => {
      const leapYear = new Date('2020-02-29T00:00:00.000Z')
      expect(formatDate(leapYear)).toBe('2020-02-29')
    })

    it('should handle invalid dates gracefully', () => {
      const invalidDate = new Date('invalid')
      const result = formatDate(invalidDate)
      // Invalid dates in our implementation return empty string
      expect(result).toBe('')
    })

    it('should handle current date', () => {
      const now = new Date()
      const expected = now.toISOString().split('T')[0]
      expect(formatDate(now)).toBe(expected)
    })
  })
})