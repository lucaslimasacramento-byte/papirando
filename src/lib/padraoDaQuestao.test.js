import { describe, it, expect } from 'vitest';
import {
  normalizarQuestao,
  oQueFalta,
  questaoEstaPronta,
  sqlDeImportacao,
  idDaAlternativa,
  tipoDaQuestao,
  normalizarDificuldade,
  paraPromptDeComentario,
  TIPO_CERTO_ERRADO,
  TIPO_MULTIPLA,
} from './padraoDaQuestao';

const DO_ENEM = {
  source: 'enem.dev',
  external_id: 'enem-2023-157',
  discipline: 'matematica',
  year: 2023,
  statement: 'O gráfico apresenta a massa corporal ![](https://enem.dev/g.png) Qual é o percentual?',
  alternatives: [
    { letter: 'a', text: '10', isCorrect: false },
    { letter: 'b', text: '20', isCorrect: true },
    { letter: 'c', text: '30', isCorrect: false },
    { letter: 'd', text: '50', isCorrect: false },
    { letter: 'e', text: '70', isCorrect: false },
  ],
};

describe('normalizarQuestao', () => {
  it('leva a questao do ENEM ao padrao, com a disciplina apresentavel', () => {
    const questao = normalizarQuestao(DO_ENEM);
    expect(questao.disciplina).toBe('Matemática');
    expect(questao.ano).toBe('2023');
    expect(questao.tipo).toBe(TIPO_MULTIPLA);
    expect(questao.gabarito).toBe('B');
    expect(questao.alternativas.map((item) => item.id)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('o enunciado continua em markdown — separar figura e trabalho da tela', () => {
    expect(normalizarQuestao(DO_ENEM).enunciado).toContain('![](https://enem.dev/g.png)');
  });

  it('reconcilia a marcacao de correta com o gabarito declarado', () => {
    // O pior defeito possivel num banco de questoes: o aluno acertar e a tela dizer que
    // errou. Acontece quando a fonte manda gabarito numa linha e marca outra alternativa.
    const questao = normalizarQuestao({
      gabarito: 'c)',
      alternativas: [
        { id: 'A', label: 'um', isCorrect: true },
        { id: 'B', label: 'dois' },
        { id: 'C', label: 'três' },
      ],
    });
    expect(questao.gabarito).toBe('C');
    expect(questao.alternativas.filter((item) => item.isCorrect).map((item) => item.id)).toEqual(['C']);
  });

  it('le alternativa que chegou como texto com a letra grudada', () => {
    const questao = normalizarQuestao({
      alternativas: ['A) Certo', 'B - Errado'],
      gabarito: 'A',
    });
    expect(questao.alternativas).toEqual([
      { id: 'A', label: 'Certo', isCorrect: true },
      { id: 'B', label: 'Errado', isCorrect: false },
    ]);
    expect(questao.tipo).toBe(TIPO_CERTO_ERRADO);
  });
});

describe('idDaAlternativa', () => {
  it('aceita as grafias que as fontes usam', () => {
    ['C', 'c', 'c)', ' C ', 'letra C', 'C -'].forEach((valor) => {
      expect(idDaAlternativa(valor)).toBe('C');
    });
  });
});

describe('tipoDaQuestao', () => {
  it('duas alternativas e certo/errado; o resto e multipla escolha', () => {
    expect(tipoDaQuestao([{ id: 'C' }, { id: 'E' }])).toBe(TIPO_CERTO_ERRADO);
    expect(tipoDaQuestao([{ id: 'A' }, { id: 'B' }, { id: 'C' }])).toBe(TIPO_MULTIPLA);
  });

  it('o tipo declarado pela fonte ganha da contagem', () => {
    expect(tipoDaQuestao([{ id: 'A' }, { id: 'B' }], 'multipla escolha')).toBe(TIPO_MULTIPLA);
  });
});

describe('normalizarDificuldade', () => {
  it('converge para os tres valores que a tabela aceita', () => {
    expect(normalizarDificuldade('easy')).toBe('Facil');
    expect(normalizarDificuldade('difícil')).toBe('Dificil');
    expect(normalizarDificuldade('')).toBe('Media');
  });
});

describe('oQueFalta', () => {
  it('separa o que impede a gravacao do que e so aviso', () => {
    const questao = normalizarQuestao(DO_ENEM);
    const falta = oQueFalta(questao);
    expect(falta.impedem).toEqual([]);
    // O comentario nao bloqueia: o app gera sob demanda na primeira abertura.
    expect(falta.avisos).toContain('comentário');
  });

  it('gabarito que nao casa com alternativa nenhuma impede', () => {
    const questao = normalizarQuestao({
      enunciado: 'texto',
      alternativas: [{ id: 'A', label: 'um' }, { id: 'B', label: 'dois' }],
      gabarito: 'D',
    });
    expect(oQueFalta(questao).impedem).toContain('gabarito não corresponde a nenhuma alternativa');
    expect(questaoEstaPronta(questao)).toBe(false);
  });

  it('sem enunciado e sem gabarito, os dois aparecem', () => {
    const falta = oQueFalta(normalizarQuestao({}));
    expect(falta.impedem).toEqual(expect.arrayContaining(['enunciado', 'alternativas', 'gabarito']));
  });
});

describe('sqlDeImportacao', () => {
  it('gera insert idempotente por (source, external_id)', () => {
    const sql = sqlDeImportacao([normalizarQuestao(DO_ENEM)]);
    expect(sql).toContain('on conflict (source, external_id) do update set');
    expect(sql).toContain("'enem-2023-157'");
    expect(sql).toContain('::jsonb');
  });

  it('nao sobrescreve comentario existente com vazio na reimportacao', () => {
    const sql = sqlDeImportacao([normalizarQuestao(DO_ENEM)]);
    expect(sql).toContain("case when excluded.explicacao <> '' then excluded.explicacao else questions.explicacao end");
  });

  it('escapa aspas simples do enunciado', () => {
    const sql = sqlDeImportacao([normalizarQuestao({
      ...DO_ENEM,
      statement: "O autor diz 'basta' ao leitor.",
    })]);
    expect(sql).toContain("''basta''");
  });

  it('questao incompleta nao entra no SQL', () => {
    expect(sqlDeImportacao([normalizarQuestao({ statement: 'só isso' })])).toBe('');
  });

  it('lote vazio devolve string vazia, nao SQL quebrado', () => {
    expect(sqlDeImportacao([])).toBe('');
  });
});

describe('paraPromptDeComentario', () => {
  it('manda texto, nunca a URL da figura', () => {
    const prompt = paraPromptDeComentario(normalizarQuestao(DO_ENEM));
    expect(JSON.stringify(prompt)).not.toContain('https://');
    expect(prompt.gabarito).toBe('B');
  });
});
