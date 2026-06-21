// Gera SQL de import dos exames (vestibulares + concursos) como RASCUNHO (is_public=false)
// para contest_templates / _subjects / _topics. Os arquivos "faculdade" sao IGNORADOS
// de proposito (nao sao exames e violam o CHECK de tipo).
//
// Uso:
//   node scripts/gen_catalog_drafts_sql.mjs            -> escreve scratchpad/catalog_drafts.sql
//   node scripts/gen_catalog_drafts_sql.mjs <skip.json> -> pula slugs ja existentes (array JSON de slugs)
//
// O SQL usa CTE com `on conflict (slug) do nothing returning id`, entao subjects/topics
// SO sao inseridos para templates recem-criados — nunca poluem um item ja existente.

import fs from 'node:fs';
import path from 'node:path';

const DOWNLOADS = 'C:/Users/lucas/Downloads';
// Arquivos de entrada: via env CATALOG_FILES (caminhos absolutos separados por
// vírgula ou quebra de linha) ou, na ausência, os seeds padrão em Downloads.
const ENV_FILES = (process.env.CATALOG_FILES || '')
  .split(/[\n,]/)
  .map((s) => s.trim())
  .filter(Boolean);
const FILES = ENV_FILES.length
  ? ENV_FILES
  : [
      'papirando_vestibulares_seed_200.json',
      'papirando_lote_01_nacional_federal_2026_06_20.json',
      'papirando_lote_02_bahia_2026_06_20.json',
      'papirando_lote_03_sao_paulo_2026_06_20.json',
    ];
const OUT = process.argv[3] || path.join(process.env.TEMP || '.', 'catalog_drafts.sql');
const SKIP_FILE = process.argv[2] || '';

const skipSlugs = new Set(
  SKIP_FILE && fs.existsSync(SKIP_FILE)
    ? JSON.parse(fs.readFileSync(SKIP_FILE, 'utf8'))
    : []
);

function slugify(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// escapa string para literal SQL ('...'); null/'' -> NULL
function q(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}
// igual a q() mas nunca NULL (para colunas NOT NULL com fallback ja resolvido)
function qstr(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}
// jsonb array literal
function qjsonb(arr) {
  const a = Array.isArray(arr) ? arr : [];
  return `'${JSON.stringify(a).replace(/'/g, "''")}'::jsonb`;
}
// date: aceita YYYY-MM-DD, senao NULL
function qdate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? `'${value}'::date` : 'NULL';
}

const all = [];
for (const f of FILES) {
  const full = path.isAbsolute(f) || f.includes(':') ? f : path.join(DOWNLOADS, f);
  const arr = JSON.parse(fs.readFileSync(full, 'utf8'));
  for (const it of arr) all.push(it);
}

// dedup de slug dentro do lote (sufixo -2, -3...)
const usedSlugs = new Set();
function uniqueSlug(base) {
  let s = base || `template-${usedSlugs.size + 1}`;
  let n = 1;
  while (usedSlugs.has(s)) {
    n += 1;
    s = `${base}-${n}`.slice(0, 80);
  }
  usedSlugs.add(s);
  return s;
}

const stmts = [];
let skipped = 0;
const byTipo = {};

for (const it of all) {
  const baseSlug = slugify(it.nome);
  if (skipSlugs.has(baseSlug)) { skipped += 1; continue; }
  const slug = uniqueSlug(baseSlug);
  const tipo = ['concurso', 'vestibular', 'enem'].includes(it.tipo) ? it.tipo : 'concurso';
  byTipo[tipo] = (byTipo[tipo] || 0) + 1;

  const nome = qstr(it.nome);
  const plano = qstr(it.plano || it.nome);
  const concurso = qstr(it.concurso || it.nome);

  const cols = [
    ['slug', qstr(slug)],
    ['nome', nome],
    ['tipo', qstr(tipo)],
    ['plano', plano],
    ['concurso', concurso],
    ['area', qstr(it.area || 'Geral')],
    ['cargo', q(it.cargo)],
    ['banca', qstr(it.banca || 'A definir')],
    ['salario', q(it.salario)],
    ['inscricao_valor', q(it.inscricao_valor)],
    ['escolaridade', q(it.escolaridade)],
    ['vagas', q(it.vagas)],
    ['lotacao', q(it.lotacao)],
    ['etapas', q(it.etapas)],
    ['etapas_tags', qjsonb(it.etapas_tags)],
    ['taf_itens', qjsonb(it.taf_itens)],
    ['cor', qstr(it.cor || '#2563EB')],
    ['origem', qstr('catalogo')],
    ['status', qstr('rascunho')],
    ['is_public', 'false'],
    ['descricao', q(it.descricao)],
    ['imagem_url', q(it.imagem_url)],
    ['edital_url', q(it.edital_url)],
    ['prova_data', qdate(it.prova_data)],
    ['status_concurso', qstr(it.status_concurso || 'edital_publicado')],
  ];

  const colNames = cols.map((c) => c[0]).join(', ');
  const colVals = cols.map((c) => c[1]).join(', ');

  // disciplinas: dedup nomes dentro do item
  const discs = (Array.isArray(it.disciplinas) ? it.disciplinas : [])
    .map((d, i) => ({
      nome: String(typeof d === 'string' ? d : d?.nome || '').trim(),
      ordem: i,
      topicos: (typeof d === 'string' ? [] : d?.topicos || [])
        .map((t) => String(typeof t === 'string' ? t : t?.nome || '').trim())
        .filter(Boolean),
    }))
    .filter((d) => d.nome);
  const seenDisc = new Set();
  const uniqDiscs = [];
  for (const d of discs) {
    if (seenDisc.has(d.nome)) continue;
    seenDisc.add(d.nome);
    uniqDiscs.push(d);
  }

  const subjectValues = uniqDiscs.map((d) => `(${qstr(d.nome)}, ${d.ordem})`).join(', ');
  const topicValues = uniqDiscs
    .flatMap((d) => d.topicos.map((t, ti) => `(${qstr(d.nome)}, ${qstr(t)}, ${ti})`))
    .join(', ');

  let sql;
  if (!uniqDiscs.length) {
    sql = `insert into public.contest_templates (${colNames})\nvalues (${colVals})\non conflict (slug) do nothing;`;
  } else if (!topicValues) {
    sql =
      `with t as (\n  insert into public.contest_templates (${colNames})\n  values (${colVals})\n  on conflict (slug) do nothing returning id\n)\n` +
      `insert into public.contest_template_subjects (template_id, nome, ordem)\n` +
      `select t.id, d.nome, d.ordem from t cross join (values ${subjectValues}) as d(nome, ordem);`;
  } else {
    sql =
      `with t as (\n  insert into public.contest_templates (${colNames})\n  values (${colVals})\n  on conflict (slug) do nothing returning id\n),\n` +
      `s as (\n  insert into public.contest_template_subjects (template_id, nome, ordem)\n  select t.id, d.nome, d.ordem from t cross join (values ${subjectValues}) as d(nome, ordem)\n  returning id, nome\n)\n` +
      `insert into public.contest_template_topics (subject_id, nome, ordem)\n` +
      `select s.id, tp.nome, tp.ordem from s join (values ${topicValues}) as tp(disc, nome, ordem) on tp.disc = s.nome;`;
  }
  stmts.push(sql);
}

const header = `-- Import de rascunhos do catalogo (gerado por scripts/gen_catalog_drafts_sql.mjs)\n` +
  `-- ${stmts.length} templates | por tipo: ${JSON.stringify(byTipo)} | pulados (ja existiam): ${skipped}\n` +
  `-- is_public=false (rascunho). Faculdades IGNORADAS de proposito.\n\n`;

fs.writeFileSync(OUT, header + stmts.join('\n\n') + '\n', 'utf8');

console.log('OK ->', OUT);
console.log('statements:', stmts.length, '| por tipo:', byTipo, '| pulados:', skipped);
console.log('tamanho:', (fs.statSync(OUT).size / 1024).toFixed(1), 'KB');
