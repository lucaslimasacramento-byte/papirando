// Quantas questoes o aluno fez em cada topico, e quanto acertou.
//
// O check do edital responde "eu estudei isto". Ele nao responde "e funcionou". Sao dois
// fatos diferentes, e ate aqui a tela so tinha o primeiro: um topico marcado como concluido
// com 42% de acerto aparecia exatamente igual a um com 90% — verde, resolvido, fora do
// caminho. E o estado mais perigoso do app, porque parece pronto e nao esta.
//
// O dado ja existia: toda sessao de estudo grava `topico`, `acertos` e `erros`. Faltava
// alguem cruzar isso com o edital. Nao ha tabela nova aqui, so leitura do historico.

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function chaveDeTopico(disciplina, topico) {
  return `${normalizar(disciplina)}::${normalizar(topico)}`;
}

// Abaixo disto o percentual nao significa nada: 1 de 2 e "50%" e nao diz nada sobre o
// dominio do topico. A tela mostra as questoes feitas, mas nao o aproveitamento.
export const MINIMO_DE_QUESTOES = 5;

// Um aproveitamento abaixo disto e um alerta, mesmo com o topico marcado como concluido.
export const CORTE_DE_ATENCAO = 60;

function numero(valor) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) && convertido > 0 ? convertido : 0;
}

// Soma as sessoes por topico. Sessao sem topico nomeado entra so no total da disciplina —
// registrar "estudei Portugues por 1h" e legitimo, e nao diz de qual topico se trata.
export function aproveitamentoPorTopico(historico = []) {
  const porTopico = new Map();
  const porDisciplina = new Map();

  (Array.isArray(historico) ? historico : []).forEach((sessao) => {
    const acertos = numero(sessao?.acertos);
    const erros = numero(sessao?.erros);
    const questoes = acertos + erros;
    if (questoes === 0) return;

    const disciplina = String(sessao?.disciplina || '').trim();
    if (!disciplina) return;

    const somar = (mapa, chave) => {
      const atual = mapa.get(chave) || { questoes: 0, acertos: 0 };
      atual.questoes += questoes;
      atual.acertos += acertos;
      mapa.set(chave, atual);
    };

    somar(porDisciplina, normalizar(disciplina));

    const topico = String(sessao?.topico || '').trim();
    if (topico) somar(porTopico, chaveDeTopico(disciplina, topico));
  });

  return { porTopico, porDisciplina };
}

function fechar(bruto) {
  if (!bruto || bruto.questoes === 0) return null;

  const percentual = Math.round((bruto.acertos / bruto.questoes) * 100);
  // Com poucas questoes o percentual e ruido. Devolve o numero de questoes (que e um fato)
  // e deixa o aproveitamento nulo (que seria um palpite).
  const confiavel = bruto.questoes >= MINIMO_DE_QUESTOES;

  return {
    questoes: bruto.questoes,
    acertos: bruto.acertos,
    percentual: confiavel ? percentual : null,
    confiavel,
    atencao: confiavel && percentual < CORTE_DE_ATENCAO,
  };
}

export function doTopico(mapas, disciplina, topico) {
  return fechar(mapas?.porTopico?.get(chaveDeTopico(disciplina, topico)));
}

export function daDisciplina(mapas, disciplina) {
  return fechar(mapas?.porDisciplina?.get(normalizar(disciplina)));
}

// Topico marcado como concluido cujo aproveitamento nao sustenta a marcacao.
//
// E o unico alerta desta tela que contradiz o proprio aluno, entao o corte e conservador:
// so entra quem tem questoes suficientes para o percentual valer.
export function concluidosFragilizados(disciplinas, mapas, { limite = 5 } = {}) {
  const achados = [];

  (Array.isArray(disciplinas) ? disciplinas : []).forEach((disciplina) => {
    (Array.isArray(disciplina?.topicos) ? disciplina.topicos : []).forEach((topico) => {
      if (!topico?.concluido) return;
      const desempenho = doTopico(mapas, disciplina.nome, topico.nome);
      if (desempenho?.atencao) {
        achados.push({ disciplina: disciplina.nome, topico: topico.nome, ...desempenho });
      }
    });
  });

  return achados.sort((a, b) => a.percentual - b.percentual).slice(0, limite);
}
