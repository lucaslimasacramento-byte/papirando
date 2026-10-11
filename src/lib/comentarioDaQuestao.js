import { supabase } from './supabase';
import { explainQuestion, AI_ENABLED } from './aiClient';
import { textoDoEnunciado, textoDaAlternativa } from './textoDaQuestao';

// O comentário de cada questão, com três fontes em ordem de confiança.
//
// 1. `questions.explicacao` — escrito à mão, curado. Se existe, é o que vale.
// 2. `question_comments`    — gerado por IA uma vez e compartilhado com todo mundo.
// 3. a IA, agora            — só quando as duas primeiras não têm nada.
//
// As milhares de questões que vieram da API do ENEM caem no caso 3 na primeira vez que
// alguém as abre, e no caso 2 a partir da segunda. É o que torna "toda questão tem
// comentário" possível sem uma rodada de milhares de chamadas de IA antes do lançamento.

export const SEM_COMENTARIO = 'Esta questão ainda não tem comentário.';

function alternativasParaPrompt(opcoes) {
  return (Array.isArray(opcoes) ? opcoes : []).map((opcao) => ({
    id: opcao?.id || '',
    // A imagem da alternativa não vai no prompt: gasta token e não explica nada.
    texto: textoDaAlternativa(opcao?.label || '').texto,
    correta: Boolean(opcao?.isCorrect),
  }));
}

function gabaritoDaQuestao(questao) {
  const correta = (questao?.options || []).find((opcao) => opcao?.isCorrect);
  return String(correta?.id || questao?.gabarito || '').trim();
}

// Busca o comentário já guardado. Falha de rede ou tabela ausente não derruba a tela:
// sem cache, o fluxo segue para a IA.
export async function comentarioSalvo(questionId) {
  if (!questionId) return null;
  try {
    const { data, error } = await supabase
      .from('question_comments')
      .select('comentario, gabarito, conceitos, dica')
      .eq('question_id', questionId)
      .maybeSingle();
    if (error || !data?.comentario) return null;
    return {
      comentario: String(data.comentario || '').trim(),
      gabarito: String(data.gabarito || '').trim(),
      conceitos: Array.isArray(data.conceitos) ? data.conceitos : [],
      dica: String(data.dica || '').trim(),
      origem: 'cache',
    };
  } catch {
    return null;
  }
}

// Guarda o que a IA acabou de escrever, para o próximo aluno não pagar de novo. Conflito
// (outro aluno chegou primeiro, no mesmo segundo) é resultado esperado, não erro.
async function guardarComentario(questionId, comentario, currentUserId) {
  if (!questionId || !comentario?.comentario || !currentUserId) return;
  try {
    await supabase.from('question_comments').insert({
      question_id: questionId,
      comentario: comentario.comentario,
      gabarito: comentario.gabarito || '',
      conceitos: comentario.conceitos || [],
      dica: comentario.dica || '',
      modelo: comentario.modelo || '',
      created_by: currentUserId,
    });
  } catch (erro) {
    console.warn('[Questoes] comentário não foi guardado no cache:', erro?.message || erro);
  }
}

// O comentário da questão, resolvido pela ordem acima.
//
// `respostaDoAluno` entra no prompt porque a explicação muda de tom: quem errou precisa saber
// por que a alternativa que escolheu não serve, não só por que a certa serve.
export async function comentarioDaQuestao(questao, { currentUserId = '', respostaDoAluno = '' } = {}) {
  const curado = String(questao?.explanation || '').trim();
  if (curado) return { comentario: curado, conceitos: [], dica: '', origem: 'curado' };

  const salvo = await comentarioSalvo(questao?.id);
  if (salvo) return salvo;

  if (!AI_ENABLED) return null;

  const enunciado = textoDoEnunciado(questao?.statement || '');
  if (!enunciado) return null;

  const resposta = await explainQuestion({
    enunciado,
    alternativas: alternativasParaPrompt(questao?.options),
    gabarito: gabaritoDaQuestao(questao),
    resposta_usuario: respostaDoAluno,
  });

  const comentario = {
    comentario: String(resposta?.explanation || '').trim(),
    gabarito: String(resposta?.answer || '').trim(),
    conceitos: Array.isArray(resposta?.keyConcepts) ? resposta.keyConcepts : [],
    dica: String(resposta?.studyTip || '').trim(),
    modelo: String(resposta?.model || ''),
    origem: 'ia',
  };

  if (!comentario.comentario) return null;

  // O cache não é guardado com a resposta do aluno no prompt: o comentário tem de servir
  // para quem acertou e para quem errou. Quando ele veio enviesado pela resposta de um,
  // ainda assim explica o gabarito — e é melhor do que a questão seguir sem nada.
  await guardarComentario(questao?.id, comentario, currentUserId);

  return comentario;
}
