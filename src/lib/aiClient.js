import { analyzeEditalWithRealAI } from './editalAiClient';
import { resolveAiBaseUrl, resolveAiHeaders } from './aiRuntime';

export const AI_ENABLED = import.meta.env.VITE_AI_ENABLED === 'true';
const ERR_DISABLED = 'Funcionalidade de IA desabilitada neste ambiente.';

async function parseJson(response) {
  return response.json().catch(() => ({}));
}

async function postJson(path, payload) {
  const baseUrl = resolveAiBaseUrl();

  let response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55_000); // 55s client timeout
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: await resolveAiHeaders(),
        body: JSON.stringify(payload || {}),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (networkErr) {
    if (networkErr?.name === 'AbortError') {
      throw new Error('A IA demorou demais para responder. Tente novamente em instantes ou com um conteúdo menor.');
    }
    throw new Error(`Sem conexao com o servidor de IA (${networkErr?.message || 'network error'}).`);
  }

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error || `Erro ${response.status} no servidor de IA.`);
  }

  return data;
}

export async function analyzeEdital(editalText) {
  if (!AI_ENABLED) throw new Error(ERR_DISABLED);
  return analyzeEditalWithRealAI(editalText);
}

export async function generateFlashcards({ disciplina, topico, conteudo = '', quantidade = 10 }) {
  if (!AI_ENABLED) throw new Error(ERR_DISABLED);
  return postJson('/api/ai/generate-flashcards', {
    disciplina,
    topico,
    conteudo,
    text: conteudo,
    quantidade,
    maxCards: quantidade,
  });
}

export async function generateDailyNote(payload = {}) {
  if (!AI_ENABLED) throw new Error(ERR_DISABLED);
  return postJson('/api/ai/daily-note', payload);
}

export async function analyzeStudyStats(payload = {}) {
  if (!AI_ENABLED) throw new Error(ERR_DISABLED);
  return postJson('/api/ai/study-stats-insight', payload);
}

export async function generateMindMap(payload = {}) {
  if (!AI_ENABLED) throw new Error(ERR_DISABLED);
  return postJson('/api/ai/generate-mind-map', payload);
}

export async function analyzeContestCompatibility(payload = {}) {
  if (!AI_ENABLED) throw new Error(ERR_DISABLED);
  return postJson('/api/ai/contest-compatibility', payload);
}

export async function analyzeContestForm(payload = {}) {
  if (!AI_ENABLED) throw new Error(ERR_DISABLED);
  return postJson('/api/ai/contest-form', payload);
}

export async function analyzeContestPdf(pdfBase64 = '') {
  if (!AI_ENABLED) throw new Error(ERR_DISABLED);
  return postJson('/api/ai/contest-form-pdf', { pdfBase64 });
}

export async function explainQuestion({ enunciado, alternativas, gabarito, resposta_usuario }) {
  if (!AI_ENABLED) throw new Error(ERR_DISABLED);
  return postJson('/api/ai/explain-question', {
    enunciado,
    alternativas,
    gabarito,
    resposta_usuario,
  });
}

export async function checkAiHealth() {
  if (!AI_ENABLED) return { ok: false, provider: 'disabled', model: '', status: 'disabled' };
  const baseUrl = resolveAiBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/api/ai/health`, {
      headers: await resolveAiHeaders(),
    });
    const data = await parseJson(response);

    if (!response.ok) {
      return {
        ok: false,
        provider: 'offline',
        model: '',
        status: 'offline',
      };
    }

    const status = String(data?.status || (data?.ok ? 'online' : 'offline')).toLowerCase();
    const provider = String(data?.provider || (status === 'online' ? 'gateway' : 'offline')).toLowerCase();
    return {
      ...data,
      ok: Boolean(data?.ok ?? true),
      provider,
      model: String(data?.model || '').trim(),
      status: status === 'online' ? 'online' : 'offline',
    };
  } catch {
    return {
      ok: false,
      provider: 'offline',
      model: '',
      status: 'offline',
    };
  }
}
