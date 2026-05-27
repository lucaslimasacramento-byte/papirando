/* global process */

import { describe, expect, it, afterEach } from 'vitest';

import { enforceAiRateLimit, getPublicHealth, transcribeEssayImage } from '../../api/_ai.js';

const savedEnv = {
  AI_RATE_LIMIT_ENABLED: process.env.AI_RATE_LIMIT_ENABLED,
  AI_RATE_LIMIT_MAX: process.env.AI_RATE_LIMIT_MAX,
  AI_TRANSCRIBE_RATE_LIMIT_MAX: process.env.AI_TRANSCRIBE_RATE_LIMIT_MAX,
  AI_RATE_LIMIT_WINDOW_MS: process.env.AI_RATE_LIMIT_WINDOW_MS,
};

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  delete globalThis.__papirandoAiRateLimit;
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
});
