import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  AlertTriangle,
  Copy,
  Crown,
  Database,
  Download,
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
  RefreshCw,
  Save,
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
import AdminPageHeader from '../components/AdminPageHeader';
import AdminCourseTemplatesEditor from '../components/AdminCourseTemplatesEditor';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { loadContestDraftsFromSupabase, loadContestTemplateContent } from '../lib/contestCatalogApi';
import { CONTEST_STATUS_OPTIONS, normalizeContestStatus } from '../lib/contestGrouping';
import { normalizeCourseTemplates } from '../lib/courseTemplates';

const DRAFT_STORAGE_KEY = 'papirando_admin_concurso_draft';
const EDIT_TEMPLATE_STORAGE_KEY = 'papirando_admin_edit_contest_id';

const STATUS_OPTIONS = CONTEST_STATUS_OPTIONS;

// Escolaridade é multi-seleção: um concurso pode exigir mais de um nível.
// Guardamos como string legível (ex.: "Níveis médio e superior") porque é assim
// que a tela de detalhe exibe (contest.escolaridade) — sem mexer no banco.
const ESCOLARIDADE_LEVELS = [
  { key: 'fundamental', label: 'Fundamental', word: 'fundamental', stem: 'fundament' },
  { key: 'medio', label: 'Médio', word: 'médio', stem: 'medio' },
  { key: 'tecnico', label: 'Técnico', word: 'técnico', stem: 'tecnic' },
  { key: 'superior', label: 'Superior', word: 'superior', stem: 'superior' },
];

function parseEscolaridadeKeys(value = '') {
  const lower = String(value || '').toLowerCase();
  return ESCOLARIDADE_LEVELS
    .filter((level) => lower.includes(level.word) || lower.includes(level.stem))
    .map((level) => level.key);
}

function buildEscolaridadeLabel(keys = []) {
  const words = ESCOLARIDADE_LEVELS.filter((level) => keys.includes(level.key)).map((level) => level.word);
  if (words.length === 0) return '';
  if (words.length === 1) return `Nível ${words[0]}`;
  const last = words[words.length - 1];
  return `Níveis ${words.slice(0, -1).join(', ')} e ${last}`;
}

const ETAPA_OPTIONS = [
  { value: 'prova_objetiva', label: 'Prova objetiva' },
  { value: 'prova_discursiva', label: 'Prova discursiva' },
  { value: 'redacao', label: 'Redação' },
  { value: 'avaliacao_curricular', label: 'Avaliação curricular' },
  { value: 'taf', label: 'TAF' },
  { value: 'avaliacao_psicologica', label: 'Avaliação psicológica' },
  { value: 'investigacao_social', label: 'Investigação social' },
  { value: 'exames_medicos', label: 'Exames médicos' },
  { value: 'toxicologico', label: 'Exame toxicológico' },
  { value: 'heteroidentificacao', label: 'Heteroidentificação' },
  { value: 'curso_formacao', label: 'Curso de formação' },
];
const ETAPA_OPTION_VALUES = ETAPA_OPTIONS.map((option) => option.value);

const AREA_OPTIONS = ['Militar', 'Policial', 'Agropecuária', 'Tribunais', 'Fiscal', 'Controle', 'Legislativo', 'Administrativa', 'Educação', 'Saúde', 'Geral'];

// Localidade (bucket) de um vestibular: UF quando estadual, senão "Nacional".
function vestibularLocality(template = {}) {
  return template.scope === 'estadual' && template.uf ? String(template.uf).toUpperCase() : 'Nacional';
}

// Chave de agrupamento/filtro do catálogo: localidade p/ vestibular, área p/ concurso.
function contestGroupKey(template = {}, tipo = 'concurso') {
  return tipo === 'vestibular' ? vestibularLocality(template) : (template.area || 'Geral');
}

// Ordena chaves: "Nacional" sempre primeiro nos vestibulares, depois ordem alfabética.
function compareGroupKeys(a, b, tipo = 'concurso') {
  if (tipo === 'vestibular') {
    if (a === 'Nacional') return -1;
    if (b === 'Nacional') return 1;
  }
  return a.localeCompare(b, 'pt-BR');
}
const CONTEST_JSON_PROMPT_MD = `# Prompt para extrair JSON de concurso - Papirando

Analise o edital anexado e me devolva SOMENTE um JSON valido, sem markdown, sem explicacoes e sem texto antes ou depois.

## Objetivo

Gerar o JSON para cadastro de concursos na plataforma Papirando.

## Regras obrigatorias

1. Use somente informacoes presentes no edital e, quando o edital for antigo/base de conteudo, pesquise a situacao atual do concurso na internet.
2. Para status atual, priorize site oficial do orgao, banca, governo estadual/federal ou noticias recentes confiaveis.
3. Se nao encontrar uma informacao com seguranca, deixe o campo como string vazia "".
4. Nao invente banca, datas, URLs, salarios, vagas, lotacao, imagem ou etapas.
5. Nao use "nao informado", "nao consta" ou "nao tenho certeza" dentro dos campos.
6. O JSON precisa ser valido e completo.
7. Preserve todos os conteudos programaticos que a pessoa precisa estudar.
8. Nao inclua atribuicoes do cargo, requisitos, documentos, idade minima ou CNH como disciplina de estudo.
9. Quando houver aspas dentro de textos, escape corretamente com barra invertida.
   Exemplo correto: "Constituicao do Estado da Bahia, Cap. XXIII \\"Do Negro\\""
10. Nunca use aspas comuns soltas dentro de strings.
11. "prova_data" deve vir obrigatoriamente no formato YYYY-MM-DD. Exemplo: "2023-01-22".
12. Se o edital antigo for usado como base para um novo concurso ainda sem prova publicada, deixe "prova_data" vazio.
13. "edital_url" deve ser URL pura. Nunca use link Markdown como "[https://...](https://...)".
14. Dentro de cada cargo, "nome" e "plano" sao obrigatorios. Nunca deixe vazio e nunca use valores genericos como "Concurso", "Geral" ou "trilha de estudos".
15. Nao coloque referencias, citacoes, notas de rodape ou links numerados depois do JSON. A resposta deve terminar exatamente no ultimo "}".

## Como separar concurso e cargo

- Se o mesmo edital tiver concursos de orgaos/instituicoes diferentes, use "concursos" com um objeto para cada concurso.
  Exemplo: PMBA e CBMBA no mesmo edital = dois concursos separados.
- Se o mesmo concurso tiver varios cargos no mesmo edital, coloque esses cargos dentro de "cargos".
  Exemplo: PCBA com Delegado, Escrivao e Investigador = um concurso com tres cargos.
- Se for o mesmo orgao, mas editais/carreiras diferentes, separe em concursos diferentes.
  Exemplo: PMBA Soldado/Praca e PMBA Oficial = concursos separados, nao cargos do mesmo concurso.
- Cada cargo deve ter suas proprias vagas, salario, escolaridade, lotacao e disciplinas quando houver diferenca.

## Status permitidos

Use somente um destes valores em "status_concurso":

- "previsto"
- "autorizado"
- "comissao_formada"
- "banca_em_definicao"
- "banca_definida"
- "edital_iminente"
- "edital_publicado"
- "inscricoes_abertas"
- "prova_marcada"
- "em_andamento"
- "homologado"

### Regra de status atual

- O status deve refletir a fase atual do concurso, nao apenas a frase do edital antigo.
- Se houver fala recente de governador, comandante, secretario, orgao ou banca dizendo que o edital vai sair em breve/final do ano, use "edital_iminente" ou "previsto".
- Se o edital antigo ja teve prova e resultado, mas existe novo concurso anunciado, NAO use "homologado" para o cadastro atual; use o status do novo concurso.
- Se nao houver noticia atual de novo concurso e o edital antigo ja terminou, use "homologado".
- Se o concurso atual ainda nao tiver data de prova publicada, deixe "prova_data": "".

## Etapas permitidas em "etapas_tags"

- "prova_objetiva"
- "prova_discursiva"
- "redacao"
- "avaliacao_curricular"
- "taf"
- "avaliacao_psicologica"
- "investigacao_social"
- "exames_medicos"
- "toxicologico"
- "heteroidentificacao"
- "curso_formacao"

## Areas permitidas

- "Militar"
- "Policial"
- "Agropecuaria"
- "Tribunais"
- "Fiscal"
- "Controle"
- "Legislativo"
- "Administrativa"
- "Educacao"
- "Saude"
- "Geral"

PM, Policia Civil, Policia Penal e Guarda Municipal geralmente sao "Policial".
Bombeiros, Exercito, Marinha, Aeronautica, ESA, EsPCEx, AFA, EFOMM, IME e ITA geralmente sao "Militar".

## Formato obrigatorio

\`\`\`json
{
  "concursos": [
    {
      "nome_grupo": "",
      "concurso": "",
      "orgao": "",
      "area": "",
      "banca": "",
      "status_concurso": "",
      "prova_data": "",
      "edital_url": "",
      "etapas": "",
      "etapas_tags": [],
      "taf_itens": [],
      "descricao": "",
      "cargos": [
        {
          "nome": "",
          "plano": "",
          "cargo": "",
          "salario": "",
          "inscricao_valor": "",
          "escolaridade": "",
          "vagas": "",
          "lotacao": "",
          "disciplinas": [
            {
              "nome": "",
              "topicos": []
            }
          ]
        }
      ]
    }
  ],
  "uncertainties": [],
  "notes": []
}
\`\`\`

## Como preencher campos

- "nome_grupo": nome curto agrupador. Exemplos: "PCBA", "PMBA - Soldado", "CBMBA - Soldado", "PMBA - Oficial", "EsPCEx".
- "concurso": sigla limpa, sem cargo, edital ou ano. Exemplos: "PCBA", "PMBA", "CBMBA", "DETRAN-BA", "AGU".
- "orgao": nome completo do orgao/instituicao.
- "nome": nome publico do cargo dentro do concurso, curto e especifico. Formato recomendado: "SIGLA - Cargo curto". Exemplos: "PCBA - Delegado", "PCBA - Escrivao", "PMBA - Soldado", "CBMBA - Soldado".
- "plano": nome amigavel para o aluno se guiar nos estudos. Formato recomendado: "SIGLA - Cargo curto - trilha de estudos". Exemplos: "PCBA - Delegado - trilha de estudos", "PMBA - Soldado - trilha de estudos".
- "cargo": cargo exato do edital.
- "salario": somente salario/remuneracao do cargo especifico, formato "R$ 0.000,00". Nao coloque beneficios junto.
- "inscricao_valor": somente valor da inscricao, formato "R$ 000,00".
- "escolaridade": use "Nivel medio", "Nivel superior" ou deixe vazio.
- "vagas": somente numero ou expressao curta. Exemplos: "150", "500 + CR".
- "lotacao": local especifico do cargo. Se forem muitas cidades, use "Diversas cidades/UF".
- "etapas": resumo curto das etapas.
- "disciplinas": somente materias e topicos que caem na prova.

Se o concurso nao tiver prova e for somente avaliacao curricular:
- use "etapas_tags": ["avaliacao_curricular"]
- crie uma disciplina chamada "Avaliacao Curricular"
- nos topicos, coloque os criterios avaliados no edital.

## Casos importantes

- Se PMBA e CBMBA estiverem no mesmo edital, NAO coloque como dois cargos do mesmo concurso. Crie dois objetos dentro de "concursos".
- Se PCBA tiver Delegado, Escrivao e Investigador no mesmo edital, coloque como UM concurso "PCBA" com tres objetos dentro de "cargos".
- Se estiver usando edital antigo da PMBA como base de conteudo e houver noticia atual de novo concurso no fim do ano, preencha o status atual como "edital_iminente" ou "previsto" e deixe "prova_data" vazio.

Agora analise o edital anexado e retorne somente o JSON.
`;

const EMPTY_SUBJECT = { nome: '', cor: '', topicosTexto: '' };
const UNCERTAIN_PATTERN = /n[aã]o tenho certeza|n[aã]o consta|n[aã]o encontrado|n[aã]o informado|ausente/i;
const EMPTY_FORM = {
  id: null,
  slug: '',
  tipo: 'concurso',
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
  cor: '#1e3a5f',
  descricao: '',
  is_public: true,
  status_concurso: 'edital_publicado',
  prova_data: '',
  imagem_url: '',
  edital_url: '',
  // Campos do modelo de vestibulares (híbrido)
  uf: '',
  scope: '',
  modality: '',
  institution_type: '',
  registration_start: '',
  registration_end: '',
  about_institution: '',
  meta: {},
  disciplinas: [EMPTY_SUBJECT],
};

function cleanImportedValue(value = '') {
  const text = String(value || '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$2')
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

  if (/militar|exercito|marinha|aeronautica|espcex|esa|afa|efomm|ime|ita/.test(normalized)) return 'Militar';
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
  return normalizeContestStatus(value);
}

function normalizeImportedDate(value = '') {
  const text = cleanImportedValue(value);
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];

  const br = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;

  return '';
}

function resolveContestStatusByDate(status = '', provaData = '') {
  const normalizedStatus = normalizeImportedStatus(status);
  if (!provaData) return normalizedStatus;

  const prova = new Date(`${provaData}T00:00:00`);
  if (Number.isNaN(prova.getTime())) return normalizedStatus;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysAfterExam = Math.floor((today.getTime() - prova.getTime()) / 86400000);
  const activeStatuses = ['edital_publicado', 'inscricoes_abertas', 'prova_marcada', 'em_andamento'];

  if (daysAfterExam > 180 && activeStatuses.includes(normalizedStatus)) return 'homologado';
  if (daysAfterExam >= 0 && ['edital_publicado', 'inscricoes_abertas'].includes(normalizedStatus)) return 'prova_marcada';
  return normalizedStatus;
}

function resolveContestDateByStatus(status = '', provaData = '') {
  if (!provaData) return '';
  const normalizedStatus = normalizeImportedStatus(status);
  const prova = new Date(`${provaData}T00:00:00`);
  if (Number.isNaN(prova.getTime())) return provaData;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastDate = prova.getTime() < today.getTime();
  const preNoticeStatuses = ['previsto', 'autorizado', 'comissao_formada', 'banca_em_definicao', 'banca_definida', 'edital_iminente'];

  if (isPastDate && preNoticeStatuses.includes(normalizedStatus)) return '';
  return provaData;
}

function normalizeCargoKey(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeDashSpacing(value = '') {
  return String(value || '')
    .replace(/\s*[–—]\s*/g, ' — ')
    .replace(/\s+-\s+/g, ' - ')
    .replace(/\s+/g, ' ')
    .replace(/(?:\s+—){2,}/g, ' —')
    .trim();
}

function compactAgencyName(value = '') {
  const text = normalizeDashSpacing(value);
  const acronymMatch = text.match(/\b[A-Z]{2,}(?:-[A-Z]{2})?\b/);
  if (acronymMatch) return acronymMatch[0];
  return text.split(' — ')[0]?.trim() || text;
}

function cleanStudyLabel(value = '') {
  return normalizeDashSpacing(value)
    .replace(/\bT[eé]cnico de N[ií]vel Superior\s+[-–—]\s*/i, 'Técnico de Nível Superior — ')
    .replace(/\bT[eé]cnico de N[ií]vel M[eé]dio\s+[-–—]\s*/i, 'Técnico de Nível Médio — ')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isGenericContestLabel(value = '') {
  return /^(concurso|geral|area diversa|área diversa|plano de estudos|trilha de estudos|concurso\s*-\s*trilha de estudos)$/i.test(String(value || '').trim());
}

function hasUsefulContestLabel(value = '') {
  const text = cleanImportedValue(value);
  return Boolean(text && !isGenericContestLabel(text));
}

function extractAgencyOnly(...values) {
  const source = values
    .map((value) => cleanImportedValue(value))
    .filter(Boolean)
    .join(' — ');
  const acronym = source.match(/\b[A-Z]{2,}(?:-[A-Z]{2})?\b/);
  if (acronym) return acronym[0];

  return normalizeDashSpacing(source)
    .replace(/\b(REDA|Processo Seletivo|Edital|Concurso)\b.*$/i, '')
    .split(' — ')[0]
    ?.trim();
}

function prettifySpecialtyForStudent(value = '') {
  const key = normalizeCargoKey(value);
  if (/administra/.test(key)) return 'Administrativo';
  if (/jurid|direito/.test(key)) return 'Jurídico';
  if (/contab/.test(key)) return 'Contábil';
  if (/jornalismo|comunic/.test(key)) return 'Jornalismo';
  if (/psicolog/.test(key)) return 'Psicologia';
  if (/engenharia civil/.test(key)) return 'Engenharia Civil';
  if (/arquitet/.test(key)) return 'Arquitetura';
  if (/atendente|atendimento/.test(key)) return 'Atendente';
  return '';
}

function extractCargoSpecialty(template = {}) {
  const source = [
    template.cargo,
    template.nome,
    template.plano,
    template.area && !isGenericContestLabel(template.area) ? template.area : '',
  ]
    .map((value) => cleanImportedValue(value))
    .filter(Boolean)
    .join(' — ');

  return prettifySpecialtyForStudent(source);
}

function buildStudentCargo(template = {}) {
  const source = cleanStudyLabel([template.cargo, template.nome, template.plano].filter(Boolean).join(' — '));
  const specialty = extractCargoSpecialty(template);
  const key = normalizeCargoKey(source);

  if (/soldado/.test(key)) return 'Soldado';
  if (/delegado/.test(key)) return 'Delegado';
  if (/investigador/.test(key)) return 'Investigador';
  if (/escriv/.test(key)) return 'Escrivão';
  if (/oficial/.test(key)) return 'Oficial';
  if (/cadete/.test(key)) return 'Cadete';
  if (/tecnico|técnico/.test(key) && specialty) return `Técnico ${specialty}`;
  if (/tecnico|técnico/.test(key)) return 'Técnico';
  if (specialty) return specialty;
  if (source && !isGenericContestLabel(source)) return source;
  return 'Concurso';
}

function buildContestDisplayNames(template = {}) {
  const rawNome = cleanImportedValue(template.nome || template.name);
  const rawPlano = cleanImportedValue(template.plano);
  const rawConcurso = cleanImportedValue(template.concurso);
  const rawCargo = cleanImportedValue(template.cargo);
  const rawGrupo = cleanImportedValue(template.nome_grupo || template.grupo);
  const rawOrgao = cleanImportedValue(template.orgao || template['concurso / órgão']);
  const orgao = extractAgencyOnly(rawConcurso, rawOrgao, rawGrupo, rawNome, rawPlano) || compactAgencyName(rawConcurso || rawOrgao || rawGrupo || rawNome || rawPlano);
  const studentCargo = buildStudentCargo({
    ...template,
    nome: hasUsefulContestLabel(rawNome) ? rawNome : rawGrupo,
    plano: hasUsefulContestLabel(rawPlano) ? rawPlano : '',
    cargo: rawCargo,
  });
  const publicName = normalizeDashSpacing([orgao, studentCargo].filter(Boolean).join(' - '));
  const studentPlan = normalizeDashSpacing([orgao, studentCargo, 'trilha de estudos'].filter(Boolean).join(' - '));

  return {
    nome: hasUsefulContestLabel(rawNome) ? normalizeDashSpacing(rawNome) : publicName,
    plano: hasUsefulContestLabel(rawPlano) ? normalizeDashSpacing(rawPlano) : studentPlan,
    concurso: orgao,
  };
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
  add(/avalia[cç][aã]o curricular/, 'avaliacao_curricular');
  add(/\btaf\b.+sim|\btaf\b|teste de aptid[aã]o f[ií]sica/, 'taf');
  add(/avalia[cç][aã]o psicol[oó]gica.+sim|avalia[cç][aã]o psicol[oó]gica/, 'avaliacao_psicologica');
  add(/investiga[cç][aã]o social.+sim|investiga[cç][aã]o social/, 'investigacao_social');
  add(/exames m[eé]dicos.+sim|exames m[eé]dicos/, 'exames_medicos');
  add(/toxicol[oó]gico.+sim|toxicol[oó]gico/, 'toxicologico');
  add(/heteroidentifica[cç][aã]o.+sim|heteroidentifica[cç][aã]o/, 'heteroidentificacao');
  add(/curso de forma[cç][aã]o.+sim|curso de forma[cç][aã]o/, 'curso_formacao');

  return tags;
}

function extractJsonPayload(value = '') {
  const source = String(value || '').trim();
  const firstObject = source.indexOf('{');
  const firstArray = source.indexOf('[');
  const startsWithObject = firstObject >= 0 && (firstArray < 0 || firstObject < firstArray);
  const start = startsWithObject ? firstObject : firstArray;
  const end = startsWithObject ? source.lastIndexOf('}') : source.lastIndexOf(']');

  if (start >= 0 && end > start) return source.slice(start, end + 1).trim();
  return source;
}

function parseLooseJsonObject(text = '') {
  const source = String(text || '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()
    .replace(/^[\w$]+\s*=\s*/, '')
    .replace(/;$/, '')
    .trim();

  if (!source) return null;

  const extracted = extractJsonPayload(source);
  const candidates = [...new Set([source, extracted].filter(Boolean))];
  if (!source.startsWith('{') && !source.startsWith('[')) candidates.push(`{${source}}`);
  const repairedCandidates = candidates.map((candidate) => repairJsonLikeText(candidate));

  for (const candidate of [...candidates, ...repairedCandidates]) {
    try {
      const parsed = JSON.parse(candidate);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function repairJsonLikeText(value = '') {
  const source = String(value || '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
  let repaired = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (!inString) {
      repaired += char;
      if (char === '"') inString = true;
      continue;
    }

    if (escaped) {
      repaired += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      repaired += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      if (source[index + 1] === '"' && [',', '}', ']'].includes(source.slice(index + 2).match(/\S/)?.[0] || '')) {
        repaired += '\\"';
        continue;
      }

      const rest = source.slice(index + 1);
      const next = rest.match(/\S/)?.[0] || '';
      if (!next || [',', '}', ']', ':'].includes(next)) {
        repaired += char;
        inString = false;
      } else {
        repaired += '\\"';
      }
      continue;
    }

    repaired += char;
  }

  return repaired;
}

function parseLooseJsonFields(text = '') {
  const source = String(text || '').trim();
  if (!source) return null;

  const fields = [
    'nome',
    'plano',
    'concurso',
    'area',
    'cargo',
    'banca',
    'salario',
    'inscricao_valor',
    'escolaridade',
    'vagas',
    'lotacao',
    'etapas',
    'descricao',
    'status_concurso',
    'prova_data',
    'edital_url',
  ];
  const draft = {};

  fields.forEach((field) => {
    const pattern = new RegExp(`["']${field}["']\\s*:\\s*["']([^"']*)["']`, 'i');
    const match = source.match(pattern);
    if (match) draft[field] = match[1].trim();
  });

  const tagsBlock = source.match(/["']etapas_tags["']\s*:\s*\[([\s\S]*?)(?:\]|$)/i)?.[1] || '';
  const tags = [...tagsBlock.matchAll(/["']([^"']+)["']/g)].map((match) => match[1].trim()).filter(Boolean);
  if (tags.length > 0) draft.etapas_tags = tags;

  const tafBlock = source.match(/["']taf_itens["']\s*:\s*\[([\s\S]*?)(?:\]|$)/i)?.[1] || '';
  const tafItens = [...tafBlock.matchAll(/["']([^"']+)["']/g)].map((match) => match[1].trim()).filter(Boolean);
  if (tafItens.length > 0) draft.taf_itens = tafItens;

  return Object.keys(draft).length > 0 ? draft : null;
}

function normalizeTopicDraft(topic) {
  if (typeof topic === 'string') return topic.trim();
  return String(topic?.nome || topic?.name || topic?.titulo || topic?.title || '').trim();
}

function normalizeSubjectDraft(subject = {}) {
  if (typeof subject === 'string') return { nome: subject.trim(), topicos: [] };
  return {
    nome: String(subject?.nome || subject?.name || subject?.disciplina || '').trim(),
    cor: subject?.cor || '',
    topicos: (Array.isArray(subject?.topicos) ? subject.topicos : subject?.topics || [])
      .map((topic) => normalizeTopicDraft(topic))
      .filter(Boolean),
  };
}

function normalizeJsonContestTemplate(raw = {}) {
  const template = raw.template && typeof raw.template === 'object' ? raw.template : raw;
  const disciplinas = (Array.isArray(template.disciplinas) ? template.disciplinas : [])
    .map((subject) => normalizeSubjectDraft(subject))
    .filter((subject) => subject.nome);
  const names = buildContestDisplayNames(template);
  const rawProvaData = normalizeImportedDate(template.prova_data || template.data_prova || '');
  const statusConcurso = resolveContestStatusByDate(template.status_concurso || '', rawProvaData);
  const provaData = resolveContestDateByStatus(statusConcurso, rawProvaData);

  return {
    nome: names.nome || cleanImportedValue(template.nome || template.name || ''),
    plano: names.plano || cleanImportedValue(template.plano || ''),
    concurso: names.concurso || cleanImportedValue(template.concurso || template.orgao || template['concurso / órgão'] || ''),
    area: normalizeImportedArea(template.area || ''),
    cargo: cleanImportedValue(template.cargo || ''),
    banca: cleanImportedValue(template.banca || ''),
    salario: pickImportedSalaryForCargo(template.salario || '', template.cargo || ''),
    inscricao_valor: cleanImportedValue(template.inscricao_valor || template.valor_inscricao || ''),
    escolaridade: normalizeImportedEducationForCargo(template.escolaridade || '', template.cargo || ''),
    vagas: normalizeImportedVacancies(template.vagas || ''),
    lotacao: normalizeImportedLocationForCargo(template.lotacao || '', template.cargo || ''),
    etapas: cleanImportedValue(template.etapas || ''),
    etapas_tags: Array.isArray(template.etapas_tags) ? template.etapas_tags : parseEtapaTagsFromText(template.etapas || ''),
    taf_itens: Array.isArray(template.taf_itens) ? template.taf_itens : [],
    descricao: cleanImportedValue(template.descricao || template.descricao_curta || ''),
    status_concurso: statusConcurso,
    prova_data: provaData,
    edital_url: cleanImportedValue(template.edital_url || template.url_edital_pdf || ''),
    imagem_url: cleanImportedValue(template.imagem_url || template.image_url || template.capa_url || ''),
    // Campos do modelo híbrido (vestibular/ENEM): preservados para o cadastro.
    scope: template.scope || '',
    registration_start: normalizeImportedDate(template.registration_start || ''),
    registration_end: normalizeImportedDate(template.registration_end || ''),
    prova_data_dia2: normalizeImportedDate(template.prova_data_dia2 || template.prova_data2 || ''),
    disciplinas,
  };
}

function parseContestJsonLocally(text = '') {
  const parsed = parseLooseJsonObject(text) || parseLooseJsonFields(text);
  if (!parsed) return null;

  const expandContestWithRoles = (item) => {
    const cargos = Array.isArray(item?.cargos) ? item.cargos : Array.isArray(item?.cargos_opcoes) ? item.cargos_opcoes : null;
    if (!cargos || cargos.length === 0) return [item];

    const { cargos: _ignoredCargos, cargos_opcoes: _ignoredCargosOpcoes, disciplinas: commonDisciplinas, ...base } = item;
    const groupName = base.nome_grupo || base.nome || base.concurso || base.orgao || '';
    return cargos.map((cargo) => ({
      ...base,
      ...cargo,
      nome: cargo.nome || [groupName, cargo.nome_curto || cargo.cargo].filter(Boolean).join(' - '),
      plano: cargo.plano || [base.concurso || base.orgao || groupName, cargo.nome_curto || cargo.cargo, 'trilha de estudos'].filter(Boolean).join(' - '),
      concurso: base.concurso || base.orgao || item.concurso,
      area: cargo.area || base.area,
      banca: cargo.banca || base.banca,
      inscricao_valor: cargo.inscricao_valor || base.inscricao_valor,
      status_concurso: cargo.status_concurso || base.status_concurso,
      prova_data: cargo.prova_data || base.prova_data,
      edital_url: cargo.edital_url || base.edital_url,
      imagem_url: cargo.imagem_url || base.imagem_url,
      disciplinas: Array.isArray(cargo.disciplinas) && cargo.disciplinas.length > 0 ? cargo.disciplinas : commonDisciplinas || [],
    }));
  };

  const rawTemplates = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.templates)
      ? parsed.templates
      : Array.isArray(parsed.contests)
        ? parsed.contests
        : Array.isArray(parsed.concursos)
          ? parsed.concursos
          : Array.isArray(parsed.editais)
            ? parsed.editais
          : [parsed];

  const templates = rawTemplates
    .flatMap((item) => expandContestWithRoles(item))
    .map((item) => normalizeJsonContestTemplate(item))
    .filter((item) => item.nome || item.cargo || (Array.isArray(item.disciplinas) && item.disciplinas.length > 0));
  if (templates.length === 0) return null;

  return {
    template: templates[0],
    templates,
    uncertainties: [],
    notes: ['Preenchido por JSON colado no rascunho.'],
  };
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
  baseTemplate.status_concurso = resolveContestStatusByDate(baseTemplate.status_concurso, baseTemplate.prova_data);
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
    cor: template.cor || '#1e3a5f',
    descricao: template.descricao || '',
    is_public: template.is_public !== false,
    status_concurso: normalizeImportedStatus(template.status_concurso || 'edital_publicado'),
    prova_data: template.prova_data || '',
    imagem_url: template.imagem_url || '',
    edital_url: template.edital_url || '',
    tipo: template.tipo || 'concurso',
    uf: template.uf || '',
    scope: template.scope || '',
    modality: template.modality || '',
    institution_type: template.institution_type || '',
    registration_start: template.registration_start || '',
    registration_end: template.registration_end || '',
    about_institution: (template.meta && template.meta.about_institution) || '',
    meta: template.meta && typeof template.meta === 'object' ? template.meta : {},
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
  courseTemplates = [],
  onSaveCourseTemplates,
}) {
  const { success, error: toastError, warning } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const isVestForm = form.tipo === 'vestibular';
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingEdital, setIsUploadingEdital] = useState(false);
  const [isContestModalOpen, setIsContestModalOpen] = useState(false);
  const [adminSection, setAdminSection] = useState('concursos');
  // Sub-visão de cada módulo: itens já no ar vs. rascunhos aguardando validação.
  const [catalogView, setCatalogView] = useState('publicados'); // 'publicados' | 'rascunhos'
  // Aba interna do modal de edição: 'dados' | 'midia' | 'etapas' | 'conteudo'.
  const [modalTab, setModalTab] = useState('dados');
  // null = prop ainda não chegou do Supabase; [] ou [...] = já carregou
  const [courseTemplatesDraft, setCourseTemplatesDraftRaw] = useState(
    () => courseTemplates !== null ? normalizeCourseTemplates(courseTemplates) : null
  );
  const courseTemplatesDirty = React.useRef(false);
  const setCourseTemplatesDraft = React.useCallback((updater) => {
    courseTemplatesDirty.current = true;
    setCourseTemplatesDraftRaw(updater);
  }, []);
  const [courseTemplatesSaving, setCourseTemplatesSaving] = useState(false);
  const [logoBatchUrl, setLogoBatchUrl] = useState('');
  const [logoBatchOrgao] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const [publishingDraftId, setPublishingDraftId] = useState('');
  const [uploadingLogoDraftId, setUploadingLogoDraftId] = useState('');
  const [draftQuery, setDraftQuery] = useState('');
  const [selectedDraftIds, setSelectedDraftIds] = useState(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  // Atualizar concursos em massa colando o mesmo JSON do prompt (match por nome).
  const [updateJsonOpen, setUpdateJsonOpen] = useState(false);
  const [updateJsonText, setUpdateJsonText] = useState('');
  const [updateJsonStatus, setUpdateJsonStatus] = useState('');
  const [updateJsonWorking, setUpdateJsonWorking] = useState(false);
  // Rascunhos carregados pelo PRÓPRIO AdminConcursos (import direto), sem depender de
  // props vindas do App — o bundler estava dropando essas props no build de produção.
  const [localDrafts, setLocalDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);

  const reloadDrafts = async () => {
    setDraftsLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) return [];
      const result = await loadContestDraftsFromSupabase(supabase);
      const arr = Array.isArray(result) ? result : [];
      setLocalDrafts(arr);
      return arr;
    } catch (error) {
      toastError(error.message || 'Não foi possível carregar os rascunhos.', 'Erro');
      return [];
    } finally {
      setDraftsLoading(false);
    }
  };

  // Carrega os rascunhos ao abrir o Catálogo (sessão já está pronta nesse ponto).
  useEffect(() => {
    reloadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sempre que o modal abre, volta para a primeira aba.
  useEffect(() => {
    if (isContestModalOpen) setModalTab('dados');
  }, [isContestModalOpen]);
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
  // Sub-seção dentro da aba ENEM: 'exame' (o exame) ou 'instituicoes' (instituições que ingressam pelo ENEM).
  const [enemSub, setEnemSub] = useState('exame');

  // Tipo mostrado na lista do catálogo depende da aba: Concursos = concurso,
  // Vestibulares = vestibular (ambos vêm de contest_templates).
  // A aba ENEM unifica o exame e as instituições via sub-seletor (enemSub).
  const contestSectionTipo =
    adminSection === 'vestibulares' ? 'vestibular'
      : adminSection === 'enem' ? (enemSub === 'instituicoes' ? 'enem_inst' : 'enem')
      : 'concurso';
  // Substantivo usado nos rótulos da seção (botão criar, placeholder, estado vazio).
  const contestSectionNoun =
    contestSectionTipo === 'vestibular' ? 'vestibular'
      : contestSectionTipo === 'enem' ? 'exame ENEM'
      : contestSectionTipo === 'enem_inst' ? 'instituição ENEM'
      : 'concurso';


  useEffect(() => {
    try {
      const editTemplateId = localStorage.getItem(EDIT_TEMPLATE_STORAGE_KEY);
      if (editTemplateId) {
        localStorage.removeItem(EDIT_TEMPLATE_STORAGE_KEY);
        const template = concursoCatalog.find((item) => item.id === editTemplateId);
        if (template) {
          setSelectedTemplateId(template.id);
          setForm(buildFormFromTemplate(template));
          localStorage.removeItem(DRAFT_STORAGE_KEY);
          return;
        }
      }

      const storedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!storedDraft) return;
      const parsed = JSON.parse(storedDraft);
      if (!parsed || parsed.id) return;
      setForm((prev) => ({ ...prev, ...parsed, disciplinas: parsed.disciplinas?.length ? parsed.disciplinas : prev.disciplinas }));
    } catch {
      // ignore broken draft
    }
  }, [concursoCatalog]);

  useEffect(() => {
    // Aguarda o dado chegar do Supabase (null = carregando) e só substitui se não houve edição local
    if (courseTemplates !== null && !courseTemplatesDirty.current) {
      setCourseTemplatesDraftRaw(normalizeCourseTemplates(courseTemplates));
    }
  }, [courseTemplates]);

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

  const contestAreaOptions = useMemo(() => {
    const keys = Array.from(
      new Set(
        concursoCatalog
          .filter((t) =>
            contestSectionTipo === 'vestibular' ? t.tipo === 'vestibular' : (t.tipo || 'concurso') !== 'vestibular'
          )
          .map((t) => contestGroupKey(t, contestSectionTipo))
      )
    ).sort((a, b) => compareGroupKeys(a, b, contestSectionTipo));
    return ['Todos', ...keys];
  }, [concursoCatalog, contestSectionTipo]);
  const manageableAreaOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...AREA_OPTIONS,
          ...concursoCatalog
            .map((template) => String(template.area || '').trim())
            .filter(Boolean),
          form.area,
        ])
      ).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [concursoCatalog, form.area]
  );
  const selectedContestAreaFilter = contestAreaOptions.includes(contestAreaFilter) ? contestAreaFilter : 'Todos';

  const filteredContestCatalog = useMemo(() => {
    const query = contestQuery.trim().toLowerCase();

    return concursoCatalog.filter((template) => {
      const tipo = template.tipo || 'concurso';
      const matchArea =
        selectedContestAreaFilter === 'Todos' ||
        contestGroupKey(template, contestSectionTipo) === selectedContestAreaFilter;
      const matchTipo = tipo === contestSectionTipo;
      const haystack = [template.nome, template.concurso, template.cargo, template.banca, template.area]
        .join(' ')
        .toLowerCase();
      // A lista "Publicados" mostra só o que está no ar. Rascunhos vivem em localDrafts.
      return template.is_public && matchArea && matchTipo && (!query || haystack.includes(query));
    });
  }, [concursoCatalog, selectedContestAreaFilter, contestSectionTipo, contestQuery]);

  // Contagens por tipo no catálogo publicado (para os chips de filtro e a aba).
  const publishedConcursoCount = useMemo(
    () => concursoCatalog.filter((t) => (t.tipo || 'concurso') === 'concurso').length,
    [concursoCatalog]
  );
  const publishedVestibularCount = useMemo(
    () => concursoCatalog.filter((t) => t.tipo === 'vestibular').length,
    [concursoCatalog]
  );
  const publishedEnemCount = useMemo(
    () => concursoCatalog.filter((t) => t.tipo === 'enem').length,
    [concursoCatalog]
  );
  const publishedEnemInstCount = useMemo(
    () => concursoCatalog.filter((t) => t.tipo === 'enem_inst').length,
    [concursoCatalog]
  );

  const contestSections = useMemo(() => {
    const grouped = filteredContestCatalog.reduce((acc, template) => {
      const key = contestGroupKey(template, contestSectionTipo);
      if (!acc[key]) acc[key] = [];
      acc[key].push(template);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => compareGroupKeys(a, b, contestSectionTipo))
      .map(([key, templates]) => [
        key,
        templates.sort((first, second) => first.nome.localeCompare(second.nome, 'pt-BR')),
      ]);
  }, [filteredContestCatalog, contestSectionTipo]);

  const selectedTemplate = useMemo(
    () => concursoCatalog.find((template) => template.id === selectedTemplateId) || null,
    [concursoCatalog, selectedTemplateId]
  );

  const logoLibrary = useMemo(() => {
    const byUrl = new Map();

    concursoCatalog.forEach((template) => {
      const url = String(template.imagem_url || '').trim();
      if (!url) return;

      const current = byUrl.get(url);
      const linked = current?.linked || [];
      byUrl.set(url, {
        url,
        label: current?.label || template.concurso || template.nome || 'Logotipo cadastrada',
        linked: [...linked, template.nome || template.concurso || 'Concurso'],
      });
    });

    return Array.from(byUrl.values()).sort((first, second) =>
      first.label.localeCompare(second.label, 'pt-BR')
    );
  }, [concursoCatalog]);

  const selectedOrgaoLogoUrls = useMemo(
    () =>
      Array.from(
        new Set(
          concursoCatalog
            .filter((template) => String(template.concurso || '').trim() === logoBatchOrgao)
            .map((template) => String(template.imagem_url || '').trim())
            .filter(Boolean)
        )
      ),
    [concursoCatalog, logoBatchOrgao]
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedTemplateId('');
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  const clearContestDraft = () => {
    resetForm();
    setContestFormImportStatus('');
    setContestFormOptions([]);
  };

  const saveCourseTemplates = async () => {
    if (!onSaveCourseTemplates) {
      warning('Função de save não configurada. Verifique o App.jsx.', 'Configuração');
      return;
    }
    if (courseTemplatesDraft === null) {
      warning('Catálogo ainda carregando, aguarde um momento.', 'Aguarde');
      return;
    }
    setCourseTemplatesSaving(true);
    try {
      const result = await onSaveCourseTemplates(courseTemplatesDraft);
      if (result?.ok) {
        // Não reseta dirty aqui — manter true impede o useEffect de sobrescrever o draft
        // com a prop recém-atualizada do App.jsx, o que apagaria imagens/edições recentes.
        // O draft já contém o estado correto salvo; ele é re-inicializado corretamente
        // na próxima vez que o componente montar (navegação para outra tab e volta).
        success('Catálogo salvo com sucesso!', 'Cursos e vestibulares');
      } else {
        const errMsg = result?.error || 'Não foi possível salvar o catálogo.';
        if (errMsg.includes('course_templates_json')) {
          toastError(
            'Coluna ausente no banco. Rode o SQL: supabase/redacao_site_content_course_templates.sql',
            'Migration pendente'
          );
        } else {
          toastError(errMsg, 'Erro ao salvar');
        }
      }
    } catch (err) {
      toastError(String(err?.message || err) || 'Erro inesperado ao salvar.', 'Erro');
    } finally {
      setCourseTemplatesSaving(false);
    }
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
    const names = buildContestDisplayNames(template);
    const importedSubjects = (Array.isArray(template.disciplinas) ? template.disciplinas : [])
      .map((subject) => ({
        nome: String(subject?.nome || subject?.name || '').trim(),
        cor: '',
        topicosTexto: (Array.isArray(subject?.topicos) ? subject.topicos : subject?.topics || [])
          .map((topic) => normalizeTopicDraft(topic))
          .filter(Boolean)
          .join('\n'),
      }))
      .filter((subject) => subject.nome);

    setForm((prev) => {
      const rawProvaData = normalizeImportedDate(template.prova_data) || prev.prova_data;
      const statusConcurso = resolveContestStatusByDate(template.status_concurso || prev.status_concurso, rawProvaData);
      const provaData = resolveContestDateByStatus(statusConcurso, rawProvaData);

      return {
        ...prev,
      slug: prev.slug,
      nome: names.nome || cleanImportedValue(template.nome) || prev.nome,
      plano: names.plano || cleanImportedValue(template.plano) || cleanImportedValue(template.nome) || prev.plano,
      concurso: names.concurso || cleanImportedValue(template.concurso) || cleanImportedValue(template.nome) || prev.concurso,
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
      status_concurso: statusConcurso,
      prova_data: provaData,
      edital_url: cleanImportedValue(template.edital_url) || prev.edital_url,
      imagem_url: cleanImportedValue(template.imagem_url) || prev.imagem_url,
      // Campos do modelo híbrido (vestibular/ENEM) vindos do JSON colado.
      registration_start: template.registration_start || prev.registration_start,
      registration_end: template.registration_end || prev.registration_end,
      scope: template.scope || prev.scope,
      meta: template.prova_data_dia2
        ? { ...(prev.meta && typeof prev.meta === 'object' ? prev.meta : {}), prova_data_dia2: template.prova_data_dia2 }
        : prev.meta,
      disciplinas: importedSubjects.length > 0 ? importedSubjects : prev.disciplinas,
      };
    });

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

        const localJsonResult = parseContestJsonLocally(source);
        result = localJsonResult || (await analyzeContestForm({ text: source }));
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

  const handleDownloadContestPrompt = () => {
    const blob = new Blob([CONTEST_JSON_PROMPT_MD], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prompt-json-concurso-papirando.md';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
    tipo: form.tipo || 'concurso',
    uf: form.tipo === 'vestibular' && form.scope === 'estadual' ? (form.uf || '').toUpperCase().slice(0, 2) : null,
    scope: form.tipo === 'vestibular' ? (form.scope || 'nacional') : null,
    modality: form.tipo === 'vestibular' ? (form.modality || null) : null,
    institution_type: form.tipo === 'vestibular' ? (form.institution_type || null) : null,
    registration_start: form.registration_start || null,
    registration_end: form.registration_end || null,
    // Preserva o meta carregado e atualiza só o "sobre a instituição" editável no modal.
    meta: { ...(form.meta && typeof form.meta === 'object' ? form.meta : {}), about_institution: (form.about_institution || '').trim() },
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

  const normalizeImportedTemplateToPayload = (template, index = 0) => {
    const normalized = normalizeJsonContestTemplate(template);
    const names = buildContestDisplayNames(normalized);

    const rawProvaData = normalizeImportedDate(normalized.prova_data || form.prova_data);
    const statusConcurso = resolveContestStatusByDate(normalized.status_concurso || form.status_concurso, rawProvaData);
    const provaData = resolveContestDateByStatus(statusConcurso, rawProvaData);

    return {
      id: null,
      slug: '',
      nome: names.nome || normalized.nome || normalized.cargo || `Concurso ${index + 1}`,
      plano: names.plano || normalized.plano || normalized.nome || `Plano ${index + 1}`,
      concurso: names.concurso || normalized.concurso || form.concurso || normalized.nome || '',
      area: normalizeImportedArea(normalized.area || form.area),
      cargo: cleanImportedValue(normalized.cargo || ''),
      banca: cleanImportedValue(normalized.banca || form.banca) || 'A definir',
      salario: cleanImportedValue(normalized.salario || ''),
      inscricao_valor: cleanImportedValue(normalized.inscricao_valor || form.inscricao_valor),
      escolaridade: cleanImportedValue(normalized.escolaridade || ''),
      vagas: cleanImportedValue(normalized.vagas || ''),
      lotacao: cleanImportedValue(normalized.lotacao || ''),
      etapas: cleanImportedValue(normalized.etapas || form.etapas),
      etapas_tags: Array.isArray(normalized.etapas_tags) && normalized.etapas_tags.length > 0 ? normalized.etapas_tags : form.etapas_tags,
      taf_itens: Array.isArray(normalized.taf_itens) ? normalized.taf_itens : [],
      cor: form.cor || '#1e3a5f',
      descricao: cleanImportedValue(normalized.descricao || form.descricao),
      is_public: form.is_public,
      status_concurso: statusConcurso,
      prova_data: provaData,
      imagem_url: cleanImportedValue(normalized.imagem_url || form.imagem_url),
      edital_url: cleanImportedValue(normalized.edital_url || form.edital_url),
      disciplinas: (normalized.disciplinas || []).map((subject, subjectIndex) => ({
        nome: subject.nome,
        ordem: subjectIndex,
        cor: subject.cor || '',
        topicos: (subject.topicos || []).map((topic, topicIndex) => ({
          nome: typeof topic === 'string' ? topic : topic.nome,
          ordem: topicIndex,
        })).filter((topic) => topic.nome),
      })),
    };
  };

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
      setIsContestModalOpen(false);
    } catch (error) {
      toastError(error.message || 'Não foi possível salvar o concurso.', 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  // Salva já tornando público — usado pelo botão "Publicar" do modal (valida nas abas → publica).
  const handleSaveAndPublish = async () => {
    const payload = { ...normalizeDraftToPayload(), is_public: true };

    if (!payload.nome) {
      warning('Digite o nome do concurso.');
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
      success(`"${payload.nome}" publicado no catálogo.`);
      await reloadDrafts();
      resetForm();
      setIsContestModalOpen(false);
    } catch (error) {
      toastError(error.message || 'Não foi possível publicar o concurso.', 'Erro ao publicar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAllContestOptions = async () => {
    if (contestFormOptions.length <= 1) return;
    setIsSaving(true);

    try {
      for (const [index, template] of contestFormOptions.entries()) {
        const payload = normalizeImportedTemplateToPayload(template, index);
        if (!payload.nome) continue;
        await onCreateTemplate?.(payload);
      }

      success(`${contestFormOptions.length} cadastro(s) salvos no catálogo. Concursos diferentes ficam separados; cargos do mesmo concurso ficam agrupados.`);
      resetForm();
      setContestFormOptions([]);
      setContestFormImportStatus('');
    } catch (error) {
      toastError(error.message || 'Não foi possível salvar todos os cargos.', 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  // Atualiza concursos JÁ existentes a partir do mesmo JSON do prompt. Faz match
  // por nome/plano/concurso (chave normalizada) e sobrescreve só os campos que o
  // JSON traz preenchidos. Disciplinas só são substituídas quando o JSON as inclui.
  const handleUpdateFromJson = async () => {
    const text = updateJsonText.trim();
    if (!text) { warning('Cole o JSON antes de atualizar.'); return; }

    const result = parseContestJsonLocally(text);
    const templates = Array.isArray(result?.templates) ? result.templates : [];
    if (templates.length === 0) {
      setUpdateJsonStatus('Nenhum concurso válido encontrado no JSON. Verifique a estrutura.');
      return;
    }

    // Índice dos concursos por chave normalizada (nome → plano → concurso),
    // incluindo PUBLICADOS e RASCUNHOS. Publicados entram primeiro (prioridade).
    const index = new Map();
    const addToIndex = (list) => {
      for (const t of list) {
        if ((t.tipo || 'concurso') !== 'concurso') continue;
        for (const candidate of [t.nome, t.plano, t.concurso]) {
          const key = normalizeCargoKey(candidate);
          if (key && !index.has(key)) index.set(key, t);
        }
      }
    };
    addToIndex(concursoCatalog);
    addToIndex(localDrafts);

    setUpdateJsonWorking(true);
    setUpdateJsonStatus('');
    let updated = 0;
    const naoEncontrados = [];

    try {
      for (const tpl of templates) {
        const norm = normalizeJsonContestTemplate(tpl);
        const names = buildContestDisplayNames(norm);
        let existing = null;
        for (const candidate of [names.nome, norm.nome, names.plano, norm.plano, names.concurso, norm.concurso]) {
          const key = normalizeCargoKey(candidate);
          if (key && index.has(key)) { existing = index.get(key); break; }
        }
        if (!existing) { naoEncontrados.push(names.nome || norm.nome || norm.concurso || '—'); continue; }

        const full = await ensureTemplateContent(existing);
        // Preserva o status de publicação (não publica rascunho ao atualizar).
        const overrides = { is_public: existing.is_public === true };
        const setIf = (field, value) => { const v = cleanImportedValue(value); if (v) overrides[field] = v; };
        setIf('banca', norm.banca);
        setIf('salario', norm.salario);
        setIf('inscricao_valor', norm.inscricao_valor);
        setIf('escolaridade', norm.escolaridade);
        setIf('vagas', norm.vagas);
        setIf('lotacao', norm.lotacao);
        setIf('etapas', norm.etapas);
        setIf('descricao', norm.descricao);
        setIf('edital_url', norm.edital_url);
        if (norm.area) overrides.area = normalizeImportedArea(norm.area);
        if (Array.isArray(norm.etapas_tags) && norm.etapas_tags.length > 0) overrides.etapas_tags = norm.etapas_tags;
        if (Array.isArray(norm.taf_itens) && norm.taf_itens.length > 0) overrides.taf_itens = norm.taf_itens;

        // Status + data coerentes entre si.
        const rawData = normalizeImportedDate(norm.prova_data || full.prova_data);
        const status = resolveContestStatusByDate(norm.status_concurso || full.status_concurso, rawData);
        overrides.status_concurso = status;
        overrides.prova_data = resolveContestDateByStatus(status, rawData);

        // Disciplinas: só substitui quando o JSON traz conteúdo (senão preserva o atual).
        if (Array.isArray(norm.disciplinas) && norm.disciplinas.length > 0) {
          overrides.disciplinas = norm.disciplinas.map((subject, subjectIndex) => ({
            nome: subject.nome,
            ordem: subjectIndex,
            cor: subject.cor || '',
            topicos: (subject.topicos || []).map((topic, topicIndex) => ({
              nome: typeof topic === 'string' ? topic : topic.nome,
              ordem: topicIndex,
            })).filter((topic) => topic.nome),
          }));
        }

        await onUpdateTemplate?.(buildTemplatePayload(full, overrides));
        updated += 1;
      }

      await reloadDrafts();
      const resumoNao = naoEncontrados.length
        ? ` ${naoEncontrados.length} não encontrado(s): ${naoEncontrados.slice(0, 5).join(', ')}${naoEncontrados.length > 5 ? '…' : ''}.`
        : '';
      setUpdateJsonStatus(`${updated} concurso(s) atualizado(s).${resumoNao}`);
      if (updated > 0) success(`${updated} concurso(s) atualizado(s) via JSON.`);
    } catch (error) {
      toastError(error.message || 'Falha ao atualizar via JSON.', 'Erro ao atualizar');
    } finally {
      setUpdateJsonWorking(false);
    }
  };

  // A lista vem SEM disciplinas/tópicos (carregados sob demanda). Garante que o
  // template tenha disciplinas antes de editar/publicar — senão o save as apagaria.
  const ensureTemplateContent = async (template) => {
    if (!template?.id) return template;
    if (Array.isArray(template.disciplinas) && template.disciplinas.length > 0) return template;
    const disciplinas = await loadContestTemplateContent(supabase, template.id);
    return { ...template, disciplinas: Array.isArray(disciplinas) ? disciplinas : [] };
  };

  const handleEditTemplate = async (template) => {
    setSelectedTemplateId(template.id);
    setIsContestModalOpen(true);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    // abre o modal já e popula assim que as disciplinas chegarem (consulta rápida)
    setForm(buildFormFromTemplate(template));
    try {
      const full = await ensureTemplateContent(template);
      if (full !== template) setForm(buildFormFromTemplate(full));
    } catch (error) {
      toastError(error.message || 'Não foi possível carregar as disciplinas deste concurso.', 'Erro ao abrir');
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      warning('Envie uma imagem PNG, JPG ou WEBP.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const url = await onUploadImage?.({ file, currentUrl: '' });
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

  const handleApplyLogoToOrgao = async (orgaoOverride, logoUrlOverride) => {
    const orgao = (orgaoOverride || logoBatchOrgao).trim();
    const logoUrl = (logoUrlOverride || logoBatchUrl).trim();

    if (!orgao) {
      warning('Escolha o órgão antes de vincular a logotipo.');
      return;
    }
    if (!logoUrl) {
      warning('Escolha ou envie uma logotipo antes de vincular.');
      return;
    }

    const conflictingUrls = selectedOrgaoLogoUrls.filter((url) => url !== logoUrl);
    if (conflictingUrls.length > 0) {
      warning('Esse órgão já possui outra logotipo vinculada. Use a mesma logo ou remova a duplicidade antes de salvar.');
      return;
    }

    const templates = concursoCatalog.filter((template) => String(template.concurso || '').trim() === orgao);
    if (templates.length === 0) {
      warning('Nenhum concurso encontrado para esse órgão.');
      return;
    }

    const toUpdate = templates.filter((t) => (t.imagem_url || '').trim() !== logoUrl);
    if (toUpdate.length === 0) {
      success(`Todos os concursos de ${orgao} já usam esta logotipo.`);
      return;
    }

    setIsSaving(true);
    try {
      for (const template of toUpdate) {
        await onUpdateTemplate?.({
          id: template.id,
          slug: template.slug || '',
          nome: template.nome || '',
          plano: template.plano || template.nome || '',
          concurso: template.concurso || '',
          area: template.area || 'Geral',
          cargo: template.cargo || '',
          banca: template.banca || 'A definir',
          salario: template.salario || '',
          inscricao_valor: template.inscricao_valor || '',
          escolaridade: template.escolaridade || '',
          vagas: template.vagas || '',
          lotacao: template.lotacao || '',
          etapas: template.etapas || '',
          etapas_tags: Array.isArray(template.etapas_tags) ? template.etapas_tags : [],
          taf_itens: Array.isArray(template.taf_itens) ? template.taf_itens : [],
          cor: template.cor || '#1e3a5f',
          descricao: template.descricao || '',
          is_public: template.is_public !== false,
          status_concurso: template.status_concurso || 'edital_publicado',
          prova_data: template.prova_data || '',
          imagem_url: logoUrl,
          edital_url: template.edital_url || '',
          disciplinas: (template.disciplinas || []).map((subject, subjectIndex) => ({
            nome: subject.nome || '',
            ordem: subjectIndex,
            cor: subject.cor || '',
            topicos: (subject.topicos || []).map((topic, topicIndex) => ({
              nome: typeof topic === 'string' ? topic : topic.nome,
              ordem: topicIndex,
            })).filter((topic) => topic.nome),
          })),
        });
      }
      success(`Logotipo vinculada a ${templates.length} concurso(s) de ${orgao}.`);
    } catch (error) {
      toastError(error.message || 'Não foi possível vincular a logotipo ao órgão.', 'Erro ao vincular');
    } finally {
      setIsSaving(false);
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
      // Se o item excluído era um rascunho, recarrega a fila de revisão.
      if (target.is_public === false) {
        await reloadDrafts();
      }
      setDeleteTarget(null);
    } catch (error) {
      setDeleteTemplateError(error.message || 'Não foi possível excluir o concurso.');
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  // Monta o payload completo que onUpdateTemplate espera (mesma forma do batch de logo),
  // permitindo sobrescrever campos pontuais (ex.: is_public ao publicar, imagem_url ao trocar logo).
  const buildTemplatePayload = (template, overrides = {}) => ({
    id: template.id,
    slug: template.slug || '',
    nome: template.nome || '',
    plano: template.plano || template.nome || '',
    concurso: template.concurso || template.nome || '',
    area: template.area || 'Geral',
    cargo: template.cargo || '',
    banca: template.banca || 'A definir',
    salario: template.salario || '',
    inscricao_valor: template.inscricao_valor || '',
    escolaridade: template.escolaridade || '',
    vagas: template.vagas || '',
    lotacao: template.lotacao || '',
    etapas: template.etapas || '',
    etapas_tags: Array.isArray(template.etapas_tags) ? template.etapas_tags : [],
    taf_itens: Array.isArray(template.taf_itens) ? template.taf_itens : [],
    cor: template.cor || '#1e3a5f',
    descricao: template.descricao || '',
    imagem_url: template.imagem_url || '',
    edital_url: template.edital_url || '',
    prova_data: template.prova_data || '',
    status_concurso: template.status_concurso || 'edital_publicado',
    is_public: template.is_public !== false,
    // Preserva tipo + campos de vestibular ao publicar/enviar logo pela lista.
    tipo: template.tipo || 'concurso',
    uf: template.uf || null,
    scope: template.scope || null,
    modality: template.modality || null,
    institution_type: template.institution_type || null,
    registration_start: template.registration_start || null,
    registration_end: template.registration_end || null,
    meta: template.meta && typeof template.meta === 'object' ? template.meta : {},
    disciplinas: (template.disciplinas || []).map((subject, subjectIndex) => ({
      nome: subject.nome || '',
      ordem: subjectIndex,
      cor: subject.cor || '',
      topicos: (subject.topicos || []).map((topic, topicIndex) => ({
        nome: typeof topic === 'string' ? topic : topic.nome,
        ordem: topicIndex,
      })).filter((topic) => topic.nome),
    })),
    ...overrides,
  });

  const handleBatchDeleteDrafts = async (idsToDelete) => {
    if (!idsToDelete || idsToDelete.size === 0) return;
    const count = idsToDelete.size;
    if (!window.confirm(`Excluir ${count} rascunho(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    setBatchDeleting(true);
    try {
      const targets = localDrafts.filter((d) => idsToDelete.has(d.id));
      for (const t of targets) {
        await onDeleteTemplate?.(t);
      }
      setSelectedDraftIds(new Set());
      await reloadDrafts();
      success(`${count} rascunho(s) excluído(s).`);
    } catch (error) {
      toastError(error.message || 'Erro ao excluir rascunhos.', 'Erro');
    } finally {
      setBatchDeleting(false);
    }
  };

  const handlePublishDraft = async (draft) => {
    if (!draft?.id) return;
    setPublishingDraftId(draft.id);
    try {
      // Carrega disciplinas/tópicos antes (a lista vem sem eles) pra não apagá-los ao salvar.
      const full = await ensureTemplateContent(draft);
      await onUpdateTemplate?.(buildTemplatePayload(full, { is_public: true }));
      await reloadDrafts();
      success(`"${draft.nome}" publicado no catálogo.`);
    } catch (error) {
      toastError(error.message || 'Não foi possível publicar o rascunho.', 'Erro ao publicar');
    } finally {
      setPublishingDraftId('');
    }
  };

  const handleDraftLogoUpload = async (draft, file) => {
    if (!draft?.id || !file) return;
    if (!file.type.startsWith('image/')) {
      warning('Envie uma imagem PNG, JPG ou WEBP.');
      return;
    }
    setUploadingLogoDraftId(draft.id);
    try {
      const url = await onUploadImage?.({ file, currentUrl: draft.imagem_url || '' });
      if (url) {
        // Carrega disciplinas/tópicos antes pra não apagá-los ao salvar a logo.
        const full = await ensureTemplateContent(draft);
        await onUpdateTemplate?.(buildTemplatePayload(full, { imagem_url: url }));
        await reloadDrafts();
        success('Logotipo atualizada.');
      }
    } catch (error) {
      toastError(error.message || 'Não foi possível enviar a imagem.', 'Erro no upload');
    } finally {
      setUploadingLogoDraftId('');
    }
  };

  const faculdadeCount = (courseTemplatesDraft ?? []).filter((item) => item.intent === 'faculdade').length;
  const vestibularCount = (courseTemplatesDraft ?? []).filter((item) => item.intent === 'vestibular').length;

  // Classifica um rascunho em um dos três grupos (curso/faculdade caem em "curso").
  const draftBucketOf = (d) => {
    if (d.tipo === 'vestibular') return 'vestibular';
    if (d.tipo === 'enem') return 'enem';
    if (d.tipo === 'enem_inst') return 'enem_inst';
    if (d.tipo === 'concurso') return 'concurso';
    if (d.tipo === 'faculdade' || d.tipo === 'curso') return 'curso';
    return 'outros';
  };

  // Contagem por tipo (independe da busca/filtro) — para os botões de filtro.
  const draftCounts = React.useMemo(() => {
    const c = { todos: localDrafts.length, vestibular: 0, enem: 0, enem_inst: 0, concurso: 0, curso: 0, outros: 0 };
    for (const d of localDrafts) c[draftBucketOf(d)] += 1;
    return c;
  }, [localDrafts]);

  // Rascunhos filtrados por busca, separados por bucket de tipo e sub-agrupados por área.
  // Cada módulo (Concursos/Vestibulares/Faculdade) lê só o seu bucket.
  const draftsByBucket = React.useMemo(() => {
    const q = draftQuery.trim().toLowerCase();
    const buckets = { vestibular: [], enem: [], enem_inst: [], concurso: [], curso: [], outros: [] };
    for (const d of localDrafts) {
      if (q && ![d.nome, d.concurso, d.cargo, d.banca, d.area].some((v) => String(v || '').toLowerCase().includes(q))) continue;
      buckets[draftBucketOf(d)].push(d);
    }
    const grouped = {};
    let total = 0;
    for (const [key, items] of Object.entries(buckets)) {
      total += items.length;
      const byArea = new Map();
      for (const d of items) {
        const a = String(d.area || '').trim() || 'Sem área';
        if (!byArea.has(a)) byArea.set(a, []);
        byArea.get(a).push(d);
      }
      grouped[key] = {
        count: items.length,
        areaGroups: [...byArea.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])),
      };
    }
    grouped.total = total;
    return grouped;
  }, [localDrafts, draftQuery]);

  // Sub-página de rascunhos de um módulo (concurso | vestibular | curso).
  // Itens importados via código caem aqui — admin valida (edita) e publica.
  const renderRascunhos = (bucket, { singular = 'item' } = {}) => {
    const data = draftsByBucket[bucket] || { count: 0, areaGroups: [] };
    const totalInBucket = localDrafts.filter((d) => draftBucketOf(d) === bucket).length;
    const allVisibleIds = data.areaGroups.flatMap(([, items]) => items.map((d) => d.id));
    const allVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedDraftIds.has(id));
    const someSelected = selectedDraftIds.size > 0;
    return (
      <div className="pl-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--pl-ink-4)', pointerEvents: 'none' }} />
            <input
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder={`Buscar rascunho de ${singular} por nome, órgão, área…`}
              className="pl-input"
              style={{ paddingLeft: 32, width: '100%' }}
            />
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--pl-ink-3)' }}>
            {draftsLoading ? 'carregando…' : `${data.count} de ${totalInBucket} rascunho(s)`}
          </p>
          {someSelected && (
            <button
              type="button"
              className="pl-btn pl-btn-sm"
              disabled={batchDeleting}
              onClick={() => handleBatchDeleteDrafts(selectedDraftIds)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--pl-danger-soft)', border: '1px solid var(--pl-danger)', color: 'var(--pl-danger)' }}
            >
              {batchDeleting ? <Loader2 size={13} className="pl-spin" /> : <Trash2 size={13} />}
              Excluir selecionados ({selectedDraftIds.size})
            </button>
          )}
          <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" onClick={reloadDrafts} disabled={draftsLoading}>
            {draftsLoading ? <Loader2 size={13} className="pl-spin" /> : null} Recarregar
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--pl-ink-3)', marginBottom: 14, lineHeight: 1.5 }}>
          Itens importados ficam aqui como rascunho — <strong>invisíveis para os alunos</strong> até você publicar.
          Clique no nome para revisar, envie a logotipo e clique em <strong>Publicar</strong> quando estiver pronto.
        </p>

        <div style={{ maxHeight: 520, overflowY: 'auto', borderRadius: 6, border: '1px solid var(--pl-rule-2)' }}>
          {totalInBucket === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--pl-ink-3)', fontSize: 13 }}>
              Nenhum rascunho na fila. Itens importados (is_public=false) deste tipo aparecem aqui.
            </div>
          ) : data.count === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--pl-ink-3)', fontSize: 13 }}>
              Nenhum rascunho encontrado com essa busca.
            </div>
          ) : (
            <>
              {/* Cabeçalho de seleção */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)' }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={() => {
                    if (allVisibleSelected) {
                      setSelectedDraftIds((prev) => { const s = new Set(prev); allVisibleIds.forEach((id) => s.delete(id)); return s; });
                    } else {
                      setSelectedDraftIds((prev) => { const s = new Set(prev); allVisibleIds.forEach((id) => s.add(id)); return s; });
                    }
                  }}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--pl-accent)', flexShrink: 0 }}
                />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
                  {someSelected ? `${selectedDraftIds.size} selecionado(s)` : 'Selecionar todos'}
                </span>
              </div>
              {data.areaGroups.map(([area, items]) => (
              <div key={area}>
                {data.areaGroups.length > 1 && (
                  <div style={{
                    position: 'sticky', top: 0, zIndex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 14px',
                    background: 'var(--pl-bg-soft)',
                    borderBottom: '1px solid var(--pl-rule)',
                  }}>
                    <p className="pl-eyebrow" style={{ margin: 0 }}>{area}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--pl-ink-4)' }}>{items.length}</span>
                  </div>
                )}
                {items.map((draft) => {
                  const isPublishing = publishingDraftId === draft.id;
                  const isUploading = uploadingLogoDraftId === draft.id;
                  const busy = isPublishing || isUploading || batchDeleting;
                  const isChecked = selectedDraftIds.has(draft.id);
                  return (
                    <div
                      key={draft.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '20px auto minmax(0,1.6fr) minmax(110px,0.7fr) auto',
                        gap: 10,
                        padding: '10px 14px',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--pl-rule)',
                        opacity: busy ? 0.6 : 1,
                        background: isChecked ? 'var(--pl-danger-soft)' : 'transparent',
                        transition: 'background .1s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedDraftIds((prev) => {
                            const s = new Set(prev);
                            if (s.has(draft.id)) s.delete(draft.id); else s.add(draft.id);
                            return s;
                          });
                        }}
                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--pl-danger)', flexShrink: 0 }}
                      />

                      <label
                        title="Enviar logotipo"
                        style={{
                          width: 36, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0,
                          border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy ? 'default' : 'pointer',
                          position: 'relative',
                        }}
                      >
                        {isUploading
                          ? <Loader2 size={14} className="pl-spin" style={{ color: 'var(--pl-ink-4)' }} />
                          : draft.imagem_url
                            ? <img src={draft.imagem_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                            : <Upload size={13} style={{ color: 'var(--pl-ink-4)' }} />
                        }
                        <input
                          type="file"
                          accept="image/*"
                          disabled={busy}
                          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleDraftLogoUpload(draft, f); }}
                          style={{ display: 'none' }}
                        />
                      </label>

                      <button type="button" onClick={() => handleEditTemplate(draft)} disabled={busy} style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draft.nome}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--pl-ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {[draft.concurso, draft.cargo].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </button>

                      <p style={{ margin: 0, fontSize: 12, color: 'var(--pl-ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draft.banca || '—'}</p>

                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifySelf: 'end' }}>
                        <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => handleEditTemplate(draft)} disabled={busy} title="Revisar / editar">
                          <Pencil size={13} /> Editar
                        </button>
                        <button type="button" className="pl-btn pl-btn-primary pl-btn-sm" onClick={() => handlePublishDraft(draft)} disabled={busy} title="Publicar no catálogo">
                          {isPublishing ? <Loader2 size={13} className="pl-spin" /> : <Eye size={13} />} Publicar
                        </button>
                        <button type="button" onClick={() => handleDeleteSelected(draft)} disabled={busy} title={`Excluir ${draft.nome}`} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--pl-ink-4)', borderRadius: 4, padding: 4, lineHeight: 0 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pl-page">
      {/* Hero */}
      <header style={{ marginBottom: 8 }}>
        <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Painel administrativo</p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="pl-display" style={{ marginBottom: 8 }}>Catálogo de estudos.</h1>
            <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', maxWidth: 560 }}>
              Gerencie concursos, cursos de faculdade e vestibulares disponíveis para os alunos.
            </p>
          </div>
          <div className="pl-card" style={{ padding: '10px 16px', textAlign: 'right', minWidth: 180 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Admin ativo</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', wordBreak: 'break-all' }}>{currentUserEmail}</p>
          </div>
        </div>
      </header>

      {/* KPI strip — tudo numa linha (9 blocos) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 8, marginBottom: 8 }}>
        {[
          { label: 'Total catálogo', value: stats.templates + (courseTemplatesDraft?.length ?? 0) },
          { label: 'Concursos', value: stats.templates },
          { label: 'Faculdade', value: faculdadeCount },
          { label: 'Vestibulares', value: vestibularCount },
          { label: 'Publicados', value: stats.publicados },
          { label: 'Sem imagem', value: stats.semImagem, warn: true },
          { label: 'Sem edital', value: stats.semEdital, warn: true },
          { label: 'Sem data', value: stats.semProva, warn: true },
          { label: 'Sem tópicos', value: stats.semTopicos, warn: true },
        ].map((k) => (
          <div key={k.label} className={k.warn ? 'pl-card-paper' : 'pl-card'} style={{ padding: '10px 12px' }}>
            <p className="pl-eyebrow" style={{ marginBottom: 4, fontSize: 9, whiteSpace: 'nowrap' }}>{k.label}</p>
            <p className="pl-num" style={{ fontSize: 20, color: k.warn ? (k.value > 0 ? 'var(--pl-warn)' : 'var(--pl-ink-3)') : 'var(--pl-ink)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--pl-rule-2)', marginBottom: 20 }}>
        {[
          { id: 'concursos', label: 'Concursos', count: publishedConcursoCount },
          { id: 'enem', label: 'ENEM', count: publishedEnemCount + publishedEnemInstCount },
          { id: 'vestibulares', label: 'Vestibulares', count: publishedVestibularCount },
          { id: 'cursos', label: 'Faculdade', count: faculdadeCount },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setAdminSection(tab.id); setCatalogView('publicados'); setDraftQuery(''); }}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderBottom: adminSection === tab.id ? '2px solid var(--pl-accent)' : '2px solid transparent',
              color: adminSection === tab.id ? 'var(--pl-accent)' : 'var(--pl-ink-3)',
              marginBottom: -1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tab.label}
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10,
              background: adminSection === tab.id ? 'var(--pl-accent-soft)' : 'var(--pl-bg-soft)',
              color: adminSection === tab.id ? 'var(--pl-accent)' : 'var(--pl-ink-4)',
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Sub-seletor da aba ENEM: Exame | Instituições (unifica o que antes eram 2 abas) */}
      {adminSection === 'enem' && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {[
            { id: 'exame', label: 'Exame', count: publishedEnemCount },
            { id: 'instituicoes', label: 'Instituições', count: publishedEnemInstCount },
          ].map((s) => {
            const active = enemSub === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { setEnemSub(s.id); setCatalogView('publicados'); setDraftQuery(''); setContestQuery(''); setContestAreaFilter('Todos'); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  borderRadius: 999,
                  border: active ? '1px solid #1e3a5f' : '1px solid var(--pl-rule-2)',
                  background: active ? '#1e3a5f' : 'var(--pl-surface)',
                  color: active ? '#f3efe5' : 'var(--pl-ink-2)',
                }}
              >
                {s.label}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                  background: active ? 'rgba(243,239,229,0.18)' : 'var(--pl-bg-soft)',
                  color: active ? '#f3efe5' : 'var(--pl-ink-4)',
                }}>{s.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sub-toggle: Publicados | Rascunhos (por módulo) */}
      {(() => {
        const bucket = contestSectionTipo === 'vestibular' ? 'vestibular' : contestSectionTipo === 'enem' ? 'enem' : contestSectionTipo === 'enem_inst' ? 'enem_inst' : adminSection === 'cursos' ? 'curso' : 'concurso';
        const pubCount = contestSectionTipo === 'vestibular' ? publishedVestibularCount : contestSectionTipo === 'enem' ? publishedEnemCount : contestSectionTipo === 'enem_inst' ? publishedEnemInstCount : adminSection === 'cursos' ? faculdadeCount : publishedConcursoCount;
        const draftCount = draftCounts[bucket] || 0;
        return (
          <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
            {[
              { id: 'publicados', label: 'Publicados', count: pubCount },
              { id: 'rascunhos', label: 'Rascunhos', count: draftCount },
            ].map((v) => {
              const active = catalogView === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { setCatalogView(v.id); setDraftQuery(''); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    borderRadius: 6,
                    border: active ? '1px solid var(--pl-accent)' : '1px solid var(--pl-rule-2)',
                    background: active ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
                    color: active ? 'var(--pl-accent)' : 'var(--pl-ink-2)',
                  }}
                >
                  {v.label}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                    background: active ? 'var(--pl-accent)' : 'var(--pl-bg-soft)',
                    color: active ? '#fff' : 'var(--pl-ink-4)',
                  }}>{v.count}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {(adminSection === 'concursos' || adminSection === 'vestibulares' || adminSection === 'enem' || adminSection === 'enem_inst') && catalogView === 'rascunhos' && (
        <>
          {contestSectionTipo === 'concurso' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                type="button"
                className="pl-btn pl-btn-ghost"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => { setUpdateJsonOpen(true); setUpdateJsonStatus(''); }}
                title="Colar JSON do prompt para atualizar concursos (inclui rascunhos)"
              >
                <RefreshCw size={14} /> Atualizar via JSON
              </button>
            </div>
          )}
          {renderRascunhos(contestSectionTipo, { singular: contestSectionNoun })}
        </>
      )}

      {(adminSection === 'concursos' || adminSection === 'vestibulares' || adminSection === 'enem' || adminSection === 'enem_inst') && catalogView === 'publicados' && (
      <div className="pl-card" style={{ padding: 20 }}>
        {/* Barra de busca + ações */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--pl-ink-4)', pointerEvents: 'none' }} />
            <input
              value={contestQuery}
              onChange={(e) => setContestQuery(e.target.value)}
              placeholder={contestSectionTipo === 'vestibular' ? 'Nome do vestibular, banca…' : contestSectionTipo === 'enem' ? 'Nome do exame, edição, banca…' : contestSectionTipo === 'enem_inst' ? 'Nome da instituição, sigla, UF…' : 'Nome, cargo, órgão ou banca…'}
              className="pl-input"
              style={{ paddingLeft: 32, width: '100%' }}
            />
          </div>
          <select
            value={selectedContestAreaFilter}
            onChange={(e) => setContestAreaFilter(e.target.value)}
            className="pl-input"
            style={{ flex: '0 0 160px' }}
          >
            {contestAreaOptions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {contestSectionTipo === 'concurso' && (
            <button
              type="button"
              className="pl-btn pl-btn-ghost"
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => { setUpdateJsonOpen(true); setUpdateJsonStatus(''); }}
              title="Colar JSON do prompt para atualizar concursos já cadastrados"
            >
              <RefreshCw size={14} /> Atualizar via JSON
            </button>
          )}
          <button
            type="button"
            className="pl-btn pl-btn-primary"
            style={{ flexShrink: 0 }}
            onClick={() => { resetForm(); setForm((f) => ({ ...f, tipo: contestSectionTipo, area: contestSectionTipo === 'enem' ? 'Geral' : f.area, scope: contestSectionTipo === 'vestibular' ? 'nacional' : '' })); setIsContestModalOpen(true); }}
          >
            <Plus size={14} /> Novo {contestSectionNoun}
          </button>
        </div>

        {/* Lista */}
        <div style={{ maxHeight: 440, overflowY: 'auto', borderRadius: 6, border: '1px solid var(--pl-rule-2)' }}>
          {filteredContestCatalog.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--pl-ink-3)', fontSize: 13 }}>
              {contestSectionTipo === 'concurso' ? 'Nenhum concurso encontrado com os filtros atuais.' : `Nenhum ${contestSectionNoun} encontrado.`}
            </div>
          ) : (
            contestSections.map(([area, areaTemplates]) => (
              <div key={area}>
                <div style={{
                  position: 'sticky', top: 0, zIndex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 14px',
                  background: 'var(--pl-bg-soft)',
                  borderBottom: '1px solid var(--pl-rule)',
                }}>
                  <p className="pl-eyebrow" style={{ margin: 0 }}>{area}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--pl-ink-4)' }}>{areaTemplates.length}</span>
                </div>
                {areaTemplates.map((template) => (
                  <div
                    key={template.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto minmax(0,1.8fr) minmax(120px,0.7fr) 120px 90px 36px',
                      gap: 10,
                      padding: '10px 14px',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--pl-rule)',
                      background: selectedTemplateId === template.id ? 'var(--pl-accent-soft)' : 'transparent',
                      transition: 'background .1s',
                    }}
                  >
                    {/* Logo thumbnail */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 6, overflow: 'hidden', flexShrink: 0,
                      border: '1px solid var(--pl-rule-2)',
                      background: 'var(--pl-bg-soft)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {template.imagem_url
                        ? <img src={template.imagem_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                        : <ImageIcon size={13} style={{ color: 'var(--pl-ink-4)' }} />
                      }
                    </div>
                    <button type="button" onClick={() => handleEditTemplate(template)} style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{template.nome}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--pl-ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{template.concurso}</p>
                    </button>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--pl-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{template.cargo || '—'}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--pl-ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{template.banca || '—'}</p>
                    <span className={template.is_public ? 'pl-tag pl-tag-success' : 'pl-tag pl-tag-warn'} style={{ fontSize: 10, justifySelf: 'start' }}>
                      {template.is_public ? 'Publicado' : 'Rascunho'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSelected(template)}
                      title={`Excluir ${template.nome}`}
                      style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--pl-ink-4)', borderRadius: 4, padding: 4, lineHeight: 0 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
      )} {/* fim adminSection === 'concursos' */}

      {/* Modal: Atualizar concursos via JSON (mesma estrutura do prompt de cadastro) */}
      {updateJsonOpen && (
        <div
          onClick={() => { if (!updateJsonWorking) setUpdateJsonOpen(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,17,13,0.5)', backdropFilter: 'blur(4px)', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'hidden', borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-high)' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--pl-rule)', padding: '18px 24px' }}>
              <div>
                <p className="pl-eyebrow" style={{ marginBottom: 4, color: 'var(--pl-accent)' }}>Atualização em massa</p>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--pl-ink)' }}>Atualizar concursos via JSON</h2>
                <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--pl-ink-3)', maxWidth: 520, lineHeight: 1.55 }}>
                  Cole o JSON gerado pelo prompt. Cada concurso é localizado pelo nome (ou plano/sigla), entre publicados e rascunhos, e tem os campos preenchidos sobrescritos — disciplinas só mudam quando o JSON as inclui. O status de publicação é preservado. Concursos não encontrados são ignorados (use "Novo concurso" para cadastrá-los).
                </p>
              </div>
              <button type="button" onClick={() => { if (!updateJsonWorking) setUpdateJsonOpen(false); }} title="Fechar" style={{ borderRadius: 8, padding: 6, color: 'var(--pl-ink-3)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0, flexShrink: 0 }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea
                rows={12}
                value={updateJsonText}
                onChange={(e) => { setUpdateJsonText(e.target.value); setUpdateJsonStatus(''); }}
                placeholder='Cole aqui o JSON no formato { "concursos": [ ... ] }'
                className="pl-input"
                style={{ width: '100%', fontFamily: 'var(--pl-mono)', fontSize: 12.5, lineHeight: 1.6, resize: 'vertical', minHeight: 220 }}
              />
              {updateJsonStatus && (
                <p style={{ borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                  {updateJsonStatus}
                </p>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: '1px solid var(--pl-rule)', padding: '16px 24px', background: 'var(--pl-bg-soft)' }}>
              <button type="button" onClick={handleDownloadContestPrompt} className="pl-btn pl-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--pl-accent)' }}>
                <Download size={15} /> Baixar prompt
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => { if (!updateJsonWorking) setUpdateJsonOpen(false); }} className="pl-btn pl-btn-ghost">
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleUpdateFromJson}
                  disabled={updateJsonWorking || !updateJsonText.trim()}
                  className="pl-btn pl-btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  {updateJsonWorking ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  {updateJsonWorking ? 'Atualizando…' : 'Atualizar concursos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {adminSection === 'cursos' && catalogView === 'rascunhos' &&
        renderRascunhos('curso', { singular: 'curso' })}

      {adminSection === 'cursos' && catalogView === 'publicados' && courseTemplatesDraft === null && (
        <div className="pl-card-paper" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--pl-ink-3)' }}>Carregando catálogo…</p>
        </div>
      )}

      {adminSection === 'cursos' && catalogView === 'publicados' && courseTemplatesDraft !== null && (
        <AdminCourseTemplatesEditor
          templates={courseTemplatesDraft}
          setTemplates={setCourseTemplatesDraft}
          isSaving={courseTemplatesSaving}
          onSave={saveCourseTemplates}
          intentFilter="faculdade"
          title="Cursos de faculdade"
          subtitle="Alimente os cursos que aparecem no caminho Cursos do modal Novo objetivo de estudo."
          emptyLabel="Nenhum curso de faculdade cadastrado ainda."
        />
      )}

      {/* Logotipos agora gerenciados dentro do modal de cada concurso */}

        {isContestModalOpen ? (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-6xl">
        <div className="pl-card rounded-xl p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: 'var(--pl-rule-2)' }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{isVestForm ? 'Editor do vestibular' : 'Editor do concurso'}</p>
              <h3 className="text-xl font-semibold" style={{ color: 'var(--pl-ink)' }}>
                {isVestForm
                  ? (form.id ? 'Editando vestibular' : 'Novo vestibular')
                  : (form.id ? 'Editando concurso' : 'Novo concurso')}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { resetForm(); setIsContestModalOpen(false); }}
                className="pl-btn pl-btn-ghost inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
              >
                <X size={15} />
                Fechar
              </button>
              <StatusBadge isPublic={form.is_public} />
              <StatusPill value={form.status_concurso} />
              {selectedTemplate && (
                <StorageBadge storage={selectedTemplate.storage} />
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="pl-btn pl-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {isSaving ? 'Salvando...' : `${form.id ? 'Salvar' : 'Criar'} ${isVestForm ? 'vestibular' : 'concurso'}`}
              </button>
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => onDuplicateTemplate?.(selectedTemplate)}
                  className="pl-btn pl-btn-ghost inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold"
                  title="Duplicar concurso"
                >
                  <Copy size={15} />
                </button>
              )}
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => handleDeleteSelected(selectedTemplate)}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold"
                  style={{ color: 'var(--pl-danger)' }}
                  title="Excluir concurso"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {(form.tipo === 'vestibular' || form.tipo === 'enem' || !form.id) && (
          <div className="mb-5 rounded-lg p-4" style={{ border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)' }}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="pl-eyebrow" style={{ color: 'var(--pl-accent)' }}>Preencher com IA</p>
                <h4 className="mt-1 text-base font-semibold" style={{ color: 'var(--pl-ink)' }}>
                  {isVestForm || form.tipo === 'enem' ? 'Colar JSON de matérias' : 'Colar formulário analisado do edital'}
                </h4>
                <p className="mt-1 text-xs" style={{ color: 'var(--pl-ink-3)' }}>
                  {isVestForm || form.tipo === 'enem'
                    ? 'Cole o JSON retornado pela IA (matérias e tópicos) e clique em Preencher — as disciplinas entram no rascunho sem mexer nos demais campos.'
                    : 'A IA organiza campos, disciplinas e tópicos no rascunho a partir da análise do edital.'}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {form.tipo === 'concurso' && (
                <button
                  type="button"
                  onClick={handleDownloadContestPrompt}
                  className="pl-btn pl-btn-ghost inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-colors"
                  style={{ color: 'var(--pl-accent)' }}
                >
                  <Download size={16} />
                  Baixar prompt
                </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    // Ao EDITAR (form.id), limpa só a área de colar — nunca o registro inteiro.
                    if (form.id) {
                      setAiFormText('');
                      setAiPdfFile(null);
                      setContestFormImportStatus('');
                      setContestFormOptions([]);
                    } else {
                      clearContestDraft();
                    }
                  }}
                  className="pl-btn pl-btn-ghost inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-colors"
                  style={{ color: 'var(--pl-accent)' }}
                >
                  <X size={16} />
                  Limpar preenchimento
                </button>
                <button
                  type="button"
                  onClick={handleFillFromContestForm}
                  disabled={
                    isParsingContestForm ||
                    (aiInputMode === 'text' ? !aiFormText.trim() : !aiPdfFile)
                  }
                  className="pl-btn pl-btn-ai inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isParsingContestForm ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isParsingContestForm
                    ? (contestFormImportStatus.startsWith('Extraindo') ? 'Extraindo PDF...' : 'Analisando...')
                    : 'Preencher rascunho'}
                </button>
              </div>
            </div>

            {/* Mode tabs */}
            <div className="mt-4 flex gap-1 rounded-lg bg-indigo-50 p-1">
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
                className="pl-input pl-textarea mt-2 w-full rounded-lg text-sm outline-none"
              />
            ) : (
              <div className="mt-2">
                <label
                  htmlFor="ai-pdf-upload"
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
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
              <p className="mt-3 rounded-lg px-4 py-3 text-sm font-semibold" style={{ background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)', color: 'var(--pl-accent)' }}>
                {contestFormImportStatus}
              </p>
            )}

            {contestFormOptions.length > 1 && (
              <div className="mt-4 rounded-lg p-4" style={{ background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)' }}>
                <p className="pl-eyebrow" style={{ color: 'var(--pl-accent)' }}>
                  Opções separadas encontradas
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3" style={{ background: 'var(--pl-accent-soft)', border: '1px solid var(--pl-accent)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--pl-ink)' }}>
                    Salve tudo de uma vez. Concursos diferentes ficam em cards separados; cargos do mesmo concurso ficam dentro do card correto.
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveAllContestOptions}
                    disabled={isSaving}
                    className="pl-btn pl-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-70"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                    Salvar todos
                  </button>
                </div>
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
                        className="rounded-lg px-4 py-3 text-left transition-colors"
                        style={{ background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule-2)' }}
                      >
                        <span className="line-clamp-2 text-sm font-bold" style={{ color: 'var(--pl-ink)' }}>
                          {option.nome || option.cargo || `Opção ${optionIndex + 1}`}
                        </span>
                        <span className="mt-2 block text-xs font-semibold" style={{ color: 'var(--pl-ink-2)' }}>
                          {subjectCount} disciplina(s) · {topicCount} tópico(s)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Abas internas do modal */}
          <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--pl-rule-2)', marginBottom: 20 }}>
            {[
              { id: 'dados', label: 'Dados', warn: isVestForm ? (!form.concurso || !form.uf && form.scope === 'estadual') : (!form.area || !form.cargo || !form.prova_data) },
              { id: 'midia', label: 'Mídia', warn: !form.imagem_url },
              ...(isVestForm ? [] : [{ id: 'etapas', label: 'Etapas', warn: false }]),
              { id: 'conteudo', label: isVestForm ? 'Matérias' : 'Conteúdo', warn: !form.disciplinas.some((s) => s.nome && s.nome.trim()) },
            ].map((t) => {
              const on = modalTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setModalTab(t.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', fontSize: 13, fontWeight: 600, border: 'none',
                    background: 'transparent', cursor: 'pointer', marginBottom: -1,
                    borderBottom: on ? '2px solid var(--pl-accent)' : '2px solid transparent',
                    color: on ? 'var(--pl-accent)' : 'var(--pl-ink-3)',
                  }}
                >
                  {t.label}
                  {t.warn && <span title="Itens pendentes nesta aba" style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pl-warn)' }} />}
                </button>
              );
            })}
          </div>
          <div className="space-y-5">
            <div className="space-y-5">
            {modalTab === 'dados' && (
              <div className="pl-card rounded-xl p-4">
                <div className="mb-4">
                  <p className="pl-eyebrow">{isVestForm ? 'Dados do vestibular' : 'Dados principais'}</p>
                  <h4 className="mt-1 text-base font-semibold" style={{ color: 'var(--pl-ink)' }}>{isVestForm ? 'Identificação' : 'Identificação e vitrine'}</h4>
                </div>

                {isVestForm ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <TextField label="Nome do vestibular" value={form.nome} onChange={(value) => updateFormField('nome', value)} placeholder="Ex: FUVEST 2027" />
                    <TextField label="Instituição" value={form.concurso} onChange={(value) => updateFormField('concurso', value)} placeholder="Ex: Universidade de São Paulo" />
                    <TextField label="Sigla" value={form.banca} onChange={(value) => updateFormField('banca', value)} placeholder="Ex: USP" />
                    <SelectField label="Abrangência" value={form.scope || 'nacional'} onChange={(value) => updateFormField('scope', value)} options={[{ value: 'nacional', label: 'Nacional' }, { value: 'estadual', label: 'Estadual' }]} />
                    {form.scope === 'estadual'
                      ? <TextField label="UF" value={form.uf} onChange={(value) => updateFormField('uf', value.toUpperCase().slice(0, 2))} placeholder="Ex: SP" />
                      : <div />}
                    <SelectField label="Tipo de instituição" value={form.institution_type} onChange={(value) => updateFormField('institution_type', value)} options={[{ value: '', label: 'Selecione' }, { value: 'publica', label: 'Pública' }, { value: 'privada', label: 'Privada' }, { value: 'programa_governo', label: 'Programa do governo' }]} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <SelectField label="Modalidade" value={form.modality} onChange={(value) => updateFormField('modality', value)} options={[{ value: '', label: 'Selecione' }, { value: 'presencial', label: 'Presencial' }, { value: 'ead', label: 'EAD' }, { value: 'hibrido', label: 'Híbrido' }, { value: 'multiplo', label: 'Presencial e EAD' }]} />
                    <TextField label="Área" value={form.area} onChange={(value) => updateFormField('area', value)} placeholder="Ex: Educação" />
                    <TextField label="Requisito" value={form.escolaridade} onChange={(value) => updateFormField('escolaridade', value)} placeholder="Ex: Ensino médio completo" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <TextField label="Taxa de inscrição" value={form.inscricao_valor} onChange={(value) => updateFormField('inscricao_valor', value)} placeholder="Ex: R$ 85,00 ou Gratuito" icon={DollarSign} />
                    <div>
                      <label className="pl-eyebrow mb-2 block">Inscrições — início</label>
                      <input type="date" value={form.registration_start || ''} onChange={(e) => updateFormField('registration_start', e.target.value)} className="pl-input w-full rounded-lg py-2.5 px-3 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="pl-eyebrow mb-2 block">Inscrições — fim</label>
                      <input type="date" value={form.registration_end || ''} onChange={(e) => updateFormField('registration_end', e.target.value)} className="pl-input w-full rounded-lg py-2.5 px-3 text-sm outline-none" />
                    </div>
                  </div>
                </div>
                ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <TextField label="Nome do concurso" value={form.nome} onChange={(value) => updateFormField('nome', value)} />
                    <TextField label="Concurso / órgão" value={form.concurso} onChange={(value) => updateFormField('concurso', value)} />
                    <TextField
                      label="Área"
                      value={form.area}
                      onChange={(value) => updateFormField('area', value)}
                      placeholder="Ex: Militar"
                      listId="contest-area-options"
                    />
                    <datalist id="contest-area-options">
                      {manageableAreaOptions.map((area) => (
                        <option key={area} value={area} />
                      ))}
                    </datalist>
                    <TextField label="Cargo" value={form.cargo} onChange={(value) => updateFormField('cargo', value)} />
                    <TextField label="Banca" value={form.banca} onChange={(value) => updateFormField('banca', value)} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <TextField label="Salário" value={form.salario} onChange={(value) => updateFormField('salario', value)} placeholder="Ex: R$ 5.516,71" icon={DollarSign} />
                    <TextField label="Valor da inscrição" value={form.inscricao_valor} onChange={(value) => updateFormField('inscricao_valor', value)} placeholder="Ex: R$ 150,00" icon={DollarSign} />
                    <EscolaridadeField value={form.escolaridade} onChange={(value) => updateFormField('escolaridade', value)} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <TextField label="Vagas" value={form.vagas} onChange={(value) => updateFormField('vagas', value)} placeholder="Ex: 500 vagas + CR" />
                    <TextField label="Lotação" value={form.lotacao} onChange={(value) => updateFormField('lotacao', value)} placeholder="Ex: Alagoas" />
                    <TextField label="Resumo das etapas" value={form.etapas} onChange={(value) => updateFormField('etapas', value)} placeholder="Ex: Prova, TAF, psicológico" />
                  </div>
                </div>
                )}
              </div>
            )}
            {modalTab === 'midia' && (
            <div className="rounded-xl p-4" style={{ background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule-2)' }}>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="pl-eyebrow">Mídia e arquivos</p>
                  <h4 className="mt-1 text-base font-semibold" style={{ color: 'var(--pl-ink)' }}>Capa e edital oficial</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.imagem_url && (
                    <button type="button" onClick={() => window.open(form.imagem_url, '_blank', 'noopener,noreferrer')} className="pl-btn pl-btn-ghost rounded-xl px-3 py-2 text-xs font-bold">
                      Abrir imagem
                    </button>
                  )}
                  {form.edital_url && (
                    <button type="button" onClick={() => window.open(form.edital_url, '_blank', 'noopener,noreferrer')} className="pl-btn pl-btn-ghost rounded-xl px-3 py-2 text-xs font-bold">
                      Abrir edital
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Imagem / capa */}
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg" style={{ border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)' }}>
                      {form.imagem_url ? (
                        <img src={form.imagem_url} alt={form.nome || 'Capa'} className="h-full w-full object-contain p-2" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${form.cor || '#1e3a5f'} 0%, #1A365D 100%)` }}>
                          <ImageIcon size={28} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50">
                        {isUploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        {isUploadingImage ? 'Enviando...' : 'Upload de imagem'}
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0])} />
                      </label>
                      <input value={form.imagem_url} onChange={(e) => updateFormField('imagem_url', e.target.value)} className="pl-input w-full rounded-lg text-sm outline-none" placeholder="URL final da imagem" />
                    </div>
                  </div>
                  {form.imagem_url && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button type="button" onClick={handleRemoveImage} className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: 'var(--pl-danger-soft)', border: '1px solid var(--pl-danger)', color: 'var(--pl-danger)' }}>Remover imagem</button>
                      {form.concurso && (
                        <button type="button" disabled={isSaving} onClick={() => handleApplyLogoToOrgao(form.concurso, form.imagem_url)} className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ background: 'var(--pl-accent-soft)', border: '1px solid var(--pl-accent)', color: 'var(--pl-accent)' }}>Aplicar a todos de {form.concurso}</button>
                      )}
                    </div>
                  )}
                </div>

                {/* Edital */}
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-200 bg-white px-3 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50">
                    {isUploadingEdital ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                    {isUploadingEdital ? 'Enviando edital...' : 'Upload de PDF'}
                    <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleEditalUpload(e.target.files?.[0])} />
                  </label>
                  <input value={form.edital_url} onChange={(e) => updateFormField('edital_url', e.target.value)} className="pl-input w-full rounded-lg text-sm outline-none" placeholder="URL final do edital PDF" />
                  {form.edital_url && (
                    <button type="button" onClick={handleRemoveEdital} className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: 'var(--pl-danger-soft)', border: '1px solid var(--pl-danger)', color: 'var(--pl-danger)' }}>Remover edital</button>
                  )}
                </div>
              </div>

              {/* Reutilizar logotipo - largura total */}
              {logoLibrary.length > 0 && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Reutilizar logotipo</p>
                  <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                    {logoLibrary.map((asset) => {
                      const selected = form.imagem_url === asset.url;
                      return (
                        <button key={asset.url} type="button" onClick={() => { updateFormField('imagem_url', asset.url); setLogoBatchUrl(asset.url); }} className={`flex items-center gap-3 rounded-lg border bg-white p-2 text-left transition-colors ${selected ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-200'}`}>
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-900/5">
                            <img src={asset.url} alt="" className="h-full w-full object-contain p-1" aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold text-slate-800">{asset.label}</span>
                            <span className="block truncate text-[11px] font-semibold text-slate-400">{asset.linked.length} vínculo(s) no catálogo</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            )}
            {modalTab === 'etapas' && (
              <div className="rounded-xl p-4" style={{ background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule-2)' }}>
                <div className="flex flex-col gap-1">
                  <p className="pl-eyebrow">Etapas do concurso</p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--pl-ink-2)' }}>Marque as etapas comuns ou adicione uma etapa específica do edital.</p>
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
                          active ? 'pl-btn pl-btn-primary' : 'pl-btn pl-btn-ghost'
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
                    className="pl-input rounded-lg px-4 py-3 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCustomEtapa}
                    className="pl-btn pl-btn-ghost inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-colors"
                    style={{ color: 'var(--pl-accent)' }}
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
                  <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Itens do TAF</p>
                        <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--pl-ink-2)' }}>Adicione as provas físicas que fazem parte do teste.</p>
                      </div>
                      <button type="button" onClick={addTafItem} className="pl-btn pl-btn-ghost rounded-xl px-3 py-2 text-xs font-bold" style={{ color: 'var(--pl-accent)' }}>
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
                            className="pl-input flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeTafItem(index)}
                            className="rounded-xl px-3 py-3 text-sm font-bold"
                            style={{ background: 'var(--pl-danger-soft)', border: '1px solid var(--pl-danger)', color: 'var(--pl-danger)' }}
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            )}
            {modalTab === 'dados' && (<>
              <div className="grid gap-4 md:grid-cols-[150px_1fr_1fr_180px]">
                <ColorField value={form.cor} onChange={(value) => updateFormField('cor', value)} />
                <DateField value={form.prova_data} onChange={(value) => updateFormField('prova_data', value)} />
                <SelectField label="Status do concurso" value={form.status_concurso} onChange={(value) => updateFormField('status_concurso', value)} options={STATUS_OPTIONS} />
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => updateFormField('is_public', !form.is_public)}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold ${
                      form.is_public ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {form.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                    {form.is_public ? 'Publicado' : 'Rascunho'}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-stretch">
                <div className="flex flex-col">
                  <label className="pl-eyebrow mb-2 block">Descrição curta</label>
                  <textarea
                    rows={5}
                    value={form.descricao}
                    onChange={(e) => updateFormField('descricao', e.target.value)}
                    className="pl-input pl-textarea w-full flex-1 rounded-lg text-sm outline-none"
                  />
                </div>

                <div className="rounded-xl p-4" style={{ background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule-2)' }}>
                  <p className="pl-eyebrow">Checklist editorial</p>
                  <div className="mt-4 space-y-3 text-sm font-semibold" style={{ color: 'var(--pl-ink-2)' }}>
                    {isVestForm ? (
                      <>
                        <ChecklistRow ok={Boolean(form.concurso)} label="Instituição definida" />
                        <ChecklistRow ok={form.scope !== 'estadual' || Boolean(form.uf)} label="UF (se estadual)" />
                        <ChecklistRow ok={Boolean(form.modality)} label="Modalidade definida" />
                        <ChecklistRow ok={Boolean(form.imagem_url)} label="Logo enviada" />
                        <ChecklistRow ok={Boolean(form.prova_data) || Boolean(form.registration_start)} label="Data ou inscrições" />
                        <ChecklistRow ok={form.disciplinas.some((subject) => subject.nome && subject.nome.trim())} label="Matérias cadastradas" />
                      </>
                    ) : (
                      <>
                        <ChecklistRow ok={Boolean(form.area)} label="Área definida" />
                        <ChecklistRow ok={Boolean(form.cargo)} label="Cargo identificado" />
                        <ChecklistRow ok={Boolean(form.prova_data)} label="Data da prova preenchida" />
                        <ChecklistRow ok={Boolean(form.imagem_url)} label="Imagem publicada" />
                        <ChecklistRow ok={Boolean(form.edital_url)} label="PDF do edital publicado" />
                        <ChecklistRow ok={form.disciplinas.some((subject) => subject.topicosTexto.trim())} label="Tópicos cadastrados" />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isVestForm && (
                <div className="rounded-xl p-4" style={{ background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule-2)' }}>
                  <label className="pl-eyebrow mb-2 block">Sobre a instituição</label>
                  <textarea
                    rows={4}
                    value={form.about_institution}
                    onChange={(e) => updateFormField('about_institution', e.target.value)}
                    placeholder="História / contexto da instituição — aparece na tela de detalhes do vestibular."
                    className="pl-input pl-textarea w-full rounded-lg text-sm outline-none"
                  />
                </div>
              )}

            </>)}
            {modalTab === 'conteudo' && (
              <div>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="pl-eyebrow">{isVestForm ? 'Matérias da prova' : 'Conteúdo programático'}</p>
                    <h4 className="mt-1 text-lg font-semibold" style={{ color: 'var(--pl-ink)' }}>{isVestForm ? 'Matérias e tópicos' : 'Disciplinas e tópicos'}</h4>
                  </div>

                  <button type="button" onClick={addSubject} className="pl-btn pl-btn-ghost inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold" style={{ color: 'var(--pl-accent)' }}>
                    <PlusCircle size={16} />
                    {isVestForm ? 'Nova matéria' : 'Nova disciplina'}
                  </button>
                </div>

                <div className="space-y-4">
                  {form.disciplinas.map((subject, index) => (
                    <div key={`subject-${index}`} className="pl-card rounded-xl p-4">
                      {(() => {
                        const matchedSubject = resolveSubjectCatalogEntry(subject.nome, subjectCatalog);
                        return (
                          <>
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold" style={{ color: 'var(--pl-ink)' }}>Disciplina {index + 1}</p>
                        <button type="button" onClick={() => removeSubject(index)} className="rounded-xl p-2 transition-colors" style={{ color: 'var(--pl-ink-3)' }} title="Remover disciplina">
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
                          <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--pl-ink-2)' }}>
                            {matchedSubject
                              ? `Padrão encontrado: ${matchedSubject.nome}`
                              : 'Sem correspondência no banco padrão. Se necessário, cadastre em Admin > Banco de disciplinas.'}
                          </p>
                        </div>
                        <ColorField compact value={subject.cor || '#1e3a5f'} onChange={(value) => updateSubjectField(index, 'cor', value)} />
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <label className="pl-eyebrow">Tópicos da disciplina</label>
                          <span className="text-[11px]" style={{ color: 'var(--pl-ink-3)' }}>
                            {subject.topicosTexto.split('\n').map((l) => l.trim()).filter(Boolean).length} tópico(s) · um por linha
                          </span>
                        </div>
                        <textarea
                          rows={10}
                          value={subject.topicosTexto}
                          onChange={(e) => updateSubjectField(index, 'topicosTexto', e.target.value)}
                          placeholder={`Um tópico por linha\nConceitos iniciais\nPoder de polícia\nAtos administrativos`}
                          className="pl-input pl-textarea w-full rounded-lg text-sm outline-none"
                        />
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>

              </div>
            )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2 pt-4" style={{ borderTop: '1px solid var(--pl-rule-2)' }}>
            <button type="button" onClick={() => { resetForm(); setIsContestModalOpen(false); }} className="pl-btn pl-btn-ghost rounded-lg px-5 py-2.5 text-sm font-semibold">
              {form.id ? 'Cancelar' : 'Fechar'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-70 ${form.is_public ? 'pl-btn pl-btn-primary' : 'pl-btn pl-btn-ghost'}`}
            >
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {isSaving ? 'Salvando...' : !form.id ? `Criar ${isVestForm ? 'vestibular' : 'concurso'}` : form.is_public ? `Salvar ${isVestForm ? 'vestibular' : 'concurso'}` : 'Salvar rascunho'}
            </button>
            {!form.is_public && (
              <button
                onClick={handleSaveAndPublish}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-70"
                style={{ background: 'var(--pl-success)' }}
                title="Salvar e tornar visível para os alunos"
              >
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
                Publicar
              </button>
            )}
          </div>
        </div>
          </div>
        </div>
        ) : null}
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

function LogosSection({
  uniqueLogos,
  orgaoOptions,
  selectedOrgaoLogoUrls,
  logoBatchUrl,
  setLogoBatchUrl,
  logoBatchOrgao,
  setLogoBatchOrgao,
  isSaving,
  onVincular,
  concursoCatalog,
}) {
  const logosByOrgao = React.useMemo(() => {
    const map = {};
    for (const t of concursoCatalog) {
      const orgao = String(t.concurso || '').trim();
      if (!orgao) continue;
      if (!map[orgao]) map[orgao] = { orgao, url: t.imagem_url || '', concursos: [] };
      map[orgao].concursos.push(t.nome || t.concurso || '');
      if (t.imagem_url && !map[orgao].url) map[orgao].url = t.imagem_url;
    }
    return Object.values(map).sort((a, b) => a.orgao.localeCompare(b.orgao, 'pt-BR'));
  }, [concursoCatalog]);

  const selectedLogo = uniqueLogos.find((l) => l.url === logoBatchUrl);

  return (
    <div className="space-y-6">
      {/* Grid de logos cadastradas */}
      <div className="pl-card rounded-xl p-5">
        <p className="pl-eyebrow">Imagens cadastradas</p>
        <h3 className="mt-1 mb-4 text-xl font-semibold" style={{ color: 'var(--pl-ink)' }}>Selecione uma logo para vincular</h3>

        {uniqueLogos.length === 0 ? (
          <p className="py-10 text-center text-sm font-semibold" style={{ color: 'var(--pl-ink-3)' }}>Nenhuma logo cadastrada ainda. Adicione uma imagem pelo formulário de edição de um concurso.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {uniqueLogos.map((logo) => (
              <button
                key={logo.url}
                type="button"
                onClick={() => setLogoBatchUrl(logo.url === logoBatchUrl ? '' : logo.url)}
                className="group flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-center transition-all"
                style={logoBatchUrl === logo.url
                  ? { borderColor: 'var(--pl-accent)', background: 'var(--pl-accent-soft)' }
                  : { borderColor: 'var(--pl-rule)', background: 'var(--pl-bg-soft)' }}
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
                  <img
                    src={logo.url}
                    alt={logo.label}
                    className="h-full w-full object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                <p className="line-clamp-2 text-[11px] font-semibold leading-tight" style={{ color: 'var(--pl-ink)' }}>{logo.label}</p>
                <p className="text-[10px]" style={{ color: 'var(--pl-ink-3)' }}>{logo.linked.length} concurso{logo.linked.length !== 1 ? 's' : ''}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Painel de vinculação */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">Vincular por órgão</p>
        <h3 className="mt-1 text-xl font-semibold" style={{ color: 'var(--pl-ink)' }}>Aplicar logo a todos os concursos de um órgão</h3>
        <p className="mt-1 mb-4 max-w-2xl text-sm font-semibold leading-relaxed" style={{ color: 'var(--pl-ink-2)' }}>
          Selecione uma logo acima, escolha o órgão e clique em Vincular. O sistema aplica a mesma URL a todos os concursos daquele órgão.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {/* Preview da logo selecionada */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed" style={{ borderColor: 'var(--pl-rule-2)', background: 'var(--pl-surface)' }}>
            {selectedLogo ? (
              <img src={selectedLogo.url} alt={selectedLogo.label} className="h-full w-full object-contain p-1" />
            ) : (
              <span className="text-[10px] font-semibold text-center leading-tight px-1" style={{ color: 'var(--pl-ink-3)' }}>Sem logo</span>
            )}
          </div>

          <div className="flex-1">
            <label className="pl-eyebrow mb-2 block">Órgão</label>
            <select
              value={logoBatchOrgao}
              onChange={(e) => setLogoBatchOrgao(e.target.value)}
              className="pl-input w-full rounded-lg px-4 py-3 text-sm outline-none"
            >
              <option value="">Selecionar órgão</option>
              {orgaoOptions.map((orgao) => (
                <option key={orgao} value={orgao}>{orgao}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onVincular}
            disabled={isSaving || !logoBatchUrl || !logoBatchOrgao}
            className="pl-btn pl-btn-primary inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Link2 size={16} />
            Vincular
          </button>
        </div>

        {logoBatchOrgao && selectedOrgaoLogoUrls.length > 1 && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Atenção: esse órgão já tem mais de uma logotipo diferente. Ao vincular, todas ficam com esta mesma URL.
          </p>
        )}
      </div>

      {/* Tabela: logos por órgão */}
      <div className="pl-card rounded-xl p-5">
        <p className="pl-eyebrow">Situação atual</p>
        <h3 className="mt-1 mb-4 text-xl font-semibold" style={{ color: 'var(--pl-ink)' }}>Órgãos e suas logos</h3>

        {logosByOrgao.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold" style={{ color: 'var(--pl-ink-3)' }}>Nenhum órgão cadastrado ainda.</p>
        ) : (
          <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--pl-rule)', divide: 'solid var(--pl-rule)' }}>
            {logosByOrgao.map((item) => (
              <div key={item.orgao} className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: '1px solid var(--pl-rule)' }}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl p-1" style={{ background: 'var(--pl-bg-soft)' }}>
                  {item.url ? (
                    <img src={item.url} alt={item.orgao} className="h-full w-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <span className="text-[9px] font-bold text-slate-400">SEM</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold" style={{ color: 'var(--pl-ink)' }}>{item.orgao}</p>
                  <p className="truncate text-xs" style={{ color: 'var(--pl-ink-3)' }}>{item.concursos.length} concurso{item.concursos.length !== 1 ? 's' : ''}: {item.concursos.slice(0, 3).join(', ')}{item.concursos.length > 3 ? '…' : ''}</p>
                </div>
                {item.url ? (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Logo ok</span>
                ) : (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Sem logo</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteContestModal({ template, isDeleting, error, onCancel, onConfirm }) {
  const isLocal = template?.storage !== 'supabase';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[1.75rem] shadow-2xl" style={{ background: 'var(--pl-surface)', borderColor: 'var(--pl-rule-2)', border: '1px solid var(--pl-rule-2)' }}>
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-6 text-white">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-200 ring-1 ring-red-300/30">
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
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-relaxed text-amber-900">
              Este concurso ainda veio do catálogo local. O app vai sincronizar esse item com o Supabase antes de remover.
            </div>
          ) : null}

          <div className="rounded-lg px-4 py-3" style={{ background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule-2)' }}>
            <p className="pl-eyebrow">Resumo</p>
            <div className="mt-2 grid gap-2 text-sm font-semibold sm:grid-cols-2" style={{ color: 'var(--pl-ink)' }}>
              <span>Área: {template?.area || 'Geral'}</span>
              <span>Banca: {template?.banca || 'A definir'}</span>
              <span>Disciplinas: {template?.disciplinas?.length || 0}</span>
              <span>Status: {template?.is_public ? 'Publicado' : 'Rascunho'}</span>
            </div>
          </div>

          {error ? (
            <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="pl-btn pl-btn-ghost inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-bold transition disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-700 disabled:opacity-70"
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
    <div className="pl-card rounded-xl p-5">
      <p className="pl-eyebrow">{title}</p>
      <p className="pl-num mt-3 text-3xl">{value}</p>
      <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--pl-ink-2)' }}>{text}</p>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder = '', icon: Icon = null, listId = '' }) {
  return (
    <div>
      <label className="pl-eyebrow mb-2 block">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--pl-ink-3)' }} />}
        <input
          value={value}
          placeholder={placeholder}
          list={listId || undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`pl-input w-full rounded-lg py-2.5 text-sm outline-none ${Icon ? 'pl-11 pr-4' : 'px-3'}`}
        />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, icon: Icon = null }) {
  return (
    <div>
      <label className="pl-eyebrow mb-2 block">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--pl-ink-3)' }} />}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`pl-input w-full rounded-lg py-2.5 text-sm outline-none ${Icon ? 'pl-11 pr-4' : 'px-3'}`}
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

// Escolaridade multi-seleção: marca um ou mais níveis; grava string legível.
function EscolaridadeField({ label = 'Escolaridade', value, onChange }) {
  const selectedKeys = parseEscolaridadeKeys(value);
  const toggle = (key) => {
    const next = selectedKeys.includes(key)
      ? selectedKeys.filter((item) => item !== key)
      : [...selectedKeys, key];
    onChange(buildEscolaridadeLabel(next));
  };
  return (
    <div>
      <label className="pl-eyebrow mb-2 block">{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ESCOLARIDADE_LEVELS.map((level) => {
          const active = selectedKeys.includes(level.key);
          return (
            <button
              key={level.key}
              type="button"
              onClick={() => toggle(level.key)}
              aria-pressed={active}
              className={active ? 'pl-tag pl-tag-accent' : 'pl-tag'}
              style={{ cursor: 'pointer', border: active ? undefined : '1px solid var(--pl-rule-2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              {active ? <BadgeCheck size={13} /> : null}
              {level.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ColorField({ value, onChange, compact = false }) {
  return (
    <div>
      <label className="pl-eyebrow mb-2 block">
        {compact ? 'Cor da disciplina' : 'Cor'}
      </label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg p-2 h-12"
        style={{ border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)' }}
      />
    </div>
  );
}

function DateField({ value, onChange }) {
  return (
    <div>
      <label className="pl-eyebrow mb-2 block">Data da prova</label>
      <div className="relative">
        <CalendarDays size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--pl-ink-3)' }} />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-input w-full rounded-lg py-2.5 pl-11 pr-4 text-sm outline-none"
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
      {option?.label || 'Previsto'}
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
