import {
  analyzeEdital,
  analyzeEssay,
  analyzeContestCompatibility,
  analyzeContestForm,
  analyzeContestPdf,
  analyzeStudyStats,
  explainQuestion,
  generateDailyNote,
  generateFlashcards,
  generateInstagramCaption,
  generateMindMap,
  generateStudySchedule,
  getPublicHealth,
  handleOptions,
  enforceAiRateLimit,
  enforceAiPlan,
  readJson,
  requireAiAuth,
  sendJson,
  summarizeTopic,
  transcribeEssayImage,
} from './_ai.js';

// PDFs enviados como base64 podem chegar a ~18 MB — aumenta o limite do body parser.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

function routeFromRequest(req) {
  const url = new URL(req.url || '/api/ai', 'http://127.0.0.1');
  const routeParam = String(url.searchParams.get('route') || '').trim();
  if (routeParam) return routeParam.replace(/^\/+/, '').replace(/\/+$/, '');

  return url.pathname.replace(/^\/api\/ai\/?/, '').replace(/\/+$/, '') || 'health';
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const route = routeFromRequest(req);

  try {
    if (req.method === 'GET' && route === 'health') {
      return sendJson(res, 200, await getPublicHealth());
    }

    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Metodo nao permitido.' });
    }

    enforceAiRateLimit(req, route);
    const user = await requireAiAuth(req);
    if (user?.id) enforceAiRateLimit(req, route, `user:${user.id}`);
    await enforceAiPlan(req);

    const body = await readJson(req);

    if (route === 'generate-flashcards') {
      return sendJson(res, 200, await generateFlashcards(body));
    }

    if (route === 'daily-note') {
      return sendJson(res, 200, await generateDailyNote(body));
    }

    if (route === 'instagram-caption') {
      return sendJson(res, 200, await generateInstagramCaption(body));
    }

    if (route === 'study-stats-insight') {
      return sendJson(res, 200, await analyzeStudyStats(body));
    }

    if (route === 'generate-mind-map') {
      return sendJson(res, 200, await generateMindMap(body));
    }

    if (route === 'generate-schedule') {
      return sendJson(res, 200, await generateStudySchedule(body));
    }

    if (route === 'contest-compatibility') {
      return sendJson(res, 200, await analyzeContestCompatibility(body));
    }

    if (route === 'contest-form') {
      return sendJson(res, 200, await analyzeContestForm(body));
    }

    if (route === 'contest-form-pdf') {
      return sendJson(res, 200, await analyzeContestPdf(body));
    }

    if (route === 'analyze-edital') {
      return sendJson(res, 200, await analyzeEdital(body?.editalText || body?.text || ''));
    }

    if (route === 'explain-question') {
      return sendJson(res, 200, await explainQuestion(body));
    }

    if (route === 'summarize-topic') {
      return sendJson(res, 200, await summarizeTopic(body));
    }

    if (route === 'analyze-essay') {
      return sendJson(res, 200, await analyzeEssay(body));
    }

    if (route === 'transcribe-essay') {
      return sendJson(res, 200, await transcribeEssayImage(body));
    }

    return sendJson(res, 404, { error: 'Rota de IA nao encontrada.' });
  } catch (error) {
    const status = Number(error.status || 500);
    console.error('[api/ai]', {
      route,
      status,
      message: error.message || 'Falha interna na IA.',
    });
    return sendJson(res, status, {
      error:
        error.publicMessage ||
        (status >= 500 ? 'Falha temporaria no servico de IA.' : error.message || 'Falha na requisicao de IA.'),
    });
  }
}
