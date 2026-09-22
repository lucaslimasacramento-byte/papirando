// Leitura e gravação dos cursos do aluno no Supabase.
//
// O curso é o objeto raiz do produto — a plataforma inteira se monta a partir dele — e até
// aqui vivia só no localStorage do navegador. Ver supabase/courses.sql.
//
// Nada aqui pode derrubar a tela: enquanto a tabela não existir no projeto (42P01), o app
// continua funcionando com o que está no navegador. É por isso que as funções devolvem
// resultado em vez de lançar.

import { supabase } from './supabase';
import { migrarCurso } from './objetivos';

const TABELA_AUSENTE = '42P01';

function ehTabelaAusente(error) {
  return error?.code === TABELA_AUSENTE || /relation .*courses.* does not exist/i.test(error?.message || '');
}

function avisar(acao, error) {
  if (ehTabelaAusente(error)) {
    console.warn('[courses] tabela ainda nao criada no Supabase. Rode supabase/courses.sql.');
    return;
  }
  console.warn(`[courses] falha ao ${acao}:`, error?.message || error);
}

// Uma linha por curso: id do app + o curso inteiro em `dados`.
function paraLinha(userId, curso) {
  return { id: String(curso.id), user_id: userId, dados: curso };
}

export async function fetchCourses(userId) {
  if (!userId) return { ok: false, courses: [] };

  const { data, error } = await supabase
    .from('courses')
    .select('id, dados, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    avisar('carregar', error);
    // ok:false distingue "o aluno nao tem curso" de "nao consegui ler". Sem isso, uma falha
    // de rede na abertura apagaria os cursos do aluno na sincronizacao seguinte.
    return { ok: false, courses: [] };
  }

  return {
    ok: true,
    // Migra na leitura: curso salvo antes de o curso passar a agrupar objetivos continua
    // funcionando sem migracao de banco — o formato novo e derivado do que existe.
    courses: (data || []).map((linha) => migrarCurso({ ...(linha.dados || {}), id: linha.id })),
  };
}

export async function upsertCourses(userId, cursos) {
  const linhas = (cursos || []).filter((curso) => curso?.id).map((curso) => paraLinha(userId, curso));
  if (!userId || !linhas.length) return { ok: true, salvos: 0 };

  const { error } = await supabase.from('courses').upsert(linhas, { onConflict: 'user_id,id' });
  if (error) {
    avisar('salvar', error);
    return { ok: false, salvos: 0 };
  }
  return { ok: true, salvos: linhas.length };
}

export async function deleteCourses(userId, ids) {
  const alvos = (ids || []).map((id) => String(id || '')).filter(Boolean);
  if (!userId || !alvos.length) return { ok: true, apagados: 0 };

  const { error } = await supabase.from('courses').delete().eq('user_id', userId).in('id', alvos);
  if (error) {
    avisar('apagar', error);
    return { ok: false, apagados: 0 };
  }
  return { ok: true, apagados: alvos.length };
}

// O que mudou entre duas listas de cursos.
//
// A sincronização é feita sobre a lista inteira, e não curso a curso nos pontos de edição:
// cursos nascem em cinco lugares diferentes do App (criar, catálogo, edital, inferência,
// deduplicação) e um deles esqueceria de salvar. Comparar as listas pega todos.
export function diferencaDeCursos(anterior, atual) {
  const antes = new Map((anterior || []).filter((c) => c?.id).map((c) => [String(c.id), c]));
  const agora = (atual || []).filter((c) => c?.id);

  const paraSalvar = agora.filter((curso) => {
    const antigo = antes.get(String(curso.id));
    // JSON.stringify basta: são objetos planos vindos do mesmo lugar, sempre na mesma ordem
    // de chaves, e o custo de um falso "mudou" é um upsert a mais.
    return !antigo || JSON.stringify(antigo) !== JSON.stringify(curso);
  });

  const idsAgora = new Set(agora.map((curso) => String(curso.id)));
  const paraApagar = [...antes.keys()].filter((id) => !idsAgora.has(id));

  return { paraSalvar, paraApagar };
}

export async function sincronizarCursos(userId, anterior, atual) {
  const { paraSalvar, paraApagar } = diferencaDeCursos(anterior, atual);
  if (!paraSalvar.length && !paraApagar.length) return { ok: true, salvos: 0, apagados: 0 };

  const salvos = await upsertCourses(userId, paraSalvar);
  const apagados = await deleteCourses(userId, paraApagar);

  return { ok: salvos.ok && apagados.ok, salvos: salvos.salvos, apagados: apagados.apagados };
}
