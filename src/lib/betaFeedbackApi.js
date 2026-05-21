import { supabase } from './supabase';

export async function submitBetaFeedback({ email, page = '', tipo = 'geral', mensagem }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('beta_feedback').insert({
    user_id: user?.id || null,
    email: email || user?.email || null,
    page: String(page || '').slice(0, 100),
    tipo,
    mensagem: String(mensagem || '').trim(),
    metadata: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      url: typeof window !== 'undefined' ? window.location.href : '',
    },
  });
  if (error) throw error;
}

export async function loadBetaFeedback() {
  const { data, error } = await supabase
    .from('beta_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw error;
  return data || [];
}

export async function deleteBetaFeedbackItem(id) {
  const { error } = await supabase.from('beta_feedback').delete().eq('id', id);
  if (error) throw error;
}
