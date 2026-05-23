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
        const error = new Error('Payload muito grande.');
        error.status = 413;
        reject(error);
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
        const error = new Error('JSON invalido.');
        error.status = 400;
        reject(error);
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

function normalizeInviteRow(row) {
  return {
    id: row?.id || '',
    email: row?.email || '',
    token: row?.token || '',
    nome: row?.nome || '',
    observacao: row?.observacao || '',
    invited_at: row?.invited_at || '',
    used_at: row?.used_at || null,
    used_by_user_id: row?.used_by_user_id || null,
  };
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
      if (!authorization) {
        sendJson(res, 401, { message: 'Sessao admin invalida. Faca login novamente e tente de novo.' });
        return;
      }

      const data = await supabaseRest('rpc/admin_get_beta_invites', {
        method: 'POST',
        authorization,
        body: {},
      });
      sendJson(res, 200, (Array.isArray(data) ? data : []).map(normalizeInviteRow));
      return;
    }

    if (req.method === 'POST') {
      if (!authorization) {
        sendJson(res, 401, { message: 'Sessao admin invalida. Faca login novamente e tente de novo.' });
        return;
      }

      const body = await readJsonBody(req);
      const email = String(body?.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        sendJson(res, 400, { message: 'E-mail invalido.' });
        return;
      }
      const data = await supabaseRest('rpc/admin_insert_beta_invite', {
        method: 'POST',
        authorization,
        body: {
          p_email: email,
          p_nome: String(body?.nome || '').trim(),
          p_observacao: String(body?.observacao || '').trim(),
        },
      });
      const row = Array.isArray(data) ? data[0] : data;
      sendJson(res, 200, normalizeInviteRow(row));
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

      await supabaseRest('rpc/admin_delete_beta_invite', {
        method: 'POST',
        authorization,
        body: { p_id: id },
      });
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { message: 'Metodo nao permitido.' });
  } catch (error) {
    console.error('[api/beta-invites]', {
      status: error.status || 500,
      code: error.payload?.code || '',
    });
    sendJson(res, error.status || 500, {
      message:
        Number(error.status || 500) >= 500
          ? 'Nao foi possivel acessar os convites beta.'
          : error.payload?.message || error.message || 'Requisicao invalida.',
      code: error.payload?.code,
    });
  }
}
