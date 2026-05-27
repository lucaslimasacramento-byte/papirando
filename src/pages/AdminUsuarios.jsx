import React, { useMemo, useState } from 'react';
import { BadgeCheck, Crown, Search, ShieldCheck, UserRound, WalletCards, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminPageHeader from '../components/AdminPageHeader';

const PLAN_OPTIONS = [
  { value: 'gratuito', label: 'Gratuito' },
  { value: 'tatico', label: 'Tático' },
  { value: 'elite', label: 'Elite' },
];

const ROLE_OPTIONS = [
  { value: 'student', label: 'Aluno' },
  { value: 'admin', label: 'Admin' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'trial', label: 'Trial' },
  { value: 'cancelled', label: 'Cancelado' },
];

export default function AdminUsuarios({
  profiles = [],
  isLoading = false,
  currentUserEmail = '',
  onUpdateProfile,
}) {
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState('');
  const [saveError, setSaveError] = useState('');

  const summary = useMemo(() => {
    return {
      total: profiles.length,
      admins: profiles.filter((profile) => (profile.role || 'student') === 'admin').length,
      elite: profiles.filter((profile) => (profile.subscription_plan || 'gratuito') === 'elite').length,
      active: profiles.filter((profile) => (profile.subscription_status || 'trial') === 'active').length,
    };
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const haystack = [profile.nome, profile.email, profile.subscription_plan, profile.role].join(' ').toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [profiles, query]);

  const handleFieldChange = async (profile, field, value) => {
    setSavingId(profile.id);
    setSaveError('');
    try {
      const payload =
        field === 'subscription_plan'
          ? { subscription_plan: value }
          : field === 'role'
            ? { role: value }
            : field === 'subscription_status'
              ? { subscription_status: value }
              : { max_courses: Number(value || 0) };

      const { error } = await supabase.from('profiles').update(payload).eq('id', profile.id);
      if (error) throw error;

      await onUpdateProfile?.({
        ...profile,
        [field]: value,
      });
    } catch (e) {
      setSaveError(e?.message || 'Não foi possível atualizar o usuário. Verifique permissões (RLS) e tente de novo.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="pl-page">
      <AdminPageHeader
        icon={Users}
        badgeIcon={ShieldCheck}
        badge="Gestão de contas"
        title="Usuários e assinaturas"
        subtitle="Controle administrativo dos perfis, plano do usuário, papel administrativo e limite de cursos disponíveis."
        trailingClassName="xl:max-w-[16rem]"
        trailing={
          <div
            style={{
              borderRadius: 24,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.10)',
              padding: '12px 16px',
              textAlign: 'left',
              boxShadow: 'var(--pl-sh-low)',
            }}
          >
            <p className="pl-eyebrow" style={{ color: 'rgba(255,255,255,0.6)' }}>Gerindo como</p>
            <p
              style={{
                marginTop: 6,
                minWidth: 0,
                wordBreak: 'break-all',
                fontWeight: 600,
                color: '#fff',
                fontSize: 14,
              }}
            >
              {currentUserEmail}
            </p>
          </div>
        }
      />

      <section
        className="pl-card"
        style={{ padding: '24px 32px', boxShadow: 'var(--pl-sh-low)' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <SummaryCard icon={UserRound} label="Usuários" value={summary.total} />
          <SummaryCard icon={ShieldCheck} label="Admins" value={summary.admins} />
          <SummaryCard icon={Crown} label="Plano elite" value={summary.elite} />
          <SummaryCard icon={BadgeCheck} label="Assinaturas ativas" value={summary.active} />
        </div>
      </section>

      {saveError ? (
        <div
          className="pl-tag-danger"
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            border: '1px solid var(--pl-danger-soft)',
            background: 'var(--pl-danger-soft)',
            color: 'var(--pl-danger)',
          }}
        >
          {saveError}
        </div>
      ) : null}

      <section className="pl-card" style={{ padding: 24, boxShadow: 'var(--pl-sh-low)' }}>
        <div
          style={{
            marginBottom: 24,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Base de perfis</p>
            <h3 style={{ fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>
              Usuários cadastrados
            </h3>
          </div>

          <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--pl-ink-3)',
                pointerEvents: 'none',
              }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, email, plano ou papel..."
              className="pl-input"
              style={{ paddingLeft: 40, width: '100%' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 1080, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--pl-rule)', textAlign: 'left' }}>
                {['Usuário', 'Papel', 'Plano', 'Status', 'Limite de cursos', 'Acesso'].map((col) => (
                  <th key={col} style={{ padding: '10px 16px' }}>
                    <span className="pl-eyebrow">{col}</span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={`loading-${index}`} style={{ borderBottom: '1px solid var(--pl-rule)', verticalAlign: 'top' }}>
                    <td colSpan={6} style={{ padding: '16px' }}>
                      <div
                        className="animate-pulse"
                        style={{ height: 48, borderRadius: 12, background: 'var(--pl-bg-soft)' }}
                      />
                    </td>
                  </tr>
                ))}

              {filteredProfiles.map((profile) => (
                <tr key={profile.id} style={{ borderBottom: '1px solid var(--pl-rule)', verticalAlign: 'top' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>
                        {profile.nome || 'Sem nome'}
                      </p>
                      <p style={{ marginTop: 4, fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
                        {profile.email || 'Sem email'}
                      </p>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <SelectCell
                      value={profile.role || 'student'}
                      options={ROLE_OPTIONS}
                      disabled={savingId === profile.id}
                      onChange={(value) => handleFieldChange(profile, 'role', value)}
                    />
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <SelectCell
                      value={profile.subscription_plan || 'gratuito'}
                      options={PLAN_OPTIONS}
                      disabled={savingId === profile.id}
                      onChange={(value) => handleFieldChange(profile, 'subscription_plan', value)}
                    />
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <SelectCell
                      value={profile.subscription_status || 'trial'}
                      options={STATUS_OPTIONS}
                      disabled={savingId === profile.id}
                      onChange={(value) => handleFieldChange(profile, 'subscription_status', value)}
                    />
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <input
                      type="number"
                      min="1"
                      value={profile.max_courses ?? 3}
                      disabled={savingId === profile.id}
                      onChange={(e) => handleFieldChange(profile, 'max_courses', Number(e.target.value || 0))}
                      className="pl-input"
                      style={{ width: 112 }}
                    />
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div
                      className="pl-tag"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <WalletCards size={13} style={{ color: 'var(--pl-accent)' }} />
                      {savingId === profile.id ? 'Salvando...' : 'Configurável'}
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && filteredProfiles.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: '40px 16px',
                      textAlign: 'center',
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--pl-ink-3)',
                    }}
                  >
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div
      className="pl-card"
      style={{ padding: 16, background: 'var(--pl-bg-soft)' }}
    >
      <div
        className="pl-tag-accent"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}
      >
        <Icon size={12} />
        {label}
      </div>
      <p className="pl-num" style={{ fontSize: 28, color: 'var(--pl-ink)', margin: 0 }}>{value}</p>
    </div>
  );
}

function SelectCell({ value, options, onChange, disabled }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="pl-input"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
