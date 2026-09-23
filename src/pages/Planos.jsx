import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Book,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Layers3,
  LibraryBig,
  Loader2,
  Pencil,
  Plus,
  Play,
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
import { showConfirm, showToast } from '../lib/dialogs';
import { normalizeCourseTemplates } from '../lib/courseTemplates';
import { buildContestForRole, CONTEST_STATUS_LABELS, getContestRoles, groupContestTemplates, normalizeContestStatus } from '../lib/contestGrouping';
import { storageThumb } from '../lib/imageUrl';
import { getAreaToken } from '../lib/areaTokens';
import { RevisaoEditalPanel } from '../components/RevisaoEditalPanel';
import { LeituraEditalProgresso } from '../components/LeituraEditalProgresso';
import { avisosDoDocumento, compatibilidadeDeCargos, mesclarDisciplinasDeCargos } from '../lib/edital';
import { progressoPorObjetivo, objetivosDoCurso, montarMapaDeObjetivos } from '../lib/objetivos';
import { tipoDoObjetivo, LISTA_DE_TIPOS, marcoDoObjetivo, marcoMaisProximo } from '../lib/tiposDeObjetivo';
import { apelidoSugerido, nomeCurtoDoCurso } from '../lib/apelidoCurso';
import EditarCursoModal from '../components/EditarCursoModal';
import { ModalShell, InputField } from '../components/ModalShell';
import { CORES_DE_CURSO, capaDoCurso, descricaoDoCurso, limparDescricao, LIMITE_DA_DESCRICAO } from '../lib/personalizacaoCurso';
import { DIAS_DA_SEMANA, FORMATOS, ROTINA_PADRAO, resumoDaRotina, validarRotina } from '../lib/rotinaInicial';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// A IA devolve "Não encontrado" quando o campo não está no edital. Renderizar isso como
// dado produzia chips do tipo "Nao encontrado vagas".
const semValor = (valor) => {
  const texto = String(valor || '').trim();
  return !texto || /^n[ãa]o\s*encontrado$/i.test(texto);
};

// Rotulo e exemplo de cada campo editavel do objetivo. Quais aparecem depende do tipo —
// ver src/lib/tiposDeObjetivo.js.
const CAMPOS_DO_OBJETIVO = [
  { id: 'banca', label: 'Banca', placeholder: 'A definir' },
  { id: 'cargo', label: 'Cargo', placeholder: 'Nome do cargo' },
  { id: 'vagas', label: 'Vagas', placeholder: 'Não informado' },
  { id: 'salario', label: 'Remuneração', placeholder: 'Não informada' },
  { id: 'escolaridade', label: 'Escolaridade', placeholder: 'Não informada' },
  { id: 'instituicao', label: 'Instituição', placeholder: 'Nome da faculdade' },
  { id: 'periodo', label: 'Período', placeholder: '2026.2' },
];

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
  onUpdateCourse,
  onUploadImage,
  setSelectedCoursePlan,
  onSalvarRotina,
  concursoCatalog = [],
  remainingCourseSlots = 3,
  isAdmin = false,
  courseTemplates = [],
}) {
  const [mode, setMode] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE_FORM);
  // Dados do edital, nao do curso: o nome de cada curso mora em nomesDosCursos, um por
  // cargo. Concurso e banca sao do certame e valem para todos os cargos escolhidos.
  const [iaForm, setIaForm] = useState({ concurso: '', banca: '', editalText: '' });
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImportingCatalog, setIsImportingCatalog] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedContestId, setSelectedContestId] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  // Revisão do aluno em cima do que a IA leu. É ela que vai para a importação, não a
  // proposta crua — sem catálogo de fallback, uma leitura ruim quebraria o app inteiro.
  const [revisao, setRevisao] = useState(null);
  const [avisosDaLeitura, setAvisosDaLeitura] = useState([]);
  const [expandedCatalogAreas, setExpandedCatalogAreas] = useState({});
  // Escotilha para quem nao tem o PDF em maos (edital so em HTML, print, copia do DOU).
  // Fica escondida ate ser pedida: o caminho normal e o arquivo.
  const [modoTexto, setModoTexto] = useState(false);
  // Em que ponto a leitura esta de verdade. A animacao usava tempo cronometrado para
  // adivinhar; agora ela recebe o sinal real de quando a extracao do PDF terminou.
  const [faseDaLeitura, setFaseDaLeitura] = useState('pdf');
  const [arrastando, setArrastando] = useState(false);
  const limiteAtingido = !isAdmin && remainingCourseSlots <= 0;

  // O modal do edital tem um momento por vez, e cada um pede a tela inteira. Antes tudo
  // aparecia junto — dados do curso, area de texto, upload, revisao e o botao de confirmar
  // — e quem abria via um formulario cheio de campos sem saber por onde comecar. Agora:
  // enviar, esperar a leitura, escolher o cargo (se houver mais de um), conferir, confirmar.
  const [etapaEdital, setEtapaEdital] = useState('envio');
  // Cargos que o aluno decidiu levar, na ordem em que vao ser revisados. Um edital de cargo
  // unico entra aqui com um item so, para o resto do fluxo nao precisar de caso especial.
  const [cargosEscolhidos, setCargosEscolhidos] = useState([]);
  // Um nome de curso por cargo: a revisao e uma so, mas cada cargo vira um curso proprio.
  const [nomesDosCursos, setNomesDosCursos] = useState({});
  // Curso de destino: '' = criar um novo. Juntar este edital a um plano que ja existe e o
  // que permite estudar dois concursos (ou concurso + faculdade) de uma vez, aproveitando a
  // materia que se repete entre eles.
  const [cursoDestinoId, setCursoDestinoId] = useState('');
  const [cursosCriados, setCursosCriados] = useState([]);
  // A rotina perguntada logo depois de o curso nascer. Ver src/lib/rotinaInicial.js.
  const [rotina, setRotina] = useState(ROTINA_PADRAO);
  const [rotinaConfirmada, setRotinaConfirmada] = useState(false);

  // Cursos que podem receber este edital. Arquivado nao entra: juntar um edital novo a um
  // plano que o aluno encerrou seria ressuscitar o que ele fechou.
  const cursosParaEscolher = useMemo(
    () => (cursos || []).filter((curso) => curso?.status !== 'arquivado'),
    [cursos]
  );

  // Os cargos escolhidos, como objetos e na ordem da escolha.
  const cargosParaRevisar = useMemo(() => {
    if (!analysisResult) return [];
    return cargosEscolhidos
      .map((id) => analysisResult.contests.find((item) => item.id === id))
      .filter(Boolean);
  }, [analysisResult, cargosEscolhidos]);

  // Cada cargo importado vira um curso e consome uma vaga do plano. Oferecer mais do que
  // cabe so produziria erro na hora de criar o terceiro.
  const vagasParaCargos = isAdmin
    ? (analysisResult?.contests.length || 1)
    : Math.max(0, remainingCourseSlots);

  // Quanto dois (ou tres) cargos do mesmo edital se aproveitam. Calculado na hora da
  // escolha, que e quando a resposta muda a decisao — depois vira arrependimento.
  const compatibilidadeEscolhida = useMemo(() => {
    if (!analysisResult || cargosEscolhidos.length < 2) return null;
    const cargos = cargosEscolhidos
      .map((id) => analysisResult.contests.find((item) => item.id === id))
      .filter(Boolean);
    return cargos.length < 2 ? null : compatibilidadeDeCargos(cargos);
  }, [analysisResult, cargosEscolhidos]);
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
        // Um curso agrupa objetivos, e o progresso de cada um conta so o que cai na prova
        // dele — a materia comum entra em todos. Ver src/lib/objetivos.js.
        porObjetivo: progressoPorObjetivo(curso, disciplinas),
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
    setIaForm({ concurso: '', banca: '', editalText: '' });
    setUploadedFileName('');
    setAnalysisResult(null);
    setSelectedContestId('');
    setAnalysisError('');
    setExpandedCatalogAreas({});
    setModoTexto(false);
    setArrastando(false);
    setFaseDaLeitura('pdf');
    setEtapaEdital('envio');
    setRotina(ROTINA_PADRAO);
    setRotinaConfirmada(false);
    setCargosEscolhidos([]);
    setNomesDosCursos({});
    setCursoDestinoId('');
    setCursosCriados([]);
  };

  // Voltar do resultado para o envio sem fechar o modal: trocar de arquivo era so possivel
  // fechando e abrindo tudo de novo.
  const reiniciarLeituraDoEdital = () => {
    setAnalysisResult(null);
    setSelectedContestId('');
    setAnalysisError('');
    setRevisao(null);
    setAvisosDaLeitura([]);
    setUploadedFileName('');
    setModoTexto(false);
    setArrastando(false);
    setFaseDaLeitura('pdf');
    setEtapaEdital('envio');
    setCargosEscolhidos([]);
    setNomesDosCursos({});
    setCursoDestinoId('');
    setCursosCriados([]);
    setIaForm({ concurso: '', banca: '', editalText: '' });
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

  // Uma unica porta de edicao da revisao: marcar/desmarcar disciplina, renomear, e
  // marcar/desmarcar um topico dela.
  const alterarDisciplinaRevisada = (indice, patch) => {
    setRevisao((prev) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((item, i) => {
        if (i !== indice) return item;
        if (patch.topicoIndice !== undefined) {
          return {
            ...item,
            topicos: item.topicos.map((topico, t) => (
              t === patch.topicoIndice ? { ...topico, incluir: patch.incluirTopico } : topico
            )),
          };
        }
        return { ...item, ...patch };
      });
    });
  };

  // Depois da leitura o aluno vai para a escolha do cargo — ou direto para a revisao,
  // quando o edital tem um so. Um dropdown no meio da revisao dava a essa decisao o mesmo
  // peso visual do campo "Banca", e ela e a que define a plataforma inteira: disciplinas,
  // pesos, datas. Pior, a revisao ja vinha montada no primeiro cargo da lista, que e so o
  // primeiro que a IA encontrou — quem nao reparasse montava o curso do cargo errado.
  const irParaDepoisDaLeitura = (analysis) => {
    const cargos = analysis?.contests || [];
    if (!cargos.length) {
      setEtapaEdital('envio');
      return;
    }
    if (cargos.length === 1) {
      abrirRevisao(analysis, [cargos[0].id]);
      return;
    }
    setCargosEscolhidos([]);
    setEtapaEdital('cargos');
  };

  const alternarCargoEscolhido = (id) => {
    setCargosEscolhidos((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      // Silenciosamente ignorar o clique passando do limite faria o checkbox parecer
      // quebrado; o botao e o contador dizem quantas vagas restam.
      if (prev.length >= vagasParaCargos) return prev;
      return [...prev, id];
    });
  };

  // Uma revisao so para todos os cargos escolhidos. Revisar um de cada vez desfazia o
  // raciocinio da tela anterior: o aluno acabou de ver que os cargos se aproveitam e teria
  // que conferir duas listas quase iguais, sem enxergar o que e compartilhado.
  const abrirRevisao = (analysis, ids) => {
    const cargos = ids.map((id) => analysis.contests.find((item) => item.id === id)).filter(Boolean);
    if (!cargos.length) return;

    setCargosEscolhidos(cargos.map((cargo) => cargo.id));
    setSelectedContestId(cargos[0].id);
    // A leitura heuristica nao vem pre-marcada: ela erra bastante em edital longo, e a
    // plataforma inteira se monta em cima desta lista. O aluno marca o que estiver certo.
    setRevisao(mesclarDisciplinasDeCargos(cargos, analysis.source !== 'heuristic'));
    // Com mais de um cargo o nome do curso nao pode ser o de um deles: o curso cobre os
    // dois. Nomeia pelo certame, que e o que os une.
    const nomePadrao = cargos.length > 1
      ? (analysis.examName && analysis.examName !== 'Não encontrado' ? analysis.examName : 'Curso do edital')
      : (cargos[0].roleName || cargos[0].title);
    setNomesDosCursos({ [cargos[0].id]: nomePadrao });
    // Concurso e banca sao do edital, nao do cargo: os dois cargos saem do mesmo certame.
    setIaForm((prev) => ({
      ...prev,
      concurso: analysis.examName && analysis.examName !== 'Não encontrado'
        ? analysis.examName
        : prev.concurso || cargos[0].title,
      banca: analysis.banca || prev.banca,
    }));
    setEtapaEdital('revisao');
  };

  const confirmarCargosEscolhidos = () => {
    if (!cargosEscolhidos.length) return;
    abrirRevisao(analysisResult, cargosEscolhidos);
  };

  const runAnalysis = async (text, options = {}) => {
    const normalizedText = String(text || '').trim();

    if (!normalizedText) {
      setAnalysisResult(null);
      setSelectedContestId('');
      setAnalysisError('');
      setRevisao(null);
      setAvisosDaLeitura([]);
      return null;
    }

    // Avisa ANTES de gastar a analise: ~19% dos arquivos anunciados como edital sao
    // comunicado, retificacao ou resultado. Avisa, nao bloqueia — o aluno pode ter colado
    // so o conteudo programatico, que e curto e legitimo.
    setAvisosDaLeitura(avisosDoDocumento(normalizedText, { nomeDoArquivo: options.nomeDoArquivo || '' }));

    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      const realAnalysis = await analyzeEdital(normalizedText);
      setAnalysisResult(realAnalysis);
      irParaDepoisDaLeitura(realAnalysis);
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
        // O parser interno acerta a estrutura de um edital simples, mas em edital de verdade
        // devolve lixo com cara de leitura boa ("REMUNERAÇÃO BRUTA" como disciplina). Como a
        // plataforma inteira se monta em cima desta leitura, ele NÃO preenche os campos
        // sozinho nem vem com tudo marcado: o aluno escolhe o que aproveitar.
        irParaDepoisDaLeitura(heuristicAnalysis);
        // Esconder o motivo real deixava a gente sem saber se era chave, timeout ou sessão.
        const motivo = String(realAiError?.message || '').trim();
        setAnalysisError(
          heuristicAnalysis
            ? `A IA não respondeu — mostramos abaixo a leitura do parser interno, que costuma errar em edital longo. Confira tudo antes de confirmar.${motivo ? ` (motivo: ${motivo})` : ''}`
            : (motivo || 'Não foi possível analisar o edital.')
        );
        return heuristicAnalysis;
      } catch {
        setAnalysisResult(null);
        setEtapaEdital('envio');
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
      showToast('Envie um arquivo PDF.', 'warn');
      return;
    }

    setIsAnalyzing(true);
    setFaseDaLeitura('pdf');
    setEtapaEdital('lendo');
    setCursosCriados([]);
    setAnalysisError('');

    try {
      const extractedText = await extractPdfText(file);
      setFaseDaLeitura('ia');
      // PDF escaneado (só imagem) extrai "com sucesso" mas vem vazio — sem este check,
      // nada acontecia na tela e o usuário ficava sem feedback.
      if (String(extractedText || '').trim().length < 40) {
        setAnalysisError('Esse PDF parece ser escaneado (imagem) ou está vazio — não consegui extrair o texto. Cole o texto do edital manualmente.');
        setEtapaEdital('envio');
        return;
      }
      setIaForm((prev) => ({ ...prev, editalText: extractedText }));
      setUploadedFileName(file.name);
      await runAnalysis(extractedText, { nomeDoArquivo: file.name });
    } catch (error) {
      console.error('[Planos] erro ao ler PDF:', error?.message || error);
      setAnalysisError('Não foi possível ler esse PDF. Tente outro arquivo ou cole o texto do edital.');
      setEtapaEdital('envio');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!courseForm.nome.trim()) {
      showToast('Digite o nome do curso.', 'warn');
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
      showToast(error.message || 'Não foi possível criar esse objetivo.', 'error');
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
      showToast(error.message || 'Não foi possível criar esse objetivo.', 'error');
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
    if (roles.length === 0) {
      showToast('Esse concurso não tem cargos definidos para importar.', 'warn');
      return;
    }

    setIsImportingCatalog(true);

    try {
      await onImportCatalogCourse?.(buildContestForRole(template, roles[0]));
      closeMode();
    } catch (error) {
      showToast(error.message || 'Não foi possível importar esse concurso.', 'error');
    } finally {
      setIsImportingCatalog(false);
    }
  };

  const handleImportEdital = async () => {
    if (!cargosParaRevisar.length) return;

    // Um curso com todos os cargos escolhidos, e nao um curso por cargo.
    //
    // Com dois cargos do mesmo edital, dois cursos separados sao a mesma lista estudada em
    // duplicata: a materia comum apareceria duas vezes e o progresso nao conversaria —
    // marcar "Lingua Portuguesa" concluida num deixaria o outro em zero na mesma materia.
    // Aqui a disciplina e criada uma vez, carregando a quais cargos ela serve.
    const cursoDestino = cursosParaEscolher.find((curso) => String(curso.id) === String(cursoDestinoId));
    const nomeDoCurso = cursoDestino
      ? cursoDestino.nome
      : String(nomesDosCursos[cargosParaRevisar[0].id] || '').trim();

    if (!nomeDoCurso) {
      showToast('Dê um nome ao curso antes de confirmar.', 'warn');
      return;
    }

    const disciplinas = (revisao || [])
      .filter((item) => item.incluir && String(item.nome || '').trim())
      .map((item) => ({
        nome: String(item.nome).trim(),
        // Os topicos tambem carregam o cargo: o recorte da mesma disciplina muda entre
        // oficial e praca, e o progresso de um nao pode contar topico que nao cai na prova
        // dele.
        topicos: item.topicos.filter((topico) => topico.incluir).map((topico) => topico.nome),
        cargos: item.cargos.filter((id) => cargosEscolhidos.includes(id)),
      }))
      .filter((item) => item.cargos.length);

    if (!disciplinas.length) {
      showToast('Nenhuma disciplina ficou marcada para importar.', 'warn');
      return;
    }

    setIsImporting(true);

    try {
      const result = await onImportEdital?.({
        cursoExistenteId: cursoDestino?.id || '',
        courseData: {
          nome: nomeDoCurso,
          plano: cursoDestino?.plano || nomeDoCurso,
          concurso: iaForm.concurso.trim() || nomeDoCurso,
          banca: iaForm.banca.trim() || 'A definir',
          edital_arquivo: uploadedFileName,
        },
        editalText: iaForm.editalText,
        selectedContestId: cargosParaRevisar[0].id,
        cargosSelecionados: cargosParaRevisar.map((cargo) => cargo.id),
        analysisResult,
        // O que vale e a revisao do aluno, nao a proposta crua da IA.
        disciplinasRevisadas: disciplinas,
      });

      setCursosCriados([
        {
          nome: nomeDoCurso,
          plano: cursoDestino?.plano || nomeDoCurso,
          juntadoAExistente: Boolean(cursoDestino),
          cargos: cargosParaRevisar.map((cargo) => cargo.roleName || cargo.title),
          disciplinasCriadas: result?.disciplinasCriadas || 0,
          topicosCriados: result?.topicosCriados || 0,
          reaproveitadas: result?.disciplinasReaproveitadas || [],
        },
      ]);
      setEtapaEdital('rotina');
    } catch (error) {
      showToast(error.message || 'Não foi possível importar o edital.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const erroDaRotina = validarRotina(rotina);

  // Grava a rotina no planejamento e deixa o app montar o ciclo a partir dela. As materias
  // sao as do curso que acabou de nascer: e sobre elas que o ciclo gira.
  const salvarRotina = () => {
    if (validarRotina(rotina)) return;
    const planoNovo = cursosCriados[0]?.plano || '';
    const materias = planoNovo
      ? bancoDisciplinas.filter((disciplina) => disciplina.plano === planoNovo).map((disciplina) => disciplina.nome)
      : [];
    onSalvarRotina?.(rotina, materias);
    setRotinaConfirmada(true);
  };

  const buildCourseMetaChips = (curso) => {
    const intent = curso.intent || curso.tipo || (curso.origem === 'catalogo' || curso.origem === 'ia' ? 'concurso' : 'livre');
    const chips = [{ key: 'intent', tone: intent === 'faculdade' ? 'highlight' : 'accent', label: INTENT_LABELS[intent] || 'Objetivo' }];
    // Curso que agrupa mais de um objetivo precisa dizer isso na cara: e a diferenca entre
    // "um plano" e "dois planos no mesmo lugar".
    const totalObjetivos = objetivosDoCurso(curso).length;
    if (totalObjetivos > 1) chips.push({ key: 'objetivos', tone: 'success', label: `${totalObjetivos} objetivos` });
    if (intent === 'concurso') chips.push({ key: 'status', tone: 'accent', label: formatStatusLabel(curso.status_concurso) });
    if (curso.prova_data) chips.push({ key: 'prova', tone: 'highlight', label: `Prova ${formatDateDisplay(curso.prova_data)}` });
    if (curso.salario) chips.push({ key: 'salario', tone: 'success', label: curso.salario });
    if (curso.escolaridade) chips.push({ key: 'escolaridade', tone: '', label: curso.escolaridade });
    if (curso.inscricao_valor) chips.push({ key: 'inscricao', tone: 'warn', label: `Inscrição ${curso.inscricao_valor}` });
    // Quantas questões a prova tem, somando o quadro de provas do cargo. É o que dá noção
    // de peso — sem isso toda disciplina parece valer a mesma coisa.
    const totalQuestoes = (curso.prova || []).reduce((acc, linha) => acc + (Number(linha?.questoes) || 0), 0);
    if (totalQuestoes > 0) chips.push({ key: 'questoes', tone: 'accent', label: `${totalQuestoes} questões` });
    // De qual leitura do edital este plano nasceu. A plataforma inteira fica pendurada
    // naquele PDF, e retificação posterior não chega sozinha a quem já montou.
    if (curso.edital_lido_em) {
      chips.push({ key: 'edital', tone: '', label: `Edital lido ${formatDateDisplay(curso.edital_lido_em)}` });
    }
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
            onLimparAlvo={() => onSetTargetContest?.('')}
            onEditar={(() => {
              const curso = cursos.find((item) => item.plano === targetContest?.plano || item.nome === targetContest?.nome);
              return curso ? () => setEditingCourse(curso) : undefined;
            })()}
            onArquivar={(() => {
              const curso = cursos.find((item) => item.plano === targetContest?.plano || item.nome === targetContest?.nome);
              if (!curso || !onUpdateCourse) return undefined;
              return () => {
                onUpdateCourse(curso.id, { status: 'arquivado' });
                onSetTargetContest?.('');
              };
            })()}
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
                onApagar={() => { onDeleteCourse?.(curso); }}
                onEditar={onUpdateCourse ? () => setEditingCourse(curso) : undefined}
                onMarcarAlvo={() => {
                  const contest = myContests.find((item) => item.plano === curso.plano || item.nome === curso.nome);
                  if (contest?.id) onSetTargetContest?.(contest.id);
                }}
              />
            ))}
          </div>
        </section>

      </div>

      {editingCourse && (
        <EditarCursoModal
          curso={editingCourse}
          onClose={() => setEditingCourse(null)}
          onUploadImage={onUploadImage}
          onSave={(patch) => onUpdateCourse?.(editingCourse.id, patch)}
          onOpenDisciplinas={(curso) => {
            setSelectedCoursePlan?.(curso.plano || curso.nome || 'Todos');
            setActiveTab('disciplinas');
          }}
        />
      )}

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
          title={
            etapaEdital === 'lendo'
              ? 'Lendo o seu edital'
              : etapaEdital === 'cargos'
                ? 'Qual cargo você vai fazer?'
                : etapaEdital === 'revisao'
                  ? 'Confira o que a IA encontrou'
                  : etapaEdital === 'rotina'
                    ? 'Quando você estuda?'
                    : etapaEdital === 'pronto'
                      ? 'Tudo pronto'
                      : 'Montar o curso pelo edital'
          }
          subtitle={
            etapaEdital === 'lendo'
              ? 'Leva alguns segundos. Pode deixar aberto.'
              : etapaEdital === 'cargos'
                ? 'É esta escolha que define suas disciplinas, os pesos e as datas.'
                : etapaEdital === 'revisao'
                  ? 'Nada é criado antes de você confirmar. Desmarque o que não for do seu cargo.'
                  : etapaEdital === 'rotina'
                    ? 'Último passo. É com isso que a plataforma monta o plano do dia, a meta da semana e as revisões.'
                    : etapaEdital === 'pronto'
                      ? ''
                      : 'Envie o PDF do edital e a IA monta as disciplinas, os tópicos e o quadro de provas do seu cargo.'
          }
          onClose={closeMode}
        >
          {/* ETAPA 1 — só o envio. Nada de formulário antes de existir o que preencher. */}
          {etapaEdital === 'envio' && (
            <div style={{ display: 'grid', gap: 18 }}>
              <label
                onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(e) => {
                  // A borda tracejada promete arrastar-e-soltar. Sem isso o arquivo solto
                  // abria no navegador e o aluno perdia o que tinha feito na tela.
                  e.preventDefault();
                  setArrastando(false);
                  handlePdfUpload(e.dataTransfer?.files?.[0]);
                }}
                style={{
                  display: 'flex',
                  cursor: 'pointer',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 10,
                  borderRadius: 14,
                  border: `2px dashed ${arrastando ? 'var(--pl-accent)' : 'var(--pl-accent-ring)'}`,
                  background: 'var(--pl-accent-soft)',
                  padding: '44px 24px',
                  transition: 'border-color 120ms ease, transform 120ms ease',
                  transform: arrastando ? 'scale(1.01)' : 'none',
                }}
              >
                <Upload size={26} style={{ color: 'var(--pl-accent)' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-accent)' }}>
                  {arrastando ? 'Solte o arquivo aqui' : 'Selecionar o PDF do edital'}
                </span>
                <span style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--pl-ink-2)', maxWidth: 400 }}>
                  Use o edital de abertura — é o que traz o conteúdo programático. A partir dele a
                  plataforma inteira se organiza: disciplinas, pesos e datas.
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handlePdfUpload(e.target.files?.[0])}
                />
              </label>

              {analysisError && (
                <div style={{ borderRadius: 12, border: '1px solid var(--pl-warn-soft)', background: 'var(--pl-warn-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-warn)' }}>
                  {analysisError}
                </div>
              )}

              {/* A escotilha do texto colado fica fechada: PDF é o caminho normal, e a área de
                  texto aberta sempre fazia o modal parecer um formulário de digitação. */}
              {modoTexto ? (
                <div>
                  <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                    Texto do edital
                  </label>
                  <textarea
                    rows={10}
                    autoFocus
                    value={iaForm.editalText}
                    placeholder="Cole aqui o conteúdo programático do edital."
                    onChange={(e) => {
                      const value = e.target.value;
                      setIaForm((prev) => ({ ...prev, editalText: value }));
                      setAnalysisError('');
                    }}
                    className="pl-input"
                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <button className="pl-btn pl-btn-link" onClick={() => setModoTexto(false)}>
                      Voltar para o envio do PDF
                    </button>
                    <SecondaryButton
                      onClick={() => {
                        setFaseDaLeitura('texto');
                        runAnalysis(iaForm.editalText);
                      }}
                      disabled={!iaForm.editalText.trim()}
                    >
                      Analisar texto com IA
                    </SecondaryButton>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button className="pl-btn pl-btn-link" onClick={() => setModoTexto(true)}>
                    Não tenho o PDF — colar o texto do edital
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ETAPA 2 — só a espera. */}
          {etapaEdital === 'lendo' && (
            <div style={{ padding: '8px 0 4px' }}>
              <LeituraEditalProgresso fase={faseDaLeitura} />
              {uploadedFileName && (
                <p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: 12.5, color: 'var(--pl-ink-3)' }}>
                  {uploadedFileName}
                </p>
              )}
            </div>
          )}

          {/* ETAPA 3 — a escolha do cargo, quando o edital traz mais de um. E a decisao
              mais pesada do fluxo: define disciplinas, pesos e datas do app inteiro. */}
          {etapaEdital === 'cargos' && analysisResult && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--pl-ink-2)', lineHeight: 1.55 }}>
                  Este edital traz <strong style={{ color: 'var(--pl-ink)' }}>{analysisResult.contests.length} cargos</strong>.
                  {vagasParaCargos > 1
                    ? ` Você pode levar até ${vagasParaCargos} — cada um vira um curso separado.`
                    : ' Escolha o seu.'}
                </p>
                {/* Sem vaga livre, todo checkbox ficaria bloqueado sem explicar por que. */}
                {vagasParaCargos === 0 && (
                  <div style={{ marginTop: 12, borderRadius: 12, border: '1px solid var(--pl-warn-soft)', background: 'var(--pl-warn-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-warn)' }}>
                    Seu plano está com todas as vagas de curso ocupadas. Apague um curso que não
                    usa mais para conseguir importar este edital.
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {analysisResult.contests.map((contest, idx) => {
                  const escolhido = cargosEscolhidos.includes(contest.id);
                  const bloqueado = !escolhido && cargosEscolhidos.length >= vagasParaCargos;

                  return (
                    <label
                      key={contest.id ?? idx}
                      className="pl-card"
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '14px 16px',
                        cursor: bloqueado ? 'not-allowed' : 'pointer',
                        opacity: bloqueado ? 0.45 : 1,
                        borderColor: escolhido ? 'var(--pl-accent)' : 'var(--pl-rule-2)',
                        background: escolhido ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={escolhido}
                        disabled={bloqueado}
                        onChange={() => alternarCargoEscolhido(contest.id)}
                        style={{ marginTop: 3, flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>
                          {contest.roleName || contest.title}
                        </p>
                        {/* Vagas, salario e escolaridade sao o que faz alguem escolher um
                            cargo em vez de outro — o nome sozinho nao decide nada. */}
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {[
                            // "Não encontrado" é a IA dizendo que o campo não estava no
                            // edital — virava o chip "Nao encontrado vagas" na tela.
                            semValor(contest.vagas) ? '' : `${contest.vagas} vagas`,
                            semValor(contest.salario) ? '' : contest.salario,
                            semValor(contest.escolaridade) ? '' : contest.escolaridade,
                            contest.totalQuestoes ? `${contest.totalQuestoes} questões` : '',
                            `${contest.disciplinasCount} disciplinas`,
                          ]
                            .filter(Boolean)
                            .map((chip) => (
                              <span key={chip} className="pl-tag" style={{ fontSize: 11 }}>{chip}</span>
                            ))}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Com dois cargos marcados, a pergunta que importa e uma so: estudar os dois
                  e quase dobrar o esforco, ou boa parte se aproveita? Responder aqui, na
                  escolha, e o que evita descobrir isso com dois cursos ja montados. */}
              {compatibilidadeEscolhida && (() => {
                const { aproveitamento, comuns, exclusivos, acrescimo, contido } = compatibilidadeEscolhida;
                const cor = aproveitamento >= 70
                  ? 'var(--pl-success)'
                  : aproveitamento >= 40
                    ? 'var(--pl-warn)'
                    : 'var(--pl-danger)';
                // Quem tem menos disciplinas e o cargo "coberto" pelo outro.
                const menor = [...exclusivos].sort((a, b) => a.disciplinas.length - b.disciplinas.length)[0];

                return (
                  <div className="pl-card" style={{ padding: '14px 16px', borderColor: cor }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <span className="pl-num" style={{ fontSize: 26, color: cor }}>{aproveitamento}%</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--pl-ink)' }}>
                        do cargo mais enxuto já cai no outro
                      </span>
                    </div>

                    <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--pl-ink-2)', lineHeight: 1.55 }}>
                      {comuns.length === 0
                        ? 'Nenhuma disciplina se repete. Na prática são dois estudos separados.'
                        : contido
                          ? `${menor?.nome || 'Um dos cargos'} está inteiro dentro do outro: estudando o maior, você já cobre os dois. Levar os dois acrescenta ${acrescimo} ${acrescimo === 1 ? 'disciplina' : 'disciplinas'}.`
                          : `${comuns.length} ${comuns.length === 1 ? 'disciplina cai' : 'disciplinas caem'} nos dois. Levar o segundo cargo acrescenta ${acrescimo} ${acrescimo === 1 ? 'disciplina' : 'disciplinas'} ao seu estudo.`}
                    </p>

                    {comuns.length > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {comuns.slice(0, 8).map((nome) => (
                          <span key={nome} className="pl-tag pl-tag-success" style={{ fontSize: 11 }}>{nome}</span>
                        ))}
                        {comuns.length > 8 && (
                          <span className="pl-tag" style={{ fontSize: 11 }}>+{comuns.length - 8}</span>
                        )}
                      </div>
                    )}

                    {/* Nomear as exclusivas, e nao so conta-las: e assim que da para ver se a
                        diferenca e real ou se foram dois jeitos de escrever a mesma materia —
                        e nos dois casos o aluno decide melhor do que com um numero solto. */}
                    {exclusivos.some((cargo) => cargo.disciplinas.length > 0) && (
                      <div style={{ marginTop: 12, display: 'grid', gap: 8, borderTop: '1px solid var(--pl-rule)', paddingTop: 12 }}>
                        {exclusivos
                          .filter((cargo) => cargo.disciplinas.length > 0)
                          .map((cargo) => (
                            <div key={cargo.nome}>
                              <p className="pl-eyebrow" style={{ marginBottom: 5 }}>
                                Só em {cargo.nome} ({cargo.disciplinas.length})
                              </p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {cargo.disciplinas.map((nome) => (
                                  <span key={nome} className="pl-tag" style={{ fontSize: 11 }}>{nome}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--pl-rule)', paddingTop: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, color: 'var(--pl-ink-3)' }}>
                  {cargosEscolhidos.length} de {vagasParaCargos} {vagasParaCargos === 1 ? 'vaga' : 'vagas'} do seu plano
                </span>
                <div style={{ display: 'flex', gap: 12 }}>
                  <SecondaryButton onClick={reiniciarLeituraDoEdital}>Enviar outro edital</SecondaryButton>
                  <PrimaryButton onClick={confirmarCargosEscolhidos} disabled={!cargosEscolhidos.length}>
                    <ArrowRight size={16} />
                    {cargosEscolhidos.length > 1
                      ? `Revisar ${cargosEscolhidos.length} cargos`
                      : 'Revisar o cargo'}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4 — o que a IA achou, do resumo ao detalhe. */}
          {etapaEdital === 'revisao' && cargosParaRevisar.length > 0 && (
            <div style={{ display: 'grid', gap: 20 }}>
              {analysisError && (
                <div style={{ borderRadius: 12, border: '1px solid var(--pl-warn-soft)', background: 'var(--pl-warn-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-warn)' }}>
                  {analysisError}
                </div>
              )}

              {/* O resumo em números vem antes da lista: é o que diz num relance se a leitura
                  faz sentido. Uma disciplina e três tópicos denunciam edital mal lido.
                  Com dois cargos, os números são da lista mesclada — é o que o aluno vai
                  revisar — e as questões, que são por prova, saem do resumo. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Disciplinas', valor: (revisao || []).length },
                  { label: 'Tópicos', valor: (revisao || []).reduce((acc, item) => acc + item.topicos.length, 0) },
                  cargosParaRevisar.length > 1
                    ? { label: 'Cargos', valor: cargosParaRevisar.length }
                    : { label: 'Questões', valor: cargosParaRevisar[0].totalQuestoes || '—' },
                  { label: 'Banca', valor: analysisResult.banca },
                ].map((kpi) => (
                  <div key={kpi.label} className="pl-card" style={{ padding: '12px 16px' }}>
                    <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{kpi.label}</p>
                    <p
                      className="pl-num"
                      style={{
                        margin: 0,
                        fontSize: typeof kpi.valor === 'number' ? 22 : 15,
                        lineHeight: 1.3,
                        color: 'var(--pl-ink)',
                      }}
                    >
                      {kpi.valor}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quais cargos estao nesta revisao. Com dois, a lista abaixo e mesclada — e
                  sem dizer isso o aluno acha que esta vendo so um deles. */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <p className="pl-eyebrow" style={{ marginBottom: 4 }}>
                    {cargosParaRevisar.length > 1 ? `${cargosParaRevisar.length} cargos nesta revisão` : 'Cargo'}
                  </p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>
                    {cargosParaRevisar.map((cargo) => cargo.roleName || cargo.title).join('  ·  ')}
                  </p>
                </div>
                {analysisResult.contests.length > 1 && (
                  <button className="pl-btn pl-btn-link" onClick={() => setEtapaEdital('cargos')}>
                    Trocar os cargos
                  </button>
                )}
              </div>

              {/* Um nome de curso por cargo: a revisao e uma so, mas no fim nasce um curso
                  para cada. Concurso e banca sao do edital, entao ficam fora do laco. */}
              <div style={{ display: 'grid', gap: 16 }}>
                {/* A pergunta que faltava: plano novo ou um que ja existe?
                    Sem ela, cada edital virava um curso separado — e quem presta dois
                    concursos estudava a materia repetida duas vezes, com o progresso
                    dividido entre os dois planos. */}
                {cursosParaEscolher.length > 0 && (
                  <div>
                    <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                      Onde entra este edital?
                    </label>
                    <select
                      value={cursoDestinoId}
                      onChange={(e) => setCursoDestinoId(e.target.value)}
                      className="pl-input"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="">Criar um curso novo</option>
                      {cursosParaEscolher.map((curso) => (
                        <option key={curso.id} value={curso.id}>
                          Juntar a {nomeCurtoDoCurso(curso)}
                        </option>
                      ))}
                    </select>
                    {cursoDestinoId && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--pl-ink-3)' }}>
                        As matérias que já existem nesse curso não são criadas de novo — elas
                        passam a valer também para os objetivos deste edital.
                      </p>
                    )}
                  </div>
                )}

                {/* Um nome so: e um curso cobrindo os dois cargos, nao um curso por cargo. */}
                {!cursoDestinoId && (
                <InputField
                  label="Nome do curso"
                  value={nomesDosCursos[cargosParaRevisar[0].id] || ''}
                  onChange={(value) =>
                    setNomesDosCursos((prev) => ({ ...prev, [cargosParaRevisar[0].id]: value }))
                  }
                />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
                  <InputField label="Concurso/órgão" value={iaForm.concurso} onChange={(value) => setIaForm((prev) => ({ ...prev, concurso: value }))} />
                  <InputField label="Banca" value={iaForm.banca} onChange={(value) => setIaForm((prev) => ({ ...prev, banca: value }))} />
                </div>
              </div>

              <RevisaoEditalPanel
                cargos={cargosParaRevisar}
                analysis={analysisResult}
                revisao={revisao}
                onAlterarDisciplina={alterarDisciplinaRevisada}
                avisos={analysisResult.source === 'heuristic'
                  ? ['Esta leitura NÃO veio da IA — é do parser interno, que erra bastante em edital longo. '
                     + 'Nada vem marcado de propósito: marque só o que estiver certo, ou feche e tente de novo.',
                     ...avisosDaLeitura]
                  : avisosDaLeitura}
                nomeDoArquivo={uploadedFileName}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--pl-rule)', paddingTop: 16 }}>
                <SecondaryButton onClick={reiniciarLeituraDoEdital} disabled={isImporting}>
                  Enviar outro edital
                </SecondaryButton>
                <PrimaryButton onClick={handleImportEdital} disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Criando o curso...
                    </>
                  ) : (
                    <>
                      <Wand2 size={16} />
                      {cargosParaRevisar.length > 1 ? 'Confirmar e criar o curso' : 'Confirmar e criar'}
                    </>
                  )}
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* ETAPA 5 — a rotina. O edital diz O QUE estudar; falta dizer QUANDO, e sem isso
              o plano do dia, a meta da semana e as revisoes nao tem como se comportar.
              Mandar o aluno para outra aba aqui era pedir que ele recomecasse um fluxo que
              ja estava na mao. */}
          {etapaEdital === 'rotina' && (
            <div style={{ display: 'grid', gap: 22 }}>
              <div className="pl-card-paper" style={{ padding: '12px 16px' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>
                  {cursosCriados[0]?.nome} está criado.
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--pl-ink-2)' }}>
                  {cursosCriados[0]?.disciplinasCriadas} disciplinas · {cursosCriados[0]?.topicosCriados} tópicos
                  {cursosCriados[0]?.cargos?.length > 1 ? ` · ${cursosCriados[0].cargos.length} objetivos` : ''}
                </p>
              </div>

              <div>
                <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Quais dias você estuda?</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {DIAS_DA_SEMANA.map((dia) => {
                    const ativo = Boolean(rotina.dias[dia.id]);
                    return (
                      <button
                        key={dia.id}
                        type="button"
                        onClick={() => setRotina((prev) => ({ ...prev, dias: { ...prev.dias, [dia.id]: !prev.dias[dia.id] } }))}
                        aria-pressed={ativo}
                        style={{
                          minWidth: 56, padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                          fontSize: 12.5, fontWeight: 700,
                          border: `1px solid ${ativo ? 'var(--pl-ink)' : 'var(--pl-rule-2)'}`,
                          background: ativo ? 'var(--pl-ink)' : 'var(--pl-surface)',
                          color: ativo ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
                        }}
                      >
                        {dia.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Quantas horas por dia?</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    step="1"
                    value={rotina.horasPorDia}
                    onChange={(e) => setRotina((prev) => ({ ...prev, horasPorDia: Number(e.target.value) }))}
                    style={{ flex: 1, minWidth: 220, accentColor: 'var(--pl-accent)' }}
                  />
                  <span className="pl-num" style={{ fontSize: 26, color: 'var(--pl-ink)', minWidth: 52 }}>
                    {rotina.horasPorDia}h
                  </span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--pl-ink-3)' }}>
                  {resumoDaRotina(rotina)}
                </p>
              </div>

              <div>
                <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Como você quer organizar?</p>
                <div style={{ display: 'grid', gap: 8 }}>
                  {FORMATOS.map((formato) => {
                    const ativo = rotina.formato === formato.id;
                    return (
                      <button
                        key={formato.id}
                        type="button"
                        onClick={() => setRotina((prev) => ({ ...prev, formato: formato.id }))}
                        aria-pressed={ativo}
                        style={{
                          textAlign: 'left', padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                          border: `1px solid ${ativo ? 'var(--pl-accent)' : 'var(--pl-rule-2)'}`,
                          background: ativo ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
                        }}
                      >
                        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: ativo ? 'var(--pl-accent)' : 'var(--pl-ink)' }}>
                          {formato.titulo}
                        </span>
                        <span style={{ display: 'block', marginTop: 3, fontSize: 12, color: 'var(--pl-ink-2)' }}>
                          {formato.detalhe}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {erroDaRotina && (
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--pl-danger)' }}>{erroDaRotina}</p>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                {/* Pular nao perde o curso: ele ja esta criado. So a rotina fica pendente, e
                    o Inicio avisa. */}
                <SecondaryButton onClick={() => setEtapaEdital('pronto')}>Deixar para depois</SecondaryButton>
                <PrimaryButton
                  disabled={Boolean(erroDaRotina)}
                  onClick={() => {
                    salvarRotina();
                    setEtapaEdital('pronto');
                  }}
                >
                  <CalendarDays size={16} />
                  Confirmar rotina
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* ETAPA 6 — fim. Sem a revisão por baixo, que já não serve para nada. */}
          {etapaEdital === 'pronto' && (
            <div style={{ display: 'grid', gap: 18, justifyItems: 'center', textAlign: 'center', padding: '20px 0 8px' }}>
              <CheckCircle2 size={34} style={{ color: 'var(--pl-success)' }} />
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--pl-ink)' }}>
                  {cursosCriados[0]?.juntadoAExistente
                    ? `Objetivos adicionados a ${cursosCriados[0]?.nome}.`
                    : `${cursosCriados[0]?.nome} está pronto.`}
                </p>
              </div>

              {/* Com varios cargos importados, um resumo unico escondia o que cada curso
                  ganhou — e e isso que diz se alguma revisao saiu magra demais. */}
              <div style={{ display: 'grid', gap: 8, width: '100%', maxWidth: 420 }}>
                {cursosCriados.map((curso, idx) => (
                  <div
                    key={`${curso.plano}-${idx}`}
                    className="pl-card"
                    style={{ padding: '12px 16px', textAlign: 'left' }}
                  >
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--pl-ink)' }}>{curso.nome}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--pl-ink-2)' }}>
                      {curso.disciplinasCriadas} disciplinas · {curso.topicosCriados} tópicos
                    </p>
                    {curso.cargos?.length > 1 && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--pl-ink-3)' }}>
                        Cobrindo {curso.cargos.length} objetivos: {curso.cargos.join(' e ')}
                      </p>
                    )}
                    {/* O ganho de juntar os editais num plano so: a materia que ja estava la
                        passa a valer para os dois, sem estudar de novo. */}
                    {curso.reaproveitadas?.length > 0 && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--pl-success)' }}>
                        {curso.reaproveitadas.length}{' '}
                        {curso.reaproveitadas.length === 1 ? 'matéria já estava' : 'matérias já estavam'}
                        {' '}no curso e agora {curso.reaproveitadas.length === 1 ? 'vale' : 'valem'} para os dois.
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* A rotina ja passou pela etapa anterior. Quando ela ficou de fora, este e o
                  unico lugar que ainda pode cobra-la antes de o aluno sumir na plataforma. */}
              {rotinaConfirmada ? (
                <div className="pl-card-paper" style={{ padding: '12px 16px', width: '100%', maxWidth: 420 }}>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink)' }}>
                    Sua rotina: {resumoDaRotina(rotina)}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--pl-ink-3)' }}>
                    Dá para mudar quando quiser em Planejamento.
                  </p>
                </div>
              ) : (
                <div className="pl-card-paper" style={{ padding: '12px 16px', width: '100%', maxWidth: 420 }}>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--pl-warn)' }}>
                    Falta definir quando você estuda.
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--pl-ink-3)' }}>
                    Sem isso, o plano do dia, a meta e as revisões ficam parados. O aviso
                    continua no Início até você configurar.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <PrimaryButton
                  onClick={() => {
                    setSelectedCoursePlan?.(cursosCriados[0]?.plano || 'Todos');
                    setActiveTab(rotinaConfirmada ? 'home' : 'planejamento');
                    closeMode();
                  }}
                >
                  {rotinaConfirmada ? 'Começar a estudar' : 'Definir a rotina agora'}
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => {
                    setSelectedCoursePlan?.(cursosCriados[0]?.plano || 'Todos');
                    setActiveTab('disciplinas');
                    closeMode();
                  }}
                >
                  Ver as disciplinas
                </SecondaryButton>
              </div>
            </div>
          )}
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

function ConcursoAlvoCard({ target, cursoStats = [], onTrocar, onLimparAlvo, onAbrir, onEditar, onArquivar }) {
  const targetStats = cursoStats.find(
    (c) => c.plano === target?.plano || c.nome === target?.nome
  ) || null;

  const areaToken = target ? getAreaToken(target.area || '') : null;
  const cover = areaToken?.cover    ?? '#1a1a2e';
  const glow  = areaToken?.coverGlow ?? '#2d2d52';
  const [todayTime, setTodayTime] = React.useState(0);

  React.useEffect(() => {
    // Normaliza para a meia-noite local: a prova é fixada em T00:00:00, então comparar
    // contra "agora" (Date.now) desviava a contagem de dias em até 1 dia conforme a hora.
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setTodayTime(now.getTime());
  }, []);

  // O prazo do alvo depende do tipo: concurso conta dias para a prova, faculdade para o
  // fim do periodo, estudo livre nao tem prazo. Ver src/lib/tiposDeObjetivo.js.
  const marco = target ? marcoDoObjetivo(target, todayTime ? new Date(todayTime) : new Date()) : null;
  const daysToExam = marco ? marco.dias : null;

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
    const raw = String(v || '').trim();
    if (!raw) return null;
    // Captura cada número no formato pt-BR (ex.: "2.500,00", "4000", "1.234").
    // Antes, faixas ("R$ 2.500 a R$ 4.000") embolavam num único parseFloat e mostravam lixo.
    const tokens = raw.match(/\d[\d.]*(?:,\d+)?/g);
    if (!tokens) return null;
    const nums = tokens
      .map((s) => parseFloat(s.replace(/\./g, '').replace(',', '.')))
      .filter((n) => isFinite(n) && n > 0);
    if (nums.length === 0) return null;
    const fmt = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return min === max ? fmt(min) : `${fmt(min)} a ${fmt(max)}`;
  };

  const salario = semValor(target?.salario) ? null : formatSalario(target?.salario);
  const provaLabel = target?.prova_data ? formatDateDisplay(target.prova_data) : null;
  const quickFacts = [
    // O rotulo vem do tipo: "Prova" num concurso, "Fim do periodo" numa faculdade. Estudo
    // livre nao mostra prazo nenhum, em vez de exibir "Sem data" com cara de pendencia.
    ...(tipoDoObjetivo(target).temPrazo
      ? [{ key: 'prazo', icon: CalendarDays, label: marco?.rotulo || tipoDoObjetivo(target).rotuloDoPrazo, value: provaLabel || 'Sem data', tone: daysToExam !== null && daysToExam < 0 ? 'muted' : 'default' }]
      : []),
    // semValor: "Nao encontrado" e a IA dizendo que o campo nao estava no edital — exibir
    // isso como dado e pior que deixar em branco, porque parece informacao conferida.
    ...(tipoDoObjetivo(target).campos.includes('vagas')
      ? [{ key: 'vagas', icon: Users, label: 'Vagas', value: semValor(target?.vagas) ? 'A definir' : `${target.vagas}`, tone: 'default' }]
      : []),
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
            ? <img src={storageThumb(target.imagem_url, 160)} alt={target.nome} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.30))' }} />
            : <Target size={26} style={{ color: 'rgba(243,239,229,0.65)' }} strokeWidth={1.5} />
          }
        </div>

        {/* Título + eyebrow + dias */}
        <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
            <Target size={10} strokeWidth={2.5} style={{ color: 'rgba(243,239,229,0.45)', flexShrink: 0 }} />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.45)' }}>Objetivo-alvo</span>
            {daysToExam !== null && (() => {
              // O selo fica sobre o banner escuro (independe do tema claro/escuro),
              // então usamos fundos sólidos por urgência com texto claro de alto contraste,
              // em vez dos tokens --pl-warn/--pl-danger (calibrados p/ fundo de página, ilegíveis aqui).
              const tone = daysToExam < 0
                ? { bg: 'rgba(0,0,0,0.32)', fg: 'rgba(243,239,229,0.6)', border: 'rgba(243,239,229,0.14)' }
                : daysToExam < 30
                  ? { bg: '#dc2626', fg: '#fff', border: 'rgba(255,255,255,0.28)' }
                  : daysToExam < 90
                    ? { bg: '#b45309', fg: '#fff', border: 'rgba(255,255,255,0.24)' }
                    : { bg: 'rgba(243,239,229,0.16)', fg: '#f3efe5', border: 'rgba(243,239,229,0.22)' };
              return (
                <span style={{
                  marginLeft: 'auto', padding: '3px 9px', borderRadius: 5, whiteSpace: 'nowrap',
                  background: tone.bg,
                  border: `1px solid ${tone.border}`,
                  color: tone.fg,
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.03em',
                }}>
                  {daysToExam < 0
                    ? `${marco?.rotulo || 'Prazo'} encerrado`
                    : `${daysToExam}d ${marco?.rotuloDaContagem || ''}`.trim()}
                </span>
              );
            })()}
          </div>
          <h2 style={{
            margin: 0, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300,
            fontSize: 27, lineHeight: 1.1, color: '#f3efe5',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {target ? nomeCurtoDoCurso(target) : 'Nenhum alvo definido'}
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
                  {disciplinaPreview.map((nome, idx) => (
                    <span key={`${nome}-${idx}`} className="pl-tag" style={{ fontSize: 10, padding: '2px 8px' }}>{nome}</span>
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

            {/* Prova que ja passou nao pode ser so um selo: ou a data foi remarcada (o que
                em concurso e rotina), ou o objetivo acabou. Sem saida daqui, o plano vive
                entulhado de prova vencida. */}
            {daysToExam !== null && daysToExam < 0 && (onEditar || onArquivar) && (
              <div
                className="pl-card"
                style={{ padding: '10px 14px', borderColor: 'var(--pl-warn)', background: 'var(--pl-warn-soft)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--pl-warn)', flex: 1, minWidth: 180 }}>
                  {marco?.rotulo === 'Prova'
                    ? 'A data desta prova já passou. Foi remarcada?'
                    : 'Este prazo já passou. Quer atualizar?'}
                </span>
                {onEditar && (
                  <button className="pl-btn pl-btn-sm" onClick={onEditar}>Remarcar data</button>
                )}
                {onArquivar && (
                  <button className="pl-btn pl-btn-sm" onClick={onArquivar}>Arquivar objetivo</button>
                )}
              </div>
            )}

            {/* Ações */}
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button className="pl-btn pl-btn-sm" onClick={onTrocar}>Trocar alvo</button>
              {onLimparAlvo && (
                <button className="pl-btn pl-btn-sm" onClick={onLimparAlvo} title="Estudar sem um alvo definido">
                  Remover alvo
                </button>
              )}
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
  const visible = items;

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 560, overflowY: 'auto', paddingRight: 4, marginRight: -4 }}>
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

function CursoTile({ curso, chips = [], isTarget, onAbrir, onApagar, onEditar, onMarcarAlvo }) {
  const isLibrary = curso.origem === 'catalogo' || curso.origem === 'biblioteca';
  const intent = curso.intent || curso.tipo || (isLibrary || curso.origem === 'ia' ? 'concurso' : 'livre');
  // "Importado por IA" nao diz nada ao aluno sobre o curso dele — diz como a gente construiu
  // o produto. O selo volta a ser o tipo do objetivo (Concurso, Vestibular, Graduacao).
  const tipoLabel = isLibrary ? 'Biblioteca' : INTENT_LABELS[intent] || 'Personalizado';
  const secondaryTag = curso.cargo || curso.area || curso.curso_superior || curso.instituicao || (intent === 'concurso' ? curso.status_concurso : '') || 'Geral';
  const visibleChips = chips.slice(0, 3);

  // A capa e do curso do aluno. Cartao da biblioteca (publicado pelo admin) nao recebe capa:
  // ali a personalizacao nao e dele.
  const capa = isLibrary ? null : capaDoCurso(curso);

  return (
    <div className="pl-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 318 }}>
      {capa && (
        <div
          style={{
            height: 64,
            background: capa.tipo === 'imagem' ? `${capa.gradiente}` : capa.gradiente,
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {capa.tipo === 'imagem' && (
            <img
              src={storageThumb(capa.url, 640)}
              alt=""
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
        </div>
      )}
      <div style={{ position: 'relative', padding: '14px 16px 12px', borderBottom: '1px solid var(--pl-rule)', background: isLibrary ? 'var(--pl-bg-soft)' : 'var(--pl-surface-2)' }}>
        {!capa && <div style={{ position: 'absolute', top: 0, right: 0, width: 22, height: 22, background: 'var(--pl-bg-deep)', clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', minWidth: 0, gap: 6, flexWrap: 'wrap' }}>
            <span className={`pl-tag ${isLibrary ? '' : 'pl-tag-highlight'}`} style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {tipoLabel}
            </span>
            {isTarget && <span className="pl-tag pl-tag-warn">Alvo</span>}
          </div>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            {onEditar && (
              <button onClick={onEditar} title="Personalizar curso" style={{ border: 0, background: 'transparent', color: 'var(--pl-ink-4)', cursor: 'pointer', padding: 4 }}>
                <Pencil size={15} />
              </button>
            )}
            <button onClick={onApagar} title="Excluir curso" style={{ border: 0, background: 'transparent', color: 'var(--pl-ink-4)', cursor: 'pointer', padding: 4 }}>
              <Trash2 size={15} />
            </button>
          </div>
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
              <img src={storageThumb(curso.imagem_url, 256)} alt={curso.nome} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            <h3
              title={curso.nome}
              style={{ margin: secondaryTag ? '3px 0 0' : 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 18, fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--pl-ink)' }}
            >
              {nomeCurtoDoCurso(curso)}
            </h3>
          </div>
        </div>
      </div>

      <div style={{ padding: '13px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <p style={{ margin: 0, minHeight: 34, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 12, lineHeight: 1.42, fontWeight: 500, color: 'var(--pl-ink-3)' }}>
          {descricaoDoCurso(curso)}
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

        {/* Com mais de um cargo, uma barra so mentiria: a materia exclusiva de um cargo
            conta no total geral mas nao avanca o outro. Uma barra por cargo diz a verdade —
            e a materia comum, estudada uma vez, sobe as duas. */}
        {curso.porObjetivo?.length > 1 ? (
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>Progresso por objetivo</span>
            {curso.porObjetivo.map((cargo) => (
              <div key={cargo.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--pl-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cargo.nome}
                  </span>
                  <span className="pl-num" style={{ fontSize: 14, color: 'var(--pl-ink-2)', flexShrink: 0 }}>{cargo.percentual}%</span>
                </div>
                <div className="pl-progress" style={{ marginTop: 5 }}>
                  <div className="fill" style={{ width: `${Math.min(Math.max(cargo.percentual, 0), 100)}%`, background: 'var(--pl-ink)' }} />
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--pl-ink-3)' }}>
                  {cargo.disciplinas} disciplinas · {cargo.concluidos} de {cargo.topicos} tópicos
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>Progresso do objetivo</span>
              <span className="pl-num" style={{ fontSize: 15, color: 'var(--pl-ink-2)' }}>{curso.progresso}%</span>
            </div>
            <div className="pl-progress" style={{ marginTop: 6 }}>
              <div className="fill" style={{ width: `${Math.min(Math.max(curso.progresso, 0), 100)}%`, background: 'var(--pl-ink)' }} />
            </div>
          </div>
        )}

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
