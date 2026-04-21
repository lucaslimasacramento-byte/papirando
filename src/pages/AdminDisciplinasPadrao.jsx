import React, { useMemo, useState } from 'react';
import { BookOpen, Database, Pencil, Plus, Save, Tags, Trash2, X } from 'lucide-react';

const EMPTY_FORM = {
  id: null,
  nome: '',
  area: 'Geral',
  aliasesText: '',
};

const AREA_OPTIONS = ['Basicas', 'Juridicas', 'Policial', 'Tribunais', 'Fiscal', 'Controle', 'Agropecuaria', 'Saude', 'Educacao', 'Geral'];

function buildForm(entry) {
  return {
    id: entry?.id || null,
    nome: entry?.nome || '',
    area: entry?.area || 'Geral',
    aliasesText: Array.isArray(entry?.aliases) ? entry.aliases.join('\n') : '',
  };
}

export default function AdminDisciplinasPadrao({
  subjectCatalog = [],
  onSaveSubject,
  onDeleteSubject,
}) {
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const groupedCatalog = useMemo(() => {
    const grouped = subjectCatalog.reduce((acc, entry) => {
      const area = entry.area || 'Geral';
      if (!acc[area]) acc[area] = [];
      acc[area].push(entry);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([first], [second]) => first.localeCompare(second, 'pt-BR'))
      .map(([area, entries]) => [
        area,
        [...entries].sort((first, second) => first.nome.localeCompare(second.nome, 'pt-BR')),
      ]);
  }, [subjectCatalog]);

  const stats = useMemo(
    () => ({
      total: subjectCatalog.length,
      aliases: subjectCatalog.reduce((acc, entry) => acc + (entry.aliases?.length || 0), 0),
      areas: new Set(subjectCatalog.map((entry) => entry.area || 'Geral')).size,
    }),
    [subjectCatalog]
  );

  const resetForm = () => {
    setSelectedId('');
    setForm(EMPTY_FORM);
  };

  const handleEdit = (entry) => {
    setSelectedId(entry.id);
    setForm(buildForm(entry));
  };

  const handleSave = async () => {
    const payload = {
      id: form.id,
      nome: String(form.nome || '').trim(),
      area: form.area || 'Geral',
      aliases: String(form.aliasesText || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    };

    if (!payload.nome) {
      setFeedback({ type: 'error', message: 'Digite o nome padrão da disciplina.' });
      return;
    }

    setIsSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      await onSaveSubject?.(payload);
      resetForm();
      setFeedback({ type: 'success', message: 'Disciplina padrão salva com sucesso.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Não foi possível salvar a disciplina padrão.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    const shouldDelete = window.confirm(`Excluir a disciplina padrao "${entry.nome}"?`);
    if (!shouldDelete) return;

    try {
      await onDeleteSubject?.(entry);
      if (entry.id === selectedId) {
        resetForm();
      }
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Não foi possível excluir a disciplina padrão.' });
    }
  };

  return (
    <div className="page-shell mx-auto flex h-full w-full max-w-[1320px] flex-col gap-6">
      {feedback.message ? (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700">
          <Database size={13} />
          Banco padrão de disciplinas
        </div>
        <h2 className="page-title mt-4 text-4xl font-semibold tracking-tight text-slate-900">Padronização das disciplinas</h2>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-gray-500">
          Cadastre o nome canônico e os aliases aceitos para evitar duplicidade como Português x Língua Portuguesa.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={BookOpen} label="Disciplinas padrao" value={stats.total} />
        <StatCard icon={Tags} label="Aliases cadastrados" value={stats.aliases} />
        <StatCard icon={Database} label="Areas" value={stats.areas} />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Biblioteca</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">Por área</h3>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600"
            >
              Novo
            </button>
          </div>

          <div className="space-y-5">
            {groupedCatalog.map(([area, entries]) => (
              <div key={area}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">{area}</p>
                  <span className="text-xs font-bold text-gray-400">{entries.length}</span>
                </div>

                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-[1.2rem] border px-3 py-3 transition-all ${
                        selectedId === entry.id
                          ? 'border-blue-200 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-gray-50/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(entry)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-semibold text-slate-900">{entry.nome}</p>
                          <p className="mt-1 text-xs font-semibold text-gray-500">
                            {entry.aliases?.length || 0} aliases
                          </p>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(entry)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-100 hover:text-blue-700"
                            title={`Editar ${entry.nome}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title={`Excluir ${entry.nome}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Editor</p>
              <h3 className="mt-2 text-3xl font-semibold text-slate-900">
                {form.id ? 'Editar disciplina padrão' : 'Nova disciplina padrão'}
              </h3>
            </div>
            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-600"
              >
                <X size={14} className="mr-2 inline-block" />
                Limpar
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Nome padrão">
              <input
                value={form.nome}
                onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                placeholder="Ex: Língua Portuguesa"
              />
            </Field>

            <Field label="Area">
              <select
                value={form.area}
                onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              >
                {AREA_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Aliases aceitos">
              <textarea
                rows={12}
                value={form.aliasesText}
                onChange={(event) => setForm((prev) => ({ ...prev, aliasesText: event.target.value }))}
                className="w-full rounded-[1.5rem] border border-gray-200 bg-gray-50/70 px-4 py-4 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                placeholder={`Um alias por linha\nPortugues\nLingua portuguesa\nPortugues gramatica`}
              />
            </Field>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-gray-200 bg-gray-50/70 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Como isso funciona</p>
            <div className="mt-3 space-y-2 text-sm font-semibold text-gray-600">
              <p>1. O admin cadastra o nome padrão da disciplina.</p>
              <p>2. Os nomes alternativos entram como aliases.</p>
              <p>3. Ao salvar um novo concurso, o sistema converte o nome digitado para o padrao cadastrado.</p>
              <p>4. O comparador passa a tratar disciplinas equivalentes como a mesma materia.</p>
            </div>
          </div>

          <div className="sticky bottom-0 mt-6 border-t border-gray-200 bg-white/95 pt-4 backdrop-blur">
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-600"
              >
                <Plus size={16} />
                Nova disciplina
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
              >
                <Save size={16} />
                {isSaving ? 'Salvando...' : form.id ? 'Atualizar disciplina' : 'Criar disciplina'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[1.8rem] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">
        <Icon size={12} />
        {label}
      </div>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">{label}</label>
      {children}
    </div>
  );
}
