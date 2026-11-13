/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

// The sync framework is consumed as TypeScript source from the git dependency.
const syncPkg = (name: string) =>
  fileURLToPath(
    new URL(`./node_modules/sync-pwa-framework/packages/${name}/src/index.ts`, import.meta.url),
  )

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@sync/core': syncPkg('core'),
      '@sync/spaces': syncPkg('spaces'),
      '@sync/identity-invite': syncPkg('identity-invite'),
      '@sync/transport-websocket': syncPkg('transport-websocket'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Dinner Sticks',
        short_name: 'Dinner Sticks',
        description: "Draw tonight's meal from your weekly pool of ideas.",
        theme_color: '#5B21B6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
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
})
