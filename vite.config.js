import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_API_BASE_URL__: JSON.stringify(process.env.VITE_API_URL || ''),
    __APP_IS_PROD__: JSON.stringify(mode === 'production'),
  },
  plugins: [
    react(),
    tailwindcss(),
    mode === 'analyze' && visualizer({ filename: 'dist/bundle-report.html', gzipSize: true, open: false }),
  ].filter(Boolean),
  build: {
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit'],
          db: ['dexie'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },
}))
