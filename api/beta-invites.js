const INVITE_COLUMNS = 'id, email, token, nome, observacao, invited_at, used_at, used_by_user_id';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function getSupabaseConfig() {
  const url = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const anonKey = String(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  return { url, anonKey };
}

function normalizeBearerAuthorization(value) {
  const authorization = String(value || '').trim();
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token || token.length > 4096) return '';
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return '';
  return `Bearer ${token}`;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Payload muito grande.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON invalido.'));
      }
    });
    req.on('error', reject);
  });
}

async function supabaseRest(path, { method = 'GET', body, authorization } = {}) {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    const error = new Error('Supabase nao configurado nas variaveis de ambiente do Vercel.');
    error.status = 500;
    throw error;
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: authorization || `Bearer ${anonKey}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json', Prefer: 'return=representation' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        message: `Supabase retornou resposta nao JSON (${response.status}).`,
        snippet: text.replace(/\s+/g, ' ').trim().slice(0, 180),
      };
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.message || response.statusText || 'Erro no Supabase.');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
    const authorization = normalizeBearerAuthorization(req.headers.authorization);

    if (req.method === 'GET') {
      const data = await supabaseRest(
        `beta_invites?select=${encodeURIComponent(INVITE_COLUMNS)}&order=invited_at.desc&limit=300`
      );
      sendJson(res, 200, data || []);
      return;
    }

    if (req.method === 'POST') {
      if (!authorization) {
        sendJson(res, 401, { message: 'Sessao admin invalida. Faca login novamente e tente de novo.' });
        return;
      }

      const body = await readJsonBody(req);
      const data = await supabaseRest(`beta_invites?select=${encodeURIComponent(INVITE_COLUMNS)}`, {
        method: 'POST',
        authorization,
        body,
      });
      sendJson(res, 200, data);
      return;
    }

    if (req.method === 'DELETE') {
      if (!authorization) {
        sendJson(res, 401, { message: 'Sessao admin invalida. Faca login novamente e tente de novo.' });
        return;
      }

      const id = String(requestUrl.searchParams.get('id') || '').trim();
      if (!id) {
        sendJson(res, 400, { message: 'ID do convite nao informado.' });
        return;
      }

      await supabaseRest(`beta_invites?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        authorization,
      });
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { message: 'Metodo nao permitido.' });
  } catch (error) {
    sendJson(res, error.status || 500, {
      message: error.payload?.message || error.message || 'Erro ao acessar beta_invites.',
      details: error.payload?.details,
      hint: error.payload?.hint,
      code: error.payload?.code,
      snippet: error.payload?.snippet,
    });
  }
}
