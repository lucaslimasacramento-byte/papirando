/** Abas administrativas - usar para guard de rota e labels. Manter sincronizado com `Sidebar.jsx` (ADMIN_GROUPS). */
export const ADMIN_TAB_IDS = [
  'admin_dashboard',
  'admin_concursos',
  'admin_questoes',
  'admin_questoes_import',
  'admin_disciplinas',
  'admin_usuarios',
  'admin_finance',
  'admin_crm',
  'admin_audiolivros',
  'admin_mapas_mentais',
  'admin_legislacao',
  'admin_beta_feedback',
  'admin_assinaturas',
  'admin_configuracoes',
];

export function isAdminTab(tabId) {
  return ADMIN_TAB_IDS.includes(String(tabId || ''));
}

/** Títulos amigáveis para o cabeçalho (área logada). */
export const ADMIN_TAB_TITLES = {
  admin_dashboard: 'Dashboard',
  admin_concursos: 'Concursos',
  admin_questoes: 'Questões',
  admin_questoes_import: 'Importar questões',
  admin_disciplinas: 'Disciplinas',
  admin_usuarios: 'Usuários',
  admin_finance: 'Financeiro',
  admin_crm: 'CRM',
  admin_audiolivros: 'Audiolivros',
  admin_mapas_mentais: 'Mapas mentais',
  admin_legislacao: 'Legislação',
  admin_beta_feedback: 'Feedback',
  admin_assinaturas: 'Assinaturas',
  admin_configuracoes: 'Configurações',
};

/** Grupo de navegação ao qual cada aba admin pertence. */
export const ADMIN_TAB_GROUP = {
  admin_dashboard: 'Visão Geral',
  admin_concursos: 'Editorial',
  admin_questoes: 'Editorial',
  admin_questoes_import: 'Editorial',
  admin_disciplinas: 'Editorial',
  admin_usuarios: 'Usuários & Acesso',
  admin_assinaturas: 'Usuários & Acesso',
  admin_audiolivros: 'Conteúdo',
  admin_mapas_mentais: 'Conteúdo',
  admin_legislacao: 'Conteúdo',
  admin_configuracoes: 'Conteúdo',
  admin_finance: 'Negócio',
  admin_crm: 'Negócio',
  admin_beta_feedback: 'Negócio',
};

/**
 * Retorna o breadcrumb para uma aba admin.
 * Ex.: { group: 'Editorial', screen: 'Concursos' }
 */
export function getAdminBreadcrumb(tabId) {
  if (!isAdminTab(tabId)) return null;
  return {
    group: ADMIN_TAB_GROUP[tabId] || 'Admin',
    screen: ADMIN_TAB_TITLES[tabId] || tabId,
  };
}
