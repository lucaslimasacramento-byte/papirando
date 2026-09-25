// Os primeiros passos do aluno, na ordem em que a plataforma realmente funciona hoje.
//
// O guia do Início ainda dizia "escolha seu alvo → monte a semana → papire", de quando o
// aluno escolhia um concurso de um catálogo pronto. Hoje o eixo é outro: ele sobe o PDF do
// edital, a IA transforma em disciplinas, tópicos, datas e pesos, e a plataforma se monta em
// cima disso. Um guia que aponta para o caminho antigo leva o aluno para uma biblioteca
// vazia — e a culpa parece dele.

export const PASSOS_INICIAIS = [
  {
    id: 'edital',
    titulo: 'Suba o seu edital',
    texto: 'O PDF vira disciplinas, tópicos, datas e o peso de cada matéria na sua prova.',
    acao: 'Subir edital',
    // Detalhe que só aparece no roteiro guiado, onde há espaço para explicar.
    detalhe: 'É daqui que a plataforma se monta. Se o edital tiver mais de um cargo, dá para levar até três — e a gente mostra o que se aproveita entre eles.',
  },
  {
    id: 'rotina',
    titulo: 'Diga quando você estuda',
    texto: 'Quais dias e quantas horas por dia. Leva uns vinte segundos.',
    acao: 'Definir rotina',
    detalhe: 'Sem isso o plano do dia não sabe quantos minutos cabem, a meta da semana não tem base e as revisões não têm onde encaixar.',
  },
  {
    id: 'sessao',
    titulo: 'Registre a primeira sessão',
    texto: 'Uma sessão curta já cria histórico e afina o que a plataforma sugere.',
    acao: 'Abrir timer',
    detalhe: 'A partir daí as sugestões deixam de ser genéricas: elas passam a olhar o que você estudou, quando, e onde está acertando menos.',
  },
];

// Marca o que já está feito e diz qual é o próximo. O guia deixa de ser um cartaz fixo e
// passa a refletir onde o aluno está.
export function primeirosPassos({ temCurso = false, rotinaConfigurada = false, temHistorico = false } = {}) {
  const feitos = { edital: Boolean(temCurso), rotina: Boolean(rotinaConfigurada), sessao: Boolean(temHistorico) };

  const passos = PASSOS_INICIAIS.map((passo) => ({ ...passo, feito: feitos[passo.id] }));
  const atual = passos.findIndex((passo) => !passo.feito);

  return {
    passos,
    // -1 quando não falta nada.
    indiceAtual: atual,
    concluido: atual === -1,
    quantosFeitos: passos.filter((passo) => passo.feito).length,
  };
}
