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
        <div className="pl-paper-bg" style={{ flex: 1, overflow: 'auto', padding: '28px 36px 48px' }}>
          <div className="pl-card" style={{ maxWidth: 980, padding: '32px', borderColor: 'rgba(180,83,9,0.3)', background: 'rgba(251,234,205,0.3)' }}>
            <span className="pl-tag pl-tag-warn">Planejamento em recuperação</span>
            <h2 className="pl-display" style={{ margin: '16px 0 0', fontSize: 32, color: 'var(--pl-ink)' }}>
              Essa aba encontrou um dado antigo e foi protegida para não derrubar o site.
            </h2>
            <p style={{ marginTop: 12, fontSize: 13.5, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-3)' }}>
              Reabra a configuração do planejamento ou recarregue a página. A tela principal continua preservada.
            </p>
            {this.state.errorMessage ? (
              <div className="pl-card" style={{ marginTop: 20, padding: '12px 16px', borderColor: 'rgba(180,83,9,0.3)', background: 'var(--pl-warn-soft)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-warn)' }}>
                  Erro identificado: {this.state.errorMessage}
                </span>
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
      className="pl-paper-bg"
      style={{
        flex: 1,
        overflow: studyMode === 'fixo' ? 'auto' : 'hidden',
        padding: '28px 36px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {/* ── HERO ── */}
      <header style={{ display: 'flex', gap: 28, alignItems: 'flex-end', flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pl-eyebrow">
            Área de planejamento
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            {studyMode === 'ciclo' ? 'Ciclo flexível' : 'Planejamento fixo'}
          </div>
          <h1 className="pl-display" style={{ margin: '12px 0 0', fontSize: 56, color: 'var(--pl-ink)' }}>
            {studyMode === 'ciclo' ? 'Ciclo de estudos' : 'Planejamento'}<span style={{ color: 'var(--pl-accent)' }}>.</span>
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 520, lineHeight: 1.55 }}>
            {studyMode === 'fixo'
              ? 'Planeje por agenda fixa, sem duplicar matérias equivalentes entre cursos.'
              : 'Estude em ordem rotativa sem depender de dias fixos. Ideal para rotina variável.'}
          </p>
        </div>

        {/* Mode + view toggles */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          {/* Mode toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2,
            background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-strong)',
            borderRadius: 8, padding: 3,
          }}>
            <button
              type="button"
              onClick={openWizard}
              style={{
                height: 30, padding: '0 12px', borderRadius: 6, border: 0, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'var(--pl-sans)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: studyMode === 'ciclo' ? 'var(--pl-ink)' : 'transparent',
                color: studyMode === 'ciclo' ? 'var(--pl-bg)' : 'var(--pl-ink-3)',
              }}
            >
              <RotateCcw size={12} /> Ciclo flexível
            </button>
            <button
              type="button"
              onClick={openWizard}
              style={{
                height: 30, padding: '0 12px', borderRadius: 6, border: 0, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'var(--pl-sans)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: studyMode === 'fixo' ? 'var(--pl-ink)' : 'transparent',
                color: studyMode === 'fixo' ? 'var(--pl-bg)' : 'var(--pl-ink-3)',
              }}
            >
              <CalendarDays size={12} /> Planejamento fixo
            </button>
          </div>

          {/* View toggle (fixo only) */}
          {studyMode === 'fixo' ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-strong)',
              borderRadius: 8, padding: 3,
            }}>
              <button
                type="button"
                onClick={() => setAgendaViewMode('calendario')}
                style={{
                  height: 28, padding: '0 10px', borderRadius: 5, border: 0, cursor: 'pointer',
                  fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--pl-sans)',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: agendaViewMode === 'calendario' ? 'var(--pl-bg-soft)' : 'transparent',
                  color: agendaViewMode === 'calendario' ? 'var(--pl-ink)' : 'var(--pl-ink-3)',
                }}
              >
                <CalendarDays size={11} /> Calendário
              </button>
              <button
                type="button"
                onClick={() => setAgendaViewMode('kanban')}
                style={{
                  height: 28, padding: '0 10px', borderRadius: 5, border: 0, cursor: 'pointer',
                  fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--pl-sans)',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: agendaViewMode === 'kanban' ? 'var(--pl-bg-soft)' : 'transparent',
                  color: agendaViewMode === 'kanban' ? 'var(--pl-ink)' : 'var(--pl-ink-3)',
                }}
              >
                <Columns size={11} /> Kanban
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="pl-rule" style={{ flexShrink: 0 }} />

      {studyMode === 'fixo' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr)', gap: 18, flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={openWizard}
              className="pl-btn pl-btn-primary"
              style={{ width: '100%', justifyContent: 'center', height: 38, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Sparkles size={14} />
              Editar planejamento
            </button>

            <div className="pl-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-2">
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {selectedCourseLabels.length > 0 ? (
                  selectedCourseLabels.map((course) => (
                    <span key={course.plano} className="pl-tag pl-tag-accent">{course.nome}</span>
                  ))
                ) : (
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--pl-ink-3)' }}>Nenhum curso selecionado ainda.</span>
                )}
              </div>
            </InfoCard>

            <div className="pl-card" style={{ padding: '16px 18px' }}>
              <div className="pl-eyebrow" style={{ fontSize: 9.5, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--pl-rule)' }}>
                Configurações do plano
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{targetContest?.nome || 'Sem concurso-alvo'}</p>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)' }}>
                  Sessões de {formatMinutesShort(safePlanningSessionWindow.minMinutes)} a{' '}
                  {formatMinutesShort(safePlanningSessionWindow.maxMinutes)}
                </p>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)' }}>
                  {safePlanningSessionWindow.subjectsPerDay} matéria(s) por dia
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                <button type="button" onClick={openWizard} className="pl-btn pl-btn-sm" style={{ justifyContent: 'center' }}>
                  Reabrir ajuste
                </button>
                <button type="button" onClick={() => setCurrentDate(new Date())} className="pl-btn pl-btn-sm" style={{ justifyContent: 'center' }}>
                  Ir para hoje
                </button>
              </div>
              <div className="pl-progress accent" style={{ marginBottom: 8 }}>
                <div className="fill" style={{ width: `${rhythmPercent}%` }} />
              </div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: 'var(--pl-ink-4)', lineHeight: 1.5 }}>
                A IA consolida matérias iguais entre cursos antes de montar a agenda.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, flexShrink: 0 }}>
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

            <div className="pl-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {agendaViewMode === 'calendario' && (
              <div className="flex flex-col h-full animate-in fade-in duration-300">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                      <h3 className="text-2xl font-extrabold text-gray-800 capitalize min-w-[220px]">
                        {calViewMode === 'mes'
                          ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                          : `Semana de ${currentWeek[0].getDate()}/${currentWeek[0].getMonth() + 1}`}
                      </h3>
                      <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                        <button
                          onClick={() => setCalViewMode('mes')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            calViewMode === 'mes' ? 'bg-blue-50 text-[#2563EB]' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          Mês
                        </button>
                        <button
                          onClick={() => setCalViewMode('semana')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            calViewMode === 'semana' ? 'bg-blue-50 text-[#2563EB]' : 'text-gray-500 hover:bg-gray-50'
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
                      className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm shadow-sm hover:text-[#2563EB] hover:border-[#2563EB] transition-colors"
                    >
                      Hoje
                    </button>
                    <button
                      onClick={() => shiftCalendarDate(setCurrentDate, currentDate, calViewMode, 1)}
                      className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {calViewMode === 'mes' ? (
                  <div className="flex-1 flex flex-col bg-gray-50">
                    <div className="grid grid-cols-7 border-b border-gray-200 bg-white shadow-sm z-10">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((label) => (
                        <div
                          key={label}
                          className="p-3 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-widest border-r border-gray-100 last:border-0"
                        >
                          {label}
                        </div>
                      ))}
                    </div>

                    <div
                      className="flex-1 grid grid-cols-7 bg-gray-200 gap-[1px]"
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
                              !valid ? 'bg-gray-50/50' : 'hover:bg-blue-50/30'
                            }`}
                          >
                            {valid ? (
                              <>
                                <div className="flex justify-between items-start mb-2">
                                  <span
                                    className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                                      isToday ? 'bg-[#2563EB] text-white shadow-md' : 'text-gray-600'
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
                                      className="w-full px-2 py-1.5 rounded-lg border border-white/40 text-[10px] font-bold text-slate-900 shadow-sm truncate text-left hover:-translate-y-0.5 transition-transform flex items-center gap-1.5"
                                      style={{ backgroundColor: event.cor }}
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-slate-900/20 shrink-0" />
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
                  <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-gray-200 bg-white shadow-sm z-10">
                      {currentWeek.map((date) => {
                        const dateKey = toDateKey(date);
                        const isToday = dateKey === toDateKey(new Date());
                        return (
                          <div key={dateKey} className="p-3 text-center border-r border-gray-100 last:border-0">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][date.getDay()]}
                            </div>
                            <div
                              className={`mx-auto w-8 h-8 flex items-center justify-center rounded-full text-lg font-semibold ${
                                isToday ? 'bg-[#2563EB] text-white shadow-md' : 'text-gray-800'
                              }`}
                            >
                              {date.getDate()}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex-1 grid grid-cols-7 bg-gray-200 gap-[1px]">
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
                                  className="w-full p-2.5 rounded-xl border border-gray-100 shadow-sm bg-white text-left hover:shadow-md transition-all border-l-4"
                                  style={{ borderLeftColor: event.cor }}
                                >
                                  <div className="text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                                    <Clock size={10} />
                                    {event.hora}
                                  </div>
                                  <div className="text-xs font-bold text-gray-800 leading-snug">{event.titulo}</div>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    <span
                                      className="text-[8px] font-semibold uppercase px-1.5 py-0.5 rounded border border-white/40 text-slate-900"
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
              <div className="flex min-h-0 flex-1 flex-col animate-in fade-in duration-300 bg-gray-50">
                <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 md:px-5 md:py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base md:text-lg font-extrabold text-gray-800 flex items-center gap-2">
                      <Columns size={18} className="text-[#2563EB] shrink-0" />
                      Quadro de Etapas
                    </h3>
                    <p className="text-[11px] md:text-xs font-semibold text-gray-500 leading-snug mt-0.5">
                      Arraste entre colunas. Cartões compactos para ver o quadro sem rolar a página.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-56 shrink-0 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-[#D5F5E3] text-slate-900 flex items-center justify-center shrink-0">
                      <Check size={16} strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        <span>Concluídas</span>
                        <span className="text-slate-900">{buildKanbanProgress(kanbanTasks)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
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
                          className="bg-white rounded-t-xl px-3 py-2 border border-gray-200 border-b-0 flex justify-between items-center shrink-0 shadow-sm z-10"
                          style={{ borderTopWidth: '3px', borderTopColor: column.cor }}
                        >
                          <h4 className="text-sm font-extrabold text-gray-800">{column.nome}</h4>
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {tasks.length}
                          </span>
                        </div>

                        <div
                          className={`min-h-0 flex-1 border border-gray-200 border-t-0 rounded-b-xl p-2 overflow-y-auto custom-scrollbar space-y-2 transition-colors duration-200 ${
                            isActiveDrop ? 'border-dashed border-2 brightness-95' : ''
                          }`}
                          style={{ backgroundColor: `${column.cor}15` }}
                        >
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(event) => handleDragStart(event, task.id)}
                              className={`bg-white rounded-lg p-2 shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow transition-all group relative overflow-visible ${
                                task.status === 'Concluido' ? 'opacity-70 hover:opacity-100' : ''
                              }`}
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: task.cor }} />
                              <div className="pl-1.5 pr-14">
                                <div className="flex flex-wrap gap-1 mb-1">
                                  <span
                                    className="text-[8px] font-semibold uppercase tracking-wide px-1.5 py-px rounded border border-white/40 text-slate-900 shadow-sm"
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
                                        ? 'bg-[#D5F5E3] border-[#D5F5E3] text-slate-900'
                                        : 'border-gray-300 text-transparent hover:border-[#D5F5E3]'
                                    }`}
                                  >
                                    <Check size={10} strokeWidth={4} />
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <h5
                                      className={`font-bold text-[11px] leading-tight ${
                                        task.status === 'Concluido' ? 'text-gray-400 line-through' : 'text-gray-800'
                                      }`}
                                    >
                                      {task.titulo}
                                    </h5>
                                    <p className="mt-0.5 text-[10px] text-gray-500 line-clamp-2 leading-snug">{task.detail}</p>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center gap-2 mt-1.5 border-t border-gray-50 pt-1.5">
                                  <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 min-w-0">
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
                                  className="text-gray-400 hover:text-red-600 p-1 bg-white/90 rounded-md border border-transparent hover:border-red-100 transition-all opacity-80 group-hover:opacity-100"
                                  title="Excluir bloco"
                                >
                                  <Trash2 size={14} strokeWidth={2.25} />
                                </button>
                                <button
                                  type="button"
                                  onMouseDown={(event) => event.stopPropagation()}
                                  onClick={() => setKanbanMenuOpen(kanbanMenuOpen === task.id ? '' : task.id)}
                                  className="text-gray-400 hover:text-[#2563EB] p-1 bg-white/90 rounded-md border border-transparent hover:border-gray-200 transition-all opacity-80 group-hover:opacity-100"
                                  title="Mais ações"
                                >
                                  <MoreHorizontal size={15} />
                                </button>
                                {kanbanMenuOpen === task.id ? (
                                  <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-[100] py-1 overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => handlePlanAction(task, 'start', onOpenRecommendedDiscipline, onStartRecommendedSession)}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-[#2563EB] flex items-center gap-2 transition-colors"
                                    >
                                      <Play size={14} />
                                      Iniciar sessão
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handlePlanAction(task, 'open', onOpenRecommendedDiscipline, onStartRecommendedSession)}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-[#2563EB] flex items-center gap-2 transition-colors"
                                    >
                                      <Target size={14} />
                                      Abrir disciplina
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePlanningTask(task.id)}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-gray-50"
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
                            <div className="h-16 flex items-center justify-center border-2 border-dashed border-gray-300/50 rounded-lg text-gray-500/70 text-[10px] font-bold">
                              Sem blocos
                            </div>
                          ) : null}

                          {isActiveDrop ? (
                            <div className="h-16 flex items-center justify-center border-2 border-dashed border-[#2563EB] bg-[#2563EB]/10 rounded-lg text-[#2563EB] text-[10px] font-bold shadow-inner">
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="pl-card" style={{ padding: '14px 18px', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--pl-ink)' }}>Ciclo flexível</h2>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--pl-ink-3)' }}>
                    Ideal para rotina variável, estudo sem dias fixos e prioridade automática.
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  onClick={safeCycleProps.onRestartCycle}
                  disabled={!Array.isArray(safeCycleProps.activeCycle) || safeCycleProps.activeCycle.length === 0}
                  className="pl-btn pl-btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <RotateCcw size={12} /> Recomeçar
                </button>
                <button
                  type="button"
                  onClick={openWizard}
                  className="pl-btn pl-btn-primary pl-btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  Replanejar
                </button>
                <button
                  type="button"
                  onClick={safeCycleProps.onRemoveCycle}
                  disabled={!Array.isArray(safeCycleProps.activeCycle) || safeCycleProps.activeCycle.length === 0}
                  className="pl-btn pl-btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--pl-danger)' }}
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
          {safeCycleProps?.showCycleGuide ? (
          <div className="pl-card" style={{ padding: '18px 20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  <span className="pl-tag pl-tag-accent">Ciclo flexível</span>
                  {targetContest?.nome && <span className="pl-tag">{targetContest.nome}</span>}
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: 22, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300, color: 'var(--pl-ink)', letterSpacing: '-0.03em' }}>
                  Ciclo flexível
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  <div className="pl-card-paper" style={{ padding: '12px 14px' }}>
                    <div className="pl-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>Melhor para quem</div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-2)', lineHeight: 1.5 }}>
                      Tem rotina variável, turnos instáveis ou precisa seguir a fila sem prender ao calendário.
                    </p>
                  </div>
                  <div className="pl-card-paper" style={{ padding: '12px 14px' }}>
                    <div className="pl-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>Quando usar o fixo</div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-2)', lineHeight: 1.5 }}>
                      Quando a semana é previsível e você prefere enxergar matéria por dia.
                    </p>
                  </div>
                </div>
              </div>
              {typeof safeCycleProps.onResetCycle === 'function' ? (
                <button
                  type="button"
                  onClick={safeCycleProps.onResetCycle}
                  className="pl-btn pl-btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                >
                  <RotateCcw size={12} /> Reiniciar ciclo
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
            className="pl-card"
            style={{ position: 'relative', zIndex: 10, display: 'flex', maxHeight: '86vh', width: '100%', maxWidth: 880, flexDirection: 'column', overflow: 'hidden' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ borderBottom: '1px solid var(--pl-rule)', padding: '18px 24px', flexShrink: 0, position: 'relative' }}>
              <button
                type="button"
                onClick={closeWizard}
                style={{
                  position: 'absolute', right: 16, top: 16,
                  width: 30, height: 30, border: '1px solid var(--pl-rule-strong)',
                  borderRadius: 6, background: 'var(--pl-surface)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--pl-ink-3)',
                }}
                aria-label="Fechar configuração do planejamento"
              >
                <X size={16} />
              </button>
              <h3 style={{ margin: 0, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: 24, color: 'var(--pl-ink)', letterSpacing: '-0.03em' }}>
                Editar Planejamento
              </h3>
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

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--pl-rule)', padding: '14px 24px', flexShrink: 0 }}>
              <button type="button" onClick={closeWizard} className="pl-btn pl-btn-sm">
                {wizardStep === 1 ? 'Agora não' : 'Cancelar'}
              </button>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                {wizardStep > 1 ? (
                  <button type="button" onClick={goToPreviousWizardStep} className="pl-btn pl-btn-sm">
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
                    className="pl-btn pl-btn-primary pl-btn-sm"
                    style={{ opacity: ((wizardStep === 1 && wizardCoursePlans.length === 0) || (wizardStep === 2 && selectedWizardSubjects.length === 0)) ? 0.5 : 1 }}
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={saveWizardConfig}
                    disabled={wizardCoursePlans.length === 0}
                    className="pl-btn pl-btn-primary pl-btn-sm"
                    style={{ opacity: wizardCoursePlans.length === 0 ? 0.5 : 1 }}
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
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 14, height: 14, cursor: 'pointer' }} />
      <div style={{ width: 10, height: 10, borderRadius: 999, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink-2)', fontFamily: 'var(--pl-sans)' }}>{label}</span>
    </label>
  );
}

function InfoCard({ title, items, children }) {
  return (
    <div className="pl-card" style={{ padding: '14px 16px' }}>
      <div className="pl-eyebrow" style={{ fontSize: 9.5, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--pl-rule)' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((item) => (
          <p key={item} style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{item}</p>
        ))}
      </div>
      {children}
    </div>
  );
}

function CycleInfoCard({ title, text }) {
  return (
    <div className="pl-card-paper" style={{ padding: '14px 16px' }}>
      <div className="pl-eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>{title}</div>
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: 'var(--pl-ink-2)', lineHeight: 1.55 }}>{text}</p>
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
