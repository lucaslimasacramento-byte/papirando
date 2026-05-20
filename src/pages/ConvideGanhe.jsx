import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  Filter,
  Gift,
  Hash,
  Link2,
  PartyPopper,
  Share2,
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
    <div className="pl-app pl-paper-bg-soft pl-cg-shell">
      {/* Hero unificado */}
      <header className="pl-cg-hero">
        <div>
          <span className="badge"><Gift size={11} /> Convide e ganhe</span>
          <h1>
            Cada amigo que entra com seu código <strong>destrava benefícios</strong> para vocês dois.
          </h1>
          <p className="subtitle">
            Seu código é único, fica salvo no perfil e o progresso das metas atualiza quando a indicação é confirmada.
          </p>
          <div className="pl-cg-steps">
            {STEPS.map((step) => (
              <div key={step.n} className="pl-cg-step">
                <span className="num">{step.n}</span>
                <p className="ttl">{step.title}</p>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="pl-cg-side">
          <div className="pl-cg-code-card">
            <div className="lab">Seu código</div>
            <div className="pl-cg-code-row">
              <div className="pl-cg-code">{resolvedReferralCode || '—'}</div>
              <button type="button" onClick={handleCopyCode} style={{ background: 'none', border: 'none', padding: 0, display: 'flex' }}>
                <span className="pl-cg-actions" style={{ margin: 0 }}>
                  <span className="btn">
                    {codeCopied ? <Check size={14} /> : <Hash size={14} />}
                    {codeCopied ? 'Copiado' : 'Copiar'}
                  </span>
                </span>
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
              <div className="lab">Link de convite</div>
              <div className="pl-cg-link-row">
                <Link2 size={12} />
                <span>{inviteUrl}</span>
              </div>
            </div>
            <div className="pl-cg-actions">
              <button type="button" onClick={handleCopyLink} className="btn">
                {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                {linkCopied ? 'Copiado' : 'Copiar link'}
              </button>
              <button type="button" onClick={handleShare} className="btn dark">
                <Share2 size={14} /> Compartilhar
              </button>
            </div>
            <p className="pl-cg-conta">Conta: <strong>{displayName}</strong></p>
          </div>

          <div className="pl-cg-hero-kpis">
            <div className="pl-cg-hero-kpi">
              <span className="lab"><Users size={11} /> Cadastros</span>
              <span className="val">{isLoggedIn ? referredCount : '—'}</span>
            </div>
            <div className="pl-cg-hero-kpi">
              <span className="lab"><Clock size={11} /> Aguardando</span>
              <span className="val">{isLoggedIn ? pendingCount : '—'}</span>
            </div>
            <div className="pl-cg-hero-kpi">
              <span className="lab"><Trophy size={11} /> Bônus</span>
              <span className="val">{isLoggedIn ? bonusHistory.length : '—'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Progresso + Histórico */}
      <div className="pl-cg-grid">
        {/* Progresso */}
        <section className="pl-cg-card">
          <div className="pl-cg-card-head">
            <div>
              <span className="eyebrow">Progresso</span>
              <h3>Próximo benefício</h3>
            </div>
            <span className="badge-cnt">{confirmedCount} confirmada{confirmedCount === 1 ? '' : 's'}</span>
          </div>

          <div className="pl-cg-foco">
            <span className="lab">Meta em foco</span>
            <div className="pl-cg-foco-row">
              <span className="target">{nextGoal ? nextGoal.titulo : 'Programa completo'}</span>
              {nextGoal ? (
                <span className="falta">{missingConfirmationsLabel}</span>
              ) : (
                <span className="falta" style={{ color: 'var(--pl-success)' }}>Parabéns!</span>
              )}
            </div>
            <div className="pl-cg-foco-bar">
              <div className="fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="pl-cg-card-head" style={{ marginTop: 16, marginBottom: 0 }}>
            <span className="eyebrow">Metas</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--pl-ink-3)' }}>Deslize no celular</span>
          </div>
          <div className="pl-cg-metas">
            {REFERRAL_GOALS.map((goal) => {
              const active = confirmedCount >= goal.alvo;
              const isNext = nextGoal?.alvo === goal.alvo;
              return (
                <div key={goal.alvo} className={`pl-cg-meta${active ? ' active' : ''}`}>
                  <span className="qtd">{goal.alvo} amigo{goal.alvo > 1 ? 's' : ''}</span>
                  <p className="bonus">{goal.titulo}</p>
                  <span className="status">{active ? 'Liberado' : isNext ? 'Próxima meta' : 'Bloqueado'}</span>
                </div>
              );
            })}
          </div>

          <div className="pl-cg-bonus-row">
            <span className="lab">Último bônus</span>
            <p>
              {latestBonus
                ? `${latestBonus.reward_title} · ${formatReferralDate(latestBonus.created_at)}`
                : 'Nenhum bônus ainda — compartilhe o link para começar a contagem.'}
            </p>
          </div>
        </section>

        {/* Histórico */}
        <section className="pl-cg-card">
          <div className="pl-cg-card-head">
            <div>
              <span className="eyebrow">Histórico</span>
              <h3>Indicações</h3>
            </div>
            <span className="badge-cnt" style={{ background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-3)', borderColor: 'var(--pl-rule)' }}>
              {history.length} total
            </span>
          </div>

          <div className="pl-cg-filters">
            <span className="label"><Filter size={11} /> Filtrar</span>
            <button type="button" onClick={() => setHistoryFilter('todos')} className={historyFilter === 'todos' ? 'active' : ''}>Todos</button>
            <button type="button" onClick={() => setHistoryFilter('confirmado')} className={historyFilter === 'confirmado' ? 'active' : ''}>Confirmados</button>
            <button type="button" onClick={() => setHistoryFilter('pendente')} className={historyFilter === 'pendente' ? 'active' : ''}>Pendentes</button>
            <button type="button" onClick={() => loadReferralData({ silent: true })} disabled={reloading || loading} className="update">
              {reloading ? 'Atualizando…' : 'Atualizar'}
            </button>
          </div>

          {loadError ? (
            <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--pl-warn-soft)', border: '1px solid var(--pl-warn)', borderRadius: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink)' }}>
              {loadError}
            </div>
          ) : null}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 52, borderRadius: 5, background: 'var(--pl-bg-soft)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="pl-cg-empty">
              <div className="icon"><Users size={20} /></div>
              <h4>{historyFilter !== 'todos' ? 'Nada neste filtro ainda.' : 'Nenhuma indicação registrada — seu link está pronto no topo.'}</h4>
              <p>Dica: mande o link direto; amigos não precisam digitar o código à mão.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredHistory.map((invite) => (
                <div key={invite.id} style={{
                  padding: '10px 14px',
                  background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule)',
                  borderRadius: 5,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{invite.name}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 10.5, fontWeight: 600, color: 'var(--pl-ink-3)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                      {invite.status} · {invite.date}
                    </p>
                  </div>
                  <span style={{
                    flexShrink: 0, padding: '3px 8px', borderRadius: 3,
                    background: invite.status === 'Confirmado' ? 'var(--pl-success-soft)' : 'var(--pl-warn-soft)',
                    color: invite.status === 'Confirmado' ? 'var(--pl-success)' : 'var(--pl-warn)',
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
                  }}>
                    {invite.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pl-cg-howto">
            <span className="lab">Como confirma?</span>
            <p>A indicação aparece como pendente no cadastro e vira confirmada quando o convidado conclui a vinculação do perfil no Papirando.</p>
            <a href={inviteUrl} target="_blank" rel="noopener noreferrer">
              Testar meu link <ArrowRight size={12} />
            </a>
          </div>
        </section>
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
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-2 tabular-nums text-2xl font-bold tracking-tight text-white">{value}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
          <Icon size={18} strokeWidth={2.25} />
        </div>
      </div>
    </div>
  );
}
