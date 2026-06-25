// Gera SQL de ATUALIZAÇÃO (upsert) dos vestibulares a partir de um JSON no
// formato do modelo (docs/vestibulares_seed_exemplo.json). Mapeia o modelo para
// as colunas do contest_templates + campo `meta` (jsonb). Atualiza linhas
// existentes pelo slug (on conflict do update) SEM apagar imagem/edital já salvos.
//
// Uso:
//   node scripts/gen_vestibular_update_sql.mjs <entrada.json> [saida.sql]
//   (default saida: <entrada>.sql ao lado do arquivo de entrada)

import fs from 'node:fs';
import path from 'node:path';

const IN = process.argv[2];
if (!IN || !fs.existsSync(IN)) {
  console.error('Informe o JSON de entrada. Ex.: node scripts/gen_vestibular_update_sql.mjs "C:/Users/lucas/Downloads/papirando_vestibulares_200_atualizado.json"');
  process.exit(1);
}
const OUT = process.argv[3] || IN.replace(/\.json$/i, '') + '.sql';

function slugify(value = '') {
  return String(value || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
function q(v) { if (v === null || v === undefined || v === '') return 'NULL'; return `'${String(v).replace(/'/g, "''")}'`; }
function qstr(v) { return `'${String(v ?? '').replace(/'/g, "''")}'`; }
function qjsonb(obj) { return `'${JSON.stringify(obj ?? {}).replace(/'/g, "''")}'::jsonb`; }
function qdate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? `'${v}'::date` : 'NULL'; }
const enumOr = (v, allowed, fb) => (allowed.includes(v) ? v : fb);

const arr = JSON.parse(fs.readFileSync(IN, 'utf8'));
if (!Array.isArray(arr)) { console.error('JSON precisa ser um array.'); process.exit(1); }

const used = new Set();
const stmts = [];
for (const it of arr) {
  const nome = it.name || it.nome;
  if (!nome) continue;
  let slug = slugify(nome); let base = slug, n = 1;
  while (used.has(slug)) { n += 1; slug = `${base}-${n}`.slice(0, 80); }
  used.add(slug);

  const sigla = it.institution_acronym || '';
  const instituicao = it.institution || '';
  const scope = enumOr(it.scope, ['nacional', 'estadual'], 'nacional');
  const uf = scope === 'estadual' && it.state ? String(it.state).toUpperCase().slice(0, 2) : null;
  const modality = enumOr(it.modality, ['presencial', 'ead', 'hibrido', 'multiplo'], null);
  const inst_type = enumOr(it.institution_type, ['publica', 'privada', 'programa_governo'], null);

  const meta = {
    about_institution: it.about_institution || '',
    official_url: it.official_url || '',
    registration_url: it.registration_url || '',
    subjects_summary: Array.isArray(it.subjects_summary) ? it.subjects_summary : [],
    timeline: Array.isArray(it.timeline) ? it.timeline : [],
    courses_offered: Array.isArray(it.courses_offered) ? it.courses_offered : [],
    required_readings: Array.isArray(it.required_readings) ? it.required_readings : [],
    entry_methods: Array.isArray(it.entry_methods) ? it.entry_methods : [],
  };

  const cols = [
    ['slug', qstr(slug)],
    ['nome', qstr(nome)],
    ['plano', qstr(nome)],
    ['concurso', qstr(instituicao || nome)],
    ['tipo', qstr('vestibular')],
    ['area', qstr(it.area || 'Educação')],
    ['banca', qstr(sigla || instituicao || 'A definir')],
    ['escolaridade', q(it.education_level)],
    ['inscricao_valor', q(it.registration_fee)],
    ['prova_data', qdate(it.exam_date)],
    ['edital_url', q(it.edital_url)],
    ['imagem_url', q(it.image_url)],
    ['descricao', q(it.short_description)],
    ['uf', q(uf)],
    ['scope', qstr(scope)],
    ['modality', q(modality)],
    ['institution_type', q(inst_type)],
    ['registration_start', qdate(it.registration_start)],
    ['registration_end', qdate(it.registration_end)],
    ['meta', qjsonb(meta)],
  ];
  const names = cols.map((c) => c[0]).join(', ');
  const vals = cols.map((c) => c[1]).join(', ');

  // No conflito: atualiza os campos enriquecidos. imagem_url/edital_url só são
  // sobrescritos se vierem preenchidos (coalesce) — nunca apaga o que já existe.
  const updates = [
    'nome = excluded.nome', 'plano = excluded.plano', 'concurso = excluded.concurso',
    'area = excluded.area', 'banca = excluded.banca', 'escolaridade = excluded.escolaridade',
    'inscricao_valor = excluded.inscricao_valor', 'prova_data = excluded.prova_data',
    'descricao = excluded.descricao', 'uf = excluded.uf', 'scope = excluded.scope',
    'modality = excluded.modality', 'institution_type = excluded.institution_type',
    'registration_start = excluded.registration_start', 'registration_end = excluded.registration_end',
    'meta = excluded.meta',
    "imagem_url = coalesce(nullif(excluded.imagem_url, ''), public.contest_templates.imagem_url)",
    "edital_url = coalesce(nullif(excluded.edital_url, ''), public.contest_templates.edital_url)",
    'updated_at = now()',
  ].join(',\n  ');

  stmts.push(
    `insert into public.contest_templates (${names})\nvalues (${vals})\non conflict (slug) do update set\n  ${updates};`
  );
}

const header = `-- Atualização (upsert) de ${stmts.length} vestibulares a partir de ${path.basename(IN)}\n` +
  `-- Atualiza linhas existentes pelo slug; nao apaga imagem/edital ja salvos.\n` +
  `-- Rodar no Supabase SQL Editor (apos contest_templates_vestibular.sql ter criado as colunas).\n\n`;

fs.writeFileSync(OUT, header + stmts.join('\n\n') + '\n', 'utf8');
console.log('OK ->', OUT);
console.log('statements:', stmts.length, '| tamanho:', (fs.statSync(OUT).size / 1024).toFixed(1), 'KB');
