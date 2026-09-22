import { describe, it, expect } from 'vitest';
import {
  tipoDoObjetivo,
  temCampo,
  marcoDoObjetivo,
  marcoMaisProximo,
  tiposDoCurso,
} from './tiposDeObjetivo';

const hoje = new Date(2026, 8, 22); // 22/09/2026

describe('tipoDoObjetivo', () => {
  it('cai em concurso quando o tipo nao foi informado', () => {
    expect(tipoDoObjetivo({}).id).toBe('concurso');
    expect(tipoDoObjetivo({ tipo: 'nao existe' }).id).toBe('concurso');
  });

  it('aceita o tipo em qualquer caixa', () => {
    expect(tipoDoObjetivo({ tipo: 'FACULDADE' }).id).toBe('faculdade');
  });
});

// Campo de banca vazio num objetivo de faculdade so ocupa espaco e sugere que falta
// preencher algo que nao existe.
describe('temCampo', () => {
  it('concurso tem banca e vagas; faculdade nao', () => {
    expect(temCampo({ tipo: 'concurso' }, 'banca')).toBe(true);
    expect(temCampo({ tipo: 'faculdade' }, 'banca')).toBe(false);
    expect(temCampo({ tipo: 'faculdade' }, 'periodo')).toBe(true);
  });
});

describe('marcoDoObjetivo', () => {
  it('conta os dias para a prova do concurso', () => {
    const marco = marcoDoObjetivo({ tipo: 'concurso', prova_data: '2026-10-02' }, hoje);
    expect(marco).toMatchObject({ dias: 10, rotulo: 'Prova' });
  });

  // Semestre nao termina em prova unica: o prazo e o fim do periodo.
  it('na faculdade o prazo e o fim do periodo', () => {
    const marco = marcoDoObjetivo({ tipo: 'faculdade', prova_data: '2026-12-15' }, hoje);
    expect(marco.rotulo).toBe('Fim do período');
    expect(marco.rotuloDaContagem).toBe('para fechar o período');
  });

  // Inventar prazo para estudo livre e transformar em cobranca o que o aluno escolheu fazer
  // sem cobranca.
  it('estudo livre nao tem prazo', () => {
    expect(marcoDoObjetivo({ tipo: 'livre', prova_data: '2026-10-02' }, hoje)).toBeNull();
  });

  it('sem data nao inventa prazo', () => {
    expect(marcoDoObjetivo({ tipo: 'concurso' }, hoje)).toBeNull();
    expect(marcoDoObjetivo({ tipo: 'concurso', prova_data: 'amanha' }, hoje)).toBeNull();
  });

  it('prazo vencido conta dias negativos', () => {
    expect(marcoDoObjetivo({ tipo: 'concurso', prova_data: '2026-07-19' }, hoje).dias).toBeLessThan(0);
  });
});

describe('marcoMaisProximo', () => {
  it('pega o prazo que vem primeiro', () => {
    const marco = marcoMaisProximo([
      { id: 'a', tipo: 'concurso', prova_data: '2026-12-01' },
      { id: 'b', tipo: 'faculdade', prova_data: '2026-10-10' },
    ], hoje);
    expect(marco.objetivo.id).toBe('b');
    expect(marco.dias).toBe(18);
  });

  // Prazo vencido nao aperta mais nada.
  it('ignora prazo que ja passou', () => {
    const marco = marcoMaisProximo([
      { id: 'velho', tipo: 'concurso', prova_data: '2026-07-19' },
      { id: 'novo', tipo: 'concurso', prova_data: '2027-03-01' },
    ], hoje);
    expect(marco.objetivo.id).toBe('novo');
  });

  it('devolve null quando nenhum objetivo tem prazo', () => {
    expect(marcoMaisProximo([{ tipo: 'livre' }, { tipo: 'concurso' }], hoje)).toBeNull();
    expect(marcoMaisProximo([], hoje)).toBeNull();
  });
});

describe('tiposDoCurso', () => {
  it('lista os tipos sem repetir', () => {
    expect(tiposDoCurso([
      { tipo: 'concurso' }, { tipo: 'concurso' }, { tipo: 'faculdade' },
    ])).toEqual(['concurso', 'faculdade']);
  });
});
