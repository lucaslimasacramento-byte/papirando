import { describe, it, expect } from 'vitest';
import { concursoDoCurso, concursosDosCursos, ehConcursoDeCurso, PREFIXO_CURSO } from './cursoComoConcurso';

const curso = {
  id: 'curso-1758',
  nome: 'Concurso Público para Admissão ao CFO e CFP da PMAL',
  plano: 'Concurso Público para Admissão ao CFO e CFP da PMAL',
  banca: 'Cebraspe',
  prova_data: '2026-07-19',
  cargos: [
    { id: 'oficial', nome: 'Oficial de Estado-Maior', vagas: '12', salario: 'R$ 11.563,77' },
    { id: 'soldado', nome: 'Soldado do Quadro de Praças' },
  ],
};

describe('concursoDoCurso', () => {
  it('usa o primeiro cargo quando o curso cobre varios', () => {
    const concurso = concursoDoCurso(curso);
    expect(concurso.cargo).toBe('Oficial de Estado-Maior');
    expect(concurso.vagas).toBe('12');
    expect(concurso.cargos).toHaveLength(2);
  });

  // O alvo e gravado por id em user_contests; o prefixo evita colidir com slug de catalogo.
  it('prefixa o id e guarda a origem', () => {
    const concurso = concursoDoCurso(curso);
    expect(concurso.id).toBe(`${PREFIXO_CURSO}curso-1758`);
    expect(ehConcursoDeCurso(concurso.id)).toBe(true);
    expect(concurso.origemCursoId).toBe('curso-1758');
  });

  it('ignora curso sem id ou sem nome', () => {
    expect(concursoDoCurso({ nome: 'sem id' })).toBeNull();
    expect(concursoDoCurso({ id: 'x', nome: '  ' })).toBeNull();
  });

  it('nao quebra com curso de cargo unico', () => {
    const concurso = concursoDoCurso({ id: 'c', nome: 'Analista', cargo: 'Analista Judiciario' });
    expect(concurso.cargo).toBe('Analista Judiciario');
    expect(concurso.cargos).toEqual([]);
  });
});

// Curso vindo do catalogo ja esta representado la: duplicar criaria dois alvos para o mesmo
// objetivo.
describe('concursosDosCursos', () => {
  it('ignora curso que ja tem equivalente no catalogo', () => {
    const catalogo = [{ id: 'cat-1', nome: 'Outro', plano: curso.plano }];
    expect(concursosDosCursos([curso], catalogo)).toEqual([]);
  });

  it('inclui curso que nao esta no catalogo', () => {
    const lista = concursosDosCursos([curso], [{ id: 'cat-1', plano: 'Nada a ver' }]);
    expect(lista).toHaveLength(1);
    expect(lista[0].nome).toBe(curso.nome);
  });

  it('nao quebra com listas vazias', () => {
    expect(concursosDosCursos(null, null)).toEqual([]);
  });
});
