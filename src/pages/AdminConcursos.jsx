import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  AlertTriangle,
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
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { resolveSubjectCatalogEntry } from '../lib/subjectCatalogUtils';
import { analyzeContestForm } from '../lib/aiClient';
import { extractTextFromPdf } from '../lib/redacoesApi';
import { supabase } from '../lib/supabase';
import AdminPageHeader from '../components/AdminPageHeader';
import { useToast } from '../lib/toast';

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
const ETAPA_OPTION_VALUES = ETAPA_OPTIONS.map((option) => option.value);

const AREA_OPTIONS = ['Policial', 'Agropecuária', 'Tribunais', 'Fiscal', 'Controle', 'Legislativo', 'Administrativa', 'Educação', 'Saúde', 'Geral'];

const EMPTY_SUBJECT = { nome: '', cor: '', topicosTexto: '' };
const UNCERTAIN_PATTERN = /n[aã]o tenho certeza|n[aã]o consta|n[aã]o encontrado|n[aã]o informado|ausente/i;
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

function cleanImportedValue(value = '') {
  const text = String(value || '')
    .replace(/^\*\*|\*\*$/g, '')
    .replace(/^[-*]\s*/, '')
    .trim();

  return UNCERTAIN_PATTERN.test(text) ? '' : text;
}

function normalizeImportedArea(value = '') {
  const raw = String(value || '').trim();
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/policial|seguranca/.test(normalized)) return 'Policial';
  if (/agro/.test(normalized)) return 'Agropecuária';
  if (/jurid|direito|tribunal|justica/.test(normalized)) return 'Tribunais';
  if (/fiscal|tribut/.test(normalized)) return 'Fiscal';
  if (/controle|contas|auditor/.test(normalized)) return 'Controle';
  if (/legisl/.test(normalized)) return 'Legislativo';
  if (/admin/.test(normalized)) return 'Administrativa';
  if (/educ/.test(normalized)) return 'Educação';
  if (/saude/.test(normalized)) return 'Saúde';
  return AREA_OPTIONS.includes(raw) ? raw : 'Geral';
}

function normalizeImportedStatus(value = '') {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/suspens/.test(normalized)) return 'suspenso';
  if (/encerr/.test(normalized)) return 'encerrado';
  if (/previst/.test(normalized)) return 'previsto';
  if (/confirm|abert|publicad/.test(normalized)) return 'confirmado';
  return 'suspeito';
}

function normalizeImportedDate(value = '') {
  const text = cleanImportedValue(value);
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];

  const br = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;

  return '';
}

function normalizeCargoKey(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function extractMoneyValues(value = '') {
  return String(value || '').match(/R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}/g) || [];
}

function pickImportedSalaryForCargo(salary = '', cargo = '') {
  if (UNCERTAIN_PATTERN.test(String(salary || ''))) return '';
  const text = cleanImportedValue(salary);
  const values = extractMoneyValues(text);
  if (values.length <= 1) return values[0] || text;

  const cargoKey = normalizeCargoKey(cargo);
  const lines = text.split(/\r?\n|\*/).map((line) => line.trim()).filter(Boolean);
  const matchedLine = lines.find((line) => {
    const lineKey = normalizeCargoKey(line);
    if (!extractMoneyValues(line).length) return false;
    if (/nivel superior|superior/.test(cargoKey) && /nivel superior|superior/.test(lineKey)) return true;
    if (/nivel medio|medio|atendente/.test(cargoKey) && /nivel medio|medio|atendente/.test(lineKey)) return true;
    return cargoKey.split(/[\s—-]+/).filter((part) => part.length > 4).some((part) => lineKey.includes(part));
  });

  return extractMoneyValues(matchedLine || '')[0] || values[0] || '';
}

function normalizeImportedEducationForCargo(education = '', cargo = '') {
  const key = normalizeCargoKey(`${cargo} ${education}`);
  if (/nivel superior|superior|bacharel|diploma de curso superior/.test(key)) return 'Nível superior';
  if (/nivel medio|medio|ensino medio|atendente/.test(key)) return 'Nível médio';
  return UNCERTAIN_PATTERN.test(String(education || '')) ? '' : cleanImportedValue(education);
}

function normalizeImportedVacancies(value = '') {
  if (UNCERTAIN_PATTERN.test(String(value || ''))) return '';
  const text = cleanImportedValue(value);
  const total = text.match(/\b(\d{1,5})\s+vagas?\s+totais?\b/i);
  if (total) return total[1];
  const firstNumber = text.match(/\b\d{1,5}\b/);
  return firstNumber ? firstNumber[0] : text;
}

function normalizeImportedLocationForCargo(location = '', cargo = '') {
  if (UNCERTAIN_PATTERN.test(String(location || ''))) return '';
  const text = cleanImportedValue(location).replace(/\s+/g, ' ');
  const cargoKey = normalizeCargoKey(cargo);
  const locationKey = normalizeCargoKey(text);
  if (/nivel superior|superior/.test(cargoKey) && /para nivel superior[^.]*salvador/.test(locationKey)) return 'Salvador-BA';
  if (/nivel superior|superior/.test(cargoKey) && /salvador/.test(locationKey)) return 'Salvador-BA';
  return text.split(/\.\s+/)[0]?.trim() || text;
}

function extractMarkdownField(text, label) {
  const source = String(text || '');
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:\\*\\*)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^:\\n]{1,80}(?:\\*\\*)?\\s*:|\\n\\s*##\\s|$)`, 'i');
  const match = source.match(pattern);
  return cleanImportedValue(match?.[1] || '');
}

function parseEtapaTagsFromText(text = '') {
  const source = String(text || '').toLowerCase();
  const tags = [];
  const add = (pattern, tag) => {
    if (pattern.test(source) && !tags.includes(tag)) tags.push(tag);
  };

  add(/prova objetiva.+sim|prova objetiva|objetiva on-line|objetiva online/, 'prova_objetiva');
  add(/prova discursiva.+sim|prova discursiva/, 'prova_discursiva');
  add(/reda[cç][aã]o.+sim|reda[cç][aã]o/, 'redacao');
  add(/\btaf\b.+sim|\btaf\b|teste de aptid[aã]o f[ií]sica/, 'taf');
  add(/avalia[cç][aã]o psicol[oó]gica.+sim|avalia[cç][aã]o psicol[oó]gica/, 'avaliacao_psicologica');
  add(/investiga[cç][aã]o social.+sim|investiga[cç][aã]o social/, 'investigacao_social');
  add(/exames m[eé]dicos.+sim|exames m[eé]dicos/, 'exames_medicos');
  add(/toxicol[oó]gico.+sim|toxicol[oó]gico/, 'toxicologico');
  add(/heteroidentifica[cç][aã]o.+sim|heteroidentifica[cç][aã]o/, 'heteroidentificacao');
  add(/curso de forma[cç][aã]o.+sim|curso de forma[cç][aã]o/, 'curso_formacao');

  return tags;
}

function parseSubjectsFromTextBlock(text = '') {
  const section = String(text || '');
  const lines = section.split(/\r?\n/);
  const subjects = [];
  let current = null;
  let collectingTopics = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s*[67]\./.test(trimmed)) break;

    const subjectMatch = trimmed.match(/^\*{0,2}Disciplina\*{0,2}\s*:\s*(.+)$/i);
    if (subjectMatch) {
      current = { nome: cleanImportedValue(subjectMatch[1]), topicos: [] };
      if (current.nome) subjects.push(current);
      collectingTopics = false;
      continue;
    }

    if (/^\*{0,2}T[oó]picos\*{0,2}\s*:/i.test(trimmed)) {
      collectingTopics = true;
      continue;
    }

    if (!current || !collectingTopics) continue;

    const topic = cleanImportedValue(trimmed.replace(/^[-*•]\s*/, ''));
    if (topic && !/^cargo\/curso/i.test(topic) && !/^disciplina/i.test(topic)) {
      current.topicos.push(topic);
    }
  }

  return subjects;
}

function normalizeImportedSubjects(subjects = []) {
  return subjects
    .map((subject) => {
      const name = cleanImportedValue(subject.nome);
      const nameKey = normalizeCargoKey(name);
      if (/requisitos?|atribuicoes?|atribuições?|funcao|função/.test(nameKey)) return null;
      return {
        ...subject,
        nome: /nao se aplica|não se aplica/.test(nameKey) ? 'Avaliação Curricular' : name,
      };
    })
    .filter((subject) => subject?.nome);
}

function parseSubjectsFromContestForm(text = '') {
  const section = String(text || '').split(/##\s*5\.\s*Conte[uú]do program[aá]tico/i)[1] || String(text || '');
  return normalizeImportedSubjects(parseSubjectsFromTextBlock(section));
}

function parseCargoBlocksFromContestForm(text = '') {
  const section = String(text || '').split(/##\s*5\.\s*Conte[uú]do program[aá]tico/i)[1] || '';
  const chunks = section
    .split(/(?=^\s*\*{0,2}Cargo\/curso\*{0,2}\s*:)/gim)
    .map((chunk) => chunk.trim())
    .filter((chunk) => /^\*{0,2}Cargo\/curso\*{0,2}\s*:/i.test(chunk));

  return chunks
    .map((chunk) => {
      const cargo = cleanImportedValue(chunk.match(/^\s*\*{0,2}Cargo\/curso\*{0,2}\s*:\s*(.+)$/im)?.[1] || '');
      return {
        cargo,
        disciplinas: normalizeImportedSubjects(parseSubjectsFromTextBlock(chunk)),
      };
    })
    .filter((block) => block.cargo || block.disciplinas.length > 0);
}

function parseContestFormLocally(text = '') {
  const source = String(text || '');
  const etapas =
    extractMarkdownField(source, 'Resumo das etapas') ||
    (/avalia[cç][aã]o curricular/i.test(source) ? 'Avaliação curricular, de caráter eliminatório e classificatório.' : '');
  const tafSection = source.match(/Itens do TAF[\s\S]*?(?=##\s*5\.|$)/i)?.[0] || '';
  const baseTemplate = {
    nome: extractMarkdownField(source, 'Nome do concurso'),
    plano: extractMarkdownField(source, 'Plano interno'),
    concurso: extractMarkdownField(source, 'Concurso / órgão') || extractMarkdownField(source, 'Concurso / orgão'),
    area: normalizeImportedArea(extractMarkdownField(source, 'Área')),
    cargo: extractMarkdownField(source, 'Cargo'),
    banca: extractMarkdownField(source, 'Banca'),
    salario: extractMarkdownField(source, 'Salário'),
    inscricao_valor: extractMarkdownField(source, 'Valor da inscrição'),
    escolaridade: extractMarkdownField(source, 'Escolaridade'),
    vagas: extractMarkdownField(source, 'Vagas'),
    lotacao: extractMarkdownField(source, 'Lotação'),
    etapas,
    etapas_tags: parseEtapaTagsFromText(source),
    taf_itens: tafSection
      .split(/\r?\n/)
      .map((line) => cleanImportedValue(line.replace(/^[-*•]\s*/, '')))
      .filter((line) => line && !/itens do taf|n[aã]o h[aá] taf/i.test(line)),
    descricao: extractMarkdownField(source, 'Descrição curta'),
    status_concurso: normalizeImportedStatus(extractMarkdownField(source, 'Status do concurso') || extractMarkdownField(source, 'Publicado?')),
    prova_data: normalizeImportedDate(extractMarkdownField(source, 'Data da prova')),
    edital_url: extractMarkdownField(source, 'URL do edital PDF'),
  };
  const cargoBlocks = parseCargoBlocksFromContestForm(source);
  const commonSubjects = cargoBlocks
    .filter((block) => /todos os cargos|todos os cursos|todas as fun/i.test(block.cargo))
    .flatMap((block) => block.disciplinas);
  const specificBlocks = cargoBlocks.filter((block) => !/todos os cargos|todos os cursos|todas as fun/i.test(block.cargo));
  const templates =
    specificBlocks.length > 0
      ? specificBlocks.map((block) => {
          const shortCargo = block.cargo.replace(/^Técnico de Nível Superior\s*[—-]\s*/i, '').trim();
          const cargo = block.cargo || baseTemplate.cargo;
          return {
            ...baseTemplate,
            nome: `${baseTemplate.nome}${shortCargo ? ` — ${shortCargo}` : ''}`,
            plano: `${baseTemplate.concurso || baseTemplate.nome}${shortCargo ? ` — ${shortCargo}` : ''}`,
            cargo,
            salario: pickImportedSalaryForCargo(baseTemplate.salario, cargo),
            escolaridade: normalizeImportedEducationForCargo(baseTemplate.escolaridade, cargo),
            vagas: normalizeImportedVacancies(baseTemplate.vagas),
            lotacao: normalizeImportedLocationForCargo(baseTemplate.lotacao, cargo),
            disciplinas: [...commonSubjects, ...block.disciplinas],
          };
        })
      : [
          {
            ...baseTemplate,
            salario: pickImportedSalaryForCargo(baseTemplate.salario, baseTemplate.cargo),
            escolaridade: normalizeImportedEducationForCargo(baseTemplate.escolaridade, baseTemplate.cargo),
            vagas: normalizeImportedVacancies(baseTemplate.vagas),
            lotacao: normalizeImportedLocationForCargo(baseTemplate.lotacao, baseTemplate.cargo),
            disciplinas: parseSubjectsFromContestForm(source),
          },
        ];

  return {
    template: templates[0] || { ...baseTemplate, disciplinas: [] },
    templates,
    uncertainties: (source.match(/^\s*[-*]\s*\*\*[^:\n]+:\*\*.*$/gim) || []).filter((line) => UNCERTAIN_PATTERN.test(line)),
    notes: ['Preenchido por leitura local do formulário. Revise antes de publicar.'],
  };
}

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
  const { success, error: toastError, warning, info } = useToast();
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const [deleteTemplateError, setDeleteTemplateError] = useState('');
  const [aiFormText, setAiFormText] = useState('');
  const [aiInputMode, setAiInputMode] = useState('text'); // 'text' | 'pdf'
  const [aiPdfFile, setAiPdfFile] = useState(null);
  const [isParsingContestForm, setIsParsingContestForm] = useState(false);
  const [contestFormImportStatus, setContestFormImportStatus] = useState('');
  const [contestFormOptions, setContestFormOptions] = useState([]);
  const [contestQuery, setContestQuery] = useState('');
  const [contestAreaFilter, setContestAreaFilter] = useState('Todos');
  const [customEtapaText, setCustomEtapaText] = useState('');

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

  const contestAreaOptions = useMemo(
    () => ['Todos', ...Array.from(new Set(concursoCatalog.map((template) => template.area || 'Geral'))).sort((a, b) => a.localeCompare(b, 'pt-BR'))],
    [concursoCatalog]
  );
  const selectedContestAreaFilter = contestAreaOptions.includes(contestAreaFilter) ? contestAreaFilter : 'Todos';

  const filteredContestCatalog = useMemo(() => {
    const query = contestQuery.trim().toLowerCase();

    return concursoCatalog.filter((template) => {
      const matchArea = selectedContestAreaFilter === 'Todos' || (template.area || 'Geral') === selectedContestAreaFilter;
      const haystack = [template.nome, template.concurso, template.cargo, template.banca, template.area]
        .join(' ')
        .toLowerCase();
      return matchArea && (!query || haystack.includes(query));
    });
  }, [concursoCatalog, selectedContestAreaFilter, contestQuery]);

  const contestSections = useMemo(() => {
    const grouped = filteredContestCatalog.reduce((acc, template) => {
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
  }, [filteredContestCatalog]);

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

  const addCustomEtapa = () => {
    const label = customEtapaText.trim();
    if (!label) return;

    setForm((prev) => {
      const alreadyExists = prev.etapas_tags.some((item) => item.toLowerCase() === label.toLowerCase());
      return {
        ...prev,
        etapas_tags: alreadyExists ? prev.etapas_tags : [...prev.etapas_tags, label],
        etapas: prev.etapas || label,
      };
    });
    setCustomEtapaText('');
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

  const applyContestFormTemplate = (result = {}, optionIndex = 0) => {
    const templates = Array.isArray(result.templates) && result.templates.length > 0 ? result.templates : [];
    const template = templates[optionIndex] || result.template || {};
    const importedSubjects = (Array.isArray(template.disciplinas) ? template.disciplinas : [])
      .map((subject) => ({
        nome: String(subject?.nome || subject?.name || '').trim(),
        cor: '',
        topicosTexto: (Array.isArray(subject?.topicos) ? subject.topicos : subject?.topics || [])
          .map((topic) => String(topic || '').trim())
          .filter(Boolean)
          .join('\n'),
      }))
      .filter((subject) => subject.nome);

    setForm((prev) => ({
      ...prev,
      slug: prev.slug,
      nome: cleanImportedValue(template.nome) || prev.nome,
      plano: cleanImportedValue(template.plano) || cleanImportedValue(template.nome) || prev.plano,
      concurso: cleanImportedValue(template.concurso) || cleanImportedValue(template.nome) || prev.concurso,
      area: normalizeImportedArea(template.area || prev.area),
      cargo: cleanImportedValue(template.cargo) || prev.cargo,
      banca: cleanImportedValue(template.banca) || prev.banca,
      salario: cleanImportedValue(template.salario) || prev.salario,
      inscricao_valor: cleanImportedValue(template.inscricao_valor) || prev.inscricao_valor,
      escolaridade: cleanImportedValue(template.escolaridade) || prev.escolaridade,
      vagas: cleanImportedValue(template.vagas) || prev.vagas,
      lotacao: cleanImportedValue(template.lotacao) || prev.lotacao,
      etapas: cleanImportedValue(template.etapas) || prev.etapas,
      etapas_tags: Array.isArray(template.etapas_tags) && template.etapas_tags.length > 0 ? template.etapas_tags : prev.etapas_tags,
      taf_itens: Array.isArray(template.taf_itens) && template.taf_itens.length > 0 ? template.taf_itens : prev.taf_itens,
      descricao: cleanImportedValue(template.descricao) || prev.descricao,
      status_concurso: normalizeImportedStatus(template.status_concurso || prev.status_concurso),
      prova_data: normalizeImportedDate(template.prova_data) || prev.prova_data,
      edital_url: cleanImportedValue(template.edital_url) || prev.edital_url,
      disciplinas: importedSubjects.length > 0 ? importedSubjects : prev.disciplinas,
    }));

    const uncertaintyCount = Array.isArray(result.uncertainties) ? result.uncertainties.length : 0;
    const subjectCount = importedSubjects.length;
    const topicCount = importedSubjects.reduce(
      (acc, subject) => acc + subject.topicosTexto.split('\n').filter(Boolean).length,
      0
    );
    setContestFormImportStatus(
      `Rascunho preenchido com ${subjectCount} disciplina(s) e ${topicCount} topico(s). ${
        uncertaintyCount ? `${uncertaintyCount} incerteza(s) foram mantidas para revisao.` : 'Sem incertezas destacadas.'
      }${templates.length > 1 ? ` ${templates.length} opcoes separadas foram identificadas.` : ''}`
    );
  };

  const handlePdfFileSelect = (file) => {
    if (!file) return;
    const MAX_MB = 50;
    if (file.size > MAX_MB * 1024 * 1024) {
      warning(`O PDF selecionado tem ${(file.size / 1024 / 1024).toFixed(1)} MB. O limite é ${MAX_MB} MB.`);
      return;
    }
    setAiPdfFile(file);
    setContestFormImportStatus('');
    setContestFormOptions([]);
  };

  const handleFillFromContestForm = async () => {
    setIsParsingContestForm(true);
    setContestFormImportStatus('');
    setContestFormOptions([]);

    try {
      let result;
      if (aiInputMode === 'pdf') {
        if (!aiPdfFile) {
          warning('Selecione um arquivo PDF antes de preencher.');
          return;
        }
        setContestFormImportStatus('Extraindo texto do PDF...');
        let pdfText;
        try {
          pdfText = await extractTextFromPdf(aiPdfFile);
        } catch {
          throw new Error('Nao foi possivel extrair texto deste PDF. Tente copiar o texto manualmente.');
        }
        if (!pdfText || pdfText.trim().length < 100) {
          throw new Error('O PDF parece estar vazio ou nao contem texto selecionavel. Use a opcao "Colar texto".');
        }
        setContestFormImportStatus('Analisando edital com IA...');
        result = await analyzeContestForm({ text: pdfText.slice(0, 20000) });
      } else {
        const source = aiFormText.trim();
        if (!source) {
          warning('Cole o formulario analisado antes de preencher.');
          return;
        }
        result = await analyzeContestForm({ text: source });
      }

      const templates = Array.isArray(result.templates) && result.templates.length > 0 ? result.templates : [];
      setContestFormOptions(templates);
      applyContestFormTemplate(result);
    } catch (error) {
      console.warn('Falha na IA ao interpretar concurso.', error);
      if (aiInputMode === 'text') {
        const source = aiFormText.trim();
        if (source) {
          const fallback = parseContestFormLocally(source);
          setContestFormOptions(Array.isArray(fallback.templates) ? fallback.templates : []);
          applyContestFormTemplate(fallback);
          setContestFormImportStatus((prev) =>
            `${prev} A IA nao respondeu agora, entao usei a leitura local do formulario.`
          );
          return;
        }
      }
      setContestFormImportStatus(`Erro: ${error?.message || 'Falha ao analisar.'}`);
    } finally {
      setIsParsingContestForm(false);
    }
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
      Array.from(new Set(subjectCatalog.map((entry) => entry.nome).filter(Boolean))).sort((first, second) =>
        first.localeCompare(second, 'pt-BR')
      ),
    [subjectCatalog]
  );

  const handleSave = async () => {
    const payload = normalizeDraftToPayload();

    if (!payload.nome) {
      warning('Digite o nome do concurso.');
      return;
    }

    if (payload.disciplinas.length === 0) {
      warning('Cadastre ao menos uma disciplina.');
      return;
    }

    setIsSaving(true);

    try {
      if (selectedTemplate?.storage !== 'supabase') {
        await onPromoteTemplate?.({ ...payload, id: null });
      } else if (payload.id) {
        await onUpdateTemplate?.(payload);
      } else {
        await onCreateTemplate?.(payload);
      }

      resetForm();
    } catch (error) {
      toastError(error.message || 'Não foi possível salvar o concurso.', 'Erro ao salvar');
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
      warning('Envie uma imagem PNG, JPG ou WEBP.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const url = await onUploadImage?.({ file, currentUrl: form.imagem_url });
      if (url) updateFormField('imagem_url', url);
    } catch (error) {
      toastError(error.message || 'Não foi possível enviar a imagem.', 'Erro no upload');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleEditalUpload = async (file) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      warning('Envie um arquivo PDF.');
      return;
    }

    setIsUploadingEdital(true);
    try {
      const url = await onUploadEdital?.({ file, currentUrl: form.edital_url });
      if (url) updateFormField('edital_url', url);
    } catch (error) {
      toastError(error.message || 'Não foi possível enviar o edital.', 'Erro no upload');
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
      toastError(error.message || 'Não foi possível remover a imagem.', 'Erro ao remover');
    }
  };

  const handleRemoveEdital = async () => {
    if (!form.edital_url) return;
    try {
      await onRemoveEdital?.({ url: form.edital_url });
      updateFormField('edital_url', '');
    } catch (error) {
      toastError(error.message || 'Não foi possível remover o edital.', 'Erro ao remover');
    }
  };

  const handleDeleteSelected = async (template = null) => {
    const target = template || selectedTemplate;
    if (!target) return;
    setDeleteTemplateError('');
    setDeleteTarget(target);
  };

  const handleConfirmDeleteTemplate = async () => {
    const target = deleteTarget;
    if (!target) return;
    setIsDeletingTemplate(true);
    setDeleteTemplateError('');
    try {
      await onDeleteTemplate?.(target);
      if (target.id === selectedTemplateId) {
        resetForm();
      }
      setDeleteTarget(null);
    } catch (error) {
      setDeleteTemplateError(error.message || 'Não foi possível excluir o concurso.');
    } finally {
      setIsDeletingTemplate(false);
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
      warning('Preencha o enunciado da questão.');
      return;
    }

    if (questionForm.alternativas.some((item) => !String(item || '').trim())) {
      warning('Preencha todas as 5 alternativas.');
      return;
    }

    setQuestionsSaving(true);

    try {
      const payload = {
        banca: String(questionForm.banca || '').trim(),
        disciplina: String(questionForm.disciplina || '').trim(),
        enunciado: String(questionForm.enunciado || '').trim(),
        alternativas: questionForm.alternativas.map((item, index) => ({
          id: QUESTION_LABELS[index],
          label: String(item || '').trim(),
          isCorrect: QUESTION_LABELS[index] === questionForm.gabarito,
        })),
        gabarito: questionForm.gabarito,
        explicacao: String(questionForm.comentario || '').trim(),
        dificuldade: normalizeQuestionNivel(questionForm.nivel),
        tipo: questionForm.tipo,
        is_public: true,
      };

      const { error } = await supabase.from('questions').insert(payload);
      if (error) throw error;

      setQuestionForm(EMPTY_QUESTION_FORM);
      await loadQuestions();
    } catch (error) {
      toastError(error.message || 'Não foi possível salvar a questão.', 'Erro ao salvar');
    } finally {
      setQuestionsSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      await loadQuestions();
    } catch (error) {
      toastError(error.message || 'Não foi possível excluir a questão.', 'Erro ao excluir');
    }
  };

  return (
    <div className="page-shell mx-auto flex h-full w-full max-w-[1320px] flex-col gap-6">
      <AdminPageHeader
        icon={LibraryBig}
        badgeIcon={ShieldCheck}
        badge="Painel administrativo"
        title="Central de concursos"
        subtitle="Organize a biblioteca por área, acompanhe pendências editoriais e mantenha os concursos prontos para importação."
        stats={[
          { key: 'c', label: 'Concursos', value: String(stats.templates), icon: LibraryBig, accent: 'amber' },
          { key: 'p', label: 'Publicados', value: String(stats.publicados), icon: BadgeCheck, accent: 'emerald' },
          { key: 'r', label: 'Rascunhos', value: String(stats.rascunhos), icon: EyeOff, accent: 'orange' },
          { key: 'd', label: 'Disciplinas', value: String(stats.disciplinas), icon: Database, accent: 'blue' },
          { key: 't', label: 'Tópicos', value: String(stats.topicos), icon: Layers3, accent: 'indigo' },
        ]}
        statsClassName="[&>*]:min-w-0 xl:grid-cols-5"
        trailingClassName="xl:max-w-[16rem]"
        trailing={
          <div className="rounded-[1.5rem] border border-white/15 bg-white/10 px-4 py-3 text-left text-sm sm:px-5 sm:py-4 sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Admin ativo</p>
            <p className="mt-1.5 min-w-0 break-all font-semibold text-white">{currentUserEmail}</p>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <InsightCard title="Sem imagem" value={stats.semImagem} text="Concursos ainda sem capa visual." />
        <InsightCard title="Sem edital" value={stats.semEdital} text="Itens sem PDF oficial publicado." />
        <InsightCard title="Sem prova" value={stats.semProva} text="Concursos sem data definida." />
        <InsightCard title="Sem tópicos" value={stats.semTopicos} text="Disciplinas ainda superficiais." />
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
      <div className="space-y-6">
        <div className="rounded-[1.6rem] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Biblioteca de concursos</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Buscar e editar cadastro existente</h3>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(240px,360px)_190px_auto]">
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Busca</label>
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={contestQuery}
                    onChange={(event) => setContestQuery(event.target.value)}
                    placeholder="Nome, cargo, órgão ou banca"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 py-3 pl-11 pr-4 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              <SelectField
                label="Área"
                value={selectedContestAreaFilter}
                onChange={setContestAreaFilter}
                options={contestAreaOptions.map((area) => ({ value: area, label: area }))}
              />

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1A365D] px-4 text-sm font-bold text-white transition-colors hover:bg-[#142a49]"
                >
                  <Plus size={16} />
                  Novo concurso
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 max-h-[360px] overflow-y-auto rounded-[1.3rem] border border-gray-200">
            {filteredContestCatalog.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm font-semibold text-gray-500">
                Nenhum concurso encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {contestSections.map(([area, templates]) => (
                  <div key={area}>
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-gray-50/95 px-4 py-2 backdrop-blur">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{area}</p>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-gray-500 shadow-sm">
                        {templates.length}
                      </span>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className={`grid gap-3 px-4 py-3 transition-colors lg:grid-cols-[minmax(0,1.7fr)_minmax(160px,0.8fr)_150px_110px_44px] lg:items-center ${
                            selectedTemplateId === template.id ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleEditTemplate(template)}
                            className="min-w-0 text-left"
                          >
                            <p className="truncate text-sm font-bold text-slate-900">{template.nome}</p>
                            <p className="mt-1 truncate text-xs font-semibold text-gray-500">{template.concurso}</p>
                          </button>
                          <p className="truncate text-sm font-semibold text-gray-600">{template.cargo || 'Cargo a definir'}</p>
                          <p className="truncate text-sm font-semibold text-gray-500">{template.banca || 'A definir'}</p>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${template.is_public ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {template.is_public ? 'Publicado' : 'Rascunho'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSelected(template)}
                            className="h-10 w-10 rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title={`Excluir ${template.nome}`}
                          >
                            <Trash2 size={15} className="mx-auto" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Editor do concurso</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                {form.id ? 'Editando concurso' : 'Novo concurso'}
              </h3>
              <p className="mt-2 text-sm font-semibold text-gray-500">
                {form.id
                  ? 'As ações principais ficam aqui em cima: salvar, duplicar ou excluir.'
                  : 'Preencha os dados principais e depois monte as disciplinas e tópicos.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge isPublic={form.is_public} />
              <StatusPill value={form.status_concurso} />
              {selectedTemplate && (
                <StorageBadge storage={selectedTemplate.storage} />
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

          <div className="mb-6 rounded-[1.6rem] border border-indigo-100 bg-indigo-50/60 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500">Preencher com IA</p>
                <h4 className="mt-1 text-lg font-semibold text-slate-900">Colar formulário analisado do edital</h4>
                <p className="mt-1 text-sm font-semibold text-gray-500">
                  Use o formulário estruturado que veio da análise do edital. A IA organiza os campos, disciplinas e tópicos no rascunho.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFillFromContestForm}
                disabled={
                  isParsingContestForm ||
                  (aiInputMode === 'text' ? !aiFormText.trim() : !aiPdfFile)
                }
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {isParsingContestForm ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isParsingContestForm
                  ? (contestFormImportStatus.startsWith('Extraindo') ? 'Extraindo PDF...' : 'Analisando...')
                  : 'Preencher rascunho'}
              </button>
            </div>

            {/* Mode tabs */}
            <div className="mt-4 flex gap-1 rounded-2xl bg-indigo-50 p-1">
              <button
                type="button"
                onClick={() => { setAiInputMode('text'); setContestFormImportStatus(''); setContestFormOptions([]); }}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  aiInputMode === 'text'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-indigo-400 hover:text-indigo-600'
                }`}
              >
                Colar texto
              </button>
              <button
                type="button"
                onClick={() => { setAiInputMode('pdf'); setContestFormImportStatus(''); setContestFormOptions([]); }}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  aiInputMode === 'pdf'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-indigo-400 hover:text-indigo-600'
                }`}
              >
                Enviar PDF
              </button>
            </div>

            {aiInputMode === 'text' ? (
              <textarea
                rows={7}
                value={aiFormText}
                onChange={(event) => {
                  setAiFormText(event.target.value);
                  setContestFormImportStatus('');
                  setContestFormOptions([]);
                }}
                placeholder="Cole aqui o formulário retornado pela análise do edital, incluindo identificação, dados do edital, etapas, disciplinas e tópicos."
                className="mt-2 w-full rounded-[1.4rem] border border-indigo-100 bg-white px-4 py-4 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            ) : (
              <div className="mt-2">
                <label
                  htmlFor="ai-pdf-upload"
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.4rem] border-2 border-dashed px-6 py-8 transition-colors ${
                    aiPdfFile
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-indigo-200 bg-white hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  {aiPdfFile ? (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                        <span className="text-lg">📄</span>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-indigo-700">{aiPdfFile.name}</p>
                        <p className="mt-0.5 text-xs text-indigo-500">
                          {(aiPdfFile.size / 1024 / 1024).toFixed(1)} MB
                          {' · pronto para análise'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setAiPdfFile(null); }}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-600"
                      >
                        Trocar arquivo
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                        <span className="text-lg">📎</span>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-indigo-700">Clique para selecionar o PDF do edital</p>
                        <p className="mt-0.5 text-xs text-indigo-500">Máximo 18 MB · somente PDF</p>
                      </div>
                    </>
                  )}
                  <input
                    id="ai-pdf-upload"
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    onChange={(e) => handlePdfFileSelect(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            )}

            {contestFormImportStatus && (
              <p className="mt-3 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm font-semibold text-indigo-700">
                {contestFormImportStatus}
              </p>
            )}

            {contestFormOptions.length > 1 && (
              <div className="mt-4 rounded-[1.4rem] border border-indigo-100 bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500">
                  Opções separadas encontradas
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {contestFormOptions.map((option, optionIndex) => {
                    const subjectCount = Array.isArray(option.disciplinas) ? option.disciplinas.length : 0;
                    const topicCount = (option.disciplinas || []).reduce(
                      (acc, subject) => acc + (subject.topicos?.length || subject.topics?.length || 0),
                      0
                    );

                    return (
                      <button
                        key={`${option.nome || option.cargo || 'opcao'}-${optionIndex}`}
                        type="button"
                        onClick={() => applyContestFormTemplate({ templates: contestFormOptions }, optionIndex)}
                        className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50"
                      >
                        <span className="line-clamp-2 text-sm font-bold text-slate-900">
                          {option.nome || option.cargo || `Opção ${optionIndex + 1}`}
                        </span>
                        <span className="mt-2 block text-xs font-semibold text-gray-500">
                          {subjectCount} disciplina(s) · {topicCount} tópico(s)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50/70 p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Mídia e arquivos</p>
                  <h4 className="mt-1 text-base font-semibold text-slate-900">Capa e edital oficial</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.imagem_url && (
                    <button type="button" onClick={() => window.open(form.imagem_url, '_blank', 'noopener,noreferrer')} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600">
                      Abrir imagem
                    </button>
                  )}
                  {form.edital_url && (
                    <button type="button" onClick={() => window.open(form.edital_url, '_blank', 'noopener,noreferrer')} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600">
                      Abrir edital
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-[1.2rem] border border-gray-200 bg-white">
                {form.imagem_url ? (
                  <img src={form.imagem_url} alt={form.nome || 'Curso'} className="h-36 w-full object-cover" />
                ) : (
                  <div
                    className="flex h-36 w-full items-center justify-center text-white"
                    style={{ background: `linear-gradient(135deg, ${form.cor || '#2563EB'} 0%, #1A365D 100%)` }}
                  >
                    <ImageIcon size={36} />
                  </div>
                )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50">
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
                    {form.imagem_url && (
                      <button type="button" onClick={handleRemoveImage} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600">
                        Remover imagem
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50">
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
                    {form.edital_url && (
                      <button type="button" onClick={handleRemoveEdital} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600">
                        Remover edital
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4">
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Dados principais</p>
                  <h4 className="mt-1 text-base font-semibold text-slate-900">Identificação e vitrine</h4>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <TextField label="Nome do concurso" value={form.nome} onChange={(value) => updateFormField('nome', value)} />
                    <TextField label="Plano interno" value={form.plano} onChange={(value) => updateFormField('plano', value)} />
                    <TextField label="Concurso / órgão" value={form.concurso} onChange={(value) => updateFormField('concurso', value)} />
                    <SelectField label="Área" value={form.area} onChange={(value) => updateFormField('area', value)} options={AREA_OPTIONS.map((value) => ({ value, label: value }))} />
                    <TextField label="Cargo" value={form.cargo} onChange={(value) => updateFormField('cargo', value)} />
                    <TextField label="Banca" value={form.banca} onChange={(value) => updateFormField('banca', value)} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <TextField label="Salário" value={form.salario} onChange={(value) => updateFormField('salario', value)} placeholder="Ex: R$ 5.516,71" icon={DollarSign} />
                    <TextField label="Valor da inscrição" value={form.inscricao_valor} onChange={(value) => updateFormField('inscricao_valor', value)} placeholder="Ex: R$ 150,00" icon={DollarSign} />
                    <SelectField label="Escolaridade" value={form.escolaridade} onChange={(value) => updateFormField('escolaridade', value)} options={ESCOLARIDADE_OPTIONS} icon={GraduationCap} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <TextField label="Vagas" value={form.vagas} onChange={(value) => updateFormField('vagas', value)} placeholder="Ex: 500 vagas + CR" />
                    <TextField label="Lotação" value={form.lotacao} onChange={(value) => updateFormField('lotacao', value)} placeholder="Ex: Alagoas" />
                    <TextField label="Resumo das etapas" value={form.etapas} onChange={(value) => updateFormField('etapas', value)} placeholder="Ex: Prova, TAF, psicológico" />
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50/70 p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Etapas do concurso</p>
                  <p className="text-xs font-semibold text-gray-500">Marque as etapas comuns ou adicione uma etapa específica do edital.</p>
                </div>
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

                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(240px,1fr)_auto]">
                  <input
                    value={customEtapaText}
                    onChange={(event) => setCustomEtapaText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addCustomEtapa();
                      }
                    }}
                    placeholder="Ex.: Avaliação curricular, prova prática, títulos, perícia médica"
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                  <button
                    type="button"
                    onClick={addCustomEtapa}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50"
                  >
                    <Plus size={16} />
                    Adicionar etapa
                  </button>
                </div>

                {form.etapas_tags.some((tag) => !ETAPA_OPTION_VALUES.includes(tag)) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {form.etapas_tags
                      .filter((tag) => !ETAPA_OPTION_VALUES.includes(tag))
                      .map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleEtapaTag(tag)}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-700"
                          title="Remover etapa"
                        >
                          {tag}
                          <X size={14} />
                        </button>
                      ))}
                  </div>
                )}

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
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Descrição curta</label>
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
                    <ChecklistRow ok={Boolean(form.area)} label="Área definida" />
                    <ChecklistRow ok={Boolean(form.cargo)} label="Cargo identificado" />
                    <ChecklistRow ok={Boolean(form.prova_data)} label="Data da prova preenchida" />
                    <ChecklistRow ok={Boolean(form.imagem_url)} label="Imagem publicada" />
                    <ChecklistRow ok={Boolean(form.edital_url)} label="PDF do edital publicado" />
                    <ChecklistRow ok={form.disciplinas.some((subject) => subject.topicosTexto.trim())} label="Tópicos cadastrados" />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Conteúdo programático</p>
                    <h4 className="mt-1 text-lg font-semibold text-slate-900">Disciplinas e tópicos</h4>
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
                              placeholder="Ex: Língua Portuguesa"
                            listId={`subject-catalog-${index}`}
                          />
                          <datalist id={`subject-catalog-${index}`}>
                            {subjectSuggestions.map((item) => (
                              <option key={`${index}-${item}`} value={item} />
                            ))}
                          </datalist>
                          <p className="mt-2 text-xs font-semibold text-gray-500">
                            {matchedSubject
                              ? `Padrão encontrado: ${matchedSubject.nome}`
                              : 'Sem correspondência no banco padrão. Se necessário, cadastre em Admin > Banco de disciplinas.'}
                          </p>
                        </div>
                        <ColorField compact value={subject.cor || '#2563EB'} onChange={(value) => updateSubjectField(index, 'cor', value)} />
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Tópicos da disciplina</label>
                        <textarea
                          rows={6}
                          value={subject.topicosTexto}
                          onChange={(e) => updateSubjectField(index, 'topicosTexto', e.target.value)}
                          placeholder={`Um tópico por linha\nConceitos iniciais\nPoder de polícia\nAtos administrativos`}
                          className="w-full rounded-[1.4rem] border border-gray-200 bg-gray-50/70 px-4 py-4 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        />
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="flex flex-wrap justify-end gap-3">
              {form.id && (
                <button type="button" onClick={resetForm} className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600">
                  Cancelar edição
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
                      <span>{normalizeQuestionNivel(question.dificuldade || question.nivel)}</span>
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

      {deleteTarget ? (
        <DeleteContestModal
          template={deleteTarget}
          isDeleting={isDeletingTemplate}
          error={deleteTemplateError}
          onCancel={() => {
            if (isDeletingTemplate) return;
            setDeleteTarget(null);
            setDeleteTemplateError('');
          }}
          onConfirm={handleConfirmDeleteTemplate}
        />
      ) : null}
    </div>
  );
}

function DeleteContestModal({ template, isDeleting, error, onCancel, onConfirm }) {
  const isLocal = template?.storage !== 'supabase';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-6 text-white">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-200 ring-1 ring-red-300/30">
              <Trash2 size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-200">Excluir concurso</p>
              <h3 className="mt-2 text-xl font-bold leading-tight">{template?.nome || 'Concurso selecionado'}</h3>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-300">
                Esse item sai da biblioteca pública e deixa de aparecer para importação dos alunos.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {isLocal ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-relaxed text-amber-900">
              Este concurso ainda veio do catálogo local. O app vai sincronizar esse item com o Supabase antes de remover.
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Resumo</p>
            <div className="mt-2 grid gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-2">
              <span>Área: {template?.area || 'Geral'}</span>
              <span>Banca: {template?.banca || 'A definir'}</span>
              <span>Disciplinas: {template?.disciplinas?.length || 0}</span>
              <span>Status: {template?.is_public ? 'Publicado' : 'Rascunho'}</span>
            </div>
          </div>

          {error ? (
            <div role="alert" className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-700 disabled:opacity-70"
            >
              {isDeleting ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
              {isDeleting ? 'Excluindo...' : 'Excluir definitivamente'}
            </button>
          </div>
        </div>
      </div>
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


