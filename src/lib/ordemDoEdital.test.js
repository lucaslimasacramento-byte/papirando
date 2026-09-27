import { describe, it, expect } from 'vitest';
import {
  pesoNaProva,
  ordenarPorPeso,
  porOndeComecar,
  fatiaDaProva,
  filtrarEdital,
  contarTopicos,
  coberturaDaDisciplina,
} from './ordemDoEdital';

const PROVA = [
  { disciplina: 'Língua Portuguesa', questoes: '30', peso: '1' },
  { disciplina: 'Direito Constitucional', questoes: '10', peso: '3' },
  { disciplina: 'Informática', questoes: '5', peso: '1' },
];

function disciplina(nome, feitos = 0, total = 0) {
  return {
    nome,
    topicos: Array.from({ length: total }, (_, i) => ({
      id: `${nome}-${i}`,
      nome: `${nome} tópico ${i + 1}`,
      concluido: i < feitos,
    })),
  };
}

describe('pesoNaProva', () => {
  it('multiplica questões pelo peso', () => {
    expect(pesoNaProva({ nome: 'Direito Constitucional' }, PROVA))
      .toEqual({ questoes: 10, peso: 3, pontos: 30 });
  });

  it('sem peso declarado, peso 1', () => {
    expect(pesoNaProva({ nome: 'Informática' }, PROVA)).toMatchObject({ peso: 1, pontos: 5 });
  });

  it('disciplina fora do quadro não tem peso', () => {
    expect(pesoNaProva({ nome: 'Biologia' }, PROVA)).toBeNull();
    expect(pesoNaProva({ nome: 'Português' }, [])).toBeNull();
  });
});

describe('ordenarPorPeso', () => {
  it('o que mais pontua vem primeiro, e 10 questões peso 3 empatam com 30 peso 1', () => {
    const ordem = ordenarPorPeso(
      [disciplina('Informática'), disciplina('Língua Portuguesa'), disciplina('Direito Constitucional')],
      PROVA
    ).map((d) => d.nome);

    // Português (30x1=30) e Constitucional (10x3=30) empatam — desempata pelo nome.
    expect(ordem).toEqual(['Direito Constitucional', 'Língua Portuguesa', 'Informática']);
  });

  it('disciplina fora do quadro vai para o fim, não para o começo', () => {
    const ordem = ordenarPorPeso(
      [disciplina('Biologia'), disciplina('Língua Portuguesa')],
      PROVA
    ).map((d) => d.nome);

    expect(ordem).toEqual(['Língua Portuguesa', 'Biologia']);
  });

  it('sem quadro de provas, ordena por nome em vez de manter o acaso do banco', () => {
    const ordem = ordenarPorPeso([disciplina('Zoologia'), disciplina('Anatomia')], []).map((d) => d.nome);
    expect(ordem).toEqual(['Anatomia', 'Zoologia']);
  });

  it('não quebra com lista vazia ou nula', () => {
    expect(ordenarPorPeso([], PROVA)).toEqual([]);
    expect(ordenarPorPeso(null, PROVA)).toEqual([]);
  });
});

describe('porOndeComecar', () => {
  it('não é só a que vale mais: é a que vale muito e ainda está parada', () => {
    const [primeira] = porOndeComecar(
      [
        // 30 pontos, mas 90% feita: sobra pouco para ganhar.
        disciplina('Língua Portuguesa', 9, 10),
        // 30 pontos e intocada: é aqui que a próxima hora rende.
        disciplina('Direito Constitucional', 0, 10),
      ],
      PROVA
    );

    expect(primeira.disciplina.nome).toBe('Direito Constitucional');
    expect(primeira.aGanhar).toBe(30);
  });

  it('disciplina 100% concluída sai da lista', () => {
    const nomes = porOndeComecar(
      [disciplina('Língua Portuguesa', 10, 10), disciplina('Informática', 0, 4)],
      PROVA
    ).map((item) => item.disciplina.nome);

    expect(nomes).toEqual(['Informática']);
  });

  it('disciplina fora do quadro de provas não entra na recomendação', () => {
    expect(porOndeComecar([disciplina('Biologia', 0, 10)], PROVA)).toEqual([]);
  });

  it('respeita o limite', () => {
    const todas = [
      disciplina('Língua Portuguesa', 0, 10),
      disciplina('Direito Constitucional', 0, 10),
      disciplina('Informática', 0, 10),
    ];
    expect(porOndeComecar(todas, PROVA, { limite: 2 })).toHaveLength(2);
  });
});

describe('fatiaDaProva', () => {
  it('diz que fração da prova cada disciplina representa', () => {
    const fatias = fatiaDaProva(
      [disciplina('Língua Portuguesa'), disciplina('Direito Constitucional'), disciplina('Informática')],
      PROVA
    );
    // 30 + 30 + 5 = 65 pontos.
    expect(fatias.get('Língua Portuguesa')).toBe(46);
    expect(fatias.get('Informática')).toBe(8);
  });

  it('sem quadro de provas, mapa vazio', () => {
    expect(fatiaDaProva([disciplina('Biologia')], []).size).toBe(0);
  });
});

describe('coberturaDaDisciplina', () => {
  it('conta por tópico concluído', () => {
    expect(coberturaDaDisciplina(disciplina('X', 3, 4))).toBe(75);
  });

  it('sem tópicos, cai no percentual salvo', () => {
    expect(coberturaDaDisciplina({ nome: 'X', topicos: [], percentual: 40 })).toBe(40);
  });
});

describe('filtrarEdital', () => {
  const edital = [
    {
      nome: 'Língua Portuguesa',
      topicos: [
        { id: 't1', nome: 'Crase', concluido: false },
        { id: 't2', nome: 'Ortografia', concluido: true },
      ],
    },
    {
      nome: 'Informática',
      topicos: [{ id: 't3', nome: 'Planilhas', concluido: false }],
    },
  ];

  it('busca alcança o nome do tópico, não só o da disciplina', () => {
    const achado = filtrarEdital(edital, { busca: 'crase' });
    expect(achado).toHaveLength(1);
    expect(achado[0].nome).toBe('Língua Portuguesa');
    expect(achado[0].topicos.map((t) => t.nome)).toEqual(['Crase']);
  });

  it('busca sem acento acha tópico com acento', () => {
    expect(filtrarEdital(edital, { busca: 'ortografia' })[0].topicos).toHaveLength(1);
  });

  it('buscar pelo nome da disciplina mostra a matéria inteira', () => {
    const achado = filtrarEdital(edital, { busca: 'portuguesa' });
    expect(achado[0].topicos).toHaveLength(2);
  });

  it('só pendentes esconde o que já foi concluído', () => {
    const achado = filtrarEdital(edital, { apenasPendentes: true });
    expect(contarTopicos(achado)).toBe(2);
    expect(achado.find((d) => d.nome === 'Língua Portuguesa').topicos.map((t) => t.nome)).toEqual(['Crase']);
  });

  it('disciplina que fica sem tópicos some quando há filtro', () => {
    const achado = filtrarEdital(edital, { busca: 'planilhas' });
    expect(achado.map((d) => d.nome)).toEqual(['Informática']);
  });

  it('sem filtro nenhum, disciplina vazia continua na lista (é ela que leva o botão de adicionar)', () => {
    const comVazia = [...edital, { nome: 'Matemática', topicos: [] }];
    expect(filtrarEdital(comVazia, {}).map((d) => d.nome)).toContain('Matemática');
  });

  it('guarda quantos tópicos a disciplina tem no total, para o contador não mentir', () => {
    const achado = filtrarEdital(edital, { apenasPendentes: true });
    expect(achado.find((d) => d.nome === 'Língua Portuguesa').topicosNoTotal).toBe(2);
  });

  it('não quebra sem argumentos', () => {
    expect(filtrarEdital(null, {})).toEqual([]);
    expect(filtrarEdital(edital)).toHaveLength(2);
  });
});
