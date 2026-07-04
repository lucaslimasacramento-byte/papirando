import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { supabase } from './supabase';
import { resolveAiHeaders } from './aiRuntime';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const REDACOES_STORAGE_KEY = 'papirando_redacoes';

function generateEssayId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `redacao-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function sanitizeText(value) {
  return String(value || '').replace(/\r/g, '').trim();
}

function countWords(text) {
  return sanitizeText(text)
    .split(/\s+/)
    .filter(Boolean).length;
}

function countParagraphs(text) {
  return sanitizeText(text)
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function estimateLineCount(text) {
  const words = countWords(text);
  if (!words) return 0;
  return Math.max(1, Math.round(words / 9));
}

function normalizeCriterion(value, fallbackLabel) {
  const payload = value && typeof value === 'object' ? value : {};
  const score = Math.max(0, Math.min(2.5, Number(payload.score || 0)));
  const maxScore = Math.max(0.5, Number(payload.maxScore || 2.5));

  return {
    label: String(payload.label || fallbackLabel).trim() || fallbackLabel,
    score: Number(score.toFixed(1)),
    maxScore: Number(maxScore.toFixed(1)),
    note: String(payload.note || '').trim(),
  };
}

function normalizeGrammarFeedback(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      const payload = item && typeof item === 'object' ? item : {};
      return {
        id: String(payload.id || `grammar-${index}`),
        excerpt: String(payload.excerpt || '').trim(),
        replacement: String(payload.replacement || '').trim(),
        reason: String(payload.reason || '').trim(),
      };
    })
    .filter((item) => item.excerpt || item.replacement || item.reason);
}

function normalizeShortList(items, max = 6) {
  return Array.isArray(items)
    ? items.map((item) => String(item || '').trim()).filter(Boolean).slice(0, max)
    : [];
}

export function normalizeRedacaoCorrection(value = {}) {
  const payload = value && typeof value === 'object' ? value : {};
  const criteria = {
    gramatica: normalizeCriterion(payload.criteria?.gramatica, 'Gramatica'),
    coesao: normalizeCriterion(payload.criteria?.coesao, 'Coesao'),
    tema: normalizeCriterion(payload.criteria?.tema, 'Tema'),
    estrutura: normalizeCriterion(payload.criteria?.estrutura, 'Estrutura'),
  };

  const totalScore = Object.values(criteria).reduce((acc, item) => acc + Number(item.score || 0), 0);

  return {
    overallScore: Number(Math.max(0, Math.min(10, Number(payload.overallScore ?? totalScore))).toFixed(1)),
    criteria,
    summary: String(payload.summary || '').trim(),
    strengths: normalizeShortList(payload.strengths, 5),
    improvements: normalizeShortList(payload.improvements, 6),
    priorityFixes: normalizeShortList(payload.priorityFixes || payload.priority_fixes, 6),
    actionPlan: normalizeShortList(payload.actionPlan || payload.action_plan, 6),
    bancaFit: String(payload.bancaFit || payload.banca_fit || '').trim(),
    lineDiagnosis: String(payload.lineDiagnosis || payload.line_diagnosis || '').trim(),
    grammarFeedback: normalizeGrammarFeedback(payload.grammarFeedback),
    source: String(payload.source || '').trim(),
    sourceLabel: String(payload.sourceLabel || '').trim(),
    model: String(payload.model || '').trim(),
    analyzedAt: payload.analyzedAt || new Date().toISOString(),
  };
}

export function normalizeRedacaoRecord(value = {}) {
  const payload = value && typeof value === 'object' ? value : {};
  const text = sanitizeText(payload.text || payload.final_text || payload.transcribed_text || payload.original_text);
  const correction = payload.correction ? normalizeRedacaoCorrection(payload.correction) : null;
  const score = correction ? Number(correction.overallScore || 0) : Number(payload.score || 0);
  const createdAt = payload.created_at || payload.createdAt || new Date().toISOString();
  const updatedAt = payload.updated_at || payload.updatedAt || createdAt;
  const correctedAt = payload.corrected_at || payload.correctedAt || (correction ? updatedAt : '');

  return {
    id: String(payload.id || generateEssayId()),
    user_id: String(payload.user_id || payload.userId || '').trim(),
    banca: String(payload.banca || 'CESPE / CEBRASPE').trim(),
    tema: String(payload.tema || '').trim(),
    status: String(payload.status || (correction ? 'corrected' : 'draft')).trim(),
    input_mode: String(payload.input_mode || payload.inputMode || 'text').trim(),
    text,
    original_text: sanitizeText(payload.original_text || payload.originalText || ''),
    transcribed_text: sanitizeText(payload.transcribed_text || payload.transcribedText || ''),
    attachment_url: String(payload.attachment_url || payload.attachmentUrl || '').trim(),
    attachment_path: String(payload.attachment_path || payload.attachmentPath || '').trim(),
    attachment_name: String(payload.attachment_name || payload.attachmentName || '').trim(),
    attachment_type: String(payload.attachment_type || payload.attachmentType || '').trim(),
    correction,
    score: Number(score.toFixed(1)),
    word_count: Number(payload.word_count || payload.wordCount || countWords(text)),
    paragraph_count: Number(payload.paragraph_count || payload.paragraphCount || countParagraphs(text)),
    line_count: Number(payload.line_count || payload.lineCount || estimateLineCount(text)),
    created_at: createdAt,
    updated_at: updatedAt,
    corrected_at: correctedAt || null,
  };
}

export function upsertRedacaoRecord(records = [], nextRecord) {
  const normalized = normalizeRedacaoRecord(nextRecord);
  const list = Array.isArray(records) ? records.map((item) => normalizeRedacaoRecord(item)) : [];
  const nextList = [normalized, ...list.filter((item) => String(item.id) !== normalized.id)];

  return nextList.sort(
    (first, second) =>
      new Date(second.updated_at || second.created_at || 0).getTime() -
      new Date(first.updated_at || first.created_at || 0).getTime()
  );
}

export function deleteRedacaoRecord(records = [], redacaoId = '') {
  return (Array.isArray(records) ? records : []).filter((item) => String(item?.id || '') !== String(redacaoId));
}

export function loadLocalRedacoes() {
  if (typeof localStorage === 'undefined') return [];

  try {
    const raw = localStorage.getItem(REDACOES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => normalizeRedacaoRecord(item)) : [];
  } catch (error) {
    console.warn('Redacoes locais invalidas. Reiniciando armazenamento local.', error);
    return [];
  }
}

export function saveLocalRedacoes(records = []) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(
    REDACOES_STORAGE_KEY,
    JSON.stringify((Array.isArray(records) ? records : []).map((item) => normalizeRedacaoRecord(item)))
  );
}

export function buildRedacaoSummary(records = []) {
  const normalized = (Array.isArray(records) ? records : []).map((item) => normalizeRedacaoRecord(item));
  const corrected = normalized.filter((item) => item.status === 'corrected' && item.correction);
  const drafts = normalized.filter((item) => item.status !== 'corrected');
  const averageScore =
    corrected.length > 0
      ? Number(
          (
            corrected.reduce((acc, item) => acc + Number(item.score || item.correction?.overallScore || 0), 0) /
            corrected.length
          ).toFixed(1)
        )
      : 0;
  const bestScore = corrected.reduce(
    (acc, item) => Math.max(acc, Number(item.score || item.correction?.overallScore || 0)),
    0
  );
  const topThemeMap = normalized.reduce((acc, item) => {
    const key = String(item.tema || '').trim();
    if (!key) return acc;
    acc.set(key, Number(acc.get(key) || 0) + 1);
    return acc;
  }, new Map());
  const topThemeEntry =
    [...topThemeMap.entries()].sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0], 'pt-BR'))[0] ||
    [];
  const latest = normalized[0] || null;

  return {
    total: normalized.length,
    corrected: corrected.length,
    drafts: drafts.length,
    averageScore,
    bestScore: Number(bestScore.toFixed(1)),
    topTheme: topThemeEntry[0] || '',
    topThemeCount: Number(topThemeEntry[1] || 0),
    latest,
    totalWords: normalized.reduce((acc, item) => acc + Number(item.word_count || 0), 0),
  };
}

export function buildEssayHeuristicCorrection({ text = '', tema = '', banca = '' } = {}) {
  const normalizedText = sanitizeText(text);
  const wordCount = countWords(normalizedText);
  const paragraphCount = countParagraphs(normalizedText);
  const lower = normalizedText.toLowerCase();
  const hasConclusionCue = /(portanto|logo|assim|dessa forma|conclui-se|em sintese|em suma)/i.test(normalizedText);
  const hasConnectiveCue = /(alem disso|nesse sentido|outrossim|sob esse vies|todavia|contudo|por outro lado)/i.test(
    normalizedText
  );
  const mentionsTheme =
    sanitizeText(tema) &&
    sanitizeText(tema)
      .toLowerCase()
      .split(/\s+/)
      .filter((item) => item.length > 4)
      .some((token) => lower.includes(token));

  const grammarScore = Math.max(0.8, Math.min(2.5, 0.8 + Math.min(wordCount, 320) / 220));
  const cohesionScore = Math.max(0.8, Math.min(2.5, 1 + (hasConnectiveCue ? 0.8 : 0.2) + paragraphCount * 0.12));
  const themeScore = Math.max(0.8, Math.min(2.5, 1 + (mentionsTheme ? 0.9 : 0.2) + Math.min(wordCount, 260) / 520));
  const structureScore = Math.max(
    0.8,
    Math.min(2.5, 0.9 + (paragraphCount >= 4 ? 0.9 : paragraphCount >= 3 ? 0.55 : 0.2) + (hasConclusionCue ? 0.5 : 0.1))
  );

  const criteria = {
    gramatica: {
      label: 'Gramatica',
      score: Number(grammarScore.toFixed(1)),
      maxScore: 2.5,
      note:
        wordCount >= 180
          ? 'Volume textual consistente; vale revisar pontuacao e concordancia fina.'
          : 'Texto curto demais pode esconder repertorio e maturidade argumentativa.',
    },
    coesao: {
      label: 'Coesao',
      score: Number(cohesionScore.toFixed(1)),
      maxScore: 2.5,
      note: hasConnectiveCue
        ? 'Ha conectivos claros entre as ideias.'
        : 'Faltam amarracoes mais visiveis entre os paragrafos.',
    },
    tema: {
      label: 'Tema',
      score: Number(themeScore.toFixed(1)),
      maxScore: 2.5,
      note: mentionsTheme
        ? 'O texto conversa com o tema proposto ao longo da argumentacao.'
        : 'A aderencia ao tema precisa ficar mais explicita nos argumentos.',
    },
    estrutura: {
      label: 'Estrutura',
      score: Number(structureScore.toFixed(1)),
      maxScore: 2.5,
      note:
        paragraphCount >= 4
          ? 'A divisao em paragrafos sustenta a leitura.'
          : 'Estruture introducao, desenvolvimento e conclusao com mais nitidez.',
    },
  };

  const strengths = [];
  const improvements = [];

  if (paragraphCount >= 4) strengths.push('A organizacao em paragrafos ajuda a leitura e a progressao argumentativa.');
  if (hasConnectiveCue) strengths.push('Ha uso perceptivel de conectivos para ligar as ideias.');
  if (mentionsTheme) strengths.push(`O desenvolvimento mantem proximidade com o tema "${tema || 'proposto'}".`);
  if (wordCount >= 180) strengths.push('A extensao do texto permite aprofundar melhor os argumentos.');

  if (!hasConclusionCue) improvements.push('Fortaleça a conclusao com fechamento claro e proposta de encaminhamento.');
  if (!hasConnectiveCue) improvements.push('Use conectivos mais visiveis entre os paragrafos para melhorar a coesao.');
  if (paragraphCount < 4) improvements.push('Expanda a estrutura para ao menos quatro paragrafos bem definidos.');
  if (!mentionsTheme && tema) improvements.push('Retome termos centrais do tema para evitar fuga parcial.');
  if (wordCount < 160) improvements.push('Aumente o repertorio e a densidade argumentativa do texto.');

  const grammarFeedback = [];
  if (!/[.!?]\s*$/.test(normalizedText)) {
    grammarFeedback.push({
      id: 'ending-punctuation',
      excerpt: 'Fechamento do texto',
      replacement: 'Finalize o ultimo periodo com pontuacao.',
      reason: 'O encerramento sem pontuacao passa sensacao de texto inacabado.',
    });
  }
  if (!/\n\s*\n/.test(normalizedText)) {
    grammarFeedback.push({
      id: 'paragraph-break',
      excerpt: 'Bloco unico de texto',
      replacement: 'Separe os paragrafos com quebra de linha dupla.',
      reason: 'A visualizacao e a estrutura argumentativa ficam mais claras.',
    });
  }

  const totalScore = Object.values(criteria).reduce((acc, item) => acc + Number(item.score || 0), 0);

  return normalizeRedacaoCorrection({
    overallScore: Number(Math.min(10, totalScore).toFixed(1)),
    criteria,
    summary: `Correcao heuristica para ${banca || 'banca nao informada'} com base em extensao, coesao, aderencia ao tema e estrutura global do texto.`,
    strengths,
    improvements,
    grammarFeedback,
    source: 'heuristic',
    sourceLabel: 'Analise local',
    model: 'Heuristica Papirando',
    analyzedAt: new Date().toISOString(),
  });
}

function buildSafeFileName(fileName) {
  return String(fileName || 'arquivo')
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function getStoragePathFromUrl(url, bucket) {
  if (!url || !bucket) return '';

  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return '';
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return '';
  }
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Nao foi possivel ler o arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}

export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let index = 1; index <= pdf.numPages; index += 1) {
    const page = await pdf.getPage(index);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => String(item?.str || '').trim())
      .filter(Boolean)
      .join(' ');
    pages.push(text);
  }

  return pages.join('\n\n').trim();
}

export async function extractTextFromPlainFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').trim());
    reader.onerror = () => reject(new Error('Nao foi possivel ler o arquivo de texto.'));
    reader.readAsText(file);
  });
}

export async function transcribeEssayImageWithAI(file) {
  const dataUrl = await fileToDataUrl(file);
  const response = await fetch('/api/ai/transcribe-essay', {
    method: 'POST',
    headers: await resolveAiHeaders(),
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      dataUrl,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Nao foi possivel transcrever a imagem com IA.');
  }

  return {
    text: sanitizeText(payload?.text || payload?.transcribedText || ''),
    source: String(payload?.source || '').trim(),
    sourceLabel: String(payload?.sourceLabel || '').trim(),
    model: String(payload?.model || '').trim(),
    warning: String(payload?.warning || '').trim(),
  };
}

export async function analyzeRedacaoWithRealAI({ text, tema, banca }) {
  const response = await fetch('/api/ai/analyze-essay', {
    method: 'POST',
    headers: await resolveAiHeaders(),
    body: JSON.stringify({ text, tema, banca }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Nao foi possivel corrigir a redacao com IA.');
  }

  return normalizeRedacaoCorrection({
    ...(payload?.analysis || {}),
    source: payload?.source || payload?.provider || payload?.analysis?.source,
    sourceLabel: payload?.sourceLabel || payload?.analysis?.sourceLabel,
    model: payload?.model || payload?.analysis?.model,
    analyzedAt: payload?.analysis?.analyzedAt || new Date().toISOString(),
  });
}

export async function loadRedacoesFromSupabase({ userId, fallbackRecords = [] }) {
  if (!userId) {
    return {
      records: (Array.isArray(fallbackRecords) ? fallbackRecords : []).map((item) => normalizeRedacaoRecord(item)),
      mode: 'local',
      schemaReady: false,
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from('essay_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const normalizedRecords = Array.isArray(data) ? data.map((item) => normalizeRedacaoRecord(item)) : [];

    return {
      records:
        normalizedRecords.length > 0
          ? normalizedRecords
          : (Array.isArray(fallbackRecords) ? fallbackRecords : []).map((item) => normalizeRedacaoRecord(item)),
      mode: 'remote',
      schemaReady: true,
      error: null,
    };
  } catch (error) {
    console.error('Erro ao carregar redacoes do Supabase:', error);
    return {
      records: (Array.isArray(fallbackRecords) ? fallbackRecords : []).map((item) => normalizeRedacaoRecord(item)),
      mode: 'local',
      schemaReady: false,
      error,
    };
  }
}

const REDACAO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const REDACAO_MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function uploadRedacaoAttachment({ file, userId, existingUrl = '' }) {
  if (!file || !userId) {
    return {
      attachment_url: '',
      attachment_path: '',
      attachment_name: '',
      attachment_type: '',
    };
  }

  // Blindagem: valida tipo real e tamanho antes do upload. O accept do <input>
  // e' apenas cosmetico e burlavel; o bucket e' publico, entao um .html/.svg
  // com script seria servido como conteudo executavel sob a marca.
  if (!REDACAO_ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Tipo de arquivo nao permitido. Envie uma imagem (JPG, PNG, WEBP) ou PDF.');
  }
  if (file.size > REDACAO_MAX_BYTES) {
    throw new Error('Arquivo muito grande. O limite e 10MB.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const safeBaseName = buildSafeFileName(file.name) || 'redacao';
  const filePath = `${userId}/${Date.now()}-${safeBaseName}.${extension}`;

  const { error: uploadError } = await supabase.storage.from('essay-uploads').upload(filePath, file, {
    upsert: false,
    contentType: file.type || undefined,
  });

  if (uploadError) throw uploadError;

  const oldPath = getStoragePathFromUrl(existingUrl, 'essay-uploads');
  if (oldPath) {
    const { error: removeError } = await supabase.storage.from('essay-uploads').remove([oldPath]);
    if (removeError) {
      console.warn('Nao foi possivel remover o anexo anterior da redacao:', removeError);
    }
  }

  const { data } = supabase.storage.from('essay-uploads').getPublicUrl(filePath);
  return {
    attachment_url: data?.publicUrl || '',
    attachment_path: filePath,
    attachment_name: file.name,
    attachment_type: file.type || '',
  };
}

export async function saveRedacaoToSupabase({ userId, redacao }) {
  if (!userId) throw new Error('Usuario nao autenticado.');

  const normalized = normalizeRedacaoRecord({ ...redacao, user_id: userId });
  const payload = {
    id: normalized.id,
    user_id: userId,
    banca: normalized.banca,
    tema: normalized.tema,
    status: normalized.status,
    input_mode: normalized.input_mode,
    text: normalized.text,
    original_text: normalized.original_text,
    transcribed_text: normalized.transcribed_text,
    attachment_url: normalized.attachment_url,
    attachment_path: normalized.attachment_path,
    attachment_name: normalized.attachment_name,
    attachment_type: normalized.attachment_type,
    correction: normalized.correction,
    score: normalized.score,
    word_count: normalized.word_count,
    paragraph_count: normalized.paragraph_count,
    line_count: normalized.line_count,
    created_at: normalized.created_at,
    updated_at: new Date().toISOString(),
    corrected_at: normalized.corrected_at,
  };

  const { data, error } = await supabase
    .from('essay_submissions')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return normalizeRedacaoRecord(data || payload);
}

export async function deleteRedacaoFromSupabase({ redacaoId, attachmentPath = '' }) {
  if (!redacaoId) return;

  const { error } = await supabase.from('essay_submissions').delete().eq('id', redacaoId);
  if (error) throw error;

  if (attachmentPath) {
    const { error: storageError } = await supabase.storage.from('essay-uploads').remove([attachmentPath]);
    if (storageError) {
      console.warn('Nao foi possivel remover o anexo da redacao:', storageError);
    }
  }
}
