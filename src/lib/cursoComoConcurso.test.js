import { describe, it, expect } from 'vitest';
import { concursoDoObjetivo, concursosDosCursos, migrarAlvoDeCurso } from './cursoComoConcurso';

const curso = {
  id: 'curso-1758',
  nome: 'Concurso Público para Admissão ao CFO e CFP da PMAL',
  plano: 'Concurso Público para Admissão ao CFO e CFP da PMAL',
  banca: 'Cebraspe',
  prova_data: '2026-07-19',
  cargos: [
    { id: 'oficial', nome: 'Oficial de Estado-Maior', vagas: '12' },
    { id: 'soldado', nome: 'Soldado do Quadro de Praças' },
  ],
};

// O alvo aponta para o OBJETIVO: e ele que tem data de prova, banca e cargo.
describe('concursosDosCursos', () => {
  it('um curso de dois objetivos oferece dois alvos', () => {
    const lista = concursosDosCursos([curso], []);
    expect(lista).toHaveLength(2);
    expect(lista.map((c) => c.id)).toEqual([
      'objetivo:curso-1758:oficial',
      'objetivo:curso-1758:soldado',
    ]);
  });

  it('o nome do certame fica no curso e o do alvo no objetivo', () => {
    const [oficial] = concursosDosCursos([curso], []);
    expect(oficial.nome).toBe(curso.nome);
    expect(oficial.objetivoNome).toBe('Oficial de Estado-Maior');
    expect(oficial.vagas).toBe('12');
    expect(oficial.banca).toBe('Cebraspe');
  });

  // Curso vindo do catalogo ja esta representado la: duplicar criaria dois alvos para o
  // mesmo objetivo.
  it('ignora curso que ja tem equivalente no catalogo', () => {
    expect(concursosDosCursos([curso], [{ id: 'cat-1', plano: curso.plano }])).toEqual([]);
  });

  it('curso antigo sem cargos vira um alvo so', () => {
    const lista = concursosDosCursos([{ id: 'c', nome: 'TJ/AL', cargo: 'Analista' }], []);
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe('objetivo:c:principal');
  });

  it('nao quebra com listas vazias', () => {
    expect(concursosDosCursos(null, null)).toEqual([]);
  });
});

describe('concursoDoObjetivo', () => {
  it('ignora curso ou objetivo sem id', () => {
    expect(concursoDoObjetivo({ nome: 'x' }, { id: 'a' })).toBeNull();
    expect(concursoDoObjetivo({ id: 'c' }, null)).toBeNull();
  });
});

// Sem esta ponte, todo aluno com alvo definido perderia o alvo no deploy.
describe('migrarAlvoDeCurso', () => {
  it('aponta o alvo antigo para o primeiro objetivo do curso', () => {
    expect(migrarAlvoDeCurso('curso:curso-1758', [curso])).toBe('objetivo:curso-1758:oficial');
  });

  it('deixa como esta quando ja e um id de objetivo', () => {
    expect(migrarAlvoDeCurso('objetivo:curso-1758:soldado', [curso])).toBe('objetivo:curso-1758:soldado');
  });

  it('deixa como esta quando o curso sumiu', () => {
    expect(migrarAlvoDeCurso('curso:apagado', [curso])).toBe('curso:apagado');
  });

  it('nao mexe em slug de catalogo', () => {
    expect(migrarAlvoDeCurso('pmal-oficial-2026', [curso])).toBe('pmal-oficial-2026');
  });
});
