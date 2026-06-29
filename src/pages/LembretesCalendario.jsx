import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  ExternalLink,
  Filter,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { buildWeeklyStudyPlan } from '../lib/weeklyPlanner';
import { showConfirm } from '../lib/dialogs';
import { supabase } from '../lib/supabase';
import { getBrazilHolidays } from '../services/brasilApi';
import { getAreaToken } from '../lib/areaTokens';
import { generateDailyNote } from '../lib/aiClient';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
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

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAY_IDS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const STUDY_EVENT_COLORS = {
  Sessao: '#CCE5FF',
  Revisao: '#BAFFC9',
  Questoes: '#FFDFBA',
  Ciclo: '#E8DAEF',
  Concurso: '#EAF2F8',
  Lembrete: '#FDEBD0',
  Feriado: '#DCFCE7',
};

const FALLBACK_MOTIVATIONAL_QUOTES = [
  'Pequenos avanços diários constroem grandes conquistas.',
  'Consistência tranquila vence a pressa barulhenta.',
  'Hoje é dia de proteger o foco e deixar o próximo passo mais leve.',
  'Um bloco bem feito já muda a direção da semana.',
  'A aprovação gosta de quem volta para a mesa com calma.',
];

export default function LembretesCalendario({
  notifications = [],
  agendaHoje = [],
  agendaAmanha = [],
  onOpenContest,
  onOpenDiscipline,
  studyPlanningMode = 'fixo',
  targetContest = null,
  planningDisciplines = [],
  planningStudyRecommendation = null,
  weeklyAvailability = [],
  activeCycle = [],
  manualReminders = [],
  onSaveReminder,
  onDeleteReminder,
  currentUserId = '',
  contestOptions = [],
  sharedCalendarViewMode,
  setSharedCalendarViewMode,
  sharedCalendarDate,
  setSharedCalendarDate,
}) {
  const [filter, setFilter] = useState('todos');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showStudySchedule, setShowStudySchedule] = useState(true);
  const [calendarLayers, setCalendarLayers] = useState({
    concursos: true,
    lembretes: true,
    estudos: true,
    feriados: true,
  });
  const [holidaysByYear, setHolidaysByYear] = useState({});
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [dailyAgendaDate, setDailyAgendaDate] = useState('');
  const [localCalendarViewMode, setLocalCalendarViewMode] = useState('mes');
  const [localCalendarDate, setLocalCalendarDate] = useState(new Date());
  const [reminderForm, setReminderForm] = useState(() => buildReminderDraft());
  const todayItems = useMemo(() => (Array.isArray(agendaHoje) ? agendaHoje.slice(0, 3) : []), [agendaHoje]);
  const tomorrowItems = useMemo(() => (Array.isArray(agendaAmanha) ? agendaAmanha.slice(0, 3) : []), [agendaAmanha]);

  const calendarViewMode = sharedCalendarViewMode || localCalendarViewMode;
  const setCalendarViewMode = setSharedCalendarViewMode || setLocalCalendarViewMode;
  const calendarDate = sharedCalendarDate || localCalendarDate;
  const setCalendarDate = setSharedCalendarDate || setLocalCalendarDate;

  const filteredNotifications = useMemo(() => {
    if (filter === 'todos') return notifications;
    return notifications.filter((item) => item.type === filter);
  }, [filter, notifications]);

  const notificationStats = useMemo(
    () => ({
      provas: notifications.filter((item) => item.type === 'prova').length,
      pendencias: notifications.filter((item) => item.type === 'task').length,
      status: notifications.filter((item) => item.type === 'status').length,
    }),
    [notifications]
  );

  const weeklyPlan = useMemo(
    () =>
      buildWeeklyStudyPlan({
        availability: Array.isArray(weeklyAvailability) ? weeklyAvailability : [],
        targetContest,
        targetDisciplines: Array.isArray(planningDisciplines) ? planningDisciplines : [],
        studyRecommendation: planningStudyRecommendation,
      }),
    [weeklyAvailability, targetContest, planningDisciplines, planningStudyRecommendation]
  );

  const currentWeek = useMemo(() => buildWeekDays(calendarDate), [calendarDate]);
  const currentMonthGrid = useMemo(() => buildMonthGrid(calendarDate), [calendarDate]);
  const currentMonthDates = useMemo(
    () =>
      currentMonthGrid
        .filter((day) => day !== null)
        .map((day) => new Date(calendarDate.getFullYear(), calendarDate.getMonth(), Number(day))),
    [calendarDate, currentMonthGrid]
  );
  const visibleYears = useMemo(() => {
    const dates = calendarViewMode === 'mes' ? currentMonthDates : currentWeek;
    return [...new Set(dates.map((date) => date.getFullYear()))];
  }, [calendarViewMode, currentMonthDates, currentWeek]);

  const datedContestEvents = useMemo(
    () =>
      notifications
        .filter((item) => item?.date)
        .map((item) => ({
          id: `contest-${item.id}`,
          titulo: item.title,
          data: item.date,
          hora: item.type === 'prova' ? 'Concurso' : 'Lembrete',
          tipo: 'Concurso',
          cor: STUDY_EVENT_COLORS.Concurso,
          detail: item.text,
          contestId: item.contestId,
          contestName: item.contestName || '',
        })),
    [notifications]
  );

  const manualReminderEvents = useMemo(
    () =>
      (Array.isArray(manualReminders) ? manualReminders : [])
        .filter((item) => item?.showOnCalendar !== false && item?.date)
        .map((item) => ({
          id: item.id,
          titulo: item.title,
          data: item.date,
          hora: item.time || 'Lembrete',
          tipo: 'Lembrete',
          cor: STUDY_EVENT_COLORS.Lembrete,
          detail: item.description || '',
          contestId: item.contestId || '',
          contestName:
            contestOptions.find((contest) => contest.id === item.contestId)?.nome ||
            item.contestName ||
            '',
        })),
    [manualReminders, contestOptions]
  );

  const fixedStudyEvents = useMemo(() => {
    const dates = calendarViewMode === 'mes' ? currentMonthDates : currentWeek;
    const sessionsByDay = Object.fromEntries((weeklyPlan?.days || []).map((day) => [day.id, day.sessions || []]));

    return dates.flatMap((date) => {
      const weekdayId = getWeekdayId(date);
      return (sessionsByDay[weekdayId] || []).map((session, index) => ({
        id: `fixed-${toDateKey(date)}-${session.id}-${index}`,
        titulo: session.title,
        data: toDateKey(date),
        hora: getSlotTimeLabel(session.slotId),
        tipo: getSessionType(session),
        cor: getSessionColor(session, index),
        detail: session.detail,
        disciplineName: session.recommendation?.nome || session.title,
      }));
    });
  }, [calendarViewMode, currentMonthDates, currentWeek, weeklyPlan]);

  const cycleStudyEvents = useMemo(() => {
    const dates = calendarViewMode === 'mes' ? currentMonthDates : currentWeek;
    return buildCycleCalendarEvents({
      dates,
      availability: weeklyAvailability,
      activeCycle,
    });
  }, [calendarViewMode, currentMonthDates, currentWeek, weeklyAvailability, activeCycle]);

  useEffect(() => {
    let cancelled = false;

    async function loadVisibleHolidays() {
      const missingYears = visibleYears.filter((year) => !holidaysByYear[year]);
      if (missingYears.length === 0) return;

      const entries = await Promise.all(
        missingYears.map(async (year) => {
          try {
            return [year, await getBrazilHolidays(year)];
          } catch (error) {
            console.warn('[BrasilAPI] Falha ao carregar feriados:', year, error?.message || error);
            return [year, []];
          }
        })
      );

      if (!cancelled) {
        setHolidaysByYear((prev) => ({
          ...prev,
          ...Object.fromEntries(entries),
        }));
      }
    }

    loadVisibleHolidays();
    return () => {
      cancelled = true;
    };
  }, [visibleYears, holidaysByYear]);

  const holidayEvents = useMemo(() => {
    const dates = calendarViewMode === 'mes' ? currentMonthDates : currentWeek;
    const visibleDateKeys = new Set(dates.map(toDateKey));
    return visibleYears.flatMap((year) =>
      (holidaysByYear[year] || [])
        .filter((holiday) => visibleDateKeys.has(holiday.date))
        .map((holiday) => ({
          id: `holiday-${holiday.date}-${holiday.name}`,
          titulo: holiday.name,
          data: holiday.date,
          hora: 'Feriado nacional',
          tipo: 'Feriado',
          cor: STUDY_EVENT_COLORS.Feriado,
          detail: 'BrasilAPI - feriado nacional',
        }))
    );
  }, [calendarViewMode, currentMonthDates, currentWeek, holidaysByYear, visibleYears]);

  const calendarEvents = useMemo(() => {
    const scheduleEvents =
      showStudySchedule && calendarLayers.estudos
        ? studyPlanningMode === 'ciclo'
          ? cycleStudyEvents
          : fixedStudyEvents
        : [];

    return [
      ...(calendarLayers.concursos ? datedContestEvents : []),
      ...(calendarLayers.lembretes ? manualReminderEvents : []),
      ...(calendarLayers.feriados ? holidayEvents : []),
      ...scheduleEvents,
    ];
  }, [
    showStudySchedule,
    calendarLayers,
    studyPlanningMode,
    cycleStudyEvents,
    fixedStudyEvents,
    datedContestEvents,
    manualReminderEvents,
    holidayEvents,
  ]);

  const contestEventCount = useMemo(
    () => calendarEvents.filter((event) => event.tipo === 'Concurso').length,
    [calendarEvents]
  );

  const manualEventCount = useMemo(
    () => calendarEvents.filter((event) => event.tipo === 'Lembrete').length,
    [calendarEvents]
  );

  const studyEventCount = useMemo(
    () => calendarEvents.filter((event) => event.tipo !== 'Concurso' && event.tipo !== 'Lembrete' && event.tipo !== 'Feriado').length,
    [calendarEvents]
  );

  const holidayEventCount = useMemo(
    () => calendarEvents.filter((event) => event.tipo === 'Feriado').length,
    [calendarEvents]
  );

  // onSaveReminder muda de identidade a cada render do App; com ele nas deps o
  // efeito refazia o fetch a cada render e SUBSTITUÍA a lista — apagando o
  // lembrete recém-criado cujo insert ainda estava em voo. Carregar 1x por usuário.
  const onSaveReminderRef = useRef(onSaveReminder);
  useEffect(() => {
    onSaveReminderRef.current = onSaveReminder;
  }, [onSaveReminder]);

  useEffect(() => {
    let active = true;

    const loadRemoteReminders = async () => {
      if (!currentUserId) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('calendar_reminders')
          .select('*')
          .eq('user_id', currentUserId)
          .order('data', { ascending: true });

        if (error) throw error;
        if (!active) return;

        const normalized = (data || []).map((row) => ({
          id: row.id,
          title: row.titulo || '',
          description: row.descricao || '',
          type: row.tipo || 'task',
          date: row.data || '',
          time: row.hora || '',
          contestId: row.contest_slug || '',
          contestSlug: row.contest_slug || '',
          disciplina: row.disciplina || '',
          showOnCalendar: true,
          isDone: Boolean(row.is_done),
        }));

        onSaveReminderRef.current?.(normalized);
      } catch (error) {
        console.warn('[calendar_reminders] Falha ao carregar lembretes:', error?.message || error);
      }
    };

    loadRemoteReminders();

    return () => {
      active = false;
    };
  }, [currentUserId]);

  function openNewReminder(dateValue = '') {
    setEditingReminder(null);
    setReminderForm(buildReminderDraft(dateValue ? { date: dateValue } : {}));
    setReminderModalOpen(true);
  }

  function openEditReminder(item) {
    if (!item) return;
    setEditingReminder(item);
    setReminderForm(buildReminderDraft(item));
    setReminderModalOpen(true);
  }

  async function handleDeleteReminder(reminderId) {
    if (!reminderId) return;
    const ok = await showConfirm('Excluir este lembrete?', { title: 'Excluir lembrete', confirmLabel: 'Excluir', danger: true });
    if (!ok) return;
    onDeleteReminder?.(reminderId);
  }

  async function saveReminder() {
    if (!String(reminderForm.title || '').trim() || !String(reminderForm.date || '').trim()) return;
    const reminderPayload = {
      ...editingReminder,
      ...reminderForm,
      title: String(reminderForm.title || '').trim(),
      description: String(reminderForm.description || '').trim(),
      contestName:
        contestOptions.find((contest) => contest.id === reminderForm.contestId)?.nome || '',
    };

    // Persistência centralizada no App (handleSaveManualReminder) — salvar aqui TAMBÉM
    // causava insert duplicado no Supabase (cada lembrete novo gerava 2 linhas).
    onSaveReminder?.(reminderPayload);

    setReminderModalOpen(false);
    setEditingReminder(null);
    setReminderForm(buildReminderDraft());
  }

  return (
    <div className="pl-page">
      <LembretesHeader alertasAtivos={notifications.length} provasNoRadar={notificationStats.provas} />

      <LembretesFilters
        value={filter}
        onChange={setFilter}
        counts={{
          todos: notifications.length,
          prova: notificationStats.provas,
          task: notificationStats.pendencias,
          status: notificationStats.status,
        }}
        onNovo={openNewReminder}
        onCalendario={() => setCalendarOpen(true)}
      />

      <section className="pl-reminders-layout">
        <ProximosLembretesCard
          lembretes={filteredNotifications}
          contestOptions={contestOptions}
          onOpenContest={onOpenContest}
        />
        <AgendaCurtaCard
          hoje={todayItems}
          amanha={tomorrowItems}
          fullHoje={agendaHoje}
          fullAmanha={agendaAmanha}
          onAdicionar={openNewReminder}
          onOpenContest={onOpenContest}
        />
      </section>

      <HistoricoCard
        manuais={Array.isArray(manualReminders) ? manualReminders : []}
        onEdit={openEditReminder}
        onDelete={handleDeleteReminder}
        onOpenContest={onOpenContest}
      />

      {calendarOpen ? (
        <FullScreenCalendarModal
          currentDate={calendarDate}
          setCurrentDate={setCalendarDate}
          viewMode={calendarViewMode}
          setViewMode={setCalendarViewMode}
          onClose={() => setCalendarOpen(false)}
          events={calendarEvents}
          showStudySchedule={showStudySchedule}
          setShowStudySchedule={setShowStudySchedule}
          studyPlanningMode={studyPlanningMode}
          contestEventCount={contestEventCount}
          manualEventCount={manualEventCount}
          studyEventCount={studyEventCount}
          holidayEventCount={holidayEventCount}
          onOpenContest={onOpenContest}
          onOpenDiscipline={onOpenDiscipline}
          calendarLayers={calendarLayers}
          setCalendarLayers={setCalendarLayers}
          onCreateReminder={openNewReminder}
          onOpenDailyAgenda={setDailyAgendaDate}
        />
      ) : null}

      {dailyAgendaDate ? (
        <DailyAgendaModal
          date={dailyAgendaDate}
          events={calendarEvents.filter((item) => item.data === dailyAgendaDate)}
          onClose={() => setDailyAgendaDate('')}
          onOpenContest={onOpenContest}
          onOpenDiscipline={onOpenDiscipline}
        />
      ) : null}

      {reminderModalOpen ? (
        <ReminderModal
          form={reminderForm}
          setForm={setReminderForm}
          onClose={() => {
            setReminderModalOpen(false);
            setEditingReminder(null);
          }}
          onSave={saveReminder}
          contestOptions={contestOptions}
          editing={Boolean(editingReminder)}
        />
      ) : null}
    </div>
  );
}

function LembretesHeader({ alertasAtivos, provasNoRadar }) {
  return (
    <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
      <div>
        <h1 className="pl-display" style={{ margin: 0, fontSize: 56, color: 'var(--pl-ink)' }}>
          Lembretes & calendário<span style={{ color: 'var(--pl-ink)' }}>.</span>
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 660, lineHeight: 1.5 }}>
          Visualize alertas, organize pendências e acompanhe provas no calendário unificado.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <ReminderStatTile label="Alertas ativos" value={alertasAtivos} color="var(--pl-ink)" />
        <ReminderStatTile label="Provas no radar" value={provasNoRadar} color="var(--pl-ink)" />
      </div>
    </header>
  );
}

function ReminderStatTile({ label, value, color }) {
  return (
    <div className="pl-reminder-stat">
      <div className="pl-eyebrow">{label}</div>
      <div className="pl-num" style={{ color }}>{value}</div>
    </div>
  );
}

function LembretesFilters({ value, onChange, counts, onNovo, onCalendario }) {
  const filters = [
    { id: 'todos', label: 'Todos', count: counts.todos },
    { id: 'prova', label: 'Provas', count: counts.prova },
    { id: 'task', label: 'Pendências', count: counts.task },
    { id: 'status', label: 'Status', count: counts.status },
  ];

  return (
    <div className="pl-lembretes-filters">
      <div className="pl-lembretes-filter-label">
        <Filter size={12} />
        <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>Filtrar</span>
      </div>
      {filters.map((item) => (
        <ReminderFilterChip key={item.id} active={value === item.id} onClick={() => onChange(item.id)} label={item.label} count={item.count} />
      ))}
      <div className="pl-lembretes-actions-spacer" />
      <button className="pl-btn pl-btn-primary pl-btn-sm" onClick={onNovo}><Plus size={12} /> Novo lembrete</button>
      <button className="pl-btn pl-btn-sm" onClick={onCalendario}><CalendarDays size={12} /> Abrir calendário</button>
    </div>
  );
}

function ReminderFilterChip({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 28,
        padding: '0 10px',
        borderRadius: 6,
        border: active ? '1px solid var(--pl-reminder-filter-active-border, var(--pl-ink))' : '1px solid var(--pl-reminder-filter-border, var(--pl-rule-2))',
        background: active ? 'var(--pl-reminder-filter-active-bg, var(--pl-ink))' : 'var(--pl-reminder-filter-bg, rgba(255,255,255,0.58))',
        color: active ? 'var(--pl-reminder-filter-active-ink, var(--pl-bg))' : 'var(--pl-reminder-filter-ink, var(--pl-ink-2))',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'background .14s ease, border-color .14s ease, transform .14s ease, box-shadow .14s ease',
      }}
    >
      {label}
      <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? 'var(--pl-reminder-filter-count-active-bg, rgba(243,239,229,0.18))' : 'var(--pl-reminder-filter-count-bg, var(--pl-bg-soft))', color: active ? 'var(--pl-reminder-filter-count-active-ink, currentColor)' : 'var(--pl-reminder-filter-count-ink, currentColor)', fontSize: 10 }}>
        {count}
      </span>
    </button>
  );
}

function ProximosLembretesCard({ lembretes = [], contestOptions = [], onOpenContest }) {
  return (
    <div className="pl-card pl-reminders-panel">
      <CardSectionHeader eyebrow="Radar ativo" title="Próximos lembretes" tag={`${lembretes.length} itens`} />
      {lembretes.length === 0 ? (
        <EmptyDashed text="Sem lembretes para esse filtro." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lembretes.map((item) => (
            <LembreteItem
              key={item.id}
              lembrete={item}
              area={findReminderArea(item, contestOptions)}
              onOpen={() => item.contestId && onOpenContest?.(item.contestId)}
            />
          ))}
        </div>
      )}
      <DailyMotivationNote />
    </div>
  );
}

function DailyMotivationNote() {
  const [quote, setQuote] = useState(() => getFallbackMotivationalQuote());

  useEffect(() => {
    let cancelled = false;
    const todayKey = toDateKey(new Date());
    const storageKey = `papirando_daily_motivation_${todayKey}`;

    try {
      const cached = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (cached?.quote) {
        setQuote(String(cached.quote));
        return;
      }
    } catch {
      // Cache opcional: se quebrar, a frase local segura a UI.
    }

    generateDailyNote({
      date: todayKey,
      focus: 'agenda, lembretes e rotina de estudos para concurso',
    })
      .then((data) => {
        const nextQuote = String(data?.quote || '').trim();
        if (!nextQuote || cancelled) return;
        setQuote(nextQuote);
        try {
          localStorage.setItem(storageKey, JSON.stringify({ quote: nextQuote, generatedAt: new Date().toISOString() }));
        } catch {
          // Sem problema: a IA pode tentar novamente na próxima sessão.
        }
      })
      .catch(() => {
        if (!cancelled) setQuote(getFallbackMotivationalQuote(todayKey));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { lead, emphasis } = splitMotivationalQuote(quote);

  return (
    <div className="pl-reminder-tip">
      <span className="pl-reminder-tip-icon"><Sparkles size={16} /></span>
      <p>
        {lead}
        {emphasis ? <> <span className="pl-tip-emphasis">{emphasis}</span></> : null}
      </p>
    </div>
  );
}

function LembreteItem({ lembrete, area, onOpen }) {
  const token = getAreaToken(area);
  const type = normalizeReminderType(lembrete.type);
  const tagClass = {
    pendencia: 'pl-tag pl-tag-highlight',
    prova: 'pl-tag pl-tag-accent',
    status: 'pl-tag pl-tag-success',
    alerta: 'pl-tag pl-tag-warn',
  }[type] || 'pl-tag';

  return (
    <div className="pl-reminder-item" style={{ borderLeftColor: token.cover }}>
      <div className="pl-reminder-item-head">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className={tagClass} style={{ letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 10 }}>
            {getReminderTypeLabel(lembrete.type)}
          </span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="pl-reminder-status">{isReminderDueToday(lembrete) ? 'Vence hoje' : 'Em andamento'}</span>
          <button type="button" onClick={onOpen} className="pl-reminder-open" aria-label="Abrir concurso relacionado">
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
      <div>
        {(lembrete.contestName || area) && (
          <div style={{ fontSize: 9.5, color: 'var(--pl-ink-3)', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
            {lembrete.contestName || token.label}
          </div>
        )}
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--pl-ink)' }}>{lembrete.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--pl-ink-2)', fontWeight: 500, marginTop: 3, lineHeight: 1.5 }}>{lembrete.text || lembrete.description || 'Sem detalhe adicional.'}</div>
      </div>
    </div>
  );
}

function AgendaCurtaCard({ hoje = [], amanha = [], fullHoje = [], fullAmanha = [], onAdicionar, onOpenContest }) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return (
    <div className="pl-card-paper pl-open-agenda">
      <div className="pl-open-agenda-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarDays size={16} style={{ color: 'var(--pl-ink-2)' }} />
          <h2>Agenda aberta</h2>
        </div>
        <button className="pl-btn-link" style={{ fontSize: 12 }} onClick={onAdicionar}>+ Adicionar marco</button>
      </div>
      <div className="pl-agenda-timeline">
        <AgendaSlot
          label="Hoje"
          date={today}
          items={hoje}
          fullItems={fullHoje}
          emptyText="Dia livre no calendário."
          onOpenContest={onOpenContest}
        />
        <AgendaSlot
          label="Amanhã"
          date={tomorrow}
          items={amanha}
          fullItems={fullAmanha}
          emptyText="Dia livre no calendário."
          onOpenContest={onOpenContest}
        />
      </div>
    </div>
  );
}

function AgendaSlot({ label, date, items, fullItems, emptyText, onOpenContest }) {
  return (
    <div className="pl-agenda-day">
      <div className="pl-agenda-day-marker" />
      <div className="pl-agenda-day-body">
        <div className="pl-agenda-day-title">
          <span>{label}</span>
          <small>{formatAgendaLongDate(date)}</small>
        </div>
        <AgendaList items={items} fullItems={fullItems} emptyText={emptyText} onOpenContest={onOpenContest} />
      </div>
    </div>
  );
}

function HistoricoCard({ manuais = [], acoesConcluidas = [], onEdit, onDelete, onOpenContest }) {
  return (
    <section className="pl-card" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={16} style={{ color: 'var(--pl-success)' }} />
          <h2 style={{ margin: 0, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 23, color: 'var(--pl-ink)' }}>Histórico e lembretes salvos</h2>
        </div>
        <span className="pl-tag">{manuais.length} lembretes manuais</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        {manuais.length === 0 ? (
          <EmptyDashed text="Nenhum lembrete manual salvo até agora." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {manuais.map((item) => (
              <ManualReminderItem key={item.id} item={item} onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} />
            ))}
          </div>
        )}
        {acoesConcluidas.length === 0 ? (
          <EmptyDashed text="As ações concluídas dos concursos vão aparecer aqui." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {acoesConcluidas.slice(0, 8).map((item) => (
              <button key={item.id} type="button" onClick={() => onOpenContest?.(item.contestId)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: '1px solid var(--pl-rule-2)', borderRadius: 5, background: 'var(--pl-surface-2)', textAlign: 'left', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--pl-success)' }}>{item.label}</div>
                  <div style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>{item.contestName}</div>
                </div>
                <CheckCircle2 size={15} style={{ color: 'var(--pl-success)', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ManualReminderItem({ item, onEdit, onDelete }) {
  return (
    <div style={{ padding: '12px 14px', border: '1px solid var(--pl-rule-2)', borderRadius: 5, background: 'var(--pl-surface-2)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className={`pl-tag ${normalizeReminderType(item.type) === 'prova' ? 'pl-tag-accent' : 'pl-tag-highlight'}`}>{getReminderTypeLabel(item.type)}</span>
            {item.date ? <span className="pl-tag">{formatDateShort(item.date)}</span> : null}
          </div>
          <div style={{ marginTop: 8, fontSize: 13.5, fontWeight: 800, color: 'var(--pl-ink)' }}>{item.title}</div>
          {item.description ? <div style={{ marginTop: 3, fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>{item.description}</div> : null}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="pl-btn pl-btn-sm" onClick={onEdit}>Editar</button>
          <button className="pl-btn pl-btn-sm" onClick={onDelete}><Trash2 size={12} /></button>
        </div>
      </div>
    </div>
  );
}

function CardSectionHeader({ eyebrow, title, tag }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div className="pl-eyebrow">{eyebrow}</div>
        <h2 style={{ margin: '5px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 24, color: 'var(--pl-ink)' }}>{title}</h2>
      </div>
      <span className="pl-tag">{tag}</span>
    </div>
  );
}

function EmptyDashed({ text }) {
  return (
    <div style={{ border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-surface-2)', borderRadius: 5, padding: 18, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
      {text}
    </div>
  );
}

function normalizeReminderType(type) {
  if (type === 'task') return 'pendencia';
  if (type === 'prova') return 'prova';
  if (type === 'status') return 'status';
  if (type === 'alerta') return 'alerta';
  return 'pendencia';
}

function getReminderTypeLabel(type) {
  const normalized = normalizeReminderType(type);
  if (normalized === 'prova') return 'Prova';
  if (normalized === 'status') return 'Status';
  if (normalized === 'alerta') return 'Alerta';
  return 'Pendência';
}

function findReminderArea(item, contestOptions) {
  return item.area ||
    item.contestArea ||
    contestOptions.find((contest) => contest.id === item.contestId || contest.nome === item.contestName)?.area ||
    'Outros';
}

function formatDateShort(value) {
  const [year, month, day] = String(value || '').split('-');
  if (year && month && day) return `${day}/${month}`;
  return value || '';
}

function FullScreenCalendarModal({
  currentDate,
  setCurrentDate,
  viewMode,
  setViewMode,
  onClose,
  events,
  showStudySchedule,
  setShowStudySchedule,
  studyPlanningMode,
  contestEventCount,
  manualEventCount,
  studyEventCount,
  holidayEventCount,
  onOpenContest,
  onOpenDiscipline,
  calendarLayers,
  setCalendarLayers,
  onCreateReminder,
  onOpenDailyAgenda,
}) {
  const currentWeek = useMemo(() => buildWeekDays(currentDate), [currentDate]);
  const currentMonthGrid = useMemo(() => buildMonthGrid(currentDate), [currentDate]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', overflow: 'hidden', background: 'var(--pl-bg)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '8px 24px', boxShadow: 'var(--pl-sh-low)' }}>
          <div>
            <span className="pl-tag pl-tag-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <CalendarDays size={12} />
              Calendário ampliado
            </span>
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 600, color: 'var(--pl-ink)' }}>
              {viewMode === 'mes'
                ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : `Semana de ${String(currentWeek[0].getDate()).padStart(2, '0')}/${String(currentWeek[0].getMonth() + 1).padStart(2, '0')}`}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)' }}>
              {studyPlanningMode === 'ciclo'
                  ? 'Mesmo calendário do planejamento, com o ciclo distribuído conforme sua disponibilidade.'
                  : 'Mesmo calendário do planejamento fixo, com sincronização total entre as abas.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4, borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 4 }}>
              <button
                type="button"
                onClick={() => setViewMode('mes')}
                style={{
                  borderRadius: 7,
                  padding: '5px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'mes' ? 'var(--pl-accent-soft)' : 'transparent',
                  color: viewMode === 'mes' ? 'var(--pl-accent)' : 'var(--pl-ink-3)',
                }}
              >
                Mês
              </button>
              <button
                type="button"
                onClick={() => setViewMode('semana')}
                style={{
                  borderRadius: 7,
                  padding: '5px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'semana' ? 'var(--pl-accent-soft)' : 'transparent',
                  color: viewMode === 'semana' ? 'var(--pl-accent)' : 'var(--pl-ink-3)',
                }}
              >
                Semana
              </button>
            </div>

            <button type="button" onClick={onCreateReminder} className="pl-btn pl-btn-primary pl-btn-sm" style={{ gap: 6 }}>
              <Plus size={15} strokeWidth={2} />
              Novo lembrete
            </button>

            <button
              type="button"
              onClick={onClose}
              className="pl-btn pl-btn-ghost pl-btn-sm"
            >
              <X size={15} />
              Fechar
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '6px 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <TagPill label={`${events.length} blocos`} color={STUDY_EVENT_COLORS.Concurso} soft />
            <TagPill label={`${contestEventCount} concursos`} color={STUDY_EVENT_COLORS.Concurso} soft />
            <TagPill label={`${manualEventCount} lembretes`} color={STUDY_EVENT_COLORS.Lembrete} soft />
            <TagPill label={`${holidayEventCount} feriados`} color={STUDY_EVENT_COLORS.Feriado} soft />
            <TagPill label={`${studyEventCount} estudos`} color={STUDY_EVENT_COLORS.Sessao} soft />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => shiftCalendarDate(setCurrentDate, currentDate, viewMode, -1)}
              className="pl-btn pl-btn-ghost pl-btn-sm"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="pl-btn pl-btn-ghost pl-btn-sm"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => shiftCalendarDate(setCurrentDate, currentDate, viewMode, 1)}
              className="pl-btn pl-btn-ghost pl-btn-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '6px 24px' }}>
          <CalendarToggle
            label="Concursos"
            checked={calendarLayers.concursos}
            onChange={() => setCalendarLayers((prev) => ({ ...prev, concursos: !prev.concursos }))}
          />
          <CalendarToggle
            label="Lembretes"
            checked={calendarLayers.lembretes}
            onChange={() => setCalendarLayers((prev) => ({ ...prev, lembretes: !prev.lembretes }))}
          />
          <CalendarToggle
            label="Cronograma"
            checked={calendarLayers.estudos}
            onChange={() => setCalendarLayers((prev) => ({ ...prev, estudos: !prev.estudos }))}
          />
          <CalendarToggle
            label="Feriados"
            checked={calendarLayers.feriados}
            onChange={() => setCalendarLayers((prev) => ({ ...prev, feriados: !prev.feriados }))}
          />
          <CalendarToggle
            label="Mostrar estudos"
            checked={showStudySchedule}
            onChange={() => setShowStudySchedule((prev) => !prev)}
          />
        </div>

        <div style={{ minHeight: 0, flex: 1, padding: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-low)' }}>
            {viewMode === 'mes' ? (
              <MonthCalendarView
                currentDate={currentDate}
                currentMonthGrid={currentMonthGrid}
                events={events}
                onOpenContest={onOpenContest}
                onOpenDiscipline={onOpenDiscipline}
                onCreateReminder={onCreateReminder}
                onOpenDailyAgenda={onOpenDailyAgenda}
              />
            ) : (
              <WeekCalendarView
                currentWeek={currentWeek}
                events={events}
                onOpenContest={onOpenContest}
                onOpenDiscipline={onOpenDiscipline}
                onCreateReminder={onCreateReminder}
                onOpenDailyAgenda={onOpenDailyAgenda}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReminderModal({ form, setForm, onClose, onSave, contestOptions = [], editing = false }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 640, overflow: 'hidden', borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-high)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--pl-rule)', padding: '20px 24px' }}>
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Lembrete manual</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--pl-ink)' }}>
              {editing ? 'Editar lembrete' : 'Novo lembrete'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pl-btn pl-btn-ghost"
            style={{ padding: 8 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 20, padding: 24 }}>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <Field label="Título">
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="pl-input"
              />
            </Field>
            <Field label="Tipo">
              <select
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                className="pl-input"
              >
                <option value="task">Pendência</option>
                <option value="prova">Prova</option>
                <option value="inscricao">Inscrição</option>
                <option value="resultado">Resultado</option>
                <option value="estudo">Estudo</option>
                <option value="status">Status</option>
              </select>
            </Field>
            <Field label="Data">
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                className="pl-input"
              />
            </Field>
            <Field label="Hora">
              <input
                type="time"
                value={form.time}
                onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                className="pl-input"
              />
            </Field>
          </div>

          <Field label="Descrição">
            <textarea
              rows="3"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="pl-input"
              style={{ resize: 'none' }}
            />
          </Field>

          <Field label="Concurso vinculado">
            <select
              value={form.contestId}
              onChange={(event) => setForm((prev) => ({ ...prev, contestId: event.target.value }))}
              className="pl-input"
            >
              <option value="">Sem vínculo específico</option>
              {contestOptions.map((contest) => (
                <option key={contest.id} value={contest.id}>
                  {contest.nome}
                </option>
              ))}
            </select>
          </Field>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 12, borderRadius: 10, border: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.showOnCalendar}
              onChange={() => setForm((prev) => ({ ...prev, showOnCalendar: !prev.showOnCalendar }))}
              style={{ width: 16, height: 16 }}
            />
            Exibir este lembrete no calendário compartilhado
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: '16px 24px' }}>
          <button type="button" onClick={onClose} className="pl-btn pl-btn-ghost">
            Cancelar
          </button>
          <button type="button" onClick={onSave} className="pl-btn pl-btn-primary">
            Salvar lembrete
          </button>
        </div>
      </div>
    </div>
  );
}

function DailyAgendaModal({ date, events = [], onClose, onOpenContest, onOpenDiscipline }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 231, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '82vh', width: '100%', maxWidth: 720, overflow: 'hidden', borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-high)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--pl-rule)', padding: '20px 24px' }}>
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Agenda diária</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--pl-ink)' }}>{formatDateBR(date)}</h3>
          </div>
          <button type="button" onClick={onClose} className="pl-btn pl-btn-ghost" style={{ padding: 8 }}>
            <X size={18} />
          </button>
        </div>
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.length === 0 ? (
            <EmptyState text="Nenhum compromisso encontrado nesse dia." />
          ) : (
            events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => openCalendarEvent(event, onOpenContest, onOpenDiscipline)}
                style={{ width: '100%', borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16, textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <TagPill label={formatCalendarTypeLabel(event.tipo)} color={event.cor} soft />
                  <span className="pl-tag" style={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 10 }}>
                    {event.hora}
                  </span>
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 15, fontWeight: 600, color: 'var(--pl-ink)' }}>{event.titulo}</p>
                {event.detail ? <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>{event.detail}</p> : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MonthCalendarView({ currentDate, currentMonthGrid, events, onCreateReminder, onOpenDailyAgenda }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--pl-bg-soft)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-low)' }}>
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            style={{ borderRight: '1px solid var(--pl-rule)', padding: 8, textAlign: 'center', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-ink-3)' }}
          >
            {label}
          </div>
        ))}
      </div>

      <div
        style={{ display: 'grid', flex: 1, gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--pl-rule-2)', gridTemplateRows: `repeat(${Math.ceil(currentMonthGrid.length / 7)}, minmax(0, 1fr))` }}
      >
        {currentMonthGrid.map((day, index) => {
          const isValid = day !== null;
          const date = isValid ? new Date(currentDate.getFullYear(), currentDate.getMonth(), Number(day)) : null;
          const dateKey = isValid ? toDateKey(date) : '';
          const dayEvents = isValid ? events.filter((event) => event.data === dateKey) : [];
          const isToday = isValid ? dateKey === toDateKey(new Date()) : false;

          return (
            <div
              key={`${dateKey || 'blank'}-${index}`}
              className="group"
              style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', background: isValid ? 'var(--pl-surface)' : 'var(--pl-bg-soft)', padding: 3 }}
            >
              {isValid ? (
                <>
                  <div style={{ marginBottom: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
                    <span
                      style={{
                        display: 'flex',
                        width: 20,
                        height: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        fontSize: 10,
                        fontWeight: 600,
                        background: isToday ? 'var(--pl-accent)' : 'transparent',
                        color: isToday ? '#fff' : 'var(--pl-ink-2)',
                      }}
                    >
                      {day}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {dayEvents.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => onOpenDailyAgenda?.(dateKey)}
                          className="cal-day-action-btn"
                          title="Abrir agenda do dia"
                        >
                          <Eye size={10} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onCreateReminder?.(dateKey)}
                        className="cal-day-action-btn cal-day-action-btn--add"
                        title="Adicionar lembrete ou evento"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 4, overflow: 'hidden' }}>
                    {dayEvents.length > 0 ? (
                      <div style={{ borderRadius: 5, border: '1px solid var(--pl-accent-soft)', background: 'var(--pl-accent-soft)', padding: '3px 4px', textAlign: 'center', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--pl-accent)' }}>
                        {dayEvents.length} atividade{dayEvents.length > 1 ? 's' : ''}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekCalendarView({ currentWeek, events, onOpenContest, onOpenDiscipline, onCreateReminder, onOpenDailyAgenda }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--pl-bg-soft)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-low)' }}>
        {currentWeek.map((date) => {
          const dateKey = toDateKey(date);
          const isToday = dateKey === toDateKey(new Date());
          return (
            <div key={dateKey} className="group" style={{ borderRight: '1px solid var(--pl-rule)', padding: 8, textAlign: 'center' }}>
              <div style={{ marginBottom: 4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-ink-3)' }}>
                {WEEKDAY_LABELS[date.getDay()]}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    width: 32,
                    height: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    fontSize: 17,
                    fontWeight: 600,
                    background: isToday ? 'var(--pl-accent)' : 'transparent',
                    color: isToday ? '#fff' : 'var(--pl-ink)',
                  }}
                >
                  {date.getDate()}
                </div>
                <button
                  type="button"
                  onClick={() => onCreateReminder?.(dateKey)}
                  className="cal-day-action-btn cal-day-action-btn--add"
                  title="Adicionar lembrete ou evento"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', flex: 1, gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--pl-rule-2)' }}>
        {currentWeek.map((date) => {
          const dateKey = toDateKey(date);
          const dayEvents = events.filter((event) => event.data === dateKey);

          return (
            <div key={dateKey} className="group" style={{ display: 'flex', flexDirection: 'column', background: 'var(--pl-surface)', padding: 8 }}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                {dayEvents.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => onOpenDailyAgenda?.(dateKey)}
                    className="cal-day-action-btn"
                    title="Abrir agenda do dia"
                  >
                    <Eye size={13} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onCreateReminder?.(dateKey)}
                  className="cal-day-action-btn cal-day-action-btn--add"
                  title="Adicionar lembrete ou evento"
                >
                  <Plus size={13} />
                </button>
              </div>
              <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openCalendarEvent(event, onOpenContest, onOpenDiscipline)}
                    style={{ width: '100%', borderRadius: 10, border: '1px solid var(--pl-rule)', borderLeft: `4px solid ${event.cor}`, background: 'var(--pl-surface)', padding: 10, textAlign: 'left', boxShadow: 'var(--pl-sh-low)', cursor: 'pointer' }}
                  >
                    <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
                      <Clock size={10} />
                      {event.hora}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, color: 'var(--pl-ink)' }}>{event.titulo}</div>
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      <span
                        style={{ borderRadius: 4, border: '1px solid rgba(255,255,255,0.4)', padding: '1px 6px', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', color: 'var(--pl-ink)', backgroundColor: event.cor }}
                      >
                        {formatCalendarTypeLabel(event.tipo)}
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
  );
}

function openCalendarEvent(event, onOpenContest, onOpenDiscipline) {
  if (event.contestId) {
    onOpenContest?.(event.contestId);
    return;
  }

  if (event.disciplineName) {
    onOpenDiscipline?.(event.disciplineName);
  }
}

function CalendarToggle({ label, checked, onChange }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '6px 12px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 14, height: 14 }} />
      {label}
    </label>
  );
}

function formatCalendarTypeLabel(type) {
  const labelMap = {
    Sessao: 'Sessão',
    Revisao: 'Revisão',
    Questoes: 'Questões',
  };

  return labelMap[type] || type;
}

function AgendaList({ items = [], fullItems = [], emptyText, onOpenContest }) {
  const sourceItems = Array.isArray(fullItems) && fullItems.length > 0 ? fullItems : items;

  if (sourceItems.length === 0) {
    return <AgendaEmptyBlock title={emptyText} />;
  }

  return (
    <div className={`custom-scrollbar pl-agenda-events ${sourceItems.length > 3 ? 'pl-agenda-events-scroll' : ''}`}>
      {sourceItems.map((item, index) => (
        <button
          key={`${item.titulo}-${index}`}
          type="button"
          onClick={() => item.contestId && onOpenContest?.(item.contestId)}
          className="pl-agenda-event"
        >
          <span className="pl-agenda-event-dot" />
          <span className="pl-agenda-event-time">{item.horario || item.hora || 'Agenda'}</span>
          <span className="pl-agenda-event-copy">
            <strong>{item.titulo}</strong>
            <small>{[item.contestName, item.detalhe || item.detail].filter(Boolean).join(' - ') || 'Marco do calendário'}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

function AgendaEmptyBlock({ title }) {
  return (
    <div className="pl-agenda-empty">
      <span><CalendarDays size={16} /></span>
      <div>
        <strong>{title}</strong>
        <p>Considere encaixar uma revisão leve ou descanso estratégico.</p>
      </div>
    </div>
  );
}

function EmptyState({ text, compact = false }) {
  return (
    <div style={{ borderRadius: 10, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-bg-soft)', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-3)', padding: compact ? '16px' : '20px' }}>
      {text}
    </div>
  );
}

function TagPill({ label, color, soft = false }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '2px 10px',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        backgroundColor: soft ? `${color}22` : color,
        color: soft ? 'var(--pl-ink)' : '#FFFFFF',
        border: soft ? `1px solid ${color}30` : 'none',
      }}
    >
      {label}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
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

  while (grid.length % 7 !== 0) {
    grid.push(null);
  }

  return grid;
}

function shiftCalendarDate(setDate, currentDate, mode, direction) {
  const next = new Date(currentDate);
  if (mode === 'mes') next.setMonth(next.getMonth() + direction);
  else next.setDate(next.getDate() + direction * 7);
  setDate(next);
}

function getFallbackMotivationalQuote(seed = toDateKey(new Date())) {
  const source = String(seed || '');
  const index = Math.abs([...source].reduce((acc, char) => acc + char.charCodeAt(0), 0)) % FALLBACK_MOTIVATIONAL_QUOTES.length;
  return FALLBACK_MOTIVATIONAL_QUOTES[index];
}

function splitMotivationalQuote(quote = '') {
  const clean = String(quote || '').trim() || getFallbackMotivationalQuote();
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length <= 5) {
    return { lead: clean, emphasis: '' };
  }

  const emphasisSize = Math.min(3, Math.max(2, Math.floor(words.length / 4)));
  return {
    lead: words.slice(0, -emphasisSize).join(' '),
    emphasis: words.slice(-emphasisSize).join(' '),
  };
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateBR(value) {
  if (!value) return '';
  const [year, month, day] = String(value).split('-');
  if (year && month && day) return `${day}/${month}/${year}`;
  return String(value);
}

function formatAgendaLongDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function isReminderDueToday(lembrete) {
  return lembrete?.date && lembrete.date === toDateKey(new Date());
}

function getWeekdayId(date) {
  return WEEKDAY_IDS[date.getDay()];
}

function getSlotTimeLabel(slotId) {
  if (slotId === 'manha') return '08:00';
  if (slotId === 'tarde') return '14:00';
  return '19:00';
}

function getSessionType(session) {
  if (session?.modeLabel === 'Revisao') return 'Revisao';
  if (session?.modeLabel === 'Questoes') return 'Questoes';
  return 'Sessao';
}

function getSessionColor(session, index) {
  const directColor = session?.recommendation?.cor || session?.cor;
  if (directColor) return directColor;

  const type = getSessionType(session);
  if (type === 'Revisao') return STUDY_EVENT_COLORS.Revisao;
  if (type === 'Questoes') return STUDY_EVENT_COLORS.Questoes;

  return ['#CCE5FF', '#D7BAFF', '#FFCCE5', '#BAFFC9', '#FFDFBA', '#EAF2F8'][index % 6];
}

function buildCycleCalendarEvents({ dates, availability, activeCycle }) {
  const orderedDates = Array.isArray(dates) ? dates : [];
  const cycleItems = (Array.isArray(activeCycle) ? activeCycle : []).filter(Boolean);
  const availabilityMap = new Map((Array.isArray(availability) ? availability : []).map((day) => [day.id, day]));

  if (orderedDates.length === 0 || cycleItems.length === 0) return [];

  const firstPendingIndex = cycleItems.findIndex((item) => !item?.concluido);
  let pointer = firstPendingIndex >= 0 ? firstPendingIndex : 0;

  return orderedDates.flatMap((date) => {
    const weekdayId = getWeekdayId(date);
    const dayConfig = availabilityMap.get(weekdayId);
    const enabledSlots = (dayConfig?.slots || []).filter(
      (slot) => dayConfig?.enabled && slot?.enabled && Number(slot?.minutes || 0) > 0
    );

    return enabledSlots.map((slot, slotIndex) => {
      const cycleItem = cycleItems[pointer % cycleItems.length];
      pointer += 1;

      return {
        id: `cycle-${toDateKey(date)}-${slot.id}-${slotIndex}-${cycleItem.id}`,
        titulo: cycleItem.materia,
        data: toDateKey(date),
        hora: getSlotTimeLabel(slot.id),
        tipo: 'Ciclo',
        cor: cycleItem.cor || STUDY_EVENT_COLORS.Ciclo,
        detail: `Bloco ${cycleItem.bloco || 1} - ${formatCycleMinutes(cycleItem.minutos || slot.minutes || 0)}`,
        disciplineName: cycleItem.materia,
      };
    });
  });
}

function formatCycleMinutes(totalMinutes) {
  const minutes = Math.max(0, Number(totalMinutes || 0));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours <= 0) return `${rest}min`;
  return `${hours}h${String(rest).padStart(2, '0')}min`;
}

function buildReminderDraft(reminder = {}) {
  const now = new Date();
  return {
    id: reminder.id || '',
    title: reminder.title || '',
    description: reminder.description || '',
    type: reminder.type || 'task',
    date: reminder.date || toDateKey(now),
    time: reminder.time || '09:00',
    contestId: reminder.contestId || '',
    showOnCalendar: reminder.showOnCalendar !== false,
  };
}
