import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Edit3,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { buildWeeklyStudyPlan, WEEKDAY_BLUEPRINT } from '../lib/weeklyPlanner';
import { mergeDisciplinesByCanonical } from '../lib/studyRecommendation';
import { supabase } from '../lib/supabase';
import { getSubjectColor } from '../lib/subjectPalette';
import { generateScheduleWithAI, DIA_LABELS, MODO_COLORS } from '../lib/scheduleAiClient';
import { approveStudyPlan, loadActiveStudyPlan, runPlanAdjustments } from '../lib/studyPlanStore';

// Codigo do dia da semana de hoje (getDay: 0=domingo) alinhado ao WEEKDAY_ORDER.
const TODAY_DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][new Date().getDay()];

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

const DEFAULT_FILTERS = { sessao: true, revisao: true, questoes: true };
/** Evita reabrir o wizard em loop ao fechar sem salvar (persiste na aba). */
const PLANNING_WIZARD_DISMISSED_KEY = 'papirando_planning_wizard_dismissed';

// Persistência do cronograma gerado por IA: antes era só estado em memória e sumia
// ao trocar de aba ou recarregar. Guardamos por usuário no localStorage.
const aiScheduleStorageKey = (userId) => `papirando_ai_schedule_${userId || 'anon'}`;
function readSavedAiSchedule(userId) {
  try {
    const raw = localStorage.getItem(aiScheduleStorageKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function persistAiSchedule(userId, schedule) {
  try {
    if (schedule) localStorage.setItem(aiScheduleStorageKey(userId), JSON.stringify(schedule));
    else localStorage.removeItem(aiScheduleStorageKey(userId));
  } catch {
    /* localStorage indisponível — segue só com o estado em memória */
  }
}

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
        <div className="pl-paper-bg" style={{ padding: '28px 28px 48px' }}>
          <div className="pl-card" style={{ maxWidth: 980, border: '1px solid var(--pl-warn-soft)', background: 'var(--pl-warn-soft)', padding: 32 }}>
          <span className="pl-tag pl-tag-warn">
            Planejamento em recuperacao
          </span>
          <h2 className="pl-display" style={{ marginTop: 16, fontSize: 24 }}>
            Essa aba encontrou um dado antigo e foi protegida para não derrubar o site.
          </h2>
          <p style={{ marginTop: 12, maxWidth: '42rem', fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>
            Reabra a configuração do planejamento ou recarregue a página. A tela principal continua preservada e o app não cai mais inteiro.
          </p>
          {this.state.errorMessage ? (
            <div style={{ marginTop: 20, borderRadius: 12, border: '1px solid var(--pl-warn-soft)', background: 'var(--pl-warn-soft)', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)' }}>
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
  const [localCalViewMode, setLocalCalViewMode] = useState('mes');
  const [localCurrentDate, setLocalCurrentDate] = useState(new Date());
  const [planningFilters] = useState(DEFAULT_FILTERS);
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
  const [aiSchedule, setAiSchedule] = useState(() => readSavedAiSchedule(currentUserId));
  const [aiScheduleLoading, setAiScheduleLoading] = useState(false);
  const [aiScheduleError, setAiScheduleError] = useState('');
  const [planApproving, setPlanApproving] = useState(false);
  const [planApprovedAt, setPlanApprovedAt] = useState(null);
  const [planApproveError, setPlanApproveError] = useState('');
  const [planAdjusting, setPlanAdjusting] = useState(false);
  const [planAdjustMessage, setPlanAdjustMessage] = useState('');
  const [remotePlanningLoaded, setRemotePlanningLoaded] = useState(false);
  const calViewMode = sharedCalendarViewMode || localCalViewMode;
  const setCalViewMode = setSharedCalendarViewMode || setLocalCalViewMode;
  const currentDate = sharedCalendarDate || localCurrentDate;
  const setCurrentDate = setSharedCalendarDate || setLocalCurrentDate;
  const [taskStatusMap] = useState(() => {
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

  const [removedPlanningTaskIds] = useState(() => {
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
  const activeDays = safeAvailability.filter((day) => day?.enabled).length;

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

  // Prefere o plano aprovado no banco sobre o cache do localStorage. Roda ao
  // montar e quando o modo muda; so aplica se houver plano remoto (nao apaga
  // uma geracao ainda nao aprovada).
  useEffect(() => {
    if (!currentUserId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const remotePlan = await loadActiveStudyPlan({ userId: currentUserId, mode: planejamentoMode });
        if (cancelled || !remotePlan) return;
        setAiSchedule(remotePlan);
        persistAiSchedule(currentUserId, remotePlan);
      } catch {
        /* sem plano remoto ou tabela ausente — segue com o cache local */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, planejamentoMode]);

  async function handleApprovePlan() {
    if (planApproving || !aiSchedule) return;
    setPlanApproving(true);
    setPlanApproveError('');
    try {
      const meta = [
        targetContest?.nome || targetContest?.titulo || targetContest?.concurso,
        targetContest?.cargo,
      ].filter(Boolean).join(' - ');

      const { planId, version } = await approveStudyPlan({
        userId: currentUserId,
        schedule: aiSchedule,
        mode: planejamentoMode,
        meta,
      });

      const approved = { ...aiSchedule, planId, version };
      setAiSchedule(approved);
      persistAiSchedule(currentUserId, approved);
      setPlanApprovedAt(new Date().toISOString());
    } catch (error) {
      setPlanApproveError(error?.message || 'Não foi possível salvar o plano aprovado.');
    } finally {
      setPlanApproving(false);
    }
  }

  async function handleReavaliarPlano() {
    if (planAdjusting || !aiSchedule?.planId) return;
    setPlanAdjusting(true);
    setPlanAdjustMessage('');
    try {
      const result = await runPlanAdjustments({
        userId: currentUserId,
        mode: planejamentoMode,
        todayDia: TODAY_DIA,
        // accuracyByDiscipline entra quando a acuracia por disciplina estiver
        // disponivel aqui; sem ela o motor so aplica atraso/conclusao antecipada.
        accuracyByDiscipline: {},
      });

      if (!result) {
        setPlanAdjustMessage('Nenhum plano aprovado para reavaliar.');
      } else {
        const total =
          result.summary.atraso + result.summary.erro + result.summary.conclusao_antecipada;
        if (total === 0) {
          setPlanAdjustMessage('Seu plano já está em dia — nenhum ajuste necessário.');
        } else {
          const partes = [];
          if (result.summary.atraso) partes.push(`${result.summary.atraso} atrasado(s) remarcado(s)`);
          if (result.summary.conclusao_antecipada) partes.push(`${result.summary.conclusao_antecipada} antecipado(s)`);
          if (result.summary.erro) partes.push(`${result.summary.erro} repriorizado(s) por desempenho`);
          setPlanAdjustMessage(`Plano reajustado: ${partes.join(', ')}.`);
          // Recarrega o plano do banco para refletir a nova ordem/dias.
          const refreshed = await loadActiveStudyPlan({ userId: currentUserId, mode: planejamentoMode });
          if (refreshed) {
            setAiSchedule(refreshed);
            persistAiSchedule(currentUserId, refreshed);
          }
        }
      }
    } catch (error) {
      setPlanAdjustMessage(error?.message || 'Não foi possível reavaliar o plano.');
    } finally {
      setPlanAdjusting(false);
    }
  }

  async function handleGenerateAiSchedule() {
    if (aiScheduleLoading) return;

    setAiScheduleLoading(true);
    setAiScheduleError('');

    try {
      const disciplinas = buildAiScheduleDisciplines({
        targetDisciplines: safeTargetDisciplines,
        cycleDisciplines: cycleCanonicalDisciplines,
        wizardSubjects: wizardSubjectPool,
        subjectConfig: safePlanningSubjectConfig,
      });
      const meta = [
        targetContest?.nome || targetContest?.titulo || targetContest?.concurso,
        targetContest?.cargo,
      ].filter(Boolean).join(' - ');

      const result = await generateScheduleWithAI({
        disciplinas,
        availability: safeAvailability,
        meta,
      });

      setAiSchedule(result);
      persistAiSchedule(currentUserId, result);
      setPlanApprovedAt(null);
      setPlanApproveError('');
    } catch (error) {
      setAiScheduleError(error?.message || 'Não foi possível gerar o cronograma com IA.');
    } finally {
      setAiScheduleLoading(false);
    }
  }

  return (
    <div className="pl-page">
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PlanejamentoHeader
          mode={planejamentoMode}
          setMode={(nextMode) => setStudyMode?.(nextMode === 'fixo' ? 'fixo' : 'ciclo')}
          onConfigurar={openWizard}
          onGenerateAiSchedule={handleGenerateAiSchedule}
          aiScheduleLoading={aiScheduleLoading}
        />

        {(aiSchedule || aiScheduleLoading || aiScheduleError) ? (
          <PlSchedulePanel
            schedule={aiSchedule}
            loading={aiScheduleLoading}
            error={aiScheduleError}
            onRetry={handleGenerateAiSchedule}
            onApprove={handleApprovePlan}
            approving={planApproving}
            approved={Boolean(aiSchedule?.planId)}
            approveError={planApproveError}
            justApproved={Boolean(planApprovedAt)}
            onReavaliar={handleReavaliarPlano}
            adjusting={planAdjusting}
            adjustMessage={planAdjustMessage}
            onClose={() => {
              setAiSchedule(null);
              setAiScheduleError('');
              setPlanApprovedAt(null);
              setPlanApproveError('');
              persistAiSchedule(currentUserId, null);
            }}
          />
        ) : null}

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
            onConcluir={(row) => safeCycleProps.onConcluirSessao?.(row.key)}
            onReorder={(row, direction) => safeCycleProps.onReorderCycle?.(row.key, direction)}
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 120 }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={closeWizard}
            aria-hidden="true"
          />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div
            style={{ position: 'relative', zIndex: 10, display: 'flex', maxHeight: '86vh', width: '100%', maxWidth: 880, flexDirection: 'column', overflow: 'hidden', borderRadius: 20, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-high)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ borderBottom: '1px solid var(--pl-rule)', padding: '16px 24px', position: 'relative' }}>
              <button
                type="button"
                onClick={closeWizard}
                style={{ position: 'absolute', right: 16, top: 16, borderRadius: 8, padding: 4, color: 'var(--pl-ink-2)', background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label="Fechar configuração do planejamento"
              >
                <X size={22} />
              </button>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--pl-ink)', margin: 0 }}>Editar Planejamento</h3>
              <WizardStepper step={wizardStep} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {wizardStep === 1 ? (
              <div>
                <p style={{ textAlign: 'center', fontSize: 15, lineHeight: 1.7, color: 'var(--pl-ink-2)' }}>
                  Para iniciar o seu planejamento, escolha a melhor forma de visualização para você:
                </p>
                <div style={{ marginTop: 20, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  <WizardModeCard
                    active={wizardModeDraft === 'ciclo'}
                    icon={<RotateCcw size={62} style={{ color: 'var(--pl-accent)' }} />}
                    title="Ciclo de Estudos"
                    text="Estude as disciplinas em uma ordem rotativa, sem depender de dias fixos. Ideal para quem precisa de flexibilidade na rotina."
                    onClick={() => setWizardModeDraft('ciclo')}
                  />
                  <WizardModeCard
                    active={wizardModeDraft === 'fixo'}
                    icon={<CalendarDays size={62} style={{ color: 'var(--pl-accent)' }} />}
                    title="Planejamento Semanal"
                    text="Defina dias certos para cada frente de estudo e acompanhe tudo em calendário e kanban."
                    onClick={() => setWizardModeDraft('fixo')}
                  />
                </div>

                <div style={{ marginTop: 20, borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
                  <p style={{ textAlign: 'center', fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
                    Escolha quais cursos entram no escopo desse planejamento:
                  </p>
                  <div style={{ marginTop: 16, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
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
                        style={{
                          borderRadius: 12,
                          border: wizardCoursePlans.includes(course.plano) ? '1px solid var(--pl-accent)' : '1px solid var(--pl-rule-2)',
                          background: wizardCoursePlans.includes(course.plano) ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
                          padding: '12px 16px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'border-color .15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)', margin: 0 }}>{course.nome}</p>
                            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--pl-ink-2)' }}>{course.concurso || course.plano}</p>
                          </div>
                          {course.isTarget ? <TagPill label="Alvo" color="#1e3a5f" soft /> : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {wizardStep === 2 ? (
              <div>
                <p style={{ textAlign: 'center', fontSize: 15, lineHeight: 1.7, color: 'var(--pl-ink-2)' }}>
                  Selecione quais das suas <strong>disciplinas</strong> você deseja colocar no seu <strong>planejamento</strong>.
                </p>
                <div style={{ marginTop: 20, maxHeight: 300, overflowY: 'auto', borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
                  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
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
                          style={{
                            borderRadius: 12,
                            border: selected ? '1px solid var(--pl-accent)' : '1px solid var(--pl-rule-2)',
                            background: selected ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
                            padding: '12px 16px',
                            textAlign: 'center',
                            fontSize: 13,
                            fontWeight: 600,
                            color: selected ? 'var(--pl-ink)' : 'var(--pl-ink-3)',
                            cursor: 'pointer',
                            transition: 'border-color .15s',
                          }}
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
                <p style={{ textAlign: 'center', fontSize: 15, lineHeight: 1.7, color: 'var(--pl-ink-2)' }}>
                  Para cada disciplina, selecione a <strong>importância</strong> para a prova e o seu <strong>grau de conhecimento</strong>.
                </p>
                <div style={{ marginTop: 20, display: 'grid', gap: 16, gridTemplateColumns: '1.15fr 0.85fr' }}>
                  <div style={{ maxHeight: 300, overflowY: 'auto', borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                      {selectedWizardSubjects.map((discipline) => {
                        const config = wizardSubjectState[discipline.nome] || { importance: 3, knowledge: 3 };
                        return (
                          <div key={discipline.nome} className="pl-card" style={{ padding: 16 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)', textAlign: 'center', margin: 0 }}>{discipline.nome}</p>
                            <div style={{ marginTop: 16 }}>
                              <label className="pl-eyebrow">Importância</label>
                              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
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
                                  style={{ width: '100%', accentColor: 'var(--pl-accent)' }}
                                />
                                <span style={{ width: 24, textAlign: 'right', fontWeight: 700, color: 'var(--pl-ink)' }}>{config.importance}</span>
                              </div>
                            </div>
                            <div style={{ marginTop: 16 }}>
                              <label className="pl-eyebrow">Conhecimento</label>
                              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
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
                                  style={{ width: '100%', accentColor: 'var(--pl-accent)' }}
                                />
                                <span style={{ width: 24, textAlign: 'right', fontWeight: 700, color: 'var(--pl-ink)' }}>{config.knowledge}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ maxHeight: 300, overflowY: 'auto', borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {subjectPriorityPreview.map((discipline) => (
                      <div
                        key={discipline.nome}
                        style={{ borderRadius: 12, padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', backgroundColor: `${discipline.color}35`, borderLeft: `4px solid ${discipline.color}` }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <span style={{ minWidth: 36, fontSize: 14, fontWeight: 700 }}>{discipline.score}</span>
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
                <p style={{ textAlign: 'center', fontSize: 15, lineHeight: 1.7, color: 'var(--pl-ink-2)' }}>
                  Quais dias e quantas horas pretende estudar?
                </p>
                <div style={{ marginTop: 20, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  {WEEKDAY_ORDER.map((dayId) => {
                    const dayBlueprint = WEEKDAY_BLUEPRINT.find((day) => day.id === dayId);
                    const current = wizardHoursByDay[dayId] || { enabled: false, minutes: 0 };
                    return (
                      <div key={dayId} style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, border: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: '8px 12px' }}>
                        <input
                          type="checkbox"
                          checked={current.enabled}
                          onChange={() =>
                            setWizardHoursByDay((prev) => ({
                              ...prev,
                              [dayId]: { ...current, enabled: !current.enabled },
                            }))
                          }
                          style={{ width: 16, height: 16 }}
                        />
                        <span style={{ width: 56, borderRadius: 8, background: 'var(--pl-ink-3)', padding: '6px 12px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--pl-surface)' }}>
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
                          className="pl-input"
                          style={{ width: 92, padding: '6px 8px', fontSize: 13 }}
                        >
                          {TIME_PICKER_OPTIONS.map((minutes) => (
                            <option key={minutes} value={minutes}>
                              {formatHalfHourTime(minutes)}
                            </option>
                          ))}
                        </select>
                        <span style={{ fontSize: 13, color: 'var(--pl-ink-2)' }}>horas diárias</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 20, borderRadius: 12, background: 'var(--pl-accent-soft)', padding: '12px 20px', textAlign: 'right', fontSize: 17, fontWeight: 600, color: 'var(--pl-ink)' }}>
                  Total na Semana: {formatMinutes(totalWizardMinutes)}
                </div>

                <div style={{ marginTop: 24 }}>
                  <p style={{ fontSize: 15, color: 'var(--pl-ink-2)' }}>
                    Quantas matérias deseja encaixar por dia?
                  </p>
                  <div style={{ marginTop: 12, display: 'inline-flex', borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 4 }}>
                    {[1, 2, 3].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setWizardSubjectsPerDay(count)}
                        style={{
                          borderRadius: 8,
                          padding: '8px 16px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: 'none',
                          background: wizardSubjectsPerDay === count ? 'var(--pl-ink)' : 'transparent',
                          color: wizardSubjectsPerDay === count ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
                          transition: 'background .15s',
                        }}
                      >
                        {count} matéria{count > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                  <p style={{ marginTop: 12, fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-3)' }}>
                    O app usa esse número para distribuir blocos de teoria e aproveitar o tempo que sobrar com revisão ou questões.
                  </p>
                </div>

                <div style={{ marginTop: 24 }}>
                  <p style={{ fontSize: 15, color: 'var(--pl-ink-2)' }}>
                    Qual mínimo e máximo de tempo você deseja estudar uma mesma disciplina?
                  </p>
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
                    <select
                      value={wizardMinDuration}
                      onChange={(event) => setWizardMinDuration(Number(event.target.value))}
                      className="pl-input"
                      style={{ minWidth: 120, borderBottom: '2px solid var(--pl-accent)', background: 'transparent', padding: '8px', fontSize: 16, color: 'var(--pl-ink)' }}
                    >
                      {DURATION_OPTIONS.map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {formatMinutesShort(minutes)}
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: 16, color: 'var(--pl-ink-3)' }}>a</span>
                    <select
                      value={wizardMaxDuration}
                      onChange={(event) => setWizardMaxDuration(Number(event.target.value))}
                      className="pl-input"
                      style={{ minWidth: 120, borderBottom: '2px solid var(--pl-accent)', background: 'transparent', padding: '8px', fontSize: 16, color: 'var(--pl-ink)' }}
                    >
                      {DURATION_OPTIONS.filter((minutes) => minutes >= wizardMinDuration).map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {formatMinutesShort(minutes)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p style={{ marginTop: 12, fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-3)' }}>
                    Se o dia não fechar exatamente com a duração mínima, o restante vira bloco complementar de revisão ou questões.
                  </p>
                </div>
              </div>
            ) : null}

            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--pl-rule)', padding: '16px 24px' }}>
              <button type="button" onClick={closeWizard} className="pl-btn pl-btn-ghost pl-btn-sm">
                {wizardStep === 1 ? 'Agora não' : 'Cancelar'}
              </button>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={goToPreviousWizardStep}
                    className="pl-btn pl-btn-ghost"
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
                    className="pl-btn pl-btn-primary"
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={saveWizardConfig}
                    disabled={wizardCoursePlans.length === 0}
                    className="pl-btn pl-btn-primary"
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

function PlanejamentoHeader({ mode, setMode, onConfigurar, onGenerateAiSchedule, aiScheduleLoading }) {
  return (
    <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
      <div>
          <h1 className="pl-display" style={{ margin: 0, fontSize: 56, color: 'var(--pl-ink)' }}>
            Plano de estudos<span style={{ color: 'var(--pl-accent)' }}>.</span>
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 660, lineHeight: 1.5 }}>
            Escolha entre uma rotação flexível para rotina variável ou uma agenda fixa para semanas previsíveis.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          <button type="button" className="pl-btn pl-btn-ai" onClick={onGenerateAiSchedule} disabled={aiScheduleLoading}>
            {aiScheduleLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {aiScheduleLoading ? 'Gerando' : 'Gerar com IA'}
          </button>
        </div>
    </header>
  );
}

function PlSchedulePanel({
  schedule,
  loading,
  error,
  onRetry,
  onClose,
  onApprove,
  approving = false,
  approved = false,
  approveError = '',
  justApproved = false,
  onReavaliar,
  adjusting = false,
  adjustMessage = '',
}) {
  const semana = Array.isArray(schedule?.semana) ? schedule.semana : [];
  const canApprove = !loading && semana.length > 0 && typeof onApprove === 'function';
  const canReavaliar = approved && typeof onReavaliar === 'function';

  return (
    <section className="pl-card-ai" style={{ padding: 22, border: '1px solid var(--pl-accent-soft)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <span className="pl-tag pl-tag-accent">Cronograma inteligente</span>
          <h2 className="pl-section-title" style={{ marginTop: 10 }}>Sugestao semanal da IA</h2>
          <p className="pl-muted" style={{ margin: '8px 0 0', maxWidth: 760, lineHeight: 1.6 }}>
            {loading
              ? 'Analisando suas disciplinas, disponibilidade e concurso alvo para montar uma semana equilibrada.'
              : schedule?.resumo || 'Gere uma proposta automatica e use como referencia para ajustar seu planejamento.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {canApprove ? (
            <button
              type="button"
              className="pl-btn pl-btn-primary pl-btn-sm"
              onClick={onApprove}
              disabled={approving || approved}
            >
              {approving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {approved ? 'Plano aprovado' : approving ? 'Salvando' : 'Aprovar plano'}
            </button>
          ) : null}
          {canReavaliar ? (
            <button
              type="button"
              className="pl-btn pl-btn-sm"
              onClick={onReavaliar}
              disabled={adjusting}
              title="Reajusta o plano com base no que você atrasou, adiantou ou errou — sem IA"
            >
              {adjusting ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {adjusting ? 'Reavaliando' : 'Reavaliar plano'}
            </button>
          ) : null}
          <button type="button" className="pl-btn pl-btn-sm" onClick={onRetry} disabled={loading}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Regerar
          </button>
          <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" onClick={onClose}>
            <X size={13} />
            Fechar
          </button>
        </div>
      </div>

      {approveError ? (
        <div style={{ marginTop: 16, borderRadius: 12, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', padding: 14, color: 'var(--pl-danger)', fontSize: 13, fontWeight: 700 }}>
          {approveError}
        </div>
      ) : null}

      {(approved || justApproved) && !approveError ? (
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, border: '1px solid var(--pl-success-soft)', background: 'var(--pl-success-soft)', padding: '12px 14px', color: 'var(--pl-success)', fontSize: 13, fontWeight: 700 }}>
          <Check size={15} />
          Plano salvo como sua referência ativa. Ele volta automaticamente quando você reabrir o planejamento.
        </div>
      ) : null}

      {adjustMessage ? (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '12px 14px', color: 'var(--pl-ink-2)', fontSize: 13, fontWeight: 700 }}>
          <RefreshCw size={15} />
          {adjustMessage}
        </div>
      ) : null}

      {error ? (
        <div style={{ marginTop: 16, borderRadius: 12, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', padding: 14, color: 'var(--pl-danger)', fontSize: 13, fontWeight: 700 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
          {[0, 1, 2].map((item) => (
            <div key={item} style={{ height: 54, borderRadius: 14, background: 'rgba(30, 58, 95, 0.08)' }} />
          ))}
        </div>
      ) : null}

      {!loading && semana.length > 0 ? (
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {semana.map((day) => (
            <article key={day.dia} style={{ borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 16 }}>
              <div className="pl-overline">{DIA_LABELS[day.dia] || day.dia}</div>
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                {(Array.isArray(day.blocos) ? day.blocos : []).map((block, index) => {
                  const tone = MODO_COLORS[block.modo] || MODO_COLORS.Teoria;
                  return (
                    <div key={`${day.dia}-${block.disciplina}-${index}`} style={{ borderLeft: `4px solid ${tone.border}`, borderRadius: 12, background: tone.bg, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <strong style={{ color: 'var(--pl-ink)', fontSize: 13 }}>{block.disciplina}</strong>
                        <span style={{ color: tone.color, fontSize: 11, fontWeight: 800 }}>{block.duracao}min</span>
                      </div>
                      <p style={{ margin: '6px 0 0', color: 'var(--pl-ink-2)', fontSize: 12, fontWeight: 700 }}>
                        {block.horario} · {block.modo}
                      </p>
                      {block.topico ? (
                        <p style={{ margin: '6px 0 0', color: 'var(--pl-ink-2)', fontSize: 12, lineHeight: 1.45 }}>
                          {block.topico}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!loading && schedule?.prioridades?.length ? (
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {schedule.prioridades.map((item) => (
            <span key={item} className="pl-tag pl-tag-highlight">{item}</span>
          ))}
          {schedule.horasTotais ? <span className="pl-tag">{schedule.horasTotais}h totais</span> : null}
        </div>
      ) : null}

      {!loading && schedule?.dica ? (
        <p style={{ margin: '14px 0 0', color: 'var(--pl-ink-2)', fontSize: 13, fontWeight: 600 }}>
          {schedule.dica}
        </p>
      ) : null}
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
  onConcluir,
  onReorder,
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
        <CicloActions onRecomecar={onRecomecar} onReplanejar={onReplanejar} onRemover={onRemover} disabled={disciplinas.length === 0} complete={progress >= 100 && disciplinas.length > 0} />
      </section>

      <section className="planning-main-grid">
        <SequenciaDosEstudosCard
          disciplinas={disciplinas}
          activeIndex={currentIndex}
          onEditar={onEditar}
          onStart={onStart}
          onManual={onManual}
          onHistory={onHistory}
          onConcluir={onConcluir}
          onReorder={onReorder}
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

function CicloActions({ onRecomecar, onReplanejar, onRemover, disabled, complete = false }) {
  return (
    <div className="pl-card planning-cycle-actions">
      <button
        type="button"
        className={complete ? 'pl-btn pl-btn-primary pl-btn-sm' : 'pl-btn pl-btn-sm'}
        onClick={onRecomecar}
        disabled={disabled}
        title={complete ? 'Marca este ciclo como concluído e reinicia a rotação' : 'Reinicia o progresso do ciclo'}
      >
        <RotateCcw size={13} />
        {complete ? 'Concluir ciclo' : 'Recomeçar'}
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

function SequenciaDosEstudosCard({ disciplinas, activeIndex, onEditar, onStart, onManual, onHistory, onConcluir, onReorder }) {
  return (
    <section className="pl-card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end' }}>
        <div>
          <div className="pl-overline">Sequência dos estudos</div>
          <h2 className="pl-section-title" style={{ marginTop: 7 }}>{disciplinas.length} matérias na rotação</h2>
        </div>
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
              isFirst={index === 0}
              isLast={index === disciplinas.length - 1}
              onStart={onStart}
              onManual={onManual}
              onHistory={onHistory}
              onConcluir={onConcluir}
              onReorder={onReorder}
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

function CicloRow({ disciplina, active, isFirst = false, isLast = false, onStart, onManual, onHistory, onConcluir, onReorder }) {
  const pct = disciplina.previstaMin > 0 ? Math.round((disciplina.feitaMin / disciplina.previstaMin) * 100) : 0;
  const done = disciplina.previstaMin > 0 && disciplina.feitaMin >= disciplina.previstaMin;
  const showReorder = typeof onReorder === 'function';

  const reorderBtnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 18,
    borderRadius: 5,
    border: '1px solid var(--pl-rule-2)',
    background: 'var(--pl-surface)',
    color: 'var(--pl-ink-3)',
    cursor: 'pointer',
  };

  return (
    <article className={active ? 'planning-cycle-row is-active' : 'planning-cycle-row'}>
      <div className="planning-cycle-row-main">
        <span className="planning-subject-bar" style={{ background: disciplina.cor }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong>{disciplina.nome}</strong>
            {active && <span className="pl-tag pl-tag-highlight">Agora</span>}
            {done && <span className="pl-tag pl-tag-success">Concluída</span>}
          </div>
          {active && (
            <div className="pl-progress-track" style={{ marginTop: 9 }}>
              <div className="pl-progress-fill" style={{ width: `${pct}%`, background: disciplina.cor }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="planning-time-label">{formatMinutes(disciplina.feitaMin)} / {formatMinutes(disciplina.previstaMin)}</span>
          {showReorder && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <button
                type="button"
                style={{ ...reorderBtnStyle, opacity: isFirst ? 0.4 : 1 }}
                disabled={isFirst}
                onClick={() => onReorder(disciplina, 'up')}
                title="Subir na rotação"
                aria-label={`Subir ${disciplina.nome} na rotação`}
              >
                <ChevronUp size={13} />
              </button>
              <button
                type="button"
                style={{ ...reorderBtnStyle, opacity: isLast ? 0.4 : 1 }}
                disabled={isLast}
                onClick={() => onReorder(disciplina, 'down')}
                title="Descer na rotação"
                aria-label={`Descer ${disciplina.nome} na rotação`}
              >
                <ChevronDown size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {active && (
        <div className="planning-cycle-row-actions">
          <button type="button" className="pl-btn pl-btn-primary pl-btn-sm" onClick={() => onStart?.(disciplina)}>
            <Play size={13} fill="currentColor" />
            Iniciar estudo
          </button>
          {typeof onConcluir === 'function' && (
            <button type="button" className="pl-btn pl-btn-sm" onClick={() => onConcluir(disciplina)} title="Marca esta sessão como estudada e avança a rotação">
              <Check size={13} />
              Concluir sessão
            </button>
          )}
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
  const { segs } = disciplinas.reduce((acc, disciplina) => {
    const f = total > 0 ? disciplina.previstaMin / total : 0;
    const start = acc.cum * 360 - 90;
    const end = (acc.cum + f) * 360 - 90;
    const doneF = disciplina.previstaMin > 0 ? Math.min(1, disciplina.feitaMin / disciplina.previstaMin) : 0;
    acc.segs.push({ ...disciplina, start, end, doneEnd: start + (end - start) * doneF });
    acc.cum += f;
    return acc;
  }, { cum: 0, segs: [] });

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
        <FixoStat label="Dias ativos" value={stats.activeDays} sub={`na semana · ${stats.pace}`} tone="success" />
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
      ? currentMonthGrid.map((day) => (day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null))
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

function TagPill({ label, color, soft = false }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '4px 12px',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
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
  const steps = ['Organização', 'Disciplinas', 'Relevância', 'Horários'];

  return (
    <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {steps.map((label, index) => {
        const number = index + 1;
        const active = step === number;
        const done = step > number;

        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  border: active || done ? '2px solid var(--pl-accent)' : '2px solid var(--pl-ink-3)',
                  background: active || done ? 'var(--pl-accent)' : 'transparent',
                  fontSize: 15,
                  fontWeight: 700,
                  color: active || done ? 'var(--pl-bg)' : 'var(--pl-ink-3)',
                }}
              >
                {String(number).padStart(2, '0')}
              </div>
              <span style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? 'var(--pl-ink)' : 'var(--pl-ink-3)' }}>{label}</span>
            </div>
            {number < steps.length ? <div style={{ height: 2, width: 48, background: 'var(--pl-rule-2)' }} /> : null}
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
      style={{
        borderRadius: 16,
        border: active ? '2px solid var(--pl-accent)' : '1px solid var(--pl-rule-2)',
        textAlign: 'left',
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'none',
        transition: 'border-color .15s',
        boxShadow: active ? 'inset 0 0 0 1px var(--pl-accent)' : 'none',
      }}
    >
      <div style={{ display: 'flex', height: 144, alignItems: 'center', justifyContent: 'center', background: 'var(--pl-surface)' }}>{icon}</div>
      <div style={{ padding: 20, background: active ? 'var(--pl-accent-soft)' : 'var(--pl-surface)' }}>
        <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{title}</p>
        <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7, color: 'var(--pl-ink-2)' }}>{text}</p>
      </div>
    </button>
  );
}

function buildAiScheduleDisciplines({ targetDisciplines = [], cycleDisciplines = [], wizardSubjects = [], subjectConfig = {} }) {
  const source =
    Array.isArray(targetDisciplines) && targetDisciplines.length > 0
      ? targetDisciplines
      : Array.isArray(cycleDisciplines) && cycleDisciplines.length > 0
        ? cycleDisciplines
        : Array.isArray(wizardSubjects)
          ? wizardSubjects
          : [];

  return source
    .filter(Boolean)
    .map((discipline, index) => {
      const nome = String(discipline.nome || discipline.disciplina || discipline.title || `Disciplina ${index + 1}`).trim();
      const config = subjectConfig[nome] || {};
      const topicos = Array.isArray(discipline.topicos) ? discipline.topicos : [];

      return {
        nome,
        peso: Number(config.importance || discipline.peso || discipline.importance || discipline.manualImportance || 1),
        percentual: Number(discipline.percentual || discipline.progress || 0),
        topicosPendentes: Number(
          discipline.pendingTopics ||
            discipline.topicosPendentes ||
            topicos.filter((topic) => !topic?.concluido).length ||
            0
        ),
      };
    })
    .filter((discipline) => discipline.nome);
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

function getWeekdayId(date) {
  return WEEKDAY_ORDER[date.getDay()];
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
      label: `Matéria ${index + 1}`,
      minutes: minMinutes,
    });
    remaining -= minMinutes;
  }

  if (sessions.length === 0) {
    sessions.push({
      modeHint: total >= 45 ? 'questoes' : 'revisao',
      label: total >= 45 ? 'Questões' : 'Revisão',
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
        label: supportMode === 'questoes' ? 'Questões' : 'Revisão',
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
