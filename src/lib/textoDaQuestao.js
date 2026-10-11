// O enunciado da questao, decodificado.
//
// O texto que chega do banco nao e texto limpo: e markdown cru, do jeito que a fonte
// (api.enem.dev, colagem do TEC, PDF) entregou. O cartao de questao imprimia esse texto como
// string, entao o aluno lia isto no meio do enunciado:
//
//   ...obtidas na atividade ![](https://enem.dev/2023/questions/157/13cfbc97-....png) Apos a
//   coleta dos dados...
//
// Ou seja: a imagem — que e o GRAFICO sem o qual a questao nao tem resposta — virava uma URL
// no meio da frase, e o `![]` sobrava como lixo. Aqui o enunciado deixa de ser uma string e
// vira uma lista de blocos: paragrafo ou figura. A tela desenha cada bloco do jeito certo.

// ![alt](url "titulo") — o formato do markdown. O titulo entre aspas e opcional e a maioria
// das fontes nao manda.
const IMAGEM = /!\[([^\]]*)\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;

// Link markdown comum: [texto](url). Vira so o texto — a URL nua no meio do enunciado nao
// ajuda ninguem a resolver a questao.
const LINK = /\[([^\]]+)\]\(\s*[^\s)]+(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;

const ENTIDADES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#039;': "'",
  '&apos;': "'",
  '&hellip;': '…',
  '&mdash;': '—',
  '&ndash;': '–',
  '&aacute;': 'á',
  '&eacute;': 'é',
  '&iacute;': 'í',
  '&oacute;': 'ó',
  '&uacute;': 'ú',
  '&atilde;': 'ã',
  '&otilde;': 'õ',
  '&ccedil;': 'ç',
  '&acirc;': 'â',
  '&ecirc;': 'ê',
  '&ocirc;': 'ô',
  '&agrave;': 'à',
};

function decodificarEntidades(texto) {
  return String(texto || '')
    .replace(/&[a-zA-Z]+;|&#\d+;/g, (entidade) => {
      const direta = ENTIDADES[entidade.toLowerCase()];
      if (direta !== undefined) return direta;
      const numerica = entidade.match(/^&#(\d+);$/);
      if (numerica) {
        const codigo = Number(numerica[1]);
        if (codigo > 0 && codigo < 0x110000) return String.fromCodePoint(codigo);
      }
      return entidade;
    });
}

function limparUrl(url) {
  const bruta = String(url || '').trim();
  const semAngulos = bruta.startsWith('<') && bruta.endsWith('>') ? bruta.slice(1, -1) : bruta;
  return semAngulos.trim();
}

// So http(s) e data:image. Um `javascript:` em markdown vindo de fonte externa nao chega ao
// atributo src — o banco de questoes recebe colagem de terceiros e PDF de origem qualquer.
function urlSegura(url) {
  const limpa = limparUrl(url);
  if (/^https?:\/\//i.test(limpa)) return limpa;
  if (/^data:image\//i.test(limpa)) return limpa;
  return '';
}

// Tira o que sobra quando a imagem sai da frase: o `![]` orfao, espaco duplo, espaco antes
// de pontuacao, e os marcadores de enfase que ninguem renderiza aqui.
function limparParagrafo(texto) {
  return decodificarEntidades(texto)
    .replace(LINK, '$1')
    .replace(/!\[\s*\]\s*(?:\(\s*\))?/g, ' ')
    .replace(/\[\s*\]/g, ' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$|[.,;:!?])/g, '$1$2')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ ([.,;:!?)])/g, '$1')
    .replace(/\( /g, '(')
    .trim();
}

// Quebra o texto em paragrafos. Duas quebras de linha separam de verdade; uma quebra so, no
// meio de uma frase, e artefato de PDF e vira espaco.
function emParagrafos(texto) {
  return String(texto || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((trecho) => trecho.replace(/\n+/g, ' '))
    .map(limparParagrafo)
    .filter(Boolean);
}

// O enunciado como blocos: {tipo:'paragrafo', texto} | {tipo:'figura', url, alt}.
//
// `imagemExtra` e a coluna `image_url` da linha. Ela existe desde a importacao original e
// aponta para a mesma figura que ja estava no markdown na maioria das questoes — por isso
// so entra se nao estiver repetida.
export function blocosDoEnunciado(enunciado, imagemExtra = '') {
  const bruto = String(enunciado || '');
  const blocos = [];
  const vistas = new Set();

  let cursor = 0;
  let marca;
  IMAGEM.lastIndex = 0;

  const empurrarTexto = (trecho) => {
    emParagrafos(trecho).forEach((texto) => blocos.push({ tipo: 'paragrafo', texto }));
  };

  const empurrarFigura = (url, alt) => {
    const segura = urlSegura(url);
    if (!segura || vistas.has(segura)) return;
    vistas.add(segura);
    blocos.push({ tipo: 'figura', url: segura, alt: limparParagrafo(alt) });
  };

  while ((marca = IMAGEM.exec(bruto)) !== null) {
    empurrarTexto(bruto.slice(cursor, marca.index));
    empurrarFigura(marca[2], marca[1]);
    cursor = marca.index + marca[0].length;
  }
  empurrarTexto(bruto.slice(cursor));

  empurrarFigura(imagemExtra, '');

  return blocos;
}

// O enunciado em texto puro, sem figura nenhuma. E o que a busca indexa e o que vai para a
// IA gerar o comentario: mandar a URL da imagem no prompt gasta token e nao explica nada.
export function textoDoEnunciado(enunciado) {
  return blocosDoEnunciado(enunciado)
    .filter((bloco) => bloco.tipo === 'paragrafo')
    .map((bloco) => bloco.texto)
    .join('\n\n');
}

// O texto de uma alternativa. Mesma limpeza, mas sem virar bloco: alternativa com imagem
// (comum em ENEM de matematica) guarda a figura ao lado do rotulo.
export function textoDaAlternativa(valor) {
  const blocos = blocosDoEnunciado(valor);
  return {
    texto: blocos.filter((bloco) => bloco.tipo === 'paragrafo').map((bloco) => bloco.texto).join(' '),
    figuras: blocos.filter((bloco) => bloco.tipo === 'figura'),
  };
}

// Um resumo de uma linha, para lista e busca.
export function resumoDoEnunciado(enunciado, limite = 160) {
  const texto = textoDoEnunciado(enunciado).replace(/\s+/g, ' ').trim();
  if (texto.length <= limite) return texto;
  return `${texto.slice(0, limite - 1).trimEnd()}…`;
}
