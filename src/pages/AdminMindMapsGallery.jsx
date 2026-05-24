import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Loader2, Network, RefreshCw, Save, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';
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
      alert('Faca login para publicar mapas na galeria.');
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
      alert(e?.message || 'JSON invalido ou permissao negada (apenas admin).');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este mapa da galeria publica?')) return;
    setSavingId(id);
    try {
      await deleteMindMapGalleryItem(id);
      await refresh();
    } catch (e) {
      alert(e?.message || 'Nao foi possivel remover.');
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
      alert(e?.message || 'Nao foi possivel salvar.');
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
      alert(e?.message || 'Nao foi possivel reordenar.');
    } finally {
      setSavingId('');
    }
  };

  const headStats = [
    {
      key: 'count',
      icon: Network,
      label: 'Modelos publicados',
      value: loading ? '…' : String(rows.length),
      accent: 'indigo',
    },
    {
      key: 'hint',
      icon: BookOpen,
      label: 'Visíveis em',
      value: 'Mapas mentais',
      accent: 'violet',
    },
  ];

  return (
    <div className="pl-page">
      <div className="flex flex-col gap-6">
        <PageHeadPremium
          icon={Network}
          titleAs="h1"
          badge={
            <PageHeadPremiumBadge icon={ShieldCheck}>
              Admin · conteúdo global
            </PageHeadPremiumBadge>
          }
          title="Galeria de mapas mentais"
          subtitle={
            'Publique JSON exportado no app. Os modelos aparecem em Mapas mentais para todos os estudantes.' +
            (loading ? '' : ' ' + rows.length + (rows.length !== 1 ? ' modelos publicados.' : ' modelo publicado.'))
          }
        />

        <div className="section-card flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Publicar</p>
            <p className="mt-1 text-sm text-slate-600">Importe o mesmo JSON exportado da biblioteca de mapas.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!currentUserId || loading}
              className="btn-primary rounded-xl px-4 py-2.5 disabled:opacity-50"
            >
              <UploadCloud size={16} />
              Subir JSON
            </button>
            <button type="button" onClick={refresh} disabled={loading} className="btn-secondary rounded-xl px-4 py-2.5">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Atualizar lista
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{error}</div>
        ) : null}

        <div className="section-card space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Itens publicados ({rows.length})</p>

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm font-semibold text-slate-500">
              <Loader2 size={18} className="animate-spin text-blue-700" />
              Carregando…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-slate-500">Nenhum mapa na galeria ainda. Suba um JSON para comecar.</p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row, index) => {
                const dados = row.dados && typeof row.dados === 'object' ? row.dados : {};
                const nodes = Array.isArray(dados.nodes) ? dados.nodes.length : 0;
                const graphN = Array.isArray(dados.mindGraph?.nodes) ? dados.mindGraph.nodes.length : 0;

                return (
                  <li key={row.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-slate-900">{row.titulo}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Ordem {row.sort_order} · Ramo lista: {nodes} · Grafo: {graphN} nos
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            data-gallery-titulo={row.id}
                            defaultValue={row.titulo}
                            key={`${row.id}-${row.updated_at}`}
                            className="min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600"
                            placeholder="Titulo publico"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const inp = document.querySelector(`input[data-gallery-titulo="${row.id}"]`);
                              handleSaveTitulo(row, inp?.value);
                            }}
                            disabled={savingId === row.id}
                            className="btn-secondary shrink-0 rounded-lg px-3 py-2 text-xs"
                          >
                            <Save size={14} />
                            Salvar titulo
                          </button>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={index === 0 || savingId === 'reorder'}
                          onClick={() => handleMove(row, -1)}
                          className="btn-secondary rounded-lg px-3 py-2 text-xs disabled:opacity-40"
                        >
                          Subir
                        </button>
                        <button
                          type="button"
                          disabled={index >= rows.length - 1 || savingId === 'reorder'}
                          onClick={() => handleMove(row, 1)}
                          className="btn-secondary rounded-lg px-3 py-2 text-xs disabled:opacity-40"
                        >
                          Descer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          disabled={savingId === row.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
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
