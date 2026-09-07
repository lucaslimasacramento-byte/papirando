// Fila única de propostas de correção do catálogo (tabela contest_revisions).
// Robô de monitoramento e correção comunitária entregam aqui — ver
// docs/CATALOGO-ESTRATEGIA.md. Nada é aplicado ao catálogo sem aprovação humana.
//
// Migration: supabase/migrations/202609070001_contest_revisions.sql

// Campos que a tela de revisão sabe exibir, na ordem em que fazem sentido ler.
// Mesma allowlist da função apply_contest_revision — se um campo não está aqui,
// o banco também não aplica.
export const REVISABLE_FIELDS = [
  { key: 'status_concurso', label: 'Status do concurso' },
  { key: 'prova_data', label: 'Data da prova' },
  { key: 'edital_url', label: 'Edital (URL)' },
  { key: 'vagas', label: 'Vagas' },
  { key: 'salario', label: 'Salário' },
  { key: 'inscricao_valor', label: 'Valor da inscrição' },
  { key: 'escolaridade', label: 'Escolaridade' },
  { key: 'lotacao', label: 'Lotação' },
  { key: 'banca', label: 'Banca' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'area', label: 'Área' },
  { key: 'nome', label: 'Nome' },
  { key: 'concurso', label: 'Concurso' },
  { key: 'etapas', label: 'Etapas' },
  { key: 'etapas_tags', label: 'Etapas (tags)' },
  { key: 'taf_itens', label: 'Itens do TAF' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'imagem_url', label: 'Imagem (URL)' },
  { key: 'uf', label: 'UF' },
  { key: 'scope', label: 'Abrangência' },
  { key: 'modality', label: 'Modalidade' },
  { key: 'institution_type', label: 'Tipo de instituição' },
];

const FIELD_LABELS = new Map(REVISABLE_FIELDS.map((f) => [f.key, f.label]));

export function labelForField(key) {
  return FIELD_LABELS.get(key) || key;
}

export const ORIGEM_LABELS = {
  robo: 'Robô',
  aluno: 'Aluno',
  import: 'Importação',
};

// Formata para leitura na tela de diff. Array vira lista separada por vírgula;
// vazio/nulo aparece como travessão para o admin não confundir com string vazia.
export function formatRevisionValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Monta o diff campo a campo entre o que está no catálogo e o que foi proposto.
// Campos iguais são descartados: o robô reenviar o registro inteiro não deve
// virar 20 linhas de "sem mudança" na tela.
export function buildRevisionDiff(revision) {
  const changes = revision?.changes || {};
  const current = revision?.contest_templates || null;

  return Object.keys(changes)
    .filter((key) => FIELD_LABELS.has(key))
    .map((key) => ({
      key,
      label: labelForField(key),
      before: current ? current[key] : null,
      after: changes[key],
    }))
    .filter((row) => formatRevisionValue(row.before) !== formatRevisionValue(row.after));
}

// Fila do admin. A RLS já limita: admin vê tudo, aluno vê só o que propôs.
export async function loadContestRevisions(supabase, { status = 'pendente', limit = 200 } = {}) {
  try {
    let query = supabase
      .from('contest_revisions')
      .select(
        'id, contest_template_id, source_identity, origem, status, changes, evidencia_url, evidencia_nota, created_at, reviewed_at, review_nota, contest_templates(id, nome, concurso, cargo, banca, area, vagas, salario, inscricao_valor, escolaridade, lotacao, etapas, etapas_tags, taf_itens, status_concurso, prova_data, edital_url, imagem_url, descricao, uf, scope, modality, institution_type, is_public)'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'todas') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    // Degrada igual ao resto do catálogo: sem a migration aplicada a tela mostra
    // o aviso, em vez de quebrar o admin inteiro.
    console.warn(
      '[contestRevisions] não foi possível carregar a fila:',
      error?.message || error?.code || 'sem detalhe'
    );
    throw error;
  }
}

export async function countPendingRevisions(supabase) {
  try {
    const { count, error } = await supabase
      .from('contest_revisions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendente');
    if (error) throw error;
    return count || 0;
  } catch {
    return 0;
  }
}

export async function approveContestRevision(supabase, revisionId, nota = null) {
  const { data, error } = await supabase.rpc('apply_contest_revision', {
    revision_id: revisionId,
    nota,
  });
  if (error) throw error;
  return data;
}

export async function rejectContestRevision(supabase, revisionId, nota = null) {
  const { data, error } = await supabase.rpc('reject_contest_revision', {
    revision_id: revisionId,
    nota,
  });
  if (error) throw error;
  return data;
}

// Proposta vinda do aluno. A RLS obriga created_by = auth.uid() e origem='aluno',
// então não dá para forjar proposta de robô pelo cliente.
export async function proposeContestRevision(supabase, { templateId, changes, evidenciaUrl, evidenciaNota }) {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) throw new Error('Faça login para sugerir uma correção.');
  if (!templateId) throw new Error('Proposta sem concurso de destino.');
  if (!changes || Object.keys(changes).length === 0) throw new Error('Nenhuma alteração proposta.');

  const { data, error } = await supabase
    .from('contest_revisions')
    .insert({
      contest_template_id: templateId,
      origem: 'aluno',
      status: 'pendente',
      changes,
      evidencia_url: evidenciaUrl || null,
      evidencia_nota: evidenciaNota || null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
