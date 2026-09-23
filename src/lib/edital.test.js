import { describe, it, expect } from 'vitest';
import {
  pareceEditalDeAbertura,
  avisosDoDocumento,
  parseEditalDate,
  impressaoDoEdital,
  acharLinhaDaProva,
  compatibilidadeDeCargos,
  mesmaDisciplina,
  mesclarDisciplinasDeCargos,
  matrizDeDisciplinas,
} from './edital';

const EDITAL = 'a'.repeat(25000);
const COMUNICADO = 'Comunicado do prazo de recurso contra o gabarito preliminar.';

describe('pareceEditalDeAbertura', () => {
  it('aceita um documento do tamanho de um edital', () => {
    expect(pareceEditalDeAbertura(EDITAL)).toBe(true);
  });

  it('recusa um comunicado de uma pagina', () => {
    // Na amostra real, os 3 nao-editais tinham 1,3k, 4k e 18,6k caracteres.
    expect(pareceEditalDeAbertura(COMUNICADO)).toBe(false);
    expect(pareceEditalDeAbertura('a'.repeat(18600))).toBe(false);
  });
});

describe('avisosDoDocumento', () => {
  it('nao avisa nada quando o documento parece um edital limpo', () => {
    expect(avisosDoDocumento(EDITAL)).toEqual([]);
  });

  it('nao avisa nada quando nao ha texto', () => {
    expect(avisosDoDocumento('')).toEqual([]);
  });

  it('avisa que o documento e curto demais, sem bloquear', () => {
    const avisos = avisosDoDocumento(COMUNICADO);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatch(/curto para um edital de abertura/i);
    // O aluno pode ter colado so o conteudo programatico — o aviso diz que da para seguir.
    expect(avisos[0]).toMatch(/pode seguir/i);
  });

  it('avisa quando o edital se declara retificado', () => {
    // O plano fica pendurado no arquivo enviado; retificacao posterior nao chega sozinha.
    const texto = `EDITAL DE ABERTURA N 01/2026 RETIFICADO EM 14.05.2026 ${EDITAL}`;
    expect(avisosDoDocumento(texto).some((a) => /retificado/i.test(a))).toBe(true);
  });

  it('nao confunde "retificacao" citada la no fim do edital', () => {
    const texto = `${EDITAL} eventuais retificacoes serao publicadas no diario oficial.`;
    expect(avisosDoDocumento(texto)).toEqual([]);
  });

  it('avisa quando o nome do arquivo sugere outro tipo de documento', () => {
    const avisos = avisosDoDocumento(EDITAL, { nomeDoArquivo: 'resultado-final.pdf' });
    expect(avisos.some((a) => a.includes('resultado-final.pdf'))).toBe(true);
  });
});

describe('parseEditalDate', () => {
  // A data da prova e o eixo de Planejamento, Metas e Revisoes. O curso guarda ISO, e a IA
  // devolve a data como o edital escreve.
  it.each([
    ['26/04/2026', '2026-04-26'],
    ['5/3/2026', '2026-03-05'],
    ['26.04.2026', '2026-04-26'],
    ['2026-04-26', '2026-04-26'],
    ['26 de abril de 2026', '2026-04-26'],
    ['26 de marco de 2026', '2026-03-26'],
    ['26 de março de 2026', '2026-03-26'],
    ['prova prevista para 26/04/2026, conforme cronograma', '2026-04-26'],
  ])('converte %s', (entrada, esperado) => {
    expect(parseEditalDate(entrada)).toBe(esperado);
  });

  it.each(['', null, undefined, 'Nao encontrado', 'Não encontrado', 'a definir', '26 de brumario de 2026'])(
    'devolve vazio para %s',
    (entrada) => {
      expect(parseEditalDate(entrada)).toBe('');
    }
  );
});

describe('impressaoDoEdital', () => {
  it('da a mesma impressao para o mesmo texto', () => {
    expect(impressaoDoEdital('EDITAL 01/2026')).toBe(impressaoDoEdital('EDITAL 01/2026'));
  });

  it('ignora diferenca de espaco em branco', () => {
    // A extracao do pdfjs varia no espacamento; isso nao e versao nova do edital.
    expect(impressaoDoEdital('EDITAL  01/2026')).toBe(impressaoDoEdital('EDITAL 01/2026'));
  });

  it('muda quando o conteudo muda', () => {
    expect(impressaoDoEdital('EDITAL 01/2026')).not.toBe(impressaoDoEdital('EDITAL 02/2026'));
  });

  it('devolve vazio sem texto', () => {
    expect(impressaoDoEdital('')).toBe('');
  });
});

describe('acharLinhaDaProva', () => {
  const PROVA = [
    { disciplina: 'Língua Portuguesa', questoes: '10', peso: '1' },
    { disciplina: 'Matemática e Raciocínio Lógico', questoes: '8', peso: '1' },
    { disciplina: 'Conhecimentos Específicos', questoes: '15', peso: '2' },
  ];

  it('casa o nome exato', () => {
    expect(acharLinhaDaProva(PROVA, 'Conhecimentos Específicos').questoes).toBe('15');
  });

  it('ignora acento e caixa', () => {
    // O nome da disciplina passa por canonicalizacao ao entrar no app, entao o que o quadro
    // diz e o que o plano guarda nem sempre batem caractere a caractere.
    expect(acharLinhaDaProva(PROVA, 'LINGUA PORTUGUESA').questoes).toBe('10');
  });

  it('casa quando um nome contem o outro', () => {
    expect(acharLinhaDaProva(PROVA, 'Matemática').questoes).toBe('8');
  });

  it('devolve null quando a disciplina nao esta no quadro', () => {
    expect(acharLinhaDaProva(PROVA, 'Informática')).toBeNull();
  });

  it('devolve null sem quadro de provas', () => {
    // 2 dos 13 editais do teste nao trazem o quadro — a tela tem que aguentar isso.
    expect(acharLinhaDaProva([], 'Língua Portuguesa')).toBeNull();
    expect(acharLinhaDaProva(undefined, 'Língua Portuguesa')).toBeNull();
    expect(acharLinhaDaProva(PROVA, '')).toBeNull();
  });
});

// Edital chama a mesma matéria de três jeitos no mesmo documento. Comparando o nome cru,
// um cargo que é o outro com disciplinas a mais aparecia como "31% de compatibilidade".
describe('mesmaDisciplina', () => {
  it.each([
    ['Noções de Informática', 'Informática'],
    ['Informática Básica', 'Noções de Informática'],
    ['Língua Portuguesa', 'Português'],
    ['Direito Penal', 'Direito Penal Militar'],
    ['História', 'História do Brasil'],
    ['Legislação Pertinente ao Policial Militar', 'Legislação ao Policial Militar'],
  ])('casa %s com %s', (a, b) => {
    expect(mesmaDisciplina(a, b)).toBe(true);
  });

  it.each([
    ['Direito Penal', 'Direito Administrativo'],
    ['Matemática', 'Raciocínio Lógico'],
    // "Direito" sozinho não diz qual direito é: deixar casar juntaria disciplinas distintas.
    ['Direito', 'Direito Constitucional'],
    ['Legislação', 'Legislação de Trânsito'],
    ['História', 'Geografia'],
  ])('nao casa %s com %s', (a, b) => {
    expect(mesmaDisciplina(a, b)).toBe(false);
  });

  it('nao casa com nome vazio', () => {
    expect(mesmaDisciplina('', 'Português')).toBe(false);
  });
});

describe('compatibilidadeDeCargos', () => {
  const cargo = (nome, disciplinas) => ({ title: nome, disciplinas: disciplinas.map((d) => ({ nome: d })) });

  it('nao compara um cargo sozinho', () => {
    const resultado = compatibilidadeDeCargos([cargo('A', ['Português'])]);
    expect(resultado.aproveitamento).toBe(0);
    expect(resultado.comuns).toEqual([]);
  });

  // O caso que motivou a mudança: oficial é o soldado com matérias a mais. A razão sobre a
  // união dava 60% e sugeria dois estudos; o aproveitamento diz o que importa — quem estuda
  // o maior já cobre o menor inteiro.
  it('reconhece um cargo contido no outro', () => {
    const resultado = compatibilidadeDeCargos([
      cargo('Soldado', ['Língua Portuguesa', 'Matemática', 'Noções de Informática']),
      cargo('Oficial', ['Português', 'Matemática', 'Informática', 'Direito Penal Militar', 'História']),
    ]);
    expect(resultado.contido).toBe(true);
    expect(resultado.aproveitamento).toBe(100);
    expect(resultado.acrescimo).toBe(0);
  });

  it('conta quantas disciplinas o segundo cargo acrescenta', () => {
    const resultado = compatibilidadeDeCargos([
      cargo('A', ['Português', 'Matemática', 'Direito Penal']),
      cargo('B', ['Português', 'Informática']),
    ]);
    // União: Português, Matemática, Direito Penal, Informática = 4; maior lista = 3
    expect(resultado.acrescimo).toBe(1);
    expect(resultado.contido).toBe(false);
  });

  it('nomeia as disciplinas exclusivas de cada cargo', () => {
    const resultado = compatibilidadeDeCargos([
      cargo('Soldado', ['Português', 'Direito Penal', 'Direito Civil']),
      cargo('Oficial', ['Português', 'Informática']),
    ]);
    expect(resultado.exclusivos[0]).toEqual({
      nome: 'Soldado',
      disciplinas: ['Direito Penal', 'Direito Civil'],
    });
    expect(resultado.exclusivos[1]).toEqual({ nome: 'Oficial', disciplinas: ['Informática'] });
  });

  it('ignora acento, caixa e ruido no nome ao casar', () => {
    const resultado = compatibilidadeDeCargos([
      cargo('A', ['LÍNGUA PORTUGUESA', 'Noções de Informática']),
      cargo('B', ['Português', 'Informática Básica']),
    ]);
    expect(resultado.aproveitamento).toBe(100);
    expect(resultado.uniao).toBe(2);
  });

  // Com tres cargos, o que aparece em dois nao e "comum": o numero precisa significar
  // "estudo uma vez e vale para todos".
  it('com tres cargos so conta o que esta nos tres', () => {
    const resultado = compatibilidadeDeCargos([
      cargo('A', ['Português', 'Matemática']),
      cargo('B', ['Português', 'Matemática']),
      cargo('C', ['Português', 'Direito Civil']),
    ]);
    expect(resultado.comuns).toEqual(['Português']);
  });

  it('nao quebra com cargo sem disciplinas', () => {
    const resultado = compatibilidadeDeCargos([cargo('A', ['Português']), { title: 'B' }]);
    expect(resultado.aproveitamento).toBe(0);
  });
});

// Revisar cargo a cargo desfaz o raciocínio da tela anterior: o aluno viu que os dois
// cargos se aproveitam e aí teria que conferir duas listas quase iguais.
describe('mesclarDisciplinasDeCargos', () => {
  const cargo = (id, disciplinas) => ({
    id,
    title: id,
    disciplinas: disciplinas.map(([nome, topicos = []]) => ({ nome, topicos })),
  });

  it('junta a mesma disciplina dos dois cargos numa linha so', () => {
    const itens = mesclarDisciplinasDeCargos([
      cargo('oficial', [['Língua Portuguesa'], ['Direito Penal Militar']]),
      cargo('soldado', [['Português'], ['Matemática']]),
    ]);

    expect(itens).toHaveLength(3);
    expect(itens[0].nome).toBe('Língua Portuguesa');
    expect(itens[0].cargos).toEqual(['oficial', 'soldado']);
    expect(itens[1].cargos).toEqual(['oficial']);
    expect(itens[2].cargos).toEqual(['soldado']);
  });

  // A mesma disciplina costuma ter recortes diferentes para oficial e para praça. Levar o
  // tópico de um para o curso do outro colocaria no plano conteúdo que não cai na prova.
  it('marca em qual cargo cada topico cai', () => {
    const itens = mesclarDisciplinasDeCargos([
      cargo('oficial', [['Português', ['Crase', 'Redação oficial']]]),
      cargo('soldado', [['Português', ['Crase']]]),
    ]);

    expect(itens).toHaveLength(1);
    expect(itens[0].topicos.map((t) => t.nome)).toEqual(['Crase', 'Redação oficial']);
    expect(itens[0].topicos[0].cargos).toEqual(['oficial', 'soldado']);
    expect(itens[0].topicos[1].cargos).toEqual(['oficial']);
  });

  it('respeita o preMarcar', () => {
    const itens = mesclarDisciplinasDeCargos([cargo('a', [['Português', ['Crase']]])], false);
    expect(itens[0].incluir).toBe(false);
    expect(itens[0].topicos[0].incluir).toBe(false);
  });

  it('ignora disciplina sem nome', () => {
    const itens = mesclarDisciplinasDeCargos([cargo('a', [['  '], ['Português']])]);
    expect(itens).toHaveLength(1);
  });

  it('funciona com um cargo so', () => {
    const itens = mesclarDisciplinasDeCargos([cargo('a', [['Português'], ['Matemática']])]);
    expect(itens.map((i) => i.cargos)).toEqual([['a'], ['a']]);
  });
});

describe('matrizDeDisciplinas', () => {
  const cargos = [
    {
      roleName: 'Soldado',
      disciplinas: [{ nome: 'Língua Portuguesa' }, { nome: 'Direito Penal' }],
    },
    {
      roleName: 'Oficial',
      disciplinas: [{ nome: 'Lingua Portuguesa' }, { nome: 'Noções de Direito Penal' }, { nome: 'Língua Inglesa' }],
    },
  ];

  it('tem uma coluna por cargo', () => {
    expect(matrizDeDisciplinas(cargos).colunas).toEqual(['Soldado', 'Oficial']);
  });

  // O ponto da tela: nada fica escondido atras de um "+3".
  it('lista toda disciplina uma vez so, unindo nomes equivalentes', () => {
    const { linhas, total } = matrizDeDisciplinas(cargos);
    expect(total).toBe(3);
    expect(linhas.map((l) => l.nome)).toContain('Língua Inglesa');
  });

  it('marca em quais cargos cada disciplina cai', () => {
    const { linhas } = matrizDeDisciplinas(cargos);
    const inglesa = linhas.find((l) => l.nome === 'Língua Inglesa');
    expect(inglesa.em).toEqual([false, true]);
    expect(inglesa.quantos).toBe(1);
  });

  // "Nocoes de Direito Penal" diz mais que "Direito Penal".
  it('fica com o nome mais completo entre os equivalentes', () => {
    const { linhas } = matrizDeDisciplinas(cargos);
    expect(linhas.some((l) => l.nome === 'Noções de Direito Penal')).toBe(true);
    expect(linhas.some((l) => l.nome === 'Direito Penal')).toBe(false);
  });

  it('poe o que cai em todos primeiro', () => {
    const { linhas, emTodos } = matrizDeDisciplinas(cargos);
    expect(emTodos).toBe(2);
    expect(linhas[0].quantos).toBe(2);
    expect(linhas[linhas.length - 1].quantos).toBe(1);
  });

  it('aguenta tres cargos', () => {
    const { colunas, linhas } = matrizDeDisciplinas([
      ...cargos,
      { roleName: 'Bombeiro', disciplinas: [{ nome: 'Língua Portuguesa' }] },
    ]);
    expect(colunas).toHaveLength(3);
    expect(linhas.find((l) => l.nome === 'Língua Portuguesa').em).toEqual([true, true, true]);
  });

  it('devolve vazio sem cargo nenhum', () => {
    expect(matrizDeDisciplinas([])).toMatchObject({ colunas: [], linhas: [], total: 0 });
    expect(matrizDeDisciplinas(null).total).toBe(0);
  });
});
