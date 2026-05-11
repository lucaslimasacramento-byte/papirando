import { resolveAiHeaders } from './aiRuntime';

async function parseJson(response) {
  return response.json().catch(() => ({}));
}

function readStoredSupabaseAccessToken() {
  if (typeof window === 'undefined' || !window.localStorage) return '';

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !/^sb-.+-auth-token$/.test(key)) continue;

    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '{}');
      const token = String(parsed?.access_token || '').trim();
      if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return token;
    } catch {
      // Ignore invalid Supabase storage entries.
    }
  }

  return '';
}

export async function saveContestTemplateAdmin({ templateData, existingId = null, accessToken = '' } = {}) {
  const headers = await resolveAiHeaders();
  const token = String(accessToken || readStoredSupabaseAccessToken()).trim();
  if (!token) {
    throw new Error('Sessao Supabase nao encontrada. Recarregue a pagina e faca login novamente.');
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch('/api/contest-templates', {
    method: 'POST',
    headers,
    body: JSON.stringify({ templateData, existingId }),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    const details = [data?.error, data?.details, data?.hint, data?.code ? `codigo ${data.code}` : '']
      .filter(Boolean)
      .join(' ');
    throw new Error(details || 'Nao foi possivel salvar o concurso pela API administrativa.');
  }

  return data.template;
}
