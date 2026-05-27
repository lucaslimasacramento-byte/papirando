import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Play,
  LayoutGrid,
  Layers,
  FileText,
  Clock,
  BarChart2,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  DownloadCloud,
  ExternalLink,
  FileSearch,
  Filter,
  Flame,
  History,
  LayoutDashboard,
  Layers3,
  PlayCircle,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { buildCanonicalHistory, parseStudyTimeToMinutes } from '../lib/studyAnalytics';
import { canonicalizeSubjectName } from '../lib/subjectCatalogUtils';

const STORAGE_KEY = 'papirando_edital_questao_state';
const TAB_ITEMS = [
  { id: 'visao-geral', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'disciplinas', label: 'Disciplinas', icon: Layers3 },
  { id: 'criticos', label: 'Pontos críticos', icon: Flame },
  { id: 'progresso', label: 'Progresso', icon: TrendingUp },
  { id: 'estrutura', label: 'Estrutura', icon: BookOpen },
  { id: 'conquistas', label: 'Conquistas', icon: Trophy },
];

const DEFAULT_STATE = {
  activeTab: 'visao-geral',
  selectedPlan: '',
  searchTerm: '',
  expandedDiscipline: null,
  priorityFilter: 'todas',
  showOnlyPending: false,
};

function readPersistedState() {
  if (typeof window === 'undefined') return DEFAULT_STATE;

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULT_STATE, ...saved };
  } catch (error) {
    console.warn('Falha ao ler estado salvo do Edital em questão.', error);
    return DEFAULT_STATE;
  }
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatDateLabel(value) {
  if (!value) return 'Nunca estudado';
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return 'Nunca estudado';
  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function countDaysSince(value) {
  if (!value) return 999;
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return 999;
  const now = new Date();
  const utcParsed = Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const utcNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((utcNow - utcParsed) / 86400000));
}

function formatMinutes(totalMinutes) {
  const safe = Math.max(0, Number(totalMinutes || 0));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

/** Só cursos que o aluno cadastrou em Planos (não catálogo global nem inferência). */
function buildCourseOptionsFromEnrolled(cursos = []) {
  const byPlan = new Map();

  (cursos || []).forEach((curso) => {
    const plan = String(curso?.plano || curso?.nome || '').trim();
    if (!plan) return;

    byPlan.set(plan, {
      id: String(curso?.id || plan),
      plan,
      nome: curso?.nome || plan,
      concurso: curso?.concurso || plan,
      banca: curso?.banca || 'A definir',
      origem: curso?.origem || 'manual',
      editalUrl: String(curso?.edital_url || '').trim(),
      catalogId: '',
    });
  });

  return [...byPlan.values()].sort((first, second) =>
    String(first.nome || '').localeCompare(String(second.nome || ''), 'pt-BR')
  );
}

function matchesTopicHistory(recordTopic, topicName) {
  const recordNorm = normalizeText(recordTopic);
  const topicNorm = normalizeText(topicName);
  if (!recordNorm || !topicNorm) return false;
  return recordNorm === topicNorm || recordNorm.includes(topicNorm) || topicNorm.includes(recordNorm);
}

function resolvePriority(pressureScore) {
  if (pressureScore >= 85) return 'altissima';
  if (pressureScore >= 65) return 'alta';
  if (pressureScore >= 40) return 'media';
  return 'baixa';
}

function priorityLabel(value) {
  if (value === 'altissima') return 'Altíssima';
  if (value === 'alta') return 'Alta';
  if (value === 'media') return 'Média';
  return 'Baixa';
}

function buildTopicAnalytics(disciplina, topic, history, subjectCatalog) {
  const disciplinaCanonica = canonicalizeSubjectName(disciplina?.nome || '', subjectCatalog);
  const relevantHistory = history.filter((record) => {
    const sameDiscipline =
      canonicalizeSubjectName(record?.disciplinaCanonica || record?.disciplina || '', subjectCatalog) ===
      disciplinaCanonica;

    if (!sameDiscipline) return false;
    return matchesTopicHistory(record?.topico || record?.material || '', topic?.nome || '');
  });

  const sessions = relevantHistory.length;
  const minutes = relevantHistory.reduce((acc, item) => acc + parseStudyTimeToMinutes(item?.tempo), 0);
  const historyHits = relevantHistory.reduce((acc, item) => acc + Number(item?.acertos || 0), 0);
  const historyErrors = relevantHistory.reduce((acc, item) => acc + Number(item?.erros || 0), 0);
  const historyQuestions = historyHits + historyErrors;
  const lastSeen =
    relevantHistory
      .map((item) => item?.data || '')
      .filter(Boolean)
      .sort()
      .at(-1) || null;

  const acertos = Number(topic?.acertos || 0);
  const erros = Number(topic?.erros || 0);
  const totalQuestoes = acertos + erros;
  const accuracy =
    totalQuestoes > 0
      ? clampPercent((acertos / totalQuestoes) * 100)
      : historyQuestions > 0
      ? clampPercent((historyHits / historyQuestions) * 100)
      : clampPercent(topic?.percentual || 0);

  const daysSince = countDaysSince(lastSeen);
  const done = Boolean(topic?.concluido);
  const unansweredPenalty = totalQuestoes === 0 ? 16 : 0;
  const stalePenalty = daysSince > 21 ? 18 : daysSince > 10 ? 10 : 0;
  const executionPenalty = sessions === 0 ? 10 : 0;
  const completionPenalty = done ? -12 : 20;
  const errorPenalty = erros > acertos ? 14 : 0;
  const pressureScore = Math.max(
    0,
    Math.round((100 - accuracy) * 0.75 + unansweredPenalty + stalePenalty + executionPenalty + completionPenalty + errorPenalty)
  );
  const priority = resolvePriority(pressureScore);

  return {
    ...topic,
    disciplinaId: disciplina.id,
    disciplinaNome: disciplina.nome,
    disciplinaPlano: disciplina.plano || 'Geral',
    professor: disciplina.professor || disciplina.plano || 'Papirando',
    categoria: disciplina.area || disciplina.plano || 'Geral',
    acertos,
    erros,
    percentual: accuracy,
    totalQuestoes,
    sessions,
    minutes,
    minutesLabel: formatMinutes(minutes),
    lastSeen,
    lastSeenLabel: formatDateLabel(lastSeen),
    pressureScore,
    prioridade: priority,
    concluido: done,
    historyQuestions,
  };
}

function buildDisciplineAnalytics(disciplina, history, subjectCatalog) {
  const topicos = Array.isArray(disciplina?.topicos) ? disciplina.topicos : [];
  const topicAnalytics = topicos.map((topic) => buildTopicAnalytics(disciplina, topic, history, subjectCatalog));
  const totalTopicos = topicAnalytics.length;
  const concluidos = topicAnalytics.filter((topic) => topic.concluido).length;
  const totalQuestoes = topicAnalytics.reduce((acc, topic) => acc + topic.totalQuestoes, 0);
  const totalMinutes = topicAnalytics.reduce((acc, topic) => acc + topic.minutes, 0);
  const totalSessions = topicAnalytics.reduce((acc, topic) => acc + topic.sessions, 0);
  const avg = totalTopicos > 0 ? clampPercent(topicAnalytics.reduce((acc, topic) => acc + topic.percentual, 0) / totalTopicos) : 0;
  const criticosDisciplina = topicAnalytics.filter((topic) => topic.pressureScore >= 65).length;
  const coberturaDisciplina = totalTopicos > 0 ? clampPercent((concluidos / totalTopicos) * 100) : 0;
  const lastSeen =
    topicAnalytics
      .map((topic) => topic.lastSeen || '')
      .filter(Boolean)
      .sort()
      .at(-1) || null;

  return {
    ...disciplina,
    professor: disciplina?.plano || 'Papirando',
    categoria: disciplina?.plano || 'Geral',
    peso: resolvePriority(Math.round((100 - avg) * 0.6 + criticosDisciplina * 10 + (100 - coberturaDisciplina) * 0.25)),
    avg,
    criticosDisciplina,
    concluidosDisciplina: concluidos,
    pendentesDisciplina: Math.max(0, totalTopicos - concluidos),
    coberturaDisciplina,
    totalQuestoes,
    totalMinutes,
    totalSessions,
    minutesLabel: formatMinutes(totalMinutes),
    lastSeen,
    lastSeenLabel: formatDateLabel(lastSeen),
    topicos: topicAnalytics,
  };
}

export default function EditalQuestao({
  bancoDisciplinas = [],
  cursos = [],
  historicoReal = [],
  subjectCatalog = [],
  selectedCoursePlan = '',
  toggleEditalTopico,
  onOpenDiscipline,
  onOpenStudyRegister,
  onNavigate,
  onOpenPlanos,
}) {
  const persisted = useMemo(() => readPersistedState(), []);
  const [activeTab, setActiveTab] = useState(persisted.activeTab);
  const [selectedPlan, setSelectedPlan] = useState(persisted.selectedPlan);
  const [searchTerm, setSearchTerm] = useState(persisted.searchTerm);
  const [expandedDiscipline, setExpandedDiscipline] = useState(persisted.expandedDiscipline);
  const [priorityFilter, setPriorityFilter] = useState(persisted.priorityFilter);
  const [showOnlyPending, setShowOnlyPending] = useState(persisted.showOnlyPending);

  const canonicalHistory = useMemo(
    () => buildCanonicalHistory(historicoReal, subjectCatalog),
    [historicoReal, subjectCatalog]
  );

  const courseOptions = useMemo(() => buildCourseOptionsFromEnrolled(cursos), [cursos]);

  useEffect(() => {
    if (selectedPlan && courseOptions.some((item) => item.plan === selectedPlan)) return;
    const preferred =
      selectedCoursePlan &&
      selectedCoursePlan !== 'Todos' &&
      courseOptions.some((o) => o.plan === selectedCoursePlan)
        ? selectedCoursePlan
        : courseOptions[0]?.plan || '';
    const timer = window.setTimeout(() => setSelectedPlan(preferred), 0);
    return () => window.clearTimeout(timer);
  }, [courseOptions, selectedPlan, selectedCoursePlan]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeTab,
        selectedPlan,
        searchTerm,
        expandedDiscipline,
        priorityFilter,
        showOnlyPending,
      })
    );
  }, [activeTab, selectedPlan, searchTerm, expandedDiscipline, priorityFilter, showOnlyPending]);

  const selectedCourse = courseOptions.find((item) => item.plan === selectedPlan) || courseOptions[0] || null;

  const disciplinasDoCurso = useMemo(() => {
    if (!selectedCourse?.plan) return [];
    return (bancoDisciplinas || []).filter((disciplina) => {
      const plan = String(disciplina?.plano || 'Geral').trim();
      return plan === selectedCourse.plan || plan === 'Geral';
    });
  }, [bancoDisciplinas, selectedCourse]);

  const analytics = useMemo(() => {
    const disciplinasAnaliticas = disciplinasDoCurso.map((disciplina) =>
      buildDisciplineAnalytics(disciplina, canonicalHistory, subjectCatalog)
    );

    const allTopics = disciplinasAnaliticas.flatMap((disciplina) => disciplina.topicos);
    const totalTopicos = allTopics.length;
    const concluidos = allTopics.filter((topic) => topic.concluido).length;
    const pendentes = Math.max(0, totalTopicos - concluidos);
    const cobertura = totalTopicos > 0 ? clampPercent((concluidos / totalTopicos) * 100) : 0;
    const media = totalTopicos > 0 ? clampPercent(allTopics.reduce((acc, topic) => acc + topic.percentual, 0) / totalTopicos) : 0;
    const totalQuestoes = allTopics.reduce((acc, topic) => acc + topic.totalQuestoes, 0);
    const totalSessions = allTopics.reduce((acc, topic) => acc + topic.sessions, 0);
    const totalMinutes = allTopics.reduce((acc, topic) => acc + topic.minutes, 0);
    const criticos = [...allTopics].filter((topic) => topic.pressureScore >= 65).sort((first, second) => second.pressureScore - first.pressureScore);
    const fortes = [...allTopics].filter((topic) => topic.percentual >= 75 && (topic.concluido || topic.totalQuestoes > 0)).sort((first, second) => second.percentual - first.percentual);
    const lastSeen =
      allTopics
        .map((topic) => topic.lastSeen || '')
        .filter(Boolean)
        .sort()
        .at(-1) || null;

    return {
      disciplinasAnaliticas,
      totalTopicos,
      concluidos,
      pendentes,
      cobertura,
      media,
      totalQuestoes,
      totalSessions,
      totalMinutes,
      criticos,
      fortes,
      lastSeen,
      lastSeenLabel: formatDateLabel(lastSeen),
    };
  }, [disciplinasDoCurso, canonicalHistory, subjectCatalog]);

  const filteredDisciplinas = useMemo(() => {
    return analytics.disciplinasAnaliticas
      .filter((disciplina) => {
        if (!searchTerm.trim()) return true;
        const search = normalizeText(searchTerm);
        return (
          normalizeText(disciplina.nome).includes(search) ||
          disciplina.topicos.some((topic) => normalizeText(topic.nome).includes(search))
        );
      })
      .map((disciplina) => ({
        ...disciplina,
        topicos: disciplina.topicos.filter((topic) => {
          const matchesPriority = priorityFilter === 'todas' ? true : topic.prioridade === priorityFilter;
          const matchesPending = showOnlyPending ? !topic.concluido : true;
          return matchesPriority && matchesPending;
        }),
      }));
  }, [analytics.disciplinasAnaliticas, priorityFilter, searchTerm, showOnlyPending]);

  const currentCourseStats = useMemo(() => ({
    status:
      analytics.criticos.length >= 8
        ? 'Pressão alta'
        : analytics.criticos.length >= 4
        ? 'Atenção tática'
        : 'Base sob controle',
    summary:
      analytics.totalTopicos === 0
        ? courseOptions.length === 0
          ? 'Cadastre um curso em Planos para analisar o edital com suas disciplinas e tópicos.'
          : 'Nenhum tópico vinculado a este curso ainda — confira disciplinas em Planos ou no edital.'
        : analytics.criticos.length > 0
        ? `${analytics.criticos.length} tópicos pedem ataque agora. Revisão curta mais prática e o fluxo mais forte.`
        : 'Boa leitura do edital. Agora vale sustentar frequência e revisar a base já concluída.',
  }), [analytics, courseOptions.length]);

  const nextCriticalTopic = analytics.criticos[0] || null;

  const handleOpenDiscipline = (disciplina) => {
    if (!disciplina) return;
    onOpenDiscipline?.(disciplina);
  };

  const persistContext = (payload) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('papirando_edital_questao_context', JSON.stringify(payload));
  };

  const handlePracticeTopic = (topic) => {
    if (!topic) return;
    persistContext({
      plan: selectedCourse?.plan || '',
      disciplinaId: topic.disciplinaId,
      disciplinaNome: topic.disciplinaNome,
      topicoId: topic.id,
      topicoNome: topic.nome,
      action: 'questoes',
    });
    onNavigate?.('questoes');
  };

  const handleOpenHistory = (disciplina) => {
    if (!disciplina) return;
    persistContext({
      plan: selectedCourse?.plan || '',
      disciplinaId: disciplina.id,
      disciplinaNome: disciplina.nome,
      action: 'historico',
    });
    onNavigate?.('historico');
  };

  const handleRegisterStudy = (disciplina) => {
    if (!disciplina) return;
    onOpenStudyRegister?.(disciplina);
  };

  const handleEditalAttack = () => {
    if (courseOptions.length === 0) {
      onOpenPlanos?.();
      return;
    }
    if (analytics.totalTopicos === 0) {
      onOpenPlanos?.();
      return;
    }
    if (nextCriticalTopic) {
      handleOpenDiscipline({ id: nextCriticalTopic.disciplinaId, nome: nextCriticalTopic.disciplinaNome });
      return;
    }
    setActiveTab('disciplinas');
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'disciplinas':
        return (
          <DisciplinasSection
            disciplinas={filteredDisciplinas}
            expandedDiscipline={expandedDiscipline}
            setExpandedDiscipline={setExpandedDiscipline}
            onToggleTopic={toggleEditalTopico}
            onOpenDiscipline={handleOpenDiscipline}
            onPracticeTopic={handlePracticeTopic}
            onRegisterStudy={handleRegisterStudy}
          />
        );
      case 'criticos':
        return <CriticosSection criticos={analytics.criticos} onPracticeTopic={handlePracticeTopic} onOpenDiscipline={handleOpenDiscipline} />;
      case 'progresso':
        return <ProgressoSection computed={analytics} disciplinas={analytics.disciplinasAnaliticas} />;
      case 'estrutura':
        return <EstruturaSection disciplinas={analytics.disciplinasAnaliticas} selectedCourse={selectedCourse} />;
      case 'conquistas':
        return <ConquistasSection computed={analytics} />;
      case 'visao-geral':
      default:
        return (
          <OverviewSection
            computed={analytics}
            disciplinas={analytics.disciplinasAnaliticas}
            onOpenDiscipline={handleOpenDiscipline}
            onOpenHistory={handleOpenHistory}
            onPracticeTopic={handlePracticeTopic}
            onRegisterStudy={handleRegisterStudy}
            setActiveTab={setActiveTab}
          />
        );
    }
  };

  return (
    <div className="pl-page">
      {/* ═══ Hero compacto ═══ */}
      <header className="pl-edital-hero">
        <div>
          <div className="lede-row">
            <div className="pl-hero-icon">
              <FileText size={18} strokeWidth={1.75} />
            </div>
            <span className="pl-eyebrow">Análise de edital</span>
          </div>
          <h1>Painel tático do edital<span className="dot">.</span></h1>
          <p className="subtitle">
            Tópicos cruzados com histórico de estudo e desempenho em questões — gargalos, revisões e prioridades em um só lugar.
          </p>
          {selectedCourse?.plan ? (
            <p className="course-tag">
              <span className="lab">Curso</span>
              <strong>{selectedCourse.plan}</strong>
            </p>
          ) : null}
        </div>
        <div className="kpis">
          <div className="kpi success">
            <span className="lab"><TrendingUp /> Cobertura</span>
            <span className="val">{analytics.cobertura}%</span>
          </div>
          <div className="kpi accent">
            <span className="lab"><BarChart2 /> Precisão média</span>
            <span className="val">{analytics.media}%</span>
          </div>
          <div className="kpi warn">
            <span className="lab"><Layers /> Questões</span>
            <span className="val">{analytics.totalQuestoes}</span>
          </div>
          <div className="kpi">
            <span className="lab"><Clock /> Tempo</span>
            <span className="val">{formatMinutes(analytics.totalMinutes)}</span>
          </div>
        </div>
      </header>

      {/* ═══ Toolbar (curso + ações) ═══ */}
      <div className="pl-edital-toolbar">
        <div className="left">
          <span className="lab">Curso / concurso</span>
          {courseOptions.length > 0 ? (
            <select
              value={selectedPlan || ''}
              onChange={(e) => setSelectedPlan(e.target.value)}
            >
              {courseOptions.map((o) => (
                <option key={o.plan} value={o.plan}>{o.plan}</option>
              ))}
            </select>
          ) : (
            <span className="meta">Nenhum curso cadastrado</span>
          )}
          {selectedCourse?.bancaLabel ? (
            <span className="meta">{selectedCourse.bancaLabel}</span>
          ) : null}
        </div>
        <div className="actions">
          {selectedCourse?.editalUrl ? (
            <a
              href={selectedCourse.editalUrl}
              target="_blank"
              rel="noreferrer"
              className="pl-btn pl-btn-sm"
            >
              <DownloadCloud size={13} /> PDF do edital
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenPlanos?.()}
            className="pl-btn pl-btn-sm"
          >
            <Settings size={13} /> Ajustar em Planos
          </button>
          {analytics.totalTopicos > 0 ? (
            <button
              type="button"
              onClick={handleEditalAttack}
              className="pl-btn pl-btn-sm pl-btn-primary"
            >
              <Play size={13} /> Atacar crítico
            </button>
          ) : null}
        </div>
      </div>

      {/* ═══ Aviso quando vazio ═══ */}
      {analytics.totalTopicos === 0 && courseOptions.length > 0 ? (
        <div className="pl-edital-warn-strip">
          <AlertTriangle />
          <span>
            Edital sem tópicos aqui. Abra <strong>Planos</strong> e confira se este curso tem disciplinas e tópicos ligados ao edital.
          </span>
        </div>
      ) : null}

      {/* ═══ Tabs ═══ */}
      <nav className="pl-edital-tabs">
        {[
          { id: 'visao-geral',  label: 'Visão geral',     icon: LayoutGrid },
          { id: 'disciplinas',  label: 'Disciplinas',     icon: Layers },
          { id: 'criticos',     label: 'Pontos críticos', icon: Flame },
          { id: 'progresso',    label: 'Progresso',       icon: TrendingUp },
          { id: 'estrutura',    label: 'Estrutura',       icon: BookOpen },
          { id: 'conquistas',   label: 'Conquistas',      icon: Trophy },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`pl-edital-tab ${activeTab === t.id ? 'active' : ''}`}
            >
              <Icon /> {t.label}
            </button>
          );
        })}
      </nav>

      {/* ═══ Layout main + sidebar ═══ */}
      <div className="pl-edital-body">
        <main style={{ minWidth: 0 }}>
          {/* Filtros (só pra abas que se beneficiam) */}
          {analytics.totalTopicos > 0 && (activeTab === 'disciplinas' || activeTab === 'visao-geral') ? (
            <Toolbar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
              showOnlyPending={showOnlyPending}
              setShowOnlyPending={setShowOnlyPending}
            />
          ) : null}

          {analytics.totalTopicos === 0 ? (
            <div className="pl-edital-empty">
              <div className="pl-edital-empty-icon"><BookOpen /></div>
              <h3>
                {courseOptions.length === 0
                  ? 'Nenhum curso cadastrado ainda.'
                  : `Ainda não há tópicos para ${selectedCourse?.plan || 'este edital'}.`}
              </h3>
              <p>
                {courseOptions.length === 0
                  ? 'Cadastre um curso em Planos para começar a analisar o edital com disciplinas e tópicos.'
                  : 'Abra Planos para conferir as disciplinas e estrutura desse curso. Quando os tópicos estiverem ligados, eles aparecem aqui pra acompanhar.'}
              </p>
              <div className="actions">
                <button
                  type="button"
                  onClick={() => onOpenPlanos?.()}
                  className="pl-btn pl-btn-primary"
                >
                  <Settings size={14} /> Ajustar em Planos
                </button>
                {selectedCourse?.editalUrl ? (
                  <a
                    href={selectedCourse.editalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="pl-btn"
                  >
                    <DownloadCloud size={14} /> Abrir edital (PDF)
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            renderMainContent()
          )}
        </main>

        {/* Sidebar: status consolidado */}
        <aside>
          <div className="pl-edital-status">
            <div>
              <span className="eyebrow">Status do edital</span>
              <h3 className={`status-h ${
                analytics.criticos.length >= 8 ? 'danger' :
                analytics.criticos.length >= 4 ? 'warn' : ''
              }`}>
                {currentCourseStats.status}
              </h3>
              <p className="summary">{currentCourseStats.summary}</p>
            </div>

            {analytics.lastSeenLabel ? (
              <div className="last-seen">
                <span className="lab">Última sessão</span>
                <span className="val">{analytics.lastSeenLabel}</span>
              </div>
            ) : null}

            <div className="sugg">
              <span className="lab"><Flame /> Ritmo sugerido</span>
              {nextCriticalTopic ? (
                <>
                  <h4>Ataque {nextCriticalTopic.nome}</h4>
                  <p>
                    {nextCriticalTopic.disciplinaNome} · pressão {nextCriticalTopic.pressureScore}/100. Faça uma rodada curta de questões pra subir a precisão.
                  </p>
                  <button
                    type="button"
                    onClick={() => handlePracticeTopic(nextCriticalTopic)}
                    className="pl-btn pl-btn-primary pl-btn-sm"
                  >
                    <Play size={13} /> Treinar agora
                  </button>
                </>
              ) : analytics.totalTopicos === 0 ? (
                <>
                  <h4>Configure o curso</h4>
                  <p>Sem tópicos no edital ainda. Comece definindo as disciplinas em Planos.</p>
                  <button
                    type="button"
                    onClick={() => onOpenPlanos?.()}
                    className="pl-btn pl-btn-primary pl-btn-sm"
                  >
                    <Settings size={13} /> Abrir Planos
                  </button>
                </>
              ) : (
                <>
                  <h4>Mantenha o ritmo</h4>
                  <p>Sem tópicos críticos no momento. Use a aba "Disciplinas" pra revisar a base.</p>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Toolbar({ searchTerm, setSearchTerm, priorityFilter, setPriorityFilter, showOnlyPending, setShowOnlyPending }) {
  return (
    <div className="pl-edital-filters">
      <div className="search">
        <Search />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar disciplina, tópico ou ponto vulnerável…"
        />
      </div>
      <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
        <option value="todas">Todas as prioridades</option>
        <option value="alta">Prioridade alta</option>
        <option value="media">Prioridade média</option>
        <option value="baixa">Prioridade baixa</option>
      </select>
      <button
        type="button"
        onClick={() => setShowOnlyPending((v) => !v)}
        className={`pending ${showOnlyPending ? 'on' : ''}`}
      >
        {showOnlyPending ? 'Mostrando pendentes' : 'Mostrar pendentes'}
      </button>
    </div>
  );
}
function OverviewSection({ computed, disciplinas, onOpenDiscipline, onOpenHistory, onPracticeTopic, onRegisterStudy, setActiveTab }) {
  const topDisciplinas = [...disciplinas].sort((first, second) => first.avg - second.avg).slice(0, 4);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1.05fr 0.95fr' }}>
        <SectionCard eyebrow="visão geral" title="Radar executivo do edital" subtitle="Cruza cobertura, histórico e questões por tópico.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FeatureSquare title="Zona de pressão" value={`${computed.criticos.length} pontos`} description="tópicos com baixa precisão ou pouca tração" accent="red" />
            <FeatureSquare title="Base consolidada" value={`${computed.fortes.length} pontos`} description="tópicos já respondendo bem" accent="green" />
            <FeatureSquare title="Tempo investido" value={formatMinutes(computed.totalMinutes)} description="tempo vindo do histórico real" accent="blue" />
            <FeatureSquare title="Leitura do momento" value={computed.media >= 70 ? 'Base aceitável' : 'Base vulnerável'} description="status derivado do cruzamento dos dados" accent="gold" />
          </div>
        </SectionCard>

        <SectionCard eyebrow="ataque imediato" title="As 4 disciplinas mais pressionadas" subtitle="As que combinam baixa precisão, atraso e tópicos em aberto." action={<button type="button" onClick={() => setActiveTab('disciplinas')} className="pl-btn pl-btn-sm">Ver disciplinas</button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topDisciplinas.map((disciplina) => (
              <div key={disciplina.id} className="pl-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{disciplina.plano || 'Geral'}</p>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--pl-ink)' }}>{disciplina.nome}</h4>
                    <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>{disciplina.topicos.length} tópicos • {disciplina.criticosDisciplina} críticos • {disciplina.minutesLabel}</p>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <TinyActionButton label="Abrir" onClick={() => onOpenDiscipline(disciplina)} />
                    <TinyActionButton label="Histórico" onClick={() => onOpenHistory(disciplina)} secondary />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1.08fr 0.92fr' }}>
        <SectionCard eyebrow="fila tática" title="Pontos mais perigosos do edital" subtitle="Ordenados pela pressão real do estudo." action={<button type="button" onClick={() => setActiveTab('criticos')} className="pl-btn pl-btn-sm">Abrir críticos</button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {computed.criticos.slice(0, 5).map((topic, index) => (
              <CriticalListItem key={topic.id} topic={topic} index={index + 1} onPractice={() => onPracticeTopic(topic)} />
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="fortes" title="Blocos já consolidados" subtitle="Onde a base já está respondendo com mais segurança.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {computed.fortes.slice(0, 5).map((topic) => (
              <div key={topic.id} style={{ borderRadius: 14, border: '1px solid var(--pl-success)', background: 'var(--pl-success-soft)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--pl-success)' }}>{topic.disciplinaNome}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{topic.nome}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>{topic.totalQuestoes} questões • {topic.minutesLabel} • {topic.lastSeenLabel}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span className="pl-tag pl-tag-success">{topic.percentual}%</span>
                    <TinyActionButton label="Registrar" onClick={() => onRegisterStudy({ id: topic.disciplinaId, nome: topic.disciplinaNome, plano: topic.disciplinaPlano })} secondary />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </section>
  );
}

function DisciplinasSection({ disciplinas, expandedDiscipline, setExpandedDiscipline, onToggleTopic, onOpenDiscipline, onPracticeTopic, onRegisterStudy }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {disciplinas.map((disciplina) => {
        const isOpen = expandedDiscipline === disciplina.id;
        return (
          <div key={disciplina.id} style={{ overflow: 'hidden', borderRadius: 20, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-low)' }}>
            <button type="button" onClick={() => setExpandedDiscipline(isOpen ? null : disciplina.id)} style={{ display: 'flex', width: '100%', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '20px', textAlign: 'left', background: isOpen ? 'var(--pl-bg-soft)' : 'var(--pl-surface)', border: 'none', cursor: 'pointer' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <span className="pl-tag">{disciplina.plano || 'Geral'}</span>
                  <PriorityBadge value={disciplina.peso} />
                </div>
                <h3 style={{ margin: '12px 0 0', fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)' }}>{disciplina.nome}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{disciplina.totalQuestoes} questões • {disciplina.totalSessions} sessões • {disciplina.lastSeenLabel}</p>
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <MiniInfo label="Precisão" value={`${disciplina.avg}%`} />
                  <MiniInfo label="Cobertura" value={`${disciplina.coberturaDisciplina}%`} />
                  <MiniInfo label="Pendentes" value={`${disciplina.pendentesDisciplina}`} />
                  <MiniInfo label="Tempo" value={disciplina.minutesLabel} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                <TinyActionButton label="Abrir" onClick={(event) => { event.stopPropagation(); onOpenDiscipline(disciplina); }} />
                <div style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 8, color: 'var(--pl-ink-2)' }}>{isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</div>
              </div>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: 20 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  <TinyActionButton label="Registrar estudo" onClick={() => onRegisterStudy(disciplina)} />
                  <TinyActionButton label="Abrir disciplina" onClick={() => onOpenDiscipline(disciplina)} secondary />
                </div>
                {disciplina.topicos.length === 0 ? (
                  <div style={{ borderRadius: 12, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '20px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>Nenhum tópico batendo com os filtros atuais.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {disciplina.topicos.slice().sort((first, second) => second.pressureScore - first.pressureScore).map((topic) => {
                      const danger = topic.pressureScore >= 65;
                      return (
                        <div key={topic.id} style={{ borderRadius: 14, border: '1px solid', padding: 16, borderColor: danger ? 'var(--pl-danger)' : 'var(--pl-rule-2)', background: danger ? 'var(--pl-danger-soft)' : 'var(--pl-surface)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <button type="button" onClick={() => onToggleTopic?.(topic.disciplinaId, topic.id)} style={{ marginTop: 2, display: 'flex', height: 24, width: 24, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: topic.concluido ? '2px solid var(--pl-success)' : '2px solid var(--pl-rule-strong)', background: topic.concluido ? 'var(--pl-success)' : 'var(--pl-surface)', color: topic.concluido ? '#fff' : 'transparent', cursor: 'pointer' }}>
                                  <CheckCircle2 size={13} />
                                </button>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: topic.concluido ? 'var(--pl-ink-3)' : 'var(--pl-ink)', textDecoration: topic.concluido ? 'line-through' : 'none' }}>{topic.nome}</p>
                                    <PriorityBadge value={topic.prioridade} small />
                                  </div>
                                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>
                                    <span>{topic.totalQuestoes} questões</span>
                                    <span>{topic.sessions} sessões</span>
                                    <span>{topic.minutesLabel}</span>
                                    <span>{topic.lastSeenLabel}</span>
                                    <span style={{ color: danger ? 'var(--pl-danger)' : 'var(--pl-success)' }}>{topic.percentual}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              <div style={{ flex: 1, maxWidth: 200 }}>
                                <ProgressBar value={topic.percentual} tone={danger ? 'red' : topic.percentual >= 75 ? 'green' : 'blue'} />
                              </div>
                              <button type="button" onClick={() => onPracticeTopic(topic)} style={{ borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: danger ? 'var(--pl-danger)' : 'var(--pl-accent-soft)', color: danger ? '#fff' : 'var(--pl-accent)' }}>
                                {danger ? 'Atacar ponto' : 'Praticar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function CriticosSection({ criticos, onPracticeTopic, onOpenDiscipline }) {
  return (
    <section style={{ display: 'grid', gap: 24, gridTemplateColumns: '1.02fr 0.98fr' }}>
      <SectionCard eyebrow="zona crítica" title="Fila inteligente de ataque" subtitle="Ordenada pela combinação entre baixa precisão, pendência e falta de tração.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {criticos.slice(0, 8).map((topic, index) => (
            <div key={topic.id} style={{ borderRadius: 14, border: '1px solid var(--pl-danger)', background: 'var(--pl-danger-soft)', padding: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ display: 'flex', height: 44, width: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'var(--pl-danger)', fontSize: 15, fontWeight: 600, color: '#fff' }}>{index + 1}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--pl-danger)' }}>{topic.disciplinaNome}</p>
                    <h4 style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{topic.nome}</h4>
                    <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>{topic.totalQuestoes} questões • {topic.sessions} sessões • prioridade {priorityLabel(topic.prioridade)}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                  <span className="pl-tag pl-tag-danger">{topic.percentual}%</span>
                  <TinyActionButton label="Abrir disciplina" onClick={() => onOpenDiscipline({ id: topic.disciplinaId, nome: topic.disciplinaNome })} secondary />
                  <button type="button" onClick={() => onPracticeTopic(topic)} style={{ borderRadius: 10, background: 'var(--pl-danger)', padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', border: 'none', cursor: 'pointer' }}>
                    Resolver agora
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="modo leitura" title="Como usar essa tela sem se afogar" subtitle="A fila agora vem dos seus dados reais, então a decisão precisa seguir o sinal do painel.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <GuideStep step="01" title="Comece pelo topo da fila" description="O primeiro crítico mistura baixa precisão, tópico em aberto e pouca recorrência recente." />
          <GuideStep step="02" title="Revisão curta e prática" description="Abra a disciplina, releia o ponto e em seguida avance para Questões." />
          <GuideStep step="03" title="Marque a conclusão" description="O check desta tela usa a persistência real já integrada com o resto do app." />
          <GuideStep step="04" title="Volte ao histórico" description="A aba de histórico confirma se a disciplina voltou a ganhar tração." />
        </div>
      </SectionCard>
    </section>
  );
}

function ProgressoSection({ computed, disciplinas }) {
  const ranked = [...disciplinas].sort((first, second) => second.coberturaDisciplina - first.coberturaDisciplina);
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <SummaryCard eyebrow="tópicos totais" title={`${computed.totalTopicos}`} subtitle="mapeados no edital" icon={<BookOpen size={18} />} />
        <SummaryCard eyebrow="pendentes" title={`${computed.pendentes}`} subtitle="ainda sem consolidação" icon={<AlertCircle size={18} />} danger />
        <SummaryCard eyebrow="fortes" title={`${computed.fortes.length}`} subtitle="faixas mais seguras" icon={<ShieldCheck size={18} />} success />
        <SummaryCard eyebrow="tempo total" title={formatMinutes(computed.totalMinutes)} subtitle="do histórico vinculado" icon={<Clock3 size={18} />} />
      </div>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr' }}>
        <SectionCard eyebrow="progresso por disciplina" title="Cobertura do edital" subtitle="Percentual concluído por disciplina com tempo e questões já cruzados.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {ranked.map((disciplina) => (
              <div key={disciplina.id} className="pl-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{disciplina.nome}</h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>{disciplina.concluidosDisciplina}/{disciplina.topicos.length} concluídos • {disciplina.totalQuestoes} questões • {disciplina.minutesLabel}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-accent)', flexShrink: 0 }}>{disciplina.coberturaDisciplina}%</span>
                </div>
                <ProgressBar value={disciplina.coberturaDisciplina} tone={disciplina.coberturaDisciplina >= 70 ? 'green' : disciplina.coberturaDisciplina >= 45 ? 'blue' : 'red'} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="leitura estratégica" title="Interpretação do momento" subtitle="Mistura cobertura, prática e frequência recente para dizer onde está o gargalo.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <InterpretationCard label="Cobertura geral" value={`${computed.cobertura}%`} description={computed.cobertura >= 70 ? 'Boa parte do edital já foi percorrida.' : 'Ainda existe muito tópico em aberto no edital.'} tone={computed.cobertura >= 70 ? 'green' : 'blue'} />
            <InterpretationCard label="Precisão consolidada" value={`${computed.media}%`} description={computed.media >= 75 ? 'Base sólida e com boa leitura.' : computed.media >= 60 ? 'Base aceitável, mas ainda vulnerável.' : 'Base exposta e pedindo revisão urgente.'} tone={computed.media >= 75 ? 'green' : computed.media >= 60 ? 'blue' : 'red'} />
            <InterpretationCard label="Pressão executiva" value={computed.criticos.length > 10 ? 'Alta' : computed.criticos.length > 4 ? 'Média' : 'Controlada'} description={`Há ${computed.criticos.length} tópicos em zona crítica.`} tone={computed.criticos.length > 10 ? 'red' : computed.criticos.length > 4 ? 'gold' : 'green'} />
          </div>
        </SectionCard>
      </div>
    </section>
  );
}

function EstruturaSection({ disciplinas, selectedCourse }) {
  return (
    <section style={{ display: 'grid', gap: 24, gridTemplateColumns: '1.05fr 0.95fr' }}>
      <SectionCard eyebrow="arquitetura do edital" title="Mapa das frentes" subtitle="A estrutura vem do curso ativo do usuário e das disciplinas gerais conectadas a ele.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {disciplinas.map((disciplina) => (
            <div key={disciplina.id} className="pl-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <PriorityBadge value={disciplina.peso} small />
                <span className="pl-tag">{disciplina.plano || 'Geral'}</span>
              </div>
              <h4 style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 600, color: 'var(--pl-ink)' }}>{disciplina.nome}</h4>
              <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>{disciplina.totalSessions} sessões • {disciplina.minutesLabel}</p>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>Tópicos</span><span>{disciplina.topicos.length}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>Questões</span><span>{disciplina.totalQuestoes}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>Cobertura</span><span>{disciplina.coberturaDisciplina}%</span></div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="integração" title="Comportamento da área" subtitle="Resumo do que a tela está usando do resto do site.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SpecRow title="Curso ativo" text={selectedCourse?.nome || 'Sem curso selecionado'} />
          <SpecRow title="Disciplinas e tópicos" text="Somente o que você cadastrou em Planos, filtrado pelo curso selecionado (inclui matérias com plano Geral quando aplicável)." />
          <SpecRow title="Desempenho" text="Calculado a partir de acertos, erros e percentual já registrados em cada tópico." />
          <SpecRow title="Histórico" text="Tempo, sessões e última atividade vindos do histórico real do usuário." />
          <SpecRow title="Persistência" text="Curso selecionado, filtros e aba ativa continuam salvos para a próxima visita." />
        </div>
      </SectionCard>
    </section>
  );
}

function ConquistasSection({ computed }) {
  const unlocked = [
    computed.cobertura >= 25 && { title: 'Primeiro avanço', description: '25% do edital já coberto', tone: 'blue' },
    computed.media >= 70 && { title: 'Base confiável', description: 'Precisão média acima de 70%', tone: 'green' },
    computed.totalSessions >= 5 && { title: 'Histórico vivo', description: '5 sessões ligadas ao painel', tone: 'gold' },
  ].filter(Boolean);

  const locked = [
    { title: 'Radar blindado', description: 'Reduza os críticos para menos de 5', tone: 'slate' },
    { title: 'Cobertura forte', description: 'Bata 60% do edital concluído', tone: 'slate' },
    { title: 'Pressão controlada', description: 'Mantenha a última atividade em até 7 dias', tone: 'slate' },
  ];

  return (
    <section style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr' }}>
      <SectionCard eyebrow="selos conquistados" title="Conquistas liberadas" subtitle="Liberadas a partir dos dados reais do edital em questão.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {unlocked.length === 0 ? <EmptyAchievementCard /> : unlocked.map((item) => <AchievementCard key={item.title} {...item} unlocked />)}
        </div>
      </SectionCard>

      <SectionCard eyebrow="próximos selos" title="O que falta desbloquear" subtitle="Roadmap prático para os próximos ganhos do painel.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {locked.map((item) => <AchievementCard key={item.title} {...item} />)}
        </div>
      </SectionCard>
    </section>
  );
}

function EmptyState({ selectedCourse, hasEnrolledCourses, onOpenPlanos }) {
  if (!hasEnrolledCourses) {
    return (
      <div style={{ borderRadius: 20, border: '1px dashed var(--pl-rule-strong)', background: 'var(--pl-surface)', padding: '40px 32px', textAlign: 'center', boxShadow: 'var(--pl-sh-low)' }}>
        <div style={{ margin: '0 auto 16px', display: 'flex', width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-2)' }}>
          <BookOpen size={24} />
        </div>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)' }}>Nenhum curso para analisar</h3>
        <p style={{ margin: '8px auto 0', maxWidth: 460, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
          Este painel usa apenas os cursos que você cadastra em <strong style={{ color: 'var(--pl-ink)' }}>Planos</strong>. Adicione um plano para cruzar edital, disciplinas e seu desempenho.
        </p>
        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <button type="button" onClick={() => onOpenPlanos?.()} className="pl-btn pl-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Ir a Planos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 20, border: '1px dashed var(--pl-rule-strong)', background: 'var(--pl-surface)', padding: '40px 32px', textAlign: 'center', boxShadow: 'var(--pl-sh-low)' }}>
      <div style={{ margin: '0 auto 16px', display: 'flex', width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-2)' }}><BookOpen size={24} /></div>
      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)' }}>Ainda não há tópicos para este edital</h3>
      <p style={{ margin: '8px auto 0', maxWidth: 460, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
        O curso <strong style={{ color: 'var(--pl-ink)' }}>{selectedCourse?.nome || 'selecionado'}</strong> não tem tópicos vinculados à análise. Revise disciplinas e estrutura em Planos ou no cadastro do curso.
      </p>
      <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <button type="button" onClick={() => onOpenPlanos?.()} className="pl-btn pl-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          Ajustar em Planos
        </button>
        {selectedCourse?.editalUrl ? (
          <a
            href={selectedCourse.editalUrl}
            target="_blank"
            rel="noreferrer"
            className="pl-btn pl-btn-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <ExternalLink size={16} />
            Abrir edital (PDF)
          </a>
        ) : null}
      </div>
    </div>
  );
}

function SectionCard({ eyebrow, title, subtitle, children, action }) {
  return (
    <div className="pl-card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p className="pl-eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</p>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)' }}>{title}</h2>
          <p style={{ margin: '8px 0 0', maxWidth: 560, fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{subtitle}</p>
        </div>
        {action}
      </div>
      <div style={{ marginTop: 20 }}>{children}</div>
    </div>
  );
}

function SummaryCard({ eyebrow, title, subtitle, icon, danger, success }) {
  return (
    <div className="pl-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <p className="pl-eyebrow" style={{ margin: 0 }}>{eyebrow}</p>
        <span style={{ display: 'flex', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: danger ? 'var(--pl-danger-soft)' : success ? 'var(--pl-success-soft)' : 'var(--pl-accent-soft)', color: danger ? 'var(--pl-danger)' : success ? 'var(--pl-success)' : 'var(--pl-accent)' }}>{icon}</span>
      </div>
      <h3 className="pl-num" style={{ marginTop: 12, fontSize: 30, color: danger ? 'var(--pl-danger)' : 'var(--pl-ink)' }}>{title}</h3>
      <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>{subtitle}</p>
    </div>
  );
}

function FeatureSquare({ title, value, description, accent }) {
  const toneStyles = accent === 'red'
    ? { borderColor: 'var(--pl-danger)', background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)' }
    : accent === 'green'
    ? { borderColor: 'var(--pl-success)', background: 'var(--pl-success-soft)', color: 'var(--pl-success)' }
    : accent === 'gold'
    ? { borderColor: 'var(--pl-warn)', background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)' }
    : { borderColor: 'var(--pl-accent-ring)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' };
  return (
    <div style={{ borderRadius: 14, border: '1px solid', padding: 16, ...toneStyles }}>
      <p className="pl-eyebrow" style={{ margin: 0 }}>{title}</p>
      <h4 className="pl-num" style={{ marginTop: 12, fontSize: 22 }}>{value}</h4>
      <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{description}</p>
    </div>
  );
}

function SidebarMiniMetric({ label, value, hint }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{label}</p>
        <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--pl-ink)' }}>{value}</span>
      </div>
      <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>{hint}</p>
    </div>
  );
}

function QuickStep({ icon: Icon, title, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '10px 12px' }}>
      <span style={{ marginTop: 2, display: 'flex', width: 36, height: 36, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'var(--pl-surface)', color: 'var(--pl-accent)', boxShadow: 'var(--pl-sh-low)' }}><Icon size={16} /></span>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{title}</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>{description}</p>
      </div>
    </div>
  );
}

function PriorityBadge({ value, small }) {
  const toneClass = value === 'altissima' ? 'pl-tag pl-tag-danger' : value === 'alta' ? 'pl-tag pl-tag-warn' : value === 'media' ? 'pl-tag pl-tag-accent' : 'pl-tag pl-tag-success';
  return <span className={toneClass} style={{ fontSize: small ? 10 : 11, textTransform: 'uppercase', letterSpacing: '0.16em' }}>{priorityLabel(value)}</span>;
}

function MiniInfo({ label, value }) {
  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '12px 16px' }}>
      <p className="pl-eyebrow" style={{ margin: 0, marginBottom: 8 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{value}</p>
    </div>
  );
}

function ProgressBar({ value, tone = 'blue' }) {
  const fillColor = tone === 'red' ? 'var(--pl-danger)' : tone === 'green' ? 'var(--pl-success)' : 'var(--pl-accent)';
  return (
    <div style={{ height: 10, width: '100%', overflow: 'hidden', borderRadius: 999, background: 'var(--pl-bg-soft)' }}>
      <div style={{ height: '100%', borderRadius: 999, background: fillColor, width: `${clampPercent(value)}%` }} />
    </div>
  );
}

function CriticalListItem({ topic, index, onPractice }) {
  return (
    <div style={{ borderRadius: 14, border: '1px solid var(--pl-danger)', background: 'var(--pl-danger-soft)', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', minWidth: 0, alignItems: 'flex-start', gap: 16 }}>
          <div style={{ display: 'flex', height: 44, width: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'var(--pl-danger)', fontSize: 15, fontWeight: 600, color: '#fff' }}>{index}</div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--pl-danger)' }}>{topic.disciplinaNome}</p>
            <h4 style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic.nome}</h4>
            <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>{topic.totalQuestoes} questões • {topic.sessions} sessões • {topic.lastSeenLabel}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span className="pl-tag pl-tag-danger">{topic.percentual}%</span>
          <button type="button" onClick={onPractice} style={{ borderRadius: 10, background: 'var(--pl-danger)', padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', border: 'none', cursor: 'pointer' }}>Praticar</button>
        </div>
      </div>
    </div>
  );
}

function GuideStep({ step, title, description }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ borderRadius: 10, background: 'var(--pl-ink)', padding: '6px 10px', fontSize: 12, fontWeight: 600, color: 'var(--pl-bg)', flexShrink: 0 }}>{step}</span>
        <div>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{title}</h4>
          <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>{description}</p>
        </div>
      </div>
    </div>
  );
}

function InterpretationCard({ label, value, description, tone }) {
  const toneStyles = tone === 'green'
    ? { borderColor: 'var(--pl-success)', background: 'var(--pl-success-soft)', color: 'var(--pl-success)' }
    : tone === 'red'
    ? { borderColor: 'var(--pl-danger)', background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)' }
    : tone === 'gold'
    ? { borderColor: 'var(--pl-warn)', background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)' }
    : { borderColor: 'var(--pl-accent-ring)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' };
  return (
    <div style={{ borderRadius: 12, border: '1px solid', padding: 16, ...toneStyles }}>
      <p className="pl-eyebrow" style={{ margin: 0 }}>{label}</p>
      <h4 className="pl-num" style={{ marginTop: 12, fontSize: 22 }}>{value}</h4>
      <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{description}</p>
    </div>
  );
}

function SpecRow({ title, text }) {
  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '14px 16px' }}>
      <p className="pl-eyebrow" style={{ margin: 0, marginBottom: 8 }}>{title}</p>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>{text}</p>
    </div>
  );
}

function AchievementCard({ title, description, tone, unlocked }) {
  const toneStyles = unlocked
    ? tone === 'green'
      ? { borderColor: 'var(--pl-success)', background: 'var(--pl-success-soft)' }
      : tone === 'gold'
      ? { borderColor: 'var(--pl-warn)', background: 'var(--pl-warn-soft)' }
      : { borderColor: 'var(--pl-accent-ring)', background: 'var(--pl-accent-soft)' }
    : { borderColor: 'var(--pl-rule-2)', background: 'var(--pl-bg-soft)' };
  return (
    <div style={{ borderRadius: 14, border: '1px solid', padding: 16, ...toneStyles }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--pl-ink)' }}>{title}</h4>
          <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{description}</p>
        </div>
        <span style={{ borderRadius: 999, padding: '4px 10px', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', background: unlocked ? 'var(--pl-surface)' : 'var(--pl-rule-2)', color: unlocked ? 'var(--pl-ink)' : 'var(--pl-ink-3)', flexShrink: 0 }}>{unlocked ? 'Liberado' : 'Em rota'}</span>
      </div>
    </div>
  );
}

function EmptyAchievementCard() {
  return (
    <div style={{ borderRadius: 14, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--pl-ink)' }}>Sem selos ainda</h4>
      <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>As conquistas aparecem conforme o painel real vai ganhando tração.</p>
    </div>
  );
}

function TinyActionButton({ label, onClick, secondary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={secondary ? 'pl-btn pl-btn-sm pl-btn-ghost' : 'pl-btn pl-btn-sm pl-btn-primary'}
    >
      {label}
    </button>
  );
}
