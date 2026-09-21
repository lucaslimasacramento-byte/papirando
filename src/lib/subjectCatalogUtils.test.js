import { describe, it, expect } from 'vitest';
import { canonicalizeSubjectName, normalizeSubjectText } from './subjectCatalogUtils';

// Entradas antigas do catalogo foram cadastradas sem acento. Como o nome canonico
// substituia o do edital, "Noções de Direito Penal" virava "Nocoes de Direito Penal" na tela
// — portugues errado num produto de concurso.
const catalogo = [
  { nome: 'Nocoes de Direito Penal', aliases: [] },
  { nome: 'Matematica', aliases: [] },
  { nome: 'Língua Portuguesa', aliases: ['Portugues', 'Português'] },
];

describe('canonicalizeSubjectName', () => {
  it('mantem o acento do edital quando o catalogo perdeu', () => {
    expect(canonicalizeSubjectName('Noções de Direito Penal', catalogo)).toBe('Noções de Direito Penal');
    expect(canonicalizeSubjectName('Matemática', catalogo)).toBe('Matemática');
  });

  it('usa o catalogo quando ele e quem tem o acento', () => {
    expect(canonicalizeSubjectName('Portugues', catalogo)).toBe('Língua Portuguesa');
  });

  // A regra e so sobre acento: nome de fato diferente continua resolvendo pelo catalogo.
  it('nao deixa de agrupar nomes equivalentes', () => {
    expect(canonicalizeSubjectName('Português', catalogo)).toBe('Língua Portuguesa');
  });

  it('devolve o proprio nome quando nao ha entrada no catalogo', () => {
    expect(canonicalizeSubjectName('Ordem Unida', catalogo)).toBe('Ordem Unida');
  });

  it('nao quebra com vazio', () => {
    expect(canonicalizeSubjectName('', catalogo)).toBe('');
    expect(canonicalizeSubjectName(null, [])).toBe('');
  });
});

describe('normalizeSubjectText', () => {
  it('tira acento, caixa e pontuacao', () => {
    expect(normalizeSubjectText('Noções de Direito Penal')).toBe('nocoes de direito penal');
  });
});
