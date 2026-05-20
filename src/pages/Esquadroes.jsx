import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Camera,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  Crown,
  Filter,
  Link2,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Star,
  Target,
  ThumbsUp,
  Trophy,
  UserPlus,
  Users,
  Wrench,
  X,
  Pin,
  Clock3,
  CheckCircle2,
  Flame,
  Eye,
  Bookmark,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { shapeSquadFromCommunityPost, splitSquadForCommunityPostUpdate } from '../lib/squadRemote';

const EMPTY_FORM = {
  name: '',
  focus: '',
  coverUrl: '',
  description: '',
  inviteCode: '',
  visibility: 'Privado',
};

const DEFAULT_SQUAD_PERMISSIONS = {
  manageTeachers: true,
  approveMembers: true,
  publishSimulados: true,
  publishActivities: true,
  pinNotices: true,
};

const EMPTY_ADMIN_FLOW = {
  type: '',
  title: '',
  description: '',
  helper: '',
  status: 'Aberta',
  date: '',
  time: '',
  dueDate: '',
  dueTime: '',
  subject: '',
  memberId: '',
  teacherName: '',
  teacherSubject: '',
  inviteName: '',
  permissionScope: 'Professor',
  attachmentName: '',
  attachmentUrl: '',
};

const PERMISSION_SCOPE_OPTIONS = [
  'Professor',
  'Membro',
  'Gerir professores',
  'Aprovar membros',
  'Publicar simulados',
  'Publicar atividades',
  'Fixar mural',
];

function dedupeById(list = []) {
  const seen = new Set();
  return list.filter((item) => {
    const id = String(item?.id || '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function buildDefaultRoster(squad) {
  const ownerName = String(squad?.owner || 'Professor responsável').trim();
  const teachers = Array.isArray(squad?.teachers) ? squad.teachers : [];
  const teacherNames = new Set(teachers.map((teacher) => String(teacher?.name || '').trim()).filter(Boolean));

  return dedupeById([
    {
      id: `owner-${squad?.id || 'squad'}`,
      name: ownerName,
      role: teacherNames.has(ownerName) ? 'Professor' : 'Dono do cursinho',
      tag: 'Gestão total',
      avatar: teachers[0]?.avatar || '',
      subject: teachers[0]?.subject || 'Coordenação geral',
    },
    ...teachers.map((teacher, index) => ({
      id: `teacher-member-${teacher.id || index}`,
      name: teacher.name,
      role: index === 0 ? 'Professor principal' : 'Professor',
      tag: 'Publica conteúdo',
      avatar: teacher.avatar || '',
      subject: teacher.subject || 'Professor do esquadrão',
      teacherId: teacher.id || `teacher-${index}`,
    })),
  ]);
}

function normalizeSquad(squad) {
  if (!squad || typeof squad !== 'object') return null;

  const ownerName = String(squad.owner || 'Professor responsável').trim();
  const teachers =
    Array.isArray(squad.teachers) && squad.teachers.length
      ? squad.teachers.map((teacher, index) => ({
          id: teacher.id || `teacher-${squad.id || 'squad'}-${index}`,
          name: String(teacher.name || ownerName).trim(),
          subject: String(teacher.subject || 'Coordenação geral').trim(),
          avatar: String(teacher.avatar || '').trim(),
          bio: String(teacher.bio || '').trim(),
        }))
      : [];

  const rosterSource = Array.isArray(squad.roster) && squad.roster.length ? squad.roster : buildDefaultRoster({ ...squad, teachers });
  const roster = dedupeById(
    rosterSource.map((member, index) => ({
      id: member.id || `member-${squad.id || 'squad'}-${index}`,
      name: String(member.name || ownerName).trim(),
      role: String(member.role || 'Aluno').trim(),
      tag: String(member.tag || (String(member.role || '').toLowerCase().includes('professor') ? 'Publica conteúdo' : 'Membro ativo')).trim(),
      avatar: String(member.avatar || '').trim(),
      subject: String(member.subject || '').trim(),
      teacherId: member.teacherId || '',
      email: String(member.email || '').trim(),
      joinedAt: String(member.joinedAt || '').trim(),
      streakDays: member.streakDays != null ? Number(member.streakDays) : null,
    }))
  );

  const subjects = Array.from(
    new Set(
      [
        ...(Array.isArray(squad.subjects) ? squad.subjects : []),
        ...teachers.map((teacher) => teacher.subject),
      ]
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );

  return {
    ...squad,
    id: String(squad.id || `squad-${Date.now()}`),
    name: String(squad.name || 'Esquadrão').trim(),
    owner: ownerName,
    focus: String(squad.focus || 'Turma personalizada').trim(),
    description: String(squad.description || 'Ambiente privado para acompanhamento do esquadrão.').trim(),
    inviteCode: String(squad.inviteCode || '').trim(),
    visibility: String(squad.visibility || 'Privado').trim(),
    rankingTier: String(squad.rankingTier || 'Bronze').trim(),
    coverUrl: String(squad.coverUrl || '').trim(),
    nextEvent: String(squad.nextEvent || 'Sem marco definido').trim(),
    teachers,
    roster,
    subjects,
    members: Math.max(1, roster.length),
    notices: Array.isArray(squad.notices) ? squad.notices : [],
    activities: Array.isArray(squad.activities) ? squad.activities : [],
    simulados: Array.isArray(squad.simulados) ? squad.simulados : [],
    internalRanking: Array.isArray(squad.internalRanking) ? squad.internalRanking : [],
    questionPosts: Array.isArray(squad.questionPosts) ? squad.questionPosts : [],
    permissions: {
      ...DEFAULT_SQUAD_PERMISSIONS,
      ...(squad.permissions && typeof squad.permissions === 'object' ? squad.permissions : {}),
    },
  };
}

function mapCommunityPostToSquad(post = {}) {
  return normalizeSquad(shapeSquadFromCommunityPost(post));
}

function getInternalSections(hasSelectedSquad, canAccessSettings) {
  const base = [
    { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
    { id: 'forum', label: 'Fórum', icon: MessageCircle },
    { id: 'mural', label: 'Mural', icon: Megaphone },
    { id: 'cronograma', label: 'Cronograma', icon: CalendarDays },
    { id: 'atividades', label: 'Atividades', icon: ClipboardList },
    { id: 'simulados', label: 'Simulados', icon: Trophy },
    { id: 'ranking', label: 'Ranking', icon: Crown },
  ];

  if (hasSelectedSquad && canAccessSettings) {
    base.push({ id: 'configuracoes', label: 'Configurações', icon: Settings });
  }

  return base;
}

export default function Esquadroes({
  profile = {},
  currentUserId = '',
  currentUsername = '',
  currentUserEmail = '',
  squadSummary = { memberships: [] },
  communityState = {},
  onSaveCommunityState,
  isElite = false,
  selectedSquadId = '',
  onSelectSquad,
  contestLibrary = [],
  cursos = [],
}) {
  const [showCreateSquad, setShowCreateSquad] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showSquadSwitcher, setShowSquadSwitcher] = useState(false);
  const [squadNavTarget, setSquadNavTarget] = useState({ type: '', id: '' });
  const [inviteCopied, setInviteCopied] = useState(false);
  const [forumQuery, setForumQuery] = useState('');
  const [forumFilter, setForumFilter] = useState('todos');
  const [forumSort, setForumSort] = useState('recentes');
  const [forumPage, setForumPage] = useState(1);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [newForumPost, setNewForumPost] = useState('');
  const [adminFlow, setAdminFlow] = useState(EMPTY_ADMIN_FLOW);
  const [adminEdit, setAdminEdit] = useState({
    name: '',
    focus: '',
    description: '',
    inviteCode: '',
    visibility: 'Privado',
  });
  const [remoteSquads, setRemoteSquads] = useState([]);
  const forumComposerRef = useRef(null);
  const squadSwitcherWrapRef = useRef(null);

  const displayName = useMemo(() => {
    if (String(profile?.nome || '').trim()) return String(profile.nome).trim();
    if (String(currentUsername || '').trim()) return currentUsername;
    return String(currentUserEmail || 'aluno').split('@')[0];
  }, [currentUsername, currentUserEmail, profile]);

  const profileAvatarUrl = useMemo(() => String(profile?.avatar_url || '').trim(), [profile]);

  const focusOptions = useMemo(
    () =>
      [...new Set([...contestLibrary, ...cursos].map((item) => item?.plano || item?.nome).filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b), 'pt-BR')
      ),
    [contestLibrary, cursos]
  );

  const squads = useMemo(() => {
    const source = Array.isArray(communityState?.squads) ? communityState.squads : [];
    return source.map(normalizeSquad).filter(Boolean);
  }, [communityState]);
  const usingRemoteSquads = Boolean(currentUserId);
  const memberships = useMemo(
    () => (Array.isArray(squadSummary?.memberships) ? squadSummary.memberships : []),
    [squadSummary]
  );
  useEffect(() => {
    let cancelled = false;

    async function loadRemoteSquads() {
      if (!currentUserId) {
        setRemoteSquads([]);
        return;
      }

      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('community_scope', 'Esquadrão')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar esquadrões:', error);
        if (!cancelled) setRemoteSquads([]);
        return;
      }

      if (!cancelled) {
        setRemoteSquads((Array.isArray(data) ? data : []).map(mapCommunityPostToSquad).filter(Boolean));
      }
    }

    loadRemoteSquads();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);
  const accessibleSquads = useMemo(() => {
    const membershipIds = new Set(memberships.map((item) => String(item.id)));
    const displayLower = String(displayName || '').trim().toLowerCase();

    if (usingRemoteSquads) {
      const overlaid = remoteSquads.map((remote) => {
        const local = squads.find((s) => String(s.id) === String(remote.id));
        return local ? normalizeSquad({ ...remote, ...local }) : normalizeSquad(remote);
      });
      const remoteIds = new Set(overlaid.map((s) => String(s.id)));
      const extras = squads
        .filter(
          (s) =>
            !remoteIds.has(String(s.id)) &&
            (membershipIds.has(String(s.id)) || String(s.owner || '').trim().toLowerCase() === displayLower)
        )
        .map(normalizeSquad)
        .filter(Boolean);
      const merged = dedupeById([...overlaid, ...extras]);
      if (merged.length) return merged;
      return [];
    }

    const mine = squads.filter(
      (item) =>
        membershipIds.has(String(item.id)) ||
        String(item.owner || '').trim().toLowerCase() === displayLower
    );
    if (mine.length) return mine.map(normalizeSquad).filter(Boolean);
    return [];
  }, [displayName, memberships, profileAvatarUrl, remoteSquads, squads, usingRemoteSquads]);

  const selectedSquad =
    accessibleSquads.find((item) => item.id === selectedSquadId) ||
    accessibleSquads[0] ||
    null;

  useEffect(() => {
    if (!selectedSquad) return;
    setAdminEdit({
      name: String(selectedSquad.name || '').trim(),
      focus: String(selectedSquad.focus || '').trim(),
      description: String(selectedSquad.description || '').trim(),
      inviteCode: String(selectedSquad.inviteCode || '').trim(),
      visibility: String(selectedSquad.visibility || 'Privado').trim(),
    });
  }, [selectedSquad?.id, selectedSquad?.name, selectedSquad?.focus, selectedSquad?.description, selectedSquad?.inviteCode, selectedSquad?.visibility]);

  const { canAccessSettings, canManageSquad } = useMemo(() => {
    if (!selectedSquad) {
      return { canAccessSettings: false, canManageSquad: false };
    }
    const row = memberships.find((item) => String(item.id) === String(selectedSquad.id));
    const roleRaw = String(row?.role || '').trim();
    const r = roleRaw.toLowerCase();
    const displayLower = String(displayName || '').trim().toLowerCase();
    const ownerLower = String(selectedSquad.owner || '').trim().toLowerCase();
    const isSquadOwnerByName = Boolean(ownerLower && ownerLower === displayLower);
    const ownerRoleMatch =
      roleRaw === 'Dono' || roleRaw === 'Owner' || r === 'dono' || r === 'owner';
    const coordinatorRoleMatch =
      roleRaw === 'Coordenador' ||
      r === 'coordenador' ||
      r === 'coordenação' ||
      r === 'coordenacao';
    const isProfessor = roleRaw === 'Professor' || r === 'professor';
    const canAccessSettings = Boolean(isSquadOwnerByName || ownerRoleMatch || coordinatorRoleMatch);
    const canManageSquad = Boolean(canAccessSettings || isProfessor);
    return { canAccessSettings, canManageSquad };
  }, [selectedSquad, memberships, displayName]);
  const squadPermissions = selectedSquad?.permissions || DEFAULT_SQUAD_PERMISSIONS;
  const canPublishActivities = canManageSquad && squadPermissions.publishActivities !== false;
  const canPublishSimulados = canManageSquad && squadPermissions.publishSimulados !== false;
  const canPinNotices = canManageSquad && squadPermissions.pinNotices !== false;
  const canManageTeachers = canManageSquad && squadPermissions.manageTeachers !== false;
  const roleHierarchyDetail = [
    {
      role: 'Dono do curso',
      summary: 'Responsável pelo contrato do esquadrão, branding da turma e governança.',
      can: [
        'Editar dados do esquadrão, código de convite e visibilidade.',
        'Distribuir ou revogar selo de professor e definir matéria de cada um.',
        'Moderar fórum (fixar, ocultar, apagar) e publicar no mural.',
        'Convidar alunos, aprovar entrada e acessar ADM completo.',
      ],
    },
    {
      role: 'Professor (selo Papirando)',
      summary: 'Docente oficial do cursinho dentro do esquadrão.',
      can: [
        'Publicar avisos no mural, atividades com prazo e simulados internos.',
        'Responder e orientar threads prioritárias no fórum da turma.',
        'Sugerir listas no banco interno de questões (conforme permissão do dono).',
      ],
    },
    {
      role: 'Monitor',
      summary: 'Apoio operacional e acompanhamento de alunos.',
      can: [
        'Ajudar em dúvidas recorrentes e organização de materiais.',
        'Registrar presença em plantões e repassar alertas ao dono.',
        'Sem poderes financeiros nem exclusão do esquadrão (configurável).',
      ],
    },
    {
      role: 'Aluno',
      summary: 'Membro da turma com acesso ao conteúdo privado.',
      can: [
        'Participar do fórum interno, responder listas e simulados.',
        'Ver mural, cronograma e ranking da própria turma.',
        'Não publica no mural nem cria simulados oficiais.',
      ],
    },
  ];
  const squadAccessFlow = [
    '1. Aluno entra por codigo de convite ou aprovacao manual do curso.',
    '2. Plataforma vincula o usuario ao esquadrao especifico (isolamento interno).',
    '3. Dashboard do aluno abre diretamente no esquadrao da turma.',
    '4. Conteudos e forum sao privados e visiveis so para membros autorizados.',
  ];
  const displayNotices = Array.isArray(selectedSquad?.notices) ? selectedSquad.notices : [];
  const displayActivities = Array.isArray(selectedSquad?.activities) ? selectedSquad.activities : [];
  const displaySimulados = Array.isArray(selectedSquad?.simulados) ? selectedSquad.simulados : [];
  const displayRanking = Array.isArray(selectedSquad?.internalRanking) ? selectedSquad.internalRanking : [];
  const questionPosts = Array.isArray(selectedSquad?.questionPosts) ? selectedSquad.questionPosts : [];

  const cronogramaCards = useMemo(() => {
    const acts = (displayActivities || []).map((item) => ({
      id: `activity-${item.id}`,
      title: item.title,
      label: 'Atividade',
      when: item.dueDate ? `${item.dueDate}${item.dueTime ? ` · ${item.dueTime}` : ''}` : 'Sem prazo',
      details: item.helper || 'Atividade interna da turma.',
      publishedBy: item.publishedBy || '',
      publishedByAvatar: item.publishedByAvatar || '',
      publishedAtLabel: item.publishedAtLabel || '',
      navType: 'activity',
      navId: item.id,
    }));
    const sims = (displaySimulados || []).map((item) => ({
      id: `simulado-${item.id}`,
      title: item.title,
      label: 'Simulado',
      when: item.dateLabel || item.date || 'Data a definir',
      details: item.helper || 'Simulado interno programado.',
      publishedBy: item.publishedBy || '',
      publishedByAvatar: item.publishedByAvatar || '',
      publishedAtLabel: item.publishedAtLabel || '',
      navType: 'simulado',
      navId: item.id,
    }));
    return [...acts, ...sims].slice(0, 14);
  }, [displayActivities, displaySimulados]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setForumPage(1);
      setForumQuery('');
      setExpandedReplies({});
      setNewForumPost('');
      setAdminFlow(EMPTY_ADMIN_FLOW);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedSquad?.id]);

  const internalSections = useMemo(
    () => getInternalSections(Boolean(selectedSquad), canAccessSettings),
    [selectedSquad, canAccessSettings]
  );

  useEffect(() => {
    if (activeSection === 'configuracoes' && selectedSquad && !canAccessSettings) {
      setActiveSection('dashboard');
    }
  }, [activeSection, selectedSquad, canAccessSettings]);

  useEffect(() => {
    if (!accessibleSquads.length) return;
    if (selectedSquadId && accessibleSquads.some((item) => item.id === selectedSquadId)) return;
    onSelectSquad?.(accessibleSquads[0]?.id || '');
  }, [accessibleSquads, onSelectSquad, selectedSquadId]);

  useEffect(() => {
    if (!showSquadSwitcher) return;
    function handlePointerDown(e) {
      if (squadSwitcherWrapRef.current && !squadSwitcherWrapRef.current.contains(e.target)) {
        setShowSquadSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showSquadSwitcher]);

  useEffect(() => {
    if (!squadNavTarget?.id || !squadNavTarget?.type) return;
    const idMap = {
      activity: `squad-activity-${squadNavTarget.id}`,
      simulado: `squad-simulado-${squadNavTarget.id}`,
      questao: `squad-questao-${squadNavTarget.id}`,
    };
    const elId = idMap[squadNavTarget.type];
    if (!elId) return;
    const t = window.setTimeout(() => {
      document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => window.clearTimeout(t);
  }, [squadNavTarget, activeSection]);

  if (accessibleSquads.length === 0) {
    return (
      <div className="pl-paper-bg" style={{ padding: 24 }}>
        <div className="pl-card" style={{ minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-slate-900">
            <ShieldCheck size={26} />
          </div>
          <h3 className="text-2xl font-semibold text-slate-900">Nenhum esquadrão disponível ainda.</h3>
          {isElite ? (
            <button
              type="button"
              onClick={() => setShowCreateSquad(true)}
              className="mt-5 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white shadow-md transition hover:bg-slate-950"
            >
              Criar esquadrão
            </button>
          ) : null}
        </div>
        {showCreateSquad && isElite ? (
          <CreateSquadModal
            form={createForm}
            onChange={setCreateForm}
            onClose={closeCreateSquad}
            onSubmit={handleCreateSquad}
            focusOptions={focusOptions}
          />
        ) : null}
      </div>
    );
  }

  const forumPosts = (() => {
    if (!selectedSquad) return [];
    const savedPosts = (Array.isArray(communityState?.forumPosts) ? communityState.forumPosts : []).filter(
      (item) => item.squadId === selectedSquad.id
    );
    return savedPosts;
  })();
  const scopedForumPosts = (Array.isArray(forumPosts) ? forumPosts : []).map((post) => ({
    ...post,
    squadId: post.squadId || selectedSquad?.id || '',
    hidden: Boolean(post.hidden),
  }));

  const filteredForumPosts = (() => {
    const q = String(forumQuery || '').trim().toLowerCase();

    let result = [...scopedForumPosts];
    if (!canManageSquad) {
      result = result.filter((post) => !post.hidden);
    }

    if (forumFilter !== 'todos') {
      result = result.filter((post) => {
        if (forumFilter === 'fixados') return post.pinned;
        if (forumFilter === 'duvidas') return String(post.category || '').toLowerCase().includes('dúvida') || String(post.category || '').toLowerCase().includes('duvida');
        if (forumFilter === 'avisos') return String(post.category || '').toLowerCase() === 'aviso';
        if (forumFilter === 'resumos') return String(post.category || '').toLowerCase() === 'resumo';
        if (forumFilter === 'resolvidos') return Boolean(post.solved);
        return true;
      });
    }

    if (q) {
      result = result.filter((post) =>
        [post.title, post.message, post.author, post.subject, post.category]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (forumSort === 'fixados') {
        if (a.pinned === b.pinned) return b.helpful - a.helpful;
        return a.pinned ? -1 : 1;
      }

      if (forumSort === 'populares') {
        return b.helpful - a.helpful;
      }

      if (forumSort === 'comentadas') {
        return b.replies - a.replies;
      }

      return Number(b.id?.split('-')?.[1] || 0) - Number(a.id?.split('-')?.[1] || 0);
    });

    return result;
  })();

  const pinnedPost = filteredForumPosts.find((post) => post.pinned) || filteredForumPosts[0] || null;

  const latestPosts = filteredForumPosts.filter((post) => post.id !== pinnedPost?.id).slice(0, 3);

  const forumPageSize = 4;
  const totalForumPages = Math.max(1, Math.ceil(filteredForumPosts.length / forumPageSize));
  const paginatedForumPosts = (() => {
    const start = (forumPage - 1) * forumPageSize;
    return filteredForumPosts.slice(start, start + forumPageSize);
  })();

  const adminMembers = (() => {
    if (!selectedSquad) return [];
    if (Array.isArray(selectedSquad.roster) && selectedSquad.roster.length) {
      return selectedSquad.roster;
    }
    return [
      {
        id: 'm1',
        name: selectedSquad.owner,
        role: 'Dono do cursinho',
        tag: 'Gestão total',
        avatar: selectedSquad.teachers?.[0]?.avatar || '',
      },
      ...(selectedSquad.teachers || []).map((teacher, index) => ({
        id: `tm-${teacher.id}`,
        name: teacher.name,
        role: index === 0 ? 'Professor principal' : 'Professor',
        tag: 'Publica conteúdo',
        avatar: teacher.avatar || '',
      })),
    ];
  })();

  function closeCreateSquad() {
    setShowCreateSquad(false);
    setCreateForm(EMPTY_FORM);
  }

  async function handleCreateSquad() {
    if (!isElite) return;
    if (!String(createForm.name || '').trim()) return;
    if (accessibleSquads.length >= 3) {
      alert('Cada usuário pode participar de até 3 esquadrões.');
      return;
    }

    if (usingRemoteSquads) {
      const inviteCode =
        String(createForm.inviteCode || '').trim() || `ESQ${String(Date.now()).slice(-6)}`;
      const draft = normalizeSquad({
        id: 'pending-local',
        name: String(createForm.name || '').trim(),
        owner: displayName,
        roleLabel: 'Professor',
        focus: String(createForm.focus || '').trim() || 'Turma personalizada',
        description:
          String(createForm.description || '').trim() || 'Ambiente privado para acompanhamento da equipe.',
        inviteCode,
        visibility: createForm.visibility || 'Privado',
        members: 1,
        rankingTier: 'Bronze',
        coverUrl: String(createForm.coverUrl || '').trim(),
        nextEvent: 'Primeira atividade pendente',
        teachers: [
          {
            id: `teacher-pending-${Date.now()}`,
            name: displayName,
            subject: 'Coordenação geral',
            avatar: profileAvatarUrl,
          },
        ],
        subjects: ['Definir trilha da turma'],
        notices: [],
        activities: [],
        simulados: [],
        internalRanking: [],
        questionPosts: [],
        permissions: { ...DEFAULT_SQUAD_PERMISSIONS },
        roster: [
          {
            id: `roster-pending-${Date.now()}`,
            name: displayName,
            role: 'Professor',
            tag: 'Dono do cursinho',
            avatar: profileAvatarUrl,
          },
        ],
      });
      const split = splitSquadForCommunityPostUpdate(draft);
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: currentUserId,
          author_name: split.author_name,
          title: split.title,
          content: split.content,
          category_slug: 'esquadrao',
          category_name: split.category_name,
          community_scope: 'Esquadrão',
          is_public: split.is_public,
          squad_payload: split.squad_payload,
        })
        .select('*')
        .single();

      if (error) {
        alert(error.message || 'Não foi possível criar o esquadrão.');
        return;
      }

      const nextSquad = mapCommunityPostToSquad(data);
      setRemoteSquads((prev) => [nextSquad, ...prev.filter((item) => item.id !== nextSquad.id)]);
      onSaveCommunityState?.((prev) => {
        const list = Array.isArray(prev.squads) ? [...prev.squads] : [];
        const filtered = list.filter((item) => String(item.id) !== String(nextSquad.id));
        return {
          ...prev,
          squads: [nextSquad, ...filtered],
          memberships: [
            { id: nextSquad.id, name: nextSquad.name, role: 'Professor' },
            ...(Array.isArray(prev.memberships) ? prev.memberships.filter((m) => String(m.id) !== String(nextSquad.id)) : []),
          ],
        };
      });
      onSelectSquad?.(nextSquad.id);
      setActiveSection('dashboard');
      closeCreateSquad();
      return;
    }

    const id = `squad-${Date.now()}`;
    const nextSquad = {
      id,
      name: String(createForm.name || '').trim(),
      owner: displayName,
      roleLabel: 'Professor',
      focus: String(createForm.focus || '').trim() || 'Turma personalizada',
      description: String(createForm.description || '').trim() || 'Ambiente privado para acompanhamento da equipe.',
      inviteCode: String(createForm.inviteCode || '').trim() || `ESQ${String(Date.now()).slice(-4)}`,
      visibility: createForm.visibility || 'Privado',
      members: 1,
      rankingTier: 'Bronze',
      coverUrl: String(createForm.coverUrl || '').trim(),
      nextEvent: 'Primeira atividade pendente',
      teachers: [
        {
          id: `teacher-${id}`,
          name: displayName,
          subject: 'Coordenação geral',
          avatar: profileAvatarUrl,
        },
      ],
      subjects: ['Definir trilha da turma'],
      notices: [],
      activities: [],
      simulados: [],
      internalRanking: [],
      permissions: { ...DEFAULT_SQUAD_PERMISSIONS },
      roster: [
        {
          id: `roster-${id}-owner`,
          name: displayName,
          role: 'Professor',
          tag: 'Dono do cursinho',
          avatar: profileAvatarUrl,
        },
      ],
    };

    onSaveCommunityState?.((prev) => ({
      ...prev,
      squads: [nextSquad, ...squads.filter((item) => item.id !== id)],
      memberships: [{ id, name: nextSquad.name, role: 'Professor' }, ...(Array.isArray(prev?.memberships) ? prev.memberships : [])],
    }));

    onSelectSquad?.(id);
    setActiveSection('dashboard');
    closeCreateSquad();
  }

  function handleDeleteSquad() {
    if (!selectedSquad) return;

    if (usingRemoteSquads) {
      const sid = selectedSquad.id;
      setRemoteSquads((prev) => prev.filter((item) => String(item.id) !== String(sid)));
      supabase.from('community_posts').delete().eq('id', sid).catch(console.warn);
      onSaveCommunityState?.((prev) => ({
        ...prev,
        squads: (Array.isArray(prev.squads) ? prev.squads : []).filter((item) => String(item.id) !== String(sid)),
        memberships: (Array.isArray(prev.memberships) ? prev.memberships : []).filter((item) => String(item.id) !== String(sid)),
        forumPosts: (Array.isArray(prev.forumPosts) ? prev.forumPosts : []).filter((item) => String(item.squadId) !== String(sid)),
      }));
      onSelectSquad?.(accessibleSquads.filter((item) => String(item.id) !== String(sid))[0]?.id || '');
      setShowDeleteConfirm(false);
      setActiveSection('dashboard');
      return;
    }

    const remainingSquads = accessibleSquads.filter((item) => item.id !== selectedSquad.id);
    onSaveCommunityState?.((prev) => ({
      ...prev,
      squads: squads.filter((item) => item.id !== selectedSquad.id),
      memberships: (Array.isArray(prev?.memberships) ? prev.memberships : []).filter((item) => item.id !== selectedSquad.id),
      forumPosts: (Array.isArray(prev?.forumPosts) ? prev.forumPosts : []).filter((item) => item.squadId !== selectedSquad.id),
    }));
    onSelectSquad?.(remainingSquads[0]?.id || '');
    setShowDeleteConfirm(false);
    setActiveSection('dashboard');
  }

  function handleSelectSquad(id) {
    onSelectSquad?.(id);
    setActiveSection('dashboard');
    setForumPage(1);
    setForumQuery('');
  }

  function focusForumComposer() {
    setActiveSection('forum');
    window.setTimeout(() => {
      forumComposerRef.current?.focus();
      forumComposerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 20);
  }

  function toggleReplies(postId) {
    setExpandedReplies((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }

  function updateSelectedSquad(mutator) {
    if (!selectedSquad) return;
    const next = normalizeSquad(mutator(selectedSquad));
    if (!next) return;

    onSaveCommunityState?.((prev) => {
      const list = Array.isArray(prev.squads) ? [...prev.squads] : [];
      const idx = list.findIndex((item) => String(item.id) === String(next.id));
      if (idx >= 0) list[idx] = { ...list[idx], ...next };
      else list.unshift(next);
      return { ...prev, squads: list };
    });

    if (usingRemoteSquads) {
      setRemoteSquads((prev) => prev.map((item) => (String(item.id) === String(next.id) ? next : item)));
      const row = splitSquadForCommunityPostUpdate(next);
      supabase
        .from('community_posts')
        .update({
          title: row.title,
          author_name: row.author_name,
          category_name: row.category_name,
          content: row.content,
          is_public: row.is_public,
          squad_payload: row.squad_payload,
        })
        .eq('id', next.id)
        .then(({ error }) => {
          if (error) console.warn('[esquadroes] Persistência Supabase:', error.message || error);
        });
    }
  }

  function handleSaveSquadSettings() {
    if (!selectedSquad || !canAccessSettings) return;
    updateSelectedSquad((item) => ({
      ...item,
      name: String(adminEdit.name || item.name).trim() || item.name,
      focus: String(adminEdit.focus || item.focus).trim() || item.focus,
      description: String(adminEdit.description || item.description).trim() || item.description,
      inviteCode: String(adminEdit.inviteCode || item.inviteCode).trim(),
      visibility: String(adminEdit.visibility || item.visibility || 'Privado').trim(),
    }));
  }

  function handleModerateForumPost(postId, action) {
    if (!selectedSquad || !canManageSquad) return;
    const current = Array.isArray(communityState?.forumPosts) ? communityState.forumPosts : [];
    const hasSquadPosts = current.some((item) => item.squadId === selectedSquad.id);
    const seed = hasSquadPosts
      ? current
      : [
          ...current,
          ...scopedForumPosts.map((post) => ({
            ...post,
            squadId: selectedSquad.id,
          })),
        ];

    onSaveCommunityState?.((prev) => {
      const basePosts = hasSquadPosts
        ? (Array.isArray(prev?.forumPosts) ? prev.forumPosts : [])
        : seed;
      const nextPosts =
        action === 'delete'
          ? basePosts.filter((post) => !(post.squadId === selectedSquad.id && post.id === postId))
          : basePosts.map((post) => {
              if (!(post.squadId === selectedSquad.id && post.id === postId)) return post;
              if (action === 'pin') return { ...post, pinned: !post.pinned };
              if (action === 'hide') return { ...post, hidden: !post.hidden };
              return post;
            });
      return {
        ...prev,
        forumPosts: nextPosts,
      };
    });
  }

  function handlePublishForumPost() {
    if (!selectedSquad) return;
    const content = String(newForumPost || '').trim();
    if (!content) return;
    const existingPosts = Array.isArray(communityState?.forumPosts) ? communityState.forumPosts : [];
    const nextPostId = `forum-${selectedSquad.id}-${existingPosts.length + 1}`;

    const nextPost = {
      id: nextPostId,
      author: displayName,
      avatar: profileAvatarUrl,
      squadId: selectedSquad.id,
      section: selectedSquad.name,
      createdAt: 'Agora',
      category: 'Discussão',
      subject: selectedSquad.focus,
      title: content.length > 72 ? `${content.slice(0, 72)}...` : content,
      message: content,
      replies: 0,
      helpful: 0,
      views: 1,
      badge: canManageSquad ? 'Professor' : '',
      pinned: false,
      solved: false,
      comments: [],
    };

    onSaveCommunityState?.((prev) => ({
      ...prev,
      forumPosts: [nextPost, ...(Array.isArray(prev?.forumPosts) ? prev.forumPosts : [])],
    }));

    if (usingRemoteSquads && currentUserId) {
      supabase
        .from('community_posts')
        .insert({
          user_id: currentUserId,
          author_name: displayName,
          title: nextPost.title,
          content: nextPost.message,
          category_slug: 'forum',
          category_name: 'Fórum',
          community_scope: 'Esquadrão',
          is_public: false,
        })
        .catch(console.warn);
    }

    setNewForumPost('');
    setForumPage(1);
    window.setTimeout(() => {
      forumComposerRef.current?.focus();
    }, 20);
  }

  function handleToggleProfessor(member) {
    if (!selectedSquad || !canManageTeachers) return;

    updateSelectedSquad((item) => {
      const roster = Array.isArray(item.roster) && item.roster.length ? item.roster : adminMembers;
      const alreadyProfessor =
        String(member.role || '').toLowerCase().includes('professor') ||
        String(member.role || '').toLowerCase().includes('dono');

      const nextRoster = roster.map((rosterItem) =>
        rosterItem.id === member.id
          ? {
              ...rosterItem,
              role: alreadyProfessor ? 'Aluno' : 'Professor',
              tag: alreadyProfessor ? 'Membro ativo' : 'Publica conteúdo',
            }
          : rosterItem
      );

      const nextTeachers = alreadyProfessor
        ? (Array.isArray(item.teachers) ? item.teachers : []).filter((teacher) => teacher.name !== member.name)
        : [
            ...(Array.isArray(item.teachers) ? item.teachers : []),
            {
              id: member.teacherId || `teacher-${member.id}`,
              name: member.name,
              subject: member.subject || 'Professor do esquadrão',
              avatar: member.avatar || '',
            },
          ];

      return {
        ...item,
        roster: nextRoster,
        teachers: nextTeachers,
      };
    });
  }

  function openAdminFlow(type, presetSection = 'configuracoes', seed = {}) {
    setActiveSection(presetSection);
    setAdminFlow({
      ...EMPTY_ADMIN_FLOW,
      type,
      ...seed,
    });
  }

  function closeAdminFlow() {
    setAdminFlow(EMPTY_ADMIN_FLOW);
  }

  function handleAdminFlowSubmit() {
    if (!selectedSquad || !canManageSquad || !adminFlow.type) return;

    if (adminFlow.type === 'notice') {
      if (!canPinNotices) return;
      const title = String(adminFlow.title || '').trim();
      const text = String(adminFlow.description || '').trim();
      if (!title || !text) return;
      updateSelectedSquad((item) => ({
        ...item,
        notices: [
          {
            id: `notice-${Date.now()}`,
            title,
            text,
            publishedBy: displayName,
            publishedByAvatar: profileAvatarUrl,
            publishedAtLabel: 'Agora',
            pinned: false,
            attachmentName: String(adminFlow.attachmentName || '').trim(),
            attachmentUrl: String(adminFlow.attachmentUrl || '').trim(),
          },
          ...(Array.isArray(item.notices) ? item.notices : []),
        ],
      }));
      setActiveSection('mural');
      closeAdminFlow();
      return;
    }

    if (adminFlow.type === 'activity') {
      if (!canPublishActivities) return;
      const title = String(adminFlow.title || '').trim();
      if (!title) return;
      const dueDate = String(adminFlow.dueDate || '').trim();
      const dueTime = String(adminFlow.dueTime || '').trim();
      updateSelectedSquad((item) => ({
        ...item,
        activities: [
          {
            id: `activity-${Date.now()}`,
            title,
            status: String(adminFlow.status || 'Aberta'),
            helper: String(adminFlow.helper || '').trim() || 'Atividade criada pelo ADM do esquadrão.',
            dueDate,
            dueTime,
            publishedBy: displayName,
            publishedByAvatar: profileAvatarUrl,
            publishedAtLabel: 'Agora',
            questionPackId: '',
            attachmentName: String(adminFlow.attachmentName || '').trim(),
            attachmentUrl: String(adminFlow.attachmentUrl || '').trim(),
          },
          ...(Array.isArray(item.activities) ? item.activities : []),
        ],
        nextEvent: dueDate ? `${title} · ${dueDate}${dueTime ? ` às ${dueTime}` : ''}` : title,
      }));
      setActiveSection('atividades');
      closeAdminFlow();
      return;
    }

    if (adminFlow.type === 'simulado') {
      if (!canPublishSimulados) return;
      const title = String(adminFlow.title || '').trim();
      if (!title) return;
      const simuladoDate = String(adminFlow.date || '').trim();
      const simuladoTime = String(adminFlow.time || '').trim();
      updateSelectedSquad((item) => ({
        ...item,
        simulados: [
          {
            id: `sim-${Date.now()}`,
            title,
            date: simuladoDate || 'A definir',
            time: simuladoTime,
            dateLabel: simuladoDate ? `${simuladoDate}${simuladoTime ? ` • ${simuladoTime}` : ''}` : 'A definir',
            helper: String(adminFlow.helper || '').trim() || 'Simulado publicado pelo ADM do esquadrão.',
            publishedBy: displayName,
            publishedByAvatar: profileAvatarUrl,
            publishedAtLabel: 'Agora',
            attachmentName: String(adminFlow.attachmentName || '').trim(),
            attachmentUrl: String(adminFlow.attachmentUrl || '').trim(),
          },
          ...(Array.isArray(item.simulados) ? item.simulados : []),
        ],
        nextEvent: simuladoDate ? `${title} · ${simuladoDate}${simuladoTime ? ` às ${simuladoTime}` : ''}` : title,
      }));
      setActiveSection('simulados');
      closeAdminFlow();
      return;
    }

    if (adminFlow.type === 'invite-student') {
      const inviteName = String(adminFlow.inviteName || '').trim();
      if (!inviteName) return;
      updateSelectedSquad((item) => ({
        ...item,
        roster: [
          ...(Array.isArray(item.roster) ? item.roster : adminMembers),
          {
            id: `member-${Date.now()}`,
            name: inviteName,
            role: 'Aluno',
            tag: 'Convite enviado',
            avatar: '',
          },
        ],
      }));
      setActiveSection('configuracoes');
      closeAdminFlow();
      return;
    }

    if (adminFlow.type === 'add-teacher') {
      if (!canManageTeachers) return;
      const teacherName = String(adminFlow.teacherName || '').trim();
      if (!teacherName) return;
      updateSelectedSquad((item) => ({
        ...item,
        teachers: [
          {
            id: `teacher-${Date.now()}`,
            name: teacherName,
            subject: String(adminFlow.teacherSubject || '').trim() || 'Professor do esquadrão',
            avatar: '',
          },
          ...(Array.isArray(item.teachers) ? item.teachers : []),
        ],
        roster: [
          ...(Array.isArray(item.roster) ? item.roster : adminMembers),
          {
            id: `member-teacher-${Date.now()}`,
            name: teacherName,
            role: 'Professor',
            tag: 'Publica conteúdo',
            subject: String(adminFlow.teacherSubject || '').trim() || 'Professor do esquadrão',
            avatar: '',
          },
        ],
      }));
      setActiveSection('configuracoes');
      closeAdminFlow();
      return;
    }

    if (adminFlow.type === 'permissions') {
      const memberId = String(adminFlow.memberId || '').trim();
      if (!memberId) return;
      const member = adminMembers.find((item) => item.id === memberId);
      if (!member) return;
      const permissionScope = String(adminFlow.permissionScope || '').trim();
      const permissionKeyMap = {
        'Gerir professores': 'manageTeachers',
        'Aprovar membros': 'approveMembers',
        'Publicar simulados': 'publishSimulados',
        'Publicar atividades': 'publishActivities',
        'Fixar mural': 'pinNotices',
      };
      const permissionKey = permissionKeyMap[permissionScope];

      if (permissionKey) {
        updateSelectedSquad((item) => ({
          ...item,
          permissions: {
            ...(item.permissions || DEFAULT_SQUAD_PERMISSIONS),
            [permissionKey]: !(item.permissions || DEFAULT_SQUAD_PERMISSIONS)[permissionKey],
          },
        }));
        setActiveSection('configuracoes');
        closeAdminFlow();
        return;
      }
      const alreadyProfessor =
        String(member.role || '').toLowerCase().includes('professor') ||
        String(member.role || '').toLowerCase().includes('dono');

      if ((permissionScope === 'Professor' && alreadyProfessor) || (permissionScope === 'Membro' && !alreadyProfessor)) {
        setActiveSection('configuracoes');
        closeAdminFlow();
        return;
      }

      handleToggleProfessor({
        ...member,
        subject: member.subject || adminFlow.teacherSubject || 'Professor do esquadrão',
      });
      setActiveSection('configuracoes');
      closeAdminFlow();
    }
  }

  function openInternalActivity(activity) {
    if (!activity) return;
    if (activity.questionPackId) {
      setActiveSection('atividades');
      setSquadNavTarget({ type: 'questao', id: activity.questionPackId });
    } else {
      setActiveSection('atividades');
      setSquadNavTarget({ type: 'activity', id: activity.id });
    }
  }

  function openInternalSimulado(sim) {
    if (!sim?.id) return;
    setActiveSection('simulados');
    setSquadNavTarget({ type: 'simulado', id: sim.id });
  }

  function openCronogramaNavItem(item) {
    if (item.navType === 'activity') {
      const act = displayActivities.find((a) => a.id === item.navId);
      openInternalActivity(act || { id: item.navId });
    } else {
      openInternalSimulado({ id: item.navId });
    }
  }

  function copySquadInviteLink() {
    if (!selectedSquad?.inviteCode || typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname || '/'}?convite=${encodeURIComponent(selectedSquad.inviteCode)}`;
    navigator.clipboard.writeText(url).then(() => {
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2200);
    }).catch(() => {});
  }

  return (
    <div className="pl-paper-bg" style={{ padding: '28px 28px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Hero ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingBottom: 20, borderBottom: '1px solid var(--pl-rule)' }}>
        <div>
          <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Ecossistema privado</p>
          <h1 className="pl-display" style={{ marginBottom: 8 }}>Esquadrões.</h1>
          <p style={{ fontSize: 13, color: 'var(--pl-ink-2)', maxWidth: 480 }}>
            Fórum interno, mural, simulados, atividades e gestão privada do cursinho.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative" ref={squadSwitcherWrapRef}>
            <button
              type="button"
              onClick={() => setShowSquadSwitcher((prev) => !prev)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-100 transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 text-indigo-600">
                <Users size={20} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Seus esquadrões</p>
                <p className="text-xl font-semibold leading-none text-slate-900">{accessibleSquads.length}</p>
              </div>
              {showSquadSwitcher ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>

            {showSquadSwitcher ? (
              <div className="absolute right-0 top-full z-50 mt-2 max-h-[min(22rem,70vh)] w-[min(100vw-2rem,20rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-900/10 ring-1 ring-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 px-3 pb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Trocar esquadrão</p>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-indigo-700">
                    {accessibleSquads.length} ativos
                  </span>
                </div>
                <div className="space-y-0.5 px-2 pt-1">
                  {accessibleSquads.map((squad) => {
                    const active = selectedSquad?.id === squad.id;
                    return (
                      <button
                        key={squad.id}
                        type="button"
                        onClick={() => {
                          handleSelectSquad(squad.id);
                          setShowSquadSwitcher(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition ${
                          active
                            ? 'border-indigo-200 bg-indigo-50 font-semibold text-indigo-900'
                            : 'border-transparent text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate">{squad.name}</p>
                          <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-slate-400">{squad.focus}</p>
                        </div>
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {squad.members}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2.5 text-yellow-800 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/60">
              <Star size={18} fill="currentColor" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-700">Criação</p>
              <p className="text-xl font-semibold leading-none">{isElite ? 'Liberada' : 'Fechada'}</p>
            </div>
          </div>

          {isElite ? (
            <button
              type="button"
              onClick={() => setShowCreateSquad(true)}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-950"
            >
              + Novo esquadrão
            </button>
          ) : null}
        </div>
      </div>

      {selectedSquad ? (
        <div className="pl-card-ai" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Esquadrão privado ativo</p>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 4 }}>{selectedSquad.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--pl-ink-2)' }}>
                {selectedSquad.owner} · Foco: {selectedSquad.focus}
              </p>
            </div>
            {canAccessSettings && (
              <button type="button" onClick={() => setActiveSection('configuracoes')} className="pl-btn pl-btn-ghost">
                Configurações
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Liga', value: selectedSquad.rankingTier || 'Bronze' },
              { label: 'Membros', value: String(selectedSquad.members || 0) },
              { label: 'Próximo marco', value: selectedSquad.nextEvent || '—' },
            ].map((s) => (
              <div key={s.label} className="pl-card" style={{ padding: '10px 14px' }}>
                <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{s.label}</p>
                <p className="pl-num" style={{ fontSize: 18, color: 'var(--pl-ink)' }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {selectedSquad ? (
        <div className="shrink-0 rounded-2xl border border-indigo-100/90 bg-gradient-to-r from-white via-slate-50/80 to-indigo-50/40 p-2 shadow-sm ring-1 ring-indigo-100 sm:p-2.5">
          <div className="mb-1.5 flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between sm:px-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600/90">Área interna</p>
            <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-slate-600 sm:text-right">
              {selectedSquad.name}
            </span>
          </div>
          <nav
            className="flex flex-row max-sm:gap-1.5 max-sm:overflow-x-auto max-sm:flex-nowrap max-sm:pb-0.5 max-sm:[-ms-overflow-style:none] max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden sm:flex-wrap sm:justify-center sm:gap-2 lg:justify-between"
            aria-label="Navegação do esquadrão"
          >
            {activeSection === 'configuracoes' ? (
              <button
                type="button"
                onClick={() => setActiveSection('dashboard')}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:gap-2 sm:px-3.5 sm:text-sm"
              >
                <ArrowLeft size={14} className="shrink-0 sm:size-[15px]" />
                <span className="whitespace-nowrap">Dashboard</span>
              </button>
            ) : null}
            {internalSections.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition sm:gap-2 sm:px-3.5 sm:text-sm ${
                    active ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <Icon size={16} className="shrink-0 opacity-90" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      ) : null}

      <div className="flex w-full flex-col gap-6">
          {!selectedSquad ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[2rem] border border-gray-100 bg-white px-6 text-center shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Shield size={28} />
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-slate-900">Escolha um esquadrão</h3>
              <p className="mt-2 max-w-lg text-sm font-medium leading-relaxed text-gray-500">
                Selecione um esquadrão para abrir a comunidade privada da turma.
              </p>
            </div>
          ) : (
            <>
              {activeSection === 'dashboard' && (
                <div className="animate-in fade-in flex flex-col gap-6">
                  <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">Dashboard do esquadrão</p>
                    <h3 className="mt-1 text-2xl font-semibold text-slate-900">Visão geral do {selectedSquad.name}</h3>
                    <p className="mt-2 text-sm font-medium text-gray-600">
                      Painel de apresentação do cursinho com foco em engajamento, operação e próximos passos da turma.
                    </p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <QuickStatCard icon={<Users size={16} />} label="Membros ativos" value={String(selectedSquad.members || 0)} />
                      <QuickStatCard icon={<BookOpen size={16} />} label="Professores" value={String(selectedSquad.teachers?.length || 0)} />
                      <QuickStatCard icon={<ClipboardList size={16} />} label="Atividades" value={String(displayActivities.length)} />
                      <QuickStatCard icon={<Trophy size={16} />} label="Simulados" value={String(displaySimulados.length)} />
                    </div>
                  </section>
                  <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                      <h4 className="text-lg font-semibold text-slate-900">Próximas ações do curso</h4>
                      <ul className="mt-3 space-y-2 text-sm font-medium text-gray-600">
                        <li>- Publicar aviso de rotina da semana no Mural.</li>
                        <li>- Revisar cronograma e confirmar próximos simulados.</li>
                        <li>- Atualizar banco de Questões da turma.</li>
                        <li>- Monitorar dúvidas mais frequentes no Fórum.</li>
                      </ul>
                    </div>
                    <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                      <h4 className="text-lg font-semibold text-slate-900">Acesso da turma</h4>
                      <div className="mt-3 space-y-3">
                        <SummaryInfo label="Código de entrada" value={selectedSquad.inviteCode || '---'} />
                        <SummaryInfo label="Visibilidade" value={selectedSquad.visibility || 'Privado'} />
                        <SummaryInfo label="Líder" value={selectedSquad.owner || '---'} />
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeSection === 'forum' && (
                <div className="animate-in fade-in space-y-6">
                  <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-r from-blue-50/90 via-white to-indigo-50/60 p-6 shadow-sm ring-1 ring-slate-100">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">Fórum interno Papirando</p>
                        <h3 className="mt-1 text-2xl font-semibold text-slate-900">Discussões exclusivas da turma</h3>
                        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
                          Busca, filtros, ordenação, destaque fixado, compositor e comentários em árvore — o mesmo padrão do fórum geral, isolado ao esquadrão.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-2xl border border-white/90 bg-white px-4 py-3 shadow-sm">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Tópicos</p>
                          <p className="text-xl font-semibold text-slate-900">{scopedForumPosts.filter((p) => !p.hidden).length}</p>
                        </div>
                        <div className="rounded-2xl border border-white/90 bg-white px-4 py-3 shadow-sm">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Fixados</p>
                          <p className="text-xl font-semibold text-slate-900">{scopedForumPosts.filter((p) => p.pinned).length}</p>
                        </div>
                        <button
                          type="button"
                          onClick={focusForumComposer}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-950"
                        >
                          <Plus size={15} />
                          Novo tópico
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Busca e filtros</p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-900">Encontre qualquer discussão</h3>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
                      <div className="space-y-4">
                        <div className="relative">
                          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={forumQuery}
                            onChange={(e) => {
                              setForumQuery(e.target.value);
                              setForumPage(1);
                            }}
                            placeholder="Buscar por dúvida, autor, matéria, resumo, aviso..."
                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition focus:border-indigo-500 focus:bg-white"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'todos', label: 'Todos' },
                            { id: 'fixados', label: 'Fixados' },
                            { id: 'duvidas', label: 'Dúvidas' },
                            { id: 'avisos', label: 'Avisos' },
                            { id: 'resumos', label: 'Resumos' },
                            { id: 'resolvidos', label: 'Resolvidos' },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setForumFilter(item.id);
                                setForumPage(1);
                              }}
                              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest transition ${
                                forumFilter === item.id
                                  ? 'bg-slate-900 text-white'
                                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                            <Filter size={12} />
                            Ordenar
                          </div>
                          <select
                            value={forumSort}
                            onChange={(e) => {
                              setForumSort(e.target.value);
                              setForumPage(1);
                            }}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-bold text-gray-700 outline-none transition focus:border-indigo-500"
                          >
                            <option value="recentes">Mais recentes</option>
                            <option value="populares">Mais úteis</option>
                            <option value="comentadas">Mais comentadas</option>
                            <option value="fixados">Fixados primeiro</option>
                          </select>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                            <Bookmark size={12} />
                            Resultado
                          </div>
                          <p className="text-2xl font-semibold text-slate-900">{filteredForumPosts.length}</p>
                          <p className="mt-1 text-sm font-medium text-gray-500">tópicos encontrados</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="group relative flex flex-col gap-4 overflow-hidden rounded-[2rem] border border-indigo-100 bg-white p-6 shadow-sm">
                    <div className="absolute right-0 top-0 h-full w-2 bg-indigo-500" />
                    <div className="flex items-start gap-4">
                      {profileAvatarUrl ? (
                        <img
                          src={profileAvatarUrl}
                          alt=""
                          className="h-12 w-12 rounded-full border-2 border-indigo-100 object-cover shadow-sm"
                          aria-hidden
                        />
                      ) : (
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-indigo-100 bg-indigo-50 text-sm font-semibold text-indigo-700 shadow-sm"
                          aria-hidden
                        >
                          {String(displayName || '?')
                            .trim()
                            .charAt(0)
                            .toUpperCase() || '?'}
                        </div>
                      )}
                      <textarea
                        ref={forumComposerRef}
                        rows="3"
                        value={newForumPost}
                        onChange={(e) => setNewForumPost(e.target.value)}
                        placeholder="Abra um novo tópico do esquadrão sem precisar voltar para a home."
                        className="w-full resize-none rounded-2xl border border-transparent bg-gray-50 p-4 text-sm font-medium text-gray-700 outline-none transition-all hover:border-gray-200 hover:bg-white focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                    <div className="flex items-center justify-between pl-16">
                      <p className="text-xs font-bold text-gray-400">O tópico publicado aparece no fórum interno e permanece salvo na comunidade.</p>
                      <button
                        type="button"
                        onClick={handlePublishForumPost}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-indigo-700"
                      >
                        <Send size={16} /> Publicar
                      </button>
                    </div>
                  </section>

                  {pinnedPost ? (
                    <section className="rounded-[2rem] border border-yellow-200 bg-[linear-gradient(180deg,#fffdf4_0%,#ffffff_100%)] p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-700">Fixado</p>
                          <h3 className="mt-1 text-xl font-semibold text-slate-900">Destaque do professor</h3>
                        </div>
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-yellow-800">
                          Prioridade
                        </span>
                      </div>
                      <ForumPostFull
                        post={pinnedPost}
                        expanded={expandedReplies[pinnedPost.id]}
                        onToggleReplies={() => toggleReplies(pinnedPost.id)}
                      />
                    </section>
                  ) : null}

                  <section className="space-y-4">
                    {paginatedForumPosts
                      .filter((post) => post.id !== pinnedPost?.id)
                      .map((post) => (
                        <ForumPostFull
                          key={post.id}
                          post={post}
                          expanded={expandedReplies[post.id]}
                          onToggleReplies={() => toggleReplies(post.id)}
                        />
                      ))}

                    {filteredForumPosts.length === 0 ? (
                      <div className="rounded-[2rem] border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                          <Search size={22} />
                        </div>
                        <h4 className="mt-4 text-xl font-semibold text-slate-900">Nada encontrado</h4>
                        <p className="mt-2 text-sm font-medium text-gray-500">
                          Ajusta a busca ou o filtro. O fórum não sumiu, só ficou mais criterioso.
                        </p>
                      </div>
                    ) : null}
                  </section>

                  <PaginationBar
                    page={forumPage}
                    totalPages={totalForumPages}
                    onPrev={() => setForumPage((prev) => Math.max(1, prev - 1))}
                    onNext={() => setForumPage((prev) => Math.min(totalForumPages, prev + 1))}
                    onPick={(value) => setForumPage(value)}
                  />
                </div>
              )}

              {activeSection === 'mural' && (
                <div className="space-y-4">
                  {canPinNotices ? (
                    <div className="flex justify-end">
                      <ActionChip label="Novo aviso" onClick={() => openAdminFlow('notice', 'mural')} />
                    </div>
                  ) : null}
                  {displayNotices.map((notice) => {
                    const who = notice.publishedBy || selectedSquad.owner || 'Coordenação';
                    const when = notice.publishedAtLabel || '';
                    const av =
                      notice.publishedByAvatar || (who === selectedSquad.owner ? profileAvatarUrl : '') || '';
                    return (
                      <article
                        key={notice.id}
                        className={`overflow-hidden rounded-[2rem] border bg-white shadow-sm transition hover:shadow-md ${
                          notice.pinned ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white">
                              {av ? (
                                <img src={av} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-indigo-100 text-xs font-bold text-indigo-700">
                                  {String(who).charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{who}</p>
                              <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                <Clock3 size={12} className="shrink-0 text-slate-400" />
                                {when || '—'}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {notice.pinned ? (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-900">
                                Fixado
                              </span>
                            ) : null}
                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-indigo-700">
                              Mural
                            </span>
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-600">
                            <Megaphone size={14} /> Aviso à turma
                          </div>
                          <h4 className="text-lg font-semibold text-slate-900">{notice.title}</h4>
                          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{notice.text}</p>
                          {notice.attachmentName ? (
                            <a
                              href={notice.attachmentUrl || '#'}
                              download={notice.attachmentName}
                              className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-blue-700"
                            >
                              <Bookmark size={12} />
                              {notice.attachmentName}
                            </a>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                  {!displayNotices.length ? (
                    <div className="rounded-[1.6rem] border border-dashed border-gray-200 bg-white p-8 text-center text-sm font-medium text-gray-500">
                      Nenhum aviso publicado ainda.
                    </div>
                  ) : null}
                </div>
              )}

              {activeSection === 'cronograma' && (
                <div className="space-y-4">
                  <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">Cronograma interno</p>
                    <h3 className="mt-1 text-2xl font-semibold text-slate-900">Planejamento da turma</h3>
                    <p className="mt-2 text-sm font-medium text-gray-600">
                      Aqui o cursinho concentra calendario de atividades, simulados e marcos da turma no proprio esquadrao.
                    </p>
                  </div>
                  {cronogramaCards.length ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {cronogramaCards.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openCronogramaNavItem(item)}
                          className="rounded-[1.6rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-blue-700">
                              {item.label}
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{item.when}</span>
                          </div>
                          <h4 className="text-lg font-semibold text-slate-900">{item.title}</h4>
                          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{item.details}</p>
                          {item.publishedBy ? (
                            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                              {item.publishedByAvatar ? (
                                <img src={item.publishedByAvatar} alt="" className="h-8 w-8 rounded-full border border-slate-200 object-cover" />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                                  {String(item.publishedBy).charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="text-[11px] font-semibold text-slate-700">Publicado por {item.publishedBy}</p>
                                <p className="text-[10px] font-medium text-slate-400">{item.publishedAtLabel || ''}</p>
                              </div>
                              <span className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-indigo-600">Abrir →</span>
                            </div>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-gray-200 bg-white p-8 text-center text-sm font-medium text-gray-500">
                      Sem itens no cronograma ainda. Use Atividades e Simulados para preencher esta agenda.
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'atividades' && (
                <div className="space-y-4">
                  {canPublishActivities ? (
                    <div className="flex justify-end">
                      <ActionChip label="Nova atividade" onClick={() => openAdminFlow('activity', 'atividades', { status: 'Aberta' })} />
                    </div>
                  ) : null}
                  {displayActivities.map((activity) => {
                    const hl = squadNavTarget.type === 'activity' && squadNavTarget.id === activity.id;
                    return (
                      <div
                        key={activity.id}
                        id={`squad-activity-${activity.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => openInternalActivity(activity)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openInternalActivity(activity);
                          }
                        }}
                        className={`w-full cursor-pointer rounded-[2rem] border bg-white p-6 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md ${
                          hl ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-slate-200'
                        }`}
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <h4 className="text-lg font-semibold text-slate-900">{activity.title}</h4>
                          <span className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
                            {activity.status}
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-slate-600">{activity.helper}</p>
                        {activity.dueDate || activity.dueTime ? (
                          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-indigo-600">
                            Prazo {activity.dueDate || 'a definir'} {activity.dueTime ? `• ${activity.dueTime}` : ''}
                          </p>
                        ) : null}
                        {activity.publishedBy ? (
                          <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                            {activity.publishedByAvatar ? (
                              <img src={activity.publishedByAvatar} alt="" className="h-9 w-9 rounded-full border border-slate-200 object-cover" />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                {String(activity.publishedBy).charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-700">Lançado por {activity.publishedBy}</p>
                              <p className="text-[11px] font-medium text-slate-400">{activity.publishedAtLabel || ''}</p>
                            </div>
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
                              {activity.questionPackId ? 'Ir à lista →' : 'Detalhes →'}
                            </span>
                          </div>
                        ) : null}
                        {activity.attachmentName ? (
                          <a
                            href={activity.attachmentUrl || '#'}
                            download={activity.attachmentName}
                            className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-blue-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Bookmark size={12} />
                            {activity.attachmentName}
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                  {!displayActivities.length ? (
                    <div className="rounded-[1.6rem] border border-dashed border-gray-200 bg-white p-8 text-center text-sm font-medium text-gray-500">
                      Sem atividades no momento.
                    </div>
                  ) : null}

                  <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">Banco do cursinho</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900">Listas e questões</h3>
                        <p className="mt-1 text-sm font-medium text-slate-600">
                          O mesmo fluxo das atividades: listas internas aparecem aqui. Para publicar com prazo, use <span className="font-semibold text-slate-800">Nova atividade</span>.
                        </p>
                      </div>
                      {questionPosts.length ? (
                        <span className="shrink-0 self-start rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-indigo-700">
                          {questionPosts.length} lista{questionPosts.length !== 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </div>
                    {questionPosts.length ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {questionPosts.map((item) => {
                          const hl = squadNavTarget.type === 'questao' && squadNavTarget.id === item.id;
                          return (
                            <button
                              key={item.id}
                              id={`squad-questao-${item.id}`}
                              type="button"
                              onClick={() => {
                                setActiveSection('atividades');
                                setSquadNavTarget({ type: 'questao', id: item.id });
                              }}
                              className={`rounded-xl border bg-slate-50 p-4 text-left transition hover:border-indigo-200 hover:bg-white hover:shadow-sm ${
                                hl ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-slate-100'
                              }`}
                            >
                              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">{item.tag}</p>
                              <h5 className="mt-1 text-sm font-semibold text-slate-900">{item.title}</h5>
                              <p className="mt-2 text-xs font-medium text-slate-500">{item.meta}</p>
                              {item.publishedBy ? (
                                <div className="mt-3 flex items-center gap-2 border-t border-slate-200/80 pt-3">
                                  {item.publishedByAvatar ? (
                                    <img src={item.publishedByAvatar} alt="" className="h-8 w-8 rounded-full border border-slate-200 object-cover" />
                                  ) : (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-600">
                                      {String(item.publishedBy).charAt(0)}
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-[11px] font-semibold text-slate-700">Lista de {item.publishedBy}</p>
                                    <p className="text-[10px] font-medium text-slate-400">
                                      {item.publishedAtLabel || ''}
                                      {item.questionsCount ? ` · ${item.questionsCount} questões` : ''}
                                    </p>
                                  </div>
                                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-indigo-600">Abrir →</span>
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-slate-500">
                        Nenhuma lista interna ainda. Publique uma atividade com lista vinculada — tudo fica nesta aba.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'simulados' && (
                <div className="space-y-4">
                  {canPublishSimulados ? (
                    <div className="flex justify-end">
                      <ActionChip label="Novo simulado" onClick={() => openAdminFlow('simulado', 'simulados')} />
                    </div>
                  ) : null}
                  {displaySimulados.map((simulado) => {
                    const hl = squadNavTarget.type === 'simulado' && squadNavTarget.id === simulado.id;
                    return (
                      <div
                        key={simulado.id}
                        id={`squad-simulado-${simulado.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => openInternalSimulado(simulado)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openInternalSimulado(simulado);
                          }
                        }}
                        className={`w-full cursor-pointer rounded-[2rem] border bg-white p-6 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md ${
                          hl ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-slate-200'
                        }`}
                      >
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-600">
                          <Trophy size={14} /> Simulado programado
                        </div>
                        <h4 className="text-lg font-semibold text-slate-900">{simulado.title}</h4>
                        <p className="mt-2 text-sm font-semibold text-indigo-600">{simulado.dateLabel || simulado.date}</p>
                        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{simulado.helper}</p>
                        {simulado.publishedBy ? (
                          <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                            {simulado.publishedByAvatar ? (
                              <img src={simulado.publishedByAvatar} alt="" className="h-9 w-9 rounded-full border border-slate-200 object-cover" />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                {String(simulado.publishedBy).charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-700">Publicado por {simulado.publishedBy}</p>
                              <p className="text-[11px] font-medium text-slate-400">{simulado.publishedAtLabel || ''}</p>
                            </div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">Ficha →</span>
                          </div>
                        ) : null}
                        {simulado.attachmentName ? (
                          <a
                            href={simulado.attachmentUrl || '#'}
                            download={simulado.attachmentName}
                            className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-blue-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Bookmark size={12} />
                            {simulado.attachmentName}
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                  {!displaySimulados.length ? (
                    <div className="rounded-[1.6rem] border border-dashed border-gray-200 bg-white p-8 text-center text-sm font-medium text-gray-500">
                      Nenhum simulado cadastrado ainda.
                    </div>
                  ) : null}
                </div>
              )}

              {activeSection === 'ranking' && (
                <div className="space-y-4">
                  <div className="rounded-[2rem] border border-amber-100 bg-gradient-to-br from-amber-50/90 via-white to-indigo-50/40 p-6 shadow-sm ring-1 ring-amber-100/80">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-800">Como funciona a pontuação</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">Regras de XP (simulação)</h3>
                    <p className="mt-2 text-sm font-medium text-slate-600">
                      A turma acumula XP por engajamento nas listas internas, simulados e redação. Valores abaixo são exemplos para o cursinho calibrar.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        { label: 'Questão objetiva certa (lista)', value: '+50 XP', hint: 'por item concluído na lista do esquadrão' },
                        { label: 'Questão certa em simulado interno', value: '+100 XP', hint: 'peso maior por prova completa' },
                        { label: 'Participação no fórum (post útil)', value: '+25 XP', hint: 'moderado pelo professor — anti-spam' },
                        { label: 'Redação nota máxima (10)', value: '+400 XP', hint: 'escala pode ser ajustada pelo dono' },
                        { label: 'Redação nota 8', value: '+250 XP', hint: 'proporcional entre 6 e 10' },
                        { label: 'Streak semanal (7 dias)', value: '+120 XP', hint: 'bônus por constância registrada' },
                      ].map((row) => (
                        <div key={row.label} className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{row.label}</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{row.value}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">{row.hint}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {displayRanking.map((item) => (
                    <RankingRow key={item.id} item={item} />
                  ))}
                  {!displayRanking.length ? (
                    <div className="rounded-[1.6rem] border border-dashed border-gray-200 bg-white p-8 text-center text-sm font-medium text-gray-500">
                      O ranking interno aparece quando a turma comeca a responder atividades e simulados.
                    </div>
                  ) : null}
                </div>
              )}

              {activeSection === 'configuracoes' && selectedSquad && canAccessSettings && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                  <div className="rounded-[2rem] border border-indigo-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-white shadow-md sm:p-7">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-200">Área do cursinho</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">Configurações do curso</h2>
                    <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-300">
                      Identidade, turma, selos de professor, convites e permissões ficam nesta página. Role até <span className="font-semibold text-white">Membros e selos</span> para convidar, promover ou ajustar cargo de cada pessoa.
                    </p>
                  </div>

                  <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">Identidade</p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Nome e visibilidade</h3>
                    <p className="mt-2 text-sm font-medium text-slate-600">
                      Estes dados aparecem no cabeçalho do esquadrão e no convite. Salve ao terminar cada bloco de alterações.
                    </p>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Nome
                        <input
                          value={adminEdit.name}
                          onChange={(e) => setAdminEdit((prev) => ({ ...prev, name: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
                        />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Foco
                        <input
                          value={adminEdit.focus}
                          onChange={(e) => setAdminEdit((prev) => ({ ...prev, focus: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
                        />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Código de entrada
                        <input
                          value={adminEdit.inviteCode}
                          onChange={(e) => setAdminEdit((prev) => ({ ...prev, inviteCode: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
                        />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Visibilidade
                        <select
                          value={adminEdit.visibility}
                          onChange={(e) => setAdminEdit((prev) => ({ ...prev, visibility: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
                        >
                          <option value="Privado">Privado</option>
                          <option value="Público">Público</option>
                        </select>
                      </label>
                    </div>
                    <label className="mt-4 block text-sm font-semibold text-slate-700">
                      Descrição
                      <textarea
                        rows={3}
                        value={adminEdit.description}
                        onChange={(e) => setAdminEdit((prev) => ({ ...prev, description: e.target.value }))}
                        className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
                      />
                    </label>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveSquadSettings}
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-950"
                      >
                        Salvar identidade
                      </button>
                    </div>
                  </section>

                  <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">Equipe docente</p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-900">Professores e matérias</h3>
                        <p className="mt-2 text-sm font-medium text-slate-600">
                          Quem representa o cursinho nas disciplinas. A turma vê estes nomes em atividades, fórum e mural.
                        </p>
                      </div>
                      {canManageTeachers ? (
                        <ActionChip label="Adicionar professor" onClick={() => openAdminFlow('add-teacher', 'configuracoes')} />
                      ) : null}
                    </div>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      {(selectedSquad.teachers || []).length ? (
                        (selectedSquad.teachers || []).map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)
                      ) : (
                        <p className="text-sm font-medium text-slate-500 md:col-span-2">
                          Nenhum professor cadastrado. Adicione a equipa para distribuir matérias e respostas no fórum.
                        </p>
                      )}
                    </div>
                  </section>

                  <section id="squad-config-membros" className="space-y-6 scroll-mt-6">
                    <MembersHero squad={selectedSquad} canManageSquad={canManageSquad} />

                    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">Turma</p>
                            <h3 className="mt-1 text-xl font-semibold text-slate-900">Membros e selos</h3>
                            <p className="mt-2 text-sm font-medium text-slate-600">
                              Convidar novos alunos, distribuir o selo de professor e abrir o fluxo de permissões por pessoa.
                            </p>
                          </div>

                          {canManageSquad ? (
                            <button
                              type="button"
                              onClick={() => openAdminFlow('invite-student', 'configuracoes')}
                              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-950"
                            >
                              <UserPlus size={14} />
                              Convidar
                            </button>
                          ) : null}
                        </div>

                        <div className="space-y-3">
                          {adminMembers.map((member) => (
                            <MemberManagementRow
                              key={member.id}
                              member={member}
                              canManageSquad={canManageSquad}
                              onToggleProfessor={handleToggleProfessor}
                              onOpenPermissions={() =>
                                openAdminFlow('permissions', 'configuracoes', {
                                  memberId: member.id,
                                  teacherName: member.name,
                                  teacherSubject: member.subject || '',
                                })
                              }
                            />
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="mb-5">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Resumo de permissões</p>
                          <h3 className="mt-1 text-xl font-semibold text-slate-900">Quem pode fazer o quê</h3>
                          <p className="mt-2 text-sm font-medium text-slate-600">
                            Visão geral; para mudar o selo de um aluno ou cargo, use <span className="font-semibold text-slate-800">Permissões</span> na linha da pessoa ao lado.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <PermissionItem label="Distribuir selo de professor" value={canManageSquad ? 'Ativo' : 'Restrito'} />
                          <PermissionItem label="Publicar simulados" value="Professor / Dono" />
                          <PermissionItem label="Publicar atividades" value="Professor / Dono" />
                          <PermissionItem label="Gerir membros" value={canManageSquad ? 'Ativo' : 'Restrito'} />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">Papéis e acesso</p>
                      <h3 className="mt-1 text-xl font-semibold text-slate-900">Governança e convites</h3>
                      <p className="mt-2 text-sm font-medium text-slate-600">
                        Cada cargo tem escopo claro. O dono define quem publica, quem modera e quem entra pela porta do convite.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {roleHierarchyDetail.map((item) => (
                        <div key={item.role} className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">{item.role}</p>
                          <p className="mt-2 text-sm font-medium text-slate-700">{item.summary}</p>
                          <ul className="mt-3 space-y-2 text-sm font-medium text-slate-600">
                            {item.can.map((line) => (
                              <li key={line} className="flex gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-[2rem] border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-white p-6 shadow-sm ring-1 ring-indigo-100">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">Link de convite</p>
                          <h4 className="mt-1 text-lg font-semibold text-slate-900">Compartilhe com alunos e equipe</h4>
                          <p className="mt-2 text-sm font-medium text-slate-600">
                            Código atual: <span className="font-semibold text-indigo-700">{selectedSquad.inviteCode || '—'}</span>
                          </p>
                          <p className="mt-1 break-all text-xs font-medium text-slate-500">
                            {typeof window !== 'undefined'
                              ? `${window.location.origin}${window.location.pathname || '/'}?convite=${encodeURIComponent(selectedSquad.inviteCode || '')}`
                              : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={copySquadInviteLink}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-950"
                          >
                            <Copy size={16} />
                            {inviteCopied ? 'Copiado!' : 'Copiar link'}
                          </button>
                          <button
                            type="button"
                            onClick={copySquadInviteLink}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Link2 size={16} />
                            Convite
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                      <h4 className="text-lg font-semibold text-slate-900">Como o aluno entra no esquadrão certo</h4>
                      <ul className="mt-3 space-y-2 text-sm font-medium text-slate-600">
                        {squadAccessFlow.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <section className="rounded-[2rem] border border-indigo-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-5 shadow-sm">
                    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">Operação do esquadrão</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Atalhos e moderação</h3>
                        <p className="mt-1 max-w-2xl text-sm font-medium text-gray-500">
                          Organize pessoas, publique conteúdo e ajuste permissões sem sair do fluxo atual.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <AdminMetricTone label="Pessoas" value={String(adminMembers.length)} tone="blue" />
                        <AdminMetricTone label="Professores" value={String(selectedSquad.teachers?.length || 0)} tone="gold" />
                        <AdminMetricTone label="Atividades" value={String(displayActivities.length)} tone="emerald" />
                        <AdminMetricTone label="Simulados" value={String(displaySimulados.length)} tone="slate" />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4">
                      <AdminCommandCard
                        icon={<Users size={18} />}
                        title="Membros e selos"
                        description="Convidar, promover e distribuir selo de professor na mesma página."
                        actionLabel="Ir para a turma"
                        onClick={() => {
                          setActiveSection('configuracoes');
                          window.setTimeout(() => {
                            document.getElementById('squad-config-membros')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 80);
                        }}
                      />
                      <AdminCommandCard
                        icon={<BookOpen size={18} />}
                        title="Equipa docente"
                        description="Professores e matérias ficam na área de Configurações; abra o fluxo para incluir alguém novo."
                        actionLabel="Adicionar professor"
                        onClick={() => openAdminFlow('add-teacher', 'configuracoes')}
                      />
                      <AdminCommandCard
                        icon={<ClipboardList size={18} />}
                        title="Publicações internas"
                        description="Lançar atividade, simulado ou aviso em poucos cliques."
                        actionLabel="Abrir atalhos"
                        onClick={() => openAdminFlow('activity', 'configuracoes', { status: 'Aberta' })}
                      />
                      <AdminCommandCard
                        icon={<Shield size={18} />}
                        title="Permissões"
                        description="Controlar o que a gestão e os professores podem fazer."
                        actionLabel="Ajustar"
                        onClick={() => openAdminFlow('permissions', 'configuracoes')}
                      />
                    </div>
                  </section>

                  <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
                    <div className="space-y-6">
                      <AdminPanel
                        icon={<UserPlus size={18} className="text-indigo-600" />}
                        title="Pessoas do esquadrão"
                        subtitle="Visual limpo para bater o olho e entender quem é dono, professor ou membro."
                      >
                        <div className="mb-4 flex flex-wrap gap-3">
                          <ActionChip label="Convidar aluno" onClick={() => openAdminFlow('invite-student', 'configuracoes')} />
                          <ActionChip label="Adicionar professor" onClick={() => openAdminFlow('add-teacher', 'configuracoes')} />
                          <ActionChip label="Gerir permissões" onClick={() => openAdminFlow('permissions', 'configuracoes')} />
                        </div>

                        <div className="space-y-3">
                          {adminMembers.map((member) => (
                            <AdminMemberRow
                              key={member.id}
                              member={member}
                              onManagePermissions={() =>
                                openAdminFlow('permissions', 'configuracoes', {
                                  memberId: member.id,
                                  teacherName: member.name,
                                  teacherSubject: member.subject || '',
                                })
                              }
                            />
                          ))}
                        </div>
                      </AdminPanel>

                      <AdminPanel
                        icon={<ClipboardList size={18} className="text-indigo-600" />}
                        title="Atalhos de publicação"
                        subtitle="As ações principais ficam visíveis e organizadas, sem parecer um monte de botão jogado."
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <AdminActionCard
                            title="Publicar atividade"
                            helper="Criar lista, checklist ou tarefa com prazo."
                            badge="Acadêmico"
                            onClick={() => openAdminFlow('activity', 'configuracoes', { status: 'Aberta' })}
                          />
                          <AdminActionCard
                            title="Publicar simulado"
                            helper="Agendar aplicação com data, hora e instruções."
                            badge="Avaliação"
                            onClick={() => openAdminFlow('simulado', 'configuracoes')}
                          />
                          <AdminActionCard
                            title="Fixar aviso"
                            helper="Subir comunicado importante para o topo do mural."
                            badge="Comunicado"
                            onClick={() => openAdminFlow('notice', 'configuracoes')}
                          />
                          <AdminActionCard
                            title="Promover professor"
                            helper="Dar selo e liberar atuação interna no esquadrão."
                            badge="Permissão"
                            onClick={() => openAdminFlow('permissions', 'configuracoes')}
                          />
                        </div>
                      </AdminPanel>
                    </div>

                    <div className="space-y-6">
                      <AdminPanel
                        icon={<Shield size={18} className="text-indigo-600" />}
                        title="Estado das permissões"
                        subtitle="Leitura rápida do que está ativo hoje dentro do esquadrão."
                      >
                        <div className="space-y-3">
                          <PermissionItem label="Gerir professores" value={selectedSquad?.permissions?.manageTeachers === false ? 'Restrito' : 'Ativo'} />
                          <PermissionItem label="Aprovar membros" value={selectedSquad?.permissions?.approveMembers === false ? 'Restrito' : 'Ativo'} />
                          <PermissionItem label="Publicar simulados" value={selectedSquad?.permissions?.publishSimulados === false ? 'Restrito' : 'Ativo'} />
                          <PermissionItem label="Publicar atividades" value={selectedSquad?.permissions?.publishActivities === false ? 'Restrito' : 'Ativo'} />
                          <PermissionItem label="Fixar mural" value={selectedSquad?.permissions?.pinNotices === false ? 'Restrito' : 'Ativo'} />
                        </div>

                        <div className="mt-4 rounded-[1.4rem] border border-dashed border-indigo-200 bg-indigo-50/60 p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">Ajuste rápido</p>
                          <p className="mt-2 text-sm font-medium leading-relaxed text-gray-600">
                            Precisa trocar um membro para professor ou mexer em escopo? Abre o fluxo de permissões e resolve sem gambiarra.
                          </p>
                          <button
                            type="button"
                            onClick={() => openAdminFlow('permissions', 'configuracoes')}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-950"
                          >
                            Ajustar permissões
                          </button>
                        </div>
                      </AdminPanel>

                      <AdminPanel
                        icon={<Sparkles size={18} className="text-indigo-600" />}
                        title="Resumo operacional"
                        subtitle="Panorama curto para saber se o esquadrão está redondo ou pedindo socorro."
                      >
                        <div className="grid gap-3">
                          <AdminMetric label="Professores com selo" value={String(selectedSquad.teachers?.length || 0)} />
                          <AdminMetric label="Membros totais" value={String(selectedSquad.members || 0)} />
                          <AdminMetric label="Avisos publicados" value={String(displayNotices.length)} />
                          <AdminMetric label="Atividades ativas" value={String(displayActivities.length)} />
                        </div>
                      </AdminPanel>

                      <AdminPanel
                        icon={<MessageCircle size={18} className="text-indigo-600" />}
                        title="Moderação do fórum"
                        subtitle="Aba exclusiva para o ADM controlar conteúdo, fixar, ocultar e apagar posts."
                      >
                        <div className="space-y-3">
                          {scopedForumPosts.slice(0, 10).map((post) => (
                            <div key={post.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">{post.title}</p>
                                <p className="text-xs font-medium text-slate-500">
                                  {post.author} • {post.category} {post.hidden ? '• oculto' : ''}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleModerateForumPost(post.id, 'pin')}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  {post.pinned ? 'Desfixar' : 'Fixar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleModerateForumPost(post.id, 'hide')}
                                  className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                                >
                                  {post.hidden ? 'Mostrar' : 'Ocultar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleModerateForumPost(post.id, 'delete')}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                >
                                  Apagar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AdminPanel>

                      <AdminDangerZone onDelete={() => setShowDeleteConfirm(true)} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      {showCreateSquad && isElite ? (
        <CreateSquadModal
          form={createForm}
          onChange={setCreateForm}
          onClose={closeCreateSquad}
          onSubmit={handleCreateSquad}
          focusOptions={focusOptions}
        />
      ) : null}

      {showDeleteConfirm && selectedSquad ? (
        <ConfirmDeleteModal squadName={selectedSquad.name} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDeleteSquad} />
      ) : null}

      {adminFlow.type && selectedSquad && canManageSquad ? (
        <AdminFlowModal
          flow={adminFlow}
          onChange={setAdminFlow}
          onClose={closeAdminFlow}
          onSubmit={handleAdminFlowSubmit}
          members={adminMembers}
        />
      ) : null}
    </div>
  );
}

function QuickStatCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ForumBadge({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-100">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function ForumParticipantAvatar({ name, avatarUrl, className }) {
  const initial = String(name || '?').trim().charAt(0).toUpperCase() || '?';
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className={`${className} rounded-full object-cover`} aria-hidden />;
  }
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600`}
      aria-hidden
    >
      {initial}
    </div>
  );
}

function ForumPostFeatured({ post }) {
  return (
    <div className="rounded-[1.6rem] border border-indigo-100 bg-[linear-gradient(180deg,#ffffff_0%,#eef4ff_100%)] p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ForumParticipantAvatar name={post.author} avatarUrl={post.avatar} className="h-12 w-12" />
          <div className="min-w-0">
            <h5 className="flex items-center gap-1 text-sm font-semibold text-gray-800">
              <span className="truncate">{post.author}</span>
              {post.badge ? <Shield size={12} className="shrink-0 text-blue-500" fill="currentColor" /> : null}
            </h5>
            <p className="text-[10px] font-bold text-gray-400">
              {post.createdAt} • {post.section}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-yellow-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-yellow-700">
          Fixado
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-700">
          {post.category}
        </span>
        <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          {post.subject}
        </span>
      </div>

      <h4 className="text-xl font-semibold text-slate-900">{post.title}</h4>
      <p className="mt-3 text-sm font-medium leading-relaxed text-gray-600">{post.message}</p>

      <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-indigo-100 pt-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <ThumbsUp size={14} />
          {post.helpful}
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <MessageCircle size={14} />
          {post.replies} respostas
        </div>
      </div>
    </div>
  );
}

function ForumPostCompact({ post }) {
  return (
    <div className="w-full rounded-[1.4rem] border border-gray-100 bg-gray-50 p-4 text-left transition hover:bg-white hover:shadow-sm">
      <div className="flex items-start gap-3">
        <ForumParticipantAvatar name={post.author} avatarUrl={post.avatar} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{post.author}</p>
            <span className="rounded bg-gray-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              {post.subject}
            </span>
          </div>
          <h5 className="mt-2 truncate text-base font-semibold text-slate-900">{post.title}</h5>
          <p className="mt-1 line-clamp-2 text-sm font-medium leading-relaxed text-gray-600">{post.message}</p>
          <div className="mt-3 flex items-center gap-4 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            <span>{post.createdAt}</span>
            <span>{post.replies} respostas</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForumPostFull({ post, expanded, onToggleReplies }) {
  return (
    <article className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ForumParticipantAvatar name={post.author} avatarUrl={post.avatar} className="h-11 w-11" />
          <div className="min-w-0">
            <h5 className="flex items-center gap-1 text-sm font-semibold text-gray-800">
              <span className="truncate">{post.author}</span>
              {post.badge ? <Shield size={12} className="text-blue-500" fill="currentColor" /> : null}
            </h5>
            <p className="text-[10px] font-bold text-gray-400">
              {post.createdAt} • {post.section}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {post.pinned ? (
            <span className="rounded-full bg-yellow-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-yellow-700">
              Fixado
            </span>
          ) : null}
          {post.solved ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
              Resolvido
            </span>
          ) : null}
          <button className="text-gray-400 hover:text-gray-600">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <span
            className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${
              String(post.category).toLowerCase().includes('dúvida') || String(post.category).toLowerCase().includes('duvida')
                ? 'bg-rose-50 text-rose-600'
                : post.category === 'Aviso'
                  ? 'bg-amber-50 text-amber-700'
                  : post.category === 'Resumo'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-gray-100 text-gray-600'
            }`}
          >
            {post.category}
          </span>
          <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            {post.subject}
          </span>
        </div>

        <h4 className="mb-2 text-xl font-semibold text-slate-900">{post.title}</h4>
        <p className="text-sm font-medium leading-relaxed text-gray-600">{post.message}</p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-5 border-y border-gray-100 py-4">
        <button className="group flex items-center gap-2 text-xs font-bold text-gray-500 transition-colors hover:text-blue-600">
          <ThumbsUp size={16} className="transition-transform group-hover:-translate-y-1" /> {post.helpful}
        </button>
        <button className="flex items-center gap-2 text-xs font-bold text-gray-500 transition-colors hover:text-indigo-600">
          <MessageCircle size={16} /> {post.replies} respostas
        </button>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <Eye size={16} /> {post.views} visualizações
        </div>
        <button className="ml-auto flex items-center gap-2 text-xs font-bold text-gray-500 transition-colors hover:text-gray-800">
          <Share2 size={16} /> Partilhar
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-[1.4rem] border border-indigo-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
          <div className="mb-3 flex items-center gap-3">
            <ForumParticipantAvatar name={post.author} avatarUrl={post.avatar} className="h-9 w-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-800">{post.author}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Responder no tópico</p>
            </div>
          </div>

          <textarea
            rows="3"
            placeholder="Escreve uma resposta, complementa a explicação ou salva um colega do desespero..."
            className="w-full resize-none rounded-2xl border border-gray-200 bg-white p-4 text-sm font-medium text-gray-700 outline-none transition focus:border-indigo-500"
          />

          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-2">
              <button className="rounded-lg p-2 text-gray-400 transition hover:text-indigo-600">
                <Camera size={16} />
              </button>
              <button className="rounded-lg p-2 text-gray-400 transition hover:text-indigo-600">
                <Target size={16} />
              </button>
            </div>

            <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">
              <Send size={14} />
              Responder
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Comentários</p>
            <h5 className="mt-1 text-lg font-semibold text-slate-900">{post.comments?.length || 0} respostas principais</h5>
          </div>

          <button
            type="button"
            onClick={onToggleReplies}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {expanded ? 'Ocultar respostas' : 'Ver comentários'}
          </button>
        </div>

        {expanded ? (
          <div className="space-y-4">
            {(post.comments || []).map((comment) => (
              <CommentThread key={comment.id} comment={comment} />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function CommentThread({ comment, level = 0 }) {
  const [showChildren, setShowChildren] = useState(true);

  return (
    <div className={`${level > 0 ? 'ml-6 border-l border-indigo-100 pl-4' : ''}`}>
      <div className="rounded-[1.4rem] border border-gray-100 bg-gray-50 p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ForumParticipantAvatar name={comment.author} avatarUrl={comment.avatar} className="h-9 w-9" />
            <div className="min-w-0">
              <h6 className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                <span className="truncate">{comment.author}</span>
                {comment.badge ? <Shield size={11} className="text-blue-500" fill="currentColor" /> : null}
              </h6>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{comment.createdAt}</p>
            </div>
          </div>

          <button className="text-gray-400 transition hover:text-gray-600">
            <MoreHorizontal size={16} />
          </button>
        </div>

        <p className="text-sm font-medium leading-relaxed text-gray-600">{comment.content}</p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-bold text-gray-500">
          <button className="inline-flex items-center gap-2 transition hover:text-blue-600">
            <ThumbsUp size={14} />
            {comment.likes || 0}
          </button>
          <button className="transition hover:text-indigo-600">Responder</button>
          {(comment.children || []).length ? (
            <button
              type="button"
              onClick={() => setShowChildren((prev) => !prev)}
              className="transition hover:text-indigo-600"
            >
              {showChildren ? 'Ocultar aninhadas' : `Ver aninhadas (${comment.children.length})`}
            </button>
          ) : null}
        </div>
      </div>

      {showChildren && (comment.children || []).length ? (
        <div className="mt-3 space-y-3">
          {comment.children.map((child) => (
            <CommentThread key={child.id} comment={child} level={level + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TeacherCard({ teacher }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm transition-all hover:shadow-lg">
      <div className="relative h-20 bg-gradient-to-r from-slate-100 via-white to-blue-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_34%)]" />
        <div className="absolute -bottom-10 left-6 h-20 w-20 rounded-2xl border-4 border-white bg-white p-1 shadow-md">
          {teacher.avatar ? (
            <img src={teacher.avatar} alt={teacher.name} className="h-full w-full rounded-xl object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-blue-100 font-semibold text-blue-700">
              {String(teacher.name || 'P').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 pt-14">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-xl font-semibold leading-tight text-slate-900">{teacher.name}</h3>
            <p className="mt-1 break-words text-sm font-medium leading-relaxed text-gray-500">{teacher.subject}</p>
          </div>
          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-blue-600">
            Selo Papirando
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-slate-50 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Selo · matéria</p>
            <p className="mt-2 break-words text-sm font-semibold leading-snug text-slate-700">{teacher.subject}</p>
            {teacher.bio ? <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">{teacher.bio}</p> : null}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-slate-50 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Ambiente</p>
            <span className="mt-2 inline-flex w-fit rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-700">
              Esquadrão Papirando
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherMiniCard({ teacher }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-3 transition-colors hover:bg-white">
      <div className="h-12 w-12 rounded-full bg-white p-1 shadow-sm">
        {teacher.avatar ? (
          <img src={teacher.avatar} alt={teacher.name} className="h-full w-full rounded-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
            {String(teacher.name || 'P').charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">{teacher.name}</p>
        <p className="break-words text-[10px] font-bold text-gray-400">{teacher.subject}</p>
      </div>
    </div>
  );
}

function SummaryInfo({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function RankingRow({ item }) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl p-4 transition-colors ${item.rank === 1 ? 'relative overflow-hidden border border-yellow-200 bg-gradient-to-r from-yellow-50 to-white shadow-sm' : 'border border-gray-100 bg-white hover:bg-gray-50'}`}>
      {item.rank === 1 ? <div className="absolute bottom-0 left-0 top-0 w-1 bg-yellow-400" /> : null}

      <div className="relative">
        <div className={`rounded-full bg-white p-1 ${item.rank === 1 ? 'h-12 w-12 border-2 border-yellow-400' : item.rank === 2 ? 'h-10 w-10 border-2 border-gray-300' : 'h-10 w-10 border-2 border-orange-300'}`}>
          {item.avatar ? (
            <img src={item.avatar} alt={item.name} className="h-full w-full rounded-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {String(item.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className={`absolute -bottom-2 -right-2 flex items-center justify-center rounded-full border-2 border-white text-white ${item.rank === 1 ? 'h-6 w-6 bg-yellow-500 text-xs font-semibold' : item.rank === 2 ? 'h-5 w-5 bg-gray-400 text-[10px] font-semibold' : 'h-5 w-5 bg-orange-400 text-[10px] font-semibold'}`}>
          {item.rank}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className={`truncate text-sm ${item.rank === 1 ? 'font-semibold text-gray-800' : 'font-bold text-gray-700'}`}>{item.name}</p>
        <p className="text-[10px] font-bold text-gray-400">{item.tier}</p>
      </div>

      <div className="text-right">
        <p className={`text-sm font-semibold ${item.rank === 1 ? 'text-yellow-600' : 'text-gray-600'}`}>{item.metric}</p>
        <p className={`text-[9px] font-bold uppercase tracking-widest ${item.rank === 1 ? 'text-yellow-500' : 'text-gray-400'}`}>XP</p>
      </div>
    </div>
  );
}

function MembersHero({ squad, canManageSquad }) {
  return (
    <div className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white shadow-xl shadow-indigo-900/15">
      <div className="pointer-events-none absolute -top-10 right-0 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-yellow-400 bg-yellow-500 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white shadow-sm">
            <Users size={12} />
            Turma e selos
          </div>
          <h3 className="mt-4 text-3xl font-semibold tracking-tight">Quem faz parte do esquadrão</h3>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-indigo-200">
            Na Configurações do curso você convida gente nova, distribui o selo de professor e abre o fluxo de permissões por pessoa — tudo na lista abaixo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ForumBadge label="Total" value={String(squad?.members || 0)} />
          <ForumBadge label="Gestão" value={canManageSquad ? 'Ativa' : 'Restrita'} />
        </div>
      </div>
    </div>
  );
}

function MemberManagementRow({ member, canManageSquad, onToggleProfessor, onOpenPermissions }) {
  const isProfessor =
    String(member.role || '').toLowerCase().includes('professor') ||
    String(member.role || '').toLowerCase().includes('dono');

  return (
    <div className="flex flex-col gap-4 rounded-[1.5rem] border border-gray-100 bg-gray-50 p-4 lg:flex-row lg:items-center">
      <div className="flex flex-1 items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-white p-1 shadow-sm">
          {member.avatar ? (
            <img src={member.avatar} alt={member.name} className="h-full w-full rounded-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {String(member.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-800">{member.name}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{member.role}</p>
          {member.subject ? (
            <p className="mt-0.5 text-[11px] font-semibold text-indigo-600">Matéria: {member.subject}</p>
          ) : null}
          {member.email ? <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{member.email}</p> : null}
          {member.joinedAt ? <p className="text-[10px] font-medium text-slate-400">Entrou: {member.joinedAt}</p> : null}
          {member.streakDays != null ? (
            <p className="text-[10px] font-semibold text-amber-700">Ofensiva: {member.streakDays} dias</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${
            isProfessor ? 'bg-blue-50 text-blue-600' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {isProfessor ? 'Selo professor' : 'Aluno'}
        </span>

        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
          {member.tag}
        </span>

        {canManageSquad ? (
          <>
            <button
              type="button"
              onClick={() => onToggleProfessor?.(member)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {isProfessor ? 'Remover selo' : 'Dar selo'}
            </button>
            <button
              type="button"
              onClick={() => onOpenPermissions?.()}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Permissões
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function AdminHero({ squad }) {
  return (
    <div className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#102347] via-[#17346a] to-indigo-900 p-6 text-white shadow-xl shadow-indigo-900/15">
      <div className="pointer-events-none absolute -top-14 right-0 h-44 w-44 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl" />
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-yellow-400 bg-yellow-500 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white shadow-sm">
            <Wrench size={12} />
            Administração do esquadrão
          </div>
          <h3 className="mt-4 text-3xl font-semibold tracking-tight">Painel de controle interno</h3>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-indigo-200">
            Tudo que o dono precisa para organizar pessoas, controlar publicações e manter o esquadrão nos trilhos.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ForumBadge label="Professores" value={String(squad?.teachers?.length || 0)} />
          <ForumBadge label="Membros" value={String(squad?.members || 0)} />
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ icon, title, subtitle, children }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            {icon}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
            <p className="mt-1 text-sm font-medium text-gray-500">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function AdminMemberRow({ member, onManagePermissions }) {
  const role = String(member.role || '');
  const isOwner = role.toLowerCase().includes('dono');
  const isProfessor = role.toLowerCase().includes('professor') || isOwner;

  return (
    <div className="flex flex-col gap-4 rounded-[1.5rem] border border-gray-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 transition hover:shadow-sm lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-white p-1 shadow-sm">
          {member.avatar ? (
            <img src={member.avatar} alt={member.name} className="h-full w-full rounded-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {String(member.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-800">{member.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${
                isOwner
                  ? 'bg-amber-50 text-amber-700'
                  : isProfessor
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              {role}
            </span>
            {member.tag ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
                {member.tag}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onManagePermissions}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-gray-700 transition hover:bg-gray-50"
      >
        Gerir permissões
      </button>
    </div>
  );
}

function ActionChip({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-700 transition hover:bg-gray-50"
    >
      {label}
    </button>
  );
}

function AdminActionCard({ title, helper, badge, onClick }) {
  return (
    <div className="flex min-h-[236px] flex-col rounded-[1.5rem] border border-gray-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h5 className="pr-2 text-lg font-semibold leading-tight text-slate-900">{title}</h5>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
          {badge}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium leading-7 text-gray-500">{helper}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-auto inline-flex items-center gap-2 self-start rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-950"
      >
        Abrir fluxo
      </button>
    </div>
  );
}

function PermissionItem({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <span className="text-sm font-bold text-gray-700">{label}</span>
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
        {value}
      </span>
    </div>
  );
}

function AdminMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}


function AdminCommandCard({ icon, title, description, actionLabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[228px] h-full flex-col rounded-[1.6rem] border border-gray-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
        {icon}
      </div>
      <h4 className="mt-5 text-lg font-semibold leading-tight tracking-tight text-slate-900">{title}</h4>
      <p className="mt-3 text-sm font-medium leading-relaxed text-gray-500">{description}</p>
      <span className="mt-auto inline-flex items-center gap-2 pt-4 text-xs font-semibold uppercase tracking-widest text-indigo-600">
        {actionLabel}
        <ArrowRight size={13} />
      </span>
    </button>
  );
}

function AdminMetricTone({ label, value, tone = 'blue' }) {
  const toneMap = {
    blue: 'border-indigo-100 bg-indigo-50 text-indigo-700',
    gold: 'border-amber-100 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneMap[tone] || toneMap.blue}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold leading-none">{value}</p>
    </div>
  );
}

function AdminDangerZone({ onDelete }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-red-200 bg-[linear-gradient(180deg,#fff8f8_0%,#ffffff_100%)] shadow-sm">
      <div className="border-b border-red-100 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-500">Danger zone</p>
            <h4 className="mt-1 text-lg font-semibold text-slate-900">Excluir esquadrão</h4>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Área separada para ação crítica. Nada de misturar isso com o resto e clicar errado num dia torto.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(220,38,38,0.18)] transition hover:bg-red-700"
        >
          Excluir esquadrão
        </button>
      </div>
    </section>
  );
}

function PaginationBar({ page, totalPages, onPrev, onNext, onPick }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Paginação</p>
          <h4 className="mt-1 text-lg font-semibold text-slate-900">Página {page} de {totalPages}</h4>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={page <= 1}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="inline-flex items-center gap-2">
              <ArrowLeft size={14} />
              Anterior
            </span>
          </button>

          {pages.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPick(item)}
              className={`h-10 min-w-10 rounded-xl px-3 text-sm font-semibold transition ${
                item === page ? 'bg-slate-900 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item}
            </button>
          ))}

          <button
            type="button"
            onClick={onNext}
            disabled={page >= totalPages}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="inline-flex items-center gap-2">
              Próxima
              <ArrowRight size={14} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminFlowModal({ flow, onChange, onClose, onSubmit, members = [] }) {
  const isNotice = flow.type === 'notice';
  const isActivity = flow.type === 'activity';
  const isSimulado = flow.type === 'simulado';
  const isInvite = flow.type === 'invite-student';
  const isTeacher = flow.type === 'add-teacher';
  const isPermissions = flow.type === 'permissions';

  const titleMap = {
    notice: 'Fixar aviso no mural',
    activity: 'Publicar atividade',
    simulado: 'Publicar simulado',
    'invite-student': 'Convidar aluno',
    'add-teacher': 'Adicionar professor',
    permissions: 'Gerir permissões',
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-md">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(2,6,23,0.24)]">
        <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">ADM do esquadrão</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{titleMap[flow.type] || 'Fluxo interno'}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-6">
          {(isNotice || isActivity || isSimulado) ? (
            <input
              type="text"
              value={flow.title}
              onChange={(event) => onChange((prev) => ({ ...prev, title: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="Título principal"
            />
          ) : null}

          {isActivity ? (
            <select
              value={flow.status}
              onChange={(event) => onChange((prev) => ({ ...prev, status: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option>Aberta</option>
              <option>Programada</option>
              <option>Pendente</option>
              <option>Fechada</option>
            </select>
          ) : null}

          {isSimulado ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="date"
                value={flow.date}
                onChange={(event) => onChange((prev) => ({ ...prev, date: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <input
                type="time"
                value={flow.time}
                onChange={(event) => onChange((prev) => ({ ...prev, time: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          ) : null}

          {isActivity ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="date"
                value={flow.dueDate}
                onChange={(event) => onChange((prev) => ({ ...prev, dueDate: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <input
                type="time"
                value={flow.dueTime}
                onChange={(event) => onChange((prev) => ({ ...prev, dueTime: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          ) : null}

          {(isActivity || isSimulado) ? (
            <input
              type="text"
              value={flow.helper}
              onChange={(event) => onChange((prev) => ({ ...prev, helper: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="Descrição operacional"
            />
          ) : null}

          {isNotice ? (
            <textarea
              rows="4"
              value={flow.description}
              onChange={(event) => onChange((prev) => ({ ...prev, description: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="Escreva o comunicado que será fixado no mural"
            />
          ) : null}

          {(isNotice || isActivity || isSimulado) ? (
            <label className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600">
              Anexo opcional
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="mt-2 block w-full text-xs font-medium text-slate-500"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const dataUrl = await fileToDataUrl(file);
                  onChange((prev) => ({
                    ...prev,
                    attachmentName: file.name,
                    attachmentUrl: dataUrl,
                  }));
                }}
              />
              {flow.attachmentName ? (
                <span className="mt-3 block text-xs font-semibold uppercase tracking-widest text-blue-700">
                  {flow.attachmentName}
                </span>
              ) : null}
            </label>
          ) : null}

          {isInvite ? (
            <input
              type="text"
              value={flow.inviteName}
              onChange={(event) => onChange((prev) => ({ ...prev, inviteName: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="Nome do aluno convidado"
            />
          ) : null}

          {isTeacher ? (
            <>
              <input
                type="text"
                value={flow.teacherName}
                onChange={(event) => onChange((prev) => ({ ...prev, teacherName: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Nome do professor"
              />
              <input
                type="text"
                value={flow.teacherSubject}
                onChange={(event) => onChange((prev) => ({ ...prev, teacherSubject: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Matéria ou responsabilidade"
              />
            </>
          ) : null}

          {isPermissions ? (
            <>
              <select
                value={flow.memberId}
                onChange={(event) => onChange((prev) => ({ ...prev, memberId: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Selecionar membro</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} · {member.role}
                  </option>
                ))}
              </select>
              <select
                value={flow.permissionScope}
                onChange={(event) => onChange((prev) => ({ ...prev, permissionScope: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                {PERMISSION_SCOPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {flow.permissionScope === 'Professor' ? (
                <input
                  type="text"
                  value={flow.teacherSubject}
                  onChange={(event) => onChange((prev) => ({ ...prev, teacherSubject: event.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Matéria do professor, se for promover"
                />
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-2xl bg-[linear-gradient(135deg,#1e3a8a,#2563eb)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.26)] transition hover:brightness-105"
          >
            Salvar fluxo
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateSquadModal({ form, onChange, onClose, onSubmit, focusOptions = [] }) {
  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-md">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(2,6,23,0.24)]">
        <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Professor e cursinho</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Novo esquadrão</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <input
            type="text"
            value={form.name}
            onChange={(event) => onChange((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            placeholder="Nome do esquadrão"
          />

          <select
            value={form.focus}
            onChange={(event) => onChange((prev) => ({ ...prev, focus: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Selecionar concurso foco</option>
            {focusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={form.visibility}
            onChange={(event) => onChange((prev) => ({ ...prev, visibility: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option>Privado</option>
            <option>Por convite</option>
            <option>Publico para assinantes</option>
          </select>

          <input
            type="text"
            value={form.inviteCode}
            onChange={(event) => onChange((prev) => ({ ...prev, inviteCode: event.target.value.toUpperCase() }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            placeholder="Codigo de entrada do esquadrao"
          />

          <textarea
            rows="4"
            value={form.description}
            onChange={(event) => onChange((prev) => ({ ...prev, description: event.target.value }))}
            className="md:col-span-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            placeholder="Descreva a proposta da turma, metodologia, rotina e objetivo do esquadrao"
          />

          <label className="md:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600">
            Upload da foto/capa
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-xs font-medium text-slate-500"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const dataUrl = await fileToDataUrl(file);
                onChange((prev) => ({ ...prev, coverUrl: dataUrl }));
              }}
            />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-2xl bg-[linear-gradient(135deg,#1e3a8a,#2563eb)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.26)] transition hover:brightness-105"
          >
            Criar esquadrão
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ squadName, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_100px_rgba(2,6,23,0.24)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-500">Confirmação</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Excluir esquadrão?</h3>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
          Você está prestes a remover <span className="font-semibold text-slate-800">{squadName}</span>. Essa ação apaga o vínculo da equipe na sua área interna.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(220,38,38,0.22)] transition hover:bg-red-700"
          >
            Sim, excluir
          </button>
        </div>
      </div>
    </div>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
