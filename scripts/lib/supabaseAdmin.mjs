// Helpers de admin para scripts locais (Node 18+).
// Lê .env e .env.local da raiz do repo; nunca imprime as chaves.
//   SUPABASE_SERVICE_ROLE_KEY → Storage e REST ignorando RLS
//   SUPABASE_ACCESS_TOKEN     → Management API (SQL como postgres)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROJECT_REF = 'najrbhbdfxixfrxzvcer';

function loadEnv() {
  const env = { ...process.env };
  for (const name of ['.env', '.env.local']) {
    const file = path.join(ROOT, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const i = line.indexOf('=');
      if (i <= 0 || line.trim().startsWith('#')) continue;
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const env = loadEnv();
export const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN;

export function requireCredentials({ sql = true, service = true } = {}) {
  const missing = [];
  if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (service && !SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (sql && !ACCESS_TOKEN) missing.push('SUPABASE_ACCESS_TOKEN');
  if (missing.length) throw new Error(`Faltam variáveis em .env.local: ${missing.join(', ')}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// SQL via Management API. Retorna array de linhas (do último statement).
export async function sql(query, { retries = 3 } = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body;
    if ((res.status === 429 || res.status >= 500) && attempt < retries) { await sleep(2000 * attempt); continue; }
    throw new Error(`SQL ${res.status}: ${JSON.stringify(body).slice(0, 500)}`);
  }
}

// Literal SQL seguro para texto (dollar-quoting com tag aleatória).
export function lit(value) {
  if (value === null || value === undefined) return 'null';
  const s = String(value);
  let tag = 'q';
  while (s.includes(`$${tag}$`)) tag += 'x';
  return `$${tag}$${s}$${tag}$`;
}

export function jsonLit(value) {
  return `${lit(JSON.stringify(value))}::jsonb`;
}

function storageHeaders(extra = {}) {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, ...extra };
}

export async function storageObjectExists(bucket, objectPath) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/info/${bucket}/${encodeObjectPath(objectPath)}`, {
    headers: storageHeaders(),
  });
  return res.ok;
}

// Upload sem sobrescrever (x-upsert: false). Retorna 'uploaded' | 'exists'.
export async function storageUpload(bucket, objectPath, buffer, contentType) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeObjectPath(objectPath)}`, {
      method: 'POST',
      headers: storageHeaders({ 'Content-Type': contentType, 'x-upsert': 'false', 'cache-control': '3600' }),
      body: buffer,
    });
    if (res.ok) return 'uploaded';
    const body = await res.text();
    if (res.status === 409 || /already exists|Duplicate/i.test(body)) return 'exists';
    if ((res.status === 429 || res.status >= 500) && attempt < 3) { await sleep(2000 * attempt); continue; }
    throw new Error(`Upload ${objectPath} → ${res.status}: ${body.slice(0, 300)}`);
  }
}

function encodeObjectPath(p) {
  return p.split('/').map(encodeURIComponent).join('/');
}

export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
