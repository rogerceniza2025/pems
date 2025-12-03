// Global setup for testing package tests
import { vi } from 'vitest'

// Mock any global utilities needed for tests
vi.mock('ioredis', () => ({
  createClient: vi.fn().mockReturnValue({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
  })
}))