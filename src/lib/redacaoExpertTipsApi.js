import { supabase } from './supabase';

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

/** IDs fixos para o primeiro upsert coincidir com o seed do banco (opcional). */
export const DEFAULT_REDACAO_EXPERT_TIPS = [
  {
    id: 'a0000001-0001-4000-8000-000000000001',
    title: 'Esqueleto CEBRASPE (dissertação)',
    body:
      '1) Introdução: contextualize o tema em uma ou duas frases e apresente tese clara.\n' +
      '2) Desenvolvimento: dois parágrafos com argumentos distintos; use conectivos (Nesse sentido, Ademais).\n' +
      '3) Conclusão: retome a tese e, se couber, proponha medida com agente + ação + finalidade.\n' +
      'Evite adjetivação excessiva; priorize clareza e aderência ao comando da banca.',
    sort_order: 0,
  },
  {
    id: 'a0000001-0002-4000-8000-000000000002',
    title: 'Padrão FCC (texto dissertativo)',
    body:
      'Parágrafo de abertura com panorama do tema e delimitação do que será defendido.\n' +
      'Bloco central com exemplos ou dados genéricos (sem inventar estatística específica).\n' +
      'Fechamento articulando visão crítica e síntese — evite repetir literalmente a introdução.',
    sort_order: 1,
  },
];

export function normalizeRedacaoExpertTip(row) {
  const payload = row && typeof row === 'object' ? row : {};
  let id = String(payload.id || '').trim();
  if (!id || !isUuid(id)) id = newId();
  return {
    id,
    title: String(payload.title || '').trim() || 'Sem título',
    body: String(payload.body || '').trim(),
    sort_order: Number(payload.sort_order ?? 0),
  };
}

export async function fetchRedacaoExpertTipsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('redacao_expert_tips')
      .select('id, title, body, sort_order')
      .order('sort_order', { ascending: true });
    if (error) return { ok: false, error: error.message, items: null };
    if (!Array.isArray(data) || data.length === 0) return { ok: true, items: null };
    return { ok: true, items: data.map(normalizeRedacaoExpertTip) };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), items: null };
  }
}

/**
 * Substitui o catálogo no Supabase: remove ids que sumiram e faz upsert do restante.
 * Retorna a lista normalizada salva ou lança erro.
 */
export async function syncRedacaoExpertTipsToSupabase(nextItems = [], previousIds = []) {
  const next = (Array.isArray(nextItems) ? nextItems : []).map((row, index) => ({
    ...normalizeRedacaoExpertTip(row),
    sort_order: index,
  }));
  const keep = new Set(next.map((r) => r.id));
  const toDelete = (Array.isArray(previousIds) ? previousIds : []).filter((id) => id && !keep.has(id));

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase.from('redacao_expert_tips').delete().in('id', toDelete);
    if (delErr) throw new Error(delErr.message);
  }

  if (next.length > 0) {
    const payload = next.map(({ id, title, body, sort_order }) => ({
      id,
      title,
      body,
      sort_order,
      updated_at: new Date().toISOString(),
    }));
    const { error: upErr } = await supabase.from('redacao_expert_tips').upsert(payload, { onConflict: 'id' });
    if (upErr) throw new Error(upErr.message);
  }

  return next;
}
