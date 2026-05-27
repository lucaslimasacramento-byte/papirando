import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT_DIR = process.cwd();
const ENV_PATH = resolve(ROOT_DIR, '.env');

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((acc, rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) return acc;

      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) return acc;

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

      if (key && !(key in process.env)) {
        acc[key] = value;
      }

      return acc;
    }, {});
}

const envFromFile = loadEnvFile(ENV_PATH);
const env = { ...envFromFile, ...process.env };

const PORT = Number(env.AI_SERVER_PORT || 8787);
const AI_PROVIDER = String(env.AI_PROVIDER || 'ollama').toLowerCase();
const OLLAMA_BASE_URL = env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = env.OLLAMA_MODEL || 'llama3.1';
const OPENAI_API_KEY = env.OPENAI_API_KEY;
const OPENAI_MODEL = env.OPENAI_MODEL || 'gpt-4.1-mini';
const GOOGLE_API_KEY = env.GOOGLE_API_KEY;
const GOOGLE_MODEL = env.GOOGLE_MODEL || 'gemini-1.5-pro';
const AI_FALLBACK_PROVIDER = String(env.AI_FALLBACK_PROVIDER || 'ollama').toLowerCase();
const AI_SERVER_TOKEN = String(env.AI_SERVER_TOKEN || '').trim();
const AI_ALLOWED_ORIGINS = String(
  env.AI_ALLOWED_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const GEMINI_MODEL_CANDIDATES = [
  GOOGLE_MODEL,
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest',
  'gemini-1.5-pro',
].filter(Boolean);
const OLLAMA_MODEL_CANDIDATES = [
  OLLAMA_MODEL,
  'qwen3:4b',
  'qwen2.5:7b',
  'llama3.1:8b',
  'llama3.1',
  'mistral',
].filter(Boolean);

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['banca', 'exam_name', 'organization', 'exam_type', 'dates', 'contests'],
  properties: {
    banca: { type: 'string' },
    exam_name: { type: 'string' },
    organization: { type: 'string' },
    exam_type: { type: 'string' },
    dates: {
      type: 'object',
      additionalProperties: false,
      required: ['publication_date', 'exam_date', 'registration_period'],
      properties: {
        publication_date: { type: 'string' },
        exam_date: { type: 'string' },
        registration_period: { type: 'string' },
      },
    },
    contests: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'title',
          'role_name',
          'institution',
          'exam_date',
          'publication_date',
          'registration_period',
          'subjects',
        ],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          role_name: { type: 'string' },
          institution: { type: 'string' },
          exam_date: { type: 'string' },
          publication_date: { type: 'string' },
          registration_period: { type: 'string' },
          subjects: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'topics'],
              properties: {
                name: { type: 'string' },
                topics: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
};

const ESSAY_ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['overallScore', 'criteria', 'summary', 'strengths', 'improvements', 'grammarFeedback'],
  properties: {
    overallScore: { type: 'number' },
    criteria: {
      type: 'object',
      additionalProperties: false,
      required: ['gramatica', 'coesao', 'tema', 'estrutura'],
      properties: {
        gramatica: {
          type: 'object',
          additionalProperties: false,
          required: ['score', 'maxScore', 'note'],
          properties: {
            score: { type: 'number' },
            maxScore: { type: 'number' },
            note: { type: 'string' },
          },
        },
        coesao: {
          type: 'object',
          additionalProperties: false,
          required: ['score', 'maxScore', 'note'],
          properties: {
            score: { type: 'number' },
            maxScore: { type: 'number' },
            note: { type: 'string' },
          },
        },
        tema: {
          type: 'object',
          additionalProperties: false,
          required: ['score', 'maxScore', 'note'],
          properties: {
            score: { type: 'number' },
            maxScore: { type: 'number' },
            note: { type: 'string' },
          },
        },
        estrutura: {
          type: 'object',
          additionalProperties: false,
          required: ['score', 'maxScore', 'note'],
          properties: {
            score: { type: 'number' },
            maxScore: { type: 'number' },
            note: { type: 'string' },
          },
        },
      },
    },
    summary: { type: 'string' },
    strengths: {
      type: 'array',
      items: { type: 'string' },
    },
    improvements: {
      type: 'array',
      items: { type: 'string' },
    },
    grammarFeedback: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['excerpt', 'replacement', 'reason'],
        properties: {
          excerpt: { type: 'string' },
          replacement: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
  },
};

const QUESTION_EXPLANATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isCorrect', 'answer', 'explanation', 'keyConcepts', 'studyTip'],
  properties: {
    isCorrect: { type: 'boolean' },
    answer: { type: 'string' },
    explanation: { type: 'string' },
    keyConcepts: {
      type: 'array',
      items: { type: 'string' },
    },
    studyTip: { type: 'string' },
  },
};

const SYSTEM_PROMPT = `You are an expert at reading Brazilian public exam notices ("editais") from PDF files.

The user will provide the edital text extracted from a PDF. Your job is to analyze the document content and extract the main contest information with high precision.

You must behave as a structured edital parser.

OBJECTIVE:
Identify:
1. Exam board / organizing institution ("banca")
2. Exam name
3. Institution offering the exam
4. Exam type
5. Publication date
6. Registration period
7. Exam date(s)
8. Subjects ("materias")
9. Exam phases / stages
10. Positions / cargos

IMPORTANT RULES:
- Do not guess.
- Only extract information explicitly stated in the edital text.
- If the information is missing, return "Not found".
- Preserve the original Portuguese wording whenever possible.
- If subjects are divided into sections such as "Conhecimentos Basicos", "Conhecimentos Especificos", "Conhecimentos Gerais", preserve that structure.
- If there are multiple cargos with different subjects, separate them clearly by cargo.
- Never invent dates, subjects, banca, or cargo names.
- Prefer exact extraction over paraphrasing.

HOW TO SEARCH:
Look for:
- "executado por"
- "organizado por"
- "banca"
- "concurso publico para"
- "edital n"
- "cronograma"
- "anexo I"
- "conteudo programatico"
- "das provas"
- "conhecimentos basicos"
- "conhecimentos especificos"
- "cargos"
- "etapas"
- "fases"
- "inscricoes"
- "data da prova"

OUTPUT FORMAT:
Return only valid JSON in this structure:
{
  "banca": "",
  "exam_name": "",
  "organization": "",
  "exam_type": "",
  "dates": {
    "publication_date": "",
    "registration_period": "",
    "exam_date": [],
    "other_dates": []
  },
  "positions": [
    {
      "name": "",
      "subjects": {
        "basic": [],
        "specific": [],
        "general": [],
        "other": []
      }
    }
  ],
  "subjects_global": {
    "basic": [],
    "specific": [],
    "general": [],
    "other": []
  },
  "phases": [],
  "observations": []
}`;

const ESSAY_ANALYSIS_PROMPT = `Voce e um corretor de redacoes para concursos publicos brasileiros.

O usuario vai enviar:
- banca
- tema
- texto da redacao

Sua resposta deve seguir estas regras:
- Avalie somente o texto enviado.
- Nao invente linhas ou trechos que nao existam.
- Seja objetivo e util.
- Distribua a nota final de 0 a 10.
- Distribua cada criterio entre 0 e 2.5: gramatica, coesao, tema e estrutura.
- Em "grammarFeedback", aponte no maximo 4 ajustes concretos com trecho, sugestao e motivo.
- Em "strengths" e "improvements", traga frases curtas e acionaveis.
- Responda apenas com JSON valido no schema solicitado.`;

const ESSAY_TRANSCRIPTION_PROMPT = `Transcreva a redacao da imagem em portugues do Brasil.

Regras:
- Retorne somente o texto transcrito.
- Preserve paragrafos com duas quebras de linha.
- Nao explique nada.
- Se algo estiver ilegivel, use [ilegivel].
- Nao invente palavras que nao aparecam na imagem.`;

const QUESTION_EXPLANATION_PROMPT = `Voce e um professor especialista em concursos publicos brasileiros.

Explique uma questao objetiva de forma pedagogica, curta e acionavel.

Regras:
- Responda em portugues do Brasil.
- Nao invente lei, artigo, jurisprudencia ou dado que nao esteja no enunciado.
- Se houver gabarito, diga por que ele e o melhor.
- Se houver resposta do aluno, compare com o gabarito.
- Em "keyConcepts", liste de 2 a 5 conceitos para revisar.
- Em "studyTip", traga uma acao concreta de revisao.
- Responda apenas com JSON valido no schema solicitado.`;

function resolveCorsOrigin(req) {
  const origin = String(req.headers.origin || '').trim().replace(/\/+$/, '');
  if (!origin) return AI_ALLOWED_ORIGINS[0] || 'http://127.0.0.1:5173';
  return AI_ALLOWED_ORIGINS.includes(origin) ? origin : '';
}

function jsonResponse(req, res, statusCode, payload) {
  const corsOrigin = resolveCorsOrigin(req);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...(corsOrigin ? { 'Access-Control-Allow-Origin': corsOrigin } : {}),
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-AI-Server-Token',
  });
  res.end(JSON.stringify(payload));
}

function isAuthorizedRequest(req) {
  if (!AI_SERVER_TOKEN) return true;
  const authHeader = String(req.headers.authorization || '').trim();
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const explicitToken = String(req.headers['x-ai-server-token'] || '').trim();
  return bearerToken === AI_SERVER_TOKEN || explicitToken === AI_SERVER_TOKEN;
}

function sanitizeValue(value, fallback = 'Nao encontrado') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function buildContestId(value, index) {
  return sanitizeValue(value, `opcao-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

function flattenSubjectGroups(groups = {}) {
  return ['basic', 'specific', 'general', 'other'].flatMap((key) =>
    Array.isArray(groups?.[key]) ? groups[key].map((item) => String(item || '').trim()).filter(Boolean) : []
  );
}

function normalizeParserOutput(rawAnalysis) {
  if (Array.isArray(rawAnalysis?.contests)) {
    return rawAnalysis;
  }

  const positions = Array.isArray(rawAnalysis?.positions) ? rawAnalysis.positions : [];
  const examDates = Array.isArray(rawAnalysis?.dates?.exam_date)
    ? rawAnalysis.dates.exam_date.filter(Boolean)
    : [];

  const positionContests = positions
    .map((position, index) => {
      const subjects = [...new Set(flattenSubjectGroups(position?.subjects || {}))];

      return {
        id: buildContestId(position?.name, index),
        title: sanitizeValue(position?.name),
        role_name: sanitizeValue(position?.name),
        institution: sanitizeValue(rawAnalysis?.organization),
        exam_date: examDates[0] || 'Nao encontrado',
        publication_date: sanitizeValue(rawAnalysis?.dates?.publication_date),
        registration_period: sanitizeValue(rawAnalysis?.dates?.registration_period),
        subjects: subjects.map((subject) => ({
          name: subject,
          topics: [],
        })),
      };
    })
    .filter((contest) => contest.subjects.length > 0);

  const globalSubjects = [...new Set(flattenSubjectGroups(rawAnalysis?.subjects_global || {}))];

  const contests =
    positionContests.length > 0
      ? positionContests
      : [
          {
            id: 'edital-completo',
            title: sanitizeValue(rawAnalysis?.exam_name, 'Edital completo'),
            role_name: sanitizeValue(rawAnalysis?.exam_name, 'Edital completo'),
            institution: sanitizeValue(rawAnalysis?.organization),
            exam_date: examDates[0] || 'Nao encontrado',
            publication_date: sanitizeValue(rawAnalysis?.dates?.publication_date),
            registration_period: sanitizeValue(rawAnalysis?.dates?.registration_period),
            subjects: globalSubjects.map((subject) => ({
              name: subject,
              topics: [],
            })),
          },
        ];

  return {
    banca: rawAnalysis?.banca,
    exam_name: rawAnalysis?.exam_name,
    organization: rawAnalysis?.organization,
    exam_type: rawAnalysis?.exam_type,
    dates: {
      publication_date: rawAnalysis?.dates?.publication_date,
      exam_date: examDates[0] || 'Nao encontrado',
      registration_period: rawAnalysis?.dates?.registration_period,
    },
    contests,
  };
}

function uniqueList(items) {
  return [...new Set((items || []).map((item) => String(item || '').trim()).filter(Boolean))];
}

function hasUsefulSubjects(analysis) {
  return Array.isArray(analysis?.contests)
    ? analysis.contests.some(
        (contest) =>
          Array.isArray(contest?.subjects) &&
          contest.subjects.some((subject) => String(subject?.name || '').trim())
      )
    : false;
}

function extractExamDate(text) {
  const cronogramaMatch = text.match(/Aplica[cç][aã]o\s+das\s+provas\s+objetivas\s+e\s+da\s+prova\s+discursiva\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (cronogramaMatch) return cronogramaMatch[1];

  const genericMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  return genericMatch ? genericMatch[1] : 'Nao encontrado';
}

function extractRegistrationPeriod(text) {
  const match = text.match(/Per[ií]odo\s+de\s+solicita[cç][aã]o\s+de\s+inscri[cç][oõ]es\s+(\d{1,2}\/\d{1,2}\/\d{4}\s+a\s+\d{1,2}\/\d{1,2}\/\d{4})/i);
  return match ? match[1] : 'Nao encontrado';
}

function extractPublicationDate(text) {
  const match = text.match(/EDITAL\s+N[º°]\s*1\s*[–-]\s*PMAL,\s*DE\s*(\d{1,2}\s+DE\s+[A-ZÇÃÕÁÉÍÓÚa-zçãõáéíóú]+\s+DE\s+\d{4})/i);
  return match ? match[1] : 'Nao encontrado';
}

function extractOrganization(text) {
  const match = text.match(/POL[ÍI]CIA\s+MILITAR\s+DO\s+ESTADO\s+DE\s+ALAGOAS\s*\(PMAL\)/i);
  return match ? 'Polícia Militar do Estado de Alagoas (PMAL)' : 'Nao encontrado';
}

function extractBanca(text) {
  const match = text.match(/executado\s+pelo\s+([^.;\n]+Cebraspe[^.;\n]*)/i);
  if (match) return match[1].trim();
  if (/Cebraspe/i.test(text)) return 'Cebraspe';
  return 'A definir';
}

function sliceBetween(text, startPattern, endPattern) {
  const startMatch = text.match(startPattern);
  if (!startMatch || startMatch.index == null) return '';

  const startIndex = startMatch.index;
  const sliced = text.slice(startIndex);

  if (!endPattern) return sliced;

  const endMatch = sliced.match(endPattern);
  if (!endMatch || endMatch.index == null) return sliced;

  return sliced.slice(0, endMatch.index);
}

function parseSubjectHeadings(sectionText) {
  const headingRegex = /([A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\/\-\s]{2,}):\s+/g;
  const matches = [...sectionText.matchAll(headingRegex)];
  if (!matches.length) return [];

  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index < matches.length - 1 ? matches[index + 1].index : sectionText.length;
    const body = sectionText.slice(start, end);
    const name = match[1].replace(/\s+/g, ' ').trim();

    return {
      name,
      topics: body
        .split(/\s(?=\d+\s)|\s(?=\d+\.\d+)/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 80),
    };
  });
}

function analyzeWithHeuristics(editalText) {
  const normalizedText = String(editalText || '').replace(/\r/g, ' ').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalizedText) {
    throw new Error('Texto do edital vazio para analise heuristica.');
  }

  const examNameMatch = normalizedText.match(/CONCURSO P[ÚU]BLICO PARA A ADMISS[ÃA]O AO CURSO DE FORMA[CÇ][ÃA]O DE OFICIAIS \(CFO\) E AO CURSO DE FORMA[CÇ][ÃA]O DE PRA[CÇ]AS \(CFP\) DA POL[ÍI]CIA MILITAR DO ESTADO DE ALAGOAS/i);
  const examName = examNameMatch
    ? 'Concurso Público para a admissão ao Curso de Formação de Oficiais (CFO) e ao Curso de Formação de Praças (CFP) da Polícia Militar do Estado de Alagoas'
    : 'Nao encontrado';

  const officialProgramSection = sliceBetween(
    normalizedText,
    /L[ÍI]NGUA\s+PORTUGUESA:|I\s+L[ÍI]NGUA\s+PORTUGUESA/i,
    /CARGO\s+2:\s+SOLDADO\s+DO\s+QUADRO\s+DE\s+PRA[CÇ]AS/i
  );

  const praçasProgramSection = sliceBetween(
    normalizedText,
    /CARGO\s+2:\s+SOLDADO\s+DO\s+QUADRO\s+DE\s+PRA[CÇ]AS[\s\S]*?LEGISLA[CÇ][ÃA]O\s+PERTINENTE\s+AO\s+POLICIAL\s+MILITAR\s+DE\s+ALAGOAS:/i,
    /J[ÚU]LIA\s+CAROLINA/i
  );

  const officialSubjects = uniqueList(
    [...officialProgramSection.matchAll(/([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\/\-\s]{3,}):/g)]
      .map((match) => match[1].replace(/^[IVXLC]+\s+/i, '').trim())
      .filter(
        (name) =>
          !/ANEXO|CRONOGRAMA|CARGO|REMUNERAÇÃO|CARGA HORÁRIA|DESCRIÇÃO|REQUISITO/i.test(name)
      )
  );
  const praçaSubjects = uniqueList(
    [
      ...praçasProgramSection.matchAll(
        /(LEGISLA[CÇ][ÃA]O PERTINENTE AO POLICIAL MILITAR DE ALAGOAS|NO[CÇ][ÕO]ES DE DIREITO ADMINISTRATIVO|NO[CÇ][ÕO]ES DE DIREITO CONSTITUCIONAL|NO[CÇ][ÕO]ES DE DIREITO PROCESSUAL PENAL|NO[CÇ][ÕO]ES DE DIREITO PENAL MILITAR|NO[CÇ][ÕO]ES DE DIREITO PROCESSUAL PENAL MILITAR|NO[CÇ][ÕO]ES DE DIREITOS HUMANOS)\s*:/gi
      ),
    ].map((match) => match[1].trim())
  );

  const contests = [
    {
      id: 'oficial-de-estado-maior',
      title: 'Oficial de Estado-Maior',
      role_name: 'Oficial de Estado-Maior',
      institution: extractOrganization(normalizedText),
      exam_date: extractExamDate(normalizedText),
      publication_date: extractPublicationDate(normalizedText),
      registration_period: extractRegistrationPeriod(normalizedText),
      subjects: officialSubjects.map((name) => ({ name, topics: [] })),
    },
    {
      id: 'soldado-do-quadro-de-pracas',
      title: 'Soldado do Quadro de Praças',
      role_name: 'Soldado do Quadro de Praças',
      institution: extractOrganization(normalizedText),
      exam_date: extractExamDate(normalizedText),
      publication_date: extractPublicationDate(normalizedText),
      registration_period: extractRegistrationPeriod(normalizedText),
      subjects: praçaSubjects.map((name) => ({ name, topics: [] })),
    },
  ].filter((contest) => contest.subjects.length > 0);

  if (!contests.length) {
    throw new Error('A heuristica nao conseguiu identificar cargos e materias nesse edital.');
  }

  return {
    provider: 'heuristic',
    source: 'heuristic',
    model: 'Parser de edital',
    analysis: sanitizeAnalysis({
      banca: extractBanca(normalizedText),
      exam_name: examName,
      organization: extractOrganization(normalizedText),
      exam_type: 'Concurso publico',
      dates: {
        publication_date: extractPublicationDate(normalizedText),
        exam_date: extractExamDate(normalizedText),
        registration_period: extractRegistrationPeriod(normalizedText),
      },
      contests,
    }),
  };
}

function sanitizeAnalysis(rawAnalysis) {
  const normalizedAnalysis = normalizeParserOutput(rawAnalysis);
  const dates = normalizedAnalysis?.dates || {};
  const contests = Array.isArray(normalizedAnalysis?.contests) ? normalizedAnalysis.contests : [];

  return {
    banca: sanitizeValue(normalizedAnalysis?.banca, 'A definir'),
    exam_name: sanitizeValue(normalizedAnalysis?.exam_name),
    organization: sanitizeValue(normalizedAnalysis?.organization),
    exam_type: sanitizeValue(normalizedAnalysis?.exam_type),
    dates: {
      publication_date: sanitizeValue(dates.publication_date),
      exam_date: sanitizeValue(dates.exam_date),
      registration_period: sanitizeValue(dates.registration_period),
    },
    contests: contests
      .map((contest, index) => ({
        id: buildContestId(contest?.id, index),
        title: sanitizeValue(contest?.title),
        role_name: sanitizeValue(contest?.role_name),
        institution: sanitizeValue(contest?.institution),
        exam_date: sanitizeValue(contest?.exam_date),
        publication_date: sanitizeValue(contest?.publication_date),
        registration_period: sanitizeValue(contest?.registration_period),
        subjects: Array.isArray(contest?.subjects)
          ? contest.subjects
              .map((subject) => ({
                name: sanitizeValue(subject?.name),
                topics: Array.isArray(subject?.topics)
                  ? subject.topics.map((topic) => sanitizeValue(topic)).filter(Boolean)
                  : [],
              }))
              .filter((subject) => subject.name !== 'Nao encontrado')
          : [],
      }))
      .filter((contest) => contest.title !== 'Nao encontrado'),
  };
}

function prepareEditalText(rawText) {
  const normalized = String(rawText || '').replace(/\r/g, '').trim();
  if (!normalized) return '';

  if (normalized.length <= 120000) {
    return normalized;
  }

  const lines = normalized.split('\n').map((line) => line.trim());
  const keywordRegex =
    /concurso|cargo|cargos|especialidade|area|banca|conhecimentos basicos|conhecimentos especificos|conteudo programatico|objetos de avaliacao|cronograma|prova objetiva|anexo/i;

  const importantLines = lines.filter((line) => keywordRegex.test(line));
  const head = lines.slice(0, 350).join('\n');
  const middle = importantLines.slice(0, 1200).join('\n');
  const tail = lines.slice(-220).join('\n');

  return [head, middle, tail].filter(Boolean).join('\n');
}

function extractJsonFromText(text) {
  const raw = String(text || '').trim();
  if (!raw) {
    throw new Error('O modelo nao retornou conteudo.');
  }

  try {
    return JSON.parse(raw);
  } catch {}

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1]);
  }

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
  }

  throw new Error('Nao foi possivel extrair JSON valido da resposta do modelo.');
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(responseText || `Falha HTTP ${response.status}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error('Resposta JSON invalida do provedor de IA.');
  }
}

async function listGeminiModels() {
  if (!GOOGLE_API_KEY) return [];

  try {
    const payload = await fetchJson(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_API_KEY}`,
      { method: 'GET' }
    );

    return Array.isArray(payload?.models) ? payload.models : [];
  } catch {
    return [];
  }
}

async function resolveGeminiModel() {
  const models = await listGeminiModels();
  if (!models.length) {
    return GOOGLE_MODEL;
  }

  const supported = models.filter((model) =>
    Array.isArray(model?.supportedGenerationMethods) &&
    model.supportedGenerationMethods.includes('generateContent')
  );

  const supportedNames = supported.map((model) => String(model.name || '').replace(/^models\//, ''));

  for (const candidate of GEMINI_MODEL_CANDIDATES) {
    if (supportedNames.includes(candidate)) {
      return candidate;
    }
  }

  return supportedNames[0] || GOOGLE_MODEL;
}

async function listOllamaModels() {
  try {
    const payload = await fetchJson(`${OLLAMA_BASE_URL}/api/tags`, { method: 'GET' });
    return Array.isArray(payload?.models) ? payload.models.map((model) => model?.name).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function analyzeWithOllama(editalText) {
  const preparedText = prepareEditalText(editalText);
  const prompt = `${SYSTEM_PROMPT}

Devolva um unico JSON valido.

Schema alvo:
${JSON.stringify(ANALYSIS_SCHEMA)}

<edital_text>
${preparedText}
</edital_text>`;

  const availableModels = await listOllamaModels();
  const candidates =
    availableModels.length > 0
      ? OLLAMA_MODEL_CANDIDATES.filter((candidate) => availableModels.includes(candidate))
      : OLLAMA_MODEL_CANDIDATES;

  const errors = [];

  for (const candidate of candidates) {
    try {
      const payload = await fetchJson(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: candidate,
          prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1,
          },
        }),
      });

      const parsed = extractJsonFromText(payload?.response);
      const analysis = sanitizeAnalysis(parsed);

      if (!analysis.contests.length || !hasUsefulSubjects(analysis)) {
        throw new Error('O modelo local nao conseguiu identificar opcoes importaveis nesse edital.');
      }

      return {
        provider: 'ollama',
        source: 'ollama',
        model: payload?.model || candidate,
        analysis,
      };
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }

  if (availableModels.length === 0) {
    throw new Error(
      `Falha ao analisar edital com Ollama. Nenhum modelo local compativel foi encontrado. Rode "ollama pull qwen2.5:7b" ou "ollama pull llama3.1:8b".`
    );
  }

  throw new Error(`Falha ao analisar edital com Ollama. Tentativas: ${errors.join(' | ')}`);
}

async function analyzeWithOpenAI(editalText) {
  if (!OPENAI_API_KEY) {
    throw new Error('Defina OPENAI_API_KEY no arquivo .env para usar OpenAI.');
  }

  const preparedText = prepareEditalText(editalText);
  const payload = await fetchJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.1,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'edital_analysis',
          strict: true,
          schema: ANALYSIS_SCHEMA,
        },
      },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analise o edital abaixo e devolva JSON valido no schema solicitado.\n\n<edital_text>\n${preparedText}\n</edital_text>`,
        },
      ],
    }),
  });

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('A OpenAI nao retornou conteudo para esse edital.');
  }

  const analysis = sanitizeAnalysis(JSON.parse(content));
  if (!analysis.contests.length || !hasUsefulSubjects(analysis)) {
    throw new Error('A OpenAI nao conseguiu identificar opcoes importaveis nesse edital.');
  }

  return {
    provider: 'openai',
    source: 'openai',
    model: payload.model || OPENAI_MODEL,
    analysis,
  };
}

async function analyzeWithGemini(editalText) {
  if (!GOOGLE_API_KEY) {
    throw new Error('Defina GOOGLE_API_KEY no .env para usar Gemini.');
  }

  const preparedText = prepareEditalText(editalText);
  const resolvedModel = await resolveGeminiModel();
  const prompt = `${SYSTEM_PROMPT}

Devolva um unico JSON valido, sem markdown e sem comentarios.

Schema alvo:
${JSON.stringify(ANALYSIS_SCHEMA)}

<edital_text>
${preparedText}
</edital_text>`;

  const payload = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  const candidate = payload?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  if (finishReason && finishReason !== 'STOP') {
    throw new Error(`Gemini interrompeu a resposta com status ${finishReason}.`);
  }

  const contentText = (candidate?.content?.parts || [])
    .map((part) => part?.text || '')
    .join('\n')
    .trim();

  if (!contentText) {
    throw new Error('O Gemini nao retornou conteudo para esse edital.');
  }

  const analysis = sanitizeAnalysis(extractJsonFromText(contentText));
  if (!analysis.contests.length || !hasUsefulSubjects(analysis)) {
    throw new Error('O Gemini nao conseguiu identificar opcoes importaveis nesse edital.');
  }

  return {
    provider: 'gemini',
    source: 'gemini',
    model: resolvedModel,
    analysis,
  };
}

async function analyzeEdital(editalText) {
  const providers =
    AI_PROVIDER === 'gemini'
      ? ['gemini', AI_FALLBACK_PROVIDER, 'heuristic']
      : AI_PROVIDER === 'openai'
        ? ['openai', AI_FALLBACK_PROVIDER, 'heuristic']
        : ['ollama', 'heuristic'];

  const errors = [];

  for (const provider of providers.filter(Boolean)) {
    try {
      if (provider === 'gemini') return await analyzeWithGemini(editalText);
      if (provider === 'openai') return await analyzeWithOpenAI(editalText);
      if (provider === 'ollama') return await analyzeWithOllama(editalText);
      if (provider === 'heuristic') return analyzeWithHeuristics(editalText);
    } catch (error) {
      errors.push(`${provider}: ${error.message}`);
    }
  }

  throw new Error(errors.join(' | '));
}

function clampEssayScore(value, max = 2.5) {
  return Number(Math.max(0, Math.min(max, Number(value || 0))).toFixed(1));
}

function normalizeEssayAnalysis(rawAnalysis = {}) {
  const payload = rawAnalysis && typeof rawAnalysis === 'object' ? rawAnalysis : {};
  const criteria = {
    gramatica: {
      score: clampEssayScore(payload?.criteria?.gramatica?.score),
      maxScore: 2.5,
      note: sanitizeValue(payload?.criteria?.gramatica?.note, ''),
    },
    coesao: {
      score: clampEssayScore(payload?.criteria?.coesao?.score),
      maxScore: 2.5,
      note: sanitizeValue(payload?.criteria?.coesao?.note, ''),
    },
    tema: {
      score: clampEssayScore(payload?.criteria?.tema?.score),
      maxScore: 2.5,
      note: sanitizeValue(payload?.criteria?.tema?.note, ''),
    },
    estrutura: {
      score: clampEssayScore(payload?.criteria?.estrutura?.score),
      maxScore: 2.5,
      note: sanitizeValue(payload?.criteria?.estrutura?.note, ''),
    },
  };

  const totalScore = Object.values(criteria).reduce((acc, item) => acc + Number(item.score || 0), 0);

  return {
    overallScore: Number(Math.max(0, Math.min(10, Number(payload?.overallScore ?? totalScore))).toFixed(1)),
    criteria,
    summary: sanitizeValue(payload?.summary, ''),
    strengths: Array.isArray(payload?.strengths)
      ? payload.strengths.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4)
      : [],
    improvements: Array.isArray(payload?.improvements)
      ? payload.improvements.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4)
      : [],
    grammarFeedback: Array.isArray(payload?.grammarFeedback)
      ? payload.grammarFeedback
          .map((item) => ({
            excerpt: sanitizeValue(item?.excerpt, ''),
            replacement: sanitizeValue(item?.replacement, ''),
            reason: sanitizeValue(item?.reason, ''),
          }))
          .filter((item) => item.excerpt || item.replacement || item.reason)
          .slice(0, 4)
      : [],
  };
}

function buildEssayHeuristicAnalysis({ text = '', tema = '', banca = '' } = {}) {
  const normalizedText = String(text || '').replace(/\r/g, '').trim();
  if (!normalizedText) {
    throw new Error('Texto da redacao vazio.');
  }

  const words = normalizedText.split(/\s+/).filter(Boolean);
  const paragraphs = normalizedText
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const lower = normalizedText.toLowerCase();
  const hasConclusionCue = /(portanto|logo|assim|em sintese|em suma|conclui-se|dessa forma)/i.test(normalizedText);
  const hasConnectiveCue = /(alem disso|nesse sentido|todavia|contudo|outrossim|por outro lado|sob esse vies)/i.test(
    normalizedText
  );
  const themeTokens = String(tema || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((item) => item.length > 4);
  const mentionsTheme = themeTokens.some((token) => lower.includes(token));

  const criteria = {
    gramatica: {
      score: clampEssayScore(0.8 + Math.min(words.length, 320) / 220),
      maxScore: 2.5,
      note:
        words.length >= 180
          ? 'Volume textual consistente; revise pontuacao e concordancia fina.'
          : 'Texto curto reduz margem para demonstrar repertorio e maturidade argumentativa.',
    },
    coesao: {
      score: clampEssayScore(1 + (hasConnectiveCue ? 0.8 : 0.2) + paragraphs.length * 0.12),
      maxScore: 2.5,
      note: hasConnectiveCue
        ? 'Ha conectivos perceptiveis entre as ideias.'
        : 'Faltam transicoes mais nítidas entre os paragrafos.',
    },
    tema: {
      score: clampEssayScore(1 + (mentionsTheme ? 0.9 : 0.2) + Math.min(words.length, 260) / 520),
      maxScore: 2.5,
      note: mentionsTheme
        ? `O texto mantem aderencia ao tema${tema ? ` "${tema}"` : ''}.`
        : 'A tese precisa retomar com mais clareza os termos centrais do tema.',
    },
    estrutura: {
      score: clampEssayScore(
        0.9 + (paragraphs.length >= 4 ? 0.9 : paragraphs.length >= 3 ? 0.55 : 0.2) + (hasConclusionCue ? 0.5 : 0.1)
      ),
      maxScore: 2.5,
      note:
        paragraphs.length >= 4
          ? 'A organizacao em paragrafos sustenta bem a leitura.'
          : 'Falta separar melhor introducao, desenvolvimento e conclusao.',
    },
  };

  const totalScore = Object.values(criteria).reduce((acc, item) => acc + Number(item.score || 0), 0);
  const strengths = [];
  const improvements = [];
  const grammarFeedback = [];

  if (paragraphs.length >= 4) strengths.push('A divisao em paragrafos ajuda a progressao argumentativa.');
  if (hasConnectiveCue) strengths.push('Ha conectivos que tornam a leitura mais fluida.');
  if (mentionsTheme) strengths.push('O texto dialoga com o tema ao longo do desenvolvimento.');
  if (words.length >= 180) strengths.push('A extensao permite desenvolver melhor os argumentos.');

  if (!hasConclusionCue) improvements.push('Fortaleça a conclusao com fechamento claro e proposta de encaminhamento.');
  if (!hasConnectiveCue) improvements.push('Use conectivos mais visiveis para amarrar melhor as ideias.');
  if (paragraphs.length < 4) improvements.push('Expanda a estrutura para ao menos quatro paragrafos bem definidos.');
  if (!mentionsTheme && tema) improvements.push('Retome termos centrais do tema para evitar fuga parcial.');
  if (words.length < 160) improvements.push('Aumente a densidade argumentativa com repertorio e detalhamento.');

  if (!/[.!?]\s*$/.test(normalizedText)) {
    grammarFeedback.push({
      excerpt: 'Fechamento do texto',
      replacement: 'Finalize o ultimo periodo com pontuacao.',
      reason: 'O encerramento sem pontuacao passa sensacao de texto inacabado.',
    });
  }
  if (!/\n\s*\n/.test(normalizedText)) {
    grammarFeedback.push({
      excerpt: 'Bloco unico de texto',
      replacement: 'Separe os paragrafos com quebra de linha dupla.',
      reason: 'A estrutura argumentativa fica mais clara para o leitor.',
    });
  }

  return {
    provider: 'heuristic',
    source: 'heuristic',
    sourceLabel: 'Analise local',
    model: 'Heuristica Papirando',
    analysis: normalizeEssayAnalysis({
      overallScore: totalScore,
      criteria,
      summary: `Correcao heuristica para ${banca || 'banca nao informada'} baseada em extensao, coesao, aderencia ao tema e estrutura global.`,
      strengths,
      improvements,
      grammarFeedback,
    }),
  };
}

async function analyzeEssayWithOllama({ text = '', tema = '', banca = '' }) {
  const availableModels = await listOllamaModels();
  const candidates =
    availableModels.length > 0
      ? OLLAMA_MODEL_CANDIDATES.filter((candidate) => availableModels.includes(candidate))
      : OLLAMA_MODEL_CANDIDATES;
  const prompt = `${ESSAY_ANALYSIS_PROMPT}

Schema alvo:
${JSON.stringify(ESSAY_ANALYSIS_SCHEMA)}

<banca>${banca || 'Nao informada'}</banca>
<tema>${tema || 'Nao informado'}</tema>
<texto>
${String(text || '').trim()}
</texto>`;
  const errors = [];

  for (const candidate of candidates) {
    try {
      const payload = await fetchJson(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: candidate,
          prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1,
          },
        }),
      });

      const parsed = extractJsonFromText(payload?.response);
      return {
        provider: 'ollama',
        source: 'ollama',
        sourceLabel: 'IA local',
        model: payload?.model || candidate,
        analysis: normalizeEssayAnalysis(parsed),
      };
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }

  throw new Error(`Falha ao corrigir redacao com Ollama. Tentativas: ${errors.join(' | ')}`);
}

async function analyzeEssayWithOpenAI({ text = '', tema = '', banca = '' }) {
  if (!OPENAI_API_KEY) {
    throw new Error('Defina OPENAI_API_KEY no arquivo .env para usar OpenAI.');
  }

  const payload = await fetchJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.1,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'essay_analysis',
          strict: true,
          schema: ESSAY_ANALYSIS_SCHEMA,
        },
      },
      messages: [
        { role: 'system', content: ESSAY_ANALYSIS_PROMPT },
        {
          role: 'user',
          content: `Banca: ${banca || 'Nao informada'}\nTema: ${tema || 'Nao informado'}\n\nTexto:\n${String(text || '').trim()}`,
        },
      ],
    }),
  });

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('A OpenAI nao retornou conteudo para a redacao.');
  }

  return {
    provider: 'openai',
    source: 'openai',
    sourceLabel: 'IA real',
    model: payload?.model || OPENAI_MODEL,
    analysis: normalizeEssayAnalysis(JSON.parse(content)),
  };
}

async function analyzeEssayWithGemini({ text = '', tema = '', banca = '' }) {
  if (!GOOGLE_API_KEY) {
    throw new Error('Defina GOOGLE_API_KEY no .env para usar Gemini.');
  }

  const resolvedModel = await resolveGeminiModel();
  const prompt = `${ESSAY_ANALYSIS_PROMPT}

Schema alvo:
${JSON.stringify(ESSAY_ANALYSIS_SCHEMA)}

Banca: ${banca || 'Nao informada'}
Tema: ${tema || 'Nao informado'}

Texto:
${String(text || '').trim()}`;

  const payload = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  const contentText = (payload?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || '')
    .join('\n')
    .trim();

  if (!contentText) {
    throw new Error('O Gemini nao retornou conteudo para a redacao.');
  }

  return {
    provider: 'gemini',
    source: 'gemini',
    sourceLabel: 'Gemini',
    model: resolvedModel,
    analysis: normalizeEssayAnalysis(extractJsonFromText(contentText)),
  };
}

async function analyzeEssay(payload) {
  const providers =
    AI_PROVIDER === 'gemini'
      ? ['gemini', 'openai', 'ollama', 'heuristic']
      : AI_PROVIDER === 'openai'
        ? ['openai', 'gemini', 'ollama', 'heuristic']
        : ['ollama', 'openai', 'gemini', 'heuristic'];
  const errors = [];

  for (const provider of providers) {
    try {
      if (provider === 'gemini') return await analyzeEssayWithGemini(payload);
      if (provider === 'openai') return await analyzeEssayWithOpenAI(payload);
      if (provider === 'ollama') return await analyzeEssayWithOllama(payload);
      if (provider === 'heuristic') return buildEssayHeuristicAnalysis(payload);
    } catch (error) {
      errors.push(`${provider}: ${error.message}`);
    }
  }

  throw new Error(errors.join(' | '));
}

async function transcribeEssayWithOpenAI({ dataUrl = '', mimeType = '' }) {
  if (!OPENAI_API_KEY) {
    throw new Error('Defina OPENAI_API_KEY no arquivo .env para usar OpenAI.');
  }

  const payload = await fetchJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: ESSAY_TRANSCRIPTION_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
    }),
  });

  const content = payload?.choices?.[0]?.message?.content;
  const text = Array.isArray(content)
    ? content.map((item) => item?.text || '').join('\n').trim()
    : String(content || '').trim();

  if (!text) {
    throw new Error('A OpenAI nao retornou texto transcrito.');
  }

  return {
    provider: 'openai',
    source: 'openai',
    sourceLabel: 'IA real',
    model: payload?.model || OPENAI_MODEL,
    text,
    warning: mimeType.startsWith('image/')
      ? ''
      : 'Formato recebido fora do fluxo principal de imagem. Revise a transcricao.',
  };
}

async function transcribeEssayWithGemini({ dataUrl = '', mimeType = '' }) {
  if (!GOOGLE_API_KEY) {
    throw new Error('Defina GOOGLE_API_KEY no .env para usar Gemini.');
  }

  const resolvedModel = await resolveGeminiModel();
  const base64Data = String(dataUrl || '').split(',')[1] || '';
  if (!base64Data) {
    throw new Error('Imagem invalida para transcricao.');
  }

  const payload = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: ESSAY_TRANSCRIPTION_PROMPT },
              {
                inlineData: {
                  mimeType: mimeType || 'image/png',
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
        },
      }),
    }
  );

  const text = (payload?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || '')
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('O Gemini nao retornou texto transcrito.');
  }

  return {
    provider: 'gemini',
    source: 'gemini',
    sourceLabel: 'Gemini',
    model: resolvedModel,
    text,
    warning: mimeType.startsWith('image/')
      ? ''
      : 'Formato recebido fora do fluxo principal de imagem. Revise a transcricao.',
  };
}

async function transcribeEssayImage(payload) {
  const providers = ['openai', 'gemini'];
  const errors = [];

  for (const provider of providers) {
    try {
      if (provider === 'openai') return await transcribeEssayWithOpenAI(payload);
      if (provider === 'gemini') return await transcribeEssayWithGemini(payload);
    } catch (error) {
      errors.push(`${provider}: ${error.message}`);
    }
  }

  throw new Error(errors.join(' | '));
}

function normalizeQuestionAlternatives(alternativas = []) {
  return (Array.isArray(alternativas) ? alternativas : [])
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: String.fromCharCode(65 + index),
          label: item.trim(),
          isCorrect: false,
        };
      }

      return {
        id: String(item?.id || item?.letter || String.fromCharCode(65 + index)).trim(),
        label: String(item?.label || item?.text || item?.alternativa || '').trim(),
        isCorrect: Boolean(item?.isCorrect || item?.correta),
      };
    })
    .filter((item) => item.label);
}

function normalizeQuestionExplanation(raw = {}) {
  const keyConcepts = Array.isArray(raw?.keyConcepts)
    ? raw.keyConcepts.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  return {
    isCorrect: Boolean(raw?.isCorrect),
    answer: String(raw?.answer || '').trim() || 'Resposta nao informada.',
    explanation: String(raw?.explanation || '').trim() || 'Nao foi possivel gerar uma explicacao detalhada.',
    keyConcepts: keyConcepts.slice(0, 5),
    studyTip: String(raw?.studyTip || '').trim() || 'Revise o topico e refaca questoes semelhantes.',
  };
}

function buildQuestionExplanationInput(payload = {}) {
  const enunciado = String(payload?.enunciado || payload?.statement || '').trim();
  const alternativas = normalizeQuestionAlternatives(payload?.alternativas || payload?.options || []);
  const markedCorrect = alternativas.find((item) => item.isCorrect);
  const gabarito = String(payload?.gabarito || payload?.answer || markedCorrect?.id || '').trim();
  const respostaUsuario = String(payload?.resposta_usuario || payload?.userAnswer || '').trim();

  return {
    enunciado,
    alternativas,
    gabarito,
    respostaUsuario,
  };
}

function buildQuestionExplanationHeuristic(payload = {}) {
  const input = buildQuestionExplanationInput(payload);
  const correctOption =
    input.alternativas.find((item) => item.id.toLowerCase() === input.gabarito.toLowerCase()) ||
    input.alternativas.find((item) => item.isCorrect);
  const userIsCorrect =
    input.respostaUsuario && input.gabarito
      ? input.respostaUsuario.toLowerCase() === input.gabarito.toLowerCase()
      : Boolean(correctOption?.isCorrect);

  const answer = correctOption
    ? `${correctOption.id}: ${correctOption.label}`
    : input.gabarito || 'Gabarito nao informado.';

  return {
    provider: 'heuristic',
    source: 'heuristic',
    sourceLabel: 'Analise local',
    model: 'Heuristica Papirando',
    ...normalizeQuestionExplanation({
      isCorrect: userIsCorrect,
      answer,
      explanation: correctOption
        ? `O gabarito indicado e ${answer}. Use o enunciado para identificar a regra cobrada e elimine as alternativas incompativeis com esse nucleo.`
        : 'Sem gabarito estruturado, revise o enunciado, identifique o comando da questao e compare cada alternativa com a regra cobrada.',
      keyConcepts: ['Comando da questao', 'Regra central do tema', 'Eliminacao de alternativas'],
      studyTip: 'Anote o motivo do erro em uma frase e refaca 5 questoes do mesmo topico.',
    }),
  };
}

function buildQuestionExplanationPrompt(payload = {}) {
  const input = buildQuestionExplanationInput(payload);

  return `${QUESTION_EXPLANATION_PROMPT}

Schema alvo:
${JSON.stringify(QUESTION_EXPLANATION_SCHEMA)}

Enunciado:
${input.enunciado}

Alternativas:
${input.alternativas.map((item) => `${item.id}) ${item.label}`).join('\n') || 'Nao informadas'}

Gabarito: ${input.gabarito || 'Nao informado'}
Resposta do aluno: ${input.respostaUsuario || 'Nao informada'}`;
}

async function explainQuestionWithOllama(payload = {}) {
  const availableModels = await listOllamaModels();
  const candidates =
    availableModels.length > 0
      ? OLLAMA_MODEL_CANDIDATES.filter((candidate) => availableModels.includes(candidate))
      : OLLAMA_MODEL_CANDIDATES;
  const prompt = buildQuestionExplanationPrompt(payload);
  const errors = [];

  for (const candidate of candidates) {
    try {
      const response = await fetchJson(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: candidate,
          prompt,
          stream: false,
          format: 'json',
          options: { temperature: 0.1 },
        }),
      });

      return {
        provider: 'ollama',
        source: 'ollama',
        sourceLabel: 'IA local',
        model: response?.model || candidate,
        ...normalizeQuestionExplanation(extractJsonFromText(response?.response)),
      };
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }

  throw new Error(`Falha ao explicar questao com Ollama. Tentativas: ${errors.join(' | ')}`);
}

async function explainQuestionWithOpenAI(payload = {}) {
  if (!OPENAI_API_KEY) {
    throw new Error('Defina OPENAI_API_KEY no arquivo .env para usar OpenAI.');
  }

  const response = await fetchJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.1,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'question_explanation',
          strict: true,
          schema: QUESTION_EXPLANATION_SCHEMA,
        },
      },
      messages: [
        { role: 'system', content: QUESTION_EXPLANATION_PROMPT },
        { role: 'user', content: buildQuestionExplanationPrompt(payload) },
      ],
    }),
  });

  const content = response?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('A OpenAI nao retornou conteudo para a questao.');
  }

  return {
    provider: 'openai',
    source: 'openai',
    sourceLabel: 'IA real',
    model: response?.model || OPENAI_MODEL,
    ...normalizeQuestionExplanation(JSON.parse(content)),
  };
}

async function explainQuestionWithGemini(payload = {}) {
  if (!GOOGLE_API_KEY) {
    throw new Error('Defina GOOGLE_API_KEY no .env para usar Gemini.');
  }

  const resolvedModel = await resolveGeminiModel();
  const response = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildQuestionExplanationPrompt(payload) }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  const contentText = (response?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || '')
    .join('\n')
    .trim();

  if (!contentText) {
    throw new Error('O Gemini nao retornou conteudo para a questao.');
  }

  return {
    provider: 'gemini',
    source: 'gemini',
    sourceLabel: 'Gemini',
    model: resolvedModel,
    ...normalizeQuestionExplanation(extractJsonFromText(contentText)),
  };
}

async function explainQuestion(payload = {}) {
  const providers =
    AI_PROVIDER === 'gemini'
      ? ['gemini', 'openai', 'ollama', 'heuristic']
      : AI_PROVIDER === 'openai'
        ? ['openai', 'gemini', 'ollama', 'heuristic']
        : ['ollama', 'openai', 'gemini', 'heuristic'];
  const errors = [];

  for (const provider of providers) {
    try {
      if (provider === 'gemini') return await explainQuestionWithGemini(payload);
      if (provider === 'openai') return await explainQuestionWithOpenAI(payload);
      if (provider === 'ollama') return await explainQuestionWithOllama(payload);
      if (provider === 'heuristic') return buildQuestionExplanationHeuristic(payload);
    } catch (error) {
      errors.push(`${provider}: ${error.message}`);
    }
  }

  throw new Error(errors.join(' | '));
}

function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        rejectBody(new Error('Payload muito grande para analise.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolveBody(raw ? JSON.parse(raw) : {});
      } catch {
        rejectBody(new Error('JSON invalido no corpo da requisicao.'));
      }
    });

    req.on('error', rejectBody);
  });
}

// ─── Flashcard generation ─────────────────────────────────────────────────────

const FLASHCARD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['front', 'back'],
        properties: {
          front: { type: 'string' },
          back:  { type: 'string' },
        },
      },
    },
  },
};

function buildFlashcardPrompt(text, disciplina, maxCards) {
  return `Voce e um assistente especializado em concursos publicos brasileiros.
Dado o trecho de conteudo abaixo, gere exatamente ${maxCards} flashcards no formato pergunta/resposta.
${disciplina ? `Disciplina: ${disciplina}` : ''}

Regras:
- Frente (front): pergunta direta, objetiva, como as bancas costumam cobrar.
- Verso (back): resposta concisa, sem enrolacao.
- Nao repita informacoes obvias.
- Priorize conceitos, numeros, prazos, excecoes e pegadinhas.
- Responda SOMENTE com JSON valido no schema: {"cards":[{"front":"...","back":"..."}]}

<conteudo>
${text.slice(0, 6000)}
</conteudo>`;
}

async function generateFlashcardsWithGemini(text, disciplina, maxCards) {
  if (!GOOGLE_API_KEY) throw new Error('Defina GOOGLE_API_KEY no .env para usar Gemini.');
  const resolvedModel = await resolveGeminiModel();
  const prompt = buildFlashcardPrompt(text, disciplina, maxCards);

  const payload = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
      }),
    }
  );

  const contentText = (payload?.candidates?.[0]?.content?.parts || [])
    .map((p) => p?.text || '').join('\n').trim();
  if (!contentText) throw new Error('Gemini nao retornou conteudo.');

  const parsed = extractJsonFromText(contentText);
  if (!Array.isArray(parsed?.cards) || parsed.cards.length === 0)
    throw new Error('Gemini nao gerou cards validos.');

  return { provider: 'gemini', model: resolvedModel, cards: parsed.cards.slice(0, maxCards) };
}

async function generateFlashcardsWithOpenAI(text, disciplina, maxCards) {
  if (!OPENAI_API_KEY) throw new Error('Defina OPENAI_API_KEY no .env para usar OpenAI.');
  const prompt = buildFlashcardPrompt(text, disciplina, maxCards);

  const payload = await fetchJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.4,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'flashcards', strict: true, schema: FLASHCARD_SCHEMA },
      },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI nao retornou conteudo.');
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed?.cards) || parsed.cards.length === 0)
    throw new Error('OpenAI nao gerou cards validos.');

  return { provider: 'openai', model: payload.model || OPENAI_MODEL, cards: parsed.cards.slice(0, maxCards) };
}

async function generateFlashcardsWithOllama(text, disciplina, maxCards) {
  const prompt = buildFlashcardPrompt(text, disciplina, maxCards);
  const availableModels = await listOllamaModels();
  const candidates = availableModels.length > 0
    ? OLLAMA_MODEL_CANDIDATES.filter((c) => availableModels.includes(c))
    : OLLAMA_MODEL_CANDIDATES;

  const errors = [];
  for (const candidate of candidates) {
    try {
      const payload = await fetchJson(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: candidate, prompt, stream: false, format: 'json' }),
      });

      const parsed = extractJsonFromText(payload?.response);
      if (!Array.isArray(parsed?.cards) || parsed.cards.length === 0)
        throw new Error('Nenhum card gerado.');

      return { provider: 'ollama', model: candidate, cards: parsed.cards.slice(0, maxCards) };
    } catch (e) {
      errors.push(`${candidate}: ${e.message}`);
    }
  }
  throw new Error(`Falha ao gerar flashcards com Ollama. Tentativas: ${errors.join(' | ')}`);
}

async function generateFlashcards({ text, disciplina = '', maxCards = 10 }) {
  const providers = AI_PROVIDER === 'gemini'
    ? ['gemini', AI_FALLBACK_PROVIDER]
    : AI_PROVIDER === 'openai'
      ? ['openai', AI_FALLBACK_PROVIDER]
      : ['ollama', AI_FALLBACK_PROVIDER];

  const errors = [];
  for (const provider of [...new Set(providers)]) {
    try {
      if (provider === 'gemini') return await generateFlashcardsWithGemini(text, disciplina, maxCards);
      if (provider === 'openai') return await generateFlashcardsWithOpenAI(text, disciplina, maxCards);
      if (provider === 'ollama') return await generateFlashcardsWithOllama(text, disciplina, maxCards);
    } catch (e) {
      errors.push(`[${provider}] ${e.message}`);
    }
  }
  throw new Error(`Nao foi possivel gerar flashcards. Erros: ${errors.join(' | ')}`);
}

// ─── Topic summarization ──────────────────────────────────────────────────────

function buildSummaryPrompt(text, topico, disciplina) {
  return `Voce e um professor especializado em concursos publicos brasileiros.
${disciplina ? `Disciplina: ${disciplina}.` : ''}${topico ? ` Topico: ${topico}.` : ''}

Com base no conteudo abaixo, gere:
1. Um resumo direto (maximo 4 paragrafos), focado no que cai em prova.
2. Uma lista de ate 8 pontos-chave (keyPoints), cada um em 1 frase curta.

Responda SOMENTE com JSON valido: {"summary":"...","keyPoints":["...","..."]}

<conteudo>
${text.slice(0, 6000)}
</conteudo>`;
}

async function summarizeWithGemini(text, topico, disciplina) {
  if (!GOOGLE_API_KEY) throw new Error('Defina GOOGLE_API_KEY no .env para usar Gemini.');
  const resolvedModel = await resolveGeminiModel();
  const prompt = buildSummaryPrompt(text, topico, disciplina);

  const payload = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
      }),
    }
  );

  const contentText = (payload?.candidates?.[0]?.content?.parts || [])
    .map((p) => p?.text || '').join('\n').trim();
  if (!contentText) throw new Error('Gemini nao retornou conteudo.');

  const parsed = extractJsonFromText(contentText);
  if (!parsed?.summary) throw new Error('Gemini nao gerou resumo valido.');

  return { provider: 'gemini', model: resolvedModel, summary: parsed.summary, keyPoints: parsed.keyPoints || [] };
}

async function summarizeWithOpenAI(text, topico, disciplina) {
  if (!OPENAI_API_KEY) throw new Error('Defina OPENAI_API_KEY no .env para usar OpenAI.');
  const prompt = buildSummaryPrompt(text, topico, disciplina);

  const payload = await fetchJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI nao retornou conteudo.');
  const parsed = extractJsonFromText(content);
  if (!parsed?.summary) throw new Error('OpenAI nao gerou resumo valido.');

  return { provider: 'openai', model: payload.model || OPENAI_MODEL, summary: parsed.summary, keyPoints: parsed.keyPoints || [] };
}

async function summarizeWithOllama(text, topico, disciplina) {
  const prompt = buildSummaryPrompt(text, topico, disciplina);
  const availableModels = await listOllamaModels();
  const candidates = availableModels.length > 0
    ? OLLAMA_MODEL_CANDIDATES.filter((c) => availableModels.includes(c))
    : OLLAMA_MODEL_CANDIDATES;

  const errors = [];
  for (const candidate of candidates) {
    try {
      const payload = await fetchJson(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: candidate, prompt, stream: false, format: 'json' }),
      });

      const parsed = extractJsonFromText(payload?.response);
      if (!parsed?.summary) throw new Error('Resumo invalido.');

      return { provider: 'ollama', model: candidate, summary: parsed.summary, keyPoints: parsed.keyPoints || [] };
    } catch (e) {
      errors.push(`${candidate}: ${e.message}`);
    }
  }
  throw new Error(`Falha ao resumir com Ollama. Tentativas: ${errors.join(' | ')}`);
}

async function summarizeTopic({ text, topico = '', disciplina = '' }) {
  const providers = AI_PROVIDER === 'gemini'
    ? ['gemini', AI_FALLBACK_PROVIDER]
    : AI_PROVIDER === 'openai'
      ? ['openai', AI_FALLBACK_PROVIDER]
      : ['ollama', AI_FALLBACK_PROVIDER];

  const errors = [];
  for (const provider of [...new Set(providers)]) {
    try {
      if (provider === 'gemini') return await summarizeWithGemini(text, topico, disciplina);
      if (provider === 'openai') return await summarizeWithOpenAI(text, topico, disciplina);
      if (provider === 'ollama') return await summarizeWithOllama(text, topico, disciplina);
    } catch (e) {
      errors.push(`[${provider}] ${e.message}`);
    }
  }
  throw new Error(`Nao foi possivel resumir o topico. Erros: ${errors.join(' | ')}`);
}

// ─────────────────────────────────────────────────────────────────────────────

function normalizeContestFormTemplate(parsed = {}, provider = 'ai', model = '') {
  const toList = (items, max = 80) =>
    (Array.isArray(items) ? items : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, max);
  const isUncertain = (value = '') => /n[aã]o tenho certeza|n[aã]o consta|n[aã]o encontrado|n[aã]o localizei|incerto|equivalente/i.test(String(value || ''));
  const normalizeCargoKey = (value = '') =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const extractMoney = (value = '') => String(value || '').match(/R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}/g) || [];
  const pickSalaryForCargo = (salary = '', cargo = '') => {
    if (isUncertain(salary)) return '';
    const text = String(salary || '');
    const values = extractMoney(text);
    if (values.length <= 1) return values[0] || text.trim();

    const key = normalizeCargoKey(cargo);
    const lines = text.split(/\r?\n|\*/).map((line) => line.trim()).filter(Boolean);
    const matchedLine = lines.find((line) => {
      const normalized = normalizeCargoKey(line);
      if (!extractMoney(line).length) return false;
      if (/nivel superior|superior/.test(key) && /nivel superior|superior/.test(normalized)) return true;
      if (/nivel medio|medio|atendente/.test(key) && /nivel medio|medio|atendente/.test(normalized)) return true;
      return key.split(/[\s—-]+/).filter((part) => part.length > 4).some((part) => normalized.includes(part));
    });
    return extractMoney(matchedLine || '')[0] || values[0] || '';
  };
  const normalizeEducationForCargo = (education = '', cargo = '') => {
    const key = normalizeCargoKey(`${cargo} ${education}`);
    if (/nivel superior|superior|bacharel|diploma de curso superior/.test(key)) return 'Nível superior';
    if (/nivel medio|medio|ensino medio|atendente/.test(key)) return 'Nível médio';
    return isUncertain(education) ? '' : String(education || '').trim();
  };
  const normalizeVacancies = (value = '') => {
    if (isUncertain(value)) return '';
    const text = String(value || '').trim();
    const total = text.match(/\b(\d{1,5})\s+vagas?\s+totais?\b/i);
    if (total) return total[1];
    const firstNumber = text.match(/\b\d{1,5}\b/);
    return firstNumber ? firstNumber[0] : text;
  };
  const normalizeLocationForCargo = (location = '', cargo = '') => {
    if (isUncertain(location)) return '';
    const text = String(location || '').replace(/\s+/g, ' ').trim();
    const key = normalizeCargoKey(cargo);
    const normalized = normalizeCargoKey(text);
    if (/nivel superior|superior/.test(key) && /para nivel superior[^.]*salvador/.test(normalized)) return 'Salvador-BA';
    if (/salvador/.test(normalized) && /nivel superior|superior/.test(key)) return 'Salvador-BA';
    const firstSentence = text.split(/\.\s+/)[0]?.trim();
    return firstSentence || text;
  };
  const normalizeSubject = (subject = {}) => {
    const name = sanitizeValue(subject?.nome || subject?.name, '');
    const normalizedName = normalizeCargoKey(name);
    if (/requisitos?|atribuicoes?|atribuições?|funcao|função/.test(normalizedName)) return null;
    const fallbackName = /nao se aplica|não se aplica/.test(normalizedName) ? 'Avaliação Curricular' : name;
    return {
      nome: fallbackName,
      topicos: toList(subject?.topicos || subject?.topics, 160),
    };
  };
  const rawTemplates = Array.isArray(parsed?.templates)
    ? parsed.templates
    : parsed?.template
      ? [parsed.template]
      : [parsed || {}];
  const normalizeTemplate = (template = {}) => ({
    nome: sanitizeValue(template.nome, ''),
    plano: sanitizeValue(template.plano, ''),
    concurso: sanitizeValue(template.concurso, ''),
    area: sanitizeValue(template.area, 'Geral'),
    cargo: sanitizeValue(template.cargo, ''),
    banca: sanitizeValue(template.banca, ''),
    salario: pickSalaryForCargo(template.salario, template.cargo),
    inscricao_valor: sanitizeValue(template.inscricao_valor, ''),
    escolaridade: normalizeEducationForCargo(template.escolaridade, template.cargo),
    vagas: normalizeVacancies(template.vagas),
    lotacao: normalizeLocationForCargo(template.lotacao, template.cargo),
    etapas: sanitizeValue(template.etapas, ''),
    etapas_tags: toList(template.etapas_tags, 12),
    taf_itens: toList(template.taf_itens, 20),
    descricao: sanitizeValue(template.descricao, ''),
    status_concurso: sanitizeValue(template.status_concurso, 'suspeito'),
    prova_data: sanitizeValue(template.prova_data, ''),
    edital_url: sanitizeValue(template.edital_url, ''),
    disciplinas: (Array.isArray(template.disciplinas) ? template.disciplinas : [])
      .map((subject) => normalizeSubject(subject))
      .filter((subject) => subject?.nome),
  });
  const templates = rawTemplates
    .map((template) => normalizeTemplate(template))
    .filter((template) => template.nome || template.cargo || template.disciplinas.length);

  return {
    provider,
    source: provider,
    model,
    template: templates[0] || normalizeTemplate({}),
    templates,
    uncertainties: toList(parsed?.uncertainties, 40),
    notes: toList(parsed?.notes, 20),
  };
}

function buildContestFormPrompt(text) {
  return `Transforme este formulario analisado de edital em JSON de templates para cadastro no Papirando.
Use somente as informacoes enviadas. Nao invente cor, imagem ou URL direta de PDF.
Se um campo estiver incerto, ausente ou vier como "Nao tenho certeza", deixe vazio quando for campo simples e registre em uncertainties.
Preserve todas as disciplinas e todos os topicos por disciplina.
Se houver multiplos cargos, funcoes, areas de atuacao ou blocos "Cargo/curso", crie um template separado para cada cargo/area importavel.
Copie os dados comuns do edital em todos os templates separados e ajuste nome, plano, cargo, escolaridade, salario, vagas, lotacao, disciplinas e topicos conforme cada cargo/area.
Se houver um bloco comum como "Todos os cargos", inclua essas disciplinas/topicos em todos os templates especificos.

Regras de preenchimento direto:
- nome: use "Nome do concurso — area/cargo especifico" quando houver multiplas funcoes. Ex: "DETRAN-BA — Processo Seletivo Simplificado REDA — Edital nº 01/2026 — Administração".
- plano: use orgao + area/cargo especifico. Ex: "Departamento Estadual de Trânsito da Bahia — DETRAN-BA — Administração".
- concurso: somente o orgao/concurso comum, sem area/cargo especifico duplicado.
- cargo: somente o cargo/funcao do template. Ex: "Técnico de Nível Superior — Administração".
- escolaridade: deve ser apenas "Nível médio" ou "Nível superior"; derive pelo cargo especifico. Nao misture escolaridades de outros cargos.
- salario: retorne somente o valor do cargo especifico, no formato "R$ 3.810,40". Nao inclua beneficios, bullets, outros cargos ou explicacoes.
- vagas: retorne somente numero e complemento direto da vaga especifica, sem frase longa. Se o edital so informar total geral, use apenas o numero total, ex: "170".
- lotacao: retorne somente a lotacao da vaga especifica. Se houver "Para nível superior ... Salvador", use "Salvador-BA" para cargos de nivel superior.
- etapas: resuma a etapa real em uma frase curta. Ex: "Avaliação curricular, de caráter eliminatório e classificatório."
- disciplinas: inclua apenas o que a pessoa precisa estudar para aquele cargo/prova. Nao use "Requisitos/Atribuições da função" como disciplina de estudo. Se nao houver prova/conteudo programatico, use uma disciplina "Avaliação Curricular" com criterios avaliados; se houver curso de informatica cobrado, use "Informática" com os temas.

Campos:
- area: Policial, Agropecuaria, Tribunais, Fiscal, Controle, Legislativo, Administrativa, Educacao, Saude ou Geral. Juridica/Direito = Tribunais.
- status_concurso: confirmado, previsto, suspeito, suspenso ou encerrado.
- prova_data: YYYY-MM-DD.
- etapas_tags: prova_objetiva, prova_discursiva, redacao, taf, avaliacao_psicologica, investigacao_social, exames_medicos, toxicologico, heteroidentificacao, curso_formacao.

Responda SOMENTE com JSON:
{"templates":[{"nome":"","plano":"","concurso":"","area":"","cargo":"","banca":"","salario":"","inscricao_valor":"","escolaridade":"","vagas":"","lotacao":"","etapas":"","etapas_tags":[],"taf_itens":[],"descricao":"","status_concurso":"","prova_data":"","edital_url":"","disciplinas":[{"nome":"","topicos":[""]}]}],"uncertainties":[""],"notes":[""]}

Formulario:
${String(text || '').slice(0, 30000)}`;
}

async function analyzeContestFormWithOpenAI(text) {
  if (!OPENAI_API_KEY) throw new Error('Defina OPENAI_API_KEY no .env para usar OpenAI.');
  const payload = await fetchJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: buildContestFormPrompt(text) }],
    }),
  });

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI nao retornou conteudo.');
  return normalizeContestFormTemplate(extractJsonFromText(content), 'openai', payload.model || OPENAI_MODEL);
}

async function analyzeContestFormWithGemini(text) {
  if (!GOOGLE_API_KEY) throw new Error('Defina GOOGLE_API_KEY no .env para usar Gemini.');
  const resolvedModel = await resolveGeminiModel();
  const payload = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildContestFormPrompt(text) }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    }
  );

  const contentText = (payload?.candidates?.[0]?.content?.parts || [])
    .map((p) => p?.text || '').join('\n').trim();
  if (!contentText) throw new Error('Gemini nao retornou conteudo.');
  return normalizeContestFormTemplate(extractJsonFromText(contentText), 'gemini', resolvedModel);
}

async function analyzeContestFormWithOllama(text) {
  const availableModels = await listOllamaModels();
  const candidates = availableModels.length > 0
    ? OLLAMA_MODEL_CANDIDATES.filter((c) => availableModels.includes(c))
    : OLLAMA_MODEL_CANDIDATES;

  const errors = [];
  for (const candidate of candidates) {
    try {
      const payload = await fetchJson(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: candidate, prompt: buildContestFormPrompt(text), stream: false, format: 'json' }),
      });
      return normalizeContestFormTemplate(extractJsonFromText(payload?.response), 'ollama', candidate);
    } catch (e) {
      errors.push(`${candidate}: ${e.message}`);
    }
  }
  throw new Error(`Falha ao analisar formulario com Ollama. Tentativas: ${errors.join(' | ')}`);
}

async function analyzeContestForm({ text = '', formText = '' } = {}) {
  const source = String(text || formText || '').trim();
  if (!source) throw new Error('Cole o formulario analisado do concurso para preencher o cadastro.');

  const providers = AI_PROVIDER === 'gemini'
    ? ['gemini', AI_FALLBACK_PROVIDER]
    : AI_PROVIDER === 'openai'
      ? ['openai', AI_FALLBACK_PROVIDER]
      : ['ollama', AI_FALLBACK_PROVIDER];

  const errors = [];
  for (const provider of [...new Set(providers)]) {
    try {
      if (provider === 'gemini') return await analyzeContestFormWithGemini(source);
      if (provider === 'openai') return await analyzeContestFormWithOpenAI(source);
      if (provider === 'ollama') return await analyzeContestFormWithOllama(source);
    } catch (e) {
      errors.push(`[${provider}] ${e.message}`);
    }
  }
  throw new Error(`Nao foi possivel analisar o formulario do concurso. Erros: ${errors.join(' | ')}`);
}

// ─── Study Schedule Generation ───────────────────────────────────────────────

function buildSchedulePrompt(disciplinas, availability, meta) {
  const discList = disciplinas
    .slice(0, 20)
    .map((d, i) => `${i + 1}. ${d.nome} — peso ${d.peso || 1}, progresso ${d.percentual || 0}%, topicos pendentes: ${d.topicosPendentes || 0}`)
    .join('\n');

  const availList = availability
    .filter((d) => d.enabled)
    .map((d) => {
      const slots = (d.slots || []).filter((s) => s.enabled && s.minutes > 0)
        .map((s) => `${s.id}(${s.minutes}min)`).join(', ');
      return slots ? `${d.label}: ${slots}` : null;
    })
    .filter(Boolean)
    .join('\n');

  return `Voce e um especialista em planejamento de estudos para concursos publicos brasileiros.

Crie um cronograma semanal otimizado com base nas seguintes informacoes:

OBJETIVO: ${meta || 'Maximizar aprovacao no concurso alvo'}

DISCIPLINAS (em ordem de prioridade):
${discList || 'Nenhuma disciplina informada — use exemplos genericos para concurso publico.'}

DISPONIBILIDADE SEMANAL:
${availList || 'Seg a Sex: noite(90min), Sab: manha(120min)'}

REGRAS DE DISTRIBUICAO:
- Priorize disciplinas com maior peso e menor progresso
- Alterne entre Teoria, Questoes e Revisao para cada disciplina
- Respeite os blocos de tempo disponivel
- Nao repita a mesma disciplina em dias consecutivos (exceto revisao)
- Inclua pelo menos 1 sessao de revisao por semana
- Distribua as disciplinas de forma equilibrada ao longo da semana

Responda SOMENTE com JSON no formato:
{"semana":[{"dia":"seg","blocos":[{"horario":"noite","disciplina":"Nome da Disciplina","modo":"Teoria","duracao":60,"topico":"Nome do Topico ou subtema","justificativa":"Razao em 1 frase"}]}],"resumo":"Descricao do cronograma em 2-3 frases","prioridades":["Disciplina1","Disciplina2"],"horasTotais":12,"dica":"Conselho estrategico de 1 frase"}

Valores validos para "modo": Teoria, Questoes, Revisao
Valores validos para "horario": manha, tarde, noite, madrugada
"duracao" deve ser um dos valores: 30, 45, 60, 90, 120 (em minutos)`;
}

async function generateScheduleWithGemini(disciplinas, availability, meta) {
  if (!GOOGLE_API_KEY) throw new Error('Defina GOOGLE_API_KEY no .env para usar Gemini.');
  const resolvedModel = await resolveGeminiModel();
  const prompt = buildSchedulePrompt(disciplinas, availability, meta);

  const payload = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, responseMimeType: 'application/json' },
      }),
    }
  );

  const contentText = (payload?.candidates?.[0]?.content?.parts || [])
    .map((p) => p?.text || '').join('\n').trim();
  if (!contentText) throw new Error('Gemini nao retornou conteudo para o cronograma.');

  const parsed = extractJsonFromText(contentText);
  if (!Array.isArray(parsed?.semana) || parsed.semana.length === 0)
    throw new Error('Gemini nao gerou um cronograma valido.');

  return { provider: 'gemini', model: resolvedModel, ...parsed };
}

async function generateScheduleWithOpenAI(disciplinas, availability, meta) {
  if (!OPENAI_API_KEY) throw new Error('Defina OPENAI_API_KEY no .env para usar OpenAI.');
  const prompt = buildSchedulePrompt(disciplinas, availability, meta);

  const payload = await fetchJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI nao retornou conteudo para o cronograma.');
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed?.semana) || parsed.semana.length === 0)
    throw new Error('OpenAI nao gerou um cronograma valido.');

  return { provider: 'openai', model: payload.model || OPENAI_MODEL, ...parsed };
}

async function generateStudySchedule({ disciplinas = [], availability = [], meta = '' }) {
  if (disciplinas.length === 0 && availability.length === 0) {
    throw new Error('Envie pelo menos as disciplinas ou a disponibilidade semanal.');
  }

  const providers = AI_PROVIDER === 'gemini'
    ? ['gemini', AI_FALLBACK_PROVIDER]
    : AI_PROVIDER === 'openai'
      ? ['openai', AI_FALLBACK_PROVIDER]
      : [AI_PROVIDER, AI_FALLBACK_PROVIDER];

  const errors = [];
  for (const provider of [...new Set(providers)]) {
    try {
      if (provider === 'gemini') return await generateScheduleWithGemini(disciplinas, availability, meta);
      if (provider === 'openai') return await generateScheduleWithOpenAI(disciplinas, availability, meta);
    } catch (e) {
      errors.push(`[${provider}] ${e.message}`);
    }
  }
  throw new Error(`Falha ao gerar cronograma. Erros: ${errors.join(' | ')}`);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse(req, res, 204, {});
  }

  if (!resolveCorsOrigin(req)) {
    return jsonResponse(req, res, 403, { error: 'Origem nao autorizada para o servidor de IA.' });
  }

  if (!isAuthorizedRequest(req)) {
    return jsonResponse(req, res, 401, { error: 'Token do servidor de IA ausente ou invalido.' });
  }

  if (req.method === 'GET' && (req.url === '/api/health' || req.url === '/api/ai/health')) {
    return jsonResponse(req, res, 200, {
      ok: true,
      service: 'edital-ai',
      provider: AI_PROVIDER,
      model:
        AI_PROVIDER === 'openai'
          ? OPENAI_MODEL
          : AI_PROVIDER === 'gemini'
            ? GOOGLE_MODEL
            : OLLAMA_MODEL,
      fallbackProvider: AI_FALLBACK_PROVIDER,
      ollamaBaseUrl: OLLAMA_BASE_URL,
      hasOpenAiKey: Boolean(OPENAI_API_KEY),
      hasGoogleKey: Boolean(GOOGLE_API_KEY),
    });
  }

  if (req.method === 'POST' && (req.url === '/api/analyze-edital' || req.url === '/api/ai/analyze-edital')) {
    try {
      const body = await readBody(req);
      const editalText = String(body?.editalText || '').trim();

      if (!editalText) {
        return jsonResponse(req, res, 400, { error: 'Cole ou envie um edital para analise.' });
      }

      const result = await analyzeEdital(editalText);
      return jsonResponse(req, res, 200, result);
    } catch (error) {
      return jsonResponse(req, res, 500, {
        error: error.message || 'Falha interna ao analisar o edital.',
      });
    }
  }

  if (req.method === 'POST' && (req.url === '/api/contest-form' || req.url === '/api/ai/contest-form')) {
    try {
      const body = await readBody(req);
      const text = String(body?.text || body?.formText || '').trim();

      if (!text) {
        return jsonResponse(req, res, 400, { error: 'Cole o formulario analisado do concurso.' });
      }

      const result = await analyzeContestForm({ text });
      return jsonResponse(req, res, 200, result);
    } catch (error) {
      return jsonResponse(req, res, 500, {
        error: error.message || 'Falha interna ao analisar o formulario do concurso.',
      });
    }
  }

  if (
    req.method === 'POST' &&
    (req.url === '/api/redacoes/analyze' || req.url === '/api/analyze-essay' || req.url === '/api/ai/analyze-essay')
  ) {
    try {
      const body = await readBody(req);
      const text = String(body?.text || '').trim();
      const tema = String(body?.tema || '').trim();
      const banca = String(body?.banca || '').trim();

      if (!text) {
        return jsonResponse(req, res, 400, { error: 'Envie o texto da redacao para correcao.' });
      }

      const result = await analyzeEssay({ text, tema, banca });
      return jsonResponse(req, res, 200, result);
    } catch (error) {
      return jsonResponse(req, res, 500, {
        error: error.message || 'Falha interna ao corrigir a redacao.',
      });
    }
  }

  if (
    req.method === 'POST' &&
    (req.url === '/api/redacoes/transcribe' || req.url === '/api/ai/transcribe-essay')
  ) {
    try {
      const body = await readBody(req);
      const dataUrl = String(body?.dataUrl || '').trim();
      const mimeType = String(body?.mimeType || '').trim();

      if (!dataUrl || !mimeType.startsWith('image/')) {
        return jsonResponse(req, res, 400, { error: 'Envie uma imagem valida para transcricao.' });
      }

      const result = await transcribeEssayImage({
        dataUrl,
        mimeType,
      });

      return jsonResponse(req, res, 200, result);
    } catch (error) {
      return jsonResponse(req, res, 500, {
        error: error.message || 'Falha interna ao transcrever a imagem da redacao.',
      });
    }
  }

  if (
    req.method === 'POST' &&
    (req.url === '/api/generate-flashcards' || req.url === '/api/ai/generate-flashcards')
  ) {
    try {
      const body = await readBody(req);
      const text = String(body?.text || '').trim();
      const disciplina = String(body?.disciplina || '').trim();
      const maxCards = Math.min(Math.max(Number(body?.maxCards) || 10, 1), 30);

      if (!text) {
        return jsonResponse(req, res, 400, { error: 'Envie o texto para gerar flashcards.' });
      }

      const result = await generateFlashcards({ text, disciplina, maxCards });
      return jsonResponse(req, res, 200, result);
    } catch (error) {
      return jsonResponse(req, res, 500, { error: error.message || 'Falha ao gerar flashcards.' });
    }
  }

  if (req.method === 'POST' && (req.url === '/api/summarize-topic' || req.url === '/api/ai/summarize-topic')) {
    try {
      const body = await readBody(req);
      const text = String(body?.text || '').trim();
      const topico = String(body?.topico || '').trim();
      const disciplina = String(body?.disciplina || '').trim();

      if (!text) {
        return jsonResponse(req, res, 400, { error: 'Envie o texto para resumir.' });
      }

      const result = await summarizeTopic({ text, topico, disciplina });
      return jsonResponse(req, res, 200, result);
    } catch (error) {
      return jsonResponse(req, res, 500, { error: error.message || 'Falha ao resumir o topico.' });
    }
  }

  if (req.method === 'POST' && (req.url === '/api/explain-question' || req.url === '/api/ai/explain-question')) {
    try {
      const body = await readBody(req);
      const enunciado = String(body?.enunciado || body?.statement || '').trim();

      if (!enunciado) {
        return jsonResponse(req, res, 400, { error: 'Envie o enunciado da questao para explicar.' });
      }

      const result = await explainQuestion(body);
      return jsonResponse(req, res, 200, result);
    } catch (error) {
      return jsonResponse(req, res, 500, { error: error.message || 'Falha ao explicar a questao.' });
    }
  }

  if (req.method === 'POST' && (req.url === '/api/generate-schedule' || req.url === '/api/ai/generate-schedule')) {
    try {
      const body = await readBody(req);
      const result = await generateStudySchedule(body);
      return jsonResponse(req, res, 200, result);
    } catch (error) {
      return jsonResponse(req, res, 500, { error: error.message || 'Falha ao gerar cronograma.' });
    }
  }

  return jsonResponse(req, res, 404, { error: 'Rota nao encontrada.' });
});

server.listen(PORT, () => {
  console.log(`Servidor de IA de editais ativo em http://localhost:${PORT}`);
  console.log(`Provider ativo: ${AI_PROVIDER}`);
  if (AI_PROVIDER === 'ollama') {
    console.log(`Ollama esperado em ${OLLAMA_BASE_URL} com modelo ${OLLAMA_MODEL}`);
  }
});
