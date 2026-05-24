import React, { useEffect, useMemo, useState } from 'react';
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
  checklistHistory = [],
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

        onSaveReminder?.(normalized);
      } catch (error) {
        console.warn('[calendar_reminders] Falha ao carregar lembretes:', error?.message || error);
      }
    };

    loadRemoteReminders();

    return () => {
      active = false;
    };
  }, [currentUserId, onSaveReminder]);

  function openNewReminder(dateValue = '') {
    setEditingReminder(null);
    setReminderForm(buildReminderDraft(dateValue ? { date: dateValue } : {}));
    setReminderModalOpen(true);
  }

  function openEditReminder(reminder) {
    setEditingReminder(reminder);
    setReminderForm(buildReminderDraft(reminder));
    setReminderModalOpen(true);
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

    onSaveReminder?.(reminderPayload);

    if (currentUserId) {
      const payload = {
        user_id: currentUserId,
        titulo: reminderPayload.title,
        descricao: reminderPayload.description || '',
        tipo: reminderPayload.type || 'task',
        data: reminderPayload.date,
        hora: reminderPayload.time || '',
        contest_slug: reminderPayload.contestSlug || reminderPayload.contestId || '',
        disciplina: reminderPayload.disciplina || '',
      };

      if (editingReminder?.id) {
        supabase
          .from('calendar_reminders')
          .update(payload)
          .eq('id', editingReminder.id)
          .eq('user_id', currentUserId)
          .catch(console.warn);
      } else {
        supabase
          .from('calendar_reminders')
          .insert(payload)
          .select('*')
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.warn(error);
              return;
            }

            if (data) {
              onSaveReminder?.({
                ...reminderPayload,
                id: data.id,
                contestId: data.contest_slug || reminderPayload.contestId || '',
                contestSlug: data.contest_slug || reminderPayload.contestSlug || '',
                disciplina: data.disciplina || reminderPayload.disciplina || '',
              });
            }
          })
          .catch(console.warn);
      }
    }

    setReminderModalOpen(false);
    setEditingReminder(null);
    setReminderForm(buildReminderDraft());
  }

  function handleDeleteManualReminder(reminderId) {
    onDeleteReminder?.(reminderId);

    if (currentUserId && reminderId) {
      supabase
        .from('calendar_reminders')
        .delete()
        .eq('id', reminderId)
        .eq('user_id', currentUserId)
        .catch(console.warn);
    }
  }

  return (
    <div className="pl-paper-bg-soft pl-lembretes-page">
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
          Lembretes &amp; calendário<span style={{ color: 'var(--pl-accent)' }}>.</span>
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 660, lineHeight: 1.5 }}>
          Visualize alertas, organize pendências e acompanhe provas no calendário unificado.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <ReminderStatTile label="Alertas ativos" value={alertasAtivos} color={alertasAtivos > 0 ? 'var(--pl-highlight-ink)' : 'var(--pl-ink)'} />
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
        border: '1px solid var(--pl-rule-2)',
        background: active ? 'var(--pl-ink)' : 'rgba(255,255,255,0.58)',
        color: active ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'background .14s ease, border-color .14s ease, transform .14s ease, box-shadow .14s ease',
      }}
    >
      {label}
      <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(243,239,229,0.18)' : 'var(--pl-bg-soft)', fontSize: 10 }}>
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
    <div className="fixed inset-0 z-[220] bg-slate-950/55 backdrop-blur-sm">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--bg-app)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2 shadow-sm md:px-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                <CalendarDays size={12} />
                Calendário ampliado
            </div>
            <h3 className="mt-1.5 text-xl font-semibold text-slate-900 sm:text-[1.45rem]">
              {viewMode === 'mes'
                ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : `Semana de ${String(currentWeek[0].getDate()).padStart(2, '0')}/${String(currentWeek[0].getMonth() + 1).padStart(2, '0')}`}
            </h3>
            <p className="mt-1 text-[12px] font-medium text-gray-500">
              {studyPlanningMode === 'ciclo'
                  ? 'Mesmo calendário do planejamento, com o ciclo distribuído conforme sua disponibilidade.'
                  : 'Mesmo calendário do planejamento fixo, com sincronização total entre as abas.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode('mes')}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'mes' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Mês
              </button>
              <button
                type="button"
                onClick={() => setViewMode('semana')}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'semana' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Semana
              </button>
            </div>

            <button type="button" onClick={onCreateReminder} className="btn-primary gap-2 px-3.5 py-1.5">
              <Plus size={16} strokeWidth={2} />
              Novo lembrete
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              <X size={16} />
              Fechar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-1.5 md:px-6">
          <div className="flex flex-wrap gap-2">
            <TagPill label={`${events.length} blocos`} color={STUDY_EVENT_COLORS.Concurso} soft />
            <TagPill label={`${contestEventCount} concursos`} color={STUDY_EVENT_COLORS.Concurso} soft />
            <TagPill label={`${manualEventCount} lembretes`} color={STUDY_EVENT_COLORS.Lembrete} soft />
            <TagPill label={`${holidayEventCount} feriados`} color={STUDY_EVENT_COLORS.Feriado} soft />
            <TagPill label={`${studyEventCount} estudos`} color={STUDY_EVENT_COLORS.Sessao} soft />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => shiftCalendarDate(setCurrentDate, currentDate, viewMode, -1)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-blue-600 hover:text-blue-700"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => shiftCalendarDate(setCurrentDate, currentDate, viewMode, 1)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 py-1.5 md:px-6">
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

        <div className="min-h-0 flex-1 p-1.5">
          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Lembrete manual</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">
              {editing ? 'Editar lembrete' : 'Novo lembrete'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
          <Field label="Título">
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
              />
            </Field>
            <Field label="Tipo">
              <select
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
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
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
              />
            </Field>
            <Field label="Hora">
              <input
                type="time"
                value={form.time}
                onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
              />
            </Field>
          </div>

          <Field label="Descrição">
            <textarea
              rows="3"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none focus:border-blue-600"
            />
          </Field>

          <Field label="Concurso vinculado">
            <select
              value={form.contestId}
              onChange={(event) => setForm((prev) => ({ ...prev, contestId: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
            >
              <option value="">Sem vínculo específico</option>
              {contestOptions.map((contest) => (
                <option key={contest.id} value={contest.id}>
                  {contest.nome}
                </option>
              ))}
            </select>
          </Field>

          <label className="inline-flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={form.showOnCalendar}
              onChange={() => setForm((prev) => ({ ...prev, showOnCalendar: !prev.showOnCalendar }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            Exibir este lembrete no calendário compartilhado
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5">
            Cancelar
          </button>
          <button type="button" onClick={onSave} className="btn-primary px-5 py-2.5">
            Salvar lembrete
          </button>
        </div>
      </div>
    </div>
  );
}

function DailyAgendaModal({ date, events = [], onClose, onOpenContest, onOpenDiscipline }) {
  return (
    <div className="fixed inset-0 z-[231] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Agenda diária</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">{formatDateBR(date)}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500">
            <X size={18} />
          </button>
        </div>
        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-6">
          {events.length === 0 ? (
            <EmptyState text="Nenhum compromisso encontrado nesse dia." />
          ) : (
            events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => openCalendarEvent(event, onOpenContest, onOpenDiscipline)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/60"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <TagPill label={formatCalendarTypeLabel(event.tipo)} color={event.cor} soft />
                  <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                    {event.hora}
                  </span>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-900">{event.titulo}</p>
                {event.detail ? <p className="mt-1 text-sm font-medium text-gray-500">{event.detail}</p> : null}
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
    <div className="flex h-full flex-col bg-gray-50">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-white shadow-sm">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-r border-gray-100 p-2 text-center text-[10px] font-semibold uppercase tracking-widest text-gray-500 last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      <div
        className="grid flex-1 grid-cols-7 gap-[1px] bg-gray-200"
        style={{ gridTemplateRows: `repeat(${Math.ceil(currentMonthGrid.length / 7)}, minmax(0, 1fr))` }}
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
              className={`group flex min-h-0 flex-col overflow-hidden bg-white p-[3px] transition-colors ${isValid ? 'hover:bg-blue-50/30' : 'bg-gray-50/60'}`}
            >
              {isValid ? (
                <>
                  <div className="mb-1 flex items-start justify-between gap-1">
                    <span
                      className={`flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-semibold ${
                        isToday ? 'bg-blue-700 text-white shadow-md' : 'text-gray-600'
                      }`}
                    >
                      {day}
                    </span>
                    <div className="flex items-center gap-1">
                      {dayEvents.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => onOpenDailyAgenda?.(dateKey)}
                          className="flex h-4.5 w-4.5 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 opacity-0 transition group-hover:opacity-100 hover:text-blue-700"
                          title="Abrir agenda do dia"
                        >
                          <Eye size={10} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onCreateReminder?.(dateKey)}
                        className="flex h-4.5 w-4.5 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700 opacity-0 transition group-hover:opacity-100 hover:bg-blue-100"
                        title="Adicionar lembrete ou evento"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                    {dayEvents.length > 0 ? (
                      <div className="rounded-md border border-blue-100 bg-blue-50/70 px-1 py-1 text-center text-[8px] font-semibold uppercase tracking-[0.16em] text-blue-700">
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
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-white shadow-sm">
        {currentWeek.map((date) => {
          const dateKey = toDateKey(date);
          const isToday = dateKey === toDateKey(new Date());
          return (
            <div key={dateKey} className="group border-r border-gray-100 p-2 text-center last:border-r-0">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {WEEKDAY_LABELS[date.getDay()]}
              </div>
              <div className="flex items-center justify-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold ${
                    isToday ? 'bg-blue-700 text-white shadow-md' : 'text-gray-800'
                  }`}
                >
                  {date.getDate()}
                </div>
                <button
                  type="button"
                  onClick={() => onCreateReminder?.(dateKey)}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700 opacity-0 transition hover:bg-blue-100 group-hover:opacity-100"
                  title="Adicionar lembrete ou evento"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid flex-1 grid-cols-7 gap-[1px] bg-gray-200">
        {currentWeek.map((date) => {
          const dateKey = toDateKey(date);
          const dayEvents = events.filter((event) => event.data === dateKey);

          return (
            <div key={dateKey} className="group flex flex-col bg-white p-2 transition-colors hover:bg-blue-50/20">
              <div className="mb-2 flex justify-end gap-1">
                {dayEvents.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => onOpenDailyAgenda?.(dateKey)}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 opacity-0 transition group-hover:opacity-100 hover:text-blue-700"
                    title="Abrir agenda do dia"
                  >
                    <Eye size={13} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onCreateReminder?.(dateKey)}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700 opacity-0 transition group-hover:opacity-100 hover:bg-blue-100"
                  title="Adicionar lembrete ou evento"
                >
                  <Plus size={13} />
                </button>
              </div>
              <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto">
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openCalendarEvent(event, onOpenContest, onOpenDiscipline)}
                    className="w-full rounded-xl border border-gray-100 border-l-4 bg-white p-2.5 text-left shadow-sm transition-all hover:shadow-md"
                    style={{ borderLeftColor: event.cor }}
                  >
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                      <Clock size={10} />
                      {event.hora}
                    </div>
                    <div className="text-xs font-semibold leading-snug text-gray-800">{event.titulo}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span
                        className="rounded border border-white/40 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-blue-950"
                        style={{ backgroundColor: event.cor }}
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

function FilterPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all ${
        active
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700'
      }`}
    >
      {children}
    </button>
  );
}

function CalendarToggle({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-gray-300" />
      {label}
    </label>
  );
}

function MiniTone({ type }) {
  const labelMap = {
    prova: 'Prova',
    task: 'Pendência',
    status: 'Status',
  };

  const toneMap = {
    prova: 'border-blue-100 bg-blue-50 text-blue-700',
    task: 'border-amber-100 bg-amber-50 text-amber-700',
    status: 'border-rose-100 bg-rose-50 text-rose-700',
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${toneMap[type] || toneMap.task}`}>
      {labelMap[type] || 'Lembrete'}
    </span>
  );
}

function MiniDate({ date }) {
  return (
    <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
      {formatDateBR(date)}
    </span>
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
    <div className={`rounded-xl border border-dashed border-gray-200 bg-gray-50/70 text-sm font-semibold text-gray-500 ${compact ? 'px-4 py-4' : 'px-5 py-6'}`}>
      {text}
    </div>
  );
}

function TagPill({ label, color, soft = false }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
      style={{
        backgroundColor: soft ? `${color}22` : color,
        color: soft ? '#0f172a' : '#FFFFFF',
        border: soft ? `1px solid ${color}30` : 'none',
      }}
    >
      {label}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</span>
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
