import React, { useEffect, useMemo, useState } from 'react';
import { Check, Edit3, FileText, Plus, X } from 'lucide-react';
import { showToast } from '../lib/dialogs';

const DEFAULT_ROW = { id: 1, disciplina: '', topico: '', peso: 1, brancos: 0, acertos: 0, erros: 0 };

export default function RegistroSimuladoModal({
  registroSimuladoModalOpen,
  setRegistroSimuladoModalOpen,
  onSaveSimulado,
  initialDraft = null,
  bancoDisciplinas = [],
}) {
  const [simuladoRows, setSimuladoRows] = useState([DEFAULT_ROW]);
  const [simuladoData, setSimuladoData] = useState(() => new Date().toISOString().slice(0, 10));
  const [simuladoNome, setSimuladoNome] = useState('');
  const [simuladoEstilo, setSimuladoEstilo] = useState('Multipla Escolha');
  const [simuladoBanca, setSimuladoBanca] = useState('');
  const [simuladoTempo, setSimuladoTempo] = useState('00:00:00');
  const [comentarios, setComentarios] = useState('');
  const [saving, setSaving] = useState(false);

  const disciplineOptions = useMemo(() => {
    const byName = new Map();
    (Array.isArray(bancoDisciplinas) ? bancoDisciplinas : []).forEach((discipline) => {
      const name = String(discipline?.nome || discipline?.disciplina || discipline?.name || '').trim();
      if (!name) return;
      const topics = Array.isArray(discipline?.topicos)
        ? discipline.topicos
        : Array.isArray(discipline?.topics)
          ? discipline.topics
          : [];
      const topicNames = topics
        .map((topic) => String(topic?.nome || topic?.topico || topic?.name || topic?.titulo || topic || '').trim())
        .filter(Boolean);
      const current = byName.get(name) || new Set();
      topicNames.forEach((topicName) => current.add(topicName));
      byName.set(name, current);
    });

    return Array.from(byName.entries())
      .sort(([first], [second]) => first.localeCompare(second, 'pt-BR'))
      .map(([name, topicSet]) => ({
        name,
        topics: Array.from(topicSet).sort((first, second) => first.localeCompare(second, 'pt-BR')),
      }));
  }, [bancoDisciplinas]);

  const topicsByDiscipline = useMemo(() => {
    return disciplineOptions.reduce((acc, discipline) => {
      acc[discipline.name] = discipline.topics;
      return acc;
    }, {});
  }, [disciplineOptions]);

  const totals = useMemo(() => {
    const brancos = simuladoRows.reduce((acc, row) => acc + Number(row.brancos || 0), 0);
    const acertos = simuladoRows.reduce((acc, row) => acc + Number(row.acertos || 0), 0);
    const erros = simuladoRows.reduce((acc, row) => acc + Number(row.erros || 0), 0);
    const total = brancos + acertos + erros;
    const pct = total > 0 ? Math.round((acertos / total) * 100) : 0;
    const notaLiquida = Math.max(0, Number((acertos - erros).toFixed(2)));

    return { brancos, acertos, erros, total, pct, notaLiquida };
  }, [simuladoRows]);

  const addSimuladoRow = () => {
    setSimuladoRows((prev) => [
      ...prev,
      { id: Date.now(), disciplina: '', topico: '', peso: 1, brancos: 0, acertos: 0, erros: 0 },
    ]);
  };

  const updateSimuladoRow = (id, field, value) => {
    setSimuladoRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const resetForm = () => {
    setSimuladoRows([DEFAULT_ROW]);
    setSimuladoData(new Date().toISOString().slice(0, 10));
    setSimuladoNome('');
    setSimuladoEstilo('Multipla Escolha');
    setSimuladoBanca('');
    setSimuladoTempo('00:00:00');
    setComentarios('');
    setSaving(false);
  };

  useEffect(() => {
    if (!registroSimuladoModalOpen) return;

    if (!initialDraft) {
      resetForm();
      return;
    }

    setSimuladoRows(
      Array.isArray(initialDraft.rows) && initialDraft.rows.length > 0
        ? initialDraft.rows.map((row, index) => ({
            id: row.id || `draft-${index + 1}`,
            disciplina: row.disciplina || '',
            topico: row.topico || '',
            peso: Number(row.peso || 1),
            brancos: Number(row.brancos || 0),
            acertos: Number(row.acertos || 0),
            erros: Number(row.erros || 0),
          }))
        : [DEFAULT_ROW]
    );
    setSimuladoData(initialDraft.data || new Date().toISOString().slice(0, 10));
    setSimuladoNome(initialDraft.nome || '');
    setSimuladoEstilo(initialDraft.estilo || 'Multipla Escolha');
    setSimuladoBanca(initialDraft.banca || '');
    setSimuladoTempo(initialDraft.tempo || '00:00:00');
    setComentarios(initialDraft.comentarios || '');
    setSaving(false);
  }, [initialDraft, registroSimuladoModalOpen]);

  const closeModal = () => {
    setRegistroSimuladoModalOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    const validRows = simuladoRows.filter((row) => row.disciplina && (Number(row.acertos || 0) + Number(row.erros || 0) + Number(row.brancos || 0) > 0));

    if (validRows.length === 0) {
      showToast('Preencha pelo menos uma disciplina com resultado.', 'warn');
      return;
    }

    setSaving(true);

    try {
      await onSaveSimulado?.({
        nome: simuladoNome.trim() || 'Simulado externo',
        data: simuladoData,
        estilo: simuladoEstilo,
        banca: simuladoBanca.trim(),
        tempo: simuladoTempo.trim() || '00:00:00',
        comentarios: comentarios.trim(),
        rows: validRows.map((row) => ({
          ...row,
          peso: Number(row.peso || 1),
          brancos: Number(row.brancos || 0),
          acertos: Number(row.acertos || 0),
          erros: Number(row.erros || 0),
        })),
        totais: totals,
      });

      closeModal();
    } finally {
      setSaving(false);
    }
  };

  if (!registroSimuladoModalOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(4px)',
        padding: 'clamp(8px, 2vw, 24px)',
      }}
    >
      <div className="simulados-modal-shell simulados-registro-modal" style={{ maxWidth: 'min(860px, 95vw)', width: '100%' }}>
        <div className="simulados-modal-head">
          <div>
            <div className="pl-overline">Registrar prova</div>
            <h2>Novo simulado.</h2>
            <p>Informe a prova, distribua as linhas por disciplina e salve o resultado consolidado.</p>
          </div>
          <button type="button" onClick={closeModal} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="simulados-modal-body">
          <div className="simulados-registro-meta">
            <Field className="md:col-span-3" label="Data">
              <input type="date" value={simuladoData} onChange={(e) => setSimuladoData(e.target.value)} className={inputClass()} />
            </Field>
            <Field className="md:col-span-3" label="Nome">
              <input type="text" value={simuladoNome} onChange={(e) => setSimuladoNome(e.target.value)} placeholder="Nome do Simulado" className={inputClass()} />
            </Field>
            <Field className="md:col-span-2" label="Estilo de Prova">
              <select value={simuladoEstilo} onChange={(e) => setSimuladoEstilo(e.target.value)} className={inputClass()}>
                <option>Múltipla Escolha</option>
                <option>Certo/Errado</option>
              </select>
            </Field>
            <Field className="md:col-span-2" label="Banca">
              <input type="text" value={simuladoBanca} onChange={(e) => setSimuladoBanca(e.target.value)} className={inputClass()} />
            </Field>
            <Field className="md:col-span-2" label="Tempo gasto">
              <input type="text" value={simuladoTempo} onChange={(e) => setSimuladoTempo(e.target.value)} className={`${inputClass()} text-center`} />
            </Field>
          </div>

          <div className="simulados-registro-table">
            <div className="simulados-registro-table-head">
              <div>Disciplina / assunto</div>
              <div>Peso</div>
              <div title="Em Branco"><Edit3 size={15} /></div>
              <div className="is-success" title="Acertos"><Check size={16} /></div>
              <div className="is-danger" title="Erros"><X size={16} /></div>
              <div title="Total"><FileText size={15} /></div>
              <div>%</div>
            </div>

            {simuladoRows.map((row) => {
              const total = Number(row.brancos) + Number(row.acertos) + Number(row.erros);
              const pct = total > 0 ? Math.round((Number(row.acertos) / total) * 100) : 0;

              return (
                <div key={row.id} className="simulados-registro-row">
                  <div className="simulados-registro-subject">
                    <select
                      className={inputClass()}
                      value={row.disciplina}
                      onChange={(e) => {
                        updateSimuladoRow(row.id, 'disciplina', e.target.value);
                        updateSimuladoRow(row.id, 'topico', '');
                      }}
                    >
                      <option value="">Selecione a disciplina...</option>
                      {disciplineOptions.map((discipline) => (
                        <option key={discipline.name} value={discipline.name}>
                          {discipline.name}
                        </option>
                      ))}
                    </select>

                    {row.disciplina ? (
                      <select
                        className={secondaryInputClass()}
                        value={row.topico}
                        onChange={(e) => updateSimuladoRow(row.id, 'topico', e.target.value)}
                      >
                        <option value="">Geral / Todos os assuntos</option>
                        {(topicsByDiscipline[row.disciplina] || []).map((topico) => (
                          <option key={topico} value={topico}>
                            {topico}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>

                  <CellInput value={row.peso} onChange={(value) => updateSimuladoRow(row.id, 'peso', value)} min="1" />
                  <CellInput value={row.brancos} onChange={(value) => updateSimuladoRow(row.id, 'brancos', value)} />
                  <CellInput value={row.acertos} onChange={(value) => updateSimuladoRow(row.id, 'acertos', value)} />
                  <CellInput value={row.erros} onChange={(value) => updateSimuladoRow(row.id, 'erros', value)} />
                  <div className="simulados-registro-total">{total}</div>
                  <div className={`simulados-registro-pct ${pct >= 80 ? 'is-success' : pct >= 65 ? 'is-accent' : 'is-warn'}`}>{pct}%</div>
                </div>
              );
            })}

            <div className="simulados-registro-result">
              <span>Resultado final</span>
              <b>{totals.brancos} brancos</b>
              <b className="is-success">{totals.acertos} acertos</b>
              <b className="is-danger">{totals.erros} erros</b>
              <b>{totals.total} total</b>
              <strong>{totals.pct}%</strong>
            </div>
          </div>

          <Field label="Comentários e desempenho global">
            <textarea
              rows="3"
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Insira o seu feedback sobre este simulado."
              className={`${inputClass()} resize-none`}
            />
          </Field>
        </div>

        <div className="simulados-modal-footer">
          <button onClick={addSimuladoRow} className="pl-btn pl-btn-sm">
            <Plus size={16} strokeWidth={3} />
            Adicionar disciplina
          </button>
          <div>
            <button onClick={closeModal} className="pl-btn">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="pl-btn pl-btn-primary">
              {saving ? 'Salvando...' : 'Salvar Simulado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, className = '', children }) {
  return (
    <div className={`simulados-modal-field ${className}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function CellInput({ className = '', value, onChange, min = '0' }) {
  return (
    <div className={className}>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass()} text-center`}
      />
    </div>
  );
}

function inputClass() {
  return 'simulados-register-input';
}

function secondaryInputClass() {
  return 'simulados-register-input is-secondary';
}
