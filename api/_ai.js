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

export function enforceAiRateLimit(req, route = '', identity = '') {
  if (!envFlag('AI_RATE_LIMIT_ENABLED', true)) return;

  const windowMs = Math.max(60_000, Number(env('AI_RATE_LIMIT_WINDOW_MS')) || DEFAULT_AI_RATE_WINDOW_MS);
  const globalLimit = Math.max(1, Number(env('AI_RATE_LIMIT_MAX')) || DEFAULT_AI_RATE_LIMIT);
  const routeLimit = route === 'transcribe-essay'
    ? Math.max(1, Number(env('AI_TRANSCRIBE_RATE_LIMIT_MAX')) || 8)
    : globalLimit;
  const limit = Math.max(1, Math.min(globalLimit, routeLimit));
  const now = Date.now();
  const key = `${identity || `ip:${getClientIp(req)}`}:${route || 'ai'}`;
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
      if (raw.length > 20 * 1024 * 1024) {
        const error = httpError(413, 'Payload de IA muito grande.', 'Entrada muito grande para IA.');
        reject(error);
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
        reject(httpError(400, 'JSON invalido.', 'Payload invalido.'));
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

async function runGeminiWithPdf(prompt, pdfBase64) {
  const config = getAiConfig();
  if (!config.googleKey) throw new Error('GOOGLE_API_KEY/GEMINI_API_KEY nao configurada. PDF requer Gemini.');

  const payload = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.googleModel}:generateContent?key=${config.googleKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
            { text: `${prompt}\n\nResponda somente com JSON valido.` },
          ],
        }],
        generationConfig: { temperature: 0.25, responseMimeType: 'application/json' },
      }),
    }
  );

  const content = (payload?.candidates?.[0]?.content?.parts || []).map((part) => part?.text || '').join('\n');
  return { provider: 'gemini', model: config.googleModel, json: extractJson(content) };
}

async function runJson(prompt, options = {}) {
  const errors = [];
  const config = getAiConfig();
  let order = providerOrder(config);

  // preferFast: put Groq first (1-2s response), then others.
  // Used for time-sensitive endpoints (e.g. Vercel 10s hobby limit).
  if (options.preferFast && config.groqKey) {
    order = ['groq', ...order.filter((p) => p !== 'groq')];
  }

  for (const provider of order) {
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

export async function getPublicHealth() {
  const health = await getHealth();
  return {
    ok: Boolean(health.ok),
    service: health.service,
    status: health.ok ? 'online' : 'offline',
    authRequired: Boolean(health.authRequired),
    rateLimitEnabled: Boolean(health.rateLimitEnabled),
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

export async function generateDailyNote({ date = '', focus = '', targetContest = '', history = {} } = {}) {
  const prompt = `Crie uma frase diaria curta para um aluno de concurso publico.
Use tom acolhedor, premium e direto. Nao cite autores reais.

Contexto:
- Data local: ${date || new Date().toISOString().slice(0, 10)}
- Foco do aluno: ${focus || 'rotina de estudos'}
- Concurso alvo: ${targetContest || 'nao informado'}
- Minutos estudados na semana: ${Number(history?.weeklyMinutes || history?.minutes || 0)}
- Acuracia recente: ${Number(history?.accuracy || 0)}%

JSON esperado:
{"quote":"frase de ate 110 caracteres","author":"Papirando IA"}`;

  const result = await runJson(prompt, { schemaName: 'daily_note' });
  return {
    provider: result.provider,
    model: result.model,
    quote: String(result.json?.quote || '').trim().slice(0, 160),
    author: String(result.json?.author || 'Papirando IA').trim().slice(0, 40) || 'Papirando IA',
  };
}

export async function analyzeStudyStats({
  stats = {},
  bestDiscipline = null,
  weakestDiscipline = null,
  topicRows = [],
  redacaoSummary = {},
} = {}) {
  const prompt = `Leia as estatisticas de um aluno de concurso e devolva um diagnostico estrategico.
Se houver poucos dados, explique isso sem inventar desempenho.

Dados:
${JSON.stringify({ stats, bestDiscipline, weakestDiscipline, topicRows: topicRows.slice(0, 8), redacaoSummary }).slice(0, 9000)}

JSON esperado:
{"headline":"titulo curto","summary":"diagnostico em ate 2 frases","strong":"o que esta forte","attack":"o que pede reforco","nextMove":"proxima acao pratica","potential":"+valor percentual ou texto curto"}`;

  const result = await runJson(prompt, { schemaName: 'study_stats_insight' });
  return {
    provider: result.provider,
    model: result.model,
    headline: String(result.json?.headline || 'Diagnostico estrategico').trim(),
    summary: String(result.json?.summary || '').trim(),
    strong: String(result.json?.strong || '').trim(),
    attack: String(result.json?.attack || '').trim(),
    nextMove: String(result.json?.nextMove || '').trim(),
    potential: String(result.json?.potential || '').trim(),
  };
}

export async function generateMindMap({ course = '', disciplina = '', topico = '', topics = [], context = '' } = {}) {
  const source = String(`${course}\n${disciplina}\n${topico}\n${context}`).trim();
  if (!source) throw new Error('Selecione curso, disciplina ou topico para criar o mapa mental.');

  const prompt = `Monte um mapa mental para estudo de concurso publico.
Curso: ${course || 'Geral'}
Disciplina: ${disciplina || 'Nao informada'}
Topico central: ${topico || disciplina || course || 'Tema'}
Topicos disponiveis no app: ${JSON.stringify((Array.isArray(topics) ? topics : []).slice(0, 40))}

Regras:
- Nomes curtos, úteis para revisão visual.
- Inclua conceitos, excecoes, pegadinhas e uma trilha de revisao.
- Nao crie questoes; crie ramos de estudo.

JSON esperado:
{"title":"titulo do mapa","category":"categoria","branches":[{"label":"ramo principal","children":["subramo 1","subramo 2"]}]}`;

  const result = await runJson(prompt, { schemaName: 'mind_map' });
  const branches = (Array.isArray(result.json?.branches) ? result.json.branches : [])
    .map((branch, index) => ({
      id: `ai-branch-${index + 1}`,
      label: String(branch?.label || branch?.title || '').trim(),
      children: clampList(branch?.children, 6),
    }))
    .filter((branch) => branch.label)
    .slice(0, 8);

  if (branches.length === 0) throw new Error('A IA nao retornou ramos validos para o mapa.');

  return {
    provider: result.provider,
    model: result.model,
    title: String(result.json?.title || topico || disciplina || course || 'Mapa mental').trim(),
    category: String(result.json?.category || disciplina || 'Geral').trim(),
    branches,
  };
}

export async function analyzeContestCompatibility({
  baseContest = {},
  targetContests = [],
  comparison = {},
  userReadiness = {},
} = {}) {
  const targets = Array.isArray(targetContests) ? targetContests.slice(0, 2) : [];
  if (!baseContest?.nome || targets.length === 0) {
    throw new Error('Selecione os concursos para gerar o parecer de compatibilidade.');
  }

  const prompt = `Compare concursos para decidir se vale conciliar estudos.
Use os dados enviados; nao invente edital ausente.

Dados:
${JSON.stringify({ baseContest, targetContests: targets, comparison, userReadiness }).slice(0, 14000)}

JSON esperado:
{"headline":"veredito curto","summary":"analise executiva","advantages":["ganho"],"risks":["risco"],"plan":["acao pratica"],"decision":"vale conciliar|vale com cautela|nao conciliar agora"}`;

  const result = await runJson(prompt, { schemaName: 'contest_compatibility' });
  return {
    provider: result.provider,
    model: result.model,
    headline: String(result.json?.headline || '').trim(),
    summary: String(result.json?.summary || '').trim(),
    advantages: clampList(result.json?.advantages, 5),
    risks: clampList(result.json?.risks, 5),
    plan: clampList(result.json?.plan, 6),
    decision: String(result.json?.decision || '').trim(),
  };
}

// Shared post-processing for contest form results (text or PDF path).
function buildContestFormResponse(result) {
  const isUncertain = (value = '') => /n[aã]o tenho certeza|n[aã]o consta|n[aã]o encontrado|n[aã]o localizei|incerto|equivalente/i.test(String(value || ''));
  const normalizeCargoKey = (value = '') =>
    String(value || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  const extractMoney = (value = '') => {
    const matches = String(value || '').match(/R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}/g);
    return matches || [];
  };
  const pickSalaryForCargo = (salary = '', cargo = '') => {
    if (isUncertain(salary)) return '';
    const text = String(salary || '');
    const values = extractMoney(text);
    if (values.length <= 1) return values[0] || text.trim();
    const key = normalizeCargoKey(cargo);
    const lines = text.split(/\r?\n|\*/).map((line) => line.trim()).filter(Boolean);
    const matchedLine = lines.find((line) => {
      const normalized = normalizeCargoKey(line);
      if (!extractMoney(line).length) return false;
      if (/nivel superior|superior/.test(key) && /nivel superior|superior/.test(normalized)) return true;
      if (/nivel medio|medio|atendente/.test(key) && /nivel medio|medio|atendente/.test(normalized)) return true;
      return key.split(/[\s—-]+/).filter((part) => part.length > 4).some((part) => normalized.includes(part));
    });
    return extractMoney(matchedLine || '')[0] || values[0] || '';
  };
  const normalizeEducationForCargo = (education = '', cargo = '') => {
    const key = normalizeCargoKey(`${cargo} ${education}`);
    if (/nivel superior|superior|bacharel|diploma de curso superior/.test(key)) return 'Nível superior';
    if (/nivel medio|medio|ensino medio|atendente/.test(key)) return 'Nível médio';
    return isUncertain(education) ? '' : String(education || '').trim();
  };
  const normalizeVacancies = (value = '') => {
    if (isUncertain(value)) return '';
    const text = String(value || '').trim();
    const total = text.match(/\b(\d{1,5})\s+vagas?\s+totais?\b/i);
    if (total) return total[1];
    const firstNumber = text.match(/\b\d{1,5}\b/);
    return firstNumber ? firstNumber[0] : text;
  };
  const normalizeLocationForCargo = (location = '', cargo = '') => {
    if (isUncertain(location)) return '';
    const text = String(location || '').replace(/\s+/g, ' ').trim();
    const key = normalizeCargoKey(cargo);
    const normalized = normalizeCargoKey(text);
    if (/nivel superior|superior/.test(key) && /para nivel superior[^.]*salvador/.test(normalized)) return 'Salvador-BA';
    if (/salvador/.test(normalized) && /nivel superior|superior/.test(key)) return 'Salvador-BA';
    const firstSentence = text.split(/\.\s+/)[0]?.trim();
    return firstSentence || text;
  };
  const normalizeSubject = (subject = {}) => {
    const name = String(subject?.nome || subject?.name || '').trim();
    const normalizedName = normalizeCargoKey(name);
    if (/requisitos?|atribuicoes?|atribuições?|funcao|função/.test(normalizedName)) return null;
    const fallbackName = /nao se aplica|não se aplica/.test(normalizedName) ? 'Avaliação Curricular' : name;
    return {
      nome: fallbackName,
      topicos: clampList(subject?.topicos || subject?.topics, 160),
    };
  };
  const normalizeTemplate = (template = {}) => {
    const disciplinas = (Array.isArray(template.disciplinas) ? template.disciplinas : [])
      .map((subject) => normalizeSubject(subject))
      .filter((subject) => subject?.nome);
    return {
      nome: String(template.nome || '').trim(),
      plano: String(template.plano || '').trim(),
      concurso: String(template.concurso || '').trim(),
      area: String(template.area || 'Geral').trim(),
      cargo: String(template.cargo || '').trim(),
      banca: String(template.banca || '').trim(),
      salario: pickSalaryForCargo(template.salario, template.cargo),
      inscricao_valor: String(template.inscricao_valor || '').trim(),
      escolaridade: normalizeEducationForCargo(template.escolaridade, template.cargo),
      vagas: normalizeVacancies(template.vagas),
      lotacao: normalizeLocationForCargo(template.lotacao, template.cargo),
      etapas: String(template.etapas || '').trim(),
      etapas_tags: clampList(template.etapas_tags, 12),
      taf_itens: clampList(template.taf_itens, 20),
      descricao: String(template.descricao || '').trim(),
      status_concurso: String(template.status_concurso || 'suspeito').trim(),
      prova_data: String(template.prova_data || '').trim(),
      edital_url: String(template.edital_url || '').trim(),
      disciplinas,
    };
  };
  const rawTemplates = Array.isArray(result.json?.templates)
    ? result.json.templates
    : result.json?.template
      ? [result.json.template]
      : [result.json || {}];
  const templates = rawTemplates
    .map((t) => normalizeTemplate(t))
    .filter((t) => t.nome || t.cargo || t.disciplinas.length);
  return {
    provider: result.provider,
    source: result.provider,
    model: result.model,
    template: templates[0] || normalizeTemplate({}),
    templates,
    uncertainties: clampList(result.json?.uncertainties, 40),
    notes: clampList(result.json?.notes, 20),
  };
}

// Shared prompt body for both text and PDF analysis.
function contestFormPrompt(sourceBlock = '') {
  return `Voce e um especialista em editais de concursos publicos brasileiros. Analise o edital e gere templates de concurso para o Papirando.

REGRAS FUNDAMENTAIS:
1. Use SOMENTE as informacoes do edital. Nao invente dados, URLs, cores ou imagens.
2. Se um campo nao constar no edital, deixe-o vazio (nao use textos como "Nao encontrado").
3. Preserve TODOS os topicos e disciplinas encontrados no conteudo programatico.

IDENTIFICACAO DE MULTIPLOS CONCURSOS/CARGOS/AREAS:
- Crie um template separado para cada FUNCAO + AREA DE ATUACAO com conteudo de prova diferente.
- Quando o mesmo cargo aparece em multiplas cidades com o MESMO conteudo de prova, crie UM UNICO template e informe "Diversas cidades/UF" em lotacao. Nao crie um template por cidade.
- Quando o edital tem "Niveis" diferentes (Superior, Medio, Fundamental), cada nivel e um template separado.
- Quando ha disciplinas especificas para determinada area (ex: Ciencias Juridicas, Administracao), crie templates separados mesmo que o cargo-base seja o mesmo.
- Disciplines/conteudos descritos como "COMUNS A TODOS OS CARGOS" ou "CONHECIMENTOS BASICOS" devem ser incluidas em TODOS os templates do mesmo nivel.

EXEMPLOS DE SEPARACAO CORRETA:
- "Tecnico de Nivel Superior - Administracao" → 1 template
- "Tecnico de Nivel Superior - Ciencias Juridicas" → 1 template (conteudo diferente)
- "Tecnico de Nivel Superior - Atendente em Salvador, Alagoinhas e Juazeiro" → 1 template (mesmo conteudo, locacoes diferentes)
- "Tecnico de Nivel Medio - Atendente" → template separado do nivel superior

SELECAO DE ESTAGIOS E PROCESSOS SIMPLIFICADOS:
- Para selecao de estagiarios ou REDA (Regime Especial), o cargo field deve ter o titulo exato.
- Se nao houver prova objetiva/discursiva (so analise curricular ou titulos), use etapas_tags: ["avaliacao_curricular"] e coloque os criterios avaliados em uma disciplina "Avaliacao Curricular".

Regras de preenchimento de campos:
- nome: "Orgao — Processo/Edital — Area/Cargo especifico". Ex: "DETRAN-BA — REDA 01/2026 — Tecnico Superior Administracao".
- plano: orgao + area/cargo. Ex: "DETRAN-BA — Tecnico de Nivel Superior — Administracao".
- concurso: apenas o nome do orgao/concurso, sem duplicar area/cargo.
- cargo: o cargo/funcao exato do template. Ex: "Tecnico de Nivel Superior — Administracao".
- escolaridade: APENAS "Nivel medio" ou "Nivel superior" (derivado do requisito do cargo especifico).
- salario: somente o valor total do cargo especifico, formato "R$ 3.810,40". Sem beneficios ou outros cargos.
- vagas: total de vagas do cargo/area especifico. Ex: "10", "500 + CR". Para multiplas cidades, some o total.
- lotacao: cidade/estado principal. Se multiplas cidades, use "Diversas cidades/BA" ou o estado.
- etapas: uma frase curta descrevendo as fases. Ex: "Prova objetiva e avaliacao de titulos."
- disciplinas: SOMENTE o que a pessoa precisa ESTUDAR para passar na prova. Nao inclua "Requisitos" ou "Atribuicoes" como disciplina de estudo.

Campos de valores controlados:
- area: Policial | Agropecuaria | Tribunais | Fiscal | Controle | Legislativo | Administrativa | Educacao | Saude | Geral. Juridico/Direito = Tribunais.
- status_concurso: confirmado | previsto | suspeito | suspenso | encerrado.
- prova_data: YYYY-MM-DD (so quando a data estiver claramente informada).
- etapas_tags: prova_objetiva | prova_discursiva | redacao | taf | avaliacao_psicologica | investigacao_social | exames_medicos | toxicologico | heteroidentificacao | curso_formacao | avaliacao_curricular.

JSON esperado:
{"templates":[{"nome":"","plano":"","concurso":"","area":"","cargo":"","banca":"","salario":"","inscricao_valor":"","escolaridade":"","vagas":"","lotacao":"","etapas":"","etapas_tags":[],"taf_itens":[],"descricao":"","status_concurso":"","prova_data":"","edital_url":"","disciplinas":[{"nome":"","topicos":[""]}]}],"uncertainties":["campo e motivo da incerteza"],"notes":["observacao importante para revisao"]}
${sourceBlock}`;
}


export async function analyzeContestForm({ text = '', formText = '' } = {}) {
  const source = String(text || formText || '').trim();
  if (!source) throw new Error('Cole o formulario analisado do concurso para preencher o cadastro.');
  const prompt = contestFormPrompt('\nFormulario:\n' + source.slice(0, 20000));
  return buildContestFormResponse(await runJson(prompt, { schemaName: 'contest_form_template', preferFast: true }));
}

export async function analyzeContestPdf({ pdfBase64 = '' } = {}) {
  if (!pdfBase64) throw new Error('Envie um PDF do edital para analise.');
  const sizeBytes = Math.ceil((pdfBase64.length * 3) / 4);
  if (sizeBytes > 18 * 1024 * 1024) throw new Error('PDF muito grande. O limite e de 18 MB por envio.');

  const prompt = contestFormPrompt('\nO edital esta no PDF em anexo. Extraia todas as informacoes diretamente do documento.');
  const result = await runGeminiWithPdf(prompt, pdfBase64);
  return buildContestFormResponse(result);
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
{"analysis":{"overallScore":0,"criteria":{"gramatica":{"score":0,"maxScore":2.5,"note":"..."},"coesao":{"score":0,"maxScore":2.5,"note":"..."},"tema":{"score":0,"maxScore":2.5,"note":"..."},"estrutura":{"score":0,"maxScore":2.5,"note":"..."}},"summary":"parecer completo","strengths":["..."],"improvements":["..."],"priorityFixes":["..."],"actionPlan":["..."],"bancaFit":"como aproximar da banca","lineDiagnosis":"leitura de estrutura e linhas","grammarFeedback":[{"excerpt":"...","replacement":"...","reason":"..."}]}}

Redacao:
${source.slice(0, 12000)}`;

  const result = await runJson(prompt, { schemaName: 'essay_analysis' });
  return { provider: result.provider, source: result.provider, model: result.model, analysis: result.json?.analysis || result.json };
}

export async function transcribeEssayImage({ dataUrl = '', mimeType = '' } = {}) {
  const safeMimeType = String(mimeType || '').toLowerCase();
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(safeMimeType)) {
    throw new Error('Envie uma imagem valida para transcricao.');
  }
  if (!String(dataUrl || '').startsWith(`data:${safeMimeType};base64,`)) {
    throw new Error('Formato de imagem invalido.');
  }
  const base64 = String(dataUrl).split(',')[1] || '';
  if (!base64 || base64.length > 1_500_000) {
    throw new Error('Imagem muito grande para transcricao.');
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
