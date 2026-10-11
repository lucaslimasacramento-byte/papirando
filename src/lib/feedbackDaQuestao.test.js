import { describe, it, expect } from 'vitest';
import {
  UTIL, RUIM, LIMITE_DO_TEXTO,
  normalizarVoto, textoDentroDoLimite, restamCaracteres, podeEnviar,
} from './feedbackDaQuestao';

describe('normalizarVoto', () => {
  it('aceita so os dois votos que a coluna aceita', () => {
    expect(normalizarVoto('util')).toBe(UTIL);
    expect(normalizarVoto('RUIM')).toBe(RUIM);
    expect(normalizarVoto(' util ')).toBe(UTIL);
  });

  it('qualquer outra coisa vira vazio, nunca um voto inventado', () => {
    // O CHECK da coluna recusaria, e o relatorio que soma texto arbitrario nao soma nada.
    expect(normalizarVoto('talvez')).toBe('');
    expect(normalizarVoto('')).toBe('');
    expect(normalizarVoto(null)).toBe('');
  });
});

describe('textoDentroDoLimite', () => {
  it('corta no limite em vez de recusar', () => {
    // Recusar faria o aluno perder o que digitou; o banco recusaria de qualquer jeito.
    const gigante = 'a'.repeat(LIMITE_DO_TEXTO + 200);
    expect(textoDentroDoLimite(gigante)).toHaveLength(LIMITE_DO_TEXTO);
  });

  it('texto curto passa intacto, inclusive o espaco que o aluno ainda vai usar', () => {
    expect(textoDentroDoLimite('gabarito errado ')).toBe('gabarito errado ');
  });

  it('nulo vira string vazia', () => {
    expect(textoDentroDoLimite(null)).toBe('');
  });
});

describe('restamCaracteres', () => {
  it('conta o que falta para o limite', () => {
    expect(restamCaracteres('')).toBe(LIMITE_DO_TEXTO);
    expect(restamCaracteres('abc')).toBe(LIMITE_DO_TEXTO - 3);
  });
});

describe('podeEnviar', () => {
  it('sem voto nao envia, mesmo com texto escrito', () => {
    // O texto sozinho nao diz se e elogio ou reclamacao.
    expect(podeEnviar({ voto: '' })).toBe(false);
  });

  it('com voto envia, com ou sem texto', () => {
    expect(podeEnviar({ voto: UTIL })).toBe(true);
    expect(podeEnviar({ voto: RUIM })).toBe(true);
  });

  it('nao envia duas vezes enquanto o envio esta em curso', () => {
    expect(podeEnviar({ voto: UTIL, enviando: true })).toBe(false);
  });
});
