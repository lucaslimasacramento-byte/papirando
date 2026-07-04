import { supabase } from './supabase';

const VALID_TIPOS = ['concurso', 'vestibular', 'faculdade', 'livre'];

function normalizeTipo(tipo) {
  const t = String(tipo || '').toLowerCase().trim();
  if (VALID_TIPOS.includes(t)) return t;
  if (t.includes('vestib')) return 'vestibular';
  if (t.includes('facul') || t.includes('gradua') || t.includes('superior')) return 'faculdade';
  if (t.includes('livre')) return 'livre';
  return 'concurso';
}

// Registra um objetivo criado pelo aluno (demanda p/ o admin). Fire-and-forget:
// nunca deve quebrar o fluxo de criação de curso — só loga em caso de erro.
export async function recordCustomObjective(userId, { nome, tipo } = {}) {
  const clean = String(nome || '').trim();
  if (!userId || !clean) return { ok: false };
  try {
    const { error } = await supabase.from('custom_objectives').insert({
      user_id: userId,
      nome: clean.slice(0, 200),
      tipo: normalizeTipo(tipo),
    });
    if (error) {
      // Tabela ainda não criada (42P01) ou RLS — não é fatal.
      if (error.code !== '42P01') {
        console.warn('[custom_objectives] falha ao registrar:', error.message || error);
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.warn('[custom_objectives] erro inesperado:', e?.message || e);
    return { ok: false, error: String(e?.message || e) };
  }
}

// Carrega todos os objetivos personalizados (uso admin — RLS libera só p/ admin).
export async function loadCustomObjectives({ limit = 500 } = {}) {
  try {
    const { data, error } = await supabase
      .from('custom_objectives')
      .select('id, user_id, nome, tipo, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      if (error.code === '42P01') {
        return { ok: false, missingTable: true, items: [] };
      }
      return { ok: false, error: error.message, items: [] };
    }
    return { ok: true, items: Array.isArray(data) ? data : [] };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), items: [] };
  }
}

// Agrega por (nome normalizado + tipo) para o admin ver o que é mais pedido.
export function aggregateCustomObjectives(items = []) {
  const map = new Map();
  for (const it of items) {
    const key = `${normalizeTipo(it.tipo)}::${String(it.nome || '').trim().toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, { nome: String(it.nome || '').trim(), tipo: normalizeTipo(it.tipo), count: 0, lastAt: it.created_at });
    }
    const entry = map.get(key);
    entry.count += 1;
    if (it.created_at && (!entry.lastAt || it.created_at > entry.lastAt)) entry.lastAt = it.created_at;
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || String(b.lastAt).localeCompare(String(a.lastAt)));
}
