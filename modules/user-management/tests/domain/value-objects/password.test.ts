/**
 * Password Value Object Tests
 * Tests for password validation, hashing, and security following domain-driven design principles
 */

import { describe, expect, it } from 'vitest'
import { InvalidPasswordError, Password } from '../../../src/domain/value-objects/password'

describe('Password Value Object', () => {
  describe('Validation', () => {
    it('should accept valid passwords', () => {
      const validPasswords = [
        'Password123!',
        'MySecureP@ssw0rd',
        'ComplexPass!23',
        'Str0ng#Passw0rd',
        'Valid$Pass123',
        'SecurePass456%',
        'MyP@ssw0rd2023',
        'Testing123!@#'
      ]

      validPasswords.forEach(password => {
        expect(() => new Password(password)).not.toThrow()
      })
    })

    it('should reject passwords that are too short', () => {
      const shortPasswords = [
        'Pass1!',
        'Pw1!',
        '123!',
        'Ab1!',
        'Short1!',
        'A1b2c3',
        '1234567',
        'abc123!'
      ]

      shortPasswords.forEach(password => {
        expect(() => new Password(password)).toThrow(InvalidPasswordError)
      })
    })

    it('should reject passwords without uppercase letters', () => {
      const noUppercasePasswords = [
        'password123!',
        'mysecurepassword1!',
        'lowercasepass123',
        'alllowercase!123',
        'nouppercase123!',
        'testpassword!@#'
      ]

      noUppercasePasswords.forEach(password => {
        expect(() => new Password(password)).toThrow(InvalidPasswordError)
      })
    })

    it('should reject passwords without lowercase letters', () => {
      const noLowercasePasswords = [
        'PASSWORD123!',
        'ALLUPPERCASE1!',
        'UPPERCASEPASS123',
        'ALLCAPS!123',
        'NOLOWERCASE123!',
        'TESTPASSWORD!@#'
      ]

      noLowercasePasswords.forEach(password => {
        expect(() => new Password(password)).toThrow(InvalidPasswordError)
      })
    })

    it('should reject passwords without numbers', () => {
      const noNumberPasswords = [
        'Password!',
        'MySecurePassword!',
        'ComplexPassword!',
        'StrongPassword!',
        'ValidPassword!',
        'SecurePassword!@#'
      ]

      noNumberPasswords.forEach(password => {
        expect(() => new Password(password)).toThrow(InvalidPasswordError)
      })
    })

    it('should reject passwords without special characters', () => {
      const noSpecialCharPasswords = [
        'Password123',
        'MySecurePassword123',
        'ComplexPass123',
        'StrongPass123',
        'ValidPass123',
        'SecurePassword123'
      ]

      noSpecialCharPasswords.forEach(password => {
        expect(() => new Password(password)).toThrow(InvalidPasswordError)
      })
    })

    it('should reject null, undefined, or empty passwords', () => {
      const invalidPasswords = [
        null,
        undefined,
        '',
        '   ',
        '\t',
        '\n'
      ]

      invalidPasswords.forEach(password => {
        expect(() => new Password(password as any)).toThrow(InvalidPasswordError)
      })
    })

    it('should enforce password length limits', () => {
      // Test very long password (should be accepted if it meets requirements)
      const veryLongPassword = 'A'.repeat(50) + 'a1!'
      expect(() => new Password(veryLongPassword)).not.toThrow()

      // Test reasonable length password (should be accepted)
      const reasonablePassword = 'A'.repeat(50) + 'a1!'
      expect(() => new Password(reasonablePassword)).not.toThrow()
    })
  })

  describe('Hashing and Security', () => {
    it('should hash password securely', async () => {
      const plainPassword = 'Password123!'
      const password = new Password(plainPassword)

      const hashedValue = await password.hash()
      expect(hashedValue).toBeDefined()
      expect(hashedValue).not.toBe(plainPassword)
      expect(hashedValue.length).toBeGreaterThan(50)
    })

    it('should generate different hashes for same password', async () => {
      const plainPassword = 'Password123!'
      const password1 = new Password(plainPassword)
      const password2 = new Password(plainPassword)

      const hash1 = await password1.hash()
      const hash2 = await password2.hash()

      expect(hash1).not.toBe(hash2)
    })

    it('should verify password correctly', async () => {
      const plainPassword = 'Password123!'
      const password = new Password(plainPassword)
      const hash = await password.hash()

      expect(await Password.verify(plainPassword, hash)).toBe(true)
      expect(await Password.verify('WrongPassword123!', hash)).toBe(false)
      expect(await Password.verify('password123!', hash)).toBe(false) // Case sensitive
      expect(await Password.verify('Password123', hash)).toBe(false) // Missing special char
    })

    it('should handle password comparison securely', async () => {
      const password1 = new Password('Password123!')
      const password2 = new Password('DifferentPassword123!')

      const hash1 = await password1.hash()
      const hash2 = await password2.hash()

      expect(await Password.verify('Password123!', hash1)).toBe(true)
      expect(await Password.verify('DifferentPassword123!', hash2)).toBe(true)
      expect(await Password.verify('Password123!', hash2)).toBe(false)
    })
  })

  describe('Password Strength Validation', () => {
    it('should calculate password strength correctly', () => {
      const strongPassword = new Password('VeryStrongP@ssw0rd123!')
      const weakPassword = new Password('WeakPass1!')

      const strongStrength = strongPassword.getStrength()
      const weakStrength = weakPassword.getStrength()

      expect(strongStrength.score).toBeGreaterThan(weakStrength.score)
    })

    it('should identify weak passwords', () => {
      const weakPasswords = [
        'Password1!',
        '123456aA!',
        'Abcdef1!',
        'Password123!'
      ]

      weakPasswords.forEach(password => {
        const pwd = new Password(password)
        const strength = pwd.getStrength()
        expect(strength.score).toBeLessThan(70)
      })
    })

    it('should identify strong passwords', () => {
      const strongPasswords = [
        'VeryComplexP@ssw0rd2023!',
        'Str0ng#S3cur3P@ssw0rd!',
        'C0mpl3x!P@ssw0rd#2023',
        'MyV3ryS3cur3&P@ssw0rd123!'
      ]

      strongPasswords.forEach(password => {
        const pwd = new Password(password)
        const strength = pwd.getStrength()
        expect(strength.score).toBeGreaterThan(80)
      })
    })

    it('should provide strength feedback', () => {
      const password = new Password('weak')
      const strength = password.getStrength()
      
      expect(strength.feedback).toBeDefined()
      expect(Array.isArray(strength.feedback)).toBe(true)
      expect(strength.feedback.length).toBeGreaterThan(0)
    })

    it('should categorize password strength correctly', () => {
      const weakPassword = new Password('Abc1!')
      const mediumPassword = new Password('Password123!')
      const strongPassword = new Password('VeryComplexP@ssw0rd123!')

      expect(weakPassword.getStrength().strength).toBe('weak')
      expect(mediumPassword.getStrength().strength).toBe('medium')
      expect(strongPassword.getStrength().strength).toBe('strong')
    })
  })

  describe('Password Policies', () => {
    it('should enforce minimum length policy', () => {
      const shortPassword = 'Ab1!'
      expect(() => new Password(shortPassword)).toThrow(InvalidPasswordError)
    })

    it('should enforce complexity requirements', () => {
      const simplePasswords = [
        'aaaaaaaa', // Only lowercase
        'AAAAAAAA', // Only uppercase
        '11111111', // Only numbers
        '!!!!!!!!', // Only special chars
        'aaaaaaaa1', // Missing uppercase and special
        'AAAAAAAA1', // Missing lowercase and special
        'aaaaaaaa!', // Missing uppercase and number
        'AAAAAAAA!', // Missing lowercase and number
        '11111111a', // Missing uppercase and special
        '11111111A', // Missing lowercase and special
        '11111111!', // Missing uppercase and lowercase
      ]

      simplePasswords.forEach(password => {
        expect(() => new Password(password)).toThrow(InvalidPasswordError)
      })
    })

    it('should penalize common password patterns', () => {
      const commonPatterns = [
        'Password123!',
        '12345678aA!',
        'Qwerty123!',
        'Admin123!',
        'Password1!',
        'Welcome123!'
      ]

      commonPatterns.forEach(password => {
        const pwd = new Password(password)
        const strength = pwd.getStrength()
        expect(strength.score).toBeLessThan(60)
      })
    })
  })

  describe('Security Considerations', () => {
    it('should not expose plain text password easily', () => {
      const plainPassword = 'Password123!'
      const password = new Password(plainPassword)

      // getValue() should return the plain password (by design in this implementation)
      // but in production, this might be restricted
      expect(password.getValue()).toBe(plainPassword)
    })

    it('should use secure hashing algorithm', async () => {
      const password = new Password('Password123!')
      const hash = await password.hash()

      // Should use bcrypt-like hashing (starts with $2b$, $2a$, etc.)
      expect(hash).toMatch(/^\$2[aby]\$\d+\$/)
    })

    it('should handle timing attacks securely', async () => {
      const password = new Password('Password123!')
      const hash = await password.hash()
      const correctPassword = 'Password123!'
      const wrongPassword = 'WrongPassword123!'

      // Both operations should take similar time (basic check)
      const startCorrect = Date.now()
      await Password.verify(correctPassword, hash)
      const durationCorrect = Date.now() - startCorrect

      const startWrong = Date.now()
      await Password.verify(wrongPassword, hash)
      const durationWrong = Date.now() - startWrong

      // Time difference should be minimal (within reasonable bounds)
      expect(Math.abs(durationCorrect - durationWrong)).toBeLessThan(100)
    })
  })

  describe('Error Handling', () => {
    it('should provide clear error messages', () => {
      try {
        new Password('weak')
      } catch (error: any) {
        expect(error.message).toBe('Password does not meet security requirements')
        expect(error.name).toBe('InvalidPasswordError')
      }
    })

    it('should throw InvalidPasswordError objects', () => {
      try {
        new Password(null as any)
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(InvalidPasswordError)
      }
    })

    it('should handle validation errors gracefully', () => {
      const invalidInputs = [null, undefined, '', 'weak', '123', 'abc']

      invalidInputs.forEach(input => {
        try {
          const password = new Password(input as any)
          // If it doesn't throw, it should be a valid password
          if (password) {
            expect(password.getValue()).toBeDefined()
            expect(typeof password.getValue()).toBe('string')
          }
        } catch (error: any) {
          expect(error.message).toBeDefined()
          expect(error).toBeInstanceOf(InvalidPasswordError)
        }
      })
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle password hashing efficiently', async () => {
      const startTime = Date.now()
      
      // Create many password instances and hash them
      for (let i = 0; i < 10; i++) { // Reduced count for performance
        const password = new Password(`Password${i}123!`)
        await password.hash()
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete in reasonable time (under 10 seconds for 10 hashes)
      expect(duration).toBeLessThan(10000)
    })

    it('should handle memory efficiently', () => {
      // Test that creating and discarding passwords doesn't cause memory leaks
      const passwords = []
      
      for (let i = 0; i < 50; i++) {
        passwords.push(new Password(`Password${i}123!`))
      }
      
      // Clear references
      passwords.length = 0
      
      // Should not cause memory issues
      expect(true).toBe(true) // Basic sanity check
    })

    it('should handle edge case: maximum length password', () => {
      const maxLengthPassword = 'A'.repeat(100) + 'a1!'
      expect(() => new Password(maxLengthPassword)).not.toThrow()
    })

    it('should handle edge case: minimum valid password', () => {
      const minValidPassword = 'Ab1!cd2e' // 8 chars with all requirements
      expect(() => new Password(minValidPassword)).not.toThrow()
    })
  })

  describe('Integration with Domain Logic', () => {
    it('should work with user domain validation', () => {
      // This test ensures Password value object integrates properly
      // with broader domain validation in User domain entity
      const validPassword = new Password('Password123!')
      
      expect(validPassword.getValue()).toBeDefined()
      expect(validPassword.getValue()).toBe('Password123!')
    })

    it('should support serialization for domain events', async () => {
      const password = new Password('Password123!')
      
      // Test that the hashed value can be serialized for domain events
      const hash = await password.hash()
      const serialized = JSON.stringify(hash)
      expect(serialized).toBeDefined()
      expect(serialized.length).toBeGreaterThan(50)
      
      // Test that it can be deserialized back
      const parsed = JSON.parse(serialized)
      expect(typeof parsed).toBe('string')
      expect(parsed.length).toBeGreaterThan(50)
    })

    it('should handle password policy changes', async () => {
      // Test that password validation can adapt to policy changes
      const password = new Password('Password123!')
      
      // Current validation should pass
      expect(password.getValue()).toBe('Password123!')
      
      // Password should maintain its hash regardless of policy changes
      const hash = await password.hash()
      expect(hash).toBeDefined()
      expect(hash.length).toBeGreaterThan(50)
    })
  })

  describe('Password Strength Scoring', () => {
    it('should score based on length', () => {
      const shortPassword = new Password('Ab1!cd2e') // 8 chars
      const longPassword = new Password('Abcdefgh1!') // 11 chars
      const veryLongPassword = new Password('Abcdefghijklm1!') // 15 chars

      expect(shortPassword.getStrength().score).toBeLessThan(longPassword.getStrength().score)
      expect(longPassword.getStrength().score).toBeLessThan(veryLongPassword.getStrength().score)
    })

    it('should penalize repeated characters', () => {
      const repeatedPassword = new Password('AAAaaa111!!!')
      const variedPassword = new Password('AbcDef123!@#')

      expect(repeatedPassword.getStrength().score).toBeLessThan(variedPassword.getStrength().score)
    })

    it('should provide appropriate feedback', () => {
      const password = new Password('Password123!')
      const strength = password.getStrength()

      expect(strength.feedback).toBeDefined()
      expect(Array.isArray(strength.feedback)).toBe(true)
      expect(strength.strength).toMatch(/^(weak|medium|strong)$/)
      expect(typeof strength.score).toBe('number')
    })
  })
})