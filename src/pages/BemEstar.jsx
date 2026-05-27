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
    return { helper: "Sob controle — pausas leves bastam.", tone: "emerald" };
  }
  if (score <= 65) {
    return { helper: "Moderado — hidrate, respire, reduza estímulo.", tone: "amber" };
  }
  return { helper: "Pausa recomendada — recuperar rende mais.", tone: "rose" };
}

function fatigueBarStyle(tone) {
  if (tone === "emerald") return { background: "linear-gradient(to right, #34d399, #14b8a6)" };
  if (tone === "amber") return { background: "linear-gradient(to right, #fbbf24, #f97316)" };
  return { background: "linear-gradient(to right, #fb7185, #e11d48)" };
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
    <div className="pl-page">
      {/* Hero */}
      <header className="pl-be-hero">
        <div>
          <div className="icon">
            <Brain size={22} strokeWidth={1.75} color="#fff" />
          </div>
          <span className="eyebrow">{cfg.hero.badge || "Saude mental e foco"}</span>
          <h1>{cfg.hero.title || "Reduzir ruido, recuperar presenca e render com calma"}<span className="dot">.</span></h1>
          <p className="subtitle">{cfg.hero.subtitle || "Direcao e respiro antes da execucao."}</p>
          <div className="quote">
            <span className="ico">"</span>
            <p>
              <strong>{cfg.quote?.prefix || "Direcao"}</strong>{cfg.quote?.prefix ? " · " : ""}{cfg.quote?.body || "Nem todo avanco vem de acelerar — as vezes o salto nasce ao reduzir o ruido e voltar ao centro."}
            </p>
          </div>
        </div>
      </header>

      {/* KPI strip */}
      <section className="pl-be-kpis">
        {cfg.statusCards.map(({ label, value, helper, icon }) => {
          const Icon = wellnessIconComponent(icon);
          const isCvv = String(label || "").toLowerCase().includes("cvv");
          const isFoco = String(label || "").toLowerCase().includes("foco") || String(label || "").toLowerCase().includes("clareza");
          return (
            <div key={label} className={`pl-be-kpi${isCvv ? " cvv" : isFoco ? " foco" : ""}`}>
              <span className="lab"><Icon size={11} /> {label}</span>
              <span className="val">{value}</span>
              {helper ? <p className="helper">{helper}</p> : null}
            </div>
          );
        })}
        <CvvKpiStripCard cvv={cfg.cvv} />
        <FatigueKpiStripCard score={fatigueScore} />
      </section>

      {/* Tabs */}
      <div className="pl-be-tabs-wrap">
        <p className="eyebrow">Navegacao</p>
        <nav className="pl-be-tabs" aria-label="Areas de bem-estar">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCurrentView(id)}
              className={`pl-be-tab${currentView === id ? " active" : ""}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Resumo strip */}
      <section className="pl-be-resumo">
        <div className="col head">
          <span className="lab">Resumo</span>
          <p><strong>{cfg.resumo?.introLead}</strong> {cfg.resumo?.intro || "Uma aba por tipo de cuidado. Rituais curtos entre blocos evitam sobrecarga."}</p>
        </div>
        {(cfg.wellbeingPlan || []).slice(0, 3).map(({ title, text, icon }, idx) => {
          const Icon = wellnessIconComponent(icon);
          return (
            <div key={title || idx} className="col">
              <span className="lab"><Icon size={11} /> {title}</span>
              <p>{text}</p>
            </div>
          );
        })}
      </section>

      <main>
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
    <section className="pl-be-overview">
      {/* 3 feature cards */}
      <div className="pl-be-features">
        {cfg.overviewCards.map(({ id, title, eyebrow, text, icon }) => {
          const Icon = wellnessIconComponent(icon);
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCurrentView(id)}
              className="pl-be-feature"
            >
              <div className="top">
                <div className="icon"><Icon size={20} /></div>
                <span className="tag">{eyebrow}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              <a role="button" tabIndex={-1}>Abrir área <ArrowRight size={13} /></a>
            </button>
          );
        })}
      </div>

      {/* Direction + readings */}
      <div className="pl-be-directed">
        <div className="pl-be-dir-card">
          <p className="eyebrow">{cfg.overviewDirection.eyebrow}</p>
          <h3>{cfg.overviewDirection.title}</h3>
          <p>{cfg.overviewDirection.body}</p>
          <div className="pl-be-dir-pills">
            <div className="pl-be-dir-pill">
              <span className="lab"><Zap size={11} /> Prioridade</span>
              <div className="val">{cfg.overviewDirection.priorityPill}</div>
            </div>
            <div className="pl-be-dir-pill">
              <span className="lab"><Waves size={11} /> Categorias</span>
              <div className="val">{categoryCount} ativas</div>
            </div>
            <div className="pl-be-dir-pill">
              <span className="lab"><MoonStar size={11} /> Técnicas</span>
              <div className="val">{techniqueCount} opções</div>
            </div>
          </div>
        </div>

        <div className="pl-be-leitura-card">
          <p className="eyebrow">{cfg.overviewReadingsEyebrow}</p>
          <div className="pl-be-leitura-row">
            <span className="lab">Faixas ativas</span>
            <div className="val">{publicAudioTracks.length}</div>
            <p className="helper">Áudios disponíveis</p>
          </div>
          <div className="pl-be-leitura-row">
            <span className="lab">Pausas em vídeo</span>
            <div className="val">{publicVideoTracks.length}</div>
            <p className="helper">Clipes prontos para abrir</p>
          </div>
          <div className="pl-be-leitura-row">
            <span className="lab">Carga estimada</span>
            <div className="val">{fatigueScore}%</div>
            <p className="helper">Leitura visual rápida</p>
          </div>
          <div className="pl-be-bars">
            {cfg.dailySignals.map((item) => (
              <DashboardBar key={item.label} {...item} />
            ))}
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
    <section className="pl-be-stage">
      <div style={{ display: "grid", gap: 0 }}>
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.10)", padding: "24px 28px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 9999,
            border: "1px solid rgba(96,165,250,0.20)",
            background: "rgba(59,130,246,0.10)",
            padding: "6px 16px",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "#93c5fd",
          }}>
            <Wind size={12} />
            {breathingBadge}
          </div>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {breathingTechniques.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTechnique(item.id)}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 16,
                  border: activeTechnique === item.id
                    ? "1px solid rgba(96,165,250,0.30)"
                    : "1px solid rgba(255,255,255,0.10)",
                  background: activeTechnique === item.id
                    ? "rgba(59,130,246,0.10)"
                    : "rgba(255,255,255,0.05)",
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: 14,
                  fontWeight: 600,
                  color: activeTechnique === item.id ? "#fff" : "rgba(255,255,255,0.70)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span>{item.nome}</span>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "#bfdbfe" }}>
                  {item.uso}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          <div
            style={{
              margin: "0 auto",
              display: "flex",
              height: 240,
              width: 240,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              border: "1px solid rgba(147,197,253,0.20)",
              background: "radial-gradient(circle at center, rgba(59,130,246,0.30), rgba(15,23,42,0.02) 60%)",
              transition: "all 0.5s",
              transform: isBreathing ? "scale(1.05)" : "scale(0.95)",
              boxShadow: isBreathing ? "0 0 80px rgba(59,130,246,0.18)" : "none",
            }}
          >
            <div style={{
              display: "flex",
              height: 176,
              width: 176,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              padding: "0 24px",
              textAlign: "center",
              backdropFilter: "blur(8px)",
            }}>
              <div>
                <p style={{ fontSize: 20, fontWeight: 600, color: "#fff" }}>
                  {isBreathing ? currentPhase.nome : activeTechniqueData.nome}
                </p>
                <p style={{ marginTop: 8, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em", color: "#bfdbfe" }}>
                  {isBreathing ? `${breathingState.remaining}s` : activeTechniqueData.uso}
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: "grid", gap: 16, gridTemplateColumns: "1fr 280px" }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: "#cbd5e1" }}>
                {activeTechniqueData.descricao}
              </p>
              <p style={{ marginTop: 12, fontSize: 12, fontWeight: 600, lineHeight: 1.6, color: "#94a3b8" }}>
                {activeTechniqueData.comoFazer}
              </p>
            </div>

            <div style={{
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              padding: 16,
            }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.50)" }}>
                Insight
              </p>
              <p style={{ marginTop: 8, fontSize: 14, fontWeight: 700, lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>
                {activeTechniqueData.insight}
              </p>
            </div>
          </div>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {activeTechniqueData.fases.map((fase, index) => {
              const isActive = isBreathing && breathingState.phaseIndex === index;
              return (
                <div
                  key={`${activeTechnique}-${fase.nome}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderRadius: 16,
                    border: isActive ? "1px solid rgba(96,165,250,0.20)" : "1px solid rgba(255,255,255,0.10)",
                    background: isActive ? "rgba(59,130,246,0.10)" : "rgba(255,255,255,0.05)",
                    padding: "12px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: isActive ? "#fff" : "#e2e8f0",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        display: "flex",
                        height: 28,
                        width: 28,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        fontSize: 11,
                        fontWeight: 600,
                        background: isActive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.10)",
                        color: isActive ? "#fff" : "#e2e8f0",
                      }}
                    >
                      {index + 1}
                    </span>
                    <span>{fase.nome}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em" }}>
                    {fase.segundos}s
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 12 }}>
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
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 16,
                padding: "12px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                border: isBreathing ? "1px solid rgba(251,113,133,0.30)" : "none",
                background: isBreathing ? "rgba(244,63,94,0.10)" : "var(--pl-accent)",
                color: isBreathing ? "#fda4af" : "#fff",
              }}
            >
              <Play size={15} fill="currentColor" />
              {isBreathing ? "Parar respiração guiada" : "Iniciar respiração guiada"}
            </button>

            <span style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 700,
              color: "rgba(255,255,255,0.70)",
            }}>
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
    <section className="pl-card" style={{ padding: 24, boxShadow: "0 14px 34px rgba(15,23,42,0.05)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p className="pl-eyebrow" style={{ color: "var(--pl-ink-3)" }}>
            {audioEyebrow}
          </p>
          <h3 style={{ marginTop: 8, fontSize: 24, fontWeight: 600, color: "var(--pl-ink)" }}>
            {audioTitle}
          </h3>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            onClick={() => setFocusModeOpen(true)}
            className="pl-btn pl-btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <Expand size={15} />
            Tela cheia
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={() => setActiveTab?.("admin_configuracoes")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 12,
                border: "1px solid var(--pl-accent-soft)",
                background: "var(--pl-accent-soft)",
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--pl-accent)",
                cursor: "pointer",
              }}
            >
              <Waves size={15} />
              Ajustar no ADM
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 20, display: "grid", gap: 16, gridTemplateColumns: "0.92fr 1.08fr" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.entries(groupedTracks).map(([category, items]) => (
            <div key={category}>
              <p className="pl-eyebrow" style={{ marginBottom: 8, color: "var(--pl-ink-3)" }}>
                {category}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => setActiveTrackId(track.id)}
                    style={{
                      position: "relative",
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      gap: 12,
                      overflow: "hidden",
                      borderRadius: 22,
                      border: activeTrack?.id === track.id
                        ? "1px solid var(--pl-accent-soft)"
                        : "1px solid var(--pl-rule-2)",
                      background: activeTrack?.id === track.id
                        ? "var(--pl-accent-soft)"
                        : "var(--pl-bg-soft)",
                      padding: "16px",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: "0 0 auto 0",
                        height: 4,
                        background: track.accent
                          ? `linear-gradient(to right, ${track.accent})`
                          : "linear-gradient(to right, rgba(14,165,233,0.20), rgba(59,130,246,0.10))",
                      }}
                    />
                    <div style={{
                      position: "relative",
                      zIndex: 1,
                      display: "flex",
                      height: 48,
                      width: 48,
                      flexShrink: 0,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 16,
                      background: "#18365C",
                      color: "#fff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                    }}>
                      <Headphones size={18} />
                    </div>
                    <div style={{ position: "relative", zIndex: 1, minWidth: 0, flex: 1 }}>
                      <p style={{ fontWeight: 600, color: "var(--pl-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</p>
                      <p className="pl-eyebrow" style={{ marginTop: 4, color: "var(--pl-ink-3)" }}>
                        {track.durationLabel || "Sem duração"}
                      </p>
                    </div>
                    <ChevronRight size={16} style={{ position: "relative", zIndex: 1, color: "var(--pl-ink-3)" }} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ overflow: "hidden", borderRadius: 27, border: "1px solid var(--pl-rule-2)", background: "var(--pl-bg-soft)" }}>
          <div style={{ position: "relative", aspectRatio: "16/8.4", background: "#18365C" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, rgba(96,165,250,0.55), rgba(24,54,92,1) 70%)" }} />
            <div style={{ position: "relative", zIndex: 1, display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
              <MusicGlyph />
            </div>
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p className="pl-eyebrow" style={{ color: "var(--pl-ink-3)" }}>
                  {activeTrack?.category || "Biblioteca"}
                </p>
                <h4 style={{ marginTop: 8, fontSize: 24, fontWeight: 600, color: "var(--pl-ink)" }}>
                  {activeTrack?.title || "Nenhuma faixa disponível"}
                </h4>
              </div>

              <span style={{
                borderRadius: 9999,
                border: "1px solid var(--pl-rule-2)",
                background: "var(--pl-surface)",
                padding: "4px 12px",
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "var(--pl-ink-3)",
              }}>
                {activeTrack?.durationLabel || "Sem duração"}
              </span>
            </div>

            <p style={{ marginTop: 12, fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: "var(--pl-ink-2)" }}>
              {activeTrack?.description || "A biblioteca pode ser atualizada pelo administrador."}
            </p>

            <div style={{ marginTop: 20, display: "grid", gap: 12, gridTemplateColumns: "repeat(3, 1fr)" }}>
              <InfoTiny label="Categoria" value={activeTrack?.category || "?"} />
              <InfoTiny label="Formato" value="Áudio" />
              <InfoTiny label="Uso" value="Recuperação mental" />
            </div>

            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 12 }}>
              <button
                type="button"
                onClick={() => onPlayTrack?.(activeTrack?.id)}
                disabled={!canPlayActiveTrack}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 16,
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  cursor: canPlayActiveTrack ? "pointer" : "not-allowed",
                  background: canPlayActiveTrack ? "var(--pl-accent)" : "var(--pl-ink-4)",
                  border: "none",
                  transition: "all 0.15s",
                }}
              >
                <Play size={15} fill="currentColor" />
                {canPlayActiveTrack ? "Ouvir na plataforma" : "Arquivo indisponível"}
              </button>

              <button
                type="button"
                onClick={() => setFocusModeOpen(true)}
                className="pl-btn pl-btn-ghost"
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <Expand size={15} />
                Relaxar em tela cheia
              </button>
            </div>

            {activeTrack?.credits ? (
              <details style={{ marginTop: 16, fontSize: 12, fontWeight: 500, color: "var(--pl-ink-3)" }}>
                <summary style={{ cursor: "pointer", listStyle: "none", fontWeight: 700, color: "var(--pl-ink-2)" }}>
                  Créditos
                </summary>
                <p style={{ marginTop: 8, lineHeight: 1.6 }}>{activeTrack.credits}</p>
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
    <section className="pl-card" style={{ padding: 24, boxShadow: "0 14px 34px rgba(15,23,42,0.05)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={18} style={{ color: "var(--pl-success)" }} />
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--pl-ink)" }}>{videoTitle}</h3>
          </div>
          <p style={{ marginTop: 8, fontSize: 14, fontWeight: 500, color: "var(--pl-ink-2)" }}>
            {videoBody}
          </p>
        </div>

        <span style={{
          borderRadius: 9999,
          border: "1px solid var(--pl-rule-2)",
          background: "var(--pl-bg-soft)",
          padding: "8px 16px",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: "var(--pl-ink-3)",
        }}>
          {videoBadge}
        </span>
      </div>

      <div style={{ marginTop: 20, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {publicVideoTracks.map((item) => (
          <div
            key={item.id}
            style={{
              overflow: "hidden",
              borderRadius: 26,
              border: "1px solid var(--pl-rule-2)",
              background: "var(--pl-bg-soft)",
              boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
              transition: "all 0.15s",
            }}
          >
            <div style={{ aspectRatio: "16/9", background: "#18365C" }}>
              <div style={{
                display: "flex",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                background: "radial-gradient(circle at center, rgba(16,185,129,0.35), rgba(24,54,92,1) 74%)",
              }}>
                <Activity size={28} style={{ color: "#fff" }} />
              </div>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <p style={{ fontWeight: 600, color: "var(--pl-ink)" }}>{item.title}</p>
                <span style={{
                  borderRadius: 9999,
                  border: "1px solid var(--pl-rule-2)",
                  background: "var(--pl-surface)",
                  padding: "4px 12px",
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "var(--pl-ink-3)",
                }}>
                  {item.durationLabel || "Vídeo"}
                </span>
              </div>

              <p style={{ marginTop: 8, fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: "var(--pl-ink-2)" }}>
                {item.description || "Vídeo curto para pausar, soltar tensão e voltar melhor."}
              </p>

              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {resolveWellnessMediaUrl(item) ? (
                  <button
                    type="button"
                    onClick={() => onOpenPause?.(item.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 12,
                      border: "1px solid var(--pl-rule-2)",
                      background: "var(--pl-surface)",
                      padding: "10px 16px",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--pl-accent)",
                      cursor: "pointer",
                    }}
                  >
                    <Play size={15} fill="currentColor" />
                    Abrir pausa
                  </button>
                ) : null}

                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: 12,
                  border: "1px solid var(--pl-rule-2)",
                  background: "var(--pl-surface)",
                  padding: "8px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--pl-ink-3)",
                }}>
                  {item.category || "Micro pausa"}
                </span>
              </div>
            </div>
          </div>
        ))}

        {publicVideoTracks.length === 0 ? (
          <div style={{
            borderRadius: 24,
            border: "1px dashed var(--pl-rule-2)",
            background: "var(--pl-bg-soft)",
            padding: 20,
            fontSize: 14,
            fontWeight: 500,
            color: "var(--pl-ink-2)",
            gridColumn: "1 / -1",
          }}>
            Nenhum vídeo de pausa foi cadastrado ainda. O administrador poderá subir a biblioteca
            depois pelo fluxo real em{" "}
            <button
              type="button"
              onClick={() => setActiveTab?.("admin_configuracoes")}
              style={{ fontWeight: 600, color: "var(--pl-accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
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
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 260,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#030712",
      padding: "32px 24px",
    }}>
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "absolute",
          right: 24,
          top: 24,
          display: "inline-flex",
          height: 44,
          width: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.05)",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        <X size={18} />
      </button>

      <div style={{ display: "flex", maxWidth: 896, flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{
          display: "flex",
          height: 224,
          width: 224,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 35,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "radial-gradient(circle at center, rgba(96,165,250,0.65), rgba(15,23,42,0.96) 70%)",
          boxShadow: "0 30px 80px rgba(37,99,235,0.16)",
        }}>
          <MusicGlyph />
        </div>

        <p style={{ marginTop: 32, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.22em", color: "#bfdbfe" }}>
          {track.category || "Bem-estar"}
        </p>
        <h3 style={{ marginTop: 12, fontSize: 36, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff" }}>{track.title}</h3>
        <p style={{ marginTop: 12, maxWidth: 672, fontSize: 16, fontWeight: 500, lineHeight: 1.6, color: "rgba(255,255,255,0.70)" }}>
          {track.description || "Use este modo para descansar com menos estímulo visual."}
        </p>

        <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <span style={{
            borderRadius: 9999,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.05)",
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 700,
            color: "rgba(255,255,255,0.80)",
          }}>
            {track.durationLabel || "Sem duração"}
          </span>
          <button
            type="button"
            onClick={() => onPlayTrack?.(track.id)}
            disabled={!canPlayTrack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 16,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              border: "none",
              cursor: canPlayTrack ? "pointer" : "not-allowed",
              background: canPlayTrack ? "var(--pl-accent)" : "#64748b",
            }}
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
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 255,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(3,7,18,0.90)",
      padding: "32px 16px",
    }}>
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "absolute",
          right: 24,
          top: 24,
          display: "inline-flex",
          height: 44,
          width: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.05)",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        <X size={18} />
      </button>

      <div style={{
        width: "100%",
        maxWidth: 1280,
        overflow: "hidden",
        borderRadius: 32,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "#07111f",
        boxShadow: "0 30px 90px rgba(2,6,23,0.45)",
      }}>
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.10)", padding: "20px 24px", color: "#fff" }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: "#a7f3d0" }}>
            {track.category || "Pausa rápida"}
          </p>
          <h3 style={{ marginTop: 8, fontSize: 24, fontWeight: 600 }}>{track.title}</h3>
          <p style={{ marginTop: 8, maxWidth: "100%", fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.70)" }}>
            {track.description || "Pausa curta para recuperar o corpo e retomar melhor."}
          </p>
        </div>

        <div style={{ background: "#000" }}>
          {isDirectVideo ? (
            <video src={mediaUrl} controls autoPlay playsInline style={{ aspectRatio: "16/9", width: "100%", display: "block" }} />
          ) : (
            <iframe
              src={mediaUrl}
              title={track.title}
              style={{ aspectRatio: "16/9", width: "100%", display: "block" }}
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
  const href = String(cvv?.url || "https://www.cvv.org.br").trim() || "https://www.cvv.org.br";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        minHeight: 142,
        flexDirection: "column",
        borderRadius: 16,
        border: "1px solid rgba(254,205,211,0.90)",
        background: "linear-gradient(135deg, rgba(255,241,242,0.90) 0%, var(--pl-surface) 60%, rgba(255,251,235,0.25) 100%)",
        padding: 10,
        boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
        transition: "all 0.15s",
        minWidth: 0,
        textDecoration: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#be123c" }}>
        <HeartHandshake size={13} style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em" }}>{cvv?.eyebrow || "Apoio CVV"}</p>
      </div>
      <p style={{ marginTop: 8, fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--pl-ink)" }}>{cvv?.phone || "188"}</p>
      <p style={{ marginTop: 2, flex: 1, fontSize: 10, fontWeight: 600, lineHeight: 1.4, color: "var(--pl-ink-2)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
        {cvv?.helper || ""}
      </p>
      <p style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 2, paddingTop: 8, fontSize: 10, fontWeight: 600, color: "#e11d48" }}>
        {cvv?.linkLabel || "Site oficial"}
        <ArrowRight size={11} style={{ flexShrink: 0 }} aria-hidden />
      </p>
    </a>
  );
}

function FatigueKpiStripCard({ score }) {
  const meta = fatigueStripMeta(score);
  return (
    <div style={{
      display: "flex",
      minHeight: 142,
      flexDirection: "column",
      borderRadius: 16,
      border: "1px solid var(--pl-rule-2)",
      background: "var(--pl-surface)",
      padding: 10,
      boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
      minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--pl-accent)" }}>
        <Activity size={13} style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em" }}>Carga mental</p>
      </div>
      <p style={{ marginTop: 8, fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--pl-ink)" }}>{score}%</p>
      <p style={{ marginTop: 2, flex: 1, fontSize: 10, fontWeight: 500, lineHeight: 1.4, color: "var(--pl-ink-3)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{meta.helper}</p>
      <div style={{ marginTop: "auto", display: "flex", minHeight: 22, flexDirection: "column", justifyContent: "flex-end", paddingTop: 8 }}>
        <div style={{ height: 6, overflow: "hidden", borderRadius: 9999, background: "var(--pl-bg-soft)" }}>
          <div
            style={{ height: "100%", borderRadius: 9999, transition: "width 0.7s", width: `${score}%`, ...fatigueBarStyle(meta.tone) }}
          />
        </div>
      </div>
    </div>
  );
}

function SurfaceStat({ icon: Icon, label, value, helper, compact = false }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid var(--pl-rule-2)",
        background: "var(--pl-surface)",
        boxShadow: "0 10px 30px rgba(15,23,42,0.04)",
        transition: "all 0.15s",
        padding: compact ? 10 : 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--pl-accent)" }}>
        <Icon size={compact ? 14 : 15} />
        <p style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--pl-accent)", fontSize: compact ? 9 : 10 }}>
          {label}
        </p>
      </div>
      <p style={{ marginTop: 8, fontWeight: 600, color: "var(--pl-ink)", fontSize: compact ? 18 : 28 }}>{value}</p>
      <p style={{ marginTop: 2, fontWeight: 600, lineHeight: 1.4, color: "var(--pl-ink-2)", fontSize: compact ? 10 : 12 }}>
        {helper}
      </p>
    </div>
  );
}

function MiniPill({ icon: Icon, label, value }) {
  return (
    <div style={{
      borderRadius: 19,
      border: "1px solid var(--pl-rule-2)",
      background: "var(--pl-surface)",
      padding: "12px 16px",
      boxShadow: "0 2px 6px rgba(15,23,42,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--pl-accent)" }}>
        <Icon size={14} />
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em" }}>{label}</p>
      </div>
      <p style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: "var(--pl-ink)" }}>{value}</p>
    </div>
  );
}

function DashboardInfoCard({ label, value, helper }) {
  return (
    <div style={{
      borderRadius: 21,
      border: "1px solid var(--pl-rule-2)",
      background: "var(--pl-surface)",
      padding: 16,
      boxShadow: "0 2px 6px rgba(15,23,42,0.04)",
    }}>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--pl-ink-3)" }}>{label}</p>
      <p style={{ marginTop: 8, fontSize: 24, fontWeight: 600, color: "var(--pl-ink)" }}>{value}</p>
      <p style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: "var(--pl-ink-2)" }}>{helper}</p>
    </div>
  );
}

function DashboardBar({ label, value, tone = "default" }) {
  const barStyle =
    tone === "positive"
      ? { background: "linear-gradient(to right, #34d399, #3b82f6)" }
      : tone === "warn"
      ? { background: "linear-gradient(to right, #fbbf24, #fb7185)" }
      : { background: "linear-gradient(to right, #60a5fa, #818cf8)" };

  return (
    <div>
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--pl-ink)" }}>{label}</p>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--pl-ink-2)" }}>{value}%</span>
      </div>
      <div style={{ height: 10, overflow: "hidden", borderRadius: 9999, background: "var(--pl-bg-soft)" }}>
        <div style={{ height: "100%", borderRadius: 9999, width: `${value}%`, ...barStyle }} />
      </div>
    </div>
  );
}

function InfoTiny({ label, value }) {
  return (
    <div style={{
      borderRadius: 18,
      border: "1px solid var(--pl-rule-2)",
      background: "var(--pl-surface)",
      padding: 12,
    }}>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--pl-ink-3)" }}>{label}</p>
      <p style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: "var(--pl-ink)" }}>{value}</p>
    </div>
  );
}

function MusicGlyph() {
  return (
    <div style={{
      display: "flex",
      height: 112,
      width: 112,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "50%",
      border: "1px solid rgba(255,255,255,0.15)",
      background: "rgba(255,255,255,0.10)",
      color: "#fff",
    }}>
      <Headphones size={42} />
    </div>
  );
}
