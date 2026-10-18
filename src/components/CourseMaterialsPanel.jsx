import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  Copy,
  HelpCircle,
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
import { supabase } from '../lib/supabase';
import {
  TRAIL_STEPS,
  TRAIL_STEP_LABELS,
  enrollInCoursePackage,
  getPackageMaterialUrl,
  loadCoursePackageOverview,
  loadPackageProgress,
  setPackageStepDone,
} from '../lib/coursePackagesApi';

const KIND_ICONS = {
  pdf_completo: FileText,
  mapa_mental: Network,
  resumo: NotebookText,
  simulado: ListChecks,
  slides: Presentation,
  questoes: HelpCircle,
  flashcards: Copy,
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


// Etapas da trilha em dois blocos: primeiro estudar o conteúdo, depois praticar.
const STEP_GROUPS = [
  { id: 'estudar', label: 'Estudar', steps: ['pdf_completo', 'mapa_mental', 'resumo', 'slides'] },
  { id: 'praticar', label: 'Praticar', steps: ['simulado', 'questoes', 'flashcards'] },
];

function MiniProgress({ done, total, width = 72 }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width, height: 4, borderRadius: 999, background: 'var(--pl-rule-2)', overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--pl-success)' : 'var(--pl-accent)', borderRadius: 999 }} />
      </span>
      <span style={{ fontSize: 12, color: 'var(--pl-ink-3)', fontVariantNumeric: 'tabular-nums', minWidth: 30 }}>{done}/{total}</span>
    </span>
  );
}

function LoadingRows() {
  return (
    <div aria-busy="true" aria-label="Carregando conteúdo do curso" style={{ padding: '6px 24px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1].map((i) => (
        <div key={i} style={{ height: 44, borderRadius: 8, background: 'var(--pl-bg-soft)', opacity: 1 - i * 0.3 }} />
      ))}
    </div>
  );
}

function StepTile({ step, label, done, canTrack, locked, onToggle, onAction, title }) {
  const Icon = KIND_ICONS[step] || FileText;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'stretch', borderRadius: 8, overflow: 'hidden',
        border: `1px solid ${done ? 'var(--pl-success)' : 'var(--pl-rule-2)'}`,
        background: done ? 'var(--pl-success-soft)' : 'var(--pl-surface)',
      }}
    >
      <button
        type="button"
        onClick={onAction}
        title={title || label}
        style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px',
          background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left',
          color: locked ? 'var(--pl-ink-3)' : 'var(--pl-ink)',
        }}
      >
        {locked ? <Lock size={14} /> : <Icon size={15} style={{ color: done ? 'var(--pl-success)' : 'var(--pl-ink-2)', flexShrink: 0 }} />}
        <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </button>
      {canTrack ? (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={done}
          aria-label={done ? `Desmarcar ${label}` : `Marcar ${label} como feito`}
          title={done ? 'Feito. Clique para desmarcar.' : 'Marcar como feito'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, flexShrink: 0,
            background: 'transparent', border: 0, borderLeft: '1px solid var(--pl-rule)', cursor: 'pointer',
          }}
        >
          <span
            style={{
              width: 18, height: 18, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${done ? 'var(--pl-success)' : 'var(--pl-rule-strong)'}`,
              background: done ? 'var(--pl-success)' : 'transparent', color: 'var(--pl-surface)',
            }}
          >
            {done ? <Check size={12} strokeWidth={3} /> : null}
          </span>
        </button>
      ) : null}
    </div>
  );
}

/**
 * Curso pronto: matérias → temas → etapas da trilha (PDFs, questões, flashcards), com o
 * botão de adesão. Quem não aderiu vê o sumário; só matriculados (ou admin) abrem os PDFs
 * (a policy do Storage garante isso no servidor). Tudo começa fechado.
 */
export default function CourseMaterialsPanel({
  course,
  enrolled = false,
  isAdmin = false,
  onEnrolled,
  compact = false,
  accent = '#1e3a5f',
  onNavigate,
}) {
  const [content, setContent] = useState(null);
  const [questionCounts, setQuestionCounts] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [openSubjects, setOpenSubjects] = useState({});
  const [openTopics, setOpenTopics] = useState({});
  const [openMaterial, setOpenMaterial] = useState(null);
  // Trilha: passos concluídos ("topicId|step"). trailOn=false enquanto a tabela não existir.
  const [userId, setUserId] = useState('');
  const [done, setDone] = useState(new Set());
  const [trailOn, setTrailOn] = useState(false);

  const canOpen = enrolled || isAdmin;
  const canTrack = canOpen && trailOn && Boolean(userId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCoursePackageOverview(course)
      .then((result) => {
        if (cancelled) return;
        setContent({ subjects: result.subjects });
        setQuestionCounts(result.questionCounts);
      })
      .catch(() => { if (!cancelled) setContent({ subjects: [] }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [course]);

  useEffect(() => {
    let cancelled = false;
    if (!canOpen || !course?.id) { setTrailOn(false); return undefined; }
    supabase.auth.getSession()
      .then(async ({ data }) => {
        const uid = data?.session?.user?.id || '';
        if (cancelled) return;
        setUserId(uid);
        const progress = await loadPackageProgress(course.id, uid);
        if (cancelled) return;
        setTrailOn(progress.available);
        setDone(progress.done);
      })
      .catch(() => { if (!cancelled) setTrailOn(false); });
    return () => { cancelled = true; };
  }, [course?.id, canOpen]);

  const toggleStep = async (topicId, step, value) => {
    if (!canTrack) return;
    const key = `${topicId}|${step}`;
    const next = value ?? !done.has(key);
    if (next === done.has(key)) return;
    const apply = (on) => setDone((prev) => {
      const copy = new Set(prev);
      if (on) copy.add(key); else copy.delete(key);
      return copy;
    });
    apply(next);
    try {
      await setPackageStepDone({ packageId: course.id, topicId, step, userId, done: next });
    } catch {
      apply(!next);
      toast.error('Não foi possível salvar o progresso da trilha.');
    }
  };

  // Etapas de cada tema: os PDFs que existem + questões (se houver) + flashcards.
  const stepsOf = (subject, topic) => {
    const kinds = new Set(topic.materials.map((m) => m.kind));
    const hasQuestions = (questionCounts.get(`${subject.materia}|${topic.tema}`) || 0) > 0;
    return TRAIL_STEPS.filter((step) => kinds.has(step) || (step === 'questoes' && hasQuestions) || step === 'flashcards');
  };
  const doneCount = (topic, steps) => steps.filter((step) => done.has(`${topic.id}|${step}`)).length;

  const totals = useMemo(() => {
    const subjects = content?.subjects || [];
    let pdfs = 0;
    let temas = 0;
    let questoes = 0;
    let etapas = 0;
    let feitas = 0;
    for (const s of subjects) {
      for (const t of s.topics) {
        temas += 1;
        pdfs += t.materials.length;
        questoes += questionCounts.get(`${s.materia}|${t.tema}`) || 0;
        const steps = stepsOf(s, t);
        etapas += steps.length;
        feitas += doneCount(t, steps);
      }
    }
    return { materias: subjects.length, temas, pdfs, questoes, etapas, feitas, pct: etapas ? Math.round((feitas / etapas) * 100) : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, questionCounts, done]);

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
    if (!canOpen || !material) {
      toast.info('Faça a adesão ao curso para abrir o material.');
      return;
    }
    setOpenMaterial(material);
    toggleStep(material.topic_id, material.kind, true);
  };

  const handlePractice = (topic, step) => {
    if (!canOpen) {
      toast.info('Faça a adesão ao curso para praticar.');
      return;
    }
    toggleStep(topic.id, step, true);
    if (onNavigate) onNavigate(step === 'questoes' ? 'questoes' : 'flashcards', { materia: topic.materia, tema: topic.tema });
    else toast.info(step === 'questoes'
      ? `As questões de "${topic.tema}" estão em Questões, filtrando por ${topic.materia}.`
      : `Os flashcards de "${topic.tema}" estão em Flashcards, no baralho com o nome do tema.`);
  };

  if (!loading && totals.temas === 0) return null;

  const pad = compact ? 18 : 24;

  return (
    <section className="pl-card" style={{ padding: 0, overflow: 'hidden', borderTop: `3px solid ${accent}` }}>
      <div style={{ padding: `${compact ? 16 : 20}px ${pad}px`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0, flex: '1 1 300px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <p className="pl-eyebrow" style={{ margin: 0, color: accent }}>Curso Papirando</p>
            {!course.is_published && isAdmin ? <span className="pl-tag pl-tag-warn">Rascunho · só admin vê</span> : null}
          </div>
          <h2 style={{ margin: '6px 0 0', fontSize: compact ? 18 : 22, fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--pl-ink)' }}>
            {course.titulo}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--pl-ink-3)' }}>
            {loading
              ? 'Montando o sumário do curso…'
              : `${totals.materias} ${totals.materias === 1 ? 'matéria' : 'matérias'} · ${totals.temas} temas · ${totals.pdfs} PDFs · ${totals.questoes} questões comentadas · flashcards por tema`}
          </p>
          {canTrack && !loading && totals.etapas > 0 ? (
            <div style={{ marginTop: 12, maxWidth: 440 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--pl-ink-2)', marginBottom: 6 }}>
                <span style={{ fontWeight: 700 }}>Sua trilha</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{totals.feitas} de {totals.etapas} etapas · {totals.pct}%</span>
              </div>
              <div className="pl-progress"><div className="pl-progress-bar" style={{ width: `${totals.pct}%` }} /></div>
            </div>
          ) : null}
        </div>
        {enrolled ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 700, background: 'var(--pl-success-soft)', color: 'var(--pl-success)' }}>
            <BookOpenCheck size={16} /> Você aderiu a este curso
          </span>
        ) : (
          <button type="button" onClick={handleEnroll} disabled={enrolling || loading} className="pl-btn pl-btn-primary">
            {enrolling ? <Loader2 size={15} className="animate-spin" /> : <BookOpenCheck size={15} />}
            {enrolling ? 'Liberando material…' : 'Aderir ao curso'}
          </button>
        )}
      </div>

      {loading ? <LoadingRows /> : null}

      {(content?.subjects || []).map((subject) => {
        const open = Boolean(openSubjects[subject.materia]);
        const subjectQuestions = subject.topics.reduce((sum, t) => sum + (questionCounts.get(`${subject.materia}|${t.tema}`) || 0), 0);
        let subjectSteps = 0;
        let subjectDone = 0;
        for (const t of subject.topics) {
          const steps = stepsOf(subject, t);
          subjectSteps += steps.length;
          subjectDone += doneCount(t, steps);
        }
        return (
          <div key={subject.materia} style={{ borderTop: '1px solid var(--pl-rule)' }}>
            <button
              type="button"
              onClick={() => setOpenSubjects((prev) => ({ ...prev, [subject.materia]: !open }))}
              aria-expanded={open}
              style={{ width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: `14px ${pad}px`, background: open ? 'var(--pl-bg-soft)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--pl-ink)' }}
            >
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Layers size={16} style={{ color: accent }} />
              <span style={{ flex: '1 1 200px', fontSize: 15, fontWeight: 700 }}>{subject.materia}</span>
              <span style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>{subject.topics.length} temas · {subjectQuestions} questões</span>
              {canTrack ? <MiniProgress done={subjectDone} total={subjectSteps} /> : null}
            </button>
            {open ? (
              <ol style={{ listStyle: 'none', margin: 0, padding: `4px ${pad}px 16px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {subject.topics.map((topic, index) => {
                  const steps = stepsOf(subject, topic);
                  const feitos = doneCount(topic, steps);
                  const completo = canTrack && steps.length > 0 && feitos === steps.length;
                  const topicOpen = Boolean(openTopics[topic.id]);
                  const nq = questionCounts.get(`${subject.materia}|${topic.tema}`) || 0;
                  const materialByKind = new Map(topic.materials.map((m) => [m.kind, m]));
                  return (
                    <li key={topic.id} style={{ border: `1px solid ${completo ? 'var(--pl-success)' : 'var(--pl-rule-2)'}`, borderRadius: 8, background: 'var(--pl-surface)', overflow: 'hidden' }}>
                      <button
                        type="button"
                        aria-expanded={topicOpen}
                        onClick={() => setOpenTopics((prev) => ({ ...prev, [topic.id]: !topicOpen }))}
                        style={{ width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', color: 'var(--pl-ink)' }}
                      >
                        <span style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums', background: completo ? 'var(--pl-success)' : 'var(--pl-bg-soft)', color: completo ? 'var(--pl-surface)' : 'var(--pl-ink-2)' }}>
                          {completo ? <Check size={14} strokeWidth={3} /> : String(index + 1).padStart(2, '0')}
                        </span>
                        <span style={{ flex: '1 1 200px', minWidth: 0, fontSize: 14, fontWeight: 700 }}>
                          {topic.tema}
                          {topic.uf ? (
                            <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: accent, verticalAlign: 'middle' }}>
                              <MapPin size={11} /> {topic.uf}
                            </span>
                          ) : null}
                        </span>
                        {canTrack ? <MiniProgress done={feitos} total={steps.length} width={56} /> : (
                          <span style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>{topic.materials.length} PDFs · {nq} questões</span>
                        )}
                        {topicOpen ? <ChevronDown size={15} style={{ color: 'var(--pl-ink-3)' }} /> : <ChevronRight size={15} style={{ color: 'var(--pl-ink-3)' }} />}
                      </button>
                      {topicOpen ? (
                        topic.materials.length === 0 ? (
                          <p style={{ margin: 0, padding: '0 14px 14px', fontSize: 12, color: 'var(--pl-ink-3)' }}>Material em preparação.</p>
                        ) : (
                          <div style={{ padding: '2px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--pl-rule)' }}>
                            {STEP_GROUPS.map((group) => {
                              const groupSteps = group.steps.filter((step) => steps.includes(step));
                              if (groupSteps.length === 0) return null;
                              return (
                                <div key={group.id} style={{ paddingTop: 10 }}>
                                  <p className="pl-eyebrow" style={{ margin: '0 0 8px' }}>{group.label}</p>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))', gap: 8 }}>
                                    {groupSteps.map((step) => {
                                      const material = materialByKind.get(step);
                                      const label = step === 'questoes' ? `${TRAIL_STEP_LABELS.questoes} (${nq})` : TRAIL_STEP_LABELS[step];
                                      return (
                                        <StepTile
                                          key={step}
                                          step={step}
                                          label={label}
                                          title={material?.title}
                                          done={done.has(`${topic.id}|${step}`)}
                                          canTrack={canTrack}
                                          locked={!canOpen}
                                          onToggle={() => toggleStep(topic.id, step)}
                                          onAction={() => (material ? handleOpen(material) : handlePractice(topic, step))}
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : null}
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
