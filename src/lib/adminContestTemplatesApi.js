import { resolveAiHeaders } from './aiRuntime';

async function parseJson(response) {
  return response.json().catch(() => ({}));
}

export async function saveContestTemplateAdmin({ templateData, existingId = null } = {}) {
  const response = await fetch('/api/contest-templates', {
    method: 'POST',
    headers: await resolveAiHeaders(),
    body: JSON.stringify({ templateData, existingId }),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error || 'Nao foi possivel salvar o concurso pela API administrativa.');
  }

  return data.template;
}
