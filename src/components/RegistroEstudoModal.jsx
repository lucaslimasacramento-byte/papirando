import React, { useEffect, useMemo, useState } from 'react';
import { X, CalendarDays, BookOpen, Clock3, CheckCircle2 } from 'lucide-react';
import { showToast } from '../lib/dialogs';

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
      showToast('Selecione uma disciplina.', 'error');
      return;
    }

    if (!topicoSelecionado) {
      showToast('Selecione um topico cadastrado na disciplina.', 'error');
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
        material: material.trim() || 'Sessao registrada',
        tempo: tempoManual || (formatTimeStr ? formatTimeStr(timerValue) : '00:00'),
        acertos: Number(acertos),
        erros: Number(erros),
        desempenho,
        tipo: categoria.toUpperCase(),
        cor: disciplinaSelecionada.cor || '#1e3a5f',
        data: new Date().toISOString().split('T')[0],
        plano: disciplinaSelecionada.plano || 'Geral',
      };

      await adicionarNovoEstudo(novoRegistro);
    } finally {
      setIsSaving(false);
    }
  };

  const selectStyle = {
    width: '100%',
    borderBottom: '1px solid var(--pl-rule-2)',
    background: 'transparent',
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--pl-ink)',
    outline: 'none',
  };

  const inputStyle = {
    width: '100%',
    borderBottom: '1px solid var(--pl-rule-2)',
    background: 'transparent',
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--pl-ink)',
    outline: 'none',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(4px)',
        padding: 'clamp(8px, 2vw, 32px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '95vh',
          width: '100%',
          maxWidth: 'min(896px, 95vw)',
          overflow: 'hidden',
          borderRadius: 16,
          background: 'var(--pl-surface)',
          boxShadow: 'var(--pl-sh-high)',
        }}
      >
        {/* Header */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--pl-rule)',
            background: 'var(--pl-surface)',
            padding: 'clamp(12px, 2vw, 20px) clamp(12px, 3vw, 32px)',
          }}
        >
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--pl-ink)', margin: 0 }}>
              Registro de estudo
            </h2>
            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--pl-ink-2)' }}>
              Fechado na disciplina e no topico cadastrados para manter o historico confiavel.
            </p>
          </div>
          <button
            onClick={() => {
              onResetDraft?.();
              setRegistroEstudoModalOpen(false);
            }}
            style={{
              borderRadius: 8,
              padding: 8,
              color: 'var(--pl-ink-3)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              lineHeight: 0,
            }}
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 'clamp(12px, 2.5vw, 32px)' }}>
          {/* Date strip */}
          <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
            <CalendarDays size={20} style={{ color: 'var(--pl-ink)' }} />
            <button
              className="pl-btn pl-btn-primary pl-btn-sm"
              style={{ borderRadius: 9999, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}
            >
              Hoje
            </button>
          </div>

          {/* Row 1: Categoria / Disciplina / Tempo */}
          <div
            style={{
              marginBottom: 32,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 'clamp(12px, 2vw, 32px)',
            }}
          >
            <Field label="Categoria">
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={selectStyle}>
                <option value="Teoria">Teoria</option>
                <option value="Questoes">Questoes</option>
                <option value="Revisao">Revisao</option>
              </select>
            </Field>

            <Field label="Disciplina">
              <select value={disciplinaId} onChange={(e) => setDisciplinaId(e.target.value)} style={selectStyle}>
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
                style={inputStyle}
              />
            </Field>
          </div>

          {/* Row 2: Topico / Material */}
          <div
            style={{
              marginBottom: 32,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 'clamp(12px, 2vw, 32px)',
            }}
          >
            <Field label="Topico">
              <select
                value={topicoId}
                onChange={(e) => setTopicoId(e.target.value)}
                disabled={!disciplinaSelecionada || topicosDisponiveis.length === 0}
                style={{
                  ...selectStyle,
                  color: (!disciplinaSelecionada || topicosDisponiveis.length === 0)
                    ? 'var(--pl-ink-4)'
                    : 'var(--pl-ink)',
                  cursor: (!disciplinaSelecionada || topicosDisponiveis.length === 0) ? 'not-allowed' : 'auto',
                }}
              >
                <option value="">
                  {!disciplinaSelecionada
                    ? 'Selecione a disciplina primeiro'
                    : topicosDisponiveis.length === 0
                    ? 'Essa disciplina ainda nao possui topicos'
                    : 'Selecione um topico'}
                </option>
                {topicosDisponiveis.map((topico) => (
                  <option key={topico.id} value={topico.id}>
                    {topico.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Material">
              <input
                type="text"
                placeholder="Ex.: Aula 01"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          {/* Validation + Questoes */}
          <div
            style={{
              marginBottom: 32,
              display: 'grid',
              gridTemplateColumns: '1fr 280px',
              gap: 24,
            }}
          >
            {/* Validacao */}
            <div
              style={{
                borderRadius: 16,
                border: '1px solid var(--pl-accent-soft)',
                background: 'var(--pl-accent-soft)',
                padding: 20,
              }}
            >
              <div
                style={{
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--pl-accent)',
                }}
              >
                <BookOpen size={18} />
                <h3 className="pl-eyebrow" style={{ margin: 0 }}>Validacao do registro</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <InfoPill
                  label="Curso"
                  value={cursoSelecionado?.nome || disciplinaSelecionada?.plano || 'Aguardando selecao'}
                />
                <InfoPill
                  label="Disciplina"
                  value={disciplinaSelecionada?.nome || 'Selecione a disciplina'}
                />
                <InfoPill
                  label="Topico"
                  value={topicoSelecionado?.nome || 'Selecione um topico'}
                />
              </div>
            </div>

            {/* Questoes */}
            <div
              style={{
                borderRadius: 16,
                border: '1px solid var(--pl-rule-2)',
                background: 'var(--pl-surface)',
                padding: 20,
                boxShadow: 'var(--pl-sh-low)',
              }}
            >
              <div
                style={{
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--pl-ink-2)',
                }}
              >
                <Clock3 size={18} />
                <h3 className="pl-eyebrow" style={{ margin: 0 }}>Questoes</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Acertos">
                  <input
                    type="number"
                    min="0"
                    value={acertos}
                    onChange={(e) => setAcertos(e.target.value)}
                    style={{
                      width: '100%',
                      borderBottom: '1px solid var(--pl-rule-2)',
                      background: 'transparent',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: 'var(--pl-ink)',
                      outline: 'none',
                      fontSize: 14,
                      padding: '4px 0',
                    }}
                  />
                </Field>

                <Field label="Erros">
                  <input
                    type="number"
                    min="0"
                    value={erros}
                    onChange={(e) => setErros(e.target.value)}
                    style={{
                      width: '100%',
                      borderBottom: '1px solid var(--pl-rule-2)',
                      background: 'transparent',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: 'var(--pl-ink)',
                      outline: 'none',
                      fontSize: 14,
                      padding: '4px 0',
                    }}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Warning: no topicos */}
          {disciplinaSelecionada && topicosDisponiveis.length === 0 && (
            <div
              style={{
                borderRadius: 12,
                border: '1px solid var(--pl-warn-soft)',
                background: 'var(--pl-warn-soft)',
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--pl-warn)',
              }}
            >
              Essa disciplina ainda nao tem topicos cadastrados. Cadastre os topicos em
              disciplinas antes de registrar o estudo.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            borderTop: '1px solid var(--pl-rule)',
            background: 'var(--pl-bg-soft)',
            padding: 'clamp(12px, 2vw, 20px) clamp(12px, 3vw, 32px)',
          }}
        >
          <button
            onClick={() => {
              onResetDraft?.();
              setRegistroEstudoModalOpen(false);
            }}
            className="pl-btn pl-btn-ghost"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={isSaving}
            className="pl-btn pl-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: isSaving ? 0.7 : 1 }}
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
      <label
        className="pl-eyebrow"
        style={{ display: 'block', marginBottom: 4, fontSize: 10 }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div
      style={{
        borderRadius: 12,
        background: 'var(--pl-surface)',
        padding: '12px 16px',
        boxShadow: 'var(--pl-sh-low)',
      }}
    >
      <p
        className="pl-eyebrow"
        style={{ margin: 0, marginBottom: 4, fontSize: 10 }}
      >
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-accent)' }}>
        {value}
      </p>
    </div>
  );
}
