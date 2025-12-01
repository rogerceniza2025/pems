/**
 * Tenant Repository Implementation
 *
 * Implements repository pattern (ADR-006) with tenant-aware database queries
 * and proper error handling for tenant management operations.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import type {
  TenantDomainEntity,
  TenantSettingDomainEntity,
  CreateTenantSchema,
  UpdateTenantSchema,
  TenantSettingSchema,
  TenantNotFoundError,
  TenantSlugAlreadyExistsError
} from '../domain'

export interface ITenantRepository {
  create(data: CreateTenantSchema): Promise<TenantDomainEntity>
  findById(id: string): Promise<TenantDomainEntity | null>
  findBySlug(slug: string): Promise<TenantDomainEntity | null>
  findMany(options?: { skip?: number; take?: number }): Promise<TenantDomainEntity[]>
  update(id: string, data: UpdateTenantSchema): Promise<TenantDomainEntity>
  delete(id: string): Promise<void>
  existsBySlug(slug: string): Promise<boolean>
  count(): Promise<number>

  // Tenant Settings
  upsertSetting(tenantId: string, data: TenantSettingSchema): Promise<TenantSettingDomainEntity>
  getSetting(tenantId: string, key: string): Promise<TenantSettingDomainEntity | null>
  getAllSettings(tenantId: string): Promise<TenantSettingDomainEntity[]>
  deleteSetting(tenantId: string, key: string): Promise<void>
}

export class TenantRepository implements ITenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateTenantSchema): Promise<TenantDomainEntity> {
    try {
      const tenant = await this.prisma.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          timezone: data.timezone,
          metadata: data.metadata as Prisma.JsonObject
        }
      })

      return this.mapToDomainEntity(tenant)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new TenantSlugAlreadyExistsError(data.slug)
        }
      }
      throw error
    }
  }

  async findById(id: string): Promise<TenantDomainEntity | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id }
    })

    return tenant ? this.mapToDomainEntity(tenant) : null
  }

  async findBySlug(slug: string): Promise<TenantDomainEntity | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug }
    })

    return tenant ? this.mapToDomainEntity(tenant) : null
  }

  async findMany(options?: { skip?: number; take?: number }): Promise<TenantDomainEntity[]> {
    const tenants = await this.prisma.tenant.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: { created_at: 'asc' }
    })

    return tenants.map(this.mapToDomainEntity)
  }

  async update(id: string, data: UpdateTenantSchema): Promise<TenantDomainEntity> {
    try {
      const tenant = await this.prisma.tenant.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.slug && { slug: data.slug }),
          ...(data.timezone && { timezone: data.timezone }),
          ...(data.metadata && { metadata: data.metadata as Prisma.JsonObject })
        }
      })

      return this.mapToDomainEntity(tenant)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new TenantNotFoundError(id)
        }
        if (error.code === 'P2002' && data.slug) {
          throw new TenantSlugAlreadyExistsError(data.slug)
        }
      }
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.tenant.delete({
        where: { id }
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new TenantNotFoundError(id)
        }
      }
      throw error
    }
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true }
    })

    return !!existing
  }

  async count(): Promise<number> {
    return this.prisma.tenant.count()
  }

  // Tenant Settings
  async upsertSetting(
    tenantId: string,
    data: TenantSettingSchema
  ): Promise<TenantSettingDomainEntity> {
    const setting = await this.prisma.tenantSetting.upsert({
      where: {
        tenant_id_key: {
          tenant_id: tenantId,
          key: data.key
        }
      },
      update: {
        value: data.value as Prisma.JsonObject
      },
      create: {
        tenant_id: tenantId,
        key: data.key,
        value: data.value as Prisma.JsonObject
      }
    })

    return this.mapSettingToDomainEntity(setting)
  }

  async getSetting(tenantId: string, key: string): Promise<TenantSettingDomainEntity | null> {
    const setting = await this.prisma.tenantSetting.findUnique({
      where: {
        tenant_id_key: {
          tenant_id: tenantId,
          key
        }
      }
    })

    return setting ? this.mapSettingToDomainEntity(setting) : null
  }

  async getAllSettings(tenantId: string): Promise<TenantSettingDomainEntity[]> {
    const settings = await this.prisma.tenantSetting.findMany({
      where: { tenant_id: tenantId },
      orderBy: { key: 'asc' }
    })

    return settings.map(this.mapSettingToDomainEntity)
  }

  async deleteSetting(tenantId: string, key: string): Promise<void> {
    try {
      await this.prisma.tenantSetting.delete({
        where: {
          tenant_id_key: {
            tenant_id: tenantId,
            key
          }
        }
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Setting doesn't exist, which is fine for delete operations
          return
        }
      }
      throw error
    }
  }

  private mapToDomainEntity(tenant: any): TenantDomainEntity {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      timezone: tenant.timezone,
      metadata: tenant.metadata as Record<string, unknown>,
      createdAt: tenant.created_at,
      updatedAt: tenant.updated_at
    }
  }

  private mapSettingToDomainEntity(setting: any): TenantSettingDomainEntity {
    return {
      id: setting.id,
      tenantId: setting.tenant_id,
      key: setting.key,
      value: setting.value,
      createdAt: setting.created_at,
      updatedAt: setting.updated_at
    }
  }
}