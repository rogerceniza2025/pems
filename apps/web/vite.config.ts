import tailwindcssVite from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  root: '.',
  publicDir: '../public',
  plugins: [
    // devtools(), // Temporarily disabled due to port conflict
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
      ignoreConfigErrors: true,
    }),
    solidPlugin(),
    tailwindcssVite(),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
    // Enable CSS code splitting for better caching
    cssCodeSplit: true,
    // Optimize bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for better caching
          vendor: ['solid-js'],
          // UI components chunk
          ui: ['@pems/ui'],
        },
      },
    },
    // Enable minification
    minify: 'esbuild',
    // Report compressed size for more realistic bundle analysis
    reportCompressedSize: true,
    // Generate source maps for production debugging
    sourcemap: false,
  },
  css: {
    // Enable CSS modules for component-scoped styles
    modules: false,
    // PostCSS configuration is handled by Tailwind CSS 4
    postcss: {},
    // Enable CSS optimization
    devSourcemap: true,
    preprocessorOptions: {},
  },
  optimizeDeps: {
    include: ['solid-js', '@solidjs/router', '@pems/ui'],
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
  // Enable experimental features for better performance
  experimental: {
    renderBuiltUrl: (filename, { hostType }) => {
      if (hostType === 'js') {
        return { js: `/${filename}` }
      } else {
        return { relative: true }
      }
    },
  },
})
