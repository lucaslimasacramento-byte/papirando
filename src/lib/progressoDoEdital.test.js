import { describe, it, expect } from 'vitest';
import { progressoDoEdital } from './progressoDoEdital';

describe('progressoDoEdital', () => {
  // O caso que motivou tudo: edital recem-subido, nada estudado.
  it('e zero quando nenhum topico foi concluido', () => {
    expect(progressoDoEdital([
      { nome: 'Biologia', topicos: [{ concluido: false }, { concluido: false }] },
      { nome: 'Informática', topicos: [{ concluido: false }] },
    ])).toBe(0);
  });

  it('conta por topico, nao por disciplina', () => {
    // 1 de 4 na grande + 1 de 1 na pequena = 2 de 5 = 40%. A media das disciplinas daria
    // 62%, premiando a disciplina pequena.
    expect(progressoDoEdital([
      { topicos: [{ concluido: true }, { concluido: false }, { concluido: false }, { concluido: false }] },
      { topicos: [{ concluido: true }] },
    ])).toBe(40);
  });

  it('chega a 100 com tudo concluido', () => {
    expect(progressoDoEdital([{ topicos: [{ concluido: true }, { concluido: true }] }])).toBe(100);
  });

  it('cai no percentual da disciplina quando nao ha topicos', () => {
    expect(progressoDoEdital([{ percentual: 60 }, { percentual: 40 }])).toBe(50);
  });

  it('e zero sem disciplina nenhuma', () => {
    expect(progressoDoEdital([])).toBe(0);
    expect(progressoDoEdital(null)).toBe(0);
  });
});
