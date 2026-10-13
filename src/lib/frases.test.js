import { describe, it, expect } from 'vitest';
import { fraseDoDia, TOTAL_DE_FRASES } from './frases';

describe('fraseDoDia', () => {
  // Sorteio a cada render trocaria a frase a cada clique na tela, e frase que pisca vira
  // ruido em vez de companhia.
  it('e a mesma o dia inteiro', () => {
    const cedo = fraseDoDia(new Date(2026, 8, 20, 1, 0));
    const tarde = fraseDoDia(new Date(2026, 8, 20, 23, 59));
    expect(cedo.texto).toBe(tarde.texto);
  });

  it('muda na virada do dia', () => {
    const hoje = fraseDoDia(new Date(2026, 8, 20, 23, 59));
    const amanha = fraseDoDia(new Date(2026, 8, 21, 0, 1));
    expect(hoje.texto).not.toBe(amanha.texto);
  });

  it('percorre todas antes de repetir', () => {
    const vistas = new Set();
    for (let i = 0; i < TOTAL_DE_FRASES; i += 1) {
      vistas.add(fraseDoDia(new Date(2026, 8, 20 + i)).texto);
    }
    expect(vistas.size).toBe(TOTAL_DE_FRASES);
  });

  it('nao quebra com data invalida', () => {
    expect(typeof fraseDoDia(new Date('nao e data')).texto).toBe('string');
  });

  // Citacao sem autor vira frase de biscoito da sorte; e citacao com o autor ERRADO e pior
  // ainda num produto de estudo, onde o aluno confia no que le.
  it('toda citacao tem texto e autor', () => {
    for (let i = 0; i < TOTAL_DE_FRASES; i += 1) {
      const citacao = fraseDoDia(new Date(2026, 8, 20 + i));
      expect(citacao.texto.trim().length).toBeGreaterThan(10);
      expect(citacao.autor.trim().length).toBeGreaterThan(2);
    }
  });

  // As atribuicoes falsas mais populares da internet. Se alguma entrar na lista um dia,
  // este teste avisa antes de virar producao.
  it('nao carrega as atribuicoes falsas conhecidas', () => {
    const proibidas = [
      /n[aã]o [eé] o mais forte que sobrevive/i,
      /somos o que repetidamente fazemos/i,
      /diga-me e eu esque[cç]o/i,
      /n[aã]o importa qu[aã]o devagar voc[eê] v[aá]/i,
    ];
    for (let i = 0; i < TOTAL_DE_FRASES; i += 1) {
      const { texto, autor } = fraseDoDia(new Date(2026, 8, 20 + i));
      proibidas.forEach((padrao) => {
        // A de Will Durant entrou, mas com o credito certo — o que nao pode e cair em
        // Aristoteles.
        if (padrao.test(texto)) expect(autor).not.toMatch(/arist[oó]teles$/i);
        else expect(texto).not.toMatch(padrao);
      });
    }
  });
});
