/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Built assets are hosted at https://epl692.github.io/tools/dinner-sticks/
  // (see epl692.github.io/static/tools/dinner-sticks/); keep the dev server at root.
  base: command === 'build' ? '/tools/dinner-sticks/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Dinner Sticks',
        short_name: 'Dinner Sticks',
        description: "Draw tonight's meal from your weekly pool of ideas.",
        theme_color: '#8a3b00',
        background_color: '#ffffff',
        display: 'standalone',
        // start_url/scope default to `base` above, which resolves to the
        // deployed subpath at build time.
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setupTests.ts'],
  },
}))
