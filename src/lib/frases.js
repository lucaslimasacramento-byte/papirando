// Frase do dia do painel.
//
// Sem autor de propósito: frase motivacional atribuída a alguém famoso quase sempre é
// invenção que circulou na internet, e colocar citação falsa num produto de estudo é o
// oposto do que a gente vende. Estas são escritas na voz do Papirando.
//
// O tom evita hype ("você consegue tudo!") — quem está na quinta hora de estudo não
// precisa de animação, precisa de companhia. Fala de constância, de dia ruim, de voltar.

const FRASES = [
  'Estudar hoje é mais barato do que recomeçar em janeiro.',
  'Uma hora hoje vale mais que cinco horas prometidas para domingo.',
  'O edital não cobra entusiasmo. Cobra presença.',
  'Dia ruim também conta. Só não pode virar semana.',
  'Quem revisa parece mais devagar, e chega antes.',
  'A concorrência também está cansada agora.',
  'Não precisa ser um bom dia para ser um dia estudado.',
  'Errar no simulado é o barato; errar na prova é o caro.',
  'Comece pelo tópico que você está evitando. Ele sabe que você está.',
  'Consistência é o que sobra quando a motivação acaba.',
  'Meia hora mal feita ainda é meia hora à frente de ontem.',
  'A aprovação não é um dia. É a soma dos dias comuns.',
  'Fechar o edital não adianta: ele continua aberto na data da prova.',
  'Estudar cansado é normal. Parar por isso é que vira hábito.',
  'Você não precisa de mais tempo. Precisa do próximo bloco.',
  'A matéria que você odeia costuma ser a que mais cai.',
  'Ninguém acerta questão por ter lido bonito. Acerta por ter treinado.',
  'Volte para a rotina sem cobrar os dias perdidos. Eles já foram.',
  'O que você estuda hoje, a sua versão de dezembro agradece.',
  'Ritmo vence intensidade. Sempre venceu.',
];

// A frase é do DIA, não do render: sorteio a cada re-render trocaria a frase a cada clique
// na tela, e frase que pisca vira ruído. O índice sai da data, então todo mundo que abre no
// mesmo dia vê a mesma — e ela muda sozinha na virada.
export function fraseDoDia(data = new Date()) {
  const dia = data instanceof Date && !Number.isNaN(data.getTime()) ? data : new Date();
  const diasDesdeEpoca = Math.floor(
    new Date(dia.getFullYear(), dia.getMonth(), dia.getDate()).getTime() / 86400000
  );
  return FRASES[Math.abs(diasDesdeEpoca) % FRASES.length];
}

export const TOTAL_DE_FRASES = FRASES.length;
