import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { getWorkboxOwnedRoutes } from './src/config/offlineWriteOwnership.manifest'

const buildWorkboxUrlPattern = (matchExpression: string): RegExp => {
  const stripped = matchExpression.replace(/^\^/, '').replace(/\$$/, '')
  return new RegExp(`\\/api(?:\\/v\\d+)?${stripped}$`, 'i')
}

const buildWorkboxRuntimeCaching = () =>
  getWorkboxOwnedRoutes().map((route) => ({
    urlPattern: buildWorkboxUrlPattern(route.matchExpression),
    handler: 'NetworkOnly' as const,
    method: route.method,
    options: route.backgroundSync
      ? {
          backgroundSync: {
            name: route.backgroundSync.queueName,
            options: {
              maxRetentionTime: route.backgroundSync.maxRetentionMinutes,
            },
          },
        }
      : undefined,
  }))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap' // sunburst, treemap, network
    }) as any,
    VitePWA({
      // Registration is handled in app code (main.tsx) so we can run one-time
      // stale-client migration logic before registering the current service worker.
      injectRegister: false,
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'offline.html',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-192x192.png',
        'pwa-maskable-512x512.png'
      ],
      manifest: {
        name: 'Event Manager',
        short_name: 'EventMgr',
        description: 'Professional event management system with scoring, judging, and reporting',
        id: '/',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'any',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        prefer_related_applications: false
      },
      workbox: {
        skipWaiting: false,
        clientsClaim: false,
        cleanupOutdatedCaches: true,
        importScripts: ['push-sw.js'],
        // Keep SPA route refreshes working under SW control.
        // A dedicated offline document still remains available at `/offline.html`.
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Never route API/file/socket navigations to SPA fallback.
        // This prevents `/api/...` links (like bio files) from being treated as tenant routes.
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/monitoring\//,
          /^\/api-docs(?:\/|$)/,
          /^\/uploads\//,
          /^\/socket\.io\//,
          /^\/cdn-cgi\//
        ],
        runtimeCaching: [
          ...buildWorkboxRuntimeCaching(),
          {
            urlPattern: /^https:\/\/api\..*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    port: Number(process.env.VITE_PORT) || 3002,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Code splitting and chunk optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI vendor chunk
          'ui-vendor': ['@headlessui/react', '@heroicons/react', 'framer-motion'],
          // Data fetching vendor
          'data-vendor': ['react-query', 'axios'],
          // Form/validation vendor
          'form-vendor': ['react-hook-form']
        },
        // Optimize chunk file names with content hash for cache busting
        chunkFileNames: 'assets/js/[name]-[hash:8].js',
        entryFileNames: 'assets/js/[name]-[hash:8].js',
        assetFileNames: 'assets/[ext]/[name]-[hash:8].[ext]'
      }
    },
    // Increase chunk size warning limit for better splitting
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // TEMPORARILY ENABLED for debugging
        drop_debugger: true
      }
    }
  }
})
