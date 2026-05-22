import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        id: '/',
        name: 'Mustafa Akkurt Berberi',
        short_name: 'M. Akkurt',
        description: 'Online randevu sistemi — Mustafa Akkurt Berberi',
        theme_color: '#d4891a',
        background_color: '#0f0e0d',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,svg}', 'icons/icon-*.png', 'icons/apple-touch-icon.png'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
    // After build: create admin.html from index.html with admin-specific manifest/meta.
    // Vercel routes /admin/* to admin.html so iOS Safari reads the correct manifest
    // at page load — before any JavaScript runs.
    {
      name: 'generate-admin-html',
      apply: 'build',
      closeBundle() {
        const distIndex = resolve(__dirname, 'dist', 'index.html')
        if (!existsSync(distIndex)) return
        const adminHtml = readFileSync(distIndex, 'utf-8')
          .replace(
            /<link rel="manifest"[^>]*>/,
            '<link rel="manifest" href="/admin-manifest.json">'
          )
          .replace(
            /(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/,
            '$1MA Panel$2'
          )
          .replace(
            /(<meta name="theme-color" content=")[^"]*(")/,
            '$1#111827$2'
          )
          .replace(
            '<title>Mustafa Akkurt Berberi</title>',
            '<title>Admin Panel — Mustafa Akkurt</title>'
          )
        writeFileSync(resolve(__dirname, 'dist', 'admin.html'), adminHtml)
      },
    },
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@features': resolve(__dirname, './src/features'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@lib': resolve(__dirname, './src/lib'),
      '@constants': resolve(__dirname, './src/constants'),
      '@types': resolve(__dirname, './src/types'),
      '@utils': resolve(__dirname, './src/utils'),
    },
  },
})
