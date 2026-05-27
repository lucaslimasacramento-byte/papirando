import { supabase } from './supabase';
import { resolveAiHeaders } from './aiRuntime';

async function parseJson(response) {
  return response.json().catch(() => ({}));
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(await resolveAiHeaders()),
      ...(options.headers || {}),
    },
  });
  const data = await parseJson(response);
  if (!response.ok) throw new Error(data?.error || `Erro ${response.status}.`);
  return data;
}

export async function listInstagramAccounts() {
  const { data, error } = await supabase
    .from('instagram_accounts')
    .select('id,instagram_user_id,instagram_username,facebook_page_id,connected_at,token_expires_at,last_synced_at')
    .order('connected_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function startInstagramOAuth() {
  const redirectTo = `${window.location.origin}${window.location.pathname}?tab=instagram`;
  return requestJson('/api/instagram/auth', {
    method: 'POST',
    body: JSON.stringify({ redirectTo }),
  });
}

export async function listInstagramPosts() {
  const data = await requestJson('/api/instagram/publish');
  return data.posts || [];
}

export async function publishInstagramPost(payload) {
  const data = await requestJson('/api/instagram/publish', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.post;
}

export async function syncInstagramMetrics(accountId = '') {
  const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : '';
  const data = await requestJson(`/api/instagram/metrics${query}`, { method: 'POST' });
  return data;
}

export async function generateInstagramCaption(payload) {
  return requestJson('/api/ai/instagram-caption', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function uploadInstagramMedia(userId, files = []) {
  const uploads = [];
  for (const file of files) {
    const extension = String(file.name || 'media').split('.').pop() || 'bin';
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const { error } = await supabase.storage.from('instagram-temp').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from('instagram-temp').getPublicUrl(path);
    uploads.push(data.publicUrl);
  }
  return uploads;
}
