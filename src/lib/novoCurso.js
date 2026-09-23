// Monta o objeto do curso do aluno a partir do que a tela mandou.
//
// Isto era um literal dentro de `createCourse`, no App.jsx, listando campo por campo. Quem
// acrescentava um campo novo no fluxo de importação (os objetivos do edital, o mapa
// disciplina→objetivo, a personalização) não tinha como saber que precisava vir aqui
// também: o campo simplesmente sumia, sem erro nenhum, e o aluno que marcou dois cargos via
// um objetivo só. Com a montagem aqui, o teste cobre o que precisa sobreviver.

import { normalizeContestStatus } from './contestGrouping';

export function montarCurso(courseData = {}, { id } = {}) {
  const intent =
    courseData.intent ||
    courseData.tipo ||
    (courseData.origem === 'catalogo' || courseData.origem === 'ia' ? 'concurso' : 'livre');
  const ehConcurso = intent === 'concurso';

  return {
    id: id || `curso-${Date.now()}`,
    nome: courseData.nome,
    plano: courseData.plano || courseData.nome,
    concurso: courseData.concurso || courseData.nome,
    intent,
    tipo: intent,
    area: courseData.area || 'Geral',
    instituicao: courseData.instituicao || '',
    periodo: courseData.periodo || '',
    curso_superior: courseData.curso_superior || '',
    cargo: courseData.cargo || '',
    banca: courseData.banca || 'A definir',
    salario: courseData.salario || '',
    inscricao_valor: courseData.inscricao_valor || '',
    escolaridade: courseData.escolaridade || '',
    vagas: courseData.vagas || '',
    lotacao: courseData.lotacao || '',
    etapas: courseData.etapas || '',
    etapas_tags: courseData.etapas_tags || [],
    taf_itens: courseData.taf_itens || [],
    carga_horaria: courseData.carga_horaria || '',

    // O que o curso persegue. Um curso agrupa objetivos — dois cargos do mesmo edital, ou um
    // concurso e a faculdade. Sem este campo, a leitura deriva um objetivo só do campo
    // `cargo` e o segundo cargo escolhido desaparece. Ver src/lib/objetivos.js.
    objetivos: Array.isArray(courseData.objetivos) ? courseData.objetivos : [],
    // Qual disciplina serve a quais objetivos. Sem ele, o progresso de um objetivo conta
    // matéria que não cai na prova dele.
    disciplinasPorObjetivo: courseData.disciplinasPorObjetivo || {},

    // Quadro de provas do cargo: [{disciplina, questoes, peso}]. É o que permite a
    // plataforma dizer onde estão os pontos, em vez de tratar toda disciplina como igual.
    prova: Array.isArray(courseData.prova) ? courseData.prova : [],
    // Qual versão do edital gerou este curso. A plataforma inteira fica pendurada num PDF, e
    // retificação posterior não chega a quem já montou — sem isto não há nem como avisar.
    edital_arquivo: courseData.edital_arquivo || '',
    edital_lido_em: courseData.edital_lido_em || '',
    edital_impressao: courseData.edital_impressao || '',
    status_concurso: ehConcurso ? normalizeContestStatus(courseData.status_concurso || 'edital_publicado') : '',
    prova_data: courseData.prova_data || '',

    // Personalização do aluno. Ver src/lib/personalizacaoCurso.js.
    apelido: courseData.apelido || '',
    descricao: courseData.descricao || '',
    capa_url: courseData.capa_url || '',
    cor: courseData.cor || 'azul',

    imagem_url: courseData.imagem_url || '',
    edital_url: courseData.edital_url || '',
    status: courseData.status || 'ativo',
    origem: courseData.origem || 'manual',
    // Instituições-alvo (só ENEM): até 3 marcadores escolhidos pelo aluno.
    instituicoes_alvo: Array.isArray(courseData.instituicoes_alvo) ? courseData.instituicoes_alvo : [],
  };
}
