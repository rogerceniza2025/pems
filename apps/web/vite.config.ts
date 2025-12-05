import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/solid-start/plugin/vite'
import { defineConfig } from 'vite'
import viteSolid from 'vite-plugin-solid'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    port: 3000,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    tailwindcss(),
    // solid's vite plugin must come after start's vite plugin
    viteSolid({ ssr: true }),
  ],
  resolve: {
    // Force all solid-js imports to use a single instance
    dedupe: ['solid-js', 'solid-js/web', 'solid-js/store'],
  },
  optimizeDeps: {
    include: [
      'solid-js',
      '@tanstack/solid-start',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'zod',
      'axios',
    ],
    exclude: ['@tanstack/solid-router', '@kobalte/core', 'lucide-solid'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['solid-js', '@tanstack/solid-router'],
          ui: ['@kobalte/core', 'lucide-solid'],
          utils: ['class-variance-authority', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
})
