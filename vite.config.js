import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const supabaseTarget = String(env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')

  return {
    plugins: [react()],
    envDir: __dirname,
    test: {
      environment: 'node',
      include: ['src/**/*.test.js'],
    },
    server: {
      host: '127.0.0.1',
      strictPort: true,
      port: 5176,
      allowedHosts: ['localhost', '127.0.0.1', '.lvh.me', '.localtest.me'],
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
        ...(supabaseTarget
          ? {
              '/supabase': {
                target: supabaseTarget,
                changeOrigin: true,
                secure: true,
                ws: true,
                rewrite: (path) => path.replace(/^\/supabase/, ''),
                configure: (proxy) => {
                  proxy.on('proxyReq', (proxyReq, req) => {
                    proxyReq.removeHeader('cookie')
                    proxyReq.removeHeader('origin')
                    proxyReq.removeHeader('referer')
                    proxyReq.removeHeader('x-forwarded-host')
                    proxyReq.removeHeader('x-forwarded-port')
                    proxyReq.removeHeader('x-forwarded-proto')

                    if (req.headers.host) {
                      proxyReq.setHeader('host', new URL(supabaseTarget).host)
                    }
                  })

                  proxy.on('proxyRes', (proxyRes) => {
                    delete proxyRes.headers['set-cookie']
                    delete proxyRes.headers['Set-Cookie']
                  })
                },
              },
            }
          : {}),
      },
    },
    optimizeDeps: {
      force: false,
    },
  }
})
