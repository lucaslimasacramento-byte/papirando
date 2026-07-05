import { describe, it, expect, vi, beforeEach } from 'vitest';
import { State } from './fsrs';

vi.mock('./supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from './supabase';
import { ensureTopicReviewCards, submitTopicReview } from './topicReviewApi';

const USER_ID = 'user-xyz';

beforeEach(() => vi.clearAllMocks());

describe('ensureTopicReviewCards', () => {
  it('deduplica topicos e ignora topico vazio, com campos FSRS iniciais', async () => {
    let captured;
    const chain = {
      upsert: vi.fn((rows) => {
        captured = rows;
        return { error: null };
      }),
    };
    supabase.from.mockReturnValueOnce(chain);

    await ensureTopicReviewCards({
      userId: USER_ID,
      topics: [
        { disciplina: 'Portugues', topico: 'Crase' },
        { disciplina: 'Portugues', topico: 'Crase' }, // duplicado
        { disciplina: 'Direito', topico: '' }, // sem topico -> ignorado
      ],
    });

    expect(supabase.from).toHaveBeenCalledWith('topic_review_schedule');
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      user_id: USER_ID,
      disciplina: 'Portugues',
      topico: 'Crase',
      state: State.New,
      reps: 0,
    });
  });

  it('nao chama o banco quando nao ha topicos validos', async () => {
    await ensureTopicReviewCards({ userId: USER_ID, topics: [{ topico: '' }] });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('submitTopicReview', () => {
  it('recalcula FSRS e faz update com o novo due e last_rating', async () => {
    let captured;
    const chain = {
      update: vi.fn((patch) => {
        captured = patch;
        return chain;
      }),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    supabase.from.mockReturnValueOnce(chain);

    const card = { id: 'card-1', ...newCardLike() };
    const result = await submitTopicReview({ card, rating: 4 });

    expect(supabase.from).toHaveBeenCalledWith('topic_review_schedule');
    expect(chain.eq).toHaveBeenCalledWith('id', 'card-1');
    expect(captured.last_rating).toBe(4);
    // rating 4 (Facil) avanca para Review com dias agendados > 0
    expect(captured.state).toBe(State.Review);
    expect(captured.scheduled_days).toBeGreaterThan(0);
    expect(result.id).toBe('card-1');
  });

  it('rejeita card sem id', async () => {
    await expect(submitTopicReview({ card: {}, rating: 3 })).rejects.toThrow();
  });
});

// Card novo "cru" como viria do banco (campos FSRS no topo).
function newCardLike() {
  return {
    stability: 0,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: State.New,
    due: new Date().toISOString(),
    last_review: null,
  };
}
