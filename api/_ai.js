const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_AI_RATE_LIMIT = 30;
const DEFAULT_AI_RATE_WINDOW_MS = 10 * 60 * 1000;

function env(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function envFlag(name, fallback = true) {
  const raw = env(name, fallback ? 'true' : 'false').toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(raw);
}

export function getAiConfig() {
  const provider = env('AI_PROVIDER', env('VITE_AI_PROVIDER', 'auto')).toLowerCase();
  const fallbackProvider = env('AI_FALLBACK_PROVIDER', '').toLowerCase();
  return {
    provider,
    fallbackProvider,
    openAiKey: env('OPENAI_API_KEY'),
    openAiModel: env('OPENAI_MODEL', 'gpt-4.1-mini'),
    googleKey: env('GOOGLE_API_KEY') || env('GEMINI_API_KEY'),
    googleModel: env('GOOGLE_MODEL', 'gemini-2.0-flash'),
    openRouterKey: env('OPENROUTER_API_KEY'),
    openRouterModel: env('OPENROUTER_MODEL', 'google/gemini-2.0-flash-001'),
    groqKey: env('GROQ_API_KEY'),
    groqModel: env('GROQ_MODEL', 'llama-3.1-8b-instant'),
  };
}

export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

function httpError(status, message, publicMessage = message) {
  const error = new Error(message);
  error.status = status;
  error.publicMessage = publicMessage;
  return error;
}

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0]?.trim();
  return forwarded || String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown').trim();
}

function getSupabaseApiConfig() {
  const url = env('SUPABASE_URL', env('VITE_SUPABASE_URL')).replace(/\/+$/, '');
  const anonKey = env('SUPABASE_ANON_KEY', env('VITE_SUPABASE_ANON_KEY'));
  return { url, anonKey };
}

function normalizeBearerToken(value) {
  const token = String(value || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || token.length > 4096) return '';
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return '';
  return token;
}

export async function requireAiAuth(req) {
  if (!envFlag('AI_REQUIRE_AUTH', true)) return null;

  const token = normalizeBearerToken(req.headers.authorization);
  if (!token) {
    throw httpError(401, 'Sessao obrigatoria para usar IA.', 'Faca login para usar a IA.');
  }

  const { url, anonKey } = getSupabaseApiConfig();
  if (!url || !anonKey) {
    throw httpError(500, 'Supabase auth nao configurado para validar chamadas de IA.', 'IA indisponivel no momento.');
  }

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw httpError(401, `Supabase rejeitou token de IA (${response.status}).`, 'Sessao expirada. Faca login novamente.');
  }

  const user = await response.json().catch(() => null);
  if (!user?.id) {
    throw httpError(401, 'Token de IA sem usuario valido.', 'Sessao expirada. Faca login novamente.');
  }

  return user;
}

export function enforceAiRateLimit(req, route = '') {
  if (!envFlag('AI_RATE_LIMIT_ENABLED', true)) return;

  const windowMs = Math.max(60_000, Number(env('AI_RATE_LIMIT_WINDOW_MS')) || DEFAULT_AI_RATE_WINDOW_MS);
  const routeLimit = route === 'transcribe-essay' ? 8 : DEFAULT_AI_RATE_LIMIT;
  const limit = Math.max(1, Number(env('AI_RATE_LIMIT_MAX')) || routeLimit);
  const now = Date.now();
  const key = `${getClientIp(req)}:${route || 'ai'}`;
  const store = (globalThis.__papirandoAiRateLimit ||= new Map());
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  current.count += 1;
  if (current.count > limit) {
    throw httpError(429, `Rate limit de IA excedido para ${key}.`, 'Muitas chamadas de IA. Aguarde alguns minutos.');
  }

  if (store.size > 2000) {
    for (const [entryKey, entry] of store.entries()) {
      if (entry.resetAt <= now) store.delete(entryKey);
    }
  }
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('Payload muito grande.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON invalido.'));
      }
    });
    req.on('error', reject);
  });
}

export function handleOptions(req, res) {
  if (req.method !== 'OPTIONS') return false;
  sendJson(res, 204, {});
  return true;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let payload = {};

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }

    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.error ||
        payload?.message ||
        response.statusText ||
        'Falha no provedor de IA.';
      throw new Error(message);
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('A IA retornou uma resposta vazia.');

  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) return JSON.parse(fenced);

    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
  }

  throw new Error('A IA retornou uma resposta que nao e JSON valido.');
}

function providerOrder(config = getAiConfig()) {
  const preferred =
    ['openrouter', 'groq', 'openai', 'gemini'].includes(config.provider)
      ? config.provider
      : config.openRouterKey
        ? 'openrouter'
        : config.groqKey
          ? 'groq'
          : config.googleKey
        ? 'gemini'
        : config.openAiKey
          ? 'openai'
          : 'offline';

  return [
    ...new Set(
      [preferred, config.fallbackProvider, 'openrouter', 'groq', 'gemini', 'openai'].filter(
        (provider) => provider && provider !== 'offline'
      )
    ),
  ];
}

async function runOpenRouterJson(prompt, { schemaName = 'papirando_ai' } = {}) {
  const config = getAiConfig();
  if (!config.openRouterKey) throw new Error('OPENROUTER_API_KEY nao configurada.');

  const payload = await fetchJson('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openRouterKey}`,
      'HTTP-Referer': 'https://papirando.vercel.app',
      'X-Title': 'Papirando',
    },
    body: JSON.stringify({
      model: config.openRouterModel,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `Responda somente com JSON valido para ${schemaName}. Nao use markdown.` },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const content = payload?.choices?.[0]?.message?.content;
  return { provider: 'openrouter', model: payload?.model || config.openRouterModel, json: extractJson(content) };
}

async function runGroqJson(prompt, { schemaName = 'papirando_ai' } = {}) {
  const config = getAiConfig();
  if (!config.groqKey) throw new Error('GROQ_API_KEY nao configurada.');

  const payload = await fetchJson('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groqKey}`,
    },
    body: JSON.stringify({
      model: config.groqModel,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `Responda somente com JSON valido para ${schemaName}. Nao use markdown.` },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const content = payload?.choices?.[0]?.message?.content;
  return { provider: 'groq', model: payload?.model || config.groqModel, json: extractJson(content) };
}

async function runOpenAiJson(prompt, { schemaName = 'papirando_ai' } = {}) {
  const config = getAiConfig();
  if (!config.openAiKey) throw new Error('OPENAI_API_KEY nao configurada.');

  const payload = await fetchJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openAiKey}`,
    },
    body: JSON.stringify({
      model: config.openAiModel,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `Responda somente com JSON valido para ${schemaName}. Nao use markdown.` },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const content = payload?.choices?.[0]?.message?.content;
  return { provider: 'openai', model: payload?.model || config.openAiModel, json: extractJson(content) };
}

async function runGeminiJson(prompt) {
  const config = getAiConfig();
  if (!config.googleKey) throw new Error('GOOGLE_API_KEY/GEMINI_API_KEY nao configurada.');

  const payload = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.googleModel}:generateContent?key=${config.googleKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nResponda somente com JSON valido.` }] }],
        generationConfig: { temperature: 0.25, responseMimeType: 'application/json' },
      }),
    }
  );

  const content = (payload?.candidates?.[0]?.content?.parts || []).map((part) => part?.text || '').join('\n');
  return { provider: 'gemini', model: config.googleModel, json: extractJson(content) };
}

async function runJson(prompt, options = {}) {
  const errors = [];

  for (const provider of providerOrder()) {
    try {
      if (provider === 'openrouter') return await runOpenRouterJson(prompt, options);
      if (provider === 'groq') return await runGroqJson(prompt, options);
      if (provider === 'gemini') return await runGeminiJson(prompt, options);
      if (provider === 'openai') return await runOpenAiJson(prompt, options);
    } catch (error) {
      errors.push(`[${provider}] ${error.message}`);
    }
  }

  throw new Error(`Nao foi possivel obter resposta de IA. ${errors.join(' | ')}`);
}

function clampList(items, max) {
  return (Array.isArray(items) ? items : []).map((item) => String(item || '').trim()).filter(Boolean).slice(0, max);
}

export async function getHealth() {
  const config = getAiConfig();
  const order = providerOrder(config);
  return {
    ok: Boolean(config.openRouterKey || config.groqKey || config.googleKey || config.openAiKey),
    service: 'papirando-ai',
    provider: order[0] || 'offline',
    model:
      order[0] === 'openrouter'
        ? config.openRouterModel
        : order[0] === 'groq'
          ? config.groqModel
          : order[0] === 'openai'
        ? config.openAiModel
        : order[0] === 'gemini'
          ? config.googleModel
          : '',
    fallbackProvider: config.fallbackProvider || '',
    authRequired: envFlag('AI_REQUIRE_AUTH', true),
    rateLimitEnabled: envFlag('AI_RATE_LIMIT_ENABLED', true),
  };
}

export async function generateFlashcards({
  text = '',
  conteudo = '',
  disciplina = '',
  topico = '',
  maxCards,
  quantidade,
} = {}) {
  const source = String(text || conteudo || `${disciplina}\n${topico}`).trim();
  const count = Math.min(Math.max(Number(maxCards || quantidade) || 10, 1), 30);
  if (!source) throw new Error('Envie texto, disciplina ou topico para gerar flashcards.');

  const prompt = `Voce e um professor de concursos publicos brasileiros.
Gere exatamente ${count} flashcards de pergunta e resposta.
${disciplina ? `Disciplina: ${disciplina}` : ''}
${topico ? `Topico: ${topico}` : ''}

Regras:
- Perguntas objetivas, no estilo de prova.
- Respostas curtas e corretas.
- Priorize conceitos, excecoes, prazos, listas e pegadinhas.

JSON esperado:
{"cards":[{"front":"pergunta","back":"resposta"}]}

Conteudo:
${source.slice(0, 7000)}`;

  const result = await runJson(prompt, { schemaName: 'flashcards' });
  const rawCards = Array.isArray(result.json?.cards)
    ? result.json.cards
    : Array.isArray(result.json?.flashcards)
      ? result.json.flashcards
      : Array.isArray(result.json)
        ? result.json
        : [];
  const cards = rawCards
    .map((card) => ({
      front: String(card?.front || card?.frente || '').trim(),
      back: String(card?.back || card?.verso || '').trim(),
    }))
    .filter((card) => card.front && card.back)
    .slice(0, count);

  if (cards.length === 0) throw new Error('A IA nao gerou flashcards validos.');

  return {
    provider: result.provider,
    model: result.model,
    cards,
    flashcards: cards.map((card) => ({ frente: card.front, verso: card.back })),
  };
}

export async function explainQuestion(payload = {}) {
  const enunciado = String(payload.enunciado || payload.statement || '').trim();
  if (!enunciado) throw new Error('Envie o enunciado da questao para explicar.');

  const prompt = `Explique uma questao de concurso publico brasileiro.

Enunciado:
${enunciado}

Alternativas:
${JSON.stringify(payload.alternativas || payload.options || [])}

Gabarito: ${payload.gabarito || payload.answer || ''}
Resposta do usuario: ${payload.resposta_usuario || payload.userAnswer || ''}

JSON esperado:
{"isCorrect":true,"answer":"alternativa correta","explanation":"explicacao objetiva","keyConcepts":["conceito"],"studyTip":"como revisar"}`;

  const result = await runJson(prompt, { schemaName: 'question_explanation' });
  return {
    provider: result.provider,
    model: result.model,
    isCorrect: Boolean(result.json?.isCorrect),
    answer: String(result.json?.answer || '').trim(),
    explanation: String(result.json?.explanation || '').trim(),
    keyConcepts: clampList(result.json?.keyConcepts, 8),
    studyTip: String(result.json?.studyTip || '').trim(),
  };
}

export async function summarizeTopic({ text = '', topico = '', disciplina = '' } = {}) {
  const source = String(text || '').trim();
  if (!source) throw new Error('Envie o texto para resumir.');

  const prompt = `Resuma este conteudo para estudo de concurso.
${disciplina ? `Disciplina: ${disciplina}` : ''}
${topico ? `Topico: ${topico}` : ''}

JSON esperado:
{"summary":"resumo em ate 4 paragrafos","keyPoints":["ponto-chave"],"reviewQuestions":["pergunta de revisao"]}

Conteudo:
${source.slice(0, 8000)}`;

  const result = await runJson(prompt, { schemaName: 'topic_summary' });
  return {
    provider: result.provider,
    model: result.model,
    summary: String(result.json?.summary || '').trim(),
    keyPoints: clampList(result.json?.keyPoints, 10),
    reviewQuestions: clampList(result.json?.reviewQuestions, 8),
  };
}

export async function analyzeEdital(editalText = '') {
  const text = String(editalText || '').trim();
  if (!text) throw new Error('Cole ou envie um edital para analise.');

  const prompt = `Analise este edital de concurso e extraia cargos, disciplinas e topicos.
Mantenha nomes em portugues e evite inventar dados ausentes.

JSON esperado:
{"analysis":{"banca":"nome ou Nao encontrado","exam_name":"nome do concurso","organization":"orgao","exam_type":"tipo","dates":{"publication_date":"data ou Nao encontrado","exam_date":"data ou Nao encontrado","registration_period":"periodo ou Nao encontrado"},"contests":[{"id":"slug","title":"titulo","role_name":"cargo","institution":"orgao","exam_date":"data ou Nao encontrado","publication_date":"data ou Nao encontrado","registration_period":"periodo ou Nao encontrado","subjects":[{"name":"disciplina","topics":["topico"]}]}]}}

Edital:
${text.slice(0, 24000)}`;

  const result = await runJson(prompt, { schemaName: 'edital_analysis' });
  const analysis = result.json?.analysis || result.json || {};
  return {
    provider: result.provider,
    source: result.provider,
    model: result.model,
    analysis: {
      banca: String(analysis.banca || 'Nao encontrado').trim(),
      exam_name: String(analysis.exam_name || 'Nao encontrado').trim(),
      organization: String(analysis.organization || 'Nao encontrado').trim(),
      exam_type: String(analysis.exam_type || 'Nao encontrado').trim(),
      dates: {
        publication_date: String(analysis?.dates?.publication_date || 'Nao encontrado').trim(),
        exam_date: String(analysis?.dates?.exam_date || 'Nao encontrado').trim(),
        registration_period: String(analysis?.dates?.registration_period || 'Nao encontrado').trim(),
      },
      contests: (Array.isArray(analysis.contests) ? analysis.contests : []).map((contest, index) => ({
        id: String(contest?.id || contest?.role_name || `opcao-${index + 1}`).trim(),
        title: String(contest?.title || contest?.role_name || `Opcao ${index + 1}`).trim(),
        role_name: String(contest?.role_name || contest?.title || '').trim(),
        institution: String(contest?.institution || analysis.organization || 'Nao encontrado').trim(),
        exam_date: String(contest?.exam_date || analysis?.dates?.exam_date || 'Nao encontrado').trim(),
        publication_date: String(contest?.publication_date || analysis?.dates?.publication_date || 'Nao encontrado').trim(),
        registration_period: String(
          contest?.registration_period || analysis?.dates?.registration_period || 'Nao encontrado'
        ).trim(),
        subjects: (Array.isArray(contest?.subjects) ? contest.subjects : [])
          .map((subject) => ({
            name: String(subject?.name || '').trim(),
            topics: clampList(subject?.topics, 80),
          }))
          .filter((subject) => subject.name),
      })),
    },
  };
}

export async function analyzeEssay({ text = '', tema = '', banca = '' } = {}) {
  const source = String(text || '').trim();
  if (!source) throw new Error('Envie o texto da redacao para correcao.');

  const prompt = `Corrija uma redacao para concurso.
Tema: ${tema || 'Nao informado'}
Banca: ${banca || 'Nao informada'}

JSON esperado:
{"analysis":{"overallScore":0,"criteria":{"gramatica":{"score":0,"maxScore":2.5,"note":"..."},"coesao":{"score":0,"maxScore":2.5,"note":"..."},"tema":{"score":0,"maxScore":2.5,"note":"..."},"estrutura":{"score":0,"maxScore":2.5,"note":"..."}},"summary":"...","strengths":["..."],"improvements":["..."],"grammarFeedback":[{"excerpt":"...","replacement":"...","reason":"..."}]}}

Redacao:
${source.slice(0, 12000)}`;

  const result = await runJson(prompt, { schemaName: 'essay_analysis' });
  return { provider: result.provider, source: result.provider, model: result.model, analysis: result.json?.analysis || result.json };
}

export async function transcribeEssayImage({ dataUrl = '', mimeType = '' } = {}) {
  if (!dataUrl || !String(mimeType).startsWith('image/')) {
    throw new Error('Envie uma imagem valida para transcricao.');
  }

  const config = getAiConfig();
  if (config.openRouterKey) {
    const payload = await fetchJson('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openRouterKey}`,
        'HTTP-Referer': 'https://papirando.vercel.app',
        'X-Title': 'Papirando',
      },
      body: JSON.stringify({
        model: config.openRouterModel,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Transcreva fielmente esta redacao. Responda em JSON: {"text":"transcricao"}' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    const content = payload?.choices?.[0]?.message?.content;
    const parsed = extractJson(content);
    return {
      provider: 'openrouter',
      source: 'openrouter',
      sourceLabel: 'OpenRouter',
      model: payload?.model || config.openRouterModel,
      text: String(parsed?.text || '').trim(),
    };
  }

  if (!config.googleKey) {
    throw new Error('Transcricao de imagem requer GOOGLE_API_KEY/GEMINI_API_KEY configurada.');
  }

  const base64 = String(dataUrl).split(',')[1] || '';
  const payload = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.googleModel}:generateContent?key=${config.googleKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Transcreva fielmente esta redacao. Responda em JSON: {"text":"transcricao"}' },
              { inlineData: { mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      }),
    }
  );

  const content = (payload?.candidates?.[0]?.content?.parts || []).map((part) => part?.text || '').join('\n');
  const parsed = extractJson(content);
  return {
    provider: 'gemini',
    source: 'gemini',
    sourceLabel: 'Gemini',
    model: config.googleModel,
    text: String(parsed?.text || '').trim(),
  };
}
