import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Loader2, Network, RefreshCw, Save, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import AdminPageHeader from '../components/AdminPageHeader';
import { showConfirm, showToast } from '../lib/dialogs';
import {
  deleteMindMapGalleryItem,
  insertMindMapGalleryItem,
  loadMindMapGalleryRows,
  sanitizeDadosForGallerySave,
  updateMindMapGalleryItem,
} from '../lib/mindMapGalleryApi';
import { normalizeMindMapRecord } from '../lib/mindMaps';

export default function AdminMindMapsGallery({
  bancoDisciplinas = [],
  contestLibrary = [],
  subjectCatalog = [],
  currentUserId = '',
}) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');

  const context = useMemo(
    () => ({ bancoDisciplinas, contestLibrary, subjectCatalog }),
    [bancoDisciplinas, contestLibrary, subjectCatalog]
  );

  const refresh = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await loadMindMapGalleryRows();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(
        e?.message ||
          'Nao foi possivel carregar a galeria. Rode supabase/mind_map_gallery.sql e confira se o usuario admin tem role=admin ou e-mail cadastrado na funcao.'
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!currentUserId) {
      showToast('Faca login para publicar mapas na galeria.', 'error');
      return;
    }

    try {
      const parsed = JSON.parse(await file.text());
      const normalized = normalizeMindMapRecord(
        {
          ...parsed,
          id: parsed?.id || `tpl-${Date.now()}`,
          titulo: parsed?.titulo || file.name.replace(/\.json$/i, ''),
          sourceType: 'gallery',
        },
        context
      );
      const dados = sanitizeDadosForGallerySave(normalized);
      const nextOrder = rows.length ? Math.max(...rows.map((r) => Number(r.sort_order) || 0)) + 1 : 0;
      await insertMindMapGalleryItem({
        titulo: normalized.titulo,
        dados,
        sort_order: nextOrder,
      });
      await refresh();
    } catch (e) {
      console.error(e);
      showToast(e?.message || 'JSON invalido ou permissao negada (apenas admin).', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!await showConfirm('Remover este mapa da galeria pública?', { confirmLabel: 'Remover', danger: true })) return;
    setSavingId(id);
    try {
      await deleteMindMapGalleryItem(id);
      await refresh();
    } catch (e) {
      showToast(e?.message || 'Nao foi possivel remover.', 'error');
    } finally {
      setSavingId('');
    }
  };

  const handleSaveTitulo = async (row, rawNext) => {
    const t = String(rawNext ?? '').trim() || String(row.titulo || '').trim();
    setSavingId(row.id);
    try {
      await updateMindMapGalleryItem(row.id, { titulo: t });
      await refresh();
    } catch (e) {
      showToast(e?.message || 'Nao foi possivel salvar.', 'error');
    } finally {
      setSavingId('');
    }
  };

  const handleMove = async (row, delta) => {
    const idx = rows.findIndex((r) => r.id === row.id);
    const target = rows[idx + delta];
    if (!target) return;
    setSavingId('reorder');
    try {
      const a = Number(row.sort_order) || 0;
      const b = Number(target.sort_order) || 0;
      await updateMindMapGalleryItem(row.id, { sort_order: b });
      await updateMindMapGalleryItem(target.id, { sort_order: a });
      await refresh();
    } catch (e) {
      showToast(e?.message || 'Nao foi possivel reordenar.', 'error');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="pl-page">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <AdminPageHeader
          icon={Network}
          badge="Admin · conteúdo global"
          title="Galeria de mapas mentais"
          subtitle={
            'Publique JSON exportado no app. Os modelos aparecem em Mapas mentais para todos os estudantes.' +
            (loading ? '' : ' ' + rows.length + (rows.length !== 1 ? ' modelos publicados.' : ' modelo publicado.'))
          }
          stats={[
            { key: 'count', label: 'Modelos publicados', value: loading ? '…' : String(rows.length), icon: Network, accent: 'indigo' },
            { key: 'hint', label: 'Visíveis em', value: 'Mapas mentais', icon: BookOpen, accent: 'violet' },
          ]}
        />

        <div className="pl-card" style={{ padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Publicar</p>
            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--pl-ink-2)' }}>Importe o mesmo JSON exportado da biblioteca de mapas.</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!currentUserId || loading}
              className="pl-btn pl-btn-primary pl-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <UploadCloud size={16} />
              Subir JSON
            </button>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="pl-btn pl-btn-ghost pl-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Atualizar lista
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImportFile} />
        </div>

        {error ? (
          <div style={{ borderRadius: 10, border: '1px solid var(--pl-warn)', background: 'var(--pl-warn-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{error}</div>
        ) : null}

        <div className="pl-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="pl-eyebrow">Itens publicados ({rows.length})</p>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '40px 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--pl-accent)' }} />
              Carregando…
            </div>
          ) : rows.length === 0 ? (
            <p style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>Nenhum mapa na galeria ainda. Suba um JSON para comecar.</p>
          ) : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, listStyle: 'none', margin: 0, padding: 0 }}>
              {rows.map((row, index) => {
                const dados = row.dados && typeof row.dados === 'object' ? row.dados : {};
                const nodes = Array.isArray(dados.nodes) ? dados.nodes.length : 0;
                const graphN = Array.isArray(dados.mindGraph?.nodes) ? dados.mindGraph.nodes.length : 0;

                return (
                  <li key={row.id} className="pl-card pl-card-paper" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 15, fontWeight: 600, color: 'var(--pl-ink)' }}>{row.titulo}</p>
                        <p style={{ marginTop: 4, fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
                          Ordem {row.sort_order} · Ramo lista: {nodes} · Grafo: {graphN} nos
                        </p>
                        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                          <input
                            type="text"
                            data-gallery-titulo={row.id}
                            defaultValue={row.titulo}
                            key={`${row.id}-${row.updated_at}`}
                            className="pl-input"
                            style={{ minWidth: 200, flex: 1 }}
                            placeholder="Titulo publico"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const inp = document.querySelector(`input[data-gallery-titulo="${row.id}"]`);
                              handleSaveTitulo(row, inp?.value);
                            }}
                            disabled={savingId === row.id}
                            className="pl-btn pl-btn-ghost pl-btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                          >
                            <Save size={14} />
                            Salvar titulo
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
                        <button
                          type="button"
                          disabled={index === 0 || savingId === 'reorder'}
                          onClick={() => handleMove(row, -1)}
                          className="pl-btn pl-btn-ghost pl-btn-sm"
                        >
                          Subir
                        </button>
                        <button
                          type="button"
                          disabled={index >= rows.length - 1 || savingId === 'reorder'}
                          onClick={() => handleMove(row, 1)}
                          className="pl-btn pl-btn-ghost pl-btn-sm"
                        >
                          Descer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          disabled={savingId === row.id}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 8, border: '1px solid var(--pl-danger)', background: 'var(--pl-surface)', padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--pl-danger)', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                          Excluir
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
