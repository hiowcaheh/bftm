import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// Serwowane z własnej domeny https://app.bftm.se/ (korzeń) przez GitHub Pages
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      // własny SW (src/sw.ts): precache + runtime cache + Web Push
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
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
        start_url: '/',
        scope: '/',
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
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
