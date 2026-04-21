export const WEEKDAY_BLUEPRINT = [
  { id: 'seg', label: 'Segunda', shortLabel: 'Seg' },
  { id: 'ter', label: 'Terca', shortLabel: 'Ter' },
  { id: 'qua', label: 'Quarta', shortLabel: 'Qua' },
  { id: 'qui', label: 'Quinta', shortLabel: 'Qui' },
  { id: 'sex', label: 'Sexta', shortLabel: 'Sex' },
  { id: 'sab', label: 'Sabado', shortLabel: 'Sab' },
  { id: 'dom', label: 'Domingo', shortLabel: 'Dom' },
];

export const SLOT_BLUEPRINT = [
  { id: 'manha', label: 'Manha' },
  { id: 'tarde', label: 'Tarde' },
  { id: 'noite', label: 'Noite' },
];

export const SLOT_DURATION_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180];

export function buildDefaultWeeklyAvailability() {
  return WEEKDAY_BLUEPRINT.map((day) => {
    const isWeekday = ['seg', 'ter', 'qua', 'qui', 'sex'].includes(day.id);
    const isSaturday = day.id === 'sab';

    return {
      ...day,
      enabled: isWeekday || isSaturday,
      slots: SLOT_BLUEPRINT.map((slot) => ({
        ...slot,
        enabled:
          (isWeekday && slot.id === 'noite') ||
          (isWeekday && slot.id === 'manha' && ['seg', 'qua'].includes(day.id)) ||
          (isSaturday && slot.id !== 'noite'),
        minutes:
          isWeekday && slot.id === 'noite'
            ? 90
            : isWeekday && slot.id === 'manha' && ['seg', 'qua'].includes(day.id)
              ? 60
              : isSaturday && slot.id === 'manha'
                ? 120
                : isSaturday && slot.id === 'tarde'
                  ? 90
                  : 0,
      })),
    };
  });
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getModeLabel(mode) {
  if (mode === 'questoes') return 'Questoes';
  if (mode === 'revisao') return 'Revisao';
  return 'Teoria';
}

function inferDisciplineMode(item) {
  const accuracy = Number.isFinite(Number(item?.accuracy)) ? Number(item.accuracy) : null;
  const percentual = Number(item?.percentual || 0);
  const pendingTopics = Number(
    item?.pendingTopics ||
      (Array.isArray(item?.topicos) ? item.topicos.filter((topic) => !topic?.concluido).length : 0)
  );

  if (accuracy !== null && accuracy < 65) return 'questoes';
  if (pendingTopics > 0 && percentual < 80) return 'teoria';
  return 'revisao';
}

function buildDisciplineCatalog({ targetDisciplines = [], studyRecommendation = null }) {
  const rankedSource =
    Array.isArray(studyRecommendation?.ranked) && studyRecommendation.ranked.length > 0
      ? studyRecommendation.ranked
      : Array.isArray(targetDisciplines)
        ? targetDisciplines
        : [];

  const catalogMap = new Map();

  rankedSource.forEach((item, index) => {
    if (!item) return;

    const nome = item.nome || `Disciplina ${index + 1}`;
    const key = normalizeName(nome) || `disciplina-${index}`;
    const pendingTopics = Number(
      item.pendingTopics ||
        (Array.isArray(item?.topicos) ? item.topicos.filter((topic) => !topic?.concluido).length : 0)
    );
    const studyMode = item.studyMode || inferDisciplineMode(item);
    const accuracy = Number.isFinite(Number(item?.accuracy)) ? Number(item.accuracy) : null;
    const score = Math.max(
      1,
      Number(
        item.score ||
          item.manualPriorityBoost ||
          (Number(item.manualImportance || 3) * (6 - Number(item.manualKnowledge || 3)) * 12)
      )
    );
    const candidate = {
      key: `${item.id || nome}-${index}`,
      id: item.id || key,
      nome,
      plano: item.plano || item.planoLabel || '',
      studyMode,
      studyModeLabel: item.studyModeLabel || getModeLabel(studyMode),
      durationMin: Number(item.suggestedDurationMin || 60),
      durationLabel: item.suggestedDurationLabel || formatMinutes(item.suggestedDurationMin || 60),
      topicName:
        item.nextTopic?.nome ||
        item.reason ||
        item.topicos?.find((topic) => !topic?.concluido)?.nome ||
        item.topicos?.[0]?.nome ||
        'Retomar frente principal',
      percentual: Number(item.percentual || 0),
      pendingTopics,
      accuracy,
      score,
      recommendation: item,
    };

    const previous = catalogMap.get(key);
    if (!previous || candidate.score > previous.score) {
      catalogMap.set(key, candidate);
    }
  });

  return Array.from(catalogMap.values()).sort((first, second) => {
    if (first.score !== second.score) return second.score - first.score;
    if (first.pendingTopics !== second.pendingTopics) return second.pendingTopics - first.pendingTopics;
    return Number(first.percentual || 0) - Number(second.percentual || 0);
  });
}

function buildReviewLookup(studyRecommendation = null) {
  const lookup = new Map();

  (Array.isArray(studyRecommendation?.reviewQueue) ? studyRecommendation.reviewQueue : [])
    .filter(Boolean)
    .forEach((item) => {
      const key = normalizeName(item.disciplina || item.title);
      if (!key) return;
      lookup.set(key, item);
    });

  return lookup;
}

function buildAppearanceTargets(catalog, slotCount) {
  const targets = new Map((catalog || []).map((item) => [item.key, 0]));
  if (!Array.isArray(catalog) || catalog.length === 0 || slotCount <= 0) return targets;

  let assigned = 0;

  if (slotCount >= catalog.length) {
    catalog.forEach((item) => {
      targets.set(item.key, 1);
      assigned += 1;
    });
  } else {
    catalog.slice(0, slotCount).forEach((item) => {
      targets.set(item.key, 1);
    });
    return targets;
  }

  const remaining = slotCount - assigned;
  if (remaining <= 0) return targets;

  const totalWeight = catalog.reduce((acc, item) => acc + Math.max(1, Number(item.score || 1)), 0) || 1;
  const weighted = catalog.map((item) => {
    const rawShare = (Math.max(1, Number(item.score || 1)) / totalWeight) * remaining;
    const base = Math.floor(rawShare);
    return {
      key: item.key,
      base,
      remainder: rawShare - base,
    };
  });

  weighted.forEach((item) => {
    targets.set(item.key, Number(targets.get(item.key) || 0) + item.base);
  });

  let extras = remaining - weighted.reduce((acc, item) => acc + item.base, 0);
  weighted
    .sort((first, second) => second.remainder - first.remainder)
    .forEach((item) => {
      if (extras <= 0) return;
      targets.set(item.key, Number(targets.get(item.key) || 0) + 1);
      extras -= 1;
    });

  return targets;
}

function resolvePrimaryMode(candidate) {
  if (
    candidate?.studyMode === 'questoes' &&
    candidate?.accuracy !== null &&
    Number(candidate.accuracy) < 60
  ) {
    return { mode: 'questoes', label: 'Questoes' };
  }

  if (
    candidate?.studyMode === 'revisao' &&
    Number(candidate?.percentual || 0) >= 78 &&
    Number(candidate?.pendingTopics || 0) <= 1
  ) {
    return { mode: 'revisao', label: 'Revisao' };
  }

  return { mode: 'teoria', label: 'Teoria' };
}

function pickCoreCandidate({ catalog, targets, assignedCounts, usedToday, recentKeys }) {
  if (!Array.isArray(catalog) || catalog.length === 0) return null;

  return [...catalog]
    .map((item) => {
      const remaining = Math.max(0, Number(targets.get(item.key) || 0) - Number(assignedCounts.get(item.key) || 0));
      let priority = remaining * 1000 + Number(item.score || 0) * 3;

      if (usedToday.has(item.key)) priority -= 240;
      if (recentKeys[0] === item.key) priority -= 140;
      if (recentKeys[1] === item.key) priority -= 70;

      return { item, remaining, priority };
    })
    .sort((first, second) => {
      if ((first.remaining > 0) !== (second.remaining > 0)) {
        return first.remaining > 0 ? -1 : 1;
      }
      if (first.priority !== second.priority) return second.priority - first.priority;
      return Number(second.item.score || 0) - Number(first.item.score || 0);
    })[0]?.item || null;
}

function pickSupportCandidate({ catalog, dayCoreItems, preferredMode, reviewLookup, recentKeys }) {
  const localPool = Array.isArray(dayCoreItems) && dayCoreItems.length > 0 ? dayCoreItems : catalog;
  if (!Array.isArray(localPool) || localPool.length === 0) return null;

  return [...localPool]
    .map((item, index) => {
      const reviewItem = reviewLookup.get(normalizeName(item.nome));
      let priority = Number(item.score || 0) * 3;

      if (item.studyMode === preferredMode) priority += 180;
      if (preferredMode === 'questoes' && item.accuracy !== null && Number(item.accuracy) < 72) priority += 120;
      if (preferredMode === 'revisao' && (reviewItem || Number(item.pendingTopics || 0) > 0)) priority += 110;
      if (dayCoreItems.includes(item)) priority += 70 - index * 12;
      if (recentKeys[0] === item.key) priority += 36;

      return { item, priority };
    })
    .sort((first, second) => second.priority - first.priority)[0]?.item || null;
}

function buildSessionFromCandidate({ day, slot, candidate, mode, reviewLookup, slotIndex }) {
  const reviewItem = reviewLookup.get(normalizeName(candidate.nome));
  const plannedMinutes = Number(slot?.minutes || candidate.durationMin || 60);
  const topicLabel =
    mode === 'questoes'
      ? reviewItem?.topicName || candidate.topicName || 'Resolver uma bateria focada.'
      : mode === 'revisao'
        ? reviewItem?.topicName || candidate.topicName || 'Fechar revisao do bloco anterior.'
        : candidate.topicName || 'Retomar frente principal';

  return {
    id: `${day.id}-${slot.id}-${candidate.key}-${slotIndex}`,
    slotId: slot.id,
    slotLabel: slot.label,
    minutes: plannedMinutes,
    durationLabel: formatMinutes(plannedMinutes),
    title: candidate.nome,
    discipline: candidate.nome,
    detail: topicLabel,
    modeLabel: getModeLabel(mode),
    recommendation: {
      ...(candidate.recommendation || {}),
      id: candidate.recommendation?.id || candidate.id,
      nome: candidate.nome,
      studyMode: mode,
      studyModeLabel: getModeLabel(mode),
      suggestedDurationMin: plannedMinutes,
      suggestedDurationLabel: formatMinutes(plannedMinutes),
      nextTopic: topicLabel ? { nome: topicLabel } : candidate.recommendation?.nextTopic || null,
      cor: candidate.recommendation?.cor || null,
    },
  };
}

function countPendingTopics(disciplines = []) {
  return (Array.isArray(disciplines) ? disciplines : []).reduce(
    (acc, item) => acc + (Array.isArray(item?.topicos) ? item.topicos.filter((topic) => !topic?.concluido).length : 0),
    0
  );
}

export function buildWeeklyStudyPlan({
  availability = [],
  targetContest = null,
  targetDisciplines = [],
  studyRecommendation = null,
}) {
  const normalizedAvailability = Array.isArray(availability) ? availability : [];
  const disciplineCatalog = buildDisciplineCatalog({ targetDisciplines, studyRecommendation });
  const reviewLookup = buildReviewLookup(studyRecommendation);
  const theorySlotCount = normalizedAvailability.reduce((acc, day) => {
    const enabledSlots = Array.isArray(day?.slots)
      ? day.slots.filter((slot) => day?.enabled && slot?.enabled && Number(slot?.minutes || 0) > 0)
      : [];
    const theoryLikeSlots = enabledSlots.filter((slot) => slot.modeHint === 'teoria').length;
    return acc + (theoryLikeSlots > 0 ? theoryLikeSlots : enabledSlots.length);
  }, 0);
  const appearanceTargets = buildAppearanceTargets(disciplineCatalog, theorySlotCount);
  const assignedCounts = new Map(disciplineCatalog.map((item) => [item.key, 0]));
  const recentKeys = [];

  const days = normalizedAvailability.map((day) => {
    const enabledSlots = Array.isArray(day?.slots)
      ? day.slots.filter((slot) => day?.enabled && slot?.enabled && Number(slot?.minutes || 0) > 0)
      : [];

    const theoryLikeCount = enabledSlots.filter((slot) => slot.modeHint === 'teoria').length;
    const treatAllAsCore = theoryLikeCount === 0;
    const usedToday = new Set();
    const dayCoreItems = [];

    const sessions = enabledSlots.map((slot, slotIndex) => {
      const isCoreSlot = treatAllAsCore || slot.modeHint === 'teoria';

      if (isCoreSlot) {
        const picked = pickCoreCandidate({
          catalog: disciplineCatalog,
          targets: appearanceTargets,
          assignedCounts,
          usedToday,
          recentKeys,
        });

        if (!picked) {
          return {
            id: `${day.id}-${slot.id}`,
            slotId: slot.id,
            slotLabel: slot.label,
            minutes: Number(slot.minutes || 0),
            durationLabel: formatMinutes(Number(slot.minutes || 0)),
            title: 'Sessao livre',
            discipline: 'Definir disciplina',
            detail: 'Sem recomendacao pronta para este bloco.',
            modeLabel: 'Livre',
            recommendation: null,
          };
        }

        const primaryMode = resolvePrimaryMode(picked);
        usedToday.add(picked.key);
        dayCoreItems.push(picked);
        assignedCounts.set(picked.key, Number(assignedCounts.get(picked.key) || 0) + 1);
        recentKeys.unshift(picked.key);
        recentKeys.splice(2);

        return buildSessionFromCandidate({
          day,
          slot,
          candidate: picked,
          mode: primaryMode.mode,
          reviewLookup,
          slotIndex,
        });
      }

      const preferredMode = slot.modeHint === 'revisao' ? 'revisao' : 'questoes';
      const picked = pickSupportCandidate({
        catalog: disciplineCatalog,
        dayCoreItems,
        preferredMode,
        reviewLookup,
        recentKeys,
      });

      if (!picked) {
        return {
          id: `${day.id}-${slot.id}`,
          slotId: slot.id,
          slotLabel: slot.label,
          minutes: Number(slot.minutes || 0),
          durationLabel: formatMinutes(Number(slot.minutes || 0)),
          title: 'Sessao livre',
          discipline: 'Definir disciplina',
          detail: 'Sem recomendacao pronta para este bloco.',
          modeLabel: 'Livre',
          recommendation: null,
        };
      }

      return buildSessionFromCandidate({
        day,
        slot,
        candidate: picked,
        mode: preferredMode,
        reviewLookup,
        slotIndex,
      });
    });

    const totalMinutes = sessions.reduce((acc, session) => acc + session.minutes, 0);

    return {
      ...day,
      totalMinutes,
      totalLabel: formatMinutes(totalMinutes),
      sessions,
    };
  });

  const weeklyMinutes = days.reduce((acc, day) => acc + day.totalMinutes, 0);
  const pendingTopics = countPendingTopics(targetDisciplines);
  const estimatedRemainingMinutes = pendingTopics * 50 + (studyRecommendation?.reviewQueue?.length || 0) * 20;
  const weeksUntilExam =
    targetContest?.diasParaProva && Number(targetContest.diasParaProva) > 0
      ? Math.max(1, Math.ceil(Number(targetContest.diasParaProva) / 7))
      : 8;
  const requiredMinutesPerWeek =
    estimatedRemainingMinutes > 0 ? Math.ceil(estimatedRemainingMinutes / weeksUntilExam) : 0;

  let paceStatus = 'estavel';
  let paceLabel = 'Ritmo sob controle';
  let paceMessage = 'Seu volume semanal parece suficiente para manter o edital caminhando.';

  if (requiredMinutesPerWeek > 0) {
    if (weeklyMinutes >= requiredMinutesPerWeek * 1.1) {
      paceStatus = 'confortavel';
      paceLabel = 'Ritmo confortavel';
      paceMessage = 'Ha gordura semanal para avancar no alvo e ainda encaixar revisoes.';
    } else if (weeklyMinutes >= requiredMinutesPerWeek * 0.85) {
      paceStatus = 'ajustado';
      paceLabel = 'Ritmo ajustado';
      paceMessage = 'Da para chegar bem, mas sem desperdiçar blocos da semana.';
    } else {
      paceStatus = 'apertado';
      paceLabel = 'Ritmo apertado';
      paceMessage = 'Com a disponibilidade atual, o edital tende a ficar curto ate a prova.';
    }
  }

  return {
    days,
    summary: {
      weeklyMinutes,
      weeklyLabel: formatMinutes(weeklyMinutes),
      totalSessions: days.reduce((acc, day) => acc + day.sessions.length, 0),
      pendingTopics,
      estimatedRemainingMinutes,
      estimatedRemainingLabel: formatMinutes(estimatedRemainingMinutes),
      weeksUntilExam,
      requiredMinutesPerWeek,
      requiredPerWeekLabel: formatMinutes(requiredMinutesPerWeek),
      paceStatus,
      paceLabel,
      paceMessage,
    },
  };
}

export function formatMinutes(totalMinutes) {
  const minutes = Math.max(0, Number(totalMinutes || 0));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${String(rest).padStart(2, '0')}m`;
}
