import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  BookOpen,
  Edit3,
  ChevronDown,
  Check,
  Sparkles,
  Target,
  Layers,
  CheckCircle2,
  Plus,
  Link as LinkIcon,
  Loader2,
  Upload,
  Play,
} from 'lucide-react';
import { analyzeEdital } from '../lib/aiClient';
import { getAreaToken } from '../lib/areaTokens';

export default function Edital({
  editalText = '',
  bancoDisciplinas = [],
  cursos = [],
  targetContest = null,
  expandedEditalSubject,
  setExpandedEditalSubject,
  toggleEditalTopico,
  setEditingDiscipline,
  setRegistroEstudoModalOpen,
  setLinkModalOpen,
}) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [concursoSelecionadoId, setConcursoSelecionadoId] = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false);

  const concursosDoAluno = useMemo(() => {
    const safeCursos = Array.isArray(cursos) ? cursos : [];
    return safeCursos
      .map((curso, index) => {
        const plano = String(curso?.plano || curso?.nome || curso?.concurso || '').trim();
        if (!plano) return null;
        return {
          ...curso,
          id: String(curso?.id || `curso-${index}-${plano}`),
          nome: String(curso?.nome || curso?.concurso || plano).trim(),
          plano,
          banca: curso?.banca || curso?.organizadora || curso?.orgao || '',
          area: curso?.area || curso?.categoria || inferAreaFromText(curso?.nome || plano),
        };
      })
      .filter(Boolean);
  }, [cursos]);

  useEffect(() => {
    if (concursosDoAluno.length === 0) {
      setConcursoSelecionadoId('');
      return;
    }

    const targetId = String(targetContest?.id || '').trim();
    if (targetId && concursosDoAluno.some((item) => item.id === targetId)) {
      setConcursoSelecionadoId(targetId);
      return;
    }

    if (!concursosDoAluno.some((item) => item.id === concursoSelecionadoId)) {
      setConcursoSelecionadoId(concursosDoAluno[0].id);
    }
  }, [concursosDoAluno, concursoSelecionadoId, targetContest]);

  const concursoSelecionado = useMemo(() => {
    if (concursosDoAluno.length === 0 && targetContest) {
      return {
        ...targetContest,
        id: String(targetContest.id || 'target-contest'),
        nome: targetContest.nome || targetContest.concurso || targetContest.title || 'Objetivo-alvo',
        plano: targetContest.plano || targetContest.nome || targetContest.title || 'Geral',
        banca: targetContest.banca || targetContest.organizadora || targetContest.orgao || '',
        area: targetContest.area || targetContest.categoria || inferAreaFromText(targetContest.nome || targetContest.title),
      };
    }
    return concursosDoAluno.find((item) => item.id === concursoSelecionadoId) || concursosDoAluno[0] || null;
  }, [concursosDoAluno, concursoSelecionadoId, targetContest]);

  const editalAtivo = useMemo(() => {
    const safeDisciplinas = Array.isArray(bancoDisciplinas) ? bancoDisciplinas : [];
    if (concursoSelecionado?.plano) {
      return safeDisciplinas.filter(
        (disciplina) => disciplina?.plano === concursoSelecionado.plano || disciplina?.plano === 'Geral'
      );
    }
    return safeDisciplinas;
  }, [bancoDisciplinas, concursoSelecionado]);

  const totals = useMemo(() => {
    let topicos = 0;
    let concluidos = 0;

    editalAtivo.forEach((disciplina) => {
      if (!Array.isArray(disciplina.topicos)) return;
      topicos += disciplina.topicos.length;
      concluidos += disciplina.topicos.filter((topico) => topico?.concluido).length;
    });

    return {
      disciplinas: editalAtivo.length,
      topicos,
      concluidos,
      pendentes: Math.max(topicos - concluidos, 0),
      progresso: topicos > 0 ? Math.round((concluidos / topicos) * 100) : 0,
      disciplinasConcluidas: editalAtivo.filter((disciplina) => {
        const topicosDisciplina = Array.isArray(disciplina.topicos) ? disciplina.topicos : [];
        return topicosDisciplina.length > 0 && topicosDisciplina.every((topico) => topico?.concluido);
      }).length,
    };
  }, [editalAtivo]);

  const hasEditalText = String(editalText || '').trim().length > 0;

  const handleAnalyzeEdital = async () => {
    if (!hasEditalText) return;
    setAiLoading(true);
    setAiError('');
    setAiPanelOpen(true);
    try {
      const resultado = await analyzeEdital(editalText);
      setAiAnalysis(resultado);
    } catch (err) {
      setAiError(err?.message || 'Erro ao analisar edital.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="pl-page">
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <EditalHeader
          concurso={concursoSelecionado}
          concursos={concursosDoAluno}
          selectorOpen={selectorOpen}
          setSelectorOpen={setSelectorOpen}
          onTrocarConcurso={(id) => {
            setConcursoSelecionadoId(id);
            setSelectorOpen(false);
          }}
          onAdicionarEstudo={() => setRegistroEstudoModalOpen?.(true)}
          progressoGeral={totals.progresso}
        />

        <KpiStrip totals={totals} />

        {(aiPanelOpen || aiAnalysis || aiLoading || aiError) && (
          <AiAnalysisPanel
            aiPanelOpen={aiPanelOpen}
            setAiPanelOpen={setAiPanelOpen}
            aiLoading={aiLoading}
            aiError={aiError}
            aiAnalysis={aiAnalysis}
          />
        )}

        <section>
          <SectionHeader
            eyebrow="Disciplinas do edital"
            title="Progresso por tópico."
            rightLabel={`${totals.concluidos} de ${totals.topicos} tópicos concluídos`}
          />

          {editalAtivo.length === 0 ? (
            <EditalEmptyState
              canAnalyze={hasEditalText}
              loading={aiLoading}
              onImportarIA={handleAnalyzeEdital}
              onAdicionar={() => setEditingDiscipline?.({ plano: concursoSelecionado?.plano || 'Geral' })}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {editalAtivo.map((disciplina) => (
                <DisciplinaAccordion
                  key={disciplina.id || disciplina.nome}
                  disciplina={disciplina}
                  concurso={concursoSelecionado}
                  isExpanded={expandedEditalSubject === disciplina.id}
                  onToggle={() => setExpandedEditalSubject?.(expandedEditalSubject === disciplina.id ? null : disciplina.id)}
                  onEdit={() => setEditingDiscipline?.(disciplina)}
                  onToggleTopico={(topicoId) => toggleEditalTopico?.(disciplina.id, topicoId)}
                  onAddTopic={() => setEditingDiscipline?.(disciplina)}
                  onStudy={() => setRegistroEstudoModalOpen?.(true)}
                  onLink={() => setLinkModalOpen?.(true)}
                />
              ))}
            </div>
          )}
        </section>

        {hasEditalText && editalAtivo.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="pl-btn-ai pl-btn"
              onClick={handleAnalyzeEdital}
              disabled={aiLoading}
              style={{ opacity: aiLoading ? 0.72 : 1 }}
            >
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {aiLoading ? 'Analisando...' : 'Analisar edital com IA'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditalHeader({
  concurso,
  concursos,
  selectorOpen,
  setSelectorOpen,
  onTrocarConcurso,
  onAdicionarEstudo,
  progressoGeral,
}) {
  const area = getAreaToken(concurso?.area || inferAreaFromText(concurso?.nome || concurso?.plano || ''));

  return (
    <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
      <div>
          <h1 className="pl-display" style={{ margin: 0, fontSize: 56, color: 'var(--pl-ink)' }}>
            Edital verticalizado<span style={{ color: 'var(--pl-accent)' }}>.</span>
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 660, lineHeight: 1.5 }}>
            Acompanhe o progresso tópico por tópico, sem bagunça e sem sumir matéria no meio do caminho.
          </p>

          <div style={{ marginTop: 18, maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <span className="pl-small-label">Progresso geral</span>
              <span className="pl-serif-number" style={{ fontSize: 22, lineHeight: 1 }}>{progressoGeral}%</span>
            </div>
            <div className="pl-progress-track">
              <div className="pl-progress-fill" style={{ width: `${progressoGeral}%` }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
          <div className="pl-small-label">Edital ativo</div>
          <button
            type="button"
            className="pl-card edital-selector-button"
            onClick={() => setSelectorOpen((prev) => !prev)}
          >
            <span className="pl-area-dot" style={{ background: area.cover, width: 13, height: 13 }} />
            <span style={{ minWidth: 0, flex: 1 }}>
              <strong>{concurso?.nome || 'Sem concurso ativo'}</strong>
              <small>{concurso?.banca || concurso?.plano || 'Selecione um edital'}</small>
            </span>
            <ChevronDown size={16} style={{ transform: selectorOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s' }} />
          </button>

          {selectorOpen && concursos.length > 0 && (
            <div className="pl-card edital-selector-menu">
              {concursos.map((item) => {
                const token = getAreaToken(item.area || inferAreaFromText(item.nome || item.plano));
                return (
                  <button key={item.id} type="button" onClick={() => onTrocarConcurso(item.id)}>
                    <span className="pl-area-dot" style={{ background: token.cover }} />
                    <span>
                      <strong>{item.nome}</strong>
                      <small>{item.banca || item.plano}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button type="button" className="pl-btn pl-btn-primary" onClick={onAdicionarEstudo}>
            <Plus size={15} />
            Adicionar estudo
          </button>
        </div>
    </header>
  );
}

function KpiStrip({ totals }) {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
      <EditalKpi icon={BookOpen} label="Disciplinas" value={totals.disciplinas} detail="no edital ativo" tone="ink" />
      <EditalKpi icon={Layers} label="Tópicos" value={totals.topicos} detail="mapeados" tone="ink" />
      <EditalKpi icon={CheckCircle2} label="Concluídos" value={totals.concluidos} detail={`${totals.disciplinasConcluidas} disciplinas 100%`} tone="success" />
      <EditalKpi icon={Target} label="Pendentes" value={totals.pendentes} detail="a executar" tone="warn" />
    </section>
  );
}

function EditalKpi({ icon: Icon, label, value, detail, tone }) {
  const toneClass = tone === 'success' ? 'pl-tag-success' : tone === 'warn' ? 'pl-tag-warn' : 'pl-tag-accent';

  return (
    <div className="pl-card" style={{ padding: 18 }}>
      <span className={`pl-tag ${toneClass}`}>
        <Icon size={12} />
        {label}
      </span>
      <div className="pl-serif-number" style={{ marginTop: 14, fontSize: 44, lineHeight: 1 }}>
        {value}
      </div>
      <p className="pl-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>{detail}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title, rightLabel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'end', marginBottom: 12 }}>
      <div>
        <div className="pl-overline">{eyebrow}</div>
        <h2 className="pl-section-title" style={{ marginTop: 7 }}>{title}</h2>
      </div>
      <span className="pl-small-label">{rightLabel}</span>
    </div>
  );
}

function DisciplinaAccordion({
  disciplina,
  concurso,
  isExpanded,
  onToggle,
  onEdit,
  onToggleTopico,
  onAddTopic,
  onStudy,
  onLink,
}) {
  const topicos = Array.isArray(disciplina.topicos) ? disciplina.topicos : [];
  const concluidos = topicos.filter((topico) => topico?.concluido).length;
  const total = topicos.length;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : Number(disciplina.percentual || 0);
  const area = getAreaToken(disciplina.area || concurso?.area || inferAreaFromText(`${disciplina.nome} ${disciplina.plano}`));

  return (
    <article className="pl-card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        className="edital-accordion-trigger"
      >
        <ChevronCircle expanded={isExpanded} />
        <NameWithAreaMarker
          name={disciplina.nome}
          area={area}
          meta={`${concluidos} de ${total} tópicos`}
        />
        <ProgressInline pct={pct} color={area.cover} />
        <span className="pl-tag">{isExpanded ? 'Recolher' : 'Expandir'}</span>
      </button>

      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--pl-rule)', background: 'var(--pl-surface-2)', padding: '6px 0' }}>
          {topicos.length === 0 ? (
            <EmptyDashed icon={BookOpen} title="Nenhum tópico nesta disciplina." />
          ) : (
            topicos.map((topico, index) => (
              <TopicoRow
                key={topico.id || `${disciplina.id}-${index}`}
                topico={topico}
                index={index + 1}
                onToggle={() => onToggleTopico(topico.id)}
                onLink={onLink}
              />
            ))
          )}

          <div style={{ padding: '10px 20px 6px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--pl-rule)', marginTop: 6 }}>
            <button type="button" className="pl-btn pl-btn-sm" onClick={onAddTopic}>
              <Plus size={13} />
              Adicionar tópico
            </button>
            <button type="button" className="pl-btn pl-btn-primary pl-btn-sm" onClick={onStudy}>
              <Play size={13} fill="currentColor" />
              Papirar disciplina
            </button>
            <button type="button" className="pl-icon-button" title="Editar disciplina" onClick={onEdit}>
              <Edit3 size={14} />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function ChevronCircle({ expanded }) {
  return (
    <span className="edital-chevron-circle">
      <ChevronDown size={15} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s' }} />
    </span>
  );
}

function NameWithAreaMarker({ name, area, meta }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      <span className="pl-area-marker" style={{ background: area.cover }} />
      <span style={{ minWidth: 0 }}>
        <strong style={{ display: 'block', color: 'var(--pl-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </strong>
        <small style={{ display: 'block', marginTop: 3, color: 'var(--pl-ink-3)', fontWeight: 650 }}>
          {meta}
        </small>
      </span>
    </span>
  );
}

function ProgressInline({ pct, color }) {
  return (
    <span style={{ display: 'grid', gridTemplateColumns: '1fr 44px', alignItems: 'center', gap: 10 }}>
      <span className="pl-progress-track">
        <span className="pl-progress-fill" style={{ display: 'block', width: `${pct}%`, background: color }} />
      </span>
      <span className="pl-serif-number" style={{ fontSize: 19, lineHeight: 1, textAlign: 'right' }}>{pct}%</span>
    </span>
  );
}

function TopicoRow({ topico, index, onToggle, onLink }) {
  const tipo = inferTopicType(topico);

  return (
    <div className="edital-topic-row">
      <button type="button" onClick={onToggle} className="edital-topic-toggle">
        <Checkbox checked={Boolean(topico?.concluido)} />
        <span className="pl-serif-number" style={{ fontSize: 15, color: 'var(--pl-ink-3)', minWidth: 24 }}>
          {String(index).padStart(2, '0')}
        </span>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 650,
            color: topico?.concluido ? 'var(--pl-ink-3)' : 'var(--pl-ink)',
            textDecoration: topico?.concluido ? 'line-through' : 'none',
            textDecorationColor: 'var(--pl-ink-4)',
            textAlign: 'left',
          }}
        >
          {topico?.nome || 'Tópico sem nome'}
        </span>
        <span className={topicTypeClass(tipo)} style={{ textTransform: 'uppercase', fontSize: 10 }}>
          {tipo}
        </span>
      </button>

      <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" onClick={onLink}>
        <LinkIcon size={13} />
        Link
      </button>
    </div>
  );
}

function Checkbox({ checked }) {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        background: checked ? 'var(--pl-ink)' : 'var(--pl-surface)',
        border: checked ? 'none' : '1.5px solid var(--pl-rule-strong)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 18px',
      }}
    >
      {checked && <Check size={11} color="var(--pl-bg)" strokeWidth={3} />}
    </div>
  );
}

function EditalEmptyState({ canAnalyze, loading, onImportarIA, onAdicionar }) {
  return (
    <section className="pl-card-paper" style={{ padding: 32 }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--pl-ink)', color: 'var(--pl-bg)', display: 'grid', placeItems: 'center' }}>
        <BookOpen size={20} />
      </div>
      <div className="pl-overline" style={{ marginTop: 18 }}>Edital vazio</div>
      <h3 className="pl-section-title" style={{ marginTop: 8 }}>Comece pela estrutura do conteúdo.</h3>
      <p className="pl-body" style={{ maxWidth: 680, marginTop: 8 }}>
        Importe o edital com IA ou adicione as disciplinas manualmente para acompanhar tópico por tópico.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
        <span className="btn-ai-aura">
          <button type="button" className="pl-btn-ai pl-btn" onClick={onImportarIA} disabled={!canAnalyze || loading} style={{ opacity: !canAnalyze || loading ? 0.62 : 1 }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Importar com IA
            <span className="beta">beta</span>
          </button>
        </span>
        <button type="button" className="pl-btn pl-btn-secondary" onClick={onAdicionar}>
          <Upload size={14} />
          Adicionar manualmente
        </button>
      </div>
    </section>
  );
}

function AiAnalysisPanel({ aiPanelOpen, setAiPanelOpen, aiLoading, aiError, aiAnalysis }) {
  return (
    <section className="pl-card-ai">
      <button type="button" onClick={() => setAiPanelOpen((prev) => !prev)} className="edital-ai-toggle">
        <span>
          <span className="pl-tag-ai"><Sparkles size={13} /> Leitura com IA</span>
          <strong>{aiAnalysis?.concurso || aiAnalysis?.nome || aiAnalysis?.examName || aiAnalysis?.organization || 'Edital analisado'}</strong>
        </span>
        <ChevronDown size={18} style={{ transform: aiPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s' }} />
      </button>

      {aiPanelOpen && (
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {aiLoading && (
            <div className="pl-ai-mini" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Loader2 size={18} className="animate-spin" />
              <strong style={{ fontSize: 14, margin: 0 }}>Analisando edital com IA...</strong>
            </div>
          )}

          {aiError && (
            <div className="pl-card" style={{ padding: 12, borderColor: 'var(--pl-danger)', color: 'var(--pl-danger)', fontWeight: 750 }}>
              {aiError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            <AiMiniInfo label="Concurso" value={aiAnalysis?.examName || 'Não identificado'} />
            <AiMiniInfo label="Banca" value={aiAnalysis?.banca || aiAnalysis?.organization || 'Não identificada'} />
            <AiMiniInfo
              label="Datas"
              value={[
                aiAnalysis?.dates?.publicationDate,
                aiAnalysis?.dates?.registrationPeriod,
                aiAnalysis?.dates?.examDate,
              ].filter(Boolean).join(' · ') || 'Sem datas extraídas'}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function AiMiniInfo({ label, value }) {
  return (
    <div className="pl-ai-mini">
      <span>{label}</span>
      <strong style={{ fontSize: 15 }}>{value}</strong>
    </div>
  );
}

function EmptyDashed({ icon: Icon, title }) {
  return (
    <div style={{ padding: 30, textAlign: 'center', color: 'var(--pl-muted)' }}>
      <Icon size={20} />
      <strong style={{ display: 'block', marginTop: 8 }}>{title}</strong>
    </div>
  );
}

function inferTopicType(topico) {
  const explicit = String(topico?.tipo || topico?.type || '').trim();
  if (explicit) return explicit;
  const text = String(topico?.nome || '').toLowerCase();
  if (/s[uú]mula/.test(text)) return 'Súmula';
  if (/(^|\s)(art\.|lei|cf|constitui[cç][aã]o|§)/.test(text)) return 'Lei';
  return 'Teoria';
}

function topicTypeClass(tipo) {
  if (tipo === 'Lei') return 'pl-tag pl-tag-accent';
  if (tipo === 'Súmula') return 'pl-tag pl-tag-success';
  if (tipo === 'Teoria') return 'pl-tag pl-tag-highlight';
  return 'pl-tag';
}

function inferAreaFromText(value = '') {
  const text = String(value).toLowerCase();
  if (/militar|soldado|pm|bombeiro|marinha|exercito|aeronautica/.test(text)) return 'militar';
  if (/policia|policial|pc-|pf|prf|delegado|investigador/.test(text)) return 'policial';
  if (/fiscal|tributario|receita|sefaz|auditor/.test(text)) return 'fiscal';
  if (/tribunal|tj|trf|tre|mp|promotor|analista/.test(text)) return 'tribunais';
  if (/saude|sus|enfermagem|medicina/.test(text)) return 'saude';
  return 'outros';
}
