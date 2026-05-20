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
  FileText,
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

const REDACAO_EDITOR_LINE_PX = 28;
const REDACAO_EDITOR_LINE_MIN = 20;
const REDACAO_EDITOR_LINE_MAX = 30;
const REDACAO_CHARS_PER_LINE_REF = 72;

const REDACAO_PARTES_PRESETS = [
  { id: '5-8-8-5', label: '5·8·8·5', v: { intro: 5, d1: 8, d2: 8, fim: 5 } },
  { id: '4-7-7-4', label: '4·7·7·4', v: { intro: 4, d1: 7, d2: 7, fim: 4 } },
];

const REDACAO_EIXO_FILTERS = [
  { id: '', label: 'Todos os eixos' },
  { id: 'seguranca', label: 'Segurança pública' },
  { id: 'meio-ambiente', label: 'Meio ambiente' },
  { id: 'tecnologia', label: 'Tecnologia' },
  { id: 'sociedade', label: 'Sociedade e políticas' },
  { id: 'educacao', label: 'Educação' },
];

function clampParteLinhas(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 3;
  return Math.min(20, Math.max(2, Math.round(x)));
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

function eixoTagClass(eixo) {
  switch (eixo) {
    case 'seguranca':       return 'pl-tag pl-tag-eixo-seguranca';
    case 'tecnologia':      return 'pl-tag pl-tag-eixo-tecnologia';
    case 'meio-ambiente':   return 'pl-tag pl-tag-eixo-meio-ambiente';
    case 'sociedade':       return 'pl-tag pl-tag-eixo-sociedade';
    case 'educacao':        return 'pl-tag pl-tag-eixo-educacao';
    default:                return 'pl-tag';
  }
}

/* ════════════════════════════════════════════════
   Folha: gutter de números + barras de partes
   ════════════════════════════════════════════════ */
function FolhaGutter({ lines }) {
  const total = Math.max(REDACAO_EDITOR_LINE_MIN, Math.min(lines, REDACAO_EDITOR_LINE_MAX + 6));
  const text = useMemo(() => {
    const out = [];
    for (let i = 1; i <= total; i++) out.push(String(i).padStart(2, '0'));
    return out.join('\n');
  }, [total]);
  return <div className="pl-folha-gutter" aria-hidden>{text}</div>;
}

function FolhaPartesBars({ partes, linePx, visible }) {
  if (!visible) return null;
  const blocks = [
    { key: 'intro', label: 'Intro', cls: 'intro', n: partes.intro },
    { key: 'd1',    label: 'Dev 1', cls: 'd1',    n: partes.d1 },
    { key: 'd2',    label: 'Dev 2', cls: 'd2',    n: partes.d2 },
    { key: 'fim',   label: 'Fim',   cls: 'fim',   n: partes.fim },
  ];
  return (
    <div className="pl-folha-partes" aria-hidden>
      {blocks.map((b) => (
        <div key={b.key} className={`seg-block ${b.cls}`} style={{ height: b.n * linePx - 4, marginBottom: 4 }}>
          <span className="lbl">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════
   Aside: Partes · linhas
   ════════════════════════════════════════════════ */
function PartesGuiasPanel({
  partesLinhas, onChangeParte, onPreset,
  partesGuiasAtivas, onToggleGuias, onFolhaPartes,
  disabled,
}) {
  const row = (key, short) => (
    <React.Fragment key={key}>
      <span className="k">{short}</span>
      <input
        type="number" min={2} max={20}
        value={partesLinhas[key]} disabled={disabled}
        onChange={(e) => onChangeParte(key, e.target.value)}
      />
    </React.Fragment>
  );
  return (
    <div>
      <p className="ttl">Partes · linhas</p>
      <div className="pl-partes-grid">
        {row('intro', 'Int')}
        {row('d1', 'D1')}
        {row('d2', 'D2')}
        {row('fim', 'Fim')}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {REDACAO_PARTES_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onPreset(p.v)}
            className="pl-preset-btn"
          >
            {p.label}
          </button>
        ))}
      </div>
      <label className="pl-toggle-row" style={{ marginTop: 10 }}>
        <input
          type="checkbox"
          checked={partesGuiasAtivas}
          disabled={disabled}
          onChange={(e) => onToggleGuias(e.target.checked)}
        />
        Setas na margem
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={onFolhaPartes}
        className="pl-folha-vazia-btn"
        style={{ marginTop: 10 }}
      >
        <FileText size={13} />
        Folha vazia + guias
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════
   Aside: Esqueleto
   ════════════════════════════════════════════════ */
function EsqueletoRail({ items, activeId, onSelect, onLivre, disabled }) {
  return (
    <div>
      <p className="ttl">Esqueleto</p>
      <div className="pl-esq-list">
        <button
          type="button"
          disabled={disabled}
          onClick={onLivre}
          className={`pl-esq-btn livre ${activeId == null ? 'active' : ''}`}
        >
          <span className="num">∅</span>
          <span className="ttl">Livre</span>
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
              className={`pl-esq-btn ${active ? 'active' : ''}`}
            >
              <span className="num">{n}</span>
              <span className="ttl">{item.titulo}</span>
            </button>
          );
        })}
      </div>
      <p className="pl-aside-foot">4+7+7+4 linhas + faixas. Est. 15–20 min.</p>
    </div>
  );
}

/* ════════════════════════════════════════════════
   Componente principal
   ════════════════════════════════════════════════ */
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
  const [correcaoErr, setCorrecaoErr] = useState('');
  const [corrigindo, setCorrigindo] = useState(false);
  const [correcaoResult, setCorrecaoResult] = useState(null);
  const [temaBankQuery, setTemaBankQuery] = useState('');
  const [temaBankEixo, setTemaBankEixo] = useState('');
  const [esqueletoAtivoId, setEsqueletoAtivoId] = useState(null);
  const [partesLinhas, setPartesLinhas] = useState({ intro: 5, d1: 8, d2: 8, fim: 5 });
  const [partesGuiasAtivas, setPartesGuiasAtivas] = useState(false);
  const fileInputRef = useRef(null);

  /* ─── Handlers (idênticos ao original) ─── */
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
    if (!text.trim()) {
      setCorrecaoErr(
        redacaoInputMode === 'upload'
          ? 'Revise a transcrição antes de pedir a correção com IA.'
          : 'Escreva ou cole sua redação antes de pedir a correção com IA.'
      );
      return;
    }
    setCorrigindo(true);
    setCorrecaoResult(null);
    setCorrecaoErr('');
    try {
      const correction = await analyzeRedacaoWithRealAI({ text, tema: redacaoTema, banca: redacaoBanca });
      setCorrecaoResult(correction);
      try {
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
      } catch (saveErr) {
        setCorrecaoErr(String(saveErr?.message || 'A IA gerou o parecer, mas não consegui salvar o histórico agora. Copie o feedback antes de sair da tela.'));
      }
    } catch (err) {
      setCorrecaoErr(String(err?.message || 'Servidor de IA indisponível. Tente novamente em alguns instantes.'));
    } finally {
      setCorrigindo(false);
    }
  };

  const aplicarTemaDoBanco = (temaItem) => {
    if (!temaItem?.title) return;
    const bancaMap = {
      CESPE: 'CESPE / CEBRASPE', FCC: 'FCC', FGV: 'FGV',
      VUNESP: 'VUNESP', IBFC: 'IBFC', AOCP: 'AOCP', IDECAN: 'IDECAN',
    };
    setRedacaoTema(temaItem.title);
    const nextBanca = bancaMap[temaItem.banca] || temaItem.banca || 'CESPE / CEBRASPE';
    const valid = REDACAO_BANCA_OPTIONS.some((o) => o.value === nextBanca);
    setRedacaoBanca(valid ? nextBanca : 'CESPE / CEBRASPE');
    setRedacaoInnerTab('correcao');
    setUploadStatus('idle');
  };

  const themeBankResolved = useMemo(
    () => (Array.isArray(redacaoThemeBankOverride) && redacaoThemeBankOverride.length > 0
      ? redacaoThemeBankOverride
      : REDACAO_THEME_BANK_DEFAULT),
    [redacaoThemeBankOverride]
  );

  const kitBundle = useMemo(() => mergeRedacaoKitBundle(redacaoKitOverride), [redacaoKitOverride]);

  const esqueletosParaEditor = useMemo(() => {
    const m = kitBundle?.modelos;
    if (Array.isArray(m) && m.length > 0) {
      const rows = m.map((x, i) => {
        const corpo = String(x?.corpo || '').trim();
        if (!corpo) return null;
        return {
          id: String(x.id || `esq-${i}`),
          shortLabel: String(i + 1),
          titulo: String(x.titulo || '').replace(/^🧱\s*/, '').trim() || `Modelo ${i + 1}`,
          badge: x.badge,
          corpo,
        };
      }).filter(Boolean);
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
        const ok = typeof window !== 'undefined' ? window.confirm('Substituir o texto atual pela folha vazia com guias?') : true;
        if (!ok) return;
      }
      setTranscribedText(empty);
    } else {
      if (String(redacaoText || '').trim()) {
        const ok = typeof window !== 'undefined' ? window.confirm('Substituir o texto atual pela folha vazia com guias?') : true;
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
    setCorrecaoErr('');
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
    } catch { /* erro tratado no App */ }
  };

  /* ─── Derivados ─── */
  const summary = useMemo(() => ({
    total: redacaoSummary?.total ?? 0,
    corrected: redacaoSummary?.corrected ?? 0,
    drafts: redacaoSummary?.drafts ?? 0,
    avgScore: redacaoSummary?.averageScore ?? 0,
    bestScore: redacaoSummary?.bestScore ?? 0,
    topTheme: redacaoSummary?.topTheme ?? '',
    topThemeCount: redacaoSummary?.topThemeCount ?? 0,
  }), [redacaoSummary]);

  const textoCorrente = redacaoInputMode === 'upload' ? transcribedText : redacaoText;
  const canCorrigirRedacao = String(textoCorrente || '').trim().length > 0;
  const linhasTexto = useMemo(() => {
    const t = String(textoCorrente || '');
    if (!t.trim()) return 0;
    return t.split(/\r?\n/).length;
  }, [textoCorrente]);

  const linhasCorpo = useMemo(() => {
    if (!String(textoCorrente || '').trim()) return REDACAO_EDITOR_LINE_MIN;
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
    return list
      .filter((item) => item?.correction)
      .sort((a, b) => {
        const ta = new Date(a.corrected_at || a.updated_at || 0).getTime();
        const tb = new Date(b.corrected_at || b.updated_at || 0).getTime();
        return tb - ta;
      })[0] || null;
  }, [redacoes]);

  const latestCorrection = correcaoResult || latestEssay?.correction || null;
  const draftText = redacaoInputMode === 'upload' ? transcribedText : redacaoText;

  const displaySnapshot = useMemo(() => {
    if (correcaoResult) {
      const t = draftText;
      const lines = t.split('\n').filter((line) => line.trim()).length || 0;
      const paragraphs = t.split(/\n\s*\n/).filter((line) => line.trim()).length || 0;
      return { tema: redacaoTema.trim() || 'Correção atual', banca: redacaoBanca, lines, paragraphs, at: correcaoResult.analyzedAt };
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

  const criteriaEntries = latestCorrection ? [
    { key: 'gramatica', label: 'Gramática', color: 'var(--pl-danger)' },
    { key: 'coesao',    label: 'Coesão',    color: 'var(--pl-success)' },
    { key: 'tema',      label: 'Tema',      color: 'var(--pl-accent)' },
    { key: 'estrutura', label: 'Estrutura', color: 'var(--pl-warn)' },
  ].map((item) => ({ ...item, criterion: latestCorrection.criteria?.[item.key] || null })) : [];

  const strengthsText = latestCorrection?.strengths?.join(' ') || latestCorrection?.summary || '';
  const improvementsText = latestCorrection?.improvements?.join(' ') || '';
  const priorityFixes = latestCorrection?.priorityFixes || [];
  const actionPlan = latestCorrection?.actionPlan || [];
  const grammarFeedbackItems = latestCorrection?.grammarFeedback?.slice(0, 3) || [];

  const expertCatalog = useMemo(
    () => (Array.isArray(redacaoExpertTips) ? redacaoExpertTips : []).filter((t) => t?.title),
    [redacaoExpertTips]
  );

  /* ════════════════════════════════════════════════
     Render
     ════════════════════════════════════════════════ */
  const renderFolhaEditor = (mode) => {
    const value = mode === 'upload' ? transcribedText : redacaoText;
    const setValue = mode === 'upload' ? setTranscribedText : setRedacaoText;
    const onSelectEsqueleto = (item) => {
      if (!item?.corpo || corrigindo) return;
      if (String(value || '').trim()) {
        const ok = typeof window !== 'undefined'
          ? window.confirm(mode === 'upload'
              ? 'Substituir a transcrição pelo esqueleto selecionado?'
              : 'Substituir o texto atual pelo esqueleto selecionado?')
          : true;
        if (!ok) return;
      }
      setValue(item.corpo);
      setEsqueletoAtivoId(item.id);
      setPartesGuiasAtivas(false);
    };

    return (
      <div className="pl-editor-wrap">
        <div className="pl-editor-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="lab">{mode === 'upload' ? 'Transcrição' : 'Sua redação'}</span>
            {esqueletoAtivoId ? (
              <span className="pl-tag pl-tag-accent">
                {esqueletosParaEditor.find((e) => e.id === esqueletoAtivoId)?.titulo || 'Esqueleto'}
              </span>
            ) : null}
          </div>
          <div className="pl-editor-meta">
            <span className="strong">{linhasTexto} linha{linhasTexto === 1 ? '' : 's'}</span>
            <span className="sep">·</span>
            <span>Pauta mín. {REDACAO_EDITOR_LINE_MIN} · até {REDACAO_EDITOR_LINE_MAX} linhas (ref.)</span>
            <span className="sep">·</span>
            <span>~{REDACAO_CHARS_PER_LINE_REF} chars/linha</span>
          </div>
        </div>

        <div className="pl-folha-stage">
          <div className="pl-folha" style={{ minHeight: innerMinHeightPx + 44 }}>
            <div className="pl-folha-fold" />
            <FolhaGutter lines={linhasCorpo} />
            <FolhaPartesBars partes={partesLinhas} linePx={REDACAO_EDITOR_LINE_PX} visible={partesGuiasAtivas} />
            <textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (correcaoErr) setCorrecaoErr('');
              }}
              placeholder={mode === 'upload' ? 'Revise a transcrição da redação…' : 'Escreva ou cole a sua redação aqui…'}
              className="pl-folha-input"
              style={{ minHeight: innerMinHeightPx }}
              spellCheck
              disabled={corrigindo}
            />
          </div>
        </div>

        <aside className="pl-editor-aside">
          <PartesGuiasPanel
            partesLinhas={partesLinhas}
            onChangeParte={handleParteLinhaChange}
            onPreset={(v) => setPartesLinhas({
              intro: clampParteLinhas(v.intro),
              d1: clampParteLinhas(v.d1),
              d2: clampParteLinhas(v.d2),
              fim: clampParteLinhas(v.fim),
            })}
            partesGuiasAtivas={partesGuiasAtivas}
            onToggleGuias={setPartesGuiasAtivas}
            onFolhaPartes={aplicarFolhaPartes}
            disabled={corrigindo}
          />
          <EsqueletoRail
            items={esqueletosParaEditor}
            activeId={esqueletoAtivoId}
            disabled={corrigindo}
            onLivre={() => setEsqueletoAtivoId(null)}
            onSelect={onSelectEsqueleto}
          />
        </aside>
      </div>
    );
  };

  return (
    <div className="pl-app pl-paper-bg-soft pl-redacao-shell">
      {/* ═══ Hero editorial ═══ */}
      <header className="pl-hero-editorial">
        <div>
          <div className="lede-row">
            <div className="pl-hero-icon">
              <FileSignature size={18} strokeWidth={1.75} />
            </div>
            <span className="pl-eyebrow">OCR · Parecer por banca</span>
          </div>
          <h1>Correção de redações<span className="dot">.</span></h1>
          <p className="subtitle">
            Envio por foto ou texto, correção assistida por IA e histórico das suas folhas — tudo no mesmo lugar.
          </p>
        </div>
        <div className="meta">
          <span>Banca · Tema · Esqueleto<br />Foto/texto · Parecer por IA</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setRedacaoInnerTab('temas')}
              className="pl-btn"
            >
              <List size={14} /> Banco de temas
            </button>
            <button
              type="button"
              onClick={() => setRedacaoInnerTab('correcao')}
              className="pl-btn pl-btn-primary"
            >
              <PenTool size={14} /> Nova correção
            </button>
          </div>
        </div>
      </header>

      {/* ═══ KPI strip ═══ */}
      <div className="pl-kpi-strip">
        <div className="pl-kpi">
          <span className="lab"><BrainCircuit size={12} /> Corrigidas</span>
          <span className="val">{summary.corrected}</span>
          <span className="sub">parecer de IA emitido</span>
        </div>
        <div className="pl-kpi success">
          <span className="lab"><Percent size={12} /> Média</span>
          <span className="val">
            {summary.avgScore ? String(summary.avgScore).replace('.', ',') : '—'}
            {summary.avgScore ? <span style={{ fontSize: 18, color: 'var(--pl-ink-3)' }}>/10</span> : null}
          </span>
          <span className="sub">por correção</span>
        </div>
        <div className="pl-kpi warn">
          <span className="lab"><Trophy size={12} /> Melhor</span>
          <span className="val">
            {summary.bestScore ? String(summary.bestScore).replace('.', ',') : '—'}
            {summary.bestScore ? <span style={{ fontSize: 18, color: 'var(--pl-ink-3)' }}>/10</span> : null}
          </span>
          <span className="sub">nota recorde</span>
        </div>
        <div className="pl-kpi accent">
          <span className="lab"><Library size={12} /> Histórico</span>
          <span className="val">
            {summary.total}
            <span style={{ fontSize: 18, color: 'var(--pl-ink-3)' }}> · {summary.drafts} rasc.</span>
          </span>
          <span className="sub">redações salvas</span>
        </div>
      </div>

      {/* ═══ Layout 2-col ═══ */}
      <div className="pl-redacao-layout">
        <main style={{ minWidth: 0 }}>
          {/* Tabs */}
          <nav className="pl-tabs">
            <button
              type="button"
              onClick={() => setRedacaoInnerTab('correcao')}
              className={`pl-tab ${redacaoInnerTab === 'correcao' ? 'active' : ''}`}
            >
              <PenTool /> Nova correção
            </button>
            <button
              type="button"
              onClick={() => setRedacaoInnerTab('temas')}
              className={`pl-tab ${redacaoInnerTab === 'temas' ? 'active' : ''}`}
            >
              <List /> Banco de temas
            </button>
            <button
              type="button"
              onClick={() => setRedacaoInnerTab('dicas')}
              className={`pl-tab ${redacaoInnerTab === 'dicas' ? 'active' : ''}`}
            >
              <Lightbulb /> Dicas de especialista
            </button>
          </nav>

          {/* ─── Tab: Nova correção ─── */}
          {redacaoInnerTab === 'correcao' && (
            <>
              <section className="pl-card" style={{ padding: '24px 28px 28px' }}>
                <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--pl-rule)', marginBottom: 18 }}>
                  <h2 style={{
                    margin: 0, marginBottom: 4,
                    fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
                    fontSize: 26, letterSpacing: '-0.025em', color: 'var(--pl-ink)', lineHeight: 1.15,
                  }}>
                    Nova correção
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                    Escolha a banca, digite ou envie o texto e corrija com IA. Dicas por banca no ícone de ajuda (?).
                  </p>
                </div>

                {/* Banca */}
                <div style={{ marginBottom: 16 }}>
                  <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Banca avaliadora</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={redacaoBanca}
                      onChange={(e) => setRedacaoBanca(e.target.value)}
                      className="pl-input"
                      style={{ maxWidth: 520, fontWeight: 600 }}
                    >
                      {REDACAO_BANCA_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      title="O que esta banca costuma cobrar"
                      onClick={() => { setBancaHelpTab(redacaoBanca); setBancaHelpOpen(true); }}
                      className="pl-help-btn"
                      aria-label="Parâmetros da banca"
                    >
                      <CircleHelp size={16} />
                    </button>
                  </div>
                </div>

                {/* Mode toggle */}
                <div className="pl-seg" style={{ marginBottom: 18 }}>
                  <button
                    type="button"
                    onClick={() => { setRedacaoInputMode('text'); setUploadStatus('idle'); setCorrecaoErr(''); }}
                    className={`pl-seg-btn ${redacaoInputMode === 'text' ? 'active' : ''}`}
                  >
                    <Type size={14} /> Digitar texto
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRedacaoInputMode('upload'); setCorrecaoErr(''); }}
                    className={`pl-seg-btn ${redacaoInputMode === 'upload' ? 'active' : ''}`}
                  >
                    <Camera size={14} /> Enviar foto / PDF
                  </button>
                </div>

                {/* Editor / Upload */}
                {redacaoInputMode === 'text' ? (
                  renderFolhaEditor('text')
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => handlePhotoUpload(e.target.files?.[0] || null)}
                    />
                    {uploadErr && (
                      <div style={{
                        marginBottom: 12, padding: '12px 16px',
                        background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)',
                        border: '1px solid rgba(185,28,28,0.25)', borderRadius: 6,
                        fontSize: 13, fontWeight: 600,
                      }}>{uploadErr}</div>
                    )}
                    {uploadStatus === 'idle' && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          width: '100%', minHeight: 240,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: 10, padding: 32,
                          background: 'var(--pl-bg-soft)',
                          border: '2px dashed var(--pl-rule-strong)', borderRadius: 6,
                          cursor: 'pointer', textAlign: 'center',
                        }}
                      >
                        <div style={{
                          width: 48, height: 48, borderRadius: 999,
                          background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)',
                          color: 'var(--pl-accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: 'var(--pl-sh-low)',
                        }}>
                          <UploadCloud size={22} />
                        </div>
                        <h4 style={{
                          margin: 0,
                          fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
                          fontSize: 20, letterSpacing: '-0.025em', color: 'var(--pl-ink)',
                        }}>
                          Anexar foto ou PDF da redação
                        </h4>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                          JPG, PNG ou PDF. Depois você revisa a transcrição antes da correção.
                        </p>
                      </button>
                    )}

                    {uploadStatus === 'loading' && (
                      <div style={{
                        minHeight: 240, padding: 32,
                        background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule-2)', borderRadius: 6,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                      }}>
                        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--pl-accent)' }} />
                        <p className="pl-eyebrow">Lendo anexo</p>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                          Aguarde alguns segundos.
                        </p>
                      </div>
                    )}

                    {uploadStatus === 'review' && (
                      <>
                        <div style={{
                          marginBottom: 12, padding: '10px 14px',
                          background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)',
                          border: '1px solid rgba(180,83,9,0.25)', borderLeft: '3px solid var(--pl-warn)',
                          borderRadius: 4, fontSize: 12.5, fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <AlertTriangle size={14} /> Confira a transcrição antes de corrigir.
                        </div>
                        {renderFolhaEditor('upload')}
                      </>
                    )}
                  </div>
                )}

                {/* Corrigir row */}
                {(redacaoInputMode === 'text' || uploadStatus === 'review') && (
                  <div style={{
                    marginTop: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
                  }}>
                    <div className="pl-eyebrow">
                      {corrigindo ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--pl-accent)' }}>
                          <Loader2 size={14} className="animate-spin" /> Gerando parecer…
                        </span>
                      ) : 'Critérios da banca'}
                    </div>
                    <button
                      type="button"
                      onClick={handleCorrigir}
                      disabled={corrigindo}
                      aria-disabled={!canCorrigirRedacao}
                      title={canCorrigirRedacao ? 'Corrigir redação com IA' : 'Escreva ou cole a redação primeiro'}
                      className="pl-btn pl-btn-ai pl-btn-lg"
                      style={{ opacity: canCorrigirRedacao ? 1 : 0.7 }}
                    >
                      {corrigindo ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                      {corrigindo ? 'Corrigindo…' : 'Corrigir com IA'}
                    </button>
                  </div>
                )}

                {(redacaoInputMode === 'text' || uploadStatus === 'review') && !canCorrigirRedacao && !corrigindo && (
                  <div className="pl-warn-callout">
                    <AlertTriangle />
                    <span>Escreva, cole ou revise a transcrição da redação para liberar a correção com IA.</span>
                  </div>
                )}

                {correcaoErr && (
                  <div
                    role="alert"
                    style={{
                      marginTop: 12, padding: '12px 16px',
                      background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)',
                      border: '1px solid rgba(185,28,28,0.25)', borderLeft: '3px solid var(--pl-danger)',
                      borderRadius: 4, fontSize: 13, fontWeight: 600,
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                    }}
                  >
                    <AlertTriangle size={16} style={{ flex: '0 0 16px', marginTop: 1 }} />
                    <span>{correcaoErr}</span>
                  </div>
                )}
              </section>

              {/* Última correção */}
              {latestCorrection && (
                <section style={{ marginTop: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <p className="pl-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--pl-success)' }} /> Última correção
                    </p>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
                      {formatRelativeTimePt(displaySnapshot?.at) || '—'}
                    </span>
                  </div>

                  <div className="pl-card" style={{ padding: '24px 28px', boxShadow: 'var(--pl-sh-low)' }}>
                    {/* Cabeçalho com nota */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 24,
                      paddingBottom: 18, borderBottom: '1px solid var(--pl-rule)',
                      alignItems: 'center',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <span className="pl-tag" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                          {displaySnapshot?.banca || 'CESPE / CEBRASPE'}
                        </span>
                        <h3 style={{
                          margin: '12px 0 6px',
                          fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
                          fontSize: 32, letterSpacing: '-0.03em', color: 'var(--pl-ink)', lineHeight: 1.1,
                        }}>
                          {displaySnapshot?.tema || 'Redação'}
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                          {displaySnapshot ? `${displaySnapshot.lines} linhas · ${displaySnapshot.paragraphs} parágrafos · critérios da banca` : '—'}
                        </p>
                      </div>
                      <div style={{
                        padding: '14px 22px',
                        background: 'var(--pl-success-soft)',
                        border: '1px solid rgba(77,124,63,0.30)',
                        borderRadius: 6, textAlign: 'center', minWidth: 160,
                      }}>
                        <p className="pl-eyebrow" style={{ color: 'var(--pl-success)' }}>Nota final</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginTop: 6 }}>
                          <span className="pl-num" style={{ fontSize: 56, color: 'var(--pl-success)' }}>
                            {latestCorrection?.overallScore != null ? String(latestCorrection.overallScore) : '—'}
                          </span>
                          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--pl-success)', opacity: 0.6 }}>/10</span>
                        </div>
                      </div>
                    </div>

                    {/* Critérios */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
                      marginTop: 18,
                    }}>
                      {criteriaEntries.map(({ key, label, color, criterion }) => {
                        const score = Number(criterion?.score || 0);
                        const maxScore = Number(criterion?.maxScore || 2.5);
                        const progress = maxScore > 0 ? Math.max(0, Math.min(100, (score / maxScore) * 100)) : 0;
                        return (
                          <div key={key} className="pl-card-paper" style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                              <span className="pl-eyebrow">{criterion?.label || label}</span>
                              <span className="pl-num" style={{ fontSize: 18, color }}>
                                {score.toFixed(1)}<span style={{ fontSize: 11, color: 'var(--pl-ink-4)' }}>/{maxScore.toFixed(1)}</span>
                              </span>
                            </div>
                            <div className="pl-progress">
                              <div className="fill" style={{ width: `${progress}%`, background: color }} />
                            </div>
                            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.5 }}>
                              {criterion?.note || 'Sem observações adicionais.'}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bloco IA: pontos fortes / gramática / melhorar */}
                    <div style={{
                      marginTop: 20,
                      border: '1px solid transparent', borderRadius: 6,
                      backgroundImage: 'linear-gradient(var(--pl-surface), var(--pl-surface)), linear-gradient(135deg, #1d4ed8 0%, #6366f1 50%, #1d4ed8 100%)',
                      backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 22px', borderBottom: '1px solid var(--pl-rule)',
                      }}>
                        <div>
                          <h4 style={{
                            margin: 0,
                            fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
                            fontSize: 22, letterSpacing: '-0.025em', color: 'var(--pl-ink)',
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                          }}>
                            <BrainCircuit size={18} style={{ color: '#4338ca' }} />
                            Análise do tutor IA
                          </h4>
                          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                            Resumo, pontos fortes e ajustes objetivos.
                          </p>
                        </div>
                        <span className="pl-tag pl-tag-ai"><Sparkles size={11} /> IA</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: 18 }}>
                        <FeedbackCard tone="success" icon={ThumbsUp} title="Pontos fortes" text={strengthsText || latestCorrection?.summary || 'Sem destaques adicionais no momento.'} />
                        <FeedbackCard tone="danger" icon={Edit3} title="Correção gramatical">
                          {grammarFeedbackItems.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {grammarFeedbackItems.map((item) => (
                                <li key={item.id} style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--pl-ink-2)' }}>
                                  {item.excerpt ? <span style={{ textDecoration: 'line-through', color: 'var(--pl-danger)' }}>{item.excerpt}</span> : 'Trecho'}
                                  {item.replacement ? <> → <strong style={{ color: 'var(--pl-success)' }}>{item.replacement}</strong></> : null}
                                  {item.reason ? ` ${item.reason}` : ''}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>{latestCorrection?.summary || 'Sem observações gramaticais registradas.'}</p>
                          )}
                        </FeedbackCard>
                        <FeedbackCard tone="warn" icon={Target} title="O que melhorar" text={improvementsText || 'Nenhum ponto crítico adicional foi retornado.'} />
                      </div>

                      {(priorityFixes.length > 0 || actionPlan.length > 0 || latestCorrection?.bancaFit || latestCorrection?.lineDiagnosis) && (
                        <div style={{ borderTop: '1px solid var(--pl-rule)', padding: 18, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                          <FeedbackListCard title="Prioridades da próxima versão" icon={Trophy} items={priorityFixes} fallback={latestCorrection?.lineDiagnosis || 'A IA não retornou prioridades adicionais.'} />
                          <FeedbackListCard title="Plano de treino" icon={Sparkles} items={actionPlan} fallback={latestCorrection?.bancaFit || 'Refaça o texto aplicando os ajustes acima e compare a nota.'} />
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--pl-rule)' }}>
                        <button
                          type="button"
                          onClick={() => typeof window !== 'undefined' && window.print()}
                          className="pl-btn pl-btn-sm"
                        >
                          <Printer size={13} /> Imprimir correção
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}

          {/* ─── Tab: Banco de temas ─── */}
          {redacaoInnerTab === 'temas' && (
            <section>
              <div className="pl-temas-toolbar">
                <div className="pl-temas-search">
                  <Search />
                  <input
                    type="search"
                    value={temaBankQuery}
                    onChange={(e) => setTemaBankQuery(e.target.value)}
                    placeholder="Procurar tema de redação…"
                  />
                </div>
                <select
                  value={temaBankEixo}
                  onChange={(e) => setTemaBankEixo(e.target.value)}
                  className="pl-input"
                  style={{ fontWeight: 600 }}
                >
                  {REDACAO_EIXO_FILTERS.map((opt) => (
                    <option key={opt.id || 'all'} value={opt.id}>
                      {opt.id ? `Eixo: ${opt.label}` : opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {temasFiltrados.length === 0 ? (
                <div style={{
                  padding: '40px 24px', textAlign: 'center',
                  background: 'var(--pl-bg-soft)', border: '1px dashed var(--pl-rule-strong)', borderRadius: 6,
                }}>
                  <List style={{ width: 36, height: 36, stroke: 'var(--pl-ink-4)', strokeWidth: 1.5, margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)' }}>Nenhum tema com esses filtros</p>
                  <p style={{ margin: '6px auto 0', maxWidth: 360, fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                    Limpe a busca ou escolha outro eixo para ver sugestões do banco.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setTemaBankQuery(''); setTemaBankEixo(''); }}
                    className="pl-btn pl-btn-sm"
                    style={{ marginTop: 14 }}
                  >
                    Limpar filtros
                  </button>
                </div>
              ) : (
                <div className="pl-temas-grid">
                  {temasFiltrados.map((temaItem) => {
                    const eixoLabel = REDACAO_EIXO_FILTERS.find((f) => f.id === temaItem.eixo)?.label || temaItem.eixo;
                    return (
                      <article key={temaItem.id} className="pl-tema-card">
                        <div className="tags">
                          <span className={eixoTagClass(temaItem.eixo)}>{eixoLabel}</span>
                          <span className="pl-tag">{temaItem.banca}</span>
                        </div>
                        <h4>{temaItem.title}</h4>
                        <p>{temaItem.description}</p>
                        <button type="button" className="cta" onClick={() => aplicarTemaDoBanco(temaItem)}>
                          Escrever sobre este tema
                          <ArrowRight />
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ─── Tab: Dicas de especialista ─── */}
          {redacaoInnerTab === 'dicas' && (
            <section className="pl-card" style={{ padding: '24px 28px' }}>
              <RedacaoDicasKitPanel bundle={kitBundle} expertTips={expertCatalog} onOpenExpert={setExpertModalTip} />
            </section>
          )}
        </main>

        {/* ═══ Sidebar ═══ */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="pl-side-card">
            <p className="pl-eyebrow">Resumo da área</p>
            <h3>Painel rápido</h3>
            <p className="desc">Métricas do seu histórico de redações, alinhadas ao que a IA já corrigiu.</p>
            <SidebarStat label="No histórico" helper="textos salvos" value={String(summary.total)} />
            <SidebarStat
              label="Melhor nota"
              helper="/10"
              value={summary.bestScore ? String(summary.bestScore).replace('.', ',') : '—'}
              muted={!summary.bestScore}
            />
            <SidebarStat
              label="Tema mais repetido"
              helper={summary.topThemeCount ? `${summary.topThemeCount} treino(s)` : '—'}
              value={summary.topTheme
                ? (summary.topTheme.length > 18 ? `${summary.topTheme.slice(0, 18)}…` : summary.topTheme)
                : '—'}
              muted={!summary.topTheme}
              small
            />
          </div>

          <div className="pl-side-card">
            <p className="pl-eyebrow">Histórico</p>
            <h3>Últimas redações</h3>
            <p className="desc">Abra no editor para revisar o texto ou excluir itens que não precisa mais guardar.</p>
            {historicoRecente.length === 0 ? (
              <div className="pl-empty-box">
                Nada salvo ainda. <em>Corrija uma redação</em> para ver o histórico aqui.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {historicoRecente.map((item) => {
                  const temaShort = item.tema && item.tema.length > 40 ? `${item.tema.slice(0, 40)}…` : item.tema || 'Sem tema';
                  const nota = item.correction?.overallScore != null
                    ? `${String(item.correction.overallScore).replace('.', ',')}/10`
                    : item.status === 'corrected' ? '—' : 'Rascunho';
                  return (
                    <li
                      key={item.id}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--pl-bg-soft)',
                        border: '1px solid var(--pl-rule)',
                        borderRadius: 5,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink)', lineHeight: 1.35 }}>
                            {temaShort}
                          </p>
                          <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 700, color: 'var(--pl-ink-3)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                            {nota} · {formatRelativeTimePt(item.updated_at || item.created_at)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => openRedacaoInEditor(item)}
                            className="pl-btn pl-btn-sm"
                            style={{ padding: '0 8px' }}
                          >
                            Abrir
                          </button>
                          {onDeleteRedacao && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRedacao(item)}
                              className="pl-btn pl-btn-sm"
                              style={{ padding: '0 8px' }}
                              aria-label="Excluir redação"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="pl-side-card">
            <p className="pl-eyebrow">Foco da semana</p>
            <h3>Prioridade</h3>
            <p className="desc">Quando a banca pedir proposta de intervenção, quem faz o quê e para quê pesa muito na nota.</p>
            <div className="pl-ajuste-card">
              <p className="pl-eyebrow eyebrow">Ajuste crítico</p>
              <p>Detalhar <em>agente</em>, <em>ação</em> e <em>finalidade</em> costuma valer mais que adornar o primeiro parágrafo.</p>
            </div>
          </div>
        </aside>
      </div>

      {/* ═══ Modais ═══ */}
      {expertModalTip && (
        <Modal title={expertModalTip.title} onClose={() => setExpertModalTip(null)}>
          <pre style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--pl-sans)',
            fontSize: 13.5, fontWeight: 500, lineHeight: 1.6,
            color: 'var(--pl-ink-2)', margin: 0,
          }}>
            {expertModalTip.body || 'Sem conteúdo cadastrado.'}
          </pre>
        </Modal>
      )}

      {bancaHelpOpen && (
        <Modal
          title="Parâmetros por banca"
          subtitle="Estilo de cobrança, checklist e um exemplo nível prova (~25–30 linhas)."
          onClose={() => setBancaHelpOpen(false)}
          wide
        >
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--pl-rule)' }}>
            {REDACAO_BANCA_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBancaHelpTab(opt.value)}
                className={`pl-btn pl-btn-sm ${bancaHelpTab === opt.value ? 'pl-btn-primary' : ''}`}
              >
                {opt.value === 'CESPE / CEBRASPE' ? 'CEBRASPE' : opt.value}
              </button>
            ))}
          </div>
          {(() => {
            const g = REDACAO_BANCA_GUIDES[bancaHelpTab];
            if (!g) return <p style={{ fontSize: 14, color: 'var(--pl-ink-3)' }}>Sem guia para esta banca.</p>;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <p className="pl-eyebrow">Estilo</p>
                  <p style={{ margin: '6px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)' }}>{g.estilo}</p>
                </div>
                <div>
                  <p className="pl-eyebrow">O que costuma pesar</p>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {g.bullets.map((b) => (
                      <li key={b} style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--pl-ink-2)', fontWeight: 500 }}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="pl-card-paper" style={{ padding: '12px 14px' }}>
                  <p className="pl-eyebrow" style={{ color: 'var(--pl-success)' }}>Resumo</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13.5, fontWeight: 700, color: 'var(--pl-ink)' }}>{g.resumo}</p>
                </div>
                <div>
                  <p className="pl-eyebrow">Exemplo nível prova</p>
                  <pre style={{
                    margin: '8px 0 0', padding: 14,
                    background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule)', borderRadius: 4,
                    maxHeight: 280, overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'var(--pl-sans)',
                    fontSize: 13, lineHeight: 1.6, color: 'var(--pl-ink-2)', fontWeight: 500,
                  }}>
                    {g.exemplo}
                  </pre>
                </div>
                <div>
                  <p className="pl-eyebrow">Comparação rápida e estratégia</p>
                  <pre style={{
                    margin: '8px 0 0',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'var(--pl-sans)',
                    fontSize: 11.5, lineHeight: 1.55, color: 'var(--pl-ink-3)', fontWeight: 600,
                  }}>
                    {COMPARACAO_BANCAS}
                  </pre>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   Subcomponentes auxiliares
   ════════════════════════════════════════════════ */
function FeedbackCard({ tone, icon: Icon, title, text, children }) {
  const map = {
    success: { bg: 'var(--pl-success-soft)', color: 'var(--pl-success)' },
    danger:  { bg: 'var(--pl-danger-soft)',  color: 'var(--pl-danger)' },
    warn:    { bg: 'var(--pl-warn-soft)',    color: 'var(--pl-warn)' },
  };
  const c = map[tone] || map.success;
  return (
    <div style={{
      padding: 14,
      background: c.bg,
      border: `1px solid ${c.color}33`,
      borderRadius: 5,
    }}>
      <p className="pl-eyebrow" style={{ color: c.color, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Icon size={13} /> {title}
      </p>
      <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55, color: 'var(--pl-ink-2)', fontWeight: 500 }}>
        {children || <p style={{ margin: 0 }}>{text}</p>}
      </div>
    </div>
  );
}

function FeedbackListCard({ title, icon: Icon, items = [], fallback = '' }) {
  const list = Array.isArray(items) ? items.filter(Boolean).slice(0, 6) : [];
  return (
    <div className="pl-card-paper" style={{ padding: 14 }}>
      <p className="pl-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Icon size={13} /> {title}
      </p>
      {list.length > 0 ? (
        <ol style={{ margin: '10px 0 0', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.map((item, idx) => (
            <li key={`${item}-${idx}`} style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.55, color: 'var(--pl-ink-2)', fontWeight: 500 }}>
              <span className="pl-num" style={{ fontSize: 16, color: 'var(--pl-accent)', flex: '0 0 22px' }}>{idx + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--pl-ink-3)', fontWeight: 500 }}>{fallback}</p>
      )}
    </div>
  );
}

function SidebarStat({ label, helper, value, muted, small }) {
  return (
    <div className="pl-stat-row">
      <div className="l">
        <span className="lab">{label}</span>
        <span className="helper">{helper}</span>
      </div>
      <span className={`v ${muted ? 'muted' : ''}`} style={small ? { fontSize: 16, fontStyle: 'normal', fontFamily: 'var(--pl-sans)', fontWeight: 600 } : undefined}>
        {value}
      </span>
    </div>
  );
}

function Modal({ title, subtitle, onClose, wide, children }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(20,17,13,0.55)',
          backdropFilter: 'blur(4px)',
          border: 0, cursor: 'pointer',
        }}
      />
      <div
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: wide ? 720 : 560,
          maxHeight: 'min(88vh, 720px)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--pl-surface)',
          border: '1px solid var(--pl-rule-2)',
          borderRadius: 6,
          boxShadow: 'var(--pl-sh-high)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--pl-rule)',
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
              fontSize: 22, letterSpacing: '-0.025em', color: 'var(--pl-ink)', lineHeight: 1.1,
            }}>
              {title}
            </h3>
            {subtitle ? (
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>{subtitle}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="pl-btn pl-btn-sm">Fechar</button>
        </div>
        <div style={{ overflowY: 'auto', padding: 18 }}>
          {children}
        </div>
      </div>
    </div>
  );
}