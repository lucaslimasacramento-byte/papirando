export const WELLNESS_PAGE_CONFIG_STORAGE_KEY = 'papirando_wellness_page_config';

/** Ícones permitidos no painel (mapeados em BemEstar.jsx). */
export const WELLNESS_PAGE_ICON_KEYS = [
  'sparkles',
  'flame',
  'target',
  'clock3',
  'wind',
  'headphones',
  'activity',
  'play',
  'pauseCircle',
  'checkCircle2',
  'zap',
  'waves',
  'moonStar',
  'brain',
  'heartHandshake',
  'quote',
  'layoutDashboard',
];

const ICON_FALLBACK = 'sparkles';

function normalizeIconKey(key, fallback = ICON_FALLBACK) {
  const raw = String(key || '').trim();
  if (WELLNESS_PAGE_ICON_KEYS.includes(raw)) return raw;
  const lower = raw.toLowerCase();
  const found = WELLNESS_PAGE_ICON_KEYS.find((k) => k.toLowerCase() === lower);
  return found || fallback;
}

function normalizeTone(tone) {
  const t = String(tone || 'default').toLowerCase();
  if (t === 'positive' || t === 'warn' || t === 'default') return t;
  return 'default';
}

function padStatusCards(input, defaults) {
  const arr = Array.isArray(input) ? input : [];
  return defaults.map((d, i) => {
    const raw = arr[i] || {};
    return {
      label: String(raw.label ?? d.label),
      value: String(raw.value ?? d.value),
      helper: String(raw.helper ?? d.helper),
      icon: normalizeIconKey(raw.icon, d.icon),
    };
  });
}

function normalizePlan(input, defaults) {
  const arr = Array.isArray(input) ? input : [];
  return defaults.map((d, i) => {
    const raw = arr[i] || {};
    return {
      title: String(raw.title ?? d.title),
      text: String(raw.text ?? d.text),
      icon: normalizeIconKey(raw.icon, d.icon),
    };
  });
}

function normalizeOverviewCards(input, defaults) {
  const arr = Array.isArray(input) ? input : [];
  const byId = {};
  arr.forEach((row) => {
    if (row && row.id) byId[String(row.id)] = row;
  });
  return defaults.map((d) => {
    const raw = byId[d.id] || {};
    return {
      id: d.id,
      title: String(raw.title ?? d.title),
      eyebrow: String(raw.eyebrow ?? d.eyebrow),
      text: String(raw.text ?? d.text),
      icon: normalizeIconKey(raw.icon, d.icon),
      accent: String(raw.accent ?? d.accent),
    };
  });
}

function normalizeDailySignals(input, defaults) {
  const arr = Array.isArray(input) ? input : [];
  return defaults.map((d, i) => {
    const raw = arr[i] || {};
    const value = Number(raw.value);
    return {
      label: String(raw.label ?? d.label),
      value: Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : d.value,
      tone: normalizeTone(raw.tone ?? d.tone),
    };
  });
}

function normalizeBreathing(input, defaults) {
  const arr = Array.isArray(input) && input.length > 0 ? input : defaults;
  return arr.map((item, index) => {
    const def = defaults[index] || defaults[0];
    const idRaw = String(item.id || def?.id || `breath-${index + 1}`).trim();
    const id = idRaw.replace(/\s+/g, '_') || `breath-${index + 1}`;
    const fasesIn = Array.isArray(item.fases) ? item.fases : [];
    const fases =
      fasesIn.length > 0
        ? fasesIn.map((f, fi) => ({
            nome: String(f?.nome || `Fase ${fi + 1}`),
            segundos: Math.max(1, Math.min(120, Number(f?.segundos) || 4)),
          }))
        : [
            { nome: 'Inspire', segundos: 4 },
            { nome: 'Expire', segundos: 6 },
          ];
    return {
      id,
      nome: String(item.nome ?? def?.nome ?? `Técnica ${index + 1}`),
      uso: String(item.uso ?? def?.uso ?? ''),
      descricao: String(item.descricao ?? def?.descricao ?? ''),
      comoFazer: String(item.comoFazer ?? def?.comoFazer ?? ''),
      insight: String(item.insight ?? def?.insight ?? ''),
      fases,
    };
  });
}

export function buildDefaultWellnessPageConfig() {
  return {
    hero: {
      badge: 'Saúde mental e foco',
      title: 'Reduzir ruído, recuperar presença e render com calma.',
      subtitle: 'Direção e respiro antes da execução — métricas rápidas e apoio à mão.',
    },
    quote: {
      prefix: 'Direção ·',
      body: 'Nem todo avanço vem de acelerar — às vezes o salto nasce ao reduzir o ruído e voltar ao centro.',
    },
    cvv: {
      eyebrow: 'Apoio CVV',
      phone: '188',
      helper: '24h · escuta sigilosa',
      linkLabel: 'Site oficial',
      url: 'https://www.cvv.org.br',
    },
    statusCards: [
      { label: 'Clareza', value: 'Alta', helper: 'Bom momento para bloco estratégico', icon: 'sparkles' },
      { label: 'Pressão', value: 'Moderada', helper: 'Respirar agora ajuda mais do que insistir torto', icon: 'flame' },
      { label: 'Foco', value: '73%', helper: 'Janela forte para estudo profundo', icon: 'target' },
      { label: 'Reserva', value: '25 min', helper: 'Pausa ideal antes do próximo sprint', icon: 'clock3' },
    ],
    resumo: {
      introLead: 'Resumo ·',
      intro: 'Uma aba por tipo de cuidado. Rituais curtos entre blocos evitam sobrecarga.',
    },
    wellbeingPlan: [
      { title: 'Antes', text: '2–4 min de respiração para entrar focado.', icon: 'play' },
      { title: 'Durante', text: 'Pausa rápida se o corpo ou a mente pedirem.', icon: 'pauseCircle' },
      { title: 'Depois', text: 'Áudio leve na biblioteca para fechar sem fadiga.', icon: 'checkCircle2' },
    ],
    overviewCards: [
      {
        id: 'respiracao',
        title: 'Respiração guiada',
        eyebrow: 'Regulação rápida',
        text: 'Entre, escolha a técnica e coloque a mente de volta no eixo.',
        icon: 'wind',
        accent: 'from-blue-500/15 to-indigo-500/10',
      },
      {
        id: 'meditacoes',
        title: 'Biblioteca sonora',
        eyebrow: 'Recuperação mental',
        text: 'Áudios curtos para ansiedade, foco e recuperação cognitiva.',
        icon: 'headphones',
        accent: 'from-indigo-500/15 to-sky-500/10',
      },
      {
        id: 'pausas',
        title: 'Pausas rápidas',
        eyebrow: 'Vídeos curtos',
        text: 'Micro pausas práticas para soltar tensão e resetar o cérebro.',
        icon: 'activity',
        accent: 'from-emerald-500/15 to-blue-500/10',
      },
    ],
    overviewDirection: {
      eyebrow: 'Direcionamento',
      title: 'Hoje seu melhor movimento não é correr. É calibrar.',
      body:
        'Entre em respiração guiada se a mente estiver acelerada. Use a biblioteca sonora se precisar de regulação mais longa. Vá para pausas rápidas se o corpo já começou a cobrar a conta.',
      priorityPill: 'Regular a mente',
    },
    overviewReadingsEyebrow: 'Leitura do dia',
    dailySignals: [
      { label: 'Ruído mental', value: 41, tone: 'default' },
      { label: 'Capacidade de foco', value: 73, tone: 'positive' },
      { label: 'Necessidade de pausa', value: 58, tone: 'warn' },
    ],
    navLabels: {
      visao_geral: 'Visão geral',
      respiracao: 'Respiração guiada',
      meditacoes: 'Biblioteca sonora',
      pausas: 'Pausas rápidas',
    },
    sectionCopy: {
      breathingBadge: 'Respiração guiada',
      audioEyebrow: 'Biblioteca sonora',
      audioTitle: 'Meditações e áudios guiados',
      videoTitle: 'Pausas rápidas',
      videoBody:
        'Área pronta para vídeos usando mediaType: "video" e videoUrl. Se vier áudio, também dá para abrir.',
      videoBadge: 'Biblioteca em vídeo',
    },
    breathingTechniques: [
      {
        id: 'diafragmatica',
        nome: 'Respiração diafragmática',
        uso: 'Base da calma',
        descricao:
          'Reduz a respiração curta e traz o corpo de volta para um estado mais seguro e estável.',
        comoFazer:
          'Uma mão no peito e outra na barriga. Inspire pelo nariz enchendo a barriga. Expire lentamente sem pressa.',
        fases: [
          { nome: 'Inspire', segundos: 4 },
          { nome: 'Expire', segundos: 6 },
        ],
        insight: 'Boa quando a mente está espalhada e o corpo está em alerta leve.',
      },
      {
        id: 'box',
        nome: 'Respiração quadrada',
        uso: 'Foco limpo',
        descricao: 'Ajuda a desacelerar sem te deixar mole. Muito útil antes de um bloco de estudo puxado.',
        comoFazer: 'Inspire por 4, segure por 4, expire por 4 e mantenha vazio por 4.',
        fases: [
          { nome: 'Inspire', segundos: 4 },
          { nome: 'Segure', segundos: 4 },
          { nome: 'Expire', segundos: 4 },
          { nome: 'Vazio', segundos: 4 },
        ],
        insight: 'Boa quando você quer controle e clareza antes de sentar para render.',
      },
      {
        id: 'quatro_sete_oito',
        nome: 'Técnica 4-7-8',
        uso: 'Desacelerar rápido',
        descricao: 'Excelente para reduzir ativação mental e ansiedade quando a cabeça não quer frear.',
        comoFazer: 'Expire primeiro. Inspire por 4, segure por 7 e solte tudo por 8.',
        fases: [
          { nome: 'Inspire', segundos: 4 },
          { nome: 'Segure', segundos: 7 },
          { nome: 'Expire', segundos: 8 },
        ],
        insight: 'Boa quando a mente está acelerada demais ou antes de dormir.',
      },
      {
        id: 'suspiro_fisiologico',
        nome: 'Suspiro fisiológico',
        uso: 'Reset imediato',
        descricao: 'Uma das técnicas mais rápidas para baixar a pressão quando o sistema sobe do nada.',
        comoFazer:
          'Faça uma inspiração profunda, complete com uma segunda inspiração curta e expire lentamente.',
        fases: [
          { nome: 'Inspire fundo', segundos: 3 },
          { nome: 'Complete o ar', segundos: 2 },
          { nome: 'Expire longo', segundos: 6 },
        ],
        insight: 'Boa quando bate tensão aguda, irritação ou sensação de sobrecarga.',
      },
      {
        id: 'coerente',
        nome: 'Respiração coerente',
        uso: 'Estabilidade',
        descricao: 'Cria um ritmo respiratório estável para recuperar equilíbrio e presença sem pressa.',
        comoFazer: 'Respire em fluxo contínuo, inspirando por 5 e expirando por 5.',
        fases: [
          { nome: 'Inspire', segundos: 5 },
          { nome: 'Expire', segundos: 5 },
        ],
        insight: 'Boa para estabilizar o sistema e manter consistência ao longo do dia.',
      },
    ],
  };
}

export function normalizeWellnessPageConfig(raw) {
  const d = buildDefaultWellnessPageConfig();
  if (!raw || typeof raw !== 'object') return d;

  const hero = { ...d.hero, ...(raw.hero || {}) };
  const quote = { ...d.quote, ...(raw.quote || {}) };
  const cvv = { ...d.cvv, ...(raw.cvv || {}) };
  const resumo = { ...d.resumo, ...(raw.resumo || {}) };
  const overviewDirection = { ...d.overviewDirection, ...(raw.overviewDirection || {}) };
  const sectionCopy = { ...d.sectionCopy, ...(raw.sectionCopy || {}) };
  const navLabels = { ...d.navLabels, ...(raw.navLabels || {}) };

  return {
    hero: {
      badge: String(hero.badge ?? d.hero.badge),
      title: String(hero.title ?? d.hero.title),
      subtitle: String(hero.subtitle ?? d.hero.subtitle),
    },
    quote: {
      prefix: String(quote.prefix ?? d.quote.prefix),
      body: String(quote.body ?? d.quote.body),
    },
    cvv: {
      eyebrow: String(cvv.eyebrow ?? d.cvv.eyebrow),
      phone: String(cvv.phone ?? d.cvv.phone),
      helper: String(cvv.helper ?? d.cvv.helper),
      linkLabel: String(cvv.linkLabel ?? d.cvv.linkLabel),
      url: String(cvv.url ?? d.cvv.url),
    },
    statusCards: padStatusCards(raw.statusCards, d.statusCards),
    resumo: {
      introLead: String(resumo.introLead ?? d.resumo.introLead),
      intro: String(resumo.intro ?? d.resumo.intro),
    },
    wellbeingPlan: normalizePlan(raw.wellbeingPlan, d.wellbeingPlan),
    overviewCards: normalizeOverviewCards(raw.overviewCards, d.overviewCards),
    overviewDirection: {
      eyebrow: String(overviewDirection.eyebrow ?? d.overviewDirection.eyebrow),
      title: String(overviewDirection.title ?? d.overviewDirection.title),
      body: String(overviewDirection.body ?? d.overviewDirection.body),
      priorityPill: String(overviewDirection.priorityPill ?? d.overviewDirection.priorityPill),
    },
    overviewReadingsEyebrow: String(raw.overviewReadingsEyebrow ?? d.overviewReadingsEyebrow),
    dailySignals: normalizeDailySignals(raw.dailySignals, d.dailySignals),
    navLabels: {
      visao_geral: String(navLabels.visao_geral ?? d.navLabels.visao_geral),
      respiracao: String(navLabels.respiracao ?? d.navLabels.respiracao),
      meditacoes: String(navLabels.meditacoes ?? d.navLabels.meditacoes),
      pausas: String(navLabels.pausas ?? d.navLabels.pausas),
    },
    sectionCopy: {
      breathingBadge: String(sectionCopy.breathingBadge ?? d.sectionCopy.breathingBadge),
      audioEyebrow: String(sectionCopy.audioEyebrow ?? d.sectionCopy.audioEyebrow),
      audioTitle: String(sectionCopy.audioTitle ?? d.sectionCopy.audioTitle),
      videoTitle: String(sectionCopy.videoTitle ?? d.sectionCopy.videoTitle),
      videoBody: String(sectionCopy.videoBody ?? d.sectionCopy.videoBody),
      videoBadge: String(sectionCopy.videoBadge ?? d.sectionCopy.videoBadge),
    },
    breathingTechniques: normalizeBreathing(raw.breathingTechniques, d.breathingTechniques),
  };
}

export function wellnessBreathingMapFromList(list) {
  return Object.fromEntries((Array.isArray(list) ? list : []).map((t) => [t.id, t]));
}
