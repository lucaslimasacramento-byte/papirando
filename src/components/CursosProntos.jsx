import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpenCheck, ChevronRight, FileText, Layers, ListChecks, Loader2 } from 'lucide-react';
import CourseMaterialsPanel from './CourseMaterialsPanel';
import { toast } from '../lib/toast';
import { normalizeContestTemplate } from '../lib/contestCatalogApi';
import { loadCoursePackageSummary, loadPackageContestTemplate } from '../lib/coursePackagesApi';
import { goToPracticeStep } from '../lib/trailNavigation';

/**
 * Vitrine de cursos prontos (pacotes com material da plataforma). O aluno adere em vez de
 * montar o próprio curso: a adesão libera os PDFs, copia os flashcards e cria o curso
 * em "Meus cursos" com as disciplinas e tópicos do concurso ligado ao pacote.
 */
export default function CursosProntos({
  packages = [],
  enrolledIds = [],
  isAdmin = false,
  catalog = [],
  cursos = [],
  remainingCourseSlots = 1,
  onImportCatalogCourse,
  onEnrolled,
  setActiveTab,
}) {
  const [selectedId, setSelectedId] = useState(null);

  const visible = useMemo(
    () => packages.filter((pkg) => pkg.is_published || isAdmin),
    [packages, isAdmin]
  );
  const selected = visible.find((pkg) => pkg.id === selectedId) || null;

  // Depois da adesão: cria o curso do aluno a partir do concurso do pacote, se ainda não existir.
  const handleEnrolled = async (pkg, result) => {
    onEnrolled?.(result);
    if (!pkg.contest_template_id || !onImportCatalogCourse) return;
    try {
      const fromCatalog = catalog.find((item) => String(item.id) === String(pkg.contest_template_id));
      const raw = fromCatalog || (await loadPackageContestTemplate(pkg.contest_template_id));
      if (!raw) return;
      const template = fromCatalog || normalizeContestTemplate(raw);
      const jaTem = cursos.some((curso) =>
        [curso.slug, curso.nome, curso.plano].some((v) => v && (v === template.slug || v === template.nome || v === template.plano))
      );
      if (jaTem) return;
      if (remainingCourseSlots <= 0) {
        toast.info('Material liberado. Seu limite de cursos está cheio, então o curso não foi criado em Meus cursos.');
        return;
      }
      await onImportCatalogCourse(template);
      toast.success(`"${template.nome}" foi adicionado em Meus cursos com as disciplinas e tópicos.`);
    } catch (error) {
      console.warn('Falha ao criar o curso do aluno a partir do pacote.', error);
      toast.error('Material liberado, mas não conseguimos criar o curso em Meus cursos. Tente pelo catálogo.');
    }
  };

  if (selected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setSelectedId(null)}>
          <ArrowLeft size={13} /> Todos os cursos prontos
        </button>
        {selected.descricao ? (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--pl-ink-2)', maxWidth: 760 }}>{selected.descricao}</p>
        ) : null}
        <CourseMaterialsPanel
          course={selected}
          enrolled={enrolledIds.includes(selected.id)}
          isAdmin={isAdmin}
          onEnrolled={(result) => handleEnrolled(selected, result)}
          onNavigate={setActiveTab ? (step, topic) => goToPracticeStep(setActiveTab, step, topic) : undefined}
        />
      </div>
    );
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <p className="pl-eyebrow" style={{ margin: 0 }}>Cursos prontos</p>
        <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--pl-ink-2)', maxWidth: 680 }}>
          Cursos montados pela equipe Papirando, com PDF completo, mapa mental, resumo, simulado e slides de cada tema,
          questões comentadas e flashcards. Você adere e o curso já aparece pronto nos seus estudos.
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="pl-card-paper" style={{ padding: '28px 24px', textAlign: 'center', borderRadius: 6 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)' }}>Nenhum curso pronto disponível ainda.</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--pl-ink-3)' }}>Os primeiros cursos estão em preparação.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 14 }}>
          {visible.map((pkg) => (
            <CursoProntoCard
              key={pkg.id}
              pkg={pkg}
              enrolled={enrolledIds.includes(pkg.id)}
              isAdmin={isAdmin}
              onOpen={() => setSelectedId(pkg.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CursoProntoCard({ pkg, enrolled, isAdmin, onOpen }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadCoursePackageSummary(pkg)
      .then((s) => { if (!cancelled) setSummary(s); })
      .catch(() => { if (!cancelled) setSummary({ materias: [], temas: 0, pdfs: 0, questoes: 0 }); });
    return () => { cancelled = true; };
  }, [pkg]);

  const stats = summary
    ? [
        { icon: Layers, label: `${summary.materias.length} ${summary.materias.length === 1 ? 'matéria' : 'matérias'} · ${summary.temas} temas` },
        { icon: FileText, label: `${summary.pdfs} PDFs` },
        { icon: ListChecks, label: `${summary.questoes} questões comentadas` },
      ]
    : [];

  return (
    <article className="pl-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderTop: '3px solid var(--pl-accent)' }}>
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span className="pl-tag pl-tag-accent">Curso Papirando</span>
          {enrolled ? <span className="pl-tag pl-tag-success">Você aderiu</span> : null}
          {!pkg.is_published && isAdmin ? <span className="pl-tag pl-tag-warn">Rascunho · só admin</span> : null}
        </div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--pl-ink)' }}>{pkg.titulo}</h3>
        {pkg.descricao ? (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--pl-ink-3)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {pkg.descricao}
          </p>
        ) : null}
        {summary ? (
          <>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {stats.map(({ icon: Icon, label }) => (
                <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--pl-ink-2)' }}>
                  <Icon size={13} style={{ color: 'var(--pl-ink-3)' }} /> {label}
                </li>
              ))}
            </ul>
            {summary.materias.length > 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--pl-ink-3)' }}>{summary.materias.join(' · ')}</p>
            ) : null}
          </>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--pl-ink-3)' }}>
            <Loader2 size={13} className="animate-spin" /> Carregando conteúdo…
          </span>
        )}
      </div>
      <div style={{ borderTop: '1px solid var(--pl-rule)', padding: '12px 18px' }}>
        <button type="button" className={`pl-btn pl-btn-sm ${enrolled ? 'pl-btn-ghost' : 'pl-btn-primary'}`} onClick={onOpen} style={{ width: '100%', justifyContent: 'center' }}>
          {enrolled ? <><BookOpenCheck size={13} /> Abrir material</> : <>Ver curso e aderir <ChevronRight size={13} /></>}
        </button>
      </div>
    </article>
  );
}
