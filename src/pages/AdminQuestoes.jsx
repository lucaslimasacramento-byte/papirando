import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileJson,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showConfirm, showToast } from '../lib/dialogs';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFICULDADES = ['Facil', 'Media', 'Dificil'];
const TIPOS = [
  { value: 'certo_errado', label: 'Certo / Errado' },
  { value: 'multipla_escolha', label: 'Múltipla Escolha' },
];

const DEFAULT_CE_ALTS = [
  { id: 'C', label: 'Certo', isCorrect: false },
  { id: 'E', label: 'Errado', isCorrect: false },
];

function emptyForm() {
  return {
    disciplina: '',
    topico: '',
    banca: '',
    cargo: '',
    ano: new Date().getFullYear().toString(),
    plano: '',
    tipo: 'certo_errado',
    enunciado: '',
    alternativas: DEFAULT_CE_ALTS.map((a) => ({ ...a })),
    gabarito: '',
    explicacao: '',
    dificuldade: 'Media',
    is_public: true,
  };
}

function cleanQuestionText(value = '') {
  return String(value || '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '[imagem]')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeImportedQuestion(raw) {
  const tipo = String(raw.tipo || 'certo_errado').trim();
  let alternativas = raw.alternativas;
  if (!Array.isArray(alternativas)) {
    alternativas = tipo === 'multipla_escolha'
      ? [{ id: 'A', label: '', isCorrect: false }, { id: 'B', label: '', isCorrect: false }, { id: 'C', label: '', isCorrect: false }, { id: 'D', label: '', isCorrect: false }, { id: 'E', label: '', isCorrect: false }]
      : DEFAULT_CE_ALTS.map((a) => ({ ...a }));
  }
  return {
    disciplina: String(raw.disciplina || '').trim(),
    topico: String(raw.topico || '').trim(),
    banca: String(raw.banca || '').trim(),
    cargo: String(raw.cargo || '').trim(),
    ano: String(raw.ano || new Date().getFullYear()),
    plano: String(raw.plano || '').trim(),
    tipo,
    enunciado: String(raw.enunciado || raw.statement || '').trim(),
    alternativas,
    gabarito: String(raw.gabarito || raw.answer || '').trim(),
    explicacao: String(raw.explicacao || raw.explanation || '').trim(),
    dificuldade: String(raw.dificuldade || 'Media').trim(),
    is_public: raw.is_public !== false,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children, required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="pl-eyebrow" style={{ marginBottom: 0 }}>
        {label}{required && <span style={{ color: 'var(--pl-danger)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function ErrBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-danger)' }}>
      <X size={13} style={{ flexShrink: 0 }} />
      {msg}
    </div>
  );
}

// ─── Question Form ─────────────────────────────────────────────────────────────

function QuestionForm({ initial, onSave, onCancel, saving, err, title }) {
  const [form, setForm] = useState(initial || emptyForm());

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Sync alternativas when tipo changes
  function handleTipoChange(tipo) {
    if (tipo === 'certo_errado') {
      setForm((f) => ({ ...f, tipo, alternativas: DEFAULT_CE_ALTS.map((a) => ({ ...a })), gabarito: '' }));
    } else {
      setForm((f) => ({
        ...f,
        tipo,
        alternativas: [
          { id: 'A', label: '', isCorrect: false },
          { id: 'B', label: '', isCorrect: false },
          { id: 'C', label: '', isCorrect: false },
          { id: 'D', label: '', isCorrect: false },
        ],
        gabarito: '',
      }));
    }
  }

  function setAltLabel(idx, value) {
    setForm((f) => {
      const alts = f.alternativas.map((a, i) => i === idx ? { ...a, label: value } : a);
      return { ...f, alternativas: alts };
    });
  }

  function setGabarito(id) {
    setForm((f) => ({
      ...f,
      gabarito: id,
      alternativas: f.alternativas.map((a) => ({ ...a, isCorrect: a.id === id })),
    }));
  }

  function addAlternativa() {
    setForm((f) => {
      const next = String.fromCharCode(65 + f.alternativas.length); // A, B, C...
      return { ...f, alternativas: [...f.alternativas, { id: next, label: '', isCorrect: false }] };
    });
  }

  function removeAlternativa(idx) {
    setForm((f) => ({
      ...f,
      alternativas: f.alternativas.filter((_, i) => i !== idx),
      gabarito: f.gabarito === f.alternativas[idx]?.id ? '' : f.gabarito,
    }));
  }

  // ── Coluna esquerda: dados e configuração da questão ──────────────────────
  const leftColumn = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Disciplina" required>
        <input className="pl-input" value={form.disciplina} onChange={(e) => set('disciplina', e.target.value)} placeholder="Ex: Direito Constitucional" />
      </Field>
      <Field label="Tópico">
        <input className="pl-input" value={form.topico} onChange={(e) => set('topico', e.target.value)} placeholder="Ex: Art. 5º" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Banca">
          <input className="pl-input" value={form.banca} onChange={(e) => set('banca', e.target.value)} placeholder="Ex: CESPE/CEBRASPE" />
        </Field>
        <Field label="Cargo">
          <input className="pl-input" value={form.cargo} onChange={(e) => set('cargo', e.target.value)} placeholder="Ex: Analista Judiciário" />
        </Field>
        <Field label="Ano">
          <input className="pl-input" value={form.ano} onChange={(e) => set('ano', e.target.value)} placeholder="2024" />
        </Field>
        <Field label="Plano/Concurso">
          <input className="pl-input" value={form.plano} onChange={(e) => set('plano', e.target.value)} placeholder="Ex: PF 2025" />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Tipo" required>
          <select className="pl-input" value={form.tipo} onChange={(e) => handleTipoChange(e.target.value)}>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Dificuldade">
          <select className="pl-input" value={form.dificuldade} onChange={(e) => set('dificuldade', e.target.value)}>
            {DIFICULDADES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
      </div>
      <label htmlFor="is_public" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)' }}>
        <input
          type="checkbox"
          id="is_public"
          style={{ width: 16, height: 16, borderRadius: 4, accentColor: 'var(--pl-accent)' }}
          checked={form.is_public}
          onChange={(e) => set('is_public', e.target.checked)}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>Questão pública (visível a todos os alunos)</span>
      </label>
    </div>
  );

  // ── Coluna direita: conteúdo da questão (enunciado, alternativas, gabarito) ─
  const rightColumn = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Enunciado" required>
        <textarea rows={6} className="pl-input" style={{ resize: 'vertical', minHeight: 120 }} value={form.enunciado} onChange={(e) => set('enunciado', e.target.value)} placeholder="Texto completo da questão..." />
      </Field>

      <Field label="Alternativas — marque o gabarito clicando no botão à esquerda" required>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {form.alternativas.map((alt, idx) => (
            <div key={alt.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setGabarito(alt.id)}
                title="Marcar como gabarito"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 32, width: 32, flexShrink: 0, borderRadius: '50%', border: '2px solid',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  borderColor: form.gabarito === alt.id ? 'var(--pl-success)' : 'var(--pl-rule-strong)',
                  background: form.gabarito === alt.id ? 'var(--pl-success)' : 'transparent',
                  color: form.gabarito === alt.id ? '#fff' : 'var(--pl-ink-3)',
                  transition: 'all .15s',
                }}
              >
                {alt.id}
              </button>
              {form.tipo === 'multipla_escolha' ? (
                <input
                  className="pl-input"
                  style={{ flex: 1 }}
                  value={alt.label}
                  onChange={(e) => setAltLabel(idx, e.target.value)}
                  placeholder={`Alternativa ${alt.id}`}
                />
              ) : (
                <span style={{ flex: 1, borderRadius: 8, border: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{alt.label}</span>
              )}
              {form.tipo === 'multipla_escolha' && idx > 1 && (
                <button onClick={() => removeAlternativa(idx)} style={{ borderRadius: 6, padding: 6, color: 'var(--pl-ink-3)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}>
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {form.tipo === 'multipla_escolha' && form.alternativas.length < 6 && (
            <button onClick={addAlternativa} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--pl-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Plus size={13} />
              Adicionar alternativa
            </button>
          )}
        </div>
      </Field>

      <Field label="Explicação / Gabarito comentado">
        <textarea rows={5} className="pl-input" style={{ resize: 'vertical', minHeight: 96 }} value={form.explicacao} onChange={(e) => set('explicacao', e.target.value)} placeholder="Explique o motivo do gabarito..." />
      </Field>
    </div>
  );

  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,17,13,0.5)', backdropFilter: 'blur(4px)', padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 1040, maxHeight: '92vh', overflow: 'hidden', borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-high)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--pl-rule)', padding: '18px 24px' }}>
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Banco de questões</p>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--pl-ink)' }}>{title || 'Nova questão'}</h2>
          </div>
          <button type="button" onClick={onCancel} title="Fechar" style={{ borderRadius: 8, padding: 6, color: 'var(--pl-ink-3)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body — duas colunas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ErrBanner msg={err} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
            <div style={{ flex: '1 1 300px', minWidth: 0 }}>{leftColumn}</div>
            <div style={{ flex: '1 1 360px', minWidth: 0 }}>{rightColumn}</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--pl-rule)', padding: '16px 24px', background: 'var(--pl-bg-soft)' }}>
          <button onClick={onCancel} className="pl-btn pl-btn-ghost">
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="pl-btn pl-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Salvar questão
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminQuestoes() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);

  // Filters
  const [filterDisc, setFilterDisc]   = useState('');
  const [filterBanca, setFilterBanca] = useState('');
  const [filterTipo, setFilterTipo]   = useState('');
  const [page, setPage]               = useState(0);
  const PAGE_SIZE = 20;

  // Create / Edit
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [formErr, setFormErr]       = useState('');
  const [deleteErr, setDeleteErr]   = useState('');

  // Bulk selection
  const [selected, setSelected] = useState(new Set());
  const [batchWorking, setBatchWorking] = useState(false);

  // Import modal
  const [importOpen, setImportOpen]   = useState(false);
  const [importData, setImportData]   = useState([]);
  const [importError, setImportError] = useState('');
  const [importing, setImporting]     = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Unique filter options
  const [discOptions, setDiscOptions]   = useState([]);
  const [bancaOptions, setBancaOptions] = useState([]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('questions').select('*', { count: 'exact' }).order('created_at', { ascending: false });

    if (filterDisc)  q = q.ilike('disciplina', `%${filterDisc}%`);
    if (filterBanca) q = q.ilike('banca', `%${filterBanca}%`);
    if (filterTipo)  q = q.eq('tipo', filterTipo);

    q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    const { data, error, count } = await q;
    if (!error) {
      setQuestions(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [filterDisc, filterBanca, filterTipo, page]);

  // Load filter options on mount
  useEffect(() => {
    async function loadOptions() {
      const [{ data: discs }, { data: bancas }] = await Promise.all([
        supabase.from('questions').select('disciplina').not('disciplina', 'is', null),
        supabase.from('questions').select('banca').not('banca', 'is', null),
      ]);
      setDiscOptions([...new Set((discs || []).map((d) => d.disciplina).filter(Boolean))].sort());
      setBancaOptions([...new Set((bancas || []).map((d) => d.banca).filter(Boolean))].sort());
    }
    loadOptions();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadQuestions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadQuestions]);

  function validateForm(form) {
    if (!form.disciplina.trim()) return 'Informe a disciplina.';
    if (!form.enunciado.trim()) return 'Informe o enunciado.';
    if (!form.gabarito) return 'Selecione o gabarito (botao colorido).';
    if (form.tipo === 'multipla_escolha' && form.alternativas.some((a) => !a.label.trim()))
      return 'Preencha todas as alternativas.';
    return '';
  }

  async function handleCreate(form) {
    const err = validateForm(form);
    if (err) { setFormErr(err); return; }
    setSaving(true);
    setFormErr('');

    const { data, error } = await supabase.from('questions').insert({
      ...form,
      alternativas: JSON.stringify(form.alternativas),
    }).select().single();

    setSaving(false);
    if (error) { setFormErr(error.message); return; }
    setQuestions((prev) => [data, ...prev]);
    setTotal((t) => t + 1);
    setCreateOpen(false);
    // Reload filter options
    setBancaOptions((prev) => [...new Set([...prev, form.banca].filter(Boolean))].sort());
    setDiscOptions((prev) => [...new Set([...prev, form.disciplina].filter(Boolean))].sort());
  }

  async function handleEdit(form) {
    const err = validateForm(form);
    if (err) { setFormErr(err); return; }
    setSaving(true);
    setFormErr('');

    const { data, error } = await supabase.from('questions').update({
      ...form,
      alternativas: JSON.stringify(form.alternativas),
      updated_at: new Date().toISOString(),
    }).eq('id', editingId).select().single();

    setSaving(false);
    if (error) { setFormErr(error.message); return; }
    setQuestions((prev) => prev.map((q) => q.id === editingId ? data : q));
    setEditingId(null);
  }

  async function handleDelete(id) {
    const ok = await showConfirm('Excluir esta questão? Essa ação não pode ser desfeita.', {
      title: 'Excluir questão',
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    setDeleteErr('');
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) {
      setDeleteErr(error.message || 'Nao foi possivel excluir a questao.');
      showToast('Não foi possível excluir a questão.', 'error');
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    showToast('Questão excluída.', 'success');
  }

  const handleBatchPublish = async (isPublic) => {
    if (selected.size === 0) return;
    setBatchWorking(true);
    const ids = [...selected];
    const { error } = await supabase
      .from('questions')
      .update({ is_public: isPublic, updated_at: new Date().toISOString() })
      .in('id', ids);
    if (!error) {
      setQuestions((prev) => prev.map((q) => selected.has(q.id) ? { ...q, is_public: isPublic } : q));
      setSelected(new Set());
    }
    setBatchWorking(false);
  };

  const handleFileImport = (e) => {
    setImportError('');
    setImportResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        setImportData(arr.map(normalizeImportedQuestion));
        setImportOpen(true);
      } catch {
        setImportError('Arquivo JSON invalido. Verifique a estrutura e tente novamente.');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (importData.length === 0) return;
    setImporting(true);
    setImportResult(null);
    let inserted = 0;
    let skipped = 0;
    for (const q of importData) {
      if (!q.enunciado || !q.disciplina) { skipped++; continue; }
      const { error } = await supabase.from('questions').insert({
        ...q,
        alternativas: JSON.stringify(q.alternativas),
      });
      if (error) skipped++;
      else inserted++;
    }
    setImportResult({ inserted, skipped });
    setImporting(false);
    if (inserted > 0) loadQuestions();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="pl-paper-bg" style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ padding: '28px 28px 16px' }}>
        <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Admin · banco de questoes</p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <h1 className="pl-display" style={{ marginBottom: 8 }}>Banco de Questoes.</h1>
            <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', maxWidth: 480 }}>
              {total} questao{total !== 1 ? 'oes' : ''} cadastrada{total !== 1 ? 's' : ''}.
            </p>
            {deleteErr && (
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-danger)', marginTop: 4 }} role="alert">
                {deleteErr}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {/* KPI */}
            <div className="pl-card" style={{ padding: '10px 16px', textAlign: 'center', minWidth: 100 }}>
              <p className="pl-eyebrow" style={{ marginBottom: 2 }}>No banco</p>
              <p className="pl-num" style={{ fontSize: 22 }}>{total}</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileImport} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="pl-btn pl-btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Upload size={15} />
              Importar JSON
            </button>
            <button
              type="button"
              onClick={() => { setFormErr(''); setCreateOpen(true); }}
              className="pl-btn pl-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={16} />
              Nova questao
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, borderBottom: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '12px 28px' }}>
        <input
          className="pl-input"
          style={{ width: 176, fontSize: 12 }}
          placeholder="Disciplina..."
          value={filterDisc}
          onChange={(e) => { setFilterDisc(e.target.value); setPage(0); }}
          list="disc-opts"
        />
        <datalist id="disc-opts">{discOptions.map((d) => <option key={d} value={d} />)}</datalist>

        <input
          className="pl-input"
          style={{ width: 160, fontSize: 12 }}
          placeholder="Banca..."
          value={filterBanca}
          onChange={(e) => { setFilterBanca(e.target.value); setPage(0); }}
          list="banca-opts"
        />
        <datalist id="banca-opts">{bancaOptions.map((b) => <option key={b} value={b} />)}</datalist>

        <select
          className="pl-input"
          style={{ fontSize: 12 }}
          value={filterTipo}
          onChange={(e) => { setFilterTipo(e.target.value); setPage(0); }}
        >
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {(filterDisc || filterBanca || filterTipo) && (
          <button
            onClick={() => { setFilterDisc(''); setFilterBanca(''); setFilterTipo(''); setPage(0); }}
            className="pl-btn pl-btn-ghost pl-btn-sm"
          >
            Limpar filtros
          </button>
        )}

        {selected.size > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>{selected.size} selecionada{selected.size !== 1 ? 's' : ''}</span>
            <button
              onClick={() => handleBatchPublish(true)}
              disabled={batchWorking}
              className="pl-btn pl-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--pl-success-soft)', color: 'var(--pl-success)', border: '1px solid var(--pl-success-soft)' }}
            >
              <Eye size={13} />
              Publicar
            </button>
            <button
              onClick={() => handleBatchPublish(false)}
              disabled={batchWorking}
              className="pl-btn pl-btn-ghost pl-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <EyeOff size={13} />
              Despublicar
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="pl-btn pl-btn-ghost pl-btn-sm"
            >
              Limpar selecao
            </button>
          </div>
        )}
      </div>

      {/* Create modal */}
      {createOpen && (
        <QuestionForm
          title="Nova questão"
          onSave={handleCreate}
          onCancel={() => setCreateOpen(false)}
          saving={saving}
          err={formErr}
        />
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--pl-accent)' }} />
          </div>
        ) : questions.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 0', gap: 12 }}>
            <BookOpen size={40} style={{ color: 'var(--pl-ink-4)' }} />
            <p style={{ fontWeight: 700, color: 'var(--pl-ink-3)' }}>Nenhuma questao encontrada.</p>
            <button onClick={() => { setFormErr(''); setCreateOpen(true); }} className="pl-btn pl-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={15} />
              Cadastrar primeira questao
            </button>
          </div>
        ) : (
          <div>
            {questions.map((q) => {
              const isExpanded = expandedId === q.id;
              const alts = Array.isArray(q.alternativas) ? q.alternativas : JSON.parse(q.alternativas || '[]');
              const questionText = cleanQuestionText(q.enunciado || q.statement);

              return (
                <div key={q.id} style={{ padding: '16px 28px', borderBottom: '1px solid var(--pl-rule)' }}>
                  {(
                    <>
                      {/* Question row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <input
                          type="checkbox"
                          style={{ marginTop: 4, width: 16, height: 16, flexShrink: 0, borderRadius: 4, accentColor: 'var(--pl-accent)' }}
                          checked={selected.has(q.id)}
                          onChange={(e) => setSelected((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(q.id); else next.delete(q.id);
                            return next;
                          })}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                            {q.disciplina && (
                              <span className="pl-tag pl-tag-accent" style={{ fontSize: 11 }}>{q.disciplina}</span>
                            )}
                            {q.banca && (
                              <span className="pl-tag" style={{ fontSize: 11 }}>{q.banca}</span>
                            )}
                            {q.ano && (
                              <span className="pl-tag" style={{ fontSize: 11 }}>{q.ano}</span>
                            )}
                            {q.source && q.source !== 'manual' && (
                              <span className="pl-tag" style={{ fontSize: 11, background: 'rgba(109,40,217,.08)', color: 'rgb(109,40,217)' }}>{q.source}</span>
                            )}
                            <span className={`pl-tag ${
                              q.dificuldade === 'Facil' ? 'pl-tag-success' :
                              q.dificuldade === 'Dificil' ? 'pl-tag-danger' :
                              'pl-tag-warn'
                            }`} style={{ fontSize: 11 }}>{q.dificuldade}</span>
                            {!q.is_public && (
                              <span className="pl-tag" style={{ fontSize: 11, background: 'var(--pl-ink)', color: 'var(--pl-bg)' }}>Privada</span>
                            )}
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{questionText}</p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : q.id)}
                            style={{ borderRadius: 6, padding: 6, color: 'var(--pl-ink-3)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <button
                            onClick={() => { setFormErr(''); setEditingId(q.id); setExpandedId(null); }}
                            style={{ borderRadius: 6, padding: 6, color: 'var(--pl-ink-3)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            style={{ borderRadius: 6, padding: 6, color: 'var(--pl-ink-3)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div style={{ marginTop: 12, borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <p style={{ fontSize: 13, color: 'var(--pl-ink-2)', fontWeight: 500, lineHeight: 1.5 }}>{questionText}</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {alts.map((alt) => (
                              <div
                                key={alt.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  borderRadius: 6, padding: '8px 12px', fontSize: 13, fontWeight: 600,
                                  background: alt.isCorrect ? 'var(--pl-success-soft)' : 'transparent',
                                  color: alt.isCorrect ? 'var(--pl-success)' : 'var(--pl-ink-2)',
                                  border: alt.isCorrect ? '1px solid var(--pl-success-soft)' : 'none',
                                }}
                              >
                                <span style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: 24, height: 24, flexShrink: 0, borderRadius: '50%', border: '1px solid',
                                  fontSize: 11, fontWeight: 600,
                                  borderColor: alt.isCorrect ? 'var(--pl-success)' : 'var(--pl-rule-strong)',
                                  background: alt.isCorrect ? 'var(--pl-success)' : 'transparent',
                                  color: alt.isCorrect ? '#fff' : 'var(--pl-ink-3)',
                                }}>{alt.id}</span>
                                {alt.label}
                                {alt.isCorrect && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--pl-success)' }} />}
                              </div>
                            ))}
                          </div>
                          {q.explicacao && (
                            <div style={{ borderRadius: 8, border: '1px solid var(--pl-accent-soft)', background: 'var(--pl-accent-soft)', padding: '12px 16px' }}>
                              <p className="pl-eyebrow" style={{ marginBottom: 4, color: 'var(--pl-accent)' }}>Explicacao</p>
                              <p style={{ fontSize: 13, color: 'var(--pl-ink-2)' }}>{q.explicacao}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingId && (() => {
        const q = questions.find((x) => x.id === editingId);
        if (!q) return null;
        const alts = Array.isArray(q.alternativas) ? q.alternativas : JSON.parse(q.alternativas || '[]');
        return (
          <QuestionForm
            title="Editar questão"
            initial={{ ...q, alternativas: alts }}
            onSave={handleEdit}
            onCancel={() => setEditingId(null)}
            saving={saving}
            err={formErr}
          />
        );
      })()}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--pl-rule)', padding: '12px 28px', background: 'var(--pl-surface)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>{total} questoes • pagina {page + 1} de {totalPages}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="pl-btn pl-btn-ghost pl-btn-sm">
              Anterior
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="pl-btn pl-btn-ghost pl-btn-sm">
              Proxima
            </button>
          </div>
        </div>
      )}

      {/* Import modal */}
      {importOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', padding: 16 }} onClick={(e) => { if (e.target === e.currentTarget) setImportOpen(false); }}>
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '80vh', width: '100%', maxWidth: 512, overflow: 'hidden', borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-high)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--pl-rule)', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileJson size={18} style={{ color: 'var(--pl-accent)' }} />
                <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)', margin: 0 }}>Importar questoes — JSON</h2>
              </div>
              <button type="button" onClick={() => setImportOpen(false)} style={{ borderRadius: 6, padding: 6, color: 'var(--pl-ink-3)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {importError && (
                <p style={{ borderRadius: 8, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-danger)' }}>{importError}</p>
              )}

              {importResult ? (
                <div style={{ borderRadius: 8, border: '1px solid var(--pl-success-soft)', background: 'var(--pl-success-soft)', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Check size={28} style={{ margin: '0 auto', color: 'var(--pl-success)' }} />
                  <p style={{ fontWeight: 700, color: 'var(--pl-success)' }}>{importResult.inserted} questao{importResult.inserted !== 1 ? 'oes' : ''} importada{importResult.inserted !== 1 ? 's' : ''}.</p>
                  {importResult.skipped > 0 && (
                    <p style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>{importResult.skipped} ignorada{importResult.skipped !== 1 ? 's' : ''} (sem enunciado ou disciplina).</p>
                  )}
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
                    {importData.length} questao{importData.length !== 1 ? 'oes' : ''} detectada{importData.length !== 1 ? 's' : ''} no arquivo.
                    Campos obrigatorios: <code style={{ borderRadius: 4, background: 'var(--pl-bg-soft)', padding: '0 4px', fontSize: 11 }}>disciplina</code> e <code style={{ borderRadius: 4, background: 'var(--pl-bg-soft)', padding: '0 4px', fontSize: 11 }}>enunciado</code>.
                  </p>
                  <div style={{ maxHeight: 224, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {importData.map((q, i) => (
                      <div key={i} style={{ borderRadius: 8, border: '1px solid', padding: '12px 16px', fontSize: 12, borderColor: !q.enunciado || !q.disciplina ? 'var(--pl-warn-soft)' : 'var(--pl-rule-2)', background: !q.enunciado || !q.disciplina ? 'var(--pl-warn-soft)' : 'var(--pl-bg-soft)' }}>
                        <p style={{ fontWeight: 700, color: 'var(--pl-ink)', margin: 0 }}>{q.disciplina || <span style={{ color: 'var(--pl-warn)' }}>Sem disciplina</span>}</p>
                        <p style={{ marginTop: 2, color: 'var(--pl-ink-3)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{q.enunciado || <span style={{ color: 'var(--pl-warn)' }}>Sem enunciado</span>}</p>
                        {q.banca && <span className="pl-tag" style={{ marginTop: 4, display: 'inline-block', fontSize: 10 }}>{q.banca} · {q.ano}</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {!importResult && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--pl-rule)', padding: '16px 20px' }}>
                <button type="button" onClick={() => setImportOpen(false)} className="pl-btn pl-btn-ghost">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importing || importData.length === 0}
                  className="pl-btn pl-btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  {importing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {importing ? 'Importando...' : `Importar ${importData.length} questao${importData.length !== 1 ? 'oes' : ''}`}
                </button>
              </div>
            )}
            {importResult && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--pl-rule)', padding: '16px 20px' }}>
                <button type="button" onClick={() => { setImportOpen(false); setImportData([]); setImportResult(null); }} className="pl-btn pl-btn-primary">
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
