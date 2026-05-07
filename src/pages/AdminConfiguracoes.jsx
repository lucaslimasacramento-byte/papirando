import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileSignature,
  Headphones,
  LayoutGrid,
  Lightbulb,
  Music4,
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
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';

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
}) {
  const [activeSection, setActiveSection] = useState('conteudo');
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
  const [themeBankDraft, setThemeBankDraft] = useState(() => []);
  const [kitDraft, setKitDraft] = useState(() => mergeRedacaoKitBundle(null));
  const [audiobookCatalogDraft, setAudiobookCatalogDraft] = useState(() => []);
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
    refreshAiHealth();
  }, []);

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

  const saveAll = async () => {
    onSaveProgressConfig?.({ xp: xpDraft, badges: badgeDraft });
    onSaveWellnessLibrary?.(wellnessDraft);
    onSaveWellnessPageConfig?.(wellnessPageDraft);
    let msg = 'Configurações salvas com sucesso.';
    if (onSaveRedacaoExpertTips) {
      setRedacaoTipsSaving(true);
      try {
        const r = await onSaveRedacaoExpertTips(redacaoTipsDraft);
        if (r && !r.ok) msg = `Salvo com ressalvas: dicas de redação — ${r.error || 'erro desconhecido'}`;
      } catch (e) {
        msg = `Erro ao salvar dicas de redação: ${String(e?.message || e)}`;
      } finally {
        setRedacaoTipsSaving(false);
      }
    }
    setSaveFeedback(msg);
    window.setTimeout(() => setSaveFeedback(''), 3200);
  };

  return (
    <div className="page-shell mx-auto flex h-full w-full max-w-[1320px] flex-col gap-6">
      <PageHeadPremium
        icon={Settings}
        badge={
          <PageHeadPremiumBadge icon={LayoutGrid}>Admin do produto</PageHeadPremiumBadge>
        }
        title="Configurações estruturais"
        subtitle="Central para alimentar o app sem código: a aba Conteúdo do app reúne atalhos; redações (dicas, temas, kit e audiolivros), bem-estar, XP e selos ficam em formulários estruturados."
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={redacaoTipsSaving}
          className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          <Save size={16} />
          {redacaoTipsSaving ? 'Salvando…' : 'Salvar tudo'}
        </button>
      </div>

      <section className="rounded-[2.2rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap gap-2 rounded-2xl bg-gray-100 p-1.5">
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
          <ConfigTab active={activeSection === 'xp'} onClick={() => setActiveSection('xp')} label="XP e níveis" />
          <ConfigTab active={activeSection === 'badges'} onClick={() => setActiveSection('badges')} label="Selos" />
          <ConfigTab active={activeSection === 'wellness'} onClick={() => setActiveSection('wellness')} label="Bem-estar" />
          <ConfigTab active={activeSection === 'redacoes-tips'} onClick={() => setActiveSection('redacoes-tips')} label="Redações · dicas" />
          <ConfigTab active={activeSection === 'redacoes-dados'} onClick={() => setActiveSection('redacoes-dados')} label="Redações · banco" />
        </div>

        {saveFeedback ? (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {saveFeedback}
          </div>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Inteligência Artificial</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Status do motor de IA</h3>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-gray-500">
              A IA de produção roda pelo gateway /api/ai na Vercel, com OpenRouter como provedor principal.
            </p>
            <p className="mt-1 max-w-3xl text-sm font-medium leading-relaxed text-gray-500">
              Configure AI_PROVIDER, AI_FALLBACK_PROVIDER e as chaves dos provedores nas variáveis de ambiente da Vercel.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshAiHealth}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700"
          >
            <Wand2 size={15} />
            {aiLoading ? 'Testando...' : 'Testar conexão'}
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AiStatusCard label="Provider ativo" value={formatProviderLabel(aiStatus?.provider)} />
          <AiStatusCard label="Modelo em uso" value={aiStatus?.model || 'Não informado'} />
          <AiStatusCard
            label="Status"
            value={aiStatus?.provider && aiStatus.provider !== 'offline' ? 'Online' : 'Offline'}
            dotTone={aiStatus?.provider && aiStatus.provider !== 'offline' ? 'bg-emerald-500' : 'bg-slate-400'}
          />
          <AiStatusCard
            label="Gateway"
            value="/api/ai"
          />
        </div>
      </section>

      {activeSection === 'conteudo' ? (
        <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <LayoutGrid size={22} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Navegação rápida</p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-900">Onde editar cada coisa</h3>
              <p className="mt-2 max-w-3xl text-sm font-medium text-gray-500">
                Abra a seção correspondente, altere os campos e use o botão de salvar daquela área (ou &quot;Salvar tudo&quot; no topo para XP, selos, bem-estar e dicas de redação).
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <button
              type="button"
              onClick={() => setActiveSection('sidebar-menu')}
              className="flex flex-col items-start gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
            >
              <PanelLeft className="text-indigo-700" size={22} />
              <span className="text-sm font-bold text-slate-900">Menu lateral</span>
              <span className="text-xs font-medium leading-relaxed text-gray-600">
                Nomes das páginas exibidos no menu (Início, Disciplinas, Audiolivros, etc.).
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('redacoes-tips')}
              className="flex flex-col items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50/60 p-5 text-left transition hover:border-rose-200 hover:bg-rose-50"
            >
              <Lightbulb className="text-rose-600" size={22} />
              <span className="text-sm font-bold text-slate-900">Redações · dicas</span>
              <span className="text-xs font-medium leading-relaxed text-gray-600">Textos de apoio e esqueletos que aparecem na aba Dicas.</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('redacoes-dados')}
              className="flex flex-col items-start gap-2 rounded-2xl border border-sky-100 bg-sky-50/60 p-5 text-left transition hover:border-sky-200 hover:bg-sky-50"
            >
              <FileSignature className="text-sky-700" size={22} />
              <span className="text-sm font-bold text-slate-900">Redações · banco</span>
              <span className="text-xs font-medium leading-relaxed text-gray-600">
                Temas do banco, kit (conectivos e modelos) e catálogo de audiolivros — tudo em formulário, sem JSON.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('wellness')}
              className="flex flex-col items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
            >
              <Music4 className="text-emerald-700" size={22} />
              <span className="text-sm font-bold text-slate-900">Bem-estar</span>
              <span className="text-xs font-medium leading-relaxed text-gray-600">Áudios e vídeos da biblioteca de bem-estar.</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('xp')}
              className="flex flex-col items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50/60 p-5 text-left transition hover:border-amber-200 hover:bg-amber-50"
            >
              <Sparkles className="text-amber-700" size={22} />
              <span className="text-sm font-bold text-slate-900">XP e níveis</span>
              <span className="text-xs font-medium leading-relaxed text-gray-600">Pontos por ação e curva de progressão.</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('badges')}
              className="flex flex-col items-start gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 p-5 text-left transition hover:border-violet-200 hover:bg-violet-50"
            >
              <Trophy className="text-violet-700" size={22} />
              <span className="text-sm font-bold text-slate-900">Selos</span>
              <span className="text-xs font-medium leading-relaxed text-gray-600">Conquistas e metas por métrica.</span>
            </button>
          </div>
        </section>
      ) : null}

      {activeSection === 'sidebar-menu' ? (
        <section className="rounded-[2rem] border border-indigo-100 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
              <PanelLeft size={14} />
              Navegação
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Nomes no menu lateral</h3>
            <p className="mt-2 max-w-3xl text-sm font-medium text-gray-500">
              Cada linha corresponde a um item do menu. O id interno não muda (é o que o app usa para abrir a página); só o
              texto exibido ao usuário é personalizável.
            </p>
          </div>
          <AdminSidebarLabelsEditor
            sidebarLabelsOverride={sidebarLabelsOverride}
            onSave={onSaveSidebarLabels}
          />
        </section>
      ) : null}

      {activeSection === 'xp' ? (
        <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Motor base</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">XP e progressão</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <NumberField label="XP por minuto" value={xpDraft.perMinute || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, perMinute: value }))} />
              <NumberField label="XP por questão" value={xpDraft.perQuestion || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, perQuestion: value }))} />
              <NumberField label="XP por registro" value={xpDraft.perSession || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, perSession: value }))} />
              <NumberField label="XP por revisão" value={xpDraft.perReview || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, perReview: value }))} />
              <NumberField label="XP por simulado" value={xpDraft.perSimulado || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, perSimulado: value }))} />
              <NumberField label="XP por simulado perfeito" value={xpDraft.perPerfectSimulado || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, perPerfectSimulado: value }))} />
              <NumberField label="XP base para subir" value={xpDraft.baseLevelStep || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, baseLevelStep: value }))} />
              <NumberField label="Crescimento por nível" value={xpDraft.stepGrowth || 0} onChange={(value) => setXpDraft((prev) => ({ ...prev, stepGrowth: value }))} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">XP extra</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">Regras por escopo</h3>
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
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700"
              >
                <Plus size={15} />
                Nova regra
              </button>
            </div>

            <div className="custom-scrollbar max-h-[640px] space-y-3 overflow-y-auto pr-2">
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
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    }
                  >
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_120px]">
                      <input
                        type="text"
                        value={rule.name || ''}
                        onChange={(event) => updateXpRule(rule.id, { name: event.target.value }, setXpDraft)}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                        placeholder="Nome da regra"
                      />
                      <select
                        value={rule.metric || 'minutes'}
                        onChange={(event) => updateXpRule(rule.id, { metric: event.target.value }, setXpDraft)}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
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
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                        placeholder="XP"
                      />
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <select
                        value={rule.plan || ''}
                        onChange={(event) => updateXpRule(rule.id, { plan: event.target.value }, setXpDraft)}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                      >
                        <option value="">Todos os concursos</option>
                        {planOptions.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                      </select>
                      <select
                        value={rule.subject || ''}
                        onChange={(event) => updateXpRule(rule.id, { subject: event.target.value }, setXpDraft)}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                      >
                        <option value="">Todas as disciplinas</option>
                        {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                      </select>
                      <input
                        type="text"
                        value={rule.topic || ''}
                        onChange={(event) => updateXpRule(rule.id, { topic: event.target.value }, setXpDraft)}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
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
          </section>
        </div>
      ) : null}

      {activeSection === 'badges' ? (
        <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Selos</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">Selos personalizados</h3>
              <p className="mt-2 text-sm font-medium text-gray-500">
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
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700"
            >
              <Plus size={15} />
              Novo selo
            </button>
          </div>

          <div className="custom-scrollbar max-h-[720px] space-y-3 overflow-y-auto pr-2">
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
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  }
                >
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.7fr)_120px]">
                    <input
                      type="text"
                      value={badge.nome || ''}
                      onChange={(event) => updateBadge(badge.id, { nome: event.target.value }, setBadgeDraft)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                      placeholder="Nome do selo"
                    />
                    <select
                      value={badge.metric || 'sessions'}
                      onChange={(event) => updateBadge(badge.id, { metric: event.target.value }, setBadgeDraft)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
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
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                    />
                  </div>
                  <textarea
                    rows="2"
                    value={badge.descricao || ''}
                    onChange={(event) => updateBadge(badge.id, { descricao: event.target.value }, setBadgeDraft)}
                    className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 outline-none focus:border-blue-600"
                    placeholder="Descrição do selo"
                  />
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <select
                      value={badge.plan || ''}
                      onChange={(event) => updateBadge(badge.id, { plan: event.target.value }, setBadgeDraft)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                    >
                      <option value="">Todos os concursos</option>
                      {planOptions.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                    </select>
                    <select
                      value={badge.subject || ''}
                      onChange={(event) => updateBadge(badge.id, { subject: event.target.value }, setBadgeDraft)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                    >
                      <option value="">Todas as disciplinas</option>
                      {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                    </select>
                    <input
                      type="text"
                      value={badge.topic || ''}
                      onChange={(event) => updateBadge(badge.id, { topic: event.target.value }, setBadgeDraft)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                      placeholder="Tópico contém..."
                    />
                    <input
                      type="text"
                      value={badge.color || ''}
                      onChange={(event) => updateBadge(badge.id, { color: event.target.value }, setBadgeDraft)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                      placeholder="Cor"
                    />
                  </div>
                </CollapsibleCard>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeSection === 'wellness' ? (
        <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap gap-2 rounded-2xl bg-gray-100 p-1.5">
            <ConfigTab active={wellnessInnerTab === 'audio'} onClick={() => setWellnessInnerTab('audio')} label="Meditações" />
            <ConfigTab active={wellnessInnerTab === 'video'} onClick={() => setWellnessInnerTab('video')} label="Pausas rápidas" />
            <ConfigTab active={wellnessInnerTab === 'page'} onClick={() => setWellnessInnerTab('page')} label="Página Bem-estar" />
          </div>

          {wellnessInnerTab === 'page' ? (
            <>
              <div className="mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Conteúdo editorial</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">Textos e blocos da aba Bem-estar</h3>
                <p className="mt-2 max-w-3xl text-sm font-medium text-gray-500">
                  Hero, métricas, CVV, visão geral, respirações e rótulos exibidos na página. A biblioteca de áudio/vídeo continua nas abas
                  Meditações e Pausas rápidas.
                </p>
              </div>
              <div className="custom-scrollbar max-h-[720px] overflow-y-auto pr-2">
                <AdminWellnessPageConfigEditor config={wellnessPageDraft} setConfig={setWellnessPageDraft} />
              </div>
            </>
          ) : (
            <>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Biblioteca de bem-estar</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                    {wellnessInnerTab === 'video' ? 'Biblioteca de pausas rápidas' : 'Biblioteca de meditações'}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-gray-500">
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
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700"
                >
                  <Plus size={15} />
                  {wellnessInnerTab === 'video' ? 'Adicionar pausa rápida' : 'Adicionar meditação'}
                </button>
              </div>

              <div className="custom-scrollbar max-h-[720px] space-y-3 overflow-y-auto pr-2">
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
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  }
                >
                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      type="text"
                      value={track.title || ''}
                      onChange={(event) => updateTrack(track.id, { title: event.target.value }, setWellnessDraft)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                      placeholder="Título"
                    />
                    <select
                      value={track.mediaType || 'audio'}
                      onChange={(event) => updateTrack(track.id, { mediaType: event.target.value }, setWellnessDraft)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                    >
                      <option value="audio">Audio</option>
                      <option value="video">Video</option>
                    </select>
                    <input
                      type="text"
                      value={track.category || ''}
                      onChange={(event) => updateTrack(track.id, { category: event.target.value }, setWellnessDraft)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                      placeholder="Categoria"
                    />
                  </div>
                  <textarea
                    rows="2"
                    value={track.description || ''}
                    onChange={(event) => updateTrack(track.id, { description: event.target.value }, setWellnessDraft)}
                    className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 outline-none focus:border-blue-600"
                    placeholder="Descrição"
                  />
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <input
                      type="text"
                      value={track.durationLabel || ''}
                      onChange={(event) => updateTrack(track.id, { durationLabel: event.target.value }, setWellnessDraft)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
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
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                      placeholder={track.mediaType === 'video' ? 'https://.../video.mp4 ou embed' : '/assets/wellness/arquivo.mp3'}
                    />
                    <input
                      type="text"
                      value={track.coverUrl || ''}
                      onChange={(event) => updateTrack(track.id, { coverUrl: event.target.value }, setWellnessDraft)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                      placeholder="/assets/wellness/capa.jpg"
                    />
                    <input
                      type="text"
                      value={track.credits || ''}
                      onChange={(event) => updateTrack(track.id, { credits: event.target.value }, setWellnessDraft)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                      placeholder="Créditos"
                    />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600">
                      {track.mediaType === 'video' ? 'Upload do vídeo' : 'Upload da meditação'}
                      <input
                        type="file"
                        accept={track.mediaType === 'video' ? 'video/*' : 'audio/*'}
                        className="mt-2 block w-full text-xs font-medium text-gray-500"
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
                    <label className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600">
                      Upload da capa
                      <input
                        type="file"
                        accept="image/*"
                        className="mt-2 block w-full text-xs font-medium text-gray-500"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const dataUrl = await fileToDataUrl(file);
                          updateTrack(track.id, { coverUrl: dataUrl }, setWellnessDraft);
                        }}
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
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
        </section>
      ) : null}

      {activeSection === 'redacoes-tips' ? (
        <section className="rounded-[2rem] border border-rose-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-500">
                <FileSignature size={14} />
                Conteúdo operacional
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">Dicas e esqueletos de redação</h3>
              <p className="mt-2 max-w-2xl text-sm font-medium text-gray-500">
                Cadastre padrões (CESPE, FCC, etc.). Os alunos veem na aba &quot;Dicas de especialista&quot; em Redações. Os dados ficam na tabela{' '}
                <code className="rounded bg-slate-100 px-1 text-xs">redacao_expert_tips</code> no Supabase (rode o SQL em{' '}
                <code className="rounded bg-slate-100 px-1 text-xs">supabase/redacao_expert_tips.sql</code>).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const id = normalizeRedacaoExpertTip({ title: 'Novo esqueleto', body: '' }).id;
                setRedacaoTipsDraft((prev) => [...prev, { id, title: 'Novo esqueleto', body: '', sort_order: prev.length }]);
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700"
            >
              <Plus size={15} />
              Adicionar
            </button>
          </div>

          <div className="custom-scrollbar max-h-[min(70vh,640px)] space-y-3 overflow-y-auto pr-2">
            {redacaoTipsDraft.map((tip, index) => (
              <div key={tip.id} className="rounded-[1.4rem] border border-gray-200 bg-gray-50/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Item {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => setRedacaoTipsDraft((prev) => prev.filter((t) => t.id !== tip.id))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600"
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
                  className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:border-blue-600"
                  placeholder="Título ex.: Padrão CESPE — dissertação"
                />
                <textarea
                  rows={6}
                  value={tip.body}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRedacaoTipsDraft((prev) => prev.map((t) => (t.id === tip.id ? { ...t, body: v } : t)));
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium leading-relaxed text-gray-700 outline-none focus:border-blue-600"
                  placeholder="Texto completo: estrutura de parágrafos, conectivos, avisos da banca..."
                />
              </div>
            ))}
            {redacaoTipsDraft.length === 0 ? (
              <EmptyState text="Nenhuma dica cadastrada. Adicione esqueletos ou orientações para os alunos." />
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
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
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-bold text-rose-800 disabled:opacity-50"
            >
              <Save size={16} />
              {redacaoTipsSaving ? 'Salvando dicas…' : 'Salvar só dicas de redação'}
            </button>
          </div>
        </section>
      ) : null}

      {activeSection === 'redacoes-dados' ? (
        <section className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-600">
              <FileSignature size={14} />
              Redações · dados vivos
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Banco de temas e kit (conectivos / modelos)</h3>
            <p className="mt-2 max-w-3xl text-sm font-medium text-gray-500">
              Salve no Supabase (tabela <code className="rounded bg-gray-100 px-1 text-xs">redacao_site_content</code>
              — rode <code className="rounded bg-gray-100 px-1 text-xs">supabase/redacao_site_content.sql</code>
              {'; para a coluna de catálogo de audiolivros, rode '}
              <code className="rounded bg-gray-100 px-1 text-xs">supabase/redacao_site_content_audiobooks.sql</code>).{' '}
              Temas, kit e audiolivros são editados nos blocos abaixo; nada de JSON manual.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="min-w-0 rounded-2xl border border-sky-100 bg-sky-50/40 p-4 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">Banco de temas</p>
              <div className="mt-3">
                <AdminRedacaoThemeBankEditor draft={themeBankDraft} onDraftChange={setThemeBankDraft} />
              </div>
            </div>
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Kit (aba Dicas)</span>
                <button
                  type="button"
                  onClick={() => setKitDraft(mergeRedacaoKitBundle(redacaoKitOverride))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-slate-300"
                >
                  Descartar edição local
                </button>
              </div>
              <AdminRedacaoKitEditor draft={kitDraft} onDraftChange={setKitDraft} />
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-violet-100 bg-violet-50/50 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Headphones className="text-violet-700" size={18} />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700">Catálogo de audiolivros</p>
            </div>
            <p className="text-xs font-medium leading-relaxed text-gray-600">
              Se você ainda não gravou nada no Supabase, o app mostra o catálogo de demonstração embutido no código (
              <code className="text-xs">buildDefaultAudiobookCatalog</code> em <code className="text-xs">src/lib/audiobooks.js</code>
              ) — o mesmo que aparece aqui ao abrir esta aba. Depois de salvar obras válidas, passa a valer o que está no banco.
            </p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-gray-600">
              URLs de áudio públicas (<code className="text-xs">https://</code>) ou arquivos estáticos (<code className="text-xs">/assets/...</code>). Se nenhuma obra
              válida restar após salvar, o app volta ao catálogo embutido. Para editar só audiolivros, use também o menu Admin → Audiolivros.
            </p>
            <div className="mt-4">
              <AdminAudiobookCatalogEditor draft={audiobookCatalogDraft} onDraftChange={setAudiobookCatalogDraft} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
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
              className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm font-bold text-sky-900 disabled:opacity-50"
            >
              <Save size={16} />
              {redacaoSiteSaving ? 'Salvando…' : 'Salvar banco, kit e audiolivros'}
            </button>
          </div>
        </section>
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

function ConfigTab({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${active ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}
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

function AiStatusCard({ label, value, dotTone = '' }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        {dotTone ? <span className={`h-2.5 w-2.5 rounded-full ${dotTone}`} /> : null}
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
      />
    </label>
  );
}

function CollapsibleCard({ isOpen, onToggle, title, subtitle, actions, children }) {
  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-gray-200 bg-gray-50/70">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 truncate text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </button>
      {isOpen ? <div className="border-t border-gray-200 px-4 py-4">{children}</div> : null}
    </div>
  );
}

function ToggleChip({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-gray-300" />
      {label}
    </label>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-gray-200 bg-gray-50/70 px-5 py-6 text-sm font-semibold text-gray-500">
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
