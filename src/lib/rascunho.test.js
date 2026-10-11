import { describe, it, expect } from 'vitest';
import {
  LAPIS, BORRACHA, FATOR_DA_BORRACHA, MARGEM_VISIVEL, TAMANHO_MINIMO, CORES,
  corDoTema, fonteDoTema,
  folhaVazia, estaVazia, iniciarTraco, comPonto, textoEm, adicionar, desfazer,
  posicaoPermitida, tamanhoPermitido, posicaoInicial,
  folhaDaQuestao, guardarFolha, esquecerFolha, janelaGuardada, guardarJanela,
} from './rascunho';

describe('folha', () => {
  it('nasce vazia', () => {
    expect(estaVazia(folhaVazia())).toBe(true);
  });

  it('um clique sem arrastar ja deixa marca', () => {
    // Quem clica espera um ponto. Traco que so existe com dois pontos faz o clique parecer
    // que o rascunho nao funcionou.
    const traco = iniciarTraco({ cor: '#000', espessura: 4, ponto: { x: 10, y: 10 } });
    expect(traco.pontos).toHaveLength(1);
  });

  it('a borracha apaga mais largo do que o lapis escreve', () => {
    const lapis = iniciarTraco({ ferramenta: LAPIS, cor: '#000', espessura: 4, ponto: { x: 0, y: 0 } });
    const borracha = iniciarTraco({ ferramenta: BORRACHA, cor: '#000', espessura: 4, ponto: { x: 0, y: 0 } });
    expect(borracha.espessura).toBe(lapis.espessura * FATOR_DA_BORRACHA);
  });

  it('ferramenta desconhecida vira lapis, nunca borracha', () => {
    expect(iniciarTraco({ ferramenta: 'qualquer', espessura: 2, ponto: { x: 0, y: 0 } }).ferramenta).toBe(LAPIS);
  });

  it('comPonto nao altera o traco original', () => {
    const traco = iniciarTraco({ cor: '#000', espessura: 2, ponto: { x: 0, y: 0 } });
    const maior = comPonto(traco, { x: 5, y: 5 });
    expect(traco.pontos).toHaveLength(1);
    expect(maior.pontos).toHaveLength(2);
  });
});

describe('texto', () => {
  it('texto em branco nao vira marca', () => {
    expect(textoEm({ cor: '#000', x: 1, y: 1, texto: '   ' })).toBeNull();
    expect(adicionar(folhaVazia(), null).marcas).toHaveLength(0);
  });

  it('texto com conteudo entra limpo', () => {
    expect(textoEm({ cor: '#000', x: 1, y: 1, texto: '  80 / 1,65  ' }).texto).toBe('80 / 1,65');
  });
});

describe('desfazer', () => {
  it('tira a ultima marca, seja traco ou texto', () => {
    let folha = folhaVazia();
    folha = adicionar(folha, iniciarTraco({ cor: '#000', espessura: 2, ponto: { x: 0, y: 0 } }));
    folha = adicionar(folha, textoEm({ cor: '#000', x: 1, y: 1, texto: 'conta' }));
    expect(desfazer(folha).marcas).toHaveLength(1);
    expect(desfazer(folha).marcas[0].tipo).toBe('traco');
  });

  it('desfazer numa folha vazia nao quebra', () => {
    expect(desfazer(folhaVazia()).marcas).toHaveLength(0);
  });
});

describe('cores do tema', () => {
  it('a paleta guarda token, nunca hexadecimal', () => {
    // Guardar o valor resolvido congelaria a cor: o traço feito no tema claro continuaria
    // escuro sobre o fundo escuro do tema noturno, e o rascunho sumiria.
    CORES.forEach((opcao) => {
      expect(opcao.token).toMatch(/^--pl-/);
      expect(opcao).not.toHaveProperty('valor');
    });
  });

  it('sem elemento, devolve a reserva em vez de cor vazia', () => {
    expect(corDoTema(null, '--pl-ink', '#123456')).toBe('#123456');
  });

  it('a fonte do canvas sai montada, porque canvas nao entende var()', () => {
    expect(fonteDoTema(null, 15)).toBe('600 15px system-ui, sans-serif');
  });
});

describe('posicaoPermitida', () => {
  const janela = { largura: 1200, altura: 800 };
  const tamanho = { largura: 360, altura: 320 };

  it('nao deixa a janela sumir pela direita', () => {
    const posicao = posicaoPermitida({ x: 5000, y: 100 }, tamanho, janela);
    expect(posicao.x).toBe(1200 - MARGEM_VISIVEL);
  });

  it('nao deixa a janela sumir pela esquerda', () => {
    // Arrastar para fora pela esquerda levaria junto a barra de titulo — a unica area que
    // arrasta — e nao haveria como trazer a janela de volta.
    const posicao = posicaoPermitida({ x: -5000, y: 100 }, tamanho, janela);
    expect(posicao.x).toBe(MARGEM_VISIVEL - 360);
  });

  it('a barra de titulo nunca sobe acima do topo', () => {
    expect(posicaoPermitida({ x: 100, y: -300 }, tamanho, janela).y).toBe(0);
  });

  it('nao deixa a janela sumir por baixo', () => {
    expect(posicaoPermitida({ x: 100, y: 5000 }, tamanho, janela).y).toBe(800 - MARGEM_VISIVEL);
  });

  it('posicao valida passa intacta', () => {
    expect(posicaoPermitida({ x: 300, y: 200 }, tamanho, janela)).toEqual({ x: 300, y: 200 });
  });
});

describe('tamanhoPermitido', () => {
  it('respeita o minimo utilizavel', () => {
    const tamanho = tamanhoPermitido({ largura: 10, altura: 10 }, { largura: 1200, altura: 800 });
    expect(tamanho).toEqual(TAMANHO_MINIMO);
  });

  it('nao passa do tamanho da janela', () => {
    const tamanho = tamanhoPermitido({ largura: 9000, altura: 9000 }, { largura: 1200, altura: 800 });
    expect(tamanho).toEqual({ largura: 1200, altura: 800 });
  });

  it('janela menor que o minimo nao gera tamanho negativo', () => {
    const tamanho = tamanhoPermitido({ largura: 400, altura: 400 }, { largura: 100, altura: 100 });
    expect(tamanho).toEqual(TAMANHO_MINIMO);
  });
});

describe('posicaoInicial', () => {
  it('abre encostada a direita, onde cobre menos enunciado', () => {
    const tamanho = { largura: 360, altura: 320 };
    const posicao = posicaoInicial({ largura: 1200, altura: 800 }, tamanho);
    expect(posicao.x).toBe(1200 - 360 - 32);
    expect(posicao.y).toBe(176);
  });

  it('em janela estreita ainda sobra pedaco agarravel', () => {
    const tamanho = { largura: 360, altura: 320 };
    const posicao = posicaoInicial({ largura: 300, altura: 600 }, tamanho);
    expect(posicao.x).toBeGreaterThanOrEqual(MARGEM_VISIVEL - 360);
  });
});

describe('memoria', () => {
  it('a folha acompanha a questao', () => {
    const folha = adicionar(folhaVazia(), textoEm({ cor: '--pl-ink', x: 1, y: 1, texto: '80/1,65' }));
    guardarFolha('q-1', folha);
    expect(folhaDaQuestao('q-1').marcas).toHaveLength(1);
    expect(folhaDaQuestao('q-2')).toBeNull();
    esquecerFolha('q-1');
    expect(folhaDaQuestao('q-1')).toBeNull();
  });

  it('id vazio nao cria entrada fantasma', () => {
    guardarFolha('', folhaVazia());
    expect(folhaDaQuestao('')).toBeNull();
  });

  it('a janela acompanha o aluno, nao a questao', () => {
    // Onde ele pos a janela e de que tamanho a deixou e preferencia dele: fazer a janela
    // saltar de volta para o canto a cada questao nova desfaria o ajuste que ele acabou
    // de fazer.
    expect(janelaGuardada()).toBeNull();
    guardarJanela({ x: 120, y: 80 }, { largura: 500, altura: 420 });
    expect(janelaGuardada()).toEqual({ posicao: { x: 120, y: 80 }, tamanho: { largura: 500, altura: 420 } });
  });
});
