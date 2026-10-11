// O padrão da questão — uma definição só, usada pelo app e pela ferramenta de importação.
//
// As questões chegam de fontes que não combinam entre si: a API do ENEM (markdown, slug de
// disciplina, sem gabarito explícito em alguns anos), o export do TEC (texto com rótulos em
// caixa alta), PDF de prova, planilha. Cada uma já teve seu próprio tradutor espalhado pelo
// código, e o resultado era o banco guardar "matematica" numa linha e "Matemática" na outra,
// alternativa ora como {id,label} ora como {letter,text}, gabarito ora "A" ora "a)".
//
// Aqui está o formato único para onde tudo converge, e as funções que levam qualquer entrada
// até ele. Quem adicionar uma fonte nova escreve só o leitor dela e chama `normalizarQuestao`.

import { rotuloDaDisciplina } from './rotuloDaDisciplina.js';
import { textoDoEnunciado, textoDaAlternativa } from './textoDaQuestao.js';

// Os dois formatos de prova que o banco conhece.
export const TIPO_CERTO_ERRADO = 'certo_errado';
export const TIPO_MULTIPLA = 'multipla_escolha';

export const DIFICULDADES = ['Facil', 'Media', 'Dificil'];

// Os campos do padrão e o que cada um guarda. Também é a documentação que a skill lê.
export const CAMPOS_DA_QUESTAO = {
  source: 'De onde veio: "enem.dev", "tec", "manual". Entra na chave única.',
  external_id: 'O identificador na origem (ID TEC, índice do ENEM). Com `source`, torna a reimportação idempotente.',
  disciplina: 'Matéria, já no rótulo de apresentação ("Matemática", não "matematica").',
  topico: 'Assunto dentro da matéria.',
  banca: 'Quem elaborou a prova (CEBRASPE, FGV, FCC, ENEM).',
  orgao: 'Órgão do concurso.',
  area: 'Área do cargo, quando a prova separa por área.',
  cargo: 'Cargo a que a prova se refere.',
  ano: 'Ano da prova, como texto.',
  tipo: `"${TIPO_CERTO_ERRADO}" ou "${TIPO_MULTIPLA}".`,
  enunciado: 'O texto da questão, em markdown. Figura fica como ![](url) — a tela separa.',
  alternativas: 'Lista de {id, label, isCorrect}. Em certo/errado, os ids são C e E.',
  gabarito: 'O id da alternativa correta.',
  explicacao: 'O comentário que explica a resposta. Sem ele a questão corrige, mas não ensina.',
  dificuldade: `Um de ${DIFICULDADES.join(', ')}.`,
  image_url: 'Figura principal, quando a fonte manda separada do enunciado.',
};

function texto(valor) {
  return String(valor ?? '').trim();
}

// O id de uma alternativa: uma letra maiúscula. "a)", " B ", "letra C" e "C" viram "C".
export function idDaAlternativa(valor) {
  const cru = texto(valor).toUpperCase();
  const letra = cru.match(/\b([A-E])\b/) || cru.match(/^([A-E])/);
  return letra ? letra[1] : cru.replace(/[^A-Z]/g, '').charAt(0) || '';
}

function normalizarAlternativa(bruta, indice) {
  if (typeof bruta === 'string') {
    // "A) texto" ou "A - texto": a letra vem grudada no texto.
    const marca = bruta.match(/^\s*([A-Ea-e])\s*[).:-]\s*(.*)$/s);
    return {
      id: marca ? marca[1].toUpperCase() : String.fromCharCode(65 + indice),
      label: texto(marca ? marca[2] : bruta),
      isCorrect: false,
    };
  }

  const id = idDaAlternativa(bruta?.id ?? bruta?.letter ?? bruta?.letra ?? bruta?.key)
    || String.fromCharCode(65 + indice);

  return {
    id,
    label: texto(bruta?.label ?? bruta?.text ?? bruta?.texto ?? bruta?.descricao),
    isCorrect: Boolean(bruta?.isCorrect ?? bruta?.is_correct ?? bruta?.correta),
  };
}

// Certo/errado ou múltipla escolha? A quantidade de alternativas decide; os ids C/E
// confirmam. Prova do CEBRASPE chega com duas alternativas e sem dizer o tipo.
export function tipoDaQuestao(alternativas, tipoDeclarado = '') {
  const declarado = texto(tipoDeclarado).toLowerCase().replace(/[\s-]+/g, '_');
  if (declarado === TIPO_CERTO_ERRADO || declarado === TIPO_MULTIPLA) return declarado;

  const lista = Array.isArray(alternativas) ? alternativas : [];
  if (lista.length === 2) return TIPO_CERTO_ERRADO;
  return TIPO_MULTIPLA;
}

export function normalizarDificuldade(valor) {
  const cru = texto(valor).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (cru === 'easy' || cru === 'facil') return 'Facil';
  if (cru === 'hard' || cru === 'dificil') return 'Dificil';
  return 'Media';
}

// Qualquer entrada vira o padrão. Campo que a fonte não manda sai vazio — e `oQueFalta`
// aponta o que impede a questão de ir para o banco.
export function normalizarQuestao(bruta = {}) {
  const alternativas = (Array.isArray(bruta.alternativas) ? bruta.alternativas : bruta.alternatives || [])
    .map(normalizarAlternativa)
    .filter((alternativa) => alternativa.id && alternativa.label);

  const tipo = tipoDaQuestao(alternativas, bruta.tipo || bruta.type);
  const gabarito = idDaAlternativa(
    bruta.gabarito ?? bruta.correct_answer ?? bruta.correctAlternative ?? bruta.answer
    ?? alternativas.find((alternativa) => alternativa.isCorrect)?.id
  );

  // A marcação de correta tem de bater com o gabarito, sempre. O export do TEC manda o
  // gabarito numa linha separada e nenhuma alternativa marcada; o ENEM faz o contrário em
  // alguns anos. Reconciliar aqui evita o pior defeito possível num banco de questões: o
  // aluno acertar e a tela dizer que errou.
  const comGabarito = alternativas.map((alternativa) => ({
    ...alternativa,
    isCorrect: gabarito ? alternativa.id === gabarito : alternativa.isCorrect,
  }));

  return {
    source: texto(bruta.source || bruta.origem),
    external_id: texto(bruta.external_id || bruta.idTec || bruta.id_externo),
    disciplina: rotuloDaDisciplina(bruta.disciplina || bruta.materia || bruta.discipline),
    topico: rotuloDaDisciplina(bruta.topico || bruta.assunto || bruta.topic),
    banca: texto(bruta.banca || bruta.board),
    orgao: texto(bruta.orgao),
    area: rotuloDaDisciplina(bruta.area),
    cargo: texto(bruta.cargo),
    ano: texto(bruta.ano || bruta.year),
    tipo,
    enunciado: texto(bruta.enunciado || bruta.statement),
    alternativas: comGabarito,
    gabarito,
    explicacao: texto(bruta.explicacao || bruta.comentario || bruta.explanation),
    dificuldade: normalizarDificuldade(bruta.dificuldade || bruta.difficulty),
    image_url: texto(bruta.image_url || bruta.imagem),
  };
}

// O que ainda falta para a questão poder ir para o banco.
//
// O comentário entra na lista porque uma questão sem explicação corrige mas não ensina — mas
// ele não bloqueia a gravação: o app gera o comentário sob demanda na primeira vez que um
// aluno abre a questão (src/lib/comentarioDaQuestao.js). Por isso vem separado em `avisos`.
export function oQueFalta(questao) {
  const impedem = [];
  const avisos = [];

  if (!questao.enunciado) impedem.push('enunciado');
  if (!Array.isArray(questao.alternativas) || questao.alternativas.length < 2) impedem.push('alternativas');
  if (!questao.gabarito) impedem.push('gabarito');
  else if (!questao.alternativas.some((alternativa) => alternativa.id === questao.gabarito)) {
    impedem.push('gabarito não corresponde a nenhuma alternativa');
  }

  if (!questao.disciplina) avisos.push('disciplina');
  if (!questao.explicacao) avisos.push('comentário');
  if (!questao.external_id) avisos.push('external_id (sem ele, recolar duplica)');

  return { impedem, avisos };
}

export function questaoEstaPronta(questao) {
  return oQueFalta(questao).impedem.length === 0;
}

// A linha como a tabela `questions` espera.
export function paraLinhaDoBanco(questao) {
  return {
    source: questao.source || 'manual',
    external_id: questao.external_id || null,
    disciplina: questao.disciplina,
    topico: questao.topico,
    banca: questao.banca,
    orgao: questao.orgao,
    area: questao.area,
    cargo: questao.cargo,
    ano: questao.ano,
    tipo: questao.tipo,
    enunciado: questao.enunciado,
    alternativas: questao.alternativas,
    gabarito: questao.gabarito,
    explicacao: questao.explicacao,
    dificuldade: questao.dificuldade,
    is_public: true,
    updated_at: new Date().toISOString(),
  };
}

function aspas(valor) {
  return `'${String(valor ?? '').replace(/'/g, "''")}'`;
}

// SQL de importação para colar no editor do Supabase.
//
// `on conflict (source, external_id)` faz a reimportação atualizar em vez de duplicar — que é
// o caso real: o lote vem sem gabarito, alguém busca os gabaritos e recola o mesmo lote.
export function sqlDeImportacao(questoes) {
  const prontas = (Array.isArray(questoes) ? questoes : []).filter(questaoEstaPronta);
  if (prontas.length === 0) return '';

  const valores = prontas.map((questao) => {
    const linha = paraLinhaDoBanco(questao);
    return `  (${[
      aspas(linha.source),
      linha.external_id ? aspas(linha.external_id) : 'null',
      aspas(linha.disciplina),
      aspas(linha.topico),
      aspas(linha.banca),
      aspas(linha.orgao),
      aspas(linha.area),
      aspas(linha.cargo),
      aspas(linha.ano),
      aspas(linha.tipo),
      aspas(linha.enunciado),
      `${aspas(JSON.stringify(linha.alternativas))}::jsonb`,
      aspas(linha.gabarito),
      aspas(linha.explicacao),
      aspas(linha.dificuldade),
      'true',
    ].join(', ')})`;
  });

  return [
    'insert into public.questions',
    '  (source, external_id, disciplina, topico, banca, orgao, area, cargo, ano, tipo,',
    '   enunciado, alternativas, gabarito, explicacao, dificuldade, is_public)',
    'values',
    `${valores.join(',\n')}`,
    'on conflict (source, external_id) do update set',
    '  disciplina  = excluded.disciplina,',
    '  topico      = excluded.topico,',
    '  banca       = excluded.banca,',
    '  orgao       = excluded.orgao,',
    '  area        = excluded.area,',
    '  cargo       = excluded.cargo,',
    '  ano         = excluded.ano,',
    '  tipo        = excluded.tipo,',
    '  enunciado   = excluded.enunciado,',
    '  alternativas = excluded.alternativas,',
    '  gabarito    = excluded.gabarito,',
    // O comentário só é sobrescrito quando o lote novo traz um. Senão a reimportação
    // apagaria o comentário que já existia.
    "  explicacao  = case when excluded.explicacao <> '' then excluded.explicacao else questions.explicacao end,",
    '  dificuldade = excluded.dificuldade,',
    '  updated_at  = now();',
  ].join('\n');
}

// O material que a IA precisa para escrever o comentário. Só texto: mandar a URL da figura
// gasta token e não explica nada.
export function paraPromptDeComentario(questao) {
  return {
    disciplina: questao.disciplina,
    topico: questao.topico,
    enunciado: textoDoEnunciado(questao.enunciado),
    alternativas: questao.alternativas.map((alternativa) => ({
      id: alternativa.id,
      texto: textoDaAlternativa(alternativa.label).texto,
    })),
    gabarito: questao.gabarito,
  };
}
