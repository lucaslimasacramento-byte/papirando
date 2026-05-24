import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseTarget = String(env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')
  const supabaseAnonKey = String(env.VITE_SUPABASE_ANON_KEY || '').trim()

  function normalizeProxyAuthorization(value) {
    const authorization = String(value || '').trim()
    const token = authorization.replace(/^Bearer\s+/i, '').trim()
    if (!token || token.length > 4096) return `Bearer ${supabaseAnonKey}`
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return `Bearer ${supabaseAnonKey}`
    return `Bearer ${token}`
  }

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react';
            }
            return undefined;
          },
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.js'],
    },
    server: {
      host: '127.0.0.1',
      strictPort: true,
      port: 5173,
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
                    proxyReq.setHeader('authorization', normalizeProxyAuthorization(req.headers.authorization))

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
