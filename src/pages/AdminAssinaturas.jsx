import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  CreditCard,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import AdminPageHeader from '../components/AdminPageHeader';
import { adminCreateManualSubscription, loadAllSubscriptions, normalizePlanName } from '../lib/subscriptionApi';
import { showConfirm, showToast } from '../lib/dialogs';
import { supabase as supabaseClient } from '../lib/supabase';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
}

// ─── componente ───────────────────────────────────────────────────────────────

export default function AdminAssinaturas() {
  const [rows, setRows] = useState([]);
  const [emailMap, setEmailMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Form para criar assinatura manual
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formPlan, setFormPlan] = useState('papiro');
  const [formBilling, setFormBilling] = useState('monthly');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const subs = await loadAllSubscriptions();
      setRows(subs);

      // Enrich with emails from profiles (batch)
      const userIds = [...new Set(subs.map((s) => s.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabaseClient
          .from('profiles')
          .select('id, email')
          .in('id', userIds);
        if (profiles) {
          setEmailMap(Object.fromEntries(profiles.map((p) => [p.id, p.email || ''])));
        }
      }
    } catch (e) {
      setError(e?.message || 'Não foi possível carregar assinaturas.');
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
      showToast(e?.message || 'Não foi possível atualizar.', 'error');
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
      showToast(e?.message || 'Não foi possível atualizar.', 'error');
    }
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const email = (emailMap[r.user_id] || '').toLowerCase();
      return email.includes(q) || (r.user_id || '').toLowerCase().includes(q);
    });
  }, [rows, emailMap, search]);

  // Contadores — normalizePlanName mapeia aliases legados (tatico/elite) para 'papiro'
  const activeCount = rows.filter((r) => ['active', 'trialing'].includes(r.status)).length;
  const papiroCount = rows.filter((r) => normalizePlanName(r.plan_name) === 'papiro').length;
  const trialCount = rows.filter((r) => r.status === 'trialing').length;

  return (
    <div className="pl-page">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <AdminPageHeader
          icon={CreditCard}
          badge="Admin · pagamentos"
          title="Assinaturas"
          subtitle={
            loading
              ? 'Carregando...'
              : `${activeCount} ativas · ${papiroCount} Papiro · ${trialCount} em trial · ${rows.length} total`
          }
          stats={[
            { key: 'ativas', label: 'Ativas', value: loading ? '–' : String(activeCount), icon: ShieldCheck, accent: 'emerald' },
            { key: 'papiro', label: 'Papiro', value: loading ? '–' : String(papiroCount), icon: ShieldCheck, accent: 'amber' },
            { key: 'trial', label: 'Trial', value: loading ? '–' : String(trialCount), icon: ShieldCheck, accent: 'blue' },
            { key: 'total', label: 'Total', value: loading ? '–' : String(rows.length), icon: ShieldCheck, accent: 'indigo' },
          ]}
        />

        {/* Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="pl-btn pl-btn-primary pl-btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={14} />
            Assinatura manual
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="pl-btn pl-btn-ghost pl-btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Atualizar
          </button>
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pl-ink-3)', pointerEvents: 'none' }} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por e-mail..."
              className="pl-input"
              style={{ paddingLeft: 36, width: 224 }}
            />
          </div>
        </div>

        {/* Form nova assinatura manual */}
        {showForm ? (
          <div className="pl-card" style={{ padding: 20 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 16 }}>
              Nova assinatura manual
            </p>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-2)' }}>E-mail do usuário *</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="usuario@email.com"
                    className="pl-input"
                    required
                    disabled={creating}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-2)' }}>Plano</label>
                  <select
                    value={formPlan}
                    onChange={(e) => setFormPlan(e.target.value)}
                    className="pl-input"
                    disabled={creating}
                  >
                    <option value="papiro">Papiro</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-2)' }}>Ciclo</label>
                  <select
                    value={formBilling}
                    onChange={(e) => setFormBilling(e.target.value)}
                    className="pl-input"
                    disabled={creating}
                  >
                    <option value="monthly">Mensal</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>
              </div>
              {formError ? <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-danger)' }}>{formError}</p> : null}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="submit"
                  disabled={creating}
                  className="pl-btn pl-btn-primary pl-btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="pl-btn pl-btn-ghost pl-btn-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {error ? (
          <div style={{ borderRadius: 10, border: '1px solid var(--pl-warn)', background: 'var(--pl-warn-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>
            {error}
          </div>
        ) : null}

        {/* Tabela */}
        <div className="pl-card" style={{ padding: 20 }}>
          <p className="pl-eyebrow" style={{ marginBottom: 16 }}>
            Lista ({filteredRows.length}{search ? ` de ${rows.length}` : ''})
          </p>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '40px 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--pl-accent)' }} />
              Carregando...
            </div>
          ) : filteredRows.length === 0 ? (
            <p style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
              {rows.length === 0 ? 'Nenhuma assinatura ainda.' : 'Nenhuma assinatura corresponde à busca.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--pl-rule)' }}>
                    {['Usuário', 'Plano', 'Status', 'Provedor', 'Início', 'Fim', 'Ações'].map((h) => (
                      <th key={h} className="pl-eyebrow" style={{ paddingBottom: 8, paddingRight: 16, fontWeight: 600 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} style={{ borderTop: '1px solid var(--pl-rule)' }}>
                      <td style={{ padding: '12px 16px 12px 0' }}>
                        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--pl-ink)' }}>
                          {emailMap[row.user_id] || row.user_id}
                        </span>
                        {row.stripe_customer_id ? (
                          <span style={{ fontSize: 10, color: 'var(--pl-ink-3)' }}>{row.stripe_customer_id}</span>
                        ) : null}
                      </td>
                      <td style={{ padding: '12px 16px 12px 0' }}>
                        <select
                          value={row.plan_name}
                          onChange={(e) => handleChangePlan(row.id, e.target.value)}
                          className="pl-input"
                          style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700 }}
                        >
                          <option value="gratuito">Gratuito</option>
                          <option value="papiro">Papiro</option>
                          {/* aliases legados — só aparecem se a linha ainda tiver o valor antigo */}
                          {row.plan_name === 'tatico' ? <option value="tatico">Tático (legado)</option> : null}
                          {row.plan_name === 'elite' ? <option value="elite">Elite (legado)</option> : null}
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px 12px 0' }}>
                        <select
                          value={row.status}
                          onChange={(e) => handleChangeStatus(row.id, e.target.value)}
                          className="pl-input"
                          style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700 }}
                        >
                          <option value="active">Active</option>
                          <option value="trialing">Trialing</option>
                          <option value="canceled">Canceled</option>
                          <option value="past_due">Past due</option>
                          <option value="unpaid">Unpaid</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px 12px 0', fontSize: 11, color: 'var(--pl-ink-2)' }}>{row.provider}</td>
                      <td style={{ padding: '12px 16px 12px 0', fontSize: 11, color: 'var(--pl-ink-2)' }}>{formatDate(row.current_period_start)}</td>
                      <td style={{ padding: '12px 16px 12px 0', fontSize: 11, color: 'var(--pl-ink-2)' }}>{formatDate(row.current_period_end)}</td>
                      <td style={{ padding: '12px 0' }}>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!await showConfirm('Cancelar esta assinatura?', { confirmLabel: 'Cancelar', danger: true })) return;
                            await handleChangeStatus(row.id, 'canceled');
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 8, border: '1px solid var(--pl-danger)', padding: '4px 8px', fontSize: 11, fontWeight: 700, color: 'var(--pl-danger)', background: 'transparent', cursor: 'pointer' }}
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
