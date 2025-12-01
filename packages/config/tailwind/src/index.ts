import type { Config } from 'tailwindcss'
import preset from './preset'

// Base configuration for Tailwind CSS 4
const baseConfig: Config = {
  presets: [preset],
  theme: {
    extend: {
      // Additional extensions can be added here
    },
  },
  plugins: [],
}

// Create app-specific configurations
export const createWebConfig = (overrides?: Partial<Config>): Config => ({
  ...baseConfig,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  ...overrides,
})

export const createAdminConfig = (overrides?: Partial<Config>): Config => ({
  ...baseConfig,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  ...overrides,
})

export const createUIConfig = (overrides?: Partial<Config>): Config => ({
  ...baseConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  ...overrides,
})

// Export the base configuration
export default baseConfig

// Export the preset for direct use
export { preset }

// Export types for TypeScript users
export type { Config }
