import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Crown,
  DollarSign,
  Gem,
  Layers3,
  LayoutPanelLeft,
  Newspaper,
  Plus,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { canonicalizeSubjectName } from '../lib/subjectCatalogUtils';
import { buildDisciplineSummaryFromHistory } from '../lib/studyAnalytics';
import { supabase } from '../lib/supabase';
import { analyzeContestCompatibility } from '../lib/aiClient';


const INTERNAL_NAV = [
  { id: 'visao', label: 'Visão geral', icon: LayoutPanelLeft },
  { id: 'comparacao', label: 'Comparação', icon: Radar },
  { id: 'conteudo', label: 'Conteúdo', icon: Newspaper },
  { id: 'materias', label: 'Disciplinas', icon: BookOpen },
  { id: 'parecer', label: 'Parecer final', icon: Trophy },
];

const CONCILIADOR_STORAGE_KEY = 'papirando_conciliador_state_v1';

const STAGE_LABELS = {
  objetiva: 'Objetiva',
  prova_objetiva: 'Prova objetiva',
  discursiva: 'Discursiva',
  prova_discursiva: 'Prova discursiva',
  redacao: 'Redação',
  taf: 'TAF',
  avaliacao_psicologica: 'Avaliação psicológica',
  investigacao_social: 'Investigação social',
  exames_medicos: 'Exames médicos',
  toxicologico: 'Toxicológico',
  heteroidentificacao: 'Heteroidentificação',
  curso_formacao: 'Curso de formação',
  psicotecnico: 'Psicotécnico',
};

function createDefaultConciliadorState() {
  return {
    baseContestId: '',
    targetOneId: '',
    courseCount: 2,
    targetTwoId: '',
    activePanel: 'visao',
    isComparing: false,
    history: [],
  };
}

function normalizeCompareText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function formatMoneyDelta(delta) {
  if (!delta) return 'Sem diferenca relevante';
  return delta > 0
    ? `+${delta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    : delta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatStageLabel(stage) {
  const key = normalizeCompareText(stage).replace(/\s+/g, '_');
  return STAGE_LABELS[key] || String(stage || 'Etapa extra');
}

function getContestDaysUntilExam(contest) {
  if (!contest?.prova_data) return null;
  const provaDate = new Date(`${contest.prova_data}T00:00:00`);
  if (Number.isNaN(provaDate.getTime())) return null;
  const today = new Date();
  return Math.ceil((provaDate.getTime() - today.getTime()) / 86400000);
}

function matchContestWithCourse(contest, course) {
  if (!contest || !course) return false;

  const contestKeys = [contest.plano, contest.nome, contest.concurso]
    .map((value) => normalizeCompareText(value))
    .filter(Boolean);
  const courseKeys = [course.plano, course.nome, course.concurso]
    .map((value) => normalizeCompareText(value))
    .filter(Boolean);

  return contestKeys.some((key) => courseKeys.includes(key));
}

function buildUserSubjectBank(bancoDisciplinas = [], historicoReal = [], subjectCatalog = []) {
  const bank = new Map();

  const ensureItem = (subjectName) => {
    const canonical = canonicalizeSubjectName(subjectName || '', subjectCatalog) || subjectName || 'Disciplina';
    const key = normalizeCompareText(canonical);
    if (!key) return null;

    if (!bank.has(key)) {
      bank.set(key, {
        key,
        name: canonical,
        plans: new Set(),
        progress: 0,
        minutes: 0,
        questions: 0,
        accuracy: 0,
        sessions: 0,
        started: false,
        strong: false,
        topics: new Set(),
      });
    }

    return bank.get(key);
  };

  (Array.isArray(bancoDisciplinas) ? bancoDisciplinas : []).forEach((disciplina) => {
    const item = ensureItem(disciplina?.nome);
    if (!item) return;

    item.plans.add(String(disciplina?.plano || '').trim());
    item.progress = Math.max(item.progress, Number(disciplina?.percentual || 0));
    item.minutes += Number(disciplina?.tempo_total_min || 0);

    const topicos = Array.isArray(disciplina?.topicos) ? disciplina.topicos : [];
    topicos.forEach((topico) => {
      const topicKey = normalizeCompareText(topico?.nome);
      if (topicKey) item.topics.add(topicKey);
      item.questions += Number(topico?.acertos || 0) + Number(topico?.erros || 0);
      if (topico?.concluido || Number(topico?.percentual || 0) > 0 || Number(topico?.acertos || 0) > 0 || Number(topico?.erros || 0) > 0) {
        item.started = true;
      }
    });

    if (item.progress > 0 || item.minutes > 0) {
      item.started = true;
    }
  });

  buildDisciplineSummaryFromHistory(historicoReal).forEach((summary) => {
    const item = ensureItem(summary?.name);
    if (!item) return;

    item.minutes = Math.max(item.minutes, Number(summary?.minutes || 0));
    item.questions = Math.max(item.questions, Number(summary?.questions || 0));
    item.accuracy = Math.max(item.accuracy, Number(summary?.accuracy || 0));
    item.sessions += Number(summary?.sessions || 0);

    if (Number(summary?.minutes || 0) > 0 || Number(summary?.questions || 0) > 0) {
      item.started = true;
    }
  });

  bank.forEach((item) => {
    item.strong = item.progress >= 70 || item.accuracy >= 75 || item.minutes >= 180;
  });

  return bank;
}

function buildContestSnapshot(contest, cursos = [], bancoDisciplinas = [], userSubjectBank = new Map(), subjectCatalog = []) {
  if (!contest) {
    return {
      imported: false,
      linkedPlans: [],
      totalSubjects: 0,
      coveredSubjects: 0,
      startedSubjects: 0,
      strongSubjects: 0,
      uncoveredSubjects: 0,
      readinessScore: 0,
      linkedSubjects: 0,
      totalTopics: 0,
      trackedTopics: 0,
      daysUntilExam: null,
      subjectStates: [],
    };
  }

  const matchedCourses = (Array.isArray(cursos) ? cursos : []).filter((course) => matchContestWithCourse(contest, course));
  const linkedPlans = matchedCourses
    .map((course) => String(course?.plano || '').trim())
    .filter(Boolean);
  const linkedPlanSet = new Set(linkedPlans);

  const linkedSubjects = (Array.isArray(bancoDisciplinas) ? bancoDisciplinas : []).filter((disciplina) =>
    linkedPlanSet.has(String(disciplina?.plano || '').trim())
  );
  const linkedSubjectKeys = new Set(
    linkedSubjects
      .map((disciplina) => normalizeCompareText(canonicalizeSubjectName(disciplina?.nome || '', subjectCatalog)))
      .filter(Boolean)
  );

  const subjectStates = (Array.isArray(contest?.disciplinas) ? contest.disciplinas : []).map((disciplina) => {
    const canonicalName = canonicalizeSubjectName(disciplina?.nome || '', subjectCatalog) || disciplina?.nome || 'Disciplina';
    const key = normalizeCompareText(canonicalName);
    const userState = userSubjectBank.get(key) || null;
    const totalTopics = Array.isArray(disciplina?.topicos) ? disciplina.topicos.length : 0;
    const trackedTopics = totalTopics
      ? (disciplina.topicos || []).filter((topico) => userState?.topics?.has(normalizeCompareText(topico?.nome))).length
      : 0;

    return {
      key,
      name: canonicalName,
      totalTopics,
      trackedTopics,
      hasCoverage: Boolean(userState),
      inLinkedCourse: linkedSubjectKeys.has(key),
      started: Boolean(userState?.started),
      strong: Boolean(userState?.strong),
      progress: Number(userState?.progress || 0),
      accuracy: Number(userState?.accuracy || 0),
      minutes: Number(userState?.minutes || 0),
    };
  });

  const totalSubjects = subjectStates.length;
  const coveredSubjects = subjectStates.filter((item) => item.hasCoverage).length;
  const startedSubjects = subjectStates.filter((item) => item.started).length;
  const strongSubjects = subjectStates.filter((item) => item.strong).length;
  const linkedSubjectsCount = subjectStates.filter((item) => item.inLinkedCourse).length;
  const totalTopics = subjectStates.reduce((acc, item) => acc + item.totalTopics, 0);
  const trackedTopics = subjectStates.reduce((acc, item) => acc + item.trackedTopics, 0);

  const coverageRate = totalSubjects > 0 ? (coveredSubjects / totalSubjects) * 100 : 0;
  const startedRate = totalSubjects > 0 ? (startedSubjects / totalSubjects) * 100 : 0;
  const strongRate = totalSubjects > 0 ? (strongSubjects / totalSubjects) * 100 : 0;
  const readinessScore = Math.round(coverageRate * 0.45 + startedRate * 0.35 + strongRate * 0.2);

  return {
    imported: matchedCourses.length > 0,
    linkedPlans,
    totalSubjects,
    coveredSubjects,
    startedSubjects,
    strongSubjects,
    uncoveredSubjects: Math.max(totalSubjects - coveredSubjects, 0),
    readinessScore,
    linkedSubjects: linkedSubjectsCount,
    totalTopics,
    trackedTopics,
    daysUntilExam: getContestDaysUntilExam(contest),
    subjectStates,
  };
}

function readConciliadorState() {
  if (typeof window === 'undefined') {
    return createDefaultConciliadorState();
  }

  try {
    const raw = window.localStorage.getItem(CONCILIADOR_STORAGE_KEY);
    if (!raw) {
      return createDefaultConciliadorState();
    }

    const parsed = JSON.parse(raw);
    const courseCount = parsed?.courseCount === 3 ? 3 : 2;
    return {
      baseContestId: String(parsed?.baseContestId || ''),
      targetOneId: String(parsed?.targetOneId || ''),
      courseCount,
      targetTwoId: courseCount === 3 ? String(parsed?.targetTwoId || '') : '',
      activePanel: INTERNAL_NAV.some((item) => item.id === parsed?.activePanel) ? parsed.activePanel : 'visao',
      isComparing: Boolean(parsed?.isComparing),
      history: Array.isArray(parsed?.history) ? parsed.history.slice(0, 8) : [],
    };
  } catch (error) {
    console.warn('Estado do conciliador invalido. Reiniciando preferencias locais.', error);
    return createDefaultConciliadorState();
  }
}

function formatCompareTimestamp(value) {
  if (!value) return 'Agora';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Agora';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export default function Conciliador({
  currentUserId = '',
  concursoCatalog = [],
  subjectCatalog = [],
  myContests = [],
  cursos = [],
  bancoDisciplinas = [],
  historicoReal = [],
  targetContestId = '',
  onOpenContestDetail,
  onSetTargetContest,
}) {
  const persistedState = useMemo(() => readConciliadorState(), []);
  const [remoteContests, setRemoteContests] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteLoaded, setRemoteLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const loadRemoteContests = async () => {
      setRemoteLoading(true);

      try {
        const { data, error } = await supabase
          .from('contest_templates')
          .select('id, slug, nome, banca, salario, prova_data, vagas, escolaridade, etapas_tags, disciplinas')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        if (!active) return;

        setRemoteContests(
          (data || []).map((contest) => ({
            ...contest,
            id: String(contest?.slug || contest?.id || ''),
            slug: String(contest?.slug || contest?.id || ''),
            etapas_tags: Array.isArray(contest?.etapas_tags) ? contest.etapas_tags : [],
            disciplinas: Array.isArray(contest?.disciplinas) ? contest.disciplinas : [],
          }))
        );
      } catch (error) {
        console.warn('[contest_templates] Falha ao carregar concursos do conciliador:', error?.message || error);
      } finally {
        if (active) {
          setRemoteLoading(false);
          setRemoteLoaded(true);
        }
      }
    };

    loadRemoteContests();

    return () => {
      active = false;
    };
  }, [currentUserId]);

  const catalogSource = useMemo(() => {
    const merged = [];
    const seen = new Map();
    const publicCatalog = remoteContests.length > 0 ? remoteContests : concursoCatalog;

    [...(Array.isArray(myContests) ? myContests : []), ...(Array.isArray(publicCatalog) ? publicCatalog : [])].forEach((contest) => {
      const id = String(contest?.id || '').trim();
      if (!id) return;
      const existingIndex = seen.get(id);
      if (existingIndex !== undefined) {
        const existing = merged[existingIndex];
        merged[existingIndex] = {
          ...contest,
          ...existing,
          imagem_url: existing?.imagem_url || contest?.imagem_url || '',
          edital_url: existing?.edital_url || contest?.edital_url || '',
        };
        return;
      }
      seen.set(id, merged.length);
      merged.push(contest);
    });

    return merged;
  }, [concursoCatalog, myContests, remoteContests]);

  const options = useMemo(
    () =>
      catalogSource.map((contest) => ({
        id: contest.id,
        label: [
          contest.nome,
          contest?.id === targetContestId ? '• foco' : '',
          contest?.imported ? '• meu curso' : '',
        ]
          .filter(Boolean)
          .join(' '),
        contest,
        imported: Boolean(contest?.imported),
        interested: Boolean(contest?.interested),
        favorite: Boolean(contest?.favorite),
        isTarget: contest?.id === targetContestId,
      })),
    [catalogSource, targetContestId]
  );

  const [isComparing, setIsComparing] = useState(persistedState.isComparing);
  const [courseCount, setCourseCount] = useState(persistedState.courseCount === 3 ? 3 : 2);
  const [baseContestId, setBaseContestId] = useState(persistedState.baseContestId);
  const [targetOneId, setTargetOneId] = useState(persistedState.targetOneId);
  const [targetTwoId, setTargetTwoId] = useState(persistedState.targetTwoId);
  const [activePanel, setActivePanel] = useState(persistedState.activePanel);
  const [comparisonHistory, setComparisonHistory] = useState(persistedState.history);
  const [aiCompatibility, setAiCompatibility] = useState(null);
  const [aiCompatibilityLoading, setAiCompatibilityLoading] = useState(false);

  const preferredContestIds = useMemo(() => {
    const ids = [];
    const seen = new Set();
    const append = (value) => {
      const id = String(value || '').trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      ids.push(id);
    };

    append(targetContestId);
    (Array.isArray(myContests) ? myContests : []).forEach((contest) => append(contest?.id));
    options.forEach((option) => append(option.id));
    return ids;
  }, [myContests, options, targetContestId]);

  useEffect(() => {
    if (!options.length) {
      setBaseContestId('');
      setTargetOneId('');
      setTargetTwoId('');
      setCourseCount(2);
      setIsComparing(false);
      return;
    }
    const idSet = new Set(options.map((item) => item.id));
    setBaseContestId((prev) => {
      if (prev && idSet.has(prev)) return prev;
      const hinted = preferredContestIds.find((id) => idSet.has(id));
      return hinted || options[0]?.id || '';
    });
  }, [options, preferredContestIds]);

  useEffect(() => {
    if (!options.length || !baseContestId) return;
    const ids = options.map((item) => item.id);
    const idSet = new Set(ids);
    if (!idSet.has(baseContestId)) return;
    setTargetOneId((prev) => {
      if (prev && idSet.has(prev) && prev !== baseContestId) return prev;
      return ids.find((id) => id !== baseContestId) || '';
    });
  }, [options, baseContestId]);

  useEffect(() => {
    if (courseCount !== 3 || !options.length || !baseContestId || !targetOneId) return;
    const forbidden = new Set([String(baseContestId), String(targetOneId)]);
    setTargetTwoId((prev) => {
      const prevStr = String(prev || '').trim();
      if (prevStr && options.some((o) => o.id === prevStr) && !forbidden.has(prevStr)) return prevStr;
      const pick = options.find((o) => !forbidden.has(String(o.id)));
      return pick ? String(pick.id) : '';
    });
  }, [courseCount, options, baseContestId, targetOneId]);

  useEffect(() => {
    if (courseCount !== 3) return;
    if (remoteLoading) return;
    if (options.length < 3) {
      setCourseCount(2);
      setTargetTwoId('');
    }
  }, [courseCount, options.length, remoteLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      CONCILIADOR_STORAGE_KEY,
      JSON.stringify({
        baseContestId,
        targetOneId,
        courseCount,
        targetTwoId: courseCount === 3 ? targetTwoId : '',
        activePanel,
        isComparing,
        history: comparisonHistory.slice(0, 8),
      })
    );
  }, [baseContestId, targetOneId, courseCount, targetTwoId, activePanel, isComparing, comparisonHistory]);

  const selectedBaseOption = options.find((item) => item.id === baseContestId) || null;
  const selectedTargetOneOption = options.find((item) => item.id === targetOneId) || null;
  const selectedTargetTwoOption =
    courseCount === 3 ? options.find((item) => item.id === targetTwoId) || null : null;
  const selectedBase = selectedBaseOption?.contest || null;
  const selectedTargetOne = selectedTargetOneOption?.contest || null;
  const selectedTargetTwo = selectedTargetTwoOption?.contest || null;

  const userSubjectBank = useMemo(
    () => buildUserSubjectBank(bancoDisciplinas, historicoReal, subjectCatalog),
    [bancoDisciplinas, historicoReal, subjectCatalog]
  );

  const selectedBaseSnapshot = useMemo(
    () => buildContestSnapshot(selectedBase, cursos, bancoDisciplinas, userSubjectBank, subjectCatalog),
    [selectedBase, cursos, bancoDisciplinas, userSubjectBank, subjectCatalog]
  );
  const selectedTargetOneSnapshot = useMemo(
    () => buildContestSnapshot(selectedTargetOne, cursos, bancoDisciplinas, userSubjectBank, subjectCatalog),
    [selectedTargetOne, cursos, bancoDisciplinas, userSubjectBank, subjectCatalog]
  );
  const selectedTargetTwoSnapshot = useMemo(
    () => buildContestSnapshot(selectedTargetTwo, cursos, bancoDisciplinas, userSubjectBank, subjectCatalog),
    [selectedTargetTwo, cursos, bancoDisciplinas, userSubjectBank, subjectCatalog]
  );

  const normalizeName = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const comparison = useMemo(() => {
    if (!selectedBase || !selectedTargetOne) {
      return {
        compatibility: 0,
        commonSubjects: [],
        targetOnlySubjects: [],
        baseOnlySubjects: [],
        targetTwoOnlySubjects: [],
        commonTopicsCount: 0,
        commonTopicsBaseTargetTwo: 0,
        uniqueTopicsTargetOne: 0,
        uniqueTopicsTargetTwo: 0,
        baseTopicCount: 0,
        targetOneTopicCount: 0,
        examGapDays: null,
        extraTopicLoadRatio: 0,
        extraStagesTargetOne: [],
        extraStagesTargetTwo: [],
        salaryDeltaTargetOne: '',
        salaryDeltaTargetTwo: '',
        userReusableSubjects: [],
        targetOnlyUnpreparedSubjects: [],
        targetTwoOnlyUnpreparedSubjects: [],
        sharedReadiness: 0,
        targetOneReadiness: 0,
        targetTwoReadiness: 0,
        baseReadiness: 0,
        recommendedAnchor: null,
      };
    }

    const normalizeMoney = (value) => {
      const cleaned = String(value || '').trim();
      if (!cleaned) return 0;
      const numeric = Number(cleaned.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
      return Number.isFinite(numeric) ? numeric : 0;
    };

    const baseSubjects = selectedBase.disciplinas || [];
    const targetOneSubjects = selectedTargetOne.disciplinas || [];
    const targetTwoSubjects = courseCount === 3 && selectedTargetTwo ? selectedTargetTwo.disciplinas || [] : [];

    const normalizeSubjectKey = (item) =>
      normalizeName(canonicalizeSubjectName(item?.nome || item, subjectCatalog));

    const displaySubjectName = (item) => canonicalizeSubjectName(item?.nome || item, subjectCatalog);

    const baseMap = new Map(baseSubjects.map((item) => [normalizeSubjectKey(item), displaySubjectName(item)]));
    const targetOneMap = new Map(
      targetOneSubjects.map((item) => [normalizeSubjectKey(item), displaySubjectName(item)])
    );
    const targetTwoMap = new Map(
      targetTwoSubjects.map((item) => [normalizeSubjectKey(item), displaySubjectName(item)])
    );

    const commonSubjects = [...baseMap.keys()].filter(
      (key) => targetOneMap.has(key)
    );
    const targetOnlySubjects = [...targetOneMap.keys()].filter((key) => !baseMap.has(key));
    const baseOnlySubjects = [...baseMap.keys()].filter((key) => !targetOneMap.has(key));
    const targetTwoOnlySubjects = [...targetTwoMap.keys()].filter((key) => !baseMap.has(key));

    const comparedTotal = new Set([...baseMap.keys(), ...targetOneMap.keys()]).size;

    const compatibility = comparedTotal > 0 ? Math.round((commonSubjects.length / comparedTotal) * 100) : 0;

    const topicNamesFrom = (subjects) =>
      subjects.flatMap((subject) => (subject.topicos || []).map((topic) => normalizeName(topic.nome)));

    const baseTopics = new Set(topicNamesFrom(baseSubjects));
    const targetOneTopics = new Set(topicNamesFrom(targetOneSubjects));
    const targetTwoTopics = new Set(topicNamesFrom(targetTwoSubjects));

    const commonTopicsCount = [...baseTopics].filter((topic) => targetOneTopics.has(topic)).length;
    const commonTopicsBaseTargetTwo =
      targetTwoSubjects.length > 0 ? [...baseTopics].filter((topic) => targetTwoTopics.has(topic)).length : 0;
    const uniqueTopicsTargetOne = [...targetOneTopics].filter((topic) => !baseTopics.has(topic)).length;
    const uniqueTopicsTargetTwo = [...targetTwoTopics].filter((topic) => !baseTopics.has(topic)).length;
    const baseTopicCount = baseTopics.size;
    const targetOneTopicCount = targetOneTopics.size;

    let examGapDays = null;
    if (selectedBase?.prova_data && selectedTargetOne?.prova_data) {
      const d0 = new Date(`${selectedBase.prova_data}T12:00:00`);
      const d1 = new Date(`${selectedTargetOne.prova_data}T12:00:00`);
      if (!Number.isNaN(d0.getTime()) && !Number.isNaN(d1.getTime())) {
        examGapDays = Math.round(Math.abs(d1.getTime() - d0.getTime()) / 86400000);
      }
    }

    const extraTopicLoadRatio =
      baseTopicCount > 0 ? Math.round((uniqueTopicsTargetOne / baseTopicCount) * 100) : uniqueTopicsTargetOne > 0 ? 100 : 0;

    const baseStages = new Set((selectedBase.etapas_tags || []).map((stage) => normalizeCompareText(stage)));
    const extraStagesTargetOne = (selectedTargetOne.etapas_tags || [])
      .filter((stage) => !baseStages.has(normalizeCompareText(stage)))
      .map(formatStageLabel);
    const extraStagesTargetTwo = (selectedTargetTwo?.etapas_tags || [])
      .filter((stage) => !baseStages.has(normalizeCompareText(stage)))
      .map(formatStageLabel);

    const baseSalary = normalizeMoney(selectedBase.salario);
    const targetOneSalary = normalizeMoney(selectedTargetOne.salario);
    const targetTwoSalary = normalizeMoney(selectedTargetTwo?.salario);
    const userReusableSubjects = commonSubjects
      .map((key) => {
        const userState = userSubjectBank.get(key);
        if (!userState?.started) return null;
        return baseMap.get(key) || targetOneMap.get(key) || targetTwoMap.get(key);
      })
      .filter(Boolean);
    const targetOnlyUnpreparedSubjects = targetOnlySubjects
      .filter((key) => !userSubjectBank.has(key))
      .map((key) => targetOneMap.get(key));
    const targetTwoOnlyUnpreparedSubjects = targetTwoSubjects.length
      ? [...targetTwoMap.keys()]
          .filter((key) => !baseMap.has(key) && !userSubjectBank.has(key))
          .map((key) => targetTwoMap.get(key))
      : [];
    const sharedReadiness =
      commonSubjects.length > 0 ? Math.round((userReusableSubjects.length / commonSubjects.length) * 100) : 0;
    const anchorCandidates = [
      { contest: selectedBase, snapshot: selectedBaseSnapshot },
      { contest: selectedTargetOne, snapshot: selectedTargetOneSnapshot },
      ...(courseCount === 3 && selectedTargetTwo
        ? [{ contest: selectedTargetTwo, snapshot: selectedTargetTwoSnapshot }]
        : []),
    ]
      .map(({ contest, snapshot }) => ({
        contest,
        score:
          (contest?.id === targetContestId ? 28 : 0) +
          (snapshot?.imported ? 18 : 0) +
          Number(snapshot?.readinessScore || 0) * 0.45 +
          (snapshot?.daysUntilExam !== null && snapshot?.daysUntilExam <= 60 ? 12 : 0) -
          Number(snapshot?.uncoveredSubjects || 0) * 4,
      }))
      .sort((first, second) => second.score - first.score);

    return {
      compatibility,
      commonSubjects: commonSubjects.map((key) => baseMap.get(key) || targetOneMap.get(key) || targetTwoMap.get(key)),
      targetOnlySubjects: targetOnlySubjects.map((key) => targetOneMap.get(key)),
      baseOnlySubjects: baseOnlySubjects.map((key) => baseMap.get(key)),
      targetTwoOnlySubjects: targetTwoOnlySubjects.map((key) => targetTwoMap.get(key)),
      commonTopicsCount,
      commonTopicsBaseTargetTwo,
      uniqueTopicsTargetOne,
      uniqueTopicsTargetTwo,
      baseTopicCount,
      targetOneTopicCount,
      examGapDays,
      extraTopicLoadRatio,
      extraStagesTargetOne,
      extraStagesTargetTwo,
      salaryDeltaTargetOne: formatMoneyDelta(targetOneSalary - baseSalary),
      salaryDeltaTargetTwo: formatMoneyDelta(targetTwoSalary - baseSalary),
      userReusableSubjects,
      targetOnlyUnpreparedSubjects,
      targetTwoOnlyUnpreparedSubjects,
      sharedReadiness,
      targetOneReadiness: selectedTargetOneSnapshot.readinessScore,
      targetTwoReadiness: selectedTargetTwoSnapshot.readinessScore,
      baseReadiness: selectedBaseSnapshot.readinessScore,
      recommendedAnchor: anchorCandidates[0]?.contest || selectedBase,
    };
  }, [
    courseCount,
    selectedBase,
    selectedTargetOne,
    selectedTargetTwo,
    selectedBaseSnapshot,
    selectedTargetOneSnapshot,
    selectedTargetTwoSnapshot,
    subjectCatalog,
    targetContestId,
    userSubjectBank,
  ]);

  const finalVerdict = useMemo(() => {
    const triple = courseCount === 3 && selectedTargetTwo;
    const stagePenalty =
      comparison.extraStagesTargetOne.length + (triple ? comparison.extraStagesTargetTwo.length : 0);
    const noveltyPenalty =
      comparison.targetOnlyUnpreparedSubjects.length * 7 +
      comparison.uniqueTopicsTargetOne * 0.18 +
      (triple
        ? comparison.targetTwoOnlyUnpreparedSubjects.length * 7 + comparison.uniqueTopicsTargetTwo * 0.18
        : 0);
    const urgencyPenalty =
      selectedTargetOneSnapshot.daysUntilExam !== null &&
      selectedTargetOneSnapshot.daysUntilExam <= 60 &&
      selectedTargetOneSnapshot.readinessScore < 45
        ? 10
        : 0;
    const urgencyPenaltyTwo =
      triple &&
      selectedTargetTwoSnapshot.daysUntilExam !== null &&
      selectedTargetTwoSnapshot.daysUntilExam <= 60 &&
      selectedTargetTwoSnapshot.readinessScore < 45
        ? 8
        : 0;

    const finalScore =
      comparison.compatibility * 0.42 +
      comparison.sharedReadiness * 0.34 +
      comparison.targetOneReadiness * (triple ? 0.12 : 0.16) +
      comparison.baseReadiness * 0.08 +
      (triple ? comparison.targetTwoReadiness * 0.04 : 0) -
      stagePenalty * 5 -
      noveltyPenalty -
      urgencyPenalty -
      urgencyPenaltyTwo;

    if (finalScore >= 58) {
      return {
        title: 'Vale conciliar',
        tone: 'emerald',
        text: 'A base comum está forte e o custo de adaptação ficou sob controle. Aqui o jogo vira para quem organiza bem o calendário.',
        recommendation:
          'Use o edital base como trilho principal e encaixe o segundo edital em blocos de reforço com foco total nas matérias reaproveitáveis.',
      };
    }

    if (finalScore >= 32) {
      return {
        title: 'Vale com cautela',
        tone: 'amber',
        text: 'Existe reaproveitamento real, mas já aparecem matérias novas e etapas extras suficientes para bagunçar a rota se você abrir a guarda.',
        recommendation:
          'Só concilie com limite claro de carga semanal e revisão protegida. Se começar a virar carnaval, corta rápido.',
      };
    }

    return {
      title: 'Melhor não conciliar agora',
      tone: 'rose',
      text: 'O pacote novo pesa demais para dividir foco sem derrubar rendimento. Forçar aqui é pedir para estudar muito e render pouco.',
      recommendation:
        'Mantenha o edital base como prioridade, consolide o núcleo principal e reavalie a segunda rota quando a fundação estiver madura.',
    };
  }, [comparison, courseCount, selectedTargetOneSnapshot, selectedTargetTwo, selectedTargetTwoSnapshot]);

  const displayedVerdict = useMemo(() => {
    if (!aiCompatibility) return finalVerdict;
    const planText = Array.isArray(aiCompatibility.plan) && aiCompatibility.plan.length > 0
      ? aiCompatibility.plan.join(' ')
      : finalVerdict.recommendation;
    return {
      ...finalVerdict,
      title: aiCompatibility.headline || finalVerdict.title,
      text: aiCompatibility.summary || finalVerdict.text,
      recommendation: planText,
      aiAdvantages: aiCompatibility.advantages || [],
      aiRisks: aiCompatibility.risks || [],
      sourceLabel: 'Parecer da IA',
    };
  }, [aiCompatibility, finalVerdict]);

  const comparisonRows = useMemo(() => {
    const buildStageCount = (contest) => (Array.isArray(contest?.etapas_tags) ? contest.etapas_tags.length : 0);
    const buildSubjectCount = (contest) => (Array.isArray(contest?.disciplinas) ? contest.disciplinas.length : 0);
    const buildTopicCount = (contest) =>
      (Array.isArray(contest?.disciplinas) ? contest.disciplinas : []).reduce(
        (acc, subject) => acc + (Array.isArray(subject?.topicos) ? subject.topicos.length : 0),
        0
      );

    const triple = courseCount === 3 && selectedTargetTwo;
    let examGapDaysTargetTwo = null;
    if (triple && selectedBase?.prova_data && selectedTargetTwo?.prova_data) {
      const d0 = new Date(`${selectedBase.prova_data}T12:00:00`);
      const d2 = new Date(`${selectedTargetTwo.prova_data}T12:00:00`);
      if (!Number.isNaN(d0.getTime()) && !Number.isNaN(d2.getTime())) {
        examGapDaysTargetTwo = Math.round(Math.abs(d2.getTime() - d0.getTime()) / 86400000);
      }
    }
    const extraTopicLoadRatioTwo =
      triple && comparison.baseTopicCount > 0
        ? Math.round((comparison.uniqueTopicsTargetTwo / comparison.baseTopicCount) * 100)
        : triple && comparison.uniqueTopicsTargetTwo > 0
          ? 100
          : 0;

    return [
      {
        label: 'Banca',
        base: selectedBase?.banca || 'Não informado',
        targetOne: selectedTargetOne?.banca || 'Não informado',
        targetTwo: triple ? selectedTargetTwo?.banca || 'Não informado' : '',
      },
      {
        label: 'Salário',
        base: selectedBase?.salario || 'Não informado',
        targetOne: selectedTargetOne?.salario || 'Não informado',
        targetTwo: triple ? selectedTargetTwo?.salario || 'Não informado' : '',
      },
      {
        label: 'Data de prova',
        base: selectedBase?.prova_data || 'Não informado',
        targetOne: selectedTargetOne?.prova_data || 'Não informado',
        targetTwo: triple ? selectedTargetTwo?.prova_data || 'Não informado' : '',
      },
      {
        label: 'Vagas',
        base: selectedBase?.vagas || 'Não informado',
        targetOne: selectedTargetOne?.vagas || 'Não informado',
        targetTwo: triple ? selectedTargetTwo?.vagas || 'Não informado' : '',
      },
      {
        label: 'Escolaridade',
        base: selectedBase?.escolaridade || 'Não informado',
        targetOne: selectedTargetOne?.escolaridade || 'Não informado',
        targetTwo: triple ? selectedTargetTwo?.escolaridade || 'Não informado' : '',
      },
      {
        label: 'Etapas',
        base: String(buildStageCount(selectedBase)),
        targetOne: String(buildStageCount(selectedTargetOne)),
        targetTwo: triple ? String(buildStageCount(selectedTargetTwo)) : '',
      },
      {
        label: 'Disciplinas',
        base: String(buildSubjectCount(selectedBase)),
        targetOne: String(buildSubjectCount(selectedTargetOne)),
        targetTwo: triple ? String(buildSubjectCount(selectedTargetTwo)) : '',
      },
      {
        label: 'Tópicos',
        base: String(buildTopicCount(selectedBase)),
        targetOne: String(buildTopicCount(selectedTargetOne)),
        targetTwo: triple ? String(buildTopicCount(selectedTargetTwo)) : '',
      },
      {
        label: 'Tópicos únicos no alvo',
        base: `${comparison.baseTopicCount} no edital base`,
        targetOne: `${comparison.uniqueTopicsTargetOne} fora do programa da base`,
        targetTwo: triple ? `${comparison.uniqueTopicsTargetTwo} fora do programa da base` : '',
      },
      {
        label: 'Dias entre as provas',
        base: selectedBase?.prova_data ? formatCompareCell(selectedBase.prova_data) : 'Não informado',
        targetOne:
          comparison.examGapDays === null
            ? 'Informe as duas datas de prova'
            : comparison.examGapDays === 0
              ? 'Provas no mesmo dia'
              : `${comparison.examGapDays} dia(s) entre base e alvo`,
        targetTwo:
          triple && examGapDaysTargetTwo === null
            ? 'Informe datas na base e no 3º edital'
            : triple && examGapDaysTargetTwo === 0
              ? 'Provas no mesmo dia (base x alvo 2)'
              : triple
                ? `${examGapDaysTargetTwo} dia(s) entre base e alvo 2`
                : '',
      },
      {
        label: 'Carga extra de tópicos',
        base: 'Referência (100%)',
        targetOne: `~${comparison.extraTopicLoadRatio}% do volume de tópicos da base só no alvo`,
        targetTwo: triple ? `~${extraTopicLoadRatioTwo}% do volume de tópicos da base no alvo 2` : '',
      },
      {
        label: 'Tópicos aproveitáveis',
        base: 'Base de referência',
        targetOne: `${comparison.commonTopicsCount} tópicos em comum`,
        targetTwo: triple ? `${comparison.commonTopicsBaseTargetTwo} tópicos em comum com a base` : '',
      },
      {
        label: 'Aderencia ao seu estudo',
        base: `${selectedBaseSnapshot.coveredSubjects}/${selectedBaseSnapshot.totalSubjects || 0} materias no seu ciclo`,
        targetOne: `${selectedTargetOneSnapshot.coveredSubjects}/${selectedTargetOneSnapshot.totalSubjects || 0} materias ja mapeadas`,
        targetTwo: triple
          ? `${selectedTargetTwoSnapshot.coveredSubjects}/${selectedTargetTwoSnapshot.totalSubjects || 0} materias ja mapeadas`
          : '',
      },
      {
        label: 'Prontidao atual',
        base: `${selectedBaseSnapshot.readinessScore}%`,
        targetOne: `${selectedTargetOneSnapshot.readinessScore}%`,
        targetTwo: triple ? `${selectedTargetTwoSnapshot.readinessScore}%` : '',
      },
      {
        label: 'Prazo da prova',
        base: selectedBaseSnapshot.daysUntilExam === null ? 'Sem data' : `${selectedBaseSnapshot.daysUntilExam} dia(s)`,
        targetOne:
          selectedTargetOneSnapshot.daysUntilExam === null ? 'Sem data' : `${selectedTargetOneSnapshot.daysUntilExam} dia(s)`,
        targetTwo:
          triple && selectedTargetTwoSnapshot.daysUntilExam === null
            ? 'Sem data'
            : triple
              ? `${selectedTargetTwoSnapshot.daysUntilExam} dia(s)`
              : '',
      },
      {
        label: 'Diferença salarial',
        base: 'Referência',
        targetOne: comparison.salaryDeltaTargetOne,
        targetTwo: triple ? comparison.salaryDeltaTargetTwo : '',
      },
    ];
  }, [
    courseCount,
    selectedBase,
    selectedTargetOne,
    selectedTargetTwo,
    comparison.baseTopicCount,
    comparison.commonTopicsCount,
    comparison.commonTopicsBaseTargetTwo,
    comparison.examGapDays,
    comparison.extraTopicLoadRatio,
    comparison.salaryDeltaTargetOne,
    comparison.salaryDeltaTargetTwo,
    comparison.uniqueTopicsTargetOne,
    comparison.uniqueTopicsTargetTwo,
    selectedBaseSnapshot,
    selectedTargetOneSnapshot,
    selectedTargetTwoSnapshot,
  ]);

  const hasEnoughContests = options.length >= 2;
  const duplicateSelection =
    baseContestId === targetOneId ||
    (courseCount === 3 &&
      (!String(targetTwoId || '').trim() ||
        targetTwoId === baseContestId ||
        targetTwoId === targetOneId));
  const canCompare =
    hasEnoughContests &&
    Boolean(selectedBase) &&
    Boolean(selectedTargetOne) &&
    !duplicateSelection &&
    (courseCount !== 3 || Boolean(selectedTargetTwo));

  const overviewStats =
    !selectedBase || !selectedTargetOne || duplicateSelection
      ? [
          {
            label: 'Compatibilidade',
            value: '—',
            helper: 'Selecione editais distintos na faixa acima',
            icon: Radar,
            tone: 'blue',
          },
          {
            label: 'Em comum',
            value: '—',
            helper: 'Disciplinas e tópicos cruzados aparecem aqui',
            icon: Sparkles,
            tone: 'gold',
          },
          {
            label: 'Etapas extras',
            value: '—',
            helper: 'Comparativo ainda não gerado',
            icon: Zap,
            tone: 'rose',
          },
        ]
      : [
          {
            label: 'Compatibilidade',
            value: `${comparison.compatibility}%`,
            helper: 'Sobreposição de disciplinas no programa',
            icon: Radar,
            tone: 'blue',
          },
          {
            label: 'Em comum',
            value: `${comparison.commonSubjects.length} disc.`,
            helper: 'Núcleo reaproveitável entre base e alvos',
            icon: Sparkles,
            tone: 'gold',
          },
          {
            label: 'Etapas extras no alvo',
            value: String(
              comparison.extraStagesTargetOne.length + (courseCount === 3 ? comparison.extraStagesTargetTwo.length : 0)
            ),
            helper: 'Etapas no 2.º edital que não existem na base',
            icon: Zap,
            tone: 'rose',
          },
          ...(comparison.examGapDays !== null
            ? [
                {
                  label: 'Distância entre provas',
                  value: comparison.examGapDays === 0 ? 'Mesmo dia' : `${comparison.examGapDays} dias`,
                  helper: 'Intervalo entre as datas de prova informadas',
                  icon: CalendarDays,
                  tone: 'blue',
                },
              ]
            : []),
        ];

  const heroSubtitle = isComparing
    ? 'Resumo numérico e parecer abaixo — use as abas para tabela, disciplinas e conteúdo integral.'
    : 'Escolha base e um ou dois alvos na faixa, depois gere a análise para ver tabela, disciplinas e parecer.';

  const headlineStats = overviewStats.map((item, i) => ({
    key: `${item.label}-${i}`,
    icon: item.icon,
    label: item.label,
    value: String(item.value),
    accent: item.tone === 'gold' ? 'amber' : item.tone === 'rose' ? 'red' : 'blue',
    className: 'min-w-[9.5rem]',
  }));

  const handleCompare = () => {
    if (!canCompare) return;

    const entry = {
      id: `compare-${Date.now()}`,
      createdAt: new Date().toISOString(),
      baseContestId,
      targetOneId,
      targetTwoId: courseCount === 3 ? String(targetTwoId || '') : '',
      compatibility: comparison.compatibility,
      verdictTitle: finalVerdict.title,
      baseLabel: selectedBase?.nome || 'Edital base',
      targetOneLabel: selectedTargetOne?.nome || 'Alvo 1',
      targetTwoLabel: courseCount === 3 ? selectedTargetTwo?.nome || '' : '',
      sharedReadiness: comparison.sharedReadiness,
      targetOneReadiness: comparison.targetOneReadiness,
      targetTwoReadiness: courseCount === 3 ? comparison.targetTwoReadiness : 0,
      anchorContestId: comparison.recommendedAnchor?.id || selectedBase?.id || '',
    };

    setComparisonHistory((prev) => {
      const deduped = prev.filter(
        (item) =>
          !(
            item.baseContestId === entry.baseContestId &&
            item.targetOneId === entry.targetOneId &&
            item.targetTwoId === entry.targetTwoId
          )
      );
      return [entry, ...deduped].slice(0, 8);
    });

    setIsComparing(true);
    setActivePanel('visao');
    setAiCompatibility(null);
    setAiCompatibilityLoading(true);

    analyzeContestCompatibility({
      baseContest: selectedBase,
      targetContests: [selectedTargetOne, ...(courseCount === 3 && selectedTargetTwo ? [selectedTargetTwo] : [])],
      comparison,
      userReadiness: {
        base: selectedBaseSnapshot,
        targetOne: selectedTargetOneSnapshot,
        targetTwo: courseCount === 3 ? selectedTargetTwoSnapshot : null,
      },
    })
      .then((result) => setAiCompatibility(result))
      .catch(() => setAiCompatibility(null))
      .finally(() => setAiCompatibilityLoading(false));
  };

  const handleRestoreHistory = (entry) => {
    const b = String(entry?.baseContestId || '');
    const t1 = String(entry?.targetOneId || '');
    const t2 = String(entry?.targetTwoId || '').trim();
    setBaseContestId(b);
    setTargetOneId(t1);
    if (t2 && b && t1 && new Set([b, t1, t2]).size === 3) {
      setCourseCount(3);
      setTargetTwoId(t2);
    } else {
      setCourseCount(2);
      setTargetTwoId('');
    }
    setIsComparing(true);
    setActivePanel('visao');
  };

  const handleDeleteHistory = (entryId) => {
    setComparisonHistory((prev) => prev.filter((item) => item.id !== entryId));
  };

  return (
    <div className="pl-app pl-paper-bg-soft pl-conc-shell">
      {/* Hero compacto */}
      <header className="pl-conc-hero">
        <div>
          <div className="lede-row">
            <span className="pl-eyebrow">Conciliador</span>
          </div>
          <h1>
            {selectedBase && selectedTargetOne && !duplicateSelection
              ? <>Vale a pena conciliar<span className="dot">?</span></>
              : <>Cruze os editais<span className="dot">.</span></>}
          </h1>
          {selectedBase && selectedTargetOne && !duplicateSelection ? (
            <p className="versus">
              <strong>{selectedBase?.nome}</strong>
              <span className="arrow">×</span>
              <strong>{selectedTargetOne?.nome}</strong>
              {courseCount === 3 && selectedTargetTwo ? (
                <><span className="arrow">×</span><strong>{selectedTargetTwo?.nome}</strong></>
              ) : null}
            </p>
          ) : (
            <p className="versus" style={{ color: 'var(--pl-ink-3)' }}>{heroSubtitle}</p>
          )}
        </div>
        <div className="pl-conc-hero-kpis">
          {headlineStats.slice(0, 4).map((s, idx) => (
            <div key={s.key || idx} className="pl-conc-hero-kpi">
              <span className="lab">{s.label}</span>
              <span className="val">{s.value}</span>
            </div>
          ))}
        </div>
      </header>

      {/* Tabs editorial */}
      <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--pl-rule-2)', paddingBottom: 0 }} aria-label="Secoes do conciliador">
        {INTERNAL_NAV.map((item) => {
          const Icon = item.icon;
          const active = activePanel === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePanel(item.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px',
                background: 'none', border: 'none',
                borderBottom: active ? '2px solid var(--pl-accent)' : '2px solid transparent',
                marginBottom: -1,
                fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? 'var(--pl-accent)' : 'var(--pl-ink-3)',
                cursor: 'pointer', transition: 'color .15s',
                fontFamily: 'var(--pl-sans)',
              }}
            >
              <Icon size={14} /> {item.label}
            </button>
          );
        })}
        {canCompare && !isComparing ? (
          <button
            type="button"
            onClick={handleCompare}
            className="pl-btn pl-btn-primary pl-btn-sm"
            style={{ marginLeft: 'auto', alignSelf: 'center' }}
          >
            <Sparkles size={13} /> Gerar analise
          </button>
        ) : null}
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section className="pl-conc-strip" aria-label="Editais a comparar">
          {remoteLoading ? (
            <span style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>Carregando editais…</span>
          ) : remoteLoaded && options.length === 0 ? (
            <span style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>Nenhum concurso no catálogo.</span>
          ) : (
            <>
              <SelectStripField
                micro="Base"
                icon={BookOpen}
                accent="blue"
                value={baseContestId}
                onChange={setBaseContestId}
                options={options}
                excludeIds={[targetOneId, ...(courseCount === 3 ? [targetTwoId] : [])].filter(Boolean)}
              />
              <ArrowRightLeft size={14} className="arrow-mid" />
              <SelectStripField
                micro="Alvo 1"
                icon={Target}
                accent="indigo"
                value={targetOneId}
                onChange={setTargetOneId}
                options={options}
                excludeIds={[baseContestId, ...(courseCount === 3 ? [targetTwoId] : [])].filter(Boolean)}
              />
              {courseCount === 3 ? (
                <>
                  <ArrowRightLeft size={14} className="arrow-mid" />
                  <SelectStripField
                    micro="Alvo 2"
                    icon={Layers3}
                    accent="pink"
                    value={targetTwoId}
                    onChange={setTargetTwoId}
                    options={options}
                    excludeIds={[baseContestId, targetOneId].filter(Boolean)}
                    trailing={
                      <button type="button" onClick={() => { setCourseCount(2); setTargetTwoId(''); }} className="pl-btn pl-btn-sm" title="Remover 3 edital">
                        <X size={13} />
                      </button>
                    }
                  />
                </>
              ) : (
                <button
                  type="button"
                  disabled={options.length < 3}
                  onClick={() => setCourseCount(3)}
                  className="pl-btn pl-btn-sm"
                  title={options.length < 3 ? 'Sao necessarios ao menos tres editais' : 'Incluir terceiro edital'}
                >
                  <Plus size={12} /> 3 edital
                </button>
              )}
              <span className={`status-pill${(!hasEnoughContests || duplicateSelection) ? ' muted' : ''}`}>
                {options.length === 0 ? 'Sem dados' : !hasEnoughContests ? 'Poucos editais' : duplicateSelection ? 'Invalido' : 'Pronto'}
              </span>
            </>
          )}
        </section>

            {isComparing ? (
              <>
                {(activePanel === 'visao' || activePanel === 'comparacao') && (
                  <section className={`pl-conc-verdict${
                    comparison.compatibility < 32 ? ' danger' : comparison.compatibility < 58 ? ' warn' : ' success'
                  }`}>
                    <div className="info">
                      <span className="eyebrow">Resultado executivo</span>
                      <h2 className={comparison.compatibility < 32 ? 'danger' : comparison.compatibility < 58 ? 'warn' : 'success'}>
                        {finalVerdict.title}
                      </h2>
                      <p className="desc">{finalVerdict.text}</p>
                      <div className="quick-stats">
                        <div className="quick-stat">
                          <span className="lab">Disciplinas em comum</span>
                          <span className="val">{comparison.commonSubjects.length}</span>
                        </div>
                        <div className="quick-stat">
                          <span className="lab">Materias ineditas</span>
                          <span className="val">{comparison.targetOnlySubjects.length}</span>
                        </div>
                        <div className="quick-stat">
                          <span className="lab">Salario alvo 1</span>
                          <span className="val" style={{ fontSize: 16 }}>{comparison.salaryDeltaTargetOne}</span>
                        </div>
                      </div>
                      {finalVerdict.recommendation ? (
                        <div className="pl-conc-reco">
                          <span className="lab">Recomendacao pratica</span>
                          <p>{finalVerdict.recommendation}</p>
                        </div>
                      ) : null}
                    </div>
                    <div className="gauge">
                      <svg viewBox="0 0 180 180">
                        <circle cx="90" cy="90" r="78" className="bg" />
                        <circle
                          cx="90" cy="90" r="78"
                          className="fg"
                          strokeDasharray={`${(Math.max(0, Math.min(100, comparison.compatibility)) / 100) * (2 * Math.PI * 78)} ${2 * Math.PI * 78}`}
                        />
                      </svg>
                      <span className="pct">{comparison.compatibility}<sup>%</sup></span>
                    </div>
                  </section>
                )}

                {activePanel === 'visao' && (
                  <>
                    <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_380px]">
                      <ComparisonTable
                        baseContest={selectedBase}
                        targetOneContest={selectedTargetOne}
                        targetTwoContest={courseCount === 3 ? selectedTargetTwo : null}
                        rows={comparisonRows}
                      />

                      <VerdictCard verdict={finalVerdict} />
                    </section>

                    <section className="pl-conc-quad">
                      <div className="pl-conc-quad-card">
                        <div className="icon"><CheckCircle2 size={16} /></div>
                        <span className="lab">Aproveitamento</span>
                        <p className="val">{comparison.commonSubjects.length} disc.</p>
                        <p className="desc">Nucleo que voce reaproveita sem pedir arrego ao cronograma.</p>
                      </div>
                      <div className="pl-conc-quad-card">
                        <div className="icon"><Layers3 size={16} /></div>
                        <span className="lab">Cobertura</span>
                        <p className="val">{comparison.commonTopicsCount} topicos</p>
                        <p className="desc">Ganho de velocidade: revisao com efeito em mais de uma prova.</p>
                      </div>
                      <div className={`pl-conc-quad-card${comparison.targetOnlySubjects.length > 5 ? ' warn' : ''}`}>
                        <div className="icon"><CircleAlert size={16} /></div>
                        <span className="lab">Carga nova</span>
                        <p className="val">{comparison.targetOnlySubjects.length + (courseCount === 3 ? comparison.targetTwoOnlySubjects.length : 0)} disc.</p>
                        <p className="desc">Toda novidade cobra pedagio. Nao deixe estourar a rota principal.</p>
                      </div>
                      <div className="pl-conc-quad-card">
                        <div className="icon"><Zap size={16} /></div>
                        <span className="lab">Complexidade</span>
                        <p className="val">{comparison.extraStagesTargetOne.length + (courseCount === 3 ? comparison.extraStagesTargetTwo.length : 0)} etapas</p>
                        <p className="desc">Etapas paralelas aumentam o peso operacional da conciliacao.</p>
                      </div>
                    </section>
                    {/* compat preservada para panel comparacao */}
                    <div style={{ display: 'none' }}>
                      <InfoCard
                        icon={CircleAlert}
                        eyebrow="Carga nova"
                        title={`${comparison.targetOnlySubjects.length + (courseCount === 3 ? comparison.targetTwoOnlySubjects.length : 0)} disciplinas novas`}
                        text="Toda novidade cobra pedágio. O truque é não deixar isso estourar a rota principal."
                        tone="amber"
                      />
                      <InfoCard
                        icon={Zap}
                        eyebrow="Complexidade"
                        title={`${comparison.extraStagesTargetOne.length + (courseCount === 3 ? comparison.extraStagesTargetTwo.length : 0)} etapas extras`}
                        text="Etapas paralelas aumentam o peso operacional da conciliacao."
                        tone="slate"
                      />
                    </div>{/* end hidden */}
                  </>
                )}

                {activePanel === 'comparacao' && (
                  <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_380px]">
                    <ComparisonTable
                      baseContest={selectedBase}
                      targetOneContest={selectedTargetOne}
                      targetTwoContest={courseCount === 3 ? selectedTargetTwo : null}
                      rows={comparisonRows}
                    />

                    <div className="space-y-6">
                      <InfoCard
                        icon={DollarSign}
                        eyebrow="Leitura salarial"
                        title={comparison.salaryDeltaTargetOne}
                        text="Diferença do alvo 1 em relação ao edital base. Porque motivação também entra na conta."
                        tone="blue"
                        tall
                      />
                      <InfoCard
                        icon={Crown}
                        eyebrow="Foco recomendado"
                        title={selectedBase?.nome || 'Edital base'}
                        text="Mantenha esta rota como âncora até o segundo edital provar que merece dividir o volante."
                        tone="indigo"
                        tall
                      />
                    </div>
                  </section>
                )}

                {activePanel === 'conteudo' && selectedBase && selectedTargetOne && !duplicateSelection && (
                  <section className="space-y-6">
                    <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Leitura integral</p>
                      <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Conteúdo declarado nos editais</h3>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        Etapas, resumo do catálogo e grade com contagem de tópicos — o mesmo bloco disponível antes da análise, aqui integrado ao fluxo após o parecer.
                      </p>
                    </div>
                    <EditalSideBySide
                      baseContest={selectedBase}
                      targetContest={selectedTargetOne}
                      subjectCatalog={subjectCatalog}
                    />
                  </section>
                )}

                {activePanel === 'materias' && (
                  <>
                    <section className={`grid gap-6 ${courseCount === 3 ? '2xl:grid-cols-2' : 'xl:grid-cols-3'}`}>
                      <AnalysisCard
                        theme="blue"
                        icon={CheckCircle2}
                        title="Aproveitamento real"
                        subtitle="Disciplinas em comum"
                        items={comparison.commonSubjects}
                      />

                      <AnalysisCard
                        theme="amber"
                        icon={CircleAlert}
                        title={`Novidades em ${selectedTargetOne?.nome || 'Alvo 1'}`}
                        subtitle="O que entra do zero"
                        items={comparison.targetOnlySubjects.map((item, index) =>
                          index === 0 && comparison.uniqueTopicsTargetOne > 0
                            ? { text: item, badge: `+${comparison.uniqueTopicsTargetOne} tópicos` }
                            : item
                        )}
                        topBar
                      />

                      {courseCount === 3 && (
                        <AnalysisCard
                          theme="indigo"
                          icon={Layers3}
                          title={`Novidades em ${selectedTargetTwo?.nome || 'Alvo 2'}`}
                          subtitle="Peso do 3º edital"
                          items={comparison.targetTwoOnlySubjects.map((item, index) =>
                            index === 0 && comparison.uniqueTopicsTargetTwo > 0
                              ? { text: item, badge: `+${comparison.uniqueTopicsTargetTwo} tópicos` }
                              : item
                          )}
                          topBar
                        />
                      )}

                      <AnalysisCard
                        theme="slate"
                        icon={Trash2}
                        title="Base sem reaproveitamento"
                        subtitle="O que não ajuda na nova rota"
                        items={comparison.baseOnlySubjects}
                        muted
                      />
                    </section>

                    <section className="grid gap-6 xl:grid-cols-2">
                      <AnalysisCard
                        theme="amber"
                        icon={Zap}
                        title="Etapas extras do alvo 1"
                        subtitle="Complexidade adicionada"
                        items={comparison.extraStagesTargetOne}
                        topBar
                      />

                      <AnalysisCard
                        theme={courseCount === 3 ? 'indigo' : 'slate'}
                        icon={CalendarDays}
                        title={courseCount === 3 ? 'Etapas extras do alvo 2' : 'Leitura estratégica'}
                        subtitle={
                          courseCount === 3
                            ? 'Impacto acumulado do 3º edital'
                            : 'Sem etapas extras, a conciliação tende a ficar mais leve'
                        }
                        items={courseCount === 3 ? comparison.extraStagesTargetTwo : []}
                        topBar={courseCount === 3}
                        muted={courseCount !== 3}
                      />
                    </section>
                  </>
                )}

                {activePanel === 'parecer' && (
                  <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                    <VerdictCard verdict={displayedVerdict} loading={aiCompatibilityLoading} />

                    <div className="grid gap-6">
                      <InfoCard
                        icon={Trophy}
                        eyebrow="Decisão estratégica"
                        title={displayedVerdict.title}
                        text={displayedVerdict.recommendation}
                        tone="gold"
                        tall
                      />
                      <InfoCard
                        icon={Gem}
                        eyebrow="Leitura do cenário"
                        title={`${comparison.compatibility}% de compatibilidade`}
                        text="Resumo frio e sem romance: quanto maior esse número, mais fácil conciliar sem perder eficiência."
                        tone="blue"
                        tall
                      />
                    </div>
                  </section>
                )}
              </>
            ) : activePanel === 'conteudo' && selectedBase && selectedTargetOne && !duplicateSelection ? (
              <section className="space-y-6">
                <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Leitura integral</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Conteúdo declarado nos editais</h3>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Compare etapas, resumo do catálogo e grade (disciplinas + tópicos) antes de gerar o parecer. Use{' '}
                    <span className="font-semibold text-slate-700">Gerar análise</span> no topo para ver estatísticas e veredito.
                  </p>
                </div>
                <EditalSideBySide
                  baseContest={selectedBase}
                  targetContest={selectedTargetOne}
                  subjectCatalog={subjectCatalog}
                />
              </section>
            ) : (
              <section className="rounded-[1.9rem] border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-[0_20px_50px_-30px_rgba(15,23,42,0.2)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#dbeafe_0%,#eef2ff_100%)] text-blue-700 shadow-sm">
                  <Wand2 size={24} />
                </div>
                <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">Painel interativo</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Agora a lateral troca o conteúdo de verdade.</h3>
                <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
                  Use <span className="font-semibold text-slate-700">Gerar análise</span> no cabeçalho. Depois, as abas Visão geral, Comparação, Conteúdo, Disciplinas e Parecer mostram o detalhe.
                </p>
              </section>
            )}
      </div>

      {comparisonHistory.length > 0 ? (
        <section className="pl-conc-history">
          <div className="head">
            <h4>Historico de comparacoes</h4>
            <span className="cnt">{comparisonHistory.length} salvas</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {comparisonHistory.map((entry) => (
              <div key={entry.id} className="pl-conc-history-item">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span className="badge">{entry.verdictTitle || 'Analise salva'}</span>
                  <p className="ttl" style={{ margin: '4px 0 0' }}>
                    {entry.baseLabel} <span style={{ color: 'var(--pl-ink-4)' }}>x</span> {entry.targetOneLabel}
                    {entry.targetTwoLabel ? <> <span style={{ color: 'var(--pl-ink-4)' }}>x</span> {entry.targetTwoLabel}</> : null}
                  </p>
                  <p className="meta">{entry.compatibility}% compativel · {formatCompareTimestamp(entry.createdAt)}</p>
                </div>
                <div className="actions">
                  <button type="button" onClick={() => handleRestoreHistory(entry)}>Restaurar</button>
                  <button type="button" onClick={() => onOpenContestDetail?.(entry.baseContestId)}>Ver base</button>
                  <button type="button" className="active" onClick={() => onSetTargetContest?.(entry.anchorContestId || entry.targetOneId)}>Foco</button>
                  <button type="button" onClick={() => handleDeleteHistory(entry.id)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function EditalSideBySide({ baseContest, targetContest, subjectCatalog }) {
  const stages = (c) =>
    Array.isArray(c?.etapas_tags) && c.etapas_tags.length ? c.etapas_tags : ['Nenhuma etapa listada no catálogo'];

  const disciplineRows = (c) => {
    const list = Array.isArray(c?.disciplinas) ? c.disciplinas : [];
    if (!list.length) return [];
    return list.map((d, index) => {
      const nome = canonicalizeSubjectName(d?.nome || '', subjectCatalog) || String(d?.nome || '').trim() || 'Disciplina';
      const topicos = Array.isArray(d?.topicos) ? d.topicos.length : 0;
      return { id: d?.id || `${nome}-${index}`, nome, topicos };
    });
  };

  const col = (contest, tone) => {
    const border =
      tone === 'blue'
        ? 'border-blue-100 bg-gradient-to-b from-blue-50/40 to-white'
        : 'border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white';
    const rows = disciplineRows(contest);

    return (
      <div className={`flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] border shadow-sm ${border}`}>
        <div className="border-b border-slate-100 bg-white/90 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{tone === 'blue' ? 'Edital base' : 'Edital comparado'}</p>
          <h4 className="mt-1 text-lg font-semibold leading-snug text-slate-900">{contest?.nome || '—'}</h4>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {[contest?.banca, contest?.escolaridade].filter(Boolean).join(' · ') || 'Metadados limitados no catálogo'}
          </p>
          {contest?.description ? (
            <p className="mt-3 line-clamp-4 text-sm font-medium leading-relaxed text-slate-600">{String(contest.description)}</p>
          ) : contest?.content ? (
            <p className="mt-3 line-clamp-4 text-sm font-medium leading-relaxed text-slate-600">{String(contest.content)}</p>
          ) : null}
        </div>

        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Etapas / exigências</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {stages(contest).map((tag) => (
              <span
                key={`${contest?.id}-${tag}`}
                className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600"
              >
                {formatStageLabel(tag)}
              </span>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3" style={{ maxHeight: 'min(52vh, 28rem)' }}>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Disciplinas e tópicos</p>
          {rows.length === 0 ? (
            <div className="mx-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
              Este edital ainda não tem disciplinas estruturadas no catálogo. Abra o detalhe do concurso para importar o programa.
            </div>
          ) : (
            <ul className="space-y-1.5 px-2 pb-4">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800"
                >
                  <span className="min-w-0 truncate">{row.nome}</span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {row.topicos} tópicos
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {col(baseContest, 'blue')}
      {col(targetContest, 'indigo')}
    </div>
  );
}

function SelectStripField({ micro, icon: Icon, value, onChange, options, excludeIds = [], accent = 'blue', trailing = null }) {
  const accents = {
    blue: { wrap: 'border-blue-200/80 bg-white', bar: 'bg-blue-600 text-white' },
    indigo: { wrap: 'border-indigo-200/80 bg-white', bar: 'bg-indigo-600 text-white' },
    pink: { wrap: 'border-pink-200/80 bg-white', bar: 'bg-pink-600 text-white' },
  };
  const palette = accents[accent] || accents.blue;
  const skip = new Set((excludeIds || []).map((id) => String(id)));
  const filtered = options.filter((option) => !skip.has(String(option.id)));
  const selectedOption = filtered.find((option) => option.id === value) || null;
  const selectedImage = selectedOption?.contest?.imagem_url || '';

  return (
    <div className={`flex min-h-[40px] min-w-0 flex-1 items-stretch overflow-hidden rounded-lg border ${palette.wrap}`}>
      <div
        className={`flex w-[50px] shrink-0 flex-col items-center justify-center gap-0.5 border-r border-slate-200/80 px-0.5 py-1 sm:w-[52px] ${palette.bar}`}
      >
        <Icon size={15} strokeWidth={2.2} className="text-white" />
        <span className="max-w-full truncate px-0.5 text-center text-[7px] font-bold uppercase leading-none tracking-wide text-white/90">
          {micro}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 items-center bg-slate-50/40">
        <div className="ml-2 flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
          {selectedImage ? (
            <img src={selectedImage} alt={selectedOption?.contest?.nome || selectedOption?.label || micro} className="h-full w-full object-cover" />
          ) : (
            <Icon size={16} className="text-slate-300" />
          )}
        </div>
        <select
          value={filtered.some((o) => o.id === value) ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-[40px] w-full min-w-0 cursor-pointer border-0 bg-transparent px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-0 sm:text-[13px]"
        >
          {filtered.length === 0 ? <option value="">—</option> : null}
          {filtered.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {trailing ? <div className="flex shrink-0 items-center border-l border-slate-200/80 bg-white/80 px-0.5">{trailing}</div> : null}
    </div>
  );
}

function StripQuickContestLinks({ label, contest, onOpenContestDetail, onSetTargetContest }) {
  if (!contest) return null;
  return (
    <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="shrink-0 font-bold uppercase tracking-wider text-[9px] text-slate-400">{label}</span>
      <span className="max-w-[11rem] truncate font-semibold text-slate-800 sm:max-w-[14rem]">{contest.nome}</span>
      <button
        type="button"
        onClick={() => onOpenContestDetail?.(contest.id)}
        className="shrink-0 font-semibold text-indigo-600 hover:underline"
      >
        Ver
      </button>
      <button
        type="button"
        onClick={() => onSetTargetContest?.(contest.id)}
        className="shrink-0 font-semibold text-indigo-600 hover:underline"
      >
        Foco
      </button>
    </span>
  );
}

function InfoCard({ icon: Icon, eyebrow, title, text, tone = 'blue', tall = false }) {
  const tones = {
    blue: 'border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fbff_100%)] text-blue-950',
    indigo: 'border-indigo-100 bg-[linear-gradient(135deg,#eef2ff_0%,#f8faff_100%)] text-indigo-950',
    amber: 'border-amber-100 bg-[linear-gradient(135deg,#fff7ed_0%,#fffbeb_100%)] text-amber-950',
    gold: 'border-amber-200 bg-[linear-gradient(135deg,#fff8db_0%,#fffdf3_100%)] text-amber-950',
    slate: 'border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_100%)] text-slate-950',
  };

  return (
    <div
      className={`rounded-[1.7rem] border p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.18)] ${tones[tone] || tones.blue} ${
        tall ? 'min-h-[220px]' : ''
      }`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-black/5">
        <Icon size={18} />
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] opacity-60">{eyebrow}</p>
      <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-relaxed opacity-75">{text}</p>
    </div>
  );
}

function StatusBadge({ tone = 'neutral', text }) {
  const tones = {
    positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    neutral: 'border-slate-200 bg-white text-slate-600',
    alert: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] ${tones[tone] || tones.neutral}`}>
      {text}
    </span>
  );
}

function CompatibilityGauge({ value }) {
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * value) / 100;

  return (
    <div className="mx-auto flex w-full max-w-[290px] flex-col items-center rounded-[2rem] border border-white/10 bg-white/10 p-6 text-center shadow-xl backdrop-blur-sm">
      <div className="relative flex h-[190px] w-[190px] items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={radius} stroke="rgba(255,255,255,0.10)" strokeWidth="14" fill="none" />
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="url(#conciliadorGradient)"
            strokeWidth="14"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="conciliadorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="50%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">Compatibilidade</p>
          <p className="mt-2 text-5xl font-semibold tracking-[-0.05em] text-white">{value}%</p>
        </div>
      </div>

      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300">Núcleo comum aproveitável</p>
    </div>
  );
}

function DarkMetric({ label, value, helper, compact = false }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className={`mt-2 font-semibold tracking-[-0.04em] text-white ${compact ? 'text-xl' : 'text-3xl'}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{helper}</p>
    </div>
  );
}

function AnalysisCard({ theme, icon: Icon, title, subtitle, items, topBar = false, muted = false }) {
  const themes = {
    blue: {
      wrapper: 'border-blue-100',
      header: 'bg-[linear-gradient(135deg,#eff6ff_0%,#f8fbff_100%)] border-blue-100',
      iconBox: 'bg-blue-600 text-white',
      title: 'text-slate-950',
      subtitle: 'text-slate-500',
      dot: 'bg-blue-500',
      bar: 'bg-blue-500',
      badge: 'bg-blue-50 text-blue-700 border-blue-100',
      itemBorder: 'border-slate-100',
    },
    amber: {
      wrapper: 'border-amber-100',
      header: 'bg-[linear-gradient(135deg,#fff7ed_0%,#fffaf0_100%)] border-amber-100',
      iconBox: 'bg-amber-500 text-white',
      title: 'text-slate-950',
      subtitle: 'text-slate-500',
      dot: 'bg-amber-500',
      bar: 'bg-amber-500',
      badge: 'bg-amber-50 text-amber-700 border-amber-100',
      itemBorder: 'border-amber-100',
    },
    indigo: {
      wrapper: 'border-indigo-100',
      header: 'bg-[linear-gradient(135deg,#eef2ff_0%,#f8faff_100%)] border-indigo-100',
      iconBox: 'bg-indigo-600 text-white',
      title: 'text-slate-950',
      subtitle: 'text-slate-500',
      dot: 'bg-indigo-500',
      bar: 'bg-indigo-500',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      itemBorder: 'border-indigo-100',
    },
    slate: {
      wrapper: 'border-slate-200',
      header: 'bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_100%)] border-slate-200',
      iconBox: 'bg-slate-200 text-slate-700',
      title: 'text-slate-950',
      subtitle: 'text-slate-500',
      dot: 'bg-slate-400',
      bar: 'bg-slate-300',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      itemBorder: 'border-slate-100',
    },
  };

  const colors = themes[theme] || themes.slate;

  return (
    <div className={`overflow-hidden rounded-[1.8rem] border bg-white shadow-[0_18px_45px_-25px_rgba(15,23,42,0.16)] ${colors.wrapper}`}>
      <div className={`border-b px-6 py-5 ${colors.header}`}>
        <div className="flex items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${colors.iconBox}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Bloco analítico</p>
            <h3 className={`mt-1 text-xl font-semibold tracking-[-0.03em] ${colors.title}`}>{title}</h3>
            <p className={`mt-1 text-sm font-semibold ${colors.subtitle}`}>{subtitle}</p>
          </div>
        </div>
        {topBar && <div className={`mt-4 h-1.5 w-20 rounded-full ${colors.bar}`} />}
      </div>

      <div className="p-6">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
            Nada crítico detectado aqui.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const text = typeof item === 'string' ? item : item?.text;
              const badge = typeof item === 'string' ? '' : item?.badge || '';

              return (
                <div
                  key={`${title}-${index}-${String(text).slice(0, 48)}`}
                  className={`flex flex-col gap-3 rounded-2xl border bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${muted ? 'opacity-85' : ''} ${colors.itemBorder}`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${colors.dot}`} />
                    <span className="text-sm font-bold leading-relaxed text-slate-700">{text}</span>
                  </div>
                  {badge && (
                    <span className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${colors.badge}`}>
                      {badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function VerdictCard({ verdict, loading = false }) {
  const toneClasses = {
    emerald: {
      wrap: 'border-emerald-100 bg-[linear-gradient(180deg,#ecfdf5_0%,#ffffff_100%)]',
      pill: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      accent: 'bg-emerald-500',
    },
    amber: {
      wrap: 'border-amber-100 bg-[linear-gradient(180deg,#fffbeb_0%,#ffffff_100%)]',
      pill: 'bg-amber-50 text-amber-700 border-amber-100',
      accent: 'bg-amber-500',
    },
    rose: {
      wrap: 'border-rose-100 bg-[linear-gradient(180deg,#fff1f2_0%,#ffffff_100%)]',
      pill: 'bg-rose-50 text-rose-700 border-rose-100',
      accent: 'bg-rose-500',
    },
  };

  const style = toneClasses[verdict.tone] || toneClasses.amber;

  return (
    <div className={`rounded-[1.8rem] border p-6 shadow-[0_18px_45px_-25px_rgba(15,23,42,0.16)] ${style.wrap}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className={`inline-flex rounded-full border px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] ${style.pill}`}>
            {loading ? 'IA analisando' : verdict.sourceLabel || 'Parecer final'}
          </span>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{verdict.title}</h3>
        </div>
        <span className={`mt-2 hidden h-3 w-16 rounded-full ${style.accent} md:block`} />
      </div>

      <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600">{verdict.text}</p>

      <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Recomendação prática</p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">{verdict.recommendation}</p>
      </div>

      {(verdict.aiAdvantages?.length || verdict.aiRisks?.length) ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <MiniVerdictList title="Aproveitar" items={verdict.aiAdvantages} />
          <MiniVerdictList title="Cuidar" items={verdict.aiRisks} />
        </div>
      ) : null}
    </div>
  );
}

function MiniVerdictList({ title, items = [] }) {
  const list = Array.isArray(items) ? items.slice(0, 4) : [];
  if (list.length === 0) return null;
  return (
    <div className="rounded-[1.2rem] border border-slate-200 bg-white/80 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm font-medium leading-relaxed text-slate-700">
        {list.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonTable({ baseContest, targetOneContest, targetTwoContest, rows }) {
  return (
    <div className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_18px_45px_-25px_rgba(15,23,42,0.16)]">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Leitura comparativa</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Tabela executiva</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Um resumo limpo para confrontar carreira, salário, estrutura e peso do edital sem sair da área.
            </p>
          </div>
          <StatusBadge tone="neutral" text="Resumo premium" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/80">
              <TableHead>Item</TableHead>
              <TableHead>{baseContest?.nome || 'Base'}</TableHead>
              <TableHead>{targetOneContest?.nome || 'Alvo 1'}</TableHead>
              {targetTwoContest ? <TableHead>{targetTwoContest?.nome || 'Alvo 2'}</TableHead> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="align-top transition-colors hover:bg-slate-50/60">
                <td className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-900">{row.label}</td>
                <td className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-600">{formatCompareCell(row.base)}</td>
                <td className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-600">{formatCompareCell(row.targetOne)}</td>
                {targetTwoContest ? (
                  <td className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-600">{formatCompareCell(row.targetTwo)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableHead({ children }) {
  return (
    <th className="border-b border-slate-200 px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
      {children}
    </th>
  );
}

function formatCompareCell(value) {
  if (!value) return 'Não informado';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [year, month, day] = String(value).split('-');
    return `${day}/${month}/${year}`;
  }
  return String(value);
}

