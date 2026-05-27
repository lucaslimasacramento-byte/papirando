import React, { useMemo, useState } from 'react';
import { BookOpen, Database, Pencil, Plus, Save, Tags, Trash2, X } from 'lucide-react';
import AdminPageHeader from '../components/AdminPageHeader';
import { showConfirm, showToast } from '../lib/dialogs';

const EMPTY_FORM = {
  id: null,
  nome: '',
  area: 'Geral',
  aliasesText: '',
};

const AREA_OPTIONS = ['Básicas', 'Jurídicas', 'Policial', 'Tribunais', 'Fiscal', 'Controle', 'Agropecuária', 'Saúde', 'Educação', 'Geral'];

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
    const shouldDelete = await showConfirm(`Excluir a disciplina padrão "${entry.nome}"?`, { confirmLabel: 'Excluir', danger: true });
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
    <div className="pl-page">
      {feedback.message ? (
        <div
          role="status"
          style={{
            borderRadius: 10,
            border: `1px solid ${feedback.type === 'success' ? 'var(--pl-success)' : 'var(--pl-danger)'}`,
            background: feedback.type === 'success' ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)',
            padding: '12px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--pl-ink)',
          }}
        >
          {feedback.message}
        </div>
      ) : null}

      <AdminPageHeader
        icon={Database}
        badgeIcon={Database}
        badge="Banco padrão de disciplinas"
        title="Padronização das disciplinas"
        subtitle="Cadastre o nome canônico e os aliases aceitos para evitar duplicidade, como Português e Língua Portuguesa."
        stats={[
          { key: 'd', label: 'Disciplinas padrão', value: String(stats.total), icon: BookOpen, accent: 'blue' },
          { key: 'a', label: 'Aliases', value: String(stats.aliases), icon: Tags, accent: 'violet' },
          { key: 'r', label: 'Áreas', value: String(stats.areas), icon: Database, accent: 'emerald' },
        ]}
        statsClassName="sm:grid-cols-3"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: 32 }}>
        <div className="pl-card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Biblioteca</p>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--pl-ink)' }}>Por área</h3>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="pl-btn pl-btn-ghost pl-btn-sm"
            >
              Novo
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {groupedCatalog.map(([area, entries]) => (
              <div key={area}>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p className="pl-eyebrow">{area}</p>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-3)' }}>{entries.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        borderRadius: 10,
                        border: selectedId === entry.id ? '1px solid var(--pl-accent)' : '1px solid var(--pl-rule-2)',
                        background: selectedId === entry.id ? 'var(--pl-accent-soft)' : 'var(--pl-bg-soft)',
                        padding: '12px',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <button
                          type="button"
                          onClick={() => handleEdit(entry)}
                          style={{ minWidth: 0, flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{entry.nome}</p>
                          <p style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                            {entry.aliases?.length || 0} aliases
                          </p>
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => handleEdit(entry)}
                            style={{ borderRadius: 8, padding: 8, color: 'var(--pl-ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                            title={`Editar ${entry.nome}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry)}
                            style={{ borderRadius: 8, padding: 8, color: 'var(--pl-ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}
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

        <div className="pl-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid var(--pl-rule)', paddingBottom: 20 }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Editor</p>
              <h3 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--pl-ink)' }}>
                {form.id ? 'Editar disciplina padrão' : 'Nova disciplina padrão'}
              </h3>
            </div>
            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="pl-btn pl-btn-ghost pl-btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <X size={14} />
                Limpar
              </button>
            )}
          </div>

          <div style={{ marginTop: 24, display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Nome padrão">
              <input
                value={form.nome}
                onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                className="pl-input"
                style={{ width: '100%' }}
                placeholder="Ex: Língua Portuguesa"
              />
            </Field>

            <Field label="Área">
              <select
                value={form.area}
                onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                className="pl-input"
                style={{ width: '100%' }}
              >
                {AREA_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ marginTop: 16 }}>
            <Field label="Aliases aceitos">
              <textarea
                rows={12}
                value={form.aliasesText}
                onChange={(event) => setForm((prev) => ({ ...prev, aliasesText: event.target.value }))}
                className="pl-input"
                style={{ width: '100%', resize: 'vertical', fontFamily: 'var(--pl-mono)', fontSize: 12 }}
                placeholder={`Um alias por linha\nPortugues\nLingua portuguesa\nPortugues gramatica`}
              />
            </Field>
          </div>

          <div style={{ marginTop: 16, borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 20 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 12 }}>Como isso funciona</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
              <p>1. O admin cadastra o nome padrão da disciplina.</p>
              <p>2. Os nomes alternativos entram como aliases.</p>
              <p>3. Ao salvar um novo concurso, o sistema converte o nome digitado para o padrão cadastrado.</p>
              <p>4. O comparador passa a tratar disciplinas equivalentes como a mesma matéria.</p>
            </div>
          </div>

          <div style={{ marginTop: 24, borderTop: '1px solid var(--pl-rule)', paddingTop: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={resetForm}
                className="pl-btn pl-btn-ghost pl-btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <Plus size={16} />
                Nova disciplina
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="pl-btn pl-btn-primary pl-btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
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

function Field({ label, children }) {
  return (
    <div>
      <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}
