// Global test setup
console.log('Setting up test environment...')

// Add any global test utilities here
export const testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  createMockSchool: (overrides = {}) => ({
    id: 'test-school-id',
    name: 'Test School',
    code: 'TEST-001',
    type: 'K12',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
}
