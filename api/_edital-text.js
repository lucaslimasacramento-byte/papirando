// Recorte de texto de edital antes de mandar para a IA.
//
// O problema que isto resolve (medido em docs/TESTE-EXTRACAO-EDITAL.md, 13 editais reais):
// a lista de matérias fica SEMPRE na metade final do edital — começa entre 51% e 97% do
// documento. Cortar pelo começo, como se fazia, mandava capa, sumário e regras de inscrição
// e nunca chegava nas disciplinas: 0 de 13 editais tinham o conteúdo programático chegando
// ao modelo.
//
// A correção não é aumentar o limite (a mediana é de ~290.000 caracteres por edital, caro
// demais para mandar inteiro). É cortar no lugar certo: cabeçalho de identificação + o anexo
// de conteúdo programático, descartando o miolo de regras que não serve para montar plano.

// Cada banca batiza o anexo de um jeito e nenhuma delas é obrigada a usar o termo óbvio:
// a Cebraspe escreve "OBJETOS DE AVALIAÇÃO" e a Fundatec escreve "PROGRAMAS". Procurar só
// "conteúdo programático" erra em ~40% dos editais. Estender AQUI ao aparecer uma quarta forma.
const RE_CABECALHO_CONTEUDO =
  /(conte[úu]dos?\s*program[áa]ticos?|objetos?\s*de\s*avalia[çc][ãa]o|programas?\s*[-–—]?\s*(prova|conhecimentos)|programas?\s*das?\s*provas?|mat[ée]rias?\s*e\s*programas?)/i;

// Orçamento de caracteres. O cabeçalho carrega concurso/órgão/banca/cargos/datas, que a
// análise também precisa devolver — mandar só o anexo perderia esses campos.
//
// O total de 120.000 foi calibrado nos 13 editais do teste: com ele o anexo vai INTEIRO em
// 10 deles, a uma mediana de ~26k tokens por análise, contra ~83k de mandar o edital
// completo. Baixar para 60.000 quase corta o custo pela metade (~17k tokens) mas manda o
// anexo inteiro em só 4 de 13 — é o botão a girar se o custo apertar. Os 3 que ainda
// truncam em 120.000 têm anexo de 150k a 210k caracteres porque listam o conteúdo de dezenas
// de cargos — para esses, o caminho não é aumentar o orçamento e sim recortar o cargo que o
// aluno escolheu (ver docs/TESTE-EXTRACAO-EDITAL.md).
export const CHARS_CABECALHO = 12000;
export const CHARS_TOTAL = 120000;

// pdfjs junta glifo a glifo com espaço, então título com letter-spacing chega como
// "A N E X O   I I". Sem desfazer isso o cabeçalho é indetectável. A operação é lossy
// (cola palavras vizinhas), então vale para DETECTAR a linha — nunca para compor o texto
// que vai ao modelo. Por isso a detecção é por linha: o índice da linha é preservado e o
// recorte sai sempre do texto original.
function normalizarParaDeteccao(linha) {
  return linha
    .normalize('NFC')
    .replace(/[ \t]+/g, ' ')
    .replace(/\b(?:[A-Za-zÀ-ÿ] ){2,}[A-Za-zÀ-ÿ]\b/g, (trecho) => trecho.replace(/ /g, ''));
}

// Uma linha só vale como cabeçalho de anexo se for o título em si. Duas armadilhas comuns:
// a citação no corpo ("... conforme o conteúdo programático.") e a linha do sumário
// ("Anexo III: Conteúdo programático;") — ambas aparecem antes do anexo de verdade.
function ehCabecalhoDeAnexo(linha) {
  const s = normalizarParaDeteccao(linha).trim();
  if (!s || s.length > 95) return false;
  if (!RE_CABECALHO_CONTEUDO.test(s)) return false;
  if (s.endsWith('.')) return false;
  if (/^\s*anexo\b.*[.;]\s*$/i.test(s)) return false;
  return true;
}

/**
 * Índice da linha em que começa o anexo de conteúdo programático, ou null.
 * O anexo fica sempre na metade final; o que casa antes disso é referência a ele.
 */
export function acharLinhaDoConteudo(linhas) {
  const candidatos = [];
  for (let i = 0; i < linhas.length; i += 1) {
    if (ehCabecalhoDeAnexo(linhas[i])) candidatos.push(i);
  }
  if (!candidatos.length) return null;

  const tardios = candidatos.filter((i) => i > linhas.length * 0.5);
  if (tardios.length) return tardios[0];
  return candidatos[candidatos.length - 1];
}

// O quadro de provas — quantas questões e que peso cada disciplina tem — é o que permite à
// plataforma ter opinião sobre onde o aluno deve gastar tempo. Ele NÃO fica no anexo de
// conteúdo programático nem no cabeçalho: nos 13 editais do teste aparece entre 1,9% e 51,6%
// do documento, ou seja, bem no miolo de regras que este recorte descarta. Sem esta janela o
// dado se perde em 11 dos 13.
// Só 4 dos 13 editais nomeiam a coisa de "quadro demonstrativo" / "composição das provas".
// O resto descreve a composição dentro da seção numerada "DAS PROVAS" — às vezes em tabela
// ("Língua Portuguesa 10 1"), às vezes em prosa ("a prova será composta de 120 itens, sendo
// 50 de conhecimentos básicos"). Por isso são dois sinais: o título explícito, quando existe,
// e a seção de provas como rede de segurança.
const RE_CABECALHO_QUADRO =
  /(quadro\s*demonstrativo\s*d[eo]s?\s*provas?|composi[çc][ãa]o\s*d[ao]s?\s*provas?|estrutura\s*d[ao]s?\s*provas?)/i;
const RE_SECAO_PROVAS = /^\s*\d{1,2}(\.\d{1,2})?\.?\s*(D[AO]S?\s+)?(PROVAS?|ETAPAS?|EXAMES?)\b/i;

export const CHARS_QUADRO = 10000;

// O título sozinho costuma ser a citação no sumário. O que confirma a seção é o que vem
// depois: números em sequência, valores, ou a palavra "questões".
function pareceComposicaoDeProva(trecho) {
  return /\b\d{1,3}\s+\d{1,3}\b/.test(trecho) || /R\$/.test(trecho) || /quest[õo]es/i.test(trecho);
}

/**
 * Índice da linha em que começa a descrição da composição das provas, ou null.
 */
export function acharLinhaDoQuadro(linhas) {
  const confirma = (i) => pareceComposicaoDeProva(linhas.slice(i, i + 80).join('\n'));

  for (let i = 0; i < linhas.length; i += 1) {
    const s = linhas[i].trim();
    if (s.length > 120) continue;
    // Mesma armadilha do anexo: "Anexo II - Composicao da Prova;" e linha de sumario.
    if (/^\s*anexo\b.*[.;]\s*$/i.test(s)) continue;
    if (RE_CABECALHO_QUADRO.test(normalizarParaDeteccao(s)) && confirma(i)) return i;
  }

  for (let i = 0; i < linhas.length; i += 1) {
    const s = linhas[i].trim();
    if (s.length > 70) continue;
    if (RE_SECAO_PROVAS.test(s) && confirma(i)) return i;
  }

  return null;
}

/**
 * Prepara o texto do edital para a IA.
 *
 * Monta até três janelas: cabeçalho de identificação, quadro de provas e anexo de conteúdo
 * programático — descartando o miolo de regras de inscrição, que não alimenta nada no app.
 *
 * @returns {{texto: string, recorte: string, chars: number, charsOriginais: number,
 *            achouConteudo: boolean, achouQuadro: boolean, pareceEdital: boolean}}
 *   recorte: 'inteiro'        — edital curto, cabe sem cortar
 *            'cabecalho+anexo'— o caso normal: identificação + conteúdo programático
 *            'anexo-truncado' — o anexo sozinho estourou o orçamento, cortado no fim
 *            'cabecalho'      — não achamos o anexo; sobrou o começo do documento
 */
export function prepararTextoEdital(textoBruto, opcoes = {}) {
  const charsCabecalho = Number(opcoes.charsCabecalho) || CHARS_CABECALHO;
  const charsTotal = Number(opcoes.charsTotal) || CHARS_TOTAL;

  const texto = String(textoBruto || '').replace(/\r/g, '').trim();
  const base = {
    charsOriginais: texto.length,
    // Documento curto demais para ser edital de abertura: ~19% dos arquivos que se
    // anunciam como "edital" são comunicado, retificação ou resultado. Quem chama decide
    // o que fazer, mas precisa saber antes de gastar uma análise.
    pareceEdital: texto.length >= 20000,
  };

  if (!texto) {
    return { ...base, texto: '', recorte: 'inteiro', chars: 0, achouConteudo: false };
  }

  if (texto.length <= charsTotal) {
    return { ...base, texto, recorte: 'inteiro', chars: texto.length, achouConteudo: true, achouQuadro: true };
  }

  const linhas = texto.split('\n');
  const linhaConteudo = acharLinhaDoConteudo(linhas);

  if (linhaConteudo === null) {
    const recortado = texto.slice(0, charsTotal);
    return {
      ...base, texto: recortado, recorte: 'cabecalho', chars: recortado.length,
      achouConteudo: false, achouQuadro: false,
    };
  }

  const cabecalho = texto.slice(0, charsCabecalho);
  const anexoCompleto = linhas.slice(linhaConteudo).join('\n');

  // O quadro só vira janela própria se cair fora do que cabeçalho e anexo já cobrem —
  // senão gastaríamos orçamento repetindo texto.
  const linhaQuadro = acharLinhaDoQuadro(linhas);
  let quadro = '';
  if (linhaQuadro !== null && linhaQuadro < linhaConteudo) {
    const offsetQuadro = linhas.slice(0, linhaQuadro).reduce((acc, l) => acc + l.length + 1, 0);
    if (offsetQuadro >= cabecalho.length) {
      quadro = linhas.slice(linhaQuadro).join('\n').slice(0, CHARS_QUADRO);
    }
  }

  const orcamentoAnexo = Math.max(charsTotal - cabecalho.length - quadro.length, 0);
  // Truncar o anexo pelo FIM perde as últimas matérias; truncar pelo começo perderia todas.
  const anexo = anexoCompleto.slice(0, orcamentoAnexo);

  const montado = [
    cabecalho,
    '\n\n[...trecho de regras omitido...]\n\n',
    quadro ? `${quadro}\n\n[...trecho de regras omitido...]\n\n` : '',
    anexo,
  ].join('');

  return {
    ...base,
    texto: montado,
    recorte: anexo.length < anexoCompleto.length ? 'anexo-truncado' : 'cabecalho+anexo',
    chars: montado.length,
    achouConteudo: true,
    // O quadro pode ter vindo dentro do cabeçalho ou do anexo, sem janela própria.
    achouQuadro: Boolean(quadro) || linhaQuadro !== null,
  };
}
