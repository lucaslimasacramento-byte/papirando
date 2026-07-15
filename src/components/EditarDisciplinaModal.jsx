import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Columns,
  Edit3,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { canonicalizeSubjectName, resolveSubjectCatalogEntry } from '../lib/subjectCatalogUtils';
import { showConfirm, showToast } from '../lib/dialogs';

const COLOR_OPTIONS = ['#1e3a5f', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

const EMPTY_DISCIPLINE = {
  nome: '',
  plano: 'Geral',
  cor: '#1e3a5f',
  topicos: [],
  percentual: 0,
  tempo_total_min: 0,
};

const EMPTY_TOPIC_FORM = {
  nome: '',
  acertos: 0,
  erros: 0,
  concluido: false,
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const getPercentualByQuestions = (acertos, erros) => {
  const total = toNumber(acertos) + toNumber(erros);
  return total > 0 ? Math.round((toNumber(acertos) / total) * 100) : 0;
};

const shouldRetryWithoutSubjectCatalogId = (error) =>
  /subject_catalog_id/i.test(String(error?.message || error?.details || error?.hint || ''));

const stripSubjectCatalogId = (payload) => {
  const next = { ...(payload || {}) };
  delete next.subject_catalog_id;
  return next;
};

const buildDisciplineState = (subject, topics) => {
  const topicosOrdenados = [...(topics || [])].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
  const concluidos = topicosOrdenados.filter((topic) => topic.concluido).length;
  const totalTopicos = topicosOrdenados.length;
  const percentual = totalTopicos > 0 ? Math.round((concluidos / totalTopicos) * 100) : Number(subject?.percentual || 0);
  const tempoMin = Number(subject?.tempo_total_min || 0);
  const horas = Math.floor(tempoMin / 60);
  const minutos = tempoMin % 60;

  return {
    ...subject,
    percentual,
    topicosTot: totalTopicos,
    tempo: `${horas}h ${String(minutos).padStart(2, '0')}m`,
    topicos: topicosOrdenados.map((topic, index) => ({
      ...topic,
      ordem: index + 1,
      acertos: Number(topic.acertos || 0),
      erros: Number(topic.erros || 0),
      percentual: Number(
        topic.percentual ?? getPercentualByQuestions(topic.acertos || 0, topic.erros || 0)
      ),
      data: topic.data_conclusao || topic.data || null,
    })),
  };
};

export default function EditarDisciplinaModal({
  editingDiscipline,
  setEditingDiscipline,
  setBancoDisciplinas,
  cursos = [],
  subjectCatalog = [],
}) {
  const isOpen = editingDiscipline !== null;
  const isNewDiscipline = !editingDiscipline?.id;

  const initialData = useMemo(
    () => ({
      ...EMPTY_DISCIPLINE,
      ...(editingDiscipline || {}),
      nome: canonicalizeSubjectName(editingDiscipline?.nome || '', subjectCatalog),
      topicos: Array.isArray(editingDiscipline?.topicos)
        ? editingDiscipline.topicos.map((topic, index) => ({
            id: topic.id,
            nome: topic.nome || '',
            concluido: Boolean(topic.concluido),
            acertos: Number(topic.acertos || 0),
            erros: Number(topic.erros || 0),
            percentual: Number(topic.percentual || 0),
            data_conclusao: topic.data_conclusao || topic.data || null,
            ordem: Number(topic.ordem || index + 1),
          }))
        : [],
    }),
    [editingDiscipline, subjectCatalog]
  );

  const [nome, setNome] = useState(initialData.nome);
  const [plano, setPlano] = useState(initialData.plano);
  const [cor, setCor] = useState(initialData.cor);
  const [topicos, setTopicos] = useState(initialData.topicos);
  const [topicForm, setTopicForm] = useState(EMPTY_TOPIC_FORM);
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [removedTopicIds, setRemovedTopicIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);

  const courseOptions = useMemo(() => {
    return [
      ...new Set(
        (cursos || [])
          .filter((curso) => curso.status !== 'arquivado')
          .map((curso) => curso.plano || curso.nome)
          .filter(Boolean)
      ),
    ];
  }, [cursos]);

  const subjectSuggestions = useMemo(
    () =>
      subjectCatalog
        .map((entry) => entry.nome)
        .filter(Boolean)
        .sort((first, second) => first.localeCompare(second, 'pt-BR')),
    [subjectCatalog]
  );

  const matchedSubject = useMemo(
    () => resolveSubjectCatalogEntry(nome, subjectCatalog),
    [nome, subjectCatalog]
  );

  const filteredSubjectSuggestions = useMemo(() => {
    const search = String(nome || '').trim().toLowerCase();
    const normalized = search
      ? subjectSuggestions.filter((item) => item.toLowerCase().includes(search))
      : subjectSuggestions;

    return normalized.slice(0, 6);
  }, [nome, subjectSuggestions]);

  const topicosConcluidos = topicos.filter((topic) => topic.concluido).length;
  const topicosPendentes = Math.max(topicos.length - topicosConcluidos, 0);
  const aproveitamento = topicos.length > 0 ? Math.round((topicosConcluidos / topicos.length) * 100) : 0;

  useEffect(() => {
    if (!isOpen) return;
    setNome(initialData.nome);
    // Disciplina precisa estar vinculada a um objetivo do aluno. Se o plano atual
    // nao corresponder a nenhum objetivo (ex.: legado "Geral" ou disciplina nova),
    // pre-seleciona o primeiro objetivo disponivel.
    setPlano(courseOptions.includes(initialData.plano) ? initialData.plano : (courseOptions[0] || ''));
    setCor(initialData.cor);
    setTopicos(initialData.topicos);
    setTopicForm(EMPTY_TOPIC_FORM);
    setEditingTopicId(null);
    setRemovedTopicIds([]);
    setIsSuggestionOpen(false);
  }, [initialData, isOpen, courseOptions]);

  if (!isOpen) return null;

  const resetTopicForm = () => {
    setTopicForm(EMPTY_TOPIC_FORM);
    setEditingTopicId(null);
  };

  const handleClose = () => {
    if (isSaving) return;
    setEditingDiscipline(null);
  };

  const handleTopicFieldChange = (field, value) => {
    setTopicForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddOrUpdateTopic = () => {
    const nomeTopico = topicForm.nome.trim();

    if (!nomeTopico) {
      showToast('Digite o nome do tópico.', 'error');
      return;
    }

    const payload = {
      id: editingTopicId,
      nome: nomeTopico,
      concluido: Boolean(topicForm.concluido),
      acertos: toNumber(topicForm.acertos),
      erros: toNumber(topicForm.erros),
      percentual: getPercentualByQuestions(topicForm.acertos, topicForm.erros),
      data_conclusao: topicForm.concluido ? new Date().toISOString().slice(0, 10) : null,
    };

    setTopicos((prev) => {
      if (editingTopicId) {
        return prev.map((topic, index) =>
          topic.id === editingTopicId
            ? { ...topic, ...payload, ordem: index + 1 }
            : { ...topic, ordem: index + 1 }
        );
      }

      return [
        ...prev,
        {
          ...payload,
          id: `new-${Date.now()}`,
          ordem: prev.length + 1,
        },
      ];
    });

    resetTopicForm();
  };

  const handleEditTopic = (topic) => {
    setEditingTopicId(topic.id);
    setTopicForm({
      nome: topic.nome || '',
      acertos: Number(topic.acertos || 0),
      erros: Number(topic.erros || 0),
      concluido: Boolean(topic.concluido),
    });
  };

  const handleDeleteTopic = async (topicId) => {
    const topico = topicos.find((item) => item.id === topicId);
    if (!topico) return;

    const confirmar = await showConfirm(`Excluir o tópico "${topico.nome}"?`, { confirmLabel: 'Excluir', danger: true });
    if (!confirmar) return;

    if (typeof topicId === 'number') {
      setRemovedTopicIds((prev) => [...prev, topicId]);
    }

    setTopicos((prev) =>
      prev
        .filter((item) => item.id !== topicId)
        .map((item, index) => ({ ...item, ordem: index + 1 }))
    );

    if (editingTopicId === topicId) {
      resetTopicForm();
    }
  };

  const handleMoveTopic = (topicId, direction) => {
    setTopicos((prev) => {
      const index = prev.findIndex((item) => item.id === topicId);
      if (index < 0) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const reordered = [...prev];
      const [current] = reordered.splice(index, 1);
      reordered.splice(targetIndex, 0, current);
      return reordered.map((item, idx) => ({ ...item, ordem: idx + 1 }));
    });
  };

  const handleSave = async () => {
    const nomeTratado = canonicalizeSubjectName(nome.trim(), subjectCatalog);
    const planoTratado = plano.trim();
    const subjectCatalogId = resolveSubjectCatalogEntry(nomeTratado, subjectCatalog)?.id || null;

    if (!nomeTratado) {
      showToast('Digite o nome da disciplina.', 'error');
      return;
    }

    if (!planoTratado || !courseOptions.includes(planoTratado)) {
      showToast('Vincule a disciplina a um dos seus objetivos.', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('Sessão expirada. Faça login novamente.');

      let savedSubject;
      const subjectPayload = {
        nome: nomeTratado,
        subject_catalog_id: subjectCatalogId,
        plano: planoTratado,
        cor,
      };

      if (isNewDiscipline) {
        let { data, error } = await supabase
          .from('subjects')
          .insert({
            user_id: user.id,
            percentual: 0,
            tempo_total_min: 0,
            ...subjectPayload,
          })
          .select('*')
          .single();

        if (error && shouldRetryWithoutSubjectCatalogId(error)) {
          ({ data, error } = await supabase
            .from('subjects')
            .insert({
              user_id: user.id,
              percentual: 0,
              tempo_total_min: 0,
              ...stripSubjectCatalogId(subjectPayload),
            })
            .select('*')
            .single());
        }

        if (error) throw error;
        savedSubject = data;
      } else {
        let { data, error } = await supabase
          .from('subjects')
          .update(subjectPayload)
          .eq('id', editingDiscipline.id)
          .select('*')
          .single();

        if (error && shouldRetryWithoutSubjectCatalogId(error)) {
          ({ data, error } = await supabase
            .from('subjects')
            .update(stripSubjectCatalogId(subjectPayload))
            .eq('id', editingDiscipline.id)
            .select('*')
            .single());
        }

        if (error) throw error;
        savedSubject = data;
      }

      if (removedTopicIds.length > 0) {
        const { error } = await supabase.from('topics').delete().in('id', removedTopicIds);
        if (error) throw error;
      }

      const persistedTopics = [];

      for (let index = 0; index < topicos.length; index += 1) {
        const topic = topicos[index];
        const topicPayload = {
          subject_id: savedSubject.id,
          nome: topic.nome,
          ordem: index + 1,
          concluido: Boolean(topic.concluido),
          acertos: toNumber(topic.acertos),
          erros: toNumber(topic.erros),
          percentual: getPercentualByQuestions(topic.acertos, topic.erros),
          data_conclusao: topic.concluido ? topic.data_conclusao || new Date().toISOString().slice(0, 10) : null,
        };

        if (typeof topic.id === 'number') {
          const { data, error } = await supabase
            .from('topics')
            .update(topicPayload)
            .eq('id', topic.id)
            .select('*')
            .single();

          if (error) throw error;
          persistedTopics.push(data);
        } else {
          const { data, error } = await supabase
            .from('topics')
            .insert(topicPayload)
            .select('*')
            .single();

          if (error) throw error;
          persistedTopics.push(data);
        }
      }

      const percentualDisciplina =
        persistedTopics.length > 0
          ? Math.round(
              (persistedTopics.filter((topic) => topic.concluido).length / persistedTopics.length) * 100
            )
          : 0;

      const { data: refreshedSubject, error: subjectRefreshError } = await supabase
        .from('subjects')
        .update({ percentual: percentualDisciplina })
        .eq('id', savedSubject.id)
        .select('*')
        .single();

      if (subjectRefreshError) throw subjectRefreshError;

      const disciplinaAtualizada = buildDisciplineState(refreshedSubject, persistedTopics);

      setBancoDisciplinas?.((prev) => {
        const exists = prev.some((disciplina) => disciplina.id === disciplinaAtualizada.id);
        if (!exists) return [...prev, disciplinaAtualizada];
        return prev.map((disciplina) =>
          disciplina.id === disciplinaAtualizada.id ? disciplinaAtualizada : disciplina
        );
      });

      setEditingDiscipline(null);
    } catch (error) {
      console.error('Erro ao salvar disciplina:', error);
      showToast(error.message || 'Não foi possível salvar a disciplina.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(4px)',
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          maxHeight: '92vh',
          width: '100%',
          maxWidth: 1024,
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 24,
          background: 'var(--pl-surface)',
          boxShadow: 'var(--pl-sh-high)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--pl-rule)',
            background: 'var(--pl-bg-soft)',
            padding: '20px 32px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--pl-ink)',
                fontFamily: 'var(--pl-sans)',
              }}
            >
              {isNewDiscipline ? 'Nova disciplina' : nome || 'Editar disciplina'}
            </h2>
            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--pl-ink-2)' }}>
              Monte a disciplina, organize os tópicos e deixe o edital pronto para execução.
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              borderRadius: 10,
              padding: 8,
              color: 'var(--pl-ink-3)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--pl-danger-soft)';
              e.currentTarget.style.color = 'var(--pl-danger)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--pl-ink-3)';
            }}
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          {/* Top grid: fields + summary */}
          <div
            style={{
              marginBottom: 40,
              display: 'grid',
              gap: 32,
              gridTemplateColumns: 'minmax(0,1.35fr) 310px',
            }}
          >
            {/* Fields */}
            <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr' }}>
              {/* Nome — spans 2 cols */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                  Nome
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      borderRadius: 20,
                      border: '1px solid var(--pl-rule-2)',
                      background: 'var(--pl-surface)',
                      padding: '10px 16px',
                      boxShadow: 'var(--pl-sh-low)',
                    }}
                  >
                    <Search size={16} style={{ color: 'var(--pl-accent)', flexShrink: 0 }} />
                    <input
                      type="text"
                      value={nome}
                      onFocus={() => setIsSuggestionOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setIsSuggestionOpen(false), 120);
                      }}
                      onChange={(e) => {
                        setNome(e.target.value);
                        setIsSuggestionOpen(true);
                      }}
                      placeholder="Ex.: Direito Constitucional"
                      style={{
                        width: '100%',
                        background: 'transparent',
                        fontSize: 17,
                        fontWeight: 600,
                        color: 'var(--pl-ink)',
                        outline: 'none',
                        border: 'none',
                        fontFamily: 'var(--pl-sans)',
                      }}
                    />
                  </div>

                  {isSuggestionOpen && filteredSubjectSuggestions.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 'calc(100% + 10px)',
                        zIndex: 20,
                        overflow: 'hidden',
                        borderRadius: 18,
                        border: '1px solid var(--pl-rule-2)',
                        background: 'var(--pl-surface)',
                        padding: 8,
                        boxShadow: 'var(--pl-sh-high)',
                      }}
                    >
                      <p
                        className="pl-eyebrow"
                        style={{ padding: '4px 12px 8px', display: 'block' }}
                      >
                        Sugestoes do catalogo
                      </p>
                      <div
                        className="custom-scrollbar"
                        style={{ maxHeight: 256, overflowY: 'auto', paddingRight: 4 }}
                      >
                        {filteredSubjectSuggestions.map((item) => {
                          const isActive = item === matchedSubject?.nome;
                          return (
                            <button
                              key={item}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setNome(item);
                                setIsSuggestionOpen(false);
                              }}
                              style={{
                                display: 'flex',
                                width: '100%',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderRadius: 10,
                                padding: '10px 12px',
                                textAlign: 'left',
                                fontSize: 13,
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                background: isActive ? 'var(--pl-accent-soft)' : 'transparent',
                                color: isActive ? 'var(--pl-accent)' : 'var(--pl-ink)',
                              }}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item}
                              </span>
                              {isActive && (
                                <span
                                  className="pl-tag pl-tag-accent"
                                  style={{ flexShrink: 0, marginLeft: 8 }}
                                >
                                  Padrao
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <p style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                  {matchedSubject
                    ? `Padrao encontrado: ${matchedSubject.nome}`
                    : 'Se precisar, cadastre o nome padrao em Admin > Banco de disciplinas.'}
                </p>
              </div>

              {/* Curso / plano */}
              <div>
                <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                  Objetivo vinculado
                </label>
                <select
                  value={plano}
                  onChange={(e) => setPlano(e.target.value)}
                  className="pl-input"
                  style={{ width: '100%' }}
                >
                  <option value="" disabled>
                    Selecione um objetivo
                  </option>
                  {courseOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <p style={{ marginTop: 6, fontSize: 12, color: 'var(--pl-ink-3)' }}>
                  Toda disciplina pertence a um objetivo do aluno.
                </p>
              </div>

              {/* Cor */}
              <div>
                <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                  Cor
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {COLOR_OPTIONS.map((option) => {
                    const isSelected = cor === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setCor(option)}
                        style={{
                          height: 40,
                          width: 40,
                          borderRadius: 14,
                          border: isSelected
                            ? '2px solid var(--pl-ink)'
                            : '2px solid transparent',
                          backgroundColor: option,
                          transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                          boxShadow: isSelected ? 'var(--pl-sh-low)' : 'none',
                          cursor: 'pointer',
                          transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        title={`Selecionar cor ${option}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Summary card */}
            <div
              style={{
                borderRadius: 24,
                border: '1px solid var(--pl-rule-2)',
                background: 'var(--pl-accent-soft)',
                padding: 20,
              }}
            >
              <p
                className="pl-eyebrow"
                style={{ color: 'var(--pl-accent)' }}
              >
                Resumo da disciplina
              </p>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SummaryLine label="Topicos" value={String(topicos.length)} />
                <SummaryLine label="Concluidos" value={String(topicosConcluidos)} />
                <SummaryLine label="Pendentes" value={String(topicosPendentes)} />
                <SummaryLine label="Aproveitamento" value={`${aproveitamento}%`} />
              </div>
            </div>
          </div>

          {/* Bottom grid: topic form + topic list */}
          <div
            style={{
              display: 'grid',
              gap: 32,
              gridTemplateColumns: '360px minmax(0,1fr)',
            }}
          >
            {/* Topic form */}
            <div
              style={{
                borderRadius: 24,
                border: '1px solid var(--pl-rule)',
                background: 'var(--pl-bg-soft)',
                padding: 20,
              }}
            >
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    borderRadius: 10,
                    background: 'var(--pl-accent-soft)',
                    padding: 8,
                    color: 'var(--pl-accent)',
                    display: 'flex',
                  }}
                >
                  {editingTopicId ? <Edit3 size={16} /> : <Plus size={16} />}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: 'var(--pl-ink)',
                      fontFamily: 'var(--pl-sans)',
                    }}
                  >
                    {editingTopicId ? 'Editar topico' : 'Novo topico'}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--pl-ink-2)' }}>
                    Cadastre o assunto e ja deixe o desempenho inicial configurado.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                    Nome do topico
                  </label>
                  <textarea
                    value={topicForm.nome}
                    onChange={(e) => handleTopicFieldChange('nome', e.target.value)}
                    rows={4}
                    placeholder="Ex.: Controle de constitucionalidade"
                    className="pl-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                      Acertos
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={topicForm.acertos}
                      onChange={(e) => handleTopicFieldChange('acertos', e.target.value)}
                      className="pl-input"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                      Erros
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={topicForm.erros}
                      onChange={(e) => handleTopicFieldChange('erros', e.target.value)}
                      className="pl-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <label
                  style={{
                    display: 'flex',
                    cursor: 'pointer',
                    alignItems: 'center',
                    gap: 12,
                    borderRadius: 12,
                    border: '1px solid var(--pl-rule-2)',
                    background: 'var(--pl-surface)',
                    padding: '10px 16px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={topicForm.concluido}
                    onChange={(e) => handleTopicFieldChange('concluido', e.target.checked)}
                    style={{ height: 16, width: 16, accentColor: 'var(--pl-accent)' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>
                    Marcar como concluido
                  </span>
                </label>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={handleAddOrUpdateTopic}
                    className="pl-btn pl-btn-primary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {editingTopicId ? <Edit3 size={15} /> : <Plus size={15} />}
                    {editingTopicId ? 'Atualizar topico' : 'Adicionar topico'}
                  </button>

                  {editingTopicId && (
                    <button
                      type="button"
                      onClick={resetTopicForm}
                      className="pl-btn pl-btn-ghost"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Topic list */}
            <div>
              <div
                style={{
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  paddingBottom: 8,
                  borderBottom: '1px solid var(--pl-accent)',
                }}
              >
                <div>
                  <h3 className="pl-eyebrow">Topicos</h3>
                  <p style={{ marginTop: 4, fontSize: 13, color: 'var(--pl-ink-2)' }}>
                    Reordene, edite e remova os topicos da disciplina.
                  </p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: 'var(--pl-accent)',
                  }}
                >
                  <Columns size={12} />
                  Organizacao manual
                </div>
              </div>

              <div
                style={{
                  overflow: 'hidden',
                  borderRadius: 16,
                  border: '1px solid var(--pl-rule-2)',
                  background: 'var(--pl-surface)',
                }}
              >
                <div className="custom-scrollbar" style={{ maxHeight: 430, overflowY: 'auto' }}>
                  {topicos.map((topico, index) => (
                    <div
                      key={topico.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 16,
                        padding: 16,
                        borderTop: index === 0 ? 'none' : '1px solid var(--pl-rule)',
                        background: index % 2 === 0 ? 'var(--pl-surface)' : 'var(--pl-bg-soft)',
                      }}
                    >
                      {/* Move buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => handleMoveTopic(topico.id, 'up')}
                          disabled={index === 0}
                          style={{
                            borderRadius: 8,
                            border: '1px solid var(--pl-rule-2)',
                            background: 'var(--pl-surface)',
                            padding: 6,
                            color: 'var(--pl-ink-2)',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            opacity: index === 0 ? 0.4 : 1,
                            display: 'flex',
                          }}
                          title="Mover para cima"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveTopic(topico.id, 'down')}
                          disabled={index === topicos.length - 1}
                          style={{
                            borderRadius: 8,
                            border: '1px solid var(--pl-rule-2)',
                            background: 'var(--pl-surface)',
                            padding: 6,
                            color: 'var(--pl-ink-2)',
                            cursor: index === topicos.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: index === topicos.length - 1 ? 0.4 : 1,
                            display: 'flex',
                          }}
                          title="Mover para baixo"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      {/* Content */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                          <span
                            className="pl-tag"
                            style={{ fontSize: 10, fontWeight: 800 }}
                          >
                            #{index + 1}
                          </span>
                          {topico.concluido && (
                            <span
                              className="pl-tag pl-tag-success"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <CheckCircle2 size={11} />
                              Concluido
                            </span>
                          )}
                        </div>

                        <p
                          style={{
                            marginTop: 12,
                            fontSize: 13,
                            fontWeight: 700,
                            lineHeight: 1.5,
                            color: 'var(--pl-ink)',
                          }}
                        >
                          {topico.nome}
                        </p>

                        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <span className="pl-tag pl-tag-success" style={{ fontSize: 12 }}>
                            Acertos: {toNumber(topico.acertos)}
                          </span>
                          <span className="pl-tag pl-tag-danger" style={{ fontSize: 12 }}>
                            Erros: {toNumber(topico.erros)}
                          </span>
                          <span className="pl-tag pl-tag-accent" style={{ fontSize: 12 }}>
                            %: {getPercentualByQuestions(topico.acertos, topico.erros)}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleEditTopic(topico)}
                          style={{
                            borderRadius: 10,
                            border: '1px solid var(--pl-rule-2)',
                            background: 'var(--pl-surface)',
                            padding: 10,
                            color: 'var(--pl-ink-2)',
                            cursor: 'pointer',
                            display: 'flex',
                            transition: 'background 0.15s, color 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--pl-accent-soft)';
                            e.currentTarget.style.color = 'var(--pl-accent)';
                            e.currentTarget.style.borderColor = 'var(--pl-accent)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--pl-surface)';
                            e.currentTarget.style.color = 'var(--pl-ink-2)';
                            e.currentTarget.style.borderColor = 'var(--pl-rule-2)';
                          }}
                          title="Editar topico"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTopic(topico.id)}
                          style={{
                            borderRadius: 10,
                            border: '1px solid var(--pl-rule-2)',
                            background: 'var(--pl-surface)',
                            padding: 10,
                            color: 'var(--pl-ink-2)',
                            cursor: 'pointer',
                            display: 'flex',
                            transition: 'background 0.15s, color 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--pl-danger-soft)';
                            e.currentTarget.style.color = 'var(--pl-danger)';
                            e.currentTarget.style.borderColor = 'var(--pl-danger)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--pl-surface)';
                            e.currentTarget.style.color = 'var(--pl-ink-2)';
                            e.currentTarget.style.borderColor = 'var(--pl-rule-2)';
                          }}
                          title="Excluir topico"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {topicos.length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                      <div
                        style={{
                          margin: '0 auto',
                          display: 'flex',
                          height: 48,
                          width: 48,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 16,
                          background: 'var(--pl-bg-soft)',
                          color: 'var(--pl-ink-3)',
                        }}
                      >
                        <Plus size={18} />
                      </div>
                      <p style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink-2)' }}>
                        Nenhum topico adicionado ainda.
                      </p>
                      <p style={{ marginTop: 4, fontSize: 13, color: 'var(--pl-ink-3)' }}>
                        Use o formulario ao lado para comecar a estruturar essa disciplina.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--pl-rule)',
            background: 'var(--pl-bg-soft)',
            padding: '16px 32px',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="pl-btn pl-btn-ghost"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="pl-btn pl-btn-primary"
            style={{
              minWidth: 140,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: isSaving ? 0.7 : 1,
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar tudo'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        background: 'var(--pl-surface)',
        padding: '10px 16px',
      }}
    >
      <span
        className="pl-eyebrow"
        style={{ color: 'var(--pl-ink-3)' }}
      >
        {label}
      </span>
      <span
        className="pl-num"
        style={{ fontSize: 18, color: 'var(--pl-ink)' }}
      >
        {value}
      </span>
    </div>
  );
}
