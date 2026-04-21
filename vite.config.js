import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseTarget = String(env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')

  return {
    plugins: [react()],
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
