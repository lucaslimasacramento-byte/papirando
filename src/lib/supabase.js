import { createClient } from '@supabase/supabase-js'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const browserOrigin =
  typeof window !== 'undefined' && window.location?.origin ? String(window.location.origin).replace(/\/+$/, '') : ''

export const supabaseDirectUrl = String(rawSupabaseUrl || '').trim().replace(/\/+$/, '')
export const supabaseAnonKey = String(rawSupabaseAnonKey || '').trim()
export const isSupabaseDevProxyEnabled = Boolean(import.meta.env.DEV && browserOrigin && supabaseDirectUrl)
export const supabaseBaseUrl = isSupabaseDevProxyEnabled ? `${browserOrigin}/supabase` : supabaseDirectUrl

if (!supabaseBaseUrl) {
  console.error('[Supabase] VITE_SUPABASE_URL nao carregada.')
}

if (!supabaseAnonKey) {
  console.error('[Supabase] VITE_SUPABASE_ANON_KEY nao carregada.')
}

export const supabase = createClient(supabaseBaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
