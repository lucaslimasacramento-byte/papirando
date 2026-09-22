import { buildDisciplineSummaryFromHistory, formatMinutesLabel } from './studyAnalytics';
import { marcoMaisProximo } from './tiposDeObjetivo';
import { canonicalizeSubjectName } from './subjectCatalogUtils';

const sortTopics = (topics = []) =>
  [...(Array.isArray(topics) ? topics : [])].sort(
    (first, second) => Number(first?.ordem || 0) - Number(second?.ordem || 0)
  );

const normalizeTopicKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getUrgencyFactor = (daysToExam) => {
  if (daysToExam === null || daysToExam === undefined || Number.isNaN(Number(daysToExam))) return 1;
  if (daysToExam <= 15) return 1.45;
  if (daysToExam <= 30) return 1.3;
  if (daysToExam <= 60) return 1.18;
  if (daysToExam <= 90) return 1.1;
  return 1;
};

const getStudyMode = ({ accuracy, pendingTopics, progress }) => {
  if (accuracy !== null && accuracy < 65) return 'questoes';
  if (pendingTopics > 0 && progress < 80) return 'teoria';
  return 'revisao';
};

const getModeLabel = (mode) => {
  if (mode === 'questoes') return 'Questoes';
  if (mode === 'revisao') return 'Revisao';
  return 'Teoria';
};

const getDurationByScore = (score) => {
  if (score >= 180) return 90;
  if (score >= 140) return 75;
  if (score >= 100) return 60;
  return 45;
};

const buildReason = ({ pendingTopics, accuracy, progress, targetContestName, nextTopic, objetivoUrgente }) => {
  const reasons = [];

  if (objetivoUrgente) {
    reasons.push(`cai em ${objetivoUrgente}, que é o prazo mais próximo`);
  }

  if (pendingTopics > 0) {
    reasons.push(`${pendingTopics} tópico(s) ainda aberto(s)`);
  }

  if (accuracy !== null) {
    if (accuracy < 65) {
      reasons.push(`desempenho baixo nas questões (${accuracy}%)`);
    } else if (accuracy < 75) {
      reasons.push(`taxa de acerto ainda instável (${accuracy}%)`);
    }
  } else {
    reasons.push('sem histórico suficiente nessa matéria');
  }

  if (progress < 50) {
    reasons.push(`progresso geral em ${progress}%`);
  }

  if (targetContestName) {
    reasons.push(`impacta diretamente o alvo ${targetContestName}`);
  }

  if (nextTopic?.nome) {
    reasons.push(`próximo passo: ${nextTopic.nome}`);
  }

  return reasons.slice(0, 3).join(' | ');
};

export function mergeDisciplinesByCanonical({ disciplines = [], subjectCatalog = [] }) {
  const grouped = new Map();

  (Array.isArray(disciplines) ? disciplines : []).forEach((discipline, index) => {
    const canonicalName = canonicalizeSubjectName(discipline?.nome || '', subjectCatalog);
    const groupKey = canonicalName || String(discipline?.nome || `disciplina-${index}`);
    const sourceId = discipline?.id ? String(discipline.id) : '';
    const sourcePlan = String(discipline?.plano || '').trim();
    const sourceContest = String(discipline?.concurso || '').trim();
    const orderedTopics = sortTopics(discipline?.topicos);

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        representative: discipline,
        canonicalName: groupKey,
        sourceIds: sourceId ? [sourceId] : [],
        sourcePlans: sourcePlan ? [sourcePlan] : [],
        sourceContests: sourceContest ? [sourceContest] : [],
        topics: [],
      });
    }

    const group = grouped.get(groupKey);
    const currentProgress = Number(group.representative?.percentual || 0);
    const incomingProgress = Number(discipline?.percentual || 0);

    if (incomingProgress < currentProgress) {
      group.representative = discipline;
    }

    if (sourceId && !group.sourceIds.includes(sourceId)) {
      group.sourceIds.push(sourceId);
    }

    if (sourcePlan && !group.sourcePlans.includes(sourcePlan)) {
      group.sourcePlans.push(sourcePlan);
    }

    if (sourceContest && !group.sourceContests.includes(sourceContest)) {
      group.sourceContests.push(sourceContest);
    }

    orderedTopics.forEach((topic) => {
      const key = normalizeTopicKey(topic?.nome);
      const existing = group.topics.find((item) => item.key === key);

      if (!existing) {
        group.topics.push({
          key,
          value: {
            ...topic,
            nome: topic?.nome || 'Topico',
            concluido: Boolean(topic?.concluido),
          },
        });
        return;
      }

      existing.value = {
        ...existing.value,
        ...topic,
        concluido: Boolean(existing.value?.concluido || topic?.concluido),
      };
    });
  });

  return Array.from(grouped.values()).map((group, index) => {
    const mergedTopics = group.topics
      .map((item) => item.value)
      .sort((first, second) => Number(first?.ordem || 0) - Number(second?.ordem || 0));
    const totalTopics = mergedTopics.length;
    const completedTopics = mergedTopics.filter((topic) => topic?.concluido).length;
    const representative = group.representative || {};

    return {
      ...representative,
      id: representative?.id || group.sourceIds[0] || `canonical-${index}`,
      nome: group.canonicalName,
      topicos: mergedTopics,
      percentual:
        totalTopics > 0
          ? Math.round((completedTopics / totalTopics) * 100)
          : Number(representative?.percentual || 0),
      plano: group.sourcePlans[0] || representative?.plano || '',
      planoLabel:
        group.sourcePlans.length > 1
          ? `${group.sourcePlans.length} cursos combinados`
          : group.sourcePlans[0] || representative?.plano || '',
      sourceIds: group.sourceIds,
      sourcePlans: group.sourcePlans,
      sourceContests: group.sourceContests,
      mergedSourcesCount: group.sourcePlans.length,
    };
  });
}

export function buildSmartStudyPlan({
  disciplines = [],
  history = [],
  subjectCatalog = [],
  targetContest = null,
  // Os objetivos do curso do alvo e a quais objetivos cada disciplina serve.
  //
  // Um curso pode juntar um concurso com a faculdade, e os dois tem prazos diferentes. Sem
  // isto a rotina olhava so o prazo do alvo: com a prova em 10 dias e o semestre em 90, ela
  // dava o mesmo peso as duas — ou, pior, ignorava o que vem primeiro quando o alvo era o
  // outro. Ver src/lib/tiposDeObjetivo.js.
  objetivos = [],
  objetivosDaDisciplina = null,
}) {
  const canonicalDisciplines = mergeDisciplinesByCanonical({ disciplines, subjectCatalog });
  const canonicalHistory = buildDisciplineSummaryFromHistory(history);
  const historyMap = new Map(canonicalHistory.map((item) => [item.name, item]));
  // O prazo que aperta e o mais proximo entre os objetivos do curso, nao o do alvo: quem
  // tem prova em duas semanas nao estuda como quem tem o semestre inteiro pela frente.
  const marco = marcoMaisProximo(objetivos);
  const diasQueApertam = marco ? marco.dias : targetContest?.diasParaProva;
  const urgencyFactor = getUrgencyFactor(diasQueApertam);

  // Com mais de um objetivo, o que cai no prazo mais proximo vem antes. Uma materia que so
  // serve ao semestre nao pode competir de igual para igual com a que cai na prova de
  // sabado.
  const objetivoUrgente = objetivos.length > 1 ? marco?.objetivo?.id : null;
  const serveAoUrgente = (nome) =>
    Boolean(objetivoUrgente) &&
    typeof objetivosDaDisciplina === 'function' &&
    (objetivosDaDisciplina(nome) || []).includes(objetivoUrgente);

  const ranked = canonicalDisciplines
    .map((discipline) => {
      const canonicalName = canonicalizeSubjectName(discipline?.nome || '', subjectCatalog);
      const historyItem = historyMap.get(canonicalName) || null;
      const orderedTopics = sortTopics(discipline?.topicos);
      const pendingTopics = orderedTopics.filter((topic) => !topic?.concluido);
      const nextTopic = pendingTopics[0] || orderedTopics[0] || null;
      const progress = Number(discipline?.percentual || 0);
      const accuracy =
        historyItem && Number.isFinite(Number(historyItem.accuracy))
          ? Number(historyItem.accuracy)
          : null;
      const minutesStudied = Number(historyItem?.minutes || 0);

      const scoreBase =
        Math.max(0, 100 - progress) +
        pendingTopics.length * 6 +
        (accuracy === null ? 12 : Math.max(0, 75 - accuracy) * 2) +
        (minutesStudied < 120 ? 10 : minutesStudied < 300 ? 4 : 0) +
        (pendingTopics.length > 0 && progress < 60 ? 12 : 0) +
        Number(discipline?.manualPriorityBoost || 0);

      // 25% a mais para quem cai no prazo que vem primeiro. O suficiente para a materia da
      // prova de sabado passar na frente da do semestre, sem zerar o resto do plano.
      const urgente = serveAoUrgente(discipline?.nome);
      const score = Math.round(scoreBase * urgencyFactor * (urgente ? 1.25 : 1));
      const studyMode = getStudyMode({
        accuracy,
        pendingTopics: pendingTopics.length,
        progress,
      });
      const suggestedDurationMin = getDurationByScore(score);

      return {
        ...discipline,
        canonicalName,
        // A tela usa isto para dizer POR QUE esta materia veio antes.
        objetivoUrgente: urgente ? marco?.objetivo?.nome || '' : '',
        plano: discipline?.planoLabel || discipline?.plano || '',
        accuracy,
        minutesStudied,
        minutesStudiedLabel: formatMinutesLabel(minutesStudied),
        pendingTopics: pendingTopics.length,
        nextTopic,
        score,
        studyMode,
        studyModeLabel: getModeLabel(studyMode),
        suggestedDurationMin,
        suggestedDurationLabel: formatMinutesLabel(suggestedDurationMin),
        reason: buildReason({
          pendingTopics: pendingTopics.length,
          accuracy,
          progress,
          targetContestName: targetContest?.nome || '',
          nextTopic,
          objetivoUrgente: urgente ? marco?.objetivo?.nome || '' : '',
        }),
      };
    })
    .sort((first, second) => {
      if (first.score !== second.score) return second.score - first.score;
      if (first.pendingTopics !== second.pendingTopics) {
        return second.pendingTopics - first.pendingTopics;
      }
      return Number(first.percentual || 0) - Number(second.percentual || 0);
    });

  const primary = ranked[0] || null;
  const queue = ranked.slice(1, 4);
  const cycleCandidates = ranked.slice(0, 4);

  const reviewQueue = ranked
    .filter((item) => item.accuracy !== null || item.pendingTopics > 0)
    .map((item, index) => {
      const urgencyLabel =
        item.accuracy !== null && item.accuracy < 65
          ? 'Alta prioridade'
          : item.pendingTopics > 0
            ? 'Fila de revisão'
            : 'Manter ativo';

      const actionLabel =
        item.studyMode === 'questoes'
          ? 'Rodar questões'
          : item.studyMode === 'revisao'
            ? 'Revisar agora'
            : 'Retomar teoria';

      return {
        id: `review-${item.id || index}`,
        disciplinaId: item.id,
        disciplina: item.nome,
        title: item.nextTopic?.nome || item.nome,
        topicName: item.nextTopic?.nome || '',
        urgencyLabel,
        actionLabel,
        score: item.score,
        reason:
          item.accuracy !== null
            ? `${item.accuracy}% de acerto agregado | ${item.pendingTopics} topico(s) em aberto`
            : `${item.pendingTopics} tópico(s) em aberto | sem histórico suficiente`,
        suggestedDurationLabel: item.suggestedDurationLabel,
      };
    })
    .sort((first, second) => second.score - first.score)
    .slice(0, 5);

  return {
    primary,
    queue,
    cycleCandidates,
    reviewQueue,
    ranked,
  };
}
