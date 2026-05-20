import React, { useEffect, useMemo, useState } from 'react';
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
  Pin,
  EyeOff,
  Trash2,
  X,
  Gavel,
} from 'lucide-react';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';
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
  togglePostUpvote,
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

function CommunityTopTenSidebar({ posts = [], tags = [], onPickTrend, className = '' }) {
  return (
    <div className={cx('flex min-h-0 flex-1 flex-col rounded-[20px] border border-ink-200 bg-white', className)}>
      <div className="shrink-0 border-b border-ink-100 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">Top 10</p>
        <p className="mt-0.5 text-sm font-bold text-ink-900">Tópicos mais engajados</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">Clique para abrir no feed central.</p>
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-ink-100 overflow-y-auto overscroll-contain">
        {posts.map((tp, idx) => {
          const slug = String(tp.categorySlug || 'geral').toLowerCase();
          return (
            <li key={`top-${tp.id}`}>
              <button
                type="button"
                onClick={() => onPickTrend?.({ type: 'post', post: tp, tags })}
                className="flex w-full gap-3 px-3 py-3 text-left transition hover:bg-ink-50"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-ink-100">
                  {tp.avatar ? (
                    <img src={tp.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-ink-500">{initials(tp.author)}</span>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-ink-200 bg-white px-0.5 text-[10px] font-bold text-ink-700">
                    {idx + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug text-ink-800">{tp.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                    s/{slug} · {formatCommunityRelativeTime(tp.createdAt)} · {Number(tp.upvotesCount || 0)} apoios · {Number(tp.commentsCount || 0)} com.
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const cx = (...classes) => classes.filter(Boolean).join(' ');
const initials = (name = '') => String(name).split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

function sortPostsByMode(posts, mode) {
  const items = [...posts];
  if (mode === 'recent') return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (mode === 'top') return items.sort((a, b) => b.upvotesCount - a.upvotesCount || b.viewsCount - a.viewsCount);
  return items.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const scoreA = Number(a.upvotesCount || 0) * 2 + Number(a.commentsCount || 0) + Number(a.viewsCount || 0) / 10;
    const scoreB = Number(b.upvotesCount || 0) * 2 + Number(b.commentsCount || 0) + Number(b.viewsCount || 0) / 10;
    return scoreB - scoreA;
  });
}

function CommentItem({ comment, isAdmin = false, adminBusyId = '', postId = '', onAdminCommentAction, redditDark = false }) {
  return (
    <div
      className={cx(
        'rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md',
        redditDark ? 'border-[#3a3530] bg-[#211c16]' : 'border-ink-100 bg-ink-50'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={cx(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold',
              redditDark ? 'bg-[#1a1612] text-[#ece4d2]' : 'bg-ink-200 text-ink-700'
            )}
          >
            {comment.avatar ? <img src={comment.avatar} alt="" className="h-full w-full rounded-2xl object-cover" /> : initials(comment.author)}
          </div>
          <div className="min-w-0">
            <p className={cx('truncate text-sm font-semibold', redditDark ? 'text-[#ece4d2]' : 'text-ink-800')}>{comment.author}</p>
            <p className={cx('text-[10px] font-semibold uppercase tracking-[0.16em]', redditDark ? 'text-[#8e8675]' : 'text-ink-400')}>
              {formatCommunityRelativeTime(comment.createdAt)}
            </p>
          </div>
        </div>
        {isAdmin ? (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <button
              type="button"
              disabled={adminBusyId === comment.id}
              onClick={() => onAdminCommentAction?.(postId, comment, 'censor')}
              className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
            >
              Censurar
            </button>
            <button
              type="button"
              disabled={adminBusyId === comment.id}
              onClick={() => onAdminCommentAction?.(postId, comment, 'delete')}
              className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
            >
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      <p className={cx('mt-3 text-sm leading-relaxed', redditDark ? 'text-[#ece4d2]' : 'text-ink-600')}>{comment.content}</p>
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
  redditDark = false,
}) {
  const slug = String(post.categorySlug || 'geral').toLowerCase();
  const roomPath = `s/${slug}`;
  const rd = redditDark;

  return (
    <article
      className={cx(
        'overflow-hidden rounded-[2rem] border transition-shadow duration-200',
        rd
          ? featured
            ? 'border-[#1d4ed8]/50 bg-[#1a1612] ring-1 ring-[#1d4ed8]/30'
            : 'border-[#3a3530] bg-[#1a1612] hover:border-[#8e8675]'
          : featured
            ? 'border-amber-200 bg-white shadow-sm ring-1 ring-amber-100/80'
            : 'border-ink-100 bg-white shadow-sm hover:shadow-md'
      )}
    >
      <div className="flex flex-col sm:flex-row">
        <div
          className={cx(
            'flex flex-row items-center justify-center gap-2 border-b px-3 py-2 sm:w-[52px] sm:flex-col sm:gap-1 sm:border-b-0 sm:border-r sm:px-1 sm:py-3',
            rd ? 'border-[#3a3530] bg-[#14110d] sm:border-[#3a3530] sm:bg-transparent' : 'border-ink-100 bg-ink-50/60 sm:border-ink-100 sm:bg-transparent'
          )}
        >
          <button
            type="button"
            onClick={() => onToggleReaction(post, !post.upvotedByCurrentUser)}
            className={cx(
              'flex h-9 w-9 items-center justify-center rounded-lg transition sm:h-8 sm:w-8',
              post.upvotedByCurrentUser
                ? rd
                  ? 'bg-[#1d4ed8]/20 text-[#1d4ed8]'
                  : 'bg-orange-100 text-orange-700'
                : rd
                  ? 'text-[#8e8675] hover:bg-[#211c16]'
                  : 'text-ink-500 hover:bg-ink-200'
            )}
            aria-label="Dar apoio"
          >
            <ArrowBigUp size={20} className="sm:h-[18px] sm:w-[18px]" />
          </button>
          <span className={cx('min-w-[1.5rem] text-center text-sm font-bold tabular-nums', rd ? 'text-[#ece4d2]' : 'text-ink-800')}>{post.upvotesCount}</span>
        </div>

        <div className="min-w-0 flex-1 px-3 py-3 sm:px-4 sm:py-3">
          <div className={cx('flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-tight', rd ? 'text-[#8e8675]' : 'text-ink-500')}>
            <div
              className={cx(
                'flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold',
                rd ? 'bg-[#211c16] text-[#ece4d2]' : 'bg-ink-200 text-ink-600'
              )}
            >
              {post.avatar ? <img src={post.avatar} alt="" className="h-full w-full object-cover" /> : initials(post.author)}
            </div>
            <button
              type="button"
              onClick={() => onRoomClick?.(slug, post.category)}
              className={cx('font-semibold hover:underline', rd ? 'text-[#ece4d2]' : 'text-ink-900')}
            >
              {roomPath}
            </button>
            <span className={rd ? 'text-[#3a3530]' : 'text-ink-300'} aria-hidden>
              ·
            </span>
            <span className="truncate">{formatCommunityRelativeTime(post.createdAt)}</span>
            <span className={cx('hidden sm:inline', rd ? 'text-[#3a3530]' : 'text-ink-300')} aria-hidden>
              ·
            </span>
            <span className={cx('max-w-[140px] truncate sm:max-w-[200px]', rd ? 'text-[#8e8675]' : 'text-ink-500')}>por {post.author}</span>
            {post.isPinned ? (
              <span
                className={cx(
                  'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  rd ? 'bg-[#1d4ed8]/15 text-[#1d4ed8]' : 'bg-amber-100 text-amber-800'
                )}
              >
                <Flame size={10} />
                Fixado
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onToggleSave(post, !post.savedByCurrentUser)}
              className={cx(
                'ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition',
                post.savedByCurrentUser
                  ? rd
                    ? 'text-[#93b4ff]'
                    : 'text-blue-600'
                  : rd
                    ? 'text-[#8e8675] hover:bg-[#211c16] hover:text-[#ece4d2]'
                    : 'text-ink-400 hover:bg-ink-100 hover:text-ink-600'
              )}
              aria-label={post.savedByCurrentUser ? 'Remover dos salvos' : 'Salvar'}
            >
              <Bookmark size={18} />
            </button>
          </div>

          <h2
            className={cx(
              'mt-2 font-bold leading-snug tracking-tight',
              rd ? 'text-[#ece4d2]' : 'text-ink-900',
              featured ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
            )}
          >
            {post.title}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink-200 bg-ink-100 text-[11px] font-bold text-ink-600">
              {post.avatar ? <img src={post.avatar} alt={`Avatar de ${post.author}`} className="h-full w-full object-cover" /> : initials(post.author)}
            </div>
            <p className="truncate text-sm font-medium text-ink-600">
              {post.author}
            </p>
          </div>
          <p className={cx('mt-2 line-clamp-5 whitespace-pre-wrap text-[15px] leading-relaxed', rd ? 'text-[#8e8675]' : 'text-ink-600')}>{post.content}</p>

          {isAdmin ? (
            <div
              className={cx(
                'mt-3 flex flex-wrap gap-1.5 rounded-lg border p-2',
                rd ? 'border-rose-900/50 bg-rose-950/40' : 'border-rose-100 bg-rose-50/50'
              )}
            >
              <span className="flex w-full items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose-200">
                <ShieldAlert size={11} />
                Moderação
              </span>
              <button
                type="button"
                disabled={adminBusyId === post.id}
                onClick={() => onAdminPostAction?.(post, 'pin')}
                className={cx(
                  'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide disabled:opacity-50',
                  rd ? 'border-[#3a3530] bg-[#211c16] text-[#ece4d2] hover:bg-[#3a3530]' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
                )}
              >
                <Pin size={11} className="mr-0.5 inline" />
                {post.isPinned ? 'Desfixar' : 'Fixar'}
              </button>
              <button
                type="button"
                disabled={adminBusyId === post.id}
                onClick={() => onAdminPostAction?.(post, 'hide')}
                className={cx(
                  'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide disabled:opacity-50',
                  rd ? 'border-[#3a3530] bg-[#211c16] text-[#ece4d2] hover:bg-[#3a3530]' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
                )}
              >
                Ocultar
              </button>
              <button
                type="button"
                disabled={adminBusyId === post.id}
                onClick={() => onAdminPostAction?.(post, 'censor')}
                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              >
                Censurar
              </button>
              <button
                type="button"
                disabled={adminBusyId === post.id}
                onClick={() => onAdminPostAction?.(post, 'delete')}
                className="rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          ) : null}

          <div className={cx('mt-4 flex flex-wrap items-center gap-2 border-t pt-4', rd ? 'border-[#3a3530]' : 'border-ink-100')}>
            <button
              type="button"
              onClick={onToggleExpand}
              className={cx(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition',
                rd ? 'border-[#3a3530] bg-[#211c16] text-[#ece4d2] hover:bg-[#3a3530]' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
              )}
            >
              <MessageCircle size={16} />
              {post.commentsCount} comentários
            </button>
            <span className={cx('inline-flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium', rd ? 'text-[#8e8675]' : 'text-ink-500')}>
              <Eye size={15} />
              {post.viewsCount} leituras
            </span>
            <button
              type="button"
              onClick={() => onToggleSave(post, !post.savedByCurrentUser)}
              className={cx(
                'ml-auto inline-flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition',
                post.savedByCurrentUser ? 'text-blue-700' : 'text-ink-500 hover:text-ink-700'
              )}
            >
              <Bookmark size={15} />
              {post.savedByCurrentUser ? 'Salvo' : 'Salvar'}
            </button>
          </div>

          {expanded ? (
            <div
              className={cx(
                'mt-4 space-y-3 rounded-[1.4rem] border p-3 sm:p-4',
                rd ? 'border-[#3a3530] bg-[#14110d]' : 'border-ink-100 bg-ink-50/80'
              )}
            >
              <div className="space-y-3">
                {(Array.isArray(post.comments) ? post.comments : []).length > 0 ? (
                  post.comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      postId={post.id}
                      isAdmin={isAdmin}
                      adminBusyId={adminBusyId}
                      onAdminCommentAction={onAdminCommentAction}
                      redditDark={rd}
                    />
                  ))
                ) : (
                  <div
                    className={cx(
                      'rounded-lg border border-dashed px-3 py-4 text-sm font-medium',
                      rd ? 'border-[#3a3530] bg-[#1a1612] text-[#8e8675]' : 'border-ink-200 bg-white text-ink-500'
                    )}
                  >
                    Seja a primeira pessoa a comentar neste tópico.
                  </div>
                )}
              </div>
              <div className={cx('rounded-2xl border p-3', rd ? 'border-[#3a3530] bg-[#1a1612]' : 'border-ink-200 bg-white')}>
                <textarea
                  rows="3"
                  value={commentDraft}
                  onChange={(event) => onCommentDraftChange(event.target.value)}
                  placeholder="Responda com respeito — construa a conversa."
                  className={cx(
                    'w-full resize-none rounded-xl border p-3 text-sm outline-none transition',
                    rd
                      ? 'border-[#3a3530] bg-[#211c16] text-[#ece4d2] placeholder:text-[#8e8675] focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8]/40'
                      : 'border-ink-200 bg-ink-50 text-ink-700 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100'
                  )}
                />
                <div className="mt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={onSubmitComment}
                    className={cx(
                      'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                      rd ? 'bg-[#1d4ed8] text-white hover:bg-[#ff5414]' : 'bg-ink-900 text-white hover:bg-ink-950'
                    )}
                  >
                    <Send size={15} />
                    Comentar
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
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
      .catch(console.warn);
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
    setCommunityData((prev) => toggleLocalCommunityReaction(prev, { postId, reactionType, enabled }));

    if (reactionType !== 'upvote' || !currentUserId) return;

    togglePostUpvote(postId, currentUserId).catch(console.warn);
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
    if (!window.confirm(`Desativar a sala “${row.name}”? Ela some dos filtros; tópicos antigos permanecem no banco.`)) return;
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
          color: '#e0e7ff',
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
              { id: `category-${slug}`, slug, name, description, color: '#e0e7ff' },
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
      <div className="page-shell animate-in fade-in slide-in-from-bottom-6 duration-700 flex-row gap-6 p-4 lg:p-6">
        <div className="w-full rounded-[30px] border border-ink-200 bg-white p-10 text-center shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-ink-200 border-t-ink-900" />
          <p className="mt-4 text-sm font-semibold text-ink-500">Carregando comunidade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-3 flex min-h-0 flex-1 animate-in fade-in flex-col bg-[var(--bg-canvas)] text-ink-800 duration-300 sm:-mx-4 md:-mx-5">
      <div
        className={cx(
          'flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row',
          'xl:grid xl:grid-cols-[280px_minmax(0,1fr)]'
        )}
      >
        <aside className="order-2 hidden min-h-0 w-full shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-ink-200 bg-white lg:order-1 lg:flex lg:max-w-[280px]">
          <div className="p-3">
            <h1 className="px-2 text-lg font-bold tracking-tight text-ink-900">Comunidade</h1>
            <p className="mt-1 px-2 text-xs text-ink-500">
              <span className="font-semibold text-ink-800">{displayName}</span>
              {communitySchemaReady ? ' · nuvem' : ' · local'}
            </p>
            <div className="mt-3 flex items-center gap-3 rounded-md bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                <MessageCircle size={17} />
              </span>
              <span className="min-w-0 flex-1 truncate">Discussões</span>
            </div>
          </div>

          <div className="border-t border-ink-200 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">Ordenação e filtros</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setAdminPanelOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-700"
                >
                  <ShieldAlert size={14} />
                  Admin
                </button>
              ) : null}
              <div className="inline-flex flex-wrap gap-1 rounded border border-ink-200 bg-ink-50 p-0.5">
                {FEED_FILTERS.map((filter) => {
                  const isHot = filter.id === 'hot';
                  const active = activeFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setActiveFilter(filter.id)}
                      className={cx(
                        'inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition',
                        active && isHot && 'bg-orange-500 text-white',
                        active && !isHot && 'bg-ink-900 text-white',
                        !active && 'text-ink-500 hover:text-ink-900'
                      )}
                    >
                      {isHot ? <Flame size={12} /> : null}
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 max-h-[100px] space-y-1 overflow-y-auto pr-1">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={cx(
                    'mr-1 inline-block rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition',
                    activeTag === tag ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-transparent bg-ink-100 text-ink-600 hover:border-ink-200'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-ink-200 p-3">
            <CommunityTopTenSidebar posts={trendingFeedPosts} tags={tags} onPickTrend={handlePickTrend} />
          </div>

        </aside>

      <main
        className="order-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bg-canvas)] lg:order-2"
      >
          <div className="shrink-0 border-b border-ink-200/80 px-1 pb-0 pt-1 sm:px-2 sm:pt-2">
            <PageHeadPremium
              icon={MessageCircle}
              badge={
                <PageHeadPremiumBadge icon={Sparkles}>
                  {communitySchemaReady ? 'Discussões · nuvem' : 'Discussões · local'}
                </PageHeadPremiumBadge>
              }
              title="Comunidade"
              subtitle={
                <span>
                  Conectado como <span className="font-semibold text-ink-200">{displayName}</span>
                </span>
              }
              className="!rounded-2xl lg:!flex-row lg:!items-center lg:!justify-between"
              leadingClassName="items-center lg:max-w-[52rem]"
            />
          </div>
          <div className="shrink-0 space-y-2 border-b border-ink-200 bg-white px-2 py-2 lg:hidden">
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Buscar…"
                className="h-10 w-full rounded-full border border-ink-200 bg-ink-50 py-2 pl-10 pr-3 text-sm text-ink-700 outline-none placeholder:text-ink-400 focus:border-blue-400"
              />
            </div>
            <button type="button" className="btn-secondary w-full rounded-full" onClick={openComposerModal}>
              Perguntar
            </button>
            <div className="flex flex-wrap gap-1">
              {FEED_FILTERS.map((filter) => {
                const isHot = filter.id === 'hot';
                const active = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={cx(
                      'inline-flex items-center gap-1 rounded border border-ink-200 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide',
                      active && isHot && 'border-orange-500 bg-orange-500 text-white',
                      active && !isHot && 'border-ink-900 bg-ink-900 text-white',
                      !active && 'bg-white text-ink-500'
                    )}
                  >
                    {isHot ? <Flame size={12} /> : null}
                    {filter.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={cx(
                    'shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide',
                    activeTag === tag ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-ink-200 text-ink-500'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="hidden shrink-0 border-b border-ink-200 bg-white px-4 py-3 lg:block">
              <div className="mx-auto flex w-full max-w-[980px] items-center gap-3">
                <div className="relative min-w-0 flex-1">
                  <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Encontre de tudo"
                    className="h-12 w-full rounded-full border border-ink-200 bg-ink-50 py-2 pl-11 pr-4 text-[15px] font-medium text-ink-700 outline-none placeholder:text-ink-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <button type="button" className="btn-secondary h-12 rounded-full px-6" onClick={openComposerModal}>
                  Perguntar
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-4 sm:px-2">
              <div className="mb-3 xl:hidden">
                <div className="rounded border border-ink-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">Top 10 (mobile)</p>
                    <Flame size={16} className="text-blue-700" />
                  </div>
                  <ul className="mt-2 divide-y divide-ink-100">
                    {trendingFeedPosts.map((tp, idx) => (
                      <li key={tp.id}>
                        <button
                          type="button"
                          onClick={() => handlePickTrend({ type: 'post', post: tp, tags })}
                          className="flex w-full items-start gap-2 py-2 text-left transition hover:bg-ink-50"
                        >
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-ink-100 text-[11px] font-bold text-ink-700">
                            {idx + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-xs font-semibold text-ink-800">{tp.title}</span>
                            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
                              #{tp.category} · {Math.round(hotEngagementScore(tp))} pts
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

          <section className="grid gap-4">
            {activeTag !== 'Todos' ? (
              <div className="flex flex-wrap items-center gap-2 rounded border border-ink-200 bg-white px-3 py-2 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTag('Todos');
                    setSearchValue('');
                  }}
                  className="font-semibold text-blue-700 underline-offset-2 transition hover:underline"
                >
                  Todas as salas
                </button>
                <ChevronRight size={14} className="shrink-0 text-ink-400" aria-hidden />
                <span className="font-bold tracking-tight text-ink-800">{activeTag}</span>
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              {filteredPosts.map((post) => (
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
              ))}
              {!filteredPosts.length ? (
                <div className="rounded border border-dashed border-ink-300 bg-white p-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
                    <Sparkles size={22} />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-ink-800">Nada encontrado por aqui</h3>
                  <p className="mt-2 text-sm leading-7 text-ink-500">Experimente outra tag, limpe a busca ou volte a Todas as salas.</p>
                </div>
              ) : null}
            </div>
          </section>
            </div>
          </div>

        {isComposerOpen ? (
          <div className="fixed inset-0 z-[185] flex items-end justify-center bg-ink-950/55 p-4 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-2xl rounded-[26px] border border-ink-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">Novo tópico</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink-900">Perguntar na comunidade</h2>
                </div>
                <button
                  type="button"
                  onClick={closeComposerModal}
                  disabled={composerSubmitting}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 transition hover:bg-ink-50"
                  aria-label="Fechar modal"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4 px-5 py-5 sm:px-6">
                {composerError ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{composerError}</p>
                ) : null}
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="Título da pergunta"
                  disabled={composerSubmitting}
                  className="w-full rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm font-semibold text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                <textarea
                  rows={6}
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  placeholder="Descreva seu contexto para a comunidade ajudar melhor."
                  disabled={composerSubmitting}
                  className="w-full resize-none rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm leading-7 text-ink-700 outline-none transition placeholder:text-ink-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <select
                    value={draftCategory}
                    onChange={(event) => setDraftCategory(event.target.value)}
                    disabled={composerSubmitting}
                    className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-600"
                  >
                    {categories.map((category) => (
                      <option key={category.slug} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button type="button" onClick={closeComposerModal} className="btn-secondary" disabled={composerSubmitting}>
                      Cancelar
                    </button>
                    <button type="button" onClick={handlePublishPost} className="btn-primary disabled:cursor-not-allowed disabled:opacity-70" disabled={composerSubmitting}>
                      <Send size={15} />
                      {composerSubmitting ? 'Publicando...' : 'Publicar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <AppToast message={composerToast} variant="success" />

        {adminPanelOpen ? (
          <div
            className="fixed inset-0 z-[180] flex items-end justify-center bg-ink-900/50 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-admin-title"
          >
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-ink-200 bg-white shadow-2xl">
              <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-ink-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-600">Administração</p>
                  <h2 id="community-admin-title" className="text-lg font-semibold text-ink-900">
                    Salas do fórum
                  </h2>
                  <p className="mt-1 text-xs font-medium text-ink-500">Renomeie, crie ou desative salas. Moderação de tópicos fica nos cards (fixar, ocultar, censurar, excluir).</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminPanelOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50"
                  aria-label="Fechar painel admin"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4 px-5 py-5 sm:px-6">
                {adminNotice ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{adminNotice}</p> : null}
                {adminPanelLoading ? (
                  <p className="text-sm font-medium text-ink-500">Carregando salas…</p>
                ) : null}
                {adminCategoriesDraft.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-ink-200 bg-ink-50/50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">slug · {row.slug}</p>
                    <label className="mt-2 block text-xs font-semibold text-ink-600" htmlFor={`room-name-${row.id}`}>
                      Nome exibido
                    </label>
                    <input
                      id={`room-name-${row.id}`}
                      value={row.name}
                      onChange={(e) =>
                        setAdminCategoriesDraft((prev) => prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))
                      }
                      className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <label className="mt-3 block text-xs font-semibold text-ink-600" htmlFor={`room-desc-${row.id}`}>
                      Descrição
                    </label>
                    <textarea
                      id={`room-desc-${row.id}`}
                      rows={2}
                      value={row.description}
                      onChange={(e) =>
                        setAdminCategoriesDraft((prev) => prev.map((r) => (r.id === row.id ? { ...r, description: e.target.value } : r)))
                      }
                      className="mt-1 w-full resize-none rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={adminBusyId === String(row.id)}
                        onClick={() => handleSaveAdminCategoryRow(row)}
                        className="rounded-full bg-ink-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-ink-950 disabled:opacity-50"
                      >
                        Salvar sala
                      </button>
                      <button
                        type="button"
                        disabled={adminBusyId === String(row.id) || row.is_active === false}
                        onClick={() => handleDeactivateAdminCategory(row)}
                        className="rounded-full border border-rose-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        Desativar
                      </button>
                    </div>
                  </div>
                ))}
                <div className="rounded-2xl border border-dashed border-ink-300 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">Nova sala</p>
                  <input
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Nome da nova sala"
                    className="mt-2 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm font-semibold text-ink-800 outline-none focus:border-blue-400"
                  />
                  <textarea
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                    placeholder="Descrição curta (opcional)"
                    rows={2}
                    className="mt-2 w-full resize-none rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-700 outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    disabled={adminBusyId === 'new-room'}
                    onClick={handleCreateAdminRoom}
                    className="mt-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-md transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                  >
                    Criar sala
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      </div>
    </div>
  );
}
