import { describe, it, expect } from 'vitest';
import {
  migrarCurso,
  objetivosDoCurso,
  objetivosDaDisciplina,
  progressoPorObjetivo,
  disciplinasCompartilhadas,
  montarMapaDeObjetivos,
  idDoObjetivo,
  partesDoIdDeObjetivo,
  ehIdDeCursoLegado,
} from './objetivos';

const disciplina = (nome, topicos) => ({ nome, topicos });
const topico = (concluido) => ({ nome: 't', concluido });

const cursoComCargos = {
  id: 'curso-1',
  nome: 'PMAL',
  banca: 'Cebraspe',
  prova_data: '2026-07-19',
  cargos: [
    { id: 'oficial', nome: 'Oficial de Estado-Maior', vagas: '12', prova: [{ disciplina: 'Português', questoes: '20' }] },
    { id: 'soldado', nome: 'Soldado do Quadro de Praças' },
  ],
  disciplinasPorCargo: {
    linguaportuguesa: ['oficial', 'soldado'],
    ordemunida: ['soldado'],
  },
};

// Roda na carga: curso salvo em qualquer geracao continua funcionando sem migracao de banco.
describe('migrarCurso', () => {
  it('converte cargos em objetivos, herdando o que e do certame', () => {
    const { objetivos } = migrarCurso(cursoComCargos);
    expect(objetivos).toHaveLength(2);
    expect(objetivos[0]).toMatchObject({
      id: 'oficial',
      nome: 'Oficial de Estado-Maior',
      cargo: 'Oficial de Estado-Maior',
      vagas: '12',
      banca: 'Cebraspe',        // do curso: a banca e do certame, nao do cargo
      prova_data: '2026-07-19',
    });
  });

  it('curso antigo sem cargos vira curso com um objetivo', () => {
    const { objetivos } = migrarCurso({
      id: 'c', nome: 'TJ/AL', cargo: 'Analista', banca: 'FGV', prova_data: '2027-01-10',
    });
    expect(objetivos).toHaveLength(1);
    expect(objetivos[0]).toMatchObject({ id: 'principal', nome: 'Analista', banca: 'FGV' });
  });

  it('nao remigra curso que ja tem objetivos', () => {
    const jaMigrado = { id: 'c', objetivos: [{ id: 'x', nome: 'X' }] };
    expect(migrarCurso(jaMigrado)).toBe(jaMigrado);
  });

  it('nao quebra com curso vazio', () => {
    expect(objetivosDoCurso(null)).toEqual([]);
    expect(objetivosDoCurso({ id: 'c' })).toHaveLength(1);
  });
});

describe('objetivosDaDisciplina', () => {
  it('le o mapa herdado dos cargos', () => {
    expect(objetivosDaDisciplina(cursoComCargos, 'LÍNGUA PORTUGUESA')).toEqual(['oficial', 'soldado']);
    expect(objetivosDaDisciplina(cursoComCargos, 'Ordem Unida')).toEqual(['soldado']);
  });

  // Sem mapa, tudo serve a todos: senao o progresso de quem ja usava zeraria.
  it('sem mapa, a disciplina serve a todos os objetivos', () => {
    const curso = { id: 'c', nome: 'X', cargos: [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }] };
    expect(objetivosDaDisciplina(curso, 'Qualquer')).toEqual(['a', 'b']);
  });
});

describe('progressoPorObjetivo', () => {
  it('conta a disciplina compartilhada em todos os objetivos que ela serve', () => {
    const disciplinas = [
      disciplina('Língua Portuguesa', [topico(true), topico(true)]),
      disciplina('Ordem Unida', [topico(false)]),
    ];
    const [oficial, soldado] = progressoPorObjetivo(cursoComCargos, disciplinas);

    expect(oficial).toMatchObject({ disciplinas: 1, topicos: 2, concluidos: 2, percentual: 100 });
    expect(soldado).toMatchObject({ disciplinas: 2, topicos: 3, concluidos: 2, percentual: 67 });
  });

  it('traz os dados do objetivo junto do progresso', () => {
    const [oficial] = progressoPorObjetivo(cursoComCargos, []);
    expect(oficial.nome).toBe('Oficial de Estado-Maior');
    expect(oficial.questoes).toBe(20);
    expect(oficial.percentual).toBe(0);
  });
});

describe('disciplinasCompartilhadas', () => {
  it('conta so as que servem a mais de um objetivo', () => {
    const disciplinas = [disciplina('Língua Portuguesa', []), disciplina('Ordem Unida', [])];
    expect(disciplinasCompartilhadas(cursoComCargos, disciplinas)).toBe(1);
  });

  it('e zero num curso de objetivo unico', () => {
    expect(disciplinasCompartilhadas({ id: 'c', nome: 'X' }, [disciplina('Y', [])])).toBe(0);
  });
});

describe('montarMapaDeObjetivos', () => {
  it('aceita a chave nova e a antiga', () => {
    expect(montarMapaDeObjetivos([{ nome: 'Português', objetivos: ['a'] }])).toEqual({ portugues: ['a'] });
    expect(montarMapaDeObjetivos([{ nome: 'Português', cargos: ['a'] }])).toEqual({ portugues: ['a'] });
  });
});

// O alvo aponta para um objetivo. O id antigo (curso inteiro) precisa continuar resolvendo,
// senao todo aluno com alvo definido perde o alvo no deploy.
describe('id do objetivo', () => {
  it('monta e desmonta', () => {
    const id = idDoObjetivo('curso-1', 'oficial');
    expect(id).toBe('objetivo:curso-1:oficial');
    expect(partesDoIdDeObjetivo(id)).toEqual({ cursoId: 'curso-1', objetivoId: 'oficial' });
  });

  it('aceita objetivo com dois-pontos no id do curso', () => {
    expect(partesDoIdDeObjetivo('objetivo:curso-1:sub:oficial')).toEqual({
      cursoId: 'curso-1',
      objetivoId: 'sub:oficial',
    });
  });

  it('reconhece o id antigo de curso', () => {
    expect(ehIdDeCursoLegado('curso:curso-1')).toBe(true);
    expect(partesDoIdDeObjetivo('curso:curso-1')).toBeNull();
  });
});
