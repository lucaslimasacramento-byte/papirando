import { describe, it, expect } from 'vitest';
import {
  CORES_DE_CURSO,
  COR_PADRAO,
  corDoCurso,
  capaDoCurso,
  descricaoDoCurso,
  limparDescricao,
  LIMITE_DA_DESCRICAO,
  recomendacaoDaImagem,
  avisoDaImagem,
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

describe('recomendacaoDaImagem', () => {
  it('diz as medidas, os formatos e o limite', () => {
    const texto = recomendacaoDaImagem('capa');
    expect(texto).toContain('1200 × 300 px');
    expect(texto).toContain('4:1');
    expect(texto).toContain('5 MB');
  });

  it('devolve vazio para uma chave que nao existe', () => {
    expect(recomendacaoDaImagem('bandeira')).toBe('');
  });
});

describe('avisoDaImagem', () => {
  it('nao avisa quando a imagem esta na medida', () => {
    expect(avisoDaImagem('capa', 1200, 300)).toBe('');
    expect(avisoDaImagem('selo', 256, 256)).toBe('');
  });

  // 25% de folga: quase toda foto passa, so avisa quem perde pedaco grande.
  it('aceita uma folga na proporcao', () => {
    expect(avisoDaImagem('capa', 1200, 350)).toBe('');
  });

  it('avisa que a foto quadrada vai ser cortada na capa', () => {
    expect(avisoDaImagem('capa', 1200, 1200)).toContain('mais alta');
  });

  it('avisa quando e larga demais', () => {
    expect(avisoDaImagem('selo', 1200, 300)).toContain('mais larga');
  });

  // Resolucao baixa ganha o aviso mais util: nao adianta a proporcao estar certa.
  it('avisa antes de tudo quando a imagem e pequena demais', () => {
    expect(avisoDaImagem('capa', 400, 100)).toContain('borrada');
  });

  it('nao avisa sem as dimensoes', () => {
    expect(avisoDaImagem('capa', 0, 0)).toBe('');
    expect(avisoDaImagem('capa', undefined, undefined)).toBe('');
  });
});
