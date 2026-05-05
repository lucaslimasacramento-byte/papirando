import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabase', () => {
  const chain = () => {
    const obj = {
      select: vi.fn(() => obj),
      upsert: vi.fn(() => obj),
      insert: vi.fn(() => obj),
      eq: vi.fn(() => obj),
      order: vi.fn(() => obj),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      single: vi.fn(async () => ({ data: null, error: null })),
      then: undefined,
    };
    // permite await direto na chain (retorna { data, error })
    obj[Symbol.iterator] = undefined;
    return obj;
  };
  return { supabase: { from: vi.fn(() => chain()) } };
});

import { supabase } from './supabase';
import { saveStudySession, loadStudySessions } from './studySessionsApi';

const USER_ID = 'user-123';

beforeEach(() => vi.clearAllMocks());

describe('saveStudySession', () => {
  it('lança erro quando userId ausente', async () => {
    await expect(saveStudySession(null, {})).rejects.toThrow('Usuário não autenticado');
  });

  it('chama supabase.from("study_sessions")', async () => {
    const mockChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    supabase.from.mockReturnValueOnce(mockChain);

    await saveStudySession(USER_ID, { disciplina: 'Direito', tempo: '00:30:00' });

    expect(supabase.from).toHaveBeenCalledWith('study_sessions');
    expect(mockChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, disciplina: 'Direito' }),
      expect.anything()
    );
  });

  it('lança erro quando Supabase retorna error', async () => {
    const mockChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    supabase.from.mockReturnValueOnce(mockChain);

    await expect(saveStudySession(USER_ID, {})).rejects.toThrow('DB error');
  });

  it('normaliza campos: acertos e erros como número', async () => {
    let capturedPayload;
    const mockChain = {
      upsert: vi.fn((payload) => { capturedPayload = payload; return mockChain; }),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    supabase.from.mockReturnValueOnce(mockChain);

    await saveStudySession(USER_ID, { acertos: '5', erros: '2' });

    expect(typeof capturedPayload.acertos).toBe('number');
    expect(typeof capturedPayload.erros).toBe('number');
    expect(capturedPayload.acertos).toBe(5);
    expect(capturedPayload.erros).toBe(2);
  });
});

describe('loadStudySessions', () => {
  it('retorna array vazio quando userId ausente', async () => {
    const result = await loadStudySessions(null);
    expect(result).toEqual([]);
  });

  it('chama supabase.from("study_sessions") com eq user_id', async () => {
    // loadStudySessions encadeia .order() duas vezes — mockChain precisa ser thenable
    // para que o await resolva após o segundo .order() sem .single().
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
    mockChain.then = (resolve) => resolve({ data: [], error: null });
    supabase.from.mockReturnValueOnce(mockChain);

    await loadStudySessions(USER_ID);

    expect(supabase.from).toHaveBeenCalledWith('study_sessions');
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(mockChain.order).toHaveBeenCalledTimes(2);
  });
});
