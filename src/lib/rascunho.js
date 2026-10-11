// O rascunho da questão: a folha de papel que fica ao lado da prova.
//
// Em prova de verdade o aluno rabisca. Faz a conta, risca a alternativa que descartou,
// anota a fórmula. Sem isso, questão de matemática e de raciocínio lógico vira adivinhação —
// e ele acaba resolvendo no caderno físico, fora do app, onde nada é registrado.
//
// Este arquivo guarda só o MODELO: o que é um traço, o que é um texto, o que significa
// desfazer. O desenho em si (canvas, ponteiro, arrastar) é da tela. A separação existe
// porque a regra dá para testar e o pixel não.

export const LAPIS = 'lapis';
export const BORRACHA = 'borracha';
export const TEXTO = 'texto';

// Poucas cores, de propósito. Rascunho não é desenho: o aluno precisa de um traço normal,
// um destaque e um "errado". Uma paleta grande só dá trabalho de escolher.
//
// A cor é guardada como TOKEN, não como hexadecimal. O canvas não entende `var(--pl-ink)` e
// precisa do valor resolvido, mas guardar o valor resolvido congelaria a cor: o traço feito
// no tema claro continuaria preto depois de o aluno trocar para o tema escuro, onde o fundo
// da folha também é escuro — e o rascunho sumiria. Guardando o token, cada repinte resolve
// a cor do tema vigente.
export const CORES = [
  { id: 'grafite', token: '--pl-ink', nome: 'Grafite' },
  { id: 'azul', token: '--pl-accent', nome: 'Azul' },
  { id: 'vermelho', token: '--pl-danger', nome: 'Vermelho' },
];

// Resolve um token do tema para o valor que o canvas aceita. Devolve um fallback quando o
// token não existe — um traço invisível seria pior do que um traço de cor inesperada.
export function corDoTema(elemento, token, reserva = '#2a241c') {
  if (!elemento || typeof window === 'undefined' || !window.getComputedStyle) return reserva;
  const valor = window.getComputedStyle(elemento).getPropertyValue(token).trim();
  return valor || reserva;
}

export function fonteDoTema(elemento, tamanho = 15) {
  const familia = corDoTema(elemento, '--pl-sans', '') || 'system-ui, sans-serif';
  return `600 ${tamanho}px ${familia}`;
}

export const ESPESSURAS = [
  { id: 'fina', valor: 2 },
  { id: 'media', valor: 4 },
  { id: 'grossa', valor: 8 },
];

// A borracha apaga mais do que o lápis escreve, senão não se consegue acertar o alvo.
export const FATOR_DA_BORRACHA = 4;

export const TAMANHO_DO_TEXTO = 15;

export function folhaVazia() {
  return { marcas: [] };
}

export function estaVazia(folha) {
  return !folha || !Array.isArray(folha.marcas) || folha.marcas.length === 0;
}

// Um traço começa com um ponto só. Isso importa: clicar sem arrastar tem de deixar um ponto
// visível, e não nada — quem clica espera uma marca.
export function iniciarTraco({ ferramenta = LAPIS, cor, espessura, ponto }) {
  return {
    tipo: 'traco',
    ferramenta: ferramenta === BORRACHA ? BORRACHA : LAPIS,
    cor,
    espessura: ferramenta === BORRACHA ? espessura * FATOR_DA_BORRACHA : espessura,
    pontos: [ponto],
  };
}

export function comPonto(traco, ponto) {
  return { ...traco, pontos: [...traco.pontos, ponto] };
}

export function textoEm({ cor, x, y, texto, tamanho = TAMANHO_DO_TEXTO }) {
  const limpo = String(texto || '').trim();
  if (!limpo) return null;
  return { tipo: 'texto', cor, x, y, texto: limpo, tamanho };
}

export function adicionar(folha, marca) {
  if (!marca) return folha;
  return { marcas: [...folha.marcas, marca] };
}

// Desfazer tira a última marca — traço ou texto, tanto faz. Uma pilha só, porque para o
// aluno existe uma coisa só: "o que eu acabei de fazer".
export function desfazer(folha) {
  if (estaVazia(folha)) return folha;
  return { marcas: folha.marcas.slice(0, -1) };
}

// Onde a janela do rascunho pode ficar.
//
// Sem isto, arrastar a janela para fora da tela a perde de vez: não há como trazê-la de
// volta porque a barra de título — a única área que arrasta — ficou inalcançável. A margem
// garante que sempre sobre um pedaço agarrável.
export const MARGEM_VISIVEL = 48;

export function posicaoPermitida(posicao, tamanho, janela) {
  const larguraJanela = Number(janela?.largura) || 0;
  const alturaJanela = Number(janela?.altura) || 0;
  const largura = Number(tamanho?.largura) || 0;

  const maiorX = Math.max(0, larguraJanela - MARGEM_VISIVEL);
  const menorX = Math.min(0, MARGEM_VISIVEL - largura);
  const maiorY = Math.max(0, alturaJanela - MARGEM_VISIVEL);

  return {
    x: Math.min(Math.max(Number(posicao?.x) || 0, menorX), maiorX),
    // Para cima o limite é 0: a barra de título não pode sumir atrás do topo da tela.
    y: Math.min(Math.max(Number(posicao?.y) || 0, 0), maiorY),
  };
}

export const TAMANHO_MINIMO = { largura: 280, altura: 220 };

export function tamanhoPermitido(tamanho, janela) {
  const largura = Math.max(TAMANHO_MINIMO.largura, Number(tamanho?.largura) || 0);
  const altura = Math.max(TAMANHO_MINIMO.altura, Number(tamanho?.altura) || 0);
  return {
    largura: Math.min(largura, Math.max(TAMANHO_MINIMO.largura, Number(janela?.largura) || largura)),
    altura: Math.min(altura, Math.max(TAMANHO_MINIMO.altura, Number(janela?.altura) || altura)),
  };
}

// Onde a janela aparece da primeira vez: encostada à direita, abaixo do cabeçalho. É o lado
// em que ela cobre menos enunciado — o texto da questão começa à esquerda.
export function posicaoInicial(janela, tamanho) {
  return posicaoPermitida(
    {
      x: (Number(janela?.largura) || 0) - tamanho.largura - 32,
      y: Math.round((Number(janela?.altura) || 0) * 0.22),
    },
    tamanho,
    janela
  );
}

// A FOLHA acompanha a questão; a JANELA acompanha o aluno.
//
// São duas memórias porque são duas coisas diferentes. A conta da questão 3 não faz sentido
// na 4 — por isso cada questão tem a sua folha. Mas onde o aluno pôs a janela e de que
// tamanho ele a deixou é preferência dele, e fazer a janela saltar de volta para o canto a
// cada questão nova seria desfazer o ajuste que ele acabou de fazer.
//
// Tudo na memória, não no disco: rascunho é rascunho. Guardar para sempre o que o aluno
// riscou seria acumular lixo e prometer uma permanência que ninguém pediu.
const folhaPorQuestao = new Map();

export function folhaDaQuestao(questaoId) {
  return folhaPorQuestao.get(String(questaoId)) || null;
}

export function guardarFolha(questaoId, folha) {
  if (!questaoId) return;
  folhaPorQuestao.set(String(questaoId), folha);
}

export function esquecerFolha(questaoId) {
  folhaPorQuestao.delete(String(questaoId));
}

let janelaDoAluno = null;

export function janelaGuardada() {
  return janelaDoAluno;
}

export function guardarJanela(posicao, tamanho) {
  janelaDoAluno = { posicao, tamanho };
}
