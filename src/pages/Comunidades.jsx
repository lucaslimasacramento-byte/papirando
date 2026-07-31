import React, { useEffect, useMemo, useState } from 'react';
import { showConfirm, showToast } from '../lib/dialogs';
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
  AlertTriangle,
  RotateCcw,
  Pin,
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

// Paleta de pontos coloridos para salas que nao trazem `color` proprio.
const ROOM_DOTS = [
  'var(--pl-accent)',
  'var(--pl-success)',
  'var(--pl-warn)',
  'var(--pl-highlight-ink)',
  'var(--pl-danger)',
  'var(--pl-ink-4)',
];

function hotEngagementScore(post) {
  return Number(post.upvotesCount || 0) * 2 + Number(post.commentsCount || 0) + Number(post.viewsCount || 0) / 10;
}

const initials = (name = '') => String(name).split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

function formatCount(n) {
  const v = Number(n || 0);
  if (v >= 1000) return (v / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(v);
}

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

/* ─────────────────────────  COMMENT  ───────────────────────── */

function CommentItem({ comment, isAdmin = false, adminBusyId = '', postId = '', onAdminCommentAction }) {
  return (
    <div style={{
      border: '1px solid var(--pl-rule)',
      borderRadius: 12,
      padding: '13px 14px',
      background: 'var(--pl-bg-soft)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{
            overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 9, flex: '0 0 32px',
            fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-2)', background: 'var(--pl-rule-2)',
          }}>
            {comment.avatar ? <img src={comment.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(comment.author)}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{comment.author}</div>
            <div style={{ fontSize: 11, color: 'var(--pl-ink-3)' }}>{formatCommunityRelativeTime(comment.createdAt)}</div>
          </div>
        </div>
        {isAdmin ? (
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <button
              type="button"
              disabled={adminBusyId === comment.id}
              onClick={() => onAdminCommentAction?.(postId, comment, 'censor')}
              className="pl-tap"
              style={{
                border: '1px solid var(--pl-warn)', background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)',
                borderRadius: 7, padding: '3px 8px', fontSize: 10, fontWeight: 700, fontFamily: 'var(--pl-sans)',
                cursor: 'pointer', opacity: adminBusyId === comment.id ? 0.5 : 1,
              }}
            >
              Censurar
            </button>
            <button
              type="button"
              disabled={adminBusyId === comment.id}
              onClick={() => onAdminCommentAction?.(postId, comment, 'delete')}
              className="pl-tap"
              style={{
                border: '1px solid var(--pl-danger)', background: 'var(--pl-surface)', color: 'var(--pl-danger)',
                borderRadius: 7, padding: '3px 8px', fontSize: 10, fontWeight: 700, fontFamily: 'var(--pl-sans)',
                cursor: 'pointer', opacity: adminBusyId === comment.id ? 0.5 : 1,
              }}
            >
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      <p style={{ margin: '9px 0 0', fontSize: 13.5, lineHeight: 1.55, color: 'var(--pl-ink-2)' }}>{comment.content}</p>
    </div>
  );
}

/* ─────────────────────────  POST CARD  ───────────────────────── */

function PostCard({
  post,
  roomName,
  roomTint,
  roomInk,
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
  const pinned = Boolean(post.isPinned);
  const upvoted = Boolean(post.upvotedByCurrentUser);
  const saved = Boolean(post.savedByCurrentUser);
  const comments = Array.isArray(post.comments) ? post.comments : [];

  return (
    <article
      className="pl-card-anim"
      style={{
        background: 'var(--pl-surface)',
        border: `1px solid ${pinned ? 'var(--pl-accent-soft)' : 'var(--pl-rule)'}`,
        borderLeft: pinned ? '3px solid var(--pl-accent)' : '1px solid var(--pl-rule)',
        borderRadius: 16,
        padding: '22px 24px',
        boxShadow: 'var(--pl-sh-low)',
      }}
    >
      {pinned ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--pl-highlight-ink)',
        }}>
          <Pin size={13} /> Fixado pela equipe
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 16 }}>
        {/* vote rail */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
          <button
            type="button"
            onClick={() => onToggleReaction(post, !upvoted)}
            className="pl-tap"
            aria-label="Apoiar"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 38, borderRadius: 11,
              border: `1px solid ${upvoted ? 'var(--pl-accent)' : 'var(--pl-rule-2)'}`,
              background: upvoted ? 'var(--pl-accent)' : 'var(--pl-bg-soft)',
              color: upvoted ? 'var(--pl-surface)' : 'var(--pl-ink-3)',
              cursor: 'pointer',
            }}
          >
            <ArrowBigUp size={20} />
          </button>
          <span style={{
            fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: upvoted ? 'var(--pl-accent)' : 'var(--pl-ink)',
          }}>
            {post.upvotesCount || 0}
          </span>
        </div>

        {/* body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--pl-ink-3)' }}>
            <span style={{
              overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 8, flex: '0 0 28px',
              fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-2)', background: 'var(--pl-rule-2)',
            }}>
              {post.avatar ? <img src={post.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(post.author)}
            </span>
            <span style={{ fontWeight: 700, color: 'var(--pl-ink)' }}>{post.author}</span>
            <button
              type="button"
              onClick={() => onRoomClick?.(slug, post.category)}
              className="pl-tap"
              style={{
                display: 'inline-flex', alignItems: 'center', height: 21, padding: '0 9px',
                border: 0, borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: 'var(--pl-sans)',
                cursor: 'pointer', background: roomTint, color: roomInk,
              }}
            >
              {roomName}
            </button>
            <span style={{ color: 'var(--pl-ink-4)' }}>·</span>
            <span>{formatCommunityRelativeTime(post.createdAt)}</span>
          </div>

          <h2
            onClick={onToggleExpand}
            style={{
              margin: '11px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
              fontSize: 23, lineHeight: 1.18, letterSpacing: '-0.01em', color: 'var(--pl-ink)', cursor: 'pointer',
            }}
          >
            {post.title}
          </h2>
          {post.content ? (
            <p style={{
              margin: '8px 0 0', fontSize: 15, lineHeight: 1.6, color: 'var(--pl-ink-2)',
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {post.content}
            </p>
          ) : null}

          {/* admin moderation */}
          {isAdmin ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 12,
              padding: '8px 10px', borderRadius: 10, background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule)',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-ink-3)', marginRight: 2,
              }}>
                <ShieldAlert size={12} /> Moderação
              </span>
              <button
                type="button"
                disabled={adminBusyId === post.id}
                onClick={() => onAdminPostAction?.(post, 'pin')}
                className="pl-tap"
                style={{
                  border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', color: 'var(--pl-ink-2)',
                  borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, fontFamily: 'var(--pl-sans)',
                  cursor: 'pointer', opacity: adminBusyId === post.id ? 0.5 : 1,
                }}
              >
                {pinned ? 'Desfixar' : 'Fixar'}
              </button>
              <button
                type="button"
                disabled={adminBusyId === post.id}
                onClick={() => onAdminPostAction?.(post, 'hide')}
                className="pl-tap"
                style={{
                  border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', color: 'var(--pl-ink-2)',
                  borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, fontFamily: 'var(--pl-sans)',
                  cursor: 'pointer', opacity: adminBusyId === post.id ? 0.5 : 1,
                }}
              >
                Ocultar
              </button>
              <button
                type="button"
                disabled={adminBusyId === post.id}
                onClick={() => onAdminPostAction?.(post, 'censor')}
                className="pl-tap"
                style={{
                  border: '1px solid var(--pl-warn)', background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)',
                  borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, fontFamily: 'var(--pl-sans)',
                  cursor: 'pointer', opacity: adminBusyId === post.id ? 0.5 : 1,
                }}
              >
                Censurar
              </button>
              <button
                type="button"
                disabled={adminBusyId === post.id}
                onClick={() => onAdminPostAction?.(post, 'delete')}
                className="pl-tap"
                style={{
                  border: '1px solid var(--pl-danger)', background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)',
                  borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, fontFamily: 'var(--pl-sans)',
                  cursor: 'pointer', opacity: adminBusyId === post.id ? 0.5 : 1,
                }}
              >
                Excluir
              </button>
            </div>
          ) : null}

          {/* footer actions */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 13,
            borderTop: '1px solid var(--pl-rule)',
          }}>
            <button
              type="button"
              onClick={onToggleExpand}
              className="pl-tap"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, border: 0, background: 'transparent',
                borderRadius: 8, padding: '6px 9px', fontFamily: 'var(--pl-sans)', fontSize: 13, fontWeight: 600,
                color: 'var(--pl-ink-2)', cursor: 'pointer',
              }}
            >
              <MessageCircle size={16} /> {post.commentsCount || 0} comentários
            </button>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 9px',
              fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-3)',
            }}>
              <Eye size={16} /> {formatCount(post.viewsCount)} leituras
            </span>
            <button
              type="button"
              onClick={() => onToggleSave(post, !saved)}
              className="pl-tap"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, marginLeft: 'auto', border: 0,
                background: 'transparent', borderRadius: 8, padding: '6px 9px', fontFamily: 'var(--pl-sans)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                color: saved ? 'var(--pl-accent)' : 'var(--pl-ink-2)',
              }}
            >
              <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Salvo' : 'Salvar'}
            </button>
          </div>

          {/* expanded comments */}
          {expanded ? (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {comments.length > 0 ? (
                comments.map((comment) => (
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
                <div style={{
                  textAlign: 'center', padding: 14, fontSize: 13, color: 'var(--pl-ink-3)',
                  border: '1px dashed var(--pl-rule-2)', borderRadius: 12,
                }}>
                  Seja a primeira pessoa a comentar neste tópico.
                </div>
              )}
              <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
                <textarea
                  rows={2}
                  value={commentDraft}
                  onChange={(e) => onCommentDraftChange(e.target.value)}
                  placeholder="Responda com respeito — construa a conversa."
                  style={{
                    flex: 1, resize: 'none', border: '1px solid var(--pl-rule-2)', borderRadius: 11,
                    background: 'var(--pl-surface)', padding: '11px 13px', fontFamily: 'var(--pl-sans)',
                    fontSize: 13.5, lineHeight: 1.5, color: 'var(--pl-ink)',
                  }}
                />
                <button
                  type="button"
                  onClick={onSubmitComment}
                  className="pl-tap"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 16px',
                    border: 0, borderRadius: 11, background: 'var(--pl-ink)', color: 'var(--pl-bg)',
                    fontFamily: 'var(--pl-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  <Send size={14} /> Comentar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────────  PAGE  ───────────────────────── */

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
  const [communityError, setCommunityError] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminPanelLoading, setAdminPanelLoading] = useState(false);
  const [adminCategoriesDraft, setAdminCategoriesDraft] = useState([]);
  const [adminNotice, setAdminNotice] = useState('');
  const [adminBusyId, setAdminBusyId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

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
      setCommunityError(false);

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
          setCommunityError(true);
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
  }, [communityState, currentUserId, reloadKey]);

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

  // Mapa slug -> categoria, para tint/ink/dot dos chips de sala.
  const categoryBySlug = useMemo(() => {
    const map = {};
    categories.forEach((c, idx) => {
      map[String(c.slug).toLowerCase()] = {
        ...c,
        dot: c.color || ROOM_DOTS[idx % ROOM_DOTS.length],
        tint: c.color || 'var(--pl-bg-soft)',
        ink: 'var(--pl-ink-2)',
      };
    });
    return map;
  }, [categories]);

  const roomMetaFor = (slug) => categoryBySlug[String(slug || '').toLowerCase()] || {
    name: slug, dot: 'var(--pl-ink-4)', tint: 'var(--pl-bg-soft)', ink: 'var(--pl-ink-2)', description: '',
  };

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

  // Contagem real de posts por sala (nome da categoria).
  const postCountByTag = useMemo(() => {
    const counts = {};
    visibleForumPosts.forEach((p) => {
      const key = String(p.category || '').toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [visibleForumPosts]);

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

  // Stats REAIS para a rail direita (sem numeros fake do mockup).
  const communityStats = useMemo(() => {
    const totalPosts = visibleForumPosts.length;
    const totalComments = visibleForumPosts.reduce((acc, p) => acc + Number(p.commentsCount || 0), 0);
    const totalUpvotes = visibleForumPosts.reduce((acc, p) => acc + Number(p.upvotesCount || 0), 0);
    return { totalPosts, totalComments, totalUpvotes };
  }, [visibleForumPosts]);

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
      setComposerToast('Tópico publicado com sucesso.');
      setIsComposerOpen(false);
      setTimeout(() => setComposerToast(''), 2500);
    } catch (error) {
      setCommunityData(previousState);
      setComposerError(String(error?.message || 'Não foi possível publicar agora. Tente novamente.'));
    } finally {
      setComposerSubmitting(false);
    }
  }

  async function handleSubmitComment(postId) {
    const content = String(commentDrafts[postId] || '').trim();
    if (!content) return;

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
    const previousState = communityData;
    setCommunityData((prev) => toggleLocalCommunityReaction(prev, { postId, reactionType, enabled }));

    if (reactionType === 'save') {
      setComposerToast(enabled ? 'Salvo na sua lista.' : 'Removido dos salvos.');
      setTimeout(() => setComposerToast(''), 2200);
    }

    if (!currentUserId) return;

    try {
      await setPostReaction(postId, currentUserId, reactionType, enabled);
    } catch (error) {
      console.error('[Comunidades] erro ao salvar reação da publicação:', error);
      setCommunityData(previousState);
      setComposerToast('Não foi possível salvar sua ação. Tente novamente.');
      setTimeout(() => setComposerToast(''), 2500);
    }
  }

  // Remove a publicação do estado local, sem recarregar a página/comunidade.
  function removePostLocally(postId) {
    setCommunityData((prev) => {
      const norm = normalizeCommunityState(prev);
      return normalizeCommunityState({
        ...norm,
        forumPosts: norm.forumPosts.filter((p) => String(p.id) !== String(postId)),
      });
    });
    setExpandedPostId((current) => (String(current) === String(postId) ? '' : current));
  }

  // Remove o comentário do estado local, sem recarregar a página/comunidade.
  function removeCommentLocally(postId, commentId) {
    setCommunityData((prev) => {
      const norm = normalizeCommunityState(prev);
      return normalizeCommunityState({
        ...norm,
        forumPosts: norm.forumPosts.map((p) => {
          if (String(p.id) !== String(postId)) return p;
          const list = Array.isArray(p.comments) ? p.comments : [];
          const nextComments = list.filter((c) => String(c.id) !== String(commentId));
          return { ...p, comments: nextComments, commentsCount: nextComments.length };
        }),
      });
    });
  }

  async function handleAdminPostAction(post, action) {
    if (!isAdmin || !post?.id) return;
    if (action === 'delete') {
      const ok = await showConfirm(
        `Excluir a publicação “${String(post.title || 'sem título').slice(0, 80)}”? Essa ação não pode ser desfeita.`,
        { title: 'Excluir publicação', confirmLabel: 'Excluir', danger: true }
      );
      if (!ok) return;
    }
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
          removePostLocally(post.id);
          showToast('Publicação excluída.', 'success');
          return;
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
        if (action === 'delete') {
          removePostLocally(post.id);
          showToast('Publicação excluída.', 'success');
        }
      }
    } catch (e) {
      setAdminNotice(String(e?.message || e));
      if (action === 'delete') showToast('Não foi possível excluir a publicação.', 'error');
    } finally {
      setAdminBusyId('');
    }
  }

  async function handleAdminCommentAction(postId, comment, action) {
    if (!isAdmin || !comment?.id || !postId) return;
    if (action === 'delete') {
      const ok = await showConfirm('Excluir este comentário? Essa ação não pode ser desfeita.', {
        title: 'Excluir comentário',
        confirmLabel: 'Excluir',
        danger: true,
      });
      if (!ok) return;
    }
    setAdminBusyId(comment.id);
    setAdminNotice('');
    try {
      const cloud = persistenceMode === 'supabase' && communitySchemaReady;
      if (cloud) {
        if (action === 'censor') {
          await adminUpdateCommunityComment(comment.id, { content: COMMUNITY_COMMENT_MODERATION_TEXT });
        } else if (action === 'delete') {
          await adminDeleteCommunityComment(comment.id);
          removeCommentLocally(postId, comment.id);
          showToast('Comentário excluído.', 'success');
          return;
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
        if (action === 'delete') {
          removeCommentLocally(postId, comment.id);
          showToast('Comentário excluído.', 'success');
        }
      }
    } catch (e) {
      setAdminNotice(String(e?.message || e));
      if (action === 'delete') showToast('Não foi possível excluir o comentário.', 'error');
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

  /* ── estados derivados de apresentação ── */
  const showError = !communityLoading && communityError && visibleForumPosts.length === 0;
  const showEmpty = !communityLoading && !showError && filteredPosts.length === 0;
  const showFeed = !communityLoading && !showError && !showEmpty;
  const activeRoomMeta = categories.find((c) => c.name === activeTag);
  const activeRoomDesc = activeTag === 'Todos'
    ? 'Toda a comunidade reunida. Filtre por sala para focar num tema.'
    : (activeRoomMeta?.description || '');

  if (communityLoading) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 1560, margin: '0 auto', padding: '14px 18px 0', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
            {[1, 2, 3].map((sk) => (
              <div key={sk} style={{
                display: 'flex', gap: 16, background: 'var(--pl-surface)', border: '1px solid var(--pl-rule)',
                borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--pl-sh-low)',
              }}>
                <div style={{ width: 46, flex: '0 0 46px', height: 64, borderRadius: 10, background: 'var(--pl-bg-soft)' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11 }}>
                  <div className="pl-skeleton-line" style={{ height: 13, width: '34%' }} />
                  <div className="pl-skeleton-line" style={{ height: 20, width: '78%' }} />
                  <div className="pl-skeleton-line" style={{ height: 13, width: '92%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <style>{skeletonCss}</style>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{communityCss}</style>
      <div style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 1560, margin: '0 auto', padding: '14px 18px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ░░ APP GRID ░░ */}
        <div className="plc-grid">

          {/* ── LEFT RAIL ── */}
          <aside className="plc-rail-l" style={{ alignSelf: 'start', minHeight: 0, maxHeight: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <nav style={{ background: 'var(--pl-surface)', border: '1px solid var(--pl-rule)', borderRadius: 14, padding: 8, boxShadow: 'var(--pl-sh-low)' }}>
              <button
                type="button"
                onClick={() => { setActiveTag('Todos'); setSearchValue(''); }}
                className="pl-tap"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', border: 0,
                  borderRadius: 10, fontFamily: 'var(--pl-sans)', fontSize: 13.5, cursor: 'pointer', textAlign: 'left',
                  background: activeTag === 'Todos' ? 'var(--pl-accent-soft)' : 'transparent',
                  color: activeTag === 'Todos' ? 'var(--pl-accent)' : 'var(--pl-ink-2)',
                  fontWeight: activeTag === 'Todos' ? 700 : 600,
                }}
              >
                <MessageCircle size={17} /> Discussões
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setAdminPanelOpen(true)}
                  className="pl-tap"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginTop: 4, padding: '10px 12px',
                    border: 0, borderRadius: 10, background: 'transparent', color: 'var(--pl-ink-2)',
                    fontFamily: 'var(--pl-sans)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <ShieldAlert size={17} /> Painel admin
                </button>
              ) : null}
            </nav>

            {/* Salas */}
            <div style={{ background: 'var(--pl-surface)', border: '1px solid var(--pl-rule)', borderRadius: 14, padding: '16px 16px 8px', boxShadow: 'var(--pl-sh-low)' }}>
              <div className="pl-eyebrow" style={{ marginBottom: 12 }}>Salas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {tags.map((tag, idx) => {
                  const active = activeTag === tag;
                  const isAll = tag === 'Todos';
                  const cat = isAll ? null : categories.find((c) => c.name === tag);
                  const dot = isAll
                    ? 'var(--pl-ink-4)'
                    : (cat?.color || ROOM_DOTS[(idx - 1 + ROOM_DOTS.length) % ROOM_DOTS.length]);
                  const count = isAll ? visibleForumPosts.length : (postCountByTag[String(tag).toLowerCase()] || 0);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => { setActiveTag(tag); setSearchValue(''); }}
                      className="pl-tap"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%',
                        padding: '9px 11px', border: 0, borderRadius: 10, fontFamily: 'var(--pl-sans)', fontSize: 13.5,
                        cursor: 'pointer', textAlign: 'left',
                        fontWeight: active ? 700 : 600,
                        background: active ? 'var(--pl-accent-soft)' : 'transparent',
                        color: active ? 'var(--pl-accent)' : 'var(--pl-ink-2)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 3, flex: '0 0 8px', background: dot }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isAll ? 'Todas as salas' : tag}</span>
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', padding: '2px 7px',
                        borderRadius: 7,
                        background: active ? 'var(--pl-accent)' : 'var(--pl-bg-soft)',
                        color: active ? 'var(--pl-surface)' : 'var(--pl-ink-3)',
                      }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              {activeRoomDesc ? (
                <p style={{ margin: '10px 2px 8px', fontSize: 12, lineHeight: 1.5, color: 'var(--pl-ink-3)' }}>{activeRoomDesc}</p>
              ) : null}
            </div>
          </aside>

          {/* ── MAIN COLUMN ── */}
          <main className="pl-feed-scroll" style={{ minWidth: 0, minHeight: 0, overflowY: 'auto', paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* toolbar: sort + search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'var(--pl-surface)',
              border: '1px solid var(--pl-rule)', borderRadius: 14, padding: 10, boxShadow: 'var(--pl-sh-low)',
            }}>
              <div style={{ display: 'flex', gap: 4, background: 'var(--pl-bg-soft)', borderRadius: 10, padding: 4 }}>
                {FEED_FILTERS.map((filter) => {
                  const active = activeFilter === filter.id;
                  const isHot = filter.id === 'hot';
                  const base = {
                    display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, borderRadius: 8, padding: '8px 15px',
                    fontFamily: 'var(--pl-sans)', fontSize: 13, cursor: 'pointer', fontWeight: active ? 700 : 600,
                  };
                  let extra;
                  if (isHot && active) {
                    extra = { color: '#14110d', background: 'var(--pl-highlight)', boxShadow: 'var(--pl-sh-low)' };
                  } else {
                    extra = {
                      background: active ? 'var(--pl-ink)' : 'transparent',
                      color: active ? 'var(--pl-bg)' : (isHot ? 'var(--pl-highlight-ink)' : 'var(--pl-ink-3)'),
                    };
                  }
                  return (
                    <button key={filter.id} type="button" onClick={() => setActiveFilter(filter.id)} className="pl-tap" style={{ ...base, ...extra }}>
                      {isHot ? <Flame size={14} /> : null}
                      {filter.label}
                    </button>
                  );
                })}
              </div>
              <div style={{
                flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 9, minWidth: 0,
                background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule)', borderRadius: 10, padding: '0 12px', height: 40,
              }}>
                <Search size={16} color="var(--pl-ink-3)" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Buscar dúvidas, salas, autores…"
                  style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', fontFamily: 'var(--pl-sans)', fontSize: 14, color: 'var(--pl-ink)' }}
                />
              </div>
              <button
                type="button"
                onClick={openComposerModal}
                className="pl-tap"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 18px', border: 0,
                  borderRadius: 10, background: 'var(--pl-ink)', color: 'var(--pl-bg)', fontFamily: 'var(--pl-sans)',
                  fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: 'var(--pl-sh-low)',
                }}
              >
                <Plus size={15} /> Nova pergunta
              </button>
            </div>

            {/* breadcrumb */}
            {activeTag !== 'Todos' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--pl-ink-3)', padding: '0 4px' }}>
                <button
                  type="button"
                  onClick={() => { setActiveTag('Todos'); setSearchValue(''); }}
                  className="pl-tap"
                  style={{ border: 0, background: 'transparent', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)', fontSize: 13, cursor: 'pointer', padding: 0 }}
                >
                  Todas as salas
                </button>
                <ChevronRight size={14} />
                <span style={{ fontWeight: 700, color: 'var(--pl-ink)' }}>{activeTag}</span>
              </div>
            ) : null}

            {/* ERROR STATE */}
            {showError ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12,
                background: 'var(--pl-surface)', border: '1px solid var(--pl-danger-soft)', borderRadius: 18,
                padding: '56px 28px', boxShadow: 'var(--pl-sh-low)',
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54,
                  borderRadius: 16, background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)',
                }}>
                  <AlertTriangle size={26} />
                </div>
                <h3 style={{ margin: 0, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 24, color: 'var(--pl-ink)' }}>
                  Algo deu errado ao carregar o feed.
                </h3>
                <p style={{ margin: 0, maxWidth: 380, fontSize: 14, lineHeight: 1.55, color: 'var(--pl-ink-3)' }}>
                  A conexão falhou ou o servidor não respondeu. Tente novamente em alguns segundos.
                </p>
                <button
                  type="button"
                  onClick={() => { setCommunityError(false); setReloadKey((k) => k + 1); }}
                  className="pl-tap"
                  style={{
                    marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 20px',
                    border: 0, borderRadius: 11, background: 'var(--pl-ink)', color: 'var(--pl-bg)',
                    fontFamily: 'var(--pl-sans)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={15} /> Tentar de novo
                </button>
              </div>
            ) : null}

            {/* EMPTY STATE */}
            {showEmpty ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12,
                background: 'var(--pl-surface)', border: '1px solid var(--pl-rule)', borderRadius: 18,
                padding: '60px 28px', boxShadow: 'var(--pl-sh-low)',
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56,
                  borderRadius: 16, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)',
                }}>
                  <Sparkles size={26} />
                </div>
                <h3 style={{ margin: 0, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 25, color: 'var(--pl-ink)' }}>
                  Nada por aqui ainda.
                </h3>
                <p style={{ margin: 0, maxWidth: 400, fontSize: 14, lineHeight: 1.55, color: 'var(--pl-ink-3)' }}>
                  Limpe a busca, escolha outra sala ou seja a primeira pessoa a abrir esta conversa.
                </p>
                <button
                  type="button"
                  onClick={openComposerModal}
                  className="pl-tap"
                  style={{
                    marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 20px',
                    border: 0, borderRadius: 11, background: 'var(--pl-ink)', color: 'var(--pl-bg)',
                    fontFamily: 'var(--pl-sans)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Plus size={15} /> Fazer a primeira pergunta
                </button>
              </div>
            ) : null}

            {/* FEED */}
            {showFeed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filteredPosts.map((post) => {
                  const meta = roomMetaFor(post.categorySlug);
                  return (
                    <PostCard
                      key={post.id}
                      post={post}
                      roomName={post.category || meta.name}
                      roomTint={meta.tint}
                      roomInk={meta.ink}
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
                  );
                })}
              </div>
            ) : null}
          </main>

          {/* ── RIGHT CONTEXT COLUMN ── */}
          <aside className="plc-rail-r" style={{ alignSelf: 'start', minHeight: 0, maxHeight: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Em alta */}
            {trendingFeedPosts.length > 0 ? (
              <div style={{ background: 'var(--pl-surface)', border: '1px solid var(--pl-rule)', borderRadius: 14, padding: 16, boxShadow: 'var(--pl-sh-low)' }}>
                <div className="pl-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                  <Flame size={14} color="var(--pl-highlight-ink)" /> Em alta
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {trendingFeedPosts.slice(0, 5).map((tp, i) => (
                    <button
                      key={tp.id}
                      type="button"
                      onClick={() => handlePickTrend({ type: 'post', post: tp, tags })}
                      className="pl-tap"
                      style={{
                        display: 'flex', gap: 11, alignItems: 'flex-start', width: '100%', padding: '8px 6px',
                        border: 0, borderRadius: 9, background: 'transparent', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontSize: 18, lineHeight: 1, color: 'var(--pl-ink-4)', width: 18, flex: '0 0 18px' }}>{i + 1}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          fontSize: 12.5, fontWeight: 600, lineHeight: 1.35, color: 'var(--pl-ink)',
                        }}>
                          {tp.title}
                        </span>
                        <span style={{ display: 'block', marginTop: 3, fontSize: 11, color: 'var(--pl-ink-3)' }}>
                          #{tp.category} · {Math.round(hotEngagementScore(tp))} pts
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Diretrizes (texto estatico) */}
            <div style={{ background: 'var(--pl-surface)', border: '1px solid var(--pl-rule)', borderRadius: 14, padding: 18, boxShadow: 'var(--pl-sh-low)' }}>
              <div className="pl-eyebrow" style={{ marginBottom: 14 }}>Diretrizes da comunidade</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {[
                  'Respeite quem está começando. Toda dúvida é válida.',
                  'Compartilhe métodos reais, não promessas mágicas.',
                  'Nada de spam, vendas ou desrespeito. A equipe modera.',
                ].map((rule, i) => (
                  <div key={i} style={{ display: 'flex', gap: 11 }}>
                    <span style={{ fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--pl-accent)', lineHeight: 1.3 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>{rule}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ░░ COMPOSER MODAL ░░ */}
      {isComposerOpen ? (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeComposerModal(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(20,17,13,.5)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 18px', overflow: 'auto',
          }}
        >
          <div
            className="pl-card-anim"
            style={{
              width: '100%', maxWidth: 600, background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)',
              borderRadius: 18, boxShadow: 'var(--pl-sh-high)', overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 22px', borderBottom: '1px solid var(--pl-rule)' }}>
              <div>
                <div className="pl-eyebrow">Nova pergunta</div>
                <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 24, color: 'var(--pl-ink)' }}>
                  Abra uma conversa.
                </h2>
              </div>
              <button
                type="button"
                onClick={closeComposerModal}
                disabled={composerSubmitting}
                className="pl-tap"
                aria-label="Fechar"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, border: 0,
                  borderRadius: 10, background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-2)', cursor: 'pointer',
                }}
              >
                <X size={17} />
              </button>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>Título</span>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Resuma sua dúvida em uma frase clara"
                  disabled={composerSubmitting}
                  style={{ border: '1px solid var(--pl-rule-2)', borderRadius: 11, background: 'var(--pl-bg-soft)', padding: '12px 14px', fontFamily: 'var(--pl-sans)', fontSize: 14, color: 'var(--pl-ink)' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>Conteúdo</span>
                <textarea
                  rows={5}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Descreva seu contexto para a comunidade ajudar melhor."
                  disabled={composerSubmitting}
                  style={{ resize: 'vertical', border: '1px solid var(--pl-rule-2)', borderRadius: 11, background: 'var(--pl-bg-soft)', padding: '12px 14px', fontFamily: 'var(--pl-sans)', fontSize: 14, lineHeight: 1.55, color: 'var(--pl-ink)' }}
                />
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>Sala</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {categories.map((cat) => {
                    const active = draftCategory === cat.name;
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => setDraftCategory(cat.name)}
                        disabled={composerSubmitting}
                        className="pl-tap"
                        style={{
                          border: `1px solid ${active ? 'var(--pl-accent)' : 'var(--pl-rule-2)'}`, borderRadius: 9,
                          padding: '7px 13px', fontFamily: 'var(--pl-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          background: active ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
                          color: active ? 'var(--pl-accent)' : 'var(--pl-ink-2)',
                        }}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              {composerError ? (
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-danger)', background: 'var(--pl-danger-soft)', borderRadius: 10, padding: '10px 12px' }}>
                  {composerError}
                </div>
              ) : null}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--pl-rule)', background: 'var(--pl-surface-2)' }}>
              <button
                type="button"
                onClick={closeComposerModal}
                disabled={composerSubmitting}
                className="pl-tap"
                style={{ height: 42, padding: '0 18px', border: '1px solid var(--pl-rule-2)', borderRadius: 11, background: 'var(--pl-surface)', color: 'var(--pl-ink-2)', fontFamily: 'var(--pl-sans)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePublishPost}
                disabled={composerSubmitting}
                className="pl-tap"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 20px', border: 0,
                  borderRadius: 11, background: 'var(--pl-ink)', color: 'var(--pl-bg)', fontFamily: 'var(--pl-sans)',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: composerSubmitting ? 0.6 : 1,
                }}
              >
                <Send size={15} /> {composerSubmitting ? 'Publicando…' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AppToast message={composerToast} variant="success" />

      {/* ░░ ADMIN MODAL ░░ */}
      {adminPanelOpen ? (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setAdminPanelOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(20,17,13,.5)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 18px', overflow: 'auto',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="community-admin-title"
        >
          <div
            className="pl-card-anim"
            style={{
              width: '100%', maxWidth: 620, background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)',
              borderRadius: 18, boxShadow: 'var(--pl-sh-high)', overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 22px', borderBottom: '1px solid var(--pl-rule)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 11, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' }}>
                  <ShieldAlert size={18} />
                </span>
                <div>
                  <div className="pl-eyebrow">Painel admin</div>
                  <h2 id="community-admin-title" style={{ margin: '3px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 22, color: 'var(--pl-ink)' }}>
                    Gerenciar salas
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminPanelOpen(false)}
                className="pl-tap"
                aria-label="Fechar painel admin"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, border: 0, borderRadius: 10, background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-2)', cursor: 'pointer' }}
              >
                <X size={17} />
              </button>
            </div>
            <div style={{ padding: '20px 22px', maxHeight: '60vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 11 }}>
              {adminNotice ? (
                <p style={{ borderRadius: 12, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', padding: '8px 12px', fontSize: 14, color: 'var(--pl-danger)', margin: 0 }}>
                  {adminNotice}
                </p>
              ) : null}
              {adminPanelLoading ? (
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)', margin: 0 }}>Carregando salas…</p>
              ) : null}
              {adminCategoriesDraft.map((row, idx) => (
                <div key={row.id} style={{ border: '1px solid var(--pl-rule)', borderRadius: 12, padding: '11px 13px', background: 'var(--pl-bg-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, flex: '0 0 10px', background: ROOM_DOTS[idx % ROOM_DOTS.length] }} />
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => setAdminCategoriesDraft((prev) => prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))}
                      style={{ flex: 1, minWidth: 0, border: '1px solid var(--pl-rule-2)', borderRadius: 9, background: 'var(--pl-surface)', padding: '8px 11px', fontFamily: 'var(--pl-sans)', fontSize: 13.5, fontWeight: 600, color: 'var(--pl-ink)' }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--pl-ink-3)', whiteSpace: 'nowrap' }}>
                      {postCountByTag[String(row.name).toLowerCase()] || 0} posts
                    </span>
                    <button
                      type="button"
                      disabled={adminBusyId === String(row.id) || row.is_active === false}
                      onClick={() => handleDeactivateAdminCategory(row)}
                      className="pl-tap"
                      style={{
                        border: '1px solid var(--pl-danger)', background: 'var(--pl-surface)', color: 'var(--pl-danger)',
                        borderRadius: 9, padding: '7px 11px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--pl-sans)',
                        cursor: 'pointer', whiteSpace: 'nowrap', opacity: (adminBusyId === String(row.id) || row.is_active === false) ? 0.5 : 1,
                      }}
                    >
                      Desativar
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 9, alignItems: 'flex-end' }}>
                    <textarea
                      rows={2}
                      value={row.description}
                      onChange={(e) => setAdminCategoriesDraft((prev) => prev.map((r) => (r.id === row.id ? { ...r, description: e.target.value } : r)))}
                      placeholder="Descrição da sala"
                      style={{ flex: 1, resize: 'none', border: '1px solid var(--pl-rule-2)', borderRadius: 9, background: 'var(--pl-surface)', padding: '8px 11px', fontFamily: 'var(--pl-sans)', fontSize: 13, color: 'var(--pl-ink)' }}
                    />
                    <button
                      type="button"
                      disabled={adminBusyId === String(row.id)}
                      onClick={() => handleSaveAdminCategoryRow(row)}
                      className="pl-tap"
                      style={{
                        height: 38, padding: '0 14px', border: 0, borderRadius: 9, background: 'var(--pl-ink)',
                        color: 'var(--pl-bg)', fontFamily: 'var(--pl-sans)', fontSize: 12.5, fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap', opacity: adminBusyId === String(row.id) ? 0.5 : 1,
                      }}
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 22px', borderTop: '1px solid var(--pl-rule)', background: 'var(--pl-surface-2)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)', marginBottom: 9 }}>Criar nova sala</div>
              <div style={{ display: 'flex', gap: 9 }}>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Nome da sala (ex: Redação)"
                  style={{ flex: 1, border: '1px solid var(--pl-rule-2)', borderRadius: 11, background: 'var(--pl-surface)', padding: '11px 13px', fontFamily: 'var(--pl-sans)', fontSize: 14, color: 'var(--pl-ink)' }}
                />
                <button
                  type="button"
                  disabled={adminBusyId === 'new-room'}
                  onClick={handleCreateAdminRoom}
                  className="pl-tap"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 18px', border: 0,
                    borderRadius: 11, background: 'var(--pl-ink)', color: 'var(--pl-bg)', fontFamily: 'var(--pl-sans)',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: adminBusyId === 'new-room' ? 0.5 : 1,
                  }}
                >
                  <Plus size={15} /> Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const skeletonCss = `
@keyframes plShimmer { 0% { background-position: -560px 0; } 100% { background-position: 560px 0; } }
.pl-skeleton-line {
  border-radius: 6px;
  background: linear-gradient(90deg, var(--pl-bg-soft) 25%, var(--pl-rule) 37%, var(--pl-bg-soft) 63%);
  background-size: 560px 100%;
  animation: plShimmer 1.3s linear infinite;
}
`;

const communityCss = `
@keyframes plRise { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.pl-card-anim { animation: plRise .32s cubic-bezier(.2,.7,.2,1) both; }
.pl-tap { transition: transform .08s ease, background .14s ease, border-color .14s ease, color .14s ease, box-shadow .14s ease; }
.pl-tap:active { transform: translateY(1px); }
.plc-grid {
  display: grid;
  grid-template-columns: 264px minmax(0,1fr) 304px;
  gap: 26px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
}
.pl-feed-scroll::-webkit-scrollbar { width: 10px; }
.pl-feed-scroll::-webkit-scrollbar-thumb { background: var(--pl-rule-2); border-radius: 8px; }
.pl-feed-scroll::-webkit-scrollbar-track { background: transparent; }
@media (max-width: 1180px) {
  .plc-grid { grid-template-columns: 236px minmax(0,1fr); }
  .plc-rail-r { display: none; }
}
@media (max-width: 840px) {
  .plc-grid { grid-template-columns: 1fr; }
  .plc-rail-l { display: none; }
}
`;
