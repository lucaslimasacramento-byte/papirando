import { supabase } from './supabase';

const AVATAR_BUCKET_CANDIDATES = ['avatars', 'profile-avatars'];

function sanitizeFileName(name = 'avatar') {
  return String(name || 'avatar')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

export async function loadProfile(userId) {
  if (!userId) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data || null;
}

export async function updateProfile(userId, patch = {}) {
  if (!userId) return null;

  const payload = {
    id: userId,
    ...patch,
  };

  const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select('*').maybeSingle();
  if (error) throw error;
  return data || null;
}

async function uploadAvatarToBucket(bucket, userId, file) {
  const fileExt = String(file?.name || 'png').split('.').pop() || 'png';
  const fileName = `${Date.now()}-${sanitizeFileName(file?.name || `avatar.${fileExt}`)}`;
  const filePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
    upsert: true,
    cacheControl: '3600',
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  const publicUrl = String(data?.publicUrl || '').trim();
  if (!publicUrl) {
    throw new Error(`Nao foi possivel obter a URL publica do avatar no bucket ${bucket}.`);
  }

  return publicUrl;
}

export async function uploadAvatar(userId, file) {
  if (!userId || !file) return '';

  let lastError = null;

  for (const bucket of AVATAR_BUCKET_CANDIDATES) {
    try {
      const avatarUrl = await uploadAvatarToBucket(bucket, userId, file);
      await updateProfile(userId, { avatar_url: avatarUrl });
      return avatarUrl;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Nao foi possivel enviar o avatar.');
}

export async function loadAllProfiles() {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;

  return [...(data || [])].sort((first, second) =>
    String(first.nome || first.email || '').localeCompare(String(second.nome || second.email || ''), 'pt-BR')
  );
}

export async function countProfiles() {
  const { count, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return Number(count || 0);
}
