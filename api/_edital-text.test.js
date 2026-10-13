import { describe, it, expect } from 'vitest';
import {
  acharLinhaDoConteudo,
  acharLinhaDoQuadro,
  prepararTextoEdital,
  CHARS_TOTAL,
} from './_edital-text.js';

// Monta um edital sintético com o mesmo formato dos reais: um miolo longo de regras de
// inscrição e o anexo de conteúdo programático lá no fim.
function editalFalso({ cabecalhoAnexo, chars = CHARS_TOTAL * 2 }) {
  const regras = Array.from(
    { length: Math.ceil(chars / 80) },
    (_, i) => `${i + 1}.1 Do prazo de inscricao e das condicoes gerais de participacao no certame.`
  ).join('\n');

  return [
    'PREFEITURA MUNICIPAL DE EXEMPLO',
    'EDITAL DE ABERTURA N 01/2026',
    'Anexo II: Conteudo programatico;', // linha de sumario — nao vale como cabecalho
    regras,
    cabecalhoAnexo,
    'Lingua Portuguesa: Interpretacao de texto. Ortografia. Crase.',
    'Matematica: Razao e proporcao. Juros simples.',
  ].join('\n');
}

describe('acharLinhaDoConteudo', () => {
  // Cada banca batiza o anexo de um jeito; procurar so o termo obvio erra em ~40% dos editais.
  it.each([
    ['Cebraspe', '15 DOS OBJETOS DE AVALIACAO (HABILIDADES E CONHECIMENTOS)'],
    ['Fundatec', 'ANEXO IX - PROGRAMAS - PROVA BASE'],
    ['padrao', 'ANEXO IV - CONTEUDO PROGRAMATICO'],
    ['acentuado', 'ANEXO IV – CONTEÚDO PROGRAMÁTICO'],
  ])('acha o cabecalho no formato %s', (_rotulo, cabecalho) => {
    const linhas = editalFalso({ cabecalhoAnexo: cabecalho }).split('\n');
    const indice = acharLinhaDoConteudo(linhas);
    expect(indice).not.toBeNull();
    expect(linhas[indice]).toBe(cabecalho);
  });

  it('ignora a linha de sumario e a citacao no corpo do edital', () => {
    const linhas = [
      'Anexo II: Conteudo programatico;',
      'As provas seguirao o conteudo programatico.',
      '7.1 ... de acordo com o conteudo programatico/materias das provas previstas.',
    ];
    expect(acharLinhaDoConteudo(linhas)).toBeNull();
  });

  it('desfaz o letter-spacing que o pdfjs produz em titulos', () => {
    // pdfjs junta glifo a glifo com espaco: "A N E X O   I I   -   P R O G R A M A S"
    const linhas = ['x', 'y', 'A N E X O I I - P R O G R A M A S - P R O V A', 'z'];
    expect(acharLinhaDoConteudo(linhas)).toBe(2);
  });
});

describe('prepararTextoEdital', () => {
  it('manda o edital inteiro quando cabe no orcamento', () => {
    const r = prepararTextoEdital('ANEXO I - CONTEUDO PROGRAMATICO\nLingua Portuguesa: crase.');
    expect(r.recorte).toBe('inteiro');
    expect(r.texto).toContain('Lingua Portuguesa');
  });

  it('leva o anexo junto quando o edital estoura o orcamento', () => {
    const r = prepararTextoEdital(editalFalso({ cabecalhoAnexo: 'ANEXO IV - CONTEUDO PROGRAMATICO' }));
    expect(r.achouConteudo).toBe(true);
    expect(r.chars).toBeLessThanOrEqual(CHARS_TOTAL + 100); // + o separador
    // o que importa: o anexo entra, e o cabecalho de identificacao sobrevive junto
    expect(r.texto).toContain('Lingua Portuguesa: Interpretacao de texto.');
    expect(r.texto).toContain('EDITAL DE ABERTURA N 01/2026');
  });

  it('marca anexo-truncado quando o proprio anexo estoura o orcamento', () => {
    const anexoGigante = Array.from({ length: 4000 }, (_, i) => `Disciplina ${i}: topico um. topico dois.`).join('\n');
    const texto = `${editalFalso({ cabecalhoAnexo: 'ANEXO IV - CONTEUDO PROGRAMATICO' })}\n${anexoGigante}`;
    const r = prepararTextoEdital(texto);
    expect(r.recorte).toBe('anexo-truncado');
    // trunca pelo fim: as primeiras disciplinas do anexo continuam la
    expect(r.texto).toContain('Disciplina 0:');
  });

  it('cai para o comeco do documento quando nao ha anexo', () => {
    const r = prepararTextoEdital('a'.repeat(CHARS_TOTAL + 5000));
    expect(r.recorte).toBe('cabecalho');
    expect(r.achouConteudo).toBe(false);
  });

  it('sinaliza documento curto demais para ser edital de abertura', () => {
    // ~19% dos arquivos anunciados como "edital" sao comunicado, retificacao ou resultado
    expect(prepararTextoEdital('Comunicado de prazo de recurso.').pareceEdital).toBe(false);
    expect(prepararTextoEdital('a'.repeat(20000)).pareceEdital).toBe(true);
  });
});

describe('acharLinhaDoQuadro', () => {
  it('acha o quadro pelo titulo explicito', () => {
    const linhas = [
      'Anexo II - Composicao da Prova;', // sumario, sem numeros depois
      'texto de regras',
      'Composicao da Prova:',
      'Lingua Portuguesa 10 1',
      'Matematica 5 1',
    ];
    expect(acharLinhaDoQuadro(linhas)).toBe(2);
  });

  it('cai na secao numerada DAS PROVAS quando nao ha titulo de quadro', () => {
    // 9 dos 13 editais do teste nao nomeiam "quadro"/"composicao" — descrevem na secao.
    const linhas = [
      '1. DAS DISPOSICOES PRELIMINARES',
      'texto',
      '8 DAS PROVAS OBJETIVAS',
      '8.1 A prova sera composta de 120 questoes.',
    ];
    expect(acharLinhaDoQuadro(linhas)).toBe(2);
  });

  it('nao aceita o titulo quando nada de composicao vem depois', () => {
    expect(acharLinhaDoQuadro(['Composicao da Prova:', 'ver o anexo respectivo.'])).toBeNull();
  });
});

describe('prepararTextoEdital — janela do quadro de provas', () => {
  // O quadro fica no miolo de regras que o recorte descarta: nos 13 editais reais ele
  // aparece entre 1,9% e 51,6% do documento, e so 2 caiam dentro do cabecalho.
  function editalComQuadro() {
    const encher = (n, txt) => Array.from({ length: n }, () => txt).join('\n');
    return [
      'EDITAL DE ABERTURA N 01/2026',
      encher(400, '2.1 Das condicoes de inscricao e da documentacao exigida do candidato.'),
      '8 DAS PROVAS OBJETIVAS',
      'Lingua Portuguesa 10 1',
      'Matematica 5 2',
      encher(2000, '9.1 Dos recursos e dos prazos para interposicao contra o gabarito.'),
      'ANEXO IV - CONTEUDO PROGRAMATICO',
      'Lingua Portuguesa: Interpretacao de texto. Ortografia.',
    ].join('\n');
  }

  it('leva o quadro junto do cabecalho e do anexo', () => {
    const r = prepararTextoEdital(editalComQuadro(), { charsCabecalho: 500, charsTotal: 20000 });
    expect(r.achouQuadro).toBe(true);
    expect(r.texto).toContain('Lingua Portuguesa 10 1'); // o quadro
    expect(r.texto).toContain('Interpretacao de texto'); // o anexo
    expect(r.texto).toContain('EDITAL DE ABERTURA'); // o cabecalho
    // e descarta o miolo de regras que separa o cabecalho do quadro
    expect(r.texto.split('Das condicoes de inscricao').length - 1).toBeLessThan(20);
  });

  it('nao gasta orcamento repetindo o quadro que ja veio no cabecalho', () => {
    const r = prepararTextoEdital(editalComQuadro(), { charsCabecalho: 40000, charsTotal: 60000 });
    const ocorrencias = r.texto.split('Lingua Portuguesa 10 1').length - 1;
    expect(ocorrencias).toBe(1);
  });
});
