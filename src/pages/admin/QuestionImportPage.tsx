import React, { useMemo, useState } from 'react';
import { AlertTriangle, Database, DownloadCloud, Loader2, Sparkles } from 'lucide-react';
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
    <div className="pl-paper-bg" style={{ padding: '28px 28px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--pl-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-accent)', flexShrink: 0 }}>
            <Database size={22} />
          </div>
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 4, color: 'var(--pl-accent)' }}>Admin · importação</p>
            <h1 className="pl-display" style={{ fontSize: 26, marginBottom: 4 }}>Importar questões por API<span style={{ color: 'var(--pl-accent)' }}>.</span></h1>
            <p style={{ fontSize: 13, color: 'var(--pl-ink-2)', fontWeight: 500 }}>
              ENEM API como fonte principal e OpenTrivia apenas para testes/gamificação.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={inspectApis}
          disabled={checking || loading}
          className="pl-btn pl-btn-ghost"
          style={{ opacity: checking || loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {checking ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          Verificar APIs
        </button>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(300px,0.55fr)', gap: 16 }}>
        {/* Import card */}
        <div className="pl-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>
              Ano do ENEM
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="pl-input"
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
              className="pl-btn pl-btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />}
              Importar questões
            </button>
          </div>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
            <p className="pl-eyebrow">Importação completa</p>
            <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.55, color: 'var(--pl-ink-2)' }}>
              Tenta todos os anos de 2009 até 2023, incluindo idiomas estrangeiros, e usa pausa entre chamadas para respeitar limite da API.
            </p>
            <button
              type="button"
              onClick={() => runImport('all')}
              disabled={loading}
              className="pl-btn pl-btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: loading ? 0.7 : 1, borderColor: 'var(--pl-accent)', color: 'var(--pl-accent)' }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />}
              Importar todos os anos ENEM
            </button>
          </div>

          {imported !== null ? (
            <div style={{ marginTop: 16, borderRadius: 12, border: '1px solid var(--pl-success)', background: 'var(--pl-success-soft)', padding: '10px 16px', fontSize: 13, fontWeight: 700, color: 'var(--pl-success)' }}>
              {imported} questões importadas/atualizadas.
            </div>
          ) : null}

          {totalErrors > 0 ? (
            <div style={{ marginTop: 16, borderRadius: 12, border: '1px solid var(--pl-danger)', background: 'var(--pl-danger-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-danger)' }}>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <AlertTriangle size={15} />
                {totalErrors} erro(s) encontrados
              </div>
              <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {errors.map((error, index) => (
                  <li key={`${error}-${index}`}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="pl-card" style={{ padding: 20 }}>
          <p className="pl-eyebrow" style={{ marginBottom: 12 }}>Fontes públicas</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, fontWeight: 600, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>
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
            <div style={{ marginTop: 16, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 12 }}>
              <p className="pl-eyebrow" style={{ marginBottom: 8 }}>OpenTrivia preview</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {triviaPreview.map((item) => (
                  <div key={item.external_id} style={{ borderRadius: 10, background: 'var(--pl-surface)', padding: '8px 12px', fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                    <span style={{ color: 'var(--pl-ink-3)' }}>{item.subject}</span>
                    <p style={{ marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.statement}</p>
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
