import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Layers,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { buildCanonicalHistory, buildStudyHistoryOverview } from '../lib/studyAnalytics';
import { loadExamBoardsFromSupabase } from '../lib/examBoardsApi';
import { supabase } from '../lib/supabase';
import { submitAnswer } from '../lib/questoesApi';

function normalizeQuestion(row) {
  const alts = Array.isArray(row.alternativas)
    ? row.alternativas
    : (() => { try { return JSON.parse(row.alternativas || '[]'); } catch { return []; } })();
  return {
    id: row.id,
    disciplina: row.disciplina || '',
    topico: row.topico || '',
    banca: row.banca || '',
    ano: row.ano || '',
    dificuldade: row.dificuldade || 'Media',
    statement: row.enunciado || '',
    options: alts,
    explanation: row.explicacao || '',
  };
}

const QUESTION_BANK = [
  {
    id: 'Q-15024',
    disciplina: 'Direito Constitucional',
    topico: 'Direitos e Garantias Fundamentais',
    banca: 'CESPE',
    ano: '2024',
    statement: 'A criação de associações independe de autorização estatal, sendo vedada a interferência em seu funcionamento.',
    options: [
      { id: 'C', label: 'Certo', isCorrect: true },
      { id: 'E', label: 'Errado', isCorrect: false },
    ],
    explanation: 'Correto. O art. 5º, XVIII, protege a criação de associações sem autorização prévia e veda interferência estatal no funcionamento.',
  },
  {
    id: 'Q-08392',
    disciplina: 'Língua Portuguesa',
    topico: 'Concordância Verbal',
    banca: 'FCC',
    ano: '2023',
    statement: 'Assinale a alternativa em que há erro de concordância verbal, de acordo com a norma-padrão.',
    options: [
      { id: 'A', label: 'Alugam-se apartamentos nesta região.', isCorrect: false },
      { id: 'B', label: 'Faziam dez anos que não nos víamos.', isCorrect: true },
      { id: 'C', label: 'Existem boas razões para revisar o edital.', isCorrect: false },
      { id: 'D', label: 'Precisam-se de analistas para o setor.', isCorrect: false },
      { id: 'E', label: 'Havia candidatos suficientes para a segunda fase.', isCorrect: false },
    ],
    explanation: 'O erro está em "Faziam dez anos". O verbo fazer, indicando tempo decorrido, é impessoal e fica no singular: "Fazia dez anos".',
  },
  {
    id: 'Q-48201',
    disciplina: 'Direito Constitucional',
    topico: 'Controle de constitucionalidade',
    banca: 'FGV',
    ano: '2024',
    statement: 'A respeito do controle difuso de constitucionalidade exercido pelo Supremo Tribunal Federal, é correto afirmar que:',
    options: [
      { id: 'A', label: 'É exercido apenas pelo STF em sede de ADI.', isCorrect: false },
      { id: 'B', label: 'Produz efeitos erga omnes e vinculantes desde a decisão originária, dispensando o Senado.', isCorrect: false },
      { id: 'C', label: 'Permite que a inconstitucionalidade seja arguida como questão prejudicial, com efeitos inter partes, podendo ter eficácia geral pela atuação do Senado (art. 52, X, CF/88).', isCorrect: true },
      { id: 'D', label: 'Não admite modulação dos efeitos pelo STF, dada sua natureza incidental.', isCorrect: false },
      { id: 'E', label: 'Compete exclusivamente aos tribunais superiores, sendo vedado o exercício pelos juízos de primeiro grau.', isCorrect: false },
    ],
    explanation: 'O controle difuso é exercido incidenter tantum, com efeitos inter partes. O Senado Federal pode suspender a execução da lei (art. 52, X), conferindo eficácia geral. O STF admite modulação dos efeitos.',
  },
];

export default function Questoes({
  currentUserId = '',
  isEditingMeta,
  setIsEditingMeta,
  metaDiariaQuestoes,
  setMetaDiariaQuestoes,
  setRegistroEstudoModalOpen,
  historicoReal = [],
  subjectCatalog = [],
  studyRecommendation = null,
  onStartRecommendedSession,
}) {
  const [query, setQuery] = useState('');
  const [dbQuestions, setDbQuestions] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [todayStats, setTodayStats] = useState({ resolved: 0, accuracy: 0 });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDisc, setFilterDisc] = useState('');
  const [filterBanca, setFilterBanca] = useState('');
  const [filterDif, setFilterDif] = useState('');
  const [examBoards, setExamBoards] = useState([]);

  // Resolver mode
  const [resolverQuestion, setResolverQuestion] = useState(null);
  const [resolverIndex, setResolverIndex] = useState(0);

  const catalogDisciplineNames = useMemo(() => {
    const list = Array.isArray(subjectCatalog) ? subjectCatalog : [];
    return [...list].map((e) => String(e?.nome || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [subjectCatalog]);

  const loadQuestions = useCallback(async () => {
    setDbLoading(true);
    try {
      let q = supabase.from('questions').select('*').eq('is_active', true);
      if (filterDisc) q = q.eq('disciplina', filterDisc);
      if (filterBanca) q = q.eq('banca', filterBanca);
      if (filterDif) q = q.eq('dificuldade', filterDif);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      setDbQuestions((data || []).map(normalizeQuestion));
    } catch {
      let fb = supabase.from('questions').select('*').eq('is_public', true);
      if (filterDisc) fb = fb.eq('disciplina', filterDisc);
      if (filterBanca) fb = fb.eq('banca', filterBanca);
      if (filterDif) fb = fb.eq('dificuldade', filterDif);
      const { data } = await fb.order('created_at', { ascending: false }).limit(50);
      setDbQuestions((data || []).map(normalizeQuestion));
    } finally {
      setDbLoading(false);
    }
  }, [filterDisc, filterBanca, filterDif]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await loadExamBoardsFromSupabase(supabase);
      if (!cancelled) setExamBoards(rows);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (filterDisc && !catalogDisciplineNames.includes(filterDisc)) setFilterDisc('');
  }, [filterDisc, catalogDisciplineNames]);

  useEffect(() => {
    const names = examBoards.map((b) => b.nome);
    if (filterBanca && !names.includes(filterBanca)) setFilterBanca('');
  }, [filterBanca, examBoards]);

  const loadTodayStats = useCallback(async () => {
    if (!currentUserId) { setTodayStats({ resolved: 0, accuracy: 0 }); return; }
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const { data } = await supabase.from('question_answers').select('is_correct').eq('user_id', currentUserId).gte('answered_at', startOfToday.toISOString());
    const resolved = Array.isArray(data) ? data.length : 0;
    const correct = Array.isArray(data) ? data.filter((i) => Boolean(i?.is_correct)).length : 0;
    setTodayStats({ resolved, accuracy: resolved > 0 ? Math.round((correct / resolved) * 100) : 0 });
  }, [currentUserId]);

  useEffect(() => { loadTodayStats(); }, [loadTodayStats]);

  const allQuestions = dbQuestions.length > 0 ? dbQuestions : (dbLoading ? [] : QUESTION_BANK);
  const filteredQuestions = allQuestions.filter((item) => {
    if (filterDisc && item.disciplina !== filterDisc) return false;
    if (filterBanca && item.banca !== filterBanca) return false;
    if (filterDif && item.dificuldade && item.dificuldade !== filterDif) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return item.disciplina.toLowerCase().includes(q) || item.topico.toLowerCase().includes(q) || item.statement.toLowerCase().includes(q);
  });

  const activeFilters = [
    filterDisc && { key: 'disc', label: 'Disciplina', value: filterDisc, clear: () => setFilterDisc('') },
    filterBanca && { key: 'banca', label: 'Banca', value: filterBanca, clear: () => setFilterBanca('') },
    filterDif && { key: 'dif', label: 'Nível', value: filterDif, clear: () => setFilterDif('') },
  ].filter(Boolean);

  const openResolver = (q, idx) => {
    setResolverQuestion(q);
    setResolverIndex(idx);
  };
  const closeResolver = () => setResolverQuestion(null);

  const goNext = () => {
    const next = (resolverIndex + 1) % Math.max(filteredQuestions.length, 1);
    setResolverIndex(next);
    setResolverQuestion(filteredQuestions[next] || null);
  };
  const goPrev = () => {
    const prev = (resolverIndex - 1 + Math.max(filteredQuestions.length, 1)) % Math.max(filteredQuestions.length, 1);
    setResolverIndex(prev);
    setResolverQuestion(filteredQuestions[prev] || null);
  };

  if (resolverQuestion) {
    return (
      <PlResolver
        question={resolverQuestion}
        index={resolverIndex}
        total={filteredQuestions.length}
        currentUserId={currentUserId}
        onAnswered={loadTodayStats}
        onNext={goNext}
        onPrev={goPrev}
        onExit={closeResolver}
      />
    );
  }

  return (
    <div className="pl-paper-bg" style={{ flex: 1, overflow: 'auto', padding: '28px 36px 48px' }}>
      {/* Hero */}
      <header style={{ display: 'flex', gap: 24, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="pl-eyebrow">
            Banco de questões
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            <span>{filteredQuestions.length} questões filtradas</span>
          </div>
          <h1 className="pl-display" style={{ margin: '12px 0 0', fontSize: 64, color: 'var(--pl-ink)' }}>
            Bora papirar questão<span style={{ color: 'var(--pl-accent)' }}>?</span>
          </h1>
          <p style={{ margin: '14px 0 0', fontSize: 16, color: 'var(--pl-ink-2)', fontWeight: 500, maxWidth: 560, lineHeight: 1.55 }}>
            Filtra por banca, disciplina e nível. Cada questão que você papirar alimenta sua trilha de revisão automaticamente.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button className="pl-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Bookmark size={12} /> Salvar filtros
          </button>
          <button
            className="pl-btn pl-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            onClick={() => filteredQuestions.length > 0 && openResolver(filteredQuestions[0], 0)}
            disabled={filteredQuestions.length === 0}
          >
            <Play size={12} fill="currentColor" /> Papirar sessão · {filteredQuestions.length} questões
          </button>
        </div>
      </header>

      <div className="pl-rule" style={{ margin: '24px 0 18px' }} />

      {/* Filter chips + search */}
      <section style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {activeFilters.map((f) => (
          <PlChip key={f.key} label={f.label} value={f.value} active onClear={f.clear} />
        ))}
        {!filterDisc && <PlChip label="Disciplina" value="Todas" onClear={null} />}
        {!filterBanca && <PlChip label="Banca" value="Todas" onClear={null} />}
        <button
          className="pl-btn pl-btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={() => setFiltersOpen(true)}
        >
          <Plus size={12} /> Filtrar
        </button>

        <div style={{ position: 'relative', marginLeft: 4 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--pl-ink-4)' }} />
          <input
            className="pl-input pl-btn-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar questão..."
            style={{ paddingLeft: 30, height: 30, width: 200, borderRadius: 6 }}
          />
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink-3)', display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span className="pl-num" style={{ fontSize: 17, color: 'var(--pl-ink)' }}>{filteredQuestions.length}</span>
          <span>questões filtradas</span>
        </div>
      </section>

      {/* Loading */}
      {dbLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '32px 0', color: 'var(--pl-ink-3)' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Carregando questões...</span>
        </div>
      )}

      {/* Question list */}
      {!dbLoading && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredQuestions.length === 0 && (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--pl-ink-3)', fontSize: 14, fontWeight: 500 }}>
              Nenhuma questão encontrada. Tente ampliar os filtros.
            </div>
          )}
          {filteredQuestions.map((q, idx) => (
            <PlQuestionCard key={q.id} question={q} onPapirar={() => openResolver(q, idx)} />
          ))}
        </section>
      )}

      {/* Pagination */}
      {!dbLoading && filteredQuestions.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22 }}>
          <button className="pl-btn pl-btn-sm" style={{ width: 32, padding: 0, justifyContent: 'center' }}>‹</button>
          <button className="pl-btn pl-btn-sm pl-btn-primary" style={{ width: 32, padding: 0, justifyContent: 'center' }}>1</button>
          <button className="pl-btn pl-btn-sm" style={{ width: 32, padding: 0, justifyContent: 'center' }}>2</button>
          <button className="pl-btn pl-btn-sm" style={{ width: 32, padding: 0, justifyContent: 'center' }}>3</button>
          <span style={{ color: 'var(--pl-ink-4)', padding: '0 4px' }}>…</span>
          <button className="pl-btn pl-btn-sm" style={{ width: 32, padding: 0, justifyContent: 'center' }}>›</button>
        </div>
      )}

      {/* Filters modal */}
      {filtersOpen && (
        <PlFiltersModal
          catalogDisciplineNames={catalogDisciplineNames}
          examBoards={examBoards}
          filterDisc={filterDisc} setFilterDisc={setFilterDisc}
          filterBanca={filterBanca} setFilterBanca={setFilterBanca}
          filterDif={filterDif} setFilterDif={setFilterDif}
          onClose={() => setFiltersOpen(false)}
        />
      )}
    </div>
  );
}

// ── Filter chip ──────────────────────────────────────────────────────────────
function PlChip({ label, value, active, onClear }) {
  return (
    <button
      onClick={active && onClear ? onClear : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 30, padding: '0 11px',
        border: '1px solid ' + (active ? 'var(--pl-accent-ring)' : 'var(--pl-rule-strong)'),
        background: active ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
        color: active ? 'var(--pl-accent)' : 'var(--pl-ink-2)',
        borderRadius: 6, cursor: active && onClear ? 'pointer' : 'default',
        fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--pl-sans)',
      }}
    >
      <span style={{ color: active ? 'rgba(29,78,216,0.65)' : 'var(--pl-ink-4)', fontWeight: 500 }}>{label}:</span>
      {value}
      {active && onClear && <span style={{ marginLeft: 2, fontSize: 14, lineHeight: 1, opacity: 0.5 }}>×</span>}
    </button>
  );
}

// ── Question card (list view) ────────────────────────────────────────────────
function PlQuestionCard({ question, onPapirar }) {
  const levelColor = question.dificuldade === 'Difícil' || question.dificuldade === 'Dificil'
    ? 'var(--pl-danger)' : question.dificuldade === 'Fácil' || question.dificuldade === 'Facil'
    ? 'var(--pl-success)' : 'var(--pl-ink-2)';

  return (
    <div className="pl-card" style={{ padding: '18px 22px', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, fontWeight: 600, color: 'var(--pl-ink-3)', flexWrap: 'wrap' }}>
        <span className="pl-num" style={{ fontSize: 14, color: 'var(--pl-ink-2)' }}>{question.id}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{question.banca} · {question.ano}</span>
        <div style={{ flex: 1 }} />
        <span className="pl-tag" style={{ color: levelColor }}>{question.dificuldade || 'Médio'}</span>
      </div>

      <div style={{ marginTop: 8, fontSize: 10.5, fontWeight: 700, color: 'var(--pl-ink-4)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
        {question.disciplina} <span style={{ opacity: 0.5 }}>·</span> {question.topico}
      </div>

      <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--pl-ink)', fontWeight: 500, maxWidth: '70ch' }}>
        {question.statement}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <button className="pl-btn pl-btn-sm pl-btn-primary" onClick={onPapirar} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Papirar <ArrowRight size={11} />
        </button>
        <button className="pl-btn pl-btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Bookmark size={11} /> Marcar página
        </button>
      </div>
    </div>
  );
}

// ── Resolver (answering screen) ──────────────────────────────────────────────
function PlResolver({ question, index, total, currentUserId, onAnswered, onNext, onPrev, onExit }) {
  const [selectedId, setSelectedId] = useState('');
  const [answered, setAnswered] = useState(false);
  const [marked, setMarked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef(Date.now());

  // Stable ref for keyboard handler to read latest state
  const stateRef = useRef({});
  stateRef.current = { answered, selectedId };

  const correctId = question.options.find((o) => o.isCorrect)?.id || '';
  const selectedOption = question.options.find((o) => o.id === selectedId) || null;
  const wasCorrect = answered && Boolean(selectedOption?.isCorrect);

  // Live timer
  useEffect(() => {
    if (answered || paused) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [answered, paused]);

  // Reset on question change
  useEffect(() => {
    setSelectedId('');
    setAnswered(false);
    setSeconds(0);
    startedAt.current = Date.now();
  }, [question.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const letters = question.options.map((o) => o.id.toUpperCase());
    const handler = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      const { answered, selectedId } = stateRef.current;
      const key = e.key.toUpperCase();

      if (letters.includes(key) && !answered) {
        setSelectedId(key);
      } else if (e.key === 'Enter') {
        if (!answered && selectedId) {
          setAnswered(true);
          if (currentUserId) {
            const tempoSegundos = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
            const opt = question.options.find((o) => o.id === selectedId);
            submitAnswer(currentUserId, {
              question_id: question.id,
              resposta: selectedId,
              is_correct: Boolean(opt?.isCorrect),
              tempo_segundos: tempoSegundos,
            }).then(() => onAnswered?.()).catch(console.error);
          }
        } else if (answered) {
          onNext?.();
        }
      } else if (e.key === 'ArrowLeft') {
        if (!answered) onPrev?.();
      } else if (e.key === 'ArrowRight') {
        if (answered) onNext?.();
      } else if (e.key === 'm' || e.key === 'M') {
        setMarked((m) => !m);
      } else if (e.key === 'Escape') {
        onExit?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [question.id, question.options, currentUserId, onAnswered, onNext, onPrev, onExit]);

  const handleConfirm = () => {
    if (!selectedId || answered) return;
    setAnswered(true);
    if (currentUserId) {
      const tempoSegundos = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      submitAnswer(currentUserId, {
        question_id: question.id,
        resposta: selectedId,
        is_correct: Boolean(selectedOption?.isCorrect),
        tempo_segundos: tempoSegundos,
      }).then(() => onAnswered?.()).catch(console.error);
    }
  };

  const handleNext = () => { onNext?.(); };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', background: 'var(--pl-bg)' }}>

      {/* Main column */}
      <div className="pl-paper-bg" style={{ flex: 1, minWidth: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Session strip */}
        <div style={{
          padding: '14px 36px', borderBottom: '1px solid var(--pl-rule-2)',
          background: 'var(--pl-surface)',
          display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0,
        }}>
          <button className="pl-btn pl-btn-sm" onClick={onExit} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={11} /> Sair da sessão
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="pl-eyebrow" style={{ fontSize: 10 }}>Sessão · {question.disciplina}</span>
            <span className="pl-num" style={{ fontSize: 17, color: 'var(--pl-ink)' }}>
              {index + 1}<span style={{ color: 'var(--pl-ink-3)', fontSize: 14 }}>/{total}</span>
            </span>
          </div>
          <div style={{ flex: 1, maxWidth: 280 }}>
            <div className="pl-progress accent"><div className="fill" style={{ width: `${progress}%` }} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} style={{ color: 'var(--pl-ink-3)' }} />
            <span style={{
              fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300,
              fontSize: 20, color: 'var(--pl-ink)', letterSpacing: '-0.03em',
            }}>
              {mm}:{ss}
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <button
            className="pl-btn pl-btn-sm"
            onClick={() => setPaused((p) => !p)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {paused ? <Play size={11} /> : <Pause size={11} />}
            {paused ? 'Retomar' : 'Pausar'}
          </button>
          <button
            className="pl-btn pl-btn-sm"
            onClick={() => setMarked((m) => !m)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: marked ? 'var(--pl-accent)' : undefined }}
          >
            <Bookmark size={11} fill={marked ? 'currentColor' : 'none'} /> Marcar página
          </button>
        </div>

        {/* Question content */}
        <div style={{ padding: '32px 56px 48px', maxWidth: 820, margin: '0 auto', width: '100%' }}>
          {/* Question header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="pl-num" style={{ fontSize: 17, color: 'var(--pl-ink-2)' }}>{question.id}</span>
            <span style={{ color: 'var(--pl-ink-4)' }}>·</span>
            <span className="pl-tag">{question.banca} · {question.ano}</span>
            <span className="pl-tag">{question.dificuldade || 'Médio'}</span>
            <div style={{ flex: 1 }} />
          </div>

          <div className="pl-eyebrow" style={{ marginTop: 22, fontSize: 11 }}>
            {question.disciplina} <span style={{ opacity: 0.4 }}>·</span> {question.topico}
          </div>

          <h1 style={{
            margin: '14px 0 0',
            fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300,
            fontSize: 38, lineHeight: 1.15, letterSpacing: '-0.025em', color: 'var(--pl-ink)',
          }}>
            {question.statement}
          </h1>

          {/* Alternatives */}
          <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {question.options.map((opt) => (
              <PlAlternative
                key={opt.id}
                letter={opt.id}
                selected={selectedId === opt.id}
                isCorrect={opt.id === correctId}
                answered={answered}
                onClick={() => !answered && setSelectedId(opt.id)}
              >
                {opt.label}
              </PlAlternative>
            ))}
          </div>

          {/* Action bar */}
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 10, paddingTop: 22, borderTop: '1px solid var(--pl-rule)' }}>
            <button className="pl-btn" onClick={() => !answered && onPrev?.()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={11} /> Anterior
            </button>
            <button className="pl-btn" onClick={handleNext} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Pular
            </button>
            <div style={{ flex: 1 }} />
            {!answered ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                  {selectedId
                    ? <>Selecionada: <em style={{ fontFamily: 'var(--pl-serif)', color: 'var(--pl-ink)' }}>{selectedId}</em></>
                    : 'Escolhe uma alternativa pra continuar.'}
                </span>
                <button
                  className="pl-btn pl-btn-primary"
                  disabled={!selectedId}
                  onClick={handleConfirm}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: selectedId ? 1 : 0.5 }}
                >
                  Confirmar resposta <ArrowRight size={11} />
                </button>
              </>
            ) : (
              <>
                {wasCorrect
                  ? <span className="pl-tag pl-tag-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={10} /> Acertou em {seconds}s</span>
                  : <span className="pl-tag pl-tag-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><X size={10} /> Errou — vai pra revisão</span>}
                <button className="pl-btn pl-btn-primary" onClick={handleNext} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Próxima questão <ArrowRight size={11} />
                </button>
              </>
            )}
          </div>

          {/* Gabarito box */}
          {answered && (
            <PlGabaritoBox correctId={correctId} explanation={question.explanation} wasCorrect={wasCorrect} />
          )}
        </div>
      </div>

      {/* Side panel — Estúdio */}
      <aside style={{
        width: 320, flexShrink: 0,
        background: 'var(--pl-surface)',
        borderLeft: '1px solid var(--pl-rule-2)',
        overflow: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        <PlAnotacoesPanel answered={answered} />
      </aside>
    </div>
  );
}

// ── Alternative button ───────────────────────────────────────────────────────
function PlAlternative({ letter, selected, isCorrect, answered, onClick, children }) {
  let borderColor = 'var(--pl-rule-strong)';
  let bg = 'var(--pl-surface)';
  let letterBg = 'var(--pl-bg-soft)';
  let letterColor = 'var(--pl-ink-2)';
  let cornerIcon = null;

  if (!answered && selected) {
    borderColor = 'var(--pl-accent)'; bg = 'var(--pl-accent-soft)';
    letterBg = 'var(--pl-accent)'; letterColor = '#fff';
  } else if (answered) {
    if (isCorrect && selected) {
      borderColor = 'var(--pl-success)'; bg = 'var(--pl-success-soft)';
      letterBg = 'var(--pl-success)'; letterColor = '#fff';
      cornerIcon = <Check size={16} style={{ color: 'var(--pl-success)' }} />;
    } else if (isCorrect && !selected) {
      borderColor = 'var(--pl-success)'; bg = 'var(--pl-surface)';
      letterBg = 'transparent'; letterColor = 'var(--pl-success)';
      cornerIcon = <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--pl-success)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Gabarito</span>;
    } else if (selected && !isCorrect) {
      borderColor = 'var(--pl-danger)'; bg = 'var(--pl-danger-soft)';
      letterBg = 'var(--pl-danger)'; letterColor = '#fff';
      cornerIcon = <X size={16} style={{ color: 'var(--pl-danger)' }} />;
    }
  }

  return (
    <button onClick={onClick} disabled={answered} style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '14px 18px',
      background: bg, border: '1.5px solid ' + borderColor,
      borderRadius: 8, cursor: answered ? 'default' : 'pointer',
      textAlign: 'left', fontFamily: 'var(--pl-sans)',
      transition: 'background .12s, border-color .12s', width: '100%',
    }}>
      <span style={{
        flex: '0 0 32px', width: 32, height: 32, borderRadius: 6,
        background: letterBg, color: letterColor,
        border: letterBg === 'transparent' ? '1.5px solid currentColor' : 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
        fontSize: 17, letterSpacing: '-0.04em',
      }}>{letter}</span>
      <span style={{ flex: 1, fontSize: 14.5, lineHeight: 1.55, color: 'var(--pl-ink)', fontWeight: 500, paddingTop: 4 }}>{children}</span>
      {cornerIcon && <span style={{ flex: '0 0 auto', paddingTop: 6 }}>{cornerIcon}</span>}
    </button>
  );
}

// ── Gabarito box ─────────────────────────────────────────────────────────────
function PlGabaritoBox({ correctId, explanation, wasCorrect }) {
  return (
    <div style={{
      marginTop: 24,
      background: 'var(--pl-surface)',
      border: '1px solid var(--pl-rule-2)',
      borderRadius: 8,
      padding: '24px 28px',
      position: 'relative',
      overflow: 'hidden',
      animation: 'pl-gabarito-reveal 0.24s ease-out',
    }}>
      {/* Dog-ear corner */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 36, height: 36,
        background: 'var(--pl-bg-soft)',
        clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
        borderLeft: '1px solid var(--pl-rule-2)',
        borderBottom: '1px solid var(--pl-rule-2)',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="pl-eyebrow">Comentário do professor</span>
        <span style={{ color: 'var(--pl-ink-4)' }}>·</span>
        <span style={{ fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500 }}>Prof. Renata Bianchi</span>
      </div>

      <h3 style={{
        margin: '14px 0 0',
        fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
        fontSize: 24, letterSpacing: '-0.025em', color: 'var(--pl-ink)', lineHeight: 1.25,
      }}>
        Gabarito:{' '}
        <span style={{ color: wasCorrect ? 'var(--pl-success)' : 'var(--pl-danger)' }}>
          letra {correctId}
        </span>
        <span style={{ color: 'var(--pl-ink)' }}>
          {wasCorrect ? ' — você acertou.' : ' — você errou.'}
        </span>
      </h3>

      <p style={{
        margin: '14px 0 0', fontSize: 14.5, lineHeight: 1.7, color: 'var(--pl-ink-2)',
        fontWeight: 500, maxWidth: '62ch',
      }}>
        {explanation}
      </p>

      <div style={{
        marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--pl-rule)',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <button className="pl-btn pl-btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <BookOpen size={11} /> Ver aula completa
        </button>
        <button className="pl-btn pl-btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Bookmark size={11} /> Salvar comentário
        </button>
        <button className="pl-btn pl-btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={11} /> Questões parecidas
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: 'var(--pl-ink-4)', fontWeight: 500 }}>
          Esse comentário ajudou?{' '}
          <button style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--pl-accent)', fontWeight: 600, fontFamily: 'var(--pl-sans)' }}>Sim</button>
          {' · '}
          <button style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 600, fontFamily: 'var(--pl-sans)' }}>Não</button>
        </span>
      </div>
    </div>
  );
}

// ── Side panel (Estúdio) ─────────────────────────────────────────────────────
function PlAnotacoesPanel({ answered }) {
  const [tab, setTab] = useState('anotacao');
  return (
    <>
      <div style={{ padding: '16px 22px 0', borderBottom: '1px solid var(--pl-rule)' }}>
        <div className="pl-eyebrow" style={{ fontSize: 10 }}>Estúdio</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
          <SidetabBtn active={tab === 'anotacao'} onClick={() => setTab('anotacao')}>Anotação</SidetabBtn>
          <SidetabBtn active={tab === 'comentarios'} onClick={() => setTab('comentarios')}>
            Comentários <span style={{ color: 'var(--pl-ink-4)' }}>· 3</span>
          </SidetabBtn>
          <SidetabBtn active={tab === 'relacionado'} onClick={() => setTab('relacionado')}>Relacionado</SidetabBtn>
        </div>
      </div>

      <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
        {tab === 'anotacao' && <PlNotePane answered={answered} />}
        {tab === 'comentarios' && <PlCommentsPane />}
        {tab === 'relacionado' && <PlRelatedPane />}
      </div>
    </>
  );
}

function SidetabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: 0, padding: '8px 2px',
      fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--pl-sans)',
      color: active ? 'var(--pl-ink)' : 'var(--pl-ink-3)',
      cursor: 'pointer', marginRight: 16,
      borderBottom: active ? '2px solid var(--pl-ink)' : '2px solid transparent',
      letterSpacing: '-0.005em',
    }}>{children}</button>
  );
}

function PlNotePane({ answered }) {
  return (
    <>
      <div className="pl-eyebrow" style={{ fontSize: 10 }}>Sua anotação · privada</div>
      <textarea
        style={{
          width: '100%', minHeight: 160,
          padding: '12px 14px',
          background: 'var(--pl-bg-soft)',
          border: '1px solid var(--pl-rule)',
          borderRadius: 6,
          fontFamily: 'var(--pl-sans)', fontSize: 13, lineHeight: 1.55,
          color: 'var(--pl-ink)', resize: 'vertical',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 23px, var(--pl-rule) 23px 24px)',
        }}
        placeholder="Anote palavras-chave, dicas, macetes..."
      />

      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button className="pl-btn pl-btn-sm">Salvar anotação</button>
        <button className="pl-btn pl-btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Bookmark size={11} /> Marcador
        </button>
      </div>

      <div className="pl-rule" style={{ margin: '8px 0' }} />

      {/* Bizu IA */}
      <div className="pl-card-ai" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="pl-tag-ai" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Sparkles size={10} /> Bizu <span className="pl-ai-accent">IA</span>
          </span>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--pl-ink-2)', fontWeight: 500, lineHeight: 1.55 }}>
          Quer que eu explique de outro jeito? Faço uma analogia, monto um mapa mental ou crio 3 questões parecidas pra fixar.
        </p>
        <button className="pl-btn pl-btn-sm pl-btn-ai" style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={11} /> Conversar
        </button>
      </div>

      <div className="pl-rule" style={{ margin: '8px 0' }} />

      <div className="pl-eyebrow" style={{ fontSize: 10 }}>Atalhos pra essa questão</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <SidelinkRow icon={<BookOpen size={13} />} title="Controle difuso & concentrado" sub="Aula 14 · 32 min" />
        <SidelinkRow icon={<Layers size={13} />} title="Flashcards do tópico" sub="18 cards · 6 pendentes" />
        <SidelinkRow icon={<RefreshCw size={13} />} title="Revisão espaçada" sub={answered ? 'Próxima em 3 dias' : 'Configure depois de responder'} muted={!answered} />
      </div>
    </>
  );
}

function PlCommentsPane() {
  return (
    <>
      <div className="pl-eyebrow" style={{ fontSize: 10 }}>Discussão · 12 papireiros</div>
      <PlComment
        author="Marina P." role="Papireira lv. 9" time="há 2h"
        text="Cuidado com a 'D' — o STF JÁ modulou efeito no controle difuso (Mira Estrela). Cai muito."
        likes={14} top
      />
      <PlComment
        author="Júlio C." role="Aprovado · TCU 2024" time="há 5h"
        text="Decora o art. 52, X, da CF. Cai em pelo menos uma questão em toda prova de constitucional."
        likes={9}
      />
      <PlComment
        author="Renata B." role="Professora" time="ontem"
        text="Detalhe doutrinário: a possibilidade de o Senado suspender é controversa (teoria da abstrativização do controle difuso, Gilmar Mendes)."
        likes={22} highlight
      />
      <button className="pl-btn pl-btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
        Ver mais 9 comentários
      </button>
    </>
  );
}

function PlComment({ author, role, time, text, likes, top, highlight }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: highlight ? 'var(--pl-highlight-soft)' : 'var(--pl-bg-soft)',
      border: '1px solid var(--pl-rule)',
      borderRadius: 6,
      position: 'relative',
    }}>
      {top && (
        <span style={{
          position: 'absolute', top: -8, left: 12,
          fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--pl-warn)', background: 'var(--pl-surface)',
          border: '1px solid var(--pl-warn-soft)',
          padding: '2px 6px', borderRadius: 3,
        }}>↑ Mais útil</span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink)' }}>{author}</span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--pl-ink-3)', letterSpacing: '0.04em' }}>{role}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, color: 'var(--pl-ink-4)' }}>{time}</span>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.55, color: 'var(--pl-ink-2)', fontWeight: 500 }}>
        {text}
      </p>
      <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: 11.5, color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)', fontWeight: 600 }}>↑ {likes}</button>
        <button style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: 11.5, color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)', fontWeight: 600 }}>Responder</button>
      </div>
    </div>
  );
}

function PlRelatedPane() {
  return (
    <>
      <div className="pl-eyebrow" style={{ fontSize: 10 }}>Conteúdo relacionado</div>
      <SidelinkRow icon={<BookOpen size={13} />} title="Aula · Controle difuso" sub="14 / 32 · com você desde a p. 14" highlight />
      <SidelinkRow icon={<BookOpen size={13} />} title="Aula · Controle concentrado" sub="Não iniciada · 28 min" />
      <SidelinkRow icon={<Layers size={13} />} title="Q-48199 · Princípios fundamentais" sub="CESPE 2023 · 54% acertam" />
      <SidelinkRow icon={<Layers size={13} />} title="Q-48105 · Direitos fundamentais" sub="FGV 2024 · 71% acertam" />
      <SidelinkRow icon={<RefreshCw size={13} />} title="Revisão · art. 52, X" sub="Disponível em 3 dias" />
    </>
  );
}

function SidelinkRow({ icon, title, sub, muted, highlight }) {
  return (
    <button style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px',
      background: highlight ? 'var(--pl-accent-soft)' : 'transparent',
      border: 0, borderRadius: 6,
      cursor: 'pointer', textAlign: 'left', width: '100%',
      fontFamily: 'var(--pl-sans)',
    }}>
      <span style={{
        flex: '0 0 26px', width: 26, height: 26, borderRadius: 5,
        background: highlight ? 'rgba(29,78,216,0.15)' : 'var(--pl-bg-soft)',
        color: highlight ? 'var(--pl-accent)' : 'var(--pl-ink-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: muted ? 0.4 : 1,
      }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: muted ? 'var(--pl-ink-3)' : 'var(--pl-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--pl-ink-3)', fontWeight: 500, marginTop: 1 }}>{sub}</div>
      </div>
      <ChevronRight size={12} style={{ color: muted ? 'var(--pl-ink-4)' : 'var(--pl-ink-3)', flexShrink: 0 }} />
    </button>
  );
}

// ── Filters modal ────────────────────────────────────────────────────────────
function PlFiltersModal({ catalogDisciplineNames, examBoards, filterDisc, setFilterDisc, filterBanca, setFilterBanca, filterDif, setFilterDif, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,17,13,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="pl-card-elev" style={{ width: '100%', maxWidth: 520, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="pl-eyebrow" style={{ fontSize: 10 }}>Refinar banco</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 20, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--pl-ink)' }}>
              Filtrar questões
            </h3>
          </div>
          <button className="pl-btn pl-btn-sm" onClick={onClose} style={{ width: 32, padding: 0, justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="pl-eyebrow" style={{ fontSize: 10, marginBottom: 8 }}>Disciplina</div>
            <select className="pl-input" style={{ width: '100%' }} value={filterDisc} onChange={(e) => setFilterDisc(e.target.value)}>
              <option value="">Todas as disciplinas</option>
              {catalogDisciplineNames.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <div className="pl-eyebrow" style={{ fontSize: 10, marginBottom: 8 }}>Banca</div>
            <select className="pl-input" style={{ width: '100%' }} value={filterBanca} onChange={(e) => setFilterBanca(e.target.value)}>
              <option value="">Todas as bancas</option>
              {examBoards.map((b) => <option key={b.id || b.nome} value={b.nome}>{b.nome}</option>)}
            </select>
          </div>
          <div>
            <div className="pl-eyebrow" style={{ fontSize: 10, marginBottom: 8 }}>Dificuldade</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['', 'Facil', 'Media', 'Dificil'].map((d) => (
                <button key={d} className={`pl-btn pl-btn-sm${filterDif === d ? ' pl-btn-primary' : ''}`} onClick={() => setFilterDif(d)}>
                  {d === '' ? 'Todas' : d === 'Facil' ? 'Fácil' : d === 'Media' ? 'Médio' : 'Difícil'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button className="pl-btn pl-btn-sm" onClick={() => { setFilterDisc(''); setFilterBanca(''); setFilterDif(''); }}>Limpar</button>
          <button className="pl-btn pl-btn-sm pl-btn-primary" onClick={onClose}>Aplicar filtros</button>
        </div>
      </div>
    </div>
  );
}
