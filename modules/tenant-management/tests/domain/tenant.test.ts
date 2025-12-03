/**
 * Tenant Domain Entity Tests
 * Tests for tenant domain entities, validation schemas, domain events, value objects, and exceptions
 */

import { describe, expect, it } from 'vitest'
import type {
    TenantCreatedEvent,
    TenantDomainEntity,
    TenantSettingDomainEntity,
    TenantSettingUpdatedEvent,
    TenantUpdatedEvent
} from '../../src/domain/tenant'
import {
    CreateTenantSchema,
    InvalidTenantOperationError,
    TenantName,
    TenantNotFoundError,
    TenantSettingSchema,
    TenantSlug,
    TenantSlugAlreadyExistsError,
    UpdateTenantSchema
} from '../../src/domain/tenant'

describe('Tenant Domain Entity', () => {
  describe('TenantDomainEntity Interface', () => {
    it('should have required properties', () => {
      const tenant: TenantDomainEntity = {
        id: 'tenant-123',
        name: 'Acme Corporation',
        slug: 'acme-corp',
        timezone: 'Asia/Manila',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(tenant.id).toBe('tenant-123')
      expect(tenant.name).toBe('Acme Corporation')
      expect(tenant.slug).toBe('acme-corp')
      expect(tenant.timezone).toBe('Asia/Manila')
      expect(tenant.metadata).toEqual({})
      expect(tenant.createdAt).toBeInstanceOf(Date)
      expect(tenant.updatedAt).toBeInstanceOf(Date)
    })

    it('should handle complex metadata', () => {
      const tenantWithMetadata: TenantDomainEntity = {
        id: 'tenant-123',
        name: 'Acme Corporation',
        slug: 'acme-corp',
        timezone: 'Asia/Manila',
        metadata: {
          industry: 'Technology',
          employeeCount: 100,
          features: {
            mfa: true,
            sso: false,
            apiAccess: true
          },
          billing: {
            plan: 'enterprise',
            limits: {
              users: 1000,
              storage: '1TB'
            }
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(tenantWithMetadata.metadata.industry).toBe('Technology')
      expect(tenantWithMetadata.metadata.employeeCount).toBe(100)
      expect((tenantWithMetadata.metadata as any).features.mfa).toBe(true)
      expect((tenantWithMetadata.metadata as any).billing.plan).toBe('enterprise')
    })
  })

  describe('TenantSettingDomainEntity Interface', () => {
    it('should have required properties', () => {
      const setting: TenantSettingDomainEntity = {
        id: 'setting-123',
        tenantId: 'tenant-456',
        key: 'theme',
        value: 'dark',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(setting.id).toBe('setting-123')
      expect(setting.tenantId).toBe('tenant-456')
      expect(setting.key).toBe('theme')
      expect(setting.value).toBe('dark')
      expect(setting.createdAt).toBeInstanceOf(Date)
      expect(setting.updatedAt).toBeInstanceOf(Date)
    })

    it('should handle different value types', () => {
      const stringSetting: TenantSettingDomainEntity = {
        id: 'setting-1',
        tenantId: 'tenant-456',
        key: 'company-name',
        value: 'Acme Corp',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const numberSetting: TenantSettingDomainEntity = {
        id: 'setting-2',
        tenantId: 'tenant-456',
        key: 'max-users',
        value: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const booleanSetting: TenantSettingDomainEntity = {
        id: 'setting-3',
        tenantId: 'tenant-456',
        key: 'mfa-enabled',
        value: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const objectSetting: TenantSettingDomainEntity = {
        id: 'setting-4',
        tenantId: 'tenant-456',
        key: 'feature-flags',
        value: {
          betaFeatures: true,
          newUI: false,
          advancedSettings: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(stringSetting.value).toBe('Acme Corp')
      expect(numberSetting.value).toBe(100)
      expect(booleanSetting.value).toBe(true)
      expect((objectSetting.value as any).betaFeatures).toBe(true)
    })
  })
})

describe('Validation Schemas', () => {
  describe('CreateTenantSchema', () => {
    it('should validate valid tenant creation input', () => {
      const validInput = {
        name: 'Acme Corporation',
        slug: 'acme-corp',
        timezone: 'Asia/Manila',
        metadata: {
          industry: 'Technology',
          employeeCount: 100
        }
      }

      const result = CreateTenantSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should validate tenant creation with default values', () => {
      const minimalInput = {
        name: 'Acme Corporation',
        slug: 'acme-corp'
      }

      const result = CreateTenantSchema.safeParse(minimalInput)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.timezone).toBe('Asia/Manila')
        expect(result.data.metadata).toEqual({})
      }
    })

    it('should reject empty name', () => {
      const invalidInput = {
        name: '',
        slug: 'acme-corp'
      }

      const result = CreateTenantSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Tenant name is required')
      }
    })

    it('should reject name that is too long', () => {
      const invalidInput = {
        name: 'A'.repeat(101),
        slug: 'acme-corp'
      }

      const result = CreateTenantSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should reject empty slug', () => {
      const invalidInput = {
        name: 'Acme Corporation',
        slug: ''
      }

      const result = CreateTenantSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Tenant slug is required')
      }
    })

    it('should reject slug with invalid characters', () => {
      const invalidInputs = [
        { name: 'Acme Corp', slug: 'Acme Corp' }, // spaces
        { name: 'Acme Corp', slug: 'acme_corp' }, // underscores
        { name: 'Acme Corp', slug: 'acme.corp' }, // dots
        { name: 'Acme Corp', slug: 'acme@corp' }, // special chars
        { name: 'Acme Corp', slug: 'ACME-CORP' } // uppercase
      ]

      invalidInputs.forEach(input => {
        const result = CreateTenantSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    it('should reject slug that is too long', () => {
      const invalidInput = {
        name: 'Acme Corporation',
        slug: 'a'.repeat(51)
      }

      const result = CreateTenantSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should accept valid slug formats', () => {
      const validInputs = [
        { name: 'Acme Corp', slug: 'acme-corp' },
        { name: 'Test Co', slug: 'test-co' },
        { name: '123 Company', slug: '123-company' },
        { name: 'A B C', slug: 'a-b-c' },
        { name: 'Company', slug: 'company' }
      ]

      validInputs.forEach(input => {
        const result = CreateTenantSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('UpdateTenantSchema', () => {
    it('should validate valid tenant update input', () => {
      const validInput = {
        name: 'Updated Corporation',
        slug: 'updated-corp',
        timezone: 'America/New_York',
        metadata: { industry: 'Finance' }
      }

      const result = UpdateTenantSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should validate partial update input', () => {
      const partialInput = {
        name: 'Updated Name'
      }

      const result = UpdateTenantSchema.safeParse(partialInput)
      expect(result.success).toBe(true)
    })

    it('should accept empty update input', () => {
      const emptyInput = {}

      const result = UpdateTenantSchema.safeParse(emptyInput)
      expect(result.success).toBe(true)
    })

    it('should reject invalid slug in update', () => {
      const invalidInput = {
        slug: 'Invalid Slug'
      }

      const result = UpdateTenantSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })

  describe('TenantSettingSchema', () => {
    it('should validate valid setting input', () => {
      const validInput = {
        key: 'theme',
        value: 'dark'
      }

      const result = TenantSettingSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should validate setting with different value types', () => {
      const validInputs = [
        { key: 'max-users', value: 100 },
        { key: 'mfa-enabled', value: true },
        { key: 'features', value: { beta: true, newUI: false } },
        { key: 'tags', value: ['tag1', 'tag2'] }
      ]

      validInputs.forEach(input => {
        const result = TenantSettingSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    it('should reject empty key', () => {
      const invalidInput = {
        key: '',
        value: 'some-value'
      }

      const result = TenantSettingSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Setting key is required')
      }
    })

    it('should reject key that is too long', () => {
      const invalidInput = {
        key: 'a'.repeat(101),
        value: 'some-value'
      }

      const result = TenantSettingSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })
})

describe('Domain Events', () => {
  describe('TenantCreatedEvent', () => {
    it('should create valid tenant created event', () => {
      const event: TenantCreatedEvent = {
        type: 'TENANT_CREATED',
        tenantId: 'tenant-123',
        name: 'Acme Corporation',
        slug: 'acme-corp',
        occurredAt: new Date()
      }

      expect(event.type).toBe('TENANT_CREATED')
      expect(event.tenantId).toBe('tenant-123')
      expect(event.name).toBe('Acme Corporation')
      expect(event.slug).toBe('acme-corp')
      expect(event.occurredAt).toBeInstanceOf(Date)
    })
  })

  describe('TenantUpdatedEvent', () => {
    it('should create valid tenant updated event', () => {
      const event: TenantUpdatedEvent = {
        type: 'TENANT_UPDATED',
        tenantId: 'tenant-123',
        changes: {
          name: 'Updated Corporation',
          timezone: 'America/New_York'
        },
        occurredAt: new Date()
      }

      expect(event.type).toBe('TENANT_UPDATED')
      expect(event.tenantId).toBe('tenant-123')
      expect(event.changes.name).toBe('Updated Corporation')
      expect(event.changes.timezone).toBe('America/New_York')
      expect(event.occurredAt).toBeInstanceOf(Date)
    })

    it('should create event with empty changes', () => {
      const event: TenantUpdatedEvent = {
        type: 'TENANT_UPDATED',
        tenantId: 'tenant-123',
        changes: {},
        occurredAt: new Date()
      }

      expect(event.changes).toEqual({})
    })
  })

  describe('TenantSettingUpdatedEvent', () => {
    it('should create valid tenant setting updated event', () => {
      const event: TenantSettingUpdatedEvent = {
        type: 'TENANT_SETTING_UPDATED',
        tenantId: 'tenant-123',
        key: 'theme',
        value: 'dark',
        occurredAt: new Date()
      }

      expect(event.type).toBe('TENANT_SETTING_UPDATED')
      expect(event.tenantId).toBe('tenant-123')
      expect(event.key).toBe('theme')
      expect(event.value).toBe('dark')
      expect(event.occurredAt).toBeInstanceOf(Date)
    })

    it('should handle complex setting values', () => {
      const event: TenantSettingUpdatedEvent = {
        type: 'TENANT_SETTING_UPDATED',
        tenantId: 'tenant-123',
        key: 'feature-flags',
        value: {
          betaFeatures: true,
          newUI: false,
          advancedSettings: true
        },
        occurredAt: new Date()
      }

      expect(event.key).toBe('feature-flags')
      expect((event.value as any).betaFeatures).toBe(true)
    })
  })
})

describe('Domain Value Objects', () => {
  describe('TenantSlug', () => {
    it('should create valid tenant slug', () => {
      const validSlugs = [
        'acme-corp',
        'test-company',
        '123-business',
        'a-b-c',
        'company',
        'my-organization'
      ]

      validSlugs.forEach(slug => {
        const tenantSlug = new TenantSlug(slug)
        expect(tenantSlug.getValue()).toBe(slug)
      })
    })

    it('should reject invalid tenant slug', () => {
      const invalidSlugs = [
        '', // empty
        'Acme Corp', // spaces
        'acme_corp', // underscores
        'acme.corp', // dots
        'acme@corp', // special chars
        'ACME-CORP', // uppercase
        'a'.repeat(51), // too long
        'a' // valid but testing edge case
      ]

      invalidSlugs.forEach(slug => {
        expect(() => new TenantSlug(slug)).toThrow('Invalid tenant slug format')
      })
    })

    it('should handle edge cases', () => {
      // Minimum length
      const minSlug = new TenantSlug('a')
      expect(minSlug.getValue()).toBe('a')

      // Maximum length
      const maxSlug = new TenantSlug('a'.repeat(50))
      expect(maxSlug.getValue()).toBe('a'.repeat(50))

      // Just over maximum length
      expect(() => new TenantSlug('a'.repeat(51))).toThrow()
    })

    it('should provide consistent value access', () => {
      const slug = new TenantSlug('test-company')
      expect(slug.getValue()).toBe('test-company')
      expect(slug.getValue()).toBe('test-company') // Should be consistent
    })
  })

  describe('TenantName', () => {
    it('should create valid tenant name', () => {
      const validNames = [
        'Acme Corporation',
        'Test Company',
        '123 Business',
        'A',
        'A'.repeat(100)
      ]

      validNames.forEach(name => {
        const tenantName = new TenantName(name)
        expect(tenantName.getValue()).toBe(name)
      })
    })

    it('should reject invalid tenant name', () => {
      const invalidNames = [
        '', // empty
        null as any, // null
        undefined as any, // undefined
        'A'.repeat(101) // too long
      ]

      invalidNames.forEach(name => {
        expect(() => new TenantName(name)).toThrow('Tenant name must be between 1 and 100 characters')
      })
    })

    it('should handle edge cases', () => {
      // Minimum length
      const minName = new TenantName('A')
      expect(minName.getValue()).toBe('A')

      // Maximum length
      const maxName = new TenantName('A'.repeat(100))
      expect(maxName.getValue()).toBe('A'.repeat(100))

      // Just over maximum length
      expect(() => new TenantName('A'.repeat(101))).toThrow()
    })

    it('should provide consistent value access', () => {
      const name = new TenantName('Test Company')
      expect(name.getValue()).toBe('Test Company')
      expect(name.getValue()).toBe('Test Company') // Should be consistent
    })
  })
})

describe('Domain Exceptions', () => {
  describe('TenantNotFoundError', () => {
    it('should create error with correct message and name', () => {
      const error = new TenantNotFoundError('tenant-123')

      expect(error.message).toBe('Tenant with id tenant-123 not found')
      expect(error.name).toBe('TenantNotFoundError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('TenantSlugAlreadyExistsError', () => {
    it('should create error with correct message and name', () => {
      const error = new TenantSlugAlreadyExistsError('acme-corp')

      expect(error.message).toBe('Tenant with slug acme-corp already exists')
      expect(error.name).toBe('TenantSlugAlreadyExistsError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('InvalidTenantOperationError', () => {
    it('should create error with correct message and name', () => {
      const error = new InvalidTenantOperationError('Cannot delete tenant with active users')

      expect(error.message).toBe('Invalid tenant operation: Cannot delete tenant with active users')
      expect(error.name).toBe('InvalidTenantOperationError')
      expect(error).toBeInstanceOf(Error)
    })

    it('should handle empty operation message', () => {
      const error = new InvalidTenantOperationError('')

      expect(error.message).toBe('Invalid tenant operation: ')
      expect(error.name).toBe('InvalidTenantOperationError')
    })
  })
})

describe('Integration and Edge Cases', () => {
  it('should handle complex validation scenarios', () => {
    const complexTenant = {
      name: 'Acme Corporation Philippines',
      slug: 'acme-corp-ph',
      timezone: 'Asia/Manila',
      metadata: {
        industry: 'Technology',
        employeeCount: 500,
        headquarters: 'Manila',
        founded: 2020,
        services: ['software', 'consulting', 'support'],
        certifications: ['ISO-9001', 'SOC-2'],
        financial: {
          revenue: 1000000,
          profit: 100000,
          currency: 'USD'
        }
      }
    }

    const result = CreateTenantSchema.safeParse(complexTenant)
    expect(result.success).toBe(true)
  })

  it('should handle domain event serialization', () => {
    const event: TenantCreatedEvent = {
      type: 'TENANT_CREATED',
      tenantId: 'tenant-123',
      name: 'Acme Corporation',
      slug: 'acme-corp',
      occurredAt: new Date('2023-01-01T00:00:00Z')
    }

    const serialized = JSON.stringify(event)
    const parsed = JSON.parse(serialized)

    expect(parsed.type).toBe('TENANT_CREATED')
    expect(parsed.tenantId).toBe('tenant-123')
    expect(parsed.name).toBe('Acme Corporation')
    expect(parsed.slug).toBe('acme-corp')
    expect(parsed.occurredAt).toBe('2023-01-01T00:00:00.000Z')
  })

  it('should handle error inheritance correctly', () => {
    const error = new TenantNotFoundError('tenant-123')

    expect(error instanceof Error).toBe(true)
    expect(error instanceof TenantNotFoundError).toBe(true)
    expect(error.name).toBe('TenantNotFoundError')
  })

  it('should handle timezone validation', () => {
    const validTimezones = [
      'Asia/Manila',
      'America/New_York',
      'Europe/London',
      'UTC',
      'Australia/Sydney'
    ]

    validTimezones.forEach(timezone => {
      const input = {
        name: 'Test Company',
        slug: 'test-company',
        timezone
      }

      const result = CreateTenantSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  it('should handle value object composition', () => {
    const slug = new TenantSlug('acme-corp')
    const name = new TenantName('Acme Corporation')

    const tenant: TenantDomainEntity = {
      id: 'tenant-123',
      name: name.getValue(),
      slug: slug.getValue(),
      timezone: 'Asia/Manila',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }

    expect(tenant.name).toBe('Acme Corporation')
    expect(tenant.slug).toBe('acme-corp')
  })

  it('should handle setting value type validation', () => {
    const settingValues = [
      'string value',
      123,
      true,
      false,
      null,
      undefined,
      { key: 'value' },
      [1, 2, 3],
      new Date(),
      /regex/
    ]

    settingValues.forEach(value => {
      const input = {
        key: 'test-setting',
        value
      }

      const result = TenantSettingSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })
})