import { supabase } from './supabase';

async function getSessionToken() {
  const { data } = await supabase.auth.getSession();
  return String(data?.session?.access_token || '').trim();
}

async function fetchInviteApi(path = '', { method = 'GET', body } = {}) {
  const token = await getSessionToken();
  if (!token) throw new Error('Sessao admin invalida. Faca login novamente.');

  const response = await fetch(`/api/beta-invites${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || data?.error || 'Nao foi possivel acessar os convites beta.';
    throw new Error(message);
  }

  return data;
}

/** Retorna todos os convites (admin only via API/RPC) */
export async function loadBetaInvites() {
  const data = await fetchInviteApi();
  return Array.isArray(data) ? data : [];
}

/** Cria um convite para o e-mail informado (admin only via API/RPC) */
export async function createBetaInvite({ email, nome = '', observacao = '' }) {
  return fetchInviteApi('', {
    method: 'POST',
    body: { email: email.toLowerCase().trim(), nome, observacao },
  });
}

/** Remove um convite (admin only via API/RPC) */
export async function deleteBetaInvite(id) {
  await fetchInviteApi(`?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Verifica se o e-mail do usuário logado está na lista de convidados */
export async function checkMyBetaInvite() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { data } = await supabase
    .from('beta_invites')
    .select('id, email, nome, token, used_at')
    .eq('email', user.email.toLowerCase().trim())
    .maybeSingle();
  return data || null;
}

/** Marca o convite do usuário logado como usado */
export async function markMyInviteUsed() {
  const { error } = await supabase.rpc('mark_beta_invite_used');
  if (error) throw error;
}

/** Retorna a URL de convite a partir de um token */
export function buildInviteUrl(token) {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/?beta=${token}`;
}

export function normalizeBetaInviteToken(value) {
  return String(value || '').trim().replace(/[^a-fA-F0-9]/g, '').slice(0, 64).toLowerCase();
}

export function extractBetaInviteTokenFromLocation(locationLike = null) {
  const source =
    locationLike ||
    (typeof window !== 'undefined'
      ? { search: window.location.search, hash: window.location.hash }
      : null);
  if (!source) return '';

  const searchParams = new URLSearchParams(String(source.search || ''));
  const byQuery = normalizeBetaInviteToken(searchParams.get('beta') || searchParams.get('betaInvite'));
  if (byQuery) return byQuery;

  const hash = String(source.hash || '');
  const hashQueryPart = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  if (hashQueryPart) {
    const hp = new URLSearchParams(hashQueryPart);
    return normalizeBetaInviteToken(hp.get('beta') || hp.get('betaInvite'));
  }

  return '';
}
