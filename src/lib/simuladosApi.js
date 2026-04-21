import { supabase } from './supabase';

function normalizeSimuladoRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    id: row?.id || `row-${index + 1}`,
    disciplina: String(row?.disciplina || '').trim(),
    topico: String(row?.topico || '').trim(),
    peso: Number(row?.peso || 1),
    brancos: Number(row?.brancos || 0),
    acertos: Number(row?.acertos || 0),
    erros: Number(row?.erros || 0),
  }));
}

function computeSimuladoStats(record = {}) {
  const rows = normalizeSimuladoRows(record.rows);
  const totals = rows.reduce(
    (acc, row) => {
      acc.acertos += Number(row.acertos || 0);
      acc.erros += Number(row.erros || 0);
      acc.brancos += Number(row.brancos || 0);
      return acc;
    },
    { acertos: 0, erros: 0, brancos: 0 }
  );

  const totalQuestoes = totals.acertos + totals.erros + totals.brancos;
  return {
    acertos: totals.acertos,
    erros: totals.erros,
    brancos: totals.brancos,
    totalQuestoes,
    desempenho: totalQuestoes > 0 ? Math.round((totals.acertos / totalQuestoes) * 100) : 0,
    notaLiquida: Number((totals.acertos - totals.erros).toFixed(2)),
  };
}

function normalizeSimuladoRecord(row = {}) {
  const rows = normalizeSimuladoRows(row.rows);
  const computed = computeSimuladoStats({ rows });

  return {
    id: row.id || `simulado-${Date.now()}`,
    nome: String(row.nome || 'Simulado externo').trim() || 'Simulado externo',
    data: String(row.data || new Date().toISOString().slice(0, 10)).slice(0, 10),
    estilo: String(row.estilo || '').trim(),
    banca: String(row.banca || '').trim(),
    tempo: String(row.tempo || '00:00:00').trim() || '00:00:00',
    comentarios: String(row.comentarios || '').trim(),
    rows,
    acertos: Number(row.acertos ?? computed.acertos),
    erros: Number(row.erros ?? computed.erros),
    brancos: Number(row.brancos ?? computed.brancos),
    totalQuestoes: Number(row.total_questoes ?? computed.totalQuestoes),
    desempenho: Number(row.desempenho ?? computed.desempenho),
    notaLiquida: Number(row.nota_liquida ?? computed.notaLiquida),
  };
}

export async function loadSimulados(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('simulado_records')
    .select('*')
    .eq('user_id', userId)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(normalizeSimuladoRecord);
}

export async function saveSimulado(userId, record = {}) {
  if (!userId) throw new Error('Usuário não autenticado.');

  const normalized = normalizeSimuladoRecord(record);
  const payload = {
    id: normalized.id,
    user_id: userId,
    nome: normalized.nome,
    data: normalized.data,
    estilo: normalized.estilo,
    banca: normalized.banca,
    tempo: normalized.tempo,
    comentarios: normalized.comentarios,
    rows: normalized.rows,
    acertos: normalized.acertos,
    erros: normalized.erros,
    brancos: normalized.brancos,
    total_questoes: normalized.totalQuestoes,
    desempenho: normalized.desempenho,
    nota_liquida: normalized.notaLiquida,
  };

  const { data, error } = await supabase
    .from('simulado_records')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return normalizeSimuladoRecord(data || payload);
}

export async function deleteSimulado(userId, simuladoId) {
  if (!userId || !simuladoId) return;

  const { error } = await supabase
    .from('simulado_records')
    .delete()
    .eq('user_id', userId)
    .eq('id', simuladoId);

  if (error) throw error;
}

export async function fetchSimuladoStats(userId) {
  const simulados = await loadSimulados(userId);
  const total = simulados.length;
  const mediaDesempenho =
    total > 0
      ? Math.round(simulados.reduce((acc, item) => acc + Number(item.desempenho || 0), 0) / total)
      : 0;
  const melhorNota = total > 0 ? Math.max(...simulados.map((item) => Number(item.desempenho || 0))) : 0;

  return { total, mediaDesempenho, melhorNota };
}
