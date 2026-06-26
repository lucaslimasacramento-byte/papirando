import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Compass,
  DollarSign,
  ExternalLink,
  GraduationCap,
  Heart,
  LibraryBig,
  Pencil,
  Plus,
  Users,
} from 'lucide-react';
import {
  buildContestForRole,
  CONTEST_STATUS_LABELS,
  findRelatedContests,
  getContestRoles,
  getPrimaryContestRole,
  normalizeContestStatus,
} from '../lib/contestGrouping';
import { getContestAreaTheme } from '../lib/contestAreaTheme';
import { storageThumb } from '../lib/imageUrl';

const STATUS_LABELS = CONTEST_STATUS_LABELS;

const STAGE_LABELS = {
  prova_objetiva: 'Prova objetiva',
  prova_discursiva: 'Prova discursiva',
  avaliacao_curricular: 'Avaliação curricular',
  redacao: 'Redação',
  taf: 'TAF',
  avaliacao_psicologica: 'Avaliação psicológica',
  investigacao_social: 'Investigação social',
  exames_medicos: 'Exames médicos',
  toxicologico: 'Exame toxicológico',
  heteroidentificacao: 'Heteroidentificação',
  curso_formacao: 'Curso de formação',
};

const VEST_MODALITY_LABEL = { presencial: 'Presencial', ead: 'EAD', hibrido: 'Híbrido', multiplo: 'Presencial e EAD' };
const VEST_INSTITUTION_TYPE_LABEL = { publica: 'Pública', privada: 'Privada', programa_governo: 'Programa do governo' };

const fmtDateBR = (v) => {
  if (!v) return null;
  const [y, m, d] = String(v).split('-');
  return y && m && d ? `${d}/${m}/${y}` : String(v);
};

// Roteador: ENEM e vestibular têm layout próprio; concurso segue o corpo completo.
export default function ConcursoDetalhe(props) {
  if (props?.contest?.tipo === 'enem') return <EnemDetalhe {...props} />;
  if (props?.contest?.tipo === 'vestibular') return <VestibularDetalhe {...props} />;
  return <ConcursoDetalheBody {...props} />;
}

// ─── ENEM: mapa matéria → área de conhecimento (a disciplina não guarda a área) ──
const ENEM_AREA_ORDER = [
  'Linguagens, Códigos e suas Tecnologias',
  'Ciências Humanas e suas Tecnologias',
  'Ciências da Natureza e suas Tecnologias',
  'Matemática e suas Tecnologias',
  'Redação',
];
const ENEM_AREA_MAP = {
  'língua portuguesa': 'Linguagens, Códigos e suas Tecnologias',
  'literatura': 'Linguagens, Códigos e suas Tecnologias',
  'língua estrangeira': 'Linguagens, Códigos e suas Tecnologias',
  'artes': 'Linguagens, Códigos e suas Tecnologias',
  'educação física': 'Linguagens, Códigos e suas Tecnologias',
  'tecnologias': 'Linguagens, Códigos e suas Tecnologias',
  'história': 'Ciências Humanas e suas Tecnologias',
  'geografia': 'Ciências Humanas e suas Tecnologias',
  'filosofia': 'Ciências Humanas e suas Tecnologias',
  'sociologia': 'Ciências Humanas e suas Tecnologias',
  'biologia': 'Ciências da Natureza e suas Tecnologias',
  'física': 'Ciências da Natureza e suas Tecnologias',
  'química': 'Ciências da Natureza e suas Tecnologias',
  'matemática': 'Matemática e suas Tecnologias',
  'redação': 'Redação',
};
const ENEM_AREA_TINT = {
  'Linguagens, Códigos e suas Tecnologias': '#1d4ed8',
  'Ciências Humanas e suas Tecnologias': '#b45309',
  'Ciências da Natureza e suas Tecnologias': '#047857',
  'Matemática e suas Tecnologias': '#6d28d9',
  'Redação': '#be123c',
};

function enemAreaOf(nome = '') {
  const key = String(nome || '').trim().toLowerCase();
  return ENEM_AREA_MAP[key] || 'Outras';
}

export function EnemDetalhe({
  contest,
  onBack,
  onImport,
  onToggleFavorite,
  onToggleInterested,
  onSetTargetContest,
  importingId = '',
  limiteAtingido = false,
  cursos = [],
  isAdmin = false,
  isFavorite = false,
  isInterested = false,
  isTargetContest = false,
  onEditContest,
  embedded = false,
}) {
  const [expanded, setExpanded] = useState({});
  const meta = contest?.meta && typeof contest.meta === 'object' ? contest.meta : {};
  const added = cursos.some((c) => c.tipo === 'enem' || (c.nome || '').toLowerCase().includes('enem'));
  const importing = importingId === contest?.id;

  const insStart = fmtDateBR(contest?.registration_start);
  const insEnd = fmtDateBR(contest?.registration_end);
  const inscricaoPeriodo = insStart || insEnd ? `${insStart || '—'} até ${insEnd || 'em aberto'}` : null;
  const dia2 = fmtDateBR(meta.prova_data_dia2 || meta.prova_data2 || contest?.prova_data_dia2);

  const facts = [
    inscricaoPeriodo ? { label: 'Inscrições', value: inscricaoPeriodo } : null,
    { label: 'Taxa', value: contest?.inscricao_valor || 'A definir' },
    { label: '1º dia de prova', value: fmtDateBR(contest?.prova_data) || 'A definir' },
    dia2 ? { label: '2º dia de prova', value: dia2 } : null,
    { label: 'Nível', value: contest?.escolaridade || 'Ensino médio completo' },
  ].filter(Boolean);

  // Agrupa as disciplinas nas 4 áreas + Redação.
  const grupos = useMemo(() => {
    const map = new Map();
    (contest?.disciplinas || []).forEach((d) => {
      const nome = typeof d === 'string' ? d : d?.nome;
      if (!nome) return;
      const topicos = (Array.isArray(d?.topicos) ? d.topicos : []).map((t) => (typeof t === 'string' ? t : t?.nome)).filter(Boolean);
      const area = enemAreaOf(nome);
      if (!map.has(area)) map.set(area, []);
      map.get(area).push({ nome, topicos });
    });
    const ordered = ENEM_AREA_ORDER.filter((a) => map.has(a)).map((a) => [a, map.get(a)]);
    const extras = [...map.keys()].filter((a) => !ENEM_AREA_ORDER.includes(a)).map((a) => [a, map.get(a)]);
    return [...ordered, ...extras];
  }, [contest?.disciplinas]);

  const totalMaterias = grupos.reduce((acc, [, ms]) => acc + ms.length, 0);
  const totalTopicos = grupos.reduce((acc, [, ms]) => acc + ms.reduce((s, m) => s + m.topicos.length, 0), 0);

  const heroBtn = (active, tone) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10,
    border: active ? `1px solid ${tone}66` : '1px solid rgba(255,255,255,0.2)',
    background: active ? `${tone}33` : 'rgba(255,255,255,0.05)',
    padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#f3efe5', cursor: 'pointer',
  });

  return (
    <div className="pl-paper-bg" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 20px 40px' }}>
      {/* Voltar + admin (oculto quando embutido na vitrine) */}
      {!embedded && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" onClick={onBack} className="pl-btn pl-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ArrowLeft size={16} /> Voltar
          </button>
          {isAdmin ? (
            <button type="button" onClick={() => onEditContest?.(contest)} className="pl-btn pl-btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--pl-warn-soft)', border: '1px solid var(--pl-warn)', color: 'var(--pl-warn)' }}>
              <Pencil size={14} /> Admin: editar
            </button>
          ) : null}
        </div>
      )}

      {/* Hero */}
      <div className="pl-card" style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)', border: 'none', color: '#f3efe5' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 20 }}>
          {contest?.imagem_url ? (
            <img src={storageThumb(contest.imagem_url, 160)} alt="" style={{ width: 80, height: 80, objectFit: 'contain', flexShrink: 0, borderRadius: 10, background: 'rgba(255,255,255,0.9)', padding: 6 }} aria-hidden />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GraduationCap size={30} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.65 }}>Exame Nacional</p>
            <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 600, lineHeight: 1.1, color: '#f3efe5' }}>{contest?.nome || 'ENEM'}</h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, fontWeight: 500, opacity: 0.8 }}>INEP/MEC · acesso ao ensino superior via SiSU, ProUni e Fies</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {onToggleFavorite && (
              <button type="button" onClick={() => onToggleFavorite(contest.id)} style={heroBtn(isFavorite, '#fa6464')}>
                <Heart size={14} style={{ fill: isFavorite ? 'currentColor' : 'none' }} /> {isFavorite ? 'Favoritado' : 'Favoritar'}
              </button>
            )}
            {onToggleInterested && (
              <button type="button" onClick={() => onToggleInterested(contest.id)} style={heroBtn(isInterested, '#fab43c')}>
                <Bookmark size={14} style={{ fill: isInterested ? 'currentColor' : 'none' }} /> {isInterested ? 'Quero estudar' : 'Interesse'}
              </button>
            )}
            {onSetTargetContest && (
              <button type="button" onClick={() => onSetTargetContest(contest.id)} style={heroBtn(isTargetContest, '#fadc3c')}>
                <BadgeCheck size={14} style={{ fill: isTargetContest ? 'currentColor' : 'none' }} /> {isTargetContest ? 'Alvo' : 'Como alvo'}
              </button>
            )}
            <button type="button" onClick={() => onImport?.(contest)} disabled={importing || limiteAtingido || added}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10, background: 'rgba(255,255,255,0.95)', color: 'var(--pl-ink)', padding: '6px 14px', fontSize: 13, fontWeight: 700, border: 'none', cursor: importing || limiteAtingido || added ? 'not-allowed' : 'pointer', opacity: importing || limiteAtingido || added ? 0.6 : 1 }}>
              {added ? 'Já no painel' : limiteAtingido ? 'Limite' : importing ? '...' : <>Adicionar aos estudos <ArrowRight size={14} /></>}
            </button>
            {contest?.edital_url ? (
              <button type="button" onClick={() => window.open(contest.edital_url, '_blank', 'noopener,noreferrer')} style={heroBtn(false)}>
                Edital <ExternalLink size={14} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Fatos-chave */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {facts.map((f) => (
          <div key={f.label} className="pl-card" style={{ padding: '12px 14px' }}>
            <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{f.label}</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>{f.value}</p>
          </div>
        ))}
      </div>

      {/* Resumo */}
      {contest?.descricao && (
        <VestSection title="Sobre o exame">
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{contest.descricao}</p>
        </VestSection>
      )}

      {/* Conteúdo por área */}
      <section className="pl-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <p className="pl-eyebrow" style={{ margin: 0 }}>Conteúdo por área de conhecimento</p>
          {totalMaterias > 0 && (
            <span style={{ fontSize: 11, color: 'var(--pl-ink-3)' }}>{grupos.length} áreas · {totalMaterias} matérias · {totalTopicos} tópicos</span>
          )}
        </div>

        {totalMaterias === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--pl-ink-3)' }}>
            Trilha em montagem. (Admin → Catálogo → ENEM → colar o JSON da Matriz de Referência)
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {grupos.map(([area, materias]) => {
              const tint = ENEM_AREA_TINT[area] || 'var(--pl-accent)';
              return (
                <div key={area}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: tint, flexShrink: 0 }} />
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>{area}</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 18 }}>
                    {materias.map((m) => {
                      const key = `${area}:${m.nome}`;
                      const open = Boolean(expanded[key]);
                      return (
                        <div key={key} style={{ border: '1px solid var(--pl-rule-2)', borderRadius: 6, overflow: 'hidden' }}>
                          <button type="button" onClick={() => setExpanded((p) => ({ ...p, [key]: !p[key] }))}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 12px', background: 'var(--pl-surface-2)', border: 0, cursor: 'pointer', textAlign: 'left' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{m.nome}</span>
                            <span style={{ fontSize: 11, color: 'var(--pl-ink-3)', whiteSpace: 'nowrap' }}>{m.topicos.length} tópico(s) {open ? '▾' : '▸'}</span>
                          </button>
                          {open && m.topicos.length > 0 && (
                            <ul style={{ margin: 0, padding: '10px 14px 12px 30px', display: 'flex', flexDirection: 'column', gap: 5, background: 'var(--pl-surface)' }}>
                              {m.topicos.map((t, i) => (
                                <li key={i} style={{ fontSize: 12.5, color: 'var(--pl-ink-2)', lineHeight: 1.45 }}>{t}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Ingresso */}
      <VestSection title="Como o ENEM abre portas">
        <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>
          A nota do ENEM é usada para ingresso no ensino superior por três caminhos principais:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
          {[
            { s: 'SiSU', d: 'Vagas em universidades públicas (federais e estaduais).' },
            { s: 'ProUni', d: 'Bolsas de estudo (integral/parcial) em faculdades privadas.' },
            { s: 'Fies', d: 'Financiamento estudantil para cursos pagos.' },
          ].map((x) => (
            <div key={x.s} style={{ padding: '10px 12px', border: '1px solid var(--pl-rule-2)', borderRadius: 6, background: 'var(--pl-surface-2)' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-accent)' }}>{x.s}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--pl-ink-3)', lineHeight: 1.45 }}>{x.d}</p>
            </div>
          ))}
        </div>
      </VestSection>
    </div>
  );
}

function VestSection({ title, children }) {
  return (
    <section className="pl-card" style={{ padding: 20 }}>
      <p className="pl-eyebrow" style={{ marginBottom: 12 }}>{title}</p>
      {children}
    </section>
  );
}

function VestibularDetalhe({
  contest,
  onBack,
  onImport,
  importingId = '',
  limiteAtingido = false,
  cursos = [],
}) {
  const [imageError, setImageError] = useState(false);
  const meta = contest?.meta && typeof contest.meta === 'object' ? contest.meta : {};
  const locality = contest?.scope === 'estadual' && contest?.uf ? String(contest.uf).toUpperCase() : 'Nacional';
  const modalityLabel = VEST_MODALITY_LABEL[contest?.modality] || null;
  const instLabel = VEST_INSTITUTION_TYPE_LABEL[contest?.institution_type] || null;
  const statusKey = normalizeContestStatus(contest?.status_concurso);
  const importing = importingId === contest?.id;
  const added = cursos.some((c) => c.plano === contest?.plano || c.nome === contest?.nome || c.concurso === contest?.concurso);

  const insStart = fmtDateBR(contest?.registration_start);
  const insEnd = fmtDateBR(contest?.registration_end);
  const inscricaoPeriodo = insStart || insEnd ? `${insStart || '—'} até ${insEnd || 'em aberto'}` : null;

  const subjects = (contest?.disciplinas || []).map((d) => (typeof d === 'string' ? d : d?.nome)).filter(Boolean);
  const subjectsSummary = Array.isArray(meta.subjects_summary) && meta.subjects_summary.length ? meta.subjects_summary : subjects;
  const timeline = Array.isArray(meta.timeline) ? meta.timeline.filter((t) => t && t.title) : [];
  const courses = Array.isArray(meta.courses_offered) ? meta.courses_offered.filter((c) => c && (c.name || typeof c === 'string')) : [];
  const readings = Array.isArray(meta.required_readings) ? meta.required_readings.filter(Boolean) : [];
  const entryMethods = Array.isArray(meta.entry_methods) ? meta.entry_methods.filter(Boolean) : [];
  const about = meta.about_institution || '';
  const site = meta.official_url || contest?.official_url || '';
  const regUrl = meta.registration_url || '';
  const editalUrl = contest?.edital_url || meta.edital_url || '';

  const facts = [
    { label: 'Data da prova', value: fmtDateBR(contest?.prova_data) || 'A definir' },
    inscricaoPeriodo ? { label: 'Inscrições', value: inscricaoPeriodo } : null,
    { label: 'Taxa', value: contest?.inscricao_valor || 'A definir' },
    contest?.escolaridade ? { label: 'Requisito', value: contest.escolaridade } : null,
    modalityLabel ? { label: 'Modalidade', value: modalityLabel } : null,
  ].filter(Boolean);

  const badges = [locality, instLabel, modalityLabel, STATUS_LABELS[statusKey] || 'Previsto'].filter(Boolean);

  return (
    <div className="pl-page" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <button type="button" onClick={onBack} className="pl-btn pl-btn-ghost pl-btn-sm" style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={15} /> Voltar
      </button>

      {/* Cabeçalho */}
      <header className="pl-card" style={{ padding: 20, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ width: 96, height: 96, borderRadius: 12, flexShrink: 0, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {contest?.imagem_url && !imageError
            ? <img src={storageThumb(contest.imagem_url, 160)} alt={contest.nome} onError={() => setImageError(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
            : <GraduationCap size={36} style={{ color: 'var(--pl-ink-4)' }} />}
        </div>
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{contest?.banca || 'Instituição'}</p>
          <h1 className="pl-display" style={{ fontSize: 32, margin: 0 }}>{contest?.nome}</h1>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {badges.map((b, i) => (
              <span key={`${b}-${i}`} className={`pl-tag ${i === 0 ? 'pl-tag-accent' : ''}`} style={{ textTransform: 'uppercase', fontSize: 10 }}>{b}</span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onImport?.(contest)}
          disabled={importing || limiteAtingido || added}
          className="pl-btn pl-btn-primary"
          style={{ alignSelf: 'center' }}
        >
          {added ? 'Já no painel' : importing ? 'Adicionando...' : limiteAtingido ? 'Limite atingido' : <>Adicionar ao painel <ArrowRight size={15} /></>}
        </button>
      </header>

      {/* Fatos-chave */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {facts.map((f) => (
          <div key={f.label} className="pl-card" style={{ padding: '12px 14px' }}>
            <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{f.label}</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>{f.value}</p>
          </div>
        ))}
      </div>

      {/* Como funciona */}
      {contest?.descricao && (
        <VestSection title="Como funciona">
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{contest.descricao}</p>
        </VestSection>
      )}

      {/* Calendário */}
      {timeline.length > 0 && (
        <VestSection title="Calendário">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {timeline.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: i < timeline.length - 1 ? '1px solid var(--pl-rule)' : 'none' }}>
                <span style={{ fontSize: 13, color: 'var(--pl-ink-2)' }}>{t.title}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)', whiteSpace: 'nowrap' }}>{fmtDateBR(t.date) || 'a definir'}</span>
              </div>
            ))}
          </div>
        </VestSection>
      )}

      {/* Matérias cobradas */}
      {subjectsSummary.length > 0 && (
        <VestSection title="Matérias cobradas">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {subjectsSummary.map((s, i) => <span key={`${s}-${i}`} className="pl-tag">{s}</span>)}
          </div>
        </VestSection>
      )}

      {/* Leituras obrigatórias */}
      {readings.length > 0 && (
        <VestSection title="Leituras obrigatórias">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {readings.map((r, i) => <li key={i} style={{ fontSize: 13.5, color: 'var(--pl-ink-2)' }}>{r}</li>)}
          </ul>
        </VestSection>
      )}

      {/* Cursos oferecidos */}
      {courses.length > 0 && (
        <VestSection title="Cursos oferecidos">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {courses.map((c, i) => (
              <div key={i} style={{ padding: '8px 12px', border: '1px solid var(--pl-rule-2)', borderRadius: 6, background: 'var(--pl-surface-2)' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{c.name || c}</p>
                {(c.degree || c.modality) && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--pl-ink-3)' }}>{[c.degree, VEST_MODALITY_LABEL[c.modality] || c.modality].filter(Boolean).join(' · ')}</p>
                )}
              </div>
            ))}
          </div>
        </VestSection>
      )}

      {/* Formas de ingresso */}
      {entryMethods.length > 0 && (
        <VestSection title="Formas de ingresso">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {entryMethods.map((m, i) => <span key={`${m}-${i}`} className="pl-tag pl-tag-accent">{m}</span>)}
          </div>
        </VestSection>
      )}

      {/* Sobre a instituição */}
      {about && (
        <VestSection title="Sobre a instituição">
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{about}</p>
        </VestSection>
      )}

      {/* Links oficiais */}
      {(site || regUrl || editalUrl) && (
        <VestSection title="Links oficiais">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {site && <a href={site} target="_blank" rel="noopener noreferrer" className="pl-btn pl-btn-ghost pl-btn-sm"><ExternalLink size={14} /> Site oficial</a>}
            {regUrl && <a href={regUrl} target="_blank" rel="noopener noreferrer" className="pl-btn pl-btn-ghost pl-btn-sm"><ExternalLink size={14} /> Inscrição</a>}
            {editalUrl && <a href={editalUrl} target="_blank" rel="noopener noreferrer" className="pl-btn pl-btn-ghost pl-btn-sm"><ExternalLink size={14} /> Edital</a>}
          </div>
        </VestSection>
      )}
    </div>
  );
}

function ConcursoDetalheBody({
  contest: rawContest,
  onBack,
  onImport,
  onToggleFavorite,
  onToggleInterested,
  onOpenDisciplinas,
  onOpenRelatedContest,
  contestTracker = {},
  onToggleContestTask,
  isTargetContest = false,
  onSetTargetContest,
  importingId = '',
  limiteAtingido = false,
  cursos = [],
  concursoCatalog = [],
  bancoDisciplinas = [],
  isAdmin = false,
  isFavorite = false,
  isInterested = false,
  onEditContest,
}) {
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [imageError, setImageError] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const roles = useMemo(() => getContestRoles(rawContest || {}), [rawContest]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const activeRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || getPrimaryContestRole(rawContest || {}),
    [roles, selectedRoleId, rawContest]
  );
  const contest = useMemo(() => {
    if (!rawContest) return null;
    return buildContestForRole(rawContest, activeRole);
  }, [rawContest, activeRole]);
  const normalizedStatus = normalizeContestStatus(contest?.status_concurso);
  const areaTheme = useMemo(() => getContestAreaTheme(contest?.area || 'Geral'), [contest?.area]);
  const relatedContests = useMemo(
    () => findRelatedContests(concursoCatalog, rawContest || {}),
    [concursoCatalog, rawContest]
  );

  useEffect(() => {
    setSelectedRoleId(getPrimaryContestRole(rawContest || {})?.id || '');
    setExpandedSubjects({});
  }, [rawContest]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setImageError(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [contest?.id, contest?.imagem_url]);

  const courseMatches = useMemo(() => {
    if (!contest) return [];

    return cursos.filter(
      (curso) =>
        curso.plano === contest.plano ||
        curso.nome === contest.nome ||
        curso.concurso === contest.concurso
    );
  }, [contest, cursos]);

  const startedSubjectsCount = useMemo(() => {
    if (!courseMatches.length) return 0;
    const planNames = new Set(courseMatches.map((curso) => curso.plano));
    return bancoDisciplinas.filter(
      (disciplina) =>
        planNames.has(disciplina.plano) &&
        ((disciplina.topicos || []).some((topico) => topico.concluido || topico.acertos || topico.erros) ||
          Number(disciplina.percentual || 0) > 0)
    ).length;
  }, [bancoDisciplinas, courseMatches]);

  const contestMoment = useMemo(() => {
    if (!contest) return null;

    if (normalizedStatus === 'homologado') {
      return {
        title: 'Concurso homologado',
        text: 'Esse concurso já teve resultado final homologado e hoje serve mais como referência de estrutura e histórico.',
        tone: 'gray',
      };
    }

    if (['inscricoes_abertas', 'prova_marcada', 'em_andamento'].includes(normalizedStatus)) {
      return {
        title: 'Concurso ativo',
        text: 'Esse concurso já exige atenção a prazos, prova e execução do plano de estudos.',
        tone: 'blue',
      };
    }

    if (contest.prova_data) {
      const provaDate = new Date(`${contest.prova_data}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((provaDate.getTime() - today.getTime()) / 86400000);

      if (diffDays >= 0 && diffDays <= 45) {
        return {
          title: 'Janela de prova próxima',
          text: `Faltam cerca de ${diffDays} dia(s) para a prova. Esse é o momento de priorizar revisão, questões e pontos de alto impacto.`,
          tone: 'red',
        };
      }
    }

    return {
      title: 'Bom momento para organizar',
      text: 'Esse concurso parece estar em uma fase útil para planejamento, estruturação das disciplinas e montagem do ciclo.',
      tone: 'blue',
    };
  }, [contest, normalizedStatus]);

  const contestAlerts = useMemo(() => {
    if (!contest) return [];

    const alerts = [];

    if (['previsto', 'autorizado', 'comissao_formada', 'banca_em_definicao', 'banca_definida', 'edital_iminente'].includes(normalizedStatus)) {
      alerts.push({
        title: STATUS_LABELS[normalizedStatus] || 'Fase inicial',
        text: 'Use essa fase para construir base e acompanhar as próximas publicações do órgão.',
        tone: 'blue',
      });
    }

    if (contest.prova_data) {
      const provaDate = new Date(`${contest.prova_data}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((provaDate.getTime() - today.getTime()) / 86400000);

      if (diffDays >= 0 && diffDays <= 60) {
        alerts.push({
          title: 'Prova no radar',
          text: `Faltam ${diffDays} dia(s) para a prova. Vale concentrar revisão, questões e simulados.`,
          tone: diffDays <= 30 ? 'red' : 'blue',
        });
      }
    } else {
      alerts.push({
        title: 'Data da prova pendente',
        text: 'Ainda não há uma data cadastrada. Bom momento para estruturar base e acompanhar retificações.',
        tone: 'gray',
      });
    }

    if (contest.edital_url) {
      alerts.push({
        title: 'Edital disponível',
        text: 'O PDF oficial já está anexado e pode ser consultado a qualquer momento.',
        tone: 'green',
      });
    }

    return alerts.slice(0, 3);
  }, [contest, normalizedStatus]);

  const formatDateBR = (value) => {
    if (!value) return 'Sem data';
    const [year, month, day] = String(value).split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    return value;
  };

  const formatCurrencyBR = (value) => {
    const cleaned = String(value || '').trim();
    if (!cleaned) return 'A definir';
    if (/\s+a\s+R\$/i.test(cleaned)) return cleaned;

    const numeric = Number(cleaned.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) return 'A definir';

    return numeric.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const agendaItems = [
    {
      label: 'Status do concurso',
      value: STATUS_LABELS[normalizedStatus] || 'Previsto',
    },
    {
      label: 'Data da prova',
      value: formatDateBR(contest?.prova_data),
    },
    {
      label: 'Valor da inscrição',
      value: formatCurrencyBR(contest?.inscricao_valor),
    },
    {
      label: 'Etapas mapeadas',
      value:
        contest?.etapas_tags?.length > 0
          ? `${contest.etapas_tags.length} etapa(s)`
          : contest?.etapas || 'A definir',
    },
  ];

  const actionChecklist = [
    {
      key: 'edital_lido',
      label: 'Ler o edital completo',
      hint: 'Marque quando já tiver passado pelos pontos principais do PDF.',
      done: Boolean(contestTracker.edital_lido),
    },
    {
      key: 'prova_no_calendario',
      label: 'Colocar a prova no calendário',
      hint: 'Serve para não perder datas importantes e ajustar o ciclo.',
      done: Boolean(contestTracker.prova_no_calendario),
    },
    {
      key: 'inscricao_planejada',
      label: 'Planejar a inscrição',
      hint: 'Separe valor, prazo e documentos necessários.',
      done: Boolean(contestTracker.inscricao_planejada),
    },
    {
      key: 'taf_em_preparacao',
      label: 'Iniciar preparação das etapas físicas',
      hint: 'Ative quando esse concurso tiver TAF ou etapas práticas.',
      done: Boolean(contestTracker.taf_em_preparacao),
      hidden: !contest?.etapas_tags?.includes('taf'),
    },
    {
      key: 'simulados_planejados',
      label: 'Reservar bloco de simulados',
      hint: 'Ajuda a transformar o edital em rotina de execução.',
      done: Boolean(contestTracker.simulados_planejados),
    },
  ].filter((item) => !item.hidden);

  const checklistDoneCount = actionChecklist.filter((item) => item.done).length;
  const logoSrc = contest?.imagem_url && !imageError ? storageThumb(contest.imagem_url, 160) : '';

  if (!contest) {
    return (
      <div className="pl-paper-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '100%', flexDirection: 'column', gap: 16 }}>
        <p className="pl-eyebrow">Concurso</p>
        <h2 style={{ fontSize: 28, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>Nenhum concurso selecionado</h2>
        <button
          type="button"
          onClick={onBack}
          className="pl-btn pl-btn-primary"
        >
          <ArrowLeft size={16} />
          Voltar para concursos
        </button>
      </div>
    );
  }

  return (
    <div className="pl-paper-bg" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 20px 40px' }}>
      {/* Back + admin row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button
          type="button"
          onClick={onBack}
          className="pl-btn pl-btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => onEditContest?.(rawContest || contest)}
            className="pl-btn pl-btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--pl-warn-soft)', border: '1px solid var(--pl-warn)', color: 'var(--pl-warn)' }}
          >
            <Pencil size={14} />
            Admin: editar
          </button>
        ) : null}
      </div>

      {/* Hero editorial */}
      <div className="pl-card" style={{ padding: '24px 28px', background: `linear-gradient(135deg, ${areaTheme.accentStart || 'var(--pl-ink)'} 0%, ${areaTheme.accentEnd || 'var(--pl-ink)'} 100%)`, border: 'none', color: '#f3efe5' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 20 }}>
          {logoSrc ? (
            <img
              src={logoSrc}
              alt=""
              onError={() => setImageError(true)}
              style={{ width: 80, height: 80, objectFit: 'contain', flexShrink: 0, borderRadius: 10, background: 'rgba(255,255,255,0.12)' }}
              aria-hidden
            />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LibraryBig size={30} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.65 }}>Concurso</p>
            <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 600, lineHeight: 1.1, color: '#f3efe5' }}>{contest.nome}</h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, fontWeight: 500, opacity: 0.8 }}>{contest.cargo || contest.concurso} · {contest.banca || 'Banca a definir'}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <span style={{ borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', padding: '3px 12px', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                {contest.area || 'Geral'}
              </span>
              <span style={{ borderRadius: 999, border: '1px solid rgba(80,220,150,0.35)', background: 'rgba(80,220,150,0.15)', padding: '3px 12px', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#b7f5d4' }}>
                {STATUS_LABELS[normalizedStatus] || 'Previsto'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => onToggleFavorite?.(contest.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10, border: isFavorite ? '1px solid rgba(250,100,100,0.4)' : '1px solid rgba(255,255,255,0.2)', background: isFavorite ? 'rgba(250,100,100,0.2)' : 'rgba(255,255,255,0.05)', padding: '6px 12px', fontSize: 12, fontWeight: 700, color: isFavorite ? '#ffb3b3' : '#f3efe5', cursor: 'pointer' }}
            >
              <Heart size={14} style={{ fill: isFavorite ? 'currentColor' : 'none' }} />
              {isFavorite ? 'Favoritado' : 'Favoritar'}
            </button>
            <button
              type="button"
              onClick={() => onToggleInterested?.(contest.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10, border: isInterested ? '1px solid rgba(250,180,60,0.4)' : '1px solid rgba(255,255,255,0.2)', background: isInterested ? 'rgba(250,180,60,0.2)' : 'rgba(255,255,255,0.05)', padding: '6px 12px', fontSize: 12, fontWeight: 700, color: isInterested ? '#ffd97d' : '#f3efe5', cursor: 'pointer' }}
            >
              <Bookmark size={14} style={{ fill: isInterested ? 'currentColor' : 'none' }} />
              {isInterested ? 'Quero estudar' : 'Interesse'}
            </button>
            <button
              type="button"
              onClick={() => onSetTargetContest?.(contest.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10, border: isTargetContest ? '1px solid rgba(250,220,60,0.4)' : '1px solid rgba(255,255,255,0.2)', background: isTargetContest ? 'rgba(250,220,60,0.2)' : 'rgba(255,255,255,0.05)', padding: '6px 12px', fontSize: 12, fontWeight: 700, color: isTargetContest ? '#fff3a3' : '#f3efe5', cursor: 'pointer' }}
            >
              <BadgeCheck size={14} style={{ fill: isTargetContest ? 'currentColor' : 'none' }} />
              {isTargetContest ? 'Alvo' : 'Como alvo'}
            </button>
            <button
              type="button"
              onClick={() => setImportConfirmOpen(true)}
              disabled={importingId === contest.id || limiteAtingido}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10, background: 'rgba(255,255,255,0.95)', color: 'var(--pl-ink)', padding: '6px 14px', fontSize: 13, fontWeight: 700, border: 'none', cursor: importingId === contest.id || limiteAtingido ? 'not-allowed' : 'pointer', opacity: importingId === contest.id || limiteAtingido ? 0.6 : 1 }}
            >
              {limiteAtingido ? 'Limite' : importingId === contest.id ? '...' : 'Adicionar aos estudos'}
              <ArrowRight size={14} />
            </button>
            {contest.edital_url ? (
              <button
                type="button"
                onClick={() => window.open(contest.edital_url, '_blank', 'noopener,noreferrer')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#f3efe5', cursor: 'pointer' }}
              >
                Edital
                <ExternalLink size={14} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {importConfirmOpen ? (
        <ImportContestModal
          contest={contest}
          isLoading={importingId === contest.id}
          limiteAtingido={limiteAtingido}
          onCancel={() => setImportConfirmOpen(false)}
          onConfirm={() => {
            onImport?.(contest);
            setImportConfirmOpen(false);
          }}
        />
      ) : null}

      {roles.length > 1 && (
        <div className="pl-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Cargos do concurso</p>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>Escolha o cargo para ver o edital correto</h2>
              <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 600 }}>
                Disciplinas, vagas, salário e lotação acompanham a opção selecionada.
              </p>
            </div>
            <span className="pl-tag pl-tag-accent">
              {roles.length} cargos cadastrados
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {roles.map((role) => {
              const selected = activeRole?.id === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  style={{
                    minHeight: 155,
                    borderRadius: 16,
                    border: selected ? '1.5px solid var(--pl-accent)' : '1px solid var(--pl-rule-2)',
                    background: selected ? 'var(--pl-accent-soft)' : 'var(--pl-bg-soft)',
                    padding: 16,
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: selected ? '0 8px 24px rgba(29,78,216,0.12)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)', lineHeight: 1.3 }}>{role.nome}</p>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: selected ? 'var(--pl-accent)' : 'var(--pl-rule-strong)', flexShrink: 0, marginTop: 3 }} />
                  </div>
                  <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {role.salario && <CargoInfo label="Salário" value={role.salario} tone="green" />}
                    {role.vagas && <CargoInfo label="Vagas" value={role.vagas} />}
                    {role.escolaridade && <CargoInfo label="Nível" value={role.escolaridade} tone="blue" />}
                    {role.lotacao && <CargoInfo label="Lotação" value={role.lotacao} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {relatedContests.length > 0 && (
        <div className="pl-card" style={{ padding: 20, background: 'var(--pl-accent-soft)', border: '1px solid rgba(29,78,216,0.12)' }}>
          <div style={{ marginBottom: 16 }}>
            <p className="pl-eyebrow" style={{ color: 'var(--pl-accent)', marginBottom: 6 }}>Concursos relacionados</p>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)' }}>Outros editais da mesma instituição</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
              Assim Oficial, Praça, PM e Bombeiros ficam vinculados, mas sem virar cargo um do outro.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {relatedContests.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenRelatedContest?.(item)}
                className="pl-card"
                style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: '1px solid var(--pl-rule-2)' }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.nome}</p>
                <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-2)' }}>{item.cargo || item.banca || 'Concurso relacionado'}</p>
                <span className="pl-tag pl-tag-accent" style={{ marginTop: 12, display: 'inline-block', fontSize: 9 }}>
                  {STATUS_LABELS[normalizeContestStatus(item.status_concurso)] || 'Previsto'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pl-card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)' }}>
          <div style={{ borderRight: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)' }}>
            {contest.imagem_url && !imageError ? (
              <img
                src={storageThumb(contest.imagem_url, 320)}
                alt={contest.nome}
                loading="lazy"
                decoding="async"
                onError={() => setImageError(true)}
                style={{ height: '100%', minHeight: 260, width: '100%', objectFit: 'contain', background: 'var(--pl-surface)', padding: 24 }}
              />
            ) : (
              <div
                style={{ display: 'flex', minHeight: 260, width: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-surface)', background: `linear-gradient(135deg, ${contest.cor || 'var(--pl-accent)'} 0%, var(--pl-accent) 100%)` }}
              >
                <LibraryBig size={56} />
              </div>
            )}
          </div>

          <div style={{ padding: '24px 32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <StatBox label="Inscrição" value={formatCurrencyBR(contest.inscricao_valor)} icon={DollarSign} />
              <StatBox label="Nível" value={contest.escolaridade || 'A definir'} icon={GraduationCap} />
              <StatBox label="Vagas" value={contest.vagas || 'A definir'} icon={Users} />
              <StatBox label="Lotação" value={contest.lotacao || 'A definir'} icon={Compass} />
            </div>

            {contest.descricao && (
              <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 20 }}>
                <p className="pl-eyebrow" style={{ marginBottom: 10 }}>Resumo</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{contest.descricao}</p>
              </div>
            )}

            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <StatusPanel
                label="Já importado"
                value={courseMatches.length > 0 ? `${courseMatches.length} curso(s)` : 'Ainda não'}
                tone={courseMatches.length > 0 ? 'blue' : 'gray'}
              />
              <StatusPanel
                label="Disciplinas iniciadas"
                value={String(startedSubjectsCount)}
                tone={startedSubjectsCount > 0 ? 'green' : 'gray'}
              />
              <StatusPanel
                label="Interesse"
                value={isInterested ? 'Na sua mira' : 'Ainda não marcado'}
                tone={isInterested ? 'amber' : 'gray'}
              />
            </div>

            {contestMoment && (
              <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid', padding: 20, ...momentToneStyles[contestMoment.tone] }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7 }}>Momento do concurso</p>
                <p style={{ margin: '10px 0 0', fontSize: 17, fontWeight: 600 }}>{contestMoment.title}</p>
                <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 500, lineHeight: 1.6 }}>{contestMoment.text}</p>
              </div>
            )}

            {courseMatches.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => onOpenDisciplinas?.(contest)}
                  className="pl-btn pl-btn-ghost"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  Abrir disciplinas desse concurso
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1.05fr 0.95fr' }}>
        <div className="pl-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Estrutura do edital</p>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>Disciplinas e tópicos</h2>
            </div>
            <span className="pl-tag">
              {contest.disciplinas?.length || 0} disciplinas
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(contest.disciplinas || []).map((disciplina) => {
              const isExpanded = Boolean(expandedSubjects[disciplina.nome]);
              return (
                <div key={disciplina.nome} className="pl-card" style={{ borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)' }}>{disciplina.nome}</p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                        {disciplina.topicos?.length || 0} tópicos mapeados
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSubjects((prev) => ({
                          ...prev,
                          [disciplina.nome]: !prev[disciplina.nome],
                        }))
                      }
                      style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 8, color: 'var(--pl-ink-2)', cursor: 'pointer' }}
                    >
                      <Plus size={16} style={{ transform: isExpanded ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 16, borderTop: '1px solid var(--pl-rule)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(disciplina.topicos || []).length > 0 ? (
                        (disciplina.topicos || []).map((topico) => (
                          <div
                            key={topico.id || topico.nome}
                            style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '8px 12px', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}
                          >
                            {topico.nome}
                          </div>
                        ))
                      ) : (
                        <div style={{ borderRadius: 10, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '8px 12px', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
                          Nenhum tópico detalhado ainda.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pl-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Etapas e contexto</p>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>Leitura rápida</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <InfoCard label="Banca" value={contest.banca || 'A definir'} />
            <InfoCard label="Concurso" value={contest.concurso || contest.nome} />
            <InfoCard label="Cargo" value={contest.cargo || 'A definir'} />
            <InfoCard label="Área" value={contest.area || 'Geral'} />
          </div>

          {contestAlerts.length > 0 && (
            <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 20 }}>
              <p className="pl-eyebrow" style={{ marginBottom: 16 }}>Alertas do concurso</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {contestAlerts.map((alert) => (
                  <div
                    key={alert.title}
                    style={{ borderRadius: 10, border: '1px solid', padding: '16px', ...momentToneStyles[alert.tone] }}
                  >
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{alert.title}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>{alert.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 20 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 16 }}>Agenda essencial</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {agendaItems.map((item) => (
                <div key={item.label} style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--pl-ink-3)' }}>{item.label}</p>
                  <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div>
                <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Próximos passos</p>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--pl-ink)' }}>Checklist de acompanhamento</p>
              </div>
              <span className="pl-tag pl-tag-accent">
                {checklistDoneCount}/{actionChecklist.length} concluído(s)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {actionChecklist.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onToggleContestTask?.(contest.id, item.key)}
                  style={{
                    display: 'flex', width: '100%', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
                    borderRadius: 10, border: '1px solid', padding: 16, textAlign: 'left', cursor: 'pointer',
                    ...(item.done
                      ? { borderColor: 'var(--pl-success)', background: 'var(--pl-success-soft)', color: 'var(--pl-success)' }
                      : { borderColor: 'var(--pl-rule-2)', background: 'var(--pl-bg-soft)', color: 'var(--pl-ink)' })
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{item.label}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>{item.hint}</p>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 24,
                      borderRadius: 999, border: '1px solid', padding: '0 8px', fontSize: 11, fontWeight: 600, flexShrink: 0,
                      ...(item.done
                        ? { borderColor: 'var(--pl-success)', background: 'var(--pl-surface)', color: 'var(--pl-success)' }
                        : { borderColor: 'var(--pl-rule-2)', background: 'var(--pl-surface)', color: 'var(--pl-ink-3)' })
                    }}
                  >
                    {item.done ? 'OK' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {(contest.etapas || contest.etapas_tags?.length > 0) && (
            <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 20 }}>
              <p className="pl-eyebrow" style={{ marginBottom: 12 }}>Etapas</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>
                {contest.etapas || 'Etapas não detalhadas.'}
              </p>

              {contest.etapas_tags?.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {contest.etapas_tags.map((tag) => (
                    <span key={tag} className="pl-tag pl-tag-accent">
                      {STAGE_LABELS[tag] || tag}
                    </span>
                  ))}
                </div>
              )}

              {contest.taf_itens?.length > 0 && (
                <div style={{ marginTop: 16, borderRadius: 10, border: '1px solid var(--pl-accent-ring)', background: 'var(--pl-accent-soft)', padding: 16 }}>
                  <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--pl-accent)' }}>Itens do TAF</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {contest.taf_itens.map((item) => (
                      <span key={item} className="pl-tag">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CargoInfo({ label, value, tone = 'slate' }) {
  const toneStyles = {
    green: { background: 'var(--pl-success-soft)', color: 'var(--pl-success)' },
    blue: { background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' },
    slate: { background: 'var(--pl-surface)', color: 'var(--pl-ink-2)' },
  };

  return (
    <div style={{ borderRadius: 10, padding: '8px 12px', ...toneStyles[tone] }}>
      <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.6 }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 800, lineHeight: 1.3, wordBreak: 'break-word' }}>{value}</p>
    </div>
  );
}

function ImportContestModal({ contest, isLoading, limiteAtingido, onCancel, onConfirm }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.55)', padding: '24px 16px', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: 520, overflow: 'hidden', borderRadius: 24, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-high)' }}>
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%)', padding: '24px 28px', color: '#f3efe5' }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#93b4ff' }}>Adicionar aos estudos</p>
          <h3 style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{contest?.nome || 'Concurso selecionado'}</h3>
          <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: 'rgba(243,239,229,0.7)' }}>
            Isso cria um curso na sua área de estudos com as disciplinas, tópicos e dados do edital.
          </p>
        </div>
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {limiteAtingido ? (
            <div style={{ borderRadius: 12, border: '1px solid var(--pl-warn)', background: 'var(--pl-warn-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>
              Seu limite de cursos foi atingido. Remova algum curso ou ajuste seu plano antes de adicionar este concurso.
            </div>
          ) : (
            <div style={{ borderRadius: 12, border: '1px solid var(--pl-accent-ring)', background: 'var(--pl-accent-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-accent)' }}>
              Depois de adicionar, você encontra esse concurso em Meus cursos e pode estudar pelo edital verticalizado.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
            <span style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '12px 16px' }}>Banca: {contest?.banca || 'A definir'}</span>
            <span style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '12px 16px' }}>Área: {contest?.area || 'Geral'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="pl-btn pl-btn-ghost"
              style={{ minHeight: 44 }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading || limiteAtingido}
              className="pl-btn pl-btn-primary"
              style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {isLoading ? 'Adicionando...' : 'Adicionar agora'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--pl-ink-3)' }}>
        <Icon size={14} />
        <p className="pl-eyebrow" style={{ margin: 0 }}>{label}</p>
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 17, fontWeight: 600, color: 'var(--pl-ink)' }}>{value}</p>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
      <p className="pl-eyebrow" style={{ margin: 0, marginBottom: 8 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{value}</p>
    </div>
  );
}

function StatusPanel({ label, value, tone = 'gray' }) {
  const toneStyles = {
    gray: { borderColor: 'var(--pl-rule-2)', background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-2)' },
    blue: { borderColor: 'var(--pl-accent-ring)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' },
    green: { borderColor: 'var(--pl-success)', background: 'var(--pl-success-soft)', color: 'var(--pl-success)' },
    amber: { borderColor: 'var(--pl-warn)', background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)' },
  };

  return (
    <div style={{ borderRadius: 12, border: '1px solid', padding: 16, ...toneStyles[tone] }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.7 }}>{label}</p>
      <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600 }}>{value}</p>
    </div>
  );
}

const momentToneStyles = {
  blue: { borderColor: 'var(--pl-accent-ring)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' },
  amber: { borderColor: 'var(--pl-warn)', background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)' },
  red: { borderColor: 'var(--pl-danger)', background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)' },
  green: { borderColor: 'var(--pl-success)', background: 'var(--pl-success-soft)', color: 'var(--pl-success)' },
  gray: { borderColor: 'var(--pl-rule-2)', background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-2)' },
};
