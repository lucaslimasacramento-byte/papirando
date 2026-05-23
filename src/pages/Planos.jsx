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
  Play,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { analyzeEdital } from '../lib/aiClient';
import { buildContestForRole, CONTEST_STATUS_LABELS, getContestRoles, groupContestTemplates, normalizeContestStatus } from '../lib/contestGrouping';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const EMPTY_COURSE_FORM = {
  nome: '',
  plano: '',
  concurso: '',
  banca: '',
  cor: '#1e3a5f',
};

const formatStatusLabel = (value) => {
  return CONTEST_STATUS_LABELS[normalizeContestStatus(value)] || 'Previsto';
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
    const chips = [{ key: 'status', tone: 'accent', label: formatStatusLabel(curso.status_concurso) }];
    if (curso.prova_data) chips.push({ key: 'prova', tone: 'highlight', label: `Prova ${formatDateDisplay(curso.prova_data)}` });
    if (curso.salario) chips.push({ key: 'salario', tone: 'success', label: curso.salario });
    if (curso.escolaridade) chips.push({ key: 'escolaridade', tone: '', label: curso.escolaridade });
    if (curso.inscricao_valor) chips.push({ key: 'inscricao', tone: 'warn', label: `Inscricao ${curso.inscricao_valor}` });
    return chips;
  };

  return (
    <div className="pl-paper-bg-soft" style={{ flex: 1, overflow: 'auto', padding: '18px 20px 40px', border: 0, outline: 0 }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24, margin: 0 }}>
        <PlanosHeader
          onCriarCurso={() => openMode('manual')}
          onAbrirBiblioteca={() => openMode('catalog')}
          onImportarIA={() => openMode('ia')}
        />

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(360px, 1fr)', gap: 16 }}>
          <ConcursoAlvoCard
            target={targetContest}
            onTrocar={() => setActiveTab('concursos')}
            onAbrir={() => targetContest?.id && onOpenContestDetail?.(targetContest.id)}
          />
          <ConcursosAcompanhadosCard
            items={myContests}
            onDefinirAlvo={onSetTargetContest}
            onAbrir={onOpenContestDetail}
          />
        </section>

        <section>
          <SectionHeader
            eyebrow="Seus cursos"
            title={`${cursoStats.length} curso${cursoStats.length !== 1 ? 's' : ''} cadastrado${cursoStats.length !== 1 ? 's' : ''}`}
            meta={`${Math.max(remainingCourseSlots, 0)} vaga${remainingCourseSlots === 1 ? '' : 's'} disponive${remainingCourseSlots === 1 ? 'l' : 'is'}`}
            cta={{ label: 'Ir para disciplinas', onClick: () => setActiveTab('disciplinas') }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginTop: 14 }}>
            {cursoStats.map((curso) => (
              <CursoTile
                key={curso.id}
                curso={curso}
                chips={buildCourseMetaChips(curso)}
                isTarget={curso.plano && targetContest?.plano && curso.plano === targetContest.plano}
                onAbrir={() => {
                  setSelectedCoursePlan?.(curso.plano || 'Todos');
                  setActiveTab('disciplinas');
                }}
                onApagar={() => {
                  if (window.confirm(`Excluir o curso "${curso.nome}"? Essa acao nao pode ser desfeita.`)) {
                    onDeleteCourse?.(curso);
                  }
                }}
                onMarcarAlvo={() => {
                  const contest = myContests.find((item) => item.plano === curso.plano || item.nome === curso.nome);
                  if (contest?.id) onSetTargetContest?.(contest.id);
                }}
              />
            ))}
          </div>
        </section>

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
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#1e3a5f]">
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
                                {formatStatusLabel(template.status_concurso || 'edital_publicado')}
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
          subtitle="Cole o texto do edital ou envie o PDF e a IA gera automaticamente disciplinas, tópicos e estrutura de estudo."
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

function PlanosHeader({ onCriarCurso, onAbrirBiblioteca, onImportarIA }) {
  return (
    <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
      <div>
        <div className="pl-eyebrow">Cursos</div>
        <h1 className="pl-display" style={{ margin: '10px 0 0', fontSize: 56, color: 'var(--pl-ink)' }}>
          Meus cursos<span style={{ color: 'var(--pl-accent)' }}>.</span>
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 660, lineHeight: 1.5 }}>
          Cursos sao a origem das disciplinas. Cadastre do seu jeito, escolha um concurso pronto da biblioteca,
          ou cole um edital e a gente <span className="pl-mark-text">papira</span> a estrutura pra voce.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
        <button className="pl-btn pl-btn-primary" onClick={onCriarCurso}>
          <Play size={11} fill="currentColor" /> Criar curso
        </button>
        <button className="pl-btn" onClick={onAbrirBiblioteca}>
          <LibraryBig size={13} /> Biblioteca
        </button>
        <button className="pl-btn pl-btn-ai" style={{ position: 'relative' }} onClick={onImportarIA}>
          <Sparkles size={12} /> Importar com IA
          <span style={{
            position: 'absolute',
            top: -6,
            right: -6,
            fontSize: 8.5,
            fontWeight: 800,
            letterSpacing: '0.08em',
            padding: '2px 5px',
            borderRadius: 3,
            background: '#fbe9a0',
            color: '#8a6d10',
          }}>
            BETA
          </span>
        </button>
      </div>
    </header>
  );
}

function ConcursoAlvoCard({ target, onTrocar, onAbrir }) {
  return (
    <div style={{
      background: 'var(--pl-surface)',
      border: '1px solid var(--pl-rule-2)',
      borderLeft: '4px solid var(--pl-ink)',
      borderRadius: 10,
      padding: '22px 26px',
      minHeight: 188,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Target size={13} strokeWidth={2.5} style={{ color: 'var(--pl-ink-3)', flexShrink: 0 }} />
        <span className="pl-eyebrow">Concurso-alvo</span>
      </div>

      {target ? (
        <>
          <h2 style={{ margin: '10px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 30, lineHeight: 1.1, color: 'var(--pl-ink)' }}>
            <span className="pl-mark-text">{target.nome}</span>
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
            {[target.banca, target.cargo || target.concurso].filter(Boolean).join(' — ') || 'Alvo principal definido'}
          </p>
          <p style={{ margin: '12px 0 0', maxWidth: 720, fontSize: 13.5, lineHeight: 1.55, color: 'var(--pl-ink-2)', fontWeight: 500 }}>
            Esse curso orienta prioridade, revisões e a contagem regressiva do seu estudo.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <button className="pl-btn" onClick={onTrocar}>Trocar alvo</button>
            <button className="pl-btn pl-btn-primary" onClick={onAbrir} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Abrir curso <ArrowRight size={13} /></button>
          </div>
        </>
      ) : (
        <>
          <h2 style={{ margin: '10px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 28, color: 'var(--pl-ink)' }}>
            Defina seu concurso principal
          </h2>
          <p style={{ margin: '10px 0 0', maxWidth: 680, fontSize: 13.5, lineHeight: 1.6, color: 'var(--pl-ink-2)', fontWeight: 500 }}>
            Escolha um dos cursos abaixo como alvo principal para guiar prioridade, contagem regressiva e foco diário.
          </p>
        </>
      )}
    </div>
  );
}

function ConcursosAcompanhadosCard({ items = [], onDefinirAlvo, onAbrir }) {
  const visible = items.slice(0, 3);
  return (
    <div style={{ background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)', borderRadius: 10, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="pl-eyebrow">Memoria do aluno</div>
          <h3 style={{ margin: '7px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 23, color: 'var(--pl-ink)' }}>
            Concursos acompanhados
          </h3>
        </div>
        <span className="pl-tag">{items.length} itens</span>
      </div>

      {visible.length === 0 ? (
        <p style={{ margin: '18px 0 0', fontSize: 13.5, lineHeight: 1.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
          Importe um concurso da biblioteca para acompanhar alvo, cargo e progresso por aqui.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {visible.map((contest) => (
            <div key={contest.id} style={{ padding: 12, border: '1px solid var(--pl-rule-2)', borderRadius: 6, background: 'var(--pl-surface-2)' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {contest.isTarget && <span className="pl-tag pl-tag-highlight">Alvo</span>}
                <span className="pl-tag">{contest.imported ? 'Importado' : contest.favorite ? 'Favorito' : 'Acompanhado'}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 14.5, fontWeight: 800, color: 'var(--pl-ink)' }}>{contest.nome}</div>
              <div style={{ marginTop: 2, fontSize: 12.5, fontWeight: 500, color: 'var(--pl-ink-3)' }}>{contest.cargo || contest.concurso || 'Cargo a definir'}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button className="pl-btn pl-btn-sm" onClick={() => onDefinirAlvo?.(contest.id)}>
                  {contest.isTarget ? 'Alvo atual' : 'Definir como alvo'}
                </button>
                <button className="pl-btn pl-btn-sm pl-btn-primary" onClick={() => onAbrir?.(contest.id)}>
                  Abrir concurso
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ eyebrow, title, meta, cta }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div className="pl-eyebrow">{eyebrow}</div>
        <h2 style={{ margin: '5px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 30, color: 'var(--pl-ink)' }}>
          {title}
        </h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {meta && <span className="pl-tag pl-tag-highlight">{meta}</span>}
        {cta && (
          <button className="pl-btn-link" onClick={cta.onClick}>
            {cta.label} <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function CursoTile({ curso, chips = [], isTarget, onAbrir, onApagar, onMarcarAlvo }) {
  const isLibrary = curso.origem === 'catalogo' || curso.origem === 'biblioteca';
  const tipoLabel = isLibrary ? 'Biblioteca' : curso.origem === 'ia' ? 'Importado por IA' : 'Personalizado';
  const secondaryTag = curso.cargo || curso.status_concurso || curso.area || 'Geral';
  const visibleChips = chips.slice(0, 3);

  return (
    <div className="pl-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 392 }}>
      <div style={{ position: 'relative', padding: '18px 22px 36px', minHeight: 116, borderBottom: '1px solid var(--pl-rule)', background: isLibrary ? 'var(--pl-bg-soft)' : 'var(--pl-surface-2)' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 22, height: 22, background: 'var(--pl-bg-deep)', clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={`pl-tag ${isLibrary ? '' : 'pl-tag-highlight'}`} style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {tipoLabel}
            </span>
            {isTarget && <span className="pl-tag pl-tag-warn">Alvo</span>}
          </div>
          <button onClick={onApagar} title="Excluir curso" style={{ border: 0, background: 'transparent', color: 'var(--pl-ink-4)', cursor: 'pointer', padding: 4 }}>
            <Trash2 size={15} />
          </button>
        </div>
        {secondaryTag && <div style={{ marginTop: 12 }}><span className="pl-tag">{secondaryTag}</span></div>}
        <div style={{
          position: 'absolute',
          left: 22,
          bottom: -22,
          width: 56,
          height: 56,
          borderRadius: 8,
          background: 'var(--pl-surface)',
          border: '1px solid var(--pl-rule-2)',
          boxShadow: 'var(--pl-sh-low)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {curso.imagem_url ? (
            <img src={curso.imagem_url} alt={curso.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <PlCrestIcon label={curso.nome} />
          )}
        </div>
      </div>

      <div style={{ padding: '32px 22px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--pl-ink)' }}>{curso.nome}</h3>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, fontWeight: 500, color: 'var(--pl-ink-3)' }}>
          {[curso.cargo || curso.concurso || 'Curso cadastrado', curso.banca || 'Banca a definir'].filter(Boolean).join(' - ')}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
          {visibleChips.map((chip) => (
            <span key={chip.key} className={`pl-tag${chip.tone ? ` pl-tag-${chip.tone}` : ''}`}>
              {chip.label}
            </span>
          ))}
          {chips.length > visibleChips.length && <span className="pl-tag">+{chips.length - visibleChips.length}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
          <EditorialMetric label="Disciplinas" value={String(curso.disciplinasCount)} />
          <EditorialMetric label="Topicos" value={String(curso.topicosCount)} />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
            <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>Progresso do edital</span>
            <span className="pl-num" style={{ fontSize: 17, color: 'var(--pl-ink-2)' }}>{curso.progresso}%</span>
          </div>
          <div className="pl-progress" style={{ marginTop: 7 }}>
            <div className="fill" style={{ width: `${Math.min(Math.max(curso.progresso, 0), 100)}%`, background: 'var(--pl-ink)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 18 }}>
          {!isTarget && onMarcarAlvo && (
            <button className="pl-btn pl-btn-sm" onClick={onMarcarAlvo}>Marcar alvo</button>
          )}
          <button className="pl-btn pl-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onAbrir}>
            Abrir disciplinas <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EditorialMetric({ label, value }) {
  return (
    <div style={{ padding: '10px 12px', border: '1px solid var(--pl-rule-2)', borderRadius: 5, background: 'var(--pl-surface-2)' }}>
      <div className="pl-eyebrow" style={{ fontSize: 9.5 }}>{label}</div>
      <div className="pl-num" style={{ marginTop: 3, fontSize: 24, color: 'var(--pl-ink)', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function PlCrestIcon({ label }) {
  const initial = String(label || 'P').trim().charAt(0).toUpperCase() || 'P';
  return (
    <div style={{ width: 42, height: 42, borderRadius: 7, background: 'var(--pl-ink)', color: 'var(--pl-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontSize: 24 }}>
      {initial}
    </div>
  );
}

function CreatePlanCard({ icon: Icon, iconWrap, title, text, badge, decorated = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center overflow-hidden rounded-[2rem] border border-gray-200 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      {decorated && <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[100px] bg-indigo-100 opacity-60" />}
      {badge && (
        <span className="absolute right-4 top-4 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700">
          {badge}
        </span>
      )}
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
      className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1e3a5f] disabled:cursor-not-allowed disabled:opacity-70"
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
