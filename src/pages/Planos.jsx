import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Book,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  EyeOff,
  Layers3,
  LibraryBig,
  Loader2,
  PenTool,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { analyzeEdital } from '../lib/aiClient';
import { buildContestForRole, getContestRoles, groupContestTemplates } from '../lib/contestGrouping';
import PageHeadPremium from '../components/PageHeadPremium';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const EMPTY_COURSE_FORM = {
  nome: '',
  plano: '',
  concurso: '',
  banca: '',
  cor: '#2563EB',
};

const formatStatusLabel = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'Em análise';

  const labels = {
    em_analise: 'Em análise',
    aberto: 'Aberto',
    autorizado: 'Autorizado',
    previsto: 'Previsto',
    publicado: 'Publicado',
    suspenso: 'Suspenso',
    confirmado: 'Confirmado',
  };

  return labels[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDateDisplay = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parts = raw.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return raw;
};

export default function Planos({
  setActiveTab,
  cursos = [],
  bancoDisciplinas = [],
  myContests = [],
  targetContest = null,
  onSetTargetContest,
  onOpenContestDetail,
  onCreateCourse,
  onImportCatalogCourse,
  onImportEdital,
  onAnalyzeEdital,
  onDeleteCourse,
  setSelectedCoursePlan,
  concursoCatalog = [],
  remainingCourseSlots = 3,
  isAdmin = false,
}) {
  const [mode, setMode] = useState(null);
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE_FORM);
  const [iaForm, setIaForm] = useState({
    nome: '',
    plano: '',
    concurso: '',
    banca: '',
    editalText: '',
  });
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImportingCatalog, setIsImportingCatalog] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedContestId, setSelectedContestId] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const [expandedCatalogAreas, setExpandedCatalogAreas] = useState({});
  const limiteAtingido = !isAdmin && remainingCourseSlots <= 0;

  const cursoStats = useMemo(() => {
    return cursos.map((curso) => {
      const disciplinas = bancoDisciplinas.filter((disciplina) => disciplina.plano === curso.plano);
      const totalTopicos = disciplinas.reduce((acc, disciplina) => acc + (disciplina.topicos?.length || 0), 0);
      const concluidos = disciplinas.reduce(
        (acc, disciplina) => acc + (disciplina.topicos?.filter((topico) => topico.concluido).length || 0),
        0
      );

      return {
        ...curso,
        disciplinasCount: disciplinas.length,
        topicosCount: totalTopicos,
        progresso: totalTopicos > 0 ? Math.round((concluidos / totalTopicos) * 100) : 0,
      };
    });
  }, [bancoDisciplinas, cursos]);

  const contestSections = useMemo(() => {
    const groupedCatalog = groupContestTemplates(concursoCatalog);
    const grouped = groupedCatalog.reduce((acc, template) => {
      const area = template.area || 'Geral';
      if (!acc[area]) acc[area] = [];
      acc[area].push(template);
      return acc;
    }, {});

    return Object.entries(grouped).sort(([areaA], [areaB]) => areaA.localeCompare(areaB, 'pt-BR'));
  }, [concursoCatalog]);

  const resetForms = () => {
    setCourseForm(EMPTY_COURSE_FORM);
    setIaForm({ nome: '', plano: '', concurso: '', banca: '', editalText: '' });
    setImportResult(null);
    setUploadedFileName('');
    setAnalysisResult(null);
    setSelectedContestId('');
    setAnalysisError('');
    setExpandedCatalogAreas({});
  };

  const openMode = (nextMode) => {
    resetForms();
    setMode(nextMode);
  };

  const closeMode = () => {
    setMode(null);
    resetForms();
  };

  const toggleCatalogArea = (area) => {
    setExpandedCatalogAreas((prev) => ({
      ...prev,
      [area]: !prev[area],
    }));
  };

  const extractPdfText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines = [];
      let currentY = null;
      let currentLine = [];

      content.items.forEach((item) => {
        const y = Math.round(item.transform?.[5] || 0);
        if (currentY === null || Math.abs(currentY - y) <= 2) {
          currentY = y;
          currentLine.push(item.str);
          return;
        }

        lines.push(currentLine.join(' ').trim());
        currentY = y;
        currentLine = [item.str];
      });

      if (currentLine.length > 0) {
        lines.push(currentLine.join(' ').trim());
      }

      pages.push(lines.filter(Boolean).join('\n'));
    }

    return pages.join('\n');
  };

  const applyAnalysisToForm = (analysis, options = {}) => {
    if (!analysis?.contests?.length) return;

    const { overwriteFields = false, preferredContestId = '' } = options;
    const selectedId = preferredContestId || analysis.contests[0].id || '';
    const contest = analysis.contests.find((item) => item.id === selectedId) || analysis.contests[0];

    setSelectedContestId(selectedId);
    setIaForm((prev) => ({
      ...prev,
      nome: overwriteFields ? contest.title : prev.nome || contest.title,
      plano: overwriteFields ? contest.title : prev.plano || contest.title,
      concurso: overwriteFields ? contest.title : prev.concurso || contest.title || analysis.examName,
      banca: overwriteFields ? analysis.banca : prev.banca || analysis.banca,
    }));
  };

  const runAnalysis = async (text, options = {}) => {
    const normalizedText = String(text || '').trim();

    if (!normalizedText) {
      setAnalysisResult(null);
      setSelectedContestId('');
      setAnalysisError('');
      return null;
    }

    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      const realAnalysis = await analyzeEdital(normalizedText);
      setAnalysisResult(realAnalysis);
      applyAnalysisToForm(realAnalysis, options);
      return realAnalysis;
    } catch (realAiError) {
      try {
        const fallback = onAnalyzeEdital?.(normalizedText);
        const heuristicAnalysis = fallback
          ? {
              ...fallback,
              source: 'heuristic',
              sourceLabel: 'Fallback local',
              model: 'Parser interno',
            }
          : null;

        setAnalysisResult(heuristicAnalysis);
        applyAnalysisToForm(heuristicAnalysis, options);
        setAnalysisError(realAiError.message || 'A IA de produção não respondeu; o app exibiu a análise interna.');
        return heuristicAnalysis;
      } catch {
        setAnalysisResult(null);
        setAnalysisError(realAiError.message || 'Não foi possível analisar o edital.');
        throw realAiError;
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePdfUpload = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Envie um arquivo PDF.');
      return;
    }

    setIsAnalyzing(true);
    setImportResult(null);
    setAnalysisError('');

    try {
      const extractedText = await extractPdfText(file);
      setIaForm((prev) => ({ ...prev, editalText: extractedText }));
      setUploadedFileName(file.name);
      await runAnalysis(extractedText, { overwriteFields: true });
    } catch {
      alert('Não foi possível ler esse PDF. Tente outro arquivo ou cole o texto do edital.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!courseForm.nome.trim()) {
      alert('Digite o nome do curso.');
      return;
    }

    setIsSavingCourse(true);
    try {
      onCreateCourse?.({
        ...courseForm,
        plano: courseForm.plano.trim() || courseForm.nome.trim(),
      });
      closeMode();
    } finally {
      setIsSavingCourse(false);
    }
  };

  const handleImportCatalog = async (template) => {
    const roles = getContestRoles(template);
    if (roles.length > 1) {
      onOpenContestDetail?.(template.id);
      closeMode();
      return;
    }

    setIsImportingCatalog(true);

    try {
      await onImportCatalogCourse?.(buildContestForRole(template, roles[0]));
      closeMode();
    } catch (error) {
      alert(error.message || 'Não foi possível importar esse concurso.');
    } finally {
      setIsImportingCatalog(false);
    }
  };

  const handleImportEdital = async () => {
    if (!iaForm.nome.trim()) {
      alert('Digite o nome do curso para a importação.');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await onImportEdital?.({
        courseData: {
          nome: iaForm.nome.trim(),
          plano: iaForm.plano.trim() || iaForm.nome.trim(),
          concurso: iaForm.concurso.trim() || iaForm.nome.trim(),
          banca: iaForm.banca.trim() || 'A definir',
        },
        editalText: iaForm.editalText,
        selectedContestId,
        analysisResult,
      });

      setImportResult(result || null);
    } catch (error) {
      alert(error.message || 'Não foi possível importar o edital.');
    } finally {
      setIsImporting(false);
    }
  };
  const buildCourseMetaChips = (curso) => {
    const chips = [];
    chips.push({
      key: 'status',
      className: 'rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600',
      label: formatStatusLabel(curso.status_concurso),
    });
    if (curso.prova_data) {
      chips.push({
        key: 'prova',
        className:
          'rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700',
        label: `Prova ${formatDateDisplay(curso.prova_data)}`,
      });
    }
    if (curso.salario) {
      chips.push({
        key: 'salario',
        className:
          'rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700',
        label: curso.salario,
      });
    }
    if (curso.escolaridade) {
      chips.push({
        key: 'escolaridade',
        className:
          'rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700',
        label: curso.escolaridade,
      });
    }
    if (curso.inscricao_valor) {
      chips.push({
        key: 'inscricao',
        className:
          'rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700',
        label: `Inscrição ${curso.inscricao_valor}`,
      });
    }
    return chips;
  };

  return (
    <div className="page-shell animate-in fade-in duration-500 !pt-4 sm:!pt-5">
      <PageHeadPremium
        className="mb-6 lg:!flex-row lg:!items-center lg:!justify-between"
        icon={Book}
        title="Meus cursos"
        subtitle="Os cursos são a origem das disciplinas. Crie um curso personalizado ou escolha um concurso pronto da biblioteca."
        leadingClassName="lg:max-w-[calc(100%-29rem)] xl:max-w-[52rem]"
        trailingWrapClassName="lg:ml-auto lg:w-auto lg:max-w-[27rem] lg:self-center"
        trailing={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
            <button
              onClick={() => openMode('manual')}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-300/55 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.38)] ring-1 ring-blue-200/25 transition hover:from-blue-300 hover:via-blue-400 hover:to-indigo-400 hover:shadow-[0_12px_28px_rgba(37,99,235,0.45)] sm:w-auto sm:px-3.5 sm:py-2 sm:text-[13px]"
            >
              <Plus size={14} />
              Criar curso
            </button>
            <button
              onClick={() => openMode('catalog')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/15 sm:w-auto sm:px-3.5 sm:py-2 sm:text-[13px]"
            >
              <LibraryBig size={14} />
              Biblioteca de concursos
            </button>
          </div>
        }
      />

      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <CreatePlanCard
          icon={PenTool}
          iconWrap="bg-blue-50 text-[#2563EB]"
          title="Curso personalizado"
          text="Cadastre o curso do seu jeito e depois vincule todas as disciplinas a ele."
          onClick={() => openMode('manual')}
        />

        <CreatePlanCard
          icon={LibraryBig}
          iconWrap="bg-blue-50 text-[#2563EB]"
          title="Biblioteca de concursos"
          text="Selecione um concurso pré-cadastrado e carregue a estrutura base automaticamente."
          decorated
          onClick={() => openMode('catalog')}
        />

        <CreatePlanCard
          icon={Copy}
          iconWrap="bg-indigo-50 text-indigo-600"
          title="Ir para disciplinas"
          text="Revise rapidamente a estrutura criada e continue o refinamento na aba de disciplinas."
          onClick={() => setActiveTab('disciplinas')}
        />
      </div>

      {myContests.length > 0 && (
        <div className="mb-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="soft-accent rounded-2xl border border-blue-100 p-6 text-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">Concurso alvo</p>
            {targetContest ? (
              <>
                <h3 className="mt-3 text-2xl font-semibold text-blue-900">{targetContest.nome}</h3>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  {targetContest.cargo || targetContest.concurso}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <span className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-blue-700">
                    {targetContest.prova_data ? `Prova ${formatDateDisplay(targetContest.prova_data)}` : 'Sem prova definida'}
                  </span>
                  <span className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-blue-700">
                    {targetContest.diasParaProva !== null ? `Faltam ${targetContest.diasParaProva} dia(s)` : 'Sem contagem disponível'}
                  </span>
                </div>
                <button
                  onClick={() => onOpenContestDetail?.(targetContest.id)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-900"
                >
                  Abrir concurso alvo
                  <ArrowRight size={15} />
                </button>
              </>
            ) : (
              <>
                <h3 className="mt-3 text-2xl font-semibold text-blue-900">Defina seu concurso principal</h3>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  Escolha abaixo o concurso que vai guiar sua prioridade, contagem regressiva e foco diário.
                </p>
              </>
            )}
          </div>

          <div className="section-card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Memória do aluno</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">Concursos acompanhados</h3>
              </div>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-500">
                {myContests.length} itens
              </span>
            </div>

            <div className="space-y-3">
              {myContests.slice(0, 4).map((contest) => (
                <div key={contest.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap gap-2">
                    {contest.isTarget && (
                      <span className="rounded-full border border-yellow-100 bg-yellow-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-700">
                        Alvo
                      </span>
                    )}
                    {contest.imported && (
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                        Importado
                      </span>
                    )}
                    {contest.favorite && (
                      <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                        Favorito
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-base font-semibold text-slate-900">{contest.nome}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-500">{contest.cargo || contest.concurso}</p>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => onSetTargetContest?.(contest.id)}
                      className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                        contest.isTarget
                          ? 'border border-yellow-200 bg-yellow-50 text-yellow-700'
                          : 'border border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {contest.isTarget ? 'Alvo atual' : 'Definir como alvo'}
                    </button>
                    <button
                      onClick={() => onOpenContestDetail?.(contest.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-900"
                    >
                      Abrir concurso
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {cursoStats.map((curso) => (
          <div
            key={curso.id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              className="relative flex h-32 items-start justify-between overflow-hidden p-6"
              style={{ background: `linear-gradient(135deg, ${curso.cor || '#2563eb'} 0%, #1e40af 100%)` }}
            >
              <div className="absolute -right-10 -top-10 text-white/10 transition-transform duration-500 group-hover:scale-110">
                <Target size={150} />
              </div>

              <span className="relative z-10 rounded-full bg-white/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white">
                {curso.origem === 'catalogo' ? 'Biblioteca' : curso.origem === 'ia' ? 'Importado por IA' : 'Personalizado'}
              </span>
            </div>

            <div className="-mt-8 flex flex-1 flex-col p-6 relative">
              <button
                onClick={() => {
                  if (window.confirm(`Excluir o curso "${curso.nome}"? Essa ação não pode ser desfeita.`)) {
                    onDeleteCourse?.(curso);
                  }
                }}
                className="absolute right-0 top-0 rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Excluir curso"
              >
                <Trash2 size={16} />
              </button>

              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-md">
                {curso.imagem_url ? (
                  <img src={curso.imagem_url} alt={curso.nome} className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  <Book size={28} className="text-[#2563EB]" />
                )}
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {curso.area || 'Geral'}
                </span>
              </div>

              <h3 className="mb-1 text-xl font-extrabold tracking-tight text-gray-800">{curso.nome}</h3>
              <p className="mb-6 text-xs font-medium text-gray-500">
                {curso.cargo || curso.concurso || 'Curso cadastrado'} • {curso.banca || 'Banca a definir'}
              </p>

              <div className="mb-4 flex flex-wrap gap-2">
                {buildCourseMetaChips(curso)
                  .slice(0, 3)
                  .map((chip) => (
                    <span key={chip.key} className={chip.className}>
                      {chip.label}
                    </span>
                  ))}
                {buildCourseMetaChips(curso).length > 3 ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    +{buildCourseMetaChips(curso).length - 3}
                  </span>
                ) : null}
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3">
                <MetricMiniCard label="Disciplinas" value={String(curso.disciplinasCount)} />
                <MetricMiniCard label="Tópicos" value={String(curso.topicosCount)} />
              </div>

              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Progresso do edital</span>
                <span className="text-sm font-semibold text-blue-700">{curso.progresso}%</span>
              </div>

              <div className="mb-6 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-700" style={{ width: `${curso.progresso}%` }} />
              </div>

              <button
                onClick={() => {
                  setSelectedCoursePlan?.(curso.plano || 'Todos');
                  setActiveTab('disciplinas');
                }}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 py-3 font-semibold text-white transition-colors hover:bg-blue-900"
              >
                Abrir disciplinas
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}

        {isAdmin && (
          <div className="flex min-h-[360px] flex-col justify-between rounded-2xl border border-rose-200 bg-[linear-gradient(180deg,rgba(244,63,94,0.08),rgba(244,63,94,0.03))] p-8 shadow-sm">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700 shadow-sm">
                <LibraryBig size={12} />
                Painel da biblioteca
              </div>
              <h4 className="mb-3 text-xl font-semibold text-rose-900">Gerencie a base de concursos</h4>
              <p className="max-w-sm text-sm font-medium leading-relaxed text-rose-800/80">
                Esse bloco é administrativo. Use-o para alimentar a biblioteca com concursos-base e deixar a importação dos alunos mais rápida.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl border border-rose-100 bg-white/90 p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-500">Próximo passo</p>
                <p className="mt-2 text-sm font-semibold text-rose-800/80">
                  Hoje o catálogo ainda é local. Depois, migramos a gestão para o Supabase com cadastro administrativo dedicado.
                </p>
              </div>
              <button
                onClick={() => openMode('catalog')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-3 font-semibold text-white transition-colors hover:bg-rose-800"
              >
                Abrir biblioteca
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {mode === 'manual' && (
        <ModalShell title="Curso personalizado" subtitle="Cadastre o curso que será a base das disciplinas." onClose={closeMode}>
          <div className="grid gap-5 md:grid-cols-2">
            <InputField label="Nome do curso" value={courseForm.nome} onChange={(value) => setCourseForm((prev) => ({ ...prev, nome: value }))} />
            <InputField label="Plano interno" value={courseForm.plano} onChange={(value) => setCourseForm((prev) => ({ ...prev, plano: value }))} placeholder="Ex: PMBA - Soldado" />
            <InputField label="Concurso/órgão" value={courseForm.concurso} onChange={(value) => setCourseForm((prev) => ({ ...prev, concurso: value }))} />
            <InputField label="Banca" value={courseForm.banca} onChange={(value) => setCourseForm((prev) => ({ ...prev, banca: value }))} />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <SecondaryButton onClick={closeMode}>Cancelar</SecondaryButton>
            <PrimaryButton onClick={handleCreateCourse} disabled={isSavingCourse}>
              {isSavingCourse ? 'Salvando...' : 'Criar curso'}
            </PrimaryButton>
          </div>
        </ModalShell>
      )}

      {mode === 'catalog' && (
        <ModalShell
          title="Biblioteca de concursos"
          subtitle="Escolha um concurso pré-cadastrado para carregar a estrutura base com um clique."
          onClose={closeMode}
        >
          {isAdmin && (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
              <p className="text-sm font-semibold text-rose-800">Biblioteca administrativa</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-rose-700">
                Por enquanto, o catálogo ainda é local. Depois, migramos essa gestão para o Supabase com cadastro administrativo dedicado.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {contestSections.map(([area, templates]) => (
              <div key={area} className="overflow-hidden rounded-[1.6rem] border border-gray-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleCatalogArea(area)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
                      <LibraryBig size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">{area}</p>
                      <p className="mt-1 text-sm font-semibold text-gray-500">
                        {templates.length} concurso(s) disponíveis
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-500">
                      {templates.length}
                    </span>
                    {expandedCatalogAreas[area] ? (
                      <ChevronDown size={18} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={18} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedCatalogAreas[area] && (
                  <div className="border-t border-gray-100 bg-gray-50/60 p-4">
                    <div className="space-y-3">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="flex flex-col gap-4 rounded-[1.4rem] border border-gray-200 bg-white px-4 py-4 shadow-sm md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold text-slate-900">{template.nome}</p>
                            <p className="mt-1 truncate text-sm font-semibold text-gray-500">
                              {template.concurso}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">
                                {formatStatusLabel(template.status_concurso || 'em_analise')}
                              </span>
                              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                                {template.disciplinas.length} disciplinas
                              </span>
                              {template.prova_data && (
                                <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                                  Prova {formatDateDisplay(template.prova_data)}
                                </span>
                              )}
                            </div>
                          </div>

                          <PrimaryButton
                            onClick={() => handleImportCatalog(template)}
                            disabled={isImportingCatalog || limiteAtingido}
                          >
                            {limiteAtingido ? 'Limite atingido' : isImportingCatalog ? 'Importando...' : 'Usar concurso'}
                          </PrimaryButton>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ModalShell>
      )}

      {mode === 'ia' && (
        <ModalShell
          title="Importar edital com IA"
          subtitle="Ferramenta beta e agora mais escondida. Vamos voltar nela depois que a biblioteca de concursos estiver mais madura."
          onClose={closeMode}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <InputField label="Nome do curso" value={iaForm.nome} onChange={(value) => setIaForm((prev) => ({ ...prev, nome: value }))} />
            <InputField label="Plano interno" value={iaForm.plano} onChange={(value) => setIaForm((prev) => ({ ...prev, plano: value }))} placeholder="Ex: PMBA - Soldado" />
            <InputField label="Concurso/órgão" value={iaForm.concurso} onChange={(value) => setIaForm((prev) => ({ ...prev, concurso: value }))} />
            <InputField label="Banca" value={iaForm.banca} onChange={(value) => setIaForm((prev) => ({ ...prev, banca: value }))} />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">PDF do edital</label>
            <label className="mb-4 flex cursor-pointer items-center justify-center gap-3 rounded-[1.75rem] border-2 border-dashed border-blue-200 bg-blue-50/50 px-5 py-5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50">
              <Upload size={18} />
              {isAnalyzing ? 'Lendo PDF e analisando com IA...' : uploadedFileName ? `PDF carregado: ${uploadedFileName}` : 'Selecionar PDF'}
              <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handlePdfUpload(e.target.files?.[0])} />
            </label>

            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">Texto do edital</label>
            <textarea
              rows={12}
              value={iaForm.editalText}
              onChange={(e) => {
                const value = e.target.value;
                setIaForm((prev) => ({ ...prev, editalText: value }));
                setAnalysisError('');
              }}
              className="w-full rounded-[1.75rem] border border-gray-200 bg-gray-50/60 px-5 py-4 text-sm font-medium text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
            <div className="mt-3 flex justify-end">
              <SecondaryButton onClick={() => runAnalysis(iaForm.editalText, { overwriteFields: true })} disabled={isAnalyzing}>
                {isAnalyzing ? 'Analisando...' : 'Analisar texto com IA'}
              </SecondaryButton>
            </div>
          </div>

          {analysisError && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              {analysisError}
            </div>
          )}

          {analysisResult && (
            <div className="mt-5 rounded-[1.5rem] border border-blue-100 bg-blue-50/60 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">{analysisResult.sourceLabel || 'Leitura da IA'}</p>
              <p className="mt-2 text-sm font-semibold text-blue-800">
                Banca detectada: {analysisResult.banca}. Concursos detectados: {analysisResult.detectedContests}. Motor: {analysisResult.model}.
              </p>

              <div className="mt-4">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">Qual concurso deseja importar?</label>
                <select
                  value={selectedContestId}
                  onChange={(e) => applyAnalysisToForm(analysisResult, { overwriteFields: true, preferredContestId: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  {analysisResult.contests.map((contest) => (
                    <option key={contest.id} value={contest.id}>
                      {contest.title} - {contest.disciplinasCount} disciplinas / {contest.topicosCount} tópicos
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {importResult && (
            <div className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={18} />
                <p className="text-sm font-semibold">Importação concluída</p>
              </div>
              <p className="mt-2 text-sm font-semibold text-emerald-700">
                {importResult.disciplinasCriadas} disciplinas e {importResult.topicosCriados} tópicos criados no curso {importResult.curso?.nome}.
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <SecondaryButton onClick={closeMode}>Fechar</SecondaryButton>
            <PrimaryButton onClick={handleImportEdital} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processando IA...
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  Importar edital
                </>
              )}
            </PrimaryButton>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function CreatePlanCard({ icon: Icon, iconWrap, title, text, decorated = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center overflow-hidden rounded-[2rem] border border-gray-200 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      {decorated && <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[100px] bg-indigo-100 opacity-60" />}
      <div className={`relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 ${iconWrap}`}>
        <Icon size={28} />
      </div>
      <h3 className="relative z-10 mb-2 text-lg font-bold text-gray-800">{title}</h3>
      <p className="relative z-10 text-sm font-medium text-gray-500">{text}</p>
    </button>
  );
}

function MetricMiniCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <p className="mb-1 text-[10px] font-bold uppercase text-gray-400">{label}</p>
      <p className="text-lg font-semibold leading-none text-gray-700">{value}</p>
    </div>
  );
}

function ModalShell({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="mb-0 flex items-start justify-between gap-4 border-b border-gray-100 p-6">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm font-medium text-gray-500">{subtitle}</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600">
            Fechar
          </button>
        </div>
        <div className="custom-scrollbar overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder = '' }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}
