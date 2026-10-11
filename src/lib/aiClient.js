import { analyzeEditalWithRealAI } from './editalAiClient';
import { resolveAiBaseUrl, resolveAiHeaders } from './aiRuntime';
import { convidarParaAssinar } from './convite';

// O nome da acao, para o convite falar do que o aluno acabou de tentar fazer. "Gerar
// questoes faz parte do Papiro" diz muito mais do que "Recurso premium": ele acabou de
// querer exatamente aquilo. Rota sem nome aqui cai no texto generico.
const ACOES_DE_IA = {
  '/api/ai/generate-flashcards': 'Gerar flashcards',
  '/api/ai/analyze-essay': 'Corrigir redação',
  '/api/ai/transcribe-essay': 'Transcrever a redação',
  '/api/ai/explain-question': 'Explicar a questão',
  '/api/ai/summarize-topic': 'Resumir o tópico',
  '/api/ai/generate-mind-map': 'Gerar mapa mental',
  '/api/ai/generate-schedule': 'Montar o cronograma',
  '/api/ai/analyze-edital': 'Ler o edital',
  '/api/ai/study-stats-insight': 'Analisar suas estatísticas',
  '/api/ai/contest-compatibility': 'Comparar concursos',
  '/api/ai/daily-note': 'Gerar a nota do dia',
};

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
    // 402 = o servidor barrou por falta de assinatura (ver enforceAiPlan em api/_ai.js).
    //
    // Interceptar aqui, e nao em cada pagina, cobre TODAS as rotas de IA de uma vez —
    // inclusive as que ainda nao existem. E, principalmente, troca o que o aluno recebe:
    // em vez de uma mensagem de erro, um convite. Nada quebrou; o periodo de cortesia
    // acabou, e o que falta e uma decisao dele.
    if (response.status === 402) {
      convidarParaAssinar({ acao: ACOES_DE_IA[path] || '' });
      // A mensagem ainda sobe porque cada pagina trata a falha do seu jeito e algumas a
      // exibem. Entao ela tambem e convite, nunca "erro": se aparecer num canto da tela,
      // continua dizendo a coisa certa.
      throw new Error(data?.error || 'Isso faz parte do Papiro. Assine para continuar.');
    }
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
