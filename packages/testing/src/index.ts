// Testing utilities package - to be populated with shared testing utilities

export interface TestUser {
  id: string
  email: string
  name: string
  tenantId?: string
}

export interface TestTenant {
  id: string
  name: string
  slug: string
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    tenantId: 'test-tenant-id',
    ...overrides
  }
}

export function createTestTenant(overrides: Partial<TestTenant> = {}): TestTenant {
  return {
    id: 'test-tenant-id',
    name: 'Test Tenant',
    slug: 'test-tenant',
    ...overrides
  }
}

export function mockApiResponse<T>(data: T, delay = 0): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay)
  })
}

export function createMockEvent(overrides: Partial<Event> = {}): Event {
  return {
    type: 'click',
    bubbles: true,
    cancelable: true,
    ...overrides
  } as Event
}