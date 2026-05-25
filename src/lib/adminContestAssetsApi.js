import { supabase } from './supabase';

async function parseJson(response) {
  return response.json().catch(() => ({}));
}

async function getAdminToken() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || '';
  } catch {
    return '';
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',').pop() : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Nao foi possivel ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadContestAssetAdmin({ file, kind, existingUrl = '', adminEmail = '' } = {}) {
  if (!file) throw new Error('Selecione um arquivo antes de enviar.');

  const token = await getAdminToken();
  const fileBase64 = await fileToBase64(file);
  const response = await fetch('/api/contest-assets', {
    method: 'POST',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      kind,
      fileName: file.name || 'arquivo',
      contentType: file.type || '',
      fileBase64,
      existingUrl,
      adminEmail,
    }),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    const details = [data?.error, data?.details, data?.code ? `codigo ${data.code}` : '']
      .filter(Boolean)
      .join(' ');
    throw new Error(details || 'Nao foi possivel enviar o arquivo.');
  }

  return data.url;
}
