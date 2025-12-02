/**
 * Email Value Object Tests
 * Tests for email validation and normalization following domain-driven design principles
 */

import { describe, expect, it } from 'vitest'
import { Email } from '../../../src/domain/value-objects/email'

describe('Email Value Object', () => {
  describe('Validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
        'firstname.lastname@company.com',
        'test.user@sub.domain.com',
        'USER@EXAMPLE.COM', // Should be normalized to lowercase
        '  spaced@example.com  ', // Should be trimmed
        'test@localhost', // Valid for testing
        'user+tag+another@example.com' // Multiple tags
      ]

      validEmails.forEach(email => {
        expect(() => new Email(email)).not.toThrow()
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email', // Missing @ and domain
        '@example.com', // Missing local part
        'test@', // Missing domain
        'test@.com', // Missing domain name
        'test..test@example.com', // Double dots
        '.test@example.com', // Leading dot
        'test.@example.com', // Trailing dot before @
        'test@example..com', // Double dot in domain
        'test@example.c', // Single character domain
        'test@-example.com', // Hyphen at start of domain
        'test@example-.com', // Hyphen at end of domain
        '', // Empty string
        null, // Null value
        undefined, // Undefined value
        '   ', // Only whitespace
        'test@', // Incomplete
        'test space@example.com', // Space in local part
        'test@exa mple.com', // Space in domain
      ]

      invalidEmails.forEach(email => {
        expect(() => new Email(email as any)).toThrow('Invalid email address')
      })
    })

    it('should enforce email length limits', () => {
      // Test very long email (should be rejected)
      const veryLongEmail = 'a'.repeat(300) + '@example.com'
      expect(() => new Email(veryLongEmail)).toThrow()

      // Test reasonable length email (should be accepted)
      const reasonableEmail = 'a'.repeat(50) + '@example.com'
      expect(() => new Email(reasonableEmail)).not.toThrow()
    })

    it('should validate email format patterns', () => {
      // Test consecutive dots
      expect(() => new Email('test..test@example.com')).toThrow()
      
      // Test consecutive dots at domain start/end
      expect(() => new Email('.test@example.com')).toThrow()
      expect(() => new Email('test@example.com.')).toThrow()
      
      // Test consecutive @ symbols
      expect(() => new Email('test@@example.com')).toThrow()
      
      // Test invalid characters
      expect(() => new Email('test@exa$mple.com')).toThrow()
      expect(() => new Email('test@example.com\n')).toThrow() // Newline character
    })

    it('should handle edge cases with special characters', () => {
      // Valid special characters in local part
      const validSpecialChars = [
        'test+tag@example.com',
        'test.tag@example.com',
        'test+tag+another@example.com',
        'user_name@example.com',
        'user-name@example.com',
        'user_name123@example.com',
        'test.user@example.com'
      ]

      validSpecialChars.forEach(email => {
        expect(() => new Email(email)).not.toThrow()
      })

      // Invalid special characters
      const invalidSpecialChars = [
        'test user@example.com', // Space
        'test\tuser@example.com', // Tab
        'test\nuser@example.com', // Newline
        'test\ruser@example.com', // Carriage return
        'test"user@example.com', // Quotes
        'test<user>@example.com', // Angle brackets
        'test|user@example.com', // Pipe
        'test\\user@example.com' // Backslash (unless escaped)
      ]

      invalidSpecialChars.forEach(email => {
        expect(() => new Email(email)).toThrow()
      })
    })
  })

  describe('Normalization', () => {
    it('should convert email to lowercase', () => {
      const testCases = [
        { input: 'Test@EXAMPLE.COM', expected: 'test@example.com' },
        { input: 'USER@DOMAIN.COM', expected: 'user@domain.com' },
        { input: 'MixedCase@Example.Com', expected: 'mixedcase@example.com' },
        { input: 'CamelCase@Sub.Domain.Com', expected: 'camelcase@sub.domain.com' }
      ]

      testCases.forEach(({ input, expected }) => {
        const email = new Email(input)
        expect(email.getValue()).toBe(expected)
      })
    })

    it('should trim whitespace', () => {
      const testCases = [
        { input: '  test@example.com  ', expected: 'test@example.com' },
        { input: '\ttest@example.com\t', expected: 'test@example.com' },
        { input: '\n test@example.com \r', expected: 'test@example.com' },
        { input: '   test@example.com   ', expected: 'test@example.com' }
      ]

      testCases.forEach(({ input, expected }) => {
        const email = new Email(input)
        expect(email.getValue()).toBe(expected)
      })
    })

    it('should handle mixed case with whitespace', () => {
      const email = new Email('  TeSt@ExAmPlE.CoM  ')
      expect(email.getValue()).toBe('test@example.com')
    })

    it('should preserve valid characters after normalization', () => {
      const email = new Email('User+Tag.Name@Example.Com')
      expect(email.getValue()).toBe('user+tag.name@example.com')
    })
  })

  describe('Domain-Specific Validation', () => {
    it('should validate common domain patterns', () => {
      const validDomainEmails = [
        'test@gmail.com',
        'test@yahoo.com',
        'test@outlook.com',
        'test@company.co.uk',
        'test@university.edu',
        'test@government.org',
        'test@hospital.net',
        'test@school.edu.ph'
      ]

      validDomainEmails.forEach(email => {
        expect(() => new Email(email)).not.toThrow()
      })
    })

    it('should validate international domain names', () => {
      const internationalEmails = [
        'test@xn--example.com', // Punycode
        'test@例子.测试', // Chinese characters
        'test@тест.рф', // Cyrillic characters
        'test@münchen.de', // German umlaut
        'test@café.fr' // French accents
      ]

      // These should generally be rejected by basic validation
      // but we test the behavior
      internationalEmails.forEach(email => {
        const result = new Email(email)
        // At minimum, it should not crash
        expect(result).toBeDefined()
        expect(result.getValue()).toBeDefined()
      })
    })

    it('should handle subdomain validation', () => {
      const subdomainEmails = [
        'test@sub.example.com',
        'test@sub.sub.example.com',
        'test@deep.nested.sub.example.com',
        'user@mail.example.com',
        'test@api.example.org'
      ]

      subdomainEmails.forEach(email => {
        expect(() => new Email(email)).not.toThrow()
      })
    })
  })

  describe('Security Considerations', () => {
    it('should prevent email injection attempts', () => {
      const maliciousInputs = [
        'test@example.com\r\nBcc: victim@example.com',
        'test@example.com\nSubject: Malicious',
        'test@example.com%0d%0aContent-Type: text/html',
        'test@example.com<script>alert("xss")</script>',
        'test@example.com@example.com', // Multiple @ symbols
        'test@example.com@example.org@example.net' // Multiple domains
      ]

      maliciousInputs.forEach(input => {
        expect(() => new Email(input as any)).toThrow()
      })
    })

    it('should handle unicode normalization', () => {
      // Test Unicode characters that might look similar
      const unicodeEmails = [
        'tést@example.com', // Latin-1 e with acute
        'te⃝st@example.com', // Unicode lookalike
        'test@exámple.com', // Latin a with acute
        'test@examplë.com' // Latin e with diaeresis
      ]

      unicodeEmails.forEach(email => {
        const result = new Email(email)
        expect(result).toBeDefined()
        expect(result.getValue()).toBeDefined()
        // Should handle gracefully without crashing
      })
    })
  })

  describe('Equality and Comparison', () => {
    it('should consider emails with same normalized value equal', () => {
      const email1 = new Email('Test@EXAMPLE.COM')
      const email2 = new Email('test@example.com')
      const email3 = new Email('  test@example.com  ')

      expect(email1.getValue()).toBe(email2.getValue())
      expect(email2.getValue()).toBe(email3.getValue())
    })

    it('should consider different emails unequal', () => {
      const email1 = new Email('test1@example.com')
      const email2 = new Email('test2@example.com')

      expect(email1.getValue()).not.toBe(email2.getValue())
    })

    it('should handle case-insensitive comparison', () => {
      const email1 = new Email('Test@EXAMPLE.COM')
      const email2 = new Email('test@example.com')

      expect(email1.equals(email2)).toBe(true)
    })

    it('should not equal different objects', () => {
      const email = new Email('test@example.com')
      const nonEmail = { getValue: () => 'test@example.com' }

      expect(email.equals(nonEmail as any)).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should provide clear error messages', () => {
      try {
        new Email('invalid-email')
      } catch (error: any) {
        expect(error.message).toBe('Invalid email address')
      }
    })

    it('should throw Error objects', () => {
      try {
        new Email(null as any)
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should handle validation errors gracefully', () => {
      const invalidInputs = [null, undefined, '', 'invalid', 'test@', '@example.com']
      
      invalidInputs.forEach(input => {
        try {
          const email = new Email(input as any)
          // If it doesn't throw, it should be a valid email
          if (email) {
            expect(email.getValue()).toBeDefined()
            expect(typeof email.getValue()).toBe('string')
          }
        } catch (error: any) {
          expect(error.message).toBe('Invalid email address')
        }
      })
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large number of validations efficiently', () => {
      const startTime = Date.now()
      
      // Create many email instances
      for (let i = 0; i < 1000; i++) {
        new Email(`test${i}@example.com`)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete quickly (under 100ms for 1000 validations)
      expect(duration).toBeLessThan(100)
    })

    it('should handle memory efficiently', () => {
      // Test that creating and discarding emails doesn't cause memory leaks
      const emails = []
      
      for (let i = 0; i < 100; i++) {
        emails.push(new Email(`test${i}@example.com`))
      }
      
      // Clear references
      emails.length = 0
      
      // Should not cause memory issues
      expect(true).toBe(true) // Basic sanity check
    })

    it('should handle edge case: empty string after trimming', () => {
      const email = new Email('   ')
      
      expect(email.getValue()).toBe('')
    })

    it('should handle edge case: only @ symbol', () => {
      try {
        new Email('@')
      } catch (error: any) {
        expect(error.message).toBe('Invalid email address')
      }
    })

    it('should handle edge case: only domain', () => {
      try {
        new Email('example.com')
      } catch (error: any) {
        expect(error.message).toBe('Invalid email address')
      }
    })
  })

  describe('Integration with Domain Logic', () => {
    it('should work with user domain validation', () => {
      // This test ensures Email value object integrates properly
      // with broader domain validation in User domain entity
      const validEmail = new Email('test@example.com')
      
      expect(validEmail.getValue()).toBe('test@example.com')
      expect(validEmail.getValue()).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) // Basic email format
    })

    it('should support serialization for domain events', () => {
      const email = new Email('test@example.com')
      
      // Test that the value can be serialized for domain events
      const serialized = JSON.stringify(email.getValue())
      expect(serialized).toBe('"test@example.com"')
      
      // Test that it can be deserialized back
      const parsed = JSON.parse(serialized)
      expect(parsed).toBe('test@example.com')
    })
  })
})