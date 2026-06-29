import { canonicalizeSubjectName } from './subjectCatalogUtils';

export function parseStudyTimeToMinutes(value) {
  const raw = String(value || '').trim();
  if (!raw) return 0;

  if (/^\d{1,2}:\d{2}:\d{2}$/.test(raw)) {
    const [hours, minutes, seconds] = raw.split(':').map(Number);
    return hours * 60 + minutes + Math.round((seconds || 0) / 60);
  }

  const hourMatch = raw.match(/(\d+)\s*h/i);
  const minuteMatch = raw.match(/(\d+)\s*min/i);
  const numberOnly = raw.match(/^\d+$/);

  if (hourMatch || minuteMatch) {
    return Number(hourMatch?.[1] || 0) * 60 + Number(minuteMatch?.[1] || 0);
  }

  if (numberOnly) {
    return Number(numberOnly[0]);
  }

  return 0;
}

export function formatMinutesLabel(totalMinutes) {
  const minutes = Math.max(0, Number(totalMinutes || 0));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${String(rest).padStart(2, '0')}m`;
}

export function normalizeDateKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return toDateKey(parsed);
}

export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function calculateStudyStreak(history = []) {
  const uniqueDays = new Set(
    (Array.isArray(history) ? history : []).map((item) => normalizeDateKey(item?.data)).filter(Boolean)
  );

  if (uniqueDays.size === 0) return 0;

  const today = new Date();
  const todayKey = toDateKey(today);
  const yesterdayKey = toDateKey(shiftDays(today, -1));

  let cursor =
    uniqueDays.has(todayKey) ? new Date(todayKey) : uniqueDays.has(yesterdayKey) ? new Date(yesterdayKey) : null;

  if (!cursor) return 0;

  let streak = 0;

  while (uniqueDays.has(toDateKey(cursor))) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }

  return streak;
}

export function getHistoryRange(history = [], days = 7, referenceDate = new Date()) {
  const safeDays = Math.max(1, Number(days || 1));
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  const start = shiftDays(end, -(safeDays - 1));
  start.setHours(0, 0, 0, 0);

  return (Array.isArray(history) ? history : []).filter((item) => {
    const normalizedDate = normalizeDateKey(item?.data);
    if (!normalizedDate) return false;
    const date = new Date(`${normalizedDate}T12:00:00`);
    return date >= start && date <= end;
  });
}

// Converte a meta semanal de horas do perfil (`meta_horas_semana`, definida no
// onboarding, default 18h) numa meta DIÁRIA de minutos. Piso de 30 min para
// evitar metas absurdamente baixas. Fallback 180 quando não há perfil.
export function dailyGoalMinutesFromWeeklyHours(metaHorasSemana) {
  const weekly = Number(metaHorasSemana);
  if (!Number.isFinite(weekly) || weekly <= 0) return 180;
  return Math.max(30, Math.round((weekly * 60) / 7));
}

export function buildStudyHistoryOverview(history = [], options = {}) {
  const safeHistory = Array.isArray(history) ? history : [];
  const dayGoalMinutes = Math.max(1, Number(options.dayGoalMinutes || 180));
  const todayKey = normalizeDateKey(options.referenceDate || new Date()) || toDateKey(new Date());
  const todayHistory = safeHistory.filter((item) => normalizeDateKey(item?.data) === todayKey);
  const last7Days = getHistoryRange(safeHistory, 7, options.referenceDate);

  const totalMinutes = safeHistory.reduce((acc, item) => acc + parseStudyTimeToMinutes(item?.tempo), 0);
  const todayMinutes = todayHistory.reduce((acc, item) => acc + parseStudyTimeToMinutes(item?.tempo), 0);
  const totalAcertos = safeHistory.reduce((acc, item) => acc + Number(item?.acertos || 0), 0);
  const totalErros = safeHistory.reduce((acc, item) => acc + Number(item?.erros || 0), 0);
  const questionsToday = todayHistory.reduce(
    (acc, item) => acc + Number(item?.acertos || 0) + Number(item?.erros || 0),
    0
  );
  const last7DaysMinutes = last7Days.reduce((acc, item) => acc + parseStudyTimeToMinutes(item?.tempo), 0);
  const totalQuestions = totalAcertos + totalErros;
  const studiedDays = new Set(safeHistory.map((item) => normalizeDateKey(item?.data)).filter(Boolean)).size;
  const streakDays = calculateStudyStreak(safeHistory);

  return {
    totalMinutes,
    totalMinutesLabel: formatMinutesLabel(totalMinutes),
    todayMinutes,
    todayMinutesLabel: formatMinutesLabel(todayMinutes),
    todayGoalMinutes: dayGoalMinutes,
    todayGoalProgress: Math.min(100, Math.round((todayMinutes / dayGoalMinutes) * 100)),
    studiedDays,
    streakDays,
    totalAcertos,
    totalErros,
    totalQuestions,
    overallAccuracy: totalQuestions > 0 ? Math.round((totalAcertos / totalQuestions) * 100) : 0,
    questionsToday,
    last7DaysMinutes,
    last7DaysAverageMinutes: Math.round(last7DaysMinutes / Math.max(1, safeDaysWithFallback(last7Days))),
    last7DaysAverageLabel: formatMinutesLabel(
      Math.round(last7DaysMinutes / Math.max(1, safeDaysWithFallback(last7Days)))
    ),
  };
}

function safeDaysWithFallback(history = []) {
  return new Set((Array.isArray(history) ? history : []).map((item) => normalizeDateKey(item?.data)).filter(Boolean))
    .size;
}

export function normalizeStudyRecord(record, subjectCatalog = []) {
  const canonicalSubject = canonicalizeSubjectName(record?.disciplina || record?.materia || '', subjectCatalog);

  return {
    ...record,
    disciplina: canonicalSubject || record?.disciplina || 'Disciplina',
    disciplinaCanonica: canonicalSubject || record?.disciplinaCanonica || record?.disciplina || 'Disciplina',
  };
}

export function buildCanonicalHistory(history = [], subjectCatalog = []) {
  if (!Array.isArray(history)) return [];
  return history.map((record) => normalizeStudyRecord(record, subjectCatalog));
}

export function buildHistoryTimelineItem(record, index = 0) {
  const tipoOriginal = String(record?.tipo || record?.type || 'Estudo');
  const tipo = tipoOriginal.charAt(0).toUpperCase() + tipoOriginal.slice(1).toLowerCase();
  const topico = String(record?.topico || record?.material || '').trim();
  const title = topico ? `${record.disciplina} - ${topico}` : record.disciplina;
  const duration = parseStudyTimeToMinutes(record?.tempo);
  const acertos = Number(record?.acertos || 0);
  const erros = Number(record?.erros || 0);
  const totalQuestoes = acertos + erros;
  const accuracy = totalQuestoes > 0 ? Math.round((acertos / totalQuestoes) * 100) : 0;

  return {
    id: record?.id || `timeline-${index}`,
    date: record?.data || record?.date || '',
    title,
    type: tipo,
    duration,
    questions: totalQuestoes,
    accuracy,
    note:
      topico && totalQuestoes > 0
        ? `Topico trabalhado: ${topico}. Desempenho do registro: ${accuracy}%.`
        : topico
          ? `Topico trabalhado: ${topico}.`
          : 'Registro de estudo salvo no historico.',
    color: accuracy >= 80 ? 'emerald' : accuracy >= 60 ? 'blue' : accuracy > 0 ? 'orange' : 'indigo',
    disciplina: record.disciplina,
  };
}

export function buildDisciplineSummaryFromHistory(history = []) {
  if (!Array.isArray(history)) return [];
  const grouped = new Map();

  history.forEach((record) => {
    const key = String(record.disciplinaCanonica || record.disciplina || '').trim();
    if (!key) return;

    const current = grouped.get(key) || {
      name: key,
      minutes: 0,
      questions: 0,
      acertos: 0,
      erros: 0,
      sessions: 0,
    };

    current.minutes += parseStudyTimeToMinutes(record.tempo);
    current.acertos += Number(record.acertos || 0);
    current.erros += Number(record.erros || 0);
    current.questions += Number(record.acertos || 0) + Number(record.erros || 0);
    current.sessions += 1;

    grouped.set(key, current);
  });

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      accuracy: item.questions > 0 ? Math.round((item.acertos / item.questions) * 100) : 0,
      timeLabel: formatMinutesLabel(item.minutes),
    }))
    .sort((first, second) => second.minutes - first.minutes || first.name.localeCompare(second.name, 'pt-BR'));
}
