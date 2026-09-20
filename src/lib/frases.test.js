import { describe, it, expect } from 'vitest';
import { fraseDoDia, TOTAL_DE_FRASES } from './frases';

describe('fraseDoDia', () => {
  // Sorteio a cada render trocaria a frase a cada clique na tela, e frase que pisca vira
  // ruido em vez de companhia.
  it('e a mesma o dia inteiro', () => {
    const cedo = fraseDoDia(new Date(2026, 8, 20, 1, 0));
    const tarde = fraseDoDia(new Date(2026, 8, 20, 23, 59));
    expect(cedo).toBe(tarde);
  });

  it('muda na virada do dia', () => {
    const hoje = fraseDoDia(new Date(2026, 8, 20, 23, 59));
    const amanha = fraseDoDia(new Date(2026, 8, 21, 0, 1));
    expect(hoje).not.toBe(amanha);
  });

  it('percorre todas antes de repetir', () => {
    const vistas = new Set();
    for (let i = 0; i < TOTAL_DE_FRASES; i += 1) {
      vistas.add(fraseDoDia(new Date(2026, 8, 20 + i)));
    }
    expect(vistas.size).toBe(TOTAL_DE_FRASES);
  });

  it('nao quebra com data invalida', () => {
    expect(typeof fraseDoDia(new Date('nao e data'))).toBe('string');
  });

  // Citacao falsa atribuida a famoso num produto de estudo e o oposto do que a gente vende.
  it('nenhuma frase tem atribuicao de autor', () => {
    for (let i = 0; i < TOTAL_DE_FRASES; i += 1) {
      expect(fraseDoDia(new Date(2026, 8, 20 + i))).not.toMatch(/—|--|\(.*\)$/);
    }
  });
});
