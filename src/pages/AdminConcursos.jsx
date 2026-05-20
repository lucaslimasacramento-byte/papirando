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
import { supabase } from '../lib/supabase';
import AdminPageHeader from '../components/AdminPageHeader';
import { useToast } from '../lib/toast';
import { CONTEST_STATUS_OPTIONS, normalizeContestStatus } from '../lib/contestGrouping';

const DRAFT_STORAGE_KEY = 'papirando_admin_concurso_draft';
const EDIT_TEMPLATE_STORAGE_KEY = 'papirando_admin_edit_contest_id';

const STATUS_OPTIONS = CONTEST_STATUS_OPTIONS;

const ESCOLARIDADE_OPTIONS = [
  { value: '', label: 'Selecione' },
  { value: 'Nível médio', label: 'Nível médio' },
  { value: 'Nível superior', label: 'Nível superior' },
];

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
  cor: '#1d4ed8',
  descricao: '',
  is_public: true,
  status_concurso: 'edital_publicado',
  prova_data: '',
  imagem_url: '',
  edital_url: '',
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
    .filter((item) => item.nome || item.cargo);
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
    cor: template.cor || '#1d4ed8',
    descricao: template.descricao || '',
    is_public: template.is_public !== false,
    status_concurso: normalizeImportedStatus(template.status_concurso || 'edital_publicado'),
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

  const clearContestDraft = () => {
    resetForm();
    setContestFormImportStatus('');
    setContestFormOptions([]);
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
      cor: form.cor || '#1d4ed8',
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
    } catch (error) {
      toastError(error.message || 'Não foi possível salvar o concurso.', 'Erro ao salvar');
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Admin ativo</p>
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

      <div className="rounded-[1.6rem] border border-ink-200 bg-white p-2 shadow-sm">
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
                    ? 'bg-[#1e40af] text-white shadow-sm'
                    : 'text-ink-500 hover:bg-ink-50 hover:text-[#1e40af]'
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
        <div className="rounded-[1.6rem] border border-ink-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Biblioteca de concursos</p>
              <h3 className="mt-1 text-xl font-semibold text-ink-900">Buscar e editar cadastro existente</h3>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(240px,360px)_190px_auto]">
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Busca</label>
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    value={contestQuery}
                    onChange={(event) => setContestQuery(event.target.value)}
                    placeholder="Nome, cargo, órgão ou banca"
                    className="w-full rounded-2xl border border-ink-200 bg-ink-50/70 py-3 pl-11 pr-4 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
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
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1e40af] px-4 text-sm font-bold text-white transition-colors hover:bg-[#142a49]"
                >
                  <Plus size={16} />
                  Novo concurso
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 max-h-[360px] overflow-y-auto rounded-[1.3rem] border border-ink-200">
            {filteredContestCatalog.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm font-semibold text-ink-500">
                Nenhum concurso encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="divide-y divide-ink-100">
                {contestSections.map(([area, templates]) => (
                  <div key={area}>
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-ink-50/95 px-4 py-2 backdrop-blur">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">{area}</p>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-ink-500 shadow-sm">
                        {templates.length}
                      </span>
                    </div>

                    <div className="divide-y divide-ink-100">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className={`grid gap-3 px-4 py-3 transition-colors lg:grid-cols-[minmax(0,1.7fr)_minmax(160px,0.8fr)_150px_110px_44px] lg:items-center ${
                            selectedTemplateId === template.id ? 'bg-brand-50' : 'bg-white hover:bg-ink-50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleEditTemplate(template)}
                            className="min-w-0 text-left"
                          >
                            <p className="truncate text-sm font-bold text-ink-900">{template.nome}</p>
                            <p className="mt-1 truncate text-xs font-semibold text-ink-500">{template.concurso}</p>
                          </button>
                          <p className="truncate text-sm font-semibold text-ink-600">{template.cargo || 'Cargo a definir'}</p>
                          <p className="truncate text-sm font-semibold text-ink-500">{template.banca || 'A definir'}</p>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${template.is_public ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {template.is_public ? 'Publicado' : 'Rascunho'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSelected(template)}
                            className="h-10 w-10 rounded-xl text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
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

        <div className="rounded-[1.8rem] border border-ink-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Editor do concurso</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink-900">
                {form.id ? 'Editando concurso' : 'Novo concurso'}
              </h3>
              <p className="mt-2 text-sm font-semibold text-ink-500">
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
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-200 transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {isSaving ? 'Salvando...' : form.id ? 'Salvar concurso' : 'Criar concurso'}
              </button>
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => onDuplicateTemplate?.(selectedTemplate)}
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-bold text-brand-700"
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

          <div className="mb-6 rounded-[1.6rem] border border-brand-100 bg-brand-50/60 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-500">Preencher com IA</p>
                <h4 className="mt-1 text-lg font-semibold text-ink-900">Colar formulário analisado do edital</h4>
                <p className="mt-1 text-sm font-semibold text-ink-500">
                  Use o formulário estruturado que veio da análise do edital. A IA organiza os campos, disciplinas e tópicos no rascunho.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadContestPrompt}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-white px-4 py-3 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50"
                >
                  <Download size={16} />
                  Baixar prompt
                </button>
                <button
                  type="button"
                  onClick={clearContestDraft}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-white px-4 py-3 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50"
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
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
                >
                  {isParsingContestForm ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isParsingContestForm
                    ? (contestFormImportStatus.startsWith('Extraindo') ? 'Extraindo PDF...' : 'Analisando...')
                    : 'Preencher rascunho'}
                </button>
              </div>
            </div>

            {/* Mode tabs */}
            <div className="mt-4 flex gap-1 rounded-2xl bg-brand-50 p-1">
              <button
                type="button"
                onClick={() => { setAiInputMode('text'); setContestFormImportStatus(''); setContestFormOptions([]); }}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  aiInputMode === 'text'
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-brand-400 hover:text-brand-600'
                }`}
              >
                Colar texto
              </button>
              <button
                type="button"
                onClick={() => { setAiInputMode('pdf'); setContestFormImportStatus(''); setContestFormOptions([]); }}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  aiInputMode === 'pdf'
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-brand-400 hover:text-brand-600'
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
                className="mt-2 w-full rounded-[1.4rem] border border-brand-100 bg-white px-4 py-4 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              />
            ) : (
              <div className="mt-2">
                <label
                  htmlFor="ai-pdf-upload"
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.4rem] border-2 border-dashed px-6 py-8 transition-colors ${
                    aiPdfFile
                      ? 'border-brand-300 bg-brand-50'
                      : 'border-brand-200 bg-white hover:border-brand-400 hover:bg-brand-50'
                  }`}
                >
                  {aiPdfFile ? (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
                        <span className="text-lg">📄</span>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-brand-700">{aiPdfFile.name}</p>
                        <p className="mt-0.5 text-xs text-brand-500">
                          {(aiPdfFile.size / 1024 / 1024).toFixed(1)} MB
                          {' · pronto para análise'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setAiPdfFile(null); }}
                        className="text-xs font-semibold text-brand-400 hover:text-brand-600"
                      >
                        Trocar arquivo
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
                        <span className="text-lg">📎</span>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-brand-700">Clique para selecionar o PDF do edital</p>
                        <p className="mt-0.5 text-xs text-brand-500">Máximo 18 MB · somente PDF</p>
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
              <p className="mt-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-brand-700">
                {contestFormImportStatus}
              </p>
            )}

            {contestFormOptions.length > 1 && (
              <div className="mt-4 rounded-[1.4rem] border border-brand-100 bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-500">
                  Opções separadas encontradas
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
                  <p className="text-sm font-semibold text-brand-800">
                    Salve tudo de uma vez. Concursos diferentes ficam em cards separados; cargos do mesmo concurso ficam dentro do card correto.
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveAllContestOptions}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-70"
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
                        className="rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50"
                      >
                        <span className="line-clamp-2 text-sm font-bold text-ink-900">
                          {option.nome || option.cargo || `Opção ${optionIndex + 1}`}
                        </span>
                        <span className="mt-2 block text-xs font-semibold text-ink-500">
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
            <div className="rounded-[1.5rem] border border-ink-200 bg-ink-50/70 p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Mídia e arquivos</p>
                  <h4 className="mt-1 text-base font-semibold text-ink-900">Capa e edital oficial</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.imagem_url && (
                    <button type="button" onClick={() => window.open(form.imagem_url, '_blank', 'noopener,noreferrer')} className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-bold text-ink-600">
                      Abrir imagem
                    </button>
                  )}
                  {form.edital_url && (
                    <button type="button" onClick={() => window.open(form.edital_url, '_blank', 'noopener,noreferrer')} className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-bold text-ink-600">
                      Abrir edital
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-[1.2rem] border border-ink-200 bg-white">
                {form.imagem_url ? (
                  <img src={form.imagem_url} alt={form.nome || 'Curso'} className="h-36 w-full object-cover" />
                ) : (
                  <div
                    className="flex h-36 w-full items-center justify-center text-white"
                    style={{ background: `linear-gradient(135deg, ${form.cor || '#1d4ed8'} 0%, #1e40af 100%)` }}
                  >
                    <ImageIcon size={36} />
                  </div>
                )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-200 bg-white px-4 py-3 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50">
                      {isUploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {isUploadingImage ? 'Enviando imagem...' : 'Upload de imagem'}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0])} />
                    </label>
                    <input
                      value={form.imagem_url}
                      onChange={(e) => updateFormField('imagem_url', e.target.value)}
                      className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
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
                      className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
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
              <div className="rounded-[1.5rem] border border-ink-200 bg-white p-4">
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Dados principais</p>
                  <h4 className="mt-1 text-base font-semibold text-ink-900">Identificação e vitrine</h4>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <TextField label="Nome do concurso" value={form.nome} onChange={(value) => updateFormField('nome', value)} />
                    <TextField label="Plano interno" value={form.plano} onChange={(value) => updateFormField('plano', value)} />
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
                    <SelectField label="Escolaridade" value={form.escolaridade} onChange={(value) => updateFormField('escolaridade', value)} options={ESCOLARIDADE_OPTIONS} icon={GraduationCap} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <TextField label="Vagas" value={form.vagas} onChange={(value) => updateFormField('vagas', value)} placeholder="Ex: 500 vagas + CR" />
                    <TextField label="Lotação" value={form.lotacao} onChange={(value) => updateFormField('lotacao', value)} placeholder="Ex: Alagoas" />
                    <TextField label="Resumo das etapas" value={form.etapas} onChange={(value) => updateFormField('etapas', value)} placeholder="Ex: Prova, TAF, psicológico" />
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-ink-200 bg-ink-50/70 p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Etapas do concurso</p>
                  <p className="text-xs font-semibold text-ink-500">Marque as etapas comuns ou adicione uma etapa específica do edital.</p>
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
                          active ? 'bg-brand-600 text-white' : 'border border-ink-200 bg-white text-ink-600'
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
                    className="rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
                  />
                  <button
                    type="button"
                    onClick={addCustomEtapa}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-white px-4 py-3 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50"
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
                          className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ink-700"
                          title="Remover etapa"
                        >
                          {tag}
                          <X size={14} />
                        </button>
                      ))}
                  </div>
                )}

                {form.etapas_tags.includes('taf') && (
                  <div className="mt-5 rounded-[1.2rem] border border-brand-100 bg-brand-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink-900">Itens do TAF</p>
                        <p className="mt-1 text-xs font-semibold text-ink-500">Adicione as provas físicas que fazem parte do teste.</p>
                      </div>
                      <button type="button" onClick={addTafItem} className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-700">
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
                            className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 outline-none focus:border-brand-500"
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
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Descrição curta</label>
                  <textarea
                    rows={4}
                    value={form.descricao}
                    onChange={(e) => updateFormField('descricao', e.target.value)}
                    className="w-full rounded-[1.5rem] border border-ink-200 bg-ink-50/70 px-4 py-4 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
                  />
                </div>

                <div className="rounded-[1.5rem] border border-ink-200 bg-ink-50/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Checklist editorial</p>
                  <div className="mt-4 space-y-3 text-sm font-semibold text-ink-600">
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
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Conteúdo programático</p>
                    <h4 className="mt-1 text-lg font-semibold text-ink-900">Disciplinas e tópicos</h4>
                  </div>

                  <button type="button" onClick={addSubject} className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700">
                    <PlusCircle size={16} />
                    Nova disciplina
                  </button>
                </div>

                <div className="space-y-4">
                  {form.disciplinas.map((subject, index) => (
                    <div key={`subject-${index}`} className="rounded-[1.6rem] border border-ink-200 bg-white p-4">
                      {(() => {
                        const matchedSubject = resolveSubjectCatalogEntry(subject.nome, subjectCatalog);
                        return (
                          <>
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-ink-900">Disciplina {index + 1}</p>
                        <button type="button" onClick={() => removeSubject(index)} className="rounded-xl p-2 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-500" title="Remover disciplina">
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
                          <p className="mt-2 text-xs font-semibold text-ink-500">
                            {matchedSubject
                              ? `Padrão encontrado: ${matchedSubject.nome}`
                              : 'Sem correspondência no banco padrão. Se necessário, cadastre em Admin > Banco de disciplinas.'}
                          </p>
                        </div>
                        <ColorField compact value={subject.cor || '#1d4ed8'} onChange={(value) => updateSubjectField(index, 'cor', value)} />
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Tópicos da disciplina</label>
                        <textarea
                          rows={6}
                          value={subject.topicosTexto}
                          onChange={(e) => updateSubjectField(index, 'topicosTexto', e.target.value)}
                          placeholder={`Um tópico por linha\nConceitos iniciais\nPoder de polícia\nAtos administrativos`}
                          className="w-full rounded-[1.4rem] border border-ink-200 bg-ink-50/70 px-4 py-4 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
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

          <div className="mt-6 border-t border-ink-200 pt-4">
            <div className="flex flex-wrap justify-end gap-3">
              {form.id && (
                <button type="button" onClick={resetForm} className="rounded-xl border border-ink-200 bg-white px-5 py-3 text-sm font-bold text-ink-600">
                  Cancelar edição
                </button>
              )}
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => onDuplicateTemplate?.(selectedTemplate)}
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-3 text-sm font-bold text-brand-700"
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
              <button onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-70">
                <Plus size={16} />
                {isSaving ? 'Salvando...' : form.id ? 'Atualizar concurso' : 'Criar concurso'}
              </button>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="rounded-[2rem] border border-ink-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Banco de questões</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink-900">Cadastrar nova questão</h3>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Banca" value={questionForm.banca} onChange={(value) => setQuestionForm((prev) => ({ ...prev, banca: value }))} />
                <TextField label="Disciplina" value={questionForm.disciplina} onChange={(value) => setQuestionForm((prev) => ({ ...prev, disciplina: value }))} />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Enunciado</label>
                <textarea
                  rows={6}
                  value={questionForm.enunciado}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, enunciado: e.target.value }))}
                  className="w-full rounded-[1.5rem] border border-ink-200 bg-ink-50/70 px-4 py-4 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
                />
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Alternativas</p>
                {QUESTION_LABELS.map((label, index) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-sm font-semibold text-brand-700">
                      {label}
                    </span>
                    <input
                      value={questionForm.alternativas[index]}
                      onChange={(e) => updateQuestionAlternative(index, e.target.value)}
                      className="flex-1 rounded-2xl border border-ink-200 bg-ink-50/70 px-4 py-3 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
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
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Comentário</label>
                <textarea
                  rows={5}
                  value={questionForm.comentario}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, comentario: e.target.value }))}
                  className="w-full rounded-[1.5rem] border border-ink-200 bg-ink-50/70 px-4 py-4 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSaveQuestion}
                disabled={questionsSaving}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-70"
              >
                <Plus size={16} />
                {questionsSaving ? 'Salvando...' : 'Salvar questão'}
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-ink-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Listagem</p>
                <h3 className="mt-2 text-2xl font-semibold text-ink-900">Questões cadastradas</h3>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                {visibleQuestions.length} ativas
              </span>
            </div>

            {questionsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-brand-500" />
              </div>
            ) : visibleQuestions.length === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-ink-200 bg-ink-50/70 px-6 py-12 text-center">
                <p className="text-sm font-semibold text-ink-500">Nenhuma questão cadastrada ainda.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[1.6rem] border border-ink-200">
                <div className="grid grid-cols-[120px_140px_minmax(0,1fr)_100px_100px] gap-3 border-b border-ink-200 bg-ink-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">
                  <span>Banca</span>
                  <span>Disciplina</span>
                  <span>Enunciado</span>
                  <span>Nível</span>
                  <span>Ações</span>
                </div>

                <div className="divide-y divide-ink-200">
                  {visibleQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="grid grid-cols-[120px_140px_minmax(0,1fr)_100px_100px] gap-3 px-4 py-4 text-sm font-semibold text-ink-700"
                    >
                      <span>{question.banca || '-'}</span>
                      <span>{question.disciplina || '-'}</span>
                      <span className="text-ink-600">{truncateQuestionText(question.enunciado, 80)}</span>
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-ink-950 via-ink-900 to-brand-950 px-6 py-6 text-white">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-200 ring-1 ring-red-300/30">
              <Trash2 size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-200">Excluir concurso</p>
              <h3 className="mt-2 text-xl font-bold leading-tight">{template?.nome || 'Concurso selecionado'}</h3>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-ink-300">
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

          <div className="rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">Resumo</p>
            <div className="mt-2 grid gap-2 text-sm font-semibold text-ink-700 sm:grid-cols-2">
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
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-ink-200 bg-white px-5 text-sm font-bold text-ink-700 transition hover:bg-ink-50 disabled:opacity-60"
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
    <div className="rounded-[1.6rem] border border-ink-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-ink-900">{value}</p>
      <p className="mt-2 text-sm font-semibold text-ink-500">{text}</p>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder = '', icon: Icon = null, listId = '' }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />}
        <input
          value={value}
          placeholder={placeholder}
          list={listId || undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border border-ink-200 bg-ink-50/70 py-3 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-50 ${Icon ? 'pl-11 pr-4' : 'px-4'}`}
        />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, icon: Icon = null }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border border-ink-200 bg-ink-50/70 py-3 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-50 ${Icon ? 'pl-11 pr-4' : 'px-4'}`}
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
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">
        {compact ? 'Cor da disciplina' : 'Cor'}
      </label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-2xl border border-ink-200 bg-white p-2 ${compact ? 'h-12' : 'h-12'}`}
      />
    </div>
  );
}

function DateField({ value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Data da prova</label>
      <div className="relative">
        <CalendarDays size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-ink-200 bg-ink-50/70 py-3 pl-11 pr-4 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
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
    <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
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
        isSupabase ? 'bg-brand-100 text-brand-700' : 'bg-amber-100 text-amber-700'
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
