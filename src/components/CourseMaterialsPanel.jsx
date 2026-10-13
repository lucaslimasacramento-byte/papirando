import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpenCheck,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  Loader2,
  Lock,
  MapPin,
  Presentation,
  ListChecks,
  Network,
  NotebookText,
  X,
} from 'lucide-react';
import PdfScrollViewer from './PdfScrollViewer';
import { toast } from '../lib/toast';
import {
  MATERIAL_KIND_LABELS,
  enrollInCoursePackage,
  getPackageMaterialUrl,
  loadCoursePackageContent,
  loadQuestionCounts,
} from '../lib/coursePackagesApi';

const KIND_ICONS = {
  pdf_completo: FileText,
  mapa_mental: Network,
  resumo: NotebookText,
  simulado: ListChecks,
  slides: Presentation,
};

function PdfModal({ material, onClose }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getPackageMaterialUrl(material.storage_path)
      .then((signed) => { if (!cancelled) setUrl(signed); })
      .catch(() => { if (!cancelled) setError('Não foi possível abrir este material.'); });
    return () => { cancelled = true; };
  }, [material.storage_path]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Portal: ancestrais com transform/animation (ex.: .pl-card) prenderiam o position:fixed.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={material.title}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,17,13,0.70)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(0px, 2vw, 24px)' }}
      onClick={onClose}
    >
      <div
        className="pl-card"
        onClick={(event) => event.stopPropagation()}
        style={{ width: 'min(1100px, 100%)', height: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--pl-rule)' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{material.title}</p>
          <button type="button" onClick={onClose} className="pl-btn pl-btn-ghost pl-btn-sm" aria-label="Fechar" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, background: 'var(--pl-bg-soft)' }}>
          {error ? (
            <p style={{ padding: 24, color: 'var(--pl-danger)', fontSize: 13 }}>{error}</p>
          ) : url ? (
            <PdfScrollViewer url={url} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--pl-ink-3)' }}>
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Material completo de um curso (PDFs por tema + contagem de questões/flashcards)
 * com o botão de adesão. Quem não aderiu vê a vitrine; só matriculados (ou admin)
 * abrem os PDFs — a policy do Storage garante isso no servidor.
 */
export default function CourseMaterialsPanel({
  course,
  enrolled = false,
  isAdmin = false,
  onEnrolled,
  compact = false,
  accent = '#1e3a5f',
}) {
  const [content, setContent] = useState(null);
  const [questionCounts, setQuestionCounts] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [openSubjects, setOpenSubjects] = useState({});
  const [openMaterial, setOpenMaterial] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCoursePackageContent(course)
      .then(async (result) => {
        if (cancelled) return;
        setContent(result);
        if (result.subjects.length > 0) setOpenSubjects({ [result.subjects[0].materia]: true });
        const counts = await loadQuestionCounts(result.subjects.map((s) => s.materia));
        if (!cancelled) setQuestionCounts(counts);
      })
      .catch(() => { if (!cancelled) setContent({ subjects: [] }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [course]);

  const totals = useMemo(() => {
    const subjects = content?.subjects || [];
    let pdfs = 0;
    let temas = 0;
    let questoes = 0;
    for (const s of subjects) {
      for (const t of s.topics) {
        temas += 1;
        pdfs += t.materials.length;
        questoes += questionCounts.get(`${s.materia}|${t.tema}`) || 0;
      }
    }
    return { materias: subjects.length, temas, pdfs, questoes };
  }, [content, questionCounts]);

  const canOpen = enrolled || isAdmin;

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const result = await enrollInCoursePackage(course.slug);
      const cards = Number(result?.cards_added || 0);
      toast.success(cards > 0
        ? `Adesão confirmada! ${cards} flashcards foram adicionados aos seus baralhos.`
        : 'Adesão confirmada! Todo o material do curso está liberado.');
      onEnrolled?.(result);
    } catch (error) {
      toast.error(error?.message || 'Não foi possível concluir a adesão.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleOpen = (material) => {
    if (!canOpen) {
      toast.info('Faça a adesão ao curso para abrir o material.');
      return;
    }
    setOpenMaterial(material);
  };

  if (!loading && totals.temas === 0) return null;

  return (
    <section className="pl-card" style={{ padding: 0, overflow: 'hidden', borderTop: `3px solid ${accent}` }}>
      <div style={{ padding: compact ? '16px 18px' : '20px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <p className="pl-eyebrow" style={{ margin: 0, color: accent }}>Curso Papirando</p>
          <h2 style={{ margin: '4px 0 0', fontSize: compact ? 17 : 20, fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--pl-ink)' }}>
            {course.titulo} — material completo
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--pl-ink-3)' }}>
            {loading
              ? 'Carregando material…'
              : `${totals.materias} ${totals.materias === 1 ? 'matéria' : 'matérias'} · ${totals.temas} temas · ${totals.pdfs} PDFs · ${totals.questoes} questões comentadas · flashcards por tema`}
          </p>
          {!course.is_published && isAdmin ? (
            <span style={{ display: 'inline-block', marginTop: 8, borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)', border: '1px solid var(--pl-warn)' }}>
              Rascunho — só admin vê
            </span>
          ) : null}
        </div>
        {enrolled ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, background: 'var(--pl-success-soft)', color: 'var(--pl-success)' }}>
            <BookOpenCheck size={16} /> Você aderiu a este curso
          </span>
        ) : (
          <button
            type="button"
            onClick={handleEnroll}
            disabled={enrolling || loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 10, background: accent, color: '#f3efe5', padding: '11px 20px', fontSize: 13, fontWeight: 700, border: 'none', cursor: enrolling ? 'wait' : 'pointer', opacity: enrolling || loading ? 0.7 : 1, whiteSpace: 'nowrap' }}
          >
            {enrolling ? <Loader2 size={15} className="animate-spin" /> : <BookOpenCheck size={15} />}
            {enrolling ? 'Liberando material…' : 'Aderir ao curso'}
          </button>
        )}
      </div>

      {(content?.subjects || []).map((subject) => {
        const open = Boolean(openSubjects[subject.materia]);
        const subjectQuestions = subject.topics.reduce((sum, t) => sum + (questionCounts.get(`${subject.materia}|${t.tema}`) || 0), 0);
        return (
          <div key={subject.materia} style={{ borderTop: '1px solid var(--pl-rule)' }}>
            <button
              type="button"
              onClick={() => setOpenSubjects((prev) => ({ ...prev, [subject.materia]: !open }))}
              aria-expanded={open}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: compact ? '12px 18px' : '14px 24px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--pl-ink)' }}
            >
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Layers size={16} style={{ color: accent }} />
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{subject.materia}</span>
              <span style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>{subject.topics.length} temas · {subjectQuestions} questões</span>
            </button>
            {open ? (
              <ol style={{ listStyle: 'none', margin: 0, padding: compact ? '0 18px 14px' : '0 24px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {subject.topics.map((topic, index) => {
                  const nq = questionCounts.get(`${subject.materia}|${topic.tema}`) || 0;
                  return (
                    <li key={topic.id} style={{ border: '1px solid var(--pl-rule-2)', borderRadius: 12, padding: '12px 14px', background: 'var(--pl-surface)' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--pl-ink-3)', fontVariantNumeric: 'tabular-nums' }}>{String(index + 1).padStart(2, '0')}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>{topic.tema}</span>
                        {topic.uf ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: accent }}>
                            <MapPin size={11} /> {topic.uf}
                          </span>
                        ) : null}
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--pl-ink-3)' }}>{nq} questões</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {topic.materials.map((material) => {
                          const Icon = KIND_ICONS[material.kind] || FileText;
                          return (
                            <button
                              key={material.id}
                              type="button"
                              onClick={() => handleOpen(material)}
                              title={material.title}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', color: canOpen ? 'var(--pl-ink-2)' : 'var(--pl-ink-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            >
                              {canOpen ? <Icon size={13} /> : <Lock size={12} />}
                              {MATERIAL_KIND_LABELS[material.kind] || material.title}
                            </button>
                          );
                        })}
                        {topic.materials.length === 0 ? (
                          <span style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>Material em preparação.</span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </div>
        );
      })}

      {openMaterial ? <PdfModal material={openMaterial} onClose={() => setOpenMaterial(null)} /> : null}
    </section>
  );
}
