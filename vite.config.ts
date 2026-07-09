import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// GitHub Pages serwuje aplikację spod https://<user>.github.io/bftm/
export default defineConfig({
  base: '/bftm/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'BFTM — Zarządzanie firmą budowlaną',
        short_name: 'BFTM',
        description: 'Aplikacja do zarządzania firmą budowlaną',
        lang: 'pl',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#F2F2F5',
        background_color: '#F2F2F5',
        start_url: '/bftm/',
        scope: '/bftm/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: '/bftm/index.html',
        runtimeCaching: [
          {
            // Supabase REST (tylko GET) — najpierw sieć, offline fallback do cache
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*$/,
            method: 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
          {
            // Supabase Storage (logo, zdjęcia) — cache z cichym odświeżaniem
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*$/,
            method: 'GET',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-storage',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
