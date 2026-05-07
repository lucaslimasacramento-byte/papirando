import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CreditCard,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';
import { adminCreateManualSubscription } from '../lib/subscriptionApi';
import { supabase as supabaseClient } from '../lib/supabase';

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  trialing: 'border-blue-200 bg-blue-50 text-blue-700',
  canceled: 'border-red-200 bg-red-50 text-red-700',
  past_due: 'border-amber-200 bg-amber-50 text-amber-700',
  unpaid: 'border-orange-200 bg-orange-50 text-orange-700',
};

const PLAN_COLORS = {
  elite: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  tatico: 'border-blue-200 bg-blue-50 text-blue-700',
  gratuito: 'border-slate-200 bg-slate-50 text-slate-600',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
}

// ─── componente ───────────────────────────────────────────────────────────────

export default function AdminAssinaturas() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form para criar assinatura manual
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formPlan, setFormPlan] = useState('tatico');
  const [formBilling, setFormBilling] = useState('monthly');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Admin view — vê todas via service role ou RLS is_app_admin
      const { data, error: err } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (err) throw err;
      setRows(data || []);
    } catch (e) {
      setError(e?.message || 'Nao foi possivel carregar assinaturas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Busca user_id pelo e-mail digitado
  async function resolveUserId(email) {
    const { data, error: err } = await supabaseClient.rpc('get_user_id_by_email', { p_email: email.toLowerCase().trim() });
    if (err || !data) throw new Error(`Usuário não encontrado: ${email}. Verifique se o e-mail está cadastrado.`);
    return data;
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formEmail.trim()) { setFormError('E-mail obrigatorio.'); return; }

    setCreating(true);
    try {
      let userId;
      try {
        userId = await resolveUserId(formEmail);
      } catch {
        // fallback: tenta buscar na tabela profiles
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', formEmail.toLowerCase().trim())
          .maybeSingle();
        if (!profile?.id) throw new Error(`Usuário "${formEmail}" não encontrado. O usuário precisa ter feito login ao menos uma vez.`);
        userId = profile.id;
      }

      const newSub = await adminCreateManualSubscription({
        userId,
        planName: formPlan,
        billing: formBilling,
      });

      setRows((prev) => [newSub, ...prev]);
      setFormEmail('');
      setShowForm(false);
    } catch (e) {
      setFormError(e?.message || 'Nao foi possivel criar.');
    } finally {
      setCreating(false);
    }
  };

  const handleChangePlan = async (id, newPlan) => {
    try {
      await supabaseClient
        .from('subscriptions')
        .update({ plan_name: newPlan, updated_at: new Date().toISOString() })
        .eq('id', id);
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, plan_name: newPlan } : r));
    } catch (e) {
      alert(e?.message || 'Nao foi possivel atualizar.');
    }
  };

  const handleChangeStatus = async (id, newStatus) => {
    try {
      await supabaseClient
        .from('subscriptions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r));
    } catch (e) {
      alert(e?.message || 'Nao foi possivel atualizar.');
    }
  };

  // Contadores
  const activeCount = rows.filter((r) => ['active', 'trialing'].includes(r.status)).length;
  const eliteCount = rows.filter((r) => r.plan_name === 'elite').length;
  const taticoCount = rows.filter((r) => r.plan_name === 'tatico').length;

  return (
    <div className="page-shell mx-auto flex h-full w-full max-w-[1320px] flex-col gap-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <PageHeadPremium
          icon={CreditCard}
          titleAs="h1"
          badge={<PageHeadPremiumBadge icon={ShieldCheck}>Admin · pagamentos</PageHeadPremiumBadge>}
          title="Assinaturas"
          subtitle={
            loading
              ? 'Carregando...'
              : `${activeCount} ativas · ${eliteCount} Elite · ${taticoCount} Tatico · ${rows.length} total`
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Ativas', value: activeCount, cls: 'text-emerald-700' },
            { label: 'Elite', value: eliteCount, cls: 'text-yellow-700' },
            { label: 'Tatico', value: taticoCount, cls: 'text-blue-700' },
            { label: 'Total', value: rows.length, cls: 'text-slate-700' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="section-card flex flex-col gap-1 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
              <p className={`text-2xl font-bold ${cls}`}>{loading ? '–' : value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
          >
            <Plus size={14} />
            Assinatura manual (beta)
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Atualizar
          </button>
        </div>

        {/* Form nova assinatura manual */}
        {showForm ? (
          <div className="section-card space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Nova assinatura manual
            </p>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">E-mail do usuário *</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="usuario@email.com"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                    disabled={creating}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Plano</label>
                  <select
                    value={formPlan}
                    onChange={(e) => setFormPlan(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
                    disabled={creating}
                  >
                    <option value="tatico">Tatico</option>
                    <option value="elite">Elite</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Ciclo</label>
                  <select
                    value={formBilling}
                    onChange={(e) => setFormBilling(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
                    disabled={creating}
                  >
                    <option value="monthly">Mensal</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>
              </div>
              {formError ? <p className="text-xs font-semibold text-red-600">{formError}</p> : null}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary rounded-xl px-4 py-2.5 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {error}
          </div>
        ) : null}

        {/* Tabela */}
        <div className="section-card space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Lista ({rows.length})
          </p>

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm font-semibold text-slate-500">
              <Loader2 size={18} className="animate-spin text-blue-700" />
              Carregando...
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-slate-500">
              Nenhuma assinatura ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Usuário', 'Plano', 'Status', 'Provedor', 'Início', 'Fim', 'Ações'].map((h) => (
                      <th key={h} className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60">
                      <td className="py-3 pr-4">
                        <span className="max-w-[180px] truncate block text-xs font-semibold text-slate-700">
                          {row.user_id}
                        </span>
                        {row.stripe_customer_id ? (
                          <span className="text-[10px] text-slate-400">{row.stripe_customer_id}</span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={row.plan_name}
                          onChange={(e) => handleChangePlan(row.id, e.target.value)}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-bold focus:outline-none ${PLAN_COLORS[row.plan_name] || PLAN_COLORS.gratuito}`}
                        >
                          <option value="gratuito">Gratuito</option>
                          <option value="tatico">Tatico</option>
                          <option value="elite">Elite</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={row.status}
                          onChange={(e) => handleChangeStatus(row.id, e.target.value)}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-bold focus:outline-none ${STATUS_COLORS[row.status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}
                        >
                          <option value="active">Active</option>
                          <option value="trialing">Trialing</option>
                          <option value="canceled">Canceled</option>
                          <option value="past_due">Past due</option>
                          <option value="unpaid">Unpaid</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4 text-[11px] text-slate-500">{row.provider}</td>
                      <td className="py-3 pr-4 text-[11px] text-slate-500">{formatDate(row.current_period_start)}</td>
                      <td className="py-3 pr-4 text-[11px] text-slate-500">{formatDate(row.current_period_end)}</td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm('Cancelar esta assinatura?')) return;
                            await handleChangeStatus(row.id, 'canceled');
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50"
                        >
                          <X size={11} />
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
