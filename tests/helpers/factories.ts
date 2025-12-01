import { PrismaClient, Student, Tenant, User } from '@prisma/client'
import { v7 as uuidv7 } from 'uuid'

let prisma: PrismaClient

export function createTestFactories(prismaClient?: PrismaClient) {
  prisma = prismaClient ?? require('./database').getTestPrisma()
}

export const TenantFactory = {
  create: async (overrides: Partial<Tenant> = {}) => {
    return prisma.tenant.create({
      data: {
        id: uuidv7(),
        name: 'Test School',
        code: 'TEST-SCHOOL',
        type: 'ELEMENTARY',
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test@school.edu.ph',
        isActive: true,
        ...overrides,
      },
    })
  },

  createMany: async (count: number, overrides: Partial<Tenant> = {}) => {
    const tenants = []
    for (let i = 0; i < count; i++) {
      tenants.push({
        id: uuidv7(),
        name: `Test School ${i}`,
        code: `TEST-SCHOOL-${i}`,
        type: 'ELEMENTARY',
        address: `${i} Test Street`,
        phone: `+63912345678${i}`,
        email: `test${i}@school.edu.ph`,
        isActive: true,
        ...overrides,
      })
    }
    return prisma.tenant.createMany({ data: tenants })
  },
}

export const UserFactory = {
  create: async (overrides: Partial<User> = {}) => {
    const tenant = await TenantFactory.create()

    return prisma.user.create({
      data: {
        id: uuidv7(),
        tenantId: tenant.id,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
        passwordHash: 'hashed-password',
        ...overrides,
      },
    })
  },

  createWithTenant: async (tenantId: string, overrides: Partial<User> = {}) => {
    return prisma.user.create({
      data: {
        id: uuidv7(),
        tenantId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
        passwordHash: 'hashed-password',
        ...overrides,
      },
    })
  },
}

export const StudentFactory = {
  create: async (overrides: Partial<Student> = {}) => {
    const tenant = await TenantFactory.create()

    return prisma.student.create({
      data: {
        id: uuidv7(),
        tenantId: tenant.id,
        studentNumber: '2024-0001',
        firstName: 'Test',
        lastName: 'Student',
        birthDate: new Date('2000-01-01'),
        gender: 'MALE',
        isActive: true,
        ...overrides,
      },
    })
  },
}
