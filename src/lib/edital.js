// Leitura do edital do lado do aluno: sanidade do documento, data da prova e versão lida.
//
// Checagem de sanidade do documento, antes de gastar uma análise de IA.
//
// Medido em docs/TESTE-EXTRACAO-EDITAL.md: de 16 arquivos baixados de domínio oficial com
// "edital" na URL ou no título, 3 eram comunicado de recurso, convocação e resultado —
// ~19%. Sem este aviso, o aluno sobe um comunicado de uma página, recebe um plano vazio e
// conclui que o app não funciona.
//
// O limiar vem do mesmo módulo que o backend usa para recortar o texto, para não existirem
// duas verdades sobre o que é um edital de abertura.
import { CHARS_MINIMO_EDITAL } from './editalLimites.js';

// O aluno pode legitimamente colar só o anexo de conteúdo programático, que é curto. Então
// isto AVISA, nunca bloqueia: quem decide é ele.
export function pareceEditalDeAbertura(texto) {
  const limpo = String(texto || '').trim();
  return limpo.length >= CHARS_MINIMO_EDITAL;
}

/**
 * Avisos a mostrar sobre o documento que o aluno enviou. Lista vazia = nada a dizer.
 */
export function avisosDoDocumento(texto, { nomeDoArquivo = '' } = {}) {
  const limpo = String(texto || '').trim();
  const avisos = [];

  if (!limpo) return avisos;

  if (!pareceEditalDeAbertura(limpo)) {
    avisos.push(
      'Este documento é curto para um edital de abertura. Se for um comunicado, uma ' +
      'retificação ou um resultado, a leitura vai sair pobre — confira se é mesmo o edital. ' +
      'Se você colou só o conteúdo programático, pode seguir.'
    );
  }

  if (/retificad|retifica[çc][ãa]o/i.test(limpo.slice(0, 4000))) {
    avisos.push(
      'Este edital está marcado como retificado. Confirme que é a versão mais recente — o ' +
      'seu plano é montado em cima do arquivo que você enviar agora.'
    );
  }

  if (nomeDoArquivo && /comunicado|resultado|gabarito|convoca|homologa/i.test(nomeDoArquivo)) {
    avisos.push(
      `O nome do arquivo ("${nomeDoArquivo}") sugere que não é o edital de abertura.`
    );
  }

  return avisos;
}

// A IA devolve a data da prova como o edital escreve — "26/04/2026", "26 de abril de 2026"
// ou "Nao encontrado". O curso guarda ISO (usado como `${prova_data}T00:00:00`), e a data da
// prova é o eixo de Planejamento, Metas e Revisões: sem ela metade do app não se orienta.
const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function parseEditalDate(value) {
  const texto = String(value || '').trim();
  if (!texto || /n[ãa]o\s*encontrado/i.test(texto)) return '';

  const iso = texto.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const barra = texto.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (barra) {
    const [, dia, mes, ano] = barra;
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  const extenso = texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .match(/(\d{1,2})\s*de\s*([a-z]+)\s*de\s*(\d{4})/i);
  if (extenso) {
    const alvo = extenso[2].toLowerCase();
    const mes = MESES_PT.findIndex(
      (nome) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '') === alvo
    );
    if (mes >= 0) {
      return `${extenso[3]}-${String(mes + 1).padStart(2, '0')}-${String(extenso[1]).padStart(2, '0')}`;
    }
  }

  return '';
}

// Impressão do texto do edital, para saber depois se o aluno está com a mesma versão.
// Não é criptográfico — é só o suficiente para detectar que o documento mudou.
export function impressaoDoEdital(texto) {
  const limpo = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!limpo) return '';
  let hash = 0;
  for (let i = 0; i < limpo.length; i += 1) {
    hash = (hash * 31 + limpo.charCodeAt(i)) | 0;
  }
  return `${limpo.length}-${(hash >>> 0).toString(36)}`;
}

// Casa a disciplina do plano com a linha do quadro de provas. O nome da disciplina passa
// por canonicalizacao ao entrar no app ("Portugues" vira "Lingua Portuguesa"), entao a
// comparacao tem que ser frouxa: sem acento, sem caixa, sem pontuacao.
export function chaveDeDisciplina(nome) {
  return String(nome || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function acharLinhaDaProva(prova, nomeDaDisciplina) {
  if (!Array.isArray(prova) || !prova.length) return null;
  const alvo = chaveDeDisciplina(nomeDaDisciplina);
  if (!alvo) return null;
  return prova.find((linha) => {
    const chave = chaveDeDisciplina(linha?.disciplina);
    return chave && (chave === alvo || chave.includes(alvo) || alvo.includes(chave));
  }) || null;
}

// Palavras que aparecem no nome da disciplina sem mudar qual disciplina e. Edital chama a
// mesma materia de "Nocoes de Informatica", "Informatica Basica" e "Informatica" no mesmo
// documento — comparando o nome cru, viram tres disciplinas diferentes.
const RUIDO_NO_NOME = new Set([
  'nocoes', 'nocao', 'conhecimentos', 'conhecimento', 'fundamentos', 'elementos', 'aspectos',
  'basica', 'basico', 'basicos', 'basicas', 'geral', 'gerais', 'aplicada', 'aplicado',
  'pertinente', 'pertinentes', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'os',
  'as', 'ao', 'aos', 'sobre', 'para', 'com',
]);

// Nomes que o edital usa como sinonimos exatos.
const SINONIMOS_DE_DISCIPLINA = new Map([
  ['lingua portuguesa', 'portugues'],
  ['portugues', 'portugues'],
  ['lingua inglesa', 'ingles'],
  ['lingua espanhola', 'espanhol'],
  ['matematica basica', 'matematica'],
]);

// Cabecas genericas demais para casar sozinhas: "Direito" nao diz qual direito, e deixar
// casar por conta propria faria Direito Penal virar Direito Administrativo.
const CABECA_GENERICA = new Set(['direito', 'legislacao', 'lei', 'estatuto', 'codigo', 'teoria']);

function tokensDaDisciplina(nome) {
  const limpo = String(nome || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const sinonimo = SINONIMOS_DE_DISCIPLINA.get(limpo);
  const base = sinonimo || limpo;

  return new Set(base.split(' ').filter((palavra) => palavra && !RUIDO_NO_NOME.has(palavra)));
}

// Duas disciplinas sao a mesma quando sobram os mesmos tokens, ou quando uma e o nome da
// outra com um recorte a mais ("Historia" x "Historia do Brasil"). O recorte so vale se o
// nome menor disser de fato qual materia e.
export function mesmaDisciplina(umNome, outroNome) {
  const a = tokensDaDisciplina(umNome);
  const b = tokensDaDisciplina(outroNome);
  if (!a.size || !b.size) return false;

  const [menor, maior] = a.size <= b.size ? [a, b] : [b, a];
  const contido = [...menor].every((token) => maior.has(token));
  if (!contido) return false;
  if (menor.size === maior.size) return true;
  // Com dois tokens ou mais o nome menor ja identifica a materia ("Direito Penal" dentro de
  // "Direito Penal Militar"). Com um so, exige que ele nao seja uma cabeca generica.
  if (menor.size >= 2) return true;
  const unico = [...menor][0];
  return unico.length >= 6 && !CABECA_GENERICA.has(unico);
}

// Compatibilidade entre os cargos que o aluno escolheu do mesmo edital.
//
// Quando ele marca dois cargos, a pergunta que importa é uma só: estudar os dois é quase
// dobrar o esforço, ou boa parte se aproveita? Sem responder isso na hora da escolha, ele só
// descobre depois de ter dois cursos montados.
//
// O número em destaque é o APROVEITAMENTO — quanto do cargo menor já cai no maior — e não a
// razão entre comuns e união. É comum um cargo ser o outro com disciplinas a mais (oficial x
// praça), e a razão sobre a união pune isso: um cargo inteiramente contido no outro aparecia
// com 31%, sugerindo dois estudos separados quando na prática é um só com apêndice.
export function compatibilidadeDeCargos(cargos) {
  const listas = (cargos || []).map((cargo) =>
    (cargo?.disciplinas || [])
      .map((disciplina) => String(disciplina?.nome || '').trim())
      .filter(Boolean)
  );

  const vazio = {
    percentual: 0,
    aproveitamento: 0,
    comuns: [],
    exclusivos: listas.map((_, idx) => ({ nome: nomeDoCargo(cargos?.[idx], idx), disciplinas: [] })),
    acrescimo: 0,
    uniao: 0,
    contido: false,
  };

  if (listas.length < 2 || listas.some((lista) => !lista.length)) return vazio;

  const [primeira, ...resto] = listas;
  const comuns = primeira.filter((nome) =>
    resto.every((lista) => lista.some((outro) => mesmaDisciplina(nome, outro)))
  );

  const exclusivos = listas.map((lista, idx) => ({
    nome: nomeDoCargo(cargos[idx], idx),
    // O nome das exclusivas, não só a contagem: é assim que dá para ver se a diferença é
    // real ou se foram dois jeitos de escrever a mesma matéria.
    disciplinas: lista.filter((nome) => !comuns.some((comum) => mesmaDisciplina(nome, comum))),
  }));

  // União contando nomes equivalentes uma vez só.
  const uniao = [];
  listas.flat().forEach((nome) => {
    if (!uniao.some((existente) => mesmaDisciplina(existente, nome))) uniao.push(nome);
  });

  const menorLista = Math.min(...listas.map((lista) => lista.length));
  const maiorLista = Math.max(...listas.map((lista) => lista.length));

  return {
    percentual: uniao.length > 0 ? Math.round((comuns.length / uniao.length) * 100) : 0,
    aproveitamento: menorLista > 0 ? Math.round((comuns.length / menorLista) * 100) : 0,
    comuns,
    exclusivos,
    // Quantas disciplinas o segundo cargo acrescenta a quem já estudaria o maior. É o custo
    // real de levar os dois, e o que o aluno realmente quer saber.
    acrescimo: Math.max(0, uniao.length - maiorLista),
    uniao: uniao.length,
    contido: comuns.length === menorLista,
  };
}

function nomeDoCargo(cargo, indice) {
  return String(cargo?.roleName || cargo?.title || `Cargo ${indice + 1}`).trim();
}

// Funde as disciplinas dos cargos escolhidos numa lista só, marcando em quais cargos cada
// uma cai.
//
// Revisar cargo a cargo desfaz o raciocínio que o aluno acabou de fazer na tela anterior:
// ele viu que os dois cargos se aproveitam e aí é obrigado a conferir duas listas quase
// iguais, sem enxergar o que é compartilhado. Aqui ele revisa uma vez; na hora de criar,
// cada curso leva só o que é dele.
//
// Os tópicos também são fundidos, e também carregam a marca do cargo: a mesma disciplina
// costuma ter recortes diferentes para oficial e para praça, e levar o tópico de um para o
// curso do outro colocaria no plano conteúdo que não cai na prova dele.
export function mesclarDisciplinasDeCargos(cargos, preMarcar = true) {
  const itens = [];

  (cargos || []).forEach((cargo) => {
    const idCargo = cargo?.id;

    (cargo?.disciplinas || []).forEach((disciplina) => {
      const nome = String(disciplina?.nome || '').trim();
      if (!nome) return;

      const topicos = (disciplina.topicos || []).map((topico) => String(topico || '').trim()).filter(Boolean);
      const existente = itens.find((item) => mesmaDisciplina(item.nomeOriginal, nome));

      if (!existente) {
        itens.push({
          nomeOriginal: nome,
          nome,
          incluir: preMarcar,
          cargos: [idCargo],
          topicos: topicos.map((nomeTopico) => ({ nome: nomeTopico, incluir: preMarcar, cargos: [idCargo] })),
        });
        return;
      }

      if (!existente.cargos.includes(idCargo)) existente.cargos.push(idCargo);

      topicos.forEach((nomeTopico) => {
        const chave = chaveDeDisciplina(nomeTopico);
        const topicoExistente = existente.topicos.find((topico) => chaveDeDisciplina(topico.nome) === chave);
        if (topicoExistente) {
          if (!topicoExistente.cargos.includes(idCargo)) topicoExistente.cargos.push(idCargo);
          return;
        }
        existente.topicos.push({ nome: nomeTopico, incluir: preMarcar, cargos: [idCargo] });
      });
    });
  });

  return itens;
}

// Quantos objetivos um edital pode render de uma vez.
//
// Três é o teto porque é onde a comparação ainda cabe na tela e a decisão continua
// pensável: acima disso o aluno não está escolhendo entre cargos, está colecionando.
export const LIMITE_DE_OBJETIVOS_POR_EDITAL = 3;

// A grade "disciplina × cargo" da tela de escolha.
//
// Antes a tela mostrava oito disciplinas comuns e um "+3" — justo quando o aluno está
// decidindo se leva os dois cargos, e é a lista inteira que responde isso. Uma chip escondida
// pode ser a matéria que ele odeia. Aqui sai tudo, em linhas, com uma coluna por cargo.
//
// Ordem: primeiro o que cai em todos os cargos, depois o que cai em alguns, por fim as
// exclusivas — é a leitura que o aluno faz, do compartilhado para o que custa a mais.
export function matrizDeDisciplinas(cargos) {
  const lista = Array.isArray(cargos) ? cargos : [];
  const colunas = lista.map((cargo, indice) => nomeDoCargo(cargo, indice));

  const linhas = [];
  lista.forEach((cargo, indice) => {
    (cargo?.disciplinas || []).forEach((disciplina) => {
      const nome = String(disciplina?.nome || '').trim();
      if (!nome) return;

      const existente = linhas.find((linha) => mesmaDisciplina(linha.nome, nome));
      if (existente) {
        existente.em[indice] = true;
        // Entre dois jeitos de escrever a mesma matéria, fica o nome mais completo:
        // "Noções de Direito Penal" diz mais que "Direito Penal".
        if (nome.length > existente.nome.length) existente.nome = nome;
        return;
      }

      const em = lista.map(() => false);
      em[indice] = true;
      linhas.push({ nome, em });
    });
  });

  linhas.forEach((linha) => {
    linha.quantos = linha.em.filter(Boolean).length;
  });

  linhas.sort((a, b) => b.quantos - a.quantos || a.nome.localeCompare(b.nome, 'pt-BR'));

  return {
    colunas,
    linhas,
    // Quantas caem em todos os cargos escolhidos — o número que justifica um curso só.
    emTodos: linhas.filter((linha) => linha.quantos === colunas.length).length,
    total: linhas.length,
  };
}
