import { describe, it, expect } from 'vitest';
import {
  pareceEditalDeAbertura,
  avisosDoDocumento,
  parseEditalDate,
  impressaoDoEdital,
  acharLinhaDaProva,
  compatibilidadeDeCargos,
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

// A escolha de dois cargos do mesmo edital é a hora de dizer se eles se aproveitam. Mesma
// conta do Conciliador (comuns sobre a união), feita localmente porque os dados já estão
// em memória.
describe('compatibilidadeDeCargos', () => {
  const cargo = (nome, disciplinas) => ({ title: nome, disciplinas: disciplinas.map((d) => ({ nome: d })) });

  it('nao compara um cargo sozinho', () => {
    const resultado = compatibilidadeDeCargos([cargo('A', ['Português'])]);
    expect(resultado.percentual).toBe(0);
    expect(resultado.comuns).toEqual([]);
  });

  it('calcula comuns sobre a uniao', () => {
    const resultado = compatibilidadeDeCargos([
      cargo('A', ['Português', 'Matemática', 'Direito Penal']),
      cargo('B', ['Português', 'Matemática', 'Informática']),
    ]);
    // 2 comuns numa união de 4 disciplinas
    expect(resultado.comuns).toEqual(['Português', 'Matemática']);
    expect(resultado.uniao).toBe(4);
    expect(resultado.percentual).toBe(50);
  });

  it('ignora acento e caixa ao casar os nomes', () => {
    const resultado = compatibilidadeDeCargos([
      cargo('A', ['LÍNGUA PORTUGUESA']),
      cargo('B', ['Lingua Portuguesa']),
    ]);
    expect(resultado.percentual).toBe(100);
    expect(resultado.comuns).toHaveLength(1);
  });

  // Com tres cargos, o que aparece em dois nao e "comum": o numero precisa significar
  // "estudo uma vez e vale para todos".
  it('com tres cargos so conta o que esta nos tres', () => {
    const resultado = compatibilidadeDeCargos([
      cargo('A', ['Português', 'Matemática']),
      cargo('B', ['Português', 'Matemática']),
      cargo('C', ['Português', 'Direito']),
    ]);
    expect(resultado.comuns).toEqual(['Português']);
  });

  it('conta quantas disciplinas sao exclusivas de cada cargo', () => {
    const resultado = compatibilidadeDeCargos([
      cargo('A', ['Português', 'Direito Penal', 'Direito Civil']),
      cargo('B', ['Português', 'Informática']),
    ]);
    expect(resultado.exclusivos).toEqual([2, 1]);
  });

  it('nao quebra com cargo sem disciplinas', () => {
    const resultado = compatibilidadeDeCargos([cargo('A', ['Português']), { title: 'B' }]);
    expect(resultado.percentual).toBe(0);
  });
});
