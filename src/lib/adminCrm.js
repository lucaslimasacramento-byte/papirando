export const CRM_STAGE_OPTIONS = [
  { value: 'novo', label: 'Novo lead' },
  { value: 'contato', label: 'Em contato' },
  { value: 'proposta', label: 'Proposta enviada' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'perdido', label: 'Perdido' },
];

export function normalizeLead(lead = {}) {
  return {
    id: lead.id || null,
    nome: String(lead.nome || '').trim(),
    contato: String(lead.contato || '').trim(),
    canal: String(lead.canal || 'instagram').trim(),
    interesse: String(lead.interesse || '').trim(),
    stage: String(lead.stage || 'novo').trim(),
    monthly_value: Number(lead.monthly_value || 0),
    observacao: String(lead.observacao || '').trim(),
    created_at: lead.created_at || null,
  };
}

export function buildCrmSnapshot(leads = []) {
  const total = leads.length;
  const emContato = leads.filter((lead) => lead.stage === 'contato').length;
  const propostas = leads.filter((lead) => lead.stage === 'proposta').length;
  const fechados = leads.filter((lead) => lead.stage === 'fechado').length;
  const perdidos = leads.filter((lead) => lead.stage === 'perdido').length;
  const pipelineMensal = leads
    .filter((lead) => ['proposta', 'fechado'].includes(lead.stage))
    .reduce((acc, lead) => acc + Number(lead.monthly_value || 0), 0);
  const receitaFechada = leads
    .filter((lead) => lead.stage === 'fechado')
    .reduce((acc, lead) => acc + Number(lead.monthly_value || 0), 0);

  return {
    total,
    emContato,
    propostas,
    fechados,
    perdidos,
    pipelineMensal,
    receitaFechada,
  };
}
