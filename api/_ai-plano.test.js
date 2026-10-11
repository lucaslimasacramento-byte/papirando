import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enforceAiPlan } from './_ai.js';

// O enforcement de plano no servidor e o unico que vale dinheiro: o portao da interface e
// conveniencia, e qualquer um pode chamar /api/ai direto com um token valido. Estes testes
// travam as duas falhas caras e opostas — deixar passar quem nao assina, e barrar quem
// assina.

const AMBIENTE = { ...process.env };

// Formato de JWT de verdade: normalizeBearerToken descarta qualquer coisa fora de
// `xxx.yyy.zzz`, e com um token falso simples estes testes passavam sem nunca chegar a
// consultar o plano — verdes pelo motivo errado.
function req(token = 'cabecalho.carga.assinatura') {
  return { headers: { authorization: `Bearer ${token}` } };
}

// A consulta ao plano e um POST para /rest/v1/rpc/is_premium_user.
function responderPlano(premium) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => premium,
  }));
}

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://projeto.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon';
  process.env.AI_ENFORCE_PLAN = 'true';
});

afterEach(() => {
  process.env = { ...AMBIENTE };
  vi.restoreAllMocks();
});

describe('enforceAiPlan', () => {
  it('assinante passa', async () => {
    vi.stubGlobal('fetch', responderPlano(true));
    await expect(enforceAiPlan(req())).resolves.toBeUndefined();
  });

  it('sem assinatura: 402, e a mensagem diz o que fazer', async () => {
    vi.stubGlobal('fetch', responderPlano(false));

    // Nao ha mais cota gratuita: antes, quem nao assinava tinha 12 chamadas por dia — o que
    // e exatamente o plano gratuito que a politica aboliu, servido pelo endpoint que custa.
    await expect(enforceAiPlan(req())).rejects.toMatchObject({
      status: 402,
      publicMessage: expect.stringMatching(/assine o papiro/i),
    });
  });

  it('nao vaza detalhe interno para o aluno', async () => {
    vi.stubGlobal('fetch', responderPlano(false));

    const erro = await enforceAiPlan(req()).catch((e) => e);
    expect(erro.publicMessage).not.toMatch(/is_premium_user|rpc|supabase/i);
  });

  it('banco fora do ar: passa, em vez de barrar assinante por soluco de infra', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));

    // Fail-open de proposito. O estrago fica limitado porque enforceAiRateLimit continua
    // valendo por usuario mesmo neste caminho.
    await expect(enforceAiPlan(req())).resolves.toBeUndefined();
  });

  it('resposta estranha do banco nao e tratada como "assinante"', async () => {
    // Qualquer coisa diferente de `true` e tratada como nao-premium: um `null` devolvido por
    // engano nao pode virar acesso liberado.
    vi.stubGlobal('fetch', responderPlano(null));
    await expect(enforceAiPlan(req())).rejects.toMatchObject({ status: 402 });
  });

  it('sem token nao chega a consultar (requireAiAuth ja barrou antes)', async () => {
    const buscar = responderPlano(false);
    vi.stubGlobal('fetch', buscar);

    await expect(enforceAiPlan({ headers: {} })).resolves.toBeUndefined();
    expect(buscar).not.toHaveBeenCalled();
  });

  it('a trava pode ser desligada por variavel de ambiente', async () => {
    process.env.AI_ENFORCE_PLAN = 'false';
    const buscar = responderPlano(false);
    vi.stubGlobal('fetch', buscar);

    await expect(enforceAiPlan(req())).resolves.toBeUndefined();
    expect(buscar).not.toHaveBeenCalled();
  });
});

describe('quando a funcao do banco nao existe', () => {
  it('passa, mas grita diferente de um erro de rede', async () => {
    // Migration nunca aplicada: TODA chamada cairia no fail-open e a trava nao travaria
    // nada — parecendo que trava. Fechar o portao tambem nao serve: sem a funcao ninguem e
    // verificavel, e bloquear todo mundo inclui quem paga.
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 404,
      text: async () => '{"code":"PGRST202","message":"Could not find the function public.is_premium_user"}',
      json: async () => null,
    })));
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(enforceAiPlan(req())).resolves.toBeUndefined();

    const dito = erro.mock.calls.flat().join(' ');
    expect(dito).toMatch(/ENFORCEMENT DESLIGADO/);
    expect(dito).toMatch(/blindagem_fase1/);
  });
});
