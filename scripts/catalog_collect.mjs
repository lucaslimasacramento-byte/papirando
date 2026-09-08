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

const monitoradas = readJson(path.join(SCRATCH, 'catalogo-fontes-monitoradas.json'), []);
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
    'Responda APENAS com o array JSON, sem cercas de código, sem comentário antes ou depois.',
    'Todo item precisa de "source_identity" no formato orgao|numero-do-edital|cargo.',
  ].filter(Boolean).join('\n');
}

async function pedirLote() {
  const apiKey = env('ANTHROPIC_API_KEY');
  if (!apiKey) abortar('ANTHROPIC_API_KEY não configurada.');

  const resposta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env('ANTHROPIC_MODEL', 'claude-sonnet-5'),
      max_tokens: 16000,
      // Busca na web é o que torna a coleta possível: sem ela o modelo inventa
      // edital, que é exatamente o que a lista branca de fontes existe para barrar.
      //
      // Custo: US$ 10 por 1.000 buscas + os resultados entram como input token e
      // se acumulam a cada iteração do turno. Por isso duas escolhas aqui:
      // - _20260209 filtra os resultados por código ANTES de entrarem no contexto
      //   (dynamic filtering), que é o que segura a conta de token;
      // - max_uses amarrado ao teto de itens da fase, em vez de um número fixo alto.
      tools: [{
        type: 'web_search_20260209',
        name: 'web_search',
        max_uses: Number(env('MAX_BUSCAS', Math.min(40, maxItens * 3))),
      }],
      messages: [{ role: 'user', content: montarPrompt() }],
    }),
  });

  if (!resposta.ok) {
    abortar(`Anthropic respondeu ${resposta.status}: ${(await resposta.text()).slice(0, 400)}`);
  }

  const payload = await resposta.json();
  const texto = (payload.content || [])
    .filter((bloco) => bloco.type === 'text')
    .map((bloco) => bloco.text)
    .join('\n')
    .trim();

  // O modelo às vezes embrulha em cerca de código mesmo sendo instruído a não fazer.
  const limpo = texto.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const inicio = limpo.indexOf('[');
  const fim = limpo.lastIndexOf(']');
  if (inicio === -1 || fim === -1) abortar(`resposta sem array JSON:\n${limpo.slice(0, 500)}`);

  try {
    const itens = JSON.parse(limpo.slice(inicio, fim + 1));
    if (!Array.isArray(itens)) abortar('a raiz da resposta não é um array.');
    return itens;
  } catch (error) {
    abortar(`JSON inválido na resposta: ${error.message}`);
  }
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
const itens = await pedirLote();
if (itens.length === 0) {
  console.log('sem editais novos hoje');
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
