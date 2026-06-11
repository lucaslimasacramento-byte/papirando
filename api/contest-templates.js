import { createClient } from '@supabase/supabase-js';

// SEC-021: ADMIN_EMAILS removido. Admin agora eh determinado exclusivamente por
// profiles.role='admin' (verificado via isAdminProfile abaixo).
const ADMIN_EMAILS = [];

function env(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

function normalizeBearerToken(value = '') {
  const token = String(value || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || token.length > 4096) return '';
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) ? token : '';
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    const rawBody = req.body.trim();
    return rawBody ? JSON.parse(rawBody) : {};
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function getSupabaseConfig() {
  return {
    url: env('SUPABASE_URL', env('VITE_SUPABASE_URL')).replace(/\/+$/, ''),
    anonKey: env('SUPABASE_ANON_KEY', env('VITE_SUPABASE_ANON_KEY')),
    serviceKey: env('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

async function requireUser(req, config) {
  const token = normalizeBearerToken(req.headers.authorization);
  if (!token) {
    const error = new Error('Faca login novamente para salvar concursos.');
    error.status = 401;
    throw error;
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = new Error('Sessao expirada. Faca login novamente.');
    error.status = 401;
    throw error;
  }

  return response.json();
}

function isTrustedRequestOrigin(req) {
  const raw = String(req.headers.origin || req.headers.referer || '').trim();
  if (!raw) return false;

  try {
    const host = new URL(raw).host.toLowerCase();
    return (
      host === 'papirando.vercel.app' ||
      host.endsWith('-lucaslimasacramento-bytes-projects.vercel.app') ||
      host === 'localhost:5173' ||
      host === 'localhost:5176' ||
      host === 'localhost:5177' ||
      host === '127.0.0.1:5173'
    );
  } catch {
    return false;
  }
}

function isAdminProfile(profile) {
  const role = String(profile?.role || '').trim().toLowerCase();
// SEC-002 + SEC-021: confia apenas em profiles.role. Sem fallback por dominio ou email hardcoded.
return ['admin', 'admin_master', 'master'].includes(role);}

async function requireAdmin(req, supabaseAdmin, config, body = {}) {
  let user = null;

  try {
    user = await requireUser(req, config);
  } catch (error) {
    const adminEmail = String(body?.adminEmail || '').trim().toLowerCase();
    if (isTrustedRequestOrigin(req) && ADMIN_EMAILS.includes(adminEmail)) {
      return { id: '', email: adminEmail, fallback: true };
    }
    throw error;
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id,email,role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!isAdminProfile(profile, user)) {
    const forbidden = new Error('Usuario sem permissao administrativa para salvar concursos.');
    forbidden.status = 403;
    throw forbidden;
  }

  return user;
}

function buildTemplateSlug(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function shouldRetryWithoutSubjectCatalogId(error) {
  return /subject_catalog_id/i.test(String(error?.message || error?.details || error?.hint || ''));
}

function stripSubjectCatalogId(rows = []) {
  return rows.map((row) => {
    const next = { ...row };
    delete next.subject_catalog_id;
    return next;
  });
}

async function saveContestTemplate(supabaseAdmin, templateData = {}, existingId = null) {
  const slug = buildTemplateSlug(templateData.slug || templateData.nome) || `template-${Date.now()}`;
  const isPublished = templateData.is_public !== false;
  const now = new Date().toISOString();
  const basePayload = {
    slug,
    nome: String(templateData.nome || '').trim(),
    plano: String(templateData.plano || templateData.nome || '').trim(),
    concurso: String(templateData.concurso || templateData.nome || '').trim(),
    area: templateData.area || 'Geral',
    cargo: templateData.cargo || '',
    banca: templateData.banca || 'A definir',
    salario: templateData.salario || null,
    inscricao_valor: templateData.inscricao_valor || null,
    escolaridade: templateData.escolaridade || null,
    vagas: templateData.vagas || null,
    lotacao: templateData.lotacao || null,
    etapas: templateData.etapas || null,
    etapas_tags: Array.isArray(templateData.etapas_tags) ? templateData.etapas_tags : [],
    taf_itens: Array.isArray(templateData.taf_itens) ? templateData.taf_itens : [],
    cor: templateData.cor || '#2563EB',
    origem: 'catalogo',
    status: isPublished ? 'ativo' : 'rascunho',
    is_public: isPublished,
    descricao: templateData.descricao || null,
    imagem_url: templateData.imagem_url || null,
    edital_url: templateData.edital_url || null,
    prova_data: templateData.prova_data || null,
    status_concurso: templateData.status_concurso || 'edital_publicado',
    updated_at: now,
  };

  let template = null;

  if (existingId) {
    const { data, error } = await supabaseAdmin
      .from('contest_templates')
      .update(basePayload)
      .eq('id', existingId)
      .select('*')
      .single();
    if (error) throw error;
    template = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('contest_templates')
      .insert({ ...basePayload, created_at: now })
      .select('*')
      .single();
    if (error) throw error;
    template = data;
  }

  const { data: existingSubjects, error: existingSubjectsError } = await supabaseAdmin
    .from('contest_template_subjects')
    .select('id')
    .eq('template_id', template.id);
  if (existingSubjectsError) throw existingSubjectsError;

  const existingSubjectIds = (existingSubjects || []).map((item) => item.id);
  if (existingSubjectIds.length > 0) {
    const { error: topicsDeleteError } = await supabaseAdmin
      .from('contest_template_topics')
      .delete()
      .in('subject_id', existingSubjectIds);
    if (topicsDeleteError) throw topicsDeleteError;
  }

  const { error: subjectsDeleteError } = await supabaseAdmin
    .from('contest_template_subjects')
    .delete()
    .eq('template_id', template.id);
  if (subjectsDeleteError) throw subjectsDeleteError;

  const disciplinas = (Array.isArray(templateData.disciplinas) ? templateData.disciplinas : [])
    .map((disciplina, index) => ({
      nome: String(typeof disciplina === 'string' ? disciplina : disciplina?.nome || '').trim(),
      subject_catalog_id: typeof disciplina === 'string' ? null : disciplina?.subject_catalog_id || null,
      cor: typeof disciplina === 'string' ? null : disciplina?.cor || null,
      ordem: Number(typeof disciplina === 'string' ? index : disciplina?.ordem ?? index),
      topicos: typeof disciplina === 'string' ? [] : disciplina?.topicos || [],
    }))
    .filter((disciplina) => disciplina.nome);

  let insertedSubjects = [];
  if (disciplinas.length > 0) {
    const subjectPayload = disciplinas.map((disciplina) => ({
      template_id: template.id,
      nome: disciplina.nome,
      subject_catalog_id: disciplina.subject_catalog_id,
      cor: disciplina.cor,
      ordem: disciplina.ordem,
    }));

    let { data, error } = await supabaseAdmin
      .from('contest_template_subjects')
      .insert(subjectPayload)
      .select('*');

    if (error && shouldRetryWithoutSubjectCatalogId(error)) {
      ({ data, error } = await supabaseAdmin
        .from('contest_template_subjects')
        .insert(stripSubjectCatalogId(subjectPayload))
        .select('*'));
    }

    if (error) throw error;
    insertedSubjects = data || [];
  }

  const topicPayload = insertedSubjects.flatMap((subject, subjectIndex) => {
    const disciplina = disciplinas[subjectIndex];
    return (disciplina?.topicos || []).map((topico, topicIndex) => ({
      subject_id: subject.id,
      nome: String(typeof topico === 'string' ? topico : topico?.nome || '').trim(),
      ordem: Number(typeof topico === 'string' ? topicIndex : topico?.ordem ?? topicIndex),
    })).filter((topico) => topico.nome);
  });

  if (topicPayload.length > 0) {
    const { error } = await supabaseAdmin.from('contest_template_topics').insert(topicPayload);
    if (error) throw error;
  }

  return template;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Metodo nao permitido.' });
  }

  try {
    const config = getSupabaseConfig();
    if (!config.url || !config.anonKey || !config.serviceKey) {
      return sendJson(res, 500, { error: 'Supabase administrativo nao configurado (faltam env vars no Vercel).' });
    }

    const supabaseAdmin = createClient(config.url, config.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await readJson(req);
    await requireAdmin(req, supabaseAdmin, config, body);
    const template = await saveContestTemplate(supabaseAdmin, body?.templateData || {}, body?.existingId || null);
    return sendJson(res, 200, { template });
  } catch (error) {
    const status = Number(error.status || 500);
    const message = error.message || 'Nao foi possivel salvar o concurso.';
    console.error('[contest-templates]', {
      status,
      message,
      details: error?.details,
      code: error?.code,
      hint: error?.hint,
    });
    return sendJson(res, status, {
      error: message,
      details: error?.details || undefined,
      code: error?.code || undefined,
      hint: error?.hint || undefined,
    });
  }
}
