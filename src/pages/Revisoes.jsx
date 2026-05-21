import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Layers3,
  ListOrdered,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import PageHeadPremium, {
  PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS,
  PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS,
  PageHeadPremiumBadge,
} from '../components/PageHeadPremium';

export default function Revisoes({
  setRegistroEstudoModalOpen,
  setActiveTab,
  targetContest = null,
  studyRecommendation = null,
  onOpenRecommendedDiscipline,
  onStartRecommendedSession,
  currentUserId = '',
}) {
  const fallbackReviewQueue = studyRecommendation?.reviewQueue || [];
  const [realReviewQueue, setRealReviewQueue] = useState([]);
  const [realReviewReady, setRealReviewReady] = useState(false);
  const [flashcardState, setFlashcardState] = useState({
    loading: false,
    dueToday: 0,
    overdue: 0,
    deckSummary: [],
  });

  useEffect(() => {
    let active = true;

    const loadRealReviewQueue = async () => {
      if (!currentUserId) {
        if (active) {
          setRealReviewQueue([]);
          setRealReviewReady(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('study_sessions')
          .select('disciplina, data, desempenho, acertos, erros')
          .eq('user_id', currentUserId)
          .order('data', { ascending: false })
          .limit(30);

        if (error) throw error;
        if (!active) return;

        const today = new Date();
        const grouped = new Map();

        (data || []).forEach((session) => {
          const disciplina = String(session?.disciplina || '').trim();
          if (!disciplina) return;

          const existing = grouped.get(disciplina) || {
            disciplina,
            latestDate: '',
            totalDesempenho: 0,
            samples: 0,
            acertos: 0,
            erros: 0,
          };

          const sessionDate = String(session?.data || '');
          if (!existing.latestDate || sessionDate > existing.latestDate) {
            existing.latestDate = sessionDate;
          }

          existing.totalDesempenho += Number(session?.desempenho || 0);
          existing.samples += 1;
          existing.acertos += Number(session?.acertos || 0);
          existing.erros += Number(session?.erros || 0);
          grouped.set(disciplina, existing);
        });

        const nextQueue = [...grouped.values()]
          .map((item) => {
            const averagePerformance = item.samples > 0 ? Math.round(item.totalDesempenho / item.samples) : 0;
            const latestDate = item.latestDate ? new Date(`${item.latestDate}T12:00:00`) : null;
            const daysWithoutStudy =
              latestDate && !Number.isNaN(latestDate.getTime())
                ? Math.floor((today.getTime() - latestDate.getTime()) / 86400000)
                : 999;

            const lowPerformance = averagePerformance < 60;
            const staleReview = daysWithoutStudy > 7;

            if (!lowPerformance && !staleReview) return null;

            const reasonParts = [];
            if (lowPerformance) reasonParts.push(`${averagePerformance}% de desempenho médio nas últimas sessões`);
            if (staleReview) reasonParts.push(`${daysWithoutStudy} dia(s) sem revisar`);
            reasonParts.push(`${item.acertos} acerto(s) e ${item.erros} erro(s) recentes`);

            return {
              id: `review-real-${item.disciplina}`,
              disciplinaId: item.disciplina,
              disciplina: item.disciplina,
              title: lowPerformance ? `Retomar ${item.disciplina}` : `Revisar ${item.disciplina}`,
              urgencyLabel: lowPerformance ? 'Alta prioridade' : 'Revisão pendente',
              actionLabel: 'Iniciar revisão',
              reason: reasonParts.join(' | '),
              suggestedDurationLabel: staleReview ? '45 min' : '30 min',
              score: lowPerformance ? 100 - averagePerformance + daysWithoutStudy : Math.max(daysWithoutStudy, 1),
              recommendation: {
                id: item.disciplina,
                nome: item.disciplina,
                studyMode: 'revisao',
                suggestedDurationMin: staleReview ? 45 : 30,
                nextTopic: { nome: item.disciplina },
              },
            };
          })
          .filter(Boolean)
          .sort((first, second) => {
            if (first.urgencyLabel !== second.urgencyLabel) {
              return first.urgencyLabel === 'Alta prioridade' ? -1 : 1;
            }
            return Number(second.score || 0) - Number(first.score || 0);
          })
          .slice(0, 5);

        setRealReviewQueue(nextQueue);
        setRealReviewReady(true);
      } catch (error) {
        console.warn('[study_sessions] Falha ao carregar fila real de revisões:', error?.message || error);
      }
    };

    loadRealReviewQueue();

    return () => {
      active = false;
    };
  }, [currentUserId]);

  const reviewQueue = realReviewReady ? realReviewQueue : fallbackReviewQueue;
  const primaryReview = reviewQueue[0] || null;
  const urgentCount = reviewQueue.filter((item) => item.urgencyLabel === 'Alta prioridade').length;

  useEffect(() => {
    let active = true;

    const loadFlashcardQueue = async () => {
      if (!currentUserId) {
        if (active) {
          setFlashcardState({ loading: false, dueToday: 0, overdue: 0, deckSummary: [] });
        }
        return;
      }

      setFlashcardState((prev) => ({ ...prev, loading: true }));

      const [deckResult, cardResult] = await Promise.all([
        supabase.from('flashcard_decks').select('id, title, disciplina, color').eq('user_id', currentUserId),
        supabase.from('flashcard_cards').select('id, deck_id, due').eq('user_id', currentUserId),
      ]);

      if (!active) return;

      if (deckResult.error || cardResult.error) {
        console.warn(
          '[Revisoes] Falha ao carregar fila de flashcards:',
          deckResult.error?.message || cardResult.error?.message
        );
        setFlashcardState({ loading: false, dueToday: 0, overdue: 0, deckSummary: [] });
        return;
      }

      const deckMap = new Map((deckResult.data || []).map((deck) => [deck.id, deck]));
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const now = new Date();
      const grouped = new Map();

      (cardResult.data || []).forEach((card) => {
        const dueDate = new Date(card.due);
        if (Number.isNaN(dueDate.getTime()) || dueDate > endOfToday) return;

        const deck = deckMap.get(card.deck_id);
        if (!deck) return;

        const current = grouped.get(card.deck_id) || {
          id: deck.id,
          title: deck.title || 'Deck',
          disciplina: deck.disciplina || 'Flashcards',
          color: deck.color || 'blue',
          dueToday: 0,
          overdue: 0,
        };

        current.dueToday += 1;
        if (dueDate < now) current.overdue += 1;
        grouped.set(card.deck_id, current);
      });

      const deckSummary = [...grouped.values()]
        .sort((first, second) => second.overdue - first.overdue || second.dueToday - first.dueToday)
        .slice(0, 5);

      setFlashcardState({
        loading: false,
        dueToday: deckSummary.reduce((acc, item) => acc + item.dueToday, 0),
        overdue: deckSummary.reduce((acc, item) => acc + item.overdue, 0),
        deckSummary,
      });
    };

    loadFlashcardQueue();

    return () => {
      active = false;
    };
  }, [currentUserId]);

  const reviewHighlights = useMemo(() => {
    const cards = [];

    if (flashcardState.dueToday > 0) {
      cards.push({
        id: 'flashcards',
        badgeText: flashcardState.overdue > 0 ? 'Vencidos agora' : 'Fila do dia',
        cycle: `${flashcardState.dueToday} cards`,
        title: 'Flashcards prontos para revisar',
        subject: 'FSRS + repetição espaçada',
        description:
          flashcardState.overdue > 0
            ? `${flashcardState.overdue} card(s) já passaram do horário ideal.`
            : 'Sua fila de flashcards está pronta para manter retenção alta.',
        actionLabel: 'Abrir flashcards',
        isUrgent: flashcardState.overdue > 0,
        onOpen: () => setActiveTab?.('flashcards'),
        onRegister: () => setActiveTab?.('flashcards'),
      });
    }

    return cards.concat(
      reviewQueue.map((item) => ({
        id: item.id,
        badgeText: item.urgencyLabel,
        cycle: item.suggestedDurationLabel,
        title: item.title,
        subject: item.disciplina,
        description: item.reason,
        actionLabel: item.actionLabel,
        isUrgent: item.urgencyLabel === 'Alta prioridade',
        onOpen: () => onOpenRecommendedDiscipline?.(item.disciplina),
        onRegister: () => {
          if (item.recommendation) {
            onStartRecommendedSession?.(item.recommendation);
            return;
          }

          const fullRecommendation = (studyRecommendation?.cycleCandidates || [])
            .concat(studyRecommendation?.queue || [], studyRecommendation?.primary || [])
            .find((candidate) => candidate?.id === item.disciplinaId || candidate?.nome === item.disciplina);

          if (fullRecommendation) {
            onStartRecommendedSession?.(fullRecommendation);
            return;
          }

          setRegistroEstudoModalOpen?.(true);
        },
      }))
    );
  }, [
    flashcardState.dueToday,
    flashcardState.overdue,
    onOpenRecommendedDiscipline,
    onStartRecommendedSession,
    reviewQueue,
    setActiveTab,
    setRegistroEstudoModalOpen,
    studyRecommendation,
  ]);

  return (
    <div className="page-shell flex flex-col !gap-3 !pb-4 !pt-4 animate-in fade-in duration-500 sm:!pt-5 lg:!gap-4">
      <PageHeadPremium
        className="shrink-0 gap-4"
        icon={CheckCircle2}
        badge={
          <PageHeadPremiumBadge icon={CalendarClock}>
            Revisão inteligente
          </PageHeadPremiumBadge>
        }
        title="Revisões priorizadas"
        subtitle="Fila por disciplina, histórico real e flashcards FSRS vencidos — detalhes na área abaixo."
        leadingClassName="min-w-0 shrink-0 lg:max-w-[26rem] xl:max-w-[28rem]"
        statGridClassName="grid min-h-0 w-full max-w-full grid-cols-2 gap-2 sm:max-w-[24rem] sm:gap-3 sm:justify-items-stretch [&>*]:self-stretch sm:[&>*]:min-w-[9rem]"
        trailingClassName="w-full shrink-0 sm:w-auto"
        stats={[
          {
            key: 'urgent',
            icon: AlertCircle,
            label: 'Alta prioridade',
            value: `${urgentCount + flashcardState.overdue} itens`,
            accent: 'red',
            valueClassName: '!text-red-200',
            className: 'min-h-[5.25rem] sm:min-h-[5.75rem]',
          },
          {
            key: 'fila',
            icon: CheckSquare,
            label: 'Fila ativa',
            value: `${reviewHighlights.length} frentes`,
            accent: 'emerald',
            valueClassName: '!text-emerald-200',
            className: 'min-h-[5.25rem] sm:min-h-[5.75rem]',
          },
        ]}
        trailing={(
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={() => setRegistroEstudoModalOpen?.(true)}
              className={`${PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS} w-full sm:w-auto`}
            >
              <Play size={14} fill="currentColor" className="opacity-95" aria-hidden />
              Registrar estudo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab?.('flashcards')}
              className={`${PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS} w-full sm:w-auto`}
            >
              <Layers3 size={14} aria-hidden />
              Flashcards
            </button>
          </div>
        )}
      />

      <div className="soft-accent shrink-0 rounded-2xl p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white">
                <AlertCircle size={12} strokeWidth={3} />
                {primaryReview ? primaryReview.urgencyLabel : 'Sem fila crítica'}
              </span>

              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                {targetContest?.nome || 'Sem concurso-alvo definido'}
              </span>
            </div>

            <h3 className="text-2xl font-semibold tracking-tight text-slate-900 lg:text-3xl">
              {primaryReview?.title || 'Sua fila de revisão está pronta'}
            </h3>

            <p className="mb-4 mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
              {primaryReview
                ? `${primaryReview.disciplina} | ${primaryReview.reason}`
                : 'Assim que houver histórico e disciplinas suficientes, a fila inteligente aparece aqui.'}
            </p>

            <div className="flex flex-wrap gap-2.5">
              {primaryReview && (
                <button
                  type="button"
                  onClick={() => onOpenRecommendedDiscipline?.(primaryReview.disciplina)}
                  className="flex items-center gap-2 rounded-xl bg-[#185FA5] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0C447C] sm:text-sm"
                >
                  <BrainCircuit size={16} />
                  Abrir disciplina
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (primaryReview) {
                    if (primaryReview.recommendation) {
                      onStartRecommendedSession?.(primaryReview.recommendation);
                      return;
                    }

                    const fullRecommendation = (studyRecommendation?.cycleCandidates || [])
                      .concat(studyRecommendation?.queue || [], studyRecommendation?.primary || [])
                      .find(
                        (item) => item?.id === primaryReview.disciplinaId || item?.nome === primaryReview.disciplina
                      );

                    if (fullRecommendation) {
                      onStartRecommendedSession?.(fullRecommendation);
                      return;
                    }
                  }

                  setRegistroEstudoModalOpen?.(true);
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:text-sm"
              >
                <Play fill="currentColor" size={16} />
                Registrar revisão
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <SummaryPanel
              icon={RotateCcw}
              label="Flashcards para hoje"
              value={`${flashcardState.dueToday}`}
              detail={
                flashcardState.loading
                  ? 'Carregando fila do FSRS...'
                  : flashcardState.dueToday > 0
                    ? `${flashcardState.overdue} vencido(s) além da data ideal`
                    : 'Nenhum card vencendo hoje'
              }
              actionLabel="Abrir flashcards"
              onAction={() => setActiveTab?.('flashcards')}
              loading={flashcardState.loading}
            />

            <SummaryPanel
              icon={Layers3}
              label="Frentes por disciplina"
              value={`${reviewQueue.length}`}
              detail={
                reviewQueue.length > 0
                  ? `${urgentCount} frente(s) com urgência alta no edital`
                  : 'Sem fila de revisão por disciplina ainda'
              }
              actionLabel="Abrir planejamento"
              onAction={() => setActiveTab?.('planejamento')}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0 pr-1">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-gray-400">
              <ListOrdered size={18} className="text-blue-600" />
              Fila de revisão
            </h3>

            <button
              type="button"
              onClick={() => setActiveTab?.('historico')}
              className="inline-flex items-center gap-2 text-sm font-bold text-[#2563EB] transition-all hover:gap-3"
            >
              Ver histórico consolidado
              <ArrowRight size={14} />
            </button>
          </div>

          {reviewHighlights.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
                <Sparkles size={22} />
              </div>
              <h4 className="mt-3 text-lg font-semibold text-slate-900">Nenhuma revisão inteligente por enquanto</h4>
              <p className="mx-auto mt-2 max-w-2xl text-sm font-medium text-gray-500">
                Registre mais sessões, questões e flashcards para o app entender melhor o que merece reforço.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reviewHighlights.map((item) => (
                <ReviewCard key={item.id} {...item} />
              ))}
            </div>
          )}
        </div>

        <div className="section-card p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <BookOpenCheck size={13} className="text-[#185FA5]" />
            Decks em revisão
          </div>

          {flashcardState.loading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : flashcardState.deckSummary.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
              Sem decks com revisão vencendo hoje.
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {flashcardState.deckSummary.map((deck) => (
                <DeckRow
                  key={deck.id}
                  title={deck.title}
                  subject={deck.disciplina}
                  dueToday={deck.dueToday}
                  overdue={deck.overdue}
                  onOpen={() => setActiveTab?.('flashcards')}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryPanel({ icon: Icon, label, value, detail, actionLabel, onAction, loading = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? '--' : value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#185FA5]">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-2 text-sm font-medium leading-snug text-slate-500">{detail}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#185FA5] transition hover:gap-3"
      >
        {actionLabel}
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

function ReviewCard({
  badgeText,
  cycle,
  title,
  subject,
  description,
  onOpen,
  onRegister,
  isUrgent = false,
  actionLabel,
}) {
  return (
    <div
      className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center ${
        isUrgent ? 'border-red-200 hover:border-red-300' : 'border-gray-100 hover:border-blue-200'
      }`}
    >
      <div className={`absolute bottom-0 left-0 top-0 w-1.5 ${isUrgent ? 'bg-red-500' : 'bg-blue-500'}`} />

      <div className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
        <RotateCcw size={20} />
      </div>

      <div className="flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
              isUrgent ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'
            }`}
          >
            {badgeText}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Sessão sugerida: {cycle}
          </span>
        </div>

        <h4 className="text-base font-semibold tracking-tight text-gray-800">{title}</h4>
        <p className="text-sm font-medium text-gray-500">{subject}</p>
        <p className="mt-1.5 text-sm font-medium text-gray-500">{description}</p>
      </div>

      <div className="mt-2 flex w-full items-center gap-2.5 sm:mt-0 sm:w-auto">
        <button
          type="button"
          onClick={onOpen}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 transition-all hover:border-blue-600 hover:text-blue-600 sm:flex-none sm:text-sm"
        >
          <CheckSquare size={16} />
          Abrir
        </button>

        <button
          type="button"
          onClick={onRegister}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all shadow-sm sm:flex-none sm:text-sm ${
            isUrgent ? 'bg-red-500 hover:bg-red-600' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
          }`}
        >
          <Play size={16} fill="currentColor" />
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function DeckRow({ title, subject, dueToday, overdue, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-blue-200 hover:bg-white"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{subject}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-900">{dueToday} cards</p>
        <p className={`text-xs font-bold ${overdue > 0 ? 'text-red-500' : 'text-slate-400'}`}>
          {overdue > 0 ? `${overdue} vencido(s)` : 'Em dia'}
        </p>
      </div>
    </button>
  );
}
