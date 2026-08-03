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
  { id: 'enem', label: null, icon: null, wordmark: true },
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

function EnemView({ cursos, onImport, limiteAtingido, instituicoes = [], onUpdateTargets }) {
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const enemCurso = (cursos || []).find((c) => inferTipo(c) === 'enem' || (c.nome || '').toLowerCase().includes('enem'));
  const jaAdicionado = Boolean(enemCurso);

  const alvos = Array.isArray(enemCurso?.instituicoes_alvo) ? enemCurso.instituicoes_alvo : [];
  const alvoIds = new Set(alvos.map((a) => a.id));
  const maxAtingido = alvos.length >= 3;

  const toggleAlvo = (inst) => {
    if (!enemCurso || !onUpdateTargets) return;
    if (alvoIds.has(inst.id)) {
      onUpdateTargets(enemCurso.id, alvos.filter((a) => a.id !== inst.id));
    } else if (!maxAtingido) {
      onUpdateTargets(enemCurso.id, [...alvos, { id: inst.id, nome: inst.nome, uf: inst.uf || '', sigla: inst.concurso || '' }]);
    }
  };

  const q = busca.trim().toLowerCase();
  const instituicoesFiltradas = (instituicoes || [])
    .filter((inst) => !q || [inst.nome, inst.concurso, inst.uf].some((v) => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
    .slice(0, 40);

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

  const ENEM_AREAS = [
    { label: 'Linguagens', color: '#1e3a5f', day: 1 },
    { label: 'Ciências Humanas', color: '#7c4a1e', day: 1 },
    { label: 'Redação', color: '#7a1e2e', day: 1 },
    { label: 'Ciências da Natureza', color: '#1e4d35', day: 2 },
    { label: 'Matemática', color: '#3d1e5c', day: 2 },
  ];

  return (
    <div>
      {/* ── Hero navy card ─────────────────────────────────────────── */}
      <div style={{ borderRadius: 18, overflow: 'hidden', background: '#1e3a5f', boxShadow: '0 10px 36px rgba(30,58,95,0.28)', marginBottom: 12 }}>
        {/* Eyebrow */}
        <div style={{ padding: '16px 24px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.38)' }}>Exame Nacional</span>
          <span style={{ color: 'rgba(243,239,229,0.18)' }}>&middot;</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.38)' }}>INEP / MEC</span>
        </div>

        {/* Main body */}
        <div style={{ padding: '14px 24px 22px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <span style={{ fontFamily: 'var(--pl-sans)', fontSize: 48, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.055em', lineHeight: 1, display: 'block', marginBottom: 10 }}>enem</span>
            <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 500, color: 'rgba(243,239,229,0.58)', lineHeight: 1.5 }}>
              Acesso ao ensino superior via SiSU, ProUni e Fies
            </p>
            {/* Area chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ENEM_AREAS.map((a) => (
                <span key={a.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, border: '1px solid rgba(243,239,229,0.18)', background: 'rgba(243,239,229,0.07)', fontSize: 11, fontWeight: 600, color: 'rgba(243,239,229,0.7)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: a.day === 1 ? '#93b4ff' : '#c4b5fd', flexShrink: 0 }} />
                  {a.label}
                </span>
              ))}
            </div>
          </div>

          {/* Action button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'center', flexShrink: 0 }}>
            {jaAdicionado ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 10, background: 'rgba(134,239,172,0.15)', border: '1px solid rgba(134,239,172,0.3)', padding: '10px 18px', fontSize: 13, fontWeight: 700, color: '#86efac' }}>
                <CheckCircle2 size={15} />
                Nos seus objetivos
              </div>
            ) : (
              <button type="button"
                onClick={handleAdd}
                disabled={loading || limiteAtingido}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 10, background: '#f3efe5', color: '#1e3a5f', border: 'none', padding: '11px 20px', fontSize: 13, fontWeight: 700, boxShadow: '0 2px 10px rgba(0,0,0,0.18)', cursor: loading || limiteAtingido ? 'not-allowed' : 'pointer', opacity: loading || limiteAtingido ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Adicionar aos estudos
              </button>
            )}
          </div>
        </div>

        {/* Info strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid rgba(243,239,229,0.1)', background: 'rgba(0,0,0,0.18)' }}>
          {[
            { label: 'Taxa', value: 'R$ 85,00' },
            { label: '1º dia', value: '08/11/2026' },
            { label: '2º dia', value: '15/11/2026' },
            { label: 'Questões', value: '180' },
          ].map((f, i, arr) => (
            <div key={f.label} style={{ padding: '11px 16px', borderRight: i < arr.length - 1 ? '1px solid rgba(243,239,229,0.07)' : 'none' }}>
              <p style={{ margin: '0 0 3px', fontSize: 9, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.35)' }}>{f.label}</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#f3efe5' }}>{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dia legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--pl-ink-3)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#93b4ff', flexShrink: 0 }} />
          1º dia — Linguagens, Ciências Humanas e Redação
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--pl-ink-3)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#c4b5fd', flexShrink: 0 }} />
          2º dia — Ciências da Natureza e Matemática
        </div>
      </div>

      {/* Instituições-alvo: some quando não há instituições publicadas — decisão de
          produto (2026-08-03): sem catálogo, o aluno foca no ENEM em si; prometer
          uma escolha que pode não ter a instituição dele é pior do que não ter. */}
      {jaAdicionado && (instituicoes || []).length > 0 && (
        <div className="pl-card" style={{ padding: 24, marginTop: 16 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>Minhas instituições-alvo</p>
          <p style={{ margin: '4px 0 14px', fontSize: 12, color: 'var(--pl-ink-3)' }}>
            Escolha até 3 instituições que você quer alcançar com a nota do ENEM. {alvos.length}/3 selecionada(s).
          </p>

          {alvos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {alvos.map((a) => (
                <span key={a.id} className="pl-tag pl-tag-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {a.nome}{a.uf ? ` · ${a.uf}` : ''}
                  <button type="button" onClick={() => toggleAlvo({ id: a.id })} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'inherit', lineHeight: 0, padding: 0 }} title="Remover">
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--pl-ink-4)', pointerEvents: 'none' }} />
            <input
              className="pl-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar instituição por nome ou UF…"
              style={{ paddingLeft: 30, width: '100%' }}
            />
          </div>

          <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--pl-rule-2)', borderRadius: 6 }}>
            {(instituicoes || []).length === 0 ? (
              <p style={{ padding: 16, margin: 0, fontSize: 12, color: 'var(--pl-ink-3)' }}>
                Nenhuma instituição cadastrada ainda. (Admin → Catálogo → Instituições ENEM)
              </p>
            ) : instituicoesFiltradas.length === 0 ? (
              <p style={{ padding: 16, margin: 0, fontSize: 12, color: 'var(--pl-ink-3)' }}>Nenhuma instituição encontrada.</p>
            ) : (
              instituicoesFiltradas.map((inst) => {
                const sel = alvoIds.has(inst.id);
                const bloqueado = !sel && maxAtingido;
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => toggleAlvo(inst)}
                    disabled={bloqueado}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                      padding: '8px 12px', border: 0, borderBottom: '1px solid var(--pl-rule)', cursor: bloqueado ? 'not-allowed' : 'pointer',
                      background: sel ? 'var(--pl-accent-soft)' : 'transparent', opacity: bloqueado ? 0.45 : 1,
                    }}
                  >
                    <span style={{ width: 18, flexShrink: 0, color: 'var(--pl-accent)' }}>
                      {sel ? <CheckCircle2 size={16} /> : <Plus size={15} style={{ color: 'var(--pl-ink-4)' }} />}
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inst.nome}</span>
                      {(inst.concurso || inst.uf) && (
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--pl-ink-3)' }}>{[inst.concurso, inst.uf].filter(Boolean).join(' · ')}</span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
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
  onUpdateCourseTargets,
  onOpenContestDetail,
  remainingCourseSlots = 3,
  isAdmin = false,
  setActiveTab,
  onRemoveCourse,
}) {
  const [tipoAtivo, setTipoAtivo] = useState('concurso');
  const [importError, setImportError] = useState('');

  const limiteAtingido = !isAdmin && remainingCourseSlots <= 0;

  const cursosAtivos = useMemo(
    () => (cursos || []).filter((c) => c.status !== 'arquivado'),
    [cursos]
  );

  const handleCreateCourse = async (courseData) => {
    setImportError('');
    try {
      await onImportCatalogCourse?.(courseData);
    } catch (error) {
      // Feedback centralizado no banner; rethrow para a view-filha pular o estado de sucesso.
      setImportError(error?.message || 'Não foi possível adicionar esse objetivo. Tente novamente.');
      throw error;
    }
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

        {importError && (
          <div style={{
            padding: '10px 14px', marginBottom: 14,
            background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)',
            border: '1px solid var(--pl-danger)', borderLeft: '3px solid var(--pl-danger)',
            borderRadius: 4, fontSize: 13, fontWeight: 600,
          }}>{importError}</div>
        )}

        {/* Tabs de tipo */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--pl-rule-2)', paddingBottom: 16 }}>
          {TIPOS.map(({ id, label, icon: Icon, wordmark }) => {
            const isActive = tipoAtivo === id;
            const isEnem = id === 'enem';
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTipoAtivo(id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 20,
                  border: isActive
                    ? (isEnem ? '1px solid #1e3a5f' : '1px solid var(--pl-accent)')
                    : '1px solid var(--pl-rule-2)',
                  background: isActive
                    ? (isEnem ? '#1e3a5f' : 'var(--pl-accent)')
                    : 'var(--pl-surface)',
                  color: isActive
                    ? (isEnem ? '#f4d04e' : 'var(--pl-bg)')
                    : 'var(--pl-ink-2)',
                  fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all .12s',
                }}
              >
                {wordmark ? (
                  <span style={{ fontFamily: 'var(--pl-sans)', fontSize: 13, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>enem</span>
                ) : (
                  <><Icon size={13} />{label}</>
                )}
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
            onImport={handleCreateCourse}
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
            instituicoes={(concursoCatalog || []).filter((t) => t.tipo === 'enem_inst')}
            onUpdateTargets={onUpdateCourseTargets}
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
