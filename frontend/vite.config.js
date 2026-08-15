/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // ── Dev server ─────────────────────────────────────────────────────────
  server: {
    proxy: {
      '/chat': 'http://localhost:8000',
      '/mapping': 'http://localhost:8000',
      '/map': 'http://localhost:8000',
      '/ingest': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/extract': 'http://localhost:8000',
    },
  },

  // ── Production build optimizations ─────────────────────────────────────
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large vendor libraries into separate cacheable chunks.
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
        },
      },
    },
    // Generate source maps for error tracking in production.
    sourcemap: 'hidden',
  },

  // ── Testing ────────────────────────────────────────────────────────────
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})
