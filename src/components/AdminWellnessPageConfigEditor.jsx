import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { WELLNESS_PAGE_ICON_KEYS } from '../lib/wellnessPageConfig';

function FieldLabel({ children }) {
  return <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{children}</p>;
}

function IconSelect({ value, onChange, style = {} }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pl-input"
      style={style}
    >
      {WELLNESS_PAGE_ICON_KEYS.map((k) => (
        <option key={k} value={k}>
          {k}
        </option>
      ))}
    </select>
  );
}

export default function AdminWellnessPageConfigEditor({ config, setConfig }) {
  const patch = (partial) => setConfig((prev) => ({ ...prev, ...partial }));

  const updateStatusCard = (index, fields) => {
    setConfig((prev) => {
      const next = [...prev.statusCards];
      next[index] = { ...next[index], ...fields };
      return { ...prev, statusCards: next };
    });
  };

  const updateWellbeingChip = (index, fields) => {
    setConfig((prev) => {
      const next = [...prev.wellbeingPlan];
      next[index] = { ...next[index], ...fields };
      return { ...prev, wellbeingPlan: next };
    });
  };

  const updateOverviewCard = (id, fields) => {
    setConfig((prev) => ({
      ...prev,
      overviewCards: prev.overviewCards.map((row) => (row.id === id ? { ...row, ...fields } : row)),
    }));
  };

  const updateDailySignal = (index, fields) => {
    setConfig((prev) => {
      const next = [...prev.dailySignals];
      next[index] = { ...next[index], ...fields };
      return { ...prev, dailySignals: next };
    });
  };

  const updateTechnique = (id, fields) => {
    setConfig((prev) => ({
      ...prev,
      breathingTechniques: prev.breathingTechniques.map((t) => (t.id === id ? { ...t, ...fields } : t)),
    }));
  };

  const updatePhase = (techId, phaseIndex, fields) => {
    setConfig((prev) => ({
      ...prev,
      breathingTechniques: prev.breathingTechniques.map((t) => {
        if (t.id !== techId) return t;
        const fases = [...t.fases];
        fases[phaseIndex] = { ...fases[phaseIndex], ...fields };
        return { ...t, fases };
      }),
    }));
  };

  const addPhase = (techId) => {
    setConfig((prev) => ({
      ...prev,
      breathingTechniques: prev.breathingTechniques.map((t) =>
        t.id === techId ? { ...t, fases: [...t.fases, { nome: 'Nova fase', segundos: 4 }] } : t
      ),
    }));
  };

  const removePhase = (techId, phaseIndex) => {
    setConfig((prev) => ({
      ...prev,
      breathingTechniques: prev.breathingTechniques.map((t) => {
        if (t.id !== techId) return t;
        if (t.fases.length <= 1) return t;
        const fases = t.fases.filter((_, i) => i !== phaseIndex);
        return { ...t, fases };
      }),
    }));
  };

  const addTechnique = () => {
    const id = `breath-${Date.now()}`;
    setConfig((prev) => ({
      ...prev,
      breathingTechniques: [
        ...prev.breathingTechniques,
        {
          id,
          nome: 'Nova respiracao',
          uso: 'Apoio',
          descricao: '',
          comoFazer: '',
          insight: '',
          fases: [
            { nome: 'Inspire', segundos: 4 },
            { nome: 'Expire', segundos: 6 },
          ],
        },
      ],
    }));
  };

  const removeTechnique = (id) => {
    setConfig((prev) => {
      if (prev.breathingTechniques.length <= 1) return prev;
      return { ...prev, breathingTechniques: prev.breathingTechniques.filter((t) => t.id !== id) };
    });
  };

  const c = config;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Topo da pagina */}
      <div className="pl-card" style={{ padding: 16, background: 'var(--pl-bg-soft)' }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Topo da pagina</h4>
        <div style={{ marginTop: 12, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <FieldLabel>Etiqueta (badge)</FieldLabel>
            <input
              type="text"
              value={c.hero.badge}
              onChange={(e) => patch({ hero: { ...c.hero, badge: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <FieldLabel>Titulo principal</FieldLabel>
            <input
              type="text"
              value={c.hero.title}
              onChange={(e) => patch({ hero: { ...c.hero, title: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <FieldLabel>Subtitulo</FieldLabel>
            <textarea
              rows={2}
              value={c.hero.subtitle}
              onChange={(e) => patch({ hero: { ...c.hero, subtitle: e.target.value } })}
              className="pl-input"
            />
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <FieldLabel>Citacao — prefixo</FieldLabel>
            <input
              type="text"
              value={c.quote.prefix}
              onChange={(e) => patch({ quote: { ...c.quote, prefix: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <FieldLabel>Citacao — texto</FieldLabel>
            <textarea
              rows={2}
              value={c.quote.body}
              onChange={(e) => patch({ quote: { ...c.quote, body: e.target.value } })}
              className="pl-input"
            />
          </div>
        </div>
      </div>

      {/* Faixa CVV */}
      <div className="pl-card" style={{ padding: 16, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)' }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-danger)' }}>Faixa CVV (crise / apoio)</h4>
        <div style={{ marginTop: 12, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div>
            <FieldLabel>Rotulo superior</FieldLabel>
            <input
              type="text"
              value={c.cvv.eyebrow}
              onChange={(e) => patch({ cvv: { ...c.cvv, eyebrow: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div>
            <FieldLabel>Destaque (ex.: 188)</FieldLabel>
            <input
              type="text"
              value={c.cvv.phone}
              onChange={(e) => patch({ cvv: { ...c.cvv, phone: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div>
            <FieldLabel>Linha de apoio</FieldLabel>
            <input
              type="text"
              value={c.cvv.helper}
              onChange={(e) => patch({ cvv: { ...c.cvv, helper: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div>
            <FieldLabel>Texto do link</FieldLabel>
            <input
              type="text"
              value={c.cvv.linkLabel}
              onChange={(e) => patch({ cvv: { ...c.cvv, linkLabel: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <FieldLabel>URL</FieldLabel>
            <input
              type="url"
              value={c.cvv.url}
              onChange={(e) => patch({ cvv: { ...c.cvv, url: e.target.value } })}
              className="pl-input"
            />
          </div>
        </div>
      </div>

      {/* Status cards */}
      <div className="pl-card" style={{ padding: 16, boxShadow: 'var(--pl-sh-low)' }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Quatro cartoes de status (grade superior)</h4>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {c.statusCards.map((card, index) => (
            <div key={`st-${index}`} style={{ display: 'grid', gap: 8, gridTemplateColumns: '3fr 2fr 5fr 2fr', alignItems: 'end', borderRadius: 8, border: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: 12 }}>
              <div>
                <FieldLabel>Rotulo</FieldLabel>
                <input
                  type="text"
                  value={card.label}
                  onChange={(e) => updateStatusCard(index, { label: e.target.value })}
                  className="pl-input"
                />
              </div>
              <div>
                <FieldLabel>Valor</FieldLabel>
                <input
                  type="text"
                  value={card.value}
                  onChange={(e) => updateStatusCard(index, { value: e.target.value })}
                  className="pl-input"
                />
              </div>
              <div>
                <FieldLabel>Ajuda</FieldLabel>
                <input
                  type="text"
                  value={card.helper}
                  onChange={(e) => updateStatusCard(index, { helper: e.target.value })}
                  className="pl-input"
                />
              </div>
              <div>
                <FieldLabel>Icone</FieldLabel>
                <IconSelect value={card.icon} onChange={(v) => updateStatusCard(index, { icon: v })} style={{ marginTop: 4, width: '100%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumo / chips */}
      <div className="pl-card" style={{ padding: 16, boxShadow: 'var(--pl-sh-low)' }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Bloco "Resumo" (chips)</h4>
        <div style={{ marginTop: 12, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <FieldLabel>Destaque antes do texto</FieldLabel>
            <input
              type="text"
              value={c.resumo.introLead}
              onChange={(e) => patch({ resumo: { ...c.resumo, introLead: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <FieldLabel>Texto do resumo</FieldLabel>
            <textarea
              rows={2}
              value={c.resumo.intro}
              onChange={(e) => patch({ resumo: { ...c.resumo, intro: e.target.value } })}
              className="pl-input"
            />
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {c.wellbeingPlan.map((chip, index) => (
            <div key={`wb-${index}`} style={{ display: 'grid', gap: 8, gridTemplateColumns: '2fr 8fr 2fr', alignItems: 'end', borderRadius: 8, border: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: 12 }}>
              <div>
                <FieldLabel>Titulo</FieldLabel>
                <input
                  type="text"
                  value={chip.title}
                  onChange={(e) => updateWellbeingChip(index, { title: e.target.value })}
                  className="pl-input"
                />
              </div>
              <div>
                <FieldLabel>Texto</FieldLabel>
                <input
                  type="text"
                  value={chip.text}
                  onChange={(e) => updateWellbeingChip(index, { text: e.target.value })}
                  className="pl-input"
                />
              </div>
              <div>
                <FieldLabel>Icone</FieldLabel>
                <IconSelect value={chip.icon} onChange={(v) => updateWellbeingChip(index, { icon: v })} style={{ marginTop: 4, width: '100%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overview cards */}
      <div className="pl-card" style={{ padding: 16, boxShadow: 'var(--pl-sh-low)' }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Visao geral — tres cartoes grandes</h4>
        <p style={{ marginTop: 4, fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-2)' }}>Os ids fixos ligam aos botoes de navegacao (respiracao, meditacoes, pausas).</p>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {c.overviewCards.map((card) => (
            <div key={card.id} style={{ borderRadius: 8, border: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: 12 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-accent)' }}>{card.id}</p>
              <div style={{ marginTop: 8, display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <FieldLabel>Titulo</FieldLabel>
                  <input
                    type="text"
                    value={card.title}
                    onChange={(e) => updateOverviewCard(card.id, { title: e.target.value })}
                    className="pl-input"
                  />
                </div>
                <div>
                  <FieldLabel>Etiqueta (eyebrow)</FieldLabel>
                  <input
                    type="text"
                    value={card.eyebrow}
                    onChange={(e) => updateOverviewCard(card.id, { eyebrow: e.target.value })}
                    className="pl-input"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <FieldLabel>Texto</FieldLabel>
                  <textarea
                    rows={2}
                    value={card.text}
                    onChange={(e) => updateOverviewCard(card.id, { text: e.target.value })}
                    className="pl-input"
                  />
                </div>
                <div>
                  <FieldLabel>Icone</FieldLabel>
                  <IconSelect value={card.icon} onChange={(v) => updateOverviewCard(card.id, { icon: v })} style={{ marginTop: 4, width: '100%' }} />
                </div>
                <div>
                  <FieldLabel>Gradiente (Tailwind)</FieldLabel>
                  <input
                    type="text"
                    value={card.accent}
                    onChange={(e) => updateOverviewCard(card.id, { accent: e.target.value })}
                    className="pl-input"
                    style={{ fontFamily: 'var(--pl-mono)' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Direcionamento */}
      <div className="pl-card" style={{ padding: 16, boxShadow: 'var(--pl-sh-low)' }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Texto do painel "Direcionamento"</h4>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <FieldLabel>Etiqueta</FieldLabel>
            <input
              type="text"
              value={c.overviewDirection.eyebrow}
              onChange={(e) => patch({ overviewDirection: { ...c.overviewDirection, eyebrow: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div>
            <FieldLabel>Titulo</FieldLabel>
            <input
              type="text"
              value={c.overviewDirection.title}
              onChange={(e) => patch({ overviewDirection: { ...c.overviewDirection, title: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div>
            <FieldLabel>Paragrafo</FieldLabel>
            <textarea
              rows={3}
              value={c.overviewDirection.body}
              onChange={(e) => patch({ overviewDirection: { ...c.overviewDirection, body: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div>
            <FieldLabel>Pilula "Prioridade" (valor)</FieldLabel>
            <input
              type="text"
              value={c.overviewDirection.priorityPill}
              onChange={(e) => patch({ overviewDirection: { ...c.overviewDirection, priorityPill: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div>
            <FieldLabel>Etiqueta da coluna direita ("Leitura do dia")</FieldLabel>
            <input
              type="text"
              value={c.overviewReadingsEyebrow}
              onChange={(e) => patch({ overviewReadingsEyebrow: e.target.value })}
              className="pl-input"
            />
          </div>
        </div>
      </div>

      {/* Daily signals */}
      <div className="pl-card" style={{ padding: 16, boxShadow: 'var(--pl-sh-low)' }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Barras "Leitura do dia"</h4>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {c.dailySignals.map((row, index) => (
            <div key={`sig-${index}`} style={{ display: 'grid', gap: 8, gridTemplateColumns: '5fr 3fr 4fr', alignItems: 'end', borderRadius: 8, border: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: 12 }}>
              <div>
                <FieldLabel>Rotulo</FieldLabel>
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => updateDailySignal(index, { label: e.target.value })}
                  className="pl-input"
                />
              </div>
              <div>
                <FieldLabel>Valor (0–100)</FieldLabel>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={row.value}
                  onChange={(e) => updateDailySignal(index, { value: Number(e.target.value) })}
                  className="pl-input"
                />
              </div>
              <div>
                <FieldLabel>Tone</FieldLabel>
                <select
                  value={row.tone}
                  onChange={(e) => updateDailySignal(index, { tone: e.target.value })}
                  className="pl-input"
                >
                  <option value="default">default</option>
                  <option value="positive">positive</option>
                  <option value="warn">warn</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nav labels */}
      <div className="pl-card" style={{ padding: 16, boxShadow: 'var(--pl-sh-low)' }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Rotulos da navegacao</h4>
        <div style={{ marginTop: 12, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          {Object.entries(c.navLabels).map(([key, label]) => (
            <div key={key}>
              <FieldLabel>{key}</FieldLabel>
              <input
                type="text"
                value={label}
                onChange={(e) => patch({ navLabels: { ...c.navLabels, [key]: e.target.value } })}
                className="pl-input"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Section copy */}
      <div className="pl-card" style={{ padding: 16, boxShadow: 'var(--pl-sh-low)' }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Titulos das secoes (audio / video / respiracao)</h4>
        <div style={{ marginTop: 12, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <FieldLabel>Badge respiracao guiada</FieldLabel>
            <input
              type="text"
              value={c.sectionCopy.breathingBadge}
              onChange={(e) => patch({ sectionCopy: { ...c.sectionCopy, breathingBadge: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div>
            <FieldLabel>Biblioteca sonora — eyebrow</FieldLabel>
            <input
              type="text"
              value={c.sectionCopy.audioEyebrow}
              onChange={(e) => patch({ sectionCopy: { ...c.sectionCopy, audioEyebrow: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <FieldLabel>Biblioteca sonora — titulo</FieldLabel>
            <input
              type="text"
              value={c.sectionCopy.audioTitle}
              onChange={(e) => patch({ sectionCopy: { ...c.sectionCopy, audioTitle: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div>
            <FieldLabel>Pausas — titulo</FieldLabel>
            <input
              type="text"
              value={c.sectionCopy.videoTitle}
              onChange={(e) => patch({ sectionCopy: { ...c.sectionCopy, videoTitle: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div>
            <FieldLabel>Pausas — selo</FieldLabel>
            <input
              type="text"
              value={c.sectionCopy.videoBadge}
              onChange={(e) => patch({ sectionCopy: { ...c.sectionCopy, videoBadge: e.target.value } })}
              className="pl-input"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <FieldLabel>Pausas — texto explicativo</FieldLabel>
            <textarea
              rows={2}
              value={c.sectionCopy.videoBody}
              onChange={(e) => patch({ sectionCopy: { ...c.sectionCopy, videoBody: e.target.value } })}
              className="pl-input"
            />
          </div>
        </div>
      </div>

      {/* Respiracoes guiadas */}
      <div className="pl-card" style={{ padding: 16, border: '1px solid var(--pl-accent-soft)', background: 'var(--pl-accent-soft)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Respiracoes guiadas</h4>
          <button
            type="button"
            onClick={addTechnique}
            className="pl-btn pl-btn-ghost pl-btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={14} />
            Adicionar tecnica
          </button>
        </div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {c.breathingTechniques.map((tech) => (
            <div key={tech.id} className="pl-card" style={{ padding: 12, background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-low)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>
                  {tech.nome || tech.id}
                  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-ink-3)' }}>{tech.id}</span>
                </p>
                <button
                  type="button"
                  disabled={c.breathingTechniques.length <= 1}
                  onClick={() => removeTechnique(tech.id)}
                  className="pl-btn pl-btn-ghost pl-btn-sm"
                  style={{ width: 36, height: 36, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-danger)', borderColor: 'var(--pl-danger-soft)', opacity: c.breathingTechniques.length <= 1 ? 0.4 : 1 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--pl-rule)', paddingTop: 12 }}>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
                  <div>
                    <FieldLabel>Id (slug, estavel)</FieldLabel>
                    <input
                      type="text"
                      value={tech.id}
                      onChange={(e) => {
                        const nextId = e.target.value.replace(/\s+/g, '_');
                        setConfig((prev) => ({
                          ...prev,
                          breathingTechniques: prev.breathingTechniques.map((t) =>
                            t.id === tech.id ? { ...t, id: nextId || t.id } : t
                          ),
                        }));
                      }}
                      className="pl-input"
                      style={{ fontFamily: 'var(--pl-mono)', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <FieldLabel>Nome</FieldLabel>
                    <input
                      type="text"
                      value={tech.nome}
                      onChange={(e) => updateTechnique(tech.id, { nome: e.target.value })}
                      className="pl-input"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Uso (subtitulo curto)</FieldLabel>
                  <input
                    type="text"
                    value={tech.uso}
                    onChange={(e) => updateTechnique(tech.id, { uso: e.target.value })}
                    className="pl-input"
                  />
                </div>
                <div>
                  <FieldLabel>Descricao</FieldLabel>
                  <textarea
                    rows={2}
                    value={tech.descricao}
                    onChange={(e) => updateTechnique(tech.id, { descricao: e.target.value })}
                    className="pl-input"
                  />
                </div>
                <div>
                  <FieldLabel>Como fazer</FieldLabel>
                  <textarea
                    rows={2}
                    value={tech.comoFazer}
                    onChange={(e) => updateTechnique(tech.id, { comoFazer: e.target.value })}
                    className="pl-input"
                  />
                </div>
                <div>
                  <FieldLabel>Insight</FieldLabel>
                  <textarea
                    rows={2}
                    value={tech.insight}
                    onChange={(e) => updateTechnique(tech.id, { insight: e.target.value })}
                    className="pl-input"
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <FieldLabel>Fases (nome + segundos)</FieldLabel>
                    <button type="button" onClick={() => addPhase(tech.id)} style={{ fontSize: 11, fontWeight: 700, color: 'var(--pl-accent)', background: 'none', border: 0, cursor: 'pointer' }}>
                      + fase
                    </button>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tech.fases.map((fase, fi) => (
                      <div key={`${tech.id}-f-${fi}`} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 8 }}>
                        <input
                          type="text"
                          value={fase.nome}
                          onChange={(e) => updatePhase(tech.id, fi, { nome: e.target.value })}
                          className="pl-input"
                          style={{ flex: 1, minWidth: 128 }}
                          placeholder="Nome da fase"
                        />
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={fase.segundos}
                          onChange={(e) => updatePhase(tech.id, fi, { segundos: Number(e.target.value) })}
                          className="pl-input"
                          style={{ width: 80 }}
                        />
                        <button
                          type="button"
                          disabled={tech.fases.length <= 1}
                          onClick={() => removePhase(tech.id, fi)}
                          className="pl-btn pl-btn-ghost pl-btn-sm"
                          style={{ fontSize: 10, fontWeight: 700, color: 'var(--pl-danger)', borderColor: 'var(--pl-danger-soft)', opacity: tech.fases.length <= 1 ? 0.4 : 1 }}
                        >
                          remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
