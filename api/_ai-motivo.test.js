import { describe, it, expect } from 'vitest';
import { motivoDaFalhaDeIa } from './_ai.js';

// O backend responde "Falha temporaria no servico de IA" para qualquer 500, e o motivo real
// so ficava no log da Vercel. Isto classifica sem repassar o texto cru do provedor — a
// auditoria ja decidiu que o cliente nao ve interno (ver src/lib/aiSecurity.test.js).
describe('motivoDaFalhaDeIa', () => {
  it.each([
    ['401 {"type":"error","error":{"type":"authentication_error"}}', /chave da IA foi rejeitada/i],
    ['invalid x-api-key', /chave da IA foi rejeitada/i],
    ['429 rate_limit_error', /limite de chamadas por minuto/i],
    ['Your credit balance is too low', /credito ou limite de gasto/i],
    ['spend limit reached for this workspace', /credito ou limite de gasto/i],
    // Sobrecarga e passageira: nao pode virar "compre credito".
    ['529 {"type":"overloaded_error"}', /sobrecarregado/i],
    ['503 Service Unavailable', /sobrecarregado/i],
    ['prompt is too long: 250000 tokens > max_tokens', /grande demais para o modelo/i],
    ['The operation was aborted due to timeout', /demorou demais/i],
    ['socket hang up', /demorou demais/i],
    ['404 model: claude-inexistente not_found', /modelo de IA configurado/i],
  ])('classifica %s', (bruto, esperado) => {
    expect(motivoDaFalhaDeIa(bruto)).toMatch(esperado);
  });

  it('nao devolve motivo quando nao ha mensagem', () => {
    expect(motivoDaFalhaDeIa('')).toBe('');
    expect(motivoDaFalhaDeIa(null)).toBe('');
  });

  it('cai num motivo generico para erro desconhecido', () => {
    expect(motivoDaFalhaDeIa('algo totalmente inesperado')).toBe('O provedor de IA recusou a chamada.');
  });

  it('nunca repassa o texto cru do provedor', () => {
    // O ponto do classificador: o que sai e sempre uma das frases fixas.
    const cru = 'Nao foi possivel obter resposta de IA. [anthropic] 401 sk-ant-api03-SEGREDO invalid';
    const motivo = motivoDaFalhaDeIa(cru);
    expect(motivo).not.toContain('sk-ant');
    expect(motivo).not.toContain('anthropic');
    expect(motivo).toMatch(/chave da IA foi rejeitada/i);
  });
});

// runJson junta o erro de todos os provedores numa string só. Classificar a string inteira
// fazia o motivo de um provedor secundário virar o diagnóstico do principal — foi o que
// mandou o dono do app caçar crédito quando o Anthropic reclamava de outra coisa.
describe('motivoDaFalhaDeIa — só o provedor principal conta', () => {
  it('ignora o credito de um provedor secundario', () => {
    const erro = 'Nao foi possivel obter resposta de IA. [anthropic] 404 model not_found'
      + ' | [openrouter] 402 insufficient credits | [openai] 429 quota exceeded';
    expect(motivoDaFalhaDeIa(erro)).toMatch(/modelo de IA configurado/i);
  });

  it('ignora a chave invalida de um provedor secundario', () => {
    const erro = 'Nao foi possivel obter resposta de IA. [anthropic] Your credit balance is too low'
      + ' | [groq] 401 invalid api key';
    expect(motivoDaFalhaDeIa(erro)).toMatch(/credito ou limite de gasto/i);
  });

  it('respeita o primeiro segmento mesmo com varios provedores depois', () => {
    const erro = 'Nao foi possivel obter resposta de IA. [anthropic] 401 authentication_error'
      + ' | [openrouter] 529 overloaded | [groq] timeout | [gemini] 404 model';
    expect(motivoDaFalhaDeIa(erro)).toMatch(/chave da IA foi rejeitada/i);
  });

  it('classifica normalmente quando nao ha prefixo de provedor', () => {
    expect(motivoDaFalhaDeIa('Your credit balance is too low')).toMatch(/credito ou limite/i);
  });
});
