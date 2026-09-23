// A rotina que o aluno define logo depois de subir o edital.
//
// O edital diz O QUE estudar. A rotina diz QUANDO — e sem ela metade da plataforma fica
// parada: a rotina do dia não sabe quantos minutos cabem, a meta da semana não tem base, as
// revisões não têm onde encaixar. Mandar o aluno para outra aba depois de importar é pedir
// que ele recomece um fluxo que já estava na mão.
//
// Aqui fica só a regra; a tela fica em Planos.jsx.

export const DIAS_DA_SEMANA = [
  { id: 'seg', label: 'Seg' },
  { id: 'ter', label: 'Ter' },
  { id: 'qua', label: 'Qua' },
  { id: 'qui', label: 'Qui' },
  { id: 'sex', label: 'Sex' },
  { id: 'sab', label: 'Sáb' },
  { id: 'dom', label: 'Dom' },
];

// Começa em dias úteis, 3h. É o padrão de quem trabalha e estuda — e é mais fácil o aluno
// tirar um dia do que lembrar de adicionar.
export const ROTINA_PADRAO = {
  dias: { seg: true, ter: true, qua: true, qui: true, sex: true, sab: false, dom: false },
  horasPorDia: 3,
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

export function horasNaSemana({ dias, horasPorDia }) {
  return diasAtivos(dias).length * Number(horasPorDia || 0);
}

// Sem nenhum dia marcado não há rotina nenhuma; com 0h também não. O aviso é específico
// porque "preencha os campos" não diz o que fazer.
export function validarRotina(rotina) {
  if (diasAtivos(rotina?.dias).length === 0) {
    return 'Marque pelo menos um dia da semana.';
  }
  if (!(Number(rotina?.horasPorDia) > 0)) {
    return 'Defina quantas horas você estuda por dia.';
  }
  return '';
}

// Traduz para o formato que o planejamento já usa (wizData). A rotina pergunta uma carga
// única por dia porque é o que o aluno sabe responder de cabeça; o wizard aceita valores
// diferentes por dia e continua aceitando — quem quiser afinar, afina lá.
export function paraWizData(rotina, materias = []) {
  const ativos = new Set(diasAtivos(rotina?.dias));
  const horas = Number(rotina?.horasPorDia || 0);

  const diasSemana = {};
  const horasPorDia = {};
  DIAS_DA_SEMANA.forEach((dia) => {
    diasSemana[dia.id] = ativos.has(dia.id);
    horasPorDia[dia.id] = ativos.has(dia.id) ? horas : 0;
  });

  return {
    tipo: rotina?.formato === 'cronograma' ? 'cronograma' : 'ciclo',
    diasSemana,
    horasPorDia,
    horasSemana: ativos.size * horas,
    materias: materias.map((nome) => String(nome)),
  };
}

// Resumo de uma linha, para o aluno conferir antes de confirmar.
export function resumoDaRotina(rotina) {
  const ativos = diasAtivos(rotina?.dias);
  if (ativos.length === 0) return 'Nenhum dia marcado.';
  const horas = Number(rotina?.horasPorDia || 0);
  const total = ativos.length * horas;
  return `${ativos.length} ${ativos.length === 1 ? 'dia' : 'dias'} por semana · ${horas}h por dia · ${total}h no total`;
}
