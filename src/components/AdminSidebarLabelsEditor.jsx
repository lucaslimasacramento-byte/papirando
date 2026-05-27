import React, { useMemo, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { getSidebarNavLabelSchema } from '../lib/sidebarNavLabels';

/**
 * @param {Record<string, string> | null | undefined} props.sidebarLabelsOverride mapa gravado no Supabase (só diferenças)
 * @param {(payload: Record<string, string>) => Promise<{ ok?: boolean, error?: string }>} props.onSave
 */
export function AdminSidebarLabelsEditor({ sidebarLabelsOverride, onSave }) {
  const schema = useMemo(() => getSidebarNavLabelSchema(), []);
  const [draftById, setDraftById] = useState(() => ({}));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const mergedInitial = useMemo(() => {
    const o = sidebarLabelsOverride && typeof sidebarLabelsOverride === 'object' ? sidebarLabelsOverride : {};
    const next = {};
    schema.forEach(({ id, defaultLabel }) => {
      next[id] = (typeof o[id] === 'string' && o[id].trim() ? o[id].trim() : '') || defaultLabel;
    });
    return next;
  }, [schema, sidebarLabelsOverride]);

  React.useEffect(() => {
    setDraftById(mergedInitial);
  }, [mergedInitial]);

  const buildPayloadFromDraft = () => {
    const out = {};
    schema.forEach(({ id, defaultLabel }) => {
      const v = String(draftById[id] ?? '').trim();
      if (v && v !== defaultLabel) out[id] = v;
    });
    return out;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.55, color: 'var(--pl-ink-2)' }}>
        Os textos padrão vêm do código; aqui você grava só o que quiser substituir. Deixe igual ao padrão ou
        vazio para voltar ao texto original daquele item. É necessário ter rodado no Supabase o script{' '}
        <code style={{ borderRadius: 4, background: 'var(--pl-bg-soft)', padding: '1px 5px', fontSize: 11, fontFamily: 'var(--pl-mono)' }}>redacao_site_content_sidebar_labels.sql</code>.
      </p>

      {message ? (
        <div style={{ borderRadius: 12, border: '1px solid var(--pl-success-soft)', background: 'var(--pl-success-soft)', padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-success)' }}>
          {message}
        </div>
      ) : null}

      <div style={{ maxHeight: 'min(70vh, 560px)', overflowY: 'auto', borderRadius: 14, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-low)' }}>
        <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--pl-bg-soft)' }}>
            <tr>
              {['Seção', 'Id (interno)', 'Padrão', 'Nome no menu', ''].map((h) => (
                <th key={h} style={{ borderBottom: '1px solid var(--pl-rule-2)', padding: '8px 12px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--pl-ink-3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schema.map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px solid var(--pl-rule)' }}>
                <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{row.sectionTitle}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--pl-mono)', fontSize: 11, color: 'var(--pl-ink-3)' }}>{row.id}</td>
                <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--pl-ink-3)' }}>{row.defaultLabel}</td>
                <td style={{ padding: '8px 12px' }}>
                  <input
                    type="text"
                    value={draftById[row.id] ?? ''}
                    onChange={(e) => setDraftById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    className="pl-input"
                    style={{ width: '100%', minWidth: 140 }}
                    aria-label={`Nome no menu para ${row.id}`}
                  />
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                  <button
                    type="button"
                    title="Restaurar padrão"
                    onClick={() => setDraftById((prev) => ({ ...prev, [row.id]: row.defaultLabel }))}
                    style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', color: 'var(--pl-ink-3)', cursor: 'pointer' }}
                  >
                    <RotateCcw size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button
          type="button"
          disabled={saving || !onSave}
          onClick={async () => {
            if (!onSave) return;
            setSaving(true);
            setMessage('');
            try {
              const payload = buildPayloadFromDraft();
              const r = await onSave(payload);
              setMessage(r?.ok ? 'Rótulos do menu salvos no Supabase.' : `Erro: ${r?.error || 'falha'}`);
              window.setTimeout(() => setMessage(''), 3200);
            } catch (e) {
              setMessage(String(e?.message || e));
            } finally {
              setSaving(false);
            }
          }}
          className="pl-btn pl-btn-ghost"
          style={{ borderColor: 'var(--pl-accent)', color: 'var(--pl-accent)', opacity: saving || !onSave ? 0.5 : 1 }}
        >
          <Save size={15} />
          {saving ? 'Salvando…' : 'Salvar rótulos do menu'}
        </button>
      </div>
    </div>
  );
}
