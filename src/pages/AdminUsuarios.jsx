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
    <div className="page-shell mx-auto flex h-full w-full max-w-[1320px] flex-col gap-6">
      <AdminPageHeader
        icon={Users}
        badgeIcon={ShieldCheck}
        badge="Gestão de contas"
        title="Usuários e assinaturas"
        subtitle="Controle administrativo dos perfis, plano do usuário, papel administrativo e limite de cursos disponíveis."
        trailingClassName="xl:max-w-[16rem]"
        trailing={
          <div className="rounded-[1.5rem] border border-white/15 bg-white/10 px-4 py-3 text-left text-sm shadow-sm sm:px-5 sm:py-4 sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Gerindo como</p>
            <p className="mt-1.5 min-w-0 break-all font-semibold text-white">{currentUserEmail}</p>
          </div>
        }
      />

      <section className="rounded-[2.4rem] border border-gray-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard icon={UserRound} label="Usuários" value={summary.total} />
          <SummaryCard icon={ShieldCheck} label="Admins" value={summary.admins} />
          <SummaryCard icon={Crown} label="Plano elite" value={summary.elite} />
          <SummaryCard icon={BadgeCheck} label="Assinaturas ativas" value={summary.active} />
        </div>
      </section>

      {saveError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">
          {saveError}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Base de perfis</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Usuários cadastrados</h3>
          </div>

          <div className="relative max-w-md flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, email, plano ou papel..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 py-3 pl-11 pr-4 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Usuário</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Papel</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Plano</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Status</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Limite de cursos</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Acesso</th>
              </tr>
            </thead>

            <tbody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={`loading-${index}`} className="border-b border-gray-100 align-top">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-12 animate-pulse rounded-2xl bg-gray-100" />
                    </td>
                  </tr>
                ))}

              {filteredProfiles.map((profile) => (
                <tr key={profile.id} className="border-b border-gray-100 align-top">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold text-slate-900">{profile.nome || 'Sem nome'}</p>
                      <p className="mt-1 text-sm font-semibold text-gray-500">{profile.email || 'Sem email'}</p>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <SelectCell
                      value={profile.role || 'student'}
                      options={ROLE_OPTIONS}
                      disabled={savingId === profile.id}
                      onChange={(value) => handleFieldChange(profile, 'role', value)}
                    />
                  </td>

                  <td className="px-4 py-4">
                    <SelectCell
                      value={profile.subscription_plan || 'gratuito'}
                      options={PLAN_OPTIONS}
                      disabled={savingId === profile.id}
                      onChange={(value) => handleFieldChange(profile, 'subscription_plan', value)}
                    />
                  </td>

                  <td className="px-4 py-4">
                    <SelectCell
                      value={profile.subscription_status || 'trial'}
                      options={STATUS_OPTIONS}
                      disabled={savingId === profile.id}
                      onChange={(value) => handleFieldChange(profile, 'subscription_status', value)}
                    />
                  </td>

                  <td className="px-4 py-4">
                    <input
                      type="number"
                      min="1"
                      value={profile.max_courses ?? 3}
                      disabled={savingId === profile.id}
                      onChange={(e) => handleFieldChange(profile, 'max_courses', Number(e.target.value || 0))}
                      className="w-28 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500"
                    />
                  </td>

                  <td className="px-4 py-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                      <WalletCards size={13} className="text-blue-600" />
                      {savingId === profile.id ? 'Salvando...' : 'Configurável'}
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm font-semibold text-gray-500">
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
    <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50/70 p-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">
        <Icon size={12} />
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SelectCell({ value, options, onChange, disabled }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}


