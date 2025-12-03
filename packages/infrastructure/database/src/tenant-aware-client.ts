/**
 * Tenant-Aware Database Client
 *
 * Provides a Prisma client wrapper that automatically includes tenant filtering
 * and context management for all database operations following ADR-004.
 */

import type { TenantContext } from '@pems/middleware'
import { PrismaClient } from '@prisma/client'

export class TenantAwarePrismaClient {
  private client: PrismaClient
  private tenantContext?: TenantContext

  constructor(prisma: PrismaClient) {
    this.client = prisma
  }

  /**
   * Set the current tenant context for all subsequent operations
   */
  async setTenantContext(context: TenantContext | undefined): Promise<void> {
    this.tenantContext = context

    // Configure database session for RLS
    if (context) {
      await this.configureDatabaseSession(context)
    }
  }

  /**
   * Get the current tenant context
   */
  getTenantContext(): TenantContext | undefined {
    return this.tenantContext
  }

  /**
   * Clear the current tenant context
   */
  async clearTenantContext(): Promise<void> {
    this.tenantContext = undefined
    void this.client.$executeRaw`RESET app.current_tenant_id`
    void this.client.$executeRaw`RESET app.is_system_admin`
    void this.client.$executeRaw`RESET app.current_user_id`
  }

  /**
   * Get a tenant-aware Prisma client instance
   * All queries will be automatically filtered by tenant
   */
  get tenantClient() {
    if (!this.tenantContext) {
      throw new Error('Tenant context must be set before using tenant client')
    }

    return this.createTenantAwareProxy()
  }

  /**
   * Get the raw Prisma client (for system operations only)
   * Use with caution - bypasses tenant filtering
   */
  get rawClient() {
    return this.client
  }

  private createTenantAwareProxy() {
    return new Proxy(this.client, {
      get: (target, prop) => {
        const value = target[prop as keyof PrismaClient]

        // Handle model access
        if (
          typeof value === 'object' &&
          value !== null &&
          'findMany' in value
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return this.createTenantAwareModelProxy(value as any)
        }

        // Handle direct methods
        if (typeof value === 'function') {
          return value.bind(target)
        }

        return value
      },
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createTenantAwareModelProxy(model: any) {
    return new Proxy(model, {
      get: (target, prop) => {
        const method = target[prop as keyof typeof target]

        if (typeof method === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (...args: any[]) => {
            // Automatically add tenant filtering to queries
            const modifiedArgs = this.addTenantFiltering(args, prop as string)
            return method.apply(target, modifiedArgs)
          }
        }

        return method
      },
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private addTenantFiltering(args: any[], method: string): any[] {
    if (!this.tenantContext || this.tenantContext.isSystemAdmin) {
      return args // No filtering for system admins
    }

    // Don't modify certain operations
    const skipFiltering = [
      'count',
      'aggregate',
      'groupBy',
      '$queryRaw',
      '$executeRaw',
    ]
    if (skipFiltering.includes(method)) {
      return args
    }

    // Add tenant filtering to where clauses
    const [firstArg, ...restArgs] = args

    if (firstArg && typeof firstArg === 'object') {
      const modifiedArg = { ...firstArg }

      // Add tenant_id to where clause if it exists
      if ('where' in modifiedArg && modifiedArg.where) {
        modifiedArg.where = {
          ...modifiedArg.where,
          tenant_id: this.tenantContext.tenantId,
        }
      } else {
        modifiedArg.where = {
          tenant_id: this.tenantContext.tenantId,
        }
      }

      // Handle data operations (create, update)
      if ('data' in modifiedArg && modifiedArg.data) {
        modifiedArg.data = {
          ...modifiedArg.data,
          tenant_id: this.tenantContext.tenantId,
        }
      }

      return [modifiedArg, ...restArgs]
    }

    // If no where clause exists, add one with tenant filter
    if (
      method === 'findMany' ||
      method === 'findFirst' ||
      method === 'findUnique'
    ) {
      return [
        { where: { tenant_id: this.tenantContext.tenantId } },
        ...restArgs,
      ]
    }

    // For create operations, add tenant_id to data
    if (method === 'create') {
      const data = firstArg?.data ?? firstArg ?? {}
      const modifiedData = {
        ...data,
        tenant_id: this.tenantContext.tenantId,
      }

      if (firstArg?.data) {
        return [{ ...firstArg, data: modifiedData }, ...restArgs]
      }

      return [modifiedData, ...restArgs]
    }

    return args
  }

  private async configureDatabaseSession(
    context: TenantContext,
  ): Promise<void> {
    try {
      await this.client
        .$executeRaw`SET app.current_tenant_id = ${context.tenantId}`

      if (context.isSystemAdmin) {
        await this.client.$executeRaw`SET app.is_system_admin = true`
      } else {
        await this.client.$executeRaw`SET app.is_system_admin = false`
      }

      if (context.userId) {
        await this.client
          .$executeRaw`SET app.current_user_id = ${context.userId}`
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to configure database session:', error)
      throw new Error('Database session configuration failed')
    }
  }

  /**
   * Execute a raw SQL query with tenant context
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async executeTenantAwareQuery<T = any>(
    query: string, // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...params: any[]
  ): Promise<T[]> {
    if (!this.tenantContext) {
      throw new Error(
        'Tenant context must be set before executing tenant-aware queries',
      )
    }

    // Ensure database session is configured
    await this.configureDatabaseSession(this.tenantContext)

    return this.client.$queryRawUnsafe(query, ...params)
  }

  /**
   * Execute a database command with tenant context
   */
  async executeTenantAwareCommand(
    command: string, // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...params: any[]
  ): Promise<any> {
    if (!this.tenantContext) {
      throw new Error(
        'Tenant context must be set before executing tenant-aware commands',
      )
    }

    // Ensure database session is configured
    await this.configureDatabaseSession(this.tenantContext)

    return this.client.$executeRawUnsafe(command, ...params)
  }

  /**
   * Create a transaction with tenant context
   */
  async transaction<T>(
    callback: (tx: TenantAwarePrismaClient) => Promise<T>,
  ): Promise<T> {
    const originalClient = this.client

    return originalClient.$transaction(async (tx) => {
      const tenantTx = new TenantAwarePrismaClient(tx as PrismaClient)
      if (this.tenantContext) {
        await tenantTx.setTenantContext(this.tenantContext)
      }

      return callback(tenantTx)
    })
  }

  /**
   * Dispose of the client
   */
  async $disconnect(): Promise<void> {
    await this.client.$disconnect()
  }
}

/**
 * Create a tenant-aware Prisma client instance
 */
export function createTenantAwareClient(
  prisma: PrismaClient,
): TenantAwarePrismaClient {
  return new TenantAwarePrismaClient(prisma)
}
