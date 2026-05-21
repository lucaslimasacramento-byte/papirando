import { describe, it, expect, vi, beforeEach } from 'vitest';
import { State } from './fsrs';

vi.mock('./supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from './supabase';
import { createCard, submitReview } from './flashcardsApi';

const USER_ID = 'user-xyz';
const DECK_ID = 'deck-1';
const CARD_ID = 'card-1';

beforeEach(() => vi.clearAllMocks());

// Monta uma chain fluente do Supabase com resultado configurável
function makeChain(result = { data: null, error: null }) {
  const c = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    // update/insert sem .single() resolvem diretamente
    then: (resolve) => resolve(result),
  };
  return c;
}

describe('createCard', () => {
  it('chama supabase.from("flashcard_cards")', async () => {
    const chain = makeChain({ data: { id: CARD_ID, front: 'Q', back: 'A', state: State.New, reps: 0, lapses: 0, deck_id: DECK_ID, user_id: USER_ID }, error: null });
    supabase.from.mockReturnValueOnce(chain);

    await createCard({ deckId: DECK_ID, userId: USER_ID, front: 'Q', back: 'A' });

    expect(supabase.from).toHaveBeenCalledWith('flashcard_cards');
  });

  it('envia deck_id, user_id, front e back no payload', async () => {
    let captured;
    const chain = {
      insert: vi.fn((p) => { captured = p; return chain; }),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: CARD_ID, ...captured }, error: null }),
    };
    supabase.from.mockReturnValueOnce(chain);

    await createCard({ deckId: DECK_ID, userId: USER_ID, front: 'Pergunta', back: 'Resposta' });

    expect(captured).toMatchObject({ deck_id: DECK_ID, user_id: USER_ID, front: 'Pergunta', back: 'Resposta' });
  });

  it('inclui campos FSRS iniciais (state New, reps 0)', async () => {
    let captured;
    const chain = {
      insert: vi.fn((p) => { captured = p; return chain; }),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: CARD_ID }, error: null }),
    };
    supabase.from.mockReturnValueOnce(chain);

    await createCard({ deckId: DECK_ID, userId: USER_ID, front: 'Q', back: 'A' });

    expect(captured.state).toBe(State.New);
    expect(captured.reps).toBe(0);
    expect(captured.lapses).toBe(0);
  });

  it('lança erro quando Supabase falha', async () => {
    const chain = makeChain({ data: null, error: new Error('insert error') });
    supabase.from.mockReturnValueOnce(chain);

    await expect(createCard({ deckId: DECK_ID, userId: USER_ID, front: 'Q', back: 'A' })).rejects.toThrow('insert error');
  });
});

describe('submitReview', () => {
  const baseCard = { id: CARD_ID, state: State.New, reps: 0, lapses: 0, stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, due: new Date().toISOString(), last_review: null };

  function mockThreeTableCalls() {
    // submitReview faz 3 chamadas: update flashcard_cards, insert flashcard_reviews, upsert flashcard_deck_progress
    const ok = { data: null, error: null };
    [0, 1, 2].forEach(() => supabase.from.mockReturnValueOnce(makeChain(ok)));
  }

  it('aplica scheduleCard e atualiza flashcard_cards', async () => {
    mockThreeTableCalls();

    await submitReview({ card: baseCard, rating: 4, userId: USER_ID, deckId: DECK_ID });

    // Primeira chamada deve ser em flashcard_cards
    expect(supabase.from).toHaveBeenNthCalledWith(1, 'flashcard_cards');
  });

  it('registra review em flashcard_reviews', async () => {
    mockThreeTableCalls();

    await submitReview({ card: baseCard, rating: 3, userId: USER_ID, deckId: DECK_ID });

    expect(supabase.from).toHaveBeenCalledWith('flashcard_reviews');
  });

  it('atualiza progresso em flashcard_deck_progress', async () => {
    mockThreeTableCalls();

    await submitReview({ card: baseCard, rating: 3, userId: USER_ID, deckId: DECK_ID });

    expect(supabase.from).toHaveBeenCalledWith('flashcard_deck_progress');
  });

  it('lança erro se update do card falhar', async () => {
    supabase.from.mockReturnValueOnce(makeChain({ data: null, error: new Error('update failed') }));

    await expect(submitReview({ card: baseCard, rating: 3, userId: USER_ID, deckId: DECK_ID })).rejects.toThrow('update failed');
  });
});
