function normalizeKey(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const CONTEST_STATUS_OPTIONS = [
  { value: 'previsto', label: 'Previsto' },
  { value: 'autorizado', label: 'Autorizado' },
  { value: 'comissao_formada', label: 'Comissão formada' },
  { value: 'banca_em_definicao', label: 'Banca em definição' },
  { value: 'banca_definida', label: 'Banca definida' },
  { value: 'edital_iminente', label: 'Edital iminente' },
  { value: 'edital_publicado', label: 'Edital publicado' },
  { value: 'inscricoes_abertas', label: 'Inscrições abertas' },
  { value: 'prova_marcada', label: 'Prova marcada' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'homologado', label: 'Homologado' },
];

export const CONTEST_STATUS_LABELS = CONTEST_STATUS_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {
    confirmado: 'Edital publicado',
    suspeito: 'Previsto',
    suspenso: 'Suspenso',
    encerrado: 'Homologado',
    em_analise: 'Previsto',
  }
);

export function normalizeContestStatus(value = '') {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalized) return 'edital_publicado';
  // "inscricoes_encerradas" tem que ser testado ANTES do /inscric/ genérico — senão
  // um certame com inscrição fechada aparecia para o aluno como "Inscrições abertas".
  if (/encerrad|fechad|prorrog.*encerr/.test(normalized)) {
    return /inscric/.test(normalized) ? 'prova_marcada' : 'homologado';
  }
  if (/inscric|abert/.test(normalized)) return 'inscricoes_abertas';
  if (/prova|data_marcada|marcad/.test(normalized)) return 'prova_marcada';
  if (/homolog|encerr/.test(normalized)) return 'homologado';
  if (/andamento|curso/.test(normalized)) return 'em_andamento';
  if (/iminente/.test(normalized)) return 'edital_iminente';
  if (/publicad|confirm/.test(normalized)) return 'edital_publicado';
  if (/banca.*defin|defin.*banca|contratad/.test(normalized)) return 'banca_definida';
  if (/banca/.test(normalized)) return 'banca_em_definicao';
  if (/comissao/.test(normalized)) return 'comissao_formada';
  if (/autoriz/.test(normalized)) return 'autorizado';
  if (/previst|suspeit|analise/.test(normalized)) return 'previsto';
  return CONTEST_STATUS_LABELS[normalized] ? normalized : 'previsto';
}

function parseMoney(value = '') {
  const match = String(value || '').match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/);
  if (!match) return null;
  const amount = Number(match[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(amount) ? amount : null;
}

function formatMoney(value) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function buildMoneyRange(values = []) {
  const numbers = values.map((value) => parseMoney(value)).filter((value) => value !== null);
  if (numbers.length === 0) return '';
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return min === max ? formatMoney(min) : `${formatMoney(min)} a ${formatMoney(max)}`;
}

function buildUniqueSummary(values = [], fallback = '') {
  const unique = Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
  if (unique.length === 0) return fallback;
  if (unique.length === 1) return unique[0];
  return unique.length <= 2 ? unique.join(' / ') : 'Varia por cargo';
}

function buildVacancySummary(values = []) {
  const cleaned = values.map((value) => String(value || '').trim()).filter(Boolean);
  const numbers = cleaned.map((value) => Number(value.match(/\d+/)?.[0] || NaN));
  if (numbers.length > 0 && numbers.every(Number.isFinite)) {
    return String(numbers.reduce((acc, value) => acc + value, 0));
  }
  return buildUniqueSummary(cleaned, '');
}

function readableRoleLabel(template = {}) {
  return String(template.cargo || template.nome || template.plano || 'Cargo').trim();
}

function groupTitle(template = {}) {
  const nome = String(template.nome || '').trim();
  const cargo = String(template.cargo || '').trim();
  const dashPattern = '[\\u2013\\u2014-]';
  const withoutCargo = cargo && nome.toLowerCase().includes(cargo.toLowerCase())
    ? nome.replace(new RegExp(`\\s+${dashPattern}\\s+${cargo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '').trim()
    : nome;

  return String(withoutCargo || template.concurso || '')
    .replace(new RegExp(`\\s+${dashPattern}\\s+.+$`, 'g'), '')
    .trim() || template.nome || 'Concurso';
}

function groupSignature(template = {}, title = '') {
  const edital = normalizeKey(template.edital_url || '');
  const prova = normalizeKey(template.prova_data || '');
  const editalOrDate = edital || prova;
  if (editalOrDate) return `${normalizeKey(title)}|${editalOrDate}`;
  return normalizeKey(template.nome || title || template.concurso || template.id || '');
}

function relatedInstitutionKey(template = {}) {
  const source = String(template.concurso || template.nome || template.plano || '').trim();
  const acronym = source.match(/\b[A-Z]{2,}(?:-[A-Z]{2})?\b/)?.[0];
  return normalizeKey(acronym || source);
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
    const key = groupSignature(template, title) || normalizeKey(title || template.concurso || template.nome || template.id || index);

    if (!groups.has(key)) {
      groups.set(key, {
        ...template,
        id: `group-${key}`,
        groupKey: key,
        relatedKey: relatedInstitutionKey(template),
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
    group.relatedKey = group.relatedKey || relatedInstitutionKey(template);

    if (!group.imagem_url && template.imagem_url) group.imagem_url = template.imagem_url;
    if (!group.edital_url && template.edital_url) group.edital_url = template.edital_url;
    if (!group.prova_data && template.prova_data) group.prova_data = template.prova_data;
    if (!group.salario && template.salario) group.salario = template.salario;
    if (!group.inscricao_valor && template.inscricao_valor) group.inscricao_valor = template.inscricao_valor;
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

    const allDisciplines = group.cargos.flatMap((role) => role.disciplinas || []);

    return {
      ...group,
      cargo: `${group.cargos.length} cargos disponíveis`,
      salario: buildMoneyRange(group.cargos.map((role) => role.salario)) || group.salario,
      inscricao_valor: buildMoneyRange(group.cargos.map((role) => role.inscricao_valor)) || group.inscricao_valor,
      escolaridade: buildUniqueSummary(group.cargos.map((role) => role.escolaridade), group.escolaridade),
      vagas: buildVacancySummary(group.cargos.map((role) => role.vagas)) || group.vagas,
      lotacao: buildUniqueSummary(group.cargos.map((role) => role.lotacao), group.lotacao),
      disciplinas: allDisciplines.length > 0 ? allDisciplines : primary.disciplinas || [],
    };
  });
}

export function findGroupedContestById(templates = [], id = '') {
  const grouped = groupContestTemplates(templates).find(
    (group) => group.id === id || group.sourceIds?.includes(id)
  );
  if (grouped) return grouped;

  const raw = templates.find((item) => item.id === id);
  if (raw) return raw;

  return null;
}

export function findRelatedContests(templates = [], contest = {}) {
  const grouped = groupContestTemplates(templates);
  const currentIds = new Set([contest.id, ...(contest.sourceIds || [])].filter(Boolean));
  const key = contest.relatedKey || relatedInstitutionKey(contest);
  if (!key) return [];

  return grouped
    .filter((item) => {
      if (!item || item.id === contest.id) return false;
      if (item.sourceIds?.some((sourceId) => currentIds.has(sourceId))) return false;
      return (item.relatedKey || relatedInstitutionKey(item)) === key;
    })
    .slice(0, 4);
}
