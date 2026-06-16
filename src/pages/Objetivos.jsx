import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Building2,
  CheckCircle2,
  Compass,
  ExternalLink,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import { getAreaToken } from '../lib/areaTokens';
import { storageThumb } from '../lib/imageUrl';

// ─── CourseTemplateView (Faculdade e Vestibular) ──────────────────────────────

function CourseTemplateView({ courseTemplates = [], intentFilter, cursos, onCreateCourse, limiteAtingido, isAdmin }) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState('');

  const items = useMemo(
    () => (courseTemplates || []).filter((t) => t.intent === intentFilter),
    [courseTemplates, intentFilter]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (t) => t.nome.toLowerCase().includes(q) || (t.area || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const jaAdicionados = useMemo(
    () => new Set((cursos || []).filter((c) => inferTipo(c) === intentFilter).map((c) => c.nome || c.plano)),
    [cursos, intentFilter]
  );

  const areas = useMemo(() => {
    const seen = new Set();
    const out = [];
    filtered.forEach((t) => { if (t.area && !seen.has(t.area)) { seen.add(t.area); out.push(t.area); } });
    return out;
  }, [filtered]);

  const handleAdd = async (template) => {
    if (adding || limiteAtingido) return;
    setAdding(template.id);
    try {
      await onCreateCourse({
        nome: template.nome,
        plano: template.nome,
        area: template.area || 'Geral',
        tipo: intentFilter,
        intent: intentFilter,
        origem: 'catalogo',
        banca: '',
        imagem_url: template.imagem_url || '',
      });
    } finally {
      setAdding('');
    }
  };

  if (items.length === 0) {
    const labelIntent = intentFilter === 'vestibular' ? 'Vestibulares' : 'Faculdade';
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <GraduationCap size={32} style={{ color: 'var(--pl-ink-4)', marginBottom: 12 }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)', marginBottom: 6 }}>
          Nenhum {intentFilter === 'vestibular' ? 'vestibular' : 'curso de faculdade'} cadastrado ainda.
        </p>
        <p style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>
          {isAdmin
            ? `Adicione pelo painel Admin → Catálogo → aba ${labelIntent}.`
            : 'O administrador ainda não adicionou opções nessa categoria.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Busca */}
      <div style={{ position: 'relative', maxWidth: 400 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--pl-ink-4)', pointerEvents: 'none' }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={intentFilter === 'vestibular' ? 'Buscar vestibular...' : 'Buscar curso...'}
          className="pl-input"
          style={{ width: '100%', paddingLeft: 32, boxSizing: 'border-box' }}
        />
      </div>

      {limiteAtingido && (
        <div className="pl-card-paper" style={{ padding: '10px 14px' }}>
          <p style={{ fontSize: 12, color: 'var(--pl-warn)', fontWeight: 600, margin: 0 }}>
            Limite de objetivos atingido. Faça upgrade do plano para adicionar mais.
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--pl-ink-3)', textAlign: 'center', padding: '24px 0' }}>
          Nenhum resultado para &quot;{query}&quot;.
        </p>
      ) : (
        /* Agrupado por área */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {areas.map((area) => (
            <div key={area}>
              <p className="pl-eyebrow" style={{ marginBottom: 10 }}>{area}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
                {filtered.filter((t) => t.area === area).map((template) => {
                  const added = jaAdicionados.has(template.nome);
                  const loading = adding === template.id;
                  return (
                    <div
                      key={template.id}
                      className="pl-card"
                      style={{
                        padding: '10px 12px',
                        display: 'flex', alignItems: 'center', gap: 10,
                        opacity: added ? 0.65 : 1,
                      }}
                    >
                      {template.imagem_url ? (
                        <img
                          src={template.imagem_url}
                          alt=""
                          style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                          background: 'var(--pl-bg-soft)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {intentFilter === 'vestibular'
                            ? <GraduationCap size={14} style={{ color: 'var(--pl-ink-3)' }} />
                            : <Building2 size={14} style={{ color: 'var(--pl-ink-3)' }} />}
                        </div>
                      )}
                      <p style={{
                        flex: 1, margin: 0,
                        fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {template.nome}
                      </p>
                      {added ? (
                        <CheckCircle2 size={14} style={{ flexShrink: 0, color: 'var(--pl-success)' }} />
                      ) : (
                        <button
                          type="button"
                          className="pl-btn pl-btn-primary pl-btn-sm"
                          disabled={loading || limiteAtingido}
                          onClick={() => handleAdd(template)}
                          style={{ flexShrink: 0, fontSize: 11, padding: '4px 10px' }}
                        >
                          {loading ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inferência de tipo para cursos legados ───────────────────────────────────

function inferTipo(curso) {
  if (curso.tipo && curso.tipo !== 'concurso') return curso.tipo;
  if (curso.intent && curso.intent !== 'concurso') return curso.intent;
  const nome = (curso.nome || curso.concurso || '').toLowerCase();
  if (nome.includes('enem')) return 'enem';
  if (nome.includes('vestibular') || nome.includes('fuvest') || nome.includes('unicamp') || nome.includes('unesp')) return 'vestibular';
  return 'concurso';
}

// ─── Type Tabs ────────────────────────────────────────────────────────────────

const TIPOS = [
  { id: 'concurso', label: 'Concurso público', icon: Trophy },
  { id: 'vestibular', label: 'Vestibular', icon: GraduationCap },
  { id: 'enem', label: 'ENEM', icon: Star },
  { id: 'faculdade', label: 'Faculdade', icon: Building2 },
  { id: 'livre', label: 'Livre', icon: Compass },
];

// ─── Meus objetivos (strip) ───────────────────────────────────────────────────

function MeusObjetivos({ cursos, onSetActiveTab, onRemove }) {
  if (!cursos || cursos.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <p className="pl-eyebrow" style={{ marginBottom: 12 }}>Meus objetivos</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {cursos.map((curso) => {
          const tipo = inferTipo(curso);
          const tipoInfo = TIPOS.find((t) => t.id === tipo) || TIPOS[0];
          const Icon = tipoInfo.icon;
          return (
            <div
              key={curso.id}
              className="pl-card"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px 8px 10px',
                cursor: 'pointer',
              }}
              onClick={() => onSetActiveTab?.('edital')}
              title="Abrir edital"
            >
              {curso.imagem_url ? (
                <img src={storageThumb(curso.imagem_url, 64)} alt="" loading="lazy" decoding="async" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: 'var(--pl-accent-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={14} style={{ color: 'var(--pl-accent)' }} />
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                  {curso.nome || curso.concurso}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: 'var(--pl-ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {tipoInfo.label}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove?.(curso.id); }}
                style={{ flexShrink: 0, padding: 2, border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--pl-ink-4)' }}
                title="Remover objetivo"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Catalog View (Concurso / Vestibular) ────────────────────────────────────

function CatalogoView({ catalog, tipo, cursos, onImport, onOpenDetail, limiteAtingido, isAdmin }) {
  const [query, setQuery] = useState('');
  const [importingId, setImportingId] = useState('');

  const filtered = useMemo(() => {
    const tipoFiltro = tipo === 'vestibular' ? 'vestibular' : 'concurso';
    const base = catalog.filter((c) => {
      const cTipo = c.tipo || 'concurso';
      return cTipo === tipoFiltro;
    });

    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (c) =>
        (c.nome || '').toLowerCase().includes(q) ||
        (c.concurso || '').toLowerCase().includes(q) ||
        (c.banca || '').toLowerCase().includes(q) ||
        (c.area || '').toLowerCase().includes(q)
    );
  }, [catalog, tipo, query]);

  const alreadyAdded = useMemo(
    () => new Set((cursos || []).map((c) => c.plano || c.nome)),
    [cursos]
  );

  const handleImport = async (c) => {
    if (importingId || limiteAtingido) return;
    setImportingId(c.id);
    try {
      await onImport(c);
    } finally {
      setImportingId('');
    }
  };

  if (filtered.length === 0 && !query) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <GraduationCap size={32} style={{ color: 'var(--pl-ink-4)', marginBottom: 12 }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
          {tipo === 'vestibular' ? 'Nenhum vestibular cadastrado ainda.' : 'Catálogo vazio.'}
        </p>
        {isAdmin && (
          <p style={{ fontSize: 12, color: 'var(--pl-ink-3)', marginTop: 6 }}>
            Adicione pelo painel Admin → Catálogo e defina o tipo como "{tipo === 'vestibular' ? 'vestibular' : 'concurso'}".
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ position: 'relative', maxWidth: 400 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--pl-ink-4)', pointerEvents: 'none' }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, banca, área..."
          className="pl-input"
          style={{ width: '100%', paddingLeft: 32, boxSizing: 'border-box' }}
        />
      </div>

      {limiteAtingido && (
        <div className="pl-card-paper" style={{ padding: '10px 14px' }}>
          <p style={{ fontSize: 12, color: 'var(--pl-warn)', fontWeight: 600 }}>
            Limite de objetivos atingido. Faça upgrade do plano para adicionar mais.
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--pl-ink-3)', textAlign: 'center', padding: '24px 0' }}>Nenhum resultado para "{query}".</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtered.map((c) => {
            const area = getAreaToken(c.area || 'Geral');
            const added = alreadyAdded.has(c.plano || c.nome);
            const loading = importingId === c.id;
            return (
              <div key={c.id} className="pl-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  style={{ height: 4, background: area.cover }}
                />
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {c.imagem_url ? (
                      <img src={storageThumb(c.imagem_url, 80)} alt="" loading="lazy" decoding="async" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                        background: area.cover + '22',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, color: area.cover,
                      }}>
                        {(c.nome || 'C').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)', lineHeight: 1.3 }}>{c.nome}</p>
                      {c.banca && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--pl-ink-3)' }}>{c.banca}</p>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="pl-btn pl-btn-ghost pl-btn-sm"
                      onClick={() => onOpenDetail?.(c)}
                      style={{ fontSize: 11 }}
                    >
                      Ver detalhes
                      <ExternalLink size={10} />
                    </button>
                    {added ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--pl-success)', fontWeight: 600 }}>
                        <CheckCircle2 size={12} />
                        Adicionado
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="pl-btn pl-btn-primary pl-btn-sm"
                        disabled={loading || limiteAtingido}
                        onClick={() => handleImport(c)}
                        style={{ fontSize: 11 }}
                      >
                        {loading ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                        Adicionar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ENEM View ────────────────────────────────────────────────────────────────

function EnemView({ cursos, onImport, limiteAtingido }) {
  const [loading, setLoading] = useState(false);
  const jaAdicionado = (cursos || []).some((c) => inferTipo(c) === 'enem' || (c.nome || '').toLowerCase().includes('enem'));

  const handleAdd = async () => {
    if (loading || limiteAtingido || jaAdicionado) return;
    setLoading(true);
    try {
      await onImport({
        id: 'enem-nacional',
        nome: 'ENEM — Exame Nacional do Ensino Médio',
        plano: 'ENEM',
        concurso: 'ENEM',
        area: 'Geral',
        banca: 'INEP/MEC',
        tipo: 'enem',
        origem: 'catalogo',
        descricao: 'O Exame Nacional do Ensino Médio avalia o desempenho escolar ao final da educação básica.',
        imagem_url: '',
        status: 'ativo',
        status_concurso: 'previsto',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div className="pl-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: 'var(--pl-accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Star size={22} style={{ color: 'var(--pl-accent)' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)' }}>ENEM</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--pl-ink-3)' }}>Exame Nacional do Ensino Médio · INEP/MEC</p>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--pl-ink-2)', lineHeight: 1.55, marginBottom: 16 }}>
          O ENEM é a porta de entrada para o ensino superior no Brasil. Adicione para ter
          um plano de estudos com as 5 áreas do conhecimento e acesso a questões anteriores.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {['Linguagens, Códigos e suas Tecnologias', 'Ciências Humanas e suas Tecnologias', 'Ciências da Natureza e suas Tecnologias', 'Matemática e suas Tecnologias', 'Redação'].map((area) => (
            <div key={area} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--pl-ink-2)' }}>
              <BookOpen size={12} style={{ color: 'var(--pl-accent)', flexShrink: 0 }} />
              {area}
            </div>
          ))}
        </div>

        {jaAdicionado ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--pl-success)' }}>
            <CheckCircle2 size={16} />
            ENEM já adicionado aos seus objetivos.
          </div>
        ) : (
          <button
            type="button"
            className="pl-btn pl-btn-primary"
            disabled={loading || limiteAtingido}
            onClick={handleAdd}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Adicionar ENEM
          </button>
        )}
      </div>
    </div>
  );
}


// ─── Livre View ───────────────────────────────────────────────────────────────

function LivreView({ onCreateCourse, limiteAtingido }) {
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nomeClean = nome.trim();
    if (!nomeClean || loading || limiteAtingido) return;
    setLoading(true);
    try {
      await onCreateCourse({
        nome: nomeClean,
        plano: nomeClean,
        tipo: 'livre',
        intent: 'livre',
        origem: 'manual',
        area: 'Geral',
        banca: '',
      });
      setNome('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div className="pl-card" style={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: 'var(--pl-bg-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Compass size={20} style={{ color: 'var(--pl-ink-2)' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)' }}>Objetivo livre</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--pl-ink-3)' }}>Você define o nome, as disciplinas e os tópicos.</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--pl-ink-2)', lineHeight: 1.55 }}>
            Ideal para estudos sem edital fixo — idiomas, habilidades técnicas, concursos menores
            ou qualquer coisa que não se encaixe nas categorias acima.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }} htmlFor="livre-nome">
              Nome do objetivo
            </label>
            <input
              id="livre-nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Inglês para intercâmbio, Estudo bíblico..."
              className="pl-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              maxLength={80}
              disabled={limiteAtingido}
            />
          </div>

          {limiteAtingido ? (
            <p style={{ fontSize: 12, color: 'var(--pl-warn)', fontWeight: 600 }}>
              Limite de objetivos atingido. Faça upgrade para adicionar mais.
            </p>
          ) : success ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--pl-success)' }}>
              <CheckCircle2 size={15} />
              Objetivo criado! Acesse-o em "Meus objetivos" acima.
            </div>
          ) : (
            <button
              type="submit"
              className="pl-btn pl-btn-primary"
              disabled={!nome.trim() || loading}
              style={{ alignSelf: 'flex-start' }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Criar objetivo
            </button>
          )}
        </form>
      </div>

      <div className="pl-card-paper" style={{ marginTop: 12, padding: '10px 14px' }}>
        <p style={{ fontSize: 12, color: 'var(--pl-ink-3)', lineHeight: 1.5, margin: 0 }}>
          Depois de criar, vá em <strong style={{ color: 'var(--pl-ink-2)' }}>Edital verticalizado</strong> para
          configurar as disciplinas e tópicos do seu objetivo livre.
        </p>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Objetivos({
  concursoCatalog = [],
  courseTemplates = [],
  cursos = [],
  onImportCatalogCourse,
  onOpenContestDetail,
  remainingCourseSlots = 3,
  isAdmin = false,
  setActiveTab,
  onRemoveCourse,
}) {
  const [tipoAtivo, setTipoAtivo] = useState('concurso');

  const limiteAtingido = !isAdmin && remainingCourseSlots <= 0;

  const cursosAtivos = useMemo(
    () => (cursos || []).filter((c) => c.status !== 'arquivado'),
    [cursos]
  );

  const handleCreateCourse = async (courseData) => {
    await onImportCatalogCourse?.(courseData);
  };

  const kpis = [
    { label: 'Objetivos', value: cursosAtivos.length },
    { label: 'Concursos', value: cursosAtivos.filter((c) => inferTipo(c) === 'concurso').length },
    { label: 'Vestibulares', value: cursosAtivos.filter((c) => inferTipo(c) === 'vestibular').length },
    { label: 'Faculdade / Livre', value: cursosAtivos.filter((c) => ['faculdade', 'livre', 'enem'].includes(inferTipo(c))).length },
  ];

  return (
    <div className="pl-paper-bg" style={{ padding: '28px 28px 48px' }}>
      {/* Hero */}
      <div style={{ marginBottom: 28 }}>
        <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Objetivos de estudo</p>
        <h1 className="pl-display" style={{ marginBottom: 10 }}>
          O que você está estudando<span style={{ color: 'var(--pl-accent)' }}>.</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', maxWidth: 560, lineHeight: 1.55 }}>
          Concurso público, vestibular, ENEM, faculdade ou estudo livre — organize tudo em um lugar
          e acompanhe disciplinas, tópicos e progresso de cada objetivo.
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 28 }}>
        {kpis.map((k) => (
          <div key={k.label} className="pl-card" style={{ padding: '10px 14px' }}>
            <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{k.label}</p>
            <p className="pl-num" style={{ fontSize: 28, color: 'var(--pl-ink)', lineHeight: 1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Meus objetivos */}
      <MeusObjetivos
        cursos={cursosAtivos}
        onSetActiveTab={setActiveTab}
        onRemove={onRemoveCourse}
      />

      {/* Adicionar novo objetivo */}
      <div>
        <p className="pl-eyebrow" style={{ marginBottom: 14 }}>Adicionar objetivo</p>

        {/* Tabs de tipo */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--pl-rule-2)', paddingBottom: 16 }}>
          {TIPOS.map(({ id, label, icon: Icon }) => {
            const isActive = tipoAtivo === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTipoAtivo(id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 20,
                  border: isActive ? '1px solid var(--pl-accent)' : '1px solid var(--pl-rule-2)',
                  background: isActive ? 'var(--pl-accent)' : 'var(--pl-surface)',
                  color: isActive ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
                  fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all .12s',
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Conteúdo por tipo */}
        {tipoAtivo === 'concurso' && (
          <CatalogoView
            catalog={concursoCatalog}
            tipo="concurso"
            cursos={cursos}
            onImport={onImportCatalogCourse}
            onOpenDetail={onOpenContestDetail}
            limiteAtingido={limiteAtingido}
            isAdmin={isAdmin}
          />
        )}

        {tipoAtivo === 'vestibular' && (
          <CourseTemplateView
            courseTemplates={courseTemplates}
            intentFilter="vestibular"
            cursos={cursos}
            onCreateCourse={handleCreateCourse}
            limiteAtingido={limiteAtingido}
            isAdmin={isAdmin}
          />
        )}

        {tipoAtivo === 'enem' && (
          <EnemView
            cursos={cursos}
            onImport={handleCreateCourse}
            limiteAtingido={limiteAtingido}
          />
        )}

        {tipoAtivo === 'faculdade' && (
          <CourseTemplateView
            courseTemplates={courseTemplates}
            intentFilter="faculdade"
            cursos={cursos}
            onCreateCourse={handleCreateCourse}
            limiteAtingido={limiteAtingido}
            isAdmin={isAdmin}
          />
        )}

        {tipoAtivo === 'livre' && (
          <LivreView
            onCreateCourse={handleCreateCourse}
            limiteAtingido={limiteAtingido}
          />
        )}
      </div>
    </div>
  );
}
