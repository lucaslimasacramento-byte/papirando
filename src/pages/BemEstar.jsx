import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Expand,
  Flame,
  Headphones,
  HeartHandshake,
  LayoutDashboard,
  MoonStar,
  PauseCircle,
  Play,
  Quote,
  Sparkles,
  Target,
  Waves,
  Wind,
  X,
  Zap,
} from "lucide-react";
import PageHeadPremium, { PageHeadPremiumBadge } from "../components/PageHeadPremium";
import { resolveWellnessMediaUrl } from "../lib/wellnessLibrary";
import { normalizeWellnessPageConfig, wellnessBreathingMapFromList } from "../lib/wellnessPageConfig";

const WELLNESS_PAGE_VIEW_STORAGE_KEY = "papirando_wellness_view";
const WELLNESS_PAGE_TECHNIQUE_STORAGE_KEY = "papirando_wellness_technique";
const WELLNESS_PAGE_TRACK_STORAGE_KEY = "papirando_wellness_track";

const WELLNESS_ICONS = {
  sparkles: Sparkles,
  flame: Flame,
  target: Target,
  clock3: Clock3,
  wind: Wind,
  headphones: Headphones,
  activity: Activity,
  play: Play,
  pauseCircle: PauseCircle,
  checkCircle2: CheckCircle2,
  zap: Zap,
  waves: Waves,
  moonStar: MoonStar,
  brain: Brain,
  heartHandshake: HeartHandshake,
  quote: Quote,
  layoutDashboard: LayoutDashboard,
};

function wellnessIconComponent(key, Fallback = Sparkles) {
  const Icon = WELLNESS_ICONS[key] || WELLNESS_ICONS[String(key || "")];
  return Icon || Fallback;
}

function estimateFatigueScore(tracks = []) {
  const weighted = tracks.reduce((acc, item) => {
    const text = String(item?.durationLabel || "").toLowerCase();
    const min = text.match(/(\d+)\s*min/);
    const hour = text.match(/(\d+)\s*h/);
    const minutes = min ? Number(min[1]) : hour ? Number(hour[1]) * 60 : 8;
    return acc + Math.min(12, Math.max(4, Math.round(minutes / 3)));
  }, 0);

  return Math.max(28, Math.min(79, weighted));
}

function fatigueStripMeta(score) {
  if (score <= 35) {
    return { helper: "Sob controle — pausas leves bastam.", tone: "from-emerald-400 to-teal-500" };
  }
  if (score <= 65) {
    return { helper: "Moderado — hidrate, respire, reduza estímulo.", tone: "from-amber-400 to-orange-500" };
  }
  return { helper: "Pausa recomendada — recuperar rende mais.", tone: "from-rose-400 to-rose-600" };
}

function getCalmStatTone(label) {
  const key = String(label || "").toLowerCase();
  if (key.includes("clareza")) {
    return {
      card: "border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/60",
      iconWrap: "bg-sky-100 text-sky-700",
      label: "text-sky-700",
      value: "text-ink-900",
      helper: "text-ink-600",
    };
  }
  if (key.includes("press") || key.includes("reserva")) {
    return {
      card: "border-brand-200/80 bg-gradient-to-br from-brand-50/85 via-white to-ink-50/55",
      iconWrap: "bg-brand-100 text-brand-700",
      label: "text-brand-700",
      value: "text-ink-900",
      helper: "text-ink-600",
    };
  }
  if (key.includes("foco") || key.includes("mental")) {
    return {
      card: "border-teal-200/80 bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/55",
      iconWrap: "bg-teal-100 text-teal-700",
      label: "text-teal-700",
      value: "text-ink-900",
      helper: "text-ink-600",
    };
  }
  return {
    card: "border-ink-200 bg-white/90",
    iconWrap: "bg-ink-100 text-ink-700",
    label: "text-ink-700",
    value: "text-ink-900",
    helper: "text-ink-600",
  };
}

export default function SaudeMentalEFoco({
  tracks = [],
  pageConfig: pageConfigProp = null,
  isAdmin = false,
  setActiveTab,
  activeTrackId: externalActiveTrackId = "",
  onPlayTrack,
}) {
  const cfg = useMemo(() => normalizeWellnessPageConfig(pageConfigProp), [pageConfigProp]);
  const breathingById = useMemo(() => wellnessBreathingMapFromList(cfg.breathingTechniques), [cfg.breathingTechniques]);

  const publicTracks = useMemo(
    () => (Array.isArray(tracks) ? tracks.filter((item) => item?.isPublic !== false) : []),
    [tracks]
  );

  const publicAudioTracks = useMemo(
    () => publicTracks.filter((item) => String(item?.mediaType || "audio") !== "video"),
    [publicTracks]
  );

  const publicVideoTracks = useMemo(
    () => publicTracks.filter((item) => String(item?.mediaType || "audio") === "video"),
    [publicTracks]
  );

  const groupedTracks = useMemo(() => {
    return publicAudioTracks.reduce((acc, item) => {
      const category = String(item?.category || "Outros").trim() || "Outros";
      acc[category] = [...(acc[category] || []), item];
      return acc;
    }, {});
  }, [publicAudioTracks]);
  const categoryCount = useMemo(() => Object.keys(groupedTracks).length, [groupedTracks]);

  const [currentView, setCurrentView] = useState(() => {
    try {
      return localStorage.getItem(WELLNESS_PAGE_VIEW_STORAGE_KEY) || "visao_geral";
    } catch {
      return "visao_geral";
    }
  });
  const [activeTechnique, setActiveTechnique] = useState(() => {
    try {
      return localStorage.getItem(WELLNESS_PAGE_TECHNIQUE_STORAGE_KEY) || "diafragmatica";
    } catch {
      return "diafragmatica";
    }
  });
  const [activeTrackId, setActiveTrackId] = useState(() => {
    try {
      return (
        externalActiveTrackId ||
        localStorage.getItem(WELLNESS_PAGE_TRACK_STORAGE_KEY) ||
        publicAudioTracks[0]?.id ||
        ""
      );
    } catch {
      return externalActiveTrackId || publicAudioTracks[0]?.id || "";
    }
  });
  const [isBreathing, setIsBreathing] = useState(false);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [activeQuickPauseId, setActiveQuickPauseId] = useState("");
  const [breathingState, setBreathingState] = useState({
    phaseIndex: 0,
    remaining: 4,
  });

  const activeTrack =
    publicAudioTracks.find((item) => item.id === activeTrackId) || publicAudioTracks[0] || null;
  const firstBreath = cfg.breathingTechniques[0];
  const activeTechniqueData = useMemo(
    () =>
      breathingById[activeTechnique] || firstBreath || {
        nome: "",
        uso: "",
        descricao: "",
        comoFazer: "",
        insight: "",
        fases: [{ nome: "Inspire", segundos: 4 }],
      },
    [activeTechnique, breathingById, firstBreath]
  );
  const currentPhase =
    activeTechniqueData.fases[breathingState.phaseIndex] || activeTechniqueData.fases[0];
  const fatigueScore = estimateFatigueScore(publicTracks);
  const activeQuickPause =
    publicVideoTracks.find((item) => item.id === activeQuickPauseId) || null;

  useEffect(() => {
    try {
      localStorage.setItem(WELLNESS_PAGE_VIEW_STORAGE_KEY, currentView);
    } catch (error) {
      console.warn("Falha ao persistir a aba de bem-estar.", error);
    }
  }, [currentView]);

  useEffect(() => {
    try {
      localStorage.setItem(WELLNESS_PAGE_TECHNIQUE_STORAGE_KEY, activeTechnique);
    } catch (error) {
      console.warn("Falha ao persistir a técnica de bem-estar.", error);
    }
  }, [activeTechnique]);

  useEffect(() => {
    if (!activeTrackId) return;

    try {
      localStorage.setItem(WELLNESS_PAGE_TRACK_STORAGE_KEY, activeTrackId);
    } catch (error) {
      console.warn("Falha ao persistir a faixa de bem-estar.", error);
    }
  }, [activeTrackId]);

  useEffect(() => {
    if (!externalActiveTrackId) return undefined;
    const frame = window.requestAnimationFrame(() => {
      setActiveTrackId(externalActiveTrackId);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [externalActiveTrackId]);

  useEffect(() => {
    if (cfg.breathingTechniques.some((t) => t.id === activeTechnique)) return;
    const fallback = cfg.breathingTechniques[0]?.id;
    if (!fallback) return undefined;
    const frame = window.requestAnimationFrame(() => {
      setActiveTechnique(fallback);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [cfg.breathingTechniques, activeTechnique]);

  useEffect(() => {
    if (activeTrack || !publicAudioTracks[0]) return undefined;
    const frame = window.requestAnimationFrame(() => {
      setActiveTrackId(publicAudioTracks[0].id);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTrack, publicAudioTracks]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsBreathing(false);
      setBreathingState({
        phaseIndex: 0,
        remaining: activeTechniqueData.fases[0]?.segundos || 4,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTechniqueData]);

  useEffect(() => {
    if (!isBreathing) return undefined;

    const timer = window.setInterval(() => {
      setBreathingState((prev) => {
        if (prev.remaining > 1) {
          return { ...prev, remaining: prev.remaining - 1 };
        }

        const nextPhaseIndex = (prev.phaseIndex + 1) % activeTechniqueData.fases.length;
        return {
          phaseIndex: nextPhaseIndex,
          remaining: activeTechniqueData.fases[nextPhaseIndex]?.segundos || 4,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isBreathing, activeTechniqueData]);

  const navItems = [
    { id: "visao_geral", label: cfg.navLabels.visao_geral, icon: LayoutDashboard },
    { id: "respiracao", label: cfg.navLabels.respiracao, icon: Wind },
    { id: "meditacoes", label: cfg.navLabels.meditacoes, icon: Headphones },
    { id: "pausas", label: cfg.navLabels.pausas, icon: Activity },
  ];

  return (
    <div className="w-full bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_25%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_18%),linear-gradient(180deg,#f8fbff_0%,#f3f7fc_100%)]">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-4 sm:gap-6 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        <PageHeadPremium
          className="shrink-0 lg:!flex-row lg:!items-center lg:!justify-between"
          icon={Brain}
          badge={
            <PageHeadPremiumBadge icon={Brain} className="!normal-case sm:!text-[9px]">
              {cfg.hero.badge}
            </PageHeadPremiumBadge>
          }
          title={cfg.hero.title}
          titleAs="h1"
          subtitle={cfg.hero.subtitle}
          leadingClassName="w-full items-center xl:max-w-[min(100%,46rem)]"
          leadingExtra={(
            <div className="mt-2 sm:mt-3">
              <p className="flex items-start gap-2 border-l-2 border-white/20 pl-2.5 text-[11px] font-medium leading-snug text-ink-300 sm:pl-3 sm:text-xs">
                <Quote size={14} className="mt-0.5 shrink-0 text-ink-400" aria-hidden />
                <span>
                  <span className="font-semibold text-ink-200">{cfg.quote.prefix} </span>
                  {cfg.quote.body}
                </span>
              </p>
            </div>
          )}
        />

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-ink-200/90 bg-white p-2.5 shadow-sm sm:p-3">
            <div className="grid w-full min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {cfg.statusCards.map(({ label, value, helper, icon }) => {
                const Icon = wellnessIconComponent(icon);
                return <SurfaceStat key={label} icon={Icon} label={label} value={value} helper={helper} stripEqual />;
              })}
              <CvvKpiStripCard cvv={cfg.cvv} />
              <FatigueKpiStripCard score={fatigueScore} />
            </div>
          </section>

          <div className="shrink-0 rounded-2xl border border-cyan-100/90 bg-gradient-to-r from-white via-ink-50/85 to-cyan-50/35 p-2 shadow-sm ring-1 ring-cyan-100/70 sm:p-2.5">
            <div className="mb-1 px-1 sm:px-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-800/85">Navegação</p>
            </div>
            <nav
              className="flex flex-row max-sm:gap-1.5 max-sm:overflow-x-auto max-sm:flex-nowrap max-sm:pb-0.5 max-sm:[-ms-overflow-style:none] max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden sm:flex-wrap sm:justify-start sm:gap-2"
              aria-label="Áreas de bem-estar"
            >
              {navItems.map(({ id, label, icon: Icon }) => {
                const active = currentView === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCurrentView(id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition sm:gap-2 sm:px-3.5 sm:text-sm ${
                      active
                        ? "bg-ink-900 text-white shadow-sm"
                        : "bg-ink-100 text-ink-600 hover:bg-ink-200 hover:text-ink-900"
                    }`}
                  >
                    <Icon size={16} className="shrink-0 opacity-90" />
                    <span className="whitespace-nowrap">{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="rounded-xl border border-ink-200/90 bg-white/95 px-2.5 py-2 shadow-sm sm:px-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <p className="min-w-0 shrink-0 text-[11px] font-medium leading-snug text-ink-600 md:max-w-[13rem] lg:max-w-[15.5rem]">
                <span className="font-semibold text-ink-800">{cfg.resumo.introLead} </span>
                {cfg.resumo.intro}
              </p>
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
                {cfg.wellbeingPlan.map(({ title, text, icon }) => {
                  const Icon = wellnessIconComponent(icon);
                  return (
                  <div
                    key={title}
                    className="flex min-w-[9.5rem] flex-1 flex-col justify-center gap-0.5 rounded-lg border border-ink-200/80 bg-ink-50/95 px-2 py-1.5 shadow-sm sm:min-w-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-brand-700 shadow-sm">
                        <Icon size={12} strokeWidth={2.25} />
                      </span>
                      <span className="truncate text-[10px] font-bold uppercase tracking-wide text-ink-900">
                        {title}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[9px] font-medium leading-snug text-ink-500">{text}</p>
                  </div>
                );
                })}
              </div>
            </div>
          </div>

          <main className="min-w-0">
            {currentView === "visao_geral" && (
              <OverviewSection
                cfg={cfg}
                setCurrentView={setCurrentView}
                publicAudioTracks={publicAudioTracks}
                publicVideoTracks={publicVideoTracks}
                fatigueScore={fatigueScore}
                categoryCount={categoryCount}
                techniqueCount={cfg.breathingTechniques.length}
              />
            )}

            {currentView === "respiracao" && (
              <BreathingSection
                breathingTechniques={cfg.breathingTechniques}
                breathingBadge={cfg.sectionCopy.breathingBadge}
                activeTechnique={activeTechnique}
                setActiveTechnique={setActiveTechnique}
                activeTechniqueData={activeTechniqueData}
                currentPhase={currentPhase}
                breathingState={breathingState}
                isBreathing={isBreathing}
                setIsBreathing={setIsBreathing}
                setBreathingState={setBreathingState}
              />
            )}

            {currentView === "meditacoes" && (
              <AudioLibrarySection
                audioEyebrow={cfg.sectionCopy.audioEyebrow}
                audioTitle={cfg.sectionCopy.audioTitle}
                groupedTracks={groupedTracks}
                activeTrack={activeTrack}
                setActiveTrackId={setActiveTrackId}
                setFocusModeOpen={setFocusModeOpen}
                onPlayTrack={onPlayTrack}
                isAdmin={isAdmin}
                setActiveTab={setActiveTab}
              />
            )}

            {currentView === "pausas" && (
              <QuickPausesSection
                videoTitle={cfg.sectionCopy.videoTitle}
                videoBody={cfg.sectionCopy.videoBody}
                videoBadge={cfg.sectionCopy.videoBadge}
                publicVideoTracks={publicVideoTracks}
                setActiveTab={setActiveTab}
                onOpenPause={(trackId) => setActiveQuickPauseId(trackId)}
              />
            )}
          </main>
        </div>

        {focusModeOpen && activeTrack ? (
          <FocusMode
            track={activeTrack}
            onPlayTrack={onPlayTrack}
            onClose={() => setFocusModeOpen(false)}
          />
        ) : null}

        {activeQuickPause ? (
          <QuickPausePlayer
            track={activeQuickPause}
            onClose={() => setActiveQuickPauseId("")}
          />
        ) : null}

      </div>
    </div>
  );
}

function OverviewSection({
  cfg,
  setCurrentView,
  publicAudioTracks,
  publicVideoTracks,
  fatigueScore,
  categoryCount,
  techniqueCount,
}) {
  return (
    <section className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-3">
        {cfg.overviewCards.map(({ id, title, eyebrow, text, icon, accent }) => {
          const Icon = wellnessIconComponent(icon);
          return (
          <button
            key={id}
            type="button"
            onClick={() => setCurrentView(id)}
            className="group overflow-hidden rounded-[1.8rem] border border-ink-200 bg-white text-left shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-brand-100 hover:shadow-[0_20px_40px_rgba(37,99,235,0.08)]"
          >
            <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
            <div className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 shadow-sm">
                  <Icon size={20} />
                </div>
                <span className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                  {eyebrow}
                </span>
              </div>

              <h3 className="mt-5 text-xl font-semibold text-ink-900">{title}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink-500">{text}</p>

              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
                Abrir área
                <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
              </div>
            </div>
          </button>
        );
        })}
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-ink-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
              {cfg.overviewDirection.eyebrow}
            </p>
            <h3 className="mt-2 text-[1.9rem] font-semibold leading-tight text-ink-900">
              {cfg.overviewDirection.title}
            </h3>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-ink-500">
              {cfg.overviewDirection.body}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MiniPill icon={Zap} label="Prioridade" value={cfg.overviewDirection.priorityPill} />
              <MiniPill icon={Waves} label="Categorias" value={`${categoryCount} ativas`} />
              <MiniPill
                icon={MoonStar}
                label="Técnicas"
                value={`${techniqueCount} opções`}
              />
            </div>
          </div>

          <div className="border-t border-ink-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef5ff_100%)] p-6 lg:border-l lg:border-t-0 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
              {cfg.overviewReadingsEyebrow}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <DashboardInfoCard
                label="Faixas ativas"
                value={String(publicAudioTracks.length)}
                helper="Áudios disponíveis"
              />
              <DashboardInfoCard
                label="Pausas em vídeo"
                value={String(publicVideoTracks.length)}
                helper="Clipes prontos para abrir"
              />
              <DashboardInfoCard
                label="Carga estimada"
                value={`${fatigueScore}%`}
                helper="Leitura visual rápida"
              />
            </div>

            <div className="mt-6 space-y-4">
              {cfg.dailySignals.map((item) => (
                <DashboardBar key={item.label} {...item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BreathingSection({
  breathingTechniques,
  breathingBadge,
  activeTechnique,
  setActiveTechnique,
  activeTechniqueData,
  currentPhase,
  breathingState,
  isBreathing,
  setIsBreathing,
  setBreathingState,
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-ink-200 bg-[#0B1322] text-white shadow-[0_24px_60px_rgba(2,6,23,0.35)]">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">
            <Wind size={12} />
            {breathingBadge}
          </div>

          <div className="mt-5 space-y-2">
            {breathingTechniques.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTechnique(item.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  activeTechnique === item.id
                    ? "border-brand-400/30 bg-brand-500/10 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white"
                }`}
              >
                <span>{item.nome}</span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-brand-200">
                  {item.uso}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 lg:p-7">
          <div
            className={`mx-auto flex h-60 w-60 items-center justify-center rounded-full border border-brand-300/20 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.3),rgba(15,23,42,0.02)_60%)] transition-all duration-500 ${
              isBreathing ? "scale-105 shadow-[0_0_80px_rgba(59,130,246,0.18)]" : "scale-95"
            }`}
          >
            <div className="flex h-44 w-44 items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 text-center backdrop-blur">
              <div>
                <p className="text-xl font-semibold text-white">
                  {isBreathing ? currentPhase.nome : activeTechniqueData.nome}
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-200">
                  {isBreathing ? `${breathingState.remaining}s` : activeTechniqueData.uso}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
            <div>
              <p className="text-sm font-medium leading-relaxed text-ink-300">
                {activeTechniqueData.descricao}
              </p>
              <p className="mt-3 text-xs font-semibold leading-relaxed text-ink-400">
                {activeTechniqueData.comoFazer}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                Insight
              </p>
              <p className="mt-2 text-sm font-bold leading-relaxed text-white/85">
                {activeTechniqueData.insight}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {activeTechniqueData.fases.map((fase, index) => (
              <div
                key={`${activeTechnique}-${fase.nome}-${index}`}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  isBreathing && breathingState.phaseIndex === index
                    ? "border-brand-400/20 bg-brand-500/10 text-white"
                    : "border-white/10 bg-white/5 text-ink-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                      isBreathing && breathingState.phaseIndex === index
                        ? "bg-white/15 text-white"
                        : "bg-white/10 text-ink-200"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>{fase.nome}</span>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                  {fase.segundos}s
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (isBreathing) {
                  setIsBreathing(false);
                  setBreathingState({
                    phaseIndex: 0,
                    remaining: activeTechniqueData.fases[0]?.segundos || 4,
                  });
                  return;
                }

                setBreathingState({
                  phaseIndex: 0,
                  remaining: activeTechniqueData.fases[0]?.segundos || 4,
                });
                setIsBreathing(true);
              }}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                isBreathing
                  ? "border border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500 hover:text-white"
                  : "bg-brand-600 text-white hover:bg-brand-500"
              }`}
            >
              <Play size={15} fill="currentColor" />
              {isBreathing ? "Parar respiração guiada" : "Iniciar respiração guiada"}
            </button>

            <span className="inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/70">
              Técnica selecionada: {activeTechniqueData.nome}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function AudioLibrarySection({
  audioEyebrow,
  audioTitle,
  groupedTracks,
  activeTrack,
  setActiveTrackId,
  setFocusModeOpen,
  onPlayTrack,
  isAdmin,
  setActiveTab,
}) {
  const activeTrackUrl = resolveWellnessMediaUrl(activeTrack);
  const canPlayActiveTrack = Boolean(activeTrack?.id && activeTrackUrl);

  return (
    <section className="rounded-[2rem] border border-ink-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            {audioEyebrow}
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-ink-900">
            {audioTitle}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFocusModeOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700"
          >
            <Expand size={15} />
            Tela cheia
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={() => setActiveTab?.("admin_configuracoes")}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm font-bold text-brand-700"
            >
              <Waves size={15} />
              Ajustar no ADM
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-4 pr-0 lg:pr-1">
          {Object.entries(groupedTracks).map(([category, items]) => (
            <div key={category}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                {category}
              </p>

              <div className="space-y-3">
                {items.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => setActiveTrackId(track.id)}
                    className={`relative flex w-full items-center gap-3 overflow-hidden rounded-[1.4rem] border px-4 py-4 text-left transition ${
                      activeTrack?.id === track.id
                        ? "border-brand-200 bg-brand-50/70 shadow-sm"
                        : "border-ink-200 bg-ink-50/70 hover:border-brand-100"
                    }`}
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
                        track.accent || "from-sky-500/20 to-brand-500/10"
                      }`}
                    />
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#18365C] text-white shadow-sm">
                      <Headphones size={18} />
                    </div>
                    <div className="relative z-10 min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-900">{track.title}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                        {track.durationLabel || "Sem duração"}
                      </p>
                    </div>
                    <ChevronRight size={16} className="relative z-10 text-ink-400" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-[1.7rem] border border-ink-200 bg-ink-50/70">
          <div className="relative aspect-[16/8.4] bg-[#18365C]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.55),rgba(24,54,92,1)_70%)]" />
            <div className="relative z-10 flex h-full items-center justify-center">
              <MusicGlyph />
            </div>
          </div>

          <div className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                  {activeTrack?.category || "Biblioteca"}
                </p>
                <h4 className="mt-2 text-2xl font-semibold text-ink-900">
                  {activeTrack?.title || "Nenhuma faixa disponível"}
                </h4>
              </div>

              <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                {activeTrack?.durationLabel || "Sem duração"}
              </span>
            </div>

            <p className="mt-3 text-sm font-medium leading-relaxed text-ink-500">
              {activeTrack?.description || "A biblioteca pode ser atualizada pelo administrador."}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <InfoTiny label="Categoria" value={activeTrack?.category || "?"} />
              <InfoTiny label="Formato" value="Áudio" />
              <InfoTiny label="Uso" value="Recuperação mental" />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onPlayTrack?.(activeTrack?.id)}
                disabled={!canPlayActiveTrack}
                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition ${
                  canPlayActiveTrack
                    ? "bg-brand-600 hover:bg-brand-700"
                    : "cursor-not-allowed bg-ink-300"
                }`}
              >
                <Play size={15} fill="currentColor" />
                {canPlayActiveTrack ? "Ouvir na plataforma" : "Arquivo indisponível"}
              </button>

              <button
                type="button"
                onClick={() => setFocusModeOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-5 py-3 text-sm font-bold text-ink-700"
              >
                <Expand size={15} />
                Relaxar em tela cheia
              </button>
            </div>

            {activeTrack?.credits ? (
              <details className="mt-4 text-xs font-medium text-ink-400">
                <summary className="cursor-pointer list-none font-bold text-ink-500">
                  Créditos
                </summary>
                <p className="mt-2 leading-relaxed">{activeTrack.credits}</p>
              </details>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickPausesSection({ videoTitle, videoBody, videoBadge, publicVideoTracks, setActiveTab, onOpenPause }) {
  return (
    <section className="rounded-[2rem] border border-ink-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-emerald-500" />
            <h3 className="text-xl font-semibold text-ink-900">{videoTitle}</h3>
          </div>
          <p className="mt-2 text-sm font-medium text-ink-500">
            {videoBody}
          </p>
        </div>

        <span className="rounded-full border border-ink-200 bg-ink-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
          {videoBadge}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {publicVideoTracks.map((item) => (
          <div
            key={item.id}
            className="group overflow-hidden rounded-[1.6rem] border border-ink-200 bg-ink-50/70 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
          >
            <div className="aspect-[16/9] bg-[#18365C]">
              <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.35),rgba(24,54,92,1)_74%)]">
                <Activity size={28} className="text-white" />
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-ink-900">{item.title}</p>
                <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                  {item.durationLabel || "Vídeo"}
                </span>
              </div>

              <p className="mt-2 text-sm font-medium leading-relaxed text-ink-500">
                {item.description || "Vídeo curto para pausar, soltar tensão e voltar melhor."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {resolveWellnessMediaUrl(item) ? (
                  <button
                    type="button"
                    onClick={() => onOpenPause?.(item.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700"
                  >
                    <Play size={15} fill="currentColor" />
                    Abrir pausa
                  </button>
                ) : null}

                <span className="inline-flex items-center rounded-xl border border-ink-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                  {item.category || "Micro pausa"}
                </span>
              </div>
            </div>
          </div>
        ))}

        {publicVideoTracks.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-ink-200 bg-ink-50/60 p-5 text-sm font-medium text-ink-500 md:col-span-2 xl:col-span-3">
            Nenhum vídeo de pausa foi cadastrado ainda. O administrador poderá subir a biblioteca
            depois pelo fluxo real em{" "}
            <button
              type="button"
              onClick={() => setActiveTab?.("admin_configuracoes")}
              className="font-semibold text-brand-700"
            >
              Configurações
            </button>
            .
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FocusMode({ track, onPlayTrack, onClose }) {
  const canPlayTrack = Boolean(resolveWellnessMediaUrl(track));

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-[#030712] px-6 py-8">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-6 top-6 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
      >
        <X size={18} />
      </button>

      <div className="flex max-w-4xl flex-col items-center text-center">
        <div className="flex h-56 w-56 items-center justify-center rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.65),rgba(15,23,42,0.96)_70%)] shadow-[0_30px_80px_rgba(37,99,235,0.16)]">
          <MusicGlyph />
        </div>

        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-200">
          {track.category || "Bem-estar"}
        </p>
        <h3 className="mt-3 text-4xl font-semibold tracking-tight text-white">{track.title}</h3>
        <p className="mt-3 max-w-2xl text-base font-medium leading-relaxed text-white/70">
          {track.description || "Use este modo para descansar com menos estímulo visual."}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/80">
            {track.durationLabel || "Sem duração"}
          </span>
          <button
            type="button"
            onClick={() => onPlayTrack?.(track.id)}
            disabled={!canPlayTrack}
            className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white ${
              canPlayTrack ? "bg-brand-600" : "cursor-not-allowed bg-ink-500"
            }`}
          >
            <Play size={16} fill="currentColor" />
            {canPlayTrack ? "Ouvir agora" : "Arquivo indisponível"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickPausePlayer({ track, onClose }) {
  const mediaUrl = resolveWellnessMediaUrl(track);
  if (!track || !mediaUrl) return null;

  const isDirectVideo = /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(mediaUrl) || mediaUrl.startsWith("data:video/");

  return (
    <div className="fixed inset-0 z-[255] flex items-center justify-center bg-[#030712]/90 px-4 py-8">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-6 top-6 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
      >
        <X size={18} />
      </button>

      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#07111f] shadow-[0_30px_90px_rgba(2,6,23,0.45)]">
        <div className="border-b border-white/10 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
            {track.category || "Pausa rápida"}
          </p>
          <h3 className="mt-2 text-2xl font-semibold">{track.title}</h3>
          <p className="mt-2 max-w-3xl text-sm font-medium text-white/70">
            {track.description || "Pausa curta para recuperar o corpo e retomar melhor."}
          </p>
        </div>

        <div className="bg-black">
          {isDirectVideo ? (
            <video src={mediaUrl} controls autoPlay playsInline className="aspect-video w-full" />
          ) : (
            <iframe
              src={mediaUrl}
              title={track.title}
              className="aspect-video w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CvvKpiStripCard({ cvv }) {
  const href = String(cvv?.url || 'https://www.cvv.org.br').trim() || 'https://www.cvv.org.br';
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-h-[142px] flex-col rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50/90 via-white to-amber-50/25 p-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-[0_12px_28px_rgba(225,29,72,0.07)] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 min-w-0"
    >
      <div className="flex items-center gap-1.5 text-rose-700">
        <HeartHandshake size={13} className="shrink-0" />
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em]">{cvv?.eyebrow || 'Apoio CVV'}</p>
      </div>
      <p className="mt-2 text-lg font-semibold tracking-tight text-ink-900">{cvv?.phone || '188'}</p>
      <p className="mt-0.5 flex-1 text-[10px] font-semibold leading-snug text-ink-600 line-clamp-3">
        {cvv?.helper || ''}
      </p>
      <p className="mt-auto inline-flex items-center gap-0.5 pt-2 text-[10px] font-semibold text-rose-600 group-hover:text-rose-700">
        {cvv?.linkLabel || 'Site oficial'}
        <ArrowRight size={11} className="shrink-0" aria-hidden />
      </p>
    </a>
  );
}

function FatigueKpiStripCard({ score }) {
  const meta = fatigueStripMeta(score);
  return (
    <div className="flex min-h-[142px] flex-col rounded-2xl border border-ink-200 bg-white/90 p-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] min-w-0">
      <div className="flex items-center gap-1.5 text-brand-700">
        <Activity size={13} className="shrink-0" />
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em]">Carga mental</p>
      </div>
      <p className="mt-2 text-lg font-semibold tracking-tight text-ink-900">{score}%</p>
      <p className="mt-0.5 flex-1 text-[10px] font-medium leading-snug text-ink-500 line-clamp-3">{meta.helper}</p>
      <div className="mt-auto flex min-h-[22px] flex-col justify-end pt-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-ink-200/90">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${meta.tone} transition-all duration-700`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function SurfaceStat({ icon: Icon, label, value, helper, compact = false, stripEqual = false }) {
  if (stripEqual) {
    const tone = getCalmStatTone(label);
    return (
      <div
        className={`group flex min-h-[142px] flex-col rounded-2xl border p-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(37,99,235,0.08)] min-w-0 ${tone.card}`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${tone.iconWrap}`}>
            <Icon size={12} className="shrink-0" />
          </span>
          <p className={`text-[9px] font-semibold uppercase tracking-[0.12em] ${tone.label}`}>{label}</p>
        </div>
        <p className={`mt-2 text-lg font-semibold tracking-tight ${tone.value}`}>{value}</p>
        <p className={`mt-0.5 flex-1 text-[10px] font-semibold leading-snug line-clamp-3 ${tone.helper}`}>{helper}</p>
        <div className="mt-auto min-h-[22px] pt-2" aria-hidden />
      </div>
    );
  }

  return (
    <div
      className={`group rounded-2xl border border-ink-200 bg-white/85 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(37,99,235,0.08)] ${
        compact ? "p-2.5 sm:p-3" : "p-4"
      }`}
    >
      <div className="flex items-center gap-1.5 text-brand-700">
        <Icon size={compact ? 14 : 15} />
        <p className={`font-semibold uppercase tracking-[0.14em] text-brand-700 ${compact ? "text-[9px]" : "text-[10px]"}`}>
          {label}
        </p>
      </div>
      <p className={`mt-2 font-semibold text-ink-900 ${compact ? "text-base sm:text-lg" : "text-[1.75rem]"}`}>{value}</p>
      <p className={`mt-0.5 font-semibold leading-snug text-ink-500 ${compact ? "text-[10px] sm:text-[11px]" : "text-xs"}`}>
        {helper}
      </p>
    </div>
  );
}

function MiniPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[1.2rem] border border-ink-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-brand-700">
        <Icon size={14} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function DashboardInfoCard({ label, value, helper }) {
  return (
    <div className="rounded-[1.3rem] border border-ink-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink-900">{value}</p>
      <p className="mt-1 text-xs font-semibold text-ink-500">{helper}</p>
    </div>
  );
}

function DashboardBar({ label, value, tone = "default" }) {
  const gradient =
    tone === "positive"
      ? "from-emerald-400 to-brand-500"
      : tone === "warn"
      ? "from-amber-400 to-rose-400"
      : "from-brand-400 to-brand-500";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-900">{label}</p>
        <span className="text-xs font-semibold text-ink-500">{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink-200">
        <div className={`h-full rounded-full bg-gradient-to-r ${gradient}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function InfoTiny({ label, value }) {
  return (
    <div className="rounded-[1.1rem] border border-ink-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function MusicGlyph() {
  return (
    <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white">
      <Headphones size={42} />
    </div>
  );
}
