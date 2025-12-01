import { vi } from 'vitest'

// Mock all external dependencies for unit tests
vi.mock('axios')
vi.mock('@prisma/client')
vi.mock('better-auth')
vi.mock('redis')

// Mock file system operations
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
}))

// Mock environment
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.ENCRYPTION_KEY = 'test-encryption-key'

// Mock date for consistent testing
const mockDate = new Date('2024-01-01T00:00:00.000Z')
vi.spyOn(Date, 'now').mockReturnValue(mockDate.getTime())
vi.spyOn(global, 'Date').mockImplementation(() => mockDate)

// Mock UUID generation
vi.mock('uuid', () => ({
  v7: () => 'test-uuid-v7',
  v4: () => 'test-uuid-v4',
}))

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Global test utilities
global.createMockUser = () => ({
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
})

global.createMockTenant = () => ({
  id: 'test-tenant-id',
  name: 'Test School',
  code: 'TEST-SCHOOL',
  type: 'ELEMENTARY',
})