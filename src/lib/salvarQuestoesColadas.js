// Grava no banco o lote de questoes que o admin colou e conferiu.
//
// Idempotente por (source, external_id): o indice unico ja existe
// (supabase/question_api_import.sql), entao recolar o mesmo lote ATUALIZA as questoes em vez
// de duplica-las. Isso importa porque o caso real e justamente recolar: o admin cola, ve que
// faltou gabarito em algumas, busca os gabaritos e cola tudo de novo.

import { supabase } from './supabase';
import { estaPronta } from './questoesColadas';

// De onde vieram. Entra na chave unica junto com o ID TEC.
export const ORIGEM = 'tec';

export function paraLinha(questao) {
  return {
    source: ORIGEM,
    external_id: String(questao.idTec || '').trim() || null,
    disciplina: questao.materia || '',
    topico: questao.assunto || '',
    banca: questao.banca || '',
    orgao: questao.orgao || '',
    area: questao.area || '',
    cargo: questao.cargo || '',
    ano: questao.ano || '',
    tipo: questao.tipo || 'certo_errado',
    enunciado: questao.enunciado || '',
    alternativas: questao.alternativas || [],
    gabarito: questao.gabarito || '',
    explicacao: questao.comentario || '',
    is_public: true,
    updated_at: new Date().toISOString(),
  };
}

// Grava so o que esta pronto. Questao incompleta no banco e questao que o aluno abre, tenta
// responder e nao recebe correcao — ela nao ensina e ainda mina a confianca no banco todo.
export async function salvarQuestoes(questoes) {
  const prontas = (Array.isArray(questoes) ? questoes : []).filter(estaPronta);
  if (prontas.length === 0) {
    return { salvas: 0, ignoradas: (questoes || []).length, erro: '' };
  }

  const linhas = prontas.map(paraLinha);

  // Sem external_id nao da para casar com o que ja existe: cai em insert simples.
  const comId = linhas.filter((linha) => linha.external_id);
  const semId = linhas.filter((linha) => !linha.external_id);

  let salvas = 0;

  if (comId.length > 0) {
    const { error, data } = await supabase
      .from('questions')
      .upsert(comId, { onConflict: 'source,external_id' })
      .select('id');
    if (error) return { salvas: 0, ignoradas: 0, erro: error.message };
    salvas += data?.length || comId.length;
  }

  if (semId.length > 0) {
    const { error, data } = await supabase.from('questions').insert(semId).select('id');
    if (error) return { salvas, ignoradas: 0, erro: error.message };
    salvas += data?.length || semId.length;
  }

  return {
    salvas,
    ignoradas: (questoes || []).length - prontas.length,
    erro: '',
  };
}
