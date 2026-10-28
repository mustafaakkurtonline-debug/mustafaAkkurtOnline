import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { SENTRY_DSN } from './src/constants/sentry'
import { CANONICAL_HOST, SENTRY_TUNNEL_PATH } from './src/constants/site'

// Sentry'de hatanın hangi sürümden geldiğini gösterir. Cloudflare Workers Builds ve
// Vercel commit kimliğini build ortamına koyar; yerel build'de 'local' kalır.
const APP_RELEASE = (process.env.WORKERS_CI_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7)

// RegExp lookbehind (?<= ?<!) iOS 16.4 öncesi Safari'de söz dizimi hatasıdır ve
// derleyici bunu dönüştüremez: tek bir ifade tüm uygulamayı beyaz ekranda bırakır.
// Paket (bağımlılıklar dahil) böyle bir ifade içerirse build durdurulur.
const REGEX_LOOKBEHIND = /\(\?<[=!]/

function rejectRegexLookbehind(): Plugin {
  return {
    name: 'reject-regex-lookbehind',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk' && REGEX_LOOKBEHIND.test(output.code)) {
          this.error(`${output.fileName} RegExp lookbehind içeriyor; eski iPhone'larda uygulama hiç açılmaz.`)
        }
      }
    },
  }
}

// index.html'deki açılış denetimi Sentry adresini buradan alır; yerelde rapor göndermez
function injectBootWatchdogConfig(): Plugin {
  return {
    name: 'inject-boot-watchdog-config',
    transformIndexHtml(html, ctx) {
      return html
        .replace('__SENTRY_DSN__', SENTRY_DSN)
        .replace('__CANONICAL_HOST__', CANONICAL_HOST)
        .replace('__SENTRY_TUNNEL_PATH__', SENTRY_TUNNEL_PATH)
        .replace('__BOOT_REPORTING_ENABLED__', String(ctx.server === undefined))
    },
  }
}

export default defineConfig({
  define: {
    __APP_RELEASE__: JSON.stringify(APP_RELEASE),
  },
  plugins: [
    react(),
    tailwindcss(),
    rejectRegexLookbehind(),
    injectBootWatchdogConfig(),
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
  build: {
    // Vite'ın varsayılanı Safari 16.4'tür; güncellenmemiş eski iPhone'lar da
    // uygulamayı açabilsin diye söz dizimi daha eski tarayıcılara göre üretilir.
    target: ['es2020', 'safari15', 'ios15', 'chrome87', 'edge88', 'firefox78'],
  },
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
