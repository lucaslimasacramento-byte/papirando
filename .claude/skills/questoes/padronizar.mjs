#!/usr/bin/env node
// Decodifica um lote de questões e devolve tudo no padrão do Papirando.
//
//   node .claude/skills/questoes/padronizar.mjs <arquivo> [--formato tec|enem|json] [--sql]
//   cat lote.txt | node .claude/skills/questoes/padronizar.mjs --formato tec
//
// A parte determinística da importação mora aqui: separar as questões, casar gabarito com
// alternativa, acertar o rótulo da disciplina, apontar o que falta. O que exige julgamento —
// escrever o comentário, inferir o tópico, calibrar a dificuldade — é trabalho do modelo,
// e a skill (SKILL.md, ao lado) explica como.
//
// A normalização é importada de src/lib/padraoDaQuestao.js, a mesma que o app usa. Nada de
// implementação paralela: o que esta ferramenta considera "pronto" é exatamente o que a tela
// de questões consegue mostrar.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const { normalizarQuestao, oQueFalta, questaoEstaPronta, sqlDeImportacao } =
  await import(resolve(raiz, 'src/lib/padraoDaQuestao.js'));
const { lerLote } = await import(resolve(raiz, 'src/lib/questoesColadas.js'));

function lerArgumentos(argv) {
  const opcoes = { arquivo: '', formato: '', sql: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--formato') { opcoes.formato = argv[i + 1] || ''; i += 1; continue; }
    if (arg === '--sql') { opcoes.sql = true; continue; }
    if (!arg.startsWith('--')) opcoes.arquivo = arg;
  }
  return opcoes;
}

function lerEntrada(arquivo) {
  if (arquivo) return readFileSync(resolve(arquivo), 'utf8');
  return readFileSync(0, 'utf8');
}

// Qual leitor usar. Vale a pena adivinhar: o formato é evidente no texto, e obrigar a passar
// --formato só transformaria um acerto fácil em erro de uso.
function descobrirFormato(texto, declarado) {
  if (declarado) return declarado;
  const inicio = texto.trimStart();
  if (inicio.startsWith('[') || inicio.startsWith('{')) return 'json';
  if (/^\s*ID TEC:/im.test(texto) || /^\s*QUEST[ÃA]O\s+\d+\s*$/im.test(texto)) return 'tec';
  return 'json';
}

// O export do TEC: texto com rótulos em caixa alta, questões separadas por "=====".
function doTec(texto) {
  return lerLote(texto).map((questao) => normalizarQuestao({
    source: 'tec',
    external_id: questao.idTec,
    disciplina: questao.materia,
    topico: questao.assunto,
    banca: questao.banca,
    orgao: questao.orgao,
    area: questao.area,
    cargo: questao.cargo,
    ano: questao.ano,
    tipo: questao.tipo,
    enunciado: questao.enunciado,
    alternativas: questao.alternativas,
    gabarito: questao.gabarito,
    explicacao: questao.comentario,
  }));
}

// A resposta de api.enem.dev. O enunciado é `context` + `alternativesIntroduction`, nessa
// ordem — a introdução é a pergunta e tem de ficar por último.
function doEnem(dados) {
  const lista = Array.isArray(dados) ? dados : (dados?.questions || []);
  return lista.map((questao) => normalizarQuestao({
    source: 'enem.dev',
    external_id: `enem-${questao.year || ''}-${questao.index ?? questao.number ?? ''}`,
    disciplina: questao.discipline,
    topico: '',
    banca: 'ENEM',
    ano: questao.year,
    enunciado: [questao.context, questao.alternativesIntroduction].filter(Boolean).join('\n\n'),
    alternativas: questao.alternatives,
    gabarito: questao.correctAlternative,
    image_url: (questao.files || [])[0]?.url || '',
  }));
}

function doJson(texto) {
  const dados = JSON.parse(texto);
  const lista = Array.isArray(dados) ? dados : (dados?.questions || dados?.questoes || []);
  // Resposta do ENEM e lote já no padrão se parecem: o campo `alternativesIntroduction`
  // (ou `discipline` em slug) só existe na primeira.
  const pareceEnem = lista.some((item) => item?.alternativesIntroduction || item?.correctAlternative);
  return pareceEnem ? doEnem(lista) : lista.map(normalizarQuestao);
}

function relatorio(questoes) {
  const prontas = questoes.filter(questaoEstaPronta);
  const semComentario = prontas.filter((questao) => !questao.explicacao);
  const bloqueadas = questoes
    .map((questao, indice) => ({ indice, falta: oQueFalta(questao) }))
    .filter((item) => item.falta.impedem.length > 0);

  const linhas = [
    `questões lidas:        ${questoes.length}`,
    `prontas para o banco:  ${prontas.length}`,
    `sem comentário:        ${semComentario.length}  (o app gera na primeira abertura)`,
    `bloqueadas:            ${bloqueadas.length}`,
  ];

  bloqueadas.forEach((item) => {
    const questao = questoes[item.indice];
    const rotulo = questao.external_id || `#${item.indice + 1}`;
    linhas.push(`  - ${rotulo}: falta ${item.falta.impedem.join(', ')}`);
  });

  return linhas.join('\n');
}

const opcoes = lerArgumentos(process.argv.slice(2));
const entrada = lerEntrada(opcoes.arquivo);
const formato = descobrirFormato(entrada, opcoes.formato);

const questoes = formato === 'tec' ? doTec(entrada) : doJson(entrada);

if (opcoes.sql) {
  const sql = sqlDeImportacao(questoes);
  if (!sql) {
    console.error('Nenhuma questão pronta para importar.');
    console.error(relatorio(questoes));
    process.exit(1);
  }
  process.stdout.write(`${sql}\n`);
} else {
  process.stdout.write(`${JSON.stringify(questoes, null, 2)}\n`);
}

// O relatório vai para stderr, para não sujar o JSON nem o SQL quando a saída é redirecionada.
console.error(`\nformato lido: ${formato}`);
console.error(relatorio(questoes));
