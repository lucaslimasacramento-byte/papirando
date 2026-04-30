const DEV_LOCAL_AI_BASE_URL = 'http://127.0.0.1:8787';

export function resolveAiBaseUrl() {
  const envBase =
    typeof import.meta !== 'undefined' && import.meta?.env?.VITE_AI_SERVER_URL
      ? String(import.meta.env.VITE_AI_SERVER_URL).trim()
      : '';

  if (envBase) return envBase.replace(/\/+$/, '');
  if (typeof import.meta !== 'undefined' && import.meta?.env?.DEV) return DEV_LOCAL_AI_BASE_URL;
  return '';
}

export function resolveAiHeaders() {
  const token =
    typeof import.meta !== 'undefined' && import.meta?.env?.VITE_AI_SERVER_TOKEN
      ? String(import.meta.env.VITE_AI_SERVER_TOKEN).trim()
      : '';

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getAiUnavailableMessage() {
  return 'Servidor de IA não configurado neste ambiente. Defina VITE_AI_SERVER_URL para Preview/Production.';
}

export { DEV_LOCAL_AI_BASE_URL };
