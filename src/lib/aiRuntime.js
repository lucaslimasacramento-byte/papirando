import { supabase } from './supabase';

export function resolveAiBaseUrl() {
  const envBase =
    typeof import.meta !== 'undefined' && import.meta?.env?.VITE_AI_SERVER_URL
      ? String(import.meta.env.VITE_AI_SERVER_URL).trim()
      : '';

  if (envBase) return envBase.replace(/\/+$/, '');
  return '';
}

async function resolveAiBearerToken() {
  const staticToken =
    typeof import.meta !== 'undefined' && import.meta?.env?.VITE_AI_SERVER_TOKEN
      ? String(import.meta.env.VITE_AI_SERVER_TOKEN).trim()
      : '';

  if (staticToken) return staticToken;

  try {
    const { data } = await supabase.auth.getSession();
    return String(data?.session?.access_token || '').trim();
  } catch {
    return '';
  }
}

export async function resolveAiHeaders() {
  const token = await resolveAiBearerToken();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getAiUnavailableMessage() {
  return 'Servidor de IA nao configurado neste ambiente.';
}
