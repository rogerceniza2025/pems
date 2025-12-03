import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import bcrypt from 'bcryptjs'
import { Password } from '../../../modules/user-management/src/domain/value-objects/password'

// Mock bcrypt for consistent testing
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
    genSalt: vi.fn(),
  },
}))

describe('Password Value Object', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Password Creation', () => {
    it('should create a valid password with minimum requirements', async () => {
      const mockHash = 'hashed_password_123'
      vi.mocked(bcrypt.hash).mockResolvedValue(mockHash)
      vi.mocked(bcrypt.genSalt).mockResolvedValue('salt_123')

      const password = await Password.create('Password123!')

      expect(password.getValue()).toBe(mockHash)
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 'salt_123')
      expect(bcrypt.genSalt).toHaveBeenCalledWith(12)
    })

    it('should fail creation for passwords shorter than 8 characters', async () => {
      await expect(Password.create('Pass1!')).rejects.toThrow(
        'Password must be at least 8 characters long'
      )
    })

    it('should fail creation for passwords without uppercase letters', async () => {
      await expect(Password.create('password123!')).rejects.toThrow(
        'Password must contain at least one uppercase letter'
      )
    })

    it('should fail creation for passwords without lowercase letters', async () => {
      await expect(Password.create('PASSWORD123!')).rejects.toThrow(
        'Password must contain at least one lowercase letter'
      )
    })

    it('should fail creation for passwords without numbers', async () => {
      await expect(Password.create('Password!')).rejects.toThrow(
        'Password must contain at least one number'
      )
    })

    it('should fail creation for passwords without special characters', async () => {
      await expect(Password.create('Password123')).rejects.toThrow(
        'Password must contain at least one special character'
      )
    })

    it('should fail creation for passwords with repeated character patterns', async () => {
      await expect(Password.create('Password111!!!')).rejects.toThrow(
        'Password cannot contain repeated character patterns'
      )
    })

    it('should create password from existing hash', () => {
      const existingHash = '$2a$12$existinghashvalue12345678901234567890123456789012'
      const password = Password.fromHash(existingHash)

      expect(password.getValue()).toBe(existingHash)
    })
  })

  describe('Password Verification', () => {
    it('should verify correct password successfully', async () => {
      const password = Password.fromHash('hashed_password_123')
      vi.mocked(bcrypt.compare).mockResolvedValue(true)

      const result = await password.verify('correct_password')

      expect(result).toBe(true)
      expect(bcrypt.compare).toHaveBeenCalledWith('correct_password', 'hashed_password_123')
    })

    it('should reject incorrect password', async () => {
      const password = Password.fromHash('hashed_password_123')
      vi.mocked(bcrypt.compare).mockResolvedValue(false)

      const result = await password.verify('incorrect_password')

      expect(result).toBe(false)
      expect(bcrypt.compare).toHaveBeenCalledWith('incorrect_password', 'hashed_password_123')
    })
  })

  describe('Password Strength Validation', () => {
    it('should calculate password strength correctly', () => {
      expect(Password.calculateStrength('Password123!')).toBeGreaterThan(3)
      expect(Password.calculateStrength('weak')).toBeLessThan(2)
      expect(Password.calculateStrength('VeryStrongPassword123!@#')).toBe(5)
    })

    it('should provide strength feedback', () => {
      const weakFeedback = Password.getStrengthFeedback('weak')
      expect(weakFeedback).toContain('at least 8 characters')

      const strongFeedback = Password.getStrengthFeedback('Password123!')
      expect(strongFeedback).toBe('Strong password')
    })
  })

  describe('Password Policy Validation', () => {
    it('should validate all password requirements', () => {
      const validPassword = 'SecurePass123!'
      const result = Password.validatePolicy(validPassword)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return detailed error messages for invalid passwords', () => {
      const invalidPassword = 'weak'
      const result = Password.validatePolicy(invalidPassword)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
      expect(result.errors).toContain('Password must contain at least one number')
      expect(result.errors).toContain('Password must contain at least one special character')
    })
  })
})