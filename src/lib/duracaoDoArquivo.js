// Extrair a duracao da prova de um PDF de edital reenviado pelo aluno.
//
// O texto do edital nao fica guardado: ele so existe em memoria durante a importacao. Entao
// nao ha como "reler" o edital de um curso ja criado — o arquivo precisa vir de novo. O que
// esta rotina faz e deliberadamente estreito: le o arquivo, roda a analise, aproveita APENAS
// a duracao e descarta o resto. Reimportar o edital inteiro reescreveria disciplinas e
// topicos que o aluno ja marcou, e isso seria desproporcional para buscar uma linha.

import { acharDuracaoDoCargo } from './edital';
import { CHARS_MINIMO_EDITAL } from './editalLimites';

// PDF escaneado (imagem) extrai quase nada. Abaixo disto nao vale gastar a analise, e o
// aviso precisa dizer o que fazer — "nao encontrei" mandaria o aluno tentar de novo em vao.
const MINIMO_PARA_TENTAR = 400;

export async function textoDoArquivoDeEdital(arquivo) {
  if (!arquivo) throw new Error('Nenhum arquivo selecionado.');

  const nome = String(arquivo.name || '').toLowerCase();
  const ehPdf = nome.endsWith('.pdf') || arquivo.type === 'application/pdf';

  // Import sob demanda: o pdf.js pesa e so faz falta quando o aluno de fato escolhe um
  // arquivo. Carregado no topo, ele entrava no bundle inicial de quem so quer ver o edital.
  const { extractTextFromPdf, extractTextFromPlainFile } = await import('./redacoesApi');
  const texto = ehPdf ? await extractTextFromPdf(arquivo) : await extractTextFromPlainFile(arquivo);
  const limpo = String(texto || '').trim();

  if (limpo.length < MINIMO_PARA_TENTAR) {
    throw new Error(
      'Não consegui extrair texto deste arquivo. Se for um PDF escaneado (imagem), ' +
      'o conteúdo precisa estar em texto selecionável.'
    );
  }

  return limpo;
}

// Le o arquivo e devolve a duracao da prova do cargo. `analisar` e injetado para o teste
// nao precisar de rede — em producao e o analyzeEdital.
export async function duracaoDoArquivo(arquivo, { analisar, cargo = '', lerTexto = textoDoArquivoDeEdital } = {}) {
  const texto = await lerTexto(arquivo);

  // O edital completo e longo; um recorte curto demais provavelmente e outro documento.
  if (texto.length < CHARS_MINIMO_EDITAL) {
    // Nao bloqueia: o aluno pode ter colado so a secao "DAS PROVAS", que e curta e legitima
    // — e justamente onde a duracao esta.
    const duracao = acharDuracaoDoCargo(await analisar(texto), cargo);
    return { duracao, textoCurto: true };
  }

  return { duracao: acharDuracaoDoCargo(await analisar(texto), cargo), textoCurto: false };
}
