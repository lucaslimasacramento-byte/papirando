import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from './supabase';
import { submitAnswer } from './questoesApi';

const USER_ID = 'user-abc';
const BASE_PAYLOAD = {
  question_id: 'q-1',
  resposta: 'B',
  is_correct: true,
  tempo_segundos: 45,
};

beforeEach(() => vi.clearAllMocks());

function mockChainWith(result) {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
  supabase.from.mockReturnValueOnce(chain);
  return chain;
}

describe('submitAnswer', () => {
  it('retorna null quando userId ausente', async () => {
    const result = await submitAnswer(null, BASE_PAYLOAD);
    expect(result).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('chama supabase.from("question_answers")', async () => {
    mockChainWith({ data: { id: 'ans-1' }, error: null });

    await submitAnswer(USER_ID, BASE_PAYLOAD);

    expect(supabase.from).toHaveBeenCalledWith('question_answers');
  });

  it('envia user_id, question_id, resposta, is_correct e tempo_segundos', async () => {
    let capturedRecord;
    const chain = {
      insert: vi.fn((rec) => { capturedRecord = rec; return chain; }),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };
    supabase.from.mockReturnValueOnce(chain);

    await submitAnswer(USER_ID, BASE_PAYLOAD);

    expect(capturedRecord).toMatchObject({
      user_id: USER_ID,
      question_id: 'q-1',
      resposta: 'B',
      is_correct: true,
      tempo_segundos: 45,
    });
  });

  it('converte is_correct para boolean', async () => {
    let capturedRecord;
    const chain = {
      insert: vi.fn((rec) => { capturedRecord = rec; return chain; }),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };
    supabase.from.mockReturnValueOnce(chain);

    await submitAnswer(USER_ID, { ...BASE_PAYLOAD, is_correct: 1 });

    expect(capturedRecord.is_correct).toBe(true);
  });

  it('lança erro quando Supabase retorna error', async () => {
    mockChainWith({ data: null, error: new Error('insert failed') });

    await expect(submitAnswer(USER_ID, BASE_PAYLOAD)).resolves.toBeNull();
  });

  it('retorna data da resposta inserida', async () => {
    const inserted = { id: 'ans-99', ...BASE_PAYLOAD, user_id: USER_ID };
    mockChainWith({ data: inserted, error: null });

    const result = await submitAnswer(USER_ID, BASE_PAYLOAD);

    expect(result).toEqual(inserted);
  });
});
