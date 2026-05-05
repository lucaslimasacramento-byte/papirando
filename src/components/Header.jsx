import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, Cpu, Loader2, LogOut, Menu, MessageSquarePlus, ShieldAlert, Timer, UserCircle2, X } from 'lucide-react';
import { AI_ENABLED, checkAiHealth } from '../lib/aiClient';
import { submitBetaFeedback } from '../lib/betaFeedbackApi';
import { ADMIN_TAB_TITLES } from '../lib/adminTabIds';
import SubscriptionPlanSeal from './SubscriptionPlanSeal';

const TIPOS = [
  { id: 'bug', label: 'Bug' },
  { id: 'sugestao', label: 'Sugestao' },
  { id: 'elogio', label: 'Elogio' },
  { id: 'geral', label: 'Outro' },
];

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
  onOpenTimer,
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackTipo, setFeedbackTipo] = useState('geral');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
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
    if (!AI_ENABLED) return;
    let ignore = false;
    const refreshStatus = async () => {
      const status = await checkAiHealth();
      if (!ignore) setAiStatus(status);
    };
    refreshStatus();
    const intervalId = window.setInterval(refreshStatus, 60000);
    return () => { ignore = true; window.clearInterval(intervalId); };
  }, []);

  const aiOnline = aiStatus?.provider && aiStatus.provider !== 'offline';
  const aiTooltip = aiOnline ? 'Servico de IA disponivel' : 'Servico de IA indisponivel';

  const openFeedback = () => {
    setFeedbackTipo('geral');
    setFeedbackMsg('');
    setFeedbackDone(false);
    setFeedbackError('');
    setIsFeedbackOpen(true);
  };

  const closeFeedback = () => {
    setIsFeedbackOpen(false);
    setFeedbackDone(false);
    setFeedbackError('');
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    const text = feedbackMsg.trim();
    if (text.length < 3) { setFeedbackError('Escreva pelo menos 3 caracteres.'); return; }
    setFeedbackError('');
    setFeedbackLoading(true);
    try {
      await submitBetaFeedback({ email: currentUserEmail, page: activeTab, tipo: feedbackTipo, mensagem: text });
      setFeedbackDone(true);
      window.setTimeout(closeFeedback, 1800);
    } catch (e) {
      setFeedbackError(e?.message || 'Nao foi possivel enviar.');
    } finally {
      setFeedbackLoading(false);
    }
  };

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
          <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Area logada</p>
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
        {AI_ENABLED ? (
          <div
            title={aiTooltip}
            className="hidden items-center gap-1 rounded-md border border-slate-200/90 bg-slate-50/90 px-2 py-1.5 text-2xs font-medium text-slate-600 md:inline-flex"
          >
            <Cpu size={13} strokeWidth={2} className="shrink-0 text-slate-400" />
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${aiOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span className="hidden lg:inline">{aiOnline ? 'IA ativa' : 'IA off'}</span>
          </div>
        ) : null}

        {/* 1. Feedback */}
        <button
          type="button"
          onClick={openFeedback}
          title="Enviar feedback"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          aria-label="Feedback beta"
        >
          <MessageSquarePlus size={16} strokeWidth={2} />
        </button>

        {/* 2. Cronometro */}
        {typeof onOpenTimer === 'function' ? (
          <button
            type="button"
            onClick={onOpenTimer}
            title="Cronometro"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
            aria-label="Cronometro"
          >
            <Timer size={16} strokeWidth={2} />
          </button>
        ) : null}

        {/* 3. Alerta / notificacoes */}
        <button
          type="button"
          onClick={() => setIsNotificationsOpen((prev) => !prev)}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          aria-expanded={isNotificationsOpen}
          aria-label="Notificacoes"
        >
          {notifications.length > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-700 px-1 text-[9px] font-semibold text-white">
              {notifications.length}
            </span>
          ) : null}
          <Bell size={17} strokeWidth={2} />
        </button>

        {/* 4. Tipo de plano */}
        {typeof onOpenAssinatura === 'function' ? (
          <SubscriptionPlanSeal planId={subscriptionPlan} onClick={onOpenAssinatura} />
        ) : null}

        <button
          type="button"
          onClick={onOpenProfile}
          className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 md:inline-flex"
        >
          <UserCircle2 size={16} strokeWidth={2} />
          <span className="max-w-[120px] truncate lg:max-w-[160px]">{displayName}</span>
        </button>

        {/* 5. Sair */}
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-800"
        >
          <LogOut size={15} strokeWidth={2} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>

      {/* Modal de feedback */}
      {isFeedbackOpen ? (
        <div className="absolute right-3 top-full z-50 mt-2 w-full max-w-sm" role="dialog" aria-modal="true">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-float">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Beta</p>
                <h2 className="mt-0.5 text-base font-bold text-slate-900">Enviar feedback</h2>
              </div>
              <button
                type="button"
                onClick={closeFeedback}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar"
              >
                <X size={15} />
              </button>
            </div>

            {feedbackDone ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircle2 size={32} className="text-emerald-500" />
                <p className="text-sm font-semibold text-slate-800">Feedback enviado!</p>
                <p className="text-xs text-slate-500">Obrigado por ajudar a melhorar o Papirando.</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="flex flex-col gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-600">Tipo</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TIPOS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFeedbackTipo(t.id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          feedbackTipo === t.id
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="header-feedback-msg" className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Mensagem
                  </label>
                  <textarea
                    id="header-feedback-msg"
                    value={feedbackMsg}
                    onChange={(e) => setFeedbackMsg(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="Descreva o que encontrou ou o que poderia melhorar..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="mt-1 text-right text-[10px] text-slate-400">{feedbackMsg.length}/2000</p>
                </div>

                {feedbackError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {feedbackError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={feedbackLoading || feedbackMsg.trim().length < 3}
                  className="btn-primary w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
                >
                  {feedbackLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Enviando...
                    </span>
                  ) : 'Enviar feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {/* Dropdown de notificacoes */}
      {isNotificationsOpen ? (
        <div className="absolute left-3 right-3 top-full z-40 mt-2 max-h-[min(420px,70vh)] overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-float sm:left-auto sm:right-4 sm:w-full sm:max-w-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Lembretes</p>
            <h3 className="mt-0.5 text-sm font-semibold text-slate-900">Proximos alertas</h3>
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
                    onClick={() => { setIsNotificationsOpen(false); onOpenNotification?.(item.contestId); }}
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
