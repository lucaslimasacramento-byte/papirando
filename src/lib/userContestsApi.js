import { supabase } from './supabase';

function normalizeUserContest(row = {}) {
  return {
    id: row.id,
    contest_slug: String(row.contest_slug || row.slug || '').trim(),
    contest_nome: String(row.contest_nome || row.nome || '').trim(),
    banca: String(row.banca || '').trim(),
    area: String(row.area || '').trim(),
    is_target: Boolean(row.is_target),
  };
}

export async function loadUserContests(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('user_contests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(normalizeUserContest);
}

export async function addUserContest(userId, contest = {}) {
  if (!userId) throw new Error('Usuário não autenticado.');

  const payload = {
    user_id: userId,
    contest_slug: String(contest.slug || '').trim(),
    contest_nome: String(contest.nome || '').trim(),
    banca: String(contest.banca || '').trim(),
    area: String(contest.area || '').trim(),
    is_target: Boolean(contest.isTarget),
  };

  const { data, error } = await supabase
    .from('user_contests')
    .upsert(payload, { onConflict: 'user_id,contest_slug' })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return normalizeUserContest(data || payload);
}

export async function setTargetContest(userId, contestSlug = '') {
  if (!userId) throw new Error('Usuário não autenticado.');

  const normalizedSlug = String(contestSlug || '').trim();

  const { error: clearError } = await supabase
    .from('user_contests')
    .update({ is_target: false })
    .eq('user_id', userId);

  if (clearError) throw clearError;

  if (!normalizedSlug) return null;

  const { data, error } = await supabase
    .from('user_contests')
    .upsert(
      {
        user_id: userId,
        contest_slug: normalizedSlug,
        is_target: true,
      },
      { onConflict: 'user_id,contest_slug' }
    )
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return normalizeUserContest(data || { user_id: userId, contest_slug: normalizedSlug, is_target: true });
}

export async function removeUserContest(userId, contestSlug = '') {
  if (!userId || !contestSlug) return;

  const { error } = await supabase
    .from('user_contests')
    .delete()
    .eq('user_id', userId)
    .eq('contest_slug', String(contestSlug).trim());

  if (error) throw error;
}
