import { describe, it, expect } from 'vitest';
import {
  CORES_DE_CURSO,
  COR_PADRAO,
  corDoCurso,
  capaDoCurso,
  descricaoDoCurso,
  limparDescricao,
  LIMITE_DA_DESCRICAO,
} from './personalizacaoCurso';

describe('corDoCurso', () => {
  it('devolve a cor escolhida', () => {
    expect(corDoCurso({ cor: 'vinho' }).id).toBe('vinho');
  });

  // Curso criado antes do campo existir nao pode ficar sem cor.
  it('cai na padrao quando nao ha cor ou a cor nao existe', () => {
    expect(corDoCurso({}).id).toBe(COR_PADRAO.id);
    expect(corDoCurso({ cor: 'neon' }).id).toBe(COR_PADRAO.id);
  });

  it('nao tem ids repetidos na paleta', () => {
    expect(new Set(CORES_DE_CURSO.map((c) => c.id)).size).toBe(CORES_DE_CURSO.length);
  });
});

describe('capaDoCurso', () => {
  it('usa a imagem quando o aluno enviou uma capa', () => {
    const capa = capaDoCurso({ capa_url: 'https://x/y.png' });
    expect(capa.tipo).toBe('imagem');
    expect(capa.url).toBe('https://x/y.png');
  });

  it('cai no degrade da cor sem capa', () => {
    const capa = capaDoCurso({ cor: 'verde' });
    expect(capa.tipo).toBe('cor');
    expect(capa.gradiente).toContain(capa.cor.base);
  });

  // String vazia (campo limpo no modal) conta como sem capa.
  it('trata capa vazia como sem capa', () => {
    expect(capaDoCurso({ capa_url: '   ' }).tipo).toBe('cor');
  });
});

describe('descricaoDoCurso', () => {
  it('prefere o que o aluno escreveu', () => {
    expect(descricaoDoCurso({ descricao: 'Meu plano de 2026', cargo: 'Soldado' }))
      .toBe('Meu plano de 2026');
  });

  it('monta a linha automatica quando nao ha descricao', () => {
    expect(descricaoDoCurso({ cargo: 'Soldado', banca: 'IBFC' })).toBe('Soldado - IBFC');
  });

  it('tem texto de reserva quando nao ha dado nenhum', () => {
    expect(descricaoDoCurso({})).toBe('Curso cadastrado');
  });
});

describe('limparDescricao', () => {
  it('junta espacos e corta no limite', () => {
    expect(limparDescricao('  meu\n  plano  ')).toBe('meu plano');
    expect(limparDescricao('a'.repeat(300))).toHaveLength(LIMITE_DA_DESCRICAO);
  });
});
