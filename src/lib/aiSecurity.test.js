/* global process */

import { describe, expect, it, afterEach } from 'vitest';

import { enforceAiRateLimit, generateFlashcards, getPublicHealth, transcribeEssayImage } from '../../api/_ai.js';

const savedEnv = {
  AI_RATE_LIMIT_ENABLED: process.env.AI_RATE_LIMIT_ENABLED,
  AI_RATE_LIMIT_MAX: process.env.AI_RATE_LIMIT_MAX,
  AI_TRANSCRIBE_RATE_LIMIT_MAX: process.env.AI_TRANSCRIBE_RATE_LIMIT_MAX,
  AI_RATE_LIMIT_WINDOW_MS: process.env.AI_RATE_LIMIT_WINDOW_MS,
  AI_PROVIDER: process.env.AI_PROVIDER,
  AI_FALLBACK_PROVIDER: process.env.AI_FALLBACK_PROVIDER,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
};
const savedFetch = globalThis.fetch;

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  delete globalThis.__papirandoAiRateLimit;
  globalThis.fetch = savedFetch;
});

describe('guardas de seguranca de IA', () => {
  it('nao expoe provider nem modelo no health publico', async () => {
    const health = await getPublicHealth();

    expect(health).toMatchObject({
      service: 'papirando-ai',
      authRequired: expect.any(Boolean),
      rateLimitEnabled: expect.any(Boolean),
    });
    expect(health).not.toHaveProperty('provider');
    expect(health).not.toHaveProperty('model');
    expect(health).not.toHaveProperty('fallbackProvider');
  });

  it('aplica limite especifico para transcricao de imagem', () => {
    process.env.AI_RATE_LIMIT_ENABLED = 'true';
    process.env.AI_RATE_LIMIT_MAX = '30';
    process.env.AI_TRANSCRIBE_RATE_LIMIT_MAX = '2';
    process.env.AI_RATE_LIMIT_WINDOW_MS = '60000';

    const req = {
      headers: { 'x-forwarded-for': '203.0.113.10' },
      socket: {},
    };

    expect(() => enforceAiRateLimit(req, 'transcribe-essay')).not.toThrow();
    expect(() => enforceAiRateLimit(req, 'transcribe-essay')).not.toThrow();
    expect(() => enforceAiRateLimit(req, 'transcribe-essay')).toThrow(/Rate limit/);
  });

  it('rejeita tipos de imagem nao permitidos antes de chamar provedor externo', async () => {
    await expect(
      transcribeEssayImage({
        mimeType: 'image/svg+xml',
        dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
      })
    ).rejects.toThrow(/imagem valida/i);
  });

  it('rejeita data URL inconsistente antes de chamar provedor externo', async () => {
    await expect(
      transcribeEssayImage({
        mimeType: 'image/png',
        dataUrl: 'data:image/jpeg;base64,aGVsbG8=',
      })
    ).rejects.toThrow(/formato de imagem/i);
  });

  it('usa Claude como provedor principal para geracao estruturada', async () => {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-6';
    let request;
    globalThis.fetch = async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({
        model: 'claude-sonnet-4-6',
        content: [{ type: 'text', text: '{"flashcards":[{"front":"Pergunta","back":"Resposta"}]}' }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    };

    const result = await generateFlashcards({ text: 'Direito administrativo', maxCards: 1 });

    expect(request.url).toBe('https://api.anthropic.com/v1/messages');
    expect(request.options.headers['x-api-key']).toBe('test-key');
    expect(JSON.parse(request.options.body)).toMatchObject({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user' }],
    });
    expect(result).toMatchObject({ provider: 'anthropic', model: 'claude-sonnet-4-6' });
    expect(result.flashcards).toEqual([{ frente: 'Pergunta', verso: 'Resposta' }]);
  });
});
