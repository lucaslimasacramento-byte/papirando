// O que cada tipo de objetivo tem — e o que ele não tem.
//
// Um curso pode juntar um concurso com a faculdade. Só que concurso tem data de prova,
// banca e vagas; faculdade tem semestre e não tem prova única. Enquanto a plataforma tratou
// tudo como concurso, a faculdade aparecia com "Sem data" no lugar de um prazo real e com
// campos de banca vazios ocupando espaço.
//
// Aqui fica a regra de cada tipo, num lugar só: o rótulo do prazo, se há contagem de dias, e
// quais campos fazem sentido. As telas perguntam em vez de assumir.

export const TIPOS_DE_OBJETIVO = {
  concurso: {
    id: 'concurso',
    label: 'Concurso',
    rotuloDoPrazo: 'Prova',
    rotuloDaContagem: 'para a prova',
    // Campos que a tela mostra e o modal edita. Fora daqui, não aparecem.
    campos: ['banca', 'cargo', 'vagas', 'salario', 'escolaridade'],
    temPrazo: true,
  },
  vestibular: {
    id: 'vestibular',
    label: 'Vestibular',
    rotuloDoPrazo: 'Prova',
    rotuloDaContagem: 'para a prova',
    campos: ['banca', 'vagas'],
    temPrazo: true,
  },
  faculdade: {
    id: 'faculdade',
    label: 'Graduação',
    // Semestre não termina em prova única: o prazo é o fim do período.
    rotuloDoPrazo: 'Fim do período',
    rotuloDaContagem: 'para fechar o período',
    campos: ['instituicao', 'periodo'],
    temPrazo: true,
  },
  livre: {
    id: 'livre',
    label: 'Estudo livre',
    // Estudo livre não tem prazo, e inventar um seria transformar em cobrança o que o aluno
    // escolheu fazer sem cobrança.
    rotuloDoPrazo: '',
    rotuloDaContagem: '',
    campos: [],
    temPrazo: false,
  },
};

export const LISTA_DE_TIPOS = Object.values(TIPOS_DE_OBJETIVO);

export function tipoDoObjetivo(objetivo) {
  const id = String(objetivo?.tipo || '').toLowerCase();
  return TIPOS_DE_OBJETIVO[id] || TIPOS_DE_OBJETIVO.concurso;
}

export function temCampo(objetivo, campo) {
  return tipoDoObjetivo(objetivo).campos.includes(campo);
}

// O prazo do objetivo, seja ele qual for.
//
// Devolve null quando não há prazo (estudo livre) ou quando a data não foi informada —
// e nesse caso a tela não deve inventar "Sem data" com cara de alerta.
export function marcoDoObjetivo(objetivo, hoje = new Date()) {
  const tipo = tipoDoObjetivo(objetivo);
  if (!tipo.temPrazo) return null;

  const data = String(objetivo?.prova_data || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;

  const alvo = new Date(`${data}T00:00:00`);
  if (Number.isNaN(alvo.getTime())) return null;

  // Meia-noite local dos dois lados: comparar contra a hora atual desviava a contagem em
  // até um dia conforme o horário em que a tela era aberta.
  const referencia = new Date(hoje);
  referencia.setHours(0, 0, 0, 0);

  return {
    data,
    rotulo: tipo.rotuloDoPrazo,
    rotuloDaContagem: tipo.rotuloDaContagem,
    dias: Math.ceil((alvo.getTime() - referencia.getTime()) / 86400000),
  };
}

// O prazo mais próximo entre os objetivos do curso — é ele que aperta a rotina.
export function marcoMaisProximo(objetivos, hoje = new Date()) {
  const marcos = (objetivos || [])
    .map((objetivo) => {
      const marco = marcoDoObjetivo(objetivo, hoje);
      return marco ? { ...marco, objetivo } : null;
    })
    .filter(Boolean)
    // Prazo vencido não aperta mais nada: o que importa é o próximo que ainda vem.
    .filter((marco) => marco.dias >= 0)
    .sort((a, b) => a.dias - b.dias);

  return marcos[0] || null;
}

// Um curso mistura tipos? Muda o que a tela pode prometer: "faltam X dias" só vale quando
// todos os objetivos correm para o mesmo prazo.
export function tiposDoCurso(objetivos) {
  return [...new Set((objetivos || []).map((objetivo) => tipoDoObjetivo(objetivo).id))];
}
