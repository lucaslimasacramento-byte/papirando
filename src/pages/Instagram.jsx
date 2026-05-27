import React, { useEffect, useMemo, useState } from 'react';
import * as Sentry from '@sentry/react';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ImagePlus,
  Instagram as InstagramIcon,
  Loader2,
  Send,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import {
  generateInstagramCaption,
  listInstagramAccounts,
  listInstagramPosts,
  publishInstagramPost,
  startInstagramOAuth,
  syncInstagramMetrics,
  uploadInstagramMedia,
} from '../lib/instagramApi';
import { supabase } from '../lib/supabase';

const MEDIA_TYPES = [
  { id: 'IMAGE', label: 'Imagem' },
  { id: 'CAROUSEL', label: 'Carrossel' },
  { id: 'REELS', label: 'Reels' },
];

function formatDate(value) {
  if (!value) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function StatusBadge({ status }) {
  const label = {
    draft: 'Rascunho',
    scheduled: 'Agendado',
    publishing: 'Publicando',
    published: 'Publicado',
    failed: 'Falhou',
  }[status] || status;
  return <span className={`ig-status ig-status-${status}`}>{label}</span>;
}

export default function Instagram({ currentUserId = '' }) {
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [mediaType, setMediaType] = useState('IMAGE');
  const [mediaUrls, setMediaUrls] = useState([]);
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [captionContext, setCaptionContext] = useState({
    produto: 'Papirando',
    tom: 'confiante, acolhedor e direto',
    objetivo: 'atrair concurseiros para uma rotina de estudos mais consistente',
  });

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) || accounts[0] || null;
  const totals = useMemo(
    () => metrics.reduce(
      (acc, item) => ({
        impressions: acc.impressions + Number(item.impressions || 0),
        reach: acc.reach + Number(item.reach || 0),
        engagement: acc.engagement + Number(item.engagement || 0),
      }),
      { impressions: 0, reach: 0, engagement: 0 }
    ),
    [metrics]
  );

  async function reload() {
    setLoading(true);
    setError('');
    try {
      const [nextAccounts, nextPosts] = await Promise.all([listInstagramAccounts(), listInstagramPosts()]);
      setAccounts(nextAccounts);
      setPosts(nextPosts);
      setSelectedAccountId((current) => current || nextAccounts[0]?.id || '');
    } catch (err) {
      Sentry.captureException(err);
      setError(err.message || 'Nao foi possivel carregar o Instagram.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleConnect() {
    setBusy('connect');
    setError('');
    try {
      const { authUrl } = await startInstagramOAuth();
      window.location.href = authUrl;
    } catch (err) {
      Sentry.captureException(err);
      setError(err.message || 'Nao foi possivel iniciar o OAuth.');
      setBusy('');
    }
  }

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setBusy('upload');
    setError('');
    try {
      const { data } = await supabase.auth.getUser();
      const urls = await uploadInstagramMedia(currentUserId || data?.user?.id, files);
      setMediaUrls(urls);
    } catch (err) {
      Sentry.captureException(err);
      setError(err.message || 'Falha ao enviar midia.');
    } finally {
      setBusy('');
    }
  }

  async function handleGenerateCaption() {
    setBusy('caption');
    setError('');
    try {
      const result = await generateInstagramCaption(captionContext);
      setCaption(result.bestCaption);
    } catch (err) {
      Sentry.captureException(err);
      setError(err.message || 'Falha ao gerar legenda.');
    } finally {
      setBusy('');
    }
  }

  async function handlePublish() {
    setBusy('publish');
    setError('');
    try {
      const post = await publishInstagramPost({
        accountId: selectedAccount?.id,
        mediaType,
        mediaUrls,
        caption,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
      setCaption('');
      setMediaUrls([]);
      setScheduledAt('');
    } catch (err) {
      Sentry.captureException(err);
      setError(err.message || 'Falha ao publicar.');
    } finally {
      setBusy('');
    }
  }

  async function handleSyncMetrics() {
    setBusy('metrics');
    setError('');
    try {
      const result = await syncInstagramMetrics(selectedAccount?.id);
      setMetrics(result.metrics || []);
    } catch (err) {
      Sentry.captureException(err);
      setError(err.message || 'Falha ao sincronizar metricas.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="ig-page">
      <div className="ig-header">
        <div>
          <p className="pl-eyebrow">Distribuição</p>
          <h1>Instagram</h1>
          <p>Conecte a conta profissional, gere legendas, agende posts e acompanhe os primeiros sinais de tração.</p>
        </div>
        <button className="pl-btn pl-btn-primary" type="button" onClick={handleConnect} disabled={busy === 'connect'}>
          {busy === 'connect' ? <Loader2 className="ig-spin" size={16} /> : <InstagramIcon size={16} />}
          Conectar Instagram
        </button>
      </div>

      {error ? <div className="ig-alert">{error}</div> : null}

      <section className="ig-band">
        <div className="ig-kpi">
          <BarChart3 size={18} />
          <span>Impressões</span>
          <strong>{totals.impressions.toLocaleString('pt-BR')}</strong>
        </div>
        <div className="ig-kpi">
          <CheckCircle2 size={18} />
          <span>Alcance</span>
          <strong>{totals.reach.toLocaleString('pt-BR')}</strong>
        </div>
        <div className="ig-kpi">
          <Send size={18} />
          <span>Engajamento</span>
          <strong>{totals.engagement.toLocaleString('pt-BR')}</strong>
        </div>
        <button className="pl-btn" type="button" onClick={handleSyncMetrics} disabled={!selectedAccount || busy === 'metrics'}>
          {busy === 'metrics' ? <Loader2 className="ig-spin" size={15} /> : <BarChart3 size={15} />}
          Atualizar métricas
        </button>
      </section>

      <div className="ig-grid">
        <section className="ig-panel">
          <div className="ig-panel-head">
            <h2>Novo post</h2>
            <select value={selectedAccount?.id || ''} onChange={(event) => setSelectedAccountId(event.target.value)}>
              {accounts.length === 0 ? <option>Conta não conectada</option> : null}
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>@{account.instagram_username || account.instagram_user_id}</option>
              ))}
            </select>
          </div>

          <div className="ig-segmented">
            {MEDIA_TYPES.map((type) => (
              <button key={type.id} type="button" className={mediaType === type.id ? 'active' : ''} onClick={() => setMediaType(type.id)}>
                {type.label}
              </button>
            ))}
          </div>

          <label className="ig-upload">
            <input type="file" accept="image/*,video/mp4,video/quicktime" multiple={mediaType === 'CAROUSEL'} onChange={handleFiles} />
            {busy === 'upload' ? <Loader2 className="ig-spin" size={24} /> : <UploadCloud size={24} />}
            <span>{mediaUrls.length ? `${mediaUrls.length} mídia(s) pronta(s)` : 'Enviar mídia para o Supabase Storage'}</span>
          </label>

          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={8}
            placeholder="Legenda do post"
          />

          <label className="ig-field">
            <span>Agendar para</span>
            <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
          </label>

          <button className="pl-btn pl-btn-primary" type="button" onClick={handlePublish} disabled={!selectedAccount || mediaUrls.length === 0 || busy === 'publish'}>
            {busy === 'publish' ? <Loader2 className="ig-spin" size={16} /> : <CalendarDays size={16} />}
            {scheduledAt ? 'Agendar' : 'Publicar agora'}
          </button>
        </section>

        <section className="ig-panel">
          <div className="ig-panel-head">
            <h2>Legenda IA</h2>
            <Sparkles size={18} />
          </div>
          <input value={captionContext.produto} onChange={(event) => setCaptionContext({ ...captionContext, produto: event.target.value })} placeholder="Produto" />
          <input value={captionContext.tom} onChange={(event) => setCaptionContext({ ...captionContext, tom: event.target.value })} placeholder="Tom" />
          <input value={captionContext.objetivo} onChange={(event) => setCaptionContext({ ...captionContext, objetivo: event.target.value })} placeholder="Objetivo" />
          <button className="pl-btn" type="button" onClick={handleGenerateCaption} disabled={busy === 'caption'}>
            {busy === 'caption' ? <Loader2 className="ig-spin" size={15} /> : <Sparkles size={15} />}
            Gerar legenda
          </button>

          <div className="ig-preview">
            {mediaUrls[0] ? <img src={mediaType === 'REELS' ? '/assets/branding/papirando-mark.svg' : mediaUrls[0]} alt="Preview do post" /> : <ImagePlus size={42} />}
            <p>{caption || 'A legenda gerada ou escrita aparece aqui para revisão antes do agendamento.'}</p>
          </div>
        </section>
      </div>

      <section className="ig-panel ig-posts">
        <div className="ig-panel-head">
          <h2>Publicações</h2>
          {loading ? <Loader2 className="ig-spin" size={18} /> : null}
        </div>
        {posts.length === 0 ? (
          <p className="ig-empty">Nenhuma publicação criada ainda.</p>
        ) : (
          posts.map((post) => (
            <div className="ig-row" key={post.id}>
              <div>
                <strong>{post.media_type}</strong>
                <span>{post.caption.slice(0, 120) || 'Sem legenda'}</span>
              </div>
              <span>{formatDate(post.scheduled_at || post.published_at || post.created_at)}</span>
              <StatusBadge status={post.status} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
