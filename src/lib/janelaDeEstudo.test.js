import { describe, it, expect } from 'vitest';
import { janelaDeEstudo, minutosDoRotulo, JANELA_PADRAO } from './janelaDeEstudo';

describe('minutosDoRotulo', () => {
  it('le os formatos que o app ja gravava', () => {
    expect(minutosDoRotulo('1h 30m')).toBe(90);
    expect(minutosDoRotulo('2h 00m')).toBe(120);
    expect(minutosDoRotulo('45m')).toBe(45);
    expect(minutosDoRotulo('2h')).toBe(120);
    expect(minutosDoRotulo('90')).toBe(90);
  });

  it('devolve 0 para o que nao da para ler', () => {
    expect(minutosDoRotulo('')).toBe(0);
    expect(minutosDoRotulo(null)).toBe(0);
    expect(minutosDoRotulo('a definir')).toBe(0);
  });
});

describe('janelaDeEstudo', () => {
  it('o bug relatado: escolhi 45m a 1h e o ciclo montava blocos de 1h30', () => {
    // wizData nunca era atualizado pelo wizard — ficava eternamente no valor de fabrica.
    const wizardData = { minSessao: '1h 30m', maxSessao: '2h 00m' };
    const escolhaDoAluno = { minMinutes: 45, maxMinutes: 60 };

    expect(janelaDeEstudo(wizardData, escolhaDoAluno)).toEqual({ min: 45, max: 60 });
  });

  it('sem escolha salva, cai no rotulo legado', () => {
    expect(janelaDeEstudo({ minSessao: '1h 00m', maxSessao: '1h 30m' }, null))
      .toEqual({ min: 60, max: 90 });
  });

  it('sem nada, usa o padrao', () => {
    expect(janelaDeEstudo(null, null))
      .toEqual({ min: JANELA_PADRAO.minMinutes, max: JANELA_PADRAO.maxMinutes });
  });

  it('nunca deixa o maximo abaixo do minimo', () => {
    expect(janelaDeEstudo(null, { minMinutes: 90, maxMinutes: 30 }))
      .toEqual({ min: 90, max: 90 });
  });

  it('ignora zero e lixo na escolha salva', () => {
    expect(janelaDeEstudo({ minSessao: '45m', maxSessao: '90m' }, { minMinutes: 0, maxMinutes: null }))
      .toEqual({ min: 45, max: 90 });
  });

  it('nao aceita bloco menor que 15 minutos', () => {
    expect(janelaDeEstudo(null, { minMinutes: 5, maxMinutes: 10 }))
      .toEqual({ min: 15, max: 15 });
  });
});
