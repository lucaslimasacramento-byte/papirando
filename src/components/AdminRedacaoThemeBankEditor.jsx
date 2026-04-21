import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { REDACAO_BANCA_OPTIONS } from '../data/redacaoBancaGuides';

const EIXO_OPTIONS = [
  { value: 'seguranca', label: 'Segurança pública' },
  { value: 'meio-ambiente', label: 'Meio ambiente' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'sociedade', label: 'Sociedade e políticas' },
  { value: 'educacao', label: 'Educação' },
];

function inputCls() {
  return 'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-blue-500';
}

/**
 * @param {{ id: string, eixo: string, banca: string, title: string, description: string }[]} props.draft
 * @param {(fn: (d: unknown[]) => unknown[]) => void} props.onDraftChange
 */
export function AdminRedacaoThemeBankEditor({ draft, onDraftChange }) {
  const rows = Array.isArray(draft) ? draft : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-600">
          Cada item vira um card no banco de temas (aba Redações). Use o botão &quot;Salvar banco, kit e audiolivros&quot; na página de configurações.
        </p>
        <button
          type="button"
          onClick={() =>
            onDraftChange((prev) => [
              ...prev,
              {
                id: `t-${Date.now()}`,
                eixo: 'sociedade',
                banca: 'CESPE / CEBRASPE',
                title: '',
                description: '',
              },
            ])
          }
          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-900"
        >
          <Plus size={14} />
          Novo tema
        </button>
      </div>

      <div className="max-h-[min(70vh,520px)] space-y-3 overflow-y-auto pr-1">
        {rows.map((row, index) => (
          <div key={row.id || index} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tema {index + 1}</span>
              <button
                type="button"
                onClick={() => onDraftChange((prev) => prev.filter((_, i) => i !== index))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600"
                aria-label="Remover tema"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">id</span>
                <input
                  type="text"
                  value={row.id}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((prev) => prev.map((r, i) => (i === index ? { ...r, id: v } : r)));
                  }}
                  className={`${inputCls()} font-mono text-xs`}
                />
              </label>
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Eixo</span>
                <select
                  value={row.eixo || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((prev) => prev.map((r, i) => (i === index ? { ...r, eixo: v } : r)));
                  }}
                  className={inputCls()}
                >
                  {EIXO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Banca</span>
                <select
                  value={row.banca || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((prev) => prev.map((r, i) => (i === index ? { ...r, banca: v } : r)));
                  }}
                  className={inputCls()}
                >
                  {REDACAO_BANCA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Título da proposta</span>
                <input
                  type="text"
                  value={row.title}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((prev) => prev.map((r, i) => (i === index ? { ...r, title: v } : r)));
                  }}
                  className={inputCls()}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Descrição / comando</span>
                <textarea
                  rows={3}
                  value={row.description}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((prev) => prev.map((r, i) => (i === index ? { ...r, description: v } : r)));
                  }}
                  className={inputCls()}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
