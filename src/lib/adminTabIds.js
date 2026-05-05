/** Abas administrativas — usar para guard de rota e labels. Manter sincronizado com `Sidebar.jsx` (ADMIN_SECTION). */
export const ADMIN_TAB_IDS = [
  'admin_dashboard',
  'admin_concursos',
  'admin_questoes',
  'admin_disciplinas',
  'admin_usuarios',
  'admin_finance',
  'admin_crm',
  'admin_audiolivros',
  'admin_mapas_mentais',
  'admin_legislacao',
  'admin_beta_feedback',
  'admin_beta_convites',
  'admin_configuracoes',
];

export function isAdminTab(tabId) {
  return ADMIN_TAB_IDS.includes(String(tabId || ''));
}

/** Títulos amigáveis para o cabeçalho (Área logada). */
export const ADMIN_TAB_TITLES = {
  admin_dashboard: 'Admin · Dashboard',
  admin_concursos: 'Admin · Concursos',
  admin_questoes: 'Admin · Questões',
  admin_disciplinas: 'Admin · Disciplinas',
  admin_usuarios: 'Admin · Usuários',
  admin_finance: 'Admin · Financeiro',
  admin_crm: 'Admin · CRM',
  admin_audiolivros: 'Admin · Audiolivros',
  admin_mapas_mentais: 'Admin · Mapas mentais',
  admin_legislacao: 'Admin · Legislação',
  admin_beta_feedback: 'Admin · Feedback beta',
  admin_beta_convites: 'Admin · Convites beta',
  admin_configuracoes: 'Admin · Configurações',
};
