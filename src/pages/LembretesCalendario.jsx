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
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import PageHeadPremium from '../components/PageHeadPremium';
import { buildWeeklyStudyPlan } from '../lib/weeklyPlanner';
import { supabase } from '../lib/supabase';

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
  Sessão: '#CCE5FF',
  Revisão: '#BAFFC9',
  Questões: '#FFDFBA',
  Ciclo: '#E8DAEF',
  Concurso: '#EAF2F8',
  Lembrete: '#FDEBD0',
};

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
  });
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
    () => calendarEvents.filter((event) => event.tipo !== 'Concurso' && event.tipo !== 'Lembrete').length,
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
    <div className="page-shell pb-10 !pt-4 sm:!pt-5">
      <PageHeadPremium
        className="lg:!flex-row lg:!items-center lg:!justify-between"
        icon={AlarmClock}
        title="Lembretes e calendário"
        subtitle="Visualize alertas, organize pendências e acompanhe provas no calendário unificado."
        leadingClassName="lg:max-w-[calc(100%-21rem)] xl:max-w-[52rem]"
        trailingWrapClassName="lg:ml-auto lg:w-auto lg:max-w-[20rem] lg:self-center"
        trailing={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-ink-100 sm:text-[13px]">
              <span className="text-[10px] uppercase tracking-[0.14em] text-ink-400">Alertas ativos</span>
              <span className="text-sm font-semibold tabular-nums text-white">{notifications.length}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-ink-100 sm:text-[13px]">
              <span className="text-[10px] uppercase tracking-[0.14em] text-ink-400">Provas no radar</span>
              <span className="text-sm font-semibold tabular-nums text-white">{notificationStats.provas}</span>
            </span>
          </div>
        }
      />

      <section className="mb-6 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
        <div className="soft-accent px-5 py-3 sm:px-6 lg:px-8">
            <div className="flex min-h-10 flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden">
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                  Filtrar
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <FilterPill active={filter === 'todos'} onClick={() => setFilter('todos')}>
                    Todos
                  </FilterPill>
                  <FilterPill active={filter === 'prova'} onClick={() => setFilter('prova')}>
                    Provas
                  </FilterPill>
                  <FilterPill active={filter === 'task'} onClick={() => setFilter('task')}>
                    Pendências
                  </FilterPill>
                  <FilterPill active={filter === 'status'} onClick={() => setFilter('status')}>
                    Status
                  </FilterPill>
                </div>
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={openNewReminder}
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-3 text-sm font-semibold leading-none text-ink-700 shadow-sm transition hover:border-ink-300 hover:bg-ink-50"
                >
                  <Plus size={16} strokeWidth={2} />
                  Novo lembrete
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarOpen(true)}
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-3 text-sm font-semibold leading-none text-ink-700 shadow-sm transition hover:border-ink-300 hover:bg-ink-50"
                >
                  <CalendarDays size={14} />
                  Abrir calendário
                </button>
              </div>
            </div>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[1.12fr_0.88fr] xl:items-start">
        <section className="section-card flex flex-col">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Radar ativo</p>
              <h3 className="mt-2 text-xl font-semibold text-ink-900 lg:text-2xl">Próximos lembretes</h3>
            </div>
            <span className="rounded-full border border-ink-200 bg-ink-50 px-4 py-2 text-sm font-semibold text-ink-500">
              {filteredNotifications.length} itens
            </span>
          </div>

          {filteredNotifications.length === 0 ? (
            <EmptyState text="Nenhum lembrete encontrado nesse filtro." />
          ) : (
            <div className={`custom-scrollbar space-y-2 pr-1 ${filteredNotifications.length > 3 ? 'max-h-[286px] overflow-y-auto' : ''}`}>
              {filteredNotifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenContest?.(item.contestId)}
                  className="w-full rounded-xl border border-ink-200 bg-ink-50/70 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <MiniTone type={item.type} />
                        {item.date ? <MiniDate date={item.date} /> : null}
                      </div>
                      {item.contestName ? (
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">{item.contestName}</p>
                      ) : null}
                      <p className="mt-2 text-base font-semibold text-ink-900">{item.title}</p>
                      <p className="mt-1 text-sm font-medium leading-relaxed text-ink-500">{item.text}</p>
                    </div>
                    <ExternalLink size={16} className="mt-1 shrink-0 text-ink-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="section-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-blue-700" />
              <h3 className="text-lg font-semibold text-ink-900">Agenda curta</h3>
            </div>
            <button
              type="button"
              onClick={openNewReminder}
              className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700"
            >
              <Plus size={12} />
              Adicionar
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Hoje</p>
              <div className="mt-2">
                <AgendaList
                  items={todayItems}
                  fullItems={agendaHoje}
                  emptyText="Nenhum marco de concurso para hoje."
                  onOpenContest={onOpenContest}
                />
              </div>
            </div>
            <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Amanhã</p>
              <div className="mt-2">
                <AgendaList
                  items={tomorrowItems}
                  fullItems={agendaAmanha}
                  emptyText="Nenhum marco de concurso para amanhã."
                  onOpenContest={onOpenContest}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="section-card flex flex-col">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <h3 className="text-lg font-semibold text-ink-900">Histórico e lembretes salvos</h3>
          </div>
          <span className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-500">
            {(manualReminders || []).length} lembretes manuais
          </span>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
          <div className={`custom-scrollbar space-y-2 pr-1 ${(manualReminders || []).length > 3 ? 'max-h-[286px] overflow-y-auto' : ''}`}>
            {(manualReminders || []).map((item) => (
              <div key={item.id} className="rounded-xl border border-ink-200 bg-ink-50/70 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <MiniTone type={item.type || 'task'} />
                      {item.date ? <MiniDate date={item.date} /> : null}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink-900">{item.title}</p>
                    {item.description ? <p className="mt-1 text-sm font-medium text-ink-500">{item.description}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEditReminder(item)} className="rounded-lg border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-600">
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDeleteManualReminder(item.id)} className="rounded-lg border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {(manualReminders || []).length === 0 ? <EmptyState text="Nenhum lembrete manual salvo até agora." compact /> : null}
          </div>

          <div className={`custom-scrollbar space-y-2 pr-1 ${checklistHistory.length > 4 ? 'max-h-[286px] overflow-y-auto' : ''}`}>
            {checklistHistory.length === 0 ? (
              <EmptyState text="As ações concluídas dos concursos vão aparecer aqui." compact />
            ) : (
              checklistHistory.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenContest?.(item.contestId)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">{item.label}</p>
                    <p className="mt-1 text-xs font-semibold text-emerald-800/80">{item.contestName}</p>
                  </div>
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                </button>
              ))
            )}
          </div>
        </div>
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
    <div className="fixed inset-0 z-[220] bg-ink-950/55 backdrop-blur-sm">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--bg-app)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 bg-white px-4 py-2 shadow-sm md:px-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                <CalendarDays size={12} />
                Calendário ampliado
            </div>
            <h3 className="mt-1.5 text-xl font-semibold text-ink-900 sm:text-[1.45rem]">
              {viewMode === 'mes'
                ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : `Semana de ${String(currentWeek[0].getDate()).padStart(2, '0')}/${String(currentWeek[0].getMonth() + 1).padStart(2, '0')}`}
            </h3>
            <p className="mt-1 text-[12px] font-medium text-ink-500">
              {studyPlanningMode === 'ciclo'
                  ? 'Mesmo calendário do planejamento, com o ciclo distribuído conforme sua disponibilidade.'
                  : 'Mesmo calendário do planejamento fixo, com sincronização total entre as abas.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex gap-1 rounded-xl border border-ink-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode('mes')}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'mes' ? 'bg-blue-50 text-blue-700' : 'text-ink-500 hover:bg-ink-50'
                }`}
              >
                Mês
              </button>
              <button
                type="button"
                onClick={() => setViewMode('semana')}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'semana' ? 'bg-blue-50 text-blue-700' : 'text-ink-500 hover:bg-ink-50'
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
              className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-ink-600 transition hover:bg-ink-50"
            >
              <X size={16} />
              Fechar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 bg-white px-4 py-1.5 md:px-6">
          <div className="flex flex-wrap gap-2">
            <TagPill label={`${events.length} blocos`} color={STUDY_EVENT_COLORS.Concurso} soft />
            <TagPill label={`${contestEventCount} concursos`} color={STUDY_EVENT_COLORS.Concurso} soft />
            <TagPill label={`${manualEventCount} lembretes`} color={STUDY_EVENT_COLORS.Lembrete} soft />
            <TagPill label={`${studyEventCount} estudos`} color={STUDY_EVENT_COLORS.Sessão} soft />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => shiftCalendarDate(setCurrentDate, currentDate, viewMode, -1)}
              className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-ink-600 shadow-sm transition hover:bg-ink-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="rounded-xl border border-ink-200 bg-white px-4 py-1.5 text-sm font-semibold text-ink-600 shadow-sm transition hover:border-blue-600 hover:text-blue-700"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => shiftCalendarDate(setCurrentDate, currentDate, viewMode, 1)}
              className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-ink-600 shadow-sm transition hover:bg-ink-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 bg-white px-4 py-1.5 md:px-6">
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
            label="Mostrar estudos"
            checked={showStudySchedule}
            onChange={() => setShowStudySchedule((prev) => !prev)}
          />
        </div>

        <div className="min-h-0 flex-1 p-1.5">
          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
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
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-ink-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">Lembrete manual</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink-900">
              {editing ? 'Editar lembrete' : 'Novo lembrete'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-ink-200 bg-white p-2 text-ink-500"
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
                className="w-full rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm font-semibold text-ink-700 outline-none focus:border-blue-600"
              />
            </Field>
            <Field label="Tipo">
              <select
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                className="w-full rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm font-semibold text-ink-700 outline-none focus:border-blue-600"
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
                className="w-full rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm font-semibold text-ink-700 outline-none focus:border-blue-600"
              />
            </Field>
            <Field label="Hora">
              <input
                type="time"
                value={form.time}
                onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                className="w-full rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm font-semibold text-ink-700 outline-none focus:border-blue-600"
              />
            </Field>
          </div>

          <Field label="Descrição">
            <textarea
              rows="3"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="w-full resize-none rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm font-medium text-ink-700 outline-none focus:border-blue-600"
            />
          </Field>

          <Field label="Concurso vinculado">
            <select
              value={form.contestId}
              onChange={(event) => setForm((prev) => ({ ...prev, contestId: event.target.value }))}
              className="w-full rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm font-semibold text-ink-700 outline-none focus:border-blue-600"
            >
              <option value="">Sem vínculo específico</option>
              {contestOptions.map((contest) => (
                <option key={contest.id} value={contest.id}>
                  {contest.nome}
                </option>
              ))}
            </select>
          </Field>

          <label className="inline-flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-4 text-sm font-semibold text-ink-700">
            <input
              type="checkbox"
              checked={form.showOnCalendar}
              onChange={() => setForm((prev) => ({ ...prev, showOnCalendar: !prev.showOnCalendar }))}
              className="h-4 w-4 rounded border-ink-300"
            />
            Exibir este lembrete no calendário compartilhado
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-ink-100 bg-ink-50 px-6 py-4">
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
    <div className="fixed inset-0 z-[231] flex items-center justify-center bg-ink-950/55 p-4 backdrop-blur-sm">
      <div className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">Agenda diária</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink-900">{formatDateBR(date)}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 bg-white p-2 text-ink-500">
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
                className="w-full rounded-xl border border-ink-200 bg-ink-50/70 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/60"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <TagPill label={event.tipo} color={event.cor} soft />
                  <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                    {event.hora}
                  </span>
                </div>
                <p className="mt-3 text-base font-semibold text-ink-900">{event.titulo}</p>
                {event.detail ? <p className="mt-1 text-sm font-medium text-ink-500">{event.detail}</p> : null}
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
    <div className="flex h-full flex-col bg-ink-50">
      <div className="grid grid-cols-7 border-b border-ink-200 bg-white shadow-sm">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-r border-ink-100 p-2 text-center text-[10px] font-semibold uppercase tracking-widest text-ink-500 last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      <div
        className="grid flex-1 grid-cols-7 gap-[1px] bg-ink-200"
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
              className={`group flex min-h-0 flex-col overflow-hidden bg-white p-[3px] transition-colors ${isValid ? 'hover:bg-blue-50/30' : 'bg-ink-50/60'}`}
            >
              {isValid ? (
                <>
                  <div className="mb-1 flex items-start justify-between gap-1">
                    <span
                      className={`flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-semibold ${
                        isToday ? 'bg-blue-700 text-white shadow-md' : 'text-ink-600'
                      }`}
                    >
                      {day}
                    </span>
                    <div className="flex items-center gap-1">
                      {dayEvents.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => onOpenDailyAgenda?.(dateKey)}
                          className="flex h-4.5 w-4.5 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-500 opacity-0 transition group-hover:opacity-100 hover:text-blue-700"
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
    <div className="flex h-full flex-col overflow-hidden bg-ink-50">
      <div className="grid grid-cols-7 border-b border-ink-200 bg-white shadow-sm">
        {currentWeek.map((date) => {
          const dateKey = toDateKey(date);
          const isToday = dateKey === toDateKey(new Date());
          return (
            <div key={dateKey} className="group border-r border-ink-100 p-2 text-center last:border-r-0">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
                {WEEKDAY_LABELS[date.getDay()]}
              </div>
              <div className="flex items-center justify-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold ${
                    isToday ? 'bg-blue-700 text-white shadow-md' : 'text-ink-800'
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

      <div className="grid flex-1 grid-cols-7 gap-[1px] bg-ink-200">
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
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-500 opacity-0 transition group-hover:opacity-100 hover:text-blue-700"
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
                    className="w-full rounded-xl border border-ink-100 border-l-4 bg-white p-2.5 text-left shadow-sm transition-all hover:shadow-md"
                    style={{ borderLeftColor: event.cor }}
                  >
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-ink-500">
                      <Clock size={10} />
                      {event.hora}
                    </div>
                    <div className="text-xs font-semibold leading-snug text-ink-800">{event.titulo}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span
                        className="rounded border border-white/40 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-blue-950"
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
          : 'border-ink-200 bg-white text-ink-600 hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700'
      }`}
    >
      {children}
    </button>
  );
}

function CalendarToggle({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm font-semibold text-ink-600">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-ink-300" />
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
    <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
      {formatDateBR(date)}
    </span>
  );
}

function AgendaList({ items = [], fullItems = [], emptyText, onOpenContest }) {
  const sourceItems = Array.isArray(fullItems) && fullItems.length > 0 ? fullItems : items;

  if (sourceItems.length === 0) {
    return <EmptyState text={emptyText} compact />;
  }

  return (
    <div className={`custom-scrollbar space-y-2 pr-1 ${sourceItems.length > 3 ? 'max-h-[220px] overflow-y-auto' : ''}`}>
      {sourceItems.map((item, index) => (
        <button
          key={`${item.titulo}-${index}`}
          type="button"
          onClick={() => item.contestId && onOpenContest?.(item.contestId)}
          className={`w-full rounded-xl border border-ink-200 bg-ink-50/70 px-4 py-3 text-left transition-all ${
            item.contestId ? 'hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/60' : ''
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">{item.horario || 'Agenda'}</p>
          {item.contestName ? (
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">{item.contestName}</p>
          ) : null}
          <p className="mt-2 text-sm font-semibold text-ink-900">{item.titulo}</p>
          {item.detalhe ? <p className="mt-1 text-sm font-medium text-ink-500">{item.detalhe}</p> : null}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ text, compact = false }) {
  return (
    <div className={`rounded-xl border border-dashed border-ink-200 bg-ink-50/70 text-sm font-semibold text-ink-500 ${compact ? 'px-4 py-4' : 'px-5 py-6'}`}>
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
        color: soft ? '#14110d' : '#FFFFFF',
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
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">{label}</span>
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

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateBR(value) {
  if (!value) return '';
  const [year, month, day] = String(value).split('-');
  if (year && month && day) return `${day}/${month}/${year}`;
  return String(value);
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
  if (session?.modeLabel === 'Revisao') return 'Revisão';
  if (session?.modeLabel === 'Questoes') return 'Questões';
  return 'Sessão';
}

function getSessionColor(session, index) {
  const directColor = session?.recommendation?.cor || session?.cor;
  if (directColor) return directColor;

  const type = getSessionType(session);
  if (type === 'Revisão') return STUDY_EVENT_COLORS.Revisão;
  if (type === 'Questões') return STUDY_EVENT_COLORS.Questões;

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
