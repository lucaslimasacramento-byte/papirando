import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, Save, Scale, UploadCloud } from 'lucide-react';
import {
  DEFAULT_SECTION_PAGE_MAP,
  loadVadeMecumDocumentBySlug,
  resetVadeMecumDocument,
  updateVadeMecumReleaseMeta,
  uploadVadeMecumPdf,
} from '../lib/vadeMecumApi';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';

const OFFICIAL_SLUG = 'vade-mecum-oficial';

export default function AdminLegislacao({ currentUserId = '' }) {
  const fileRef = useRef(null);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const [title, setTitle] = useState('');
  const [edition, setEdition] = useState('');
  const [source, setSource] = useState('');
  const [updatedLabel, setUpdatedLabel] = useState('');
  const [sectionMapJson, setSectionMapJson] = useState('');

  const syncFormFromDoc = useCallback((d) => {
    if (!d) return;
    setTitle(d.title || '');
    setEdition(d.edition || '');
    setSource(d.source || '');
    setUpdatedLabel(d.updatedAtLabel || '');
    try {
      setSectionMapJson(JSON.stringify(d.sectionPageMap || DEFAULT_SECTION_PAGE_MAP, null, 2));
    } catch {
      setSectionMapJson('{}');
    }
  }, []);

  const refresh = useCallback(async () => {
    setError('');
    setOkMsg('');
    setLoading(true);
    try {
      const next = await loadVadeMecumDocumentBySlug(OFFICIAL_SLUG);
      setDoc(next);
      syncFormFromDoc(next);
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Nao foi possivel carregar o documento.');
    } finally {
      setLoading(false);
    }
  }, [syncFormFromDoc]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showOk = (msg) => {
    setOkMsg(msg);
    window.setTimeout(() => setOkMsg(''), 4000);
  };

  const handleSaveMeta = async () => {
    setSavingMeta(true);
    setError('');
    try {
      let sectionPageMap;
      try {
        sectionPageMap = JSON.parse(sectionMapJson || '{}');
      } catch {
        throw new Error('JSON do mapa de páginas inválido.');
      }
      if (typeof sectionPageMap !== 'object' || Array.isArray(sectionPageMap)) {
        throw new Error('O mapa de páginas deve ser um objeto { bloco: páginaInicial }.');
      }
      const next = await updateVadeMecumReleaseMeta(OFFICIAL_SLUG, {
        title,
        edition,
        source,
        updatedAtLabel: updatedLabel,
        sectionPageMap,
      });
      setDoc(next);
      syncFormFromDoc(next);
      showOk('Metadados e mapa de blocos salvos.');
    } catch (e) {
      setError(e?.message || 'Erro ao salvar.');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!currentUserId) {
      alert('Faca login para enviar o PDF.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const next = await uploadVadeMecumPdf({ file, currentDocument: doc, currentUserId });
      setDoc(next);
      syncFormFromDoc(next);
      showOk('PDF atualizado. Os estudantes passam a ver o novo arquivo.');
    } catch (e) {
      alert(e?.message || 'Upload falhou. Verifique permissao no bucket vade-mecum-files.');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Restaurar o PDF e metadados padrao do app (arquivo local oficial)?')) return;
    setUploading(true);
    setError('');
    try {
      const next = await resetVadeMecumDocument(doc);
      setDoc(next);
      syncFormFromDoc(next);
      showOk('Base oficial restaurada.');
    } catch (e) {
      alert(e?.message || 'Nao foi possivel restaurar.');
    } finally {
      setUploading(false);
    }
  };

  const fillDefaultMap = () => {
    setSectionMapJson(JSON.stringify(DEFAULT_SECTION_PAGE_MAP, null, 2));
  };

  return (
    <div className="pl-page">
      <div className="app-main-shell mx-auto max-w-[920px] space-y-6">
        <PageHeadPremium
          icon={Scale}
          badge={
            <PageHeadPremiumBadge icon={Scale}>Admin</PageHeadPremiumBadge>
          }
          title="Legislação · lançamentos"
          titleAs="h1"
          subtitle="Troque o PDF do Vade Mecum, o texto exibido (título, edição, data) e o mapa de páginas por bloco. O conteúdo ativo é o mesmo que todos veem na aba Legislação (lei seca)."
          leadingClassName="min-w-0 flex-1"
        />

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{error}</div>
        ) : null}
        {okMsg ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{okMsg}</div>
        ) : null}

        <div className="section-card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Arquivo ativo (slug {OFFICIAL_SLUG})</p>
              {loading ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" /> Carregando…
                </p>
              ) : (
                <>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">{doc?.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {doc?.edition} · {doc?.source} · Atualizado em {doc?.updatedAtLabel}
                  </p>
                  <a
                    href={doc?.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
                  >
                    Abrir PDF atual
                    <ExternalLink size={14} />
                  </a>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || loading}
                className="btn-primary rounded-xl px-4 py-2.5 disabled:opacity-50"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                Novo PDF
              </button>
              <button type="button" onClick={handleReset} disabled={uploading || loading} className="btn-secondary rounded-xl px-4 py-2.5">
                <RefreshCw size={16} />
                Base oficial
              </button>
              <button type="button" onClick={refresh} disabled={loading} className="btn-secondary rounded-xl px-4 py-2.5">
                Recarregar
              </button>
            </div>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
          </div>
        </div>

        <div className="section-card space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Metadados do lançamento</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              Título
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Edição
              <input
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Fonte
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Rótulo &quot;Atualizado em&quot; (texto livre)
              <input
                value={updatedLabel}
                onChange={(e) => setUpdatedLabel(e.target.value)}
                placeholder="ex: 18/04/2026"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600"
              />
            </label>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-600">Mapa de páginas por bloco (JSON)</label>
              <button type="button" onClick={fillDefaultMap} className="text-xs font-bold text-blue-700 hover:text-blue-800">
                Preencher padrão Senado 2ed
              </button>
            </div>
            <textarea
              value={sectionMapJson}
              onChange={(e) => setSectionMapJson(e.target.value)}
              rows={14}
              spellCheck={false}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:border-blue-600"
            />
            <p className="mt-2 text-xs text-slate-500">
              Chaves = nome do bloco (igual aos chips na tela Legislação). Valores = número da página inicial daquele bloco no PDF.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveMeta}
            disabled={savingMeta || loading}
            className="btn-primary rounded-xl px-5 py-3 disabled:opacity-50"
          >
            {savingMeta ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar metadados e mapa
          </button>
        </div>
      </div>
    </div>
  );
}
