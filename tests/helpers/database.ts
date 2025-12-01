import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

let prisma: PrismaClient

export async function setupTestDatabase() {
  const testDbUrl =
    process.env.TEST_DATABASE_URL ||
    'postgresql://test:test@localhost:5432/pems_test'

  prisma = new PrismaClient({
    datasources: {
      db: { url: testDbUrl },
    },
    log: process.env.CI ? [] : ['query', 'info', 'warn', 'error'],
  })

  // Reset database
  try {
    execSync('npx prisma migrate reset --force --skip-seed', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe',
    })

    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe',
    })
  } catch (error) {
    console.error('Database setup failed:', error)
    throw error
  }

  return {
    prisma,
    cleanup: async () => {
      await prisma.$disconnect()
    },
    reset: async () => {
      // Clean all tables
      const tablenames = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`
      
      for (const { tablename } of tablenames) {
        if (tablename !== '_prisma_migrations') {
          try {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`)
          } catch (error) {
            console.log(`Note: ${tablename} doesn't exist, skipping`)
          }
        }
      }
    },
  }
}

export function getTestPrisma() {
  if (!prisma) {
    throw new Error(
      'Test database not initialized. Call setupTestDatabase() first.',
    )
  }
  return prisma
}

// Transaction helper for test isolation
export async function withTransaction<T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  const tx = getTestPrisma()
  
  return await tx.$transaction(async (transaction) => {
    return await callback(transaction as PrismaClient)
  })
}