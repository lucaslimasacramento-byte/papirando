import { describe, expect, it } from 'vitest';
import { computePlanAdjustments } from './planAdjustmentEngine';

function block(over = {}) {
  return {
    id: over.id || 'b1',
    dia: 'seg',
    order_index: 0,
    status: 'pending',
    modo: 'Teoria',
    disciplina: 'Portugues',
    topico: '',
    duracao: 60,
    ...over,
  };
}

describe('planAdjustmentEngine.computePlanAdjustments', () => {
  it('ATRASO: bloco pendente de dia passado e remarcado para hoje e sobe', () => {
    const blocks = [
      block({ id: 'a', dia: 'seg', order_index: 0 }), // pendente, ja passou
      block({ id: 'b', dia: 'qua', order_index: 1 }), // hoje
    ];
    const { adjustments, updatedBlocks, summary } = computePlanAdjustments({
      blocks,
      todayDia: 'qua',
    });

    expect(summary.atraso).toBe(1);
    const a = updatedBlocks.find((x) => x.id === 'a');
    expect(a.dia).toBe('qua');
    expect(a.status).toBe('rescheduled');
    // remarcado vai para a frente da fila de hoje
    expect(a.order_index).toBeLessThan(updatedBlocks.find((x) => x.id === 'b').order_index);
    expect(adjustments[0].adjustment_type).toBe('atraso');
  });

  it('ERRO: acuracia baixa sobe prioridade e volta Questoes para Teoria', () => {
    const blocks = [
      block({ id: 'a', dia: 'qua', modo: 'Questoes', disciplina: 'Direito', order_index: 0 }),
      block({ id: 'b', dia: 'qua', modo: 'Teoria', disciplina: 'Portugues', order_index: 1 }),
    ];
    const { adjustments, updatedBlocks, summary } = computePlanAdjustments({
      blocks,
      todayDia: 'qua',
      accuracyByDiscipline: { Direito: 0.4 },
      lowAccuracyThreshold: 0.6,
    });

    expect(summary.erro).toBe(1);
    const a = updatedBlocks.find((x) => x.id === 'a');
    expect(a.modo).toBe('Teoria');
    expect(a.order_index).toBeLessThan(updatedBlocks.find((x) => x.id === 'b').order_index);
    expect(adjustments[0].payload.accuracy).toBe(0.4);
  });

  it('ERRO: acuracia acima do limiar nao mexe no bloco', () => {
    const blocks = [block({ id: 'a', dia: 'qua', modo: 'Questoes', disciplina: 'Direito' })];
    const { summary, updatedBlocks } = computePlanAdjustments({
      blocks,
      todayDia: 'qua',
      accuracyByDiscipline: { Direito: 0.85 },
    });
    expect(summary.erro).toBe(0);
    expect(updatedBlocks[0].modo).toBe('Questoes');
  });

  it('CONCLUSAO ANTECIPADA: tudo de hoje feito puxa proximo bloco futuro', () => {
    const blocks = [
      block({ id: 'a', dia: 'qua', status: 'done', order_index: 0 }),
      block({ id: 'b', dia: 'qui', status: 'pending', order_index: 1 }),
      block({ id: 'c', dia: 'sex', status: 'pending', order_index: 2 }),
    ];
    const { adjustments, updatedBlocks, summary } = computePlanAdjustments({
      blocks,
      todayDia: 'qua',
    });

    expect(summary.conclusao_antecipada).toBe(1);
    const b = updatedBlocks.find((x) => x.id === 'b');
    expect(b.dia).toBe('qua'); // o mais proximo (qui) foi antecipado, nao o de sex
    expect(adjustments.some((adj) => adj.adjustment_type === 'conclusao_antecipada')).toBe(true);
  });

  it('CONCLUSAO ANTECIPADA: nao dispara se ainda ha bloco pendente hoje', () => {
    const blocks = [
      block({ id: 'a', dia: 'qua', status: 'done' }),
      block({ id: 'b', dia: 'qua', status: 'pending' }),
      block({ id: 'c', dia: 'qui', status: 'pending' }),
    ];
    const { summary } = computePlanAdjustments({ blocks, todayDia: 'qua' });
    expect(summary.conclusao_antecipada).toBe(0);
  });

  it('plano sem sinais nao gera ajustes e preserva blocos', () => {
    const blocks = [
      block({ id: 'a', dia: 'qua', status: 'pending' }),
      block({ id: 'b', dia: 'qui', status: 'pending' }),
    ];
    const { adjustments, summary } = computePlanAdjustments({ blocks, todayDia: 'qua' });
    expect(adjustments).toHaveLength(0);
    expect(summary).toEqual({ atraso: 0, erro: 0, conclusao_antecipada: 0 });
  });

  it('order_index e resequenciado sem buracos', () => {
    const blocks = [
      block({ id: 'a', dia: 'seg', order_index: 5 }),
      block({ id: 'b', dia: 'qua', order_index: 9 }),
      block({ id: 'c', dia: 'sex', order_index: 2 }),
    ];
    const { updatedBlocks } = computePlanAdjustments({ blocks, todayDia: 'dom' });
    const indices = updatedBlocks.map((b) => b.order_index).sort((x, y) => x - y);
    expect(indices).toEqual([0, 1, 2]);
  });
});
