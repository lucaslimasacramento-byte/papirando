import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function createDevBetaInvitesApi({ supabaseTarget, supabaseAnonKey }) {
  const inviteColumns = 'id, email, token, nome, observacao, invited_at, used_at, used_by_user_id'

  function sendJson(res, status, payload) {
    res.statusCode = status
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(payload))
  }

  function readJsonBody(req) {
    return new Promise((resolve, reject) => {
      let raw = ''
      req.on('data', (chunk) => {
        raw += chunk
        if (raw.length > 1024 * 1024) {
          reject(new Error('Payload muito grande.'))
          req.destroy()
        }
      })
      req.on('end', () => {
        if (!raw) {
          resolve({})
          return
        }

        try {
          resolve(JSON.parse(raw))
        } catch {
          reject(new Error('JSON invalido.'))
        }
      })
      req.on('error', reject)
    })
  }

  async function supabaseRest(path, { method = 'GET', body, authorization } = {}) {
    const response = await fetch(`${supabaseTarget}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: supabaseAnonKey,
        Authorization: authorization || `Bearer ${supabaseAnonKey}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json', Prefer: 'return=representation' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    const text = await response.text()
    let payload = null
    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        payload = {
          message: `Supabase retornou resposta nao JSON (${response.status}).`,
          snippet: text.replace(/\s+/g, ' ').trim().slice(0, 180),
        }
      }
    }

    if (!response.ok) {
      const error = new Error(payload?.message || response.statusText || 'Erro no Supabase.')
      error.status = response.status
      error.payload = payload
      throw error
    }

    return payload
  }

  function normalizeBearerAuthorization(value) {
    const authorization = String(value || '').trim()
    const token = authorization.replace(/^Bearer\s+/i, '').trim()
    if (!token || token.length > 4096) return ''
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return ''
    return `Bearer ${token}`
  }

  return {
    name: 'papirando-dev-beta-invites-api',
    configureServer(server) {
      server.middlewares.use('/api/beta-invites', async (req, res) => {
        if (!supabaseTarget || !supabaseAnonKey) {
          sendJson(res, 500, { message: 'Supabase nao configurado no .env local.' })
          return
        }

        try {
          const requestUrl = new URL(req.url || '/', 'http://127.0.0.1')
          const authorization = normalizeBearerAuthorization(req.headers.authorization)

          if (req.method === 'GET') {
            const data = await supabaseRest(
              `beta_invites?select=${encodeURIComponent(inviteColumns)}&order=invited_at.desc&limit=300`,
              {}
            )
            sendJson(res, 200, data || [])
            return
          }

          if (req.method === 'POST') {
            if (!authorization) {
              sendJson(res, 401, { message: 'Sessao admin invalida. Faca login novamente e tente de novo.' })
              return
            }

            const body = await readJsonBody(req)
            const data = await supabaseRest(`beta_invites?select=${encodeURIComponent(inviteColumns)}`, {
              method: 'POST',
              authorization,
              body,
            })
            sendJson(res, 200, data)
            return
          }

          if (req.method === 'DELETE') {
            if (!authorization) {
              sendJson(res, 401, { message: 'Sessao admin invalida. Faca login novamente e tente de novo.' })
              return
            }

            const id = String(requestUrl.searchParams.get('id') || '').trim()
            if (!id) {
              sendJson(res, 400, { message: 'ID do convite nao informado.' })
              return
            }

            await supabaseRest(`beta_invites?id=eq.${encodeURIComponent(id)}`, {
              method: 'DELETE',
              authorization,
            })
            sendJson(res, 200, { ok: true })
            return
          }

          sendJson(res, 405, { message: 'Metodo nao permitido.' })
        } catch (error) {
          sendJson(res, error.status || 500, {
            message: error.payload?.message || error.message || 'Erro ao acessar beta_invites.',
            details: error.payload?.details,
            hint: error.payload?.hint,
            code: error.payload?.code,
            snippet: error.payload?.snippet,
          })
        }
      })
    },
  }
}

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
    plugins: [createDevBetaInvitesApi({ supabaseTarget, supabaseAnonKey }), react()],
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
