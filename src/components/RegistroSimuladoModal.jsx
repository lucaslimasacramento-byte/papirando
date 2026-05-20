import React, { useEffect, useMemo, useState } from 'react';
import { Check, Edit3, FileText, Plus, X } from 'lucide-react';

const DEFAULT_ROW = { id: 1, disciplina: '', topico: '', peso: 1, brancos: 0, acertos: 0, erros: 0 };

export default function RegistroSimuladoModal({
  registroSimuladoModalOpen,
  setRegistroSimuladoModalOpen,
  onSaveSimulado,
  initialDraft = null,
}) {
  const [simuladoRows, setSimuladoRows] = useState([DEFAULT_ROW]);
  const [simuladoData, setSimuladoData] = useState(() => new Date().toISOString().slice(0, 10));
  const [simuladoNome, setSimuladoNome] = useState('');
  const [simuladoEstilo, setSimuladoEstilo] = useState('Multipla Escolha');
  const [simuladoBanca, setSimuladoBanca] = useState('');
  const [simuladoTempo, setSimuladoTempo] = useState('00:00:00');
  const [comentarios, setComentarios] = useState('');
  const [saving, setSaving] = useState(false);

  const mockTopicos = {
    'Direito Constitucional': [
      'Direitos Fundamentais (Art. 5º)',
      'Nacionalidade',
      'Poder Executivo',
      'Controle de Constitucionalidade',
    ],
    'Direito Administrativo': [
      'Atos Administrativos',
      'Poderes da Administração',
      'Licitações (Lei 14.133)',
      'Improbidade Administrativa',
    ],
    'Língua Portuguesa': ['Compreensão de Textos', 'Morfossintaxe', 'Crase', 'Concordância Verbal e Nominal'],
    Informática: ['Segurança da Informação', 'Sistemas Operacionais', 'Redes de Computadores'],
  };

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
      alert('Preencha pelo menos uma disciplina com resultado.');
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="flex items-center justify-between border-b border-ink-100 bg-white px-10 py-8">
          <h2 className="text-3xl font-black tracking-tight text-ink-700">Novo Simulado</h2>
          <button onClick={closeModal} className="rounded-xl p-2 text-[#4d7c3f]/60 transition-all hover:text-[#4d7c3f]">
            <X size={40} strokeWidth={2.5} />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-10 overflow-y-auto p-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
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

          <div>
            <div className="grid grid-cols-12 items-center gap-4 border-b border-ink-200 pb-4">
              <div className="col-span-4 text-[12px] font-black text-ink-800">Disciplina / assunto</div>
              <div className="col-span-2 text-center text-[12px] font-black text-ink-800">Peso</div>
              <div className="col-span-1 flex justify-center text-ink-400" title="Em Branco"><Edit3 size={18} /></div>
              <div className="col-span-1 flex justify-center text-emerald-500" title="Acertos"><Check size={20} strokeWidth={3} /></div>
              <div className="col-span-1 flex justify-center text-red-500" title="Erros"><X size={20} strokeWidth={3} /></div>
              <div className="col-span-1 flex justify-center text-ink-400" title="Total"><FileText size={18} /></div>
              <div className="col-span-2 text-center text-[12px] font-black text-ink-800">% Acertos</div>
            </div>

            {simuladoRows.map((row) => {
              const total = Number(row.brancos) + Number(row.acertos) + Number(row.erros);
              const pct = total > 0 ? Math.round((Number(row.acertos) / total) * 100) : 0;

              return (
                <div key={row.id} className="grid grid-cols-12 items-start gap-4 border-b border-ink-100 py-4">
                  <div className="col-span-4 flex flex-col gap-2">
                    <select
                      className={inputClass()}
                      value={row.disciplina}
                      onChange={(e) => {
                        updateSimuladoRow(row.id, 'disciplina', e.target.value);
                        updateSimuladoRow(row.id, 'topico', '');
                      }}
                    >
                      <option value="">Selecione a disciplina...</option>
                      <option value="Direito Constitucional">Direito Constitucional</option>
                      <option value="Direito Administrativo">Direito Administrativo</option>
                      <option value="Língua Portuguesa">Língua Portuguesa</option>
                      <option value="Informática">Informática</option>
                    </select>

                    {row.disciplina ? (
                      <select
                        className={secondaryInputClass()}
                        value={row.topico}
                        onChange={(e) => updateSimuladoRow(row.id, 'topico', e.target.value)}
                      >
                        <option value="">Geral / Todos os assuntos</option>
                        {(mockTopicos[row.disciplina] || []).map((topico) => (
                          <option key={topico} value={topico}>
                            {topico}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>

                  <CellInput value={row.peso} onChange={(value) => updateSimuladoRow(row.id, 'peso', value)} min="1" className="col-span-2" />
                  <CellInput value={row.brancos} onChange={(value) => updateSimuladoRow(row.id, 'brancos', value)} className="col-span-1" />
                  <CellInput value={row.acertos} onChange={(value) => updateSimuladoRow(row.id, 'acertos', value)} className="col-span-1" />
                  <CellInput value={row.erros} onChange={(value) => updateSimuladoRow(row.id, 'erros', value)} className="col-span-1" />
                  <div className="col-span-1 pt-2 text-center text-lg font-black text-ink-400">{total}</div>
                  <div className="col-span-2 pt-2 text-center text-lg font-black text-emerald-500">{pct}%</div>
                </div>
              );
            })}

            <div className="mt-6 grid grid-cols-12 items-center gap-4 rounded-xl bg-emerald-50/50 py-6">
              <div className="col-span-6 pr-6 text-right text-[11px] font-black uppercase tracking-widest text-ink-400">
                Resultado final
              </div>
              <div className="col-span-1 text-center text-xl font-black text-ink-800">{totals.brancos}</div>
              <div className="col-span-1 text-center text-xl font-black text-emerald-600">{totals.acertos}</div>
              <div className="col-span-1 text-center text-xl font-black text-red-500">{totals.erros}</div>
              <div className="col-span-1 text-center text-xl font-black text-ink-800">{totals.total}</div>
              <div className="col-span-2 text-center text-xl font-black text-emerald-600">{totals.pct}%</div>
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

        <div className="flex items-center justify-between gap-4 border-t border-ink-100 bg-white px-10 py-6">
          <button onClick={addSimuladoRow} className="flex items-center gap-2 rounded-2xl border-2 border-[#4d7c3f] px-8 py-3 text-sm font-black text-[#4d7c3f] transition-all hover:bg-emerald-50">
            <Plus size={16} strokeWidth={3} />
            Adicionar disciplina
          </button>
          <div className="flex gap-4">
            <button onClick={closeModal} className="rounded-2xl border-2 border-emerald-500 px-8 py-3 text-sm font-black text-emerald-500 transition-all hover:bg-emerald-50">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="rounded-2xl bg-[#4d7c3f] px-12 py-3 text-sm font-black text-white shadow-xl shadow-emerald-100 transition-all hover:bg-[#0E9F6E] disabled:opacity-60">
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
    <div className={className}>
      <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-ink-400">{label}</label>
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
  return 'w-full rounded-xl border-2 border-emerald-400/30 bg-transparent py-3 text-lg font-bold text-ink-700 outline-none transition-colors hover:border-emerald-400 focus:border-emerald-500';
}

function secondaryInputClass() {
  return 'w-full rounded-xl border-2 border-emerald-100 bg-transparent py-2 text-xs font-bold text-ink-500 outline-none transition-colors focus:border-emerald-300';
}
