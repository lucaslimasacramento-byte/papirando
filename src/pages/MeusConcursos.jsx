import React from 'react';
import { ArrowRight, CalendarDays, Crown, Heart, Layers3, Target } from 'lucide-react';

export default function MeusConcursos({
  contests = [],
  targetContestId = '',
  onSetTargetContest,
  onOpenContest,
}) {
  const importedCount = contests.filter((item) => item.imported).length;
  const targetContest = contests.find((item) => item.id === targetContestId) || null;

  return (
    <div className="page-shell">
      <section className="page-head rounded-[26px] border border-slate-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-6 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div>
          <div className="brand-badge mb-3 inline-flex items-center gap-2">
            <Target size={12} />
            Meus concursos
          </div>
          <h1 className="page-title">Seus concursos ativos</h1>
          <p className="page-subtitle mt-2">
            {contests.length > 0 ? `${contests.length} concurso(s) na sua base` : 'Importe um concurso para começar'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-bold text-slate-500">
          <span className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            {importedCount} importado(s)
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            {contests.length - importedCount} no radar
          </span>
        </div>
      </section>

      {targetContest && (
        <section className="section-card soft-accent p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">Concurso alvo</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-slate-900">{targetContest.nome}</h3>
              <p className="mt-1 text-sm font-semibold text-gray-600">
                {targetContest.cargo || targetContest.concurso}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-blue-700">
                {targetContest.diasParaProva !== null
                  ? `Faltam ${targetContest.diasParaProva} dia(s)`
                  : 'Sem prova definida'}
              </span>
              <button
                type="button"
                onClick={() => onOpenContest?.(targetContest.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#185FA5] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0C447C]"
              >
                Abrir concurso
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="section-card p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Sua base</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Concursos acompanhados</h3>
          </div>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-500">
            {contests.length} concurso(s)
          </span>
        </div>

        {contests.length === 0 ? (
          <div className="rounded-[1.4rem] border border-dashed border-gray-200 bg-gray-50/70 px-5 py-8 text-sm font-semibold text-gray-500">
            Seus concursos vão aparecer aqui quando você importar, favoritar ou marcar interesse.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {contests.map((contest) => (
              <article key={contest.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex flex-wrap gap-2">
                  {contest.isTarget && <Tag tone="yellow">Alvo</Tag>}
                  {contest.imported && <Tag tone="blue">Importado</Tag>}
                  {contest.favorite && <Tag tone="rose">Favorito</Tag>}
                  {contest.interested && <Tag tone="amber">Interesse</Tag>}
                </div>

                <h4 className="mt-4 text-lg font-semibold text-slate-900">{contest.nome}</h4>
                <p className="mt-1 min-h-[40px] text-sm font-semibold text-gray-500">
                  {contest.cargo || contest.concurso}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniBox
                    icon={<CalendarDays size={14} className="text-blue-600" />}
                    label="Prova"
                    value={contest.prova_data ? String(contest.prova_data).split('-').reverse().join('/') : 'A definir'}
                  />
                  <MiniBox
                    icon={<Layers3 size={14} className="text-blue-600" />}
                    label="Checklist"
                    value={`${contest.checklistDoneCount} etapa(s)`}
                  />
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <MiniBox
                    icon={<Crown size={14} className="text-blue-600" />}
                    label="Disciplinas"
                    value={String(contest.disciplinas?.length || 0)}
                  />
                  <MiniBox
                    icon={<Heart size={14} className="text-blue-600" />}
                    label="Andamento"
                    value={`${contest.disciplinasIniciadas} iniciada(s)`}
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onSetTargetContest?.(contest.id)}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                      contest.isTarget
                        ? 'border border-yellow-200 bg-yellow-50 text-yellow-700'
                        : 'border border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {contest.isTarget ? 'Alvo atual' : 'Definir como alvo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenContest?.(contest.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#185FA5] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0C447C]"
                  >
                    Abrir
                    <ArrowRight size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Tag({ children, tone = 'blue' }) {
  const toneClasses = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    rose: 'border-rose-100 bg-rose-50 text-rose-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    yellow: 'border-yellow-100 bg-yellow-50 text-yellow-700',
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClasses[tone] || toneClasses.blue}`}
    >
      {children}
    </span>
  );
}

function MiniBox({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-blue-900">{value}</p>
    </div>
  );
}
