/**
 * Prisma User Repository Implementation
 *
 * Concrete implementation of user repository using Prisma ORM
 */

import { PrismaClient } from '@pems/database'
import type {
  CreateUserInput,
  PaginatedResult,
  PaginationOptions,
  SearchOptions,
  UpdateUserInput,
  UserAuthProviderDomainEntity,
  UserDomainEntity,
} from '../domain'
import type { IUserRepository } from './user-repository'

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateUserInput): Promise<UserDomainEntity> {
    const user = await this.prisma.user.create({
      data: {
        tenant_id: data.tenantId,
        email: data.email.toLowerCase(),
        phone: data.phone ?? null,
        is_active: true,
        is_system_admin: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
    })

    return this.mapToDomainEntity(user)
  }

  async findById(id: string): Promise<UserDomainEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    })

    return user ? this.mapToDomainEntity(user) : null
  }

  async findByEmail(
    email: string,
    tenantId?: string,
  ): Promise<UserDomainEntity | null> {
    if (!tenantId) return null

    const user = await this.prisma.user.findUnique({
      where: {
        tenant_id_email: {
          tenant_id: tenantId,
          email: email.toLowerCase(),
        },
      },
    })

    return user ? this.mapToDomainEntity(user) : null
  }

  async update(id: string, data: UpdateUserInput): Promise<UserDomainEntity> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.email !== undefined && { email: data.email.toLowerCase() }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.isActive !== undefined && { is_active: data.isActive }),
        updated_at: new Date(),
      },
    })

    return this.mapToDomainEntity(user)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    })
  }

  async findByTenant(
    tenantId: string,
    options?: PaginationOptions,
  ): Promise<UserDomainEntity[]> {
    const { page = 1, limit = 20 } = options ?? {}
    const skip = (page - 1) * limit

    const users = await this.prisma.user.findMany({
      where: { tenant_id: tenantId },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    })

    return users.map((user) => this.mapToDomainEntity(user))
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.user.count({
      where: { tenant_id: tenantId },
    })
  }

  async findByEmailWithAuth(
    email: string,
    tenantId: string,
  ): Promise<
    | (UserDomainEntity & {
        authProviders: UserAuthProviderDomainEntity[]
      })
    | null
  > {
    const user = await this.prisma.user.findUnique({
      where: {
        tenant_id_email: {
          tenant_id: tenantId,
          email: email.toLowerCase(),
        },
      },
      include: {
        auth_providers: true,
      },
    })

    if (!user) return null

    return {
      ...this.mapToDomainEntity(user),
      authProviders: user.auth_providers.map((provider) => ({
        id: provider.id,
        userId: provider.user_id,
        provider: provider.provider,
        ...(provider.provider_id && { providerId: provider.provider_id }),
        ...(provider.password_hash && { passwordHash: provider.password_hash }),
        mfaEnabled: provider.mfa_enabled,
        createdAt: provider.created_at,
      })),
    }
  }

  async search(
    query: string,
    tenantId: string,
    options?: SearchOptions,
  ): Promise<PaginatedResult<UserDomainEntity>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive,
    } = options ?? {}

    const skip = (page - 1) * limit
    const where: {
      tenant_id: string
      OR: Array<
        | { email: { contains: string; mode: 'insensitive' } }
        | { metadata: { path: []; string_contains: string } }
      >
      is_active?: boolean
    } = {
      tenant_id: tenantId,
      OR: [
        { email: { contains: query, mode: 'insensitive' } },
        { metadata: { path: [], string_contains: query } },
      ],
    }

    if (isActive !== undefined) {
      where.is_active = isActive
    }

    const orderBy: Record<string, unknown> = {}
    switch (sortBy) {
      case 'email':
        orderBy.email = sortOrder
        break
      case 'name':
        orderBy.metadata = { path: ['full_name'], string: sortOrder }
        break
      case 'createdAt':
      default:
        orderBy.created_at = sortOrder
        break
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ])

    return {
      data: users.map((user) => this.mapToDomainEntity(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async bulkUpdate(
    updates: Array<{ id: string; data: UpdateUserInput }>,
  ): Promise<UserDomainEntity[]> {
    const results = await Promise.all(
      updates.map(({ id, data }) => this.update(id, data)),
    )
    return results
  }

  async existsByEmail(email: string, tenantId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: {
        tenant_id_email: {
          tenant_id: tenantId,
          email: email.toLowerCase(),
        },
      },
      select: { id: true },
    })
    return !!user
  }

  async existsById(id: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    })
    return !!user
  }

  private mapToDomainEntity(user: {
    id: string
    tenant_id: string
    email: string
    phone: string | null
    is_active: boolean
    is_system_admin: boolean
    metadata: any
    created_at: Date
    updated_at: Date
  }): UserDomainEntity {
    return {
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      phone: user.phone ?? '',
      isActive: user.is_active,
      isSystemAdmin: user.is_system_admin,
      metadata: (user.metadata as Record<string, unknown>) ?? {},
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }
  }
}
