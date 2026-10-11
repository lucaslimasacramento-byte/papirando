// Em que situacao esta a assinatura do aluno, e o que ele pode fazer.
//
// A politica mudou: nao existe mais plano gratuito. Toda conta ganha 30 dias ao se
// cadastrar; passados os 30, so continua usando quem paga. Vencido, o aluno NAO perde o que
// construiu — ele continua vendo edital, cursos e progresso. O que ele perde e a capacidade
// de ESCREVER: estudar, criar, importar, gerar.
//
// Este modulo existe para que essa regra tenha UM lugar so. A alternativa seria um `if`
// espalhado por cada botao do app, e a diferenca entre as duas nao e estilo: com a regra
// espalhada, esquecer um caminho e questao de tempo, e cada caminho esquecido e um aluno
// vencido usando de graca — ou, pior, um aluno pagante bloqueado por engano.

export const DIAS_DE_CORTESIA = 30;

export const SITUACAO = {
  TRIAL: 'trial',
  ATIVO: 'ativo',
  VENCIDO: 'vencido',
  // Conta sem nenhuma linha de assinatura. Nao deveria acontecer depois que o trial passou
  // a ser concedido no cadastro, mas conta antiga existe — e tratar como vencido bloquearia
  // quem nunca teve chance. Ver `semAssinatura` abaixo.
  SEM_ASSINATURA: 'sem_assinatura',
};

function paraData(valor) {
  if (!valor) return null;
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

// Dias INTEIROS que faltam, nao arredondados para cima.
//
// Com arredondamento para cima, 12 horas restantes viram "falta 1 dia" — e o aluno que le
// isso as 23h descobre no dia seguinte que o prazo era hoje. Arredondando para baixo, 12
// horas viram 0, e 0 e exatamente o caso em que o aviso deve dizer "termina hoje".
function diasAte(fim, agora) {
  if (!fim) return null;
  return Math.max(0, Math.floor((fim.getTime() - agora.getTime()) / 86400000));
}

// A situacao da conta hoje.
//
// `isAdmin` entra aqui porque administrador precisa abrir o app para dar suporte; nao e
// assinatura, e um atalho de acesso — e por isso vem como campo separado na resposta, e nao
// disfarcado de plano (ver src/components/SubscriptionPlanSeal.jsx).
export function estadoDaAssinatura({ assinatura = null, isAdmin = false, agora = new Date() } = {}) {
  const status = String(assinatura?.status || '').toLowerCase();
  const fim = paraData(assinatura?.current_period_end);
  const venceu = Boolean(fim && fim.getTime() <= agora.getTime());

  let situacao;
  if (!assinatura) situacao = SITUACAO.SEM_ASSINATURA;
  else if (status === 'trialing') situacao = venceu ? SITUACAO.VENCIDO : SITUACAO.TRIAL;
  else if (status === 'active') situacao = venceu ? SITUACAO.VENCIDO : SITUACAO.ATIVO;
  else situacao = SITUACAO.VENCIDO;

  const diasRestantes = situacao === SITUACAO.TRIAL || situacao === SITUACAO.ATIVO
    ? diasAte(fim, agora)
    : 0;

  // Quem pode escrever: admin sempre; assinatura em dia (paga ou em cortesia) sempre; e a
  // conta sem assinatura nenhuma, que ainda vai receber a dela.
  const podeEscrever = isAdmin
    || situacao === SITUACAO.TRIAL
    || situacao === SITUACAO.ATIVO
    || situacao === SITUACAO.SEM_ASSINATURA;

  return {
    situacao,
    diasRestantes,
    // Pago de verdade — nao conta cortesia nem atalho de admin. E o que o selo do cabecalho
    // e a pagina de Assinatura devem mostrar.
    ehPagante: situacao === SITUACAO.ATIVO,
    emCortesia: situacao === SITUACAO.TRIAL,
    venceu: situacao === SITUACAO.VENCIDO,
    podeEscrever,
    // So para a interface: admin vendo tudo liberado nao deve ver aviso de cortesia.
    porSerAdmin: isAdmin,
  };
}

// A frase que o aluno le. Curta, e sem rodeio sobre o que acontece.
export function avisoDaAssinatura(estado) {
  if (!estado || estado.porSerAdmin) return null;

  if (estado.situacao === SITUACAO.TRIAL) {
    const dias = estado.diasRestantes;
    if (dias <= 0) return { tom: 'warn', texto: 'Seu período de cortesia termina hoje.' };
    if (dias <= 7) {
      return {
        tom: 'warn',
        texto: `Faltam ${dias} ${dias === 1 ? 'dia' : 'dias'} do seu período de cortesia.`,
      };
    }
    return {
      tom: 'neutro',
      texto: `Você está nos 30 dias de cortesia — faltam ${dias} dias.`,
    };
  }

  if (estado.situacao === SITUACAO.VENCIDO) {
    return {
      tom: 'danger',
      // Diz o que continua valendo, nao so o que acabou: o medo de perder o que construiu e
      // o que faz o aluno abandonar em vez de assinar.
      texto: 'Seu período de cortesia terminou. Seus dados continuam aqui — assine para voltar a estudar.',
    };
  }

  return null;
}

// Mensagem de uma acao barrada. Recebe o que o aluno tentou fazer, para o aviso falar da
// acao dele e nao de "recurso indisponivel".
export function motivoDoBloqueio(acao = '') {
  const oQue = String(acao || '').trim();
  return oQue
    ? `${oQue} faz parte do Papiro. Seu período de cortesia terminou — assine para continuar.`
    : 'Seu período de cortesia terminou. Assine o Papiro para continuar.';
}
