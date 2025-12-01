import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [viteTsConfigPaths(), tailwindcss(), solidPlugin()],
  server: {
    port: 3001,
    open: true,
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
})
