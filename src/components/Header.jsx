import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Cpu, LogOut, Menu, ShieldAlert, UserCircle2 } from 'lucide-react';
import { checkAiHealth } from '../lib/aiClient';
import { ADMIN_TAB_TITLES } from '../lib/adminTabIds';
import SubscriptionPlanSeal from './SubscriptionPlanSeal';

function formatTitle(activeTab) {
  if (activeTab === 'home') return 'Painel inicial';
  const key = String(activeTab || '');
  if (ADMIN_TAB_TITLES[key]) return ADMIN_TAB_TITLES[key];
  return key
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function Header({
  activeTab,
  notifications = [],
  onOpenNotification,
  currentUserEmail = '',
  currentUsername = '',
  profileHasValidCpf = true,
  onOpenProfile,
  onLogout,
  onOpenMobileNav,
  subscriptionPlan = 'gratuito',
  onOpenAssinatura,
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState({ provider: 'offline', status: 'offline' });

  const displayName = useMemo(() => {
    const capitalizeFirst = (value = '') => {
      const text = String(value || '').trim();
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1);
    };
    if (String(currentUsername || '').trim()) return capitalizeFirst(currentUsername);
    const raw = String(currentUserEmail || '').trim();
    if (!raw) return 'Minha conta';
    return capitalizeFirst(raw.split('@')[0]);
  }, [currentUserEmail, currentUsername]);

  useEffect(() => {
    let ignore = false;

    const refreshStatus = async () => {
      const status = await checkAiHealth();
      if (!ignore) setAiStatus(status);
    };

    refreshStatus();
    const intervalId = window.setInterval(refreshStatus, 60000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const aiOnline = aiStatus?.provider && aiStatus.provider !== 'offline';
  const aiTooltip = aiOnline ? 'Serviço de IA disponível' : 'Serviço de IA indisponível';

  return (
    <header className="relative sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-md sm:px-4 md:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {typeof onOpenMobileNav === 'function' ? (
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={18} strokeWidth={2} />
          </button>
        ) : null}

        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Área logada</p>
          <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 md:text-[1.05rem]">
            {formatTitle(activeTab)}
          </h1>
        </div>

        {!profileHasValidCpf ? (
          <button
            type="button"
            onClick={onOpenProfile}
            className="hidden items-center gap-1.5 rounded-lg border border-amber-200/90 bg-amber-50 px-2 py-1.5 text-2xs font-semibold text-amber-900 xl:inline-flex"
          >
            <ShieldAlert size={12} strokeWidth={2} />
            CPF pendente
          </button>
        ) : null}
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
        {typeof onOpenAssinatura === 'function' ? (
          <SubscriptionPlanSeal planId={subscriptionPlan} onClick={onOpenAssinatura} />
        ) : null}

        <div
          title={aiTooltip}
          className="hidden items-center gap-1 rounded-md border border-slate-200/90 bg-slate-50/90 px-2 py-1.5 text-2xs font-medium text-slate-600 md:inline-flex"
        >
          <Cpu size={13} strokeWidth={2} className="shrink-0 text-slate-400" />
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${aiOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
          />
          <span className="hidden lg:inline">{aiOnline ? 'IA ativa' : 'IA off'}</span>
        </div>

        <button
          type="button"
          onClick={onOpenProfile}
          className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 md:inline-flex"
        >
          <UserCircle2 size={16} strokeWidth={2} />
          <span className="max-w-[120px] truncate lg:max-w-[160px]">{displayName}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsNotificationsOpen((prev) => !prev)}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          aria-expanded={isNotificationsOpen}
          aria-label="Notificações"
        >
          {notifications.length > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-700 px-1 text-[9px] font-semibold text-white">
              {notifications.length}
            </span>
          ) : null}
          <Bell size={17} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-800"
        >
          <LogOut size={15} strokeWidth={2} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>

      {isNotificationsOpen ? (
        <div className="absolute left-3 right-3 top-full z-40 mt-2 max-h-[min(420px,70vh)] overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-float sm:left-auto sm:right-4 sm:w-full sm:max-w-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Lembretes</p>
            <h3 className="mt-0.5 text-sm font-semibold text-slate-900">Próximos alertas</h3>
          </div>

          <div className="scrollbar-thin max-h-[min(340px,55vh)] overflow-y-auto p-3">
            {notifications.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
                Nenhum lembrete no momento.
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      onOpenNotification?.(item.contestId);
                    }}
                    className="w-full rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-left text-sm transition hover:border-slate-200 hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="mt-0.5 text-sm leading-snug text-slate-500">{item.text}</p>
                      </div>
                      {item.date ? (
                        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-2xs font-medium text-slate-600">
                          {String(item.date).split('-').reverse().join('/')}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
