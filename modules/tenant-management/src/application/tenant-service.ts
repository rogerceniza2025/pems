/**
 * Tenant Application Service
 *
 * Implements use cases for tenant management following DDD principles (ADR-002)
 * and implementing domain events (ADR-014)
 */

import type {
  TenantDomainEntity,
  TenantSettingDomainEntity,
  CreateTenantSchema,
  UpdateTenantSchema,
  TenantSettingSchema,
  TenantCreatedEvent,
  TenantUpdatedEvent,
  TenantSettingUpdatedEvent,
  TenantNotFoundError,
  TenantSlugAlreadyExistsError
} from '../domain'
import type { ITenantRepository } from '../infrastructure'

export interface ITenantService {
  // Tenant operations
  createTenant(data: CreateTenantSchema): Promise<TenantDomainEntity>
  getTenant(id: string): Promise<TenantDomainEntity>
  getTenantBySlug(slug: string): Promise<TenantDomainEntity>
  listTenants(options?: { page?: number; limit?: number }): Promise<{
    tenants: TenantDomainEntity[]
    total: number
    page: number
    limit: number
    totalPages: number
  }>
  updateTenant(id: string, data: UpdateTenantSchema): Promise<TenantDomainEntity>
  deleteTenant(id: string): Promise<void>

  // Tenant settings
  upsertTenantSetting(tenantId: string, data: TenantSettingSchema): Promise<TenantSettingDomainEntity>
  getTenantSetting(tenantId: string, key: string): Promise<TenantSettingDomainEntity | null>
  getAllTenantSettings(tenantId: string): Promise<TenantSettingDomainEntity[]>
  deleteTenantSetting(tenantId: string, key: string): Promise<void>

  // Domain events
  getDomainEvents(): Array<TenantCreatedEvent | TenantUpdatedEvent | TenantSettingUpdatedEvent>
  clearDomainEvents(): void
}

export class TenantService implements ITenantService {
  private domainEvents: Array<TenantCreatedEvent | TenantUpdatedEvent | TenantSettingUpdatedEvent> = []

  constructor(private readonly tenantRepository: ITenantRepository) {}

  async createTenant(data: CreateTenantSchema): Promise<TenantDomainEntity> {
    // Validate tenant slug uniqueness
    const existingTenant = await this.tenantRepository.findBySlug(data.slug)
    if (existingTenant) {
      throw new TenantSlugAlreadyExistsError(data.slug)
    }

    const tenant = await this.tenantRepository.create(data)

    // Emit domain event
    this.addDomainEvent<TenantCreatedEvent>({
      type: 'TENANT_CREATED',
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      occurredAt: new Date()
    })

    return tenant
  }

  async getTenant(id: string): Promise<TenantDomainEntity> {
    const tenant = await this.tenantRepository.findById(id)
    if (!tenant) {
      throw new TenantNotFoundError(id)
    }
    return tenant
  }

  async getTenantBySlug(slug: string): Promise<TenantDomainEntity> {
    const tenant = await this.tenantRepository.findBySlug(slug)
    if (!tenant) {
      throw new TenantNotFoundError(`slug: ${slug}`)
    }
    return tenant
  }

  async listTenants(options: { page?: number; limit?: number } = {}) {
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const skip = (page - 1) * limit

    const [tenants, total] = await Promise.all([
      this.tenantRepository.findMany({ skip, take: limit }),
      this.tenantRepository.count()
    ])

    return {
      tenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async updateTenant(id: string, data: UpdateTenantSchema): Promise<TenantDomainEntity> {
    // Validate tenant exists
    const existingTenant = await this.getTenant(id)

    // Validate slug uniqueness if being updated
    if (data.slug && data.slug !== existingTenant.slug) {
      const slugExists = await this.tenantRepository.existsBySlug(data.slug)
      if (slugExists) {
        throw new TenantSlugAlreadyExistsError(data.slug)
      }
    }

    const updatedTenant = await this.tenantRepository.update(id, data)

    // Emit domain event with actual changes
    const changes: Partial<{
      name: string
      slug: string
      timezone: string
      metadata: Record<string, unknown>
    }> = {}

    if (data.name && data.name !== existingTenant.name) {
      changes.name = data.name
    }
    if (data.slug && data.slug !== existingTenant.slug) {
      changes.slug = data.slug
    }
    if (data.timezone && data.timezone !== existingTenant.timezone) {
      changes.timezone = data.timezone
    }
    if (data.metadata && JSON.stringify(data.metadata) !== JSON.stringify(existingTenant.metadata)) {
      changes.metadata = data.metadata
    }

    if (Object.keys(changes).length > 0) {
      this.addDomainEvent<TenantUpdatedEvent>({
        type: 'TENANT_UPDATED',
        tenantId: id,
        changes,
        occurredAt: new Date()
      })
    }

    return updatedTenant
  }

  async deleteTenant(id: string): Promise<void> {
    // Validate tenant exists
    await this.getTenant(id)

    await this.tenantRepository.delete(id)
  }

  async upsertTenantSetting(
    tenantId: string,
    data: TenantSettingSchema
  ): Promise<TenantSettingDomainEntity> {
    // Validate tenant exists
    await this.getTenant(tenantId)

    const setting = await this.tenantRepository.upsertSetting(tenantId, data)

    // Emit domain event
    this.addDomainEvent<TenantSettingUpdatedEvent>({
      type: 'TENANT_SETTING_UPDATED',
      tenantId,
      key: data.key,
      value: data.value,
      occurredAt: new Date()
    })

    return setting
  }

  async getTenantSetting(tenantId: string, key: string): Promise<TenantSettingDomainEntity | null> {
    // Validate tenant exists
    await this.getTenant(tenantId)

    return this.tenantRepository.getSetting(tenantId, key)
  }

  async getAllTenantSettings(tenantId: string): Promise<TenantSettingDomainEntity[]> {
    // Validate tenant exists
    await this.getTenant(tenantId)

    return this.tenantRepository.getAllSettings(tenantId)
  }

  async deleteTenantSetting(tenantId: string, key: string): Promise<void> {
    // Validate tenant exists
    await this.getTenant(tenantId)

    await this.tenantRepository.deleteSetting(tenantId, key)
  }

  getDomainEvents(): Array<TenantCreatedEvent | TenantUpdatedEvent | TenantSettingUpdatedEvent> {
    return [...this.domainEvents]
  }

  clearDomainEvents(): void {
    this.domainEvents = []
  }

  private addDomainEvent<T extends TenantCreatedEvent | TenantUpdatedEvent | TenantSettingUpdatedEvent>(
    event: T
  ): void {
    this.domainEvents.push(event)
  }
}