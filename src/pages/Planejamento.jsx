import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Play,
  RefreshCw,
  RotateCcw,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { buildWeeklyStudyPlan, WEEKDAY_BLUEPRINT } from '../lib/weeklyPlanner';
import { mergeDisciplinesByCanonical } from '../lib/studyRecommendation';
import { supabase } from '../lib/supabase';
import { getSubjectColor } from '../lib/subjectPalette';

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
const PASTEL_SUBJECT_COLORS = [
  '#FFD1DC',
  '#FFB3BA',
  '#FFDFBA',
  '#FFFFBA',
  '#BAFFC9',
  '#BAE1FF',
  '#D7BAFF',
  '#FFCCE5',
  '#CCE5FF',
  '#E5FFCC',
  '#FADADD',
  '#D6EAF8',
  '#D5F5E3',
  '#FCF3CF',
  '#EBDEF0',
  '#F9E79F',
  '#AED6F1',
  '#A9DFBF',
  '#F5CBA7',
  '#F1948A',
  '#BB8FCE',
  '#85C1E9',
  '#73C6B6',
  '#F7DC6F',
  '#F8C471',
  '#E59866',
  '#D98880',
  '#C39BD3',
  '#7FB3D5',
  '#76D7C4',
  '#FAD7A0',
  '#F5B7B1',
  '#E8DAEF',
  '#D4E6F1',
  '#D1F2EB',
  '#FCF3CF',
  '#FDEBD0',
  '#FADBD8',
  '#EAF2F8',
  '#E8F8F5',
  '#FEF9E7',
  '#FDEDEC',
  '#EBF5FB',
  '#E9F7EF',
  '#FDF2E9',
  '#F5EEF8',
  '#D6DBDF',
  '#A3E4D7',
  '#F9EBEA',
  '#EAFAF1',
];
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
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-gray-500">
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

  const planejamentoMode = studyMode === 'fixo' ? 'fixo' : 'flexivel';
  const cycleRows = useMemo(
    () => buildCycleRows(safeCycleProps.activeCycle, cycleCanonicalDisciplines),
    [safeCycleProps.activeCycle, cycleCanonicalDisciplines]
  );
  const totalPrevistoCiclo = cycleRows.reduce((acc, item) => acc + item.previstaMin, 0);
  const totalFeitoCiclo = cycleRows.reduce((acc, item) => acc + item.feitaMin, 0);
  const cycleProgress = totalPrevistoCiclo > 0 ? Math.round((totalFeitoCiclo / totalPrevistoCiclo) * 100) : 0;
  const ciclosCompletos = Number(safeCycleProps.ciclosCompletos || safeCycleProps.completedCycles || 0);
  const fixedStats = {
    weeklyLabel: summary.weeklyLabel || formatMinutes(Number(summary.weeklyMinutes || 0)),
    sessions: Number(summary.totalSessions || filteredCalendarEvents.length || 0),
    pending: Number(summary.pendingTopics || 0),
    required: summary.requiredPerWeekLabel || '0h 00m',
    activeDays,
    pace: summary.paceLabel || 'ritmo sob controle',
  };

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
    <div className="pl-paper-bg-soft" style={{ flex: 1, overflow: 'auto', padding: '18px 20px 40px' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PlanejamentoHeader
          mode={planejamentoMode}
          setMode={(nextMode) => setStudyMode?.(nextMode === 'fixo' ? 'fixo' : 'ciclo')}
          onConfigurar={openWizard}
        />

        {planejamentoMode === 'flexivel' ? (
          <CicloFlexivel
            disciplinas={cycleRows}
            ciclosCompletos={ciclosCompletos}
            totalFeitoMin={totalFeitoCiclo}
            totalPrevistoMin={totalPrevistoCiclo}
            acumuladoMin={Number(safeCycleProps.minConcluidosCiclo || 0)}
            progress={cycleProgress}
            onRecomecar={safeCycleProps.onRestartCycle}
            onReplanejar={openWizard}
            onRemover={safeCycleProps.onRemoveCycle}
            onEditar={openWizard}
            onStart={onStartRecommendedSession || safeCycleProps.openTimerSetup}
            onManual={() => safeCycleProps.setRegistroEstudoModalOpen?.(true)}
            onHistory={onOpenRecommendedDiscipline}
          />
        ) : (
          <PlanejamentoFixo
            stats={fixedStats}
            currentDate={currentDate}
            currentWeek={currentWeek}
            currentMonthGrid={currentMonthGrid}
            calViewMode={calViewMode}
            setCalViewMode={setCalViewMode}
            setCurrentDate={setCurrentDate}
            events={filteredCalendarEvents}
          />
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
            className="relative z-10 flex max-h-[86vh] w-full max-w-[880px] flex-col overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeWizard}
                className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Fechar configuração do planejamento"
              >
                <X size={22} />
              </button>
              <h3 className="text-2xl font-extrabold text-gray-700">Editar Planejamento</h3>
              <WizardStepper step={wizardStep} />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {wizardStep === 1 ? (
              <div>
                <p className="text-center text-base leading-7 text-gray-600 sm:text-lg">
                  Para iniciar o seu planejamento, escolha a melhor forma de visualização para você:
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <WizardModeCard
                    active={wizardModeDraft === 'ciclo'}
                    icon={<RotateCcw size={62} className="text-[#2563EB]" />}
                    title="Ciclo de Estudos"
                    text="Estude as disciplinas em uma ordem rotativa, sem depender de dias fixos. Ideal para quem precisa de flexibilidade na rotina."
                    onClick={() => setWizardModeDraft('ciclo')}
                  />
                  <WizardModeCard
                    active={wizardModeDraft === 'fixo'}
                    icon={<CalendarDays size={62} className="text-[#2563EB]" />}
                    title="Planejamento Semanal"
                    text="Defina dias certos para cada frente de estudo e acompanhe tudo em calendário e kanban."
                    onClick={() => setWizardModeDraft('fixo')}
                  />
                </div>

                <div className="mt-5 rounded-[1.25rem] border border-gray-200 bg-gray-50 p-4">
                  <p className="text-center text-sm font-medium text-gray-600 sm:text-base">
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
                            ? 'border-[#2563EB] bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-base font-bold text-gray-800">{course.nome}</p>
                            <p className="mt-1 text-sm text-gray-500">{course.concurso || course.plano}</p>
                          </div>
                          {course.isTarget ? <TagPill label="Alvo" color="#2563EB" soft /> : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {wizardStep === 2 ? (
              <div>
                <p className="text-center text-base leading-7 text-gray-600 sm:text-lg">
                  Selecione quais das suas <strong>disciplinas</strong> você deseja colocar no seu <strong>planejamento</strong>.
                </p>
                <div className="mt-5 max-h-[300px] overflow-y-auto custom-scrollbar rounded-[1.25rem] border border-gray-200 bg-gray-50 p-4">
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
                            selected ? 'border-[#2563EB] bg-blue-50 text-slate-900' : 'border-gray-200 bg-white text-gray-500'
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
                <p className="text-center text-base leading-7 text-gray-600 sm:text-lg">
                  Para cada disciplina, selecione a <strong>importancia</strong> para a prova e o seu <strong>grau de conhecimento</strong>.
                </p>
                <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar rounded-[1.25rem] border border-gray-200 bg-gray-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedWizardSubjects.map((discipline) => {
                        const config = wizardSubjectState[discipline.nome] || { importance: 3, knowledge: 3 };
                        return (
                          <div key={discipline.nome} className="rounded-2xl bg-white p-4 shadow-sm">
                            <p className="text-base font-semibold text-gray-700 text-center">{discipline.nome}</p>
                            <div className="mt-4">
                              <label className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-400">Importancia</label>
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
                                  className="w-full accent-[#2563EB]"
                                />
                                <span className="w-6 text-right font-bold text-gray-700">{config.importance}</span>
                              </div>
                            </div>
                            <div className="mt-4">
                              <label className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-400">Conhecimento</label>
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
                                  className="w-full accent-[#2563EB]"
                                />
                                <span className="w-6 text-right font-bold text-gray-700">{config.knowledge}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar rounded-[1.25rem] border border-gray-200 bg-gray-50 p-4 space-y-3">
                    {subjectPriorityPreview.map((discipline) => (
                      <div
                        key={discipline.nome}
                        className="rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 sm:text-base"
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
                <p className="text-center text-base leading-7 text-gray-600 sm:text-lg">
                  Quais dias e quantas horas pretende estudar?
                </p>
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {WEEKDAY_ORDER.map((dayId) => {
                    const dayBlueprint = WEEKDAY_BLUEPRINT.find((day) => day.id === dayId);
                    const current = wizardHoursByDay[dayId] || { enabled: false, minutes: 0 };
                    return (
                      <div key={dayId} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
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
                        <span className="w-[56px] rounded-lg bg-gray-400 px-3 py-1.5 text-center text-base font-semibold text-white">
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
                          className="w-[92px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                          {TIME_PICKER_OPTIONS.map((minutes) => (
                            <option key={minutes} value={minutes}>
                              {formatHalfHourTime(minutes)}
                            </option>
                          ))}
                        </select>
                        <span className="text-sm text-gray-600">horas diarias</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-2xl bg-blue-50 px-5 py-3 text-right text-lg font-semibold text-slate-900 sm:text-xl">
                  Total na Semana: {formatMinutes(totalWizardMinutes)}
                </div>

                <div className="mt-6">
                  <p className="text-base text-gray-600 sm:text-lg">
                    Quantas matérias deseja encaixar por dia?
                  </p>
                  <div className="mt-3 inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                    {[1, 2, 3].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setWizardSubjectsPerDay(count)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                          wizardSubjectsPerDay === count ? 'bg-[#2563EB] text-white shadow-sm' : 'text-gray-600 hover:bg-white'
                        }`}
                      >
                        {count} matéria{count > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-sm font-medium leading-6 text-gray-500">
                    O app usa esse numero para distribuir blocos de teoria e aproveitar o tempo que sobrar com revisao ou questoes.
                  </p>
                </div>

                <div className="mt-6">
                  <p className="text-base text-gray-600 sm:text-lg">
                    Qual minimo e maximo de tempo que deseja estudar uma mesma disciplina?
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <select
                      value={wizardMinDuration}
                      onChange={(event) => setWizardMinDuration(Number(event.target.value))}
                      className="min-w-[120px] border-b-2 border-[#2563EB] bg-transparent px-2 py-2 text-lg text-gray-700 outline-none"
                    >
                      {DURATION_OPTIONS.map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {formatMinutesShort(minutes)}
                        </option>
                      ))}
                    </select>
                    <span className="text-lg text-gray-500">a</span>
                    <select
                      value={wizardMaxDuration}
                      onChange={(event) => setWizardMaxDuration(Number(event.target.value))}
                      className="min-w-[120px] border-b-2 border-[#2563EB] bg-transparent px-2 py-2 text-lg text-gray-700 outline-none"
                    >
                      {DURATION_OPTIONS.filter((minutes) => minutes >= wizardMinDuration).map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {formatMinutesShort(minutes)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-6 text-gray-500">
                    Se o dia não fechar exatamente com a duração mínima, o restante vira bloco complementar de revisão ou questões.
                  </p>
                </div>
              </div>
            ) : null}

            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:px-6">
              <button type="button" onClick={closeWizard} className="btn-secondary text-sm">
                {wizardStep === 1 ? 'Agora não' : 'Cancelar'}
              </button>
              <div className="flex flex-wrap items-center justify-end gap-3">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={goToPreviousWizardStep}
                    className="rounded-xl border-2 border-[#2563EB] px-5 py-2.5 text-sm font-semibold text-[#2563EB]"
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
                    className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50"
                  >
                    Proximo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={saveWizardConfig}
                    disabled={wizardCoursePlans.length === 0}
                    className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50"
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
    </div>
  );
}

function PlanejamentoHeader({ mode, setMode, onConfigurar }) {
  return (
    <section className="pl-card-paper" style={{ padding: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 24, alignItems: 'end' }}>
        <div>
          <div className="pl-overline">Planejamento</div>
          <h1 className="pl-display" style={{ margin: '14px 0 8px', fontSize: 'clamp(44px, 5vw, 78px)' }}>
            Plano de estudos.
          </h1>
          <p className="pl-body" style={{ maxWidth: 760, fontSize: 18 }}>
            Escolha entre uma rotação flexível para rotina variável ou uma agenda fixa para semanas previsíveis.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <div className="pl-card planning-mode-toggle">
            <button type="button" className={mode === 'flexivel' ? 'is-active' : ''} onClick={() => setMode('flexivel')}>
              <RefreshCw size={15} />
              Ciclo flexível
            </button>
            <button type="button" className={mode === 'fixo' ? 'is-active' : ''} onClick={() => setMode('fixo')}>
              <CalendarDays size={15} />
              Planejamento fixo
            </button>
          </div>
          <button type="button" className="pl-btn pl-btn-secondary" onClick={onConfigurar}>
            <Settings2 size={14} />
            Configurar
          </button>
        </div>
      </div>
    </section>
  );
}

function CicloFlexivel({
  disciplinas,
  ciclosCompletos,
  totalFeitoMin,
  totalPrevistoMin,
  acumuladoMin,
  progress,
  onRecomecar,
  onReplanejar,
  onRemover,
  onEditar,
  onStart,
  onManual,
  onHistory,
}) {
  const activeIndex = disciplinas.findIndex((disciplina) => disciplina.feitaMin < disciplina.previstaMin);
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section className="planning-cycle-strip">
        <CiclosCompletosCard value={ciclosCompletos} />
        <ProgressoCicloCard
          feitoMin={totalFeitoMin}
          previstoMin={totalPrevistoMin}
          acumuladoMin={acumuladoMin}
          progress={progress}
        />
        <CicloActions onRecomecar={onRecomecar} onReplanejar={onReplanejar} onRemover={onRemover} disabled={disciplinas.length === 0} />
      </section>

      <section className="planning-main-grid">
        <SequenciaDosEstudosCard
          disciplinas={disciplinas}
          activeIndex={currentIndex}
          onEditar={onEditar}
          onStart={onStart}
          onManual={onManual}
          onHistory={onHistory}
        />
        <DistribuicaoDonutCard disciplinas={disciplinas} totalMin={totalPrevistoMin} />
      </section>
    </div>
  );
}

function CiclosCompletosCard({ value }) {
  return (
    <div className="pl-card" style={{ padding: 18 }}>
      <div className="pl-small-label">Ciclos completos</div>
      <div className="pl-serif-number" style={{ marginTop: 12, fontSize: 48, lineHeight: 1 }}>{value}</div>
      <p className="pl-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>desde que começou</p>
    </div>
  );
}

function ProgressoCicloCard({ feitoMin, previstoMin, acumuladoMin, progress }) {
  return (
    <div className="pl-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div className="pl-small-label">Progresso do ciclo atual</div>
        <div className="pl-serif-number" style={{ fontSize: 24, lineHeight: 1 }}>{progress}%</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', marginTop: 16 }}>
        <span className="planning-time-label">{formatMinutes(feitoMin)}</span>
        <div className="pl-progress-track">
          <div className="pl-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="planning-time-label">{formatMinutes(previstoMin)}</span>
      </div>
      <p className="pl-muted" style={{ margin: '12px 0 0', fontSize: 13 }}>
        Acumulado total ao longo de todos os ciclos: {formatMinutes(acumuladoMin)}
      </p>
    </div>
  );
}

function CicloActions({ onRecomecar, onReplanejar, onRemover, disabled }) {
  return (
    <div className="pl-card planning-cycle-actions">
      <button type="button" className="pl-btn pl-btn-sm" onClick={onRecomecar} disabled={disabled}>
        <RotateCcw size={13} />
        Recomeçar
      </button>
      <button type="button" className="pl-btn pl-btn-sm" onClick={onReplanejar}>
        <Settings2 size={13} />
        Replanejar
      </button>
      <button type="button" className="pl-btn pl-btn-sm" onClick={onRemover} disabled={disabled} style={{ color: 'var(--pl-danger)' }}>
        <Trash2 size={13} />
        Remover
      </button>
    </div>
  );
}

function SequenciaDosEstudosCard({ disciplinas, activeIndex, onEditar, onStart, onManual, onHistory }) {
  return (
    <section className="pl-card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end' }}>
        <div>
          <div className="pl-overline">Sequência dos estudos</div>
          <h2 className="pl-section-title" style={{ marginTop: 7 }}>{disciplinas.length} matérias na rotação</h2>
        </div>
        <button type="button" className="pl-btn-link">Ver finalizadas →</button>
      </div>

      <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
        {disciplinas.length === 0 ? (
          <div className="planning-empty">Nenhuma matéria no ciclo ainda. Configure o planejamento para montar a rotação.</div>
        ) : (
          disciplinas.map((disciplina, index) => (
            <CicloRow
              key={disciplina.key}
              disciplina={disciplina}
              active={index === activeIndex}
              onStart={onStart}
              onManual={onManual}
              onHistory={onHistory}
            />
          ))
        )}
      </div>

      <button type="button" className="pl-btn pl-btn-secondary" style={{ marginTop: 18 }} onClick={onEditar}>
        <Edit3 size={14} />
        Editar ciclo
      </button>
    </section>
  );
}

function CicloRow({ disciplina, active, onStart, onManual, onHistory }) {
  const pct = disciplina.previstaMin > 0 ? Math.round((disciplina.feitaMin / disciplina.previstaMin) * 100) : 0;

  return (
    <article className={active ? 'planning-cycle-row is-active' : 'planning-cycle-row'}>
      <div className="planning-cycle-row-main">
        <span className="planning-subject-bar" style={{ background: disciplina.cor }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong>{disciplina.nome}</strong>
            {active && <span className="pl-tag pl-tag-highlight">Agora</span>}
          </div>
          {active && (
            <div className="pl-progress-track" style={{ marginTop: 9 }}>
              <div className="pl-progress-fill" style={{ width: `${pct}%`, background: disciplina.cor }} />
            </div>
          )}
        </div>
        <span className="planning-time-label">{formatMinutes(disciplina.feitaMin)} / {formatMinutes(disciplina.previstaMin)}</span>
      </div>

      {active && (
        <div className="planning-cycle-row-actions">
          <button type="button" className="pl-btn pl-btn-primary pl-btn-sm" onClick={() => onStart?.(disciplina)}>
            <Play size={13} fill="currentColor" />
            Iniciar estudo
          </button>
          <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" onClick={onManual}>Adicionar manual</button>
          <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => onHistory?.(disciplina.nome)}>Últimos estudos</button>
        </div>
      )}
    </article>
  );
}

function DistribuicaoDonutCard({ disciplinas, totalMin }) {
  return (
    <section className="pl-card" style={{ padding: 22 }}>
      <div className="pl-overline">Ciclo · distribuição</div>
      <h2 className="pl-section-title" style={{ marginTop: 7 }}>Como o seu tempo se reparte</h2>
      <div className="planning-donut-wrap">
        <Donut disciplinas={disciplinas} totalMin={totalMin} />
      </div>
      <div className="planning-donut-legend">
        {disciplinas.map((disciplina) => (
          <div key={disciplina.key}>
            <span style={{ background: disciplina.cor }} />
            <strong>{disciplina.nome}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function Donut({ disciplinas, totalMin }) {
  const size = 280;
  const rOuter = 110;
  const rInner = 90;
  const cx = size / 2;
  const cy = size / 2;
  const total = disciplinas.reduce((acc, item) => acc + item.previstaMin, 0);
  let cum = 0;

  const segs = disciplinas.map((disciplina) => {
    const f = total > 0 ? disciplina.previstaMin / total : 0;
    const start = cum * 360 - 90;
    const end = (cum + f) * 360 - 90;
    cum += f;
    const doneF = disciplina.previstaMin > 0 ? Math.min(1, disciplina.feitaMin / disciplina.previstaMin) : 0;
    return { ...disciplina, start, end, doneEnd: start + (end - start) * doneF };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribuição do ciclo">
      {segs.map((seg, index) => (
        <path key={`outer-${seg.key}-${index}`} d={arcPath(cx, cy, rOuter, seg.start, seg.end, rInner)} fill={seg.cor} opacity="0.45">
          <title>{seg.nome}: {formatMinutes(seg.feitaMin)} / {formatMinutes(seg.previstaMin)}</title>
        </path>
      ))}
      {segs.map((seg, index) => (
        seg.doneEnd > seg.start ? (
          <path key={`done-${seg.key}-${index}`} d={arcPath(cx, cy, rOuter, seg.start, seg.doneEnd, rInner)} fill={seg.cor}>
            <title>{seg.nome}: {formatMinutes(seg.feitaMin)} / {formatMinutes(seg.previstaMin)}</title>
          </path>
        ) : null
      ))}
      <circle cx={cx} cy={cy} r={72} fill="var(--pl-surface)" />
      <text x={cx} y={cy - 2} textAnchor="middle" style={{ fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontSize: 26 }} fill="var(--pl-ink)">
        {formatMinutes(totalMin)}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" style={{ fontFamily: 'var(--pl-sans)', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }} fill="var(--pl-ink-3)">
        planejadas
      </text>
    </svg>
  );
}

function PlanejamentoFixo({ stats, currentDate, currentWeek, currentMonthGrid, calViewMode, setCalViewMode, setCurrentDate, events }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <FixoStat label="Carga da semana" value={stats.weeklyLabel} sub={`${stats.sessions} blocos planejados`} tone="ink" />
        <FixoStat label="Tópicos em aberto" value={stats.pending} sub={`${stats.required} / semana`} tone="warn" />
        <FixoStat label="Leitura rápida" value={stats.activeDays} sub={`dias ativos · ${stats.pace}`} tone="success" />
      </section>
      <CalendarCard
        currentDate={currentDate}
        currentWeek={currentWeek}
        currentMonthGrid={currentMonthGrid}
        calViewMode={calViewMode}
        setCalViewMode={setCalViewMode}
        setCurrentDate={setCurrentDate}
        events={events}
      />
    </div>
  );
}

function FixoStat({ label, value, sub, tone }) {
  const toneClass = tone === 'success' ? 'pl-tag-success' : tone === 'warn' ? 'pl-tag-warn' : 'pl-tag-accent';
  return (
    <div className="pl-card" style={{ padding: 18 }}>
      <span className={`pl-tag ${toneClass}`}>{label}</span>
      <div className="pl-serif-number" style={{ marginTop: 12, fontSize: 36, lineHeight: 1 }}>{value}</div>
      <p className="pl-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>{sub}</p>
    </div>
  );
}

function CalendarCard({ currentDate, currentWeek, currentMonthGrid, calViewMode, setCalViewMode, setCurrentDate, events }) {
  const monthTitle =
    calViewMode === 'mes'
      ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : `Semana de ${currentWeek[0].getDate()}/${currentWeek[0].getMonth() + 1}`;
  const cells =
    calViewMode === 'mes'
      ? currentMonthGrid.map((day, index) => (day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null))
      : currentWeek;

  return (
    <section className="pl-card planning-calendar-card">
      <div className="planning-calendar-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <h2 className="pl-section-title">{monthTitle}</h2>
          <div className="planning-segment">
            <button type="button" className={calViewMode === 'mes' ? 'is-active' : ''} onClick={() => setCalViewMode('mes')}>Mês</button>
            <button type="button" className={calViewMode === 'semana' ? 'is-active' : ''} onClick={() => setCalViewMode('semana')}>Semana</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="pl-btn pl-btn-sm" onClick={() => shiftCalendarDate(setCurrentDate, currentDate, calViewMode, -1)}><ChevronLeft size={14} /></button>
          <button type="button" className="pl-btn pl-btn-sm" onClick={() => setCurrentDate(new Date())}>Hoje</button>
          <button type="button" className="pl-btn pl-btn-sm" onClick={() => shiftCalendarDate(setCurrentDate, currentDate, calViewMode, 1)}><ChevronRight size={14} /></button>
        </div>
      </div>

      <div className="planning-calendar-grid">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((label) => (
          <div key={label} className="planning-calendar-weekday">{label}</div>
        ))}
        {cells.map((date, index) => {
          const dateKey = date ? toDateKey(date) : '';
          const dayEvents = date ? events.filter((event) => event.data === dateKey).slice(0, 4) : [];
          return (
            <div key={`${dateKey}-${index}`} className="planning-calendar-cell">
              {date ? <span>{date.getDate()}</span> : null}
              {dayEvents.map((event) => (
                <div key={event.id} className="planning-calendar-pill" style={{ borderColor: event.cor, background: `${event.cor}55` }}>
                  {event.hora} · {event.titulo}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildCycleRows(activeCycle, fallbackDisciplines) {
  const source = Array.isArray(activeCycle) && activeCycle.length > 0 ? activeCycle : [];
  if (source.length === 0) {
    return (Array.isArray(fallbackDisciplines) ? fallbackDisciplines : []).map((disciplina, index) => {
      const nome = disciplina?.nome || `Matéria ${index + 1}`;
      return {
        key: String(disciplina?.id || disciplina?.canonicalName || nome),
        nome,
        cor: getSubjectColor(disciplina?.canonicalName || nome),
        previstaMin: Number(disciplina?.minutos || disciplina?.tempoMin || 60),
        feitaMin: 0,
      };
    });
  }

  const groups = new Map();
  source.filter(Boolean).forEach((item, index) => {
    const nome = item?.materia || item?.nome || item?.canonicalName || `Matéria ${index + 1}`;
    const key = String(item?.canonicalName || nome);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        nome,
        cor: getSubjectColor(key),
        previstaMin: 0,
        feitaMin: 0,
      });
    }
    const group = groups.get(key);
    const minutos = Number(item?.minutos || item?.duracao || 0);
    group.previstaMin += minutos;
    if (item?.concluido) group.feitaMin += minutos;
  });
  return Array.from(groups.values());
}

function arcPath(cx, cy, rOuter, start, end, rInner) {
  const polar = (r, angle) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy + r * Math.sin((angle * Math.PI) / 180),
  });
  const s1 = polar(rOuter, end);
  const e1 = polar(rOuter, start);
  const s2 = polar(rInner, start);
  const e2 = polar(rInner, end);
  const large = end - start <= 180 ? '0' : '1';
  return `M ${s1.x} ${s1.y} A ${rOuter} ${rOuter} 0 ${large} 0 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${rInner} ${rInner} 0 ${large} 1 ${e2.x} ${e2.y} Z`;
}

function FilterLine({ checked, onChange, color, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded border-gray-300 cursor-pointer" />
      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: color }} />
      <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
    </label>
  );
}

function InfoCard({ title, items, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-[1.5rem] p-6 shadow-sm">
      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">{title}</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm font-semibold text-gray-600">{item}</p>
        ))}
      </div>
      {children}
    </div>
  );
}

function CycleInfoCard({ title, text }) {
  return (
    <div className="rounded-[1.5rem] border border-gray-100 bg-[#F8FAFC] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">{title}</p>
      <p className="mt-3 text-sm font-semibold leading-6 text-gray-600">{text}</p>
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
                  active || done ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-gray-400 text-gray-400'
                }`}
              >
                {String(number).padStart(2, '0')}
              </div>
              <span className={`text-xs sm:text-sm ${active ? 'font-bold text-gray-700' : 'text-gray-500'}`}>{label}</span>
            </div>
            {number < steps.length ? <div className="hidden md:block h-[2px] w-16 bg-gray-300" /> : null}
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
        active ? 'border-[#2563EB] shadow-[0_0_0_1px_#2563EB_inset]' : 'border-gray-300'
      }`}
    >
      <div className="flex h-36 items-center justify-center bg-white">{icon}</div>
      <div className={`p-5 ${active ? 'bg-blue-50' : 'bg-white'}`}>
        <p className="text-xl font-semibold text-gray-700">{title}</p>
        <p className="mt-2 text-sm leading-7 text-gray-600">{text}</p>
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
