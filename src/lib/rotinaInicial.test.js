import { describe, it, expect } from 'vitest';
import {
  ROTINA_PADRAO,
  diasAtivos,
  horasDoDia,
  horasNaSemana,
  definirHorasDoDia,
  aplicarATodos,
  validarRotina,
  paraWizData,
  formatarHoras,
  resumoDaRotina,
} from './rotinaInicial';

describe('rotina inicial', () => {
  it('o padrao e dias uteis com 3h', () => {
    expect(diasAtivos(ROTINA_PADRAO.dias)).toEqual(['seg', 'ter', 'qua', 'qui', 'sex']);
    expect(horasNaSemana(ROTINA_PADRAO)).toBe(15);
  });

  // O ponto da tela: quem trabalha estuda 1h na terca e 6h no sabado.
  it('guarda uma carga por dia', () => {
    let rotina = { dias: { ter: true, sab: true }, horasPorDia: {} };
    rotina = definirHorasDoDia(rotina, 'ter', 1);
    rotina = definirHorasDoDia(rotina, 'sab', 6);
    expect(horasDoDia(rotina, 'ter')).toBe(1);
    expect(horasDoDia(rotina, 'sab')).toBe(6);
    expect(horasNaSemana(rotina)).toBe(7);
  });

  it('mexer num dia nao mexe nos outros', () => {
    const antes = { dias: { seg: true, ter: true }, horasPorDia: { seg: 2, ter: 4 } };
    const depois = definirHorasDoDia(antes, 'seg', 5);
    expect(horasDoDia(depois, 'ter')).toBe(4);
    expect(antes.horasPorDia.seg).toBe(2); // nao muta o original
  });

  it('limita a carga de um dia', () => {
    expect(horasDoDia(definirHorasDoDia({ horasPorDia: {} }, 'seg', 99), 'seg')).toBe(14);
    expect(horasDoDia(definirHorasDoDia({ horasPorDia: {} }, 'seg', -3), 'seg')).toBe(0);
  });

  // Rotina salva no formato antigo (um numero para a semana toda) continua valendo.
  it('aceita a carga unica do formato antigo', () => {
    const antiga = { dias: { seg: true, ter: true }, horasPorDia: 4 };
    expect(horasDoDia(antiga, 'seg')).toBe(4);
    expect(horasNaSemana(antiga)).toBe(8);
    expect(horasDoDia(definirHorasDoDia(antiga, 'seg', 1), 'ter')).toBe(4);
  });

  it('aplicarATodos so mexe nos dias marcados', () => {
    const rotina = aplicarATodos({ dias: { seg: true, sab: true }, horasPorDia: {} }, 2);
    expect(horasDoDia(rotina, 'seg')).toBe(2);
    expect(horasDoDia(rotina, 'sab')).toBe(2);
    expect(horasDoDia(rotina, 'dom')).toBe(0);
  });
});

describe('validarRotina', () => {
  it('cobra pelo menos um dia', () => {
    expect(validarRotina({ dias: {}, horasPorDia: { seg: 3 } })).toContain('dia da semana');
  });

  it('cobra alguma carga', () => {
    expect(validarRotina({ dias: { seg: true }, horasPorDia: { seg: 0 } })).toContain('horas');
  });

  // Dia marcado com zero e contradicao: dizer qual dia evita cacar.
  it('aponta o dia marcado que ficou em zero', () => {
    const aviso = validarRotina({ dias: { seg: true, sab: true }, horasPorDia: { seg: 3, sab: 0 } });
    expect(aviso).toContain('Sábado');
  });

  it('aceita uma rotina valida', () => {
    expect(validarRotina({ dias: { sab: true }, horasPorDia: { sab: 6 } })).toBe('');
  });
});

describe('paraWizData', () => {
  const rotina = { dias: { sab: true, dom: true }, horasPorDia: { sab: 6, dom: 4, seg: 9 }, formato: 'ciclo' };

  it('leva a carga real de cada dia e zera os desmarcados', () => {
    const wiz = paraWizData(rotina);
    expect(wiz.horasPorDia).toEqual({ seg: 0, ter: 0, qua: 0, qui: 0, sex: 0, sab: 6, dom: 4 });
    expect(wiz.horasSemana).toBe(10);
  });

  it('leva as materias do curso recem-criado', () => {
    expect(paraWizData(rotina, ['Português']).materias).toEqual(['Português']);
  });

  it('so aceita os dois formatos conhecidos', () => {
    expect(paraWizData({ ...rotina, formato: 'cronograma' }).tipo).toBe('cronograma');
    expect(paraWizData({ ...rotina, formato: 'qualquer coisa' }).tipo).toBe('ciclo');
  });
});

describe('formatarHoras', () => {
  it('escreve como o aluno fala', () => {
    expect(formatarHoras(3)).toBe('3h');
    expect(formatarHoras(2.5)).toBe('2h30');
    expect(formatarHoras(0)).toBe('0h');
  });
});

describe('resumoDaRotina', () => {
  it('diz a carga por dia quando e igual em todos', () => {
    expect(resumoDaRotina({ dias: { seg: true, ter: true }, horasPorDia: { seg: 2, ter: 2 } }))
      .toBe('2 dias por semana · 2h por dia · 4h no total');
  });

  // Com cargas diferentes, "3h por dia" seria mentira: fica so o total.
  it('mostra so o total quando as cargas diferem', () => {
    expect(resumoDaRotina({ dias: { ter: true, sab: true }, horasPorDia: { ter: 1, sab: 6 } }))
      .toBe('2 dias por semana · 7h no total');
  });

  it('usa o singular com um dia so', () => {
    expect(resumoDaRotina({ dias: { seg: true }, horasPorDia: { seg: 2 } })).toContain('1 dia por semana');
  });

  it('avisa quando nao ha dia marcado', () => {
    expect(resumoDaRotina({ dias: {}, horasPorDia: {} })).toBe('Nenhum dia marcado.');
  });
});
