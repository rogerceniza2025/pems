/**
 * Tenant-Aware BetterAuth Adapter
 *
 * Extends BetterAuth to support multi-tenant architecture
 */

import { prisma } from '@pems/database'
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

export interface TenantAuthOptions extends BetterAuthOptions {
  tenantId?: string
}

export function createTenantAwareAuth(options: TenantAuthOptions = {}) {
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID ?? '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google', 'github'],
      },
    },
    advanced: {
      generateId: false, // Use UUIDv7 from the database
      crossSubDomainCookies: {
        enabled: true,
      },
      // Custom hooks for tenant awareness
      hooks: {
        before: [
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            matcher(context: any) {
              // Apply tenant context to user creation
              return context.path === '/sign-up' || context.path === '/sign-in'
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            handler: async (ctx: any) => {
              const { tenantId } = options
              if (tenantId && ctx.body && typeof ctx.body === 'object') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ;(ctx.body as any).tenant_id = tenantId
              }
              return ctx
            },
          },
        ],
        after: [
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            matcher(context: any) {
              return context.path === '/sign-up' || context.path === '/sign-in'
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            handler: async (ctx: any) => {
              const { tenantId } = options
              if (tenantId && ctx.user) {
                // Update user with tenant context after creation/login
                await prisma.user.update({
                  where: { id: ctx.user.id },
                  data: { tenant_id: tenantId },
                })
              }
              return ctx
            },
          },
        ],
      },
    },
  })
}

// Create default auth instance
export const auth = createTenantAwareAuth()

// Helper function to create tenant-specific auth
export function createTenantSpecificAuth(tenantId: string) {
  return createTenantAwareAuth({ tenantId })
}
