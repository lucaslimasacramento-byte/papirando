import { describe, it, expect } from 'vitest';
import { newCard, scheduleCard, getDueCards, countDueToday, State } from './fsrs';

describe('newCard', () => {
  it('cria cartão com estado New e reps zero', () => {
    const card = newCard();
    expect(card.state).toBe(State.New);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
  });

  it('due inicial é no passado (cartão disponível imediatamente)', () => {
    const card = newCard();
    expect(new Date(card.due).getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe('scheduleCard', () => {
  it('rating 1 (Again) mantém cartão em Learning', () => {
    const card = newCard();
    const updated = scheduleCard(card, 1);
    expect([State.Learning, State.Relearning]).toContain(updated.state);
    expect(updated.reps).toBeGreaterThanOrEqual(0);
  });

  it('rating 4 (Easy) avança card para Review', () => {
    const card = newCard();
    const updated = scheduleCard(card, 4);
    expect(updated.state).toBe(State.Review);
    expect(updated.scheduled_days).toBeGreaterThan(0);
  });

  it('rating 3 (Good) incrementa reps', () => {
    const card = newCard();
    const updated = scheduleCard(card, 3);
    expect(updated.reps).toBeGreaterThan(card.reps);
  });

  it('atualiza last_review para data recente', () => {
    const card = newCard();
    const before = Date.now();
    const updated = scheduleCard(card, 3);
    expect(new Date(updated.last_review).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it('due após rating 4 é no futuro', () => {
    const card = newCard();
    const updated = scheduleCard(card, 4);
    expect(new Date(updated.due).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('getDueCards', () => {
  it('retorna somente cartões com due no passado ou agora', () => {
    const past = { ...newCard(), due: new Date(Date.now() - 1000).toISOString() };
    const future = { ...newCard(), due: new Date(Date.now() + 86400000).toISOString() };
    const result = getDueCards([past, future]);
    expect(result).toContain(past);
    expect(result).not.toContain(future);
  });

  it('retorna array vazio quando nenhum cartão é due', () => {
    const future = { ...newCard(), due: new Date(Date.now() + 86400000).toISOString() };
    expect(getDueCards([future])).toHaveLength(0);
  });

  it('retorna array vazio para input vazio', () => {
    expect(getDueCards([])).toHaveLength(0);
  });
});

describe('countDueToday', () => {
  it('conta cartões devidos até fim do dia', () => {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const dueNow = { ...newCard(), due: new Date(Date.now() - 1000).toISOString() };
    const dueEndOfDay = { ...newCard(), due: endOfDay.toISOString() };
    const tomorrow = { ...newCard(), due: new Date(Date.now() + 86400000 * 2).toISOString() };
    expect(countDueToday([dueNow, dueEndOfDay, tomorrow])).toBe(2);
  });
});
