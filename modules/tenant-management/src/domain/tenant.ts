/**
 * Tenant Domain Entity
 *
 * Core domain entity for tenant management following DDD principles (ADR-002)
 * and UUIDv7 implementation (ADR-005)
 */

import { z } from 'zod'

export interface TenantDomainEntity {
  id: string
  name: string
  slug: string
  timezone: string
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface TenantSettingDomainEntity {
  id: string
  tenantId: string
  key: string
  value: unknown
  createdAt: Date
  updatedAt: Date
}

// Validation schemas using Zod (ADR-020)
export const CreateTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required').max(100),
  slug: z.string()
    .min(1, 'Tenant slug is required')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  timezone: z.string().optional().default('Asia/Manila'),
  metadata: z.record(z.unknown()).optional().default({})
})

export const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  timezone: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
})

export const TenantSettingSchema = z.object({
  key: z.string().min(1, 'Setting key is required').max(100),
  value: z.unknown().optional()
})

// Domain Events (ADR-014)
export interface TenantCreatedEvent {
  type: 'TENANT_CREATED'
  tenantId: string
  name: string
  slug: string
  occurredAt: Date
}

export interface TenantUpdatedEvent {
  type: 'TENANT_UPDATED'
  tenantId: string
  changes: Partial<{
    name: string
    slug: string
    timezone: string
    metadata: Record<string, unknown>
  }>
  occurredAt: Date
}

export interface TenantSettingUpdatedEvent {
  type: 'TENANT_SETTING_UPDATED'
  tenantId: string
  key: string
  value: unknown
  occurredAt: Date
}

// Domain Value Objects
export class TenantSlug {
  constructor(private readonly value: string) {
    if (!/^[a-z0-9-]+$/.test(value) || value.length > 50 || value.length < 1) {
      throw new Error('Invalid tenant slug format')
    }
  }

  getValue(): string {
    return this.value
  }
}

export class TenantName {
  constructor(private readonly value: string) {
    if (!value || value.length > 100 || value.length < 1) {
      throw new Error('Tenant name must be between 1 and 100 characters')
    }
  }

  getValue(): string {
    return this.value
  }
}

// Domain Exceptions
export class TenantNotFoundError extends Error {
  constructor(tenantId: string) {
    super(`Tenant with id ${tenantId} not found`)
    this.name = 'TenantNotFoundError'
  }
}

export class TenantSlugAlreadyExistsError extends Error {
  constructor(slug: string) {
    super(`Tenant with slug ${slug} already exists`)
    this.name = 'TenantSlugAlreadyExistsError'
  }
}

export class InvalidTenantOperationError extends Error {
  constructor(message: string) {
    super(`Invalid tenant operation: ${message}`)
    this.name = 'InvalidTenantOperationError'
  }
}