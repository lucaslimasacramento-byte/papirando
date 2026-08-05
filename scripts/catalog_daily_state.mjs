// Protege o catálogo diário contra duplicatas e separa atualizações de novos itens.
// Uso:
//   node scripts/catalog_daily_state.mjs check <lote.json>
//   node scripts/catalog_daily_state.mjs record <lote.json>
// O comando `record` só deve ser chamado depois de validar o JSON e gerar o SQL.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SLUGS_FILE = path.join(ROOT, 'scratchpad', 'catalogo-ja-coletado.json');
const IDENTITIES_FILE = path.join(ROOT, 'scratchpad', 'catalogo-identidades-coletadas.json');
const UPDATES_DIR = path.join(ROOT, 'scratchpad', 'catalogo-diario', 'atualizacoes-pendentes');

const [command, lotFile] = process.argv.slice(2);
if (!['check', 'record'].includes(command) || !lotFile) {
  console.error('Uso: node scripts/catalog_daily_state.mjs <check|record> <lote.json>');
  process.exit(2);
}

const readJson = (file, fallback) => fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, 'utf8'))
  : fallback;
const slugify = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

const lot = readJson(lotFile, null);
if (!Array.isArray(lot)) {
  console.error('Lote inválido: a raiz deve ser um array JSON.');
  process.exit(2);
}
const slugs = readJson(SLUGS_FILE, []);
const identitiesState = readJson(IDENTITIES_FILE, { version: 1, items: [] });
if (!Array.isArray(slugs) || !Array.isArray(identitiesState.items)) {
  console.error('Arquivos de estado inválidos. Corrija-os antes de continuar.');
  process.exit(2);
}

const existingSlugs = new Set(slugs);
const existingIdentities = new Map(identitiesState.items.map((item) => [item.source_identity, item]));
const newItems = [];
const updates = [];
const errors = [];

for (const item of lot) {
  const slug = slugify(item?.nome);
  const sourceIdentity = String(item?.source_identity || '').trim();
  if (!slug) {
    errors.push('item sem nome para gerar slug');
    continue;
  }
  if (!sourceIdentity) {
    errors.push(`${item.nome}: source_identity ausente (use orgao|numero-do-edital|cargo)`);
    continue;
  }
  if (existingSlugs.has(slug)) {
    updates.push({ item, slug, reason: 'slug já entregue' });
  } else if (existingIdentities.has(sourceIdentity)) {
    updates.push({ item, slug, reason: 'mesma identidade de fonte já entregue' });
  } else {
    newItems.push({ item, slug, sourceIdentity });
  }
}

if (errors.length) {
  console.error(`FALHOU: ${errors.length} erro(s).`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Novos: ${newItems.length} | Atualizações pendentes: ${updates.length}`);
updates.forEach((update) => console.log(`- ${update.item.nome}: ${update.reason}`));

if (command === 'check') process.exit(0);

if (updates.length) {
  fs.mkdirSync(UPDATES_DIR, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const report = path.join(UPDATES_DIR, `${day}.json`);
  fs.writeFileSync(report, `${JSON.stringify(updates, null, 2)}\n`, 'utf8');
  console.log(`Atualizações salvas em ${path.relative(ROOT, report)}; não foram marcadas como entregues.`);
}

if (newItems.length) {
  const today = new Date().toISOString();
  const nextSlugs = [...new Set([...slugs, ...newItems.map(({ slug }) => slug)])].sort();
  const nextIdentities = {
    version: 1,
    items: [...identitiesState.items, ...newItems.map(({ item, slug, sourceIdentity }) => ({
      source_identity: sourceIdentity,
      slug,
      nome: item.nome,
      edital_url: item.edital_url,
      catalog_batch: item.catalog_batch || null,
      first_delivered_at: today,
    }))],
  };
  fs.writeFileSync(SLUGS_FILE, `${JSON.stringify(nextSlugs, null, 2)}\n`, 'utf8');
  fs.writeFileSync(IDENTITIES_FILE, `${JSON.stringify(nextIdentities, null, 2)}\n`, 'utf8');
  console.log(`Estado atualizado com ${newItems.length} item(ns) novo(s).`);
}
