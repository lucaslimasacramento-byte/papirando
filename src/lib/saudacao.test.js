import { describe, it, expect } from 'vitest';
import { saudacaoDoHorario, msAteProximaFaixa } from './saudacao';

const as = (hora, minuto = 0) => new Date(2026, 8, 20, hora, minuto, 0, 0);

describe('saudacaoDoHorario', () => {
  it.each([
    [0, 'Boa madrugada'],
    [1, 'Boa madrugada'],   // o caso que o dono pegou: 01h24 dizia "Bom dia"
    [4, 'Boa madrugada'],
    [5, 'Bom dia'],
    [11, 'Bom dia'],
    [12, 'Boa tarde'],
    [17, 'Boa tarde'],
    [18, 'Boa noite'],
    [23, 'Boa noite'],
  ])('as %ih diz %s', (hora, esperado) => {
    expect(saudacaoDoHorario(as(hora)).saudacao).toBe(esperado);
  });

  it('cai na tarde quando a data e invalida, em vez de quebrar', () => {
    expect(saudacaoDoHorario(new Date('nao e data')).saudacao).toBe('Boa tarde');
  });
});

// Sem isso a tela congela no horario em que foi aberta: quem deixa o app aberto a noite
// toda ve "Boa tarde" as duas da manha.
describe('msAteProximaFaixa', () => {
  it('conta ate as 5h quando e madrugada', () => {
    expect(msAteProximaFaixa(as(1, 24))).toBe(((3 * 60) + 36) * 60 * 1000);
  });

  it('conta ate o meio-dia quando e manha', () => {
    expect(msAteProximaFaixa(as(11, 30))).toBe(30 * 60 * 1000);
  });

  it('vira o dia quando e noite', () => {
    // 23h30 -> meia-noite do dia seguinte
    expect(msAteProximaFaixa(as(23, 30))).toBe(30 * 60 * 1000);
  });

  it('nunca devolve zero ou negativo', () => {
    expect(msAteProximaFaixa(as(4, 59))).toBeGreaterThan(0);
    expect(msAteProximaFaixa(as(23, 59))).toBeGreaterThan(0);
  });
});
