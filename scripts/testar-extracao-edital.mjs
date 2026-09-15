#!/usr/bin/env node
// Teste de extração de PDF de edital — mede se o pipeline do app consegue tirar
// conteúdo programático utilizável de editais reais.
//
//   node scripts/testar-extracao-edital.mjs <pasta-com-pdfs> [--txt <pasta-saida>]
//
// A extração é cópia fiel de extractPdfText (src/pages/Planos.jsx) e o limite mínimo
// é o MIN_EDITAL_CHARS de src/pages/Edital.jsx, para o teste medir o app e não uma
// implementação paralela. Se aquelas rotinas mudarem, esta tem que mudar junto.
//
// Ver docs/TESTE-EXTRACAO-EDITAL.md para o laudo da rodada de 2026-09-15.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const MIN_EDITAL_CHARS = 400; // src/pages/Edital.jsx
const CORTE_PRODUCAO = 24000; // api/_ai.js — analyzeEdital(): text.slice(0, 24000)
const CORTE_DEV = 120000; // ai-server.mjs — prepareEditalText()

// Cada banca batiza o conteúdo programático de um jeito. Cebraspe nunca escreve
// "conteúdo programático" (usa "objetos de avaliação") e a Fundatec usa "PROGRAMAS".
// Qualquer heurística que procure só o termo mais óbvio erra em metade dos editais.
const RE_CONTEUDO =
  /(conte[úu]dos?\s*program[áa]ticos?|objetos?\s*de\s*avalia[çc][ãa]o|programas?\s*[-–—]?\s*(prova|conhecimentos)|programas?\s*das?\s*provas?|mat[ée]rias?\s*e\s*programas?)/i;

const CAMPOS_CATALOGO = {
  data_prova: /(data\s*(prov[áa]vel\s*)?(da\s*)?(prova|aplica[çc][ãa]o)|cronograma)/i,
  inscricao_valor: /(taxa|valor)\s*d[ae]\s*inscri[çc][ãa]o/i,
  remuneracao: /(remunera[çc][ãa]o|sal[áa]rio|vencimento|subs[íi]dio)/i,
  vagas: /vagas?/i,
  escolaridade: /(n[íi]vel\s*(superior|m[ée]dio|fundamental)|escolaridade|requisitos?\s*d[eo])/i,
  cargos: /(cargos?|empregos?|especialidades?)/i,
};

// Cópia fiel de extractPdfText (src/pages/Planos.jsx).
async function extrairTextoPdf(data) {
  const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const paginas = [];

  for (let numeroPagina = 1; numeroPagina <= pdf.numPages; numeroPagina += 1) {
    const pagina = await pdf.getPage(numeroPagina);
    const conteudo = await pagina.getTextContent();
    const linhas = [];
    let yAtual = null;
    let linhaAtual = [];

    conteudo.items.forEach((item) => {
      const y = Math.round(item.transform?.[5] || 0);
      if (yAtual === null || Math.abs(yAtual - y) <= 2) {
        yAtual = y;
        linhaAtual.push(item.str);
        return;
      }
      linhas.push(linhaAtual.join(' ').trim());
      yAtual = y;
      linhaAtual = [item.str];
    });

    if (linhaAtual.length) linhas.push(linhaAtual.join(' ').trim());
    paginas.push(linhas.filter(Boolean).join('\n'));
  }

  return { texto: paginas.join('\n\n'), paginas: pdf.numPages };
}

// pdfjs junta cada glifo com ' ', então título com letter-spacing sai como
// "E D I T A L   D E   A B E R T U R A". Sem desfazer isso nenhum cabeçalho é detectável.
// A operação é lossy — pode colar palavras vizinhas ("ANEXOII - DOCONTEUDOPROGRAMATICO") —
// então serve para localizar seção, não para compor o texto que vai para a IA.
function normalizar(bruto) {
  const texto = bruto.normalize('NFC').replace(/[ \t]+/g, ' ');
  return texto.replace(/\b(?:[A-Za-zÀ-ÿ] ){2,}[A-Za-zÀ-ÿ]\b/g, (trecho) => trecho.replace(/ /g, ''));
}

// Offset em que começa o anexo de conteúdo programático. A citação no corpo do edital
// ("conforme o Anexo II") e a linha do sumário não valem — só o cabeçalho do anexo.
function acharCabecalhoConteudo(texto) {
  let offset = 0;
  const candidatos = [];

  for (const linha of texto.split('\n')) {
    const s = linha.trim();
    const ehCabecalho =
      RE_CONTEUDO.test(s) &&
      s.length <= 95 &&
      !s.endsWith('.') && // "... conforme o conteúdo programático."
      !/^\s*anexo\b.*[.;]\s*$/i.test(s); // linha de sumário: "Anexo III: Conteúdo programático;"
    if (ehCabecalho) candidatos.push(offset);
    offset += linha.length + 1;
  }

  // O anexo fica sempre na metade final do documento; o que aparece antes é referência.
  const tardios = candidatos.filter((pos) => pos > texto.length * 0.5);
  if (tardios.length) return tardios[0];
  return candidatos.length ? candidatos[candidatos.length - 1] : null;
}

// Conta nomes de disciplina no anexo. Pega os dois formatos comuns:
// "Língua Portuguesa: <tópicos>" e a linha em caixa alta isolada.
// É um piso grosseiro só para dizer se a seção tem estrutura — quem estrutura de
// verdade é a IA, não esta heurística.
function contarDisciplinas(trecho) {
  const encontradas = new Set();

  for (const linha of trecho.split('\n')) {
    const s = linha.trim();
    const comDoisPontos = s.match(/^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç\s]{4,45}):\s/);
    if (comDoisPontos) {
      encontradas.add(comDoisPontos[1].toUpperCase().trim());
      continue;
    }
    const letras = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (s.length < 6 || s.length > 70 || letras.length < 5) continue;
    const maiusculas = (s.match(/[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/g) || []).length;
    if (maiusculas / letras.length < 0.8) continue;
    encontradas.add(s.replace(/^[0-9.)\s]+/, '').toUpperCase());
  }

  return encontradas;
}

async function analisar(caminho) {
  const nome = basename(caminho, '.pdf');
  const buffer = readFileSync(caminho);
  const linha = { nome, bytes: buffer.length };

  try {
    const { texto: bruto, paginas } = await extrairTextoPdf(new Uint8Array(buffer));
    const texto = normalizar(bruto);
    linha.texto = texto;
    linha.paginas = paginas;
    linha.chars = texto.length;
    linha.charsPorPagina = Math.round(texto.length / Math.max(paginas, 1));
    linha.tokensAprox = Math.round(texto.length / 3.5); // ~3,5 chars/token em pt-BR

    // Pergunta 1: o PDF é legível? (PDF escaneado cai aqui)
    linha.extracao = texto.length >= MIN_EDITAL_CHARS && linha.charsPorPagina >= 200 ? 'OK' : 'ILEGIVEL';

    // Documento curto demais para ser edital de abertura: é comunicado, retificação
    // ou resultado. A URL dizia "edital", o conteúdo não é.
    linha.ehEditalAbertura = texto.length >= 20000;

    const offset = acharCabecalhoConteudo(texto);
    linha.offsetConteudo = offset;
    const trecho = offset === null ? '' : texto.slice(offset);
    linha.conteudoChars = trecho.length;
    linha.disciplinas = offset === null ? new Set() : contarDisciplinas(trecho);
    linha.conteudoUtilizavel = offset !== null && trecho.length > 3000 && linha.disciplinas.size >= 4;

    // Pergunta 2: o corte de texto do backend deixa o conteúdo chegar no modelo?
    linha.alcancaProducao = offset !== null && offset < CORTE_PRODUCAO;
    linha.alcancaDev = offset !== null && offset < CORTE_DEV;

    linha.campos = Object.fromEntries(
      Object.entries(CAMPOS_CATALOGO).map(([chave, regex]) => [chave, regex.test(texto)])
    );
  } catch (erro) {
    linha.erro = erro.message;
    linha.extracao = 'ERRO';
  }

  return linha;
}

async function main() {
  const pasta = process.argv[2];
  if (!pasta) {
    console.error('uso: node scripts/testar-extracao-edital.mjs <pasta-com-pdfs> [--txt <pasta-saida>]');
    process.exit(1);
  }

  const indiceTxt = process.argv.indexOf('--txt');
  const pastaTxt = indiceTxt > -1 ? process.argv[indiceTxt + 1] : null;
  if (pastaTxt) mkdirSync(pastaTxt, { recursive: true });

  const arquivos = readdirSync(pasta).filter((f) => f.toLowerCase().endsWith('.pdf'));
  if (!arquivos.length) {
    console.error(`Nenhum PDF em ${pasta}`);
    process.exit(1);
  }

  const linhas = [];
  for (const arquivo of arquivos.sort()) {
    const linha = await analisar(join(pasta, arquivo));
    if (pastaTxt && linha.texto) writeFileSync(join(pastaTxt, `${linha.nome}.txt`), linha.texto);
    linhas.push(linha);
  }

  const p = (valor, largura) => String(valor ?? '-').padEnd(largura);
  console.log(
    p('documento', 24), p('pg', 5), p('chars', 8), p('c/pg', 6), p('~tokens', 8),
    p('inicio cont.', 13), p('disc', 5), p('extracao', 10), 'conteudo'
  );
  console.log('-'.repeat(106));

  for (const l of linhas) {
    if (l.erro) {
      console.log(p(l.nome, 24), `ERRO: ${l.erro.slice(0, 60)}`);
      continue;
    }
    const conteudo = !l.ehEditalAbertura ? 'nao-e-edital' : l.conteudoUtilizavel ? 'UTILIZAVEL' : 'nao achado';
    console.log(
      p(l.nome, 24), p(l.paginas, 5), p(l.chars, 8), p(l.charsPorPagina, 6), p(l.tokensAprox, 8),
      p(l.offsetConteudo ?? '-', 13), p(l.disciplinas?.size ?? 0, 5), p(l.extracao, 10), conteudo
    );
  }

  const editais = linhas.filter((l) => l.ehEditalAbertura && !l.erro);
  const conta = (predicado) => editais.filter(predicado).length;

  console.log('\n--- campos de catálogo ausentes ---');
  for (const l of editais) {
    const falta = Object.entries(l.campos).filter(([, v]) => !v).map(([k]) => k);
    console.log(p(l.nome, 24), falta.length ? falta.join(', ') : '(nenhum)');
  }

  console.log(`\nDocumentos analisados .................. ${linhas.length}`);
  console.log(`Editais de abertura de fato ........... ${editais.length} (${linhas.length - editais.length} eram comunicado/retificação/resultado)`);
  console.log(`Texto extraído legível ................ ${conta((l) => l.extracao === 'OK')}/${editais.length}`);
  console.log(`Conteúdo programático localizável ..... ${conta((l) => l.conteudoUtilizavel)}/${editais.length}`);
  console.log(`  ...e que sobrevive ao corte de ${CORTE_PRODUCAO} (produção, api/_ai.js) ... ${conta((l) => l.alcancaProducao)}/${editais.length}`);
  console.log(`  ...e que sobrevive ao corte de ${CORTE_DEV} (dev, ai-server.mjs) .... ${conta((l) => l.alcancaDev)}/${editais.length}`);

  const tokens = editais.map((l) => l.tokensAprox).sort((a, b) => a - b);
  if (tokens.length) {
    console.log(`Tokens por edital: mediana ${tokens[Math.floor(tokens.length / 2)]} · máximo ${tokens[tokens.length - 1]}`);
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
