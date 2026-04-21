import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  Copy,
  Crown,
  Database,
  DollarSign,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Layers3,
  LibraryBig,
  Link2,
  Loader2,
  Pencil,
  Plus,
  PlusCircle,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { resolveSubjectCatalogEntry } from '../lib/subjectCatalogUtils';
import { supabase } from '../lib/supabase';

const DRAFT_STORAGE_KEY = 'papirando_admin_concurso_draft';

const STATUS_OPTIONS = [
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'previsto', label: 'Previsto' },
  { value: 'suspeito', label: 'Em análise' },
  { value: 'suspenso', label: 'Suspenso' },
  { value: 'encerrado', label: 'Encerrado' },
];

const ESCOLARIDADE_OPTIONS = [
  { value: 'Nível médio', label: 'Nível médio' },
  { value: 'Nível superior', label: 'Nível superior' },
];

const ETAPA_OPTIONS = [
  { value: 'prova_objetiva', label: 'Prova objetiva' },
  { value: 'prova_discursiva', label: 'Prova discursiva' },
  { value: 'redacao', label: 'Redação' },
  { value: 'taf', label: 'TAF' },
  { value: 'avaliacao_psicologica', label: 'Avaliação psicológica' },
  { value: 'investigacao_social', label: 'Investigação social' },
  { value: 'exames_medicos', label: 'Exames médicos' },
  { value: 'toxicologico', label: 'Exame toxicológico' },
  { value: 'heteroidentificacao', label: 'Heteroidentificação' },
  { value: 'curso_formacao', label: 'Curso de formação' },
];

const AREA_OPTIONS = ['Policial', 'Agropecuária', 'Tribunais', 'Fiscal', 'Controle', 'Legislativo', 'Administrativa', 'Educacao', 'Saude', 'Geral'];

const EMPTY_SUBJECT = { nome: '', cor: '', topicosTexto: '' };
const QUESTION_LABELS = ['A', 'B', 'C', 'D', 'E'];
const EMPTY_QUESTION_FORM = {
  banca: '',
  disciplina: '',
  enunciado: '',
  alternativas: ['', '', '', '', ''],
  gabarito: 'A',
  comentario: '',
  nivel: 'medio',
  tipo: 'multipla_escolha',
};
const EMPTY_FORM = {
  id: null,
  slug: '',
  nome: '',
  plano: '',
  concurso: '',
  area: 'Geral',
  cargo: '',
  banca: '',
  salario: '',
  inscricao_valor: '',
  escolaridade: '',
  vagas: '',
  lotacao: '',
  etapas: '',
  etapas_tags: [],
  taf_itens: ['Corrida'],
  cor: '#2563EB',
  descricao: '',
  is_public: true,
  status_concurso: 'confirmado',
  prova_data: '',
  imagem_url: '',
  edital_url: '',
  disciplinas: [EMPTY_SUBJECT],
};

function truncateQuestionText(value = '', maxLength = 80) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function normalizeQuestionNivel(value = '') {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'facil' || raw === 'fácil') return 'Fácil';
  if (raw === 'medio' || raw === 'médio' || raw === 'media' || raw === 'média') return 'Médio';
  if (raw === 'dificil' || raw === 'difícil') return 'Difícil';
  return 'Médio';
}

function buildSubjectDraft(subject = {}) {
  return {
    nome: subject.nome || '',
    cor: subject.cor || '',
    topicosTexto: Array.isArray(subject.topicos)
      ? subject.topicos.map((topic) => (typeof topic === 'string' ? topic : topic.nome)).join('\n')
      : '',
  };
}

function buildFormFromTemplate(template) {
  return {
    id: template.id,
    slug: template.slug || '',
    nome: template.nome || '',
    plano: template.plano || '',
    concurso: template.concurso || '',
    area: template.area || 'Geral',
    cargo: template.cargo || '',
    banca: template.banca || '',
    salario: template.salario || '',
    inscricao_valor: template.inscricao_valor || '',
    escolaridade: template.escolaridade || '',
    vagas: template.vagas || '',
    lotacao: template.lotacao || '',
    etapas: template.etapas || '',
    etapas_tags: Array.isArray(template.etapas_tags) ? template.etapas_tags : [],
    taf_itens: Array.isArray(template.taf_itens) && template.taf_itens.length > 0 ? template.taf_itens : ['Corrida'],
    cor: template.cor || '#2563EB',
    descricao: template.descricao || '',
    is_public: template.is_public !== false,
    status_concurso: template.status_concurso || 'confirmado',
    prova_data: template.prova_data || '',
    imagem_url: template.imagem_url || '',
    edital_url: template.edital_url || '',
    disciplinas:
      Array.isArray(template.disciplinas) && template.disciplinas.length > 0
        ? template.disciplinas.map((subject) => buildSubjectDraft(subject))
        : [EMPTY_SUBJECT],
  };
}

export default function AdminConcursos({
  currentUserEmail = '',
  concursoCatalog = [],
  subjectCatalog = [],
  onCreateTemplate,
  onUpdateTemplate,
  onDuplicateTemplate,
  onPromoteTemplate,
  onDeleteTemplate,
  onUploadImage,
  onUploadEdital,
  onRemoveImage,
  onRemoveEdital,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingEdital, setIsUploadingEdital] = useState(false);
  const [activePanel, setActivePanel] = useState('concursos');
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION_FORM);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsSaving, setQuestionsSaving] = useState(false);

  useEffect(() => {
    try {
      const storedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!storedDraft) return;
      const parsed = JSON.parse(storedDraft);
      if (!parsed || parsed.id) return;
      setForm((prev) => ({ ...prev, ...parsed, disciplinas: parsed.disciplinas?.length ? parsed.disciplinas : prev.disciplinas }));
    } catch {
      // ignore broken draft
    }
  }, []);

  useEffect(() => {
    if (selectedTemplateId) return;

    const hasMeaningfulData = [form.nome, form.plano, form.concurso, form.cargo, form.banca, form.descricao, form.salario, form.vagas]
      .some((value) => String(value || '').trim()) || form.disciplinas.some((subject) => subject.nome || subject.topicosTexto);

    if (!hasMeaningfulData) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
  }, [form, selectedTemplateId]);

  const stats = useMemo(() => {
    const totalDisciplinas = concursoCatalog.reduce((acc, template) => acc + (template.disciplinas?.length || 0), 0);
    const totalTopicos = concursoCatalog.reduce(
      (acc, template) =>
        acc +
        (template.disciplinas || []).reduce((subjectAcc, subject) => subjectAcc + (subject.topicos?.length || 0), 0),
      0
    );
    const publicados = concursoCatalog.filter((template) => template.is_public).length;
    const rascunhos = concursoCatalog.filter((template) => !template.is_public).length;
    const semImagem = concursoCatalog.filter((template) => !template.imagem_url).length;
    const semEdital = concursoCatalog.filter((template) => !template.edital_url).length;
    const semProva = concursoCatalog.filter((template) => !template.prova_data).length;
    const semTopicos = concursoCatalog.filter(
      (template) => (template.disciplinas || []).every((subject) => !subject.topicos || subject.topicos.length === 0)
    ).length;

    return {
      templates: concursoCatalog.length,
      disciplinas: totalDisciplinas,
      topicos: totalTopicos,
      publicados,
      rascunhos,
      semImagem,
      semEdital,
      semProva,
      semTopicos,
    };
  }, [concursoCatalog]);

  const contestSections = useMemo(() => {
    const grouped = concursoCatalog.reduce((acc, template) => {
      const area = template.area || 'Geral';
      if (!acc[area]) acc[area] = [];
      acc[area].push(template);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
      .map(([area, templates]) => [
        area,
        templates.sort((first, second) => first.nome.localeCompare(second.nome, 'pt-BR')),
      ]);
  }, [concursoCatalog]);

  const selectedTemplate = useMemo(
    () => concursoCatalog.find((template) => template.id === selectedTemplateId) || null,
    [concursoCatalog, selectedTemplateId]
  );

  const visibleQuestions = useMemo(
    () => questions.filter((item) => item?.is_active !== false),
    [questions]
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedTemplateId('');
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleEtapaTag = (value) => {
    setForm((prev) => {
      const exists = prev.etapas_tags.includes(value);
      const etapasTags = exists ? prev.etapas_tags.filter((item) => item !== value) : [...prev.etapas_tags, value];
      return {
        ...prev,
        etapas_tags: etapasTags,
        taf_itens: etapasTags.includes('taf') ? prev.taf_itens : ['Corrida'],
      };
    });
  };

  const updateTafItem = (index, value) => {
    setForm((prev) => ({
      ...prev,
      taf_itens: prev.taf_itens.map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  };

  const addTafItem = () => {
    setForm((prev) => ({
      ...prev,
      taf_itens: [...prev.taf_itens, ''],
    }));
  };

  const removeTafItem = (index) => {
    setForm((prev) => ({
      ...prev,
      taf_itens: prev.taf_itens.length === 1 ? [''] : prev.taf_itens.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateSubjectField = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      disciplinas: prev.disciplinas.map((subject, subjectIndex) =>
        subjectIndex === index ? { ...subject, [field]: value } : subject
      ),
    }));
  };

  const addSubject = () => {
    setForm((prev) => ({
      ...prev,
      disciplinas: [...prev.disciplinas, { ...EMPTY_SUBJECT }],
    }));
  };

  const removeSubject = (index) => {
    setForm((prev) => ({
      ...prev,
      disciplinas: prev.disciplinas.length === 1 ? [{ ...EMPTY_SUBJECT }] : prev.disciplinas.filter((_, i) => i !== index),
    }));
  };

  const normalizeDraftToPayload = () => ({
    id: form.id,
    slug: form.slug,
    nome: form.nome.trim(),
    plano: form.plano.trim() || form.nome.trim(),
    concurso: form.concurso.trim() || form.nome.trim(),
    area: form.area || 'Geral',
    cargo: form.cargo.trim(),
    banca: form.banca.trim() || 'A definir',
    salario: form.salario.trim(),
    inscricao_valor: form.inscricao_valor.trim(),
    escolaridade: form.escolaridade.trim(),
    vagas: form.vagas.trim(),
    lotacao: form.lotacao.trim(),
    etapas: form.etapas.trim(),
    etapas_tags: form.etapas_tags,
    taf_itens: form.taf_itens.map((item) => String(item || '').trim()).filter(Boolean),
    cor: form.cor,
    descricao: form.descricao.trim(),
    is_public: form.is_public,
    status_concurso: form.status_concurso,
    prova_data: form.prova_data,
    imagem_url: form.imagem_url.trim(),
    edital_url: form.edital_url.trim(),
    disciplinas: form.disciplinas
      .map((subject, subjectIndex) => ({
        nome: subject.nome.trim(),
        ordem: subjectIndex,
        cor: subject.cor || '',
        topicos: subject.topicosTexto
          .split('\n')
          .map((topic) => topic.trim())
          .filter(Boolean)
          .map((topic, topicIndex) => ({
            nome: topic,
            ordem: topicIndex,
          })),
      }))
      .filter((subject) => subject.nome),
  });

  const subjectSuggestions = useMemo(
    () =>
      subjectCatalog
        .map((entry) => entry.nome)
        .filter(Boolean)
        .sort((first, second) => first.localeCompare(second, 'pt-BR')),
    [subjectCatalog]
  );

  const handleSave = async () => {
    const payload = normalizeDraftToPayload();

    if (!payload.nome) {
      alert('Digite o nome do concurso.');
      return;
    }

    if (payload.disciplinas.length === 0) {
      alert('Cadastre ao menos uma disciplina.');
      return;
    }

    setIsSaving(true);

    try {
      if (payload.id) {
        await onUpdateTemplate?.(payload);
      } else {
        await onCreateTemplate?.(payload);
      }

      resetForm();
    } catch (error) {
      alert(error.message || 'Não foi possível salvar o concurso.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplateId(template.id);
    setForm(buildFormFromTemplate(template));
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Envie uma imagem PNG, JPG ou WEBP.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const url = await onUploadImage?.({ file, currentUrl: form.imagem_url });
      if (url) updateFormField('imagem_url', url);
    } catch (error) {
      alert(error.message || 'Não foi possível enviar a imagem.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleEditalUpload = async (file) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      alert('Envie um arquivo PDF.');
      return;
    }

    setIsUploadingEdital(true);
    try {
      const url = await onUploadEdital?.({ file, currentUrl: form.edital_url });
      if (url) updateFormField('edital_url', url);
    } catch (error) {
      alert(error.message || 'Não foi possível enviar o edital.');
    } finally {
      setIsUploadingEdital(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!form.imagem_url) return;
    try {
      await onRemoveImage?.({ url: form.imagem_url });
      updateFormField('imagem_url', '');
    } catch (error) {
      alert(error.message || 'Não foi possível remover a imagem.');
    }
  };

  const handleRemoveEdital = async () => {
    if (!form.edital_url) return;
    try {
      await onRemoveEdital?.({ url: form.edital_url });
      updateFormField('edital_url', '');
    } catch (error) {
      alert(error.message || 'Não foi possível remover o edital.');
    }
  };

  const handleDeleteSelected = async (template = null) => {
    const target = template || selectedTemplate;
    if (!target) return;

    try {
      await onDeleteTemplate?.(target);
      if (target.id === selectedTemplateId) {
        resetForm();
      }
    } catch (error) {
      alert(error.message || 'Não foi possível excluir o concurso.');
    }
  };

  const loadQuestions = async () => {
    setQuestionsLoading(true);

    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar banco de questões:', error);
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const updateQuestionAlternative = (index, value) => {
    setQuestionForm((prev) => ({
      ...prev,
      alternativas: prev.alternativas.map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  };

  const handleSaveQuestion = async () => {
    if (!String(questionForm.enunciado || '').trim()) {
      alert('Preencha o enunciado da questão.');
      return;
    }

    if (questionForm.alternativas.some((item) => !String(item || '').trim())) {
      alert('Preencha todas as 5 alternativas.');
      return;
    }

    setQuestionsSaving(true);

    try {
      const payload = {
        banca: String(questionForm.banca || '').trim(),
        disciplina: String(questionForm.disciplina || '').trim(),
        enunciado: String(questionForm.enunciado || '').trim(),
        alternativas: questionForm.alternativas.map((item) => String(item || '').trim()),
        gabarito: questionForm.gabarito,
        comentario: String(questionForm.comentario || '').trim(),
        nivel: questionForm.nivel,
        tipo: questionForm.tipo,
        is_active: true,
      };

      const { error } = await supabase.from('questions').insert(payload);
      if (error) throw error;

      setQuestionForm(EMPTY_QUESTION_FORM);
      await loadQuestions();
    } catch (error) {
      alert(error.message || 'Não foi possível salvar a questão.');
    } finally {
      setQuestionsSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_active: false })
        .eq('id', questionId);

      if (error) throw error;
      await loadQuestions();
    } catch (error) {
      alert(error.message || 'Não foi possível excluir a questão.');
    }
  };

  return (
    <div className="page-shell mx-auto flex h-full w-full max-w-[1320px] flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-[2rem] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">
            <ShieldCheck size={13} />
            Painel administrativo
          </div>
          <h2 className="page-title mt-4 text-4xl font-semibold tracking-tight text-slate-900">Central de concursos</h2>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-gray-500">
            Organize a biblioteca por area, acompanhe pendencias editoriais e mantenha os concursos prontos para importacao.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-amber-100 bg-white px-5 py-4 text-sm shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Admin ativo</p>
          <p className="mt-2 font-semibold text-slate-900">{currentUserEmail}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard icon={LibraryBig} label="Concursos" value={stats.templates} />
        <StatCard icon={BadgeCheck} label="Publicados" value={stats.publicados} />
        <StatCard icon={EyeOff} label="Rascunhos" value={stats.rascunhos} />
        <StatCard icon={Database} label="Disciplinas" value={stats.disciplinas} />
        <StatCard icon={Layers3} label="Topicos" value={stats.topicos} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <InsightCard title="Sem imagem" value={stats.semImagem} text="Concursos ainda sem capa visual." />
        <InsightCard title="Sem edital" value={stats.semEdital} text="Itens sem PDF oficial publicado." />
        <InsightCard title="Sem prova" value={stats.semProva} text="Concursos sem data definida." />
        <InsightCard title="Sem topicos" value={stats.semTopicos} text="Disciplinas ainda superficiais." />
      </div>

      <div className="rounded-[1.6rem] border border-gray-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'concursos', label: 'Concursos', icon: LibraryBig },
            { id: 'questoes', label: 'Banco de Questões', icon: FileText },
          ].map((tab) => {
            const active = activePanel === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePanel(tab.id)}
                className={`inline-flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-[#1A365D] text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-[#1A365D]'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activePanel === 'concursos' ? (
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Biblioteca</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">Por area</h3>
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
            {contestSections.map(([area, templates]) => (
              <div key={area}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">{area}</p>
                  <span className="text-xs font-bold text-gray-400">{templates.length}</span>
                </div>

                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`rounded-[1.3rem] border transition-all ${
                        selectedTemplateId === template.id
                          ? 'border-blue-200 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-gray-50/70 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => handleEditTemplate(template)}
                          className="min-w-0 flex-1 rounded-[1rem] px-2 py-2 text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{template.nome}</p>
                              <p className="mt-1 truncate text-xs font-semibold text-gray-500">
                                {template.cargo || template.concurso}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${
                                    template.storage === 'supabase'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  {template.storage === 'supabase' ? 'Supabase' : 'Local'}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${
                                template.is_public ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {template.is_public ? 'On' : 'Draft'}
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSelected(template)}
                          className="shrink-0 rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title={`Excluir ${template.nome}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Editor do concurso</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                {form.id ? 'Editando concurso' : 'Novo concurso'}
              </h3>
              <p className="mt-2 text-sm font-semibold text-gray-500">
                {form.id
                  ? 'As acoes principais ficam aqui em cima: salvar, duplicar ou excluir.'
                  : 'Preencha os dados principais e depois monte as disciplinas e topicos.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge isPublic={form.is_public} />
              <StatusPill value={form.status_concurso} />
              {selectedTemplate && (
                <StorageBadge storage={selectedTemplate.storage} />
              )}
              {selectedTemplate?.storage !== 'supabase' && (
                <button
                  type="button"
                  onClick={() => onPromoteTemplate?.(selectedTemplate)}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700"
                >
                  <Database size={15} />
                  Trazer para Supabase
                </button>
              )}
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => onDuplicateTemplate?.(selectedTemplate)}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700"
                >
                  <Copy size={15} />
                  Duplicar
                </button>
              )}
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => handleDeleteSelected(selectedTemplate)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700"
                >
                  <Trash2 size={15} />
                  Excluir concurso
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="space-y-4 rounded-[1.6rem] border border-gray-200 bg-gray-50/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Midia do concurso</p>

              <div className="overflow-hidden rounded-[1.4rem] border border-gray-200 bg-white">
                {form.imagem_url ? (
                  <img src={form.imagem_url} alt={form.nome || 'Curso'} className="h-44 w-full object-cover" />
                ) : (
                  <div
                    className="flex h-44 w-full items-center justify-center text-white"
                    style={{ background: `linear-gradient(135deg, ${form.cor || '#2563EB'} 0%, #1A365D 100%)` }}
                  >
                    <ImageIcon size={36} />
                  </div>
                )}
              </div>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100">
                {isUploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {isUploadingImage ? 'Enviando imagem...' : 'Upload de imagem'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0])} />
              </label>

              <input
                value={form.imagem_url}
                onChange={(e) => updateFormField('imagem_url', e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                placeholder="URL final da imagem"
              />

              <div className="flex gap-2">
                {form.imagem_url && (
                  <button type="button" onClick={() => window.open(form.imagem_url, '_blank', 'noopener,noreferrer')} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600">
                    Abrir imagem
                  </button>
                )}
                {form.imagem_url && (
                  <button type="button" onClick={handleRemoveImage} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                    Remover
                  </button>
                )}
              </div>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100">
                {isUploadingEdital ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                {isUploadingEdital ? 'Enviando edital...' : 'Upload de PDF'}
                <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleEditalUpload(e.target.files?.[0])} />
              </label>

              <input
                value={form.edital_url}
                onChange={(e) => updateFormField('edital_url', e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                placeholder="URL final do edital PDF"
              />

              <div className="flex gap-2">
                {form.edital_url && (
                  <button type="button" onClick={() => window.open(form.edital_url, '_blank', 'noopener,noreferrer')} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600">
                    Abrir edital
                  </button>
                )}
                {form.edital_url && (
                  <button type="button" onClick={handleRemoveEdital} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                    Remover
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <TextField label="Nome do concurso" value={form.nome} onChange={(value) => updateFormField('nome', value)} />
                <TextField label="Plano interno" value={form.plano} onChange={(value) => updateFormField('plano', value)} />
                <TextField label="Concurso / orgao" value={form.concurso} onChange={(value) => updateFormField('concurso', value)} />
                <SelectField label="Area" value={form.area} onChange={(value) => updateFormField('area', value)} options={AREA_OPTIONS.map((value) => ({ value, label: value }))} />
                <TextField label="Cargo" value={form.cargo} onChange={(value) => updateFormField('cargo', value)} />
                <TextField label="Banca" value={form.banca} onChange={(value) => updateFormField('banca', value)} />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <TextField label="Salario" value={form.salario} onChange={(value) => updateFormField('salario', value)} placeholder="Ex: R$ 5.516,71" icon={DollarSign} />
                <TextField label="Valor da inscricao" value={form.inscricao_valor} onChange={(value) => updateFormField('inscricao_valor', value)} placeholder="Ex: R$ 150,00" icon={DollarSign} />
                <SelectField label="Escolaridade" value={form.escolaridade} onChange={(value) => updateFormField('escolaridade', value)} options={ESCOLARIDADE_OPTIONS} icon={GraduationCap} />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <TextField label="Vagas" value={form.vagas} onChange={(value) => updateFormField('vagas', value)} placeholder="Ex: 500 vagas + CR" />
                <TextField label="Lotacao" value={form.lotacao} onChange={(value) => updateFormField('lotacao', value)} placeholder="Ex: Alagoas" />
                <TextField label="Resumo das etapas" value={form.etapas} onChange={(value) => updateFormField('etapas', value)} placeholder="Ex: Prova, TAF, psicologico" />
              </div>

              <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Etapas do concurso</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {ETAPA_OPTIONS.map((option) => {
                    const active = form.etapas_tags.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleEtapaTag(option.value)}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                          active ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {form.etapas_tags.includes('taf') && (
                  <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-blue-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Itens do TAF</p>
                        <p className="mt-1 text-xs font-semibold text-gray-500">Adicione as provas físicas que fazem parte do teste.</p>
                      </div>
                      <button type="button" onClick={addTafItem} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700">
                        + Item
                      </button>
                    </div>

                    <div className="space-y-3">
                      {form.taf_itens.map((item, index) => (
                        <div key={`taf-${index}`} className="flex items-center gap-3">
                          <input
                            value={item}
                            onChange={(e) => updateTafItem(index, e.target.value)}
                            placeholder="Ex.: Corrida de 12 minutos"
                            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeTafItem(index)}
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-bold text-red-600"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-[150px_1fr_1fr_180px]">
                <ColorField value={form.cor} onChange={(value) => updateFormField('cor', value)} />
                <DateField value={form.prova_data} onChange={(value) => updateFormField('prova_data', value)} />
                <SelectField label="Status do concurso" value={form.status_concurso} onChange={(value) => updateFormField('status_concurso', value)} options={STATUS_OPTIONS} />
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => updateFormField('is_public', !form.is_public)}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${
                      form.is_public ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {form.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                    {form.is_public ? 'Publicado' : 'Rascunho'}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Descricao curta</label>
                  <textarea
                    rows={4}
                    value={form.descricao}
                    onChange={(e) => updateFormField('descricao', e.target.value)}
                    className="w-full rounded-[1.5rem] border border-gray-200 bg-gray-50/70 px-4 py-4 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Checklist editorial</p>
                  <div className="mt-4 space-y-3 text-sm font-semibold text-gray-600">
                    <ChecklistRow ok={Boolean(form.area)} label="Area definida" />
                    <ChecklistRow ok={Boolean(form.cargo)} label="Cargo identificado" />
                    <ChecklistRow ok={Boolean(form.prova_data)} label="Data da prova preenchida" />
                    <ChecklistRow ok={Boolean(form.imagem_url)} label="Imagem publicada" />
                    <ChecklistRow ok={Boolean(form.edital_url)} label="PDF do edital publicado" />
                    <ChecklistRow ok={form.disciplinas.some((subject) => subject.topicosTexto.trim())} label="Topicos cadastrados" />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Conteudo programatico</p>
                    <h4 className="mt-1 text-lg font-semibold text-slate-900">Disciplinas e topicos</h4>
                  </div>

                  <button type="button" onClick={addSubject} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                    <PlusCircle size={16} />
                    Nova disciplina
                  </button>
                </div>

                <div className="space-y-4">
                  {form.disciplinas.map((subject, index) => (
                    <div key={`subject-${index}`} className="rounded-[1.6rem] border border-gray-200 bg-white p-4">
                      {(() => {
                        const matchedSubject = resolveSubjectCatalogEntry(subject.nome, subjectCatalog);
                        return (
                          <>
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-slate-900">Disciplina {index + 1}</p>
                        <button type="button" onClick={() => removeSubject(index)} className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500" title="Remover disciplina">
                          <X size={16} />
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
                        <div>
                          <TextField
                            label="Nome da disciplina"
                            value={subject.nome}
                            onChange={(value) => updateSubjectField(index, 'nome', value)}
                            placeholder="Ex: Lingua Portuguesa"
                            listId={`subject-catalog-${index}`}
                          />
                          <datalist id={`subject-catalog-${index}`}>
                            {subjectSuggestions.map((item) => (
                              <option key={`${index}-${item}`} value={item} />
                            ))}
                          </datalist>
                          <p className="mt-2 text-xs font-semibold text-gray-500">
                            {matchedSubject
                              ? `Padrao encontrado: ${matchedSubject.nome}`
                              : 'Sem correspondencia no banco padrao. Se necessario, cadastre em Admin > Banco de disciplinas.'}
                          </p>
                        </div>
                        <ColorField compact value={subject.cor || '#2563EB'} onChange={(value) => updateSubjectField(index, 'cor', value)} />
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Topicos da disciplina</label>
                        <textarea
                          rows={6}
                          value={subject.topicosTexto}
                          onChange={(e) => updateSubjectField(index, 'topicosTexto', e.target.value)}
                          placeholder={`Um topico por linha\nConceitos iniciais\nPoder de policia\nAtos administrativos`}
                          className="w-full rounded-[1.4rem] border border-gray-200 bg-gray-50/70 px-4 py-4 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        />
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={addSubject}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"
                  >
                    <PlusCircle size={16} />
                    Nova disciplina
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 mt-6 border-t border-gray-200 bg-white/95 pt-4 backdrop-blur">
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={addSubject}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700"
              >
                <PlusCircle size={16} />
                Nova disciplina
              </button>
              {form.id && (
                <button type="button" onClick={resetForm} className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600">
                  Cancelar edicao
                </button>
              )}
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => onDuplicateTemplate?.(selectedTemplate)}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-bold text-indigo-700"
                >
                  <Copy size={16} />
                  Duplicar
                </button>
              )}
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => handleDeleteSelected(selectedTemplate)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700"
                >
                  <Trash2 size={16} />
                  Excluir
                </button>
              )}
              <button onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-70">
                <Plus size={16} />
                {isSaving ? 'Salvando...' : form.id ? 'Atualizar concurso' : 'Criar concurso'}
              </button>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Banco de questões</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">Cadastrar nova questão</h3>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Banca" value={questionForm.banca} onChange={(value) => setQuestionForm((prev) => ({ ...prev, banca: value }))} />
                <TextField label="Disciplina" value={questionForm.disciplina} onChange={(value) => setQuestionForm((prev) => ({ ...prev, disciplina: value }))} />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Enunciado</label>
                <textarea
                  rows={6}
                  value={questionForm.enunciado}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, enunciado: e.target.value }))}
                  className="w-full rounded-[1.5rem] border border-gray-200 bg-gray-50/70 px-4 py-4 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Alternativas</p>
                {QUESTION_LABELS.map((label, index) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-700">
                      {label}
                    </span>
                    <input
                      value={questionForm.alternativas[index]}
                      onChange={(e) => updateQuestionAlternative(index, e.target.value)}
                      className="flex-1 rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      placeholder={`Alternativa ${label}`}
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SelectField
                  label="Gabarito"
                  value={questionForm.gabarito}
                  onChange={(value) => setQuestionForm((prev) => ({ ...prev, gabarito: value }))}
                  options={QUESTION_LABELS.map((label) => ({ value: label, label }))}
                />
                <SelectField
                  label="Nível"
                  value={questionForm.nivel}
                  onChange={(value) => setQuestionForm((prev) => ({ ...prev, nivel: value }))}
                  options={[
                    { value: 'facil', label: 'Fácil' },
                    { value: 'medio', label: 'Médio' },
                    { value: 'dificil', label: 'Difícil' },
                  ]}
                />
                <SelectField
                  label="Tipo"
                  value={questionForm.tipo}
                  onChange={(value) => setQuestionForm((prev) => ({ ...prev, tipo: value }))}
                  options={[
                    { value: 'multipla_escolha', label: 'Múltipla escolha' },
                    { value: 'certo_errado', label: 'Certo ou errado' },
                  ]}
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Comentário</label>
                <textarea
                  rows={5}
                  value={questionForm.comentario}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, comentario: e.target.value }))}
                  className="w-full rounded-[1.5rem] border border-gray-200 bg-gray-50/70 px-4 py-4 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSaveQuestion}
                disabled={questionsSaving}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
              >
                <Plus size={16} />
                {questionsSaving ? 'Salvando...' : 'Salvar questão'}
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Listagem</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">Questões cadastradas</h3>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                {visibleQuestions.length} ativas
              </span>
            </div>

            {questionsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-blue-500" />
              </div>
            ) : visibleQuestions.length === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-gray-200 bg-gray-50/70 px-6 py-12 text-center">
                <p className="text-sm font-semibold text-gray-500">Nenhuma questão cadastrada ainda.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[1.6rem] border border-gray-200">
                <div className="grid grid-cols-[120px_140px_minmax(0,1fr)_100px_100px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                  <span>Banca</span>
                  <span>Disciplina</span>
                  <span>Enunciado</span>
                  <span>Nível</span>
                  <span>Ações</span>
                </div>

                <div className="divide-y divide-gray-200">
                  {visibleQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="grid grid-cols-[120px_140px_minmax(0,1fr)_100px_100px] gap-3 px-4 py-4 text-sm font-semibold text-gray-700"
                    >
                      <span>{question.banca || '-'}</span>
                      <span>{question.disciplina || '-'}</span>
                      <span className="text-gray-600">{truncateQuestionText(question.enunciado, 80)}</span>
                      <span>{normalizeQuestionNivel(question.nivel)}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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

function InsightCard({ title, value, text }) {
  return (
    <div className="rounded-[1.6rem] border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm font-semibold text-gray-500">{text}</p>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder = '', icon: Icon = null, listId = '' }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />}
        <input
          value={value}
          placeholder={placeholder}
          list={listId || undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border border-gray-200 bg-gray-50/70 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50 ${Icon ? 'pl-11 pr-4' : 'px-4'}`}
        />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, icon: Icon = null }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border border-gray-200 bg-gray-50/70 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50 ${Icon ? 'pl-11 pr-4' : 'px-4'}`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ColorField({ value, onChange, compact = false }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
        {compact ? 'Cor da disciplina' : 'Cor'}
      </label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-2xl border border-gray-200 bg-white p-2 ${compact ? 'h-12' : 'h-12'}`}
      />
    </div>
  );
}

function DateField({ value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Data da prova</label>
      <div className="relative">
        <CalendarDays size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 py-3 pl-11 pr-4 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
        />
      </div>
    </div>
  );
}

function StatusBadge({ isPublic }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
      {isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
      {isPublic ? 'Publicado' : 'Rascunho'}
    </div>
  );
}

function StatusPill({ value }) {
  const option = STATUS_OPTIONS.find((item) => item.value === value);
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
      <BadgeCheck size={14} />
      {option?.label || 'Em análise'}
    </div>
  );
}

function StorageBadge({ storage = 'local' }) {
  const isSupabase = storage === 'supabase';
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
        isSupabase ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      <Database size={14} />
      {isSupabase ? 'Gerenciado no Supabase' : 'Vindo do catalogo local'}
    </div>
  );
}

function ChecklistRow({ ok, label }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      {ok ? <BadgeCheck size={14} /> : <EyeOff size={14} />}
      <span>{label}</span>
    </div>
  );
}
