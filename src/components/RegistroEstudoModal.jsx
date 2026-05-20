import React, { useEffect, useMemo, useState } from 'react';
import { X, CalendarDays, BookOpen, Clock3, CheckCircle2 } from 'lucide-react';

export default function RegistroEstudoModal({
  registroEstudoModalOpen,
  setRegistroEstudoModalOpen,
  bancoDisciplinas = [],
  cursos = [],
  timerValue,
  formatTimeStr,
  adicionarNovoEstudo,
  draftRegistroEstudo = null,
  onResetDraft,
}) {
  const [categoria, setCategoria] = useState('Teoria');
  const [disciplinaId, setDisciplinaId] = useState('');
  const [topicoId, setTopicoId] = useState('');
  const [tempoManual, setTempoManual] = useState('');
  const [acertos, setAcertos] = useState(0);
  const [erros, setErros] = useState(0);
  const [material, setMaterial] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const disciplinaSelecionada = useMemo(
    () => bancoDisciplinas.find((disciplina) => String(disciplina.id) === String(disciplinaId)) || null,
    [bancoDisciplinas, disciplinaId]
  );

  const topicosDisponiveis = useMemo(
    () => (Array.isArray(disciplinaSelecionada?.topicos) ? disciplinaSelecionada.topicos : []),
    [disciplinaSelecionada]
  );
  const topicoSelecionado = topicosDisponiveis.find((topic) => String(topic.id) === String(topicoId)) || null;
  const cursoSelecionado = cursos.find((curso) => curso.plano === disciplinaSelecionada?.plano) || null;

  useEffect(() => {
    if (!registroEstudoModalOpen) {
      onResetDraft?.();
      return;
    }
    setCategoria(draftRegistroEstudo?.categoria || 'Teoria');
    setDisciplinaId(draftRegistroEstudo?.disciplinaId || '');
    setTopicoId(draftRegistroEstudo?.topicoId || '');
    setTempoManual('');
    setAcertos(0);
    setErros(0);
    setMaterial(draftRegistroEstudo?.material || '');
    setIsSaving(false);
  }, [registroEstudoModalOpen, draftRegistroEstudo, onResetDraft]);

  useEffect(() => {
    if (!topicoId) return;

    const topicStillAvailable = topicosDisponiveis.some(
      (topic) => String(topic.id) === String(topicoId)
    );

    if (!topicStillAvailable) {
      setTopicoId('');
    }
  }, [disciplinaId, topicosDisponiveis, topicoId]);

  if (!registroEstudoModalOpen) return null;

  const handleSalvar = async () => {
    if (!disciplinaSelecionada) {
      alert('Selecione uma disciplina.');
      return;
    }

    if (!topicoSelecionado) {
      alert('Selecione um tópico cadastrado na disciplina.');
      return;
    }

    setIsSaving(true);

    try {
      const total = Number(acertos) + Number(erros);
      const desempenho = total > 0 ? Math.round((Number(acertos) / total) * 100) : null;

      const novoRegistro = {
        id: Date.now(),
        disciplinaId: disciplinaSelecionada.id,
        disciplina: disciplinaSelecionada.nome,
        topicoId: topicoSelecionado.id,
        topico: topicoSelecionado.nome,
        material: material.trim() || 'Sessão registrada',
        tempo: tempoManual || (formatTimeStr ? formatTimeStr(timerValue) : '00:00'),
        acertos: Number(acertos),
        erros: Number(erros),
        desempenho,
        tipo: categoria.toUpperCase(),
        cor: disciplinaSelecionada.cor || '#1d4ed8',
        data: new Date().toISOString().split('T')[0],
        plano: disciplinaSelecionada.plano || 'Geral',
      };

      await adicionarNovoEstudo(novoRegistro);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#1e40af]/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-white px-8 py-6">
          <div>
            <h2 className="text-2xl font-bold text-ink-800">Registro de estudo</h2>
            <p className="mt-1 text-sm font-medium text-ink-500">
              Fechado na disciplina e no tópico cadastrados para manter o histórico confiável.
            </p>
          </div>
          <button
            onClick={() => {
              onResetDraft?.();
              setRegistroEstudoModalOpen(false);
            }}
            className="rounded-xl p-2 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
          <div className="mb-8 flex items-center gap-4">
            <CalendarDays size={20} className="text-ink-800" />
            <button className="rounded-full bg-[#1d4ed8] px-5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
              Hoje
            </button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            <Field label="Categoria">
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full border-b border-ink-300 bg-transparent py-2 text-sm font-semibold text-ink-700 outline-none transition-colors hover:border-[#1d4ed8] focus:border-[#1d4ed8]"
              >
                <option value="Teoria">Teoria</option>
                <option value="Questões">Questões</option>
                <option value="Revisão">Revisão</option>
              </select>
            </Field>

            <Field label="Disciplina">
              <select
                value={disciplinaId}
                onChange={(e) => setDisciplinaId(e.target.value)}
                className="w-full border-b border-ink-300 bg-transparent py-2 text-sm font-semibold text-ink-700 outline-none transition-colors hover:border-[#1d4ed8] focus:border-[#1d4ed8]"
              >
                <option value="">Selecione...</option>
                {bancoDisciplinas.map((disciplina) => (
                  <option key={disciplina.id} value={disciplina.id}>
                    {disciplina.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tempo de estudo">
              <input
                type="text"
                placeholder={formatTimeStr ? formatTimeStr(timerValue || 0) : '00:00'}
                value={tempoManual}
                onChange={(e) => setTempoManual(e.target.value)}
                className="w-full border-b border-ink-300 bg-transparent py-2 text-sm font-semibold text-ink-700 outline-none transition-colors hover:border-[#1d4ed8] focus:border-[#1d4ed8]"
              />
            </Field>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="md:col-span-2">
              <Field label="Tópico">
                <select
                  value={topicoId}
                  onChange={(e) => setTopicoId(e.target.value)}
                  disabled={!disciplinaSelecionada || topicosDisponiveis.length === 0}
                  className="w-full border-b border-ink-300 bg-transparent py-2 text-sm font-semibold text-ink-700 outline-none transition-colors hover:border-[#1d4ed8] focus:border-[#1d4ed8] disabled:cursor-not-allowed disabled:text-ink-400"
                >
                  <option value="">
                    {!disciplinaSelecionada
                      ? 'Selecione a disciplina primeiro'
                      : topicosDisponiveis.length === 0
                      ? 'Essa disciplina ainda não possui tópicos'
                      : 'Selecione um tópico'}
                  </option>
                  {topicosDisponiveis.map((topico) => (
                    <option key={topico.id} value={topico.id}>
                      {topico.nome}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Material">
              <input
                type="text"
                placeholder="Ex.: Aula 01"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full border-b border-ink-300 bg-transparent py-2 text-sm font-semibold text-ink-700 outline-none transition-colors hover:border-[#1d4ed8] focus:border-[#1d4ed8]"
              />
            </Field>
          </div>

          <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-[2rem] border border-brand-100 bg-brand-50/60 p-5">
              <div className="mb-4 flex items-center gap-2 text-[#1e40af]">
                <BookOpen size={18} />
                <h3 className="text-sm font-black uppercase tracking-[0.18em]">Validação do registro</h3>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <InfoPill
                  label="Curso"
                  value={cursoSelecionado?.nome || disciplinaSelecionada?.plano || 'Aguardando seleção'}
                />
                <InfoPill
                  label="Disciplina"
                  value={disciplinaSelecionada?.nome || 'Selecione a disciplina'}
                />
                <InfoPill
                  label="Tópico"
                  value={topicoSelecionado?.nome || 'Selecione um tópico'}
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-ink-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-ink-700">
                <Clock3 size={18} />
                <h3 className="text-sm font-black uppercase tracking-[0.18em]">Questões</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Acertos">
                  <input
                    type="number"
                    min="0"
                    value={acertos}
                    onChange={(e) => setAcertos(e.target.value)}
                    className="w-full border-b border-ink-200 text-center font-black text-ink-700 outline-none focus:border-[#1d4ed8]"
                  />
                </Field>

                <Field label="Erros">
                  <input
                    type="number"
                    min="0"
                    value={erros}
                    onChange={(e) => setErros(e.target.value)}
                    className="w-full border-b border-ink-200 text-center font-black text-ink-700 outline-none focus:border-[#1d4ed8]"
                  />
                </Field>
              </div>
            </div>
          </div>

          {disciplinaSelecionada && topicosDisponiveis.length === 0 && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
              Essa disciplina ainda não tem tópicos cadastrados. Cadastre os tópicos em
              disciplinas antes de registrar o estudo.
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-ink-100 bg-ink-50 px-8 py-5">
          <button
            onClick={() => {
              onResetDraft?.();
              setRegistroEstudoModalOpen(false);
            }}
            className="rounded-xl border border-ink-200 bg-white px-6 py-2.5 text-sm font-bold text-ink-600 shadow-sm transition-colors hover:bg-ink-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1d4ed8] px-10 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <CheckCircle2 size={16} />
            {isSaving ? 'Salvando...' : 'Salvar estudo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-ink-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-[#1e40af]">{value}</p>
    </div>
  );
}
