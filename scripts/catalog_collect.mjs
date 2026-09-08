// Coletor do catálogo — a metade automática do que o BRIEF-CODEX-CATALOGO.md
// descreve como trabalho manual.
//
// O que ele faz:
//   1. monta o pedido a partir de catalogo-operacao.json + as fontes monitoradas
//   2. pede o lote ao Claude com busca na web (mesmo provider de api/_ai.js)
//   3. salva o JSON em scratchpad/catalogo-diario/<data>/
//   4. valida rodando o validador que JÁ existe, sem alterá-lo
//   5. separa novo de atualização com catalog_daily_state.mjs
//   6. atualização vira proposta em contest_revisions (origem 'robo');
//      item novo continua indo pelo gen_catalog_drafts_sql.mjs, como sempre
//
// Nada é publicado: proposta espera aprovação no Admin > Concursos > Revisões,
// e item novo entra como rascunho. É a regra de docs/CATALOGO-ESTRATEGIA.md.
//
// Uso:
//   node scripts/catalog_collect.mjs            # coleta e grava propostas
//   node scripts/catalog_collect.mjs --dry-run  # coleta, valida e não grava nada
//
// Env:
//   ANTHROPIC_API_KEY           obrigatória
//   ANTHROPIC_MODEL             default claude-sonnet-5
//   SUPABASE_URL                obrigatória para gravar propostas
//   SUPABASE_SERVICE_ROLE_KEY   idem (a RLS exige admin; o script roda fora de sessão)
//   MAX_ITENS                   sobrescreve o teto da fase atual

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const SCRATCH = path.join(ROOT, 'scratchpad');
const DRY_RUN = process.argv.includes('--dry-run');
const HOJE = new Date().toISOString().slice(0, 10);

const readJson = (file, fallback = null) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;

// Node puro não lê .env/.env.local sozinho e o projeto não usa dotenv — mesmo
// carregador manual do ai-server.mjs. Variável já exportada no shell vence o
// arquivo; .env.local vence .env.
function carregarEnv(arquivo) {
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const texto = linha.trim();
    if (!texto || texto.startsWith('#')) continue;
    const corte = texto.indexOf('=');
    if (corte === -1) continue;
    const chave = texto.slice(0, corte).trim();
    const valor = texto.slice(corte + 1).trim().replace(/^['"]|['"]$/g, '');
    if (chave && process.env[chave] === undefined) process.env[chave] = valor;
  }
}
carregarEnv(path.join(ROOT, '.env.local'));
carregarEnv(path.join(ROOT, '.env'));

const env = (name, fallback = '') => String(process.env[name] || fallback).trim();

function abortar(mensagem) {
  console.error(`FALHOU: ${mensagem}`);
  process.exit(1);
}

// ── Configuração da operação ────────────────────────────────────────────────
const operacao = readJson(path.join(SCRATCH, 'catalogo-operacao.json'));
if (!operacao) abortar('scratchpad/catalogo-operacao.json não encontrado.');

const fase = operacao.phase === 'daily' ? 'daily' : 'reconstrucao_inicial';
const regras = operacao[fase === 'daily' ? 'daily' : 'baseline'] || {};
const maxItens = Number(env('MAX_ITENS', regras.max_items_per_run || 5));

const monitoradasTodas = readJson(path.join(SCRATCH, 'catalogo-fontes-monitoradas.json'), []);
// docs/CATALOGO-ESTRATEGIA.md, estágio 2: "começar com 3 a 5 fontes HTML, não 20 a 30 —
// e preferir bancas a órgãos". Mandar a lista inteira faz o modelo gastar o orçamento de
// busca em largura e voltar de mãos vazias. Bancas primeiro, teto configurável.
const ehBanca = (f) => /banca|cebraspe|fgv|fcc|ibfc|aocp|vunesp|quadrix|idecan|consulplan|cesgranrio/i
  .test(JSON.stringify(f));
const TETO_FONTES = Number(env('MAX_FONTES', 5));
const listaMonitoradas = Array.isArray(monitoradasTodas) ? monitoradasTodas : (monitoradasTodas?.fontes || []);
const monitoradas = [...listaMonitoradas].sort((a, b) => Number(ehBanca(b)) - Number(ehBanca(a))).slice(0, TETO_FONTES);
const descoberta = readJson(path.join(SCRATCH, 'catalogo-fontes-descoberta.json'), []);
const jaColetado = readJson(path.join(SCRATCH, 'catalogo-ja-coletado.json'), []);

// O brief é a fonte da verdade do formato. Mandamos ele inteiro em vez de
// reescrever as regras aqui — assim editar o brief muda o coletor junto.
const briefPath = path.join(ROOT, 'docs', 'BRIEF-CODEX-CATALOGO.md');
if (!fs.existsSync(briefPath)) abortar('docs/BRIEF-CODEX-CATALOGO.md não encontrado.');
const brief = fs.readFileSync(briefPath, 'utf8');

// ── 1. Pedido ao modelo ─────────────────────────────────────────────────────
function montarPrompt() {
  const janela = fase === 'daily'
    ? `Considere apenas documentos publicados ou retificados nas últimas ${operacao.daily?.lookback_hours || 48} horas, ou mudanças oficiais de fase no mesmo período.`
    : 'Fase de reconstrução inicial: pode trazer concursos vivos mesmo que o edital não seja das últimas 48 horas.';

  return [
    'Você é o coletor do catálogo de concursos do Papirando. Siga o brief abaixo à risca.',
    '',
    '=== BRIEF (contrato de dados) ===',
    brief,
    '=== FIM DO BRIEF ===',
    '',
    '## Pedido de agora',
    '',
    janela,
    `Traga no máximo ${maxItens} itens (um item = um cargo, não o edital inteiro).`,
    regras.accept ? `Aceite: ${regras.accept}` : '',
    regras.exclude ? `Exclua: ${regras.exclude}` : '',
    '',
    '## Fontes oficiais para consultar',
    JSON.stringify(monitoradas, null, 2),
    '',
    '## Fontes de descoberta (só para achar que existe edital, NUNCA como edital_url)',
    JSON.stringify(descoberta, null, 2),
    '',
    '## Já entregue — não repita, exceto se houver mudança oficial no item',
    jaColetado.join(', ') || '(nada ainda)',
    '',
    '## Formato da resposta',
    'Responda APENAS com um objeto JSON, sem cercas de código e sem texto fora dele:',
    '{ "itens": [...], "resumo": "...", "descartados": [{ "nome": "...", "motivo": "..." }] }',
    '- "itens": os concursos no formato do brief. Todo item precisa de "source_identity"',
    '  no formato orgao|numero-do-edital|cargo.',
    '- "resumo": uma frase sobre o que voce encontrou. Se "itens" vier vazio, explique',
    '  aqui POR QUE: acabaram as buscas, nada passou nas regras, fonte fora do ar, etc.',
    '- "descartados": o que voce achou mas nao entregou, com o motivo de cada um.',
    '',
    'Use web_search para DESCOBRIR o edital e web_fetch para ABRIR o documento e ler o',
    'anexo de conteúdo programático. Não tente extrair tópicos de trecho de busca nem de',
    'blog de cursinho: abra o edital oficial.',
    '',
    'Prefira POUCOS itens completos a muitos rasos. Se as buscas acabarem antes de',
    'completar um item, entregue o que estiver completo e diga isso no resumo.',
  ].filter(Boolean).join('\n');
}

async function chamarModelo(mensagens) {
  const apiKey = env('ANTHROPIC_API_KEY');
  if (!apiKey) abortar('ANTHROPIC_API_KEY não configurada.');

  const resposta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Chave de organização (não presa a um workspace) exige dizer qual usar.
      // Chave criada dentro de um workspace dispensa o header.
      ...(env('ANTHROPIC_WORKSPACE_ID')
        ? { 'anthropic-workspace-id': env('ANTHROPIC_WORKSPACE_ID') }
        : {}),
    },
    body: JSON.stringify({
      model: env('ANTHROPIC_MODEL', 'claude-sonnet-5'),
      max_tokens: 16000,
      // Streaming não é enfeite: a coleta com dezenas de buscas passa dos 300 s
      // que o Node dá para os headers da resposta, e sem stream o fetch estoura
      // com UND_ERR_HEADERS_TIMEOUT antes de o modelo terminar.
      stream: true,
      tools: [
        // Busca na web é o que torna a coleta possível: sem ela o modelo inventa
        // edital, que é o que a lista branca de fontes existe para barrar.
        //
        // Custo: US$ 10 por 1.000 buscas + os resultados entram como input token.
        // A variante _20260209 filtra os resultados por código antes de entrarem
        // no contexto (dynamic filtering), que é o que segura a conta de token.
        {
          type: 'web_search_20260209',
          name: 'web_search',
          max_uses: Number(env('MAX_BUSCAS', Math.min(60, maxItens * 10))),
        },
        // Busca devolve trecho, não documento. Sem web_fetch o modelo nunca abre
        // o Anexo III do edital, e o brief exige 10+ tópicos por disciplina vindos
        // do anexo — foi exatamente onde as primeiras rodadas travaram.
        {
          type: 'web_fetch_20260209',
          name: 'web_fetch',
          max_uses: Number(env('MAX_FETCHES', Math.min(30, maxItens * 6))),
          max_content_tokens: Number(env('MAX_TOKENS_DOC', 40000)),
          citations: { enabled: true },
        },
      ],
      messages: mensagens,
    }),
  });

  if (!resposta.ok) {
    abortar(`Anthropic respondeu ${resposta.status}: ${(await resposta.text()).slice(0, 400)}`);
  }

  // Remonta os content blocks a partir do SSE. Precisa ser fiel: para continuar
  // um pause_turn a mensagem do assistente volta INTEIRA, e os resultados de
  // busca carregam encrypted_content que a API recusa se vier alterado.
  const blocos = [];
  const jsonParcial = new Map();
  let stopReason = '';
  let restante = '';
  const decoder = new TextDecoder();

  for await (const pedaco of resposta.body) {
    restante += decoder.decode(pedaco, { stream: true });
    const linhas = restante.split('\n');
    restante = linhas.pop() || '';

    for (const linha of linhas) {
      if (!linha.startsWith('data:')) continue;
      const dados = linha.slice(5).trim();
      if (!dados || dados === '[DONE]') continue;

      let evento;
      try {
        evento = JSON.parse(dados);
      } catch {
        continue;
      }

      switch (evento.type) {
        case 'content_block_start': {
          blocos[evento.index] = JSON.parse(JSON.stringify(evento.content_block));
          if (evento.content_block?.type === 'tool_use' || evento.content_block?.type === 'server_tool_use') {
            jsonParcial.set(evento.index, '');
            if (evento.content_block?.name === 'web_search') process.stdout.write('.');
            if (evento.content_block?.name === 'web_fetch') process.stdout.write('o');
          }
          break;
        }
        case 'content_block_delta': {
          const bloco = blocos[evento.index];
          if (!bloco) break;
          if (evento.delta?.type === 'text_delta') {
            bloco.text = (bloco.text || '') + evento.delta.text;
          } else if (evento.delta?.type === 'input_json_delta') {
            jsonParcial.set(evento.index, (jsonParcial.get(evento.index) || '') + evento.delta.partial_json);
          }
          break;
        }
        case 'content_block_stop': {
          const cru = jsonParcial.get(evento.index);
          if (cru !== undefined && blocos[evento.index]) {
            try {
              blocos[evento.index].input = cru ? JSON.parse(cru) : {};
            } catch {
              blocos[evento.index].input = {};
            }
            jsonParcial.delete(evento.index);
          }
          break;
        }
        case 'message_delta': {
          if (evento.delta?.stop_reason) stopReason = evento.delta.stop_reason;
          break;
        }
        case 'error':
          abortar(`stream interrompido: ${JSON.stringify(evento.error).slice(0, 300)}`);
          break;
        default:
          break;
      }
    }
  }

  return { blocos: blocos.filter(Boolean), stopReason };
}

async function pedirLote() {
  const mensagens = [{ role: 'user', content: montarPrompt() }];
  const MAX_RETOMADAS = Number(env('MAX_RETOMADAS', 8));

  let texto = '';
  let buscas = 0;
  let fetches = 0;
  let retomadas = 0;
  let stopReason = '';

  // pause_turn: a API interrompe um turno longo e devolve a resposta pela metade.
  // Para continuar, a mensagem do assistente volta inalterada e o modelo retoma
  // de onde parou. Repete até end_turn (ou até o teto, para não rodar sem fim).
  for (;;) {
    const resultado = await chamarModelo(mensagens);
    stopReason = resultado.stopReason;

    for (const bloco of resultado.blocos) {
      if (bloco.type === 'text') texto += bloco.text || '';
      if (bloco.type === 'server_tool_use' && bloco.name === 'web_search') buscas += 1;
      if (bloco.type === 'server_tool_use' && bloco.name === 'web_fetch') fetches += 1;
    }

    if (stopReason !== 'pause_turn') break;

    retomadas += 1;
    if (retomadas > MAX_RETOMADAS) {
      console.error(`\nAVISO: ${MAX_RETOMADAS} retomadas sem concluir; seguindo com o que veio.`);
      break;
    }
    process.stdout.write(`\n[pause_turn ${retomadas}/${MAX_RETOMADAS}] retomando\n`);
    mensagens.push({ role: 'assistant', content: resultado.blocos });
  }

  process.stdout.write('\n');
  texto = texto.trim();

  // O modelo às vezes embrulha em cerca de código mesmo sendo instruído a não fazer.
  const limpo = texto.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  // Aceita o envelope { itens, resumo, descartados } e também um array puro,
  // que é o formato que o brief descreve para entrega manual.
  const abre = limpo.search(/[[{]/);
  const fecha = Math.max(limpo.lastIndexOf(']'), limpo.lastIndexOf('}'));
  if (abre === -1 || fecha === -1) {
    abortar(
      `resposta sem JSON (stop_reason: ${stopReason || 'desconhecido'}, ` +
      `${retomadas} retomada(s)). Texto recebido: ${limpo.slice(0, 300) || '(vazio)'}`
    );
  }

  let dados;
  try {
    dados = JSON.parse(limpo.slice(abre, fecha + 1));
  } catch (error) {
    abortar(`JSON inválido na resposta: ${error.message}`);
  }

  const itens = Array.isArray(dados) ? dados : dados?.itens;
  if (!Array.isArray(itens)) abortar(`resposta sem a lista "itens":\n${limpo.slice(0, 500)}`);

  return {
    itens,
    resumo: Array.isArray(dados) ? '' : String(dados?.resumo || ''),
    descartados: Array.isArray(dados?.descartados) ? dados.descartados : [],
    textoBruto: texto,
    buscas,
    fetches,
    retomadas,
  };
}


// ── 2. Validação: roda o validador existente, sem tocar nele ────────────────
function validar(arquivo) {
  try {
    execFileSync('node', [path.join('scripts', 'validate_catalog_json.mjs'), arquivo], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    return true;
  } catch {
    return false;
  }
}

// ── 3. Novo x atualização: reusa o estado que já existe ─────────────────────
function separar(arquivo) {
  const saida = execFileSync('node', [path.join('scripts', 'catalog_daily_state.mjs'), 'check', arquivo], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  process.stdout.write(saida);
  const match = saida.match(/Novos:\s*(\d+)\s*\|\s*Atualizações pendentes:\s*(\d+)/);
  return { novos: Number(match?.[1] || 0), atualizacoes: Number(match?.[2] || 0) };
}

// ── 4. Atualização vira proposta em contest_revisions ───────────────────────
// Só entram campos que a allowlist de apply_contest_revision aceita.
const CAMPOS_PROPONIVEIS = [
  'nome', 'concurso', 'cargo', 'area', 'banca', 'salario', 'inscricao_valor',
  'escolaridade', 'vagas', 'lotacao', 'etapas', 'etapas_tags', 'taf_itens',
  'status_concurso', 'prova_data', 'edital_url', 'imagem_url', 'descricao',
];

const mesmoValor = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

async function gravarPropostas(itens) {
  const url = env('SUPABASE_URL', env('VITE_SUPABASE_URL'));
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    console.error('AVISO: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes — propostas não gravadas.');
    return 0;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let gravadas = 0;
  for (const item of itens) {
    const sourceIdentity = String(item.source_identity || '').trim();
    if (!sourceIdentity) continue;

    // Casa pelo edital_url, que é o identificador estável do certame no catálogo.
    const { data: alvo, error } = await supabase
      .from('contest_templates')
      .select(`id, ${CAMPOS_PROPONIVEIS.join(', ')}`)
      .eq('edital_url', item.edital_url)
      .maybeSingle();

    if (error) {
      console.error(`AVISO: falha ao procurar "${item.nome}": ${error.message}`);
      continue;
    }

    const changes = {};
    for (const campo of CAMPOS_PROPONIVEIS) {
      if (item[campo] === undefined) continue;
      if (!alvo || !mesmoValor(alvo[campo], item[campo])) changes[campo] = item[campo];
    }
    if (Object.keys(changes).length === 0) continue;

    // onConflict bate no índice único parcial: repropor o mesmo item no dia
    // seguinte atualiza a linha pendente em vez de empilhar outra.
    const { error: insertError } = await supabase
      .from('contest_revisions')
      .upsert(
        {
          contest_template_id: alvo?.id || null,
          source_identity: sourceIdentity,
          origem: 'robo',
          status: 'pendente',
          changes,
          evidencia_url: item.edital_url || null,
          evidencia_nota: `Coleta automática ${HOJE} (fase ${fase}).`,
        },
        { onConflict: 'contest_template_id,origem', ignoreDuplicates: false }
      );

    if (insertError) console.error(`AVISO: falha ao gravar proposta de "${item.nome}": ${insertError.message}`);
    else gravadas += 1;
  }

  return gravadas;
}

// ── Execução ────────────────────────────────────────────────────────────────
const { itens, resumo, descartados, textoBruto, buscas } = await pedirLote();
console.log(`\n${buscas} busca(s) · custo estimado das buscas: US$ ${(buscas * 0.01).toFixed(2)}`);
if (resumo) console.log(`resumo do coletor: ${resumo}`);
for (const d of descartados || []) console.log(`  descartado — ${d?.nome || '?'}: ${d?.motivo || 'sem motivo'}`);

if (itens.length === 0) {
  // Lote vazio depois de dezenas de buscas quase sempre é regra apertada demais,
  // não ausência de edital. Guarda a resposta crua para dar para inspecionar.
  const destinoVazio = path.join(SCRATCH, 'catalogo-diario', HOJE);
  fs.mkdirSync(destinoVazio, { recursive: true });
  const bruto = path.join(destinoVazio, `resposta_vazia_${HOJE}.txt`);
  fs.writeFileSync(bruto, textoBruto, 'utf8');
  console.log(`sem editais novos hoje — resposta crua em ${path.relative(ROOT, bruto)}`);
  process.exit(0);
}

const destino = path.join(SCRATCH, 'catalogo-diario', HOJE);
fs.mkdirSync(destino, { recursive: true });
const arquivo = path.join(destino, `coleta_${HOJE}.json`);
fs.writeFileSync(arquivo, `${JSON.stringify(itens, null, 2)}\n`, 'utf8');
console.log(`\n${itens.length} item(ns) salvos em ${path.relative(ROOT, arquivo)}\n`);

if (!validar(arquivo)) {
  abortar('o lote não passou no validador. O arquivo ficou salvo para inspeção; nada foi gravado.');
}

const { novos, atualizacoes } = separar(arquivo);

if (DRY_RUN) {
  console.log(`\n--dry-run: ${novos} novo(s) e ${atualizacoes} atualização(ões) detectadas; nada gravado.`);
  process.exit(0);
}

const gravadas = await gravarPropostas(itens);
console.log(`\n${gravadas} proposta(s) na fila de revisão (Admin > Concursos > Revisões).`);

if (novos > 0) {
  console.log(
    `${novos} item(ns) novo(s) — gere o rascunho com:\n` +
    `  CATALOG_FILES="${path.relative(ROOT, arquivo)}" node scripts/gen_catalog_drafts_sql.mjs\n` +
    `e depois registre o lote com:\n` +
    `  node scripts/catalog_daily_state.mjs record ${path.relative(ROOT, arquivo)}`
  );
}
