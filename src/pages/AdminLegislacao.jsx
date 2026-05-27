import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, Save, Scale, UploadCloud } from 'lucide-react';
import { showConfirm, showToast } from '../lib/dialogs';
import {
  DEFAULT_SECTION_PAGE_MAP,
  loadVadeMecumDocumentBySlug,
  resetVadeMecumDocument,
  updateVadeMecumReleaseMeta,
  uploadVadeMecumPdf,
} from '../lib/vadeMecumApi';
import AdminPageHeader from '../components/AdminPageHeader';

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
      showToast('Faça login para enviar o PDF.', 'error');
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
      showToast(e?.message || 'Upload falhou. Verifique permissão no bucket.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = async () => {
    if (!await showConfirm('Restaurar o PDF e metadados padrão do app?', { confirmLabel: 'Restaurar' })) return;
    setUploading(true);
    setError('');
    try {
      const next = await resetVadeMecumDocument(doc);
      setDoc(next);
      syncFormFromDoc(next);
      showOk('Base oficial restaurada.');
    } catch (e) {
      showToast(e?.message || 'Não foi possível restaurar.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const fillDefaultMap = () => {
    setSectionMapJson(JSON.stringify(DEFAULT_SECTION_PAGE_MAP, null, 2));
  };

  return (
    <div className="pl-page">
      <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <AdminPageHeader
          icon={Scale}
          badge="Admin · Legislação"
          title="Legislação · lançamentos"
          subtitle="Troque o PDF do Vade Mecum, o texto exibido (título, edição, data) e o mapa de páginas por bloco. O conteúdo ativo é o mesmo que todos veem na aba Legislação (lei seca)."
        />

        {error ? (
          <div style={{ borderRadius: 10, border: '1px solid var(--pl-warn)', background: 'var(--pl-warn-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{error}</div>
        ) : null}
        {okMsg ? (
          <div style={{ borderRadius: 10, border: '1px solid var(--pl-success)', background: 'var(--pl-success-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{okMsg}</div>
        ) : null}

        <div className="pl-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Arquivo ativo (slug {OFFICIAL_SLUG})</p>
              {loading ? (
                <p style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--pl-ink-2)' }}>
                  <Loader2 size={16} className="animate-spin" /> Carregando…
                </p>
              ) : (
                <>
                  <h2 style={{ marginTop: 4, fontSize: 18, fontWeight: 700, color: 'var(--pl-ink)' }}>{doc?.title}</h2>
                  <p style={{ marginTop: 4, fontSize: 13, color: 'var(--pl-ink-2)' }}>
                    {doc?.edition} · {doc?.source} · Atualizado em {doc?.updatedAtLabel}
                  </p>
                  <a
                    href={doc?.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--pl-accent)', textDecoration: 'none' }}
                  >
                    Abrir PDF atual
                    <ExternalLink size={14} />
                  </a>
                </>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || loading}
                className="pl-btn pl-btn-primary pl-btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                Novo PDF
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={uploading || loading}
                className="pl-btn pl-btn-ghost pl-btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <RefreshCw size={16} />
                Base oficial
              </button>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="pl-btn pl-btn-ghost pl-btn-sm"
              >
                Recarregar
              </button>
            </div>
            <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleUpload} />
          </div>
        </div>

        <div className="pl-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="pl-eyebrow">Metadados do lançamento</p>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
              Título
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="pl-input"
                style={{ marginTop: 4, width: '100%' }}
              />
            </label>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
              Edição
              <input
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                className="pl-input"
                style={{ marginTop: 4, width: '100%' }}
              />
            </label>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
              Fonte
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="pl-input"
                style={{ marginTop: 4, width: '100%' }}
              />
            </label>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
              Rótulo &quot;Atualizado em&quot; (texto livre)
              <input
                value={updatedLabel}
                onChange={(e) => setUpdatedLabel(e.target.value)}
                placeholder="ex: 18/04/2026"
                className="pl-input"
                style={{ marginTop: 4, width: '100%' }}
              />
            </label>
          </div>

          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-2)' }}>Mapa de páginas por bloco (JSON)</label>
              <button type="button" onClick={fillDefaultMap} style={{ fontSize: 12, fontWeight: 700, color: 'var(--pl-accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Preencher padrão Senado 2ed
              </button>
            </div>
            <textarea
              value={sectionMapJson}
              onChange={(e) => setSectionMapJson(e.target.value)}
              rows={14}
              spellCheck={false}
              className="pl-input"
              style={{ marginTop: 8, width: '100%', fontFamily: 'var(--pl-mono)', fontSize: 11, lineHeight: 1.6, resize: 'vertical' }}
            />
            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--pl-ink-2)' }}>
              Chaves = nome do bloco (igual aos chips na tela Legislação). Valores = número da página inicial daquele bloco no PDF.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveMeta}
            disabled={savingMeta || loading}
            className="pl-btn pl-btn-primary pl-btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}
          >
            {savingMeta ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar metadados e mapa
          </button>
        </div>
      </div>
    </div>
  );
}
