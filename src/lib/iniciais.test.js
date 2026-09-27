import { describe, it, expect } from 'vitest';
import { iniciaisDe } from './iniciais';

describe('iniciaisDe', () => {
  it('pega a primeira letra de cada palavra', () => {
    expect(iniciaisDe('Soldado do Quadro de Praças')).toBe('SQ');
    expect(iniciaisDe('Oficial de Estado-Maior')).toBe('OE');
  });

  // A sigla que o proprio nome traz identifica melhor que as iniciais soltas.
  it('prefere a sigla quando o nome tem uma', () => {
    expect(iniciaisDe('TJ-SP — Analista Judiciário')).toBe('TJ');
    expect(iniciaisDe('INSS — Técnico do Seguro Social')).toBe('INSS');
  });

  it('ignora preposicoes', () => {
    expect(iniciaisDe('Curso de Formação de Oficiais')).toBe('CF');
  });

  it('aguenta nome de uma palavra so', () => {
    expect(iniciaisDe('Engenharia')).toBe('E');
  });

  it('nao quebra com nome vazio', () => {
    expect(iniciaisDe('')).toBe('—');
    expect(iniciaisDe(null)).toBe('—');
  });

  it('cai no recorte do texto quando so ha simbolo', () => {
    expect(iniciaisDe('###')).toBe('##');
  });
});
