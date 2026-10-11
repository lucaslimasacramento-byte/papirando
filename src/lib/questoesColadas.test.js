import { describe, it, expect } from 'vitest';
import { lerLote, lerQuestao, separarQuestoes, textoBaseDoEnunciado, estaPronta } from './questoesColadas';

// Recorte fiel do lote real (export do TEC, PM AL 2017/2018), incluindo o caso que mais
// importa: itens que reaproveitam o texto-base de uma questao anterior.
const LOTE = `QUESTÃO 1
ID TEC: #551858
Banca: CEBRASPE (CESPE)
Órgão: Polícia Militar do Estado de Alagoas (PM AL)
Cargo: Soldado Policial Militar (PM AL)
Ano: 2017
Área do concurso: Combatente
Matéria: Atualidades e Conhecimentos Gerais
Assunto: Meio Ambiente no Brasil
Tipo: Certo/Errado
Situação: nenhuma

ENUNCIADO:
As chuvas das últimas semanas em Alagoas trouxeram esperança aos agricultores.

Internet: <g1.globo.com> (com adaptações).

Considerando o texto apresentado, julgue o seguinte item.

A transposição do rio São Francisco é apontada como uma das soluções.

ALTERNATIVAS:
Certo
Errado

GABARITO: Certo

==========

QUESTÃO 2
ID TEC: #551861
Banca: CEBRASPE (CESPE)
Órgão: Polícia Militar do Estado de Alagoas (PM AL)
Cargo: Soldado Policial Militar (PM AL)
Ano: 2017
Área do concurso: Combatente
Matéria: Atualidades e Conhecimentos Gerais
Assunto: Meio Ambiente no Brasil
Tipo: Certo/Errado
Situação: nenhuma

ENUNCIADO:
[Mesmo texto da Questão 1 – chuvas em Alagoas / SEMARH]

Considerando o texto apresentado, julgue o seguinte item.

O aumento do desmatamento na Amazônia é um dos fatores responsáveis.

ALTERNATIVAS:
Certo
Errado

GABARITO: Errado
`;

describe('separarQuestoes', () => {
  it('separa pelo "=====" do export', () => {
    expect(separarQuestoes(LOTE)).toHaveLength(2);
  });

  it('separa tambem quando o lote vem sem o separador', () => {
    const semSeparador = LOTE.replace(/^\s*={3,}\s*$/gm, '');
    expect(separarQuestoes(semSeparador)).toHaveLength(2);
  });

  it('texto vazio nao vira uma questao fantasma', () => {
    expect(separarQuestoes('')).toEqual([]);
    expect(separarQuestoes(null)).toEqual([]);
  });
});

describe('lerQuestao', () => {
  const [primeira] = separarQuestoes(LOTE);
  const questao = lerQuestao(primeira);

  it('le os rotulos do cabecalho', () => {
    expect(questao).toMatchObject({
      idTec: '551858',
      banca: 'CEBRASPE (CESPE)',
      orgao: 'Polícia Militar do Estado de Alagoas (PM AL)',
      cargo: 'Soldado Policial Militar (PM AL)',
      ano: '2017',
      area: 'Combatente',
      materia: 'Atualidades e Conhecimentos Gerais',
      assunto: 'Meio Ambiente no Brasil',
      tipo: 'certo_errado',
    });
  });

  it('o enunciado nao engole as alternativas nem o gabarito', () => {
    expect(questao.enunciado).toContain('transposição do rio São Francisco');
    expect(questao.enunciado).not.toContain('ALTERNATIVAS');
    expect(questao.enunciado).not.toContain('GABARITO');
  });

  it('certo/errado vira duas alternativas, com a correta marcada', () => {
    expect(questao.alternativas).toHaveLength(2);
    expect(questao.gabarito).toBe('C');
    expect(questao.alternativas.find((a) => a.isCorrect).id).toBe('C');
  });

  it('"Situação: nenhuma" nao vira valor', () => {
    // O export escreve "nenhuma" onde nao ha dado; gravar isso seria poluir o banco.
    const gabaritoAusente = lerQuestao(`QUESTÃO 9
Matéria: X
Tipo: Certo/Errado
ENUNCIADO:
Item qualquer.
ALTERNATIVAS:
Certo
Errado
GABARITO: (não disponível – questão não respondida)`);

    expect(gabaritoAusente.gabarito).toBe('');
    expect(gabaritoAusente.alternativas.some((a) => a.isCorrect)).toBe(false);
  });

  it('le multipla escolha com alternativas A) B) C)', () => {
    const questaoME = lerQuestao(`QUESTÃO 3
Matéria: Informática
Tipo: Múltipla escolha
ENUNCIADO:
Qual é o atalho de copiar?
ALTERNATIVAS:
A) Ctrl+C
B) Ctrl+V
C) Ctrl+X
GABARITO: A`);

    expect(questaoME.tipo).toBe('multipla_escolha');
    expect(questaoME.alternativas).toHaveLength(3);
    expect(questaoME.alternativas[0]).toMatchObject({ id: 'A', label: 'Ctrl+C', isCorrect: true });
  });
});

describe('texto-base compartilhado', () => {
  it('a referencia vira o texto de verdade, e o item continua sendo o dela', () => {
    // Sem isto, 6 das 10 questoes do lote real chegariam com "[Mesmo texto da Questão 3]"
    // no lugar do enunciado — o aluno leria a instrucao interna do export.
    const [, segunda] = lerLote(LOTE);

    expect(segunda.enunciado).toContain('As chuvas das últimas semanas em Alagoas');
    expect(segunda.enunciado).not.toContain('Mesmo texto');
    // O item e o dela, nao o da primeira.
    expect(segunda.enunciado).toContain('desmatamento na Amazônia');
    expect(segunda.enunciado).not.toContain('transposição do rio São Francisco');
    expect(segunda.textoHerdado).toBe(true);
  });

  it('referencia a uma questao que nao veio no lote nao quebra', () => {
    const orfa = `QUESTÃO 7
Matéria: X
Tipo: Certo/Errado
ENUNCIADO:
[Mesmo texto da Questão 99 – algo]

Julgue o item.
ALTERNATIVAS:
Certo
Errado
GABARITO: Certo`;

    const [questao] = lerLote(orfa);
    expect(questao.textoHerdado).toBeUndefined();
    expect(questao.enunciado).toContain('Mesmo texto');
  });

  it('o texto-base para onde o comando do item comeca', () => {
    const base = textoBaseDoEnunciado('Um texto qualquer.\n\nConsiderando o texto, julgue o item.\n\nO item.');
    expect(base).toBe('Um texto qualquer.');
  });
});

describe('o que falta', () => {
  it('questao completa esta pronta', () => {
    const [primeira] = lerLote(LOTE);
    expect(primeira.faltando).toEqual([]);
    expect(estaPronta(primeira)).toBe(true);
  });

  it('sem gabarito, a previa diz exatamente o que falta', () => {
    const [questao] = lerLote(`QUESTÃO 1
Matéria: X
Tipo: Certo/Errado
ENUNCIADO:
Item.
ALTERNATIVAS:
Certo
Errado
GABARITO: (não disponível)`);

    expect(questao.faltando).toContain('gabarito');
    expect(estaPronta(questao)).toBe(false);
  });
});

describe('comentario', () => {
  it('le o comentario quando ele vem no bloco', () => {
    const [questao] = lerLote(`QUESTÃO 1
Matéria: X
Tipo: Certo/Errado
ENUNCIADO:
Item.
ALTERNATIVAS:
Certo
Errado
GABARITO: Certo
COMENTÁRIO: A transposição é política pública desde 2007.`);

    expect(questao.comentario).toContain('política pública desde 2007');
    // Comentario nao bloqueia: a questao funciona sem ele, so nao ensina tanto.
    expect(questao.faltando).toEqual([]);
  });
});
