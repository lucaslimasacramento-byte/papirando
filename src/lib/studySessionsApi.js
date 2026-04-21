import { supabase } from './supabase';

function normalizeSessionRecord(record = {}) {
  return {
    id: record.id || '',
    disciplina: String(record.disciplina || '').trim(),
    disciplinaId: record.disciplinaId || record.disciplina_id || null,
    topico: String(record.topico || '').trim(),
    topicoId: record.topicoId || record.topico_id || null,
    material: String(record.material || '').trim(),
    plano: String(record.plano || '').trim(),
    tipo: String(record.tipo || '').trim(),
    cor: String(record.cor || '').trim(),
    tempo: String(record.tempo || '00:00:00').trim() || '00:00:00',
    acertos: Number(record.acertos || 0),
    erros: Number(record.erros || 0),
    desempenho: Number(record.desempenho || 0),
    data: String(record.data || new Date().toISOString().slice(0, 10)).slice(0, 10),
  };
}

function toSupabasePayload(userId, record = {}) {
  const normalized = normalizeSessionRecord(record);

  return {
    id: normalized.id || undefined,
    user_id: userId,
    disciplina: normalized.disciplina,
    disciplina_id: normalized.disciplinaId,
    topico: normalized.topico,
    topico_id: normalized.topicoId,
    material: normalized.material,
    plano: normalized.plano,
    tipo: normalized.tipo,
    cor: normalized.cor,
    tempo: normalized.tempo,
    acertos: normalized.acertos,
    erros: normalized.erros,
    desempenho: normalized.desempenho,
    data: normalized.data,
  };
}

function fromSupabaseRow(row = {}) {
  return normalizeSessionRecord({
    id: row.id,
    disciplina: row.disciplina,
    disciplinaId: row.disciplina_id,
    topico: row.topico,
    topicoId: row.topico_id,
    material: row.material,
    plano: row.plano,
    tipo: row.tipo,
    cor: row.cor,
    tempo: row.tempo,
    acertos: row.acertos,
    erros: row.erros,
    desempenho: row.desempenho,
    data: row.data,
  });
}

export async function saveStudySession(userId, record) {
  if (!userId) throw new Error('Usuário não autenticado.');

  const payload = toSupabasePayload(userId, record);
  const { data, error } = await supabase
    .from('study_sessions')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return fromSupabaseRow(data || payload);
}

export async function loadStudySessions(userId, opts = {}) {
  if (!userId) return [];

  let query = supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });

  if (opts?.limit) {
    query = query.limit(Number(opts.limit));
  }

  const { data, error } = await query;
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(fromSupabaseRow);
}

export async function syncLocalToSupabase(userId, records = []) {
  if (!userId || !Array.isArray(records) || records.length === 0) return [];

  const normalized = records
    .map((item) => normalizeSessionRecord(item))
    .filter((item) => item.id);

  if (normalized.length === 0) return [];

  const payload = normalized.map((item) => toSupabasePayload(userId, item));
  const { error } = await supabase
    .from('study_sessions')
    .upsert(payload, { onConflict: 'id', ignoreDuplicates: true });

  if (error) throw error;
  return normalized;
}
