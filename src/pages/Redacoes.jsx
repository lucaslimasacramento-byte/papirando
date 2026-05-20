import React, { useMemo, useRef, useState } from 'react';
import {
  FileSignature,
  PenTool,
  List,
  Lightbulb,
  Wand2,
  ArrowRight,
  Type,
  Camera,
  UploadCloud,
  Loader2,
  AlertTriangle,
  Printer,
  CheckCircle2,
  BrainCircuit,
  ThumbsUp,
  Edit3,
  Target,
  Search,
  Sparkles,
  Trash2,
  CircleHelp,
  Trophy,
  Percent,
  Library,
} from 'lucide-react';
import { REDACAO_BANCA_OPTIONS, REDACAO_BANCA_GUIDES, COMPARACAO_BANCAS } from '../data/redacaoBancaGuides';
import {
  analyzeRedacaoWithRealAI,
  normalizeRedacaoRecord,
  transcribeEssayImageWithAI,
} from '../lib/redacoesApi';
import { RedacaoDicasKitPanel } from '../components/RedacaoDicasKitPanel';
import { REDACAO_THEME_BANK_DEFAULT } from '../data/redacaoThemeBankDefault';
import { REDACAO_ESQUELETOS_MILIMETRICOS } from '../data/redacaoEsqueletosMilimetricos';
import { mergeRedacaoKitBundle } from '../lib/redacaoKitMerge';

/** Folha pautada: viewport entre 20 e 30 linhas; ~72 caracteres/linha em média (referência prova). */
const REDACAO_EDITOR_LINE_PX = 28;
const REDACAO_EDITOR_LINE_MIN = 20;
const REDACAO_EDITOR_LINE_MAX = 30;
const REDACAO_CHARS_PER_LINE_REF = 72;

const REDACAO_PARTES_PRESETS = [
  { id: '5-8-8-5', label: '5·8·8·5', v: { intro: 5, d1: 8, d2: 8, fim: 5 } },
  { id: '4-7-7-4', label: '4·7·7·4', v: { intro: 4, d1: 7, d2: 7, fim: 4 } },
];

function clampParteLinhas(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 3;
  return Math.min(20, Math.max(2, Math.round(x)));
}

/** Guias na margem: setas do início ao fim de cada bloco (intro, dois desenvolvimentos, fechamento). */
function RedacaoPartesGutter({ linePx, partes, totalHeightPx }) {
  const { intro, d1, d2, fim } = partes;
  const blocks = [
    { n: intro, label: 'Intro', stroke: '#4f46e5' },
    { n: d1, label: 'Dev 1', stroke: '#7c3aed' },
    { n: d2, label: 'Dev 2', stroke: '#059669' },
    { n: fim, label: 'Fim', stroke: '#d97706' },
  ];
  const partesH = (intro + d1 + d2 + fim) * linePx;
  const svgH = Math.max(totalHeightPx || 0, partesH);
  const w = 34;
  const xRail = 26;

  let yCursor = 0;
  return (
    <div
      className="shrink-0 select-none border-r border-slate-200/90 bg-slate-50/80"
      style={{ width: w, minHeight: svgH }}
      aria-hidden
    >
      <svg width={w} height={svgH} className="block text-[9px] font-bold">
        {blocks.map((b) => {
          const h = b.n * linePx;
          const y0 = yCursor;
          const yMid = y0 + h / 2;
          const yEnd = y0 + h - linePx * 0.32;
          const yStart = y0 + linePx * 0.32;
          const tip = y0 + h - linePx * 0.12;
          yCursor += h;
          return (
            <g key={b.label}>
              <line x1={xRail} y1={yStart} x2={xRail} y2={yEnd} stroke={b.stroke} strokeWidth={2} strokeLinecap="round" />
              <polygon points={`${xRail},${tip} ${xRail - 5},${tip - 6} ${xRail + 5},${tip - 6}`} fill={b.stroke} />
              <text
                x={5}
                y={yMid}
                fill="#64748b"
                dominantBaseline="middle"
                className="font-sans"
                style={{ fontSize: '8px', fontWeight: 700 }}
              >
                {b.label}
              </text>
            </g>
          );
        })}
        {svgH > partesH ? (
          <line
            x1={xRail}
            y1={partesH}
            x2={xRail}
            y2={svgH}
            stroke="#e2e8f0"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        ) : null}
      </svg>
    </div>
  );
}

function RedacaoPartesGuiasPanel({
  partesLinhas,
  onChangeParte,
  onPreset,
  partesGuiasAtivas,
  onToggleGuias,
  onFolhaPartes,
  disabled,
}) {
  const row = (key, short) => (
    <label key={key} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
      <span className="w-8 shrink-0 text-slate-500">{short}</span>
      <input
        type="number"
        min={2}
        max={20}
        value={partesLinhas[key]}
        disabled={disabled}
        onChange={(e) => onChangeParte(key, e.target.value)}
        className="w-full min-w-0 rounded border border-slate-200 bg-white px-1 py-0.5 text-center font-mono text-[11px] text-slate-800 outline-none focus:border-indigo-400 disabled:opacity-50"
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-2 border-b border-slate-200/80 pb-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Partes · linhas</p>
      <div className="grid grid-cols-1 gap-1">
        {row('intro', 'Int')}
        {row('d1', 'D1')}
        {row('d2', 'D2')}
        {row('fim', 'Fim')}
      </div>
      <div className="flex flex-wrap gap-1">
        {REDACAO_PARTES_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onPreset(p.v)}
            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/50 disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-1.5 text-[10px] font-semibold text-slate-600">
        <input
          type="checkbox"
          checked={partesGuiasAtivas}
          disabled={disabled}
          onChange={(e) => onToggleGuias(e.target.checked)}
          className="rounded border-slate-300 text-indigo-600"
        />
        Setas na margem
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={onFolhaPartes}
        className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[10px] font-bold leading-tight text-indigo-900 transition hover:bg-indigo-100 disabled:opacity-50"
      >
        Folha vazia + guias
      </button>
    </div>
  );
}

function RedacaoEsqueletoRail({ items, activeId, onSelect, onLivre, disabled }) {
  return (
    <aside className="flex flex-shrink-0 flex-row gap-1 overflow-x-auto border-t-0 border-slate-200 bg-transparent p-2 md:w-full md:flex-col md:gap-1 md:overflow-y-auto md:pl-2 md:pt-0">
      <p className="hidden w-full text-[9px] font-bold uppercase tracking-wide text-slate-500 md:block">Esqueleto</p>
      <button
        type="button"
        disabled={disabled}
        onClick={onLivre}
        className={`flex min-w-[4.5rem] shrink-0 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-left text-[11px] font-bold transition md:w-full md:justify-start ${
          activeId == null
            ? 'border-blue-300 bg-blue-50 text-blue-900'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
        } disabled:opacity-50`}
      >
        <span className="font-mono text-xs opacity-70">∅</span>
        Livre
      </button>
      {items.map((item, idx) => {
        const n = item.shortLabel || String(idx + 1);
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item)}
            title={item.titulo}
            className={`flex min-w-[7.5rem] shrink-0 items-center gap-2 rounded-lg border px-2 py-2 text-left transition md:w-full ${
              active
                ? 'border-blue-400 bg-blue-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50'
            } disabled:opacity-50`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold ${
                active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {n}
            </span>
            <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{item.titulo}</span>
          </button>
        );
      })}
      <p className="hidden pt-1 text-[9px] font-medium leading-snug text-slate-400 md:block">
        4+7+7+4 linhas + faixas. Est. 15–20 min.
      </p>
    </aside>
  );
}

const HEADER_KPI_TONES = {
  indigo: 'border-indigo-100 bg-indigo-50/80 text-indigo-800',
  slate: 'border-slate-200 bg-slate-50 text-slate-800',
  amber: 'border-amber-100 bg-amber-50/90 text-amber-900',
  emerald: 'border-emerald-100 bg-emerald-50/90 text-emerald-900',
};

const HEADER_KPI_TONES_DARK = {
  indigo: 'border-indigo-400/30 bg-indigo-500/15 text-indigo-100',
  slate: 'border-white/15 bg-white/10 text-slate-100',
  amber: 'border-amber-400/30 bg-amber-500/15 text-amber-100',
  emerald: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100',
};

function HeaderKpiChip({ icon: Icon, label, value, sub, tone = 'slate', variant = 'light' }) {
  const map = variant === 'dark' ? HEADER_KPI_TONES_DARK : HEADER_KPI_TONES;
  const toneClass = map[tone] || (variant === 'dark' ? HEADER_KPI_TONES_DARK.slate : HEADER_KPI_TONES.slate);
  const subCls = variant === 'dark' ? 'text-slate-400' : 'opacity-70';
  const iconCls = variant === 'dark' ? 'text-slate-300' : '';

  if (variant === 'dark') {
    return (
      <div
        className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-2.5 py-2.5 sm:gap-3 sm:px-3 sm:py-3 ${toneClass}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 sm:h-10 sm:w-10">
          <Icon size={15} className={iconCls} strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[8px] font-semibold uppercase tracking-wider opacity-80 sm:text-[9px]">{label}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-1 gap-y-0">
            <span className="text-sm font-bold tabular-nums leading-none sm:text-base">{value}</span>
            {sub ? <span className={`text-[10px] font-semibold leading-none sm:text-[11px] ${subCls}`}>{sub}</span> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex min-w-0 max-w-[140px] flex-1 flex-col rounded-lg border px-2.5 py-1.5 sm:max-w-none sm:flex-none sm:px-3 ${toneClass}`}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={13} className={`shrink-0 opacity-80 ${iconCls}`} strokeWidth={2.2} />
        <span className="truncate text-[9px] font-semibold uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="truncate text-sm font-bold tabular-nums leading-none">{value}</span>
        {sub ? <span className={`text-[10px] font-semibold ${subCls}`}>{sub}</span> : null}
      </div>
    </div>
  );
}

function formatRelativeTimePt(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diffMs = Date.now() - t;
  if (diffMs < 0) return 'agora';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `Há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Há ${days} dia${days > 1 ? 's' : ''}`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const REDACAO_EIXO_FILTERS = [
  { id: '', label: 'Todos os eixos' },
  { id: 'seguranca', label: 'Segurança pública' },
  { id: 'meio-ambiente', label: 'Meio ambiente' },
  { id: 'tecnologia', label: 'Tecnologia' },
  { id: 'sociedade', label: 'Sociedade e políticas' },
  { id: 'educacao', label: 'Educação' },
];

function eixoTagClasses(eixo) {
  const axis = {
    seguranca: 'bg-blue-100 text-blue-700',
    tecnologia: 'bg-purple-100 text-purple-700',
    'meio-ambiente': 'bg-emerald-100 text-emerald-700',
    sociedade: 'bg-rose-100 text-rose-700',
    educacao: 'bg-amber-100 text-amber-800',
  }[eixo];
  return {
    axis: axis || 'bg-slate-100 text-slate-600',
    banca: 'bg-slate-100 text-slate-500',
  };
}

export default function Redacoes({
  redacoes = [],
  redacaoSummary = {},
  currentUserId,
  onSaveRedacao,
  onDeleteRedacao,
  redacaoExpertTips = [],
  redacaoThemeBankOverride = null,
  redacaoKitOverride = null,
}) {
  const [redacaoInnerTab, setRedacaoInnerTab] = useState('correcao');
  const [expertModalTip, setExpertModalTip] = useState(null);
  const [bancaHelpOpen, setBancaHelpOpen] = useState(false);
  const [bancaHelpTab, setBancaHelpTab] = useState('CESPE / CEBRASPE');
  const [redacaoInputMode, setRedacaoInputMode] = useState('text');
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [transcribedText, setTranscribedText] = useState('');
  const [redacaoTema, setRedacaoTema] = useState('');
  const [redacaoBanca, setRedacaoBanca] = useState('CESPE / CEBRASPE');
  const [redacaoText, setRedacaoText] = useState('');
  const [uploadErr, setUploadErr] = useState('');
  const [corrigindo, setCorrigindo] = useState(false);
  const [correcaoResult, setCorrecaoResult] = useState(null);
  const [temaBankQuery, setTemaBankQuery] = useState('');
  const [temaBankEixo, setTemaBankEixo] = useState('');
  const [esqueletoAtivoId, setEsqueletoAtivoId] = useState(null);
  const [partesLinhas, setPartesLinhas] = useState({ intro: 5, d1: 8, d2: 8, fim: 5 });
  const [partesGuiasAtivas, setPartesGuiasAtivas] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setUploadErr('Envie uma imagem (JPG, PNG, WebP) ou PDF.');
      return;
    }
    setUploadErr('');
    setUploadStatus('loading');

    try {
      const result = await transcribeEssayImageWithAI(file);
      setTranscribedText(result.text || '');
      setUploadStatus('review');
    } catch (e) {
      setUploadErr(String(e?.message || 'Falha na transcricao com IA.'));
      setUploadStatus('idle');
    }
  };

  const handleCorrigir = async () => {
    const text = redacaoInputMode === 'upload' ? transcribedText : redacaoText;
    if (!text.trim()) return;
    setCorrigindo(true);
    setCorrecaoResult(null);
    setUploadErr('');

    try {
      const correction = await analyzeRedacaoWithRealAI({
        text,
        tema: redacaoTema,
        banca: redacaoBanca,
      });
      setCorrecaoResult(correction);

      await onSaveRedacao?.({
        redacao: normalizeRedacaoRecord({
          user_id: currentUserId,
          banca: redacaoBanca,
          tema: redacaoTema,
          status: 'corrected',
          input_mode: redacaoInputMode === 'upload' ? 'upload' : 'text',
          text,
          original_text: redacaoInputMode === 'upload' ? '' : text,
          transcribed_text: redacaoInputMode === 'upload' ? text : '',
          correction,
          score: correction.overallScore,
          corrected_at: correction.analyzedAt,
          updated_at: new Date().toISOString(),
        }),
      });
    } catch (err) {
      setUploadErr(String(err?.message || 'Servidor de IA indisponível. Tente novamente em alguns instantes.'));
    } finally {
      setCorrigindo(false);
    }
  };

  const aplicarTemaDoBanco = (temaItem) => {
    if (!temaItem?.title) return;
    const bancaMap = {
      CESPE: 'CESPE / CEBRASPE',
      FCC: 'FCC',
      FGV: 'FGV',
      VUNESP: 'VUNESP',
      IBFC: 'IBFC',
      AOCP: 'AOCP',
      IDECAN: 'IDECAN',
    };
    setRedacaoTema(temaItem.title);
    const nextBanca = bancaMap[temaItem.banca] || temaItem.banca || 'CESPE / CEBRASPE';
    const valid = REDACAO_BANCA_OPTIONS.some((o) => o.value === nextBanca);
    setRedacaoBanca(valid ? nextBanca : 'CESPE / CEBRASPE');
    setRedacaoInnerTab('correcao');
    setUploadStatus('idle');
  };

  const themeBankResolved = useMemo(
    () =>
      Array.isArray(redacaoThemeBankOverride) && redacaoThemeBankOverride.length > 0
        ? redacaoThemeBankOverride
        : REDACAO_THEME_BANK_DEFAULT,
    [redacaoThemeBankOverride]
  );

  const kitBundle = useMemo(() => mergeRedacaoKitBundle(redacaoKitOverride), [redacaoKitOverride]);

  const esqueletosParaEditor = useMemo(() => {
    const m = kitBundle?.modelos;
    if (Array.isArray(m) && m.length > 0) {
      const rows = m
        .map((x, i) => {
          const corpo = String(x?.corpo || '').trim();
          if (!corpo) return null;
          return {
            id: String(x.id || `esq-${i}`),
            shortLabel: String(i + 1),
            titulo: String(x.titulo || '')
              .replace(/^🧱\s*/, '')
              .trim() || `Modelo ${i + 1}`,
            badge: x.badge,
            corpo,
          };
        })
        .filter(Boolean);
      if (rows.length) return rows;
    }
    return REDACAO_ESQUELETOS_MILIMETRICOS;
  }, [kitBundle]);

  const aplicarEsqueleto = (item) => {
    if (!item?.corpo || corrigindo) return;
    if (String(redacaoText || '').trim()) {
      const ok = typeof window !== 'undefined' ? window.confirm('Substituir o texto atual pelo esqueleto selecionado?') : true;
      if (!ok) return;
    }
    setRedacaoText(item.corpo);
    setEsqueletoAtivoId(item.id);
    setPartesGuiasAtivas(false);
  };

  const handleParteLinhaChange = (key, raw) => {
    setPartesLinhas((p) => ({ ...p, [key]: clampParteLinhas(raw) }));
  };

  const aplicarFolhaPartes = () => {
    if (corrigindo) return;
    const s = partesLinhas.intro + partesLinhas.d1 + partesLinhas.d2 + partesLinhas.fim;
    const empty = Array(Math.max(1, s)).fill('').join('\n');
    if (redacaoInputMode === 'upload' && uploadStatus === 'review') {
      if (String(transcribedText || '').trim()) {
        const ok =
          typeof window !== 'undefined' ? window.confirm('Substituir o texto atual pela folha vazia com guias?') : true;
        if (!ok) return;
      }
      setTranscribedText(empty);
    } else {
      if (String(redacaoText || '').trim()) {
        const ok =
          typeof window !== 'undefined' ? window.confirm('Substituir o texto atual pela folha vazia com guias?') : true;
        if (!ok) return;
      }
      setRedacaoText(empty);
    }
    setEsqueletoAtivoId(null);
    setPartesGuiasAtivas(true);
  };

  const temasFiltrados = useMemo(() => {
    const q = temaBankQuery.trim().toLowerCase();
    return themeBankResolved.filter((item) => {
      if (temaBankEixo && item.eixo !== temaBankEixo) return false;
      if (!q) return true;
      const blob = `${item.title} ${item.description} ${item.banca}`.toLowerCase();
      return blob.includes(q);
    });
  }, [temaBankEixo, temaBankQuery, themeBankResolved]);

  const historicoRecente = useMemo(() => {
    const list = Array.isArray(redacoes) ? redacoes.map((item) => normalizeRedacaoRecord(item)) : [];
    return [...list].sort((a, b) => {
      const ta = new Date(b.updated_at || b.created_at || 0).getTime();
      const tb = new Date(a.updated_at || a.created_at || 0).getTime();
      return ta - tb;
    }).slice(0, 6);
  }, [redacoes]);

  const openRedacaoInEditor = (raw) => {
    const r = normalizeRedacaoRecord(raw);
    setRedacaoInnerTab('correcao');
    const b = r.banca || 'CESPE / CEBRASPE';
    setRedacaoBanca(REDACAO_BANCA_OPTIONS.some((o) => o.value === b) ? b : 'CESPE / CEBRASPE');
    setRedacaoTema(r.tema || '');
    const body = r.text || '';
    if (r.input_mode === 'upload' || (r.transcribed_text && !body)) {
      setRedacaoInputMode('upload');
      setTranscribedText(body || r.transcribed_text || '');
      setUploadStatus(body.trim() || r.transcribed_text?.trim() ? 'review' : 'idle');
    } else {
      setRedacaoInputMode('text');
      setRedacaoText(body);
      setTranscribedText('');
      setUploadStatus('idle');
    }
    setCorrecaoResult(r.correction || null);
    setUploadErr('');
  };

  const handleDeleteRedacao = async (raw) => {
    if (!onDeleteRedacao) return;
    const r = normalizeRedacaoRecord(raw);
    if (!r.id) return;
    const ok = typeof window !== 'undefined' ? window.confirm('Remover esta redação do histórico?') : true;
    if (!ok) return;
    try {
      await onDeleteRedacao({ id: r.id, attachment_path: r.attachment_path });
      setCorrecaoResult(null);
    } catch {
      /* erro tratado no App */
    }
  };

  const summary = useMemo(
    () => ({
      total: redacaoSummary?.total ?? 0,
      corrected: redacaoSummary?.corrected ?? 0,
      drafts: redacaoSummary?.drafts ?? 0,
      avgScore: redacaoSummary?.averageScore ?? 0,
      bestScore: redacaoSummary?.bestScore ?? 0,
      topTheme: redacaoSummary?.topTheme ?? '',
      topThemeCount: redacaoSummary?.topThemeCount ?? 0,
    }),
    [redacaoSummary]
  );

  const textoCorrente = redacaoInputMode === 'upload' ? transcribedText : redacaoText;
  const linhasTexto = useMemo(() => {
    const t = String(textoCorrente || '');
    if (!t.trim()) return 0;
    return t.split(/\r?\n/).length;
  }, [textoCorrente]);

  const linhasCorpo = useMemo(() => {
    const raw = String(textoCorrente || '');
    if (!raw.trim()) return REDACAO_EDITOR_LINE_MIN;
    return Math.max(linhasTexto, REDACAO_EDITOR_LINE_MIN);
  }, [textoCorrente, linhasTexto]);

  const somaPartesLinhas = useMemo(
    () => partesLinhas.intro + partesLinhas.d1 + partesLinhas.d2 + partesLinhas.fim,
    [partesLinhas]
  );

  const innerMinHeightPx = useMemo(() => {
    const linhasBase = Math.max(linhasCorpo, partesGuiasAtivas ? somaPartesLinhas : 0, REDACAO_EDITOR_LINE_MIN);
    return linhasBase * REDACAO_EDITOR_LINE_PX;
  }, [linhasCorpo, partesGuiasAtivas, somaPartesLinhas]);

  const latestEssay = useMemo(() => {
    const list = Array.isArray(redacoes) ? redacoes.map((item) => normalizeRedacaoRecord(item)) : [];
    return (
      list
        .filter((item) => item?.correction)
        .sort((a, b) => {
          const ta = new Date(a.corrected_at || a.updated_at || 0).getTime();
          const tb = new Date(b.corrected_at || b.updated_at || 0).getTime();
          return tb - ta;
        })[0] || null
    );
  }, [redacoes]);

  const latestCorrection = correcaoResult || latestEssay?.correction || null;
  const draftText = redacaoInputMode === 'upload' ? transcribedText : redacaoText;

  const displaySnapshot = useMemo(() => {
    if (correcaoResult) {
      const t = draftText;
      const lines = t.split('\n').filter((line) => line.trim()).length || 0;
      const paragraphs = t.split(/\n\s*\n/).filter((line) => line.trim()).length || 0;
      return {
        tema: redacaoTema.trim() || 'Correção atual',
        banca: redacaoBanca,
        lines,
        paragraphs,
        at: correcaoResult.analyzedAt,
      };
    }
    if (latestEssay?.correction) {
      return {
        tema: latestEssay.tema.trim() || 'Redação sem tema',
        banca: latestEssay.banca,
        lines: latestEssay.line_count || 0,
        paragraphs: latestEssay.paragraph_count || 0,
        at: latestEssay.corrected_at || latestEssay.updated_at,
      };
    }
    return null;
  }, [correcaoResult, draftText, latestEssay, redacaoBanca, redacaoTema]);

  const criteriaEntries = latestCorrection
    ? [
        { key: 'gramatica', label: 'Gramática', scoreClass: 'text-red-500', barClass: 'bg-red-500' },
        { key: 'coesao', label: 'Coesão', scoreClass: 'text-emerald-500', barClass: 'bg-emerald-500' },
        { key: 'tema', label: 'Tema', scoreClass: 'text-blue-500', barClass: 'bg-blue-500' },
        { key: 'estrutura', label: 'Estrutura', scoreClass: 'text-amber-500', barClass: 'bg-amber-400' },
      ].map((item) => ({
        ...item,
        criterion: latestCorrection.criteria?.[item.key] || null,
      }))
    : [];
  const strengthsText = latestCorrection?.strengths?.join(' ') || latestCorrection?.summary || '';
  const improvementsText = latestCorrection?.improvements?.join(' ') || '';
  const grammarFeedbackItems = latestCorrection?.grammarFeedback?.slice(0, 3) || [];

  const expertCatalog = useMemo(
    () => (Array.isArray(redacaoExpertTips) ? redacaoExpertTips : []).filter((t) => t?.title),
    [redacaoExpertTips]
  );

  const ruledEssayLineStyle = useMemo(
    () => ({
      lineHeight: `${REDACAO_EDITOR_LINE_PX}px`,
      backgroundImage: `linear-gradient(to bottom, transparent ${REDACAO_EDITOR_LINE_PX - 1}px, rgba(203, 213, 225, 0.55) ${REDACAO_EDITOR_LINE_PX - 1}px)`,
      backgroundSize: `100% ${REDACAO_EDITOR_LINE_PX}px`,
      backgroundAttachment: 'local',
    }),
    []
  );

  const textareaEssayStyle = useMemo(
    () => ({
      ...ruledEssayLineStyle,
      minHeight: innerMinHeightPx,
    }),
    [ruledEssayLineStyle, innerMinHeightPx]
  );

  return (
    <div className="pl-paper-bg" style={{ padding: '28px 28px 48px' }}>
      {/* ── Hero ── */}
      <div style={{ marginBottom: 24 }}>
        <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Produção textual</p>
        <h1 className="pl-display" style={{ marginBottom: 12 }}>Correção de redações.</h1>
        <p style={{ fontSize: 13, color: 'var(--pl-ink-2)', maxWidth: 480, marginBottom: 20 }}>OCR, parecer por banca e histórico completo de produções.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 560 }}>
          {[
            { label: 'Corrigidas', value: String(summary.corrected) },
            { label: 'Média', value: summary.avgScore ? String(summary.avgScore).replace('.', ',') : '—' },
            { label: 'Melhor nota', value: summary.bestScore ? String(summary.bestScore).replace('.', ',') : '—' },
            { label: 'Histórico', value: String(summary.total) },
          ].map((s) => (
            <div key={s.label} className="pl-card" style={{ padding: '12px 16px' }}>
              <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{s.label}</p>
              <p className="pl-num" style={{ fontSize: 20, color: 'var(--pl-ink)' }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="w-fit max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex gap-2 flex-wrap">
              <PremiumTabButton
                active={redacaoInnerTab === 'correcao'}
                onClick={() => setRedacaoInnerTab('correcao')}
                icon={PenTool}
                label="Nova correção"
              />
              <PremiumTabButton
                active={redacaoInnerTab === 'temas'}
                onClick={() => setRedacaoInnerTab('temas')}
                icon={List}
                label="Banco de temas"
              />
              <PremiumTabButton
                active={redacaoInnerTab === 'dicas'}
                onClick={() => setRedacaoInnerTab('dicas')}
                icon={Lightbulb}
                label="Dicas de especialista"
              />
            </div>
          </div>

          {redacaoInnerTab === 'correcao' && (
            <>
              <section className="pl-card relative flex flex-col overflow-hidden p-4 md:p-5 animate-in fade-in zoom-in-95 duration-300">
                <div className="relative z-10 flex flex-col">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900 md:text-xl">Nova correção</h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                      Escolha a banca, digite ou envie o texto e corrija com IA. Dicas por banca no ícone de ajuda (?).
                    </p>
                  </div>

                  <div className="mt-4">
                    <FieldBlock
                      label="Banca avaliadora"
                      action={
                        <button
                          type="button"
                          title="O que esta banca costuma cobrar"
                          onClick={() => {
                            setBancaHelpTab(redacaoBanca);
                            setBancaHelpOpen(true);
                          }}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                          aria-label="Parâmetros da banca"
                        >
                          <CircleHelp size={18} strokeWidth={2} />
                        </button>
                      }
                    >
                      <select
                        value={redacaoBanca}
                        onChange={(e) => setRedacaoBanca(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 md:max-w-xl"
                      >
                        {REDACAO_BANCA_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </FieldBlock>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-1.5 w-fit max-w-full overflow-x-auto">
                    <div className="flex flex-wrap gap-2">
                      <PremiumTabButton
                        active={redacaoInputMode === 'text'}
                        onClick={() => {
                          setRedacaoInputMode('text');
                          setUploadStatus('idle');
                        }}
                        icon={Type}
                        label="Digitar texto"
                        compact
                      />
                      <PremiumTabButton
                        active={redacaoInputMode === 'upload'}
                        onClick={() => setRedacaoInputMode('upload')}
                        icon={Camera}
                        label="Enviar foto / PDF"
                        compact
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col">
                    {redacaoInputMode === 'text' ? (
                      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-3 py-1.5">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Sua redação</span>
                            {esqueletoAtivoId ? (
                              <span className="truncate rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                                {esqueletosParaEditor.find((e) => e.id === esqueletoAtivoId)?.titulo || 'Esqueleto'}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
                            <span className="tabular-nums text-slate-800">
                              {linhasTexto} linha{linhasTexto === 1 ? '' : 's'}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500">
                              Pauta mín. {REDACAO_EDITOR_LINE_MIN} linhas · referência até {REDACAO_EDITOR_LINE_MAX} · sem rolagem interna · ~{REDACAO_CHARS_PER_LINE_REF}{' '}
                              chars/linha
                            </span>
                          </div>
                        </div>
                        <div className="bg-white px-1 pb-2 pt-1 sm:px-2">
                          <div className="flex flex-col md:flex-row md:items-stretch">
                            <div className="flex min-w-0 flex-1 justify-center md:justify-start">
                              <div className="box-border flex w-full max-w-[calc(72ch+40px)] items-stretch">
                                {partesGuiasAtivas ? (
                                  <RedacaoPartesGutter
                                    linePx={REDACAO_EDITOR_LINE_PX}
                                    partes={partesLinhas}
                                    totalHeightPx={innerMinHeightPx}
                                  />
                                ) : null}
                                <textarea
                                  value={redacaoText}
                                  onChange={(e) => {
                                    setRedacaoText(e.target.value);
                                  }}
                                  placeholder="Escreva ou cole a sua redação aqui…"
                                  style={textareaEssayStyle}
                                  className="redacao-essay-input box-border min-w-0 w-full max-w-[72ch] flex-1 resize-none border-0 border-l-[3px] border-l-sky-200/90 bg-transparent px-2 py-0 font-serif text-[15px] font-medium text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:ring-0"
                                  spellCheck
                                  disabled={corrigindo}
                                />
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col border-t border-slate-200 bg-slate-50/95 md:w-[200px] md:border-l md:border-t-0">
                              <div className="border-b border-slate-200/80 px-2 pb-2 pt-2">
                                <RedacaoPartesGuiasPanel
                                  partesLinhas={partesLinhas}
                                  onChangeParte={handleParteLinhaChange}
                                  onPreset={(v) =>
                                    setPartesLinhas({
                                      intro: clampParteLinhas(v.intro),
                                      d1: clampParteLinhas(v.d1),
                                      d2: clampParteLinhas(v.d2),
                                      fim: clampParteLinhas(v.fim),
                                    })
                                  }
                                  partesGuiasAtivas={partesGuiasAtivas}
                                  onToggleGuias={setPartesGuiasAtivas}
                                  onFolhaPartes={aplicarFolhaPartes}
                                  disabled={corrigindo}
                                />
                              </div>
                              <RedacaoEsqueletoRail
                                items={esqueletosParaEditor}
                                activeId={esqueletoAtivoId}
                                disabled={corrigindo}
                                onLivre={() => setEsqueletoAtivoId(null)}
                                onSelect={aplicarEsqueleto}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[min(40vh,320px)] flex-1 flex-col">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e.target.files?.[0] || null)}
                        />
                        {uploadErr && (
                          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{uploadErr}</div>
                        )}
                        {uploadStatus === 'idle' && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="group flex w-full flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-5 text-center transition hover:border-blue-200"
                          >
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-700 shadow-sm transition group-hover:scale-105">
                              <UploadCloud size={22} />
                            </div>
                            <h4 className="mt-3 text-sm font-semibold text-slate-900">
                              Clique para anexar foto ou PDF da redação
                            </h4>
                            <p className="mt-1 text-xs font-medium text-slate-500">
                              JPG, PNG ou PDF. Depois você revisa a transcrição antes da correção.
                            </p>
                          </button>
                        )}

                        {uploadStatus === 'loading' && (
                          <div className="flex min-h-[200px] w-full flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-center">
                            <Loader2 size={36} className="animate-spin text-blue-700" />
                            <h4 className="mt-3 text-sm font-semibold text-slate-900">Lendo anexo…</h4>
                            <p className="mt-1 text-xs font-medium text-slate-500">Aguarde alguns segundos.</p>
                          </div>
                        )}

                        {uploadStatus === 'review' && (
                          <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] shadow-sm animate-in fade-in duration-500">
                            <div className="border-b border-amber-100 bg-amber-50/90 px-3 py-1.5">
                              <div className="flex gap-2">
                                <AlertTriangle className="shrink-0 text-amber-500" size={16} />
                                <p className="text-[11px] font-bold leading-snug text-amber-900">
                                  Confira a transcrição antes de corrigir.
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-3 py-1.5">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Transcrição</span>
                              <span className="text-[11px] font-semibold text-slate-600">
                                <span className="tabular-nums text-slate-800">{linhasTexto} linhas</span>
                                <span className="text-slate-400"> · </span>
                                Pauta mín. {REDACAO_EDITOR_LINE_MIN} · até {REDACAO_EDITOR_LINE_MAX} linhas (ref.) · sem rolagem interna · ~{REDACAO_CHARS_PER_LINE_REF}{' '}
                                chars/linha
                              </span>
                            </div>
                            <div className="bg-white px-1 pb-2 pt-1 sm:px-2">
                              <div className="flex flex-col md:flex-row md:items-stretch">
                                <div className="flex min-w-0 flex-1 justify-center md:justify-start">
                                  <div className="box-border flex w-full max-w-[calc(72ch+40px)] items-stretch">
                                    {partesGuiasAtivas ? (
                                      <RedacaoPartesGutter
                                        linePx={REDACAO_EDITOR_LINE_PX}
                                        partes={partesLinhas}
                                        totalHeightPx={innerMinHeightPx}
                                      />
                                    ) : null}
                                    <textarea
                                      value={transcribedText}
                                      onChange={(e) => setTranscribedText(e.target.value)}
                                      style={textareaEssayStyle}
                                      className="redacao-essay-input box-border min-w-0 w-full max-w-[72ch] flex-1 resize-none border-0 border-l-[3px] border-l-sky-200/90 bg-transparent px-2 py-0 font-serif text-[15px] font-medium text-slate-800 outline-none ring-0 focus:ring-0"
                                      spellCheck
                                      disabled={corrigindo}
                                    />
                                  </div>
                                </div>
                                <div className="flex shrink-0 flex-col border-t border-slate-200 bg-slate-50/95 md:w-[200px] md:border-l md:border-t-0">
                                  <div className="border-b border-slate-200/80 px-2 pb-2 pt-2">
                                    <RedacaoPartesGuiasPanel
                                      partesLinhas={partesLinhas}
                                      onChangeParte={handleParteLinhaChange}
                                      onPreset={(v) =>
                                        setPartesLinhas({
                                          intro: clampParteLinhas(v.intro),
                                          d1: clampParteLinhas(v.d1),
                                          d2: clampParteLinhas(v.d2),
                                          fim: clampParteLinhas(v.fim),
                                        })
                                      }
                                      partesGuiasAtivas={partesGuiasAtivas}
                                      onToggleGuias={setPartesGuiasAtivas}
                                      onFolhaPartes={aplicarFolhaPartes}
                                      disabled={corrigindo}
                                    />
                                  </div>
                                  <RedacaoEsqueletoRail
                                    items={esqueletosParaEditor}
                                    activeId={esqueletoAtivoId}
                                    disabled={corrigindo}
                                    onLivre={() => setEsqueletoAtivoId(null)}
                                    onSelect={(item) => {
                                      if (!item?.corpo || corrigindo) return;
                                      if (String(transcribedText || '').trim()) {
                                        const ok =
                                          typeof window !== 'undefined'
                                            ? window.confirm('Substituir a transcrição pelo esqueleto selecionado?')
                                            : true;
                                        if (!ok) return;
                                      }
                                      setTranscribedText(item.corpo);
                                      setEsqueletoAtivoId(item.id);
                                      setPartesGuiasAtivas(false);
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {(redacaoInputMode === 'text' || uploadStatus === 'review') && (
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        {corrigindo ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                            <Loader2 size={14} className="animate-spin shrink-0" />
                            Gerando parecer…
                          </span>
                        ) : (
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Critérios da banca</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleCorrigir}
                        disabled={corrigindo || (redacaoInputMode === 'text' ? !redacaoText.trim() : !transcribedText.trim())}
                        className="btn-primary gap-1.5 rounded-xl px-5 py-3 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {corrigindo ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                        {corrigindo ? 'Corrigindo…' : 'Corrigir com IA'}
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {latestCorrection ? (
              <section className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                    Última correção
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    {formatRelativeTimePt(displaySnapshot?.at) || '—'}
                  </span>
                </div>

                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 md:p-8 xl:p-10 shadow-[0_25px_60px_-42px_rgba(15,23,42,0.35)]">
                  <div className="flex flex-col gap-6 border-b border-slate-100 pb-8 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        {displaySnapshot?.banca || 'CESPE / CEBRASPE'}
                      </span>
                      <h3 className="mt-4 text-2xl md:text-[2rem] font-semibold tracking-tight text-slate-900">
                        {displaySnapshot?.tema || 'Redação'}
                      </h3>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        {displaySnapshot
                          ? `${displaySnapshot.lines} linhas estimadas • ${displaySnapshot.paragraphs} parágrafos • critérios da banca`
                          : '—'}
                      </p>
                    </div>

                    <div className="rounded-[1.85rem] border border-emerald-100 bg-[linear-gradient(180deg,#ecfdf5_0%,#f8fffb_100%)] p-6 text-center shadow-sm md:min-w-[190px]">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-600">
                        Nota final
                      </span>
                      <div className="mt-2 flex items-end justify-center gap-1 text-emerald-600">
                        <span className="text-5xl font-semibold tracking-[-0.05em]">
                          {latestCorrection?.overallScore != null ? String(latestCorrection.overallScore) : '—'}
                        </span>
                        <span className="mb-1 text-lg font-bold opacity-60">/10</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
                    {criteriaEntries.map(({ key, label, scoreClass, barClass, criterion }) => {
                      const score = Number(criterion?.score || 0);
                      const maxScore = Number(criterion?.maxScore || 2.5);
                      const progress = maxScore > 0 ? Math.max(0, Math.min(100, (score / maxScore) * 100)) : 0;

                      return (
                        <CriterionBar
                          key={key}
                          label={criterion?.label || label}
                          score={`${score.toFixed(1)} / ${maxScore.toFixed(1)}`}
                          scoreClass={scoreClass}
                          barClass={barClass}
                          progress={progress}
                          note={criterion?.note || 'Sem observações adicionais.'}
                        />
                      );
                    })}
                  </div>

                  <div className="mt-8 overflow-hidden rounded-[2rem] border border-indigo-100 bg-[linear-gradient(180deg,rgba(238,242,255,0.7)_0%,rgba(255,255,255,1)_100%)]">
                    <div className="flex items-center justify-between gap-4 border-b border-indigo-100 px-6 py-5">
                      <div>
                        <h4 className="flex items-center gap-2 text-lg font-semibold text-indigo-950">
                          <BrainCircuit size={20} />
                          Análise do tutor IA
                        </h4>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Resumo, pontos fortes e ajustes objetivos.
                        </p>
                      </div>
                      <div className="hidden md:flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#1e40af] shadow-sm border border-indigo-100">
                        <Sparkles size={18} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 p-6 lg:grid-cols-3">
                      <FeedbackCard
                        title="Pontos fortes"
                        tone="emerald"
                        icon={ThumbsUp}
                        text={strengthsText || latestCorrection?.summary || 'Sem destaques adicionais no momento.'}
                      />

                      <FeedbackCard
                        title="Correção gramatical"
                        tone="red"
                        icon={Edit3}
                        custom
                        text={
                          grammarFeedbackItems.length > 0 ? (
                            <ul className="ml-2 list-disc space-y-1 text-sm font-medium leading-relaxed text-slate-700">
                              {grammarFeedbackItems.map((item) => (
                                <li key={item.id}>
                                  {item.excerpt ? <span className="line-through text-red-400">{item.excerpt}</span> : 'Trecho'}
                                  {item.replacement ? (
                                    <>
                                      {' '}→ <strong className="text-emerald-600">{item.replacement}</strong>
                                    </>
                                  ) : null}
                                  {item.reason ? ` ${item.reason}` : ''}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>{latestCorrection?.summary || 'Sem observações gramaticais registradas.'}</p>
                          )
                        }
                      />

                      <FeedbackCard
                        title="O que melhorar"
                        tone="amber"
                        icon={Target}
                        text={improvementsText || 'Nenhum ponto crítico adicional foi retornado.'}
                      />
                    </div>

                    <div className="flex justify-end border-t border-indigo-100 px-6 py-5">
                      <button
                        type="button"
                        onClick={() => typeof window !== 'undefined' && window.print()}
                        className="btn-secondary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm"
                      >
                        <Printer size={16} />
                        Imprimir correção
                      </button>
                    </div>
                  </div>
                </div>
              </section>
              ) : null}
            </>
          )}

          {redacaoInnerTab === 'temas' && (
            <section className="animate-in fade-in zoom-in-95 duration-300 flex flex-col gap-6">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_-42px_rgba(15,23,42,0.35)]">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_250px]">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="search"
                      value={temaBankQuery}
                      onChange={(e) => setTemaBankQuery(e.target.value)}
                      placeholder="Procurar tema de redação..."
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                    />
                  </div>

                  <select
                    value={temaBankEixo}
                    onChange={(e) => setTemaBankEixo(e.target.value)}
                    className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-600 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                  >
                    {REDACAO_EIXO_FILTERS.map((opt) => (
                      <option key={opt.id || 'all'} value={opt.id}>
                        {opt.id ? `Eixo: ${opt.label}` : opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {temasFiltrados.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
                  <List className="mx-auto text-slate-300" size={36} strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-semibold text-slate-700">Nenhum tema com esses filtros</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-slate-500">
                    Limpe a busca ou escolha outro eixo para ver sugestões do banco.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTemaBankQuery('');
                      setTemaBankEixo('');
                    }}
                    className="btn-secondary mt-5 rounded-xl px-4 py-2 text-sm font-semibold"
                  >
                    Limpar filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {temasFiltrados.map((temaItem) => {
                    const tc = eixoTagClasses(temaItem.eixo);
                    const eixoLabel =
                      REDACAO_EIXO_FILTERS.find((f) => f.id === temaItem.eixo)?.label || temaItem.eixo;
                    return (
                      <ThemeCard
                        key={temaItem.id}
                        tags={[
                          { label: eixoLabel, className: tc.axis },
                          { label: temaItem.banca, className: tc.banca },
                        ]}
                        title={temaItem.title}
                        description={temaItem.description}
                        onClick={() => aplicarTemaDoBanco(temaItem)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {redacaoInnerTab === 'dicas' && (
            <section className="pl-card animate-in fade-in zoom-in-95 duration-300 p-5 md:p-7">
              <RedacaoDicasKitPanel bundle={kitBundle} expertTips={expertCatalog} onOpenExpert={setExpertModalTip} />
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <SidebarCard
            eyebrow="Resumo da área"
            title="Painel rápido"
            description="Métricas do seu histórico de redações, alinhadas ao que a IA já corrigiu."
          >
            <div className="space-y-1">
              <SidebarStat label="No histórico" value={String(summary.total)} helper="textos salvos" />
              <SidebarStat
                label="Melhor nota"
                value={summary.bestScore ? String(summary.bestScore).replace('.', ',') : '—'}
                helper="/10"
              />
              <SidebarStat
                label="Tema mais repetido"
                value={
                  summary.topTheme
                    ? summary.topTheme.length > 22
                      ? `${summary.topTheme.slice(0, 22)}…`
                      : summary.topTheme
                    : '—'
                }
                helper={summary.topThemeCount ? `${summary.topThemeCount} treino(s)` : '—'}
              />
            </div>
          </SidebarCard>

          <SidebarCard
            eyebrow="Histórico"
            title="Últimas redações"
            description="Abra no editor para revisar o texto ou excluir itens que não precisa mais guardar."
          >
            {historicoRecente.length === 0 ? (
              <p className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs font-medium text-slate-500">
                Nada salvo ainda. Corrija uma redação para ver o histórico aqui.
              </p>
            ) : (
              <ul className="space-y-2">
                {historicoRecente.map((item) => {
                  const temaShort =
                    item.tema && item.tema.length > 40 ? `${item.tema.slice(0, 40)}…` : item.tema || 'Sem tema';
                  const nota =
                    item.correction?.overallScore != null
                      ? `${String(item.correction.overallScore).replace('.', ',')}/10`
                      : item.status === 'corrected'
                        ? '—'
                        : 'Rascunho';
                  return (
                    <li
                      key={item.id}
                      className="rounded-[1.15rem] border border-slate-100 bg-slate-50/90 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-snug text-slate-800">{temaShort}</p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {nota} · {formatRelativeTimePt(item.updated_at || item.created_at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => openRedacaoInEditor(item)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 transition hover:border-blue-200 hover:bg-blue-50"
                          >
                            Abrir
                          </button>
                          {onDeleteRedacao ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteRedacao(item)}
                              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                              aria-label="Excluir redação"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SidebarCard>

          <SidebarCard
            eyebrow="Foco da semana"
            title="Prioridade"
            description="Quando a banca pedir proposta de intervenção, quem faz o quê e para quê pesa muito na nota."
          >
            <div className="rounded-[1.35rem] border border-amber-100 bg-amber-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-600">
                Ajuste crítico
              </p>
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-700">
                Detalhar agente, ação e finalidade costuma valer mais que adornar o primeiro parágrafo.
              </p>
            </div>
          </SidebarCard>
        </aside>
      </div>

      {expertModalTip ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            aria-label="Fechar"
            onClick={() => setExpertModalTip(null)}
          />
          <div className="relative z-10 flex max-h-[min(88vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <h3 className="pr-8 text-base font-semibold text-slate-900">{expertModalTip.title}</h3>
              <button
                type="button"
                onClick={() => setExpertModalTip(null)}
                className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4 sm:px-5">
              <pre className="whitespace-pre-wrap font-sans text-sm font-medium leading-relaxed text-slate-700">
                {expertModalTip.body || 'Sem conteúdo cadastrado.'}
              </pre>
            </div>
          </div>
        </div>
      ) : null}

      {bancaHelpOpen ? (
        <div className="fixed inset-0 z-[92] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            aria-label="Fechar"
            onClick={() => setBancaHelpOpen(false)}
          />
          <div className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Parâmetros por banca</h3>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  Estilo de cobrança, checklist e um exemplo nível prova (~25–30 linhas).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBancaHelpOpen(false)}
                className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
            <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2">
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {REDACAO_BANCA_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBancaHelpTab(opt.value)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                      bancaHelpTab === opt.value
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-800'
                    }`}
                  >
                    {opt.value === 'CESPE / CEBRASPE' ? 'CEBRASPE' : opt.value}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {(() => {
                const g = REDACAO_BANCA_GUIDES[bancaHelpTab];
                if (!g) {
                  return <p className="text-sm font-medium text-slate-500">Sem guia para esta banca.</p>;
                }
                return (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Estilo</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{g.estilo}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">O que costuma pesar</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-medium leading-relaxed text-slate-700">
                        {g.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Resumo</p>
                      <p className="mt-1 text-sm font-bold text-emerald-950">{g.resumo}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Exemplo nível prova</p>
                      <pre className="mt-2 max-h-[min(38vh,280px)] overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 font-sans text-[13px] font-medium leading-relaxed text-slate-700">
                        {g.exemplo}
                      </pre>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Comparação rápida e estratégia</p>
              <pre className="mt-1.5 max-h-[28vh] overflow-y-auto whitespace-pre-wrap font-sans text-[11px] font-semibold leading-relaxed text-slate-600">
                {COMPARACAO_BANCAS}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PremiumTabButton({ active, onClick, icon: Icon, label, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-[1rem] px-4 ${compact ? 'py-3' : 'py-3.5'} text-sm font-semibold transition-all ${
        active
          ? 'bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] text-white shadow-[0_16px_35px_-22px_rgba(37,99,235,0.7)]'
          : 'text-slate-500 hover:bg-white hover:text-slate-900'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function FieldBlock({ label, action, children }) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center justify-between gap-1.5 px-1">
        <label className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}

function CriterionBar({ label, score, scoreClass, barClass, note, progress }) {
  return (
    <div className="rounded-[1.45rem] border border-slate-100 bg-slate-50/80 p-4">
      <div className="mb-2 flex justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">
        <span>{label}</span>
        <span className={scoreClass}>{score}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70">
        <div className={`h-full rounded-full ${barClass}`} style={progress != null ? { width: `${progress}%` } : undefined} />
      </div>
      <p className="mt-2 text-[11px] font-semibold text-slate-400">{note}</p>
    </div>
  );
}

function FeedbackCard({ title, tone, icon: Icon, text, custom = false }) {
  const toneClasses = {
    emerald: 'border-emerald-100 bg-emerald-50/70 text-emerald-600',
    red: 'border-red-100 bg-red-50/70 text-red-600',
    amber: 'border-amber-100 bg-amber-50/70 text-amber-600',
  };

  return (
    <div className={`rounded-[1.55rem] border p-5 ${toneClasses[tone]}`}>
      <h5 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em]">
        <Icon size={15} />
        {title}
      </h5>
      <div className="mt-4 text-sm leading-relaxed text-slate-700 font-medium">
        {custom ? text : <p>{text}</p>}
      </div>
    </div>
  );
}

function ThemeCard({ tags, title, description, onClick }) {
  return (
    <div className="group flex flex-col rounded-[1.9rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-1 hover:shadow-[0_25px_60px_-34px_rgba(37,99,235,0.3)]">
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.label}
            className={`rounded-lg px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] ${tag.className}`}
          >
            {tag.label}
          </span>
        ))}
      </div>

      <h4 className="text-xl font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-[#1e40af] line-clamp-2">
        {title}
      </h4>

      <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-slate-500 line-clamp-3">
        {description}
      </p>

      <button
        type="button"
        onClick={onClick}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-indigo-100 bg-[#eef2ff] px-4 py-3.5 text-sm font-semibold text-[#1e40af] transition hover:bg-[linear-gradient(135deg,#312e81_0%,#2563eb_100%)] hover:text-white"
      >
        Escrever sobre este tema
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

function SidebarCard({ eyebrow, title, description, children }) {
  return (
    <div className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function SidebarStat({ label, value, helper }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-slate-100 bg-slate-50 px-4 py-3.5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
      </div>
      <div className="text-lg font-semibold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}
