import React, { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  clearInvalidSupabaseAuthStorage,
  isSupabaseDevProxyEnabled,
  supabase,
  supabaseAnonKey,
  supabaseBaseUrl,
  supabaseDirectUrl,
} from './lib/supabase';
import { Target } from 'lucide-react';

import AppOverlays from './components/AppOverlays';
import OnboardingWizard from './components/OnboardingWizard';
import AppTabContent from './components/AppTabContent';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { ToastProvider } from './lib/toast';
import { showConfirm, showToast } from './lib/dialogs';
import CheckoutResultBanner from './components/CheckoutResultBanner';
import { useSubscription } from './lib/subscriptionApi';
import { concursoCatalog as localConcursoCatalog } from './data/concursoCatalog';
import { subjectCatalog as localSubjectCatalog } from './data/subjectCatalog';
import { loadContestCatalogFromSupabase, loadContestDraftsFromSupabase, loadContestTemplateContent } from './lib/contestCatalogApi';
import { findGroupedContestById, normalizeContestStatus } from './lib/contestGrouping';
import { uploadContestAssetAdmin } from './lib/adminContestAssetsApi';
import { compressImage } from './lib/imageCompress';
import { saveContestTemplateAdmin } from './lib/adminContestTemplatesApi';
import { loadSubjectCatalogFromSupabase, normalizeSubjectCatalogEntry } from './lib/subjectCatalogApi';
import { normalizeExpense } from './lib/adminFinance';
import { normalizeLead } from './lib/adminCrm';
import { canonicalizeSubjectName, resolveSubjectCatalogEntry } from './lib/subjectCatalogUtils';
import { buildCanonicalHistory, normalizeStudyRecord } from './lib/studyAnalytics';
import { buildSmartStudyPlan, mergeDisciplinesByCanonical } from './lib/studyRecommendation';
import { buildDefaultWeeklyAvailability } from './lib/weeklyPlanner';
import {
  AUDIOBOOKS_STORAGE_KEY,
  buildAudiobookSummary,
  mergeAudiobookCatalogFromRemote,
  normalizeAudiobookState,
} from './lib/audiobooks';

import { LAUNCH_MVP_MODE, LAUNCH_HIDDEN_TABS } from './lib/launchConfig';
import { loadAudiobookProgress, saveAudiobookProgress } from './lib/audiobookProgressApi';
import {
  buildBadgeSummary,
  buildDefaultBadgeConfig,
  buildDefaultXpConfig,
  buildLevelSummary,
  buildProfileMetrics,
  formatCpf,
  isValidCpf,
  normalizeCpf,
} from './lib/profileProgress';
import {
  WELLNESS_LIBRARY_STORAGE_KEY,
  normalizeWellnessLibrary,
  resolveWellnessMediaUrl,
} from './lib/wellnessLibrary';
import {
  buildDefaultReferralCode,
  extractReferralCodeFromLocation,
  getStoredReferralCode,
  normalizeReferralCode,
  persistPendingReferralCode,
} from './lib/referrals';
import {
  buildCommunityProfileMetrics,
  buildCommunityRankings,
  createCommunityComment,
  createCommunityPost,
  createLocalCommunityComment,
  createLocalCommunityPost,
  getDefaultCommunityState,
  incrementCommunityPostView,
  incrementLocalCommunityView,
  loadCommunityFromSupabase,
  normalizeCommunityState,
  probeCommunityConnectivity,
  runCommunitySmokeTest,
  setCommunityReaction,
  toggleLocalCommunityReaction,
} from './lib/communityApi';
import { coerceSquadForState, fetchSquadRowByInviteCode, shapeSquadFromCommunityPost } from './lib/squadRemote';
import {
  buildRedacaoSummary,
  deleteRedacaoFromSupabase,
  deleteRedacaoRecord,
  loadLocalRedacoes,
  loadRedacoesFromSupabase,
  normalizeRedacaoRecord,
  saveLocalRedacoes,
  saveRedacaoToSupabase,
  upsertRedacaoRecord,
  uploadRedacaoAttachment,
} from './lib/redacoesApi';
import {
  DEFAULT_REDACAO_EXPERT_TIPS,
  fetchRedacaoExpertTipsFromSupabase,
  normalizeRedacaoExpertTip,
  syncRedacaoExpertTipsToSupabase,
} from './lib/redacaoExpertTipsApi';
import {
  fetchRedacaoSiteContent,
  upsertRedacaoSiteContent,
  upsertSidebarLabels,
  upsertNotificationSettings,
  upsertCourseTemplates,
} from './lib/redacaoSiteContentApi';
import { normalizeNotificationSettings } from './lib/notificationSettings';
import { normalizeCourseTemplates } from './lib/courseTemplates';
import { REDACAO_THEME_BANK_DEFAULT } from './data/redacaoThemeBankDefault';
import { mergeRedacaoKitBundle, sanitizeRedacaoKitForSave } from './lib/redacaoKitMerge';
import { saveStudySession, loadStudySessions, syncLocalToSupabase } from './lib/studySessionsApi';
import { loadUserContests, addUserContest, setTargetContest, removeUserContest as _removeUserContest } from './lib/userContestsApi';
import { loadSimulados, saveSimulado, fetchSimuladoStats } from './lib/simuladosApi';
import { loadProfile, updateProfile, uploadAvatar, loadAllProfiles } from './lib/profileApi';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Estatisticas = lazy(() => import('./pages/Estatisticas'));
const Planejamento = lazy(() => import('./pages/Planejamento'));
const Assinatura = lazy(() => import('./pages/Assinatura'));
const BemEstar = lazy(() => import('./pages/BemEstar'));
const ConvideGanhe = lazy(() => import('./pages/ConvideGanhe'));
const Perfil = lazy(() => import('./pages/Perfil'));
const Comunidades = lazy(() => import('./pages/Comunidades'));
const Conciliador = lazy(() => import('./pages/Conciliador'));
const Redacoes = lazy(() => import('./pages/Redacoes'));
const Audiobooks = lazy(() => import('./pages/Audiobooks'));
const MapasMentais = lazy(() => import('./pages/MapasMentais'));
const Legislacao = lazy(() => import('./pages/Legislacao'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const Simulados = lazy(() => import('./pages/Simulados'));
const Edital = lazy(() => import('./pages/Edital'));
const Disciplinas = lazy(() => import('./pages/Disciplinas'));
const DisciplinaDetalhe = lazy(() => import('./pages/DisciplinaDetalhe'));
const Questoes = lazy(() => import('./pages/Questoes'));
const Planos = lazy(() => import('./pages/Planos'));
const ConcursosDisponiveis = lazy(() => import('./pages/ConcursosDisponiveis'));
const Objetivos = lazy(() => import('./pages/Objetivos'));
const ConcursoDetalhe = lazy(() => import('./pages/ConcursoDetalhe'));
const LembretesCalendario = lazy(() => import('./pages/LembretesCalendario'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminConcursos = lazy(() => import('./pages/AdminConcursos'));
const AdminDisciplinasPadrao = lazy(() => import('./pages/AdminDisciplinasPadrao'));
const AdminUsuarios = lazy(() => import('./pages/AdminUsuarios'));
const AdminFinance = lazy(() => import('./pages/AdminFinance'));
const AdminCRM = lazy(() => import('./pages/AdminCRM'));
const AdminConfiguracoes = lazy(() => import('./pages/AdminConfiguracoes'));
const AdminAudiolivros = lazy(() => import('./pages/AdminAudiolivros'));
const AdminMindMapsGallery = lazy(() => import('./pages/AdminMindMapsGallery'));
const Sessoes = lazy(() => import('./pages/Sessoes'));
const Revisoes = lazy(() => import('./pages/Revisoes'));
const EditalQuestao = lazy(() => import('./pages/EditalQuestao'));
const Historico = lazy(() => import('./pages/Historico'));
const Login = lazy(() => import('./pages/Login'));
const Termos = lazy(() => import('./pages/Termos'));
const Privacidade = lazy(() => import('./pages/Privacidade'));

function buildDistinctPastelCycleColor(index, total = 1) {
  const safeTotal = Math.max(1, Number(total || 1));
  const hue = Math.round(((index * 137.508) + 12) % 360);
  const saturation = Math.max(48, 60 - ((index + safeTotal) % 3) * 4);
  const lightness = Math.min(88, 83 + (index % 2) * 2);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function resolveCycleSelectionIds(input) {
  if (Array.isArray(input)) {
    return input.map((item) => String(item)).filter(Boolean);
  }

  if (input && typeof input === 'object') {
    if (Array.isArray(input.sourceIds) && input.sourceIds.length > 0) {
      return input.sourceIds.map((item) => String(item)).filter(Boolean);
    }

    if (input.id !== undefined && input.id !== null) {
      return [String(input.id)];
    }
  }

  if (input === undefined || input === null || input === '') {
    return [];
  }

  return [String(input)];
}

function resolveCycleWeightKey(input) {
  if (input && typeof input === 'object') {
    return String(input.canonicalName || input.nome || input.id || '');
  }

  return String(input || '');
}

function getAuthUserDisplayName(user) {
  const metadata = user?.user_metadata || {};
  const joinedGoogleName = [metadata.given_name, metadata.family_name].filter(Boolean).join(' ').trim();
  return String(
    metadata.nome ||
      metadata.name ||
      metadata.full_name ||
      joinedGoogleName ||
      user?.email?.split('@')[0] ||
      ''
  ).trim();
}

function getAuthUserAvatarUrl(user) {
  const metadata = user?.user_metadata || {};
  return String(metadata.avatar_url || metadata.picture || '').trim();
}

function stripOAuthErrorFromLocation() {
  if (typeof window === 'undefined') return;

  try {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
    const hasOAuthError =
      url.searchParams.has('error') ||
      url.searchParams.has('error_description') ||
      hashParams.has('error') ||
      hashParams.has('error_description');

    if (!hasOAuthError) return;

    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    url.searchParams.delete('sb');
    hashParams.delete('error');
    hashParams.delete('error_description');
    hashParams.delete('sb');

    const nextHash = hashParams.toString();
    window.history.replaceState({}, '', `${url.pathname}${url.search}${nextHash ? `#${nextHash}` : ''}`);
  } catch (error) {
    console.warn('Nao foi possivel limpar parametros OAuth da URL.', error);
  }
}

function EditorialTopStrip({ activeTab, setActiveTab, darkMode = false }) {
  const tabs = [
    { id: 'home', label: 'Dashboard' },
    { id: 'questoes', label: 'Questões' },
    { id: 'sessoes', label: 'Resolver questão' },
    { id: 'planejamento', label: 'Plano' },
  ];

  const activeId = activeTab === 'home'
    ? 'home'
    : activeTab === 'questoes'
      ? 'questoes'
      : activeTab === 'planejamento'
        ? 'planejamento'
        : activeTab === 'sessoes'
          ? 'sessoes'
          : '';

  const stripTheme = darkMode
    ? {
        background: '#0f0c08',
        border: 'rgba(243, 239, 229, 0.14)',
        active: '#f3efe5',
        muted: 'rgba(243, 239, 229, 0.62)',
        faint: 'rgba(243, 239, 229, 0.40)',
      }
    : {
        background: '#efe8d8',
        border: 'rgba(20, 17, 13, 0.14)',
        active: '#14110d',
        muted: 'rgba(20, 17, 13, 0.58)',
        faint: 'rgba(20, 17, 13, 0.36)',
      };

  return (
    <div
      className="fixed inset-x-0 top-0 z-[70] flex h-11 items-center border-b"
      style={{
        background: stripTheme.background,
        borderColor: stripTheme.border,
        color: stripTheme.active,
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setActiveTab('home')}
        className="flex h-full w-14 items-center justify-center border-r md:w-[88px]"
        style={{ borderColor: stripTheme.border, color: stripTheme.active }}
        aria-label="Papirando"
      >
        <span style={{ fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontSize: 18, lineHeight: 1 }}>P</span>
      </button>
      <nav className="hidden h-full min-w-0 flex-1 items-center md:flex">
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="relative flex h-full items-center px-6 text-sm font-semibold transition"
              style={{
                color: isActive ? stripTheme.active : stripTheme.muted,
              }}
            >
              {tab.label}
              {isActive ? (
                <span
                  className="absolute inset-x-5 bottom-0 h-px"
                  style={{ background: stripTheme.active }}
                />
              ) : null}
            </button>
          );
        })}
      </nav>
      <div className="hidden shrink-0 items-center gap-2 px-5 text-[11px] font-semibold md:flex" style={{ color: stripTheme.muted }}>
        <span style={{ color: stripTheme.faint }}>✣</span>
        Aplicação editorial · 16 mai 2026
      </div>
    </div>
  );
}

function parseCycleDurationLabel(label, fallback = 90) {
  const text = String(label || '').toLowerCase();
  const hourMatch = text.match(/(\d+)\s*h/);
  const minuteMatch = text.match(/(\d+)\s*m/);
  const total = (hourMatch ? Number(hourMatch[1]) * 60 : 0) + (minuteMatch ? Number(minuteMatch[1]) : 0);
  return total > 0 ? total : fallback;
}

function roundCycleMinutes(minutes) {
  return Math.max(15, Math.round(Number(minutes || 0) / 15) * 15);
}

function _splitCycleMinutes(totalMinutes, minMinutes, maxMinutes) {
  const total = roundCycleMinutes(totalMinutes);
  if (total <= 0) return [];

  const preferredBlock = Math.max(minMinutes, Math.min(maxMinutes, 60));
  let blockCount = Math.max(1, Math.round(total / preferredBlock));
  blockCount = Math.min(blockCount, Math.max(1, Math.floor(total / minMinutes)));
  blockCount = Math.max(blockCount, Math.ceil(total / maxMinutes));

  const base = roundCycleMinutes(total / blockCount);
  const safeBase = Math.max(minMinutes, Math.min(maxMinutes, base));
  const blocks = Array.from({ length: blockCount }, () => safeBase);
  let allocated = blocks.reduce((acc, value) => acc + value, 0);
  let guard = 0;

  while (allocated !== total && guard < 200) {
    guard += 1;

    if (allocated < total) {
      const index = blocks.findIndex((value) => value + 15 <= maxMinutes);
      if (index === -1) break;
      blocks[index] += 15;
      allocated += 15;
      continue;
    }

    const index = blocks.findIndex((value) => value - 15 >= minMinutes);
    if (index === -1) break;
    blocks[index] -= 15;
    allocated -= 15;
  }

  return blocks;
}

function distributeCycleBlockCounts(weightedDisciplines, totalBlockCount, minimumBlocksPerDiscipline = 2) {
  const baseCount = Math.max(1, Number(minimumBlocksPerDiscipline || 1));
  const safeTotalBlocks = Math.max(weightedDisciplines.length * baseCount, Number(totalBlockCount || 0));
  const totalScore = weightedDisciplines.reduce((acc, item) => acc + Number(item.score || 0), 0) || 1;
  const extraBlocks = Math.max(0, safeTotalBlocks - weightedDisciplines.length * baseCount);

  const distribution = weightedDisciplines.map((item, index) => {
    const exactExtra = extraBlocks > 0 ? (extraBlocks * Number(item.score || 0)) / totalScore : 0;
    const extraBase = Math.floor(exactExtra);
    return {
      ...item,
      originalIndex: index,
      blockCount: baseCount + extraBase,
      remainder: exactExtra - extraBase,
    };
  });

  let assigned = distribution.reduce((acc, item) => acc + item.blockCount, 0);
  let remaining = safeTotalBlocks - assigned;

  while (remaining > 0) {
    distribution
      .slice()
      .sort((first, second) => {
        if (second.remainder !== first.remainder) return second.remainder - first.remainder;
        if (second.score !== first.score) return second.score - first.score;
        return first.originalIndex - second.originalIndex;
      })
      .slice(0, remaining)
      .forEach((item) => {
        const target = distribution.find((entry) => entry.weightKey === item.weightKey);
        if (target) target.blockCount += 1;
      });

    assigned = distribution.reduce((acc, item) => acc + item.blockCount, 0);
    remaining = safeTotalBlocks - assigned;
  }

  return distribution;
}

// Allowlist explícito do dono — rede de segurança caso o profile falhe ao carregar
// (sem isso, um erro transitório no fetch do profile derrubaria o acesso admin).
// NÃO é mais usado o curinga de domínio @papirando.com: admin agora é por role.
const ADMIN_EMAILS = ['contato@papirando.com', 'lucaslimasacramento@gmail.com'];

function isAdminIdentity(profile, sessionEmail = '') {
  const role = String(profile?.role || '').trim().toLowerCase();
  const profileEmail = String(profile?.email || '').trim().toLowerCase();
  const email = profileEmail || String(sessionEmail || '').trim().toLowerCase();

  return ['admin', 'admin_master', 'master'].includes(role) || ADMIN_EMAILS.includes(email);
}

function buildCycleSequence(weightedDisciplines) {
  const queue = weightedDisciplines.map((item) => ({
    ...item,
    remainingBlocks: Number(item.blockCount || 0),
  }));
  const sequence = [];
  let lastKey = '';
  let guard = 0;

  while (queue.some((item) => item.remainingBlocks > 0) && guard < 2000) {
    guard += 1;
    const candidates = queue
      .filter((item) => item.remainingBlocks > 0)
      .sort((first, second) => {
        if (second.remainingBlocks !== first.remainingBlocks) return second.remainingBlocks - first.remainingBlocks;
        if (second.score !== first.score) return second.score - first.score;
        return String(first.weightKey).localeCompare(String(second.weightKey));
      });

    const next = candidates.find((item) => item.weightKey !== lastKey) || candidates[0];
    if (!next) break;

    sequence.push(next.weightKey);

    const target = queue.find((item) => item.weightKey === next.weightKey);
    if (target) target.remainingBlocks -= 1;
    lastKey = next.weightKey;
  }

  return sequence;
}

function buildCycleFromWizardSelection({ wizardData, disciplines }) {
  const availableDisciplines = Array.isArray(disciplines) ? disciplines.filter(Boolean) : [];
  if (availableDisciplines.length === 0) return [];

  const selectedIds = new Set(
    (Array.isArray(wizardData?.materias) ? wizardData.materias : []).map((item) => String(item))
  );

  const cycleDisciplines = availableDisciplines.filter((discipline) => {
    const sourceIds =
      Array.isArray(discipline?.sourceIds) && discipline.sourceIds.length > 0
        ? discipline.sourceIds.map((item) => String(item))
        : discipline?.id
          ? [String(discipline.id)]
          : [];

    if (selectedIds.size === 0) return true;
    return sourceIds.some((id) => selectedIds.has(id));
  });

  const disciplinesToUse = cycleDisciplines.length > 0 ? cycleDisciplines : availableDisciplines;
  const totalMinutes = Math.max(roundCycleMinutes(Number(wizardData?.horasSemana || 18) * 60), 60);
  const requestedMin = Math.max(30, roundCycleMinutes(parseCycleDurationLabel(wizardData?.minSessao, 60)));
  const requestedMax = Math.max(requestedMin, roundCycleMinutes(parseCycleDurationLabel(wizardData?.maxSessao, 120)));
  const minimumBlocksPerDiscipline = 2;
  const minimumBlockSize = totalMinutes >= disciplinesToUse.length * minimumBlocksPerDiscipline * 30 ? 30 : 15;
  const fittedBaseBlock = Math.floor(totalMinutes / Math.max(disciplinesToUse.length * minimumBlocksPerDiscipline, 1) / 15) * 15;
  const baseBlockMinutes = Math.max(minimumBlockSize, Math.min(requestedMin, fittedBaseBlock || minimumBlockSize));
  const minMinutes = Math.max(15, Math.min(baseBlockMinutes, requestedMin));
  const maxMinutes = Math.max(minMinutes, requestedMax);

  const weightedDisciplines = disciplinesToUse.map((discipline, index) => {
    const weightKey = resolveCycleWeightKey(discipline);
    const storedWeight = wizardData?.pesos?.[weightKey] || { imp: 5, con: 3 };
    const importance = Math.max(1, Number(storedWeight.imp || 5));
    const knowledge = Math.max(1, Math.min(5, Number(storedWeight.con || 3)));
    const score = Math.max(1, importance * (6 - knowledge));

    return {
      discipline,
      weightKey,
      score,
      color: buildDistinctPastelCycleColor(index, disciplinesToUse.length),
    };
  });

  const minimumRequiredBlocks = weightedDisciplines.length * minimumBlocksPerDiscipline;
  const suggestedBlockCount = baseBlockMinutes > 0 ? Math.floor(totalMinutes / baseBlockMinutes) : minimumRequiredBlocks;
  const totalBlockCount = Math.max(minimumRequiredBlocks, baseBlockMinutes < 30 ? minimumRequiredBlocks : suggestedBlockCount);

  const countedDisciplines = distributeCycleBlockCounts(
    weightedDisciplines,
    totalBlockCount,
    minimumBlocksPerDiscipline
  );

  const blockMinutesByKey = Object.fromEntries(
    countedDisciplines.map((item) => [
      item.weightKey,
      Array.from({ length: item.blockCount }, () => baseBlockMinutes),
    ])
  );

  let allocatedMinutes = countedDisciplines.reduce(
    (acc, item) => acc + item.blockCount * baseBlockMinutes,
    0
  );
  let remainingMinutes = totalMinutes - allocatedMinutes;

  const expandableSlots = countedDisciplines
    .flatMap((item) =>
      Array.from({ length: item.blockCount }, (_, blockIndex) => ({
        weightKey: item.weightKey,
        score: item.score,
        blockIndex,
      }))
    )
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score;
      return first.blockIndex - second.blockIndex;
    });

  let expansionGuard = 0;
  while (remainingMinutes >= 15 && expandableSlots.length > 0 && expansionGuard < 3000) {
    expansionGuard += 1;
    let expanded = false;

    for (const slot of expandableSlots) {
      const targetBlocks = blockMinutesByKey[slot.weightKey];
      if (!targetBlocks) continue;
      if (targetBlocks[slot.blockIndex] + 15 > maxMinutes) continue;
      targetBlocks[slot.blockIndex] += 15;
      remainingMinutes -= 15;
      expanded = true;
      if (remainingMinutes < 15) break;
    }

    if (!expanded) break;
  }

  if (remainingMinutes >= 15) {
    const rankedDisciplines = countedDisciplines
      .slice()
      .sort((first, second) => second.score - first.score);
    let extraGuard = 0;

    while (remainingMinutes >= 15 && rankedDisciplines.length > 0 && extraGuard < 500) {
      extraGuard += 1;
      let appended = false;

      for (const item of rankedDisciplines) {
        const nextBlockMinutes = Math.min(
          maxMinutes,
          Math.max(15, Math.min(baseBlockMinutes || 15, remainingMinutes))
        );
        if (remainingMinutes - nextBlockMinutes < 0) continue;
        blockMinutesByKey[item.weightKey].push(nextBlockMinutes);
        item.blockCount += 1;
        remainingMinutes -= nextBlockMinutes;
        appended = true;
        if (remainingMinutes < 15) break;
      }

      if (!appended) break;
    }
  }

  const cycleSequence = buildCycleSequence(countedDisciplines);
  const blockUsage = Object.fromEntries(countedDisciplines.map((item) => [item.weightKey, 0]));
  const disciplineMap = new Map(countedDisciplines.map((item) => [item.weightKey, item]));

  return cycleSequence.map((weightKey, index) => {
    const item = disciplineMap.get(weightKey);
    const blockIndex = blockUsage[weightKey] || 0;
    blockUsage[weightKey] = blockIndex + 1;
    const minutes = blockMinutesByKey[weightKey]?.[blockIndex] || baseBlockMinutes;

    return {
      id: `${weightKey || `cycle-${index}`}-${blockIndex + 1}`,
      materia: item?.discipline?.nome || `Disciplina ${index + 1}`,
      minutos: minutes,
      cor: item?.color,
      concluido: false,
      progresso: Number(item?.discipline?.percentual || 0),
      plano: item?.discipline?.planoLabel || item?.discipline?.plano || '',
      bloco: blockIndex + 1,
      score: Number(item?.score || 0),
      repeticoes: Number(item?.blockCount || 0),
      sourceIds:
        Array.isArray(item?.discipline?.sourceIds) && item.discipline.sourceIds.length > 0
          ? item.discipline.sourceIds.map((sourceId) => String(sourceId))
          : item?.discipline?.id
            ? [String(item.discipline.id)]
            : [],
    };
  });
}

function mergeCycleProgress(previousCycle, nextCycle) {
  const previousMap = new Map(
    (Array.isArray(previousCycle) ? previousCycle : []).map((item) => [String(item?.id || ''), item])
  );

  return (Array.isArray(nextCycle) ? nextCycle : []).map((item) => {
    const previous = previousMap.get(String(item?.id || ''));
    return {
      ...item,
      concluido: Boolean(previous?.concluido),
      progresso: previous?.progresso ?? item.progresso,
    };
  });
}

function resolveAudiobookIdFromTrackId(trackId = '') {
  const parts = String(trackId || '').split('-').filter(Boolean);
  if (parts.length <= 1) return String(trackId || '');
  return parts.slice(0, -1).join('-');
}

function distributeBookProgressAcrossTracks(tracks = [], farthestTime = 0, totalDuration = 0, concluded = false) {
  const safeTracks = Array.isArray(tracks) ? tracks : [];
  const durationFromTracks = safeTracks.reduce(
    (acc, track) => acc + Math.max(0, Number(track?.durationSecondsEstimate || 0)),
    0
  );
  const _effectiveDuration = Math.max(0, Number(totalDuration || 0), durationFromTracks);
  let remaining = Math.max(0, Number(farthestTime || 0));

  return safeTracks.reduce((acc, track) => {
    const trackDuration = Math.max(0, Number(track?.durationSecondsEstimate || 0));
    const listened = concluded ? trackDuration : Math.max(0, Math.min(trackDuration, remaining));
    remaining = Math.max(0, remaining - listened);

    acc[String(track.id)] = {
      currentTime: listened,
      farthestTime: listened,
      duration: trackDuration,
      completed: concluded ? true : trackDuration > 0 && listened >= trackDuration,
      updatedAt: new Date().toISOString(),
      playCount: 0,
    };
    return acc;
  }, {});
}

function buildAudiobookAggregates(progressByTrack = {}) {
  const groups = new Map();

  Object.entries(progressByTrack || {}).forEach(([trackId, progress]) => {
    const audiobookId = resolveAudiobookIdFromTrackId(trackId);
    if (!audiobookId) return;

    const current = groups.get(audiobookId) || {
      audiobookId,
      progresso: 0,
      duracao: 0,
      farthestTime: 0,
      concluido: false,
      trackCount: 0,
      completedCount: 0,
    };

    const duration = Math.max(0, Number(progress?.duration || 0));
    const farthestTime = Math.max(0, Number(progress?.farthestTime || progress?.currentTime || 0));
    const completed = Boolean(progress?.completed);

    current.duracao += duration;
    current.farthestTime += farthestTime;
    current.trackCount += 1;
    current.completedCount += completed ? 1 : 0;
    groups.set(audiobookId, current);
  });

  return Array.from(groups.values()).map((item) => ({
    audiobookId: item.audiobookId,
    progresso: item.duracao > 0 ? Math.min(100, Math.round((item.farthestTime / item.duracao) * 100)) : 0,
    duracao: item.duracao,
    farthestTime: item.farthestTime,
    concluido: item.trackCount > 0 && item.completedCount === item.trackCount,
  }));
}

export default function App() {
  const readJsonStorage = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      console.warn(`Storage invalido para ${key}. Usando fallback.`, error);
      return fallback;
    }
  };

  const normalizeLegacyCourseText = useCallback((value) =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim(), []);

  const isLegacyDemoCourse = useCallback((course = {}) => {
    const text = normalizeLegacyCourseText([course.id, course.nome, course.plano, course.concurso, course.cargo].join(' '));
    return (
      text.includes('curso-pmba-soldado-2026') ||
      (text.includes('pmba') && text.includes('soldado')) ||
      (text.includes('policia militar do estado da bahia') && text.includes('soldado')) ||
      (text.includes('adab 2026') && text.includes('fiscal estadual agropecuario'))
    );
  }, [normalizeLegacyCourseText]);

  const sanitizeStoredCourses = (courses) => {
    if (!Array.isArray(courses)) return [];

    const seen = new Set();
    return courses.filter((course) => {
      if (!course || isLegacyDemoCourse(course)) return false;

      const key = [course.plano, course.nome, course.concurso]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join('|');

      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const GENERIC_EDITAL_HEADINGS = [
    'CONTEUDO PROGRAMATICO',
    'CONTEÚDO PROGRAMÁTICO',
    'CONHECIMENTOS GERAIS',
    'CONHECIMENTOS BASICOS',
    'CONHECIMENTOS BÁSICOS',
    'CONHECIMENTOS ESPECIFICOS',
    'CONHECIMENTOS ESPECÍFICOS',
    'ANEXO',
    'EDITAL',
    'PROGRAMA',
    'PROGRAMACAO',
    'PROVAS',
  ];

  const BANCA_REGEXES = [
    /CEBRASPE|CESPE/i,
    /FCC\b/i,
    /FGV\b/i,
    /VUNESP/i,
    /IBFC/i,
    /AOCP/i,
    /IDECAN/i,
    /FUNDATEC/i,
    /IADES/i,
    /CONSULPLAN/i,
    /QUADRIX/i,
  ];

  const [loadingSession, setLoadingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentAuthUser, setCurrentAuthUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserAccessToken, setCurrentUserAccessToken] = useState('');
  const [pendingReferralCode, setPendingReferralCode] = useState(() =>
    normalizeReferralCode(extractReferralCodeFromLocation() || getStoredReferralCode())
  );
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'home';
    return new URLSearchParams(window.location.search).get('tab') || 'home';
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showOnboardingPreview, setShowOnboardingPreview] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('pl-dark') === '1');

  useEffect(() => {
    document.documentElement.classList.toggle('pl-theme-dark', darkMode);
    localStorage.setItem('pl-dark', darkMode ? '1' : '0');
  }, [darkMode]);

  useEffect(() => {
    if (!LAUNCH_MVP_MODE || !LAUNCH_HIDDEN_TABS.has(activeTab)) return;
    setActiveTab('home');
  }, [activeTab]);

  useEffect(() => {
    const referralFromLocation = normalizeReferralCode(extractReferralCodeFromLocation());
    if (!referralFromLocation) return;
    setPendingReferralCode(referralFromLocation);
    persistPendingReferralCode(referralFromLocation);
  }, []);

  useEffect(() => {
    const initSession = async () => {
      stripOAuthErrorFromLocation();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Erro Supabase:', error.message);
      } else {
        setIsAuthenticated(!!data?.session);
        setCurrentAuthUser(data?.session?.user || null);
        setCurrentUserId(data?.session?.user?.id || '');
        setCurrentUserEmail(data?.session?.user?.email || '');
        setCurrentUserAccessToken(data?.session?.access_token || '');
      }

      setLoadingSession(false);
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      setCurrentAuthUser(session?.user || null);
      setCurrentUserId(session?.user?.id || '');
      setCurrentUserEmail(session?.user?.email || '');
      setCurrentUserAccessToken(session?.access_token || '');
      setLoadingSession(false);
      // Quando o usuário clica no link "Esqueci a senha" e é redirecionado
      // de volta ao app, o Supabase dispara PASSWORD_RECOVERY. Roteamos para
      // a aba Perfil > Segurança para que ele possa definir a nova senha.
      if (event === 'PASSWORD_RECOVERY') {
        setActiveTab('perfil');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const [temaAtivo, setTemaAtivo] = useState(() => {
    return localStorage.getItem('papirando_tema') || 'policial';
  });

  useEffect(() => {
    localStorage.setItem('papirando_tema', temaAtivo);
  }, [temaAtivo]);

  const [subjectCatalog, setSubjectCatalog] = useState(() => localSubjectCatalog);

  const [historicoReal, setHistoricoReal] = useState(() => {
    try {
      const historicoSalvo = localStorage.getItem('papirando_historico');
      if (historicoSalvo) {
        return buildCanonicalHistory(JSON.parse(historicoSalvo), localSubjectCatalog);
      }
    } catch (error) {
      console.warn('Histórico local inválido. Reiniciando base local.', error);
    }
    return [];
  });

  const [redacoes, setRedacoes] = useState(() => loadLocalRedacoes());
  const [redacoesPersistence, setRedacoesPersistence] = useState({
    mode: 'local',
    schemaReady: false,
    loading: false,
    error: null,
  });
  const [redacaoExpertTips, setRedacaoExpertTips] = useState(() =>
    DEFAULT_REDACAO_EXPERT_TIPS.map((row) => normalizeRedacaoExpertTip(row))
  );
  const [redacaoThemeBankOverride, setRedacaoThemeBankOverride] = useState(null);
  const [redacaoKitOverride, setRedacaoKitOverride] = useState(null);
  const [audiobookCatalogOverride, setAudiobookCatalogOverride] = useState(null);
  const [sidebarLabelsOverride, setSidebarLabelsOverride] = useState(null);
  const [notificationSettings, setNotificationSettings] = useState(() => normalizeNotificationSettings(null));
  const [courseTemplates, setCourseTemplates] = useState(null); // null = ainda carregando do Supabase

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, items } = await fetchRedacaoExpertTipsFromSupabase();
      if (!cancelled && ok && Array.isArray(items) && items.length > 0) {
        setRedacaoExpertTips(items.map((row) => normalizeRedacaoExpertTip(row)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetchRedacaoSiteContent();
      if (cancelled || !r.ok) return;
      setRedacaoThemeBankOverride(r.themeBank);
      setRedacaoKitOverride(r.kit);
      setAudiobookCatalogOverride(Array.isArray(r.audiobookCatalog) && r.audiobookCatalog.length ? r.audiobookCatalog : null);
      setSidebarLabelsOverride(
        r.sidebarLabels && typeof r.sidebarLabels === 'object' && !Array.isArray(r.sidebarLabels)
          ? r.sidebarLabels
          : null
      );
      if (r.notificationSettings) {
        setNotificationSettings(normalizeNotificationSettings(r.notificationSettings));
      }
      // r.courseTemplates === null → coluna não existe ou SELECT falhou → usar DEFAULT como ponto de partida
      // r.courseTemplates === []   → usuário apagou tudo intencionalmente → respeitar []
      // r.courseTemplates === [...] → dados salvos → normalizar e usar
      if (r.courseTemplates !== null) {
        // Preserva [] como array vazio real (não normaliza para DEFAULT)
        setCourseTemplates(r.courseTemplates.length ? normalizeCourseTemplates(r.courseTemplates) : []);
      } else {
        // Coluna ausente ou falha no SELECT: normalizeCourseTemplates(null) retorna DEFAULT
        setCourseTemplates(normalizeCourseTemplates(null));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('papirando_historico', JSON.stringify(historicoReal));
  }, [historicoReal]);

  useEffect(() => {
    if (!currentAuthUser) return;
    let cancelled = false;

    const hydrateStudySessions = async () => {
      try {
        const localSessions = JSON.parse(localStorage.getItem('papirando_historico') || '[]');
        if (Array.isArray(localSessions) && localSessions.length > 0) {
          await syncLocalToSupabase(currentAuthUser.id, localSessions);
        }

        const sessions = await loadStudySessions(currentAuthUser.id, { limit: 500 });
        if (!cancelled) {
          setHistoricoReal(buildCanonicalHistory(sessions, subjectCatalog));
        }
      } catch (error) {
        console.warn('Erro ao sincronizar histórico com Supabase:', error);
      }
    };

    hydrateStudySessions();

    return () => {
      cancelled = true;
    };
  }, [currentAuthUser, subjectCatalog]);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;

    let cancelled = false;

    const hydrateSimulados = async () => {
      try {
        const [simuladosData, simuladoStatsData] = await Promise.all([
          loadSimulados(currentUserId),
          fetchSimuladoStats(currentUserId),
        ]);

        if (!cancelled) {
          setSimuladosDB(Array.isArray(simuladosData) ? simuladosData : []);
          setSimuladoStats(simuladoStatsData || { total: 0, mediaDesempenho: 0, melhorNota: 0 });
        }
      } catch (error) {
        console.warn('[simulado_records] Erro ao carregar simulados:', error?.message || error);
      }
    };

    hydrateSimulados();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentUserId]);

  useEffect(() => {
    saveLocalRedacoes(redacoes);
  }, [redacoes]);

  useEffect(() => {
    setHistoricoReal((prev) => {
      const normalized = buildCanonicalHistory(prev, subjectCatalog);
      const changed = normalized.some((item, index) => {
        const current = prev[index];
        return (
          current?.disciplina !== item.disciplina ||
          current?.disciplinaCanonica !== item.disciplinaCanonica
        );
      });

      return changed ? normalized : prev;
    });
  }, [subjectCatalog]);

  const [adminExpenses, setAdminExpenses] = useState([]);

  const [cursos, setCursos] = useState(() => {
    const cursosSalvos = readJsonStorage('papirando_cursos', null);
    if (Array.isArray(cursosSalvos)) {
      return sanitizeStoredCourses(cursosSalvos);
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem('papirando_cursos', JSON.stringify(cursos));
  }, [cursos]);

  const [contestLibrary, setContestLibrary] = useState(() => localConcursoCatalog);
  const [contestDrafts, setContestDrafts] = useState([]);
  const [selectedContestDetailId, setSelectedContestDetailId] = useState(null);
  const [favoriteContestIds, setFavoriteContestIds] = useState(() => {
    const saved = readJsonStorage('papirando_favorite_contests', []);
    return Array.isArray(saved) ? saved : [];
  });
  const [interestedContestIds, setInterestedContestIds] = useState(() => {
    const saved = readJsonStorage('papirando_interested_contests', []);
    return Array.isArray(saved) ? saved : [];
  });
  const [contestTrackers, setContestTrackers] = useState(() => {
    const saved = readJsonStorage('papirando_contest_trackers', {});
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  });
  const [targetContestId, setTargetContestId] = useState(() => {
    const saved = localStorage.getItem('papirando_target_contest');
    return typeof saved === 'string' ? saved : '';
  });
  const [studyPlanningMode, setStudyPlanningMode] = useState(() => {
    const saved = localStorage.getItem('papirando_study_planning_mode');
    return saved === 'ciclo' ? 'ciclo' : 'fixo';
  });
  const [planningCoursePlans, setPlanningCoursePlans] = useState(() => {
    const saved = readJsonStorage('papirando_planning_course_plans', []);
    return Array.isArray(saved) ? saved.filter(Boolean) : [];
  });
  const [planningSubjectConfig, setPlanningSubjectConfig] = useState(() => {
    const saved = readJsonStorage('papirando_planning_subject_config', {});
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  });
  const [planningSessionWindow, setPlanningSessionWindow] = useState(() => {
    const saved = readJsonStorage('papirando_planning_session_window', null);
    return saved && typeof saved === 'object'
      ? {
          minMinutes: Number(saved.minMinutes || 60),
          maxMinutes: Number(saved.maxMinutes || 120),
          subjectsPerDay: Math.max(1, Math.min(3, Number(saved.subjectsPerDay || 2))),
        }
      : {
          minMinutes: 60,
          maxMinutes: 120,
          subjectsPerDay: 2,
        };
  });
  const [weeklyAvailability, setWeeklyAvailability] = useState(() => {
    const saved = readJsonStorage('papirando_weekly_availability', null);
    return Array.isArray(saved) ? saved : buildDefaultWeeklyAvailability();
  });
  const [adminProfiles, setAdminProfiles] = useState([]);
  const [adminProfilesLoading, setAdminProfilesLoading] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);
  const isAdmin = isAdminIdentity(currentProfile, currentUserEmail);
  const [adminLeads, setAdminLeads] = useState([]);
  const [profileOverrides, setProfileOverrides] = useState(() => {
    const saved = readJsonStorage('papirando_profile_overrides', {});
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  });
  const [badgeRuleOverrides, setBadgeRuleOverrides] = useState(() => {
    const saved = readJsonStorage('papirando_badge_rules', {});
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  });
  const [progressConfig, setProgressConfig] = useState(() => {
    const saved = readJsonStorage('papirando_progress_config', null);
    if (saved && typeof saved === 'object') {
      return {
        xp: { ...buildDefaultXpConfig(), ...(saved.xp || {}) },
        badges: Array.isArray(saved.badges) && saved.badges.length > 0 ? saved.badges : buildDefaultBadgeConfig(),
      };
    }
    return {
      xp: buildDefaultXpConfig(),
      badges: buildDefaultBadgeConfig(),
    };
  });
  const [manualReminders, setManualReminders] = useState(() => {
    const saved = readJsonStorage('papirando_manual_reminders', []);
    return Array.isArray(saved) ? saved.filter(Boolean) : [];
  });
  const [sharedCalendarViewMode, setSharedCalendarViewMode] = useState(() => {
    const saved = localStorage.getItem('papirando_shared_calendar_view_mode');
    return saved === 'semana' ? 'semana' : 'mes';
  });
  const [sharedCalendarDate, setSharedCalendarDate] = useState(() => {
    const saved = localStorage.getItem('papirando_shared_calendar_date');
    if (!saved) return new Date();
    const parsed = new Date(`${saved}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  });
  const WELLNESS_PLAYER_STORAGE_KEY = 'papirando_wellness_player';
  const [wellnessLibrary, setWellnessLibrary] = useState(() => {
    const saved = readJsonStorage(WELLNESS_LIBRARY_STORAGE_KEY, null);
    return normalizeWellnessLibrary(saved);
  });
  const [activeWellnessTrackId, setActiveWellnessTrackId] = useState(() => {
    const savedPlayer = readJsonStorage(WELLNESS_PLAYER_STORAGE_KEY, null);
    return String(savedPlayer?.trackId || '');
  });
  const [isWellnessPlaying, setIsWellnessPlaying] = useState(false);
  const wellnessAudioRef = useRef(null);
  const [selectedCommunitySquadId, setSelectedCommunitySquadId] = useState(() => localStorage.getItem('papirando_selected_squad_id') || '');
  const [communityState, setCommunityState] = useState(() =>
    normalizeCommunityState(readJsonStorage('papirando_community_state', getDefaultCommunityState()))
  );
  const [communityPersistence, setCommunityPersistence] = useState({
    mode: 'local',
    schemaReady: false,
    loading: false,
    reason: '',
    error: null,
  });
  const [communitySmokeTest, setCommunitySmokeTest] = useState({
    status: 'idle',
    message: '',
    testedAt: '',
    details: null,
  });
  const [communityConnectivity, setCommunityConnectivity] = useState({
    status: 'idle',
    message: '',
    details: null,
  });
  const [audiobookStateByProfile, setAudiobookStateByProfile] = useState(() => {
    const saved = readJsonStorage(AUDIOBOOKS_STORAGE_KEY, {});
    if (!saved || typeof saved !== 'object') return {};

    return Object.entries(saved).reduce((acc, [profileKey, value]) => {
      acc[String(profileKey || '').toLowerCase()] = normalizeAudiobookState(value);
      return acc;
    }, {});
  });

  useEffect(() => {
    localStorage.setItem('papirando_favorite_contests', JSON.stringify(favoriteContestIds));
  }, [favoriteContestIds]);

  useEffect(() => {
    localStorage.setItem('papirando_interested_contests', JSON.stringify(interestedContestIds));
  }, [interestedContestIds]);

  useEffect(() => {
    localStorage.setItem('papirando_contest_trackers', JSON.stringify(contestTrackers));
  }, [contestTrackers]);

  useEffect(() => {
    localStorage.setItem('papirando_target_contest', targetContestId || '');
  }, [targetContestId]);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;
    setTargetContest(currentUserId, targetContestId || '').catch(console.warn);
  }, [targetContestId, isAuthenticated, currentUserId]);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;

    let cancelled = false;

    const hydrateUserContests = async () => {
      try {
        const contests = await loadUserContests(currentUserId);
        const targetRow = contests.find((row) => row.is_target);
        if (!cancelled && targetRow?.contest_slug) {
          setTargetContestId(targetRow.contest_slug);
        }
      } catch (error) {
        console.warn('[user_contests] Erro ao carregar concursos do usuário:', error?.message || error);
      }
    };

    hydrateUserContests();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentUserId]);

  useEffect(() => {
    localStorage.setItem('papirando_study_planning_mode', studyPlanningMode);
  }, [studyPlanningMode]);

  useEffect(() => {
    localStorage.setItem('papirando_planning_course_plans', JSON.stringify(planningCoursePlans));
  }, [planningCoursePlans]);

  useEffect(() => {
    localStorage.setItem('papirando_planning_subject_config', JSON.stringify(planningSubjectConfig));
  }, [planningSubjectConfig]);

  useEffect(() => {
    localStorage.setItem('papirando_planning_session_window', JSON.stringify(planningSessionWindow));
  }, [planningSessionWindow]);

  useEffect(() => {
    localStorage.setItem('papirando_weekly_availability', JSON.stringify(weeklyAvailability));
  }, [weeklyAvailability]);

  useEffect(() => {
    localStorage.setItem('papirando_profile_overrides', JSON.stringify(profileOverrides));
  }, [profileOverrides]);

  useEffect(() => {
    localStorage.setItem('papirando_badge_rules', JSON.stringify(badgeRuleOverrides));
  }, [badgeRuleOverrides]);

  useEffect(() => {
    localStorage.setItem('papirando_manual_reminders', JSON.stringify(manualReminders));
  }, [manualReminders]);

  useEffect(() => {
    if (!currentAuthUser) return;

    let cancelled = false;

    const syncManualReminders = async () => {
      try {
        const localOnes = readJsonStorage('papirando_manual_reminders', []);
        if (Array.isArray(localOnes) && localOnes.length > 0) {
          for (const reminder of localOnes) {
            const title = String(reminder?.title || reminder?.titulo || '').trim();
            const date = String(reminder?.date || reminder?.data || '').trim();
            if (!title || !date) continue;

            await supabase.from('calendar_reminders').upsert(
              {
                id: /^[0-9a-f-]{36}$/i.test(String(reminder?.id || '')) ? reminder.id : undefined,
                user_id: currentAuthUser.id,
                titulo: title,
                descricao: String(reminder?.text || reminder?.description || reminder?.descricao || '').trim(),
                tipo: String(reminder?.type || reminder?.tipo || 'lembrete').trim(),
                data: date,
                hora: String(reminder?.time || reminder?.hora || '').trim(),
                contest_slug: String(reminder?.contestSlug || reminder?.contestId || '').trim(),
                disciplina: String(reminder?.disciplina || '').trim(),
              },
              { onConflict: 'id' }
            );
          }
        }

        const { data, error } = await supabase
          .from('calendar_reminders')
          .select('*')
          .eq('user_id', currentAuthUser.id)
          .order('data', { ascending: true });

        if (error) throw error;
        if (cancelled) return;

        const fromDb = (data || []).map((row) => ({
          id: row.id,
          title: row.titulo || '',
          text: row.descricao || '',
          description: row.descricao || '',
          date: row.data || '',
          time: row.hora || '',
          type: row.tipo || 'lembrete',
          contestId: row.contest_slug || '',
          contestSlug: row.contest_slug || '',
          disciplina: row.disciplina || '',
          showOnCalendar: true,
          isDone: Boolean(row.is_done),
          createdAt: row.created_at || new Date().toISOString(),
        }));

        if (fromDb.length > 0) {
          setManualReminders(fromDb);
        }
      } catch (error) {
        console.warn('Erro ao carregar lembretes do Supabase:', error);
      }
    };

    syncManualReminders();

    return () => {
      cancelled = true;
    };
  }, [currentAuthUser]);

  useEffect(() => {
    localStorage.setItem('papirando_shared_calendar_view_mode', sharedCalendarViewMode);
  }, [sharedCalendarViewMode]);

  useEffect(() => {
    localStorage.setItem('papirando_shared_calendar_date', sharedCalendarDate.toISOString().slice(0, 10));
  }, [sharedCalendarDate]);
  useEffect(() => {
    localStorage.setItem('papirando_progress_config', JSON.stringify(progressConfig));
  }, [progressConfig]);
  useEffect(() => {
    localStorage.setItem(WELLNESS_LIBRARY_STORAGE_KEY, JSON.stringify(wellnessLibrary));
  }, [wellnessLibrary]);
  useEffect(() => {
    try {
      localStorage.setItem('papirando_community_state', JSON.stringify(normalizeCommunityState(communityState)));
    } catch (error) {
      console.warn('Falha ao persistir communityState completo. Tentando versão compacta.', error);

      try {
        const compactState = normalizeCommunityState(communityState);

        localStorage.setItem('papirando_community_state', JSON.stringify(compactState));
      } catch (compactError) {
          console.warn('Falha ao persistir communityState compactado.', compactError);
      }
    }
  }, [communityState]);
  useEffect(() => {
    localStorage.setItem('papirando_selected_squad_id', selectedCommunitySquadId || '');
  }, [selectedCommunitySquadId]);

  /** Deep link ?convite= — entra no esquadrão (estado local + RPC após login). */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('convite')?.trim();
    if (!code || code.length < 4) return;

    const stripConviteParam = () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('convite');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      } catch {
        return;
      }
    };

    const handledKey = `papirando_convite_ok_${code}`;
    try {
      if (sessionStorage.getItem(handledKey)) {
        stripConviteParam();
        return;
      }
    } catch {
      stripConviteParam();
    }

    const localSquads = Array.isArray(communityState?.squads) ? communityState.squads : [];
    const localMatch = localSquads.find(
      (s) => String(s.inviteCode || '').toLowerCase() === code.toLowerCase()
    );

    if (localMatch?.id) {
      setCommunityState((prev) =>
        normalizeCommunityState({
          ...prev,
          memberships: (() => {
            const m = Array.isArray(prev.memberships) ? prev.memberships : [];
            const rest = m.filter((x) => String(x.id) !== String(localMatch.id));
            return [...rest, { id: localMatch.id, name: localMatch.name, role: 'Aluno' }];
          })(),
        })
      );
      setSelectedCommunitySquadId(localMatch.id);
      try {
        sessionStorage.setItem(handledKey, '1');
      } catch {
        stripConviteParam();
      }
      stripConviteParam();
      return;
    }

    if (!currentUserId) return;

    let cancelled = false;
    (async () => {
      const { row, error } = await fetchSquadRowByInviteCode(supabase, code);
      if (cancelled || error || !row?.id) return;
      const shaped = coerceSquadForState(shapeSquadFromCommunityPost(row));
      if (!shaped?.id) return;
      setCommunityState((prev) => {
        const list = Array.isArray(prev.squads) ? [...prev.squads] : [];
        const idx = list.findIndex((s) => String(s.id) === String(shaped.id));
        if (idx >= 0) list[idx] = { ...list[idx], ...shaped };
        else list.unshift(shaped);
        const m = Array.isArray(prev.memberships) ? prev.memberships : [];
        const rest = m.filter((x) => String(x.id) !== String(shaped.id));
        return normalizeCommunityState({
          ...prev,
          squads: list,
          memberships: [...rest, { id: shaped.id, name: shaped.name, role: 'Aluno' }],
        });
      });
      setSelectedCommunitySquadId(shaped.id);
      try {
        sessionStorage.setItem(handledKey, '1');
      } catch {
        stripConviteParam();
      }
      stripConviteParam();
    })();

    return () => {
      cancelled = true;
    };
  }, [communityState.squads, currentUserId]);

  useEffect(() => {
    localStorage.setItem(AUDIOBOOKS_STORAGE_KEY, JSON.stringify(audiobookStateByProfile));
  }, [audiobookStateByProfile]);

  const currentProfileKey = String(currentAuthUser?.id || currentProfile?.id || currentUserEmail || 'default').toLowerCase();
  const defaultBadgeConfig = useMemo(
    () => (Array.isArray(progressConfig?.badges) && progressConfig.badges.length > 0 ? progressConfig.badges : buildDefaultBadgeConfig()),
    [progressConfig]
  );
  const currentBadgeConfig = useMemo(() => {
    const saved = badgeRuleOverrides[currentProfileKey];
    if (!Array.isArray(saved) || saved.length === 0) return defaultBadgeConfig;

    return defaultBadgeConfig.map((badge) => {
      const override = saved.find((item) => item?.id === badge.id);
      return override ? { ...badge, ...override, target: Math.max(1, Number(override.target || badge.target)) } : badge;
    });
  }, [badgeRuleOverrides, currentProfileKey, defaultBadgeConfig]);

  const effectiveProfile = useMemo(() => {
    const localOverride = profileOverrides[currentProfileKey] || {};
    return {
        ...currentProfile,
        ...localOverride,
        cpf: formatCpf(localOverride.cpf || currentProfile?.cpf || ''),
        username: localOverride.username || currentProfile?.username || '',
        billing:
        localOverride.billing && typeof localOverride.billing === 'object'
          ? localOverride.billing
          : currentProfile?.billing && typeof currentProfile.billing === 'object'
            ? currentProfile.billing
            : {
                holderName: '',
                document: '',
                preferredMethod: 'pix',
                billingEmail: currentProfile?.email || currentUserEmail || '',
                postalCode: '',
                status: 'preparacao',
              },
    };
  }, [currentProfile, profileOverrides, currentProfileKey, currentUserEmail]);

  const profileMetrics = useMemo(
    () => buildProfileMetrics(historicoReal, subjectCatalog, progressConfig.xp),
    [historicoReal, subjectCatalog, progressConfig]
  );
  const redacaoSummary = useMemo(() => buildRedacaoSummary(redacoes), [redacoes]);
  const communityMetrics = useMemo(
    () => buildCommunityProfileMetrics(profileMetrics, historicoReal),
    [profileMetrics, historicoReal]
  );
  const levelSummary = useMemo(
    () => buildLevelSummary(profileMetrics.xpTotal, progressConfig.xp),
    [profileMetrics.xpTotal, progressConfig]
  );

  // Write-back do XP para profiles.xp_total (consultável no ranking de Simulados).
  // Debounced: o XP é recalculado localmente; só persistimos quando estabiliza.
  useEffect(() => {
    if (!currentUserId) return undefined;
    const xp = Math.max(0, Math.round(Number(profileMetrics?.xpTotal || 0)));
    const timeoutId = window.setTimeout(() => {
      supabase
        .from('profiles')
        .update({ xp_total: xp })
        .eq('id', currentUserId)
        .then(({ error }) => {
          if (error) console.warn('[xp] falha ao persistir xp_total:', error.message || error);
        });
    }, 1500);
    return () => window.clearTimeout(timeoutId);
  }, [currentUserId, profileMetrics?.xpTotal]);
  const badgeSummary = useMemo(
    () =>
      buildBadgeSummary({
        history: historicoReal,
        subjectCatalog,
        badgeConfig: currentBadgeConfig,
        xpConfig: progressConfig.xp,
      }),
    [historicoReal, subjectCatalog, currentBadgeConfig, progressConfig]
  );
  const profileHasValidCpf = !effectiveProfile?.onboarding_done || isValidCpf(effectiveProfile?.cpf || '');
  const squadSummary = useMemo(
    () => ({
      count: Array.isArray(communityState?.memberships) ? communityState.memberships.length : 0,
      memberships: Array.isArray(communityState?.memberships) ? communityState.memberships : [],
    }),
    [communityState]
  );
  const activeWellnessTrack = useMemo(
    () => wellnessLibrary.find((item) => item.id === activeWellnessTrackId) || null,
    [wellnessLibrary, activeWellnessTrackId]
  );
  // Assinatura via tabela subscriptions (Stripe) — fonte de verdade para premium
  const {
    planName: stripePlanName,
    isPremium: isStripeActive,
    subscription: currentSubscription,
    refresh: refreshSubscription,
  } = useSubscription(currentUserId);

  // Dias restantes do periodo gratuito (so quando status = trialing).
  const trialDaysLeft = useMemo(() => {
    if (!currentSubscription || currentSubscription.status !== 'trialing') return null;
    const end = currentSubscription.current_period_end;
    if (!end) return null;
    const diffMs = new Date(end).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / 86400000));
  }, [currentSubscription]);

  // Modelo 2 tiers: Folha (free) e Papiro (pago). 'tatico'/'elite'/'beta' são aliases legados de pago.
  // useSubscription normaliza plan_name para 'gratuito'|'papiro', então comparar com 'papiro'.
  // Tabela subscriptions (Asaas) tem prioridade; fallback para profile (beta/manual).
  const profilePlanRaw = String(effectiveProfile?.subscription_plan || '').toLowerCase();
  const hasPaidProfilePlan = ['papiro', 'elite', 'tatico', 'beta'].includes(profilePlanRaw);

  const isElitePlan =
    (isStripeActive && stripePlanName === 'papiro') ||
    (!isStripeActive && hasPaidProfilePlan);

  const isPremiumPlan = isAdmin || isStripeActive || hasPaidProfilePlan;

  const selectedContestDetail = findGroupedContestById(contestLibrary, selectedContestDetailId);
  const communityRankings = useMemo(
    () =>
      buildCommunityRankings({
        communityState,
        profile: effectiveProfile,
        currentUserEmail,
        currentContestLabel: String(
          selectedContestDetail?.plano || selectedContestDetail?.nome || cursos?.[0]?.plano || cursos?.[0]?.nome || 'Plataforma geral'
        ).trim(),
        communityMetrics,
      }),
    [communityState, currentUserEmail, cursos, effectiveProfile, communityMetrics, selectedContestDetail]
  );

  const contestNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const settings = normalizeNotificationSettings(notificationSettings);

    return contestLibrary
      .flatMap((contest) => {
        const imported = cursos.some(
          (curso) =>
            curso.plano === contest.plano ||
            curso.nome === contest.nome ||
            curso.concurso === contest.concurso
        );
        const interested = interestedContestIds.includes(contest.id);
        const favorite = favoriteContestIds.includes(contest.id);
        const tracker = contestTrackers[contest.id] || {};
        const isRelevantForAnyGlobalFlag =
          settings.contestStatus.broadcastToAll ||
          settings.examUpcoming.broadcastToAll ||
          settings.editalPending.broadcastToAll ||
          settings.tafPreparation.broadcastToAll;
        const isRelevant = imported || interested || favorite || isRelevantForAnyGlobalFlag;

        if (!isRelevant) return [];

        const reminders = [];

        if (settings.contestStatus.enabled && (imported || interested || favorite || settings.contestStatus.broadcastToAll) && normalizeContestStatus(contest.status_concurso) === 'homologado') {
          reminders.push({
            id: `${contest.id}-homologado`,
            contestId: contest.id,
            contestName: contest.nome,
            type: 'status',
            title: 'Concurso homologado',
            text: `${contest.nome} já está homologado e serve como referência histórica.`,
            date: null,
            priority: 100,
          });
        }

        if (settings.examUpcoming.enabled && (imported || interested || favorite || settings.examUpcoming.broadcastToAll) && contest.prova_data) {
          const provaDate = new Date(`${contest.prova_data}T00:00:00`);
          provaDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((provaDate.getTime() - today.getTime()) / 86400000);

          if (diffDays >= 0 && diffDays <= 30) {
            reminders.push({
              id: `${contest.id}-prova`,
              contestId: contest.id,
              contestName: contest.nome,
              type: 'prova',
              title: diffDays === 0 ? 'Prova hoje' : diffDays === 1 ? 'Prova amanhã' : 'Prova se aproximando',
              text:
                diffDays === 0
                  ? `${contest.nome} acontece hoje.`
                  : `${contest.nome} acontece em ${diffDays} dia(s).`,
              date: contest.prova_data,
              priority: diffDays <= 7 ? 95 : 80,
            });
          }
        }

        if (settings.editalPending.enabled && (imported || interested || favorite || settings.editalPending.broadcastToAll) && !tracker.edital_lido) {
          reminders.push({
            id: `${contest.id}-edital`,
            contestId: contest.id,
            contestName: contest.nome,
            type: 'task',
            title: 'Ler o edital',
            text: `Ainda falta marcar a leitura do edital de ${contest.nome}.`,
            date: null,
            priority: 60,
          });
        }

        if (settings.tafPreparation.enabled && (imported || interested || favorite || settings.tafPreparation.broadcastToAll) && contest.etapas_tags?.includes('taf') && !tracker.taf_em_preparacao) {
          reminders.push({
            id: `${contest.id}-taf`,
            contestId: contest.id,
            contestName: contest.nome,
            type: 'task',
            title: 'Preparação para o TAF',
            text: `${contest.nome} tem etapa física. Vale iniciar essa frente logo.`,
            date: null,
            priority: 55,
          });
        }

        return reminders;
      })
      .sort((first, second) => {
        if (first.priority !== second.priority) return second.priority - first.priority;
        if (first.date && second.date) return String(first.date).localeCompare(String(second.date));
        if (first.date) return -1;
        if (second.date) return 1;
        return first.title.localeCompare(second.title, 'pt-BR');
      });
  }, [contestLibrary, cursos, interestedContestIds, favoriteContestIds, contestTrackers, notificationSettings]);

  const manualReminderNotifications = useMemo(() => {
    const settings = normalizeNotificationSettings(notificationSettings);
    if (!settings.manualReminders.enabled) return [];

    return (Array.isArray(manualReminders) ? manualReminders : [])
      .filter(Boolean)
      .map((item) => {
        const contest = contestLibrary.find((entry) => entry.id === item.contestId) || null;
        const type = item.type || 'task';
        const priority =
          type === 'prova' ? 92 : type === 'status' ? 78 : type === 'task' ? 66 : 58;

        return {
          id: item.id,
          contestId: item.contestId || '',
          contestName: item.contestName || contest?.nome || '',
          type,
          title: item.title || 'Lembrete manual',
          text: item.text || 'Lembrete criado manualmente.',
          date: item.date || null,
          time: item.time || '',
          source: 'manual',
          showOnCalendar: item.showOnCalendar !== false,
          priority,
        };
      })
      .sort((first, second) => {
        if (first.priority !== second.priority) return second.priority - first.priority;
        if (first.date && second.date) return String(first.date).localeCompare(String(second.date));
        if (first.date) return -1;
        if (second.date) return 1;
        return first.title.localeCompare(second.title, 'pt-BR');
      });
  }, [manualReminders, contestLibrary, notificationSettings]);

  // ── Admin notices ─────────────────────────────────────────────────────
  const [adminNotices, setAdminNotices] = useState([]);

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    supabase
      .from('admin_notices')
      .select('id, message, sent_at, user_id')
      .or(`user_id.eq.${currentUserId},user_id.is.null`)
      .is('read_at', null)
      .order('sent_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (!cancelled && Array.isArray(data)) setAdminNotices(data);
      });
    return () => { cancelled = true; };
  }, [currentUserId]);

  const handleDismissNotice = async (noticeId) => {
    setAdminNotices((prev) => prev.filter((n) => n.id !== noticeId));
    await supabase.from('admin_notices').update({ read_at: new Date().toISOString() }).eq('id', noticeId);
  };

  const handlePublishNotice = async ({ message, user_id }) => {
    const { error } = await supabase.from('admin_notices').insert({ message, user_id: user_id ?? null });
    if (error) throw error;
    // Se for broadcast, admin também vê imediatamente na lista própria
    if (!user_id) {
      setAdminNotices((prev) => [{ id: crypto.randomUUID(), message, sent_at: new Date().toISOString(), user_id: null }, ...prev]);
    }
  };
  // ──────────────────────────────────────────────────────────────────────

  const allReminderNotifications = useMemo(() => {
    return [...contestNotifications, ...manualReminderNotifications].sort((first, second) => {
      if (first.priority !== second.priority) return second.priority - first.priority;
      if (first.date && second.date) return String(first.date).localeCompare(String(second.date));
      if (first.date) return -1;
      if (second.date) return 1;
      return first.title.localeCompare(second.title, 'pt-BR');
    });
  }, [contestNotifications, manualReminderNotifications]);

  const sharedReminderCalendarEvents = useMemo(() => {
    return manualReminderNotifications
      .filter((item) => item.showOnCalendar !== false && item.date)
      .map((item) => ({
        id: `manual-${item.id}`,
        titulo: item.title,
        data: item.date,
        hora: item.time || 'Lembrete',
        tipo: 'Lembrete',
        cor:
          item.type === 'prova'
            ? '#CCE5FF'
            : item.type === 'status'
              ? '#FADADD'
              : '#FFF4CC',
        detail: item.text,
        contestId: item.contestId || '',
        contestName: item.contestName || '',
      }));
  }, [manualReminderNotifications]);

  const agendaHoje = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return allReminderNotifications
      .filter((item) => item.date === today)
      .map((item) => ({
        horario: item.time || (item.type === 'prova' ? 'Concurso' : 'Lembrete'),
        titulo: item.title,
        detalhe: item.text,
        contestName: item.contestName,
        contestId: item.contestId,
      }));
  }, [allReminderNotifications]);

  const agendaAmanha = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().slice(0, 10);

    return allReminderNotifications
      .filter((item) => item.date === tomorrowIso)
      .map((item) => ({
        horario: item.time || (item.type === 'prova' ? 'Concurso' : 'Lembrete'),
        titulo: item.title,
        detalhe: item.text,
        contestName: item.contestName,
        contestId: item.contestId,
      }));
  }, [allReminderNotifications]);

  const contestChecklistHistory = useMemo(() => {
    return contestLibrary
      .flatMap((contest) => {
        const tracker = contestTrackers[contest.id] || {};
        const imported = cursos.some(
          (curso) =>
            curso.plano === contest.plano ||
            curso.nome === contest.nome ||
            curso.concurso === contest.concurso
        );
        const interested = interestedContestIds.includes(contest.id);
        const favorite = favoriteContestIds.includes(contest.id);

        if (!imported && !interested && !favorite) return [];

        const entries = [
          { key: 'edital_lido', label: 'Edital lido' },
          { key: 'prova_no_calendario', label: 'Prova no calendário' },
          { key: 'inscricao_planejada', label: 'Inscrição planejada' },
          { key: 'taf_em_preparacao', label: 'Preparação para o TAF' },
          { key: 'simulados_planejados', label: 'Bloco de simulados reservado' },
        ];

        return entries
          .filter((entry) => Boolean(tracker[entry.key]))
          .map((entry) => ({
            id: `${contest.id}-${entry.key}`,
            contestId: contest.id,
            contestName: contest.nome,
            label: entry.label,
          }));
      })
      .sort((first, second) => first.contestName.localeCompare(second.contestName, 'pt-BR'));
  }, [contestLibrary, contestTrackers, cursos, interestedContestIds, favoriteContestIds]);

  const [bancoDisciplinas, setBancoDisciplinas] = useState([
    {
      id: 1,
      nome: 'Direito Administrativo',
      plano: 'PMBA - Soldado',
      tempo: '3h 24m',
      acertos: 12,
      erros: 4,
      percentual: 75,
      topicosTot: 16,
      cor: '#1e3a5f',
      topicos: [
        {
          id: 101,
          nome: '1. Atos Administrativos: conceito, requisitos, atributos, classificação e espécies.',
          acertos: 10,
          erros: 2,
          percentual: 83,
          concluido: true,
        },
        {
          id: 102,
          nome: '2. Agentes Públicos: disposições constitucionais.',
          acertos: 2,
          erros: 2,
          percentual: 50,
          concluido: false,
        },
        {
          id: 103,
          nome: '3. Poderes Administrativos: vinculado, discricionário, hierárquico, disciplinar e de polícia.',
          acertos: 0,
          erros: 0,
          percentual: 0,
          concluido: false,
        },
      ],
    },
    {
      id: 2,
      nome: 'Direito Constitucional',
      plano: 'PMBA - Soldado',
      tempo: '12h 10m',
      acertos: 85,
      erros: 15,
      percentual: 85,
      topicosTot: 22,
      cor: '#10B981',
      topicos: [
        {
          id: 201,
          nome: '1. Constituição da República Federativa do Brasil: conceito, classificações, princípios fundamentais.',
          acertos: 20,
          erros: 2,
          percentual: 90,
          concluido: true,
        },
        {
          id: 202,
          nome: '1.1. Dos princípios fundamentais (Art. 1º ao 4º).',
          acertos: 30,
          erros: 5,
          percentual: 85,
          concluido: true,
        },
        {
          id: 203,
          nome: '1.2. Dos Direitos e garantias fundamentais: direitos e deveres individuais e coletivos.',
          acertos: 35,
          erros: 8,
          percentual: 81,
          concluido: true,
        },
        {
          id: 204,
          nome: '1.3. Da organização do Estado: organização político-administrativa.',
          acertos: 0,
          erros: 0,
          percentual: 0,
          concluido: false,
        },
        {
          id: 205,
          nome: '1.4. Da Administração Pública (Art. 37).',
          acertos: 0,
          erros: 0,
          percentual: 0,
          concluido: false,
        },
      ],
    },
    {
      id: 3,
      nome: 'Atualidades',
      plano: 'Geral',
      tempo: '0h 00m',
      acertos: 0,
      erros: 0,
      percentual: 0,
      topicosTot: 3,
      cor: '#F59E0B',
      topicos: [
        {
          id: 301,
          nome: '1. GLOBALIZAÇÃO: CONCEITOS, EFEITOS E IMPLICAÇÕES.',
          acertos: 0,
          erros: 0,
          percentual: 0,
          concluido: false,
        },
        {
          id: 302,
          nome: '2. MULTICULTURALIDADE E DIVERSIDADE CULTURAL.',
          acertos: 0,
          erros: 0,
          percentual: 0,
          concluido: false,
        },
        {
          id: 303,
          nome: '3. TECNOLOGIAS DE INFORMAÇÃO E COMUNICAÇÃO.',
          acertos: 0,
          erros: 0,
          percentual: 0,
          concluido: false,
        },
      ],
    },
  ]);

  const [_comunidadeInnerTab, _setComunidadeInnerTab] = useState('feed');
  const [planWizardStep, setPlanWizardStep] = useState(0);
  const [isEditingCycle, setIsEditingCycle] = useState(false);
  const [showFinishedSessions, setShowFinishedSessions] = useState(true);
  const [chartTooltip, setChartTooltip] = useState(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [showTimerSetup, setShowTimerSetup] = useState(false);
  const [timerMode, setTimerMode] = useState('cronometro');
  const [timerValue, setTimerValue] = useState(0);
  const [timerMax, setTimerMax] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  const [customFocusTime, setCustomFocusTime] = useState(60);
  const [customPauseTime, setCustomPauseTime] = useState(15);
  const [_registroTempo, setRegistroTempo] = useState('00:00:00');
  const [isCadernoModalOpen, setIsCadernoModalOpen] = useState(false);
  const [metaDiariaQuestoes, setMetaDiariaQuestoes] = useState(100);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [registroSimuladoModalOpen, setRegistroSimuladoModalOpen] = useState(false);
  const [simuladoDraft, setSimuladoDraft] = useState(null);
  const [simuladosDB, setSimuladosDB] = useState([]);
  const [simuladoStats, setSimuladoStats] = useState({
    total: 0,
    mediaDesempenho: 0,
    melhorNota: 0,
  });
  const [registroEstudoModalOpen, setRegistroEstudoModalOpen] = useState(false);
  const [historyPresetFilter, setHistoryPresetFilter] = useState('Todos');
  const [historyPresetQuery, setHistoryPresetQuery] = useState('');
  const [studySessionDraft, setStudySessionDraft] = useState(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [viewingDiscipline, setViewingDiscipline] = useState(null);
  const [highlightedDisciplineTopicId, setHighlightedDisciplineTopicId] = useState('');
  const [expandedEditalSubject, setExpandedEditalSubject] = useState(2);
  const [editingDiscipline, setEditingDiscipline] = useState(null);
  const [selectedCoursePlan, setSelectedCoursePlan] = useState('Todos');
  const contentScrollRef = useRef(null);
  const [disciplineViewToken, setDisciplineViewToken] = useState(0);

  const [wizData, setWizData] = useState({
    tipo: 'ciclo',
    materias: [],
    pesos: {},
    horasSemana: 18,
    minSessao: '1h 30m',
    maxSessao: '2h 00m',
    diasSemana: { dom: false, seg: true, ter: true, qua: true, qui: true, sex: true, sab: false },
    horasPorDia: { dom: 0, seg: 4, ter: 4, qua: 4, qui: 4, sex: 4, sab: 0 },
  });

  const [activeCycle, setActiveCycle] = useState(() => {
    try {
      const saved = localStorage.getItem('papirando_active_cycle');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignora */ }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('papirando_active_cycle', JSON.stringify(activeCycle));
  }, [activeCycle]);

  // Contador real de ciclos completos (antes "Ciclos completos" mostrava sempre 0:
  // não era passado para a tela nem persistido). Incrementa ao recomeçar um ciclo 100% feito.
  const [ciclosCompletos, setCiclosCompletos] = useState(() => {
    const saved = Number(localStorage.getItem('papirando_ciclos_completos'));
    return Number.isFinite(saved) && saved > 0 ? saved : 0;
  });

  useEffect(() => {
    localStorage.setItem('papirando_ciclos_completos', String(ciclosCompletos));
  }, [ciclosCompletos]);

  const [_expandedDisciplinas, setExpandedDisciplinas] = useState({
    constitucional: false,
    administrativo: false,
  });
  const audiobookCatalog = useMemo(
    () => mergeAudiobookCatalogFromRemote(audiobookCatalogOverride, bancoDisciplinas, subjectCatalog),
    [audiobookCatalogOverride, bancoDisciplinas, subjectCatalog]
  );
  const currentAudiobookState = useMemo(
    () => normalizeAudiobookState(audiobookStateByProfile[currentProfileKey]),
    [audiobookStateByProfile, currentProfileKey]
  );

  useEffect(() => {
    if (!currentAuthUser?.id) return;
    let cancelled = false;

    const hydrateAudiobookProgress = async () => {
      try {
        const remoteProgress = await loadAudiobookProgress(currentAuthUser.id);
        if (cancelled || !remoteProgress || typeof remoteProgress !== 'object') return;

        setAudiobookStateByProfile((prev) => {
          const previousState = normalizeAudiobookState(prev[currentProfileKey]);
          const nextProgressByTrack = { ...(previousState.progressByTrack || {}) };

          Object.entries(remoteProgress).forEach(([audiobookId, aggregate]) => {
            const matchingTracks = audiobookCatalog
              .find((book) => String(book?.id || '') === String(audiobookId))
              ?.tracks || [];

            if (!matchingTracks.length) return;

            const localAggregate = buildAudiobookAggregates(previousState.progressByTrack).find(
              (item) => item.audiobookId === audiobookId
            );

            if (Number(localAggregate?.farthestTime || 0) >= Number(aggregate?.farthest_time || 0)) {
              return;
            }

            const distributedProgress = distributeBookProgressAcrossTracks(
              matchingTracks,
              aggregate?.farthest_time || 0,
              aggregate?.duracao || 0,
              aggregate?.concluido
            );

            Object.assign(nextProgressByTrack, distributedProgress);
          });

          return {
            ...prev,
            [currentProfileKey]: normalizeAudiobookState({
              ...previousState,
              progressByTrack: nextProgressByTrack,
            }),
          };
        });
      } catch (error) {
        console.warn('[audiobook_progress] Erro ao carregar progresso:', error?.message || error);
      }
    };

    hydrateAudiobookProgress();

    return () => {
      cancelled = true;
    };
  }, [audiobookCatalog, currentAuthUser, currentProfileKey]);
  const audiobookSummary = useMemo(
    () => buildAudiobookSummary(audiobookCatalog, currentAudiobookState),
    [audiobookCatalog, currentAudiobookState]
  );

  const myContests = useMemo(() => {
    return contestLibrary
      .map((contest) => {
        const imported = cursos.some(
          (curso) =>
            curso.plano === contest.plano ||
            curso.nome === contest.nome ||
            curso.concurso === contest.concurso
        );
        const interested = interestedContestIds.includes(contest.id);
        const favorite = favoriteContestIds.includes(contest.id);
        const tracker = contestTrackers[contest.id] || {};
        const checklistDoneCount = Object.values(tracker).filter(Boolean).length;
        const disciplinasIniciadas = bancoDisciplinas.filter((disciplina) => disciplina.plano === contest.plano).length;

        if (!imported && !interested && !favorite) return null;

        let diasParaProva = null;
        if (contest.prova_data) {
          const provaDate = new Date(`${contest.prova_data}T00:00:00`);
          // Normaliza "hoje" para meia-noite local: a prova é fixada em T00:00:00, então
          // comparar contra a hora atual desviava a contagem de dias em até 1 dia.
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          diasParaProva = Math.ceil((provaDate.getTime() - today.getTime()) / 86400000);
        }

        return {
          ...contest,
          imported,
          interested,
          favorite,
          checklistDoneCount,
          disciplinasIniciadas,
          diasParaProva,
          isTarget: contest.id === targetContestId,
        };
      })
      .filter(Boolean)
      .sort((first, second) => {
        if (first.isTarget && !second.isTarget) return -1;
        if (!first.isTarget && second.isTarget) return 1;
        if (first.imported && !second.imported) return -1;
        if (!first.imported && second.imported) return 1;
        return first.nome.localeCompare(second.nome, 'pt-BR');
      });
  }, [contestLibrary, cursos, interestedContestIds, favoriteContestIds, contestTrackers, bancoDisciplinas, targetContestId]);

  const targetContestSummary = useMemo(() => {
    return myContests.find((item) => item.id === targetContestId) || null;
  }, [myContests, targetContestId]);

  const planningCourseOptions = useMemo(() => {
    const seen = new Set();

    return cursos
      .filter((curso) => curso?.plano || curso?.nome)
      .map((curso) => {
        const key = String(curso.plano || curso.nome || '').trim();
        if (!key || seen.has(key)) return null;
        seen.add(key);

        const contestMatch =
          myContests.find((contest) => contest.plano === curso.plano) ||
          contestLibrary.find((contest) => contest.plano === curso.plano) ||
          null;

        return {
          id: key,
          plano: key,
          nome: curso.nome || key,
          concurso: curso.concurso || contestMatch?.concurso || '',
          prova_data: contestMatch?.prova_data || '',
          status_concurso: contestMatch?.status_concurso || '',
          isTarget: targetContestSummary?.plano === key,
        };
      })
      .filter(Boolean)
      .sort((first, second) => {
        if (first.isTarget && !second.isTarget) return -1;
        if (!first.isTarget && second.isTarget) return 1;
        return first.nome.localeCompare(second.nome, 'pt-BR');
      });
  }, [cursos, contestLibrary, myContests, targetContestSummary]);

  const planningActivePlans = useMemo(() => {
    if (planningCoursePlans.length > 0) {
      return planningCoursePlans.filter((plan) =>
        planningCourseOptions.some((item) => item.plano === plan)
      );
    }

    if (selectedCoursePlan && selectedCoursePlan !== 'Todos') {
      return [selectedCoursePlan];
    }

    if (targetContestSummary?.plano) {
      return [targetContestSummary.plano];
    }

    return [];
  }, [planningCoursePlans, planningCourseOptions, selectedCoursePlan, targetContestSummary]);

  const planningSelectedContests = useMemo(() => {
    return planningActivePlans
      .map(
        (plan) =>
          myContests.find((contest) => contest.plano === plan) ||
          contestLibrary.find((contest) => contest.plano === plan) ||
          planningCourseOptions.find((course) => course.plano === plan) ||
          null
      )
      .filter(Boolean);
  }, [planningActivePlans, myContests, contestLibrary, planningCourseOptions]);

  const planningContestSummary = useMemo(() => {
    if (planningSelectedContests.length === 0) return targetContestSummary;
    if (planningSelectedContests.length === 1) return planningSelectedContests[0];

    const contestsWithDate = planningSelectedContests.filter((contest) => contest?.prova_data);
    const closestContest = contestsWithDate.sort((first, second) => {
      const firstDate = new Date(`${first.prova_data}T00:00:00`).getTime();
      const secondDate = new Date(`${second.prova_data}T00:00:00`).getTime();
      return firstDate - secondDate;
    })[0];
    let closestDays = null;
    if (closestContest?.prova_data) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      closestDays = Math.ceil((new Date(`${closestContest.prova_data}T00:00:00`).getTime() - hoje.getTime()) / 86400000);
    }

    return {
      id: 'planning-multi',
      nome: `${planningSelectedContests.length} cursos combinados`,
      plano: planningSelectedContests[0]?.plano || '',
      prova_data: closestContest?.prova_data || '',
      diasParaProva: Number.isFinite(Number(closestContest?.diasParaProva))
        ? Number(closestContest.diasParaProva)
        : closestDays,
      banca:
        new Set(planningSelectedContests.map((contest) => contest?.banca).filter(Boolean)).size > 1
          ? 'Multiplas bancas'
          : planningSelectedContests[0]?.banca || '',
      cargo: planningSelectedContests.map((contest) => contest?.nome).filter(Boolean).join(' + '),
    };
  }, [planningSelectedContests, targetContestSummary]);

  const planningAvailableDisciplines = useMemo(() => {
    const availablePlans = new Set(planningCourseOptions.map((item) => item.plano));
    return bancoDisciplinas.filter((disciplina) => availablePlans.has(disciplina.plano));
  }, [bancoDisciplinas, planningCourseOptions]);

  const targetContestDisciplines = useMemo(() => {
    if (!targetContestSummary?.plano) return [];
    return bancoDisciplinas.filter((disciplina) => disciplina.plano === targetContestSummary.plano);
  }, [bancoDisciplinas, targetContestSummary]);

  const planningDisciplines = useMemo(() => {
    const selectedPlans = new Set(planningActivePlans);
    const sourceDisciplines =
      selectedPlans.size > 0
        ? bancoDisciplinas.filter((disciplina) => selectedPlans.has(disciplina.plano))
        : targetContestDisciplines;
    const merged = mergeDisciplinesByCanonical({
      disciplines: sourceDisciplines,
      subjectCatalog,
    });

    return merged
      .filter((disciplina) => planningSubjectConfig[disciplina.nome]?.selected !== false)
      .map((disciplina) => {
        const config = planningSubjectConfig[disciplina.nome] || {};
        const importance = Number(config.importance || 3);
        const knowledge = Number(config.knowledge || 3);
        const manualPriorityBoost = (importance - 3) * 18 + (6 - knowledge) * 10;

        return {
          ...disciplina,
          manualPriorityBoost,
          manualImportance: importance,
          manualKnowledge: knowledge,
        };
      });
  }, [planningActivePlans, bancoDisciplinas, subjectCatalog, targetContestDisciplines, planningSubjectConfig]);

  const smartStudyPlan = useMemo(() => {
    const prioritizedDisciplines =
      targetContestDisciplines.length > 0
        ? targetContestDisciplines
        : bancoDisciplinas.filter((disciplina) => disciplina.plano !== 'Geral');

    return buildSmartStudyPlan({
      disciplines: prioritizedDisciplines.length > 0 ? prioritizedDisciplines : bancoDisciplinas,
      history: historicoReal,
      subjectCatalog,
      targetContest: targetContestSummary,
    });
  }, [targetContestDisciplines, bancoDisciplinas, historicoReal, subjectCatalog, targetContestSummary]);

  const planningStudyRecommendation = useMemo(() => {
    const baseDisciplines =
      planningDisciplines.length > 0
        ? planningDisciplines
        : targetContestDisciplines.length > 0
          ? targetContestDisciplines
          : bancoDisciplinas.filter((disciplina) => disciplina.plano !== 'Geral');

    return buildSmartStudyPlan({
      disciplines: baseDisciplines,
      history: historicoReal,
      subjectCatalog,
      targetContest: planningContestSummary,
    });
  }, [planningDisciplines, targetContestDisciplines, bancoDisciplinas, historicoReal, subjectCatalog, planningContestSummary]);

  useEffect(() => {
    if (studyPlanningMode !== 'ciclo' || planWizardStep !== 0) return;
    if (planningDisciplines.length === 0) return;

    const nextCycle = buildCycleFromWizardSelection({
      wizardData: wizData,
      disciplines: planningDisciplines,
    });

    if (nextCycle.length === 0) return;

    setActiveCycle((prev) => mergeCycleProgress(prev, nextCycle));
  }, [studyPlanningMode, planWizardStep, wizData, planningDisciplines]);

  useEffect(() => {
    if (studyPlanningMode !== 'ciclo' || planningDisciplines.length === 0) return;

    const scopedIds = planningDisciplines.flatMap((discipline) =>
      Array.isArray(discipline?.sourceIds) && discipline.sourceIds.length > 0
        ? discipline.sourceIds.map((item) => String(item))
        : discipline?.id
          ? [String(discipline.id)]
          : []
    );

    if (scopedIds.length === 0) return;

    const selectedIds = new Set(
      (Array.isArray(wizData?.materias) ? wizData.materias : []).map((item) => String(item))
    );
    const hasScopedSelection = scopedIds.some((id) => selectedIds.has(id));

    if (hasScopedSelection) return;

    setWizData((prev) => ({
      ...prev,
      tipo: 'ciclo',
      materias: [...new Set(scopedIds)],
    }));
  }, [studyPlanningMode, planningDisciplines, wizData]);

  const resetCycleWizard = () => {
    const scopedIds = planningDisciplines.flatMap((discipline) =>
      Array.isArray(discipline?.sourceIds) && discipline.sourceIds.length > 0
        ? discipline.sourceIds.map((item) => String(item))
        : discipline?.id
          ? [String(discipline.id)]
          : []
    );

    setIsEditingCycle(false);
    setPlanWizardStep(2);
    setWizData((prev) => ({
      ...prev,
      tipo: 'ciclo',
      materias: [...new Set(scopedIds)],
      pesos: {},
    }));
  };

  const restartActiveCycle = () => {
    setIsEditingCycle(false);
    setShowFinishedSessions(true);
    // Recomeçar um ciclo cujas sessões estão todas concluídas conta como 1 ciclo completo.
    const sessoes = Array.isArray(activeCycle) ? activeCycle : [];
    if (sessoes.length > 0 && sessoes.every((item) => item?.concluido)) {
      setCiclosCompletos((prev) => prev + 1);
    }
    setActiveCycle((prev) =>
      (Array.isArray(prev) ? prev : []).map((item) => ({
        ...item,
        concluido: false,
      }))
    );
  };

  const removeActiveCycle = async () => {
    const confirmed = await showConfirm(
      'Essa ação limpa a configuração atual do ciclo e não pode ser desfeita.',
      { title: 'Remover ciclo ativo?', confirmLabel: 'Remover', danger: true }
    );
    if (!confirmed) return;

    setIsEditingCycle(false);
    setShowFinishedSessions(true);
    setActiveCycle([]);
    setPlanWizardStep(0);
  };

  const finalizeCycleWizard = () => {
    const nextCycle = buildCycleFromWizardSelection({
      wizardData: wizData,
      disciplines: planningDisciplines,
    });

    if (nextCycle.length > 0) {
      setActiveCycle((prev) => mergeCycleProgress(prev, nextCycle));
    }

    setPlanWizardStep(0);
  };

  const dailyRoutine = useMemo(() => {
    const currentHour = new Date().getHours();
    const recommendationPool = [
      smartStudyPlan?.primary,
      ...(smartStudyPlan?.queue || []),
      ...(smartStudyPlan?.cycleCandidates || []),
    ].filter(Boolean);

    const findRecommendation = (predicate) => recommendationPool.find(predicate) || null;
    const primary = smartStudyPlan?.primary || null;
    const reviewCandidate =
      findRecommendation((item) => item.studyMode === 'revisao') ||
      recommendationPool[1] ||
      null;
    const questionCandidate =
      findRecommendation((item) => item.studyMode === 'questoes') ||
      recommendationPool[2] ||
      primary ||
      null;

    const theoryCandidate =
      findRecommendation((item) => item.studyMode === 'teoria') || primary || null;

    const buildQuestionRecommendation = (candidate, durationLabel = '0h 30m', durationMin = 30) =>
      candidate
        ? {
            ...candidate,
            studyMode: 'questoes',
            studyModeLabel: 'Questoes',
            suggestedDurationMin: durationMin,
            suggestedDurationLabel: durationLabel,
          }
        : null;

    if (currentHour < 12) {
      return [
        theoryCandidate && {
          id: 'rotina-manha-teoria',
          title: 'Sessao 1',
          subtitle: theoryCandidate.nome,
          detail: theoryCandidate.nextTopic?.nome || 'Abra a frente principal enquanto a mente esta fresca.',
          duration: theoryCandidate.suggestedDurationLabel,
          tag: 'Teoria',
          recommendation: {
            ...theoryCandidate,
            studyMode: 'teoria',
            studyModeLabel: 'Teoria',
          },
        },
        primary && {
          id: 'rotina-manha-reforco',
          title: 'Sessao 2',
          subtitle: primary.nome,
          detail: primary.reason || 'Aprofunde o bloco mais importante do alvo.',
          duration: primary.suggestedDurationLabel,
          tag: primary.studyModeLabel,
          recommendation: primary,
        },
        questionCandidate && {
          id: 'rotina-manha-questoes',
          title: 'Questoes',
          subtitle: questionCandidate.nome,
          detail:
            questionCandidate.accuracy !== null
              ? `Feche a manha validando o acerto agregado de ${questionCandidate.accuracy}%.`
              : 'Use um bloco curto de questoes para medir a assimilacao.',
          duration: '0h 30m',
          tag: 'Questoes',
          recommendation: buildQuestionRecommendation(questionCandidate),
        },
      ].filter(Boolean);
    }

    if (currentHour < 18) {
      return [
        questionCandidate && {
          id: 'rotina-tarde-questoes',
          title: 'Questoes',
          subtitle: questionCandidate.nome,
          detail:
            questionCandidate.accuracy !== null
              ? `Momento bom para subir o acerto de ${questionCandidate.accuracy}%.`
              : 'Transforme a tarde em leitura de desempenho com questoes.',
          duration: '0h 40m',
          tag: 'Questoes',
          recommendation: buildQuestionRecommendation(questionCandidate, '0h 40m', 40),
        },
        primary && {
          id: 'rotina-tarde-reforco',
          title: 'Reforco',
          subtitle: primary.nome,
          detail: primary.nextTopic?.nome || 'Volte na disciplina mais critica do alvo.',
          duration: primary.suggestedDurationLabel,
          tag: primary.studyModeLabel,
          recommendation: primary,
        },
        reviewCandidate && {
          id: 'rotina-tarde-revisao',
          title: 'Revisao',
          subtitle: reviewCandidate.nome,
          detail: reviewCandidate.reason || 'Consolide o que mais corre risco de cair.',
          duration: reviewCandidate.suggestedDurationLabel,
          tag: 'Revisao',
          recommendation: {
            ...reviewCandidate,
            studyMode: 'revisao',
            studyModeLabel: 'Revisao',
          },
        },
      ].filter(Boolean);
    }

    return [
      reviewCandidate && {
        id: 'rotina-noite-revisao',
        title: 'Revisao',
        subtitle: reviewCandidate.nome,
        detail: reviewCandidate.nextTopic?.nome || 'Feche o dia reforcando o que mais pede retencao.',
        duration: reviewCandidate.suggestedDurationLabel,
        tag: 'Revisao',
        recommendation: {
          ...reviewCandidate,
          studyMode: 'revisao',
          studyModeLabel: 'Revisao',
        },
      },
      theoryCandidate && {
        id: 'rotina-noite-leitura',
        title: 'Leitura leve',
        subtitle: theoryCandidate.nome,
        detail: theoryCandidate.nextTopic?.nome || 'Use um bloco mais calmo para manter o edital andando.',
        duration: '0h 30m',
        tag: 'Teoria',
        recommendation: {
          ...theoryCandidate,
          studyMode: 'teoria',
          studyModeLabel: 'Teoria',
          suggestedDurationMin: 30,
          suggestedDurationLabel: '0h 30m',
        },
      },
      questionCandidate && {
        id: 'rotina-noite-fechamento',
        title: 'Fechamento',
        subtitle: questionCandidate.nome,
        detail: 'Feche o dia com um bloco curto de validacao.',
        duration: '0h 20m',
        tag: 'Questoes',
        recommendation: buildQuestionRecommendation(questionCandidate, '0h 20m', 20),
      },
    ].filter(Boolean);
  }, [smartStudyPlan]);

  useEffect(() => {
    const planosDaBase = [
      ...new Set(
        (bancoDisciplinas || [])
          .map((disciplina) => disciplina?.plano)
          .filter((plano) => plano && plano !== 'Geral' && !isLegacyDemoCourse({ plano }))
      ),
    ];

    if (planosDaBase.length === 0) return;

    setCursos((prev) => {
      const existentes = new Set(prev.map((curso) => curso.plano));
      const inferidos = planosDaBase
        .filter((plano) => !existentes.has(plano))
        .map((plano) => ({
          id: `curso-inferido-${plano.toLowerCase().replace(/\s+/g, '-')}`,
          nome: plano,
          plano,
          concurso: plano,
          banca: 'A definir',
          status: 'ativo',
          origem: 'inferido',
          cor: '#1e3a5f',
        }));

      return inferidos.length > 0 ? [...prev, ...inferidos] : prev;
    });
  }, [bancoDisciplinas, isLegacyDemoCourse]);

  useEffect(() => {
    setCursos((prev) => {
      let changed = false;
      const seen = new Set();

      const next = prev.filter((curso) => {
        const key = [curso.plano, curso.nome, curso.concurso]
          .map((value) => String(value || '').trim())
          .filter(Boolean)
          .join('|');

        if (!key) return true;

        if (seen.has(key)) {
          changed = true;
          return false;
        }

        seen.add(key);
        return true;
      });

      const cleaned = next.filter((curso) => {
        if (!isLegacyDemoCourse(curso)) return true;
        changed = true;
        return false;
      });

      return changed ? cleaned : prev;
    });
  }, [bancoDisciplinas, isLegacyDemoCourse]);

  useEffect(() => {
    let ignore = false;

    const loadContestLibrary = async () => {
      const templates = await loadContestCatalogFromSupabase(supabase, localConcursoCatalog);

      if (!ignore) {
        setContestLibrary(templates);
      }
    };

    loadContestLibrary();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!currentAuthUser) return;
    let ignore = false;

    (async () => {
      const [templates, entries] = await Promise.all([
        loadContestCatalogFromSupabase(supabase, localConcursoCatalog),
        loadSubjectCatalogFromSupabase(supabase, localSubjectCatalog),
      ]);

      if (!ignore) {
        setContestLibrary(templates);
        setSubjectCatalog(entries);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [currentAuthUser]);

  // Rascunhos (is_public=false) só fazem sentido para admin; a RLS devolve [] para os demais.
  useEffect(() => {
    if (!isAdmin) {
      setContestDrafts([]);
      return undefined;
    }
    let ignore = false;

    (async () => {
      // DEBUG temporário — diagnóstico da aba Rascunhos vazia.
      try {
        const { data: au } = await supabase.auth.getUser();
        const probe = await supabase
          .from('contest_templates')
          .select('id', { count: 'exact', head: true })
          .eq('is_public', false);
        console.log('[DEBUG-RASCUNHOS] uid=', au?.user?.id, 'email=', au?.user?.email,
          'isAdmin(front)=', isAdmin, 'rascunhos via RLS=', probe.count, 'erro=', probe.error?.message || null);
      } catch (e) {
        console.log('[DEBUG-RASCUNHOS] probe falhou:', e?.message || e);
      }
      const drafts = await loadContestDraftsFromSupabase(supabase);
      console.log('[DEBUG-RASCUNHOS] loader retornou', drafts.length, 'rascunhos');
      if (!ignore) setContestDrafts(drafts);
    })();

    return () => {
      ignore = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    let ignore = false;

    const loadSubjectLibrary = async () => {
      const entries = await loadSubjectCatalogFromSupabase(supabase, localSubjectCatalog);

      if (!ignore) {
        setSubjectCatalog(entries);
      }
    };

    loadSubjectLibrary();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadAdminProfiles = async () => {
      if (!isAuthenticated || !isAdmin) {
        if (!ignore) {
          setAdminProfiles([]);
          setAdminProfilesLoading(false);
        }
        return;
      }

      if (!ignore) setAdminProfilesLoading(true);

      try {
        const profiles = await loadAllProfiles();
        if (!ignore) {
          setAdminProfiles(profiles);
        }
      } catch (error) {
        console.error('Erro ao carregar profiles para admin:', error);
        if (!ignore) {
          setAdminProfiles([]);
        }
      } finally {
        if (!ignore) {
          setAdminProfilesLoading(false);
        }
      }
    };

    loadAdminProfiles();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, isAdmin]);

  useEffect(() => {
    let ignore = false;

    const loadCurrentProfile = async () => {
      if (!isAuthenticated) {
        if (!ignore) setCurrentProfile(null);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!ignore) setCurrentProfile(null);
        return;
      }

      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) {
        console.error('Erro ao carregar profile atual:', error);
        if (!ignore) {
          const fallbackReferralCode = buildDefaultReferralCode({
            username: user.user_metadata?.username || '',
            email: user.email || '',
            userId: user.id,
          });
          setCurrentProfile({
            id: user.id,
            email: user.email || '',
            nome: getAuthUserDisplayName(user),
            username: user.user_metadata?.username || '',
            celular: user.user_metadata?.celular || '',
            avatar_url: getAuthUserAvatarUrl(user),
            referral_code: fallbackReferralCode,
            referred_by_code: user.user_metadata?.referred_by_code || '',
          });
        }
        return;
      }

      const profileData =
        data || {
          id: user.id,
          email: user.email || '',
          nome: getAuthUserDisplayName(user),
          username: user.user_metadata?.username || '',
          celular: user.user_metadata?.celular || '',
          avatar_url: getAuthUserAvatarUrl(user),
          referral_code: user.user_metadata?.referral_code || '',
          referred_by_code: user.user_metadata?.referred_by_code || '',
        };

      const ensuredReferralCode =
        profileData?.referral_code ||
        buildDefaultReferralCode({
          username: profileData?.username || user.user_metadata?.username || '',
          email: profileData?.email || user.email || '',
          userId: user.id,
        });

      if (!profileData?.referral_code) {
        try {
          const { data: patchedProfile, error: patchError } = await supabase
            .from('profiles')
            .upsert(
              {
                id: user.id,
                email: profileData?.email || user.email || '',
                nome: profileData?.nome || getAuthUserDisplayName(user),
                username: profileData?.username || user.user_metadata?.username || '',
                celular: profileData?.celular || user.user_metadata?.celular || '',
                avatar_url: profileData?.avatar_url || getAuthUserAvatarUrl(user),
                referral_code: ensuredReferralCode,
                referred_by_code: profileData?.referred_by_code || user.user_metadata?.referred_by_code || '',
              },
              { onConflict: 'id' }
            )
            .select('*')
            .maybeSingle();

          if (!patchError && patchedProfile) {
            profileData.referral_code = patchedProfile.referral_code || ensuredReferralCode;
            profileData.referred_by_code = patchedProfile.referred_by_code || profileData.referred_by_code || '';
          }
        } catch (patchProfileError) {
          console.warn('Nao foi possivel garantir o codigo de convite do perfil.', patchProfileError);
        }
      }

      if (!ignore) {
        setCurrentProfile({
          ...profileData,
          referral_code: profileData?.referral_code || ensuredReferralCode,
          referred_by_code: profileData?.referred_by_code || user.user_metadata?.referred_by_code || '',
        });
      }
    };

    loadCurrentProfile();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, currentUserEmail, currentUserId]);

  useEffect(() => {
    let ignore = false;

    const hydrateProfileFromSupabase = async () => {
      if (!isAuthenticated || !currentUserId) return;

      try {
        const data = await loadProfile(currentUserId);
        if (!ignore && data) {
          setCurrentProfile((prev) => ({ ...(prev || {}), ...data }));
        }
      } catch (error) {
        console.warn('[profiles] Falha ao carregar perfil via helper:', error?.message || error);
      }
    };

    hydrateProfileFromSupabase();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, currentUserId]);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId || !currentAuthUser) return;

    const googleName = getAuthUserDisplayName(currentAuthUser);
    const googleAvatarUrl = getAuthUserAvatarUrl(currentAuthUser);
    const emailPrefix = String(currentAuthUser.email || '').split('@')[0].trim().toLowerCase();
    const currentName = String(currentProfile?.nome || '').trim();
    const shouldPatchName = googleName && (!currentName || currentName.toLowerCase() === emailPrefix);
    const shouldPatchAvatar = googleAvatarUrl && !String(currentProfile?.avatar_url || '').trim();

    if (!shouldPatchName && !shouldPatchAvatar) return;

    const patch = {};
    if (shouldPatchName) patch.nome = googleName;
    if (shouldPatchAvatar) patch.avatar_url = googleAvatarUrl;

    let cancelled = false;
    updateProfile(currentUserId, patch)
      .then((updatedProfile) => {
        if (!cancelled && updatedProfile) {
          setCurrentProfile((prev) => ({ ...(prev || {}), ...updatedProfile }));
        }
      })
      .catch((error) => {
        console.warn('[profiles] Nao foi possivel sincronizar nome/foto do Google.', error?.message || error);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentUserId, currentAuthUser, currentProfile?.nome, currentProfile?.avatar_url]);

  useEffect(() => {
    let ignore = false;

    const loadEssayState = async () => {
      if (!isAuthenticated || !currentUserId) {
        if (!ignore) {
          setRedacoesPersistence({
            mode: 'local',
            schemaReady: false,
            loading: false,
            error: null,
          });
        }
        return;
      }

      if (!ignore) {
        setRedacoesPersistence((prev) => ({ ...prev, loading: true }));
      }

      // Bail-out + finally garantido: mesmo que loadRedacoesFromSupabase
      // estoure (apesar do try/catch interno), setLoading(false) é executado
      // para não travar a UI da página Redações em "carregando" infinito.
      try {
        const result = await loadRedacoesFromSupabase({
          userId: currentUserId,
          fallbackRecords: loadLocalRedacoes(),
        });

        if (!ignore) {
          setRedacoes(result.records);
          setRedacoesPersistence({
            mode: result.mode,
            schemaReady: result.schemaReady,
            loading: false,
            error: result.error || null,
          });
        }
      } catch (error) {
        if (!ignore) {
          console.error('Falha inesperada ao carregar redações:', error);
          setRedacoes(loadLocalRedacoes());
          setRedacoesPersistence({
            mode: 'local',
            schemaReady: false,
            loading: false,
            error,
          });
        }
      } finally {
        if (!ignore) {
          setRedacoesPersistence((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    loadEssayState();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, currentUserId]);

  useEffect(() => {
    let ignore = false;

    const loadCommunityState = async () => {
      if (!isAuthenticated) {
        if (!ignore) {
          setCommunityPersistence((prev) => ({ ...prev, mode: 'local', schemaReady: false, loading: false, reason: 'not_authenticated', error: null }));
        }
        return;
      }

      if (!ignore) {
        setCommunityPersistence((prev) => ({ ...prev, loading: true }));
      }

      const result = await loadCommunityFromSupabase({
        currentUserId,
        fallbackState: getDefaultCommunityState(),
        accessToken: currentUserAccessToken,
      });

      if (!ignore) {
        setCommunityState(result.state);
        setCommunityPersistence({
          mode: result.mode || 'local',
          schemaReady: Boolean(result.schemaReady),
          loading: false,
          reason: result.reason || '',
          error: result.error || null,
        });
      }
    };

    loadCommunityState();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, currentUserId, currentUserAccessToken]);

  const buildProfileOverridePatch = (patch) => ({
    ...patch,
    cpf: formatCpf(patch?.cpf || ''),
    billing:
      patch?.billing && typeof patch.billing === 'object'
        ? patch.billing
        : effectiveProfile?.billing || {
            holderName: '',
            document: '',
            preferredMethod: 'pix',
            billingEmail: currentUserEmail || '',
            postalCode: '',
            status: 'preparacao',
          },
  });

  const handleAvatarChange = async (file) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      showToast('Selecione um arquivo de imagem válido.', 'error');
      return;
    }

    const toBase64 = () =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
        reader.readAsDataURL(file);
      });

    try {
      const previewUrl = await toBase64();
      setProfileOverrides((prev) => ({
        ...prev,
        [currentProfileKey]: {
          ...(prev[currentProfileKey] || {}),
          avatar_url: previewUrl,
        },
      }));
      setCurrentProfile((prev) => ({
        ...(prev || {}),
        avatar_url: previewUrl,
      }));

      if (currentUserId) {
        uploadAvatar(currentUserId, file)
          .then((avatarUrl) => {
            if (!avatarUrl) return;

            setProfileOverrides((prev) => ({
              ...prev,
              [currentProfileKey]: {
                ...(prev[currentProfileKey] || {}),
                avatar_url: avatarUrl,
              },
            }));
            setCurrentProfile((prev) => ({
              ...(prev || {}),
              avatar_url: avatarUrl,
            }));
          })
          .catch(console.warn);
      }
    } catch (error) {
      console.error(error);
      showToast('Não foi possível atualizar a foto agora.', 'error');
      throw error;
    }
  };

  const checkCpfAvailability = async (cpfDigits) => {
  if (!cpfDigits) return true;

  try {
    // SEC-007: usa RPC que retorna boolean (não expõe cpf/id de terceiros)
    const { data, error } = await supabase.rpc('cpf_disponivel', { check_cpf: cpfDigits });
    if (error) throw error;
    return Boolean(data);
  } catch {
    return !adminProfiles.some(
      (profile) =>
        normalizeCpf(profile?.cpf || '') === cpfDigits && String(profile?.id || '') !== String(currentProfile?.id || '')
    );
  }
};

  const normalizePhoneDigits = (value) => String(value || '').replace(/\D/g, '').slice(0, 11);

  const checkPhoneAvailability = async (phoneValue) => {
    const phoneDigits = normalizePhoneDigits(phoneValue);
    if (!phoneDigits) return false;

    const isSameProfilePhone = (profile) => {
      const profilePhones = [profile?.celular, profile?.telefone].map(normalizePhoneDigits).filter(Boolean);
      return profilePhones.includes(phoneDigits) && String(profile?.id || '') !== String(currentProfile?.id || '');
    };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, celular, telefone')
        .limit(1000);
      if (error) throw error;
      return !(data || []).some(isSameProfilePhone);
    } catch {
      const localProfiles = [
        ...adminProfiles,
        ...Object.values(profileOverrides || {}),
        currentProfile || {},
      ];
      return !localProfiles.some(isSameProfilePhone);
    }
  };

  const containsBlockedCodenameWord = (value) => {
    const normalized = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const blockedWords = [
      'puta',
      'puta',
      'merda',
      'porra',
      'caralho',
      'foda',
      'fodase',
      'fuder',
      'buceta',
      'pica',
      'pau no cu',
      'cuzao',
      'arrombado',
      'arrombada',
      'vagabundo',
      'vagabunda',
      'otario',
      'otaria',
      'babaca',
      'desgraca',
      'cacete',
      'fdp',
      'filho da puta',
    ];

    return blockedWords.some((word) => normalized.includes(word));
  };

  const checkRankingCodenameAvailability = async (codename) => {
    const normalizedCodename = String(codename || '').trim().toLowerCase();
    if (!normalizedCodename) return true;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, ranking_codename')
        .eq('ranking_codename', codename);
      if (error) throw error;
      return !(data || []).some((item) => String(item.id || '') !== String(currentProfile?.id || ''));
    } catch {
      const localProfiles = [
        ...adminProfiles,
        ...Object.values(profileOverrides || {}),
        currentProfile || {},
      ];
      return !localProfiles.some((profile) => {
        const profileCodename = String(profile?.ranking_codename || profile?.rankingCodename || '').trim().toLowerCase();
        return profileCodename && profileCodename === normalizedCodename && String(profile?.id || '') !== String(currentProfile?.id || '');
      });
    }
  };
  const checkUsernameAvailability = async (usernameValue) => {
    const normalizedUsername = String(usernameValue || '').trim().toLowerCase();
    if (!normalizedUsername) return false;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', normalizedUsername);
      if (error) throw error;
      return !(data || []).some((item) => String(item.id || '') !== String(currentProfile?.id || ''));
    } catch {
      const localProfiles = [
        ...adminProfiles,
        ...Object.values(profileOverrides || {}),
        currentProfile || {},
      ];
      return !localProfiles.some((profile) => {
        const profileUsername = String(profile?.username || '').trim().toLowerCase();
        return profileUsername && profileUsername === normalizedUsername && String(profile?.id || '') !== String(currentProfile?.id || '');
      });
    }
  };

  const handleSaveProfile = async (draftProfile) => {
    const nome = String(draftProfile?.nome || '').trim();
    const username = String(draftProfile?.username || '').trim().toLowerCase();
    const telefone = String(draftProfile?.celular || draftProfile?.telefone || '').trim();
    const telefoneDigits = normalizePhoneDigits(telefone);
    const cpfDigits = normalizeCpf(draftProfile?.cpf || '');
    const rankingDisplayMode = String(draftProfile?.rankingDisplayMode || draftProfile?.ranking_display_mode || 'username');
    const rankingCodename = String(draftProfile?.rankingCodename || draftProfile?.ranking_codename || '').trim();
    const billing = draftProfile?.billing && typeof draftProfile.billing === 'object' ? draftProfile.billing : {};
    const referralCode = normalizeReferralCode(
      draftProfile?.referral_code || effectiveProfile?.referral_code || currentProfile?.referral_code || ''
    ) || buildDefaultReferralCode({
      username,
      email: currentUserEmail || currentProfile?.email || '',
      userId: currentProfile?.id || '',
    });
    const referredByCode = normalizeReferralCode(
      effectiveProfile?.referred_by_code || currentProfile?.referred_by_code || ''
    );

    if (!nome) {
      showToast('Digite o seu nome completo.', 'error');
      return { ok: false };
    }

    if (!username) {
      showToast('Digite um username para a sua conta.', 'error');
      return { ok: false };
    }

    if (username.length < 3) {
      showToast('O username precisa ter pelo menos 3 caracteres.', 'error');
      return { ok: false };
    }

    if (!/^[a-z0-9._]+$/.test(username)) {
      showToast('O username pode conter apenas letras minúsculas, números, ponto e underscore.', 'error');
      return { ok: false };
    }

    const usernameAvailable = await checkUsernameAvailability(username);
    if (!usernameAvailable) {
      showToast('Esse username já está em uso. Escolha outro.', 'error');
      return { ok: false };
    }

    if (!telefoneDigits) {
      showToast('Digite o celular da conta.', 'error');
      return { ok: false };
    }

    if (telefoneDigits.length < 10) {
      showToast('Digite um celular válido com DDD.', 'error');
      return { ok: false };
    }

    const phoneAvailable = await checkPhoneAvailability(telefone);
    if (!phoneAvailable) {
      showToast('Esse celular já está vinculado a outra conta.', 'error');
      return { ok: false };
    }

    if (!cpfDigits) {
      showToast('O CPF é obrigatório para vincular a conta.', 'error');
      return { ok: false };
    }

    if (!isValidCpf(cpfDigits)) {
      showToast('Digite um CPF válido.', 'error');
      return { ok: false };
    }

    const cpfAvailable = await checkCpfAvailability(cpfDigits);
    if (!cpfAvailable) {
      showToast('Esse CPF já está vinculado a outra conta.', 'error');
      return { ok: false };
    }

    if (rankingDisplayMode === 'codename') {
      if (!rankingCodename) {
        showToast('Digite um codinome para aparecer nos rankings.', 'error');
        return { ok: false };
      }

      if (rankingCodename.length < 3) {
        showToast('O codinome precisa ter pelo menos 3 caracteres.', 'error');
        return { ok: false };
      }

      if (containsBlockedCodenameWord(rankingCodename)) {
        showToast('Esse codinome não pode ser usado. Escolha um nome sem palavras ofensivas.', 'error');
        return { ok: false };
      }

      const codenameAvailable = await checkRankingCodenameAvailability(rankingCodename);
      if (!codenameAvailable) {
        showToast('Esse codinome já está em uso na plataforma. Escolha outro.', 'error');
        return { ok: false };
      }
    }

    const profilePatch = buildProfileOverridePatch({
      nome,
      username,
      celular: telefone,
      telefone,
      cpf: cpfDigits,
      avatar_url: draftProfile?.avatar_url || effectiveProfile?.avatar_url || '',
      ranking_display_mode: rankingDisplayMode,
      ranking_codename: rankingCodename,
      referral_code: referralCode,
      referred_by_code: referredByCode || '',
      billing: {
        holderName: String(billing.holderName || '').trim(),
        document: formatCpf(billing.document || cpfDigits),
        preferredMethod: billing.preferredMethod || 'pix',
        billingEmail: String(billing.billingEmail || currentUserEmail || '').trim(),
        postalCode: String(billing.postalCode || '').trim(),
        status: 'preparacao',
      },
    });

    setProfileOverrides((prev) => ({
      ...prev,
      [currentProfileKey]: {
        ...(prev[currentProfileKey] || {}),
        ...profilePatch,
      },
    }));
    setCurrentProfile((prev) => ({
      ...(prev || {}),
      ...profilePatch,
    }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        await supabase.auth.updateUser({
          data: {
            nome,
            username,
            celular: telefone,
            ranking_display_mode: rankingDisplayMode,
            ranking_codename: rankingCodename,
          },
        });
      }

      await updateProfile(currentUserId, {
        nome,
        email: currentUserEmail || user?.email || '',
        celular: telefone,
        telefone,
        username,
        cpf: cpfDigits,
        avatar_url: profilePatch.avatar_url || '',
        ranking_display_mode: rankingDisplayMode,
        ranking_codename: rankingCodename,
        referral_code: referralCode,
        referred_by_code: referredByCode || null,
      });

      return { ok: true };
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      const errorText = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
      if (errorText.includes('profiles_username_unique') || errorText.includes('(username)')) {
        showToast('Esse username já está em uso. Escolha outro.', 'error');
        return { ok: false, message: 'Esse username já está em uso. Escolha outro.' };
      }
      if (errorText.includes('profiles_cpf_unique') || errorText.includes('(cpf)')) {
        showToast('Esse CPF já está vinculado a outra conta.', 'error');
        return { ok: false, message: 'Esse CPF já está vinculado a outra conta.' };
      }
      if (
        errorText.includes('profiles_celular_unique') ||
        errorText.includes('profiles_telefone_unique') ||
        errorText.includes('(celular)') ||
        errorText.includes('(telefone)')
      ) {
        showToast('Esse celular já está vinculado a outra conta.', 'error');
        return { ok: false, message: 'Esse celular já está vinculado a outra conta.' };
      }
      return { ok: false, message: 'Não foi possível salvar o perfil agora.' };
    }
  };

  const _handleSaveBadgeConfig = (nextConfig) => {
    const sanitized = (Array.isArray(nextConfig) ? nextConfig : currentBadgeConfig).map((badge) => ({
      ...badge,
      target: Math.max(1, Number(badge.target || 1)),
    }));

    setBadgeRuleOverrides((prev) => ({
      ...prev,
      [currentProfileKey]: sanitized,
    }));
  };
  const handleSaveProgressConfig = (nextConfig) => {
    const nextXp = nextConfig?.xp && typeof nextConfig.xp === 'object' ? nextConfig.xp : progressConfig.xp;
    const nextBadges =
      Array.isArray(nextConfig?.badges) && nextConfig.badges.length > 0 ? nextConfig.badges : progressConfig.badges;

    setProgressConfig({
      xp: {
        ...buildDefaultXpConfig(),
        ...nextXp,
        customRules: (Array.isArray(nextXp?.customRules) ? nextXp.customRules : []).map((rule, index) => ({
          id: rule?.id || `xp-rule-${index}`,
          name: String(rule?.name || `Regra ${index + 1}`),
          metric: String(rule?.metric || 'questions'),
          multiplier: Number(rule?.multiplier || 0),
          plan: String(rule?.plan || ''),
          subject: String(rule?.subject || ''),
          topic: String(rule?.topic || ''),
        })),
      },
      badges: nextBadges.map((badge) => ({
        ...badge,
        target: Math.max(1, Number(badge.target || 1)),
        plan: String(badge?.plan || ''),
        subject: String(badge?.subject || ''),
        topic: String(badge?.topic || ''),
      })),
    });
  };
  const handleSaveAudiobookState = (nextState) => {
    setAudiobookStateByProfile((prev) => {
      const previousState = normalizeAudiobookState(prev[currentProfileKey]);
      const candidate = typeof nextState === 'function' ? nextState(previousState) : nextState;
      const normalizedCandidate = normalizeAudiobookState(candidate);

      if (currentAuthUser?.id) {
        const previousAggregates = buildAudiobookAggregates(previousState.progressByTrack).reduce((acc, item) => {
          acc[item.audiobookId] = item;
          return acc;
        }, {});

        buildAudiobookAggregates(normalizedCandidate.progressByTrack).forEach((item) => {
          const previousAggregate = previousAggregates[item.audiobookId];
          const hasChanged =
            Number(item.farthestTime || 0) !== Number(previousAggregate?.farthestTime || 0) ||
            Number(item.duracao || 0) !== Number(previousAggregate?.duracao || 0) ||
            Boolean(item.concluido) !== Boolean(previousAggregate?.concluido);

          if (!hasChanged || Number(item.farthestTime || 0) <= 0) return;

          saveAudiobookProgress(currentAuthUser.id, item.audiobookId, {
            progresso: item.progresso,
            duracao: item.duracao,
            farthestTime: item.farthestTime,
            concluido: item.concluido,
          }).catch(console.warn);
        });
      }

      return {
        ...prev,
        [currentProfileKey]: normalizedCandidate,
      };
    });
  };
  const handleSaveWellnessLibrary = (nextLibrary) => {
    setWellnessLibrary(normalizeWellnessLibrary(nextLibrary));
  };

  const handleSaveRedacaoExpertTips = async (nextItems) => {
    const prevIds = redacaoExpertTips.map((t) => t.id);
    const normalized = (Array.isArray(nextItems) ? nextItems : []).map((row) => normalizeRedacaoExpertTip(row));
    try {
      const saved = await syncRedacaoExpertTipsToSupabase(normalized, prevIds);
      setRedacaoExpertTips(saved);
      return { ok: true };
    } catch (error) {
      console.error('Erro ao salvar dicas de redação no Supabase:', error);
      return { ok: false, error: String(error?.message || error) };
    }
  };

  const redacaoThemeBankEffective = useMemo(
    () =>
      Array.isArray(redacaoThemeBankOverride) && redacaoThemeBankOverride.length > 0
        ? redacaoThemeBankOverride
        : REDACAO_THEME_BANK_DEFAULT,
    [redacaoThemeBankOverride]
  );

  const handleSaveRedacaoSiteContent = async ({ themeBankJson, kitJson, audiobookCatalogJson }) => {
    try {
      const saved = await upsertRedacaoSiteContent({ themeBankJson, kitJson, audiobookCatalogJson });
      setRedacaoThemeBankOverride(saved.themeBank?.length ? saved.themeBank : null);
      setRedacaoKitOverride(saved.kit);
      setAudiobookCatalogOverride(
        Array.isArray(saved.audiobookCatalog) && saved.audiobookCatalog.length ? saved.audiobookCatalog : null
      );
      return { ok: true };
    } catch (error) {
      console.error('Erro ao salvar conteúdo de redações:', error);
      return { ok: false, error: String(error?.message || error) };
    }
  };

  const handleSaveAudiolivrosContent = async (catalogForSave) => {
    try {
      const saved = await upsertRedacaoSiteContent({
        themeBankJson: redacaoThemeBankEffective,
        kitJson: sanitizeRedacaoKitForSave(mergeRedacaoKitBundle(redacaoKitOverride)),
        audiobookCatalogJson: catalogForSave,
      });
      setAudiobookCatalogOverride(
        Array.isArray(saved.audiobookCatalog) && saved.audiobookCatalog.length ? saved.audiobookCatalog : null
      );
      return { ok: true };
    } catch (error) {
      console.error('Erro ao salvar catálogo de audiolivros:', error);
      return { ok: false, error: String(error?.message || error) };
    }
  };

  const handleSaveSidebarLabels = async (payload) => {
    try {
      const { sidebarLabels } = await upsertSidebarLabels(payload);
      setSidebarLabelsOverride(sidebarLabels);
      return { ok: true };
    } catch (error) {
      console.error('Erro ao salvar rótulos do menu:', error);
      return { ok: false, error: String(error?.message || error) };
    }
  };

  const handleSaveNotificationSettings = async (settings) => {
    const normalized = normalizeNotificationSettings(settings);
    try {
      const { notificationSettings: savedSettings } = await upsertNotificationSettings(normalized);
      setNotificationSettings(normalizeNotificationSettings(savedSettings));
      return { ok: true };
    } catch (error) {
      console.error('Erro ao salvar configurações de notificações:', error);
      return { ok: false, error: String(error?.message || error) };
    }
  };

  const handleSaveCourseTemplates = async (templates) => {
    try {
      const normalized = normalizeCourseTemplates(templates);
      const { courseTemplates: savedTemplates } = await upsertCourseTemplates(normalized);
      setCourseTemplates(normalizeCourseTemplates(savedTemplates ?? normalized));
      return { ok: true };
    } catch (error) {
      console.error('Erro ao salvar cursos de faculdade:', error);
      return { ok: false, error: String(error?.message || error) };
    }
  };

  const handleStartWellnessTrack = (trackId) => {
    if (!trackId) return;
    setActiveWellnessTrackId(trackId);
    setIsWellnessPlaying(true);
  };
  const handleToggleWellnessPlayback = () => {
    setIsWellnessPlaying((prev) => !prev);
  };
  const handleCloseWellnessPlayer = () => {
    setIsWellnessPlaying(false);
    setActiveWellnessTrackId('');
    try {
      localStorage.removeItem(WELLNESS_PLAYER_STORAGE_KEY);
    } catch (error) {
      console.warn('Falha ao limpar o estado do player de bem-estar.', error);
    }
  };
  const handleSaveCommunityState = (nextState) => {
    setCommunityState((prev) => {
      const candidate = typeof nextState === 'function' ? nextState(prev) : nextState;
      return normalizeCommunityState(candidate);
    });
  };
  const handleCreateCommunityPost = async (draft) => {
    const title = String(draft?.title || '').trim();
    const content = String(draft?.content || '').trim();
    if (!title || !content) return { ok: false };

    try {
        if (communityPersistence.schemaReady) {
          const { error } = await createCommunityPost({
            currentUserId,
            profile: effectiveProfile,
            currentUserEmail,
            draft,
            accessToken: currentUserAccessToken,
          });
          if (error) throw error;

          const result = await loadCommunityFromSupabase({
            currentUserId,
            fallbackState: communityState,
            accessToken: currentUserAccessToken,
          });
        setCommunityState(result.state);
        setCommunityPersistence((prev) => ({ ...prev, mode: result.mode, schemaReady: result.schemaReady }));
        return { ok: true, persisted: true };
      }
    } catch (error) {
      console.error('Erro ao criar post da comunidade:', error);
    }

    setCommunityState((prev) =>
      createLocalCommunityPost(prev, {
        profile: effectiveProfile,
        currentUserEmail,
        currentUserId,
        draft,
      })
    );
    return { ok: true, persisted: false };
  };
  const handleCreateCommunityComment = async ({ postId, content }) => {
    const normalizedContent = String(content || '').trim();
    if (!postId || !normalizedContent) return { ok: false };

    try {
        if (communityPersistence.schemaReady) {
          const { error } = await createCommunityComment({
            currentUserId,
            profile: effectiveProfile,
            currentUserEmail,
            postId,
            content: normalizedContent,
            accessToken: currentUserAccessToken,
          });
          if (error) throw error;

          const result = await loadCommunityFromSupabase({
            currentUserId,
            fallbackState: communityState,
            accessToken: currentUserAccessToken,
          });
        setCommunityState(result.state);
        setCommunityPersistence((prev) => ({ ...prev, mode: result.mode, schemaReady: result.schemaReady }));
        return { ok: true, persisted: true };
      }
    } catch (error) {
      console.error('Erro ao comentar na comunidade:', error);
    }

    setCommunityState((prev) =>
      createLocalCommunityComment(prev, {
        profile: effectiveProfile,
        currentUserEmail,
        currentUserId,
        postId,
        content: normalizedContent,
      })
    );
    return { ok: true, persisted: false };
  };
  const handleToggleCommunityReaction = async ({ postId, reactionType, enabled }) => {
    if (!postId || !reactionType) return { ok: false };

    try {
        if (communityPersistence.schemaReady) {
          const { error } = await setCommunityReaction({
            currentUserId,
            postId,
            reactionType,
            enabled,
            accessToken: currentUserAccessToken,
          });
          if (error) throw error;

          const result = await loadCommunityFromSupabase({
            currentUserId,
            fallbackState: communityState,
            accessToken: currentUserAccessToken,
          });
        setCommunityState(result.state);
        setCommunityPersistence((prev) => ({ ...prev, mode: result.mode, schemaReady: result.schemaReady }));
        return { ok: true, persisted: true };
      }
    } catch (error) {
      console.error('Erro ao atualizar reacao da comunidade:', error);
    }

    setCommunityState((prev) => toggleLocalCommunityReaction(prev, { postId, reactionType, enabled }));
    return { ok: true, persisted: false };
  };
  const handleRegisterCommunityView = async (postId) => {
    if (!postId) return;

    const targetPost = (Array.isArray(communityState?.forumPosts) ? communityState.forumPosts : []).find((post) => post.id === postId);
    if (!targetPost) return;

    setCommunityState((prev) => incrementLocalCommunityView(prev, postId));

    if (!communityPersistence.schemaReady) return;

    try {
      await incrementCommunityPostView({ post: targetPost, accessToken: currentUserAccessToken });
    } catch (error) {
      console.error('Erro ao registrar visualizacao do post:', error);
    }
  };

  const handleReloadCommunityFromCloud = useCallback(async () => {
    if (!communityPersistence.schemaReady || !currentUserId) {
      return { ok: false, reason: 'not_ready' };
    }
    try {
      const result = await loadCommunityFromSupabase({
        currentUserId,
        fallbackState: communityState,
        accessToken: currentUserAccessToken,
      });
      setCommunityState(result.state);
      setCommunityPersistence((prev) => ({ ...prev, mode: result.mode, schemaReady: result.schemaReady }));
      return { ok: true };
    } catch (error) {
      console.error('Erro ao recarregar comunidade:', error);
      return { ok: false, error };
    }
  }, [communityPersistence.schemaReady, currentUserId, communityState, currentUserAccessToken]);

  const handleRunCommunityConnectivityCheck = useCallback(async () => {
    setCommunityConnectivity({
      status: 'running',
      message: 'Validando conectividade com o Supabase...',
      details: null,
    });

    const result = await probeCommunityConnectivity({
      supabaseUrl: supabaseBaseUrl,
      directSupabaseUrl: supabaseDirectUrl,
      supabaseAnonKey,
      proxyEnabled: isSupabaseDevProxyEnabled,
    });

    const nextState = {
      status: result.ok ? 'ok' : 'error',
      message: result.message || '',
      details: result.details || null,
    };

    setCommunityConnectivity(nextState);
    return nextState;
  }, []);
  const handleRunCommunitySmokeTest = useCallback(async ({ force = false } = {}) => {
    if (!communityPersistence.schemaReady || !currentUserId || !currentUserAccessToken) {
      const connectivityResult = await handleRunCommunityConnectivityCheck();
      const blocked = {
        status: 'blocked',
        message: !currentUserId
          ? 'Smoke test indisponivel sem usuario autenticado.'
          : !currentUserAccessToken
            ? 'Smoke test aguardando o access token da sessao. Recarregue o app e tente novamente.'
          : communityPersistence?.error?.message || connectivityResult.message || 'Smoke test aguardando schema da comunidade no Supabase.',
        testedAt: new Date().toISOString(),
        details: {
          ...(communityPersistence?.error?.code ? { code: communityPersistence.error.code } : {}),
          ...(connectivityResult?.details || {}),
        },
      };
      setCommunitySmokeTest(blocked);
      return blocked;
    }

    const storageKey = `papirando_community_smoke_${currentUserId}`;
    if (!force) {
      const cached = readJsonStorage(storageKey, null);
      if (cached?.status === 'ok') {
        setCommunitySmokeTest(cached);
        return cached;
      }
    }

    setCommunitySmokeTest({
      status: 'running',
      message: 'Executando smoke test automatico da comunidade...',
      testedAt: new Date().toISOString(),
      details: null,
    });

    const result = await runCommunitySmokeTest({
      currentUserId,
      profile: effectiveProfile,
      currentUserEmail,
      accessToken: currentUserAccessToken,
    });

    const nextState = {
      status: result.ok ? 'ok' : 'error',
      message: result.message || '',
      testedAt: result.testedAt || new Date().toISOString(),
      details: result.details || null,
    };

    setCommunitySmokeTest(nextState);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextState));
    } catch (error) {
      console.warn('Falha ao persistir o resultado do smoke test da comunidade.', error);
    }

    return nextState;
  }, [
    communityPersistence.schemaReady,
    communityPersistence?.error?.code,
    communityPersistence?.error?.message,
    currentUserAccessToken,
    currentUserEmail,
    currentUserId,
    effectiveProfile,
    handleRunCommunityConnectivityCheck,
  ]);
  useEffect(() => {
    const nextReferralCode = normalizeReferralCode(effectiveProfile?.referral_code || '');
    if (!nextReferralCode) return;

    setCommunityState((prev) => {
      if (String(prev?.referralCode || '') === nextReferralCode) return prev;
      return normalizeCommunityState({
        ...prev,
        referralCode: nextReferralCode,
      });
    });
  }, [effectiveProfile?.referral_code]);
  useEffect(() => {
    if (activeTab !== 'comunidades') return;
    handleRunCommunityConnectivityCheck();
    if (!communityPersistence.schemaReady || !currentUserId || !currentUserAccessToken) return;
    handleRunCommunitySmokeTest();
  }, [
    activeTab,
    communityPersistence.schemaReady,
    currentUserId,
    currentUserAccessToken,
    handleRunCommunityConnectivityCheck,
    handleRunCommunitySmokeTest,
  ]);
  useEffect(() => {
    const audio = wellnessAudioRef.current;
    if (!audio) return;
    const mediaUrl = resolveWellnessMediaUrl(activeWellnessTrack);
    if (!mediaUrl || String(activeWellnessTrack?.mediaType || 'audio').toLowerCase() === 'video') {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return;
    }

    const savedPlayer = readJsonStorage(WELLNESS_PLAYER_STORAGE_KEY, null);
    const shouldRestoreTime = String(savedPlayer?.trackId || '') === String(activeWellnessTrack?.id || '');

    if (audio.src !== mediaUrl) {
      audio.src = mediaUrl;
      audio.load();
      if (shouldRestoreTime && Number(savedPlayer?.currentTime) > 0) {
        audio.currentTime = Number(savedPlayer.currentTime);
      }
    }

    if (isWellnessPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [activeWellnessTrack, isWellnessPlaying]);

  useEffect(() => {
    const audio = wellnessAudioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsWellnessPlaying(false);
    const handleTimeUpdate = () => {
      if (!activeWellnessTrackId) return;

      try {
        localStorage.setItem(
          WELLNESS_PLAYER_STORAGE_KEY,
          JSON.stringify({
            trackId: activeWellnessTrackId,
            currentTime: Number(audio.currentTime || 0),
          })
        );
      } catch (error) {
        console.warn('Falha ao persistir o estado do player de bem-estar.', error);
      }
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [activeWellnessTrackId]);

  useEffect(() => {
    if (!activeWellnessTrackId) return;

    const existsInLibrary = wellnessLibrary.some((item) => item.id === activeWellnessTrackId);
    if (!existsInLibrary) {
      setIsWellnessPlaying(false);
      setActiveWellnessTrackId('');
    }
  }, [wellnessLibrary, activeWellnessTrackId]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Só limpa o estado local após confirmação de signOut bem-sucedido.
      // Se falhar (erro de rede), mantém a sessão ativa no cliente — o token
      // ainda é válido no servidor e não deve ficar "solto" sem sessão local.
      setCurrentProfile(null);
      setIsAuthenticated(false);
      setCurrentAuthUser(null);
      setCurrentUserId('');
      setCurrentUserEmail('');
      setCurrentUserAccessToken('');
      setViewingDiscipline(null);
      setSelectedContestDetailId(null);
      setActiveTab('home');
    } catch (error) {
      console.error('Erro ao sair da conta:', error);
    }
  };

  const handleSaveManualReminder = (reminderDraft) => {
    if (Array.isArray(reminderDraft)) {
      // Lista vinda do Supabase: MESCLAR, não substituir — lembretes locais com id
      // temporário (insert ainda em voo) seriam apagados por uma substituição seca.
      setManualReminders((prev) => {
        const remote = reminderDraft.filter(Boolean);
        const remoteIds = new Set(remote.map((item) => String(item.id)));
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const pendingLocal = (prev || []).filter(
          (item) => !uuidRe.test(String(item?.id || '')) && !remoteIds.has(String(item?.id))
        );
        return [...pendingLocal, ...remote];
      });
      return;
    }

    const title = String(reminderDraft?.title || '').trim();
    if (!title) {
      showToast('Digite o título do lembrete.', 'error');
      return;
    }

    const normalized = {
      id: reminderDraft?.id || `reminder-${Date.now()}`,
      title,
      text: String(reminderDraft?.text || reminderDraft?.description || reminderDraft?.descricao || '').trim(),
      description: String(reminderDraft?.description || reminderDraft?.text || reminderDraft?.descricao || '').trim(),
      date: reminderDraft?.date || '',
      time: reminderDraft?.time || '',
      type: reminderDraft?.type || 'lembrete',
      contestId: reminderDraft?.contestId || reminderDraft?.contestSlug || '',
      contestSlug: reminderDraft?.contestSlug || reminderDraft?.contestId || '',
      disciplina: reminderDraft?.disciplina || '',
      contestName: reminderDraft?.contestName || '',
      showOnCalendar: reminderDraft?.showOnCalendar !== false,
      isDone: Boolean(reminderDraft?.isDone),
      createdAt: reminderDraft?.createdAt || new Date().toISOString(),
    };

    setManualReminders((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === normalized.id);
      if (existingIndex === -1) return [normalized, ...prev];
      return prev.map((item) => (item.id === normalized.id ? normalized : item));
    });

    if (currentUserId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(normalized.id || ''));
      const payload = {
        user_id: currentUserId,
        titulo: normalized.title,
        descricao: normalized.description || '',
        tipo: normalized.type || 'lembrete',
        data: normalized.date || '',
        hora: normalized.time || '',
        contest_slug: normalized.contestSlug || normalized.contestId || '',
        disciplina: normalized.disciplina || '',
      };

      const request = isUuid
        ? supabase.from('calendar_reminders').upsert({ id: normalized.id, ...payload }, { onConflict: 'id' }).select('*').single()
        : supabase.from('calendar_reminders').insert(payload).select('*').single();

      request
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data?.id) return;
          setManualReminders((prev) =>
            prev.map((item) => (item.id === normalized.id ? { ...item, id: data.id } : item))
          );
        })
        .catch((error) => {
          console.error('[App] erro ao salvar lembrete no Supabase:', error?.message || error);
          showToast('O lembrete não foi salvo no servidor — ele pode sumir ao recarregar. Verifique a conexão e salve de novo.', 'error');
        });
    }
  };

  const handleDeleteManualReminder = (reminderId) => {
    setManualReminders((prev) => prev.filter((item) => item.id !== reminderId));
    if (currentUserId && reminderId) {
      // Builders do PostgREST resolvem com { error } — não rejeitam; checar explicitamente.
      supabase
        .from('calendar_reminders')
        .delete()
        .eq('id', reminderId)
        .eq('user_id', currentUserId)
        .then(({ error }) => {
          if (!error) return;
          console.error('[App] erro ao excluir lembrete no Supabase:', error.message || error);
          showToast('Não foi possível excluir o lembrete no servidor — ele pode reaparecer ao recarregar.', 'error');
        })
        .catch((error) => {
          console.error('[App] erro ao excluir lembrete no Supabase:', error?.message || error);
          showToast('Não foi possível excluir o lembrete no servidor — ele pode reaparecer ao recarregar.', 'error');
        });
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadAdminLeads = async () => {
      if (!isAdmin) {
        if (!ignore) setAdminLeads([]);
        return;
      }

      const { data, error } = await supabase
        .from('admin_crm_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar leads admin:', error);
        if (!ignore) setAdminLeads([]);
        return;
      }

      if (!ignore) {
        setAdminLeads((data || []).map((item) => normalizeLead(item)));
      }
    };

    loadAdminLeads();

    return () => {
      ignore = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    let ignore = false;

    const loadAdminExpenses = async () => {
      if (!isAdmin) {
        if (!ignore) setAdminExpenses([]);
        return;
      }

      const { data, error } = await supabase
        .from('admin_finance_expenses')
        .select('*')
        .order('competencia', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar despesas admin:', error);
        if (!ignore) setAdminExpenses([]);
        return;
      }

      if (!ignore) {
        setAdminExpenses(
          (data || []).map((item) => ({
            id: item.id,
            descricao: item.descricao || '',
            categoria: item.categoria || 'operacao',
            valor: Number(item.valor || 0),
            competencia: item.competencia || '',
            status: item.status || 'paga',
            observacao: item.observacao || '',
            created_at: item.created_at || null,
          }))
        );
      }
    };

    loadAdminExpenses();

    return () => {
      ignore = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!viewingDiscipline?.id) return;

    const disciplinaAtualizada = bancoDisciplinas.find((disciplina) => disciplina.id === viewingDiscipline.id);

    if (!disciplinaAtualizada) {
      setViewingDiscipline(null);
      return;
    }

    if (disciplinaAtualizada !== viewingDiscipline) {
      setViewingDiscipline(disciplinaAtualizada);
    }
  }, [bancoDisciplinas, viewingDiscipline]);

  useLayoutEffect(() => {
    if (activeTab !== 'disciplinas' || !viewingDiscipline?.id) return;

    const resetScroll = () => {
      const container = contentScrollRef.current;
      if (container) {
        container.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }

      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    };

    let cancelled = false;
    resetScroll();

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        resetScroll();

        window.requestAnimationFrame(() => {
          if (!cancelled) resetScroll();
        });
      });
    }

    return () => {
      cancelled = true;
    };
  }, [activeTab, viewingDiscipline?.id, disciplineViewToken]);

  useEffect(() => {
    if (activeTab !== 'disciplinas' || !viewingDiscipline) {
      setHighlightedDisciplineTopicId('');
    }
  }, [activeTab, viewingDiscipline]);

  const parseStudyTimeToMinutes = (timeText) => {
    const raw = String(timeText || '').trim();
    if (!raw) return 0;

    const hhmmssMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (hhmmssMatch) {
      const hasSeconds = Boolean(hhmmssMatch[3]);
      const hours = Number(hasSeconds ? hhmmssMatch[1] : 0);
      const minutes = Number(hasSeconds ? hhmmssMatch[2] : hhmmssMatch[1]);
      const seconds = Number(hasSeconds ? hhmmssMatch[3] : hhmmssMatch[2]);
      return hours * 60 + minutes + Math.round(seconds / 60);
    }

    const hoursMatch = raw.match(/(\d+)\s*h/i);
    const minutesMatch = raw.match(/(\d+)\s*(m|min)/i);
    const plainMinutes = raw.match(/^(\d+)$/);

    if (hoursMatch || minutesMatch) {
      return Number(hoursMatch?.[1] || 0) * 60 + Number(minutesMatch?.[1] || 0);
    }

    if (plainMinutes) {
      return Number(plainMinutes[1]);
    }

    return 0;
  };

  const formatMinutesToDisplay = useCallback((totalMinutes) => {
    const safeMinutes = Number(totalMinutes || 0);
    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }, []);

  const buildUpdatedDiscipline = useCallback((disciplina, topicosAtualizados, tempoTotalMin) => {
    const topicosOrdenados = [...topicosAtualizados].sort(
      (a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)
    );
    const concluidos = topicosOrdenados.filter((item) => item.concluido).length;
    const percentual =
      topicosOrdenados.length > 0 ? Math.round((concluidos / topicosOrdenados.length) * 100) : 0;

    return {
      ...disciplina,
      percentual,
      tempo_total_min: tempoTotalMin,
      tempo: formatMinutesToDisplay(tempoTotalMin),
      topicosTot: topicosOrdenados.length,
      topicos: topicosOrdenados,
    };
  }, [formatMinutesToDisplay]);

  useEffect(() => {
    let ignore = false;

    const loadUserDisciplines = async () => {
      if (!isAuthenticated) {
        if (!ignore) setBancoDisciplinas([]);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!ignore) setBancoDisciplinas([]);
        return;
      }

      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (subjectsError) {
        console.error('Erro ao carregar disciplinas do usuario:', subjectsError);
        if (!ignore) setBancoDisciplinas([]);
        return;
      }

      const subjectIds = (subjects || []).map((subject) => subject.id);
      let topics = [];

      if (subjectIds.length > 0) {
        const { data: topicRows, error: topicsError } = await supabase
          .from('topics')
          .select('*')
          .in('subject_id', subjectIds)
          .order('ordem', { ascending: true });

        if (topicsError) {
          console.error('Erro ao carregar topicos do usuario:', topicsError);
        } else {
          topics = topicRows || [];
        }
      }

      const disciplinasNormalizadas = (subjects || []).map((subject) => {
        const topicosDisciplina = topics
          .filter((topic) => topic.subject_id === subject.id)
          .map((topic) => ({
            ...topic,
            ordem: Number(topic.ordem || 0),
            concluido: Boolean(topic.concluido),
            acertos: Number(topic.acertos || 0),
            erros: Number(topic.erros || 0),
            percentual: Number(topic.percentual || 0),
            data: topic.data_conclusao || null,
          }));

        return buildUpdatedDiscipline(
          {
            ...subject,
            nome: canonicalizeSubjectName(subject.nome || '', subjectCatalog),
          },
          topicosDisciplina,
          Number(subject.tempo_total_min || 0)
        );
      });

      if (!ignore) {
        setBancoDisciplinas(disciplinasNormalizadas);
      }
    };

    loadUserDisciplines();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, currentUserEmail, subjectCatalog, buildUpdatedDiscipline]);

  const normalizeEdictLine = (line) =>
    String(line || '')
      .replace(/\s+/g, ' ')
      .replace(/[.:;]+$/g, '')
      .trim();

  const isGenericHeading = (line) => {
    const upper = normalizeEdictLine(line).toUpperCase();
    return GENERIC_EDITAL_HEADINGS.some((heading) => upper.includes(heading));
  };

  const sanitizeContestName = (line) => {
    const clean = normalizeEdictLine(line)
      .replace(/^cargo(?:s)?\s*(?:de|:)?\s*/i, '')
      .replace(/^concurso\s*(?:para|de|:)?\s*/i, '')
      .replace(/^op[cç][aã]o\s*\d+\s*[-:]\s*/i, '')
      .trim();

    return clean || 'Edital completo';
  };

  const detectBanca = (text) => {
    const match = BANCA_REGEXES.find((regex) => regex.test(text || ''));
    return match ? (String(text).match(match)?.[0] || 'A definir').toUpperCase() : 'A definir';
  };

  const isLikelyContestLine = (line) => {
    const clean = normalizeEdictLine(line);
    if (!clean || isGenericHeading(clean)) return false;

    const upper = clean.toUpperCase();
    return (
      /CARGO|CARGOS|FUNCAO|FUNÇÃO|ESPECIALIDADE|ÁREA|AREA/.test(upper) ||
      /SOLDADO|INVESTIGADOR|DELEGADO|ESCREVENTE|AGENTE|ANALISTA|TECNICO|TÉCNICO|OFICIAL|PERITO|GUARDA|PROCURADOR|AUDITOR|FISCAL|ASSISTENTE|POLICIAL|PROFESSOR/.test(
        upper
      )
    );
  };

  const isLikelyDisciplineLine = (line) => {
    const clean = normalizeEdictLine(line);
    if (!clean || isGenericHeading(clean)) return false;

    if (/^disciplina[:\s-]+/i.test(clean)) return true;
    if (/^\d+(\.\d+)*[.)]/.test(clean)) return false;
    if (clean.length > 90) return false;

    const upper = clean.toUpperCase();
    const isUpper = clean === upper;
    const hasLetters = /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(upper);

    return isUpper && hasLetters;
  };

  const extractDisciplinesFromLines = (lines, fallbackName = 'Conteúdo Programático') => {
    const blocks = [];
    let currentBlock = null;

    lines.forEach((line) => {
      const clean = normalizeEdictLine(line);
      if (!clean) return;

      if (isLikelyContestLine(clean)) return;

      if (isLikelyDisciplineLine(clean)) {
        currentBlock = {
          nome: clean.replace(/^disciplina[:\s-]*/i, '').trim(),
          topicos: [],
        };
        blocks.push(currentBlock);
        return;
      }

      const looksLikeTopic =
        /^(\d+(\.\d+)*[.)]\s+|[-•]\s+|[a-z]\)\s+)/i.test(clean) || clean.length > 16;

      if (!looksLikeTopic) return;

      if (!currentBlock) {
        currentBlock = {
          nome: fallbackName,
          topicos: [],
        };
        blocks.push(currentBlock);
      }

      currentBlock.topicos.push(clean.replace(/^[-•]\s+/, '').trim());
    });

    return blocks
      .map((block) => ({
        ...block,
        nome: normalizeEdictLine(block.nome) || fallbackName,
        topicos: block.topicos.filter(Boolean),
      }))
      .filter((block) => block.topicos.length > 0 && !isGenericHeading(block.nome));
  };

  const _analyzeEditalWithAI = (editalText) => {
    const normalizedText = String(editalText || '').replace(/\r/g, '').trim();
    if (!normalizedText) {
      throw new Error('Cole o texto do edital para analisar.');
    }

    const lines = normalizedText
      .split('\n')
      .map((line) => normalizeEdictLine(line))
      .filter(Boolean);

    const banca = detectBanca(normalizedText);
    const rawContestCandidates = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => isLikelyContestLine(line))
      .map(({ line, index }) => ({
        id: `contest-${index}`,
        title: sanitizeContestName(line),
        start: index,
      }));

    const dedupedContests = rawContestCandidates.filter(
      (contest, index, all) =>
        all.findIndex((item) => item.title.toUpperCase() === contest.title.toUpperCase()) === index
    );

    const contests =
      dedupedContests.length > 0
        ? dedupedContests.map((contest, index) => ({
            ...contest,
            end:
              index < dedupedContests.length - 1
                ? dedupedContests[index + 1].start - 1
                : lines.length - 1,
          }))
        : [
            {
              id: 'contest-all',
              title: 'Edital completo',
              start: 0,
              end: lines.length - 1,
            },
          ];

    const preview = contests.map((contest) => {
      const contestLines = lines.slice(contest.start, contest.end + 1);
      const disciplinas = extractDisciplinesFromLines(
        contestLines,
        contest.title === 'Edital completo' ? 'Conteúdo Programático' : contest.title
      );

      return {
        ...contest,
        disciplinas,
        disciplinasCount: disciplinas.length,
        topicosCount: disciplinas.reduce((acc, item) => acc + item.topicos.length, 0),
      };
    });

    return {
      banca,
      contests: preview,
      detectedContests: preview.length,
    };
  };

  const analyzeEditalDocument = (editalText) => {
    const normalizedText = String(editalText || '').replace(/\r/g, '').trim();
    if (!normalizedText) {
      throw new Error('Cole o texto do edital para analisar.');
    }

    const lines = normalizedText
      .split('\n')
      .map((line) => normalizeEdictLine(line))
      .filter(Boolean);

    const banca = detectBanca(normalizedText);

    const roleRegex =
      /(cargo(?:s)?|fun[cç][aã]o|especialidade|[áa]rea)\s*(?:de|:)?\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç0-9\s\-/(),]+)/i;

    const rawContests = lines
      .map((line, index) => {
        const match = line.match(roleRegex);
        if (!match) return null;

        const title = sanitizeContestName(match[2] || match[0]);
        if (!title || title.length < 4) return null;

        return {
          id: `contest-v2-${index}`,
          title,
          start: index,
        };
      })
      .filter(Boolean);

    const uniqueContests = rawContests.filter(
      (contest, index, all) =>
        all.findIndex((item) => item.title.toUpperCase() === contest.title.toUpperCase()) === index
    );

    const contests =
      uniqueContests.length > 0
        ? uniqueContests.map((contest, index) => ({
            ...contest,
            end: index < uniqueContests.length - 1 ? uniqueContests[index + 1].start - 1 : lines.length - 1,
          }))
        : [{ id: 'contest-v2-all', title: 'Edital completo', start: 0, end: lines.length - 1 }];

    const subjectNameRegex =
      /(L[ií]ngua Portuguesa|Portugu[eê]s|Racioc[ií]nio L[oó]gico(?:-Matem[aá]tico)?|Matem[aá]tica|Inform[aá]tica|No[cç][oõ]es de Inform[aá]tica|Direito Constitucional|Direito Administrativo|Direito Penal|Direito Processual Penal|Direito Civil|Direito Processual Civil|Direitos Humanos|Legisla[cç][aã]o Especial|Atualidades|Hist[oó]ria|Geografia|Reda[cç][aã]o Oficial|Conhecimentos Espec[ií]ficos)/i;

    const parsed = contests.map((contest) => {
      const sectionLines = lines.slice(contest.start, contest.end + 1);
      let disciplinas = extractDisciplinesFromLines(sectionLines, contest.title);

      if (
        disciplinas.length <= 1 ||
        disciplinas.some((disciplina) => /conte[úu]do program[aá]tico/i.test(disciplina.nome))
      ) {
        const rebuilt = [];
        let currentDisciplina = null;

        sectionLines.forEach((line) => {
          if (isGenericHeading(line) || isLikelyContestLine(line)) return;

          const directSubject = line.match(subjectNameRegex);
          if (directSubject && line.length < 80) {
            currentDisciplina = { nome: directSubject[0], topicos: [] };
            rebuilt.push(currentDisciplina);
            return;
          }

          const isTopic =
            /^(\d+(\.\d+)*[.)]\s+|[-•]\s+|[a-z]\)\s+)/i.test(line) || line.length > 18;

          if (!isTopic) return;

          if (!currentDisciplina) {
            currentDisciplina = { nome: 'Conhecimentos Gerais', topicos: [] };
            rebuilt.push(currentDisciplina);
          }

          currentDisciplina.topicos.push(line.replace(/^[-•]\s+/, '').trim());
        });

        if (rebuilt.length > 0) {
          disciplinas = rebuilt.filter((disciplina) => disciplina.topicos.length > 0);
        }
      }

      disciplinas = disciplinas.map((disciplina) => ({
        ...disciplina,
        nome: normalizeSubjectNameForApp(disciplina.nome),
      }));

      return {
        ...contest,
        disciplinas,
        disciplinasCount: disciplinas.length,
        topicosCount: disciplinas.reduce((acc, item) => acc + item.topicos.length, 0),
      };
    });

    return {
      banca,
      contests: parsed,
      detectedContests: parsed.length,
    };
  };

  const createCourse = (courseData) => {
    assertCourseLimitAvailable();

    const courseIntent =
      courseData.intent ||
      courseData.tipo ||
      (courseData.origem === 'catalogo' || courseData.origem === 'ia' ? 'concurso' : 'livre');
    const isContestCourse = courseIntent === 'concurso';

    const novoCurso = {
      id: `curso-${Date.now()}`,
      nome: courseData.nome,
      plano: courseData.plano || courseData.nome,
      concurso: courseData.concurso || courseData.nome,
      intent: courseIntent,
      tipo: courseIntent,
      area: courseData.area || 'Geral',
      instituicao: courseData.instituicao || '',
      periodo: courseData.periodo || '',
      curso_superior: courseData.curso_superior || '',
      cargo: courseData.cargo || '',
      banca: courseData.banca || 'A definir',
      salario: courseData.salario || '',
      inscricao_valor: courseData.inscricao_valor || '',
      escolaridade: courseData.escolaridade || '',
      vagas: courseData.vagas || '',
      lotacao: courseData.lotacao || '',
      etapas: courseData.etapas || '',
      etapas_tags: courseData.etapas_tags || [],
      taf_itens: courseData.taf_itens || [],
      status_concurso: isContestCourse ? normalizeContestStatus(courseData.status_concurso || 'edital_publicado') : '',
      prova_data: courseData.prova_data || '',
      imagem_url: courseData.imagem_url || '',
      edital_url: courseData.edital_url || '',
      status: courseData.status || 'ativo',
      origem: courseData.origem || 'manual',
      cor: courseData.cor || '#1e3a5f',
    };

    setCursos((prev) => [novoCurso, ...prev]);
    return novoCurso;
  };

  const createCourseWithStarterSubjects = async (courseData) => {
    const novoCurso = createCourse(courseData);
    const starterSubjects = Array.isArray(courseData.subjects) ? courseData.subjects : [];

    if (starterSubjects.length === 0) {
      return novoCurso;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('Sessão expirada. Faça login novamente.');

    const palette = ['#1e3a5f', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];
    const novasDisciplinas = [];

    for (const [index, subjectTemplate] of starterSubjects.entries()) {
      const rawName = typeof subjectTemplate === 'string' ? subjectTemplate : subjectTemplate.nome;
      const disciplinaNome = normalizeSubjectNameForApp(rawName || `Disciplina ${index + 1}`);
      const subject = await insertSubjectWithCatalogFallback({
        user_id: user.id,
        nome: disciplinaNome,
        subject_catalog_id: resolveSubjectCatalogIdForApp(disciplinaNome),
        plano: novoCurso.plano,
        cor: subjectTemplate?.cor || palette[index % palette.length],
        percentual: 0,
        tempo_total_min: 0,
      });

      const topicosTemplate =
        typeof subjectTemplate === 'string'
          ? ['Leituras principais', 'Aulas e fichamentos', 'Exercicios e revisao']
          : subjectTemplate.topicos || ['Leituras principais', 'Aulas e fichamentos', 'Exercicios e revisao'];
      let topicosInseridos = [];

      if (topicosTemplate.length > 0) {
        const payloadTopicos = topicosTemplate.map((topico, topicIndex) => ({
          subject_id: subject.id,
          nome: typeof topico === 'string' ? topico : topico.nome,
          ordem: Number(typeof topico === 'string' ? topicIndex : topico.ordem ?? topicIndex),
          concluido: false,
          acertos: 0,
          erros: 0,
          percentual: 0,
        }));

        const { data: topicsData, error: topicsError } = await supabase
          .from('topics')
          .insert(payloadTopicos)
          .select('*');

        if (topicsError) throw topicsError;
        topicosInseridos = (topicsData || []).map((topic) => ({
          id: topic.id,
          nome: topic.nome,
          concluido: topic.concluido,
          acertos: Number(topic.acertos || 0),
          erros: Number(topic.erros || 0),
          percentual: Number(topic.percentual || 0),
          data: topic.data_conclusao || null,
          ordem: Number(topic.ordem || 0),
        }));
      }

      novasDisciplinas.push(buildUpdatedDiscipline(subject, topicosInseridos, 0));
    }

    setBancoDisciplinas((prev) => [...novasDisciplinas, ...prev]);
    return novoCurso;
  };

  const refreshContestLibrary = async () => {
    const templates = await loadContestCatalogFromSupabase(supabase, localConcursoCatalog);
    setContestLibrary(templates);
    return templates;
  };

  const refreshContestDrafts = async () => {
    const drafts = await loadContestDraftsFromSupabase(supabase);
    setContestDrafts(drafts);
    return drafts;
  };

  // Carrega disciplinas/tópicos de UM template sob demanda (lista vem sem eles).
  const loadTemplateContent = async (templateId) => {
    try {
      return await loadContestTemplateContent(supabase, templateId);
    } catch (error) {
      console.warn('[contestCatalog] falha ao carregar disciplinas do template', templateId, error?.message || error);
      return [];
    }
  };

  const refreshSubjectCatalog = async () => {
    const entries = await loadSubjectCatalogFromSupabase(supabase, localSubjectCatalog);
    setSubjectCatalog(entries);
    return entries;
  };

  const getStoragePathFromUrl = (url, bucket) => {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const safeUrl = String(url || '');
    const index = safeUrl.indexOf(marker);
    if (index === -1) return null;
    return safeUrl.slice(index + marker.length);
  };

  const buildTemplateSlug = (rawValue) =>
    String(rawValue || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

  const normalizeSubjectNameForApp = (value) => canonicalizeSubjectName(value, subjectCatalog);
  const resolveSubjectCatalogIdForApp = (value) =>
    resolveSubjectCatalogEntry(value, subjectCatalog)?.id || null;
  const shouldRetryWithoutSubjectCatalogId = (error) =>
    /subject_catalog_id/i.test(String(error?.message || error?.details || error?.hint || ''));
  const stripSubjectCatalogId = (payload) => {
    if (Array.isArray(payload)) {
      return payload.map((item) => {
        const next = { ...(item || {}) };
        delete next.subject_catalog_id;
        return next;
      });
    }

    const next = { ...(payload || {}) };
    delete next.subject_catalog_id;
    return next;
  };
  const insertSubjectWithCatalogFallback = async (payload) => {
    let { data, error } = await supabase.from('subjects').insert(payload).select('*').single();

    if (error && shouldRetryWithoutSubjectCatalogId(error)) {
      ({ data, error } = await supabase
        .from('subjects')
        .insert(stripSubjectCatalogId(payload))
        .select('*')
        .single());
    }

    if (error) throw error;
    return data;
  };

  const saveSubjectCatalogEntry = async (subjectData) => {
    await ensureAdminSession();

    const payload = {
      nome: String(subjectData.nome || '').trim(),
      area: subjectData.area || 'Geral',
      aliases: Array.isArray(subjectData.aliases)
        ? subjectData.aliases.map((item) => String(item || '').trim()).filter(Boolean)
        : [],
    };

    if (!payload.nome) {
      throw new Error('Digite o nome padrao da disciplina.');
    }

    if (subjectData?.id && String(subjectData.id).startsWith('subject-')) {
      const normalizedLocal = normalizeSubjectCatalogEntry(
        {
          ...subjectData,
          ...payload,
        },
        0
      );

      setSubjectCatalog((prev) => {
        const withoutLocal = prev.filter((item) => item.id !== subjectData.id);
        return [...withoutLocal, { ...normalizedLocal, storage: 'local' }].sort((first, second) =>
          first.nome.localeCompare(second.nome, 'pt-BR')
        );
      });
      return normalizedLocal;
    }

    let response;

    if (subjectData?.id) {
      response = await supabase
        .from('subject_catalog')
        .update(payload)
        .eq('id', subjectData.id)
        .select('*')
        .single();
    } else {
      response = await supabase
        .from('subject_catalog')
        .insert(payload)
        .select('*')
        .single();
    }

    if (response.error) throw response.error;

    await refreshSubjectCatalog();
    return response.data;
  };

  const deleteSubjectCatalogEntry = async (subjectData) => {
    await ensureAdminSession();

    if (!subjectData?.id) return;

    if (String(subjectData.id).startsWith('subject-')) {
      setSubjectCatalog((prev) => prev.filter((item) => item.id !== subjectData.id));
      return;
    }

    const { error } = await supabase.from('subject_catalog').delete().eq('id', subjectData.id);
    if (error) throw error;

    await refreshSubjectCatalog();
  };

  const getCourseLimitFromProfile = (profile) => {
    if (!profile) return 3;
    if ((profile.role || 'student') === 'admin') return 999;

    if (typeof profile.max_courses === 'number' && !Number.isNaN(profile.max_courses)) {
      return profile.max_courses;
    }

    const plan = String(profile.subscription_plan || 'gratuito').toLowerCase();
    if (['papiro', 'elite', 'beta'].includes(plan)) return 30;
    if (plan === 'tatico') return 8; // alias legado (tier intermediário antigo)
    return 3;
  };

  const assertCourseLimitAvailable = () => {
    if (isAdmin) return;

    const currentLimit = getCourseLimitFromProfile(currentProfile);
    const countedCourses = cursos.filter((course) => course.origem !== 'inferido').length;

    if (countedCourses >= currentLimit) {
      throw new Error(`Limite de cursos atingido no seu plano atual. Seu limite hoje e ${currentLimit} curso(s).`);
    }
  };

  const syncAuthSessionState = (session = null) => {
    const user = session?.user || null;
    setIsAuthenticated(Boolean(session && user));
    setCurrentAuthUser(user);
    setCurrentUserId(user?.id || '');
    setCurrentUserEmail(user?.email || '');
    setCurrentUserAccessToken(session?.access_token || '');
  };

  const refreshAuthSessionForAction = async (session = null) => {
    if (!session?.refresh_token) return null;

    const { data, error } = await supabase.auth.refreshSession(session);
    if (error || !data?.session?.access_token) return null;

    syncAuthSessionState(data.session);
    return data.session;
  };

  const ensureAdminSession = async () => {
    const sessionEmail = currentAuthUser?.email || currentUserEmail || currentProfile?.email || '';
    if (!isAdmin && !isAdminIdentity(currentProfile, sessionEmail)) {
      throw new Error('Apenas administradores podem cadastrar concursos.');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      // JWT corrompido no storage local → limpa e pede novo login
      const msg = String(sessionError?.message || '').toLowerCase();
      if (msg.includes('claim') || msg.includes('jwt') || msg.includes('token') || msg.includes('sub')) {
        clearInvalidSupabaseAuthStorage();
        syncAuthSessionState(null);
        throw new Error('Sua sessao expirou ou ficou corrompida. Saia e entre novamente para continuar.');
      }
      throw sessionError;
    }

    let session = sessionData?.session || null;
    if (!session?.access_token) {
      session = await refreshAuthSessionForAction(session);
    }

    if (session?.access_token) {
      syncAuthSessionState(session);
      return session;
    }

    if (currentUserAccessToken && (currentAuthUser?.id || currentUserId)) {
      return {
        access_token: currentUserAccessToken,
        user: currentAuthUser || { id: currentUserId, email: sessionEmail },
      };
    }

    clearInvalidSupabaseAuthStorage();
    syncAuthSessionState(null);
    throw new Error('Sessao expirada. Faca login novamente para continuar.');
  };

  const uploadContestAsset = async ({ file, bucket, existingUrl = '' }) => {
    const adminSession = await ensureAdminSession();

    if (!file) throw new Error('Selecione um arquivo antes de enviar.');

    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const type = String(file.type || '').toLowerCase();
    const size = Number(file.size || 0);
    const isImageBucket = bucket === 'contest-images';
    const allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp'];

    let uploadFile = file;

    if (isImageBucket) {
      if (!allowedImageTypes.includes(type) || !['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
        throw new Error('Envie uma imagem PNG, JPG ou WebP.');
      }
      if (size > 3 * 1024 * 1024) throw new Error('A imagem deve ter no maximo 3 MB.');
      // Comprime/redimensiona no navegador antes de enviar (logo ~900KB -> ~10KB).
      // Falha de compressao retorna o original, entao nao quebra o upload.
      uploadFile = await compressImage(file, { maxSize: 512, quality: 0.85 });
    } else {
      if (type !== 'application/pdf' || extension !== 'pdf') {
        throw new Error('Envie um arquivo PDF valido.');
      }
      if (size > 25 * 1024 * 1024) throw new Error('O PDF deve ter no maximo 25 MB.');
    }

    return uploadContestAssetAdmin({
      file: uploadFile,
      kind: isImageBucket ? 'image' : 'edital',
      existingUrl,
      adminEmail: adminSession?.user?.email || currentUserEmail || currentProfile?.email || '',
    });
  };

  const saveContestTemplate = async (templateData, existingTemplate = null) => {
    const adminSession = await ensureAdminSession();

    // Caminho preferido: API administrativa com service_role (bypassa RLS).
    try {
      const saved = await saveContestTemplateAdmin({
        templateData,
        existingId: existingTemplate?.id || null,
        accessToken: adminSession?.access_token || currentUserAccessToken,
        adminEmail: adminSession?.user?.email || currentUserEmail || currentProfile?.email || '',
      });
      await refreshContestLibrary();
      return saved;
    } catch (apiError) {
      console.error('[contest_templates] API admin falhou:', apiError?.message || apiError);
      // Propaga o erro real — nao tenta Supabase direto (sempre cai em RLS).
      throw new Error(apiError?.message || 'Nao foi possivel salvar o concurso pela API administrativa.');
    }

  };

  const createContestTemplate = async (templateData) => {
    await saveContestTemplate(templateData);
  };

  const updateContestTemplate = async (templateData) => {
    if (!templateData?.id) throw new Error('Template invalido para edicao.');
    await saveContestTemplate(
      {
        nome: templateData.nome,
        plano: templateData.plano || templateData.nome,
        concurso: templateData.concurso || templateData.nome,
        area: templateData.area || 'Geral',
        cargo: templateData.cargo || '',
        banca: templateData.banca || 'A definir',
        salario: templateData.salario || null,
        inscricao_valor: templateData.inscricao_valor || null,
        escolaridade: templateData.escolaridade || null,
        vagas: templateData.vagas || null,
        lotacao: templateData.lotacao || null,
        etapas: templateData.etapas || null,
        etapas_tags: templateData.etapas_tags || [],
        taf_itens: templateData.taf_itens || [],
        cor: templateData.cor || '#1e3a5f',
        descricao: templateData.descricao || null,
        imagem_url: templateData.imagem_url || null,
        edital_url: templateData.edital_url || null,
        prova_data: templateData.prova_data || null,
        status_concurso: normalizeContestStatus(templateData.status_concurso || 'edital_publicado'),
        is_public: templateData.is_public,
        disciplinas: templateData.disciplinas || [],
        slug: templateData.slug,
      },
      templateData
    );
  };

  const duplicateContestTemplate = async (templateData) => {
    if (!templateData) throw new Error('Template invalido para duplicacao.');

    await createContestTemplate({
      ...templateData,
      id: null,
      slug: '',
      nome: `${templateData.nome} (Copia)`,
      plano: `${templateData.plano || templateData.nome} - Copia`,
      is_public: false,
      status_concurso: normalizeContestStatus(templateData.status_concurso || 'edital_publicado'),
      disciplinas: (templateData.disciplinas || []).map((subject) => ({
        nome: subject.nome,
        cor: subject.cor || '',
        ordem: subject.ordem,
        topicos: (subject.topicos || []).map((topic) => ({
          nome: typeof topic === 'string' ? topic : topic.nome,
          ordem: typeof topic === 'string' ? 0 : topic.ordem,
        })),
      })),
    });
  };

  const promoteContestTemplate = async (templateData) => {
    await ensureAdminSession();

    const slug = buildTemplateSlug(templateData.slug || templateData.nome) || `template-${Date.now()}`;
    const { data: existingRow, error } = await supabase
      .from('contest_templates')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;

    const saved = await saveContestTemplate(
      {
        nome: templateData.nome,
        plano: templateData.plano || templateData.nome,
        concurso: templateData.concurso || templateData.nome,
        area: templateData.area || 'Geral',
        cargo: templateData.cargo || '',
        banca: templateData.banca || 'A definir',
        salario: templateData.salario || null,
        inscricao_valor: templateData.inscricao_valor || null,
        escolaridade: templateData.escolaridade || null,
        vagas: templateData.vagas || null,
        lotacao: templateData.lotacao || null,
        etapas: templateData.etapas || null,
        etapas_tags: templateData.etapas_tags || [],
        taf_itens: templateData.taf_itens || [],
        cor: templateData.cor || '#1e3a5f',
        descricao: templateData.descricao || null,
        imagem_url: templateData.imagem_url || null,
        edital_url: templateData.edital_url || null,
        prova_data: templateData.prova_data || null,
        status_concurso: normalizeContestStatus(templateData.status_concurso || 'edital_publicado'),
        is_public: templateData.is_public,
        disciplinas: templateData.disciplinas || [],
        slug,
      },
      existingRow || null
    );

    return saved;
  };

  const uploadContestImage = async ({ file, currentUrl = '' }) =>
    uploadContestAsset({
      file,
      bucket: 'contest-images',
      folder: 'contest-images',
      existingUrl: currentUrl,
    });

  const uploadContestEdital = async ({ file, currentUrl = '' }) =>
    uploadContestAsset({
      file,
      bucket: 'contest-edital-files',
      folder: 'contest-edital-files',
      existingUrl: currentUrl,
    });

  const removeContestAsset = async ({ url, bucket }) => {
    await ensureAdminSession();

    const path = getStoragePathFromUrl(url, bucket);
    if (!path) return;

    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  };

  const removeContestImage = async ({ url }) => removeContestAsset({ url, bucket: 'contest-images' });
  const removeContestEdital = async ({ url }) => removeContestAsset({ url, bucket: 'contest-edital-files' });

  const updateAdminProfile = async (profileData) => {
    const payload = {
      role: profileData.role || 'student',
      subscription_plan: profileData.subscription_plan || 'gratuito',
      subscription_status: profileData.subscription_status || 'trial',
      max_courses: Number(profileData.max_courses || 3),
      nome: profileData.nome || '',
      email: profileData.email || '',
      celular: profileData.celular || '',
    };

    setAdminProfiles((prev) =>
      prev.map((profile) => (profile.id === profileData.id ? { ...profile, ...payload } : profile))
    );
  };

  const saveAdminExpense = async (expenseData) => {
    await ensureAdminSession();
    const payload = normalizeExpense(expenseData);
    const dbPayload = {
      descricao: payload.descricao,
      categoria: payload.categoria,
      valor: payload.valor,
      competencia: payload.competencia,
      status: payload.status,
      observacao: payload.observacao,
    };

    const query = payload.id
      ? supabase
          .from('admin_finance_expenses')
          .upsert({ ...dbPayload, id: payload.id }, { onConflict: 'id' })
      : supabase.from('admin_finance_expenses').insert(dbPayload);

    const { data, error } = await query.select('*').single();

    if (error) throw error;

    const normalizedSaved = {
      id: data.id,
      descricao: data.descricao || '',
      categoria: data.categoria || 'operacao',
      valor: Number(data.valor || 0),
      competencia: data.competencia || '',
      status: data.status || 'paga',
      observacao: data.observacao || '',
      created_at: data.created_at || null,
    };

    setAdminExpenses((prev) => {
      const exists = prev.some((expense) => expense.id === normalizedSaved.id);
      const next = exists
        ? prev.map((expense) => (expense.id === normalizedSaved.id ? normalizedSaved : expense))
        : [normalizedSaved, ...prev];

      return next.sort((first, second) => {
        if (first.competencia !== second.competencia) {
          return String(second.competencia).localeCompare(String(first.competencia));
        }

        return String(second.created_at || '').localeCompare(String(first.created_at || ''));
      });
    });
  };

  const deleteAdminExpense = async (expenseData) => {
    await ensureAdminSession();
    const { error } = await supabase.from('admin_finance_expenses').delete().eq('id', expenseData.id);
    if (error) throw error;
    setAdminExpenses((prev) => prev.filter((expense) => expense.id !== expenseData.id));
  };

  const saveAdminLead = async (leadData) => {
    await ensureAdminSession();
    const payload = normalizeLead(leadData);
    const dbPayload = {
      nome: payload.nome,
      contato: payload.contato,
      canal: payload.canal,
      interesse: payload.interesse,
      stage: payload.stage,
      monthly_value: payload.monthly_value,
      observacao: payload.observacao,
    };

    const query = payload.id
      ? supabase.from('admin_crm_leads').upsert({ ...dbPayload, id: payload.id }, { onConflict: 'id' })
      : supabase.from('admin_crm_leads').insert(dbPayload);

    const { data, error } = await query.select('*').single();

    if (error) throw error;

    const normalizedSaved = normalizeLead(data);
    setAdminLeads((prev) => {
      const exists = prev.some((lead) => lead.id === normalizedSaved.id);
      const next = exists
        ? prev.map((lead) => (lead.id === normalizedSaved.id ? normalizedSaved : lead))
        : [normalizedSaved, ...prev];

      return next.sort((first, second) => String(second.created_at || '').localeCompare(String(first.created_at || '')));
    });
  };

  const deleteAdminLead = async (leadData) => {
    await ensureAdminSession();
    const { error } = await supabase.from('admin_crm_leads').delete().eq('id', leadData.id);
    if (error) throw error;
    setAdminLeads((prev) => prev.filter((lead) => lead.id !== leadData.id));
  };

  const deleteContestTemplate = async (template) => {
    await ensureAdminSession();

    if (template.storage !== 'supabase') {
      const promoted = await promoteContestTemplate(template);
      if (!promoted?.id) {
        throw new Error('Nao foi possivel migrar esse concurso para o Supabase antes da exclusao.');
      }

      template = { ...template, ...promoted, storage: 'supabase' };
    }

    const { data: deletedRows, error } = await supabase
      .from('contest_templates')
      .delete()
      .eq('id', template.id)
      .select('id, slug');
    if (error) throw error;

    let removedRows = Array.isArray(deletedRows) ? deletedRows : [];

    if (removedRows.length === 0) {
      const rpcPayload = {
        p_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          String(template.id || '')
        )
          ? template.id
          : null,
        p_slug: template.slug || null,
      };

      const { data: rpcRows, error: rpcError } = await supabase.rpc('admin_delete_contest_template', rpcPayload);
      if (rpcError) throw rpcError;
      removedRows = Array.isArray(rpcRows) ? rpcRows : [];
    }

    if (removedRows.length === 0) {
      throw new Error('O concurso não foi removido. Recarregue a lista e confira se ele ainda existe no Supabase.');
    }

    setContestLibrary((prev) =>
      prev.filter(
        (item) =>
          String(item.id || '') !== String(template.id || '') &&
          String(item.slug || '') !== String(template.slug || '')
      )
    );

    await refreshContestLibrary();
  };

  const createCourseFromCatalog = async (template) => {
    const novoCurso = createCourse({
      slug: template.slug,
      nome: template.nome,
      plano: template.plano,
      concurso: template.concurso,
      area: template.area,
      cargo: template.cargo,
      banca: template.banca,
      salario: template.salario,
      inscricao_valor: template.inscricao_valor,
      escolaridade: template.escolaridade,
      vagas: template.vagas,
      lotacao: template.lotacao,
      etapas: template.etapas,
      etapas_tags: template.etapas_tags,
      taf_itens: template.taf_itens,
      status_concurso: template.status_concurso,
      prova_data: template.prova_data,
      imagem_url: template.imagem_url,
      edital_url: template.edital_url,
      status: template.status || 'ativo',
      origem: 'catalogo',
      cor: template.cor || '#1e3a5f',
    });

    if (currentUserId) {
      addUserContest(currentUserId, {
        slug: template.slug,
        nome: template.nome,
        banca: template.banca,
        area: template.area,
        isTarget: false,
      }).catch(console.warn);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('Sessão expirada. Faça login novamente.');

    const palette = ['#1e3a5f', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];
    const novasDisciplinas = [];
    let totalTopicosCriados = 0;

    for (const [index, disciplinaTemplate] of (template.disciplinas || []).entries()) {
      const disciplinaNome = normalizeSubjectNameForApp(
        typeof disciplinaTemplate === 'string' ? disciplinaTemplate : disciplinaTemplate.nome
      );
      const topicosTemplate =
        typeof disciplinaTemplate === 'string' ? [] : disciplinaTemplate.topicos || [];

      const subject = await insertSubjectWithCatalogFallback({
        user_id: user.id,
        nome: disciplinaNome,
        subject_catalog_id: resolveSubjectCatalogIdForApp(disciplinaNome),
        plano: novoCurso.plano,
        cor: disciplinaTemplate?.cor || palette[index % palette.length],
        percentual: 0,
        tempo_total_min: 0,
      });

      let topicosInseridos = [];

      if (topicosTemplate.length > 0) {
        const payloadTopicos = topicosTemplate.map((topico, topicIndex) => ({
          subject_id: subject.id,
          nome: typeof topico === 'string' ? topico : topico.nome,
          ordem: Number(typeof topico === 'string' ? topicIndex : topico.ordem ?? topicIndex),
          concluido: false,
          acertos: 0,
          erros: 0,
          percentual: 0,
        }));

        const { data: topicsData, error: topicsError } = await supabase
          .from('topics')
          .insert(payloadTopicos)
          .select('*');

        if (topicsError) throw topicsError;
        topicosInseridos = (topicsData || []).map((topic) => ({
          id: topic.id,
          nome: topic.nome,
          concluido: topic.concluido,
          acertos: Number(topic.acertos || 0),
          erros: Number(topic.erros || 0),
          percentual: Number(topic.percentual || 0),
          data: topic.data_conclusao || null,
          ordem: Number(topic.ordem || 0),
        }));
      }

      novasDisciplinas.push({
        ...subject,
        tempo: '0h 00m',
        topicosTot: topicosInseridos.length,
        topicos: topicosInseridos,
      });

      totalTopicosCriados += topicosInseridos.length;
    }

    setBancoDisciplinas((prev) => [...novasDisciplinas, ...prev]);

    return {
      curso: novoCurso,
      disciplinasCriadas: novasDisciplinas.length,
      topicosCriados: totalTopicosCriados,
      source: 'catalogo',
    };
  };

  const _importEditalWithAI = async ({ courseData, editalText }) => {
    const normalizedText = String(editalText || '').replace(/\r/g, '').trim();
    if (!normalizedText) {
      throw new Error('Cole o texto do edital para a IA estruturar.');
    }

    const lines = normalizedText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const blocks = [];
    let currentBlock = null;

    const looksLikeDiscipline = (line) => {
      const clean = line.replace(/^disciplina[:\s-]*/i, '').trim();
      const upper = clean.toUpperCase();
      return clean === upper && /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(clean);
    };

    const looksLikeTopic = (line) =>
      /^(\d+(\.\d+)*[.)]\s+|[-•]\s+|[a-z]\)\s+)/i.test(line) || line.length > 12;

    lines.forEach((line) => {
      if (looksLikeDiscipline(line)) {
        currentBlock = {
          nome: line.replace(/^disciplina[:\s-]*/i, '').trim(),
          topicos: [],
        };
        blocks.push(currentBlock);
        return;
      }

      if (!currentBlock) {
        currentBlock = {
          nome: courseData?.fallbackDisciplineName || 'Conteúdo Programático',
          topicos: [],
        };
        blocks.push(currentBlock);
      }

      if (looksLikeTopic(line)) {
        currentBlock.topicos.push(line.replace(/^[-•]\s+/, '').trim());
      }
    });

    const disciplinasExtraidas = blocks
      .map((block) => ({
        ...block,
        nome: normalizeSubjectNameForApp(block.nome || 'Disciplina sem nome'),
        topicos: block.topicos.filter(Boolean),
      }))
      .filter((block) => block.topicos.length > 0);

    if (disciplinasExtraidas.length === 0) {
      throw new Error('A IA não conseguiu montar disciplinas e tópicos a partir desse texto.');
    }

    const novoCurso = createCourse({
      ...courseData,
      plano: courseData.plano || courseData.nome,
      origem: 'ia',
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('Sessão expirada. Faça login novamente.');

    const novasDisciplinas = [];
    const palette = ['#1e3a5f', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];

    for (const [index, block] of disciplinasExtraidas.entries()) {
      const subjectNome = normalizeSubjectNameForApp(block.nome);
      const subject = await insertSubjectWithCatalogFallback({
        user_id: user.id,
        nome: subjectNome,
        subject_catalog_id: resolveSubjectCatalogIdForApp(subjectNome),
        plano: novoCurso.plano,
        cor: palette[index % palette.length],
        percentual: 0,
        tempo_total_min: 0,
      });

      const topicosCriados = [];

      for (const [topicIndex, topicName] of block.topicos.entries()) {
        const { data: topic, error: topicError } = await supabase
          .from('topics')
          .insert({
            subject_id: subject.id,
            nome: topicName,
            ordem: topicIndex + 1,
            concluido: false,
            acertos: 0,
            erros: 0,
            percentual: 0,
            data_conclusao: null,
          })
          .select('*')
          .single();

        if (topicError) throw topicError;
        topicosCriados.push({ ...topic, data: null });
      }

      novasDisciplinas.push(buildUpdatedDiscipline(subject, topicosCriados, 0));
    }

    setBancoDisciplinas((prev) => [...prev, ...novasDisciplinas]);

    return {
      curso: novoCurso,
      disciplinasCriadas: novasDisciplinas.length,
      topicosCriados: novasDisciplinas.reduce((acc, item) => acc + item.topicos.length, 0),
    };
  };

  const importSelectedEditalWithAI = async ({
    courseData,
    editalText,
    selectedContestId,
    analysisResult,
  }) => {
    const analysis =
      analysisResult?.contests?.length > 0 ? analysisResult : analyzeEditalDocument(editalText);
    const contestSelecionado =
      analysis.contests.find((contest) => contest.id === selectedContestId) || analysis.contests[0];

    if (!contestSelecionado) {
      throw new Error('A IA não conseguiu identificar um concurso válido para importar.');
    }

    if (!contestSelecionado.disciplinas || contestSelecionado.disciplinas.length === 0) {
      throw new Error('A IA não conseguiu identificar disciplinas reais nesse edital.');
    }

    const nomeCurso =
      courseData?.nome?.trim() ||
      (contestSelecionado.title !== 'Edital completo' ? contestSelecionado.title : 'Novo curso por edital');

    const novoCurso = createCourse({
      ...courseData,
      nome: nomeCurso,
      plano: courseData?.plano || nomeCurso,
      concurso: courseData?.concurso || contestSelecionado.title || nomeCurso,
      banca: courseData?.banca || analysis.banca || 'A definir',
      origem: 'ia',
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('Sessão expirada. Faça login novamente.');

    const novasDisciplinas = [];
    const palette = ['#1e3a5f', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];

    for (const [index, block] of contestSelecionado.disciplinas.entries()) {
      const subjectNome = normalizeSubjectNameForApp(block.nome);
      const subject = await insertSubjectWithCatalogFallback({
        user_id: user.id,
        nome: subjectNome,
        subject_catalog_id: resolveSubjectCatalogIdForApp(subjectNome),
        plano: novoCurso.plano,
        cor: palette[index % palette.length],
        percentual: 0,
        tempo_total_min: 0,
      });

      const topicosCriados = [];

      for (const [topicIndex, topicName] of block.topicos.entries()) {
        const { data: topic, error: topicError } = await supabase
          .from('topics')
          .insert({
            subject_id: subject.id,
            nome: topicName,
            ordem: topicIndex + 1,
            concluido: false,
            acertos: 0,
            erros: 0,
            percentual: 0,
            data_conclusao: null,
          })
          .select('*')
          .single();

        if (topicError) throw topicError;
        topicosCriados.push({ ...topic, data: null });
      }

      novasDisciplinas.push(buildUpdatedDiscipline(subject, topicosCriados, 0));
    }

    setBancoDisciplinas((prev) => [...prev, ...novasDisciplinas]);

    return {
      curso: novoCurso,
      disciplinasCriadas: novasDisciplinas.length,
      topicosCriados: novasDisciplinas.reduce((acc, item) => acc + item.topicos.length, 0),
      concursosDetectados: analysis.detectedContests,
      concursoImportado: contestSelecionado.title,
      bancaDetectada: analysis.banca,
    };
  };

  // Importa disciplinas da análise da IA (Edital.jsx, shape flat {nome, topicos[]})
  // para o plano de um concurso JÁ existente — sem criar curso novo.
  const handleImportEditalDisciplinas = async ({ disciplinas, plano }) => {
    const blocks = (Array.isArray(disciplinas) ? disciplinas : [])
      .map((d) => ({
        nome: normalizeSubjectNameForApp(String(d?.nome || '').trim()),
        topicos: Array.isArray(d?.topicos) ? d.topicos.map((t) => String(t || '').trim()).filter(Boolean) : [],
      }))
      .filter((d) => d.nome);

    if (blocks.length === 0) {
      throw new Error('A IA não identificou disciplinas para importar.');
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Sessão expirada. Faça login novamente.');

    const planoAlvo = String(plano || '').trim() || 'Geral';
    const palette = ['#1e3a5f', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];
    const novasDisciplinas = [];

    for (const [index, block] of blocks.entries()) {
      const subject = await insertSubjectWithCatalogFallback({
        user_id: user.id,
        nome: block.nome,
        subject_catalog_id: resolveSubjectCatalogIdForApp(block.nome),
        plano: planoAlvo,
        cor: palette[index % palette.length],
        percentual: 0,
        tempo_total_min: 0,
      });

      const topicosCriados = [];
      for (const [topicIndex, topicName] of block.topicos.entries()) {
        const { data: topic, error: topicError } = await supabase
          .from('topics')
          .insert({
            subject_id: subject.id,
            nome: topicName,
            ordem: topicIndex + 1,
            concluido: false,
            acertos: 0,
            erros: 0,
            percentual: 0,
            data_conclusao: null,
          })
          .select('*')
          .single();
        if (topicError) throw topicError;
        topicosCriados.push({ ...topic, data: null });
      }

      novasDisciplinas.push(buildUpdatedDiscipline(subject, topicosCriados, 0));
    }

    setBancoDisciplinas((prev) => [...prev, ...novasDisciplinas]);
    return {
      disciplinasCriadas: novasDisciplinas.length,
      topicosCriados: novasDisciplinas.reduce((acc, item) => acc + item.topicos.length, 0),
    };
  };

  const deleteCourse = async (curso) => {
    const courseKeys = new Set(
      [curso.plano, curso.nome, curso.concurso].map((value) => String(value || '').trim()).filter(Boolean)
    );
    const matchesCourse = (item) =>
      [item?.plano, item?.nome, item?.concurso]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .some((value) => courseKeys.has(value));

    const disciplinasRelacionadas = bancoDisciplinas.filter((disciplina) => {
      const disciplinaPlano = String(disciplina.plano || '').trim();
      return courseKeys.has(disciplinaPlano);
    });
    const totalTopicos = disciplinasRelacionadas.reduce(
      (acc, disciplina) => acc + (disciplina.topicos?.length || 0),
      0
    );

    const confirmar = await showConfirm(
      `Você perderá ${disciplinasRelacionadas.length} disciplina(s), ${totalTopicos} tópicos e todo o progresso desse objetivo. Essa ação não pode ser desfeita.`,
      { title: `Excluir "${curso.nome}"?`, confirmLabel: 'Excluir', danger: true }
    );
    if (!confirmar) return;

    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const subjectIds = disciplinasRelacionadas
        .map((disciplina) => disciplina.id)
        .filter((id) => uuidRegex.test(String(id || '')));

      if (subjectIds.length > 0) {
        const { error: subjectsError } = await supabase.from('subjects').delete().in('id', subjectIds);
        if (subjectsError) {
          console.warn('Falha ao apagar disciplinas no Supabase. Seguindo com limpeza local.', subjectsError);
        }
      }

      setCursos((prev) => prev.filter((item) => !matchesCourse(item)));
      setBancoDisciplinas((prev) =>
        prev.filter((disciplina) => !courseKeys.has(String(disciplina.plano || '').trim()))
      );
      setHistoricoReal((prev) =>
        prev.filter((registro) => !courseKeys.has(String(registro.plano || '').trim()))
      );

      if (courseKeys.has(String(viewingDiscipline?.plano || '').trim())) {
        setViewingDiscipline(null);
      }

      if (courseKeys.has(String(selectedCoursePlan || '').trim())) {
        setSelectedCoursePlan('Todos');
      }

      setPlanningCoursePlans((prev) =>
        prev.filter((plan) => !courseKeys.has(String(plan || '').trim()))
      );

      if (courseKeys.has(String(targetContestSummary?.plano || '').trim())) {
        setTargetContestId('');
      }
    } catch (error) {
      console.error('Erro ao excluir curso:', error);
      setCursos((prev) => prev.filter((item) => !matchesCourse(item)));
      setBancoDisciplinas((prev) =>
        prev.filter((disciplina) => !courseKeys.has(String(disciplina.plano || '').trim()))
      );
      setHistoricoReal((prev) =>
        prev.filter((registro) => !courseKeys.has(String(registro.plano || '').trim()))
      );
      setPlanningCoursePlans((prev) =>
        prev.filter((plan) => !courseKeys.has(String(plan || '').trim()))
      );
      if (courseKeys.has(String(targetContestSummary?.plano || '').trim())) {
        setTargetContestId('');
      }
      showToast('Objetivo removido, mas houve falha ao limpar parte dos dados remotos.', 'warn');
    }
  };


  const adicionarNovoEstudo = async (novoRegistro) => {
    const normalizedRecord = normalizeStudyRecord(novoRegistro, subjectCatalog);
    setHistoricoReal((prev) => [normalizedRecord, ...prev]);

    if (currentUserId) {
      saveStudySession(currentUserId, normalizedRecord).catch(console.warn);
    }

    setRegistroEstudoModalOpen(false);
  };

  const registrarEstudoNoApp = async (novoRegistro) => {
    const normalizedRecord = normalizeStudyRecord(novoRegistro, subjectCatalog);
    setHistoricoReal((prev) => [normalizedRecord, ...prev]);

    if (!normalizedRecord.disciplinaId || !normalizedRecord.topicoId) {
      setRegistroEstudoModalOpen(false);
      return;
    }

    const disciplina = bancoDisciplinas.find((item) => item.id === normalizedRecord.disciplinaId);
    const topico = disciplina?.topicos?.find((item) => item.id === normalizedRecord.topicoId);

    if (!disciplina || !topico) {
      setRegistroEstudoModalOpen(false);
      return;
    }

    const minutosAdicionados = parseStudyTimeToMinutes(normalizedRecord.tempo);
    const acertosAtualizados = Number(topico.acertos || 0) + Number(normalizedRecord.acertos || 0);
    const errosAtualizados = Number(topico.erros || 0) + Number(normalizedRecord.erros || 0);
    const totalQuestoes = acertosAtualizados + errosAtualizados;
    const percentualTopico = totalQuestoes > 0 ? Math.round((acertosAtualizados / totalQuestoes) * 100) : 0;
    const tempoTotalMin = Number(disciplina.tempo_total_min || 0) + minutosAdicionados;
    const topicosAnteriores = Array.isArray(disciplina.topicos) ? disciplina.topicos : [];
    const percentualAnterior = Number(disciplina.percentual || 0);
    const discId = normalizedRecord.disciplinaId;

    const topicosAtualizados = topicosAnteriores.map((item) =>
      item.id === normalizedRecord.topicoId
        ? {
            ...item,
            acertos: acertosAtualizados,
            erros: errosAtualizados,
            percentual: percentualTopico,
          }
        : item
    );

    const disciplinaAtualizada = buildUpdatedDiscipline(disciplina, topicosAtualizados, tempoTotalMin);

    const { error: topicError } = await supabase
      .from('topics')
      .update({
        acertos: acertosAtualizados,
        erros: errosAtualizados,
        percentual: percentualTopico,
      })
      .eq('id', normalizedRecord.topicoId);

    if (topicError) {
      setBancoDisciplinas((prev) =>
        prev.map((item) => {
          if (item.id !== discId) return item;

          return {
            ...item,
            percentual: percentualAnterior,
            topicosTot: topicosAnteriores.length,
            topicos: topicosAnteriores,
          };
        })
      );
      console.error('Erro ao atualizar desempenho do tópico:', topicError);
    }

    const { error: subjectError } = await supabase
      .from('subjects')
      .update({
        tempo_total_min: tempoTotalMin,
        percentual: disciplinaAtualizada.percentual,
      })
      .eq('id', normalizedRecord.disciplinaId);

    if (subjectError) {
      console.error('Erro ao atualizar disciplina após estudo:', subjectError);
    }

    setBancoDisciplinas((prev) =>
      prev.map((item) => (item.id === normalizedRecord.disciplinaId ? disciplinaAtualizada : item))
    );

    // Persiste a sessão de estudo no Supabase
    if (currentUserId) {
      const { error: sessionError } = await supabase.from('study_sessions').insert({
        user_id: currentUserId,
        disciplina: normalizedRecord.disciplina || '',
        disciplina_canonica: normalizedRecord.disciplinaCanonica || normalizedRecord.disciplina || '',
        disciplina_id: normalizedRecord.disciplinaId || null,
        topico: normalizedRecord.topico || '',
        topico_id: normalizedRecord.topicoId || null,
        plano: normalizedRecord.plano || 'Geral',
        tipo: normalizedRecord.tipo || 'ESTUDO',
        tempo: normalizedRecord.tempo || '00:00:00',
        acertos: Number(normalizedRecord.acertos || 0),
        erros: Number(normalizedRecord.erros || 0),
        data: normalizedRecord.data || new Date().toISOString().split('T')[0],
      });

      if (sessionError) {
        console.error('[study_sessions] Erro ao salvar sessão:', sessionError.message);
      }
    }

    setRegistroEstudoModalOpen(false);
  };

  const saveSimuladoNoApp = async (simulado) => {
    const safeRows = Array.isArray(simulado?.rows) ? simulado.rows : [];
    const baseDate = simulado?.data || new Date().toISOString().split('T')[0];
    const baseName = simulado?.nome || 'Simulado externo';
    const baseTempo = simulado?.tempo || '00:00:00';
    const baseBanca = simulado?.banca ? ` | ${simulado.banca}` : '';
    const comments = simulado?.comentarios ? ` | ${simulado.comentarios}` : '';
    const totalAcertos = safeRows.reduce((acc, row) => acc + Number(row?.acertos || 0), 0);
    const totalErros = safeRows.reduce((acc, row) => acc + Number(row?.erros || 0), 0);
    const totalBrancos = safeRows.reduce((acc, row) => acc + Number(row?.brancos || 0), 0);
    const totalQuestoes = totalAcertos + totalErros + totalBrancos;
    const novoRegistro = {
      id: simulado?.id || `simulado-${Date.now()}`,
      nome: baseName,
      data: baseDate,
      estilo: simulado?.estilo || '',
      banca: simulado?.banca || '',
      tempo: baseTempo,
      comentarios: simulado?.comentarios || '',
      rows: safeRows,
      acertos: totalAcertos,
      erros: totalErros,
      brancos: totalBrancos,
      totalQuestoes,
      desempenho: totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0,
      notaLiquida: Number((totalAcertos - totalErros).toFixed(2)),
    };

    setSimuladosDB((prev) => [novoRegistro, ...prev.filter((item) => item.id !== novoRegistro.id)]);
    setSimuladoStats((prev) => {
      const previousTotal = Number(prev?.total || 0);
      const nextTotal = previousTotal + 1;
      const previousAverage = Number(prev?.mediaDesempenho || 0);
      const nextAverage = nextTotal > 0
        ? Math.round(((previousAverage * previousTotal) + Number(novoRegistro.desempenho || 0)) / nextTotal)
        : 0;

      return {
        total: nextTotal,
        mediaDesempenho: nextAverage,
        melhorNota: Math.max(Number(prev?.melhorNota || 0), Number(novoRegistro.desempenho || 0)),
      };
    });

    for (const row of safeRows) {
      const totalQuestoesRow = Number(row?.acertos || 0) + Number(row?.erros || 0) + Number(row?.brancos || 0);
      if (!row?.disciplina || totalQuestoesRow <= 0) continue;

      await adicionarNovoEstudo({
        id: `${Date.now()}-${row.id}`,
        disciplina: row.disciplina,
        topico: row.topico || 'Resultado geral',
        material: `${baseName}${baseBanca}${comments}`.trim(),
        tempo: baseTempo,
        acertos: Number(row.acertos || 0),
        erros: Number(row.erros || 0),
        brancos: Number(row.brancos || 0),
        desempenho:
          totalQuestoesRow > 0 ? Math.round((Number(row.acertos || 0) / totalQuestoesRow) * 100) : 0,
        tipo: 'SIMULADO',
        cor: '#10B981',
        data: baseDate,
        plano: 'Simulados',
      });
    }

    if (currentUserId) {
      saveSimulado(currentUserId, novoRegistro)
        .then(async () => {
          const [updatedSimulados, updatedStats] = await Promise.all([
            loadSimulados(currentUserId),
            fetchSimuladoStats(currentUserId),
          ]);
          setSimuladosDB(Array.isArray(updatedSimulados) ? updatedSimulados : []);
          setSimuladoStats(updatedStats || { total: 0, mediaDesempenho: 0, melhorNota: 0 });
        })
        .catch(console.warn);
    }

    setRegistroSimuladoModalOpen(false);
    setSimuladoDraft(null);
  };

  const openSimuladoReviewModal = (payload = null) => {
    const nextDraft = payload && typeof payload === 'object' ? payload : null;
    setSimuladoDraft(nextDraft);
    setRegistroSimuladoModalOpen(true);
  };

  const openBlankSimuladoModal = () => {
    setSimuladoDraft(null);
    setRegistroSimuladoModalOpen(true);
  };

  const openHistoricoWithFilter = (payload = {}) => {
    if (typeof payload === 'string') {
      const normalized = payload.toLowerCase() === 'simulados' ? 'Simulado' : payload;
      setHistoryPresetFilter(normalized || 'Todos');
      setHistoryPresetQuery('');
      setActiveTab('historico');
      return;
    }

    const { filter = 'Todos', query = '' } = payload || {};
    setHistoryPresetFilter(filter);
    setHistoryPresetQuery(query);
    setActiveTab('historico');
  };

  const saveRedacaoNoApp = async ({ redacao, file = null }) => {
    const normalized = normalizeRedacaoRecord({
      ...redacao,
      user_id: currentUserId || redacao?.user_id || '',
      updated_at: new Date().toISOString(),
    });

    setRedacoes((prev) => upsertRedacaoRecord(prev, normalized));

    let persistedRecord = normalized;
    let partial = false;

    if (currentUserId && file) {
      try {
        const attachment = await uploadRedacaoAttachment({
          file,
          userId: currentUserId,
          existingUrl: normalized.attachment_url,
        });
        persistedRecord = normalizeRedacaoRecord({
          ...persistedRecord,
          ...attachment,
          updated_at: new Date().toISOString(),
        });
        setRedacoes((prev) => upsertRedacaoRecord(prev, persistedRecord));
      } catch (error) {
        partial = true;
        console.error('Erro ao enviar anexo da redacao:', error);
      }
    }

    if (!currentUserId) {
      return { ok: true, partial, redacao: persistedRecord };
    }

    try {
      const saved = await saveRedacaoToSupabase({
        userId: currentUserId,
        redacao: persistedRecord,
      });
      setRedacoes((prev) => upsertRedacaoRecord(prev, saved));
      setRedacoesPersistence({
        mode: 'remote',
        schemaReady: true,
        loading: false,
        error: null,
      });
      return { ok: true, partial, redacao: saved };
    } catch (error) {
      console.error('Erro ao persistir redacao no Supabase:', error);
      setRedacoesPersistence((prev) => ({
        ...prev,
        mode: 'local',
        schemaReady: false,
        error,
      }));
      return { ok: true, partial: true, redacao: persistedRecord };
    }
  };

  const deleteRedacaoNoApp = async (redacao) => {
    if (!redacao?.id) return { ok: false };

    setRedacoes((prev) => deleteRedacaoRecord(prev, redacao.id));

    if (!currentUserId) {
      return { ok: true };
    }

    try {
      await deleteRedacaoFromSupabase({
        redacaoId: redacao.id,
        attachmentPath: redacao.attachment_path,
      });
      return { ok: true };
    } catch (error) {
      console.error('Erro ao excluir redacao:', error);
      setRedacoes((prev) => upsertRedacaoRecord(prev, redacao));
      return { ok: false, error };
    }
  };

  const formatHHMMSS = (totalSecs) => {
    const safe = Math.max(0, Math.floor(Number(totalSecs) || 0));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    // SEMPRE HH:MM:SS — omitir a hora fazia "00:30" (30s) ser lido como 30min
    // pelos parsers de tempo (MetasSemana.parseTime, studyAnalytics).
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatTimeStr = (mins) => `${Math.floor(mins / 60)}h${mins % 60 > 0 ? mins % 60 + 'min' : '00min'}`;

  const persistTimerSession = useCallback((elapsedSecs) => {
    const safeElapsedSecs = Math.max(0, Number(elapsedSecs || 0));
    if (!currentUserId || safeElapsedSecs <= 0) return;

    const selectedDiscipline =
      bancoDisciplinas.find((item) => String(item.id || '') === String(studySessionDraft?.disciplinaId || '')) ||
      bancoDisciplinas.find((item) => String(item.nome || '') === String(studySessionDraft?.disciplina || ''));

    const sessionRecord = {
      id: `timer-${Date.now()}`,
      disciplina: selectedDiscipline?.nome || studySessionDraft?.disciplina || studySessionDraft?.material || 'Sessão de estudo',
      disciplinaId: selectedDiscipline?.id || studySessionDraft?.disciplinaId || '',
      topico: studySessionDraft?.material || studySessionDraft?.topico || '',
      material: studySessionDraft?.material || '',
      plano: studySessionDraft?.plano || selectedCoursePlan || '',
      tipo: timerMode === 'cronometro' ? 'flowtime' : timerMode,
      cor: '#1e3a5f',
      tempo: formatHHMMSS(safeElapsedSecs) || '00:00:00',
      acertos: 0,
      erros: 0,
      desempenho: 0,
      data: new Date().toISOString().split('T')[0],
    };

    setHistoricoReal((prev) => [normalizeStudyRecord(sessionRecord, subjectCatalog), ...prev]);
    saveStudySession(currentUserId, sessionRecord).catch(console.warn);
  }, [
    bancoDisciplinas,
    currentUserId,
    selectedCoursePlan,
    studySessionDraft,
    subjectCatalog,
    timerMode,
  ]);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerValue((prev) => {
          if (timerMode === 'cronometro') return prev + 1;
          if (prev <= 1) {
            setIsTimerRunning(false);
            setIsTimerModalOpen(false);
            setRegistroTempo(formatHHMMSS(timerMax));
            persistTimerSession(timerMax);
            setRegistroEstudoModalOpen(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerMode, timerMax, persistTimerSession]);

  const openTimerSetup = () => {
    setIsTimerModalOpen(true);
    setShowTimerSetup(true);
    setIsTimerRunning(false);
  };

  const startActualTimer = () => {
    if (timerMode !== 'cronometro') setTimerValue(timerMax);
    else setTimerValue(0);
    setShowTimerSetup(false);
    setIsTimerRunning(true);
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    setIsTimerModalOpen(false);
    let elapsedSecs = timerMode === 'cronometro' ? timerValue : timerMax - timerValue;
    if (elapsedSecs > 0) {
      setRegistroTempo(formatHHMMSS(elapsedSecs));
      persistTimerSession(elapsedSecs);
      setRegistroEstudoModalOpen(true);
    }
  };

  const startSpecificTimer = (mode, maxTimeInSeconds) => {
    setTimerMode(mode);
    setTimerMax(maxTimeInSeconds);
    setTimerValue(mode === 'cronometro' ? 0 : maxTimeInSeconds);
    setIsTimerModalOpen(true);
    setShowTimerSetup(false);
    setIsTimerRunning(true);
  };

  const startRecommendedStudySession = (recommendation) => {
    if (!recommendation) {
      openTimerSetup();
      return;
    }

    const categoria =
      recommendation.studyMode === 'revisao'
        ? 'Revisao'
        : recommendation.studyMode === 'questoes'
          ? 'Questoes'
          : 'Teoria';

    setStudySessionDraft({
      categoria,
      disciplinaId: recommendation.id ? String(recommendation.id) : '',
      topicoId: recommendation.nextTopic?.id ? String(recommendation.nextTopic.id) : '',
      material: recommendation.nextTopic?.nome || recommendation.nome || 'Sessao sugerida',
      plano: recommendation.plano || '',
    });

    if (recommendation.plano) {
      setSelectedCoursePlan(recommendation.plano);
    }

    startSpecificTimer('pomodoro', Math.max(15, Number(recommendation.suggestedDurationMin || 45)) * 60);
  };

  const toggleWizMateria = (id) => {
    const sourceIds = resolveCycleSelectionIds(id);
    if (sourceIds.length === 0) return;

    setWizData((prev) => {
      const currentIds = (Array.isArray(prev?.materias) ? prev.materias : []).map((item) => String(item));
      const allSelected = sourceIds.every((item) => currentIds.includes(item));
      const newMaterias = allSelected
        ? currentIds.filter((item) => !sourceIds.includes(item))
        : [...new Set([...currentIds, ...sourceIds])];
      return { ...prev, materias: newMaterias };
    });
  };

  const handlePesoChange = (id, field, val) => {
    const weightKey = resolveCycleWeightKey(id);
    if (!weightKey) return;

    setWizData((prev) => ({
      ...prev,
      pesos: {
        ...prev.pesos,
        [weightKey]: { ...prev.pesos[weightKey], [field]: parseFloat(val) },
      },
    }));
  };

  const totalWeightPreview = planningDisciplines.reduce((acc, discipline) => {
    const sourceIds =
      Array.isArray(discipline?.sourceIds) && discipline.sourceIds.length > 0
        ? discipline.sourceIds.map((item) => String(item))
        : discipline?.id
          ? [String(discipline.id)]
          : [];

    const selectedIds = new Set((Array.isArray(wizData?.materias) ? wizData.materias : []).map((item) => String(item)));
    if (selectedIds.size > 0 && !sourceIds.some((id) => selectedIds.has(id))) return acc;

    const weightKey = resolveCycleWeightKey(discipline);
    const p = wizData.pesos?.[weightKey] || { imp: 5, con: 1.5 };
    return acc + Number(p.imp || 5) * (6 - Number(p.con || 1.5));
  }, 0);

  const toggleSessionConcluida = (id) => {
    let completedSession = null;

    setActiveCycle((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const nextConcluido = !item.concluido;
        if (!item.concluido && nextConcluido) {
          completedSession = { ...item, concluido: nextConcluido };
        }

        return { ...item, concluido: nextConcluido };
      })
    );

    if (completedSession) {
      const novoRegistro = normalizeStudyRecord(
        {
          id: String(Date.now()),
          disciplina: completedSession.disciplina || completedSession.materia || '',
          disciplinaId: completedSession.disciplinaId ?? '',
          topico: completedSession.topico ?? '',
          tipo: 'TEORIA',
          cor: completedSession.cor ?? '',
          tempo: formatTimeStr((Number(completedSession.duracao || completedSession.minutos || 0) || 0) * 60) ?? '00:00:00',
          acertos: 0,
          erros: 0,
          desempenho: 0,
          data: new Date().toISOString().slice(0, 10),
        },
        subjectCatalog
      );

      setHistoricoReal((prev) => [novoRegistro, ...prev]);

      if (currentUserId) {
        saveStudySession(currentUserId, novoRegistro).catch(console.warn);
      }
    }
  };

  const totMinutosCiclo = activeCycle.reduce((acc, curr) => acc + curr.minutos, 0);
  const minConcluidosCiclo = activeCycle.filter((i) => i.concluido).reduce((acc, curr) => acc + curr.minutos, 0);
  const progressoCiclo = totMinutosCiclo > 0 ? Math.round((minConcluidosCiclo / totMinutosCiclo) * 100) : 0;

  const donutCircumference = 282.743;
  let currentPercentDonut = 0;
  const donutData = activeCycle.map((item) => {
    const percent = item.minutos / totMinutosCiclo;
    const dash = percent * donutCircumference;
    const gap = donutCircumference - dash;
    const offset = -(currentPercentDonut * donutCircumference);
    currentPercentDonut += percent;
    return { ...item, dash, gap, offset, percentFormat: Math.round(percent * 100) };
  });

  const handleDisciplineClick = (disciplineRef, highlightedTopicId = '') => {
    const sourceIds =
      Array.isArray(disciplineRef?.sourceIds) && disciplineRef.sourceIds.length > 0
        ? disciplineRef.sourceIds.map((id) => String(id))
        : disciplineRef?.id
          ? [String(disciplineRef.id)]
          : [];
    const rawName =
      typeof disciplineRef === 'string'
        ? disciplineRef
        : disciplineRef?.nome || disciplineRef?.canonicalName || '';
    const canonicalName = canonicalizeSubjectName(rawName, subjectCatalog);

    let discFound =
      bancoDisciplinas.find((disciplina) => sourceIds.includes(String(disciplina.id))) ||
      bancoDisciplinas.find(
        (disciplina) => String(disciplina.nome || '').toLowerCase() === String(rawName || '').toLowerCase()
      ) ||
      bancoDisciplinas.find(
        (disciplina) => canonicalizeSubjectName(disciplina.nome || '', subjectCatalog) === canonicalName
      );

    if (!discFound) {
      flushSync(() => {
        setSelectedCoursePlan(
          (typeof disciplineRef === 'object' && disciplineRef?.plano) || selectedCoursePlan || 'Todos'
        );
        setHighlightedDisciplineTopicId(String(highlightedTopicId || ''));
        setViewingDiscipline(null);
        setActiveTab('disciplinas');
        setDisciplineViewToken((prev) => prev + 1);
      });
      return;
    }

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    flushSync(() => {
      setSelectedCoursePlan(discFound.plano || 'Todos');
      setHighlightedDisciplineTopicId(String(highlightedTopicId || ''));
      setViewingDiscipline(discFound);
      setActiveTab('disciplinas');
      setDisciplineViewToken((prev) => prev + 1);
    });
  };

  const openStudyRegisterForDiscipline = (discipline) => {
    if (!discipline) {
      setStudySessionDraft(null);
      setRegistroEstudoModalOpen(true);
      return;
    }

    const nextTopic =
      (discipline.topicos || []).find((topic) => !topic?.concluido) ||
      (discipline.topicos || [])[0] ||
      null;

    setStudySessionDraft({
      categoria: 'Teoria',
      disciplinaId: discipline.id ? String(discipline.id) : '',
      topicoId: nextTopic?.id ? String(nextTopic.id) : '',
      material: nextTopic?.nome || discipline.nome || 'Sessao registrada',
      plano: discipline.plano || '',
    });

    if (discipline.plano) {
      setSelectedCoursePlan(discipline.plano);
    }

    setRegistroEstudoModalOpen(true);
  };

  const toggleEditalTopico = async (discId, topicoId) => {
    const disciplina = bancoDisciplinas.find((item) => item.id === discId);
    const topico = disciplina?.topicos?.find((item) => item.id === topicoId);

    if (!disciplina || !topico) return;

    const novoConcluido = !topico.concluido;
    const dataConclusao = novoConcluido ? new Date().toISOString().slice(0, 10) : null;
    const topicosAnteriores = Array.isArray(disciplina.topicos) ? disciplina.topicos : [];
    const percentualAnterior = Number(disciplina.percentual || 0);
    const topicosOtimizados = topicosAnteriores.map((item) =>
      item.id === topicoId
        ? { ...item, concluido: novoConcluido, data: dataConclusao, data_conclusao: dataConclusao }
        : item
    );
    const percentualOtimizado =
      topicosOtimizados.length > 0
        ? Math.round(
            (topicosOtimizados.filter((item) => item.concluido).length / topicosOtimizados.length) * 100
          )
        : 0;

    setBancoDisciplinas((prev) =>
      prev.map((item) => {
        if (item.id !== discId) return item;

        return {
          ...item,
          percentual: percentualOtimizado,
          topicosTot: topicosOtimizados.length,
          topicos: topicosOtimizados,
        };
      })
    );

    const { error: topicError } = await supabase
      .from('topics')
      .update({
        concluido: novoConcluido,
        data_conclusao: dataConclusao,
      })
      .eq('id', topicoId);

    if (topicError) {
      console.error('Erro ao atualizar tópico:', topicError);
      return;
    }

    const topicosAtualizados = topicosAnteriores.map((item) =>
      item.id === topicoId
        ? { ...item, concluido: novoConcluido, data: dataConclusao, data_conclusao: dataConclusao }
        : item
    );

    const percentualAtualizado =
      topicosAtualizados.length > 0
        ? Math.round(
            (topicosAtualizados.filter((item) => item.concluido).length / topicosAtualizados.length) * 100
          )
        : 0;

    setBancoDisciplinas((prev) =>
      prev.map((item) => {
        if (item.id !== discId) return item;

        return {
          ...item,
          percentual: percentualAtualizado,
          topicosTot: topicosAtualizados.length,
          topicos: topicosAtualizados,
        };
      })
    );

    const rollback = () => {
      setBancoDisciplinas((prev) =>
        prev.map((item) => {
          if (item.id !== discId) return item;

          return {
            ...item,
            percentual: percentualAnterior,
            topicosTot: topicosAnteriores.length,
            topicos: topicosAnteriores,
          };
        })
      );
    };

    const { error: subjectError } = await supabase
      .from('subjects')
      .update({ percentual: percentualAtualizado })
      .eq('id', discId);

    if (subjectError) {
      rollback();
      console.error('Erro ao atualizar disciplina:', subjectError);
      return;
    }

    setBancoDisciplinas((prev) =>
      prev.map((item) => {
        if (item.id !== discId) return item;

        return {
          ...item,
          percentual: percentualAtualizado,
          topicosTot: topicosAtualizados.length,
          topicos: topicosAtualizados,
        };
      })
    );
  };

  const _toggleDisciplina = (disciplinaId) => {
    setExpandedDisciplinas((prev) => ({ ...prev, [disciplinaId]: !prev[disciplinaId] }));
  };

  const progGeralEdital = 42;
  const ultimaAnotacao = useMemo(() => {
    const fontes = (Array.isArray(redacoes) ? redacoes : [])
      .map((redacao) => {
        const texto = String(redacao?.resumo || redacao?.texto || redacao?.content || '').trim();
        const data = String(
          redacao?.atualizado_em ||
          redacao?.updated_at ||
          redacao?.created_at ||
          redacao?.data ||
          ''
        ).trim();
        return {
          kind: 'redacao',
          titulo: String(redacao?.tema || redacao?.titulo || 'Redacao sem titulo').trim(),
          disciplina: String(redacao?.disciplina || redacao?.banca || 'Redacao').trim(),
          excerpt: texto ? `${texto.slice(0, 220)}${texto.length > 220 ? '...' : ''}` : 'Continue de onde parou.',
          data,
          acaoLabel: 'Continuar redacao',
        };
      })
      .filter((item) => item.titulo || item.excerpt);

    if (fontes.length === 0) return null;

    fontes.sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
    const top = fontes[0];
    return {
      ...top,
      data: top.data
        ? new Date(top.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
        : '',
    };
  }, [redacoes]);

  const editalProgresso = useMemo(() => {
    const targetDiscs = Array.isArray(targetContestDisciplines) ? targetContestDisciplines : [];
    if (!targetContestSummary || targetDiscs.length === 0) return null;

    const porDisciplina = targetDiscs
      .map((disciplina) => ({
        nome: String(disciplina?.nome || disciplina?.disciplina || 'Disciplina').trim(),
        pct: Math.round(Number(disciplina?.percentual || disciplina?.progresso || 0)),
      }))
      .filter((item) => item.nome)
      .sort((a, b) => b.pct - a.pct || a.nome.localeCompare(b.nome, 'pt-BR'))
      .slice(0, 8);

    return {
      geral: progGeralEdital,
      porDisciplina,
    };
  }, [targetContestSummary, targetContestDisciplines, progGeralEdital]);

  const currentCourseLimit = getCourseLimitFromProfile(currentProfile);
  const currentCourseCount = cursos.filter((course) => course.origem !== 'inferido').length;
  const remainingCourseSlots = isAdmin ? 999 : Math.max(currentCourseLimit - currentCourseCount, 0);

  if (loadingSession) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#f3efe5' }}>
        <span style={{ fontFamily: 'var(--pl-serif, Fraunces, serif)', fontStyle: 'italic', color: '#847b6c', fontSize: 16 }}>Carregando…</span>
      </div>
    );
  }

  // Páginas públicas — acessíveis sem autenticação
  const publicPath = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') : '';
  if (publicPath === '/privacidade') {
    return (
      <Suspense fallback={null}>
        <Privacidade />
      </Suspense>
    );
  }
  if (publicPath === '/termos') {
    return (
      <Suspense fallback={null}>
        <Termos />
      </Suspense>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center" style={{ backgroundColor: '#f3efe5' }}>
            <span style={{ fontFamily: 'var(--pl-serif, Fraunces, serif)', fontStyle: 'italic', color: '#847b6c', fontSize: 16 }}>Carregando…</span>
          </div>
        }
      >
        <Login
          setIsAuthenticated={setIsAuthenticated}
          initialReferralCode={pendingReferralCode}
          onReferralCodeCaptured={(code) => {
            const normalizedCode = normalizeReferralCode(code);
            setPendingReferralCode(normalizedCode);
            persistPendingReferralCode(normalizedCode);
          }}
          onReferralCodeConsumed={() => {
            setPendingReferralCode('');
            persistPendingReferralCode('');
          }}
        />
      </Suspense>
    );
  }

  // Aguarda o perfil carregar antes de decidir entre onboarding e plataforma.
  // Sem isso, contas novas veem o dashboard "piscar" antes do gate de onboarding,
  // pois currentProfile comeca null e so vira objeto apos o fetch assincrono.
  if (!isAdmin && Boolean(currentUserId) && currentProfile === null) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#f3efe5' }}>
        <span style={{ fontFamily: 'var(--pl-serif, Fraunces, serif)', fontStyle: 'italic', color: '#847b6c', fontSize: 16 }}>Carregando…</span>
      </div>
    );
  }

  const needsOnboarding =
    !isAdmin &&
    Boolean(currentUserId) &&
    currentProfile !== null &&
    currentProfile?.onboarding_done !== true;

  if (needsOnboarding) {
    return (
      <ToastProvider>
        <div
          className="min-h-screen"
          style={{
            background: 'var(--pl-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
          }}
        >
          <OnboardingWizard
            profile={effectiveProfile}
            contestLibrary={contestLibrary}
            courseTemplates={courseTemplates}
            currentUserId={currentUserId}
            setTargetContestId={setTargetContestId}
            onComplete={(updates) => {
              setCurrentProfile((prev) => ({ ...(prev || {}), ...(updates || {}), onboarding_done: true }));
              // start-trial criou a assinatura trialing — recarrega para liberar o premium.
              refreshSubscription?.();
            }}
          />
        </div>
      </ToastProvider>
    );
  }

  const tabContentProps = {
    activeTab,
    openTimerSetup,
    setActiveTab,
    progGeralEdital,
    agendaHoje,
    agendaAmanha,
    historicoReal,
    targetContestSummary,
    targetContestDisciplines,
    smartStudyPlan,
    dailyRoutine,
    ultimaAnotacao,
    editalProgresso,
    onOpenUltimaAnotacao: () => setActiveTab('redacoes'),
    setSelectedContestDetailId,
    handleDisciplineClick,
    startRecommendedStudySession,
    temaAtivo,
    setTemaAtivo,
    effectiveProfile,
    profileHasValidCpf,
    currentUserEmail,
    profileMetrics,
    levelSummary,
    badgeSummary,
    redacaoSummary,
    squadSummary,
    audiobookSummary,
    setSelectedCommunitySquadId,
    handleSaveProfile,
    handleAvatarChange,
    handleLogout,
    isAdmin,
    wellnessLibrary,
    activeWellnessTrackId,
    handleStartWellnessTrack,
    communityState,
    cursos,
    bancoDisciplinas,
    myContests,
    setTargetContestId,
    createCourse,
    createCourseFromCatalog,
    importSelectedEditalWithAI,
    analyzeEditalDocument,
    deleteCourse,
    setSelectedCoursePlan,
    contestLibrary,
    currentCourseLimit,
    currentCourseCount,
    remainingCourseSlots,
    favoriteContestIds,
    interestedContestIds,
    setFavoriteContestIds,
    setInterestedContestIds,
    allReminderNotifications,
    contestChecklistHistory,
    studyPlanningMode,
    planningDisciplines,
    planningStudyRecommendation,
    weeklyAvailability,
    activeCycle,
    manualReminders,
    handleSaveManualReminder,
    handleDeleteManualReminder,
    sharedCalendarViewMode,
    setSharedCalendarViewMode,
    sharedCalendarDate,
    setSharedCalendarDate,
    selectedContestDetail,
    contestTrackers,
    setContestTrackers,
    targetContestId,
    adminProfiles,
    adminExpenses,
    adminLeads,
    progressConfig,
    handleSaveProgressConfig,
    subjectCatalog,
    createContestTemplate,
    updateContestTemplate,
    duplicateContestTemplate,
    promoteContestTemplate,
    deleteContestTemplate,
    uploadContestImage,
    uploadContestEdital,
    removeContestImage,
    removeContestEdital,
    saveSubjectCatalogEntry,
    deleteSubjectCatalogEntry,
    updateAdminProfile,
    saveAdminExpense,
    deleteAdminExpense,
    saveAdminLead,
    deleteAdminLead,
    handleSaveWellnessLibrary,
    viewingDiscipline,
    setBancoDisciplinas,
    setViewingDiscipline,
    setEditingDiscipline,
    setRegistroEstudoModalOpen,
    disciplineViewToken,
    setLinkModalOpen,
    toggleEditalTopico,
    handleImportEditalDisciplinas,
    highlightedDisciplineTopicId,
    expandedEditalSubject,
    setExpandedEditalSubject,
    planningContestSummary,
    setWeeklyAvailability,
    setStudyPlanningMode,
    planningCourseOptions,
    planningCoursePlans,
    planningActivePlans,
    setPlanningCoursePlans,
    planningSubjectConfig,
    setPlanningSubjectConfig,
    planningSessionWindow,
    setPlanningSessionWindow,
    planningAvailableDisciplines,
    sharedReminderCalendarEvents,
    planWizardStep,
    setPlanWizardStep,
    isEditingCycle,
    setIsEditingCycle,
    wizData,
    setWizData,
    toggleWizMateria,
    handlePesoChange,
    totalWeightPreview,
    minConcluidosCiclo,
    totMinutosCiclo,
    progressoCiclo,
    ciclosCompletos,
    showFinishedSessions,
    setShowFinishedSessions,
    toggleSessionConcluida,
    donutData,
    setChartTooltip,
    formatTimeStr,
    formatHHMMSS,
    resetCycleWizard,
    restartActiveCycle,
    removeActiveCycle,
    finalizeCycleWizard,
    setIsFilterPanelOpen,
    historyPresetFilter,
    historyPresetQuery,
    customFocusTime,
    setCustomFocusTime,
    customPauseTime,
    setCustomPauseTime,
    startSpecificTimer,
    timerMode,
    timerValue,
    timerMax,
    isTimerRunning,
    setIsTimerRunning,
    handleStopTimer,
    studySessionDraft,
    isEditingMeta,
    setIsEditingMeta,
    metaDiariaQuestoes,
    setMetaDiariaQuestoes,
    setIsCadernoModalOpen,
    setRegistroSimuladoModalOpen,
    openBlankSimuladoModal,
    openSimuladoReviewModal,
    openHistoricoWithFilter,
    simulados: simuladosDB,
    simuladoStats,
    redacoes,
    redacoesPersistence,
    currentUserId,
    saveRedacaoNoApp,
    deleteRedacaoNoApp,
    redacaoExpertTips,
    handleSaveRedacaoExpertTips,
    redacaoThemeBankOverride,
    redacaoKitOverride,
    redacaoThemeBankEffective,
    handleSaveRedacaoSiteContent,
    handleSaveAudiolivrosContent,
    handleSaveSidebarLabels,
    notificationSettings,
    handleSaveNotificationSettings,
    courseTemplates,
    handleSaveCourseTemplates,
    saveSimuladoNoApp,
    audiobookCatalogOverride,
    sidebarLabelsOverride,
    audiobookCatalog,
    currentAudiobookState,
    handleSaveAudiobookState,
    selectedCoursePlan,
    openStudyRegisterForDiscipline,
    communityRankings,
    communityMetrics,
    handleSaveCommunityState,
    handleCreateCommunityPost,
    handleCreateCommunityComment,
    handleToggleCommunityReaction,
    handleRegisterCommunityView,
    onReloadCommunity: handleReloadCommunityFromCloud,
    communitySmokeTest,
    communityConnectivity,
    handleRunCommunityConnectivityCheck,
    handleRunCommunitySmokeTest,
    isPremiumPlan,
    isElitePlan,
    communityPersistence,
    selectedCommunitySquadId,
    onOpenAdminLegislacao: () => setActiveTab('admin_legislacao'),
  };
  const SHOULD_RENDER_LEGACY_TABS = false;

  return (
    <ErrorBoundary>
      <ToastProvider>
      <div
        className="app-shell flex h-screen min-h-0 flex-row items-stretch overflow-hidden pt-11 font-sans text-slate-800"
        style={{ backgroundColor: 'var(--pl-bg, #f3efe5)', color: 'var(--pl-ink)' }}
      >
      <EditorialTopStrip activeTab={activeTab} setActiveTab={setActiveTab} darkMode={darkMode} />
      {chartTooltip && (
        <div
          className="pointer-events-none fixed z-[9999] flex -translate-x-1/2 -translate-y-full transform items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white shadow-lg mt-[-10px]"
          style={{ left: chartTooltip.x, top: chartTooltip.y }}
        >
          <div className="h-3 w-3 rounded-sm shadow-sm" style={{ backgroundColor: chartTooltip.cor }} />
          {chartTooltip.materia}: {formatTimeStr(chartTooltip.minutos)}
        </div>
      )}

      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-[1px] lg:hidden"
          aria-label="Fechar menu de navegação"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div
        className={`pl-mobile-sidebar-shell fixed inset-y-0 left-0 z-50 flex h-[100dvh] min-h-0 shrink-0 flex-col transition-transform duration-200 ease-out lg:static lg:z-auto lg:h-full lg:max-h-none ${
          mobileNavOpen ? 'is-open' : ''
        }`}
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setViewingDiscipline={setViewingDiscipline}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapsed={setIsSidebarCollapsed}
          isAdmin={isAdmin}
          currentUserEmail={currentUserEmail}
          currentProfile={effectiveProfile}
          onNavigate={() => setMobileNavOpen(false)}
          labelOverrides={sidebarLabelsOverride || {}}
          className="h-full min-h-0 shadow-float lg:shadow-none"
        />
      </div>

      <main className="app-main-canvas relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          activeTab={activeTab}
          notifications={allReminderNotifications.slice(0, 6)}
          currentUserEmail={currentUserEmail}
          currentUsername={effectiveProfile?.username || ''}
          profileHasValidCpf={profileHasValidCpf}
          onOpenNotification={(item) => {
            const contestId = typeof item === 'string' ? item : item?.contestId;
            if (contestId) {
              setSelectedContestDetailId(contestId);
              setActiveTab('concurso_detalhe');
              return;
            }
            setActiveTab('lembretes');
          }}
          onOpenProfile={() => setActiveTab('perfil')}
          onLogout={handleLogout}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          subscriptionPlan={isAdmin ? 'master' : (isPremiumPlan ? 'papiro' : 'gratuito')}
          trialDaysLeft={isAdmin ? null : trialDaysLeft}
          onOpenAssinatura={() => setActiveTab('assinatura')}
          isAdmin={isAdmin}
          onNavigate={(tabId) => {
            setViewingDiscipline(null);
            setActiveTab(tabId);
          }}
          onOpenTimer={() => openTimerSetup?.()}
          onOpenOnboarding={isAdmin ? () => setShowOnboardingPreview(true) : undefined}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((v) => !v)}
          adminNotices={adminNotices}
          onDismissNotice={handleDismissNotice}
          onPublishNotice={handlePublishNotice}
        />

        <div
          ref={contentScrollRef}
          className={`pl-paper-bg-soft scrollbar-thin relative min-h-0 flex-1 ${
            ['home', 'questoes', 'planos', 'concursos', 'lembretes', 'disciplinas', 'edital', 'planejamento', 'ciclos', 'metas', 'estatisticas', 'sessoes', 'flashcards', 'revisoes', 'simulados', 'redacoes', 'materiais', 'audiobooks', 'mapas', 'legislacao', 'edital_questao', 'comunidades'].includes(activeTab) ? 'px-0 pt-0 sm:px-0 md:px-0' : 'px-3 pt-2 sm:px-4 md:px-5'
          } ${
            activeTab === 'historico' ||
            activeTab === 'questoes' ||
            activeTab === 'comunidades'
              ? `flex flex-col overflow-hidden ${activeTab === 'comunidades' ? 'pb-2' : 'pb-6'}`
              : `overflow-y-auto overflow-x-hidden ${['home', 'planos', 'concursos', 'lembretes', 'disciplinas', 'edital', 'planejamento', 'ciclos', 'metas', 'estatisticas', 'sessoes', 'flashcards', 'revisoes', 'simulados', 'redacoes', 'materiais', 'audiobooks', 'mapas', 'legislacao', 'edital_questao', 'comunidades'].includes(activeTab) ? 'pb-0' : activeTab === 'lembretes' ? 'pb-6' : 'pb-24'}`
          }`}
        >
          <CheckoutResultBanner onSuccess={refreshSubscription} />

          <Suspense
            fallback={
              <div className="pl-app pl-paper-bg-soft pl-loading-shell">
                <div className="pl-loading-panel">
                  <div className="pl-loading-stack">
                    <div className="pl-loading-spinner" aria-hidden />
                    <span className="eyebrow">Papirando</span>
                    <p className="title">Carregando área.</p>
                  </div>
                </div>
              </div>
            }
          >
            <AppTabContent {...tabContentProps} />
          </Suspense>

          {SHOULD_RENDER_LEGACY_TABS && (
            <>
          {activeTab === 'home' && (
            <Dashboard
              openTimerSetup={openTimerSetup}
              setActiveTab={setActiveTab}
              progGeralEdital={progGeralEdital}
              agendaHoje={agendaHoje}
              agendaAmanha={agendaAmanha}
              historicoReal={historicoReal}
              targetContest={targetContestSummary}
              targetDisciplines={targetContestDisciplines}
              studyRecommendation={smartStudyPlan}
              dailyRoutine={dailyRoutine}
              onOpenTargetContest={(contestId) => {
                setSelectedContestDetailId(contestId);
                setActiveTab('concurso_detalhe');
              }}
              onOpenRecommendedDiscipline={handleDisciplineClick}
              onStartRecommendedSession={startRecommendedStudySession}
              onStartRoutineItem={startRecommendedStudySession}
            />
          )}

          {(activeTab === 'perfil' || activeTab === 'assinatura') && (
            <Perfil
              temaAtivo={temaAtivo}
              setTemaAtivo={setTemaAtivo}
              setActiveTab={setActiveTab}
              profile={effectiveProfile}
              profileHasValidCpf={profileHasValidCpf}
              currentUserId={currentUserId}
              currentUserEmail={currentUserEmail}
              xpSummary={{ ...profileMetrics, ...levelSummary }}
              badgeSummary={badgeSummary}
              essaySummary={redacaoSummary}
              squadSummary={squadSummary}
              audiobookSummary={audiobookSummary}
              onOpenSquad={(squadId) => {
                setSelectedCommunitySquadId(squadId);
                setActiveTab('comunidades');
              }}
              onSaveProfile={handleSaveProfile}
              onProfilePatched={(patch) => setCurrentProfile((prev) => ({ ...(prev || {}), ...(patch || {}) }))}
              onChangeAvatar={handleAvatarChange}
              onLogout={handleLogout}
              initialTab={activeTab === 'assinatura' ? 'assinatura' : 'overview'}
            />
          )}

          {activeTab === 'bem_estar' && (
            <BemEstar
              tracks={wellnessLibrary}
              isAdmin={isAdmin}
              setActiveTab={setActiveTab}
              activeTrackId={activeWellnessTrackId}
              onPlayTrack={handleStartWellnessTrack}
            />
          )}
          {activeTab === 'convide_ganhe' && (
            <ConvideGanhe
              profile={effectiveProfile}
              currentUserId={currentUserId}
              currentUserEmail={currentUserEmail}
              referralCode={effectiveProfile?.referral_code || communityState?.referralCode || ''}
            />
          )}

          {activeTab === 'planos' && (
            <Planos
              progGeralEdital={progGeralEdital}
              setActiveTab={setActiveTab}
              cursos={cursos}
              concursoCatalog={contestLibrary}
              bancoDisciplinas={bancoDisciplinas}
              myContests={myContests}
              targetContest={targetContestSummary}
              onSetTargetContest={setTargetContestId}
              onOpenContestDetail={(contestId) => {
                setSelectedContestDetailId(contestId);
                setActiveTab('concurso_detalhe');
              }}
              onCreateCourse={createCourseWithStarterSubjects}
              onImportCatalogCourse={createCourseFromCatalog}
              onImportEdital={importSelectedEditalWithAI}
              onAnalyzeEdital={analyzeEditalDocument}
              onDeleteCourse={deleteCourse}
              setSelectedCoursePlan={setSelectedCoursePlan}
              currentCourseLimit={currentCourseLimit}
              currentCourseCount={currentCourseCount}
              remainingCourseSlots={remainingCourseSlots}
              isAdmin={isAdmin}
              courseTemplates={courseTemplates ?? []}
            />
          )}

          {activeTab === 'concursos' && (
            <Objetivos
              concursoCatalog={contestLibrary}
              courseTemplates={courseTemplates ?? []}
              cursos={cursos}
              onImportCatalogCourse={createCourseFromCatalog}
              onOpenContestDetail={(contest) => {
                setSelectedContestDetailId(contest?.id || null);
                setActiveTab('concurso_detalhe');
              }}
              currentCourseLimit={currentCourseLimit}
              remainingCourseSlots={remainingCourseSlots}
              isAdmin={isAdmin}
              setActiveTab={setActiveTab}
              onRemoveCourse={(cursoId) => {
                const curso = cursos.find((c) => c.id === cursoId);
                if (curso) deleteCourse(curso);
              }}
            />
          )}

          {activeTab === 'lembretes' && (
            <LembretesCalendario
              notifications={allReminderNotifications}
              agendaHoje={agendaHoje}
              agendaAmanha={agendaAmanha}
              checklistHistory={contestChecklistHistory}
              studyPlanningMode={studyPlanningMode}
              targetContest={targetContestSummary}
              planningDisciplines={planningDisciplines}
              planningStudyRecommendation={planningStudyRecommendation}
              weeklyAvailability={weeklyAvailability}
              activeCycle={activeCycle}
              onOpenContest={(contestId) => {
                setSelectedContestDetailId(contestId);
                setActiveTab('concurso_detalhe');
              }}
              onOpenDiscipline={handleDisciplineClick}
              manualReminders={manualReminders}
              onSaveReminder={handleSaveManualReminder}
              onDeleteReminder={handleDeleteManualReminder}
              currentUserId={currentUserId}
              contestOptions={contestLibrary}
              sharedCalendarViewMode={sharedCalendarViewMode}
              setSharedCalendarViewMode={setSharedCalendarViewMode}
              sharedCalendarDate={sharedCalendarDate}
              setSharedCalendarDate={setSharedCalendarDate}
            />
          )}

          {activeTab === 'concurso_detalhe' && (
            <ConcursoDetalhe
              contest={selectedContestDetail}
              onBack={() => {
                setSelectedContestDetailId(null);
                setActiveTab('concursos');
              }}
              onImport={createCourseFromCatalog}
              importingId=""
              limiteAtingido={!isAdmin && remainingCourseSlots <= 0}
              cursos={cursos}
              bancoDisciplinas={bancoDisciplinas}
              isFavorite={favoriteContestIds.includes(selectedContestDetail?.id)}
              isInterested={interestedContestIds.includes(selectedContestDetail?.id)}
              onToggleFavorite={(contestId) =>
                setFavoriteContestIds((prev) =>
                  prev.includes(contestId) ? prev.filter((id) => id !== contestId) : [...prev, contestId]
                )
              }
              onToggleInterested={(contestId) =>
                setInterestedContestIds((prev) =>
                  prev.includes(contestId) ? prev.filter((id) => id !== contestId) : [...prev, contestId]
                )
              }
              onOpenDisciplinas={(contest) => {
                setSelectedCoursePlan(contest?.plano || contest?.nome || 'Todos');
                setActiveTab('disciplinas');
              }}
              onOpenRelatedContest={(contest) => {
                setSelectedContestDetailId(contest?.id);
                setActiveTab('concurso_detalhe');
              }}
              contestTracker={contestTrackers[selectedContestDetail?.id] || {}}
              onToggleContestTask={(contestId, taskKey) =>
                setContestTrackers((prev) => ({
                  ...prev,
                  [contestId]: {
                    ...(prev[contestId] || {}),
                    [taskKey]: !prev[contestId]?.[taskKey],
                  },
                }))
              }
              isTargetContest={selectedContestDetail?.id === targetContestId}
              onSetTargetContest={setTargetContestId}
            />
          )}

          {activeTab === 'admin_dashboard' && isAdmin && (
            <AdminDashboard
              contestLibrary={contestLibrary}
              cursos={cursos}
              bancoDisciplinas={bancoDisciplinas}
              historicoReal={historicoReal}
              profiles={adminProfiles}
              expenses={adminExpenses}
              leads={adminLeads}
              setActiveTab={setActiveTab}
              progressConfig={progressConfig}
              onSaveProgressConfig={handleSaveProgressConfig}
            />
          )}

          {activeTab === 'admin_concursos' && isAdmin && (
            <AdminConcursos
              currentUserEmail={currentUserEmail}
              concursoCatalog={contestLibrary}
              concursoDrafts={contestDrafts}
              onRefreshDrafts={refreshContestDrafts}
              onLoadTemplateContent={loadTemplateContent}
              subjectCatalog={subjectCatalog}
              onCreateTemplate={createContestTemplate}
              onUpdateTemplate={updateContestTemplate}
              onDuplicateTemplate={duplicateContestTemplate}
              onPromoteTemplate={promoteContestTemplate}
              onDeleteTemplate={deleteContestTemplate}
              onUploadImage={uploadContestImage}
              onUploadEdital={uploadContestEdital}
              onRemoveImage={removeContestImage}
              onRemoveEdital={removeContestEdital}
              courseTemplates={courseTemplates}
              onSaveCourseTemplates={handleSaveCourseTemplates}
            />
          )}

          {activeTab === 'admin_disciplinas' && isAdmin && (
            <AdminDisciplinasPadrao
              subjectCatalog={subjectCatalog}
              onSaveSubject={saveSubjectCatalogEntry}
              onDeleteSubject={deleteSubjectCatalogEntry}
            />
          )}

          {activeTab === 'admin_usuarios' && isAdmin && (
            <AdminUsuarios
              profiles={adminProfiles}
              isLoading={adminProfilesLoading}
              currentUserEmail={currentUserEmail}
              onUpdateProfile={updateAdminProfile}
            />
          )}

          {activeTab === 'admin_finance' && isAdmin && (
            <AdminFinance
              profiles={adminProfiles}
              expenses={adminExpenses}
              currentUserEmail={currentUserEmail}
              onSaveExpense={saveAdminExpense}
              onDeleteExpense={deleteAdminExpense}
            />
          )}

          {activeTab === 'admin_crm' && isAdmin && (
            <AdminCRM
              leads={adminLeads}
              currentUserEmail={currentUserEmail}
              onSaveLead={saveAdminLead}
              onDeleteLead={deleteAdminLead}
            />
          )}

          {activeTab === 'admin_audiolivros' && isAdmin && (
            <AdminAudiolivros
              audiobookCatalogOverride={audiobookCatalogOverride}
              onSaveAudiolivrosContent={handleSaveAudiolivrosContent}
            />
          )}

          {activeTab === 'admin_mapas_mentais' && isAdmin && (
            <AdminMindMapsGallery
              bancoDisciplinas={bancoDisciplinas}
              contestLibrary={contestLibrary}
              subjectCatalog={subjectCatalog}
              currentUserId={currentUserId}
            />
          )}

          {activeTab === 'admin_configuracoes' && isAdmin && (
            <AdminConfiguracoes
              initialSection="conteudo"
              contestLibrary={contestLibrary}
              cursos={cursos}
              bancoDisciplinas={bancoDisciplinas}
              progressConfig={progressConfig}
              onSaveProgressConfig={handleSaveProgressConfig}
              wellnessLibrary={wellnessLibrary}
              onSaveWellnessLibrary={handleSaveWellnessLibrary}
              redacaoExpertTips={redacaoExpertTips}
              onSaveRedacaoExpertTips={handleSaveRedacaoExpertTips}
              redacaoThemeBankEffective={redacaoThemeBankEffective}
              redacaoKitOverride={redacaoKitOverride}
              audiobookCatalogOverride={audiobookCatalogOverride}
              onSaveRedacaoSiteContent={handleSaveRedacaoSiteContent}
              sidebarLabelsOverride={sidebarLabelsOverride}
              onSaveSidebarLabels={handleSaveSidebarLabels}
              notificationSettings={notificationSettings}
              onSaveNotificationSettings={handleSaveNotificationSettings}
              courseTemplates={courseTemplates}
              onSaveCourseTemplates={handleSaveCourseTemplates}
            />
          )}

          {activeTab === 'disciplinas' && !viewingDiscipline && (
  <Disciplinas
    bancoDisciplinas={bancoDisciplinas}
    setBancoDisciplinas={setBancoDisciplinas}
    setViewingDiscipline={setViewingDiscipline}
    setEditingDiscipline={setEditingDiscipline}
    setRegistroEstudoModalOpen={setRegistroEstudoModalOpen}
    subjectCatalog={subjectCatalog}
    forcedPlanoFiltro={
      selectedCoursePlan === 'Todos' && targetContestSummary?.plano
        ? targetContestSummary.plano
        : selectedCoursePlan
    }
  />
)}

          {activeTab === 'disciplinas' && viewingDiscipline && (
            <DisciplinaDetalhe
              key={`${viewingDiscipline.id || 'disciplina'}-${disciplineViewToken}`}
              viewingDiscipline={viewingDiscipline}
              setViewingDiscipline={setViewingDiscipline}
              setEditingDiscipline={setEditingDiscipline}
              setLinkModalOpen={setLinkModalOpen}
              toggleEditalTopico={toggleEditalTopico}
              highlightedTopicId={highlightedDisciplineTopicId}
            />
          )}

          {activeTab === 'edital' && (
            <Edital
              bancoDisciplinas={bancoDisciplinas}
              expandedEditalSubject={expandedEditalSubject}
              setExpandedEditalSubject={setExpandedEditalSubject}
              toggleEditalTopico={toggleEditalTopico}
              setEditingDiscipline={setEditingDiscipline}
              setRegistroEstudoModalOpen={setRegistroEstudoModalOpen}
              setLinkModalOpen={setLinkModalOpen}
            />
          )}

          {(activeTab === 'planejamento' || activeTab === 'ciclos') && (
            <Planejamento
              currentUserId={currentUserId}
              targetContest={planningContestSummary}
              targetDisciplines={planningDisciplines}
              studyRecommendation={planningStudyRecommendation}
              weeklyAvailability={weeklyAvailability}
              setWeeklyAvailability={setWeeklyAvailability}
              onOpenRecommendedDiscipline={handleDisciplineClick}
              onStartRecommendedSession={startRecommendedStudySession}
              studyMode={studyPlanningMode}
              setStudyMode={setStudyPlanningMode}
              planningCourseOptions={planningCourseOptions}
              planningCoursePlans={planningCoursePlans}
              effectivePlanningCoursePlans={planningActivePlans}
              setPlanningCoursePlans={setPlanningCoursePlans}
              planningSubjectConfig={planningSubjectConfig}
              setPlanningSubjectConfig={setPlanningSubjectConfig}
              planningSessionWindow={planningSessionWindow}
              setPlanningSessionWindow={setPlanningSessionWindow}
              planningAvailableDisciplines={planningAvailableDisciplines}
              subjectCatalog={subjectCatalog}
              setSelectedCoursePlan={setSelectedCoursePlan}
              externalCalendarEvents={sharedReminderCalendarEvents}
              sharedCalendarViewMode={sharedCalendarViewMode}
              setSharedCalendarViewMode={setSharedCalendarViewMode}
              sharedCalendarDate={sharedCalendarDate}
              setSharedCalendarDate={setSharedCalendarDate}
              cycleProps={{
                planWizardStep,
                setPlanWizardStep,
                isEditingCycle,
                setIsEditingCycle,
                wizData,
                setWizData,
                bancoDisciplinas: planningAvailableDisciplines.filter((disciplina) =>
                  planningActivePlans.length === 0 ? true : planningActivePlans.includes(disciplina.plano)
                ),
                toggleWizMateria,
                handlePesoChange,
                totalWeightPreview,
                minConcluidosCiclo,
                totMinutosCiclo,
                progressoCiclo,
                ciclosCompletos,
                showFinishedSessions,
                setShowFinishedSessions,
                activeCycle,
                toggleSessionConcluida,
                openTimerSetup,
                setRegistroEstudoModalOpen,
                donutData,
                setChartTooltip,
                formatTimeStr,
                onResetCycle: resetCycleWizard,
                onRestartCycle: restartActiveCycle,
                onRemoveCycle: removeActiveCycle,
                onFinalizeCycle: finalizeCycleWizard,
              }}
            />
          )}

          {activeTab === 'historico' && (
            <Historico
              historicoReal={historicoReal}
              subjectCatalog={subjectCatalog}
              setIsFilterPanelOpen={setIsFilterPanelOpen}
              setRegistroEstudoModalOpen={setRegistroEstudoModalOpen}
              handleDisciplineClick={handleDisciplineClick}
              onOpenEdital={() => setActiveTab('edital')}
              onStartStudy={() => setRegistroEstudoModalOpen(true)}
            />
          )}

          {activeTab === 'estatisticas' && (
            <Estatisticas
              setIsFilterPanelOpen={setIsFilterPanelOpen}
              historicoReal={historicoReal}
              bancoDisciplinas={bancoDisciplinas}
              subjectCatalog={subjectCatalog}
              redacaoSummary={redacaoSummary}
            />
          )}

          {activeTab === 'sessoes' && (
            <Sessoes
              customFocusTime={customFocusTime}
              setCustomFocusTime={setCustomFocusTime}
              customPauseTime={customPauseTime}
              setCustomPauseTime={setCustomPauseTime}
              startSpecificTimer={startSpecificTimer}
              openTimerSetup={openTimerSetup}
              setRegistroEstudoModalOpen={setRegistroEstudoModalOpen}
            />
          )}

          {activeTab === 'flashcards' && (
            <Flashcards currentUserId={currentUserId} bancoDisciplinas={bancoDisciplinas} cursos={cursos} />
          )}
          {activeTab === 'revisoes' && (
            <Revisoes
              setRegistroEstudoModalOpen={setRegistroEstudoModalOpen}
              setActiveTab={setActiveTab}
              targetContest={targetContestSummary}
              studyRecommendation={smartStudyPlan}
              onOpenRecommendedDiscipline={handleDisciplineClick}
              onStartRecommendedSession={startRecommendedStudySession}
              currentUserId={currentUserId}
            />
          )}
          {activeTab === 'questoes' && (
            <Questoes
              currentUserId={currentUserId}
              isEditingMeta={isEditingMeta}
              setIsEditingMeta={setIsEditingMeta}
              metaDiariaQuestoes={metaDiariaQuestoes}
              setMetaDiariaQuestoes={setMetaDiariaQuestoes}
              setIsCadernoModalOpen={setIsCadernoModalOpen}
              setRegistroEstudoModalOpen={setRegistroEstudoModalOpen}
              historicoReal={historicoReal}
              subjectCatalog={subjectCatalog}
              studyRecommendation={smartStudyPlan}
              onStartRecommendedSession={startRecommendedStudySession}
              bancoDisciplinas={bancoDisciplinas}
              selectedCoursePlan={selectedCoursePlan}
              planningCourseOptions={planningCourseOptions}
            />
          )}
          {activeTab === 'simulados' && (
            <Simulados
              openSimuladoReviewModal={openSimuladoReviewModal}
              openHistoricoWithFilter={openHistoricoWithFilter}
              setIsCadernoModalOpen={setIsCadernoModalOpen}
              historicoReal={historicoReal}
              subjectCatalog={subjectCatalog}
              simulados={simuladosDB}
              simuladoStats={simuladoStats}
              profile={effectiveProfile}
              currentUserId={currentUserId}
              redacaoSummary={redacaoSummary}
              communityMetrics={communityMetrics}
            />
          )}
          {activeTab === 'redacoes' && (
            <Redacoes
              redacoes={redacoes}
              redacaoSummary={redacaoSummary}
              persistenceMode={redacoesPersistence.mode}
              persistenceReady={redacoesPersistence.schemaReady}
              persistenceLoading={redacoesPersistence.loading}
              currentUserId={currentUserId}
              onSaveRedacao={saveRedacaoNoApp}
              onDeleteRedacao={deleteRedacaoNoApp}
              redacaoExpertTips={redacaoExpertTips}
              redacaoThemeBankOverride={redacaoThemeBankOverride}
              redacaoKitOverride={redacaoKitOverride}
            />
          )}
          {activeTab === 'audiobooks' && (
            <Audiobooks
              profile={effectiveProfile}
              bancoDisciplinas={bancoDisciplinas}
              catalog={audiobookCatalog}
              audiobookState={currentAudiobookState}
              onSaveAudiobookState={handleSaveAudiobookState}
              onOpenDiscipline={handleDisciplineClick}
              onOpenProfile={() => setActiveTab('perfil')}
            />
          )}
          {activeTab === 'mapas' && (
            <MapasMentais
              bancoDisciplinas={bancoDisciplinas}
              subjectCatalog={subjectCatalog}
              contestLibrary={contestLibrary}
              currentUserId={currentUserId}
              selectedCoursePlan={selectedCoursePlan}
              targetContestId={targetContestId}
              isAdmin={isAdmin}
              onOpenAdminMindMaps={() => setActiveTab('admin_mapas_mentais')}
              onOpenDiscipline={handleDisciplineClick}
              onOpenContest={(contestId) => {
                setSelectedContestDetailId(contestId);
                setActiveTab('concurso_detalhe');
              }}
              onOpenStudyRegister={openStudyRegisterForDiscipline}
            />
          )}
          {activeTab === 'legislacao' && (
            <Legislacao
              isAdmin={isAdmin}
              currentUserId={currentUserId}
              onOpenAdminLegislacao={() => setActiveTab('admin_legislacao')}
            />
          )}
          {activeTab === 'edital_questao' && (
            <EditalQuestao
              bancoDisciplinas={bancoDisciplinas}
              cursos={cursos}
              historicoReal={historicoReal}
              subjectCatalog={subjectCatalog}
              selectedCoursePlan={selectedCoursePlan}
              toggleEditalTopico={toggleEditalTopico}
              onOpenDiscipline={handleDisciplineClick}
              onOpenStudyRegister={openStudyRegisterForDiscipline}
              onNavigate={setActiveTab}
              onOpenPlanos={() => setActiveTab('planos')}
            />
          )}
          {activeTab === 'comunidades' && (
            <Comunidades
              currentUserId={currentUserId}
              currentUsername={effectiveProfile?.username || ''}
              profile={effectiveProfile}
              currentUserEmail={currentUserEmail}
              squadSummary={squadSummary}
              communityState={communityState}
              rankingData={communityRankings}
              profileMetrics={communityMetrics}
              onSaveCommunityState={handleSaveCommunityState}
              onCreatePost={handleCreateCommunityPost}
              onCreateComment={handleCreateCommunityComment}
              onToggleReaction={handleToggleCommunityReaction}
              onViewPost={handleRegisterCommunityView}
              onReloadCommunity={handleReloadCommunityFromCloud}
              smokeTest={communitySmokeTest}
              connectivityCheck={communityConnectivity}
              onRunConnectivityCheck={handleRunCommunityConnectivityCheck}
              onRunSmokeTest={handleRunCommunitySmokeTest}
              isPremium={isPremiumPlan}
              isElite={isElitePlan || isAdmin}
              isAdmin={isAdmin}
              persistenceMode={communityPersistence.mode}
              communitySchemaReady={communityPersistence.schemaReady}
              selectedSquadId={selectedCommunitySquadId}
              onSelectSquad={setSelectedCommunitySquadId}
            />
          )}
          {activeTab === 'conciliar' && (
            <Conciliador
              currentUserId={currentUserId}
              concursoCatalog={contestLibrary}
              subjectCatalog={subjectCatalog}
              myContests={myContests}
              cursos={cursos}
              bancoDisciplinas={bancoDisciplinas}
              historicoReal={historicoReal}
              targetContestId={targetContestId}
              onSetTargetContest={setTargetContestId}
              onOpenContestDetail={(contestId) => {
                setSelectedContestDetailId(contestId);
                setActiveTab('concurso_detalhe');
              }}
            />
          )}
          {activeTab === 'aplicativos' && <Aplicativos />}
          {activeTab === 'instagram' && <Instagram currentUserId={currentUserId} />}

          {![
            'home',
            'concursos',
            'meus_concursos',
            'lembretes',
            'concurso_detalhe',
            'admin_dashboard',
            'admin_concursos',
            'admin_disciplinas',
            'admin_usuarios',
            'admin_finance',
            'admin_crm',
            'admin_audiolivros',
            'admin_mapas_mentais',
            'admin_legislacao',
            'admin_configuracoes',
            'planos',
            'disciplinas',
            'assinatura',
            'edital',
            'planejamento',
            'historico',
            'estatisticas',
            'sessoes',
            'flashcards',
            'revisoes',
            'questoes',
            'simulados',
            'redacoes',
            'audiobooks',
            'mapas',
            'legislacao',
            'edital_questao',
            'comunidades',
            'conciliar',
            'aplicativos',
            'instagram',
            'bem_estar',
            'convide_ganhe',
            'perfil',
          ].includes(activeTab) && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-10">
              <Target size={40} className="text-[#1e3a5f] mb-6" />
              <h2 className="text-3xl font-black text-gray-800 mb-2">Construção em Progresso!</h2>
              <button
                onClick={() => setActiveTab('home')}
                className="bg-[#1e3a5f] text-white px-6 py-2.5 rounded-xl font-bold"
              >
                Voltar ao Início
              </button>
            </div>
          )}
            </>
          )}
        </div>

      </main>

      <AppOverlays
        activeWellnessTrack={activeWellnessTrack}
        wellnessAudioRef={wellnessAudioRef}
        isWellnessPlaying={isWellnessPlaying}
        handleToggleWellnessPlayback={handleToggleWellnessPlayback}
        handleCloseWellnessPlayer={handleCloseWellnessPlayer}
        registroSimuladoModalOpen={registroSimuladoModalOpen}
        setRegistroSimuladoModalOpen={setRegistroSimuladoModalOpen}
        saveSimuladoNoApp={saveSimuladoNoApp}
        simuladoDraft={simuladoDraft}
        registroEstudoModalOpen={registroEstudoModalOpen}
        setRegistroEstudoModalOpen={setRegistroEstudoModalOpen}
        bancoDisciplinas={bancoDisciplinas}
        cursos={cursos}
        timerValue={timerValue}
        formatTimeStr={formatTimeStr}
        registrarEstudoNoApp={registrarEstudoNoApp}
        studySessionDraft={studySessionDraft}
        setStudySessionDraft={setStudySessionDraft}
        editingDiscipline={editingDiscipline}
        setEditingDiscipline={setEditingDiscipline}
        setBancoDisciplinas={setBancoDisciplinas}
        subjectCatalog={subjectCatalog}
        linkModalOpen={linkModalOpen}
        setLinkModalOpen={setLinkModalOpen}
        isCadernoModalOpen={isCadernoModalOpen}
        setIsCadernoModalOpen={setIsCadernoModalOpen}
        isTimerModalOpen={isTimerModalOpen}
        setIsTimerModalOpen={setIsTimerModalOpen}
        showTimerSetup={showTimerSetup}
        timerMode={timerMode}
        setTimerMode={setTimerMode}
        timerMax={timerMax}
        setTimerMax={setTimerMax}
        formatHHMMSS={formatHHMMSS}
        isTimerRunning={isTimerRunning}
        setIsTimerRunning={setIsTimerRunning}
        saveAsFavorite={saveAsFavorite}
        setSaveAsFavorite={setSaveAsFavorite}
        startActualTimer={startActualTimer}
        handleStopTimer={handleStopTimer}
        isFilterPanelOpen={isFilterPanelOpen}
        setIsFilterPanelOpen={setIsFilterPanelOpen}
      />
      {showOnboardingPreview && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(20,17,13,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px 16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowOnboardingPreview(false); }}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: 520 }}>
            <button
              type="button"
              onClick={() => setShowOnboardingPreview(false)}
              style={{
                position: 'absolute', top: -12, right: -12, zIndex: 1,
                width: 28, height: 28, borderRadius: 999,
                background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-strong)',
                fontSize: 16, lineHeight: 1, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--pl-ink-2)',
              }}
              aria-label="Fechar preview"
            >
              ×
            </button>
            <OnboardingWizard
              profile={effectiveProfile}
              contestLibrary={contestLibrary}
              courseTemplates={courseTemplates}
              currentUserId={currentUserId}
              setTargetContestId={setTargetContestId}
              onComplete={() => setShowOnboardingPreview(false)}
              isPreview={true}
            />
          </div>
        </div>
      )}

    </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}
