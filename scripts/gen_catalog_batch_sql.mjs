// Encapsula o SQL já gerado pelo importador com a marcação de lote.
// Não substitui scripts/gen_catalog_drafts_sql.mjs: ele continua sendo a única
// fonte do SQL de inserção validado contra o schema de produção.
//
// Uso:
//   node scripts/gen_catalog_batch_sql.mjs <lote.json> <importacao.sql> [saida.sql]

import fs from 'node:fs';
import path from 'node:path';

const [lotFile, importFile, outputFile] = process.argv.slice(2);
if (!lotFile || !importFile) {
  console.error('Uso: node scripts/gen_catalog_batch_sql.mjs <lote.json> <importacao.sql> [saida.sql]');
  process.exit(2);
}

function readJson(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(value)) throw new Error('o JSON deve ser um array');
    return value;
  } catch (error) {
    console.error(`FALHOU ao ler ${file}: ${error.message}`);
    process.exit(1);
  }
}

function slugify(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const items = readJson(lotFile);
if (items.length === 0) {
  console.error('FALHOU: lote vazio não pode receber marcação.');
  process.exit(1);
}

const batches = [...new Set(items.map((item) => String(item.catalog_batch || '').trim()).filter(Boolean))];
if (batches.length !== 1 || items.some((item) => !String(item.catalog_batch || '').trim())) {
  console.error('FALHOU: todos os itens devem ter o mesmo catalog_batch não vazio.');
  process.exit(1);
}

const slugs = [...new Set(items.map((item) => slugify(item.nome)).filter(Boolean))];
if (slugs.length !== items.length) {
  console.error('FALHOU: há nomes que geram slugs repetidos; corrija o JSON antes de gerar o lote.');
  process.exit(1);
}

let importSql = '';
try {
  importSql = fs.readFileSync(importFile, 'utf8').trim();
} catch (error) {
  console.error(`FALHOU ao ler ${importFile}: ${error.message}`);
  process.exit(1);
}
if (!importSql) {
  console.error('FALHOU: SQL de importação vazio.');
  process.exit(1);
}

const destination = outputFile || path.join(path.dirname(importFile), `import_${path.basename(importFile)}`);
const batch = batches[0];
const sql = `-- Lote Papirando: ${batch}\n-- Insere rascunhos e os vincula ao lote para revisão manual no Admin.\n-- Requer a migration 202608040001_catalog_batches.sql aplicada.\n\nbegin;\n\n${importSql}\n\nupdate public.contest_templates\nset catalog_batch = ${sqlString(batch)},\n    updated_at = now()\nwhere is_public = false\n  and slug in (${slugs.map(sqlString).join(', ')})\n  and coalesce(catalog_batch, '') = '';\n\ncommit;\n`;

fs.writeFileSync(destination, sql, 'utf8');
console.log(`OK: lote "${batch}" com ${items.length} item(ns) -> ${destination}`);
