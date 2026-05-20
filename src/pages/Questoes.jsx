import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Flag,
  Folder,
  ListChecks,
  MessageSquare,
  Play,
  Search,
  Settings,
  SlidersHorizontal,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { buildCanonicalHistory, buildStudyHistoryOverview } from '../lib/studyAnalytics';
import PageHeadPremium, {
  PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS,
  PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS,
  PageHeadPremiumBadge,
} from '../components/PageHeadPremium';
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

// Keep a small fallback so the bank section doesn't look empty on first load
const QUESTION_BANK = [
  {
    id: 'Q15024',
    disciplina: 'Direito Constitucional',
    topico: 'Direitos e Garantias Fundamentais',
    banca: 'CESPE/CEBRASPE',
    ano: '2024',
    statement:
      'Segundo a Constituicao da Republica Federativa do Brasil de 1988, a criacao de associacoes independe de autorizacao estatal, sendo vedada a interferencia em seu funcionamento.',
    options: [
      { id: 'C', label: 'Certo', isCorrect: true },
      { id: 'E', label: 'Errado', isCorrect: false },
    ],
    explanation:
      'A afirmacao esta correta. O art. 5o, XVIII, protege a criacao de associacoes sem autorizacao previa e veda interferencia estatal no funcionamento.',
  },
  {
    id: 'Q08392',
    disciplina: 'Lingua Portuguesa',
    topico: 'Concordancia Verbal',
    banca: 'FCC',
    ano: '2023',
    statement: 'Assinale a alternativa em que ha erro de concordancia verbal, de acordo com a norma-padrao.',
    options: [
      { id: 'A', label: 'Alugam-se apartamentos nesta regiao.', isCorrect: false },
      { id: 'B', label: 'Faziam dez anos que nao nos viamos.', isCorrect: true },
      { id: 'C', label: 'Existem boas razoes para revisar o edital.', isCorrect: false },
      { id: 'D', label: 'Precisam-se de analistas para o setor.', isCorrect: false },
      { id: 'E', label: 'Havia candidatos suficientes para a segunda fase.', isCorrect: false },
    ],
    explanation:
      'O erro esta em "Faziam dez anos". O verbo fazer, indicando tempo decorrido, fica no singular: "Fazia dez anos".',
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
  const [dbLoading, setDbLoading]     = useState(true);
  const [todayStats, setTodayStats]   = useState({ resolved: 0, accuracy: 0 });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDisc, setFilterDisc]   = useState('');
  const [filterBanca, setFilterBanca] = useState('');
  const [filterDif, setFilterDif]     = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [examBoards, setExamBoards] = useState([]);

  const catalogDisciplineNames = useMemo(() => {
    const list = Array.isArray(subjectCatalog) ? subjectCatalog : [];
    return [...list]
      .map((entry) => String(entry?.nome || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [subjectCatalog]);

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
    } catch (error) {
      console.warn('Falha ao carregar questoes com is_active. Tentando fallback legado.', error);
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
      console.error('Erro ao carregar stats de questoes:', error);
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

  const questionsToday = todayStats.resolved;
  const questionAccuracy = todayStats.accuracy;

  const questionsRecommendation = studyRecommendation?.ranked?.find((item) => item?.studyMode === 'questoes') || null;
  // Use Supabase data when available, fall back to QUESTION_BANK only while loading
  const allQuestions = dbQuestions.length > 0 ? dbQuestions : (dbLoading ? [] : QUESTION_BANK);
  const filteredQuestions = allQuestions.filter((item) => {
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
    <div className="page-shell flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden !pb-2 !pt-3 animate-in fade-in duration-500 lg:gap-2.5 sm:!pt-4">
      <PageHeadPremium
        className="shrink-0 gap-4 lg:!flex-row lg:!items-stretch lg:!justify-between xl:!items-center"
        icon={ListChecks}
        badge={<PageHeadPremiumBadge icon={Target}>Banco inteligente</PageHeadPremiumBadge>}
        title="Banco de questões"
        subtitle="Catálogo da plataforma, filtros e métricas do seu histórico — meta do dia ajustável abaixo."
        leadingClassName="min-w-0 shrink-0 lg:max-w-[26rem] xl:max-w-[28rem]"
        leadingExtra={(
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">Meta do dia</span>
            {isEditingMeta ? (
              <input
                type="number"
                min={1}
                autoFocus
                className="w-16 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40"
                value={metaDiariaQuestoes}
                onChange={(e) => setMetaDiariaQuestoes(Number(e.target.value))}
                onBlur={() => setIsEditingMeta(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingMeta(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingMeta(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-ink-100 transition hover:bg-white/15"
              >
                <span className="tabular-nums">{questionsToday}</span>
                <span className="text-ink-500">/</span>
                <span className="tabular-nums">{metaDiariaQuestoes}</span>
                <Edit3 size={12} className="text-ink-400" aria-hidden />
              </button>
            )}
            <span className="text-[10px] text-ink-500">resolvidas · clique para editar a meta</span>
          </div>
        )}
        statsStackBelowTrailing
        statsDense
        statGridClassName="grid min-h-0 w-full min-w-0 shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2 [&>*]:min-w-0 [&>*]:self-stretch"
        trailingWrapClassName="lg:ml-auto lg:w-full lg:max-w-none xl:w-auto xl:max-w-[min(100%,48rem)] xl:shrink-0"
        stats={[
          {
            key: 'taxa',
            icon: BarChart2,
            label: 'Taxa hoje',
            value: `${questionAccuracy}%`,
            accent: 'emerald',
            valueClassName: '!text-emerald-200',
          },
          {
            key: 'hist',
            icon: Target,
            label: 'No histórico',
            value: String(historyOverview.totalQuestions),
            accent: 'indigo',
          },
          {
            key: 'acc',
            icon: CheckCircle2,
            label: 'Acurácia',
            value: `${historyOverview.overallAccuracy}%`,
            accent: 'blue',
            valueClassName: '!text-blue-200',
          },
          {
            key: 'time',
            icon: BarChart2,
            label: 'Tempo estudo',
            value: historyOverview.totalMinutesLabel,
            accent: 'orange',
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
            {questionsRecommendation ? (
              <button
                type="button"
                onClick={() => onStartRecommendedSession?.(questionsRecommendation)}
                className={`${PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS} w-full sm:w-auto`}
              >
                <Target size={14} aria-hidden />
                Bloco sugerido
              </button>
            ) : null}
          </div>
        )}
      />

      <div className="section-card relative z-10 shrink-0 !p-2.5 sm:!p-3 flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center sm:left-4">
              <Search className="text-gray-400" size={16} />
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Palavras-chave, lei, artigo, código..."
              className="w-full rounded-lg border border-ink-200 bg-ink-50 py-2 pl-10 pr-24 text-xs font-semibold text-ink-700 outline-none transition-all placeholder:font-medium placeholder:text-ink-400 hover:border-ink-300 focus:border-blue-700 focus:bg-white sm:pl-11 sm:text-sm"
            />

            <button type="button" className={buttonClass('primary', 'absolute inset-y-1 right-1 px-3 py-1 text-[10px] sm:text-xs')}>
              Buscar
            </button>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className={buttonClass('secondary', 'px-3 py-2 text-[11px] sm:text-xs')}
            >
              <SlidersHorizontal size={14} />
              Filtros
              {activeFiltersCount > 0 ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  {activeFiltersCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => {
                if (questionsRecommendation) {
                  onStartRecommendedSession?.(questionsRecommendation);
                  return;
                }
                setRegistroEstudoModalOpen?.(true);
              }}
              className={buttonClass('primary', 'px-3 py-2 text-[11px] sm:px-4 sm:text-xs')}
            >
              Iniciar modo livre
              <Play size={14} />
            </button>
            {activeFiltersCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setFilterDisc('');
                  setFilterBanca('');
                  setFilterDif('');
                }}
                className={buttonClass('secondary', 'px-3 py-2 text-[11px] sm:text-xs')}
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col pr-0.5">
          {dbLoading && (
            <div className="flex flex-1 items-center justify-center gap-2 py-4">
              <Loader2 size={18} className="animate-spin text-blue-500" />
              <span className="text-xs font-semibold text-ink-500">Carregando questões...</span>
            </div>
          )}
          {!dbLoading && filteredQuestions.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
              <p className="mb-2 text-2xl">📚</p>
              <h3 className="text-sm font-semibold text-ink-900 sm:text-base">
                {dbQuestions.length === 0 ? 'Nenhuma questão disponível' : 'Nenhuma questão encontrada'}
              </h3>
              <p className="mt-1 max-w-sm px-2 text-xs text-gray-500">
                {dbQuestions.length === 0
                  ? 'O banco online será populado pelo administrador; até lá você vê questões de demonstração.'
                  : 'Tente limpar filtros ou ampliar a busca.'}
              </p>
            </div>
          )}
          {!dbLoading && currentQuestion ? (
            <div className="flex min-h-0 flex-1 flex-col">
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
                <p className="mt-1 shrink-0 text-[10px] font-semibold text-ink-500 sm:text-xs">
                  Dica: não há questão A–E neste resultado; ajuste filtros se quiser esse formato.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-ink-200 bg-white p-4 shadow-xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Filtro de questoes</p>
                <h3 className="text-lg font-semibold text-ink-900">Refinar banco de questoes</h3>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:bg-ink-50"
                aria-label="Fechar filtros"
              >
                <X size={16} />
              </button>
            </div>

            <p className="mb-3 text-xs font-medium text-ink-500">
              Disciplina e banca são escolhas do cadastro da plataforma (catálogo padrão de disciplinas e catálogo de
              bancas). Listas vazias somem após o administrador incluir registros.
            </p>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-500" htmlFor="questoes-filter-disciplina">
                  Disciplina
                </label>
                <select
                  id="questoes-filter-disciplina"
                  className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2.5 text-sm font-semibold text-ink-700 outline-none focus:border-blue-400 focus:bg-white"
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
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-500" htmlFor="questoes-filter-banca">
                  Banca
                </label>
                <select
                  id="questoes-filter-banca"
                  className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2.5 text-sm font-semibold text-ink-700 outline-none focus:border-blue-400 focus:bg-white"
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
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-500" htmlFor="questoes-filter-nivel">
                  Nivel
                </label>
                <select
                  id="questoes-filter-nivel"
                  className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2.5 text-sm font-semibold text-ink-700 outline-none focus:border-blue-400 focus:bg-white"
                  value={filterDif}
                  onChange={(e) => setFilterDif(e.target.value)}
                >
                  <option value="">Todos os niveis</option>
                  <option value="Facil">Facil</option>
                  <option value="Media">Media</option>
                  <option value="Dificil">Dificil</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setFilterDisc('');
                  setFilterBanca('');
                  setFilterDif('');
                }}
                className={buttonClass('secondary', 'px-4 py-2.5 text-xs sm:text-sm')}
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className={buttonClass('primary', 'px-4 py-2.5 text-xs sm:text-sm')}
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
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
      className={`relative flex h-full min-h-0 max-h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-shadow duration-300 sm:rounded-2xl ${submitted ? (wasCorrect ? 'border border-emerald-200 shadow-md' : 'border border-rose-200 shadow-md') : 'border border-gray-100 hover:shadow-lg'}`}
    >
      {submitted ? (
        <div className={`absolute right-0 top-0 z-10 flex items-center gap-1 rounded-bl-lg px-3 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white shadow-sm sm:rounded-bl-xl sm:px-4 sm:py-1 sm:text-[10px] ${wasCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {wasCorrect ? <CheckCircle2 size={12} /> : <X size={12} />}
          {wasCorrect ? 'Correta' : 'Incorreta'}
        </div>
      ) : null}

      <div className={`shrink-0 border-b px-3 py-2 sm:px-4 sm:py-2.5 ${submitted ? (wasCorrect ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-rose-50/30') : 'border-gray-100 bg-gray-50/50'}`}>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-xs ${submitted ? (wasCorrect ? 'bg-emerald-100 text-ink-900' : 'bg-rose-100 text-ink-900') : 'bg-blue-100 text-ink-900'}`}>
              {question.id}
            </span>
            <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
              {question.disciplina}
            </span>
            <ChevronRight size={12} className="hidden shrink-0 text-gray-300 sm:inline sm:size-[14px]" />
            <span className="hidden max-w-[140px] truncate text-[10px] font-bold text-gray-500 sm:inline md:max-w-[220px]">{question.topico}</span>
          </div>

          <div className="flex shrink-0 gap-1.5">
            <span className="max-w-[100px] truncate rounded border border-gray-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400 sm:max-w-none sm:px-2 sm:text-[10px]">
              {question.banca}
            </span>
            <span className="rounded border border-gray-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400 sm:px-2 sm:text-[10px]">{question.ano}</span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 sm:px-4 sm:py-3">
        <p className="mb-3 text-sm font-medium leading-snug text-gray-700 sm:text-base sm:leading-relaxed">{question.statement}</p>

        <div className="flex flex-col gap-2 sm:gap-2.5">
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
          <div className={`mt-3 rounded-lg border p-2.5 sm:rounded-xl sm:p-3 ${wasCorrect ? 'border-emerald-100 bg-emerald-50' : 'border-rose-100 bg-rose-50'}`}>
            <p className={`text-[9px] font-semibold uppercase tracking-widest sm:text-[10px] ${wasCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
              Comentário
            </p>
            <p className="mt-1 text-xs font-medium leading-relaxed text-ink-700 sm:text-sm">{question.explanation}</p>
          </div>
        ) : null}
      </div>

      <div className={`shrink-0 border-t px-3 py-2 sm:px-4 sm:py-2.5 ${submitted ? (wasCorrect ? 'border-emerald-100 bg-emerald-50/50' : 'border-rose-100 bg-rose-50/50') : 'border-gray-100 bg-gray-50/50'}`}>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <InlineAction Icon={Bookmark} text="Salvar" />
          <InlineAction Icon={MessageSquare} text="Comentários" />
          <InlineAction Icon={BarChart2} text="Estatísticas" />
          <InlineReport />
        </div>

        <div className="mt-2 flex w-full flex-wrap items-center justify-end gap-2 sm:mt-0 sm:flex-nowrap sm:justify-between">
          {submitted ? (
            <button type="button" onClick={resetQuestion} className={buttonClass('secondary', 'order-2 w-full px-4 py-2 text-xs sm:order-1 sm:w-auto sm:py-2.5')}>
              Tentar novamente
            </button>
          ) : (
            <span className="order-2 hidden sm:inline sm:flex-1" />
          )}

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
                    .catch((error) => console.error('Erro ao salvar resposta da questao:', error));
                }
                return;
              }

              resetQuestion();
              onNextQuestion?.();
            }}
            disabled={!submitted && !selectedOptionId}
            className={buttonClass(
              'primary',
              'order-1 w-full px-4 py-2 text-xs disabled:cursor-not-allowed disabled:border-ink-200 disabled:bg-ink-100 disabled:text-ink-400 disabled:hover:border-ink-200 disabled:hover:bg-ink-100 disabled:hover:shadow-sm sm:order-2 sm:w-auto sm:py-2.5 sm:text-sm'
            )}
          >
            {submitted ? 'Próxima questão' : 'Responder'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterField({ label, options }) {
  return (
    <div className="flex flex-col">
      <label className="mb-2 ml-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</label>
      <select className="w-full cursor-pointer appearance-none rounded-xl border-2 border-transparent bg-gray-50 p-3.5 font-bold text-gray-700 outline-none transition-colors hover:border-gray-200 focus:border-blue-600">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function AnswerOption({ label, text, selected = false, submitted = false, isCorrect = false, isWrongSelection = false, onClick }) {
  let tone = 'border-gray-100 hover:border-blue-400 hover:bg-blue-50';
  let markerTone = 'border-gray-300 text-gray-400 group-hover/option:border-blue-500 group-hover/option:text-blue-600';
  let textTone = 'text-gray-600 group-hover/option:text-blue-900';

  if (submitted && isCorrect) {
    tone = 'border-emerald-500 bg-emerald-50';
    markerTone = 'border-emerald-500 bg-emerald-500 text-white';
    textTone = 'text-emerald-900';
  } else if (submitted && isWrongSelection) {
    tone = 'border-rose-500 bg-rose-50';
    markerTone = 'border-rose-500 bg-rose-500 text-white';
    textTone = 'text-rose-900';
  } else if (selected) {
    tone = 'border-blue-500 bg-blue-50';
    markerTone = 'border-blue-500 bg-blue-500 text-white';
    textTone = 'text-blue-900';
  }

  return (
    <button type="button" onClick={onClick} className={`group/option flex w-full items-center gap-2 rounded-lg border-2 p-2.5 text-left transition-all sm:gap-3 sm:rounded-xl sm:p-3 ${tone}`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold sm:h-8 sm:w-8 sm:text-sm ${markerTone}`}>
        {submitted && isCorrect ? <Check size={14} strokeWidth={3} /> : submitted && isWrongSelection ? <X size={14} strokeWidth={3} /> : label}
      </div>
      <span className={`min-w-0 text-xs font-semibold leading-snug sm:text-sm ${textTone}`}>{text}</span>
    </button>
  );
}

function InlineAction({ Icon, text }) {
  return (
    <button type="button" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-gray-500 transition-colors hover:bg-ink-100 hover:text-blue-700">
      {React.createElement(Icon, { size: 16 })}
      {text}
    </button>
  );
}

function InlineReport() {
  return (
    <button type="button" className="ml-1 flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500">
      <Flag size={14} />
      Reportar
    </button>
  );
}

function SidebarFolder({ Icon, iconWrap, title, subtitle }) {
  return (
    <div className="group flex cursor-pointer items-center justify-between rounded-xl border border-transparent p-3 transition-all hover:border-blue-100 hover:bg-blue-50">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg shadow-sm group-hover:bg-white ${iconWrap}`}>
          {React.createElement(Icon, { size: 18 })}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 group-hover:text-blue-900">{title}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{subtitle}</p>
        </div>
      </div>
      <ChevronRight size={18} className="text-gray-300 transition-colors group-hover:text-blue-500" />
    </div>
  );
}

function InsightCard({ title, text }) {
  return (
    <div className="section-card !p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
        <AlertTriangle size={18} />
      </div>
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-snug text-ink-500">{text}</p>
    </div>
  );
}

function buttonClass(tone = 'primary', extra = '') {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm';
  const tones = {
    primary:
      'border border-blue-700 bg-blue-700 text-white hover:border-blue-800 hover:bg-blue-800 hover:shadow-md',
    secondary:
      'border border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50',
  };

  return `${base} ${tones[tone] || tones.primary} ${extra}`.trim();
}


