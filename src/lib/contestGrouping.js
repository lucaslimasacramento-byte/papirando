function normalizeKey(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readableRoleLabel(template = {}) {
  return String(template.cargo || template.nome || template.plano || 'Cargo').trim();
}

function groupTitle(template = {}) {
  const nome = String(template.nome || '').trim();
  const cargo = String(template.cargo || '').trim();
  const withoutCargo = cargo && nome.toLowerCase().includes(cargo.toLowerCase())
    ? nome.replace(new RegExp(`\\s+[—-]\\s+${cargo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '').trim()
    : nome;

  return String(withoutCargo || template.concurso || '')
    .replace(/\s+[—-]\s+.+$/g, '')
    .trim() || template.nome || 'Concurso';
}

function roleFromTemplate(template = {}, index = 0) {
  return {
    id: String(template.id || template.slug || `cargo-${index}`),
    templateId: template.id,
    slug: template.slug,
    nome: readableRoleLabel(template),
    plano: template.plano || template.nome,
    cargo: template.cargo || readableRoleLabel(template),
    salario: template.salario || '',
    inscricao_valor: template.inscricao_valor || '',
    escolaridade: template.escolaridade || '',
    vagas: template.vagas || '',
    lotacao: template.lotacao || '',
    etapas: template.etapas || '',
    etapas_tags: Array.isArray(template.etapas_tags) ? template.etapas_tags : [],
    taf_itens: Array.isArray(template.taf_itens) ? template.taf_itens : [],
    disciplinas: Array.isArray(template.disciplinas) ? template.disciplinas : [],
    sourceTemplate: template,
  };
}

export function getContestRoles(contest = {}) {
  if (Array.isArray(contest.cargos) && contest.cargos.length > 0) return contest.cargos;
  return [roleFromTemplate(contest, 0)];
}

export function getPrimaryContestRole(contest = {}) {
  return getContestRoles(contest)[0] || roleFromTemplate(contest, 0);
}

export function buildContestForRole(contest = {}, role = null) {
  const selectedRole = role || getPrimaryContestRole(contest);
  const source = selectedRole.sourceTemplate || contest;

  return {
    ...contest,
    ...source,
    id: selectedRole.templateId || source.id || selectedRole.id || contest.id,
    slug: selectedRole.slug || source.slug || contest.slug,
    nome: source.nome || contest.nome,
    plano: selectedRole.plano || source.plano || contest.plano,
    cargo: selectedRole.cargo || source.cargo || contest.cargo,
    salario: selectedRole.salario || source.salario || contest.salario,
    inscricao_valor: selectedRole.inscricao_valor || source.inscricao_valor || contest.inscricao_valor,
    escolaridade: selectedRole.escolaridade || source.escolaridade || contest.escolaridade,
    vagas: selectedRole.vagas || source.vagas || contest.vagas,
    lotacao: selectedRole.lotacao || source.lotacao || contest.lotacao,
    etapas: selectedRole.etapas || source.etapas || contest.etapas,
    etapas_tags: selectedRole.etapas_tags || source.etapas_tags || contest.etapas_tags || [],
    taf_itens: selectedRole.taf_itens || source.taf_itens || contest.taf_itens || [],
    disciplinas: selectedRole.disciplinas || source.disciplinas || [],
    parentContestId: contest.id,
    selectedCargoId: selectedRole.id,
  };
}

export function groupContestTemplates(templates = []) {
  const groups = new Map();

  templates.forEach((template, index) => {
    if (template?.is_public === false) return;
    const title = groupTitle(template);
    const key = normalizeKey(title || template.concurso || template.nome || template.id || index);

    if (!groups.has(key)) {
      groups.set(key, {
        ...template,
        id: `group-${key}`,
        sourceIds: [],
        nome: title,
        concurso: title,
        cargo: '',
        cargos: [],
        disciplinas: Array.isArray(template.disciplinas) ? template.disciplinas : [],
      });
    }

    const group = groups.get(key);
    group.sourceIds.push(template.id);
    group.cargos.push(roleFromTemplate(template, group.cargos.length));

    if (!group.imagem_url && template.imagem_url) group.imagem_url = template.imagem_url;
    if (!group.edital_url && template.edital_url) group.edital_url = template.edital_url;
    if (!group.prova_data && template.prova_data) group.prova_data = template.prova_data;
    if (!group.salario && template.salario) group.salario = template.salario;
    if (!group.escolaridade && template.escolaridade) group.escolaridade = template.escolaridade;
    if (!group.vagas && template.vagas) group.vagas = template.vagas;
    if (!group.lotacao && template.lotacao) group.lotacao = template.lotacao;
  });

  return Array.from(groups.values()).map((group) => {
    const primary = getPrimaryContestRole(group);
    if (group.cargos.length === 1) {
      const source = primary.sourceTemplate || group;
      return {
        ...source,
        cargos: group.cargos,
        sourceIds: group.sourceIds,
        parentContestId: group.id,
      };
    }

    return {
      ...group,
      cargo: group.cargos.length > 1 ? `${group.cargos.length} cargos disponíveis` : primary.cargo,
      disciplinas: primary.disciplinas || [],
    };
  });
}

export function findGroupedContestById(templates = [], id = '') {
  const raw = templates.find((item) => item.id === id);
  if (raw) return raw;

  return groupContestTemplates(templates).find(
    (group) => group.id === id || group.sourceIds?.includes(id)
  ) || null;
}
