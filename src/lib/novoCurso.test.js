import { describe, it, expect } from 'vitest';
import { montarCurso } from './novoCurso';
import { objetivosDoCurso } from './objetivos';

describe('montarCurso', () => {
  // O bug que motivou a extracao: o aluno marcava dois cargos na importacao, o modal
  // confirmava "cobrindo 2 objetivos" e a tela mostrava um. Os objetivos nao eram copiados
  // para o curso, e a leitura derivava um unico objetivo do campo `cargo`.
  it('preserva os objetivos que a importacao montou', () => {
    const curso = montarCurso({
      nome: 'PMAL',
      origem: 'ia',
      cargo: 'Oficial de Estado-Maior',
      objetivos: [
        { id: 'oficial', nome: 'Oficial de Estado-Maior', tipo: 'concurso' },
        { id: 'soldado', nome: 'Soldado do Quadro de Praças', tipo: 'concurso' },
      ],
    });

    expect(curso.objetivos).toHaveLength(2);
    expect(objetivosDoCurso(curso).map((o) => o.id)).toEqual(['oficial', 'soldado']);
  });

  it('preserva o mapa disciplina -> objetivo', () => {
    const curso = montarCurso({
      nome: 'PMAL',
      objetivos: [{ id: 'oficial', nome: 'Oficial' }],
      disciplinasPorObjetivo: { portugues: ['oficial'] },
    });
    expect(curso.disciplinasPorObjetivo).toEqual({ portugues: ['oficial'] });
  });

  it('preserva a personalizacao', () => {
    const curso = montarCurso({
      nome: 'Meu plano',
      apelido: 'PM',
      descricao: 'Foco em Penal',
      capa_url: 'https://x/y.png',
      cor: 'verde',
    });
    expect(curso).toMatchObject({ apelido: 'PM', descricao: 'Foco em Penal', capa_url: 'https://x/y.png', cor: 'verde' });
  });

  it('sem objetivos, entrega lista vazia em vez de undefined', () => {
    expect(montarCurso({ nome: 'Livre' }).objetivos).toEqual([]);
  });

  it('deduz o tipo pela origem', () => {
    expect(montarCurso({ nome: 'A', origem: 'ia' }).intent).toBe('concurso');
    expect(montarCurso({ nome: 'A', origem: 'manual' }).intent).toBe('livre');
    expect(montarCurso({ nome: 'A', intent: 'faculdade', origem: 'ia' }).intent).toBe('faculdade');
  });

  it('plano e concurso caem no nome quando nao vem preenchidos', () => {
    const curso = montarCurso({ nome: 'Meu plano' });
    expect(curso.plano).toBe('Meu plano');
    expect(curso.concurso).toBe('Meu plano');
  });
});
