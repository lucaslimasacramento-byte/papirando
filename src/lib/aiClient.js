import { analyzeEditalWithRealAI } from './editalAiClient';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8787';

function resolveBaseUrl() {
  const envBase =
    typeof import.meta !== 'undefined' && import.meta?.env?.VITE_AI_SERVER_URL
      ? String(import.meta.env.VITE_AI_SERVER_URL).trim()
      : '';

  return envBase || DEFAULT_BASE_URL;
}

async function parseJson(response) {
  return response.json().catch(() => ({}));
}

async function postJson(path, payload) {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error || 'Falha ao conectar com o servidor de IA.');
  }

  return data;
}

export async function analyzeEdital(editalText) {
  return analyzeEditalWithRealAI(editalText);
}

export async function generateFlashcards({ disciplina, topico, conteudo = '', quantidade = 10 }) {
  return postJson('/api/generate-flashcards', {
    disciplina,
    topico,
    conteudo,
    text: conteudo,
    quantidade,
    maxCards: quantidade,
  });
}

export async function explainQuestion({ enunciado, alternativas, gabarito, resposta_usuario }) {
  return postJson('/api/explain-question', {
    enunciado,
    alternativas,
    gabarito,
    resposta_usuario,
  });
}

export async function checkAiHealth() {
  try {
    const response = await fetch(`${resolveBaseUrl()}/api/health`);
    const data = await parseJson(response);

    if (!response.ok) {
      return {
        ok: false,
        provider: 'offline',
        model: '',
        status: 'offline',
        ollamaUrl: DEFAULT_BASE_URL,
      };
    }

    const provider = String(data?.provider || 'offline').toLowerCase();
    return {
      ...data,
      ok: Boolean(data?.ok ?? true),
      provider,
      model: String(data?.model || '').trim(),
      status: provider === 'offline' ? 'offline' : 'online',
      ollamaUrl: provider === 'ollama' ? DEFAULT_BASE_URL : '',
    };
  } catch {
    return {
      ok: false,
      provider: 'offline',
      model: '',
      status: 'offline',
      ollamaUrl: DEFAULT_BASE_URL,
    };
  }
}
