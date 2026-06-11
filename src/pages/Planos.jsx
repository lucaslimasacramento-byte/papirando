import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Book,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  DollarSign,
  EyeOff,
  GraduationCap,
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
  Users,
  Wand2,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { analyzeEdital } from '../lib/aiClient';
import { normalizeCourseTemplates } from '../lib/courseTemplates';
import { buildContestForRole, CONTEST_STATUS_LABELS, getContestRoles, groupContestTemplates, normalizeContestStatus } from '../lib/contestGrouping';
import { getAreaToken } from '../lib/areaTokens';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const EMPTY_COURSE_FORM = {
  nome: '',
  plano: '',
  concurso: '',
  banca: '',
  intent: 'livre',
  instituicao: '',
  area: '',
  cor: '#1e3a5f',
};

const INTENT_LABELS = {
  concurso: 'Concurso',
  faculdade: 'Faculdade',
  vestibular: 'Vestibular',
  livre: 'Livre',
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
  courseTemplates = [],
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
  const facultyTemplates = useMemo(
    () => normalizeCourseTemplates(courseTemplates).filter((template) => template.intent === 'faculdade'),
    [courseTemplates]
  );
  const vestibularTemplates = useMemo(
    () => normalizeCourseTemplates(courseTemplates).filter((template) => template.intent === 'vestibular'),
    [courseTemplates]
  );

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
      // PDF escaneado (só imagem) extrai "com sucesso" mas vem vazio — sem este check,
      // nada acontecia na tela e o usuário ficava sem feedback.
      if (String(extractedText || '').trim().length < 40) {
        setAnalysisError('Esse PDF parece ser escaneado (imagem) ou está vazio — não consegui extrair o texto. Cole o texto do edital manualmente.');
        return;
      }
      setIaForm((prev) => ({ ...prev, editalText: extractedText }));
      setUploadedFileName(file.name);
      await runAnalysis(extractedText, { overwriteFields: true });
    } catch (error) {
      console.error('[Planos] erro ao ler PDF:', error?.message || error);
      setAnalysisError('Não foi possível ler esse PDF. Tente outro arquivo ou cole o texto do edital.');
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
      await onCreateCourse?.({
        ...courseForm,
        plano: courseForm.plano.trim() || courseForm.nome.trim(),
        concurso: courseForm.intent === 'concurso' ? courseForm.concurso.trim() : courseForm.nome.trim(),
        banca: courseForm.intent === 'concurso' ? courseForm.banca.trim() || 'A definir' : '',
        area: courseForm.area.trim() || INTENT_LABELS[courseForm.intent] || 'Geral',
      });
      closeMode();
    } catch (error) {
      alert(error.message || 'Não foi possível criar esse objetivo.');
    } finally {
      setIsSavingCourse(false);
    }
  };

  const handleCreateTemplateCourse = async (template, intent) => {
    setIsSavingCourse(true);
    try {
      await onCreateCourse?.({
        nome: template.nome,
        plano: template.nome,
        concurso: template.nome,
        banca: '',
        area: template.area || INTENT_LABELS[intent] || 'Geral',
        intent,
        origem: intent,
        subjects: template.subjects || [],
      });
      closeMode();
    } catch (error) {
      alert(error.message || 'Não foi possível criar esse objetivo.');
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
    const intent = curso.intent || curso.tipo || (curso.origem === 'catalogo' || curso.origem === 'ia' ? 'concurso' : 'livre');
    const chips = [{ key: 'intent', tone: intent === 'faculdade' ? 'highlight' : 'accent', label: INTENT_LABELS[intent] || 'Objetivo' }];
    if (intent === 'concurso') chips.push({ key: 'status', tone: 'accent', label: formatStatusLabel(curso.status_concurso) });
    if (curso.prova_data) chips.push({ key: 'prova', tone: 'highlight', label: `Prova ${formatDateDisplay(curso.prova_data)}` });
    if (curso.salario) chips.push({ key: 'salario', tone: 'success', label: curso.salario });
    if (curso.escolaridade) chips.push({ key: 'escolaridade', tone: '', label: curso.escolaridade });
    if (curso.inscricao_valor) chips.push({ key: 'inscricao', tone: 'warn', label: `Inscrição ${curso.inscricao_valor}` });
    return chips;
  };

  return (
    <div className="pl-paper-bg-soft" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '18px 20px 40px', border: 0, outline: 0 }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24, margin: 0 }}>
        <PlanosHeader
          onCriarCurso={() => openMode('intent')}
          onAbrirBiblioteca={() => openMode('catalog')}
          onImportarIA={() => openMode('ia')}
        />

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(360px, 1fr)', gap: 16 }}>
          <ConcursoAlvoCard
            target={targetContest}
            cursoStats={cursoStats}
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
            meta={`${Math.max(remainingCourseSlots, 0)} vaga${remainingCourseSlots === 1 ? '' : 's'} disponíve${remainingCourseSlots === 1 ? 'l' : 'is'}`}
            cta={{ label: 'Ir para disciplinas', onClick: () => setActiveTab('disciplinas') }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 14 }}>
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
                  if (window.confirm(`Excluir o curso "${curso.nome}"? Essa ação não pode ser desfeita.`)) {
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

      {mode === 'intent' && (
        <ModalShell title="Novo objetivo de estudo" subtitle="Escolha o contexto. O Papirando adapta a linguagem e a estrutura sem prender todo mundo em concurso." onClose={closeMode}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            <IntentCard
              icon={GraduationCap}
              title="Cursos"
              text="Escolha um curso de faculdade cadastrado no catálogo e carregue matérias iniciais."
              action="Escolher curso"
              featured
              onClick={() => openMode('faculty')}
            />
            <IntentCard
              icon={Target}
              title="Concursos"
              text="Use a biblioteca atual, regras de banca, edital e cargos predefinidos."
              action="Abrir concursos"
              onClick={() => openMode('catalog')}
            />
            <IntentCard
              icon={Book}
              title="Vestibular"
              text="Escolha ENEM, vestibular ou processo seletivo alimentado pelo admin."
              action="Escolher vestibular"
              onClick={() => openMode('vestibular')}
            />
          </div>
        </ModalShell>
      )}

      {mode === 'faculty' && (
        <TemplatePicker
          title="Cursos"
          subtitle="Escolha um curso alimentado no Catálogo de estudos do admin. Depois você pode adicionar, remover ou renomear matérias."
          templates={facultyTemplates}
          isSavingCourse={isSavingCourse}
          limiteAtingido={limiteAtingido}
          onCreate={(template) => handleCreateTemplateCourse(template, template.intent || 'faculdade')}
          onClose={closeMode}
          emptyText="Nenhum curso cadastrado no catálogo ainda."
        />
      )}

      {mode === 'vestibular' && (
        <TemplatePicker
          title="Vestibulares"
          subtitle="Escolha uma trilha de vestibular alimentada no Catálogo de estudos do admin."
          templates={vestibularTemplates}
          isSavingCourse={isSavingCourse}
          limiteAtingido={limiteAtingido}
          onCreate={(template) => handleCreateTemplateCourse(template, template.intent || 'vestibular')}
          onClose={closeMode}
          emptyText="Nenhum vestibular cadastrado no catálogo ainda."
        />
      )}

      {mode === 'manual' && (
        <ModalShell title="Objetivo personalizado" subtitle="Cadastre um estudo livre, uma faculdade ainda sem template ou uma certificação." onClose={closeMode}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
            <InputField label="Nome do objetivo" value={courseForm.nome} onChange={(value) => setCourseForm((prev) => ({ ...prev, nome: value }))} />
            <InputField label="Identificador interno" value={courseForm.plano} onChange={(value) => setCourseForm((prev) => ({ ...prev, plano: value }))} placeholder="Ex: Pedagogia - 2o semestre" />
            <InputField label="Área ou curso" value={courseForm.area} onChange={(value) => setCourseForm((prev) => ({ ...prev, area: value }))} placeholder="Ex: Pedagogia, Medicina, Francês" />
            <InputField label="Instituição ou origem" value={courseForm.instituicao} onChange={(value) => setCourseForm((prev) => ({ ...prev, instituicao: value }))} placeholder="Ex: faculdade, edital, livro, mentoria" />
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
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
            <div style={{ marginBottom: 20, borderRadius: 12, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', padding: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-danger)', margin: 0 }}>Biblioteca administrativa</p>
              <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, lineHeight: 1.55, color: 'var(--pl-danger)', margin: '8px 0 0' }}>
                Por enquanto, o catálogo ainda é local. Depois, migramos essa gestão para o Supabase com cadastro administrativo dedicado.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {contestSections.map(([area, templates]) => (
              <div key={area} className="pl-card" style={{ overflow: 'hidden', padding: 0 }}>
                <button
                  type="button"
                  onClick={() => toggleCatalogArea(area)}
                  style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', textAlign: 'left', background: 'transparent', border: 0, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', flexShrink: 0 }}>
                      <LibraryBig size={18} />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--pl-ink-3)', margin: 0 }}>{area}</p>
                      <p style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)', margin: '4px 0 0' }}>
                        {templates.length} concurso(s) disponíveis
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="pl-tag" style={{ fontWeight: 700 }}>
                      {templates.length}
                    </span>
                    {expandedCatalogAreas[area] ? (
                      <ChevronDown size={18} style={{ color: 'var(--pl-ink-3)' }} />
                    ) : (
                      <ChevronRight size={18} style={{ color: 'var(--pl-ink-3)' }} />
                    )}
                  </div>
                </button>

                {expandedCatalogAreas[area] && (
                  <div style={{ borderTop: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '16px', boxShadow: 'var(--pl-sh-low)' }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 15, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{template.nome}</p>
                            <p style={{ marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)', margin: '4px 0 0' }}>
                              {template.concurso}
                            </p>
                            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              <span className="pl-tag" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                                {formatStatusLabel(template.status_concurso || 'edital_publicado')}
                              </span>
                              <span className="pl-tag pl-tag-accent" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                                {template.disciplinas.length} disciplinas
                              </span>
                              {template.prova_data && (
                                <span className="pl-tag" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--pl-ink-2)' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
            <InputField label="Nome do curso" value={iaForm.nome} onChange={(value) => setIaForm((prev) => ({ ...prev, nome: value }))} />
            <InputField label="Plano interno" value={iaForm.plano} onChange={(value) => setIaForm((prev) => ({ ...prev, plano: value }))} placeholder="Ex: PMBA - Soldado" />
            <InputField label="Concurso/órgão" value={iaForm.concurso} onChange={(value) => setIaForm((prev) => ({ ...prev, concurso: value }))} />
            <InputField label="Banca" value={iaForm.banca} onChange={(value) => setIaForm((prev) => ({ ...prev, banca: value }))} />
          </div>

          <div style={{ marginTop: 20 }}>
            <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>PDF do edital</label>
            <label style={{ marginBottom: 16, display: 'flex', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 14, border: '2px dashed var(--pl-accent-soft)', background: 'var(--pl-accent-soft)', padding: '20px', fontSize: 13, fontWeight: 700, color: 'var(--pl-accent)' }}>
              <Upload size={18} />
              {isAnalyzing ? 'Lendo PDF e analisando com IA...' : uploadedFileName ? `PDF carregado: ${uploadedFileName}` : 'Selecionar PDF'}
              <input type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={(e) => handlePdfUpload(e.target.files?.[0])} />
            </label>

            <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>Texto do edital</label>
            <textarea
              rows={12}
              value={iaForm.editalText}
              onChange={(e) => {
                const value = e.target.value;
                setIaForm((prev) => ({ ...prev, editalText: value }));
                setAnalysisError('');
              }}
              className="pl-input"
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <SecondaryButton onClick={() => runAnalysis(iaForm.editalText, { overwriteFields: true })} disabled={isAnalyzing}>
                {isAnalyzing ? 'Analisando...' : 'Analisar texto com IA'}
              </SecondaryButton>
            </div>
          </div>

          {analysisError && (
            <div style={{ marginTop: 16, borderRadius: 12, border: '1px solid var(--pl-warn-soft)', background: 'var(--pl-warn-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-warn)' }}>
              {analysisError}
            </div>
          )}

          {analysisResult && (
            <div style={{ marginTop: 20, borderRadius: 12, border: '1px solid var(--pl-accent-soft)', background: 'var(--pl-accent-soft)', padding: 20 }}>
              <p className="pl-eyebrow" style={{ color: 'var(--pl-accent)' }}>{analysisResult.sourceLabel || 'Leitura da IA'}</p>
              <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--pl-accent)' }}>
                Banca detectada: {analysisResult.banca}. Concursos detectados: {analysisResult.detectedContests}. Motor: {analysisResult.model}.
              </p>

              <div style={{ marginTop: 16 }}>
                <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>Qual concurso deseja importar?</label>
                <select
                  value={selectedContestId}
                  onChange={(e) => applyAnalysisToForm(analysisResult, { overwriteFields: true, preferredContestId: e.target.value })}
                  className="pl-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
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
            <div style={{ marginTop: 20, borderRadius: 12, border: '1px solid var(--pl-success-soft)', background: 'var(--pl-success-soft)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--pl-success)' }}>
                <CheckCircle2 size={18} />
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Importação concluída</p>
              </div>
              <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--pl-success)' }}>
                {importResult.disciplinasCriadas} disciplinas e {importResult.topicosCriados} tópicos criados no curso {importResult.curso?.nome}.
              </p>
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
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

function TemplatePicker({ title, subtitle, templates, isSavingCourse, limiteAtingido, onCreate, onClose, emptyText }) {
  return (
    <ModalShell title={title} subtitle={subtitle} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onCreate(template)}
            disabled={isSavingCourse || limiteAtingido}
            className="pl-card"
            style={{ textAlign: 'left', padding: 18, cursor: limiteAtingido ? 'not-allowed' : 'pointer', opacity: limiteAtingido ? 0.58 : 1 }}
          >
            <span className="pl-tag pl-tag-highlight">{template.area}</span>
            <h3 style={{ margin: '12px 0 0', fontSize: 20, fontWeight: 800, color: 'var(--pl-ink)' }}>{template.nome}</h3>
            <p style={{ margin: '7px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--pl-ink-2)', fontWeight: 500 }}>
              {template.subjects.length} disciplinas iniciais cadastradas automaticamente.
            </p>
          </button>
        ))}
      </div>
      {templates.length === 0 && (
        <p style={{ margin: '14px 0 0', color: 'var(--pl-ink-3)', fontSize: 13, fontWeight: 700 }}>
          {emptyText}
        </p>
      )}
      {limiteAtingido && (
        <p style={{ margin: '14px 0 0', color: 'var(--pl-warn)', fontSize: 13, fontWeight: 700 }}>
          Limite de cursos atingido no plano atual.
        </p>
      )}
    </ModalShell>
  );
}

function PlanosHeader({ onCriarCurso, onAbrirBiblioteca, onImportarIA }) {
  return (
    <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
      <div>
        <h1 className="pl-display" style={{ margin: 0, fontSize: 56, color: 'var(--pl-ink)' }}>
          Meus cursos<span style={{ color: 'var(--pl-accent)' }}>.</span>
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 660, lineHeight: 1.5 }}>
          Cursos agora filtram a intenção do aluno: concurso, faculdade, vestibular ou estudo livre. Você traz o contexto,
          e a gente <span className="pl-mark-text">papira</span> a estrutura pra você.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
        <button className="pl-btn pl-btn-primary" onClick={onCriarCurso}>
          <Play size={11} fill="currentColor" /> Novo objetivo
        </button>
        <button className="pl-btn" onClick={onAbrirBiblioteca}>
          <LibraryBig size={13} /> Biblioteca
        </button>
        <span className="btn-ai-aura">
          <button className="pl-btn pl-btn-ai" onClick={onImportarIA}>
            <Sparkles size={12} /> Importar com IA
            <span className="beta">beta</span>
          </button>
        </span>
      </div>
    </header>
  );
}

function ConcursoAlvoCard({ target, cursoStats = [], onTrocar, onAbrir }) {
  const targetStats = cursoStats.find(
    (c) => c.plano === target?.plano || c.nome === target?.nome
  ) || null;

  const areaToken = target ? getAreaToken(target.area || '') : null;
  const cover = areaToken?.cover    ?? '#1a1a2e';
  const glow  = areaToken?.coverGlow ?? '#2d2d52';
  const [todayTime, setTodayTime] = React.useState(0);

  React.useEffect(() => {
    setTodayTime(Date.now());
  }, []);

  const daysToExam = target?.prova_data && todayTime
    ? Math.ceil((new Date(`${target.prova_data}T00:00:00`).getTime() - todayTime) / 86400000)
    : null;

  const hasStats = targetStats && (targetStats.disciplinasCount > 0 || targetStats.topicosCount > 0);
  const targetDisciplinasCount = targetStats?.disciplinasCount || (Array.isArray(target?.disciplinas) ? target.disciplinas.length : 0);
  const targetTopicosCount = targetStats?.topicosCount || (Array.isArray(target?.disciplinas)
    ? target.disciplinas.reduce((acc, disciplina) => acc + (Array.isArray(disciplina?.topicos) ? disciplina.topicos.length : 0), 0)
    : 0);
  const targetProgress = targetStats?.progresso || 0;

  // Preview das primeiras disciplinas do concurso-alvo
  const disciplinaPreview = Array.isArray(target?.disciplinas)
    ? target.disciplinas.slice(0, 4).map((d) => d.nome || d)
    : [];
  const extraDisciplinas = Array.isArray(target?.disciplinas)
    ? Math.max(0, target.disciplinas.length - 4)
    : 0;

  const statusLabel = target?.status_concurso
    ? CONTEST_STATUS_LABELS[normalizeContestStatus(target.status_concurso)] || null
    : null;

  const formatSalario = (v) => {
    const n = parseFloat(String(v || '').replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (!n || !isFinite(n)) return null;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  const salario = formatSalario(target?.salario);
  const provaLabel = target?.prova_data ? formatDateDisplay(target.prova_data) : null;
  const quickFacts = [
    { key: 'prova', icon: CalendarDays, label: 'Prova', value: provaLabel || 'Sem data', tone: daysToExam !== null && daysToExam < 0 ? 'muted' : 'default' },
    { key: 'vagas', icon: Users, label: 'Vagas', value: target?.vagas ? `${target.vagas}` : 'A definir', tone: 'default' },
    { key: 'disciplinas', icon: BookOpen, label: 'Disciplinas', value: String(targetDisciplinasCount || 0), tone: 'default' },
    { key: 'topicos', icon: Layers3, label: 'Tópicos', value: String(targetTopicosCount || 0), tone: 'default' },
  ];

  return (
    <div style={{ border: '1px solid var(--pl-rule-2)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* ── Banner ── */}
      <div style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${cover} 0%, ${glow} 100%)`,
        display: 'grid', gridTemplateColumns: 'auto 1fr',
        gap: 18, alignItems: 'center',
        padding: '18px 22px', overflow: 'hidden', minHeight: 110,
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`, opacity: 0.55, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: '40%', width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${cover} 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{
          position: 'relative', zIndex: 1, flexShrink: 0,
          width: 68, height: 68, borderRadius: 13,
          border: '1.5px solid rgba(243,239,229,0.18)',
          background: 'rgba(243,239,229,0.10)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {target?.imagem_url
            ? <img src={target.imagem_url} alt={target.nome} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.30))' }} />
            : <Target size={26} style={{ color: 'rgba(243,239,229,0.65)' }} strokeWidth={1.5} />
          }
        </div>

        {/* Título + eyebrow + dias */}
        <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
            <Target size={10} strokeWidth={2.5} style={{ color: 'rgba(243,239,229,0.45)', flexShrink: 0 }} />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.45)' }}>Objetivo-alvo</span>
            {daysToExam !== null && (
              <span style={{
                marginLeft: 'auto', padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap',
                background: daysToExam < 0 ? 'rgba(0,0,0,0.25)' : 'rgba(243,239,229,0.12)',
                border: '1px solid rgba(243,239,229,0.18)',
                color: daysToExam < 0 ? 'rgba(243,239,229,0.4)' : daysToExam < 30 ? 'var(--pl-danger)' : daysToExam < 90 ? 'var(--pl-warn)' : 'rgba(243,239,229,0.9)',
                fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em',
              }}>
                {daysToExam < 0 ? 'Prova encerrada' : `${daysToExam}d para a prova`}
              </span>
            )}
          </div>
          <h2 style={{
            margin: 0, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300,
            fontSize: 27, lineHeight: 1.1, color: '#f3efe5',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {target ? target.nome : 'Nenhum alvo definido'}
          </h2>
        </div>
      </div>

      {/* ── Corpo ── */}
      <div style={{ padding: '14px 20px 18px', background: 'var(--pl-surface)', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {target ? (
          <>
            {/* Chips de área/status */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {areaToken && (
                <span className="pl-tag" style={{ background: areaToken.chip, color: areaToken.chipInk, textTransform: 'uppercase', fontSize: 9 }}>
                  {areaToken.label || target.area}
                </span>
              )}
              {statusLabel && (
                <span className="pl-tag pl-tag-accent" style={{ fontSize: 9, textTransform: 'uppercase' }}>
                  {statusLabel}
                </span>
              )}
              {target.escolaridade && (
                <span className="pl-tag" style={{ fontSize: 9 }}>{target.escolaridade}</span>
              )}
            </div>

            {/* Banca + cargo */}
            <div>
              {target.banca && (
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'var(--pl-ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {target.banca}
                </p>
              )}
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)', lineHeight: 1.4 }}>
                {target.cargo || target.concurso || 'Alvo principal definido'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              {quickFacts.map((fact) => {
                const Icon = fact.icon;
                return (
                  <div key={fact.key} style={{
                    minWidth: 0,
                    border: '1px solid var(--pl-rule-2)',
                    borderRadius: 8,
                    background: fact.tone === 'muted' ? 'var(--pl-bg-soft)' : 'var(--pl-surface-2)',
                    padding: '9px 10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--pl-ink-3)' }}>
                      <Icon size={12} />
                      <span className="pl-eyebrow" style={{ fontSize: 8.5 }}>{fact.label}</span>
                    </div>
                    <p style={{
                      margin: '5px 0 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: fact.key === 'prova' ? 12 : 15,
                      fontWeight: 800,
                      color: fact.tone === 'muted' ? 'var(--pl-ink-3)' : 'var(--pl-ink)',
                    }}>
                      {fact.value}
                    </p>
                  </div>
                );
              })}
            </div>

            {(salario || target.inscricao_valor || target.escolaridade || statusLabel) && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 8,
                border: '1px solid var(--pl-rule)',
                borderRadius: 8,
                background: 'var(--pl-bg-soft)',
                padding: 10,
              }}>
                <TargetInfoLine label="Banca" value={target.banca || 'A definir'} />
                <TargetInfoLine label="Salário" value={salario || 'Não informado'} accent={Boolean(salario)} />
                <TargetInfoLine label="Inscrição" value={target.inscricao_valor || 'Não informada'} />
              </div>
            )}

            {/* Preview de disciplinas */}
            {disciplinaPreview.length > 0 && (
              <div>
                <p className="pl-eyebrow" style={{ fontSize: 9, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <BookOpen size={10} /> Matérias do edital
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {disciplinaPreview.map((nome) => (
                    <span key={nome} className="pl-tag" style={{ fontSize: 10, padding: '2px 8px' }}>{nome}</span>
                  ))}
                  {extraDisciplinas > 0 && (
                    <span className="pl-tag" style={{ fontSize: 10, padding: '2px 8px', color: 'var(--pl-ink-3)' }}>+{extraDisciplinas}</span>
                  )}
                </div>
              </div>
            )}

            {/* Stats de progresso — só quando tem dados */}
            {hasStats ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginBottom: 6 }}>
                  <span className="pl-eyebrow" style={{ fontSize: 9 }}>Progresso do curso</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--pl-ink-3)' }}>
                    {targetDisciplinasCount} disc · {targetTopicosCount} tópicos · {targetProgress}%
                  </span>
                </div>
                <div className="pl-progress">
                  <div className="fill" style={{ width: `${Math.min(Math.max(targetProgress, 0), 100)}%`, background: 'var(--pl-ink)', transition: 'width .4s ease' }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 10, borderRadius: 8, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '9px 11px' }}>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: 'var(--pl-ink-3)', fontWeight: 600 }}>
                  Sem progresso ainda. Abra o curso e vincule estudos para esse painel começar a acompanhar sua rota.
                </p>
                <span className="pl-num" style={{ fontSize: 20, color: 'var(--pl-ink-3)' }}>0%</span>
              </div>
            )}

            {/* Ações */}
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button className="pl-btn pl-btn-sm" onClick={onTrocar}>Trocar alvo</button>
              <button className="pl-btn pl-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onAbrir}>
                Abrir curso <ArrowRight size={13} />
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ margin: 0, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 22, color: 'var(--pl-ink)' }}>
              Defina seu objetivo principal
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--pl-ink-2)', fontWeight: 500 }}>
              Escolha um dos cursos abaixo como alvo principal para guiar prioridade, rotina e foco diário.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function AlvoStat({ label, value, accent = false }) {
  return (
    <div style={{ padding: '8px 10px', border: '1px solid var(--pl-rule-2)', borderRadius: 5, background: 'var(--pl-surface-2)' }}>
      <div className="pl-eyebrow" style={{ fontSize: 9 }}>{label}</div>
      <div className="pl-num" style={{ marginTop: 3, fontSize: 20, lineHeight: 1, color: accent ? 'var(--pl-accent)' : 'var(--pl-ink)' }}>{value}</div>
    </div>
  );
}

function TargetInfoLine({ label, value, accent = false }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p className="pl-eyebrow" style={{ margin: 0, fontSize: 8.5 }}>{label}</p>
      <p style={{
        margin: '3px 0 0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: 12,
        fontWeight: 800,
        color: accent ? 'var(--pl-success)' : 'var(--pl-ink-2)',
      }}>
        {value}
      </p>
    </div>
  );
}

function ConcursosAcompanhadosCard({ items = [], onDefinirAlvo, onAbrir }) {
  const visible = items.slice(0, 4);

  return (
    <div style={{ background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)', borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <div className="pl-eyebrow">Memória do aluno</div>
          <h3 style={{ margin: '7px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 22, color: 'var(--pl-ink)' }}>
            Concursos acompanhados
          </h3>
        </div>
        <span className="pl-tag" style={{ flexShrink: 0 }}>{items.length} {items.length === 1 ? 'concurso' : 'concursos'}</span>
      </div>

      {visible.length === 0 ? (
        <div style={{ borderRadius: 8, border: '1px dashed var(--pl-rule-strong)', background: 'var(--pl-bg-soft)', padding: '20px 16px', textAlign: 'center' }}>
          <Target size={22} style={{ color: 'var(--pl-ink-4)', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--pl-ink-3)', fontWeight: 500, margin: 0 }}>
            Importe um concurso da biblioteca para acompanhar alvo, cargo e progresso por aqui.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map((contest) => {
            const areaToken = getAreaToken(contest.area || '');
            const statusLabel = contest.status_concurso ? CONTEST_STATUS_LABELS[normalizeContestStatus(contest.status_concurso)] : null;
            const hasDate = contest.prova_data;
            const dataBR = hasDate ? String(contest.prova_data).split('-').reverse().join('/') : null;

            return (
              <div
                key={contest.id}
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--pl-rule-2)',
                  background: contest.isTarget ? 'var(--pl-bg-soft)' : 'var(--pl-surface)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* Colored left accent bar */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: contest.isTarget ? 'var(--pl-accent)' : areaToken.cover, borderRadius: '8px 0 0 8px' }} />

                <div style={{ padding: '10px 12px 10px 16px' }}>
                  {/* Tags row */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 7 }}>
                    {contest.isTarget && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, border: '1px solid var(--pl-accent-soft)', background: 'var(--pl-accent-soft)', padding: '2px 8px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--pl-accent)' }}>
                        <Target size={9} /> Alvo
                      </span>
                    )}
                    {contest.imported && (
                      <span style={{ borderRadius: 999, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '2px 8px', fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--pl-ink-3)' }}>
                        Importado
                      </span>
                    )}
                    {statusLabel && (
                      <span style={{ borderRadius: 999, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '2px 8px', fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--pl-ink-3)' }}>
                        {statusLabel}
                      </span>
                    )}
                  </div>

                  {/* Name + cargo */}
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--pl-ink)', lineHeight: 1.3, marginBottom: 2 }}>
                    {contest.nome}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)', marginBottom: 8 }}>
                    {contest.cargo || contest.concurso || 'Cargo a definir'}
                  </div>

                  {/* Quick stats */}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 9 }}>
                    {dataBR && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                        <CalendarDays size={12} style={{ color: 'var(--pl-ink-3)' }} />
                        {dataBR}
                      </span>
                    )}
                    {contest.diasParaProva !== null && contest.diasParaProva !== undefined && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                        <Target size={12} style={{ color: 'var(--pl-ink-3)' }} />
                        {contest.diasParaProva > 0 ? `${contest.diasParaProva}d` : 'Hoje'}
                      </span>
                    )}
                    {(contest.disciplinas?.length > 0) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                        <Layers3 size={12} style={{ color: 'var(--pl-ink-3)' }} />
                        {contest.disciplinas.length} disc.
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className={`pl-btn pl-btn-sm${contest.isTarget ? ' pl-btn-primary' : ''}`}
                      style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => onDefinirAlvo?.(contest.id)}
                    >
                      {contest.isTarget ? 'Alvo atual' : 'Definir alvo'}
                    </button>
                    <button
                      className="pl-btn pl-btn-sm"
                      style={{ fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => onAbrir?.(contest.id)}
                    >
                      Abrir <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {items.length > 4 && (
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)', textAlign: 'center' }}>
              +{items.length - 4} mais em <button className="pl-btn-link" style={{ fontSize: 12 }}>Meus concursos</button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function IntentCard({ icon: Icon, title, text, action, onClick, featured = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={featured ? 'pl-card-ai' : 'pl-card'}
      style={{ textAlign: 'left', padding: 20, cursor: 'pointer', minHeight: 210, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: featured ? 'var(--pl-ink)' : 'var(--pl-surface-2)',
            color: featured ? 'var(--pl-bg)' : 'var(--pl-ink)',
            border: featured ? 0 : '1px solid var(--pl-rule-2)',
          }}
        >
          <Icon size={19} />
        </span>
        {featured && <span className="pl-tag-ai">Novo foco</span>}
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: 'var(--pl-ink)' }}>{title}</h3>
        <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.55, color: 'var(--pl-ink-2)', fontWeight: 500 }}>{text}</p>
      </div>
      <span className="pl-btn-link" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
        {action} <ArrowRight size={12} />
      </span>
    </button>
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
  const intent = curso.intent || curso.tipo || (isLibrary || curso.origem === 'ia' ? 'concurso' : 'livre');
  const tipoLabel = isLibrary ? 'Biblioteca' : curso.origem === 'ia' ? 'Importado por IA' : INTENT_LABELS[intent] || 'Personalizado';
  const secondaryTag = curso.cargo || curso.area || curso.curso_superior || curso.instituicao || (intent === 'concurso' ? curso.status_concurso : '') || 'Geral';
  const visibleChips = chips.slice(0, 3);

  return (
    <div className="pl-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 318 }}>
      <div style={{ position: 'relative', padding: '14px 16px 12px', borderBottom: '1px solid var(--pl-rule)', background: isLibrary ? 'var(--pl-bg-soft)' : 'var(--pl-surface-2)' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 22, height: 22, background: 'var(--pl-bg-deep)', clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', minWidth: 0, gap: 6, flexWrap: 'wrap' }}>
            <span className={`pl-tag ${isLibrary ? '' : 'pl-tag-highlight'}`} style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {tipoLabel}
            </span>
            {isTarget && <span className="pl-tag pl-tag-warn">Alvo</span>}
          </div>
          <button onClick={onApagar} title="Excluir curso" style={{ border: 0, background: 'transparent', color: 'var(--pl-ink-4)', cursor: 'pointer', padding: 4 }}>
            <Trash2 size={15} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, minWidth: 0 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 9,
            background: 'var(--pl-surface)',
            border: '1px solid var(--pl-rule-2)',
            boxShadow: 'var(--pl-sh-low)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {curso.imagem_url ? (
              <img src={curso.imagem_url} alt={curso.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <PlCrestIcon label={curso.nome} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            {secondaryTag ? (
              <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5, fontWeight: 700, color: 'var(--pl-ink-2)' }}>
                {secondaryTag}
              </p>
            ) : null}
            <h3 style={{ margin: secondaryTag ? '3px 0 0' : 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 18, fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--pl-ink)' }}>{curso.nome}</h3>
          </div>
        </div>
      </div>

      <div style={{ padding: '13px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <p style={{ margin: 0, minHeight: 34, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 12, lineHeight: 1.42, fontWeight: 500, color: 'var(--pl-ink-3)' }}>
          {[curso.cargo || curso.concurso || curso.area || 'Curso cadastrado', curso.banca || curso.instituicao].filter(Boolean).join(' - ')}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, minHeight: 24 }}>
          {visibleChips.map((chip) => (
            <span key={chip.key} className={`pl-tag${chip.tone ? ` pl-tag-${chip.tone}` : ''}`}>
              {chip.label}
            </span>
          ))}
          {chips.length > visibleChips.length && <span className="pl-tag">+{chips.length - visibleChips.length}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          <EditorialMetric label="Disciplinas" value={String(curso.disciplinasCount)} />
          <EditorialMetric label="Tópicos" value={String(curso.topicosCount)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
            <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>Progresso do objetivo</span>
            <span className="pl-num" style={{ fontSize: 15, color: 'var(--pl-ink-2)' }}>{curso.progresso}%</span>
          </div>
          <div className="pl-progress" style={{ marginTop: 6 }}>
            <div className="fill" style={{ width: `${Math.min(Math.max(curso.progresso, 0), 100)}%`, background: 'var(--pl-ink)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 14 }}>
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
    <div style={{ padding: '8px 10px', border: '1px solid var(--pl-rule-2)', borderRadius: 6, background: 'var(--pl-surface-2)' }}>
      <div className="pl-eyebrow" style={{ fontSize: 9.5 }}>{label}</div>
      <div className="pl-num" style={{ marginTop: 2, fontSize: 21, color: 'var(--pl-ink)', lineHeight: 1 }}>{value}</div>
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

function CreatePlanCard({ icon: Icon, title, text, badge, decorated = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className="pl-card"
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', padding: 24, textAlign: 'center', cursor: 'pointer' }}
    >
      {decorated && <div style={{ position: 'absolute', right: 0, top: 0, width: 96, height: 96, borderBottomLeftRadius: 100, background: 'var(--pl-accent-soft)', opacity: 0.6, pointerEvents: 'none' }} />}
      {badge && (
        <span className="pl-tag pl-tag-accent" style={{ position: 'absolute', right: 16, top: 16, fontSize: 9, fontWeight: 700 }}>
          {badge}
        </span>
      )}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 16, display: 'flex', width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule-2)' }}>
        <Icon size={28} />
      </div>
      <h3 style={{ position: 'relative', zIndex: 1, marginBottom: 8, fontSize: 17, fontWeight: 700, color: 'var(--pl-ink)', margin: '0 0 8px' }}>{title}</h3>
      <p style={{ position: 'relative', zIndex: 1, fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)', margin: 0 }}>{text}</p>
    </button>
  );
}

function MetricMiniCard({ label, value }) {
  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 12 }}>
      <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1, color: 'var(--pl-ink)', margin: 0 }}>{value}</p>
    </div>
  );
}

function ModalShell({ title, subtitle, children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.55)', padding: 16, backdropFilter: 'blur(4px)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '88vh', width: '100%', maxWidth: 860, overflow: 'hidden', borderRadius: 16, background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)', boxShadow: 'var(--pl-sh-high)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid var(--pl-rule)', padding: '20px 24px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--pl-ink)' }}>{title}</h3>
            {subtitle && <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-3)', lineHeight: 1.5 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="pl-btn pl-btn-sm" style={{ flexShrink: 0 }}>Fechar</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder = '' }) {
  return (
    <div>
      <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-input"
        style={{ width: '100%', boxSizing: 'border-box' }}
      />
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} className="pl-btn pl-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} className="pl-btn pl-btn-ghost">
      {children}
    </button>
  );
}
