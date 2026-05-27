import {
  GRAPH_VERSION,
  META_AUTH_SCOPES,
  createState,
  getMetaConfig,
  getAppOrigin,
  getSupabaseAdmin,
  metaFetch,
  readJson,
  requireUser,
  sendJson,
} from '../_instagram.js';

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader('location', location);
  res.end();
}

async function createAuthorizationUrl(req, res) {
  const user = await requireUser(req);
  const body = await readJson(req);
  const supabaseAdmin = getSupabaseAdmin();
  const meta = getMetaConfig(req);
  const state = createState();
  const redirectTo = String(body?.redirectTo || `${getAppOrigin(req)}/?tab=instagram`).slice(0, 500);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin.from('instagram_oauth_states').insert({
    state,
    user_id: user.id,
    redirect_to: redirectTo,
    expires_at: expiresAt,
  });
  if (error) throw error;

  const authUrl = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  authUrl.searchParams.set('client_id', meta.appId);
  authUrl.searchParams.set('redirect_uri', meta.redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', META_AUTH_SCOPES.join(','));
  authUrl.searchParams.set('response_type', 'code');

  return sendJson(res, 200, {
    authUrl: authUrl.toString(),
    scopes: META_AUTH_SCOPES,
    redirectUri: meta.redirectUri,
  });
}

async function handleCallback(req, res) {
  const url = new URL(req.url || '/api/instagram/auth', 'http://127.0.0.1');
  const state = String(url.searchParams.get('state') || '');
  const code = String(url.searchParams.get('code') || '');
  const denied = String(url.searchParams.get('error_description') || url.searchParams.get('error') || '');
  const appOrigin = getAppOrigin(req);

  if (denied) return redirect(res, `${appOrigin}/?tab=instagram&instagram_error=${encodeURIComponent(denied)}`);
  if (!state || !code) return redirect(res, `${appOrigin}/?tab=instagram&instagram_error=callback_invalido`);

  const supabaseAdmin = getSupabaseAdmin();
  const meta = getMetaConfig(req);
  const { data: oauthState, error: stateError } = await supabaseAdmin
    .from('instagram_oauth_states')
    .select('*')
    .eq('state', state)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (stateError) throw stateError;
  if (!oauthState) return redirect(res, `${appOrigin}/?tab=instagram&instagram_error=state_expirado`);

  const shortToken = await metaFetch('/oauth/access_token', {
    client_id: meta.appId,
    client_secret: meta.appSecret,
    redirect_uri: meta.redirectUri,
    code,
  });

  const longToken = await metaFetch('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: meta.appId,
    client_secret: meta.appSecret,
    fb_exchange_token: shortToken.access_token,
  });

  const accessToken = longToken.access_token || shortToken.access_token;
  const expiresIn = Number(longToken.expires_in || shortToken.expires_in || 0);
  const tokenExpiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
  const pages = await metaFetch('/me/accounts', {
    fields: 'id,name,instagram_business_account{id,username}',
    access_token: accessToken,
  });
  const page = (pages?.data || []).find((item) => item?.instagram_business_account?.id);
  const instagramAccount = page?.instagram_business_account;

  if (!instagramAccount?.id) {
    return redirect(
      res,
      `${appOrigin}/?tab=instagram&instagram_error=${encodeURIComponent('Nenhuma conta Instagram profissional vinculada a uma Pagina foi encontrada.')}`
    );
  }

  const { error: upsertError } = await supabaseAdmin.from('instagram_accounts').upsert({
    user_id: oauthState.user_id,
    instagram_user_id: instagramAccount.id,
    instagram_username: instagramAccount.username || '',
    facebook_page_id: page.id,
    access_token: accessToken,
    token_expires_at: tokenExpiresAt,
    permissions: META_AUTH_SCOPES,
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,instagram_user_id' });
  if (upsertError) throw upsertError;

  await supabaseAdmin
    .from('instagram_oauth_states')
    .update({ consumed_at: new Date().toISOString() })
    .eq('state', state);

  return redirect(res, oauthState.redirect_to || `${appOrigin}/?tab=instagram`);
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {});
    if (req.method === 'POST') return createAuthorizationUrl(req, res);
    if (req.method === 'GET') return handleCallback(req, res);
    return sendJson(res, 405, { error: 'Metodo nao permitido.' });
  } catch (error) {
    console.error('[instagram/auth]', { message: error.message, status: error.status, meta: error.meta });
    if (req.method === 'GET') {
      const appOrigin = getAppOrigin(req);
      return redirect(res, `${appOrigin}/?tab=instagram&instagram_error=${encodeURIComponent(error.message)}`);
    }
    return sendJson(res, Number(error.status || 500), { error: error.message || 'Falha no OAuth do Instagram.' });
  }
}
