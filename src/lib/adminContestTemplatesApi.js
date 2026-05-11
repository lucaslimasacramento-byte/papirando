import { resolveAiHeaders } from './aiRuntime';

async function parseJson(response) {
  return response.json().catch(() => ({}));
}

export async function saveContestTemplateAdmin({ templateData, existingId = null, accessToken = '' } = {}) {
  const headers = await resolveAiHeaders();
  const token = String(accessToken || '').trim();
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
