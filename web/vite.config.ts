import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3003'
const appBasePath = normalizeBasePath(process.env.VITE_APP_BASE_PATH || '/')
const appStartUrl = process.env.VITE_APP_START_URL || appBasePath

function normalizeBasePath(pathname: string) {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

function createManifest(basePath: string, startUrl: string) {
  return JSON.stringify(
    {
      name: 'Kitabu',
      short_name: 'Kitabu',
      id: basePath,
      start_url: startUrl,
      scope: basePath,
      display: 'standalone',
      background_color: '#0b2d6b',
      theme_color: '#0f4496',
      description: 'Mobile-first shop ledger for debts, sales, and expenses.',
      icons: [
        {
          src: `${basePath}icon-192.png`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: `${basePath}icon-512.png`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
      ],
    },
    null,
    2,
  )
}

function createServiceWorker(basePath: string) {
  const appShell = [
    basePath,
    `${basePath}manifest.webmanifest`,
    `${basePath}icon-192.png`,
    `${basePath}icon-512.png`,
    `${basePath}apple-touch-icon.png`,
  ]

  return `const CACHE_NAME = 'kitabu-shell-v3'
const APP_SHELL = ${JSON.stringify(appShell)}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const requestUrl = new URL(event.request.url)
  if (requestUrl.origin !== self.location.origin) return
  if (requestUrl.pathname.includes('/api')) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request)
        return cached || caches.match(${JSON.stringify(basePath)})
      })
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        const cloned = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned))
        return response
      })
    })
  )
})
`
}

function pwaAssetsPlugin(basePath: string, startUrl: string): Plugin {
  const manifest = createManifest(basePath, startUrl)
  const serviceWorker = createServiceWorker(basePath)

  return {
    name: 'kitabu-pwa-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestPath = req.url?.split('?')[0]
        if (requestPath === `${basePath}manifest.webmanifest`) {
          res.setHeader('Content-Type', 'application/manifest+json')
          res.end(manifest)
          return
        }
        if (requestPath === `${basePath}sw.js`) {
          res.setHeader('Content-Type', 'application/javascript')
          res.end(serviceWorker)
          return
        }
        next()
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: manifest,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: serviceWorker,
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: appBasePath,
  plugins: [react(), pwaAssetsPlugin(appBasePath, appStartUrl)],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
