import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } },
}));

import { supabase } from './supabase';
import { enrollInCoursePackage, loadCoursePackageContent, loadCoursePackages, loadQuestionCounts } from './coursePackagesApi';

beforeEach(() => vi.clearAllMocks());

// Chain fluente que resolve com `result` ao ser aguardada.
function chain(result) {
  const c = {};
  for (const m of ['select', 'eq', 'in', 'order', 'limit']) c[m] = vi.fn(() => c);
  c.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return c;
}

describe('loadCoursePackages', () => {
  it('devolve [] quando a tabela ainda não existe (migração pendente)', async () => {
    supabase.from.mockReturnValue(chain({ data: null, error: { code: 'PGRST205', message: 'Could not find the table' } }));
    await expect(loadCoursePackages()).resolves.toEqual([]);
  });

  it('propaga outros erros', async () => {
    supabase.from.mockReturnValue(chain({ data: null, error: { code: '42501', message: 'permission denied' } }));
    await expect(loadCoursePackages()).rejects.toMatchObject({ code: '42501' });
  });
});

describe('loadCoursePackageContent', () => {
  it('agrupa matérias → temas → materiais na ordem 1..5', async () => {
    const tables = {
      course_package_subjects: { data: [{ materia: 'Atualidades', ordem: 1 }, { materia: 'Igualdade', ordem: 0 }], error: null },
      course_package_materials: {
        data: [
          { id: 'm2', topic_id: 't1', kind: 'mapa_mental', ordem: 2 },
          { id: 'm1', topic_id: 't1', kind: 'pdf_completo', ordem: 1 },
          { id: 'm3', topic_id: 't9', kind: 'resumo', ordem: 3 },
        ],
        error: null,
      },
      library_topics: {
        data: [
          { id: 't1', materia: 'Igualdade', tema: 'Bases Constitucionais', ordem: 1 },
          { id: 't9', materia: 'Atualidades', tema: 'Cultura e Sociedade da Bahia', uf: 'BA', ordem: 10 },
        ],
        error: null,
      },
    };
    supabase.from.mockImplementation((table) => chain(tables[table]));

    const { subjects } = await loadCoursePackageContent({ id: 'c1' });

    expect(subjects.map((s) => s.materia)).toEqual(['Atualidades', 'Igualdade']);
    const igualdade = subjects.find((s) => s.materia === 'Igualdade');
    expect(igualdade.topics[0].materials.map((m) => m.kind)).toEqual(['pdf_completo', 'mapa_mental']);
    expect(subjects[0].topics[0]).toMatchObject({ tema: 'Cultura e Sociedade da Bahia', uf: 'BA' });
  });

  it('curso sem matérias → vazio', async () => {
    supabase.from.mockImplementation(() => chain({ data: [], error: null }));
    await expect(loadCoursePackageContent({ id: 'c1' })).resolves.toEqual({ subjects: [] });
  });
});

describe('loadQuestionCounts', () => {
  it('conta por matéria|tema', async () => {
    supabase.from.mockReturnValue(chain({
      data: [
        { disciplina: 'Atualidades', topico: 'Brasil Contemporâneo' },
        { disciplina: 'Atualidades', topico: 'Brasil Contemporâneo' },
        { disciplina: 'Atualidades', topico: 'Oriente Médio e Terrorismo' },
      ],
      error: null,
    }));
    const counts = await loadQuestionCounts(['Atualidades']);
    expect(counts.get('Atualidades|Brasil Contemporâneo')).toBe(2);
    expect(counts.get('Atualidades|Oriente Médio e Terrorismo')).toBe(1);
  });
});

describe('enrollInCoursePackage', () => {
  it('chama a RPC com o slug do curso', async () => {
    supabase.rpc.mockResolvedValue({ data: { cards_added: 811 }, error: null });
    await expect(enrollInCoursePackage('pmba-soldado')).resolves.toEqual({ cards_added: 811 });
    expect(supabase.rpc).toHaveBeenCalledWith('enroll_in_course_package', { p_package_slug: 'pmba-soldado' });
  });
});
