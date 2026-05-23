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
  if (error) {
    // Mensagem clara em vez do "Object" cego que aparecia no console quando
    // a tabela ainda não havia sido migrada em produção.
    const tableMissing =
      error?.code === 'PGRST205' || /question_answers/i.test(String(error?.message || error?.hint || ''));
    console.warn(
      '[question_answers] Falha ao registrar resposta:',
      error?.message || error,
      tableMissing ? '(tabela ausente — rodar supabase/question_answers.sql)' : ''
    );
    return null;
  }
  return data || null;
}
