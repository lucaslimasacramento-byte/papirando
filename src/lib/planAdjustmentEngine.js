/**
 * Motor de recalculo DETERMINISTICO do plano de estudos (Passo 3 da trilha).
 *
 * Reage a sinais do dia a dia SEM chamar a IA — e aritmetica + reordenacao:
 *   1. ATRASO               — bloco pendente cujo dia da semana ja passou.
 *   2. ERRO                 — disciplina com baixa acuracia em questoes.
 *   3. CONCLUSAO ANTECIPADA — todos os blocos de hoje feitos, sobra tempo.
 *
 * A funcao e PURA: recebe o estado + sinais e devolve os blocos atualizados e a
 * lista de ajustes. Nao toca em banco nem em Date — o dia atual entra por
 * parametro (testavel e reproduzivel). A persistencia fica no studyPlanStore.
 */

// Mesma ordem usada no Planejamento (domingo = 0).
export const WEEKDAY_ORDER = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function dayIndex(dia) {
  const idx = WEEKDAY_ORDER.indexOf(dia);
  return idx >= 0 ? idx : 99; // dias desconhecidos vao para o fim
}

/**
 * @param {{
 *   blocks: Array<{ id: string, dia: string, order_index: number, status: string,
 *                   modo: string, disciplina: string, topico?: string, duracao?: number }>,
 *   todayDia: string,
 *   accuracyByDiscipline?: Record<string, number>,  // fracao 0..1 por nome de disciplina
 *   lowAccuracyThreshold?: number,                   // padrao 0.6
 * }} params
 * @returns {{
 *   updatedBlocks: Array<object>,
 *   adjustments: Array<{ block_id: string, adjustment_type: string, reason: string, payload: object }>,
 *   summary: { atraso: number, erro: number, conclusao_antecipada: number },
 * }}
 */
export function computePlanAdjustments({
  blocks = [],
  todayDia,
  accuracyByDiscipline = {},
  lowAccuracyThreshold = 0.6,
}) {
  const today = dayIndex(todayDia);
  // Copia de trabalho; bucket 0 = vai para a frente (urgente), 1 = normal.
  const work = blocks.map((b) => ({ ...b, _bucket: 1 }));
  const adjustments = [];
  const summary = { atraso: 0, erro: 0, conclusao_antecipada: 0 };

  // ── Regra 1: ATRASO ──────────────────────────────────────────────
  // Bloco pendente de um dia que ja passou nesta semana e remarcado para hoje
  // e sobe para a frente. So faz sentido se hoje e um dia valido.
  if (today <= 6) {
    for (const b of work) {
      if (b.status === 'pending' && dayIndex(b.dia) < today) {
        const fromDia = b.dia;
        b.status = 'rescheduled';
        b.dia = todayDia;
        b._bucket = 0;
        adjustments.push({
          block_id: b.id,
          adjustment_type: 'atraso',
          reason: `Bloco de ${fromDia} nao foi concluido a tempo; remarcado para hoje.`,
          payload: { from_dia: fromDia, to_dia: todayDia, disciplina: b.disciplina },
        });
        summary.atraso += 1;
      }
    }
  }

  // ── Regra 2: ERRO ────────────────────────────────────────────────
  // Disciplina com acuracia abaixo do limiar: sobe a prioridade dos blocos
  // pendentes e, se o modo era so "Questoes", volta para "Teoria" (fundamentos).
  for (const b of work) {
    if (b.status !== 'pending' && b.status !== 'rescheduled') continue;
    const acc = accuracyByDiscipline[b.disciplina];
    if (typeof acc !== 'number' || acc >= lowAccuracyThreshold) continue;

    const oldModo = b.modo;
    const newModo = b.modo === 'Questoes' ? 'Teoria' : b.modo;
    b.modo = newModo;
    b._bucket = 0;
    adjustments.push({
      block_id: b.id,
      adjustment_type: 'erro',
      reason: `Acuracia baixa em ${b.disciplina} (${Math.round(acc * 100)}%); prioridade elevada${
        oldModo !== newModo ? ' e retorno a teoria' : ''
      }.`,
      payload: { disciplina: b.disciplina, accuracy: acc, old_modo: oldModo, new_modo: newModo },
    });
    summary.erro += 1;
  }

  // ── Regra 3: CONCLUSAO ANTECIPADA ────────────────────────────────
  // Se todos os blocos de hoje ja estao 'done' (e existe pelo menos um), puxa
  // o proximo bloco pendente de um dia futuro para hoje.
  const todaysBlocks = work.filter((b) => dayIndex(b.dia) === today);
  const todayAllDone = todaysBlocks.length > 0 && todaysBlocks.every((b) => b.status === 'done');
  if (todayAllDone) {
    const nextPending = work
      .filter((b) => b.status === 'pending' && dayIndex(b.dia) > today)
      .sort((a, z) => dayIndex(a.dia) - dayIndex(z.dia) || (a.order_index - z.order_index))[0];
    if (nextPending) {
      const fromDia = nextPending.dia;
      nextPending.dia = todayDia;
      nextPending._bucket = 0;
      adjustments.push({
        block_id: nextPending.id,
        adjustment_type: 'conclusao_antecipada',
        reason: `Hoje concluido antes do previsto; ${nextPending.disciplina} (${fromDia}) antecipada.`,
        payload: { from_dia: fromDia, to_dia: todayDia, disciplina: nextPending.disciplina },
      });
      summary.conclusao_antecipada += 1;
    }
  }

  // ── Resequencia order_index globalmente ──────────────────────────
  // Ordena por dia, depois bucket (urgentes primeiro), depois ordem original.
  const sorted = [...work].sort(
    (a, z) =>
      dayIndex(a.dia) - dayIndex(z.dia) ||
      a._bucket - z._bucket ||
      (a.order_index - z.order_index)
  );
  sorted.forEach((b, i) => {
    b.order_index = i;
  });

  const updatedBlocks = sorted.map((b) => {
    const clone = { ...b };
    delete clone._bucket;
    return clone;
  });
  return { updatedBlocks, adjustments, summary };
}
