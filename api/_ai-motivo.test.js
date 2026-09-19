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

// fetchJson passou a prefixar o status ("HTTP 403: permission_error"). Sem ele, "o provedor
// recusou a chamada" não dizia nada: 400, 403 e 500 pedem ações completamente diferentes.
describe('motivoDaFalhaDeIa — status HTTP', () => {
  it('reconhece falta de permissao', () => {
    expect(motivoDaFalhaDeIa('[anthropic] HTTP 403: permission_error')).toMatch(/nao tem permissao/i);
  });

  it('devolve o status quando nao ha categoria conhecida', () => {
    // Com tipo de erro no texto ele entra junto — coberto na suite do tipo, abaixo.
    expect(motivoDaFalhaDeIa('[anthropic] HTTP 500: internal')).toBe(
      'O provedor de IA recusou a chamada (HTTP 500).'
    );
  });

  it('a categoria conhecida ainda ganha do status', () => {
    expect(motivoDaFalhaDeIa('[anthropic] HTTP 404: model not_found')).toMatch(/modelo de IA/i);
    expect(motivoDaFalhaDeIa('[anthropic] HTTP 401: authentication_error')).toMatch(/chave da IA foi rejeitada/i);
  });

  it('segue generico quando nem status existe', () => {
    expect(motivoDaFalhaDeIa('[anthropic] algo inesperado')).toBe('O provedor de IA recusou a chamada.');
  });
});

describe('motivoDaFalhaDeIa — tipo de erro do provedor', () => {
  // O tipo é um enum fixo do provedor, não texto livre: diagnostica sem vazar conteúdo.
  it('inclui o tipo junto do status', () => {
    expect(motivoDaFalhaDeIa('[anthropic] HTTP 400: invalid_request_error')).toBe(
      'O provedor de IA recusou a chamada (HTTP 400 · invalid_request_error).'
    );
  });

  it('acha o tipo dentro do corpo JSON do provedor', () => {
    const erro = '[anthropic] HTTP 400: {"type":"error","error":{"type":"invalid_request_error"}}';
    expect(motivoDaFalhaDeIa(erro)).toMatch(/invalid_request_error/);
  });

  it('fica só com o status quando não há tipo', () => {
    expect(motivoDaFalhaDeIa('[anthropic] HTTP 400: nada reconhecivel')).toBe(
      'O provedor de IA recusou a chamada (HTTP 400).'
    );
  });
});

// fetchJson passou a mandar tipo E mensagem ("invalid_request_error - Input is too long").
// Preferir só a mensagem descartava o tipo, e a classificação ficava cega no caso em que
// mais precisava dele — um HTTP 400, onde a categoria está justamente no tipo.
describe('motivoDaFalhaDeIa — tipo e mensagem juntos', () => {
  it.each([
    ['HTTP 400: invalid_request_error - messages.0.content: Input is too long', /grande demais para o modelo/i],
    ['HTTP 400: invalid_request_error - model: claude-inexistente', /modelo de IA configurado/i],
    ['HTTP 401: authentication_error - invalid x-api-key', /chave da IA foi rejeitada/i],
    ['HTTP 403: permission_error - not allowed', /nao tem permissao/i],
    ['HTTP 429: rate_limit_error - too many requests', /chamadas por minuto/i],
    ['HTTP 529: overloaded_error - overloaded', /sobrecarregado/i],
  ])('classifica %s', (erro, esperado) => {
    expect(motivoDaFalhaDeIa(`[anthropic] ${erro}`)).toMatch(esperado);
  });

  it('cai no tipo quando a mensagem nao ajuda', () => {
    expect(motivoDaFalhaDeIa('[anthropic] HTTP 400: some_weird_error - ???')).toBe(
      'O provedor de IA recusou a chamada (HTTP 400 · some_weird_error).'
    );
  });
});

// O erro que custou uma noite de diagnóstico: chave de escopo "Organização" não pertence a
// workspace nenhum, e a API exige o cabeçalho anthropic-workspace-id nesse caso.
describe('motivoDaFalhaDeIa — chave de organizacao sem workspace', () => {
  it('reconhece a mensagem da Anthropic e diz o que fazer', () => {
    const erro = '[anthropic] HTTP 400: invalid_request_error - This API key is not scoped to a'
      + ' workspace, so this request must include the anthropic-workspace-id header with the ID'
      + ' of the workspace to use.';
    const motivo = motivoDaFalhaDeIa(erro);
    expect(motivo).toMatch(/ANTHROPIC_WORKSPACE_ID/);
    expect(motivo).toMatch(/chave de workspace/i);
  });

  it('nao confunde com falta de permissao', () => {
    expect(motivoDaFalhaDeIa('[anthropic] HTTP 403: permission_error')).toMatch(/nao tem permissao/i);
  });
});

// "`temperature` is deprecated for this model" contém a palavra "model" e caía na regra de
// modelo, mandando trocar o modelo quando o problema era o corpo da requisição.
describe('motivoDaFalhaDeIa — parametro depreciado', () => {
  it.each([
    ['`temperature` is deprecated for this model.', 'temperature'],
    ['`top_k` is not supported for this model', 'top_k'],
    ['top_p is unsupported', 'top_p'],
  ])('nomeia o parametro em %s', (mensagem, parametro) => {
    const motivo = motivoDaFalhaDeIa(`[anthropic] HTTP 400: invalid_request_error - ${mensagem}`);
    expect(motivo).toBe(`O provedor nao aceita mais o parametro "${parametro}" neste modelo.`);
  });

  it('nao rouba o caso de modelo inexistente', () => {
    expect(motivoDaFalhaDeIa('[anthropic] HTTP 404: model claude-x not_found')).toMatch(
      /modelo de IA configurado/i
    );
  });
});

// Uma resposta HTTP 200 sem nenhum bloco de texto caía no catch-all "o provedor recusou a
// chamada" — que é falso: o provedor aceitou. E quando o motivo real era o teto de tokens,
// a mensagem não dizia nada sobre tamanho.
describe('motivoDaFalhaDeIa — resposta sem bloco de texto', () => {
  it('nao culpa o edital quando o modelo devolveu so thinking', () => {
    const motivo = motivoDaFalhaDeIa(
      '[anthropic] A IA retornou uma resposta sem texto (stop_reason: end_turn; blocos recebidos: thinking).'
    );
    expect(motivo).toBe('A IA respondeu sem texto utilizavel. Tente de novo.');
  });

  it('aponta o tamanho quando o teto de tokens estourou', () => {
    const motivo = motivoDaFalhaDeIa(
      '[anthropic] A IA retornou uma resposta sem texto (stop_reason: max_tokens; blocos recebidos: thinking).'
    );
    expect(motivo).toMatch(/grande demais/i);
  });

  it('nao vira "recusou a chamada" quando o provedor respondeu 200', () => {
    const motivo = motivoDaFalhaDeIa(
      '[anthropic] A IA retornou uma resposta sem texto (stop_reason: desconhecido; nenhum bloco de conteudo).'
    );
    expect(motivo).not.toMatch(/recusou a chamada/i);
  });
});
