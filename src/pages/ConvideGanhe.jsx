import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Copy,
  Filter,
  Gift,
  Hash,
  HelpCircle,
  Link2,
  PartyPopper,
  Share2,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  buildInviteUrl,
  buildDefaultReferralCode,
  formatReferralDate,
  getReferralGoalSummary,
  normalizeReferralCode,
  REFERRAL_GOALS,
} from '../lib/referrals';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';

const INVITE_ORIGIN = String(import.meta.env.VITE_PUBLIC_APP_ORIGIN || '').trim();

function mapReferralStatus(status) {
  return String(status || '').toLowerCase() === 'confirmed' ? 'Confirmado' : 'Pendente';
}

function resolveInviteName(row) {
  const relatedProfile = row?.referred_profile;
  if (relatedProfile && typeof relatedProfile === 'object' && !Array.isArray(relatedProfile)) {
    return String(
      relatedProfile.nome || relatedProfile.username || relatedProfile.email || 'Novo usuário'
    ).trim();
  }

  return 'Novo usuário';
}

function buildVirtualBonusEvents(confirmedCount) {
  const safeConfirmed = Math.max(0, Number(confirmedCount || 0));
  return REFERRAL_GOALS
    .filter((goal) => safeConfirmed >= goal.alvo)
    .map((goal) => ({
      id: `virtual-${goal.alvo}`,
      milestone: goal.alvo,
      reward_title: goal.titulo,
      created_at: null,
      isVirtual: true,
    }));
}

const STEPS = [
  {
    n: '1',
    title: 'Compartilhe seu link',
    text: 'Envie por WhatsApp, Instagram ou e-mail — um toque para copiar.',
    icon: Link2,
  },
  {
    n: '2',
    title: 'Amigo entra no Papirando',
    text: 'O cadastro com seu código conta para o programa.',
    icon: UserPlus,
  },
  {
    n: '3',
    title: 'Confirma e você ganha',
    text: 'Quando a conta confirma, libera bônus e avança suas metas.',
    icon: PartyPopper,
  },
];

export default function ConvideGanhe({ profile = {}, currentUserId = '', currentUserEmail = '', referralCode = '' }) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkShared, setLinkShared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [bonusHistory, setBonusHistory] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [resolvedProfileCode, setResolvedProfileCode] = useState('');
  const [referredCount, setReferredCount] = useState(0);
  const [historyFilter, setHistoryFilter] = useState('todos');
  const [reloading, setReloading] = useState(false);

  const isLoggedIn = Boolean(currentUserId || profile?.id);

  const username = useMemo(() => {
    const fromProfile = String(profile?.username || '').trim().toLowerCase();
    if (fromProfile) return fromProfile;
    return String(currentUserEmail || 'papirando')
      .split('@')[0]
      .replace(/\s+/g, '')
      .toLowerCase();
  }, [profile, currentUserEmail]);

  const displayName = String(profile?.nome || currentUserEmail || 'Aluno Papirando').trim();
  const resolvedReferralCode =
    normalizeReferralCode(resolvedProfileCode || profile?.referral_code || referralCode || '') ||
    buildDefaultReferralCode({
      username,
      email: currentUserEmail,
      userId: profile?.id || currentUserId || '',
    });
  const inviteUrl = useMemo(
    () => buildInviteUrl(resolvedReferralCode, INVITE_ORIGIN),
    [resolvedReferralCode]
  );
  const inviteOriginLabel = useMemo(() => {
    try {
      return new URL(inviteUrl).origin;
    } catch {
      return INVITE_ORIGIN || (typeof window !== 'undefined' ? window.location.origin : 'https://papirando.app');
    }
  }, [inviteUrl]);

  const loadReferralData = useCallback(async ({ silent = false } = {}) => {
      if (silent) {
        setReloading(true);
      } else {
        setLoading(true);
      }
      setLoadError('');

      try {
        const userId = currentUserId || profile?.id || '';
        if (!userId) {
          setHistory([]);
          setBonusHistory([]);
          setReferredCount(0);
          if (silent) {
            setReloading(false);
          } else {
            setLoading(false);
          }
          return;
        }

        const { data: profileRow, error: profileError } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('id', userId)
          .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        const ensuredCode =
          normalizeReferralCode(profileRow?.referral_code || referralCode || profile?.referral_code || '') ||
          buildDefaultReferralCode({
            username,
            email: currentUserEmail || profile?.email || '',
            userId,
          });

        if (!profileRow?.referral_code && ensuredCode) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ referral_code: ensuredCode })
            .eq('id', userId);
          if (updateError) throw updateError;
        }

        setResolvedProfileCode(ensuredCode);

        const [
          { data: referralRows, error: referralError },
          { data: bonusRows, error: bonusError },
          { data: referredProfilesRows, error: referredProfilesError },
          { count: referredProfilesCount, error: referredCountError },
        ] = await Promise.all([
          supabase
            .from('referrals')
            .select(
              `
                  id,
                  referral_code,
                  status,
                  created_at,
                  confirmed_at,
                  referred_profile_id,
                  referred_profile:referred_profile_id (
                    nome,
                    email,
                    username
                  )
                `
            )
            .eq('referrer_profile_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('referral_bonus_events')
            .select('id, milestone, reward_title, created_at')
            .eq('referrer_profile_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('id, nome, email, username, created_at')
            .eq('referred_by_code', ensuredCode)
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('referred_by_code', ensuredCode),
        ]);

        if (referralError) throw referralError;
        if (bonusError) throw bonusError;
        if (referredProfilesError) throw referredProfilesError;
        if (referredCountError) throw referredCountError;

        const mappedHistory = (referralRows || []).map((row) => ({
            id: `ref-${row.id}`,
            profileId: row.referred_profile_id || '',
            name: resolveInviteName(row),
            status: mapReferralStatus(row.status),
            date: formatReferralDate(row.confirmed_at || row.created_at),
            rawDate: row.confirmed_at || row.created_at || null,
          }));

        const knownProfileIds = new Set(
          mappedHistory.map((item) => String(item.profileId || '')).filter(Boolean)
        );
        const fallbackFromProfiles = (Array.isArray(referredProfilesRows) ? referredProfilesRows : [])
          .filter((row) => !knownProfileIds.has(String(row.id || '')))
          .map((row) => ({
            id: `profile-${row.id}`,
            profileId: row.id,
            name: String(row.nome || row.username || row.email || 'Novo usuário').trim(),
            status: 'Confirmado',
            date: formatReferralDate(row.created_at),
            rawDate: row.created_at || null,
          }));

        const mergedHistory = [...mappedHistory, ...fallbackFromProfiles].sort((a, b) => {
          const at = a.rawDate ? new Date(a.rawDate).getTime() : 0;
          const bt = b.rawDate ? new Date(b.rawDate).getTime() : 0;
          return bt - at;
        });

        const confirmedMergedCount = mergedHistory.filter((item) => item.status === 'Confirmado').length;

        // Tenta sincronizar os bônus no backend (função SQL com ON CONFLICT).
        // Se houver bloqueio de permissão, seguimos com fallback visual local.
        try {
          await supabase.rpc('award_referral_bonus_events', { target_referrer_id: userId });
        } catch (rpcError) {
          console.warn('Não foi possível sincronizar bônus via RPC.', rpcError?.message || rpcError);
        }

        let normalizedBonusRows = Array.isArray(bonusRows) ? bonusRows : [];
        try {
          const { data: freshBonusRows, error: freshBonusError } = await supabase
            .from('referral_bonus_events')
            .select('id, milestone, reward_title, created_at')
            .eq('referrer_profile_id', userId)
            .order('created_at', { ascending: false });
          if (!freshBonusError && Array.isArray(freshBonusRows)) {
            normalizedBonusRows = freshBonusRows;
          }
        } catch (refreshBonusError) {
          console.warn('Falha ao recarregar bônus após sync.', refreshBonusError?.message || refreshBonusError);
        }

        const bonusByMilestone = new Map();
        normalizedBonusRows.forEach((item) => {
          const milestone = Number(item?.milestone || 0);
          if (!milestone || bonusByMilestone.has(milestone)) return;
          bonusByMilestone.set(milestone, item);
        });
        buildVirtualBonusEvents(confirmedMergedCount).forEach((item) => {
          const milestone = Number(item.milestone || 0);
          if (!milestone || bonusByMilestone.has(milestone)) return;
          bonusByMilestone.set(milestone, item);
        });
        const mergedBonusHistory = Array.from(bonusByMilestone.values()).sort(
          (a, b) => Number(b?.milestone || 0) - Number(a?.milestone || 0)
        );

        setReferredCount(
          Math.max(Number(referredProfilesCount || 0), mergedHistory.length)
        );
        setHistory(
          mergedHistory.map((row) => ({
            id: row.id,
            name: row.name,
            status: row.status,
            date: row.date,
          }))
        );
        setBonusHistory(mergedBonusHistory);
      } catch (error) {
        console.warn('Erro ao carregar indicações:', error);
        setHistory([]);
        setBonusHistory([]);
        setLoadError('Não foi possível carregar o programa de indicações agora.');
      } finally {
        if (silent) {
          setReloading(false);
        } else {
          setLoading(false);
        }
      }
    }, [currentUserId, profile?.id, profile?.referral_code, profile?.email, referralCode, username, currentUserEmail]);

  useEffect(() => {
    loadReferralData();
  }, [loadReferralData]);

  const confirmedCount = history.filter((item) => item.status === 'Confirmado').length;
  const pendingCount = history.filter((item) => item.status === 'Pendente').length;
  const { nextGoal, progress } = getReferralGoalSummary(confirmedCount);
  const latestBonus = bonusHistory[0] || null;
  const missingConfirmations = nextGoal ? Math.max(0, nextGoal.alvo - confirmedCount) : 0;
  const missingConfirmationsLabel =
    !nextGoal || missingConfirmations < 0
      ? ''
      : missingConfirmations === 1
        ? 'Falta 1 confirmação'
        : `Faltam ${missingConfirmations} confirmações`;

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'confirmado') return history.filter((h) => h.status === 'Confirmado');
    if (historyFilter === 'pendente') return history.filter((h) => h.status === 'Pendente');
    return history;
  }, [history, historyFilter]);

  const flash = useCallback((setter) => {
    setter(true);
    window.setTimeout(() => setter(false), 2000);
  }, []);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      flash(setLinkCopied);
    } catch {
      setLinkCopied(false);
    }
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(resolvedReferralCode);
      flash(setCodeCopied);
    } catch {
      setCodeCopied(false);
    }
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Papirando — convite',
          text: `Entra no Papirando com meu código ${resolvedReferralCode}`,
          url: inviteUrl,
        });
        flash(setLinkShared);
        return;
      }
      await handleCopyLink();
    } catch {
      setLinkShared(false);
    }
  }

  return (
    <div className="min-h-full w-full bg-[radial-gradient(ellipse_120%_80%_at_0%_-20%,rgba(59,130,246,0.12),transparent_50%),radial-gradient(ellipse_90%_60%_at_100%_0%,rgba(99,102,241,0.1),transparent_45%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_45%,#f8fafc_100%)]">
      <div className="page-shell !max-w-[1180px] gap-6 pb-16 pt-2 sm:pt-3">
        <PageHeadPremium
          icon={Gift}
          className="!items-stretch overflow-hidden !rounded-[1.75rem] !border !border-white/10 !px-5 !py-6 sm:!px-7 sm:!py-8 lg:!flex-row lg:!items-center lg:!justify-between"
          badge={
            <PageHeadPremiumBadge icon={Gift}>Convide e ganhe</PageHeadPremiumBadge>
          }
          title={(
            <span>
              Cada amigo que entra com seu código{' '}
              <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                destrava benefícios
              </span>{' '}
              para vocês dois.
            </span>
          )}
          titleAs="h1"
          subtitle="Seu código é único, fica salvo no perfil e o progresso das metas atualiza quando a indicação é confirmada."
          leadingClassName="min-w-0 w-full flex-1 items-center lg:max-w-none"
          leadingExtra={(
            <>
              {!isLoggedIn ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-50">
                  <HelpCircle size={18} className="shrink-0 text-amber-200" />
                  <span>Entre na sua conta para gerar o código oficial e ver indicações em tempo real.</span>
                </div>
              ) : null}
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {STEPS.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.n}
                      className="group rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition hover:border-white/15 hover:bg-white/[0.09]"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/80 to-indigo-600/90 text-xs font-bold text-white shadow-lg shadow-blue-950/40">
                          {step.n}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">
                            <Icon size={13} className="text-blue-300" />
                            {step.title}
                          </div>
                          <p className="mt-1.5 text-xs font-medium leading-relaxed text-ink-300">{step.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          trailingClassName="w-full min-w-0 max-w-lg shrink-0 lg:max-w-[min(100%,24rem)] xl:max-w-md"
          trailing={(
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-white/12 bg-[linear-gradient(165deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.03)_100%)] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-md">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">Seu código</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl border border-white/15 bg-[#0c1220] px-4 font-mono text-xl font-bold tracking-[0.12em] text-white sm:text-2xl">
                    {resolvedReferralCode}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    aria-label="Copiar código de indicação"
                    className={`inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 ${
                      codeCopied
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                        : 'border border-white/20 bg-white/10 text-white hover:bg-white/15'
                    }`}
                  >
                    {codeCopied ? <Check size={18} /> : <Hash size={18} />}
                    {codeCopied ? 'Copiado' : 'Copiar código'}
                  </button>
                </div>

                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">Link de convite</p>
                <label className="mt-2 block">
                  <span className="sr-only">URL de convite</span>
                  <input
                    readOnly
                    value={inviteUrl}
                    onFocus={(e) => e.target.select()}
                    className="w-full cursor-text truncate rounded-xl border border-white/12 bg-[#0c1220]/90 px-4 py-3.5 font-mono text-[13px] font-semibold text-blue-200 shadow-inner focus:border-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                  />
                </label>

                <p className="mt-2 text-[11px] font-medium text-ink-500">
                  Quem abrir esse link já entra com seu código. Origem:{' '}
                  <span className="font-semibold text-ink-400">{inviteOriginLabel}</span>
                </p>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    aria-label="Copiar link de convite"
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 sm:flex-initial sm:min-w-[140px] ${
                      linkCopied
                        ? 'bg-emerald-500 text-white shadow-lg'
                        : 'bg-white text-ink-900 hover:bg-ink-100'
                    }`}
                  >
                    {linkCopied ? <Check size={18} /> : <Copy size={18} />}
                    {linkCopied ? 'Link copiado' : 'Copiar link'}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label="Compartilhar convite"
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 py-3.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 sm:flex-initial sm:min-w-[140px] ${
                      linkShared
                        ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100'
                        : 'bg-blue-600 text-white hover:bg-blue-500'
                    }`}
                  >
                    <Share2 size={18} />
                    {linkShared ? 'Enviado' : 'Compartilhar'}
                  </button>
                </div>

                {isLoggedIn ? (
                  <p className="mt-4 border-t border-white/10 pt-4 text-xs font-medium text-ink-400">
                    Conta: <span className="font-semibold text-ink-200">{displayName}</span>
                  </p>
                ) : null}
              </div>

              {/* KPIs — contraste correto no hero escuro */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCardDark
                  label="Cadastros com seu código"
                  hint="Perfis que informaram seu código ao entrar."
                  value={isLoggedIn ? String(referredCount) : '—'}
                  icon={Users}
                />
                <StatCardDark
                  label="Aguardando confirmação"
                  hint="Indicações ainda não confirmadas no programa."
                  value={isLoggedIn ? String(pendingCount) : '—'}
                  icon={Sparkles}
                />
                <StatCardDark
                  label="Bônus recebidos"
                  hint="Metas já creditadas na sua conta."
                  value={isLoggedIn ? String(bonusHistory.length) : '—'}
                  icon={Trophy}
                />
              </div>
            </div>
          )}
        />

        {/* Progress + metas + histórico */}
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="rounded-[1.75rem] border border-ink-200/90 bg-white/95 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">Progresso</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">
                    Próximo benefício
                  </h2>
                </div>
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">
                  {confirmedCount} confirmada{confirmedCount === 1 ? '' : 's'}
                </span>
              </div>

              <div className="mt-5 rounded-2xl border border-ink-100 bg-gradient-to-br from-ink-50/90 to-white p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Meta em foco</p>
                    <p className="mt-1 text-lg font-bold text-ink-900">
                      {nextGoal ? nextGoal.titulo : 'Todas as metas atuais concluídas'}
                    </p>
                  </div>
                  {nextGoal ? (
                    <p className="text-sm font-bold text-blue-700">{missingConfirmationsLabel}</p>
                  ) : (
                    <p className="text-sm font-semibold text-emerald-700">Parabéns pelo programa completo!</p>
                  )}
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-ink-200/90">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 transition-[width] duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">Metas</p>
                  <span className="text-[10px] font-semibold text-ink-400">Deslize no celular</span>
                </div>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                  {REFERRAL_GOALS.map((goal) => {
                    const active = confirmedCount >= goal.alvo;
                    const isNext = nextGoal?.alvo === goal.alvo;
                    return (
                      <div
                        key={goal.alvo}
                        className={`min-w-[148px] shrink-0 rounded-2xl border p-4 transition-all sm:min-w-0 ${
                          active
                            ? 'border-emerald-200 bg-gradient-to-b from-emerald-50/90 to-white shadow-sm'
                            : isNext
                              ? 'border-indigo-200 bg-gradient-to-b from-indigo-50/90 to-white shadow-md ring-2 ring-indigo-100'
                              : 'border-ink-200 bg-ink-50/70'
                        }`}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
                          {goal.alvo} amigo{goal.alvo > 1 ? 's' : ''}
                        </p>
                        <p className="mt-2 min-h-[2.75rem] text-sm font-bold leading-snug text-ink-900">{goal.titulo}</p>
                        <span
                          className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
                            active
                              ? 'bg-emerald-100 text-emerald-800'
                              : isNext
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-white text-ink-500 ring-1 ring-ink-200'
                          }`}
                        >
                          {active ? 'Liberado' : isNext ? 'Próxima meta' : 'Bloqueado'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Último bônus</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-ink-800">
                  {latestBonus
                    ? `${latestBonus.reward_title} · ${formatReferralDate(latestBonus.created_at)}`
                    : 'Nenhum bônus ainda — compartilhe o link para começar a contagem.'}
                </p>
                {bonusHistory.length > 1 ? (
                  <ul className="mt-3 max-h-28 space-y-1.5 overflow-y-auto text-xs font-medium text-ink-600">
                    {bonusHistory.slice(1, 8).map((b) => (
                      <li key={b.id} className="flex justify-between gap-2 border-b border-blue-100/60 pb-1.5 last:border-0">
                        <span className="truncate">{b.reward_title}</span>
                        <span className="shrink-0 tabular-nums text-ink-400">{formatReferralDate(b.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-ink-200/90 bg-white/95 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">Histórico</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink-900">Indicações</h3>
              </div>
              <span className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-600">
                {history.length} total
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-400">
                <Filter size={12} />
                Filtrar
              </span>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'confirmado', label: 'Confirmados' },
                { id: 'pendente', label: 'Pendentes' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setHistoryFilter(f.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    historyFilter === f.id
                      ? 'bg-ink-900 text-white shadow-sm'
                      : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => loadReferralData({ silent: true })}
                disabled={reloading || loading}
                className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 transition hover:bg-ink-100 disabled:opacity-60"
              >
                {reloading ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>

            {loadError ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                {loadError}
              </div>
            ) : null}

            <div className="mt-4 max-h-[min(28rem,55vh)] space-y-2.5 overflow-y-auto pr-1">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={`sk-${index}`}
                    className="h-[72px] animate-pulse rounded-2xl border border-ink-100 bg-ink-100/80"
                  />
                ))
              ) : filteredHistory.length > 0 ? (
                filteredHistory.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-gradient-to-b from-ink-50/80 to-white px-4 py-3.5 transition hover:border-ink-200 hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink-900">{invite.name}</p>
                      <p className="mt-0.5 text-xs font-medium text-ink-500">{invite.date}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
                        invite.status === 'Confirmado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {invite.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/80 px-6 py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-ink-100">
                    <Users size={26} className="text-ink-400" />
                  </div>
                  <p className="mt-4 max-w-sm text-sm font-bold text-ink-800">
                    {historyFilter !== 'todos'
                      ? 'Nada neste filtro ainda.'
                      : 'Nenhuma indicação registrada — seu link está pronto no topo da página.'}
                  </p>
                  <p className="mt-2 max-w-xs text-xs font-medium text-ink-500">
                    Dica: mande o link direto; amigos não precisam digitar o código à mão.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-ink-100 bg-ink-50/90 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">Como confirma?</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-ink-800">
                A indicação aparece como pendente no cadastro e vira confirmada quando o convidado conclui a vinculação do
                perfil no Papirando.
              </p>
              <a
                href={inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800"
              >
                Testar meu link
                <ChevronRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCardDark({ label, hint, value, icon: Icon }) {
  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-inner shadow-black/20 backdrop-blur-sm"
      title={hint}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink-400">{label}</p>
          <p className="mt-2 tabular-nums text-2xl font-bold tracking-tight text-white">{value}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
          <Icon size={18} strokeWidth={2.25} />
        </div>
      </div>
    </div>
  );
}
