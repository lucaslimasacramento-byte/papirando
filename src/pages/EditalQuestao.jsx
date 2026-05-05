import React, { useEffect, useMemo, useState } from 'react';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileSearch,
  Filter,
  Flame,
  History,
  LayoutDashboard,
  Layers3,
  PlayCircle,
  Search,
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
    <div className="min-h-screen w-full bg-[var(--bg-app)] p-4 text-slate-900 md:p-6 xl:p-8">
      <div className="app-main-shell mx-auto flex w-full max-w-[1320px] flex-col gap-6">
        <HeroSection computed={analytics} selectedCourse={selectedCourse} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,260px)_1fr] xl:items-start">
          <aside className="order-2 min-w-0 space-y-4 xl:order-1 xl:sticky xl:top-6">
            <SidebarPanel computed={analytics} currentCourseStats={currentCourseStats} nextCriticalTopic={nextCriticalTopic} />
          </aside>

          <main className="order-1 min-w-0 space-y-4 xl:order-2 xl:space-y-5">
            <EditalNavBlock
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedCourse={selectedCourse}
              courseOptions={courseOptions}
              selectedPlan={selectedPlan}
              setSelectedPlan={setSelectedPlan}
              hasTopics={analytics.totalTopicos > 0}
              onAttack={handleEditalAttack}
              onReviewStructure={() => setActiveTab('estrutura')}
            />
            <Toolbar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
              showOnlyPending={showOnlyPending}
              setShowOnlyPending={setShowOnlyPending}
            />
            {analytics.totalTopicos === 0 ? (
              <EmptyState
                selectedCourse={selectedCourse}
                hasEnrolledCourses={courseOptions.length > 0}
                onOpenPlanos={onOpenPlanos}
              />
            ) : (
              renderMainContent()
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function SidebarPanel({ computed, currentCourseStats, nextCriticalTopic }) {
  return (
    <>
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <ShieldCheck size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Status do edital</p>
            <h4 className="mt-1 text-base font-semibold tracking-tight text-slate-900">{currentCourseStats.status}</h4>
          </div>
        </div>
        <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500">{currentCourseStats.summary}</p>
        <div className="mt-4 space-y-2.5">
          <SidebarMiniMetric label="Cobertura" value={`${computed.cobertura}%`} hint="tópicos concluídos" />
          <SidebarMiniMetric label="Precisão média" value={`${computed.media}%`} hint="desempenho" />
          <SidebarMiniMetric label="Sessões" value={`${computed.totalSessions}`} hint="histórico cruzado" />
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Ritmo sugerido</p>
        <div className="mt-3 space-y-2.5">
          <QuickStep icon={Zap} title="1. Ataque o crítico" description={nextCriticalTopic ? nextCriticalTopic.nome : 'Selecione um curso com tópicos para começar.'} />
          <QuickStep icon={History} title="2. Revise o histórico" description={`Última atividade: ${computed.lastSeenLabel}.`} />
          <QuickStep icon={BarChart3} title="3. Releia o painel" description="A fila se reorganiza conforme você conclui e prática." />
        </div>
      </div>
    </>
  );
}

function HeroSection({ computed, selectedCourse }) {
  const planHint = selectedCourse?.nome || selectedCourse?.plan || 'Cadastre um curso em Planos';

  const kpis = useMemo(
    () => [
      { icon: TrendingUp, label: 'Cobertura', value: `${computed.cobertura}%`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { icon: BarChart3, label: 'Precisao media', value: `${computed.media}%`, color: 'text-blue-600', bg: 'bg-blue-50' },
      {
        icon: Layers3,
        label: 'Questoes',
        value: String(computed.totalQuestoes),
        color: computed.totalQuestoes === 0 ? 'text-orange-600' : 'text-indigo-600',
        bg: computed.totalQuestoes === 0 ? 'bg-orange-50' : 'bg-indigo-50',
      },
      { icon: Clock3, label: 'Tempo liquido', value: formatMinutes(computed.totalMinutes), color: 'text-violet-600', bg: 'bg-violet-50' },
    ],
    [computed.cobertura, computed.media, computed.totalQuestoes, computed.totalMinutes]
  );

  return (
    <div className="flex shrink-0 flex-col gap-4 animate-in fade-in duration-500">
      <PageHeadPremium
        icon={FileSearch}
        titleAs="h1"
        badge={
          <PageHeadPremiumBadge icon={BookOpen}>
            Analise de edital
          </PageHeadPremiumBadge>
        }
        title="Painel tatico do edital"
        subtitle={
          'Topicos cruzados com historico de estudo e desempenho em questoes — gargalos, revisoes e prioridades em um so lugar. Curso: ' +
          planHint
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="section-card flex items-center gap-3 py-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>
              <Icon size={18} className={color} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{label}</p>
              <p className={`mt-0.5 text-lg font-bold leading-none ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditalNavBlock({
  activeTab,
  setActiveTab,
  selectedCourse,
  courseOptions,
  selectedPlan,
  setSelectedPlan,
  hasTopics,
  onAttack,
  onReviewStructure,
}) {
  const attackLabel =
    courseOptions.length === 0 ? 'Ir a Planos' : !hasTopics ? 'Completar em Planos' : 'Iniciar ataque';

  const origemResumo =
    selectedCourse?.origem === 'catalogo'
      ? 'Importado'
      : selectedCourse?.origem === 'ia'
        ? 'IA'
        : 'Seu cadastro';

  return (
    <div className="rounded-[28px] border border-slate-200/90 bg-white p-3 shadow-[0_12px_40px_rgba(15,23,42,0.07)] ring-1 ring-slate-900/[0.03] md:p-4">
      <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Navegação</p>
      <div className="custom-scrollbar flex flex-wrap gap-1.5 gap-y-2 overflow-x-auto pb-0.5 md:flex-nowrap md:gap-2">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-bold transition sm:gap-2 sm:px-3 sm:text-xs md:text-sm ${
                isActive ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50/80 text-slate-600 hover:border-blue-100 hover:bg-blue-50/50 hover:text-blue-700'
              }`}
            >
              <Icon size={15} className="shrink-0 opacity-90 sm:h-4 sm:w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="my-3 h-px bg-slate-100" />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:justify-between lg:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 sm:max-w-[min(100%,22rem)] sm:pr-2">
              <label className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Plano / concurso
              </label>
              <p className="mt-0.5 truncate text-[10px] font-medium leading-snug text-slate-600 sm:text-[11px]">
                {(selectedCourse?.banca || 'A definir')} · {origemResumo}
              </p>
            </div>
            <div className="relative w-full shrink-0 sm:w-auto sm:min-w-[11rem] sm:max-w-[min(100%,20rem)]">
              <select
                value={courseOptions.length === 0 ? '' : selectedPlan}
                onChange={(event) => setSelectedPlan(event.target.value)}
                disabled={courseOptions.length === 0}
                className="w-full cursor-pointer appearance-none rounded-xl border border-blue-100 bg-blue-50/90 py-2 pl-3 pr-9 text-xs font-bold text-slate-800 shadow-sm outline-none transition hover:border-blue-200 hover:bg-blue-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                aria-label="Selecionar curso cadastrado em Planos"
              >
                {courseOptions.length === 0 ? (
                  <option value="">Nenhum curso em Planos</option>
                ) : (
                  courseOptions.map((item) => (
                    <option key={item.id} value={item.plan}>
                      {item.nome}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 opacity-80"
                aria-hidden
              />
            </div>
          </div>

          {selectedCourse?.editalUrl ? (
            <div className="flex flex-wrap items-center gap-1.5 sm:pl-1">
              <a
                href={selectedCourse.editalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-600 shadow-sm hover:border-blue-200 hover:text-blue-700 sm:text-xs"
              >
                <ExternalLink size={12} className="shrink-0 sm:h-3.5 sm:w-3.5" />
                PDF
              </a>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          <button
            type="button"
            onClick={onAttack}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-blue-700 sm:gap-2 sm:px-3.5 sm:text-sm"
          >
            <PlayCircle size={15} className="shrink-0 sm:h-[17px] sm:w-[17px]" />
            {attackLabel}
          </button>
          <button
            type="button"
            onClick={onReviewStructure}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/80 hover:text-blue-800 sm:gap-2 sm:text-sm"
          >
            <Layers3 size={15} className="shrink-0 sm:h-[17px] sm:w-[17px]" />
            Estrutura
          </button>
        </div>
      </div>

      {selectedCourse && !hasTopics ? (
        <p className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-[11px] font-medium leading-snug text-amber-900">
          <strong className="font-semibold">Edital sem tópicos aqui:</strong> abra <strong>Planos</strong> e confira se este curso tem disciplinas e tópicos ligados ao edital.
        </p>
      ) : null}
    </div>
  );
}

function Toolbar({ searchTerm, setSearchTerm, priorityFilter, setPriorityFilter, showOnlyPending, setShowOnlyPending }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] md:p-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar disciplina, tópico ou ponto vulnerável"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Filter size={16} className="shrink-0 text-slate-400" />
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none">
            <option value="todas">Todas as prioridades</option>
            <option value="altissima">Altíssima</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowOnlyPending((prev) => !prev)}
          className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${showOnlyPending ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          {showOnlyPending ? 'Somente pendentes' : 'Mostrar pendentes'}
        </button>
      </div>
    </section>
  );
}

function OverviewSection({ computed, disciplinas, onOpenDiscipline, onOpenHistory, onPracticeTopic, onRegisterStudy, setActiveTab }) {
  const topDisciplinas = [...disciplinas].sort((first, second) => first.avg - second.avg).slice(0, 4);

  return (
    <section className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <SectionCard eyebrow="visão geral" title="Radar executivo do edital" subtitle="Cruza cobertura, histórico e questões por tópico.">
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureSquare title="Zona de pressão" value={`${computed.criticos.length} pontos`} description="tópicos com baixa precisão ou pouca tração" accent="red" />
            <FeatureSquare title="Base consolidada" value={`${computed.fortes.length} pontos`} description="tópicos já respondendo bem" accent="green" />
            <FeatureSquare title="Tempo investido" value={formatMinutes(computed.totalMinutes)} description="tempo vindo do histórico real" accent="blue" />
            <FeatureSquare title="Leitura do momento" value={computed.media >= 70 ? 'Base aceitável' : 'Base vulnerável'} description="status derivado do cruzamento dos dados" accent="gold" />
          </div>
        </SectionCard>

        <SectionCard eyebrow="ataque imediato" title="As 4 disciplinas mais pressionadas" subtitle="As que combinam baixa precisão, atraso e tópicos em aberto." action={<button type="button" onClick={() => setActiveTab('disciplinas')} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Ver disciplinas</button>}>
          <div className="space-y-3">
            {topDisciplinas.map((disciplina) => (
              <div key={disciplina.id} className="rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{disciplina.plano || 'Geral'}</p>
                    <h4 className="mt-1 text-base font-semibold text-slate-900">{disciplina.nome}</h4>
                    <p className="mt-2 text-xs font-bold text-slate-500">{disciplina.topicos.length} tópicos • {disciplina.criticosDisciplina} críticos • {disciplina.minutesLabel}</p>
                  </div>

                  <div className="flex gap-2">
                    <TinyActionButton label="Abrir" onClick={() => onOpenDiscipline(disciplina)} />
                    <TinyActionButton label="Histórico" onClick={() => onOpenHistory(disciplina)} secondary />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <SectionCard eyebrow="fila tática" title="Pontos mais perigosos do edital" subtitle="Ordenados pela pressão real do estudo." action={<button type="button" onClick={() => setActiveTab('criticos')} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Abrir críticos</button>}>
          <div className="space-y-3">
            {computed.criticos.slice(0, 5).map((topic, index) => (
              <CriticalListItem key={topic.id} topic={topic} index={index + 1} onPractice={() => onPracticeTopic(topic)} />
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="fortes" title="Blocos já consolidados" subtitle="Onde a base já está respondendo com mais segurança.">
          <div className="space-y-3">
            {computed.fortes.slice(0, 5).map((topic) => (
              <div key={topic.id} className="rounded-[1.25rem] border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">{topic.disciplinaNome}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{topic.nome}</p>
                    <p className="mt-2 text-xs font-bold text-slate-500">{topic.totalQuestoes} questões • {topic.minutesLabel} • {topic.lastSeenLabel}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">{topic.percentual}%</span>
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
    <section className="space-y-4">
      {disciplinas.map((disciplina) => {
        const isOpen = expandedDiscipline === disciplina.id;
        return (
          <div key={disciplina.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <button type="button" onClick={() => setExpandedDiscipline(isOpen ? null : disciplina.id)} className={`flex w-full items-start justify-between gap-4 px-5 py-5 text-left transition ${isOpen ? 'bg-slate-50/80' : 'hover:bg-slate-50/60'}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{disciplina.plano || 'Geral'}</span>
                  <PriorityBadge value={disciplina.peso} />
                </div>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">{disciplina.nome}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">{disciplina.totalQuestoes} questões • {disciplina.totalSessions} sessões • {disciplina.lastSeenLabel}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <MiniInfo label="Precisão" value={`${disciplina.avg}%`} />
                  <MiniInfo label="Cobertura" value={`${disciplina.coberturaDisciplina}%`} />
                  <MiniInfo label="Pendentes" value={`${disciplina.pendentesDisciplina}`} />
                  <MiniInfo label="Tempo" value={disciplina.minutesLabel} />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <TinyActionButton label="Abrir" onClick={(event) => { event.stopPropagation(); onOpenDiscipline(disciplina); }} />
                <div className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500">{isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</div>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5">
                <div className="mb-4 flex flex-wrap gap-2">
                  <TinyActionButton label="Registrar estudo" onClick={() => onRegisterStudy(disciplina)} />
                  <TinyActionButton label="Abrir disciplina" onClick={() => onOpenDiscipline(disciplina)} secondary />
                </div>
                {disciplina.topicos.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-500">Nenhum tópico batendo com os filtros atuais.</div>
                ) : (
                  <div className="space-y-3">
                    {disciplina.topicos.slice().sort((first, second) => second.pressureScore - first.pressureScore).map((topic) => {
                      const danger = topic.pressureScore >= 65;
                      return (
                        <div key={topic.id} className={`rounded-[1.25rem] border p-4 ${danger ? 'border-red-100 bg-red-50/50' : 'border-slate-200 bg-white'}`}>
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-3">
                                <button type="button" onClick={() => onToggleTopic?.(topic.disciplinaId, topic.id)} className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${topic.concluido ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                                  <CheckCircle2 size={13} />
                                </button>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className={`text-sm font-semibold leading-relaxed ${topic.concluido ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{topic.nome}</p>
                                    <PriorityBadge value={topic.prioridade} small />
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                                    <span>{topic.totalQuestoes} questões</span>
                                    <span>{topic.sessions} sessões</span>
                                    <span>{topic.minutesLabel}</span>
                                    <span>{topic.lastSeenLabel}</span>
                                    <span className={danger ? 'text-red-600' : 'text-emerald-600'}>{topic.percentual}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <div className="w-full sm:w-[180px]">
                                <ProgressBar value={topic.percentual} tone={danger ? 'red' : topic.percentual >= 75 ? 'green' : 'blue'} />
                              </div>
                              <button type="button" onClick={() => onPracticeTopic(topic)} className={`rounded-[1rem] px-4 py-2.5 text-sm font-semibold ${danger ? 'bg-red-600 text-white' : 'border border-blue-100 bg-blue-50 text-blue-700'}`}>
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
    <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
      <SectionCard eyebrow="zona crítica" title="Fila inteligente de ataque" subtitle="Ordenada pela combinação entre baixa precisão, pendência e falta de tração.">
        <div className="space-y-3">
          {criticos.slice(0, 8).map((topic, index) => (
            <div key={topic.id} className="rounded-[1.25rem] border border-red-100 bg-red-50/60 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-base font-semibold text-white">{index + 1}</div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-600">{topic.disciplinaNome}</p>
                    <h4 className="mt-1 text-sm font-semibold text-slate-900">{topic.nome}</h4>
                    <p className="mt-2 text-xs font-bold text-slate-500">{topic.totalQuestoes} questões • {topic.sessions} sessões • prioridade {priorityLabel(topic.prioridade)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600">{topic.percentual}%</span>
                  <TinyActionButton label="Abrir disciplina" onClick={() => onOpenDiscipline({ id: topic.disciplinaId, nome: topic.disciplinaNome })} secondary />
                  <button type="button" onClick={() => onPracticeTopic(topic)} className="rounded-[1rem] bg-red-600 px-4 py-2.5 text-sm font-semibold text-white">
                    Resolver agora
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="modo leitura" title="Como usar essa tela sem se afogar" subtitle="A fila agora vem dos seus dados reais, então a decisão precisa seguir o sinal do painel.">
        <div className="grid gap-4">
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
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard eyebrow="tópicos totais" title={`${computed.totalTopicos}`} subtitle="mapeados no edital" icon={<BookOpen size={18} />} />
        <SummaryCard eyebrow="pendentes" title={`${computed.pendentes}`} subtitle="ainda sem consolidação" icon={<AlertCircle size={18} />} danger />
        <SummaryCard eyebrow="fortes" title={`${computed.fortes.length}`} subtitle="faixas mais seguras" icon={<ShieldCheck size={18} />} success />
        <SummaryCard eyebrow="tempo total" title={formatMinutes(computed.totalMinutes)} subtitle="do histórico vinculado" icon={<Clock3 size={18} />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard eyebrow="progresso por disciplina" title="Cobertura do edital" subtitle="Percentual concluído por disciplina com tempo e questões já cruzados.">
          <div className="space-y-4">
            {ranked.map((disciplina) => (
              <div key={disciplina.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{disciplina.nome}</h4>
                    <p className="text-xs font-bold text-slate-500">{disciplina.concluidosDisciplina}/{disciplina.topicos.length} concluídos • {disciplina.totalQuestoes} questões • {disciplina.minutesLabel}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-700">{disciplina.coberturaDisciplina}%</span>
                </div>
                <ProgressBar value={disciplina.coberturaDisciplina} tone={disciplina.coberturaDisciplina >= 70 ? 'green' : disciplina.coberturaDisciplina >= 45 ? 'blue' : 'red'} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="leitura estratégica" title="Interpretação do momento" subtitle="Mistura cobertura, prática e frequência recente para dizer onde está o gargalo.">
          <div className="grid gap-4">
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
    <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <SectionCard eyebrow="arquitetura do edital" title="Mapa das frentes" subtitle="A estrutura vem do curso ativo do usuário e das disciplinas gerais conectadas a ele.">
        <div className="grid gap-4 md:grid-cols-2">
          {disciplinas.map((disciplina) => (
            <div key={disciplina.id} className="rounded-[1.35rem] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge value={disciplina.peso} small />
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{disciplina.plano || 'Geral'}</span>
              </div>
              <h4 className="mt-3 text-base font-semibold text-slate-900">{disciplina.nome}</h4>
              <p className="mt-1 text-xs font-bold text-slate-500">{disciplina.totalSessions} sessões • {disciplina.minutesLabel}</p>
              <div className="mt-4 space-y-2 text-xs font-bold text-slate-500">
                <div className="flex items-center justify-between"><span>Tópicos</span><span>{disciplina.topicos.length}</span></div>
                <div className="flex items-center justify-between"><span>Questões</span><span>{disciplina.totalQuestoes}</span></div>
                <div className="flex items-center justify-between"><span>Cobertura</span><span>{disciplina.coberturaDisciplina}%</span></div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="integração" title="Comportamento da área" subtitle="Resumo do que a tela está usando do resto do site.">
        <div className="space-y-3">
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
    <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <SectionCard eyebrow="selos conquistados" title="Conquistas liberadas" subtitle="Liberadas a partir dos dados reais do edital em questão.">
        <div className="grid gap-4 sm:grid-cols-2">
          {unlocked.length === 0 ? <EmptyAchievementCard /> : unlocked.map((item) => <AchievementCard key={item.title} {...item} unlocked />)}
        </div>
      </SectionCard>

      <SectionCard eyebrow="próximos selos" title="O que falta desbloquear" subtitle="Roadmap prático para os próximos ganhos do painel.">
        <div className="grid gap-4 sm:grid-cols-2">
          {locked.map((item) => <AchievementCard key={item.title} {...item} />)}
        </div>
      </SectionCard>
    </section>
  );
}

function EmptyState({ selectedCourse, hasEnrolledCourses, onOpenPlanos }) {
  if (!hasEnrolledCourses) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.06)] md:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <BookOpen size={24} />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-slate-900">Nenhum curso para analisar</h3>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Este painel usa apenas os cursos que você cadastra em <strong className="font-semibold text-slate-700">Planos</strong>. Adicione um plano para cruzar edital, disciplinas e seu desempenho.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => onOpenPlanos?.()} className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold">
            Ir a Planos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.06)] md:p-10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><BookOpen size={24} /></div>
      <h3 className="mt-4 text-xl font-semibold text-slate-900">Ainda não há tópicos para este edital</h3>
      <p className="mt-2 text-sm font-semibold text-slate-500">
        O curso <strong className="font-semibold text-slate-800">{selectedCourse?.nome || 'selecionado'}</strong> não tem tópicos vinculados à análise. Revise disciplinas e estrutura em Planos ou no cadastro do curso.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => onOpenPlanos?.()} className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold">
          Ajustar em Planos
        </button>
        {selectedCourse?.editalUrl ? (
          <a
            href={selectedCourse.editalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-800"
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
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function SummaryCard({ eyebrow, title, subtitle, icon, danger, success }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${danger ? 'bg-red-50 text-red-600' : success ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-700'}`}>{icon}</span>
      </div>
      <h3 className={`mt-3 text-3xl font-semibold tabular-nums tracking-tight ${danger ? 'text-red-600' : 'text-slate-900'}`}>{title}</h3>
      <p className="mt-1.5 text-sm font-medium text-slate-500">{subtitle}</p>
    </div>
  );
}

function FeatureSquare({ title, value, description, accent }) {
  const tone = accent === 'red' ? 'border-red-100 bg-red-50/70 text-red-600' : accent === 'green' ? 'border-emerald-100 bg-emerald-50/70 text-emerald-600' : accent === 'gold' ? 'border-amber-100 bg-amber-50/70 text-amber-700' : 'border-blue-100 bg-blue-50/70 text-blue-600';
  return (
    <div className={`rounded-[1.4rem] border p-4 ${tone}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{title}</p>
      <h4 className="mt-3 text-2xl font-semibold">{value}</h4>
      <p className="mt-2 text-sm font-semibold text-slate-500">{description}</p>
    </div>
  );
}

function SidebarMiniMetric({ label, value, hint }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className="text-lg font-semibold text-slate-900">{value}</span>
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-400">{hint}</p>
    </div>
  );
}

function QuickStep({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2.5">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"><Icon size={16} /></span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function PriorityBadge({ value, small }) {
  const tone = value === 'altissima' ? 'border-red-200 bg-red-50 text-red-600' : value === 'alta' ? 'border-amber-200 bg-amber-50 text-amber-700' : value === 'media' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return <span className={`rounded-full border px-3 py-1 font-semibold uppercase tracking-[0.16em] ${small ? 'text-[10px]' : 'text-[11px]'} ${tone}`}>{priorityLabel(value)}</span>;
}

function MiniInfo({ label, value }) {
  return (
    <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ProgressBar({ value, tone = 'blue' }) {
  const color = tone === 'red' ? 'bg-red-500' : tone === 'green' ? 'bg-emerald-500' : 'bg-blue-600';
  return <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${color}`} style={{ width: `${clampPercent(value)}%` }} /></div>;
}

function CriticalListItem({ topic, index, onPractice }) {
  return (
    <div className="rounded-[1.25rem] border border-red-100 bg-red-50/60 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-base font-semibold text-white">{index}</div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-600">{topic.disciplinaNome}</p>
            <h4 className="mt-1 truncate text-sm font-semibold text-slate-900">{topic.nome}</h4>
            <p className="mt-2 text-xs font-bold text-slate-500">{topic.totalQuestoes} questões • {topic.sessions} sessões • {topic.lastSeenLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600">{topic.percentual}%</span>
          <button type="button" onClick={onPractice} className="rounded-[1rem] bg-red-600 px-4 py-2.5 text-sm font-semibold text-white">Praticar</button>
        </div>
      </div>
    </div>
  );
}

function GuideStep({ step, title, description }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">{step}</span>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function InterpretationCard({ label, value, description, tone }) {
  const styles = tone === 'green' ? 'border-emerald-100 bg-emerald-50/70 text-emerald-700' : tone === 'red' ? 'border-red-100 bg-red-50/70 text-red-600' : tone === 'gold' ? 'border-amber-100 bg-amber-50/70 text-amber-700' : 'border-blue-100 bg-blue-50/70 text-blue-700';
  return (
    <div className={`rounded-[1.3rem] border p-4 ${styles}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</p>
      <h4 className="mt-3 text-2xl font-semibold">{value}</h4>
      <p className="mt-2 text-sm font-semibold text-slate-500">{description}</p>
    </div>
  );
}

function SpecRow({ title, text }) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/70 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}

function AchievementCard({ title, description, tone, unlocked }) {
  const styles = unlocked ? tone === 'green' ? 'border-emerald-100 bg-emerald-50/80' : tone === 'gold' ? 'border-amber-100 bg-amber-50/80' : 'border-blue-100 bg-blue-50/80' : 'border-slate-200 bg-slate-50/80';
  return (
    <div className={`rounded-[1.4rem] border p-4 ${styles}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          <p className="mt-2 text-sm font-semibold text-slate-500">{description}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${unlocked ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-500'}`}>{unlocked ? 'Liberado' : 'Em rota'}</span>
      </div>
    </div>
  );
}

function EmptyAchievementCard() {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/80 p-4">
      <h4 className="text-base font-semibold text-slate-900">Sem selos ainda</h4>
      <p className="mt-2 text-sm font-semibold text-slate-500">As conquistas aparecem conforme o painel real vai ganhando tração.</p>
    </div>
  );
}

function TinyActionButton({ label, onClick, secondary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${secondary ? 'btn-secondary' : 'btn-primary'}`}
    >
      {label}
    </button>
  );
}
