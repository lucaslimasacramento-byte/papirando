import { supabase } from './supabase';

// O que o aluno achou da questão.
//
// Quem resolve é quem descobre que a questão está errada: gabarito trocado, enunciado
// truncado, imagem que não carrega, comentário que não bate com o que ele marcou. Sem um
// caminho para avisar, o defeito fica no banco esperando o próximo aluno.

export const UTIL = 'util';
export const RUIM = 'ruim';

// 500 caracteres. O suficiente para "o gabarito está errado, a alternativa C também satisfaz
// a condição" e curto o bastante para ninguém escrever uma redação num campo que o admin lê
// em lote. O mesmo número está no CHECK da coluna — ver a migração 202610120002.
export const LIMITE_DO_TEXTO = 500;

export function normalizarVoto(valor) {
  const voto = String(valor || '').trim().toLowerCase();
  return voto === UTIL || voto === RUIM ? voto : '';
}

// Corta no limite em vez de recusar. O aluno que escreveu demais perderia tudo o que digitou
// se o envio falhasse — e o banco recusaria mesmo, pelo CHECK da coluna.
export function textoDentroDoLimite(valor) {
  return String(valor || '').slice(0, LIMITE_DO_TEXTO);
}

export function restamCaracteres(valor) {
  return LIMITE_DO_TEXTO - String(valor || '').length;
}

// Sem voto não há envio: o texto sozinho não diz se é elogio ou reclamação, e é o voto que
// entra no relatório de "questões com mais problema".
export function podeEnviar({ voto, enviando = false }) {
  return Boolean(normalizarVoto(voto)) && !enviando;
}

export async function meuFeedback(questaoId, userId) {
  if (!questaoId || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('question_feedback')
      .select('voto, comentario')
      .eq('question_id', questaoId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return { voto: normalizarVoto(data.voto), comentario: String(data.comentario || '') };
  } catch {
    return null;
  }
}

// Um voto por aluno por questão, e ele pode mudar de ideia — por isso upsert pela chave
// primária composta, e não insert.
export async function enviarFeedback(questaoId, userId, { voto, comentario = '' }) {
  const escolha = normalizarVoto(voto);
  if (!questaoId || !userId || !escolha) {
    return { ok: false, erro: 'Escolha se a questão ajudou ou não antes de enviar.' };
  }

  try {
    const { error } = await supabase
      .from('question_feedback')
      .upsert({
        question_id: questaoId,
        user_id: userId,
        voto: escolha,
        comentario: textoDentroDoLimite(comentario).trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'question_id,user_id' });

    if (error) return { ok: false, erro: error.message };
    return { ok: true, erro: '' };
  } catch (erro) {
    return { ok: false, erro: erro?.message || 'Não consegui enviar agora.' };
  }
}
