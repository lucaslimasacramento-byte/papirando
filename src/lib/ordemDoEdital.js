// A ordem em que o edital deve ser atacado, e como achar coisa dentro dele.
//
// A lista de disciplinas do edital vinha na ordem em que as linhas entraram no banco — que
// e a ordem do PDF, ou a ordem em que a leitura terminou. Nenhuma das duas tem relacao com
// o que decide a aprovacao. A pagina ja exibia "40 questoes · peso 2" em cada linha, vindo
// do quadro de provas, e nao usava esse numero para nada: a materia que vale um terco da
// prova podia estar em decimo primeiro lugar, e o aluno comecava pela que estivesse no topo
// por acaso.
//
// Aqui o quadro de provas passa a mandar na ordem — e, mais do que isso, a apontar por onde
// comecar, cruzando quanto a materia vale com quanto dela ja foi feito.

import { acharLinhaDaProva } from './edital';

function inteiro(valor) {
  const achado = String(valor ?? '').match(/\d+/);
  return achado ? Number(achado[0]) : 0;
}

function decimal(valor) {
  const achado = String(valor ?? '').replace(',', '.').match(/[\d.]+/);
  const numero = achado ? Number(achado[0]) : 0;
  return Number.isFinite(numero) && numero > 0 ? numero : 1;
}

// Quanto esta disciplina vale na prova. `pontos` e questoes x peso: e com ele que se compara
// uma materia de 10 questoes peso 3 com uma de 30 questoes peso 1 — valem o mesmo.
export function pesoNaProva(disciplina, prova) {
  const linha = acharLinhaDaProva(prova, disciplina?.nome);
  if (!linha) return null;

  const questoes = inteiro(linha.questoes);
  if (questoes <= 0) return null;

  const peso = decimal(linha.peso);
  return { questoes, peso, pontos: questoes * peso };
}

function topicosDe(disciplina) {
  return Array.isArray(disciplina?.topicos) ? disciplina.topicos : [];
}

export function coberturaDaDisciplina(disciplina) {
  const topicos = topicosDe(disciplina);
  if (topicos.length === 0) return Number(disciplina?.percentual || 0);
  const feitos = topicos.filter((topico) => topico?.concluido).length;
  return Math.round((feitos / topicos.length) * 100);
}

// A disciplina com os numeros do edital colados nela, para a tela nao ter de recalcular.
export function comPesoDaProva(disciplinas, prova) {
  return (Array.isArray(disciplinas) ? disciplinas : []).filter(Boolean).map((disciplina) => {
    const peso = pesoNaProva(disciplina, prova);
    const topicos = topicosDe(disciplina);
    return {
      disciplina,
      naProva: peso,
      pontos: peso?.pontos || 0,
      cobertura: coberturaDaDisciplina(disciplina),
      topicos: topicos.length,
      concluidos: topicos.filter((topico) => topico?.concluido).length,
    };
  });
}

// Ordena por quanto a materia vale na prova.
//
// Disciplina fora do quadro de provas vai para o fim, nao para o comeco: "nao sei quanto
// vale" nao e o mesmo que "vale pouco", mas colocar no topo o que nao se sabe seria pior do
// que deixar por ultimo o que o edital nao mediu. Empate desempata pelo nome, para a ordem
// nao dancar entre um carregamento e outro.
export function ordenarPorPeso(disciplinas, prova) {
  return comPesoDaProva(disciplinas, prova)
    .sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos;
      return String(a.disciplina.nome || '').localeCompare(String(b.disciplina.nome || ''), 'pt-BR');
    })
    .map((item) => item.disciplina);
}

// Por onde comecar agora.
//
// Nao e so "a que vale mais": e a que vale muito E ainda esta parada. Uma disciplina de 40
// questoes ja 90% feita nao e mais o melhor lugar para investir a proxima hora. O criterio e
// quanto ainda ha para ganhar ali — pontos x (1 - cobertura).
export function porOndeComecar(disciplinas, prova, { limite = 3 } = {}) {
  return comPesoDaProva(disciplinas, prova)
    .filter((item) => item.pontos > 0 && item.cobertura < 100)
    .map((item) => ({
      ...item,
      // Pontos que a materia ainda pode render.
      aGanhar: Math.round(item.pontos * (1 - item.cobertura / 100) * 10) / 10,
    }))
    .sort((a, b) => {
      if (b.aGanhar !== a.aGanhar) return b.aGanhar - a.aGanhar;
      return String(a.disciplina.nome || '').localeCompare(String(b.disciplina.nome || ''), 'pt-BR');
    })
    .slice(0, limite);
}

// Quanto do total de pontos da prova cada disciplina representa, em %. Serve para a tela
// dizer "isto e um terco da prova" em vez de so "40 questoes".
export function fatiaDaProva(disciplinas, prova) {
  const itens = comPesoDaProva(disciplinas, prova);
  const total = itens.reduce((acc, item) => acc + item.pontos, 0);
  if (total <= 0) return new Map();

  return new Map(
    itens
      .filter((item) => item.pontos > 0)
      .map((item) => [item.disciplina.nome, Math.round((item.pontos / total) * 100)])
  );
}

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Busca e filtros.
//
// Um edital de concurso tem mais de cem topicos. Sem busca, achar "Crase" significa abrir
// disciplina por disciplina ate topar com ela. A busca casa no nome da disciplina E no nome
// do topico: quem procura "crase" quer o topico, nao a materia.
//
// Devolve as disciplinas com os topicos ja filtrados, para a tela nao ter de filtrar de novo
// na hora de desenhar — e para o contador dizer a verdade sobre o que esta aparecendo.
export function filtrarEdital(disciplinas, { busca = '', apenasPendentes = false, paraRevisar = null } = {}) {
  const termo = normalizar(busca);
  const revisar = paraRevisar instanceof Set ? paraRevisar : null;

  return (Array.isArray(disciplinas) ? disciplinas : [])
    .filter(Boolean)
    .map((disciplina) => {
      const nomeCasa = termo ? normalizar(disciplina.nome).includes(termo) : true;
      const todos = topicosDe(disciplina);

      const topicos = todos.filter((topico) => {
        // Disciplina cujo NOME casa com a busca mostra todos os topicos: quem digitou
        // "Portugues" quer a materia inteira, nao os topicos que repetem a palavra.
        if (termo && !nomeCasa && !normalizar(topico?.nome).includes(termo)) return false;
        if (apenasPendentes && topico?.concluido) return false;
        if (revisar && !revisar.has(chaveDoTopico(disciplina.nome, topico?.nome))) return false;
        return true;
      });

      return { ...disciplina, topicos, topicosNoTotal: todos.length };
    })
    .filter((disciplina) => {
      // Sem busca e sem filtro, disciplina vazia continua aparecendo — e ela que leva o
      // botao de adicionar topico. Com filtro ativo, sumir e o certo: o aluno pediu um
      // recorte, e linha vazia dentro do recorte e ruido.
      const filtrando = Boolean(termo) || apenasPendentes || Boolean(revisar);
      if (!filtrando) return true;
      if (termo && normalizar(disciplina.nome).includes(termo) && !apenasPendentes && !revisar) return true;
      return disciplina.topicos.length > 0;
    });
}

// Chave de um topico dentro de uma disciplina. E como a revisao espacada guarda os cards
// (por nome de disciplina + nome de topico), entao e por nome que os dois se encontram.
export function chaveDoTopico(disciplina, topico) {
  return `${normalizar(disciplina)}::${normalizar(topico)}`;
}

// Quantos topicos sobraram depois do filtro, para o contador da tela.
export function contarTopicos(disciplinas) {
  return (Array.isArray(disciplinas) ? disciplinas : []).reduce(
    (acc, disciplina) => acc + topicosDe(disciplina).length,
    0
  );
}
