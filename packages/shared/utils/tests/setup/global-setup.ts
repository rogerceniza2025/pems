// Global setup for shared/utils tests
import { vi } from 'vitest'

// Mock any global utilities needed for tests
vi.mock('intl', () => ({
  NumberFormat: vi.fn().mockImplementation(() => ({
    format: vi.fn().mockReturnValue('$123.45')
  }))
}))