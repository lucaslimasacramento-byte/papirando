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

  const totalUrgent = urgentCount + flashcardState.overdue;

  return (
    <div className="pl-paper-bg" style={{ flex: 1, overflow: 'auto', padding: '28px 36px 48px' }}>

      {/* ── HERO ── */}
      <header style={{ display: 'flex', gap: 28, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pl-eyebrow">
            Inteligência de revisão
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            Revisões
          </div>
          <h1 className="pl-display" style={{ margin: '12px 0 0', fontSize: 64, color: 'var(--pl-ink)' }}>
            Revisa o que import<span style={{ color: 'var(--pl-accent)' }}>a.</span>
          </h1>
          <p style={{ margin: '14px 0 0', fontSize: 16, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 560, lineHeight: 1.55 }}>
            {targetContest?.nome
              ? `Fila inteligente para ${targetContest.nome} — disciplinas, flashcards e histórico real juntos.`
              : 'Fila inteligente que mistura histórico real, flashcards FSRS e disciplinas do edital.'}
          </p>
          <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
            {primaryReview && (
              <button
                className="pl-btn pl-btn-primary pl-btn-lg"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                onClick={() => onOpenRecommendedDiscipline?.(primaryReview.disciplina)}
              >
                <BrainCircuit size={14} /> Abrir disciplina
              </button>
            )}
            <button
              className="pl-btn pl-btn-lg"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={() => setRegistroEstudoModalOpen?.(true)}
            >
              Registrar revisão
            </button>
          </div>
        </div>

        {/* KPI aside */}
        <aside style={{
          width: 220, flexShrink: 0,
          background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)',
          borderRadius: 6, padding: '16px 18px',
        }}>
          <div className="pl-eyebrow" style={{ fontSize: 10 }}>Fila ativa</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '8px 0 6px' }}>
            <span className="pl-num" style={{ fontSize: 42, color: totalUrgent > 0 ? 'var(--pl-danger)' : 'var(--pl-ink)', lineHeight: 1 }}>
              {totalUrgent}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-3)' }}>urgentes</span>
          </div>
          <div className="pl-progress" style={{ marginBottom: 8 }}>
            <div className="fill" style={{
              width: `${Math.min(100, reviewHighlights.length * 14)}%`,
              background: totalUrgent > 0 ? 'var(--pl-danger)' : 'var(--pl-ink)',
            }} />
          </div>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
            {reviewHighlights.length} frente(s) · {flashcardState.dueToday} cards hoje
          </p>
        </aside>
      </header>

      <div className="pl-rule" style={{ margin: '28px 0 22px' }} />

      {/* ── KPI STRIP ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 22 }}>
        <PlKpi
          label="Alta prioridade"
          num={String(urgentCount)}
          accentColor={urgentCount > 0 ? 'danger' : undefined}
          icon={<AlertCircle size={14} style={{ color: urgentCount > 0 ? 'var(--pl-danger)' : 'var(--pl-ink-4)' }} />}
        />
        <PlKpi label="Flashcards hoje" num={String(flashcardState.dueToday)} />
        <PlKpi
          label="Vencidos (FSRS)"
          num={String(flashcardState.overdue)}
          accentColor={flashcardState.overdue > 0 ? 'warn' : undefined}
        />
        <PlKpi label="Frentes ativas" num={String(reviewHighlights.length)} />
      </section>

      {/* ── TWO-COLUMN ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>

        {/* Review queue */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ListOrdered size={14} style={{ color: 'var(--pl-accent)' }} />
              <div className="pl-eyebrow" style={{ fontSize: 10 }}>Fila de revisão</div>
            </div>
            <button
              className="pl-btn-link"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setActiveTab?.('historico')}
            >
              Ver histórico consolidado <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reviewHighlights.length === 0 ? (
              <div className="pl-card" style={{
                padding: '40px 24px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}>
                <Sparkles size={28} style={{ color: 'var(--pl-ink-4)' }} />
                <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                  Nenhuma revisão pendente. Bom trabalho!
                </p>
                <p style={{ fontSize: 12, color: 'var(--pl-ink-4)', fontWeight: 500, maxWidth: 320 }}>
                  Registre mais sessões e flashcards para o app entender o que merece reforço.
                </p>
              </div>
            ) : (
              reviewHighlights.map((item) => (
                <ReviewCard key={item.id} {...item} />
              ))
            )}
          </div>
        </div>

        {/* Right column: summary panels + decks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* IA insight */}
          <div className="pl-card-ai">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span className="pl-tag-ai">
                <BrainCircuit size={10} /> Bizu IA
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--pl-ink-3)', letterSpacing: '0.04em' }}>
                revisão sugerida
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--pl-ink)', lineHeight: 1.5 }}>
              {primaryReview
                ? <><span className="pl-mark-text">{primaryReview.disciplina}</span> é a frente mais crítica agora.</>
                : 'Sem dados suficientes para indicar revisão prioritária.'}
            </p>
            {primaryReview && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.5 }}>
                {primaryReview.reason}
              </p>
            )}
          </div>

          {/* Flashcards summary */}
          <div className="pl-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <RotateCcw size={13} style={{ color: 'var(--pl-accent)' }} />
              <div className="pl-eyebrow" style={{ fontSize: 9.5 }}>Flashcards para hoje</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span className="pl-num" style={{ fontSize: 36, color: 'var(--pl-ink)', lineHeight: 1 }}>
                {flashcardState.loading ? '–' : flashcardState.dueToday}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>cards</span>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
              {flashcardState.loading
                ? 'Carregando fila do FSRS…'
                : flashcardState.overdue > 0
                  ? `${flashcardState.overdue} vencido(s) além da data ideal`
                  : flashcardState.dueToday > 0
                    ? 'Fila do dia pronta para manter retenção alta'
                    : 'Nenhum card vencendo hoje'}
            </p>
            <button
              className="pl-btn-link"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setActiveTab?.('flashcards')}
            >
              Abrir flashcards <ArrowRight size={12} />
            </button>
          </div>

          {/* Discipline queue summary */}
          <div className="pl-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Layers3 size={13} style={{ color: 'var(--pl-warn)' }} />
              <div className="pl-eyebrow" style={{ fontSize: 9.5 }}>Frentes por disciplina</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span className="pl-num" style={{ fontSize: 36, color: 'var(--pl-ink)', lineHeight: 1 }}>
                {reviewQueue.length}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>frentes</span>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
              {reviewQueue.length > 0
                ? `${urgentCount} frente(s) com urgência alta no edital`
                : 'Sem fila de revisão por disciplina ainda'}
            </p>
            <button
              className="pl-btn-link"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setActiveTab?.('planejamento')}
            >
              Abrir planejamento <ArrowRight size={12} />
            </button>
          </div>

          {/* Deck list */}
          {(flashcardState.deckSummary.length > 0 || flashcardState.loading) && (
            <div className="pl-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <BookOpenCheck size={13} style={{ color: 'var(--pl-accent)' }} />
                <div className="pl-eyebrow" style={{ fontSize: 9.5 }}>Decks em revisão</div>
              </div>
              {flashcardState.loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <Loader2 size={20} style={{ color: 'var(--pl-accent)', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
          )}
        </div>
      </section>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function PlKpi({ label, num, icon, accentColor }) {
  const color =
    accentColor === 'danger' ? 'var(--pl-danger)' :
    accentColor === 'warn' ? 'var(--pl-warn)' :
    'var(--pl-ink)';
  return (
    <div className="pl-card" style={{ padding: '14px 16px' }}>
      <div className="pl-eyebrow" style={{ fontSize: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
        <span className="pl-num" style={{ fontSize: 32, color, lineHeight: 1 }}>{num}</span>
        {icon && <span style={{ marginLeft: 'auto' }}>{icon}</span>}
      </div>
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
  const accent = isUrgent ? 'var(--pl-danger)' : 'var(--pl-accent)';
  const accentSoft = isUrgent ? 'var(--pl-danger-soft)' : 'var(--pl-accent-soft)';

  return (
    <div className="pl-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex' }}>
        {/* Left accent bar */}
        <div style={{ width: 3, background: accent, flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  height: 20, padding: '0 7px', borderRadius: 3,
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  background: accentSoft, color: accent,
                  border: `1px solid ${accent}30`,
                }}>
                  {badgeText}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {cycle}
                </span>
              </div>
              <h4 style={{ margin: '0 0 2px', fontSize: 13.5, fontWeight: 600, color: 'var(--pl-ink)', lineHeight: 1.3 }}>
                {title}
              </h4>
              <p style={{ margin: '0 0 1px', fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 600 }}>
                {subject}
              </p>
              <p style={{
                margin: 0, fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.4,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {description}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                onClick={onOpen}
                className="pl-btn pl-btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
              >
                <CheckSquare size={11} /> Abrir
              </button>
              <button
                type="button"
                onClick={onRegister}
                className="pl-btn pl-btn-primary pl-btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
              >
                <Play size={10} fill="currentColor" /> {actionLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeckRow({ title, subject, dueToday, overdue, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderRadius: 5, border: '1px solid var(--pl-rule)',
        background: 'var(--pl-bg-soft)', cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.1s, border-color 0.1s',
        fontFamily: 'var(--pl-sans)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--pl-surface)'; e.currentTarget.style.borderColor = 'var(--pl-rule-strong)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--pl-bg-soft)'; e.currentTarget.style.borderColor = 'var(--pl-rule)'; }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </p>
        <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 500, color: 'var(--pl-ink-3)' }}>
          {subject}
        </p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink)', fontFamily: 'var(--pl-serif)', fontStyle: 'italic' }}>
          {dueToday} cards
        </p>
        <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 600, color: overdue > 0 ? 'var(--pl-danger)' : 'var(--pl-ink-4)' }}>
          {overdue > 0 ? `${overdue} vencido(s)` : 'Em dia'}
        </p>
      </div>
    </button>
  );
}
