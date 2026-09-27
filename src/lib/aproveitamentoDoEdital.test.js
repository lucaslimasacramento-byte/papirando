import { describe, it, expect } from 'vitest';
import {
  aproveitamentoPorTopico,
  doTopico,
  daDisciplina,
  concluidosFragilizados,
  MINIMO_DE_QUESTOES,
  CORTE_DE_ATENCAO,
} from './aproveitamentoDoEdital';

const HISTORICO = [
  { disciplina: 'Língua Portuguesa', topico: 'Crase', acertos: 4, erros: 6 },
  { disciplina: 'Língua Portuguesa', topico: 'Crase', acertos: 2, erros: 8 },
  { disciplina: 'Língua Portuguesa', topico: 'Ortografia', acertos: 9, erros: 1 },
  // Sessão sem tópico: conta na disciplina, não no tópico.
  { disciplina: 'Língua Portuguesa', topico: '', acertos: 5, erros: 5 },
  // Sessão sem questões: só tempo de leitura.
  { disciplina: 'Informática', topico: 'Planilhas', acertos: 0, erros: 0 },
];

describe('aproveitamentoPorTopico', () => {
  const mapas = aproveitamentoPorTopico(HISTORICO);

  it('soma as sessões do mesmo tópico', () => {
    expect(doTopico(mapas, 'Língua Portuguesa', 'Crase'))
      .toMatchObject({ questoes: 20, acertos: 6, percentual: 30 });
  });

  it('casa o nome sem depender de acento ou caixa', () => {
    expect(doTopico(mapas, 'lingua portuguesa', 'CRASE')).toMatchObject({ questoes: 20 });
  });

  it('sessão sem tópico entra no total da disciplina, não no do tópico', () => {
    // 20 de Crase + 10 de Ortografia + 10 sem tópico = 40.
    expect(daDisciplina(mapas, 'Língua Portuguesa')).toMatchObject({ questoes: 40 });
  });

  it('sessão sem questões não vira aproveitamento de 0%', () => {
    expect(doTopico(mapas, 'Informática', 'Planilhas')).toBeNull();
  });

  it('tópico nunca estudado não tem dado', () => {
    expect(doTopico(mapas, 'Língua Portuguesa', 'Regência')).toBeNull();
  });

  it('não quebra com histórico vazio ou nulo', () => {
    expect(doTopico(aproveitamentoPorTopico(null), 'X', 'Y')).toBeNull();
    expect(doTopico(aproveitamentoPorTopico([]), 'X', 'Y')).toBeNull();
  });
});

describe('poucas questões', () => {
  it('abaixo do mínimo, mostra as questões mas não arrisca um percentual', () => {
    const mapas = aproveitamentoPorTopico([
      { disciplina: 'X', topico: 'Y', acertos: 1, erros: 1 },
    ]);
    const resultado = doTopico(mapas, 'X', 'Y');

    expect(resultado).toMatchObject({ questoes: 2, percentual: null, confiavel: false });
    // 1 de 2 não é "50% de domínio" — é acaso.
    expect(resultado.atencao).toBe(false);
  });

  it('no mínimo exato, o percentual já vale', () => {
    const mapas = aproveitamentoPorTopico([
      { disciplina: 'X', topico: 'Y', acertos: 1, erros: MINIMO_DE_QUESTOES - 1 },
    ]);
    expect(doTopico(mapas, 'X', 'Y').confiavel).toBe(true);
  });
});

describe('concluidosFragilizados', () => {
  const disciplinas = [
    {
      nome: 'Língua Portuguesa',
      topicos: [
        // Marcado como feito, mas 30% de acerto em 20 questões.
        { nome: 'Crase', concluido: true },
        // Marcado como feito e 90% de acerto: está mesmo.
        { nome: 'Ortografia', concluido: true },
        // Fraco, mas o aluno não marcou como feito — não é contradição.
        { nome: 'Regência', concluido: false },
      ],
    },
  ];

  it('acha o tópico marcado como concluído que o desempenho não sustenta', () => {
    const achados = concluidosFragilizados(
      disciplinas,
      aproveitamentoPorTopico([
        ...HISTORICO,
        { disciplina: 'Língua Portuguesa', topico: 'Regência', acertos: 1, erros: 9 },
      ])
    );

    expect(achados).toHaveLength(1);
    expect(achados[0]).toMatchObject({ topico: 'Crase', percentual: 30 });
  });

  it('não acusa tópico sem questões suficientes', () => {
    const achados = concluidosFragilizados(
      disciplinas,
      aproveitamentoPorTopico([{ disciplina: 'Língua Portuguesa', topico: 'Crase', acertos: 0, erros: 2 }])
    );
    expect(achados).toEqual([]);
  });

  it('o corte de atenção é o que decide', () => {
    const acertos = CORTE_DE_ATENCAO - 1;
    const achados = concluidosFragilizados(
      [{ nome: 'X', topicos: [{ nome: 'Y', concluido: true }] }],
      aproveitamentoPorTopico([{ disciplina: 'X', topico: 'Y', acertos, erros: 100 - acertos }])
    );
    expect(achados[0].percentual).toBe(CORTE_DE_ATENCAO - 1);
  });

  it('não quebra sem disciplinas', () => {
    expect(concluidosFragilizados(null, aproveitamentoPorTopico(HISTORICO))).toEqual([]);
  });
});
