import { describe, it, expect } from 'vitest';
import { montarMapaDeCargos, cargosDaDisciplina, progressoPorCargo, disciplinasCompartilhadas } from './cargos';

const curso = {
  cargos: [
    { id: 'oficial', nome: 'Oficial de Estado-Maior', prova: [{ disciplina: 'Português', questoes: '20' }] },
    { id: 'soldado', nome: 'Soldado do Quadro de Praças', prova: [] },
  ],
  disciplinasPorCargo: {
    linguaportuguesa: ['oficial', 'soldado'],
    nocoesdeprocessopenal: ['oficial'],
    ordemunida: ['soldado'],
  },
};

const disciplina = (nome, topicos) => ({ nome, topicos });
const topico = (concluido) => ({ nome: 't', concluido });

describe('montarMapaDeCargos', () => {
  it('normaliza o nome e junta os cargos', () => {
    const mapa = montarMapaDeCargos([
      { nome: 'Língua Portuguesa', cargos: ['oficial', 'soldado'] },
      { nome: 'Noções de Processo Penal', cargos: ['oficial'] },
    ]);
    expect(mapa).toEqual({
      linguaportuguesa: ['oficial', 'soldado'],
      nocoesdeprocessopenal: ['oficial'],
    });
  });

  it('ignora disciplina sem nome', () => {
    expect(montarMapaDeCargos([{ nome: '  ', cargos: ['a'] }])).toEqual({});
  });
});

describe('cargosDaDisciplina', () => {
  it('acha pelo nome, sem acento e sem caixa', () => {
    expect(cargosDaDisciplina(curso, 'LINGUA PORTUGUESA')).toEqual(['oficial', 'soldado']);
  });

  // Curso criado antes desta mudanca nao tem mapa: tudo serve ao cargo que existe, senao o
  // progresso dele zeraria da noite para o dia.
  it('sem mapa, a disciplina serve a todos os cargos do curso', () => {
    const antigo = { cargos: [{ id: 'unico', nome: 'Analista' }] };
    expect(cargosDaDisciplina(antigo, 'Qualquer coisa')).toEqual(['unico']);
  });
});

// O coracao do pedido: materia que cai nos dois computa para os dois, estudada uma vez so.
describe('progressoPorCargo', () => {
  it('conta a disciplina compartilhada nos dois cargos', () => {
    const disciplinas = [
      disciplina('Língua Portuguesa', [topico(true), topico(true)]),
      disciplina('Noções de Processo Penal', [topico(false), topico(false)]),
      disciplina('Ordem Unida', [topico(false)]),
    ];

    const [oficial, soldado] = progressoPorCargo(curso, disciplinas);

    // Oficial: Português (2 concluídos) + Processo Penal (0 de 2) = 2 de 4
    expect(oficial).toMatchObject({ disciplinas: 2, topicos: 4, concluidos: 2, percentual: 50 });
    // Soldado: Português (2 de 2) + Ordem Unida (0 de 1) = 2 de 3
    expect(soldado).toMatchObject({ disciplinas: 2, topicos: 3, concluidos: 2, percentual: 67 });
  });

  it('nao divide por zero quando o cargo nao tem topico', () => {
    expect(progressoPorCargo(curso, [])[0].percentual).toBe(0);
  });

  it('soma as questoes do quadro de provas do cargo', () => {
    expect(progressoPorCargo(curso, [])[0].questoes).toBe(20);
  });

  it('devolve vazio quando o curso nao tem cargos', () => {
    expect(progressoPorCargo({}, [])).toEqual([]);
  });
});

describe('disciplinasCompartilhadas', () => {
  it('conta so as que servem a mais de um cargo', () => {
    const disciplinas = [
      disciplina('Língua Portuguesa', []),
      disciplina('Ordem Unida', []),
    ];
    expect(disciplinasCompartilhadas(curso, disciplinas)).toBe(1);
  });

  it('e zero num curso de cargo unico', () => {
    expect(disciplinasCompartilhadas({ cargos: [{ id: 'a' }] }, [disciplina('X', [])])).toBe(0);
  });
});
