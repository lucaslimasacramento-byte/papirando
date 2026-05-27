import {
  enforceAiRateLimit,
  generateInstagramCaption,
  handleOptions,
  readJson,
  requireAiAuth,
  sendJson,
} from '../_ai.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Metodo nao permitido.' });

  try {
    enforceAiRateLimit(req, 'instagram-caption');
    const user = await requireAiAuth(req);
    if (user?.id) enforceAiRateLimit(req, 'instagram-caption', `user:${user.id}`);
    const body = await readJson(req);
    return sendJson(res, 200, await generateInstagramCaption(body));
  } catch (error) {
    const status = Number(error.status || 500);
    console.error('[ai/instagram-caption]', { status, message: error.message });
    return sendJson(res, status, {
      error: error.publicMessage || error.message || 'Falha ao gerar legenda para Instagram.',
    });
  }
}
