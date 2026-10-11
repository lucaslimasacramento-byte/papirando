// Le o lote de questoes que o admin cola, no formato exportado do TEC.
//
// O formato e texto corrido com rotulos ("Banca:", "Matéria:", "GABARITO:") e blocos
// separados por uma linha de `=====`. Nada de planilha nem API: o admin cola, confere a
// previa e confirma.
//
// A parte que exige cuidado nao e o parse dos rotulos — e o texto compartilhado. Prova do
// Cebraspe encadeia varios itens sobre o MESMO texto-base, e a exportacao escreve isso como
// "[Mesmo texto da Questão 3 – doenças crônicas / OMS]". Importar essa linha literalmente
// deixaria 6 das 10 questoes sem enunciado nenhum: o aluno leria "mesmo texto da questao 3"
// e teria de adivinhar. Aqui a referencia e resolvida — a questao recebe o texto-base de
// verdade, e so depois o comando e o item dela.

const SEPARADOR = /^\s*={3,}\s*$/m;

// "QUESTÃO 12" abre um bloco. Serve de separador quando o lote vem sem as linhas de `===`.
const ABRE_QUESTAO = /^\s*QUEST[ÃA]O\s+(\d+)\s*$/im;

const ROTULOS = {
  idTec: /^ID\s*TEC:\s*#?\s*(.+)$/im,
  banca: /^Banca:\s*(.+)$/im,
  orgao: /^[ÓO]rg[ãa]o:\s*(.+)$/im,
  cargo: /^Cargo:\s*(.+)$/im,
  ano: /^Ano:\s*(.+)$/im,
  area: /^[ÁA]rea do concurso:\s*(.+)$/im,
  materia: /^Mat[ée]ria:\s*(.+)$/im,
  assunto: /^Assunto:\s*(.+)$/im,
  tipo: /^Tipo:\s*(.+)$/im,
};

// "(não disponível – questão não respondida)" e as variacoes que a exportacao usa.
const SEM_VALOR = /^\(?\s*(n[ãa]o dispon[íi]vel|nenhuma|sem gabarito|n\/a|-)\b/i;

function limpar(valor) {
  const texto = String(valor ?? '').trim();
  return SEM_VALOR.test(texto) ? '' : texto;
}

function acharRotulo(bloco, regex) {
  const achado = bloco.match(regex);
  return achado ? limpar(achado[1]) : '';
}

// Divide o lote em blocos. Aceita os dois jeitos: separado por `=====` ou so pelas linhas
// "QUESTÃO N" — a exportacao nem sempre traz o separador no ultimo bloco.
export function separarQuestoes(texto) {
  const cru = String(texto || '').replace(/\r\n/g, '\n').trim();
  if (!cru) return [];

  const porSeparador = cru.split(SEPARADOR).map((parte) => parte.trim()).filter(Boolean);
  const blocos = porSeparador.length > 1 ? porSeparador : [cru];

  // Um "bloco" ainda pode conter varias questoes se o lote nao usou `=====`.
  return blocos.flatMap((bloco) => {
    const marcas = [...bloco.matchAll(new RegExp(ABRE_QUESTAO.source, 'gim'))];
    if (marcas.length <= 1) return [bloco];

    return marcas.map((marca, indice) => {
      const inicio = marca.index;
      const fim = indice + 1 < marcas.length ? marcas[indice + 1].index : bloco.length;
      return bloco.slice(inicio, fim).trim();
    });
  }).filter(Boolean);
}

function fatiar(bloco, deRotulo, ateRotulos) {
  const inicio = bloco.search(deRotulo);
  if (inicio === -1) return '';

  const resto = bloco.slice(inicio).replace(deRotulo, '');
  let fim = resto.length;
  for (const ate of ateRotulos) {
    const posicao = resto.search(ate);
    if (posicao !== -1 && posicao < fim) fim = posicao;
  }
  return resto.slice(0, fim).trim();
}

const R_ENUNCIADO = /^\s*ENUNCIADO:\s*/im;
const R_ALTERNATIVAS = /^\s*ALTERNATIVAS:\s*/im;
const R_GABARITO = /^\s*GABARITO:\s*/im;
const R_COMENTARIO = /^\s*(COMENT[ÁA]RIO|JUSTIFICATIVA|EXPLICA[ÇC][ÃA]O):\s*/im;

// "[Mesmo texto da Questão 3 – ...]" — a referencia ao texto-base de outra questao.
const REFERENCIA = /\[\s*Mesmo\s+texto\s+d[ao]\s+Quest[ãa]o\s+(\d+)[^\]]*\]/i;

// O texto-base termina onde comeca o comando do item ("Considerando o texto...", "No que se
// refere...", "julgue"). E essa parte que as questoes seguintes reaproveitam — o comando e o
// item sao de cada uma.
const COMANDO = /^\s*(Considerando|Tendo|No que se refere|Com base|A respeito|Acerca|Julgue|Em rela[çc][ãa]o)\b/im;

export function textoBaseDoEnunciado(enunciado) {
  const texto = String(enunciado || '').trim();
  const corte = texto.search(COMANDO);
  return corte > 0 ? texto.slice(0, corte).trim() : '';
}

function normalizarTipo(bruto) {
  const texto = String(bruto || '').toLowerCase();
  if (/certo|errado|c\/e/.test(texto)) return 'certo_errado';
  return 'multipla_escolha';
}

function lerAlternativas(bruto, tipo) {
  const linhas = String(bruto || '')
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean);

  if (tipo === 'certo_errado') {
    return [
      { id: 'C', label: 'Certo', isCorrect: false },
      { id: 'E', label: 'Errado', isCorrect: false },
    ];
  }

  // "A) texto", "A - texto", "a) texto"
  return linhas
    .map((linha) => {
      const achado = linha.match(/^\(?([A-Ea-e])[).\]\-–]\s*(.+)$/);
      if (!achado) return null;
      return { id: achado[1].toUpperCase(), label: achado[2].trim(), isCorrect: false };
    })
    .filter(Boolean);
}

function marcarGabarito(alternativas, gabarito, tipo) {
  const bruto = String(gabarito || '').trim();
  if (!bruto) return { alternativas, gabarito: '' };

  const chave = tipo === 'certo_errado'
    ? (/^c/i.test(bruto) ? 'C' : /^e/i.test(bruto) ? 'E' : '')
    : (bruto.match(/^\(?([A-Ea-e])\b/)?.[1] || '').toUpperCase();

  if (!chave) return { alternativas, gabarito: '' };

  return {
    alternativas: alternativas.map((alt) => ({ ...alt, isCorrect: alt.id === chave })),
    gabarito: chave,
  };
}

// Le um bloco. Nunca lanca: devolve o que entendeu e a lista do que faltou, porque a previa
// precisa mostrar as duas coisas lado a lado.
export function lerQuestao(bloco) {
  const texto = String(bloco || '').trim();

  const campos = {};
  for (const [nome, regex] of Object.entries(ROTULOS)) campos[nome] = acharRotulo(texto, regex);

  const tipo = normalizarTipo(campos.tipo);
  const enunciado = fatiar(texto, R_ENUNCIADO, [R_ALTERNATIVAS, R_GABARITO, R_COMENTARIO]);
  const brutoAlternativas = fatiar(texto, R_ALTERNATIVAS, [R_GABARITO, R_COMENTARIO]);
  const gabaritoBruto = fatiar(texto, R_GABARITO, [R_COMENTARIO, ABRE_QUESTAO]);
  const comentario = fatiar(texto, R_COMENTARIO, [ABRE_QUESTAO]);

  const { alternativas, gabarito } = marcarGabarito(
    lerAlternativas(brutoAlternativas, tipo),
    limpar(gabaritoBruto),
    tipo
  );

  const referencia = enunciado.match(REFERENCIA);

  return {
    idTec: campos.idTec,
    banca: campos.banca,
    orgao: campos.orgao,
    cargo: campos.cargo,
    ano: campos.ano,
    area: campos.area,
    materia: campos.materia,
    assunto: campos.assunto,
    tipo,
    enunciado,
    alternativas,
    gabarito,
    comentario,
    // Numero da questao que empresta o texto-base, quando houver.
    textoDe: referencia ? Number(referencia[1]) : null,
  };
}

// O lote inteiro, com as referencias de texto-base ja resolvidas.
export function lerLote(texto) {
  const blocos = separarQuestoes(texto);
  const questoes = blocos.map(lerQuestao);

  // Indexa por numero da questao para resolver "[Mesmo texto da Questão 3]". O numero vem do
  // cabecalho do bloco, nao da posicao na lista: o admin pode colar um recorte que comeca na
  // questao 7.
  const porNumero = new Map();
  blocos.forEach((bloco, indice) => {
    const marca = bloco.match(ABRE_QUESTAO);
    if (marca) porNumero.set(Number(marca[1]), indice);
  });

  questoes.forEach((questao) => {
    if (!questao.textoDe) return;
    const indice = porNumero.get(questao.textoDe);
    if (indice === undefined) return;

    const base = textoBaseDoEnunciado(questoes[indice].enunciado);
    if (!base) return;

    // Troca a linha de referencia pelo texto de verdade, preservando o comando e o item.
    questao.enunciado = questao.enunciado.replace(REFERENCIA, base).trim();
    questao.textoHerdado = true;
  });

  return questoes.map((questao) => ({ ...questao, faltando: oQueFalta(questao) }));
}

// O que impede a questao de ir para o aluno. A previa mostra isto ao lado de cada uma.
export function oQueFalta(questao) {
  const faltando = [];
  if (!questao.enunciado) faltando.push('enunciado');
  if (!questao.alternativas?.length) faltando.push('alternativas');
  if (!questao.gabarito) faltando.push('gabarito');
  if (!questao.materia) faltando.push('matéria');
  // Comentario nao impede a questao de funcionar, mas sem ele ela nao ensina: errar e so
  // ver "errado" nao constroi nada. Entra como pendencia, nao como bloqueio.
  return faltando;
}

export function estaPronta(questao) {
  return oQueFalta(questao).length === 0;
}
