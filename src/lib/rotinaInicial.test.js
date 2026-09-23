import { describe, it, expect } from 'vitest';
import {
  ROTINA_PADRAO,
  diasAtivos,
  horasNaSemana,
  validarRotina,
  paraWizData,
  resumoDaRotina,
} from './rotinaInicial';

describe('rotina inicial', () => {
  it('o padrao e dias uteis', () => {
    expect(diasAtivos(ROTINA_PADRAO.dias)).toEqual(['seg', 'ter', 'qua', 'qui', 'sex']);
    expect(horasNaSemana(ROTINA_PADRAO)).toBe(15);
  });

  it('cobra pelo menos um dia', () => {
    expect(validarRotina({ dias: {}, horasPorDia: 3 })).toContain('dia da semana');
  });

  it('cobra a carga por dia', () => {
    expect(validarRotina({ dias: { seg: true }, horasPorDia: 0 })).toContain('horas');
  });

  it('aceita uma rotina valida', () => {
    expect(validarRotina({ dias: { sab: true }, horasPorDia: 6 })).toBe('');
  });
});

describe('paraWizData', () => {
  const rotina = { dias: { sab: true, dom: true }, horasPorDia: 5, formato: 'ciclo' };

  it('marca so os dias escolhidos e zera o resto', () => {
    const wiz = paraWizData(rotina);
    expect(wiz.diasSemana).toEqual({ seg: false, ter: false, qua: false, qui: false, sex: false, sab: true, dom: true });
    expect(wiz.horasPorDia).toEqual({ seg: 0, ter: 0, qua: 0, qui: 0, sex: 0, sab: 5, dom: 5 });
    expect(wiz.horasSemana).toBe(10);
  });

  it('leva as materias do curso recem-criado', () => {
    expect(paraWizData(rotina, ['Português', 'Informática']).materias).toEqual(['Português', 'Informática']);
  });

  it('so aceita os dois formatos conhecidos', () => {
    expect(paraWizData({ ...rotina, formato: 'cronograma' }).tipo).toBe('cronograma');
    expect(paraWizData({ ...rotina, formato: 'qualquer coisa' }).tipo).toBe('ciclo');
  });
});

describe('resumoDaRotina', () => {
  it('conta os dias e o total', () => {
    expect(resumoDaRotina({ dias: { seg: true, ter: true }, horasPorDia: 2 }))
      .toBe('2 dias por semana · 2h por dia · 4h no total');
  });

  it('usa o singular com um dia so', () => {
    expect(resumoDaRotina({ dias: { seg: true }, horasPorDia: 2 })).toContain('1 dia por semana');
  });

  it('avisa quando nao ha dia marcado', () => {
    expect(resumoDaRotina({ dias: {}, horasPorDia: 2 })).toBe('Nenhum dia marcado.');
  });
});
