import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Serves the Vercel functions in api/ during `npm run dev`, so local development works
 * without the Vercel CLI. On Vercel itself these files are deployed as serverless functions.
 */
function vercelApiInDev(): Plugin {
  return {
    name: 'vercel-api-in-dev',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const route = new URL(req.url ?? '/', 'http://localhost').pathname.replace(/^\/|\/$/g, '')
        try {
          if (!/^[\w-]+$/.test(route)) throw Object.assign(new Error('Not found'), { status: 404 })
          const mod = await server.ssrLoadModule(`/api/${route}.ts`)
          if (typeof mod.GET !== 'function' || req.method !== 'GET') {
            throw Object.assign(new Error('Method not allowed'), { status: 405 })
          }
          const response: Response = await mod.GET(new Request(`http://localhost/api${req.url}`))
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          const status = (error as { status?: number }).status ?? 500
          if (status === 500) console.error(error)
          res.statusCode = status
          res.end(status === 500 ? 'Internal error' : (error as Error).message)
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Expose server-only secrets (like GOOGLE_MAPS_API_KEY from .env.local) to the dev API.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      react(),
      vercelApiInDev(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'PalatePal',
          short_name: 'PalatePal',
          description: 'Can’t decide where to eat? Two places at a time, keep the one you like better.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'any',
          background_color: '#fff8f1',
          theme_color: '#fff8f1',
          categories: ['food', 'lifestyle'],
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Cache the app itself for fast, offline-capable launches, but never restaurant data:
          // it must be fresh, and Google's terms limit caching it.
          navigateFallbackDenylist: [/^\/api\//],
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        },
      }),
    ],
  }
})
