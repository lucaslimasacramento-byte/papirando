import {
  getAccountForUser,
  getSupabaseAdmin,
  normalizeMediaType,
  normalizeMediaUrls,
  publishToInstagram,
  readJson,
  requireUser,
  sendJson,
} from '../_instagram.js';

function isFutureDate(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) && time > Date.now() + 60_000;
}

async function listPosts(req, res) {
  const user = await requireUser(req);
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('instagram_posts')
    .select('*, instagram_accounts(instagram_username, instagram_user_id)')
    .eq('user_id', user.id)
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return sendJson(res, 200, { posts: data || [] });
}

async function createOrPublishPost(req, res) {
  const user = await requireUser(req);
  const body = await readJson(req);
  const supabaseAdmin = getSupabaseAdmin();
  const account = await getAccountForUser(supabaseAdmin, user.id, body.accountId || body.account_id || '');
  const mediaUrls = normalizeMediaUrls(body);
  const mediaType = normalizeMediaType(body.mediaType || body.media_type, mediaUrls);
  const caption = String(body.caption || '').trim();
  const scheduledAt = body.scheduledAt || body.scheduled_at || null;

  if (mediaUrls.length === 0) return sendJson(res, 400, { error: 'Informe ao menos uma media_url publica.' });
  if (mediaType === 'IMAGE' && mediaUrls.length !== 1) return sendJson(res, 400, { error: 'Post de imagem aceita exatamente uma midia.' });
  if (mediaType === 'REELS' && mediaUrls.length !== 1) return sendJson(res, 400, { error: 'Reels aceita exatamente um video.' });
  if (mediaType === 'CAROUSEL' && mediaUrls.length < 2) return sendJson(res, 400, { error: 'Carrossel precisa de ao menos duas imagens.' });

  const initialStatus = isFutureDate(scheduledAt) ? 'scheduled' : 'publishing';
  const { data: post, error: insertError } = await supabaseAdmin
    .from('instagram_posts')
    .insert({
      user_id: user.id,
      account_id: account.id,
      media_url: mediaUrls[0],
      media_urls: mediaUrls,
      media_type: mediaType,
      caption,
      scheduled_at: scheduledAt,
      status: initialStatus,
    })
    .select('*')
    .single();
  if (insertError) throw insertError;

  if (initialStatus === 'scheduled') return sendJson(res, 200, { post });

  try {
    const published = await publishToInstagram({ account, mediaUrls, mediaType, caption });
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('instagram_posts')
      .update({
        instagram_container_id: published.containerId,
        instagram_media_id: published.mediaId,
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id)
      .eq('user_id', user.id)
      .select('*')
      .single();
    if (updateError) throw updateError;
    return sendJson(res, 200, { post: updated });
  } catch (error) {
    await supabaseAdmin
      .from('instagram_posts')
      .update({ status: 'failed', error_message: error.message, updated_at: new Date().toISOString() })
      .eq('id', post.id)
      .eq('user_id', user.id);
    throw error;
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {});
    if (req.method === 'GET') return listPosts(req, res);
    if (req.method === 'POST') return createOrPublishPost(req, res);
    return sendJson(res, 405, { error: 'Metodo nao permitido.' });
  } catch (error) {
    console.error('[instagram/publish]', { message: error.message, status: error.status, meta: error.meta });
    return sendJson(res, Number(error.status || 500), { error: error.message || 'Falha ao publicar no Instagram.' });
  }
}
