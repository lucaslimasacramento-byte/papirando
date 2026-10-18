import { supabase } from './supabase';

// Pacotes de curso com material pronto (ex.: PM-BA Soldado). NÃO confundir com
// public.courses / coursesApi.js, que guardam os cursos montados pelo aluno.
// Tabelas: course_packages, course_package_subjects, course_package_materials,
// course_package_enrollments, library_topics, library_flashcards — ver
// supabase/migrations/202610130001_pacotes_curso_biblioteca.sql.

export const COURSE_MATERIALS_BUCKET = 'course-materials';

export const MATERIAL_KIND_LABELS = {
  pdf_completo: 'PDF completo',
  mapa_mental: 'Mapa mental',
  resumo: 'Resumo',
  simulado: 'Simulado',
  slides: 'Slides',
};

// Tabela ainda não criada (migração pendente) não deve quebrar telas existentes.
function isMissingRelation(error) {
  const code = String(error?.code || '');
  return code === '42P01' || code === 'PGRST205' || /does not exist|Could not find the table/i.test(String(error?.message || ''));
}

export async function loadCoursePackages() {
  const { data, error } = await supabase
    .from('course_packages')
    .select('id, slug, titulo, descricao, contest_template_id, is_published');
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

export async function loadMyPackageEnrollments(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('course_package_enrollments')
    .select('package_id, created_at')
    .eq('user_id', userId);
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

// Conteúdo do curso agrupado: matérias → temas → materiais (ordem 1..5).
export async function loadCoursePackageContent(course) {
  if (!course?.id) return { subjects: [] };

  const [{ data: subjects, error: subjectsError }, { data: materials, error: materialsError }] = await Promise.all([
    supabase.from('course_package_subjects').select('materia, ordem').eq('package_id', course.id).order('ordem'),
    supabase
      .from('course_package_materials')
      .select('id, topic_id, kind, title, storage_path, file_size, ordem')
      .eq('package_id', course.id)
      .order('ordem'),
  ]);
  if (subjectsError) throw subjectsError;
  if (materialsError) throw materialsError;

  const materias = (subjects || []).map((s) => s.materia);
  if (materias.length === 0) return { subjects: [] };

  const { data: topics, error: topicsError } = await supabase
    .from('library_topics')
    .select('id, materia, tema, uf, ordem')
    .in('materia', materias)
    .order('ordem');
  if (topicsError) throw topicsError;

  const materialsByTopic = new Map();
  for (const m of materials || []) {
    const list = materialsByTopic.get(m.topic_id) || [];
    list.push(m);
    materialsByTopic.set(m.topic_id, list);
  }

  return {
    subjects: (subjects || []).map((s) => ({
      materia: s.materia,
      topics: (topics || [])
        .filter((t) => t.materia === s.materia)
        .map((t) => ({ ...t, materials: (materialsByTopic.get(t.id) || []).sort((a, b) => a.ordem - b.ordem) })),
    })),
  };
}

// Contagem de questões por matéria/tema (questões são públicas para logados).
export async function loadQuestionCounts(materias = []) {
  if (materias.length === 0) return new Map();
  const { data, error } = await supabase
    .from('questions')
    .select('disciplina, topico')
    .in('disciplina', materias)
    .eq('is_public', true)
    .limit(5000);
  if (error) return new Map();
  const counts = new Map();
  for (const q of data || []) {
    const key = `${q.disciplina}|${q.topico}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

// Conteúdo completo + contagem de questões, numa chamada só (RPC course_package_overview).
// Fica em cache por alguns minutos: o card da vitrine e a tela do curso usam o mesmo
// resultado, e voltar à tela não refaz a consulta. Sem a RPC (migração pendente),
// cai no caminho antigo de várias consultas.
const OVERVIEW_TTL_MS = 5 * 60 * 1000;
const overviewCache = new Map();

function isMissingFunction(error) {
  const code = String(error?.code || '');
  return code === 'PGRST202' || code === '42883' || /could not find the function/i.test(String(error?.message || ''));
}

async function fetchCoursePackageOverview(course) {
  const { data, error } = await supabase.rpc('course_package_overview', { p_package_id: course.id });
  if (!error) {
    const subjects = (Array.isArray(data) ? data : []).map((s) => ({
      materia: s.materia,
      topics: (s.topics || []).map((t) => ({ ...t, materials: Array.isArray(t.materials) ? t.materials : [] })),
    }));
    const questionCounts = new Map();
    for (const s of subjects) for (const t of s.topics) questionCounts.set(`${s.materia}|${t.tema}`, Number(t.question_count || 0));
    return { subjects, questionCounts };
  }
  if (!isMissingFunction(error)) throw error;
  const content = await loadCoursePackageContent(course);
  const questionCounts = await loadQuestionCounts(content.subjects.map((s) => s.materia));
  return { subjects: content.subjects, questionCounts };
}

export function loadCoursePackageOverview(course, { force = false } = {}) {
  if (!course?.id) return Promise.resolve({ subjects: [], questionCounts: new Map() });
  const cached = overviewCache.get(course.id);
  if (!force && cached && Date.now() - cached.at < OVERVIEW_TTL_MS) return cached.promise;
  const promise = fetchCoursePackageOverview(course).catch((error) => {
    overviewCache.delete(course.id);
    throw error;
  });
  overviewCache.set(course.id, { at: Date.now(), promise });
  return promise;
}

export async function enrollInCoursePackage(courseSlug) {
  const { data, error } = await supabase.rpc('enroll_in_course_package', { p_package_slug: courseSlug });
  if (error) throw error;
  return data || {};
}

export async function getPackageMaterialUrl(storagePath, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(COURSE_MATERIALS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data?.signedUrl || '';
}

// Resumo para o card da vitrine (matérias, temas, PDFs, questões).
export async function loadCoursePackageSummary(course) {
  const { subjects, questionCounts: counts } = await loadCoursePackageOverview(course);
  const content = { subjects };
  const materias = content.subjects.map((s) => s.materia);
  let temas = 0;
  let pdfs = 0;
  for (const s of content.subjects) {
    temas += s.topics.length;
    for (const t of s.topics) pdfs += t.materials.length;
  }
  let questoes = 0;
  for (const n of counts.values()) questoes += n;
  return { materias, temas, pdfs, questoes };
}

// Concurso do catálogo ligado ao curso, para criar o curso do aluno em "Meus cursos".
// Admin enxerga rascunhos; aluno só os públicos (RLS).
export async function loadPackageContestTemplate(templateId) {
  if (!templateId) return null;
  const { data, error } = await supabase.from('contest_templates').select('*').eq('id', templateId).maybeSingle();
  if (error) throw error;
  return data || null;
}

// ── Trilha: progresso por tema e etapa ─────────────────────────────────────────
// Etapas na ordem da trilha. Os 5 primeiros são os PDFs do tema.
export const TRAIL_STEPS = ['pdf_completo', 'mapa_mental', 'resumo', 'slides', 'simulado', 'questoes', 'flashcards'];
export const TRAIL_STEP_LABELS = { ...MATERIAL_KIND_LABELS, questoes: 'Questões', flashcards: 'Flashcards' };

// Retorna { available, done:Set("topicId|step") }. available=false quando a tabela ainda não existe.
export async function loadPackageProgress(packageId, userId) {
  if (!packageId || !userId) return { available: false, done: new Set() };
  const { data, error } = await supabase
    .from('course_package_progress')
    .select('topic_id, step')
    .eq('package_id', packageId)
    .eq('user_id', userId);
  if (error) {
    if (isMissingRelation(error)) return { available: false, done: new Set() };
    throw error;
  }
  return { available: true, done: new Set((data || []).map((r) => `${r.topic_id}|${r.step}`)) };
}

export async function setPackageStepDone({ packageId, topicId, step, userId, done }) {
  if (done) {
    const { error } = await supabase
      .from('course_package_progress')
      .upsert({ user_id: userId, package_id: packageId, topic_id: topicId, step }, { onConflict: 'user_id,package_id,topic_id,step', ignoreDuplicates: true });
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('course_package_progress')
    .delete()
    .eq('user_id', userId)
    .eq('package_id', packageId)
    .eq('topic_id', topicId)
    .eq('step', step);
  if (error) throw error;
}
