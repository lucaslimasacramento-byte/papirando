import React, { useMemo, useState } from 'react';
import { showConfirm, showToast } from '../lib/dialogs';
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
      showToast('Digite a descrição da despesa.', 'error');
      return;
    }

    if (!payload.valor || payload.valor <= 0) {
      showToast('Informe um valor maior que zero.', 'error');
      return;
    }

    setSaving(true);
    try {
      await onSaveExpense?.(payload);
      setForm(EMPTY_EXPENSE);
    } catch (error) {
      showToast(error.message || 'Não foi possível salvar a despesa.', 'error');
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
    const confirmed = await showConfirm(`Excluir a despesa "${expense.descricao}"?`, { confirmLabel: 'Excluir', danger: true });
    if (!confirmed) return;

    try {
      await onDeleteExpense?.(expense);
      if (form.id === expense.id) {
        setForm(EMPTY_EXPENSE);
      }
    } catch (error) {
      showToast(error.message || 'Não foi possível excluir a despesa.', 'error');
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
          { key: 'pot', label: 'Receita potencial', value: formatCurrency(finance.receitaPotencial), icon: ArrowUpRight, accent: 'indigo' },
          { key: 'sub', label: 'Assinaturas ativas', value: String(finance.activeSubscribers), icon: BadgeCheck, accent: 'violet' },
        ]}
      />

      <div style={{ display: 'grid', gap: 32, gridTemplateColumns: '0.9fr 1.1fr' }}>
        <section className="pl-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 24 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Lançamentos</p>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--pl-ink)' }}>{form.id ? 'Editar despesa' : 'Nova despesa'}</h3>
          </div>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Descrição">
              <input
                value={form.descricao}
                onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
                className="pl-input"
                style={{ width: '100%' }}
                placeholder="Ex: Supabase, domínio, anúncios"
              />
            </Field>

            <Field label="Categoria">
              <select
                value={form.categoria}
                onChange={(e) => setForm((prev) => ({ ...prev, categoria: e.target.value }))}
                className="pl-input"
                style={{ width: '100%' }}
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
                className="pl-input"
                style={{ width: '100%' }}
                placeholder="0,00"
              />
            </Field>

            <Field label="Competência">
              <input
                type="month"
                value={form.competencia}
                onChange={(e) => setForm((prev) => ({ ...prev, competencia: e.target.value }))}
                className="pl-input"
                style={{ width: '100%' }}
              />
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                className="pl-input"
                style={{ width: '100%' }}
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
                className="pl-input"
                style={{ width: '100%' }}
                placeholder="Opcional"
              />
            </Field>
          </div>

          <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12 }}>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm(EMPTY_EXPENSE)}
                className="pl-btn pl-btn-ghost pl-btn-sm"
              >
                Cancelar edição
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="pl-btn pl-btn-primary pl-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={16} />
              {saving ? 'Salvando...' : form.id ? 'Atualizar despesa' : 'Cadastrar despesa'}
            </button>
          </div>
        </section>

        <section className="pl-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 24 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Assinaturas e resultado</p>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--pl-ink)' }}>Plano comercial e comportamento mensal</h3>
          </div>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {planMix.map((item) => (
              <div key={item.plan} className="pl-card pl-card-paper" style={{ padding: 16 }}>
                <p className="pl-eyebrow" style={{ marginBottom: 8 }}>{item.plan}</p>
                <p className="pl-num" style={{ fontSize: 22, color: 'var(--pl-ink)' }}>{item.count}</p>
                <p style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{item.price > 0 ? `${formatCurrency(item.price)}/mês` : 'Plano sem cobrança'}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {monthlySeries.map((item) => (
              <div key={item.key} className="pl-card pl-card-paper" style={{ padding: 16 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--pl-ink)' }}>{item.label}</p>
                    <p style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                      Receita {formatCurrency(item.receita)} • Despesas {formatCurrency(item.despesas)}
                    </p>
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 999,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    background: item.saldo >= 0 ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)',
                    color: item.saldo >= 0 ? 'var(--pl-success)' : 'var(--pl-danger)',
                  }}>
                    <ArrowUpRight size={13} />
                    Saldo {formatCurrency(item.saldo)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="pl-card" style={{ padding: 24 }}>
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Histórico financeiro</p>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--pl-ink)' }}>Despesas cadastradas</h3>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '8px 16px', fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
            <CalendarDays size={13} style={{ color: 'var(--pl-accent)' }} />
            Competência atual {finance.currentMonth}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recentExpenses.map((expense) => (
            <div key={expense.id} className="pl-card pl-card-paper" style={{ padding: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontWeight: 600, color: 'var(--pl-ink)' }}>{expense.descricao}</p>
                    <span
                      className={expense.status === 'paga' ? 'pl-tag pl-tag-success' : 'pl-tag pl-tag-warn'}
                    >
                      {expense.status}
                    </span>
                  </div>
                  <p style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                    {expense.categoria} • {expense.competencia} • {formatCurrency(expense.valor)}
                  </p>
                  {expense.observacao && <p style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>{expense.observacao}</p>}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleEdit(expense)}
                    className="pl-btn pl-btn-ghost pl-btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <Pencil size={15} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(expense)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 8, border: '1px solid var(--pl-danger)', background: 'var(--pl-danger-soft)', padding: '6px 14px', fontSize: 13, fontWeight: 600, color: 'var(--pl-danger)', cursor: 'pointer' }}
                  >
                    <Trash2 size={15} />
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}

          {recentExpenses.length === 0 && (
            <div style={{ borderRadius: 10, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '40px 24px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
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
      <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}
