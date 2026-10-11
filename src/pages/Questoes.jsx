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
  PenLine,
  SlidersHorizontal,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { buildCanonicalHistory, buildStudyHistoryOverview } from '../lib/studyAnalytics';
import { loadExamBoardsFromSupabase } from '../lib/examBoardsApi';
import { supabase } from '../lib/supabase';
import { submitAnswer } from '../lib/questoesApi';
import { showConfirm, showToast } from '../lib/dialogs';
import EnunciadoDaQuestao from '../components/EnunciadoDaQuestao';
import { rotuloDaDisciplina } from '../lib/rotuloDaDisciplina';
import { textoDoEnunciado } from '../lib/textoDaQuestao';
import { comentarioDaQuestao } from '../lib/comentarioDaQuestao';
import Rascunho from '../components/Rascunho';

// Normalizes a Supabase question row to the format the UI expects
function normalizeQuestion(row) {
  const alts = Array.isArray(row.alternativas)
    ? row.alternativas
    : (() => { try { return JSON.parse(row.alternativas || '[]'); } catch { return []; } })();
  return {
    id: row.id,
    // O numero que o aluno usa para falar da questao ("a #551858"). O `id` e um UUID do
    // banco — identifica a linha, nao a questao, e nao significa nada para ninguem.
    codigo: String(row.external_id || '').trim(),
    // O banco guarda o que a fonte mandou — a API do ENEM manda "matematica". O rotulo
    // bonito e decisao de apresentacao: ver src/lib/rotuloDaDisciplina.js.
    disciplina: rotuloDaDisciplina(row.disciplina || ''),
    // O valor cru continua a mao porque o filtro casa com a coluna do banco, nao com o
    // rotulo. Trocar um pelo outro faria o filtro parar de achar questao.
    disciplinaBruta: row.disciplina || '',
    topico: rotuloDaDisciplina(row.topico || ''),
    banca: row.banca || '',
    orgao: row.orgao || '',
    area: rotuloDaDisciplina(row.area || ''),
    areaBruta: row.area || '',
    ano: row.ano || '',
    dificuldade: row.dificuldade || 'Media',
    statement: row.enunciado || '',
    imagem: row.image_url || '',
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

// O filtro compara com o valor do banco; a tela mostra o rotulo. Um dos dois basta.
function combina(rotulo, bruto, escolhido) {
  const alvo = String(escolhido || '').trim().toLowerCase();
  if (!alvo) return true;
  return String(rotulo || '').trim().toLowerCase() === alvo
    || String(bruto || '').trim().toLowerCase() === alvo;
}

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
  // O rascunho vive na PAGINA, nao no cartao. O cartao e remontado a cada questao
  // (`key={currentQuestion.id}`), e com o estado la dentro a janela se fechava sozinha toda
  // vez que o aluno avancava — justamente numa sequencia de questoes de calculo, que e
  // quando ele mais precisa dela aberta.
  const [rascunhoAberto, setRascunhoAberto] = useState(false);
  const [filterDisc, setFilterDisc]   = useState('');
  const [filterBanca, setFilterBanca] = useState('');
  // Orgao e area vem do edital de cada concurso ("PM AL", "Combatente"). Sao as duas
  // perguntas que o aluno realmente faz e que disciplina/banca nao respondem.
  const [filterOrgao, setFilterOrgao] = useState('');
  const [filterArea, setFilterArea] = useState('');
  // As opcoes saem do que EXISTE no banco, nao de um catalogo: oferecer um filtro que nao
  // devolve questao nenhuma e pior do que nao oferecer.
  const [orgaoOptions, setOrgaoOptions] = useState([]);
  const [areaOptions, setAreaOptions] = useState([]);
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
      // Questões visíveis ao aluno = públicas. (A coluna is_active não existe;
      // is_public é a flag real, default true.)
      let q = supabase.from('questions').select('*').eq('is_public', true);
      if (filterDisc) q = q.eq('disciplina', filterDisc);
      if (filterBanca) q = q.eq('banca', filterBanca);
      if (filterOrgao) q = q.eq('orgao', filterOrgao);
      if (filterArea) q = q.eq('area', filterArea);
      if (filterDif) q = q.eq('dificuldade', filterDif);

      const { data, error } = await q.order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      setDbQuestions((data || []).map(normalizeQuestion));
    } catch {
      // Fallback sem filtro de visibilidade (ex.: variação de schema/RLS).
      let fallbackQuery = supabase.from('questions').select('*');
      if (filterDisc) fallbackQuery = fallbackQuery.eq('disciplina', filterDisc);
      if (filterBanca) fallbackQuery = fallbackQuery.eq('banca', filterBanca);
      if (filterOrgao) fallbackQuery = fallbackQuery.eq('orgao', filterOrgao);
      if (filterArea) fallbackQuery = fallbackQuery.eq('area', filterArea);
      if (filterDif) fallbackQuery = fallbackQuery.eq('dificuldade', filterDif);
      const { data } = await fallbackQuery.order('created_at', { ascending: false }).limit(50);
      setDbQuestions((data || []).map(normalizeQuestion));
    } finally {
      setDbLoading(false);
    }
  }, [filterDisc, filterBanca, filterOrgao, filterArea, filterDif]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  // Carrega as opcoes de orgao e area uma vez, a partir do que ja esta cadastrado.
  //
  // A coluna pode nao existir ainda (a migration 202610110001 e aplicada a mao): neste caso
  // a consulta falha e os dois filtros simplesmente nao aparecem, em vez de derrubar a tela.
  useEffect(() => {
    let cancelado = false;

    (async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('orgao, area')
        .eq('is_public', true)
        .limit(1000);

      if (cancelado || error || !data) return;

      const unicos = (campo) => [...new Set(
        data.map((linha) => String(linha?.[campo] || '').trim()).filter(Boolean)
      )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

      setOrgaoOptions(unicos('orgao'));
      setAreaOptions(unicos('area'));
    })();

    return () => { cancelado = true; };
  }, []);

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
      // O filtro guarda o valor como esta no banco, e a questao carrega os dois: o cru e o
      // rotulo. Comparar so com um dos lados deixaria o filtro sem resultado justamente
      // depois de a tela passar a mostrar o nome bonito.
      if (filterDisc && !combina(item.disciplina, item.disciplinaBruta, filterDisc)) return false;
      if (filterBanca && item.banca !== filterBanca) return false;
      if (filterOrgao && item.orgao !== filterOrgao) return false;
      if (filterArea && !combina(item.area, item.areaBruta, filterArea)) return false;
      if (filterDif && item.dificuldade && item.dificuldade !== filterDif) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.disciplina.toLowerCase().includes(q) ||
        item.topico.toLowerCase().includes(q) ||
        // O enunciado decodificado: buscar no markdown cru faria "png" e "https" baterem
        // em meia prova do ENEM.
        textoDoEnunciado(item.statement).toLowerCase().includes(q)
      );
    });
  }, [activeCaderno, activeCadernoQuestionIds, allQuestions, filterArea, filterBanca, filterDif, filterDisc, filterOrgao, query]);
  const activeFiltersCount = [filterDisc, filterBanca, filterOrgao, filterArea, filterDif].filter((value) => String(value || '').trim().length > 0).length;
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
    <div className="pl-page" style={{ height: '100%', overflow: 'hidden', gap: 14 }}>
      {/* Comando da página: cabeçalho e barra de busca num bloco só, sobre superfície.
          Soltos sobre o papel bege eles se misturavam ao fundo e a tela não tinha onde
          começar; agrupados, o bloco se separa do fundo e a questão fica claramente como o
          segundo (e principal) elemento da tela. */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 10,
          background: 'var(--pl-surface)',
          border: '1px solid var(--pl-rule-2)',
          borderRadius: 14,
          padding: '14px 16px',
          boxShadow: 'var(--pl-sh-low)',
        }}
      >
      <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 24, alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h1 className="pl-display" style={{ margin: 0, fontSize: 30, lineHeight: 1.1, color: 'var(--pl-ink)' }}>
            Banco de questões<span style={{ color: 'var(--pl-accent)' }}>.</span>
          </h1>
          {/* O subtítulo saiu daqui. Ele explicava em duas linhas o que os botões logo abaixo
              já oferecem ("Montar caderno", "Iniciar modo livre") — e numa tela de resolver
              questão cada linha do cabeçalho é uma linha a menos de enunciado. */}
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', overflow: 'hidden' }}>
            <QStatTile label="Hoje" value={`${questionAccuracy}%`} />
            <QStatTile label="Total" value={String(historyOverview.totalQuestions)} />
            <QStatTile label="Acurácia" value={`${historyOverview.overallAccuracy}%`} />
            <QStatTile label="Tempo" value={historyOverview.totalMinutesLabel} />
          </div>
          <button
            type="button"
            onClick={() => setRegistroEstudoModalOpen?.(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, border: 'none', background: 'var(--pl-accent)', color: 'white', padding: '8px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pl-sans)' }}
          >
            <Play size={12} fill="currentColor" />
            Registrar estudo
          </button>
        </div>
      </header>

      {/* A barra perdeu a moldura própria: ela é a segunda linha do mesmo bloco, separada
          por um fio. Duas molduras empilhadas liam como duas seções sem relação. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--pl-rule)', paddingTop: 10 }}>
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
                onClick={() => { setFilterDisc(''); setFilterBanca(''); setFilterOrgao(''); setFilterArea(''); setFilterDif(''); setActiveCadernoId(''); }}
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
          onDelete={async (id) => {
            const alvo = cadernos.find((item) => item.id === id);
            const ok = await showConfirm(`Excluir o caderno “${String(alvo?.title || 'sem nome').slice(0, 60)}”?`, {
              title: 'Excluir caderno',
              confirmLabel: 'Excluir',
              danger: true,
            });
            if (!ok) return;
            setCadernos((prev) => prev.filter((item) => item.id !== id));
            if (activeCadernoId === id) setActiveCadernoId('');
            showToast('Caderno excluído.', 'success');
          }}
        />
      </div>
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
                rascunhoAberto={rascunhoAberto}
                onAlternarRascunho={() => setRascunhoAberto((aberto) => !aberto)}
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

      {/* A janela do rascunho é renderizada aqui, fora do cartão, e sobrevive à troca de
          questão — a folha de dentro é que muda, pelo `key`. */}
      {rascunhoAberto && currentQuestion ? (
        <Rascunho
          key={currentQuestion.id}
          questaoId={currentQuestion.id}
          aoFechar={() => setRascunhoAberto(false)}
        />
      ) : null}

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
              Disciplina e banca vêm do cadastro da plataforma. Órgão e área vêm das próprias
              questões já cadastradas — por isso só aparecem quando há o que escolher.
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
              {/* Orgao e area so aparecem quando ha o que escolher. Um seletor permanente
                  com uma opcao so ("Todos os órgãos") ocupa espaco e nao decide nada — e,
                  enquanto o banco nao tiver questoes com esses campos, e exatamente isso que
                  ele seria. */}
              <SeletorDeFiltro
                id="questoes-filter-orgao"
                rotulo="Órgão"
                vazio="Todos os órgãos"
                valor={filterOrgao}
                opcoes={orgaoOptions}
                onChange={setFilterOrgao}
              />

              <SeletorDeFiltro
                id="questoes-filter-area"
                rotulo="Área"
                vazio="Todas as áreas"
                valor={filterArea}
                opcoes={areaOptions}
                onChange={setFilterArea}
              />

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
                  setFilterOrgao('');
                  setFilterArea('');
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

// O comentário que explica a resposta.
//
// A maior parte do banco veio da API do ENEM, que entrega enunciado, alternativas e gabarito
// — e nada mais. O cartão mostrava um bloco "Comentario" vazio: o aluno respondia, acertava
// ou errava, e não ficava sabendo POR QUÊ. Em banco de questões isso é o produto inteiro.
//
// Aqui o comentário é buscado em três lugares, do mais confiável ao mais caro (ver
// src/lib/comentarioDaQuestao.js): o texto curado, o cache compartilhado e, só então, a IA.
// Quem gera paga a espera uma vez; todo mundo depois lê do cache.
function ComentarioDaResposta({ question, currentUserId, acertou, resposta }) {
  const [estado, setEstado] = useState(() => (question.explanation ? 'pronto' : 'carregando'));
  const [comentario, setComentario] = useState(() => (
    question.explanation ? { comentario: question.explanation, conceitos: [], dica: '' } : null
  ));
  const blocoRef = useRef(null);

  useEffect(() => {
    if (question.explanation) return undefined;

    let valido = true;
    setEstado('carregando');
    setComentario(null);

    comentarioDaQuestao(question, { currentUserId, respostaDoAluno: resposta })
      .then((resultado) => {
        if (!valido) return;
        setComentario(resultado);
        setEstado(resultado ? 'pronto' : 'vazio');
      })
      .catch((erro) => {
        if (!valido) return;
        console.error('[Questoes] falha ao obter o comentário da questão:', erro);
        setEstado('erro');
      });

    // O cleanup existe porque o aluno pode pular para a próxima questão antes de a IA
    // responder — e o comentário da anterior apareceria em cima da nova.
    return () => { valido = false; };
  }, [question, currentUserId, resposta]);

  // O comentário nasce no fim do cartão, abaixo das alternativas. Com enunciado longo ele
  // fica fora de vista, e o aluno acha que respondeu e não recebeu correção nenhuma. Trazer
  // o bloco para a vista é o mínimo: foi para isso que ele clicou em "Responder".
  useEffect(() => {
    if (estado !== 'pronto' && estado !== 'vazio' && estado !== 'erro') return;
    blocoRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [estado]);

  const cor = acertou ? 'var(--pl-success)' : 'var(--pl-danger)';
  const fundo = acertou ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)';

  return (
    <div ref={blocoRef} className="pl-gabarito-reveal" style={{
      marginTop: 12, flexShrink: 0, borderRadius: 8, padding: 12,
      border: `1px solid ${fundo}`, background: fundo,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: cor, fontFamily: 'var(--pl-sans)' }}>
          Comentário
        </p>
        {estado === 'carregando' ? <Loader2 size={12} className="animate-spin" style={{ color: cor }} /> : null}
      </div>

      {estado === 'carregando' ? (
        <p style={{ marginTop: 4, fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>
          Escrevendo a explicação desta questão...
        </p>
      ) : null}

      {estado === 'pronto' && comentario ? (
        <>
          <p style={{ marginTop: 4, fontSize: 12.5, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)', fontFamily: 'var(--pl-sans)' }}>
            {comentario.comentario}
          </p>
          {comentario.conceitos?.length ? (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {comentario.conceitos.map((conceito) => (
                <span key={conceito} className="pl-tag" style={{ fontSize: 10 }}>{conceito}</span>
              ))}
            </div>
          ) : null}
          {comentario.dica ? (
            <p style={{ marginTop: 8, fontSize: 11.5, fontWeight: 600, lineHeight: 1.5, color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>
              Como revisar: {comentario.dica}
            </p>
          ) : null}
        </>
      ) : null}

      {estado === 'vazio' || estado === 'erro' ? (
        <p style={{ marginTop: 4, fontSize: 12, fontWeight: 500, lineHeight: 1.55, color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>
          {estado === 'erro'
            ? 'Não consegui escrever o comentário agora. Tente de novo em instantes.'
            : 'Esta questão ainda não tem comentário.'}
        </p>
      ) : null}
    </div>
  );
}

function InteractiveQuestionCard({ question, currentUserId = '', onAnswered, onNextQuestion, rascunhoAberto = false, onAlternarRascunho }) {
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
        // Sombra permanente, não só depois de responder: é ela que levanta a questão do
        // papel bege e diz "é aqui que você trabalha". Antes o cartão era branco sobre bege
        // com um fio de borda, e no meio de uma tela clara isso quase não se via.
        boxShadow: submitted ? 'var(--pl-sh-high)' : 'var(--pl-sh-mid)',
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
        // Depois de responder, a tarja "Correta/Incorreta" ocupa o canto superior direito e
        // cobria o código da questão. O espaço é aberto só quando ela existe.
        padding: submitted ? '8px 104px 8px 16px' : '8px 16px',
        background: submitted ? (wasCorrect ? 'rgba(var(--pl-success-soft-rgb, 209,250,229),0.3)' : 'rgba(var(--pl-danger-soft-rgb, 254,226,226),0.3)') : 'var(--pl-bg-soft)',
      }}>
        <div style={{ display: 'flex', minWidth: 0, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {/* Hierarquia: o que o aluno precisa para se situar vem primeiro (disciplina >
              tópico), e a procedência (banca · órgão · ano) vem depois, em tom menor. O UUID
              do banco saiu daqui: ele ocupava o lugar de honra, numa pílula azul, como se
              fosse o número da questão — e "3956ac51-7308-4070" não diz nada a ninguém. */}
          <div style={{ display: 'flex', minWidth: 0, flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5, fontWeight: 750, color: 'var(--pl-ink)', fontFamily: 'var(--pl-sans)' }}>
              {question.disciplina}
            </span>
            {question.topico ? (
              <>
                <ChevronRight size={12} style={{ flexShrink: 0, color: 'var(--pl-rule-strong)' }} />
                <span style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5, fontWeight: 600, color: 'var(--pl-ink-2)', fontFamily: 'var(--pl-sans)' }}>{question.topico}</span>
              </>
            ) : null}
          </div>

          <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 8, fontSize: 10, fontWeight: 650, letterSpacing: '0.04em', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>
            {[question.banca, question.orgao, question.ano].filter(Boolean).map((parte, indice) => (
              <React.Fragment key={parte}>
                {indice > 0 ? <span style={{ opacity: 0.45 }}>·</span> : null}
                <span style={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parte}</span>
              </React.Fragment>
            ))}
            {/* O número público, bem discreto: serve para o aluno citar a questão no suporte
                ou na comunidade, e não para competir com o conteúdo. */}
            {question.codigo ? (
              <span
                title="Código da questão"
                style={{ fontFamily: 'var(--pl-mono)', fontSize: 9.5, color: 'var(--pl-ink-4)', letterSpacing: 0 }}
              >
                #{question.codigo}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Coluna elástica: o enunciado ocupa o que sobra e as alternativas ficam sempre
          visíveis. `overflowY: auto` continua aqui como rede — quando nem com a figura no
          mínimo a questão couber (enunciado muito longo, janela muito baixa), rolar é melhor
          do que cortar. */}
      <div style={{
        minHeight: 0, flex: 1, overflowY: 'auto', overscrollBehavior: 'contain',
        padding: '8px 16px 12px',
        display: 'flex', flexDirection: 'column',
      }}>
        <EnunciadoDaQuestao enunciado={question.statement} imagem={question.imagem} compacto={submitted} />

        <div style={{ display: 'flex', flexShrink: 0, flexDirection: 'column', gap: 6 }}>
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
          <ComentarioDaResposta question={question} currentUserId={currentUserId} acertou={wasCorrect} resposta={selectedOptionId} />
        ) : null}
      </div>

      <div style={{
        flexShrink: 0,
        borderTop: `1px solid ${submitted ? (wasCorrect ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)') : 'var(--pl-rule)'}`,
        padding: '8px 16px',
        background: submitted ? (wasCorrect ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)') : 'var(--pl-bg-soft)',
      }}>
        <div style={{ display: 'flex', width: '100%', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {/* O rascunho fica ao lado de "Responder" porque é ali que ele é usado: o aluno lê,
              precisa fazer a conta, e a folha tem de estar a um clique — não escondida num
              menu. Em prova de verdade o papel já está em cima da mesa. */}
          <button
            type="button"
            onClick={() => onAlternarRascunho?.()}
            aria-pressed={rascunhoAberto}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
              borderRadius: 8, padding: '6px 12px',
              border: `1px solid ${rascunhoAberto ? 'var(--pl-accent)' : 'var(--pl-rule-2)'}`,
              background: rascunhoAberto ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
              color: rascunhoAberto ? 'var(--pl-accent)' : 'var(--pl-ink-2)',
              fontSize: 12, fontWeight: 650, cursor: 'pointer', fontFamily: 'var(--pl-sans)',
            }}
          >
            <PenLine size={13} />
            Rascunho
          </button>

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

// Um seletor de filtro cujas opcoes saem do banco. Some quando nao ha nenhuma.
function SeletorDeFiltro({ id, rotulo, vazio, valor, opcoes, onChange }) {
  if (!opcoes || opcoes.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={id}
        style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}
      >
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        style={{ borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg)', padding: '8px 12px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', outline: 'none', fontFamily: 'var(--pl-sans)', width: '100%' }}
      >
        <option value="">{vazio}</option>
        {opcoes.map((opcao) => (
          <option key={opcao} value={opcao}>{opcao}</option>
        ))}
      </select>
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
    <button type="button" onClick={onClick} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, borderRadius: 10, padding: '6px 10px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--pl-sans)', ...containerStyle }}>
      <div style={{ display: 'flex', height: 25, width: 25, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: 11.5, fontWeight: 600, ...markerStyle }}>
        {submitted && isCorrect ? <Check size={14} strokeWidth={3} /> : submitted && isWrongSelection ? <X size={14} strokeWidth={3} /> : label}
      </div>
      <span style={{ minWidth: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: textColor }}>{text}</span>
    </button>
  );
}

function QStatTile({ label, value }) {
  return (
    // Célula de uma faixa única: a borda é da faixa, não de cada número. Quatro cartões
    // soltos lado a lado disputavam atenção com o título da página.
    <div style={{ padding: '6px 12px', minWidth: 62, borderLeft: '1px solid var(--pl-rule)' }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--pl-ink-3)', lineHeight: 1, fontFamily: 'var(--pl-sans)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: 19, letterSpacing: '-0.04em', lineHeight: 1.2, color: 'var(--pl-ink)', marginTop: 2 }}>
        {value}<span style={{ color: 'var(--pl-accent)' }}>.</span>
      </div>
    </div>
  );
}

function QuestionNotebookShelf({ cadernos, activeCadernoId, onSelect, onCreate, onDelete }) {
  // Sem caderno, sem estante. Havia aqui uma faixa tracejada explicando que não existia
  // nenhum caderno e oferecendo "Novo caderno" — uma linha inteira da tela para repetir o
  // botão "Montar caderno", que está logo acima e sempre visível.
  if (!Array.isArray(cadernos) || cadernos.length === 0) return null;

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

