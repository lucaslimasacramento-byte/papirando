import React, { useEffect, useMemo, useState } from 'react';
import { showConfirm } from '../lib/dialogs';
import {
  ArrowBigUp,
  Bookmark,
  ChevronRight,
  Flame,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  Eye,
  ShieldAlert,
  Plus,
  X,
} from 'lucide-react';
import {
  addPostComment,
  adminDeactivateCommunityCategory,
  adminDeleteCommunityComment,
  adminDeleteCommunityPost,
  adminInsertCommunityCategory,
  adminUpdateCommunityCategory,
  adminUpdateCommunityComment,
  adminUpdateCommunityPost,
  createLocalCommunityComment,
  createLocalCommunityPost,
  COMMUNITY_COMMENT_MODERATION_TEXT,
  COMMUNITY_MODERATION_BODY,
  COMMUNITY_MODERATION_TITLE,
  fetchCommunityCategoriesAdmin,
  formatCommunityRelativeTime,
  getCommunityUserAvatar,
  incrementLocalCommunityView,
  loadCommunityPosts,
  loadPostComments,
  normalizeCommunityState,
  publishCommunityPost,
  slugifyCategory,
  toggleLocalCommunityReaction,
  setPostReaction,
} from '../lib/communityApi';
import AppToast from '../components/AppToast';

const FEED_FILTERS = [
  { id: 'hot', label: 'Hot' },
  { id: 'top', label: 'Top' },
  { id: 'recent', label: 'Novos' },
];

function hotEngagementScore(post) {
  return Number(post.upvotesCount || 0) * 2 + Number(post.commentsCount || 0) + Number(post.viewsCount || 0) / 10;
}

const initials = (name = '') => String(name).split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

function sortPostsByMode(posts, mode) {
  const items = [...posts];
  if (mode === 'recent') return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (mode === 'top') return items.sort((a, b) =>
    (Number(b.upvotesCount || 0) - Number(a.upvotesCount || 0)) ||
    (Number(b.viewsCount || 0) - Number(a.viewsCount || 0)));
  return items.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const scoreA = Number(a.upvotesCount || 0) * 2 + Number(a.commentsCount || 0) + Number(a.viewsCount || 0) / 10;
    const scoreB = Number(b.upvotesCount || 0) * 2 + Number(b.commentsCount || 0) + Number(b.viewsCount || 0) / 10;
    return scoreB - scoreA;
  });
}

function CommentItem({ comment, isAdmin = false, adminBusyId = '', postId = '', onAdminCommentAction }) {
  return (
    <div style={{
      borderRadius: 12,
      border: '1px solid var(--pl-rule)',
      padding: 16,
      background: 'var(--pl-bg-soft)',
      boxShadow: 'var(--pl-sh-low)',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', minWidth: 0, flex: 1, alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', height: 36, width: 36, flexShrink: 0,
            alignItems: 'center', justifyContent: 'center', borderRadius: 12,
            background: 'var(--pl-rule-2)', fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)',
            overflow: 'hidden',
          }}>
            {comment.avatar ? <img src={comment.avatar} alt="" className="object-cover" style={{ height: '100%', width: '100%', borderRadius: 12 }} /> : initials(comment.author)}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)' }}>{comment.author}</p>
            <p className="pl-eyebrow" style={{ letterSpacing: '0.16em' }}>
              {formatCommunityRelativeTime(comment.createdAt)}
            </p>
          </div>
        </div>
        {isAdmin ? (
          <div style={{ display: 'flex', flexShrink: 0, flexWrap: 'wrap', gap: 6 }}>
            <button
              type="button"
              disabled={adminBusyId === comment.id}
              onClick={() => onAdminCommentAction?.(postId, comment, 'censor')}
              style={{
                borderRadius: 999, border: '1px solid var(--pl-warn)', background: 'var(--pl-warn-soft)',
                padding: '4px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                color: 'var(--pl-warn)', cursor: 'pointer', opacity: adminBusyId === comment.id ? 0.5 : 1,
              }}
            >
              Censurar
            </button>
            <button
              type="button"
              disabled={adminBusyId === comment.id}
              onClick={() => onAdminCommentAction?.(postId, comment, 'delete')}
              style={{
                borderRadius: 999, border: '1px solid var(--pl-danger)', background: 'var(--pl-surface)',
                padding: '4px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                color: 'var(--pl-danger)', cursor: 'pointer', opacity: adminBusyId === comment.id ? 0.5 : 1,
              }}
            >
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{comment.content}</p>
    </div>
  );
}

function PostCard({
  post,
  featured = false,
  expanded = false,
  commentDraft = '',
  onToggleExpand,
  onCommentDraftChange,
  onSubmitComment,
  onToggleReaction,
  onToggleSave,
  isAdmin = false,
  adminBusyId = '',
  onAdminPostAction,
  onAdminCommentAction,
  onRoomClick,
}) {
  const slug = String(post.categorySlug || 'geral').toLowerCase();
  const roomPath = `s/${slug}`;
  return (
    <article className={`pl-post ${featured ? 'featured' : ''}`}>
      <div className="pl-post-vote">
        <button
          type="button"
          onClick={() => onToggleReaction(post, !post.upvotedByCurrentUser)}
          className={`btn ${post.upvotedByCurrentUser ? 'on' : ''}`}
          aria-label="Dar apoio"
        >
          <ArrowBigUp />
        </button>
        <span className="count">{post.upvotesCount || 0}</span>
      </div>

      <div className="pl-post-body">
        <div className="pl-post-meta">
          <span className="avatar">
            {post.avatar ? <img src={post.avatar} alt="" /> : initials(post.author)}
          </span>
          <button type="button" onClick={() => onRoomClick?.(slug, post.category)} className="room">
            {roomPath}
          </button>
          <span className="sep">·</span>
          <span>{formatCommunityRelativeTime(post.createdAt)}</span>
          <span className="sep">·</span>
          <span className="author">por {post.author}</span>
          {post.isPinned ? (
            <span className="pin"><Flame /> Fixado</span>
          ) : null}
        </div>

        <h2 className="pl-post-title">{post.title}</h2>
        {post.content ? <p className="pl-post-content">{post.content}</p> : null}

        {isAdmin && (
          <div className="pl-post-mod">
            <span className="lbl"><ShieldAlert /> Moderação</span>
            <button
              type="button"
              disabled={adminBusyId === post.id}
              onClick={() => onAdminPostAction?.(post, 'pin')}
            >
              {post.isPinned ? 'Desfixar' : 'Fixar'}
            </button>
            <button
              type="button"
              disabled={adminBusyId === post.id}
              onClick={() => onAdminPostAction?.(post, 'hide')}
            >
              Ocultar
            </button>
            <button
              type="button"
              disabled={adminBusyId === post.id}
              onClick={() => onAdminPostAction?.(post, 'censor')}
              className="warn"
            >
              Censurar
            </button>
            <button
              type="button"
              disabled={adminBusyId === post.id}
              onClick={() => onAdminPostAction?.(post, 'delete')}
              className="danger"
            >
              Excluir
            </button>
          </div>
        )}

        <div className="pl-post-footer">
          <button type="button" onClick={onToggleExpand} className="pl-post-foot-btn">
            <MessageCircle /> {post.commentsCount || 0} comentários
          </button>
          <span className="pl-post-foot-btn" style={{ cursor: 'default' }}>
            <Eye /> {post.viewsCount || 0} leituras
          </span>
          <button
            type="button"
            onClick={() => onToggleSave(post, !post.savedByCurrentUser)}
            className={`pl-post-foot-btn ${post.savedByCurrentUser ? 'on' : ''}`}
            style={{ marginLeft: 'auto' }}
          >
            <Bookmark /> {post.savedByCurrentUser ? 'Salvo' : 'Salvar'}
          </button>
        </div>

        {expanded && (
          <div className="pl-post-expanded">
            {(Array.isArray(post.comments) ? post.comments : []).length > 0 ? (
              post.comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  postId={post.id}
                  isAdmin={isAdmin}
                  adminBusyId={adminBusyId}
                  onAdminCommentAction={onAdminCommentAction}
                />
              ))
            ) : (
              <div className="pl-com-comment-empty">
                Seja a primeira pessoa a comentar neste tópico.
              </div>
            )}
            <div className="pl-com-comment-form">
              <textarea
                rows={3}
                value={commentDraft}
                onChange={(e) => onCommentDraftChange(e.target.value)}
                placeholder="Responda com respeito — construa a conversa."
              />
              <button type="button" onClick={onSubmitComment} className="pl-btn pl-btn-primary pl-btn-sm">
                <Send size={13} /> Comentar
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default function Comunidades({
  currentUserId = '',
  currentUsername = '',
  currentUserEmail = '',
  communityState = {},
  profile = {},
  onViewPost,
  onSaveCommunityState,
  onReloadCommunity,
  persistenceMode = 'local',
  communitySchemaReady = false,
  isAdmin = false,
}) {
  const [activeFilter, setActiveFilter] = useState('hot');
  const [activeTag, setActiveTag] = useState('Todos');
  const [searchValue, setSearchValue] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerSubmitting, setComposerSubmitting] = useState(false);
  const [composerError, setComposerError] = useState('');
  const [composerToast, setComposerToast] = useState('');
  const [expandedPostId, setExpandedPostId] = useState('');
  const [commentDrafts, setCommentDrafts] = useState({});
  const [seenPosts, setSeenPosts] = useState([]);
  const [communityData, setCommunityData] = useState(() => normalizeCommunityState(communityState));
  const [communityLoading, setCommunityLoading] = useState(Boolean(currentUserId));
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminPanelLoading, setAdminPanelLoading] = useState(false);
  const [adminCategoriesDraft, setAdminCategoriesDraft] = useState([]);
  const [adminNotice, setAdminNotice] = useState('');
  const [adminBusyId, setAdminBusyId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');

  useEffect(() => {
    setCommunityData(normalizeCommunityState(communityState));
  }, [communityState]);

  useEffect(() => {
    let cancelled = false;

    const hydrateCommunity = async () => {
      if (!currentUserId) {
        setCommunityLoading(false);
        return;
      }

      setCommunityLoading(true);

      try {
        const posts = await loadCommunityPosts({ currentUserId });
        if (!cancelled && Array.isArray(posts) && posts.length > 0) {
          setCommunityData((prev) =>
            normalizeCommunityState({
              ...normalizeCommunityState(communityState),
              ...(prev || {}),
              forumPosts: posts,
            })
          );
        }
      } catch {
        if (!cancelled) {
          setCommunityData(normalizeCommunityState(communityState));
        }
      } finally {
        if (!cancelled) {
          setCommunityLoading(false);
        }
      }
    };

    hydrateCommunity();

    return () => {
      cancelled = true;
    };
  }, [communityState, currentUserId]);

  const forumPosts = useMemo(() => (Array.isArray(communityData?.forumPosts) ? communityData.forumPosts : []), [communityData]);
  const categories = useMemo(() => (Array.isArray(communityData?.categories) ? communityData.categories : []), [communityData]);
  useEffect(() => { if (!draftCategory && categories[0]?.name) setDraftCategory(categories[0].name); }, [categories, draftCategory]);

  const displayName = useMemo(() => {
    if (String(profile?.ranking_display_mode || '') === 'codename' && String(profile?.ranking_codename || '').trim()) return String(profile.ranking_codename).trim();
    return String(currentUsername || profile?.nome || currentUserEmail || 'Tu').trim() || 'Tu';
  }, [currentUsername, currentUserEmail, profile]);

  const composerAvatarUrl = useMemo(() => getCommunityUserAvatar(profile), [profile]);

  const forumPostsWithAvatars = useMemo(() => {
    const uid = String(currentUserId || '').trim();
    const av = String(composerAvatarUrl || '').trim();
    if (!uid || !av) return forumPosts;
    return forumPosts.map((p) => ({
      ...p,
      avatar: String(p.avatar || '').trim() || (String(p.userId) === uid ? av : p.avatar),
      comments: (Array.isArray(p.comments) ? p.comments : []).map((c) => ({
        ...c,
        avatar: String(c.avatar || '').trim() || (String(c.userId) === uid ? av : c.avatar),
      })),
    }));
  }, [forumPosts, currentUserId, composerAvatarUrl]);

  const visibleForumPosts = useMemo(() => forumPostsWithAvatars.filter((post) => post.isPublic !== false), [forumPostsWithAvatars]);

  useEffect(() => {
    if (!isAdmin || !adminPanelOpen) return undefined;
    let cancelled = false;
    setAdminPanelLoading(true);
    setAdminNotice('');
    (async () => {
      try {
        if (persistenceMode === 'supabase' && communitySchemaReady) {
          const rows = await fetchCommunityCategoriesAdmin();
          if (!cancelled) {
            setAdminCategoriesDraft(
              (rows || []).map((row) => ({
                id: row.id,
                slug: row.slug,
                name: row.name,
                description: row.description || '',
                position: row.position,
                is_active: row.is_active !== false,
              }))
            );
          }
        } else if (!cancelled) {
          setAdminCategoriesDraft(
            categories.map((c) => ({
              id: c.id,
              slug: c.slug,
              name: c.name,
              description: c.description || '',
              position: 0,
              is_active: true,
            }))
          );
        }
      } catch (e) {
        if (!cancelled) setAdminNotice(String(e?.message || e));
      } finally {
        if (!cancelled) setAdminPanelLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, adminPanelOpen, persistenceMode, communitySchemaReady, categories]);

  const tags = useMemo(() => ['Todos', ...categories.map((category) => category.name)], [categories]);
  const filteredPosts = useMemo(() => {
    let items = [...visibleForumPosts];
    if (activeTag !== 'Todos') items = items.filter((post) => String(post.category).toLowerCase() === activeTag.toLowerCase());
    if (searchValue.trim()) {
      const query = searchValue.trim().toLowerCase();
      items = items.filter((post) => [post.title, post.content, post.author, post.category].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
    }
    return sortPostsByMode(items, activeFilter);
  }, [visibleForumPosts, activeTag, searchValue, activeFilter]);
  const trendingFeedPosts = useMemo(() => sortPostsByMode([...visibleForumPosts], 'hot').slice(0, 10), [visibleForumPosts]);

  function openComposerModal() {
    setComposerError('');
    setIsComposerOpen(true);
  }

  function closeComposerModal() {
    if (composerSubmitting) return;
    setComposerError('');
    setIsComposerOpen(false);
  }

  const handleOpenRoomFromPost = (slug, categoryName) => {
    const name = String(categoryName || '').trim();
    const cat = categories.find((c) => String(c.slug).toLowerCase() === String(slug).toLowerCase());
    setActiveTag(cat?.name || name || 'Todos');
    setSearchValue('');
  };

  const handlePickTrend = (payload) => {
    if (!payload) return;
    setActiveFilter('hot');
    setSearchValue('');
    if (payload.type === 'room' && payload.name) {
      setActiveTag(payload.name);
      return;
    }
    if (payload.type === 'post' && payload.post) {
      const post = payload.post;
      setActiveTag(post.category && tags.includes(post.category) ? post.category : 'Todos');
      setExpandedPostId(post.id);
    }
  };

  async function handlePublishPost() {
    const title = String(draftTitle || '').trim();
    const content = String(draftContent || '').trim();
    if (!title || !content) {
      setComposerError('Preencha título e descrição antes de publicar.');
      return;
    }
    if (composerSubmitting) return;

    const draft = {
      title,
      content,
      category: draftCategory,
      categorySlug: categories.find((category) => category.name === draftCategory)?.slug || '',
    };

    const previousState = communityData;
    const optimisticState = createLocalCommunityPost(communityData, {
      profile,
      currentUserEmail,
      currentUserId,
      draft,
    });

    setComposerSubmitting(true);
    setComposerError('');
    setCommunityData(optimisticState);

    try {
      await publishCommunityPost({
        userId: currentUserId,
        authorName: displayName,
        authorAvatarUrl: composerAvatarUrl,
        title,
        content,
        categorySlug: draft.categorySlug,
        categoryName: draft.category,
      });
      const posts = await loadCommunityPosts({ currentUserId });
      if (Array.isArray(posts)) {
        setCommunityData((prev) =>
          normalizeCommunityState({
            ...prev,
            forumPosts: posts,
          })
        );
      }
      setDraftTitle('');
      setDraftContent('');
      setActiveFilter('recent');
      if (draft.category) setActiveTag(draft.category);
      setComposerToast('Topico publicado com sucesso.');
      setIsComposerOpen(false);
      setTimeout(() => setComposerToast(''), 2500);
    } catch (error) {
      setCommunityData(previousState);
      setComposerError(String(error?.message || 'Nao foi possivel publicar agora. Tente novamente.'));
    } finally {
      setComposerSubmitting(false);
    }
  }

  async function handleSubmitComment(postId) {
    const content = String(commentDrafts[postId] || '').trim();
    if (!content) return;

    // Guardamos o estado anterior para reverter o comentário otimista se a rede falhar —
    // sem isso, o comentário "aparecia publicado" mas sumia no reload, sem aviso ao usuário.
    const previousState = communityData;

    const optimisticUpdater = (prev) =>
      createLocalCommunityComment(prev, {
        profile,
        currentUserEmail,
        currentUserId,
        postId,
        content,
      });

    setCommunityData(optimisticUpdater);
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    setExpandedPostId(postId);

    addPostComment({
      postId,
      userId: currentUserId,
      authorName: displayName,
      authorAvatarUrl: composerAvatarUrl,
      content,
    })
      .then(() => loadPostComments(postId))
      .then((comments) => {
        setCommunityData((prev) =>
          normalizeCommunityState({
            ...prev,
            forumPosts: (Array.isArray(prev?.forumPosts) ? prev.forumPosts : []).map((post) =>
              post.id === postId
                ? {
                    ...post,
                    comments,
                    commentsCount: comments.length,
                  }
                : post
            ),
          })
        );
      })
      .catch((error) => {
        console.error('[Comunidades] erro ao publicar comentário:', error);
        setCommunityData(previousState);
        setCommentDrafts((prev) => ({ ...prev, [postId]: content }));
        setComposerToast('Não foi possível publicar o comentário. Tente novamente.');
        setTimeout(() => setComposerToast(''), 2500);
      });
  }

  async function handleExpandPost(post) {
    const willExpand = expandedPostId !== post.id;
    setExpandedPostId(willExpand ? post.id : '');
    if (willExpand && !seenPosts.includes(post.id)) {
      setSeenPosts((prev) => [...prev, post.id]);
      setCommunityData((prev) => incrementLocalCommunityView(prev, post.id));
      await onViewPost?.(post.id);
    }
  }

  async function handleTogglePostReaction(postId, reactionType, enabled) {
    // Estado anterior para reverter se a persistência falhar (evita o local divergir do banco).
    const previousState = communityData;
    setCommunityData((prev) => toggleLocalCommunityReaction(prev, { postId, reactionType, enabled }));

    if (!currentUserId) return;

    try {
      // setPostReaction persiste tanto 'upvote' quanto 'save' conforme o estado desejado.
      // (Antes: 'save' nunca persistia e 'upvote' era fire-and-forget, podendo dessincronizar.)
      await setPostReaction(postId, currentUserId, reactionType, enabled);
    } catch (error) {
      console.error('[Comunidades] erro ao salvar reação da publicação:', error);
      setCommunityData(previousState);
      setComposerToast('Não foi possível salvar sua ação. Tente novamente.');
      setTimeout(() => setComposerToast(''), 2500);
    }
  }

  async function handleAdminPostAction(post, action) {
    if (!isAdmin || !post?.id) return;
    setAdminBusyId(post.id);
    setAdminNotice('');
    try {
      const cloud = persistenceMode === 'supabase' && communitySchemaReady;
      if (cloud) {
        if (action === 'pin') {
          await adminUpdateCommunityPost(post.id, { is_pinned: !post.isPinned });
        } else if (action === 'hide') {
          await adminUpdateCommunityPost(post.id, { is_public: false });
        } else if (action === 'censor') {
          await adminUpdateCommunityPost(post.id, {
            title: COMMUNITY_MODERATION_TITLE,
            content: COMMUNITY_MODERATION_BODY,
            excerpt: COMMUNITY_MODERATION_BODY.slice(0, 400),
            is_public: true,
            is_pinned: false,
          });
        } else if (action === 'delete') {
          await adminDeleteCommunityPost(post.id);
        }
        await onReloadCommunity?.();
      } else if (typeof onSaveCommunityState === 'function') {
        onSaveCommunityState((prev) => {
          const norm = normalizeCommunityState(prev);
          if (action === 'delete') {
            return normalizeCommunityState({
              ...norm,
              forumPosts: norm.forumPosts.filter((p) => p.id !== post.id),
            });
          }
          if (action === 'hide') {
            return normalizeCommunityState({
              ...norm,
              forumPosts: norm.forumPosts.map((p) =>
                p.id === post.id ? { ...p, isPublic: false, is_public: false } : p
              ),
            });
          }
          if (action === 'pin') {
            return normalizeCommunityState({
              ...norm,
              forumPosts: norm.forumPosts.map((p) =>
                p.id === post.id ? { ...p, isPinned: !p.isPinned, is_pinned: !p.isPinned } : p
              ),
            });
          }
          if (action === 'censor') {
            return normalizeCommunityState({
              ...norm,
              forumPosts: norm.forumPosts.map((p) =>
                p.id === post.id
                  ? {
                      ...p,
                      title: COMMUNITY_MODERATION_TITLE,
                      content: COMMUNITY_MODERATION_BODY,
                      excerpt: COMMUNITY_MODERATION_BODY,
                      isPinned: false,
                      is_pinned: false,
                    }
                  : p
              ),
            });
          }
          return norm;
        });
      }
    } catch (e) {
      setAdminNotice(String(e?.message || e));
    } finally {
      setAdminBusyId('');
    }
  }

  async function handleAdminCommentAction(postId, comment, action) {
    if (!isAdmin || !comment?.id || !postId) return;
    setAdminBusyId(comment.id);
    setAdminNotice('');
    try {
      const cloud = persistenceMode === 'supabase' && communitySchemaReady;
      if (cloud) {
        if (action === 'censor') {
          await adminUpdateCommunityComment(comment.id, { content: COMMUNITY_COMMENT_MODERATION_TEXT });
        } else if (action === 'delete') {
          await adminDeleteCommunityComment(comment.id);
        }
        await onReloadCommunity?.();
      } else if (typeof onSaveCommunityState === 'function') {
        onSaveCommunityState((prev) => {
          const norm = normalizeCommunityState(prev);
          return normalizeCommunityState({
            ...norm,
            forumPosts: norm.forumPosts.map((p) => {
              if (p.id !== postId) return p;
              const list = Array.isArray(p.comments) ? p.comments : [];
              const nextComments =
                action === 'delete'
                  ? list.filter((c) => c.id !== comment.id)
                  : list.map((c) => (c.id === comment.id ? { ...c, content: COMMUNITY_COMMENT_MODERATION_TEXT } : c));
              return {
                ...p,
                comments: nextComments,
                commentsCount: nextComments.length,
              };
            }),
          });
        });
      }
    } catch (e) {
      setAdminNotice(String(e?.message || e));
    } finally {
      setAdminBusyId('');
    }
  }

  async function handleSaveAdminCategoryRow(row) {
    if (!isAdmin || !row?.id) return;
    setAdminBusyId(String(row.id));
    setAdminNotice('');
    try {
      const cloud = persistenceMode === 'supabase' && communitySchemaReady;
      if (cloud) {
        await adminUpdateCommunityCategory(row.id, {
          name: String(row.name || '').trim(),
          description: String(row.description || '').trim(),
        });
        await onReloadCommunity?.();
      } else if (typeof onSaveCommunityState === 'function') {
        onSaveCommunityState((prev) => {
          const norm = normalizeCommunityState(prev);
          const rowSlug = row.slug || slugifyCategory(row.name);
          return normalizeCommunityState({
            ...norm,
            categories: norm.categories.map((c) =>
              String(c.id) === String(row.id)
                ? { ...c, name: String(row.name || '').trim(), description: String(row.description || '').trim() }
                : c
            ),
            forumPosts: norm.forumPosts.map((p) =>
              p.categorySlug === rowSlug ? { ...p, category: String(row.name || '').trim() } : p
            ),
          });
        });
      }
    } catch (e) {
      setAdminNotice(String(e?.message || e));
    } finally {
      setAdminBusyId('');
    }
  }

  async function handleDeactivateAdminCategory(row) {
    if (!isAdmin || !row?.id) return;
    if (!await showConfirm(`Desativar a sala “${row.name}”? Ela some dos filtros; tópicos antigos permanecem no banco.`, { confirmLabel: 'Desativar', danger: true })) return;
    setAdminBusyId(String(row.id));
    setAdminNotice('');
    try {
      const cloud = persistenceMode === 'supabase' && communitySchemaReady;
      if (cloud) {
        await adminDeactivateCommunityCategory(row.id);
        await onReloadCommunity?.();
      } else if (typeof onSaveCommunityState === 'function') {
        onSaveCommunityState((prev) => {
          const norm = normalizeCommunityState(prev);
          const remaining = norm.categories.filter((c) => String(c.id) !== String(row.id) && c.slug !== row.slug);
          const fb = remaining[0] || norm.categories.find((c) => c.slug !== row.slug);
          const fallbackSlug = fb?.slug || 'rotina';
          const fallbackName = fb?.name || 'Rotina';
          return normalizeCommunityState({
            ...norm,
            categories: remaining,
            forumPosts: norm.forumPosts.map((p) =>
              p.categorySlug === row.slug ? { ...p, categorySlug: fallbackSlug, category: fallbackName } : p
            ),
          });
        });
      }
      setAdminPanelOpen(false);
    } catch (e) {
      setAdminNotice(String(e?.message || e));
    } finally {
      setAdminBusyId('');
    }
  }

  async function handleCreateAdminRoom() {
    const name = String(newRoomName || '').trim();
    if (!name) return;
    const description = String(newRoomDescription || '').trim();
    setAdminBusyId('new-room');
    setAdminNotice('');
    try {
      const cloud = persistenceMode === 'supabase' && communitySchemaReady;
      if (cloud) {
        await adminInsertCommunityCategory({
          slug: slugifyCategory(name),
          name,
          description,
          color: 'var(--pl-accent-soft)',
          position: (adminCategoriesDraft.length || 0) + 1,
        });
        setNewRoomName('');
        setNewRoomDescription('');
        await onReloadCommunity?.();
      } else if (typeof onSaveCommunityState === 'function') {
        const slug = slugifyCategory(name);
        onSaveCommunityState((prev) => {
          const norm = normalizeCommunityState(prev);
          return normalizeCommunityState({
            ...norm,
            categories: [
              ...norm.categories,
              { id: `category-${slug}`, slug, name, description, color: 'var(--pl-accent-soft)' },
            ],
          });
        });
        setNewRoomName('');
        setNewRoomDescription('');
      }
    } catch (e) {
      setAdminNotice(String(e?.message || e));
    } finally {
      setAdminBusyId('');
    }
  }

  if (communityLoading) {
    return (
      <div className="pl-page">
        <div className="pl-loading-panel">
          <div className="pl-loading-stack">
            <div className="pl-loading-spinner" aria-hidden />
            <span className="eyebrow">Comunidades</span>
            <p className="title">Carregando comunidade.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-page">
      {/* ─ Sidebar esquerda ─ */}
      <aside className="pl-com-side">
        <div className="pl-com-brand">
          <div className="icon"><MessageCircle size={16} strokeWidth={1.75} /></div>
          <div>
            <h2>Comunidade</h2>
            <p>{currentUsername || 'Sacramento'} · {communitySchemaReady ? 'nuvem' : 'local'}</p>
          </div>
        </div>

        <div className="pl-com-section">
          <button
            type="button"
            onClick={() => { setActiveTag('Todos'); setSearchValue(''); }}
            className="pl-com-side-link active"
          >
            <MessageCircle /> Discussões
          </button>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setAdminPanelOpen(true)}
              className="pl-com-side-link"
              style={{ marginTop: 8 }}
            >
              <ShieldAlert /> Admin
            </button>
          ) : null}
        </div>

        <div className="pl-com-section">
          <p className="ttl">Ordenação</p>
          <div className="pl-com-filter-pills">
            {FEED_FILTERS.map((filter) => {
              const isHot = filter.id === 'hot';
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`pl-com-filter-pill ${active ? (isHot ? 'active hot' : 'active def') : ''}`}
                >
                  {isHot ? <Flame /> : null}
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pl-com-section">
          <p className="ttl">Salas</p>
          <div className="pl-com-tags">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                className={`pl-com-tag ${activeTag === tag ? 'active' : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="pl-com-section">
          <p className="ttl">Top 10 · Engajados</p>
          <p className="desc">Clique para abrir no feed.</p>
          <div className="pl-com-top10">
            {trendingFeedPosts.slice(0, 10).map((tp, idx) => (
              <button
                key={tp.id}
                type="button"
                onClick={() => handlePickTrend({ type: 'post', post: tp, tags })}
                className="pl-com-top10-item"
              >
                <span className="num">{idx + 1}</span>
                <span className="info">
                  <span className="ttl">{tp.title}</span>
                  <span className="meta">#{tp.category} · {Math.round(hotEngagementScore(tp))} pts</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ─ Main column ─ */}
      <main className="pl-com-main">
        <div className="pl-com-titlebar">
          <h1>Comunidade<span className="dot">.</span></h1>
          <span className="meta">
            Conectado como <strong>{displayName}</strong>
          </span>
        </div>

        <div className="pl-com-toolbar">
          <div className="search">
            <Search />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Encontre de tudo…"
            />
          </div>
          <button type="button" onClick={openComposerModal} className="pl-btn pl-btn-primary">
            <Plus size={14} /> Perguntar
          </button>
        </div>

        {activeTag !== 'Todos' && (
          <div className="pl-com-breadcrumb">
            <button type="button" onClick={() => { setActiveTag('Todos'); setSearchValue(''); }}>
              Todas as salas
            </button>
            <ChevronRight />
            <span className="room">{activeTag}</span>
          </div>
        )}

        <div className="pl-com-feed">
          {filteredPosts.length === 0 ? (
            <div className="pl-com-empty">
              <div className="icon"><Sparkles size={22} /></div>
              <h3>Nada por aqui ainda.</h3>
              <p>Limpe a busca, escolha outra sala ou seja a primeira pessoa a perguntar.</p>
              <button type="button" onClick={openComposerModal} className="pl-btn pl-btn-primary">
                <Plus size={14} /> Perguntar
              </button>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                featured={Boolean(post.isPinned)}
                expanded={expandedPostId === post.id}
                commentDraft={commentDrafts[post.id] || ''}
                onToggleExpand={() => handleExpandPost(post)}
                onCommentDraftChange={(value) => setCommentDrafts((prev) => ({ ...prev, [post.id]: value }))}
                onSubmitComment={() => handleSubmitComment(post.id)}
                onToggleReaction={(item, enabled) => handleTogglePostReaction(item.id, 'upvote', enabled)}
                onToggleSave={(item, enabled) => handleTogglePostReaction(item.id, 'save', enabled)}
                isAdmin={isAdmin}
                adminBusyId={adminBusyId}
                onAdminPostAction={handleAdminPostAction}
                onAdminCommentAction={handleAdminCommentAction}
                onRoomClick={handleOpenRoomFromPost}
              />
            ))
          )}
        </div>
      </main>

      {/* Composer modal */}
      {isComposerOpen && (
        <div className="pl-com-composer-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeComposerModal(); }}>
          <div className="pl-com-composer-modal">
            <div className="head">
              <div>
                <span className="eyebrow">Novo tópico</span>
                <h2>Perguntar<span className="dot">.</span></h2>
              </div>
              <button
                type="button"
                onClick={closeComposerModal}
                disabled={composerSubmitting}
                className="pl-btn pl-btn-sm"
                aria-label="Fechar"
              >
                <X size={14} />
              </button>
            </div>
            <div className="body">
              {composerError && (
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)',
                  border: '1px solid rgba(185,28,28,0.25)', borderLeft: '3px solid var(--pl-danger)',
                  borderRadius: 4, fontSize: 13, fontWeight: 600,
                }}>{composerError}</div>
              )}
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Título da pergunta"
                disabled={composerSubmitting}
              />
              <textarea
                rows={6}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Descreva seu contexto para a comunidade ajudar melhor."
                disabled={composerSubmitting}
              />
              <select
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                disabled={composerSubmitting}
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="foot">
              <span style={{ fontSize: 11, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                Sua publicação será visível para todos os usuários da sala.
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={closeComposerModal}
                  className="pl-btn"
                  disabled={composerSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handlePublishPost}
                  className="pl-btn pl-btn-primary"
                  disabled={composerSubmitting}
                  style={{ opacity: composerSubmitting ? 0.6 : 1 }}
                >
                  <Send size={14} />
                  {composerSubmitting ? 'Publicando…' : 'Publicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AppToast message={composerToast} variant="success" />

        {adminPanelOpen ? (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 180,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.45)', padding: 16,
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-admin-title"
          >
            <div style={{
              maxHeight: '90vh', width: '100%', maxWidth: 672,
              overflowY: 'auto', borderRadius: 28,
              border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)',
              boxShadow: 'var(--pl-sh-high)',
            }}>
              <div style={{
                position: 'sticky', top: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 12,
                borderBottom: '1px solid var(--pl-rule)', background: 'var(--pl-surface)',
                padding: '16px 24px',
              }}>
                <div>
                  <p className="pl-eyebrow" style={{ color: 'var(--pl-danger)' }}>Administração</p>
                  <h2 id="community-admin-title" style={{ fontSize: 18, fontWeight: 600, color: 'var(--pl-ink)', margin: '4px 0 0' }}>
                    Salas do fórum
                  </h2>
                  <p style={{ marginTop: 4, fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-2)' }}>Renomeie, crie ou desative salas. Moderação de tópicos fica nos cards (fixar, ocultar, censurar, excluir).</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminPanelOpen(false)}
                  style={{
                    display: 'flex', height: 40, width: 40, flexShrink: 0,
                    alignItems: 'center', justifyContent: 'center', borderRadius: 12,
                    border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)',
                    color: 'var(--pl-ink-2)', cursor: 'pointer',
                  }}
                  aria-label="Fechar painel admin"
                >
                  <X size={18} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
                {adminNotice ? (
                  <p style={{
                    borderRadius: 12, border: '1px solid var(--pl-danger-soft)',
                    background: 'var(--pl-danger-soft)', padding: '8px 12px',
                    fontSize: 14, color: 'var(--pl-danger)',
                  }}>{adminNotice}</p>
                ) : null}
                {adminPanelLoading ? (
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)' }}>Carregando salas…</p>
                ) : null}
                {adminCategoriesDraft.map((row) => (
                  <div key={row.id} style={{
                    borderRadius: 16, border: '1px solid var(--pl-rule-2)',
                    background: 'var(--pl-bg-soft)', padding: 16,
                  }}>
                    <p className="pl-eyebrow">slug · {row.slug}</p>
                    <label style={{ marginTop: 8, display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)' }} htmlFor={`room-name-${row.id}`}>
                      Nome exibido
                    </label>
                    <input
                      id={`room-name-${row.id}`}
                      value={row.name}
                      onChange={(e) =>
                        setAdminCategoriesDraft((prev) => prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))
                      }
                      className="pl-input"
                      style={{ marginTop: 4 }}
                    />
                    <label style={{ marginTop: 12, display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)' }} htmlFor={`room-desc-${row.id}`}>
                      Descrição
                    </label>
                    <textarea
                      id={`room-desc-${row.id}`}
                      rows={2}
                      value={row.description}
                      onChange={(e) =>
                        setAdminCategoriesDraft((prev) => prev.map((r) => (r.id === row.id ? { ...r, description: e.target.value } : r)))
                      }
                      className="pl-input"
                      style={{ marginTop: 4, resize: 'none' }}
                    />
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button
                        type="button"
                        disabled={adminBusyId === String(row.id)}
                        onClick={() => handleSaveAdminCategoryRow(row)}
                        className="pl-btn pl-btn-primary pl-btn-sm"
                        style={{ borderRadius: 999, opacity: adminBusyId === String(row.id) ? 0.5 : 1 }}
                      >
                        Salvar sala
                      </button>
                      <button
                        type="button"
                        disabled={adminBusyId === String(row.id) || row.is_active === false}
                        onClick={() => handleDeactivateAdminCategory(row)}
                        style={{
                          borderRadius: 999, border: '1px solid var(--pl-danger)',
                          background: 'var(--pl-surface)', padding: '6px 16px',
                          fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                          color: 'var(--pl-danger)', cursor: 'pointer',
                          opacity: (adminBusyId === String(row.id) || row.is_active === false) ? 0.5 : 1,
                        }}
                      >
                        Desativar
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{
                  borderRadius: 16, border: '1px dashed var(--pl-rule-strong)',
                  background: 'var(--pl-surface)', padding: 16,
                }}>
                  <p className="pl-eyebrow">Nova sala</p>
                  <input
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Nome da nova sala"
                    className="pl-input"
                    style={{ marginTop: 8 }}
                  />
                  <textarea
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                    placeholder="Descrição curta (opcional)"
                    rows={2}
                    className="pl-input"
                    style={{ marginTop: 8, resize: 'none' }}
                  />
                  <button
                    type="button"
                    disabled={adminBusyId === 'new-room'}
                    onClick={handleCreateAdminRoom}
                    className="pl-btn pl-btn-ai pl-btn-sm"
                    style={{ marginTop: 12, borderRadius: 999, opacity: adminBusyId === 'new-room' ? 0.5 : 1 }}
                  >
                    Criar sala
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
    </div>
  );
}

