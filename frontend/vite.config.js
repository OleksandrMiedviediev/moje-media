import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Moje Media',
        short_name: 'Moje Media',
        description: 'Domowe rozliczenia mediów',
        theme_color: '#356ae6',
        background_color: '#f4f6fa',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        runtimeCaching: [
          { urlPattern: /^https:\/\/.*\.onrender\.com\/api\/.*/i, handler: 'NetworkFirst', options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 300 } } }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:10000'
    }
  }
});
