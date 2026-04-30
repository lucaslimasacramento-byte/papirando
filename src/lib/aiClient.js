import { analyzeEditalWithRealAI } from './editalAiClient';
import {
  DEV_LOCAL_AI_BASE_URL,
  getAiUnavailableMessage,
  resolveAiBaseUrl,
  resolveAiHeaders,
} from './aiRuntime';

async function parseJson(response) {
  return response.json().catch(() => ({}));
}

async function postJson(path, payload) {
  const baseUrl = resolveAiBaseUrl();
  if (!baseUrl) {
    throw new Error(getAiUnavailableMessage());
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: resolveAiHeaders(),
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
  const baseUrl = resolveAiBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      provider: 'offline',
      model: '',
      status: 'offline',
      ollamaUrl: '',
    };
  }

  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: resolveAiHeaders(),
    });
    const data = await parseJson(response);

    if (!response.ok) {
      return {
        ok: false,
        provider: 'offline',
        model: '',
        status: 'offline',
        ollamaUrl: '',
      };
    }

    const provider = String(data?.provider || 'offline').toLowerCase();
    return {
      ...data,
      ok: Boolean(data?.ok ?? true),
      provider,
      model: String(data?.model || '').trim(),
      status: provider === 'offline' ? 'offline' : 'online',
      ollamaUrl: provider === 'ollama' ? baseUrl || DEV_LOCAL_AI_BASE_URL : '',
    };
  } catch {
    return {
      ok: false,
      provider: 'offline',
      model: '',
      status: 'offline',
      ollamaUrl: '',
    };
  }
}
