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

const PROFILE_ALLOWED_PATCH_KEYS = [
  'nome',
  'email',
  'username',
  'celular',
  'telefone',
  'cpf',
  'avatar_url',
  'ranking_display_mode',
  'ranking_codename',
  'birth_date',
  'referral_code',
  'referred_by_code',
  'meta_horas_semana',
  'onboarding_done',
  'cpf_validado_algoritmo',
  'study_goal',
];

export async function updateProfile(userId, patch = {}) {
  if (!userId) return null;

  // SEC-001 allowlist: cliente nunca envia role/status_cadastro/email_verificado/etc.
  // O banco também bloqueia (REVOKE/GRANT column-level + trigger), mas filtrar aqui evita 403.
  const safePatch = Object.fromEntries(
    Object.entries(patch).filter(([key]) => PROFILE_ALLOWED_PATCH_KEYS.includes(key))
  );

  const payload = {
    id: userId,
    ...safePatch,
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

// Sobe uma imagem do usuário (ex.: foto de um objetivo/curso) e devolve a URL
// pública — reusa os buckets do avatar (o aluno já tem permissão de escrita no
// próprio prefixo userId/). NÃO altera o avatar do perfil.
export async function uploadUserImage(userId, file) {
  if (!userId || !file) return '';
  const type = String(file.type || '').toLowerCase();
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type)) {
    throw new Error('Envie uma imagem PNG, JPG, WebP ou GIF.');
  }
  if (Number(file.size || 0) > 5 * 1024 * 1024) {
    throw new Error('A imagem deve ter no máximo 5 MB.');
  }
  let lastError = null;
  for (const bucket of AVATAR_BUCKET_CANDIDATES) {
    try {
      return await uploadAvatarToBucket(bucket, userId, file);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Nao foi possivel enviar a imagem.');
}

// B-045: limite conservador de 1 000 registros para evitar estouro de memória/timeout
// em produção. Quando a base crescer acima desse valor, implementar paginação com cursor.
const LOAD_ALL_PROFILES_LIMIT = 999;

export async function loadAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .range(0, LOAD_ALL_PROFILES_LIMIT);
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
