// Fonte única de verdade do que NÃO LANÇA no MVP.
// Aplicada ao menu lateral (Sidebar) E à busca do Header — antes a busca furava o filtro.
//
// Para reativar uma tela no lançamento, basta removê-la deste set.
// Para desligar o modo MVP por completo (mostrar tudo), defina VITE_LAUNCH_MVP=false.

export const LAUNCH_MVP_MODE = import.meta.env.VITE_LAUNCH_MVP !== 'false';

// Telas escondidas no lançamento (decisão da Revisão Final de Telas, 2026-06-19):
// Comunidade FICA; Esquadrões foi removido de vez (SAI).
export const LAUNCH_HIDDEN_TABS = new Set([
  // 'conciliar' reativado — visível apenas para quem estuda p/ concurso (CONCURSO_ONLY_TABS).
  'bem_estar',
  'audiobooks',
  'instagram',
  'aplicativos',
]);

// Telas visíveis apenas para quem estuda para concurso.
export const CONCURSO_ONLY_TABS = new Set([
  'edital',
  'edital_questao',
  'legislacao',
  'concursos',
  'conciliar',
]);

/** Uma aba deve ser ocultada no lançamento? */
export function isTabHiddenAtLaunch(tabId) {
  return LAUNCH_MVP_MODE && LAUNCH_HIDDEN_TABS.has(tabId);
}
