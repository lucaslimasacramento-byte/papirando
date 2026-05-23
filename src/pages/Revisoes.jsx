import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  Clock,
  Layers3,
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
  const [snoozedReviews, setSnoozedReviews] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('papirando_review_snoozes') || '{}');
    } catch {
      return {};
    }
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

            const duracaoSugerida = staleReview ? 45 : 30;
            const urgencia = lowPerformance ? 'alta' : (daysWithoutStudy > 14 ? 'media' : 'baixa');
            const tipo = lowPerformance ? 'desempenho' : 'defasado';

            return {
              id: `review-real-${item.disciplina}`,
              disciplinaId: item.disciplina,
              disciplina: item.disciplina,
              plano: targetContest?.nome || 'Plano ativo',
              tipo,
              urgencia,
              razao: reasonParts.slice(0, 2).join(' + '),
              detalhe: `${item.acertos} acerto(s) e ${item.erros} erro(s) recentes.`,
              duracaoSugerida,
              ultimaSessao: formatRelativeDays(daysWithoutStudy),
              title: lowPerformance ? `Retomar ${item.disciplina}` : `Revisar ${item.disciplina}`,
              urgencyLabel: lowPerformance ? 'Alta prioridade' : 'Revisao pendente',
              actionLabel: 'Iniciar revisao',
              reason: reasonParts.join(' | '),
              suggestedDurationLabel: `${duracaoSugerida} min`,
              score: lowPerformance ? 100 - averagePerformance + daysWithoutStudy : Math.max(daysWithoutStudy, 1),
              recommendation: {
                id: item.disciplina,
                nome: item.disciplina,
                studyMode: 'revisao',
                suggestedDurationMin: duracaoSugerida,
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
          .slice(0, 5)
          .map((item, index) => ({ ...item, rank: index + 1 }));

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
  }, [currentUserId, targetContest?.nome]);

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

  const normalizedQueue = useMemo(() => {
    return (Array.isArray(reviewQueue) ? reviewQueue : [])
      .map((item, index) => normalizeReviewItem(item, index, targetContest))
      .filter((item) => !isReviewSnoozed(item.id, snoozedReviews));
  }, [reviewQueue, snoozedReviews, targetContest]);

  const flashcardHero = useMemo(() => {
    const deck = flashcardState.deckSummary?.[0];
    if (!deck || flashcardState.dueToday <= 0) return null;
    return {
      id: `flashcards-${deck.id || 'today'}`,
      rank: 1,
      tipo: 'flashcard',
      urgencia: flashcardState.overdue > 0 ? 'alta' : 'media',
      disciplina: deck.title || 'Flashcards',
      plano: 'FSRS + repeticao espacada',
      razao: `${deck.dueToday} flashcards FSRS vencem no deck ${deck.title || 'principal'}`,
      detalhe: flashcardState.overdue > 0
        ? `${flashcardState.overdue} ja passaram do horario ideal.`
        : 'Fila do dia pronta para manter retencao alta.',
      duracaoSugerida: Math.max(10, Math.min(45, Math.round(deck.dueToday * 1.5))),
      ultimaSessao: 'fila FSRS',
      recommendation: null,
      isFlashcard: true,
    };
  }, [flashcardState]);

  const enrichedQueue = useMemo(() => {
    const shouldPromoteFlashcards = flashcardHero && (
      flashcardState.overdue > 0 && (!normalizedQueue[0] || normalizedQueue[0].urgencia !== 'alta')
    );
    const base = shouldPromoteFlashcards ? [flashcardHero, ...normalizedQueue] : normalizedQueue;
    return base.slice(0, 5).map((item, index) => ({ ...item, rank: index + 1 }));
  }, [flashcardHero, flashcardState.overdue, normalizedQueue]);

  const heroItem = enrichedQueue[0] || null;
  const queueItems = enrichedQueue.slice(1, 5);
  const urgentTotal = enrichedQueue.filter((item) => item.urgencia === 'alta').length + flashcardState.overdue;
  const targetSummary = buildTargetSummary(targetContest);
  const emptyState = enrichedQueue.length === 0 && flashcardState.dueToday === 0;

  const startReview = (item) => {
    if (!item) {
      setRegistroEstudoModalOpen?.(true);
      return;
    }
    if (item.isFlashcard || item.tipo === 'flashcard') {
      setActiveTab?.('flashcards');
      return;
    }
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
  };

  const snoozeReview = (item) => {
    if (!item?.id) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    const next = { ...snoozedReviews, [item.id]: tomorrow.toISOString() };
    setSnoozedReviews(next);
    localStorage.setItem('papirando_review_snoozes', JSON.stringify(next));
  };

  return (
    <div className="pl-paper-bg-soft revisoes-page">
      <div className="revisoes-wrap">
        <RevisoesHeader
          onRegistrar={() => setRegistroEstudoModalOpen?.(true)}
          onIniciarProxima={() => startReview(heroItem)}
        />

        {emptyState ? (
          <RevisoesEmptyState
            onRegistrar={() => setRegistroEstudoModalOpen?.(true)}
            onFlashcards={() => setActiveTab?.('flashcards')}
            onDefinirAlvo={() => setActiveTab?.('concursos')}
          />
        ) : (
          <>
            <RevisoesKpiStrip
              totals={{
                fila: enrichedQueue.length,
                alta: urgentTotal,
                fcHoje: flashcardState.dueToday,
                fcVencidos: flashcardState.overdue,
                cobertura: targetSummary.cobertura,
                diasRestantes: targetSummary.diasRestantes,
                disciplinas: new Set(enrichedQueue.map((item) => item.disciplina)).size,
              }}
            />

            <section className="revisoes-dashboard-grid">
              <div className="revisoes-main-column">
                <HeroRevisao
                  item={heroItem}
                  onIniciar={() => startReview(heroItem)}
                  onAbrir={() => heroItem?.tipo === 'flashcard' ? setActiveTab?.('flashcards') : onOpenRecommendedDiscipline?.(heroItem?.disciplina)}
                  onAdiar={() => snoozeReview(heroItem)}
                />
                <FilaSection
                  items={queueItems}
                  onIniciar={startReview}
                  onOpenHistorico={() => setActiveTab?.('historico')}
                />
              </div>

              <aside className="revisoes-side-column">
                <ConcursoAlvoCard
                  target={targetSummary}
                  onDefinir={() => setActiveTab?.('concursos')}
                  onAbrirEdital={() => setActiveTab?.('edital')}
                />
                <DecksEmRevisao
                  loading={flashcardState.loading}
                  decks={flashcardState.deckSummary}
                  totalHoje={flashcardState.dueToday}
                  onAbrir={() => setActiveTab?.('flashcards')}
                />
                <HistoricoRevisoesCard onAbrir={() => setActiveTab?.('historico')} />
              </aside>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function RevisoesHeader({ onRegistrar, onIniciarProxima }) {
  return (
    <header className="revisoes-header">
      <div>
        <div className="pl-overline">Revisao inteligente / FSRS + historico</div>
        <h1 className="pl-display revisoes-title">Revisoes<span>.</span></h1>
        <p className="pl-body revisoes-subtitle">
          O motor cruza desempenho, dias sem retomar e flashcards FSRS vencidos pra mostrar <span className="pl-mark-text">o que merece reforco hoje</span>.
          Voce so escolhe por onde comecar.
        </p>
      </div>
      <div className="revisoes-header-actions">
        <button type="button" className="pl-btn" onClick={onRegistrar}>Registrar estudo</button>
        <button type="button" className="pl-btn pl-btn-primary" onClick={onIniciarProxima}><Play size={12} /> Iniciar proxima</button>
      </div>
    </header>
  );
}

function RevisoesKpiStrip({ totals }) {
  const items = [
    { label: 'Pra revisar', value: String(totals.fila).padStart(2, '0'), sub: `${totals.disciplinas} disciplinas priorizadas`, tone: 'accent' },
    { label: 'Alta prioridade', value: String(totals.alta).padStart(2, '0'), sub: 'motor recomenda comecar por aqui', tone: 'danger', icon: AlertCircle },
    { label: 'Flashcards hoje', value: String(totals.fcHoje).padStart(2, '0'), sub: `${totals.fcVencidos} vencidos do FSRS`, tone: 'warn' },
    { label: 'Cobertura alvo', value: totals.cobertura == null ? '--%' : `${totals.cobertura}%`, sub: totals.diasRestantes == null ? 'sem alvo definido' : `${totals.diasRestantes} dias ate a prova`, tone: 'success' },
  ];
  return (
    <section className="revisoes-kpi-grid">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={`pl-card revisoes-kpi-card revisoes-kpi-${item.tone}`}>
            <div className="pl-overline">{item.label}</div>
            <div className="revisoes-kpi-value">{item.value}{Icon && <Icon size={15} />}</div>
            <p>{item.sub}</p>
          </div>
        );
      })}
    </section>
  );
}

function HeroRevisao({ item, onIniciar, onAbrir, onAdiar }) {
  if (!item) return null;
  const abrirLabel = item.tipo === 'flashcard' ? 'Abrir deck' : 'Abrir disciplina';
  return (
    <section className="revisoes-hero-card">
      <div className="revisoes-card-corner" />
      <div className="revisoes-hero-top">
        <div className="revisoes-hero-rank">01</div>
        <div>
          <div className="revisoes-live-dot"><span /> Proxima revisao / {tipoLabel(item.tipo)}</div>
          <h2>{item.disciplina}</h2>
          <p>{item.plano || 'Plano ativo'} / estudada {item.ultimaSessao || 'recentemente'}</p>
        </div>
      </div>
      <blockquote>
        <p>{item.razao}</p>
        <footer>{item.detalhe}</footer>
      </blockquote>
      <div className="revisoes-hero-actions">
        <button type="button" className="revisoes-highlight-btn" onClick={onIniciar}><Play size={12} /> Iniciar revisao / {item.duracaoSugerida || 30}min</button>
        <button type="button" className="revisoes-outline-dark" onClick={onAbrir}>{abrirLabel} <ArrowRight size={12} /></button>
        <button type="button" className="revisoes-snooze-btn" title="Adiar pra amanha" onClick={onAdiar}><Clock size={14} /></button>
      </div>
    </section>
  );
}

function FilaSection({ items, onIniciar, onOpenHistorico }) {
  return (
    <section className="pl-card revisoes-fila-card">
      <div className="revisoes-section-head">
        <div>
          <div className="pl-overline">Continua na fila</div>
          <h2 className="pl-section-title">{items.length} frentes priorizadas pelo motor</h2>
        </div>
        <button type="button" className="pl-btn-link" onClick={onOpenHistorico}>Ver fila completa <ArrowRight size={12} /></button>
      </div>
      {items.length === 0 ? (
        <div className="revisoes-dashed-note">Sem outras frentes por enquanto.</div>
      ) : items.map((item, index) => (
        <React.Fragment key={item.id}>
          <FilaRow item={item} onIniciar={() => onIniciar(item)} />
          {index < items.length - 1 && <div className="pl-rule-soft" />}
        </React.Fragment>
      ))}
    </section>
  );
}

function FilaRow({ item, onIniciar }) {
  return (
    <div className="revisoes-fila-row">
      <div className="revisoes-row-rank">{String(item.rank).padStart(2, '0')}</div>
      <div className="revisoes-row-main">
        <div className="revisoes-row-meta">
          <span className={`pl-tag pl-tag-${urgenciaToTone(item.urgencia)}`}>{tipoLabel(item.tipo)}</span>
          <span>{item.plano || 'Plano ativo'} / estudada {item.ultimaSessao || 'recentemente'}</span>
        </div>
        <h3>{item.disciplina}</h3>
        <p>{item.razao}</p>
      </div>
      <div className="revisoes-row-time">
        <div className="pl-overline">Sugerida</div>
        <strong>{item.duracaoSugerida || 30}<span>min</span></strong>
      </div>
      <button type="button" className="pl-btn pl-btn-sm" onClick={onIniciar}><Play size={11} /> Iniciar</button>
    </div>
  );
}

function ConcursoAlvoCard({ target, onDefinir, onAbrirEdital }) {
  if (!target?.nome) {
    return (
      <section className="pl-card-paper revisoes-target-empty">
        <div className="pl-overline">Concurso-alvo</div>
        <h3>Sem alvo definido.</h3>
        <p>As prioridades ficam genericas enquanto voce nao escolhe uma prova.</p>
        <button type="button" className="pl-btn pl-btn-sm" onClick={onDefinir}>Definir alvo <ArrowRight size={11} /></button>
      </section>
    );
  }
  return (
    <section className="pl-card revisoes-target-card">
      <div className="revisoes-target-top">
        <span className="pl-overline">Concurso-alvo</span>
        <strong>{target.diasRestantes == null ? '--' : target.diasRestantes} dias</strong>
      </div>
      <h3>{target.nome}</h3>
      <p>{target.banca || 'Banca a definir'} / {target.cargo || 'cargo-alvo'}</p>
      <div>
        <div className="revisoes-progress-head"><span>Cobertura do edital</span><b>{target.cobertura == null ? '--%' : `${target.cobertura}%`}</b></div>
        <div className="pl-progress-track"><div className="pl-progress-fill" style={{ width: `${target.cobertura || 0}%` }} /></div>
      </div>
      <div className="pl-rule-soft" />
      <div className="revisoes-target-bottom">
        <div><span className="pl-overline">Fases priorizadas</span><b>{target.fasesPriorizadas || 0}</b></div>
        <button type="button" className="pl-btn pl-btn-sm" onClick={onAbrirEdital}>Abrir edital <ArrowRight size={11} /></button>
      </div>
    </section>
  );
}

function DecksEmRevisao({ loading, decks, totalHoje, onAbrir }) {
  return (
    <section className="pl-card revisoes-decks-card">
      <div className="revisoes-decks-head">
        <div><div className="pl-overline">FSRS</div><h3>Decks vencendo hoje</h3></div>
        <strong>{String(totalHoje).padStart(2, '0')}</strong>
      </div>
      {loading ? (
        <div className="revisoes-loading"><Loader2 size={22} className="animate-spin" /></div>
      ) : decks.length === 0 ? (
        <div className="revisoes-dashed-note">Sem decks com revisao vencendo hoje.</div>
      ) : (
        <div className="revisoes-deck-list">
          {decks.map((deck) => <DeckRow key={deck.id} {...deck} onOpen={onAbrir} />)}
        </div>
      )}
      <button type="button" className="pl-btn-link" onClick={onAbrir}>Abrir todos os flashcards <ArrowRight size={12} /></button>
    </section>
  );
}

function HistoricoRevisoesCard({ onAbrir }) {
  return (
    <section className="pl-card-paper revisoes-history-card">
      <div className="pl-overline">Historico</div>
      <h3>Ultima semana</h3>
      <div className="revisoes-history-grid">
        <span><strong>--</strong> fechadas</span>
        <span><strong>--</strong> min media</span>
        <span><strong>--%</strong> pos-revisao</span>
      </div>
      <p>Aguardando historico suficiente para consolidar a leitura.</p>
      <button type="button" className="pl-btn-link" onClick={onAbrir}>Ver historico consolidado <ArrowRight size={12} /></button>
    </section>
  );
}

function RevisoesEmptyState({ onRegistrar, onFlashcards, onDefinirAlvo }) {
  return (
    <section className="pl-card-paper revisoes-empty-state">
      <div className="revisoes-empty-live"><span /> Sua fila esta pronta</div>
      <h2>Sem historico suficiente ainda.</h2>
      <p>Registre estudo, rode flashcards e defina um concurso-alvo para o motor entender o que merece reforco.</p>
      <div className="revisoes-empty-grid">
        <EmptyAction n="01" title="Registrar uma sessao" detail="Alimente o historico real para calibrar a fila." cta="Registrar estudo" onClick={onRegistrar} />
        <EmptyAction n="02" title="Estudar flashcards" detail="Use FSRS para criar revisoes automaticas." cta="Abrir flashcards" onClick={onFlashcards} />
        <EmptyAction n="03" title="Definir concurso-alvo" detail="Priorize o edital que realmente importa agora." cta="Escolher alvo" onClick={onDefinirAlvo} />
      </div>
    </section>
  );
}

function EmptyAction({ n, title, detail, cta, onClick }) {
  return (
    <article className="pl-card revisoes-empty-action">
      <span className="pl-serif-number">{n}</span>
      <h3>{title}</h3>
      <p>{detail}</p>
      <button type="button" className="pl-btn pl-btn-primary pl-btn-sm" onClick={onClick}>{cta}</button>
    </article>
  );
}

function DeckRow({ title, disciplina, dueToday, overdue, onOpen }) {
  return (
    <button type="button" className="revisoes-deck-row" onClick={onOpen}>
      <span><strong>{title}</strong><em>{disciplina || 'Flashcards'}</em></span>
      <b>{dueToday} cards<small>{overdue > 0 ? `${overdue} vencidos` : 'em dia'}</small></b>
    </button>
  );
}

function normalizeReviewItem(item, index, targetContest) {
  const isHigh = item?.urgencia === 'alta' || item?.urgencyLabel === 'Alta prioridade' || item?.isUrgent;
  const duration = Number(item?.duracaoSugerida || item?.recommendation?.suggestedDurationMin || parseInt(item?.suggestedDurationLabel, 10) || 30);
  return {
    id: item?.id || `review-${index}`,
    rank: Number(item?.rank || index + 1),
    disciplinaId: item?.disciplinaId || item?.id || item?.disciplina || item?.nome,
    disciplina: item?.disciplina || item?.subject || item?.nome || item?.title || 'Revisao',
    plano: item?.plano || targetContest?.nome || 'Plano ativo',
    tipo: item?.tipo || (isHigh ? 'desempenho' : 'defasado'),
    urgencia: item?.urgencia || (isHigh ? 'alta' : 'media'),
    razao: item?.razao || item?.reason || item?.description || 'Revisao recomendada pelo historico recente.',
    detalhe: item?.detalhe || item?.reason || 'A fila inteligente encontrou uma oportunidade de reforco.',
    duracaoSugerida: duration,
    ultimaSessao: item?.ultimaSessao || 'recentemente',
    recommendation: item?.recommendation || item,
  };
}

function buildTargetSummary(targetContest) {
  if (!targetContest) return { nome: '', cobertura: null, diasRestantes: null, fasesPriorizadas: 0 };
  const prova = targetContest.dataProva || targetContest.provaData || targetContest.data || targetContest.examDate;
  let diasRestantes = Number(targetContest.diasRestantes ?? targetContest.daysLeft ?? NaN);
  if (!Number.isFinite(diasRestantes) && prova) {
    const date = new Date(prova);
    if (!Number.isNaN(date.getTime())) diasRestantes = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
  }
  return {
    nome: targetContest.nome || targetContest.name || targetContest.titulo || '',
    banca: targetContest.banca || targetContest.organizadora || '',
    cargo: targetContest.cargo || targetContest.area || targetContest.label || '',
    cobertura: Number.isFinite(Number(targetContest.cobertura ?? targetContest.progresso ?? targetContest.progress))
      ? Math.round(Number(targetContest.cobertura ?? targetContest.progresso ?? targetContest.progress))
      : null,
    diasRestantes: Number.isFinite(diasRestantes) ? diasRestantes : null,
    fasesPriorizadas: Number(targetContest.fasesPriorizadas || targetContest.fases || targetContest.disciplinas?.length || 0),
  };
}

function isReviewSnoozed(id, snoozedReviews) {
  const until = snoozedReviews?.[id];
  if (!until) return false;
  return new Date(until).getTime() > Date.now();
}

function formatRelativeDays(days) {
  if (!Number.isFinite(days) || days > 900) return 'sem registro recente';
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `ha ${days} dias`;
}

function tipoLabel(tipo) {
  if (tipo === 'desempenho') return 'Desempenho caindo';
  if (tipo === 'flashcard') return 'FSRS vencido';
  return 'Defasada no tempo';
}

function urgenciaToTone(urgencia) {
  if (urgencia === 'alta') return 'danger';
  if (urgencia === 'media') return 'warn';
  return 'accent';
}
