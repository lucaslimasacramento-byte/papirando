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
    const planos = [...new Set((cursos || []).map((curso) => curso.plano).filter(Boolean))];
    return ['Geral', ...planos];
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
    setPlano(initialData.plano);
    setCor(initialData.cor);
    setTopicos(initialData.topicos);
    setTopicForm(EMPTY_TOPIC_FORM);
    setEditingTopicId(null);
    setRemovedTopicIds([]);
    setIsSuggestionOpen(false);
  }, [initialData, isOpen]);

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
      alert('Digite o nome do tópico.');
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

  const handleDeleteTopic = (topicId) => {
    const topico = topicos.find((item) => item.id === topicId);
    if (!topico) return;

    const confirmar = window.confirm(`Excluir o tópico "${topico.nome}"?`);
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
    const planoTratado = plano.trim() || 'Geral';
    const subjectCatalogId = resolveSubjectCatalogEntry(nomeTratado, subjectCatalog)?.id || null;

    if (!nomeTratado) {
      alert('Digite o nome da disciplina.');
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
      alert(error.message || 'Não foi possível salvar a disciplina.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1A365D]/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-8 py-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {isNewDiscipline ? 'Nova disciplina' : nome || 'Editar disciplina'}
            </h2>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Monte a disciplina, organize os tópicos e deixe o edital pronto para execução.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
          <div className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_310px]">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Nome
                </label>
                <div className="relative">
                  <div className="flex items-center gap-3 rounded-[1.35rem] border border-blue-100 bg-white px-4 py-3 shadow-sm transition-colors focus-within:border-[#1e3a5f] focus-within:ring-4 focus-within:ring-blue-50">
                    <Search size={16} className="text-blue-500" />
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
                      className="w-full bg-transparent text-lg font-semibold text-gray-800 outline-none placeholder:text-gray-400"
                    />
                  </div>

                  {isSuggestionOpen && filteredSubjectSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-20 overflow-hidden rounded-[1.2rem] border border-gray-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                      <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                        Sugestões do catálogo
                      </p>
                      <div className="max-h-64 space-y-1 overflow-y-auto custom-scrollbar pr-1">
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
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors ${
                                isActive
                                  ? 'bg-blue-50 text-[#1e3a5f]'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span className="truncate">{item}</span>
                              {isActive && (
                                <span className="rounded-full border border-blue-100 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
                                  Padrão
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs font-semibold text-gray-500">
                  {matchedSubject
                    ? `Padrão encontrado: ${matchedSubject.nome}`
                    : 'Se precisar, cadastre o nome padrão em Admin > Banco de disciplinas.'}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Curso / plano
                </label>
                <select
                  value={plano}
                  onChange={(e) => setPlano(e.target.value)}
                  className="w-full border-b-2 border-gray-200 bg-transparent py-2 text-sm font-semibold text-gray-700 outline-none transition-colors focus:border-[#1e3a5f]"
                >
                  {courseOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Cor
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((option) => {
                    const isSelected = cor === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setCor(option)}
                        className={`h-10 w-10 rounded-2xl border-2 transition-all ${
                          isSelected ? 'scale-105 border-gray-900 shadow-md' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: option }}
                        title={`Selecionar cor ${option}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-blue-100 bg-blue-50/60 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
                Resumo da disciplina
              </p>
              <div className="mt-4 space-y-3">
                <SummaryLine label="Tópicos" value={String(topicos.length)} />
                <SummaryLine label="Concluídos" value={String(topicosConcluidos)} />
                <SummaryLine label="Pendentes" value={String(topicosPendentes)} />
                <SummaryLine label="Aproveitamento" value={`${aproveitamento}%`} />
              </div>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-[2rem] border border-gray-100 bg-gray-50/60 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                  {editingTopicId ? <Edit3 size={16} /> : <Plus size={16} />}
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1A365D]">
                    {editingTopicId ? 'Editar tópico' : 'Novo tópico'}
                  </h3>
                  <p className="text-sm font-medium text-gray-500">
                    Cadastre o assunto e já deixe o desempenho inicial configurado.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Nome do tópico
                  </label>
                  <textarea
                    value={topicForm.nome}
                    onChange={(e) => handleTopicFieldChange('nome', e.target.value)}
                    rows={4}
                    placeholder="Ex.: Controle de constitucionalidade"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Acertos
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={topicForm.acertos}
                      onChange={(e) => handleTopicFieldChange('acertos', e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Erros
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={topicForm.erros}
                      onChange={(e) => handleTopicFieldChange('erros', e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
                  <input
                    type="checkbox"
                    checked={topicForm.concluido}
                    onChange={(e) => handleTopicFieldChange('concluido', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                  />
                  <span className="text-sm font-semibold text-gray-700">Marcar como concluído</span>
                </label>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleAddOrUpdateTopic}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1e3a5f] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1e3a5f]"
                  >
                    {editingTopicId ? <Edit3 size={15} /> : <Plus size={15} />}
                    {editingTopicId ? 'Atualizar tópico' : 'Adicionar tópico'}
                  </button>

                  {editingTopicId && (
                    <button
                      type="button"
                      onClick={resetTopicForm}
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-end justify-between border-b border-[#1e3a5f] pb-2">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Tópicos
                  </h3>
                  <p className="mt-1 text-sm font-medium text-gray-500">
                    Reordene, edite e remova os tópicos da disciplina.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#1e3a5f]">
                  <Columns size={12} />
                  Organização manual
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="custom-scrollbar max-h-[430px] overflow-y-auto">
                  <div className="divide-y divide-gray-100">
                    {topicos.map((topico, index) => (
                      <div
                        key={topico.id}
                        className={`flex items-start gap-4 p-4 transition-colors hover:bg-blue-50/30 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                        }`}
                      >
                        <div className="flex flex-col gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleMoveTopic(topico.id, 'up')}
                            disabled={index === 0}
                            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Mover para cima"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveTopic(topico.id, 'down')}
                            disabled={index === topicos.length - 1}
                            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Mover para baixo"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                              #{index + 1}
                            </span>
                            {topico.concluido && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                <CheckCircle2 size={11} />
                                Concluído
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-sm font-bold leading-relaxed text-gray-800">
                            {topico.nome}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-600">
                              Acertos: {toNumber(topico.acertos)}
                            </span>
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-500">
                              Erros: {toNumber(topico.erros)}
                            </span>
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-600">
                              %: {getPercentualByQuestions(topico.acertos, topico.erros)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditTopic(topico)}
                            className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#1e3a5f]"
                            title="Editar tópico"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTopic(topico.id)}
                            className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                            title="Excluir tópico"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {topicos.length === 0 && (
                      <div className="p-10 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                          <Plus size={18} />
                        </div>
                        <p className="mt-4 text-sm font-bold text-gray-500">
                          Nenhum tópico adicionado ainda.
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-400">
                          Use o formulário ao lado para começar a estruturar essa disciplina.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-8 py-5">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] px-10 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1e3a5f] disabled:cursor-not-allowed disabled:opacity-70"
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
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">{label}</span>
      <span className="text-lg font-black text-[#1A365D]">{value}</span>
    </div>
  );
}
