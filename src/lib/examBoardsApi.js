export function normalizeExamBoard(row, index = 0) {
  return {
    id: row.id || `exam-board-${index}`,
    nome: String(row.nome || '').trim(),
    ordem: typeof row.ordem === 'number' ? row.ordem : Number(row.ordem) || 0,
  };
}

/**
 * Bancas cadastradas na plataforma (tabela `exam_boards`).
 * Retorna array vazio se a tabela ainda não existir ou não houver linhas.
 */
export async function loadExamBoardsFromSupabase(supabase) {
  try {
    const { data, error } = await supabase
      .from('exam_boards')
      .select('id, nome, ordem')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (error) throw error;
    return (data || []).map((row, index) => normalizeExamBoard(row, index)).filter((row) => row.nome.length > 0);
  } catch (error) {
    console.warn(
      '[examBoards] catálogo indisponível ou vazio (tabela exam_boards):',
      error?.message || error?.code || 'sem detalhe'
    );
    return [];
  }
}
