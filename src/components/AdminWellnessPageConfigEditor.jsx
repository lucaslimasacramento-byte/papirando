import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { WELLNESS_PAGE_ICON_KEYS } from '../lib/wellnessPageConfig';

function FieldLabel({ children }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">{children}</p>;
}

function IconSelect({ value, onChange, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-blue-600 ${className}`}
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
          nome: 'Nova respiração',
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
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-ink-50/80 p-4">
        <h4 className="text-sm font-bold text-ink-900">Topo da página</h4>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <FieldLabel>Etiqueta (badge)</FieldLabel>
            <input
              type="text"
              value={c.hero.badge}
              onChange={(e) => patch({ hero: { ...c.hero, badge: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Título principal</FieldLabel>
            <input
              type="text"
              value={c.hero.title}
              onChange={(e) => patch({ hero: { ...c.hero, title: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Subtítulo</FieldLabel>
            <textarea
              rows={2}
              value={c.hero.subtitle}
              onChange={(e) => patch({ hero: { ...c.hero, subtitle: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
            />
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <FieldLabel>Citação — prefixo</FieldLabel>
            <input
              type="text"
              value={c.quote.prefix}
              onChange={(e) => patch({ quote: { ...c.quote, prefix: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Citação — texto</FieldLabel>
            <textarea
              rows={2}
              value={c.quote.body}
              onChange={(e) => patch({ quote: { ...c.quote, body: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
        <h4 className="text-sm font-bold text-rose-900">Faixa CVV (crise / apoio)</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <FieldLabel>Rótulo superior</FieldLabel>
            <input
              type="text"
              value={c.cvv.eyebrow}
              onChange={(e) => patch({ cvv: { ...c.cvv, eyebrow: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div>
            <FieldLabel>Destaque (ex.: 188)</FieldLabel>
            <input
              type="text"
              value={c.cvv.phone}
              onChange={(e) => patch({ cvv: { ...c.cvv, phone: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div>
            <FieldLabel>Linha de apoio</FieldLabel>
            <input
              type="text"
              value={c.cvv.helper}
              onChange={(e) => patch({ cvv: { ...c.cvv, helper: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div>
            <FieldLabel>Texto do link</FieldLabel>
            <input
              type="text"
              value={c.cvv.linkLabel}
              onChange={(e) => patch({ cvv: { ...c.cvv, linkLabel: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>URL</FieldLabel>
            <input
              type="url"
              value={c.cvv.url}
              onChange={(e) => patch({ cvv: { ...c.cvv, url: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className="text-sm font-bold text-ink-900">Quatro cartões de status (grade superior)</h4>
        <div className="mt-3 space-y-3">
          {c.statusCards.map((card, index) => (
            <div key={`st-${index}`} className="grid gap-2 rounded-xl border border-gray-100 bg-ink-50/60 p-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-3">
                <FieldLabel>Rótulo</FieldLabel>
                <input
                  type="text"
                  value={card.label}
                  onChange={(e) => updateStatusCard(index, { label: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold"
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Valor</FieldLabel>
                <input
                  type="text"
                  value={card.value}
                  onChange={(e) => updateStatusCard(index, { value: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold"
                />
              </div>
              <div className="md:col-span-5">
                <FieldLabel>Ajuda</FieldLabel>
                <input
                  type="text"
                  value={card.helper}
                  onChange={(e) => updateStatusCard(index, { helper: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium"
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Ícone</FieldLabel>
                <IconSelect value={card.icon} onChange={(v) => updateStatusCard(index, { icon: v })} className="mt-1 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className="text-sm font-bold text-ink-900">Bloco “Resumo” (chips)</h4>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <FieldLabel>Destaque antes do texto</FieldLabel>
            <input
              type="text"
              value={c.resumo.introLead}
              onChange={(e) => patch({ resumo: { ...c.resumo, introLead: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Texto do resumo</FieldLabel>
            <textarea
              rows={2}
              value={c.resumo.intro}
              onChange={(e) => patch({ resumo: { ...c.resumo, intro: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium"
            />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {c.wellbeingPlan.map((chip, index) => (
            <div key={`wb-${index}`} className="grid gap-2 rounded-xl border border-gray-100 bg-ink-50/60 p-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-2">
                <FieldLabel>Título</FieldLabel>
                <input
                  type="text"
                  value={chip.title}
                  onChange={(e) => updateWellbeingChip(index, { title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold"
                />
              </div>
              <div className="md:col-span-8">
                <FieldLabel>Texto</FieldLabel>
                <input
                  type="text"
                  value={chip.text}
                  onChange={(e) => updateWellbeingChip(index, { text: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium"
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Ícone</FieldLabel>
                <IconSelect value={chip.icon} onChange={(v) => updateWellbeingChip(index, { icon: v })} className="mt-1 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className="text-sm font-bold text-ink-900">Visão geral — três cartões grandes</h4>
        <p className="mt-1 text-xs font-medium text-gray-500">Os ids fixos ligam aos botões de navegação (respiracao, meditacoes, pausas).</p>
        <div className="mt-3 space-y-4">
          {c.overviewCards.map((card) => (
            <div key={card.id} className="rounded-xl border border-gray-100 bg-ink-50/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{card.id}</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <div>
                  <FieldLabel>Título</FieldLabel>
                  <input
                    type="text"
                    value={card.title}
                    onChange={(e) => updateOverviewCard(card.id, { title: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <FieldLabel>Etiqueta (eyebrow)</FieldLabel>
                  <input
                    type="text"
                    value={card.eyebrow}
                    onChange={(e) => updateOverviewCard(card.id, { eyebrow: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Texto</FieldLabel>
                  <textarea
                    rows={2}
                    value={card.text}
                    onChange={(e) => updateOverviewCard(card.id, { text: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium"
                  />
                </div>
                <div>
                  <FieldLabel>Ícone</FieldLabel>
                  <IconSelect value={card.icon} onChange={(v) => updateOverviewCard(card.id, { icon: v })} className="mt-1 w-full" />
                </div>
                <div>
                  <FieldLabel>Gradiente (Tailwind)</FieldLabel>
                  <input
                    type="text"
                    value={card.accent}
                    onChange={(e) => updateOverviewCard(card.id, { accent: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className="text-sm font-bold text-ink-900">Texto do painel “Direcionamento”</h4>
        <div className="mt-3 grid gap-3">
          <div>
            <FieldLabel>Etiqueta</FieldLabel>
            <input
              type="text"
              value={c.overviewDirection.eyebrow}
              onChange={(e) => patch({ overviewDirection: { ...c.overviewDirection, eyebrow: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div>
            <FieldLabel>Título</FieldLabel>
            <input
              type="text"
              value={c.overviewDirection.title}
              onChange={(e) => patch({ overviewDirection: { ...c.overviewDirection, title: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div>
            <FieldLabel>Parágrafo</FieldLabel>
            <textarea
              rows={3}
              value={c.overviewDirection.body}
              onChange={(e) => patch({ overviewDirection: { ...c.overviewDirection, body: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium"
            />
          </div>
          <div>
            <FieldLabel>Pílula “Prioridade” (valor)</FieldLabel>
            <input
              type="text"
              value={c.overviewDirection.priorityPill}
              onChange={(e) => patch({ overviewDirection: { ...c.overviewDirection, priorityPill: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div>
            <FieldLabel>Etiqueta da coluna direita (“Leitura do dia”)</FieldLabel>
            <input
              type="text"
              value={c.overviewReadingsEyebrow}
              onChange={(e) => patch({ overviewReadingsEyebrow: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className="text-sm font-bold text-ink-900">Barras “Leitura do dia”</h4>
        <div className="mt-3 space-y-3">
          {c.dailySignals.map((row, index) => (
            <div key={`sig-${index}`} className="grid gap-2 rounded-xl border border-gray-100 bg-ink-50/60 p-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-5">
                <FieldLabel>Rótulo</FieldLabel>
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => updateDailySignal(index, { label: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold"
                />
              </div>
              <div className="md:col-span-3">
                <FieldLabel>Valor (0–100)</FieldLabel>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={row.value}
                  onChange={(e) => updateDailySignal(index, { value: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold"
                />
              </div>
              <div className="md:col-span-4">
                <FieldLabel>Tone</FieldLabel>
                <select
                  value={row.tone}
                  onChange={(e) => updateDailySignal(index, { tone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold"
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

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className="text-sm font-bold text-ink-900">Rótulos da navegação</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(c.navLabels).map(([key, label]) => (
            <div key={key}>
              <FieldLabel>{key}</FieldLabel>
              <input
                type="text"
                value={label}
                onChange={(e) => patch({ navLabels: { ...c.navLabels, [key]: e.target.value } })}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className="text-sm font-bold text-ink-900">Títulos das seções (áudio / vídeo / respiração)</h4>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <FieldLabel>Badge respiração guiada</FieldLabel>
            <input
              type="text"
              value={c.sectionCopy.breathingBadge}
              onChange={(e) => patch({ sectionCopy: { ...c.sectionCopy, breathingBadge: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div>
            <FieldLabel>Biblioteca sonora — eyebrow</FieldLabel>
            <input
              type="text"
              value={c.sectionCopy.audioEyebrow}
              onChange={(e) => patch({ sectionCopy: { ...c.sectionCopy, audioEyebrow: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Biblioteca sonora — título</FieldLabel>
            <input
              type="text"
              value={c.sectionCopy.audioTitle}
              onChange={(e) => patch({ sectionCopy: { ...c.sectionCopy, audioTitle: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div>
            <FieldLabel>Pausas — título</FieldLabel>
            <input
              type="text"
              value={c.sectionCopy.videoTitle}
              onChange={(e) => patch({ sectionCopy: { ...c.sectionCopy, videoTitle: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div>
            <FieldLabel>Pausas — selo</FieldLabel>
            <input
              type="text"
              value={c.sectionCopy.videoBadge}
              onChange={(e) => patch({ sectionCopy: { ...c.sectionCopy, videoBadge: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Pausas — texto explicativo</FieldLabel>
            <textarea
              rows={2}
              value={c.sectionCopy.videoBody}
              onChange={(e) => patch({ sectionCopy: { ...c.sectionCopy, videoBody: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-ink-900">Respirações guiadas</h4>
          <button
            type="button"
            onClick={addTechnique}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700"
          >
            <Plus size={14} />
            Adicionar técnica
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {c.breathingTechniques.map((tech) => (
            <div key={tech.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink-900">
                  {tech.nome || tech.id}
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{tech.id}</span>
                </p>
                <button
                  type="button"
                  disabled={c.breathingTechniques.length <= 1}
                  onClick={() => removeTechnique(tech.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <FieldLabel>Id (slug, estável)</FieldLabel>
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
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <FieldLabel>Nome</FieldLabel>
                    <input
                      type="text"
                      value={tech.nome}
                      onChange={(e) => updateTechnique(tech.id, { nome: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Uso (subtítulo curto)</FieldLabel>
                  <input
                    type="text"
                    value={tech.uso}
                    onChange={(e) => updateTechnique(tech.id, { uso: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <FieldLabel>Descrição</FieldLabel>
                  <textarea
                    rows={2}
                    value={tech.descricao}
                    onChange={(e) => updateTechnique(tech.id, { descricao: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <FieldLabel>Como fazer</FieldLabel>
                  <textarea
                    rows={2}
                    value={tech.comoFazer}
                    onChange={(e) => updateTechnique(tech.id, { comoFazer: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <FieldLabel>Insight</FieldLabel>
                  <textarea
                    rows={2}
                    value={tech.insight}
                    onChange={(e) => updateTechnique(tech.id, { insight: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <FieldLabel>Fases (nome + segundos)</FieldLabel>
                    <button type="button" onClick={() => addPhase(tech.id)} className="text-[11px] font-bold text-blue-700">
                      + fase
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {tech.fases.map((fase, fi) => (
                      <div key={`${tech.id}-f-${fi}`} className="flex flex-wrap items-end gap-2">
                        <input
                          type="text"
                          value={fase.nome}
                          onChange={(e) => updatePhase(tech.id, fi, { nome: e.target.value })}
                          className="min-w-[8rem] flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs"
                          placeholder="Nome da fase"
                        />
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={fase.segundos}
                          onChange={(e) => updatePhase(tech.id, fi, { segundos: Number(e.target.value) })}
                          className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold"
                        />
                        <button
                          type="button"
                          disabled={tech.fases.length <= 1}
                          onClick={() => removePhase(tech.id, fi)}
                          className="rounded-lg border border-gray-200 px-2 py-1.5 text-[10px] font-bold text-red-600 disabled:opacity-40"
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
