import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns,
  MoreHorizontal,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { buildWeeklyStudyPlan, WEEKDAY_BLUEPRINT } from '../lib/weeklyPlanner';
import { mergeDisciplinesByCanonical } from '../lib/studyRecommendation';
import { supabase } from '../lib/supabase';
import Ciclos from './Ciclos';
import PageHeadPremium, {
  PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS,
  PAGE_HEAD_PREMIUM_TOGGLE_BUTTON_ACTIVE_CLASS,
  PAGE_HEAD_PREMIUM_TOGGLE_BUTTON_CLASS,
  PAGE_HEAD_PREMIUM_TOGGLE_GROUP_CLASS,
} from '../components/PageHeadPremium';
// Paleta procedural Papirando — veja src/lib/disciplineColors.js.
// Antes Planejamento e Ciclos duplicavam o mesmo array literal de ~50 cores
// pastel default; agora ambos consomem a mesma fonte warm-aligned.
import { PASTEL_SUBJECT_COLORS } from '../lib/disciplineColors';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const KANBAN_COLUMNS = [
  { id: 'todo', nome: 'A Fazer', cor: '#D6EAF8' },
  { id: 'doing', nome: 'Em Andamento', cor: '#FCF3CF' },
  { id: 'done', nome: 'Concluido', cor: '#D5F5E3' },
];

const DEFAULT_FILTERS = { sessao: true, revisao: true, questoes: true };
/** Evita reabrir o wizard em loop ao fechar sem salvar (persiste na aba). */
const PLANNING_WIZARD_DISMISSED_KEY = 'papirando_planning_wizard_dismissed';
const PLANNING_REMOVED_TASKS_KEY = 'papirando_planning_removed_tasks';
const DURATION_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];
const WEEKDAY_ORDER = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const TIME_PICKER_OPTIONS = Array.from({ length: 25 }, (_, index) => index * 30);
const PLANNING_TYPE_COLORS = {
  Sessao: '#CCE5FF',
  Revisao: '#BAFFC9',
  Questoes: '#FFDFBA',
  Blocos: '#EAF2F8',
};

class PlanningErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Falha desconhecida ao montar o planejamento.',
    };
  }

  componentDidCatch(error) {
    console.error('Falha ao renderizar Planejamento:', error);

    if (typeof window !== 'undefined') {
      const recoveryFlag = 'papirando_planning_recovered_once';
      const alreadyTried = window.sessionStorage.getItem(recoveryFlag) === '1';

      if (!alreadyTried) {
        window.sessionStorage.setItem(recoveryFlag, '1');
        [
          'papirando_planning_course_plans',
          'papirando_planning_subject_config',
          'papirando_planning_session_window',
          'papirando_weekly_availability',
          'papirando_study_planning_mode',
          'papirando_planning_task_status',
          'papirando_planning_removed_tasks',
        ].forEach((key) => window.localStorage.removeItem(key));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-shell">
          <div className="section-card max-w-[980px] border-amber-200/80 bg-amber-50/30 p-8">
          <div className="neutral-badge border-amber-200 bg-amber-50 text-amber-900">
            Planejamento em recuperacao
          </div>
          <h2 className="compact-title mt-4 text-2xl sm:text-3xl">
            Essa aba encontrou um dado antigo e foi protegida para não derrubar o site.
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-ink-500">
            Reabra a configuração do planejamento ou recarregue a página. A tela principal continua preservada e o app não cai mais inteiro.
          </p>
          {this.state.errorMessage ? (
            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Erro identificado: {this.state.errorMessage}
            </div>
          ) : null}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const DEFAULT_WIZARD_DATA = {
  tipo: 'ciclo',
  materias: [],
  pesos: {},
  horasSemana: 18,
  minSessao: '1h 30m',
  maxSessao: '2h 00m',
  diasSemana: { dom: false, seg: true, ter: true, qua: true, qui: true, sex: true, sab: false },
  horasPorDia: { dom: 0, seg: 4, ter: 4, qua: 4, qui: 4, sex: 4, sab: 0 },
};

export default function Planejamento(props) {
  return (
    <PlanningErrorBoundary>
      <PlanejamentoContent {...props} />
    </PlanningErrorBoundary>
  );
}

function PlanejamentoContent({
  currentUserId = '',
  targetContest = null,
  targetDisciplines = [],
  studyRecommendation = null,
  weeklyAvailability = [],
  setWeeklyAvailability,
  onOpenRecommendedDiscipline,
  onStartRecommendedSession,
  studyMode = 'fixo',
  setStudyMode,
  planningCourseOptions = [],
  planningCoursePlans = [],
  effectivePlanningCoursePlans = [],
  setPlanningCoursePlans,
  planningSubjectConfig = {},
  setPlanningSubjectConfig,
  planningSessionWindow = { minMinutes: 60, maxMinutes: 120 },
  setPlanningSessionWindow,
  planningAvailableDisciplines = [],
  subjectCatalog = [],
  setSelectedCoursePlan,
  externalCalendarEvents = [],
  sharedCalendarViewMode,
  setSharedCalendarViewMode,
  sharedCalendarDate,
  setSharedCalendarDate,
  cycleProps = {},
}) {
  const safeCourseOptions = useMemo(
    () => (Array.isArray(planningCourseOptions) ? planningCourseOptions.filter(Boolean) : []),
    [planningCourseOptions]
  );
  const safeTargetDisciplines = useMemo(
    () => (Array.isArray(targetDisciplines) ? targetDisciplines.filter(Boolean) : []),
    [targetDisciplines]
  );
  const safeSubjectCatalog = useMemo(
    () => (Array.isArray(subjectCatalog) ? subjectCatalog : []),
    [subjectCatalog]
  );
  const safePlanningSubjectConfig = useMemo(
    () =>
      planningSubjectConfig && typeof planningSubjectConfig === 'object' && !Array.isArray(planningSubjectConfig)
        ? planningSubjectConfig
        : {},
    [planningSubjectConfig]
  );
  const safePlanningSessionWindow = useMemo(
    () =>
      planningSessionWindow && typeof planningSessionWindow === 'object'
        ? {
            minMinutes: Number(planningSessionWindow.minMinutes || 60),
            maxMinutes: Number(planningSessionWindow.maxMinutes || 120),
            subjectsPerDay: Math.max(1, Math.min(3, Number(planningSessionWindow.subjectsPerDay || 2))),
          }
        : {
            minMinutes: 60,
            maxMinutes: 120,
            subjectsPerDay: 2,
          },
    [planningSessionWindow]
  );
  const safeCycleProps =
    cycleProps && typeof cycleProps === 'object' && !Array.isArray(cycleProps) ? cycleProps : {};
  const safeAvailability = useMemo(
    () => (Array.isArray(weeklyAvailability) ? weeklyAvailability : []),
    [weeklyAvailability]
  );
  const activePlans = useMemo(
    () =>
      Array.isArray(effectivePlanningCoursePlans) && effectivePlanningCoursePlans.length > 0
        ? effectivePlanningCoursePlans
        : Array.isArray(planningCoursePlans)
          ? planningCoursePlans
          : [],
    [effectivePlanningCoursePlans, planningCoursePlans]
  );
  const cycleSourceDisciplines = useMemo(() => {
    const selectedPlans = new Set(activePlans);
    const source =
      selectedPlans.size > 0
        ? planningAvailableDisciplines.filter((discipline) => selectedPlans.has(discipline?.plano))
        : planningAvailableDisciplines;

    return Array.isArray(source) ? source.filter(Boolean) : [];
  }, [planningAvailableDisciplines, activePlans]);
  const cycleCanonicalDisciplines = useMemo(() => {
    if (safeTargetDisciplines.length > 0) return safeTargetDisciplines;

    return mergeDisciplinesByCanonical({
      disciplines: cycleSourceDisciplines,
      subjectCatalog: safeSubjectCatalog,
    });
  }, [safeTargetDisciplines, cycleSourceDisciplines, safeSubjectCatalog]);
  const [agendaViewMode, setAgendaViewMode] = useState('kanban');
  const [localCalViewMode, setLocalCalViewMode] = useState('mes');
  const [localCurrentDate, setLocalCurrentDate] = useState(new Date());
  const [planningFilters, setPlanningFilters] = useState(DEFAULT_FILTERS);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [planningWizardAutoDismissed, setPlanningWizardAutoDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem(PLANNING_WIZARD_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardMode, setWizardMode] = useState(studyMode);
  const [wizardModeDraft, setWizardModeDraft] = useState(studyMode);
  const [wizardCoursePlans, setWizardCoursePlans] = useState([]);
  const [wizardSubjectState, setWizardSubjectState] = useState({});
  const [wizardHoursByDay, setWizardHoursByDay] = useState({});
  const [wizardMinDuration, setWizardMinDuration] = useState(Number(safePlanningSessionWindow.minMinutes || 60));
  const [wizardMaxDuration, setWizardMaxDuration] = useState(Number(safePlanningSessionWindow.maxMinutes || 120));
  const [wizardSubjectsPerDay, setWizardSubjectsPerDay] = useState(Number(safePlanningSessionWindow.subjectsPerDay || 2));
  const [kanbanMenuOpen, setKanbanMenuOpen] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState('');
  const [dragOverColumn, setDragOverColumn] = useState('');
  const [remotePlanningLoaded, setRemotePlanningLoaded] = useState(false);
  const calViewMode = sharedCalendarViewMode || localCalViewMode;
  const setCalViewMode = setSharedCalendarViewMode || setLocalCalViewMode;
  const currentDate = sharedCalendarDate || localCurrentDate;
  const setCurrentDate = setSharedCalendarDate || setLocalCurrentDate;
  const [taskStatusMap, setTaskStatusMap] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('papirando_planning_task_status') || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('papirando_planning_task_status', JSON.stringify(taskStatusMap));
  }, [taskStatusMap]);

  const [removedPlanningTaskIds, setRemovedPlanningTaskIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PLANNING_REMOVED_TASKS_KEY) || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(PLANNING_REMOVED_TASKS_KEY, JSON.stringify(removedPlanningTaskIds));
  }, [removedPlanningTaskIds]);

  useEffect(() => {
    setRemotePlanningLoaded(false);
  }, [currentUserId]);

  useEffect(() => {
    let ignore = false;

    const loadRemotePlanning = async () => {
      if (!currentUserId || remotePlanningLoaded) return;

      try {
        const mondayIso = getCurrentWeekMondayIso();

        const [{ data: availabilityRows, error: availabilityError }, goalsResult] = await Promise.all([
          supabase
            .from('weekly_availability')
            .select('*')
            .eq('user_id', currentUserId)
            .order('dia_semana', { ascending: true }),
          loadWeeklyGoalsForPlanning(currentUserId, mondayIso),
        ]);

        if (!ignore && !availabilityError && Array.isArray(availabilityRows) && availabilityRows.length > 0) {
          const hoursByDay = buildWizardHoursFromAvailabilityRows(availabilityRows);
          setWeeklyAvailability?.(buildAvailabilityFromWizardHours(hoursByDay, safePlanningSessionWindow));
        }

        if (!ignore && Array.isArray(goalsResult.rows) && goalsResult.rows.length > 0) {
          setPlanningSubjectConfig?.((prev) => {
            const next = { ...(prev || {}) };
            goalsResult.rows.forEach((goal) => {
              const discipline = String(
                goal?.disciplina || goal?.discipline || goal?.subject || ''
              ).trim();
              if (!discipline) return;
              next[discipline] = {
                selected: true,
                importance: Number(next[discipline]?.importance || 3),
                knowledge: Number(next[discipline]?.knowledge || 3),
                horasMeta: Number(goal?.horas_meta ?? goal?.meta_horas ?? 0),
                questoesMeta: Number(goal?.questoes_meta ?? 0),
              };
            });
            return next;
          });
        }
      } catch (error) {
        console.error('Erro ao carregar planejamento do Supabase:', error);
      } finally {
        if (!ignore) {
          setRemotePlanningLoaded(true);
        }
      }
    };

    loadRemotePlanning();

    return () => {
      ignore = true;
    };
  }, [
    currentUserId,
    remotePlanningLoaded,
    safePlanningSessionWindow,
    setPlanningSubjectConfig,
    setWeeklyAvailability,
  ]);

  useEffect(() => {
    if (
      !wizardOpen &&
      !planningWizardAutoDismissed &&
      safeCourseOptions.length > 0 &&
      (!Array.isArray(planningCoursePlans) || planningCoursePlans.length === 0)
    ) {
      const starterPlans =
        activePlans.length > 0
          ? activePlans
          : safeCourseOptions.slice(0, 1).map((course) => course.plano);

      setWizardMode(studyMode);
      setWizardModeDraft(studyMode);
      setWizardCoursePlans(starterPlans);
      setWizardHoursByDay(buildWizardHoursFromAvailability(safeAvailability));
      setWizardMinDuration(Number(safePlanningSessionWindow.minMinutes || 60));
      setWizardMaxDuration(Number(safePlanningSessionWindow.maxMinutes || 120));
      setWizardSubjectsPerDay(Number(safePlanningSessionWindow.subjectsPerDay || 2));
      setWizardStep(1);
      setWizardOpen(true);
    }
  }, [
    activePlans,
    planningCoursePlans,
    planningWizardAutoDismissed,
    safeAvailability,
    safeCourseOptions,
    safePlanningSessionWindow.maxMinutes,
    safePlanningSessionWindow.minMinutes,
    safePlanningSessionWindow.subjectsPerDay,
    studyMode,
    wizardOpen,
  ]);

  useEffect(() => {
    if (Array.isArray(planningCoursePlans) && planningCoursePlans.length > 0) {
      setPlanningWizardAutoDismissed(false);
      try {
        window.sessionStorage.removeItem(PLANNING_WIZARD_DISMISSED_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [planningCoursePlans]);

  const weeklyPlan = useMemo(
    () =>
      buildWeeklyStudyPlan({
        availability: safeAvailability,
        targetContest,
        targetDisciplines: safeTargetDisciplines,
        studyRecommendation,
      }),
    [safeAvailability, targetContest, safeTargetDisciplines, studyRecommendation]
  );

  const summary = weeklyPlan?.summary || {};
  const currentWeek = buildWeekDays(currentDate);
  const currentMonthGrid = buildMonthGrid(currentDate);
  const currentMonthDates = useMemo(
    () =>
      currentMonthGrid
        .filter((day) => day !== null)
        .map((day) => new Date(currentDate.getFullYear(), currentDate.getMonth(), Number(day))),
    [currentMonthGrid, currentDate]
  );
  const selectedCourseLabels = safeCourseOptions.filter((course) => activePlans.includes(course.plano));
  const activeDays = safeAvailability.filter((day) => day?.enabled).length;
  const turnosAtivos = safeAvailability.reduce(
    (acc, day) => acc + (day?.slots || []).filter((slot) => slot?.enabled && Number(slot?.minutes || 0) > 0).length,
    0
  );
  const rhythmPercent =
    Number(summary.requiredMinutesPerWeek || 0) > 0
      ? Math.max(0, Math.min(100, Math.round((Number(summary.weeklyMinutes || 0) / Number(summary.requiredMinutesPerWeek || 1)) * 100)))
      : 100;

  const sessionsByDay = useMemo(
    () => Object.fromEntries((weeklyPlan?.days || []).map((day) => [day.id, day.sessions || []])),
    [weeklyPlan]
  );

  const wizardSubjectPool = useMemo(() => {
    const source = planningAvailableDisciplines.filter((discipline) =>
      wizardCoursePlans.includes(discipline?.plano)
    );
    return mergeDisciplinesByCanonical({ disciplines: source, subjectCatalog: safeSubjectCatalog });
  }, [planningAvailableDisciplines, wizardCoursePlans, safeSubjectCatalog]);

  const planningSubjectColors = useMemo(() => {
    const names = [
      ...safeTargetDisciplines.map((discipline) => discipline?.nome),
      ...wizardSubjectPool.map((discipline) => discipline?.nome),
      ...(weeklyPlan?.days || []).flatMap((day) =>
        (day.sessions || []).map((session) => session?.discipline || session?.title || session?.recommendation?.nome)
      ),
    ];

    return buildStablePastelColorMap(names);
  }, [safeTargetDisciplines, wizardSubjectPool, weeklyPlan]);

  const calendarEvents = useMemo(() => {
    const dates = calViewMode === 'mes' ? currentMonthDates : currentWeek;
    const planningItems = dates.flatMap((date) => {
      const weekdayId = getWeekdayId(date);
      return (sessionsByDay[weekdayId] || []).map((session, index) => ({
        id: `${toDateKey(date)}-${session.id}-${index}`,
        titulo: session.title,
        data: toDateKey(date),
        hora: getSlotTimeLabel(session.slotId),
        tipo: getSessionType(session),
        cor: getSessionColor(session, index, planningSubjectColors),
        detail: session.detail,
        recommendation: session.recommendation || null,
      }));
    }).filter((item) => !removedPlanningTaskIds[item.id]);
    const externalItems = (Array.isArray(externalCalendarEvents) ? externalCalendarEvents : []).map((event, index) => ({
      id: event?.id || `external-${index}`,
      titulo: event?.titulo || event?.title || 'Lembrete',
      data: event?.data || event?.date || '',
      hora: event?.hora || event?.time || 'Agenda',
      tipo: event?.tipo || 'Concurso',
      cor: event?.cor || '#EAF2F8',
      detail: event?.detail || event?.descricao || '',
      recommendation: event?.recommendation || null,
      contestId: event?.contestId || '',
      disciplineName: event?.disciplineName || '',
    }));

    return [...planningItems, ...externalItems];
  }, [calViewMode, currentMonthDates, currentWeek, sessionsByDay, planningSubjectColors, externalCalendarEvents, removedPlanningTaskIds]);

  const filteredCalendarEvents = useMemo(
    () => calendarEvents.filter((event) => matchesFilter(event, planningFilters)),
    [calendarEvents, planningFilters]
  );

  const kanbanTasks = useMemo(() => {
    return currentWeek.flatMap((date) => {
      const weekdayId = getWeekdayId(date);
      return (sessionsByDay[weekdayId] || []).map((session, index) => {
        const taskId = `${toDateKey(date)}-${session.id}-${index}`;
        return {
          id: taskId,
          titulo: session.title,
          data: toDateKey(date),
          hora: getSlotTimeLabel(session.slotId),
          tipo: getSessionType(session),
          cor: getSessionColor(session, index, planningSubjectColors),
          detail: session.detail,
          recommendation: session.recommendation || null,
          status: taskStatusMap[taskId] || getDefaultTaskStatus(date),
        };
      });
    })
      .filter((task) => matchesFilter(task, planningFilters))
      .filter((task) => !removedPlanningTaskIds[task.id]);
  }, [currentWeek, sessionsByDay, taskStatusMap, planningFilters, planningSubjectColors, removedPlanningTaskIds]);

  useEffect(() => {
    if (!wizardOpen) return;

    setWizardSubjectState((prev) => {
      const next = { ...prev };
      wizardSubjectPool.forEach((discipline) => {
          const saved = safePlanningSubjectConfig[discipline.nome] || {};
        next[discipline.nome] = {
          selected:
            prev[discipline.nome]?.selected ??
            saved.selected ??
            true,
          importance: Number(prev[discipline.nome]?.importance ?? saved.importance ?? 3),
          knowledge: Number(prev[discipline.nome]?.knowledge ?? saved.knowledge ?? 3),
        };
      });
      return next;
    });
  }, [wizardOpen, wizardSubjectPool, safePlanningSubjectConfig]);

  const selectedWizardSubjects = wizardSubjectPool.filter(
    (discipline) => wizardSubjectState[discipline.nome]?.selected !== false
  );

  const subjectPriorityPreview = useMemo(() => {
    return selectedWizardSubjects
      .map((discipline) => {
        const config = wizardSubjectState[discipline.nome] || { importance: 3, knowledge: 3 };
        const score = Number(config.importance || 3) * (6 - Number(config.knowledge || 3));
        return {
          nome: discipline.nome,
          color:
            planningSubjectColors.get(normalizePlanningKey(discipline.nome)) ||
            PASTEL_SUBJECT_COLORS[0],
          score,
        };
      })
      .sort((first, second) => second.score - first.score);
  }, [selectedWizardSubjects, wizardSubjectState, planningSubjectColors]);

  const totalWizardMinutes = Object.values(wizardHoursByDay || {}).reduce(
    (acc, item) => acc + (item?.enabled ? Number(item.minutes || 0) : 0),
    0
  );

  function openWizard() {
    const starterPlans =
      activePlans.length > 0
        ? activePlans
        : safeCourseOptions.slice(0, 1).map((course) => course.plano);

    setWizardMode(studyMode);
    setWizardModeDraft(studyMode);
    setWizardCoursePlans(starterPlans);
    setWizardHoursByDay(buildWizardHoursFromAvailability(safeAvailability));
    setWizardMinDuration(Number(safePlanningSessionWindow.minMinutes || 60));
    setWizardMaxDuration(Number(safePlanningSessionWindow.maxMinutes || 120));
    setWizardSubjectsPerDay(Number(safePlanningSessionWindow.subjectsPerDay || 2));
    setWizardStep(1);
    setWizardOpen(true);
  }

  function closeWizard() {
    setWizardOpen(false);
    setWizardStep(1);
    setPlanningWizardAutoDismissed(true);
    try {
      window.sessionStorage.setItem(PLANNING_WIZARD_DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!wizardOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeWizard();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [wizardOpen]);

  function goToPreviousWizardStep() {
    setWizardStep((prev) => Math.max(1, prev - 1));
  }

  function goToNextWizardStep() {
    if (wizardStep === 1 && wizardCoursePlans.length === 0) return;
    if (wizardStep === 2 && selectedWizardSubjects.length === 0) return;
    if (wizardStep === 1) {
      setWizardMode(wizardModeDraft);
    }
    setWizardStep((prev) => Math.min(4, prev + 1));
  }

  async function saveWizardConfig() {
    if (wizardCoursePlans.length === 0 && safeCourseOptions.length > 0) return;

    const nextSubjectConfig = {};
    wizardSubjectPool.forEach((discipline) => {
      const config = wizardSubjectState[discipline.nome] || {};
      nextSubjectConfig[discipline.nome] = {
        selected: config.selected !== false,
        importance: Number(config.importance || 3),
        knowledge: Number(config.knowledge || 3),
      };
    });

    const nextSessionWindow = {
      minMinutes: Number(wizardMinDuration || 60),
      maxMinutes: Math.max(Number(wizardMaxDuration || 120), Number(wizardMinDuration || 60)),
      subjectsPerDay: Math.max(1, Math.min(3, Number(wizardSubjectsPerDay || 2))),
    };
    const nextAvailability = buildAvailabilityFromWizardHours(wizardHoursByDay, nextSessionWindow);

    setPlanningCoursePlans(wizardCoursePlans);
    setSelectedCoursePlan?.(wizardCoursePlans.length === 1 ? wizardCoursePlans[0] : 'Todos');
    setStudyMode?.(wizardMode);
    setPlanningSubjectConfig?.(nextSubjectConfig);
    setPlanningSessionWindow?.(nextSessionWindow);
    setWeeklyAvailability?.(nextAvailability);

    if (currentUserId) {
      try {
        await savePlanningToSupabase({
          userId: currentUserId,
          availability: nextAvailability,
          goals: buildWeeklyGoalsPayload({
            subjectPool: wizardSubjectPool,
            subjectConfig: nextSubjectConfig,
            totalWeeklyMinutes: totalWizardMinutes,
          }),
        });
      } catch (error) {
        console.error('Erro ao persistir planejamento no Supabase:', error);
      }
    }

    closeWizard();
  }

  function handleStatusChange(taskId, status) {
    setTaskStatusMap((prev) => ({ ...prev, [taskId]: status }));

    if (status !== 'Concluido' || !currentUserId) return;

    const relatedTask = kanbanTasks.find((task) => task.id === taskId);
    const disciplina = String(
      relatedTask?.recommendation?.nome ||
        relatedTask?.recommendation?.disciplina ||
        relatedTask?.titulo ||
        ''
    ).trim();

    if (!disciplina) return;

    markWeeklyGoalAsCompleted({
      userId: currentUserId,
      mondayIso: getCurrentWeekMondayIso(),
      disciplina,
    }).catch(console.warn);
  }

  function handleRemovePlanningTask(taskId) {
    if (!window.confirm('Remover este bloco do planejamento? Ele some do calendário e do quadro.')) return;
    setRemovedPlanningTaskIds((prev) => ({ ...prev, [taskId]: true }));
    setTaskStatusMap((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    setKanbanMenuOpen('');
    setDraggedTaskId('');
    setDragOverColumn('');
  }

  function handleDragStart(event, taskId) {
    setDraggedTaskId(taskId);
    event.dataTransfer.setData('text/plain', taskId);
  }

  function handleDrop(event, status) {
    event.preventDefault();
    if (!draggedTaskId) return;
    handleStatusChange(draggedTaskId, status);
    setDraggedTaskId('');
    setDragOverColumn('');
  }

  return (
    <div
      className={`page-shell animate-in fade-in duration-500 !pt-4 sm:!pt-5 ${
        studyMode === 'fixo' ? 'min-h-full pb-20' : 'h-full overflow-hidden pb-4'
      }`}
    >
      <PageHeadPremium
        className={`${studyMode === 'fixo' ? 'mb-6' : 'mb-3'} lg:!flex-row lg:!items-center lg:!justify-between`}
        icon={CalendarIcon}
        title="Planejamento"
        leadingClassName="items-center lg:max-w-[calc(100%-38rem)] xl:max-w-[50rem]"
        trailingWrapClassName="lg:ml-auto lg:w-auto lg:max-w-[37rem] lg:self-center"
        trailingClassName="xl:max-w-none xl:flex-none"
        subtitle={
          studyMode === 'fixo'
            ? 'Planeje por ciclo ou agenda fixa, sem duplicar matérias equivalentes entre cursos.'
            : undefined
        }
        trailing={
          <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain sm:w-auto sm:justify-end sm:gap-3 sm:overflow-visible">
            <div className={PAGE_HEAD_PREMIUM_TOGGLE_GROUP_CLASS}>
              <button
                type="button"
                onClick={openWizard}
                className={
                  studyMode === 'ciclo'
                    ? PAGE_HEAD_PREMIUM_TOGGLE_BUTTON_ACTIVE_CLASS
                    : PAGE_HEAD_PREMIUM_TOGGLE_BUTTON_CLASS
                }
              >
                <RotateCcw size={14} />
                Ciclo flexível
              </button>
              <button
                type="button"
                onClick={openWizard}
                className={
                  studyMode === 'fixo'
                    ? PAGE_HEAD_PREMIUM_TOGGLE_BUTTON_ACTIVE_CLASS
                    : PAGE_HEAD_PREMIUM_TOGGLE_BUTTON_CLASS
                }
              >
                <CalendarDays size={14} />
                Planejamento fixo
              </button>
            </div>

            {studyMode === 'fixo' ? (
              <div className={PAGE_HEAD_PREMIUM_TOGGLE_GROUP_CLASS}>
                <button
                  type="button"
                  onClick={() => setAgendaViewMode('calendario')}
                  className={
                    agendaViewMode === 'calendario'
                      ? PAGE_HEAD_PREMIUM_TOGGLE_BUTTON_ACTIVE_CLASS
                      : PAGE_HEAD_PREMIUM_TOGGLE_BUTTON_CLASS
                  }
                >
                  <CalendarDays size={14} />
                  Calendário
                </button>
                <button
                  type="button"
                  onClick={() => setAgendaViewMode('kanban')}
                  className={
                    agendaViewMode === 'kanban'
                      ? PAGE_HEAD_PREMIUM_TOGGLE_BUTTON_ACTIVE_CLASS
                      : PAGE_HEAD_PREMIUM_TOGGLE_BUTTON_CLASS
                  }
                >
                  <Columns size={14} />
                  Kanban
                </button>
              </div>
            ) : null}
          </div>
        }
      />

      {studyMode === 'fixo' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            <button
              onClick={openWizard}
              className={`${PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS} w-full text-base`}
            >
              <Sparkles size={20} strokeWidth={3} />
              Editar planejamento
            </button>

            <div className="section-card rounded-2xl p-5 flex flex-col gap-3">
              <h4 className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-2 border-b border-ink-100 pb-2">
                Filtros de exibição
              </h4>
              <FilterLine
                checked={planningFilters.sessao}
                onChange={() => setPlanningFilters((prev) => ({ ...prev, sessao: !prev.sessao }))}
                color={PLANNING_TYPE_COLORS.Sessao}
                label="Sessões de teoria"
              />
              <FilterLine
                checked={planningFilters.revisao}
                onChange={() => setPlanningFilters((prev) => ({ ...prev, revisao: !prev.revisao }))}
                color={PLANNING_TYPE_COLORS.Revisao}
                label="Revisões"
              />
              <FilterLine
                checked={planningFilters.questoes}
                onChange={() => setPlanningFilters((prev) => ({ ...prev, questoes: !prev.questoes }))}
                color={PLANNING_TYPE_COLORS.Questoes}
                label="Questões"
              />
            </div>

            <InfoCard
              title="Escopo salvo"
              items={[
                `${selectedCourseLabels.length} curso(s) no plano`,
                `${safeTargetDisciplines.length} matéria(s) únicas`,
                summary.weeklyLabel || '0h 00m por semana',
              ]}
            >
              <div className="flex flex-wrap gap-2">
                {selectedCourseLabels.length > 0 ? (
                  selectedCourseLabels.map((course) => (
                    <span
                      key={course.plano}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-ink-100 bg-blue-50 text-[#1d4ed8]"
                    >
                      {course.nome}
                    </span>
                  ))
                ) : (
                  <span className="text-sm font-semibold text-ink-500">Nenhum curso selecionado ainda.</span>
                )}
              </div>
            </InfoCard>

            <div className="surface-card rounded-[22px] p-5">
              <h4 className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-4 border-b border-ink-100 pb-2">
                Configurações do plano
              </h4>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink-600">{targetContest?.nome || 'Sem concurso-alvo'}</p>
                <p className="text-sm font-semibold text-ink-600">
                  Sessões de {formatMinutesShort(safePlanningSessionWindow.minMinutes)} a{' '}
                  {formatMinutesShort(safePlanningSessionWindow.maxMinutes)}
                </p>
                <p className="text-sm font-semibold text-ink-600">
                  {safePlanningSessionWindow.subjectsPerDay} matéria(s) por dia
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={openWizard}
                  className="inline-flex items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-[#1d4ed8] transition hover:border-blue-200 hover:bg-blue-100"
                >
                  Reabrir ajuste
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date())}
                  className="inline-flex items-center justify-center rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-bold text-ink-600 transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                >
                  Ir para hoje
                </button>
                <button
                  type="button"
                  onClick={() => setAgendaViewMode('calendario')}
                  className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-bold transition ${
                    agendaViewMode === 'calendario'
                      ? 'bg-[#1d4ed8] text-white shadow-sm'
                      : 'border border-ink-200 bg-white text-ink-600 hover:border-[#1d4ed8] hover:text-[#1d4ed8]'
                  }`}
                >
                  Calendário
                </button>
                <button
                  type="button"
                  onClick={() => setAgendaViewMode('kanban')}
                  className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-bold transition ${
                    agendaViewMode === 'kanban'
                      ? 'bg-[#1d4ed8] text-white shadow-sm'
                      : 'border border-ink-200 bg-white text-ink-600 hover:border-[#1d4ed8] hover:text-[#1d4ed8]'
                  }`}
                >
                  Kanban
                </button>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-[#1d4ed8]" style={{ width: `${rhythmPercent}%` }} />
              </div>
              <p className="mt-3 text-xs font-semibold leading-5 text-ink-500">
                A IA do plano consolida matérias iguais entre cursos antes de montar agenda e kanban.
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard
                title="Carga da semana"
                items={[
                  summary.weeklyLabel || '0h 00m',
                  `${summary.totalSessions || 0} bloco(s) planejados`,
                ]}
              />
              <InfoCard
                title="Tópicos em aberto"
                items={[
                  `${summary.pendingTopics || 0} pendente(s)`,
                  summary.requiredPerWeekLabel ? `${summary.requiredPerWeekLabel}/semana` : 'Ritmo livre',
                ]}
              />
              <InfoCard
                title="Leitura rápida"
                items={[
                  `${activeDays} dia(s) ativos`,
                  `${turnosAtivos} turno(s) ocupados`,
                  summary.paceLabel || 'Plano em montagem',
                ]}
              />
            </div>

            <div className="bg-white border border-ink-200 rounded-[2rem] shadow-sm overflow-hidden flex min-h-0 flex-1 flex-col">
            {agendaViewMode === 'calendario' && (
              <div className="flex flex-col h-full animate-in fade-in duration-300">
                <div className="p-6 border-b border-ink-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-ink-50/50">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                      <h3 className="text-2xl font-extrabold text-ink-800 capitalize min-w-[220px]">
                        {calViewMode === 'mes'
                          ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                          : `Semana de ${currentWeek[0].getDate()}/${currentWeek[0].getMonth() + 1}`}
                      </h3>
                      <div className="flex gap-1 bg-white border border-ink-200 p-1 rounded-xl shadow-sm">
                        <button
                          onClick={() => setCalViewMode('mes')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            calViewMode === 'mes' ? 'bg-blue-50 text-[#1d4ed8]' : 'text-ink-500 hover:bg-ink-50'
                          }`}
                        >
                          Mês
                        </button>
                        <button
                          onClick={() => setCalViewMode('semana')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            calViewMode === 'semana' ? 'bg-blue-50 text-[#1d4ed8]' : 'text-ink-500 hover:bg-ink-50'
                          }`}
                        >
                          Semana
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <TagPill label={`${filteredCalendarEvents.length} blocos`} color={PLANNING_TYPE_COLORS.Blocos} soft />
                      <TagPill
                        label={`${filteredCalendarEvents.filter((event) => event.tipo === 'Sessao').length} teoria`}
                        color={PLANNING_TYPE_COLORS.Sessao}
                        soft
                      />
                      <TagPill
                        label={`${filteredCalendarEvents.filter((event) => event.tipo === 'Revisao').length} revisões`}
                        color={PLANNING_TYPE_COLORS.Revisao}
                        soft
                      />
                      <TagPill
                        label={`${filteredCalendarEvents.filter((event) => event.tipo === 'Questoes').length} questões`}
                        color={PLANNING_TYPE_COLORS.Questoes}
                        soft
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                    {summary.paceLabel || 'Ritmo sob controle'}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => shiftCalendarDate(setCurrentDate, currentDate, calViewMode, -1)}
                      className="px-3 py-2 bg-white border border-ink-200 text-ink-600 rounded-xl font-bold text-sm shadow-sm hover:bg-ink-50 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="px-4 py-2 bg-white border border-ink-200 text-ink-600 rounded-xl font-bold text-sm shadow-sm hover:text-[#1d4ed8] hover:border-[#1d4ed8] transition-colors"
                    >
                      Hoje
                    </button>
                    <button
                      onClick={() => shiftCalendarDate(setCurrentDate, currentDate, calViewMode, 1)}
                      className="px-3 py-2 bg-white border border-ink-200 text-ink-600 rounded-xl font-bold text-sm shadow-sm hover:bg-ink-50 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {calViewMode === 'mes' ? (
                  <div className="flex-1 flex flex-col bg-ink-50">
                    <div className="grid grid-cols-7 border-b border-ink-200 bg-white shadow-sm z-10">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((label) => (
                        <div
                          key={label}
                          className="p-3 text-center text-[10px] font-semibold text-ink-500 uppercase tracking-widest border-r border-ink-100 last:border-0"
                        >
                          {label}
                        </div>
                      ))}
                    </div>

                    <div
                      className="flex-1 grid grid-cols-7 bg-ink-200 gap-[1px]"
                      style={{ gridTemplateRows: `repeat(${Math.ceil(currentMonthGrid.length / 7)}, minmax(104px, 1fr))` }}
                    >
                      {currentMonthGrid.map((day, index) => {
                        const valid = day !== null;
                        const date = valid
                          ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                          : null;
                        const dateKey = valid ? toDateKey(date) : '';
                        const events = valid
                          ? filteredCalendarEvents.filter((event) => event.data === dateKey)
                          : [];
                        const isToday = valid ? dateKey === toDateKey(new Date()) : false;

                        return (
                          <div
                            key={`${dateKey || 'blank'}-${index}`}
                            className={`bg-white p-2 flex flex-col transition-colors overflow-hidden group relative ${
                              !valid ? 'bg-ink-50/50' : 'hover:bg-blue-50/30'
                            }`}
                          >
                            {valid ? (
                              <>
                                <div className="flex justify-between items-start mb-2">
                                  <span
                                    className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                                      isToday ? 'bg-[#1d4ed8] text-white shadow-md' : 'text-ink-600'
                                    }`}
                                  >
                                    {day}
                                  </span>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 relative z-10">
                                  {events.map((event) => (
                                    <button
                                      key={event.id}
                                      onClick={() => handlePlanAction(event, 'open', onOpenRecommendedDiscipline, onStartRecommendedSession)}
                                      className="w-full px-2 py-1.5 rounded-lg border border-white/40 text-[10px] font-bold text-ink-900 shadow-sm truncate text-left hover:-translate-y-0.5 transition-transform flex items-center gap-1.5"
                                      style={{ backgroundColor: event.cor }}
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-ink-900/20 shrink-0" />
                                      <span className="truncate">{event.hora} - {event.titulo}</span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col bg-ink-50 overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-ink-200 bg-white shadow-sm z-10">
                      {currentWeek.map((date) => {
                        const dateKey = toDateKey(date);
                        const isToday = dateKey === toDateKey(new Date());
                        return (
                          <div key={dateKey} className="p-3 text-center border-r border-ink-100 last:border-0">
                            <div className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-1">
                              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][date.getDay()]}
                            </div>
                            <div
                              className={`mx-auto w-8 h-8 flex items-center justify-center rounded-full text-lg font-semibold ${
                                isToday ? 'bg-[#1d4ed8] text-white shadow-md' : 'text-ink-800'
                              }`}
                            >
                              {date.getDate()}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex-1 grid grid-cols-7 bg-ink-200 gap-[1px]">
                      {currentWeek.map((date) => {
                        const dateKey = toDateKey(date);
                        const events = filteredCalendarEvents.filter((event) => event.data === dateKey);

                        return (
                          <div key={dateKey} className="bg-white p-2 flex flex-col transition-colors hover:bg-blue-50/20">
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mt-2">
                              {events.map((event) => (
                                <button
                                  key={event.id}
                                  onClick={() => handlePlanAction(event, 'start', onOpenRecommendedDiscipline, onStartRecommendedSession)}
                                  className="w-full p-2.5 rounded-xl border border-ink-100 shadow-sm bg-white text-left hover:shadow-md transition-all border-l-4"
                                  style={{ borderLeftColor: event.cor }}
                                >
                                  <div className="text-[10px] font-bold text-ink-500 mb-1 flex items-center gap-1">
                                    <Clock size={10} />
                                    {event.hora}
                                  </div>
                                  <div className="text-xs font-bold text-ink-800 leading-snug">{event.titulo}</div>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    <span
                                      className="text-[8px] font-semibold uppercase px-1.5 py-0.5 rounded border border-white/40 text-ink-900"
                                      style={{ backgroundColor: event.cor }}
                                    >
                                      {event.tipo}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {agendaViewMode === 'kanban' && (
              <div className="flex min-h-0 flex-1 flex-col animate-in fade-in duration-300 bg-ink-50">
                <div className="shrink-0 border-b border-ink-200 bg-white px-4 py-3 md:px-5 md:py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base md:text-lg font-extrabold text-ink-800 flex items-center gap-2">
                      <Columns size={18} className="text-[#1d4ed8] shrink-0" />
                      Quadro de Etapas
                    </h3>
                    <p className="text-[11px] md:text-xs font-semibold text-ink-500 leading-snug mt-0.5">
                      Arraste entre colunas. Cartões compactos para ver o quadro sem rolar a página.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-56 shrink-0 bg-ink-50 px-3 py-2 rounded-xl border border-ink-100 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-[#D5F5E3] text-ink-900 flex items-center justify-center shrink-0">
                      <Check size={16} strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[9px] font-bold text-ink-500 uppercase tracking-widest mb-1">
                        <span>Concluídas</span>
                        <span className="text-ink-900">{buildKanbanProgress(kanbanTasks)}%</span>
                      </div>
                      <div className="w-full bg-ink-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${buildKanbanProgress(kanbanTasks)}%`, backgroundColor: '#D5F5E3' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid min-h-0 min-w-0 flex-1 grid-cols-3 gap-3 px-3 py-3 md:gap-4 md:px-4 md:py-3 items-stretch">
                  {KANBAN_COLUMNS.map((column) => {
                    const tasks = kanbanTasks.filter((task) => task.status === column.nome);
                    const isActiveDrop = dragOverColumn === column.nome;

                    return (
                      <div
                        key={column.id}
                        className="flex min-h-0 min-w-0 flex-col"
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragOverColumn(column.nome);
                        }}
                        onDragLeave={() => setDragOverColumn('')}
                        onDrop={(event) => handleDrop(event, column.nome)}
                      >
                        <div
                          className="bg-white rounded-t-xl px-3 py-2 border border-ink-200 border-b-0 flex justify-between items-center shrink-0 shadow-sm z-10"
                          style={{ borderTopWidth: '3px', borderTopColor: column.cor }}
                        >
                          <h4 className="text-sm font-extrabold text-ink-800">{column.nome}</h4>
                          <span className="bg-ink-100 text-ink-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {tasks.length}
                          </span>
                        </div>

                        <div
                          className={`min-h-0 flex-1 border border-ink-200 border-t-0 rounded-b-xl p-2 overflow-y-auto custom-scrollbar space-y-2 transition-colors duration-200 ${
                            isActiveDrop ? 'border-dashed border-2 brightness-95' : ''
                          }`}
                          style={{ backgroundColor: `${column.cor}15` }}
                        >
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(event) => handleDragStart(event, task.id)}
                              className={`bg-white rounded-lg p-2 shadow-sm border border-ink-200 cursor-grab active:cursor-grabbing hover:shadow transition-all group relative overflow-visible ${
                                task.status === 'Concluido' ? 'opacity-70 hover:opacity-100' : ''
                              }`}
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: task.cor }} />
                              <div className="pl-1.5 pr-14">
                                <div className="flex flex-wrap gap-1 mb-1">
                                  <span
                                    className="text-[8px] font-semibold uppercase tracking-wide px-1.5 py-px rounded border border-white/40 text-ink-900 shadow-sm"
                                    style={{ backgroundColor: task.cor }}
                                  >
                                    {task.tipo}
                                  </span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStatusChange(
                                        task.id,
                                        task.status === 'Concluido' ? 'A Fazer' : 'Concluido'
                                      )
                                    }
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-px transition-colors ${
                                      task.status === 'Concluido'
                                        ? 'bg-[#D5F5E3] border-[#D5F5E3] text-ink-900'
                                        : 'border-ink-300 text-transparent hover:border-[#D5F5E3]'
                                    }`}
                                  >
                                    <Check size={10} strokeWidth={4} />
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <h5
                                      className={`font-bold text-[11px] leading-tight ${
                                        task.status === 'Concluido' ? 'text-ink-400 line-through' : 'text-ink-800'
                                      }`}
                                    >
                                      {task.titulo}
                                    </h5>
                                    <p className="mt-0.5 text-[10px] text-ink-500 line-clamp-2 leading-snug">{task.detail}</p>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center gap-2 mt-1.5 border-t border-ink-50 pt-1.5">
                                  <div className="flex items-center gap-1 text-[10px] font-semibold text-ink-500 min-w-0">
                                    <CalendarIcon size={10} className="shrink-0" />
                                    <span className="truncate">
                                      {formatDateShort(task.data)} / {task.hora}
                                    </span>
                                  </div>
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.cor }} />
                                </div>
                              </div>

                              <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onMouseDown={(event) => event.stopPropagation()}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleRemovePlanningTask(task.id);
                                  }}
                                  className="text-ink-400 hover:text-red-600 p-1 bg-white/90 rounded-md border border-transparent hover:border-red-100 transition-all opacity-80 group-hover:opacity-100"
                                  title="Excluir bloco"
                                >
                                  <Trash2 size={14} strokeWidth={2.25} />
                                </button>
                                <button
                                  type="button"
                                  onMouseDown={(event) => event.stopPropagation()}
                                  onClick={() => setKanbanMenuOpen(kanbanMenuOpen === task.id ? '' : task.id)}
                                  className="text-ink-400 hover:text-[#1d4ed8] p-1 bg-white/90 rounded-md border border-transparent hover:border-ink-200 transition-all opacity-80 group-hover:opacity-100"
                                  title="Mais ações"
                                >
                                  <MoreHorizontal size={15} />
                                </button>
                                {kanbanMenuOpen === task.id ? (
                                  <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-ink-100 z-[100] py-1 overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => handlePlanAction(task, 'start', onOpenRecommendedDiscipline, onStartRecommendedSession)}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-ink-700 hover:bg-blue-50 hover:text-[#1d4ed8] flex items-center gap-2 transition-colors"
                                    >
                                      <Play size={14} />
                                      Iniciar sessão
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handlePlanAction(task, 'open', onOpenRecommendedDiscipline, onStartRecommendedSession)}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-ink-700 hover:bg-blue-50 hover:text-[#1d4ed8] flex items-center gap-2 transition-colors"
                                    >
                                      <Target size={14} />
                                      Abrir disciplina
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePlanningTask(task.id)}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-ink-50"
                                    >
                                      <Trash2 size={14} />
                                      Excluir bloco
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}

                          {tasks.length === 0 && !isActiveDrop ? (
                            <div className="h-16 flex items-center justify-center border-2 border-dashed border-ink-300/50 rounded-lg text-ink-500/70 text-[10px] font-bold">
                              Sem blocos
                            </div>
                          ) : null}

                          {isActiveDrop ? (
                            <div className="h-16 flex items-center justify-center border-2 border-dashed border-[#1d4ed8] bg-[#1d4ed8]/10 rounded-lg text-[#1d4ed8] text-[10px] font-bold shadow-inner">
                              Soltar aqui
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden">
          <div className="rounded-[1.15rem] border border-ink-100 bg-white px-3.5 py-2.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[1.05rem] font-semibold tracking-tight text-ink-900">Ciclo flexível</h2>
                  <span className="text-[0.92rem] font-medium text-ink-500">
                    Ideal para rotina variável, estudo sem dias fixos e prioridade automática das matérias mais importantes.
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={safeCycleProps.onRestartCycle}
                  disabled={!Array.isArray(safeCycleProps.activeCycle) || safeCycleProps.activeCycle.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1d4ed8] px-3.5 py-2 text-[0.92rem] font-bold text-white shadow-sm transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw size={16} />
                  Recomeçar Ciclo
                </button>
                <button
                  type="button"
                  onClick={openWizard}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1d4ed8] px-3.5 py-2 text-[0.92rem] font-bold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]"
                >
                  Replanejar
                </button>
                <button
                  type="button"
                  onClick={safeCycleProps.onRemoveCycle}
                  disabled={!Array.isArray(safeCycleProps.activeCycle) || safeCycleProps.activeCycle.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1d4ed8] px-3.5 py-2 text-[0.92rem] font-bold text-white shadow-sm transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
          {safeCycleProps?.showCycleGuide ? (
          <div className="rounded-[1.6rem] border border-ink-100 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <TagPill label="Ciclo flexível" color="#1d4ed8" soft />
                  <TagPill label={targetContest?.nome || 'Sem alvo'} color="#1d4ed8" soft />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h2 className="text-[1.65rem] font-semibold tracking-tight text-ink-900">Ciclo flexível</h2>
                  <span className="text-sm font-medium text-ink-500">Ideal para rotina variável e estudo sem dias fixos.</span>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="rounded-[1rem] border border-ink-200 bg-[#F8FAFD] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">Melhor para quem</p>
                    <p className="mt-1 text-sm leading-6 text-ink-600">Tem rotina variável, turnos instáveis ou precisa seguir a fila de matérias sem prender o estudo ao calendário.</p>
                  </div>
                  <div className="rounded-[1rem] border border-ink-200 bg-[#F8FAFD] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">Quando usar o fixo</p>
                    <p className="mt-1 text-sm leading-6 text-ink-600">Quando a semana é previsível e você prefere enxergar matéria por dia no planejamento.</p>
                  </div>
                </div>
              </div>
              {typeof safeCycleProps.onResetCycle === 'function' ? (
                <button
                  type="button"
                  onClick={safeCycleProps.onResetCycle}
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 shadow-sm transition-colors hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                >
                  <RotateCcw size={16} />
                  Reiniciar ciclo
                </button>
              ) : null}
            </div>
          </div>
          ) : null}

          <Ciclos
            {...safeCycleProps}
            bancoDisciplinas={cycleSourceDisciplines}
            targetContest={targetContest}
            targetDisciplines={cycleCanonicalDisciplines}
            studyRecommendation={studyRecommendation}
            embedded
          />
        </div>
      )}

      {wizardOpen ? (
        <div className="fixed inset-0 z-[120]">
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            onClick={closeWizard}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
          <div
            className="relative z-10 flex max-h-[86vh] w-full max-w-[880px] flex-col overflow-hidden rounded-[1.5rem] border border-ink-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-ink-100 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeWizard}
                className="absolute right-4 top-4 rounded-lg p-1 text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
                aria-label="Fechar configuração do planejamento"
              >
                <X size={22} />
              </button>
              <h3 className="text-2xl font-extrabold text-ink-700">Editar Planejamento</h3>
              <WizardStepper step={wizardStep} />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {wizardStep === 1 ? (
              <div>
                <p className="text-center text-base leading-7 text-ink-600 sm:text-lg">
                  Para iniciar o seu planejamento, escolha a melhor forma de visualização para você:
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <WizardModeCard
                    active={wizardModeDraft === 'ciclo'}
                    icon={<RotateCcw size={62} className="text-[#1d4ed8]" />}
                    title="Ciclo de Estudos"
                    text="Estude as disciplinas em uma ordem rotativa, sem depender de dias fixos. Ideal para quem precisa de flexibilidade na rotina."
                    onClick={() => setWizardModeDraft('ciclo')}
                  />
                  <WizardModeCard
                    active={wizardModeDraft === 'fixo'}
                    icon={<CalendarDays size={62} className="text-[#1d4ed8]" />}
                    title="Planejamento Semanal"
                    text="Defina dias certos para cada frente de estudo e acompanhe tudo em calendário e kanban."
                    onClick={() => setWizardModeDraft('fixo')}
                  />
                </div>

                <div className="mt-5 rounded-[1.25rem] border border-ink-200 bg-ink-50 p-4">
                  <p className="text-center text-sm font-medium text-ink-600 sm:text-base">
                    Escolha quais cursos entram no escopo desse planejamento:
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {safeCourseOptions.map((course) => (
                      <button
                        type="button"
                        key={course.plano}
                        onClick={() =>
                          setWizardCoursePlans((prev) =>
                            prev.includes(course.plano)
                              ? prev.filter((item) => item !== course.plano)
                              : [...prev, course.plano]
                          )
                        }
                        className={`rounded-xl border px-4 py-3 text-left transition ${
                          wizardCoursePlans.includes(course.plano)
                            ? 'border-[#1d4ed8] bg-blue-50'
                            : 'border-ink-200 bg-white hover:border-ink-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-base font-bold text-ink-800">{course.nome}</p>
                            <p className="mt-1 text-sm text-ink-500">{course.concurso || course.plano}</p>
                          </div>
                          {course.isTarget ? <TagPill label="Alvo" color="#1d4ed8" soft /> : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {wizardStep === 2 ? (
              <div>
                <p className="text-center text-base leading-7 text-ink-600 sm:text-lg">
                  Selecione quais das suas <strong>disciplinas</strong> você deseja colocar no seu <strong>planejamento</strong>.
                </p>
                <div className="mt-5 max-h-[300px] overflow-y-auto custom-scrollbar rounded-[1.25rem] border border-ink-200 bg-ink-50 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    {wizardSubjectPool.map((discipline) => {
                      const selected = wizardSubjectState[discipline.nome]?.selected !== false;
                      return (
                        <button
                          type="button"
                          key={discipline.nome}
                          onClick={() =>
                            setWizardSubjectState((prev) => ({
                              ...prev,
                              [discipline.nome]: {
                                ...(prev[discipline.nome] || {}),
                                selected: !selected,
                                 importance: Number(prev[discipline.nome]?.importance || safePlanningSubjectConfig[discipline.nome]?.importance || 3),
                                 knowledge: Number(prev[discipline.nome]?.knowledge || safePlanningSubjectConfig[discipline.nome]?.knowledge || 3),
                              },
                            }))
                          }
                          className={`rounded-xl border px-4 py-3 text-center text-sm font-semibold transition sm:text-base ${
                            selected ? 'border-[#1d4ed8] bg-blue-50 text-ink-900' : 'border-ink-200 bg-white text-ink-500'
                          }`}
                        >
                          {discipline.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {wizardStep === 3 ? (
              <div>
                <p className="text-center text-base leading-7 text-ink-600 sm:text-lg">
                  Para cada disciplina, selecione a <strong>importancia</strong> para a prova e o seu <strong>grau de conhecimento</strong>.
                </p>
                <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar rounded-[1.25rem] border border-ink-200 bg-ink-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedWizardSubjects.map((discipline) => {
                        const config = wizardSubjectState[discipline.nome] || { importance: 3, knowledge: 3 };
                        return (
                          <div key={discipline.nome} className="rounded-2xl bg-white p-4 shadow-sm">
                            <p className="text-base font-semibold text-ink-700 text-center">{discipline.nome}</p>
                            <div className="mt-4">
                              <label className="text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-400">Importancia</label>
                              <div className="mt-2 flex items-center gap-3">
                                <input
                                  type="range"
                                  min="1"
                                  max="5"
                                  step="1"
                                  value={config.importance}
                                  onChange={(event) =>
                                    setWizardSubjectState((prev) => ({
                                      ...prev,
                                      [discipline.nome]: {
                                        ...config,
                                        importance: Number(event.target.value),
                                      },
                                    }))
                                  }
                                  className="w-full accent-[#1d4ed8]"
                                />
                                <span className="w-6 text-right font-bold text-ink-700">{config.importance}</span>
                              </div>
                            </div>
                            <div className="mt-4">
                              <label className="text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-400">Conhecimento</label>
                              <div className="mt-2 flex items-center gap-3">
                                <input
                                  type="range"
                                  min="1"
                                  max="5"
                                  step="1"
                                  value={config.knowledge}
                                  onChange={(event) =>
                                    setWizardSubjectState((prev) => ({
                                      ...prev,
                                      [discipline.nome]: {
                                        ...config,
                                        knowledge: Number(event.target.value),
                                      },
                                    }))
                                  }
                                  className="w-full accent-[#1d4ed8]"
                                />
                                <span className="w-6 text-right font-bold text-ink-700">{config.knowledge}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar rounded-[1.25rem] border border-ink-200 bg-ink-50 p-4 space-y-3">
                    {subjectPriorityPreview.map((discipline) => (
                      <div
                        key={discipline.nome}
                        className="rounded-2xl px-4 py-3 text-sm font-semibold text-ink-700 sm:text-base"
                        style={{ backgroundColor: `${discipline.color}35`, borderLeft: `4px solid ${discipline.color}` }}
                      >
                        <div className="flex items-center gap-4">
                          <span className="min-w-[36px] text-base font-bold">{discipline.score}</span>
                          <span>{discipline.nome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {wizardStep === 4 ? (
              <div>
                <p className="text-center text-base leading-7 text-ink-600 sm:text-lg">
                  Quais dias e quantas horas pretende estudar?
                </p>
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {WEEKDAY_ORDER.map((dayId) => {
                    const dayBlueprint = WEEKDAY_BLUEPRINT.find((day) => day.id === dayId);
                    const current = wizardHoursByDay[dayId] || { enabled: false, minutes: 0 };
                    return (
                      <div key={dayId} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={current.enabled}
                          onChange={() =>
                            setWizardHoursByDay((prev) => ({
                              ...prev,
                              [dayId]: { ...current, enabled: !current.enabled },
                            }))
                          }
                          className="w-4 h-4"
                        />
                        <span className="w-[56px] rounded-lg bg-ink-400 px-3 py-1.5 text-center text-base font-semibold text-white">
                          {String(dayBlueprint?.shortLabel || '').toUpperCase()}
                        </span>
                        <select
                          value={Number(current.minutes || 0)}
                          onChange={(event) =>
                            setWizardHoursByDay((prev) => ({
                              ...prev,
                              [dayId]: {
                                enabled: current.enabled || Number(event.target.value) > 0,
                                minutes: Number(event.target.value),
                              },
                            }))
                          }
                          className="w-[92px] rounded-lg border border-ink-300 px-3 py-2 text-sm"
                        >
                          {TIME_PICKER_OPTIONS.map((minutes) => (
                            <option key={minutes} value={minutes}>
                              {formatHalfHourTime(minutes)}
                            </option>
                          ))}
                        </select>
                        <span className="text-sm text-ink-600">horas diarias</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-2xl bg-blue-50 px-5 py-3 text-right text-lg font-semibold text-ink-900 sm:text-xl">
                  Total na Semana: {formatMinutes(totalWizardMinutes)}
                </div>

                <div className="mt-6">
                  <p className="text-base text-ink-600 sm:text-lg">
                    Quantas matérias deseja encaixar por dia?
                  </p>
                  <div className="mt-3 inline-flex rounded-xl border border-ink-200 bg-ink-50 p-1">
                    {[1, 2, 3].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setWizardSubjectsPerDay(count)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                          wizardSubjectsPerDay === count ? 'bg-[#1d4ed8] text-white shadow-sm' : 'text-ink-600 hover:bg-white'
                        }`}
                      >
                        {count} matéria{count > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-sm font-medium leading-6 text-ink-500">
                    O app usa esse numero para distribuir blocos de teoria e aproveitar o tempo que sobrar com revisao ou questoes.
                  </p>
                </div>

                <div className="mt-6">
                  <p className="text-base text-ink-600 sm:text-lg">
                    Qual minimo e maximo de tempo que deseja estudar uma mesma disciplina?
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <select
                      value={wizardMinDuration}
                      onChange={(event) => setWizardMinDuration(Number(event.target.value))}
                      className="min-w-[120px] border-b-2 border-[#1d4ed8] bg-transparent px-2 py-2 text-lg text-ink-700 outline-none"
                    >
                      {DURATION_OPTIONS.map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {formatMinutesShort(minutes)}
                        </option>
                      ))}
                    </select>
                    <span className="text-lg text-ink-500">a</span>
                    <select
                      value={wizardMaxDuration}
                      onChange={(event) => setWizardMaxDuration(Number(event.target.value))}
                      className="min-w-[120px] border-b-2 border-[#1d4ed8] bg-transparent px-2 py-2 text-lg text-ink-700 outline-none"
                    >
                      {DURATION_OPTIONS.filter((minutes) => minutes >= wizardMinDuration).map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {formatMinutesShort(minutes)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-6 text-ink-500">
                    Se o dia não fechar exatamente com a duração mínima, o restante vira bloco complementar de revisão ou questões.
                  </p>
                </div>
              </div>
            ) : null}

            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-5 py-4 sm:px-6">
              <button type="button" onClick={closeWizard} className="btn-secondary text-sm">
                {wizardStep === 1 ? 'Agora não' : 'Cancelar'}
              </button>
              <div className="flex flex-wrap items-center justify-end gap-3">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={goToPreviousWizardStep}
                    className="rounded-xl border-2 border-[#1d4ed8] px-5 py-2.5 text-sm font-semibold text-[#1d4ed8]"
                  >
                    Voltar
                  </button>
                ) : null}

                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={goToNextWizardStep}
                    disabled={
                      (wizardStep === 1 && wizardCoursePlans.length === 0) ||
                      (wizardStep === 2 && selectedWizardSubjects.length === 0)
                    }
                    className="rounded-xl bg-[#1d4ed8] px-5 py-2.5 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50"
                  >
                    Proximo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={saveWizardConfig}
                    disabled={wizardCoursePlans.length === 0}
                    className="rounded-xl bg-[#1d4ed8] px-5 py-2.5 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50"
                  >
                    Concluir
                  </button>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterLine({ checked, onChange, color, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded border-ink-300 cursor-pointer" />
      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: color }} />
      <span className="text-sm font-semibold text-ink-700 group-hover:text-ink-900 transition-colors">{label}</span>
    </label>
  );
}

function InfoCard({ title, items, children }) {
  return (
    <div className="bg-white border border-ink-200 rounded-[1.5rem] p-6 shadow-sm">
      <h4 className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-4 border-b border-ink-100 pb-2">{title}</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm font-semibold text-ink-600">{item}</p>
        ))}
      </div>
      {children}
    </div>
  );
}

function CycleInfoCard({ title, text }) {
  return (
    <div className="rounded-[1.5rem] border border-ink-100 bg-[#F8FAFC] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">{title}</p>
      <p className="mt-3 text-sm font-semibold leading-6 text-ink-600">{text}</p>
    </div>
  );
}

function TagPill({ label, color, soft = false }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
      style={{
        backgroundColor: soft ? `${color}15` : color,
        color: soft ? color : '#FFFFFF',
        border: soft ? `1px solid ${color}30` : 'none',
      }}
    >
      {label}
    </span>
  );
}

function WizardStepper({ step }) {
  const steps = ['Organizacao', 'Disciplinas', 'Relevancia', 'Horarios'];

  return (
    <div className="mt-5 flex items-center justify-center gap-2 md:gap-4">
      {steps.map((label, index) => {
        const number = index + 1;
        const active = step === number;
        const done = step > number;

        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg font-bold ${
                  active || done ? 'border-[#1d4ed8] bg-[#1d4ed8] text-white' : 'border-ink-400 text-ink-400'
                }`}
              >
                {String(number).padStart(2, '0')}
              </div>
              <span className={`text-xs sm:text-sm ${active ? 'font-bold text-ink-700' : 'text-ink-500'}`}>{label}</span>
            </div>
            {number < steps.length ? <div className="hidden md:block h-[2px] w-16 bg-ink-300" /> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function WizardModeCard({ active, icon, title, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1.2rem] border text-left overflow-hidden transition ${
        active ? 'border-[#1d4ed8] shadow-[0_0_0_1px_#1d4ed8_inset]' : 'border-ink-300'
      }`}
    >
      <div className="flex h-36 items-center justify-center bg-white">{icon}</div>
      <div className={`p-5 ${active ? 'bg-blue-50' : 'bg-white'}`}>
        <p className="text-xl font-semibold text-ink-700">{title}</p>
        <p className="mt-2 text-sm leading-7 text-ink-600">{text}</p>
      </div>
    </button>
  );
}

function getCurrentWeekMondayIso() {
  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function mapWeekdayIdToNumber(dayId) {
  const order = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
  return order[dayId] ?? 0;
}

function mapWeekdayNumberToId(dayNumber) {
  const order = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const parsed = Number(dayNumber);
  return order[Number.isFinite(parsed) ? parsed : 0] || 'dom';
}

function minutesToTimeString(totalMinutes) {
  const safeMinutes = Math.max(0, Number(totalMinutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function diffMinutesBetweenTimes(start, end) {
  const parse = (value) => {
    const [hours, minutes] = String(value || '00:00').split(':').map(Number);
    return Number(hours || 0) * 60 + Number(minutes || 0);
  };

  return Math.max(0, parse(end) - parse(start));
}

function buildWizardHoursFromAvailabilityRows(rows = []) {
  return Object.fromEntries(
    WEEKDAY_ORDER.map((dayId) => {
      const dayRows = (Array.isArray(rows) ? rows : []).filter(
        (row) => mapWeekdayNumberToId(row?.dia_semana) === dayId
      );
      const minutes = dayRows.reduce(
        (acc, row) => acc + diffMinutesBetweenTimes(row?.hora_inicio, row?.hora_fim),
        0
      );

      return [
        dayId,
        {
          enabled: minutes > 0,
          minutes,
        },
      ];
    })
  );
}

function buildWeeklyGoalsPayload({ subjectPool = [], subjectConfig = {}, totalWeeklyMinutes = 0 }) {
  const selected = (Array.isArray(subjectPool) ? subjectPool : []).filter(
    (discipline) => subjectConfig?.[discipline.nome]?.selected !== false
  );

  if (selected.length === 0) return [];

  const weighted = selected.map((discipline) => {
    const config = subjectConfig?.[discipline.nome] || {};
    const weight = Math.max(1, Number(config.importance || 3) * (6 - Number(config.knowledge || 3)));
    return { discipline, weight };
  });
  const totalWeight = weighted.reduce((acc, item) => acc + item.weight, 0) || 1;

  return weighted.map(({ discipline, weight }) => {
    const hoursMeta = Number(((Number(totalWeeklyMinutes || 0) / 60) * (weight / totalWeight)).toFixed(1));
    return {
      disciplina: discipline.nome,
      horas_meta: hoursMeta,
      questoes_meta: Math.max(0, Math.round(hoursMeta * 10)),
    };
  });
}

async function loadWeeklyGoalsForPlanning(userId, mondayIso) {
  const primary = await supabase
    .from('weekly_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('semana_inicio', mondayIso);

  if (!primary.error) {
    return { rows: primary.data || [] };
  }

  const fallback = await supabase
    .from('weekly_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', mondayIso);

  if (fallback.error) throw fallback.error;
  return { rows: fallback.data || [] };
}

async function savePlanningToSupabase({ userId, availability = [], goals = [] }) {
  await supabase.from('weekly_availability').delete().eq('user_id', userId);

  const availabilityPayload = (Array.isArray(availability) ? availability : [])
    .filter((day) => day?.enabled)
    .map((day) => {
      const totalMinutes = (Array.isArray(day?.slots) ? day.slots : []).reduce(
        (acc, slot) => acc + (slot?.enabled ? Number(slot.minutes || 0) : 0),
        0
      );

      return {
        user_id: userId,
        dia_semana: mapWeekdayIdToNumber(day.id),
        hora_inicio: '08:00',
        hora_fim: minutesToTimeString(8 * 60 + totalMinutes),
      };
    })
    .filter((row) => diffMinutesBetweenTimes(row.hora_inicio, row.hora_fim) > 0);

  if (availabilityPayload.length > 0) {
    const { error: availabilityError } = await supabase
      .from('weekly_availability')
      .insert(availabilityPayload);

    if (availabilityError) throw availabilityError;
  }

  const mondayIso = getCurrentWeekMondayIso();
  const goalsPayload = (Array.isArray(goals) ? goals : []).map((goal) => ({
    user_id: userId,
    semana_inicio: mondayIso,
    disciplina: goal.disciplina,
    horas_meta: goal.horas_meta,
    questoes_meta: goal.questoes_meta,
  }));

  if (goalsPayload.length === 0) return;

  await supabase.from('weekly_goals').delete().eq('user_id', userId).eq('semana_inicio', mondayIso);

  const primary = await supabase
    .from('weekly_goals')
    .upsert(goalsPayload, { onConflict: 'user_id,semana_inicio,disciplina' });

  if (!primary.error) return;

  await supabase.from('weekly_goals').delete().eq('user_id', userId).eq('week_start', mondayIso);

  const fallbackPayload = goalsPayload.map((goal) => ({
    user_id: goal.user_id,
    week_start: goal.semana_inicio,
    disciplina: goal.disciplina,
    meta_horas: goal.horas_meta,
    updated_at: new Date().toISOString(),
  }));

  const fallback = await supabase
    .from('weekly_goals')
    .upsert(fallbackPayload, { onConflict: 'user_id,week_start,disciplina' });

  if (fallback.error) throw fallback.error;
}

async function markWeeklyGoalAsCompleted({ userId, mondayIso, disciplina }) {
  const primary = await supabase
    .from('weekly_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('semana_inicio', mondayIso)
    .eq('disciplina', disciplina)
    .limit(1)
    .maybeSingle();

  if (!primary.error && primary.data) {
    const targetMinutes =
      Number(primary.data.meta_minutos || 0) ||
      Math.round(Number(primary.data.horas_meta || 0) * 60) ||
      Math.round(Number(primary.data.meta_horas || 0) * 60);

    if (targetMinutes > 0) {
      await supabase
        .from('weekly_goals')
        .update({ concluido_minutos: targetMinutes })
        .eq('user_id', userId)
        .eq('semana_inicio', mondayIso)
        .eq('disciplina', disciplina);
    }
    return;
  }

  const fallback = await supabase
    .from('weekly_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', mondayIso)
    .eq('disciplina', disciplina)
    .limit(1)
    .maybeSingle();

  if (fallback.error || !fallback.data) return;

  const targetMinutes =
    Number(fallback.data.meta_minutos || 0) ||
    Math.round(Number(fallback.data.horas_meta || 0) * 60) ||
    Math.round(Number(fallback.data.meta_horas || 0) * 60);

  if (targetMinutes <= 0) return;

  await supabase
    .from('weekly_goals')
    .update({ concluido_minutos: targetMinutes })
    .eq('user_id', userId)
    .eq('week_start', mondayIso)
    .eq('disciplina', disciplina);
}

function matchesFilter(item, filters) {
  if (item.tipo === 'Concurso' || item.tipo === 'Lembrete') return true;
  if (item.tipo === 'Revisao' && !filters.revisao) return false;
  if (item.tipo === 'Questoes' && !filters.questoes) return false;
  if (item.tipo === 'Sessao' && !filters.sessao) return false;
  return true;
}

function normalizePlanningKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hashPlanningKey(value) {
  const normalized = normalizePlanningKey(value);
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) % 2147483647;
  }
  return hash;
}

function buildStablePastelColorMap(values = []) {
  const uniqueNames = [...new Set((Array.isArray(values) ? values : []).map(normalizePlanningKey).filter(Boolean))];
  const usedIndexes = new Set();
  const colorMap = new Map();

  uniqueNames.sort().forEach((name) => {
    if (usedIndexes.size >= PASTEL_SUBJECT_COLORS.length) {
      const hue = hashPlanningKey(name) % 360;
      colorMap.set(name, `hsl(${hue} 58% 86%)`);
      return;
    }

    let index = hashPlanningKey(name) % PASTEL_SUBJECT_COLORS.length;
    while (usedIndexes.has(index)) {
      index = (index + 1) % PASTEL_SUBJECT_COLORS.length;
    }

    usedIndexes.add(index);
    colorMap.set(name, PASTEL_SUBJECT_COLORS[index]);
  });

  return colorMap;
}

function getSessionType(session) {
  if (session?.modeLabel === 'Revisao') return 'Revisao';
  if (session?.modeLabel === 'Questoes') return 'Questoes';
  return 'Sessao';
}

function getSessionColor(session, index, colorMap) {
  const subjectName =
    session?.recommendation?.nome ||
    session?.discipline ||
    session?.title ||
    session?.titulo ||
    '';
  const mappedColor = colorMap?.get(normalizePlanningKey(subjectName));
  if (mappedColor) return mappedColor;

  const type = getSessionType(session);
  if (type === 'Revisao') return PLANNING_TYPE_COLORS.Revisao;
  if (type === 'Questoes') return PLANNING_TYPE_COLORS.Questoes;
  return PASTEL_SUBJECT_COLORS[index % PASTEL_SUBJECT_COLORS.length];
}

function getSlotTimeLabel(slotId) {
  if (slotId === 'manha') return '08:00';
  if (slotId === 'tarde') return '14:00';
  return '19:00';
}

function buildWeekDays(reference) {
  const start = new Date(reference);
  start.setDate(reference.getDate() - reference.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function buildMonthGrid(reference) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

function shiftCalendarDate(setDate, currentDate, mode, direction) {
  const next = new Date(currentDate);
  if (mode === 'mes') next.setMonth(next.getMonth() + direction);
  else next.setDate(next.getDate() + direction * 7);
  setDate(next);
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateShort(value) {
  const parts = String(value || '').split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : '';
}

function getWeekdayId(date) {
  return WEEKDAY_ORDER[date.getDay()];
}

function getDefaultTaskStatus(date) {
  const today = new Date();
  const diff = new Date(toDateKey(date)).getTime() - new Date(toDateKey(today)).getTime();
  if (diff < 0) return 'Concluido';
  if (diff === 0) return 'Em Andamento';
  return 'A Fazer';
}

function buildKanbanProgress(tasks) {
  const total = tasks.length;
  if (total === 0) return 0;
  const done = tasks.filter((task) => task.status === 'Concluido').length;
  return Math.round((done / total) * 100);
}

function handlePlanAction(item, mode, onOpenRecommendedDiscipline, onStartRecommendedSession) {
  if (mode === 'start' && item?.recommendation) {
    onStartRecommendedSession?.(item.recommendation);
    return;
  }

  onOpenRecommendedDiscipline?.(item?.recommendation || item?.titulo || item?.title || '');
}

function buildWizardHoursFromAvailability(availability) {
  return Object.fromEntries(
    WEEKDAY_ORDER.map((dayId) => {
      const day = (availability || []).find((item) => item.id === dayId);
      const totalMinutes = (day?.slots || []).reduce(
        (acc, slot) => acc + (slot?.enabled ? Number(slot.minutes || 0) : 0),
        0
      );

      return [
        dayId,
        {
          enabled: Boolean(day?.enabled && totalMinutes > 0),
          minutes: totalMinutes,
        },
      ];
    })
  );
}

function buildAvailabilityFromWizardHours(hoursByDay, sessionOptions = {}) {
  return WEEKDAY_BLUEPRINT.map((day) => {
    const config = hoursByDay?.[day.id] || { enabled: false, minutes: 0 };
    const slots = distributeMinutesAcrossSlots(config.enabled ? Number(config.minutes || 0) : 0, sessionOptions);

    return {
      ...day,
      enabled: config.enabled && Number(config.minutes || 0) > 0,
      slots,
    };
  });
}

function distributeMinutesAcrossSlots(totalMinutes, sessionOptions = {}) {
  const total = roundToThirtyMinutes(totalMinutes);
  const minMinutes = Math.max(30, roundToThirtyMinutes(sessionOptions.minMinutes || 60));
  const maxMinutes = Math.max(minMinutes, roundToThirtyMinutes(sessionOptions.maxMinutes || 120));
  const subjectsPerDay = Math.max(1, Math.min(3, Number(sessionOptions.subjectsPerDay || 2)));
  const slotTemplates = [
    { id: 'manha', label: 'Bloco 1' },
    { id: 'tarde', label: 'Bloco 2' },
    { id: 'noite', label: 'Bloco 3' },
  ];

  const emptySlots = slotTemplates.map((slot) => ({
    ...slot,
    enabled: false,
    minutes: 0,
    modeHint: 'teoria',
  }));

  if (total <= 0) return emptySlots;

  const sessions = [];
  let remaining = total;
  const theoryTarget = Math.min(subjectsPerDay, 3);

  for (let index = 0; index < theoryTarget && remaining >= minMinutes; index += 1) {
    sessions.push({
      modeHint: 'teoria',
      label: `Materia ${index + 1}`,
      minutes: minMinutes,
    });
    remaining -= minMinutes;
  }

  if (sessions.length === 0) {
    sessions.push({
      modeHint: total >= 45 ? 'questoes' : 'revisao',
      label: total >= 45 ? 'Questoes' : 'Revisao',
      minutes: total,
    });
    remaining = 0;
  }

  while (remaining >= 30) {
    const expandableIndex = sessions.findIndex(
      (session) => session.modeHint === 'teoria' && session.minutes + 30 <= maxMinutes
    );

    if (expandableIndex !== -1 && (remaining < minMinutes || sessions.length >= 3)) {
      sessions[expandableIndex].minutes += 30;
      remaining -= 30;
      continue;
    }

    if (sessions.length < 3) {
      const supportMode = remaining >= 45 ? 'questoes' : 'revisao';
      sessions.push({
        modeHint: supportMode,
        label: supportMode === 'questoes' ? 'Questoes' : 'Revisao',
        minutes: remaining,
      });
      remaining = 0;
      break;
    }

    if (expandableIndex !== -1) {
      sessions[expandableIndex].minutes += 30;
      remaining -= 30;
      continue;
    }

    sessions[sessions.length - 1].minutes += remaining;
    remaining = 0;
  }

  return slotTemplates.map((slot, index) => {
    const session = sessions[index];
    return {
      ...slot,
      label: session?.label || slot.label,
      enabled: Boolean(session?.minutes),
      minutes: Number(session?.minutes || 0),
      modeHint: session?.modeHint || 'teoria',
    };
  });
}

function roundToThirtyMinutes(minutes) {
  const total = Number(minutes || 0);
  return Math.max(0, Math.round(total / 30) * 30);
}

function formatHalfHourTime(minutes) {
  const total = Number(minutes || 0);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatMinutes(minutes) {
  const total = Number(minutes || 0);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours}h${mins > 0 ? `${mins}min` : '00min'}`;
}

function formatMinutesShort(minutes) {
  const total = Number(minutes || 0);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours <= 0) return `${mins}min`;
  if (mins <= 0) return `${hours}h`;
  return `${hours}h${String(mins).padStart(2, '0')}min`;
}
