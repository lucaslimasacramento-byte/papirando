import React, { useMemo, useState } from 'react';
import {
  BadgeCheck, Bell, Calendar, ChevronDown, Crown, Search,
  ShieldCheck, UserRound, Users, X, Gift, Clock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminPageHeader from '../components/AdminPageHeader';

/* ─── Constantes ─────────────────────────────────────────────────────── */

const PLAN_OPTIONS = [
  { value: 'gratuito', label: 'Folha', color: 'var(--pl-ink-3)' },
  { value: 'caderno',  label: 'Caderno', color: 'var(--pl-accent)' },
  { value: 'estudio',  label: 'Estúdio', color: 'var(--pl-success)' },
];

const DURATION_OPTIONS = [
  { value: 7,    label: '7 dias' },
  { value: 30,   label: '1 mês' },
  { value: 90,   label: '3 meses' },
  { value: 180,  label: '6 meses' },
  { value: 365,  label: '1 ano' },
  { value: 3650, label: 'Vitalício' },
];

const PLAN_FILTER_OPTIONS = [
  { value: '', label: 'Todos os planos' },
  ...PLAN_OPTIONS,
];

function planLabel(v) {
  return PLAN_OPTIONS.find((p) => p.value === v)?.label || v || 'Folha';
}
function planColor(v) {
  return PLAN_OPTIONS.find((p) => p.value === v)?.color || 'var(--pl-ink-3)';
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

function daysLeft(iso) {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso) - Date.now()) / 86400000);
  return diff;
}

/* ─── Componente principal ───────────────────────────────────────────── */

export default function AdminUsuarios({
  profiles = [],
  isLoading = false,
  currentUserEmail = '',
  onUpdateProfile,
}) {
  const [query, setQuery]             = useState('');
  const [planFilter, setPlanFilter]   = useState('');
  const [onbFilter, setOnbFilter]     = useState('');

  const [grantModal, setGrantModal]   = useState(null); // profile
  const [grantPlan, setGrantPlan]     = useState('estudio');
  const [grantDays, setGrantDays]     = useState(30);
  const [grantSaving, setGrantSaving] = useState(false);
  const [grantError, setGrantError]   = useState('');

  const [noticeModal, setNoticeModal] = useState(null); // profile
  const [noticeText, setNoticeText]   = useState('');
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeError, setNoticeError]  = useState('');
  const [noticeOk, setNoticeOk]        = useState(false);

  /* KPIs */
  const summary = useMemo(() => {
    const now = Date.now();
    const week = 7 * 86400000;
    return {
      total:   profiles.length,
      estudio: profiles.filter((p) => p.subscription_plan === 'estudio').length,
      caderno: profiles.filter((p) => p.subscription_plan === 'caderno').length,
      novos:   profiles.filter((p) => p.created_at && now - new Date(p.created_at).getTime() < week).length,
    };
  }, [profiles]);

  /* Filtros */
  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      const hay = [p.nome, p.email, p.subscription_plan, p.username].join(' ').toLowerCase();
      if (query && !hay.includes(query.toLowerCase())) return false;
      if (planFilter && (p.subscription_plan || 'gratuito') !== planFilter) return false;
      if (onbFilter === 'done'    && !p.onboarding_done) return false;
      if (onbFilter === 'pending' &&  p.onboarding_done) return false;
      return true;
    });
  }, [profiles, query, planFilter, onbFilter]);

  /* ── Conceder plano ── */
  async function handleGrant() {
    if (!grantModal) return;
    setGrantSaving(true);
    setGrantError('');
    try {
      const expires = new Date(Date.now() + grantDays * 86400000).toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_plan: grantPlan, subscription_expires_at: expires })
        .eq('id', grantModal.id);
      if (error) throw error;
      await onUpdateProfile?.({ ...grantModal, subscription_plan: grantPlan, subscription_expires_at: expires });
      setGrantModal(null);
    } catch (e) {
      setGrantError(e?.message || 'Erro ao atualizar plano.');
    } finally {
      setGrantSaving(false);
    }
  }

  /* ── Enviar aviso (insere na tabela admin_notices) ── */
  async function handleNotice() {
    if (!noticeModal || !noticeText.trim()) return;
    setNoticeSaving(true);
    setNoticeError('');
    try {
      const { error } = await supabase.from('admin_notices').insert({
        user_id: noticeModal.id,
        message: noticeText.trim(),
        sent_at: new Date().toISOString(),
      });
      if (error) throw error;
      setNoticeOk(true);
      setNoticeText('');
      setTimeout(() => { setNoticeModal(null); setNoticeOk(false); }, 1400);
    } catch (e) {
      // Tabela pode não existir ainda — mostra instrução
      setNoticeError(
        e?.code === '42P01'
          ? 'Tabela admin_notices não existe. Rode o SQL de criação primeiro (supabase/admin_notices.sql).'
          : e?.message || 'Erro ao enviar aviso.',
      );
    } finally {
      setNoticeSaving(false);
    }
  }

  /* ─── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="pl-page">
      <AdminPageHeader
        icon={Users}
        badgeIcon={ShieldCheck}
        badge="Gestão de contas"
        title="Usuários"
        subtitle="Visualize todos os cadastros, conceda planos e envie avisos diretamente para usuários."
        trailingClassName="xl:max-w-[16rem]"
        trailing={
          <div style={{
            borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.10)', padding: '10px 14px',
          }}>
            <p className="pl-eyebrow" style={{ color: 'rgba(255,255,255,0.6)' }}>Admin</p>
            <p style={{ marginTop: 4, fontWeight: 600, color: '#fff', fontSize: 13, wordBreak: 'break-all' }}>
              {currentUserEmail}
            </p>
          </div>
        }
      />

      {/* KPIs */}
      <section className="pl-card" style={{ padding: '20px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          <KpiCard icon={UserRound}  label="Total de usuários"  value={summary.total}   />
          <KpiCard icon={Crown}      label="Plano Estúdio"      value={summary.estudio} accent="var(--pl-success)" />
          <KpiCard icon={BadgeCheck} label="Plano Caderno"      value={summary.caderno} accent="var(--pl-accent)" />
          <KpiCard icon={Calendar}   label="Novos (7 dias)"     value={summary.novos}   accent="var(--pl-highlight)" />
        </div>
      </section>

      {/* Filtros + busca */}
      <section className="pl-card" style={{ padding: '20px 28px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 24 }}>
          {/* search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 400 }}>
            <Search size={15} style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--pl-ink-3)', pointerEvents: 'none',
            }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, email, username..."
              className="pl-input"
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>

          {/* plano */}
          <div style={{ position: 'relative' }}>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="pl-input"
              style={{ paddingRight: 32, appearance: 'none', minWidth: 160 }}
            >
              {PLAN_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={13} style={{
              position: 'absolute', right: 10, top: '50%',
              transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--pl-ink-3)',
            }} />
          </div>

          {/* onboarding */}
          <div style={{ position: 'relative' }}>
            <select
              value={onbFilter}
              onChange={(e) => setOnbFilter(e.target.value)}
              className="pl-input"
              style={{ paddingRight: 32, appearance: 'none', minWidth: 180 }}
            >
              <option value="">Todos (onboarding)</option>
              <option value="done">Onboarding concluído</option>
              <option value="pending">Onboarding pendente</option>
            </select>
            <ChevronDown size={13} style={{
              position: 'absolute', right: 10, top: '50%',
              transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--pl-ink-3)',
            }} />
          </div>

          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
            {filtered.length} de {profiles.length} usuários
          </span>
        </div>

        {/* Tabela */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 900, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--pl-rule-2)' }}>
                {['Usuário', 'Plano atual', 'Expira em', 'Cadastro', 'Onboarding', 'Ações'].map((col) => (
                  <th key={col} style={{ padding: '8px 14px', textAlign: 'left' }}>
                    <span className="pl-eyebrow">{col}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--pl-rule)' }}>
                  <td colSpan={6} style={{ padding: 14 }}>
                    <div style={{ height: 36, borderRadius: 8, background: 'var(--pl-bg-soft)', animation: 'pulse 1.5s infinite' }} />
                  </td>
                </tr>
              ))}

              {!isLoading && filtered.map((p) => {
                const days = daysLeft(p.subscription_expires_at);
                const plan = p.subscription_plan || 'gratuito';
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--pl-rule)', verticalAlign: 'middle' }}>

                    {/* Usuário */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 999, flexShrink: 0,
                          background: 'var(--pl-ink)', color: 'var(--pl-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontSize: 14,
                          overflow: 'hidden',
                        }}>
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (p.nome || p.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 600, color: 'var(--pl-ink)', fontSize: 13, margin: 0 }}>
                            {p.nome || 'Sem nome'}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--pl-ink-3)', margin: 0 }}>
                            {p.email || '—'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Plano */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: planColor(plan) + '18',
                        color: planColor(plan),
                        border: `1px solid ${planColor(plan)}40`,
                      }}>
                        {planLabel(plan)}
                      </span>
                    </td>

                    {/* Expira em */}
                    <td style={{ padding: '12px 14px' }}>
                      {days === null ? (
                        <span style={{ fontSize: 12, color: 'var(--pl-ink-4)' }}>—</span>
                      ) : days <= 0 ? (
                        <span style={{ fontSize: 12, color: 'var(--pl-danger)', fontWeight: 600 }}>Expirado</span>
                      ) : days <= 7 ? (
                        <span style={{ fontSize: 12, color: 'var(--pl-warn)', fontWeight: 600 }}>
                          <Clock size={11} style={{ marginRight: 3 }} />{days}d
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--pl-ink-2)' }}>{fmtDate(p.subscription_expires_at)}</span>
                      )}
                    </td>

                    {/* Cadastro */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>{fmtDate(p.created_at)}</span>
                    </td>

                    {/* Onboarding */}
                    <td style={{ padding: '12px 14px' }}>
                      {p.onboarding_done
                        ? <span style={{ fontSize: 12, color: 'var(--pl-success)', fontWeight: 600 }}>✓ Concluído</span>
                        : <span style={{ fontSize: 12, color: 'var(--pl-warn)', fontWeight: 500 }}>Pendente</span>}
                    </td>

                    {/* Ações */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="pl-btn pl-btn-sm"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)',
                            border: '1px solid var(--pl-accent-ring)', borderRadius: 8,
                            padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}
                          onClick={() => { setGrantModal(p); setGrantPlan(plan === 'gratuito' ? 'estudio' : plan); setGrantDays(30); setGrantError(''); }}
                        >
                          <Gift size={12} />Plano
                        </button>
                        <button
                          className="pl-btn pl-btn-sm"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-2)',
                            border: '1px solid var(--pl-rule-2)', borderRadius: 8,
                            padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}
                          onClick={() => { setNoticeModal(p); setNoticeText(''); setNoticeError(''); setNoticeOk(false); }}
                        >
                          <Bell size={12} />Aviso
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--pl-ink-3)', fontSize: 14 }}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Modal conceder plano ── */}
      {grantModal && (
        <ModalShell title="Conceder plano" onClose={() => setGrantModal(null)}>
          <p style={{ fontSize: 13, color: 'var(--pl-ink-2)', marginBottom: 20 }}>
            Usuário: <strong style={{ color: 'var(--pl-ink)' }}>{grantModal.nome || grantModal.email}</strong>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <label>
              <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Plano</span>
              <div style={{ position: 'relative' }}>
                <select
                  value={grantPlan}
                  onChange={(e) => setGrantPlan(e.target.value)}
                  className="pl-input"
                  style={{ width: '100%', appearance: 'none', paddingRight: 32 }}
                >
                  {PLAN_OPTIONS.filter((o) => o.value !== 'gratuito').map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--pl-ink-3)',
                }} />
              </div>
            </label>

            <label>
              <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Duração</span>
              <div style={{ position: 'relative' }}>
                <select
                  value={grantDays}
                  onChange={(e) => setGrantDays(Number(e.target.value))}
                  className="pl-input"
                  style={{ width: '100%', appearance: 'none', paddingRight: 32 }}
                >
                  {DURATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--pl-ink-3)',
                }} />
              </div>
            </label>
          </div>

          <p style={{ fontSize: 12, color: 'var(--pl-ink-3)', marginBottom: 16 }}>
            Expira em: <strong>{fmtDate(new Date(Date.now() + grantDays * 86400000).toISOString())}</strong>
          </p>

          {grantError && (
            <p style={{ fontSize: 12, color: 'var(--pl-danger)', marginBottom: 12 }}>{grantError}</p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => setGrantModal(null)}>
              Cancelar
            </button>
            <button
              className="pl-btn pl-btn-primary pl-btn-sm"
              disabled={grantSaving}
              onClick={handleGrant}
            >
              {grantSaving ? 'Salvando...' : 'Conceder plano'}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Modal enviar aviso ── */}
      {noticeModal && (
        <ModalShell title="Enviar aviso" onClose={() => setNoticeModal(null)}>
          <p style={{ fontSize: 13, color: 'var(--pl-ink-2)', marginBottom: 16 }}>
            Para: <strong style={{ color: 'var(--pl-ink)' }}>{noticeModal.nome || noticeModal.email}</strong>
          </p>

          <label>
            <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Mensagem</span>
            <textarea
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              placeholder="Escreva o aviso para o usuário..."
              className="pl-input"
              rows={4}
              style={{ width: '100%', resize: 'vertical', fontFamily: 'var(--pl-sans)', fontSize: 13 }}
            />
          </label>

          {noticeError && (
            <p style={{ fontSize: 12, color: 'var(--pl-danger)', marginTop: 10 }}>{noticeError}</p>
          )}
          {noticeOk && (
            <p style={{ fontSize: 12, color: 'var(--pl-success)', marginTop: 10, fontWeight: 600 }}>✓ Aviso registrado com sucesso!</p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => setNoticeModal(null)}>
              Cancelar
            </button>
            <button
              className="pl-btn pl-btn-primary pl-btn-sm"
              disabled={noticeSaving || !noticeText.trim()}
              onClick={handleNotice}
            >
              {noticeSaving ? 'Enviando...' : 'Enviar aviso'}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

/* ─── Sub-componentes ─────────────────────────────────────────────── */

function KpiCard({ icon: Icon, label, value, accent = 'var(--pl-ink-3)' }) {
  return (
    <div className="pl-card" style={{ padding: '14px 18px', background: 'var(--pl-bg-soft)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: accent + '18', color: accent,
        }}>
          <Icon size={13} />
        </div>
        <span className="pl-eyebrow">{label}</span>
      </div>
      <p className="pl-num" style={{ fontSize: 26, color: 'var(--pl-ink)', margin: 0 }}>{value}</p>
    </div>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)',
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-card" style={{
        width: '100%', maxWidth: 440, padding: '24px 28px',
        boxShadow: 'var(--pl-sh-high)', borderRadius: 16,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--pl-ink)', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--pl-ink-3)', display: 'flex', alignItems: 'center',
          }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
