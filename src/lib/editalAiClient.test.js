import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./aiRuntime', () => ({
  resolveAiBaseUrl: () => 'https://papirando.test',
  resolveAiHeaders: async () => ({ 'Content-Type': 'application/json' }),
}));

import { analyzeEditalWithRealAI } from './editalAiClient';

function respondeCom({ status, body }) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// Quando a função da Vercel é morta por tempo, o corpo não é o nosso JSON e sim uma página
// de erro da plataforma. A mensagem antiga descartava o status e dizia só "formato
// inválido" — que não distingue estouro de tempo, arquivo grande e função quebrada, e
// mandou o dono investigar a causa errada.
describe('analyzeEditalWithRealAI — resposta que nao e JSON', () => {
  it('informa o status HTTP', async () => {
    respondeCom({ status: 500, body: '<html>Internal Server Error</html>' });
    await expect(analyzeEditalWithRealAI('edital')).rejects.toThrow(/HTTP 500/);
  });

  it('explica o estouro de tempo num 504', async () => {
    respondeCom({ status: 504, body: 'An error occurred with your deployment' });
    await expect(analyzeEditalWithRealAI('edital')).rejects.toThrow(/tempo limite/i);
  });

  it('repassa o codigo de erro da plataforma', async () => {
    respondeCom({ status: 500, body: 'FUNCTION_INVOCATION_TIMEOUT' });
    const erro = await analyzeEditalWithRealAI('edital').catch((e) => e);
    expect(erro.message).toContain('FUNCTION_INVOCATION_TIMEOUT');
    expect(erro.message).toMatch(/tempo limite/i);
  });

  it('aponta o tamanho num 413', async () => {
    respondeCom({ status: 413, body: 'Request Entity Too Large' });
    await expect(analyzeEditalWithRealAI('edital')).rejects.toThrow(/grande demais/i);
  });
});

// Resposta 4xx com JSON nosso continua mostrando a mensagem publica e o detalhe tecnico.
describe('analyzeEditalWithRealAI — erro em JSON do proprio backend', () => {
  it('junta error e detail', async () => {
    respondeCom({
      status: 502,
      body: JSON.stringify({ error: 'A IA nao respondeu.', detail: 'O provedor demorou demais.' }),
    });
    await expect(analyzeEditalWithRealAI('edital')).rejects.toThrow(
      'A IA nao respondeu. — O provedor demorou demais.'
    );
  });
});
