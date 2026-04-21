import { supabase } from './supabase';

export async function submitAnswer(userId, payload = {}) {
  if (!userId) return null;

  const record = {
    user_id: userId,
    question_id: payload.question_id,
    resposta: payload.resposta,
    is_correct: Boolean(payload.is_correct),
    tempo_segundos: Number(payload.tempo_segundos || 0),
  };

  const { data, error } = await supabase.from('question_answers').insert(record).select('*').single();
  if (error) throw error;
  return data || null;
}
