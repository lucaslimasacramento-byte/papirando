import { getAccountForUser, getSupabaseAdmin, metaFetch, requireUser, sendJson } from '../_instagram.js';

function metricValue(values = []) {
  return (Array.isArray(values) ? values : []).reduce((sum, item) => sum + Number(item?.value || 0), 0);
}

async function syncMetrics(req, res) {
  const user = await requireUser(req);
  const supabaseAdmin = getSupabaseAdmin();
  const url = new URL(req.url || '/api/instagram/metrics', 'http://127.0.0.1');
  const account = await getAccountForUser(supabaseAdmin, user.id, url.searchParams.get('accountId') || '');

  const { data: posts, error: postsError } = await supabaseAdmin
    .from('instagram_posts')
    .select('id,instagram_media_id')
    .eq('user_id', user.id)
    .eq('account_id', account.id)
    .eq('status', 'published')
    .not('instagram_media_id', 'is', null)
    .order('published_at', { ascending: false })
    .limit(20);
  if (postsError) throw postsError;

  const rows = [];
  for (const post of posts || []) {
    const insights = await metaFetch(`/${post.instagram_media_id}/insights`, {
      metric: 'impressions,reach,engagement,saved',
      access_token: account.access_token,
    }).catch((error) => ({ error: error.message, data: [] }));
    const rawMetrics = insights?.data || [];
    const byName = Object.fromEntries(rawMetrics.map((metric) => [metric.name, metricValue(metric.values)]));
    rows.push({
      user_id: user.id,
      account_id: account.id,
      post_id: post.id,
      instagram_media_id: post.instagram_media_id,
      impressions: Number(byName.impressions || 0),
      reach: Number(byName.reach || 0),
      engagement: Number(byName.engagement || 0),
      saves: Number(byName.saved || 0),
      raw: insights,
      captured_at: new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    const { error } = await supabaseAdmin.from('instagram_metrics').insert(rows);
    if (error) throw error;
  }

  const { data: history, error: historyError } = await supabaseAdmin
    .from('instagram_metrics')
    .select('*')
    .eq('user_id', user.id)
    .eq('account_id', account.id)
    .order('captured_at', { ascending: false })
    .limit(100);
  if (historyError) throw historyError;

  return sendJson(res, 200, { metrics: history || [], synced: rows.length });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {});
    if (req.method !== 'GET' && req.method !== 'POST') return sendJson(res, 405, { error: 'Metodo nao permitido.' });
    return syncMetrics(req, res);
  } catch (error) {
    console.error('[instagram/metrics]', { message: error.message, status: error.status, meta: error.meta });
    return sendJson(res, Number(error.status || 500), { error: error.message || 'Falha ao buscar metricas.' });
  }
}
