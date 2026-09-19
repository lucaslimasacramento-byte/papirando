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
import { CHARS_MINIMO_EDITAL } from '../../api/_edital-text.js';

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

// Compatibilidade entre os cargos que o aluno escolheu do mesmo edital.
//
// Quando ele marca dois cargos, a pergunta que importa é uma só: estudar os dois é quase
// dobrar o esforço, ou boa parte se aproveita? Sem responder isso na hora da escolha, ele só
// descobre depois de ter dois cursos montados.
//
// É a mesma conta do Conciliador (disciplinas em comum sobre a união), feita aqui na tela
// porque os dados já estão em memória: é instantâneo e não gasta uma chamada de IA.
export function compatibilidadeDeCargos(cargos) {
  const mapas = (cargos || []).map(
    (cargo) =>
      new Map(
        (cargo?.disciplinas || [])
          .map((disciplina) => [chaveDeDisciplina(disciplina?.nome), String(disciplina?.nome || '').trim()])
          .filter(([chave, nome]) => chave && nome)
      )
  );

  if (mapas.length < 2) return { percentual: 0, comuns: [], exclusivos: mapas.map(() => 0), uniao: 0 };

  const [primeiro, ...resto] = mapas;
  // Comum = está em TODOS os cargos escolhidos. Com três cargos, o que aparece em dois não
  // conta: o número tem que significar "isto eu estudo uma vez e vale para tudo".
  const comuns = [...primeiro.entries()]
    .filter(([chave]) => resto.every((mapa) => mapa.has(chave)))
    .map(([, nome]) => nome);

  const chavesComuns = new Set(
    [...primeiro.keys()].filter((chave) => resto.every((mapa) => mapa.has(chave)))
  );
  const exclusivos = mapas.map(
    (mapa) => [...mapa.keys()].filter((chave) => !chavesComuns.has(chave)).length
  );
  const uniao = new Set(mapas.flatMap((mapa) => [...mapa.keys()])).size;

  return {
    percentual: uniao > 0 ? Math.round((comuns.length / uniao) * 100) : 0,
    comuns,
    exclusivos,
    uniao,
  };
}
