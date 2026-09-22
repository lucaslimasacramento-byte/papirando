import { describe, it, expect, vi, beforeEach } from 'vitest';

const from = vi.fn();
vi.mock('./supabase', () => ({ supabase: { from: (...args) => from(...args) } }));

import { fetchCourses, upsertCourses, deleteCourses, diferencaDeCursos } from './coursesApi';

beforeEach(() => {
  from.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

function selectRetorna(resultado) {
  from.mockReturnValue({
    select: () => ({ eq: () => ({ order: async () => resultado }) }),
  });
}

describe('fetchCourses', () => {
  it('devolve o curso com o id da linha, ja migrado para objetivos', async () => {
    selectRetorna({ data: [{ id: 'curso-1', dados: { nome: 'PM/AL' }, created_at: 'x' }], error: null });
    const { ok, courses } = await fetchCourses('user-1');
    expect(ok).toBe(true);
    expect(courses[0]).toMatchObject({ nome: 'PM/AL', id: 'curso-1' });
    // Curso salvo antes de o curso passar a agrupar objetivos ganha um objetivo na leitura,
    // entao nao precisa de migracao de banco.
    expect(courses[0].objetivos).toHaveLength(1);
  });

  // Sem distinguir os dois casos, uma falha de rede na abertura viraria "o aluno nao tem
  // curso" — e a sincronizacao seguinte apagaria os cursos dele no banco.
  it('marca ok:false quando nao conseguiu ler', async () => {
    selectRetorna({ data: null, error: { message: 'network' } });
    const { ok, courses } = await fetchCourses('user-1');
    expect(ok).toBe(false);
    expect(courses).toEqual([]);
  });

  it('nao chama o banco sem usuario', async () => {
    const { ok } = await fetchCourses('');
    expect(ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });
});

describe('upsertCourses', () => {
  it('guarda o curso inteiro em dados', async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    from.mockReturnValue({ upsert });

    await upsertCourses('user-1', [{ id: 'curso-1', nome: 'PM/AL', prova: [] }]);

    expect(upsert).toHaveBeenCalledWith(
      [{ id: 'curso-1', user_id: 'user-1', dados: { id: 'curso-1', nome: 'PM/AL', prova: [] } }],
      { onConflict: 'user_id,id' }
    );
  });

  it('ignora curso sem id', async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    from.mockReturnValue({ upsert });
    const resultado = await upsertCourses('user-1', [{ nome: 'sem id' }]);
    expect(upsert).not.toHaveBeenCalled();
    expect(resultado.salvos).toBe(0);
  });

  // Enquanto o SQL nao rodar no projeto, o app tem que continuar de pe.
  it('nao quebra quando a tabela ainda nao existe', async () => {
    from.mockReturnValue({ upsert: async () => ({ error: { code: '42P01' } }) });
    const resultado = await upsertCourses('user-1', [{ id: 'curso-1' }]);
    expect(resultado.ok).toBe(false);
  });
});

describe('deleteCourses', () => {
  it('apaga so os ids do proprio aluno', async () => {
    const inMock = vi.fn(async () => ({ error: null }));
    const eq = vi.fn(() => ({ in: inMock }));
    from.mockReturnValue({ delete: () => ({ eq }) });

    await deleteCourses('user-1', ['curso-1', 'curso-2']);

    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(inMock).toHaveBeenCalledWith('id', ['curso-1', 'curso-2']);
  });

  it('nao chama o banco com lista vazia', async () => {
    const resultado = await deleteCourses('user-1', []);
    expect(from).not.toHaveBeenCalled();
    expect(resultado.apagados).toBe(0);
  });
});

// Cursos nascem em cinco lugares do App; comparar as listas pega todos, inclusive os que um
// ponto de edicao esqueceria de salvar.
describe('diferencaDeCursos', () => {
  it('salva o que e novo', () => {
    const { paraSalvar, paraApagar } = diferencaDeCursos([], [{ id: 'a' }]);
    expect(paraSalvar).toEqual([{ id: 'a' }]);
    expect(paraApagar).toEqual([]);
  });

  it('salva o que mudou', () => {
    const { paraSalvar } = diferencaDeCursos([{ id: 'a', nome: 'x' }], [{ id: 'a', nome: 'y' }]);
    expect(paraSalvar).toEqual([{ id: 'a', nome: 'y' }]);
  });

  it('nao salva o que esta igual', () => {
    const { paraSalvar, paraApagar } = diferencaDeCursos([{ id: 'a', nome: 'x' }], [{ id: 'a', nome: 'x' }]);
    expect(paraSalvar).toEqual([]);
    expect(paraApagar).toEqual([]);
  });

  it('apaga o que sumiu da lista', () => {
    const { paraApagar } = diferencaDeCursos([{ id: 'a' }, { id: 'b' }], [{ id: 'a' }]);
    expect(paraApagar).toEqual(['b']);
  });
});
