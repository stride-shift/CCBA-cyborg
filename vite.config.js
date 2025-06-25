import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist'
  },
  // Ensure proper SPA routing in development
  server: {
    historyApiFallback: true
  },
  // Configure for static deployment
  base: './',
  // Add SPA fallback for production builds
  preview: {
    port: 3000,
    strictPort: true,
    host: true
  }
})
