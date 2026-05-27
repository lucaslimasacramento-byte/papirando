import { PLAN_PRICES, getMonthlyPrice } from './planConfig.js';

export { PLAN_PRICES, getMonthlyPrice };

export function formatCurrency(value = 0) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function getCurrentFinanceMonth(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function normalizeExpense(expense = {}) {
  return {
    id: expense.id || null,
    descricao: String(expense.descricao || '').trim(),
    categoria: String(expense.categoria || 'operacao').trim(),
    valor: Number(expense.valor || 0),
    competencia: String(expense.competencia || getCurrentFinanceMonth()).slice(0, 7),
    status: String(expense.status || 'paga').trim(),
    observacao: String(expense.observacao || '').trim(),
  };
}

export function buildFinanceSnapshot(profiles = [], expenses = [], referenceDate = new Date()) {
  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const currentMonth = getCurrentFinanceMonth(referenceDate);
  const paidProfiles = safeProfiles.filter((profile) => (profile?.subscription_status || 'trial') === 'active');
  const trialProfiles = safeProfiles.filter((profile) => (profile?.subscription_status || 'trial') === 'trial');
  const riskProfiles = safeProfiles.filter((profile) => ['paused', 'cancelled'].includes(profile?.subscription_status || ''));

  const receitaRecorrente = paidProfiles.reduce(
    (acc, profile) => acc + getMonthlyPrice(profile?.subscription_plan || 'gratuito'),
    0
  );
  const receitaPotencial = [...paidProfiles, ...trialProfiles].reduce(
    (acc, profile) => acc + getMonthlyPrice(profile?.subscription_plan || 'gratuito'),
    0
  );

  const expensesThisMonth = safeExpenses.filter((expense) => expense?.competencia === currentMonth);
  const despesasPagasMes = expensesThisMonth
    .filter((expense) => expense?.status === 'paga')
    .reduce((acc, expense) => acc + Number(expense?.valor || 0), 0);
  const despesasPrevistasMes = expensesThisMonth.reduce((acc, expense) => acc + Number(expense?.valor || 0), 0);
  const saldoEstimado = receitaRecorrente - despesasPagasMes;

  return {
    currentMonth,
    receitaRecorrente,
    receitaPotencial,
    despesasPagasMes,
    despesasPrevistasMes,
    saldoEstimado,
    activeSubscribers: paidProfiles.length,
    trialSubscribers: trialProfiles.length,
    riskSubscribers: riskProfiles.length,
  };
}

export function buildMonthlyFinanceSeries(expenses = [], months = 6, referenceDate = new Date(), recurringRevenue = 0) {
  return Array.from({ length: months }).map((_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (months - index - 1), 1);
    const monthKey = getCurrentFinanceMonth(date);
    const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    const monthExpenses = expenses
      .filter((expense) => expense.competencia === monthKey)
      .reduce((acc, expense) => acc + Number(expense.valor || 0), 0);

    return {
      key: monthKey,
      label: monthLabel,
      receita: recurringRevenue,
      despesas: monthExpenses,
      saldo: recurringRevenue - monthExpenses,
    };
  });
}
