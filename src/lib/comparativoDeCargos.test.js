import { describe, it, expect } from 'vitest';
import { fichaComparativa, provasComparativas, valorOuTraco, nomeDoCargo } from './comparativoDeCargos';

const CARGOS = [
  {
    roleName: 'Soldado',
    vagas: '200',
    salario: 'R$ 6.067,51',
    escolaridade: 'Ensino médio completo',
    examDate: '19/07/2026',
    prova: [
      { disciplina: 'Língua Portuguesa', questoes: '20', peso: '1' },
      { disciplina: 'Matemática', questoes: '10', peso: '1' },
    ],
  },
  {
    roleName: 'Oficial',
    vagas: 'Não encontrado',
    salario: 'R$ 9.000,00',
    escolaridade: 'Ensino médio completo',
    examDate: '19/07/2026',
    prova: [
      { disciplina: 'Lingua Portuguesa', questoes: '30', peso: '2' },
      { disciplina: 'Língua Inglesa', questoes: '10', peso: '1' },
    ],
  },
];

describe('valorOuTraco', () => {
  it('troca vazio e "Nao encontrado" por traco', () => {
    expect(valorOuTraco('')).toBe('—');
    expect(valorOuTraco('Não encontrado')).toBe('—');
    expect(valorOuTraco('nao encontrado')).toBe('—');
    expect(valorOuTraco(' 200 ')).toBe('200');
  });
});

describe('nomeDoCargo', () => {
  it('cai no titulo e depois num rotulo numerado', () => {
    expect(nomeDoCargo({ roleName: 'Soldado' })).toBe('Soldado');
    expect(nomeDoCargo({ title: 'Cargo X' })).toBe('Cargo X');
    expect(nomeDoCargo({}, 2)).toBe('Cargo 3');
  });
});

describe('fichaComparativa', () => {
  it('tem uma coluna por cargo e uma linha por campo', () => {
    const { colunas, linhas } = fichaComparativa(CARGOS);
    expect(colunas).toEqual(['Soldado', 'Oficial']);
    expect(linhas.find((l) => l.label === 'Remuneração').valores).toEqual(['R$ 6.067,51', 'R$ 9.000,00']);
  });

  // O que o aluno procura e justamente o que muda entre os cargos.
  it('marca as linhas em que os cargos diferem', () => {
    const { linhas } = fichaComparativa(CARGOS);
    expect(linhas.find((l) => l.label === 'Remuneração').diferente).toBe(true);
    expect(linhas.find((l) => l.label === 'Escolaridade').diferente).toBe(false);
  });

  it('nao marca diferenca com um cargo so', () => {
    const { linhas } = fichaComparativa([CARGOS[0]]);
    expect(linhas.every((l) => l.diferente === false)).toBe(true);
  });

  // Linha de traco de ponta a ponta ocupa espaco sem informar.
  it('some com o campo que nenhum cargo tem', () => {
    const { linhas } = fichaComparativa(CARGOS);
    expect(linhas.some((l) => l.label === 'Lotação')).toBe(false);
  });

  it('mantem o campo que pelo menos um cargo tem', () => {
    const { linhas } = fichaComparativa(CARGOS);
    expect(linhas.find((l) => l.label === 'Vagas').valores).toEqual(['200', '—']);
  });

  // A taxa e do certame, nao do cargo.
  it('repete a taxa de inscricao em todas as colunas', () => {
    const { linhas } = fichaComparativa(CARGOS, { inscricaoValor: 'R$ 120,00' });
    const taxa = linhas.find((l) => l.label === 'Taxa de inscrição');
    expect(taxa.valores).toEqual(['R$ 120,00', 'R$ 120,00']);
    expect(taxa.diferente).toBe(false);
  });

  it('omite a taxa quando o edital nao trouxe', () => {
    expect(fichaComparativa(CARGOS).linhas.some((l) => l.label === 'Taxa de inscrição')).toBe(false);
  });
});

describe('provasComparativas', () => {
  it('junta os quadros numa tabela so, unindo nomes equivalentes', () => {
    const { linhas, temDados } = provasComparativas(CARGOS);
    expect(temDados).toBe(true);
    expect(linhas).toHaveLength(3);
  });

  it('marca quando a disciplina pesa diferente entre os cargos', () => {
    const { linhas } = provasComparativas(CARGOS);
    const portugues = linhas.find((l) => /portugu/i.test(l.disciplina));
    expect(portugues.celulas[0].questoes).toBe(20);
    expect(portugues.celulas[1].questoes).toBe(30);
    expect(portugues.diferente).toBe(true);
    expect(portugues.emTodos).toBe(true);
  });

  it('deixa vazia a celula do cargo que nao tem a disciplina', () => {
    const { linhas } = provasComparativas(CARGOS);
    const inglesa = linhas.find((l) => l.disciplina === 'Língua Inglesa');
    expect(inglesa.celulas[0]).toBeNull();
    expect(inglesa.emTodos).toBe(false);
  });

  it('soma o total de questoes de cada cargo', () => {
    expect(provasComparativas(CARGOS).totais).toEqual([30, 40]);
  });

  it('ordena da disciplina que mais pesa para a que menos pesa', () => {
    const { linhas } = provasComparativas(CARGOS);
    expect(/portugu/i.test(linhas[0].disciplina)).toBe(true);
  });

  it('avisa quando nenhum cargo trouxe quadro de provas', () => {
    expect(provasComparativas([{ roleName: 'A' }]).temDados).toBe(false);
    expect(provasComparativas(null).temDados).toBe(false);
  });
});

describe('provasComparativas com os blocos do edital', () => {
  // Bug real: "Conhecimentos Basicos" e so ruido para mesmaDisciplina, entao o bloco nao
  // casava nem consigo mesmo e aparecia duas vezes — uma por cargo — em vez de lado a lado.
  const blocos = [
    { roleName: 'Soldado', prova: [
      { disciplina: 'Conhecimentos Básicos', questoes: '50', peso: '1' },
      { disciplina: 'Conhecimentos Específicos', questoes: '70', peso: '1' },
    ] },
    { roleName: 'Oficial', prova: [
      { disciplina: 'Conhecimentos Básicos', questoes: '60', peso: '1' },
      { disciplina: 'Conhecimentos Específicos', questoes: '80', peso: '2' },
    ] },
  ];

  it('poe o mesmo bloco numa linha so', () => {
    const { linhas } = provasComparativas(blocos);
    expect(linhas).toHaveLength(2);
    const basicos = linhas.find((l) => /básicos/i.test(l.disciplina));
    expect(basicos.celulas.map((c) => c.questoes)).toEqual([50, 60]);
    expect(basicos.diferente).toBe(true);
  });

  it('ignora acento e caixa na hora de casar o bloco', () => {
    const { linhas } = provasComparativas([
      { roleName: 'A', prova: [{ disciplina: 'CONHECIMENTOS BASICOS', questoes: '10' }] },
      { roleName: 'B', prova: [{ disciplina: 'Conhecimentos Básicos', questoes: '20' }] },
    ]);
    expect(linhas).toHaveLength(1);
  });
});
