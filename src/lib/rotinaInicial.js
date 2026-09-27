// A rotina que o aluno define logo depois de subir o edital.
//
// O edital diz O QUE estudar. A rotina diz QUANDO — e sem ela metade da plataforma fica
// parada: a rotina do dia não sabe quantos minutos cabem, a meta da semana não tem base, as
// revisões não têm onde encaixar. Mandar o aluno para outra aba depois de importar é pedir
// que ele recomece um fluxo que já estava na mão.
//
// A carga é POR DIA, não uma média. Quem trabalha estuda 1h na terça e 6h no sábado; uma
// carga única obrigaria a mentir num dos dois, e o plano do dia sairia errado nos dois.
//
// Aqui fica só a regra; a tela fica em Planos.jsx.

export const DIAS_DA_SEMANA = [
  { id: 'seg', label: 'Seg', nome: 'Segunda' },
  { id: 'ter', label: 'Ter', nome: 'Terça' },
  { id: 'qua', label: 'Qua', nome: 'Quarta' },
  { id: 'qui', label: 'Qui', nome: 'Quinta' },
  { id: 'sex', label: 'Sex', nome: 'Sexta' },
  { id: 'sab', label: 'Sáb', nome: 'Sábado' },
  { id: 'dom', label: 'Dom', nome: 'Domingo' },
];

// Meia em meia hora: o aluno pensa em "1h30", não em "1,4h".
export const PASSO_DE_HORAS = 0.5;
export const HORAS_MAXIMAS_POR_DIA = 14;

// Começa em dias úteis, 3h. É o padrão de quem trabalha e estuda — e é mais fácil o aluno
// tirar um dia do que lembrar de adicionar.
export const ROTINA_PADRAO = {
  dias: { seg: true, ter: true, qua: true, qui: true, sex: true, sab: false, dom: false },
  horasPorDia: { seg: 3, ter: 3, qua: 3, qui: 3, sex: 3, sab: 3, dom: 3 },
  formato: 'ciclo',
};

export const FORMATOS = [
  {
    id: 'ciclo',
    titulo: 'Ciclo de estudos',
    detalhe: 'Uma fila de matérias que gira. Estudou, passa para a próxima — sem hora marcada.',
  },
  {
    id: 'cronograma',
    titulo: 'Cronograma fixo',
    detalhe: 'Cada matéria num dia e horário definidos, como uma grade de aula.',
  },
];

export function diasAtivos(dias) {
  return DIAS_DA_SEMANA.filter((dia) => dias?.[dia.id]).map((dia) => dia.id);
}

// Aceita tanto o formato por dia quanto a carga única que a rotina usava antes.
export function horasDoDia(rotina, id) {
  const valor = typeof rotina?.horasPorDia === 'number' ? rotina.horasPorDia : rotina?.horasPorDia?.[id];
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

export function horasNaSemana(rotina) {
  return diasAtivos(rotina?.dias).reduce((acc, id) => acc + horasDoDia(rotina, id), 0);
}

// Muda a carga de um dia só, sem mexer nos outros.
export function definirHorasDoDia(rotina, id, horas) {
  const limitado = Math.min(Math.max(Number(horas) || 0, 0), HORAS_MAXIMAS_POR_DIA);
  const atual = typeof rotina?.horasPorDia === 'number'
    ? Object.fromEntries(DIAS_DA_SEMANA.map((dia) => [dia.id, rotina.horasPorDia]))
    : { ...(rotina?.horasPorDia || {}) };

  return { ...rotina, horasPorDia: { ...atual, [id]: limitado } };
}

// Atalho para quem estuda a mesma coisa todo dia: preenche só os dias marcados.
export function aplicarATodos(rotina, horas) {
  return diasAtivos(rotina?.dias).reduce(
    (acc, id) => definirHorasDoDia(acc, id, horas),
    rotina
  );
}

// Sem nenhum dia marcado não há rotina; com todos zerados também não. O aviso é específico
// porque "preencha os campos" não diz o que fazer.
export function validarRotina(rotina) {
  const ativos = diasAtivos(rotina?.dias);
  if (ativos.length === 0) return 'Marque pelo menos um dia da semana.';
  if (horasNaSemana(rotina) <= 0) return 'Defina quantas horas você estuda em pelo menos um dia.';

  // Dia marcado com zero hora é contradição: ou ele estuda, ou o dia não devia estar
  // marcado. Dizer qual dia é o que permite corrigir sem caçar.
  const zerado = ativos.find((id) => horasDoDia(rotina, id) <= 0);
  if (zerado) {
    const dia = DIAS_DA_SEMANA.find((item) => item.id === zerado);
    return `${dia?.nome || 'Um dia'} está marcado com 0h. Defina as horas ou desmarque o dia.`;
  }
  return '';
}

// Traduz para o formato que o planejamento já usa (wizData).
export function paraWizData(rotina, materias = []) {
  const ativos = new Set(diasAtivos(rotina?.dias));

  const diasSemana = {};
  const horasPorDia = {};
  DIAS_DA_SEMANA.forEach((dia) => {
    const ativo = ativos.has(dia.id);
    diasSemana[dia.id] = ativo;
    horasPorDia[dia.id] = ativo ? horasDoDia(rotina, dia.id) : 0;
  });

  return {
    tipo: rotina?.formato === 'cronograma' ? 'cronograma' : 'ciclo',
    diasSemana,
    horasPorDia,
    horasSemana: horasNaSemana(rotina),
    materias: materias.map((nome) => String(nome)),
  };
}

// "2h30" em vez de "2,5h": é como o aluno fala.
export function formatarHoras(horas) {
  const numero = Number(horas) || 0;
  const inteiras = Math.floor(numero);
  const minutos = Math.round((numero - inteiras) * 60);
  if (minutos === 0) return `${inteiras}h`;
  return `${inteiras}h${String(minutos).padStart(2, '0')}`;
}

// Resumo de uma linha, para o aluno conferir antes de confirmar.
export function resumoDaRotina(rotina) {
  const ativos = diasAtivos(rotina?.dias);
  if (ativos.length === 0) return 'Nenhum dia marcado.';

  const total = horasNaSemana(rotina);
  const cargas = new Set(ativos.map((id) => horasDoDia(rotina, id)));
  const diasTexto = `${ativos.length} ${ativos.length === 1 ? 'dia' : 'dias'} por semana`;

  // Com a mesma carga todo dia, repetir o número é mais claro que somar de cabeça.
  if (cargas.size === 1) {
    return `${diasTexto} · ${formatarHoras([...cargas][0])} por dia · ${formatarHoras(total)} no total`;
  }
  return `${diasTexto} · ${formatarHoras(total)} no total`;
}
