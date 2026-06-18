import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PremiumGate from '../components/PremiumGate';
import {
  Loader2,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Edit3,
  Layers3,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { buildCanonicalHistory, buildStudyHistoryOverview } from '../lib/studyAnalytics';
import { loadExamBoardsFromSupabase } from '../lib/examBoardsApi';
import { supabase } from '../lib/supabase';
import { submitAnswer } from '../lib/questoesApi';

// Normalizes a Supabase question row to the format the UI expects
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

// Keep a small fallback so the bank section doesn't look empty on first load.
// IMPORTANTE: textos com acentuação completa. CSS text-transform: uppercase
// preserva diacríticos no Plus Jakarta Sans; o rótulo de disciplina aparecia
// como "MATEMATICA" porque o conteúdo já vinha sem acento da fonte de dados.
const QUESTION_BANK = [
  {
    id: 'Q15024',
    disciplina: 'Direito Constitucional',
    topico: 'Direitos e Garantias Fundamentais',
    banca: 'CESPE/CEBRASPE',
    ano: '2024',
    statement:
      'Segundo a Constituição da República Federativa do Brasil de 1988, a criação de associações independe de autorização estatal, sendo vedada a interferência em seu funcionamento.',
    options: [
      { id: 'C', label: 'Certo', isCorrect: true },
      { id: 'E', label: 'Errado', isCorrect: false },
    ],
    explanation:
      'A afirmação está correta. O art. 5º, XVIII, protege a criação de associações sem autorização prévia e veda interferência estatal no funcionamento.',
  },
  {
    id: 'Q08392',
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
    explanation:
      'O erro está em "Faziam dez anos". O verbo fazer, indicando tempo decorrido, fica no singular: "Fazia dez anos".',
  },
];

function readNotebookStorage(key) {
  if (typeof window === 'undefined') return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

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
  bancoDisciplinas = [],
  selectedCoursePlan = 'Todos',
  planningCourseOptions = [],
  isPremium = false,
  onUpgrade,
}) {
  const [query, setQuery] = useState('');
  const [dbQuestions, setDbQuestions] = useState([]);
  const [dbLoading, setDbLoading]     = useState(true);
  const [todayStats, setTodayStats]   = useState({ resolved: 0, accuracy: 0 });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDisc, setFilterDisc]   = useState('');
  const [filterBanca, setFilterBanca] = useState('');
  const [filterDif, setFilterDif]     = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [examBoards, setExamBoards] = useState([]);
  const [cadernoBuilderOpen, setCadernoBuilderOpen] = useState(false);
  const [activeCadernoId, setActiveCadernoId] = useState('');
  const storageKey = useMemo(
    () => `papirando_question_notebooks_${currentUserId || 'anon'}`,
    [currentUserId]
  );
  const skipNextNotebookPersistRef = useRef(false);
  const [cadernos, setCadernos] = useState(() => {
    return readNotebookStorage(storageKey);
  });

  const catalogDisciplineNames = useMemo(() => {
    const list = Array.isArray(subjectCatalog) ? subjectCatalog : [];
    return [...list]
      .map((entry) => String(entry?.nome || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [subjectCatalog]);

  const courseOptions = useMemo(() => {
    const fromDisciplines = (Array.isArray(bancoDisciplinas) ? bancoDisciplinas : [])
      .map((disciplina) => String(disciplina?.plano || '').trim())
      .filter(Boolean);
    const fromPlanning = (Array.isArray(planningCourseOptions) ? planningCourseOptions : [])
      .map((plan) => String(plan?.plano || plan?.nome || '').trim())
      .filter(Boolean);
    return [...new Set([...fromPlanning, ...fromDisciplines])]
      .filter((name) => name && name !== 'Geral')
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [bancoDisciplinas, planningCourseOptions]);

  const disciplineOptions = useMemo(() => {
    const disciplines = Array.isArray(bancoDisciplinas) ? bancoDisciplinas : [];
    if (disciplines.length > 0) {
      return disciplines
        .map((disciplina) => ({
          id: String(disciplina?.id || disciplina?.nome || ''),
          nome: String(disciplina?.nome || '').trim(),
          plano: String(disciplina?.plano || '').trim(),
          topicos: Array.isArray(disciplina?.topicos) ? disciplina.topicos : [],
        }))
        .filter((disciplina) => disciplina.nome)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
    return catalogDisciplineNames.map((nome) => ({ id: nome, nome, plano: '', topicos: [] }));
  }, [bancoDisciplinas, catalogDisciplineNames]);

  useEffect(() => {
    skipNextNotebookPersistRef.current = true;
    setCadernos(readNotebookStorage(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (skipNextNotebookPersistRef.current) {
      skipNextNotebookPersistRef.current = false;
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(cadernos));
  }, [cadernos, storageKey]);

  // Load questions from Supabase
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
      let fallbackQuery = supabase.from('questions').select('*').eq('is_public', true);
      if (filterDisc) fallbackQuery = fallbackQuery.eq('disciplina', filterDisc);
      if (filterBanca) fallbackQuery = fallbackQuery.eq('banca', filterBanca);
      if (filterDif) fallbackQuery = fallbackQuery.eq('dificuldade', filterDif);
      const { data } = await fallbackQuery.order('created_at', { ascending: false }).limit(50);
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
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (filterDisc && !catalogDisciplineNames.includes(filterDisc)) {
      setFilterDisc('');
    }
  }, [filterDisc, catalogDisciplineNames]);

  useEffect(() => {
    const names = examBoards.map((b) => b.nome);
    if (filterBanca && !names.includes(filterBanca)) {
      setFilterBanca('');
    }
  }, [filterBanca, examBoards]);

  const loadTodayStats = useCallback(async () => {
    if (!currentUserId) {
      setTodayStats({ resolved: 0, accuracy: 0 });
      return;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('question_answers')
      .select('is_correct')
      .eq('user_id', currentUserId)
      .gte('answered_at', startOfToday.toISOString());

    if (error) {
      console.error('[Questoes] erro ao carregar estatísticas de questões:', error);
      return;
    }

    const resolved = Array.isArray(data) ? data.length : 0;
    const correct = Array.isArray(data) ? data.filter((item) => Boolean(item?.is_correct)).length : 0;
    setTodayStats({
      resolved,
      accuracy: resolved > 0 ? Math.round((correct / resolved) * 100) : 0,
    });
  }, [currentUserId]);

  useEffect(() => {
    loadTodayStats();
  }, [loadTodayStats]);
  const canonicalHistory = useMemo(
    () => buildCanonicalHistory(historicoReal, subjectCatalog),
    [historicoReal, subjectCatalog]
  );
  const historyOverview = useMemo(() => buildStudyHistoryOverview(canonicalHistory), [canonicalHistory]);

  const questionsToday  = todayStats.resolved;
  const questionAccuracy = todayStats.accuracy;
  const DAILY_LIMIT = 10;
  const questionsLimitReached = !isPremium && questionsToday >= DAILY_LIMIT;

  const questionsRecommendation = studyRecommendation?.ranked?.find((item) => item?.studyMode === 'questoes') || null;
  // Use Supabase data when available, fall back to QUESTION_BANK only while loading
  const allQuestions = useMemo(
    () => (dbQuestions.length > 0 ? dbQuestions : (dbLoading ? [] : QUESTION_BANK)),
    [dbLoading, dbQuestions]
  );
  const activeCaderno = cadernos.find((caderno) => caderno.id === activeCadernoId) || null;
  const activeCadernoQuestionIds = useMemo(
    () => new Set((activeCaderno?.questionIds || []).map((id) => String(id))),
    [activeCaderno]
  );
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((item) => {
      if (activeCaderno && !activeCadernoQuestionIds.has(String(item.id))) return false;
      if (filterDisc && item.disciplina !== filterDisc) return false;
      if (filterBanca && item.banca !== filterBanca) return false;
      if (filterDif && item.dificuldade && item.dificuldade !== filterDif) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.disciplina.toLowerCase().includes(q) ||
        item.topico.toLowerCase().includes(q) ||
        item.statement.toLowerCase().includes(q)
      );
    });
  }, [activeCaderno, activeCadernoQuestionIds, allQuestions, filterBanca, filterDif, filterDisc, query]);
  const activeFiltersCount = [filterDisc, filterBanca, filterDif].filter((value) => String(value || '').trim().length > 0).length;
  const hasFiveOptionQuestion = useMemo(
    () => filteredQuestions.some((question) => Array.isArray(question?.options) && question.options.length >= 5),
    [filteredQuestions]
  );
  const currentQuestion = filteredQuestions[currentQuestionIndex] || null;

  useEffect(() => {
    const firstFiveOptionIndex = filteredQuestions.findIndex(
      (question) => Array.isArray(question?.options) && question.options.length >= 5
    );
    setCurrentQuestionIndex(firstFiveOptionIndex >= 0 ? firstFiveOptionIndex : 0);
  }, [query, filterDisc, filterBanca, filterDif, filteredQuestions]);

  useEffect(() => {
    if (filteredQuestions.length === 0) {
      setCurrentQuestionIndex(0);
      return;
    }
    if (currentQuestionIndex >= filteredQuestions.length) {
      setCurrentQuestionIndex(0);
    }
  }, [filteredQuestions.length, currentQuestionIndex]);

  return (
    <div className="pl-page" style={{ height: '100%', overflow: 'hidden' }}>
      <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end', flexShrink: 0 }}>
        <div>
          <h1 className="pl-display" style={{ margin: 0, fontSize: 44, color: 'var(--pl-ink)' }}>
            Banco de questões<span style={{ color: 'var(--pl-accent)' }}>.</span>
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 580, lineHeight: 1.5 }}>
            Monte cadernos por matéria, tópico e quantidade, ou resolva questões soltas no modo livre.
          </p>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>Meta do dia</span>
            {isEditingMeta ? (
              <input
                type="number"
                min={1}
                autoFocus
                style={{ width: 64, borderRadius: 6, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '3px 8px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', outline: 'none', fontFamily: 'var(--pl-sans)' }}
                value={metaDiariaQuestoes}
                onChange={(e) => setMetaDiariaQuestoes(Number(e.target.value))}
                onBlur={() => setIsEditingMeta(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingMeta(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingMeta(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 6, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '3px 10px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', cursor: 'pointer', fontFamily: 'var(--pl-sans)' }}
              >
                <span>{questionsToday}</span>
                <span style={{ color: 'var(--pl-ink-3)' }}>/</span>
                <span>{metaDiariaQuestoes}</span>
                <Edit3 size={12} style={{ color: 'var(--pl-ink-3)' }} />
              </button>
            )}
            <span style={{ fontSize: 11, color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>resolvidas · clique para editar</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <QStatTile label="Taxa hoje" value={`${questionAccuracy}%`} />
            <QStatTile label="No histórico" value={String(historyOverview.totalQuestions)} />
            <QStatTile label="Acurácia" value={`${historyOverview.overallAccuracy}%`} />
            <QStatTile label="Tempo" value={historyOverview.totalMinutesLabel} />
          </div>
          <button
            type="button"
            onClick={() => setRegistroEstudoModalOpen?.(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, border: 'none', background: 'var(--pl-accent)', color: 'white', padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pl-sans)' }}
          >
            <Play size={13} fill="currentColor" />
            Registrar estudo
          </button>
        </div>
      </header>

      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)', borderRadius: 12, padding: '10px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pl-ink-3)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Palavras-chave, lei, artigo, código..."
              style={{ width: '100%', borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg)', padding: '7px 12px 7px 36px', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink)', outline: 'none', fontFamily: 'var(--pl-sans)', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setCadernoBuilderOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', color: 'var(--pl-ink)', padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--pl-sans)' }}
            >
              <ClipboardList size={14} />
              Montar caderno
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', color: 'var(--pl-ink)', padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pl-sans)' }}
            >
              <SlidersHorizontal size={14} />
              Filtros
              {activeFiltersCount > 0 && (
                <span style={{ borderRadius: 99, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg)', padding: '1px 6px', fontSize: 10, fontWeight: 700, color: 'var(--pl-accent)' }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCadernoId('');
                if (questionsRecommendation) {
                  onStartRecommendedSession?.(questionsRecommendation);
                  return;
                }
                setRegistroEstudoModalOpen?.(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, border: 'none', background: 'var(--pl-accent)', color: 'white', padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pl-sans)' }}
            >
              Iniciar modo livre
              <Play size={13} />
            </button>
            {(activeFiltersCount > 0 || activeCaderno) && (
              <button
                type="button"
                onClick={() => { setFilterDisc(''); setFilterBanca(''); setFilterDif(''); setActiveCadernoId(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-2)', padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pl-sans)' }}
              >
                <X size={13} />
                Limpar
              </button>
            )}
          </div>
        </div>
        <QuestionNotebookShelf
          cadernos={cadernos}
          activeCadernoId={activeCadernoId}
          onSelect={(id) => {
            setActiveCadernoId(id);
            setCurrentQuestionIndex(0);
          }}
          onCreate={() => setCadernoBuilderOpen(true)}
          onDelete={(id) => {
            setCadernos((prev) => prev.filter((item) => item.id !== id));
            if (activeCadernoId === id) setActiveCadernoId('');
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, flex: 1 }}>
          {dbLoading && (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--pl-accent)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>Carregando questões...</span>
            </div>
          )}
          {!dbLoading && filteredQuestions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--pl-ink-3)' }}>
              <BookOpen size={32} style={{ marginBottom: 12, opacity: 0.35, color: 'var(--pl-ink-3)' }} />
              <p className="pl-eyebrow" style={{ marginBottom: 6 }}>
                {filteredQuestions.length === 0 && dbQuestions.length > 0 ? 'Sem resultados' : 'Banco vazio'}
              </p>
              <p style={{ fontSize: 13, maxWidth: 320, margin: '0 auto' }}>
                {filteredQuestions.length === 0 && dbQuestions.length > 0
                  ? 'Nenhuma questão corresponde aos filtros atuais. Tente ajustar a busca.'
                  : 'Nenhuma questão disponível. Importe questões para começar a praticar.'}
              </p>
            </div>
          )}
          {questionsLimitReached && (
            <div style={{ marginBottom: 12 }}>
              <PremiumGate
                locked
                mode="banner"
                feature="questions_daily"
                used={questionsToday}
                limit={DAILY_LIMIT}
                onUpgrade={onUpgrade}
              />
            </div>
          )}
          {!dbLoading && currentQuestion && !questionsLimitReached ? (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
              <InteractiveQuestionCard
                key={currentQuestion.id}
                question={currentQuestion}
                currentUserId={currentUserId}
                onAnswered={loadTodayStats}
                onNextQuestion={() => {
                  if (filteredQuestions.length <= 1) return;
                  setCurrentQuestionIndex((prev) => (prev + 1) % filteredQuestions.length);
                }}
              />
              {!hasFiveOptionQuestion ? (
                <p style={{ marginTop: 4, flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>
                  Dica: não há questão A-E neste resultado; ajuste os filtros se quiser esse formato.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {filtersOpen ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,17,13,0.55)', padding: '0 16px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)', borderRadius: 16, padding: '20px 24px', width: '100%', maxWidth: 680 }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)', margin: 0 }}>Filtro de questões</p>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--pl-ink)', margin: '4px 0 0', fontFamily: 'var(--pl-sans)' }}>Refinar banco de questões</h3>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-3)', cursor: 'pointer' }}
                aria-label="Fechar filtros"
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ marginBottom: 12, fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>
              Disciplina e banca são escolhas do cadastro da plataforma (catálogo padrão de disciplinas e catálogo de
              bancas). Listas vazias somem após o administrador incluir registros.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }} htmlFor="questoes-filter-disciplina">
                  Disciplina
                </label>
                <select
                  id="questoes-filter-disciplina"
                  style={{ borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg)', padding: '8px 12px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', outline: 'none', fontFamily: 'var(--pl-sans)', width: '100%' }}
                  value={filterDisc}
                  onChange={(e) => setFilterDisc(e.target.value)}
                >
                  <option value="">Todas as disciplinas</option>
                  {catalogDisciplineNames.length === 0 ? (
                    <option value="__catalogo_vazio__" disabled>
                      Nenhuma disciplina cadastrada no catálogo
                    </option>
                  ) : (
                    catalogDisciplineNames.map((nome) => (
                      <option key={nome} value={nome}>
                        {nome}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }} htmlFor="questoes-filter-banca">
                  Banca
                </label>
                <select
                  id="questoes-filter-banca"
                  style={{ borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg)', padding: '8px 12px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', outline: 'none', fontFamily: 'var(--pl-sans)', width: '100%' }}
                  value={filterBanca}
                  onChange={(e) => setFilterBanca(e.target.value)}
                >
                  <option value="">Todas as bancas</option>
                  {examBoards.length === 0 ? (
                    <option value="__bancas_vazio__" disabled>
                      Nenhuma banca cadastrada ainda
                    </option>
                  ) : (
                    examBoards.map((board) => (
                      <option key={board.id} value={board.nome}>
                        {board.nome}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }} htmlFor="questoes-filter-nivel">
                  Nível
                </label>
                <select
                  id="questoes-filter-nivel"
                  style={{ borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg)', padding: '8px 12px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', outline: 'none', fontFamily: 'var(--pl-sans)', width: '100%' }}
                  value={filterDif}
                  onChange={(e) => setFilterDif(e.target.value)}
                >
                  <option value="">Todos os níveis</option>
                  <option value="Facil">Fácil</option>
                  <option value="Media">Média</option>
                  <option value="Dificil">Difícil</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setFilterDisc('');
                  setFilterBanca('');
                  setFilterDif('');
                }}
                className="pl-btn pl-btn-ghost"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="pl-btn pl-btn-primary"
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cadernoBuilderOpen ? (
        <QuestionNotebookBuilder
          allQuestions={allQuestions}
          courseOptions={courseOptions}
          disciplineOptions={disciplineOptions}
          examBoards={examBoards}
          selectedCoursePlan={selectedCoursePlan}
          onClose={() => setCadernoBuilderOpen(false)}
          onCreate={(caderno) => {
            setCadernos((prev) => [caderno, ...prev].slice(0, 12));
            setActiveCadernoId(caderno.id);
            setCurrentQuestionIndex(0);
            setCadernoBuilderOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function InteractiveQuestionCard({ question, currentUserId = '', onAnswered, onNextQuestion }) {
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const selectedOption = question.options.find((option) => option.id === selectedOptionId) || null;
  const wasCorrect = submitted && Boolean(selectedOption?.isCorrect);

  const resetQuestion = () => {
    setSelectedOptionId('');
    setSubmitted(false);
    setStartedAt(Date.now());
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        height: '100%',
        minHeight: 0,
        maxHeight: '100%',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 16,
        background: 'var(--pl-surface)',
        boxShadow: submitted ? 'var(--pl-sh-mid)' : 'var(--pl-sh-low)',
        border: `1px solid ${submitted ? (wasCorrect ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)') : 'var(--pl-rule)'}`,
        transition: 'box-shadow 0.3s',
      }}
    >
      {submitted ? (
        <div style={{
          position: 'absolute', right: 0, top: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 4,
          borderBottomLeftRadius: 10, padding: '2px 12px',
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em',
          color: 'white',
          boxShadow: 'var(--pl-sh-low)',
          background: wasCorrect ? 'var(--pl-success)' : 'var(--pl-danger)',
        }}>
          {wasCorrect ? <CheckCircle2 size={12} /> : <X size={12} />}
          {wasCorrect ? 'Correta' : 'Incorreta'}
        </div>
      ) : null}

      <div style={{
        flexShrink: 0, borderBottom: `1px solid ${submitted ? (wasCorrect ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)') : 'var(--pl-rule)'}`,
        padding: '8px 16px',
        background: submitted ? (wasCorrect ? 'rgba(var(--pl-success-soft-rgb, 209,250,229),0.3)' : 'rgba(var(--pl-danger-soft-rgb, 254,226,226),0.3)') : 'var(--pl-bg-soft)',
      }}>
        <div style={{ display: 'flex', minWidth: 0, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', minWidth: 0, flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <span style={{
              flexShrink: 0, borderRadius: 6, padding: '2px 8px',
              fontSize: 11, fontWeight: 600, fontFamily: 'var(--pl-sans)',
              background: submitted ? (wasCorrect ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)') : 'var(--pl-accent-soft)',
              color: 'var(--pl-ink)',
            }}>
              {question.id}
            </span>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>
              {question.disciplina}
            </span>
            <ChevronRight size={12} style={{ flexShrink: 0, color: 'var(--pl-rule-strong)' }} />
            <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>{question.topico}</span>
          </div>

          <div style={{ display: 'flex', flexShrink: 0, gap: 6 }}>
            <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderRadius: 4, border: '1px solid var(--pl-rule-2)', padding: '2px 6px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>
              {question.banca}
            </span>
            <span style={{ borderRadius: 4, border: '1px solid var(--pl-rule-2)', padding: '2px 6px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>{question.ano}</span>
          </div>
        </div>
      </div>

      <div style={{ minHeight: 0, flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '8px 16px 12px' }}>
        <p style={{ marginBottom: 12, fontSize: 14, fontWeight: 500, lineHeight: 1.55, color: 'var(--pl-ink-2)', fontFamily: 'var(--pl-sans)' }}>{question.statement}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {question.options.map((option) => (
            <AnswerOption
              key={option.id}
              label={option.id}
              text={option.label}
              selected={selectedOptionId === option.id}
              submitted={submitted}
              isCorrect={option.isCorrect}
              isWrongSelection={submitted && selectedOptionId === option.id && !option.isCorrect}
              onClick={() => {
                if (submitted) return;
                setSelectedOptionId(option.id);
              }}
            />
          ))}
        </div>

        {submitted ? (
          <div className="pl-gabarito-reveal" style={{
            marginTop: 12, borderRadius: 8, padding: 12,
            border: `1px solid ${wasCorrect ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)'}`,
            background: wasCorrect ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)',
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: wasCorrect ? 'var(--pl-success)' : 'var(--pl-danger)', fontFamily: 'var(--pl-sans)' }}>
              Comentario
            </p>
            <p style={{ marginTop: 4, fontSize: 12, fontWeight: 500, lineHeight: 1.55, color: 'var(--pl-ink-2)', fontFamily: 'var(--pl-sans)' }}>{question.explanation}</p>
          </div>
        ) : null}
      </div>

      <div style={{
        flexShrink: 0,
        borderTop: `1px solid ${submitted ? (wasCorrect ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)') : 'var(--pl-rule)'}`,
        padding: '8px 16px',
        background: submitted ? (wasCorrect ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)') : 'var(--pl-bg-soft)',
      }}>
        <div style={{ display: 'flex', width: '100%', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          {submitted ? (
            <button type="button" onClick={resetQuestion} className="pl-btn pl-btn-ghost pl-btn-sm">
              Tentar novamente
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              if (!submitted && selectedOptionId) {
                setSubmitted(true);

                if (currentUserId) {
                  const tempoSegundos = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
                  submitAnswer(currentUserId, {
                    question_id: question.id,
                    resposta: selectedOptionId,
                    is_correct: Boolean(selectedOption?.isCorrect),
                    tempo_segundos: tempoSegundos,
                  })
                    .then(() => onAnswered?.())
                    .catch((error) => console.error('[Questoes] erro ao salvar resposta da questão:', error));
                }
                return;
              }

              resetQuestion();
              onNextQuestion?.();
            }}
            disabled={!submitted && !selectedOptionId}
            className="pl-btn pl-btn-primary pl-btn-sm"
            style={(!submitted && !selectedOptionId) ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          >
            {submitted ? 'Proxima questao' : 'Responder'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnswerOption({ label, text, selected = false, submitted = false, isCorrect = false, isWrongSelection = false, onClick }) {
  let containerStyle;
  let markerStyle;
  let textColor;

  if (submitted && isCorrect) {
    containerStyle = { border: '2px solid var(--pl-success)', background: 'var(--pl-success-soft)' };
    markerStyle = { border: '2px solid var(--pl-success)', background: 'var(--pl-success)', color: 'white' };
    textColor = 'var(--pl-success)';
  } else if (submitted && isWrongSelection) {
    containerStyle = { border: '2px solid var(--pl-danger)', background: 'var(--pl-danger-soft)' };
    markerStyle = { border: '2px solid var(--pl-danger)', background: 'var(--pl-danger)', color: 'white' };
    textColor = 'var(--pl-danger)';
  } else if (selected) {
    containerStyle = { border: '2px solid var(--pl-accent)', background: 'var(--pl-accent-soft)' };
    markerStyle = { border: '2px solid var(--pl-accent)', background: 'var(--pl-accent)', color: 'white' };
    textColor = 'var(--pl-ink)';
  } else {
    containerStyle = { border: '2px solid var(--pl-rule-2)', background: 'transparent' };
    markerStyle = { border: '2px solid var(--pl-rule-strong)', background: 'transparent', color: 'var(--pl-ink-3)' };
    textColor = 'var(--pl-ink-2)';
  }

  return (
    <button type="button" onClick={onClick} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, borderRadius: 10, padding: '8px 10px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--pl-sans)', ...containerStyle }}>
      <div style={{ display: 'flex', height: 28, width: 28, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: 12, fontWeight: 600, ...markerStyle }}>
        {submitted && isCorrect ? <Check size={14} strokeWidth={3} /> : submitted && isWrongSelection ? <X size={14} strokeWidth={3} /> : label}
      </div>
      <span style={{ minWidth: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: textColor }}>{text}</span>
    </button>
  );
}

function QStatTile({ label, value }) {
  return (
    <div style={{ background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule-2)', borderRadius: 8, padding: '10px 14px', minWidth: 78 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--pl-ink-3)', lineHeight: 1, fontFamily: 'var(--pl-sans)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: 26, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--pl-ink)', marginTop: 4 }}>
        {value}<span style={{ color: 'var(--pl-accent)' }}>.</span>
      </div>
    </div>
  );
}

function QuestionNotebookShelf({ cadernos, activeCadernoId, onSelect, onCreate, onDelete }) {
  if (!Array.isArray(cadernos) || cadernos.length === 0) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 8, border: '1px dashed var(--pl-rule-strong)', background: 'var(--pl-bg-soft)', padding: '8px 12px' }}>
        <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 8 }}>
          <BookOpen size={15} style={{ flexShrink: 0, color: 'var(--pl-accent)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)', fontFamily: 'var(--pl-sans)' }}>
            Nenhum caderno criado ainda. Monte um bloco por disciplina, topico e quantidade.
          </span>
        </div>
        <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" onClick={onCreate}>
          <Plus size={13} />
          Novo caderno
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minWidth: 0, gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
      {cadernos.map((caderno) => {
        const isActive = caderno.id === activeCadernoId;
        return (
          <div
            key={caderno.id}
            style={{
              display: 'flex', minWidth: 220, alignItems: 'center', justifyContent: 'space-between', gap: 8,
              borderRadius: 8, padding: '8px',
              border: isActive ? '1px solid var(--pl-accent)' : '1px solid var(--pl-rule-2)',
              background: isActive ? 'var(--pl-accent-soft)' : 'var(--pl-bg-soft)',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <button
              type="button"
              onClick={() => onSelect?.(isActive ? '' : caderno.id)}
              style={{ minWidth: 0, flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 700, color: 'var(--pl-ink)', fontFamily: 'var(--pl-sans)' }}>{caderno.title}</span>
              <span style={{ display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>
                {caderno.questionIds?.length || 0} questões · {caderno.plano || 'Plano livre'}
              </span>
            </button>
            <button
              type="button"
              aria-label={`Excluir caderno ${caderno.title}`}
              onClick={() => onDelete?.(caderno.id)}
              style={{ display: 'inline-flex', height: 28, width: 28, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-ink-3)', transition: 'color 0.15s, background 0.15s' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
      <button type="button" className="pl-btn pl-btn-ghost" style={{ minWidth: 150, fontSize: 12 }} onClick={onCreate}>
        <Plus size={13} />
        Criar outro
      </button>
    </div>
  );
}

function QuestionNotebookBuilder({
  allQuestions,
  courseOptions,
  disciplineOptions,
  examBoards,
  selectedCoursePlan,
  onClose,
  onCreate,
}) {
  const defaultPlan = selectedCoursePlan && selectedCoursePlan !== 'Todos' ? selectedCoursePlan : courseOptions[0] || '';
  const [title, setTitle] = useState('');
  const [plano, setPlano] = useState(defaultPlan);
  const [banca, setBanca] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [rules, setRules] = useState(() => [
    { id: `rule-${Date.now()}`, disciplina: '', topico: '', quantidade: 10 },
  ]);

  const scopedDisciplines = useMemo(() => {
    if (!plano) return disciplineOptions;
    const scoped = disciplineOptions.filter((disciplina) => !disciplina.plano || disciplina.plano === plano);
    return scoped.length > 0 ? scoped : disciplineOptions;
  }, [disciplineOptions, plano]);

  const estimatedQuestions = useMemo(
    () => buildNotebookQuestions(allQuestions, { rules, banca, difficulty }).length,
    [allQuestions, rules, banca, difficulty]
  );

  const totalRequested = rules.reduce((acc, rule) => acc + Math.max(0, Number(rule.quantidade || 0)), 0);

  const updateRule = (id, patch) => {
    setRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule))
    );
  };

  const removeRule = (id) => {
    setRules((prev) => (prev.length > 1 ? prev.filter((rule) => rule.id !== id) : prev));
  };

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      { id: `rule-${Date.now()}-${prev.length}`, disciplina: '', topico: '', quantidade: 10 },
    ]);
  };

  const handleCreate = () => {
    const questionIds = buildNotebookQuestions(allQuestions, { rules, banca, difficulty }).map((question) => question.id);
    if (questionIds.length === 0) return;
    const normalizedTitle = title.trim() || `Caderno ${new Date().toLocaleDateString('pt-BR')}`;
    onCreate?.({
      id: `caderno-${Date.now()}`,
      title: normalizedTitle,
      plano,
      banca,
      difficulty,
      rules: rules.map((rule) => ({
        disciplina: rule.disciplina,
        topico: rule.topico,
        quantidade: Math.max(1, Number(rule.quantidade || 1)),
      })),
      questionIds,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(20,17,13,0.70)', padding: 0, backdropFilter: 'blur(4px)' }}>
      <div style={{ maxHeight: '92vh', width: '100%', maxWidth: 960, overflow: 'hidden', borderRadius: '16px 16px 0 0', border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', boxShadow: 'var(--pl-sh-high)' }} role="dialog" aria-modal="true">
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid var(--pl-rule)', padding: '16px 24px' }}>
          <div>
            <p className="pl-eyebrow" style={{ margin: 0 }}>Caderno de questões</p>
            <h2 className="pl-display" style={{ marginTop: 4, fontSize: 28, color: 'var(--pl-ink)' }}>Montar treino personalizado.</h2>
            <p style={{ marginTop: 8, maxWidth: 560, fontSize: 14, fontWeight: 500, lineHeight: 1.55, color: 'var(--pl-ink-2)', fontFamily: 'var(--pl-sans)' }}>
              Dê um título, vincule ao plano e distribua a quantidade de questões por disciplina e tópico.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ display: 'inline-flex', height: 36, width: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', color: 'var(--pl-ink-3)', cursor: 'pointer', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </header>

        <div style={{ maxHeight: 'calc(92vh - 150px)', overflowY: 'auto', padding: '16px 24px' }}>
          <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.8fr 0.7fr', gap: 12 }}>
            <NotebookField label="Titulo do caderno">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex: Portugues + Constitucional" />
            </NotebookField>
            <NotebookField label="Plano de estudos">
              <select value={plano} onChange={(event) => setPlano(event.target.value)}>
                <option value="">Plano livre</option>
                {courseOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </NotebookField>
            <NotebookField label="Banca">
              <select value={banca} onChange={(event) => setBanca(event.target.value)}>
                <option value="">Todas</option>
                {examBoards.map((board) => <option key={board.id} value={board.nome}>{board.nome}</option>)}
              </select>
            </NotebookField>
            <NotebookField label="Nivel">
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                <option value="">Todos</option>
                <option value="Facil">Facil</option>
                <option value="Media">Media</option>
                <option value="Dificil">Dificil</option>
              </select>
            </NotebookField>
          </section>

          <section style={{ marginTop: 16, borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 12 }}>
            <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <p className="pl-eyebrow" style={{ margin: 0 }}>Blocos do caderno</p>
                <h3 style={{ marginTop: 4, fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)', fontFamily: 'var(--pl-sans)' }}>Quantidade por disciplina e topico</h3>
              </div>
              <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" onClick={addRule}>
                <Plus size={13} />
                Adicionar bloco
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rules.map((rule, index) => {
                const selectedDiscipline = disciplineOptions.find((disciplina) => disciplina.nome === rule.disciplina);
                const topicOptions = (selectedDiscipline?.topicos || [])
                  .map((topic) => String(topic?.nome || topic?.title || topic || '').trim())
                  .filter(Boolean);
                return (
                  <div key={rule.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px 36px', gap: 8, borderRadius: 8, border: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: 8 }}>
                    <NotebookField label={`Disciplina ${index + 1}`}>
                      <select value={rule.disciplina} onChange={(event) => updateRule(rule.id, { disciplina: event.target.value, topico: '' })}>
                        <option value="">Todas as disciplinas</option>
                        {scopedDisciplines.map((disciplina) => (
                          <option key={`${disciplina.plano}-${disciplina.id}-${disciplina.nome}`} value={disciplina.nome}>
                            {disciplina.nome}
                          </option>
                        ))}
                      </select>
                    </NotebookField>
                    <NotebookField label="Topico">
                      <select value={rule.topico} onChange={(event) => updateRule(rule.id, { topico: event.target.value })}>
                        <option value="">Todos os topicos</option>
                        {topicOptions.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                      </select>
                    </NotebookField>
                    <NotebookField label="Qtd.">
                      <input type="number" min={1} max={100} value={rule.quantidade} onChange={(event) => updateRule(rule.id, { quantidade: Number(event.target.value) || 1 })} />
                    </NotebookField>
                    <button type="button" aria-label="Remover bloco" onClick={() => removeRule(rule.id)} style={{ marginTop: 20, display: 'inline-flex', height: 36, width: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--pl-rule)', background: 'var(--pl-surface)', color: 'var(--pl-ink-3)', cursor: 'pointer', transition: 'color 0.15s' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <NotebookSummaryTile Icon={Target} label="Solicitadas" value={String(totalRequested)} />
            <NotebookSummaryTile Icon={Layers3} label="Encontradas" value={String(estimatedQuestions)} />
            <NotebookSummaryTile Icon={BookOpen} label="Blocos" value={String(rules.length)} />
          </section>
        </div>

        <footer style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--pl-rule)', padding: '16px 24px' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>
            Seus cadernos ficam salvos neste dispositivo para acesso rápido e offline.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="pl-btn pl-btn-ghost" onClick={onClose}>Cancelar</button>
            <button
              type="button"
              className="pl-btn pl-btn-primary"
              disabled={estimatedQuestions === 0}
              style={estimatedQuestions === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              onClick={handleCreate}
            >
              <Play size={13} />
              Gerar e iniciar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function NotebookField({ label, children }) {
  return (
    <label style={{ display: 'flex', minWidth: 0, flexDirection: 'column', gap: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>
      {label}
      {React.cloneElement(children, {
        style: {
          ...(children.props.style || {}),
          width: '100%', borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)',
          padding: '8px 12px', fontSize: 13, fontWeight: 600, letterSpacing: 'normal', textTransform: 'none',
          color: 'var(--pl-ink)', outline: 'none', fontFamily: 'var(--pl-sans)', transition: 'border-color 0.15s',
          boxSizing: 'border-box',
        },
      })}
    </label>
  );
}

function NotebookSummaryTile({ Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 12 }}>
      <div style={{ display: 'flex', height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' }}>
        <Icon size={17} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>{label}</div>
        <div className="pl-num" style={{ fontSize: 24, color: 'var(--pl-ink)' }}>{value}<span style={{ color: 'var(--pl-accent)' }}>.</span></div>
      </div>
    </div>
  );
}

function buildNotebookQuestions(allQuestions, { rules, banca, difficulty }) {
  const selected = [];
  const usedIds = new Set();
  const questions = Array.isArray(allQuestions) ? allQuestions : [];

  for (const rule of rules) {
    const quantity = Math.max(1, Number(rule.quantidade || 1));
    const matches = questions.filter((question) => {
      if (usedIds.has(String(question.id))) return false;
      if (rule.disciplina && question.disciplina !== rule.disciplina) return false;
      if (rule.topico && question.topico !== rule.topico) return false;
      if (banca && question.banca !== banca) return false;
      if (difficulty && question.dificuldade && question.dificuldade !== difficulty) return false;
      return true;
    });

    for (const question of matches.slice(0, quantity)) {
      usedIds.add(String(question.id));
      selected.push(question);
    }
  }

  return selected;
}

