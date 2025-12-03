/**
 * Email Value Object
 *
 * Represents and validates email addresses following DDD principles
 */

export class Email {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new InvalidEmailError(value)
    }
  }

  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  getValue(): string {
    return this.value.toLowerCase()
  }

  equals(other: Email): boolean {
    return this.getValue() === other.getValue()
  }

  toString(): string {
    return this.getValue()
  }
}

export class InvalidEmailError extends Error {
  constructor(email: string) {
    super(`Invalid email address: ${email}`)
    this.name = 'InvalidEmailError'
  }
}
