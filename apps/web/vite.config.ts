import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Mobile-first PWA build: employees can install/use it from their phone
// browser (spec explicitly rules out a native app for the initial version).
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Multi-Shop Sales & Inventory',
        short_name: 'MultiShop',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
