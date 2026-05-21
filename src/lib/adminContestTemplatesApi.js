async function parseJson(response) {
  return response.json().catch(() => ({}));
}

export async function saveContestTemplateAdmin({ templateData, existingId = null, adminEmail = '' } = {}) {
  const response = await fetch('/api/contest-templates', {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateData, existingId, adminEmail }),
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
