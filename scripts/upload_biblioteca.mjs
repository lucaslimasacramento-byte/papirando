// Sobe o material de UMA matéria do acervo Papirando para a plataforma:
//   - temas         → library_topics (+ disciplina/tópicos no contest_template do curso)
//   - questões      → questions (source='papirando', external_id='pap-...', raw = JSON nativo)
//   - flashcards    → library_flashcards (id do acervo como chave)
//   - PDFs (5/tema) → bucket course-materials + course_package_materials (versão com a assinatura do curso)
//
// Uso:
//   node scripts/upload_biblioteca.mjs --materia "Atualidades" [--curso pmba-soldado] [--edicao PM-BA]
//        [--tema 01] [--only temas,questoes,flashcards,pdfs] [--dry-run]
//
// Pré-requisitos: migração supabase/migrations/202610130001_pacotes_curso_biblioteca.sql aplicada,
// curso criado (supabase/seed_curso_pmba_soldado.sql) e chaves em .env.local
// (SUPABASE_SERVICE_ROLE_KEY e SUPABASE_ACCESS_TOKEN).
//
// Idempotente: questões não duplicam (source+external_id), flashcards usam o id do acervo,
// PDFs nunca sobrescrevem objeto existente no Storage (relata conflito).
import fs from 'node:fs';
import path from 'node:path';
import {
  requireCredentials, sql, lit, jsonLit, slugify, storageUpload, storageObjectExists,
} from './lib/supabaseAdmin.mjs';

const DEFAULT_ACERVO = 'D:\\Estratégia\\04. PM-BA (Soldado) Pacotaço - Pacote Teórico, Pacote Passo Estratégico\\_Papirando';
const KINDS = [
  { n: 1, kind: 'pdf_completo', label: 'PDF Completo', match: /1\. PDF Completo\.pdf$/i },
  { n: 2, kind: 'mapa_mental', label: 'Mapa Mental', match: /2\. Mapa Mental\.pdf$/i },
  { n: 3, kind: 'resumo', label: 'Resumo', match: /3\. Resumo\.pdf$/i },
  { n: 4, kind: 'simulado', label: 'Simulado', match: /4\. Simulado\.pdf$/i },
  { n: 5, kind: 'slides', label: 'Slides', match: /5\. Slides\.pdf$/i },
];
const BATCH = 40;

// ── args ──────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { curso: 'pmba-soldado', edicao: 'PM-BA', only: null, dryRun: false, tema: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--materia') out.materia = argv[++i];
    else if (a === '--curso') out.curso = argv[++i];
    else if (a === '--edicao') out.edicao = argv[++i];
    else if (a === '--tema') out.tema = argv[++i];
    else if (a === '--acervo') out.acervo = argv[++i];
    else if (a === '--only') out.only = new Set(argv[++i].split(',').map((s) => s.trim()));
    else if (a === '--dry-run') out.dryRun = true;
    else throw new Error(`Argumento desconhecido: ${a}`);
  }
  if (!out.materia) throw new Error('Informe --materia "<nome da matéria>"');
  out.acervo = out.acervo || process.env.PAPIRANDO_ACERVO || DEFAULT_ACERVO;
  return out;
}

const args = parseArgs(process.argv.slice(2));
const want = (step) => !args.only || args.only.has(step);
const log = (...m) => console.log(...m);
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// ── leitura do acervo ─────────────────────────────────────────────────────────
const bibDir = path.join(args.acervo, 'Biblioteca', args.materia);
const edDir = path.join(args.acervo, 'Edições', args.edicao, args.materia);
const importFile = path.join(args.acervo, 'Para subir na plataforma', `Papirando - IMPORTAR - ${args.materia}.json`);
for (const p of [bibDir, importFile]) if (!fs.existsSync(p)) throw new Error(`Não encontrado: ${p}`);

// Temas: uma pasta "NN - Nome" por tema; o nome de exibição vem do campo "tema" do Questões.json.
const temaDirs = fs.readdirSync(bibDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d{2} - /.test(d.name))
  .map((d) => d.name)
  .sort();

const temas = temaDirs.map((dir) => {
  const nn = dir.slice(0, 2);
  const qFile = fs.readdirSync(path.join(bibDir, dir)).find((f) => /Questões\.json$/i.test(f));
  if (!qFile) throw new Error(`Sem Questões.json em ${dir}`);
  const tema = norm(readJson(path.join(bibDir, dir, qFile)).tema);
  if (!tema) throw new Error(`Campo "tema" vazio em ${dir}/${qFile}`);
  const isBahia = /módulo bahia/i.test(dir);
  return { nn, dir, tema, ordem: Number(nn), uf: isBahia ? 'BA' : null, slug: `${slugify(args.materia)}/${nn}-${slugify(tema)}` };
}).filter((t) => !args.tema || t.nn === args.tema.padStart(2, '0'));

const temaByName = new Map(temas.map((t) => [t.tema, t]));

// Questões: arquivo IMPORTAR (formato do Admin) + dados nativos (Banco + Notebook) casados pelo enunciado.
const nativeFiles = fs.readdirSync(bibDir).filter((f) => /^Papirando - (Banco de Questões - .*|.* - Questões Notebook)\.json$/i.test(f));
const nativeByEnunciado = new Map();
for (const f of nativeFiles) {
  const data = readJson(path.join(bibDir, f));
  for (const q of data.questoes || []) nativeByEnunciado.set(norm(q.enunciado), q);
}
const imported = readJson(importFile).filter((q) => temaByName.has(norm(q.topico)));

// Flashcards: JSON consolidado da matéria.
const fcFile = path.join(bibDir, `Papirando - ${args.materia} - Flashcards.json`);
const flashcards = fs.existsSync(fcFile)
  ? readJson(fcFile).cartoes.filter((c) => temaByName.has(norm(c.tema)))
  : [];

// PDFs da edição do curso (assinatura do curso).
function listPdfs(t) {
  const dir = path.join(edDir, t.dir);
  if (!fs.existsSync(dir)) return { missing: KINDS.map((k) => `${t.dir}/${k.label}`), files: [] };
  const names = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf'));
  const files = [];
  const missing = [];
  for (const k of KINDS) {
    const name = names.find((f) => k.match.test(f));
    if (!name) { missing.push(`${t.dir}/${k.label}`); continue; }
    files.push({
      ...k,
      file: path.join(dir, name),
      title: `${t.tema} — ${k.label}`,
      storagePath: `${args.curso}/${slugify(args.materia)}/${t.nn}-${slugify(t.tema)}/${k.n}-${slugify(k.label)}.pdf`,
    });
  }
  return { files, missing };
}

// ── resumo local ──────────────────────────────────────────────────────────────
log(`\n▶ Matéria: ${args.materia} | curso: ${args.curso} | edição PDFs: ${args.edicao}${args.dryRun ? ' | DRY-RUN' : ''}`);
const unmatched = imported.filter((q) => !nativeByEnunciado.has(norm(q.enunciado)));
log(`  temas: ${temas.length} | questões: ${imported.length} (sem par nativo: ${unmatched.length}) | flashcards: ${flashcards.length}`);
for (const t of temas) {
  const { files, missing } = listPdfs(t);
  const nq = imported.filter((q) => norm(q.topico) === t.tema).length;
  const nf = flashcards.filter((c) => norm(c.tema) === t.tema).length;
  log(`  ${t.nn} ${t.tema}${t.uf ? ` [${t.uf}]` : ''}: PDFs ${files.length}/5, questões ${nq}, flashcards ${nf}${missing.length ? ` | FALTA: ${missing.join(', ')}` : ''}`);
}
if (unmatched.length) log(`  ⚠ ${unmatched.length} questões sem par nativo (sobem sem external_id do acervo; id derivado do conteúdo).`);

if (args.dryRun) {
  log('\nDry-run: nada foi enviado.');
  process.exit(0);
}

requireCredentials();

// ── curso ─────────────────────────────────────────────────────────────────────
const [course] = await sql(`select id, titulo, contest_template_id from course_packages where slug = ${lit(args.curso)}`);
if (!course) throw new Error(`Curso "${args.curso}" não existe. Rode supabase/seed_curso_pmba_soldado.sql primeiro.`);

const report = { temas: 0, questoes: { inseridas: 0, ja_existiam: 0 }, flashcards: 0, pdfs: { enviados: 0, ja_existiam: 0, conflitos: [], falhas: [] } };

// ── temas + vínculo com o curso/concurso ─────────────────────────────────────
const topicIds = new Map();
if (want('temas') || want('questoes') || want('flashcards') || want('pdfs')) {
  const values = temas.map((t) => `(${lit(args.materia)}, ${lit(t.tema)}, ${lit(t.slug)}, ${lit(t.uf)}, ${t.ordem})`).join(',\n');
  const rows = await sql(`
    insert into library_topics (materia, tema, slug, uf, ordem)
    values ${values}
    on conflict (materia, tema) do update set slug = excluded.slug, uf = excluded.uf, ordem = excluded.ordem, updated_at = now()
    returning id, tema`);
  for (const r of rows) topicIds.set(r.tema, r.id);
  report.temas = rows.length;

  const [{ max_ordem }] = await sql(`select coalesce(max(ordem), -1) as max_ordem from course_package_subjects where package_id = ${lit(course.id)}`);
  await sql(`insert into course_package_subjects (package_id, materia, ordem) values (${lit(course.id)}, ${lit(args.materia)}, ${Number(max_ordem) + 1})
             on conflict (package_id, materia) do nothing`);

  // Disciplina + tópicos no concurso do catálogo (para aparecer em "Disciplinas e tópicos").
  if (course.contest_template_id) {
    const tpl = lit(course.contest_template_id);
    let [subject] = await sql(`select id from contest_template_subjects where template_id = ${tpl} and nome = ${lit(args.materia)}`);
    if (!subject) {
      [subject] = await sql(`
        insert into contest_template_subjects (template_id, nome, ordem)
        values (${tpl}, ${lit(args.materia)}, (select coalesce(max(ordem), -1) + 1 from contest_template_subjects where template_id = ${tpl}))
        returning id`);
    }
    const existing = new Set((await sql(`select nome from contest_template_topics where subject_id = ${lit(subject.id)}`)).map((r) => r.nome));
    const novos = temas.filter((t) => !existing.has(t.tema));
    if (novos.length) {
      await sql(`insert into contest_template_topics (subject_id, nome, ordem) values ${novos.map((t) => `(${lit(subject.id)}, ${lit(t.tema)}, ${t.ordem})`).join(',')}`);
    }
    await sql(`update contest_templates set subjects_count = (select count(*) from contest_template_subjects where template_id = ${tpl}), updated_at = now() where id = ${tpl}`);
  }
  log(`✔ temas: ${report.temas}`);
}

// ── questões ──────────────────────────────────────────────────────────────────
function difficultyToEnglish(d) {
  return { Facil: 'easy', Media: 'medium', Dificil: 'hard' }[d] || null;
}

function buildQuestionRow(q) {
  const native = nativeByEnunciado.get(norm(q.enunciado));
  const t = temaByName.get(norm(q.topico));
  const commentsByLetter = new Map((native?.alternativas || []).map((a) => [String(a.letra), norm(a.comentario)]));
  const alternativas = q.alternativas.map((a) => {
    const comentario = commentsByLetter.get(String(a.id));
    return comentario ? { ...a, comentario } : a;
  });
  const externalId = native?.id || `pap-${slugify(args.materia)}-${slugify(q.enunciado).slice(0, 80)}`;
  return {
    disciplina: q.disciplina,
    topico: q.topico,
    banca: '',
    cargo: '',
    ano: String(q.ano || ''),
    plano: '',
    tipo: q.tipo,
    enunciado: q.enunciado,
    alternativas,
    gabarito: q.gabarito,
    explicacao: q.explicacao,
    dificuldade: q.dificuldade,
    is_public: q.is_public !== false,
    external_id: externalId,
    source: 'papirando',
    year: Number(q.ano) || null,
    discipline: q.disciplina,
    topic: q.topico,
    subject: native?.assunto || null,
    raw: native ? { ...native, uf: native.uf ?? t?.uf ?? null } : { uf: t?.uf ?? null },
  };
}

if (want('questoes')) {
  const rows = imported.map(buildQuestionRow);
  const ids = new Set();
  for (const r of rows) {
    if (ids.has(r.external_id)) throw new Error(`external_id duplicado no lote: ${r.external_id}`);
    ids.add(r.external_id);
  }
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const values = chunk.map((r) => `(${[
      lit(r.disciplina), lit(r.topico), lit(r.banca), lit(r.cargo), lit(r.ano), lit(r.plano), lit(r.tipo),
      lit(r.enunciado), jsonLit(r.alternativas), lit(r.gabarito), lit(r.explicacao), lit(r.dificuldade),
      r.is_public ? 'true' : 'false', lit(r.external_id), lit(r.source), r.year ?? 'null',
      lit(r.discipline), lit(r.topic), lit(r.subject), jsonLit(r.raw),
    ].join(', ')})`).join(',\n');
    const inserted = await sql(`
      insert into questions (disciplina, topico, banca, cargo, ano, plano, tipo, enunciado, alternativas, gabarito,
                             explicacao, dificuldade, is_public, external_id, source, year, discipline, topic, subject, raw)
      select v.* from (values ${values}) as v(disciplina, topico, banca, cargo, ano, plano, tipo, enunciado, alternativas, gabarito,
                             explicacao, dificuldade, is_public, external_id, source, year, discipline, topic, subject, raw)
      where not exists (select 1 from questions q where q.disciplina = v.disciplina and q.enunciado = v.enunciado)
      on conflict (source, external_id) do nothing
      returning id`);
    report.questoes.inseridas += inserted.length;
    report.questoes.ja_existiam += chunk.length - inserted.length;
  }
  log(`✔ questões: ${report.questoes.inseridas} inseridas, ${report.questoes.ja_existiam} já existiam`);
}

// ── flashcards ────────────────────────────────────────────────────────────────
if (want('flashcards') && flashcards.length) {
  const ordemPorTema = new Map();
  const rows = flashcards.map((c) => {
    const tema = norm(c.tema);
    const ordem = (ordemPorTema.get(tema) || 0) + 1;
    ordemPorTema.set(tema, ordem);
    return { id: c.id, topic_id: topicIds.get(tema), frente: c.frente, verso: c.verso, uf: c.uf || null, ordem };
  });
  for (let i = 0; i < rows.length; i += BATCH * 2) {
    const chunk = rows.slice(i, i + BATCH * 2);
    const values = chunk.map((r) => `(${lit(r.id)}, ${lit(r.topic_id)}::uuid, ${lit(r.frente)}, ${lit(r.verso)}, ${lit(r.uf)}, ${r.ordem})`).join(',\n');
    const res = await sql(`
      insert into library_flashcards (id, topic_id, frente, verso, uf, ordem)
      values ${values}
      on conflict (id) do update set topic_id = excluded.topic_id, frente = excluded.frente, verso = excluded.verso,
        uf = excluded.uf, ordem = excluded.ordem, updated_at = now()
      returning id`);
    report.flashcards += res.length;
  }
  log(`✔ flashcards: ${report.flashcards}`);
}

// ── PDFs ──────────────────────────────────────────────────────────────────────
if (want('pdfs')) {
  const registered = new Set((await sql(`select storage_path from course_package_materials where package_id = ${lit(course.id)}`)).map((r) => r.storage_path));
  for (const t of temas) {
    const { files, missing } = listPdfs(t);
    for (const m of missing) report.pdfs.falhas.push(`arquivo não encontrado: ${m}`);
    for (const f of files) {
      try {
        const alreadyRegistered = registered.has(f.storagePath);
        let status;
        if (alreadyRegistered && await storageObjectExists('course-materials', f.storagePath)) {
          status = 'exists';
        } else {
          status = await storageUpload('course-materials', f.storagePath, fs.readFileSync(f.file), 'application/pdf');
        }
        if (status === 'exists' && !alreadyRegistered) {
          // Objeto existe no Storage mas não foi criado por este fluxo: não sobrescreve, pede decisão.
          report.pdfs.conflitos.push(f.storagePath);
          continue;
        }
        await sql(`
          insert into course_package_materials (package_id, topic_id, kind, title, storage_path, file_size, ordem)
          values (${lit(course.id)}, ${lit(topicIds.get(t.tema))}::uuid, ${lit(f.kind)}, ${lit(f.title)}, ${lit(f.storagePath)}, ${fs.statSync(f.file).size}, ${f.n})
          on conflict (package_id, topic_id, kind) do update set title = excluded.title, storage_path = excluded.storage_path,
            file_size = excluded.file_size, ordem = excluded.ordem, updated_at = now()`);
        if (status === 'uploaded') report.pdfs.enviados += 1; else report.pdfs.ja_existiam += 1;
      } catch (error) {
        report.pdfs.falhas.push(`${f.storagePath}: ${error.message}`);
      }
    }
  }
  log(`✔ PDFs: ${report.pdfs.enviados} enviados, ${report.pdfs.ja_existiam} já existiam, ${report.pdfs.conflitos.length} conflitos, ${report.pdfs.falhas.length} falhas`);
}

// ── conferência no banco ──────────────────────────────────────────────────────
const check = await sql(`
  select t.ordem, t.tema, t.uf,
    (select count(*) from course_package_materials m where m.topic_id = t.id and m.package_id = ${lit(course.id)}) as pdfs,
    (select count(*) from library_flashcards f where f.topic_id = t.id) as flashcards,
    (select count(*) from questions q where q.disciplina = t.materia and q.topico = t.tema) as questoes
  from library_topics t where t.materia = ${lit(args.materia)} order by t.ordem`);

log('\nConferência no banco:');
log('  tema | PDFs | flashcards (esperado) | questões (esperado)');
let ok = true;
for (const r of check) {
  const expQ = imported.filter((q) => norm(q.topico) === r.tema).length;
  const expF = flashcards.filter((c) => norm(c.tema) === r.tema).length;
  const inScope = temaByName.has(r.tema);
  const good = !inScope || (Number(r.pdfs) === 5 && Number(r.flashcards) === expF && Number(r.questoes) === expQ);
  if (!good) ok = false;
  log(`  ${good ? '✓' : '✗'} ${String(r.ordem).padStart(2, '0')} ${r.tema}${r.uf ? ` [${r.uf}]` : ''} | ${r.pdfs}/5 | ${r.flashcards} (${expF}) | ${r.questoes} (${expQ})`);
}
if (report.pdfs.conflitos.length) log(`\n⚠ Conflitos no Storage (não sobrescritos):\n  ${report.pdfs.conflitos.join('\n  ')}`);
if (report.pdfs.falhas.length) log(`\n✗ Falhas:\n  ${report.pdfs.falhas.join('\n  ')}`);

const outDir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'reports');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `upload_${slugify(args.materia)}_${new Date().toISOString().slice(0, 10)}.json`);
fs.writeFileSync(outFile, JSON.stringify({ args: { ...args, only: args.only ? [...args.only] : null }, report, check }, null, 2));
log(`\nRelatório salvo em ${outFile}`);
process.exit(ok && !report.pdfs.falhas.length && !report.pdfs.conflitos.length ? 0 : 1);
