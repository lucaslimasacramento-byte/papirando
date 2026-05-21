import { createClient } from '@supabase/supabase-js'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const rawSupabaseDevProxy = import.meta.env.VITE_SUPABASE_DEV_PROXY

const browserOrigin =
  typeof window !== 'undefined' && window.location?.origin ? String(window.location.origin).replace(/\/+$/, '') : ''

function getProjectRefFromUrl(value) {
  try {
    const host = new URL(value).host
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i)
    return match?.[1] || ''
  } catch {
    return ''
  }
}

function decodeJwtPayload(value) {
  try {
    const encoded = String(value || '').split('.')[1] || ''
    if (!encoded) return null
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

function getProjectRefFromJwt(value) {
  const payload = decodeJwtPayload(value)
  return String(payload?.ref || '').trim()
}

function getProjectRefFromIssuer(value) {
  const issuer = String(value || '').trim()
  const match = issuer.match(/^https:\/\/([a-z0-9-]+)\.supabase\.(?:co|in)\/auth\/v1$/i)
  return match?.[1] || ''
}

function isCurrentProjectJwt(payload) {
  if (!payload) return false
  const tokenRef = String(payload.ref || getProjectRefFromIssuer(payload.iss)).trim()
  return !supabaseProjectRefFromUrl || !tokenRef || tokenRef === supabaseProjectRefFromUrl
}

export function isUsableSupabaseAccessToken(value) {
  const token = String(value || '').trim()
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return false

  const payload = decodeJwtPayload(token)
  if (!payload?.sub) return false
  if (!isCurrentProjectJwt(payload)) return false

  return true
}

function readStoredAccessToken(value) {
  try {
    const parsed = JSON.parse(String(value || ''))
    return String(parsed?.access_token || '').trim()
  } catch {
    return ''
  }
}

export function isUsableSupabaseStoredSession(value) {
  return isUsableSupabaseAccessToken(readStoredAccessToken(value))
}

export const supabaseDirectUrl = String(rawSupabaseUrl || '').trim().replace(/\/+$/, '')
export const supabaseAnonKey = String(rawSupabaseAnonKey || '').trim()
export const supabaseProjectRefFromUrl = getProjectRefFromUrl(supabaseDirectUrl)
export const supabaseProjectRefFromAnonKey = getProjectRefFromJwt(supabaseAnonKey)
export const supabaseConfigError =
  supabaseProjectRefFromUrl &&
  supabaseProjectRefFromAnonKey &&
  supabaseProjectRefFromUrl !== supabaseProjectRefFromAnonKey
    ? `VITE_SUPABASE_URL aponta para "${supabaseProjectRefFromUrl}", mas a anon key pertence ao projeto "${supabaseProjectRefFromAnonKey}". Corrija o project ref em .env e reinicie o Vite.`
    : ''
export const isSupabaseDevProxyEnabled = Boolean(
  import.meta.env.DEV &&
    browserOrigin &&
    supabaseDirectUrl &&
    String(rawSupabaseDevProxy || 'true').toLowerCase() !== 'false'
)
export const supabaseBaseUrl = isSupabaseDevProxyEnabled ? `${browserOrigin}/supabase` : supabaseDirectUrl
const supabaseClientUrl = supabaseBaseUrl || 'http://127.0.0.1:54321'
const supabaseClientAnonKey = supabaseAnonKey || 'missing-anon-key'
const supabaseAuthStorageKey = supabaseProjectRefFromUrl ? `sb-${supabaseProjectRefFromUrl}-auth-token` : undefined

function normalizeFetchHeaders(headers) {
  const normalized = new Headers(headers || {})
  const authorization = String(normalized.get('authorization') || '').trim()
  const token = authorization.replace(/^Bearer\s+/i, '').trim()

  normalized.delete('cookie')

  if (authorization && (token.length > 4096 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))) {
    normalized.set('authorization', `Bearer ${supabaseAnonKey}`)
  }

  return normalized
}

export function supabaseFetch(input, init = {}) {
  return fetch(input, {
    ...init,
    headers: normalizeFetchHeaders(init.headers),
    // Supabase auth uses bearer tokens/localStorage here; forwarding browser cookies can trigger
    // Cloudflare/Vite "Request Header Or Cookie Too Large" in local development.
    credentials: 'omit',
  })
}

export function clearInvalidSupabaseAuthStorage() {
  if (!supabaseAuthStorageKey || typeof window === 'undefined' || !window.localStorage) return false

  const storedSession = window.localStorage.getItem(supabaseAuthStorageKey)
  if (!storedSession || isUsableSupabaseStoredSession(storedSession)) return false

  window.localStorage.removeItem(supabaseAuthStorageKey)
  console.warn('[Supabase] Sessao local invalida removida. Faca login novamente.')
  return true
}

function migrateSupabaseAuthStorage() {
  if (!supabaseAuthStorageKey || typeof window === 'undefined' || !window.localStorage) return
  clearInvalidSupabaseAuthStorage()
  if (window.localStorage.getItem(supabaseAuthStorageKey)) return

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key || key === supabaseAuthStorageKey || !/^sb-.+-auth-token$/.test(key)) continue

    const value = window.localStorage.getItem(key)
    if (!value || !isUsableSupabaseStoredSession(value)) continue

    window.localStorage.setItem(supabaseAuthStorageKey, value)
    console.info(`[Supabase] Sessao migrada de ${key} para ${supabaseAuthStorageKey}.`)
    return
  }
}

if (!supabaseBaseUrl) {
  console.error('[Supabase] VITE_SUPABASE_URL nao carregada.')
}

if (!supabaseAnonKey) {
  console.error('[Supabase] VITE_SUPABASE_ANON_KEY nao carregada.')
}

if (supabaseConfigError) {
  console.error(`[Supabase] ${supabaseConfigError}`)
}

migrateSupabaseAuthStorage()

export const supabase = createClient(supabaseClientUrl, supabaseClientAnonKey, {
  global: {
    fetch: supabaseFetch,
  },
  auth: {
    storageKey: supabaseAuthStorageKey,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
