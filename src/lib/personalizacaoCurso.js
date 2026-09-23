// Personalizacao do curso: capa, cor e descricao.
//
// "Curso" aqui e o caderno de planejamento do aluno — ele pode juntar dois concursos, ou um
// concurso com a faculdade. Como e algo que ele criou e vai abrir todo dia, faz diferenca
// poder dar cara propria: uma capa, uma cor e uma linha dizendo o que e aquilo. Nada disso
// muda o comportamento do app; e identidade.

// Paleta fechada em vez de color picker livre. Um roxo neon escolhido as pressas quebra a
// identidade editorial e o contraste do texto branco em cima da capa. Estes tons saem da
// mesma familia do --pl-accent (#1e3a5f) e todos aceitam texto claro.
export const CORES_DE_CURSO = [
  { id: 'azul',    label: 'Azul',     base: '#1e3a5f', claro: '#33597f' },
  { id: 'verde',   label: 'Verde',    base: '#1f4d3d', claro: '#2f6f57' },
  { id: 'vinho',   label: 'Vinho',    base: '#5c2230', claro: '#7d3243' },
  { id: 'terra',   label: 'Terra',    base: '#6b4220', claro: '#8d5a2c' },
  { id: 'roxo',    label: 'Roxo',     base: '#3c2a5c', claro: '#553d7d' },
  { id: 'grafite', label: 'Grafite',  base: '#2b2b2f', claro: '#46464d' },
];

export const COR_PADRAO = CORES_DE_CURSO[0];

// Cor escolhida pelo aluno, ou a padrao. Curso salvo antes deste campo existir cai na padrao
// em vez de ficar sem cor.
export function corDoCurso(curso) {
  const id = String(curso?.cor || '').trim();
  return CORES_DE_CURSO.find((cor) => cor.id === id) || COR_PADRAO;
}

// O que desenhar no topo do cartao. Com capa enviada, a imagem; sem capa, o degrade da cor.
// Os dois casos devolvem o mesmo formato para o cartao nao precisar de dois caminhos.
export function capaDoCurso(curso) {
  const cor = corDoCurso(curso);
  const gradiente = `linear-gradient(135deg, ${cor.base} 0%, ${cor.claro} 100%)`;
  const url = String(curso?.capa_url || '').trim();
  return url
    ? { tipo: 'imagem', url, cor, gradiente }
    : { tipo: 'cor', url: '', cor, gradiente };
}

// Linha de apoio do cartao. A descricao que o aluno escreveu ganha da linha automatica
// ("Cargo - Banca"), que e um resumo dos dados e nao do que ele quis dizer.
export function descricaoDoCurso(curso) {
  const escrita = String(curso?.descricao || '').trim();
  if (escrita) return escrita;

  const partes = [
    curso?.cargo || curso?.concurso || curso?.area || '',
    curso?.banca || curso?.instituicao || '',
  ].map((parte) => String(parte || '').trim()).filter(Boolean);

  return partes.length > 0 ? partes.join(' - ') : 'Curso cadastrado';
}

// Limite do texto livre. Descricao de cinco linhas estoura o cartao e vira scroll; o limite
// e aplicado ao salvar, nao na hora de exibir, para nao cortar o que ja esta salvo.
export const LIMITE_DA_DESCRICAO = 120;

export function limparDescricao(texto) {
  return String(texto || '').replace(/\s+/g, ' ').trim().slice(0, LIMITE_DA_DESCRICAO);
}

// Dimensões recomendadas das duas imagens do curso.
//
// Sem isto o aluno não tem como acertar: a capa aparece como uma faixa larga e baixa no
// cartão, então uma foto quadrada perde o topo e a base — e ele só descobre depois de
// enviar. Os números têm folga sobre o tamanho exibido para aguentar tela retina.
export const IMAGENS_DO_CURSO = {
  capa: {
    rotulo: 'Capa',
    largura: 1200,
    altura: 300,
    proporcao: '4:1',
    // A capa é cortada pelos lados e pelo centro: o que interessa tem que estar no meio.
    dica: 'Faixa larga no topo do cartão. O centro da imagem é o que aparece.',
  },
  selo: {
    rotulo: 'Selo',
    largura: 256,
    altura: 256,
    proporcao: '1:1',
    dica: 'Quadrado, tipo o brasão do órgão. Aparece pequeno, ao lado do nome.',
  },
};

export const FORMATOS_DE_IMAGEM = 'PNG, JPG, WebP ou GIF';
export const TAMANHO_MAXIMO_MB = 5;

// Linha de ajuda que vai embaixo do campo.
export function recomendacaoDaImagem(chave) {
  const alvo = IMAGENS_DO_CURSO[chave];
  if (!alvo) return '';
  return `Recomendado: ${alvo.largura} × ${alvo.altura} px (${alvo.proporcao}) · ${FORMATOS_DE_IMAGEM} · até ${TAMANHO_MAXIMO_MB} MB`;
}

// O que avisar depois de ver a imagem que o aluno escolheu.
//
// Avisa, não bloqueia: uma imagem fora da proporção continua servindo, só vai aparecer
// cortada — e é melhor ele saber disso antes de estranhar o resultado.
export function avisoDaImagem(chave, largura, altura) {
  const alvo = IMAGENS_DO_CURSO[chave];
  if (!alvo || !(largura > 0) || !(altura > 0)) return '';

  const proporcaoEnviada = largura / altura;
  const proporcaoAlvo = alvo.largura / alvo.altura;

  // Menos da metade do recomendado em largura ja aparece borrada numa tela retina.
  if (largura < alvo.largura / 2) {
    return `Sua imagem tem ${largura} × ${altura} px. Abaixo de ${Math.round(alvo.largura / 2)} px de largura ela fica borrada no cartão.`;
  }

  // 25% de folga: quase toda foto de celular passa, e so avisa quem vai perder pedaco
  // grande de verdade.
  if (proporcaoEnviada < proporcaoAlvo * 0.75) {
    return `Sua imagem tem ${largura} × ${altura} px — mais alta que o espaço. Só a faixa do meio vai aparecer.`;
  }
  if (proporcaoEnviada > proporcaoAlvo * 1.25) {
    return `Sua imagem tem ${largura} × ${altura} px — mais larga que o espaço. As laterais vão ser cortadas.`;
  }

  return '';
}
