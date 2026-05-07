import { supabase } from './supabase';

const COLS = 'id, email, token, nome, observacao, invited_at, used_at, used_by_user_id';

/** Retorna todos os convites (admin only via RLS) */
export async function loadBetaInvites() {
  const { data, error } = await supabase
    .from('beta_invites')
    .select(COLS)
    .order('invited_at', { ascending: false })
    .limit(300);

  if (error) throw new Error(error.message || String(error));
  return data || [];
}

/** Cria um convite para o e-mail informado (admin only via RLS) */
export async function createBetaInvite({ email, nome = '', observacao = '' }) {
  const { data, error } = await supabase
    .from('beta_invites')
    .insert({ email: email.toLowerCase().trim(), nome, observacao })
    .select(COLS)
    .single();

  if (error) throw new Error(error.message || String(error));
  return data;
}

/** Remove um convite (admin only via RLS) */
export async function deleteBetaInvite(id) {
  const { error } = await supabase.from('beta_invites').delete().eq('id', id);
  if (error) throw new Error(error.message || String(error));
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
