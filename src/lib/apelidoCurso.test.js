import { describe, it, expect } from 'vitest';
import { apelidoSugerido, nomeCurtoDoCurso } from './apelidoCurso';

// O nome oficial de concurso e uma frase inteira e, cortado pelo cartao, nao identifica
// nada: "Concurso Publico para Admissao ao Curso de Formacao de Oficiais (..."
describe('apelidoSugerido', () => {
  const pmal = {
    nome: 'Concurso Público para Admissão ao Curso de Formação de Oficiais (CFO) e ao Curso de Formação de Praças (CFP) da PMAL',
    cargos: [{ nome: 'Oficial de Estado-Maior' }],
  };

  it('junta a sigla do orgao com o cargo', () => {
    expect(apelidoSugerido(pmal)).toBe('PMAL — Oficial de Estado-Maior');
  });

  // CFO e CFP sao nome de curso de formacao, nao do orgao: identificam menos que PMAL.
  it('ignora siglas genericas de curso de formacao', () => {
    expect(apelidoSugerido(pmal)).not.toContain('CFO');
  });

  // Nome que ja cabe no cartao vence a abreviacao: "Prefeitura de Maceió" informa mais que
  // "Fiscal", e o cargo ja aparece na linha de cima do cartao.
  it('deixa nome curto em paz mesmo havendo cargo', () => {
    expect(apelidoSugerido({ nome: 'Prefeitura de Maceió', cargo: 'Fiscal' })).toBe('Prefeitura de Maceió');
  });

  it('usa so o cargo quando o nome e longo e nao ha sigla', () => {
    const longo = 'processo seletivo para provimento de cargos efetivos do quadro geral';
    expect(apelidoSugerido({ nome: longo, cargo: 'Fiscal' })).toBe('Fiscal');
  });

  it('encurta o nome quando nao ha sigla nem cargo', () => {
    const longo = { nome: 'Processo seletivo simplificado para contratacao temporaria de pessoal' };
    expect(apelidoSugerido(longo).length).toBeLessThanOrEqual(40);
    expect(apelidoSugerido(longo).endsWith('…')).toBe(true);
  });

  it('deixa nome curto em paz', () => {
    expect(apelidoSugerido({ nome: 'ENEM 2026' })).toBe('ENEM 2026');
  });
});

describe('nomeCurtoDoCurso', () => {
  it('o apelido do aluno vence a sugestao', () => {
    expect(nomeCurtoDoCurso({ nome: 'Concurso da PMAL', apelido: 'Meu alvo' })).toBe('Meu alvo');
  });

  it('cai na sugestao quando nao ha apelido', () => {
    expect(nomeCurtoDoCurso({ nome: 'ENEM 2026', apelido: '   ' })).toBe('ENEM 2026');
  });
});
