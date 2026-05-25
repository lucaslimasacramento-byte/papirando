import { createClient } from '@supabase/supabase-js';

// SEC-021: ADMIN_EMAILS removido. Admin agora eh determinado exclusivamente por
// profiles.role='admin' (verificado via isAdminProfile abaixo).
const ADMIN_EMAILS = [];const BUCKETS = {
  image: {
    bucket: 'contest-images',
    folder: 'contest-images',
    maxBytes: 3 * 1024 * 1024,
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mime: ['image/png', 'image/jpeg', 'image/webp'],
  },
  edital: {
    bucket: 'contest-edital-files',
    folder: 'contest-edital-files',
    maxBytes: 25 * 1024 * 1024,
    extensions: ['pdf'],
    mime: ['application/pdf'],
  },
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '35mb',
    },
  },
};

function env(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

function getSupabaseConfig() {
  return {
    url: env('SUPABASE_URL', env('VITE_SUPABASE_URL')).replace(/\/+$/, ''),
    anonKey: env('SUPABASE_ANON_KEY', env('VITE_SUPABASE_ANON_KEY')),
    serviceKey: env('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

function normalizeBearerToken(value = '') {
  const token = String(value || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || token.length > 4096) return '';
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) ? token : '';
}

async function requireUser(req, config) {
  const token = normalizeBearerToken(req.headers.authorization);
  if (!token) {
    const error = new Error('Faca login novamente para enviar arquivos.');
    error.status = 401;
    throw error;
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = new Error('Sessao expirada. Faca login novamente.');
    error.status = 401;
    throw error;
  }

  return response.json();
}

function isTrustedRequestOrigin(req) {
  const raw = String(req.headers.origin || req.headers.referer || '').trim();
  if (!raw) return false;

  try {
    const host = new URL(raw).host.toLowerCase();
    return (
      host === 'papirando.vercel.app' ||
      host.endsWith('-lucaslimasacramento-bytes-projects.vercel.app') ||
      host === 'localhost:5173' ||
      host === 'localhost:5176' ||
      host === 'localhost:5177' ||
      host === '127.0.0.1:5173'
    );
  } catch {
    return false;
  }
}

function isAdminProfile(profile, user) {
  const role = String(profile?.role || '').trim().toLowerCase();
  const email = String(profile?.email || user?.email || '').trim().toLowerCase();
// SEC-002 + SEC-021: confia apenas em profiles.role. Sem fallback por dominio ou email hardcoded.
return ['admin', 'admin_master', 'master'].includes(role);}

async function requireAdmin(req, supabaseAdmin, config, body = {}) {
  let user = null;

  try {
    user = await requireUser(req, config);
  } catch (error) {
    const adminEmail = String(body?.adminEmail || '').trim().toLowerCase();
    if (isTrustedRequestOrigin(req) && ADMIN_EMAILS.includes(adminEmail)) {
      return { id: '', email: adminEmail, fallback: true };
    }
    throw error;
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id,email,role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!isAdminProfile(profile, user)) {
    const forbidden = new Error('Usuario sem permissao administrativa para enviar arquivos.');
    forbidden.status = 403;
    throw forbidden;
  }

  return user;
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return req.body.trim() ? JSON.parse(req.body) : {};

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function safeBaseName(value = '') {
  return String(value || 'arquivo')
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function getStoragePathFromUrl(url = '', bucket = '') {
  const raw = String(url || '').trim();
  if (!raw || !bucket) return '';

  try {
    const parsed = new URL(raw);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return '';
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Metodo nao permitido.' });
  }

  try {
    const config = getSupabaseConfig();
    if (!config.url || !config.anonKey || !config.serviceKey) {
      return sendJson(res, 500, { error: 'Supabase administrativo nao configurado.' });
    }

    const supabaseAdmin = createClient(config.url, config.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const body = await readJson(req);
    await requireAdmin(req, supabaseAdmin, config, body);

    const kind = String(body?.kind || '').trim();
    const spec = BUCKETS[kind];
    if (!spec) return sendJson(res, 400, { error: 'Tipo de arquivo invalido.' });

    const fileName = String(body?.fileName || '').trim();
    const contentType = String(body?.contentType || '').trim().toLowerCase();
    const extension = String(fileName.split('.').pop() || '').toLowerCase();
    if (!spec.extensions.includes(extension) || !spec.mime.includes(contentType)) {
      return sendJson(res, 400, { error: kind === 'image' ? 'Envie uma imagem PNG, JPG ou WebP.' : 'Envie um arquivo PDF valido.' });
    }

    const fileBase64 = String(body?.fileBase64 || '').replace(/^data:[^;]+;base64,/, '').trim();
    if (!fileBase64) return sendJson(res, 400, { error: 'Arquivo vazio.' });

    const buffer = Buffer.from(fileBase64, 'base64');
    if (!buffer.length || buffer.length > spec.maxBytes) {
      return sendJson(res, 400, {
        error: kind === 'image' ? 'A imagem deve ter no maximo 3 MB.' : 'O PDF deve ter no maximo 25 MB.',
      });
    }

    const filePath = `${spec.folder}/${Date.now()}-${safeBaseName(fileName) || 'arquivo'}.${extension}`;
    const { error: uploadError } = await supabaseAdmin.storage.from(spec.bucket).upload(filePath, buffer, {
      upsert: false,
      contentType,
    });
    if (uploadError) throw uploadError;

    const oldPath = getStoragePathFromUrl(body?.existingUrl || '', spec.bucket);
    if (oldPath) {
      const { error: removeError } = await supabaseAdmin.storage.from(spec.bucket).remove([oldPath]);
      if (removeError) console.warn('[contest-assets] old file remove failed', removeError.message || removeError);
    }

    const { data } = supabaseAdmin.storage.from(spec.bucket).getPublicUrl(filePath);
    return sendJson(res, 200, { url: data.publicUrl, path: filePath });
  } catch (error) {
    const status = Number(error.status || 500);
    console.error('[contest-assets]', {
      status,
      message: error.message || 'Falha no upload.',
      details: error?.details,
      code: error?.code,
    });
    return sendJson(res, status, {
      error: error.message || 'Nao foi possivel enviar o arquivo.',
      details: error?.details || undefined,
      code: error?.code || undefined,
    });
  }
}
