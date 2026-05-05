import {
  supabase,
  supabaseAnonKey,
  supabaseBaseUrl,
  supabaseConfigError,
  supabaseDirectUrl,
  supabaseProjectRefFromUrl,
} from './supabase';

const INVITE_COLUMNS = 'id, email, token, nome, observacao, invited_at, used_at, used_by_user_id';
const MISSING_RPC_CODES = new Set(['42883', 'PGRST202']);
const AUTH_STORAGE_KEY = supabaseProjectRefFromUrl ? `sb-${supabaseProjectRefFromUrl}-auth-token` : '';

function formatSupabaseError(error, context) {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || '').trim();
  const details = String(error?.details || '').trim();
  const hint = String(error?.hint || '').trim();
  const status = String(error?.status || '').trim();
  const name = String(error?.name || '').trim();

  console.error(`[betaInvites] ${context} error:`, {
    code,
    message,
    details,
    hint,
    status,
    name,
    raw: error,
  });

  if (supabaseConfigError) {
    return supabaseConfigError;
  }

  if (/failed to fetch|networkerror|fetch/i.test(message)) {
    const target = supabaseDirectUrl || 'VITE_SUPABASE_URL nao configurada';
    return `Falha de conexao com o Supabase (${target}). Confira se a URL em .env esta correta, reinicie o Vite e teste sua rede/firewall.`;
  }

  if (code === 'PGRST301') {
    return 'Sessao expirada. Faca login novamente e tente de novo.';
  }

  if (code === 'P0001' && /acesso negado/i.test(message)) {
    return 'Acesso negado pelo Supabase. Faca login novamente com um usuario admin e confira se public.profiles.role = admin.';
  }

  if (code === '42P01') {
    return 'A tabela beta_invites nao existe no Supabase. Rode supabase/admin_rls_helpers.sql, supabase/beta_invites.sql e supabase/beta_invites_rpc.sql no SQL Editor.';
  }

  if (code === '42501') {
    return 'Seu usuario nao tem permissao de admin para beta_invites. Confira public.profiles.role = admin e o script supabase/admin_rls_helpers.sql.';
  }

  if (message) {
    return message;
  }

  return `Nao foi possivel acessar beta_invites no Supabase. Contexto: ${context}. Codigo: ${code || status || name || 'sem codigo retornado'}.`;
}

function shouldFallbackToDirectTable(error, { allowAccessDenied = false } = {}) {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || '').trim();
  return MISSING_RPC_CODES.has(code) || (allowAccessDenied && code === 'P0001' && /acesso negado/i.test(message));
}

function firstRpcRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

function getStoredAccessToken() {
  if (typeof window === 'undefined' || !AUTH_STORAGE_KEY) return '';
  try {
    const parsed = JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    return String(parsed?.access_token || parsed?.currentSession?.access_token || '').trim();
  } catch {
    return '';
  }
}

async function getAccessToken() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = String(data?.session?.access_token || '').trim();
    if (token) return token;
  } catch {
    // Falling back to localStorage keeps this admin screen independent from transient auth fetch failures.
  }
  return getStoredAccessToken();
}

function isUsableJwt(value) {
  const token = String(value || '').trim();
  return token.length > 0 && token.length <= 4096 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

async function betaInvitesRest(path, { method = 'GET', body, requireAuth = false } = {}) {
  const accessToken = await getAccessToken();
  if (requireAuth && !accessToken) {
    throw new Error('Sessao nao encontrada. Faca login novamente com o usuario admin e tente de novo.');
  }

  const requestUrl = `${supabaseBaseUrl}/rest/v1/${path}`;
  const response = await fetch(requestUrl, {
    method,
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json', Prefer: 'return=representation' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 140);
      if (method === 'GET' && response.ok && /^<!doctype html|^<html/i.test(snippet)) {
        console.warn('[betaInvites] REST retornou HTML para listagem. Tratando como lista vazia.', {
          requestUrl,
          status: response.status,
          snippet,
        });
        return [];
      }

      throw new Error(
        `Supabase retornou HTML em vez de JSON (${response.status || 'sem status'}). Limpe os cookies de 127.0.0.1/localhost ou abra em janela anonima. Trecho: ${snippet}`
      );
    }
  }

  if (!response.ok) {
    throw new Error(
      formatSupabaseError(
        {
          ...(payload || {}),
          status: response.status,
          message: payload?.message || response.statusText,
        },
        `rest.${method}.${path}`
      )
    );
  }

  return payload;
}

async function betaInvitesLocalApi(path = '', { method = 'GET', body, requireAuth = false } = {}) {
  const accessToken = await getAccessToken();
  const shouldSendAuth = requireAuth && isUsableJwt(accessToken);
  if (requireAuth && !shouldSendAuth) {
    throw new Error('Sessao nao encontrada. Faca login novamente com o usuario admin e tente de novo.');
  }

  const response = await fetch(`/api/beta-invites${path}`, {
    method,
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      ...(shouldSendAuth ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`API local retornou resposta nao JSON (${response.status}). Trecho: ${text.slice(0, 140)}`);
    }
  }

  if (!response.ok) {
    throw new Error(
      formatSupabaseError(
        {
          ...(payload || {}),
          status: response.status,
          message: payload?.message || response.statusText,
        },
        `local.${method}.${path || '/'}`
      )
    );
  }

  return payload;
}

async function requireAuthenticatedUser(context) {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(formatSupabaseError(error, `${context}.auth`));
  }

  if (!data?.user?.id) {
    throw new Error('Sessao nao encontrada. Faca login novamente com o usuario admin e tente de novo.');
  }

  return data.user;
}

/** Retorna todos os convites (admin only via RLS) */
export async function loadBetaInvites() {
  if (import.meta.env.DEV) {
    return betaInvitesLocalApi('');
  }

  return betaInvitesRest(
    `beta_invites?select=${encodeURIComponent(INVITE_COLUMNS)}&order=invited_at.desc&limit=300`
  );
}

/** Cria um convite para o e-mail informado (admin only via RLS) */
export async function createBetaInvite({ email, nome = '', observacao = '' }) {
  const normalizedEmail = email.toLowerCase().trim();
  const requestOptions = {
    method: 'POST',
    requireAuth: true,
    body: {
      email: normalizedEmail,
      nome,
      observacao,
    },
  };
  const data = import.meta.env.DEV
    ? await betaInvitesLocalApi('', requestOptions)
    : await betaInvitesRest(`beta_invites?select=${encodeURIComponent(INVITE_COLUMNS)}`, requestOptions);

  return firstRpcRow(data);
}

/** Remove um convite (admin only via RLS) */
export async function deleteBetaInvite(id) {
  const requestOptions = {
    method: 'DELETE',
    requireAuth: true,
  };

  if (import.meta.env.DEV) {
    await betaInvitesLocalApi(`?id=${encodeURIComponent(id)}`, requestOptions);
    return;
  }

  await betaInvitesRest(`beta_invites?id=eq.${encodeURIComponent(id)}`, requestOptions);
}

/** Verifica se o e-mail do usuario logado esta na lista de convidados */
export async function checkMyBetaInvite() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data } = await supabase
    .from('beta_invites')
    .select('id, email, nome, token, used_at')
    .eq('email', user.email.toLowerCase().trim())
    .maybeSingle();

  return data || null;
}

/** Marca o convite do usuario logado como usado */
export async function markMyInviteUsed() {
  const { error } = await supabase.rpc('mark_beta_invite_used');
  if (error) throw error;
}

/** Retorna a URL de convite a partir de um token */
export function buildInviteUrl(token) {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/?beta=${token}`;
}
