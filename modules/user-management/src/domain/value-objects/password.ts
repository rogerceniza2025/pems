/**
 * Password Value Object
 *
 * Represents and validates passwords following security best practices
 */

import bcrypt from 'bcryptjs'

export class Password {
  private readonly MIN_LENGTH = 8
  private readonly REQUIRE_UPPERCASE = true
  private readonly REQUIRE_LOWERCASE = true
  private readonly REQUIRE_NUMBERS = true
  private readonly REQUIRE_SPECIAL_CHARS = true

  constructor(private readonly value: string, private readonly isHashed: boolean = false) {
    // Only validate plain text passwords, not hashed ones
    if (!isHashed && !this.isValidForPlain(value)) {
      throw new InvalidPasswordError()
    }
  }

  private isValidForPlain(password: string): boolean {
    if (password.length < this.MIN_LENGTH) return false

    if (this.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) return false
    if (this.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) return false
    if (this.REQUIRE_NUMBERS && !/\d/.test(password)) return false
    if (this.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password))
      return false

    return true
  }

  getValue(): string {
    return this.value
  }

  async hash(): Promise<string> {
    return bcrypt.hash(this.value, 12)
  }

  static async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  getStrength(): PasswordStrength {
    let score = 0
    const feedback: string[] = []

    // Length check
    if (this.value.length >= 8) score += 1
    else feedback.push('Password must be at least 8 characters')

    // Complexity checks
    if (/[a-z]/.test(this.value)) score += 1
    else feedback.push('Include lowercase letters')

    if (/[A-Z]/.test(this.value)) score += 1
    else feedback.push('Include uppercase letters')

    if (/\d/.test(this.value)) score += 1
    else feedback.push('Include numbers')

    if (/[!@#$%^&*(),.?":{}|<>]/.test(this.value)) score += 1
    else feedback.push('Include special characters')

    // Additional strength factors
    if (this.value.length >= 12) score += 1
    if (!/(.)\1{2,}/.test(this.value)) score += 1 // No repeated characters

    const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong'

    return { strength, score, feedback }
  }

  // Static methods for test compatibility  static async create(plainPassword: string): Promise<Password> {    // Validate the plain password policy first    const validation = Password.validatePolicy(plainPassword)    if (!validation.isValid) {      throw new InvalidPasswordError(`${validation.errors.join(", ")}`)    }    const salt = await bcrypt.genSalt(12)    const hashedPassword = await bcrypt.hash(plainPassword, salt)    return new Password(hashedPassword, true)  }
  }

  }
  static createFromHash(hashedPassword: string): Password {
    return new Password(hashedPassword)
  }

  static validatePolicy(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export interface PasswordStrength {
  strength: 'weak' | 'medium' | 'strong'
  score: number
  feedback: string[]
}

export class InvalidPasswordError extends Error {
  constructor() {
    super('Password does not meet security requirements')
    this.name = 'InvalidPasswordError'
  }
}
