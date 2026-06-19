import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
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
  Plus,
  Search,
  Send,
  Shield,
  Sparkles,
  Star,
  ThumbsUp,
  Trophy,
  UserPlus,
  Users,
  Wrench,
  X,
  Clock3,
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

const CURSINHO_ROLE_OPTIONS = ['Diretor', 'Coordenador', 'Professor', 'Aluno'];

/** Gera código de convite criptograficamente seguro: ESQ-XXXXXXXX (12 chars) */
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const random = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => chars[b % chars.length])
    .join('');
  return `ESQ-${random}`;
}

function normalizeRoleLabel(role) {
  const value = String(role || '').trim().toLowerCase();
  if (value.includes('diretor') || value.includes('dono')) return 'Diretor';
  if (value.includes('coordenador') || value.includes('coordena')) return 'Coordenador';
  if (value.includes('professor')) return 'Professor';
  return 'Aluno';
}

function getRolePillStyle(role) {
  const normalized = normalizeRoleLabel(role);
  if (normalized === 'Diretor') {
    return { border: '1px solid var(--pl-warn)', background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)' };
  }
  if (normalized === 'Coordenador') {
    return { border: '1px solid var(--pl-accent)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' };
  }
  if (normalized === 'Professor') {
    return { border: '1px solid var(--pl-accent)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' };
  }
  return { border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-2)' };
}

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

  return dedupeById([
    {
      id: `owner-${squad?.id || 'squad'}`,
      name: ownerName,
      role: 'Diretor',
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
      : [
          {
            id: `teacher-${squad.id || 'squad'}-owner`,
            name: ownerName,
            subject: 'Coordenação geral',
            avatar: '',
          },
        ];

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
    members: Math.max(Number(squad.members || 0), roster.length || 1),
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

function buildDemoEngagementSquad(displayName, profileAvatarUrl) {
  const owner = String(displayName || 'Coordenação PF').trim();
  const av = (u) => `https://i.pravatar.cc/150?u=${encodeURIComponent(u)}`;

  return normalizeSquad({
    id: 'demo-engajamento',
    name: 'Esquadrão PF 2026',
    owner,
    roleLabel: 'Professor',
    focus: 'Polícia Federal',
    description:
      'Simulação de cursinho altamente engajado: mural ativo, listas internas, simulados semanais e ranking por XP.',
    inviteCode: 'PF2026-ALFA',
    visibility: 'Privado',
    members: 214,
    rankingTier: 'Ouro',
    nextEvent: 'Plantão hoje · 19h · Constitucional',
    teachers: [
      { id: 't1', name: 'Prof. Marcelo Farias', subject: 'Penal', avatar: av('pf-marcelo'), bio: 'Ex-questões PF · foco em parte geral.' },
      { id: 't2', name: 'Profa. Ana Cordeiro', subject: 'Constitucional', avatar: av('pf-ana'), bio: 'Controle e ADI na prática de prova.' },
      { id: 't3', name: 'Prof. Bruno Mello', subject: 'RLM', avatar: av('pf-bruno'), bio: 'Raciocínio rápido para provas longas.' },
      { id: 't4', name: 'Profa. Helena Castro', subject: 'Português', avatar: av('pf-helena'), bio: 'Interpretação e concordância.' },
    ],
    notices: [
      {
        id: 'n1',
        title: 'Virada final — protocolo de revisão',
        text: 'Duas semanas decisivas: teoria curta de manhã, 80 questões à tarde, plantão à noite. Quem faltar a 2 simulados seguidos cai do ranking de presença.',
        publishedBy: 'Profa. Ana Cordeiro',
        publishedByAvatar: av('pf-ana'),
        publishedAtLabel: 'Hoje · 08:12',
        pinned: true,
      },
      {
        id: 'n2',
        title: 'Plantão de dúvidas (sala interna)',
        text: 'Hoje 20h: tratem número da questão e alternativa marcada. Professores respondem em thread única para não perder nada.',
        publishedBy: owner,
        publishedByAvatar: profileAvatarUrl || av(owner),
        publishedAtLabel: 'Hoje · 07:45',
        pinned: false,
      },
      {
        id: 'n3',
        title: 'Regra do simulado PF 09',
        text: 'Prova única, sem pausa. Gabarito libera 30 min após o encerramento. Discussão só no fórum na tag Simulado.',
        publishedBy: 'Prof. Marcelo Farias',
        publishedByAvatar: av('pf-marcelo'),
        publishedAtLabel: 'Ontem · 18:20',
        pinned: false,
      },
      {
        id: 'n4',
        title: 'Banco de questões — novas listas',
        text: 'Subimos Constitucional 05 e Penal revisão 02. Prioridade para quem está abaixo de 75% de acerto em ADI.',
        publishedBy: owner,
        publishedByAvatar: profileAvatarUrl || av(owner),
        publishedAtLabel: 'Ontem · 11:02',
        pinned: false,
      },
      {
        id: 'n5',
        title: 'Comportamento no fórum interno',
        text: 'Sem print de prova de outras bancas com marca d’água de cursinho. Respeito e foco: dúvida objetiva, resposta objetiva.',
        publishedBy: owner,
        publishedByAvatar: profileAvatarUrl || av(owner),
        publishedAtLabel: '3 dias atrás',
        pinned: false,
      },
    ],
    activities: [
      {
        id: 'a1',
        title: 'Lista PF — Constitucional 05',
        status: 'Aberta',
        helper: '52 questões · ADI, controle concentrado e súmulas vinculantes.',
        dueDate: '24/04',
        dueTime: '22:00',
        publishedBy: 'Profa. Ana Cordeiro',
        publishedByAvatar: av('pf-ana'),
        publishedAtLabel: 'Há 2 h',
        questionPackId: 'q-1',
      },
      {
        id: 'a2',
        title: 'Penal — Concurso de pessoas (bloco seco)',
        status: 'Aberta',
        helper: '70 questões para cravar autor, coautor, partícipes e excludentes.',
        dueDate: '25/04',
        dueTime: '21:30',
        publishedBy: 'Prof. Marcelo Farias',
        publishedByAvatar: av('pf-marcelo'),
        publishedAtLabel: 'Há 5 h',
        questionPackId: 'q-2',
      },
      {
        id: 'a3',
        title: 'RLM — Proporções e regra de três composta',
        status: 'Aberta',
        helper: '40 questões com tempo cronometrado sugerido (35 min).',
        dueDate: '26/04',
        dueTime: '20:00',
        publishedBy: 'Prof. Bruno Mello',
        publishedByAvatar: av('pf-bruno'),
        publishedAtLabel: 'Ontem',
        questionPackId: 'q-3',
      },
      {
        id: 'a4',
        title: 'Português — concordância nominal profunda',
        status: 'Em revisão',
        helper: 'Lista comentada pela Profa. Helena na sexta.',
        dueDate: '28/04',
        dueTime: '23:59',
        publishedBy: 'Profa. Helena Castro',
        publishedByAvatar: av('pf-helena'),
        publishedAtLabel: 'Há 3 dias',
        questionPackId: 'q-4',
      },
    ],
    simulados: [
      {
        id: 's1',
        title: 'Simulado PF 09 — Caderno completo',
        date: '27/04',
        time: '14:00',
        dateLabel: '27/04 • 14:00',
        helper: '90 questões · todas as áreas · ranking interno na segunda.',
        publishedBy: owner,
        publishedByAvatar: profileAvatarUrl || av(owner),
        publishedAtLabel: 'Há 1 dia',
      },
      {
        id: 's2',
        title: 'Sprint noturno (45 questões)',
        date: '29/04',
        time: '19:30',
        dateLabel: '29/04 • 19:30',
        helper: 'Treino de resistência para provas longas.',
        publishedBy: 'Prof. Bruno Mello',
        publishedByAvatar: av('pf-bruno'),
        publishedAtLabel: 'Há 2 dias',
      },
      {
        id: 's3',
        title: 'Simulado extra — Penal + Constitucional',
        date: '02/05',
        time: '09:00',
        dateLabel: '02/05 • 09:00',
        helper: 'Foco em jurisprudência e súmulas dos últimos 24 meses.',
        publishedBy: 'Prof. Marcelo Farias',
        publishedByAvatar: av('pf-marcelo'),
        publishedAtLabel: 'Há 4 dias',
      },
    ],
    questionPosts: [
      { id: 'q-1', title: 'Lista PF — Constitucional 05', meta: '214 respostas · 81% acerto · média 48 min', tag: 'Constitucional', publishedBy: 'Profa. Ana Cordeiro', publishedByAvatar: av('pf-ana'), publishedAtLabel: 'Há 2 h', questionsCount: 52 },
      { id: 'q-2', title: 'Penal — Concurso de pessoas', meta: '198 respostas · 74% acerto', tag: 'Penal', publishedBy: 'Prof. Marcelo Farias', publishedByAvatar: av('pf-marcelo'), publishedAtLabel: 'Há 5 h', questionsCount: 70 },
      { id: 'q-3', title: 'RLM — Proporções avançadas', meta: '176 respostas · 69% acerto', tag: 'RLM', publishedBy: 'Prof. Bruno Mello', publishedByAvatar: av('pf-bruno'), publishedAtLabel: 'Ontem', questionsCount: 40 },
      { id: 'q-4', title: 'Português — Concordância', meta: '165 respostas · 77% acerto', tag: 'Português', publishedBy: 'Profa. Helena Castro', publishedByAvatar: av('pf-helena'), publishedAtLabel: 'Ontem', questionsCount: 38 },
      { id: 'q-5', title: 'Atualidades — Janeiro a abril', meta: '142 respostas · 72% acerto', tag: 'Atualidades', publishedBy: owner, publishedByAvatar: profileAvatarUrl || av(owner), publishedAtLabel: 'Há 2 dias', questionsCount: 30 },
      { id: 'q-6', title: 'Simulado PF 08 — revisão comentada', meta: '189 tentativas · gabarito liberado', tag: 'Simulado', publishedBy: owner, publishedByAvatar: profileAvatarUrl || av(owner), publishedAtLabel: 'Há 3 dias', questionsCount: 90 },
      { id: 'q-7', title: 'Informativos STF — bloco 12', meta: '128 respostas · 68% acerto', tag: 'Constitucional', publishedBy: 'Profa. Ana Cordeiro', publishedByAvatar: av('pf-ana'), publishedAtLabel: 'Há 4 dias', questionsCount: 25 },
      { id: 'q-8', title: 'Desafio semanal — misto 60q', meta: '240 respostas · ranking por tempo', tag: 'Misto', publishedBy: 'Prof. Bruno Mello', publishedByAvatar: av('pf-bruno'), publishedAtLabel: 'Há 5 dias', questionsCount: 60 },
    ],
    internalRanking: [
      { id: 'r1', name: 'Livia Nogueira', metric: '14.280 XP', tier: 'Diamante', avatar: av('livia-n'), rank: 1 },
      { id: 'r2', name: 'Ana Clara', metric: '13.940 XP', tier: 'Ouro', avatar: av('ana-clara'), rank: 2 },
      { id: 'r3', name: 'Mateus Freire', metric: '13.210 XP', tier: 'Ouro', avatar: av('mateus-f'), rank: 3 },
      { id: 'r4', name: 'João Victor', metric: '12.880 XP', tier: 'Ouro', avatar: av('joao-v'), rank: 4 },
      { id: 'r5', name: 'Sara Dantas', metric: '12.100 XP', tier: 'Prata', avatar: av('sara-d'), rank: 5 },
      { id: 'r6', name: 'Daniel Souza', metric: '11.650 XP', tier: 'Prata', avatar: av('daniel-s'), rank: 6 },
      { id: 'r7', name: 'Lara Mendes', metric: '11.200 XP', tier: 'Prata', avatar: av('lara-m'), rank: 7 },
      { id: 'r8', name: 'Ricardo Prado', metric: '10.400 XP', tier: 'Bronze', avatar: av('ricardo-p'), rank: 8 },
    ],
    permissions: { ...DEFAULT_SQUAD_PERMISSIONS },
    roster: [
      { id: 'm-owner', name: owner, role: 'Diretor', tag: 'Gestão total', avatar: profileAvatarUrl || av(owner), subject: 'Coordenação', email: `${owner.split(' ')[0]?.toLowerCase() || 'coord'}@cursopf.demo`, joinedAt: 'Desde o lançamento' },
      { id: 'm-t1', name: 'Prof. Marcelo Farias', role: 'Professor principal', tag: 'Selo professor · Penal', avatar: av('pf-marcelo'), subject: 'Penal', email: 'marcelo.farias@cursopf.demo', joinedAt: 'Jan/2026' },
      { id: 'm-t2', name: 'Profa. Ana Cordeiro', role: 'Professor', tag: 'Selo professor · Const.', avatar: av('pf-ana'), subject: 'Constitucional', email: 'ana.cordeiro@cursopf.demo', joinedAt: 'Jan/2026' },
      { id: 'm-t3', name: 'Prof. Bruno Mello', role: 'Professor', tag: 'Selo professor · RLM', avatar: av('pf-bruno'), subject: 'RLM', email: 'bruno.mello@cursopf.demo', joinedAt: 'Fev/2026' },
      { id: 'm-t4', name: 'Profa. Helena Castro', role: 'Professor', tag: 'Selo professor · Port.', avatar: av('pf-helena'), subject: 'Português', email: 'helena.castro@cursopf.demo', joinedAt: 'Fev/2026' },
      { id: 'm-mon', name: 'Carla Menezes', role: 'Monitora', tag: 'Suporte e correção', avatar: av('carla-mon'), subject: 'Monitoria', email: 'carla.menezes@cursopf.demo', joinedAt: 'Mar/2026' },
      { id: 'm-a1', name: 'Livia Nogueira', role: 'Aluna', tag: 'Top 1 XP', avatar: av('livia-n'), subject: '', email: 'livia.n@email.demo', joinedAt: 'Jan/2026', streakDays: 18 },
      { id: 'm-a2', name: 'Ana Clara', role: 'Aluna', tag: 'Presença 98%', avatar: av('ana-clara'), subject: '', email: 'ana.clara@email.demo', joinedAt: 'Jan/2026', streakDays: 12 },
      { id: 'm-a3', name: 'Mateus Freire', role: 'Aluno', tag: 'Simulados: 12 feitos', avatar: av('mateus-f'), subject: '', email: 'mateus.f@email.demo', joinedAt: 'Fev/2026', streakDays: 9 },
      { id: 'm-a4', name: 'João Victor', role: 'Aluno', tag: 'Fórum: 34 posts', avatar: av('joao-v'), subject: '', email: 'joao.v@email.demo', joinedAt: 'Fev/2026', streakDays: 7 },
      { id: 'm-a5', name: 'Sara Dantas', role: 'Aluna', tag: 'Redação em evolução', avatar: av('sara-d'), subject: '', email: 'sara.d@email.demo', joinedAt: 'Mar/2026', streakDays: 5 },
      { id: 'm-a6', name: 'Daniel Souza', role: 'Aluno', tag: 'Listas em dia', avatar: av('daniel-s'), subject: '', email: 'daniel.s@email.demo', joinedAt: 'Mar/2026', streakDays: 4 },
    ],
  });
}

function getInternalSections(canManageSquad) {
  const base = [
    { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
    { id: 'forum', label: 'Fórum', icon: MessageCircle },
    { id: 'mural', label: 'Mural', icon: Megaphone },
    { id: 'cronograma', label: 'Cronograma', icon: CalendarDays },
    { id: 'praticas', label: 'Práticas', icon: ClipboardList },
    { id: 'simulados', label: 'Simulados', icon: Trophy },
    { id: 'configuracao', label: 'Configuração', icon: Shield },
    { id: 'membros', label: 'Membros', icon: Users },
    { id: 'ranking', label: 'Ranking', icon: Crown },
  ];

  if (canManageSquad) {
    base.push({ id: 'admin', label: 'ADM do esquadrão', icon: Wrench });
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
  const [forumFocusedPostId, setForumFocusedPostId] = useState('');
  const [newForumPost, setNewForumPost] = useState('');
  const [selectedSimuladoId, setSelectedSimuladoId] = useState('');
  const [simuladoAttemptsByUser, setSimuladoAttemptsByUser] = useState({});
  const [newTurmaName, setNewTurmaName] = useState('');
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
  const squadSwitcherMenuRef = useRef(null);
  const [squadSwitcherMenuBox, setSquadSwitcherMenuBox] = useState(null);

  const displayName = useMemo(() => {
    if (String(profile?.nome || '').trim()) return String(profile.nome).trim();
    if (String(currentUsername || '').trim()) return currentUsername;
    return String(currentUserEmail || 'aluno').split('@')[0];
  }, [currentUsername, currentUserEmail, profile]);

  const profileAvatarUrl = useMemo(
    () => String(profile?.avatar_url || '').trim() || `https://i.pravatar.cc/150?u=${encodeURIComponent(displayName)}`,
    [displayName, profile]
  );

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

      // Filtra por category_slug='esquadrao': sem isso, posts do fórum (category_slug='forum',
      // mesmo community_scope) eram lidos como esquadrões e viravam "esquadrões-fantasma".
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('community_scope', 'Esquadrão')
        .eq('category_slug', 'esquadrao')
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
        return local ? normalizeSquad({ ...remote, ...local }) : remote;
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
      return [buildDemoEngagementSquad(displayName, profileAvatarUrl)].filter(Boolean);
    }

    const mine = squads.filter(
      (item) =>
        membershipIds.has(String(item.id)) ||
        String(item.owner || '').trim().toLowerCase() === displayLower
    );
    if (mine.length) return mine.map(normalizeSquad).filter(Boolean);
    return [buildDemoEngagementSquad(displayName, profileAvatarUrl)].filter(Boolean);
  }, [displayName, memberships, profileAvatarUrl, remoteSquads, squads, usingRemoteSquads]);

  const selectedSquad =
    accessibleSquads.find((item) => item.id === selectedSquadId) ||
    accessibleSquads[0] ||
    null;

  useEffect(() => {
    if (!selectedSquad) return undefined;
    const frame = window.requestAnimationFrame(() => {
      setAdminEdit({
        name: String(selectedSquad.name || '').trim(),
        focus: String(selectedSquad.focus || '').trim(),
        description: String(selectedSquad.description || '').trim(),
        inviteCode: String(selectedSquad.inviteCode || '').trim(),
        visibility: String(selectedSquad.visibility || 'Privado').trim(),
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedSquad]);

  const isSquadOwner = Boolean(
    selectedSquad &&
      String(selectedSquad.owner || '').trim().toLowerCase() === String(displayName || '').trim().toLowerCase()
  );
  const canManageSquad = Boolean(
    selectedSquad &&
      (memberships.find((item) => item.id === selectedSquad.id)?.role === 'Professor' || isSquadOwner)
  );
  const canAssignRoles = isSquadOwner;
  const squadPermissions = selectedSquad?.permissions || DEFAULT_SQUAD_PERMISSIONS;
  const canPublishActivities = canManageSquad && squadPermissions.publishActivities !== false;
  const canPublishSimulados = canManageSquad && squadPermissions.publishSimulados !== false;
  const canPinNotices = canManageSquad && squadPermissions.pinNotices !== false;
  const canManageTeachers = canManageSquad && squadPermissions.manageTeachers !== false;
  const roleHierarchyDetail = [
    {
      role: 'Diretor',
      summary: 'Responsável máximo pelo cursinho, governança e regras da operação.',
      can: [
        'Configurar papéis, turmas, permissões e regras globais.',
        'Editar dados do esquadrão, convites e visibilidade.',
        'Aprovar coordenação/professores e acessar ADM completo.',
      ],
    },
    {
      role: 'Coordenador',
      summary: 'Gestão acadêmica da operação: calendário, simulados e acompanhamento das turmas.',
      can: [
        'Organizar cronograma, práticas e simulados.',
        'Acompanhar notas e repassar ajustes para professores.',
        'Atuar na moderação e comunicação da turma.',
      ],
    },
    {
      role: 'Professor',
      summary: 'Docente responsável por conteúdo, gabarito comentado e orientação pedagógica.',
      can: [
        'Publicar práticas e simulados na(s) turma(s) vinculada(s).',
        'Corrigir tentativa única do aluno e comentar questões.',
        'Responder dúvidas no fórum interno.',
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
  const displayNotices = (selectedSquad?.notices || []).length
    ? selectedSquad.notices
    : [
        {
          id: 'demo-notice-1',
          title: 'Plano intensivo da semana liberado',
          text: 'Foco total em Constitucional, Penal e RLM. Meta: 3 blocos por dia + revisão ativa à noite.',
          publishedBy: selectedSquad?.owner || 'Coordenação',
          publishedByAvatar: profileAvatarUrl,
          publishedAtLabel: 'Hoje · 09:00',
          pinned: true,
        },
        {
          id: 'demo-notice-2',
          title: 'Plantão de dúvidas hoje às 20h',
          text: 'Equipe de professores vai responder dúvidas de questões e estratégia de prova ao vivo.',
          publishedBy: 'Equipe pedagógica',
          publishedByAvatar: '',
          publishedAtLabel: 'Hoje · 08:15',
          pinned: false,
        },
      ];
  const displayActivities = useMemo(
    () =>
      (selectedSquad?.activities || []).length
        ? selectedSquad.activities
        : [
        {
          id: 'demo-activity-1',
          title: 'Lista PF - Constitucional 04',
          status: 'Aberta',
          helper: '45 questões com foco em controle de constitucionalidade e jurisprudência recente.',
          dueDate: '24/04',
          dueTime: '22:00',
          publishedBy: selectedSquad?.teachers?.[1]?.name || 'Professor',
          publishedByAvatar: selectedSquad?.teachers?.[1]?.avatar || '',
          publishedAtLabel: 'Há 3 h',
          questionPackId: 'q-1',
        },
        {
          id: 'demo-activity-2',
          title: 'Bateria seca de Penal',
          status: 'Aberta',
          helper: '70 itens de fixação para consolidar parte geral e concurso de pessoas.',
          dueDate: '25/04',
          dueTime: '21:30',
          publishedBy: selectedSquad?.teachers?.[0]?.name || 'Professor',
          publishedByAvatar: selectedSquad?.teachers?.[0]?.avatar || '',
          publishedAtLabel: 'Ontem',
          questionPackId: 'q-2',
        },
        ],
    [selectedSquad]
  );
  const displaySimulados = useMemo(
    () =>
      (selectedSquad?.simulados || []).length
        ? selectedSquad.simulados
        : [
        {
          id: 'demo-sim-1',
          title: 'Simulado PF 09',
          date: '27/04',
          dateLabel: '27/04 • 14:00',
          helper: 'Aplicação completa com correção guiada e análise por disciplina.',
          publishedBy: selectedSquad?.owner || 'Coordenação',
          publishedByAvatar: profileAvatarUrl,
          publishedAtLabel: 'Há 1 dia',
        },
        {
          id: 'demo-sim-2',
          title: 'Simulado Sprint Noturno',
          date: '30/04',
          dateLabel: '30/04 • 19:30',
          helper: 'Formato curto para aferir evolução semanal e calibrar revisão.',
          publishedBy: selectedSquad?.teachers?.[2]?.name || 'Professor',
          publishedByAvatar: selectedSquad?.teachers?.[2]?.avatar || '',
          publishedAtLabel: 'Há 2 dias',
        },
        ],
    [profileAvatarUrl, selectedSquad]
  );
  const selectedSimulado =
    displaySimulados.find((item) => String(item.id) === String(selectedSimuladoId)) || null;
  const attemptActorId = String(currentUserId || displayName || '').trim().toLowerCase();
  const simuladoAttemptKey = selectedSimulado ? `${selectedSquad?.id || 'squad'}:${selectedSimulado.id}:${attemptActorId}` : '';
  const simuladoAttempt = simuladoAttemptKey ? simuladoAttemptsByUser[simuladoAttemptKey] : null;
  const canReviewAsTeacher = canManageSquad;
  const displayRanking = (selectedSquad?.internalRanking || []).length
    ? selectedSquad.internalRanking
    : [
        { id: 'demo-rank-1', name: 'Livia Nogueira', metric: '1.340 XP', tier: 'Diamante', avatar: 'https://i.pravatar.cc/150?u=livia', rank: 1 },
        { id: 'demo-rank-2', name: 'Ana Clara', metric: '1.220 XP', tier: 'Ouro', avatar: 'https://i.pravatar.cc/150?img=5', rank: 2 },
        { id: 'demo-rank-3', name: 'Mateus Freire', metric: '1.170 XP', tier: 'Ouro', avatar: 'https://i.pravatar.cc/150?img=33', rank: 3 },
      ];
  const questionPosts = (selectedSquad?.questionPosts || []).length
    ? selectedSquad.questionPosts
    : [
        {
          id: 'q-1',
          title: 'Lista PF - Constitucional (bloco 04)',
          meta: '120 respostas · 84% acerto médio',
          tag: 'Constitucional',
          publishedBy: selectedSquad?.teachers?.[1]?.name || 'Professor',
          publishedByAvatar: selectedSquad?.teachers?.[1]?.avatar || '',
          publishedAtLabel: 'Há 2 h',
          questionsCount: 45,
        },
        {
          id: 'q-2',
          title: 'Penal - Concurso de pessoas',
          meta: '96 respostas · 76% acerto médio',
          tag: 'Penal',
          publishedBy: selectedSquad?.teachers?.[0]?.name || 'Professor',
          publishedByAvatar: selectedSquad?.teachers?.[0]?.avatar || '',
          publishedAtLabel: 'Ontem',
          questionsCount: 70,
        },
        {
          id: 'q-3',
          title: 'RLM - Proporções avançadas',
          meta: '88 respostas · 71% acerto médio',
          tag: 'RLM',
          publishedBy: selectedSquad?.teachers?.[2]?.name || 'Professor',
          publishedByAvatar: selectedSquad?.teachers?.[2]?.avatar || '',
          publishedAtLabel: 'Ontem',
          questionsCount: 40,
        },
        {
          id: 'q-4',
          title: 'Português - Sintaxe e regência',
          meta: '104 respostas · 79% acerto médio',
          tag: 'Português',
          publishedBy: selectedSquad?.owner || 'Coordenação',
          publishedByAvatar: profileAvatarUrl,
          publishedAtLabel: 'Há 3 dias',
          questionsCount: 38,
        },
      ];

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
      setForumFocusedPostId('');
      setNewForumPost('');
      setSelectedSimuladoId('');
      setAdminFlow(EMPTY_ADMIN_FLOW);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedSquad?.id]);

  const internalSections = useMemo(() => getInternalSections(canManageSquad), [canManageSquad]);

  useEffect(() => {
    if (!accessibleSquads.length) return;
    if (selectedSquadId && accessibleSquads.some((item) => item.id === selectedSquadId)) return;
    onSelectSquad?.(accessibleSquads[0]?.id || '');
  }, [accessibleSquads, onSelectSquad, selectedSquadId]);

  useLayoutEffect(() => {
    if (!showSquadSwitcher) {
      setSquadSwitcherMenuBox(null);
      return undefined;
    }
    const wrap = squadSwitcherWrapRef.current;
    if (!wrap) return undefined;

    function getScrollParent(el) {
      let p = el.parentElement;
      while (p) {
        const oy = window.getComputedStyle(p).overflowY;
        if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return p;
        p = p.parentElement;
      }
      return document.documentElement;
    }

    function updateMenuBox() {
      const r = wrap.getBoundingClientRect();
      const margin = 16;
      const width = Math.min(320, window.innerWidth - margin * 2);
      const left = Math.min(Math.max(margin, r.right - width), window.innerWidth - width - margin);
      setSquadSwitcherMenuBox({
        position: 'fixed',
        top: r.bottom + 8,
        left,
        width,
        maxHeight: 'min(22rem, 70vh)',
        zIndex: 200,
      });
    }

    updateMenuBox();
    const scrollParent = getScrollParent(wrap);
    scrollParent.addEventListener('scroll', updateMenuBox, { passive: true });
    window.addEventListener('resize', updateMenuBox);
    return () => {
      scrollParent.removeEventListener('scroll', updateMenuBox);
      window.removeEventListener('resize', updateMenuBox);
    };
  }, [showSquadSwitcher]);

  useEffect(() => {
    if (!showSquadSwitcher) return;
    function handlePointerDown(e) {
      const inWrap = squadSwitcherWrapRef.current?.contains(e.target);
      const inMenu = squadSwitcherMenuRef.current?.contains(e.target);
      if (!inWrap && !inMenu) setShowSquadSwitcher(false);
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
      <div className="pl-page">
        <div className="pl-card" style={{ minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ marginBottom: 16, display: 'flex', height: 56, width: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: 'var(--pl-accent-soft)', color: 'var(--pl-ink)' }}>
            <ShieldCheck size={26} />
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>Nenhum esquadrão disponível ainda.</h3>
          {isElite ? (
            <button
              type="button"
              onClick={() => setShowCreateSquad(true)}
              className="pl-btn pl-btn-primary"
              style={{ marginTop: 20 }}
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
    if (savedPosts.length) {
      return savedPosts;
    }

    return [
      {
        id: 'post-1',
        author: selectedSquad.owner || 'Professor',
        avatar: selectedSquad.teachers?.[0]?.avatar || '',
        section: selectedSquad.name,
        createdAt: 'Há 18 minutos',
        category: 'Aviso',
        subject: selectedSquad.focus,
        title: 'Direcionamento da semana',
        message: `Turma, esta semana o foco principal é ${selectedSquad.focus}. Priorizem teoria curta, bloco de questões, revisão dos erros e presença no simulado programado.`,
        replies: 12,
        helpful: 76,
        views: 214,
        badge: 'Professor',
        pinned: true,
        solved: false,
        comments: [
          {
            id: 'c1',
            author: 'Ana Clara',
            avatar: 'https://i.pravatar.cc/150?img=5',
            badge: '',
            createdAt: 'Há 10 min',
            content: 'Fechado. Vou priorizar Constitucional e revisão dos erros hoje.',
            likes: 7,
            children: [
              {
                id: 'c1-1',
                author: selectedSquad.owner || 'Professor',
                avatar: selectedSquad.teachers?.[0]?.avatar || '',
                badge: 'Professor',
                createdAt: 'Há 8 min',
                content: 'Boa. Mantém isso até o simulado e já sobe bastante.',
                likes: 10,
              },
            ],
          },
          {
            id: 'c2',
            author: 'Mateus Freire',
            avatar: 'https://i.pravatar.cc/150?img=33',
            badge: '',
            createdAt: 'Há 5 min',
            content: 'Vai ter bloco extra de Penal ou fica só no cronograma do mural?',
            likes: 3,
          },
        ],
      },
      {
        id: 'post-2',
        author: 'Ana Clara',
        avatar: 'https://i.pravatar.cc/150?img=5',
        section: selectedSquad.name,
        createdAt: 'Há 1 hora',
        category: 'Dúvida de Questão',
        subject: 'Constitucional',
        title: 'Dúvida sobre controle preventivo e repressivo',
        message:
          'Pessoal, na lista 01 fiquei na dúvida entre controle preventivo e repressivo. Alguém consegue explicar de forma mais objetiva?',
        replies: 6,
        helpful: 21,
        views: 88,
        badge: '',
        pinned: false,
        solved: true,
        comments: [
          {
            id: 'c3',
            author: 'Profa. Ana Cordeiro',
            avatar: selectedSquad.teachers?.[1]?.avatar || '',
            badge: 'Professor',
            createdAt: 'Há 55 min',
            content: 'Preventivo acontece antes da norma produzir efeitos; repressivo, depois. Guarda isso que já te salva em boa parte das questões.',
            likes: 14,
            children: [
              {
                id: 'c3-1',
                author: 'Ana Clara',
                avatar: 'https://i.pravatar.cc/150?img=5',
                badge: '',
                createdAt: 'Há 48 min',
                content: 'Agora clareou. Valeu demais.',
                likes: 4,
              },
            ],
          },
          {
            id: 'c4',
            author: 'Lara Mendes',
            avatar: 'https://i.pravatar.cc/150?img=45',
            badge: '',
            createdAt: 'Há 46 min',
            content: 'Eu decoro como “pré” e “pós” efeito da norma. Me ajuda bastante.',
            likes: 5,
          },
        ],
      },
      {
        id: 'post-3',
        author: selectedSquad.teachers?.[2]?.name || selectedSquad.teachers?.[1]?.name || 'Professor',
        avatar: selectedSquad.teachers?.[2]?.avatar || selectedSquad.teachers?.[1]?.avatar || '',
        section: selectedSquad.name,
        createdAt: 'Há 3 horas',
        category: 'Resumo',
        subject: 'Atualidades',
        title: 'Resumo rápido dos temas mais quentes da semana',
        message:
          'Publiquei um bloco resumido com os principais temas para revisão rápida. Vale usar antes da bateria de questões.',
        replies: 9,
        helpful: 43,
        views: 132,
        badge: 'Professor',
        pinned: false,
        solved: false,
        comments: [
          {
            id: 'c5',
            author: 'Daniel Souza',
            avatar: 'https://i.pravatar.cc/150?u=daniel',
            badge: '',
            createdAt: 'Há 2 h',
            content: 'Resumo objetivo. Li em 15 minutos e já fui direto pra bateria.',
            likes: 8,
          },
        ],
      },
      {
        id: 'post-4',
        author: 'Mateus Freire',
        avatar: 'https://i.pravatar.cc/150?img=33',
        section: selectedSquad.name,
        createdAt: 'Ontem',
        category: 'Dúvida',
        subject: 'Penal',
        title: 'Alguém tem macete para decorar concurso de pessoas?',
        message:
          'Estou travando nesse ponto e queria um resumo curto ou uma linha de raciocínio melhor.',
        replies: 4,
        helpful: 11,
        views: 56,
        badge: '',
        pinned: false,
        solved: false,
        comments: [
          {
            id: 'c6',
            author: 'Prof. Marcelo Farias',
            avatar: selectedSquad.teachers?.[0]?.avatar || '',
            badge: 'Professor',
            createdAt: 'Ontem',
            content: 'Pensa em autor, coautor e participação. Quem executa, quem ajuda e quem induz. Depois pendura as exceções.',
            likes: 12,
          },
        ],
      },
      {
        id: 'post-5',
        author: selectedSquad.teachers?.[1]?.name || 'Professor',
        avatar: selectedSquad.teachers?.[1]?.avatar || '',
        section: selectedSquad.name,
        createdAt: 'Ontem',
        category: 'Aviso',
        subject: 'Penal',
        title: 'Nova atividade lançada',
        message:
          'Acabei de subir a nova lista comentada com foco em erros recorrentes da turma.',
        replies: 7,
        helpful: 29,
        views: 97,
        badge: 'Professor',
        pinned: false,
        solved: false,
        comments: [
          {
            id: 'c7',
            author: 'Sara Dantas',
            avatar: 'https://i.pravatar.cc/150?u=sara',
            badge: '',
            createdAt: 'Ontem',
            content: 'Boa. Essa lista cai bem porque penal foi meu pior bloco no último simulado.',
            likes: 6,
          },
        ],
      },
      {
        id: 'post-6',
        author: 'Livia Nogueira',
        avatar: 'https://i.pravatar.cc/150?u=livia',
        section: selectedSquad.name,
        createdAt: '2 dias atrás',
        category: 'Material',
        subject: 'Português',
        title: 'Mapa mental de regência verbal',
        message:
          'Montei um mapa bem curto para decorar os verbos que mais me confundiam. Posso subir no mural se ajudar geral.',
        replies: 5,
        helpful: 19,
        views: 63,
        badge: '',
        pinned: false,
        solved: false,
        comments: [
          {
            id: 'c8',
            author: 'Profa. Helena Castro',
            avatar: selectedSquad.teachers?.[1]?.avatar || '',
            badge: 'Professor',
            createdAt: '2 dias atrás',
            content: 'Sobe sim. Material assim salva revisão de véspera.',
            likes: 9,
          },
        ],
      },
      {
        id: 'post-7',
        author: 'João Victor',
        avatar: 'https://i.pravatar.cc/150?img=61',
        section: selectedSquad.name,
        createdAt: '3 dias atrás',
        category: 'Dúvida de Questão',
        subject: 'Matemática',
        title: 'Razão e proporção ainda me pegam',
        message:
          'Quando a banca mistura proporcionalidade inversa eu me perco legal. Tem alguma forma mais visual de pensar?',
        replies: 8,
        helpful: 17,
        views: 74,
        badge: '',
        pinned: false,
        solved: true,
        comments: [
          {
            id: 'c9',
            author: 'Prof. Marcelo Farias',
            avatar: selectedSquad.teachers?.[0]?.avatar || '',
            badge: 'Professor',
            createdAt: '3 dias atrás',
            content: 'Se uma grandeza sobe e a outra desce, já liga o alerta de inversa. Faz uma tabelinha rápida e confere o comportamento.',
            likes: 11,
          },
        ],
      },
    ];
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
  const forumFocusedPost = filteredForumPosts.find((post) => post.id === forumFocusedPostId) || null;

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
        role: 'Diretor',
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
      {
        id: 'm3',
        name: 'Ana Clara',
        role: 'Aluna',
        tag: 'Membro ativo',
        avatar: 'https://i.pravatar.cc/150?img=5',
      },
      {
        id: 'm4',
        name: 'Mateus Freire',
        role: 'Aluno',
        tag: 'Membro ativo',
        avatar: 'https://i.pravatar.cc/150?img=33',
      },
      {
        id: 'm5',
        name: 'Livia Nogueira',
        role: 'Aluna',
        tag: 'Top 1 da semana',
        avatar: 'https://i.pravatar.cc/150?u=livia',
      },
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
        String(createForm.inviteCode || '').trim() || generateInviteCode();
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
        notices: [
          {
            id: `notice-pending-${Date.now()}`,
            title: 'Boas-vindas',
            text: 'Apresente a proposta da turma e a primeira meta coletiva.',
          },
        ],
        activities: [
          {
            id: `activity-pending-${Date.now()}`,
            title: 'Lista diagnóstica',
            status: 'Pendente',
            helper: 'Bloco inicial para medir a base da turma.',
          },
        ],
        simulados: [
          {
            id: `sim-pending-${Date.now()}`,
            title: 'Simulado inaugural',
            date: 'A definir',
            helper: 'Primeiro simulado para formar o ranking interno.',
          },
        ],
        internalRanking: [
          {
            id: `rank-pending-${Date.now()}`,
            name: displayName,
            metric: '0 XP no esquadrão',
            tier: 'Bronze',
            avatar: profileAvatarUrl,
            rank: 1,
          },
        ],
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
      inviteCode: String(createForm.inviteCode || '').trim() || generateInviteCode(),
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
      notices: [{ id: `notice-${id}-1`, title: 'Boas-vindas', text: 'Apresente a proposta da turma e a primeira meta coletiva.' }],
      activities: [{ id: `activity-${id}-1`, title: 'Lista diagnóstica', status: 'Pendente', helper: 'Bloco inicial para medir a base da turma.' }],
      simulados: [{ id: `sim-${id}-1`, title: 'Simulado inaugural', date: 'A definir', helper: 'Primeiro simulado para formar o ranking interno.' }],
      internalRanking: [{ id: `rank-${id}-1`, name: displayName, metric: '0 XP no esquadrão', tier: 'Bronze', avatar: '', rank: 1 }],
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
      // O query builder do Supabase é "thenable" mas não expõe .catch — usar .then(({error}))
      // como no resto do arquivo; encadear .catch lançava TypeError e abortava o handler.
      supabase
        .from('community_posts')
        .delete()
        .eq('id', sid)
        .then(({ error }) => {
          if (error) console.warn('[esquadroes] Falha ao excluir esquadrão:', error.message || error);
        });
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
    setForumFocusedPostId('');
    setSelectedSimuladoId('');
  }

  function focusForumComposer() {
    setActiveSection('forum');
    setForumFocusedPostId('');
    window.setTimeout(() => {
      forumComposerRef.current?.focus();
      forumComposerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 20);
  }

  function openForumThread(postId) {
    setActiveSection('forum');
    setForumFocusedPostId(String(postId || ''));
    setExpandedReplies((prev) => ({ ...prev, [postId]: true }));
  }

  function handleTeacherCommentOnAttempt(comment) {
    if (!simuladoAttemptKey || !simuladoAttempt) return;
    setSimuladoAttemptsByUser((prev) => ({
      ...prev,
      [simuladoAttemptKey]: {
        ...prev[simuladoAttemptKey],
        teacherComment: String(comment || ''),
      },
    }));
  }

  function handleAddTurma() {
    const turma = String(newTurmaName || '').trim();
    if (!turma || !selectedSquad || !canManageSquad) return;
    updateSelectedSquad((item) => {
      const currentTurmas = Array.isArray(item.turmas) ? item.turmas : [];
      if (currentTurmas.some((t) => String(t || '').toLowerCase() === turma.toLowerCase())) return item;
      return {
        ...item,
        turmas: [...currentTurmas, turma],
      };
    });
    setNewTurmaName('');
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
    if (!selectedSquad || !canManageSquad) return;
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
    // ID único por timestamp+sufixo aleatório: usar `length+1` sobre o array global de
    // fóruns gerava IDs repetidos entre esquadrões (keys duplicadas + moderação no post errado).
    const nextPostId = `forum-${selectedSquad.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
        .then(({ error }) => {
          if (error) console.warn('[esquadroes] Falha ao publicar no fórum:', error.message || error);
        });
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

  function handleSetMemberRole(member, nextRole) {
    if (!selectedSquad || !canAssignRoles || !member) return;
    const role = String(nextRole || '').trim();
    if (!CURSINHO_ROLE_OPTIONS.includes(role)) return;

    updateSelectedSquad((item) => {
      const roster = Array.isArray(item.roster) && item.roster.length ? item.roster : adminMembers;
      const ownerName = String(item.owner || '').trim().toLowerCase();
      const nextRoster = roster.map((rosterItem) => {
        if (rosterItem.id !== member.id) return rosterItem;
        const isOwnerRow = String(rosterItem.name || '').trim().toLowerCase() === ownerName;
        if (isOwnerRow) return { ...rosterItem, role: 'Diretor', tag: 'Gestão total' };
        return {
          ...rosterItem,
          role,
          tag: role === 'Professor' ? 'Publica conteúdo' : role === 'Coordenador' ? 'Coordena a turma' : 'Membro ativo',
        };
      });

      const nextTeachers = nextRoster
        .filter((row) => String(row.role || '').toLowerCase().includes('professor'))
        .map((row, index) => ({
          id: row.teacherId || `teacher-${row.id || index}`,
          name: row.name,
          subject: row.subject || 'Professor do esquadrão',
          avatar: row.avatar || '',
        }));

      return {
        ...item,
        roster: nextRoster,
        teachers: nextTeachers,
      };
    });
  }

  function openAdminFlow(type, presetSection = 'admin', seed = {}) {
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
      setActiveSection('praticas');
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
        members: Number(item.members || 0) + 1,
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
      setActiveSection('membros');
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
      setActiveSection('configuracao');
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
        setActiveSection('admin');
        closeAdminFlow();
        return;
      }
      const alreadyProfessor =
        String(member.role || '').toLowerCase().includes('professor') ||
        String(member.role || '').toLowerCase().includes('dono');

      if ((permissionScope === 'Professor' && alreadyProfessor) || (permissionScope === 'Membro' && !alreadyProfessor)) {
        setActiveSection('membros');
        closeAdminFlow();
        return;
      }

      handleToggleProfessor({
        ...member,
        subject: member.subject || adminFlow.teacherSubject || 'Professor do esquadrão',
      });
      setActiveSection('membros');
      closeAdminFlow();
    }
  }

  function openInternalActivity(activity) {
    if (!activity) return;
    setActiveSection('praticas');
    if (activity.questionPackId) {
      setSquadNavTarget({ type: 'questao', id: activity.questionPackId });
    } else {
      setSquadNavTarget({ type: 'activity', id: activity.id });
    }
  }

  function openInternalSimulado(sim) {
    if (!sim?.id) return;
    setActiveSection('simulados');
    setSquadNavTarget({ type: 'simulado', id: sim.id });
    setSelectedSimuladoId(sim.id);
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
    <div className="pl-page">
      {/* ═══ Hero compacto ═══ */}
      <header className="pl-esq-hero">
        <div>
          <div className="lede-row">
            <div className="pl-hero-icon">
              <ShieldCheck size={18} strokeWidth={1.75} />
            </div>
            <span className="pl-eyebrow">Ecossistema privado</span>
          </div>
          <h1>Esquadrões<span className="dot">.</span></h1>
          <p className="subtitle">
            Fórum interno, mural, simulados, atividades e gestão privada do cursinho. Cada esquadrão é um campus white-label da turma.
          </p>
        </div>
        <div className="pl-esq-hero-actions">
          <div style={{ position: 'relative' }} ref={squadSwitcherWrapRef}>
            <button
              type="button"
              onClick={() => setShowSquadSwitcher((prev) => !prev)}
              className="pl-esq-switcher"
            >
              <div className="icon"><Users size={16} /></div>
              <div className="label">
                <div className="lab">Seus esquadrões</div>
                <div className="val">{accessibleSquads.length}</div>
              </div>
              {showSquadSwitcher ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showSquadSwitcher && squadSwitcherMenuBox && typeof document !== 'undefined'
              ? createPortal(
                  <div ref={squadSwitcherMenuRef} style={squadSwitcherMenuBox} className="pl-esq-switcher-menu">
                    <div className="head">
                      <span>Trocar esquadrão</span>
                      <span className="cnt">{accessibleSquads.length} ativos</span>
                    </div>
                    {accessibleSquads.map((squad) => {
                      const active = selectedSquad?.id === squad.id;
                      return (
                        <button
                          key={squad.id}
                          type="button"
                          onClick={() => { handleSelectSquad(squad.id); setShowSquadSwitcher(false); }}
                          className={`pl-esq-switcher-item ${active ? 'active' : ''}`}
                        >
                          <div className="info">
                            <p className="nm">{squad.name}</p>
                            <p className="focus">{squad.focus}</p>
                          </div>
                          <span className="cnt">{squad.members}</span>
                        </button>
                      );
                    })}
                  </div>,
                  document.body
                )
              : null}
          </div>

          <div className="pl-esq-elite-tag">
            <div className="icon"><Star size={14} /></div>
            <div className="label">
              <div className="lab">Criação</div>
              <div className="val">{isElite ? 'Liberada' : 'Fechada'}</div>
            </div>
          </div>

          {isElite ? (
            <button type="button" onClick={() => setShowCreateSquad(true)} className="pl-btn pl-btn-primary">
              <Plus size={14} /> Novo esquadrão
            </button>
          ) : null}
        </div>
      </header>

      {/* ═══ Squad ativo (slim dark) ═══ */}
      {selectedSquad ? (
        <section className="pl-esq-squad">
          <div className="info">
            {selectedSquad.coverUrl ? (
              <img
                src={selectedSquad.coverUrl}
                alt={selectedSquad.name}
                className="avatar"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className="avatar"><Users size={22} /></div>
            )}
            <div style={{ minWidth: 0 }}>
              <span className="pill">
                <ShieldCheck /> Esquadrão privado ativo
              </span>
              <h2>{selectedSquad.name}</h2>
              <p className="meta">
                <strong>{selectedSquad.owner}</strong>
                {' · '}Foco: <strong>{selectedSquad.focus}</strong>
              </p>
            </div>
          </div>
          <div className="pl-esq-squad-stats">
            <div className="pl-esq-squad-stat">
              <span className="lab">Liga</span>
              <span className="val">{selectedSquad.rankingTier || 'Bronze'}</span>
            </div>
            <div className="pl-esq-squad-stat">
              <span className="lab">Membros</span>
              <span className="val">{selectedSquad.members || 0}</span>
            </div>
            <div className="pl-esq-squad-stat">
              <span className="lab">Próximo marco</span>
              <span className="val" style={{ fontSize: 14, fontFamily: 'var(--pl-sans)', fontStyle: 'normal', fontWeight: 600 }}>
                {selectedSquad.nextEvent || '—'}
              </span>
            </div>
            {canManageSquad ? (
              <button type="button" onClick={() => setActiveSection('admin')} className="adm-btn">
                ADM do esquadrão
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ═══ Tabs ═══ */}
      {selectedSquad ? (
        <div className="pl-esq-tabs-wrap">
          <div className="pl-esq-tabs-head">
            <span className="left">Área interna</span>
            <span className="right">{selectedSquad.name}</span>
          </div>
          <nav className="pl-esq-tabs" aria-label="Navegação do esquadrão">
            {activeSection === 'admin' ? (
              <button type="button" onClick={() => setActiveSection('forum')} className="pl-esq-tab">
                <ArrowLeft /> Fórum
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
                  className={`pl-esq-tab ${active ? 'active' : ''}`}
                >
                  <Icon />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      ) : null}

      <div style={{ display: 'flex', width: '100%', flexDirection: 'column', gap: 24 }}>
          {!selectedSquad ? (
            <div className="pl-esq-empty">
              <div className="icon"><Shield size={26} /></div>
              <h3>Escolha um esquadrão.</h3>
              <p>Selecione um esquadrão no seletor acima para abrir a comunidade privada da turma.</p>
            </div>
          ) : (
            <>
              {activeSection === 'dashboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <section className="pl-esq-section-card">
                    <span className="eyebrow">Dashboard do esquadrão</span>
                    <h3>Visão geral do {selectedSquad.name}</h3>
                    <p className="desc">
                      Painel de apresentação do cursinho com foco em engajamento, operação e próximos passos da turma.
                    </p>
                    <div className="pl-esq-kpi-grid">
                      <div className="pl-esq-kpi">
                        <span className="lab"><Users size={12} /> Membros ativos</span>
                        <span className="val">{selectedSquad.members || 0}</span>
                      </div>
                      <div className="pl-esq-kpi">
                        <span className="lab"><BookOpen size={12} /> Professores</span>
                        <span className="val">{selectedSquad.teachers?.length || 0}</span>
                      </div>
                      <div className="pl-esq-kpi">
                        <span className="lab"><ClipboardList size={12} /> Atividades</span>
                        <span className="val">{displayActivities.length}</span>
                      </div>
                      <div className="pl-esq-kpi">
                        <span className="lab"><Trophy size={12} /> Simulados</span>
                        <span className="val">{displaySimulados.length}</span>
                      </div>
                    </div>
                  </section>
                  <section className="pl-esq-twin">
                    <div className="pl-esq-section-card">
                      <span className="eyebrow">Próximas ações</span>
                      <h3>Operação da semana</h3>
                      <ul className="pl-esq-list">
                        <li>Publicar aviso de rotina da semana no Mural.</li>
                        <li>Revisar cronograma e confirmar próximos simulados.</li>
                        <li>Atualizar banco de Questões da turma.</li>
                        <li>Monitorar dúvidas mais frequentes no Fórum.</li>
                      </ul>
                    </div>
                    <div className="pl-esq-section-card">
                      <span className="eyebrow">Acesso da turma</span>
                      <h3>Convite e governança</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                        <div className="pl-esq-summary-row">
                          <span className="lab">Código de entrada</span>
                          <span className="val">{selectedSquad.inviteCode || '—'}</span>
                        </div>
                        <div className="pl-esq-summary-row">
                          <span className="lab">Visibilidade</span>
                          <span className="val">{selectedSquad.visibility || 'Privado'}</span>
                        </div>
                        <div className="pl-esq-summary-row">
                          <span className="lab">Líder</span>
                          <span className="val">{selectedSquad.owner || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeSection === 'forum' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <section className="pl-card" style={{ padding: 24, background: 'var(--pl-accent-soft)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div>
                        <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Fórum interno Papirando</p>
                        <h3 style={{ fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 8px' }}>Discussões exclusivas da turma</h3>
                        <p style={{ maxWidth: 600, fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)', margin: 0 }}>
                          Busca, filtros, ordenação, destaque fixado, compositor e comentários em árvore — o mesmo padrão do fórum geral, isolado ao esquadrão.
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                        <div className="pl-card" style={{ padding: '12px 16px' }}>
                          <p className="pl-eyebrow" style={{ marginBottom: 2 }}>Tópicos</p>
                          <p className="pl-num" style={{ fontSize: 20 }}>{scopedForumPosts.filter((p) => !p.hidden).length}</p>
                        </div>
                        <div className="pl-card" style={{ padding: '12px 16px' }}>
                          <p className="pl-eyebrow" style={{ marginBottom: 2 }}>Fixados</p>
                          <p className="pl-num" style={{ fontSize: 20 }}>{scopedForumPosts.filter((p) => p.pinned).length}</p>
                        </div>
                        <button
                          type="button"
                          onClick={focusForumComposer}
                          className="pl-btn pl-btn-primary"
                        >
                          <Plus size={15} />
                          Novo tópico
                        </button>
                      </div>
                    </div>
                  </section>

                  {forumFocusedPost ? (
                    <section className="pl-card" style={{ padding: 20 }}>
                      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <p className="pl-eyebrow" style={{ marginBottom: 2 }}>Tópico aberto</p>
                          <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>Thread completa com comentários</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForumFocusedPostId('')}
                          className="pl-btn pl-btn-ghost"
                          style={{ fontSize: 12 }}
                        >
                          <ArrowLeft size={14} />
                          Voltar ao início do fórum
                        </button>
                      </div>
                      <ForumPostFull
                        post={forumFocusedPost}
                        expanded={expandedReplies[forumFocusedPost.id]}
                        onToggleReplies={() => toggleReplies(forumFocusedPost.id)}
                      />
                    </section>
                  ) : null}

                  {!forumFocusedPost ? (
                    <section className="pl-card" style={{ padding: 20 }}>
                    <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <p className="pl-eyebrow">Busca e filtros</p>
                      <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>Encontre qualquer discussão</h3>
                    </div>

                    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1.35fr 0.65fr' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ position: 'relative' }}>
                          <Search size={16} style={{ pointerEvents: 'none', position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--pl-ink-3)' }} />
                          <input
                            type="text"
                            value={forumQuery}
                            onChange={(e) => {
                              setForumQuery(e.target.value);
                              setForumPage(1);
                            }}
                            placeholder="Buscar por dúvida, autor, matéria, resumo, aviso..."
                            className="pl-input"
                            style={{ paddingLeft: 44, width: '100%', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                              className={forumFilter === item.id ? 'pl-btn pl-btn-primary pl-btn-sm' : 'pl-btn pl-btn-ghost pl-btn-sm'}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gap: 12 }}>
                        <div className="pl-card-paper" style={{ padding: 16 }}>
                          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Filter size={12} />
                            <p className="pl-eyebrow" style={{ margin: 0 }}>Ordenar</p>
                          </div>
                          <select
                            value={forumSort}
                            onChange={(e) => {
                              setForumSort(e.target.value);
                              setForumPage(1);
                            }}
                            className="pl-input"
                            style={{ width: '100%' }}
                          >
                            <option value="recentes">Mais recentes</option>
                            <option value="populares">Mais úteis</option>
                            <option value="comentadas">Mais comentadas</option>
                            <option value="fixados">Fixados primeiro</option>
                          </select>
                        </div>

                        <div className="pl-card-paper" style={{ padding: 16 }}>
                          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Bookmark size={12} />
                            <p className="pl-eyebrow" style={{ margin: 0 }}>Resultado</p>
                          </div>
                          <p className="pl-num" style={{ fontSize: 22, color: 'var(--pl-ink)' }}>{filteredForumPosts.length}</p>
                          <p style={{ marginTop: 4, fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-3)' }}>tópicos encontrados</p>
                        </div>
                      </div>
                    </div>
                    </section>
                  ) : null}

                  {!forumFocusedPost ? (
                    <section className="pl-card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16, padding: 24, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 3, background: 'var(--pl-accent)' }} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <img
                        src={profileAvatarUrl}
                        alt="Tu"
                        style={{ height: 48, width: 48, borderRadius: '50%', border: '2px solid var(--pl-rule-2)', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <textarea
                        ref={forumComposerRef}
                        rows="3"
                        value={newForumPost}
                        onChange={(e) => setNewForumPost(e.target.value)}
                        placeholder="Abra um novo tópico do esquadrão sem precisar voltar para a home."
                        className="pl-input"
                        style={{ width: '100%', resize: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 64 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-4)' }}>O tópico publicado aparece no fórum interno e permanece salvo na comunidade.</p>
                      <button
                        type="button"
                        onClick={handlePublishForumPost}
                        className="pl-btn pl-btn-primary"
                      >
                        <Send size={16} /> Publicar
                      </button>
                    </div>
                    </section>
                  ) : null}

                  {!forumFocusedPost && pinnedPost ? (
                    <section className="pl-card" style={{ padding: 20, border: '1px solid var(--pl-warn)', background: 'var(--pl-warn-soft)' }}>
                      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <p className="pl-eyebrow" style={{ marginBottom: 2, color: 'var(--pl-warn)' }}>Fixado</p>
                          <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>Destaque do professor</h3>
                        </div>
                        <span className="pl-tag pl-tag-warn">Prioridade</span>
                      </div>
                      <ForumPostFull
                        post={pinnedPost}
                        expanded={expandedReplies[pinnedPost.id]}
                        onToggleReplies={() => toggleReplies(pinnedPost.id)}
                        onOpenThread={() => openForumThread(pinnedPost.id)}
                      />
                    </section>
                  ) : null}

                  {!forumFocusedPost ? (
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {paginatedForumPosts
                      .filter((post) => post.id !== pinnedPost?.id)
                      .map((post) => (
                        <ForumPostFull
                          key={post.id}
                          post={post}
                          expanded={expandedReplies[post.id]}
                          onToggleReplies={() => toggleReplies(post.id)}
                          onOpenThread={() => openForumThread(post.id)}
                        />
                      ))}

                    {filteredForumPosts.length === 0 ? (
                      <div className="pl-card" style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--pl-rule-2)' }}>
                        <div style={{ margin: '0 auto 16px', display: 'flex', height: 56, width: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' }}>
                          <Search size={22} />
                        </div>
                        <h4 style={{ fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 8px' }}>Nada encontrado</h4>
                        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-3)', margin: 0 }}>
                          Ajusta a busca ou o filtro. O fórum não sumiu, só ficou mais criterioso.
                        </p>
                      </div>
                    ) : null}
                    </section>
                  ) : null}

                  {!forumFocusedPost ? (
                    <PaginationBar
                      page={forumPage}
                      totalPages={totalForumPages}
                      onPrev={() => setForumPage((prev) => Math.max(1, prev - 1))}
                      onNext={() => setForumPage((prev) => Math.min(totalForumPages, prev + 1))}
                      onPick={(value) => setForumPage(value)}
                    />
                  ) : null}
                </div>
              )}

              {activeSection === 'mural' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {canPinNotices ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <ActionChip label="Novo aviso" onClick={() => openAdminFlow('notice', 'mural')} />
                    </div>
                  ) : null}
                  {displayNotices.map((notice) => {
                    const who = notice.publishedBy || selectedSquad.owner || 'Coordenação';
                    const when = notice.publishedAtLabel || '';
                    const av =
                      notice.publishedByAvatar ||
                      (who === selectedSquad.owner ? profileAvatarUrl : '') ||
                      `https://i.pravatar.cc/150?u=${encodeURIComponent(who)}`;
                    return (
                      <article
                        key={notice.id}
                        className="pl-card"
                        style={{ overflow: 'hidden', boxShadow: 'var(--pl-sh-low)', border: notice.pinned ? '1px solid var(--pl-warn)' : '1px solid var(--pl-rule-2)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: '12px 20px' }}>
                          <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 12 }}>
                            <div style={{ height: 40, width: 40, flexShrink: 0, overflow: 'hidden', borderRadius: '50%', border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)' }}>
                              {av ? (
                                <img src={av} alt="" style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', background: 'var(--pl-accent-soft)', fontSize: 12, fontWeight: 700, color: 'var(--pl-accent)' }}>
                                  {String(who).charAt(0)}
                                </div>
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)' }}>{who}</p>
                              <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: 'var(--pl-ink-3)' }}>
                                <Clock3 size={12} style={{ flexShrink: 0, color: 'var(--pl-ink-4)' }} />
                                {when || '—'}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 8 }}>
                            {notice.pinned ? (
                              <span className="pl-tag pl-tag-warn">Fixado</span>
                            ) : null}
                            <span className="pl-tag pl-tag-accent">Mural</span>
                          </div>
                        </div>
                        <div style={{ padding: 24 }}>
                          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-accent)' }}>
                            <Megaphone size={14} /> Aviso à turma
                          </div>
                          <h4 style={{ fontSize: 17, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{notice.title}</h4>
                          <p style={{ marginTop: 12, fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{notice.text}</p>
                          {notice.attachmentName ? (
                            <a
                              href={notice.attachmentUrl || '#'}
                              download={notice.attachmentName}
                              className="pl-tag pl-tag-accent"
                              style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}
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
                    <div className="pl-card" style={{ padding: 32, textAlign: 'center', fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-3)', border: '1px dashed var(--pl-rule-2)' }}>
                      Nenhum aviso publicado ainda.
                    </div>
                  ) : null}
                </div>
              )}

              {activeSection === 'cronograma' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="pl-card" style={{ padding: 24 }}>
                    <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Cronograma interno</p>
                    <h3 style={{ fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 8px' }}>Planejamento da turma</h3>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)', margin: 0 }}>
                      Aqui o cursinho concentra calendario de atividades, simulados e marcos da turma no proprio esquadrao.
                    </p>
                  </div>
                  <div className="pl-card" style={{ padding: 20, background: 'var(--pl-accent-soft)' }}>
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <p className="pl-eyebrow">Visão calendário</p>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>{cronogramaCards.length} evento(s)</span>
                    </div>
                    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      {cronogramaCards.slice(0, 6).map((item) => (
                        <button
                          key={`calendar-${item.id}`}
                          type="button"
                          onClick={() => openCronogramaNavItem(item)}
                          className="pl-card"
                          style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }}
                        >
                          <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{item.label}</p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 4px' }}>{item.title}</p>
                          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)', margin: 0 }}>{item.when}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  {cronogramaCards.length ? (
                    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      {cronogramaCards.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openCronogramaNavItem(item)}
                          className="pl-card"
                          style={{ padding: 20, textAlign: 'left', cursor: 'pointer' }}
                        >
                          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span className="pl-tag pl-tag-accent">{item.label}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-ink-4)' }}>{item.when}</span>
                          </div>
                          <h4 style={{ fontSize: 17, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 8px' }}>{item.title}</h4>
                          <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)', margin: 0 }}>{item.details}</p>
                          {item.publishedBy ? (
                            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--pl-rule)', paddingTop: 12 }}>
                              {item.publishedByAvatar ? (
                                <img src={item.publishedByAvatar} alt="" style={{ height: 32, width: 32, borderRadius: '50%', border: '1px solid var(--pl-rule-2)', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ display: 'flex', height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--pl-bg-soft)', fontSize: 10, fontWeight: 700, color: 'var(--pl-ink-2)' }}>
                                  {String(item.publishedBy).charAt(0)}
                                </div>
                              )}
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-2)', margin: 0 }}>Publicado por {item.publishedBy}</p>
                                <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--pl-ink-4)', margin: 0 }}>{item.publishedAtLabel || ''}</p>
                              </div>
                              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-accent)' }}>Abrir →</span>
                            </div>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="pl-card" style={{ padding: 32, textAlign: 'center', fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-3)', border: '1px dashed var(--pl-rule-2)' }}>
                      Sem itens no cronograma ainda. Use Atividades e Simulados para preencher esta agenda.
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'praticas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {canPublishActivities ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <ActionChip label="Nova atividade" onClick={() => openAdminFlow('activity', 'praticas', { status: 'Aberta' })} />
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
                        className="pl-card"
                        style={{ padding: 24, cursor: 'pointer', textAlign: 'left', boxShadow: 'var(--pl-sh-low)', outline: hl ? '2px solid var(--pl-accent)' : 'none', outlineOffset: 2 }}
                      >
                        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <h4 style={{ fontSize: 18, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{activity.title}</h4>
                          <span className="pl-tag pl-tag-success">{activity.status}</span>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)', margin: 0 }}>{activity.helper}</p>
                        {activity.dueDate || activity.dueTime ? (
                          <p style={{ marginTop: 12, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-accent)' }}>
                            Prazo {activity.dueDate || 'a definir'} {activity.dueTime ? `• ${activity.dueTime}` : ''}
                          </p>
                        ) : null}
                        {activity.publishedBy ? (
                          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--pl-rule)', paddingTop: 16 }}>
                            {activity.publishedByAvatar ? (
                              <img src={activity.publishedByAvatar} alt="" style={{ height: 36, width: 36, borderRadius: '50%', border: '1px solid var(--pl-rule-2)', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ display: 'flex', height: 36, width: 36, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--pl-bg-soft)', fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>
                                {String(activity.publishedBy).charAt(0)}
                              </div>
                            )}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)', margin: 0 }}>Lançado por {activity.publishedBy}</p>
                              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--pl-ink-4)', margin: 0 }}>{activity.publishedAtLabel || ''}</p>
                            </div>
                            <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-accent)' }}>
                              {activity.questionPackId ? 'Ir à lista →' : 'Detalhes →'}
                            </span>
                          </div>
                        ) : null}
                        {activity.attachmentName ? (
                          <a
                            href={activity.attachmentUrl || '#'}
                            download={activity.attachmentName}
                            className="pl-tag pl-tag-accent"
                            style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}
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
                    <div className="pl-card" style={{ padding: 32, textAlign: 'center', fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-3)', border: '1px dashed var(--pl-rule-2)' }}>
                      Sem atividades no momento.
                    </div>
                  ) : null}
                </div>
              )}

              {activeSection === 'praticas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="pl-card" style={{ padding: 24 }}>
                    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <h4 style={{ fontSize: 18, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>Listas com maior engajamento</h4>
                      <span className="pl-tag pl-tag-accent">{questionPosts.length} posts</span>
                    </div>
                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      {questionPosts.map((item) => {
                        const hl = squadNavTarget.type === 'questao' && squadNavTarget.id === item.id;
                        return (
                          <button
                            key={item.id}
                            id={`squad-questao-${item.id}`}
                            type="button"
                            onClick={() => {
                              setActiveSection('praticas');
                              setSquadNavTarget({ type: 'questao', id: item.id });
                            }}
                            className="pl-card-paper"
                            style={{ padding: 16, textAlign: 'left', cursor: 'pointer', outline: hl ? '2px solid var(--pl-accent)' : 'none', outlineOffset: 2 }}
                          >
                            <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{item.tag}</p>
                            <h5 style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 8px' }}>{item.title}</h5>
                            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)', margin: 0 }}>{item.meta}</p>
                            {item.publishedBy ? (
                              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--pl-rule)', paddingTop: 12 }}>
                                {item.publishedByAvatar ? (
                                  <img src={item.publishedByAvatar} alt="" style={{ height: 32, width: 32, borderRadius: '50%', border: '1px solid var(--pl-rule-2)', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ display: 'flex', height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--pl-surface)', fontSize: 10, fontWeight: 700, color: 'var(--pl-ink-2)' }}>
                                    {String(item.publishedBy).charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-2)', margin: 0 }}>Lista de {item.publishedBy}</p>
                                  <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--pl-ink-4)', margin: 0 }}>
                                    {item.publishedAtLabel || ''}
                                    {item.questionsCount ? ` · ${item.questionsCount} questões` : ''}
                                  </p>
                                </div>
                                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-accent)' }}>Abrir →</span>
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'simulados' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {canPublishSimulados ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <ActionChip label="Novo simulado" onClick={() => openAdminFlow('simulado', 'simulados')} />
                    </div>
                  ) : null}
                  {selectedSimulado ? (
                    <section className="pl-card" style={{ padding: 24 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                        <div>
                          <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Simulado selecionado</p>
                          <h4 style={{ fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 8px' }}>{selectedSimulado.title}</h4>
                          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)', margin: 0 }}>
                            {selectedSimulado.helper || 'Aplicação interna com resultado enviado ao professor responsável.'}
                          </p>
                        </div>
                        <span className="pl-tag">{simuladoAttempt ? 'Tentativa concluída' : '1 tentativa por aluno'}</span>
                      </div>
                      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        <div className="pl-card-paper" style={{ padding: 16 }}>
                          <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Aluno</p>
                          {simuladoAttempt ? (
                            <>
                              <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 4px' }}>Nota: {String(simuladoAttempt.score).replace('.', ',')}</p>
                              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)', margin: 0 }}>Resultado enviado automaticamente para o professor.</p>
                            </>
                          ) : (
                            <>
                              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)', margin: '0 0 12px' }}>A aplicação de simulados dentro do esquadrão chega em breve.</p>
                              <button
                                type="button"
                                disabled
                                className="pl-btn"
                                style={{ opacity: 0.55, cursor: 'not-allowed' }}
                              >
                                Em breve
                              </button>
                            </>
                          )}
                        </div>
                        <div className="pl-card-paper" style={{ padding: 16 }}>
                          <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Gabarito · professor</p>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)', margin: '0 0 12px' }}>
                            {canReviewAsTeacher ? 'Professor pode marcar respostas corretas e comentar questão por questão.' : 'Disponível para professores e coordenação.'}
                          </p>
                          {canReviewAsTeacher ? (
                            <textarea
                              rows={3}
                              value={simuladoAttempt?.teacherComment || ''}
                              onChange={(e) => handleTeacherCommentOnAttempt(e.target.value)}
                              placeholder="Comentário pedagógico do professor sobre erros e pontos de atenção..."
                              className="pl-input"
                              style={{ width: '100%', marginTop: 8, resize: 'none' }}
                            />
                          ) : null}
                        </div>
                      </div>
                    </section>
                  ) : null}
                  {displaySimulados.map((simulado) => {
                    const hl = squadNavTarget.type === 'simulado' && squadNavTarget.id === simulado.id;
                    return (
                      <div
                        key={simulado.id}
                        id={`squad-simulado-${simulado.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          openInternalSimulado(simulado);
                          setSelectedSimuladoId(simulado.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openInternalSimulado(simulado);
                            setSelectedSimuladoId(simulado.id);
                          }
                        }}
                        className="pl-card"
                        style={{ padding: 24, cursor: 'pointer', textAlign: 'left', boxShadow: 'var(--pl-sh-low)', outline: hl ? '2px solid var(--pl-accent)' : 'none', outlineOffset: 2 }}
                      >
                        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-accent)' }}>
                          <Trophy size={14} /> Simulado programado
                        </div>
                        <h4 style={{ fontSize: 18, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 8px' }}>{simulado.title}</h4>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-accent)', margin: '0 0 12px' }}>{simulado.dateLabel || simulado.date}</p>
                        <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)', margin: 0 }}>{simulado.helper}</p>
                        {simulado.publishedBy ? (
                          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--pl-rule)', paddingTop: 16 }}>
                            {simulado.publishedByAvatar ? (
                              <img src={simulado.publishedByAvatar} alt="" style={{ height: 36, width: 36, borderRadius: '50%', border: '1px solid var(--pl-rule-2)', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ display: 'flex', height: 36, width: 36, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--pl-bg-soft)', fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>
                                {String(simulado.publishedBy).charAt(0)}
                              </div>
                            )}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)', margin: 0 }}>Publicado por {simulado.publishedBy}</p>
                              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--pl-ink-4)', margin: 0 }}>{simulado.publishedAtLabel || ''}</p>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-accent)' }}>Ficha →</span>
                          </div>
                        ) : null}
                        {simulado.attachmentName ? (
                          <a
                            href={simulado.attachmentUrl || '#'}
                            download={simulado.attachmentName}
                            className="pl-tag pl-tag-accent"
                            style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}
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
                    <div className="pl-card" style={{ padding: 32, textAlign: 'center', fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-3)', border: '1px dashed var(--pl-rule-2)' }}>
                      Nenhum simulado cadastrado ainda.
                    </div>
                  ) : null}
                </div>
              )}

              {activeSection === 'configuracao' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div className="pl-card" style={{ padding: 24 }}>
                    <p className="pl-eyebrow" style={{ marginBottom: 4, color: 'var(--pl-accent)' }}>Governança do esquadrão</p>
                    <h3 style={{ fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 8px' }}>Papéis, permissões e convite</h3>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)', margin: 0 }}>
                      Cada papel tem escopo explícito. O dono controla selos de professor, matérias e moderação; alunos enxergam apenas o que a turma libera.
                    </p>
                  </div>
                  <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    {roleHierarchyDetail.map((item) => (
                      <div key={item.role} className="pl-card" style={{ padding: 20 }}>
                        <p className="pl-eyebrow" style={{ marginBottom: 8, color: 'var(--pl-accent)' }}>{item.role}</p>
                        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)', margin: '0 0 12px' }}>{item.summary}</p>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {item.can.map((line) => (
                            <li key={line} style={{ display: 'flex', gap: 8, fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
                              <span style={{ marginTop: 6, height: 6, width: 6, flexShrink: 0, borderRadius: '50%', background: 'var(--pl-accent)', display: 'inline-block' }} />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="pl-card" style={{ padding: 24, background: 'var(--pl-accent-soft)', border: '1px solid var(--pl-accent-ring)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <p className="pl-eyebrow" style={{ marginBottom: 4, color: 'var(--pl-accent)' }}>Link de convite (ADM)</p>
                        <h4 style={{ fontSize: 18, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 8px' }}>Compartilhe com alunos e equipe</h4>
                        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)', margin: '0 0 4px' }}>
                          Código atual: <span style={{ fontWeight: 700, color: 'var(--pl-accent)' }}>{selectedSquad.inviteCode || '—'}</span>
                        </p>
                        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)', margin: '0 0 4px' }}>
                          Fluxo: o aluno se cadastra na plataforma, entra com este convite e acessa apenas o esquadrão autorizado.
                        </p>
                        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)', margin: 0, wordBreak: 'break-all' }}>
                          {typeof window !== 'undefined'
                            ? `${window.location.origin}${window.location.pathname || '/'}?convite=${encodeURIComponent(selectedSquad.inviteCode || '')}`
                            : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <button
                          type="button"
                          onClick={copySquadInviteLink}
                          className="pl-btn pl-btn-primary"
                        >
                          <Copy size={16} />
                          {inviteCopied ? 'Copiado!' : 'Copiar link'}
                        </button>
                        <button
                          type="button"
                          onClick={copySquadInviteLink}
                          className="pl-btn pl-btn-ghost"
                        >
                          <Link2 size={16} />
                          Convite
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="pl-card" style={{ padding: 24 }}>
                    <p className="pl-eyebrow" style={{ marginBottom: 4, color: 'var(--pl-accent)' }}>Estrutura acadêmica</p>
                    <h4 style={{ fontSize: 18, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 8px' }}>Funções do cursinho e turmas</h4>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)', margin: 0 }}>
                      O ADM define os papéis oficiais (Diretor, Coordenador, Professor e Aluno) e segmenta conteúdos por turma.
                    </p>
                    <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {['Diretor', 'Coordenador', 'Professor', 'Aluno'].map((role) => (
                        <span key={role} className="pl-tag">{role}</span>
                      ))}
                    </div>
                    <div style={{ marginTop: 20 }}>
                      <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Turmas cadastradas</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {(Array.isArray(selectedSquad?.turmas) && selectedSquad.turmas.length ? selectedSquad.turmas : ['Turma única']).map((turma) => (
                          <span key={turma} className="pl-tag pl-tag-accent">{turma}</span>
                        ))}
                      </div>
                      {canManageSquad ? (
                        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                          <input
                            value={newTurmaName}
                            onChange={(e) => setNewTurmaName(e.target.value)}
                            placeholder="Nova turma (ex.: Turma Noite A)"
                            className="pl-input"
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={handleAddTurma}
                            className="pl-btn pl-btn-primary"
                          >
                            Adicionar
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'configuracao' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
                  {canManageTeachers ? (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                      <ActionChip label="Adicionar professor" onClick={() => openAdminFlow('add-teacher', 'configuracao')} />
                    </div>
                  ) : null}
                  {(selectedSquad.teachers || []).map((teacher) => (
                    <TeacherCard key={teacher.id} teacher={teacher} />
                  ))}

                  <div className="pl-card-paper" style={{ gridColumn: '1 / -1', padding: 24, fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)', border: '1px dashed var(--pl-rule-2)' }}>
                    O dono do esquadrão define aqui os professores responsáveis, as matérias da equipa e a trilha do cursinho.
                  </div>
                </div>
              )}

              {activeSection === 'membros' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <MembersHero squad={selectedSquad} canManageSquad={canManageSquad} />

                  <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1.1fr 0.9fr' }}>
                    <div className="pl-card" style={{ padding: 24 }}>
                      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Membros internos</p>
                          <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>Pessoas do esquadrão</h3>
                        </div>

                        {canManageSquad ? (
                          <button
                            type="button"
                            onClick={() => openAdminFlow('invite-student', 'membros')}
                            className="pl-btn pl-btn-primary"
                          >
                            <UserPlus size={14} />
                            Convidar
                          </button>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {adminMembers.map((member) => (
                          <MemberManagementRow
                            key={member.id}
                            member={member}
                            canManageSquad={canManageSquad}
                            canAssignRoles={canAssignRoles}
                            onToggleProfessor={handleToggleProfessor}
                            onSetRole={handleSetMemberRole}
                            onOpenPermissions={() =>
                              openAdminFlow('permissions', 'membros', {
                                memberId: member.id,
                                teacherName: member.name,
                                teacherSubject: member.subject || '',
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      <div className="pl-card" style={{ padding: 24 }}>
                        <div style={{ marginBottom: 20 }}>
                          <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Permissões visuais</p>
                          <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>Quem pode fazer o quê</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <PermissionItem label="Distribuir selo de professor" value={canManageSquad ? 'Ativo' : 'Restrito'} />
                          <PermissionItem label="Publicar simulados" value="Professor / Dono" />
                          <PermissionItem label="Publicar atividades" value="Professor / Dono" />
                          <PermissionItem label="Gerir membros" value={canManageSquad ? 'Ativo' : 'Restrito'} />
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'ranking' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="pl-card" style={{ padding: 24, background: 'var(--pl-warn-soft)', border: '1px solid var(--pl-warn)' }}>
                    <p className="pl-eyebrow" style={{ marginBottom: 4, color: 'var(--pl-warn)' }}>Como funciona a pontuação</p>
                    <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 8px' }}>Regras de XP</h3>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)', margin: 0 }}>
                      A turma acumula XP por engajamento nas listas internas, simulados e redação. Valores abaixo são exemplos para o cursinho calibrar.
                    </p>
                    <div style={{ marginTop: 16, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      {[
                        { label: 'Questão objetiva certa (lista)', value: '+50 XP', hint: 'por item concluído na lista do esquadrão' },
                        { label: 'Questão certa em simulado interno', value: '+100 XP', hint: 'peso maior por prova completa' },
                        { label: 'Participação no fórum (post útil)', value: '+25 XP', hint: 'moderado pelo professor — anti-spam' },
                        { label: 'Redação nota máxima (10)', value: '+400 XP', hint: 'escala pode ser ajustada pelo dono' },
                        { label: 'Redação nota 8', value: '+250 XP', hint: 'proporcional entre 6 e 10' },
                        { label: 'Streak semanal (7 dias)', value: '+120 XP', hint: 'bônus por constância registrada' },
                      ].map((row) => (
                        <div key={row.label} className="pl-card" style={{ padding: 16 }}>
                          <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{row.label}</p>
                          <p className="pl-num" style={{ fontSize: 18, marginBottom: 4 }}>{row.value}</p>
                          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)', margin: 0 }}>{row.hint}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {displayRanking.map((item) => (
                    <RankingRow key={item.id} item={item} />
                  ))}
                  {!displayRanking.length ? (
                    <div className="pl-card" style={{ padding: 32, textAlign: 'center', fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-3)', border: '1px dashed var(--pl-rule-2)' }}>
                      O ranking interno aparece quando a turma comeca a responder atividades e simulados.
                    </div>
                  ) : null}
                </div>
              )}

              {activeSection === 'admin' && canManageSquad && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <section className="pl-card" style={{ padding: 24 }}>
                    <p className="pl-eyebrow" style={{ marginBottom: 4, color: 'var(--pl-accent)' }}>Dados do esquadrão</p>
                    <h3 style={{ fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 20px' }}>Configurações gerais</h3>
                    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                        Nome
                        <input
                          value={adminEdit.name}
                          onChange={(e) => setAdminEdit((prev) => ({ ...prev, name: e.target.value }))}
                          className="pl-input"
                          style={{ marginTop: 4, width: '100%', boxSizing: 'border-box', display: 'block' }}
                        />
                      </label>
                      <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                        Foco
                        <input
                          value={adminEdit.focus}
                          onChange={(e) => setAdminEdit((prev) => ({ ...prev, focus: e.target.value }))}
                          className="pl-input"
                          style={{ marginTop: 4, width: '100%', boxSizing: 'border-box', display: 'block' }}
                        />
                      </label>
                      <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                        Código de entrada
                        <input
                          value={adminEdit.inviteCode}
                          onChange={(e) => setAdminEdit((prev) => ({ ...prev, inviteCode: e.target.value }))}
                          className="pl-input"
                          style={{ marginTop: 4, width: '100%', boxSizing: 'border-box', display: 'block' }}
                        />
                      </label>
                      <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                        Visibilidade
                        <select
                          value={adminEdit.visibility}
                          onChange={(e) => setAdminEdit((prev) => ({ ...prev, visibility: e.target.value }))}
                          className="pl-input"
                          style={{ marginTop: 4, width: '100%', boxSizing: 'border-box', display: 'block' }}
                        >
                          <option value="Privado">Privado</option>
                          <option value="Público">Público</option>
                        </select>
                      </label>
                    </div>
                    <label style={{ marginTop: 16, display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                      Descrição
                      <textarea
                        rows={3}
                        value={adminEdit.description}
                        onChange={(e) => setAdminEdit((prev) => ({ ...prev, description: e.target.value }))}
                        className="pl-input"
                        style={{ marginTop: 4, width: '100%', boxSizing: 'border-box', display: 'block', resize: 'none' }}
                      />
                    </label>
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={handleSaveSquadSettings}
                        className="pl-btn pl-btn-primary"
                      >
                        Salvar configurações
                      </button>
                    </div>
                  </section>

                  <section className="pl-card" style={{ padding: 20, border: '1px solid var(--pl-accent-ring)' }}>
                    <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <p className="pl-eyebrow" style={{ marginBottom: 4, color: 'var(--pl-accent)' }}>Administração do esquadrão</p>
                        <h3 style={{ fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 4px' }}>Controle central do ambiente</h3>
                        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-3)', margin: 0, maxWidth: '42rem' }}>
                          Organize pessoas, publique conteúdo e ajuste permissões sem sair do fluxo atual.
                        </p>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        <AdminMetricTone label="Pessoas" value={String(adminMembers.length)} tone="blue" />
                        <AdminMetricTone label="Professores" value={String(selectedSquad.teachers?.length || 0)} tone="gold" />
                        <AdminMetricTone label="Atividades" value={String(displayActivities.length)} tone="emerald" />
                        <AdminMetricTone label="Simulados" value={String(displaySimulados.length)} tone="slate" />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(4, 1fr)' }}>
                      <AdminCommandCard
                        icon={<Users size={18} />}
                        title="Gerir membros"
                        description="Convidar, promover ou reorganizar pessoas do esquadrão."
                        actionLabel="Abrir membros"
                        onClick={() => setActiveSection('membros')}
                      />
                      <AdminCommandCard
                        icon={<BookOpen size={18} />}
                        title="Definir professores"
                        description="Adicionar professor ou ajustar a equipa responsável."
                        actionLabel="Adicionar professor"
                        onClick={() => openAdminFlow('add-teacher', 'admin')}
                      />
                      <AdminCommandCard
                        icon={<ClipboardList size={18} />}
                        title="Publicações internas"
                        description="Lançar atividade, simulado ou aviso em poucos cliques."
                        actionLabel="Abrir atalhos"
                        onClick={() => openAdminFlow('activity', 'admin', { status: 'Aberta' })}
                      />
                      <AdminCommandCard
                        icon={<Shield size={18} />}
                        title="Permissões"
                        description="Controlar o que a gestão e os professores podem fazer."
                        actionLabel="Ajustar"
                        onClick={() => openAdminFlow('permissions', 'admin')}
                      />
                    </div>
                  </section>

                  <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1.2fr 0.8fr' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      <AdminPanel
                        icon={<UserPlus size={18} style={{ color: 'var(--pl-accent)' }} />}
                        title="Pessoas do esquadrão"
                        subtitle="Visual limpo para bater o olho e entender quem é dono, professor ou membro."
                      >
                        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                          <ActionChip label="Convidar aluno" onClick={() => openAdminFlow('invite-student', 'admin')} />
                          <ActionChip label="Adicionar professor" onClick={() => openAdminFlow('add-teacher', 'admin')} />
                          <ActionChip label="Gerir permissões" onClick={() => openAdminFlow('permissions', 'admin')} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {adminMembers.map((member) => (
                            <AdminMemberRow
                              key={member.id}
                              member={member}
                              onManagePermissions={() =>
                                openAdminFlow('permissions', 'admin', {
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
                        icon={<ClipboardList size={18} style={{ color: 'var(--pl-accent)' }} />}
                        title="Atalhos de publicação"
                        subtitle="As ações principais ficam visíveis e organizadas, sem parecer um monte de botão jogado."
                      >
                        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                          <AdminActionCard
                            title="Publicar atividade"
                            helper="Criar lista, checklist ou tarefa com prazo."
                            badge="Acadêmico"
                            onClick={() => openAdminFlow('activity', 'admin', { status: 'Aberta' })}
                          />
                          <AdminActionCard
                            title="Publicar simulado"
                            helper="Agendar aplicação com data, hora e instruções."
                            badge="Avaliação"
                            onClick={() => openAdminFlow('simulado', 'admin')}
                          />
                          <AdminActionCard
                            title="Fixar aviso"
                            helper="Subir comunicado importante para o topo do mural."
                            badge="Comunicado"
                            onClick={() => openAdminFlow('notice', 'admin')}
                          />
                          <AdminActionCard
                            title="Promover professor"
                            helper="Dar selo e liberar atuação interna no esquadrão."
                            badge="Permissão"
                            onClick={() => openAdminFlow('permissions', 'admin')}
                          />
                        </div>
                      </AdminPanel>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      <AdminPanel
                        icon={<Shield size={18} style={{ color: 'var(--pl-accent)' }} />}
                        title="Estado das permissões"
                        subtitle="Leitura rápida do que está ativo hoje dentro do esquadrão."
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <PermissionItem label="Gerir professores" value={selectedSquad?.permissions?.manageTeachers === false ? 'Restrito' : 'Ativo'} />
                          <PermissionItem label="Aprovar membros" value={selectedSquad?.permissions?.approveMembers === false ? 'Restrito' : 'Ativo'} />
                          <PermissionItem label="Publicar simulados" value={selectedSquad?.permissions?.publishSimulados === false ? 'Restrito' : 'Ativo'} />
                          <PermissionItem label="Publicar atividades" value={selectedSquad?.permissions?.publishActivities === false ? 'Restrito' : 'Ativo'} />
                          <PermissionItem label="Fixar mural" value={selectedSquad?.permissions?.pinNotices === false ? 'Restrito' : 'Ativo'} />
                        </div>

                        <div className="pl-card-paper" style={{ marginTop: 16, padding: 16, border: '1px dashed var(--pl-accent-ring)' }}>
                          <p className="pl-eyebrow" style={{ marginBottom: 8, color: 'var(--pl-accent)' }}>Ajuste rápido</p>
                          <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)', margin: 0 }}>
                            Precisa trocar um membro para professor ou mexer em escopo? Abre o fluxo de permissões e resolve sem gambiarra.
                          </p>
                          <button
                            type="button"
                            onClick={() => openAdminFlow('permissions', 'admin')}
                            className="pl-btn pl-btn-primary"
                            style={{ marginTop: 16 }}
                          >
                            Ajustar permissões
                          </button>
                        </div>
                      </AdminPanel>

                      <AdminPanel
                        icon={<Sparkles size={18} style={{ color: 'var(--pl-accent)' }} />}
                        title="Resumo operacional"
                        subtitle="Panorama curto para saber se o esquadrão está redondo ou pedindo socorro."
                      >
                        <div style={{ display: 'grid', gap: 12 }}>
                          <AdminMetric label="Professores com selo" value={String(selectedSquad.teachers?.length || 0)} />
                          <AdminMetric label="Membros totais" value={String(selectedSquad.members || 0)} />
                          <AdminMetric label="Avisos publicados" value={String(displayNotices.length)} />
                          <AdminMetric label="Atividades ativas" value={String(displayActivities.length)} />
                        </div>
                      </AdminPanel>

                      <AdminPanel
                        icon={<MessageCircle size={18} style={{ color: 'var(--pl-accent)' }} />}
                        title="Moderação do fórum"
                        subtitle="Aba exclusiva para o ADM controlar conteúdo, fixar, ocultar e apagar posts."
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {scopedForumPosts.slice(0, 10).map((post) => (
                            <div key={post.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 8, border: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: '12px' }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{post.title}</p>
                                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)', margin: 0 }}>
                                  {post.author} • {post.category} {post.hidden ? '• oculto' : ''}
                                </p>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => handleModerateForumPost(post.id, 'pin')}
                                  className="pl-btn pl-btn-ghost pl-btn-sm"
                                >
                                  {post.pinned ? 'Desfixar' : 'Fixar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleModerateForumPost(post.id, 'hide')}
                                  className="pl-btn pl-btn-sm"
                                  style={{ border: '1px solid var(--pl-warn)', background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)' }}
                                >
                                  {post.hidden ? 'Mostrar' : 'Ocultar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleModerateForumPost(post.id, 'delete')}
                                  className="pl-btn pl-btn-sm"
                                  style={{ border: '1px solid var(--pl-danger)', background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)' }}
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

function MiniHeroStat({ label, value, accent = 'slate' }) {
  const surfaceStyle =
    accent === 'amber'
      ? { border: '1px solid rgba(212,175,55,0.22)', background: 'rgba(255,251,235,0.07)', backdropFilter: 'blur(8px)' }
      : accent === 'indigo'
        ? { border: '1px solid rgba(129,140,248,0.18)', background: 'rgba(99,102,241,0.10)', backdropFilter: 'blur(8px)' }
        : { border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(248,250,252,0.06)', backdropFilter: 'blur(8px)' };
  const labelColor =
    accent === 'amber' ? '#e8d5b0' : accent === 'indigo' ? '#b4b9fc' : '#94a3b8';
  return (
    <div
      style={{ minWidth: '7.5rem', maxWidth: '14rem', borderRadius: 12, padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', ...surfaceStyle }}
    >
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: labelColor, margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: '#f4f6fa', wordBreak: 'break-words', margin: 0 }}>{value}</p>
    </div>
  );
}

function QuickStatCard({ icon, label, value }) {
  return (
    <div className="pl-card-paper" style={{ padding: 16 }}>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-ink-3)' }}>
        {icon}
        {label}
      </div>
      <p className="pl-num" style={{ fontSize: 22 }}>{value}</p>
    </div>
  );
}

function ForumBadge({ label, value }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.1)', padding: '12px 16px', backdropFilter: 'blur(4px)' }}>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(199,210,254,0.9)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>{value}</p>
    </div>
  );
}

function ForumPostFeatured({ post }) {
  return (
    <div className="pl-card" style={{ padding: 20, border: '1px solid var(--pl-accent-ring)', background: 'var(--pl-accent-soft)' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 12 }}>
          <img src={post.avatar || 'https://i.pravatar.cc/150?img=1'} alt={post.author} style={{ height: 48, width: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <h5 style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.author}</span>
              {post.badge ? <Shield size={12} style={{ flexShrink: 0, color: 'var(--pl-accent)' }} fill="currentColor" /> : null}
            </h5>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--pl-ink-4)', margin: 0 }}>
              {post.createdAt} • {post.section}
            </p>
          </div>
        </div>

        <span className="pl-tag pl-tag-warn">Fixado</span>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <span className="pl-tag pl-tag-warn">{post.category}</span>
        <span className="pl-tag">{post.subject}</span>
      </div>

      <h4 style={{ fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{post.title}</h4>
      <p style={{ marginTop: 12, fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)', margin: '12px 0 0' }}>{post.message}</p>

      <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, borderTop: '1px solid var(--pl-rule)', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
          <ThumbsUp size={14} />
          {post.helpful}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
          <MessageCircle size={14} />
          {post.replies} respostas
        </div>
      </div>
    </div>
  );
}

function ForumPostCompact({ post }) {
  return (
    <div className="pl-card-paper" style={{ width: '100%', padding: 16, textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <img src={post.avatar || 'https://i.pravatar.cc/150?img=1'} alt={post.author} style={{ height: 40, width: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{post.author}</p>
            <span className="pl-tag">{post.subject}</span>
          </div>
          <h5 style={{ marginTop: 8, fontSize: 15, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '8px 0 4px' }}>{post.title}</h5>
          <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.message}</p>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-ink-4)' }}>
            <span>{post.createdAt}</span>
            <span>{post.replies} respostas</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForumPostFull({ post, expanded, onToggleReplies, onOpenThread }) {
  const getCategoryTag = (category) => {
    const cat = String(category).toLowerCase();
    if (cat.includes('dúvida') || cat.includes('duvida')) return 'pl-tag pl-tag-danger';
    if (cat === 'aviso') return 'pl-tag pl-tag-warn';
    if (cat === 'resumo') return 'pl-tag pl-tag-success';
    return 'pl-tag';
  };

  return (
    <article className="pl-card" style={{ padding: 24, boxShadow: 'var(--pl-sh-low)' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 12 }}>
          <img src={post.avatar || 'https://i.pravatar.cc/150?img=1'} alt={post.author} style={{ height: 44, width: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <h5 style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.author}</span>
              {post.badge ? <Shield size={12} style={{ color: 'var(--pl-accent)' }} fill="currentColor" /> : null}
            </h5>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--pl-ink-4)', margin: 0 }}>
              {post.createdAt} • {post.section}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {post.pinned ? <span className="pl-tag pl-tag-warn">Fixado</span> : null}
          {post.solved ? <span className="pl-tag pl-tag-success">Resolvido</span> : null}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span className={getCategoryTag(post.category)}>{post.category}</span>
          <span className="pl-tag">{post.subject}</span>
        </div>

        <h4 style={{ fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)', margin: '0 0 8px' }}>{post.title}</h4>
        <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)', margin: 0 }}>{post.message}</p>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, borderTop: '1px solid var(--pl-rule)', borderBottom: '1px solid var(--pl-rule)', padding: '16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-3)' }}>
          <ThumbsUp size={16} /> {post.helpful}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-3)' }}>
          <MessageCircle size={16} /> {post.replies} respostas
        </div>
        <button
          type="button"
          onClick={onOpenThread}
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--pl-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Abrir tópico
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-3)' }}>
          <Eye size={16} /> {post.views} visualizações
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Comentários</p>
            <h5 style={{ fontSize: 18, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{post.comments?.length || 0} respostas principais</h5>
          </div>

          <button
            type="button"
            onClick={onToggleReplies}
            className="pl-btn pl-btn-ghost"
          >
            {expanded ? 'Ocultar respostas' : 'Ver comentários'}
          </button>
        </div>

        {expanded ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
    <div style={level > 0 ? { marginLeft: 24, borderLeft: '1px solid var(--pl-accent-ring)', paddingLeft: 16 } : {}}>
      <div className="pl-card-paper" style={{ padding: 16 }}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 12 }}>
            <img src={comment.avatar || 'https://i.pravatar.cc/150?img=1'} alt={comment.author} style={{ height: 36, width: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <h6 style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comment.author}</span>
                {comment.badge ? <Shield size={11} style={{ color: 'var(--pl-accent)' }} fill="currentColor" /> : null}
              </h6>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-ink-4)', margin: 0 }}>{comment.createdAt}</p>
            </div>
          </div>

        </div>

        <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)', margin: 0 }}>{comment.content}</p>

        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-3)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-3)' }}>
            <ThumbsUp size={14} />
            {comment.likes || 0}
          </span>
          {(comment.children || []).length ? (
            <button
              type="button"
              onClick={() => setShowChildren((prev) => !prev)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 700, color: 'var(--pl-accent)' }}
            >
              {showChildren ? 'Ocultar aninhadas' : `Ver aninhadas (${comment.children.length})`}
            </button>
          ) : null}
        </div>
      </div>

      {showChildren && (comment.children || []).length ? (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
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
    <div className="pl-card" style={{ overflow: 'hidden', boxShadow: 'var(--pl-sh-low)' }}>
      <div style={{ position: 'relative', height: 80, background: 'linear-gradient(to right, var(--pl-bg-soft), var(--pl-surface), var(--pl-accent-soft))' }}>
        <div style={{ position: 'absolute', bottom: -40, left: 24, height: 80, width: 80, borderRadius: 16, border: '4px solid var(--pl-surface)', background: 'var(--pl-surface)', padding: 4, boxShadow: 'var(--pl-sh-mid)' }}>
          {teacher.avatar ? (
            <img src={teacher.avatar} alt={teacher.name} style={{ height: '100%', width: '100%', borderRadius: 12, objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'var(--pl-accent-soft)', fontWeight: 600, color: 'var(--pl-accent)' }}>
              {String(teacher.name || 'P').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: 24, paddingTop: 56 }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2, color: 'var(--pl-ink)', margin: '0 0 4px', wordBreak: 'break-words' }}>{teacher.name}</h3>
            <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-3)', margin: 0, wordBreak: 'break-words' }}>{teacher.subject}</p>
          </div>
          <span className="pl-tag pl-tag-accent" style={{ flexShrink: 0 }}>Selo Papirando</span>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="pl-card-paper" style={{ padding: 16 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Selo · matéria</p>
            <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: 'var(--pl-ink-2)', margin: '0 0 8px', wordBreak: 'break-words' }}>{teacher.subject}</p>
            {teacher.bio ? <p style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-3)', margin: 0 }}>{teacher.bio}</p> : null}
          </div>

          <div className="pl-card-paper" style={{ padding: 16 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Ambiente</p>
            <span className="pl-tag pl-tag-warn">Esquadrão Papirando</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherMiniCard({ teacher }) {
  return (
    <div className="pl-card-paper" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12 }}>
      <div style={{ height: 48, width: 48, borderRadius: '50%', background: 'var(--pl-surface)', padding: 4, boxShadow: 'var(--pl-sh-low)', flexShrink: 0 }}>
        {teacher.avatar ? (
          <img src={teacher.avatar} alt={teacher.name} style={{ height: '100%', width: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--pl-accent-soft)', fontSize: 14, fontWeight: 600, color: 'var(--pl-accent)' }}>
            {String(teacher.name || 'P').charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{teacher.name}</p>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--pl-ink-4)', margin: 0, wordBreak: 'break-words' }}>{teacher.subject}</p>
      </div>
    </div>
  );
}

function SummaryInfo({ label, value }) {
  return (
    <div className="pl-card-paper" style={{ padding: '12px 16px' }}>
      <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)', margin: 0, wordBreak: 'break-words' }}>{value}</p>
    </div>
  );
}

function RankingRow({ item }) {
  const isFirst = item.rank === 1;
  const isSecond = item.rank === 2;
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12, border: isFirst ? '1px solid var(--pl-warn)' : '1px solid var(--pl-rule)', background: isFirst ? 'var(--pl-warn-soft)' : 'var(--pl-surface)', overflow: 'hidden' }}>
      {isFirst ? <div style={{ position: 'absolute', bottom: 0, left: 0, top: 0, width: 4, background: 'var(--pl-warn)' }} /> : null}

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ borderRadius: '50%', background: 'var(--pl-surface)', padding: 4, border: isFirst ? '2px solid var(--pl-warn)' : isSecond ? '2px solid var(--pl-ink-3)' : '2px solid var(--pl-warn-soft)', height: isFirst ? 48 : 40, width: isFirst ? 48 : 40, boxSizing: 'border-box' }}>
          {item.avatar ? (
            <img src={item.avatar} alt={item.name} style={{ height: '100%', width: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--pl-accent-soft)', fontSize: 12, fontWeight: 600, color: 'var(--pl-accent)' }}>
              {String(item.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: -8, right: -8, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '2px solid var(--pl-surface)', color: '#fff', background: isFirst ? 'var(--pl-warn)' : isSecond ? 'var(--pl-ink-3)' : 'var(--pl-warn)', width: isFirst ? 24 : 20, height: isFirst ? 24 : 20, fontSize: isFirst ? 12 : 10, fontWeight: 600 }}>
          {item.rank}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: isFirst ? 600 : 700, color: 'var(--pl-ink)', margin: 0 }}>{item.name}</p>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--pl-ink-4)', margin: 0 }}>{item.tier}</p>
      </div>

      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: isFirst ? 'var(--pl-warn)' : 'var(--pl-ink-2)', margin: 0 }}>{item.metric}</p>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: isFirst ? 'var(--pl-warn)' : 'var(--pl-ink-4)', margin: 0 }}>XP</p>
      </div>
    </div>
  );
}

function MembersHero({ squad, canManageSquad }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, background: 'linear-gradient(to right, var(--pl-ink), #1e3a8a)', padding: 24, color: '#fff', boxShadow: 'var(--pl-sh-high)' }}>
      <div style={{ pointerEvents: 'none', position: 'absolute', top: -40, right: 0, height: 160, width: 160, borderRadius: '50%', background: 'rgba(129,140,248,0.2)', filter: 'blur(48px)' }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 8, border: '1px solid var(--pl-warn)', background: 'var(--pl-warn)', padding: '6px 12px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff', boxShadow: 'var(--pl-sh-low)' }}>
            <Users size={12} />
            Gestão de membros
          </div>
          <h3 style={{ marginTop: 16, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: '16px 0 8px' }}>Membros do esquadrão</h3>
          <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'rgba(199,210,254,0.9)', maxWidth: '42rem', margin: 0 }}>
            Aqui o dono do cursinho organiza quem entra, quem recebe selo de professor e quem ganha acesso às ferramentas internas.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <ForumBadge label="Total" value={String(squad?.members || 0)} />
          <ForumBadge label="Gestão" value={canManageSquad ? 'Ativa' : 'Restrita'} />
        </div>
      </div>
    </div>
  );
}

function MemberManagementRow({ member, canManageSquad, canAssignRoles, onToggleProfessor, onSetRole, onOpenPermissions }) {
  const normalizedRole = normalizeRoleLabel(member.role);
  const isProfessor =
    String(member.role || '').toLowerCase().includes('professor') ||
    String(member.role || '').toLowerCase().includes('dono') ||
    String(member.role || '').toLowerCase().includes('diretor');

  return (
    <div className="pl-card-paper" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 16 }}>
        <div style={{ height: 48, width: 48, borderRadius: '50%', background: 'var(--pl-surface)', padding: 4, boxShadow: 'var(--pl-sh-low)', flexShrink: 0 }}>
          {member.avatar ? (
            <img src={member.avatar} alt={member.name} style={{ height: '100%', width: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--pl-accent-soft)', fontSize: 14, fontWeight: 600, color: 'var(--pl-accent)' }}>
              {String(member.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{member.name}</p>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-ink-4)', margin: '2px 0 0' }}>{member.role}</p>
          {member.subject ? (
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-accent)', margin: '2px 0 0' }}>Matéria: {member.subject}</p>
          ) : null}
          {member.email ? <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 500, color: 'var(--pl-ink-3)', margin: '2px 0 0' }}>{member.email}</p> : null}
          {member.joinedAt ? <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--pl-ink-4)', margin: '2px 0 0' }}>Entrou: {member.joinedAt}</p> : null}
          {member.streakDays != null ? (
            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--pl-warn)', margin: '2px 0 0' }}>Ofensiva: {member.streakDays} dias</p>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <span
          className="pl-tag"
          style={getRolePillStyle(normalizedRole)}
        >
          {normalizedRole}
        </span>

        <span className="pl-tag pl-tag-success">{member.tag}</span>

        {canManageSquad ? (
          <>
            {canAssignRoles ? (
              <select
                value={normalizedRole}
                onChange={(e) => onSetRole?.(member, e.target.value)}
                className="pl-input"
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                {CURSINHO_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            ) : (
              <button
                type="button"
                onClick={() => onToggleProfessor?.(member)}
                className="pl-btn pl-btn-ghost pl-btn-sm"
              >
                {isProfessor ? 'Remover selo' : 'Dar selo'}
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenPermissions?.()}
              className="pl-btn pl-btn-ghost pl-btn-sm"
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
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, background: 'linear-gradient(to right, #102347, #17346a, #1e3a8a)', padding: 24, color: '#fff', boxShadow: 'var(--pl-sh-high)' }}>
      <div style={{ pointerEvents: 'none', position: 'absolute', top: -56, right: 0, height: 176, width: 176, borderRadius: '50%', background: 'rgba(129,140,248,0.2)', filter: 'blur(48px)' }} />
      <div style={{ pointerEvents: 'none', position: 'absolute', bottom: 0, left: 0, height: 112, width: 112, borderRadius: '50%', background: 'rgba(34,211,238,0.1)', filter: 'blur(32px)' }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 8, border: '1px solid var(--pl-warn)', background: 'var(--pl-warn)', padding: '6px 12px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff', boxShadow: 'var(--pl-sh-low)' }}>
            <Wrench size={12} />
            Administração do esquadrão
          </div>
          <h3 style={{ marginTop: 16, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: '16px 0 8px' }}>Painel de controle interno</h3>
          <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'rgba(199,210,254,0.9)', maxWidth: '42rem', margin: 0 }}>
            Tudo que o dono precisa para organizar pessoas, controlar publicações e manter o esquadrão nos trilhos.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <ForumBadge label="Professores" value={String(squad?.teachers?.length || 0)} />
          <ForumBadge label="Membros" value={String(squad?.members || 0)} />
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ icon, title, subtitle, children }) {
  return (
    <section className="pl-card" style={{ overflow: 'hidden' }}>
      <div style={{ borderBottom: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ marginTop: 2, display: 'flex', height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', flexShrink: 0 }}>
            {icon}
          </div>
          <div>
            <h4 style={{ fontSize: 18, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{title}</h4>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-3)', margin: '4px 0 0' }}>{subtitle}</p>
          </div>
        </div>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </section>
  );
}

function AdminMemberRow({ member, onManagePermissions }) {
  const role = normalizeRoleLabel(member.role);

  return (
    <div className="pl-card-paper" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      <div style={{ display: 'flex', minWidth: 0, flex: 1, alignItems: 'center', gap: 16 }}>
        <div style={{ height: 48, width: 48, borderRadius: '50%', background: 'var(--pl-surface)', padding: 4, boxShadow: 'var(--pl-sh-low)', flexShrink: 0 }}>
          {member.avatar ? (
            <img src={member.avatar} alt={member.name} style={{ height: '100%', width: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--pl-accent-soft)', fontSize: 14, fontWeight: 600, color: 'var(--pl-accent)' }}>
              {String(member.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{member.name}</p>
          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <span className="pl-tag" style={getRolePillStyle(role)}>{role}</span>
            {member.tag ? <span className="pl-tag pl-tag-success">{member.tag}</span> : null}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onManagePermissions}
        className="pl-btn pl-btn-ghost pl-btn-sm"
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
      className="pl-btn pl-btn-ghost pl-btn-sm"
    >
      {label}
    </button>
  );
}

function AdminActionCard({ title, helper, badge, onClick }) {
  return (
    <div className="pl-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 200, padding: 24 }}>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h5 style={{ paddingRight: 8, fontSize: 18, fontWeight: 600, lineHeight: 1.2, color: 'var(--pl-ink)', margin: 0 }}>{title}</h5>
        <span className="pl-tag pl-tag-accent">{badge}</span>
      </div>
      <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.75, color: 'var(--pl-ink-3)', margin: '8px 0 0' }}>{helper}</p>
      <button
        type="button"
        onClick={onClick}
        className="pl-btn pl-btn-primary"
        style={{ alignSelf: 'flex-start', marginTop: 16 }}
      >
        Abrir fluxo
      </button>
    </div>
  );
}

function PermissionItem({ label, value }) {
  return (
    <div className="pl-card-paper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--pl-ink-2)' }}>{label}</span>
      <span className={value === 'Restrito' ? 'pl-tag pl-tag-warn' : 'pl-tag pl-tag-success'}>{value}</span>
    </div>
  );
}

function AdminMetric({ label, value }) {
  return (
    <div className="pl-card-paper" style={{ padding: 16 }}>
      <p className="pl-eyebrow" style={{ marginBottom: 8 }}>{label}</p>
      <p className="pl-num" style={{ fontSize: 22 }}>{value}</p>
    </div>
  );
}


function AdminCommandCard({ icon, title, description, actionLabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pl-card"
      style={{ minHeight: 228, display: 'flex', flexDirection: 'column', padding: 24, textAlign: 'left', cursor: 'pointer', boxShadow: 'var(--pl-sh-low)' }}
    >
      <div style={{ display: 'flex', height: 48, width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', flexShrink: 0 }}>
        {icon}
      </div>
      <h4 style={{ marginTop: 20, fontSize: 18, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em', color: 'var(--pl-ink)', marginBottom: 0 }}>{title}</h4>
      <p style={{ marginTop: 12, fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-3)', margin: '12px 0 0' }}>{description}</p>
      <span style={{ marginTop: 'auto', paddingTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--pl-accent)' }}>
        {actionLabel}
        <ArrowRight size={13} />
      </span>
    </button>
  );
}

function AdminMetricTone({ label, value, tone = 'blue' }) {
  const toneStyleMap = {
    blue: { border: '1px solid var(--pl-accent-ring)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' },
    gold: { border: '1px solid var(--pl-warn)', background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)' },
    emerald: { border: '1px solid var(--pl-success)', background: 'var(--pl-success-soft)', color: 'var(--pl-success)' },
    slate: { border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-2)' },
  };
  const s = toneStyleMap[tone] || toneStyleMap.blue;

  return (
    <div style={{ borderRadius: 16, padding: '12px 16px', ...s }}>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.75, margin: 0 }}>{label}</p>
      <p style={{ marginTop: 4, fontSize: 22, fontWeight: 600, lineHeight: 1, margin: '4px 0 0' }}>{value}</p>
    </div>
  );
}

function AdminDangerZone({ onDelete }) {
  return (
    <section style={{ overflow: 'hidden', borderRadius: 16, border: '1px solid var(--pl-danger)', background: 'var(--pl-danger-soft)', boxShadow: 'var(--pl-sh-low)' }}>
      <div style={{ borderBottom: '1px solid var(--pl-danger)', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ marginTop: 2, display: 'flex', height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)', flexShrink: 0 }}>
            <AlertCircle size={18} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--pl-danger)', margin: 0 }}>Danger zone</p>
            <h4 style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: 'var(--pl-ink)', margin: '4px 0 4px' }}>Excluir esquadrão</h4>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)', margin: 0 }}>
              Área separada para ação crítica. Nada de misturar isso com o resto e clicar errado num dia torto.
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        <button
          type="button"
          onClick={onDelete}
          className="pl-btn"
          style={{ width: '100%', background: 'var(--pl-danger)', color: '#fff', border: 'none', boxShadow: '0 12px 24px rgba(220,38,38,0.18)' }}
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
    <div className="pl-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Paginação</p>
          <h4 style={{ fontSize: 18, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>Página {page} de {totalPages}</h4>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={onPrev}
            disabled={page <= 1}
            className="pl-btn pl-btn-ghost pl-btn-sm"
            style={{ opacity: page <= 1 ? 0.45 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
          >
            <ArrowLeft size={14} />
            Anterior
          </button>

          {pages.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPick(item)}
              className={item === page ? 'pl-btn pl-btn-primary pl-btn-sm' : 'pl-btn pl-btn-ghost pl-btn-sm'}
              style={{ minWidth: 36 }}
            >
              {item}
            </button>
          ))}

          <button
            type="button"
            onClick={onNext}
            disabled={page >= totalPages}
            className="pl-btn pl-btn-ghost pl-btn-sm"
            style={{ opacity: page >= totalPages ? 0.45 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
          >
            Próxima
            <ArrowRight size={14} />
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
    permissions: 'Gerir permissoes',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: 640, flexDirection: 'column', overflow: 'hidden', borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-high)' }}>
        <div style={{ borderBottom: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 8 }}>ADM do esquadrao</p>
              <h3 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--pl-ink)', margin: 0 }}>{titleMap[flow.type] || 'Fluxo interno'}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="pl-btn pl-btn-ghost"
              style={{ padding: 8, flexShrink: 0 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, padding: 24 }}>
          {(isNotice || isActivity || isSimulado) ? (
            <input
              type="text"
              value={flow.title}
              onChange={(event) => onChange((prev) => ({ ...prev, title: event.target.value }))}
              className="pl-input"
              placeholder="Titulo principal"
            />
          ) : null}

          {isActivity ? (
            <select
              value={flow.status}
              onChange={(event) => onChange((prev) => ({ ...prev, status: event.target.value }))}
              className="pl-input"
            >
              <option>Aberta</option>
              <option>Programada</option>
              <option>Pendente</option>
              <option>Fechada</option>
            </select>
          ) : null}

          {isSimulado ? (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <input
                type="date"
                value={flow.date}
                onChange={(event) => onChange((prev) => ({ ...prev, date: event.target.value }))}
                className="pl-input"
              />
              <input
                type="time"
                value={flow.time}
                onChange={(event) => onChange((prev) => ({ ...prev, time: event.target.value }))}
                className="pl-input"
              />
            </div>
          ) : null}

          {isActivity ? (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <input
                type="date"
                value={flow.dueDate}
                onChange={(event) => onChange((prev) => ({ ...prev, dueDate: event.target.value }))}
                className="pl-input"
              />
              <input
                type="time"
                value={flow.dueTime}
                onChange={(event) => onChange((prev) => ({ ...prev, dueTime: event.target.value }))}
                className="pl-input"
              />
            </div>
          ) : null}

          {(isActivity || isSimulado) ? (
            <input
              type="text"
              value={flow.helper}
              onChange={(event) => onChange((prev) => ({ ...prev, helper: event.target.value }))}
              className="pl-input"
              placeholder="Descricao operacional"
            />
          ) : null}

          {isNotice ? (
            <textarea
              rows="4"
              value={flow.description}
              onChange={(event) => onChange((prev) => ({ ...prev, description: event.target.value }))}
              className="pl-input"
              style={{ resize: 'none' }}
              placeholder="Escreva o comunicado que sera fixado no mural"
            />
          ) : null}

          {(isNotice || isActivity || isSimulado) ? (
            <label style={{ borderRadius: 8, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '16px', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)', display: 'block' }}>
              Anexo opcional
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                style={{ marginTop: 8, display: 'block', width: '100%', fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)' }}
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
                <span style={{ marginTop: 12, display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-accent)' }}>
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
              className="pl-input"
              placeholder="Nome do aluno convidado"
            />
          ) : null}

          {isTeacher ? (
            <>
              <input
                type="text"
                value={flow.teacherName}
                onChange={(event) => onChange((prev) => ({ ...prev, teacherName: event.target.value }))}
                className="pl-input"
                placeholder="Nome do professor"
              />
              <input
                type="text"
                value={flow.teacherSubject}
                onChange={(event) => onChange((prev) => ({ ...prev, teacherSubject: event.target.value }))}
                className="pl-input"
                placeholder="Materia ou responsabilidade"
              />
            </>
          ) : null}

          {isPermissions ? (
            <>
              <select
                value={flow.memberId}
                onChange={(event) => onChange((prev) => ({ ...prev, memberId: event.target.value }))}
                className="pl-input"
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
                className="pl-input"
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
                  className="pl-input"
                  placeholder="Materia do professor, se for promover"
                />
              ) : null}
            </>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '20px 24px' }}>
          <button
            type="button"
            onClick={onClose}
            className="pl-btn pl-btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="pl-btn pl-btn-primary"
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: 720, flexDirection: 'column', overflow: 'hidden', borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-high)' }}>
        <div style={{ borderBottom: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Professor e cursinho</p>
              <h3 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--pl-ink)', margin: 0 }}>Novo esquadrao</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="pl-btn pl-btn-ghost"
              style={{ padding: 8, flexShrink: 0 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, padding: 24, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <input
            type="text"
            value={form.name}
            onChange={(event) => onChange((prev) => ({ ...prev, name: event.target.value }))}
            className="pl-input"
            placeholder="Nome do esquadrao"
          />

          <select
            value={form.focus}
            onChange={(event) => onChange((prev) => ({ ...prev, focus: event.target.value }))}
            className="pl-input"
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
            className="pl-input"
          >
            <option>Privado</option>
            <option>Por convite</option>
            <option>Publico para assinantes</option>
          </select>

          <input
            type="text"
            value={form.inviteCode}
            onChange={(event) => onChange((prev) => ({ ...prev, inviteCode: event.target.value.toUpperCase() }))}
            className="pl-input"
            placeholder="Codigo de entrada do esquadrao"
          />

          <textarea
            rows="4"
            value={form.description}
            onChange={(event) => onChange((prev) => ({ ...prev, description: event.target.value }))}
            className="pl-input"
            style={{ gridColumn: '1 / -1', resize: 'none' }}
            placeholder="Descreva a proposta da turma, metodologia, rotina e objetivo do esquadrao"
          />

          <label style={{ gridColumn: '1 / -1', borderRadius: 8, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16, fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)', display: 'block' }}>
            Upload da foto/capa
            <input
              type="file"
              accept="image/*"
              style={{ marginTop: 8, display: 'block', width: '100%', fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)' }}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const dataUrl = await fileToDataUrl(file);
                onChange((prev) => ({ ...prev, coverUrl: dataUrl }));
              }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '20px 24px' }}>
          <button
            type="button"
            onClick={onClose}
            className="pl-btn pl-btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="pl-btn pl-btn-primary"
          >
            Criar esquadrao
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ squadName, onClose, onConfirm }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480, borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 24, boxShadow: 'var(--pl-sh-high)' }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--pl-danger)', margin: 0 }}>Confirmacao</p>
        <h3 style={{ marginTop: 12, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--pl-ink)', marginBottom: 0 }}>Excluir esquadrao?</h3>
        <p style={{ marginTop: 12, fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)', margin: '12px 0 0' }}>
          Voce esta prestes a remover <span style={{ fontWeight: 700, color: 'var(--pl-ink)' }}>{squadName}</span>. Essa acao apaga o vinculo da equipe na sua area interna.
        </p>
        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            className="pl-btn pl-btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="pl-btn"
            style={{ background: 'var(--pl-danger)', color: '#fff', border: 'none', boxShadow: '0 12px 24px rgba(220,38,38,0.22)' }}
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
