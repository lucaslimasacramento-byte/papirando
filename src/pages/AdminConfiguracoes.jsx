import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileSignature,
  GraduationCap,
  Headphones,
  LayoutGrid,
  Lightbulb,
  Music4,
  Bell,
  PanelLeft,
  Plus,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Trophy,
  Wand2,
} from 'lucide-react';
import { checkAiHealth } from '../lib/aiClient';
import {
  PROGRESS_METRIC_OPTIONS,
  buildDefaultBadgeConfig,
  buildDefaultXpConfig,
} from '../lib/profileProgress';
import { normalizeWellnessLibrary, resolveWellnessMediaUrl } from '../lib/wellnessLibrary';
import { normalizeWellnessPageConfig } from '../lib/wellnessPageConfig';
import AdminWellnessPageConfigEditor from '../components/AdminWellnessPageConfigEditor';
import { normalizeRedacaoExpertTip } from '../lib/redacaoExpertTipsApi';
import { REDACAO_THEME_BANK_DEFAULT } from '../data/redacaoThemeBankDefault';
import { REDACAO_BANCA_OPTIONS } from '../data/redacaoBancaGuides';
import { mergeRedacaoKitBundle, sanitizeRedacaoKitForSave } from '../lib/redacaoKitMerge';
import { AdminRedacaoKitEditor } from '../components/AdminRedacaoKitEditor';
import { AdminRedacaoThemeBankEditor } from '../components/AdminRedacaoThemeBankEditor';
import { AdminAudiobookCatalogEditor } from '../components/AdminAudiobookCatalogEditor';
import { sanitizeAudiobooksForSave } from '../lib/audiobookCatalogAdmin';
import { AdminSidebarLabelsEditor } from '../components/AdminSidebarLabelsEditor';
import { buildDefaultAudiobookCatalog } from '../lib/audiobooks';
import { NOTIFICATION_SETTING_OPTIONS, normalizeNotificationSettings } from '../lib/notificationSettings';
import { normalizeCourseTemplates } from '../lib/courseTemplates';
import { EDITABLE_PLAN_KEYS, PLAN_LIMIT_FIELDS, normalizePlanLimits, planLabel } from '../lib/planLimitsConfig';

function normalizeThemeBanca(banca) {
  const b = String(banca || '').trim();
  if (REDACAO_BANCA_OPTIONS.some((o) => o.value === b)) return b;
  if (/cespe/i.test(b) && !b.includes('/')) return 'CESPE / CEBRASPE';
  return REDACAO_BANCA_OPTIONS[0]?.value || 'CESPE / CEBRASPE';
}

function sanitizeThemeBankForSave(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((r) => ({
      id: String(r.id || '').trim(),
      eixo: String(r.eixo || '').trim(),
      banca: normalizeThemeBanca(r.banca),
      title: String(r.title || '').trim(),
      description: String(r.description || '').trim(),
    }))
    .filter((r) => r.id && r.title && r.description);
}

function stripAudiobookForDraft(book) {
  if (!book || typeof book !== 'object') return book;
  const { linkedDiscipline: _linkedDiscipline, linkedTopic: _linkedTopic, ...rest } = book;
  const tracks = (Array.isArray(rest.tracks) ? rest.tracks : []).map((t) => {
    if (!t || typeof t !== 'object') return t;
    const { disciplineId: _disciplineId, ...tr } = t;
    return tr;
  });
  return { ...rest, tracks };
}

export default function AdminConfiguracoes({
  contestLibrary = [],
  cursos = [],
  bancoDisciplinas = [],
  progressConfig = { xp: {}, badges: [] },
  wellnessLibrary = [],
  wellnessPageConfig = null,
  redacaoExpertTips = [],
  onSaveProgressConfig,
  onSaveWellnessLibrary,
  onSaveWellnessPageConfig,
  onSaveRedacaoExpertTips,
  redacaoThemeBankEffective = REDACAO_THEME_BANK_DEFAULT,
  redacaoKitOverride = null,
  audiobookCatalogOverride = null,
  onSaveRedacaoSiteContent,
  sidebarLabelsOverride = null,
  onSaveSidebarLabels,
  notificationSettings = null,
  onSaveNotificationSettings,
  planLimits = null,
  onSavePlanLimits,
  initialSection = 'conteudo',
}) {
  const [activeSection, setActiveSection] = useState(initialSection || 'conteudo');
  const [xpDraft, setXpDraft] = useState(progressConfig?.xp || buildDefaultXpConfig());
  const [badgeDraft, setBadgeDraft] = useState(progressConfig?.badges || buildDefaultBadgeConfig());
  const [wellnessDraft, setWellnessDraft] = useState(normalizeWellnessLibrary(wellnessLibrary));
  const [wellnessPageDraft, setWellnessPageDraft] = useState(() => normalizeWellnessPageConfig(wellnessPageConfig));
  const [openXpRules, setOpenXpRules] = useState([]);
  const [openBadges, setOpenBadges] = useState([]);
  const [openTracks, setOpenTracks] = useState([]);
  const [saveFeedback, setSaveFeedback] = useState('');
  const [wellnessInnerTab, setWellnessInnerTab] = useState('audio');
  const [redacaoTipsDraft, setRedacaoTipsDraft] = useState(() =>
    (Array.isArray(redacaoExpertTips) ? redacaoExpertTips : []).map((row) => normalizeRedacaoExpertTip(row))
  );
  const [redacaoTipsSaving, setRedacaoTipsSaving] = useState(false);
  const [progressSaving, setProgressSaving] = useState(false);
  const [wellnessSaving, setWellnessSaving] = useState(false);
  const [themeBankDraft, setThemeBankDraft] = useState(() => []);
  const [kitDraft, setKitDraft] = useState(() => mergeRedacaoKitBundle(null));
  const [audiobookCatalogDraft, setAudiobookCatalogDraft] = useState(() => []);
  const [notificationDraft, setNotificationDraft] = useState(() => normalizeNotificationSettings(notificationSettings));
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [planLimitsDraft, setPlanLimitsDraft] = useState(() => normalizePlanLimits(planLimits));
  const [planLimitsSaving, setPlanLimitsSaving] = useState(false);
  const [redacaoSiteSaving, setRedacaoSiteSaving] = useState(false);
  const [aiStatus, setAiStatus] = useState({ provider: 'offline', status: 'offline', model: '' });
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setXpDraft(progressConfig?.xp || buildDefaultXpConfig());
  }, [progressConfig]);

  useEffect(() => {
    setBadgeDraft(progressConfig?.badges || buildDefaultBadgeConfig());
  }, [progressConfig]);

  useEffect(() => {
    setWellnessDraft(normalizeWellnessLibrary(wellnessLibrary));
  }, [wellnessLibrary]);

  useEffect(() => {
    setWellnessPageDraft(normalizeWellnessPageConfig(wellnessPageConfig));
  }, [wellnessPageConfig]);

  useEffect(() => {
    setRedacaoTipsDraft((Array.isArray(redacaoExpertTips) ? redacaoExpertTips : []).map((row) => normalizeRedacaoExpertTip(row)));
  }, [redacaoExpertTips]);

  useEffect(() => {
    if (activeSection !== 'redacoes-dados') return;
    const themes = redacaoThemeBankEffective || REDACAO_THEME_BANK_DEFAULT;
    setThemeBankDraft(
      JSON.parse(JSON.stringify(Array.isArray(themes) ? themes : [])).map((t) => ({
        ...t,
        banca: normalizeThemeBanca(t.banca),
      }))
    );
    setKitDraft(mergeRedacaoKitBundle(redacaoKitOverride));
    const ab = audiobookCatalogOverride?.length ? audiobookCatalogOverride : buildDefaultAudiobookCatalog();
    setAudiobookCatalogDraft(JSON.parse(JSON.stringify(ab)).map(stripAudiobookForDraft));
  }, [activeSection, redacaoThemeBankEffective, redacaoKitOverride, audiobookCatalogOverride]);

  useEffect(() => {
    setNotificationDraft(normalizeNotificationSettings(notificationSettings));
  }, [notificationSettings]);

  useEffect(() => {
    setPlanLimitsDraft(normalizePlanLimits(planLimits));
  }, [planLimits]);

  useEffect(() => {
    refreshAiHealth();
  }, []);

  useEffect(() => {
    setActiveSection(initialSection || 'conteudo');
  }, [initialSection]);

  const refreshAiHealth = async () => {
    setAiLoading(true);
    try {
      const status = await checkAiHealth();
      setAiStatus(status);
    } finally {
      setAiLoading(false);
    }
  };

  const planOptions = useMemo(
    () =>
      [...new Set([...contestLibrary, ...cursos].map((item) => item?.plano || item?.nome).filter(Boolean))].sort(
        (a, b) => String(a).localeCompare(String(b), 'pt-BR')
      ),
    [contestLibrary, cursos]
  );

  const subjectOptions = useMemo(
    () =>
      [...new Set((Array.isArray(bancoDisciplinas) ? bancoDisciplinas : []).map((item) => item?.nome).filter(Boolean))].sort(
        (a, b) => String(a).localeCompare(String(b), 'pt-BR')
      ),
    [bancoDisciplinas]
  );
  const filteredWellnessDraft = useMemo(
    () =>
      wellnessDraft.filter((track) =>
        wellnessInnerTab === 'audio'
          ? String(track.mediaType || 'audio') !== 'video'
          : String(track.mediaType || 'audio') === 'video'
      ),
    [wellnessDraft, wellnessInnerTab]
  );

  const saveSection = async () => {
    let msg = 'Salvo com sucesso.';
    if (activeSection === 'xp' || activeSection === 'badges') {
      setProgressSaving(true);
      try {
        await onSaveProgressConfig?.({ xp: xpDraft, badges: badgeDraft });
        msg = activeSection === 'xp' ? 'XP e níveis salvos.' : 'Selos salvos.';
      } catch (e) {
        msg = `Erro ao salvar: ${String(e?.message || e)}`;
      } finally {
        setProgressSaving(false);
      }
    } else if (activeSection === 'wellness') {
      setWellnessSaving(true);
      try {
        await onSaveWellnessLibrary?.(wellnessDraft);
        await onSaveWellnessPageConfig?.(wellnessPageDraft);
        msg = 'Biblioteca de bem-estar salva.';
      } catch (e) {
        msg = `Erro ao salvar: ${String(e?.message || e)}`;
      } finally {
        setWellnessSaving(false);
      }
    } else {
      return;
    }
    setSaveFeedback(msg);
    window.setTimeout(() => setSaveFeedback(''), 3200);
  };

  const sectionSaveLabel = {
    xp: 'Salvar XP e níveis',
    badges: 'Salvar selos',
    wellness: 'Salvar bem-estar',
  };
  const sectionIsSaving = progressSaving || wellnessSaving;
  const showGlobalSave = activeSection === 'xp' || activeSection === 'badges' || activeSection === 'wellness';

  return (
    <div className="pl-paper-bg" style={{ minHeight: '100vh', padding: '28px 28px 48px' }}>
      {/* Hero */}
      <div style={{ marginBottom: 24 }}>
        <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Admin do produto</p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="pl-display" style={{ marginBottom: 8 }}>Configurações estruturais.</h1>
            <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', maxWidth: 620 }}>
              Central para alimentar o app sem código: a aba Conteúdo do app reúne atalhos; redações (dicas, temas, kit e audiolivros), bem-estar, XP e selos ficam em formulários estruturados.
            </p>
          </div>
          {showGlobalSave ? (
            <button
              type="button"
              onClick={() => void saveSection()}
              disabled={sectionIsSaving}
              className="pl-btn pl-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
            >
              <Save size={16} />
              {sectionIsSaving ? 'Salvando…' : (sectionSaveLabel[activeSection] || 'Salvar')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="pl-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, borderRadius: 12, background: 'var(--pl-bg-soft)', padding: 6 }}>
          <ConfigTab
            active={activeSection === 'conteudo'}
            onClick={() => setActiveSection('conteudo')}
            label="Conteúdo do app"
          />
          <ConfigTab
            active={activeSection === 'sidebar-menu'}
            onClick={() => setActiveSection('sidebar-menu')}
            label="Menu lateral"
          />
          <ConfigTab
            active={activeSection === 'notifications'}
            onClick={() => setActiveSection('notifications')}
            label="Notificações"
          />
          <ConfigTab
            active={activeSection === 'planos'}
            onClick={() => setActiveSection('planos')}
            label="Planos · limites"
          />
          <ConfigTab active={activeSection === 'xp'} onClick={() => setActiveSection('xp')} label="XP e níveis" />
          <ConfigTab active={activeSection === 'badges'} onClick={() => setActiveSection('badges')} label="Selos" />
          <ConfigTab active={activeSection === 'wellness'} onClick={() => setActiveSection('wellness')} label="Bem-estar" />
          <ConfigTab active={activeSection === 'redacoes-tips'} onClick={() => setActiveSection('redacoes-tips')} label="Redações · dicas" />
          <ConfigTab active={activeSection === 'redacoes-dados'} onClick={() => setActiveSection('redacoes-dados')} label="Redações · banco" />
        </div>

        {saveFeedback ? (
          <div style={{ marginTop: 16, borderRadius: 8, border: '1px solid var(--pl-success-soft)', background: 'var(--pl-success-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--pl-success)' }}>
            {saveFeedback}
          </div>
        ) : null}
      </div>

      <div className="pl-card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Inteligência Artificial</p>
              <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>Status do motor de IA</h3>
              <p style={{ margin: '0 0 4px', maxWidth: 600, fontSize: 13, lineHeight: 1.55, color: 'var(--pl-ink-2)' }}>
                A IA de produção roda pelo gateway /api/ai na Vercel, com OpenRouter como provedor principal.
              </p>
              <p style={{ margin: 0, maxWidth: 600, fontSize: 13, lineHeight: 1.55, color: 'var(--pl-ink-2)' }}>
                Configure AI_PROVIDER, AI_FALLBACK_PROVIDER e as chaves dos provedores nas variáveis de ambiente da Vercel.
              </p>
            </div>

            <button
              type="button"
              onClick={refreshAiHealth}
              className="pl-btn pl-btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
            >
              <Wand2 size={15} />
              {aiLoading ? 'Testando...' : 'Testar conexão'}
            </button>
          </div>

          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <AiStatusCard label="Provider ativo" value={formatProviderLabel(aiStatus?.provider)} />
            <AiStatusCard label="Modelo em uso" value={aiStatus?.model || 'Não informado'} />
            <AiStatusCard
              label="Status"
              value={aiStatus?.provider && aiStatus.provider !== 'offline' ? 'Online' : 'Offline'}
              dotColor={aiStatus?.provider && aiStatus.provider !== 'offline' ? 'var(--pl-success)' : 'var(--pl-ink-4)'}
            />
            <AiStatusCard
              label="Gateway"
              value="/api/ai"
            />
          </div>
        </div>
      </div>

      {activeSection === 'conteudo' ? (
        <div className="pl-card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: 'var(--pl-ink)', color: 'var(--pl-bg)' }}>
              <LayoutGrid size={22} strokeWidth={1.75} />
            </div>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Navegação rápida</p>
              <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>Onde editar cada coisa</h3>
              <p style={{ margin: 0, maxWidth: 600, fontSize: 13, color: 'var(--pl-ink-2)' }}>
                Abra a seção correspondente, altere os campos e use o botão de salvar que aparece no topo daquela seção.
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            <button
              type="button"
              onClick={() => setActiveSection('sidebar-menu')}
              className="pl-card"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 20, cursor: 'pointer', border: '1px solid var(--pl-accent-soft)', background: 'var(--pl-accent-soft)', textAlign: 'left' }}
            >
              <PanelLeft size={22} style={{ color: 'var(--pl-accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Menu lateral</span>
              <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>
                Nomes das páginas exibidos no menu (Início, Disciplinas, Audiolivros, etc.).
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('notifications')}
              className="pl-card"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 20, cursor: 'pointer', textAlign: 'left' }}
            >
              <Bell size={22} style={{ color: 'var(--pl-accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Notificações</span>
              <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>
                Tipos de alerta exibidos no sino e quais podem ser enviados para todos os usuários.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('redacoes-tips')}
              className="pl-card"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 20, cursor: 'pointer', border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', textAlign: 'left' }}
            >
              <Lightbulb size={22} style={{ color: 'var(--pl-danger)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Redações · dicas</span>
              <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>Textos de apoio e esqueletos que aparecem na aba Dicas.</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('redacoes-dados')}
              className="pl-card"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 20, cursor: 'pointer', border: '1px solid var(--pl-accent-soft)', background: 'var(--pl-accent-soft)', textAlign: 'left' }}
            >
              <FileSignature size={22} style={{ color: 'var(--pl-accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Redações · banco</span>
              <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>
                Temas do banco, kit (conectivos e modelos) e catálogo de audiolivros — tudo em formulário, sem JSON.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('wellness')}
              className="pl-card"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 20, cursor: 'pointer', border: '1px solid var(--pl-success-soft)', background: 'var(--pl-success-soft)', textAlign: 'left' }}
            >
              <Music4 size={22} style={{ color: 'var(--pl-success)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Bem-estar</span>
              <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>Áudios e vídeos da biblioteca de bem-estar.</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('xp')}
              className="pl-card"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 20, cursor: 'pointer', border: '1px solid var(--pl-warn-soft)', background: 'var(--pl-warn-soft)', textAlign: 'left' }}
            >
              <Sparkles size={22} style={{ color: 'var(--pl-warn)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>XP e níveis</span>
              <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>Pontos por ação e curva de progressão.</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('badges')}
              className="pl-card"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 20, cursor: 'pointer', border: '1px solid var(--pl-highlight-soft)', background: 'var(--pl-highlight-soft)', textAlign: 'left' }}
            >
              <Trophy size={22} style={{ color: 'var(--pl-highlight-ink)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Selos</span>
              <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>Conquistas e metas por métrica.</span>
            </button>
          </div>
        </div>
      ) : null}

      {activeSection === 'sidebar-menu' ? (
        <div className="pl-card" style={{ padding: 24, marginBottom: 20, border: '1px solid var(--pl-accent-soft)' }}>
          <div style={{ marginBottom: 20 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <PanelLeft size={14} />
              Navegação
            </p>
            <h3 style={{ margin: '8px 0 8px', fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>Nomes no menu lateral</h3>
            <p style={{ margin: 0, maxWidth: 600, fontSize: 13, color: 'var(--pl-ink-2)' }}>
              Cada linha corresponde a um item do menu. O id interno não muda (é o que o app usa para abrir a página); só o
              texto exibido ao usuário é personalizável.
            </p>
          </div>
          <AdminSidebarLabelsEditor
            sidebarLabelsOverride={sidebarLabelsOverride}
            onSave={onSaveSidebarLabels}
          />
        </div>
      ) : null}

      {activeSection === 'notifications' ? (
        <section className="pl-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div>
              <p className="pl-eyebrow">Alertas do app</p>
              <h3 style={{ margin: '6px 0 0', fontSize: 26, lineHeight: 1.1, color: 'var(--pl-ink)' }}>
                O que pode aparecer no sino
              </h3>
              <p style={{ margin: '8px 0 0', maxWidth: 760, color: 'var(--pl-ink-2)', fontSize: 13.5, lineHeight: 1.55 }}>
                Hoje o sino mostra alertas internos do app. Ative ou desative cada origem; marque "enviar para todos" quando o alerta não deve depender de curso importado, favorito ou acompanhado pelo aluno.
              </p>
            </div>
            <button
              type="button"
              className="pl-btn pl-btn-primary"
              disabled={notificationSaving || !onSaveNotificationSettings}
              onClick={async () => {
                if (!onSaveNotificationSettings) return;
                setNotificationSaving(true);
                try {
                  const result = await onSaveNotificationSettings(notificationDraft);
                  setSaveFeedback(result?.ok ? 'Configurações de notificação salvas.' : `Erro: ${result?.error || 'falha'}`);
                  window.setTimeout(() => setSaveFeedback(''), 3200);
                } finally {
                  setNotificationSaving(false);
                }
              }}
            >
              <Save size={14} />
              {notificationSaving ? 'Salvando...' : 'Salvar notificações'}
            </button>
          </div>

          <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
            {NOTIFICATION_SETTING_OPTIONS.map((option) => {
              const current = notificationDraft[option.id] || { enabled: true, broadcastToAll: false };
              return (
                <div
                  key={option.id}
                  className="pl-card-paper"
                  style={{ padding: 16, display: 'grid', gap: 14, gridTemplateColumns: 'minmax(0, 1fr) auto' }}
                >
                  <div>
                    <p style={{ margin: 0, color: 'var(--pl-ink)', fontSize: 14, fontWeight: 750 }}>{option.label}</p>
                    <p style={{ margin: '4px 0 0', color: 'var(--pl-ink-2)', fontSize: 12.5, lineHeight: 1.45 }}>
                      {option.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <ToggleChip
                      label="Ativo"
                      checked={current.enabled}
                      onChange={(checked) =>
                        setNotificationDraft((prev) => ({
                          ...prev,
                          [option.id]: { ...(prev[option.id] || {}), enabled: checked },
                        }))
                      }
                    />
                    <ToggleChip
                      label="Enviar para todos"
                      checked={current.broadcastToAll}
                      onChange={(checked) =>
                        setNotificationDraft((prev) => ({
                          ...prev,
                          [option.id]: { ...(prev[option.id] || {}), broadcastToAll: checked },
                        }))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeSection === 'planos' ? (
        <section className="pl-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div>
              <p className="pl-eyebrow">Planos</p>
              <h3 style={{ margin: '6px 0 0', fontSize: 26, lineHeight: 1.1, color: 'var(--pl-ink)' }}>
                Limites de cada plano
              </h3>
              <p style={{ margin: '8px 0 0', maxWidth: 760, color: 'var(--pl-ink-2)', fontSize: 13.5, lineHeight: 1.55 }}>
                Defina quantos objetivos e questões cada plano permite, sem mexer no código. Deixe o campo vazio (ou marque "Ilimitado") para não limitar.
              </p>
            </div>
            <button
              type="button"
              className="pl-btn pl-btn-primary"
              disabled={planLimitsSaving || !onSavePlanLimits}
              onClick={async () => {
                if (!onSavePlanLimits) return;
                setPlanLimitsSaving(true);
                try {
                  const result = await onSavePlanLimits(planLimitsDraft);
                  setSaveFeedback(result?.ok ? 'Limites de plano salvos.' : `Erro: ${result?.error || 'falha'}`);
                  window.setTimeout(() => setSaveFeedback(''), 3200);
                } finally {
                  setPlanLimitsSaving(false);
                }
              }}
            >
              <Save size={14} />
              {planLimitsSaving ? 'Salvando...' : 'Salvar limites'}
            </button>
          </div>

          <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
            {EDITABLE_PLAN_KEYS.map((planKey) => (
              <div key={planKey} className="pl-card-paper" style={{ padding: 16 }}>
                <p style={{ margin: '0 0 12px', color: 'var(--pl-ink)', fontSize: 15, fontWeight: 800 }}>
                  {planLabel(planKey)}
                </p>
                <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  {PLAN_LIMIT_FIELDS.map((field) => {
                    const value = planLimitsDraft?.[planKey]?.[field.key];
                    const unlimited = value === null || value === undefined;
                    return (
                      <div key={field.key}>
                        <p style={{ margin: '0 0 6px', fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink)' }}>
                          {field.label}
                          {!field.enforced && (
                            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: 'var(--pl-warn)', textTransform: 'uppercase' }}>
                              em breve
                            </span>
                          )}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="pl-input"
                            disabled={unlimited}
                            value={unlimited ? '' : value}
                            placeholder="0"
                            onChange={(e) => {
                              const raw = e.target.value;
                              const next = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                              setPlanLimitsDraft((prev) => ({
                                ...prev,
                                [planKey]: { ...(prev[planKey] || {}), [field.key]: next },
                              }));
                            }}
                            style={{ width: 100 }}
                          />
                          <ToggleChip
                            label="Ilimitado"
                            checked={unlimited}
                            onChange={(checked) =>
                              setPlanLimitsDraft((prev) => ({
                                ...prev,
                                [planKey]: { ...(prev[planKey] || {}), [field.key]: checked ? null : 0 },
                              }))
                            }
                          />
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--pl-ink-3)', lineHeight: 1.4 }}>
                          {field.help}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeSection === 'xp' ? (
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '0.92fr 1.08fr' }}>
          <div className="pl-card" style={{ padding: 24 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Motor base</p>
            <h3 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>XP e progressão</h3>
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
              <NumberField label="XP por minuto" value={xpDraft.perMinute || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, perMinute: value }))} />
              <NumberField label="XP por questão" value={xpDraft.perQuestion || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, perQuestion: value }))} />
              <NumberField label="XP por registro" value={xpDraft.perSession || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, perSession: value }))} />
              <NumberField label="XP por revisão" value={xpDraft.perReview || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, perReview: value }))} />
              <NumberField label="XP por simulado" value={xpDraft.perSimulado || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, perSimulado: value }))} />
              <NumberField label="XP por simulado perfeito" value={xpDraft.perPerfectSimulado || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, perPerfectSimulado: value }))} />
              <NumberField label="XP base para subir" value={xpDraft.baseLevelStep || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, baseLevelStep: value }))} />
              <NumberField label="Crescimento por nível" value={xpDraft.stepGrowth || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, stepGrowth: value }))} />
            </div>
          </div>

          <div className="pl-card" style={{ padding: 24 }}>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p className="pl-eyebrow" style={{ marginBottom: 8 }}>XP extra</p>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>Regras por escopo</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  const id = `xp-${Date.now()}`;
                  setXpDraft((prev) => ({
                    ...prev,
                    customRules: [
                      ...(Array.isArray(prev.customRules) ? prev.customRules : []),
                      { id, name: 'Nova regra', metric: 'minutes', multiplier: 1, plan: '', subject: '', topic: '' },
                    ],
                  }));
                  setOpenXpRules((prev) => [...prev, id]);
                }}
                className="pl-btn pl-btn-ghost"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
              >
                <Plus size={15} />
                Nova regra
              </button>
            </div>

            <div className="custom-scrollbar" style={{ maxHeight: 640, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', paddingRight: 8 }}>
              {(Array.isArray(xpDraft.customRules) ? xpDraft.customRules : []).map((rule, index) => {
                const isOpen = openXpRules.includes(rule.id);
                return (
                  <CollapsibleCard
                    key={rule.id}
                    isOpen={isOpen}
                    onToggle={() => toggleDisclosure(rule.id, setOpenXpRules)}
                    title={rule.name || `Regra ${index + 1}`}
                    subtitle={`${metricLabel(rule.metric)} · ${rule.multiplier || 0} XP · ${rule.plan || 'Todos os concursos'}`}
                    actions={
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setXpDraft((prev) => ({
                            ...prev,
                            customRules: prev.customRules.filter((item) => item.id !== rule.id),
                          }));
                          setOpenXpRules((prev) => prev.filter((item) => item !== rule.id));
                        }}
                        style={{ display: 'inline-flex', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)', cursor: 'pointer' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    }
                  >
                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,0.8fr) 120px' }}>
                      <input
                        type="text"
                        value={rule.name || ''}
                        onChange={(event) => updateXpRule(rule.id, { name: event.target.value }, setXpDraft)}
                        className="pl-input"
                        placeholder="Nome da regra"
                      />
                      <select
                        value={rule.metric || 'minutes'}
                        onChange={(event) => updateXpRule(rule.id, { metric: event.target.value }, setXpDraft)}
                        className="pl-input"
                      >
                        {PROGRESS_METRIC_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={rule.multiplier ?? 1}
                        onChange={(event) => updateXpRule(rule.id, { multiplier: Number(event.target.value || 0) }, setXpDraft)}
                        className="pl-input"
                        placeholder="XP"
                      />
                    </div>

                    <div style={{ marginTop: 12, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr' }}>
                      <select
                        value={rule.plan || ''}
                        onChange={(event) => updateXpRule(rule.id, { plan: event.target.value }, setXpDraft)}
                        className="pl-input"
                      >
                        <option value="">Todos os concursos</option>
                        {planOptions.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                      </select>
                      <select
                        value={rule.subject || ''}
                        onChange={(event) => updateXpRule(rule.id, { subject: event.target.value }, setXpDraft)}
                        className="pl-input"
                      >
                        <option value="">Todas as disciplinas</option>
                        {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                      </select>
                      <input
                        type="text"
                        value={rule.topic || ''}
                        onChange={(event) => updateXpRule(rule.id, { topic: event.target.value }, setXpDraft)}
                        className="pl-input"
                        placeholder="Tópico contém..."
                      />
                    </div>
                  </CollapsibleCard>
                );
              })}

              {(Array.isArray(xpDraft.customRules) ? xpDraft.customRules : []).length === 0 ? (
                <EmptyState text="Nenhuma regra extra cadastrada. Crie bônus por concurso, disciplina, tópico ou tipo de ação." />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'badges' ? (
        <div className="pl-card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Selos</p>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>Selos personalizados</h3>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--pl-ink-2)' }}>
                A regra pode abranger a plataforma inteira, um concurso, uma disciplina, um tópico ou, no futuro, um esquadrão.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const id = `badge-${Date.now()}`;
                setBadgeDraft((prev) => [
                  ...(Array.isArray(prev) ? prev : []),
                  { id, nome: 'Novo selo', descricao: 'Explique a conquista.', metric: 'sessions', target: 1, color: 'blue', plan: '', subject: '', topic: '' },
                ]);
                setOpenBadges((prev) => [...prev, id]);
              }}
              className="pl-btn pl-btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
            >
              <Plus size={15} />
              Novo selo
            </button>
          </div>

          <div className="custom-scrollbar" style={{ maxHeight: 720, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', paddingRight: 8 }}>
            {(Array.isArray(badgeDraft) ? badgeDraft : []).map((badge, index) => {
              const isOpen = openBadges.includes(badge.id);
              return (
                <CollapsibleCard
                  key={badge.id}
                  isOpen={isOpen}
                  onToggle={() => toggleDisclosure(badge.id, setOpenBadges)}
                  title={badge.nome || `Selo ${index + 1}`}
                  subtitle={`${metricLabel(badge.metric)} · meta ${badge.target || 1} · ${badge.plan || 'plataforma geral'}`}
                  actions={
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setBadgeDraft((prev) => prev.filter((item) => item.id !== badge.id));
                        setOpenBadges((prev) => prev.filter((item) => item !== badge.id));
                      }}
                      style={{ display: 'inline-flex', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)', cursor: 'pointer' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  }
                >
                  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,0.7fr) 120px' }}>
                    <input
                      type="text"
                      value={badge.nome || ''}
                      onChange={(event) => updateBadge(badge.id, { nome: event.target.value }, setBadgeDraft)}
                      className="pl-input"
                      placeholder="Nome do selo"
                    />
                    <select
                      value={badge.metric || 'sessions'}
                      onChange={(event) => updateBadge(badge.id, { metric: event.target.value }, setBadgeDraft)}
                      className="pl-input"
                    >
                      {PROGRESS_METRIC_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={badge.target ?? 1}
                      onChange={(event) => updateBadge(badge.id, { target: Number(event.target.value || 1) }, setBadgeDraft)}
                      className="pl-input"
                    />
                  </div>
                  <textarea
                    rows="2"
                    value={badge.descricao || ''}
                    onChange={(event) => updateBadge(badge.id, { descricao: event.target.value }, setBadgeDraft)}
                    className="pl-input" style={{ marginTop: 12, width: '100%' }}
                    placeholder="Descrição do selo"
                  />
                  <div style={{ marginTop: 12, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                    <select
                      value={badge.plan || ''}
                      onChange={(event) => updateBadge(badge.id, { plan: event.target.value }, setBadgeDraft)}
                      className="pl-input"
                    >
                      <option value="">Todos os concursos</option>
                      {planOptions.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                    </select>
                    <select
                      value={badge.subject || ''}
                      onChange={(event) => updateBadge(badge.id, { subject: event.target.value }, setBadgeDraft)}
                      className="pl-input"
                    >
                      <option value="">Todas as disciplinas</option>
                      {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                    </select>
                    <input
                      type="text"
                      value={badge.topic || ''}
                      onChange={(event) => updateBadge(badge.id, { topic: event.target.value }, setBadgeDraft)}
                      className="pl-input"
                      placeholder="Tópico contém..."
                    />
                    <input
                      type="text"
                      value={badge.color || ''}
                      onChange={(event) => updateBadge(badge.id, { color: event.target.value }, setBadgeDraft)}
                      className="pl-input"
                      placeholder="Cor"
                    />
                  </div>
                </CollapsibleCard>
              );
            })}
          </div>
        </div>
      ) : null}

      {activeSection === 'wellness' ? (
        <div className="pl-card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8, borderRadius: 12, background: 'var(--pl-bg-soft)', padding: 6 }}>
            <ConfigTab active={wellnessInnerTab === 'audio'} onClick={() => setWellnessInnerTab('audio')} label="Meditações" />
            <ConfigTab active={wellnessInnerTab === 'video'} onClick={() => setWellnessInnerTab('video')} label="Pausas rápidas" />
            <ConfigTab active={wellnessInnerTab === 'page'} onClick={() => setWellnessInnerTab('page')} label="Página Bem-estar" />
          </div>

          {wellnessInnerTab === 'page' ? (
            <>
              <div style={{ marginBottom: 20 }}>
                <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Conteúdo editorial</p>
                <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>Textos e blocos da aba Bem-estar</h3>
                <p style={{ margin: 0, maxWidth: 600, fontSize: 13, color: 'var(--pl-ink-2)' }}>
                  Hero, métricas, CVV, visão geral, respirações e rótulos exibidos na página. A biblioteca de áudio/vídeo continua nas abas
                  Meditações e Pausas rápidas.
                </p>
              </div>
              <div className="custom-scrollbar" style={{ maxHeight: 720, overflowY: 'auto', paddingRight: 8 }}>
                <AdminWellnessPageConfigEditor config={wellnessPageDraft} setConfig={setWellnessPageDraft} />
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Biblioteca de bem-estar</p>
                  <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>
                    {wellnessInnerTab === 'video' ? 'Biblioteca de pausas rápidas' : 'Biblioteca de meditações'}
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--pl-ink-2)' }}>
                    {wellnessInnerTab === 'video'
                      ? 'Cadastre vídeos curtos de descanso, pausa ativa, alongamento e reset cognitivo.'
                      : 'Cadastre áudios e trilhas de meditação com capa, créditos e duração.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const id = `track-${Date.now()}`;
                    setWellnessDraft((prev) => [
                      ...prev,
                      {
                        id,
                        title: wellnessInnerTab === 'video' ? 'Nova pausa rápida' : 'Nova meditação',
                        mediaType: wellnessInnerTab === 'video' ? 'video' : 'audio',
                        category: wellnessInnerTab === 'video' ? 'Pausa rápida' : 'Meditação',
                        description: '',
                        durationLabel: '',
                        audioUrl: '',
                        videoUrl: '',
                        coverUrl: '',
                        credits: '',
                        isFeatured: false,
                        isPublic: true,
                      },
                    ]);
                    setOpenTracks((prev) => [...prev, id]);
                  }}
                  className="pl-btn pl-btn-ghost"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
                >
                  <Plus size={15} />
                  {wellnessInnerTab === 'video' ? 'Adicionar pausa rápida' : 'Adicionar meditação'}
                </button>
              </div>

              <div className="custom-scrollbar" style={{ maxHeight: 720, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', paddingRight: 8 }}>
                {filteredWellnessDraft.map((track, index) => {
              const isOpen = openTracks.includes(track.id);
              return (
                <CollapsibleCard
                  key={track.id}
                  isOpen={isOpen}
                  onToggle={() => toggleDisclosure(track.id, setOpenTracks)}
                  title={track.title || `Midia ${index + 1}`}
                  subtitle={`${track.category || 'Som'} · ${track.durationLabel || 'sem duração'} · ${track.isPublic ? 'pública' : 'oculta'}`}
                  actions={
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setWellnessDraft((prev) => prev.filter((item) => item.id !== track.id));
                        setOpenTracks((prev) => prev.filter((item) => item !== track.id));
                      }}
                      style={{ display: 'inline-flex', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)', cursor: 'pointer' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  }
                >
                  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <input
                      type="text"
                      value={track.title || ''}
                      onChange={(event) => updateTrack(track.id, { title: event.target.value }, setWellnessDraft)}
                      className="pl-input"
                      placeholder="Título"
                    />
                    <select
                      value={track.mediaType || 'audio'}
                      onChange={(event) => updateTrack(track.id, { mediaType: event.target.value }, setWellnessDraft)}
                      className="pl-input"
                    >
                      <option value="audio">Audio</option>
                      <option value="video">Video</option>
                    </select>
                    <input
                      type="text"
                      value={track.category || ''}
                      onChange={(event) => updateTrack(track.id, { category: event.target.value }, setWellnessDraft)}
                      className="pl-input"
                      placeholder="Categoria"
                    />
                  </div>
                  <textarea
                    rows="2"
                    value={track.description || ''}
                    onChange={(event) => updateTrack(track.id, { description: event.target.value }, setWellnessDraft)}
                    className="pl-input" style={{ marginTop: 12, width: '100%' }}
                    placeholder="Descrição"
                  />
                  <div style={{ marginTop: 12, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                    <input
                      type="text"
                      value={track.durationLabel || ''}
                      onChange={(event) => updateTrack(track.id, { durationLabel: event.target.value }, setWellnessDraft)}
                      className="pl-input"
                      placeholder="Duração"
                    />
                    <input
                      type="text"
                      value={track.mediaType === 'video' ? track.videoUrl || track.audioUrl || '' : track.audioUrl || ''}
                      onChange={(event) =>
                        updateTrack(
                          track.id,
                          track.mediaType === 'video'
                            ? { videoUrl: event.target.value }
                            : { audioUrl: event.target.value },
                          setWellnessDraft
                        )
                      }
                      className="pl-input"
                      placeholder={track.mediaType === 'video' ? 'https://.../video.mp4 ou embed' : '/assets/wellness/arquivo.mp3'}
                    />
                    <input
                      type="text"
                      value={track.coverUrl || ''}
                      onChange={(event) => updateTrack(track.id, { coverUrl: event.target.value }, setWellnessDraft)}
                      className="pl-input"
                      placeholder="/assets/wellness/capa.jpg"
                    />
                    <input
                      type="text"
                      value={track.credits || ''}
                      onChange={(event) => updateTrack(track.id, { credits: event.target.value }, setWellnessDraft)}
                      className="pl-input"
                      placeholder="Créditos"
                    />
                  </div>
                  <div style={{ marginTop: 12, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                    <label style={{ borderRadius: 8, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--pl-ink-2)', cursor: 'pointer', display: 'block' }}>
                      {track.mediaType === 'video' ? 'Upload do vídeo' : 'Upload da meditação'}
                      <input
                        type="file"
                        accept={track.mediaType === 'video' ? 'video/*' : 'audio/*'}
                        style={{ marginTop: 8, display: 'block', width: '100%', fontSize: 11, color: 'var(--pl-ink-3)' }}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const dataUrl = await fileToDataUrl(file);
                          updateTrack(
                            track.id,
                            track.mediaType === 'video' ? { videoUrl: dataUrl } : { audioUrl: dataUrl },
                            setWellnessDraft
                          );
                        }}
                      />
                    </label>
                    <label style={{ borderRadius: 8, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--pl-ink-2)', cursor: 'pointer', display: 'block' }}>
                      Upload da capa
                      <input
                        type="file"
                        accept="image/*"
                        style={{ marginTop: 8, display: 'block', width: '100%', fontSize: 11, color: 'var(--pl-ink-3)' }}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const dataUrl = await fileToDataUrl(file);
                          updateTrack(track.id, { coverUrl: dataUrl }, setWellnessDraft);
                        }}
                      />
                    </label>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    <ToggleChip label="Destaque" checked={track.isFeatured !== false} onChange={(checked) => updateTrack(track.id, { isFeatured: checked }, setWellnessDraft)} />
                    <ToggleChip label="Pública" checked={track.isPublic !== false} onChange={(checked) => updateTrack(track.id, { isPublic: checked }, setWellnessDraft)} />
                  </div>
                </CollapsibleCard>
              );
            })}

            {filteredWellnessDraft.length === 0 ? (
              <EmptyState text={wellnessInnerTab === 'video' ? 'Nenhum video cadastrado ainda.' : 'Nenhuma faixa cadastrada ainda.'} />
            ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}

      {activeSection === 'redacoes-tips' ? (
        <div className="pl-card" style={{ padding: 24, marginBottom: 20, border: '1px solid var(--pl-danger-soft)' }}>
          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--pl-danger)' }}>
                <FileSignature size={14} />
                Conteúdo operacional
              </p>
              <h3 style={{ margin: '8px 0 8px', fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>Dicas e esqueletos de redação</h3>
              <p style={{ margin: 0, maxWidth: 520, fontSize: 13, color: 'var(--pl-ink-2)' }}>
                Cadastre padrões (CESPE, FCC, etc.). Os alunos veem na aba "Dicas de especialista" em Redações. Os dados ficam na tabela{' '}
                <code style={{ borderRadius: 4, background: 'var(--pl-bg-soft)', padding: '0 4px', fontSize: 11 }}>redacao_expert_tips</code> no Supabase (rode o SQL em{' '}
                <code style={{ borderRadius: 4, background: 'var(--pl-bg-soft)', padding: '0 4px', fontSize: 11 }}>supabase/redacao_expert_tips.sql</code>).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const id = normalizeRedacaoExpertTip({ title: 'Novo esqueleto', body: '' }).id;
                setRedacaoTipsDraft((prev) => [...prev, { id, title: 'Novo esqueleto', body: '', sort_order: prev.length }]);
              }}
              className="pl-btn pl-btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
            >
              <Plus size={15} />
              Adicionar
            </button>
          </div>

          </div>
          <div className="custom-scrollbar" style={{ maxHeight: 'min(70vh,640px)', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', paddingRight: 8 }}>
            {redacaoTipsDraft.map((tip, index) => (
              <div key={tip.id} className="pl-card-paper" style={{ padding: 16 }}>
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span className="pl-eyebrow">Item {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => setRedacaoTipsDraft((prev) => prev.filter((t) => t.id !== tip.id))}
                    style={{ display: 'inline-flex', width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)', cursor: 'pointer' }}
                    aria-label="Remover"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <input
                  type="text"
                  value={tip.title}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRedacaoTipsDraft((prev) => prev.map((t) => (t.id === tip.id ? { ...t, title: v } : t)));
                  }}
                  className="pl-input"
                  style={{ marginBottom: 8, width: '100%' }}
                  placeholder="Título ex.: Padrão CESPE — dissertação"
                />
                <textarea
                  rows={6}
                  value={tip.body}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRedacaoTipsDraft((prev) => prev.map((t) => (t.id === tip.id ? { ...t, body: v } : t)));
                  }}
                  className="pl-input"
                  style={{ width: '100%', lineHeight: 1.55 }}
                  placeholder="Texto completo: estrutura de parágrafos, conectivos, avisos da banca..."
                />
              </div>
            ))}
            {redacaoTipsDraft.length === 0 ? (
              <EmptyState text="Nenhuma dica cadastrada. Adicione esqueletos ou orientações para os alunos." />
            ) : null}
          </div>

          <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button
              type="button"
              disabled={redacaoTipsSaving || !onSaveRedacaoExpertTips}
              onClick={async () => {
                if (!onSaveRedacaoExpertTips) return;
                setRedacaoTipsSaving(true);
                try {
                  const r = await onSaveRedacaoExpertTips(redacaoTipsDraft);
                  setSaveFeedback(r?.ok ? 'Dicas de redação salvas no Supabase.' : `Erro: ${r?.error || 'falha'}`);
                  window.setTimeout(() => setSaveFeedback(''), 2800);
                } catch (e) {
                  setSaveFeedback(String(e?.message || e));
                } finally {
                  setRedacaoTipsSaving(false);
                }
              }}
              className="pl-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)', border: '1px solid var(--pl-danger-soft)' }}
            >
              <Save size={16} />
              {redacaoTipsSaving ? 'Salvando dicas…' : 'Salvar só dicas de redação'}
            </button>
          </div>
        </div>
      ) : null}

      {activeSection === 'redacoes-dados' ? (
        <div className="pl-card" style={{ padding: 24, marginBottom: 20, border: '1px solid var(--pl-accent-soft)' }}>
          <div style={{ marginBottom: 20 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--pl-accent)' }}>
              <FileSignature size={14} />
              Redações · dados vivos
            </p>
            <h3 style={{ margin: '8px 0 8px', fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>Banco de temas e kit (conectivos / modelos)</h3>
            <p style={{ margin: 0, maxWidth: 600, fontSize: 13, color: 'var(--pl-ink-2)' }}>
              Salve no Supabase (tabela <code style={{ borderRadius: 4, background: 'var(--pl-bg-soft)', padding: '0 4px', fontSize: 11 }}>redacao_site_content</code>
              — rode <code style={{ borderRadius: 4, background: 'var(--pl-bg-soft)', padding: '0 4px', fontSize: 11 }}>supabase/redacao_site_content.sql</code>
              {'; para a coluna de catálogo de audiolivros, rode '}
              <code style={{ borderRadius: 4, background: 'var(--pl-bg-soft)', padding: '0 4px', fontSize: 11 }}>supabase/redacao_site_content_audiobooks.sql</code>).{' '}
              Temas, kit e audiolivros são editados nos blocos abaixo; nada de JSON manual.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.15fr)' }}>
            <div className="pl-card-paper" style={{ minWidth: 0, padding: 20 }}>
              <p className="pl-eyebrow" style={{ marginBottom: 12, color: 'var(--pl-accent)' }}>Banco de temas</p>
              <AdminRedacaoThemeBankEditor draft={themeBankDraft} onDraftChange={setThemeBankDraft} />
            </div>
            <div className="pl-card" style={{ minWidth: 0, padding: 20 }}>
              <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="pl-eyebrow">Kit (aba Dicas)</span>
                <button
                  type="button"
                  onClick={() => setKitDraft(mergeRedacaoKitBundle(redacaoKitOverride))}
                  className="pl-btn pl-btn-ghost pl-btn-sm"
                >
                  Descartar edição local
                </button>
              </div>
              <AdminRedacaoKitEditor draft={kitDraft} onDraftChange={setKitDraft} />
            </div>
          </div>

          <div className="pl-card" style={{ marginTop: 24, padding: 20, border: '1px solid var(--pl-highlight-soft)', background: 'var(--pl-highlight-soft)' }}>
            <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <Headphones size={18} style={{ color: 'var(--pl-highlight-ink)' }} />
              <p className="pl-eyebrow" style={{ color: 'var(--pl-highlight-ink)' }}>Catálogo de audiolivros</p>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--pl-ink-2)', margin: '0 0 8px' }}>
              Se você ainda não gravou nada no Supabase, o app mostra o catálogo de demonstração embutido no código (
              <code style={{ fontSize: 11 }}>buildDefaultAudiobookCatalog</code> em <code style={{ fontSize: 11 }}>src/lib/audiobooks.js</code>
              ) — o mesmo que aparece aqui ao abrir esta aba. Depois de salvar obras válidas, passa a valer o que está no banco.
            </p>
            <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--pl-ink-2)', margin: 0 }}>
              URLs de áudio públicas (<code style={{ fontSize: 11 }}>https://</code>) ou arquivos estáticos (<code style={{ fontSize: 11 }}>/assets/...</code>). Se nenhuma obra
              válida restar após salvar, o app volta ao catálogo embutido. Para editar só audiolivros, use também o menu Admin → Audiolivros.
            </p>
            <div style={{ marginTop: 16 }}>
              <AdminAudiobookCatalogEditor draft={audiobookCatalogDraft} onDraftChange={setAudiobookCatalogDraft} />
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button
              type="button"
              disabled={redacaoSiteSaving || !onSaveRedacaoSiteContent}
              onClick={async () => {
                if (!onSaveRedacaoSiteContent) return;
                const themes = sanitizeThemeBankForSave(themeBankDraft);
                if (themes.length === 0) {
                  setSaveFeedback('Inclua ao menos um tema completo (id, título e descrição) no banco de temas.');
                  window.setTimeout(() => setSaveFeedback(''), 4000);
                  return;
                }
                const audiobookCatalogJson = sanitizeAudiobooksForSave(audiobookCatalogDraft);
                const kitParsed = sanitizeRedacaoKitForSave(kitDraft);
                setRedacaoSiteSaving(true);
                try {
                  const r = await onSaveRedacaoSiteContent({
                    themeBankJson: themes,
                    kitJson: kitParsed,
                    audiobookCatalogJson,
                  });
                  setSaveFeedback(
                    r?.ok ? 'Banco de temas, kit e catálogo de audiolivros salvos no Supabase.' : `Erro: ${r?.error || 'falha'}`
                  );
                  window.setTimeout(() => setSaveFeedback(''), 3200);
                } catch (e) {
                  setSaveFeedback(String(e?.message || e));
                } finally {
                  setRedacaoSiteSaving(false);
                }
              }}
              className="pl-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', border: '1px solid var(--pl-accent-soft)', fontWeight: 700 }}
            >
              <Save size={16} />
              {redacaoSiteSaving ? 'Salvando…' : 'Salvar banco, kit e audiolivros'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function metricLabel(metric) {
  return PROGRESS_METRIC_OPTIONS.find((option) => option.value === metric)?.label || metric || 'Métrica';
}

function updateXpRule(id, patch, setXpDraft) {
  setXpDraft((prev) => ({
    ...prev,
    customRules: (Array.isArray(prev.customRules) ? prev.customRules : []).map((item) =>
      item.id === id ? { ...item, ...patch } : item
    ),
  }));
}

function updateBadge(id, patch, setBadgeDraft) {
  setBadgeDraft((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
}

function updateTrack(id, patch, setWellnessDraft) {
  setWellnessDraft((prev) =>
    normalizeWellnessLibrary(
      prev.map((item) => {
        if (item.id !== id) return item;

        const nextTrack = { ...item, ...patch };
        const nextMediaType = String(nextTrack.mediaType || 'audio').toLowerCase();
        const currentMediaUrl = resolveWellnessMediaUrl(nextTrack);

        if (nextMediaType === 'video') {
          return {
            ...nextTrack,
            videoUrl: String(nextTrack.videoUrl || currentMediaUrl),
            audioUrl: String(nextTrack.audioUrl || ''),
          };
        }

        return {
          ...nextTrack,
          audioUrl: String(nextTrack.audioUrl || currentMediaUrl),
          videoUrl: String(nextTrack.videoUrl || ''),
        };
      })
    )
  );
}

function toggleDisclosure(id, setter) {
  setter((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
}

function CourseTemplatesEditor({ templates, setTemplates, isSaving, onSave }) {
  const safeTemplates = normalizeCourseTemplates(templates);
  const addTemplate = () => {
    const id = `curso-${Date.now()}`;
    setTemplates((prev) => [
      ...normalizeCourseTemplates(prev),
      {
        id,
        nome: 'Novo curso',
        area: 'Geral',
        intent: 'faculdade',
        subjects: [{ nome: 'Disciplina inicial', topicos: ['Leituras principais', 'Exercicios', 'Revisao'] }],
      },
    ]);
  };
  const updateTemplate = (id, patch) => {
    setTemplates((prev) => normalizeCourseTemplates(prev).map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  const removeTemplate = (id) => {
    setTemplates((prev) => normalizeCourseTemplates(prev).filter((item) => item.id !== id));
  };

  return (
    <section className="pl-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <p className="pl-eyebrow">Cursos e matérias</p>
          <h3 style={{ margin: '6px 0 0', fontSize: 26, lineHeight: 1.1, color: 'var(--pl-ink)' }}>
            Templates para faculdade
          </h3>
          <p style={{ margin: '8px 0 0', maxWidth: 760, color: 'var(--pl-ink-2)', fontSize: 13.5, lineHeight: 1.55 }}>
            Essa lista alimenta o modal "Cursos de faculdade" em Meus cursos. Cada template cria o curso, as disciplinas e os tópicos iniciais para o aluno editar depois.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="pl-btn" onClick={addTemplate}>
            <Plus size={14} /> Novo curso
          </button>
          <button type="button" className="pl-btn pl-btn-primary" disabled={isSaving} onClick={onSave}>
            <Save size={14} /> {isSaving ? 'Salvando...' : 'Salvar cursos'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
        {safeTemplates.map((template) => (
          <div key={template.id} className="pl-card-paper" style={{ padding: 18 }}>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0,1.1fr) minmax(160px,0.55fr) 130px auto', alignItems: 'end' }}>
              <AdminTextInput label="Nome do curso" value={template.nome} onChange={(value) => updateTemplate(template.id, { nome: value })} />
              <AdminTextInput label="Área" value={template.area} onChange={(value) => updateTemplate(template.id, { area: value })} />
              <label>
                <span style={{ display: 'block', marginBottom: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--pl-ink-3)' }}>Tipo</span>
                <select
                  value={template.intent || 'faculdade'}
                  onChange={(event) => updateTemplate(template.id, { intent: event.target.value })}
                  className="pl-input"
                  style={{ width: '100%' }}
                >
                  <option value="faculdade">Faculdade</option>
                  <option value="vestibular">Vestibular</option>
                  <option value="livre">Livre</option>
                </select>
              </label>
              <button type="button" className="pl-btn pl-btn-sm" onClick={() => removeTemplate(template.id)} title="Excluir curso">
                <Trash2 size={13} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              {template.subjects.map((subject, index) => (
                <div key={`${template.id}-${index}`} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(180px,0.7fr) minmax(0,1.3fr) auto', alignItems: 'start' }}>
                  <AdminTextInput
                    label={`Disciplina ${index + 1}`}
                    value={subject.nome}
                    onChange={(value) => {
                      const subjects = [...template.subjects];
                      subjects[index] = { ...subjects[index], nome: value };
                      updateTemplate(template.id, { subjects });
                    }}
                  />
                  <label>
                    <span style={{ display: 'block', marginBottom: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--pl-ink-3)' }}>Tópicos, um por linha</span>
                    <textarea
                      rows={3}
                      value={(subject.topicos || []).join('\n')}
                      onChange={(event) => {
                        const subjects = [...template.subjects];
                        subjects[index] = {
                          ...subjects[index],
                          topicos: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean),
                        };
                        updateTemplate(template.id, { subjects });
                      }}
                      className="pl-input"
                      style={{ width: '100%' }}
                    />
                  </label>
                  <button
                    type="button"
                    className="pl-btn pl-btn-sm"
                    onClick={() => updateTemplate(template.id, { subjects: template.subjects.filter((_, itemIndex) => itemIndex !== index) })}
                    title="Excluir disciplina"
                    style={{ marginTop: 24 }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="pl-btn pl-btn-sm"
              style={{ marginTop: 12 }}
              onClick={() =>
                updateTemplate(template.id, {
                  subjects: [...template.subjects, { nome: 'Nova disciplina', topicos: ['Leituras principais', 'Exercicios', 'Revisao'] }],
                })
              }
            >
              <Plus size={13} /> Adicionar disciplina
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminTextInput({ label, value, onChange }) {
  return (
    <label>
      <span style={{ display: 'block', marginBottom: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--pl-ink-3)' }}>{label}</span>
      <input
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className="pl-input"
        style={{ width: '100%' }}
      />
    </label>
  );
}

function ConfigTab({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 12,
        padding: '8px 20px',
        fontSize: 13,
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.15s',
        background: active ? 'var(--pl-surface)' : 'transparent',
        color: active ? 'var(--pl-accent)' : 'var(--pl-ink-3)',
        boxShadow: active ? 'var(--pl-sh-low)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

function formatProviderLabel(provider) {
  const raw = String(provider || '').toLowerCase();
  if (raw === 'openrouter') return 'OpenRouter';
  if (raw === 'groq') return 'Groq';
  if (raw === 'openai') return 'OpenAI';
  if (raw === 'gemini') return 'Gemini';
  if (raw === 'offline') return 'Offline';
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Offline';
}

function AiStatusCard({ label, value, dotColor = '' }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '14px 16px' }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--pl-ink-3)' }}>{label}</p>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        {dotColor ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0 }} /> : null}
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{value}</p>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', marginBottom: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--pl-ink-3)' }}>{label}</span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className="pl-input"
        style={{ width: '100%' }}
      />
    </label>
  );
}

function CollapsibleCard({ isOpen, onToggle, title, subtitle, actions, children }) {
  return (
    <div style={{ overflow: 'hidden', borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 16px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--pl-ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 8 }}>
          {actions}
          <span style={{ display: 'inline-flex', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', color: 'var(--pl-ink-3)' }}>
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </button>
      {isOpen ? <div style={{ borderTop: '1px solid var(--pl-rule-2)', padding: '14px 16px' }}>{children}</div> : null}
    </div>
  );
}

function ToggleChip({ label, checked, onChange }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '6px 14px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} style={{ width: 15, height: 15, borderRadius: 4 }} />
      {label}
    </label>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ borderRadius: 16, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '20px 20px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
      {text}
    </div>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
