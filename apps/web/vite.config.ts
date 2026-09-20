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
    {
      name: 'mock-auth-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/auth/login' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: Buffer) => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const mobileNumber = parsed.mobileNumber || '9999900001';
                let role = 'ADMIN';
                let fullName = 'Default Admin';
                if (mobileNumber === '9999900002') {
                  role = 'MANAGER';
                  fullName = 'Default Manager';
                } else if (mobileNumber === '9999900003') {
                  role = 'EMPLOYEE';
                  fullName = 'Default Employee';
                } else if (mobileNumber.endsWith('2')) {
                  role = 'MANAGER';
                  fullName = 'Demo Manager';
                } else if (mobileNumber.endsWith('3')) {
                  role = 'EMPLOYEE';
                  fullName = 'Demo Employee';
                }

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    accessToken: 'mock-jwt-token-' + Date.now(),
                    user: {
                      id: 'usr_' + mobileNumber,
                      fullName,
                      mobileNumber,
                      role,
                    },
                  }),
                );
              } catch {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ message: 'Invalid JSON request' }));
              }
            });
            return;
          }

          if (req.url === '/api/auth/logout' && req.method === 'POST') {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
          }

          next();
        });
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
});
