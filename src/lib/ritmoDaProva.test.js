import { describe, it, expect } from 'vitest';
import {
  MINUTOS_DA_REDACAO,
  minutosDaProva,
  temRedacao,
  pesoDasDisciplinas,
  perfilDaProva,
  ritmoDeTreino,
  importanciaDoEdital,
  linhaDaDisciplina,
  formatarRitmo,
  formatarDuracao,
} from './ritmoDaProva';

describe('minutosDaProva', () => {
  it('le os formatos que o edital usa', () => {
    expect(minutosDaProva('4 horas')).toBe(240);
    expect(minutosDaProva('4h30')).toBe(270);
    expect(minutosDaProva('3h e 30min')).toBe(210);
    expect(minutosDaProva('240 minutos')).toBe(240);
    expect(minutosDaProva('4:30')).toBe(270);
  });

  it('numero solto pequeno e hora; grande e minuto', () => {
    expect(minutosDaProva('4')).toBe(240);
    expect(minutosDaProva('240')).toBe(240);
  });

  it('devolve 0 quando nao ha o que ler', () => {
    expect(minutosDaProva('')).toBe(0);
    expect(minutosDaProva('Nao encontrado')).toBe(0);
    expect(minutosDaProva(null)).toBe(0);
  });
});

describe('temRedacao', () => {
  it('reconhece a etapa escrita pelos varios nomes', () => {
    expect(temRedacao(['Objetiva', 'Redacao'])).toBe(true);
    expect(temRedacao(['Objetiva', 'Prova Discursiva'])).toBe(true);
    expect(temRedacao(['Objetiva', 'Redação'])).toBe(true);
  });

  it('acha a redacao tambem no quadro de provas', () => {
    expect(temRedacao(['Objetiva'], [{ disciplina: 'Redação Oficial', questoes: '1' }])).toBe(true);
  });

  it('prova so objetiva nao tem redacao', () => {
    expect(temRedacao(['Prova Objetiva', 'Exame médico'])).toBe(false);
    expect(temRedacao([], [])).toBe(false);
  });
});

describe('pesoDasDisciplinas', () => {
  it('peso alto compensa menos questoes', () => {
    const [primeira, segunda] = pesoDasDisciplinas([
      { disciplina: 'Português', questoes: '30', peso: '1' },
      { disciplina: 'Direito Constitucional', questoes: '10', peso: '3' },
    ]);
    // 30x1 = 30 e 10x3 = 30: valem o mesmo, e as duas ficam em 50%.
    expect(primeira.participacao).toBe(50);
    expect(segunda.participacao).toBe(50);
  });

  it('a disciplina que mais pontua vira importancia 5', () => {
    const linhas = pesoDasDisciplinas([
      { disciplina: 'Português', questoes: '40', peso: '1' },
      { disciplina: 'Informática', questoes: '10', peso: '1' },
    ]);
    expect(linhas[0]).toMatchObject({ nome: 'Português', importancia: 5 });
    expect(linhas[1].importancia).toBeLessThan(5);
  });

  it('le "50 questoes" e ignora linha sem numero', () => {
    const linhas = pesoDasDisciplinas([
      { disciplina: 'Português', questoes: '50 questões' },
      { disciplina: 'Sem numero', questoes: '' },
    ]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].questoes).toBe(50);
  });

  it('sem quadro de provas, lista vazia', () => {
    expect(pesoDasDisciplinas([])).toEqual([]);
    expect(pesoDasDisciplinas(null)).toEqual([]);
  });
});

describe('perfilDaProva', () => {
  const prova = [
    { disciplina: 'Português', questoes: '30', peso: '1' },
    { disciplina: 'Direito Constitucional', questoes: '30', peso: '1' },
  ];

  it('desconta a redacao antes de calcular o ritmo', () => {
    const comRedacao = perfilDaProva({ prova, etapas: ['Objetiva', 'Redacao'], duracaoProva: '4 horas' });
    const semRedacao = perfilDaProva({ prova, etapas: ['Objetiva'], duracaoProva: '4 horas' });

    expect(comRedacao.minutosDaRedacao).toBe(MINUTOS_DA_REDACAO);
    // 240 - 90 = 150 minutos para 60 questoes.
    expect(comRedacao.minutosPorQuestao).toBe(2.5);
    // Sem redacao o aluno tem os 240 inteiros: 4 min por questao.
    expect(semRedacao.minutosPorQuestao).toBe(4);
  });

  it('sem duracao no edital, nao inventa ritmo', () => {
    const perfil = perfilDaProva({ prova, etapas: ['Objetiva'], duracaoProva: 'Nao encontrado' });
    expect(perfil.totalQuestoes).toBe(60);
    expect(perfil.minutosPorQuestao).toBe(0);
    expect(perfil.completo).toBe(false);
  });

  it('sem quadro de provas, perfil vazio mas nao quebra', () => {
    const perfil = perfilDaProva({});
    expect(perfil).toMatchObject({ totalQuestoes: 0, minutosPorQuestao: 0, completo: false });
    expect(perfil.disciplinas).toEqual([]);
  });

  it('uma redacao mais longa que a prova nao gera tempo negativo', () => {
    const perfil = perfilDaProva({ prova, etapas: ['Redacao'], duracaoProva: '1 hora' });
    expect(perfil.minutosObjetiva).toBe(0);
    expect(perfil.minutosPorQuestao).toBe(0);
  });
});

describe('ritmoDeTreino', () => {
  it('prova apertada pede treino de velocidade', () => {
    // 120 itens em 3h30 — o classico Cebraspe.
    const perfil = perfilDaProva({
      prova: [{ disciplina: 'Tudo', questoes: '120', peso: '1' }],
      etapas: ['Objetiva'],
      duracaoProva: '3h30',
    });
    expect(ritmoDeTreino(perfil).id).toBe('velocidade');
  });

  it('prova folgada pede profundidade', () => {
    const perfil = perfilDaProva({
      prova: [{ disciplina: 'Tudo', questoes: '40', peso: '1' }],
      etapas: ['Objetiva'],
      duracaoProva: '4 horas',
    });
    expect(ritmoDeTreino(perfil).id).toBe('profundidade');
  });

  it('sem ritmo apurado, nao ha recomendacao', () => {
    expect(ritmoDeTreino(perfilDaProva({}))).toBeNull();
    expect(ritmoDeTreino(null)).toBeNull();
  });
});

describe('importanciaDoEdital / linhaDaDisciplina', () => {
  const perfil = perfilDaProva({
    prova: [
      { disciplina: 'Língua Portuguesa', questoes: '40', peso: '1' },
      { disciplina: 'Noções de Informática', questoes: '10', peso: '1' },
    ],
    etapas: ['Objetiva'],
    duracaoProva: '4 horas',
  });

  it('casa o nome do edital com o nome da disciplina do aluno', () => {
    expect(linhaDaDisciplina(perfil, 'Portugues')).toMatchObject({ questoes: 40, importancia: 5 });
    expect(linhaDaDisciplina(perfil, 'Informática')).toMatchObject({ questoes: 10 });
  });

  it('disciplina fora do quadro nao tem peso do edital', () => {
    expect(linhaDaDisciplina(perfil, 'Direito Penal')).toBeNull();
    expect(linhaDaDisciplina(perfil, '')).toBeNull();
  });

  it('o mapa tem uma entrada por disciplina do quadro', () => {
    expect(importanciaDoEdital(perfil).size).toBe(2);
    expect(importanciaDoEdital(null).size).toBe(0);
  });
});

describe('formatacao', () => {
  it('ritmo em minutos e segundos', () => {
    expect(formatarRitmo(1.75)).toBe('1min45');
    expect(formatarRitmo(2)).toBe('2min');
    expect(formatarRitmo(0.5)).toBe('30s');
    expect(formatarRitmo(0)).toBe('');
  });

  it('duracao em horas', () => {
    expect(formatarDuracao(240)).toBe('4h');
    expect(formatarDuracao(270)).toBe('4h30');
    expect(formatarDuracao(45)).toBe('45min');
    expect(formatarDuracao(0)).toBe('');
  });
});
