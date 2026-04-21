import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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

function inputCls(extra = '') {
  return `w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 ${extra}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ErrBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
      <X size={13} className="shrink-0" />
      {msg}
    </div>
  );
}

// ─── Question Form ─────────────────────────────────────────────────────────────

function QuestionForm({ initial, onSave, onCancel, saving, err }) {
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

  return (
    <div className="space-y-4">
      <ErrBanner msg={err} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Disciplina" required>
          <input className={inputCls()} value={form.disciplina} onChange={(e) => set('disciplina', e.target.value)} placeholder="Ex: Direito Constitucional" />
        </Field>
        <Field label="Tópico">
          <input className={inputCls()} value={form.topico} onChange={(e) => set('topico', e.target.value)} placeholder="Ex: Art. 5º" />
        </Field>
        <Field label="Banca">
          <input className={inputCls()} value={form.banca} onChange={(e) => set('banca', e.target.value)} placeholder="Ex: CESPE/CEBRASPE" />
        </Field>
        <Field label="Cargo">
          <input className={inputCls()} value={form.cargo} onChange={(e) => set('cargo', e.target.value)} placeholder="Ex: Analista Judiciário" />
        </Field>
        <Field label="Ano">
          <input className={inputCls()} value={form.ano} onChange={(e) => set('ano', e.target.value)} placeholder="2024" />
        </Field>
        <Field label="Plano/Concurso">
          <input className={inputCls()} value={form.plano} onChange={(e) => set('plano', e.target.value)} placeholder="Ex: PF 2025" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo" required>
          <select className={inputCls()} value={form.tipo} onChange={(e) => handleTipoChange(e.target.value)}>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Dificuldade">
          <select className={inputCls()} value={form.dificuldade} onChange={(e) => set('dificuldade', e.target.value)}>
            {DIFICULDADES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Enunciado" required>
        <textarea rows={4} className={inputCls('resize-none')} value={form.enunciado} onChange={(e) => set('enunciado', e.target.value)} placeholder="Texto completo da questão..." />
      </Field>

      <Field label={`Alternativas — marque o gabarito clicando no botão à esquerda`} required>
        <div className="space-y-2">
          {form.alternativas.map((alt, idx) => (
            <div key={alt.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGabarito(alt.id)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
                  form.gabarito === alt.id
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-300 text-slate-400 hover:border-slate-400'
                }`}
              >
                {alt.id}
              </button>
              {form.tipo === 'multipla_escolha' ? (
                <input
                  className={inputCls('flex-1')}
                  value={alt.label}
                  onChange={(e) => setAltLabel(idx, e.target.value)}
                  placeholder={`Alternativa ${alt.id}`}
                />
              ) : (
                <span className="flex-1 rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600">{alt.label}</span>
              )}
              {form.tipo === 'multipla_escolha' && idx > 1 && (
                <button onClick={() => removeAlternativa(idx)} className="rounded-lg p-1.5 text-slate-400 hover:text-red-400">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {form.tipo === 'multipla_escolha' && form.alternativas.length < 6 && (
            <button onClick={addAlternativa} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700">
              <Plus size={13} />
              Adicionar alternativa
            </button>
          )}
        </div>
      </Field>

      <Field label="Explicação / Gabarito comentado">
        <textarea rows={3} className={inputCls('resize-none')} value={form.explicacao} onChange={(e) => set('explicacao', e.target.value)} placeholder="Explique o motivo do gabarito..." />
      </Field>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_public"
          className="h-4 w-4 rounded accent-blue-600"
          checked={form.is_public}
          onChange={(e) => set('is_public', e.target.checked)}
        />
        <label htmlFor="is_public" className="text-sm font-semibold text-slate-700">Questão pública (visível a todos os alunos)</label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
          Cancelar
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Salvar questão
        </button>
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
    if (!form.gabarito) return 'Selecione o gabarito (botão colorido).';
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
    setDeleteErr('');
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) {
      setDeleteErr(error.message || 'Não foi possível excluir a questão.');
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="page-shell mx-auto flex h-full w-full max-w-[1320px] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Banco de Questões</h1>
          <p className="text-xs font-semibold text-slate-500">{total} questão{total !== 1 ? 'ões' : ''} cadastrada{total !== 1 ? 's' : ''}</p>
          {deleteErr ? (
            <p className="mt-2 text-xs font-semibold text-red-600" role="alert">
              {deleteErr}
            </p>
          ) : null}
        </div>
        <button
          onClick={() => { setFormErr(''); setCreateOpen(true); }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Nova questão
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50 px-6 py-3">
        <input
          className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 w-44"
          placeholder="Disciplina..."
          value={filterDisc}
          onChange={(e) => { setFilterDisc(e.target.value); setPage(0); }}
          list="disc-opts"
        />
        <datalist id="disc-opts">{discOptions.map((d) => <option key={d} value={d} />)}</datalist>

        <input
          className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 w-40"
          placeholder="Banca..."
          value={filterBanca}
          onChange={(e) => { setFilterBanca(e.target.value); setPage(0); }}
          list="banca-opts"
        />
        <datalist id="banca-opts">{bancaOptions.map((b) => <option key={b} value={b} />)}</datalist>

        <select
          className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"
          value={filterTipo}
          onChange={(e) => { setFilterTipo(e.target.value); setPage(0); }}
        >
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {(filterDisc || filterBanca || filterTipo) && (
          <button
            onClick={() => { setFilterDisc(''); setFilterBanca(''); setFilterTipo(''); setPage(0); }}
            className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Create form */}
      {createOpen && (
        <div className="border-b border-blue-100 bg-blue-50 px-6 py-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Nova Questão</h3>
          <QuestionForm
            onSave={handleCreate}
            onCancel={() => setCreateOpen(false)}
            saving={saving}
            err={formErr}
          />
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <BookOpen size={40} className="text-slate-300" />
            <p className="font-bold text-slate-500">Nenhuma questão encontrada.</p>
            <button onClick={() => { setFormErr(''); setCreateOpen(true); }} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
              <Plus size={15} />
              Cadastrar primeira questão
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {questions.map((q) => {
              const isExpanded = expandedId === q.id;
              const isEditing  = editingId === q.id;
              const alts = Array.isArray(q.alternativas) ? q.alternativas : JSON.parse(q.alternativas || '[]');

              return (
                <div key={q.id} className="px-6 py-4">
                  {isEditing ? (
                    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
                      <p className="mb-4 text-sm font-semibold text-slate-800">Editando questão</p>
                      <QuestionForm
                        initial={{ ...q, alternativas: alts }}
                        onSave={handleEdit}
                        onCancel={() => setEditingId(null)}
                        saving={saving}
                        err={formErr}
                      />
                    </div>
                  ) : (
                    <>
                      {/* Question row */}
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {q.disciplina && (
                              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">{q.disciplina}</span>
                            )}
                            {q.banca && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">{q.banca}</span>
                            )}
                            {q.ano && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">{q.ano}</span>
                            )}
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              q.dificuldade === 'Facil' ? 'bg-emerald-100 text-emerald-700' :
                              q.dificuldade === 'Dificil' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>{q.dificuldade}</span>
                            {!q.is_public && (
                              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-white">Privada</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-700 line-clamp-2">{q.enunciado}</p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : q.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <button
                            onClick={() => { setFormErr(''); setEditingId(q.id); setExpandedId(null); }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-500"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                          <p className="text-sm text-slate-700 font-medium leading-relaxed">{q.enunciado}</p>
                          <div className="space-y-1.5">
                            {alts.map((alt) => (
                              <div
                                key={alt.id}
                                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold ${
                                  alt.isCorrect
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'text-slate-600'
                                }`}
                              >
                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                                  alt.isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-slate-500'
                                }`}>{alt.id}</span>
                                {alt.label}
                                {alt.isCorrect && <Check size={14} className="ml-auto text-emerald-600" />}
                              </div>
                            ))}
                          </div>
                          {q.explicacao && (
                            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                              <p className="text-xs font-bold uppercase tracking-wide text-blue-500 mb-1">Explicação</p>
                              <p className="text-sm text-slate-700">{q.explicacao}</p>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 bg-white">
          <p className="text-xs font-semibold text-slate-500">{total} questões • página {page + 1} de {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Anterior
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
