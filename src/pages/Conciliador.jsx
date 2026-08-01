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
import { showConfirm, showToast } from '../lib/dialogs';


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

  const handleDeleteHistory = async (entryId) => {
    const ok = await showConfirm('Excluir esta comparação do histórico?', {
      title: 'Excluir comparação',
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    setComparisonHistory((prev) => prev.filter((item) => item.id !== entryId));
    showToast('Comparação excluída.', 'success');
  };

  return (
    <div className="pl-page">
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
                    <section style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(0, 1.15fr) 380px' }}>
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
                  <section style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(0, 1.15fr) 380px' }}>
                    <ComparisonTable
                      baseContest={selectedBase}
                      targetOneContest={selectedTargetOne}
                      targetTwoContest={courseCount === 3 ? selectedTargetTwo : null}
                      rows={comparisonRows}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
                  <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="pl-card" style={{ padding: 24 }}>
                      <p className="pl-eyebrow">Leitura integral</p>
                      <h3 style={{ marginTop: 8, fontSize: 18, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--pl-ink)' }}>Conteúdo declarado nos editais</h3>
                      <p style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
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
                    <section style={{ display: 'grid', gap: 24, gridTemplateColumns: courseCount === 3 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))' }}>
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

                    <section style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
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
                  <section style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)' }}>
                    <VerdictCard verdict={displayedVerdict} loading={aiCompatibilityLoading} />

                    <div style={{ display: 'grid', gap: 24 }}>
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
              <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="pl-card" style={{ padding: 24 }}>
                  <p className="pl-eyebrow">Leitura integral</p>
                  <h3 style={{ marginTop: 8, fontSize: 18, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--pl-ink)' }}>Conteúdo declarado nos editais</h3>
                  <p style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
                    Compare etapas, resumo do catálogo e grade (disciplinas + tópicos) antes de gerar o parecer. Use{' '}
                    <span style={{ fontWeight: 700, color: 'var(--pl-ink)' }}>Gerar análise</span> no topo para ver estatísticas e veredito.
                  </p>
                </div>
                <EditalSideBySide
                  baseContest={selectedBase}
                  targetContest={selectedTargetOne}
                  subjectCatalog={subjectCatalog}
                />
              </section>
            ) : (
              <section style={{ borderRadius: 24, border: '1px dashed var(--pl-rule-strong)', background: 'var(--pl-surface)', padding: 32, textAlign: 'center', boxShadow: '0 20px 50px -30px rgba(15,23,42,0.2)' }}>
                <div style={{ margin: '0 auto', display: 'flex', width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 20, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' }}>
                  <Wand2 size={24} />
                </div>
                <p className="pl-eyebrow" style={{ marginTop: 20 }}>Painel interativo</p>
                <h3 style={{ marginTop: 8, fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--pl-ink)' }}>Agora a lateral troca o conteúdo de verdade.</h3>
                <p style={{ margin: '12px auto 0', maxWidth: '42rem', fontSize: 13, fontWeight: 500, lineHeight: 1.7, color: 'var(--pl-ink-2)' }}>
                  Use <span style={{ fontWeight: 700, color: 'var(--pl-ink)' }}>Gerar análise</span> no cabeçalho. Depois, as abas Visão geral, Comparação, Conteúdo, Disciplinas e Parecer mostram o detalhe.
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
    const accentColor = tone === 'blue' ? 'var(--pl-accent-soft)' : '#eef2ff';
    const rows = disciplineRows(contest);

    return (
      <div className="pl-card" style={{ display: 'flex', minWidth: 0, flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        <div style={{ borderBottom: '1px solid var(--pl-rule)', background: accentColor, padding: '16px 20px' }}>
          <p className="pl-eyebrow">{tone === 'blue' ? 'Edital base' : 'Edital comparado'}</p>
          <h4 style={{ marginTop: 4, fontSize: 16, fontWeight: 600, lineHeight: 1.3, color: 'var(--pl-ink)' }}>{contest?.nome || '—'}</h4>
          <p style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
            {[contest?.banca, contest?.escolaridade].filter(Boolean).join(' · ') || 'Metadados limitados no catálogo'}
          </p>
          {contest?.description ? (
            <p style={{ marginTop: 12, fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{String(contest.description)}</p>
          ) : contest?.content ? (
            <p style={{ marginTop: 12, fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{String(contest.content)}</p>
          ) : null}
        </div>

        <div style={{ borderBottom: '1px solid var(--pl-rule)', padding: '16px 20px' }}>
          <p className="pl-eyebrow">Etapas / exigências</p>
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stages(contest).map((tag) => (
              <span
                key={`${contest?.id}-${tag}`}
                className="pl-tag"
              >
                {formatStageLabel(tag)}
              </span>
            ))}
          </div>
        </div>

        <div style={{ minHeight: 0, flex: 1, overflowY: 'auto', padding: '12px 8px', maxHeight: 'min(52vh, 28rem)' }}>
          <p className="pl-eyebrow" style={{ padding: '0 12px 8px' }}>Disciplinas e tópicos</p>
          {rows.length === 0 ? (
            <div style={{ margin: '0 12px', borderRadius: 12, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '24px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
              Este edital ainda não tem disciplinas estruturadas no catálogo. Abra o detalhe do concurso para importar o programa.
            </div>
          ) : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px 16px' }}>
              {rows.map((row) => (
                <li
                  key={row.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 10, border: '1px solid var(--pl-rule)', background: 'var(--pl-surface)', padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}
                >
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.nome}</span>
                  <span style={{ flexShrink: 0, borderRadius: 999, background: 'var(--pl-bg-soft)', padding: '2px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--pl-ink-3)' }}>
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
    <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
      {col(baseContest, 'blue')}
      {col(targetContest, 'indigo')}
    </div>
  );
}

function SelectStripField({ micro, icon: Icon, value, onChange, options, excludeIds = [], accent = 'blue', trailing = null }) {
  const barColors = {
    blue: '#2563eb',
    indigo: '#4f46e5',
    pink: '#db2777',
  };
  const barColor = barColors[accent] || barColors.blue;
  const skip = new Set((excludeIds || []).map((id) => String(id)));
  const filtered = options.filter((option) => !skip.has(String(option.id)));
  const selectedOption = filtered.find((option) => option.id === value) || null;
  const selectedImage = selectedOption?.contest?.imagem_url || '';

  return (
    <div style={{ display: 'flex', minHeight: 40, minWidth: 0, flex: 1, alignItems: 'stretch', overflow: 'hidden', borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)' }}>
      <div
        style={{ display: 'flex', width: 52, flexShrink: 0, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, borderRight: '1px solid rgba(148,163,184,0.3)', padding: '4px 2px', background: barColor }}
      >
        <Icon size={15} strokeWidth={2.2} style={{ color: '#fff' }} />
        <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px', textAlign: 'center', fontSize: 7, fontWeight: 700, textTransform: 'uppercase', lineHeight: 1, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.9)' }}>
          {micro}
        </span>
      </div>
      <div style={{ display: 'flex', minWidth: 0, flex: 1, alignItems: 'center', background: 'var(--pl-bg-soft)' }}>
        <div style={{ marginLeft: 8, display: 'flex', height: 36, width: 48, flexShrink: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 6, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)' }}>
          {selectedImage ? (
            <img src={selectedImage} alt={selectedOption?.contest?.nome || selectedOption?.label || micro} style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
          ) : (
            <Icon size={16} style={{ color: 'var(--pl-ink-4)' }} />
          )}
        </div>
        <select
          value={filtered.some((o) => o.id === value) ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          style={{ minHeight: 40, width: '100%', minWidth: 0, cursor: 'pointer', border: 'none', background: 'transparent', padding: '6px 8px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', outline: 'none' }}
        >
          {filtered.length === 0 ? <option value="">—</option> : null}
          {filtered.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {trailing ? <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', borderLeft: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '0 2px' }}>{trailing}</div> : null}
    </div>
  );
}

function StripQuickContestLinks({ label, contest, onOpenContestDetail, onSetTargetContest }) {
  if (!contest) return null;
  return (
    <span style={{ display: 'inline-flex', minWidth: 0, maxWidth: '100%', flexWrap: 'wrap', alignItems: 'center', gap: '4px 8px' }}>
      <span style={{ flexShrink: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 9, color: 'var(--pl-ink-3)' }}>{label}</span>
      <span style={{ maxWidth: '11rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--pl-ink)' }}>{contest.nome}</span>
      <button
        type="button"
        onClick={() => onOpenContestDetail?.(contest.id)}
        style={{ flexShrink: 0, fontWeight: 600, color: 'var(--pl-accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
      >
        Ver
      </button>
      <button
        type="button"
        onClick={() => onSetTargetContest?.(contest.id)}
        style={{ flexShrink: 0, fontWeight: 600, color: 'var(--pl-accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
      >
        Foco
      </button>
    </span>
  );
}

function InfoCard({ icon: Icon, eyebrow, title, text, tone = 'blue', tall = false }) {
  const toneStyles = {
    blue: { border: '#bfdbfe', background: 'var(--pl-accent-soft)', color: '#1e3a5f' },
    indigo: { border: '#c7d2fe', background: 'linear-gradient(135deg,#eef2ff 0%,#f8faff 100%)', color: '#312e81' },
    amber: { border: '#fde68a', background: 'linear-gradient(135deg,#fff7ed 0%,#fffbeb 100%)', color: '#78350f' },
    gold: { border: '#fcd34d', background: 'linear-gradient(135deg,#fff8db 0%,#fffdf3 100%)', color: '#78350f' },
    slate: { border: 'var(--pl-rule-2)', background: 'var(--pl-surface)', color: 'var(--pl-ink)' },
  };
  const ts = toneStyles[tone] || toneStyles.blue;

  return (
    <div
      style={{
        borderRadius: 24,
        border: `1px solid ${ts.border}`,
        padding: 20,
        background: ts.background,
        color: ts.color,
        boxShadow: '0 18px 45px -28px rgba(15,23,42,0.18)',
        minHeight: tall ? 220 : undefined,
      }}
    >
      <div style={{ display: 'flex', height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-low)' }}>
        <Icon size={18} />
      </div>
      <p style={{ marginTop: 16, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.24em', opacity: 0.6 }}>{eyebrow}</p>
      <h3 style={{ marginTop: 8, fontSize: 18, fontWeight: 600, letterSpacing: '-0.03em' }}>{title}</h3>
      <p style={{ marginTop: 12, fontSize: 13, fontWeight: 500, lineHeight: 1.6, opacity: 0.75 }}>{text}</p>
    </div>
  );
}

function StatusBadge({ tone = 'neutral', text }) {
  const toneMap = {
    positive: { border: 'var(--pl-success)', background: 'var(--pl-success-soft)', color: 'var(--pl-success)' },
    neutral: { border: 'var(--pl-rule-2)', background: 'var(--pl-surface)', color: 'var(--pl-ink-2)' },
    alert: { border: 'var(--pl-danger)', background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)' },
  };
  const ts = toneMap[tone] || toneMap.neutral;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, border: `1px solid ${ts.border}`, padding: '8px 14px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', background: ts.background, color: ts.color }}>
      {text}
    </span>
  );
}

function CompatibilityGauge({ value }) {
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * value) / 100;

  return (
    <div style={{ margin: '0 auto', display: 'flex', width: '100%', maxWidth: 290, flexDirection: 'column', alignItems: 'center', borderRadius: 32, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.1)', padding: 24, textAlign: 'center', boxShadow: 'var(--pl-sh-high)', backdropFilter: 'blur(8px)' }}>
      <div style={{ position: 'relative', display: 'flex', height: 190, width: 190, alignItems: 'center', justifyContent: 'center' }}>
        <svg style={{ height: '100%', width: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
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
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.24em', color: '#94a3b8' }}>Compatibilidade</p>
          <p style={{ marginTop: 8, fontSize: 48, fontWeight: 600, letterSpacing: '-0.05em', color: '#fff' }}>{value}%</p>
        </div>
      </div>

      <p style={{ marginTop: 8, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.24em', color: '#6ee7b7' }}>Núcleo comum aproveitável</p>
    </div>
  );
}

function DarkMetric({ label, value, helper, compact = false }) {
  return (
    <div style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', padding: 16, backdropFilter: 'blur(8px)' }}>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#94a3b8' }}>{label}</p>
      <p style={{ marginTop: 8, fontWeight: 600, letterSpacing: '-0.04em', color: '#fff', fontSize: compact ? 18 : 28 }}>{value}</p>
      <p style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{helper}</p>
    </div>
  );
}

function AnalysisCard({ theme, icon: Icon, title, subtitle, items, topBar = false, muted = false }) {
  const themeMap = {
    blue: {
      wrapperBorder: '#bfdbfe',
      headerBg: 'var(--pl-accent-soft)',
      iconBg: '#2563eb',
      iconColor: '#fff',
      dotColor: '#3b82f6',
      barColor: '#3b82f6',
      badgeBg: '#eff6ff',
      badgeColor: '#1d4ed8',
      badgeBorder: '#bfdbfe',
      itemBorder: 'var(--pl-rule)',
    },
    amber: {
      wrapperBorder: '#fde68a',
      headerBg: 'linear-gradient(135deg,#fff7ed 0%,#fffaf0 100%)',
      iconBg: '#f59e0b',
      iconColor: '#fff',
      dotColor: '#f59e0b',
      barColor: '#f59e0b',
      badgeBg: '#fffbeb',
      badgeColor: '#92400e',
      badgeBorder: '#fde68a',
      itemBorder: '#fde68a',
    },
    indigo: {
      wrapperBorder: '#c7d2fe',
      headerBg: 'linear-gradient(135deg,#eef2ff 0%,#f8faff 100%)',
      iconBg: '#4f46e5',
      iconColor: '#fff',
      dotColor: '#6366f1',
      barColor: '#6366f1',
      badgeBg: '#eef2ff',
      badgeColor: '#3730a3',
      badgeBorder: '#c7d2fe',
      itemBorder: '#c7d2fe',
    },
    slate: {
      wrapperBorder: 'var(--pl-rule-2)',
      headerBg: 'var(--pl-surface)',
      iconBg: '#e2e8f0',
      iconColor: '#475569',
      dotColor: '#94a3b8',
      barColor: '#cbd5e1',
      badgeBg: '#f1f5f9',
      badgeColor: '#475569',
      badgeBorder: 'var(--pl-rule-2)',
      itemBorder: 'var(--pl-rule)',
    },
  };

  const c = themeMap[theme] || themeMap.slate;

  return (
    <div style={{ overflow: 'hidden', borderRadius: 28, border: `1px solid ${c.wrapperBorder}`, background: 'var(--pl-surface)', boxShadow: '0 18px 45px -25px rgba(15,23,42,0.16)' }}>
      <div style={{ borderBottom: `1px solid ${c.wrapperBorder}`, padding: '20px 24px', background: c.headerBg }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', height: 48, width: 48, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: c.iconBg, color: c.iconColor, boxShadow: 'var(--pl-sh-low)' }}>
            <Icon size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="pl-eyebrow">Bloco analítico</p>
            <h3 style={{ marginTop: 4, fontSize: 18, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--pl-ink)' }}>{title}</h3>
            <p style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{subtitle}</p>
          </div>
        </div>
        {topBar && <div style={{ marginTop: 16, height: 6, width: 80, borderRadius: 999, background: c.barColor }} />}
      </div>

      <div style={{ padding: 24 }}>
        {items.length === 0 ? (
          <div style={{ borderRadius: 12, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '20px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
            Nada crítico detectado aqui.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item, index) => {
              const text = typeof item === 'string' ? item : item?.text;
              const badge = typeof item === 'string' ? '' : item?.badge || '';

              return (
                <div
                  key={`${title}-${index}-${String(text).slice(0, 48)}`}
                  style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 12, border: `1px solid ${c.itemBorder}`, background: 'var(--pl-surface)', padding: '16px', opacity: muted ? 0.85 : 1 }}
                >
                  <div style={{ display: 'flex', minWidth: 0, alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ marginTop: 4, height: 10, width: 10, flexShrink: 0, borderRadius: '50%', background: c.dotColor }} />
                    <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.6, color: 'var(--pl-ink)' }}>{text}</span>
                  </div>
                  {badge && (
                    <span style={{ display: 'inline-flex', width: 'fit-content', flexShrink: 0, borderRadius: 999, border: `1px solid ${c.badgeBorder}`, padding: '6px 12px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', background: c.badgeBg, color: c.badgeColor }}>
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
  const toneMap = {
    emerald: {
      border: '#a7f3d0',
      background: 'var(--pl-success-soft)',
      pillBg: '#d1fae5',
      pillColor: '#065f46',
      pillBorder: '#a7f3d0',
      accentColor: '#10b981',
    },
    amber: {
      border: '#fde68a',
      background: 'linear-gradient(180deg,#fffbeb 0%,#ffffff 100%)',
      pillBg: '#fef9c3',
      pillColor: '#92400e',
      pillBorder: '#fde68a',
      accentColor: '#f59e0b',
    },
    rose: {
      border: '#fecdd3',
      background: 'linear-gradient(180deg,#fff1f2 0%,#ffffff 100%)',
      pillBg: '#ffe4e6',
      pillColor: '#9f1239',
      pillBorder: '#fecdd3',
      accentColor: '#f43f5e',
    },
  };

  const ts = toneMap[verdict.tone] || toneMap.amber;

  return (
    <div style={{ borderRadius: 28, border: `1px solid ${ts.border}`, padding: 24, background: ts.background, boxShadow: '0 18px 45px -25px rgba(15,23,42,0.16)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <span style={{ display: 'inline-flex', borderRadius: 999, border: `1px solid ${ts.pillBorder}`, padding: '8px 14px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', background: ts.pillBg, color: ts.pillColor }}>
            {loading ? 'IA analisando' : verdict.sourceLabel || 'Parecer final'}
          </span>
          <h3 style={{ marginTop: 16, fontSize: 28, fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--pl-ink)' }}>{verdict.title}</h3>
        </div>
        <span style={{ marginTop: 8, height: 12, width: 64, borderRadius: 999, background: ts.accentColor, flexShrink: 0 }} />
      </div>

      <p style={{ marginTop: 16, fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{verdict.text}</p>

      <div style={{ marginTop: 20, borderRadius: 20, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 20, boxShadow: 'var(--pl-sh-low)' }}>
        <p className="pl-eyebrow">Recomendação prática</p>
        <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, lineHeight: 1.6, color: 'var(--pl-ink)' }}>{verdict.recommendation}</p>
      </div>

      {(verdict.aiAdvantages?.length || verdict.aiRisks?.length) ? (
        <div style={{ marginTop: 16, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
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
    <div style={{ borderRadius: 18, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 16 }}>
      <p className="pl-eyebrow">{title}</p>
      <ul style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink)' }}>
        {list.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonTable({ baseContest, targetOneContest, targetTwoContest, rows }) {
  return (
    <div style={{ overflow: 'hidden', borderRadius: 28, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: '0 18px 45px -25px rgba(15,23,42,0.16)' }}>
      <div style={{ borderBottom: '1px solid var(--pl-rule)', padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p className="pl-eyebrow">Leitura comparativa</p>
            <h3 style={{ marginTop: 8, fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--pl-ink)' }}>Tabela executiva</h3>
            <p style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
              Um resumo limpo para confrontar carreira, salário, estrutura e peso do edital sem sair da área.
            </p>
          </div>
          <StatusBadge tone="neutral" text="Resumo premium" />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--pl-bg-soft)' }}>
              <TableHead>Item</TableHead>
              <TableHead>{baseContest?.nome || 'Base'}</TableHead>
              <TableHead>{targetOneContest?.nome || 'Alvo 1'}</TableHead>
              {targetTwoContest ? <TableHead>{targetTwoContest?.nome || 'Alvo 2'}</TableHead> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} style={{ verticalAlign: 'top' }}>
                <td style={{ borderBottom: '1px solid var(--pl-rule)', padding: '16px 20px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{row.label}</td>
                <td style={{ borderBottom: '1px solid var(--pl-rule)', padding: '16px 20px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{formatCompareCell(row.base)}</td>
                <td style={{ borderBottom: '1px solid var(--pl-rule)', padding: '16px 20px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{formatCompareCell(row.targetOne)}</td>
                {targetTwoContest ? (
                  <td style={{ borderBottom: '1px solid var(--pl-rule)', padding: '16px 20px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{formatCompareCell(row.targetTwo)}</td>
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
    <th style={{ borderBottom: '1px solid var(--pl-rule-2)', padding: '12px 20px', textAlign: 'left', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--pl-ink-3)' }}>
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

