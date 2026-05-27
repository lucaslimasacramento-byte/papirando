import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0';
export const META_AUTH_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_read_engagement',
  'pages_show_list',
];

export function env(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return req.body.trim() ? JSON.parse(req.body) : {};
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export function getAppOrigin(req) {
  const configured = env('APP_URL', env('SITE_URL', env('VITE_PUBLIC_APP_ORIGIN')));
  if (configured) return configured.replace(/\/+$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
  const proto = req.headers['x-forwarded-proto'] || (String(host).includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`.replace(/\/+$/, '');
}

export function getSupabaseConfig() {
  return {
    url: env('SUPABASE_URL', env('VITE_SUPABASE_URL')).replace(/\/+$/, ''),
    anonKey: env('SUPABASE_ANON_KEY', env('VITE_SUPABASE_ANON_KEY')),
    serviceKey: env('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

export function getSupabaseAdmin() {
  const config = getSupabaseConfig();
  if (!config.url || !config.serviceKey) {
    const error = new Error('Supabase administrativo nao configurado.');
    error.status = 500;
    throw error;
  }
  return createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeBearerToken(value = '') {
  const token = String(value || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || token.length > 4096) return '';
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) ? token : '';
}

export async function requireUser(req) {
  const token = normalizeBearerToken(req.headers.authorization);
  if (!token) {
    const error = new Error('Faca login para conectar o Instagram.');
    error.status = 401;
    throw error;
  }

  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    const error = new Error('Supabase Auth nao configurado.');
    error.status = 500;
    throw error;
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.anonKey, Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = new Error('Sessao expirada. Faca login novamente.');
    error.status = 401;
    throw error;
  }

  return response.json();
}

export function getMetaConfig(req) {
  const appId = env('META_APP_ID');
  const appSecret = env('META_APP_SECRET');
  const redirectUri = env('META_REDIRECT_URI') || `${getAppOrigin(req)}/api/instagram/auth`;
  if (!appId || !appSecret) {
    const error = new Error('META_APP_ID e META_APP_SECRET precisam estar configurados.');
    error.status = 500;
    throw error;
  }
  return { appId, appSecret, redirectUri };
}

export async function metaFetch(path, params = {}, options = {}) {
  const url = new URL(path.startsWith('http') ? path : `https://graph.facebook.com/${GRAPH_VERSION}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });

  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || `Meta Graph falhou (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    error.meta = payload?.error || payload;
    throw error;
  }
  return payload;
}

export async function getAccountForUser(supabaseAdmin, userId, accountId = '') {
  let query = supabaseAdmin
    .from('instagram_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('connected_at', { ascending: false })
    .limit(1);
  if (accountId) query = supabaseAdmin.from('instagram_accounts').select('*').eq('user_id', userId).eq('id', accountId).limit(1);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) {
    const missing = new Error('Conecte uma conta do Instagram antes de publicar.');
    missing.status = 404;
    throw missing;
  }
  return data;
}

export function createState() {
  return randomBytes(24).toString('base64url');
}

export function normalizeMediaUrls(body = {}) {
  const urls = Array.isArray(body.media_urls)
    ? body.media_urls
    : Array.isArray(body.mediaUrls)
      ? body.mediaUrls
      : body.media_url
        ? [body.media_url]
        : body.mediaUrl
          ? [body.mediaUrl]
          : [];
  return urls.map((url) => String(url || '').trim()).filter(Boolean);
}

export function normalizeMediaType(value = '', mediaUrls = []) {
  const type = String(value || '').trim().toUpperCase();
  if (type === 'REEL') return 'REELS';
  if (['IMAGE', 'CAROUSEL', 'REELS'].includes(type)) return type;
  return mediaUrls.length > 1 ? 'CAROUSEL' : 'IMAGE';
}

export async function publishToInstagram({ account, mediaUrls, mediaType, caption }) {
  const accessToken = account.access_token;
  const igUserId = account.instagram_user_id;

  if (mediaType === 'CAROUSEL') {
    const children = [];
    for (const mediaUrl of mediaUrls) {
      const child = await metaFetch(`/${igUserId}/media`, {
        image_url: mediaUrl,
        is_carousel_item: 'true',
        access_token: accessToken,
      }, { method: 'POST' });
      children.push(child.id);
    }

    const container = await metaFetch(`/${igUserId}/media`, {
      media_type: 'CAROUSEL',
      children: children.join(','),
      caption,
      access_token: accessToken,
    }, { method: 'POST' });
    const published = await metaFetch(`/${igUserId}/media_publish`, {
      creation_id: container.id,
      access_token: accessToken,
    }, { method: 'POST' });
    return { containerId: container.id, mediaId: published.id };
  }

  const params = mediaType === 'REELS'
    ? { media_type: 'REELS', video_url: mediaUrls[0], caption, access_token: accessToken }
    : { image_url: mediaUrls[0], caption, access_token: accessToken };
  const container = await metaFetch(`/${igUserId}/media`, params, { method: 'POST' });
  const published = await metaFetch(`/${igUserId}/media_publish`, {
    creation_id: container.id,
    access_token: accessToken,
  }, { method: 'POST' });
  return { containerId: container.id, mediaId: published.id };
}
