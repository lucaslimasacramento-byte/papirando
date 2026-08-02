// Valida os JSONs de catalogo (concursos/vestibulares) ANTES de gerar o SQL de import.
// Espec completa: docs/BRIEF-CODEX-CATALOGO.md
//
// Uso:
//   node scripts/validate_catalog_json.mjs <arquivo.json> [outro.json ...]
//
// Ajustes (env, todos opcionais):
//   REF_DATE=2026-08-02   data de referencia (default: hoje) — util para testes
//   MIN_DIAS_PROVA=60     folga minima entre hoje e a prova
//   MIN_TOPICOS=10        topicos minimos por disciplina
//   MIN_DISCIPLINAS=3     disciplinas minimas por item
//   ALLOW_NO_DATE=1       aceita item sem prova_data (default: aceita; vira aviso)
//
// Saida: erros vao para stderr e derrubam o processo (exit 1). Avisos nao derrubam.

import fs from 'node:fs';

const TIPOS = new Set(['concurso', 'vestibular', 'enem']);
const STATUS = new Set([
  'previsto', 'autorizado', 'comissao_formada', 'banca_em_definicao',
  'banca_definida', 'edital_iminente', 'edital_publicado',
  'inscricoes_abertas', 'prova_marcada', 'em_andamento', 'homologado',
]);
// Status que afirmam que a prova ja aconteceu ou o certame acabou — nao servem
// para um app de estudos, onde o aluno precisa de tempo para se preparar.
const STATUS_ENCERRADOS = new Set(['homologado', 'em_andamento']);
const TAGS_CONHECIDAS = new Set([
  'objetiva', 'discursiva', 'redacao', 'taf', 'oral',
  'titulos', 'investigacao_social', 'psicotecnico', 'medico',
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const num = (name, fallback) => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) ? raw : fallback;
};

const MIN_DIAS_PROVA = num('MIN_DIAS_PROVA', 60);
const MIN_TOPICOS = num('MIN_TOPICOS', 10);
const MIN_DISCIPLINAS = num('MIN_DISCIPLINAS', 3);

const refRaw = process.env.REF_DATE || new Date().toISOString().slice(0, 10);
if (!ISO_DATE.test(refRaw)) {
  console.error(`REF_DATE invalido: "${refRaw}" (esperado YYYY-MM-DD)`);
  process.exit(2);
}
const refDate = new Date(`${refRaw}T00:00:00Z`);
const diasAte = (iso) => Math.round((new Date(`${iso}T00:00:00Z`) - refDate) / 86400000);

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Uso: node scripts/validate_catalog_json.mjs <arquivo.json> [...]');
  process.exit(2);
}

let errors = 0;
let warnings = 0;
let totalItems = 0;

for (const file of files) {
  let items;
  try {
    items = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`${file}: JSON invalido: ${error.message}`);
    errors += 1;
    continue;
  }
  if (!Array.isArray(items)) {
    console.error(`${file}: a raiz deve ser um array`);
    errors += 1;
    continue;
  }

  const nomesVistos = new Map();

  items.forEach((item, index) => {
    totalItems += 1;
    const label = `${file}[${index + 1}]${item?.nome ? ` ${item.nome}` : ''}`;
    const fail = (msg) => { console.error(`ERRO  ${label}: ${msg}`); errors += 1; };
    const warn = (msg) => { console.error(`AVISO ${label}: ${msg}`); warnings += 1; };

    if (!item || typeof item !== 'object' || Array.isArray(item)) return fail('deve ser um objeto');

    // ── Identificacao ──────────────────────────────────────────────────────
    const nome = typeof item.nome === 'string' ? item.nome.trim() : '';
    if (!nome) fail('nome ausente');
    else {
      const key = nome.toLowerCase();
      if (nomesVistos.has(key)) fail(`nome duplicado (ja aparece no item ${nomesVistos.get(key)})`);
      else nomesVistos.set(key, index + 1);
    }
    if (!TIPOS.has(item.tipo)) fail(`tipo invalido: ${JSON.stringify(item.tipo)}`);
    if (!item.plano || typeof item.plano !== 'string') fail('plano ausente');
    if (!item.concurso || typeof item.concurso !== 'string') fail('concurso ausente');
    if (!item.area || typeof item.area !== 'string') fail('area ausente');
    if (!item.banca || typeof item.banca !== 'string') fail('banca ausente');

    // ── Fonte ──────────────────────────────────────────────────────────────
    if (!item.edital_url || typeof item.edital_url !== 'string') fail('edital_url ausente');
    else if (!/^https?:\/\/\S+$/i.test(item.edital_url)) fail('edital_url nao e uma URL http(s)');

    // ── Descricao (vira o texto do card no catalogo) ───────────────────────
    const descricao = typeof item.descricao === 'string' ? item.descricao.trim() : '';
    if (!descricao) fail('descricao ausente');
    else if (descricao.length < 40) warn(`descricao muito curta (${descricao.length} chars)`);

    // ── Janela de estudo: a prova precisa estar no futuro COM FOLGA ────────
    if (!STATUS.has(item.status_concurso)) {
      fail(`status_concurso invalido: ${JSON.stringify(item.status_concurso)}`);
    } else if (STATUS_ENCERRADOS.has(item.status_concurso)) {
      fail(`status "${item.status_concurso}" indica certame ja em curso/encerrado — nao entra no catalogo`);
    }

    if (item.prova_data === undefined || item.prova_data === null || item.prova_data === '') {
      warn('sem prova_data (aceito, mas o aluno fica sem contagem regressiva)');
    } else if (!ISO_DATE.test(String(item.prova_data))) {
      fail(`prova_data fora de YYYY-MM-DD: ${JSON.stringify(item.prova_data)}`);
    } else {
      const dias = diasAte(item.prova_data);
      if (dias < 0) fail(`prova ja aconteceu (${item.prova_data}, ha ${-dias} dias)`);
      else if (dias < MIN_DIAS_PROVA) {
        fail(`prova em ${dias} dia(s) (${item.prova_data}) — minimo ${MIN_DIAS_PROVA}, nao da tempo de estudar`);
      }
    }

    // ── Conteudo programatico: o campo mais valioso do catalogo ────────────
    const discs = Array.isArray(item.disciplinas) ? item.disciplinas : null;
    if (!discs || !discs.length) {
      fail('disciplinas vazio');
    } else {
      if (discs.length < MIN_DISCIPLINAS) fail(`so ${discs.length} disciplina(s) — minimo ${MIN_DISCIPLINAS}`);
      const nomesDisc = new Set();
      discs.forEach((d, di) => {
        const dn = String((typeof d === 'string' ? d : d?.nome) || '').trim();
        if (!dn) return fail(`disciplina ${di + 1} sem nome`);
        if (nomesDisc.has(dn.toLowerCase())) fail(`disciplina duplicada: "${dn}"`);
        nomesDisc.add(dn.toLowerCase());

        const topicos = (typeof d === 'string' ? [] : d?.topicos) || [];
        if (!Array.isArray(topicos)) return fail(`topicos de "${dn}" nao e array`);
        const limpos = topicos.map((t) => String(typeof t === 'string' ? t : t?.nome || '').trim()).filter(Boolean);
        if (limpos.length < MIN_TOPICOS) {
          fail(`"${dn}": ${limpos.length} topico(s) — minimo ${MIN_TOPICOS}. Extraia do anexo de conteudo programatico do edital, nao resuma`);
        }
        const genericos = limpos.filter((t) => t.split(/\s+/).length < 2 && t.length < 6);
        if (genericos.length) warn(`"${dn}": topicos suspeitos de serem rotulos vazios: ${genericos.join(', ')}`);
      });
    }

    // ── Campos de forma ────────────────────────────────────────────────────
    if (item.etapas_tags !== undefined) {
      if (!Array.isArray(item.etapas_tags)) fail('etapas_tags deve ser array');
      else {
        const fora = item.etapas_tags.filter((t) => !TAGS_CONHECIDAS.has(String(t)));
        if (fora.length) warn(`etapas_tags fora da lista conhecida: ${fora.join(', ')}`);
      }
    }
    if (item.taf_itens !== undefined && !Array.isArray(item.taf_itens)) fail('taf_itens deve ser array');
    if (item.cor !== undefined && !/^#[0-9a-fA-F]{6}$/.test(String(item.cor))) fail('cor deve ser hex #RRGGBB');
    for (const campo of ['salario', 'inscricao_valor']) {
      if (item[campo] !== undefined && item[campo] !== null && typeof item[campo] !== 'string') {
        fail(`${campo} deve ser string em BRL (ex.: "R$ 1.234,56")`);
      }
    }
  });
}

console.error(
  `\n${totalItems} item(ns) | ${errors} erro(s) | ${warnings} aviso(s) | ` +
  `regras: prova >= ${MIN_DIAS_PROVA}d a partir de ${refRaw}, >= ${MIN_TOPICOS} topicos/disciplina, >= ${MIN_DISCIPLINAS} disciplinas`
);

if (errors) {
  console.error('FALHOU — corrija os erros acima. Nao gere o SQL antes de passar limpo.');
  process.exit(1);
}
console.log(`OK: ${files.length} arquivo(s) validado(s), ${totalItems} item(ns), sem erros.`);
