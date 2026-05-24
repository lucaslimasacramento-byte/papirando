import React, { useMemo, useState } from 'react';
import { AlertTriangle, Database, DownloadCloud, Loader2, Sparkles } from 'lucide-react';
import PageHeadPremium, { PageHeadPremiumBadge } from '../../components/PageHeadPremium';
import { getEnemExams, getOpenTriviaQuestions, normalizeOpenTriviaQuestion } from '../../services/questionsApi';
import { importAllEnemYears, importEnemYear } from '../../services/importQuestions';

const YEARS = Array.from({ length: 2023 - 2009 + 1 }, (_, index) => 2023 - index);

export default function QuestionImportPage() {
  const [year, setYear] = useState(2023);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [apiInfo, setApiInfo] = useState<any[]>([]);
  const [triviaPreview, setTriviaPreview] = useState<any[]>([]);

  const totalErrors = errors.length;
  const apiSummary = useMemo(() => {
    if (!apiInfo.length) return 'ENEM API: anos 2009-2023, disciplinas macro e idiomas quando houver.';
    const first = apiInfo[0];
    const disciplines = Array.isArray(first?.disciplines) ? first.disciplines.map((item: any) => item.label).join(', ') : '';
    return `${apiInfo.length} provas encontradas. Separação por disciplina macro: ${disciplines || 'não informado'}.`;
  }, [apiInfo]);

  async function runImport(mode: 'year' | 'all') {
    setLoading(true);
    setImported(null);
    setErrors([]);
    try {
      const result = mode === 'year' ? await importEnemYear(year) : await importAllEnemYears();
      setImported(result.imported);
      setErrors(result.errors);
    } catch (error: any) {
      setErrors([error?.message || 'Não foi possível importar as questões.']);
    } finally {
      setLoading(false);
    }
  }

  async function inspectApis() {
    setChecking(true);
    setErrors([]);
    try {
      const [exams, trivia] = await Promise.all([
        getEnemExams(),
        getOpenTriviaQuestions(3),
      ]);
      setApiInfo(exams);
      setTriviaPreview(trivia.map(normalizeOpenTriviaQuestion));
    } catch (error: any) {
      setErrors([error?.message || 'Não foi possível consultar as APIs públicas.']);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="pl-page">
      <PageHeadPremium
        icon={Database}
        badge={<PageHeadPremiumBadge icon={Sparkles}>Admin · importação</PageHeadPremiumBadge>}
        title="Importar questões por API"
        subtitle="ENEM API como fonte principal e OpenTrivia apenas para testes/gamificação."
        trailing={(
          <button
            type="button"
            onClick={inspectApis}
            disabled={checking || loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-60"
          >
            {checking ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Verificar APIs
          </button>
        )}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-2 text-sm font-bold text-slate-700">
              Ano do ENEM
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                {YEARS.map((item) => (
                  <option key={item} value={item}>ENEM {item}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => runImport('year')}
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-700 disabled:opacity-70"
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : <DownloadCloud size={17} />}
              Importar questões
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Importação completa</p>
            <p className="text-sm font-semibold leading-relaxed text-slate-600">
              Tenta todos os anos de 2009 até 2023, incluindo idiomas estrangeiros, e usa pausa entre chamadas para respeitar limite da API.
            </p>
            <button
              type="button"
              onClick={() => runImport('all')}
              disabled={loading}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-70 sm:w-fit"
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : <DownloadCloud size={17} />}
              Importar todos os anos ENEM
            </button>
          </div>

          {imported !== null ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
              {imported} questões importadas/atualizadas.
            </div>
          ) : null}

          {totalErrors > 0 ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <AlertTriangle size={16} />
                {totalErrors} erro(s) encontrados
              </div>
              <ul className="space-y-1">
                {errors.map((error, index) => (
                  <li key={`${error}-${index}`}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Fontes públicas</p>
          <div className="mt-3 space-y-3 text-sm font-semibold leading-relaxed text-slate-600">
            <p>{apiSummary}</p>
            <p>
              A ENEM API separa por área/disciplina macro e idioma. Espanhol/Inglês entram com o idioma no campo de assunto.
              Ela não entrega tópico fino por assunto, então esse campo fica vazio até uma classificação manual ou IA futura.
            </p>
            <p>
              OpenTrivia retorna categoria e dificuldade; use apenas como teste/fallback, não como banco principal de concurso.
            </p>
            <p>
              BrasilAPI fica documentada como fonte auxiliar futura para dados brasileiros, sem importação de questões.
            </p>
          </div>

          {triviaPreview.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">OpenTrivia preview</p>
              <div className="mt-2 space-y-2">
                {triviaPreview.map((item) => (
                  <div key={item.external_id} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                    <span className="text-slate-400">{item.subject}</span>
                    <p className="mt-1 line-clamp-2">{item.statement}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
