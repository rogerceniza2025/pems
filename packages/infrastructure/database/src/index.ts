/**
 * Infrastructure Database Package
 *
 * Provides database access with tenant isolation, UUIDv7 support,
 * and repository pattern implementation following ADR-004, ADR-005, and ADR-006.
 */

export * from '@prisma/client'
export { createTenantAwareClient, TenantAwarePrismaClient } from './tenant-aware-client'
export * from './client'

// Types will be available after prisma generate
// export * from './types';

// Future database exports:
// export { DatabaseConnection } from './connection'
// export { Migrator } from './migrator'
// export { Seeder } from './seeder'

// Migration services for BetterAuth integration
export { UserMigrationService, userMigrationService } from './migration/user-migration.service'
