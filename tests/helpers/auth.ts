import jwt from 'jsonwebtoken'

export interface TestUser {
  id: string
  tenantId: string
  email: string
  role: string
}

export function createTestToken(user: TestUser): string {
  return jwt.sign(
    {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET ?? 'test-jwt-secret',
    { expiresIn: '1h' },
  )
}

export function createTestHeaders(user: TestUser) {
  const token = createTestToken(user)
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': user.tenantId,
  }
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: 'test-user-id',
    tenantId: 'test-tenant-id',
    email: 'test@example.com',
    role: 'ADMIN',
    ...overrides,
  }
}

export function createAdminUser(): TestUser {
  return createTestUser({ role: 'ADMIN' })
}

export function createTeacherUser(): TestUser {
  return createTestUser({ role: 'TEACHER' })
}

export function createStudentUser(): TestUser {
  return createTestUser({ role: 'STUDENT' })
}