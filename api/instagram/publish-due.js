import { getSupabaseAdmin, publishToInstagram, sendJson } from '../_instagram.js';

function isCronAuthorized(req) {
  const secret = String(process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  return String(req.headers.authorization || '').trim() === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  if (req.method !== 'GET' && req.method !== 'POST') return sendJson(res, 405, { error: 'Metodo nao permitido.' });
  if (!isCronAuthorized(req)) return sendJson(res, 401, { error: 'Cron nao autorizado.' });

  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { data: posts, error } = await supabaseAdmin
      .from('instagram_posts')
      .select('*, instagram_accounts(*)')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10);
    if (error) throw error;

    const results = [];
    for (const post of posts || []) {
      const account = post.instagram_accounts;
      try {
        await supabaseAdmin
          .from('instagram_posts')
          .update({ status: 'publishing', updated_at: new Date().toISOString() })
          .eq('id', post.id);

        const published = await publishToInstagram({
          account,
          mediaUrls: post.media_urls?.length ? post.media_urls : [post.media_url],
          mediaType: post.media_type,
          caption: post.caption,
        });

        await supabaseAdmin
          .from('instagram_posts')
          .update({
            instagram_container_id: published.containerId,
            instagram_media_id: published.mediaId,
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        results.push({ id: post.id, status: 'published' });
      } catch (postError) {
        await supabaseAdmin
          .from('instagram_posts')
          .update({ status: 'failed', error_message: postError.message, updated_at: new Date().toISOString() })
          .eq('id', post.id);
        results.push({ id: post.id, status: 'failed', error: postError.message });
      }
    }

    return sendJson(res, 200, { processed: results.length, results });
  } catch (error) {
    console.error('[instagram/publish-due]', { message: error.message, status: error.status, meta: error.meta });
    return sendJson(res, Number(error.status || 500), { error: error.message || 'Falha ao publicar agendados.' });
  }
}
