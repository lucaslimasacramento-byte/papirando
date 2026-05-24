import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  DollarSign,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import {
  buildFinanceSnapshot,
  buildMonthlyFinanceSeries,
  formatCurrency,
  getCurrentFinanceMonth,
  normalizeExpense,
  PLAN_PRICES,
} from '../lib/adminFinance';
import AdminPageHeader from '../components/AdminPageHeader';

const CATEGORY_OPTIONS = [
  { value: 'operacao', label: 'Operação' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'ferramentas', label: 'Ferramentas' },
  { value: 'infraestrutura', label: 'Infraestrutura' },
  { value: 'equipe', label: 'Equipe' },
  { value: 'outros', label: 'Outros' },
];

const STATUS_OPTIONS = [
  { value: 'paga', label: 'Paga' },
  { value: 'prevista', label: 'Prevista' },
];

const EMPTY_EXPENSE = {
  id: '',
  descricao: '',
  categoria: 'operacao',
  valor: '',
  competencia: getCurrentFinanceMonth(),
  status: 'paga',
  observacao: '',
};

export default function AdminFinance({
  profiles = [],
  expenses = [],
  currentUserEmail = '',
  onSaveExpense,
  onDeleteExpense,
}) {
  const [form, setForm] = useState(EMPTY_EXPENSE);
  const [saving, setSaving] = useState(false);

  const finance = useMemo(() => buildFinanceSnapshot(profiles, expenses), [profiles, expenses]);
  const monthlySeries = useMemo(
    () => buildMonthlyFinanceSeries(expenses, 6, new Date(), finance.receitaRecorrente),
    [expenses, finance.receitaRecorrente]
  );

  const recentExpenses = useMemo(
    () =>
      [...expenses].sort((first, second) => {
        if (first.competencia !== second.competencia) {
          return String(second.competencia).localeCompare(String(first.competencia));
        }

        return Number(second.valor || 0) - Number(first.valor || 0);
      }),
    [expenses]
  );

  const planMix = useMemo(() => {
    return Object.keys(PLAN_PRICES).map((plan) => ({
      plan,
      price: PLAN_PRICES[plan],
      count: profiles.filter((profile) => (profile.subscription_plan || 'gratuito') === plan).length,
    }));
  }, [profiles]);

  const handleSave = async () => {
    const payload = normalizeExpense({
      ...form,
      valor: Number(String(form.valor).replace(',', '.')),
    });

    if (!payload.descricao) {
      alert('Digite a descrição da despesa.');
      return;
    }

    if (!payload.valor || payload.valor <= 0) {
      alert('Informe um valor maior que zero.');
      return;
    }

    setSaving(true);
    try {
      await onSaveExpense?.(payload);
      setForm(EMPTY_EXPENSE);
    } catch (error) {
      alert(error.message || 'Não foi possível salvar a despesa.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (expense) => {
    setForm({
      id: expense.id,
      descricao: expense.descricao || '',
      categoria: expense.categoria || 'operacao',
      valor: String(expense.valor || ''),
      competencia: expense.competencia || getCurrentFinanceMonth(),
      status: expense.status || 'paga',
      observacao: expense.observacao || '',
    });
  };

  const handleDelete = async (expense) => {
    const confirmed = window.confirm(`Excluir a despesa "${expense.descricao}"?`);
    if (!confirmed) return;

    try {
      await onDeleteExpense?.(expense);
      if (form.id === expense.id) {
        setForm(EMPTY_EXPENSE);
      }
    } catch (error) {
      alert(error.message || 'Não foi possível excluir a despesa.');
    }
  };

  return (
    <div className="pl-page">
      <AdminPageHeader
        icon={WalletCards}
        badgeIcon={WalletCards}
        badge="Financeiro admin"
        title="Receita, custos e saldo"
        subtitle="Acompanhe a receita recorrente estimada pelas assinaturas, as despesas do site e o saldo operacional do mês."
        stats={[
          { key: 'mrr', label: 'MRR estimado', value: formatCurrency(finance.receitaRecorrente), icon: TrendingUp, accent: 'emerald' },
          { key: 'des', label: 'Despesas pagas', value: formatCurrency(finance.despesasPagasMes), icon: TrendingDown, accent: 'orange' },
          { key: 'sal', label: 'Saldo do mês', value: formatCurrency(finance.saldoEstimado), icon: DollarSign, accent: 'blue' },
          { key: 'pot', label: 'Receita potencial', value: formatCurrency(finance.receitaPotencial), icon: ArrowUpRight, accent: 'cyan' },
          { key: 'sub', label: 'Assinaturas ativas', value: String(finance.activeSubscribers), icon: BadgeCheck, accent: 'indigo' },
        ]}
        trailingClassName="xl:max-w-[16rem]"
        trailing={
          <div className="rounded-[1.5rem] border border-white/15 bg-white/10 px-4 py-3 text-left text-sm shadow-sm sm:px-5 sm:py-4 sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Operando como</p>
            <p className="mt-1.5 min-w-0 break-all font-semibold text-white">{currentUserEmail}</p>
          </div>
        }
      />
      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Lançamentos</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">{form.id ? 'Editar despesa' : 'Nova despesa'}</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Descrição">
              <input
                value={form.descricao}
                onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                placeholder="Ex: Supabase, domínio, anúncios"
              />
            </Field>

            <Field label="Categoria">
              <select
                value={form.categoria}
                onChange={(e) => setForm((prev) => ({ ...prev, categoria: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Valor (R$)">
              <input
                value={form.valor}
                onChange={(e) => setForm((prev) => ({ ...prev, valor: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                placeholder="0,00"
              />
            </Field>

            <Field label="Competência">
              <input
                type="month"
                value={form.competencia}
                onChange={(e) => setForm((prev) => ({ ...prev, competencia: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Observação">
              <input
                value={form.observacao}
                onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                placeholder="Opcional"
              />
            </Field>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {form.id && (
              <button
                type="button"
                onClick={() => setForm(EMPTY_EXPENSE)}
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-600"
              >
                Cancelar edição
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
            >
              <Plus size={16} />
              {saving ? 'Salvando...' : form.id ? 'Atualizar despesa' : 'Cadastrar despesa'}
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Assinaturas e resultado</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Plano comercial e comportamento mensal</h3>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {planMix.map((item) => (
              <div key={item.plan} className="rounded-[1.4rem] border border-gray-200 bg-gray-50/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">{item.plan}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{item.count}</p>
                <p className="mt-1 text-sm font-semibold text-gray-500">{item.price > 0 ? `${formatCurrency(item.price)}/mês` : 'Plano sem cobrança'}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {monthlySeries.map((item) => (
              <div key={item.key} className="rounded-[1.4rem] border border-gray-200 bg-gray-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-500">
                      Receita {formatCurrency(item.receita)} • Despesas {formatCurrency(item.despesas)}
                    </p>
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${item.saldo >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    <ArrowUpRight size={13} />
                    Saldo {formatCurrency(item.saldo)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Histórico financeiro</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Despesas cadastradas</h3>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600">
            <CalendarDays size={13} className="text-blue-600" />
            Competência atual {finance.currentMonth}
          </div>
        </div>

        <div className="space-y-3">
          {recentExpenses.map((expense) => (
            <div key={expense.id} className="rounded-[1.4rem] border border-gray-200 bg-gray-50/70 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{expense.descricao}</p>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${expense.status === 'paga' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {expense.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    {expense.categoria} • {expense.competencia} • {formatCurrency(expense.valor)}
                  </p>
                  {expense.observacao && <p className="mt-2 text-sm font-medium text-gray-500">{expense.observacao}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(expense)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600"
                  >
                    <Pencil size={15} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(expense)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                  >
                    <Trash2 size={15} />
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}

          {recentExpenses.length === 0 && (
            <div className="rounded-[1.5rem] border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm font-semibold text-gray-500">
              Nenhuma despesa cadastrada ainda. Comece pelos custos mensais do site para montar seu saldo real.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function FinanceInsight({ title, value, text }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm font-medium text-white/70">{text}</p>
    </div>
  );
}


