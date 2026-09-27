// O ritmo que a prova impoe — e o que ele diz sobre como estudar.
//
// O edital nao traz so o conteudo: traz quanto tempo o aluno tera, quantas questoes
// enfrentara e se havera redacao. Desses tres numeros sai uma coisa que nenhum wizard
// consegue perguntar direito ao aluno: quantos minutos ele tem por questao no dia da prova.
// Quem faz DPU (120 questoes em 3h30) precisa treinar velocidade; quem faz uma prova de
// 40 questoes em 4h precisa treinar profundidade. Sao preparacoes diferentes, e ate aqui
// a plataforma montava o mesmo cronograma para as duas.
//
// Nada aqui inventa numero: sem o dado no edital, o campo fica vazio e a tela nao mostra.

// Uma redacao de concurso consome cerca de 1h30 do tempo de prova (leitura da proposta,
// rascunho, texto definitivo e passagem a limpo). O edital quase nunca separa esse tempo
// do tempo da objetiva, entao a descontamos antes de calcular o ritmo por questao — sem
// isso, uma prova com redacao parece muito mais folgada do que e.
export const MINUTOS_DA_REDACAO = 90;

const PADROES_DE_REDACAO = /reda[cç][aã]o|discursiv|disserta|prova escrita|pe[cç]a pr[aá]tica/i;

// Detecta redacao/discursiva nas etapas do certame e no quadro de provas.
export function temRedacao(etapas = [], prova = []) {
  const lista = [
    ...(Array.isArray(etapas) ? etapas : []),
    ...(Array.isArray(prova) ? prova.map((linha) => linha?.disciplina) : []),
  ];
  return lista.some((item) => PADROES_DE_REDACAO.test(String(item || '')));
}

// "4 horas", "4h30", "3h e 30min", "240 minutos", "4:30" — o edital escreve de todo jeito.
export function minutosDaProva(texto) {
  const cru = String(texto ?? '').toLowerCase().trim();
  if (!cru) return 0;

  // "4:30"
  const relogio = cru.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (relogio) return Number(relogio[1]) * 60 + Number(relogio[2]);

  // "4h30" — os minutos vem colados no h, sem sufixo nenhum.
  const horaColada = cru.match(/(\d+)\s*h\s*(\d{1,2})(?!\d)\s*(?:min|m\b)?/);
  if (horaColada) return Number(horaColada[1]) * 60 + Number(horaColada[2]);

  const horas = cru.match(/(\d+)\s*(?:h|horas?\b)/);
  const minutos = cru.match(/(\d+)\s*(?:min|minutos?\b|m\b)/);
  if (horas || minutos) {
    return (horas ? Number(horas[1]) * 60 : 0) + (minutos ? Number(minutos[1]) : 0);
  }

  // Numero solto: acima de 12 sao minutos ("240"), abaixo disso sao horas ("4").
  const solto = Number(cru.replace(',', '.'));
  if (!Number.isFinite(solto) || solto <= 0) return 0;
  return solto <= 12 ? Math.round(solto * 60) : Math.round(solto);
}

function questoesDaLinha(linha) {
  // "50" ou "50 questoes" ou "50 itens".
  const numero = String(linha?.questoes ?? '').match(/\d+/);
  return numero ? Number(numero[0]) : 0;
}

function pesoDaLinha(linha) {
  const numero = Number(String(linha?.peso ?? '').replace(',', '.').match(/[\d.]+/)?.[0]);
  return Number.isFinite(numero) && numero > 0 ? numero : 1;
}

// Como o aluno deveria repartir o tempo de estudo entre as disciplinas.
//
// O criterio e o que a prova cobra: questoes x peso. Uma disciplina de 10 questoes peso 3
// vale tanto quanto uma de 30 questoes peso 1 — e o edital que diz isso, nao o palpite do
// aluno sobre o que e importante.
export function pesoDasDisciplinas(prova = []) {
  const linhas = (Array.isArray(prova) ? prova : [])
    .map((linha) => {
      const questoes = questoesDaLinha(linha);
      const peso = pesoDaLinha(linha);
      return {
        nome: String(linha?.disciplina || '').trim(),
        questoes,
        peso,
        pontos: questoes * peso,
      };
    })
    .filter((linha) => linha.nome && linha.questoes > 0);

  const total = linhas.reduce((acc, linha) => acc + linha.pontos, 0);
  if (total <= 0) return [];

  const maior = Math.max(...linhas.map((linha) => linha.pontos));

  return linhas
    .map((linha) => ({
      ...linha,
      // Fatia do tempo de estudo que esta disciplina merece, em %.
      participacao: Math.round((linha.pontos / total) * 1000) / 10,
      // A mesma fatia na escala de importancia do wizard (1 a 5): a disciplina que mais
      // pontua vira 5, e as outras caem proporcionalmente. O aluno comeca com os controles
      // calibrados pelo edital em vez de tudo em 3.
      importancia: Math.max(1, Math.min(5, Math.round((linha.pontos / maior) * 4) + 1)),
    }))
    .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome, 'pt-BR'));
}

// O retrato completo da prova. Cada campo e opcional: o que o edital nao trouxer fica
// zerado, e quem consome decide o que ainda da para mostrar.
export function perfilDaProva({ prova = [], etapas = [], duracaoProva = '' } = {}) {
  const disciplinas = pesoDasDisciplinas(prova);
  const totalQuestoes = disciplinas.reduce((acc, linha) => acc + linha.questoes, 0);
  const duracaoMin = minutosDaProva(duracaoProva);
  const redacao = temRedacao(etapas, prova);
  const minutosDaRedacao = redacao ? MINUTOS_DA_REDACAO : 0;

  // O tempo que sobra para a objetiva depois de reservar a redacao.
  const minutosObjetiva = duracaoMin > 0 ? Math.max(0, duracaoMin - minutosDaRedacao) : 0;
  const minutosPorQuestao = totalQuestoes > 0 && minutosObjetiva > 0
    ? Math.round((minutosObjetiva / totalQuestoes) * 10) / 10
    : 0;

  return {
    duracaoMin,
    totalQuestoes,
    temRedacao: redacao,
    minutosDaRedacao,
    minutosObjetiva,
    minutosPorQuestao,
    disciplinas,
    // Se nao da nem para dizer quantas questoes sao, nao ha ritmo para mostrar.
    completo: totalQuestoes > 0 && minutosPorQuestao > 0,
  };
}

// Como treinar, dado o ritmo. Os cortes saem das provas reais: 120 itens em 3h30 (Cebraspe)
// dao 1min45 por item — ler, decidir e marcar sem folga nenhuma, o que e uma prova de
// velocidade. Acima de 3 minutos por questao ha tempo para raciocinar na hora, e o treino
// muda de natureza.
export function ritmoDeTreino(perfil) {
  const minutos = Number(perfil?.minutosPorQuestao || 0);
  if (!(minutos > 0)) return null;

  if (minutos < 2) {
    return {
      id: 'velocidade',
      titulo: 'Prova de velocidade',
      detalhe: `${formatarRitmo(minutos)} por questao. Treine com cronometro desde agora: bloco de questoes cronometrado vale mais que teoria repetida.`,
    };
  }
  if (minutos > 3) {
    return {
      id: 'profundidade',
      titulo: 'Prova de profundidade',
      detalhe: `${formatarRitmo(minutos)} por questao. Ha tempo para raciocinar na prova — priorize entender a fundo em vez de decorar atalhos.`,
    };
  }
  return {
    id: 'equilibrio',
    titulo: 'Ritmo equilibrado',
    detalhe: `${formatarRitmo(minutos)} por questao. Alterne teoria e questoes cronometradas para manter o passo.`,
  };
}

// O quadro de provas escreve "Língua Portuguesa" onde a disciplina do aluno diz
// "Portugues". Sem normalizar, o peso do edital nunca encontraria a materia.
function chaveDaDisciplina(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(lingua|nocoes|conhecimentos|de|da|do|das|dos|e)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// A importancia (1 a 5) que o edital atribui a cada disciplina, pronta para pre-carregar
// os controles do wizard. Disciplina fora do quadro de provas nao aparece — quem consome
// mantem o valor que o aluno ja tinha.
export function importanciaDoEdital(perfil) {
  const mapa = new Map();
  (perfil?.disciplinas || []).forEach((linha) => {
    const chave = chaveDaDisciplina(linha.nome);
    if (chave) mapa.set(chave, linha);
  });
  return mapa;
}

export function linhaDaDisciplina(perfil, nome) {
  const chave = chaveDaDisciplina(nome);
  if (!chave) return null;

  const mapa = importanciaDoEdital(perfil);
  const exata = mapa.get(chave);
  if (exata) return exata;

  // "Portugues" x "Portuguesa", "Direito Constitucional" x "Direito Const.": o edital e a
  // disciplina do aluno raramente flexionam igual. Um prefixo comum de 5 letras ja e
  // especifico o bastante para nao casar "Direito Penal" com "Direito Civil" (que divergem
  // na segunda palavra) e generoso o bastante para o plural e o feminino.
  for (const [outra, linha] of mapa) {
    const tamanho = Math.min(chave.length, outra.length);
    if (tamanho >= 5 && chave.slice(0, tamanho) === outra.slice(0, tamanho)) return linha;
  }
  return null;
}

export function formatarRitmo(minutos) {
  const numero = Number(minutos) || 0;
  if (numero <= 0) return '';
  if (numero < 1) return `${Math.round(numero * 60)}s`;
  const inteiras = Math.floor(numero);
  const segundos = Math.round((numero - inteiras) * 60);
  return segundos === 0 ? `${inteiras}min` : `${inteiras}min${String(segundos).padStart(2, '0')}`;
}

export function formatarDuracao(minutos) {
  const numero = Number(minutos) || 0;
  if (numero <= 0) return '';
  const horas = Math.floor(numero / 60);
  const resto = numero % 60;
  if (horas === 0) return `${resto}min`;
  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, '0')}`;
}
