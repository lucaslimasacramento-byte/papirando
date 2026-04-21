import { supabase } from './supabase';

export async function loadAudiobookProgress(userId) {
  if (!userId) return {};

  const { data, error } = await supabase
    .from('audiobook_progress')
    .select('audiobook_id, progresso, duracao, farthest_time, concluido')
    .eq('user_id', userId);

  if (error) throw error;

  return (Array.isArray(data) ? data : []).reduce((acc, row) => {
    const key = String(row?.audiobook_id || '').trim();
    if (!key) return acc;

    acc[key] = {
      progresso: Math.max(0, Number(row?.progresso || 0)),
      duracao: Math.max(0, Number(row?.duracao || 0)),
      farthest_time: Math.max(0, Number(row?.farthest_time || 0)),
      concluido: Boolean(row?.concluido),
    };

    return acc;
  }, {});
}

export async function saveAudiobookProgress(
  userId,
  audiobookId,
  { progresso = 0, duracao = 0, farthestTime = 0, concluido = false } = {}
) {
  if (!userId || !audiobookId) return null;

  const payload = {
    user_id: userId,
    audiobook_id: String(audiobookId),
    progresso: Math.max(0, Number(progresso || 0)),
    duracao: Math.max(0, Number(duracao || 0)),
    farthest_time: Math.max(0, Number(farthestTime || 0)),
    concluido: Boolean(concluido),
  };

  const { data, error } = await supabase
    .from('audiobook_progress')
    .upsert(payload, { onConflict: 'user_id,audiobook_id' })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data || null;
}
