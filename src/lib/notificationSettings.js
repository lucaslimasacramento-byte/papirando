export const NOTIFICATION_SETTING_OPTIONS = [
  {
    id: 'contestStatus',
    label: 'Status de concurso',
    description: 'Avisos quando um concurso acompanhado estiver homologado ou mudar de situação relevante.',
  },
  {
    id: 'examUpcoming',
    label: 'Prova se aproximando',
    description: 'Alertas para provas com data nos próximos 30 dias.',
  },
  {
    id: 'editalPending',
    label: 'Leitura de edital pendente',
    description: 'Lembretes para o aluno marcar a leitura do edital nos concursos acompanhados.',
  },
  {
    id: 'tafPreparation',
    label: 'Preparação para TAF',
    description: 'Avisos quando o concurso tiver etapa física e o aluno ainda não iniciou essa frente.',
  },
  {
    id: 'manualReminders',
    label: 'Lembretes manuais',
    description: 'Lembretes criados manualmente pelo usuário dentro da área de Lembretes.',
  },
];

export function buildDefaultNotificationSettings() {
  return NOTIFICATION_SETTING_OPTIONS.reduce((acc, option) => {
    acc[option.id] = {
      enabled: true,
      broadcastToAll: false,
    };
    return acc;
  }, {});
}

export function normalizeNotificationSettings(input) {
  const defaults = buildDefaultNotificationSettings();
  if (!input || typeof input !== 'object' || Array.isArray(input)) return defaults;

  return NOTIFICATION_SETTING_OPTIONS.reduce((acc, option) => {
    const current = input[option.id];
    acc[option.id] = {
      enabled: current?.enabled !== false,
      broadcastToAll: current?.broadcastToAll === true,
    };
    return acc;
  }, {});
}
