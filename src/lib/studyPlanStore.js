import { supabase } from './supabase';
import { computePlanAdjustments } from './planAdjustmentEngine';
import { ensureTopicReviewCards } from './topicReviewApi';

/**
 * Persistencia do plano de estudos aprovado no Supabase (Passo 1 da trilha).
 *
 * O cronograma gerado pela IA tem o shape:
 *   { provider, model, semana: [{ dia, blocos: [{ horario, disciplina, modo,
 *     duracao, topico, justificativa }] }], resumo, prioridades, horasTotais, dica }
 *
 * Aqui ele vira a "fonte de verdade": uma linha em `study_plans` + N linhas em
 * `study_plan_blocks`. O localStorage continua como cache rapido/fallback no
 * componente; estas funcoes so falam com o banco.
 */

/** Achata a `semana` do cronograma em linhas de bloco prontas para insert. */
function flattenScheduleToBlocks(schedule) {
  const semana = Array.isArray(schedule?.semana) ? schedule.semana : [];
  const blocks = [];
  let orderIndex = 0;

  for (const day of semana) {
    const dia = day?.dia || '';
    const blocos = Array.isArray(day?.blocos) ? day.blocos : [];
    for (const bloco of blocos) {
      blocks.push({
        dia,
        horario: bloco?.horario || '',
        disciplina: bloco?.disciplina || '',
        topico: bloco?.topico || '',
        modo: bloco?.modo || 'Teoria',
        duracao: Number(bloco?.duracao) || 0,
        justificativa: bloco?.justificativa || '',
        order_index: orderIndex++,
      });
    }
  }

  return blocks;
}

/** Reconstroi o shape `{ semana: [...] }` a partir das linhas de bloco do banco. */
function rebuildScheduleFromRows(plan, blockRows) {
  const byDay = new Map();

  for (const row of blockRows) {
    if (!byDay.has(row.dia)) byDay.set(row.dia, []);
    byDay.get(row.dia).push({
      horario: row.horario,
      disciplina: row.disciplina,
      modo: row.modo,
      duracao: row.duracao,
      topico: row.topico,
      justificativa: row.justificativa,
      // metadados uteis para marcar concluido (Passo 2) sem quebrar o render atual
      _blockId: row.id,
      _status: row.status,
    });
  }

  const semana = Array.from(byDay.entries()).map(([dia, blocos]) => ({ dia, blocos }));

  return {
    planId: plan.id,
    version: plan.version,
    mode: plan.mode,
    provider: plan.provider,
    model: plan.model,
    resumo: plan.resumo,
    dica: plan.dica,
    prioridades: Array.isArray(plan.prioridades) ? plan.prioridades : [],
    horasTotais: Number(plan.horas_totais) || 0,
    semana,
  };
}

/**
 * Aprova um cronograma: arquiva o plano ativo anterior (mesmo usuario+modo) e
 * grava o novo como `approved`, com seus blocos.
 *
 * @returns {Promise<{ planId: string, version: number }>}
 */
export async function approveStudyPlan({ userId, schedule, mode = 'fixo', meta = '' }) {
  if (!userId) throw new Error('Usuario nao identificado para salvar o plano.');
  if (!Array.isArray(schedule?.semana) || schedule.semana.length === 0) {
    throw new Error('Nao ha cronograma para aprovar.');
  }

  const normalizedMode = mode === 'flexivel' ? 'flexivel' : 'fixo';

  // Descobre a proxima versao (a mais alta ja existente + 1) e arquiva o ativo.
  const { data: existing, error: existingError } = await supabase
    .from('study_plans')
    .select('id, version, status')
    .eq('user_id', userId)
    .eq('mode', normalizedMode)
    .order('version', { ascending: false });
  if (existingError) throw existingError;

  const nextVersion = (existing?.[0]?.version || 0) + 1;
  const activeIds = (existing || []).filter((p) => p.status === 'approved').map((p) => p.id);
  if (activeIds.length > 0) {
    const { error: archiveError } = await supabase
      .from('study_plans')
      .update({ status: 'archived' })
      .in('id', activeIds);
    if (archiveError) throw archiveError;
  }

  const nowIso = new Date().toISOString();
  const { data: planRow, error: planError } = await supabase
    .from('study_plans')
    .insert({
      user_id: userId,
      mode: normalizedMode,
      status: 'approved',
      version: nextVersion,
      meta: meta || '',
      provider: schedule.provider || '',
      model: schedule.model || '',
      resumo: schedule.resumo || '',
      dica: schedule.dica || '',
      prioridades: Array.isArray(schedule.prioridades) ? schedule.prioridades : [],
      horas_totais: Number(schedule.horasTotais) || 0,
      source_payload: schedule,
      generated_by: 'ai',
      approved_at: nowIso,
    })
    .select('id, version')
    .single();
  if (planError) throw planError;

  const blocks = flattenScheduleToBlocks(schedule).map((block) => ({
    ...block,
    plan_id: planRow.id,
    user_id: userId,
  }));
  if (blocks.length > 0) {
    const { error: blocksError } = await supabase.from('study_plan_blocks').insert(blocks);
    if (blocksError) throw blocksError;
  }

  // Passo 4 — inscreve na repeticao espacada os topicos que o plano ja agenda
  // como "Revisao" (conjunto intencional, evita inundar com tudo). Falha aqui
  // nao deve derrubar a aprovacao do plano.
  try {
    const reviewTopics = blocks
      .filter((b) => b.modo === 'Revisao' && b.topico)
      .map((b) => ({ disciplina: b.disciplina, topico: b.topico }));
    if (reviewTopics.length > 0) {
      await ensureTopicReviewCards({ userId, topics: reviewTopics });
    }
  } catch (err) {
    console.warn('Nao foi possivel inscrever topicos na revisao espacada:', err);
  }

  return { planId: planRow.id, version: planRow.version };
}

/**
 * Carrega o plano aprovado ativo do usuario para um modo, ja no shape de
 * cronograma consumido pelo painel. Retorna null se nao houver.
 */
export async function loadActiveStudyPlan({ userId, mode = 'fixo' }) {
  if (!userId) return null;
  const normalizedMode = mode === 'flexivel' ? 'flexivel' : 'fixo';

  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', normalizedMode)
    .eq('status', 'approved')
    .maybeSingle();
  if (planError) throw planError;
  if (!plan) return null;

  const { data: blockRows, error: blocksError } = await supabase
    .from('study_plan_blocks')
    .select('*')
    .eq('plan_id', plan.id)
    .order('order_index', { ascending: true });
  if (blocksError) throw blocksError;

  return rebuildScheduleFromRows(plan, blockRows || []);
}

/**
 * Passo 3 — roda o motor de recalculo DETERMINISTICO sobre o plano ativo e
 * persiste as mudancas (status/dia/modo/order_index dos blocos alterados) +
 * grava o log em `study_plan_adjustments`. Nao chama IA.
 *
 * @returns {Promise<{ summary: object, adjustments: Array<object> } | null>}
 *   null se nao houver plano ativo.
 */
export async function runPlanAdjustments({
  userId,
  mode = 'fixo',
  todayDia,
  accuracyByDiscipline = {},
  lowAccuracyThreshold = 0.6,
}) {
  if (!userId) throw new Error('Usuario nao identificado.');
  const normalizedMode = mode === 'flexivel' ? 'flexivel' : 'fixo';

  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('mode', normalizedMode)
    .eq('status', 'approved')
    .maybeSingle();
  if (planError) throw planError;
  if (!plan) return null;

  const { data: blockRows, error: blocksError } = await supabase
    .from('study_plan_blocks')
    .select('id, dia, order_index, status, modo, disciplina, topico, duracao')
    .eq('plan_id', plan.id)
    .order('order_index', { ascending: true });
  if (blocksError) throw blocksError;

  const original = new Map((blockRows || []).map((b) => [b.id, b]));
  const { updatedBlocks, adjustments, summary } = computePlanAdjustments({
    blocks: blockRows || [],
    todayDia,
    accuracyByDiscipline,
    lowAccuracyThreshold,
  });

  // Persiste so os blocos que realmente mudaram (dia/status/modo/order_index).
  const changed = updatedBlocks.filter((b) => {
    const prev = original.get(b.id);
    return (
      prev &&
      (prev.dia !== b.dia ||
        prev.status !== b.status ||
        prev.modo !== b.modo ||
        prev.order_index !== b.order_index)
    );
  });
  for (const b of changed) {
    const { error: updErr } = await supabase
      .from('study_plan_blocks')
      .update({ dia: b.dia, status: b.status, modo: b.modo, order_index: b.order_index })
      .eq('id', b.id);
    if (updErr) throw updErr;
  }

  if (adjustments.length > 0) {
    const rows = adjustments.map((adj) => ({
      user_id: userId,
      plan_id: plan.id,
      block_id: adj.block_id,
      adjustment_type: adj.adjustment_type,
      reason: adj.reason,
      payload: adj.payload || {},
      triggered_by: 'system',
    }));
    const { error: logErr } = await supabase.from('study_plan_adjustments').insert(rows);
    if (logErr) throw logErr;
  }

  return { summary, adjustments };
}
